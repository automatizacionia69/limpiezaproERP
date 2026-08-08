// Validaciones puras de SKU/código de barras compartidas entre el alta
// completa de Productos (productos/actions.ts) y el alta rápida desde
// Compras (compras/nueva/crear-producto-rapido.ts). Deliberadamente NO
// lleva 'use server': un archivo con esa directiva obliga a que TODOS sus
// exports sean Server Actions async — estas son funciones síncronas.

export type CamposCodigo = { sku: string; codigoBarras: string | null } | { error: string }

export function validarCamposCodigo(skuCrudo: string, codigoBarrasCrudo: string): CamposCodigo {
  const sku = skuCrudo.trim().toUpperCase()
  if (!sku) {
    return { error: 'El SKU es obligatorio.' }
  }
  if (!/^[A-Z0-9-]+$/.test(sku)) {
    return { error: 'El SKU solo puede tener letras, números y guiones (ej: LIM-0001).' }
  }

  const codigoBarrasLimpio = codigoBarrasCrudo.trim()
  if (!codigoBarrasLimpio) {
    return { sku, codigoBarras: null }
  }
  if (!/^\d{8,14}$/.test(codigoBarrasLimpio)) {
    return { error: 'El código de barras debe tener entre 8 y 14 dígitos numéricos (EAN/UPC/GTIN).' }
  }

  return { sku, codigoBarras: codigoBarrasLimpio }
}

/** Traduce violaciones de UNIQUE de Postgres (23505) a un mensaje entendible. */
export function mensajeErrorGuardado(error: { code?: string; message: string }): string {
  if (error.code === '23505') {
    if (error.message.includes('idx_productos_sku_unique')) {
      return 'Ya existe otro producto con ese SKU. Cada SKU debe ser único.'
    }
    if (error.message.includes('idx_productos_codigo_barras_unique')) {
      return 'Ya existe otro producto con ese código de barras.'
    }
  }
  return error.message
}
