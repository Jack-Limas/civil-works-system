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
  MaterialCategory,
  PaymentMethod,
  Prisma,
  Priority,
  ProjectStatus,
  ProjectType,
  Weather,
} from "@prisma/client";
import { prisma } from "../src/config/prisma";
import { alertService } from "../src/services/alert.service";
import { riskContextService } from "../src/services/risk-context.service";
import { RuleBasedRiskStrategy } from "../src/strategies/risk/rule-based-risk.strategy";
import { businessDateKey, dateKeyToDbDate } from "../src/utils/business-time";

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

/**
 * Extra demo accounts for the users module: a second admin (so the "last
 * admin" safeguard can be tried), a deactivated resident and one who must
 * change a temporary password (its password is the demo one).
 */
const EXTRA_USERS: Array<{ key: string; name: string; email: string; role: "ADMIN" | "RESIDENT_ENGINEER"; phone?: string; isActive?: boolean; mustChangePassword?: boolean }> = [
  { key: "admin-2", name: "Arq. Lucía Delgado Erazo", email: "lucia.delgado@demo.obraiq.co", role: "ADMIN", phone: "315 600 4421" },
  { key: "resident-4", name: "Ing. Paola Insuasti Rosero", email: "paola.insuasti@demo.obraiq.co", role: "RESIDENT_ENGINEER", phone: "317 330 2184", isActive: false },
  { key: "resident-5", name: "Ing. Mateo Cabrera López", email: "mateo.cabrera@demo.obraiq.co", role: "RESIDENT_ENGINEER", mustChangePassword: true },
];
const ALL_DEMO_USERS = [...RESIDENTS, ...EXTRA_USERS];

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

/**
 * Inventory demo. `final` is today's stock and `daily` the average consumption
 * of the last 30 days, chosen so the rule engine shows every status:
 * OUT (grava, cable), CRITICAL (varilla, malla, asfalto), WARNING (arena, PVC, pintura), OK (rest).
 * `projects` are the demo projects that consume it.
 */
const MATERIALS: Array<{
  key: string;
  name: string;
  unit: string;
  category: MaterialCategory;
  unitCost: number;
  minimum: number;
  final: number;
  daily: number;
  decimals: boolean;
  projects: string[];
}> = [
  { key: "m-1", name: "Cemento gris 50 kg", unit: "bultos", category: "CEMENT_CONCRETE", unitCost: 32_500, minimum: 150, final: 340, daily: 12, decimals: false, projects: ["p-edificio", "p-colegio", "p-puente"] },
  { key: "m-2", name: "Varilla corrugada 1/2\"", unit: "unidades", category: "STEEL", unitCost: 28_900, minimum: 120, final: 85, daily: 6, decimals: false, projects: ["p-edificio", "p-puente"] },
  { key: "m-3", name: "Arena de río", unit: "m³", category: "AGGREGATES", unitCost: 95_000, minimum: 20, final: 42, daily: 3.5, decimals: true, projects: ["p-edificio", "p-colegio", "p-via"] },
  { key: "m-4", name: "Grava triturada 3/4\"", unit: "m³", category: "AGGREGATES", unitCost: 110_000, minimum: 25, final: 0, daily: 2.5, decimals: true, projects: ["p-via", "p-puente"] },
  { key: "m-5", name: "Ladrillo tolete", unit: "unidades", category: "MASONRY", unitCost: 850, minimum: 3000, final: 6800, daily: 260, decimals: false, projects: ["p-edificio", "p-colegio"] },
  { key: "m-6", name: "Malla electrosoldada", unit: "láminas", category: "STEEL", unitCost: 215_000, minimum: 30, final: 18, daily: 1.2, decimals: false, projects: ["p-edificio", "p-colegio"] },
  { key: "m-7", name: "Tubería PVC sanitaria 4\"", unit: "tubos", category: "PLUMBING", unitCost: 62_000, minimum: 40, final: 64, daily: 5, decimals: false, projects: ["p-edificio", "p-colegio"] },
  { key: "m-8", name: "Cable THHN #12", unit: "rollos", category: "ELECTRICAL", unitCost: 245_000, minimum: 15, final: 0, daily: 0.6, decimals: false, projects: ["p-edificio", "p-colegio"] },
  { key: "m-9", name: "Teja termoacústica", unit: "unidades", category: "FINISHES", unitCost: 89_000, minimum: 60, final: 110, daily: 2, decimals: false, projects: ["p-colegio"] },
  { key: "m-10", name: "Pintura tipo 1 blanca", unit: "galones", category: "FINISHES", unitCost: 68_000, minimum: 30, final: 75, daily: 6, decimals: false, projects: ["p-edificio", "p-colegio", "p-puente"] },
  { key: "m-11", name: "Asfalto MDC-19", unit: "toneladas", category: "OTHER", unitCost: 420_000, minimum: 40, final: 26, daily: 4, decimals: true, projects: ["p-via"] },
  // Reusable formwork: no consumption, so coverage is "—" and status OK
  { key: "m-12", name: "Formaleta metálica", unit: "unidades", category: "TOOLS_EQUIPMENT", unitCost: 145_000, minimum: 80, final: 140, daily: 0, decimals: false, projects: [] },
];

