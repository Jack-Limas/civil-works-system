/**
 * Demo data for ObraIQ (COP, municipalities of Nariño).
 *
 *   npm run seed:demo         -> removes previous demo rows and creates them again
 *   npm run seed:demo:clean   -> removes only the demo rows
 *
 * Safety rules:
 * - Every demo row has a deterministic id (UUID v5-style hash of a demo key),
 *   so the script is idempotent and cleanup deletes ONLY those ids.
 * - Real data is never updated or deleted. The script counts real rows
 *   (everything that is not a demo id) before and after and aborts if they differ.
 * - The real admin is only referenced (as creator/registrant), never modified.
 * - Predictions use the rule-based strategy only (no Gemini calls) and the
 *   alert engine runs only on demo projects.
 */
import { createHash } from "crypto";
import bcrypt from "bcrypt";
import {
  ExpenseCategory,
  IncidentType,
  PaymentMethod,
  Prisma,
  Priority,
  ProjectStatus,
  ProjectType,
} from "@prisma/client";
import { prisma } from "../src/config/prisma";
import { alertService } from "../src/services/alert.service";
import { riskContextService } from "../src/services/risk-context.service";
import { RuleBasedRiskStrategy } from "../src/strategies/risk/rule-based-risk.strategy";

const DEMO_PASSWORD = "Demo1234!";
const ADMIN_EMAIL = "admin@civilworks.com";
const DAY = 86_400_000;

// ---------- deterministic helpers ----------

/** RFC 4122 v5-shaped UUID derived from a key: same key -> same id on every run. */
function demoId(key: string): string {
  const h = createHash("sha1").update(`obraiq-demo:${key}`).digest();
  h[6] = (h[6] & 0x0f) | 0x50; // version 5
  h[8] = (h[8] & 0x3f) | 0x80; // RFC variant
  const hex = h.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/** Small seeded PRNG (mulberry32) so amounts and dates are reproducible. */
function prng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = prng(20261007);
const between = (min: number, max: number) => min + rand() * (max - min);
const pick = <T>(items: readonly T[]) => items[Math.floor(rand() * items.length)];
/** COP amounts rounded to thousands, like real invoices. */
const cop = (n: number) => Math.round(n / 1000) * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);

// ---------- demo definitions ----------

const RESIDENTS = [
  { key: "resident-1", name: "Ing. Camila Rosero Benavides", email: "camila.rosero@demo.obraiq.co" },
  { key: "resident-2", name: "Ing. Andrés Ortiz Guerrero", email: "andres.ortiz@demo.obraiq.co" },
  { key: "resident-3", name: "Ing. Daniela Burbano Pantoja", email: "daniela.burbano@demo.obraiq.co" },
];

interface DemoProject {
  key: string;
  name: string;
  type: ProjectType;
  municipality: string;
  address: string;
  status: ProjectStatus;
  budget: number;
  progress: number;
  startDaysAgo: number;
  durationDays: number;
  resident: number;
  /** approved spend ≈ budget x progress x factor; > 1.3 creates a cost-overrun risk */
  spendFactor: number;
}

