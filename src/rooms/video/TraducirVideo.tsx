import { useEffect, useRef, useState } from 'react'
import { puedeSintetizarArchivo } from '../../core/audio/vozArchivo'
import { mensajeErrorIA } from '../../core/cuenta/api'
import { hayCreditos } from '../../core/cuenta/costos'
import type { ClipPrincipal, ClipVideo, MedioVideo } from '../../core/data/db'
import { IDIOMAS } from '../../core/i18n/idiomas'
import { useT } from '../../core/i18n/useT'
import { Creditos } from '../../core/ui/Creditos'
import { Icono } from '../../core/ui/iconos/Icono'
import { BotonPrimario, BotonSecundario, Campo, INPUT, Modal, Spinner } from '../_shared/ui'
import { analizarLinea } from './analisis'
import { COLOR } from './constantes'
import { avisarCreditos, Pildora, textoProgreso } from './EditarConIA'
import { clipsDe, type ProyectoAbierto } from './modelo'
import { conPaquete, creditosPaquete } from './paqueteVideo'
import { opTraduccion, traducirVideo, tramosTraduccion, type OpcionesTraduccion, type ResultadoTraduccion } from './traduccionVideo'
import { gruposVoz, PREFIJO_DISPOSITIVO } from './voces'

const SIN_DOBLAJE = ''
const FONDO_BAJITO = 0.15

/**
 * «Traducir video»: lo que se dice en todo el video o en el clip seleccionado
 * pasa a otro idioma, con voz nueva (doblaje) y subtítulos. Tarifa del paquete:
 * 1 crédito por cada 25 s (3 con voz IA); avisa antes y se puede deshacer. Los
 * títulos y demás textos van aparte («Traducir textos»).
 */
