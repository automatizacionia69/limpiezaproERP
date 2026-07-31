-- ============================================================
-- Distribuidora LimpiezaPro — Módulo de Cobranzas
-- Migración ADITIVA — no borra nada, segura de correr sobre datos reales.
-- Ejecutar en: Supabase → SQL Editor → New query
-- ============================================================

alter table comprobantes add column if not exists fecha_cobro timestamptz;