/** Which demo supplier sells each material category (inventory entries). */
const SUPPLIER_BY_MATERIAL: Record<MaterialCategory, string> = {
  CEMENT_CONCRETE: "s-2",
  AGGREGATES: "s-2",
  STEEL: "s-3",
  MASONRY: "s-1",
  WOOD: "s-10",
  ELECTRICAL: "s-8",
  PLUMBING: "s-1",
  FINISHES: "s-1",
  TOOLS_EQUIPMENT: "s-10",
  OTHER: "s-2",
};

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
  // RESIDENTS first: projects reference residents by index (0..2)
  users: ALL_DEMO_USERS.map((u) => demoId(u.key)),
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
    fieldReports: await prisma.fieldReport.count({ where: { NOT: demoProject } }),
    auditLogs: await prisma.auditLog.count({ where: { id: notIn(DEMO_AUDIT_IDS) } }),
    incidentStatusChanges: await prisma.incidentStatusChange.count({ where: { incident: { NOT: demoProject } } }),
    systemSettings: await prisma.systemSetting.count(),
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
    // Demo history rows only (fixed ids); real history is never touched
    prisma.auditLog.deleteMany({ where: { id: { in: DEMO_AUDIT_IDS } } }),
    // Field reports reference projects and users with RESTRICT: remove them first
    prisma.fieldReport.deleteMany({ where: { OR: [demoProject, { authorId: { in: ids.users } }] } }),
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

// ---------- inventory ledger ----------

const HISTORY_DAYS = 60;
/** Separate PRNG streams keep the older demo data identical between versions of this script. */
const invRand = prng(20261008);
const invBetween = (min: number, max: number) => min + invRand() * (max - min);
const projectByKey = new Map(PROJECTS.map((p) => [p.key, p]));

/** `n` days ago at a working hour in Bogotá (07:00–16:59 = 12:00–21:59 UTC). */
function workTime(n: number, hour?: number): Date {
  const d = daysAgo(n);
  d.setUTCHours(hour ?? 12 + Math.floor(invRand() * 10), Math.floor(invRand() * 60), 0, 0);
  return d;
}

const OUT_NOTES = ["Despacho a obra", "Consumo en frente de trabajo", "Entrega a cuadrilla", "Salida para fundición"];

interface LinkedEntry {
  /** which entry (0 = initial purchase) is paid by the linked expense */
  restock: number;
  projectKey: string;
  byResident: boolean;
  rejected?: { reason: string };
}

/** Some entries come from material expenses: the expense says how the stock was paid. */
const LINKED: Record<string, LinkedEntry> = {
  "m-1": { restock: 2, projectKey: "p-edificio", byResident: false },
  "m-5": { restock: 1, projectKey: "p-colegio", byResident: false },
  "m-7": { restock: 2, projectKey: "p-edificio", byResident: true },
  // Rejected invoice whose material did reach the warehouse: shows the ledger warning
  "m-3": { restock: 1, projectKey: "p-via", byResident: true, rejected: { reason: "Factura duplicada: el proveedor ya la había cobrado en una compra anterior." } },
};

