import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requierePermiso } from '@/lib/permisos'
import { EmitirComprobanteForm } from './emitir-form'

type DetalleRow = { producto_id: number; cantidad: number; precio_unitario: number }

export default async function FacturarOrdenPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requierePermiso('ventas')
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: orden }, { data: detalles }, { data: clientes }, { data: productos }, { data: vendedores }, { data: configuracion }] =
    await Promise.all([
      supabase.from('ordenes_venta').select('id, numero, estado, cliente_id').eq('id', id).single(),
      supabase.from('detalle_venta').select('producto_id, cantidad, precio_unitario').eq('orden_id', id).returns<DetalleRow[]>(),
      supabase.from('clientes').select('id, nombre, documento').eq('activo', true).order('nombre'),
      supabase.from('productos').select('id, nombre, precio_venta').order('nombre'),
      supabase.from('usuarios_perfil').select('id, nombre').order('nombre'),
      supabase.from('configuracion').select('empresa').eq('id', 1).single(),
    ])

  if (!orden) {
    notFound()
  }

  if (orden.estado !== 'pendiente') {
    return (
      <div className="mx-auto max-w-lg">
        <Link href="/ventas" className="text-sm font-bold text-[#64748b] hover:text-teal-600">
          ← Volver a Ventas
        </Link>
        <div className="mt-5 rounded-3xl border-2 border-[#e2e8f0] bg-white p-8 text-center shadow-lg shadow-slate-500/5">
          <p className="text-sm font-medium text-[#64748b]">
            La orden {orden.numero} ya fue facturada o anulada.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Link href="/ventas" className="text-sm font-bold text-[#64748b] hover:text-teal-600">
        ← Volver a Ventas
      </Link>
      <h1 className="mt-3 text-2xl font-extrabold text-[#1e293b]">🧾 Facturar orden {orden.numero}</h1>

      <EmitirComprobanteForm
        ordenId={orden.id}
        clienteIdInicial={orden.cliente_id}
        lineasIniciales={detalles ?? []}
        clientes={clientes ?? []}
        productos={productos ?? []}
        vendedores={vendedores ?? []}
        usuarioActualId={user?.id ?? ''}
        empresa={configuracion?.empresa ?? 'Distribuidora LimpiezaPro'}
      />
    </div>
  )
}
