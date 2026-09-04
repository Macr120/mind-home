import { useState, type ReactNode } from 'react'
import type { ClipAvatar, ClipVideo, ClipVoz, EsquinaAvatar, MedioVideo } from '../../core/data/db'
import { muestraRostro } from '../../core/house/apariencia'
import { useT } from '../../core/i18n/useT'
import { getAsistente } from '../../core/state/asistentesStore'
import { ES_JUGADOR, usePelicula } from '../../core/state/peliculaStore'
import { SelectorAsistente } from '../../core/ui/comun/SelectorAsistente'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import { BotonSecundario, Campo } from '../_shared/ui'
import { esActorEscena, esJugador } from './actores'
import { MIN_CLIP, PISTAS } from './constantes'
import { BotonEscuchar } from './ListaSonidos'
import { clipsDe, encuadrePorEsquina, fin, medioIdDe, narradorDe, redondear, vozEfectiva, type ProyectoAbierto } from './modelo'
import { nombreNarrador } from './narradores'
import { RejillaTransiciones } from './RejillaTransiciones'
import { Chip, Deslizador, INPUT_CORTO, Pestana, SeccionFiltro, SeccionFuenteVisual, SeccionTexto, SeccionVoz } from './Secciones'
import { SeccionCamara, SeccionEscena } from './SeccionesPelicula'
import { nombreFuenteSonido } from './sonidos'
import { QuienHabla } from './VocesGuion'

const ESQUINAS: EsquinaAvatar[] = ['supIzq', 'supDer', 'infIzq', 'infDer', 'centro']
const TAMANOS = ['S', 'M', 'L'] as const

export interface AccionesPanel {
  onCambiar: (patch: Partial<ClipVideo>) => void
  onInicio: (seg: number) => void
  onDuracion: (seg: number) => void
  onCambiarVoz: (voz: string) => void
  /** Quién dice el clip de voz o de avatar (`proyecto.narradores`). */
  onAsignarNarrador: (narradorId: string) => void
  onElegirMedio: (tipos: MedioVideo['tipo'][], alElegir: (m: MedioVideo) => void) => void
  onElegirSonido: () => void
  onNarrar: () => void
  onElegirAudio: () => void
  onSubtitulos: () => void
  onDuplicar: () => void
  onDividir: () => void
  onBorrar: () => void
}

/**
 * El panel de propiedades del clip seleccionado (o el guion): hoja inferior
 * en móvil, columna a la derecha en pantallas amplias. Secciones por pista,
 * heredadas del panel de escena anterior.
 */
