# Módulo de Cobranzas — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el módulo de Cobranzas descrito en `docs/superpowers/specs/2026-07-31-cobranzas-design.md`: una columna `fecha_cobro` en `comprobantes`, una página `/cobranzas` que lista facturas/boletas a crédito vencidas o por vencer (con saldo neto sobre notas de crédito/débito) con botón "Marcar cobrada", y una notificación en la campana del header (sin repetir el patrón del toast rojo de stock bajo).

**Architecture:** Migración SQL aditiva ejecutada a mano en Supabase (patrón ya establecido del proyecto). Lógica de cálculo centralizada en `src/lib/cobranzas.ts` (una función `obtenerCobranzasPendientes()` reutilizada por el layout — para la campana — y por la página completa). UI: server component para la página + un client component para la tabla/acciones (patrón idéntico a Compras/Proveedores), y un client component para la campana (clon estructural de `notificaciones-stock.tsx`).

**Tech Stack:** Next.js 16 (App Router, Server Actions), TypeScript, Supabase (Postgres + `@supabase/supabase-js`), Tailwind CSS v4.

## Global Constraints

- Sin tests automatizados en este proyecto (decisión explícita) — verificación con `npx tsc --noEmit`, `npm run build`, y prueba manual en el navegador, exactamente como indica la sección "Testing" del spec.
- Todo el contenido visible en español, siguiendo el resto de la app.
- Cambios de esquema son migraciones aditivas nuevas (`add-*.sql`) — nunca editar `schema.sql` ni un `add-*.sql` existente. El usuario corre cada migración a mano en el SQL Editor de Supabase; Claude no tiene acceso de escritura DDL directo.
- Toda UI nueva necesita su contraparte `dark:` explícita (modo oscuro por clase, no por `prefers-color-scheme`) — un elemento sin `dark:` puede quedar invisible.
- "Marcar cobrada" es binaria (`fecha_cobro` null o con fecha) — sin cobro parcial directo, ver spec sección "Decisiones de diseño #1".
- El monto a mostrar/cobrar es el saldo neto (`total + Σ notas_debito.monto − Σ notas_credito.monto`), nunca `comprobante.total` a secas — ver spec sección "Decisiones de diseño #2". Un comprobante con saldo `<= 0` se excluye aunque siga `estado = 'emitido'`.
- "Vencida" = fecha de vencimiento ya pasada. "Por vencer" = vence hoy o en los próximos 7 días. Todo lo demás (vence en más de 7 días) no se muestra en v1.
- "Hoy" se calcula con hora de Perú (`hoyPeruISO()` de `src/lib/fecha.ts`), nunca con la hora UTC del servidor — bug ya conocido y corregido en otras partes del proyecto.
- Sin envío externo (WhatsApp/email/SMS) — la alerta es 100% dentro de la app.
- La notificación de cobranzas usa el patrón de `notificaciones-stock.tsx` (campana + dropdown sobrio). **No** se reutiliza ni se imita el patrón de `alerta-stock-bajo.tsx` (toast de esquina con emoji grande) — pedido explícito del usuario.

---

### Task 1: Migración `add-cobranzas.sql`

**Files:**
- Create: `add-cobranzas.sql` (raíz del repo)

**Interfaces:**
- Produces: columna `comprobantes.fecha_cobro` (`timestamptz`, nullable), que Task 3 y Task 4 consumen.

- [ ] **Step 1: Crear el archivo de migración**

Crear `add-cobranzas.sql` con este contenido:

```sql
-- ============================================================
-- Distribuidora LimpiezaPro — Módulo de Cobranzas
-- Migración ADITIVA — no borra nada, segura de correr sobre datos reales.
-- Ejecutar en: Supabase → SQL Editor → New query
-- ============================================================

alter table comprobantes add column if not exists fecha_cobro timestamptz;
```

- [ ] **Step 2: Commit**

```bash
git add add-cobranzas.sql
git commit -m "feat(db): agregar columna fecha_cobro a comprobantes (migración pendiente de correr)"
```

- [ ] **Step 3: Pedir al usuario que corra la migración**

Mostrar al usuario el contenido de `add-cobranzas.sql` y pedirle que lo ejecute en Supabase → SQL Editor → New query. **No continuar a Step 4 sin que el usuario confirme que ya la corrió** (mismo patrón que toda migración anterior de este proyecto).

