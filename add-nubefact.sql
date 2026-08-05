-- ============================================================
-- Distribuidora LimpiezaPro — Integracion NUBEFACT (OSE, facturacion
-- electronica SUNAT real) sobre comprobantes existentes.
-- Migracion ADITIVA — no borra nada, segura de correr sobre datos reales.
-- Ejecutar en: Supabase → SQL Editor → New query
--
-- Solo Factura y Boleta se envian a NUBEFACT (Nota de venta y Ticket no son
-- documentos SUNAT). nubefact_estado arranca 'no_aplica' para esos dos tipos
-- via el valor por defecto + el codigo que solo llama a NUBEFACT para
-- factura/boleta; se deja 'pendiente' como default generico y el codigo
-- decide si lo intenta o no.
-- ============================================================

alter table comprobantes add column if not exists nubefact_estado text
  not null default 'pendiente'
  check (nubefact_estado in ('pendiente', 'enviado', 'error', 'no_aplica'));
alter table comprobantes add column if not exists nubefact_enlace text;
alter table comprobantes add column if not exists nubefact_enlace_pdf text;
alter table comprobantes add column if not exists nubefact_enlace_xml text;
alter table comprobantes add column if not exists nubefact_codigo_hash text;
alter table comprobantes add column if not exists nubefact_error text;
alter table comprobantes add column if not exists nubefact_enviado_en timestamptz;
