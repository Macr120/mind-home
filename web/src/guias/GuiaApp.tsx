import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { crearT, idiomasDe, type Guion, type Linea, type Textos } from './datos'
import { IDIOMAS, prefijo } from '../../i18n/idiomas.mjs'
import { Bloque, Lamina } from './Bloques'
import { Herramienta } from './Herramientas'
import { MEMES, Meme } from './Memes'
import { ESCENA_REPOSO } from './pep'

const Escenario3D = lazy(() => import('./Escenario3D'))

const URL_APP = 'https://app.mindhaos.com'
const PLAY = 'https://play.google.com/store/apps/details?id=com.macr120.mindhome'
const MS_STORE = 'https://apps.microsoft.com/detail/9N893LFZHR0T'

/** Idiomas que no separan las palabras con espacios. */
const SIN_ESPACIOS = ['ja', 'zh']

/** Caracteres por segundo de la voz, para estimar sin audio; en chino/japonés, menos. */
const cpsDe = (idioma: string) => (['ja', 'zh'].includes(idioma) ? 6 : idioma === 'ko' ? 8 : 14)

/**
 * Tiempos del audio pregenerado (scripts/guias/voz.mjs): duración de cada
 * línea y el instante en que empieza cada palabra (límites de palabra del TTS).
 */
interface Tiempos {
  [clave: string]: number | Record<string, unknown> | undefined
  _palabras?: Record<string, number[]>
  /** Una pista por parte (y `cierre`): dónde empieza cada línea dentro de ella. */
  _partes?: Record<string, { archivo: string; v: string; inicios: Record<string, number> }>
}

/**
 * De dónde sale el audio: en desarrollo, del propio servidor (web/public); en
 * producción, del bucket de R2 detrás de media.mindhaos.com, fuera del
 * despliegue de Pages (CORS abierto: la boca de Pep@ analiza el audio).
 */
const MEDIA = import.meta.env.DEV ? '' : 'https://media.mindhaos.com'

/**
 * El texto que suena, iluminado palabra a palabra. Los límites del TTS no
 * cuentan la puntuación ni coinciden 1:1 con las palabras escritas (los números
 * dichos en letra, por ejemplo), así que se reparte en proporción: si van dichas
 * k de n palabras del audio, se ilumina esa fracción del texto escrito.
 */
function TextoNarrado({ texto, activo, inicio, duracion, palabras, idioma }: { texto: string; activo: boolean; inicio: number; duracion: number; palabras?: number[]; idioma: string }) {
  // Japonés y chino no separan las palabras con espacios: las corta el segmentador del navegador.
  const trozos = useMemo(
    () => (SIN_ESPACIOS.includes(idioma) ? [...new Intl.Segmenter(idioma, { granularity: 'word' }).segment(texto)].map((x) => x.segment) : texto.split(/(\s+)/)),
    [texto, idioma],
  )
  const [, tic] = useState(0)
  useEffect(() => {
    if (!activo) return
    const id = setInterval(() => tic((n) => n + 1), 80)
    return () => clearInterval(id)
  }, [activo])
  if (!activo) return <>{texto}</>
  const s = (performance.now() - inicio) / 1000
  let fraccion: number
  if (palabras?.length) {
    let k = 0
    while (k < palabras.length && palabras[k] <= s) k++
    fraccion = k / palabras.length
  } else {
    fraccion = Math.min(1, s / duracion)
  }
  const total = trozos.filter((x) => x.trim()).length
  const dichas = Math.round(fraccion * total)
  let n = 0
  return (
    <>
      {trozos.map((x, i) => {
        if (!x.trim()) return x
        n++
        return (
          <span key={i} className={n < dichas ? 'g-dicha' : n === dichas ? 'g-dicha g-ahora' : 'g-por-decir'}>
            {x}
          </span>
        )
      })}
    </>
  )
}

/**
 * El menú de idiomas de la web (mismo marcado y clase `idiomas` que las páginas
 * de web-i18n.mjs): un enlace a esta guía en cada idioma que tiene guion. Elegir
 * guarda la elección, como en el resto de la web.
 */
