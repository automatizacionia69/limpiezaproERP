import { createClient } from '@/lib/supabase/server'
import { requierePermiso } from '@/lib/permisos'
import { ComprobantesTabla, type FilaMovimiento } from './comprobantes-tabla'

type ComprobanteRow = {
  id: number
  tipo: string
  numero: string
  total: number
  estado: string
  creado_en: string
  clientes: { nombre: string } | null
}

type NotaCreditoRow = {
  id: number
  numero: string
  motivo: string
  monto: number
  creado_en: string
  comprobante_id: number
  comprobantes: { numero: string; tipo: string; clientes: { nombre: string } | null } | { numero: string; tipo: string; clientes: { nombre: string } | null }[] | null
}

type NotaDebitoRow = {
  id: number
  numero: string
  motivo: string
  monto: number
  creado_en: string
  comprobante_id: number
  comprobantes: { numero: string; tipo: string; clientes: { nombre: string } | null } | { numero: string; tipo: string; clientes: { nombre: string } | null }[] | null
}

function unoDe<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v
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
    supabase
      .from('notas_credito')
      .select('id, numero, motivo, monto, creado_en, comprobante_id, comprobantes(numero, tipo, clientes(nombre))')
      .returns<NotaCreditoRow[]>(),
    supabase
      .from('notas_debito')
      .select('id, numero, motivo, monto, creado_en, comprobante_id, comprobantes(numero, tipo, clientes(nombre))')
      .returns<NotaDebitoRow[]>(),
  ])

  const netoPorComprobante = new Map<number, number>()
  for (const n of notasCredito ?? []) {
    netoPorComprobante.set(n.comprobante_id, (netoPorComprobante.get(n.comprobante_id) ?? 0) - Number(n.monto))
  }
  for (const n of notasDebito ?? []) {
    netoPorComprobante.set(n.comprobante_id, (netoPorComprobante.get(n.comprobante_id) ?? 0) + Number(n.monto))
  }

  const filasComprobantes: FilaMovimiento[] = (comprobantes ?? []).map((c) => ({
    id: c.id,
    tipoMovimiento: 'comprobante',
    tipo: c.tipo,
    numero: c.numero,
    fecha: c.creado_en,
    cliente: c.clientes?.nombre ?? null,
    monto: Number(c.total),
    totalNeto: Math.max(0, Number(c.total) + (netoPorComprobante.get(c.id) ?? 0)),
    estado: c.estado,
    detalle: null,
  }))

  const filasNotasCredito: FilaMovimiento[] = (notasCredito ?? []).map((n) => {
    const comp = unoDe(n.comprobantes)
    return {
      id: n.id,
      tipoMovimiento: 'nota_credito',
      tipo: comp?.tipo ?? '',
      numero: n.numero,
      fecha: n.creado_en,
      cliente: unoDe(comp?.clientes ?? null)?.nombre ?? null,
      monto: -Number(n.monto),
      totalNeto: null,
      estado: 'emitido',
      detalle: `${n.motivo} · anexada a ${comp?.numero ?? '—'}`,
    }
  })

  const filasNotasDebito: FilaMovimiento[] = (notasDebito ?? []).map((n) => {
    const comp = unoDe(n.comprobantes)
    return {
      id: n.id,
      tipoMovimiento: 'nota_debito',
      tipo: comp?.tipo ?? '',
      numero: n.numero,
      fecha: n.creado_en,
      cliente: unoDe(comp?.clientes ?? null)?.nombre ?? null,
      monto: Number(n.monto),
      totalNeto: null,
      estado: 'emitido',
      detalle: `${n.motivo} · anexada a ${comp?.numero ?? '—'}`,
    }
  })

  const movimientos = [...filasComprobantes, ...filasNotasCredito, ...filasNotasDebito].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  )

  return <ComprobantesTabla movimientos={movimientos} />
}
