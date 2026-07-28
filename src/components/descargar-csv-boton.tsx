'use client'

function celdaCsv(valor: unknown): string {
  const texto = valor === null || valor === undefined ? '' : String(valor)
  if (/[",\n]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`
  }
  return texto
}

export function DescargarCsvBoton({
  nombreArchivo,
  encabezados,
  filas,
  className,
  children,
}: {
  nombreArchivo: string
  encabezados: string[]
  filas: (string | number | null)[][]
  className?: string
  children: React.ReactNode
}) {
  function descargar() {
    const lineas = [encabezados, ...filas].map((fila) => fila.map(celdaCsv).join(','))
    const csv = '﻿' + lineas.join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nombreArchivo
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <button type="button" onClick={descargar} className={className}>
      {children}
    </button>
  )
}
