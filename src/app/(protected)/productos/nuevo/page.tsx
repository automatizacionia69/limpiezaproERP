import { createClient } from '@/lib/supabase/server'
import { ProductoForm } from './producto-form'

export default async function NuevoProductoPage() {
  const supabase = await createClient()
  const [{ data: unidades }, { data: categorias }] = await Promise.all([
    supabase.from('unidades_medida').select('id, nombre').order('nombre'),
    supabase.from('categorias').select('id, nombre').order('nombre'),
  ])

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-xl font-semibold text-[#2b303a]">Agregar producto</h1>
      <div className="mt-5 rounded-2xl border border-[#e8ebf1] bg-white p-6 shadow-[0_1px_3px_rgba(31,37,51,.06)]">
        <ProductoForm unidades={unidades ?? []} categorias={categorias ?? []} />
      </div>
    </div>
  )
}
