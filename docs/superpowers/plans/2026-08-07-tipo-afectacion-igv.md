# Tipo de afectación IGV por producto — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** cada producto tiene un tipo de afectación IGV real (Gravado/Exonerado/Inafecto/Bonificación/Donación); el cálculo de IGV en Cotizaciones, Ventas y Notas de Crédito pasa a ser por línea (no un 18% parejo sobre todo el documento); y el envío a NUBEFACT (SUNAT real) manda el código correcto por ítem en vez de "Gravado" fijo para todo.

**Architecture:** un catálogo curado de 5 códigos vive como constante en código (`src/lib/afectacion-igv.ts`). La única función de cálculo de importes del proyecto (`calcularImportes` en `src/lib/cotizaciones.ts`) se reescribe para agrupar líneas por afectación y derivar `subtotal/igv/total` más un desglose `opGravada/opExonerada/opInafecta`. Cada producto guarda su clasificación; cada línea de `detalle_cotizacion`/`detalle_venta`/`detalle_compra` congela una copia de esa clasificación al momento de agregarse (mismo patrón que ya usa `unidad_nombre`), así un documento ya emitido nunca cambia si el producto se reclasifica después.

**Tech Stack:** Next.js 16 (App Router) + TypeScript + Supabase (Postgres) + Tailwind v4. Sin framework de tests — verificación vía `npx tsc --noEmit`, `npm run build` y pruebas manuales en el navegador (convención ya establecida en este proyecto).

## Global Constraints

- Toda migración de esquema es un archivo nuevo `add-*.sql` en la raíz — nunca se edita `schema.sql` ni un `add-*.sql` ya existente. El usuario corre cada archivo a mano en el SQL Editor de Supabase; ningún paso de este plan ejecuta SQL directamente.
- `precio_unitario` en TODO el ERP significa "con IGV incluido" (convención fijada 2026-08-04) — nunca cambiar ese significado.
- El caso 100%-Gravado (código `10`, el default y el caso normal casi siempre) tiene que dar exactamente el mismo resultado numérico que antes del cambio — es la prueba de regresión obligatoria en cada tarea que toque cálculo.
- Sin tests automatizados — cada tarea termina con `npx tsc --noEmit` limpio y, cuando aplica, una verificación manual con números concretos en el navegador.
- Botones nuevos siguen el estilo ya establecido: `rounded-md`, sin hover-lift, `active:scale-95`.
- Commits frecuentes, uno por tarea, seteando el email `automatizacionia69@gmail.com`/identidad de git ya configurada en la máquina (no tocar `git config`).

---

## Task 1: Catálogo de afectación IGV

**Files:**
- Create: `src/lib/afectacion-igv.ts`

**Interfaces:**
- Produces: `AfectacionIgv` (type), `AFECTACIONES_IGV` (array), `AFECTACION_IGV_DEFAULT` (string `'10'`), `afectacionPorCodigo(codigo: string): AfectacionIgv` (function) — usados por todas las tareas siguientes.

- [ ] **Step 1: Crear el archivo del catálogo**

```ts
// src/lib/afectacion-igv.ts

/**
 * Catálogo de afectación IGV — subconjunto curado de 5 códigos del catálogo
 * oficial SUNAT N.° 07, elegido con el usuario tras descartar el catálogo
 * completo (~18 códigos: exportación/IVAP/muestras médicas/convenio
 * colectivo no aplican a este negocio). Si algún día hace falta un código
 * nuevo, se agrega a este array — es una constante, no requiere migración.
 *
 * `grupo` determina el balde en el que cae la línea para el desglose de
 * totales (Op. Gravada / Op. Exonerada / Op. Inafecta). `afectoIgv` decide
 * si esa línea aporta el 18% o no — ver src/lib/cotizaciones.ts.
 */
export type GrupoAfectacion = 'gravado' | 'exonerado' | 'inafecto'

export type AfectacionIgv = {
  codigo: string
  etiqueta: string
  grupo: GrupoAfectacion
  afectoIgv: boolean
}

export const AFECTACIONES_IGV: AfectacionIgv[] = [
  { codigo: '10', etiqueta: 'Gravado – Operación Onerosa', grupo: 'gravado', afectoIgv: true },
  { codigo: '12', etiqueta: 'Gravado – Retiro por donación', grupo: 'gravado', afectoIgv: true },
  { codigo: '15', etiqueta: 'Gravado – Bonificaciones', grupo: 'gravado', afectoIgv: true },
  { codigo: '20', etiqueta: 'Exonerado – Operación Onerosa', grupo: 'exonerado', afectoIgv: false },
  { codigo: '30', etiqueta: 'Inafecto – Operación Onerosa', grupo: 'inafecto', afectoIgv: false },
]

export const AFECTACION_IGV_DEFAULT = '10'

/** Nunca lanza — si el código no está en el catálogo (dato corrupto/viejo), cae a Gravado por seguridad. */
export function afectacionPorCodigo(codigo: string): AfectacionIgv {
  return AFECTACIONES_IGV.find((a) => a.codigo === codigo) ?? AFECTACIONES_IGV[0]
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores (archivo nuevo, sin consumidores todavía).

- [ ] **Step 3: Commit**

```bash
git add src/lib/afectacion-igv.ts
git commit -m "$(cat <<'EOF'
Agrega catalogo de afectacion IGV (5 codigos curados)

Base para clasificar cada producto (Gravado/Exonerado/Inafecto/
Bonificacion/Donacion) y calcular IGV por linea en vez de parejo.
EOF
)"
```

---

## Task 2: Migración de esquema

**Files:**
- Create: `add-productos-tipo-afectacion-igv.sql`

**Interfaces:**
- Consumes: nada (SQL puro).
- Produces: columna `tipo_afectacion_igv text not null default '10'` en `productos`, `detalle_cotizacion`, `detalle_venta`, `detalle_compra`.

- [ ] **Step 1: Escribir la migración**

```sql
-- add-productos-tipo-afectacion-igv.sql
-- ============================================================
-- Distribuidora LimpiezaPro — Tipo de afectación IGV por producto
-- Migración ADITIVA — no borra nada, segura de correr sobre datos reales.
-- Ejecutar en: Supabase → SQL Editor → New query
--
-- Códigos válidos (catálogo curado, ver src/lib/afectacion-igv.ts):
-- '10' Gravado-Operación Onerosa (default), '12' Gravado-Retiro por
-- donación, '15' Gravado-Bonificaciones, '20' Exonerado-Operación
-- Onerosa, '30' Inafecto-Operación Onerosa.
--
-- productos.tipo_afectacion_igv: clasificación vigente del producto, se
-- puede reclasificar en cualquier momento desde Editar producto.
--
-- detalle_cotizacion/detalle_venta/detalle_compra.tipo_afectacion_igv:
-- "foto" de esa clasificación al momento de agregar la línea — mismo
-- patrón que unidad_nombre (add-detalle-cotizacion-mejoras.sql). Si el
-- producto se reclasifica después, los documentos ya emitidos no cambian.
--
-- Los ~140 productos existentes quedan en '10' (Gravado 18%) automático
-- por el default — es el caso real de casi todo el inventario; decisión
-- explícita del usuario, ver docs/superpowers/specs/2026-08-07-tipo-
-- afectacion-igv-design.md.
-- ============================================================

alter table productos
  add column if not exists tipo_afectacion_igv text not null default '10';

alter table detalle_cotizacion
  add column if not exists tipo_afectacion_igv text not null default '10';

alter table detalle_venta
  add column if not exists tipo_afectacion_igv text not null default '10';

alter table detalle_compra
  add column if not exists tipo_afectacion_igv text not null default '10';
```

- [ ] **Step 2: Avisar al usuario para que la corra**

Este paso NO lo ejecuta el agente — Claude no tiene acceso de escritura DDL directo (convención del proyecto). Al llegar acá, avisar al usuario: "Corre `add-productos-tipo-afectacion-igv.sql` en el SQL Editor de Supabase antes de seguir — las tareas siguientes asumen que la columna ya existe."

- [ ] **Step 3: Verificar que corrió (antes de seguir a la Tarea 3)**

Run un script puntual `node -e` con `@supabase/supabase-js` y `SUPABASE_SERVICE_ROLE_KEY` de `.env.local` (mismo patrón que usa el resto del proyecto para verificar migraciones):

```bash
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from('productos').select('tipo_afectacion_igv').limit(1).then(({ data, error }) => {
  console.log(error ? 'FALTA CORRER LA MIGRACION: ' + error.message : 'OK: ' + JSON.stringify(data));
});
"
```

Expected: `OK: [...]` — si sale `FALTA CORRER LA MIGRACION`, detenerse y esperar a que el usuario la corra antes de avanzar.

- [ ] **Step 4: Commit**

```bash
git add add-productos-tipo-afectacion-igv.sql
git commit -m "$(cat <<'EOF'
Agrega columna tipo_afectacion_igv a productos y sus detalle_*

