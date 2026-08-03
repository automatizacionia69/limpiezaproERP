# CLAUDE.md — Distribuidora LimpiezaPro (ERP de Inventarios)

## Alcance de este proyecto
Este repositorio construye **solo el ERP de inventarios**. El chatbot de WhatsApp para vendedores se está construyendo en paralelo, en otro proyecto/conversación, y se conectará más adelante a la misma base de datos (Supabase). No construir funcionalidad de WhatsApp aquí — solo dejar la base de datos y la API en un estado que un servicio externo pueda consumir fácilmente.

## Quiénes somos
Consultora de automatización con IA para pequeños y medianos negocios en la región de Piura, Perú. Equipo de dos personas: ALU y Alvaro Santti Querevalu (contacto: automatizacionia69@gmail.com).

Trabajamos bajo una metodología propia, "5 Bloques": AS-IS → TO-BE → Arquitectura técnica → Propuesta comercial → Roadmap de implementación. Los entregables de negocio se documentan en Notion; este repo es la implementación técnica (Bloque 3) de un caso de estudio de portafolio.

## El cliente (caso de estudio simulado)
**Distribuidora LimpiezaPro** — mayorista de productos de limpieza e higiene en Piura (papel higiénico, papel toalla, servilletas, lejía, detergentes, guantes, bolsas, dispensadores). Abastece a minimarkets, restaurantes, hoteles y clínicas. ~7 personas: 2 en Almacén, 3 en Ventas/Reparto, 1 en Caja/Facturación, 1 dueño.

El inventario real (~140 SKUs) está transcrito en `data/Inventario_Distribuidora_LimpiezaPro.xlsx`, organizado en 4 zonas heredadas de una antigua casa: Sala Comedor, Cochera, Cuarto 1, Cocina.

## Problemática que el ERP debe resolver
1. Inventario manual en cuadernos por zona, sin vista consolidada.
2. Códigos de producto inconsistentes; productos similares se confunden en despacho.
3. Quiebres de stock que se detectan recién al momento del despacho.
4. Compras de reposición "a ojo", sin punto de reorden ni histórico de rotación.
5. Sin trazabilidad de quién movió qué producto y cuándo.
6. Sin control FIFO — riesgo de vencimiento de stock antiguo.

## Stack técnico (decidido)
- **Frontend/Backend**: Next.js 16 (App Router), TypeScript, Tailwind CSS v4.
- **Base de datos + Auth + API**: Supabase (PostgreSQL).
- **Deploy**: Vercel — **ya en producción**, ver "Estado actual" más abajo.

## Modelo de datos
El esquema base vive en `schema.sql`, pero **ya no es el esquema completo**:
desde que se implementó, el modelo creció mucho vía migraciones aditivas
(`add-*.sql` en la raíz del repo). `schema.sql` **no es seguro de re-correr**
sobre la base real (hay datos reales/de prueba encima) — para saber el
esquema vigente hay que leer `schema.sql` + todos los `add-*.sql`, o revisar
directamente en el SQL Editor de Supabase. No asumas el modelo de memoria;
confirma antes de diseñar algo que dependa de una tabla/columna específica.

**Patrón de migraciones de este proyecto:** cada cambio de esquema es un
archivo nuevo `add-<algo-descriptivo>.sql` en la raíz, con `alter table ...
add column if not exists` / `create table` — nunca se edita `schema.sql` ni
un `add-*.sql` ya existente. El usuario corre cada archivo manualmente en el
SQL Editor de Supabase (Claude no tiene acceso de escritura DDL directo);
para verificar que una migración ya corrió, usar un script `node -e` puntual
con `@supabase/supabase-js` y la `SUPABASE_SERVICE_ROLE_KEY` de `.env.local`
para hacer un `select` de prueba contra la tabla/columna en cuestión.

**Migraciones aplicadas, en orden** (todas ya corridas en Supabase a esta
fecha): `add-usuarios-dni.sql`, `add-ventas.sql`, `add-compras.sql`,
`add-configuracion.sql`, `add-cotizaciones.sql`, `add-permisos.sql`,
`add-facturacion.sql`, `add-facturacion-mejoras.sql`,
`add-serie-boleta-b006.sql`, `add-permitir-stock-negativo.sql`,
`add-cliente-vendedor.sql`, `add-compras-documento.sql`,
`add-guias-remision.sql`, `add-cobranzas.sql` (columna
`comprobantes.fecha_cobro`), `add-ordenes-venta-dias-credito.sql` (columna
`ordenes_venta.dias_credito`, para que "Facturar" no pierda el plazo de
crédito que ya se había elegido en la cotización), `add-notificaciones.sql`
(tabla `notificaciones`, 2026-08-01 — campana de pedidos creados por el
chatbot, ver más abajo). `import-inventario.sql` /
`import-inventario-sin-comentarios.sql` fueron una carga de datos puntual
(las ~140 SKUs reales), no schema.

