export const IGV_TASA = 0.18

export interface ImportesDocumento {
  subtotal: number
  igv: number
  total: number
}

/** Redondea a céntimos evitando el arrastre binario de los flotantes. */
function aCentimos(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100
}

/**
 * Única fuente de verdad para los importes de cualquier documento de venta
 * (cotización, orden de venta, comprobante).
 *
 * Convención del proyecto (cambiada 2026-08-04): `precio_unitario` es SIEMPRE
 * el precio final CON IGV incluido — el mismo número que ve y paga el
 * cliente. El IGV se extrae hacia atrás, nunca se suma encima. Esto también
 * hace que `precio_unitario` signifique lo mismo en el ERP y en el JSON de
 * NUBEFACT (`src/lib/nubefact.ts`), que ya usa "con IGV" para ese campo.
 *
 * Antes (hasta 2026-08-04) la convención era la opuesta —neto, IGV sumado
 * encima— y de hecho esa inconsistencia entre pantallas ya había causado un
 * bug real en producción: la cotización COT-00004 se envió por S/ 7 640.50 y
 * su factura F006-000002 quedó grabada por S/ 6 475.00 porque cada pantalla
 * calculaba distinto. Todo cálculo de importes tiene que pasar por acá para
 * que no vuelva a divergir.
 *
 * OJO datos en vuelo: cotizaciones/órdenes que ya estaban 'pendiente' (sin
 * facturar) antes de este cambio tienen su precio_unitario guardado bajo la
 * convención VIEJA (neto) — al reabrirlas después de este cambio, el total
 * que se les cobrará será menor al que se les cotizó verbalmente (ya no se
 * les suma el 18% encima). Los comprobantes ya EMITIDOS no se ven afectados
 * (sus totales quedaron grabados al momento de emitir, no se recalculan).
 */
function importesDesdeTotal(total: number): ImportesDocumento {
  const totalRedondeado = aCentimos(total)
  const subtotal = aCentimos(totalRedondeado / (1 + IGV_TASA))

  // igv se deriva de total - subtotal (ya redondeados) para que
  // subtotal + igv === total exactamente, sin centimos huerfanos.
  return { subtotal, igv: aCentimos(totalRedondeado - subtotal), total: totalRedondeado }
}

export function calcularImportes(
  lineas: { cantidad: number; precio_unitario: number }[]
): ImportesDocumento {
  const total = lineas.reduce((acc, l) => acc + l.cantidad * l.precio_unitario, 0)
  return importesDesdeTotal(total)
}

export type DescuentoTipo = 'porcentaje' | 'monto'

/**
 * Descuento global de una cotizacion — hoy solo lo usa ese modulo, Ventas y
 * Compras no tienen este concepto (por eso no vive dentro de
 * calcularImportes, para no cambiarles el calculo a ellos).
 */
export function calcularDescuento(
  total: number,
  tipo: DescuentoTipo | null,
  valor: number
): number {
  if (!tipo || !valor || valor <= 0) return 0
  const bruto = tipo === 'porcentaje' ? (total * valor) / 100 : valor
  return Math.min(aCentimos(bruto), total)
}

/** Aplica un descuento ya calculado (ver `calcularDescuento`) sobre los
 * importes brutos y vuelve a derivar subtotal/IGV desde el total resultante. */
export function aplicarDescuento(importesBrutos: ImportesDocumento, descuento: number): ImportesDocumento {
  return importesDesdeTotal(importesBrutos.total - descuento)
}
