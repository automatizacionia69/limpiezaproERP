-- ============================================================
-- Distribuidora LimpiezaPro — Guía de Remisión sin factura (traslado interno)
-- Migración ADITIVA — no borra nada, segura de correr sobre datos reales.
-- Ejecutar en: Supabase → SQL Editor → New query
-- ============================================================

-- Hasta ahora toda guía nacía junto con un comprobante (Facturar). Para el
-- caso "traslado entre almacenes propios del cliente, sin venta" la guía
-- necesita poder existir SOLA, sin comprobante.
alter table guias_remision alter column comprobante_id drop not null;

alter table guias_remision add column if not exists motivo text not null default 'Venta';

-- Solo se usa cuando comprobante_id es null: los productos/cantidades de la
-- guía se ingresan a mano (una venta sigue sacando sus líneas de
-- detalle_venta vía el comprobante, como siempre).
create table detalle_guia_remision (
  id serial primary key,
  guia_id integer not null references guias_remision(id) on delete cascade,
  producto_id integer not null references productos(id) on delete restrict,
  cantidad numeric not null check (cantidad > 0)
);

create index idx_detalle_guia_remision_guia on detalle_guia_remision(guia_id);

alter table detalle_guia_remision enable row level security;

create policy "lectura autenticados" on detalle_guia_remision for select using (auth.role() = 'authenticated');

create policy "escritura ventas detalle_guia_remision insert" on detalle_guia_remision for insert
  with check (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol in ('admin', 'almacen', 'ventas')));