**Tablas/conceptos clave para orientarse rápido** (no exhaustivo — confirmar
detalle en el SQL antes de asumir columnas):
- `productos` — SKU maestro; `cantidad` nunca se edita a mano, se recalcula
  vía el trigger `aplicar_movimiento()` sobre `movimientos`. Permite stock
  negativo a propósito (ver `add-permitir-stock-negativo.sql`).
- `movimientos` — ledger inmutable de entradas/salidas/ajustes (costeo
  promedio ponderado). Nunca se borra ni edita un movimiento ya insertado.
- `usuarios_perfil` (rol: `admin`/`almacen`/`ventas`) + `usuarios_permisos`
  — permisos por módulo por usuario, capa adicional sobre RLS por rol.
- `ordenes_compra`/`detalle_compra` y `ordenes_venta`/`detalle_venta` —
  flujo pendiente→recibida/facturada.
- `comprobantes` (factura/boleta/nota de venta/ticket, series F006/B006) +
  `notas_credito`/`notas_debito` (+ `detalle_nota_credito` para devoluciones
  parciales por ítem) — facturación, vive dentro del flujo de Ventas
  ("Facturar"), se consulta en el módulo **Consulta de Ventas**.
- `guias_remision` (serie T006) — se genera automático al emitir un
  comprobante de venta, editable después (dirección de despacho/fecha/número);
  su página de detalle también lista los productos (código + cantidad, sin
  precios) del comprobante anexado, vía `comprobantes.orden_venta_id` →
  `detalle_venta` → `productos`.
- `cotizaciones`/`detalle_cotizacion` — documento previo a la venta, con
  vendedor autocompletado desde `clientes.vendedor_id`.
- `clientes`, `proveedores`, `configuracion` (datos de la empresa para
  PDFs/reportes).
- `notificaciones` (`add-notificaciones.sql`) — una fila por cada cotización
  que crea el chatbot de WhatsApp (repo separado "proyecto",
  `lib/whatsapp/proforma.ts`, insert vía `service_role`). `leida_en` null =
  no leída; se marca compartida para todo el equipo (no por usuario), mismo
  criterio que `comprobantes.fecha_cobro`. RLS solo permite lectura/marcar
  leída a `admin`/`ventas` — `almacen` no ve esta campana. Tabla agregada a
  la publicación `supabase_realtime`: la campana `notificaciones-pedidos.tsx`
  se suscribe a `postgres_changes` (INSERT) para avisar al instante con un
  beep sintetizado (Web Audio API), sin esperar a que alguien navegue.
- **Cobranzas** (`src/lib/cobranzas.ts`) — no es una tabla nueva, es una vista
  calculada sobre `comprobantes` (a crédito o Contado, `estado = 'emitido'`).
  Saldo pendiente = `total + Σ notas_debito.monto − Σ notas_credito.monto`; se
  excluye si ese saldo es `<= 0` y nunca se marcó cobrado (fue cubierto por
  NC, no un pago real). Vencimiento = `fecha_emision + dias_credito`
  (Contado = 0 días — un cliente al contado también puede demorar en pagar).
  Estados: `vencida` (venció y sigue sin `fecha_cobro`), `pendiente` (no
  venció aún), `cobrado` (`fecha_cobro` no nulo — **no desaparece de la
  lista**, queda como historial). La campana del header solo muestra el
  subconjunto accionable (vencidas + pendientes que vencen en ≤7 días,
  `filtrarParaCampana`); la página `/cobranzas` muestra todo. Tiene botón
  para descargar Excel solo de las vencidas.

## Funcionalidad — módulos implementados
El alcance creció mucho más allá del MVP original de 6 ítems (ver historial
de fases abajo, ya completado). Módulos activos hoy, agrupados en el menú
lateral en Inventario / Ventas / Administración:
**Dashboard, Productos, Movimientos, Compras, Proveedores, Ventas, Consulta
de Ventas (con Notas de Crédito/Débito y reportes Excel por
cliente/producto), Guías de Remisión, Clientes, Cotizaciones (crear +
consulta, descarga PDF vía impresión del navegador), Cobranzas (comprobantes
por vencer/vencidos/cobrados, campana de alerta, Excel de vencidas),
Reportes, Usuarios (roles + permisos por módulo, CRUD completo incluyendo
eliminar), y Configuración.** Incluye modo oscuro (toggle persistente,
fuerza modo claro automáticamente al imprimir/descargar PDF).