const PROJECTS: DemoProject[] = [
  { key: "p-edificio", name: "Edificio Mirador de Aranda", type: "RESIDENTIAL_BUILDING", municipality: "Pasto", address: "Cra. 22 #18-40, barrio Aranda", status: "IN_PROGRESS", budget: 2_850_000_000, progress: 46, startDaysAgo: 210, durationDays: 480, resident: 0, spendFactor: 1.02 },
  { key: "p-via", name: "Pavimentación vía Ipiales – Las Lajas (tramo 2)", type: "ROAD", municipality: "Ipiales", address: "Vía al Santuario de Las Lajas, km 3", status: "IN_PROGRESS", budget: 1_640_000_000, progress: 38, startDaysAgo: 175, durationDays: 360, resident: 1, spendFactor: 1.9 },
  { key: "p-puente", name: "Puente peatonal río Mira", type: "BRIDGE", municipality: "Tumaco", address: "Barrio Nuevo Milenio, margen del río Mira", status: "IN_PROGRESS", budget: 920_000_000, progress: 61, startDaysAgo: 190, durationDays: 300, resident: 2, spendFactor: 0.94 },
  { key: "p-colegio", name: "Ampliación I.E. Simón Bolívar", type: "SCHOOL", municipality: "Sandoná", address: "Calle 6 #5-21", status: "IN_PROGRESS", budget: 1_180_000_000, progress: 29, startDaysAgo: 120, durationDays: 330, resident: 0, spendFactor: 1.55 },
  { key: "p-bodega", name: "Bodega de acopio agrícola Túquerres", type: "WAREHOUSE", municipality: "Túquerres", address: "Vía Túquerres – Sapuyes, km 1", status: "FINISHED", budget: 640_000_000, progress: 100, startDaysAgo: 330, durationDays: 240, resident: 1, spendFactor: 0.97 },
  { key: "p-remodelacion", name: "Remodelación centro de salud Samaniego", type: "REMODELING", municipality: "Samaniego", address: "Cra. 4 #3-15, centro", status: "PLANNED", budget: 450_000_000, progress: 0, startDaysAgo: -20, durationDays: 210, resident: 2, spendFactor: 0 },
  { key: "p-coliseo", name: "Cubierta coliseo municipal La Unión", type: "STADIUM", municipality: "La Unión", address: "Unidad deportiva, calle 9", status: "SUSPENDED", budget: 780_000_000, progress: 22, startDaysAgo: 160, durationDays: 270, resident: 1, spendFactor: 1.08 },
];

const SUPPLIERS: Array<{ key: string; name: string; nit: string; category: ExpenseCategory; phone: string }> = [
  { key: "s-1", name: "Ferretería El Constructor Pasto", nit: "900481223-1", category: "MATERIALS", phone: "602 7231144" },
  { key: "s-2", name: "Cementos y Agregados del Sur", nit: "901122334-5", category: "MATERIALS", phone: "602 7365520" },
  { key: "s-3", name: "Aceros Nariño S.A.S.", nit: "900765432-8", category: "MATERIALS", phone: "602 7298811" },
  { key: "s-4", name: "Maquinaria Pesada Galeras", nit: "901334455-2", category: "EQUIPMENT", phone: "315 4467781" },
  { key: "s-5", name: "Transportes Volcán Azufral", nit: "900223344-6", category: "TRANSPORT", phone: "317 2209934" },
  { key: "s-6", name: "Estación de Servicio La Panamericana", nit: "800556677-3", category: "FUEL", phone: "602 7734410" },
  { key: "s-7", name: "Cooperativa de Mano de Obra Obrando", nit: "901998877-0", category: "LABOR", phone: "318 5512003" },
  { key: "s-8", name: "Eléctricos y Redes del Pacífico", nit: "901445566-9", category: "MATERIALS", phone: "602 7271560" },
  { key: "s-9", name: "Alquiler de Equipos Andino", nit: "900887766-4", category: "EQUIPMENT", phone: "312 8873345" },
  { key: "s-10", name: "Maderas y Formaletas Ipiales", nit: "901667788-1", category: "MATERIALS", phone: "602 7732290" },
];

