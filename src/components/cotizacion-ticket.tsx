import { numeroALetras } from '@/lib/numero-a-letras'
import type { DescuentoTipo } from '@/lib/cotizaciones'
import type { LineaDocumentoCotizacion } from './cotizacion-documento'

/**
 * Formato condensado para ticketeras térmicas de 80mm (a pedido del
 * usuario: la mayoría de sus clientes usa esa medida). Es un componente
 * aparte de CotizacionDocumento (el formato A4/A5) a propósito — meter el
 * mismo contenido (cuentas bancarias, condiciones comerciales, tabla ancha)
 * en 80mm de ancho quedaría ilegible, así que este formato recorta a lo
 * esencial: encabezado, cliente, ítems, totales y Yape.
 */
export function CotizacionTicket({
  numero,
  empresa,
  ruc,
  telefono,
  fecha,
  condicionVenta,
  cliente,
  documentoCliente,
  vendedor,
  lineas,
  subtotal,
  igv,
  opGravada,
  opExonerada,
  opInafecta,
  descuentoMonto,
  descuentoTipo,
  descuentoValor,
  total,
  simbolo,
  moneda,
  yape,
  vigenciaDias,
}: {
  numero: string
  empresa: string
  ruc: string | null
  telefono: string | null
  fecha: string
  condicionVenta: string
  cliente: string
  documentoCliente: string | null
  vendedor: string
  lineas: LineaDocumentoCotizacion[]
  subtotal: number
  igv: number
  opGravada: number
  opExonerada: number
  opInafecta: number
  descuentoMonto: number
  descuentoTipo: DescuentoTipo | null
  descuentoValor: number
  total: number
  simbolo: string
  moneda: 'PEN' | 'USD'
  yape: string | null
  vigenciaDias: number | null
}) {
  const fechaFormateada = fecha ? new Date(`${fecha}T00:00:00`).toLocaleDateString('es-PE') : '—'

  return (
    <div className="mx-auto w-[80mm] bg-white p-3 font-mono text-[11px] text-[#1e293b] dark:bg-[#141a2e] dark:text-slate-100 print:w-[80mm] print:p-0">
      <div className="text-center">
        <p className="text-sm font-extrabold uppercase">{empresa}</p>
        {ruc && <p>RUC: {ruc}</p>}
        {telefono && <p>Telf: {telefono}</p>}
      </div>

      <div className="my-2 border-t border-dashed border-[#1e293b] dark:border-slate-500" />

      <p className="font-bold uppercase">Cotización {numero}</p>
      <p>Fecha: {fechaFormateada}</p>
      <p>Cliente: {cliente || '—'}</p>
      {documentoCliente && <p>Doc: {documentoCliente}</p>}
      <p>Vendedor: {vendedor || '—'}</p>
      <p>Cond. venta: {condicionVenta}</p>

      <div className="my-2 border-t border-dashed border-[#1e293b] dark:border-slate-500" />

      {lineas.map((l, i) => (
        <div key={i} className="mb-1.5">
          <p>{l.nombre}</p>
          <p className="flex justify-between">
            <span>
              {l.cantidad} x {simbolo} {l.precioUnitario.toFixed(2)}
            </span>
            <span className="font-bold">
              {simbolo} {(l.cantidad * l.precioUnitario).toFixed(2)}
            </span>
          </p>
        </div>
      ))}

      <div className="my-2 border-t border-dashed border-[#1e293b] dark:border-slate-500" />

      {(opExonerada > 0 || opInafecta > 0) ? (
        <>
          {opGravada > 0 && (
            <p className="flex justify-between">
              <span>Op. Gravada</span>
              <span>
                {simbolo} {opGravada.toFixed(2)}
              </span>
            </p>
          )}
          {opExonerada > 0 && (
            <p className="flex justify-between">
              <span>Op. Exonerada</span>
              <span>
                {simbolo} {opExonerada.toFixed(2)}
              </span>
            </p>
          )}
          {opInafecta > 0 && (
            <p className="flex justify-between">
              <span>Op. Inafecta</span>
              <span>
                {simbolo} {opInafecta.toFixed(2)}
              </span>
            </p>
          )}
          <p className="flex justify-between">
            <span>IGV (18%)</span>
            <span>
              {simbolo} {igv.toFixed(2)}
            </span>
          </p>
        </>
      ) : (
        <>
          <p className="flex justify-between">
            <span>Sub total</span>
            <span>
              {simbolo} {subtotal.toFixed(2)}
            </span>
          </p>
          <p className="flex justify-between">
            <span>IGV (18%)</span>
            <span>
              {simbolo} {igv.toFixed(2)}
            </span>
          </p>
        </>
      )}
      {descuentoMonto > 0 && (
        <p className="flex justify-between">
          <span>Descuento{descuentoTipo === 'porcentaje' ? ` (${descuentoValor}%)` : ''}</span>
          <span>
            − {simbolo} {descuentoMonto.toFixed(2)}
          </span>
        </p>
      )}
      <p className="mt-1 flex justify-between border-t border-[#1e293b] pt-1 text-sm font-extrabold dark:border-slate-500">
        <span>TOTAL</span>
        <span>
          {simbolo} {total.toFixed(2)}
        </span>
      </p>
      <p className="mt-1 text-[10px] uppercase">Son: {numeroALetras(total, moneda)}</p>

      {(yape || vigenciaDias !== null) && (
        <>
          <div className="my-2 border-t border-dashed border-[#1e293b] dark:border-slate-500" />
          {yape && <p>Yape: {yape}</p>}
          {vigenciaDias !== null && <p>Validez de la oferta: {vigenciaDias} días.</p>}
        </>
      )}

      <div className="my-2 border-t border-dashed border-[#1e293b] dark:border-slate-500" />
      <p className="text-center font-bold">¡Gracias por su compra!</p>
      <p className="text-center text-[9px]">Documento sin validez tributaria.</p>
    </div>
  )
}
