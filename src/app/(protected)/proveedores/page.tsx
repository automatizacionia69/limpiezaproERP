import { createClient } from '@/lib/supabase/server'
import { requierePermiso } from '@/lib/permisos'
import { ProveedoresTabla } from './proveedores-tabla'

type ProveedorRow = {
  id: number
  nombre: string
  ruc: string | null
  contacto: string | null
  telefono: string | null
  email: string | null
}

export default async function ProveedoresPage() {
  await requierePermiso('proveedores')
  const supabase = await createClient()
  const { data: proveedores } = await supabase
    .from('proveedores')
    .select('id, nombre, ruc, contacto, telefono, email')
    .order('nombre')
    .returns<ProveedorRow[]>()

  return <ProveedoresTabla proveedores={proveedores ?? []} />
}
