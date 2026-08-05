// Ruta fija dentro del bucket público 'branding' (ver add-logo-storage.sql).
// Sin extensión a propósito: el content-type real se guarda en el storage
// object al subir (ver configuracion/actions.ts), así que el navegador lo
// interpreta bien igual — y subir un logo en otro formato después no deja
// un archivo viejo huérfano, siempre pisa la misma ruta.
const LOGO_PATH = 'empresa-logo'

export const LOGO_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/branding/${LOGO_PATH}`
