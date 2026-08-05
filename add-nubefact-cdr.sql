-- ============================================================
-- Distribuidora LimpiezaPro — Enlace al CDR de NUBEFACT
-- Migracion ADITIVA — no borra nada, segura de correr sobre datos reales.
-- Ejecutar en: Supabase → SQL Editor → New query
-- (Correr DESPUES de add-nubefact.sql)
-- ============================================================

alter table comprobantes add column if not exists nubefact_enlace_cdr text;
