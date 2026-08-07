-- ============================================================
-- Productos: SKU, código de barras, marca, estado (soft-disable)
-- Ejecutar en: Supabase → SQL Editor → New query
-- Migración aditiva — no modifica columnas ni migraciones existentes.
--
-- Decisión de arquitectura: la columna `codigo` NO se renombra. Ya contiene
-- datos reales (códigos de catálogo del proveedor/fabricante importados en
-- import-inventario.sql) y la usan ~18 puntos del código (ventas, compras,
-- movimientos, guías, reportes, dashboard). Se mantiene tal cual y la UI la
-- reetiqueta como "Cód. fabricante". `sku` y `codigo_barras` son conceptos
-- nuevos y separados.
-- ============================================================

alter table productos add column if not exists sku text;
alter table productos add column if not exists codigo_barras text;
alter table productos add column if not exists marca text;
alter table productos add column if not exists activo boolean not null default true;

comment on column productos.codigo is 'Código de fabricante/proveedor (texto libre, no único) — no confundir con sku. La UI lo muestra como "Cód. fabricante".';
comment on column productos.sku is 'Código interno único del ERP. Identifica el tipo de producto, no la unidad física: 100 unidades iguales comparten el mismo SKU y el stock es 100.';
comment on column productos.codigo_barras is 'EAN/UPC/GTIN. Único cuando está presente; opcional porque no todo producto tiene código de barras real todavía.';
comment on column productos.activo is 'Soft-disable: false = el producto deja de aparecer en selectores de operaciones nuevas (ventas, compras, cotizaciones, movimientos, guías), pero sigue existiendo y siendo editable en Productos, y su historial ya emitido no cambia.';

-- ------------------------------------------------------------
-- Backfill de SKU para productos existentes sin uno.
-- Prefijo = primeras 3 letras (sin tildes/espacios) del nombre de la
-- categoría, o "GEN" si no tiene categoría, + correlativo de 4 dígitos.
-- El correlativo se reparte por prefijo (no por categoria_id) para que dos
-- categorías con nombres que casualmente compartan prefijo no choquen entre
-- sí — la única garantía real es la unicidad global de sku.
-- ------------------------------------------------------------
with prefijos as (
  select
    p.id,
    upper(
      left(
        regexp_replace(
          translate(coalesce(c.nombre, 'general'), 'ÁÉÍÓÚÑáéíóúñ', 'AEIOUNaeioun'),
          '[^A-Za-z]', '', 'g'
        ) || 'XXX',
        3
      )
    ) as prefijo
  from productos p
  left join categorias c on c.id = p.categoria_id
  where p.sku is null
),
numerados as (
  select id, prefijo, row_number() over (partition by prefijo order by id) as n
  from prefijos
)
update productos p
set sku = numerados.prefijo || '-' || lpad(numerados.n::text, 4, '0')
from numerados
where p.id = numerados.id;

alter table productos alter column sku set not null;

create unique index if not exists idx_productos_sku_unique on productos (sku);
create unique index if not exists idx_productos_codigo_barras_unique on productos (codigo_barras) where codigo_barras is not null;
create index if not exists idx_productos_activo on productos(activo);

-- Un producto inactivo no debe generar alertas de reorden.
-- No se puede usar CREATE OR REPLACE aquí: p.* ahora incluye sku/codigo_barras/
-- marca/activo antes de zona_nombre/almacen_nombre/etc., lo que corre esas
-- columnas de posición — Postgres rechaza un REPLACE que reordene columnas
-- existentes. Se recrea la vista (drop + create), no hay pérdida de datos:
-- una vista no almacena datos propios, solo su definición.
drop view if exists productos_stock_bajo;
create view productos_stock_bajo as
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
where p.cantidad <= p.punto_reorden and p.activo;
