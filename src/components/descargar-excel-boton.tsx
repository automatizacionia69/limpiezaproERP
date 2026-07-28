'use client'

export function DescargarExcelBoton({
  nombreArchivo,
  hoja,
  encabezados,
  filas,
  className,
  children,
}: {
  nombreArchivo: string
  hoja: string
  encabezados: string[]
  filas: (string | number | null)[][]
  className?: string
  children: React.ReactNode
}) {
  async function descargar() {
    const XLSX = await import('xlsx')
    const datos = [encabezados, ...filas]
    const hojaCalculo = XLSX.utils.aoa_to_sheet(datos)
    hojaCalculo['!cols'] = encabezados.map((_, i) => ({
      wch: Math.max(12, ...datos.map((fila) => String(fila[i] ?? '').length + 2)),
    }))
    const libro = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(libro, hojaCalculo, hoja.slice(0, 31))
    XLSX.writeFile(libro, nombreArchivo)
  }

  return (
    <button type="button" onClick={descargar} className={className}>
      {children}
    </button>
  )
}
