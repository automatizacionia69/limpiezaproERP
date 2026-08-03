'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { marcarNotificacionLeida, marcarTodasNotificacionesLeidas } from './actions'
import type { FilaNotificacion } from '@/lib/notificaciones'

type ClienteRow = { nombre: string }
type CotizacionRow = { id: number; numero: string; total: number; clientes: ClienteRow | ClienteRow[] | null }
type NotificacionConCotizacion = {
  id: number
  leida_en: string | null
  creado_en: string
  cotizaciones: CotizacionRow | CotizacionRow[] | null
}

function unoDe<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null)
}

/** Beep de dos tonos con Web Audio API — sin archivo de audio que conseguir ni licenciar. */
async function reproducirBeep(ctx: AudioContext) {
  try {
    if (ctx.state === 'suspended') await ctx.resume()
    const ahora = ctx.currentTime
    ;[880, 1320].forEach((frecuencia, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = frecuencia
      const inicio = ahora + i * 0.12
      gain.gain.setValueAtTime(0, inicio)
      gain.gain.linearRampToValueAtTime(0.2, inicio + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.18)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(inicio)
      osc.stop(inicio + 0.2)
    })
  } catch {
    // Navegador sin Web Audio o sonido bloqueado por la política de autoplay: no es crítico.
  }
}

