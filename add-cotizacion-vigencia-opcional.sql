-- ============================================================
-- Distribuidora LimpiezaPro — Vigencia de oferta opcional en Cotizaciones
-- Migración ADITIVA — no borra nada, segura de correr sobre datos reales.
-- Ejecutar en: Supabase → SQL Editor → New query
--
-- Antes "vigencia_dias" era obligatorio (siempre mostraba "Validez de la
-- oferta: N días" en el PDF). Ahora puede quedar en null cuando el vendedor
-- apaga el interruptor "Vigencia de la oferta" del formulario, para
-- cotizaciones que no manejan fecha de vencimiento.
-- ============================================================

alter table cotizaciones
  alter column vigencia_dias drop not null;

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'cotizaciones_vigencia_dias_check'
      and conrelid = 'public.cotizaciones'::regclass
  ) then
    alter table cotizaciones drop constraint cotizaciones_vigencia_dias_check;
  end if;

  alter table cotizaciones
    add constraint cotizaciones_vigencia_dias_check
    check (vigencia_dias is null or vigencia_dias > 0);
end $$;
