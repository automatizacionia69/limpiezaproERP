import { createClient } from '@/lib/supabase/server'
import { requierePermiso } from '@/lib/permisos'
import { ProductoForm } from './producto-form'

export default async function NuevoProductoPage() {
  await requierePermiso('productos')
  const supabase = await createClient()
  const [{ data: unidades }, { data: categorias }] = await Promise.all([
    supabase.from('unidades_medida').select('id, nombre').order('nombre'),
    supabase.from('categorias').select('id, nombre').order('nombre'),
  ])

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-extrabold text-[#1e293b]">Agregar producto</h1>
      <div className="mt-5 rounded-3xl border-2 border-[#e2e8f0] bg-white p-8 shadow-lg shadow-slate-500/5">
        <ProductoForm unidades={unidades ?? []} categorias={categorias ?? []} />
      </div>
    </div>
  )
}
