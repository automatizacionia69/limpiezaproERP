import { createClient } from '@/lib/supabase/server'
import { CategoriasTabla } from './categorias-tabla'

export default async function CategoriasPage() {
  const supabase = await createClient()
  const [{ data: categorias }, { data: productos }] = await Promise.all([
    supabase.from('categorias').select('id, nombre').order('nombre'),
    supabase.from('productos').select('categoria_id'),
  ])

  const conteo = new Map<number, number>()
  for (const p of productos ?? []) {
    if (p.categoria_id) conteo.set(p.categoria_id, (conteo.get(p.categoria_id) ?? 0) + 1)
  }

  const filas = (categorias ?? []).map((c) => ({
    id: c.id,
    nombre: c.nombre,
    productos: conteo.get(c.id) ?? 0,
  }))

  return <CategoriasTabla categorias={filas} />
}
