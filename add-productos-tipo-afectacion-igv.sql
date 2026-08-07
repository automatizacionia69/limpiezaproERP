-- add-productos-tipo-afectacion-igv.sql
-- ============================================================
-- Distribuidora LimpiezaPro — Tipo de afectación IGV por producto
-- Migración ADITIVA — no borra nada, segura de correr sobre datos reales.
-- Ejecutar en: Supabase → SQL Editor → New query
--
-- Códigos válidos (catálogo curado, ver src/lib/afectacion-igv.ts):
-- '10' Gravado-Operación Onerosa (default), '12' Gravado-Retiro por
-- donación, '15' Gravado-Bonificaciones, '20' Exonerado-Operación
-- Onerosa, '30' Inafecto-Operación Onerosa.
--
-- productos.tipo_afectacion_igv: clasificación vigente del producto, se
-- puede reclasificar en cualquier momento desde Editar producto.
--
-- detalle_cotizacion/detalle_venta/detalle_compra.tipo_afectacion_igv:
-- "foto" de esa clasificación al momento de agregar la línea — mismo
-- patrón que unidad_nombre (add-detalle-cotizacion-mejoras.sql). Si el
-- producto se reclasifica después, los documentos ya emitidos no cambian.
--
-- Los ~140 productos existentes quedan en '10' (Gravado 18%) automático
-- por el default — es el caso real de casi todo el inventario; decisión
-- explícita del usuario, ver docs/superpowers/specs/2026-08-07-tipo-
-- afectacion-igv-design.md.
-- ============================================================

alter table productos
  add column if not exists tipo_afectacion_igv text not null default '10';

alter table detalle_cotizacion
  add column if not exists tipo_afectacion_igv text not null default '10';

alter table detalle_venta
  add column if not exists tipo_afectacion_igv text not null default '10';

alter table detalle_compra
  add column if not exists tipo_afectacion_igv text not null default '10';
