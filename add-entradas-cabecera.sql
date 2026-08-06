-- ============================================================
-- Distribuidora LimpiezaPro — Cabecera de Entradas (Movimientos > Entradas)
-- Migración ADITIVA — no borra nada, segura de correr sobre datos reales.
-- Ejecutar en: Supabase → SQL Editor → New query
-- ============================================================

-- ------------------------------------------------------------
-- 1) CABECERA DE ENTRADA
-- ------------------------------------------------------------
-- Una entrada = 1 cabecera (fecha, motivo, proveedor, documento) + N líneas.
-- Cada línea se guarda como un movimiento normal (tipo='entrada') enlazado
-- por entrada_cabecera_id — así el trigger aplicar_movimiento() y todo el
-- costeo/kardex existentes siguen funcionando sin tocarlos.
create sequence entradas_cabecera_numero_seq;

create table entradas_cabecera (
  id serial primary key,
  numero text not null unique default ('ENT-' || lpad(nextval('entradas_cabecera_numero_seq')::text, 5, '0')),
  fecha date not null,
  usuario_id uuid references usuarios_perfil(id),
  motivo text not null,
  motivo_otro text,
  proveedor_id integer references proveedores(id) on delete set null,
  proveedor_ruc text,
  proveedor_razon_social text,
  documento_tipo text,
  documento_otro text,
  documento_serie text,
  documento_correlativo text,
  observaciones text,
  estado text not null check (estado in ('finalizado', 'anulada')) default 'finalizado',
  creado_en timestamptz not null default now()
);

create index idx_entradas_cabecera_fecha on entradas_cabecera(fecha);
create index idx_entradas_cabecera_proveedor on entradas_cabecera(proveedor_id);
create index idx_entradas_cabecera_estado on entradas_cabecera(estado);

-- ------------------------------------------------------------
-- 2) MOVIMIENTOS: enlace a la cabecera + lote/vencimiento por línea
-- ------------------------------------------------------------
alter table movimientos add column if not exists entrada_cabecera_id integer references entradas_cabecera(id) on delete restrict;
alter table movimientos add column if not exists lote text;
alter table movimientos add column if not exists fecha_vencimiento date;

create index if not exists idx_movimientos_entrada_cabecera on movimientos(entrada_cabecera_id);

-- ------------------------------------------------------------
-- 3) ROW LEVEL SECURITY
-- ------------------------------------------------------------
alter table entradas_cabecera enable row level security;

create policy "lectura autenticados" on entradas_cabecera for select using (auth.role() = 'authenticated');

create policy "escritura admin_almacen entradas_cabecera insert" on entradas_cabecera for insert
  with check (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol in ('admin', 'almacen')));
create policy "escritura admin_almacen entradas_cabecera update" on entradas_cabecera for update
  using (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol in ('admin', 'almacen')));

-- Sin política de DELETE a propósito: una entrada finalizada nunca se borra
-- (mismo principio que movimientos) — para corregirla se anula (estado
-- 'anulada'), no se elimina la fila ni sus movimientos ya aplicados.
