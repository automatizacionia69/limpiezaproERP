-- ============================================================
-- Distribuidora LimpiezaPro — Configuración de la empresa + rol de usuarios
-- Migración ADITIVA — no borra nada, seguro de correr sobre datos reales.
-- Ejecutar en: Supabase → SQL Editor → New query
-- ============================================================

-- ------------------------------------------------------------
-- 1) CONFIGURACIÓN (registro único — fila con id=1)
-- ------------------------------------------------------------
create table configuracion (
  id integer primary key default 1,
  empresa text not null default 'Distribuidora LimpiezaPro',
  ruc text,
  direccion text,
  telefono text,
  email text,
  moneda text not null default 'S/',
  actualizado_en timestamptz not null default now(),
  constraint chk_configuracion_singular check (id = 1)
);

insert into configuracion (id) values (1);

alter table configuracion enable row level security;

create policy "lectura autenticados" on configuracion for select using (auth.role() = 'authenticated');

create policy "escritura admin configuracion" on configuracion for update
  using (usuario_es_admin())
  with check (usuario_es_admin());

-- ------------------------------------------------------------
-- 2) Permitir que un admin edite el rol/nombre de otros usuarios
-- (usuarios_perfil hoy solo tiene políticas de lectura, sin escritura)
-- ------------------------------------------------------------
create policy "escritura admin usuarios_perfil" on usuarios_perfil for update
  using (usuario_es_admin())
  with check (usuario_es_admin());
