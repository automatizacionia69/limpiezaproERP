import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requierePermiso } from '@/lib/permisos'
import { obtenerDatosDocumentoCotizacion } from '@/lib/cotizacion-documento-datos'
import { DescargarPdfBoton } from './descargar-pdf-boton'
import { AutoImprimir } from './auto-imprimir'
import { CotizacionDocumento } from '@/components/cotizacion-documento'
import { CotizacionTicket } from '@/components/cotizacion-ticket'

// Tamaño de página física para @page en impresión — no se puede condicionar
// con clases de Tailwind (@page es un at-rule de nivel de documento, no se
// puede scopear a un contenedor), así que se arma como texto y se inyecta
// en un <style> según el `?formato=` de la URL.
const PAGINA_IMPRESION: Record<string, string> = {
  a4: '@page { size: A4; margin: 12mm; }',
  a5: '@page { size: A5; margin: 8mm; }',
  ticket80: '@page { size: 80mm auto; margin: 3mm; }',
}

export default async function CotizacionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ formato?: string }>
}) {
  await requierePermiso('cotizaciones')
  const { id } = await params
  const { formato: formatoParam } = await searchParams
  const formato = formatoParam === 'a5' || formatoParam === 'ticket80' ? formatoParam : 'a4'

  const datos = await obtenerDatosDocumentoCotizacion(id)
  if (!datos) {
    notFound()
  }

  return (
    <div>
      <style>{PAGINA_IMPRESION[formato]}</style>
      <AutoImprimir activo={!!formatoParam} />

      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href="/cotizaciones" className="text-sm font-bold text-[#64748b] dark:text-slate-400 hover:text-sky-600">
          ← Volver a Cotizaciones
        </Link>
        <div className="flex gap-3">
          <DescargarPdfBoton />
        </div>
      </div>

      {formato === 'ticket80' ? (
        <CotizacionTicket
          numero={datos.numero}
          empresa={datos.empresa}
          ruc={datos.ruc}
          telefono={datos.telefono}
          fecha={datos.fecha}
          condicionVenta={datos.condicionVenta}
          cliente={datos.cliente}
          documentoCliente={datos.documentoCliente}
          vendedor={datos.vendedor}
          lineas={datos.lineas}
          subtotal={datos.subtotal}
          igv={datos.igv}
          descuentoMonto={datos.descuentoMonto}
          descuentoTipo={datos.descuentoTipo}
          descuentoValor={datos.descuentoValor}
          total={datos.total}
          simbolo={datos.simbolo}
          moneda={datos.moneda}
          yape={datos.yape}
          vigenciaDias={datos.vigenciaDias}
        />
      ) : (
        <CotizacionDocumento {...datos} formato={formato} />
      )}
    </div>
  )
}
