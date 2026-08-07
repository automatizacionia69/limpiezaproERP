-- ============================================================
-- Distribuidora LimpiezaPro — Interruptor de Lote/Vencimiento
-- Migración ADITIVA — no borra nada, segura de correr sobre datos reales.
-- Ejecutar en: Supabase → SQL Editor → New query
-- ============================================================

-- Este ERP se reutiliza como base para otros clientes (ver CLAUDE.md — es un
-- caso de estudio de portafolio). LimpiezaPro tiene rotación rápida de
-- insumos y no necesita lote/vencimiento por producto, pero otro rubro
-- (ej. un market con productos perecibles) sí. En vez de asumir uno u otro,
-- queda como un interruptor en Configuración — apagado por defecto.
alter table configuracion add column if not exists usa_lote_vencimiento boolean not null default false;
