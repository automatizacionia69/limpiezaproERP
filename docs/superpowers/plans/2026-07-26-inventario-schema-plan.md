# Rediseño del modelo de datos (inventario valorizado) — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el `schema.sql` actual (modelo plano, sin costeo) por el modelo aprobado en `docs/superpowers/specs/2026-07-26-inventario-schema-design.md`: almacenes→zonas jerárquico, catálogos de categorías/unidades, productos con costeo por promedio ponderado, movimientos valorizados con kardex, y fix del bug de RLS en `usuarios_perfil`. Al terminar, la base de Supabase queda "drop and recreate" en el nuevo modelo y verificada manualmente end-to-end (incluye que el login siga funcionando).

**Architecture:** Migración de un solo script SQL (no incremental — no hay datos reales de cliente todavía). El script vive en `schema.sql` en la raíz del repo y se ejecuta a mano en el SQL Editor de Supabase (no hay CLI de Supabase instalado en este proyecto ni credenciales de service-role disponibles para automatizar la ejecución). No hay cambios de código de aplicación: `src/app/dashboard/page.tsx` solo lee `nombre, rol` de `usuarios_perfil`, columnas que no cambian.

**Tech Stack:** PostgreSQL (Supabase), SQL plpgsql (trigger), sin ORM ni migraciones versionadas (proyecto usa un único `schema.sql` como fuente de verdad).

## Global Constraints

- Sin tests automatizados en este proyecto (decisión explícita) — la verificación de código de app es `npx tsc --noEmit` y `npm run build`; la verificación de la base de datos es SQL manual en el SQL Editor de Supabase, exactamente como especifica la sección "Verificación" del spec.
- Todo el contenido visible (nombres de columnas ya están en español, mensajes de error del trigger) permanece en español.
- Migración es "drop and recreate" completo — acordado con el usuario, no hay datos reales de cliente todavía.
- El script SQL completo (DDL, trigger, vistas, RLS, seed) ya está 100% especificado en el spec — este plan no reabre ninguna decisión de diseño, solo secuencia su implementación y verificación.
- No ejecutar el script contra Supabase sin que el usuario confirme que está listo (borra `usuarios_perfil` — hay que recrear el perfil de prueba después).

---

### Task 1: Reemplazar `schema.sql` con el nuevo modelo

**Files:**
- Modify: `schema.sql` (raíz del repo — reemplazo completo del archivo)

**Interfaces:**
- Produces: el archivo `schema.sql` que la Task 2 copiará y pegará en el SQL Editor de Supabase. Debe ser un único script ejecutable de principio a fin, en el orden: drop → catálogos base → productos → movimientos → trigger → vistas → RLS → seed.

- [ ] **Step 1: Escribir el nuevo `schema.sql` completo**

Reemplazar todo el contenido de `schema.sql` por el siguiente script (es el SQL ya aprobado en el spec, sección "SQL completo propuesto", consolidado en un solo archivo con comentarios de sección):

```sql
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
```

- [ ] **Step 2: Confirmar que el archivo quedó bien formado**

Run: `cd /c/Users/Alvaro/Desktop/distribuidora-limpiezapro && grep -c "^create table\|^create view\|^create or replace view\|^create trigger\|^create policy" schema.sql`
Expected: un número mayor a 15 (7 tablas, 2 vistas, 1 trigger, ~13 políticas) — confirma que el archivo no quedó truncado al escribirlo.

- [ ] **Step 3: Commit**

```bash
git add schema.sql
git commit -m "feat(schema): rediseñar modelo de inventario con costeo y kardex valorizado

Reemplaza el schema plano (zonas/productos/movimientos sin costeo) por el
modelo aprobado en docs/superpowers/specs/2026-07-26-inventario-schema-design.md:
almacenes->zonas jerárquico, catálogos de categorías/unidades, costeo por
promedio ponderado, kardex valorizado, y fix del bug de RLS en usuarios_perfil."
```

---

### Task 2: Ejecutar el script en Supabase (manual, requiere al usuario)

**Files:** ninguno (acción contra el proyecto de Supabase, fuera del repo)

