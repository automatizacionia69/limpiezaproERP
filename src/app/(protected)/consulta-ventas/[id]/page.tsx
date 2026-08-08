import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requierePermiso } from '@/lib/permisos'
import { TIPO_COMPROBANTE_LABELS, calcularFechaVencimiento } from '@/lib/motivos'
import { ImprimirBoton } from '@/components/imprimir-boton'
import { LogoEmpresa } from '@/components/logo-empresa'
import { ReenviarNubefactBoton } from './reenviar-nubefact-boton'
import { calcularImportes } from '@/lib/cotizaciones'

type DetalleRow = {
  id: number
  producto_id: number
  cantidad: number
  precio_unitario: number
  tipo_afectacion_igv: string
  productos: { nombre: string } | null
}

type NotaCreditoRow = {
  id: number
  numero: string
  motivo: string
  anula_operacion: boolean
  monto: number
  observacion: string | null
  creado_en: string
}

type NotaDebitoRow = {
  id: number
  numero: string
  motivo: string
  monto: number
  observacion: string | null
  creado_en: string
}

export default async function ComprobantePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requierePermiso('consulta_ventas')
  const { id } = await params
  const supabase = await createClient()

  const { data: comprobante } = await supabase
    .from('comprobantes')
    .select(
      'id, tipo, serie, numero, subtotal, igv, total, estado, creado_en, fecha_emision, dias_credito, medio_pago, orden_venta_id, clientes(nombre, documento, direccion), vendedor:vendedor_id(nombre), nubefact_estado, nubefact_enlace_pdf, nubefact_enlace_xml, nubefact_enlace_cdr, nubefact_error'
    )
    .eq('id', id)
    .single()

  if (!comprobante) {
    notFound()
  }

  const cliente = Array.isArray(comprobante.clientes) ? comprobante.clientes[0] : comprobante.clientes
  const vendedor = Array.isArray(comprobante.vendedor) ? comprobante.vendedor[0] : comprobante.vendedor

  const [{ data: detalles }, { data: notasCredito }, { data: notasDebito }, { data: configuracion }] =
    await Promise.all([
      supabase
        .from('detalle_venta')
        .select('id, producto_id, cantidad, precio_unitario, tipo_afectacion_igv, productos(nombre)')
        .eq('orden_id', comprobante.orden_venta_id)
        .returns<DetalleRow[]>(),
      supabase
        .from('notas_credito')
        .select('id, numero, motivo, anula_operacion, monto, observacion, creado_en')
        .eq('comprobante_id', comprobante.id)
        .order('creado_en', { ascending: false })
        .returns<NotaCreditoRow[]>(),
      supabase
        .from('notas_debito')
        .select('id, numero, motivo, monto, observacion, creado_en')
        .eq('comprobante_id', comprobante.id)
        .order('creado_en', { ascending: false })
        .returns<NotaDebitoRow[]>(),
      supabase.from('configuracion').select('empresa, ruc, direccion, telefono').eq('id', 1).single(),
    ])

  const { opGravada, opExonerada, opInafecta } = calcularImportes(
    (detalles ?? []).map((d) => ({
      cantidad: Number(d.cantidad),
      precio_unitario: Number(d.precio_unitario),
      tipo_afectacion_igv: d.tipo_afectacion_igv,
    }))
  )

  const totalNotasCredito = (notasCredito ?? []).reduce((acc, n) => acc + Number(n.monto), 0)
  const totalNotasDebito = (notasDebito ?? []).reduce((acc, n) => acc + Number(n.monto), 0)
  const saldoActual = Math.max(0, Number(comprobante.total) - totalNotasCredito + totalNotasDebito)

  const tipoLabel = TIPO_COMPROBANTE_LABELS[comprobante.tipo] ?? comprobante.tipo

  return (
    <div>
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href="/consulta-ventas" className="text-sm font-bold text-[#64748b] dark:text-slate-400 hover:text-lime-600">
          ← Volver a Consulta de Ventas
        </Link>
        <ImprimirBoton className="flex items-center gap-2 rounded-md bg-gradient-to-r from-lime-500 to-green-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-lime-500/30 transition-all active:scale-95">
          🖨️ Imprimir
        </ImprimirBoton>
      </div>

      <div className="mx-auto max-w-4xl rounded-3xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] p-10 shadow-lg shadow-slate-500/5 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
        {comprobante.estado === 'anulado' && (
          <div className="mb-6 rounded-xl border-2 border-red-300 bg-red-50 px-4 py-2.5 text-center text-sm font-extrabold tracking-wide text-red-700 uppercase">
            🚫 Comprobante anulado
          </div>
        )}

        <div className="flex items-start justify-between gap-6 border-b-2 border-[#1e293b] dark:border-slate-600 pb-5">
          <div className="flex items-start gap-4">
            <LogoEmpresa className="h-14 w-14 shrink-0 object-contain" fallback={null} />
            <div>
              <h1 className="text-xl font-extrabold text-[#1e293b] dark:text-slate-100">
                {configuracion?.empresa ?? 'Distribuidora LimpiezaPro'}
              </h1>
              <p className="mt-1 text-xs text-[#64748b] dark:text-slate-400">
                {configuracion?.direccion || 'Piura, Perú'}
              </p>
              <p className="text-xs text-[#64748b] dark:text-slate-400">{configuracion?.telefono && `Teléfono: ${configuracion.telefono}`}</p>
            </div>
          </div>
          <div className="w-56 shrink-0 rounded-xl border-2 border-[#1e293b] dark:border-slate-600 p-4 text-center">
            {configuracion?.ruc && <p className="text-xs font-bold text-[#1e293b] dark:text-slate-100">RUC {configuracion.ruc}</p>}
            <p className="mt-1 text-sm font-extrabold tracking-wide text-[#1e293b] dark:text-slate-100 uppercase">{tipoLabel}</p>
            <p className="mt-1 text-lg font-extrabold text-lime-600">{comprobante.numero}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div className="rounded-xl border border-[#e2e8f0] dark:border-slate-700 p-4">
            <p className="text-[10px] font-bold tracking-wide text-[#94a3b8] dark:text-slate-500 uppercase">Cliente</p>
            <p className="mt-1 font-bold text-[#1e293b] dark:text-slate-100">{cliente?.nombre ?? '—'}</p>
            <p className="text-[#64748b] dark:text-slate-400">
              {comprobante.tipo === 'factura' ? 'RUC' : 'Documento'}: {cliente?.documento || '—'}
            </p>
            {cliente?.direccion && <p className="text-[#64748b] dark:text-slate-400">{cliente.direccion}</p>}
          </div>
          <div className="rounded-xl border border-[#e2e8f0] dark:border-slate-700 p-4">
            <p className="text-[10px] font-bold tracking-wide text-[#94a3b8] dark:text-slate-500 uppercase">Datos de la venta</p>
            <div className="mt-1.5 space-y-0.5">
              <p className="flex justify-between text-[#1e293b] dark:text-slate-100">
                <span className="text-[#64748b] dark:text-slate-400">Fecha de emisión</span>
                <span className="font-semibold">
                  {new Date(`${comprobante.fecha_emision}T00:00:00`).toLocaleDateString('es-PE')}
                </span>
              </p>
              <p className="flex justify-between text-[#1e293b] dark:text-slate-100">
                <span className="text-[#64748b] dark:text-slate-400">Días de crédito</span>
                <span className="font-semibold">{comprobante.dias_credito}</span>
              </p>
              <p className="flex justify-between text-[#1e293b] dark:text-slate-100">
                <span className="text-[#64748b] dark:text-slate-400">
                  {comprobante.dias_credito === 'Contado' ? 'Condición de pago' : 'Fecha de vencimiento'}
                </span>
                <span className="font-semibold">
                  {calcularFechaVencimiento(comprobante.fecha_emision, comprobante.dias_credito)}
                </span>
              </p>
              <p className="flex justify-between text-[#1e293b] dark:text-slate-100">
                <span className="text-[#64748b] dark:text-slate-400">Medio de pago</span>
                <span className="font-semibold">{comprobante.medio_pago}</span>
              </p>
              <p className="flex justify-between text-[#1e293b] dark:text-slate-100">
                <span className="text-[#64748b] dark:text-slate-400">Vendedor</span>
                <span className="font-semibold">{vendedor?.nombre ?? '—'}</span>
              </p>
            </div>
          </div>
        </div>

        <table className="mt-6 w-full text-left text-sm">
          <thead>
            <tr className="border-y-2 border-[#1e293b] dark:border-slate-600 text-[#1e293b] dark:text-slate-100">
              <th className="py-2 font-bold">Descripción</th>
              <th className="py-2 font-bold">Cantidad</th>
              <th className="py-2 font-bold">P. unit.</th>
              <th className="py-2 text-right font-bold">Valor venta</th>
            </tr>
          </thead>
          <tbody>
            {(detalles ?? []).map((d) => (
              <tr key={d.id} className="border-b border-[#f1f5f9] dark:border-slate-800">
                <td className="py-2.5">{d.productos?.nombre ?? '—'}</td>
                <td className="py-2.5">{d.cantidad}</td>
                <td className="py-2.5">S/ {Number(d.precio_unitario).toFixed(2)}</td>
                <td className="py-2.5 text-right">
                  S/ {(Number(d.cantidad) * Number(d.precio_unitario)).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 flex justify-end">
          <div className="w-64 space-y-1.5 rounded-xl border border-[#e2e8f0] dark:border-slate-700 p-4">
            {(opExonerada > 0 || opInafecta > 0) ? (
              <>
                {opGravada > 0 && (
                  <p className="flex justify-between text-sm text-[#64748b] dark:text-slate-400">
                    <span>Op. gravada</span>
                    <span className="font-semibold text-[#1e293b] dark:text-slate-100">S/ {opGravada.toFixed(2)}</span>
                  </p>
                )}
                {opExonerada > 0 && (
                  <p className="flex justify-between text-sm text-[#64748b] dark:text-slate-400">
                    <span>Op. exonerada</span>
                    <span className="font-semibold text-[#1e293b] dark:text-slate-100">S/ {opExonerada.toFixed(2)}</span>
                  </p>
                )}
                {opInafecta > 0 && (
                  <p className="flex justify-between text-sm text-[#64748b] dark:text-slate-400">
                    <span>Op. inafecta</span>
                    <span className="font-semibold text-[#1e293b] dark:text-slate-100">S/ {opInafecta.toFixed(2)}</span>
                  </p>
                )}
                <p className="flex justify-between text-sm text-[#64748b] dark:text-slate-400">
                  <span>IGV (18%)</span>
                  <span className="font-semibold text-[#1e293b] dark:text-slate-100">S/ {Number(comprobante.igv).toFixed(2)}</span>
                </p>
              </>
            ) : (
              <>
                <p className="flex justify-between text-sm text-[#64748b] dark:text-slate-400">
                  <span>Op. gravada</span>
                  <span className="font-semibold text-[#1e293b] dark:text-slate-100">S/ {Number(comprobante.subtotal).toFixed(2)}</span>
                </p>
                <p className="flex justify-between text-sm text-[#64748b] dark:text-slate-400">
                  <span>IGV (18%)</span>
                  <span className="font-semibold text-[#1e293b] dark:text-slate-100">S/ {Number(comprobante.igv).toFixed(2)}</span>
                </p>
              </>
            )}
            <p className="flex justify-between border-t-2 border-[#1e293b] dark:border-slate-600 pt-2 text-lg font-extrabold text-[#1e293b] dark:text-slate-100">
              <span>Importe total</span>
              <span>S/ {Number(comprobante.total).toFixed(2)}</span>
            </p>
            {(totalNotasCredito > 0 || totalNotasDebito > 0) && (
              <p className="flex justify-between border-t border-dashed border-[#e2e8f0] dark:border-slate-700 pt-2 text-sm font-bold text-lime-700">
                <span>Saldo actual a pagar</span>
                <span>S/ {saldoActual.toFixed(2)}</span>
              </p>
            )}
          </div>
        </div>

        {((notasCredito && notasCredito.length > 0) || (notasDebito && notasDebito.length > 0)) && (
          <div className="mt-8 border-t-2 border-[#f1f5f9] dark:border-slate-800 pt-6">
            <p className="text-xs font-bold tracking-wide text-[#94a3b8] dark:text-slate-500 uppercase">Notas asociadas</p>
            <div className="mt-3 space-y-2">
              {(notasCredito ?? []).map((n) => (
                <div key={`nc-${n.id}`} className="flex items-center justify-between rounded-xl bg-red-50 px-4 py-2.5 text-sm">
                  <div>
                    <span className="font-bold text-red-700">{n.numero}</span>{' '}
                    <span className="text-[#64748b] dark:text-slate-400">
                      — Nota de crédito · {n.motivo} · anexada a {tipoLabel} {comprobante.numero}
                    </span>
                    {n.observacion && <p className="text-xs text-[#94a3b8] dark:text-slate-500">{n.observacion}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-bold text-red-700">− S/ {Number(n.monto).toFixed(2)}</span>
                    <Link href={`/consulta-ventas/notas-credito/${n.id}`} className="text-xs font-bold text-red-600 underline print:hidden">
                      Ver
                    </Link>
                  </div>
                </div>
              ))}
              {(notasDebito ?? []).map((n) => (
                <div key={`nd-${n.id}`} className="flex items-center justify-between rounded-xl bg-amber-50 px-4 py-2.5 text-sm">
                  <div>
                    <span className="font-bold text-amber-700">{n.numero}</span>{' '}
                    <span className="text-[#64748b] dark:text-slate-400">
                      — Nota de débito · {n.motivo} · anexada a {tipoLabel} {comprobante.numero}
                    </span>
                    {n.observacion && <p className="text-xs text-[#94a3b8] dark:text-slate-500">{n.observacion}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-bold text-amber-700">+ S/ {Number(n.monto).toFixed(2)}</span>
                    <Link href={`/consulta-ventas/notas-debito/${n.id}`} className="text-xs font-bold text-amber-700 underline print:hidden">
                      Ver
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="mt-10 text-center text-[11px] text-[#94a3b8] dark:text-slate-500">
          {comprobante.nubefact_estado === 'enviado'
            ? `Comprobante electrónico enviado a SUNAT vía NUBEFACT — representación de ${tipoLabel.toLowerCase()} generada por LimpiezaPro ERP.`
            : `Representación de ${tipoLabel.toLowerCase()} generada por LimpiezaPro ERP — sin validez tributaria (sin integración con SUNAT).`}
        </p>
      </div>

      {(comprobante.tipo === 'factura' || comprobante.tipo === 'boleta') && (
        <div className="mx-auto mt-6 max-w-5xl print:hidden">
          {comprobante.nubefact_estado === 'enviado' && (
            <div className="rounded-3xl border-2 border-emerald-100 bg-white dark:bg-[#141a2e] p-6 shadow-lg shadow-emerald-500/5">
              <h2 className="text-base font-extrabold text-[#1e293b] dark:text-slate-100">
                ✅ Enviado a SUNAT (NUBEFACT)
              </h2>
              <div className="mt-3 flex flex-wrap gap-3">
                {comprobante.nubefact_enlace_pdf && (
                  <a
                    href={comprobante.nubefact_enlace_pdf}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all active:scale-95"
                  >
                    📄 Descargar PDF
                  </a>
                )}
                {comprobante.nubefact_enlace_xml && (
                  <a
                    href={comprobante.nubefact_enlace_xml}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all active:scale-95"
                  >
                    🧾 Descargar XML
                  </a>
                )}
                {comprobante.nubefact_enlace_cdr ? (
                  <a
                    href={comprobante.nubefact_enlace_cdr}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all active:scale-95"
                  >
                    📋 Descargar CDR
                  </a>
                ) : (
                  <span className="self-center text-xs text-[#64748b] dark:text-slate-400">
                    CDR aún no disponible — SUNAT todavía no confirma la recepción.
                  </span>
                )}
              </div>
            </div>
          )}

          {comprobante.nubefact_estado === 'error' && (
            <div className="rounded-3xl border-2 border-red-100 bg-white dark:bg-[#141a2e] p-6 shadow-lg shadow-red-500/5">
              <h2 className="text-base font-extrabold text-[#1e293b] dark:text-slate-100">
                ⚠️ No se pudo enviar a SUNAT (NUBEFACT)
              </h2>
              <p className="mt-1 text-xs font-medium text-[#64748b] dark:text-slate-400">
                {comprobante.nubefact_error || 'Error desconocido.'}
              </p>
              <ReenviarNubefactBoton comprobanteId={comprobante.id} />
            </div>
          )}
        </div>
      )}

      {comprobante.estado === 'emitido' && (
        <div id="acciones" className="mx-auto mt-6 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-3 print:hidden">
          <Link
            href={`/consulta-ventas/${comprobante.id}/nota-credito`}
            className="flex items-center gap-3 rounded-2xl border-2 border-red-100 bg-white p-5 shadow-md shadow-red-500/5 transition-all hover:border-red-300 active:scale-95 dark:border-red-900/30 dark:bg-[#141a2e]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">🧾</span>
            <span>
              <span className="block text-sm font-extrabold text-[#1e293b] dark:text-slate-100">Nota de Crédito</span>
              <span className="block text-xs font-medium text-[#64748b] dark:text-slate-400">Descuento o devolución parcial</span>
            </span>
          </Link>

          <Link
            href={`/consulta-ventas/${comprobante.id}/nota-debito`}
            className="flex items-center gap-3 rounded-2xl border-2 border-amber-100 bg-white p-5 shadow-md shadow-amber-500/5 transition-all hover:border-amber-300 active:scale-95 dark:border-amber-900/30 dark:bg-[#141a2e]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">➕</span>
            <span>
              <span className="block text-sm font-extrabold text-[#1e293b] dark:text-slate-100">Nota de Débito</span>
              <span className="block text-xs font-medium text-[#64748b] dark:text-slate-400">Cargo adicional</span>
            </span>
          </Link>

          <Link
            href={`/consulta-ventas/${comprobante.id}/anular`}
            className="flex items-center gap-3 rounded-2xl border-2 border-red-200 bg-white p-5 shadow-md shadow-red-500/5 transition-all hover:border-red-400 active:scale-95 dark:border-red-900/40 dark:bg-[#141a2e]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white">🚫</span>
            <span>
              <span className="block text-sm font-extrabold text-[#1e293b] dark:text-slate-100">Anular documento</span>
              <span className="block text-xs font-medium text-[#64748b] dark:text-slate-400">Anula todo · Comunicación de Baja</span>
            </span>
          </Link>
        </div>
      )}
    </div>
  )
}
