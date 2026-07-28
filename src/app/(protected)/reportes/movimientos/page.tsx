import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DescargarCsvBoton } from '@/components/descargar-csv-boton'
import { ImprimirBoton } from '@/components/imprimir-boton'

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
  valor_movimiento: number | null
  usuario_nombre: string | null
  motivo: string | null
  creado_en: string
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

function haceUnMesISO() {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return d.toISOString().slice(0, 10)
}

export default async function ReporteMovimientosPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>
}) {
  const { desde = haceUnMesISO(), hasta = hoyISO() } = await searchParams

  const supabase = await createClient()
  const { data: configuracion } = await supabase
    .from('configuracion')
    .select('empresa')
    .eq('id', 1)
    .single()
  const { data: movimientos } = await supabase
    .from('kardex_valorizado')
    .select('id, producto_nombre, tipo, cantidad, costo_unitario, valor_movimiento, usuario_nombre, motivo, creado_en')
    .gte('creado_en', `${desde}T00:00:00`)
    .lte('creado_en', `${hasta}T23:59:59`)
    .order('creado_en', { ascending: false })
    .returns<KardexRow[]>()

  const filas = movimientos ?? []

  const filasCsv = filas.map((m) => [
    new Date(m.creado_en).toLocaleString('es-PE'),
    m.producto_nombre,
    TIPO_LABELS[m.tipo] ?? m.tipo,
    m.cantidad,
    m.costo_unitario !== null ? Number(m.costo_unitario).toFixed(2) : '',
    m.valor_movimiento !== null ? Number(m.valor_movimiento).toFixed(2) : '',
    m.motivo ?? '',
    m.usuario_nombre ?? '',
  ])

  return (
    <div>
      <div className="print:hidden">
        <Link href="/reportes" className="text-sm font-bold text-[#64748b] hover:text-amber-600">
          ← Volver a Reportes
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-extrabold text-[#1e293b]">🔄 Reporte de Movimientos</h1>
          <div className="flex gap-3">
            <DescargarCsvBoton
              nombreArchivo={`movimientos-${desde}-a-${hasta}.csv`}
              encabezados={['Fecha', 'Producto', 'Tipo', 'Cantidad', 'Costo unitario', 'Valor', 'Motivo', 'Usuario']}
              filas={filasCsv}
              className="flex items-center gap-2 rounded-xl border-2 border-[#e2e8f0] bg-white px-5 py-3 text-sm font-bold text-[#1e293b] transition-all hover:border-amber-300 hover:bg-amber-50"
            >
              ⬇️ Descargar CSV
            </DescargarCsvBoton>
            <ImprimirBoton className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-amber-500/30 transition-all hover:-translate-y-0.5">
              🖨️ Imprimir
            </ImprimirBoton>
          </div>
        </div>

        <form method="get" className="mt-5 flex flex-wrap items-end gap-3 rounded-2xl border-2 border-[#e2e8f0] bg-white p-5">
          <div>
            <label className="block text-xs font-bold text-[#64748b]">Desde</label>
            <input
              type="date"
              name="desde"
              defaultValue={desde}
              className="mt-1 rounded-xl border-2 border-[#e2e8f0] bg-white px-3 py-2 text-sm text-[#1e293b] outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#64748b]">Hasta</label>
            <input
              type="date"
              name="hasta"
              defaultValue={hasta}
              className="mt-1 rounded-xl border-2 border-[#e2e8f0] bg-white px-3 py-2 text-sm text-[#1e293b] outline-none focus:border-amber-500"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-amber-500/30 transition-all hover:bg-amber-600"
          >
            Filtrar
          </button>
        </form>
      </div>

      <div className="mt-6 overflow-hidden rounded-3xl border-2 border-[#e2e8f0] bg-white shadow-lg shadow-slate-500/5 print:rounded-none print:border-0 print:shadow-none">
        <div className="hidden border-b-2 border-[#f1f5f9] p-6 print:block">
          <h2 className="text-xl font-extrabold">
            {configuracion?.empresa ?? 'Distribuidora LimpiezaPro'} — Reporte de Movimientos
          </h2>
          <p className="text-sm text-[#64748b]">
            Del {desde} al {hasta} · Generado: {new Date().toLocaleString('es-PE')}
          </p>
        </div>

        <p className="border-b-2 border-[#f1f5f9] px-6 py-4 text-sm font-medium text-[#64748b] print:hidden">
          {filas.length} movimiento{filas.length === 1 ? '' : 's'} entre {desde} y {hasta}
        </p>

        {filas.length === 0 ? (
          <p className="p-12 text-center text-sm font-medium text-[#64748b]">
            No hay movimientos en ese rango de fechas.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead>
                <tr className="border-b-2 border-[#f1f5f9] bg-[#f8fafc] text-[#64748b] print:bg-transparent">
                  <th className="px-6 py-3 font-bold">Fecha</th>
                  <th className="px-6 py-3 font-bold">Producto</th>
                  <th className="px-6 py-3 font-bold">Tipo</th>
                  <th className="px-6 py-3 font-bold">Cantidad</th>
                  <th className="px-6 py-3 font-bold">Costo unit.</th>
                  <th className="px-6 py-3 font-bold">Valor</th>
                  <th className="px-6 py-3 font-bold">Motivo</th>
                  <th className="px-6 py-3 font-bold">Usuario</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((m) => (
                  <tr key={m.id} className="border-b border-[#f1f5f9] text-[#1e293b]">
                    <td className="px-6 py-2.5 whitespace-nowrap text-[#64748b]">
                      {new Date(m.creado_en).toLocaleDateString('es-PE')}
                    </td>
                    <td className="px-6 py-2.5 font-semibold">{m.producto_nombre}</td>
                    <td className="px-6 py-2.5">{TIPO_LABELS[m.tipo] ?? m.tipo}</td>
                    <td className="px-6 py-2.5">{m.cantidad}</td>
                    <td className="px-6 py-2.5 text-[#64748b]">
                      {m.costo_unitario !== null ? `S/ ${Number(m.costo_unitario).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-6 py-2.5 text-[#64748b]">
                      {m.valor_movimiento !== null ? `S/ ${Number(m.valor_movimiento).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-6 py-2.5 text-[#64748b]">{m.motivo ?? '—'}</td>
                    <td className="px-6 py-2.5 text-[#64748b]">{m.usuario_nombre ?? '—'}</td>
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