**Interfaces:**
- Consumes: el `schema.sql` producido en la Task 1.
- Produces: el esquema nuevo corriendo en la base de datos real de Supabase — todas las tareas siguientes dependen de que esta esté aplicada.

⚠️ Esta tarea la debe ejecutar el usuario (Alvaro) directamente en el dashboard de Supabase — no hay Supabase CLI instalado en este proyecto ni una service-role key disponible para automatizarlo desde aquí. Confirmar explícitamente con el usuario antes de este paso, porque **borra la tabla `usuarios_perfil` actual** (no `auth.users`).

- [ ] **Step 1: Abrir el SQL Editor de Supabase**

Ir a `https://supabase.com/dashboard/project/ejfaoqudlberhkkjvqdm/sql/new` (el `project_id` sale de `NEXT_PUBLIC_SUPABASE_URL` en `.env.local`: `ejfaoqudlberhkkjvqdm`).

- [ ] **Step 2: Pegar y ejecutar el contenido completo de `schema.sql`**

Copiar todo el archivo `schema.sql` (ya actualizado en la Task 1) y ejecutarlo con "Run".
Expected: `Success. No rows returned` (o mensaje equivalente de éxito), sin errores en rojo.

- [ ] **Step 3: Si falla, diagnosticar antes de reintentar**

Si el error es de un objeto que ya existía y el `drop ... cascade` no lo alcanzó a limpiar (p. ej. una vista o política creada a mano fuera de este script), correr `\d` en el SQL Editor o consultar `information_schema.tables` para ver qué quedó, y decidir si se agrega al bloque de limpieza antes de reintentar. No usar `drop schema public cascade` ni nada más amplio que lo que ya especifica el script.

- [ ] **Step 4: Verificar el seed de catálogos**

```sql
select a.nombre as almacen, z.nombre as zona from zonas z join almacenes a on a.id = z.almacen_id order by z.nombre;
select nombre from unidades_medida order by nombre;
```

Expected: la primera consulta devuelve 4 filas, todas con `almacen = 'Piura'` (`Sala Comedor`, `Cochera`, `Cuarto 1`, `Cocina`). La segunda devuelve 3 filas (`caja`, `paq`, `und`).

---

### Task 3: Recrear el perfil del usuario de prueba

**Files:** ninguno (SQL directo en Supabase)

**Interfaces:**
- Consumes: el esquema aplicado en la Task 2 (tabla `usuarios_perfil` recién creada, vacía).
- Produces: una fila en `usuarios_perfil` que permite volver a iniciar sesión con el usuario de prueba existente en `auth.users`.

- [ ] **Step 1: Ubicar el `id` y `email` del usuario de prueba en `auth.users`**

En el SQL Editor de Supabase:

```sql
select id, email from auth.users order by created_at desc;
```

Expected: aparece el usuario de prueba usado para el login (el mismo con el que se probó la Fase 1). Copiar su `id` (uuid).

- [ ] **Step 2: Insertar la fila de perfil correspondiente**

Sustituir `<ID-COPIADO>` por el uuid del paso anterior y `<NOMBRE>` por el nombre que debe mostrar el dashboard (columna `nombre` de `usuarios_perfil`, ver `src/app/dashboard/page.tsx:50`):

```sql
insert into usuarios_perfil (id, nombre, rol)
values ('<ID-COPIADO>', '<NOMBRE>', 'admin');
```

Expected: `Success. 1 row affected`.

- [ ] **Step 3: Verificar la fila**

```sql
select id, nombre, rol from usuarios_perfil;
```

Expected: exactamente 1 fila, con el `id` igual al de `auth.users` y `rol = 'admin'`.

---

### Task 4: Verificar el trigger de costeo (promedio ponderado) end-to-end

**Files:** ninguno (SQL directo en Supabase)

**Interfaces:**
- Consumes: esquema de la Task 2, perfil de la Task 3 (necesario porque `movimientos.usuario_id` referencia `usuarios_perfil`, aunque es nullable así que no bloquea esta prueba).