Default '10' (Gravado 18%) para los ~140 productos existentes. Snapshot
en cada linea de detalle_cotizacion/detalle_venta/detalle_compra, mismo
patron que unidad_nombre.
EOF
)"
```

---

## Task 3: Reescribir el motor de cálculo (`src/lib/cotizaciones.ts`)

Esta es la tarea de mayor riesgo — es la única fuente de verdad de importes de todo el ERP, con historial real de bug en producción por divergencia de cálculo (ver comentario en el archivo actual).

**Files:**
- Modify: `src/lib/cotizaciones.ts` (archivo completo — se reescribe)

**Interfaces:**
- Consumes: `afectacionPorCodigo` de `src/lib/afectacion-igv.ts` (Task 1).
- Produces: `calcularImportes(lineas: {cantidad, precio_unitario, tipo_afectacion_igv}[]): ImportesDocumento`, `aplicarDescuento(importesBrutos: ImportesDocumento, descuento: number): ImportesDocumento`, `ImportesDocumento` ahora con 3 campos nuevos: `opGravada`, `opExonerada`, `opInafecta`. `calcularDescuento` y `IGV_TASA` NO cambian de firma (siguen igual). Todas las tareas siguientes que llamen `calcularImportes` deben pasar `tipo_afectacion_igv` en cada línea.

- [ ] **Step 1: Reescribir el archivo completo**

```ts
// src/lib/cotizaciones.ts
import { afectacionPorCodigo } from './afectacion-igv'

export const IGV_TASA = 0.18

export interface ImportesDocumento {
  subtotal: number
  igv: number
  total: number
  /** Base gravada (sin IGV) — solo las líneas Gravado (10/12/15). */
  opGravada: number
  /** Suma de líneas Exonerado (20) — no aportan IGV. */
  opExonerada: number
  /** Suma de líneas Inafecto (30) — no aportan IGV. */
  opInafecta: number
}

/** Redondea a céntimos evitando el arrastre binario de los flotantes. */
function aCentimos(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100
}

/**
 * Única fuente de verdad para los importes de cualquier documento de venta
 * (cotización, orden de venta, comprobante, nota de crédito).
 *
 * Convención del proyecto (cambiada 2026-08-04): `precio_unitario` es SIEMPRE
 * el precio final CON IGV incluido para líneas Gravado — el mismo número
 * que ve y paga el cliente. El IGV se extrae hacia atrás, nunca se suma
 * encima.
 *
 * Agregado 2026-08-07: cada línea trae su propio `tipo_afectacion_igv`
 * (código SUNAT curado, ver src/lib/afectacion-igv.ts). Las líneas Gravado
 * extraen el 18% como siempre; las líneas Exonerado/Inafecto no aportan
 * IGV — su `precio_unitario` es el valor final tal cual, sin nada que
 * extraer. El caso 100%-Gravado (el normal, casi siempre) da EXACTAMENTE
 * el mismo resultado que la versión anterior de esta función — no tocar
 * esa invariante sin correr la prueba de regresión del plan.
 */
function importesDesdeGrupos(gravadaBruta: number, exoneradaBruta: number, inafectaBruta: number): ImportesDocumento {
  const gravadaRedondeada = aCentimos(gravadaBruta)
  const opGravada = aCentimos(gravadaRedondeada / (1 + IGV_TASA))
  // igv se deriva de gravadaRedondeada - opGravada (ya redondeados) para que
  // opGravada + igv === gravadaRedondeada exactamente, sin centimos huerfanos.
  const igv = aCentimos(gravadaRedondeada - opGravada)
  const opExonerada = aCentimos(exoneradaBruta)
  const opInafecta = aCentimos(inafectaBruta)
  const subtotal = aCentimos(opGravada + opExonerada + opInafecta)
  const total = aCentimos(subtotal + igv)
  return { subtotal, igv, total, opGravada, opExonerada, opInafecta }
}

export function calcularImportes(
  lineas: { cantidad: number; precio_unitario: number; tipo_afectacion_igv: string }[]
): ImportesDocumento {
  let gravadaBruta = 0
  let exoneradaBruta = 0
  let inafectaBruta = 0

  for (const l of lineas) {
    const monto = l.cantidad * l.precio_unitario
    const afectacion = afectacionPorCodigo(l.tipo_afectacion_igv)
    if (afectacion.grupo === 'exonerado') exoneradaBruta += monto
    else if (afectacion.grupo === 'inafecto') inafectaBruta += monto
    else gravadaBruta += monto
  }

  return importesDesdeGrupos(gravadaBruta, exoneradaBruta, inafectaBruta)
}

export type DescuentoTipo = 'porcentaje' | 'monto'

/**
 * Descuento global de una cotizacion — hoy solo lo usa ese modulo, Ventas y
 * Compras no tienen este concepto (por eso no vive dentro de
 * calcularImportes, para no cambiarles el calculo a ellos).
 */
export function calcularDescuento(
  total: number,
  tipo: DescuentoTipo | null,
  valor: number
): number {
  if (!tipo || !valor || valor <= 0) return 0
  const bruto = tipo === 'porcentaje' ? (total * valor) / 100 : valor
  return Math.min(aCentimos(bruto), total)
}

/**
 * Aplica un descuento ya calculado (ver `calcularDescuento`) sobre los
 * importes brutos. Reparto PROPORCIONAL entre los 3 grupos según su peso
 * en el total bruto (decisión confirmada con el usuario con un ejemplo
 * numérico: S/118 gravado + S/50 exonerado, descuento 10% → factor 0.9
 * aplicado a ambos grupos por igual, cada uno re-deriva su propio IGV
 * después). Evita que un descuento grande sobre un documento mixto deje
 * el IGV inconsistente.
 */
