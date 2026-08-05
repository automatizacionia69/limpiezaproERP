const ZONA_PERU = 'America/Lima'

/** "Hoy" segun la hora de Peru (UTC-5), no la del servidor — Vercel corre en UTC,
 * asi que entre las 7pm y medianoche hora Peru el servidor ya cree que es el dia
 * siguiente. */
export function hoyPeruISO(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: ZONA_PERU })
}

export function haceUnMesPeruISO(): string {
  const [anio, mes, dia] = hoyPeruISO().split('-').map(Number)
  return new Date(Date.UTC(anio, mes - 1 - 1, dia)).toISOString().slice(0, 10)
}

/** `dias` atras desde "hoy" en Peru. Usado para limitar cuanto se puede
 * atrasar la fecha de un documento (cotizacion, venta, compra, guia). */
export function haceNDiasPeruISO(dias: number): string {
  const [anio, mes, dia] = hoyPeruISO().split('-').map(Number)
  return new Date(Date.UTC(anio, mes - 1, dia - dias)).toISOString().slice(0, 10)
}

/** true si `fechaISO` esta fuera del rango permitido para un documento:
 * no puede ser futura, y no puede atrasarse mas de `maxDiasAtras` dias. */
export function fechaDocumentoFueraDeRango(fechaISO: string, maxDiasAtras = 3): boolean {
  return fechaISO > hoyPeruISO() || fechaISO < haceNDiasPeruISO(maxDiasAtras)
}

/** Limites de un dia en Peru con offset explicito: Postgres los interpreta bien
 * sin depender del timezone de la sesion. Usar contra columnas timestamptz. */
export function inicioDiaPeru(fechaISO: string): string {
  return `${fechaISO}T00:00:00-05:00`
}

export function finDiaPeru(fechaISO: string): string {
  return `${fechaISO}T23:59:59-05:00`
}

/** Dia 1 del mes actual en Peru, `mesesAtras` meses atras. */
export function inicioDeMesPeru(mesesAtras = 0): Date {
  const [anio, mes] = hoyPeruISO().split('-').map(Number)
  return new Date(Date.UTC(anio, mes - 1 - mesesAtras, 1))
}

export function inicioDeMesPeruFecha(mesesAtras = 0): string {
  return inicioDeMesPeru(mesesAtras).toISOString().slice(0, 10)
}

export function inicioDeMesPeruInstante(mesesAtras = 0): string {
  return inicioDiaPeru(inicioDeMesPeruFecha(mesesAtras))
}
