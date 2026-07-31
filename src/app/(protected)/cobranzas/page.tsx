import { requierePermiso } from '@/lib/permisos'
import { obtenerCobranzasPendientes } from '@/lib/cobranzas'
import { TablaCobranzas } from './tabla-cobranzas'

export default async function CobranzasPage() {
  await requierePermiso('cobranzas')
  const { vencidas, porVencer } = await obtenerCobranzasPendientes()

  return <TablaCobranzas vencidas={vencidas} porVencer={porVencer} />
}
