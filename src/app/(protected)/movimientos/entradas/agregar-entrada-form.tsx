'use client'

import { useEffect, useState } from 'react'
import { buscarRazonSocialPorRuc } from '@/lib/decolecta'

type Proveedor = { id: number; nombre: string; ruc: string | null }

const MOTIVOS = [
  { valor: 'compra', label: 'Compra' },
  { valor: 'devolucion_cliente', label: 'Devolución de cliente' },
  { valor: 'produccion', label: 'Producción' },
  { valor: 'ajuste_inventario', label: 'Ajuste de inventario' },
  { valor: 'donacion', label: 'Donación' },
  { valor: 'traslado_almacenes', label: 'Traslado entre almacenes' },
  { valor: 'otro', label: 'Otro' },
] as const

const DOCUMENTOS = [
  { valor: 'factura', label: 'Factura' },
  { valor: 'boleta', label: 'Boleta' },
  { valor: 'guia_remision', label: 'Guía de Remisión' },
  { valor: 'nota_credito', label: 'Nota de Crédito' },
  { valor: 'nota_debito', label: 'Nota de Débito' },
  { valor: 'ticket', label: 'Ticket' },
  { valor: 'otro', label: 'Otro' },
] as const

const CAMPO_BASE =
  'w-full rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-4 py-3 text-base text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-[#f8fafc] disabled:text-[#94a3b8] dark:disabled:bg-slate-800/40 dark:disabled:text-slate-500'
const CAMPO = `mt-1.5 ${CAMPO_BASE}`
const LABEL = 'block text-sm font-bold text-[#1e293b] dark:text-slate-100'
const ERROR = 'mt-1.5 text-xs font-semibold text-red-600'

type Errores = Partial<
  Record<'fecha' | 'motivo' | 'motivoOtro' | 'costoUnitario' | 'ruc' | 'documentoTipo' | 'documentoOtro', string>
>

