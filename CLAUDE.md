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

## Dominio de inventario
- Un solo stock por material (bodega central de la empresa). El consumo se atribuye a obras con movimientos que llevan projectId. No existe stock por obra (futuro).
- El libro de movimientos es append-only: sin editar ni borrar movimientos; las correcciones son movimientos compensatorios con nota. stockAvailable solo cambia vía movimientos, dentro de prisma.$transaction, y nunca queda negativo.
- Quién registra: el ADMIN registra IN y OUT (projectId opcional; opcionales expenseId, supplierId, unitCost). El RESIDENT_ENGINEER registra OUT solo en obras donde es responsable (projectId obligatorio) e IN solo vinculada a un gasto propio de categoría MATERIALS no rechazado (expenseId obligatorio). registeredById sale siempre de la sesión.
- Si un gasto con entrada de inventario vinculada es luego RECHAZADO, el stock no se revierte solo: el libro muestra una insignia de advertencia y el ADMIN corrige con un movimiento compensatorio.
- Estados de material: OUT (stock 0), CRITICAL (bajo el mínimo o cobertura < 7 días), WARNING (cobertura < 14 días), OK. Cobertura (días) = stock / consumo diario promedio de los últimos 30 días; si no hay consumo es null y se muestra "—", nunca infinito. Necesidad estimada a 30 días = max(0, consumo diario x 30 - stock). Umbrales en backend/src/config/inventory-thresholds.ts. Es análisis por reglas, explicable, sin IA. El consumo se agrega con un Map en una sola pasada (sin N+1); justifícalo en un comentario.
- Valor estimado del inventario = stock x último unitCost conocido, siempre etiquetado como estimado; los materiales sin costo no suman. El residente NO ve costos ni valores.
- Los residentes ven el stock de todos los materiales y pueden crear uno en línea (nombre + unidad). Solo el ADMIN edita nombre, unidad, categoría y stock mínimo. stockAvailable nunca se edita directamente.

## Dominio de reportes
- Tipos: progreso de obra, financiero (solo ADMIN), consumo de materiales, novedades y bitácora. El ADMIN ve todas las obras; el residente solo las suyas. Los cálculos se hacen en el servidor con datos filtrados por rol; nunca se confía en cifras del cliente.
- Toda respuesta de reporte incluye metadatos { generatedAt, generatedBy, durationMs, recordCount }; la UI muestra "Generado en N ms · M registros" (métrica de generación de informes de la materia) y el backend envía el header Server-Timing.
- Exportación: CSV (exportCsv, montos como números sin símbolo y columna indicando COP, fechas ISO) e Imprimir/PDF con window.print y CSS de impresión (tema claro forzado, sin sidebar ni header, encabezado con logo, obra, periodo y generado por/fecha). Sin librerías de PDF ni envío de emails.
- Resumen ejecutivo con IA: opcional, bajo demanda, módulo independiente que puede fallar sin afectar nada. Los datos se calculan en el servidor y el idioma es el de la UI.
- Bitácora diaria (FieldReport): un reporte por obra y día (único proyecto+fecha). Texto del residente + secciones compiladas automáticamente del día (actividades, novedades, fotos, consumo de materiales, gastos registrados). El autor lo edita mientras esté SUBMITTED; el ADMIN lo marca REVIEWED con comentario opcional y desde ahí es inmutable.
- Zona horaria de negocio: America/Bogota (UTC-5, sin horario de verano). "Hoy", los límites de día y las fechas @db.Date se calculan en esa zona, nunca en la UTC del servidor.

