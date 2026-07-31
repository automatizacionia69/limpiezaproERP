import { createClient } from '@/lib/supabase/server'
import { hoyPeruISO } from '@/lib/fecha'

type ComprobanteRow = {
  id: number
  numero: string
  tipo: string
  total: number
  fecha_emision: string
  dias_credito: string
  clientes: { nombre: string } | { nombre: string }[] | null
}

type NotaRow = { comprobante_id: number; monto: number }

export type FilaCobranza = {
  id: number
  numero: string
  tipo: string
  cliente: string
  saldo: number
  fechaVencimiento: string
  etiqueta: string
}

export type CobranzasPendientes = {
  vencidas: FilaCobranza[]
  porVencer: FilaCobranza[]
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

function etiquetaPorDias(dias: number): string {
  if (dias < 0) return `Vencida hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? '' : 's'}`
  if (dias === 0) return 'Vence hoy'
  return `Vence en ${dias} día${dias === 1 ? '' : 's'}`
}

export async function obtenerCobranzasPendientes(): Promise<CobranzasPendientes> {
  const supabase = await createClient()

  const { data: comprobantes } = await supabase
    .from('comprobantes')
    .select('id, numero, tipo, total, fecha_emision, dias_credito, clientes(nombre)')
    .eq('estado', 'emitido')
    .neq('dias_credito', 'Contado')
    .is('fecha_cobro', null)
    .returns<ComprobanteRow[]>()

  if (!comprobantes || comprobantes.length === 0) {
    return { vencidas: [], porVencer: [] }
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
  const vencidas: FilaCobranza[] = []
  const porVencer: FilaCobranza[] = []

  for (const c of comprobantes) {
    const saldo = Number(c.total) + (netoPorComprobante.get(c.id) ?? 0)
    if (saldo <= 0) continue

    const fechaVencimiento = calcularVencimientoISO(c.fecha_emision, c.dias_credito)
    const dias = Math.round((new Date(`${fechaVencimiento}T00:00:00Z`).getTime() - hoyMs) / 86400000)
    if (dias > 7) continue

    const fila: FilaCobranza = {
      id: c.id,
      numero: c.numero,
      tipo: c.tipo,
      cliente: unoDe(c.clientes)?.nombre ?? '—',
      saldo,
      fechaVencimiento,
      etiqueta: etiquetaPorDias(dias),
    }

    if (dias < 0) vencidas.push(fila)
    else porVencer.push(fila)
  }

  vencidas.sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento))
  porVencer.sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento))

  return { vencidas, porVencer }
}
