import { requierePermiso } from '@/lib/permisos'
import { obtenerCobranzas } from '@/lib/cobranzas'
import { TablaCobranzas } from './tabla-cobranzas'

export default async function CobranzasPage() {
  await requierePermiso('cobranzas')
  const filas = await obtenerCobranzas()

  return <TablaCobranzas filas={filas} />
}
