-- ============================================================
-- Distribuidora LimpiezaPro — Detalle de línea en Cotizaciones
-- Migración ADITIVA — no borra nada, segura de correr sobre datos reales.
-- Ejecutar en: Supabase → SQL Editor → New query
--
-- caracteristicas: nota/observación propia de esa línea de producto.
-- fecha_entrega: por línea (antes era solo a nivel de cotización completa).
-- unidad_nombre: texto plano (no FK) — congela la unidad tal como se
-- cotizó, aunque después cambie el catálogo de unidades_medida.
-- ============================================================

alter table detalle_cotizacion
  add column if not exists caracteristicas text,
  add column if not exists fecha_entrega date,
  add column if not exists unidad_nombre text;
