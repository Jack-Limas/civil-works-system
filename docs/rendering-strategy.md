# Estrategia de renderizado — ObraIQ

ObraIQ usa Next.js 16 (App Router). El patrón de renderizado se eligió **pantalla por pantalla** según dos preguntas: ¿el contenido es igual para todos los visitantes? y ¿depende de la sesión o cambia con cada acción del usuario?

| Patrón | Dónde se usa | Idea |
|---|---|---|
| **SSG** (Static Site Generation) | Landing, login, páginas 404 | HTML generado en `next build`, una vez por idioma (`generateStaticParams` + `setRequestLocale`). |
| **CSR** (Client-Side Rendering) sobre un *shell* prerenderizado | Todas las pantallas privadas | El HTML generado solo contiene la estructura traducida (sidebar, encabezado, skeletons). **Ningún dato privado** se incluye en el HTML: los datos llegan desde la API en el navegador con TanStack Query, después de validar la sesión. |
| **SSR** | No se usa | — |
| **ISR** | No se usa | — |

## Tabla por pantalla

| Pantalla | Ruta | Patrón | Justificación | Ventaja | Cuello de botella |
|---|---|---|---|---|---|
| Landing | `/[locale]` | SSG (Server Component) | Contenido público e idéntico para todos; valor SEO. Solo los selectores de idioma y tema son islas cliente. | Se sirve desde CDN sin tocar el backend; carga casi instantánea. | Cambiar un texto exige un nuevo build y despliegue. |
| Login | `/[locale]/login` | SSG + formulario CSR | Página pública sin datos por usuario; el formulario necesita estado e interacción. | Primera pintura inmediata; el JS del formulario hidrata después. | El año del pie de página queda fijo al momento del build. |
| 404 | `not-found` | Estático | Sin datos. | Costo cero. | — |
| Panel general | `/[locale]/dashboard` | CSR | Requiere sesión; las cifras dependen del rol (el residente solo ve sus obras) y cambian con cada actividad o gasto. | Datos siempre frescos y cacheados en el cliente (TanStack Query); refetch sin recargar. | Primera carga muestra skeletons hasta que responde la API (y Neon puede tardar si la base estaba suspendida). |
| Obras (lista) | `/[locale]/projects` | CSR | Filtros y búsqueda interactivos; lista acotada por rol. | Filtrar no hace peticiones nuevas (se filtra en memoria). | Trae hasta 100 obras por petición; con miles habría que paginar en el servidor. |
| Detalle de obra | `/[locale]/projects/[id]` | CSR (ruta dinámica `ƒ`) | El `id` no se conoce en el build y los datos son privados. | Pestañas sin recargar; invalidación selectiva de caché al registrar actividad o evidencia. | Varias peticiones en paralelo al abrir la obra. |
| Nueva obra | `/[locale]/projects/new` | CSR | Formulario solo para ADMIN, con validación en vivo. | Validación inmediata con zod. | — |
| Costos — Resumen | `/[locale]/expenses` | CSR | Datos financieros **privados** que cambian con cada aprobación o giro. **No debe ser SSG/ISR**: quedarían datos de un usuario en caché compartida. | Aprobación/rechazo con actualización inmediata de KPIs, alertas y saldos (invalidación de caché). | Agregaciones en el servidor por cada visita (mitigado con `groupBy` e índices). |
| Registrar gasto | `/[locale]/expenses/new` | CSR (mobile-first) | Formulario interactivo con cámara, compresión de fotos en Web Worker y panel de impacto en vivo. | La compresión ocurre en un hilo aparte: la interfaz no se congela con fotos de 6-12 MB. | Depende de la capacidad del celular para decodificar la imagen. |
| Proveedores | `/[locale]/suppliers` | CSR | Directorio con búsqueda y estadísticas solo para ADMIN. | Búsqueda con *debounce*; estadísticas unidas con un `Map`. | Las estadísticas recorren todos los gastos aprobados (agregadas en BD). |
| Caja menor | `/[locale]/cash` | CSR | Saldos por residente: dato sensible y por rol. | El residente solo recibe su propia fila desde la API. | — |
| Flujo de caja | `/[locale]/cashflow` | CSR | Serie mensual y libro de movimientos filtrables. | Cambiar el periodo o filtro mantiene los datos previos visibles (`keepPreviousData`). | La exportación CSV recorre todas las páginas del filtro. |
| Usuarios | `/[locale]/users` | CSR (solo ADMIN) | Cuentas, roles y estados: datos sensibles que cambian con cada alta o desactivación. La contraseña temporal solo existe en la respuesta de creación (`Cache-Control: no-store`). | KPIs y lista en una sola petición; búsqueda con *debounce*. | — |
| Detalle de usuario | `/[locale]/users/[id]` | CSR (ruta dinámica `ƒ`, solo ADMIN) | El `id` no se conoce en el build; muestra obras y actividad reciente del historial. | Acciones (desactivar, restablecer) invalidan lista, detalle e historial. | — |
| Configuración | `/[locale]/settings` | CSR (solo ADMIN) | Umbrales que cambian alertas, riesgos e inventario; deben verse al instante tras guardar. | Validación en vivo y vista previa de estados del inventario sin ir al servidor. | El cálculo de la vista previa usa la cobertura actual (no aplica si cambia la ventana de consumo). |
| Historial del sistema | `/[locale]/audit` | CSR (solo ADMIN) | Registro de solo lectura, filtrable y privado. | Paginación en el servidor con índices por fecha, actor, entidad y acción. | La exportación CSV tiene un tope de 5000 eventos. |
| Mi perfil | `/[locale]/profile` | CSR | Datos de la sesión, cambio de contraseña y preferencias. | Cambiar idioma o tema no recarga datos. | — |
| Cambio de contraseña | `/[locale]/change-password` | CSR (sin sidebar) | Obligatorio tras una contraseña temporal: la API responde 403 `PASSWORD_CHANGE_REQUIRED` en todo lo demás. | El cliente redirige aquí desde cualquier petición bloqueada. | — |
| Inventario | `/[locale]/materials` | CSR | Stock, estados y costos cambian con cada movimiento; el ADMIN ve valores y el residente una vista simple sin costos (la API los omite). | Estados calculados en el servidor con 4 consultas agregadas con `Map`; filtros sin recargar. | El análisis recorre todos los materiales en cada visita (aceptable con cientos; con miles habría que precalcular). |
| Movimientos | `/[locale]/materials/movements` | CSR (solo ADMIN) | Libro inmutable privado, con formulario en línea. | Registrar una entrada o salida refresca stock, estados y libro por invalidación de caché. | La exportación CSV recorre todas las páginas del filtro. |
| Detalle de material | `/[locale]/materials/[id]` | CSR (ruta dinámica `ƒ`) | El `id` no se conoce en el build; datos privados. | La serie de stock se reconstruye en el servidor; el selector 30/90 días conserva el gráfico previo mientras carga. | Reconstruir 90 días exige leer todos los movimientos del periodo. |
| Centro de reportes | `/[locale]/reports` | CSR | Tarjetas según el rol (sin financiero para el residente) y bitácoras pendientes del ADMIN. | Navegación inmediata; solo una petición pequeña. | — |
| Reporte | `/[locale]/reports/[type]` | CSR (ruta dinámica `ƒ`) | Cifras calculadas en el servidor bajo demanda para el periodo y la obra elegidos; el financiero es solo ADMIN. **No ISR**: dependen del rol y cambian con cada registro. | La API mide su tiempo (`Server-Timing`, “Generado en N ms”); `staleTime` de 1 min evita recalcular al volver. Impresión/PDF con CSS `@media print`; resumen IA opcional. | Cada cambio de filtro recalcula el reporte en el servidor; Gemini puede tardar o fallar (el reporte sigue funcionando). |
| Bitácora diaria | `/[locale]/reports/daily` | CSR (mobile-first para el residente) | Cola de revisión del ADMIN o “Mi bitácora” del residente con el día compilado. El reporte abierto vive en la URL (`?report=id`). | Formulario prellenado con lo registrado en el día; enlace directo desde el centro de reportes. | La compilación del día hace 5 consultas en paralelo por obra. |
| Novedades | `/[locale]/incidents` | CSR | Estados que cambian con cada transición; el residente solo ve sus obras. La novedad abierta vive en la URL (`?incident=id`). | Filtros y KPIs en una petición; fotos comprimidas en un Web Worker antes de subir. | Cada cambio de estado invalida novedades, alertas y dashboard. |
| Trabajadores | `/[locale]/workers` | CSR | Datos personales solo para el ADMIN (la API no los envía al residente). | Lista filtrada en el servidor; oficios sugeridos desde los KPIs. | — |
| Alertas, evidencias | `/[locale]/...` | CSR | Datos privados y por rol. | — | — |

