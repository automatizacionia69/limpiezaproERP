// Cliente de la API de NUBEFACT (OSE peruano, facturación electrónica SUNAT).
// Server-only: usa NUBEFACT_TOKEN, nunca importar desde un Client Component.
// Manual de referencia: doc compartido por el usuario (JSON v2.9).
//
// precio_unitario aquí significa lo mismo que en el resto del ERP desde
// 2026-08-04 (ver src/lib/cotizaciones.ts): CON IGV incluido. Coincide con
// el campo "precio_unitario" de NUBEFACT, así que no hace falta convertir
// nada — este módulo solo extrae el IGV hacia atrás para construir
// "valor_unitario" (que en NUBEFACT sí es sin IGV).

const IGV_TASA = 0.18

function aCentimos(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100
}

export type TipoComprobante = 'factura' | 'boleta'

const TIPO_COMPROBANTE_NUBEFACT: Record<TipoComprobante, number> = {
  factura: 1,
  boleta: 2,
}

/**
 * 6 = RUC, 1 = DNI, "-" = varios (ventas menores a S/700 sin documento).
 * Mismo criterio de longitud que ya usa el ERP en ventas/actions.ts y
 * ventas/[id]/facturar/emitir-form.tsx (11 dígitos = RUC, 8 = DNI).
 */
function tipoDeDocumentoCliente(documento: string): string {
  const limpio = documento.trim()
  if (limpio.length === 11) return '6'
  if (limpio.length === 8) return '1'
  return '-'
}

export type LineaNubefact = {
  descripcion: string
  codigo?: string
  /** Texto libre de la unidad en el ERP (ej. "und", "paq", "caja"). */
  unidadErp: string
  cantidad: number
  /** Precio CON IGV — la misma convención de precio_unitario del ERP. */
  precioUnitario: number
}

/**
 * Mapea la unidad de medida del ERP (texto libre) al código SUNAT que
 * NUBEFACT espera. Simplificación deliberada para esta primera versión:
 * todo se manda como NIU (unidad física). Si más adelante hace falta
 * distinguir "caja"/"paquete" con su propio código SUNAT, hay que darlos de
 * alta primero en el panel de NUBEFACT (Configuración > Unidades de medida)
 * y ampliar este mapeo — por ahora NIU es válido para cualquier producto
 * físico y es lo que confirma el demo.
 */
function unidadSunat(_unidadErp: string): string {
  return 'NIU'
}

type ItemNubefact = {
  unidad_de_medida: string
  codigo: string
  descripcion: string
  cantidad: number
  valor_unitario: number
  precio_unitario: number
  subtotal: number
  tipo_de_igv: number
  igv: number
  total: number
}

export type DatosClienteNubefact = {
  documento: string
  denominacion: string
  direccion?: string
  email?: string
}

export type GenerarComprobanteInput = {
  tipo: TipoComprobante
  serie: string
  /** Numero correlativo SIN ceros a la izquierda ni prefijo de serie. */
  numero: number
  cliente: DatosClienteNubefact
  fechaEmision: string // DD-MM-AAAA, formato que pide NUBEFACT
  lineas: LineaNubefact[]
  /** Si es false, queda pendiente de revisión manual en el panel de NUBEFACT. */
  enviarAutomaticamenteASunat?: boolean
}

export type RespuestaNubefactComprobante = {
  tipo_de_comprobante: number
  serie: string
  numero: number
  enlace: string
  enlace_del_pdf: string
  enlace_del_xml: string
  /** Puede venir null si SUNAT todavía no confirmó la recepción (normal en cuentas demo). */
  enlace_del_cdr: string | null
  aceptada_por_sunat: boolean
  sunat_description: string | null
  sunat_note: string | null
  sunat_responsecode: string | null
  sunat_soap_error: string
  cadena_para_codigo_qr: string
  codigo_hash: string
}

export type ResultadoNubefact<T> = { ok: true; data: T } | { ok: false; error: string }

function construirItems(lineas: LineaNubefact[]): ItemNubefact[] {
  return lineas.map((l) => {
    const precioUnitario = aCentimos(l.precioUnitario)
    const valorUnitario = aCentimos(precioUnitario / (1 + IGV_TASA))
    const subtotal = aCentimos(l.cantidad * valorUnitario)
    const igv = aCentimos(subtotal * IGV_TASA)
    return {
      unidad_de_medida: unidadSunat(l.unidadErp),
      codigo: l.codigo ?? '',
      descripcion: l.descripcion,
      cantidad: l.cantidad,
      valor_unitario: valorUnitario,
      precio_unitario: precioUnitario,
      subtotal,
      tipo_de_igv: 1, // Gravado - Operación Onerosa (venta normal con IGV)
      igv,
      total: aCentimos(subtotal + igv),
    }
  })
}

async function llamarNubefact<T>(operacion: Record<string, unknown>): Promise<ResultadoNubefact<T>> {
  const ruta = process.env.NUBEFACT_RUTA
  const token = process.env.NUBEFACT_TOKEN

  if (!ruta || !token) {
    return { ok: false, error: 'Falta configurar NUBEFACT_RUTA / NUBEFACT_TOKEN en el servidor.' }
  }

  try {
    const res = await fetch(ruta, {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(operacion),
      cache: 'no-store',
    })

    const data = await res.json()

    if (!res.ok) {
      const mensaje = data?.errors ?? `NUBEFACT respondió con error (HTTP ${res.status}).`
      return { ok: false, error: mensaje }
    }

    return { ok: true, data: data as T }
  } catch {
    return { ok: false, error: 'No se pudo conectar con NUBEFACT.' }
  }
}

export async function generarComprobanteNubefact(
  input: GenerarComprobanteInput
): Promise<ResultadoNubefact<RespuestaNubefactComprobante>> {
  const items = construirItems(input.lineas)
  const totalGravada = aCentimos(items.reduce((acc, i) => acc + i.subtotal, 0))
  const totalIgv = aCentimos(items.reduce((acc, i) => acc + i.igv, 0))
  const total = aCentimos(totalGravada + totalIgv)

  return llamarNubefact<RespuestaNubefactComprobante>({
    operacion: 'generar_comprobante',
    tipo_de_comprobante: TIPO_COMPROBANTE_NUBEFACT[input.tipo],
    serie: input.serie,
    numero: input.numero,
    sunat_transaction: 1, // Venta interna — el caso normal de este negocio
    cliente_tipo_de_documento: tipoDeDocumentoCliente(input.cliente.documento),
    cliente_numero_de_documento: input.cliente.documento,
    cliente_denominacion: input.cliente.denominacion,
    cliente_direccion: input.cliente.direccion ?? '',
    cliente_email: input.cliente.email ?? '',
    fecha_de_emision: input.fechaEmision,
    moneda: 1, // Soles
    porcentaje_de_igv: IGV_TASA * 100,
    total_gravada: totalGravada,
    total_igv: totalIgv,
    total,
    enviar_automaticamente_a_la_sunat: input.enviarAutomaticamenteASunat ?? true,
    enviar_automaticamente_al_cliente: false,
    items,
  })
}

export async function consultarComprobanteNubefact(
  tipo: TipoComprobante,
  serie: string,
  numero: number
): Promise<ResultadoNubefact<RespuestaNubefactComprobante & { anulado: boolean }>> {
  return llamarNubefact({
    operacion: 'consultar_comprobante',
    tipo_de_comprobante: TIPO_COMPROBANTE_NUBEFACT[tipo],
    serie,
    numero,
  })
}
