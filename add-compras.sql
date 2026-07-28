-- ============================================================
-- Distribuidora LimpiezaPro — Módulo de Compras (Fase 3)
-- Migración ADITIVA — no borra nada, seguro de correr sobre datos reales.
-- Ejecutar en: Supabase → SQL Editor → New query
-- ============================================================

-- ------------------------------------------------------------
-- 1) PROVEEDORES
-- ------------------------------------------------------------
create table proveedores (
  id serial primary key,
  nombre text not null,
  ruc text,
  contacto text,
  telefono text,
  email text,
  direccion text,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create index idx_proveedores_nombre on proveedores(nombre);

-- ------------------------------------------------------------
-- 2) ÓRDENES DE COMPRA
-- ------------------------------------------------------------
create sequence ordenes_compra_numero_seq;

create table ordenes_compra (
  id serial primary key,
  numero text not null unique default ('OC-' || lpad(nextval('ordenes_compra_numero_seq')::text, 5, '0')),
  proveedor_id integer not null references proveedores(id) on delete restrict,
  estado text not null check (estado in ('pendiente', 'recibida', 'anulada')) default 'pendiente',
  total numeric not null default 0,
  usuario_id uuid references usuarios_perfil(id),
  observacion text,
  creado_en timestamptz not null default now(),
  recibida_en timestamptz
);

create index idx_ordenes_compra_proveedor on ordenes_compra(proveedor_id);
create index idx_ordenes_compra_estado on ordenes_compra(estado);

-- ------------------------------------------------------------
-- 3) DETALLE DE COMPRA (líneas de producto por orden)
-- ------------------------------------------------------------
create table detalle_compra (
  id bigserial primary key,
  orden_id integer not null references ordenes_compra(id) on delete cascade,
  producto_id integer not null references productos(id) on delete restrict,
  cantidad numeric not null check (cantidad > 0),
  costo_unitario numeric not null check (costo_unitario >= 0)
);

create index idx_detalle_compra_orden on detalle_compra(orden_id);
create index idx_detalle_compra_producto on detalle_compra(producto_id);

-- ------------------------------------------------------------
-- 4) ROW LEVEL SECURITY
-- ------------------------------------------------------------
alter table proveedores enable row level security;
alter table ordenes_compra enable row level security;
alter table detalle_compra enable row level security;

create policy "lectura autenticados" on proveedores for select using (auth.role() = 'authenticated');
create policy "lectura autenticados" on ordenes_compra for select using (auth.role() = 'authenticated');
create policy "lectura autenticados" on detalle_compra for select using (auth.role() = 'authenticated');

create policy "escritura admin_almacen proveedores insert" on proveedores for insert
  with check (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol in ('admin', 'almacen')));
create policy "escritura admin_almacen proveedores update" on proveedores for update
  using (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol in ('admin', 'almacen')));
create policy "escritura admin_almacen proveedores delete" on proveedores for delete
  using (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol in ('admin', 'almacen')));

create policy "escritura admin_almacen ordenes_compra insert" on ordenes_compra for insert
  with check (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol in ('admin', 'almacen')));
create policy "escritura admin_almacen ordenes_compra update" on ordenes_compra for update
  using (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol in ('admin', 'almacen')));
create policy "escritura admin_almacen ordenes_compra delete" on ordenes_compra for delete
  using (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol in ('admin', 'almacen')));

create policy "escritura admin_almacen detalle_compra insert" on detalle_compra for insert
  with check (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol in ('admin', 'almacen')));
create policy "escritura admin_almacen detalle_compra update" on detalle_compra for update
  using (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol in ('admin', 'almacen')));
create policy "escritura admin_almacen detalle_compra delete" on detalle_compra for delete
  using (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol in ('admin', 'almacen')));
