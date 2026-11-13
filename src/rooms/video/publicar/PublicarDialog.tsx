import { useEffect, useRef, useState } from 'react'
import { proyectosVideoRepo } from '../../../core/data/repository'
import { abrirEnlace } from '../../../core/enlaces'
import { localeActual, useT } from '../../../core/i18n/useT'
import { opcionesPublicacion } from '../../../core/redes/api'
import { idiomaDeCuenta, proximaHoraPico } from '../../../core/redes/idiomaCuenta'
import { useRedes } from '../../../core/redes/redesStore'
import { mensajeErrorRedes } from '../../../core/redes/errores'
import { NOMBRE_RED, type AvisosRedes, type CuentaRed, type MetaPublicacion, type OpcionesTikTok, type Plataforma } from '../../../core/redes/tipos'
import { cancelarTrabajo, descartarTrabajo, lanzarTrabajo, marcarVisto } from '../../../core/redes/trabajos'
import { confirmar } from '../../../core/state/confirmarStore'
import { BotonPrimario, Campo, INPUT, Modal } from '../../_shared/ui'
import { type AspectoVideo, COLOR } from '../constantes'
import { soportaMp4, type ExportListo } from '../exportar'
import { duracionTotal, type ProyectoAbierto } from '../modelo'
import { FormularioFacebook, FormularioInstagram, validarFacebook, validarInstagram } from './FormularioMeta'
import { FormularioTikTok, validarTikTok } from './FormularioTikTok'
import { FormularioYouTube, validarYouTube } from './FormularioYouTube'
import { Interruptor } from './Interruptor'
import { PasoCuenta } from './PasoCuenta'
import { ProgresoTrabajo } from './ProgresoTrabajo'
import { Resultado } from './Resultado'
import { metaInicial, type MetaFormulario } from './tipos'
import { VistaPrevia } from './VistaPrevia'

type Paso = { tipo: 'cuenta' } | { tipo: 'formulario' } | { tipo: 'exportando'; fraccion: number } | { tipo: 'trabajo' } | { tipo: 'resultado' }

export type Renderizar = (o: {
  preferirMp4: boolean
  codecs: boolean
  senal: AbortSignal
  onProgreso: (f: number) => void
  alEmpezar?: () => void
}) => Promise<ExportListo | null>

/** Lo que va al servidor, en los valores nativos de cada red. */
function construirMeta(form: MetaFormulario, cuenta: CuentaRed | null, aspecto: AspectoVideo, duracion: number): MetaPublicacion {
  const base = { aspecto, duracion_seg: Math.round(duracion) }
  switch (form.plataforma) {
    case 'youtube': {
      const m = form.meta
      return { ...base, titulo: m.titulo, descripcion: m.descripcion, privacidad: m.privacidad, youtube: { madeForKids: m.paraNinos === true } }
    }
    case 'tiktok': {
      const m = form.meta
      return {
        ...base,
        titulo: m.titulo,
        privacidad: m.privacidad ?? undefined,
        tiktok: {
          disable_comment: !m.comentarios,
          disable_duet: !m.duo,
          disable_stitch: !m.stitch,
          // TikTok: «Contenido de marca» = colaboración pagada con un tercero; «Tu marca» = promoción propia.
          brand_content_toggle: m.comercial && m.contenidoMarca,
          brand_organic_toggle: m.comercial && m.tuMarca,
          is_aigc: m.esIA,
        },
      }
    }
    case 'facebook':
      return { ...base, titulo: form.meta.titulo, descripcion: form.meta.descripcion, facebook: { page_id: cuenta?.cuenta_id } }
    case 'instagram':
      return { ...base, titulo: form.meta.caption, instagram: { share_to_feed: true } }
  }
}

const tituloDe = (form: MetaFormulario) => (form.plataforma === 'instagram' ? form.meta.caption : form.meta.titulo)

/**
 * El asistente de publicación: cuenta → formulario de la red → export (bloquea,
 * como Descargar) → subida (en el store, sobrevive al diálogo) → resultado.
 * Reintentar no vuelve a exportar: el archivo de esta sesión se conserva.
 */
