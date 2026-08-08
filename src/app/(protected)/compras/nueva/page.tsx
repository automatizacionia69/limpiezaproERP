import { createClient } from '@/lib/supabase/server'
import { requierePermiso } from '@/lib/permisos'
import { NuevaCompraForm } from './nueva-compra-form'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  almacen: 'Almacén',
  ventas: 'Ventas',
}

export default async function NuevaCompraPage() {
  await requierePermiso('compras')
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: perfil }, { data: proveedores }, { data: productos }, { data: unidades }, { data: categorias }] =
    await Promise.all([
      user
        ? supabase.from('usuarios_perfil').select('nombre, rol').eq('id', user.id).single()
        : Promise.resolve({ data: null }),
      supabase.from('proveedores').select('id, nombre').eq('activo', true).order('nombre'),
      supabase.from('productos').select('id, nombre').eq('activo', true).order('nombre'),
      supabase.from('unidades_medida').select('id, nombre').order('nombre'),
      supabase.from('categorias').select('id, nombre').order('nombre'),
    ])

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-[#1e293b] dark:text-slate-100">🛒 Nueva orden de compra</h1>
      <div className="mt-5 rounded-3xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] p-8 shadow-lg shadow-slate-500/5">
        <NuevaCompraForm
          usuarioNombre={perfil?.nombre ?? '—'}
          usuarioRol={perfil ? (ROLE_LABELS[perfil.rol] ?? perfil.rol) : '—'}
          proveedores={proveedores ?? []}
          productos={productos ?? []}
          unidades={unidades ?? []}
          categorias={categorias ?? []}
        />
      </div>
    </div>
  )
}
