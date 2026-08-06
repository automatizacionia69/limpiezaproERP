-- ============================================================
-- Distribuidora LimpiezaPro — Cabecera de Salidas (Movimientos > Salidas)
-- Migración ADITIVA — no borra nada, segura de correr sobre datos reales.
-- Ejecutar en: Supabase → SQL Editor → New query
-- ============================================================

-- ------------------------------------------------------------
-- 1) CABECERA DE SALIDA
-- ------------------------------------------------------------
-- Mismo patrón que entradas_cabecera (ver add-entradas-cabecera.sql): 1
-- cabecera + N líneas, cada línea es un movimiento normal (tipo='salida')
-- enlazado por salida_cabecera_id. costo_unitario de cada línea lo sigue
-- calculando solo el trigger aplicar_movimiento() (no se pide en el
-- formulario) — el costeo promedio ponderado no se toca.
create sequence salidas_cabecera_numero_seq;

create table salidas_cabecera (
  id serial primary key,
  numero text not null unique default ('SAL-' || lpad(nextval('salidas_cabecera_numero_seq')::text, 5, '0')),
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

create index idx_salidas_cabecera_fecha on salidas_cabecera(fecha);
create index idx_salidas_cabecera_proveedor on salidas_cabecera(proveedor_id);
create index idx_salidas_cabecera_estado on salidas_cabecera(estado);

-- ------------------------------------------------------------
-- 2) MOVIMIENTOS: enlace a la cabecera de salida
-- ------------------------------------------------------------
-- lote / fecha_vencimiento ya existen en movimientos desde
-- add-entradas-cabecera.sql — se reutilizan tal cual (misma columna sirve
-- para anotar de qué lote salió la mercadería).
alter table movimientos add column if not exists salida_cabecera_id integer references salidas_cabecera(id) on delete restrict;

create index if not exists idx_movimientos_salida_cabecera on movimientos(salida_cabecera_id);

-- ------------------------------------------------------------
-- 3) ROW LEVEL SECURITY
-- ------------------------------------------------------------
alter table salidas_cabecera enable row level security;

create policy "lectura autenticados" on salidas_cabecera for select using (auth.role() = 'authenticated');

create policy "escritura admin_almacen salidas_cabecera insert" on salidas_cabecera for insert
  with check (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol in ('admin', 'almacen')));
create policy "escritura admin_almacen salidas_cabecera update" on salidas_cabecera for update
  using (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol in ('admin', 'almacen')));

-- Sin política de DELETE a propósito — mismo criterio que entradas_cabecera
-- y que movimientos: una salida finalizada no se borra ni se edita.
