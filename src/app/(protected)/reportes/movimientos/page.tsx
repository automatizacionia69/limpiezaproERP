import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requierePermiso } from '@/lib/permisos'
import { hoyPeruISO, haceUnMesPeruISO, inicioDiaPeru, finDiaPeru } from '@/lib/fecha'
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

export default async function ReporteMovimientosPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>
}) {
  await requierePermiso('reportes')
  const { desde = haceUnMesPeruISO(), hasta = hoyPeruISO() } = await searchParams

  const supabase = await createClient()
  const { data: configuracion } = await supabase
    .from('configuracion')
    .select('empresa')
    .eq('id', 1)
    .single()
  const { data: movimientos } = await supabase
    .from('kardex_valorizado')
    .select('id, producto_nombre, tipo, cantidad, costo_unitario, valor_movimiento, usuario_nombre, motivo, creado_en')
    .gte('creado_en', inicioDiaPeru(desde))
    .lte('creado_en', finDiaPeru(hasta))
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
        <Link href="/reportes" className="text-sm font-bold text-[#64748b] dark:text-slate-400 hover:text-amber-600">
          ← Volver a Reportes
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-extrabold text-[#1e293b] dark:text-slate-100">🔄 Reporte de Movimientos</h1>
          <div className="flex gap-3">
            <DescargarCsvBoton
              nombreArchivo={`movimientos-${desde}-a-${hasta}.csv`}
              encabezados={['Fecha', 'Producto', 'Tipo', 'Cantidad', 'Costo unitario', 'Valor', 'Motivo', 'Usuario']}
              filas={filasCsv}
              className="flex items-center gap-2 rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-5 py-3 text-sm font-bold text-[#1e293b] dark:text-slate-100 transition-all hover:border-amber-300 hover:bg-amber-50"
            >
              ⬇️ Descargar CSV
            </DescargarCsvBoton>
            <ImprimirBoton className="flex items-center gap-2 rounded-md bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-amber-500/30 transition-all active:scale-95">
              🖨️ Imprimir
            </ImprimirBoton>
          </div>
        </div>

        <form method="get" className="mt-5 flex flex-wrap items-end gap-3 rounded-2xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] p-5">
          <div>
            <label className="block text-xs font-bold text-[#64748b] dark:text-slate-400">Desde</label>
            <input
              type="date"
              name="desde"
              defaultValue={desde}
              className="mt-1 rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-3 py-2 text-sm text-[#1e293b] dark:text-slate-100 outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#64748b] dark:text-slate-400">Hasta</label>
            <input
              type="date"
              name="hasta"
              defaultValue={hasta}
              className="mt-1 rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-3 py-2 text-sm text-[#1e293b] dark:text-slate-100 outline-none focus:border-amber-500"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-amber-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-amber-500/30 transition-all hover:bg-amber-600 active:scale-95"
          >
            Filtrar
          </button>
        </form>
      </div>

      <div className="mt-6 overflow-hidden rounded-3xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] shadow-lg shadow-slate-500/5 print:rounded-none print:border-0 print:shadow-none">
        <div className="hidden border-b-2 border-[#f1f5f9] dark:border-slate-800 p-6 print:block">
          <h2 className="text-xl font-extrabold">
            {configuracion?.empresa ?? 'Distribuidora LimpiezaPro'} — Reporte de Movimientos
          </h2>
          <p className="text-sm text-[#64748b] dark:text-slate-400">
            Del {desde} al {hasta} · Generado: {new Date().toLocaleString('es-PE')}
          </p>
        </div>

        <p className="border-b-2 border-[#f1f5f9] dark:border-slate-800 px-6 py-4 text-sm font-medium text-[#64748b] dark:text-slate-400 print:hidden">
          {filas.length} movimiento{filas.length === 1 ? '' : 's'} entre {desde} y {hasta}
        </p>

        {filas.length === 0 ? (
          <p className="p-12 text-center text-sm font-medium text-[#64748b] dark:text-slate-400">
            No hay movimientos en ese rango de fechas.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead>
                <tr className="border-b-2 border-[#f1f5f9] dark:border-slate-800 bg-[#f8fafc] dark:bg-slate-800/60 text-[#64748b] dark:text-slate-400 print:bg-transparent">
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
                  <tr key={m.id} className="border-b border-[#f1f5f9] dark:border-slate-800 text-[#1e293b] dark:text-slate-100">
                    <td className="px-6 py-2.5 whitespace-nowrap text-[#64748b] dark:text-slate-400">
                      {new Date(m.creado_en).toLocaleDateString('es-PE')}
                    </td>
                    <td className="px-6 py-2.5 font-semibold">{m.producto_nombre}</td>
                    <td className="px-6 py-2.5">{TIPO_LABELS[m.tipo] ?? m.tipo}</td>
                    <td className="px-6 py-2.5">{m.cantidad}</td>
                    <td className="px-6 py-2.5 text-[#64748b] dark:text-slate-400">
                      {m.costo_unitario !== null ? `S/ ${Number(m.costo_unitario).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-6 py-2.5 text-[#64748b] dark:text-slate-400">
                      {m.valor_movimiento !== null ? `S/ ${Number(m.valor_movimiento).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-6 py-2.5 text-[#64748b] dark:text-slate-400">{m.motivo ?? '—'}</td>
                    <td className="px-6 py-2.5 text-[#64748b] dark:text-slate-400">{m.usuario_nombre ?? '—'}</td>
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
