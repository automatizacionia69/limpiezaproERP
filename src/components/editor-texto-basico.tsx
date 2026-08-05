'use client'

import { useEffect, useRef, useState, type KeyboardEvent, type ClipboardEvent } from 'react'

const PATRON_COLOR = /^\[color=(#[0-9a-fA-F]{6})\]/

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
  const [formatoActivo, setFormatoActivo] = useState({ bold: false, italic: false, underline: false })

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
    actualizarFormatoActivo()
  }

  /** Refleja en los botones B/I/U si el cursor está parado dentro de ese formato (como Word). */
  function actualizarFormatoActivo() {
    const sel = window.getSelection()
    const editor = editorRef.current
    if (!sel || sel.rangeCount === 0 || !editor) {
      setFormatoActivo({ bold: false, italic: false, underline: false })
      return
    }
    const rango = sel.getRangeAt(0)
    if (!editor.contains(rango.commonAncestorContainer)) {
      setFormatoActivo({ bold: false, italic: false, underline: false })
      return
    }
    setFormatoActivo({
      bold: elementoFormatoActivo(rango, 'STRONG', editor) !== null,
      italic: elementoFormatoActivo(rango, 'EM', editor) !== null,
      underline: elementoFormatoActivo(rango, 'U', editor) !== null,
    })
  }

  function guardarSeleccionActual() {
    const sel = window.getSelection()
    const editor = editorRef.current
    if (!sel || sel.rangeCount === 0 || !editor) return
    const rango = sel.getRangeAt(0)
    if (editor.contains(rango.commonAncestorContainer)) {
      rangoGuardado.current = rango.cloneRange()
    }
    actualizarFormatoActivo()
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

  /** Busca el ancestro más cercano (dentro del editor) con esa etiqueta. */
  function elementoFormatoActivo(rango: Range, tagName: string, editor: HTMLElement): HTMLElement | null {
    let nodo: Node | null = rango.commonAncestorContainer
    if (nodo.nodeType === Node.TEXT_NODE) nodo = nodo.parentNode
    while (nodo && nodo instanceof HTMLElement && nodo !== editor) {
      if (nodo.tagName === tagName) return nodo
      nodo = nodo.parentNode
    }
    return null
  }

  /** True si la selección cubre, como mínimo, todo el contenido de `el`. */
  function seleccionCubreElemento(rango: Range, el: HTMLElement): boolean {
    const rangoEl = document.createRange()
    rangoEl.selectNodeContents(el)
    return (
      rango.compareBoundaryPoints(Range.START_TO_START, rangoEl) <= 0 &&
      rango.compareBoundaryPoints(Range.END_TO_END, rangoEl) >= 0
    )
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

  function quitarEnvoltura(el: HTMLElement, sel: Selection) {
    const hijos = Array.from(el.childNodes)
    el.replaceWith(...hijos)
    if (hijos.length > 0) {
      const nuevoRango = document.createRange()
      nuevoRango.setStartBefore(hijos[0])
      nuevoRango.setEndAfter(hijos[hijos.length - 1])
      sel.removeAllRanges()
      sel.addRange(nuevoRango)
      rangoGuardado.current = nuevoRango.cloneRange()
    } else {
      // No quedaba nada real adentro (solo el ancla invisible que ya se fue
      // con `el`): el cursor se queda donde estaba el elemento.
      rangoGuardado.current = sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null
    }
    emitirCambio()
  }

  function moverCursorDespuesDe(el: HTMLElement, sel: Selection) {
    const nuevoRango = document.createRange()
    nuevoRango.setStartAfter(el)
    nuevoRango.collapse(true)
    sel.removeAllRanges()
    sel.addRange(nuevoRango)
    rangoGuardado.current = nuevoRango.cloneRange()
  }

  /**
   * Envuelve la selección con la etiqueta, o la quita si ya estaba activa
   * (toggle, ej. seleccionar texto en negrita y volver a apretar B). Con el
   * cursor solo (sin selección): si el formato recién se había activado y
   * todavía no se escribió nada, lo cancela; si ya hay texto con ese
   * formato, solo saca el cursor afuera para seguir escribiendo sin ese
   * estilo, sin tocar lo ya escrito — igual que Word/Excel.
   */
  function alternarFormato(tagName: string, crearElemento: () => HTMLElement) {
    restaurarSeleccion()
    const sel = window.getSelection()
    const editor = editorRef.current
    if (!sel || sel.rangeCount === 0 || !editor) return
    const rango = sel.getRangeAt(0)
    if (!editor.contains(rango.commonAncestorContainer)) return

    const activo = elementoFormatoActivo(rango, tagName, editor)

    if (!rango.collapsed) {
      if (activo && seleccionCubreElemento(rango, activo)) {
        quitarEnvoltura(activo, sel)
        return
      }
      insertarEnvoltura(rango, sel, crearElemento)
      return
    }

    if (activo) {
      const contenido = (activo.textContent ?? '').split(ESPACIO_INVISIBLE).join('')
      if (contenido === '') {
        quitarEnvoltura(activo, sel)
      } else {
        moverCursorDespuesDe(activo, sel)
      }
      return
    }

    insertarEnvoltura(rango, sel, crearElemento)
  }

  function aplicarFormato(tipo: 'bold' | 'italic' | 'underline') {
    if (tipo === 'bold') alternarFormato('STRONG', () => document.createElement('strong'))
    else if (tipo === 'italic') alternarFormato('EM', () => document.createElement('em'))
    else alternarFormato('U', () => document.createElement('u'))
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
        <div className="flex overflow-hidden rounded-lg border-2 border-[#e2e8f0] dark:border-slate-700">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => aplicarFormato('bold')}
            title="Negrita"
            aria-pressed={formatoActivo.bold}
            className={`px-2.5 py-1 text-xs font-extrabold transition-all ${
              formatoActivo.bold
                ? 'bg-sky-500 text-white hover:bg-sky-600'
                : 'text-[#1e293b] hover:bg-[#f1f5f9] dark:text-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            B
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => aplicarFormato('italic')}
            title="Cursiva"
            aria-pressed={formatoActivo.italic}
            className={`border-l-2 border-[#e2e8f0] px-2.5 py-1 text-xs font-bold italic transition-all dark:border-slate-700 ${
              formatoActivo.italic
                ? 'bg-sky-500 text-white hover:bg-sky-600'
                : 'text-[#1e293b] hover:bg-[#f1f5f9] dark:text-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            I
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => aplicarFormato('underline')}
            title="Subrayado"
            aria-pressed={formatoActivo.underline}
            className={`border-l-2 border-[#e2e8f0] px-2.5 py-1 text-xs font-bold underline transition-all dark:border-slate-700 ${
              formatoActivo.underline
                ? 'bg-sky-500 text-white hover:bg-sky-600'
                : 'text-[#1e293b] hover:bg-[#f1f5f9] dark:text-slate-100 dark:hover:bg-slate-800'
            }`}
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
              onMouseDown={guardarSeleccionActual}
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
