// Catálogo de tipos de documento compartido entre Entradas y Salidas (y
// cualquier otro sub-apartado de Movimientos que lo necesite) — el mismo
// documento (ej. Guía de Remisión Remitente) puede sustentar tanto un
// ingreso como una salida, así que vive en un solo lugar en vez de
// duplicarse por dirección.
export const DOCUMENTOS_GRUPOS = [
  {
    grupo: 'Almacén',
    opciones: [
      { valor: 'nota_ingreso', label: 'Nota Ingreso' },
      { valor: 'nota_salida', label: 'Nota Salida' },
      { valor: 'movimiento_inventario', label: 'Movimiento Inventario' },
      { valor: 'guia_remision', label: 'Guía de Remisión' },
      { valor: 'guia_remision_remitente', label: 'Guía de Remisión Remitente' },
      { valor: 'hoja_recepcion', label: 'Hoja de Recepción' },
      { valor: 'nota_abastecimiento', label: 'Nota de Abastecimiento' },
      { valor: 'sin_documento', label: 'Sin Documento' },
    ],
  },
  {
    grupo: 'Compras',
    opciones: [
      { valor: 'orden_compra', label: 'Orden de Compra' },
      { valor: 'documento_compra', label: 'Documento de Compra' },
      { valor: 'retencion', label: 'Retención' },
    ],
  },
  {
    grupo: 'Ventas',
    opciones: [
      { valor: 'nota_pedido', label: 'Pedido / Nota de Pedido' },
      { valor: 'cotizacion', label: 'Cotización' },
      { valor: 'ticket_venta', label: 'Ticket de Venta' },
      { valor: 'ticket_adelanto', label: 'Ticket de Adelanto' },
      { valor: 'boleta', label: 'Boleta de Venta' },
      { valor: 'factura', label: 'Factura' },
      { valor: 'nota_credito', label: 'Nota de Crédito' },
      { valor: 'nota_debito', label: 'Nota de Débito' },
      { valor: 'documento_masivo', label: 'Documento Masivo' },
      { valor: 'recibo_cobranza', label: 'Recibo de Cobranza' },
    ],
  },
  {
    grupo: 'SUNAT',
    opciones: [
      { valor: 'resumen_boletas', label: 'Resumen de Boletas' },
      { valor: 'comunicacion_baja', label: 'Comunicación de Baja' },
      { valor: 'ticket_maquina_registradora', label: 'Tícket de Máquina Registradora' },
    ],
  },
  {
    grupo: 'Otros',
    opciones: [{ valor: 'otro', label: 'Otro' }],
  },
] as const