## Roadmap por fases (histórico — todas completadas)
- **Fase 1 — Login** ✅ (Supabase Auth, roles, protección de rutas).
- **Fase 2 — Inventario valorizado** ✅ (productos, movimientos, kardex,
  costeo promedio ponderado, alertas de stock bajo).
- **Fase 3 — Compras y Ventas** ✅ (proveedores/clientes, flujo
  pendiente→recibida/facturada).
- **Fase 4 — Facturación** ✅ implementada **dentro de la propia app** (no
  integrada a un OSE real como Nubefact — los comprobantes son
  representaciones sin validez tributaria/SUNAT, aclarado en cada PDF). Si
  en algún momento se retoma la idea de una integración real con un OSE
  peruano, es trabajo nuevo, no asumir que ya existe.
- Después de estas 4 fases se agregaron, fuera del roadmap original:
  sistema de permisos por usuario/módulo, Guías de Remisión, modo oscuro,
  reorganización del menú lateral en grupos plegables, y despliegue a
  Vercel.

## Prioridades de diseño
- Simplicidad de uso para personal no técnico (almaceneros, no desarrolladores).
- Proyecto de portafolio: la demo debe verse profesional para mostrar a futuros clientes.
- Todo en español: interfaz, mensajes, nombres de campos.

## Convenciones del proyecto
- Estructura: `src/app` (Next.js App Router), `src/lib/supabase/` con tres helpers:
  `client.ts` (cliente de navegador, para Client Components), `server.ts` (cliente
  async para Server Components/Actions, vía `next/headers`), `proxy.ts` (helper de
  sesión para el proxy raíz, vía `NextRequest`/`NextResponse`).
- **Next.js 16 (instalado en este proyecto) renombró `middleware.ts` a `proxy.ts`**
  — el archivo se llama `src/proxy.ts` y exporta `proxy()`, no `middleware()`. Si
  algo de tu conocimiento previo de Next.js menciona `middleware.ts`, no aplica a
  esta versión.
- `@supabase/ssr` requiere cookies `getAll`/`setAll` (los métodos `get`/`set`/`remove`
  están deprecados y no se usan aquí).
- Tailwind v4 vía `@import "tailwindcss"` en `src/app/globals.css` (sin
  `tailwind.config.js`). El proyecto usa `bg-gradient-to-*` normalmente (no
  `bg-linear-to-*`) — ambos funcionan en v4, no hace falta migrar nada.
- Modo oscuro: **por clase, no por `prefers-color-scheme`** — ver
  `@custom-variant dark` en `globals.css`, toggle en
  `src/app/(protected)/theme-toggle.tsx`, persistido en `localStorage`
  (`tema`). Al agregar UI nueva, siempre pensar el par `dark:` para
  texto/fondo/bordes — un elemento sin su contraparte `dark:` puede quedar
  invisible en modo oscuro (ya pasó varias veces). Imprimir/descargar PDF
  fuerza modo claro automáticamente (`src/lib/imprimir.ts`) — no lo repitas
  a mano, usa `imprimirEnModoClaro` en vez de `window.print()` directo.
- Identidad de git en esta máquina: `alvarosantti4-prog
  <alvarosantti4@gmail.com>` — es distinta de la cuenta `automatizacionia69`
  (dueña del repo en GitHub y de la cuenta de Vercel). Es normal, no es un
  error ni indica que el push falló.
- **Sin tests automatizados en este proyecto** (decisión explícita, dado el tamaño
  del equipo y el alcance de portafolio). Verificación: `npx tsc --noEmit`,
  `npm run build`, y prueba manual en el navegador.
- Comandos: `npm run dev` (servidor local), `npx tsc --noEmit`, `npm run build`.
- **Botones: `rounded-md`, sin animación de hover, con `active:scale-95`.**
  Decisión explícita del usuario — antes usaban `rounded-xl`/`2xl`/`3xl` con
  un efecto de "levantarse" al pasar el cursor (`hover:-translate-y-0.5` +
  crecer la sombra); ahora quedan cuadrados y quietos en hover, con un
  pequeño "press" solo al hacer click. Aplica a botones reales y a
  `<Link>`/componentes (`ImprimirBoton`, `DescargarExcelBoton`, etc.)
  estilizados como botón — **no** a tarjetas ni contenedores (esos SÍ pueden
  seguir con `rounded-2xl`/`3xl` y su propio hover, como las tarjetas del
  Dashboard o de Reportes).
