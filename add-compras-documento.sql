-- Toda compra debe respaldarse con un documento del proveedor (Factura,
-- Boleta o Guía de Remisión): fecha de registro + tipo + serie + número.
alter table ordenes_compra add column if not exists fecha_registro date not null default current_date;
alter table ordenes_compra add column if not exists tipo_documento text not null default 'factura'
  check (tipo_documento in ('factura', 'boleta', 'guia_remision'));
alter table ordenes_compra add column if not exists documento_serie text;
alter table ordenes_compra add column if not exists documento_numero text;
