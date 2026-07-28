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

  const [{ data: comprobantes }, { data: notasCredito }, { data: notasDebito }] = await Promise.all([
    supabase
      .from('comprobantes')
      .select('id, tipo, numero, total, estado, creado_en, clientes(nombre)')
      .order('creado_en', { ascending: false })
      .returns<ComprobanteRow[]>(),
    supabase.from('notas_credito').select('comprobante_id, monto'),
    supabase.from('notas_debito').select('comprobante_id, monto'),
  ])

  const netoPorComprobante = new Map<number, number>()
  for (const n of notasCredito ?? []) {
    netoPorComprobante.set(n.comprobante_id, (netoPorComprobante.get(n.comprobante_id) ?? 0) - Number(n.monto))
  }
  for (const n of notasDebito ?? []) {
    netoPorComprobante.set(n.comprobante_id, (netoPorComprobante.get(n.comprobante_id) ?? 0) + Number(n.monto))
  }

  const filas = (comprobantes ?? []).map((c) => ({
    ...c,
    totalNeto: Math.max(0, Number(c.total) + (netoPorComprobante.get(c.id) ?? 0)),
  }))

  return <ComprobantesTabla comprobantes={filas} />
}
