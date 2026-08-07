# Diseño: Tipo de afectación IGV por producto (v1)

## Contexto

Hoy el IGV se calcula parejo: `IGV_TASA = 0.18` fijo, aplicado sobre el
total completo de cualquier documento (cotización, orden de venta, orden de
compra, comprobante) en `src/lib/cotizaciones.ts` → `calcularImportes()`.
Esa función es la **única fuente de verdad** de importes en todo el ERP —
un comentario en el propio archivo documenta que hubo un bug real en
producción (COT-00004 vs F006-000002, diferencia de S/ 1,165.50) por tener
el cálculo duplicado/divergente entre pantallas antes del 2026-08-04. Todo
cambio de cálculo tiene que pasar por esa misma función, sin duplicar
lógica en ningún consumidor.

El usuario pidió remodelar el módulo de Productos; de las dos brechas que
identificó (fotos de producto, y clasificación tributaria), se decidió
priorizar esta — clasificación tributaria — por tocar dinero real, y dejar
la foto de producto como proyecto aparte (fuera de este spec).

**Hallazgo que sube la prioridad de esto:** la integración con NUBEFACT (OSE
real, conectado desde 2026-08-04 — ver nota corregida en `CLAUDE.md`, Fase
4) manda cada factura/boleta a SUNAT con `tipo_de_igv: 1` (Gravado) fijo
para **todos** los productos, sin excepción. Esto no es un detalle
cosmético para una integración futura: es un hueco de cumplimiento real
ahora mismo si algún producto exonerado/inafecto llegara a facturarse.

## Decisiones de diseño

### 1. Catálogo de afectación IGV: constante en código, subconjunto curado de 5 códigos

**Revisado 2026-08-07** — decisión inicial era el catálogo SUNAT completo
(~18 códigos); se descartó después de aclarar con el usuario qué significa
cada grupo y cómo funciona una "facturación gratuita" en la ley peruana
(un regalo/retiro de bienes SÍ genera IGV igual, salvo casos muy
específicos que no aplican a este negocio). El catálogo completo tenía
código para exportación/IVAP/muestras médicas/convenio colectivo que este
negocio nunca va a usar, y le faltaba visibilidad a los dos que sí importan
para regalos/promociones (bonificación y retiro por donación). Se queda un
subconjunto curado de 5 códigos, todos reales para este negocio:

| Código | Etiqueta | ¿Afecto a IGV? | Cuándo se usa |
|---|---|---|---|
| `10` | Gravado – Operación Onerosa | Sí (18%) | Default — venta normal, casi todo el inventario |
| `12` | Gravado – Retiro por donación | Sí (18%) | Regalo/donación pura de un producto (sin venta asociada) — igual genera IGV sobre el valor de mercado, la empresa lo asume |
| `15` | Gravado – Bonificaciones | Sí (18%) | Producto gratis ligado a una venta real (ej. "llévate 1 más por cada 10") |
| `20` | Exonerado – Operación Onerosa | No (0%) | Producto específicamente exonerado por ley (Apéndice I/II Ley del IGV) |
| `30` | Inafecto – Operación Onerosa | No (0%) | Operación fuera del alcance del IGV por naturaleza |

Nuevo archivo `src/lib/afectacion-igv.ts` con este catálogo curado, mismo
patrón que otros catálogos fijos del proyecto (`MEDIOS_PAGO`, `MONEDAS` en
`nueva-cotizacion-form.tsx`) — no una tabla nueva en Supabase. Si más
adelante el negocio necesita un código que no está en esta lista (ej.
empieza a exportar), se agrega al array — es una constante, no requiere
migración de esquema.

