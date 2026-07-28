-- ============================================================
-- Distribuidora LimpiezaPro — Módulo de Ventas (Fase 4)
-- Migración ADITIVA — no borra nada, seguro de correr sobre datos reales.
-- Ejecutar en: Supabase → SQL Editor → New query
-- ============================================================

-- ------------------------------------------------------------
-- 0) FIX: el trigger de movimientos no validaba stock suficiente
-- en una 'salida'. Necesario antes de Ventas, que genera salidas
-- automáticas al facturar una orden.
-- ------------------------------------------------------------
create or replace function aplicar_movimiento()
returns trigger as $$
declare
  v_producto productos%rowtype;
  v_nuevo_costo numeric;
begin
  select * into v_producto from productos where id = new.producto_id for update;

  if not found then
    raise exception 'Producto % no existe', new.producto_id;
  end if;

  if new.tipo = 'entrada' then
    if new.costo_unitario is null then
      raise exception 'costo_unitario es obligatorio para movimientos de tipo entrada';
    end if;

    if (v_producto.cantidad + new.cantidad) = 0 then
      v_nuevo_costo := new.costo_unitario;
    else
      v_nuevo_costo := ((v_producto.cantidad * v_producto.costo) + (new.cantidad * new.costo_unitario))
                        / (v_producto.cantidad + new.cantidad);
    end if;

    new.efecto_cantidad := new.cantidad;

    update productos
      set cantidad = v_producto.cantidad + new.cantidad,
          costo = v_nuevo_costo,
          actualizado_en = now()
      where id = new.producto_id;

  elsif new.tipo = 'salida' then
    if v_producto.cantidad - new.cantidad < 0 then
      raise exception 'Stock insuficiente: % tiene % y se intenta sacar %',
        v_producto.nombre, v_producto.cantidad, new.cantidad;
    end if;

    new.costo_unitario := v_producto.costo;
    new.efecto_cantidad := -new.cantidad;

    update productos
      set cantidad = v_producto.cantidad - new.cantidad,
          actualizado_en = now()
      where id = new.producto_id;

  elsif new.tipo = 'ajuste' then
    -- cantidad es el VALOR ABSOLUTO nuevo (conteo fisico real), igual que hoy.
    -- efecto_cantidad se calcula aqui como el delta real, solo para el kardex.
    new.costo_unitario := v_producto.costo;
    new.efecto_cantidad := new.cantidad - v_producto.cantidad;

    update productos
      set cantidad = new.cantidad,
          actualizado_en = now()
      where id = new.producto_id;
  end if;

  return new;
end;
$$ language plpgsql;

-- ------------------------------------------------------------
-- 1) CLIENTES
-- ------------------------------------------------------------
create table clientes (
  id serial primary key,
  nombre text not null,
  documento text,
  telefono text,
  email text,
  direccion text,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create index idx_clientes_nombre on clientes(nombre);

-- ------------------------------------------------------------
-- 2) ÓRDENES DE VENTA
-- ------------------------------------------------------------
create sequence ordenes_venta_numero_seq;

create table ordenes_venta (
  id serial primary key,
  numero text not null unique default ('OV-' || lpad(nextval('ordenes_venta_numero_seq')::text, 5, '0')),
  cliente_id integer not null references clientes(id) on delete restrict,
  estado text not null check (estado in ('pendiente', 'facturada', 'anulada')) default 'pendiente',
  total numeric not null default 0,
  usuario_id uuid references usuarios_perfil(id),
  observacion text,
  creado_en timestamptz not null default now(),
  facturada_en timestamptz
);

create index idx_ordenes_venta_cliente on ordenes_venta(cliente_id);
create index idx_ordenes_venta_estado on ordenes_venta(estado);

-- ------------------------------------------------------------
-- 3) DETALLE DE VENTA (líneas de producto por orden)
-- ------------------------------------------------------------
create table detalle_venta (
  id bigserial primary key,
  orden_id integer not null references ordenes_venta(id) on delete cascade,
  producto_id integer not null references productos(id) on delete restrict,
  cantidad numeric not null check (cantidad > 0),
  precio_unitario numeric not null check (precio_unitario >= 0)
);

create index idx_detalle_venta_orden on detalle_venta(orden_id);
create index idx_detalle_venta_producto on detalle_venta(producto_id);

-- ------------------------------------------------------------
-- 4) ROW LEVEL SECURITY
-- ------------------------------------------------------------
alter table clientes enable row level security;
alter table ordenes_venta enable row level security;
alter table detalle_venta enable row level security;

create policy "lectura autenticados" on clientes for select using (auth.role() = 'authenticated');
create policy "lectura autenticados" on ordenes_venta for select using (auth.role() = 'authenticated');
create policy "lectura autenticados" on detalle_venta for select using (auth.role() = 'authenticated');

create policy "escritura admin_almacen clientes insert" on clientes for insert
  with check (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol in ('admin', 'almacen', 'ventas')));
create policy "escritura admin_almacen clientes update" on clientes for update
  using (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol in ('admin', 'almacen', 'ventas')));
create policy "escritura admin_almacen clientes delete" on clientes for delete
  using (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol in ('admin', 'almacen')));

create policy "escritura ventas ordenes_venta insert" on ordenes_venta for insert
  with check (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol in ('admin', 'almacen', 'ventas')));
create policy "escritura ventas ordenes_venta update" on ordenes_venta for update
  using (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol in ('admin', 'almacen', 'ventas')));
create policy "escritura ventas ordenes_venta delete" on ordenes_venta for delete
  using (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol in ('admin', 'almacen')));

create policy "escritura ventas detalle_venta insert" on detalle_venta for insert
  with check (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol in ('admin', 'almacen', 'ventas')));
create policy "escritura ventas detalle_venta update" on detalle_venta for update
  using (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol in ('admin', 'almacen', 'ventas')));
create policy "escritura ventas detalle_venta delete" on detalle_venta for delete
  using (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol in ('admin', 'almacen', 'ventas')));
