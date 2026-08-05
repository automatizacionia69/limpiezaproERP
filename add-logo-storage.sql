-- ============================================================
-- Distribuidora LimpiezaPro — Bucket de Storage para el logo de la empresa
-- Migración ADITIVA — no borra nada, segura de correr sobre datos reales.
-- Ejecutar en: Supabase → SQL Editor → New query
-- ============================================================

-- Bucket público (el logo se sirve vía URL pública, sin necesitar sesión —
-- se usa incluso en /login, antes de iniciar sesión). Idempotente: si ya
-- existe, no hace nada.
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

-- Solo un admin puede subir/reemplazar el logo. La lectura pública no
-- necesita política propia: un bucket con public = true se sirve por la
-- ruta /storage/v1/object/public/... sin pasar por RLS.
create policy "admin sube logo de marca" on storage.objects for insert
  to authenticated
  with check (bucket_id = 'branding' and usuario_es_admin());

create policy "admin actualiza logo de marca" on storage.objects for update
  to authenticated
  using (bucket_id = 'branding' and usuario_es_admin())
  with check (bucket_id = 'branding' and usuario_es_admin());
