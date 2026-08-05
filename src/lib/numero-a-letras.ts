const UNIDADES = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE']
const DIEZ_A_DIECINUEVE = [
  'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE',
  'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE',
]
const VEINTES = [
  'VEINTE', 'VEINTIUNO', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO',
  'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE',
]
const DECENAS = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA']
const CENTENAS = [
  '', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS',
  'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS',
]

function convertirHasta99(n: number): string {
  if (n === 0) return ''
  if (n < 10) return UNIDADES[n]
  if (n < 20) return DIEZ_A_DIECINUEVE[n - 10]
  if (n < 30) return VEINTES[n - 20]
  const d = Math.floor(n / 10)
  const u = n % 10
  return u === 0 ? DECENAS[d] : `${DECENAS[d]} Y ${UNIDADES[u]}`
}

function convertirHasta999(n: number): string {
  if (n === 0) return ''
  if (n === 100) return 'CIEN'
  const c = Math.floor(n / 100)
  const resto = n % 100
  const texto = CENTENAS[c]
  return resto > 0 ? `${texto} ${convertirHasta99(resto)}`.trim() : texto
}

/** UNO/DOS.. -> UN/DOS.. cuando precede a MIL/MILLÓN (ej. "VEINTIUN MIL", no "VEINTIUNO MIL"). */
function apocopeUno(texto: string): string {
  return texto.replace(/UNO$/, 'UN')
}

function convertirEntero(n: number): string {
  if (n === 0) return 'CERO'

  const millones = Math.floor(n / 1_000_000)
  const miles = Math.floor((n % 1_000_000) / 1000)
  const resto = n % 1000

  const partes: string[] = []
  if (millones > 0) {
    partes.push(millones === 1 ? 'UN MILLÓN' : `${apocopeUno(convertirHasta999(millones))} MILLONES`)
  }
  if (miles > 0) {
    partes.push(miles === 1 ? 'MIL' : `${apocopeUno(convertirHasta999(miles))} MIL`)
  }
  if (resto > 0) {
    partes.push(convertirHasta999(resto))
  }
  return partes.join(' ')
}

/**
 * "SON: ..." de una cotización/comprobante — ej. numeroALetras(182) ->
 * "CIENTO OCHENTA Y DOS CON 00/100 SOLES". No cubre apocope de UNO fuera de
 * miles/millones (ej. "UN MIL" vs "MIL") ni fracciones exóticas — suficiente
 * para montos de venta normales.
 */
export function numeroALetras(monto: number, moneda: 'PEN' | 'USD' = 'PEN'): string {
  const nombreMoneda = moneda === 'USD' ? 'DÓLARES' : 'SOLES'
  const absoluto = Math.abs(monto)
  const entero = Math.floor(absoluto)
  const centimos = Math.round((absoluto - entero) * 100)
  const centimosTexto = String(centimos).padStart(2, '0')
  return `${convertirEntero(entero)} CON ${centimosTexto}/100 ${nombreMoneda}`
}
