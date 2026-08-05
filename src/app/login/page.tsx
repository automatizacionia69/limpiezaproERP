import { LoginForm } from './login-form'
import { ThemeToggle } from '@/components/theme-toggle'

const ERROR_MESSAGES: Record<string, string> = {
  'credenciales-invalidas': 'Correo o contraseña incorrectos.',
  'error-conexion': 'No se pudo conectar, intenta de nuevo.',
  'sin-perfil':
    'Tu cuenta no tiene un perfil asignado, contacta al administrador.',
  'error-perfil':
    'No se pudo cargar tu perfil, intenta de nuevo o contacta al administrador.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const errorMessage = error ? ERROR_MESSAGES[error] : undefined

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-[#e7ebf4] to-[#dbe2f2] p-4 dark:from-[#0b1120] dark:to-[#0a0e1a]">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <LoginForm errorMessage={errorMessage} />
    </main>
  )
}
