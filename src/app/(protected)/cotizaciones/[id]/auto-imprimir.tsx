'use client'

import { useEffect, useRef } from 'react'
import { imprimirEnModoClaro } from '@/lib/imprimir'

/**
 * Dispara el diálogo de impresión solo, una vez, cuando se llega a la
 * página con un `?formato=` en la URL (los 3 botones del modal de éxito de
 * Cotizaciones). Entrar a la página por otra vía (ej. desde la lista de
 * Cotizaciones) no trae `formato` y no imprime nada solo.
 */
export function AutoImprimir({ activo }: { activo: boolean }) {
  const yaImprimio = useRef(false)

  useEffect(() => {
    if (activo && !yaImprimio.current) {
      yaImprimio.current = true
      imprimirEnModoClaro()
    }
  }, [activo])

  return null
}
