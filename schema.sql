-- ============================================================
-- Distribuidora LimpiezaPro — ERP de Inventarios
-- Schema base para Supabase (PostgreSQL)
-- Ejecutar en: Supabase → SQL Editor → New query
-- ============================================================

-- 1) ZONAS (reemplaza los cuadernos físicos: Sala Comedor, Cochera, Cuarto 1, Cocina)
create table if not exists zonas (
  id serial primary key,
  nombre text not null unique,
  notas text,
  creado_en timestamptz default now()
);

-- 2) PERFILES DE USUARIO (extiende auth.users de Supabase con rol)
create table if not exists usuarios_perfil (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  rol text not null check (rol in ('admin', 'almacen', 'ventas')),
  creado_en timestamptz default now()
);

-- 3) PRODUCTOS (SKU maestro)
create table if not exists productos (
  id serial primary key,
  nombre text not null,
  codigo text,                        -- código de proveedor, puede ser nulo (varios productos reales no tienen)
  zona_id integer references zonas(id),
  unidad text not null,                -- und, paq, cajas, rollos, kit, etc.
  cantidad numeric not null default 0, -- se mantiene sincronizado vía trigger de movimientos, no se edita a mano
  punto_reorden numeric default 0,     -- debajo de este número, el producto aparece en alertas
  categoria text,                      -- papel, limpiadores, guantes, bolsas, etc.
  observacion text,
  creado_en timestamptz default now(),
  actualizado_en timestamptz default now()
);

create index if not exists idx_productos_zona on productos(zona_id);
create index if not exists idx_productos_codigo on productos(codigo);

-- 4) MOVIMIENTOS (ledger de trazabilidad — entradas, salidas, ajustes)
-- Esta tabla es la fuente de verdad. productos.cantidad se recalcula desde aquí.
create table if not exists movimientos (
  id bigserial primary key,
  producto_id integer not null references productos(id),
  tipo text not null check (tipo in ('entrada', 'salida', 'ajuste')),
  cantidad numeric not null,           -- siempre positivo; el signo lo define "tipo"
  usuario_id uuid references usuarios_perfil(id),
  motivo text,                         -- ej: "compra proveedor", "venta", "conteo físico", "merma"
  referencia text,                     -- ej: número de pedido — útil cuando se conecte el chatbot
  creado_en timestamptz default now()
);

create index if not exists idx_movimientos_producto on movimientos(producto_id);
create index if not exists idx_movimientos_fecha on movimientos(creado_en);

-- ============================================================
-- TRIGGER: mantener productos.cantidad sincronizado con movimientos
-- Así nadie edita el stock "a mano" — todo queda trazado en el ledger.
-- ============================================================
create or replace function aplicar_movimiento()
returns trigger as $$
begin
  if new.tipo = 'entrada' then
    update productos set cantidad = cantidad + new.cantidad, actualizado_en = now() where id = new.producto_id;
  elsif new.tipo = 'salida' then
    update productos set cantidad = cantidad - new.cantidad, actualizado_en = now() where id = new.producto_id;
  elsif new.tipo = 'ajuste' then
    update productos set cantidad = new.cantidad, actualizado_en = now() where id = new.producto_id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_aplicar_movimiento on movimientos;
create trigger trg_aplicar_movimiento
  after insert on movimientos
  for each row execute function aplicar_movimiento();

-- ============================================================
-- VISTA: productos con stock bajo (para el módulo de alertas)
-- ============================================================
create or replace view productos_stock_bajo as
select p.*, z.nombre as zona_nombre
from productos p
left join zonas z on z.id = p.zona_id
where p.cantidad <= p.punto_reorden;

-- ============================================================
-- ROW LEVEL SECURITY (básico — refinar en Bloque 3 si se requiere)
-- ============================================================
alter table zonas enable row level security;
alter table productos enable row level security;
alter table movimientos enable row level security;
alter table usuarios_perfil enable row level security;

-- Lectura: cualquier usuario autenticado (admin, almacén, ventas) puede ver todo
create policy "lectura autenticados" on zonas for select using (auth.role() = 'authenticated');
create policy "lectura autenticados" on productos for select using (auth.role() = 'authenticated');
create policy "lectura autenticados" on movimientos for select using (auth.role() = 'authenticated');
create policy "lectura propio perfil" on usuarios_perfil for select using (auth.role() = 'authenticated');

-- Escritura: solo admin y almacén pueden registrar movimientos o editar productos/zonas
create policy "escritura admin_almacen movimientos" on movimientos for insert
  with check (
    exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol in ('admin', 'almacen'))
  );

create policy "escritura admin_almacen productos" on productos for update
  using (
    exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol in ('admin', 'almacen'))
  );

create policy "escritura admin_almacen productos insert" on productos for insert
  with check (
    exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol in ('admin', 'almacen'))
  );

create policy "escritura admin zonas" on zonas for all
  using (
    exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol = 'admin')
  );

-- ============================================================
-- SEED: las 4 zonas reales del almacén
-- ============================================================
insert into zonas (nombre) values
  ('Sala Comedor'), ('Cochera'), ('Cuarto 1'), ('Cocina')
on conflict (nombre) do nothing;