function SelectorIdioma({ tema, idioma, etiqueta }: { tema: string; idioma: string; etiqueta: string }) {
  const actual = IDIOMAS.find((i) => i.id === idioma) ?? IDIOMAS[0]
  return (
    <details className="idiomas">
      <summary title={etiqueta} aria-label={etiqueta}>
        <span>{actual.flag}</span>
        <span className="endonimo">{actual.endonimo}</span>
      </summary>
      <nav>
        {IDIOMAS.filter((i) => idiomasDe(tema).includes(i.id)).map((i) => (
          <a
            key={i.id}
            lang={i.id}
            href={`${prefijo(i.id)}/guias/${tema}`}
            aria-current={i.id === idioma ? 'true' : undefined}
            onClick={() => {
              try {
                localStorage.setItem('mph.idioma', i.id)
              } catch {
                // Sin almacenamiento, el enlace lleva igual al idioma elegido.
              }
            }}
          >
            <span>{i.flag}</span>
            {i.endonimo}
          </a>
        ))}
      </nav>
    </details>
  )
}

/** Inicio, dentro de la pista, de la línea que sigue a `i` si es de la misma parte. */
function n1(pasos: Paso[], i: number, inicios: Record<string, number>): number | undefined {
  const sig = pasos[i + 1]
  return sig && sig.parte === pasos[i].parte ? inicios[sig.clave] : undefined
}

/** Efecto de sonido (memes, cifras). Suena por la pestaña: el grabador lo captura con la voz. */
function sonar(id: string, volumen = 0.45) {
  const a = new Audio(`/guias/sonidos/${id}.mp3`)
  a.volume = volumen
  void a.play().catch(() => {})
}

/**
 * Plano de Pep@ en la grabación, según lo que cuenta la línea (el guion puede
 * fijarlo con `plano`): de cuerpo entero sobre la página al presentar, en los
 * títulos y en las menciones; en la esquina cuando lo protagonista es el
 * contenido; y mitad y mitad para explicar.
 */
type Plano = 'mitad' | 'esquina' | 'cuerpo'
function planoDe(l: Linea): Plano {
  if (l.plano) return l.plano
  if (l.visual.tipo === 'titulo' || l.visual.tipo === 'fondo' || l.visual.tipo === 'encabezado') return 'cuerpo'
  if (['herramienta', 'grafica', 'dato', 'lista', 'pasos', 'foto', 'meme', 'cita'].includes(l.visual.tipo) || l.meme) return 'esquina'
  return 'mitad'
}
const GESTOS_HABLA = ['habla', 'senala', 'saluda']

/** Una línea narrable, aplanada: el cierre va al final como una línea más. */
interface Paso {
  parte: number // índice de parte; partes.length = cierre
  linea: Linea
  clave: string
}

/**
 * Modo grabación (`?grabar=1`): la guía se narra sola de principio a fin
 * (o desde `#parte-N`), con desplazamiento automático y las herramientas
 * usándose solas. Es lo que captura el grabador por CDP para el video.
 */
const GRABAR = new URLSearchParams(location.search).has('grabar')

