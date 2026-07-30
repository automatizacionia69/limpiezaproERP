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
 * Convención del proyecto: `precio_unitario` es SIEMPRE neto, sin IGV. El IGV
 * se suma encima.
 *
 * Antes cada pantalla calculaba por su cuenta y las convenciones no coincidían:
 * las cotizaciones sumaban el IGV al subtotal, pero `emitirComprobante` tomaba
 * la suma de las líneas como total y desagregaba el IGV hacia atrás. Resultado
 * verificado en producción: la cotización COT-00004 se envió por S/ 7 640.50 y
 * su factura F006-000002 quedó grabada por S/ 6 475.00. Todo cálculo de
 * importes tiene que pasar por acá para que no vuelva a divergir.
 */
export function calcularImportes(
  lineas: { cantidad: number; precio_unitario: number }[]
): ImportesDocumento {
  const subtotal = aCentimos(
    lineas.reduce((acc, l) => acc + l.cantidad * l.precio_unitario, 0)
  )
  const igv = aCentimos(subtotal * IGV_TASA)

  // total se deriva de los dos valores ya redondeados para garantizar que
  // subtotal + igv === total exactamente, sin centimos huerfanos.
  return { subtotal, igv, total: aCentimos(subtotal + igv) }
}
