import { useRef, useState } from 'react'
import type { PerfilSueno } from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { fotoAAdjunta, verificarEvidencia, type Veredicto } from './evidencia'

/**
 * Ajuste y reto de la evidencia del despertador: en vez del botón «Detener»,
 * la alarma pide una foto que demuestre una tarea (tender la cama, salir al
 * patio…) y solo se calla si la IA la aprueba.
 */

/** Ajuste del reto: el interruptor y la tarea que habrá que demostrar. */
export function EvidenciaConfig({
  activa,
  tarea,
  onCambio,
  on,
  off,
}: {
  activa: boolean
  tarea: string
  onCambio: (cambios: Partial<PerfilSueno>) => void
  on: string
  off: string
}) {
  const t = useT()
  const [probando, setProbando] = useState(false)
  return (
    <div>
      <div className="flex items-center justify-between gap-3 rounded-lg bg-black/25 px-3 py-2.5">
        <span className="text-sm font-semibold">
          <Icono nombre="candado" /> {t('descanso.evid.titulo', 'Desbloquear con evidencia')}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={activa}
          onClick={() => onCambio({ evidenciaActiva: !activa })}
          className={`shrink-0 rounded-lg border px-3 py-1 text-xs font-bold transition ${
            activa
              ? 'border-amber-400/60 bg-amber-400/15 text-amber-400'
              : 'border-white/15 text-white/50 hover:text-white/80'
          }`}
        >
          {activa ? on : off}
        </button>
      </div>
      {activa && (
        <div className="mt-1 space-y-1">
          <input
            value={tarea}
            onChange={(e) => onCambio({ evidenciaTarea: e.target.value })}
            placeholder={t('descanso.evid.ph', 'Ej. mi cama tendida')}
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-white/30"
          />
          <p className="text-xs text-white/40">
            {tarea.trim()
              ? t('descanso.evid.hint', 'Al sonar tendrás que enviar una foto de «{tarea}»; la IA la revisa y solo entonces se apaga.', { tarea: tarea.trim() })
              : t('descanso.evid.falta', 'Escribe qué debe mostrar la foto para poder apagar la alarma.')}
          </p>
          {tarea.trim() && (
            <button
              type="button"
              onClick={() => setProbando(true)}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/60 transition hover:bg-white/10"
            >
              <Icono nombre="lupa" /> {t('descanso.evid.probar', 'Probar ahora')}
            </button>
          )}
        </div>
      )}
      {/* Ensayo del reto sin esperar a la hora: nada de esto toca la alarma. */}
      {probando && (
        <div className="ui-noche fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-black/90 backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/40">
            {t('descanso.evid.ensayo', 'Prueba del reto')}
          </p>
          <RetoEvidencia tarea={tarea.trim()} onDetener={() => setProbando(false)} prueba />
        </div>
      )}
    </div>
  )
}

/**
 * Reto dentro de la alarma sonando. `onDetener` apaga: se llama solo cuando la
 * IA aprueba la foto, o desde el escape que aparece si la revisión falla —
 * quedarse encerrado con la alarma sonando por un error de red no es el trato.
 *
 * En modo `prueba` nada suena, así que aprobar no cierra solo: se enseña el
 * veredicto (que es justo lo que se está ensayando) y el usuario cierra.
 */
export function RetoEvidencia({
  tarea,
  onDetener,
  prueba = false,
}: {
  tarea: string
  onDetener: () => void
  prueba?: boolean
}) {
  const t = useT()
  const inputRef = useRef<HTMLInputElement>(null)
  const [revisando, setRevisando] = useState(false)
  const [veredicto, setVeredicto] = useState<Veredicto | null>(null)
  const [error, setError] = useState('')

  const enviar = async (archivo: File) => {
    setRevisando(true)
    setError('')
    setVeredicto(null)
    try {
      const v = await verificarEvidencia(tarea, await fotoAAdjunta(archivo))
      setVeredicto(v)
      if (v.cumple && !prueba) onDetener()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRevisando(false)
    }
  }

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-3 px-6 text-center">
      <p className="text-sm text-white/70">
        {t('descanso.evid.reto', 'Para apagarla, demuestra con una foto:')}
      </p>
      <p className="text-lg font-bold text-amber-300">{tarea}</p>

      {veredicto && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            veredicto.cumple ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'
          }`}
        >
          {veredicto.motivo}
        </p>
      )}
      {error && <p className="text-sm text-rose-300">{t('descanso.evid.error', 'No se pudo revisar la foto: {e}', { e: error })}</p>}

      <button
        type="button"
        disabled={revisando}
        onClick={() => inputRef.current?.click()}
        className="rounded-full bg-orange-600 px-10 py-3 text-lg font-black texto-cta transition hover:brightness-110 disabled:opacity-60"
      >
        <Icono nombre="foto" />{' '}
        {revisando
          ? t('descanso.evid.revisando', 'Revisando tu foto…')
          : veredicto || error
            ? t('descanso.evid.otra', 'Tomar otra foto')
            : t('descanso.evid.foto', 'Tomar la foto')}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void enviar(file)
          e.target.value = ''
        }}
      />

      {(error || prueba) && (
        <button type="button" onClick={onDetener} className="text-xs text-white/40 underline hover:text-white/70">
          {prueba
            ? t('descanso.evid.cerrar', 'Cerrar la prueba')
            : t('descanso.evid.apagar', 'Apagar sin evidencia')}
        </button>
      )}
    </div>
  )
}
