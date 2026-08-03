-- ============================================================================
-- fix-fuga-vistas.sql — CORRECCION DE SEGURIDAD URGENTE
-- Distribuidora LimpiezaPro — 2026-07-30
--
-- PROBLEMA (verificado en vivo contra produccion el 2026-07-30)
-- Las dos vistas de este esquema devuelven datos a usuarios ANONIMOS, usando
-- solo la anon key publica (que viaja en el JavaScript del sitio, o sea que
-- cualquiera que abra limpiezapro-erp.vercel.app la puede leer).
--
-- Las TABLAS si estan protegidas por RLS. Las VISTAS no, porque en Postgres
-- una vista corre por defecto con los permisos de su CREADOR, no con los de
-- quien la consulta — asi que "ve" las tablas sin que se aplique el RLS.
--
-- Evidencia recogida (GET a la API REST con la anon key, sin login):
--   productos            -> 0 filas   (correcto, RLS funciona)
--   movimientos          -> 0 filas   (correcto, RLS funciona)
--   usuarios_perfil      -> 0 filas   (correcto, RLS funciona)
--   productos_stock_bajo -> TODAS     (FUGA: costo y precio_venta de cada
--                                      producto en punto de reorden)
--   kardex_valorizado    -> TODAS     (FUGA GRAVE: el ledger completo de
--                                      inventario — costo_unitario,
--                                      valor_movimiento y saldo_valor de cada
--                                      movimiento, o sea los margenes del
--                                      negocio, mas el nombre del usuario que
--                                      lo registro)
--
-- COMO USAR
-- Pegar este archivo completo en: Supabase -> SQL Editor -> New query -> Run.
-- Es idempotente: se puede correr varias veces sin efectos secundarios.
-- ============================================================================


-- ============================================================================
-- PARTE 1 — DIAGNOSTICO (dejar constancia del estado ANTES de corregir)
-- ============================================================================

select
  c.relname as vista,
  coalesce(
    (select option_value
       from pg_options_to_table(c.reloptions)
      where option_name = 'security_invoker'),
    'false'
  ) as security_invoker,
  case
    when coalesce(
      (select option_value
         from pg_options_to_table(c.reloptions)
        where option_name = 'security_invoker'), 'false') = 'true'
    then 'OK - respeta RLS'
    else 'RIESGO - salta el RLS de las tablas base'
  end as estado
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind = 'v'
  and n.nspname = 'public'
order by c.relname;


-- ============================================================================
-- PARTE 2 — CORRECCION
-- ============================================================================

-- 2.1 Hacer que las vistas respeten el RLS de quien las consulta.
--     Requiere PostgreSQL 15+ (Supabase ya corre 15 o superior).
alter view public.productos_stock_bajo set (security_invoker = on);
alter view public.kardex_valorizado    set (security_invoker = on);

-- 2.2 Defensa en profundidad: quitarle el permiso de lectura al rol anonimo.
--     Aun con security_invoker activo, no hay ninguna razon para que el rol
--     `anon` pueda tocar estas vistas — la app siempre consulta con sesion.
revoke all on public.productos_stock_bajo from anon;
revoke all on public.kardex_valorizado    from anon;

-- 2.3 Asegurar que los usuarios logueados SI puedan seguir leyendolas
--     (el RLS de las tablas base se encarga de filtrar que ve cada uno).
grant select on public.productos_stock_bajo to authenticated;
grant select on public.kardex_valorizado    to authenticated;


-- ============================================================================
-- PARTE 3 — VERIFICACION (correr DESPUES; ambas deben decir 'OK')
-- ============================================================================

select
  c.relname as vista,
  coalesce(
    (select option_value
       from pg_options_to_table(c.reloptions)
      where option_name = 'security_invoker'),
    'false'
  ) as security_invoker,
  case
    when coalesce(
      (select option_value
         from pg_options_to_table(c.reloptions)
        where option_name = 'security_invoker'), 'false') = 'true'
    then 'OK - respeta RLS'
    else 'TODAVIA EN RIESGO'
  end as estado
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind = 'v'
  and n.nspname = 'public'
order by c.relname;

-- 3.2 Quien puede leer cada vista ahora (no deberia aparecer `anon`).
select
  table_name as vista,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('productos_stock_bajo', 'kardex_valorizado')
order by table_name, grantee;


-- ============================================================================
-- DESPUES DE CORRER ESTO
-- 1. Confirmar en la app que el aviso de stock bajo del layout sigue
--    funcionando (ahora consulta con RLS aplicado).
-- 2. Confirmar que el reporte de Kardex valorizado sigue mostrando datos
--    para un usuario logueado.
-- 3. Volver a probar la fuga desde afuera: un GET a
--    /rest/v1/kardex_valorizado con solo la anon key debe devolver [] o 401.
-- ============================================================================
