'use client'

import { useActionState, useMemo, useState } from 'react'
import { crearGuiaTraslado, type EstadoFormulario } from '../actions'
import { Buscador } from '@/components/buscador'

type Producto = { id: number; nombre: string; cantidad: number }
type Linea = { producto_id: number | ''; cantidad: number | '' }

const MOTIVOS_TRASLADO = [
  'Traslado entre establecimientos de la misma empresa',
  'Traslado por cambio de ubicación',
  'Otro',
]

function lineaVacia(): Linea {
  return { producto_id: '', cantidad: '' }
}

const CAMPO =
  'mt-1.5 w-full rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-4 py-3 text-base text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-100'
const LABEL = 'block text-sm font-bold text-[#1e293b] dark:text-slate-100'

export function NuevaGuiaTrasladoForm({ productos }: { productos: Producto[] }) {
  const [estado, formAction] = useActionState<EstadoFormulario, FormData>(crearGuiaTraslado, { error: null })
  const [destino, setDestino] = useState('')
  const [motivo, setMotivo] = useState(MOTIVOS_TRASLADO[0])
  const [observacion, setObservacion] = useState('')
  const [lineas, setLineas] = useState<Linea[]>([lineaVacia()])

  function actualizarProducto(i: number, productoId: number | string | '') {
    setLineas((prev) => prev.map((l, idx) => (idx === i ? { ...l, producto_id: Number(productoId) || '' } : l)))
  }

  function actualizarCantidad(i: number, valor: string) {
    setLineas((prev) =>
      prev.map((l, idx) => (idx === i ? { ...l, cantidad: valor === '' ? '' : Number(valor) } : l))
    )
  }

  function agregarLinea() {
    setLineas((prev) => [...prev, lineaVacia()])
  }

  function quitarLinea(i: number) {
    setLineas((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)))
  }

  const opcionesProductos = useMemo(
    () => productos.map((p) => ({ id: p.id, nombre: p.nombre, subtitulo: `stock: ${p.cantidad}` })),
    [productos]
  )

  const lineasValidas = useMemo(() => lineas.filter((l) => l.producto_id && l.cantidad), [lineas])

  const lineasJson = JSON.stringify(
    lineasValidas.map((l) => ({ producto_id: Number(l.producto_id), cantidad: Number(l.cantidad) }))
  )

  return (
    <form action={formAction} className="mt-6 max-w-2xl space-y-5">
      <input type="hidden" name="lineas" value={lineasJson} />

      <div>
        <label className={LABEL}>Dirección de destino *</label>
        <input
          type="text"
          name="destino"
          required
          value={destino}
          onChange={(e) => setDestino(e.target.value)}
          placeholder="Dirección del almacén destino..."
          className={CAMPO}
        />
      </div>

      <div>
        <label className={LABEL}>Motivo *</label>
        <select name="motivo" required value={motivo} onChange={(e) => setMotivo(e.target.value)} className={CAMPO}>
          {MOTIVOS_TRASLADO.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={LABEL}>Productos *</label>
        <div className="mt-1.5 space-y-2">
          {lineas.map((l, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex-1">
                <Buscador
                  opciones={opcionesProductos}
                  valor={l.producto_id}
                  onChange={(id) => actualizarProducto(i, id)}
                  placeholder="Buscar producto..."
                />
              </div>
              <input
                type="number"
                min="1"
                step="1"
                placeholder="Cant."
                value={l.cantidad}
                onChange={(e) => actualizarCantidad(i, e.target.value)}
                onWheel={(e) => e.currentTarget.blur()}
                className="w-24 rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-3 py-3 text-base text-[#1e293b] dark:text-slate-100 outline-none focus:border-fuchsia-500"
              />
              <button
                type="button"
                onClick={() => quitarLinea(i)}
                disabled={lineas.length === 1}
                title="Quitar"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#94a3b8] transition-all hover:bg-red-50 hover:text-red-600 disabled:opacity-30 active:scale-95"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={agregarLinea}
          className="mt-2 text-sm font-bold text-fuchsia-600 hover:text-fuchsia-700"
        >
          + Agregar producto
        </button>
      </div>

      <div>
        <label className={LABEL}>Observación</label>
        <input
          type="text"
          value={observacion}
          onChange={(e) => setObservacion(e.target.value)}
          name="observacion"
          placeholder="Detalle opcional"
          className={CAMPO}
        />
      </div>

      {estado.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {estado.error}
        </p>
      )}

      <button
        type="submit"
        disabled={lineasValidas.length === 0 || !destino.trim()}
        className="w-full rounded-md bg-gradient-to-r from-fuchsia-500 to-purple-600 py-3.5 text-base font-bold text-white shadow-lg shadow-fuchsia-500/30 transition-all active:scale-95 disabled:opacity-40"
      >
        Generar guía de traslado
      </button>
    </form>
  )
}
