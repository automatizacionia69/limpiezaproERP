import { createClient } from '@/lib/supabase/server'
import { requierePermiso } from '@/lib/permisos'
import { MovimientosTabla } from './movimientos-tabla'

type KardexRow = {
  id: number
  producto_nombre: string
  tipo: string
  cantidad: number
  costo_unitario: number | null
  saldo_cantidad: number
  usuario_nombre: string | null
  motivo: string | null
  creado_en: string
}

const TARJETAS = [
  { tipo: 'entrada', label: 'Entradas', emoji: '📥', clase: 'text-emerald-600 dark:text-emerald-400' },
  { tipo: 'salida', label: 'Salidas', emoji: '📤', clase: 'text-red-600 dark:text-red-400' },
  { tipo: 'ajuste', label: 'Ajustes', emoji: '⚖️', clase: 'text-amber-600 dark:text-amber-400' },
] as const

export default async function MovimientosPage() {
  await requierePermiso('movimientos')
  const supabase = await createClient()

  const { data: movimientos } = await supabase
    .from('kardex_valorizado')
    .select('id, producto_nombre, tipo, cantidad, costo_unitario, saldo_cantidad, usuario_nombre, motivo, creado_en')
    .order('creado_en', { ascending: false })
    .limit(200)
    .returns<KardexRow[]>()

  const filas = movimientos ?? []
  const conteoPorTipo = TARJETAS.map((t) => ({
    ...t,
    cantidad: filas.filter((m) => m.tipo === t.tipo).length,
  }))

  return (
    <div>
      <div>
        <h1 className="text-2xl font-extrabold text-[#1e293b] dark:text-slate-100">🔄 Movimientos</h1>
        <p className="mt-1 text-sm font-medium text-[#64748b] dark:text-slate-400">
          Historial de entradas, salidas y ajustes de inventario. Para registrar uno nuevo, usa Entradas, Salidas o
          Ajustes en el menú.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {conteoPorTipo.map((t) => (
          <div
            key={t.tipo}
            className="rounded-2xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] p-6 shadow-sm"
          >
            <p className="text-xs font-bold tracking-wide text-[#94a3b8] dark:text-slate-500 uppercase">
              {t.emoji} {t.label} (últimos {filas.length})
            </p>
            <p className={`mt-3 text-3xl font-extrabold ${t.clase}`}>{t.cantidad}</p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <MovimientosTabla movimientos={filas} />
      </div>
    </div>
  )
}
