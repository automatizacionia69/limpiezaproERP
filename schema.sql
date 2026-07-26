-- ============================================================
-- Distribuidora LimpiezaPro — ERP de Inventarios
-- Schema para Supabase (PostgreSQL) — v2: inventario valorizado
-- Ejecutar en: Supabase → SQL Editor → New query
-- Migración "drop and recreate": no hay datos reales de cliente todavía.
-- ============================================================

-- ------------------------------------------------------------
-- 0) LIMPIEZA (drop and recreate)
-- ------------------------------------------------------------
drop view if exists productos_stock_bajo cascade;
drop view if exists kardex_valorizado cascade;
drop trigger if exists trg_aplicar_movimiento on movimientos;
drop function if exists aplicar_movimiento() cascade;
drop table if exists movimientos cascade;
drop table if exists productos cascade;
drop table if exists zonas cascade;
drop table if exists almacenes cascade;
drop table if exists categorias cascade;
drop table if exists unidades_medida cascade;
drop table if exists usuarios_perfil cascade;

-- ------------------------------------------------------------
-- 1) CATÁLOGOS BASE
-- ------------------------------------------------------------
create table almacenes (
  id serial primary key,
  nombre text not null unique,
  notas text,
  creado_en timestamptz not null default now()
);

create table zonas (
  id serial primary key,
  almacen_id integer not null references almacenes(id) on delete restrict,
  nombre text not null,
  notas text,
  creado_en timestamptz not null default now(),
  unique (almacen_id, nombre)
);

create index idx_zonas_almacen on zonas(almacen_id);

create table categorias (
  id serial primary key,
  nombre text not null unique,
  creado_en timestamptz not null default now()
);

create table unidades_medida (
  id serial primary key,
  nombre text not null unique,
  creado_en timestamptz not null default now()
);

create table usuarios_perfil (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  rol text not null check (rol in ('admin', 'almacen', 'ventas')),
  creado_en timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2) PRODUCTOS
-- ------------------------------------------------------------
create table productos (
  id serial primary key,
  nombre text not null,
  codigo text,
  zona_id integer references zonas(id) on delete set null,
  unidad_id integer not null references unidades_medida(id),
  categoria_id integer references categorias(id) on delete set null,
  cantidad numeric not null default 0,
  costo numeric not null default 0 check (costo >= 0),
  precio_venta numeric check (precio_venta >= 0),
  punto_reorden numeric default 0,
  observacion text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index idx_productos_zona on productos(zona_id);
create index idx_productos_codigo on productos(codigo);
create index idx_productos_categoria on productos(categoria_id);
create index idx_productos_unidad on productos(unidad_id);

-- ------------------------------------------------------------
-- 3) MOVIMIENTOS (ledger valorizado)
-- ------------------------------------------------------------
-- Semántica de "cantidad" según tipo:
--   entrada: magnitud positiva (cuánto entró). costo_unitario OBLIGATORIO.
--   salida:  magnitud positiva (cuánto salió). costo_unitario se autocompleta.
--   ajuste:  VALOR ABSOLUTO nuevo (el conteo físico real, igual que hoy).
--            costo_unitario se autocompleta.
create table movimientos (
  id bigserial primary key,
  producto_id integer not null references productos(id),
  tipo text not null check (tipo in ('entrada', 'salida', 'ajuste')),
  cantidad numeric not null,
  costo_unitario numeric check (costo_unitario >= 0),
  efecto_cantidad numeric not null,   -- interno: delta real con signo sobre el stock, para el kardex
  usuario_id uuid references usuarios_perfil(id),
  motivo text,
  referencia text,
  creado_en timestamptz not null default now(),
  constraint chk_movimientos_cantidad check (
    (tipo in ('entrada', 'salida') and cantidad > 0)
    or (tipo = 'ajuste' and cantidad >= 0)
  )
);

create index idx_movimientos_producto on movimientos(producto_id);
create index idx_movimientos_fecha on movimientos(creado_en);
create index idx_movimientos_tipo on movimientos(tipo);

-- ------------------------------------------------------------
-- 4) TRIGGER: aplicar movimiento (costeo + stock + kardex)
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

create trigger trg_aplicar_movimiento
  before insert on movimientos
  for each row execute function aplicar_movimiento();

