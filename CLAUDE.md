# ObraIQ - Civil Works Management System

Producto: plataforma web para gestionar, hacer seguimiento financiero y predecir riesgos de obras de CUALQUIER tipo de construcción (edificaciones residenciales y comerciales, vías, puentes, colegios, centros de salud, bodegas, remodelaciones, además de obra deportiva, piscinas y muros de contención), orientada a constructoras de Nariño, Colombia. Marca: ObraIQ (nunca "Obrix" ni "Dalid").

## Requisitos académicos (no negociables)
- Aplicación WEB responsive (no app móvil nativa). Frontend + Backend + PostgreSQL + IA + despliegue en la nube (Vercel front, Render/Railway back, Neon BD, Cloudinary imágenes) + dominio propio. El despliegue se hace después: no tocar infraestructura todavía.
- Auth propia: JWT (access + refresh rotativo en cookies httpOnly). Roles: ADMIN y RESIDENT_ENGINEER. Un solo login; el rol sale de la BD/token.
- Idiomas: español por defecto + inglés, con selector visible. Tema: claro por defecto + oscuro, con selector visible. Ambos deben funcionar en TODAS las pantallas (incluido login, landing, errores y estados vacíos).
- IA: Gemini como módulo independiente (el sistema debe funcionar aunque la IA falle). El modelo se lee de la variable de entorno GEMINI_MODEL del .env (ej. gemini-1.5-flash), nunca hardcodeado.
- Conceptos de la materia YA implementados que NO se deben romper: Web Worker (frontend/public/workers/project-analysis.worker.js, JS plano a propósito por Turbopack), SharedWorker (public/workers/analysis-broadcast.shared-worker.js), SharedArrayBuffer + crossOriginIsolated (headers COOP/COEP en next.config.ts; por eso toda <img> externa lleva crossOrigin="anonymous"), Worker Threads en backend + benchmark hilo principal vs worker, postMessage, métricas/INP. Service Worker: pendiente, NO implementar hasta que yo lo pida.
- Patrones usados y justificados: Repository, Service Layer, Strategy (RiskStrategy: RULE_BASED / AI_GEMINI). Estructuras de datos solo con justificación real (ej. Map para agrupar o buscar). No agregar patrones ni estructuras decorativas.
- Alcance controlado: NO app móvil nativa, microservicios, Kubernetes, nómina, facturación electrónica, GPS, IoT, mapas, ingresos, "cliente" comercial, anticipos, utilidad/margen, órdenes de compra con flujo de aprobación propio, pagos programados a proveedores. No inventes campos que no existan en el modelo de datos; si un diseño los trae, adáptalo a campos reales y avísame.

## Arquitectura
- Backend: Fastify 5 + TypeScript + Prisma 5.22 (versión FIJA, no subir a v6+). Capas: routes -> controllers -> services -> repositories. Validación con Zod. Errores: siempre `throw new AppError(status, message)`, nunca objetos sueltos.
- Frontend: Next.js 16 (App Router; el archivo es src/proxy.ts, no middleware.ts), React 19, Tailwind v4 (@custom-variant dark y tokens en @theme de globals.css), next-intl (rutas bajo [locale]), TanStack Query + createResourceHooks, Zustand (auth), react-hook-form + zod, Recharts, framer-motion.

## Estrategia de renderizado (decisión consciente por pantalla)
- CSR ("use client" + TanStack Query) para TODAS las pantallas privadas y financieras: dashboard, obras, detalle de obra, costos, registrar gasto, proveedores y caja, flujo de caja, usuarios. Justificación: requieren sesión, los datos dependen del rol y cambian con cada aprobación o giro, son muy interactivas (filtros, formularios, workers) y no tienen valor SEO. NO convertirlas a SSG ni ISR (los datos financieros son privados y dinámicos).
- SSG para la landing pública y páginas informativas sin datos de usuario (generateStaticParams para es/en y setRequestLocale de next-intl).
- Login: pública, sin datos por usuario, prerenderizada con formulario CSR; no forzar SSR.
- SSR e ISR: no se usan en este proyecto; si en el futuro se agregan, documentarlo.
- Mantener docs/rendering-strategy.md (pantalla -> patrón -> justificación -> ventaja y cuello de botella) y verificar con la salida de `next build`.

