import { createClient } from '@supabase/supabase-js'

// Cliente con la service-role key: se salta RLS por completo y puede
// administrar usuarios de Supabase Auth. Solo usar en Server Actions,
// nunca exponerlo al cliente. Requiere SUPABASE_SERVICE_ROLE_KEY en
// .env.local (Supabase → Project Settings → API → service_role key).
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    return null
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
