-- ============================================================
-- Distribuidora LimpiezaPro — Notificaciones de pedidos del chatbot
-- Migración ADITIVA — no borra nada, segura de correr sobre datos reales.
-- Ya aplicada en Supabase (2026-08-01, vía MCP). Este archivo queda como
-- registro histórico, siguiendo la convención del proyecto de un archivo
-- add-*.sql por cambio de esquema.
--
-- Origen: cada fila representa una cotización creada automáticamente por
-- el chatbot de WhatsApp (repo separado "proyecto", lib/whatsapp/proforma.ts)
-- que el equipo de ventas/administración todavía no revisó. Solo el chatbot
-- inserta (vía service_role, que salta RLS) — no hay policy de insert para
-- authenticated a propósito, no hace falta hoy.
--
-- Sin columna "tipo": hoy el único origen posible es el chatbot. Si aparece
-- un segundo caso real, se agrega en ese momento (mismo criterio que el
-- resto de este archivo de migraciones: aditivo, no especulativo).
-- ============================================================

create table notificaciones (
  id bigserial primary key,
  cotizacion_id integer not null references cotizaciones(id) on delete cascade,
  leida_en timestamptz,
  creado_en timestamptz not null default now()
);

create index idx_notificaciones_no_leidas on notificaciones (creado_en desc) where leida_en is null;
create index idx_notificaciones_cotizacion on notificaciones(cotizacion_id);

alter table notificaciones enable row level security;

-- Visible solo para admin y ventas (decisión explícita del dueño: almacén
-- no gestiona pedidos/cotizaciones, no necesita esta campana).
create policy "lectura admin y ventas" on notificaciones for select
  using (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol in ('admin', 'ventas')));

-- Estado "leída" compartido por todo el equipo (no por usuario): cualquier
-- admin/ventas que la abre la marca leída para todos, como un inbox
-- compartido — mismo criterio que ya usa comprobantes.fecha_cobro.
create policy "marcar leida admin y ventas" on notificaciones for update
  using (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol in ('admin', 'ventas')))
  with check (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol in ('admin', 'ventas')));

-- Habilita Realtime (postgres_changes) para que la campana del ERP reciba
-- el INSERT al instante, sin esperar a que alguien navegue/recargue.
alter publication supabase_realtime add table notificaciones;
