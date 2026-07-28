-- ============================================================
-- Distribuidora LimpiezaPro — Serie de Boleta pasa de B001 a B006
-- Migración ADITIVA — no borra nada, seguro de correr sobre datos reales.
-- Ejecutar en: Supabase → SQL Editor → New query
-- ============================================================

create or replace function comprobantes_generar_numero()
returns trigger as $$
begin
  if new.tipo = 'factura' then
    new.serie := 'F006';
    new.numero := 'F006-' || lpad(nextval('factura_numero_seq')::text, 6, '0');
  elsif new.tipo = 'boleta' then
    new.serie := 'B006';
    new.numero := 'B006-' || lpad(nextval('boleta_numero_seq')::text, 6, '0');
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