- [ ] **Step 4: Verificar que la columna existe**

Correr, con las credenciales de `.env.local` ya presentes en el proyecto:

```bash
node --env-file=.env.local -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from('comprobantes').select('id, fecha_cobro').limit(1).then(({ data, error }) => {
  if (error) { console.error('FALLÓ:', error.message); process.exit(1); }
  console.log('OK — columna fecha_cobro existe. Ejemplo:', data);
});
"
```

Expected: `OK — columna fecha_cobro existe. Ejemplo: [ { id: ..., fecha_cobro: null } ]` (o `[]` si la tabla está vacía, pero sin error). Si falla con un error de columna inexistente, la migración no corrió — volver a Step 3.

---

### Task 2: Registrar el módulo `cobranzas` en el sistema de permisos

**Files:**
- Modify: `src/lib/modulos.ts`

**Interfaces:**
- Produces: clave `'cobranzas'` disponible en `ModuloClave`, usada por Task 5 (`requierePermiso`) y Task 8 (sidebar).

- [ ] **Step 1: Agregar la entrada al arreglo `MODULOS`**

En `src/lib/modulos.ts`, agregar `{ clave: 'cobranzas', label: 'Cobranzas' }` al final del arreglo:

```ts
export const MODULOS = [
  { clave: 'productos', label: 'Productos' },
  { clave: 'movimientos', label: 'Movimientos' },
  { clave: 'compras', label: 'Compras' },
  { clave: 'proveedores', label: 'Proveedores' },
  { clave: 'ventas', label: 'Ventas' },
  { clave: 'consulta_ventas', label: 'Consulta de Ventas' },
  { clave: 'guias_remision', label: 'Guías de Remisión' },
  { clave: 'clientes', label: 'Clientes' },
  { clave: 'cotizaciones', label: 'Cotizaciones' },
  { clave: 'reportes', label: 'Reportes' },
  { clave: 'cobranzas', label: 'Cobranzas' },
] as const

export type ModuloClave = (typeof MODULOS)[number]['clave']
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/lib/modulos.ts
git commit -m "feat(permisos): agregar módulo cobranzas"
```

---

### Task 3: Lógica de cálculo — `src/lib/cobranzas.ts`

**Files:**
- Create: `src/lib/cobranzas.ts`

**Interfaces:**
- Consumes: `createClient` de `@/lib/supabase/server` (`() => Promise<SupabaseClient>`); `hoyPeruISO()` de `@/lib/fecha` (`() => string`, formato `YYYY-MM-DD`).
- Produces: `export type FilaCobranza = { id: number; numero: string; tipo: string; cliente: string; saldo: number; fechaVencimiento: string; etiqueta: string }`, `export type CobranzasPendientes = { vencidas: FilaCobranza[]; porVencer: FilaCobranza[] }`, `export async function obtenerCobranzasPendientes(): Promise<CobranzasPendientes>`. Consumidos por Task 4 (actions no la usa), Task 5 (página), Task 6 (notificación), Task 9 (layout).

- [ ] **Step 1: Escribir `src/lib/cobranzas.ts`**