const MATERIALS: Array<{ key: string; name: string; unit: string; available: number; minimum: number }> = [
  { key: "m-1", name: "Cemento gris 50 kg", unit: "bultos", available: 340, minimum: 150 },
  { key: "m-2", name: "Varilla corrugada 1/2\"", unit: "unidades", available: 85, minimum: 120 },
  { key: "m-3", name: "Arena de río", unit: "m³", available: 42, minimum: 20 },
  { key: "m-4", name: "Grava triturada 3/4\"", unit: "m³", available: 12, minimum: 25 },
  { key: "m-5", name: "Ladrillo tolete", unit: "unidades", available: 6800, minimum: 3000 },
  { key: "m-6", name: "Malla electrosoldada", unit: "láminas", available: 18, minimum: 30 },
  { key: "m-7", name: "Tubería PVC sanitaria 4\"", unit: "tubos", available: 64, minimum: 40 },
  { key: "m-8", name: "Cable THHN #12", unit: "rollos", available: 9, minimum: 15 },
  { key: "m-9", name: "Teja termoacústica", unit: "unidades", available: 110, minimum: 60 },
  { key: "m-10", name: "Pintura tipo 1 blanca", unit: "galones", available: 75, minimum: 30 },
  { key: "m-11", name: "Asfalto MDC-19", unit: "toneladas", available: 26, minimum: 40 },
  { key: "m-12", name: "Formaleta metálica", unit: "unidades", available: 140, minimum: 80 },
];

const EXPENSE_TEXT: Record<ExpenseCategory, string[]> = {
  MATERIALS: ["Compra de cemento gris", "Varilla corrugada y alambre", "Arena y grava para concreto", "Ladrillo y mortero", "Tubería y accesorios PVC", "Material eléctrico"],
  LABOR: ["Pago cuadrilla de mampostería", "Jornales de oficiales y ayudantes", "Pago contratista de acabados", "Mano de obra de armado de acero"],
  EQUIPMENT: ["Alquiler de retroexcavadora", "Alquiler de mezcladora y vibrador", "Alquiler de andamios", "Alquiler de vibrocompactador"],
  TRANSPORT: ["Flete de materiales desde Pasto", "Transporte de volquetas", "Acarreo de escombros"],
  FUEL: ["Combustible para maquinaria", "ACPM volquetas"],
  OTHER: ["Elementos de seguridad industrial", "Papelería y planos", "Pruebas de laboratorio de concreto"],
};

const CATEGORY_WEIGHTS: Array<[ExpenseCategory, number]> = [
  ["MATERIALS", 0.42],
  ["LABOR", 0.28],
  ["EQUIPMENT", 0.12],
  ["TRANSPORT", 0.08],
  ["FUEL", 0.05],
  ["OTHER", 0.05],
];

function weightedCategory(): ExpenseCategory {
  let r = rand();
  for (const [category, weight] of CATEGORY_WEIGHTS) {
    if ((r -= weight) <= 0) return category;
  }
  return "OTHER";
}

const SUPPLIERS_BY_CATEGORY = new Map<ExpenseCategory, string[]>();
for (const s of SUPPLIERS) {
  const list = SUPPLIERS_BY_CATEGORY.get(s.category) ?? [];
  list.push(demoId(s.key));
  SUPPLIERS_BY_CATEGORY.set(s.category, list);
}

// ---------- id registry (everything cleanup may touch) ----------

const ids = {
  users: RESIDENTS.map((r) => demoId(r.key)),
  projects: PROJECTS.map((p) => demoId(p.key)),
  suppliers: SUPPLIERS.map((s) => demoId(s.key)),
  materials: MATERIALS.map((m) => demoId(m.key)),
};

// ---------- real-data guard ----------