export function aplicarDescuento(importesBrutos: ImportesDocumento, descuento: number): ImportesDocumento {
  if (descuento <= 0) return importesBrutos

  const gravadaBruta = importesBrutos.opGravada + importesBrutos.igv
  const exoneradaBruta = importesBrutos.opExonerada
  const inafectaBruta = importesBrutos.opInafecta
  const totalBruto = gravadaBruta + exoneradaBruta + inafectaBruta

  if (totalBruto <= 0) return importesBrutos

  const factor = Math.max(0, totalBruto - descuento) / totalBruto
  return importesDesdeGrupos(gravadaBruta * factor, exoneradaBruta * factor, inafectaBruta * factor)
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: **errores** en todos los archivos que llaman `calcularImportes`/`aplicarDescuento` sin pasar `tipo_afectacion_igv` — es esperado en este punto, se resuelven en las tareas siguientes. Confirmar que los errores son justo por eso (falta la propiedad `tipo_afectacion_igv`), no por otra cosa.

- [ ] **Step 3: Prueba de regresión manual con node (antes de tocar la UI)**

```bash
node -e "
const { calcularImportes, aplicarDescuento, calcularDescuento } = require('./src/lib/cotizaciones.ts');
" 2>&1 || echo "Node no ejecuta TS directo — verificar con el siguiente bloque en su lugar"
```

Como el proyecto no tiene runner de TS suelto, verificar la lógica con un script temporal:

```bash
cat > /tmp/verificar-igv.mjs <<'EOF'
function aCentimos(v) { return Math.round((v + Number.EPSILON) * 100) / 100 }
const IGV_TASA = 0.18
function importesDesdeGrupos(g, e, i) {
  const gr = aCentimos(g)
  const opG = aCentimos(gr / (1 + IGV_TASA))
  const igv = aCentimos(gr - opG)
  const opE = aCentimos(e)
  const opI = aCentimos(i)
  const subtotal = aCentimos(opG + opE + opI)
  const total = aCentimos(subtotal + igv)
  return { subtotal, igv, total, opGravada: opG, opExonerada: opE, opInafecta: opI }
}
// Caso 1: 100% gravado, sin mezcla — debe dar lo mismo que el calculo viejo.
const soloGravado = importesDesdeGrupos(236, 0, 0) // 2 items x S/118
console.log('Solo gravado (S/236 bruto):', soloGravado)
// Esperado: subtotal=200, igv=36, total=236

// Caso 2: mixto con descuento — el ejemplo acordado con el usuario.
const bruto = importesDesdeGrupos(118, 50, 0)
console.log('Bruto mixto:', bruto) // opGravada=100, igv=18, opExonerada=50, subtotal=150, total=168
const factor = (168 - 16.80) / 168
const conDescuento = importesDesdeGrupos(118 * factor, 50 * factor, 0)
console.log('Con descuento 10%:', conDescuento)
// Esperado: total=151.20 (168 - 16.80 exacto)
EOF
node /tmp/verificar-igv.mjs
```

Expected:
```
Solo gravado (S/236 bruto): { subtotal: 200, igv: 36, total: 236, opGravada: 200, opExonerada: 0, opInafecta: 0 }
Bruto mixto: { subtotal: 150, igv: 18, total: 168, opGravada: 100, opExonerada: 50, opInafecta: 0 }
Con descuento 10%: { subtotal: 135, igv: 16.2, total: 151.2, opGravada: 90, opExonerada: 45, opInafecta: 0 }
```

Si algún número no coincide, no seguir a la Tarea 4 — revisar la fórmula.

- [ ] **Step 4: Commit**

```bash
git add src/lib/cotizaciones.ts
git commit -m "$(cat <<'EOF'
Reescribe calcularImportes para calcular IGV por linea, no por documento

Cada linea aporta IGV segun su tipo_afectacion_igv (Gravado 18%,
Exonerado/Inafecto 0%). ImportesDocumento gana opGravada/opExonerada/
opInafecta para el desglose SUNAT en el PDF. Descuento global se reparte
proporcional entre grupos. Rompe la firma de calcularImportes/
aplicarDescuento a proposito (todos los consumidores se actualizan en
las tareas siguientes de este mismo plan) - no es un estado intermedio
para dejar mergeado solo.
EOF
)"
```

---

## Task 4: Formulario de Producto (alta y edición)

**Files:**
- Modify: `src/app/(protected)/productos/nuevo/producto-form.tsx`
- Modify: `src/app/(protected)/productos/actions.ts`
- Modify: `src/app/(protected)/productos/[id]/editar/editar-producto-form.tsx`
- Modify: `src/app/(protected)/productos/[id]/editar/page.tsx`

**Interfaces:**
- Consumes: `AFECTACIONES_IGV`, `AFECTACION_IGV_DEFAULT` de `src/lib/afectacion-igv.ts` (Task 1).
- Produces: `productos.tipo_afectacion_igv` se guarda al crear/editar un producto.

- [ ] **Step 1: Agregar el campo al formulario de alta**

En `src/app/(protected)/productos/nuevo/producto-form.tsx`, agregar el import y el `<select>`:

```ts
import { AFECTACIONES_IGV, AFECTACION_IGV_DEFAULT } from '@/lib/afectacion-igv'
```

Insertar este bloque justo después del div de "Cód. fabricante" (antes de "Unidad *"):

```tsx
        <div>
          <label className={LABEL}>Tipo de afectación IGV *</label>
          <select
            name="tipo_afectacion_igv"
            required
            defaultValue={AFECTACION_IGV_DEFAULT}
            className={CAMPO}
          >
            {AFECTACIONES_IGV.map((a) => (
              <option key={a.codigo} value={a.codigo} className="text-[#1e293b] dark:text-slate-100">
                {a.etiqueta}
              </option>
            ))}
          </select>
        </div>
```

- [ ] **Step 2: Persistir el campo al crear**

En `src/app/(protected)/productos/actions.ts`, dentro de `crearProducto`, después de la línea `const puntoReorden = formData.get('punto_reorden') as string`:

```ts
  const tipoAfectacionIgv = (formData.get('tipo_afectacion_igv') as string) || AFECTACION_IGV_DEFAULT
```

Agregar el import al inicio del archivo:

```ts
import { AFECTACIONES_IGV, AFECTACION_IGV_DEFAULT } from '@/lib/afectacion-igv'
```

Agregar esta validación después de la validación de `unidadId`:

```ts
  if (!AFECTACIONES_IGV.some((a) => a.codigo === tipoAfectacionIgv)) {
    return { error: 'Tipo de afectación IGV inválido.' }
  }
```

Y en el `.insert({...})` de `crearProducto`, agregar la propiedad:

```ts
    tipo_afectacion_igv: tipoAfectacionIgv,
```

(mismo bloque, junto a `codigo_barras: campos.codigoBarras,` por ejemplo).

- [ ] **Step 3: Repetir en `editarProducto`**

Misma función `validarCamposCodigo`-style: dentro de `editarProducto`, después de leer `puntoReorden`:

```ts
  const tipoAfectacionIgv = (formData.get('tipo_afectacion_igv') as string) || AFECTACION_IGV_DEFAULT
```

Misma validación que en Step 2 (después de validar `unidadId`), y agregar `tipo_afectacion_igv: tipoAfectacionIgv,` al `.update({...})`.

- [ ] **Step 4: Traer la columna en la página de editar**

En `src/app/(protected)/productos/[id]/editar/page.tsx`, en el `.select(...)` de `productos`, agregar `tipo_afectacion_igv` a la lista de columnas:

```ts
        .select(
          'id, nombre, codigo, sku, codigo_barras, marca, unidad_id, categoria_id, zona_id, precio_venta, punto_reorden, tipo_afectacion_igv'
        )
```

- [ ] **Step 5: Agregar el campo al formulario de edición**

En `src/app/(protected)/productos/[id]/editar/editar-producto-form.tsx`:

Agregar el import:

```ts
import { AFECTACIONES_IGV } from '@/lib/afectacion-igv'
```

Agregar `tipo_afectacion_igv: string` al `type Producto`.

Insertar este bloque después del div de "Cód. fabricante" (antes de "Unidad *"), mismo lugar que en el formulario de alta:

```tsx
        <div>
          <label className={LABEL}>Tipo de afectación IGV *</label>
          <select
            name="tipo_afectacion_igv"
            required
            defaultValue={producto.tipo_afectacion_igv}
            className={CAMPO}
          >
            {AFECTACIONES_IGV.map((a) => (
              <option key={a.codigo} value={a.codigo} className="text-[#1e293b] dark:text-slate-100">
                {a.etiqueta}
              </option>
            ))}
          </select>
        </div>
```

- [ ] **Step 6: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos en estos 4 archivos (los errores de `calcularImportes` de la Tarea 3 en OTROS archivos siguen presentes hasta las tareas correspondientes, ignorarlos por ahora).

- [ ] **Step 7: Prueba manual en el navegador**

```bash
npm run dev
```

1. Ir a `/productos/nuevo` — confirmar que aparece el select "Tipo de afectación IGV *" con "Gravado – Operación Onerosa" preseleccionado, entre "Cód. fabricante" y "Unidad".
2. Crear un producto de prueba, dejando el default.
3. Ir a `/productos/[id]/editar` de ese producto — confirmar que el select carga con "Gravado – Operación Onerosa" seleccionado, cambiarlo a "Exonerado – Operación Onerosa" y guardar.
4. Volver a entrar a editar ese mismo producto — confirmar que quedó guardado como Exonerado (no se resetea a Gravado).
5. Volver a poner ese producto de prueba en Gravado antes de seguir (para no ensuciar las pruebas de las tareas siguientes).

- [ ] **Step 8: Commit**

```bash
git add src/app/\(protected\)/productos
git commit -m "$(cat <<'EOF'
Agrega Tipo de afectacion IGV al formulario de producto (alta y edicion)

Select obligatorio, default Gravado - Operacion Onerosa para productos
nuevos. Los ~140 productos existentes ya quedaron en ese default por la
migracion de la tarea anterior.
EOF
)"
```

---

## Task 5: Cotizaciones — formulario, actions y edición

**Files:**
- Modify: `src/app/(protected)/cotizaciones/nueva/page.tsx`
- Modify: `src/app/(protected)/cotizaciones/nueva/nueva-cotizacion-form.tsx`
- Modify: `src/app/(protected)/cotizaciones/actions.ts`
- Modify: `src/app/(protected)/cotizaciones/[id]/editar/page.tsx`

**Interfaces:**
- Consumes: `afectacionPorCodigo`, `AFECTACION_IGV_DEFAULT` de Task 1; `calcularImportes`/`aplicarDescuento` nueva firma de Task 3.
- Produces: `detalle_cotizacion.tipo_afectacion_igv` se guarda al crear/editar/duplicar una cotización; `crearFacturaDesdeCotizacion` propaga el valor a `detalle_venta`.

- [ ] **Step 1: Traer la clasificación del producto en la página**

En `src/app/(protected)/cotizaciones/nueva/page.tsx`, cambiar:

```ts
        .select('id, nombre, codigo, cantidad, precio_venta, unidades_medida(nombre)')
```

por:

```ts
        .select('id, nombre, codigo, cantidad, precio_venta, tipo_afectacion_igv, unidades_medida(nombre)')
```

- [ ] **Step 2: Actualizar tipos y snapshot en el formulario cliente**

En `src/app/(protected)/cotizaciones/nueva/nueva-cotizacion-form.tsx`:

Cambiar el `type Producto`:

```ts
type Producto = {
  id: number
  nombre: string
  codigo: string | null
  cantidad: number
  precio_venta: number | null
  tipo_afectacion_igv: string
  unidades_medida: { nombre: string } | null
}
```

Cambiar el `type Linea` (agregar el campo, junto a `unidad_nombre`):

```ts
type Linea = {
  producto_id: number | ''
  cantidad: number | ''
  precio_unitario: number | ''
  caracteristicas: string
  fecha_entrega: string
  unidad_nombre: string
  tipo_afectacion_igv: string
}
```

En `actualizarProductoLinea`, agregar la línea del snapshot (junto a `unidad_nombre`):

```ts
  function actualizarProductoLinea(i: number, productoId: number | string | '') {
    setLineas((prev) =>
      prev.map((l, idx) => {
        if (idx !== i) return l
        const producto = productos.find((p) => p.id === Number(productoId))
        return {
          ...l,
          producto_id: Number(productoId) || '',
          precio_unitario: producto?.precio_venta ?? l.precio_unitario,
          unidad_nombre: producto?.unidades_medida?.nombre ?? l.unidad_nombre,
          tipo_afectacion_igv: producto?.tipo_afectacion_igv ?? l.tipo_afectacion_igv,
        }
      })
    )
  }
```

En `agregarProductoDesdeBuscador`, agregar la misma propiedad al objeto de línea nueva:

```ts
  function agregarProductoDesdeBuscador(productoId: number | string | '') {
    const id = Number(productoId)
    if (!id) return
    const producto = productos.find((p) => p.id === id)
    setLineas((prev) => [
      ...prev,
      {
        producto_id: id,
        cantidad: 1,
        precio_unitario: producto?.precio_venta ?? '',
        caracteristicas: '',
        fecha_entrega: hoyPeruISO(),
        unidad_nombre: producto?.unidades_medida?.nombre ?? '',
        tipo_afectacion_igv: producto?.tipo_afectacion_igv ?? AFECTACION_IGV_DEFAULT,
      },
    ])
    setProductoParaAgregar('')
  }
```

Agregar el import de `AFECTACION_IGV_DEFAULT`:

```ts
import { AFECTACION_IGV_DEFAULT } from '@/lib/afectacion-igv'
```

- [ ] **Step 3: Actualizar los 3 usos de `calcularImportes`/`aplicarDescuento`**

Cambiar:

```ts
  const importesBrutos = useMemo(
    () =>
      calcularImportes(
        lineasValidas.map((l) => ({
          cantidad: Number(l.cantidad),
          precio_unitario: Number(l.precio_unitario) || 0,
        }))
      ),
    [lineasValidas]
  )
```

por:

```ts
  const importesBrutos = useMemo(
    () =>
      calcularImportes(
        lineasValidas.map((l) => ({
          cantidad: Number(l.cantidad),
          precio_unitario: Number(l.precio_unitario) || 0,
          tipo_afectacion_igv: l.tipo_afectacion_igv,
        }))
      ),
    [lineasValidas]
  )
```

Las líneas de `descuentoMonto`/`{ subtotal, igv, total }` que le siguen NO cambian (siguen leyendo de `importesBrutos`/`aplicarDescuento` igual que hoy — la nueva firma de `aplicarDescuento` es transparente para quien solo lee `subtotal/igv/total`).

- [ ] **Step 4: Incluir el campo en el JSON que se manda al server**

Cambiar:

```ts
  const lineasJson = JSON.stringify(
    lineasValidas.map((l) => ({
      producto_id: Number(l.producto_id),
      cantidad: Number(l.cantidad),
      precio_unitario: Number(l.precio_unitario) || 0,
      caracteristicas: l.caracteristicas || null,
      fecha_entrega: l.fecha_entrega || null,
      unidad_nombre: l.unidad_nombre || null,
    }))
  )
```

por:

```ts
  const lineasJson = JSON.stringify(
    lineasValidas.map((l) => ({
      producto_id: Number(l.producto_id),
      cantidad: Number(l.cantidad),
      precio_unitario: Number(l.precio_unitario) || 0,
      caracteristicas: l.caracteristicas || null,
      fecha_entrega: l.fecha_entrega || null,
      unidad_nombre: l.unidad_nombre || null,
      tipo_afectacion_igv: l.tipo_afectacion_igv || AFECTACION_IGV_DEFAULT,
    }))
  )
```

- [ ] **Step 5: Pasar el desglose a la vista previa del documento**

Buscar el `<CotizacionDocumento ... vigenciaDias={...} />` (dos apariciones: la vista previa del modal de "Vista previa" y el modal de éxito) y agregar las 3 props nuevas junto a `subtotal`/`igv`/`total`:

```tsx
          subtotal={subtotal}
          igv={igv}
          opGravada={importesBrutos.opGravada}
          opExonerada={aplicarDescuento(importesBrutos, descuentoMonto).opExonerada}
          opInafecta={aplicarDescuento(importesBrutos, descuentoMonto).opInafecta}
```

Nota: como `{ subtotal, igv, total }` ya viene de `aplicarDescuento(importesBrutos, descuentoMonto)` vía el `useMemo` existente, en vez de llamar `aplicarDescuento` de nuevo acá conviene extraer también `opGravada`/`opExonerada`/`opInafecta` del mismo resultado. Cambiar el `useMemo` del Step 3 (variable `{ subtotal, igv, total }`) para traer el objeto completo:

```ts
  const importesFinales = useMemo(
    () => aplicarDescuento(importesBrutos, descuentoMonto),
    [importesBrutos, descuentoMonto]
  )
  const { subtotal, igv, total, opGravada, opExonerada, opInafecta } = importesFinales
```

(reemplaza la desestructuración `const { subtotal, igv, total } = useMemo(...)` existente). Y en las dos apariciones de `<CotizacionDocumento>`, usar directamente:

```tsx
          opGravada={opGravada}
          opExonerada={opExonerada}
          opInafecta={opInafecta}
```

- [ ] **Step 6: `CotizacionExistente` — precargar en modo edición**

En el `type CotizacionExistente` y el `type Linea` de este mismo archivo, ya se actualizó `Linea` en el Step 2 (incluye `tipo_afectacion_igv`) — `CotizacionExistente.lineas: Linea[]` hereda el cambio automáticamente, no requiere edición adicional acá. La página `[id]/editar/page.tsx` es la que arma ese objeto — ver Step 9.

- [ ] **Step 7: `cotizaciones/actions.ts` — validar y guardar**

Agregar el import:

```ts
import { AFECTACIONES_IGV, AFECTACION_IGV_DEFAULT } from '@/lib/afectacion-igv'
```

Cambiar `type Linea`:

```ts
type Linea = {
  producto_id: number
  cantidad: number
  precio_unitario: number
  caracteristicas?: string | null
  fecha_entrega?: string | null
  unidad_nombre?: string | null
  tipo_afectacion_igv: string
}
```

Dentro de `parsearYValidarCotizacion`, después de `lineas = lineas.filter((l) => l.producto_id && l.cantidad > 0)`, agregar:

```ts
  lineas = lineas.map((l) => ({
    ...l,
    tipo_afectacion_igv: AFECTACIONES_IGV.some((a) => a.codigo === l.tipo_afectacion_igv)
      ? l.tipo_afectacion_igv
      : AFECTACION_IGV_DEFAULT,
  }))
```

(esto evita que un payload manipulado o un dato viejo sin el campo rompa el cálculo — cae al default en vez de fallar).

La línea `const importesBrutos = calcularImportes(lineas)` NO cambia de sintaxis (ya recibe objetos con `tipo_afectacion_igv` gracias al `.map` de arriba, y el tipo `Linea` ya lo declara) — `tsc` debe quedar limpio en este punto.

- [ ] **Step 8: Guardar el campo en los inserts de `detalle_cotizacion`**

En `crearCotizacion`, `actualizarCotizacion` y `duplicarCotizacion` hay 3 `.insert(d.lineas.map(...))`/`.insert(detalles.map(...))` a `detalle_cotizacion`. Agregar `tipo_afectacion_igv: l.tipo_afectacion_igv,` a los 2 primeros (en `crearCotizacion` y `actualizarCotizacion`, mismo bloque que ya tiene `unidad_nombre: l.unidad_nombre || null,`).

En `duplicarCotizacion`, el `.select(...)` de `detalle_cotizacion` (línea con `'producto_id, cantidad, precio_unitario, caracteristicas, fecha_entrega, unidad_nombre'`) pasa a:

```ts
    .select('producto_id, cantidad, precio_unitario, caracteristicas, fecha_entrega, unidad_nombre, tipo_afectacion_igv')
```

y el `.insert(detalles.map((l) => ({...})))` que sigue agrega `tipo_afectacion_igv: l.tipo_afectacion_igv,` junto a `unidad_nombre: l.unidad_nombre,`.

- [ ] **Step 9: Propagar a la venta cuando se convierte la cotización**

En `crearFacturaDesdeCotizacion`, el `.select('producto_id, cantidad, precio_unitario')` de `detalle_cotizacion` pasa a:

```ts
    .select('producto_id, cantidad, precio_unitario, tipo_afectacion_igv')
```

y el `.insert(detalles.map((d) => ({...})))` hacia `detalle_venta` agrega `tipo_afectacion_igv: d.tipo_afectacion_igv,`.

- [ ] **Step 10: Cargar el campo al editar una cotización existente**

En `src/app/(protected)/cotizaciones/[id]/editar/page.tsx`, buscar el `.select(...)` de `detalle_cotizacion` (o de donde se arme `lineas` para `CotizacionExistente`) y agregar `tipo_afectacion_igv` a la lista de columnas, y `tipo_afectacion_igv: d.tipo_afectacion_igv,` (o el nombre de variable que use ese archivo) al mapeo que arma cada `Linea`.

- [ ] **Step 11: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores en el módulo de Cotizaciones (los de Ventas/Compras/Notas de crédito siguen pendientes hasta sus tareas).

- [ ] **Step 12: Prueba manual — caso normal (regresión)**

1. `npm run dev`, ir a `/cotizaciones/nueva`.
2. Armar una cotización con 2 productos normales (Gravado, el default), ver la Vista previa.
3. Confirmar que Subtotal/IGV(18%)/Total dan los mismos números que antes del cambio (ej. 2 items de S/100 c/u con IGV incluido → Subtotal S/169.49, IGV S/30.51, Total S/200.00 — cualquier cotización vieja ya emitida sirve de referencia, comparar contra una que ya exista).
4. Guardar, confirmar que el modal de éxito muestra los mismos 3 números.

- [ ] **Step 13: Prueba manual — caso mixto**

1. En `/productos`, editar temporalmente un producto de prueba a "Exonerado – Operación Onerosa".
2. Crear una cotización con ese producto + uno Gravado normal.
3. Confirmar en la Vista previa que Subtotal/IGV/Total cuadran a mano (ver fórmula del Step 3 de la Tarea 3).
4. Volver a poner ese producto en Gravado antes de seguir.

- [ ] **Step 14: Commit**

```bash
git add src/app/\(protected\)/cotizaciones
git commit -m "$(cat <<'EOF'
Cotizaciones: IGV por linea segun tipo_afectacion_igv del producto

Snapshot del codigo en cada linea al agregarla (igual que unidad_nombre).
crearFacturaDesdeCotizacion propaga el codigo a detalle_venta. Vista
previa muestra el desglose opGravada/opExonerada/opInafecta.
EOF
)"
```

---

## Task 6: `cotizacion-documento-datos.ts` — desglose para el PDF de una cotización guardada

**Files:**
- Modify: `src/lib/cotizacion-documento-datos.ts`

**Interfaces:**
- Consumes: `calcularImportes` de Task 3.
- Produces: `DatosDocumentoCotizacion` gana `opGravada`, `opExonerada`, `opInafecta`.

- [ ] **Step 1: Traer `tipo_afectacion_igv` en el select de detalles**

Cambiar:

```ts
    supabase
      .from('detalle_cotizacion')
      .select('id, cantidad, precio_unitario, caracteristicas, unidad_nombre, productos(nombre, codigo, unidades_medida(nombre))')
      .eq('cotizacion_id', id)
      .returns<DetalleRow[]>(),
```

por:

```ts
    supabase
      .from('detalle_cotizacion')
      .select('id, cantidad, precio_unitario, caracteristicas, unidad_nombre, tipo_afectacion_igv, productos(nombre, codigo, unidades_medida(nombre))')
      .eq('cotizacion_id', id)
      .returns<DetalleRow[]>(),
```

y agregar `tipo_afectacion_igv: string` al `type DetalleRow`.

- [ ] **Step 2: Calcular el desglose y agregarlo al tipo de retorno**

Agregar el import:

```ts
import { calcularImportes } from '@/lib/cotizaciones'
```

Agregar 3 campos al `type DatosDocumentoCotizacion` (junto a `vigenciaDias`):

```ts
  opGravada: number
  opExonerada: number
  opInafecta: number
```

Dentro de `obtenerDatosDocumentoCotizacion`, antes del `return {...}`, agregar:

```ts
  const { opGravada, opExonerada, opInafecta } = calcularImportes(
    (detalles ?? []).map((d) => ({
      cantidad: Number(d.cantidad),
      precio_unitario: Number(d.precio_unitario),
      tipo_afectacion_igv: d.tipo_afectacion_igv,
    }))
  )
```

Nota: esto recalcula el bruto SIN descuento — para reflejar el desglose ya con el descuento aplicado (igual que `subtotal`/`igv` que sí vienen de la cotización guardada, post-descuento), aplicar el mismo factor proporcional que ya se guardó: como `cotizacion.descuento_monto` es el monto en soles ya aplicado, usar:

```ts
  const bruto = calcularImportes(
    (detalles ?? []).map((d) => ({
      cantidad: Number(d.cantidad),
      precio_unitario: Number(d.precio_unitario),
      tipo_afectacion_igv: d.tipo_afectacion_igv,
    }))
  )
  const { opGravada, opExonerada, opInafecta } = aplicarDescuento(bruto, Number(cotizacion.descuento_monto ?? 0))
```

(agregar `aplicarDescuento` al import del Step anterior: `import { calcularImportes, aplicarDescuento } from '@/lib/cotizaciones'`).

Y agregar `opGravada, opExonerada, opInafecta,` al objeto que se retorna (junto a `vigenciaDias: cotizacion.vigencia_dias,`).

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: error en `cotizaciones-tabla.tsx` y `cotizaciones/[id]/page.tsx` porque `<CotizacionDocumento {...vistaDatos} />` ahora recibe props que el componente todavía no declara — se resuelve en la Tarea 7. Confirmar que no hay OTROS errores nuevos.

- [ ] **Step 4: Commit**

```bash
git add src/lib/cotizacion-documento-datos.ts
git commit -m "Cotizaciones: calcula desglose opGravada/opExonerada/opInafecta para el PDF guardado"
```

---

## Task 7: PDFs de Cotización — desglose SUNAT cuando hay mezcla

**Files:**
- Modify: `src/components/cotizacion-documento.tsx`
- Modify: `src/components/cotizacion-ticket.tsx`

**Interfaces:**
- Consumes: `opGravada`/`opExonerada`/`opInafecta` (de Task 5 y Task 6).
- Produces: ninguna nueva (componentes hoja, consumidos por Tasks 5/6/8).

- [ ] **Step 1: `cotizacion-documento.tsx` — agregar las props**

Agregar a la desestructuración de props y al bloque de tipos (junto a `subtotal`/`igv`):

```ts
  opGravada,
  opExonerada,
  opInafecta,
```

```ts
  opGravada: number
  opExonerada: number
  opInafecta: number
```

- [ ] **Step 2: Renderizar el desglose condicional**

Reemplazar el bloque de totales:

```tsx
        <div className="space-y-1.5 rounded-xl border border-[#e2e8f0] dark:border-slate-700 p-3">
          <p className="flex justify-between text-xs">
            <span className="text-[#64748b] dark:text-slate-400">Sub total</span>
            <span className="font-semibold text-[#1e293b] dark:text-slate-100">{simbolo} {subtotal.toFixed(2)}</span>
          </p>
          <p className="flex justify-between text-xs">
            <span className="text-[#64748b] dark:text-slate-400">IGV (18%)</span>
            <span className="font-semibold text-[#1e293b] dark:text-slate-100">{simbolo} {igv.toFixed(2)}</span>
          </p>
```

por:

```tsx
        <div className="space-y-1.5 rounded-xl border border-[#e2e8f0] dark:border-slate-700 p-3">
          {(opExonerada > 0 || opInafecta > 0) ? (
            <>
              {opGravada > 0 && (
                <p className="flex justify-between text-xs">
                  <span className="text-[#64748b] dark:text-slate-400">Op. Gravada</span>
                  <span className="font-semibold text-[#1e293b] dark:text-slate-100">{simbolo} {opGravada.toFixed(2)}</span>
                </p>
              )}
              {opExonerada > 0 && (
                <p className="flex justify-between text-xs">
                  <span className="text-[#64748b] dark:text-slate-400">Op. Exonerada</span>
                  <span className="font-semibold text-[#1e293b] dark:text-slate-100">{simbolo} {opExonerada.toFixed(2)}</span>
                </p>
              )}
              {opInafecta > 0 && (
                <p className="flex justify-between text-xs">
                  <span className="text-[#64748b] dark:text-slate-400">Op. Inafecta</span>
                  <span className="font-semibold text-[#1e293b] dark:text-slate-100">{simbolo} {opInafecta.toFixed(2)}</span>
                </p>
              )}
              <p className="flex justify-between text-xs">
                <span className="text-[#64748b] dark:text-slate-400">IGV (18%)</span>
                <span className="font-semibold text-[#1e293b] dark:text-slate-100">{simbolo} {igv.toFixed(2)}</span>
              </p>
            </>
          ) : (
            <>
              <p className="flex justify-between text-xs">
                <span className="text-[#64748b] dark:text-slate-400">Sub total</span>
                <span className="font-semibold text-[#1e293b] dark:text-slate-100">{simbolo} {subtotal.toFixed(2)}</span>
              </p>
              <p className="flex justify-between text-xs">
                <span className="text-[#64748b] dark:text-slate-400">IGV (18%)</span>
                <span className="font-semibold text-[#1e293b] dark:text-slate-100">{simbolo} {igv.toFixed(2)}</span>
              </p>
            </>
          )}
```

(el resto del bloque — descuento y total — sigue exactamente igual, no se toca).

- [ ] **Step 3: Mismo tratamiento en `cotizacion-ticket.tsx`**

Leer el archivo primero para ubicar el bloque equivalente (líneas ~90-105 según la exploración previa, con `subtotal`/`igv` mostrados). Aplicar el mismo patrón condicional que en el Step 2, agregando `opGravada`/`opExonerada`/`opInafecta` a props y tipos igual que el Step 1. El ticket es más angosto (80mm) — usar el mismo estilo de línea que ya usa el resto del ticket para Subtotal/IGV, solo agregando las líneas condicionales de Op. Exonerada/Inafecta cuando corresponda.

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores en estos 2 componentes. Pueden persistir errores en `nueva-cotizacion-form.tsx`/`cotizaciones-tabla.tsx`/`[id]/page.tsx` SOLO si el Step 5 de la Tarea 5 no pasó las props nuevas correctamente — si aparecen, volver a la Tarea 5.

- [ ] **Step 5: Prueba manual**

1. Cotización 100% gravada (normal): confirmar que el PDF se ve **exactamente igual que antes** — "Sub total" / "IGV (18%)", sin las etiquetas "Op. Gravada" etc.
2. Cotización mixta (usar el producto de prueba en Exonerado de la Tarea 5): confirmar que aparece "Op. Gravada", "Op. Exonerada", "IGV (18%)", "Total" — sin "Sub total" genérico.
3. Repetir en el formato Ticket 80mm (botón "Ticket 80mm" en el modal de éxito o en "Ver/descargar PDF").

- [ ] **Step 6: Commit**

```bash
git add src/components/cotizacion-documento.tsx src/components/cotizacion-ticket.tsx
git commit -m "$(cat <<'EOF'
PDF de cotizacion: desglose Op. Gravada/Exonerada/Inafecta si hay mezcla

Sin cambio visual en el caso normal (100% gravado) - el desglose SUNAT
solo aparece cuando el documento mezcla grupos de afectacion IGV.
EOF
)"
```

---

## Task 8: Ventas — orden de venta, facturación y selects

**Files:**
- Modify: `src/app/(protected)/ventas/nueva/page.tsx`
- Modify: `src/app/(protected)/ventas/nueva/nueva-venta-form.tsx`
- Modify: `src/app/(protected)/ventas/[id]/facturar/page.tsx`
- Modify: `src/app/(protected)/ventas/[id]/facturar/emitir-form.tsx`
- Modify: `src/app/(protected)/ventas/actions.ts`

**Interfaces:**
- Consumes: `calcularImportes` nueva firma (Task 3), `AFECTACION_IGV_DEFAULT` (Task 1).
- Produces: `detalle_venta.tipo_afectacion_igv` se guarda al crear una orden y al facturarla.

- [ ] **Step 1: `ventas/nueva/page.tsx` — traer el campo**

Cambiar:

```ts
    supabase.from('productos').select('id, nombre, cantidad, precio_venta').eq('activo', true).order('nombre'),
```

por:

```ts
    supabase.from('productos').select('id, nombre, cantidad, precio_venta, tipo_afectacion_igv').eq('activo', true).order('nombre'),
```

- [ ] **Step 2: `nueva-venta-form.tsx` — tipos, snapshot y cálculo**

Agregar el import:

```ts
import { AFECTACION_IGV_DEFAULT } from '@/lib/afectacion-igv'
```

Cambiar `type Producto` y `type Linea`:

```ts
type Producto = { id: number; nombre: string; cantidad: number; precio_venta: number | null; tipo_afectacion_igv: string }
type Linea = { producto_id: number | ''; cantidad: number | ''; precio_unitario: number | ''; tipo_afectacion_igv: string }
```

Cambiar `lineaVacia`:

```ts
function lineaVacia(): Linea {
  return { producto_id: '', cantidad: '', precio_unitario: '', tipo_afectacion_igv: AFECTACION_IGV_DEFAULT }
}
```

En `actualizarProductoLinea`, agregar el snapshot:

```ts
  function actualizarProductoLinea(i: number, productoId: number | string | '') {
    setLineas((prev) =>
      prev.map((l, idx) => {
        if (idx !== i) return l
        const producto = productos.find((p) => p.id === Number(productoId))
        return {
          ...l,
          producto_id: Number(productoId) || '',
          precio_unitario: producto?.precio_venta ?? l.precio_unitario,
          tipo_afectacion_igv: producto?.tipo_afectacion_igv ?? l.tipo_afectacion_igv,
        }
      })
    )
  }
```

En el `useMemo` de `calcularImportes`, agregar `tipo_afectacion_igv: l.tipo_afectacion_igv,` al `.map(...)` interno. En `lineasJson`, agregar `tipo_afectacion_igv: l.tipo_afectacion_igv,` al `.map(...)`.

- [ ] **Step 3: `ventas/actions.ts` — `crearOrdenVenta`**

Agregar el import:

```ts
import { AFECTACIONES_IGV, AFECTACION_IGV_DEFAULT } from '@/lib/afectacion-igv'
```

Cambiar `type Linea`:

```ts
type Linea = { producto_id: number; cantidad: number; precio_unitario: number; tipo_afectacion_igv: string }
```

Después del `lineas = lineas.filter((l) => l.producto_id && l.cantidad > 0)` en `crearOrdenVenta`, agregar la misma normalización defensiva que en Cotizaciones (Task 5, Step 7):

```ts
  lineas = lineas.map((l) => ({
    ...l,
    tipo_afectacion_igv: AFECTACIONES_IGV.some((a) => a.codigo === l.tipo_afectacion_igv)
      ? l.tipo_afectacion_igv
      : AFECTACION_IGV_DEFAULT,
  }))
```

En el `.insert(lineas.map((l) => ({...})))` hacia `detalle_venta`, agregar `tipo_afectacion_igv: l.tipo_afectacion_igv,`.

- [ ] **Step 4: `ventas/[id]/facturar/page.tsx` — traer el campo**

Cambiar:

```ts
      supabase.from('detalle_venta').select('producto_id, cantidad, precio_unitario').eq('orden_id', id).returns<DetalleRow[]>(),
```

por:

```ts
      supabase.from('detalle_venta').select('producto_id, cantidad, precio_unitario, tipo_afectacion_igv').eq('orden_id', id).returns<DetalleRow[]>(),
```

y agregar `tipo_afectacion_igv: string` al `type DetalleRow` de ese archivo.

También cambiar el select de `productos` en ese mismo archivo (línea con `supabase.from('productos').select('id, nombre, cantidad, precio_venta')`) para incluir `tipo_afectacion_igv`.

- [ ] **Step 5: `emitir-form.tsx` — tipos, snapshot y cálculo**

Agregar el import:

```ts
import { AFECTACION_IGV_DEFAULT } from '@/lib/afectacion-igv'
```

Cambiar `type Producto` y `type Linea`:

```ts
type Producto = { id: number; nombre: string; cantidad: number; precio_venta: number | null; tipo_afectacion_igv: string }
type Linea = { producto_id: number | ''; cantidad: number | ''; precio_unitario: number | ''; tipo_afectacion_igv: string }
```

Cambiar `lineaVacia` (igual que el Step 2). Cambiar la prop `lineasIniciales`:

```ts
  lineasIniciales: { producto_id: number; cantidad: number; precio_unitario: number; tipo_afectacion_igv: string }[]
```

Y el `useState<Linea[]>(...)` que arma las líneas iniciales:

```ts
  const [lineas, setLineas] = useState<Linea[]>(
    lineasIniciales.length > 0
      ? lineasIniciales.map((l) => ({
          producto_id: l.producto_id,
          cantidad: l.cantidad,
          precio_unitario: l.precio_unitario,
          tipo_afectacion_igv: l.tipo_afectacion_igv,
        }))
      : [lineaVacia()]
  )
```

En `actualizarProductoLinea`, agregar el snapshot (mismo patrón que Step 2). En el `useMemo` de `calcularImportes` y en `lineasJson`, agregar `tipo_afectacion_igv: l.tipo_afectacion_igv,` a los `.map(...)` correspondientes.

- [ ] **Step 6: `ventas/actions.ts` — `emitirComprobante`**

Después de `lineas = lineas.filter((l) => l.producto_id && l.cantidad > 0)` en `emitirComprobante`, agregar la misma normalización defensiva del Step 3. En el `.insert(lineas.map((l) => ({...})))` hacia `detalle_venta` (dentro de `emitirComprobante`), agregar `tipo_afectacion_igv: l.tipo_afectacion_igv,`.

- [ ] **Step 7: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores en el módulo de Ventas.

- [ ] **Step 8: Prueba manual — caso normal**

1. `/ventas/nueva`, crear una orden con productos Gravado normales — confirmar Subtotal/IGV/Total iguales a antes.
2. Ir a Ventas, "Facturar" esa orden — confirmar que la vista previa y el comprobante emitido dan los mismos números.
3. Revisar en Consulta de Ventas → detalle del comprobante que Subtotal/IGV coinciden.

- [ ] **Step 9: Prueba manual — caso mixto**

1. Poner el producto de prueba en Exonerado otra vez.
2. Crear una orden con ese producto + uno Gravado, facturarla.
3. Confirmar los números a mano (misma fórmula que la Tarea 5).
4. Volver a poner el producto en Gravado.

- [ ] **Step 10: Commit**

```bash
git add src/app/\(protected\)/ventas
git commit -m "$(cat <<'EOF'
Ventas: IGV por linea segun tipo_afectacion_igv del producto

Mismo patron de snapshot que Cotizaciones - crearOrdenVenta y
emitirComprobante guardan el codigo en cada linea de detalle_venta.
EOF
)"
```

---

## Task 9: Notas de crédito — heredar la clasificación de la venta original

**Files:**
- Modify: `src/lib/comprobante-anulacion.ts`
- Modify: `src/app/(protected)/consulta-ventas/[id]/anular-form.tsx`
- Modify: `src/app/(protected)/consulta-ventas/actions.ts`

**Interfaces:**
- Consumes: `calcularImportes` nueva firma (Task 3), `AFECTACION_IGV_DEFAULT` (Task 1).
- Produces: el monto de una nota de crédito por ítem respeta la afectación IGV real de cada producto devuelto.

- [ ] **Step 1: `comprobante-anulacion.ts` — propagar el código**

Agregar `tipo_afectacion_igv: string` al `type DetalleRow`. Cambiar el select:

```ts
      .select('id, producto_id, cantidad, precio_unitario, tipo_afectacion_igv, productos(nombre)')
```

En el `vendidoPorProducto` (Map), agregar el campo (asume el mismo código para todas las filas de un mismo producto en una misma orden — válido porque el snapshot se hizo una sola vez al crear esa orden):

```ts
  const vendidoPorProducto = new Map<number, { nombre: string; cantidad: number; importe: number; tipoAfectacionIgv: string }>()
  for (const d of detalles ?? []) {
    const previo = vendidoPorProducto.get(d.producto_id)
    vendidoPorProducto.set(d.producto_id, {
      nombre: previo?.nombre ?? d.productos?.nombre ?? `Producto #${d.producto_id}`,
      cantidad: (previo?.cantidad ?? 0) + Number(d.cantidad),
      importe: (previo?.importe ?? 0) + Number(d.cantidad) * Number(d.precio_unitario),
      tipoAfectacionIgv: previo?.tipoAfectacionIgv ?? d.tipo_afectacion_igv,
    })
  }
