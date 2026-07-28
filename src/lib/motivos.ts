export const MOTIVOS_NOTA_CREDITO = [
  { codigo: '01', label: 'Anulación de la operación', anula: true, itemizable: false, reversaStock: true },
  { codigo: '02', label: 'Anulación por error en el RUC', anula: true, itemizable: false, reversaStock: true },
  { codigo: '03', label: 'Corrección por error en la descripción', anula: false, itemizable: false, reversaStock: false },
  { codigo: '04', label: 'Descuento global', anula: false, itemizable: false, reversaStock: false },
  { codigo: '05', label: 'Descuento por ítem', anula: false, itemizable: true, reversaStock: false },
  { codigo: '06', label: 'Devolución total', anula: true, itemizable: false, reversaStock: true },
  { codigo: '07', label: 'Devolución por ítem', anula: false, itemizable: true, reversaStock: true },
  { codigo: '08', label: 'Bonificación', anula: false, itemizable: false, reversaStock: false },
  { codigo: '09', label: 'Disminución en el valor', anula: false, itemizable: false, reversaStock: false },
  { codigo: '10', label: 'Otros', anula: false, itemizable: false, reversaStock: false },
] as const

export const MOTIVOS_NOTA_DEBITO = [
  { codigo: '01', label: 'Intereses por mora' },
  { codigo: '02', label: 'Aumento en el valor' },
  { codigo: '03', label: 'Penalidades / otros conceptos' },
  { codigo: '10', label: 'Otros' },
] as const

export const TIPO_COMPROBANTE_LABELS: Record<string, string> = {
  factura: 'Factura',
  boleta: 'Boleta',
  nota_venta: 'Nota de venta',
  ticket: 'Ticket',
}

export const DIAS_CREDITO_OPCIONES = ['Contado', '7 días', '15 días', '30 días', '45 días', '60 días'] as const

export const MEDIOS_PAGO = ['Transferencia', 'Efectivo', 'Yape', 'Plin'] as const

export function calcularFechaVencimiento(fechaEmisionISO: string, diasCredito: string): string {
  if (!fechaEmisionISO || diasCredito === 'Contado') return 'Al contado'

  const dias = parseInt(diasCredito, 10)
  if (!dias) return 'Al contado'

  const fecha = new Date(`${fechaEmisionISO}T00:00:00`)
  fecha.setDate(fecha.getDate() + dias)
  return fecha.toLocaleDateString('es-PE')
}
