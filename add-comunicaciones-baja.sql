-- ============================================================
-- Distribuidora LimpiezaPro — Comunicación de Baja (anulación de comprobantes)
-- Migración ADITIVA — no borra nada, segura de correr sobre datos reales.
-- Ejecutar en: Supabase → SQL Editor → New query
-- ============================================================

-- Registro del paso "Comunicación de Baja" que se pide al anular un
-- comprobante completo (motivos que anulan la operación, ver
-- MOTIVOS_NOTA_CREDITO en src/lib/motivos.ts) — no se genera para notas de
-- crédito parciales, solo para anulación total. Queda como historial
-- independiente de la nota de crédito que la acompaña.
create table comunicaciones_baja (
  id serial primary key,
  comprobante_id integer not null references comprobantes(id) on delete restrict,
  nota_credito_id integer references notas_credito(id) on delete set null,
  numero_documento text not null,
  fecha_documento date not null,
  comentario text not null,
  usuario_id uuid references usuarios_perfil(id),
  creado_en timestamptz not null default now()
);

create index idx_comunicaciones_baja_comprobante on comunicaciones_baja(comprobante_id);

alter table comunicaciones_baja enable row level security;

create policy "lectura autenticados" on comunicaciones_baja for select using (auth.role() = 'authenticated');

create policy "escritura ventas comunicaciones_baja insert" on comunicaciones_baja for insert
  with check (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol in ('admin', 'almacen', 'ventas')));
