-- add-detalle-nota-credito-tipo-afectacion-igv.sql
-- ============================================================
-- Distribuidora LimpiezaPro — Tipo de afectación IGV en detalle de Notas de Crédito
-- Migración ADITIVA — no borra nada, segura de correr sobre datos reales.
-- Ejecutar en: Supabase → SQL Editor → New query
--
-- Hallazgo de la revisión final del feature de tipo_afectacion_igv: el
-- Reporte de ventas por producto (Consulta de Ventas > Reporte ventas por
-- producto) desglosa Subtotal/IGV por línea de nota de crédito, y sin esta
-- columna no tenía cómo saber si esa línea era Gravada o no — quedaba
-- asumiendo 18% siempre. detalle_venta ya tiene esta misma columna desde
-- add-productos-tipo-afectacion-igv.sql; esta migración le da paridad a
-- detalle_nota_credito.
-- ============================================================

alter table detalle_nota_credito
  add column if not exists tipo_afectacion_igv text not null default '10';