export function PublicarDialog({
  proyecto,
  plataforma,
  poster,
  esIA,
  renderizar,
  onCerrar,
}: {
  proyecto: ProyectoAbierto
  plataforma: Plataforma
  /** Frame del visor al abrir (vista previa antes de exportar). */
  poster: string | null
  /** El proyecto usa medios generados con IA o voces sintéticas (etiqueta de TikTok). */
  esIA: boolean
  renderizar: Renderizar
  onCerrar: () => void
}) {
  const t = useT()
  const red = NOMBRE_RED[plataforma]
  const cuentas = useRedes((s) => s.cuentas)
  const cargado = useRedes((s) => s.cargado)
  const avisos: AvisosRedes = useRedes((s) => s.avisos)
  const restantes = useRedes((s) => s.youtubeRestantes)
  const trabajo = useRedes((s) => s.trabajo)
  // Con varias cuentas en la red (una por idioma) se elige en cuál; si no, la primera que sirva.
  const deRed = cuentas.filter((c) => c.plataforma === plataforma).sort((a, b) => a.ranura - b.ranura)
  const [ranuraElegida, setRanuraElegida] = useState<number | null>(null)
  const cuenta = deRed.find((c) => c.ranura === ranuraElegida) ?? deRed.find((c) => c.estado === 'ok') ?? deRed[0] ?? null
  const ranura = cuenta?.ranura ?? 0
  const cuentaOk = cuenta?.estado === 'ok' ? cuenta : null
  const aspecto = proyecto.aspecto
  const duracion = duracionTotal(proyecto.clips)
  const mp4 = soportaMp4()
  // Con una cuenta por idioma: su país manda la hora pico, los hashtags y el idioma que se declara.
  const idioma = deRed.length > 1 && cuentaOk ? idiomaDeCuenta(cuentaOk) : null
  const programable = plataforma === 'youtube' || plataforma === 'facebook'
  const [programar, setProgramar] = useState(false)

  // Un trabajo de ESTE proyecto y red que siga vivo (el usuario cerró y volvió): se retoma donde va.
  const trabajoPropio = trabajo && trabajo.proyectoId === proyecto.id && trabajo.plataforma === plataforma ? trabajo : null
  const [trabajoId, setTrabajoId] = useState<string | null>(trabajoPropio?.id ?? null)
  const [paso, setPaso] = useState<Paso>(() =>
    trabajoPropio ? { tipo: trabajoPropio.estado === 'activo' ? 'trabajo' : 'resultado' } : cuentaOk ? { tipo: 'formulario' } : { tipo: 'cuenta' },
  )
  const [form, setForm] = useState<MetaFormulario>(() => metaInicial(plataforma, proyecto.nombre, esIA))
  const [listo, setListo] = useState<ExportListo | null>(null)
  // `creator_info` de TikTok, atado a la cuenta y al intento que lo pidió (así no hace falta vaciarlo en el efecto).
  const [reintentoOpciones, setReintentoOpciones] = useState(0)
  const claveOpciones = `${cuentaOk?.cuenta_id ?? ''}|${reintentoOpciones}`
  const [respuestaOpciones, setRespuestaOpciones] = useState<{ clave: string; info: OpcionesTikTok | null; error: string | null } | null>(null)
  const opciones = respuestaOpciones?.clave === claveOpciones ? respuestaOpciones.info : null
  const errorOpciones = respuestaOpciones?.clave === claveOpciones ? respuestaOpciones.error : null
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!cargado) void useRedes.getState().refrescar()
  }, [cargado])

  // El paso que se pinta se DERIVA: la cuenta que llega (vuelta del OAuth) avanza «cuenta» → formulario,
  // y el trabajo terminado avanza «trabajo» → resultado, sin efectos que hagan setState.
  const trabajoActual = trabajo && trabajo.id === trabajoId ? trabajo : null
  const pasoVisible: Paso =
    paso.tipo === 'cuenta' && cuentaOk
      ? { tipo: 'formulario' }
      : paso.tipo === 'trabajo' && trabajoActual && trabajoActual.estado !== 'activo'
        ? { tipo: 'resultado' }
        : paso

  // TikTok exige `creator_info` antes de publicar; a las demás redes no les hace falta nada.
  useEffect(() => {
    if (plataforma !== 'tiktok' || !cuentaOk) return
    let vivo = true
    const clave = claveOpciones
    opcionesPublicacion('tiktok', ranura)
      .then((o) => vivo && setRespuestaOpciones({ clave, info: o as OpcionesTikTok, error: null }))
      .catch((e: unknown) => vivo && setRespuestaOpciones({ clave, info: null, error: mensajeErrorRedes(e) }))
    return () => {
      vivo = false
    }
  }, [plataforma, cuentaOk, claveOpciones, ranura])

  // Con el resultado a la vista, la píldora global deja de repetirlo.
  useEffect(() => {
    if (pasoVisible.tipo === 'resultado') marcarVisto()
  }, [pasoVisible.tipo])

  // Cerrar el Editor a mitad del export lo cancela (la subida no: vive en el store).
  useEffect(() => () => abortRef.current?.abort(), [])

  const publicaciones = proyectosVideoRepo.useAll()?.find((p) => p.id === proyecto.id)?.publicaciones ?? []
  const ultima = publicaciones.filter((x) => x.plataforma === plataforma && x.estado !== 'error').at(-1)

  const error = (() => {
    switch (form.plataforma) {
      case 'youtube':
        return validarYouTube(form.meta, t)
      case 'tiktok':
        return validarTikTok(form.meta, opciones, duracion, t)
      case 'facebook':
        return validarFacebook(form.meta, cuentaOk, t)
      case 'instagram':
        return validarInstagram(form.meta, cuentaOk, aspecto, mp4, t)
    }
  })()

  const lanzar = (archivo: ExportListo) => {
    const id = lanzarTrabajo({
      proyectoId: proyecto.id ?? 0,
      proyectoNombre: proyecto.nombre,
      plataforma,
      ranura,
      blob: archivo.blob,
      mime: archivo.mime,
      meta: {
        ...construirMeta(form, cuentaOk, aspecto, duracion),
        ...(idioma ? { idioma: idioma.youtube } : {}),
        // Se calcula al lanzar, no al abrir: el export puede haber tardado.
        ...(idioma && programable && programar ? { publicar_en: proximaHoraPico(idioma).toISOString() } : {}),
      },
      titulo: tituloDe(form),
      destinoNombre: cuentaOk?.nombre,
      textos: {
        publicado: t('video.publicar.notif.titulo', 'Publicado en {red}', { red }),
        fallo: t('video.publicar.notif.error', 'Falló la publicación en {red}', { red }),
      },
    })
    if (!id) {
      void confirmar({ titulo: t('video.publicar.menu.enCurso', 'Hay una publicación en curso') })
      return
    }
    setTrabajoId(id)
    setPaso({ tipo: 'trabajo' })
  }

  const publicar = async () => {
    if (error) return
    const abort = new AbortController()
    abortRef.current = abort
    let archivo = listo
    try {
      if (!archivo) {
        archivo = await renderizar({
          // TikTok NO: acepta WebM/VP9 y exige 23 fps como mínimo, y el codificador
          // H.264 de MediaRecorder no siempre sostiene esa velocidad grabando en
          // tiempo real — medido con el mismo proyecto, 19 fps en MP4 contra 30 en
          // WebM, y TikTok lo rechaza con `frame_rate_check_failed`. Las demás redes
          // sí quieren MP4 (Instagram no admite otra cosa).
          preferirMp4: plataforma !== 'tiktok',
          // Publicar exige velocidad constante: ver `grabarConCodecs` en exportar.ts.
          codecs: true,
          senal: abort.signal,
          alEmpezar: () => setPaso({ tipo: 'exportando', fraccion: 0 }),
          onProgreso: (f) => setPaso((p) => (p.tipo === 'exportando' ? { tipo: 'exportando', fraccion: f } : p)),
        })
        if (!archivo) {
          setPaso({ tipo: 'formulario' })
          return
        }
        setListo(archivo)
      }
    } catch (e) {
      if (!(e instanceof Error && e.message === 'cancelado')) {
        await confirmar({ titulo: t('video.export.fallo', 'El export falló'), mensaje: e instanceof Error ? e.message : String(e) })
      }
      setPaso({ tipo: 'formulario' })
      return
    } finally {
      abortRef.current = null
    }
    if (plataforma === 'instagram' && archivo.extension !== 'mp4') {
      await confirmar({ titulo: t('video.publicar.menu.sinMp4', 'Necesita MP4: este dispositivo solo graba WebM') })
      setPaso({ tipo: 'formulario' })
      return
    }
    lanzar(archivo)
  }

  /** Los hashtags del idioma de la cuenta, al final del texto que esa red muestra. */
  const anadirHashtags = () => {
    if (!idioma) return
    const con = (s: string) => (s.includes(idioma.hashtags) ? s : `${s.trimEnd()}${s.trim() ? '\n\n' : ''}${idioma.hashtags}`)
    switch (form.plataforma) {
      case 'youtube':
        return setForm({ plataforma: 'youtube', meta: { ...form.meta, descripcion: con(form.meta.descripcion) } })
      case 'facebook':
        return setForm({ plataforma: 'facebook', meta: { ...form.meta, descripcion: con(form.meta.descripcion) } })
      case 'instagram':
        return setForm({ plataforma: 'instagram', meta: { ...form.meta, caption: con(form.meta.caption) } })
      case 'tiktok':
        return setForm({ plataforma: 'tiktok', meta: { ...form.meta, titulo: con(form.meta.titulo) } })
    }
  }
  const pico = idioma ? proximaHoraPico(idioma) : null
  const horaDe = (d: Date, zona?: string) =>
    d.toLocaleString(localeActual(), { weekday: 'short', hour: '2-digit', minute: '2-digit', ...(zona ? { timeZone: zona } : {}) })

  const cancelarSubida = async () => {
    const si = await confirmar({
      titulo: t('video.publicar.trabajo.cancelar', 'Cancelar'),
      mensaje: t('video.publicar.trabajo.cancelarMsg', '¿Cancelar la subida a {red}? El archivo exportado se conserva para reintentar.', { red }),
      peligro: true,
    })
    if (si) cancelarTrabajo()
  }

  const cerrar = () => {
    if (pasoVisible.tipo === 'exportando') {
      abortRef.current?.abort()
      return
    }
    if (pasoVisible.tipo === 'resultado') descartarTrabajo()
    onCerrar()
  }

  const formato = listo ? (listo.extension === 'mp4' ? 'MP4' : 'WebM') : mp4 ? 'MP4' : 'WebM'

  return (
    <Modal titulo={t('video.publicar.titulo', 'Publicar en {red}', { red })} onCerrar={cerrar} ancho="max-w-lg">
      {pasoVisible.tipo === 'cuenta' && <PasoCuenta plataforma={plataforma} ranura={ranura} cuenta={cuenta} />}

      {pasoVisible.tipo === 'formulario' && (
        <div className="space-y-3">
          <VistaPrevia poster={poster} blob={listo?.blob ?? null} aspecto={aspecto} duracion={duracion} formato={formato} />
          {deRed.length > 1 && (
            <Campo etiqueta={t('video.publicar.cuenta.publicarEn', 'Publicar en')}>
              <select value={ranura} onChange={(e) => setRanuraElegida(Number(e.target.value))} className={INPUT}>
                {deRed.map((c) => (
                  <option key={c.ranura} value={c.ranura}>
                    {c.extra.username ? `@${c.extra.username}` : c.nombre}
                  </option>
                ))}
              </select>
            </Campo>
          )}
          {idioma && pico && (
            <div className="space-y-2 rounded-md border border-white/10 bg-white/5 p-2 text-[11px] leading-snug text-white/65">
              <p>
                {t('video.publicar.idioma.pico', 'Hora pico en el país de esta cuenta: {alla} allá ({aqui} en tu hora).', {
                  alla: horaDe(pico, idioma.zona),
                  aqui: horaDe(pico),
                })}
              </p>
              <button type="button" onClick={anadirHashtags} className="underline">
                {t('video.publicar.idioma.hashtags', 'Añadir hashtags en su idioma')}
              </button>
              {programable ? (
                <Interruptor activo={programar} onCambio={setProgramar} etiqueta={t('video.publicar.idioma.programar', 'Programar para esa hora')} />
              ) : (
                <p>{t('video.publicar.idioma.sinProgramar', '{red} no deja programar desde aquí: publica cerca de esa hora.', { red })}</p>
              )}
            </div>
          )}
          {ultima && (
            <p className="text-[11px] text-white/45">
              {t('video.publicar.historial', 'Ya publicado en {red} el {f}', {
                red,
                f: new Date(ultima.fecha).toLocaleDateString(localeActual(), { day: 'numeric', month: 'short' }),
              })}
              {ultima.url && (
                <>
                  {' · '}
                  <button type="button" onClick={() => void abrirEnlace(ultima.url!)} className="underline">
                    {t('video.publicar.historial.ver', 'Ver')}
                  </button>
                </>
              )}
            </p>
          )}
          {form.plataforma === 'youtube' && (
            <FormularioYouTube meta={form.meta} onCambio={(meta) => setForm({ plataforma: 'youtube', meta })} avisos={avisos} restantes={restantes} />
          )}
          {form.plataforma === 'tiktok' && (
            <FormularioTikTok
              meta={form.meta}
              onCambio={(meta) => setForm({ plataforma: 'tiktok', meta })}
              info={opciones}
              errorInfo={errorOpciones}
              onReintentar={() => setReintentoOpciones((n) => n + 1)}
              duracion={duracion}
            />
          )}
          {form.plataforma === 'facebook' && (
            <FormularioFacebook meta={form.meta} onCambio={(meta) => setForm({ plataforma: 'facebook', meta })} cuenta={cuentaOk} aspecto={aspecto} avisos={avisos} />
          )}
          {form.plataforma === 'instagram' && (
            <FormularioInstagram
              meta={form.meta}
              onCambio={(meta) => setForm({ plataforma: 'instagram', meta })}
              cuenta={cuentaOk}
              aspecto={aspecto}
              mp4={mp4}
              avisos={avisos}
            />
          )}
          {error && (plataforma !== 'tiktok' || opciones) && <p className="text-xs text-red-400/90">{error}</p>}
          {/* El `title` va en el contenedor: un botón deshabilitado no recibe el ratón, y la guía
              de TikTok pide que al pasar por encima se lea por qué no se puede publicar. */}
          <div className="flex justify-end">
            <span title={error ?? undefined}>
              <BotonPrimario type="button" app={COLOR} disabled={error != null} onClick={() => void publicar()}>
                {t('video.publicar.boton', 'Publicar')}
              </BotonPrimario>
            </span>
          </div>
        </div>
      )}

      {pasoVisible.tipo === 'exportando' && <ProgresoTrabajo fase="exportando" fraccion={pasoVisible.fraccion} onCancelar={() => abortRef.current?.abort()} />}

      {pasoVisible.tipo === 'trabajo' && (
        <ProgresoTrabajo
          fase={trabajo?.fase === 'publicando' ? 'publicando' : 'subiendo'}
          fraccion={trabajo?.fraccion ?? 0}
          onCancelar={() => void cancelarSubida()}
          onSegundoPlano={onCerrar}
        />
      )}

      {pasoVisible.tipo === 'resultado' && trabajoActual && (
        <Resultado
          trabajo={trabajoActual}
          onReintentar={() => {
            descartarTrabajo()
            if (listo) lanzar(listo)
            else void publicar()
          }}
          onEditar={() => {
            descartarTrabajo()
            setPaso({ tipo: 'formulario' })
          }}
          onCerrar={cerrar}
        />
      )}
    </Modal>
  )
}
