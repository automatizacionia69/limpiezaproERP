-- ============================================================
-- Distribuidora LimpiezaPro — Permitir stock negativo en salidas
-- Migración ADITIVA — no borra nada, seguro de correr sobre datos reales.
-- Ejecutar en: Supabase → SQL Editor → New query
--
-- Antes: una 'salida' (venta/factura, movimiento manual) se bloqueaba si
-- excedía el stock disponible ("Stock insuficiente"). A pedido del
-- usuario, ahora se permite: si vendes más de lo que tienes, el stock
-- queda en negativo (ej. 0 - 50 = -50), y se recupera normalmente al
-- registrar una entrada (compra) posterior (ej. -50 + 60 = 10).
-- ============================================================

create or replace function aplicar_movimiento()
returns trigger as $$
declare
  v_producto productos%rowtype;
  v_nuevo_costo numeric;
begin
  select * into v_producto from productos where id = new.producto_id for update;

  if not found then
    raise exception 'Producto % no existe', new.producto_id;
  end if;

  if new.tipo = 'entrada' then
    if new.costo_unitario is null then
      raise exception 'costo_unitario es obligatorio para movimientos de tipo entrada';
    end if;

    if (v_producto.cantidad + new.cantidad) = 0 then
      v_nuevo_costo := new.costo_unitario;
    elsif v_producto.cantidad < 0 then
      -- Venía en stock negativo (se vendió sin tener) — al reponer, el
      -- costo pasa a ser directamente el de esta compra (no se puede
      -- promediar contra unidades que no existían físicamente).
      v_nuevo_costo := new.costo_unitario;
    else
      v_nuevo_costo := ((v_producto.cantidad * v_producto.costo) + (new.cantidad * new.costo_unitario))
                        / (v_producto.cantidad + new.cantidad);
    end if;

    new.efecto_cantidad := new.cantidad;

    update productos
      set cantidad = v_producto.cantidad + new.cantidad,
          costo = v_nuevo_costo,
          actualizado_en = now()
      where id = new.producto_id;

  elsif new.tipo = 'salida' then
    -- Sin restricción de stock suficiente: se permite que quede negativo.
    new.costo_unitario := v_producto.costo;
    new.efecto_cantidad := -new.cantidad;

    update productos
      set cantidad = v_producto.cantidad - new.cantidad,
          actualizado_en = now()
      where id = new.producto_id;

  elsif new.tipo = 'ajuste' then
    -- cantidad es el VALOR ABSOLUTO nuevo (conteo fisico real), igual que hoy.
    -- efecto_cantidad se calcula aqui como el delta real, solo para el kardex.
    new.costo_unitario := v_producto.costo;
    new.efecto_cantidad := new.cantidad - v_producto.cantidad;

    update productos
      set cantidad = new.cantidad,
          actualizado_en = now()
      where id = new.producto_id;
  end if;

  return new;
end;
$$ language plpgsql;
