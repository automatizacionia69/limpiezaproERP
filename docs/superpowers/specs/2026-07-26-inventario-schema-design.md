# Diseño: Rediseño del modelo de datos (schema.sql) — Distribuidora LimpiezaPro

## Contexto

El usuario mostró una referencia ("AlmacénPro") de un ERP de inventario bastante más completo que el MVP original documentado en `CLAUDE.md` (que era: login, CRUD de productos, movimientos simples, dashboard, alertas, historial — todo dentro de un solo local dividido en 4 "zonas"). Tras comparar ambos, el usuario decidió **redefinir el MVP completo ahora** para apuntar a algo más cercano a AlmacénPro (multi-almacén, costeo/valorización, catálogos propios de categoría/unidad), en vez de mantener el alcance original.

Dado que esto es un cambio grande, se decidió descomponerlo en sub-proyectos en vez de diseñarlo todo junto. Los módulos de **Compras** y **Ventas** (con proveedores, clientes, flujos de documentos) quedan **fuera de este ciclo** — se diseñarán aparte cuando les toque, porque agregar tablas nuevas después es barato y no requiere adivinar su estructura ahora. Este documento cubre **solo el rediseño de la base de inventario**: catálogos (categorías, unidades de medida), almacenes/zonas, productos con costeo, y movimientos valorizados (kardex).

También se discutió, fuera del alcance de este documento, la posibilidad de integrar a futuro con un facturador electrónico peruano (ej. Nubefact) una vez exista el módulo de Ventas — queda anotado como fase futura del roadmap, sin impacto en el diseño de datos de este documento.

**Migración:** se acordó con el usuario que no hay datos reales de cliente todavía (solo datos de prueba del login), así que el nuevo `schema.sql` es "drop and recreate" completo, no una migración incremental.

## Decisiones de diseño

### 1. Costeo: promedio ponderado
Cada producto tiene UN costo unitario vigente (`productos.costo`), recalculado automáticamente en cada `entrada` con la fórmula estándar de promedio ponderado. Se descartó PEPS/FIFO por complejidad (requeriría tabla de lotes) para un equipo de 7 personas.

### 2. Almacenes (sede) → Zonas (sub-espacio), dos niveles
"Almacén" representa una sede/ciudad (hoy solo "Piura"; a futuro podría existir "Chiclayo"). "Zona" es un espacio físico dentro de un almacén (las 4 actuales: Sala Comedor, Cochera, Cuarto 1, Cocina, todas bajo el almacén "Piura"). `zonas.nombre` es único por almacén, no global (el mismo nombre podría repetirse en otra sede a futuro). `productos.zona_id` no cambia de forma.

### 3. Costo en movimientos
- `entrada`: el costo unitario es **obligatorio** al registrarla — es lo que alimenta el promedio ponderado.
- `salida` y `ajuste`: el costo **no lo decide quien registra el movimiento** — el trigger lo autocompleta con el costo promedio vigente del producto en ese instante (snapshot histórico, necesario para que el kardex sea correcto aunque el costo promedio cambie después).

### 4. Categorías y unidades de medida como catálogos propios
`productos.categoria` (texto libre) y `productos.unidad` (texto libre) pasan a ser tablas (`categorias`, `unidades_medida`) con FKs (`categoria_id`, `unidad_id`). `categoria_id` es nullable (hay ~140 SKUs por migrar del Excel, no forzar categoría desde el día uno); `unidad_id` es obligatorio (dato que ya existe hoy en todos los productos).

### 5. Precio de venta
Se agrega `productos.precio_venta` (solo el dato, sin ninguna lógica de Ventas todavía — ese módulo se diseña aparte).

### 6. `ajuste` mantiene su comportamiento actual (valor absoluto) — con un ajuste interno para el kardex
Se evaluó redefinir `ajuste` como delta con signo (para simplificar el cálculo del saldo corriente en el kardex), pero **el usuario decidió mantener el comportamiento actual**: el almacenero sigue ingresando el conteo físico real como valor absoluto (ej. "ahora hay 85"), igual que hoy.

Para no sacrificar por eso la simplicidad del kardex, se resuelve así: el trigger ya bloquea (`FOR UPDATE`) y lee la fila de `productos` **antes** de aplicar el movimiento, así que conoce la cantidad anterior en el mismo instante en que procesa el `ajuste`. Con eso puede calcular el efecto real sobre el stock (`nuevo_valor_absoluto - cantidad_anterior`) y guardarlo en una columna interna separada, `movimientos.efecto_cantidad`, sin que `movimientos.cantidad` deje de ser el valor absoluto que ingresó el usuario. El kardex usa `efecto_cantidad` (no `cantidad`) para el saldo corriente — así el `ajuste` sigue siendo absoluto de cara al usuario/UI, y el kardex sigue siendo una suma simple (`SUM() OVER`), sin lógica recursiva.

Para `entrada`/`salida`, `efecto_cantidad` es simplemente `+cantidad` / `-cantidad` (no hay diferencia con el valor que ya se envía).

### 7. Arquitectura del trigger: `BEFORE INSERT` (antes: `AFTER INSERT`)
Necesario porque el trigger ahora debe **asignar valores a la fila que se está insertando** (`costo_unitario` y `efecto_cantidad` autocompletados) antes de que se escriba, evitando un `UPDATE` de seguimiento después del `INSERT`. Se agrega `FOR UPDATE` sobre la fila de `productos` al inicio del trigger para evitar condiciones de carrera si dos movimientos del mismo producto llegan casi al mismo tiempo (importante porque el promedio ponderado depende de leer `cantidad`/`costo` de forma consistente).

