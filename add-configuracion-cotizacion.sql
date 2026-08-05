-- ============================================================
-- Distribuidora LimpiezaPro — Datos de empresa para el formato de Cotización
-- Migración ADITIVA — no borra nada, segura de correr sobre datos reales.
-- Ejecutar en: Supabase → SQL Editor → New query
--
-- Todos nullable: si no se llenan, la cotización simplemente los muestra en
-- blanco (ver src/components/cotizacion-documento.tsx).
-- ============================================================

alter table configuracion
  add column if not exists titular text,
  add column if not exists yape text,
  add column if not exists cuenta_bcp_soles text,
  add column if not exists cci_bcp text,
  add column if not exists cuenta_bbva_soles text,
  add column if not exists cci_bbva text;