function buildInventory(adminId: string) {
  const movements: Prisma.InventoryMovementCreateManyInput[] = [];
  const expenses: Prisma.ExpenseCreateManyInput[] = [];

  for (const m of MATERIALS) {
    const materialId = demoId(m.key);
    const round = (q: number) => (m.decimals ? Math.round(q * 10) / 10 : Math.round(q));

    // Consumption: an OUT every 1–3 days (every 3–5 for slow movers) until 2 days ago
    const outs: Array<{ day: number; qty: number; projectKey: string }> = [];
    if (m.daily > 0) {
      let day = HISTORY_DAYS - 3;
      while (day >= 2) {
        const gap = m.daily < 1 ? 3 + Math.floor(invRand() * 3) : 1 + Math.floor(invRand() * 3);
        const qty = Math.max(m.decimals ? 0.5 : 1, round(m.daily * gap * invBetween(0.75, 1.25)));
        outs.push({ day, qty, projectKey: m.projects[Math.floor(invRand() * m.projects.length)] });
        day -= gap;
      }
    }
    const totalOut = outs.reduce((sum, o) => sum + o.qty, 0);

    // Entries: initial purchase + restocks; the last one closes the books exactly at today's stock
    const inDays = m.daily > 0 ? [HISTORY_DAYS, 38, 16] : [HISTORY_DAYS];
    const totalIn = m.final + totalOut;
    const amounts = inDays.length === 1 ? [totalIn] : [round(totalIn * 0.45), round(totalIn * 0.3)];
    if (inDays.length > 1) amounts.push(round(totalIn - amounts[0] - amounts[1]));

    // Never let the running stock go negative: move the shortfall to the earlier entry
    for (let k = 0; k < inDays.length - 1; k++) {
      let running =
        amounts.slice(0, k + 1).reduce((a, b) => a + b, 0) - outs.filter((o) => o.day > inDays[k]).reduce((a, o) => a + o.qty, 0);
      let lowest = running;
      for (const o of outs.filter((x) => x.day <= inDays[k] && x.day > inDays[k + 1])) {
        running -= o.qty;
        lowest = Math.min(lowest, running);
      }
      if (lowest < 0) {
        const deficit = round(-lowest + m.daily * 2);
        amounts[k] = round(amounts[k] + deficit);
        amounts[inDays.length - 1] = round(amounts[inDays.length - 1] - deficit);
      }
    }
    if (amounts.some((a) => a <= 0)) throw new Error(`Demo inventory for ${m.name} could not be balanced`);

    const linked = LINKED[m.key];
    inDays.forEach((day, k) => {
      const quantity = amounts[k];
      const date = workTime(day, 13);
      // Prices drift a little over time; the latest entry sets the "last known cost"
      const listCost = Math.round(m.unitCost * (k === inDays.length - 1 ? 1 : 0.96));
      let expenseId: string | null = null;
      let registeredById = adminId;
      let projectId: string | null = null;
      let unitCost = listCost;

      if (linked && linked.restock === k) {
        const project = projectByKey.get(linked.projectKey)!;
        const amount = cop(quantity * listCost);
        expenseId = demoId(`${m.key}-inventory-expense-${k}`);
        projectId = demoId(project.key);
        registeredById = linked.byResident ? ids.users[project.resident] : adminId;
        // Same rule as the API: the unit cost of a linked entry comes from the expense
        unitCost = Math.round(amount / quantity);
        expenses.push({
          id: expenseId,
          projectId,
          category: "MATERIALS",
          amount,
          date,
          description: `Compra de ${m.name.toLowerCase()} (${quantity} ${m.unit})`,
          supplierId: demoId(SUPPLIER_BY_MATERIAL[m.category]),
          paymentMethod: linked.byResident ? "CASH" : "TRANSFER",
          invoiceNumber: `FE-${20000 + day * 7 + k}`,
          registeredById,
          status: linked.rejected ? "REJECTED" : "APPROVED",
          reviewedById: adminId,
          reviewedAt: workTime(Math.max(1, day - 1), 15),
          rejectionReason: linked.rejected?.reason ?? null,
        });
      }

      movements.push({
        id: demoId(`${m.key}-in-${k}`),
        materialId,
        projectId,
        type: "IN",
        quantity,
        date,
        createdAt: date,
        notes: k === 0 ? "Compra inicial de inventario" : "Reposición de inventario",
        registeredById,
        expenseId,
        supplierId: demoId(SUPPLIER_BY_MATERIAL[m.category]),
        unitCost: new Prisma.Decimal(unitCost),
      });
    });

    outs.forEach((o, i) => {
      const project = projectByKey.get(o.projectKey)!;
      const date = workTime(o.day);
      movements.push({
        id: demoId(`${m.key}-out-${i}`),
        materialId,
        projectId: demoId(project.key),
        type: "OUT",
        quantity: o.qty,
        date,
        createdAt: date,
        notes: OUT_NOTES[i % OUT_NOTES.length],
        registeredById: ids.users[project.resident],
      });
    });
  }

  return { movements, expenses };
}

// ---------- daily site logs ----------

const logRand = prng(20261009);
const logPick = <T>(items: readonly T[]) => items[Math.floor(logRand() * items.length)];

const LOG_WORK: Record<string, string[]> = {
  "p-edificio": [
    "Fundición de placa del piso 5, sector norte.",
    "Mampostería en ejes B y C del piso 4.",
    "Armado de acero de columnas del piso 6.",
    "Instalación de tubería sanitaria en baños del piso 3.",
    "Pañetes interiores en apartamentos 301 a 304.",
  ],
  "p-via": [
    "Extendido y compactación de base granular entre K3+200 y K3+350.",
    "Imprimación y riego de liga en el carril derecho.",
    "Colocación de mezcla asfáltica MDC-19 en 120 m de calzada.",
    "Construcción de cunetas en concreto, margen izquierda.",
    "Señalización provisional y manejo de tráfico en el tramo.",
  ],
  "p-puente": [
    "Fundición del estribo occidental.",
    "Montaje de vigas metálicas del tramo central.",
    "Armado de acero del tablero.",
    "Pintura anticorrosiva de barandas.",
    "Relleno y compactación de accesos.",
  ],
  "p-colegio": [
    "Mampostería de aulas del segundo piso.",
    "Instalación de cubierta termoacústica en el bloque B.",
    "Fundición de vigas de amarre.",
    "Cableado eléctrico de aulas 201 a 204.",
    "Enchape de baterías sanitarias.",
  ],
};
const LOG_WORKERS: Record<string, number> = { "p-edificio": 18, "p-via": 22, "p-puente": 12, "p-colegio": 14 };
const WEATHER_ISSUES: Partial<Record<Weather, string[]>> = {
  RAINY: ["Lluvia en la tarde detuvo la fundición durante dos horas.", "Lluvia intermitente; se cubrió el concreto fresco con plástico."],
  STORMY: ["Tormenta eléctrica: se suspendieron los trabajos en altura por seguridad."],
};
const OTHER_ISSUES = [
  "Retraso de tres horas en la entrega de concreto premezclado.",
  "Faltaron dos ayudantes por incapacidad médica.",
  "Se requiere reposición de varilla para la próxima semana.",
];
const REVIEW_NOTES = [
  "Bien documentado.",
  "Adjuntar fotos de la fundición en el próximo reporte.",
  "Revisar el consumo de cemento frente a lo programado.",
  "Coordinar con interventoría la visita del viernes.",
];

