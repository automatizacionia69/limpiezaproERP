'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

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
  compacto = false,
  mostrarTodo = false,
  crearNuevo,
}: {
  opciones: OpcionBuscador[]
  valor: number | string | ''
  onChange: (id: number | string | '') => void
  placeholder?: string
  name?: string
  required?: boolean
  disabled?: boolean
  vacio?: string
  /** Versión angosta (misma altura/tipografía que el resto de una fila de tabla). */
  compacto?: boolean
  /** Comportamiento de desplegable: muestra todas las opciones ya al enfocar, sin esperar a que se escriba. Al escribir, filtra igual que siempre. */
  mostrarTodo?: boolean
  /** Opcional: agrega una fila fija "+ Crear nuevo" al fondo del menú (ej. alta rápida de producto desde Compras). No aparece si no se pasa esta prop. */
  crearNuevo?: { etiqueta: (texto: string) => string; onClick: (texto: string) => void }
}) {
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState('')
  // true en cuanto el usuario toca el teclado dentro del campo (a diferencia
  // de que `texto` traiga algo solo porque el foco lo precargó con el
  // nombre ya elegido, para poder borrarlo a mano).
  const [interactuando, setInteractuando] = useState(false)
  const [posicion, setPosicion] = useState<{ top: number; left: number; width: number } | null>(null)
  const contenedorRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const seleccionado = opciones.find((o) => String(o.id) === String(valor))

  // El menú de coincidencias solo se muestra una vez que el usuario empezó a
  // escribir algo — un clic/foco en el campo, por sí solo, no despliega toda
  // la lista (aunque el foco ya haya precargado el nombre elegido) — salvo
  // en modo `mostrarTodo`, donde se comporta como un desplegable clásico:
  // toda la lista aparece ya con el foco, y escribir sigue filtrando igual.
  const mostrarMenu = abierto && (mostrarTodo || (interactuando && texto.trim() !== ''))

  function actualizarPosicion() {
    const rect = inputRef.current?.getBoundingClientRect()
    if (rect) setPosicion({ top: rect.bottom + 6, left: rect.left, width: rect.width })
  }

  useEffect(() => {
    function onClickFuera(e: MouseEvent) {
      const objetivo = e.target as Node
      const dentroDelCampo = contenedorRef.current?.contains(objetivo)
      const dentroDelMenu = dropdownRef.current?.contains(objetivo)
      if (!dentroDelCampo && !dentroDelMenu) {
        // El usuario borró el texto a mano (seleccionar todo + Delete, por
        // ejemplo) y se fue sin elegir nada nuevo: eso también cuenta como
        // "quitar la selección", no solo el botón ×.
        if (interactuando && texto.trim() === '' && seleccionado) {
          onChange('')
        }
        setAbierto(false)
        setTexto('')
        setInteractuando(false)
      }
    }
    document.addEventListener('mousedown', onClickFuera)
    return () => document.removeEventListener('mousedown', onClickFuera)
  }, [interactuando, texto, seleccionado, onChange])

  // El menú se dibuja en un portal a document.body (posición fixed, calculada
  // acá) en vez de quedar anidado en el DOM del campo: así no lo recorta el
  // contenedor con scroll horizontal de la tabla de Productos (overflow-x-auto
  // implica overflow-y no-visible por regla del CSSOM, lo que antes dejaba el
  // menú invisible/recortado al buscar un producto dentro de esa tabla).
  useEffect(() => {
    if (!mostrarMenu) return
    actualizarPosicion()
    window.addEventListener('scroll', actualizarPosicion, true)
    window.addEventListener('resize', actualizarPosicion)
    return () => {
      window.removeEventListener('scroll', actualizarPosicion, true)
      window.removeEventListener('resize', actualizarPosicion)
    }
  }, [mostrarMenu])

  const filtradas = useMemo(() => {
    // En modo `mostrarTodo`, el texto precargado al enfocar (el nombre ya
    // elegido) no debe filtrar la lista todavía — recién filtra una vez que
    // el usuario escribe de verdad (`interactuando`).
    const q = (mostrarTodo && !interactuando ? '' : texto).trim().toLowerCase()
    if (!q) return opciones
    return opciones.filter((o) => o.nombre.toLowerCase().includes(q))
  }, [opciones, texto, mostrarTodo, interactuando])

  return (
    <div ref={contenedorRef} className="relative">
      {name && <input type="hidden" name={name} value={valor} required={required} />}
      <div className="relative">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-[#94a3b8] dark:text-slate-500 ${
            compacto ? 'left-2.5 h-3.5 w-3.5' : 'left-4 h-4 w-4'
          }`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          autoComplete="off"
          disabled={disabled}
          value={abierto ? texto : (seleccionado?.nombre ?? '')}
          onChange={(e) => {
            setTexto(e.target.value)
            setInteractuando(true)
            if (!abierto) setAbierto(true)
          }}
          onFocus={() => {
            setAbierto(true)
            // Precarga el nombre ya elegido (editable, no en blanco): así se
            // puede borrar a mano con Backspace/Supr como cualquier campo de
            // texto. `interactuando` sigue en false hasta que realmente
            // toque el teclado, para no desplegar el menú solo por enfocar.
            setTexto(seleccionado?.nombre ?? '')
            setInteractuando(false)
          }}
          placeholder={seleccionado && !abierto ? seleccionado.nombre : placeholder}
          className={
            compacto
              ? `w-full rounded-lg border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] py-2 pl-8 text-xs text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-[#f8fafc] disabled:opacity-60 ${seleccionado && !abierto ? 'pr-7' : 'pr-2'}`
              : `w-full rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] py-3 pl-10 text-base text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-[#f8fafc] disabled:opacity-60 ${seleccionado && !abierto ? 'pr-9' : 'pr-4'}`
          }
        />
        {seleccionado && !abierto && !disabled && (
          <button
            type="button"
            title="Quitar selección"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onChange('')
              setTexto('')
              setInteractuando(false)
            }}
            className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full text-[#94a3b8] transition-colors hover:bg-red-100 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-950/40 ${
              compacto ? 'right-1.5 h-4 w-4' : 'right-3 h-5 w-5'
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className={compacto ? 'h-3 w-3' : 'h-3.5 w-3.5'}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {mostrarMenu &&
        !disabled &&
        posicion &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{ position: 'fixed', top: posicion.top, left: posicion.left, width: posicion.width }}
            className="z-50 max-h-64 overflow-auto rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] py-1.5 shadow-xl"
          >
            {filtradas.length === 0 ? (
              <p className="px-4 py-3 text-sm font-medium text-[#94a3b8] dark:text-slate-500">{vacio}</p>
            ) : (
              filtradas.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => {
                    onChange(o.id)
                    setAbierto(false)
                    setTexto('')
                    setInteractuando(false)
                  }}
                  className={`block w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-indigo-50 ${
                    String(o.id) === String(valor) ? 'bg-indigo-50 font-bold text-indigo-700' : 'text-[#1e293b] dark:text-slate-100'
                  }`}
                >
                  {o.nombre}
                  {o.subtitulo && <span className="ml-2 text-xs text-[#94a3b8] dark:text-slate-500">{o.subtitulo}</span>}
                </button>
              ))
            )}
            {crearNuevo && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  crearNuevo.onClick(texto.trim())
                  setAbierto(false)
                  setInteractuando(false)
                }}
                className="block w-full border-t border-[#e2e8f0] dark:border-slate-700 px-4 py-2.5 text-left text-sm font-bold text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
              >
                + {crearNuevo.etiqueta(texto.trim())}
              </button>
            )}
          </div>,
          document.body
        )}
    </div>
  )
}