Esta tarea reproduce exactamente el ejemplo trazado del spec (`docs/superpowers/specs/2026-07-26-inventario-schema-design.md`, sección "Ejemplo trazado") para confirmar que el trigger calcula bien el costo promedio y el `efecto_cantidad`.

- [ ] **Step 1: Crear el producto de prueba**

```sql
insert into productos (nombre, unidad_id, cantidad, costo)
select 'Detergente 5kg (prueba)', u.id, 0, 0
from unidades_medida u where u.nombre = 'und'
returning id;
```

Expected: `Success. 1 row affected`, devuelve un `id` — anotarlo (se usa `<PRODUCTO_ID>` en los pasos siguientes).

- [ ] **Step 2: Movimiento 1 — entrada sin `costo_unitario` (debe fallar)**

```sql
insert into movimientos (producto_id, tipo, cantidad)
values (<PRODUCTO_ID>, 'entrada', 50);
```

Expected: error `costo_unitario es obligatorio para movimientos de tipo entrada` — confirma la validación del trigger.

- [ ] **Step 3: Movimiento 1 — entrada válida**

```sql
insert into movimientos (producto_id, tipo, cantidad, costo_unitario)
values (<PRODUCTO_ID>, 'entrada', 50, 20.00);

select cantidad, costo from productos where id = <PRODUCTO_ID>;
```

Expected: `cantidad = 50`, `costo = 20.00`.

- [ ] **Step 4: Movimiento 2 — segunda entrada, distinto costo**

```sql
insert into movimientos (producto_id, tipo, cantidad, costo_unitario)
values (<PRODUCTO_ID>, 'entrada', 30, 24.00);

select cantidad, costo from productos where id = <PRODUCTO_ID>;
```

Expected: `cantidad = 80`, `costo = 21.50` (promedio ponderado: `(50×20 + 30×24) / 80`).

- [ ] **Step 5: Movimiento 3 — salida**

```sql
insert into movimientos (producto_id, tipo, cantidad)
values (<PRODUCTO_ID>, 'salida', 45);

select cantidad, costo from productos where id = <PRODUCTO_ID>;
select tipo, cantidad, costo_unitario, efecto_cantidad
  from movimientos where producto_id = <PRODUCTO_ID> order by id desc limit 1;
```

Expected: `productos.cantidad = 35`, `productos.costo` sigue en `21.50` (no cambia en salidas). La última fila de `movimientos` muestra `costo_unitario = 21.50` (autocompletado) y `efecto_cantidad = -45`.

- [ ] **Step 6: Movimiento 4 — ajuste (conteo físico menor al sistema)**

```sql
insert into movimientos (producto_id, tipo, cantidad)
values (<PRODUCTO_ID>, 'ajuste', 32);

select cantidad, costo from productos where id = <PRODUCTO_ID>;
select tipo, cantidad, costo_unitario, efecto_cantidad
  from movimientos where producto_id = <PRODUCTO_ID> order by id desc limit 1;
```

Expected: `productos.cantidad = 32`. La última fila de `movimientos` muestra `cantidad = 32` (valor absoluto, tal como lo ingresó el usuario) y `efecto_cantidad = -3` (calculado por el trigger: `32 - 35`).

---

### Task 5: Verificar las vistas `kardex_valorizado` y `productos_stock_bajo`

**Files:** ninguno (SQL directo en Supabase)

**Interfaces:**
- Consumes: los 4 movimientos insertados en la Task 4 sobre `<PRODUCTO_ID>`.

- [ ] **Step 1: Verificar `kardex_valorizado`**

```sql
select tipo, cantidad, efecto_cantidad, costo_unitario, valor_movimiento, saldo_cantidad, saldo_valor
from kardex_valorizado
where producto_id = <PRODUCTO_ID>
order by creado_en, id;
```

Expected: 4 filas en orden (entrada 50, entrada 30, salida 45, ajuste 32) con `saldo_cantidad` final `= 32` y `saldo_valor` final `= 688.00`, igual a la tabla del spec. Confirmar que `saldo_valor / saldo_cantidad ≈ 21.50` (el `costo` vigente del producto verificado en la Task 4, Step 6).

