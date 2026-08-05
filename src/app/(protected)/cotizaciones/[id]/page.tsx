import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requierePermiso } from '@/lib/permisos'
import { DescargarPdfBoton } from './descargar-pdf-boton'
import { ConvertirVentaBoton } from './convertir-venta-boton'
import { CotizacionDocumento, type LineaDocumentoCotizacion } from '@/components/cotizacion-documento'

const SIMBOLO_MONEDA: Record<string, string> = { PEN: 'S/', USD: '$' }

type DetalleRow = {
  id: number
  cantidad: number
  precio_unitario: number
  caracteristicas: string | null
  unidad_nombre: string | null
  productos: { nombre: string; codigo: string | null; unidades_medida: { nombre: string } | null } | null
}

export default async function CotizacionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requierePermiso('cotizaciones')
  const { id } = await params
  const supabase = await createClient()

  const [{ data: cotizacion }, { data: detalles }, { data: configuracion }] = await Promise.all([
    supabase
      .from('cotizaciones')
      .select(
        'id, numero, fecha, dias_credito, medio_pago, subtotal, igv, total, observacion, moneda, fecha_entrega, documento_referencia, vigencia_dias, descuento_tipo, descuento_valor, descuento_monto, clientes(nombre, documento, direccion), vendedor:vendedor_id(nombre)'
      )
      .eq('id', id)
      .single(),
    supabase
      .from('detalle_cotizacion')
      .select('id, cantidad, precio_unitario, caracteristicas, unidad_nombre, productos(nombre, codigo, unidades_medida(nombre))')
      .eq('cotizacion_id', id)
      .returns<DetalleRow[]>(),
    supabase
      .from('configuracion')
      .select('empresa, ruc, direccion, telefono, email, titular, yape, cuenta_bcp_soles, cci_bcp, cuenta_bbva_soles, cci_bbva')
      .eq('id', 1)
      .single(),
  ])

  if (!cotizacion) {
    notFound()
  }

  const cliente = Array.isArray(cotizacion.clientes) ? cotizacion.clientes[0] : cotizacion.clientes
  const vendedor = Array.isArray(cotizacion.vendedor) ? cotizacion.vendedor[0] : cotizacion.vendedor
  const simbolo = SIMBOLO_MONEDA[cotizacion.moneda] ?? 'S/'

  const lineas: LineaDocumentoCotizacion[] = (detalles ?? []).map((d) => ({
    codigo: d.productos?.codigo ?? null,
    nombre: d.productos?.nombre ?? '—',
    unidad: d.unidad_nombre ?? d.productos?.unidades_medida?.nombre ?? null,
    cantidad: Number(d.cantidad),
    precioUnitario: Number(d.precio_unitario),
    caracteristicas: d.caracteristicas,
  }))

  return (
    <div>
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href="/cotizaciones" className="text-sm font-bold text-[#64748b] dark:text-slate-400 hover:text-sky-600">
          ← Volver a Cotizaciones
        </Link>
        <div className="flex gap-3">
          <ConvertirVentaBoton id={cotizacion.id} numero={cotizacion.numero} />
          <DescargarPdfBoton />
        </div>
      </div>

      <CotizacionDocumento
        numero={cotizacion.numero}
        empresa={configuracion?.empresa ?? 'Distribuidora LimpiezaPro'}
        titular={configuracion?.titular ?? null}
        ruc={configuracion?.ruc ?? null}
        direccion={configuracion?.direccion ?? null}
        telefono={configuracion?.telefono ?? null}
        email={configuracion?.email ?? null}
        yape={configuracion?.yape ?? null}
        cuentaBcpSoles={configuracion?.cuenta_bcp_soles ?? null}
        cciBcp={configuracion?.cci_bcp ?? null}
        cuentaBbvaSoles={configuracion?.cuenta_bbva_soles ?? null}
        cciBbva={configuracion?.cci_bbva ?? null}
        fecha={cotizacion.fecha}
        fechaEntrega={cotizacion.fecha_entrega}
        documentoReferencia={cotizacion.documento_referencia}
        condicionVenta={cotizacion.dias_credito}
        cliente={cliente?.nombre ?? '—'}
        documentoCliente={cliente?.documento ?? null}
        direccionCliente={cliente?.direccion ?? null}
        vendedor={vendedor?.nombre ?? '—'}
        lineas={lineas}
        subtotal={Number(cotizacion.subtotal)}
        igv={Number(cotizacion.igv)}
        descuentoMonto={Number(cotizacion.descuento_monto ?? 0)}
        descuentoTipo={cotizacion.descuento_tipo}
        descuentoValor={Number(cotizacion.descuento_valor ?? 0)}
        total={Number(cotizacion.total)}
        simbolo={simbolo}
        moneda={cotizacion.moneda === 'USD' ? 'USD' : 'PEN'}
        observaciones={cotizacion.observacion}
        vigenciaDias={cotizacion.vigencia_dias}
      />
    </div>
  )
}
