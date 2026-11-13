import { useEffect, useRef, useState } from 'react'
import { mensajeErrorIA } from '../../core/cuenta/api'
import type { ClipPrincipal, MedioVideo, ProyectoVideo } from '../../core/data/db'
import { asegurarBlob, mediosVideoRepo, proyectosVideoRepo, VACIO } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { Creditos } from '../../core/ui/Creditos'
import { Icono } from '../../core/ui/iconos/Icono'
import { BotonPrimario, BotonSecundario, Campo, INPUT, Modal, Spinner } from '../_shared/ui'
import { analizarLinea, creditosEscucha, fotogramas, type FraseVideo, type PalabraVideo } from './analisis'
import { COLOR } from './constantes'
import { conPaquete, creditosPaquete } from './paqueteVideo'
import { avisarCreditos, NotaTarifa, Pildora, textoProgreso } from './EditarConIA'
import { buscarMomentos, LARGOS_CLIP, proyectoDeMomento, type LargoClip, type Momento } from './iaEdicion'

const fmt = (seg: number) => {
  const s = Math.round(seg)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

const CANTIDADES = [3, 5, 8]

/** El video entero como un único clip principal (lo que se escucha y se mira al clipear). */
export const clipEntero = (m: MedioVideo & { id: number }): ClipPrincipal => ({
  id: `entero-${m.id}`,
  pista: 'video',
  inicio: 0,
  duracion: m.duracion ?? 0,
  desde: 0,
  fuente: { tipo: 'video', medioId: m.id },
  filtro: 'ninguno',
  volumen: 1,
})
const ASPECTOS: ProyectoVideo['aspecto'][] = ['9:16', '16:9', '1:1']

/**
 * «Clipear momentos importantes»: la IA escucha y mira un video largo, elige
 * sus mejores momentos y cada uno se vuelve un proyecto propio (el trozo del
 * video, un gancho arriba y subtítulos), listo para abrir y editar a mano o con
 * IA.
 */
export function ClipearMomentos({
  medioInicial,
  onAbrir,
  onCerrar,
}: {
  medioInicial?: number
  /** Abre el proyecto creado; `conIA` = y abre «Editar video con IA» encima. */
  onAbrir: (id: number, conIA: boolean) => void
  onCerrar: () => void
}) {
  const t = useT()
  const medios = mediosVideoRepo.useAll() ?? (VACIO as MedioVideo[])
  const videos = medios.filter((m): m is MedioVideo & { id: number } => m.tipo === 'video' && m.id != null && (!!m.blob || !!m.nube))
  const [medioId, setMedioId] = useState<number | null>(medioInicial ?? null)
  const medio = videos.find((m) => m.id === medioId) ?? videos[0]
  const [cantidad, setCantidad] = useState(5)
  const [largo, setLargo] = useState<LargoClip>('medio')
  const [aspecto, setAspecto] = useState<ProyectoVideo['aspecto']>('9:16')
  const [subtitulos, setSubtitulos] = useState(true)
  const [instrucciones, setInstrucciones] = useState('')
  const [progreso, setProgreso] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState<{ medioId: number; momentos: Momento[]; frases: FraseVideo[]; palabras: PalabraVideo[] } | null>(null)
  const [miniaturas, setMiniaturas] = useState<(string | null)[]>([])
  /** Índice del momento → proyecto ya creado (no se duplica al volver a tocar). */
  const [creados, setCreados] = useState<Map<number, number>>(new Map())
  const [viendo, setViendo] = useState<number | null>(null)
  const [urlVideo, setUrlVideo] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const vivo = useRef(true)
  useEffect(
    () => () => {
      vivo.current = false
    },
    [],
  )

  // El reproductor de la vista previa: un solo <video> con el medio analizado.
  const idResultado = resultado?.medioId
  useEffect(() => {
    if (idResultado == null) return
    let url: string | null = null
    void asegurarBlob('mediosVideo', idResultado).then((b) => {
      if (!b || !vivo.current) return
      url = URL.createObjectURL(b)
      setUrlVideo(url)
    })
    return () => {
      if (url) URL.revokeObjectURL(url)
      setUrlVideo(null)
    }
  }, [idResultado])

  const tramos = Math.max(1, medio ? creditosEscucha([clipEntero(medio)], medios) : 0)
  const creditos = creditosPaquete('video.clipear', tramos)

  const buscar = async () => {
    if (!medio) return
    if (!(await avisarCreditos(t, medio.duracion ?? 0, creditos))) return
    setError('')
    setCreados(new Map())
    setViendo(null)
    setProgreso(t('video.editarIA.preparando', 'Preparando…'))
    try {
      const { analisis, momentos } = await conPaquete(
        'video.clipear',
        tramos,
        async () => {
          const analisis = await analizarLinea([clipEntero(medio)], medios, {
            vertical: (medio.alto ?? 0) > (medio.ancho ?? 1),
            alProgreso: (fase, n, total) => vivo.current && setProgreso(textoProgreso(t, fase, n, total)),
          })
          if (vivo.current) setProgreso(textoProgreso(t, 'ia', 0, 0))
          return { analisis, momentos: await buscarMomentos(analisis, { cantidad, largo, instrucciones }) }
        },
        (r) => Math.max(1, r.analisis.escuchados),
      )
      if (!vivo.current) return
      setResultado({ medioId: medio.id, momentos, frases: analisis.frases, palabras: analisis.palabras })
      setMiniaturas([])
      void fotogramas(medio.id, momentos.map((m) => m.inicio + 0.5), 240).then((x) => vivo.current && setMiniaturas(x))
    } catch (e) {
      if (vivo.current) setError(mensajeErrorIA(e, t, t('video.clipear.error', 'No se pudieron buscar los momentos')))
    } finally {
      if (vivo.current) setProgreso(null)
    }
  }

  const crear = async (i: number): Promise<number | null> => {
    if (!resultado) return null
    const ya = creados.get(i)
    if (ya != null) return ya
    const id = await proyectosVideoRepo.add(
      proyectoDeMomento(resultado.medioId, resultado.momentos[i], resultado.frases, { aspecto, subtitulos, gancho: true, palabras: resultado.palabras }) as ProyectoVideo,
    )
    setCreados((m) => new Map(m).set(i, id))
    return id
  }

  const ver = (i: number) => {
    const v = videoRef.current
    const m = resultado?.momentos[i]
    if (!v || !m) return
    if (viendo === i && !v.paused) {
      v.pause()
      setViendo(null)
      return
    }
    setViendo(i)
    v.currentTime = m.inicio
    void v.play().catch(() => setViendo(null))
  }
  // Para al final del momento que se está viendo.
  const alAvanzar = () => {
    const v = videoRef.current
    const m = viendo != null ? resultado?.momentos[viendo] : undefined
    if (v && m && v.currentTime >= m.fin) {
      v.pause()
      setViendo(null)
    }
  }

  if (resultado) {
    return (
      <Modal titulo={t('video.clipear.resultados', 'Los mejores momentos')} onCerrar={onCerrar} ancho="max-w-2xl">
        {urlVideo && (
          <video
            ref={videoRef}
            src={urlVideo}
            playsInline
            onTimeUpdate={alAvanzar}
            onPause={() => setViendo(null)}
            className={`w-full rounded-lg bg-black ${viendo == null ? 'hidden' : 'max-h-64'}`}
          />
        )}
        <ul className="max-h-[50vh] space-y-2 overflow-y-auto">
          {resultado.momentos.map((m, i) => {
            const creado = creados.get(i)
            return (
              <li key={`${m.inicio}-${i}`} className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-2">
                <button
                  type="button"
                  onClick={() => ver(i)}
                  aria-label={viendo === i ? t('video.clipear.pausar', 'Pausar') : t('video.clipear.ver', 'Ver el momento')}
                  className="relative h-20 w-32 shrink-0 overflow-hidden rounded-lg bg-black"
                >
                  {miniaturas[i] && <img src={miniaturas[i]!} alt="" className="h-full w-full object-cover" />}
                  <span className="ui-noche absolute inset-0 grid place-items-center bg-black/30 text-xl text-white">
                    <Icono nombre={viendo === i ? 'pausa' : 'play'} />
                  </span>
                  <span className="ui-noche absolute bottom-1 end-1 rounded bg-black/70 px-1 font-mono text-[10px] text-white">{fmt(m.fin - m.inicio)}</span>
                </button>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-start gap-2">
                    <p className="min-w-0 flex-1 text-sm font-semibold leading-tight">{m.titulo}</p>
                    <span
                      className="shrink-0 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold text-amber-200"
                      title={t('video.clipear.puntuacion', 'Puntuación de la IA')}
                    >
                      <Icono nombre="estrella" /> {m.puntuacion}/10
                    </span>
                  </div>
                  <p className="font-mono text-[11px] text-white/45">
                    {fmt(m.inicio)}–{fmt(m.fin)}
                  </p>
                  {m.motivo && <p className="text-[11px] text-white/55">{m.motivo}</p>}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <BotonSecundario
                      pequeno
                      onClick={async () => {
                        const id = await crear(i)
                        if (id != null) onAbrir(id, false)
                      }}
                    >
                      <Icono nombre="editar" /> {t('video.clipear.editar', 'Editar')}
                    </BotonSecundario>
                    <BotonSecundario
                      pequeno
                      onClick={async () => {
                        const id = await crear(i)
                        if (id != null) onAbrir(id, true)
                      }}
                    >
                      <Icono nombre="brillo" /> {t('video.clipear.editarIA', 'Editar con IA')}
                    </BotonSecundario>
                    <BotonSecundario pequeno disabled={creado != null} onClick={() => void crear(i)}>
                      <Icono nombre={creado != null ? 'hecho' : 'agregar'} />{' '}
                      {creado != null ? t('video.clipear.creado', 'Guardado en Videos') : t('video.clipear.crear', 'Guardar clip')}
                    </BotonSecundario>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
        <div className="grid grid-cols-2 gap-2">
          <BotonSecundario onClick={() => setResultado(null)}>
            <Icono nombre="deshacer" /> {t('video.clipear.otraVez', 'Buscar otra vez')}
          </BotonSecundario>
          <BotonPrimario
            type="button"
            app={COLOR}
            disabled={creados.size === resultado.momentos.length}
            onClick={async () => {
              for (let i = 0; i < resultado.momentos.length; i++) await crear(i)
            }}
          >
            <Icono nombre="agregar" /> {t('video.clipear.crearTodos', 'Guardar todos')}
          </BotonPrimario>
        </div>
        <p className="text-xs text-white/40">{t('video.clipear.notaResultados', 'Cada clip guardado es un video nuevo en tu lista, con el gancho arriba y subtítulos.')}</p>
      </Modal>
    )
  }

  const ocupado = progreso != null
  return (
    <Modal titulo={t('video.clipear.titulo', 'Clipear momentos importantes')} onCerrar={onCerrar}>
      <p className="text-xs text-white/55">
        {t('video.clipear.intro', 'La IA escucha y mira un video largo, encuentra sus mejores momentos y los convierte en clips que luego puedes editar.')}
      </p>
      {videos.length === 0 ? (
        <p className="text-xs text-amber-300">{t('video.clipear.sinVideos', 'Importa primero un video en Medios.')}</p>
      ) : (
        <Campo etiqueta={t('video.clipear.video', 'Video')}>
          <select value={medio?.id ?? ''} onChange={(e) => setMedioId(Number(e.target.value))} className={INPUT}>
            {videos.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
                {m.duracion ? ` · ${fmt(m.duracion)}` : ''}
              </option>
            ))}
          </select>
        </Campo>
      )}
      <div>
        <p className="mb-1 text-xs text-white/50">{t('video.clipear.cuantos', 'Cuántos clips')}</p>
        <div className="flex flex-wrap gap-1.5">
          {CANTIDADES.map((n) => (
            <Pildora key={n} activo={cantidad === n} onClick={() => setCantidad(n)}>
              {n}
            </Pildora>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1 text-xs text-white/50">{t('video.clipear.duracion', 'Duración de cada clip')}</p>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(LARGOS_CLIP) as LargoClip[]).map((l) => (
            <Pildora key={l} activo={largo === l} onClick={() => setLargo(l)}>
              {t('video.clipear.rango', '{min}–{max} s', { min: LARGOS_CLIP[l][0], max: LARGOS_CLIP[l][1] })}
            </Pildora>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1 text-xs text-white/50">{t('video.clipear.formato', 'Formato de los clips')}</p>
        <div className="flex flex-wrap gap-1.5">
          {ASPECTOS.map((a) => (
            <Pildora key={a} activo={aspecto === a} onClick={() => setAspecto(a)}>
              {a}
            </Pildora>
          ))}
          <Pildora activo={subtitulos} onClick={() => setSubtitulos((s) => !s)}>
            {t('video.editarIA.op.subtitulos', 'Subtítulos')}
          </Pildora>
        </div>
      </div>
      <Campo etiqueta={t('video.clipear.buscar', 'Qué buscar (opcional)')}>
        <textarea
          value={instrucciones}
          onChange={(e) => setInstrucciones(e.target.value)}
          rows={2}
          placeholder={t('video.clipear.buscarPh', 'Los momentos más graciosos, los consejos prácticos…')}
          className={INPUT}
        />
      </Campo>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <BotonPrimario type="button" app={COLOR} disabled={ocupado || !medio} onClick={() => void buscar()}>
        {ocupado ? <Spinner pequeno /> : <Icono nombre="tijeras" />} {ocupado ? progreso : t('video.clipear.boton', 'Buscar los mejores momentos')}{' '}
        {!ocupado && medio && <Creditos n={creditos} />}
      </BotonPrimario>
      <NotaTarifa />
    </Modal>
  )
}
