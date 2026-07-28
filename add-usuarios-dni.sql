-- ============================================================
-- Distribuidora LimpiezaPro — DNI y brevete en usuarios_perfil
-- Migración ADITIVA — no borra nada, seguro de correr sobre datos reales.
-- Ejecutar en: Supabase → SQL Editor → New query
-- ============================================================

alter table usuarios_perfil add column if not exists dni text;
alter table usuarios_perfil add column if not exists brevete text;
