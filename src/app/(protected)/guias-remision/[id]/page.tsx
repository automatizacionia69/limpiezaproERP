import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requierePermiso } from '@/lib/permisos'
import { TIPO_COMPROBANTE_LABELS } from '@/lib/motivos'
import { ImprimirBoton } from '@/components/imprimir-boton'
import { EditarGuiaForm } from './editar-guia-form'

type GuiaDetalle = {
  id: number
  numero: string
  fecha: string
  direccion_despacho: string | null
  observacion: string | null
  comprobantes: {
    numero: string
    tipo: string
    total: number
    clientes: { nombre: string; documento: string | null } | null
  } | null
}

export default async function GuiaRemisionPage({ params }: { params: Promise<{ id: string }> }) {
  await requierePermiso('guias_remision')
  const { id } = await params
  const supabase = await createClient()

  const [{ data: guia }, { data: configuracion }] = await Promise.all([
    supabase
      .from('guias_remision')
      .select(
        'id, numero, fecha, direccion_despacho, observacion, comprobantes(numero, tipo, total, clientes(nombre, documento))'
      )
      .eq('id', id)
      .single()
      .returns<GuiaDetalle>(),
    supabase.from('configuracion').select('empresa, ruc, direccion').eq('id', 1).single(),
  ])

  if (!guia) {
    notFound()
  }

  const comprobante = Array.isArray(guia.comprobantes) ? guia.comprobantes[0] : guia.comprobantes
  const cliente = comprobante && (Array.isArray(comprobante.clientes) ? comprobante.clientes[0] : comprobante.clientes)
  const tipoLabel = comprobante ? (TIPO_COMPROBANTE_LABELS[comprobante.tipo] ?? comprobante.tipo) : '—'

  return (
    <div>
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href="/guias-remision" className="text-sm font-bold text-[#64748b] dark:text-slate-400 hover:text-fuchsia-600">
          ← Volver a Guías de Remisión
        </Link>
        <ImprimirBoton className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-fuchsia-500/30 transition-all hover:-translate-y-0.5">
          🖨️ Imprimir
        </ImprimirBoton>
      </div>

      <div className="mx-auto max-w-4xl rounded-3xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] p-10 shadow-lg shadow-slate-500/5 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <div className="flex items-start justify-between gap-6 border-b-2 border-[#1e293b] dark:border-slate-600 pb-5">
          <div>
            <h1 className="text-xl font-extrabold text-[#1e293b] dark:text-slate-100">
              {configuracion?.empresa ?? 'Distribuidora LimpiezaPro'}
            </h1>
            <p className="mt-1 text-xs text-[#64748b] dark:text-slate-400">{configuracion?.direccion || 'Piura, Perú'}</p>
          </div>
          <div className="w-56 shrink-0 rounded-xl border-2 border-[#1e293b] dark:border-slate-600 p-4 text-center">
            {configuracion?.ruc && <p className="text-xs font-bold text-[#1e293b] dark:text-slate-100">RUC {configuracion.ruc}</p>}
            <p className="mt-1 text-sm font-extrabold tracking-wide text-[#1e293b] dark:text-slate-100 uppercase">Guía de Remisión</p>
            <p className="mt-1 text-lg font-extrabold text-fuchsia-600">{guia.numero}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div className="rounded-xl border border-[#e2e8f0] dark:border-slate-700 p-4">
            <p className="text-[10px] font-bold tracking-wide text-[#94a3b8] dark:text-slate-500 uppercase">Destinatario</p>
            <p className="mt-1 font-bold text-[#1e293b] dark:text-slate-100">{cliente?.nombre ?? '—'}</p>
            <p className="text-[#64748b] dark:text-slate-400">Documento: {cliente?.documento || '—'}</p>
            <p className="text-[#64748b] dark:text-slate-400">
              Dirección de despacho: {guia.direccion_despacho || '—'}
            </p>
          </div>
          <div className="rounded-xl border border-[#e2e8f0] dark:border-slate-700 p-4">
            <p className="text-[10px] font-bold tracking-wide text-[#94a3b8] dark:text-slate-500 uppercase">
              Comprobante anexado
            </p>
            <div className="mt-1.5 space-y-0.5">
              <p className="flex justify-between text-[#1e293b] dark:text-slate-100">
                <span className="text-[#64748b] dark:text-slate-400">Tipo</span>
                <span className="font-semibold">{tipoLabel}</span>
              </p>
              <p className="flex justify-between text-[#1e293b] dark:text-slate-100">
                <span className="text-[#64748b] dark:text-slate-400">Número</span>
                <span className="font-semibold">{comprobante?.numero ?? '—'}</span>
              </p>
              <p className="flex justify-between text-[#1e293b] dark:text-slate-100">
                <span className="text-[#64748b] dark:text-slate-400">Fecha de la guía</span>
                <span className="font-semibold">{new Date(`${guia.fecha}T00:00:00`).toLocaleDateString('es-PE')}</span>
              </p>
            </div>
          </div>
        </div>

        {guia.observacion && (
          <p className="mt-5 rounded-xl bg-[#f8fafc] dark:bg-slate-800/60 px-4 py-3 text-sm text-[#64748b] dark:text-slate-400">
            {guia.observacion}
          </p>
        )}

        <p className="mt-10 text-center text-[11px] text-[#94a3b8] dark:text-slate-500">
          Representación de guía de remisión generada por LimpiezaPro ERP — sin validez tributaria (sin
          integración con SUNAT).
        </p>
      </div>

      <div className="mx-auto mt-6 max-w-4xl rounded-3xl border-2 border-fuchsia-100 dark:border-fuchsia-900/40 bg-white dark:bg-[#141a2e] p-6 shadow-lg shadow-fuchsia-500/5 print:hidden">
        <h2 className="text-base font-extrabold text-[#1e293b] dark:text-slate-100">✏️ Editar guía</h2>
        <p className="mt-1 text-xs font-medium text-[#64748b] dark:text-slate-400">
          Corrige la dirección de despacho, la fecha o el número correlativo si hace falta.
        </p>
        <EditarGuiaForm guia={{ id: guia.id, numero: guia.numero, fecha: guia.fecha, direccion_despacho: guia.direccion_despacho, observacion: guia.observacion }} />
      </div>
    </div>
  )
}
