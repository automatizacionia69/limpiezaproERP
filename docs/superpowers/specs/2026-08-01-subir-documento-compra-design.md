# Diseño: Botón "Subir imagen o PDF" en Nueva Orden de Compra (v1)

## Contexto

La idea de fondo es que, a futuro, el usuario pueda subir una foto o PDF de
la factura/boleta del proveedor y una IA (Gemini) lea el documento y
autocomplete los campos de la orden de compra (fecha, tipo/serie/número de
documento, productos, cantidades, precios y total). Esa integración con
Gemini la está construyendo un compañero por separado, en otro momento.

Este documento cubre **solo la parte de UI**: el botón para seleccionar una
imagen o PDF, su preview y el aviso de que la IA puede equivocarse. No
incluye subida a Storage, Server Actions, llamadas a IA, ni ningún
autocompletado de los demás campos del formulario — eso queda fuera de
alcance a propósito, para que el compañero lo conecte después sin depender
de decisiones tomadas aquí.

## Decisiones de diseño

### 1. Componente nuevo y aislado, no se mezcla con `NuevaCompraForm`

Se crea `src/app/(protected)/compras/nueva/subir-documento-compra.tsx`,
un client component con su propio estado local (`useState<File | null>`,
estado de error de validación). `NuevaCompraForm` lo renderiza como primer
elemento del formulario, pero no le pasa props ni lee nada de él.

**Por qué:** el compañero que conecte Gemini más adelante debe poder abrir
un solo archivo pequeño y enganchar su lógica ahí (leer el `File`, llamarlo
a Gemini, y recién ahí decidir cómo pasar los datos extraídos al resto del
formulario), sin tener que entender ni tocar `NuevaCompraForm` completo.

### 2. El archivo no se envía en el submit del formulario

No hay `<input type="hidden">` ni el archivo viaja dentro de `lineasJson`
ni de ningún campo del `FormData` que consume `crearOrdenCompra`. Es UI
inerte: seleccionar un archivo hoy no cambia el comportamiento de guardado
de la orden.

**Por qué:** conectar el archivo al submit real implicaría decidir ahora
dónde se persiste (Storage, bucket, política RLS) y eso es justo lo que el
usuario pidió dejar fuera ("solo quiero el botón y el input de archivo por
ahora").

### 3. Ubicación: primer bloque del formulario, antes de Proveedor/Fecha

Va arriba de todo dentro de la tarjeta de "nueva orden", como el primer
paso visual del flujo — aunque hoy no autocompleta nada, la idea a futuro
es "sube la foto primero, después revisa/completa", así que se posiciona
donde quedará ese flujo.

### 4. Validación de archivo, solo en cliente

- `accept="image/*,application/pdf"` en el input.
- Tipo no soportado o tamaño > 10MB → mensaje de error inline dentro del
  mismo componente (no bloquea ni afecta el resto del form).
- Sin validación de servidor: no hay ningún envío a servidor todavía.

### 5. Preview según tipo de archivo

- Imagen: thumbnail (`URL.createObjectURL`) dentro de la tarjeta.
- PDF: ícono de documento + nombre de archivo + tamaño (sin preview de
  contenido).
- Botón "×" para quitar el archivo seleccionado y volver al estado vacío
  (dropzone).

### 6. Aviso de la IA, siempre visible

Debajo del dropzone/preview, un texto fijo en una cajita ámbar (mismo
patrón visual que las cajitas de error rojas ya existentes en el form, pero
en amarillo/ámbar):

> ⚠️ La IA puede equivocarse — revisa los datos manualmente antes de guardar.

Se muestra siempre, haya o no archivo seleccionado, para dejar la
expectativa clara desde el inicio.

## Fuera de alcance (explícito)

- Subida a Supabase Storage.
- Cualquier Server Action de procesamiento (`procesarDocumentoCompra` o
  similar) — no se crea ni siquiera como stub, para no imponerle una forma
  al compañero que construya la parte de Gemini.
- Autocompletado de Proveedor, Fecha, Tipo/Serie/Número o líneas de
  productos.
- Soporte multi-archivo (una sola factura por selección).
