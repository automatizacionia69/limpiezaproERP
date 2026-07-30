'use server'

import { createClient } from '@/lib/supabase/server'

async function haySesion(): Promise<boolean> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user !== null
}

export type ResultadoBusquedaRuc = { nombre: string; direccion: string | null } | { error: string }

export async function buscarRazonSocialPorRuc(ruc: string): Promise<ResultadoBusquedaRuc> {
  if (!(await haySesion())) {
    return { error: 'Debes iniciar sesión para consultar el RUC.' }
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
  if (!(await haySesion())) {
    return { error: 'Debes iniciar sesión para consultar el DNI.' }
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
