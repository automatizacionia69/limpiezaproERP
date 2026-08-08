'use client'

import { useActionState, useState } from 'react'
import { actualizarConfiguracion, type EstadoFormulario } from './actions'
import { filtrarTelefono } from '@/lib/telefono'

type Configuracion = {
  empresa: string
  ruc: string | null
  direccion: string | null
  telefono: string | null
  email: string | null
  moneda: string
  titular: string | null
  yape: string | null
  cuenta_bcp_soles: string | null
  cci_bcp: string | null
  cuenta_bbva_soles: string | null
  cci_bbva: string | null
  usa_lote_vencimiento: boolean
}

const CAMPO =
  'mt-1.5 w-full rounded-lg border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-3 py-2 text-sm text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-slate-500 focus:ring-4 focus:ring-slate-100 disabled:bg-[#f8fafc] disabled:opacity-70'
const LABEL = 'block text-xs font-bold text-[#1e293b] dark:text-slate-100'

export function ConfiguracionForm({
  configuracion,
  puedeEditar,
}: {
  configuracion: Configuracion
  puedeEditar: boolean
}) {
  const [estado, formAction] = useActionState<EstadoFormulario, FormData>(actualizarConfiguracion, {
    error: null,
  })
  const [usaLoteVencimiento, setUsaLoteVencimiento] = useState(configuracion.usa_lote_vencimiento)

  return (
    <form action={formAction} className="mt-6 space-y-5">
      <input type="hidden" name="usa_lote_vencimiento" value={String(usaLoteVencimiento)} />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2 lg:col-span-3">
          <label className={LABEL}>Nombre de la empresa *</label>
          <input
            type="text"
            name="empresa"
            required
            disabled={!puedeEditar}
            defaultValue={configuracion.empresa}
            className={CAMPO}
          />
        </div>
        <div>
          <label className={LABEL}>RUC</label>
          <input
            type="text"
            name="ruc"
            disabled={!puedeEditar}
            defaultValue={configuracion.ruc ?? ''}
            className={CAMPO}
          />
        </div>
        <div>
          <label className={LABEL}>Titular (dueño del RUC)</label>
          <input
            type="text"
            name="titular"
            disabled={!puedeEditar}
            defaultValue={configuracion.titular ?? ''}
            placeholder="Ej. Heredia Vasquez Frank Eduardo"
            className={CAMPO}
          />
        </div>
        <div>
          <label className={LABEL}>Símbolo de moneda</label>
          <input
            type="text"
            name="moneda"
            disabled={!puedeEditar}
            defaultValue={configuracion.moneda}
            className={CAMPO}
          />
        </div>
        <div>
          <label className={LABEL}>Teléfono</label>
          <input
            type="tel"
            name="telefono"
            disabled={!puedeEditar}
            defaultValue={configuracion.telefono ?? ''}
            onInput={filtrarTelefono}
            className={CAMPO}
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-2">
          <label className={LABEL}>Dirección</label>
          <input
            type="text"
            name="direccion"
            disabled={!puedeEditar}
            defaultValue={configuracion.direccion ?? ''}
            className={CAMPO}
          />
        </div>
        <div>
          <label className={LABEL}>Correo</label>
          <input
            type="email"
            name="email"
            disabled={!puedeEditar}
            defaultValue={configuracion.email ?? ''}
            className={CAMPO}
          />
        </div>
      </div>

      <div>
        <p className="text-sm font-bold text-[#1e293b] dark:text-slate-100">Cuentas para pago (aparecen en la cotización)</p>
        <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={LABEL}>Yape</label>
            <input
              type="text"
              name="yape"
              disabled={!puedeEditar}
              defaultValue={configuracion.yape ?? ''}
              placeholder="Número Yape"
              className={CAMPO}
            />
          </div>
          <div>
            <label className={LABEL}>Cuenta BCP (soles)</label>
            <input
              type="text"
              name="cuenta_bcp_soles"
              disabled={!puedeEditar}
              defaultValue={configuracion.cuenta_bcp_soles ?? ''}
              className={CAMPO}
            />
          </div>
          <div>
            <label className={LABEL}>CCI BCP</label>
            <input
              type="text"
              name="cci_bcp"
              disabled={!puedeEditar}
              defaultValue={configuracion.cci_bcp ?? ''}
              className={CAMPO}
            />
          </div>
          <div>
            <label className={LABEL}>Cuenta BBVA (soles)</label>
            <input
              type="text"
              name="cuenta_bbva_soles"
              disabled={!puedeEditar}
              defaultValue={configuracion.cuenta_bbva_soles ?? ''}
              className={CAMPO}
            />
          </div>
          <div>
            <label className={LABEL}>CCI BBVA</label>
            <input
              type="text"
              name="cci_bbva"
              disabled={!puedeEditar}
              defaultValue={configuracion.cci_bbva ?? ''}
              className={CAMPO}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 p-4">
        <div>
          <p className="text-sm font-bold text-[#1e293b] dark:text-slate-100">Usar lote y fecha de vencimiento</p>
          <p className="mt-0.5 text-xs font-medium text-[#64748b] dark:text-slate-400">
            Muestra los campos de Lote y Fecha de vencimiento al agregar ítems en Movimientos → Entradas. Actívalo solo
            si el negocio maneja productos perecibles o con control de lote — para insumos de rotación rápida puedes
            dejarlo apagado.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={usaLoteVencimiento}
          disabled={!puedeEditar}
          title={usaLoteVencimiento ? 'Desactivar lote/vencimiento' : 'Activar lote/vencimiento'}
          onClick={() => setUsaLoteVencimiento((v) => !v)}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            usaLoteVencimiento ? 'bg-emerald-500' : 'bg-[#e2e8f0] dark:bg-slate-700'
          }`}
        >
          <span
            className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow transition-transform ${
              usaLoteVencimiento ? 'translate-x-[22px]' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {estado.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {estado.error}
        </p>
      )}
      {estado.ok && (
        <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          ✅ Configuración guardada.
        </p>
      )}

      {puedeEditar ? (
        <button
          type="submit"
          className="w-full rounded-md bg-gradient-to-r from-slate-600 to-gray-700 py-3.5 text-base font-bold text-white shadow-lg shadow-slate-500/30 transition-all active:scale-95"
        >
          Guardar configuración
        </button>
      ) : (
        <p className="text-center text-xs font-medium text-[#94a3b8] dark:text-slate-500">
          Solo un administrador puede editar la configuración.
        </p>
      )}
    </form>
  )
}
