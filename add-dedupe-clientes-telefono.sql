-- ============================================================
-- Distribuidora LimpiezaPro — Deduplicacion de clientes por telefono
-- Migracion ADITIVA — no borra datos. Verificado antes de escribir esto:
-- cero numeros duplicados en los datos actuales, asi que el indice unico
-- se puede crear sin limpieza previa.
-- Ejecutar en: Supabase -> SQL Editor -> New query -> Run
--
-- NOTA: este cambio TODAVIA NO ESTA APLICADO en produccion -- quedo
-- bloqueado por el permiso de herramientas de la sesion de Claude Code
-- (migraciones DDL grandes sobre produccion requieren correrse a mano).
--
-- Que resuelve: el chatbot de WhatsApp (lib/whatsapp/proforma.ts,
-- obtenerOCrearCliente) buscaba coincidencia de telefono trayendo TODOS los
-- clientes y comparando en memoria -- funcional, pero con una ventana de
-- carrera: si dos mensajes del mismo cliente llegan casi al mismo tiempo (y
-- Vercel los procesa en dos instancias serverless distintas, que no
-- comparten memoria), ninguna de las dos ve el insert de la otra, y se crea
-- un cliente Y una cotizacion duplicados.
--
-- Esta migracion agrega una columna telefono_normalizado (solo digitos, sin
-- prefijo de pais) con un TRIGGER que la mantiene sincronizada sola en cada
-- insert/update de `telefono` -- asi tambien corrige los telefonos que carga
-- el ERP a mano, no solo los del chatbot -- y un INDICE UNICO parcial sobre
-- esa columna, para que sea la base de datos, no la aplicacion, la que
-- impide el duplicado.
--
-- La funcion obtener_o_crear_cliente_por_telefono() resuelve "buscar o
-- crear" en una sola sentencia atomica (INSERT ... ON CONFLICT ... DO
-- UPDATE con un update no-op, solo para poder hacer RETURNING del id
-- existente) -- sin ventana de carrera, y sin pisar el nombre de un cliente
-- que ya existe (importante: si un admin corrigio el nombre a mano en el
-- ERP, un upsert comun lo hubiera vuelto a sobreescribir con el nombre de
-- perfil de WhatsApp en el siguiente mensaje).
--
-- El chatbot ya fue actualizado (lib/whatsapp/proforma.ts) para llamar a
-- esta funcion via supabaseAdmin.rpc() en vez de traer-y-comparar en
-- memoria -- ese cambio de codigo ya esta aplicado, solo falta correr este
-- SQL para que la funcion exista en la base.
-- ============================================================

alter table clientes add column if not exists telefono_normalizado text;

create or replace function public.clientes_normalizar_telefono()
returns trigger
language plpgsql
as $$
declare
  v_digitos text;
begin
  if new.telefono is null then
    new.telefono_normalizado := null;
    return new;
  end if;

  v_digitos := regexp_replace(new.telefono, '\D', '', 'g');
  if length(v_digitos) > 9 and left(v_digitos, 2) = '51' then
    v_digitos := substring(v_digitos from 3);
  end if;

  new.telefono_normalizado := nullif(v_digitos, '');
  return new;
end;
$$;

drop trigger if exists clientes_normalizar_telefono_trigger on clientes;
create trigger clientes_normalizar_telefono_trigger
  before insert or update of telefono on clientes
  for each row execute function public.clientes_normalizar_telefono();

-- Backfill de las filas existentes: dispara el trigger de arriba con un
-- UPDATE que no cambia ningun valor real (solo para que corra la funcion).
update clientes set telefono = telefono where telefono is not null;

create unique index if not exists clientes_telefono_normalizado_unico
  on clientes (telefono_normalizado)
  where telefono_normalizado is not null;

create or replace function public.obtener_o_crear_cliente_por_telefono(
  p_telefono text,
  p_nombre text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id integer;
begin
  insert into clientes (nombre, telefono)
  values (p_nombre, p_telefono)
  on conflict (telefono_normalizado)
  do update set telefono = clientes.telefono -- no-op: solo para que RETURNING traiga el id existente sin tocar el nombre
  returning id into v_id;

  return v_id;
end;
$$;

-- El chatbot llama a esta funcion via supabaseAdmin (service_role), que
-- bypassea RLS igual que hoy -- no hace falta ningun grant/policy adicional.
