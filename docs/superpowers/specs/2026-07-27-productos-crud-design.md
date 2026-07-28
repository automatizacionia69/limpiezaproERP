# Diseño: Módulo de Productos (v1) — crear y listar

## Contexto

Con el login (Fase 1) y el nuevo modelo de datos con costeo/kardex (Fase 2,
ya aplicado en Supabase) listos, la base de datos está vacía — no hay
productos ni movimientos. Se necesita un primer módulo funcional para tener
datos reales antes de construir el dashboard (un dashboard sobre una base
vacía no muestra nada útil).

Este documento cubre **solo** crear y listar productos. Editar/eliminar
productos, el módulo de Movimientos (entradas/salidas/ajustes), y el
dashboard quedan fuera — cada uno su propio ciclo spec → plan →
implementación cuando le toque, siguiendo el roadmap ya definido en
`CLAUDE.md`.

## Decisiones de diseño

### 1. `cantidad` y `costo` no son editables en este formulario
Por diseño del schema (`docs/superpowers/specs/2026-07-26-inventario-schema-design.md`),
`productos.cantidad` y `productos.costo` solo cambian vía el trigger
`aplicar_movimiento`, nunca a mano. Un producto nuevo arranca con
`cantidad = 0` y `costo = 0` (los defaults de la tabla) y solo obtienen
valores reales cuando exista el módulo de Movimientos y se registre una
`entrada`. El formulario de creación no expone estos campos.

### 2. Categoría queda opcional y probablemente vacía por ahora
`productos.categoria_id` es nullable. La tabla `categorias` no tiene seed
(decisión ya tomada en el spec de schema — el admin las define al migrar el
catálogo real). El selector de categoría en el formulario puede aparecer
vacío (solo la opción "Sin categoría") hasta que exista un módulo de
Categorías — es un estado esperado, no un bug.

### 3. Unidad es obligatoria y ya tiene datos
`productos.unidad_id` es `not null`. `unidades_medida` ya está sembrada
(`und`, `paq`, `caja`), así que el selector siempre tiene opciones
utilizables sin depender de ningún módulo adicional.

### 4. Sin editar ni eliminar todavía
Alcance mínimo a propósito (YAGNI): solo **crear** y **listar**. Es
suficiente para tener datos reales y avanzar al dashboard. Editar/eliminar
se agrega en un ciclo aparte si se necesita antes de eso.

### 5. Reestructurar páginas protegidas bajo un layout compartido
Hoy la única página protegida es `/dashboard`, y repite inline la lógica de
"verificar sesión, buscar perfil, redirigir si falta" (`src/app/dashboard/page.tsx:11-44`).
Con Productos se agrega una segunda página protegida, y vendrán más
(Movimientos, Categorías, etc.). Se introduce un route group
`src/app/(protected)/layout.tsx` que:
- Verifica sesión y perfil una sola vez (misma lógica que hoy tiene
  `dashboard/page.tsx`, movida aquí).
- Renderiza una barra de navegación simple: Dashboard · Productos · Salir.
- Envuelve `dashboard/page.tsx` y `productos/page.tsx` (ambos se mudan
  dentro del route group `(protected)`, que no afecta las URLs — Next.js
  no incluye el nombre del route group en la ruta).

`dashboard/page.tsx` deja de hacer su propio chequeo de sesión/perfil (ya
lo hace el layout) y recibe el perfil ya cargado. El botón de logout
(`signOut` en `dashboard/actions.ts`) se mueve al nav del layout, ya que
aplica a cualquier página protegida, no solo al dashboard.

## Arquitectura

```
src/app/(protected)/
  layout.tsx          # auth + perfil + nav, envuelve todo lo protegido
  dashboard/
    page.tsx           # ya no valida sesión, la recibe del layout
    actions.ts          # ya no tiene signOut (se mueve al layout/nav)
  productos/
    page.tsx            # lista (Server Component, query directa)
    actions.ts           # Server Action crearProducto
    nuevo/
      page.tsx            # formulario de creación
```

`(protected)/layout.tsx` — pseudocódigo del flujo:
1. `createClient()` (server), `getUser()`. Si no hay usuario → `redirect('/login')`.
2. Query `usuarios_perfil` por `id` (igual que hace hoy `dashboard/page.tsx:22-26`, mismos casos de error: `perfilError` distinto de "no encontrado" → signOut + redirect con `?error=error-perfil`; sin perfil → signOut + redirect con `?error=sin-perfil`).
3. Renderiza nav + `{children}`, pasando `perfil` a las páginas hijas si lo necesitan (dashboard sí, para mostrar nombre/rol).

**Lista de productos** (`productos/page.tsx`): Server Component, `select('*, categorias(nombre), unidades_medida(nombre)')` sobre `productos`, ordenado por `nombre`. Tabla con columnas: Nombre, Código, Categoría (o "—"), Unidad, Cantidad, Costo, Precio venta, Punto de reorden. Estado vacío: mensaje "Todavía no hay productos" + link a "Agregar producto" cuando la lista está vacía.

**Formulario de creación** (`productos/nuevo/page.tsx` + `productos/actions.ts`):
- Campos: `nombre` (text, requerido), `codigo` (text, opcional), `unidad_id` (select, requerido, opciones de `unidades_medida`), `categoria_id` (select, opcional, opciones de `categorias` + "Sin categoría"), `precio_venta` (number, opcional), `punto_reorden` (number, opcional, default 0).
- Server Action `crearProducto(formData)`: valida `nombre` y `unidad_id` no vacíos (mensaje de error claro antes de tocar la base — la base ya lo exige, pero así el usuario ve un error entendible en vez de un fallo genérico de Supabase), inserta con `cantidad: 0, costo: 0` explícitos, y en éxito redirige a `/productos`.
- Errores de Supabase (ej. `codigo` duplicado si el usuario lo llena) se muestran como mensaje en el formulario, sin perder los valores ya ingresados.

## Testing / Verificación

Sin tests automatizados (convención del proyecto). Verificación manual:
1. `npx tsc --noEmit` sin errores.
2. Login → dashboard sigue funcionando igual que antes (mismo nombre/rol, logout funcional) después de mover la lógica al layout.
3. Ir a `/productos` con la lista vacía → se ve el estado vacío con link a "Agregar producto".
4. Crear un producto con nombre + unidad únicamente → aparece en la lista con cantidad 0 y costo 0.
5. Crear un producto dejando `nombre` vacío → error claro en el formulario, no crea la fila.
6. Verificar en el SQL Editor de Supabase que el producto insertado tiene `cantidad = 0` y `costo = 0` tal como se definió.