export function GuiaApp({ tema, guion, textos, idioma }: { tema: string; guion: Guion; textos: Textos; idioma: string }) {
  const t = useMemo(() => crearT(textos), [textos])
  const pasos = useMemo<Paso[]>(() => {
    const r: Paso[] = guion.partes.flatMap((p, i) => p.lineas.map((l) => ({ parte: i, linea: l, clave: `${p.id}.${l.id}` })))
    const c = guion.cierre
    // Con lámina (la app navegándose), el cierre va con Pep@ en su círculo y la app en el recuadro.
    r.push({
      parte: guion.partes.length,
      linea: { id: c.id, escena: c.escena, texto: c.texto, visual: { tipo: 'fondo' }, mencion: true, lamina: c.lamina, plano: c.lamina ? 'esquina' : undefined },
      clave: `cierre.${c.id}`,
    })
    return r
  }, [guion])

  const [actual, setActual] = useState(-1)
  const [sonando, setSonando] = useState(false)
  const [hastaFin, setHastaFin] = useState(false)
  // Marca del grabador (grabar=cdp): visible hasta que arranca la narración.
  const [marca, setMarca] = useState(GRABAR)
  const [inicioLinea, setInicioLinea] = useState(0)
  const nivel = useRef(0)
  const audio = useRef<HTMLAudioElement | null>(null)
  const analizador = useRef<AnalyserNode | null>(null)
  const tiempos = useRef<Tiempos | null>(null)
  const durLinea = useRef(1)
  /** Pista cargada ahora y pausa diferida: entre dos líneas de la misma parte la pista no se detiene. */
  const pistaActual = useRef('')
  const pausaPendiente = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    fetch(`${MEDIA}/guias/${tema}/audio/${idioma}/tiempos.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => (tiempos.current = d))
      .catch(() => {})
  }, [tema, idioma])

  const paso = actual >= 0 ? pasos[actual] : null
  const plano: Plano = GRABAR && sonando && paso ? planoDe(paso.linea) : 'mitad'
  const escena = sonando && paso ? paso.linea.escena : ESCENA_REPOSO

  const prepararAudio = () => {
    if (audio.current) return
    const a = new Audio()
    a.preload = 'auto'
    // Sin esto, el audio de otro origen llega en silencio al analizador de la boca.
    a.crossOrigin = 'anonymous'
    audio.current = a
    try {
      const ctx = new AudioContext()
      const fuente = ctx.createMediaElementSource(a)
      const an = ctx.createAnalyser()
      an.fftSize = 512
      fuente.connect(an).connect(ctx.destination)
      analizador.current = an
    } catch {
      // Sin Web Audio la boca se anima con la estimación de abajo.
    }
  }

  const reproducir = useCallback((i: number, todo: boolean) => {
    prepararAudio()
    setHastaFin(todo)
    setActual(i)
    setSonando(true)
  }, [])

  // Avance: al terminar el audio de la línea (o su estimación) pasa a la siguiente.
  useEffect(() => {
    if (!sonando || !paso) return
    const a = audio.current!
    setInicioLinea(performance.now())
    let vivo = true
    const terminar = () => {
      nivel.current = 0
      if (!vivo) return
      const n = actual + 1
      const mismaParte = n < pasos.length && pasos[n].parte === paso.parte
      if (n < pasos.length && (hastaFin || mismaParte)) setActual(n)
      else setSonando(false)
    }
    // El meme suena al aparecer; las cifras, con un clic discreto; el título de cada parte, con un golpe sordo.
    const meme = paso.linea.meme ?? (paso.linea.visual.tipo === 'meme' ? paso.linea.visual.meme : undefined)
    const efecto = meme
      ? setTimeout(() => sonar(MEMES[meme]?.sonido ?? 'click'), 900)
      : paso.linea.visual.tipo === 'dato'
        ? setTimeout(() => sonar('click', 0.3), 250)
        : paso.linea.visual.tipo === 'encabezado'
          ? setTimeout(() => sonar('thud', 0.55), 60)
          : undefined
    let estimado: ReturnType<typeof setTimeout> | undefined
    const dur = tiempos.current?.[paso.clave]
    durLinea.current = typeof dur === 'number' ? dur : paso.linea.texto.length / cpsDe(idioma) + 0.4
    // La línea suena dentro de la pista de su parte: se salta a su inicio (si no se viene
    // de la línea anterior) y se pasa a la siguiente al llegar al inicio de esta.
    const idParte = paso.parte < guion.partes.length ? guion.partes[paso.parte].id : 'cierre'
    const pista = tiempos.current?._partes?.[idParte]
    const ini = pista?.inicios[paso.clave]
    let vigia: ReturnType<typeof setInterval> | undefined
    clearTimeout(pausaPendiente.current)
    if (typeof dur === 'number' && pista && ini != null) {
      const src = `${MEDIA}/guias/${tema}/audio/${idioma}/${pista.archivo}?v=${pista.v}`
      if (pistaActual.current !== src) {
        pistaActual.current = src
        a.src = src
        a.currentTime = ini
      } else if (a.paused || Math.abs(a.currentTime - ini) > 0.3) {
        a.currentTime = ini
      }
      const siguiente = n1(pasos, actual, pista.inicios)
      a.onended = terminar
      if (siguiente != null) vigia = setInterval(() => a.currentTime >= siguiente && terminar(), 40)
      // Si el navegador bloquea el audio (autoplay sin gesto), la línea dura lo mismo en silencio.
      void a.play().catch(() => (estimado = setTimeout(terminar, durLinea.current * 1000)))
    } else {
      estimado = setTimeout(terminar, durLinea.current * 1000)
    }
    return () => {
      vivo = false
      a.onended = null
      clearInterval(vigia)
      // Diferida: si la siguiente línea sigue en la misma pista, la cancela y no hay corte.
      pausaPendiente.current = setTimeout(() => a.pause(), 0)
      clearTimeout(estimado)
      clearTimeout(efecto)
      nivel.current = 0
    }
  }, [sonando, actual, paso, pasos, hastaFin, tema, idioma, guion])

  // Varias láminas en una línea: se reparten su duración a partes iguales.
  const [vistas, setVistas] = useState<Set<string>>(() => new Set())
  useEffect(() => {
    if (GRABAR) return
    const obs = new IntersectionObserver(
      (es) => {
        const nuevas = es.filter((e) => e.isIntersecting).map((e) => (e.target as HTMLElement).dataset.clave!)
        if (nuevas.length) setVistas((v) => new Set([...v, ...nuevas]))
      },
      { rootMargin: '0px 0px -12% 0px' },
    )
    document.querySelectorAll('[data-clave]').forEach((e) => obs.observe(e))
    return () => obs.disconnect()
  }, [pasos])

  const [laminaIdx, setLaminaIdx] = useState(0)
  useEffect(() => {
    setLaminaIdx(0)
    const ls = paso?.linea.lamina
    if (!sonando || !Array.isArray(ls) || ls.length < 2) return
    const cada = (durLinea.current * 1000) / ls.length
    const ids = ls.slice(1).map((_, i) => setTimeout(() => setLaminaIdx(i + 1), cada * (i + 1)))
    return () => ids.forEach(clearTimeout)
  }, [sonando, paso])
  const laminaCruda = plano === 'esquina' ? paso?.linea.lamina : undefined
  const lamina = Array.isArray(laminaCruda) ? laminaCruda[Math.min(laminaIdx, laminaCruda.length - 1)] : laminaCruda

  // Grabación: un tic al entrar cada lámina y un soplo suave al cambiar Pep@ de plano.
  useEffect(() => {
    if (GRABAR && lamina) sonar('tic', 0.22)
  }, [lamina])
  const planoPrevio = useRef(plano)
  useEffect(() => {
    if (GRABAR && sonando && planoPrevio.current !== plano) sonar('whoosh', 0.1)
    planoPrevio.current = plano
  }, [plano, sonando])

  // Nivel de la boca: amplitud real del audio, o un vaivén si no hay audio.
  useEffect(() => {
    if (!sonando) return
    let raf = 0
    const buf = new Uint8Array(256)
    const t0 = performance.now()
    const bucle = () => {
      const an = analizador.current
      if (an && tiempos.current) {
        an.getByteTimeDomainData(buf)
        let s = 0
        for (const x of buf) s += ((x - 128) / 128) ** 2
        nivel.current = Math.min(1, Math.sqrt(s / buf.length) * 4)
      } else {
        const tt = (performance.now() - t0) / 1000
        nivel.current = 0.35 + 0.35 * Math.sin(tt * 13) * Math.sin(tt * 3.1)
      }
      raf = requestAnimationFrame(bucle)
    }
    bucle()
    return () => cancelAnimationFrame(raf)
  }, [sonando, actual])

  // La línea que suena se lleva a la vista (en grabación y en reproducción).
  useEffect(() => {
    if (!sonando || !paso) return
    const destino = document.getElementById(`l-${paso.clave}`)
    destino?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // Al cambiar de plano el contenido cambia de ancho y de alto: se recoloca al terminar la transición.
    const id = setTimeout(() => destino?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 850)
    return () => clearTimeout(id)
  }, [sonando, paso])

  // El ancla (#parte-N) llega antes de que exista el contenido: se respeta al montar.
  useEffect(() => {
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView()
  }, [])

  // Grabación: arranca sola desde el ancla (#parte-N) o desde el principio.
  useEffect(() => {
    if (!GRABAR) return
    const m = /^#parte-(\d+)/.exec(location.hash)
    const parte = m ? Number(m[1]) - 1 : 0
    // Las líneas `enCasa` ya suenan en el video sobre la toma de la casa.
    const i = Math.max(0, pasos.findIndex((p) => p.parte === parte && !p.linea.enCasa))
    // Con el grabador por CDP (`grabar=cdp`) arranca cuando él lo diga, ya grabando.
    if (new URLSearchParams(location.search).get('grabar') === 'cdp') {
      ;(window as unknown as { __guiaEmpezar: () => void }).__guiaEmpezar = () => {
        setMarca(false)
        reproducir(i, !m)
      }
      return
    }
    const id = setTimeout(() => reproducir(i, !m), 1500)
    return () => clearTimeout(id)
  }, [pasos, reproducir])

  useEffect(() => {
    document.documentElement.classList.toggle('g-grabando', GRABAR)
    ;(window as unknown as { __guia: unknown }).__guia = { sonando, actual, total: pasos.length }
  }, [sonando, actual, pasos.length])

  const enlaceApp = `${URL_APP}/?app=${guion.plantillaId}&utm_source=guia&utm_campaign=guia-${tema}-${idioma}`
  const parteDe = paso?.parte ?? -1
  const activa = (p: Paso) => sonando && paso?.clave === p.clave
  // Lo ya visto entra con las transiciones de la app (cascada, enfoque): en la grabación,
  // cada línea al narrarse; en la web, al llegar a la pantalla o al escucharla.
  const vista = (p: Paso) => (GRABAR ? actual >= 0 && pasos.indexOf(p) <= actual : vistas.has(p.clave) || activa(p))
  const claseVista = (p?: Paso) => (p && vista(p) ? ' vista' : '')

  const texto = (p: Paso) => (
    <TextoNarrado
      texto={p.linea.texto}
      activo={activa(p)}
      inicio={inicioLinea}
      duracion={durLinea.current}
      palabras={tiempos.current?._palabras?.[p.clave]}
      idioma={idioma}
    />
  )

  const lineaVisual = (p: Paso) => {
    const v = p.linea.visual
    if (v.tipo === 'herramienta') return <Herramienta id={v.herramienta!} t={t} demo={GRABAR && activa(p)} />
    if (v.tipo === 'meme') return <Meme id={v.meme!} tema={tema} t={t} />
    return <Bloque v={v} tema={tema} t={t} />
  }

  return (
    <div className={`g-pagina g-plano-${plano}`}>
      {/* El grabador la busca en la captura para saber dónde acaba el viewport (escala real variable). */}
      {marca && <i className="g-marca-grabador" aria-hidden="true" />}
      {GRABAR && <Lamina id={lamina} tema={tema} idioma={idioma} />}
      {GRABAR && (
        <div className="g-sello" aria-hidden="true">
          <svg viewBox="0 0 357 100"><rect y="3" width="94" height="94" rx="20" fill="#FFB319" /><path d="M137 0V100H237Z" fill="#FF505F" /><path d="M257 0H357V100A100 100 0 0 1 257 0Z" fill="#C07DFE" /></svg>
          MindHaOS
        </div>
      )}
      <aside className="g-escenario">
        <div className="g-fondo" aria-hidden="true" />
        <div className="g-lienzo">
          <Suspense fallback={<p className="g-cargando">{t('comun.cargando3d')}</p>}>
            <Escenario3D tema={tema} escena={escena} nivel={nivel} busto={plano === 'esquina' && GESTOS_HABLA.includes(escena)} cerca={plano === 'cuerpo'} />
          </Suspense>
        </div>
        <div className="g-escenario-pie">
          <span className="g-narra">{t('comun.narra')}</span>
          {parteDe >= 0 && parteDe < guion.partes.length && (
            <span className="g-progreso">
              {t('comun.parte')} {parteDe + 1} {t('comun.de')} {guion.partes.length} · {guion.partes[parteDe].titulo}
            </span>
          )}
          <button
            type="button"
            className="g-boton principal"
            onClick={() => (sonando ? setSonando(false) : reproducir(actual >= 0 && actual < pasos.length - 1 ? actual : 0, true))}
          >
            {sonando ? t('comun.pausar') : actual > 0 ? t('comun.reanudar') : t('comun.escucharTodo')}
          </button>
        </div>
      </aside>

      <main className="g-contenido">
        <header className="g-cabeza">
          <div className="g-cabeza-fila">
            <a className="g-serie" href={`${prefijo(idioma)}/guias`}>
              <svg className="g-logo" viewBox="0 0 357 100" aria-hidden="true"><rect y="3" width="94" height="94" rx="20" fill="#FFB319" /><path d="M137 0V100H237Z" fill="#FF505F" /><path d="M257 0H357V100A100 100 0 0 1 257 0Z" fill="#C07DFE" /></svg>
              {t('comun.serie')}
            </a>
            {!GRABAR && <SelectorIdioma tema={tema} idioma={idioma} etiqueta={t('comun.idioma')} />}
          </div>
          <h1>{guion.pregunta}</h1>
          <p className="g-subtitulo">{guion.subtitulo}</p>
          <nav className="g-indice" aria-label={t('comun.indice')}>
            {guion.partes.map((p, i) => (
              <a key={p.id} href={`#parte-${i + 1}`} className={parteDe === i ? 'activo' : ''}>
                <i>{i + 1}</i>
                {p.titulo}
              </a>
            ))}
          </nav>
        </header>

        {guion.partes.map((p, i) => {
          const lineas = pasos.filter((x) => x.parte === i)
          // La línea que lee el título de la parte se ilumina en su propio encabezado.
          const titulo = lineas.find((x) => x.linea.visual.tipo === 'encabezado')
          return (
            <section key={p.id} id={`parte-${i + 1}`} className={`g-parte${parteDe === i ? ' activa' : ''}`}>
              <div
                id={titulo ? `l-${titulo.clave}` : undefined}
                data-clave={titulo?.clave}
                className={`g-parte-cabeza${titulo && activa(titulo) ? ' leyendo' : ''}${claseVista(titulo)}`}
              >
                <span className="g-num">
                  {t('comun.parte')} {i + 1}
                </span>
                <h2>{p.titulo}</h2>
                <button
                  type="button"
                  className="g-boton"
                  onClick={() => (sonando && parteDe === i ? setSonando(false) : reproducir(pasos.findIndex((x) => x.parte === i), false))}
                >
                  {sonando && parteDe === i ? t('comun.pausar') : t('comun.escuchar')}
                </button>
              </div>
              {lineas
                .filter((x) => x !== titulo)
                .map((x) => (
                  <div key={x.clave} id={`l-${x.clave}`} data-clave={x.clave} className={`g-linea${activa(x) ? ' activa' : ''}${claseVista(x)}`}>
                    <p
                      className={x.linea.visual.tipo === 'titulo' || x.linea.visual.tipo === 'fondo' ? 'g-entrada' : undefined}
                      onClick={() => reproducir(pasos.indexOf(x), false)}
                    >
                      {texto(x)}
                    </p>
                    {lineaVisual(x)}
                    {x.linea.meme && <Meme id={x.linea.meme} tema={tema} t={t} />}
                  </div>
                ))}
              {p.lineas.some((l) => l.visual.tipo === 'aviso') && <p className="g-aviso">{guion.aviso}</p>}
            </section>
          )
        })}

        <section id="cuarto" className={`g-cierre${parteDe === guion.partes.length ? ' activa' : ''}${claseVista(pasos[pasos.length - 1])}`}>
          <div id={`l-cierre.${guion.cierre.id}`} data-clave={pasos[pasos.length - 1].clave}>
            <h2>{t(`${tema}.cierre.titulo`)}</h2>
            <p>{texto(pasos[pasos.length - 1])}</p>
            <div className="g-acciones">
              <a className="g-boton principal" href={enlaceApp}>
                {guion.cierre.boton}
              </a>
              <a className="g-boton" href={PLAY}>
                Google Play
              </a>
              <a className="g-boton" href={MS_STORE}>
                Microsoft Store
              </a>
            </div>
            <p className="g-sub">{t('comun.tiendas')}</p>
          </div>
        </section>

        <footer className="g-pie">
          <p className="g-aviso">
            <b>{t('comun.aviso')}.</b> {guion.aviso}
          </p>
          <h3>{t('comun.fuentes')}</h3>
          <ol className="g-fuentes">
            {guion.fuentes.map((f) => (
              <li key={f.id}>
                <a href={f.url} rel="noopener" target="_blank">
                  {f.texto}
                </a>
              </li>
            ))}
          </ol>
          <p className="g-sub">{t('comun.otrasGuias')}</p>
        </footer>
      </main>
    </div>
  )
}
