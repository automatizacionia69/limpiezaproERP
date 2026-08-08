'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import { haceNDiasPeruISO, fechaDocumentoFueraDeRango } from '@/lib/fecha'
import { buscarRazonSocialPorRuc } from '@/lib/decolecta'
import { Buscador } from '@/components/buscador'
import { crearSalida, type EstadoFormulario } from './actions'
import { MOTIVOS_SALIDA, DOCUMENTOS_GRUPOS } from './constantes'

type Proveedor = { id: number; nombre: string; ruc: string | null }
type Producto = { id: number; nombre: string; codigo: string | null; cantidad: number }

const CAMPO_BASE =
  'w-full rounded-lg border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-3 py-2 text-sm text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-red-500 focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-[#f8fafc] disabled:text-[#94a3b8] dark:disabled:bg-slate-800/40 dark:disabled:text-slate-500'
const CAMPO = `mt-1.5 ${CAMPO_BASE}`
// El icono nativo del <input type="date"> sale minúsculo por defecto — lo
// agrandamos y le damos más "hitbox" de clic (igual en Entradas/Salidas/Ajustes).
const CAMPO_FECHA = `${CAMPO} [&::-webkit-calendar-picker-indicator]:scale-150 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:mr-1.5`
const LABEL = 'block text-xs font-bold text-[#1e293b] dark:text-slate-100'
const ERROR = 'mt-1.5 text-xs font-semibold text-red-600'

type Errores = Partial<
  Record<'fecha' | 'motivo' | 'motivoOtro' | 'ruc' | 'documentoOtro' | 'items', string>
>

type ItemSalida = {
  id: string
  productoId: number
  productoNombre: string
  productoCodigo: string | null
  stockActual: number
  cantidad: number | ''
  lote: string
  fechaVencimiento: string
}

function IconoBasura() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
      />
    </svg>
  )
}

