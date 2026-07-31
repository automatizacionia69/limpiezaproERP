-- ============================================================
-- Distribuidora LimpiezaPro — Preservar días de crédito de la cotización
-- Migración ADITIVA — no borra nada, segura de correr sobre datos reales.
-- Ejecutar en: Supabase → SQL Editor → New query
--
-- Bug: al convertir una cotización a venta, dias_credito no se copiaba a
-- ordenes_venta (esa tabla no tenía la columna), así que al facturar
-- siempre se perdía y arrancaba en "Contado" sin importar lo cotizado.
-- ============================================================

alter table ordenes_venta add column if not exists dias_credito text;
