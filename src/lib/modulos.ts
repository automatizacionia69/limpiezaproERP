export const MODULOS = [
  { clave: 'productos', label: 'Productos' },
  { clave: 'movimientos', label: 'Movimientos' },
  { clave: 'compras', label: 'Compras' },
  { clave: 'proveedores', label: 'Proveedores' },
  { clave: 'ventas', label: 'Ventas' },
  { clave: 'consulta_ventas', label: 'Consulta de Ventas' },
  { clave: 'guias_remision', label: 'Guías de Remisión' },
  { clave: 'clientes', label: 'Clientes' },
  { clave: 'cotizaciones', label: 'Cotizaciones' },
  { clave: 'reportes', label: 'Reportes' },
] as const

export type ModuloClave = (typeof MODULOS)[number]['clave']
