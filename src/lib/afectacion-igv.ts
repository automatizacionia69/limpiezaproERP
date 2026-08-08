/**
 * Catálogo de afectación IGV — subconjunto curado de 5 códigos del catálogo
 * oficial SUNAT N.° 07, elegido con el usuario tras descartar el catálogo
 * completo (~18 códigos: exportación/IVAP/muestras médicas/convenio
 * colectivo no aplican a este negocio). Si algún día hace falta un código
 * nuevo, se agrega a este array — es una constante, no requiere migración.
 *
 * `grupo` determina el balde en el que cae la línea para el desglose de
 * totales (Op. Gravada / Op. Exonerada / Op. Inafecta). `afectoIgv` decide
 * si esa línea aporta el 18% o no — ver src/lib/cotizaciones.ts.
 */
export type GrupoAfectacion = 'gravado' | 'exonerado' | 'inafecto'

export type AfectacionIgv = {
  codigo: string
  etiqueta: string
  grupo: GrupoAfectacion
  afectoIgv: boolean
}

// Las etiquetas son en lenguaje simple a propósito (pedido del usuario,
// personal no técnico) — el nombre oficial SUNAT de cada código queda solo
// en este comentario, por si hace falta consultarlo:
// 10 Gravado–Operación Onerosa, 12 Gravado–Retiro por donación,
// 15 Gravado–Bonificaciones, 20 Exonerado–Operación Onerosa,
// 30 Inafecto–Operación Onerosa.
export const AFECTACIONES_IGV: AfectacionIgv[] = [
  { codigo: '10', etiqueta: 'Afecto a IGV (18%) — venta normal', grupo: 'gravado', afectoIgv: true },
  { codigo: '12', etiqueta: 'Afecto a IGV (18%) — regalo o donación', grupo: 'gravado', afectoIgv: true },
  { codigo: '15', etiqueta: 'Afecto a IGV (18%) — bonificación o promoción', grupo: 'gravado', afectoIgv: true },
  { codigo: '20', etiqueta: 'Exonerado de IGV', grupo: 'exonerado', afectoIgv: false },
  { codigo: '30', etiqueta: 'No afecto a IGV (inafecto)', grupo: 'inafecto', afectoIgv: false },
]

export const AFECTACION_IGV_DEFAULT = '10'

/** Nunca lanza — si el código no está en el catálogo (dato corrupto/viejo), cae a Gravado por seguridad. */
export function afectacionPorCodigo(codigo: string): AfectacionIgv {
  return AFECTACIONES_IGV.find((a) => a.codigo === codigo) ?? AFECTACIONES_IGV[0]
}
