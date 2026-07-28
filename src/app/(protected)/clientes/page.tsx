import { createClient } from '@/lib/supabase/server'
import { ClientesTabla } from './clientes-tabla'

type ClienteRow = {
  id: number
  nombre: string
  documento: string | null
  telefono: string | null
  email: string | null
}

export default async function ClientesPage() {
  const supabase = await createClient()
  const { data: clientes } = await supabase
    .from('clientes')
    .select('id, nombre, documento, telefono, email')
    .order('nombre')
    .returns<ClienteRow[]>()

  return <ClientesTabla clientes={clientes ?? []} />
}
