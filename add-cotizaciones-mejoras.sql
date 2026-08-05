-- ============================================================
-- Distribuidora LimpiezaPro — Mejoras al módulo de Cotizaciones
-- Migración ADITIVA — no borra nada, segura de correr sobre datos reales.
-- Ejecutar en: Supabase → SQL Editor → New query
--
-- Agrega: moneda, fecha de entrega, documento de referencia, vigencia de la
-- oferta (en días) y descuento global (% o monto fijo).
-- descuento_valor = lo que escribió el vendedor (ej. 10 si puso "10%").
-- descuento_monto = el importe ya calculado en soles/dólares, para mostrar
-- en el PDF sin tener que rehacer la cuenta.
-- ============================================================

alter table cotizaciones
  add column if not exists moneda text not null default 'PEN',
  add column if not exists fecha_entrega date,
  add column if not exists documento_referencia text,
  add column if not exists vigencia_dias integer not null default 15,
  add column if not exists descuento_tipo text,
  add column if not exists descuento_valor numeric not null default 0,
  add column if not exists descuento_monto numeric not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'cotizaciones_moneda_check'
      and conrelid = 'public.cotizaciones'::regclass
  ) then
    alter table cotizaciones
      add constraint cotizaciones_moneda_check
      check (moneda in ('PEN', 'USD'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'cotizaciones_descuento_tipo_check'
      and conrelid = 'public.cotizaciones'::regclass
  ) then
    alter table cotizaciones
      add constraint cotizaciones_descuento_tipo_check
      check (descuento_tipo is null or descuento_tipo in ('porcentaje', 'monto'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'cotizaciones_vigencia_dias_check'
      and conrelid = 'public.cotizaciones'::regclass
  ) then
    alter table cotizaciones
      add constraint cotizaciones_vigencia_dias_check
      check (vigencia_dias > 0);
  end if;
end $$;
