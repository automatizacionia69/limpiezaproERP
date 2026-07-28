import { createClient } from '@/lib/supabase/server'
import { MovimientoForm } from './movimiento-form'
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

export default async function MovimientosPage() {
  const supabase = await createClient()

  const [{ data: productos }, { data: movimientos }] = await Promise.all([
    supabase.from('productos').select('id, nombre').order('nombre'),
    supabase
      .from('kardex_valorizado')
      .select(
        'id, producto_nombre, tipo, cantidad, costo_unitario, saldo_cantidad, usuario_nombre, motivo, creado_en'
      )
      .order('creado_en', { ascending: false })
      .limit(20)
      .returns<KardexRow[]>(),
  ])

  return (
    <div>
      <div>
        <h1 className="text-2xl font-extrabold text-[#1e293b]">🔄 Movimientos</h1>
        <p className="mt-1 text-sm font-medium text-[#64748b]">Entradas, salidas y ajustes de inventario</p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[400px_1fr]">
        <div className="rounded-3xl border-2 border-[#e2e8f0] bg-white p-7 shadow-lg shadow-slate-500/5">
          <h2 className="text-base font-extrabold text-[#1e293b]">Registrar movimiento</h2>
          {!productos || productos.length === 0 ? (
            <p className="mt-6 text-sm font-medium text-[#64748b]">
              Todavía no hay productos — crea uno primero en Productos.
            </p>
          ) : (
            <MovimientoForm productos={productos} />
          )}
        </div>

        <MovimientosTabla movimientos={movimientos ?? []} />
      </div>
    </div>
  )
}
