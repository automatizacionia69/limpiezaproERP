// Los documentos (facturas, cotizaciones, notas) deben imprimirse siempre en
// modo claro, sin importar la preferencia de tema del usuario — un fondo
// oscuro completo desperdicia tinta y en muchas impresoras sale con tinte
// rojizo/marrón en vez de negro parejo.
export function imprimirEnModoClaro() {
  const root = document.documentElement
  const eraOscuro = root.classList.contains('dark')

  if (eraOscuro) root.classList.remove('dark')

  function restaurar() {
    if (eraOscuro) root.classList.add('dark')
    window.removeEventListener('afterprint', restaurar)
  }

  if (eraOscuro) window.addEventListener('afterprint', restaurar)
  window.print()
}