export function PanelClip({
  clip,
  proyecto,
  lienzo,
  medios,
  tab,
  onTab,
  onCerrar,
  iconoCerrar,
  narrando,
  guion,
  acciones,
}: {
  clip: ClipVideo | null
  proyecto: ProyectoAbierto
  /** El lienzo de la composición (720p por aspecto, o la pantalla en el modo película): proporción del PIP. */
  lienzo: { ancho: number; alto: number }
  medios: MedioVideo[]
  tab: 'clip' | 'guion'
  onTab: (tab: 'clip' | 'guion') => void
  onCerrar: () => void
  /** Icono del botón de la cabecera: plegar (columna) o cerrar (cajón). */
  iconoCerrar: NombreIcono
  narrando: boolean
  guion: ReactNode
  acciones: AccionesPanel
}) {
  const t = useT()
  const porId = new Map(medios.filter((m) => m.id != null).map((m) => [m.id!, m]))
  /**
   * Al cambiar el guion, el audio GENERADO (TTS) ya no dice eso: se suelta para
   * que lo lea la voz en vivo o se vuelva a generar (el medio sigue en Medios).
   * Uno importado o grabado se queda: no sale del texto.
   */
  const sinAudioGenerado = (c: ClipVoz | ClipAvatar): { medioId?: undefined; desde?: undefined; envolvente?: undefined; envolventeHz?: undefined } => {
    if (c.medioId == null || porId.get(c.medioId)?.origen !== 'tts') return {}
    return c.pista === 'avatar'
      ? { medioId: undefined, desde: undefined, envolvente: undefined, envolventeHz: undefined }
      : { medioId: undefined, desde: undefined }
  }
  const [sonando, setSonando] = useState(false)
  // Modo película: la principal son los planos y la pista de avatar, los personajes (actores en la casa).
  const pelicula = proyecto.escenario === '3d'
  const actores = usePelicula((s) => s.actores)
  const titulo = clip ? tituloPista(t, clip.pista, pelicula) : t('video.guion.titulo', 'Guion')

  const cabecera = clip && (
    <div className="flex flex-wrap items-end gap-2">
      <Campo etiqueta={t('video.panel.inicio', 'Empieza en (s)')} className="w-24">
        <input
          type="number"
          min={0}
          step={0.1}
          value={clip.inicio}
          disabled={clip.pista === 'video'}
          onChange={(e) => {
            const v = Number(e.target.value)
            if (Number.isFinite(v)) acciones.onInicio(Math.max(0, v))
          }}
          className={`${INPUT_CORTO} disabled:opacity-40`}
        />
      </Campo>
      <Campo etiqueta={t('video.escena.duracion', 'Duración (s)')} className="w-24">
        <input
          type="number"
          min={MIN_CLIP}
          step={0.1}
          value={clip.duracion}
          onChange={(e) => {
            const v = Number(e.target.value)
            if (Number.isFinite(v) && v >= MIN_CLIP) acciones.onDuracion(v)
          }}
          className={INPUT_CORTO}
        />
      </Campo>
      <div className="ms-auto flex gap-1">
        <BotonSecundario pequeno onClick={acciones.onDuplicar} aria-label={t('video.guion.duplicar', 'Duplicar')} title={t('video.guion.duplicar', 'Duplicar')}>
          <Icono nombre="duplicar" />
        </BotonSecundario>
        <BotonSecundario pequeno onClick={acciones.onDividir} aria-label={t('video.barra.dividir', 'Dividir en el cursor')} title={t('video.barra.dividir', 'Dividir en el cursor')}>
          <Icono nombre="tijeras" />
        </BotonSecundario>
        <BotonSecundario pequeno onClick={acciones.onBorrar} aria-label={t('video.barra.borrar', 'Borrar el clip')} title={t('video.barra.borrar', 'Borrar el clip')}>
          <Icono nombre="basura" />
        </BotonSecundario>
      </div>
    </div>
  )

  const audioNombreDe = (medioId?: number) => (medioId != null ? (porId.get(medioId)?.nombre ?? t('video.medios.noDisponible', 'Medio no disponible en este dispositivo')) : undefined)

  let secciones: ReactNode = null
  if (clip) {
    switch (clip.pista) {
      case 'video': {
        const principales = clipsDe(proyecto.clips, 'video')
        const esPrimero = principales[0]?.id === clip.id
        if (clip.fuente.tipo === 'escena3d') {
          // Un plano del modo película: la cámara en vez de la fuente; las transiciones solo se ven en el archivo.
          secciones = (
            <>
              <SeccionCamara fuente={clip.fuente} onCambiar={(fuente) => acciones.onCambiar({ fuente })} />
              <RejillaTransiciones valor={clip.transicion} esPrimero={esPrimero} onCambiar={(transicion) => acciones.onCambiar({ transicion })} />
              <p className="text-[11px] text-white/45">{t('video.pelicula.transicionesNota', 'Entre dos planos las transiciones solo se ven en el archivo exportado')}</p>
              <SeccionFiltro filtro={clip.filtro} onCambiar={(filtro) => acciones.onCambiar({ filtro })} />
            </>
          )
          break
        }
        secciones = (
          <>
            <SeccionFuenteVisual
              fuente={clip.fuente}
              aspecto={proyecto.aspecto}
              permiteVideo
              onElegirMedio={acciones.onElegirMedio}
              onCambiar={(fuente) => acciones.onCambiar({ fuente, desde: 0 })}
            />
            <Campo etiqueta={t('video.panel.encuadre', 'Encuadre')}>
              <div className="flex gap-1.5">
                <Chip activo={(clip.ajuste ?? 'cubrir') === 'cubrir'} onClick={() => acciones.onCambiar({ ajuste: undefined })}>
                  {t('video.encuadre.cubrir', 'Cubrir')}
                </Chip>
                <Chip activo={clip.ajuste === 'encajar'} onClick={() => acciones.onCambiar({ ajuste: 'encajar' })}>
                  {t('video.encuadre.encajar', 'Encajar')}
                </Chip>
              </div>
            </Campo>
            <RejillaTransiciones valor={clip.transicion} esPrimero={esPrimero} onCambiar={(transicion) => acciones.onCambiar({ transicion })} />
            <SeccionFiltro filtro={clip.filtro} onCambiar={(filtro) => acciones.onCambiar({ filtro })} />
            {clip.fuente.tipo === 'video' && (
              <Deslizador etiqueta={t('video.escena.volumen', 'Volumen del clip')} valor={clip.volumen} onCambiar={(volumen) => acciones.onCambiar({ volumen })} />
            )}
          </>
        )
        break
      }
      case 'fondo':
        secciones = (
          <>
            <SeccionFuenteVisual
              fuente={clip.fuente}
              aspecto={proyecto.aspecto}
              permiteVideo={false}
              onElegirMedio={acciones.onElegirMedio}
              onCambiar={(fuente) => {
                if (fuente.tipo !== 'video') acciones.onCambiar({ fuente })
              }}
            />
            <SeccionFiltro filtro={clip.filtro ?? 'ninguno'} onCambiar={(filtro) => acciones.onCambiar({ filtro: filtro === 'ninguno' ? undefined : filtro })} />
          </>
        )
        break
      case 'imagen': {
        const medio = porId.get(clip.medioId)
        const esquinaActiva = ESQUINAS.find((e) => {
          const enc = encuadrePorEsquina(e, 'M', medio, lienzo)
          return Math.abs(enc.x - clip.encuadre.x) < 0.02 && Math.abs(enc.y - clip.encuadre.y) < 0.02
        })
        const tamanoActivo = TAMANOS.find((tm) => Math.abs(encuadrePorEsquina('supIzq', tm, medio, lienzo).ancho - clip.encuadre.ancho) < 0.01)
        secciones = (
          <>
            <Campo etiqueta={t('video.panel.medio', 'Medio')}>
              <div className="flex items-center gap-2 text-xs text-white/70">
                <span className="min-w-0 flex-1 truncate">{audioNombreDe(clip.medioId)}</span>
                <BotonSecundario
                  pequeno
                  onClick={() =>
                    acciones.onElegirMedio(['imagen'], (m) => {
                      if (m.id != null) acciones.onCambiar({ medioId: m.id, encuadre: encuadrePorEsquina(esquinaActiva ?? 'infDer', tamanoActivo ?? 'M', m, lienzo) })
                    })
                  }
                >
                  {t('video.panel.cambiar', 'Cambiar')}
                </BotonSecundario>
              </div>
            </Campo>
            <Campo etiqueta={t('video.avatar.esquina', 'Esquina')}>
              <div className="flex flex-wrap gap-1.5">
                {ESQUINAS.map((e) => (
                  <Chip key={e} activo={esquinaActiva === e} onClick={() => acciones.onCambiar({ encuadre: encuadrePorEsquina(e, tamanoActivo ?? 'M', medio, lienzo) })}>
                    {t(`video.esquina.${e}`, ESQUINA_ES[e])}
                  </Chip>
                ))}
              </div>
            </Campo>
            <Campo etiqueta={t('video.avatar.tamano', 'Tamaño')}>
              <div className="flex gap-1.5">
                {TAMANOS.map((tm) => (
                  <Chip key={tm} activo={tamanoActivo === tm} onClick={() => acciones.onCambiar({ encuadre: encuadrePorEsquina(esquinaActiva ?? 'infDer', tm, medio, lienzo) })}>
                    {tm}
                  </Chip>
                ))}
              </div>
            </Campo>
            <Deslizador etiqueta={t('video.panel.opacidad', 'Opacidad')} valor={clip.opacidad} onCambiar={(opacidad) => acciones.onCambiar({ opacidad })} />
          </>
        )
        break
      }
      case 'texto':
        secciones = (
          <>
            {clip.origen === 'narracion' && (
              <p className="text-[11px] text-white/45">{t('video.subtitulos.generado', 'Subtítulo generado desde la narración: se rehace al volver a generar.')}</p>
            )}
            <SeccionTexto texto={clip.texto} onCambiar={(patch) => acciones.onCambiar({ texto: { ...clip.texto, ...patch } })} />
          </>
        )
        break
      case 'voz': {
        const n = narradorDe(proyecto, clip)
        secciones = (
          <>
            <QuienHabla proyecto={proyecto} clip={clip} onElegir={acciones.onAsignarNarrador} onEditar={() => onTab('guion')} />
            <SeccionVoz
              texto={clip.texto ?? ''}
              vozEfectiva={vozEfectiva(proyecto, clip)}
              vozDe={n ? nombreNarrador(t, n) : undefined}
              audioNombre={audioNombreDe(clip.medioId)}
              narrando={narrando}
              onTexto={(texto) => acciones.onCambiar({ texto: texto || undefined, ...sinAudioGenerado(clip) })}
              onVoz={acciones.onCambiarVoz}
              onNarrar={acciones.onNarrar}
              onElegirAudio={acciones.onElegirAudio}
              onQuitarAudio={() => acciones.onCambiar({ medioId: undefined, desde: undefined })}
              onSubtitulos={acciones.onSubtitulos}
            />
            <Deslizador etiqueta={t('video.sonidos.volumen', 'Volumen')} valor={clip.volumen} onCambiar={(volumen) => acciones.onCambiar({ volumen })} />
          </>
        )
        break
      }
      case 'avatar': {
        const n = narradorDe(proyecto, clip)
        const seccionVoz = (
          <SeccionVoz
            texto={clip.texto}
            vozEfectiva={vozEfectiva(proyecto, clip)}
            vozDe={n ? nombreNarrador(t, n) : undefined}
            audioNombre={audioNombreDe(clip.medioId)}
            narrando={narrando}
            onTexto={(texto) => acciones.onCambiar({ texto, ...sinAudioGenerado(clip) })}
            onVoz={acciones.onCambiarVoz}
            onNarrar={acciones.onNarrar}
            onElegirAudio={acciones.onElegirAudio}
            onQuitarAudio={() => acciones.onCambiar({ medioId: undefined, envolvente: undefined, envolventeHz: undefined, desde: undefined })}
            onSubtitulos={acciones.onSubtitulos}
          />
        )
        const jugador = esJugador(clip.asistenteId)
        const sinRostro = !jugador && !muestraRostro(getAsistente(clip.asistenteId)) && (
          <p className="text-[11px] text-amber-300/80">{t('video.avatar.sinRostro', 'Este personaje no tiene boca dibujada: hablará solo con el cuerpo.')}</p>
        )
        if (esActorEscena(clip)) {
          // Un actor en la casa (modo película): quién es, dónde está y qué hace; la voz como siempre.
          secciones = (
            <>
              <QuienHabla proyecto={proyecto} clip={clip} onElegir={acciones.onAsignarNarrador} onEditar={() => onTab('guion')} />
              {!n && (
                <>
                  <Campo etiqueta={t('video.pelicula.personaje', 'Personaje')}>
                    <Chip activo={jugador} onClick={() => acciones.onCambiar({ asistenteId: ES_JUGADOR })}>
                      <Icono nombre="persona" /> {t('video.pelicula.tu', 'Tú')}
                    </Chip>
                  </Campo>
                  <SelectorAsistente titulo={t('video.avatar.asistente', 'Asistente')} elegidoId={clip.asistenteId} onElegir={(as) => acciones.onCambiar({ asistenteId: as.id })} />
                </>
              )}
              {sinRostro}
              <SeccionEscena
                asistenteId={clip.asistenteId}
                escena={clip.escena}
                actores={actores}
                onCambiar={(patch) => acciones.onCambiar({ escena: { ...clip.escena, ...patch } })}
              />
              {seccionVoz}
              <Deslizador etiqueta={t('video.sonidos.volumen', 'Volumen')} valor={clip.volumen} onCambiar={(volumen) => acciones.onCambiar({ volumen })} />
            </>
          )
          break
        }
        secciones = (
          <>
            <QuienHabla proyecto={proyecto} clip={clip} onElegir={acciones.onAsignarNarrador} onEditar={() => onTab('guion')} />
            {/* Con narrador, el personaje lo pone él; sin narrador (clips de antes), se elige aquí. */}
            {!n && (
              <SelectorAsistente titulo={t('video.avatar.asistente', 'Asistente')} elegidoId={clip.asistenteId} onElegir={(as) => acciones.onCambiar({ asistenteId: as.id })} />
            )}
            {sinRostro}
            <Campo etiqueta={t('video.avatar.esquina', 'Esquina')}>
              <div className="flex flex-wrap gap-1.5">
                {ESQUINAS.map((e) => (
                  <Chip key={e} activo={clip.esquina === e} onClick={() => acciones.onCambiar({ esquina: e })}>
                    {t(`video.esquina.${e}`, ESQUINA_ES[e])}
                  </Chip>
                ))}
              </div>
            </Campo>
            <div className="flex flex-wrap gap-3">
              <Campo etiqueta={t('video.avatar.tamano', 'Tamaño')}>
                <div className="flex gap-1.5">
                  {TAMANOS.map((tm) => (
                    <Chip key={tm} activo={clip.tamano === tm} onClick={() => acciones.onCambiar({ tamano: tm })}>
                      {tm}
                    </Chip>
                  ))}
                </div>
              </Campo>
              <Campo etiqueta={t('video.avatar.plano', 'Plano')}>
                <div className="flex gap-1.5">
                  <Chip activo={clip.plano === 'busto'} onClick={() => acciones.onCambiar({ plano: 'busto' })}>
                    {t('video.avatar.busto', 'Busto')}
                  </Chip>
                  <Chip activo={clip.plano === 'cuerpo'} onClick={() => acciones.onCambiar({ plano: 'cuerpo' })}>
                    {t('video.avatar.cuerpo', 'Cuerpo entero')}
                  </Chip>
                </div>
              </Campo>
            </div>
            {seccionVoz}
            <Deslizador etiqueta={t('video.sonidos.volumen', 'Volumen')} valor={clip.volumen} onCambiar={(volumen) => acciones.onCambiar({ volumen })} />
          </>
        )
        break
      }
      case 'musica':
        secciones = (
          <>
            <Campo etiqueta={t('video.panel.medio', 'Medio')}>
              <div className="flex items-center gap-2 text-xs text-white/70">
                <span className="min-w-0 flex-1 truncate">{audioNombreDe(clip.medioId)}</span>
                <BotonSecundario
                  pequeno
                  onClick={() =>
                    acciones.onElegirMedio(['audio'], (m) => {
                      if (m.id != null) acciones.onCambiar({ medioId: m.id, desde: 0 })
                    })
                  }
                >
                  {t('video.panel.cambiar', 'Cambiar')}
                </BotonSecundario>
              </div>
            </Campo>
            <div className="flex flex-wrap items-end gap-3">
              <Deslizador etiqueta={t('video.musica.volumen', 'Volumen')} valor={clip.volumen} onCambiar={(volumen) => acciones.onCambiar({ volumen })} />
              <Chip activo={clip.bucle} onClick={() => acciones.onCambiar({ bucle: !clip.bucle })}>
                {t('video.panel.bucle', 'Repetir en bucle')}
              </Chip>
            </div>
          </>
        )
        break
      case 'sfx':
        secciones = (
          <>
            <Campo etiqueta={t('video.anadir.sonido', 'Sonido')}>
              <div className="flex items-center gap-2 text-xs text-white/70">
                <BotonEscuchar fuente={clip.fuente} porId={porId} sonando={sonando} onSonando={setSonando} />
                <span className="min-w-0 flex-1 truncate">{nombreFuenteSonido(t, clip.fuente, porId)}</span>
                <BotonSecundario pequeno onClick={acciones.onElegirSonido}>
                  {t('video.panel.cambiar', 'Cambiar')}
                </BotonSecundario>
              </div>
            </Campo>
            <Deslizador etiqueta={t('video.sonidos.volumen', 'Volumen')} valor={clip.volumen} onCambiar={(volumen) => acciones.onCambiar({ volumen })} />
          </>
        )
        break
    }
  }

  const etiquetaCerrar = iconoCerrar === 'cerrar' ? t('video.panel.cerrar', 'Cerrar el panel') : t('video.lateral.plegarEditor', 'Plegar el editor')

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-1 border-b border-white/10 px-2 py-1.5">
        {clip && (
          <span className="text-sm" style={{ color: PISTAS[clip.pista].color }}>
            <Icono nombre={PISTAS[clip.pista].icono} />
          </span>
        )}
        <p className="min-w-0 flex-1 truncate text-xs font-semibold">{titulo}</p>
        {clip && (
          <Pestana activa={tab === 'clip'} onClick={() => onTab('clip')}>
            {t('video.panel.clip', 'Clip')}
          </Pestana>
        )}
        <Pestana activa={tab === 'guion'} onClick={() => onTab('guion')}>
          {t('video.guion.titulo', 'Guion')}
        </Pestana>
        <button
          type="button"
          onClick={onCerrar}
          aria-label={etiquetaCerrar}
          title={etiquetaCerrar}
          className="grid h-6 w-6 place-items-center rounded text-white/50 hover:bg-white/10"
        >
          <Icono nombre={iconoCerrar} />
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-2">
        {tab === 'clip' && clip ? (
          <>
            {cabecera}
            {secciones}
          </>
        ) : (
          guion
        )}
      </div>
    </div>
  )
}