```

Y en `lineasParaAnular`, agregar `tipoAfectacionIgv: v.tipoAfectacionIgv,` al objeto mapeado.

- [ ] **Step 2: `anular-form.tsx` — tipo y cálculo**

Agregar `tipoAfectacionIgv: string` al `type LineaVenta`. En el bloque que calcula `monto` con `calcularImportes(...)`, agregar `tipo_afectacion_igv: l.tipoAfectacionIgv,` al `.map(...)` interno. En `lineasJson`, agregar `tipo_afectacion_igv: l.tipoAfectacionIgv,` al `.map(...)`.

- [ ] **Step 3: `consulta-ventas/actions.ts` — `anularComprobante`**

Agregar el import:

```ts
import { AFECTACION_IGV_DEFAULT } from '@/lib/afectacion-igv'
```

Cambiar `type LineaDevolucion`:

```ts
type LineaDevolucion = { producto_id: number; cantidad: number; precio_unitario: number; tipo_afectacion_igv: string }
```

Cambiar el select de `detalle_venta` dentro de la rama `itemizable`:

```ts
    const { data: vendidos } = await supabase
      .from('detalle_venta')
      .select('producto_id, cantidad, precio_unitario, tipo_afectacion_igv')
      .eq('orden_id', comprobante.orden_venta_id)
