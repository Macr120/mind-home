import { EMOCIONES, type EmocionId } from '../../core/chat/emociones'
import type { CamaraPelicula, EscenaActor } from '../../core/data/db'
import { PRESETS_ANIMACION, type PresetAnimacionId } from '../../core/house/animacion'
import { useT } from '../../core/i18n/useT'
import { aplicarCamara, capturarCamara, useCam } from '../../core/state/cameraStore'
import { ES_JUGADOR } from '../../core/state/peliculaStore'
import { playerPos } from '../../core/state/playerPosition'
import { Icono } from '../../core/ui/iconos/Icono'
import { BotonSecundario, Campo } from '../_shared/ui'
import { nombreActor, puntoActor } from './actores'
import { Chip } from './Secciones'

/**
 * Secciones del panel del clip propias del modo película: la cámara de un
 * plano y la escena de un actor. Viven aparte de `Secciones.tsx` porque hablan
 * con la casa (cámara, posición del avatar), no solo con el proyecto.
 */

type FuenteEscena3d = { tipo: 'escena3d'; cam: CamaraPelicula; camFin?: CamaraPelicula }

/** Cámara de un plano: capturar la actual, ir a ella, paneo hasta un final, vistas y giro (el cubo del HUD no está). */
export function SeccionCamara({ fuente, onCambiar }: { fuente: FuenteEscena3d; onCambiar: (f: FuenteEscena3d) => void }) {
  const t = useT()
  const vista = useCam((s) => s.vista)
  const setVista = useCam((s) => s.setVista)
  const rotar = useCam((s) => s.rotar)
  const centrarIso = useCam((s) => s.centrarIso)
  const vistas = [
    { id: 'iso', etiqueta: t('video.pelicula.vista.iso', 'Isométrica') },
    { id: 'tercera', etiqueta: t('video.pelicula.vista.tercera', 'Tercera persona') },
    { id: 'primera', etiqueta: t('video.pelicula.vista.primera', 'Primera persona') },
  ] as const
  return (
    <>
      <Campo etiqueta={t('video.pelicula.camara', 'Cámara')}>
        <div className="flex flex-wrap gap-1.5">
          <BotonSecundario pequeno onClick={() => onCambiar({ ...fuente, cam: capturarCamara() })}>
            <Icono nombre="foto" /> {t('video.pelicula.usarCamara', 'Usar la cámara actual')}
          </BotonSecundario>
          <BotonSecundario pequeno onClick={() => aplicarCamara(fuente.cam, false)}>
            <Icono nombre="ver" /> {t('video.pelicula.irCamara', 'Ir a esta cámara')}
          </BotonSecundario>
        </div>
      </Campo>
      <Campo etiqueta={t('video.pelicula.paneo', 'Paneo: fin de plano')}>
        <div className="flex flex-wrap gap-1.5">
          <Chip
            activo={!!fuente.camFin}
            onClick={() => onCambiar(fuente.camFin ? { tipo: 'escena3d', cam: fuente.cam } : { ...fuente, camFin: capturarCamara() })}
          >
            {fuente.camFin ? t('video.pelicula.paneoQuitar', 'Quitar el paneo') : t('video.pelicula.paneoPoner', 'Terminar en la cámara actual')}
          </Chip>
          {fuente.camFin && (
            <>
              <BotonSecundario pequeno onClick={() => onCambiar({ ...fuente, camFin: capturarCamara() })}>
                <Icono nombre="foto" /> {t('video.pelicula.usarCamaraFin', 'Usar la actual como final')}
              </BotonSecundario>
              <BotonSecundario pequeno onClick={() => fuente.camFin && aplicarCamara(fuente.camFin, false)}>
                <Icono nombre="ver" /> {t('video.pelicula.irFin', 'Ir al final')}
              </BotonSecundario>
            </>
          )}
        </div>
      </Campo>
      <Campo etiqueta={t('video.pelicula.vistas', 'Vista')}>
        <div className="flex flex-wrap items-center gap-1.5">
          {vistas.map((v) => (
            <Chip key={v.id} activo={vista === v.id} onClick={() => setVista(v.id)}>
              {v.etiqueta}
            </Chip>
          ))}
          <BotonSecundario
            pequeno
            onClick={() => rotar(-1)}
            aria-label={t('nav3d.rotarIzq', 'Rotar vista a la izquierda')}
            title={t('nav3d.rotarIzq', 'Rotar vista a la izquierda')}
          >
            <Icono nombre="rotar-izq" />
          </BotonSecundario>
          <BotonSecundario
            pequeno
            onClick={() => rotar(1)}
            aria-label={t('nav3d.rotarDer', 'Rotar vista a la derecha')}
            title={t('nav3d.rotarDer', 'Rotar vista a la derecha')}
          >
            <Icono nombre="rotar-der" />
          </BotonSecundario>
          <BotonSecundario pequeno onClick={() => centrarIso([playerPos.x, playerPos.y, playerPos.z])}>
            <Icono nombre="centrar" /> {t('video.pelicula.centrar', 'Centrar en el avatar')}
          </BotonSecundario>
        </div>
        <p className="mt-1 text-[11px] text-white/45">{t('video.pelicula.sigueAvatar', 'En 1ª/3ª persona la cámara sigue a tu avatar')}</p>
      </Campo>
    </>
  )
}

