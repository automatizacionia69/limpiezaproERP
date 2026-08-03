import { createClient } from '@/lib/supabase/server'

type ClienteRow = { nombre: string }
type CotizacionRow = { id: number; numero: string; total: number; clientes: ClienteRow | ClienteRow[] | null }
type NotificacionRow = {
  id: number
  leida_en: string | null
  creado_en: string
  cotizaciones: CotizacionRow | CotizacionRow[] | null
}

export type FilaNotificacion = {
  id: number
  cotizacionId: number
  numero: string
  cliente: string
  total: number
  leida: boolean
  creadoEn: string
}

function unoDe<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v
}

function filaDesdeRow(n: NotificacionRow): FilaNotificacion {
  const cotizacion = unoDe(n.cotizaciones)
  const cliente = unoDe(cotizacion?.clientes ?? null)

  return {
    id: n.id,
    cotizacionId: cotizacion?.id ?? 0,
    numero: cotizacion?.numero ?? '—',
    cliente: cliente?.nombre ?? '—',
    total: cotizacion ? Number(cotizacion.total) : 0,
    leida: n.leida_en !== null,
    creadoEn: n.creado_en,
  }
}

/** Últimos pedidos creados por el chatbot para la campana del header (solo admin/ventas, ver RLS). */
export async function obtenerNotificaciones(): Promise<FilaNotificacion[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('notificaciones')
    .select('id, leida_en, creado_en, cotizaciones(id, numero, total, clientes(nombre))')
    .order('creado_en', { ascending: false })
    .limit(50)
    .returns<NotificacionRow[]>()

  return (data ?? []).map(filaDesdeRow)
}
