-- ============================================================
-- Distribuidora LimpiezaPro — Series temporales para Notas de Crédito/Débito
-- y Guías de Remisión, alineadas a los códigos ya activos en la cuenta demo
-- de NUBEFACT (mismo criterio que add-serie-nubefact-temporal.sql, que ya
-- hizo esto para Factura/Boleta: F006/B006 -> FFF1/BBB1).
--
-- Notas de Crédito/Débito y Guías de Remisión TODAVÍA NO se envían a
-- NUBEFACT (esa integración no está construida) — este cambio deja la
-- numeración local ya lista/consistente para cuando se conecten.
--
-- Notas de Crédito/Débito: la serie depende de si el comprobante que
-- anexan es Factura o Boleta, igual que en el panel de NUBEFACT (el local
-- activo tiene NOTA DE CRÉDITO/DÉBITO -> FFF1 cuando es de Factura, BBB1
-- cuando es de Boleta). Antes usaban un DEFAULT fijo (NC01-/ND01-); ahora
-- un trigger mira el tipo del comprobante padre, mismo patrón que ya usa
-- comprobantes_generar_numero().
--
-- Guías de Remisión: no depende de nada, un solo DEFAULT (T006 -> TTT1,
-- "GUÍA DE REMISIÓN REMITENTE ELECTRÓNICA" en la cuenta demo).
--
-- REVERTIR cuando el local quede activado ante SUNAT: volver a NC01-/ND01-
-- (quitar los triggers de abajo y restaurar el DEFAULT original de
-- add-facturacion.sql/add-facturacion-mejoras.sql) y T006- (restaurar el
-- DEFAULT de add-guias-remision.sql).
--
-- Migración ADITIVA — no borra nada, segura de correr sobre datos reales.
-- Ejecutar en: Supabase → SQL Editor → New query
-- (Correr DESPUES de add-serie-nubefact-temporal.sql)
-- ============================================================

-- ------------------------------------------------------------
-- 1) Notas de crédito: trigger en vez de DEFAULT fijo
-- ------------------------------------------------------------
alter table notas_credito alter column numero drop default;

create or replace function notas_credito_generar_numero()
returns trigger as $$
declare
  v_tipo text;
begin
  select tipo into v_tipo from comprobantes where id = new.comprobante_id;

  if v_tipo = 'factura' then
    new.numero := 'FFF1-' || lpad(nextval('nota_credito_numero_seq')::text, 6, '0');
  elsif v_tipo = 'boleta' then
    new.numero := 'BBB1-' || lpad(nextval('nota_credito_numero_seq')::text, 6, '0');
  else
    new.numero := 'NC01-' || lpad(nextval('nota_credito_numero_seq')::text, 6, '0');
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_notas_credito_numero on notas_credito;
create trigger trg_notas_credito_numero before insert on notas_credito
for each row execute function notas_credito_generar_numero();

-- ------------------------------------------------------------
-- 2) Notas de débito: mismo criterio
-- ------------------------------------------------------------
alter table notas_debito alter column numero drop default;

create or replace function notas_debito_generar_numero()
returns trigger as $$
declare
  v_tipo text;
begin
  select tipo into v_tipo from comprobantes where id = new.comprobante_id;

  if v_tipo = 'factura' then
    new.numero := 'FFF1-' || lpad(nextval('nota_debito_numero_seq')::text, 6, '0');
  elsif v_tipo = 'boleta' then
    new.numero := 'BBB1-' || lpad(nextval('nota_debito_numero_seq')::text, 6, '0');
  else
    new.numero := 'ND01-' || lpad(nextval('nota_debito_numero_seq')::text, 6, '0');
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_notas_debito_numero on notas_debito;
create trigger trg_notas_debito_numero before insert on notas_debito
for each row execute function notas_debito_generar_numero();

-- ------------------------------------------------------------
-- 3) Guías de remisión: un solo DEFAULT, sin dependencia de tipo
-- ------------------------------------------------------------
alter table guias_remision alter column numero
  set default ('TTT1-' || lpad(nextval('guia_remision_numero_seq')::text, 6, '0'));
