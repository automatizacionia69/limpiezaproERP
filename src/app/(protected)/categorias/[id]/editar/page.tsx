import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EditarCategoriaForm } from './editar-categoria-form'

export default async function EditarCategoriaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: categoria } = await supabase.from('categorias').select('id, nombre').eq('id', id).single()

  if (!categoria) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-extrabold text-[#1e293b] dark:text-slate-100">🏷️ Editar categoría</h1>
      <div className="mt-5 rounded-3xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] p-8 shadow-lg shadow-slate-500/5">
        <EditarCategoriaForm categoria={categoria} />
      </div>
    </div>
  )
}
