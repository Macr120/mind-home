import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import { Modal } from '../_shared/ui'

export type OpcionAnadir =
  | 'clip'
  | 'color'
  | 'fondo'
  | 'imagen'
  | 'texto'
  | 'voz'
  | 'musica'
  | 'sfx'
  | 'avatar'
  | 'portada'
  | 'creditos'
  | 'plano'
  | 'personaje'
  | 'grabarCamara'
  | 'grabarAudio'
  | 'mascaraAr'
  | 'chatAr'

/**
 * El menú «Añadir»: cada opción crea un clip en el cursor, en su pista. En el
 * modo película entran Plano (la cámara actual) y Personaje (un actor en la
 * casa), y salen Fondo (invisible bajo el 3D) y el avatar PIP (redundante).
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
  const todas: { id: OpcionAnadir; icono: NombreIcono; etiqueta: string; principal?: boolean }[] = [
    { id: 'plano', icono: 'pelicula', etiqueta: t('video.pelicula.plano', 'Plano'), principal: true },
    { id: 'personaje', icono: 'persona', etiqueta: t('video.pelicula.personaje', 'Personaje') },
    { id: 'clip', icono: 'pelicula', etiqueta: t('video.guion.desdeMedio', 'Clip o imagen'), principal: true },
    { id: 'grabarCamara', icono: 'foto', etiqueta: t('video.anadir.grabarCamara', 'Grabar con la cámara'), principal: true },
    { id: 'grabarAudio', icono: 'microfono', etiqueta: t('video.anadir.grabarAudio', 'Grabar audio') },
    { id: 'mascaraAr', icono: 'mascara', etiqueta: t('video.anadir.mascaraAr', 'Máscara AR'), principal: true },
    { id: 'chatAr', icono: 'chat-ar', etiqueta: t('video.anadir.chatAr', 'Chat AR'), principal: true },
    { id: 'color', icono: 'paleta', etiqueta: t('video.guion.color', 'Color'), principal: true },
    { id: 'fondo', icono: 'imagen', etiqueta: t('video.anadir.fondo', 'Fondo') },
    { id: 'imagen', icono: 'foto', etiqueta: t('video.anadir.imagen', 'Imagen superpuesta') },
    { id: 'texto', icono: 'letra', etiqueta: t('video.anadir.texto', 'Texto') },
    { id: 'voz', icono: 'microfono', etiqueta: t('video.anadir.narracion', 'Narración') },
    { id: 'musica', icono: 'musica', etiqueta: t('video.anadir.musica', 'Música') },
    { id: 'sfx', icono: 'bocina', etiqueta: t('video.anadir.sonido', 'Sonido') },
    { id: 'avatar', icono: 'persona', etiqueta: t('video.anadir.avatar', 'Avatar') },
    { id: 'portada', icono: 'letra', etiqueta: t('video.guion.portada', 'Portada'), principal: true },
    { id: 'creditos', icono: 'lista', etiqueta: t('video.guion.creditos', 'Créditos'), principal: true },
  ]
  // Cámara y micrófono del equipo solo donde existen; los overlays AR se abren
  // encima del Studio, así que en el modo película (que ya es un overlay) no van.
  const conDispositivos = typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function'
  const opciones = todas.filter((o) => {
    if (o.id === 'grabarCamara' || o.id === 'grabarAudio') return conDispositivos
    if (o.id === 'mascaraAr' || o.id === 'chatAr') return conDispositivos && !pelicula
    return pelicula ? o.id !== 'fondo' && o.id !== 'avatar' : o.id !== 'plano' && o.id !== 'personaje'
  })
  return (
    <Modal titulo={t('video.anadir.titulo', 'Añadir al video')} onCerrar={onCerrar} ancho="max-w-lg">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {opciones.map((o) => {
          const bloqueada = tope || (o.principal && topePrincipal)
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
    </Modal>
  )
}
