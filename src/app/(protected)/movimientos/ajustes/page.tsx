import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requierePermiso } from '@/lib/permisos'
import { hoyPeruISO } from '@/lib/fecha'
import { AgregarAjusteForm } from './agregar-ajuste-form'
import { AjustesTabla, type AjusteCabeceraRow } from './ajustes-tabla'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  almacen: 'Almacén',
  ventas: 'Ventas',
}

type CabeceraRaw = {
  id: number
  numero: string
  fecha: string
  motivo: string
  motivo_otro: string | null
  estado: string
  usuarios_perfil: { nombre: string } | { nombre: string }[] | null
}

export default async function AjustesPage() {
  await requierePermiso('movimientos')
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: perfil }, { data: productos }, { data: cabecerasRaw }] = await Promise.all([
    user
      ? supabase.from('usuarios_perfil').select('nombre, rol').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
    supabase.from('productos').select('id, nombre, codigo, cantidad').eq('activo', true).order('nombre'),
    supabase
      .from('ajustes_cabecera')
      .select('id, numero, fecha, motivo, motivo_otro, estado, usuarios_perfil(nombre)')
      .order('creado_en', { ascending: false })
      .limit(200)
      .returns<CabeceraRaw[]>(),
  ])

  const cabeceras = cabecerasRaw ?? []
  const idsCabecera = cabeceras.map((c) => c.id)
  const { data: lineasPorCabecera } =
    idsCabecera.length > 0
      ? await supabase
          .from('movimientos')
          .select('ajuste_cabecera_id, efecto_cantidad, costo_unitario')
          .in('ajuste_cabecera_id', idsCabecera)
      : { data: [] as { ajuste_cabecera_id: number | null; efecto_cantidad: number; costo_unitario: number | null }[] }

  const agregadosPorCabecera = new Map<number, { lineas: number; diferencia: number }>()
  let valorNetoTotal = 0
  for (const l of lineasPorCabecera ?? []) {
    if (l.ajuste_cabecera_id === null) continue
    const actual = agregadosPorCabecera.get(l.ajuste_cabecera_id) ?? { lineas: 0, diferencia: 0 }
    actual.lineas += 1
    actual.diferencia += Number(l.efecto_cantidad)
    agregadosPorCabecera.set(l.ajuste_cabecera_id, actual)
    valorNetoTotal += Number(l.efecto_cantidad) * Number(l.costo_unitario ?? 0)
  }

  const filasCabecera: AjusteCabeceraRow[] = cabeceras.map((c) => {
    const agregado = agregadosPorCabecera.get(c.id) ?? { lineas: 0, diferencia: 0 }
    const usuario = Array.isArray(c.usuarios_perfil) ? c.usuarios_perfil[0] : c.usuarios_perfil
    return {
      id: c.id,
      numero: c.numero,
      fecha: c.fecha,
      motivo: c.motivo,
      motivoOtro: c.motivo_otro,
      estado: c.estado,
      usuarioNombre: usuario?.nombre ?? null,
      numeroLineas: agregado.lineas,
      diferenciaNeta: agregado.diferencia,
    }
  })

  const diferenciaNetaTotal = filasCabecera.reduce((acc, c) => acc + c.diferenciaNeta, 0)

  return (
    <div>
      <Link href="/movimientos" className="text-sm font-bold text-[#64748b] dark:text-slate-400 hover:text-amber-600">
        ← Volver a Movimientos
      </Link>

      <div className="mt-2">
        <h1 className="text-2xl font-extrabold text-[#1e293b] dark:text-slate-100">⚖️ Ajustes</h1>
        <p className="mt-1 text-sm font-medium text-[#64748b] dark:text-slate-400">Correcciones de inventario por conteo físico</p>
      </div>

      <div className="mt-6">
        <AgregarAjusteForm
          usuarioNombre={perfil?.nombre ?? '—'}
          usuarioRol={perfil ? ROLE_LABELS[perfil.rol] ?? perfil.rol : '—'}
          productos={productos ?? []}
          fechaHoy={hoyPeruISO()}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#e5e9f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] p-6 shadow-sm">
          <p className="text-xs font-bold tracking-wide text-[#94a3b8] dark:text-slate-500 uppercase">Ajustes registrados</p>
          <p className="mt-3 text-3xl font-extrabold text-[#0f172a] dark:text-white">{cabeceras.length}</p>
        </div>
        <div className="rounded-2xl border border-[#e5e9f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] p-6 shadow-sm">
          <p className="text-xs font-bold tracking-wide text-[#94a3b8] dark:text-slate-500 uppercase">Diferencia neta (unidades)</p>
          <p
            className={`mt-3 text-3xl font-extrabold ${
              diferenciaNetaTotal < 0 ? 'text-red-600' : diferenciaNetaTotal > 0 ? 'text-emerald-600' : 'text-[#0f172a] dark:text-white'
            }`}
          >
            {diferenciaNetaTotal > 0 ? '+' : ''}
            {diferenciaNetaTotal}
          </p>
        </div>
        <div className="rounded-2xl border border-[#e5e9f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] p-6 shadow-sm">
          <p className="text-xs font-bold tracking-wide text-[#94a3b8] dark:text-slate-500 uppercase">Valor neto ajustado</p>
          <p
            className={`mt-3 text-3xl font-extrabold ${
              valorNetoTotal < 0 ? 'text-red-600' : valorNetoTotal > 0 ? 'text-emerald-600' : 'text-[#0f172a] dark:text-white'
            }`}
          >
            {valorNetoTotal > 0 ? '+' : ''}S/ {valorNetoTotal.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <AjustesTabla ajustes={filasCabecera} />
      </div>
    </div>
  )
}