async function countRealRows() {
  const notIn = (list: string[]) => ({ notIn: list });
  const demoProject = { projectId: { in: ids.projects } };
  return {
    users: await prisma.user.count({ where: { id: notIn(ids.users) } }),
    projects: await prisma.project.count({ where: { id: notIn(ids.projects) } }),
    activities: await prisma.activity.count({ where: { NOT: demoProject } }),
    workers: await prisma.worker.count({ where: { documentId: { not: { startsWith: "DEMO-" } } } }),
    materials: await prisma.material.count({ where: { id: notIn(ids.materials) } }),
    inventoryMovements: await prisma.inventoryMovement.count({ where: { materialId: notIn(ids.materials) } }),
    expenses: await prisma.expense.count({ where: { NOT: demoProject } }),
    incidents: await prisma.incident.count({ where: { NOT: demoProject } }),
    evidence: await prisma.evidence.count({ where: { NOT: demoProject } }),
    alerts: await prisma.alert.count({ where: { NOT: demoProject } }),
    predictions: await prisma.prediction.count({ where: { NOT: demoProject } }),
    refreshTokens: await prisma.refreshToken.count({ where: { userId: notIn(ids.users) } }),
    suppliers: await prisma.supplier.count({ where: { id: notIn(ids.suppliers) } }),
    fundTransfers: await prisma.fundTransfer.count({ where: { residentId: notIn(ids.users) } }),
  };
}

function assertSame(before: Record<string, number>, after: Record<string, number>, stage: string) {
  const diffs = Object.keys(before).filter((k) => before[k] !== after[k]);
  if (diffs.length > 0) {
    throw new Error(`Real data changed during ${stage}: ${diffs.map((k) => `${k} ${before[k]} -> ${after[k]}`).join(", ")}`);
  }
}

// ---------- cleanup (demo ids only) ----------

async function clean() {
  const demoProject = { projectId: { in: ids.projects } };
  await prisma.$transaction([
    prisma.fundTransfer.deleteMany({ where: { residentId: { in: ids.users } } }),
    prisma.inventoryMovement.deleteMany({ where: { materialId: { in: ids.materials } } }),
    prisma.expense.deleteMany({ where: demoProject }),
    prisma.worker.deleteMany({ where: { documentId: { startsWith: "DEMO-" } } }),
    // activities, incidents, alerts and predictions cascade with their project
    prisma.project.deleteMany({ where: { id: { in: ids.projects } } }),
    prisma.supplier.deleteMany({ where: { id: { in: ids.suppliers } } }),
    prisma.material.deleteMany({ where: { id: { in: ids.materials } } }),
    prisma.refreshToken.deleteMany({ where: { userId: { in: ids.users } } }),
    prisma.user.deleteMany({ where: { id: { in: ids.users } } }),
  ]);
}

// ---------- seed ----------

