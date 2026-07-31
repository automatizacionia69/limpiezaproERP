-- ============================================================
-- Distribuidora LimpiezaPro — Politicas RLS alineadas a usuarios_permisos
-- Migración ADITIVA — no borra datos, solo reemplaza políticas de escritura.
-- Ejecutar en: Supabase → SQL Editor → New query → Run
--
-- NOTA: este cambio TODAVÍA NO ESTÁ APLICADO en producción. Se diseñó y
-- verificó en la sesión del 2026-07-31 (confirmado contra los datos reales:
-- ningún usuario no-admin escribió jamás en movimientos, ordenes_compra,
-- ordenes_venta, comprobantes o cotizaciones — todo el uso real fue con
-- cuenta admin, así que este cambio no interrumpe ningún flujo en uso), pero
-- la aplicación quedó bloqueada por el permiso de herramientas de la sesión
-- de Claude Code (migraciones DDL grandes sobre producción requieren
-- correrse a mano). Correr este archivo completo, de una sola vez, en el
-- SQL Editor para aplicarlo.
--
-- Qué hace: hasta ahora las políticas RLS de escritura solo miraban el ROL
-- del usuario (admin/almacen/ventas), sin considerar la tabla
-- usuarios_permisos que la app ya usa para decidir, módulo por módulo, qué
-- puede tocar cada usuario no-admin. Eso dejaba dos huecos:
--   1. Seguridad: a un usuario al que el admin le quita un módulo, la base
--      de datos igual le permitía escribir en esa tabla con su propio JWT
--      (sin pasar por la UI de Next.js), porque RLS solo exigía el rol.
--   2. Funcional: a un usuario al que el admin le DA un módulo que su rol
--      no trae "de fábrica" (ej. un vendedor con el módulo Productos
--      activado), la app lo dejaba pasar pero la base de datos lo
--      rechazaba igual, porque RLS seguía exigiendo rol admin/almacen sin
--      mirar el permiso real.
--
-- tiene_permiso_modulo(modulo) pasa a ser la única fuente de verdad: admin
-- siempre pasa, cualquier otro rol necesita el módulo activo en
-- usuarios_permisos. Reemplaza los arrays de rol en cada política de
-- escritura, tabla por tabla. No toca las políticas de lectura (siguen
-- abiertas a cualquier autenticado) ni las de almacenes/zonas (siguen
-- exclusivas de admin — no tienen un módulo propio en la app todavía).
-- El chatbot de WhatsApp no se ve afectado: escribe clientes/cotizaciones
-- con la clave de servicio (service_role), que no pasa por RLS.
-- ============================================================