```ts
import { createClient } from '@/lib/supabase/server'
import { hoyPeruISO } from '@/lib/fecha'

type ComprobanteRow = {
  id: number
  numero: string
  tipo: string
  total: number
  fecha_emision: string
  dias_credito: string
  clientes: { nombre: string } | { nombre: string }[] | null
}

type NotaRow = { comprobante_id: number; monto: number }

export type FilaCobranza = {
  id: number
  numero: string
  tipo: string
  cliente: string
  saldo: number
  fechaVencimiento: string
  etiqueta: string
}

export type CobranzasPendientes = {
  vencidas: FilaCobranza[]
  porVencer: FilaCobranza[]
}

function unoDe<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v
}

function calcularVencimientoISO(fechaEmisionISO: string, diasCredito: string): string {
  const dias = parseInt(diasCredito, 10) || 0
  const fecha = new Date(`${fechaEmisionISO}T00:00:00Z`)
  fecha.setUTCDate(fecha.getUTCDate() + dias)
  return fecha.toISOString().slice(0, 10)
}

function etiquetaPorDias(dias: number): string {
  if (dias < 0) return `Vencida hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? '' : 's'}`
  if (dias === 0) return 'Vence hoy'
  return `Vence en ${dias} día${dias === 1 ? '' : 's'}`
}

export async function obtenerCobranzasPendientes(): Promise<CobranzasPendientes> {
  const supabase = await createClient()

  const { data: comprobantes } = await supabase
    .from('comprobantes')
    .select('id, numero, tipo, total, fecha_emision, dias_credito, clientes(nombre)')
    .eq('estado', 'emitido')
    .neq('dias_credito', 'Contado')
    .is('fecha_cobro', null)
    .returns<ComprobanteRow[]>()

  if (!comprobantes || comprobantes.length === 0) {
    return { vencidas: [], porVencer: [] }
  }

  const ids = comprobantes.map((c) => c.id)

  const [{ data: notasCredito }, { data: notasDebito }] = await Promise.all([
    supabase.from('notas_credito').select('comprobante_id, monto').in('comprobante_id', ids).returns<NotaRow[]>(),
    supabase.from('notas_debito').select('comprobante_id, monto').in('comprobante_id', ids).returns<NotaRow[]>(),
  ])

  const netoPorComprobante = new Map<number, number>()
  for (const n of notasCredito ?? []) {
    netoPorComprobante.set(n.comprobante_id, (netoPorComprobante.get(n.comprobante_id) ?? 0) - Number(n.monto))
  }
  for (const n of notasDebito ?? []) {
    netoPorComprobante.set(n.comprobante_id, (netoPorComprobante.get(n.comprobante_id) ?? 0) + Number(n.monto))
  }

  const hoy = hoyPeruISO()
  const hoyMs = new Date(`${hoy}T00:00:00Z`).getTime()
  const vencidas: FilaCobranza[] = []
  const porVencer: FilaCobranza[] = []

  for (const c of comprobantes) {
    const saldo = Number(c.total) + (netoPorComprobante.get(c.id) ?? 0)
    if (saldo <= 0) continue

    const fechaVencimiento = calcularVencimientoISO(c.fecha_emision, c.dias_credito)
    const dias = Math.round((new Date(`${fechaVencimiento}T00:00:00Z`).getTime() - hoyMs) / 86400000)
    if (dias > 7) continue

    const fila: FilaCobranza = {
      id: c.id,
      numero: c.numero,
      tipo: c.tipo,
      cliente: unoDe(c.clientes)?.nombre ?? '—',
      saldo,
      fechaVencimiento,
      etiqueta: etiquetaPorDias(dias),
    }

    if (dias < 0) vencidas.push(fila)
    else porVencer.push(fila)
  }

  vencidas.sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento))
  porVencer.sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento))

  return { vencidas, porVencer }
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/lib/cobranzas.ts
git commit -m "feat(cobranzas): calcular saldo neto y clasificar vencidas/por vencer"
```

---

### Task 4: Server action `marcarCobrada`

**Files:**
- Create: `src/app/(protected)/cobranzas/actions.ts`

**Interfaces:**
- Consumes: `tienePermiso('cobranzas')` de `@/lib/permisos`; `createClient` de `@/lib/supabase/server`.
- Produces: `export async function marcarCobrada(id: number): Promise<void>` (lanza `Error` en fallo — no retorna `{error}`, para que el `try/catch` con `useTransition` de Task 5 lo capture). Consumido por Task 5.

- [ ] **Step 1: Escribir `src/app/(protected)/cobranzas/actions.ts`**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { tienePermiso } from '@/lib/permisos'