- [ ] **Step 2: Verificar `productos_stock_bajo`**

```sql
update productos set punto_reorden = 100 where id = <PRODUCTO_ID>;

select nombre, cantidad, punto_reorden, zona_nombre, almacen_nombre, categoria_nombre, unidad_nombre
from productos_stock_bajo
where id = <PRODUCTO_ID>;
```

Expected: 1 fila (32 ≤ 100). `unidad_nombre = 'und'`. `zona_nombre` y `almacen_nombre` en blanco/null (el producto de prueba no tiene `zona_id`) y `categoria_nombre` en blanco/null (no tiene `categoria_id`) — confirma que los joins no rompen con FKs nulas.

- [ ] **Step 3: Limpiar el producto de prueba**

```sql
delete from movimientos where producto_id = <PRODUCTO_ID>;
delete from productos where id = <PRODUCTO_ID>;
```

Expected: ambos `DELETE` corren sin error (el ledger no tiene protección contra `DELETE` a nivel RLS para el rol usado en el SQL Editor, que corre como superusuario — esto es solo limpieza de datos de prueba, no un flujo de la app).

---

### Task 6: Confirmar que el login sigue funcionando end-to-end

**Files:** ninguno (prueba manual en navegador)

**Interfaces:**
- Consumes: el perfil recreado en la Task 3.

- [ ] **Step 1: Verificar tipos y build antes de probar en navegador**

Run: `cd /c/Users/Alvaro/Desktop/distribuidora-limpiezapro && npx tsc --noEmit`
Expected: sin errores (este rediseño no tocó ningún archivo `.ts`/`.tsx`, así que no debería haber ningún cambio de comportamiento).

- [ ] **Step 2: Levantar el servidor de desarrollo**

Run: `cd /c/Users/Alvaro/Desktop/distribuidora-limpiezapro && npm run dev`
Expected: arranca sin errores en `http://localhost:3000`.

- [ ] **Step 3: Probar el login manualmente (requiere al usuario)**

Ir a `http://localhost:3000/login`, ingresar las credenciales del usuario de prueba (el mismo `email` de la Task 3, Step 1) y enviar el formulario.
Expected: redirige a `/dashboard` y muestra "Hola, `<NOMBRE>`" y "Rol: Administrador" — el `nombre`/`rol` insertados en la Task 3.

- [ ] **Step 4: Detener el servidor de desarrollo**

Cerrar el proceso de `npm run dev` (Ctrl+C en la terminal donde corre).

---

### Task 7: Actualizar `CLAUDE.md` con el nuevo estado

**Files:**
- Modify: `CLAUDE.md:30-37` (nota de "En transición"), `CLAUDE.md:126-144` ("Estado actual y próximos pasos")

**Interfaces:**
- Consumes: confirmación de que las Tasks 2-6 pasaron (esquema aplicado y verificado en Supabase, login funcionando).

- [ ] **Step 1: Actualizar la sección "Modelo de datos"**

En `CLAUDE.md`, reemplazar el bloque que empieza en la línea 30 (`**⚠️ En transición.**...`) para que ya no diga "pendiente de implementar" sino que el modelo con costeo/kardex es el vigente, y mover el detalle de tablas (`almacenes`, `categorias`, `unidades_medida`, columnas de costo) de "Modelo especificado (pendiente)" a "Modelo actual (vigente hoy)".

- [ ] **Step 2: Actualizar "Estado actual y próximos pasos"**

Marcar el rediseño del modelo de datos (Fase 2, primera parte) como implementado y verificado en Supabase. Actualizar "Siguiente paso concreto" para que apunte a lo que sigue en el roadmap: CRUD de productos y movimientos sobre el nuevo modelo (spec/plan todavía no existen para esa parte — es el siguiente ciclo de `superpowers:brainstorming` → `superpowers:writing-plans`, fuera del alcance de este plan).

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: marcar el rediseño del modelo de inventario como implementado

El nuevo schema.sql (almacenes/zonas, catálogos, costeo por promedio
ponderado, kardex valorizado) ya corrió y se verificó en Supabase."
```

---
