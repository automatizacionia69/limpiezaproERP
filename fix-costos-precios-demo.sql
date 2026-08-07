-- ============================================================
-- Datos de demo: costos y precios de venta realistas
-- Script de DATOS (no de esquema) — mismo espíritu que import-inventario.sql.
-- Ejecutar en: Supabase → SQL Editor → New query
--
-- Solo toca productos con costo = 0 o precio_venta nulo (no pisa costo real
-- ya calculado por el trigger aplicar_movimiento() a partir de entradas
-- reales, ni precio_venta ya cargado). Es seguro correrlo más de una vez:
-- una vez que un producto queda con costo > 0, deja de calificar.
--
-- precio_venta queda con IGV incluido (18%), igual que el resto del sistema
-- (ver src/lib/cotizaciones.ts, IGV_TASA) — no requiere ningún cambio de
-- código, solo esta corrección de datos.
-- ============================================================

with variacion as (
  -- Variación determinística ±12% por producto (misma semilla siempre),
  -- para que productos del mismo rubro no queden todos con precio idéntico.
  select id, 0.88 + (abs(hashtext(nombre)) % 25) / 100.0 as factor
  from productos
),
reglas as (
  select
    p.id,
    case
      when p.nombre ilike '%alcohol%'                                        then 9.80
      when p.nombre ilike '%lejía%' or p.nombre ilike '%lejia%'               then 6.50
      when p.nombre ilike '%detergente%'                                     then 22.00
      when p.nombre ilike '%jabón%' or p.nombre ilike '%jabon%'               then 14.00
      when p.nombre ilike '%guante%'                                         then 12.50
      when p.nombre ilike '%bolsa%'                                          then 28.50
      when p.nombre ilike '%dispensador%'                                    then 35.00
      when p.nombre ilike '%servilleta%'                                     then 48.00
      when p.nombre ilike '%toalla%'                                         then 42.00
      when p.nombre ilike '%higi%' or p.nombre ~* '\yph\y'                   then 32.00
      when p.nombre ilike '%kit%' or p.nombre ilike '%balde%' or p.nombre ilike '%mopa%' then 45.00
      else 18.00
    end as costo_base,
    case
      when p.nombre ilike '%alcohol%'                                        then 2.54
      when p.nombre ilike '%lejía%' or p.nombre ilike '%lejia%'               then 2.20
      when p.nombre ilike '%detergente%'                                     then 1.55
      when p.nombre ilike '%jabón%' or p.nombre ilike '%jabon%'               then 1.75
      when p.nombre ilike '%guante%'                                         then 1.70
      when p.nombre ilike '%bolsa%'                                          then 1.65
      when p.nombre ilike '%dispensador%'                                    then 1.80
      when p.nombre ilike '%servilleta%'                                     then 1.46
      when p.nombre ilike '%toalla%'                                         then 1.55
      when p.nombre ilike '%higi%' or p.nombre ~* '\yph\y'                   then 1.60
      when p.nombre ilike '%kit%' or p.nombre ilike '%balde%' or p.nombre ilike '%mopa%' then 1.78
      else 1.70
    end as margen
  from productos p
)
update productos p
set
  costo = round((reglas.costo_base * variacion.factor)::numeric, 2),
  precio_venta = round((reglas.costo_base * variacion.factor * reglas.margen)::numeric, 2)
from reglas
join variacion on variacion.id = reglas.id
where p.id = reglas.id
  and (p.costo = 0 or p.precio_venta is null);