/** La escena de un actor en un clip: dónde está, cómo llega, a quién mira y sus reacciones. */
export function SeccionEscena({
  asistenteId,
  escena,
  actores,
  onCambiar,
}: {
  asistenteId: string
  escena: EscenaActor
  /** Los asistentes del proyecto (para «Mirar a»); tu avatar se añade aquí. */
  actores: string[]
  onCambiar: (patch: Partial<EscenaActor>) => void
}) {
  const t = useT()
  const mirar = escena.mirar ?? 'camara'
  const otros = [ES_JUGADOR, ...actores].filter((id) => id !== asistenteId)
  return (
    <>
      <Campo etiqueta={t('video.pelicula.posicion', 'Posición')}>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-white/70">
          <span className="font-mono tabular-nums">
            {escena.x.toFixed(1)}, {escena.z.toFixed(1)}
          </span>
          <BotonSecundario pequeno onClick={() => onCambiar(puntoActor(asistenteId))}>
            <Icono nombre="ubicacion" /> {t('video.pelicula.aqui', 'Aquí')}
          </BotonSecundario>
          <Chip activo={!!escena.llegar} onClick={() => onCambiar({ llegar: escena.llegar ? undefined : true })}>
            {t('video.pelicula.llegar', 'Llegar caminando')}
          </Chip>
        </div>
        <p className="mt-1 text-[11px] text-white/45">
          <Icono nombre="mapa" /> {t('video.pelicula.tocarMapaAyuda', 'Toca el mapa para colocarlo ahí; camina en línea recta, atravesando muros.')}
        </p>
      </Campo>
      <Campo etiqueta={t('video.pelicula.mirar', 'Mirar a')}>
        <div className="flex flex-wrap gap-1.5">
          <Chip activo={mirar === 'camara'} onClick={() => onCambiar({ mirar: undefined })}>
            {t('video.pelicula.mirar.camara', 'La cámara')}
          </Chip>
          <Chip activo={mirar === 'rumbo'} onClick={() => onCambiar({ mirar: 'rumbo' })}>
            {t('video.pelicula.mirar.rumbo', 'Hacia donde camina')}
          </Chip>
          {otros.map((id) => (
            <Chip key={id} activo={typeof mirar === 'object' && mirar.actor === id} onClick={() => onCambiar({ mirar: { actor: id } })}>
              {nombreActor(t, id)}
            </Chip>
          ))}
        </div>
      </Campo>
      <Campo etiqueta={t('video.pelicula.emocion', 'Emoción')}>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(EMOCIONES) as EmocionId[]).map((e) => (
            <Chip key={e} activo={escena.emocion === e} onClick={() => onCambiar({ emocion: escena.emocion === e ? undefined : e })}>
              <Icono emoji={EMOCIONES[e].emoji} />
            </Chip>
          ))}
        </div>
      </Campo>
      <Campo etiqueta={t('video.pelicula.animacion', 'Animación')}>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS_ANIMACION.filter((p) => p.id !== 'vida').map((p) => {
            const id = p.id as Exclude<PresetAnimacionId, 'vida'>
            return (
              <Chip key={id} activo={escena.anim === id} onClick={() => onCambiar({ anim: escena.anim === id ? undefined : id })}>
                <Icono emoji={p.emoji} /> {t(`video.pelicula.preset.${id}`, p.nombre)}
              </Chip>
            )
          })}
        </div>
      </Campo>
      <p className="text-[11px] text-white/45">
        {t('video.pelicula.sinGlobo', 'Los globos no salen en el archivo exportado: genera subtítulos')} · {t('video.pelicula.unGlobo', 'Solo se muestra un globo a la vez')}
      </p>
    </>
  )
}