export async function marcarCobrada(id: number) {
  if (!(await tienePermiso('cobranzas'))) {
    throw new Error('No tienes permiso para esta acción.')
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('comprobantes')
    .update({ fecha_cobro: new Date().toISOString() })
    .eq('id', id)
    .is('fecha_cobro', null)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/cobranzas')
  revalidatePath('/dashboard')
}
```

Nota: el `.is('fecha_cobro', null)` en el `update` evita que un doble click reescriba `fecha_cobro` de algo ya marcado (idéntico al patrón de reserva atómica que usa `recibirOrdenCompra` en `compras/actions.ts`).

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(protected)/cobranzas/actions.ts"
git commit -m "feat(cobranzas): server action para marcar un comprobante como cobrado"
```

---

### Task 5: Página `/cobranzas` y tabla

**Files:**
- Create: `src/app/(protected)/cobranzas/tabla-cobranzas.tsx`
- Create: `src/app/(protected)/cobranzas/page.tsx`

**Interfaces:**
- Consumes: `FilaCobranza` y `obtenerCobranzasPendientes` de `@/lib/cobranzas` (Task 3); `marcarCobrada` de `./actions` (Task 4); `requierePermiso` de `@/lib/permisos`.
- Produces: ruta `/cobranzas` navegable, protegida por permiso `cobranzas`.

- [ ] **Step 1: Escribir `src/app/(protected)/cobranzas/tabla-cobranzas.tsx`**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { marcarCobrada } from './actions'
import type { FilaCobranza } from '@/lib/cobranzas'

const TIPO_LABELS: Record<string, string> = {
  factura: 'Factura',
  boleta: 'Boleta',
  nota_venta: 'Nota de venta',
}

function Seccion({
  titulo,
  filas,
  tono,
  pendienteId,
  isPending,
  onMarcar,
}: {
  titulo: string
  filas: FilaCobranza[]
  tono: 'rojo' | 'ambar'
  pendienteId: number | null
  isPending: boolean
  onMarcar: (id: number, numero: string) => void
}) {
  if (filas.length === 0) return null

  const colorTitulo = tono === 'rojo' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
  const colorEtiqueta = tono === 'rojo' ? 'text-red-500 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'

  return (
    <div className="mb-8">
      <h2 className={`mb-3 text-sm font-extrabold tracking-wide uppercase ${colorTitulo}`}>{titulo}</h2>
      <div className="overflow-hidden rounded-3xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] shadow-lg shadow-slate-500/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13.5px]">
            <thead>
              <tr className="border-b-2 border-[#f1f5f9] dark:border-slate-800 bg-[#f8fafc] dark:bg-slate-800/60 text-[#64748b] dark:text-slate-400">
                <th className="px-6 py-4 font-bold">Cliente</th>
                <th className="px-6 py-4 font-bold">Comprobante</th>
                <th className="px-6 py-4 font-bold">Saldo</th>
                <th className="px-6 py-4 font-bold">Vencimiento</th>
                <th className="px-6 py-4 text-right font-bold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr
                  key={f.id}
                  className="border-b border-[#f1f5f9] dark:border-slate-800 text-[#1e293b] dark:text-slate-100 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <td className="px-6 py-4 font-bold">{f.cliente}</td>
                  <td className="px-6 py-4 text-[#64748b] dark:text-slate-400">
                    {TIPO_LABELS[f.tipo] ?? f.tipo} {f.numero}
                  </td>
                  <td className="px-6 py-4 font-semibold">S/ {f.saldo.toFixed(2)}</td>
                  <td className={`px-6 py-4 font-semibold ${colorEtiqueta}`}>{f.etiqueta}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => onMarcar(f.id, f.numero)}
                      disabled={isPending && pendienteId === f.id}
                      className="rounded-xl bg-emerald-500 px-4 py-2 text-[12px] font-bold text-white shadow-sm shadow-emerald-500/30 transition-all hover:bg-emerald-600 disabled:opacity-50"
                    >
                      Marcar cobrada
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export function TablaCobranzas({ vencidas, porVencer }: { vencidas: FilaCobranza[]; porVencer: FilaCobranza[] }) {
  const [error, setError] = useState<string | null>(null)
  const [pendienteId, setPendienteId] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleMarcar(id: number, numero: string) {
    if (!confirm(`¿Marcar ${numero} como cobrada?`)) return
    setError(null)
    setPendienteId(id)
    startTransition(async () => {
      try {
        await marcarCobrada(id)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo marcar como cobrada.')
      } finally {
        setPendienteId(null)
      }
    })
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-[#1e293b] dark:text-slate-100">Cobranzas</h1>
        <p className="mt-1 text-sm font-medium text-[#64748b] dark:text-slate-400">
          {vencidas.length + porVencer.length === 0
            ? 'No hay cobros pendientes'
            : `${vencidas.length} vencida${vencidas.length === 1 ? '' : 's'} · ${porVencer.length} por vencer`}
        </p>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      {vencidas.length === 0 && porVencer.length === 0 ? (
        <div className="rounded-3xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] p-12 text-center">
          <p className="text-sm font-medium text-[#64748b] dark:text-slate-400">No hay cobros pendientes por ahora.</p>
        </div>
      ) : (
        <>
          <Seccion
            titulo="Vencidas"
            filas={vencidas}
            tono="rojo"
            pendienteId={pendienteId}
            isPending={isPending}
            onMarcar={handleMarcar}
          />
          <Seccion
            titulo="Por vencer (próximos 7 días)"
            filas={porVencer}
            tono="ambar"
            pendienteId={pendienteId}
            isPending={isPending}
            onMarcar={handleMarcar}
          />
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Escribir `src/app/(protected)/cobranzas/page.tsx`**

```tsx
import { requierePermiso } from '@/lib/permisos'
import { obtenerCobranzasPendientes } from '@/lib/cobranzas'
import { TablaCobranzas } from './tabla-cobranzas'

export default async function CobranzasPage() {
  await requierePermiso('cobranzas')
  const { vencidas, porVencer } = await obtenerCobranzasPendientes()

  return <TablaCobranzas vencidas={vencidas} porVencer={porVencer} />
}
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(protected)/cobranzas/tabla-cobranzas.tsx" "src/app/(protected)/cobranzas/page.tsx"
git commit -m "feat(cobranzas): página /cobranzas con secciones vencidas/por vencer"
```

---

### Task 6: Notificación en la campana del header

**Files:**
- Create: `src/app/(protected)/notificaciones-cobranzas.tsx`

**Interfaces:**
- Consumes: `FilaCobranza` de `@/lib/cobranzas` (Task 3).
- Produces: `export function NotificacionesCobranzas({ vencidas, porVencer }: { vencidas: FilaCobranza[]; porVencer: FilaCobranza[] })`. Consumido por Task 7.

- [ ] **Step 1: Escribir `src/app/(protected)/notificaciones-cobranzas.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { FilaCobranza } from '@/lib/cobranzas'

export function NotificacionesCobranzas({ vencidas, porVencer }: { vencidas: FilaCobranza[]; porVencer: FilaCobranza[] }) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function alClickFuera(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', alClickFuera)
    return () => document.removeEventListener('mousedown', alClickFuera)
  }, [])

  const total = vencidas.length + porVencer.length
  const filas = [...vencidas, ...porVencer].slice(0, 5)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        title="Cobranzas pendientes"
        className="relative flex h-11 w-11 items-center justify-center rounded-2xl text-[#64748b] dark:text-slate-400 transition-all hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v12m-4.5-2.818.879.659c1.171.879 3.07.879 4.242 0m0 0c1.172-.879 1.172-2.303 0-3.182C11.75 12.219 10.982 12 10.214 12m4.786 3.182c1.172-.879 1.172-2.303 0-3.182C14.25 11.219 13.482 11 12.714 11c-.768 0-1.536-.219-2.121-.659-1.172-.879-1.172-2.303 0-3.182 1.171-.879 3.07-.879 4.242 0l.879.659"
          />
        </svg>
        {total > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-500 px-1 text-[10px] font-bold text-white">
            {total}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute top-14 right-0 z-30 w-80 overflow-hidden rounded-2xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] shadow-xl">
          <div className="border-b-2 border-[#f1f5f9] dark:border-slate-800 px-4 py-3">
            <p className="text-sm font-extrabold text-[#1e293b] dark:text-slate-100">Cobranzas</p>
            <p className="text-xs font-medium text-[#64748b] dark:text-slate-400">
              {total > 0 ? `${total} comprobante${total === 1 ? '' : 's'} por cobrar` : 'Todo al día'}
            </p>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {total === 0 ? (
              <p className="p-6 text-center text-sm font-medium text-[#64748b] dark:text-slate-400">
                No hay cobros pendientes.
              </p>
            ) : (
              filas.map((f) => (
                <Link
                  key={f.id}
                  href="/cobranzas"
                  onClick={() => setAbierto(false)}
                  className="flex items-center justify-between gap-3 border-b border-[#f1f5f9] dark:border-slate-800 px-4 py-3 transition-colors hover:bg-indigo-50/60 dark:hover:bg-slate-800/60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#1e293b] dark:text-slate-100">{f.cliente}</p>
                    <p className="text-xs text-[#64748b] dark:text-slate-400">
                      S/ {f.saldo.toFixed(2)} · {f.numero}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      f.etiqueta.startsWith('Vencida') ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {f.etiqueta}
                  </span>
                </Link>
              ))
            )}
          </div>

          {total > 5 && (
            <Link
              href="/cobranzas"
              onClick={() => setAbierto(false)}
              className="block border-t-2 border-[#f1f5f9] dark:border-slate-800 px-4 py-3 text-center text-xs font-bold text-indigo-600 dark:text-indigo-400"
            >
              Ver los {total} en Cobranzas
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(protected)/notificaciones-cobranzas.tsx"
git commit -m "feat(cobranzas): campana de notificaciones sobria (sin toast de esquina)"
```

---

### Task 7: Conectar la campana en `app-shell.tsx`

**Files:**
- Modify: `src/app/(protected)/app-shell.tsx`

**Interfaces:**
- Consumes: `NotificacionesCobranzas` de `./notificaciones-cobranzas` (Task 6); `FilaCobranza` de `@/lib/cobranzas` (Task 3).
- Produces: prop nueva `cobranzas: { vencidas: FilaCobranza[]; porVencer: FilaCobranza[] }` en `AppShell`, consumida por Task 9.

- [ ] **Step 1: Agregar el import**

En `src/app/(protected)/app-shell.tsx`, agregar junto a los demás imports:

```ts
import { NotificacionesCobranzas } from './notificaciones-cobranzas'
import type { FilaCobranza } from '@/lib/cobranzas'
```

- [ ] **Step 2: Agregar la prop `cobranzas` a la firma de `AppShell`**

Cambiar:

```tsx
export function AppShell({
  children,
  nombre,
  rol,
  modulosPermitidos,
  stockBajo,
  signOutAction,
}: {
  children: React.ReactNode
  nombre: string
  rol: string
  modulosPermitidos: string[]
  stockBajo: ProductoStockBajo[]
  signOutAction: () => Promise<void>
}) {
```

por:

```tsx
export function AppShell({
  children,
  nombre,
  rol,
  modulosPermitidos,
  stockBajo,
  cobranzas,
  signOutAction,
}: {
  children: React.ReactNode
  nombre: string
  rol: string
  modulosPermitidos: string[]
  stockBajo: ProductoStockBajo[]
  cobranzas: { vencidas: FilaCobranza[]; porVencer: FilaCobranza[] }
  signOutAction: () => Promise<void>
}) {
```

- [ ] **Step 3: Renderizar la campana junto a `NotificacionesStock`**

Cambiar:

```tsx
            <ThemeToggle />
            <NotificacionesStock stockBajo={stockBajo} />
```

por:

```tsx
            <ThemeToggle />
            <NotificacionesStock stockBajo={stockBajo} />
            <NotificacionesCobranzas vencidas={cobranzas.vencidas} porVencer={cobranzas.porVencer} />
```

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: error esperado en `layout.tsx` (`Property 'cobranzas' is missing`) — se resuelve en Task 9. Confirmar que **no** hay ningún otro error en `app-shell.tsx`.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(protected)/app-shell.tsx"
git commit -m "feat(cobranzas): montar la campana de cobranzas en el header"
```

---

### Task 8: Ítem de menú en el sidebar

**Files:**
- Modify: `src/app/(protected)/sidebar.tsx`

- [ ] **Step 1: Insertar el nuevo ítem entre "Consulta de Ventas" y "Guías de Remisión"**

En `NAV_ITEMS`, insertar este objeto justo después del ítem `consulta-ventas` (busca el bloque que termina en `},` antes de `href: '/guias-remision'`):

```tsx
  {
    href: '/cobranzas',
    label: 'Cobranzas',
    modulo: 'cobranzas',
    grupo: 'ventas',
    gradient: 'from-indigo-500 to-blue-600',
    glow: 'shadow-indigo-500/40',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v12m-4.5-2.818.879.659c1.171.879 3.07.879 4.242 0m0 0c1.172-.879 1.172-2.303 0-3.182C11.75 12.219 10.982 12 10.214 12m4.786 3.182c1.172-.879 1.172-2.303 0-3.182C14.25 11.219 13.482 11 12.714 11c-.768 0-1.536-.219-2.121-.659-1.172-.879-1.172-2.303 0-3.182 1.171-.879 3.07-.879 4.242 0l.879.659"
      />
    ),
  },
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(protected)/sidebar.tsx"
git commit -m "feat(cobranzas): agregar Cobranzas al menú lateral (grupo Ventas)"
```

---

### Task 9: Cargar los datos en `layout.tsx`

**Files:**
- Modify: `src/app/(protected)/layout.tsx`

**Interfaces:**
- Consumes: `obtenerCobranzasPendientes` de `@/lib/cobranzas` (Task 3).

- [ ] **Step 1: Agregar el import**

```ts
import { obtenerCobranzasPendientes } from '@/lib/cobranzas'
```

- [ ] **Step 2: Traer los datos junto a `stockBajo`**

Cambiar:

```tsx
  const { data: stockBajo } = await supabase
    .from('productos_stock_bajo')
    .select('id, nombre, cantidad, punto_reorden')
    .order('nombre')
```

por:

```tsx
  const { data: stockBajo } = await supabase
    .from('productos_stock_bajo')
    .select('id, nombre, cantidad, punto_reorden')
    .order('nombre')

  const cobranzas = await obtenerCobranzasPendientes()
```

- [ ] **Step 3: Pasar la prop a `AppShell`**

Cambiar:

```tsx
    <AppShell
      nombre={perfil.nombre}
      rol={perfil.rol}
      modulosPermitidos={[...modulosPermitidos]}
      stockBajo={stockBajo ?? []}
      signOutAction={signOut}
    >
```

por:

```tsx
    <AppShell
      nombre={perfil.nombre}
      rol={perfil.rol}
      modulosPermitidos={[...modulosPermitidos]}
      stockBajo={stockBajo ?? []}
      cobranzas={cobranzas}
      signOutAction={signOut}
    >
```

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores (el error de Task 7 Step 4 debe haber desaparecido).

- [ ] **Step 5: Commit**

```bash
git add "src/app/(protected)/layout.tsx"
git commit -m "feat(cobranzas): cargar cobranzas pendientes en el layout protegido"
```

---

### Task 10: Verificación end-to-end

**Files:** ninguno (solo verificación).

- [ ] **Step 1: Build completo**

Run: `npm run build`
Expected: build exitoso, sin errores de tipos ni de rutas.

- [ ] **Step 2: Prueba manual — flujo feliz**

Con `npm run dev` corriendo:

1. Como `admin`, entrar a Ventas → Facturar una orden con `dias_credito = '7 días'` (o el más corto disponible) para un cliente existente.
2. Confirmar que la campana de Cobranzas en el header muestra badge `1` y, al abrirla, aparece ese comprobante en ámbar con "Vence en 7 días" (o el número de días correspondiente).
3. Entrar a `/cobranzas` desde el sidebar (grupo Ventas) y confirmar que aparece en la sección "Por vencer" con el cliente y saldo correctos.
4. Ir a Consulta de Ventas → ese comprobante → emitir una Nota de Crédito parcial (ej. "Descuento global") por una parte del monto.
5. Volver a `/cobranzas` y confirmar que el saldo mostrado bajó exactamente en el monto de la NC.
6. Click en "Marcar cobrada", confirmar el diálogo, y verificar que la fila desaparece tanto de `/cobranzas` como del badge de la campana.

- [ ] **Step 3: Prueba manual — casos excluidos**

1. Confirmar que un comprobante con `dias_credito = 'Contado'` nunca aparece en Cobranzas.
2. Anular un comprobante a crédito (vía Nota de Crédito de anulación total) y confirmar que desaparece de Cobranzas (o nunca llega a aparecer si se anula antes del ciclo de 7 días).
3. Si hay datos de prueba con vencimiento ya pasado, confirmar que caen en la sección "Vencidas" (texto rojo) y no en "Por vencer".

- [ ] **Step 4: Prueba de permisos**

Con un usuario no-admin sin el módulo `cobranzas` activado (Usuarios → editar → permisos): confirmar que no ve "Cobranzas" en el sidebar y que `/cobranzas` redirige a `/dashboard?sin-permiso=cobranzas` si se navega directo a la URL. Activar el permiso desde Usuarios y confirmar que aparece.

- [ ] **Step 5: Confirmar con el usuario antes de hacer push**

Reportar el resultado de la verificación. **No hacer `git push` sin que el usuario lo confirme explícitamente en el momento**, aunque haya autorizado un push anterior en la misma conversación (regla ya establecida del proyecto).