export function NotificacionesPedidos({ iniciales }: { iniciales: FilaNotificacion[] }) {
  const [filas, setFilas] = useState(iniciales)
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    function alClickFuera(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', alClickFuera)
    return () => document.removeEventListener('mousedown', alClickFuera)
  }, [])

  // Los navegadores bloquean el audio hasta que haya un gesto real del
  // usuario en la página (política de autoplay) — un AudioContext creado
  // recién cuando llega la notificación nace "suspendido" y no suena. Se
  // crea y desbloquea apenas hace el primer clic/tecla, mucho antes de que
  // llegue cualquier notificación real.
  useEffect(() => {
    function desbloquearAudio() {
      if (!audioCtxRef.current) {
        try {
          audioCtxRef.current = new AudioContext()
        } catch {
          audioCtxRef.current = null
        }
      }
      audioCtxRef.current?.resume().catch(() => {})
    }
    document.addEventListener('click', desbloquearAudio, { once: true })
    document.addEventListener('keydown', desbloquearAudio, { once: true })
    return () => {
      document.removeEventListener('click', desbloquearAudio)
      document.removeEventListener('keydown', desbloquearAudio)
    }
  }, [])

  // Suscripción en vivo: el chatbot inserta en "notificaciones" desde otro
  // repo/proceso (service_role, salta RLS) — sin Realtime, esta campana solo
  // se actualizaría al navegar (como stock/cobranzas). El payload del INSERT
  // no trae el join a cotizaciones/clientes, por eso se pide esa fila de nuevo.
  useEffect(() => {
    const supabase = createClient()
    let cancelado = false
    let canal: ReturnType<typeof supabase.channel> | null = null

    async function suscribirse() {
      // @supabase/ssr guarda la sesion en cookies: al restaurarla, el socket
      // de Realtime no siempre hereda el token solo. Sin token, auth.uid()
      // da null en la policy de RLS y el INSERT se descarta en silencio (sin
      // error visible) — se fuerza el token a mano antes de suscribirse.
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (cancelado) return
      if (session) supabase.realtime.setAuth(session.access_token)

      canal = supabase
        .channel('notificaciones-pedidos')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notificaciones' },
          async (payload) => {
          const nuevaId = payload.new.id as number

          const { data } = await supabase
            .from('notificaciones')
            .select('id, leida_en, creado_en, cotizaciones(id, numero, total, clientes(nombre))')
            .eq('id', nuevaId)
            .limit(1)
            .returns<NotificacionConCotizacion[]>()

          const fila = data?.[0]
          if (!fila) return

          const cotizacion = unoDe(fila.cotizaciones)
          const cliente = unoDe(cotizacion?.clientes ?? null)

          setFilas((prev) => [
            {
              id: fila.id,
              cotizacionId: cotizacion?.id ?? 0,
              numero: cotizacion?.numero ?? '—',
              cliente: cliente?.nombre ?? '—',
              total: cotizacion ? Number(cotizacion.total) : 0,
              leida: false,
              creadoEn: fila.creado_en,
            },
            ...prev,
          ])

          if (!audioCtxRef.current) {
            try {
              audioCtxRef.current = new AudioContext()
            } catch {
              audioCtxRef.current = null
            }
          }
          console.log('[notificaciones] beep disparado para notificacion', fila.id, 'ctx.state=', audioCtxRef.current?.state)
          if (audioCtxRef.current) reproducirBeep(audioCtxRef.current)
        }
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error('Notificaciones: fallo la suscripcion realtime:', status)
          }
        })
    }

    suscribirse()

    return () => {
      cancelado = true
      if (canal) supabase.removeChannel(canal)
    }
  }, [])

  const noLeidas = filas.filter((f) => !f.leida)
  const visibles = filas.slice(0, 5)

  async function alHacerClick(fila: FilaNotificacion) {
    setAbierto(false)
    if (!fila.leida) {
      setFilas((prev) => prev.map((f) => (f.id === fila.id ? { ...f, leida: true } : f)))
      await marcarNotificacionLeida(fila.id)
    }
  }

  async function marcarTodas() {
    setFilas((prev) => prev.map((f) => ({ ...f, leida: true })))
    await marcarTodasNotificacionesLeidas()
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        title="Pedidos del chatbot"
        className="relative flex h-11 w-11 items-center justify-center rounded-md text-[#64748b] dark:text-slate-400 transition-all hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-slate-800 dark:hover:text-emerald-400 active:scale-95"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 8.25h19.5M2.25 8.25v10.5a1.5 1.5 0 0 0 1.5 1.5h16.5a1.5 1.5 0 0 0 1.5-1.5V8.25M2.25 8.25l1.72-3.44a1.5 1.5 0 0 1 1.34-.81h13.38a1.5 1.5 0 0 1 1.34.81l1.72 3.44M12 12.75a2.25 2.25 0 0 1-2.25-2.25"
          />
        </svg>
        {noLeidas.length > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white">
            {noLeidas.length}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute top-14 right-0 z-30 w-80 overflow-hidden rounded-2xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] shadow-xl">
          <div className="flex items-center justify-between gap-2 border-b-2 border-[#f1f5f9] dark:border-slate-800 px-4 py-3">
            <div>
              <p className="text-sm font-extrabold text-[#1e293b] dark:text-slate-100">Pedidos del chatbot</p>
              <p className="text-xs font-medium text-[#64748b] dark:text-slate-400">
                {noLeidas.length > 0 ? `${noLeidas.length} sin revisar` : 'Todo revisado'}
              </p>
            </div>
            {noLeidas.length > 0 && (
              <button
                type="button"
                onClick={marcarTodas}
                className="shrink-0 text-[11px] font-bold text-emerald-600 dark:text-emerald-400"
              >
                Marcar todas
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {filas.length === 0 ? (
              <p className="p-6 text-center text-sm font-medium text-[#64748b] dark:text-slate-400">
                Todavía no hay pedidos del chatbot.
              </p>
            ) : (
              visibles.map((f) => (
                <Link
                  key={f.id}
                  href={`/cotizaciones/${f.cotizacionId}`}
                  onClick={() => alHacerClick(f)}
                  className="flex items-center justify-between gap-3 border-b border-[#f1f5f9] dark:border-slate-800 px-4 py-3 transition-colors hover:bg-emerald-50/60 dark:hover:bg-slate-800/60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#1e293b] dark:text-slate-100">{f.cliente}</p>
                    <p className="text-xs text-[#64748b] dark:text-slate-400">
                      S/ {f.total.toFixed(2)} · {f.numero}
                    </p>
                  </div>
                  {!f.leida && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />}
                </Link>
              ))
            )}
          </div>

          {filas.length > 5 && (
            <Link
              href="/cotizaciones"
              onClick={() => setAbierto(false)}
              className="block border-t-2 border-[#f1f5f9] dark:border-slate-800 px-4 py-3 text-center text-xs font-bold text-emerald-600 dark:text-emerald-400"
            >
              Ver todas las cotizaciones
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
