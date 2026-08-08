import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requierePermiso } from '@/lib/permisos'
import { IGV_TASA, calcularImportes } from '@/lib/cotizaciones'
import { AFECTACION_IGV_DEFAULT } from '@/lib/afectacion-igv'

const ESTADO_BADGE: Record<string, string> = {
  pendiente: 'bg-amber-100 text-amber-700',
  recibida: 'bg-emerald-100 text-emerald-700',
  anulada: 'bg-slate-100 text-slate-500',
}

const ESTADO_EMOJI: Record<string, string> = {
  pendiente: '⏳',
  recibida: '✅',
  anulada: '🚫',
}

const ESTADO_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  recibida: 'Recibida',
  anulada: 'Anulada',
}

const TIPO_DOCUMENTO_LABELS: Record<string, string> = {
  factura: 'Factura',
  boleta: 'Boleta',
  guia_remision: 'Guía de remisión',
}

type OrdenDetalle = {
  id: number
  numero: string
  estado: string
  total: number
  creado_en: string
  recibida_en: string | null
  fecha_registro: string
  tipo_documento: string
  documento_serie: string | null
  documento_numero: string | null
  observacion: string | null
  proveedores: { nombre: string } | { nombre: string }[] | null
}

type LineaDetalle = {
  cantidad: number
  costo_unitario: number
  productos: { nombre: string; sku: string } | { nombre: string; sku: string }[] | null
}

function unoDe<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v
}

export default async function DetalleCompraPage({ params }: { params: Promise<{ id: string }> }) {
  await requierePermiso('compras')
  const { id } = await params
  const supabase = await createClient()

  const { data: orden } = await supabase
    .from('ordenes_compra')
    .select(
      'id, numero, estado, total, creado_en, recibida_en, fecha_registro, tipo_documento, documento_serie, documento_numero, observacion, proveedores(nombre)'
    )
    .eq('id', id)
    .single()
    .returns<OrdenDetalle>()

  if (!orden) {
    notFound()
  }

  const proveedor = unoDe(orden.proveedores)

  const { data: lineas } = await supabase
    .from('detalle_compra')
    .select('cantidad, costo_unitario, productos(nombre, sku)')
    .eq('orden_id', orden.id)
    .order('id')
    .returns<LineaDetalle[]>()

  const productos = (lineas ?? []).map((l) => ({
    cantidad: l.cantidad,
    costo_unitario: l.costo_unitario,
    ...unoDe(l.productos),
  }))

  const { subtotal, igv, total } = calcularImportes(
    productos.map((p) => ({ cantidad: p.cantidad, precio_unitario: p.costo_unitario, tipo_afectacion_igv: AFECTACION_IGV_DEFAULT }))
  )

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Link href="/compras" className="text-sm font-bold text-[#64748b] dark:text-slate-400 hover:text-pink-600">
          ← Volver a Compras
        </Link>
      </div>

      <div className="mx-auto max-w-4xl rounded-3xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] p-8 shadow-lg shadow-slate-500/5">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-[#f1f5f9] dark:border-slate-800 pb-5">
          <div>
            <h1 className="text-2xl font-extrabold text-[#1e293b] dark:text-slate-100">🛒 Orden {orden.numero}</h1>
            <p className="mt-1 text-sm font-medium text-[#64748b] dark:text-slate-400">
              Creada el {new Date(orden.creado_en).toLocaleDateString('es-PE')}
              {orden.recibida_en && ` — recibida el ${new Date(orden.recibida_en).toLocaleDateString('es-PE')}`}
            </p>
          </div>
          <span
            className={`rounded-full px-4 py-1.5 text-xs font-bold ${ESTADO_BADGE[orden.estado] ?? 'bg-slate-100 text-slate-700'}`}
          >
            {ESTADO_EMOJI[orden.estado] ?? ''} {ESTADO_LABELS[orden.estado] ?? orden.estado}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div className="rounded-xl border border-[#e2e8f0] dark:border-slate-700 p-4">
            <p className="text-[10px] font-bold tracking-wide text-[#94a3b8] dark:text-slate-500 uppercase">Proveedor</p>
            <p className="mt-1 font-bold text-[#1e293b] dark:text-slate-100">{proveedor?.nombre ?? '—'}</p>
          </div>
          <div className="rounded-xl border border-[#e2e8f0] dark:border-slate-700 p-4">
            <p className="text-[10px] font-bold tracking-wide text-[#94a3b8] dark:text-slate-500 uppercase">
              Documento del proveedor
            </p>
            <p className="mt-1 font-bold text-[#1e293b] dark:text-slate-100">
              {TIPO_DOCUMENTO_LABELS[orden.tipo_documento] ?? orden.tipo_documento}
              {orden.documento_serie && orden.documento_numero && (
                <span className="ml-1">
                  {orden.documento_serie}-{orden.documento_numero}
                </span>
              )}
            </p>
            <p className="mt-0.5 text-xs text-[#64748b] dark:text-slate-400">
              Fecha de registro: {new Date(`${orden.fecha_registro}T00:00:00`).toLocaleDateString('es-PE')}
            </p>
          </div>
        </div>

        {productos.length > 0 && (
          <div className="mt-6">
            <p className="text-[10px] font-bold tracking-wide text-[#94a3b8] dark:text-slate-500 uppercase">Productos</p>
            <div className="mt-2 overflow-x-auto rounded-xl border border-[#e2e8f0] dark:border-slate-700">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#e2e8f0] dark:border-slate-700 bg-[#f8fafc] dark:bg-slate-800/60 text-[#64748b] dark:text-slate-400">
                    <th className="px-4 py-2.5 font-bold">SKU</th>
                    <th className="px-4 py-2.5 font-bold">Producto</th>
                    <th className="px-4 py-2.5 text-right font-bold">Cantidad</th>
                    <th className="px-4 py-2.5 text-right font-bold">Costo unitario</th>
                    <th className="px-4 py-2.5 text-right font-bold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {productos.map((p, i) => (
                    <tr key={i} className="border-b border-[#f1f5f9] dark:border-slate-800 last:border-0">
                      <td className="px-4 py-2.5 text-[#64748b] dark:text-slate-400">{p.sku || '—'}</td>
                      <td className="px-4 py-2.5 text-[#1e293b] dark:text-slate-100">{p.nombre ?? '—'}</td>
                      <td className="px-4 py-2.5 text-right text-[#1e293b] dark:text-slate-100">{p.cantidad}</td>
                      <td className="px-4 py-2.5 text-right text-[#1e293b] dark:text-slate-100">
                        S/ {Number(p.costo_unitario).toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-[#1e293b] dark:text-slate-100">
                        S/ {(p.cantidad * p.costo_unitario).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 space-y-1 text-right">
              <p className="text-sm text-[#64748b] dark:text-slate-400">
                Subtotal (sin IGV): <span className="font-bold text-[#1e293b] dark:text-slate-100">S/ {subtotal.toFixed(2)}</span>
              </p>
              <p className="text-sm text-[#64748b] dark:text-slate-400">
                IGV ({(IGV_TASA * 100).toFixed(0)}%): <span className="font-bold text-[#1e293b] dark:text-slate-100">S/ {igv.toFixed(2)}</span>
              </p>
              <p className="text-lg font-extrabold text-pink-600">Total: S/ {total.toFixed(2)}</p>
            </div>
          </div>
        )}

        {orden.observacion && (
          <p className="mt-6 rounded-xl bg-[#f8fafc] dark:bg-slate-800/60 px-4 py-3 text-sm text-[#64748b] dark:text-slate-400">
            {orden.observacion}
          </p>
        )}
      </div>
    </div>
  )
}
