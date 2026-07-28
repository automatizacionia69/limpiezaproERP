import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DescargarCsvBoton } from '@/components/descargar-csv-boton'
import { ImprimirBoton } from '@/components/imprimir-boton'

type ProductoRow = {
  id: number
  nombre: string
  codigo: string | null
  cantidad: number
  costo: number
  categorias: { nombre: string } | null
  unidades_medida: { nombre: string } | null
}

export default async function ReporteInventarioPage() {
  const supabase = await createClient()
  const { data: productos } = await supabase
    .from('productos')
    .select('id, nombre, codigo, cantidad, costo, categorias(nombre), unidades_medida(nombre)')
    .order('nombre')
    .returns<ProductoRow[]>()

  const filas = productos ?? []
  const valorTotal = filas.reduce((acc, p) => acc + Number(p.cantidad) * Number(p.costo), 0)

  const filasCsv = filas.map((p) => [
    p.codigo ?? '',
    p.nombre,
    p.categorias?.nombre ?? '',
    p.unidades_medida?.nombre ?? '',
    p.cantidad,
    Number(p.costo).toFixed(2),
    (Number(p.cantidad) * Number(p.costo)).toFixed(2),
  ])

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <Link href="/reportes" className="text-sm font-bold text-[#64748b] hover:text-indigo-600">
            ← Volver a Reportes
          </Link>
          <h1 className="mt-2 text-2xl font-extrabold text-[#1e293b]">📦 Inventario valorizado</h1>
        </div>
        <div className="flex gap-3">
          <DescargarCsvBoton
            nombreArchivo={`inventario-valorizado-${new Date().toISOString().slice(0, 10)}.csv`}
            encabezados={['Código', 'Producto', 'Categoría', 'Unidad', 'Cantidad', 'Costo unitario', 'Valor total']}
            filas={filasCsv}
            className="flex items-center gap-2 rounded-xl border-2 border-[#e2e8f0] bg-white px-5 py-3 text-sm font-bold text-[#1e293b] transition-all hover:border-indigo-300 hover:bg-indigo-50"
          >
            ⬇️ Descargar CSV
          </DescargarCsvBoton>
          <ImprimirBoton className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-0.5">
            🖨️ Imprimir
          </ImprimirBoton>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-3xl border-2 border-[#e2e8f0] bg-white shadow-lg shadow-slate-500/5 print:rounded-none print:border-0 print:shadow-none">
        <div className="hidden border-b-2 border-[#f1f5f9] p-6 print:block">
          <h2 className="text-xl font-extrabold">Distribuidora LimpiezaPro — Inventario valorizado</h2>
          <p className="text-sm text-[#64748b]">Generado: {new Date().toLocaleString('es-PE')}</p>
        </div>

        <div className="flex items-center justify-between border-b-2 border-[#f1f5f9] px-6 py-4 print:hidden">
          <p className="text-sm font-medium text-[#64748b]">{filas.length} productos</p>
          <p className="text-lg font-extrabold text-indigo-600">Valor total: S/ {valorTotal.toFixed(2)}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13.5px]">
            <thead>
              <tr className="border-b-2 border-[#f1f5f9] bg-[#f8fafc] text-[#64748b] print:bg-transparent">
                <th className="px-6 py-3 font-bold">Código</th>
                <th className="px-6 py-3 font-bold">Producto</th>
                <th className="px-6 py-3 font-bold">Categoría</th>
                <th className="px-6 py-3 font-bold">Unidad</th>
                <th className="px-6 py-3 font-bold">Cantidad</th>
                <th className="px-6 py-3 font-bold">Costo unit.</th>
                <th className="px-6 py-3 text-right font-bold">Valor total</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((p) => (
                <tr key={p.id} className="border-b border-[#f1f5f9] text-[#1e293b]">
                  <td className="px-6 py-2.5 text-[#64748b]">{p.codigo ?? '—'}</td>
                  <td className="px-6 py-2.5 font-semibold">{p.nombre}</td>
                  <td className="px-6 py-2.5 text-[#64748b]">{p.categorias?.nombre ?? '—'}</td>
                  <td className="px-6 py-2.5 text-[#64748b]">{p.unidades_medida?.nombre ?? '—'}</td>
                  <td className="px-6 py-2.5">{p.cantidad}</td>
                  <td className="px-6 py-2.5 text-[#64748b]">S/ {Number(p.costo).toFixed(2)}</td>
                  <td className="px-6 py-2.5 text-right font-semibold">
                    S/ {(Number(p.cantidad) * Number(p.costo)).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#f1f5f9] font-extrabold text-[#1e293b]">
                <td colSpan={6} className="px-6 py-4 text-right">
                  Valor total del inventario
                </td>
                <td className="px-6 py-4 text-right text-indigo-600">S/ {valorTotal.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
