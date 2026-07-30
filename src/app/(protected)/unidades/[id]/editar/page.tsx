import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requierePermiso } from '@/lib/permisos'
import { EditarUnidadForm } from './editar-unidad-form'

export default async function EditarUnidadPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requierePermiso('productos')
  const { id } = await params
  const supabase = await createClient()
  const { data: unidad } = await supabase.from('unidades_medida').select('id, nombre').eq('id', id).single()

  if (!unidad) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-extrabold text-[#1e293b] dark:text-slate-100">📏 Editar unidad</h1>
      <div className="mt-5 rounded-3xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] p-8 shadow-lg shadow-slate-500/5">
        <EditarUnidadForm unidad={unidad} />
      </div>
    </div>
  )
}
