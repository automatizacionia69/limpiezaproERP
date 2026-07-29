-- Guía de Remisión: se genera automáticamente al emitir un comprobante de
-- venta (Facturar), con serie T006 y correlativo propio. Editable después
-- (dirección de despacho, fecha, número) desde su propio módulo.
create sequence if not exists guia_remision_numero_seq;

create table guias_remision (
  id serial primary key,
  numero text not null unique default ('T006-' || lpad(nextval('guia_remision_numero_seq')::text, 6, '0')),
  comprobante_id integer not null references comprobantes(id) on delete restrict,
  fecha date not null default current_date,
  direccion_despacho text,
  observacion text,
  usuario_id uuid references usuarios_perfil(id),
  creado_en timestamptz not null default now()
);

create index idx_guias_remision_comprobante on guias_remision(comprobante_id);

alter table guias_remision enable row level security;

create policy "lectura autenticados" on guias_remision for select using (auth.role() = 'authenticated');

create policy "escritura ventas guias_remision insert" on guias_remision for insert
  with check (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol in ('admin', 'almacen', 'ventas')));
create policy "escritura ventas guias_remision update" on guias_remision for update
  using (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol in ('admin', 'almacen', 'ventas')));
