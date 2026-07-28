-- ============================================================
-- Distribuidora LimpiezaPro — Permisos por usuario y módulo
-- Migración ADITIVA — no borra nada, seguro de correr sobre datos reales.
-- Ejecutar en: Supabase → SQL Editor → New query
--
-- El rol (admin/almacen/ventas) sigue definiendo el techo de lo que la
-- base de datos permite (RLS, sin cambios). Esta tabla es una capa extra
-- a nivel de aplicación: el admin decide, usuario por usuario, a cuáles
-- módulos operativos tiene acceso (por defecto: ninguno, restringido).
-- El rol 'admin' siempre tiene acceso completo y no usa esta tabla.
-- ============================================================

create table usuarios_permisos (
  usuario_id uuid not null references usuarios_perfil(id) on delete cascade,
  modulo text not null,
  activo boolean not null default false,
  primary key (usuario_id, modulo)
);

alter table usuarios_permisos enable row level security;

create policy "usuarios_permisos: lectura propio o admin" on usuarios_permisos for select
  using (auth.uid() = usuario_id or usuario_es_admin());

create policy "usuarios_permisos: escritura admin" on usuarios_permisos for all
  using (usuario_es_admin())
  with check (usuario_es_admin());
