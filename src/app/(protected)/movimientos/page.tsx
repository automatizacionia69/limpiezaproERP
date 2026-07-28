import { createClient } from '@/lib/supabase/server'
import { MovimientoForm } from './movimiento-form'

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
      .select('id, producto_nombre, tipo, cantidad, costo_unitario, saldo_cantidad, usuario_nombre, motivo, creado_en')
      .order('creado_en', { ascending: false })
      .limit(20)
      .returns<KardexRow[]>(),
  ])

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[380px_1fr]">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Registrar movimiento</h1>
        {!productos || productos.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">
            Todavía no hay productos — crea uno primero en Productos.
          </p>
        ) : (
          <MovimientoForm productos={productos} />
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold text-slate-900">Movimientos recientes</h2>
        {!movimientos || movimientos.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">Todavía no hay movimientos registrados.</p>
        ) : (
          <table className="mt-6 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2">Fecha</th>
                <th className="py-2">Producto</th>
                <th className="py-2">Tipo</th>
                <th className="py-2">Cantidad</th>
                <th className="py-2">Costo unit.</th>
                <th className="py-2">Saldo</th>
                <th className="py-2">Usuario</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map((m) => (
                <tr key={m.id} className="border-b border-slate-100 text-slate-800">
                  <td className="py-2 whitespace-nowrap">
                    {new Date(m.creado_en).toLocaleDateString('es-PE')}
                  </td>
                  <td className="py-2">{m.producto_nombre}</td>
                  <td className="py-2">{TIPO_LABELS[m.tipo] ?? m.tipo}</td>
                  <td className="py-2">{m.cantidad}</td>
                  <td className="py-2">{m.costo_unitario ?? '—'}</td>
                  <td className="py-2">{m.saldo_cantidad}</td>
                  <td className="py-2">{m.usuario_nombre ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
