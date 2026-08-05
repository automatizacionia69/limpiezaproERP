'use client'

import { useState } from 'react'
import { LOGO_URL } from '@/lib/logo'

/**
 * Logo subido por el cliente en Configuración (bucket público 'branding').
 * Si no se subió ninguno, la imagen tira 404 y se muestra `fallback` en su
 * lugar — así funciona igual antes de que un cliente nuevo suba su logo.
 */
export function LogoEmpresa({
  className,
  fallback,
}: {
  className?: string
  fallback: React.ReactNode
}) {
  const [fallo, setFallo] = useState(false)

  if (fallo) return <>{fallback}</>

  return (
    // eslint-disable-next-line @next/next/no-img-element -- URL pública dinámica, no un asset del build
    <img
      src={LOGO_URL}
      alt="Logo de la empresa"
      className={className}
      onError={() => setFallo(true)}
    />
  )
}
