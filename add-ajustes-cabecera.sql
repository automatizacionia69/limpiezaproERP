-- ============================================================
-- Distribuidora LimpiezaPro — Cabecera de Ajustes (Movimientos > Ajustes)
-- Migración ADITIVA — no borra nada, segura de correr sobre datos reales.
-- Ejecutar en: Supabase → SQL Editor → New query
-- ============================================================

-- ------------------------------------------------------------
-- 1) CABECERA DE AJUSTE
-- ------------------------------------------------------------
-- Mismo patrón que entradas_cabecera / salidas_cabecera: 1 cabecera + N
-- líneas, cada línea es un movimiento normal (tipo='ajuste') enlazado por
-- ajuste_cabecera_id. Sin proveedor/RUC ni documento (factura/guía/etc.) —
-- un ajuste es una corrección 100% interna de conteo físico, no involucra
-- a un tercero ni un comprobante que la sustente.
create sequence ajustes_cabecera_numero_seq;

create table ajustes_cabecera (
  id serial primary key,
  numero text not null unique default ('AJU-' || lpad(nextval('ajustes_cabecera_numero_seq')::text, 5, '0')),
  fecha date not null,
  usuario_id uuid references usuarios_perfil(id),
  motivo text not null,
  motivo_otro text,
  observaciones text,
  estado text not null check (estado in ('finalizado', 'anulada')) default 'finalizado',
  creado_en timestamptz not null default now()
);

create index idx_ajustes_cabecera_fecha on ajustes_cabecera(fecha);
create index idx_ajustes_cabecera_estado on ajustes_cabecera(estado);

-- ------------------------------------------------------------
-- 2) MOVIMIENTOS: enlace a la cabecera de ajuste
-- ------------------------------------------------------------
alter table movimientos add column if not exists ajuste_cabecera_id integer references ajustes_cabecera(id) on delete restrict;

create index if not exists idx_movimientos_ajuste_cabecera on movimientos(ajuste_cabecera_id);

-- ------------------------------------------------------------
-- 3) ROW LEVEL SECURITY
-- ------------------------------------------------------------
alter table ajustes_cabecera enable row level security;

create policy "lectura autenticados" on ajustes_cabecera for select using (auth.role() = 'authenticated');

create policy "escritura admin_almacen ajustes_cabecera insert" on ajustes_cabecera for insert
  with check (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol in ('admin', 'almacen')));
create policy "escritura admin_almacen ajustes_cabecera update" on ajustes_cabecera for update
  using (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol in ('admin', 'almacen')));

-- Sin política de DELETE a propósito — mismo criterio que entradas_cabecera
-- y salidas_cabecera: un ajuste finalizado no se borra ni se edita.