function pickWeather(): Weather {
  const r = logRand();
  return r < 0.3 ? "SUNNY" : r < 0.65 ? "CLOUDY" : r < 0.92 ? "RAINY" : "STORMY";
}

/**
 * 15–20 logs per active demo project over the last weeks (no Sundays and no
 * "today", so a resident can try the "today's report" flow). Recent ones wait
 * for review; older ones are mostly reviewed.
 */
function buildFieldReports(adminId: string): Prisma.FieldReportCreateManyInput[] {
  const reports: Prisma.FieldReportCreateManyInput[] = [];
  for (const p of PROJECTS.filter((x) => x.status === "IN_PROGRESS")) {
    const target = 15 + Math.floor(logRand() * 6);
    let created = 0;
    for (let n = 1; n <= 40 && created < target; n++) {
      const key = businessDateKey(daysAgo(n));
      if (new Date(`${key}T12:00:00Z`).getUTCDay() === 0 || logRand() < 0.1) continue;
      const weather = pickWeather();
      const work = LOG_WORK[p.key];
      const first = logPick(work);
      const second = logPick(work.filter((w) => w !== first));
      const weatherIssue = WEATHER_ISSUES[weather];
      const issues = weatherIssue ? logPick(weatherIssue) : logRand() < 0.25 ? logPick(OTHER_ISSUES) : null;
      const reviewed = n > 3 && logRand() > 0.12;
      // Sent at 17:30 Bogotá time of that day
      const createdAt = new Date(`${key}T22:30:00Z`);
      reports.push({
        id: demoId(`${p.key}-log-${key}`),
        projectId: demoId(p.key),
        authorId: ids.users[p.resident],
        date: dateKeyToDbDate(key),
        weather,
        workersOnSite: Math.max(3, LOG_WORKERS[p.key] + Math.round((logRand() - 0.5) * 8) - (weather === "STORMY" ? 6 : 0)),
        summary: `${first} ${second}`,
        issues,
        status: reviewed ? "REVIEWED" : "SUBMITTED",
        reviewedById: reviewed ? adminId : null,
        reviewedAt: reviewed ? new Date(createdAt.getTime() + 16 * 3_600_000) : null,
        reviewNote: reviewed && logRand() < 0.4 ? logPick(REVIEW_NOTES) : null,
        createdAt,
      });
      created++;
    }
  }
  return reports;
}

// ---------- users, incidents, workers and history (users & settings module) ----------

const peopleRand = prng(20261010);
const pPick = <T>(items: readonly T[]) => items[Math.floor(peopleRand() * items.length)];
const pBetween = (min: number, max: number) => min + peopleRand() * (max - min);
const HOUR = 3_600_000;
/** Never in the future (history entries are clamped to "an hour ago"). */
const notFuture = (d: Date) => new Date(Math.min(d.getTime(), Date.now() - HOUR));

/** Phones for demo residents (index-aligned with RESIDENTS) and the extra demo accounts. */
const RESIDENT_PHONES = ["316 482 1190", "312 774 5032", "318 209 6614"];

/**
 * Example incident photos: construction sites in Colombia from Wikimedia Commons
 * (free licences, served with CORS so they load under COEP like Cloudinary images).
 */
const INCIDENT_PHOTOS = [
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/58/Edificio_en_construcci%C3%B3n_2014-09-20_%283%29.jpg/960px-Edificio_en_construcci%C3%B3n_2014-09-20_%283%29.jpg",
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/79/Edificios_en_obra_negra_en_el_norte_de_Bucaramanga.jpeg/960px-Edificios_en_obra_negra_en_el_norte_de_Bucaramanga.jpeg",
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a4/Trabajos_mejoramiento_y_ampliaci%C3%B3n_V%C3%ADa_Cu%C3%ADtiva_a_Tota_-_Boyac%C3%A1_-_panoramio.jpg/960px-Trabajos_mejoramiento_y_ampliaci%C3%B3n_V%C3%ADa_Cu%C3%ADtiva_a_Tota_-_Boyac%C3%A1_-_panoramio.jpg",
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f0/Construcci%C3%B3n_en_la_Alpujarra%2C_Medell%C3%ADn.jpg/960px-Construcci%C3%B3n_en_la_Alpujarra%2C_Medell%C3%ADn.jpg",
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f7/Edificio_en_construcci%C3%B3n_2014-09-20_%282%29.jpg/960px-Edificio_en_construcci%C3%B3n_2014-09-20_%282%29.jpg",
];
const PHOTO_CREDIT = "Foto de ejemplo (Wikimedia Commons)";