```ts
export type AfectacionIgv = {
  codigo: string        // código SUNAT, ej. '10'
  etiqueta: string       // ej. 'Gravado – Operación Onerosa'
  afectoIgv: boolean     // true = se extrae 18%, false = no aporta IGV
}
export const AFECTACIONES_IGV: AfectacionIgv[] = [
  { codigo: '10', etiqueta: 'Gravado – Operación Onerosa', afectoIgv: true },
  { codigo: '12', etiqueta: 'Gravado – Retiro por donación', afectoIgv: true },
  { codigo: '15', etiqueta: 'Gravado – Bonificaciones', afectoIgv: true },
  { codigo: '20', etiqueta: 'Exonerado – Operación Onerosa', afectoIgv: false },
  { codigo: '30', etiqueta: 'Inafecto – Operación Onerosa', afectoIgv: false },
]
export const AFECTACION_IGV_DEFAULT = '10' // Gravado – Operación Onerosa
```

### 2. Columna nueva en `productos`, con snapshot en cada línea de detalle

Migración `add-productos-tipo-afectacion-igv.sql`:

```sql
alter table productos
  add column if not exists tipo_afectacion_igv text not null default '10';

alter table detalle_cotizacion
  add column if not exists tipo_afectacion_igv text not null default '10';

alter table detalle_venta
  add column if not exists tipo_afectacion_igv text not null default '10';

alter table detalle_compra
  add column if not exists tipo_afectacion_igv text not null default '10';
```

Los ~140 productos existentes quedan automáticamente en `'10'` (Gravado
18%) — decisión explícita del usuario, es el caso real de casi todo el
inventario; los pocos que no lo sean se reclasifican a mano después desde
Editar producto.

**Snapshot en la línea, no solo FK al producto:** siguiendo el mismo patrón
que ya usa `unidad_nombre` en `detalle_cotizacion` (se copia el nombre de
la unidad al agregar la línea, para que un cambio posterior en el producto
no altere documentos ya emitidos), `tipo_afectacion_igv` se copia del
producto a la línea en el momento de agregarla. Si más adelante se
reclasifica un producto, las cotizaciones/ventas ya guardadas conservan la
clasificación con la que se calcularon originalmente.

### 3. Reescritura de `calcularImportes()` — cálculo por línea, no por documento

`src/lib/cotizaciones.ts` cambia de firma:

```ts
// Antes
calcularImportes(lineas: { cantidad: number; precio_unitario: number }[])

// Después
calcularImportes(lineas: { cantidad: number; precio_unitario: number; afectoIgv: boolean }[])
```

Lógica nueva: cada línea se procesa según `afectoIgv`:
- `afectoIgv = true` (Gravado, códigos 10–17): igual que hoy — el
  `precio_unitario` ya incluye IGV, se extrae hacia atrás
  (`valorVenta = precioUnitario / 1.18`).
- `afectoIgv = false` (Exonerado/Inafecto/Exportación): el `precio_unitario`
  es el valor final tal cual, sin nada que extraer (`igv = 0`).

`subtotal` y `total` del documento se siguen exponiendo igual que hoy
(suma de ambos grupos) — ningún consumidor que solo lea `{subtotal, igv,
total}` se entera del cambio interno. Para el caso 100%-gravado (el caso
normal, casi siempre), el resultado numérico es **idéntico byte a byte** al
cálculo actual — es lo que se usa como prueba de regresión manual (ver
sección de verificación).

### 4. Descuento global sobre líneas mixtas: reparto proporcional

Cuando una cotización mezcla líneas gravadas y no-gravadas y tiene un
descuento global (%, o monto fijo), el descuento se reparte entre ambos
grupos **proporcional al peso de cada grupo en el total antes de
descuento** — no se resta todo de un solo grupo. Confirmado con el usuario
con un ejemplo numérico (S/ 118 gravado + S/ 50 exonerado, descuento 10% →
se reparte 70/30, cada grupo re-deriva su propio IGV después de su parte
del descuento). Evita casos raros donde un descuento grande sobre un
documento mixto deje el IGV inconsistente.

`aplicarDescuento()` cambia para operar sobre los totales brutos **por
grupo** (gravado / no-gravado) en vez de sobre un total único, repartiendo
el descuento proporcional a cada uno antes de re-derivar IGV.