const PISTA_ES: Record<ClipVideo['pista'], string> = {
  texto: 'Texto',
  imagen: 'Imagen superpuesta',
  avatar: 'Avatar',
  video: 'Pista principal',
  fondo: 'Fondo',
  voz: 'Narración',
  musica: 'Música',
  sfx: 'Sonidos',
}
/** Nombre traducido de una pista (cabecera del panel y tirita plegada); en el modo película, planos y personajes. */
export const tituloPista = (t: (clave: string, es: string) => string, pista: ClipVideo['pista'], pelicula = false) => {
  if (pelicula && pista === 'video') return t('video.pelicula.pista.video', 'Planos')
  if (pelicula && pista === 'avatar') return t('video.pelicula.pista.avatar', 'Personajes')
  return t(`video.pista.${pista}`, PISTA_ES[pista])
}
const ESQUINA_ES: Record<EsquinaAvatar, string> = {
  supIzq: 'Arriba a la izquierda',
  supDer: 'Arriba a la derecha',
  infIzq: 'Abajo a la izquierda',
  infDer: 'Abajo a la derecha',
  centro: 'Centro',
}

/** Fin del clip en segundos absolutos (para el campo de duración del panel). */
export const finDe = (c: ClipVideo) => redondear(fin(c))
export const medioDe = medioIdDe
