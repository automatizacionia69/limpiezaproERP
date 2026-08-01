'use client'

import { useRef, useState, useTransition } from 'react'
import { analizarDocumentoCompra, type DatosExtraidos } from './analizar-documento'

const TAMANO_MAXIMO_BYTES = 10 * 1024 * 1024

function formatearTamano(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function SubirDocumentoCompra({ onExtraido }: { onExtraido: (datos: DatosExtraidos) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState(false)
  const [analizando, iniciarAnalisis] = useTransition()

  function analizar(file: File) {
    setError(null)
    setExito(false)
    iniciarAnalisis(async () => {
      const formData = new FormData()
      formData.append('archivo', file)
      const resultado = await analizarDocumentoCompra(formData)
      if ('error' in resultado) {
        setError(resultado.error)
        return
      }
      setExito(true)
      onExtraido(resultado.datos)
    })
  }

  function manejarSeleccion(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const esImagen = file.type.startsWith('image/')
    const esPdf = file.type === 'application/pdf'
    if (!esImagen && !esPdf) {
      setError('Solo se aceptan imágenes o archivos PDF.')
      return
    }
    if (file.size > TAMANO_MAXIMO_BYTES) {
      setError('El archivo supera el tamaño máximo de 10 MB.')
      return
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setError(null)
    setExito(false)
    setArchivo(file)
    setPreviewUrl(esImagen ? URL.createObjectURL(file) : null)
    analizar(file)
  }

  function quitarArchivo() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setArchivo(null)
    setPreviewUrl(null)
    setError(null)
    setExito(false)
  }

  return (
    <div className="rounded-2xl border-2 border-dashed border-pink-200 dark:border-pink-900/40 bg-[#fdf2f8]/50 dark:bg-slate-800/40 p-5">
      <label className="block text-sm font-bold text-[#1e293b] dark:text-slate-100">
        Subir imagen o PDF de la factura/boleta
      </label>
      <p className="mt-1 text-xs font-medium text-[#94a3b8] dark:text-slate-500">
        La IA lee el documento y completa el formulario por ti.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={manejarSeleccion}
        className="hidden"
      />

      {!archivo ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-pink-500 px-4 py-3 text-sm font-bold text-white shadow-sm shadow-pink-500/30 transition-all hover:bg-pink-600"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L7 9m5-5 5 5M5 20h14" />
          </svg>
          Subir imagen o PDF
        </button>
      ) : (
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-white dark:bg-[#141a2e] p-3">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Vista previa del documento" className="h-14 w-14 rounded-lg object-cover" />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-pink-100 dark:bg-pink-900/30 text-pink-600">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 3v5h5" />
              </svg>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-[#1e293b] dark:text-slate-100">{archivo.name}</p>
            <p className="text-xs font-medium text-[#94a3b8] dark:text-slate-500">{formatearTamano(archivo.size)}</p>
          </div>
          <button
            type="button"
            onClick={quitarArchivo}
            disabled={analizando}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#64748b] dark:text-slate-400 transition-all hover:bg-red-100 hover:text-red-600 disabled:opacity-30"
            title="Quitar archivo"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {analizando && (
        <p className="mt-2 flex items-center gap-2 text-xs font-bold text-pink-600">
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 animate-spin">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={3} className="opacity-25" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
          </svg>
          Leyendo el documento con IA...
        </p>
      )}

      {!analizando && exito && (
        <p className="mt-2 text-xs font-bold text-emerald-600">
          ✓ Datos leídos — revisa que los campos del formulario estén correctos.
        </p>
      )}

      {!analizando && error && (
        <div className="mt-2 flex items-center gap-2">
          <p role="alert" className="text-xs font-bold text-red-600">
            {error}
          </p>
          {archivo && (
            <button
              type="button"
              onClick={() => analizar(archivo)}
              className="shrink-0 text-xs font-bold text-pink-600 underline hover:text-pink-700"
            >
              Reintentar
            </button>
          )}
        </div>
      )}

      <p className="mt-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-500">
        ⚠️ La IA puede equivocarse — revisa los datos manualmente antes de guardar.
      </p>
    </div>
  )
}
