import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requierePermiso } from '@/lib/permisos'
import { MOTIVOS_SALIDA, DOCUMENTOS_GRUPOS } from '../constantes'

const MOTIVO_LABELS: Record<string, string> = Object.fromEntries(MOTIVOS_SALIDA.map((m) => [m.valor, m.label]))
const DOCUMENTO_LABELS: Record<string, string> = Object.fromEntries(
  DOCUMENTOS_GRUPOS.flatMap((g) => g.opciones.map((o) => [o.valor, o.label]))
)

type CabeceraRaw = {
  id: number
  numero: string
  fecha: string
  motivo: string
  motivo_otro: string | null
  proveedor_ruc: string | null
  proveedor_razon_social: string | null
  documento_tipo: string | null
  documento_otro: string | null
  documento_serie: string | null
  documento_correlativo: string | null
  observaciones: string | null
  estado: string
  creado_en: string
  usuarios_perfil: { nombre: string } | { nombre: string }[] | null
}

type ItemRaw = {
  id: number
  cantidad: number
  costo_unitario: number | null
  lote: string | null
  fecha_vencimiento: string | null
  productos: { nombre: string; codigo: string | null } | { nombre: string; codigo: string | null }[] | null
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <p className="flex items-baseline justify-between gap-4 py-1 text-sm text-[#1e293b] dark:text-slate-100">
      <span className="text-[#64748b] dark:text-slate-400">{etiqueta}</span>
      <span className="text-right font-semibold">{valor}</span>
    </p>
  )
}

