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
- **Frontend/Backend**: Next.js (App Router), TypeScript, Tailwind CSS.
- **Base de datos + Auth + API**: Supabase (PostgreSQL). El esquema base está en `schema.sql` — correrlo en el SQL Editor de Supabase antes de empezar a codear.
- **Deploy**: Vercel (free tier), para poder mandar el link de demo a clientes fácilmente.

## Modelo de datos
**⚠️ En transición.** El `schema.sql` que corre hoy en Supabase todavía es el
modelo original y simple (ver abajo). Ya existe un **spec aprobado** para
reemplazarlo por uno más completo (ver "Roadmap por fases" y "Estado actual"
más abajo) — el `schema.sql` en el repo y en Supabase se actualizará cuando
se implemente ese plan, no antes. No asumas que las tablas nuevas
(`almacenes`, `categorias`, `unidades_medida`, columnas de costo) ya existen
sin antes confirmar el estado real corriendo `\d` en el SQL Editor de
Supabase o revisando el `schema.sql` del repo.

**Modelo actual (vigente hoy):**
- `zonas` — las 4 zonas del almacén (editable a futuro si se reorganiza la logística).
- `productos` — SKU maestro. **`cantidad` no se edita a mano nunca**: se recalcula automáticamente vía trigger cada vez que se inserta un registro en `movimientos`.
- `movimientos` — ledger de entradas/salidas/ajustes. Es la fuente de verdad para trazabilidad. Incluye `referencia`, pensado para más adelante enlazar pedidos que vengan del chatbot.
- `usuarios_perfil` — extiende `auth.users` de Supabase con un rol: `admin`, `almacen`, `ventas`.
- Vista `productos_stock_bajo` — productos con `cantidad <= punto_reorden`, para el módulo de alertas.

**Modelo especificado (pendiente de implementar)** — ver
`docs/superpowers/specs/2026-07-26-inventario-schema-design.md` para el SQL
completo y el razonamiento de cada decisión:
- `almacenes` (sede/ciudad, ej. "Piura") → `zonas` (sub-espacio físico dentro
  de un almacén) — jerarquía de dos niveles, reemplaza el `zonas` plano actual.
- `categorias` y `unidades_medida` — pasan de ser texto libre en `productos` a
  tablas propias con FK (`categoria_id`, `unidad_id`).
- `productos.costo` (costo unitario, promedio ponderado) y
  `productos.precio_venta` — nuevos campos para soportar valorización.
- `movimientos.costo_unitario` (obligatorio en `entrada`, autocompletado en
  `salida`/`ajuste`) y `movimientos.efecto_cantidad` (delta interno con signo,
  usado por el kardex — `ajuste` sigue guardando el valor absoluto de cara al
  usuario, sin cambios de UX).
- Trigger `aplicar_movimiento` pasa de `AFTER INSERT` a `BEFORE INSERT` (para
  poder autocompletar columnas de la misma fila antes de escribirla).
- Vista nueva `kardex_valorizado` — ledger con saldo corriente de cantidad y
  valor monetario por producto.
- Fix del bug de RLS en `usuarios_perfil` (ver nota más abajo) incluido en
  este mismo rediseño.
- Migración: **drop and recreate** completo (no hay datos reales de cliente
  todavía, solo de prueba) — correrlo borra los usuarios de prueba del login
  (`auth.users` de Supabase Auth no se toca, solo `usuarios_perfil`; hay que
  volver a insertar esa fila después).

## Funcionalidad del MVP (redefinido — ver "Roadmap por fases")
El alcance original (6 ítems simples) se **redefinió** para apuntar a un ERP
más completo, después de comparar con una referencia ("AlmacénPro") que el
usuario tenía en mente. Ver la sección "Roadmap por fases" para el detalle
actualizado por fases. Los ítems originales (CRUD de productos, movimientos,
dashboard, alertas, historial) siguen siendo el mismo trabajo de fondo, pero
ahora se construyen sobre el modelo de datos con costeo/valorización en vez
del modelo simple original.

