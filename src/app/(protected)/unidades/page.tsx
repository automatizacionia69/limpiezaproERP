import { createClient } from '@/lib/supabase/server'
import { requierePermiso } from '@/lib/permisos'
import { UnidadesTabla } from './unidades-tabla'

export default async function UnidadesPage() {
  await requierePermiso('productos')
  const supabase = await createClient()
  const [{ data: unidades }, { data: productos }] = await Promise.all([
    supabase.from('unidades_medida').select('id, nombre').order('nombre'),
    supabase.from('productos').select('unidad_id'),
  ])

  const conteo = new Map<number, number>()
  for (const p of productos ?? []) {
    conteo.set(p.unidad_id, (conteo.get(p.unidad_id) ?? 0) + 1)
  }

  const filas = (unidades ?? []).map((u) => ({
    id: u.id,
    nombre: u.nombre,
    productos: conteo.get(u.id) ?? 0,
  }))

  return <UnidadesTabla unidades={filas} />
}
