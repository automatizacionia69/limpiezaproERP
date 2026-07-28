import { createClient } from '@/lib/supabase/server'
import { MovimientoForm } from './movimiento-form'

const TIPO_BADGE: Record<string, string> = {
  entrada: 'bg-emerald-50 text-emerald-700',
  salida: 'bg-red-50 text-red-700',
  ajuste: 'bg-amber-50 text-amber-700',
}

const TIPO_LABELS: Record<string, string> = {
  entrada: 'Entrada',
  salida: 'Salida',
  ajuste: 'Ajuste',
}

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
        <h1 className="text-xl font-semibold text-[#2b303a]">Movimientos</h1>
        <p className="mt-0.5 text-[13px] text-[#7a8290]">Entradas, salidas y ajustes de inventario</p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
        <div className="rounded-2xl border border-[#e8ebf1] bg-white p-6 shadow-[0_1px_3px_rgba(31,37,51,.06)]">
          <h2 className="text-sm font-semibold text-[#2b303a]">Registrar movimiento</h2>
          {!productos || productos.length === 0 ? (
            <p className="mt-6 text-sm text-[#7a8290]">
              Todavía no hay productos — crea uno primero en Productos.
            </p>
          ) : (
            <MovimientoForm productos={productos} />
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#e8ebf1] bg-white shadow-[0_1px_3px_rgba(31,37,51,.06)]">
          <div className="border-b border-[#e8ebf1] px-5 py-4">
            <h2 className="text-sm font-semibold text-[#2b303a]">Movimientos recientes</h2>
          </div>
          {!movimientos || movimientos.length === 0 ? (
            <p className="p-10 text-center text-sm text-[#7a8290]">Todavía no hay movimientos registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13.5px]">
                <thead>
                  <tr className="border-b border-[#e8ebf1] text-[#7a8290]">
                    <th className="px-5 py-3 font-medium">Fecha</th>
                    <th className="px-5 py-3 font-medium">Producto</th>
                    <th className="px-5 py-3 font-medium">Tipo</th>
                    <th className="px-5 py-3 font-medium">Cantidad</th>
                    <th className="px-5 py-3 font-medium">Costo unit.</th>
                    <th className="px-5 py-3 font-medium">Saldo</th>
                    <th className="px-5 py-3 font-medium">Usuario</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map((m) => (
                    <tr key={m.id} className="border-b border-[#f1f3f7] text-[#2b303a] hover:bg-[#f8f9fb]">
                      <td className="px-5 py-3 whitespace-nowrap text-[#7a8290]">
                        {new Date(m.creado_en).toLocaleDateString('es-PE')}
                      </td>
                      <td className="px-5 py-3 font-medium">{m.producto_nombre}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                            TIPO_BADGE[m.tipo] ?? 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {TIPO_LABELS[m.tipo] ?? m.tipo}
                        </span>
                      </td>
                      <td className="px-5 py-3">{m.cantidad}</td>
                      <td className="px-5 py-3 text-[#7a8290]">
                        {m.costo_unitario !== null ? `S/ ${Number(m.costo_unitario).toFixed(2)}` : '—'}
                      </td>
                      <td className="px-5 py-3">{m.saldo_cantidad}</td>
                      <td className="px-5 py-3 text-[#7a8290]">{m.usuario_nombre ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
