'use server'

import { GoogleGenAI } from '@google/genai'
import { createClient } from '@/lib/supabase/server'
import { tienePermiso } from '@/lib/permisos'

const TAMANO_MAXIMO_BYTES = 10 * 1024 * 1024
const TIPOS_ACEPTADOS = ['application/pdf']

/**
 * Mismo patron Map+TTL que buscarRazonSocialPorRuc en lib/decolecta.ts: Gemini
 * es una API paga por request (con imagen/PDF, mas cara que una consulta de
 * texto), asi que el limite es mas estricto para no agotar la cuota si
 * alguien sube documentos a repeticion sin querer.
 */
const VENTANA_MS = 60_000
const MAX_ANALISIS_POR_VENTANA = 5

const contadores = new Map<string, { conteo: number; expiraEn: number }>()

function excedeLimite(usuarioId: string): boolean {
  const ahora = Date.now()
  const registro = contadores.get(usuarioId)

  if (!registro || ahora > registro.expiraEn) {
    contadores.set(usuarioId, { conteo: 1, expiraEn: ahora + VENTANA_MS })
    return false
  }

  registro.conteo += 1

  if (contadores.size > 1000) {
    for (const [k, v] of contadores) {
      if (ahora > v.expiraEn) contadores.delete(k)
    }
  }

  return registro.conteo > MAX_ANALISIS_POR_VENTANA
}

export type ProductoExtraido = {
  nombre: string
  cantidad: number
  precio_unitario: number
}

export type DatosExtraidos = {
  tipo_documento: 'factura' | 'boleta' | null
  serie: string | null
  numero: string | null
  fecha: string | null
  productos: ProductoExtraido[]
  total: number | null
}

export type ResultadoAnalisisCompra = { datos: DatosExtraidos } | { error: string }

const PROMPT = `Eres un asistente que lee facturas y boletas de venta peruanas (de proveedores de una distribuidora de productos de limpieza) a partir de una imagen o PDF.

Extrae exactamente estos datos y responde solo con el JSON pedido:
- tipo_documento: "factura" o "boleta" según el documento (null si no se distingue).
- serie: la serie del comprobante, tal como aparece (ej. "F001", "B003"). null si no es legible.
- numero: el número correlativo del comprobante, sin la serie (ej. "000123"). null si no es legible.
- fecha: la fecha de emisión en formato YYYY-MM-DD. null si no es legible.
- productos: lista de los productos/ítems comprados, cada uno con "nombre" (la descripción tal como aparece), "cantidad" (número) y "precio_unitario" (precio por unidad, en soles, sin el símbolo S/).
- total: el monto total del documento (número, sin símbolo S/). null si no es legible.

Si un campo no se puede leer con confianza, usa null en vez de inventar un valor. No incluyas impuestos ni subtotales como si fueran productos.`

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    tipo_documento: { type: 'string', enum: ['factura', 'boleta'], nullable: true },
    serie: { type: 'string', nullable: true },
    numero: { type: 'string', nullable: true },
    fecha: { type: 'string', nullable: true },
    productos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          nombre: { type: 'string' },
          cantidad: { type: 'number' },
          precio_unitario: { type: 'number' },
        },
        required: ['nombre', 'cantidad', 'precio_unitario'],
      },
    },
    total: { type: 'number', nullable: true },
  },
  required: ['productos'],
} as const

export async function analizarDocumentoCompra(formData: FormData): Promise<ResultadoAnalisisCompra> {
  if (!(await tienePermiso('compras'))) {
    return { error: 'No tienes permiso para esta acción.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Debes iniciar sesión para usar esta función.' }
  }
  if (excedeLimite(user.id)) {
    return { error: 'Demasiados documentos analizados seguidos — espera un minuto antes de volver a intentar.' }
  }

  const archivo = formData.get('archivo')
  if (!(archivo instanceof File)) {
    return { error: 'No se recibió ningún archivo.' }
  }
  if (!archivo.type.startsWith('image/') && !TIPOS_ACEPTADOS.includes(archivo.type)) {
    return { error: 'Solo se aceptan imágenes o archivos PDF.' }
  }
  if (archivo.size > TAMANO_MAXIMO_BYTES) {
    return { error: 'El archivo supera el tamaño máximo de 10 MB.' }
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return { error: 'Falta configurar GEMINI_API_KEY en el servidor.' }
  }

  const bytes = Buffer.from(await archivo.arrayBuffer())
  const base64 = bytes.toString('base64')

  try {
    const ai = new GoogleGenAI({ apiKey })
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-flash-latest',
      contents: [
        {
          role: 'user',
          parts: [{ text: PROMPT }, { inlineData: { mimeType: archivo.type, data: base64 } }],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    })

    const texto = response.text
    if (!texto) {
      return { error: 'La IA no devolvió ninguna respuesta.' }
    }

    const crudo = JSON.parse(texto)

    const productos: ProductoExtraido[] = Array.isArray(crudo.productos)
      ? crudo.productos
          .filter((p: unknown): p is Record<string, unknown> => typeof p === 'object' && p !== null)
          .map((p: Record<string, unknown>) => ({
            nombre: String(p.nombre ?? '').trim(),
            cantidad: Math.max(0, Number(p.cantidad) || 0),
            precio_unitario: Math.max(0, Number(p.precio_unitario) || 0),
          }))
          .filter((p: ProductoExtraido) => p.nombre && p.cantidad > 0)
      : []

    const datos: DatosExtraidos = {
      tipo_documento: crudo.tipo_documento === 'factura' || crudo.tipo_documento === 'boleta' ? crudo.tipo_documento : null,
      serie: typeof crudo.serie === 'string' && crudo.serie.trim() ? crudo.serie.trim() : null,
      numero: typeof crudo.numero === 'string' && crudo.numero.trim() ? crudo.numero.trim() : null,
      fecha: typeof crudo.fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(crudo.fecha) ? crudo.fecha : null,
      productos,
      total: typeof crudo.total === 'number' && crudo.total >= 0 ? crudo.total : null,
    }

    return { datos }
  } catch {
    return { error: 'No se pudo leer el documento con la IA. Intenta de nuevo o completa el formulario manualmente.' }
  }
}