```

En `vendidoPorProducto` (el Map local de esta función, distinto al de `comprobante-anulacion.ts` pero con la misma idea), agregar el campo:

```ts
    const vendidoPorProducto = new Map<number, { cantidad: number; importe: number; tipoAfectacionIgv: string }>()
    for (const d of vendidos ?? []) {
      const previo = vendidoPorProducto.get(d.producto_id) ?? { cantidad: 0, importe: 0, tipoAfectacionIgv: d.tipo_afectacion_igv }
      vendidoPorProducto.set(d.producto_id, {
        cantidad: previo.cantidad + Number(d.cantidad),
        importe: previo.importe + Number(d.cantidad) * Number(d.precio_unitario),
        tipoAfectacionIgv: previo.tipoAfectacionIgv,
      })
    }
```

En `lineasConsolidadas.push({...})`, agregar `tipo_afectacion_igv: vendido.tipoAfectacionIgv,`.

`agruparPorProducto` no necesita cambios (solo agrupa cantidades).

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores en Notas de crédito.

- [ ] **Step 5: Prueba manual**

1. Ir a un comprobante emitido en Consulta de Ventas, "Nota de crédito" por ítem, devolver 1 unidad de un producto Gravado normal — confirmar que el monto calculado coincide con lo que se facturó por esa unidad.
2. (Opcional, si queda tiempo) repetir con el producto de prueba en Exonerado para confirmar que el monto de la nota no incluye IGV en ese caso.

- [ ] **Step 6: Commit**

```bash
git add src/lib/comprobante-anulacion.ts "src/app/(protected)/consulta-ventas"
git commit -m "$(cat <<'EOF'
Notas de credito: hereda tipo_afectacion_igv de la venta original

