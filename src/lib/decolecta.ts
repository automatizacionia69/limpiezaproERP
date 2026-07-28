'use server'

export type ResultadoBusquedaRuc = { nombre: string; direccion: string | null } | { error: string }

export async function buscarRazonSocialPorRuc(ruc: string): Promise<ResultadoBusquedaRuc> {
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