## Por qué las pantallas privadas aparecen como `●` en `next build`

Next.js marca como `●` (SSG) toda ruta cuyo HTML puede generarse en el build. En las pantallas privadas ese HTML es **solo el armazón** traducido de la página (layout, encabezado y skeletons de carga): son componentes `"use client"` que no leen datos en el servidor. La autenticación ocurre en dos capas:

1. `src/proxy.ts` redirige al login si no existe la cookie de sesión (comprobación optimista, rápida).
2. La API (Fastify) valida el JWT y filtra cada consulta por rol y pertenencia a la obra (la verdadera autorización).

Por eso es seguro y eficiente: el armazón se sirve desde caché y los datos privados nunca forman parte de un HTML compartido.

## Salida de `next build` (verificación)

```
Route (app)
┌ ○ /_not-found
├   /[locale]
│ ├ ● /es
│ └ ● /en
├   /[locale]/login
│ ├ ● /es/login
│ └ ● /en/login
├   /[locale]/dashboard            ● /es/dashboard, ● /en/dashboard   (shell; datos CSR)
├   /[locale]/expenses             ● /es/expenses,  ● /en/expenses    (shell; datos CSR)
├   /[locale]/expenses/new         ● ...                              (shell; datos CSR)
├   /[locale]/suppliers, /cash, /cashflow, /projects, /projects/new,
│   /materials, /materials/movements, /incidents, /workers, /users,
│   /alerts, /evidence, /reports, /reports/daily, /settings, /audit,
│   /profile, /change-password                                       ● (shell; datos CSR)
├ ƒ /[locale]/projects/[id]                                           (dinámica; datos CSR)
├ ƒ /[locale]/materials/[id]                                          (dinámica; datos CSR)
├ ƒ /[locale]/reports/[type]                                          (dinámica; datos CSR)
├ ƒ /[locale]/users/[id]                                             (dinámica; datos CSR)
ƒ Proxy (Middleware)

○ (Static)  prerendered as static content
● (SSG)     prerendered as static HTML (uses generateStaticParams)
ƒ (Dynamic) server-rendered on demand
```

## Decisiones relacionadas

- **Una sola petición de sesión**: `AuthProvider` llama `/auth/me` al montar; en páginas públicas responde 401 y la página sigue funcionando (no se redirige).
- **COOP/COEP** (`next.config.ts`) habilitan `SharedArrayBuffer`; por eso toda imagen externa (Cloudinary) lleva `crossOrigin="anonymous"` y los PDF se abren en una pestaña nueva en vez de incrustarse.
- **SSR/ISR**: no aportan aquí. Las páginas públicas no tienen datos que revalidar (SSG basta) y las privadas no deben cachearse en el servidor. Si en el futuro se agrega, por ejemplo, un catálogo público de obras terminadas, ISR sería la opción natural y se documentará en esta tabla.
