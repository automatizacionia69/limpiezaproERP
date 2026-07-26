import { signIn } from './actions'

export function LoginForm({ errorMessage }: { errorMessage?: string }) {
  return (
    <div className="w-full max-w-sm rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white/10">
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-10 w-10 text-blue-100"
          aria-hidden="true"
        >
          <path d="M12 12c2.71 0 4.9-2.19 4.9-4.9S14.71 2.2 12 2.2 7.1 4.39 7.1 7.1 9.29 12 12 12Zm0 2.45c-3.65 0-9.8 1.83-9.8 5.48v2.87h19.6v-2.87c0-3.65-6.15-5.48-9.8-5.48Z" />
        </svg>
      </div>

      <h1 className="mb-6 text-center text-lg font-semibold text-white">
        Distribuidora LimpiezaPro
      </h1>

      <form action={signIn} className="space-y-5">
        <div className="flex items-center gap-3 border-b border-white/30 pb-2">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="h-5 w-5 shrink-0 text-blue-100"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 6.75c0-.41.34-.75.75-.75h18c.41 0 .75.34.75.75v10.5a.75.75 0 0 1-.75.75h-18a.75.75 0 0 1-.75-.75V6.75Z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="m3 7 9 6 9-6" />
          </svg>
          <input
            type="email"
            name="email"
            placeholder="Correo electrónico"
            required
            className="w-full bg-transparent text-white placeholder-white/60 outline-none"
          />
        </div>

        <div className="flex items-center gap-3 border-b border-white/30 pb-2">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="h-5 w-5 shrink-0 text-blue-100"
            aria-hidden="true"
          >
            <rect x="4.5" y="10.5" width="15" height="9" rx="1.5" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 10.5V7a4 4 0 1 1 8 0v3.5"
            />
          </svg>
          <input
            type="password"
            name="password"
            placeholder="Contraseña"
            required
            className="w-full bg-transparent text-white placeholder-white/60 outline-none"
          />
        </div>

        {errorMessage && (
          <p role="alert" className="text-sm text-red-300">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          className="w-full rounded-full bg-blue-700 py-3 font-semibold text-white transition-colors hover:bg-blue-600"
        >
          Iniciar sesión
        </button>
      </form>
    </div>
  )
}
