# Diseño: Módulo de Cobranzas (v1)

## Contexto

Las ventas a crédito (`comprobantes.dias_credito != 'Contado'`) hoy no tienen
ningún seguimiento de cobro: una vez emitido el comprobante, nada avisa
cuándo vence ni si ya se cobró. El negocio necesita saber, con una semana de
anticipación, qué clientes están por vencer, y ver de un vistazo qué
facturas/boletas ya están vencidas — para cobrar a tiempo y evitar demoras.

Este documento cubre el módulo completo: migración, cálculo de saldo
pendiente, página `/cobranzas`, notificación en el header, y permisos. Cobro
parcial fuera de línea (sin pasar por Nota de Crédito/Débito) queda fuera de
alcance — decisión explícita, ver "Decisiones de diseño".

## Decisiones de diseño

### 1. "Marcar cobrada" es binario, no hay cobro parcial directo
`comprobantes.fecha_cobro` es `null` (pendiente) o tiene una fecha (cobrado
completo). Si un cliente paga parcial, se resuelve como ya hace el sistema:
una Nota de Crédito (reduce el saldo) o el negocio espera el pago completo
antes de marcar. No se agrega un campo de "monto cobrado parcial" — mantiene
el modelo simple y consistente con el resto del proyecto (sin
sobre-ingeniería para un caso que ya tiene salida por NC).

### 2. El monto a cobrar es el saldo neto, no `comprobante.total`
Notas de Crédito (parciales, no itemizables/itemizables) y Notas de Débito
(cargos adicionales, ej. "Intereses por mora") ya existen y afectan cuánto
debe el cliente. Se reutiliza la fórmula que ya usa
`consulta-ventas/actions.ts` para topear una NC nueva:

```
saldo_pendiente = comprobante.total + Σ notas_debito.monto − Σ notas_credito.monto
```

Un comprobante con `saldo_pendiente <= 0` se excluye de Cobranzas
automáticamente, aunque su `estado` siga en `'emitido'` (caso real: varias
NC parciales que en conjunto cubren el total, sin que nadie la anule
formalmente — el código de notas de crédito ya contempla este escenario).

### 3. Un comprobante anulado nunca aparece
`estado = 'anulado'` (anulación total vía NC) se filtra en la query base —
no hace falta lógica adicional, ya es el comportamiento actual del sistema
al anular.

### 4. Vencimiento se calcula en el servidor, no se guarda en la base
No existe columna de fecha de vencimiento; se deriva de
`fecha_emision + dias_credito` con `calcularFechaVencimiento` (ya existe en
`src/lib/motivos.ts`, reutilizada tal cual — no se duplica la lógica).
Se define **vencida** = fecha de vencimiento ya pasada; **por vencer** =
vence dentro de los próximos 7 días (inclusive). Comprobantes con
vencimiento a más de 7 días no se muestran en v1 (ni en la campana ni en la
página) — mantiene la lista corta y accionable; se puede ampliar después si
hace falta ver "todo lo pendiente" sin filtro de fecha.

### 5. Sin envío externo (WhatsApp/email/SMS)
La "alerta" es 100% dentro de la app (campana + página). No hay integración
con ningún proveedor externo de mensajería — decisión explícita del usuario,
mantiene el alcance mínimo y no depende de infraestructura que no existe hoy.

### 6. La notificación no repite el patrón de `AlertaStockBajo`
El toast de esquina rojo con emoji (`alerta-stock-bajo.tsx`) queda como está
para stock, pero **no se reutiliza para cobranzas** por pedido explícito del
usuario ("bien hecho, no como el de stock bajo, feo"). Cobranzas usa
únicamente el patrón de campana + dropdown de `notificaciones-stock.tsx`
(más sobrio: sin emoji grande, colores del sistema — ámbar para "por vencer",
rojo suave para "vencida", nada de bordes gruesos ni sombras exageradas).

## Modelo de datos

Migración aditiva `add-cobranzas.sql` (sigue el patrón del proyecto: nunca
se edita `schema.sql` ni un `add-*.sql` existente):

```sql
alter table comprobantes add column if not exists fecha_cobro timestamptz;
```

Sin RLS nueva: `fecha_cobro` es una columna más de `comprobantes`, las
policies de `update` ya existentes (rol `admin`/`almacen`/`ventas`) cubren
marcarla.

## Cálculo del saldo pendiente (server-side)

1. Query base: `comprobantes` con `estado = 'emitido'`, `dias_credito <>
   'Contado'`, `fecha_cobro is null` — trae `id, numero, tipo, total,
   fecha_emision, dias_credito, cliente_id, clientes(nombre)`.
