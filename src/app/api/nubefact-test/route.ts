import { NextRequest, NextResponse } from 'next/server'
import { esAdmin } from '@/lib/permisos'
import { generarComprobanteNubefact } from '@/lib/nubefact'

/**
 * Ruta temporal SOLO para probar la conexión con la cuenta demo de NUBEFACT,
 * usando el mismo cliente/ítem de ejemplo del manual oficial (así el primer
 * intento no depende de tener datos reales bien mapeados todavía). Borrar
 * una vez que la integración esté conectada al flujo real de "Facturar".
 *
 * Uso: GET /api/nubefact-test?numero=1  (subir el numero si NUBEFACT dice
 * que el comprobante ya existe — cada numero solo se puede usar una vez).
 */
export async function GET(request: NextRequest) {
  if (!(await esAdmin())) {
    return NextResponse.json({ error: 'Solo admin puede usar esta ruta de prueba.' }, { status: 403 })
  }

  const numero = Number(request.nextUrl.searchParams.get('numero') ?? '1')
  const hoy = new Date()
  const fecha = `${String(hoy.getDate()).padStart(2, '0')}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${hoy.getFullYear()}`

  const resultado = await generarComprobanteNubefact({
    tipo: 'factura',
    serie: 'FFF1',
    numero,
    cliente: {
      documento: '20600695771',
      denominacion: 'NUBEFACT SA',
      direccion: 'CALLE LIBERTAD 116 MIRAFLORES - LIMA - PERU',
      email: '',
    },
    fechaEmision: fecha,
    lineas: [
      {
        descripcion: 'DETALLE DEL PRODUCTO DE PRUEBA',
        codigo: '001',
        unidadErp: 'und',
        cantidad: 1,
        // 590 con IGV = 500 neto + 90 IGV, igual que el ejemplo del manual.
        precioUnitario: 590,
        tipoAfectacionIgv: '10', // Gravado – Operación Onerosa (mismo caso que probaba antes)
      },
    ],
  })

  return NextResponse.json(resultado)
}
