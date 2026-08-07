import { LogoEmpresa } from '@/components/logo-empresa'
import { FormatoBasico } from '@/components/formato-basico'
import { numeroALetras } from '@/lib/numero-a-letras'
import type { DescuentoTipo } from '@/lib/cotizaciones'

export type LineaDocumentoCotizacion = {
  codigo: string | null
  nombre: string
  unidad: string | null
  cantidad: number
  precioUnitario: number
  caracteristicas?: string | null
}

/**
 * Formato de cotización tipo "factura formal" (a pedido del usuario, sobre
 * un ejemplo de otro sistema de facturación) — se usa tanto en la vista
 * previa (datos en vivo del formulario) como en la cotización ya guardada
 * (datos de Supabase), para que ambas se vean idénticas.
 *
 * Los datos de empresa que hoy no se capturan en ningún lado del ERP
 * (titular, cuentas bancarias) se muestran en blanco ("—") hasta que se
 * llenen en Configuración — no son obligatorios.
 */
export function CotizacionDocumento({
  numero,
  empresa,
  titular,
  ruc,
  direccion,
  telefono,
  email,
  yape,
  cuentaBcpSoles,
  cciBcp,
  cuentaBbvaSoles,
  cciBbva,
  fecha,
  fechaEntrega,
  documentoReferencia,
  condicionVenta,
  cliente,
  documentoCliente,
  direccionCliente,
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
  observaciones,
  vigenciaDias,
  formato = 'a4',
}: {
  numero: string
  empresa: string
  titular: string | null
  ruc: string | null
  direccion: string | null
  telefono: string | null
  email: string | null
  yape: string | null
  cuentaBcpSoles: string | null
  cciBcp: string | null
  cuentaBbvaSoles: string | null
  cciBbva: string | null
  fecha: string
  fechaEntrega?: string | null
  documentoReferencia?: string | null
  condicionVenta: string
  cliente: string
  documentoCliente: string | null
  direccionCliente: string | null
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
  observaciones: string | null
  vigenciaDias: number | null
  /** A5 es media hoja A4 — se achica un poco el texto para que entre mejor en una sola página. */
  formato?: 'a4' | 'a5'
}) {
  const fechaFormateada = fecha ? new Date(`${fecha}T00:00:00`).toLocaleDateString('es-PE') : '—'

  return (
    <div
      className={`mx-auto max-w-4xl rounded-3xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] p-8 text-sm shadow-lg shadow-slate-500/5 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none ${
        formato === 'a5' ? 'print:text-[11px]' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-6 border-b-2 border-[#1e293b] dark:border-slate-600 pb-4">
        <div className="flex items-start gap-3">
          <LogoEmpresa className="h-12 w-12 shrink-0 object-contain" fallback={null} />
          <div>
            <h1 className="text-lg font-extrabold uppercase text-[#1e293b] dark:text-slate-100">{empresa}</h1>
            <p className="text-xs text-[#64748b] dark:text-slate-400">De: {titular || '—'}</p>
            <p className="text-xs text-[#64748b] dark:text-slate-400">Dirección fiscal: {direccion || '—'}</p>
            <p className="text-xs text-[#64748b] dark:text-slate-400">Telf: {telefono || '—'}</p>
            <p className="text-xs text-[#64748b] dark:text-slate-400">Correo: {email || '—'}</p>
          </div>
        </div>
        <div className="w-56 shrink-0 rounded-xl border-2 border-[#1e293b] dark:border-slate-600 p-3 text-center">
          <p className="text-xs font-bold text-[#1e293b] dark:text-slate-100">R.U.C. {ruc || '—'}</p>
          <p className="mt-1 text-sm font-extrabold tracking-wide text-[#1e293b] dark:text-slate-100 uppercase">Cotización</p>
          <p className="mt-1 text-lg font-extrabold text-sky-600">{numero}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-0.5">
          <p className="flex justify-between">
            <span className="text-[#64748b] dark:text-slate-400">Emisión</span>
            <span className="font-semibold text-[#1e293b] dark:text-slate-100">{fechaFormateada}</span>
          </p>
          <p className="flex justify-between gap-3">
            <span className="shrink-0 text-[#64748b] dark:text-slate-400">Cliente</span>
            <span className="text-right font-semibold text-[#1e293b] dark:text-slate-100">{cliente || '—'}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-[#64748b] dark:text-slate-400">RUC o DNI</span>
            <span className="font-semibold text-[#1e293b] dark:text-slate-100">{documentoCliente || '—'}</span>
          </p>
          <p className="flex justify-between gap-3">
            <span className="shrink-0 text-[#64748b] dark:text-slate-400">Dirección</span>
            <span className="text-right font-semibold text-[#1e293b] dark:text-slate-100">{direccionCliente || '—'}</span>
          </p>
        </div>
        <div className="space-y-0.5">
          <p className="flex justify-between">
            <span className="text-[#64748b] dark:text-slate-400">Cond. Venta</span>
            <span className="font-semibold text-[#1e293b] dark:text-slate-100">{condicionVenta}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-[#64748b] dark:text-slate-400">Vendedor</span>
            <span className="font-semibold text-[#1e293b] dark:text-slate-100">{vendedor || '—'}</span>
          </p>
          {fechaEntrega && (
            <p className="flex justify-between">
              <span className="text-[#64748b] dark:text-slate-400">Fecha de entrega</span>
              <span className="font-semibold text-[#1e293b] dark:text-slate-100">
                {new Date(`${fechaEntrega}T00:00:00`).toLocaleDateString('es-PE')}
              </span>
            </p>
          )}
          {documentoReferencia && (
            <p className="flex justify-between gap-3">
              <span className="shrink-0 text-[#64748b] dark:text-slate-400">Doc. referencia</span>
              <span className="text-right font-semibold text-[#1e293b] dark:text-slate-100">{documentoReferencia}</span>
            </p>
          )}
        </div>
      </div>

      <table className="mt-5 w-full text-left text-xs">
        <thead>
          <tr className="border-y-2 border-[#1e293b] dark:border-slate-600 text-[#1e293b] dark:text-slate-100">
            <th className="py-2 font-bold">Item</th>
            <th className="py-2 font-bold">Código</th>
            <th className="py-2 font-bold">Artículo</th>
            <th className="py-2 text-right font-bold">Cant.</th>
            <th className="py-2 text-right font-bold">U.M</th>
            <th className="py-2 text-right font-bold">P. unitario</th>
            <th className="py-2 text-right font-bold">P. total</th>
          </tr>
        </thead>
        <tbody>
          {lineas.map((l, i) => (
            <tr key={i} className="border-b border-[#f1f5f9] dark:border-slate-800">
              <td className="py-2">{String(i + 1).padStart(2, '0')}</td>
              <td className="py-2">{l.codigo || '—'}</td>
              <td className="py-2">
                {l.nombre}
                {l.caracteristicas && (
                  <div className="mt-0.5 text-[11px] text-[#94a3b8] italic dark:text-slate-500">
                    <FormatoBasico texto={l.caracteristicas} />
                  </div>
                )}
              </td>
              <td className="py-2 text-right">{l.cantidad}</td>
              <td className="py-2 text-right">{l.unidad || '—'}</td>
              <td className="py-2 text-right">{simbolo} {l.precioUnitario.toFixed(2)}</td>
              <td className="py-2 text-right">{simbolo} {(l.cantidad * l.precioUnitario).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-4 text-xs font-bold text-[#1e293b] uppercase dark:text-slate-100">Son: {numeroALetras(total, moneda)}</p>

      <div className="mt-5">
        <p className="text-center text-xs font-bold text-[#1e293b] uppercase dark:text-slate-100">Condiciones comerciales</p>
        <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-xs text-[#64748b] dark:text-slate-400">
          {vigenciaDias !== null && <li>Validez de la oferta: {vigenciaDias} días.</li>}
          <li>Los precios indicados son aproximados.</li>
          <li>La cotización está sujeta a variación sin previo aviso.</li>
          <li>No se aceptan devoluciones pasados los días de entrega al cliente.</li>
          <li>Entregas en su almacén central.</li>
        </ol>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[#e2e8f0] dark:border-slate-700 p-3">
          <p className="text-[10px] font-bold tracking-wide text-[#94a3b8] uppercase dark:text-slate-500">Observaciones</p>
          {observaciones ? (
            <div className="mt-1 text-xs whitespace-pre-wrap text-[#1e293b] dark:text-slate-100">
              <FormatoBasico texto={observaciones} />
            </div>
          ) : (
            <p className="mt-1 text-xs text-[#94a3b8] dark:text-slate-500">—</p>
          )}
        </div>
        <div className="space-y-1.5 rounded-xl border border-[#e2e8f0] dark:border-slate-700 p-3">
          {(opExonerada > 0 || opInafecta > 0) ? (
            <>
              {opGravada > 0 && (
                <p className="flex justify-between text-xs">
                  <span className="text-[#64748b] dark:text-slate-400">Op. Gravada</span>
                  <span className="font-semibold text-[#1e293b] dark:text-slate-100">{simbolo} {opGravada.toFixed(2)}</span>
                </p>
              )}
              {opExonerada > 0 && (
                <p className="flex justify-between text-xs">
                  <span className="text-[#64748b] dark:text-slate-400">Op. Exonerada</span>
                  <span className="font-semibold text-[#1e293b] dark:text-slate-100">{simbolo} {opExonerada.toFixed(2)}</span>
                </p>
              )}
              {opInafecta > 0 && (
                <p className="flex justify-between text-xs">
                  <span className="text-[#64748b] dark:text-slate-400">Op. Inafecta</span>
                  <span className="font-semibold text-[#1e293b] dark:text-slate-100">{simbolo} {opInafecta.toFixed(2)}</span>
                </p>
              )}
              <p className="flex justify-between text-xs">
                <span className="text-[#64748b] dark:text-slate-400">IGV (18%)</span>
                <span className="font-semibold text-[#1e293b] dark:text-slate-100">{simbolo} {igv.toFixed(2)}</span>
              </p>
            </>
          ) : (
            <>
              <p className="flex justify-between text-xs">
                <span className="text-[#64748b] dark:text-slate-400">Sub total</span>
                <span className="font-semibold text-[#1e293b] dark:text-slate-100">{simbolo} {subtotal.toFixed(2)}</span>
              </p>
              <p className="flex justify-between text-xs">
                <span className="text-[#64748b] dark:text-slate-400">IGV (18%)</span>
                <span className="font-semibold text-[#1e293b] dark:text-slate-100">{simbolo} {igv.toFixed(2)}</span>
              </p>
            </>
          )}
          {descuentoMonto > 0 && (
            <p className="flex justify-between text-xs text-red-600">
              <span>Descuento{descuentoTipo === 'porcentaje' ? ` (${descuentoValor}%)` : ''}</span>
              <span className="font-semibold">− {simbolo} {descuentoMonto.toFixed(2)}</span>
            </p>
          )}
          <p className="flex justify-between border-t-2 border-[#1e293b] dark:border-slate-600 pt-1.5 text-sm font-extrabold text-[#1e293b] dark:text-slate-100">
            <span>Total</span>
            <span>{simbolo} {total.toFixed(2)}</span>
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2">
        <p className="flex justify-between rounded-lg bg-[#f8fafc] px-3 py-1.5 dark:bg-slate-800/60">
          <span className="font-bold text-[#1e293b] dark:text-slate-100">Yape</span>
          <span className="text-[#64748b] dark:text-slate-400">{yape || '—'}</span>
        </p>
        <p className="flex justify-between rounded-lg bg-[#f8fafc] px-3 py-1.5 dark:bg-slate-800/60">
          <span className="font-bold text-[#1e293b] dark:text-slate-100">BCP (soles)</span>
          <span className="text-[#64748b] dark:text-slate-400">{cuentaBcpSoles || '—'}</span>
        </p>
        <p className="flex justify-between rounded-lg bg-[#f8fafc] px-3 py-1.5 dark:bg-slate-800/60">
          <span className="font-bold text-[#1e293b] dark:text-slate-100">CCI BCP</span>
          <span className="text-[#64748b] dark:text-slate-400">{cciBcp || '—'}</span>
        </p>
        <p className="flex justify-between rounded-lg bg-[#f8fafc] px-3 py-1.5 dark:bg-slate-800/60">
          <span className="font-bold text-[#1e293b] dark:text-slate-100">BBVA (soles)</span>
          <span className="text-[#64748b] dark:text-slate-400">{cuentaBbvaSoles || '—'}</span>
        </p>
        <p className="flex justify-between rounded-lg bg-[#f8fafc] px-3 py-1.5 dark:bg-slate-800/60">
          <span className="font-bold text-[#1e293b] dark:text-slate-100">CCI BBVA</span>
          <span className="text-[#64748b] dark:text-slate-400">{cciBbva || '—'}</span>
        </p>
      </div>

      <p className="mt-6 text-center text-xs font-bold text-[#1e293b] dark:text-slate-100">¡Gracias por su compra!</p>
      <p className="text-center text-[11px] text-[#94a3b8] dark:text-slate-500">
        ** Nota importante ** — No se aceptan devoluciones pasados los días de entrega — documento sin validez tributaria.
      </p>
    </div>
  )
}