### 8. Fix del bug de RLS conocido en `usuarios_perfil`
La política `"lectura propio perfil"` usaba `auth.role() = 'authenticated'` (dejaba leer TODOS los perfiles a cualquier autenticado, pese al nombre) — ya estaba documentado como pendiente en `CLAUDE.md`. Se corrige aquí a `auth.uid() = id`, agregando una política adicional para que `admin` pueda leer todos los perfiles (necesario para cualquier pantalla de gestión de usuarios).

### 9. Seed de catálogos
Se siembra `unidades_medida` (und, paq, caja — catálogo pequeño y estable). **No** se siembra `categorias`: es taxonomía específica del negocio (papel, químicos, higiene, etc.) que el admin debe definir deliberadamente al migrar el catálogo real de ~140 SKUs, no adivinarla ahora.

## Ejemplo trazado (verificación de la lógica)

Producto "Detergente 5kg", estado inicial: `cantidad = 0`, `costo = 0`.

| # | Movimiento | `productos.cantidad` | `productos.costo` | `movimientos.cantidad` guardado | `costo_unitario` guardado | `efecto_cantidad` (interno) |
|---|---|---|---|---|---|---|
| 1 | `entrada`, cantidad=50, costo_unitario=20.00 | 50 | 20.00 | 50 | 20.00 | +50 |
| 2 | `entrada`, cantidad=30, costo_unitario=24.00 | 80 | 21.50 *(=(50×20+30×24)/80)* | 30 | 24.00 | +30 |
| 3 | `salida`, cantidad=45 | 35 | 21.50 (no cambia) | 45 | 21.50 (autocompletado) | −45 |
| 4 | `ajuste`, conteo real=32 (sistema decía 35) | 32 | 21.50 (no cambia) | **32** (valor absoluto, tal como hoy) | 21.50 (autocompletado) | **−3** (32−35, calculado por el trigger) |

Saldo corriente del kardex (usando `efecto_cantidad`, no `cantidad`):

| # | valor_movimiento | saldo_cantidad | saldo_valor |
|---|---|---|---|
| 1 | 50×20.00 = 1000.00 | 50 | 1000.00 |
| 2 | 30×24.00 = 720.00 | 80 | 1720.00 |
| 3 | −45×21.50 = −967.50 | 35 | 752.50 |
| 4 | −3×21.50 = −64.50 | 32 | 688.00 |

Chequeo: `saldo_valor / saldo_cantidad = 688.00 / 32 = 21.50` = costo vigente del producto. Consistente.

## SQL completo propuesto

### Limpieza (drop and recreate)

```sql
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
```

### Catálogos base

```sql
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
```

### Productos

```sql
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
```

### Movimientos

```sql
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
```

Nota: `efecto_cantidad` es `not null` pero la aplicación nunca la envía — el trigger `BEFORE INSERT` la asigna sobre `NEW` antes de que Postgres verifique la restricción.

### Trigger

```sql
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
```

### Vista: kardex valorizado

```sql
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
```

### Vista: productos con stock bajo (actualizada)

```sql
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
```

### Row Level Security

```sql
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
```

### Seed data

```sql
insert into almacenes (nombre) values ('Piura');

insert into zonas (almacen_id, nombre)
select a.id, z.nombre
from almacenes a
cross join (values ('Sala Comedor'), ('Cochera'), ('Cuarto 1'), ('Cocina')) as z(nombre)
where a.nombre = 'Piura';

insert into unidades_medida (nombre) values ('und'), ('paq'), ('caja');

-- categorias: sin seed intencional (el admin las define al migrar el catálogo real).
```

## Impacto en código ya existente

- `src/lib/supabase/server.ts` y el resto del login (Tasks 1-4) **no se ven afectados** — solo leen `usuarios_perfil` por `id`, y la nueva política `auth.uid() = id` sigue permitiendo exactamente esa consulta.
- El usuario deberá recrear su usuario de prueba en Supabase después de correr este script (drop and recreate borra `usuarios_perfil`, aunque `auth.users` de Supabase Auth no se toca — solo hay que volver a insertar la fila de perfil con el `rol` correspondiente).

## Verificación

1. Correr el script completo en el SQL Editor de Supabase (proyecto ya existente) — debe ejecutar sin errores.
2. Insertar un producto de prueba con `unidad_id` válido, sin `categoria_id` (debe permitirlo).
3. Insertar una `entrada` sin `costo_unitario` → debe fallar con el mensaje de error del trigger.
4. Insertar una `entrada` con `costo_unitario` → verificar que `productos.costo` y `productos.cantidad` se actualizan según la fórmula de promedio ponderado (comparar con la tabla de ejemplo trazado arriba).
5. Insertar una `salida` → verificar que `costo_unitario` se autocompleta con el costo vigente, y que `productos.costo` no cambia.
6. Insertar un `ajuste` con un valor absoluto menor al actual → verificar que `movimientos.cantidad` guarda el valor absoluto (no el delta), pero `movimientos.efecto_cantidad` sí es el delta negativo correcto.
7. Consultar `select * from kardex_valorizado where producto_id = X order by creado_en` → verificar que `saldo_cantidad` coincide con `productos.cantidad` en la última fila, y que `saldo_valor / saldo_cantidad ≈ productos.costo`.
8. Consultar `productos_stock_bajo` → verificar que trae `almacen_nombre`, `categoria_nombre`, `unidad_nombre` correctamente vía joins.
9. Volver a crear el usuario de prueba de login (Auth + fila en `usuarios_perfil`) y confirmar que el login sigue funcionando end-to-end (no debería haber ningún cambio de comportamiento ahí).