const PROGRESS_NOTES = [
  "Se notificó al proveedor y se reprogramó la actividad.",
  "Se asignó una cuadrilla adicional para recuperar el tiempo.",
  "Se solicitó cotización de reemplazo.",
  "Interventoría informada; se espera visita técnica.",
];
const RESOLUTION_NOTES = [
  "Llegó el material y se retomó la actividad.",
  "Se reparó el equipo y volvió a operar.",
  "Se ajustó el cronograma con la interventoría.",
  "El personal se reincorporó y se completó la cuadrilla.",
];

const EXTRA_INCIDENTS: Array<{ projectKey: string; type: IncidentType; priority: Priority; description: string; daysAgo: number; status: "OPEN" | "IN_REVIEW" | "RESOLVED"; photos: number }> = [
  { projectKey: "p-edificio", type: "MATERIAL_SHORTAGE", priority: "HIGH", description: "Faltan 40 bultos de cemento para la fundición de la placa del piso 5.", daysAgo: 2, status: "IN_REVIEW", photos: 2 },
  { projectKey: "p-via", type: "WEATHER", priority: "MEDIUM", description: "Lluvia continua impidió la colocación de mezcla asfáltica en la tarde.", daysAgo: 4, status: "OPEN", photos: 1 },
  { projectKey: "p-puente", type: "EQUIPMENT_DAMAGE", priority: "HIGH", description: "La grúa telescópica presenta fuga hidráulica; se detuvo el montaje de vigas.", daysAgo: 6, status: "RESOLVED", photos: 1 },
  { projectKey: "p-colegio", type: "STAFF_ISSUE", priority: "LOW", description: "Dos ayudantes no se presentaron por calamidad familiar.", daysAgo: 1, status: "OPEN", photos: 0 },
  { projectKey: "p-colegio", type: "ACTIVITY_CHANGE", priority: "MEDIUM", description: "Rector solicitó trasladar la batería sanitaria al costado norte.", daysAgo: 9, status: "RESOLVED", photos: 1 },
];
/** Status pattern for the original demo incidents (index-aligned, deterministic). */
const STATUS_PATTERN = ["IN_REVIEW", "RESOLVED", "OPEN", "RESOLVED", "IN_REVIEW", "OPEN", "RESOLVED", "OPEN"] as const;

const residentIdByProject = new Map(PROJECTS.map((p) => [demoId(p.key), ids.users[p.resident]]));

/**
 * Gives every demo incident a reporter, a lifecycle with its history (who, when,
 * note) and resolution data, adds a few recent ones and example photos.
 */
function buildIncidentLifecycle(incidents: Prisma.IncidentCreateManyInput[], adminId: string) {
  const changes: Prisma.IncidentStatusChangeCreateManyInput[] = [];
  const evidence: Prisma.EvidenceCreateManyInput[] = [];
  const extra: Prisma.IncidentCreateManyInput[] = EXTRA_INCIDENTS.map((e, i) => ({
    id: demoId(`${e.projectKey}-incident-extra-${i}`),
    projectId: demoId(e.projectKey),
    date: daysAgo(e.daysAgo),
    type: e.type,
    description: e.description,
    priority: e.priority,
    status: e.status,
  }));

  [...incidents, ...extra].forEach((incident, index) => {
    const isExtra = index >= incidents.length;
    const status = isExtra ? incident.status! : STATUS_PATTERN[index % STATUS_PATTERN.length];
    const resident = residentIdByProject.get(incident.projectId)!;
    const reporter = index % 4 === 3 ? adminId : resident;
    const reportedAt = new Date(incident.date as Date);
    incident.status = status;
    incident.reportedById = reporter;
    incident.createdAt = reportedAt;

    changes.push({ id: demoId(`${incident.id}-history-0`), incidentId: incident.id!, fromStatus: null, toStatus: "OPEN", changedById: reporter, createdAt: reportedAt });
    if (status !== "OPEN") {
      const startedAt = notFuture(new Date(reportedAt.getTime() + pBetween(4, 30) * HOUR));
      changes.push({
        id: demoId(`${incident.id}-history-1`),
        incidentId: incident.id!,
        fromStatus: "OPEN",
        toStatus: "IN_REVIEW",
        changedById: resident,
        note: pPick(PROGRESS_NOTES),
        createdAt: startedAt,
      });
      if (status === "RESOLVED") {
        const resolvedAt = notFuture(new Date(startedAt.getTime() + pBetween(20, 70) * HOUR));
        const resolver = index % 3 === 0 ? adminId : resident;
        const note = pPick(RESOLUTION_NOTES);
        changes.push({ id: demoId(`${incident.id}-history-2`), incidentId: incident.id!, fromStatus: "IN_REVIEW", toStatus: "RESOLVED", changedById: resolver, note, createdAt: resolvedAt });
        incident.resolvedAt = resolvedAt;
        incident.resolvedById = resolver;
        incident.resolutionNote = note;
      }
    }

    const photos = isExtra ? EXTRA_INCIDENTS[index - incidents.length].photos : index % 3 === 0 ? 1 : 0;
    for (let k = 0; k < photos; k++) {
      evidence.push({
        id: demoId(`${incident.id}-photo-${k}`),
        projectId: incident.projectId,
        incidentId: incident.id!,
        imageUrl: INCIDENT_PHOTOS[(index + k) % INCIDENT_PHOTOS.length],
        description: PHOTO_CREDIT,
        uploadedById: reporter,
        date: new Date(reportedAt.getTime() + (k + 1) * 600_000),
      });
    }
  });

  return { extra, changes, evidence };
}