El monto de una nota de credito por item ahora calcula IGV segun la
clasificacion real de cada producto devuelto, no 18% parejo.
EOF
)"
```

---

## Task 10: NUBEFACT — mapear el código real en vez de "Gravado" fijo

**Riesgo:** esta integración manda documentos reales a SUNAT. Alcance deliberadamente conservador — solo se mapean los 2 códigos con equivalencia bien establecida en NUBEFACT (Exonerado=2, Inafecto=3); Gravado/Bonificación/Donación (10/12/15) siguen mandando `tipo_de_igv: 1` como hoy, porque las 3 siguen siendo "Gravado" para efectos de IGV — no cambia el comportamiento actual para el caso normal.

**Files:**
- Modify: `src/lib/nubefact.ts`
- Modify: `src/lib/nubefact-envio.ts`

**Interfaces:**
- Consumes: `afectacionPorCodigo` (Task 1).
- Produces: `LineaNubefact` gana `tipoAfectacionIgv: string`; `construirItems` mapea el código real.

- [ ] **Step 1: `nubefact.ts` — agregar el campo a `LineaNubefact` y mapear**

Agregar el import:

```ts
import { afectacionPorCodigo } from './afectacion-igv'
```

Cambiar `type LineaNubefact`:

```ts
export type LineaNubefact = {
  descripcion: string
  codigo?: string
  /** Texto libre de la unidad en el ERP (ej. "und", "paq", "caja"). */
  unidadErp: string
  cantidad: number
  /** Precio CON IGV — la misma convención de precio_unitario del ERP. */
  precioUnitario: number
  /** Código del catálogo curado (src/lib/afectacion-igv.ts) — determina tipo_de_igv en NUBEFACT. */
  tipoAfectacionIgv: string
}
```

Agregar esta función antes de `construirItems`:

```ts
/**
 * Mapea el código curado del ERP al `tipo_de_igv` que espera NUBEFACT.
 * Solo se distinguen los 2 casos con 0% de IGV (Exonerado/Inafecto) —
 * Gravado/Bonificación/Donación (10/12/15) siguen siendo "1" porque las 3
 * cargan 18% de IGV igual, la diferencia entre ellas es contable/interna,
 * no cambia lo que NUBEFACT necesita para calcular el impuesto.
 */
