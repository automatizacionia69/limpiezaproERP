import { createClient } from '@/lib/supabase/server'
import { requierePermiso } from '@/lib/permisos'
import { ComprobantesTabla } from './comprobantes-tabla'

type ComprobanteRow = {
  id: number
  tipo: string
  numero: string
  total: number
  estado: string
  creado_en: string
  clientes: { nombre: string } | null
}

export default async function ConsultaVentasPage() {
  await requierePermiso('consulta_ventas')
  const supabase = await createClient()

  const { data: comprobantes } = await supabase
    .from('comprobantes')
    .select('id, tipo, numero, total, estado, creado_en, clientes(nombre)')
    .order('creado_en', { ascending: false })
    .returns<ComprobanteRow[]>()

  return <ComprobantesTabla comprobantes={comprobantes ?? []} />
}
