import { useState } from 'react'
import type { PistaAudio } from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { pedirTexto, confirmar } from '../../core/state/confirmarStore'
import { ALTO_CARRIL, ALTO_REGLA, CARPETAS_INSTRUMENTOS, MAX_PISTAS, PALETA_PISTAS, familiaDe } from './constantes'

/** m:ss de una toma (para la lista de clips). */
const duracionCorta = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/** La lista de pistas: instrumento, volumen, mute/solo y cuál está activa. */
export function Pistas({
  pistas,
  activa,
  onActiva,
  onCambiar,
  onBorrar,
  onAgregar,
  onAgregarAudio,
}: {
  pistas: PistaAudio[]
  activa: string
  onActiva: (pistaId: string) => void
  onCambiar: (pistaId: string, patch: Partial<PistaAudio>) => void
  onBorrar: (pistaId: string) => void
  onAgregar: () => void
  /** Crea una pista de clips de micrófono (`tipo: 'audio'`). */
  onAgregarAudio: () => void
}) {
  const t = useT()
  const nombreCarpeta: Record<(typeof CARPETAS_INSTRUMENTOS)[number]['clave'], string> = {
    teclados: t('audio.carpeta.teclados', 'Teclados'),
    cuerdas: t('audio.carpeta.cuerdas', 'Cuerdas'),
    vientos: t('audio.carpeta.vientos', 'Vientos'),
    baterias: t('audio.carpeta.baterias', 'Baterías'),
    voz: t('audio.carpeta.voz', 'Voz'),
  }

  const pistaActiva = pistas.find((p) => p.pistaId === activa)
  // Plegada, la columna queda en una tirita con el botón de reabrir (más roll a la vista).
  const [plegada, setPlegada] = useState(false)

  if (plegada) {
    return (
      <div className="flex w-7 shrink-0 flex-col border-e border-white/10">
        <div className="shrink-0 border-b border-white/5" style={{ height: ALTO_REGLA }} />
        <button
          type="button"
          onClick={() => setPlegada(false)}
          aria-label={t('audio.pistas.mostrar', 'Mostrar las pistas')}
          title={t('audio.pistas.mostrar', 'Mostrar las pistas')}
          className="flex-1 text-white/40 transition hover:bg-white/5 hover:text-white/80"
        >
          <Icono nombre="siguiente" />
        </button>
      </div>
    )
  }

  return (
    // Columna izquierda del timeline. Las cabeceras van a ALTURA FIJA
    // (ALTO_CARRIL, tras un hueco de ALTO_REGLA) para quedar alineadas con el
    // carril que el canvas dibuja a la derecha para cada pista.
    <div className="flex w-36 shrink-0 flex-col border-e border-white/10 sm:w-44">
      <div className="flex shrink-0 items-center justify-end border-b border-white/5" style={{ height: ALTO_REGLA }}>
        <button
          type="button"
          onClick={() => setPlegada(true)}
          aria-label={t('audio.pistas.plegar', 'Plegar las pistas')}
          title={t('audio.pistas.plegar', 'Plegar las pistas')}
          className="px-1.5 text-white/40 transition hover:text-white/80"
        >
          <Icono nombre="volver" />
        </button>
      </div>
      {pistas.map((pista, i) => {
        const esActiva = pista.pistaId === activa
        return (
          <div
            key={pista.pistaId}
            className={`flex shrink-0 items-center gap-1.5 px-1.5 ${esActiva ? 'bg-white/10' : 'hover:bg-white/[0.04]'}`}
            style={{ height: ALTO_CARRIL }}
          >
            <button
              type="button"
              onClick={() => onActiva(pista.pistaId)}
              className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: PALETA_PISTAS[i % PALETA_PISTAS.length] }}
              />
              {pista.tipo === 'audio' && (
                <span className="shrink-0 text-[10px] text-white/50">
                  <Icono nombre="microfono" />
                </span>
              )}
              <span className="truncate text-xs font-semibold">{pista.nombre}</span>
            </button>
            <button
              type="button"
              onClick={() => onCambiar(pista.pistaId, { silenciada: !pista.silenciada })}
              aria-label={t('audio.pistas.mute', 'Silenciar')}
              title={t('audio.pistas.mute', 'Silenciar')}
              className={`rounded px-1.5 text-xs font-bold transition ${
                pista.silenciada ? 'bg-red-400/25 text-red-300' : 'bg-white/10 text-white/50 hover:bg-white/15'
              }`}
            >
              M
            </button>
            <button
              type="button"
              onClick={() => onCambiar(pista.pistaId, { solo: !pista.solo })}
              aria-label={t('audio.pistas.solo', 'Solo')}
              title={t('audio.pistas.solo', 'Solo')}
              className={`rounded px-1.5 text-xs font-bold transition ${
                pista.solo ? 'bg-amber-400/25 text-amber-300' : 'bg-white/10 text-white/50 hover:bg-white/15'
              }`}
            >
              S
            </button>
          </div>
        )
      })}
      {pistas.length < MAX_PISTAS && (
        <div className="flex shrink-0 border-t border-white/5">
          <button
            type="button"
            onClick={onAgregar}
            className="min-w-0 flex-1 px-2 py-1 text-xs text-white/50 transition hover:bg-white/5 hover:text-white/80"
          >
            <Icono nombre="agregar" /> {t('audio.pistas.agregar', 'Añadir pista')}
          </button>
          <button
            type="button"
            onClick={onAgregarAudio}
            aria-label={t('audio.grab.agregarPista', 'Pista de audio (micrófono)')}
            title={t('audio.grab.agregarPista', 'Pista de audio (micrófono)')}
            className="shrink-0 border-s border-white/5 px-2 py-1 text-xs text-white/50 transition hover:bg-white/5 hover:text-white/80"
          >
            <Icono nombre="microfono" />
          </button>
        </div>
      )}
      {/* Controles de la pista ACTIVA (debajo de las cabeceras: aquí ya no hay que alinear nada). */}
      {pistaActiva && (
        <div className="min-h-0 space-y-1 overflow-y-auto border-t border-white/10 px-1.5 py-1.5">
          {pistaActiva.tipo === 'audio' ? (
            // La pista de audio no tiene instrumento: en su lugar, sus tomas.
            <ul className="space-y-1">
              {(pistaActiva.clips ?? []).map((clip) => (
                <li key={clip.clipId} className="flex items-center gap-1 text-xs">
                  <span className="min-w-0 flex-1 truncate">{clip.nombre}</span>
                  <span className="shrink-0 text-white/40">{duracionCorta(clip.duracionSeg)}</span>
                  <button
                    type="button"
                    onClick={() =>
                      void confirmar({
                        titulo: t('audio.grab.quitarClip', 'Quitar la toma de la pista'),
                        mensaje: t('audio.grab.quitarClipMsg2', 'La grabación sigue disponible en la sección Grabaciones de la pestaña Canciones.'),
                      }).then((si) => {
                        if (si)
                          onCambiar(pistaActiva.pistaId, {
                            clips: (pistaActiva.clips ?? []).filter((c) => c.clipId !== clip.clipId),
                          })
                      })
                    }
                    aria-label={t('audio.grab.quitarClip', 'Quitar la toma de la pista')}
                    title={t('audio.grab.quitarClip', 'Quitar la toma de la pista')}
                    className="shrink-0 rounded px-1 text-white/35 transition hover:bg-white/10 hover:text-red-400"
                  >
                    <Icono nombre="basura" />
                  </button>
                </li>
              ))}
              {(pistaActiva.clips ?? []).length === 0 && (
                <li className="text-xs text-white/40">{t('audio.grab.sinClips', 'Sin tomas: pulsa el botón de grabar.')}</li>
              )}
            </ul>
          ) : (
            <select
              value={familiaDe(pistaActiva.instrumento)}
              aria-label={t('audio.pistas.instrumento', 'Instrumento')}
              onChange={(e) => {
                // La pista elige la FAMILIA; la variante se elige en el panel del sinte.
                const carpeta = CARPETAS_INSTRUMENTOS.find((c) => c.clave === e.target.value)
                if (carpeta) onCambiar(pistaActiva.pistaId, { instrumento: carpeta.instrumentos[0] })
              }}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-1.5 py-1 text-xs outline-none"
            >
              {CARPETAS_INSTRUMENTOS.map((carpeta) => (
                <option key={carpeta.clave} value={carpeta.clave}>
                  {nombreCarpeta[carpeta.clave]}
                </option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-1">
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={pistaActiva.volumen}
              aria-label={t('audio.pistas.volumen', 'Volumen')}
              onChange={(e) => onCambiar(pistaActiva.pistaId, { volumen: Number(e.target.value) })}
              className="min-w-0 flex-1"
            />
            <button
              type="button"
              onClick={() =>
                void pedirTexto({
                  titulo: t('audio.pistas.renombrar', 'Renombrar pista'),
                  valor: pistaActiva.nombre,
                }).then((nombre) => {
                  if (nombre) onCambiar(pistaActiva.pistaId, { nombre })
                })
              }
              aria-label={t('audio.pistas.renombrar', 'Renombrar pista')}
              title={t('audio.pistas.renombrar', 'Renombrar pista')}
              className="rounded px-1 text-white/35 transition hover:bg-white/10 hover:text-white/80"
            >
              <Icono nombre="editar" />
            </button>
            <button
              type="button"
              onClick={() =>
                void confirmar({
                  titulo: t('audio.pistas.borrar', 'Borrar la pista'),
                  mensaje: t('audio.pistas.borrarMsg', 'Se pierden sus notas.'),
                  peligro: true,
                }).then((si) => {
                  if (si) onBorrar(pistaActiva.pistaId)
                })
              }
              aria-label={t('audio.pistas.borrar', 'Borrar la pista')}
              title={t('audio.pistas.borrar', 'Borrar la pista')}
              className="rounded px-1 text-white/35 transition hover:bg-white/10 hover:text-red-400"
            >
              <Icono nombre="basura" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
