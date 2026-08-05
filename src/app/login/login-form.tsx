'use client'

import { useState } from 'react'
import { signIn } from './actions'
import { LogoEmpresa } from '@/components/logo-empresa'

const CAMPO_CONTENEDOR =
  'flex items-center gap-3 rounded-xl border-2 border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 transition-all focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-100 dark:border-slate-700 dark:bg-[#0f1424] dark:focus-within:ring-indigo-950'

export function LoginForm({ errorMessage }: { errorMessage?: string }) {
  const [verPassword, setVerPassword] = useState(false)

  return (
    <div className="w-full max-w-sm rounded-3xl border-2 border-[#e2e8f0] bg-white p-8 shadow-xl shadow-slate-500/10 dark:border-slate-700 dark:bg-[#141a2e]">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/40">
        <LogoEmpresa
          className="h-full w-full object-contain"
          fallback={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-10 w-10">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
              />
            </svg>
          }
        />
      </div>

      <h1 className="mb-6 text-center text-lg font-extrabold text-[#1e293b] dark:text-slate-100">
        Distribuidora LimpiezaPro
      </h1>

      <form action={signIn} className="space-y-4">
        <div className={CAMPO_CONTENEDOR}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="h-5 w-5 shrink-0 text-[#64748b] dark:text-slate-400"
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
            className="w-full bg-transparent text-[#1e293b] placeholder-[#94a3b8] outline-none dark:text-slate-100 dark:placeholder-slate-500"
          />
        </div>

        <div className={CAMPO_CONTENEDOR}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="h-5 w-5 shrink-0 text-[#64748b] dark:text-slate-400"
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
            className="w-full bg-transparent text-[#1e293b] placeholder-[#94a3b8] outline-none dark:text-slate-100 dark:placeholder-slate-500"
          />
          <button
            type="button"
            onClick={() => setVerPassword((v) => !v)}
            title={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="shrink-0 text-[#94a3b8] transition-colors hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400"
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

        <label className="flex select-none items-center gap-2 text-sm font-medium text-[#64748b] dark:text-slate-400">
          <input
            type="checkbox"
            name="recordar"
            defaultChecked
            className="h-4 w-4 rounded border-2 border-[#cbd5e1] text-indigo-600 accent-indigo-600 dark:border-slate-600"
          />
          Recordarme en este dispositivo
        </label>

        {errorMessage && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          className="w-full rounded-md bg-gradient-to-r from-indigo-600 to-fuchsia-600 py-3 font-bold text-white shadow-lg shadow-indigo-500/30 transition-all hover:from-indigo-500 hover:to-fuchsia-500 active:scale-95"
        >
          Iniciar sesión
        </button>
      </form>
    </div>
  )
}