const EXTRA_TRADES = ["Ayudante de obra", "Electricista", "Operador de maquinaria", "Topógrafo", "Plomero", "Soldador"];
const EXTRA_NAMES = [
  "Yeison Andrés Pantoja",
  "Diana Marcela Getial",
  "Héctor Fabio Rosero",
  "Óscar Iván Chalapud",
  "Ana Lucía Bolaños",
  "Freddy Alexander Imbachí",
  "Javier Ernesto Tulcán",
  "Sandra Milena Quenguán",
  "Germán Darío Cuaspud",
  "Luz Dary Narváez",
];

/** Phones for every demo worker plus more trades, two unassigned and a couple inactive. */
function buildWorkerExtras(workers: Prisma.WorkerCreateManyInput[]) {
  for (const w of workers) w.phone = `3${Math.floor(pBetween(10, 22))} ${Math.floor(pBetween(100, 999))} ${Math.floor(pBetween(1000, 9999))}`;
  const active = PROJECTS.filter((p) => p.status === "IN_PROGRESS");
  const extra: Prisma.WorkerCreateManyInput[] = EXTRA_NAMES.map((name, i) => {
    const project = i < 8 ? active[i % active.length] : null;
    return {
      name,
      documentId: `DEMO-X${1100 + i}`,
      position: EXTRA_TRADES[i % EXTRA_TRADES.length],
      projectId: project ? demoId(project.key) : null,
      status: i === 5 ? "INACTIVE" : "ACTIVE",
      phone: `3${Math.floor(pBetween(10, 22))} ${Math.floor(pBetween(100, 999))} ${Math.floor(pBetween(1000, 9999))}`,
    };
  });
  return extra;
}

/** Up to this many demo audit rows; their ids are fixed so cleanup never needs to read them. */
const DEMO_AUDIT_MAX = 300;
const DEMO_AUDIT_IDS = Array.from({ length: DEMO_AUDIT_MAX }, (_, i) => demoId(`audit-${i}`));
const IPS = ["190.248.12.44", "181.53.98.120", "186.84.21.7", "191.95.140.18", "200.21.33.97"];
const AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/129.0 Safari/537.36",
  "Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 Chrome/129.0 Mobile Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 Version/17.6 Mobile/15E148 Safari/604.1",
];

interface AuditSources {
  adminId: string;
  adminEmail: string;
  expenses: Prisma.ExpenseCreateManyInput[];
  transfers: Prisma.FundTransferCreateManyInput[];
  incidents: Prisma.IncidentCreateManyInput[];
  changes: Prisma.IncidentStatusChangeCreateManyInput[];
  workers: Prisma.WorkerCreateManyInput[];
  fieldReports: Prisma.FieldReportCreateManyInput[];
  movements: Prisma.InventoryMovementCreateManyInput[];
}

/**
 * A believable last-30-days history: sign-ins (and a few failed ones), user
 * management, a settings change and its revert, approvals, transfers, incident
 * transitions, worker changes, reviews and stock movements. Same action codes
 * and metadata shape the API writes, never any secret.
 */
