import type { FormEvent } from 'react'

/** Bloquea letras en un input de teléfono: solo dígitos, espacios y +()- quedan. */
export function filtrarTelefono(e: FormEvent<HTMLInputElement>) {
  e.currentTarget.value = e.currentTarget.value.replace(/[^0-9+\-() ]/g, '')
}
