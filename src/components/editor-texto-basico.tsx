'use client'

import { useRef } from 'react'
import { FormatoBasico } from './formato-basico'

/**
 * Textarea con botones B/I/U + color que envuelven la selección con
 * **negrita**, *cursiva*, __subrayado__ o [color=#hex]...[/color] (ver
 * FormatoBasico) + una vista previa en vivo debajo, para notar el efecto sin
 * abrir la "Vista previa" completa de la cotización.
 *
 * No es un editor WYSIWYG real (no usa contentEditable ni HTML) a propósito:
 * así el texto guardado nunca puede contener HTML/script — solo texto plano
 * con marcadores propios, que es lo único que FormatoBasico interpreta.
 */
export function EditorTextoBasico({
  valor,
  onChange,
  name,
  rows = 3,
  maxLength,
  placeholder,
}: {
  valor: string
  onChange: (valor: string) => void
  name?: string
  rows?: number
  maxLength?: number
  placeholder?: string
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function envolverSeleccion(abre: string, cierra: string, placeholderTexto: string) {
    const textarea = textareaRef.current
    if (!textarea) return
    const inicio = textarea.selectionStart
    const fin = textarea.selectionEnd
    const seleccionado = valor.slice(inicio, fin) || placeholderTexto
    const nuevo = valor.slice(0, inicio) + abre + seleccionado + cierra + valor.slice(fin)
    if (maxLength && nuevo.length > maxLength) return
    onChange(nuevo)
    requestAnimationFrame(() => {
      const cursor = inicio + abre.length + seleccionado.length + cierra.length
      textarea.focus()
      textarea.setSelectionRange(cursor, cursor)
    })
  }

  function aplicarFormato(tipo: 'bold' | 'italic' | 'underline') {
    if (tipo === 'bold') envolverSeleccion('**', '**', 'negrita')
    else if (tipo === 'italic') envolverSeleccion('*', '*', 'cursiva')
    else envolverSeleccion('__', '__', 'subrayado')
  }

  function aplicarColor(color: string) {
    envolverSeleccion(`[color=${color}]`, '[/color]', 'texto')
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="flex overflow-hidden rounded-lg border-2 border-[#e2e8f0] dark:border-slate-700">
          <button
            type="button"
            onClick={() => aplicarFormato('bold')}
            title="Negrita"
            className="px-2.5 py-1 text-xs font-extrabold text-[#1e293b] transition-all hover:bg-[#f1f5f9] dark:text-slate-100 dark:hover:bg-slate-800"
          >
            B
          </button>
          <button
            type="button"
            onClick={() => aplicarFormato('italic')}
            title="Cursiva"
            className="border-l-2 border-[#e2e8f0] px-2.5 py-1 text-xs font-bold italic text-[#1e293b] transition-all hover:bg-[#f1f5f9] dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            I
          </button>
          <button
            type="button"
            onClick={() => aplicarFormato('underline')}
            title="Subrayado"
            className="border-l-2 border-[#e2e8f0] px-2.5 py-1 text-xs font-bold underline text-[#1e293b] transition-all hover:bg-[#f1f5f9] dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            U
          </button>
          <label
            title="Color de letra"
            className="relative flex cursor-pointer items-center border-l-2 border-[#e2e8f0] px-2.5 transition-all hover:bg-[#f1f5f9] dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <span className="text-xs font-bold text-[#1e293b] dark:text-slate-100">A</span>
            <span className="ml-1 block h-2.5 w-2.5 rounded-full bg-gradient-to-r from-red-500 via-lime-500 to-sky-500" />
            <input
              type="color"
              onChange={(e) => aplicarColor(e.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>
        </div>
        {maxLength && (
          <span className="text-[11px] font-medium text-[#94a3b8] dark:text-slate-500">
            {valor.length} / {maxLength}
          </span>
        )}
      </div>
      <textarea
        ref={textareaRef}
        name={name}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-lg border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-3 py-2 text-sm text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-100 resize-y"
      />
      {valor && (
        <div className="mt-1.5 rounded-lg bg-[#f8fafc] dark:bg-slate-800/60 px-3 py-2 text-xs text-[#64748b] dark:text-slate-400">
          <span className="font-bold text-[#94a3b8] dark:text-slate-500">Así se verá: </span>
          <FormatoBasico texto={valor} />
        </div>
      )}
    </div>
  )
}
