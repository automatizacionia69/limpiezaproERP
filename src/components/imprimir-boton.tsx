'use client'

import { imprimirEnModoClaro } from '@/lib/imprimir'

export function ImprimirBoton({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={imprimirEnModoClaro} className={className}>
      {children}
    </button>
  )
}
