'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

export type OpcionBuscador = { id: number | string; nombre: string; subtitulo?: string }

export function Buscador({
  opciones,
  valor,
  onChange,
  placeholder = 'Escribe para buscar...',
  name,
  required,
  disabled,
  vacio = 'Sin resultados',
}: {
  opciones: OpcionBuscador[]
  valor: number | string | ''
  onChange: (id: number | string | '') => void
  placeholder?: string
  name?: string
  required?: boolean
  disabled?: boolean
  vacio?: string
}) {
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState('')
  const contenedorRef = useRef<HTMLDivElement>(null)

  const seleccionado = opciones.find((o) => String(o.id) === String(valor))

  useEffect(() => {
    function onClickFuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false)
        setTexto('')
      }
    }
    document.addEventListener('mousedown', onClickFuera)
    return () => document.removeEventListener('mousedown', onClickFuera)
  }, [])

  const filtradas = useMemo(() => {
    const q = texto.trim().toLowerCase()
    if (!q) return opciones
    return opciones.filter((o) => o.nombre.toLowerCase().includes(q))
  }, [opciones, texto])

  return (
    <div ref={contenedorRef} className="relative">
      {name && <input type="hidden" name={name} value={valor} required={required} />}
      <div className="relative">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[#94a3b8]"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input
          type="text"
          disabled={disabled}
          value={abierto ? texto : (seleccionado?.nombre ?? '')}
          onChange={(e) => {
            setTexto(e.target.value)
            if (!abierto) setAbierto(true)
          }}
          onFocus={() => {
            setAbierto(true)
            setTexto('')
          }}
          placeholder={seleccionado && !abierto ? seleccionado.nombre : placeholder}
          className="w-full rounded-xl border-2 border-[#e2e8f0] bg-white py-3 pr-4 pl-10 text-base text-[#1e293b] outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-[#f8fafc] disabled:opacity-60"
        />
      </div>

      {abierto && !disabled && (
        <div className="absolute z-30 mt-1.5 max-h-64 w-full overflow-auto rounded-xl border-2 border-[#e2e8f0] bg-white py-1.5 shadow-xl">
          {filtradas.length === 0 ? (
            <p className="px-4 py-3 text-sm font-medium text-[#94a3b8]">{vacio}</p>
          ) : (
            filtradas.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  onChange(o.id)
                  setAbierto(false)
                  setTexto('')
                }}
                className={`block w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-indigo-50 ${
                  String(o.id) === String(valor) ? 'bg-indigo-50 font-bold text-indigo-700' : 'text-[#1e293b]'
                }`}
              >
                {o.nombre}
                {o.subtitulo && <span className="ml-2 text-xs text-[#94a3b8]">{o.subtitulo}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
