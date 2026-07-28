'use client'

export function DescargarExcelBoton({
  nombreArchivo,
  hoja,
  encabezados,
  filas,
  colorEncabezado = 'FF15803D',
  className,
  children,
}: {
  nombreArchivo: string
  hoja: string
  encabezados: string[]
  filas: (string | number | null)[][]
  colorEncabezado?: string
  className?: string
  children: React.ReactNode
}) {
  async function descargar() {
    const ExcelJS = (await import('exceljs')).default
    const libro = new ExcelJS.Workbook()
    const hojaCalculo = libro.addWorksheet(hoja.slice(0, 31))

    hojaCalculo.columns = encabezados.map((titulo, i) => ({
      header: titulo,
      key: `col${i}`,
      width: Math.max(12, titulo.length + 2, ...filas.map((f) => String(f[i] ?? '').length + 2)),
    }))

    filas.forEach((fila) => hojaCalculo.addRow(fila))

    const filaEncabezado = hojaCalculo.getRow(1)
    filaEncabezado.eachCell((celda) => {
      celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorEncabezado } }
      celda.font = { color: { argb: 'FFFFFFFF' }, bold: true }
      celda.alignment = { vertical: 'middle', horizontal: 'left' }
      celda.border = { bottom: { style: 'thin', color: { argb: 'FF0F172A' } } }
    })
    filaEncabezado.height = 22

    for (let i = 2; i <= hojaCalculo.rowCount; i++) {
      const fila = hojaCalculo.getRow(i)
      const colorFondo = i % 2 === 0 ? 'FFEFF6EE' : 'FFFFFFFF'
      fila.eachCell({ includeEmpty: true }, (celda) => {
        celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorFondo } }
        celda.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } }
        celda.alignment = { vertical: 'middle' }
      })
    }

    hojaCalculo.autoFilter = { from: 'A1', to: { row: 1, column: encabezados.length } }
    hojaCalculo.views = [{ state: 'frozen', ySplit: 1 }]

    const buffer = await libro.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
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
