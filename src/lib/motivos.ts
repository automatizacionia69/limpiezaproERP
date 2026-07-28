export const MOTIVOS_NOTA_CREDITO = [
  { codigo: '01', label: 'Anulación de la operación', anula: true },
  { codigo: '02', label: 'Anulación por error en el RUC', anula: true },
  { codigo: '03', label: 'Corrección por error en la descripción', anula: false },
  { codigo: '04', label: 'Descuento global', anula: false },
  { codigo: '05', label: 'Descuento por ítem', anula: false },
  { codigo: '06', label: 'Devolución total', anula: true },
  { codigo: '07', label: 'Devolución por ítem', anula: false },
  { codigo: '08', label: 'Bonificación', anula: false },
  { codigo: '09', label: 'Disminución en el valor', anula: false },
  { codigo: '10', label: 'Otros', anula: false },
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
}
