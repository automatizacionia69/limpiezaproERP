import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EditarProductoForm } from './editar-producto-form'

export default async function EditarProductoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: producto }, { data: unidades }, { data: categorias }, { data: zonas }] =
    await Promise.all([
      supabase
        .from('productos')
        .select('id, nombre, codigo, unidad_id, categoria_id, zona_id, precio_venta, punto_reorden')
        .eq('id', id)
        .single(),
      supabase.from('unidades_medida').select('id, nombre').order('nombre'),
      supabase.from('categorias').select('id, nombre').order('nombre'),
      supabase.from('zonas').select('id, nombre').order('nombre'),
    ])

  if (!producto) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-xl font-semibold text-[#1e293b]">Editar producto</h1>
      <div className="mt-5 rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,.06)]">
        <EditarProductoForm
          producto={producto}
          unidades={unidades ?? []}
          categorias={categorias ?? []}
          zonas={zonas ?? []}
        />
      </div>
    </div>
  )
}