export default async function VerSalidaPage({ params }: { params: Promise<{ id: string }> }) {
  await requierePermiso('movimientos')
  const { id } = await params
  const supabase = await createClient()

  const [{ data: cabecera }, { data: items }, { data: configuracion }] = await Promise.all([
    supabase
      .from('salidas_cabecera')
      .select(
        'id, numero, fecha, motivo, motivo_otro, proveedor_ruc, proveedor_razon_social, documento_tipo, documento_otro, documento_serie, documento_correlativo, observaciones, estado, creado_en, usuarios_perfil(nombre)'
      )
      .eq('id', id)
      .maybeSingle<CabeceraRaw>(),
    supabase
      .from('movimientos')
      .select('id, cantidad, costo_unitario, lote, fecha_vencimiento, productos(nombre, codigo)')
      .eq('salida_cabecera_id', id)
      .order('id')
      .returns<ItemRaw[]>(),
    supabase.from('configuracion').select('usa_lote_vencimiento').eq('id', 1).single(),
  ])

  const usaLoteVencimiento = configuracion?.usa_lote_vencimiento ?? false

  if (!cabecera) notFound()

  const usuario = Array.isArray(cabecera.usuarios_perfil) ? cabecera.usuarios_perfil[0] : cabecera.usuarios_perfil
  const filas = items ?? []
  const totalUnidades = filas.reduce((acc, it) => acc + Number(it.cantidad), 0)
  const totalValor = filas.reduce((acc, it) => acc + Number(it.cantidad) * Number(it.costo_unitario ?? 0), 0)
  const comprobante = cabecera.documento_tipo
    ? cabecera.documento_tipo === 'otro'
      ? cabecera.documento_otro
      : DOCUMENTO_LABELS[cabecera.documento_tipo]
    : null
  const numeroDocumento = [cabecera.documento_serie, cabecera.documento_correlativo].filter(Boolean).join('-')
  const esFinalizado = cabecera.estado === 'finalizado'

  return (
    <div>
      <Link href="/movimientos/salidas" className="text-sm font-bold text-[#64748b] dark:text-slate-400 hover:text-red-600">
        ← Volver a Salidas
      </Link>

      <div className="mx-auto mt-4 max-w-4xl rounded-3xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] p-8 shadow-lg shadow-slate-500/5 sm:p-10">
        {!esFinalizado && (
          <div className="mb-6 rounded-xl border-2 border-red-300 bg-red-50 px-4 py-2.5 text-center text-sm font-extrabold tracking-wide text-red-700 uppercase">
            🚫 Salida anulada
          </div>
        )}

        <div className="flex items-start justify-between gap-6 border-b-2 border-[#1e293b] dark:border-slate-600 pb-5">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-2xl dark:bg-red-950/40">
              📤
            </span>
            <div>
              <h1 className="text-xl font-extrabold text-[#1e293b] dark:text-slate-100">Salida de mercadería</h1>
              <p className="mt-1 text-xs text-[#64748b] dark:text-slate-400">
                Registrada el {new Date(cabecera.creado_en).toLocaleString('es-PE')}
              </p>
              <p className="text-xs text-[#64748b] dark:text-slate-400">Responsable: {usuario?.nombre ?? '—'}</p>
            </div>
          </div>
          <div className="w-52 shrink-0 rounded-xl border-2 border-[#1e293b] dark:border-slate-600 p-4 text-center">
            <p className="text-sm font-extrabold tracking-wide text-[#1e293b] dark:text-slate-100 uppercase">Salida</p>
            <p className="mt-1 text-lg font-extrabold text-red-600">{cabecera.numero}</p>
            <span
              className={`mt-2 inline-block rounded-full px-3 py-1 text-[11px] font-bold ${
                esFinalizado ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {esFinalizado ? 'FINALIZADO' : 'ANULADA'}
            </span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div className="rounded-xl border border-[#e2e8f0] dark:border-slate-700 p-4">
            <p className="text-[10px] font-bold tracking-wide text-[#94a3b8] dark:text-slate-500 uppercase">Datos de la salida</p>
            <div className="mt-1.5 space-y-0.5 divide-y divide-dashed divide-[#e2e8f0] dark:divide-slate-800">
              <Fila etiqueta="Fecha de salida" valor={new Date(`${cabecera.fecha}T00:00:00`).toLocaleDateString('es-PE')} />
              <Fila etiqueta="Motivo" valor={cabecera.motivo === 'otro' ? cabecera.motivo_otro : MOTIVO_LABELS[cabecera.motivo] ?? cabecera.motivo} />
              <Fila etiqueta="Responsable" valor={usuario?.nombre ?? '—'} />
            </div>
          </div>
          <div className="rounded-xl border border-[#e2e8f0] dark:border-slate-700 p-4">
            <p className="text-[10px] font-bold tracking-wide text-[#94a3b8] dark:text-slate-500 uppercase">Proveedor y documento</p>
            <div className="mt-1.5 space-y-0.5 divide-y divide-dashed divide-[#e2e8f0] dark:divide-slate-800">
              <Fila etiqueta="Proveedor" valor={cabecera.proveedor_razon_social ?? '—'} />
              <Fila etiqueta="RUC" valor={cabecera.proveedor_ruc ?? '—'} />
              <Fila etiqueta="Documento" valor={comprobante ?? 'Sin documento'} />
              {numeroDocumento && <Fila etiqueta="N° documento" valor={numeroDocumento} />}
            </div>
          </div>
          {cabecera.observaciones && (
            <div className="rounded-xl border border-[#e2e8f0] dark:border-slate-700 p-4 sm:col-span-2">
              <p className="text-[10px] font-bold tracking-wide text-[#94a3b8] dark:text-slate-500 uppercase">Observaciones</p>
              <p className="mt-1.5 text-sm text-[#1e293b] dark:text-slate-100">{cabecera.observaciones}</p>
            </div>
          )}
        </div>

        <p className="mt-8 text-[10px] font-bold tracking-wide text-[#94a3b8] dark:text-slate-500 uppercase">
          Ítems ({filas.length})
        </p>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-y-2 border-[#1e293b] dark:border-slate-600 text-[#1e293b] dark:text-slate-100">
                <th className="py-2 font-bold">Producto</th>
                {usaLoteVencimiento && (
                  <>
                    <th className="py-2 font-bold">Lote</th>
                    <th className="py-2 font-bold">Vencimiento</th>
                  </>
                )}
                <th className="py-2 text-right font-bold">Cantidad</th>
                <th className="py-2 text-right font-bold">Costo unit.</th>
                <th className="py-2 text-right font-bold">Total</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((it) => {
                const producto = Array.isArray(it.productos) ? it.productos[0] : it.productos
                return (
                  <tr key={it.id} className="border-b border-[#f1f5f9] dark:border-slate-800">
                    <td className="py-2.5">
                      <span className="font-semibold text-[#1e293b] dark:text-slate-100">{producto?.nombre ?? '—'}</span>
                      {producto?.codigo && <span className="ml-2 text-xs text-[#94a3b8] dark:text-slate-500">{producto.codigo}</span>}
                    </td>
                    {usaLoteVencimiento && (
                      <>
                        <td className="py-2.5 text-[#64748b] dark:text-slate-400">{it.lote ?? '—'}</td>
                        <td className="py-2.5 text-[#64748b] dark:text-slate-400">
                          {it.fecha_vencimiento ? new Date(`${it.fecha_vencimiento}T00:00:00`).toLocaleDateString('es-PE') : '—'}
                        </td>
                      </>
                    )}
                    <td className="py-2.5 text-right">{it.cantidad}</td>
                    <td className="py-2.5 text-right">S/ {Number(it.costo_unitario ?? 0).toFixed(2)}</td>
                    <td className="py-2.5 text-right font-semibold">
                      S/ {(Number(it.cantidad) * Number(it.costo_unitario ?? 0)).toFixed(2)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end">
          <div className="w-64 space-y-1.5 rounded-xl border border-[#e2e8f0] dark:border-slate-700 p-4">
            <p className="flex justify-between text-sm text-[#64748b] dark:text-slate-400">
              <span>Unidades</span>
              <span className="font-semibold text-[#1e293b] dark:text-slate-100">{totalUnidades}</span>
            </p>
            <p className="flex justify-between border-t-2 border-[#1e293b] dark:border-slate-600 pt-2 text-lg font-extrabold text-red-600">
              <span>Valor total</span>
              <span>S/ {totalValor.toFixed(2)}</span>
            </p>
          </div>
        </div>

        <p className="mt-10 text-center text-[11px] text-[#94a3b8] dark:text-slate-500">
          Registro interno de inventario — LimpiezaPro ERP.
        </p>
      </div>
    </div>
  )
}