- **Cuidado al mezclar fechas UTC y hora local en el servidor.** El servidor
  corre en hora de Perú (UTC-5) en local y en UTC en Vercel — nunca
  construyas un `Date` con `Date.UTC(...)` y después lo mutes con
  `getMonth()`/`setMonth()` (métodos en hora LOCAL): el desfase de zona
  desborda el día (ej. "31 de abril" → 1 de mayo) y corrompe el cálculo. Ya
  pasó una vez en el gráfico de 6 meses del Dashboard (`dashboard/page.tsx`,
  función `construirSeisMeses`) — se arregló con aritmética pura de
  año/mes, sin mutar objetos `Date`. Para "hoy" siempre usar `hoyPeruISO()`
  de `src/lib/fecha.ts`, nunca `new Date()` a secas.
- **Windows: `npm run dev` en segundo plano puede dejar procesos `node.exe`
  huérfanos** que siguen escuchando el puerto 3000 aunque el proceso padre
  ya se haya detenido — el siguiente `npm run dev` entonces arranca en el
  puerto 3003 (o el que esté libre) sin avisar claramente, o el puerto 3000
  queda sirviendo una versión vieja/rota (500). Si `localhost:3000` no
  responde o tira 500 después de reiniciar el server, revisar procesos
  huérfanos (`Get-Process node`) y matarlos (`Stop-Process -Force`) antes de
  volver a levantar el servidor.
- **Gotcha de desarrollo en Windows**: si el login (o cualquier llamada del
  servidor de Next.js a Supabase) falla con `fetch failed` a pesar de que las
  credenciales son correctas, revisa si el antivirus (ej. Avast) tiene activado
  el "Escaneo HTTPS" del Web Shield — intercepta TLS con su propio certificado, y
  Node.js no confía en él (a diferencia del navegador o PowerShell, que sí
  confían en el certificate store de Windows). Desactivar esa opción (o agregar
  una excepción) resuelve el problema; no es un bug del código.

## Estado actual y próximos pasos
- **El ERP está funcionalmente completo y en producción.** Todos los módulos
  listados arriba funcionan de punta a punta contra datos reales/de prueba
  en Supabase. No es un prototipo — trátalo como una app viva: cambios de
  esquema son aditivos (ver "Modelo de datos"), y hay datos que no se deben
  perder o corromper.
- **Desplegado en Vercel**, proyecto `limpiezapro-erp` bajo el equipo
  `Ponseti`, conectado al repo de GitHub `automatizacionia69/limpiezaproERP`
  (rama `main`), con auto-deploy en cada push confirmado funcionando. URL:
  `https://limpiezapro-erp.vercel.app`.
- Flujo de trabajo normal para un cambio: editar código → `npx tsc --noEmit`
  → probar en el navegador (`npm run dev`, puerto 3000 normalmente ya
  corriendo) → si el usuario pide subirlo, `git add`/`commit`/`push` a
  `main` (siempre confirmar antes de hacer push — no asumir autorización de
  una sesión anterior).
- **No reiniciar `npm run dev` después de cada cambio** (pedido explícito del
  usuario) — Next.js recompila solo vía hot-reload al guardar. Solo
  reiniciar si el servidor realmente se cae o queda en un estado roto (ver
  gotcha de procesos huérfanos de Windows arriba), no como paso reflejo de
  verificación.
- Pendientes sueltos conocidos a esta fecha (no bloqueantes): decidir qué
  hacer con una nota de crédito de prueba con cantidad mal cargada (2.98 en
  vez de 3, ver movimiento histórico si hace falta) — dejar como dato de
  prueba o corregir con una Nota de Débito; pulido cosmético de los badges
  de colores (estados/roles) en modo oscuro, se ven un poco muy brillantes
  sobre fondo oscuro.
- Documentación histórica de diseño (specs/planes de las fases 1 y 2,
  cuando el modelo aún era simple) sigue en `docs/superpowers/` por
  contexto histórico, pero **está desactualizada** respecto al esquema
  real — no la uses como fuente de verdad del modelo de datos actual.

## Variables de entorno necesarias (.env.local — no versionar)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DECOLECTA_API_TOKEN=
```
Las dos primeras se obtienen del panel de Supabase (Project Settings → API).
`SUPABASE_SERVICE_ROLE_KEY` es necesaria para crear/editar/eliminar usuarios
desde el módulo Usuarios (usa el Admin API de Supabase Auth) — **nunca
exponerla client-side**, solo se usa en Server Actions
(`src/lib/supabase/admin.ts`). `DECOLECTA_API_TOKEN` es para el autocompletado
de RUC/DNI al crear clientes/proveedores (`src/lib/decolecta.ts`). Estas
mismas 4 variables deben estar cargadas también en Vercel → Settings →
Environment Variables para que el deploy en producción funcione.
