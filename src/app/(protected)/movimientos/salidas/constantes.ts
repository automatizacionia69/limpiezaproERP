// "Venta" a propósito NO está en esta lista: una venta real ya se registra
// por el módulo de Ventas (orden de venta → comprobante), que descuenta
// stock por su propia vía. Agregar "venta" aquí crearía una segunda forma
// de registrar una venta, sin factura/boleta detrás — dos fuentes de verdad
// para lo mismo. Esta pantalla es para salidas que NO pasan por Ventas.
export const MOTIVOS_SALIDA = [
  { valor: 'merma', label: 'Merma / Deterioro' },
  { valor: 'consumo_interno', label: 'Consumo interno' },
  { valor: 'muestra_obsequio', label: 'Muestra / Obsequio' },
  { valor: 'devolucion_proveedor', label: 'Devolución a proveedor' },
  { valor: 'traslado_almacenes', label: 'Traslado entre almacenes' },
  { valor: 'ajuste_inventario', label: 'Ajuste de inventario' },
  { valor: 'otro', label: 'Otro' },
] as const

export { DOCUMENTOS_GRUPOS } from '../documentos'