export function AgregarEntradaForm({
  usuarioNombre,
  usuarioRol,
  moneda,
  proveedores,
  fechaHoy,
}: {
  usuarioNombre: string
  usuarioRol: string
  moneda: string
  proveedores: Proveedor[]
  fechaHoy: string
}) {
  const [fecha, setFecha] = useState(fechaHoy)
  const [motivo, setMotivo] = useState('')
  const [motivoOtro, setMotivoOtro] = useState('')
  const [costoUnitario, setCostoUnitario] = useState('')

  const [ruc, setRuc] = useState('')
  const [razonSocial, setRazonSocial] = useState('')
  const [razonSocialEditable, setRazonSocialEditable] = useState(true)
  const [buscandoRuc, setBuscandoRuc] = useState(false)
  const [mensajeRuc, setMensajeRuc] = useState<string | null>(null)

  const [documentoTipo, setDocumentoTipo] = useState('')
  const [documentoOtro, setDocumentoOtro] = useState('')
  const [observaciones, setObservaciones] = useState('')

  const [errores, setErrores] = useState<Errores>({})
  const [validado, setValidado] = useState(false)

  const esCompra = motivo === 'compra'

  // Auto-consulta apenas el RUC tiene 11 dígitos: primero contra los
  // proveedores ya registrados (vínculo local), y si no aparece ahí, contra
  // la API de SUNAT/Decolecta — igual que el alta de proveedores.
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

  function validar(): boolean {
    const nuevos: Errores = {}
    if (!fecha) nuevos.fecha = 'La fecha de ingreso es obligatoria.'
    if (!motivo) nuevos.motivo = 'Selecciona un motivo.'
    if (motivo === 'otro' && !motivoOtro.trim()) nuevos.motivoOtro = 'Especifica el motivo.'
    if (costoUnitario === '' || Number(costoUnitario) < 0) nuevos.costoUnitario = 'Ingresa un costo unitario válido.'
    if (esCompra) {
      if (!/^\d{11}$/.test(ruc.trim())) nuevos.ruc = 'El RUC del proveedor es obligatorio (11 dígitos).'
      if (!documentoTipo) nuevos.documentoTipo = 'Selecciona el documento de emisión.'
      if (documentoTipo === 'otro' && !documentoOtro.trim()) nuevos.documentoOtro = 'Especifica el tipo de documento.'
    }
    setErrores(nuevos)
    return Object.keys(nuevos).length === 0
  }

  function alEnviar(e: React.FormEvent) {
    e.preventDefault()
    setValidado(false)
    if (validar()) setValidado(true)
  }

  return (
    <form
      onSubmit={alEnviar}
      className="rounded-3xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] p-7 shadow-lg shadow-slate-500/5"
    >
      <h2 className="text-lg font-extrabold text-[#1e293b] dark:text-slate-100">Agregar Entrada</h2>
      <p className="mt-1 text-sm font-medium text-[#64748b] dark:text-slate-400">
        Información general de la entrada — los productos se agregan en el siguiente paso.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-5">
          <h3 className="text-xs font-bold tracking-widest text-[#94a3b8] dark:text-slate-500 uppercase">
            Datos de la entrada
          </h3>

          <div>
            <label className={LABEL}>Fecha de ingreso *</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={CAMPO} />
            {errores.fecha && <p className={ERROR}>{errores.fecha}</p>}
          </div>

          <div>
            <label className={LABEL}>Usuario</label>
            <input type="text" value={`${usuarioNombre} — ${usuarioRol}`} disabled readOnly className={CAMPO} />
          </div>

          <div>
            <label className={LABEL}>Motivo del ingreso *</label>
            <select value={motivo} onChange={(e) => setMotivo(e.target.value)} className={CAMPO}>
              <option value="">Selecciona un motivo...</option>
              {MOTIVOS.map((m) => (
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
            <label className={LABEL}>Costo unitario *</label>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-sm font-bold text-[#94a3b8]">
                {moneda}
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={costoUnitario}
                onChange={(e) => setCostoUnitario(e.target.value)}
                className={`${CAMPO_BASE} pl-11`}
              />
            </div>
            {errores.costoUnitario && <p className={ERROR}>{errores.costoUnitario}</p>}
          </div>
        </div>

        <div className={`space-y-5 transition-opacity ${esCompra ? '' : 'opacity-50'}`}>
          <h3 className="text-xs font-bold tracking-widest text-[#94a3b8] dark:text-slate-500 uppercase">
            Datos de compra {!esCompra && '(solo si el motivo es Compra)'}
          </h3>

          <div>
            <label className={LABEL}>Proveedor *</label>
            <div className="mt-1.5 grid grid-cols-[140px_1fr] gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={11}
                placeholder="RUC"
                value={ruc}
                disabled={!esCompra}
                onChange={(e) => setRuc(e.target.value.replace(/\D/g, ''))}
                className={CAMPO_BASE}
              />
              <input
                type="text"
                placeholder="Razón social"
                value={razonSocial}
                disabled={!esCompra || !razonSocialEditable}
                onChange={(e) => setRazonSocial(e.target.value)}
                className={CAMPO_BASE}
              />
            </div>
            {errores.ruc && <p className={ERROR}>{errores.ruc}</p>}
            {esCompra && buscandoRuc && (
              <p className="mt-1.5 text-xs font-medium text-[#94a3b8]">Consultando RUC...</p>
            )}
            {esCompra && !buscandoRuc && mensajeRuc && (
              <p
                className={`mt-1.5 text-xs font-semibold ${
                  mensajeRuc.startsWith('✓') ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {mensajeRuc}
              </p>
            )}
          </div>

          <div>
            <label className={LABEL}>Documento de emisión *</label>
            <select
              value={documentoTipo}
              disabled={!esCompra}
              onChange={(e) => setDocumentoTipo(e.target.value)}
              className={CAMPO}
            >
              <option value="">Selecciona...</option>
              {DOCUMENTOS.map((d) => (
                <option key={d.valor} value={d.valor}>
                  {d.label}
                </option>
              ))}
            </select>
            {errores.documentoTipo && <p className={ERROR}>{errores.documentoTipo}</p>}
            {documentoTipo === 'otro' && (
              <div className="mt-3">
                <input
                  type="text"
                  value={documentoOtro}
                  disabled={!esCompra}
                  onChange={(e) => setDocumentoOtro(e.target.value)}
                  placeholder="Especifica el tipo de documento"
                  className={CAMPO_BASE}
                />
                {errores.documentoOtro && <p className={ERROR}>{errores.documentoOtro}</p>}
              </div>
            )}
          </div>

          <div>
            <label className={LABEL}>Observaciones</label>
            <textarea
              value={observaciones}
              maxLength={500}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Escriba cualquier observación relacionada con esta entrada."
              rows={4}
              className={`${CAMPO} resize-none`}
            />
            <p className="mt-1 text-right text-xs font-medium text-[#94a3b8]">{observaciones.length}/500</p>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border-2 border-dashed border-[#e2e8f0] dark:border-slate-700 p-6 text-center">
        <p className="text-sm font-bold text-[#94a3b8] dark:text-slate-500">📦 Agregar Ítems</p>
        <p className="mt-1 text-xs font-medium text-[#94a3b8] dark:text-slate-500">
          Próximamente: código, descripción, cantidad, costo, lote y vencimiento de cada producto.
        </p>
      </div>

      {validado && (
        <p className="mt-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          ✓ Datos válidos. Esta cabecera todavía no se guarda — falta conectar la sección de Ítems.
        </p>
      )}

      <button
        type="submit"
        className="mt-6 w-full rounded-md bg-gradient-to-r from-emerald-500 to-emerald-600 py-3.5 text-base font-bold text-white shadow-lg shadow-emerald-500/30 transition-all active:scale-95"
      >
        Validar datos
      </button>
    </form>
  )
}
