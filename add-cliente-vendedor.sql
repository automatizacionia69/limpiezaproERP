-- Asigna un vendedor responsable a cada cliente, para que las cotizaciones
-- jalen automáticamente el vendedor al seleccionar el cliente.
alter table clientes
  add column if not exists vendedor_id uuid references usuarios_perfil(id) on delete set null;

create index if not exists idx_clientes_vendedor on clientes(vendedor_id);
