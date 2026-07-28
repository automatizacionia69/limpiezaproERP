-- ============================================================
-- Distribuidora LimpiezaPro — Mejoras al módulo de Facturación
-- Migración ADITIVA — no borra nada, seguro de correr sobre datos reales.
-- Ejecutar en: Supabase → SQL Editor → New query
--
-- 1) Serie de Factura pasa de F001 a F006 (según lo pedido).
-- 2) Se agrega el tipo "ticket" a los comprobantes.
-- 3) Comprobantes gana fecha_emision, dias_credito, medio_pago, vendedor_id
--    (editables desde la pantalla de Facturar, igual que en Cotizaciones).
-- 4) Nueva tabla detalle_nota_credito para devoluciones POR ÍTEM (cantidad
--    parcial, no el comprobante completo).
-- ============================================================

-- ------------------------------------------------------------
-- 1) Serie de factura F001 -> F006, y nuevo tipo "ticket"
-- ------------------------------------------------------------
create sequence if not exists ticket_numero_seq;

alter table comprobantes drop constraint comprobantes_tipo_check;
alter table comprobantes add constraint comprobantes_tipo_check
  check (tipo in ('factura', 'boleta', 'nota_venta', 'ticket'));

create or replace function comprobantes_generar_numero()
returns trigger as $$
begin
  if new.tipo = 'factura' then
    new.serie := 'F006';
    new.numero := 'F006-' || lpad(nextval('factura_numero_seq')::text, 6, '0');
  elsif new.tipo = 'boleta' then
    new.serie := 'B001';
    new.numero := 'B001-' || lpad(nextval('boleta_numero_seq')::text, 6, '0');
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

-- ------------------------------------------------------------
-- 2) Campos nuevos en comprobantes: fecha editable, días de crédito,
--    medio de pago, vendedor — igual que Cotizaciones.
-- ------------------------------------------------------------
alter table comprobantes add column if not exists fecha_emision date not null default current_date;
alter table comprobantes add column if not exists dias_credito text not null default 'Contado';
alter table comprobantes add column if not exists medio_pago text not null default 'Efectivo';
alter table comprobantes add column if not exists vendedor_id uuid references usuarios_perfil(id);

-- ------------------------------------------------------------
-- 3) Detalle de Nota de Crédito — para "Devolución por ítem": cuántas
--    unidades de cada producto se devuelven (no siempre el total vendido).
-- ------------------------------------------------------------
create table detalle_nota_credito (
  id bigserial primary key,
  nota_credito_id integer not null references notas_credito(id) on delete cascade,
  producto_id integer not null references productos(id) on delete restrict,
  cantidad numeric not null check (cantidad > 0),
  precio_unitario numeric not null check (precio_unitario >= 0)
);

create index idx_detalle_nc_nota on detalle_nota_credito(nota_credito_id);

alter table detalle_nota_credito enable row level security;

create policy "lectura autenticados" on detalle_nota_credito for select using (auth.role() = 'authenticated');

create policy "escritura ventas detalle_nota_credito insert" on detalle_nota_credito for insert
  with check (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol in ('admin', 'almacen', 'ventas')));
