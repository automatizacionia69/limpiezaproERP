-- ============================================================
-- Distribuidora LimpiezaPro — Serie temporal para Factura/Boleta
-- (F006/B006 -> FFF1/BBB1) mientras se activa el local "almacen_principal"
-- ante SUNAT en el panel de NUBEFACT.
--
-- F006 y B006 son las series reales del negocio, pero NUBEFACT las rechaza
-- ("No puedes emitir comprobantes con esta serie") hasta que el local 006
-- quede activado con SUNAT en modo producción (boton "Activar con la
-- SUNAT" en el panel). FFF1/BBB1 son series de ejemplo que SÍ estan
-- habilitadas y activas en la cuenta (local 001, "LOCAL PRINCIPAL") -- se
-- usan de paso mientras tanto para poder seguir facturando de verdad.
--
-- Usa la MISMA secuencia (factura_numero_seq/boleta_numero_seq) que ya
-- traía F006/B006, solo cambia el prefijo -- no reinicia la numeración.
--
-- REVERTIR cuando F006/B006 queden activadas: volver a correr el
-- create or replace de add-serie-boleta-b006.sql (no editar ese archivo,
-- solo volver a ejecutarlo tal cual esta).
--
-- Migración ADITIVA — no borra nada, segura de correr sobre datos reales.
-- Ejecutar en: Supabase → SQL Editor → New query
-- ============================================================

create or replace function comprobantes_generar_numero()
returns trigger as $$
begin
  if new.tipo = 'factura' then
    new.serie := 'FFF1';
    new.numero := 'FFF1-' || lpad(nextval('factura_numero_seq')::text, 6, '0');
  elsif new.tipo = 'boleta' then
    new.serie := 'BBB1';
    new.numero := 'BBB1-' || lpad(nextval('boleta_numero_seq')::text, 6, '0');
  elsif new.tipo = 'nota_venta' then
    new.serie := 'NV01';
    new.numero := 'NV01-' || lpad(nextval('nota_venta_numero_seq')::text, 6, '0');
  elsif new.tipo = 'ticket' then
    new.serie := 'T001';
    new.numero := 'T001-' || lpad(nextval('ticket_numero_seq')::text, 6, '0');
  end if;
  return new;
end;
$$ language plpgsql;