async function seed(adminId: string) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  await prisma.user.createMany({
    data: RESIDENTS.map((r) => ({ id: demoId(r.key), name: r.name, email: r.email, passwordHash, role: "RESIDENT_ENGINEER" as const })),
  });

  await prisma.supplier.createMany({
    data: SUPPLIERS.map((s) => ({ id: demoId(s.key), name: s.name, nit: s.nit, category: s.category, phone: s.phone })),
  });

  await prisma.material.createMany({
    data: MATERIALS.map((m) => ({ id: demoId(m.key), name: m.name, unit: m.unit, stockAvailable: m.available, stockMinimum: m.minimum })),
  });

  await prisma.project.createMany({
    data: PROJECTS.map((p) => ({
      id: demoId(p.key),
      name: p.name,
      type: p.type,
      municipality: p.municipality,
      address: p.address,
      status: p.status,
      budget: p.budget,
      progressPercentage: p.progress,
      startDate: daysAgo(p.startDaysAgo),
      estimatedEndDate: daysAgo(p.startDaysAgo - p.durationDays),
      responsibleId: ids.users[p.resident],
    })),
  });

  const activities: Prisma.ActivityCreateManyInput[] = [];
  const incidents: Prisma.IncidentCreateManyInput[] = [];
  const expenses: Prisma.ExpenseCreateManyInput[] = [];
  const transfers: Prisma.FundTransferCreateManyInput[] = [];
  const movements: Prisma.InventoryMovementCreateManyInput[] = [];
  const workers: Prisma.WorkerCreateManyInput[] = [];

  const ACTIVITY_NAMES = ["Replanteo y localización", "Excavación y cimentación", "Fundición de columnas", "Mampostería", "Instalaciones hidrosanitarias", "Instalaciones eléctricas", "Pañetes y acabados", "Pavimentación de calzada", "Montaje de estructura metálica"];
  const INCIDENTS: Array<{ type: IncidentType; description: string; priority: Priority }> = [
    { type: "WEATHER", description: "Lluvias intensas obligaron a suspender la fundición durante dos días.", priority: "MEDIUM" },
    { type: "MATERIAL_SHORTAGE", description: "El proveedor no entregó la varilla a tiempo; se reprogramó el armado.", priority: "HIGH" },
    { type: "ACTIVITY_DELAY", description: "Retraso en la excavación por presencia de roca no prevista en estudios.", priority: "HIGH" },
    { type: "EQUIPMENT_DAMAGE", description: "Falla hidráulica en la retroexcavadora alquilada.", priority: "MEDIUM" },
    { type: "STAFF_ISSUE", description: "Ausencia de dos oficiales por incapacidad médica.", priority: "LOW" },
  ];

  let expenseIndex = 0;
  let transferIndex = 0;

  for (const [pi, p] of PROJECTS.entries()) {
    const projectId = demoId(p.key);
    const residentId = ids.users[p.resident];
    const activeDays = Math.max(0, Math.min(p.startDaysAgo, 180));

    // Activities tracing progress up to the current value
    const steps = p.progress === 0 ? 0 : Math.max(2, Math.round(p.progress / 15));
    for (let s = 1; s <= steps; s++) {
      activities.push({
        id: demoId(`${p.key}-activity-${s}`),
        projectId,
        date: daysAgo(Math.round(activeDays * (1 - s / (steps + 0.5)))),
        name: ACTIVITY_NAMES[(pi + s) % ACTIVITY_NAMES.length],
        progressPercentage: Math.round(((p.progress * s) / steps) * 10) / 10,
        responsibleId: residentId,
        observations: s === steps ? "Avance verificado en visita de obra." : null,
      });
    }

    // Incidents (open delay incidents feed the ACTIVITY alert rule)
    if (p.status === "IN_PROGRESS" || p.status === "SUSPENDED") {
      const count = pi % 2 === 0 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const inc = INCIDENTS[(pi + i) % INCIDENTS.length];
        incidents.push({
          id: demoId(`${p.key}-incident-${i}`),
          projectId,
          date: daysAgo(Math.round(between(5, Math.max(10, activeDays)))),
          ...inc,
          status: i === 0 ? "OPEN" : "RESOLVED",
        });
      }
    }

    // Approved spend ≈ budget x progress x factor, split into expenses over the active window
    const targetApproved = (p.budget * p.progress * p.spendFactor) / 100;
    const expenseCount = p.progress === 0 ? 0 : Math.max(8, Math.min(14, Math.round(p.progress / 4)));
    // Small field purchases paid from the resident's petty cash, on top of the big company payments
    const fieldPurchases = p.status === "PLANNED" ? 0 : 2;
    const weights = Array.from({ length: expenseCount }, () => between(0.4, 1.6));
    const weightSum = weights.reduce((a, b) => a + b, 0);

    for (let e = 0; e < expenseCount; e++) {
      const category = weightedCategory();
      const supplierList = SUPPLIERS_BY_CATEGORY.get(category);
      // Residents register small field purchases from their petty cash; big ones are company payments
      const amount = cop((targetApproved * weights[e]) / weightSum);
      const byResident = amount <= 4_500_000 || ((category === "FUEL" || category === "TRANSPORT") && amount <= 7_000_000);
      expenses.push({
        id: demoId(`${p.key}-expense-${e}`),
        projectId,
        category,
        amount,
        date: daysAgo(Math.round(between(3, Math.max(8, activeDays - 2)))),
        description: pick(EXPENSE_TEXT[category]),
        supplierId: supplierList && rand() < 0.9 ? pick(supplierList) : null,
        paymentMethod: byResident ? pick<PaymentMethod>(["CASH", "TRANSFER", "CARD"]) : pick<PaymentMethod>(["TRANSFER", "CHECK"]),
        invoiceNumber: rand() < 0.8 ? `FE-${10000 + expenseIndex * 37}` : null,
        registeredById: byResident ? residentId : adminId,
        status: "APPROVED",
        reviewedById: adminId,
        reviewedAt: daysAgo(Math.round(between(1, 3))),
      });
      expenseIndex++;
    }

    for (let f = 0; f < fieldPurchases; f++) {
      const category = pick<ExpenseCategory>(["MATERIALS", "TRANSPORT", "FUEL", "OTHER"]);
      expenses.push({
        id: demoId(`${p.key}-field-${f}`),
        projectId,
        category,
        amount: cop(between(450_000, 3_800_000)),
        date: daysAgo(Math.round(between(4, Math.max(10, Math.min(170, activeDays))))),
        description: pick(EXPENSE_TEXT[category]),
        supplierId: SUPPLIERS_BY_CATEGORY.has(category) ? pick(SUPPLIERS_BY_CATEGORY.get(category)!) : null,
        paymentMethod: "CASH",
        invoiceNumber: `RC-${1000 + expenseIndex}`,
        registeredById: residentId,
        status: "APPROVED",
        reviewedById: adminId,
        reviewedAt: daysAgo(2),
      });
      expenseIndex++;
    }

    // Pending field purchases awaiting approval (do not count as executed)
    if (p.status === "IN_PROGRESS") {
      const pendingCount = pi % 3 === 0 ? 2 : 1;
      for (let k = 0; k < pendingCount; k++) {
        const category = pick<ExpenseCategory>(["MATERIALS", "TRANSPORT", "FUEL", "OTHER"]);
        expenses.push({
          id: demoId(`${p.key}-pending-${k}`),
          projectId,
          category,
          amount: cop(between(350_000, 4_800_000)),
          date: daysAgo(Math.round(between(0, 6))),
          description: pick(EXPENSE_TEXT[category]),
          supplierId: SUPPLIERS_BY_CATEGORY.has(category) ? pick(SUPPLIERS_BY_CATEGORY.get(category)!) : null,
          paymentMethod: "CASH",
          invoiceNumber: `RC-${2000 + expenseIndex}`,
          registeredById: residentId,
          status: "PENDING",
        });
        expenseIndex++;
      }
    }

    // Petty-cash transfers to the project's resident
    if (p.progress > 0) {
      // Daniela (resident 3) spent more than she received: a "to reimburse" example
      const transferCount = p.resident === 2 ? 1 : p.status === "FINISHED" ? 2 : 2 + ((pi + 1) % 2);
      for (let k = 0; k < transferCount; k++) {
        transfers.push({
          id: demoId(`${p.key}-transfer-${k}`),
          residentId,
          projectId,
          amount: cop(between(2_500_000, 7_500_000)),
          date: daysAgo(Math.round(between(5, Math.max(10, Math.min(175, activeDays))))),
          method: "TRANSFER",
          notes: k === 0 ? "Fondo de caja menor para compras en obra" : "Reposición de caja menor",
          createdById: adminId,
        });
        transferIndex++;
      }
    }

    // A few workers per active project
    if (p.status !== "PLANNED") {
      for (let w = 0; w < 2; w++) {
        workers.push({
          name: pick(["Luis Alberto Muñoz", "Jhon Fredy Erazo", "Carlos Andrés Bastidas", "Wilson Chamorro", "Edison Yandún", "María Fernanda Cuaical"]) + ` ${w + 1}`,
          documentId: `DEMO-${pi}${w}${1000 + pi * 10 + w}`,
          position: w === 0 ? "Maestro de obra" : "Oficial de construcción",
          projectId,
          status: p.status === "FINISHED" ? "INACTIVE" : "ACTIVE",
        });
      }
    }
  }

  // Two rejected expenses (do not count anywhere and do not reduce balances)
  for (const [k, p] of [PROJECTS[0], PROJECTS[2]].entries()) {
    expenses.push({
      id: demoId(`${p.key}-rejected-${k}`),
      projectId: demoId(p.key),
      category: "OTHER",
      amount: cop(between(800_000, 2_500_000)),
      date: daysAgo(Math.round(between(8, 25))),
      description: k === 0 ? "Almuerzos del personal (no autorizado)" : "Factura sin NIT del proveedor",
      paymentMethod: "CASH",
      registeredById: ids.users[p.resident],
      status: "REJECTED",
      reviewedById: adminId,
      reviewedAt: daysAgo(4),
      rejectionReason: k === 0 ? "Gasto no autorizado por la política de caja menor." : "La factura no cumple requisitos: falta el NIT del proveedor.",
    });
  }

  // Inventory movements for demo materials
  for (const [mi, m] of MATERIALS.entries()) {
    movements.push({
      id: demoId(`${m.key}-in`),
      materialId: demoId(m.key),
      type: "IN",
      quantity: Math.round(m.available * 1.6),
      date: daysAgo(60 + mi),
      notes: "Compra inicial de inventario",
    });
    movements.push({
      id: demoId(`${m.key}-out`),
      materialId: demoId(m.key),
      projectId: ids.projects[mi % 5],
      type: "OUT",
      quantity: Math.round(m.available * 0.6),
      date: daysAgo(20 + mi),
      notes: "Despacho a obra",
    });
  }

  await prisma.activity.createMany({ data: activities });
  await prisma.incident.createMany({ data: incidents });
  await prisma.expense.createMany({ data: expenses });
  await prisma.fundTransfer.createMany({ data: transfers });
  await prisma.inventoryMovement.createMany({ data: movements });
  await prisma.worker.createMany({ data: workers });

  // Rule-based predictions (no Gemini) and real alerts, demo projects only
  const strategy = new RuleBasedRiskStrategy();
  for (const p of PROJECTS) {
    const projectId = demoId(p.key);
    const assessment = await strategy.analyze(await riskContextService.build(projectId));
    await prisma.prediction.createMany({
      data: [
        { projectId, type: "DELAY_RISK", resultJson: { ...assessment.delayRisk, source: assessment.source }, confidence: assessment.confidence },
        { projectId, type: "COST_OVERRUN_RISK", resultJson: { ...assessment.costOverrunRisk, source: assessment.source }, confidence: assessment.confidence },
      ],
    });
    if (p.status === "PLANNED" || p.status === "IN_PROGRESS") await alertService.generateForProject(projectId);
  }

  return {
    projects: PROJECTS.length,
    expenses: expenses.length,
    pending: expenses.filter((e) => e.status === "PENDING").length,
    rejected: expenses.filter((e) => e.status === "REJECTED").length,
    transfers: transferIndex,
    activities: activities.length,
    incidents: incidents.length,
    materials: MATERIALS.length,
    suppliers: SUPPLIERS.length,
  };
}

async function main() {
  const cleanOnly = process.argv.includes("--clean");

  const admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!admin) throw new Error(`Admin ${ADMIN_EMAIL} not found: run the base seed first.`);

  const before = await countRealRows();
  console.log("Real rows before:", before);

  await clean();
  assertSame(before, await countRealRows(), "cleanup");

  if (cleanOnly) {
    console.log("Demo data removed. Real data unchanged.");
    return;
  }

  const created = await seed(admin.id);
  assertSame(before, await countRealRows(), "seeding");
  console.log("Demo data created:", created);
  console.log("Real rows after (unchanged):", await countRealRows());
  console.log(`\nDemo residents (password: ${DEMO_PASSWORD}):`);
  for (const r of RESIDENTS) console.log(`  - ${r.name} <${r.email}>`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
