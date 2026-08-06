import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requierePermiso } from '@/lib/permisos'
import { hoyPeruISO } from '@/lib/fecha'
import { AgregarEntradaForm } from './agregar-entrada-form'
import { MovimientosTabla } from '../movimientos-tabla'

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

export default async function EntradasPage() {
  await requierePermiso('movimientos')
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: perfil }, { data: configuracion }, { data: proveedores }, { data: entradas }] = await Promise.all([
    user
      ? supabase.from('usuarios_perfil').select('nombre, rol').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
    supabase.from('configuracion').select('moneda').eq('id', 1).single(),
    supabase.from('proveedores').select('id, nombre, ruc').eq('activo', true).order('nombre'),
    supabase
      .from('kardex_valorizado')
      .select(
        'id, producto_nombre, tipo, cantidad, costo_unitario, valor_movimiento, saldo_cantidad, usuario_nombre, motivo, creado_en'
      )
      .eq('tipo', 'entrada')
      .order('creado_en', { ascending: false })
      .limit(200)
      .returns<KardexRow[]>(),
  ])

  const filas = entradas ?? []
  const totalUnidades = filas.reduce((acc, m) => acc + Number(m.cantidad), 0)
  const totalValor = filas.reduce((acc, m) => acc + Number(m.valor_movimiento ?? 0), 0)

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
          fechaHoy={hoyPeruISO()}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#e5e9f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] p-6 shadow-sm">
          <p className="text-xs font-bold tracking-wide text-[#94a3b8] dark:text-slate-500 uppercase">Entradas registradas</p>
          <p className="mt-3 text-3xl font-extrabold text-[#0f172a] dark:text-white">{filas.length}</p>
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
        <MovimientosTabla movimientos={filas} />
      </div>
    </div>
  )
}