function tipoDeIgvNubefact(tipoAfectacionIgv: string): number {
  const afectacion = afectacionPorCodigo(tipoAfectacionIgv)
  if (afectacion.grupo === 'exonerado') return 2
  if (afectacion.grupo === 'inafecto') return 3
  return 1
}
```

Cambiar `construirItems` para usar per-línea gravado/no-gravado en vez de asumir siempre gravado:

```ts
function construirItems(lineas: LineaNubefact[]): ItemNubefact[] {
  return lineas.map((l) => {
    const afectacion = afectacionPorCodigo(l.tipoAfectacionIgv)
    const precioUnitario = aCentimos(l.precioUnitario)
    // Gravado: el precio trae IGV incluido, se extrae hacia atras. No-gravado
    // (Exonerado/Inafecto): el precio YA es el valor final, sin nada que extraer.
    const valorUnitario = afectacion.afectoIgv ? aCentimos(precioUnitario / (1 + IGV_TASA)) : precioUnitario
    const subtotal = aCentimos(l.cantidad * valorUnitario)
    const igv = afectacion.afectoIgv ? aCentimos(subtotal * IGV_TASA) : 0
    return {
      unidad_de_medida: unidadSunat(l.unidadErp),
      codigo: l.codigo ?? '',
      descripcion: l.descripcion,
      cantidad: l.cantidad,
      valor_unitario: valorUnitario,
      precio_unitario: precioUnitario,
      subtotal,
      tipo_de_igv: tipoDeIgvNubefact(l.tipoAfectacionIgv),
      igv,
      total: aCentimos(subtotal + igv),
    }
  })
}
```

- [ ] **Step 2: `generarComprobanteNubefact` — separar los totales por grupo**

Cambiar el cálculo de totales dentro de `generarComprobanteNubefact`:

```ts
export async function generarComprobanteNubefact(
  input: GenerarComprobanteInput
): Promise<ResultadoNubefact<RespuestaNubefactComprobante>> {
  const items = construirItems(input.lineas)
  const totalGravada = aCentimos(
    items.filter((i) => i.tipo_de_igv === 1).reduce((acc, i) => acc + i.subtotal, 0)
  )
  const totalExonerada = aCentimos(
    items.filter((i) => i.tipo_de_igv === 2).reduce((acc, i) => acc + i.subtotal, 0)
  )
  const totalInafecta = aCentimos(
    items.filter((i) => i.tipo_de_igv === 3).reduce((acc, i) => acc + i.subtotal, 0)
  )
  const totalIgv = aCentimos(items.reduce((acc, i) => acc + i.igv, 0))
  const total = aCentimos(totalGravada + totalExonerada + totalInafecta + totalIgv)

  return llamarNubefact<RespuestaNubefactComprobante>({
    operacion: 'generar_comprobante',
    tipo_de_comprobante: TIPO_COMPROBANTE_NUBEFACT[input.tipo],
    serie: input.serie,
    numero: input.numero,
    sunat_transaction: 1, // Venta interna — el caso normal de este negocio
    cliente_tipo_de_documento: tipoDeDocumentoCliente(input.cliente.documento),
    cliente_numero_de_documento: input.cliente.documento,
    cliente_denominacion: input.cliente.denominacion,
    cliente_direccion: input.cliente.direccion ?? '',
    cliente_email: input.cliente.email ?? '',
    fecha_de_emision: input.fechaEmision,
    moneda: 1, // Soles
    porcentaje_de_igv: IGV_TASA * 100,
    total_gravada: totalGravada,
    total_exonerada: totalExonerada,
    total_inafecta: totalInafecta,
    total_igv: totalIgv,
    total,
    enviar_automaticamente_a_la_sunat: input.enviarAutomaticamenteASunat ?? true,
    enviar_automaticamente_al_cliente: false,
    items,
  })
}
```

**Nota para quien implemente:** `total_exonerada`/`total_inafecta` son campos documentados del JSON v2.9 de NUBEFACT (mismo manual de referencia citado en el header del archivo) — en el caso normal (100% Gravado, el único que corre hoy en producción) ambos dan `0` y el payload queda idéntico al de antes salvo por estos 2 campos nuevos en `0`. Si NUBEFACT rechaza el payload por estos campos en algún ambiente de prueba, revisar el manual antes de tocar producción — no adivinar.

- [ ] **Step 3: `nubefact-envio.ts` — pasar el campo desde `detalle_venta`**

Cambiar el `type DetalleRow`:

```ts
type DetalleRow = {
  cantidad: number
  precio_unitario: number
  tipo_afectacion_igv: string
  productos: ProductoLinea | null
}
```

Cambiar el select:

```ts
    supabase
      .from('detalle_venta')
      .select('cantidad, precio_unitario, tipo_afectacion_igv, productos(nombre, codigo, unidades_medida(nombre))')
      .eq('orden_id', comprobante.orden_venta_id)
      .returns<DetalleRow[]>(),