## Roadmap por fases
- **Fase 1 — Login** ✅ completo (Supabase Auth, roles, protección de rutas). Mergeado a `main`.
- **Fase 2 — Inventario valorizado** (en curso, rama `feature/inventario-schema`):
  rediseño del modelo de datos (spec aprobado, implementación pendiente) +
  CRUD de productos + movimientos (entrada/salida/ajuste) + dashboard con
  stock consolidado + alertas de stock bajo + kardex valorizado. Ver
  `docs/superpowers/specs/2026-07-26-inventario-schema-design.md`.
- **Fase 3 — Compras y Ventas** (sin diseñar todavía, deliberadamente fuera de
  la Fase 2): flujos de documentos (orden de compra → recepción; pedido →
  despacho), con proveedores/clientes. Se diseñará como su propio ciclo
  spec → plan → implementación cuando le toque.
- **Fase 4 — Facturación electrónica** (idea discutida, no diseñada):
  integrar con un OSE peruano (ej. Nubefact) para emitir boletas/facturas
  válidas ante SUNAT automáticamente al completar una venta. Depende de que
  exista la Fase 3 (Ventas) primero — no tiene sentido facturar sin un
  registro de venta. La app nunca se certifica como OSE ella misma; se
  integra como cliente de la API de un OSE ya certificado.

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
- Tailwind v4: usar `bg-linear-to-*`, no `bg-gradient-to-*` (nombre viejo de v3).
- **Sin tests automatizados en este proyecto** (decisión explícita, dado el tamaño
  del equipo y el alcance de portafolio). Verificación: `npx tsc --noEmit`,
  `npm run build`, y prueba manual en el navegador.
- Comandos: `npm run dev` (servidor local), `npx tsc --noEmit`, `npm run build`.
- **Gotcha de desarrollo en Windows**: si el login (o cualquier llamada del
  servidor de Next.js a Supabase) falla con `fetch failed` a pesar de que las
  credenciales son correctas, revisa si el antivirus (ej. Avast) tiene activado
  el "Escaneo HTTPS" del Web Shield — intercepta TLS con su propio certificado, y
  Node.js no confía en él (a diferencia del navegador o PowerShell, que sí
  confían en el certificate store de Windows). Desactivar esa opción (o agregar
  una excepción) resuelve el problema; no es un bug del código.

## Estado actual y próximos pasos
- **Login con Supabase Auth**: completo, probado end-to-end, **mergeado a `main`**
  (la rama `feature/login-auth` ya se borró). Documentación: spec en
  `docs/superpowers/specs/2026-07-26-login-auth-design.md`, plan en
  `docs/superpowers/plans/2026-07-26-login-auth-plan.md`.
- **Rediseño del modelo de datos (Fase 2)**: spec completo y **aprobado por el
  usuario**, vive en `docs/superpowers/specs/2026-07-26-inventario-schema-design.md`
  (SQL completo listo para copiar). Rama actual: **`feature/inventario-schema`**.
  **Todavía no implementado** — el `schema.sql` del repo y el de Supabase siguen
  siendo el modelo viejo. El fix del bug de RLS en `usuarios_perfil`
  (`auth.role() = 'authenticated'` → `auth.uid() = id`) quedó incluido en este
  mismo spec, no como algo aparte.
- **Siguiente paso concreto**: invocar `superpowers:writing-plans` sobre ese
  spec para armar el plan de implementación (probablemente: reemplazar
  `schema.sql`, correrlo en Supabase, recrear el usuario de prueba, y luego
  seguir con el CRUD de productos sobre el nuevo modelo).
- Nota: correr el nuevo `schema.sql` es "drop and recreate" — borra
  `usuarios_perfil` (no `auth.users`), hay que recrear la fila de perfil del
  usuario de prueba después.

## Variables de entorno necesarias (.env.local — no versionar)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```
Estas se obtienen del panel de Supabase (Project Settings → API) después de crear el proyecto.