export function AgregarSalidaForm({
  usuarioNombre,
  usuarioRol,
  proveedores,
  productos,
  fechaHoy,
  usaLoteVencimiento,
}: {
  usuarioNombre: string
  usuarioRol: string
  proveedores: Proveedor[]
  productos: Producto[]
  fechaHoy: string
  usaLoteVencimiento: boolean
}) {
  const [fecha, setFecha] = useState(fechaHoy)
  const [motivo, setMotivo] = useState('')
  const [motivoOtro, setMotivoOtro] = useState('')

  const [ruc, setRuc] = useState('')
  const [razonSocial, setRazonSocial] = useState('')
  const [razonSocialEditable, setRazonSocialEditable] = useState(true)
  const [buscandoRuc, setBuscandoRuc] = useState(false)
  const [mensajeRuc, setMensajeRuc] = useState<string | null>(null)

  const [documentoTipo, setDocumentoTipo] = useState('')
  const [documentoOtro, setDocumentoOtro] = useState('')
  const [serieDocumento, setSerieDocumento] = useState('')
  const [correlativoDocumento, setCorrelativoDocumento] = useState('')
  const [observaciones, setObservaciones] = useState('')

  const [items, setItems] = useState<ItemSalida[]>([])
  const [productoParaAgregar, setProductoParaAgregar] = useState<number | ''>('')

  const [errores, setErrores] = useState<Errores>({})

  const [estado, formAction] = useActionState<EstadoFormulario, FormData>(crearSalida, { error: null })

  const esDevolucionProveedor = motivo === 'devolucion_proveedor'
  const documentoRequiereNumeracion = documentoTipo !== '' && documentoTipo !== 'sin_documento'

  // Auto-consulta apenas el RUC tiene 11 dígitos: primero contra los
  // proveedores ya registrados (vínculo local), y si no aparece ahí, contra
  // la API de SUNAT/Decolecta — igual que en Entradas.
  useEffect(() => {
    const rucLimpio = ruc.trim()
    if (!/^\d{11}$/.test(rucLimpio)) {
      setMensajeRuc(null)
      return
    }

    const local = proveedores.find((p) => p.ruc === rucLimpio)
    if (local) {
      setRazonSocial(local.nombre)
      setRazonSocialEditable(false)
      setMensajeRuc('✓ Proveedor ya registrado en el sistema.')
      return
    }

    let cancelado = false
    setBuscandoRuc(true)
    setMensajeRuc(null)

    buscarRazonSocialPorRuc(rucLimpio).then((resultado) => {
      if (cancelado) return
      setBuscandoRuc(false)
      if ('error' in resultado) {
        setRazonSocial('')
        setRazonSocialEditable(true)
        setMensajeRuc('Proveedor no encontrado — puedes escribir la razón social manualmente.')
      } else {
        setRazonSocial(resultado.nombre)
        setRazonSocialEditable(false)
        setMensajeRuc('✓ Datos obtenidos de SUNAT.')
      }
    })

    return () => {
      cancelado = true
    }
  }, [ruc, proveedores])

  const opcionesProductos = useMemo(
    () => productos.map((p) => ({ id: p.id, nombre: p.nombre, subtitulo: `stock: ${p.cantidad}` })),
    [productos]
  )

  function agregarProductoDesdeBuscador(id: number | string | '') {
    const productoId = Number(id)
    if (!productoId) return
    const producto = productos.find((p) => p.id === productoId)
    if (!producto) return
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        productoId: producto.id,
        productoNombre: producto.nombre,
        productoCodigo: producto.codigo,
        stockActual: producto.cantidad,
        cantidad: 1,
        lote: '',
        fechaVencimiento: '',
      },
    ])
    setProductoParaAgregar('')
  }

  function actualizarItem(id: string, valor: string) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, cantidad: valor === '' ? '' : Number(valor) } : it)))
  }

  function actualizarItemTexto(id: string, campo: 'lote' | 'fechaVencimiento', valor: string) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [campo]: valor } : it)))
  }

  function alQuitarItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id))
  }

  function validar(): boolean {
    const nuevos: Errores = {}
    if (!fecha) nuevos.fecha = 'La fecha de salida es obligatoria.'
    else if (fechaDocumentoFueraDeRango(fecha)) nuevos.fecha = 'La fecha no puede ser futura ni atrasarse más de 3 días.'
    if (!motivo) nuevos.motivo = 'Selecciona un motivo.'
    if (motivo === 'otro' && !motivoOtro.trim()) nuevos.motivoOtro = 'Especifica el motivo.'
    if (esDevolucionProveedor && !/^\d{11}$/.test(ruc.trim())) nuevos.ruc = 'El RUC del proveedor es obligatorio (11 dígitos).'
    if (documentoTipo === 'otro' && !documentoOtro.trim()) nuevos.documentoOtro = 'Especifica el tipo de documento.'
    if (items.length === 0) nuevos.items = 'Agrega al menos un ítem a la salida.'
    else if (items.some((it) => it.cantidad === '' || Number(it.cantidad) <= 0))
      nuevos.items = 'Revisa la cantidad de cada ítem.'
    setErrores(nuevos)
    return Object.keys(nuevos).length === 0
  }

  function alEnviar(e: React.FormEvent) {
    if (!validar()) e.preventDefault()
  }

  const itemsJson = JSON.stringify(
    items.map((it) => ({
      producto_id: it.productoId,
      cantidad: Number(it.cantidad) || 0,
      lote: it.lote || null,
      fecha_vencimiento: it.fechaVencimiento || null,
    }))
  )

  return (
    <form
      action={formAction}
      onSubmit={alEnviar}
      className="rounded-3xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] p-7 shadow-lg shadow-slate-500/5"
    >
      <input type="hidden" name="fecha" value={fecha} />
      <input type="hidden" name="motivo" value={motivo} />
      <input type="hidden" name="motivo_otro" value={motivoOtro} />
      <input type="hidden" name="ruc" value={ruc} />
      <input type="hidden" name="razon_social" value={razonSocial} />
      <input type="hidden" name="documento_tipo" value={documentoTipo} />
      <input type="hidden" name="documento_otro" value={documentoOtro} />
      <input type="hidden" name="documento_serie" value={serieDocumento} />
      <input type="hidden" name="documento_correlativo" value={correlativoDocumento} />
      <input type="hidden" name="observaciones" value={observaciones} />
      <input type="hidden" name="items" value={itemsJson} />

      <h2 className="text-lg font-extrabold text-[#1e293b] dark:text-slate-100">Agregar Salida</h2>
      <p className="mt-1 text-sm font-medium text-[#64748b] dark:text-slate-400">
        Información general de la salida — luego agrega los productos en la sección de Ítems.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-5">
          <h3 className="text-xs font-bold tracking-widest text-[#94a3b8] dark:text-slate-500 uppercase">
            Datos de la salida
          </h3>

          <div>
            <label className={LABEL}>Fecha de salida *</label>
            <input
              type="date"
              value={fecha}
              min={haceNDiasPeruISO(3)}
              max={fechaHoy}
              onChange={(e) => setFecha(e.target.value)}
              className={CAMPO_FECHA}
            />
            <p className="mt-1.5 text-xs font-medium text-[#94a3b8] dark:text-slate-500">
              No se aceptan fechas futuras ni atrasos de más de 3 días.
            </p>
            {errores.fecha && <p className={ERROR}>{errores.fecha}</p>}
          </div>

          <div>
            <label className={LABEL}>Usuario</label>
            <input type="text" value={`${usuarioNombre} — ${usuarioRol}`} disabled readOnly className={CAMPO} />
          </div>

          <div>
            <label className={LABEL}>Motivo de la salida *</label>
            <select value={motivo} onChange={(e) => setMotivo(e.target.value)} className={CAMPO}>
              <option value="">Selecciona un motivo...</option>
              {MOTIVOS_SALIDA.map((m) => (
                <option key={m.valor} value={m.valor}>
                  {m.label}
                </option>
              ))}
            </select>
            {errores.motivo && <p className={ERROR}>{errores.motivo}</p>}
            {motivo === 'otro' && (
              <div className="mt-3">
                <input
                  type="text"
                  value={motivoOtro}
                  onChange={(e) => setMotivoOtro(e.target.value)}
                  placeholder="Especifica el motivo"
                  className={CAMPO_BASE}
                />
                {errores.motivoOtro && <p className={ERROR}>{errores.motivoOtro}</p>}
              </div>
            )}
          </div>

          <div>
            <label className={LABEL}>Proveedor {esDevolucionProveedor && '*'}</label>
            <div className="mt-1.5 grid grid-cols-[140px_1fr] gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={11}
                placeholder="RUC"
                value={ruc}
                onChange={(e) => setRuc(e.target.value.replace(/\D/g, ''))}
                className={CAMPO_BASE}
              />
              <input
                type="text"
                placeholder="Razón social"
                value={razonSocial}
                disabled={!razonSocialEditable}
                onChange={(e) => setRazonSocial(e.target.value)}
                className={CAMPO_BASE}
              />
            </div>
            <p className="mt-1.5 text-xs font-medium text-[#94a3b8] dark:text-slate-500">
              Solo aplica si la salida es una devolución de mercadería a un proveedor.
            </p>
            {errores.ruc && <p className={ERROR}>{errores.ruc}</p>}
            {buscandoRuc && <p className="mt-1.5 text-xs font-medium text-[#94a3b8]">Consultando RUC...</p>}
            {!buscandoRuc && mensajeRuc && (
              <p
                className={`mt-1.5 text-xs font-semibold ${
                  mensajeRuc.startsWith('✓') ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {mensajeRuc}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <h3 className="text-xs font-bold tracking-widest text-[#94a3b8] dark:text-slate-500 uppercase">
            Datos del documento (opcional)
          </h3>

          <div>
            <label className={LABEL}>Tipo de documento</label>
            <select value={documentoTipo} onChange={(e) => setDocumentoTipo(e.target.value)} className={CAMPO}>
              <option value="">Selecciona...</option>
              {DOCUMENTOS_GRUPOS.map((g) => (
                <optgroup key={g.grupo} label={g.grupo}>
                  {g.opciones.map((d) => (
                    <option key={d.valor} value={d.valor}>
                      {d.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {documentoTipo === 'otro' && (
              <div className="mt-3">
                <input
                  type="text"
                  value={documentoOtro}
                  onChange={(e) => setDocumentoOtro(e.target.value)}
                  placeholder="Especifica el tipo de documento"
                  className={CAMPO_BASE}
                />
                {errores.documentoOtro && <p className={ERROR}>{errores.documentoOtro}</p>}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Serie documento</label>
              <input
                type="text"
                value={serieDocumento}
                disabled={!documentoRequiereNumeracion}
                onChange={(e) => setSerieDocumento(e.target.value)}
                placeholder="ej. T001"
                className={CAMPO}
              />
            </div>
            <div>
              <label className={LABEL}>Correlativo</label>
              <input
                type="text"
                value={correlativoDocumento}
                disabled={!documentoRequiereNumeracion}
                onChange={(e) => setCorrelativoDocumento(e.target.value.replace(/\D/g, ''))}
                placeholder="ej. 000123"
                className={CAMPO}
              />
            </div>
          </div>

          <div>
            <label className={LABEL}>Observaciones</label>
            <textarea
              value={observaciones}
              maxLength={500}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Escriba cualquier observación relacionada con esta salida."
              rows={4}
              className={`${CAMPO} resize-none`}
            />
            <p className="mt-1 text-right text-xs font-medium text-[#94a3b8]">{observaciones.length}/500</p>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-2xl bg-red-50/60 dark:bg-red-950/10 p-5">
        <h3 className="text-xs font-bold tracking-widest text-[#94a3b8] dark:text-slate-500 uppercase">
          📦 Ítems de la salida
        </h3>
        <div className="mt-3">
          <Buscador
            opciones={opcionesProductos}
            valor={productoParaAgregar}
            onChange={agregarProductoDesdeBuscador}
            placeholder="Escribe el nombre del producto para agregarlo a la salida..."
          />
        </div>

        {errores.items && <p className={ERROR}>{errores.items}</p>}

        {items.length === 0 ? (
          <p className="mt-3 text-xs font-medium text-[#94a3b8] dark:text-slate-500">
            Todavía no agregaste ningún producto — búscalo arriba para agregarlo.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-[#e5e9f0] dark:border-slate-700">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f8fafc] dark:bg-slate-800/60">
                <tr>
                  <th className="px-4 py-3 font-bold text-[#64748b] dark:text-slate-400">N°</th>
                  <th className="px-4 py-3 font-bold text-[#64748b] dark:text-slate-400">Producto</th>
                  <th className="px-4 py-3 font-bold text-[#64748b] dark:text-slate-400">Cantidad</th>
                  {usaLoteVencimiento && (
                    <>
                      <th className="px-4 py-3 font-bold text-[#64748b] dark:text-slate-400">Lote</th>
                      <th className="px-4 py-3 font-bold text-[#64748b] dark:text-slate-400">Fecha de vcto.</th>
                    </>
                  )}
                  <th className="px-4 py-3 font-bold text-[#64748b] dark:text-slate-400"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item.id} className="border-t border-[#e5e9f0] dark:border-slate-700">
                    <td className="px-4 py-3 text-[#64748b] dark:text-slate-400">{i + 1}</td>
                    <td className="px-4 py-3 font-semibold text-[#1e293b] dark:text-slate-100">
                      {item.productoNombre}
                      {item.productoCodigo && (
                        <span className="ml-2 text-xs font-medium text-[#94a3b8]">{item.productoCodigo}</span>
                      )}
                      <span
                        className={`mt-1 block w-fit rounded-lg px-2 py-0.5 text-[10px] font-bold ${
                          item.stockActual <= 0
                            ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                            : 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400'
                        }`}
                      >
                        📦 stock: {item.stockActual}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.cantidad}
                        onChange={(e) => actualizarItem(item.id, e.target.value)}
                        className="w-24 rounded-lg border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-2 py-1.5 text-sm text-[#1e293b] dark:text-slate-100 outline-none focus:border-red-500"
                      />
                    </td>
                    {usaLoteVencimiento && (
                      <>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={item.lote}
                            onChange={(e) => actualizarItemTexto(item.id, 'lote', e.target.value)}
                            placeholder="Opcional"
                            className="w-28 rounded-lg border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-2 py-1.5 text-sm text-[#1e293b] dark:text-slate-100 outline-none focus:border-red-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="date"
                            value={item.fechaVencimiento}
                            onChange={(e) => actualizarItemTexto(item.id, 'fechaVencimiento', e.target.value)}
                            className="rounded-lg border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-2 py-1.5 text-sm text-[#1e293b] dark:text-slate-100 outline-none focus:border-red-500 [&::-webkit-calendar-picker-indicator]:scale-150 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:mr-1"
                          />
                        </td>
                      </>
                    )}
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        title="Quitar ítem"
                        onClick={() => alQuitarItem(item.id)}
                        className="rounded-md p-1.5 text-[#64748b] transition-colors hover:bg-red-100 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/40"
                      >
                        <IconoBasura />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {estado.error && (
        <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {estado.error}
        </p>
      )}

      <button
        type="submit"
        className="mt-6 w-full rounded-md bg-gradient-to-r from-red-500 to-rose-600 py-3.5 text-base font-bold text-white shadow-lg shadow-red-500/30 transition-all active:scale-95"
      >
        Guardar salida
      </button>
    </form>
  )
}
