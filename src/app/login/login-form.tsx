'use client'

import { useState } from 'react'
import { signIn } from './actions'

export function LoginForm({ errorMessage }: { errorMessage?: string }) {
  const [verPassword, setVerPassword] = useState(false)

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
            type={verPassword ? 'text' : 'password'}
            name="password"
            placeholder="Contraseña"
            required
            className="w-full bg-transparent text-white placeholder-white/60 outline-none"
          />
          <button
            type="button"
            onClick={() => setVerPassword((v) => !v)}
            title={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="shrink-0 text-blue-100/70 transition-colors hover:text-white"
          >
            {verPassword ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            )}
          </button>
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
