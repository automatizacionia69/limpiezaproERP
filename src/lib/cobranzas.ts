import { createClient } from '@/lib/supabase/server'
import { hoyPeruISO } from '@/lib/fecha'

type ComprobanteRow = {
  id: number
  numero: string
  tipo: string
  total: number
  fecha_emision: string
  dias_credito: string
  fecha_cobro: string | null
  clientes: { nombre: string } | { nombre: string }[] | null
}

type NotaRow = { comprobante_id: number; monto: number }

export type EstadoCobranza = 'vencida' | 'pendiente' | 'cobrado'

export type FilaCobranza = {
  id: number
  numero: string
  tipo: string
  cliente: string
  saldo: number
  fechaVencimientoISO: string
  fechaVencimientoLabel: string
  diasLabel: string
  estado: EstadoCobranza
}

function unoDe<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v
}

function calcularVencimientoISO(fechaEmisionISO: string, diasCredito: string): string {
  const dias = parseInt(diasCredito, 10) || 0
  const fecha = new Date(`${fechaEmisionISO}T00:00:00Z`)
  fecha.setUTCDate(fecha.getUTCDate() + dias)
  return fecha.toISOString().slice(0, 10)
}

function formatearFechaISO(fechaISO: string): string {
  return new Date(`${fechaISO}T00:00:00Z`).toLocaleDateString('es-PE', { timeZone: 'UTC' })
}

function diasLabelPorEstado(estado: EstadoCobranza, dias: number, fechaCobro: string | null): string {
  if (estado === 'cobrado') {
    return fechaCobro ? `Cobrada el ${formatearFechaISO(fechaCobro.slice(0, 10))}` : 'Cobrada'
  }
  if (dias < 0) return `Vencida hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? '' : 's'}`
  if (dias === 0) return 'Vence hoy'
  return `Vence en ${dias} día${dias === 1 ? '' : 's'}`
}

/** Lista completa: todo comprobante a crédito emitido, con su estado (pendiente/vencida/cobrado).
 * Un comprobante ya cubierto por completo con Notas de Crédito (saldo <= 0) pero nunca marcado
 * "cobrada" se excluye — no hay nada que cobrar, fue un ajuste, no un pago recibido. */
export async function obtenerCobranzas(): Promise<FilaCobranza[]> {
  const supabase = await createClient()

  const { data: comprobantes } = await supabase
    .from('comprobantes')
    .select('id, numero, tipo, total, fecha_emision, dias_credito, fecha_cobro, clientes(nombre)')
    .eq('estado', 'emitido')
    .neq('dias_credito', 'Contado')
    .returns<ComprobanteRow[]>()

  if (!comprobantes || comprobantes.length === 0) {
    return []
  }

  const ids = comprobantes.map((c) => c.id)

  const [{ data: notasCredito }, { data: notasDebito }] = await Promise.all([
    supabase.from('notas_credito').select('comprobante_id, monto').in('comprobante_id', ids).returns<NotaRow[]>(),
    supabase.from('notas_debito').select('comprobante_id, monto').in('comprobante_id', ids).returns<NotaRow[]>(),
  ])

  const netoPorComprobante = new Map<number, number>()
  for (const n of notasCredito ?? []) {
    netoPorComprobante.set(n.comprobante_id, (netoPorComprobante.get(n.comprobante_id) ?? 0) - Number(n.monto))
  }
  for (const n of notasDebito ?? []) {
    netoPorComprobante.set(n.comprobante_id, (netoPorComprobante.get(n.comprobante_id) ?? 0) + Number(n.monto))
  }

  const hoy = hoyPeruISO()
  const hoyMs = new Date(`${hoy}T00:00:00Z`).getTime()
  const filas: FilaCobranza[] = []

  for (const c of comprobantes) {
    const saldo = Number(c.total) + (netoPorComprobante.get(c.id) ?? 0)
    if (!c.fecha_cobro && saldo <= 0) continue

    const fechaVencimientoISO = calcularVencimientoISO(c.fecha_emision, c.dias_credito)
    const dias = Math.round((new Date(`${fechaVencimientoISO}T00:00:00Z`).getTime() - hoyMs) / 86400000)
    const estado: EstadoCobranza = c.fecha_cobro ? 'cobrado' : dias < 0 ? 'vencida' : 'pendiente'

    filas.push({
      id: c.id,
      numero: c.numero,
      tipo: c.tipo,
      cliente: unoDe(c.clientes)?.nombre ?? '—',
      saldo,
      fechaVencimientoISO,
      fechaVencimientoLabel: formatearFechaISO(fechaVencimientoISO),
      diasLabel: diasLabelPorEstado(estado, dias, c.fecha_cobro),
      estado,
    })
  }

  const prioridad: Record<EstadoCobranza, number> = { vencida: 0, pendiente: 1, cobrado: 2 }
  filas.sort((a, b) => prioridad[a.estado] - prioridad[b.estado] || a.fechaVencimientoISO.localeCompare(b.fechaVencimientoISO))

  return filas
}

/** Subconjunto accionable para la campana del header: vencidas, y pendientes que vencen
 * dentro de los próximos 7 días. Las ya cobradas o muy lejanas no generan alerta. */
export function filtrarParaCampana(filas: FilaCobranza[]): FilaCobranza[] {
  const hoy = hoyPeruISO()
  const hoyMs = new Date(`${hoy}T00:00:00Z`).getTime()

  return filas.filter((f) => {
    if (f.estado === 'vencida') return true
    if (f.estado === 'pendiente') {
      const dias = Math.round((new Date(`${f.fechaVencimientoISO}T00:00:00Z`).getTime() - hoyMs) / 86400000)
      return dias <= 7
    }
    return false
  })
}
