import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import { Modal } from '../_shared/ui'

export type OpcionAnadir =
  | 'clip'
  | 'fondo'
  | 'imagen'
  | 'texto'
  | 'voz'
  | 'musica'
  | 'sfx'
  | 'avatar'
  | 'camara'
  | 'personaje'
  | 'guion'
  | 'grabarCamara'
  | 'grabarAudio'
  | 'mascaraAr'
  | 'personajeAr'
  | 'transiciones'
  | 'animacion3d'

interface Opcion {
  id: OpcionAnadir
  icono: NombreIcono
  etiqueta: string
  principal?: boolean
}

/** Lo que hace de este menú un estudio de cine: el rodaje (cámara, marionetas y guion) aparte del montaje. */
const RODAJE = new Set<OpcionAnadir>(['camara', 'personaje', 'guion'])
/** Sin mapa no hay cámara ni marionetas; el guion (voces y líneas) sí existe en un video. */
const SOLO_PELICULA = new Set<OpcionAnadir>(['camara', 'personaje'])
/** Herramientas que no añaden clips. */
const SIN_CLIP = new Set<OpcionAnadir>(['guion', 'transiciones'])
/** Sin sentido bajo el mapa (fondo, avatar PIP, una animación dentro de otra) o fuera de lugar en un rodaje (grabar con la cámara, overlays AR). */
const SIN_PELICULA = new Set<OpcionAnadir>(['fondo', 'avatar', 'animacion3d', 'grabarCamara', 'mascaraAr', 'personajeAr'])
const CON_DISPOSITIVOS = new Set<OpcionAnadir>(['grabarCamara', 'grabarAudio', 'mascaraAr', 'personajeAr'])

/**
 * El menú «Añadir»: cada opción crea un clip en el cursor, en su pista. En el
 * modo película es el «Estudio de cine»: Rodaje (Cámara con sus movimientos,
 * Personaje, Guion de la obra) y Montaje (lo de siempre, sin lo que no aplica).
 */
export function MenuAnadir({
  onElegir,
  onCerrar,
  tope,
  topePrincipal,
  pelicula = false,
}: {
  onElegir: (opcion: OpcionAnadir) => void
  onCerrar: () => void
  /** Ya no caben más clips en total. */
  tope: boolean
  /** Ya no caben más clips en la pista principal. */
  topePrincipal: boolean
  pelicula?: boolean
}) {
  const t = useT()
  const todas: Opcion[] = [
    { id: 'camara', icono: 'foto', etiqueta: t('video.pelicula.camara', 'Cámara'), principal: true },
    { id: 'personaje', icono: 'persona', etiqueta: t('video.pelicula.personaje', 'Personaje') },
    { id: 'clip', icono: 'pelicula', etiqueta: t('video.guion.desdeMedio', 'Clip o imagen'), principal: true },
    { id: 'animacion3d', icono: 'cubo-vistas', etiqueta: t('video.tab.animacion3d', 'Animación 3D'), principal: true },
    { id: 'grabarCamara', icono: 'foto', etiqueta: t('video.anadir.grabarCamara', 'Grabar con la cámara'), principal: true },
    { id: 'grabarAudio', icono: 'microfono', etiqueta: t('video.anadir.grabarAudio', 'Grabar audio') },
    { id: 'mascaraAr', icono: 'mascara', etiqueta: t('video.anadir.mascaraAr', 'Máscara AR'), principal: true },
    { id: 'personajeAr', icono: 'chat-ar', etiqueta: t('video.anadir.personajeAr', 'Personaje AR'), principal: true },
    { id: 'fondo', icono: 'imagen', etiqueta: t('video.anadir.fondo', 'Fondo') },
    { id: 'imagen', icono: 'foto', etiqueta: t('video.anadir.imagen', 'Imagen superpuesta') },
    { id: 'texto', icono: 'letra', etiqueta: t('video.anadir.texto', 'Texto') },
    { id: 'voz', icono: 'microfono', etiqueta: t('video.anadir.narracion', 'Narración') },
    { id: 'musica', icono: 'musica', etiqueta: t('video.anadir.musica', 'Música') },
    { id: 'sfx', icono: 'bocina', etiqueta: t('video.anadir.sonido', 'Sonido') },
    { id: 'avatar', icono: 'persona', etiqueta: t('video.anadir.avatar', 'Avatar') },
    { id: 'guion', icono: 'rol', etiqueta: t('video.pelicula.guion', 'Guion') },
    { id: 'transiciones', icono: 'transicion', etiqueta: t('video.anadir.transiciones', 'Transiciones') },
  ]
  // Cámara y micrófono del equipo (y los overlays AR) solo donde existen.
  const conDispositivos = typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function'
  const opciones = todas.filter((o) => {
    if (CON_DISPOSITIVOS.has(o.id) && !conDispositivos) return false
    return pelicula ? !SIN_PELICULA.has(o.id) : !SOLO_PELICULA.has(o.id)
  })
  const rejilla = (lista: Opcion[]) => (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {lista.map((o) => {
        // Guion y transiciones editan lo que ya hay: no les afecta el tope de clips.
        const bloqueada = !SIN_CLIP.has(o.id) && (tope || (o.principal && topePrincipal))
        return (
          <button
            key={o.id}
            type="button"
            disabled={bloqueada}
            title={bloqueada ? t('video.anadir.tope', 'No caben más clips') : undefined}
            onClick={() => onElegir(o.id)}
            className="ui-boton flex h-16 flex-col items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/5 text-[11px] transition hover:bg-white/10 disabled:opacity-30"
          >
            <span className="text-xl">
              <Icono nombre={o.icono} />
            </span>
            {o.etiqueta}
          </button>
        )
      })}
    </div>
  )
  return (
    <Modal
      titulo={pelicula ? t('video.pelicula.estudio', 'Estudio de cine') : t('video.anadir.titulo', 'Añadir y editar')}
      onCerrar={onCerrar}
      ancho="max-w-lg"
    >
      {pelicula ? (
        <>
          <p className="text-[11px] font-semibold text-white/60">{t('video.pelicula.rodaje', 'Rodaje')}</p>
          {rejilla(opciones.filter((o) => RODAJE.has(o.id)))}
          <p className="text-[11px] font-semibold text-white/60">{t('video.pelicula.montaje', 'Montaje')}</p>
          {rejilla(opciones.filter((o) => !RODAJE.has(o.id)))}
        </>
      ) : (
        rejilla(opciones)
      )}
    </Modal>
  )
}
