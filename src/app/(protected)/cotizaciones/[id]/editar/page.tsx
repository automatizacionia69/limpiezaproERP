import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requierePermiso } from '@/lib/permisos'
import { NuevaCotizacionForm, type CotizacionExistente } from '../../nueva/nueva-cotizacion-form'

type ProductoRow = {
  id: number
  nombre: string
  codigo: string | null
  cantidad: number
  precio_venta: number | null
  tipo_afectacion_igv: string
  unidades_medida: { nombre: string } | null
}

type DetalleRow = {
  producto_id: number
  cantidad: number
  precio_unitario: number
  caracteristicas: string | null
  fecha_entrega: string | null
  unidad_nombre: string | null
  tipo_afectacion_igv: string
}

export default async function EditarCotizacionPage({ params }: { params: Promise<{ id: string }> }) {
  await requierePermiso('cotizaciones')
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [
    { data: cotizacion },
    { data: detalles },
    { data: clientes },
    { data: productos },
    { data: vendedores },
    { data: configuracion },
    { data: unidadesMedida },
  ] = await Promise.all([
    supabase
      .from('cotizaciones')
      .select(
        'id, numero, estado, cliente_id, fecha, fecha_entrega, dias_credito, medio_pago, vendedor_id, observacion, moneda, documento_referencia, vigencia_dias, descuento_tipo, descuento_valor'
      )
      .eq('id', id)
      .single(),
    supabase
      .from('detalle_cotizacion')
      .select('producto_id, cantidad, precio_unitario, caracteristicas, fecha_entrega, unidad_nombre, tipo_afectacion_igv')
      .eq('cotizacion_id', id)
      .returns<DetalleRow[]>(),
    supabase
      .from('clientes')
      .select('id, nombre, documento, direccion, vendedor_id, telefono, email')
      .eq('activo', true)
      .order('nombre'),
    supabase
      .from('productos')
      .select('id, nombre, codigo, cantidad, precio_venta, tipo_afectacion_igv, unidades_medida(nombre)')
      .order('nombre')
      .returns<ProductoRow[]>(),
    supabase.from('usuarios_perfil').select('id, nombre').order('nombre'),
    supabase
      .from('configuracion')
      .select('empresa, ruc, direccion, telefono, email, titular, yape, cuenta_bcp_soles, cci_bcp, cuenta_bbva_soles, cci_bbva')
      .eq('id', 1)
      .single(),
    supabase.from('unidades_medida').select('id, nombre'),
  ])

  if (!cotizacion) {
    notFound()
  }

  if (cotizacion.estado !== 'pendiente') {
    return (
      <div>
        <h1 className="text-2xl font-extrabold text-[#1e293b] dark:text-slate-100">✏️ Editar cotización</h1>
        <div className="mt-5 rounded-3xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] p-8 shadow-lg shadow-slate-500/5">
          <p className="text-sm font-medium text-[#64748b] dark:text-slate-400">
            La cotización {cotizacion.numero} ya fue convertida a venta y no se puede editar.
          </p>
          <Link href={`/cotizaciones/${cotizacion.id}`} className="mt-3 inline-block text-sm font-bold text-sky-600">
            ← Ver la cotización
          </Link>
        </div>
      </div>
    )
  }

  const cotizacionExistente: CotizacionExistente = {
    id: cotizacion.id,
    clienteId: cotizacion.cliente_id,
    fecha: cotizacion.fecha,
    fechaEntrega: cotizacion.fecha_entrega ?? '',
    diasCredito: cotizacion.dias_credito,
    medioPago: cotizacion.medio_pago,
    vendedorId: cotizacion.vendedor_id,
    observacion: cotizacion.observacion ?? '',
    moneda: cotizacion.moneda === 'USD' ? 'USD' : 'PEN',
    documentoReferencia: cotizacion.documento_referencia ?? '',
    vigenciaDias: cotizacion.vigencia_dias,
    descuentoTipo: cotizacion.descuento_tipo === 'monto' ? 'monto' : 'porcentaje',
    descuentoValor: Number(cotizacion.descuento_valor ?? 0),
    lineas: (detalles ?? []).map((d) => ({
      producto_id: d.producto_id,
      cantidad: d.cantidad,
      precio_unitario: d.precio_unitario,
      caracteristicas: d.caracteristicas ?? '',
      fecha_entrega: d.fecha_entrega ?? '',
      unidad_nombre: d.unidad_nombre ?? '',
      tipo_afectacion_igv: d.tipo_afectacion_igv,
    })),
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-[#1e293b] dark:text-slate-100">✏️ Editar cotización {cotizacion.numero}</h1>
      <NuevaCotizacionForm
        clientes={clientes ?? []}
        productos={productos ?? []}
        vendedores={vendedores ?? []}
        unidadesMedida={unidadesMedida ?? []}
        usuarioActualId={user?.id ?? ''}
        cotizacionExistente={cotizacionExistente}
        configuracion={{
          empresa: configuracion?.empresa ?? 'Distribuidora LimpiezaPro',
          ruc: configuracion?.ruc ?? null,
          direccion: configuracion?.direccion ?? null,
          telefono: configuracion?.telefono ?? null,
          email: configuracion?.email ?? null,
          titular: configuracion?.titular ?? null,
          yape: configuracion?.yape ?? null,
          cuenta_bcp_soles: configuracion?.cuenta_bcp_soles ?? null,
          cci_bcp: configuracion?.cci_bcp ?? null,
          cuenta_bbva_soles: configuracion?.cuenta_bbva_soles ?? null,
          cci_bbva: configuracion?.cci_bbva ?? null,
        }}
      />
    </div>
  )
}
