-- ============================================================
-- Distribuidora LimpiezaPro — Integridad de ventas y cotizaciones
-- Migración ADITIVA — no borra nada, seguro de correr sobre datos reales.
-- Ejecutar en: Supabase → SQL Editor → New query
--
-- NOTA: estos 4 cambios YA ESTÁN APLICADOS en producción (se corrieron
-- directo contra el proyecto el 2026-07-30, antes de que existiera este
-- archivo). Este .sql documenta lo que ya está vigente, para que el repo
-- sea reproducible si algún día hay que reconstruir el proyecto de
-- Supabase desde cero. Está escrito de forma idempotente (create or
-- replace / if not exists) asi que no rompe nada si se vuelve a correr.
-- ============================================================

-- 1) Cierra la fuga de datos: las vistas de solo-consulta ya no eran
-- visibles con la clave pública (anon) sin haber iniciado sesión.
-- security_invoker hace que la vista respete las políticas RLS del
-- usuario que consulta, en vez de las del dueño de la vista.
alter view productos_stock_bajo set (security_invoker = on);
revoke all on productos_stock_bajo from anon;

alter view kardex_valorizado set (security_invoker = on);
revoke all on kardex_valorizado from anon;

-- 2) kardex_valorizado necesitaba el nombre del usuario que hizo cada
-- movimiento, pero un LEFT JOIN directo a usuarios_perfil (con RLS ya
-- respetada por security_invoker) dejaba usuario_nombre en null para
-- cualquiera que no fuera admin, porque RLS solo deja ver la fila propia.
-- Esta función expone únicamente el nombre, no el resto del perfil.
create or replace function public.nombre_usuario(p_id uuid)
returns text
language sql
stable security definer
set search_path = public
as $$
  select nombre from usuarios_perfil where id = p_id;
$$;

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
  m.efecto_cantidad * m.costo_unitario as valor_movimiento,
  sum(m.efecto_cantidad) over (
    partition by m.producto_id order by m.creado_en, m.id
    rows between unbounded preceding and current row
  ) as saldo_cantidad,
  sum(m.efecto_cantidad * m.costo_unitario) over (
    partition by m.producto_id order by m.creado_en, m.id
    rows between unbounded preceding and current row
  ) as saldo_valor,
  m.usuario_id,
  nombre_usuario(m.usuario_id) as usuario_nombre,
  m.motivo,
  m.referencia,
  m.creado_en
from movimientos m
join productos p on p.id = m.producto_id
order by m.producto_id, m.creado_en, m.id;

-- create or replace view no conserva reloptions/grants: hay que
-- reaplicarlos despues de recrear la vista.
alter view kardex_valorizado set (security_invoker = on);
revoke all on kardex_valorizado from anon;

-- 3) Evita que una orden de venta termine con dos comprobantes vigentes
-- a la vez (ej. dos clicks en "Grabar venta" antes de que la UI se
-- deshabilite). Un comprobante anulado no cuenta, así que sí se puede
-- volver a facturar una orden después de anular su comprobante.
create unique index if not exists comprobantes_una_por_orden_vigente
  on comprobantes (orden_venta_id)
  where estado <> 'anulado';

-- 4) Evita que una cotización se convierta a venta dos veces (mismo
-- problema que el punto 3, pero en el flujo cotización → orden de
-- venta). 'convertida' bloquea una segunda conversión; orden_venta_id
-- enlaza la cotización con la orden que generó.
alter table cotizaciones
  add column if not exists estado text not null default 'pendiente';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'cotizaciones_estado_check'
      and conrelid = 'public.cotizaciones'::regclass
  ) then
    alter table cotizaciones
      add constraint cotizaciones_estado_check
      check (estado in ('pendiente', 'convertida'));
  end if;
end $$;

alter table cotizaciones
  add column if not exists orden_venta_id bigint references ordenes_venta(id);

-- 5) Notas de crédito: la reversión de stock necesita insertar en
-- `movimientos`, pero esa tabla solo permite escritura directa a
-- admin/almacén (RLS) — un usuario de rol `ventas` emitiendo una nota de
-- crédito no podía revertir el stock. Esta función corre con los
-- privilegios de su dueño (SECURITY DEFINER) para que cualquier usuario
-- con sesión pueda revertir stock SOLO a través de este camino
-- controlado (no le da acceso directo a `movimientos`).
create or replace function public.revertir_stock_nc(p_items jsonb, p_motivo text, p_referencia text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_insertados integer := 0;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Se requiere sesion para revertir stock.';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'p_items debe ser un array JSON.';
  end if;

  insert into movimientos (producto_id, tipo, cantidad, costo_unitario, usuario_id, motivo, referencia)
  select
    pr.id,
    'entrada',
    (item->>'cantidad')::numeric,
    pr.costo,          -- costo promedio vigente: la reversion no mueve el promedio
    v_uid,
    p_motivo,
    p_referencia
  from jsonb_array_elements(p_items) as item
  join productos pr on pr.id = (item->>'producto_id')::bigint
  where (item->>'cantidad')::numeric > 0;

  get diagnostics v_insertados = row_count;
  return v_insertados;
end;
$$;
