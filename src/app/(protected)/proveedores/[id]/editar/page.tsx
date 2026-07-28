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
      <h1 className="text-xl font-semibold text-[#1e293b]">Editar proveedor</h1>
      <div className="mt-5 rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,.06)]">
        <EditarProveedorForm proveedor={proveedor} />
      </div>
    </div>
  )
}