export function TraducirVideo({
  proyecto,
  medios,
  clipSeleccionado,
  onAplicar,
  onCerrar,
}: {
  proyecto: ProyectoAbierto
  medios: MedioVideo[]
  /** Clip de video de la pista principal seleccionado: permite traducir solo ese. */
  clipSeleccionado?: string | null
  onAplicar: (clips: ClipVideo[]) => void
  onCerrar: () => void
}) {
  const t = useT()
  const principal = clipsDe(proyecto.clips, 'video').filter((c) => c.fuente.tipo === 'video')
  const clipSolo = principal.find((c) => c.id === clipSeleccionado)
  const [soloClip, setSoloClip] = useState(!!clipSolo)
  const alcance: ClipPrincipal[] = soloClip && clipSolo ? [clipSolo] : principal

  // Voces: las IA (si hay) y la del dispositivo en el idioma destino (si aquí puede dejar archivo).
  const vocesIA = gruposVoz(t).find((g) => g.id === 'ia')?.voces ?? []
  const conDispositivo = puedeSintetizarArchivo()
  const [idiomaId, setIdiomaId] = useState<string>(() => (IDIOMAS.find((i) => i.id === 'en') ?? IDIOMAS[0]).id)
  const idioma = IDIOMAS.find((i) => i.id === idiomaId) ?? IDIOMAS[0]
  const [voz, setVoz] = useState<string>(() => vocesIA[0]?.id ?? (conDispositivo ? PREFIJO_DISPOSITIVO : SIN_DOBLAJE))
  const [subtitulos, setSubtitulos] = useState(true)
  const [fondoBajito, setFondoBajito] = useState(true)
  const [progreso, setProgreso] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [hecho, setHecho] = useState<{ r: ResultadoTraduccion; previos: ClipVideo[] } | null>(null)
  const vivo = useRef(true)
  useEffect(
    () => () => {
      vivo.current = false
    },
    [],
  )

  const opciones: OpcionesTraduccion = { idioma, voz: voz || null, subtitulos, fondo: fondoBajito ? FONDO_BAJITO : 0 }
  const op = opTraduccion(opciones.voz)
  const tramos = Math.max(1, tramosTraduccion(alcance))
  const creditos = creditosPaquete(op, tramos)
  const segundos = alcance.reduce((s, c) => s + c.duracion, 0)
  const nombreIdioma = t(idioma.clave, idioma.label)

  const correr = async () => {
    if (!(await avisarCreditos(t, segundos, creditos))) return
    setError('')
    setProgreso(t('video.editarIA.preparando', 'Preparando…'))
    const avance = (texto: string) => vivo.current && setProgreso(texto)
    try {
      const r = await conPaquete(
        op,
        tramos,
        async () => {
          const analisis = await analizarLinea(alcance, medios, {
            vertical: proyecto.aspecto === '9:16',
            sinHoja: true,
            alProgreso: (fase, n, total) => avance(textoProgreso(t, fase, n, total)),
          })
          return traducirVideo(proyecto, alcance, analisis, opciones, (fase, n, total) =>
            avance(
              fase === 'texto'
                ? t('video.traducirVideo.traduciendo', 'Traduciendo… {n}/{total}', { n, total })
                : t('video.traducirVideo.doblando', 'Grabando la voz nueva… {n}/{total}', { n, total }),
            ),
          )
        },
        // Se usaron los tramos que tenían voz (los traducidos); los mudos se devuelven.
        (x) => Math.max(1, x.tramos),
      )
      if (!vivo.current) return
      const previos = proyecto.clips
      onAplicar(r.clips)
      setHecho({ r, previos })
    } catch (e) {
      if (vivo.current) setError(mensajeErrorIA(e, t, t('video.traducirVideo.error', 'No se pudo traducir el video')))
    } finally {
      if (vivo.current) setProgreso(null)
    }
  }

  if (hecho) {
    const { r } = hecho
    const lineas = [
      r.voces > 0 && t('video.traducirVideo.res.voces', '{n} tramos con voz nueva', { n: r.voces }),
      r.subtitulos > 0 && t('video.editarIA.res.subtitulos', '{n} subtítulos', { n: r.subtitulos }),
    ].filter(Boolean) as string[]
    return (
      <Modal titulo={t('video.traducirVideo.listo', 'Video traducido al {idioma}', { idioma: nombreIdioma })} onCerrar={onCerrar}>
        <ul className="space-y-1 text-xs text-white/60">
          {lineas.map((l) => (
            <li key={l} className="flex items-center gap-1.5">
              <Icono nombre="hecho" /> {l}
            </li>
          ))}
        </ul>
        <p className="text-xs text-white/40">{t('video.editarIA.retocar', 'Todo quedó en la línea de tiempo: retócalo clip por clip como cualquier otro.')}</p>
        <div className="grid grid-cols-2 gap-2">
          <BotonSecundario
            onClick={() => {
              onAplicar(hecho.previos)
              onCerrar()
            }}
          >
            <Icono nombre="deshacer" /> {t('video.editarIA.deshacer', 'Deshacer')}
          </BotonSecundario>
          <BotonPrimario type="button" app={COLOR} onClick={onCerrar}>
            {t('video.editarIA.aceptar', 'Listo')}
          </BotonPrimario>
        </div>
      </Modal>
    )
  }

  const ocupado = progreso != null
  return (
    <Modal titulo={t('video.traducirVideo.titulo', 'Traducir video')} onCerrar={onCerrar}>
      <p className="text-xs text-white/55">
        {t('video.traducirVideo.intro', 'Lo que se dice en el video pasa a otro idioma: con voz nueva (doblaje) y subtítulos traducidos.')}
      </p>
      {principal.length === 0 && <p className="text-xs text-amber-300">{t('video.editarIA.sinVideo', 'Añade primero un video a la pista principal.')}</p>}
      {clipSolo && (
        <div className="flex flex-wrap gap-1.5">
          <Pildora activo={!soloClip} onClick={() => setSoloClip(false)}>
            {t('video.traducirVideo.todo', 'Todo el video')}
          </Pildora>
          <Pildora activo={soloClip} onClick={() => setSoloClip(true)}>
            {t('video.traducirVideo.clip', 'Solo el clip seleccionado')}
          </Pildora>
        </div>
      )}
      <Campo etiqueta={t('video.traducirVideo.idioma', 'Idioma')}>
        <select value={idiomaId} onChange={(e) => setIdiomaId(e.target.value)} className={INPUT}>
          {IDIOMAS.map((i) => (
            <option key={i.id} value={i.id}>
              {t(i.clave, i.label)} · {i.endonimo}
            </option>
          ))}
        </select>
      </Campo>
      <Campo etiqueta={t('video.traducirVideo.voz', 'Voz nueva')}>
        <select value={voz} onChange={(e) => setVoz(e.target.value)} className={INPUT}>
          {vocesIA.length > 0 && (
            <optgroup label={t('video.voz.grupoIA', 'Voz IA (créditos)')}>
              {vocesIA.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.etiqueta}
                </option>
              ))}
            </optgroup>
          )}
          {conDispositivo && <option value={PREFIJO_DISPOSITIVO}>{t('video.voz.grupoDispositivo', 'Voz del dispositivo (gratis)')}</option>}
          <option value={SIN_DOBLAJE}>{t('video.traducirVideo.sinDoblaje', 'Sin doblaje: solo subtítulos')}</option>
        </select>
      </Campo>
      <div className="flex flex-wrap gap-1.5">
        <Pildora activo={subtitulos} onClick={() => setSubtitulos((x) => !x)}>
          {t('video.editarIA.op.subtitulos', 'Subtítulos')}
        </Pildora>
        {voz && (
          <Pildora activo={fondoBajito} onClick={() => setFondoBajito((x) => !x)}>
            {t('video.traducirVideo.fondo', 'Voz original bajita de fondo')}
          </Pildora>
        )}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <BotonPrimario type="button" app={COLOR} disabled={ocupado || alcance.length === 0 || (!voz && !subtitulos)} onClick={() => void correr()}>
        {ocupado ? <Spinner pequeno /> : <Icono nombre="idiomas" />} {ocupado ? progreso : t('video.traducirVideo.boton', 'Traducir al {idioma}', { idioma: nombreIdioma })}{' '}
        {!ocupado && <Creditos n={creditos} />}
      </BotonPrimario>
      {hayCreditos() && (
        <p className="text-[11px] text-white/45">
          {t('video.traducirVideo.tarifa', 'Tarifa: 1 crédito por cada 25 s de video, todo incluido; 3 si la voz nueva es IA. Los títulos y textos se traducen aparte.')}
        </p>
      )}
      <p className="text-xs text-white/40">
        {t('video.traducirVideo.nota', '{dur} s de video. Puedes deshacerlo al terminar.', { dur: Math.round(segundos) })}
      </p>
    </Modal>
  )
}
