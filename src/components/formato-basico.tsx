import { Fragment, type ReactNode } from 'react'

const PATRON_COLOR = /^\[color=(#[0-9a-fA-F]{6})\]/

/**
 * Parser recursivo de un lenguaje de marcado propio, muy chico, escrito por
 * el editor de Observaciones/Características (ver EditorTextoBasico):
 *
 *   **negrita**   *cursiva*   __subrayado__   [color=#RRGGBB]texto[/color]
 *
 * No usa HTML ni dangerouslySetInnerHTML — construye nodos de React a mano,
 * así que aunque el texto lo haya escrito cualquier usuario, no hay forma de
 * inyectar HTML/JS: lo único que este parser reconoce son esos 4 patrones
 * (y el color solo si es un hex de 6 dígitos válido); todo lo demás queda
 * como texto plano, escapado automáticamente por React.
 */
function parsearSegmento(texto: string, key: { n: number }): ReactNode[] {
  const nodos: ReactNode[] = []
  let i = 0
  let bufer = ''

  function flush() {
    if (bufer) {
      nodos.push(<Fragment key={key.n++}>{bufer}</Fragment>)
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
        nodos.push(
          <span key={key.n++} style={{ color: colorMatch[1] }}>
            {parsearSegmento(texto.slice(inicioContenido, cierreIdx), key)}
          </span>
        )
        i = cierreIdx + '[/color]'.length
        continue
      }
    }
    if (texto.startsWith('**', i)) {
      const cierreIdx = texto.indexOf('**', i + 2)
      if (cierreIdx !== -1) {
        flush()
        nodos.push(<strong key={key.n++}>{parsearSegmento(texto.slice(i + 2, cierreIdx), key)}</strong>)
        i = cierreIdx + 2
        continue
      }
    }
    if (texto.startsWith('__', i)) {
      const cierreIdx = texto.indexOf('__', i + 2)
      if (cierreIdx !== -1) {
        flush()
        nodos.push(<u key={key.n++}>{parsearSegmento(texto.slice(i + 2, cierreIdx), key)}</u>)
        i = cierreIdx + 2
        continue
      }
    }
    if (texto[i] === '*') {
      const cierreIdx = texto.indexOf('*', i + 1)
      if (cierreIdx !== -1) {
        flush()
        nodos.push(<em key={key.n++}>{parsearSegmento(texto.slice(i + 1, cierreIdx), key)}</em>)
        i = cierreIdx + 1
        continue
      }
    }
    bufer += texto[i]
    i++
  }
  flush()
  return nodos
}

export function FormatoBasico({ texto }: { texto: string | null | undefined }) {
  if (!texto) return null
  return <>{parsearSegmento(texto, { n: 0 })}</>
}