2. Con los `id` resultantes, una query batch a `notas_credito` y otra a
   `notas_debito` con `comprobante_id in (...)`, agregadas en JS (`reduce`
   por `comprobante_id`) — evita N+1, dos queries extra en total sin
   importar cuántos comprobantes candidatos haya.
3. Por cada comprobante: `saldo = total + totalDebitos - totalCreditos`.
   Si `saldo <= 0`, se descarta.
4. Vencimiento: `calcularFechaVencimiento(fecha_emision, dias_credito)` →
   se compara la fecha resultante contra hoy para clasificar en
   `vencidas` (fecha < hoy) o `porVencer` (hoy <= fecha <= hoy + 7 días).
   El resto (`fecha > hoy + 7`) no entra en ninguna de las dos listas.

Esta lógica vive en una función nueva `obtenerCobranzasPendientes()` en
`src/lib/cobranzas.ts` (server-only, usa el cliente de Supabase recibido
como parámetro) — reutilizable tanto desde `layout.tsx` (para la campana)
como desde `/cobranzas/page.tsx` (para la página completa), sin duplicar la
query ni el cálculo.

## Página `/cobranzas`

Server component, mismo patrón visual que Consulta de Ventas (tabla con
bordes redondeados, encabezados en gris, filas con hover). Dos secciones,
en este orden:

- **Vencidas** (si hay): cliente, N° comprobante, tipo, saldo, "vencida hace
  N días", botón "Marcar cobrada".
- **Por vencer**: mismas columnas, "vence en N días".

Si no hay nada en ninguna de las dos: estado vacío simple ("No hay cobros
pendientes por ahora"), sin ilustración ni relleno innecesario.

`marcarCobrada(comprobanteId)` — server action en
`src/app/(protected)/cobranzas/actions.ts`: `update comprobantes set
fecha_cobro = now() where id = $1`, luego `revalidatePath('/cobranzas')`.
Si falla, el error se muestra inline en esa fila (mismo patrón que
compras/ventas), el resto de la tabla sigue interactiva.

## Notificación en el header

Nuevo componente `NotificacionesCobranzas`
(`src/app/(protected)/notificaciones-cobranzas.tsx`), clon estructural de
`notificaciones-stock.tsx`: campana con badge (conteo = vencidas + por
vencer), dropdown con las primeras filas (cliente, saldo, "vence en N
días"/"vencida hace N días"), link "Ver todo en Cobranzas" a `/cobranzas`.
Colores: texto rojo suave para vencidas, ámbar para por vencer — sin fondo
rojo grande ni emoji de sirena. Se agrega junto a `NotificacionesStock` en
`app-shell.tsx`, mismo lugar del header.

`layout.tsx` llama `obtenerCobranzasPendientes(supabase)` junto a la query
de `stockBajo` existente y pasa el resultado a `AppShell`.

## Permisos y menú

- `src/lib/modulos.ts`: agregar `{ clave: 'cobranzas', label: 'Cobranzas' }`
  al arreglo `MODULOS` (mismo patrón que los demás módulos).
- `src/app/(protected)/sidebar.tsx`: nuevo `NAV_ITEMS` con `href:
  '/cobranzas'`, `modulo: 'cobranzas'`, `grupo: 'ventas'`, entre Consulta de
  Ventas y Guías de Remisión. Ícono y gradiente nuevos, no reutilizados de
  otro ítem (consistente con que cada ítem del menú tiene su propio color).
- La página `/cobranzas` usa `requierePermiso('cobranzas')` al inicio,
  mismo patrón que el resto de páginas protegidas por módulo.
- `admin` tiene acceso automático (ya es así para todos los módulos); otros
  roles requieren que el admin active `cobranzas` en Usuarios.

## Testing

Sin tests automatizados (decisión ya establecida para todo el proyecto).
Verificación: `npx tsc --noEmit`, `npm run build`, y prueba manual:

1. Emitir una venta a crédito con `dias_credito` corto (ej. "7 días") para
   que caiga en "por vencer" de inmediato.
2. Confirmar que aparece en la campana (header) y en `/cobranzas`, con el
   saldo correcto.
3. Emitir una Nota de Crédito parcial sobre ese comprobante y confirmar que
   el saldo mostrado baja en consecuencia.
4. Marcar como cobrada y confirmar que desaparece de ambos lugares.
5. Confirmar que un comprobante `'Contado'` y uno `'anulado'` nunca
   aparecen.