## Dominio de usuarios
- Solo el ADMIN gestiona usuarios. Roles existentes: ADMIN y RESIDENT_ENGINEER; no se agregan roles nuevos.
- Los usuarios no se borran, se desactivan (isActive=false). Desactivar revoca todos sus refresh tokens y bloquea el login con un error traducido. Un ADMIN no puede desactivarse a sí mismo, cambiar su propio rol ni desactivar o degradar al último ADMIN activo.
- Sin envío de emails: al crear un usuario o restablecer su contraseña, el servidor genera una contraseña temporal aleatoria (crypto, 12+ caracteres) que se devuelve UNA sola vez en esa respuesta y nunca se guarda en claro ni se registra en logs. El usuario queda con mustChangePassword=true: hasta que la cambie, la API responde 403 con código PASSWORD_CHANGE_REQUIRED en todo menos /auth/me, /auth/logout y /auth/change-password, y el frontend lo redirige a la pantalla de cambio de contraseña.
- Cambiar contraseña exige la actual, aplica la política (mínimo 8 caracteres, no igual a la anterior), revoca los demás refresh tokens y queda auditado.
- Intentos de login: límite en memoria de 5 fallos por correo+IP en 15 minutos (429 con mensaje traducido). El mensaje de credenciales inválidas no revela si el correo existe. Al iniciar sesión se actualiza lastLoginAt.
- createdById, actorId y similares salen siempre de la sesión en el servidor, nunca del body.

## Dominio de auditoría (historial del sistema)
- AuditLog es append-only: sin endpoints de edición ni borrado. Campos: actorId (SET NULL) más snapshot actorEmail, action (código estable tipo "user.created"), entityType, entityId, metadata JSON, ip, userAgent, createdAt.
- Nunca se guardan contraseñas, hashes, tokens ni secretos en metadata. Un helper central (audit.service) sanea metadata con lista de campos permitidos y un cambio se registra como { antes, despues } solo de los campos que cambiaron.
- Los eventos se registran dentro de la misma prisma.$transaction de la acción cuando existe una; si no, es "mejor esfuerzo" (si falla, se loguea y la acción no se rompe).
- Eventos mínimos: login exitoso y fallido, logout, cambio y restablecimiento de contraseña; crear, editar, activar y desactivar usuario; cambio de configuración; crear, aprobar y rechazar gasto; giros; cambio de estado de obra; movimientos de inventario; revisión de bitácoras; cambio de estado de novedades; alta y desactivación de trabajadores.
- Solo el ADMIN consulta el historial. Las fechas se muestran en America/Bogota.

## Dominio de configuración del sistema
- Solo existen ajustes que realmente cambian el comportamiento del sistema. Cada ajuste tiene valor por defecto en código (los valores actuales de risk-thresholds.ts e inventory-thresholds.ts) y la base solo guarda lo que el ADMIN personaliza. Si no hay fila, se usa el valor por defecto; el sistema nunca falla por falta de configuración.
- Validación con Zod y reglas cruzadas (por ejemplo cobertura crítica < cobertura en alerta). Un servicio con caché corta se invalida al guardar. Hay botón "Restablecer valores por defecto". Todo cambio queda auditado con antes y después. Moneda (COP) y zona horaria (America/Bogota) NO son configurables.

## Dominio de novedades (incidentes)
- Estados: OPEN, IN_PROGRESS, RESOLVED, con historial de cambios (quién y cuándo) y nota de resolución. El ADMIN y el residente responsable de la obra pueden avanzar el estado en sus obras; reabrir solo el ADMIN. El residente reporta solo en obras propias.
- Implementación: el estado "en progreso" usa el valor existente IN_REVIEW del enum IncidentStatus (renombrarlo no sería aditivo); la interfaz lo muestra como "En progreso" / "In progress".
- Una novedad no se borra: se resuelve. Puede llevar fotos usando el mecanismo de evidencias existente (Cloudinary, crossOrigin="anonymous").

## Dominio de trabajadores
- Un trabajador no se borra si tiene registros asociados: se desactiva (isActive). Los datos personales sensibles (documento, teléfono) solo los ve el ADMIN; el residente ve nombre, oficio y estado de los trabajadores de sus obras.
- Implementación: "isActive" es el campo existente status (ACTIVE/INACTIVE) y el oficio es position.
- Sin nómina ni costos laborales (fuera de alcance).

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
