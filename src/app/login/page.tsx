import { LoginForm } from './login-form'

const ERROR_MESSAGES: Record<string, string> = {
  'credenciales-invalidas': 'Correo o contraseña incorrectos.',
  'error-conexion': 'No se pudo conectar, intenta de nuevo.',
  'sin-perfil':
    'Tu cuenta no tiene un perfil asignado, contacta al administrador.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const errorMessage = error ? ERROR_MESSAGES[error] : undefined

  return (
    <main className="flex min-h-screen items-center justify-center bg-linear-to-br from-slate-950 via-blue-950 to-indigo-950 p-4">
      <LoginForm errorMessage={errorMessage} />
    </main>
  )
}
