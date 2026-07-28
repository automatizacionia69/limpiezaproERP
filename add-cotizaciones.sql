-- ============================================================
-- Distribuidora LimpiezaPro — Módulo de Cotizaciones
-- Migración ADITIVA — no borra nada, seguro de correr sobre datos reales.
-- Ejecutar en: Supabase → SQL Editor → New query
--
-- Una cotización NO mueve stock (es solo una propuesta al cliente, no una
-- venta comprometida) — por eso no genera movimientos ni referencia el
-- trigger aplicar_movimiento, a diferencia de Compras/Ventas.
-- ============================================================

create sequence cotizaciones_numero_seq;

create table cotizaciones (
  id serial primary key,
  numero text not null unique default ('COT-' || lpad(nextval('cotizaciones_numero_seq')::text, 5, '0')),
  cliente_id integer not null references clientes(id) on delete restrict,
  fecha date not null default current_date,
  dias_credito text not null default 'Contado',
  medio_pago text not null default 'Transferencia',
  vendedor_id uuid references usuarios_perfil(id) on delete set null,
  subtotal numeric not null default 0,
  igv numeric not null default 0,
  total numeric not null default 0,
  usuario_id uuid references usuarios_perfil(id),
  observacion text,
  creado_en timestamptz not null default now()
);

create index idx_cotizaciones_cliente on cotizaciones(cliente_id);
create index idx_cotizaciones_fecha on cotizaciones(fecha);

create table detalle_cotizacion (
  id bigserial primary key,
  cotizacion_id integer not null references cotizaciones(id) on delete cascade,
  producto_id integer not null references productos(id) on delete restrict,
  cantidad numeric not null check (cantidad > 0),
  precio_unitario numeric not null check (precio_unitario >= 0)
);

create index idx_detalle_cotizacion_cotizacion on detalle_cotizacion(cotizacion_id);
create index idx_detalle_cotizacion_producto on detalle_cotizacion(producto_id);

alter table cotizaciones enable row level security;
alter table detalle_cotizacion enable row level security;

create policy "lectura autenticados" on cotizaciones for select using (auth.role() = 'authenticated');
create policy "lectura autenticados" on detalle_cotizacion for select using (auth.role() = 'authenticated');

create policy "escritura ventas cotizaciones insert" on cotizaciones for insert
  with check (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol in ('admin', 'almacen', 'ventas')));
create policy "escritura ventas cotizaciones update" on cotizaciones for update
  using (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol in ('admin', 'almacen', 'ventas')));
create policy "escritura ventas cotizaciones delete" on cotizaciones for delete
  using (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol in ('admin', 'almacen', 'ventas')));

create policy "escritura ventas detalle_cotizacion insert" on detalle_cotizacion for insert
  with check (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol in ('admin', 'almacen', 'ventas')));
create policy "escritura ventas detalle_cotizacion delete" on detalle_cotizacion for delete
  using (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol in ('admin', 'almacen', 'ventas')));
