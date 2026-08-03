import { useState } from 'react'
import { desbloquearAudio } from '../audio/motor'
import { MOODS_LISTA, temaAutoDeCuarto } from '../audio/temas'
import { useAjustes, type FuenteMusica, type MoodMusica } from '../state/ajustesStore'
import { useCuartos } from '../state/cuartosStore'
import { useCuartoPisado } from '../state/useCuartoPisado'
import { useDiseño } from '../state/disenoStore'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'

/**
 * Control de música: popover compacto con la ambiental, volúmenes, fuente, el
 * ambiente global y el TEMA de un cuarto (auto por su app → elegido a mano →
 * silencio). Se usa en el header de las plantillas (con `cuartoId`) y en el HUD
 * de la casa (sin él: entonces aplica al cuarto que pisa el personaje, que es
 * justo el que suena). El panel usa `ui-panel-glass` como los demás flotantes:
 * hereda el tema, el modo claro/oscuro y el vidrio ajustable.
 */
export function ControlMusica({
  cuartoId,
  className = '',
  botonClase = 'rounded-lg bg-white/10 px-2.5 py-1.5 text-sm font-semibold transition hover:bg-white/20',
}: {
  cuartoId?: string
  className?: string
  /** Clases del botón: el HUD pasa las suyas (`ui-hud`) para seguir el tema. */
  botonClase?: string
}) {
  const t = useT()
  const [abierto, setAbierto] = useState(false)
  // Sin cuarto fijo (HUD): el del personaje, y solo se muestrea con el panel abierto.
  const pisado = useCuartoPisado(abierto && !cuartoId)
  const idCuarto = cuartoId ?? pisado ?? undefined
  const musicaAmbiental = useAjustes((s) => s.musicaAmbiental)
  const setMusicaAmbiental = useAjustes((s) => s.setMusicaAmbiental)
  const musicaFuente = useAjustes((s) => s.musicaFuente)
  const setMusicaFuente = useAjustes((s) => s.setMusicaFuente)
  const musicaMood = useAjustes((s) => s.musicaMood)
  const setMusicaMood = useAjustes((s) => s.setMusicaMood)
  const musicaVolumen = useAjustes((s) => s.musicaVolumen)
  const setMusicaVolumen = useAjustes((s) => s.setMusicaVolumen)
  const sfxVolumen = useAjustes((s) => s.sfxVolumen)
  const setSfxVolumen = useAjustes((s) => s.setSfxVolumen)
  const hudMusica = useAjustes((s) => s.hudMusica)
  const setHudMusica = useAjustes((s) => s.setHudMusica)
  const setTemaMusical = useCuartos((s) => s.setTemaMusical)
  const temaGuardado = useCuartos((s) =>
    idCuarto ? s.cuartos.find((c) => c.id === idCuarto)?.temaMusical : undefined,
  )
  // Suscripción al tema derivado (escalar): mover objetos no re-renderiza esto.
  const temaAuto = useDiseño((s) => (idCuarto ? temaAutoDeCuarto(idCuarto, s.objetos) : null))

  const etiquetaMood = (id: MoodMusica) =>
    t(`ajustes.musica.mood.${id}`, MOODS_LISTA.find((m) => m.id === id)?.defecto ?? id)

  const fuentes: { id: FuenteMusica; label: string }[] = [
    { id: 'generada', label: t('ajustes.musica.fuente.generada', 'Generada') },
    { id: 'pistas', label: t('ajustes.musica.fuente.pistas', 'Mis pistas') },
    { id: 'sistema', label: t('ajustes.musica.fuente.sistema', 'Sistema') },
  ]

  return (
    <div className={`relative shrink-0 ${className}`}>
      <button
        type="button"
        onClick={() => {
          // El clic es un gesto: aprovecha para desbloquear el autoplay.
          desbloquearAudio()
          setAbierto((v) => !v)
        }}
        title={t('musica.control', 'Música')}
        className={`${botonClase} ${musicaAmbiental ? '' : 'opacity-50'}`}
      >
        <Icono nombre="musica" />
      </button>
      {abierto && (
        <>
          {/* Fondo invisible: clic fuera cierra el popover. */}
          <button
            type="button"
            aria-label={t('musica.cerrar', 'Cerrar')}
            onClick={() => setAbierto(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="ui-panel-glass ui-pop absolute right-0 z-50 mt-2 w-72 space-y-3 rounded-xl border border-white/10 p-3 text-left shadow-xl backdrop-blur-md">
            {/* Música ambiental sí/no */}
            <button
              type="button"
              onClick={() => {
                desbloquearAudio()
                setMusicaAmbiental(!musicaAmbiental)
              }}
              className={`flex w-full min-w-0 items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs font-semibold transition ${
                musicaAmbiental
                  ? 'ui-accent-bg border-transparent'
                  : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10'
              }`}
            >
              <span className="shrink-0 text-[11px]">{musicaAmbiental ? '✓' : '○'}</span>
              <span className="min-w-0 flex-1 truncate">
                {t('ajustes.musica.ambiental', 'Música ambiental en la casa')}
              </span>
            </button>

            {/* Tema del cuarto abierto o, desde el HUD, del que estás pisando */}
            {idCuarto && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
                  {t('musica.temaCuarto', 'Tema de este cuarto')}
                </p>
                <select
                  value={temaGuardado ?? ''}
                  onChange={(e) => {
                    desbloquearAudio()
                    const v = e.target.value
                    void setTemaMusical(
                      idCuarto,
                      v === '' ? undefined : (v as MoodMusica | 'silencio'),
                    )
                  }}
                  className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white/85 focus:outline-none"
                >
                  <option value="">
                    {temaAuto
                      ? t('musica.temaCuarto.autoCon', 'Auto · {tema}', {
                          tema: etiquetaMood(temaAuto),
                        })
                      : t('musica.temaCuarto.auto', 'Auto (ambiente global)')}
                  </option>
                  {MOODS_LISTA.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.emoji} {etiquetaMood(m.id)}
                    </option>
                  ))}
                  <option value="silencio">
                    🔇 {t('musica.temaCuarto.silencio', 'Silencio')}
                  </option>
                </select>
                <p className="text-[10px] leading-snug text-white/40">
                  {t('musica.temaCuartoDesc', 'Suena al abrir el cuarto o al caminar dentro.')}
                </p>
              </div>
            )}

            {/* Fuente */}
            <div className="grid grid-cols-3 gap-1.5">
              {fuentes.map((f) => {
                const activo = musicaFuente === f.id
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setMusicaFuente(f.id)}
                    className={`truncate rounded-md border px-1.5 py-1.5 text-[11px] font-semibold transition ${
                      activo
                        ? 'ui-accent-bg border-transparent'
                        : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    {f.label}
                  </button>
                )
              })}
            </div>

            {/* Ambiente global (solo con la música generada) */}
            {musicaFuente === 'generada' && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
                  {t('musica.ambienteGlobal', 'Ambiente de la casa')}
                </p>
                <select
                  value={musicaMood}
                  onChange={(e) => {
                    desbloquearAudio()
                    setMusicaMood(e.target.value as MoodMusica)
                  }}
                  className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white/85 focus:outline-none"
                >
                  {MOODS_LISTA.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.emoji} {etiquetaMood(m.id)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Volúmenes */}
            <div className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5">
              <div className="flex items-center gap-2">
                <span className="flex-1 truncate text-xs text-white/75">
                  {t('ajustes.musica.volumen', 'Volumen')}
                </span>
                <span className="text-[10px] tabular-nums text-white/40">
                  {Math.round(musicaVolumen * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={musicaVolumen}
                onChange={(e) => setMusicaVolumen(parseFloat(e.target.value))}
                className="mt-1 w-full"
                style={{ accentColor: 'var(--ui-accent)' }}
              />
            </div>
            <div className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5">
              <div className="flex items-center gap-2">
                <span className="flex-1 truncate text-xs text-white/75">
                  {t('ajustes.musica.sfx', 'Sonidos de acciones')}
                </span>
                <span className="text-[10px] tabular-nums text-white/40">
                  {sfxVolumen === 0
                    ? t('ajustes.musica.sfxOff', 'Apagados')
                    : `${Math.round(sfxVolumen * 100)}%`}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={sfxVolumen}
                onChange={(e) => setSfxVolumen(parseFloat(e.target.value))}
                className="mt-1 w-full"
                style={{ accentColor: 'var(--ui-accent)' }}
              />
            </div>

            {/* Quitar el botón del HUD desde el propio control (vuelve en Configuraciones). */}
            <div className="space-y-1 border-t border-white/10 pt-2">
              <button
                type="button"
                onClick={() => {
                  setHudMusica(!hudMusica)
                  setAbierto(false)
                }}
                className={`flex w-full min-w-0 items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs font-semibold transition ${
                  hudMusica
                    ? 'ui-accent-bg border-transparent'
                    : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10'
                }`}
              >
                <span className="shrink-0 text-[11px]">{hudMusica ? '✓' : '○'}</span>
                <span className="min-w-0 flex-1 truncate">
                  {t('ajustes.musica.hud', 'Mostrar en la pantalla principal')}
                </span>
              </button>
              <p className="text-[10px] leading-snug text-white/40">
                {t(
                  'musica.hudNota',
                  'Apagado, la música se ajusta en Editor › Configuraciones › Música.',
                )}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
