'use client'

import { useActionState, useState } from 'react'
import { subirLogo, type EstadoLogo } from './actions'
import { LOGO_URL } from '@/lib/logo'

const LABEL = 'block text-sm font-bold text-[#1e293b] dark:text-slate-100'

export function LogoUploader({ puedeEditar }: { puedeEditar: boolean }) {
  const [estado, formAction] = useActionState<EstadoLogo, FormData>(subirLogo, { error: null })
  const [preview, setPreview] = useState<string | null>(null)
  const [sinLogo, setSinLogo] = useState(false)

  function alElegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    if (archivo) {
      setPreview(URL.createObjectURL(archivo))
      setSinLogo(false)
    }
  }

  return (
    <div className="rounded-2xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-[#f8fafc] dark:bg-[#0f1424] p-5">
      <label className={LABEL}>Logo de la empresa</label>
      <p className="mt-1 text-xs font-medium text-[#64748b] dark:text-slate-400">
        Aparece en el login, el menú lateral y los comprobantes/reportes impresos. Recomendado: imagen
        cuadrada, PNG o SVG, máximo 2MB.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-5">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[#cbd5e1] dark:border-slate-600 bg-white dark:bg-[#141a2e]">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- vista previa local (object URL), no un asset del build
            <img src={preview} alt="Vista previa del logo" className="h-full w-full object-contain" />
          ) : sinLogo ? (
            <span className="text-center text-[10px] font-medium text-[#94a3b8]">Sin logo</span>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- URL pública dinámica, no un asset del build
            <img
              src={LOGO_URL}
              alt="Logo actual"
              className="h-full w-full object-contain"
              onError={() => setSinLogo(true)}
            />
          )}
        </div>

        {puedeEditar ? (
          <form action={formAction} className="flex-1 space-y-2">
            <input
              type="file"
              name="logo"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              onChange={alElegirArchivo}
              className="block w-full text-sm text-[#1e293b] dark:text-slate-100 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-indigo-500"
            />
            <button
              type="submit"
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-indigo-500/30 transition-all hover:bg-indigo-500 active:scale-95"
            >
              Subir logo
            </button>
            {estado.error && (
              <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                {estado.error}
              </p>
            )}
            {estado.ok && (
              <p role="status" className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                ✅ Logo actualizado. Puede tardar unos minutos en verse en otras pestañas.
              </p>
            )}
          </form>
        ) : (
          <p className="text-xs font-medium text-[#94a3b8]">Solo un administrador puede cambiar el logo.</p>
        )}
      </div>
    </div>
  )
}
