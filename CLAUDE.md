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

## Modelo de datos (ya definido en `schema.sql`)
- `zonas` — las 4 zonas del almacén (editable a futuro si se reorganiza la logística).
- `productos` — SKU maestro. **`cantidad` no se edita a mano nunca**: se recalcula automáticamente vía trigger cada vez que se inserta un registro en `movimientos`.
- `movimientos` — ledger de entradas/salidas/ajustes. Es la fuente de verdad para trazabilidad. Incluye `referencia`, pensado para más adelante enlazar pedidos que vengan del chatbot.
- `usuarios_perfil` — extiende `auth.users` de Supabase con un rol: `admin`, `almacen`, `ventas`.
- Vista `productos_stock_bajo` — productos con `cantidad <= punto_reorden`, para el módulo de alertas.

## Funcionalidad del MVP (en orden de prioridad)
1. Login con Supabase Auth (roles: admin, almacén, ventas).
2. CRUD de productos (crear, editar, eliminar, ver por zona).
3. Registrar movimientos (entrada/salida/ajuste) desde la UI — nunca editar `cantidad` directamente.
4. Dashboard con stock consolidado por producto y por zona.
5. Alertas de stock bajo (usando la vista `productos_stock_bajo`).
6. Historial/auditoría de movimientos por producto (quién, cuándo, cuánto, motivo).

## Prioridades de diseño
- Simplicidad de uso para personal no técnico (almaceneros, no desarrolladores).
- Proyecto de portafolio: la demo debe verse profesional para mostrar a futuros clientes.
- Todo en español: interfaz, mensajes, nombres de campos.

## Convenciones del proyecto
_(completar a medida que avance: comandos de build/test, estructura de carpetas, estilo de código — correr `/init` en Claude Code una vez que exista código para que lo complete automáticamente)_

## Variables de entorno necesarias (.env.local — no versionar)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```
Estas se obtienen del panel de Supabase (Project Settings → API) después de crear el proyecto.