create or replace function public.tiene_permiso_modulo(p_modulo text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    exists (
      select 1 from usuarios_perfil up
      where up.id = auth.uid() and up.rol = 'admin'
    )
    or exists (
      select 1 from usuarios_permisos p
      where p.usuario_id = auth.uid() and p.modulo = p_modulo and p.activo = true
    );
$$;

-- productos (modulo: productos)
drop policy if exists "escritura admin_almacen productos insert" on productos;
create policy "escritura admin_almacen productos insert" on productos for insert
  with check (public.tiene_permiso_modulo('productos'));

drop policy if exists "escritura admin_almacen productos update" on productos;
create policy "escritura admin_almacen productos update" on productos for update
  using (public.tiene_permiso_modulo('productos'));

drop policy if exists "escritura admin_almacen productos delete" on productos;
create policy "escritura admin_almacen productos delete" on productos for delete
  using (public.tiene_permiso_modulo('productos'));

-- categorias (modulo: productos) — antes admin-only ALL
drop policy if exists "escritura admin categorias" on categorias;
create policy "escritura admin categorias" on categorias for all
  using (public.tiene_permiso_modulo('productos'))
  with check (public.tiene_permiso_modulo('productos'));

-- unidades_medida (modulo: productos) — antes admin-only ALL
drop policy if exists "escritura admin unidades_medida" on unidades_medida;
create policy "escritura admin unidades_medida" on unidades_medida for all
  using (public.tiene_permiso_modulo('productos'))
  with check (public.tiene_permiso_modulo('productos'));

-- movimientos (modulo: movimientos) — solo insert (ledger append-only)
drop policy if exists "escritura admin_almacen movimientos" on movimientos;
create policy "escritura admin_almacen movimientos" on movimientos for insert
  with check (public.tiene_permiso_modulo('movimientos'));

-- ordenes_compra / detalle_compra (modulo: compras)
drop policy if exists "escritura admin_almacen ordenes_compra insert" on ordenes_compra;
create policy "escritura admin_almacen ordenes_compra insert" on ordenes_compra for insert
  with check (public.tiene_permiso_modulo('compras'));

drop policy if exists "escritura admin_almacen ordenes_compra update" on ordenes_compra;
create policy "escritura admin_almacen ordenes_compra update" on ordenes_compra for update
  using (public.tiene_permiso_modulo('compras'));

drop policy if exists "escritura admin_almacen ordenes_compra delete" on ordenes_compra;
create policy "escritura admin_almacen ordenes_compra delete" on ordenes_compra for delete
  using (public.tiene_permiso_modulo('compras'));

drop policy if exists "escritura admin_almacen detalle_compra insert" on detalle_compra;
create policy "escritura admin_almacen detalle_compra insert" on detalle_compra for insert
  with check (public.tiene_permiso_modulo('compras'));

drop policy if exists "escritura admin_almacen detalle_compra update" on detalle_compra;
create policy "escritura admin_almacen detalle_compra update" on detalle_compra for update
  using (public.tiene_permiso_modulo('compras'));

drop policy if exists "escritura admin_almacen detalle_compra delete" on detalle_compra;
create policy "escritura admin_almacen detalle_compra delete" on detalle_compra for delete
  using (public.tiene_permiso_modulo('compras'));

-- proveedores (modulo: proveedores)
drop policy if exists "escritura admin_almacen proveedores insert" on proveedores;
create policy "escritura admin_almacen proveedores insert" on proveedores for insert
  with check (public.tiene_permiso_modulo('proveedores'));

drop policy if exists "escritura admin_almacen proveedores update" on proveedores;
create policy "escritura admin_almacen proveedores update" on proveedores for update
  using (public.tiene_permiso_modulo('proveedores'));

drop policy if exists "escritura admin_almacen proveedores delete" on proveedores;
create policy "escritura admin_almacen proveedores delete" on proveedores for delete
  using (public.tiene_permiso_modulo('proveedores'));

-- ordenes_venta / detalle_venta (modulo: ventas)
drop policy if exists "escritura ventas ordenes_venta insert" on ordenes_venta;
create policy "escritura ventas ordenes_venta insert" on ordenes_venta for insert
  with check (public.tiene_permiso_modulo('ventas'));

drop policy if exists "escritura ventas ordenes_venta update" on ordenes_venta;
create policy "escritura ventas ordenes_venta update" on ordenes_venta for update
  using (public.tiene_permiso_modulo('ventas'));

drop policy if exists "escritura ventas ordenes_venta delete" on ordenes_venta;
create policy "escritura ventas ordenes_venta delete" on ordenes_venta for delete
  using (public.tiene_permiso_modulo('ventas'));

drop policy if exists "escritura ventas detalle_venta insert" on detalle_venta;
create policy "escritura ventas detalle_venta insert" on detalle_venta for insert
  with check (public.tiene_permiso_modulo('ventas'));

drop policy if exists "escritura ventas detalle_venta update" on detalle_venta;
create policy "escritura ventas detalle_venta update" on detalle_venta for update
  using (public.tiene_permiso_modulo('ventas'));

drop policy if exists "escritura ventas detalle_venta delete" on detalle_venta;
create policy "escritura ventas detalle_venta delete" on detalle_venta for delete
  using (public.tiene_permiso_modulo('ventas'));

-- comprobantes: insert -> ventas (emitirComprobante), update -> consulta_ventas
-- (anularComprobante) O cobranzas (marcarCobrada, modulo agregado en paralelo
-- a esta migracion — ver cobranzas/actions.ts)
drop policy if exists "escritura ventas comprobantes insert" on comprobantes;
create policy "escritura ventas comprobantes insert" on comprobantes for insert
  with check (public.tiene_permiso_modulo('ventas'));

drop policy if exists "escritura ventas comprobantes update" on comprobantes;
create policy "escritura ventas comprobantes update" on comprobantes for update
  using (
    public.tiene_permiso_modulo('consulta_ventas')
    or public.tiene_permiso_modulo('cobranzas')
  );

-- guias_remision: insert -> ventas (se genera sola al facturar), update -> guias_remision (edicion manual)
drop policy if exists "escritura ventas guias_remision insert" on guias_remision;
create policy "escritura ventas guias_remision insert" on guias_remision for insert
  with check (public.tiene_permiso_modulo('ventas'));

drop policy if exists "escritura ventas guias_remision update" on guias_remision;
create policy "escritura ventas guias_remision update" on guias_remision for update
  using (public.tiene_permiso_modulo('guias_remision'));

-- cotizaciones / detalle_cotizacion (modulo: cotizaciones)
drop policy if exists "escritura ventas cotizaciones insert" on cotizaciones;
create policy "escritura ventas cotizaciones insert" on cotizaciones for insert
  with check (public.tiene_permiso_modulo('cotizaciones'));

drop policy if exists "escritura ventas cotizaciones update" on cotizaciones;
create policy "escritura ventas cotizaciones update" on cotizaciones for update
  using (public.tiene_permiso_modulo('cotizaciones'));

drop policy if exists "escritura ventas cotizaciones delete" on cotizaciones;
create policy "escritura ventas cotizaciones delete" on cotizaciones for delete
  using (public.tiene_permiso_modulo('cotizaciones'));

drop policy if exists "escritura ventas detalle_cotizacion insert" on detalle_cotizacion;
create policy "escritura ventas detalle_cotizacion insert" on detalle_cotizacion for insert
  with check (public.tiene_permiso_modulo('cotizaciones'));

drop policy if exists "escritura ventas detalle_cotizacion delete" on detalle_cotizacion;
create policy "escritura ventas detalle_cotizacion delete" on detalle_cotizacion for delete
  using (public.tiene_permiso_modulo('cotizaciones'));

-- clientes (modulo: clientes) — el chatbot escribe via service_role y no pasa por RLS, sin impacto ahi
drop policy if exists "escritura admin_almacen clientes insert" on clientes;
create policy "escritura admin_almacen clientes insert" on clientes for insert
  with check (public.tiene_permiso_modulo('clientes'));

drop policy if exists "escritura admin_almacen clientes update" on clientes;
create policy "escritura admin_almacen clientes update" on clientes for update
  using (public.tiene_permiso_modulo('clientes'));

drop policy if exists "escritura admin_almacen clientes delete" on clientes;
create policy "escritura admin_almacen clientes delete" on clientes for delete
  using (public.tiene_permiso_modulo('clientes'));

-- notas_credito / notas_debito / detalle_nota_credito (modulo: consulta_ventas)
drop policy if exists "escritura ventas notas_credito insert" on notas_credito;
create policy "escritura ventas notas_credito insert" on notas_credito for insert
  with check (public.tiene_permiso_modulo('consulta_ventas'));

drop policy if exists "escritura ventas notas_debito insert" on notas_debito;
create policy "escritura ventas notas_debito insert" on notas_debito for insert
  with check (public.tiene_permiso_modulo('consulta_ventas'));

drop policy if exists "escritura ventas detalle_nota_credito insert" on detalle_nota_credito;
create policy "escritura ventas detalle_nota_credito insert" on detalle_nota_credito for insert
  with check (public.tiene_permiso_modulo('consulta_ventas'));
