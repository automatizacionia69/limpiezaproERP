-- ============================================================
-- Distribuidora LimpiezaPro — Módulo de Facturación
-- Migración ADITIVA — no borra nada, seguro de correr sobre datos reales.
-- Ejecutar en: Supabase → SQL Editor → New query
--
-- No hay integración real con SUNAT (sin PSE/OSE) — esto es un
-- comprobante "local" para probar el flujo completo: Factura / Boleta /
-- Nota de Venta, con Notas de Crédito (algunas anulan la operación y
-- reversan stock, otras son solo un ajuste informativo) y Notas de
-- Débito (cargos adicionales sobre un comprobante ya emitido).
-- ============================================================

-- ------------------------------------------------------------
-- 1) COMPROBANTES (Factura / Boleta / Nota de Venta)
-- ------------------------------------------------------------
create sequence factura_numero_seq;
create sequence boleta_numero_seq;
create sequence nota_venta_numero_seq;

create table comprobantes (
  id serial primary key,
  tipo text not null check (tipo in ('factura', 'boleta', 'nota_venta')),
  serie text not null,
  numero text not null unique,
  orden_venta_id integer not null references ordenes_venta(id) on delete restrict,
  cliente_id integer not null references clientes(id) on delete restrict,
  usuario_id uuid references usuarios_perfil(id),
  subtotal numeric not null default 0,
  igv numeric not null default 0,
  total numeric not null default 0,
  estado text not null check (estado in ('emitido', 'anulado')) default 'emitido',
  creado_en timestamptz not null default now()
);

create index idx_comprobantes_orden on comprobantes(orden_venta_id);
create index idx_comprobantes_cliente on comprobantes(cliente_id);
create index idx_comprobantes_estado on comprobantes(estado);

create or replace function comprobantes_generar_numero()
returns trigger as $$
begin
  if new.tipo = 'factura' then
    new.serie := 'F001';
    new.numero := 'F001-' || lpad(nextval('factura_numero_seq')::text, 6, '0');
  elsif new.tipo = 'boleta' then
    new.serie := 'B001';
    new.numero := 'B001-' || lpad(nextval('boleta_numero_seq')::text, 6, '0');
  elsif new.tipo = 'nota_venta' then
    new.serie := 'NV01';
    new.numero := 'NV01-' || lpad(nextval('nota_venta_numero_seq')::text, 6, '0');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_comprobantes_numero before insert on comprobantes
for each row execute function comprobantes_generar_numero();

-- ------------------------------------------------------------
-- 2) NOTAS DE CRÉDITO (anulación total o ajuste sobre un comprobante)
-- ------------------------------------------------------------
create sequence nota_credito_numero_seq;

create table notas_credito (
  id serial primary key,
  numero text not null unique default ('NC01-' || lpad(nextval('nota_credito_numero_seq')::text, 6, '0')),
  comprobante_id integer not null references comprobantes(id) on delete restrict,
  motivo text not null,
  anula_operacion boolean not null default false,
  monto numeric not null default 0,
  observacion text,
  usuario_id uuid references usuarios_perfil(id),
  creado_en timestamptz not null default now()
);

create index idx_notas_credito_comprobante on notas_credito(comprobante_id);

-- ------------------------------------------------------------
-- 3) NOTAS DE DÉBITO (cargo adicional sobre un comprobante)
-- ------------------------------------------------------------
create sequence nota_debito_numero_seq;

create table notas_debito (
  id serial primary key,
  numero text not null unique default ('ND01-' || lpad(nextval('nota_debito_numero_seq')::text, 6, '0')),
  comprobante_id integer not null references comprobantes(id) on delete restrict,
  motivo text not null,
  monto numeric not null default 0,
  observacion text,
  usuario_id uuid references usuarios_perfil(id),
  creado_en timestamptz not null default now()
);

create index idx_notas_debito_comprobante on notas_debito(comprobante_id);

-- ------------------------------------------------------------
-- 4) ROW LEVEL SECURITY
-- ------------------------------------------------------------
alter table comprobantes enable row level security;
alter table notas_credito enable row level security;
alter table notas_debito enable row level security;

create policy "lectura autenticados" on comprobantes for select using (auth.role() = 'authenticated');
create policy "lectura autenticados" on notas_credito for select using (auth.role() = 'authenticated');
create policy "lectura autenticados" on notas_debito for select using (auth.role() = 'authenticated');

create policy "escritura ventas comprobantes insert" on comprobantes for insert
  with check (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol in ('admin', 'almacen', 'ventas')));
create policy "escritura ventas comprobantes update" on comprobantes for update
  using (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol in ('admin', 'almacen', 'ventas')));

create policy "escritura ventas notas_credito insert" on notas_credito for insert
  with check (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol in ('admin', 'almacen', 'ventas')));

create policy "escritura ventas notas_debito insert" on notas_debito for insert
  with check (exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.rol in ('admin', 'almacen', 'ventas')));