function buildAuditEvents(src: AuditSources): Prisma.AuditLogCreateManyInput[] {
  const events: Array<Omit<Prisma.AuditLogCreateManyInput, "id">> = [];
  const since = Date.now() - 30 * 86_400_000;
  const within = (d: Date | string | undefined) => !!d && new Date(d).getTime() >= since;
  const emailOf = new Map<string, string>([[src.adminId, src.adminEmail], ...ALL_DEMO_USERS.map((u) => [demoId(u.key), u.email] as [string, string])]);
  const push = (actorId: string | null, at: Date, action: string, entityType: string | null, entityId: string | null, metadata: Record<string, unknown> | null) =>
    events.push({
      actorId,
      actorEmail: (actorId && emailOf.get(actorId)) || "desconocido@correo.co",
      action,
      entityType,
      entityId,
      metadata: metadata ? (metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      ip: pPick(IPS),
      userAgent: pPick(AGENTS),
      createdAt: notFuture(at),
    });

  // Accounts
  EXTRA_USERS.forEach((u, i) =>
    push(src.adminId, daysAgo(28 - i), "user.created", "user", demoId(u.key), { name: u.name, email: u.email, role: u.role, phone: u.phone ?? null })
  );
  push(src.adminId, daysAgo(12), "user.deactivated", "user", demoId("resident-4"), { name: "Ing. Paola Insuasti Rosero", email: "paola.insuasti@demo.obraiq.co", revokedSessions: 2 });
  push(src.adminId, daysAgo(2), "user.password_reset", "user", demoId("resident-5"), { name: "Ing. Mateo Cabrera López", email: "mateo.cabrera@demo.obraiq.co", revokedSessions: 1 });
  push(src.adminId, daysAgo(20), "user.updated", "user", demoId("resident-2"), { before: { phone: null }, after: { phone: RESIDENT_PHONES[1] } });

  // Sign-ins: residents most working days, the admin daily, a few failures
  for (let d = 29; d >= 1; d--) {
    const day = daysAgo(d);
    if (day.getUTCDay() === 0) continue;
    push(src.adminId, new Date(day.setUTCHours(12, Math.floor(pBetween(0, 59)))), "auth.login", "user", src.adminId, null);
    for (const r of RESIDENTS) {
      if (peopleRand() < 0.55) push(demoId(r.key), new Date(daysAgo(d).setUTCHours(11 + Math.floor(pBetween(0, 3)), Math.floor(pBetween(0, 59)))), "auth.login", "user", demoId(r.key), null);
    }
  }
  push(null, daysAgo(17), "auth.login_failed", null, null, { attempts: 1 });
  push(demoId("resident-2"), daysAgo(8), "auth.login_failed", "user", demoId("resident-2"), { attempts: 2 });
  push(demoId("resident-4"), daysAgo(10), "auth.login_failed", "user", demoId("resident-4"), { reason: "deactivated" });
  push(demoId("resident-1"), daysAgo(6), "auth.password_changed", "user", demoId("resident-1"), { revokedSessions: 1 });
  push(demoId("resident-3"), daysAgo(3), "auth.logout", "user", demoId("resident-3"), null);

  // Settings: an adjustment and its revert (current values are the defaults)
  push(src.adminId, daysAgo(15), "settings.updated", "settings", null, {
    keys: ["criticalCoverageDays", "warningCoverageDays"],
    before: { criticalCoverageDays: 7, warningCoverageDays: 14 },
    after: { criticalCoverageDays: 10, warningCoverageDays: 21 },
  });
  push(src.adminId, daysAgo(9), "settings.reset", "settings", null, {
    keys: ["criticalCoverageDays", "warningCoverageDays"],
    before: { criticalCoverageDays: 10, warningCoverageDays: 21 },
    after: { criticalCoverageDays: 7, warningCoverageDays: 14 },
  });

  // Costs
  for (const e of src.expenses.filter((x) => within(x.date as Date)).slice(0, 25)) {
    const registeredAt = new Date(e.date as Date);
    push(e.registeredById ?? null, registeredAt, "expense.created", "expense", e.id!, { projectId: e.projectId, amount: e.amount, category: e.category, status: e.registeredById === src.adminId ? "APPROVED" : "PENDING" });
    if (e.registeredById !== src.adminId && e.status !== "PENDING") {
      push(src.adminId, new Date(registeredAt.getTime() + 20 * HOUR), e.status === "REJECTED" ? "expense.rejected" : "expense.approved", "expense", e.id!, {
        projectId: e.projectId,
        amount: e.amount,
        category: e.category,
        ...(e.status === "REJECTED" && { rejectionReason: e.rejectionReason }),
      });
    }
  }
  for (const t of src.transfers.filter((x) => within(x.date as Date))) {
    push(src.adminId, new Date(t.date as Date), "transfer.created", "transfer", t.id!, { residentId: t.residentId, amount: t.amount, projectId: t.projectId, method: t.method });
  }
  push(src.adminId, daysAgo(21), "project.status_changed", "project", demoId("p-coliseo"), { name: "Cubierta coliseo municipal La Unión", fromStatus: "IN_PROGRESS", toStatus: "SUSPENDED" });

  // Incidents (mirrors their history rows)
  const incidentById = new Map(src.incidents.map((i) => [i.id!, i]));
  for (const c of src.changes.filter((x) => within(x.createdAt as Date))) {
    const incident = incidentById.get(c.incidentId)!;
    if (c.fromStatus === null) {
      push(c.changedById ?? null, new Date(c.createdAt as Date), "incident.created", "incident", c.incidentId, { projectId: incident.projectId, type: incident.type, priority: incident.priority });
    } else {
      push(c.changedById ?? null, new Date(c.createdAt as Date), "incident.status_changed", "incident", c.incidentId, {
        projectId: incident.projectId,
        projectName: PROJECTS.find((p) => demoId(p.key) === incident.projectId)?.name,
        fromStatus: c.fromStatus,
        toStatus: c.toStatus,
        note: c.note ?? null,
      });
    }
  }

  // Workers, daily logs and stock
  src.workers.slice(-6).forEach((w, i) => push(src.adminId, daysAgo(26 - i * 3), "worker.created", "worker", null, { name: w.name, position: w.position, projectId: w.projectId ?? null }));
  const inactive = src.workers.filter((w) => w.status === "INACTIVE").slice(0, 2);
  inactive.forEach((w, i) => push(src.adminId, daysAgo(11 - i * 4), "worker.deactivated", "worker", null, { name: w.name, position: w.position, projectId: w.projectId ?? null }));
  for (const r of src.fieldReports.filter((x) => x.status === "REVIEWED" && within(x.reviewedAt as Date)).slice(0, 18)) {
    push(src.adminId, new Date(r.reviewedAt as Date), "field_report.reviewed", "field_report", r.id!, { projectId: r.projectId, date: r.date, reviewNote: r.reviewNote ?? null });
  }
  for (const m of src.movements.filter((x) => within(x.date as Date)).slice(-20)) {
    const material = MATERIALS.find((mat) => demoId(mat.key) === m.materialId);
    push(m.registeredById ?? src.adminId, new Date(m.date as Date), "inventory.movement", "material", m.materialId, {
      materialName: material?.name,
      type: m.type,
      quantity: m.quantity,
      unit: material?.unit,
      projectId: m.projectId ?? null,
      expenseId: m.expenseId ?? null,
    });
  }

  if (events.length > DEMO_AUDIT_MAX) throw new Error(`Too many demo audit events (${events.length})`);
  return events
    .sort((a, b) => new Date(a.createdAt as Date).getTime() - new Date(b.createdAt as Date).getTime())
    .map((event, i) => ({ ...event, id: DEMO_AUDIT_IDS[i] }));
}

// ---------- seed ----------

async function seed(adminId: string) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  await prisma.user.createMany({
    data: [
      ...RESIDENTS.map((r, i) => ({
        id: demoId(r.key),
        name: r.name,
        email: r.email,
        passwordHash,
        role: "RESIDENT_ENGINEER" as const,
        phone: RESIDENT_PHONES[i],
        createdById: adminId,
        // Daniela has never signed in (shows "Never" in the user list)
        lastLoginAt: i === 2 ? null : daysAgo(i === 0 ? 0.2 : 1),
      })),
      ...EXTRA_USERS.map((u, i) => ({
        id: demoId(u.key),
        name: u.name,
        email: u.email,
        passwordHash,
        role: u.role,
        phone: u.phone ?? null,
        createdById: adminId,
        isActive: u.isActive ?? true,
        deactivatedAt: u.isActive === false ? daysAgo(12) : null,
        mustChangePassword: u.mustChangePassword ?? false,
        lastLoginAt: u.mustChangePassword ? null : daysAgo(3 + i * 4),
      })),
    ],
  });

  await prisma.supplier.createMany({
    data: SUPPLIERS.map((s) => ({ id: demoId(s.key), name: s.name, nit: s.nit, category: s.category, phone: s.phone })),
  });

  await prisma.material.createMany({
    data: MATERIALS.map((m) => ({ id: demoId(m.key), name: m.name, unit: m.unit, category: m.category, stockAvailable: m.final, stockMinimum: m.minimum })),
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

  // Inventory ledger (60 days) consistent with today's stock, plus rejected-expense warning
  const inventory = buildInventory(adminId);
  expenses.push(...inventory.expenses);
  movements.push(...inventory.movements);

  await prisma.activity.createMany({ data: activities });
  const lifecycle = buildIncidentLifecycle(incidents, adminId);
  incidents.push(...lifecycle.extra);
  await prisma.incident.createMany({ data: incidents });
  await prisma.incidentStatusChange.createMany({ data: lifecycle.changes });
  await prisma.evidence.createMany({ data: lifecycle.evidence });
  await prisma.expense.createMany({ data: expenses });
  await prisma.fundTransfer.createMany({ data: transfers });
  await prisma.inventoryMovement.createMany({ data: movements });
  workers.push(...buildWorkerExtras(workers));
  await prisma.worker.createMany({ data: workers });
  const fieldReports = buildFieldReports(adminId);
  await prisma.fieldReport.createMany({ data: fieldReports });
  const admin = await prisma.user.findUniqueOrThrow({ where: { id: adminId }, select: { email: true } });
  const auditEvents = buildAuditEvents({ adminId, adminEmail: admin.email, expenses, transfers, incidents, changes: lifecycle.changes, workers, fieldReports, movements });
  await prisma.auditLog.createMany({ data: auditEvents });

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
    movements: movements.length,
    linkedMovements: movements.filter((m) => m.expenseId).length,
    fieldReports: fieldReports.length,
    users: ALL_DEMO_USERS.length,
    incidentHistory: lifecycle.changes.length,
    incidentPhotos: lifecycle.evidence.length,
    workers: workers.length,
    auditEvents: auditEvents.length,
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
