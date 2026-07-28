import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requierePermiso } from '@/lib/permisos'

const TIPO_BADGE: Record<string, string> = {
  entrada: 'bg-emerald-100 text-emerald-700',
  salida: 'bg-red-100 text-red-700',
  ajuste: 'bg-amber-100 text-amber-700',
}

const TIPO_EMOJI: Record<string, string> = {
  entrada: '📥',
  salida: '📤',
  ajuste: '⚖️',
}

const TIPO_LABELS: Record<string, string> = {
  entrada: 'Entrada',
  salida: 'Salida',
  ajuste: 'Ajuste',
}

type KardexRow = {
  id: number
  tipo: string
  cantidad: number
  efecto_cantidad: number
  costo_unitario: number | null
  valor_movimiento: number | null
  saldo_cantidad: number
  saldo_valor: number
  usuario_nombre: string | null
  motivo: string | null
  referencia: string | null
  creado_en: string
}

export default async function KardexProductoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requierePermiso('productos')
  const { id } = await params
  const supabase = await createClient()

  const [{ data: producto }, { data: movimientos }] = await Promise.all([
    supabase.from('productos').select('id, nombre, codigo, cantidad, costo').eq('id', id).single(),
    supabase
      .from('kardex_valorizado')
      .select(
        'id, tipo, cantidad, efecto_cantidad, costo_unitario, valor_movimiento, saldo_cantidad, saldo_valor, usuario_nombre, motivo, referencia, creado_en'
      )
      .eq('producto_id', id)
      .order('creado_en', { ascending: false })
      .returns<KardexRow[]>(),
  ])

  if (!producto) {
    notFound()
  }

  return (
    <div>
      <Link href="/productos" className="text-sm font-bold text-[#64748b] hover:text-indigo-600">
        ← Volver a Productos
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1e293b]">📊 Kardex — {producto.nombre}</h1>
          <p className="mt-1 text-sm font-medium text-[#64748b]">
            {producto.codigo ? `Código: ${producto.codigo} · ` : ''}
            {movimientos?.length ?? 0} movimiento{(movimientos?.length ?? 0) === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex gap-3">
          <div className="rounded-2xl border-2 border-indigo-100 bg-white px-5 py-3 text-center shadow-sm">
            <p className="text-[11px] font-bold text-[#64748b]">Stock actual</p>
            <p className="text-xl font-extrabold text-[#1e293b]">{producto.cantidad}</p>
          </div>
          <div className="rounded-2xl border-2 border-emerald-100 bg-white px-5 py-3 text-center shadow-sm">
            <p className="text-[11px] font-bold text-[#64748b]">Costo promedio</p>
            <p className="text-xl font-extrabold text-[#1e293b]">S/ {Number(producto.costo).toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-3xl border-2 border-[#e2e8f0] bg-white shadow-lg shadow-slate-500/5">
        {!movimientos || movimientos.length === 0 ? (
          <p className="p-12 text-center text-sm font-medium text-[#64748b]">
            Este producto todavía no tiene movimientos registrados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead>
                <tr className="border-b-2 border-[#f1f5f9] bg-[#f8fafc] text-[#64748b]">
                  <th className="px-6 py-4 font-bold">Fecha</th>
                  <th className="px-6 py-4 font-bold">Tipo</th>
                  <th className="px-6 py-4 font-bold">Cantidad</th>
                  <th className="px-6 py-4 font-bold">Costo unit.</th>
                  <th className="px-6 py-4 font-bold">Valor mov.</th>
                  <th className="px-6 py-4 font-bold">Saldo cant.</th>
                  <th className="px-6 py-4 font-bold">Saldo valor</th>
                  <th className="px-6 py-4 font-bold">Motivo</th>
                  <th className="px-6 py-4 font-bold">Usuario</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((m) => (
                  <tr key={m.id} className="border-b border-[#f1f5f9] text-[#1e293b] transition-colors hover:bg-indigo-50/40">
                    <td className="px-6 py-4 whitespace-nowrap text-[#64748b]">
                      {new Date(m.creado_en).toLocaleString('es-PE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${TIPO_BADGE[m.tipo] ?? 'bg-slate-100 text-slate-700'}`}>
                        {TIPO_EMOJI[m.tipo] ?? ''} {TIPO_LABELS[m.tipo] ?? m.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold">
                      {m.efecto_cantidad > 0 ? '+' : ''}
                      {m.efecto_cantidad}
                    </td>
                    <td className="px-6 py-4 text-[#64748b]">
                      {m.costo_unitario !== null ? `S/ ${Number(m.costo_unitario).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-6 py-4 text-[#64748b]">
                      {m.valor_movimiento !== null ? `S/ ${Number(m.valor_movimiento).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-6 py-4 font-bold">{m.saldo_cantidad}</td>
                    <td className="px-6 py-4 font-bold text-indigo-600">S/ {Number(m.saldo_valor).toFixed(2)}</td>
                    <td className="px-6 py-4 text-[#64748b]">{m.motivo ?? '—'}</td>
                    <td className="px-6 py-4 text-[#64748b]">{m.usuario_nombre ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