### 5. Formulario de producto: nuevo campo obligatorio

`producto-form.tsx` / `editar-producto-form.tsx`: nuevo `<select
name="tipo_afectacion_igv" required>` poblado desde `AFECTACIONES_IGV`,
preseleccionado en `AFECTACION_IGV_DEFAULT` ('10 - Gravado – Operación
Onerosa') para productos nuevos. Mismo estilo visual que los demás campos
del formulario (no cambia el layout general del módulo, solo agrega este
campo).

### 6. Cotizaciones/Ventas/Compras: transparente para el usuario

Al agregar un producto a una línea, el formulario copia automáticamente
`tipo_afectacion_igv` del producto seleccionado — el usuario no elige nada
manualmente ahí, es invisible en el flujo normal de armar un documento.

### 7. PDFs: sin cambio visual en el caso normal, desglose SUNAT si hay mezcla

`cotizacion-documento.tsx`, `cotizacion-ticket.tsx` y el equivalente de
comprobantes de venta: cuando **todas** las líneas del documento son
Gravadas (el caso normal, casi siempre), el documento se ve exactamente
igual que hoy — `Subtotal / IGV (18%) / Total`. Solo cuando hay una mezcla
real de grupos aparece el desglose estilo SUNAT: `Op. Gravada`, `Op.
Exonerada` (si > 0), `Op. Inafecta` (si > 0), `IGV`, `Total` — para no
meterle ruido visual a la inmensa mayoría de documentos que no lo
necesitan.

### 8. NUBEFACT: mapear el código real en vez de `tipo_de_igv: 1` fijo

`src/lib/nubefact.ts`: la línea que arma cada ítem para NUBEFACT deja de
usar `tipo_de_igv: 1` fijo y en su lugar mapea el `tipo_afectacion_igv`
guardado en la línea de `detalle_venta` al código numérico que espera la
API de NUBEFACT (que usa su propia numeración corta, no el código SUNAT de
2 dígitos directo — requiere una tabla de mapeo pequeña en el mismo
archivo). Esto cierra el hueco de cumplimiento real descrito en el
Contexto.

## Fuera de alcance (explícito)

- **Foto de producto** — proyecto aparte, spec propio más adelante.
- Catálogo SUNAT completo (~18 códigos) — se descartó a favor del
  subconjunto curado de 5 (ver Decisión 1). Códigos como exportación, IVAP,
  muestras médicas o retiro por convenio colectivo no aplican a este
  negocio; si algún día aplican, se agregan al array cuando haga falta.
- Cambiar cómo Compras calcula sus importes más allá de agregar la columna
  `tipo_afectacion_igv` a `detalle_compra` para mantener el esquema
  consistente — Compras no tiene el mismo concepto de documento final con
  desglose SUNAT que Cotizaciones/Ventas, así que su cálculo de totales no
  se toca en esta iteración salvo que surja necesidad concreta.
- Notas de crédito/débito: heredan el `tipo_afectacion_igv` de la línea
  original del comprobante que anulan/ajustan — no se agrega lógica nueva
  de clasificación ahí, solo se propaga lo ya guardado.
- Reclasificación masiva/asistida de los ~140 productos existentes más allá
  del default a Gravado — si el usuario identifica productos puntuales que
  deban ser Exonerados/Inafectos, los edita uno por uno desde Editar
  producto.

## Verificación (sin tests automatizados en este proyecto)

- `npx tsc --noEmit` y `npm run build`.
- Prueba manual: cotización con un producto Gravado y uno reclasificado
  temporalmente a Exonerado, con descuento — confirmar a mano que
  Subtotal/IGV/Total cuadran con el ejemplo numérico acordado (S/ 118 +
  S/ 50, descuento 10% → Total S/ 151.20).
- Regresión: abrir una cotización/venta **ya existente** (100% gravada, sin
  tocar) antes y después del cambio, confirmar que el total no varía ni un
  céntimo — es la misma clase de bug que ya pasó una vez con esta función.
