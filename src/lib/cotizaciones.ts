// src/lib/cotizaciones.ts
import { afectacionPorCodigo } from './afectacion-igv'

export const IGV_TASA = 0.18

export interface ImportesDocumento {
  subtotal: number
  igv: number
  total: number
  /** Base gravada (sin IGV) — solo las líneas Gravado (10/12/15). */
  opGravada: number
  /** Suma de líneas Exonerado (20) — no aportan IGV. */
  opExonerada: number
  /** Suma de líneas Inafecto (30) — no aportan IGV. */
  opInafecta: number
}

/** Redondea a céntimos evitando el arrastre binario de los flotantes. */
function aCentimos(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100
}

/**
 * Única fuente de verdad para los importes de cualquier documento de venta
 * (cotización, orden de venta, comprobante, nota de crédito).
 *
 * Convención del proyecto (cambiada 2026-08-04): `precio_unitario` es SIEMPRE
 * el precio final CON IGV incluido para líneas Gravado — el mismo número
 * que ve y paga el cliente. El IGV se extrae hacia atrás, nunca se suma
 * encima.
 *
 * Agregado 2026-08-07: cada línea trae su propio `tipo_afectacion_igv`
 * (código SUNAT curado, ver src/lib/afectacion-igv.ts). Las líneas Gravado
 * extraen el 18% como siempre; las líneas Exonerado/Inafecto no aportan
 * IGV — su `precio_unitario` es el valor final tal cual, sin nada que
 * extraer. El caso 100%-Gravado (el normal, casi siempre) da EXACTAMENTE
 * el mismo resultado que la versión anterior de esta función — no tocar
 * esa invariante sin correr la prueba de regresión del plan.
 */
function importesDesdeGrupos(gravadaBruta: number, exoneradaBruta: number, inafectaBruta: number): ImportesDocumento {
  const gravadaRedondeada = aCentimos(gravadaBruta)
  const opGravada = aCentimos(gravadaRedondeada / (1 + IGV_TASA))
  // igv se deriva de gravadaRedondeada - opGravada (ya redondeados) para que
  // opGravada + igv === gravadaRedondeada exactamente, sin centimos huerfanos.
  const igv = aCentimos(gravadaRedondeada - opGravada)
  const opExonerada = aCentimos(exoneradaBruta)
  const opInafecta = aCentimos(inafectaBruta)
  const subtotal = aCentimos(opGravada + opExonerada + opInafecta)
  const total = aCentimos(subtotal + igv)
  return { subtotal, igv, total, opGravada, opExonerada, opInafecta }
}

export function calcularImportes(
  lineas: { cantidad: number; precio_unitario: number; tipo_afectacion_igv: string }[]
): ImportesDocumento {
  let gravadaBruta = 0
  let exoneradaBruta = 0
  let inafectaBruta = 0

  for (const l of lineas) {
    const monto = l.cantidad * l.precio_unitario
    const afectacion = afectacionPorCodigo(l.tipo_afectacion_igv)
    if (afectacion.grupo === 'exonerado') exoneradaBruta += monto
    else if (afectacion.grupo === 'inafecto') inafectaBruta += monto
    else gravadaBruta += monto
  }

  return importesDesdeGrupos(gravadaBruta, exoneradaBruta, inafectaBruta)
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

/**
 * Aplica un descuento ya calculado (ver `calcularDescuento`) sobre los
 * importes brutos. Reparto PROPORCIONAL entre los 3 grupos según su peso
 * en el total bruto (decisión confirmada con el usuario con un ejemplo
 * numérico: S/118 gravado + S/50 exonerado, descuento 10% → factor 0.9
 * aplicado a ambos grupos por igual, cada uno re-deriva su propio IGV
 * después). Evita que un descuento grande sobre un documento mixto deje
 * el IGV inconsistente.
 */
export function aplicarDescuento(importesBrutos: ImportesDocumento, descuento: number): ImportesDocumento {
  if (descuento <= 0) return importesBrutos

  const gravadaBruta = importesBrutos.opGravada + importesBrutos.igv
  const exoneradaBruta = importesBrutos.opExonerada
  const inafectaBruta = importesBrutos.opInafecta
  const totalBruto = gravadaBruta + exoneradaBruta + inafectaBruta

  if (totalBruto <= 0) return importesBrutos

  const factor = Math.max(0, totalBruto - descuento) / totalBruto
  return importesDesdeGrupos(gravadaBruta * factor, exoneradaBruta * factor, inafectaBruta * factor)
}
