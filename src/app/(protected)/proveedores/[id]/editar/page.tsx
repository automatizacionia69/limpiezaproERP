import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EditarProveedorForm } from './editar-proveedor-form'

export default async function EditarProveedorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: proveedor } = await supabase
    .from('proveedores')
    .select('id, nombre, ruc, contacto, telefono, email, direccion')
    .eq('id', id)
    .single()

  if (!proveedor) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-extrabold text-[#1e293b]">Editar proveedor</h1>
      <div className="mt-5 rounded-3xl border-2 border-[#e2e8f0] bg-white p-8 shadow-lg shadow-slate-500/5">
        <EditarProveedorForm proveedor={proveedor} />
      </div>
    </div>
  )
}
