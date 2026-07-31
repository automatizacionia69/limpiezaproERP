'use server'

import { createClient } from '@/lib/supabase/server'

async function usuarioActual(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

/**
 * Limite simple en memoria para no agotar la cuota PAGA de Decolecta: un
 * usuario logueado normal no necesita mas de un puñado de consultas de
 * RUC/DNI por minuto. Mismo patron Map+TTL que el rate limiter del chatbot
 * (lib/whatsapp/rateLimit.ts) — vive en memoria del proceso, asi que en
 * Vercel cada instancia serverless tiene el suyo (frena abuso accidental de
 * un usuario normal, no es una defensa dura contra alguien decidido).
 */
const VENTANA_MS = 60_000
const MAX_CONSULTAS_POR_VENTANA = 20

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

  return registro.conteo > MAX_CONSULTAS_POR_VENTANA
}

export type ResultadoBusquedaRuc = { nombre: string; direccion: string | null } | { error: string }

export async function buscarRazonSocialPorRuc(ruc: string): Promise<ResultadoBusquedaRuc> {
  const usuarioId = await usuarioActual()
  if (!usuarioId) {
    return { error: 'Debes iniciar sesión para consultar el RUC.' }
  }
  if (excedeLimite(usuarioId)) {
    return { error: 'Demasiadas consultas seguidas — espera un minuto antes de volver a intentar.' }
  }

  const rucLimpio = ruc.trim()

  if (!/^\d{11}$/.test(rucLimpio)) {
    return { error: 'El RUC debe tener 11 dígitos.' }
  }

  const token = process.env.DECOLECTA_API_TOKEN
  if (!token) {
    return { error: 'Falta configurar DECOLECTA_API_TOKEN en el servidor.' }
  }

  try {
    const res = await fetch(`https://api.decolecta.com/v1/sunat/ruc?numero=${rucLimpio}`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    })

    if (res.status === 404) {
      return { error: 'No se encontró ese RUC.' }
    }
    if (!res.ok) {
      return { error: `No se pudo consultar el RUC (${res.status}).` }
    }

    const data = await res.json()
    const nombre =
      data.razon_social ?? data.nombre_o_razon_social ?? data.nombre ?? data.name ?? null
    const direccion = (data.direccion?.trim?.() || null) as string | null

    if (!nombre) {
      return { error: 'La API respondió pero no trajo el nombre — revisa el formato de respuesta.' }
    }

    return { nombre, direccion }
  } catch {
    return { error: 'No se pudo conectar con el servicio de consulta de RUC.' }
  }
}

export type ResultadoBusquedaDni = { nombre: string } | { error: string }

export async function buscarNombrePorDni(dni: string): Promise<ResultadoBusquedaDni> {
  const usuarioId = await usuarioActual()
  if (!usuarioId) {
    return { error: 'Debes iniciar sesión para consultar el DNI.' }
  }
  if (excedeLimite(usuarioId)) {
    return { error: 'Demasiadas consultas seguidas — espera un minuto antes de volver a intentar.' }
  }

  const dniLimpio = dni.trim()

  if (!/^\d{8}$/.test(dniLimpio)) {
    return { error: 'El DNI debe tener 8 dígitos.' }
  }

  const token = process.env.DECOLECTA_API_TOKEN
  if (!token) {
    return { error: 'Falta configurar DECOLECTA_API_TOKEN en el servidor.' }
  }

  try {
    const res = await fetch(`https://api.decolecta.com/v1/reniec/dni?numero=${dniLimpio}`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    })

    if (res.status === 404) {
      return { error: 'No se encontró ese DNI.' }
    }
    if (!res.ok) {
      return { error: `No se pudo consultar el DNI (${res.status}).` }
    }

    const data = await res.json()
    const nombre = data.full_name ?? null

    if (!nombre) {
      return { error: 'La API respondió pero no trajo el nombre — revisa el formato de respuesta.' }
    }

    return { nombre }
  } catch {
    return { error: 'No se pudo conectar con el servicio de consulta de DNI.' }
  }
}
