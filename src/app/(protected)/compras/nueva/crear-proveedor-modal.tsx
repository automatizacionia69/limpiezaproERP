'use client'

import { useEffect, useState, useTransition } from 'react'
import { Modal } from '@/components/modal'
import { buscarRazonSocialPorRuc } from '@/lib/decolecta'
import { filtrarTelefono } from '@/lib/telefono'
import { crearProveedorDesdeCompra, type ProveedorCreado } from './crear-proveedor-rapido'

const CAMPO =
  'mt-1.5 w-full rounded-lg border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-3 py-2 text-sm text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-pink-500 focus:ring-4 focus:ring-pink-100'
const LABEL = 'block text-xs font-bold text-[#1e293b] dark:text-slate-100'

/**
 * Alta rápida de proveedor sin salir de la compra en curso. Mismos campos
 * que Proveedores → Nuevo (incluido el autocompletado por RUC vía
 * Decolecta/SUNAT), pero como modal: al guardar, el proveedor queda
 * disponible y seleccionado en la orden que abrió este modal.
 */
export function CrearProveedorModal({
  abierto,
  nombreInicial,
  onCreado,
  onCerrar,
}: {
  abierto: boolean
  nombreInicial: string
  onCreado: (proveedor: ProveedorCreado) => void
  onCerrar: () => void
}) {
  const [ruc, setRuc] = useState('')
  const [nombre, setNombre] = useState('')
  const [contacto, setContacto] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [direccion, setDireccion] = useState('')
  const [errorRuc, setErrorRuc] = useState<string | null>(null)
  const [buscando, startBusqueda] = useTransition()
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!abierto) return
    setRuc('')
    setNombre(nombreInicial)
    setContacto('')
    setTelefono('')
    setEmail('')
    setDireccion('')
    setErrorRuc(null)
    setGuardando(false)
    setError(null)
  }, [abierto, nombreInicial])

  function buscarRuc() {
    setErrorRuc(null)
    startBusqueda(async () => {
      const resultado = await buscarRazonSocialPorRuc(ruc)
      if ('error' in resultado) {
        setErrorRuc(resultado.error)
      } else {
        setNombre(resultado.nombre)
        if (resultado.direccion) setDireccion(resultado.direccion)
      }
    })
  }

  async function guardar() {
    setGuardando(true)
    setError(null)

    const resultado = await crearProveedorDesdeCompra({ nombre, ruc, contacto, telefono, email, direccion })

    setGuardando(false)

    if ('error' in resultado) {
      setError(resultado.error)
      return
    }

    onCreado(resultado.proveedor)
  }

  return (
    <Modal abierto={abierto} onClose={onCerrar} className="max-w-2xl">
      <h2 className="text-lg font-extrabold text-[#1e293b] dark:text-slate-100">+ Crear proveedor nuevo</h2>
      <p className="mt-1 text-xs font-medium text-[#94a3b8] dark:text-slate-500">
        Se guarda en el mismo listado de Proveedores. La compra que estás llenando no se pierde.
      </p>

      {/* div, no <form>: se renderiza dentro del <form> de la compra. */}
      <div className="mt-5 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-3">
            <label className={LABEL}>RUC</label>
            <div className="mt-1.5 flex gap-2">
              <input
                type="text"
                value={ruc}
                onChange={(e) => setRuc(e.target.value)}
                maxLength={11}
                placeholder="11 dígitos"
                className="flex-1 rounded-lg border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-3 py-2 text-sm text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-pink-500 focus:ring-4 focus:ring-pink-100"
              />
              <button
                type="button"
                onClick={buscarRuc}
                disabled={buscando || ruc.length !== 11}
                className="shrink-0 rounded-md bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-2 text-sm font-bold text-white shadow-md shadow-pink-500/30 transition-all hover:shadow-lg hover:shadow-pink-500/40 disabled:opacity-40 disabled:shadow-none active:scale-95"
              >
                {buscando ? 'Buscando…' : '🔍 Buscar'}
              </button>
            </div>
            {errorRuc && <p className="mt-1.5 text-xs font-medium text-red-600">{errorRuc}</p>}
          </div>

          <div className="sm:col-span-2 lg:col-span-3">
            <label className={LABEL}>Razón social *</label>
            <input type="text" required value={nombre} onChange={(e) => setNombre(e.target.value)} className={CAMPO} />
          </div>
          <div>
            <label className={LABEL}>Contacto</label>
            <input type="text" value={contacto} onChange={(e) => setContacto(e.target.value)} className={CAMPO} />
          </div>
          <div>
            <label className={LABEL}>Teléfono</label>
            <input
              type="tel"
              value={telefono}
              onInput={filtrarTelefono}
              onChange={(e) => setTelefono(e.target.value)}
              className={CAMPO}
            />
          </div>
          <div>
            <label className={LABEL}>Correo</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={CAMPO} />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className={LABEL}>Dirección</label>
            <input type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)} className={CAMPO} />
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCerrar}
            className="flex-1 rounded-md border-2 border-[#e2e8f0] dark:border-slate-700 py-3 text-sm font-bold text-[#64748b] dark:text-slate-400 transition-all active:scale-95"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={guardando || !nombre.trim()}
            className="flex-1 rounded-md bg-gradient-to-r from-pink-500 to-rose-500 py-3 text-sm font-bold text-white shadow-lg shadow-pink-500/30 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Guardar proveedor'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
