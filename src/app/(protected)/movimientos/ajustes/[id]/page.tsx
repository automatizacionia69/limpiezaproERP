import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requierePermiso } from '@/lib/permisos'
import { MOTIVOS_AJUSTE } from '../constantes'

const MOTIVO_LABELS: Record<string, string> = Object.fromEntries(MOTIVOS_AJUSTE.map((m) => [m.valor, m.label]))

type CabeceraRaw = {
  id: number
  numero: string
  fecha: string
  motivo: string
  motivo_otro: string | null
  observaciones: string | null
  estado: string
  creado_en: string
  usuarios_perfil: { nombre: string } | { nombre: string }[] | null
}

type ItemRaw = {
  id: number
  cantidad: number
  efecto_cantidad: number
  costo_unitario: number | null
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

export default async function VerAjustePage({ params }: { params: Promise<{ id: string }> }) {
  await requierePermiso('movimientos')
  const { id } = await params
  const supabase = await createClient()

  const [{ data: cabecera }, { data: items }] = await Promise.all([
    supabase
      .from('ajustes_cabecera')
      .select('id, numero, fecha, motivo, motivo_otro, observaciones, estado, creado_en, usuarios_perfil(nombre)')
      .eq('id', id)
      .maybeSingle<CabeceraRaw>(),
    supabase
      .from('movimientos')
      .select('id, cantidad, efecto_cantidad, costo_unitario, productos(nombre, codigo)')
      .eq('ajuste_cabecera_id', id)
      .order('id')
      .returns<ItemRaw[]>(),
  ])

  if (!cabecera) notFound()

  const usuario = Array.isArray(cabecera.usuarios_perfil) ? cabecera.usuarios_perfil[0] : cabecera.usuarios_perfil
  const filas = items ?? []
  const diferenciaNeta = filas.reduce((acc, it) => acc + Number(it.efecto_cantidad), 0)
  const valorNeto = filas.reduce((acc, it) => acc + Number(it.efecto_cantidad) * Number(it.costo_unitario ?? 0), 0)
  const esFinalizado = cabecera.estado === 'finalizado'

  return (
    <div>
      <Link href="/movimientos/ajustes" className="text-sm font-bold text-[#64748b] dark:text-slate-400 hover:text-amber-600">
        ← Volver a Ajustes
      </Link>

      <div className="mx-auto mt-4 max-w-4xl rounded-3xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] p-8 shadow-lg shadow-slate-500/5 sm:p-10">
        {!esFinalizado && (
          <div className="mb-6 rounded-xl border-2 border-red-300 bg-red-50 px-4 py-2.5 text-center text-sm font-extrabold tracking-wide text-red-700 uppercase">
            🚫 Ajuste anulado
          </div>
        )}

        <div className="flex items-start justify-between gap-6 border-b-2 border-[#1e293b] dark:border-slate-600 pb-5">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-2xl dark:bg-amber-950/40">
              ⚖️
            </span>
            <div>
              <h1 className="text-xl font-extrabold text-[#1e293b] dark:text-slate-100">Ajuste de inventario</h1>
              <p className="mt-1 text-xs text-[#64748b] dark:text-slate-400">
                Registrado el {new Date(cabecera.creado_en).toLocaleString('es-PE')}
              </p>
              <p className="text-xs text-[#64748b] dark:text-slate-400">Responsable: {usuario?.nombre ?? '—'}</p>
            </div>
          </div>
          <div className="w-52 shrink-0 rounded-xl border-2 border-[#1e293b] dark:border-slate-600 p-4 text-center">
            <p className="text-sm font-extrabold tracking-wide text-[#1e293b] dark:text-slate-100 uppercase">Ajuste</p>
            <p className="mt-1 text-lg font-extrabold text-amber-600">{cabecera.numero}</p>
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
          <div className={`rounded-xl border border-[#e2e8f0] dark:border-slate-700 p-4 ${!cabecera.observaciones ? 'sm:col-span-2' : ''}`}>
            <p className="text-[10px] font-bold tracking-wide text-[#94a3b8] dark:text-slate-500 uppercase">Datos del ajuste</p>
            <div className="mt-1.5 space-y-0.5 divide-y divide-dashed divide-[#e2e8f0] dark:divide-slate-800">
              <Fila etiqueta="Fecha del ajuste" valor={new Date(`${cabecera.fecha}T00:00:00`).toLocaleDateString('es-PE')} />
              <Fila etiqueta="Motivo" valor={cabecera.motivo === 'otro' ? cabecera.motivo_otro : MOTIVO_LABELS[cabecera.motivo] ?? cabecera.motivo} />
              <Fila etiqueta="Responsable" valor={usuario?.nombre ?? '—'} />
            </div>
          </div>
          {cabecera.observaciones && (
            <div className="rounded-xl border border-[#e2e8f0] dark:border-slate-700 p-4">
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
                <th className="py-2 text-right font-bold">Conteo físico</th>
                <th className="py-2 text-right font-bold">Diferencia</th>
                <th className="py-2 text-right font-bold">Costo unit.</th>
                <th className="py-2 text-right font-bold">Valor ajustado</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((it) => {
                const producto = Array.isArray(it.productos) ? it.productos[0] : it.productos
                const diferencia = Number(it.efecto_cantidad)
                return (
                  <tr key={it.id} className="border-b border-[#f1f5f9] dark:border-slate-800">
                    <td className="py-2.5">
                      <span className="font-semibold text-[#1e293b] dark:text-slate-100">{producto?.nombre ?? '—'}</span>
                      {producto?.codigo && <span className="ml-2 text-xs text-[#94a3b8] dark:text-slate-500">{producto.codigo}</span>}
                    </td>
                    <td className="py-2.5 text-right">{it.cantidad}</td>
                    <td
                      className={`py-2.5 text-right font-semibold ${
                        diferencia > 0 ? 'text-emerald-600' : diferencia < 0 ? 'text-red-600' : ''
                      }`}
                    >
                      {diferencia > 0 ? '+' : ''}
                      {diferencia}
                    </td>
                    <td className="py-2.5 text-right">S/ {Number(it.costo_unitario ?? 0).toFixed(2)}</td>
                    <td
                      className={`py-2.5 text-right font-semibold ${
                        diferencia > 0 ? 'text-emerald-600' : diferencia < 0 ? 'text-red-600' : ''
                      }`}
                    >
                      {diferencia > 0 ? '+' : ''}S/ {(diferencia * Number(it.costo_unitario ?? 0)).toFixed(2)}
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
              <span>Diferencia neta</span>
              <span
                className={`font-semibold ${
                  diferenciaNeta > 0 ? 'text-emerald-600' : diferenciaNeta < 0 ? 'text-red-600' : 'text-[#1e293b] dark:text-slate-100'
                }`}
              >
                {diferenciaNeta > 0 ? '+' : ''}
                {diferenciaNeta}
              </span>
            </p>
            <p className="flex justify-between border-t-2 border-[#1e293b] dark:border-slate-600 pt-2 text-lg font-extrabold">
              <span>Valor neto ajustado</span>
              <span className={valorNeto > 0 ? 'text-emerald-600' : valorNeto < 0 ? 'text-red-600' : 'text-amber-600'}>
                {valorNeto > 0 ? '+' : ''}S/ {valorNeto.toFixed(2)}
              </span>
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