## Dominio financiero
- Moneda: COP, sin decimales, siempre COP aunque el idioma sea inglés. Usar formatCOP (frontend/src/lib/format.ts) en TODA la app.
- Giro (FundTransfer): dinero que el ADMIN envía a un residente para gastos en campo; puede asociarse a una obra.
- Gasto registrado por un RESIDENT_ENGINEER: nace PENDING, se paga con su fondo y reduce su saldo mientras no esté REJECTED. El ADMIN lo aprueba (APPROVED) o rechaza (REJECTED, con motivo).
- Gasto registrado por el ADMIN: nace APPROVED y es un pago directo de la empresa (no afecta saldos de residentes).
- Saldo del residente = giros recibidos - gastos PENDING y APPROVED registrados por él. Puede ser negativo ("por reembolsar", en rojo); no se bloquea.
- Solo los gastos APPROVED cuentan para presupuesto ejecutado, indicadores, alertas, contexto de IA y KPIs globales. Los PENDING se muestran aparte ("por aprobar").
- Eficiencia de costos (CPI) = (presupuesto x avance físico / 100) / gastos aprobados. Mostrar "—" si no hay gastos; explicarla con un tooltip traducido.
- registeredById, createdById, reviewedById y responsibleId de actividades se toman SIEMPRE de request.user.sub en el servidor, nunca del body.
- Permisos: el ADMIN ve y hace todo. El RESIDENT_ENGINEER registra gastos solo en sus obras, ve los gastos de sus obras, ve solo SU saldo y SUS giros, no ve saldos de otros ni estadísticas globales, y no aprueba ni crea giros. Los residentes pueden listar proveedores y crear uno en línea (nombre + NIT opcional); solo el ADMIN los edita o elimina. Sidebar y pestañas muestran solo lo que el rol puede usar.

## Convenciones
- Código, nombres, comentarios y commits en INGLÉS. Texto visible al usuario solo vía next-intl: es.json y en.json con EXACTAMENTE las mismas claves. Cero strings hardcodeados en JSX (incluye placeholders, aria-labels, títulos, metadata y mensajes de error). Prohibido alert() y confirm(): usar toasts y modales traducidos.
- TypeScript estricto: sin `any` ni `as any`. Reglas de React 19: sin setState síncrono dentro de useEffect, sin Math.random()/Date.now() durante el render, componentes puros.
- UI: SOLO tokens semánticos (bg-bg, bg-surface, bg-surface-2, border-line, text-ink, text-ink-muted, bg-accent, text-critical, text-success, text-warning, font-mono-data); prohibidos colores fijos que rompan un tema. Probar SIEMPRE claro y oscuro. Foco visible, respetar prefers-reduced-motion, estados loading/empty/error diseñados. Una sola animación de entrada orquestada por pantalla; hover-lift solo en tarjetas interactivas. Mobile-first en pantallas que usa el residente.
- Los enums del backend (status, type, priority, category, severity, role, método de pago) nunca se muestran crudos: siempre vía claves traducidas.
- No agregar dependencias sin justificarlo.

## Flujo de trabajo
- Commits PEQUEÑOS y frecuentes, Conventional Commits en inglés: un commit por cambio lógico. La meta es 150+ commits por proyecto; no agrupes cambios no relacionados. NUNCA git push.
- Antes de dar algo por terminado: backend `npm run build`; frontend `npx tsc --noEmit`, `npm run lint`, `npm run i18n:check` y `npm run build`. Corrige todos los errores. En backend, prueba endpoints con curl contra el servidor local.
- Prohibido: prisma migrate reset, db push --force, borrar datos, editar .env, imprimir o commitear secretos o cookies. Los cambios al schema de Prisma son SOLO ADITIVOS y requieren mi confirmación antes de aplicarse.
- Al terminar cada tarea: resumen de cambios, commits creados, cómo probarlo manualmente y pendientes o decisiones.