```

Y en el `.map(...)` que arma `lineas` para `generarComprobanteNubefact`, agregar `tipoAfectacionIgv: l.tipo_afectacion_igv,`.

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 5: Verificación — NO probar contra NUBEFACT real sin confirmar con el usuario**

Esta tarea NO incluye una prueba end-to-end contra la API real de NUBEFACT (eso mandaría un comprobante real a SUNAT). Verificación suficiente para esta tarea:

1. Confirmar con un `console.log` temporal (o revisando el payload antes del `fetch` en `llamarNubefact`) que para una venta 100%-Gravado el payload da `total_gravada` = al `total_gravada` de antes del cambio, `total_exonerada: 0`, `total_inafecta: 0`, y cada item con `tipo_de_igv: 1` — es decir, cero diferencia observable para el caso normal.
2. Quitar el `console.log` temporal antes de commitear.
3. Dejar constancia en el mensaje de commit de que el caso Exonerado/Inafecto contra NUBEFACT real queda sin probar en este plan — si el usuario factura alguna vez un producto así, revisar el resultado en el panel de NUBEFACT antes de confiar en el envío automático.

- [ ] **Step 6: Commit**

```bash
git add src/lib/nubefact.ts src/lib/nubefact-envio.ts
git commit -m "$(cat <<'EOF'
NUBEFACT: mapea tipo_de_igv real por linea en vez de Gravado fijo

Gravado/Bonificacion/Donacion (10/12/15) siguen mandando tipo_de_igv=1
(sin cambio de comportamiento). Exonerado=2, Inafecto=3, con sus totales
separados (total_exonerada/total_inafecta) en el payload. Sin probar
contra la API real de NUBEFACT para estos 2 casos - revisar en el panel
si se llega a facturar un producto Exonerado/Inafecto de verdad.
EOF
)"
```

---

## Task 11: Verificación final y regresión completa

**Files:** ninguno (solo verificación).

- [ ] **Step 1: Type-check y build completos**

```bash
npx tsc --noEmit
npm run build
```

Expected: ambos sin errores.

- [ ] **Step 2: Lint de todo lo tocado en este plan**

```bash
npx eslint src/lib/afectacion-igv.ts src/lib/cotizaciones.ts src/lib/cotizacion-documento-datos.ts src/lib/comprobante-anulacion.ts src/lib/nubefact.ts src/lib/nubefact-envio.ts "src/app/(protected)/productos" "src/app/(protected)/cotizaciones" "src/app/(protected)/ventas" "src/app/(protected)/consulta-ventas" src/components/cotizacion-documento.tsx src/components/cotizacion-ticket.tsx
```

Expected: sin errores (warnings preexistentes no relacionados a este plan se pueden ignorar).

- [ ] **Step 3: Regresión — comparar una cotización YA EXISTENTE antes/después**

Elegir una cotización ya guardada de antes de este cambio (100% gravada, sin tocar). Abrirla en `/cotizaciones/[id]` o el modal "Ver" de Consulta de Cotización. Confirmar que Subtotal/IGV/Total son idénticos, céntimo a céntimo, a los que tenía antes de empezar este plan (si hay duda, anotar los 3 números ANTES de la Tarea 3 y comparar acá).

- [ ] **Step 4: Recorrido end-to-end del caso mixto**

1. Producto de prueba en Exonerado.
2. Cotización con ese producto + uno Gravado → Vista previa muestra desglose correcto.
3. Convertir esa cotización en factura (botón "Crear Factura") → el comprobante emitido tiene los mismos números.
4. Nota de crédito por ítem sobre esa venta, devolviendo el producto Exonerado → el monto de la nota no incluye IGV de esa línea.
5. Volver el producto de prueba a Gravado – Operación Onerosa (dejar los datos de prueba limpios).

- [ ] **Step 5: Confirmar con el usuario**

Avisar: "Implementación completa. Regresión verificada contra una cotización vieja (mismos números) y el caso mixto probado de punta a punta (cotización → factura → nota de crédito). NUBEFACT: el caso normal (Gravado) no cambió de comportamiento; el caso Exonerado/Inafecto está mapeado pero sin probar contra la API real — si facturas alguna vez un producto así, revisa el resultado en el panel de NUBEFACT la primera vez."

---

## Self-Review (completado antes de entregar este plan)

**Cobertura del spec:** las 8 decisiones de diseño del spec (`docs/superpowers/specs/2026-08-07-tipo-afectacion-igv-design.md`) están cubiertas: catálogo curado → Task 1; columna + snapshot → Task 2, 5, 8; cálculo por línea → Task 3; descuento proporcional → Task 3; formulario de producto → Task 4; transparencia en Cotizaciones/Ventas → Task 5, 8; PDFs → Task 7; NUBEFACT → Task 10. Notas de crédito (mencionado en "Fuera de alcance" del spec como "solo propaga, sin lógica nueva") → Task 9. Compras (schema-only) → cubierto por la migración de Task 2, sin tarea de código adicional (documentado explícitamente en esa tarea).

**Placeholders:** ninguno — cada step tiene código completo o un comando con output esperado explícito.

**Consistencia de tipos:** `calcularImportes(lineas: {cantidad, precio_unitario, tipo_afectacion_igv: string}[])` y `ImportesDocumento {subtotal, igv, total, opGravada, opExonerada, opInafecta}` son los mismos en las Tasks 3, 5, 6, 8, 9. `afectacionPorCodigo`/`AFECTACIONES_IGV`/`AFECTACION_IGV_DEFAULT` de Task 1 se importan igual en todas las tareas que los usan.
