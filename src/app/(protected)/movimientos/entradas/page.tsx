import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requierePermiso } from '@/lib/permisos'
import { hoyPeruISO } from '@/lib/fecha'
import { AgregarEntradaForm } from './agregar-entrada-form'
import { EntradasTabla, type EntradaCabeceraRow } from './entradas-tabla'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  almacen: 'Almacén',
  ventas: 'Ventas',
}

type KardexRow = {
  id: number
  producto_nombre: string
  tipo: string
  cantidad: number
  costo_unitario: number | null
  valor_movimiento: number | null
  saldo_cantidad: number
  usuario_nombre: string | null
  motivo: string | null
  creado_en: string
}

type CabeceraRaw = {
  id: number
  numero: string
  fecha: string
  motivo: string
  motivo_otro: string | null
  documento_tipo: string | null
  documento_otro: string | null
  documento_serie: string | null
  documento_correlativo: string | null
  proveedor_razon_social: string | null
  estado: string
  usuarios_perfil: { nombre: string } | { nombre: string }[] | null
}

export default async function EntradasPage() {
  await requierePermiso('movimientos')
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [
    { data: perfil },
    { data: configuracion },
    { data: proveedores },
    { data: productos },
    { data: entradas },
    { data: cabecerasRaw },
  ] = await Promise.all([
    user
      ? supabase.from('usuarios_perfil').select('nombre, rol').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
    supabase.from('configuracion').select('moneda, usa_lote_vencimiento').eq('id', 1).single(),
    supabase.from('proveedores').select('id, nombre, ruc').eq('activo', true).order('nombre'),
    supabase.from('productos').select('id, nombre, codigo, costo, cantidad').eq('activo', true).order('nombre'),
    supabase
      .from('kardex_valorizado')
      .select(
        'id, producto_nombre, tipo, cantidad, costo_unitario, valor_movimiento, saldo_cantidad, usuario_nombre, motivo, creado_en'
      )
      .eq('tipo', 'entrada')
      .order('creado_en', { ascending: false })
      .limit(200)
      .returns<KardexRow[]>(),
    supabase
      .from('entradas_cabecera')
      .select(
        'id, numero, fecha, motivo, motivo_otro, documento_tipo, documento_otro, documento_serie, documento_correlativo, proveedor_razon_social, estado, usuarios_perfil(nombre)'
      )
      .order('creado_en', { ascending: false })
      .limit(200)
      .returns<CabeceraRaw[]>(),
  ])

  const filas = entradas ?? []
  const totalUnidades = filas.reduce((acc, m) => acc + Number(m.cantidad), 0)
  const totalValor = filas.reduce((acc, m) => acc + Number(m.valor_movimiento ?? 0), 0)

  const cabeceras = cabecerasRaw ?? []
  const idsCabecera = cabeceras.map((c) => c.id)
  const { data: lineasPorCabecera } =
    idsCabecera.length > 0
      ? await supabase.from('movimientos').select('entrada_cabecera_id, cantidad').in('entrada_cabecera_id', idsCabecera)
      : { data: [] as { entrada_cabecera_id: number | null; cantidad: number }[] }

  const agregadosPorCabecera = new Map<number, { lineas: number; cantidad: number }>()
  for (const l of lineasPorCabecera ?? []) {
    if (l.entrada_cabecera_id === null) continue
    const actual = agregadosPorCabecera.get(l.entrada_cabecera_id) ?? { lineas: 0, cantidad: 0 }
    actual.lineas += 1
    actual.cantidad += Number(l.cantidad)
    agregadosPorCabecera.set(l.entrada_cabecera_id, actual)
  }

  const filasCabecera: EntradaCabeceraRow[] = cabeceras.map((c) => {
    const agregado = agregadosPorCabecera.get(c.id) ?? { lineas: 0, cantidad: 0 }
    const usuario = Array.isArray(c.usuarios_perfil) ? c.usuarios_perfil[0] : c.usuarios_perfil
    return {
      id: c.id,
      numero: c.numero,
      fecha: c.fecha,
      motivo: c.motivo,
      motivoOtro: c.motivo_otro,
      documentoTipo: c.documento_tipo,
      documentoOtro: c.documento_otro,
      documentoSerie: c.documento_serie,
      documentoCorrelativo: c.documento_correlativo,
      proveedor: c.proveedor_razon_social,
      estado: c.estado,
      usuarioNombre: usuario?.nombre ?? null,
      numeroLineas: agregado.lineas,
      cantidadItems: agregado.cantidad,
    }
  })

  return (
    <div>
      <Link href="/movimientos" className="text-sm font-bold text-[#64748b] dark:text-slate-400 hover:text-emerald-600">
        ← Volver a Movimientos
      </Link>

      <div className="mt-2">
        <h1 className="text-2xl font-extrabold text-[#1e293b] dark:text-slate-100">📥 Entradas</h1>
        <p className="mt-1 text-sm font-medium text-[#64748b] dark:text-slate-400">Ingresos de mercadería al inventario</p>
      </div>

      <div className="mt-6">
        <AgregarEntradaForm
          usuarioNombre={perfil?.nombre ?? '—'}
          usuarioRol={perfil ? ROLE_LABELS[perfil.rol] ?? perfil.rol : '—'}
          moneda={configuracion?.moneda ?? 'S/'}
          proveedores={proveedores ?? []}
          productos={productos ?? []}
          fechaHoy={hoyPeruISO()}
          usaLoteVencimiento={configuracion?.usa_lote_vencimiento ?? false}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#e5e9f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] p-6 shadow-sm">
          <p className="text-xs font-bold tracking-wide text-[#94a3b8] dark:text-slate-500 uppercase">Entradas registradas</p>
          <p className="mt-3 text-3xl font-extrabold text-[#0f172a] dark:text-white">{cabeceras.length}</p>
        </div>
        <div className="rounded-2xl border border-[#e5e9f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] p-6 shadow-sm">
          <p className="text-xs font-bold tracking-wide text-[#94a3b8] dark:text-slate-500 uppercase">Unidades ingresadas</p>
          <p className="mt-3 text-3xl font-extrabold text-[#0f172a] dark:text-white">{totalUnidades}</p>
        </div>
        <div className="rounded-2xl border border-[#e5e9f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] p-6 shadow-sm">
          <p className="text-xs font-bold tracking-wide text-[#94a3b8] dark:text-slate-500 uppercase">Valor total ingresado</p>
          <p className="mt-3 text-3xl font-extrabold text-[#0f172a] dark:text-white">S/ {totalValor.toFixed(2)}</p>
        </div>
      </div>

      <div className="mt-6">
        <EntradasTabla entradas={filasCabecera} />
      </div>
    </div>
  )
}
