# Diseño: Login con Supabase Auth y roles

## Contexto

Distribuidora LimpiezaPro es un ERP de inventarios interno para ~7 personas
(admin, almacén, ventas). El schema de base de datos (`schema.sql`) ya define
`usuarios_perfil` (extiende `auth.users` con un rol) y políticas RLS que
distinguen lectura/escritura por rol. Este es el primer ítem del MVP: login
funcional que deja el resto de la app lista para construirse detrás de
autenticación.

## Objetivo

Permitir que un usuario con cuenta ya creada en Supabase inicie sesión con
email y contraseña, y llegue a una pantalla protegida que confirme su
identidad y rol. Ninguna otra pantalla del ERP existe todavía — este ciclo
solo entrega login + placeholder post-login.

## Alcance

**Incluido:**
- Pantalla `/login` con formulario email + contraseña.
- Middleware que protege todas las rutas excepto `/login`.
- Pantalla `/dashboard` placeholder (saludo, nombre, rol, botón cerrar sesión).
- Manejo de errores de credenciales inválidas y de perfil faltante.
- Verificación manual en navegador (sin tests automatizados).

**Fuera de alcance (explícitamente, para no crecer el ciclo):**
- Registro público de usuarios — las cuentas se crean manualmente desde el
  dashboard de Supabase (Project → Authentication), y el rol se asigna
  insertando la fila correspondiente en `usuarios_perfil`.
- Recuperación de contraseña ("Forgot password") — si un usuario se bloquea,
  se resetea manualmente desde Supabase. Se puede agregar más adelante si el
  equipo crece.
- Dashboard real con stock consolidado — es un ítem posterior del MVP
  (`schema.sql` ya tiene la vista `productos_stock_bajo` para cuando llegue).
- Tests automatizados — se evaluará agregar un framework (Vitest/Playwright)
  cuando el proyecto crezca; por ahora, prueba manual en el navegador.

## Alta de usuarios

Proceso manual, fuera de la app:
1. Admin crea el usuario en Supabase → Authentication → Add user (email +
   contraseña temporal).
2. Admin inserta una fila en `usuarios_perfil` con ese `id`, `nombre` y
   `rol` (`admin` | `almacen` | `ventas`).

No hay UI para esto en este ciclo.

## Arquitectura / estructura de archivos

> **Nota técnica:** Next.js 16 renombró el archivo `middleware.ts` a `proxy.ts`
> (exporta `proxy()` en vez de `middleware()`). Es el mismo concepto descrito
> más abajo ("el único lugar con la lógica de redirect"), solo cambia el
> nombre de archivo/función por la versión de Next.js instalada.

```
src/
├── proxy.ts                      # protege rutas, redirige según sesión
├── lib/supabase/
│   ├── client.ts                 # cliente Supabase para Client Components
│   ├── server.ts                 # cliente Supabase para Server Components/Actions
│   └── proxy.ts                  # helper para refrescar sesión en el proxy
├── app/
│   ├── login/
│   │   ├── page.tsx              # pantalla de login (Server Component)
│   │   ├── login-form.tsx        # formulario (Client Component: inputs + error)
│   │   └── actions.ts            # Server Action signIn(formData)
│   └── dashboard/
│       └── page.tsx              # placeholder: saludo + rol + "Cerrar sesión"
```

`lib/supabase/*` son los tres helpers estándar de `@supabase/ssr` para Next.js
App Router. Se construyen una sola vez en este ciclo y los reutilizará todo lo
que se construya después (CRUD, movimientos, dashboard real).

## Enfoque técnico

`@supabase/ssr` con sesión en cookies httpOnly + middleware global de
Next.js, y el submit del login vía Server Action (sin JS extra en el
cliente).

Alternativas consideradas y descartadas:
- **Solo cliente (`supabase-js` directo)**: la sesión no está disponible en
  el servidor, complica el uso de RLS y la protección de rutas se puede
  saltar más fácil.
- **`@supabase/auth-ui-react` (componente prearmado)**: más rápido de armar,
  pero muy difícil de personalizar al diseño visual pedido (glassmorphism
  azul marino).

## Flujo de datos

1. Usuario entra a cualquier ruta (ej. `/`). El middleware revisa la cookie
   de sesión; sin sesión → redirige a `/login`.
2. En `/login`, llena email + contraseña y da submit → Server Action
   `signIn` llama a `supabase.auth.signInWithPassword()`.
3. Si es correcto: Supabase deja la sesión en cookie httpOnly, redirige a
   `/dashboard`.
4. `/dashboard` (Server Component) lee la sesión, busca en `usuarios_perfil`
   el nombre y rol, y muestra "Hola, {nombre} — rol: {rol}" + botón "Cerrar
   sesión".
5. "Cerrar sesión" ejecuta un Server Action (`supabase.auth.signOut()`) y
   redirige a `/login`.
6. Si un usuario con sesión activa visita `/login`, el middleware lo manda
   directo a `/dashboard`.

## Diseño visual

Estilo *glassmorphism*: tarjeta translúcida con blur, centrada, sobre un
fondo con gradiente en tonos **azul marino** (adaptado de la referencia
visual compartida por el usuario, que usaba morado/rojo).

La tarjeta contiene, en este orden:
- Ícono de avatar circular (genérico, sin foto real).
- Campo de email con ícono.
- Campo de contraseña con ícono.
- Botón "Iniciar sesión" en forma de píldora.

**Se omiten** "Remember me" y "Forgot password" del mockup original, porque
no tienen función en este ciclo (no hay flujo de recuperación de contraseña,
y las sesiones de Supabase persisten solas vía cookie). Si se agregan más
adelante, se añaden entonces.

Todo el texto de la interfaz en español, consistente con el resto del ERP.

## Manejo de errores

- **Credenciales inválidas**: mensaje genérico "Correo o contraseña
  incorrectos" debajo del formulario. Nunca se especifica cuál de los dos
  campos falló (seguridad).
- **Usuario autenticado sin fila en `usuarios_perfil`** (ej. creado en
  Supabase Auth pero sin rol asignado): se cierra la sesión automáticamente
  y se redirige a `/login` con el mensaje "Tu cuenta no tiene un perfil
  asignado, contacta al administrador".
- **Falla de red / Supabase no disponible**: mensaje genérico "No se pudo
  conectar, intenta de nuevo", sin exponer detalles técnicos.

## Testing

Sin tests automatizados en este ciclo (decisión explícita del usuario).
Verificación manual en navegador antes de dar por completo el trabajo:
- Login con credenciales correctas → llega a `/dashboard` con nombre/rol
  correctos.
- Login con credenciales incorrectas → mensaje de error, permanece en
  `/login`.
- Acceso directo a `/dashboard` sin sesión → redirige a `/login`.
- Acceso a `/login` con sesión activa → redirige a `/dashboard`.
- Cerrar sesión → vuelve a `/login` y ya no se puede entrar a `/dashboard`
  sin volver a autenticarse.
