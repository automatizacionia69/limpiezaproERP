import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requierePermiso } from '@/lib/permisos'
import { AjusteForm } from './ajuste-form'
import { MovimientosTabla } from '../movimientos-tabla'

type KardexRow = {
  id: number
  producto_nombre: string
  tipo: string
  cantidad: number
  efecto_cantidad: number
  costo_unitario: number | null
  valor_movimiento: number | null
  saldo_cantidad: number
  usuario_nombre: string | null
  motivo: string | null
  creado_en: string
}

export default async function AjustesPage() {
  await requierePermiso('movimientos')
  const supabase = await createClient()

  const [{ data: productos }, { data: ajustes }] = await Promise.all([
    supabase.from('productos').select('id, nombre').order('nombre'),
    supabase
      .from('kardex_valorizado')
      .select(
        'id, producto_nombre, tipo, cantidad, efecto_cantidad, costo_unitario, valor_movimiento, saldo_cantidad, usuario_nombre, motivo, creado_en'
      )
      .eq('tipo', 'ajuste')
      .order('creado_en', { ascending: false })
      .limit(200)
      .returns<KardexRow[]>(),
  ])

  const filas = ajustes ?? []
  const diferenciaNeta = filas.reduce((acc, m) => acc + Number(m.efecto_cantidad), 0)
  const valorNeto = filas.reduce((acc, m) => acc + Number(m.valor_movimiento ?? 0), 0)

  return (
    <div>
      <Link href="/movimientos" className="text-sm font-bold text-[#64748b] dark:text-slate-400 hover:text-amber-600">
        ← Volver a Movimientos
      </Link>

      <div className="mt-2">
        <h1 className="text-2xl font-extrabold text-[#1e293b] dark:text-slate-100">⚖️ Ajustes</h1>
        <p className="mt-1 text-sm font-medium text-[#64748b] dark:text-slate-400">Correcciones de inventario por conteo físico</p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#e5e9f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] p-6 shadow-sm">
          <p className="text-xs font-bold tracking-wide text-[#94a3b8] dark:text-slate-500 uppercase">Ajustes registrados</p>
          <p className="mt-3 text-3xl font-extrabold text-[#0f172a] dark:text-white">{filas.length}</p>
        </div>
        <div className="rounded-2xl border border-[#e5e9f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] p-6 shadow-sm">
          <p className="text-xs font-bold tracking-wide text-[#94a3b8] dark:text-slate-500 uppercase">Diferencia neta (unidades)</p>
          <p
            className={`mt-3 text-3xl font-extrabold ${
              diferenciaNeta < 0 ? 'text-red-600' : diferenciaNeta > 0 ? 'text-emerald-600' : 'text-[#0f172a] dark:text-white'
            }`}
          >
            {diferenciaNeta > 0 ? '+' : ''}
            {diferenciaNeta}
          </p>
        </div>
        <div className="rounded-2xl border border-[#e5e9f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] p-6 shadow-sm">
          <p className="text-xs font-bold tracking-wide text-[#94a3b8] dark:text-slate-500 uppercase">Valor neto ajustado</p>
          <p
            className={`mt-3 text-3xl font-extrabold ${
              valorNeto < 0 ? 'text-red-600' : valorNeto > 0 ? 'text-emerald-600' : 'text-[#0f172a] dark:text-white'
            }`}
          >
            {valorNeto > 0 ? '+' : ''}S/ {valorNeto.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[400px_1fr]">
        <div className="rounded-3xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] p-7 shadow-lg shadow-slate-500/5">
          <h2 className="text-base font-extrabold text-[#1e293b] dark:text-slate-100">Registrar ajuste</h2>
          {!productos || productos.length === 0 ? (
            <p className="mt-6 text-sm font-medium text-[#64748b] dark:text-slate-400">
              Todavía no hay productos — crea uno primero en Productos.
            </p>
          ) : (
            <AjusteForm productos={productos} />
          )}
        </div>

        <MovimientosTabla movimientos={filas} />
      </div>
    </div>
  )
}
