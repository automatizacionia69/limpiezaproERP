# Diseño: Modal de éxito de Cotización — rediseño visual + envío directo por correo y WhatsApp (v1)

## Contexto

Hoy, al guardar una cotización, aparece un modal de éxito con tres acciones
estáticas: ver/descargar PDF, un link `mailto:` (abre Gmail/Outlook local) y
un link a WhatsApp Web (solo prellena el número si el cliente lo tiene
guardado). El usuario pidió tres cambios sobre ese modal:

1. Que se vea más bonito/vistoso.
2. Que el bloque de WhatsApp tenga un input editable para el número (el
   botón se achica y el input va al costado), y que al hacer clic se abra
   el chat de ese número con el mensaje ya escrito, listo para dar Enter.
   **Aclaración importante ya conversada con el usuario:** WhatsApp Web no
   permite adjuntar un archivo automáticamente vía link — solo puede
   prellenar texto. El mensaje llevará un link a la cotización online en
   vez del PDF adjunto; adjuntar el archivo real seguirá siendo un paso
   manual del usuario (no se automatiza).
3. Que el correo se envíe directo desde el servidor (sin abrir Gmail ni
   Outlook), con destinatario/asunto/cuerpo editables antes de enviar.

Contexto de negocio relevante: este ERP es un producto que el usuario
piensa revender a distintos clientes, cada uno con su propio despliegue.
Por eso el envío de correo se resolvió como SMTP genérico configurado por
variables de entorno (Gmail con "contraseña de aplicación" por ahora, pero
sirve igual para Outlook u otro proveedor SMTP) — cada despliegue usa sus
propias credenciales, nada queda hardcodeado a la cuenta del usuario.

## Decisiones de diseño

### 1. Alcance: solo el modal de éxito de Cotizaciones

Se modifica únicamente `src/app/(protected)/cotizaciones/nueva/nueva-cotizacion-form.tsx`
(el modal que aparece tras `estado.exito`). No se toca ningún modal
parecido que pueda existir en Ventas, Guías de remisión u otros módulos.

**Por qué:** es lo que se pidió y lo que se mostró en la captura de
pantalla. Replicar el patrón en otros módulos es una decisión aparte que
el usuario puede pedir después, ya con este patrón validado en producción.

### 2. Envío de correo: Server Action + `nodemailer` con SMTP genérico

Nueva Server Action `enviarCorreoCotizacion(destinatario, asunto, cuerpo)`
en `src/app/(protected)/cotizaciones/actions.ts`. Usa `nodemailer` (se
agrega como dependencia nueva) con un transporte SMTP construido desde
variables de entorno:

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

La action es deliberadamente "tonta": recibe el destinatario/asunto/cuerpo
ya armados (y editados a mano si el usuario quiso) desde el modal, y solo
los transporta por correo. No arma plantillas ni valida formato de email
más allá de lo que ya exige el `<input type="email">` del navegador.

**Por qué:** mantiene toda la lógica de "contenido editable por cliente"
en el estado del modal (un solo lugar), sin duplicar una plantilla en el
servidor que se desincronice de lo que el usuario ve y edita en pantalla.

### 3. Estado nuevo dentro del mismo componente del modal

Se agregan `useState` locales en `nueva-cotizacion-form.tsx` (no un
componente aparte, para no fragmentar más un archivo que ya mezcla mucho
estado — si durante la implementación el bloque del modal crece demasiado,
extraer un `ModalExitoCotizacion` queda a criterio de quien implemente):

- `correoDestino`, `correoAsunto`, `correoCuerpo` — precargados al abrirse
  el modal con `clienteSeleccionado?.email`, `Cotización {numero}` y
  `mensajeCompartirCotizacion` + link a `/cotizaciones/{id}`.
- `telefonoWhatsapp` — precargado con el teléfono del cliente (solo
  dígitos), editable.
- Estado de envío de correo: `'idle' | 'enviando' | 'enviado' | 'error'`,
  disparado con `useTransition` al llamar la Server Action. El modal
  **no se cierra ni redirige** al enviar correo — solo muestra el estado
  inline junto al botón.

### 4. Bloque WhatsApp: input + botón reducido

Input de texto junto al botón (que se achica, solo ícono o ícono + texto
corto). Al hacer clic:

- Se limpia el input de todo lo que no sea dígito.
- Si quedan 9 dígitos y no empiezan con `51`, se antepone `51`
  automáticamente (celular peruano sin código de país).
- Se arma `https://web.whatsapp.com/send?phone={numero}&text={mensaje}`
  con el mensaje ya cargado (saludo + link a la cotización) y se abre en
  pestaña nueva.

El número usado es **el que esté en el input en ese momento**, no
necesariamente el guardado del cliente — el usuario puede sobrescribirlo
antes de enviar.

### 5. Rediseño visual del modal

- Franja superior con degradado sutil (p.ej. `emerald-50` → `sky-50`,
  y su equivalente oscuro) detrás del círculo del check, con una animación
  de entrada (`scale` + `opacity`, una sola vez al montar el modal — no
  ligada a hover, para no contradecir el rediseño de botones ya hecho en
  toda la app donde se quitó la animación de hover).
- Las tres acciones dejan de ser botones apilados sueltos y pasan a filas
  de acción con un ícono dentro de un círculo de color (azul para PDF,
  gris/slate para correo, verde para WhatsApp), manteniendo
  `rounded-md` y `active:scale-95` al clic, sin hover-lift nuevo.
- Los inputs de correo (destinatario/asunto/cuerpo) y de WhatsApp
  (teléfono) van integrados dentro de la misma tarjeta de su acción
  respectiva, no como campos sueltos aparte del botón.

### 6. Variables de entorno nuevas

`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` —
se documentan en `.env.local.example` y en `CLAUDE.md`. Cada cliente que
compre el ERP configura las suyas al desplegar; no hay ninguna cuenta de
correo hardcodeada en el código.

### 7. Manejo de errores de correo

Si el SMTP no está configurado o el envío falla, el modal muestra un
mensaje de error inline junto al botón de correo (mismo patrón visual que
las cajitas de error rojas que ya usa el resto del formulario) y deja el
botón disponible para reintentar. Un fallo de correo no bloquea ni afecta
las acciones de PDF o WhatsApp del mismo modal.

## Fuera de alcance (explícito)

- Adjuntar el PDF real al correo o a WhatsApp — requeriría agregar
  generación de PDF en servidor (p.ej. Puppeteer), que hoy no existe
  ("Ver/descargar PDF" es impresión del navegador). No se pidió y no se
  agrega en esta iteración.
- Guardar plantillas de correo por cliente en base de datos — lo editable
  es por-envío (en el modal), no persistente entre cotizaciones.
- Replicar este modal/patrón en Ventas, Guías de remisión u otros módulos.
- Historial o log de correos enviados (quién, cuándo, a quién) — no se
  agrega tabla nueva para esto.
- Reintentos automáticos o cola de envío — si falla, el usuario reintenta
  manualmente con el mismo botón.