-- ------------------------------------------------------------
-- 5) VISTAS
-- ------------------------------------------------------------
create or replace view kardex_valorizado as
select
  m.id,
  m.producto_id,
  p.nombre as producto_nombre,
  p.codigo as producto_codigo,
  m.tipo,
  m.cantidad,
  m.efecto_cantidad,
  m.costo_unitario,
  (m.efecto_cantidad * m.costo_unitario) as valor_movimiento,
  sum(m.efecto_cantidad) over (
    partition by m.producto_id
    order by m.creado_en, m.id
    rows between unbounded preceding and current row
  ) as saldo_cantidad,
  sum(m.efecto_cantidad * m.costo_unitario) over (
    partition by m.producto_id
    order by m.creado_en, m.id
    rows between unbounded preceding and current row
  ) as saldo_valor,
  m.usuario_id,
  up.nombre as usuario_nombre,
  m.motivo,
  m.referencia,
  m.creado_en
from movimientos m
join productos p on p.id = m.producto_id
left join usuarios_perfil up on up.id = m.usuario_id
order by m.producto_id, m.creado_en, m.id;

create or replace view productos_stock_bajo as
select
  p.*,
  z.nombre as zona_nombre,
  a.nombre as almacen_nombre,
  c.nombre as categoria_nombre,
  u.nombre as unidad_nombre
from productos p
left join zonas z on z.id = p.zona_id
left join almacenes a on a.id = z.almacen_id
left join categorias c on c.id = p.categoria_id
left join unidades_medida u on u.id = p.unidad_id
where p.cantidad <= p.punto_reorden;

-- ------------------------------------------------------------
-- 6) ROW LEVEL SECURITY
-- ------------------------------------------------------------
alter table almacenes enable row level security;
alter table zonas enable row level security;
alter table categorias enable row level security;
alter table unidades_medida enable row level security;
alter table productos enable row level security;
alter table movimientos enable row level security;
alter table usuarios_perfil enable row level security;

create policy "lectura autenticados" on almacenes for select using (auth.role() = 'authenticated');
create policy "lectura autenticados" on zonas for select using (auth.role() = 'authenticated');
create policy "lectura autenticados" on categorias for select using (auth.role() = 'authenticated');
create policy "lectura autenticados" on unidades_medida for select using (auth.role() = 'authenticated');
create policy "lectura autenticados" on productos for select using (auth.role() = 'authenticated');
create policy "lectura autenticados" on movimientos for select using (auth.role() = 'authenticated');

-- FIX del bug conocido: cada quien lee solo su propio perfil, salvo admin (lee todos).
create policy "usuarios_perfil: lectura propio perfil" on usuarios_perfil for select
  using (auth.uid() = id);

create policy "usuarios_perfil: lectura admin todos" on usuarios_perfil for select
  using (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol = 'admin'));

create policy "escritura admin almacenes" on almacenes for all
  using (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol = 'admin'))
  with check (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol = 'admin'));

create policy "escritura admin zonas" on zonas for all
  using (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol = 'admin'))
  with check (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol = 'admin'));

create policy "escritura admin categorias" on categorias for all
  using (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol = 'admin'))
  with check (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol = 'admin'));

create policy "escritura admin unidades_medida" on unidades_medida for all
  using (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol = 'admin'))
  with check (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol = 'admin'));

create policy "escritura admin_almacen productos insert" on productos for insert
  with check (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol in ('admin', 'almacen')));

create policy "escritura admin_almacen productos update" on productos for update
  using (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol in ('admin', 'almacen')));

-- Movimientos: solo INSERT (admin/almacen). Sin update/delete — el ledger es
-- inmutable; una corrección se hace con un nuevo movimiento de tipo 'ajuste'.
create policy "escritura admin_almacen movimientos" on movimientos for insert
  with check (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol in ('admin', 'almacen')));

-- ------------------------------------------------------------
-- 7) SEED
-- ------------------------------------------------------------
insert into almacenes (nombre) values ('Piura');

insert into zonas (almacen_id, nombre)
select a.id, z.nombre
from almacenes a
cross join (values ('Sala Comedor'), ('Cochera'), ('Cuarto 1'), ('Cocina')) as z(nombre)
where a.nombre = 'Piura';

insert into unidades_medida (nombre) values ('und'), ('paq'), ('caja');

-- categorias: sin seed intencional (el admin las define al migrar el catálogo real).
