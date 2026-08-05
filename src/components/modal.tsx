'use client'

import { useEffect } from 'react'

/** Modal genérico reutilizable — backdrop + ESC para cerrar, estilo consistente con las tarjetas del ERP. */
export function Modal({
  abierto,
  onClose,
  children,
  className,
}: {
  abierto: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
}) {
  useEffect(() => {
    if (!abierto) return
    function alPresionarTecla(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', alPresionarTecla)
    return () => document.removeEventListener('keydown', alPresionarTecla)
  }, [abierto, onClose])

  if (!abierto) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={`max-h-[90vh] w-full overflow-y-auto rounded-3xl border-2 border-[#e2e8f0] bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-[#141a2e] ${className ?? 'max-w-lg'}`}
      >
        {children}
      </div>
    </div>
  )
}
