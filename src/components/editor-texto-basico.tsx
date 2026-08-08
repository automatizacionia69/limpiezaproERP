'use client'

import { useEffect, useRef, useState, type KeyboardEvent, type ClipboardEvent } from 'react'

const PATRON_COLOR = /^\[color=(#[0-9a-fA-F]{6})\]/

const COLORES_OBSERVACION = [
  { nombre: 'Azul', hex: '#0ea5e9' },
  { nombre: 'Rojo', hex: '#ef4444' },
  { nombre: 'Verde', hex: '#10b981' },
  { nombre: 'Morado', hex: '#8b5cf6' },
]

/**
 * Carácter ancla invisible: al presionar B/I/U/color sin nada seleccionado
 * (ej. "quiero que lo que escriba de ahora en adelante salga en negrita",
 * igual que Word/Excel), se necesita un nodo de texto no vacío dentro de la
 * etiqueta para poder ubicar el cursor adentro — si no, el navegador no deja
 * "entrar" a un elemento inline vacío. Nunca se guarda: serializarNodo lo
 * quita siempre antes de convertir a texto plano.
 */
const ESPACIO_INVISIBLE = '\u200B'

/**
 * Construye nodos DOM reales (nunca innerHTML/dangerouslySetInnerHTML) a
 * partir del mismo lenguaje de marcado que interpreta FormatoBasico
 * (**negrita** *cursiva* __subrayado__ [color=#hex]texto[/color] + saltos de
 * línea). Mismo algoritmo que el parser de formato-basico.tsx, pero arma
 * elementos DOM en vez de nodos de React porque esta caja necesita una
 * superficie contentEditable real para que el usuario vea el formato
 * aplicado al instante, sin una vista previa aparte.
 */
function construirFragmento(doc: Document, texto: string): DocumentFragment {
  const frag = doc.createDocumentFragment()
  let i = 0
  let bufer = ''

  function flush() {
    if (bufer) {
      frag.appendChild(doc.createTextNode(bufer))
      bufer = ''
    }
  }

  while (i < texto.length) {
    const colorMatch = PATRON_COLOR.exec(texto.slice(i))
    if (colorMatch) {
      const inicioContenido = i + colorMatch[0].length
      const cierreIdx = texto.indexOf('[/color]', inicioContenido)
      if (cierreIdx !== -1) {
        flush()
        const span = doc.createElement('span')
        span.dataset.color = colorMatch[1]
        span.style.color = colorMatch[1]
        span.appendChild(construirFragmento(doc, texto.slice(inicioContenido, cierreIdx)))
        frag.appendChild(span)
        i = cierreIdx + '[/color]'.length
        continue
      }
    }
    if (texto.startsWith('**', i)) {
      const cierreIdx = texto.indexOf('**', i + 2)
      if (cierreIdx !== -1) {
        flush()
        const el = doc.createElement('strong')
        el.appendChild(construirFragmento(doc, texto.slice(i + 2, cierreIdx)))
        frag.appendChild(el)
        i = cierreIdx + 2
        continue
      }
    }
    if (texto.startsWith('__', i)) {
      const cierreIdx = texto.indexOf('__', i + 2)
      if (cierreIdx !== -1) {
        flush()
        const el = doc.createElement('u')
        el.appendChild(construirFragmento(doc, texto.slice(i + 2, cierreIdx)))
        frag.appendChild(el)
        i = cierreIdx + 2
        continue
      }
    }
    if (texto[i] === '*') {
      const cierreIdx = texto.indexOf('*', i + 1)
      if (cierreIdx !== -1) {
        flush()
        const el = doc.createElement('em')
        el.appendChild(construirFragmento(doc, texto.slice(i + 1, cierreIdx)))
        frag.appendChild(el)
        i = cierreIdx + 1
        continue
      }
    }
    if (texto[i] === '\n') {
      flush()
      frag.appendChild(doc.createElement('br'))
      i++
      continue
    }
    bufer += texto[i]
    i++
  }
  flush()
  return frag
}

/**
 * Camino inverso: recorre el DOM que el usuario acaba de editar y lo vuelve
 * a convertir al mismo lenguaje de marcado plano de arriba. Es el único
 * lugar que "lee" el DOM del editor — el valor que se guarda y se manda al
 * server (y lo que ve cualquier otro usuario vía FormatoBasico) siempre es
 * este texto plano, nunca el HTML en sí, así que un <script>/onerror que
 * alguien pegue no sobrevive a este recorrido (ver manejarPegado más abajo,
 * que además evita que ese HTML llegue a ejecutarse en el DOM del propio
 * editor).
 */
function serializarNodo(nodo: ChildNode): string {
  if (nodo.nodeType === Node.TEXT_NODE) {
    return (nodo.textContent ?? '').split(ESPACIO_INVISIBLE).join('')
  }
  if (nodo.nodeType !== Node.ELEMENT_NODE) return ''
  const el = nodo as HTMLElement
  const hijos = Array.from(el.childNodes).map(serializarNodo).join('')
  // Si no quedó nada adentro (ej. se activó negrita pero nunca se llegó a
  // escribir) no se guardan los marcadores de un formato vacío.
  switch (el.tagName) {
    case 'STRONG':
    case 'B':
      return hijos ? `**${hijos}**` : ''
    case 'EM':
    case 'I':
      return hijos ? `*${hijos}*` : ''
    case 'U':
      return hijos ? `__${hijos}__` : ''
    case 'BR':
      return '\n'
    case 'DIV':
    case 'P':
      return `\n${hijos}`
    case 'SPAN': {
      const color = el.dataset.color
      return color && hijos ? `[color=${color}]${hijos}[/color]` : hijos
    }
    default:
      return hijos
  }
}

function serializarEditor(el: HTMLElement): string {
  return Array.from(el.childNodes).map(serializarNodo).join('').replace(/^\n/, '')
}

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
  const editorRef = useRef<HTMLDivElement>(null)
  const ultimoEmitido = useRef<string>('')
  const rangoGuardado = useRef<Range | null>(null)
  const [mostrarColores, setMostrarColores] = useState(false)
  const coloresRef = useRef<HTMLDivElement>(null)

  // Cierra el desplegable de colores al hacer clic afuera.
  useEffect(() => {
    if (!mostrarColores) return
    function alClickearAfuera(e: MouseEvent) {
      if (coloresRef.current && !coloresRef.current.contains(e.target as Node)) {
        setMostrarColores(false)
      }
    }
    document.addEventListener('mousedown', alClickearAfuera)
    return () => document.removeEventListener('mousedown', alClickearAfuera)
  }, [mostrarColores])

  // Sincroniza el DOM cuando `valor` cambia desde afuera (carga inicial, o
  // se cambió de línea en el modal de Características) — nunca cuando el
  // cambio vino de este mismo editor, para no pelear con el cursor mientras
  // el usuario escribe.
  useEffect(() => {
    if (valor === ultimoEmitido.current) return
    const editor = editorRef.current
    if (!editor) return
    editor.innerHTML = ''
    editor.appendChild(construirFragmento(document, valor))
    ultimoEmitido.current = valor
  }, [valor])

  function emitirCambio() {
    const editor = editorRef.current
    if (!editor) return
    let nuevo = serializarEditor(editor)
    if (maxLength && nuevo.length > maxLength) {
      nuevo = nuevo.slice(0, maxLength)
      editor.innerHTML = ''
      editor.appendChild(construirFragmento(document, nuevo))
      const rango = document.createRange()
      rango.selectNodeContents(editor)
      rango.collapse(false)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(rango)
    }
    ultimoEmitido.current = nuevo
    onChange(nuevo)
  }

  function guardarSeleccionActual() {
    const sel = window.getSelection()
    const editor = editorRef.current
    if (!sel || sel.rangeCount === 0 || !editor) return
    const rango = sel.getRangeAt(0)
    if (editor.contains(rango.commonAncestorContainer)) {
      rangoGuardado.current = rango.cloneRange()
    }
  }

  function restaurarSeleccion() {
    const editor = editorRef.current
    if (!editor) return
    editor.focus()
    const rango = rangoGuardado.current
    if (!rango) return
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(rango)
  }

  /**
   * Envuelve la selección con la etiqueta. Si no hay nada seleccionado (solo
   * el cursor), arma un elemento con el ancla invisible adentro y deja el
   * cursor justo después de esa ancla: lo próximo que el usuario escriba cae
   * dentro del elemento (mismo comportamiento que Word/Excel al activar
   * negrita/cursiva/subrayado/color sin seleccionar texto primero).
   */
  function insertarEnvoltura(rango: Range, sel: Selection, crearElemento: () => HTMLElement) {
    const envoltura = crearElemento()
    if (rango.collapsed) {
      envoltura.appendChild(document.createTextNode(ESPACIO_INVISIBLE))
    } else {
      envoltura.appendChild(rango.extractContents())
    }
    rango.insertNode(envoltura)

    const nuevoRango = document.createRange()
    nuevoRango.selectNodeContents(envoltura)
    if (rango.collapsed) nuevoRango.collapse(false)
    sel.removeAllRanges()
    sel.addRange(nuevoRango)
    rangoGuardado.current = nuevoRango.cloneRange()

    emitirCambio()
  }

  function aplicarColor(color: string) {
    restaurarSeleccion()
    const sel = window.getSelection()
    const editor = editorRef.current
    if (!sel || sel.rangeCount === 0 || !editor) return
    const rango = sel.getRangeAt(0)
    if (!editor.contains(rango.commonAncestorContainer)) return
    insertarEnvoltura(rango, sel, () => {
      const span = document.createElement('span')
      span.dataset.color = color
      span.style.color = color
      return span
    })
  }

  function manejarTeclaAbajo(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      document.execCommand('insertLineBreak')
      emitirCambio()
    }
  }

  // Nunca se deja que HTML pegado entre al DOM del editor (podría traer
  // <script>/onerror y ejecutarse ahí mismo) — solo se inserta el texto
  // plano del portapapeles, en la posición del cursor.
  function manejarPegado(e: ClipboardEvent<HTMLDivElement>) {
    e.preventDefault()
    const texto = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, texto)
    emitirCambio()
  }

  const vacio = valor === ''

  return (
    <div>
      <div className="flex items-center gap-2">
        <div ref={coloresRef} className="relative">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setMostrarColores((v) => !v)}
            title="Color de letra"
            className="flex items-center gap-1.5 rounded-lg border-2 border-[#e2e8f0] px-2.5 py-1.5 text-xs font-bold text-[#1e293b] transition-all hover:bg-[#f1f5f9] dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            A
            <span className="block h-2.5 w-2.5 rounded-full bg-gradient-to-r from-sky-500 via-red-500 to-violet-500" />
          </button>
          {mostrarColores && (
            <div className="absolute left-0 top-full z-20 mt-1.5 flex gap-1 rounded-lg border-2 border-[#e2e8f0] bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-[#141a2e]">
              {COLORES_OBSERVACION.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    aplicarColor(c.hex)
                    setMostrarColores(false)
                  }}
                  title={c.nombre}
                  className="flex h-7 w-7 items-center justify-center rounded-md transition-all hover:bg-[#f1f5f9] dark:hover:bg-slate-800"
                >
                  <span className="block h-3.5 w-3.5 rounded-full" style={{ backgroundColor: c.hex }} />
                </button>
              ))}
            </div>
          )}
        </div>
        {maxLength && (
          <span className="text-[11px] font-medium text-[#94a3b8] dark:text-slate-500">
            {valor.length} / {maxLength}
          </span>
        )}
      </div>
      <div className="relative mt-1.5">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={emitirCambio}
          onKeyDown={manejarTeclaAbajo}
          onPaste={manejarPegado}
          onMouseUp={guardarSeleccionActual}
          onKeyUp={guardarSeleccionActual}
          style={{ minHeight: `${rows * 1.5}rem`, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
          className="w-full rounded-lg border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-3 py-2 text-sm text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
        />
        {vacio && placeholder && (
          <span className="pointer-events-none absolute left-3 top-2 text-sm text-[#94a3b8] dark:text-slate-500">
            {placeholder}
          </span>
        )}
      </div>
      {name && <input type="hidden" name={name} value={valor} />}
    </div>
  )
}
