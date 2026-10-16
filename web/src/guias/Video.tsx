import { useEffect, useState } from 'react'
import type { T } from './datos'

/**
 * Lo propio de la guía de Video («¿Cómo hacer videos?»): sus mini-herramientas y
 * sus gráficas, todas dibujadas aquí (SVG y CSS, sin videos ajenos). Con `demo`
 * (su línea suena en modo grabación) cada herramienta se usa sola al ritmo de la voz.
 */
export const HERRAMIENTAS_VIDEO = new Set([
  'fotogramas',
  'planos',
  'tercios',
  'angulos',
  'luz',
  'microfono',
  'apoyo',
  'kuleshov',
  'cortesJL',
  'videosAno',
])

export function HerramientaVideo({ id, t, demo }: { id: string; t: T; demo: boolean }) {
  const k = (s: string) => t(`video.${id}.${s}`)
  if (id === 'fotogramas') return <Fotogramas k={k} demo={demo} />
  if (id === 'planos') return <Planos k={k} demo={demo} />
  if (id === 'tercios') return <Tercios k={k} demo={demo} />
  if (id === 'angulos') return <Angulos k={k} demo={demo} />
  if (id === 'luz') return <Luz k={k} demo={demo} />
  if (id === 'microfono') return <Microfono k={k} demo={demo} />
  if (id === 'apoyo') return <Apoyo k={k} demo={demo} />
  if (id === 'kuleshov') return <Kuleshov k={k} demo={demo} />
  if (id === 'cortesJL') return <CortesJL k={k} demo={demo} />
  if (id === 'videosAno') return <VideosAno k={k} demo={demo} />
  return null
}

type K = (s: string) => string

/** En modo demo, aplica los pasos uno tras otro: el primero a `primero` ms y luego cada `ms`. */
function useDemo<V>(demo: boolean, pasos: V[], ms: number, aplicar: (v: V) => void, primero = ms) {
  useEffect(() => {
    if (!demo) return
    let i = 0
    let id = 0
    const uno = () => {
      if (i < pasos.length) aplicar(pasos[i++])
      id = window.setTimeout(uno, ms)
    }
    id = window.setTimeout(uno, primero)
    return () => clearTimeout(id)
    // Los pasos son literales de quien llama: solo importa encender/apagar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo])
}

/** Un reloj en segundos desde que se monta (para animar dibujos). */
function useReloj() {
  const [s, setS] = useState(0)
  useEffect(() => {
    const t0 = performance.now()
    let id = 0
    const paso = () => {
      setS((performance.now() - t0) / 1000)
      id = requestAnimationFrame(paso)
    }
    id = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(id)
  }, [])
  return s
}

const lang = () => document.documentElement.lang || 'es'
const num = (n: number) => new Intl.NumberFormat(lang(), { maximumFractionDigits: 0 }).format(Math.round(n))

/** Los botones de una opción entre varias. */
function Segmentos<V extends string | number>({ valores, valor, set, rotulo }: { valores: V[]; valor: V; set: (v: V) => void; rotulo?: (v: V) => string }) {
  return (
    <div className="g-segmentos g-segmentos-anchos">
      {valores.map((v) => (
        <button key={v} type="button" className={v === valor ? 'activo' : ''} onClick={() => set(v)}>
          {rotulo ? rotulo(v) : v}
        </button>
      ))}
    </div>
  )
}

/** Una persona sencilla (cabeza, cuerpo y brazos), con su base en (x, y) y `alto` de la cabeza a los pies. */
function Persona({ x, y, alto, color = 'var(--vid-persona)' }: { x: number; y: number; alto: number; color?: string }) {
  const c = alto / 10
  return (
    <g className="g-vid-persona" style={{ ['--c' as string]: color }}>
      <rect x={x - 1.6 * c} y={y - 6.4 * c} width={3.2 * c} height={4.2 * c} rx={1.2 * c} />
      <rect x={x - 1.3 * c} y={y - 2.3 * c} width={1.1 * c} height={2.3 * c} rx={0.4 * c} />
      <rect x={x + 0.2 * c} y={y - 2.3 * c} width={1.1 * c} height={2.3 * c} rx={0.4 * c} />
      <circle cx={x} cy={y - 8.2 * c} r={1.7 * c} className="g-vid-cara" />
      <circle cx={x - 0.6 * c} cy={y - 8.4 * c} r={0.22 * c} className="g-vid-ojo" />
      <circle cx={x + 0.6 * c} cy={y - 8.4 * c} r={0.22 * c} className="g-vid-ojo" />
    </g>
  )
}

/** El paisaje de fondo de los ejemplos: cielo, sol, montañas, suelo y un árbol. */
function Paisaje({ horizonte = 120 }: { horizonte?: number }) {
  return (
    <g>
      <rect x="0" y="0" width="320" height="180" className="g-vid-cielo" />
      <circle cx="262" cy="40" r="16" className="g-vid-sol" />
      <path d={`M0 ${horizonte} L60 ${horizonte - 40} L110 ${horizonte - 12} L170 ${horizonte - 52} L240 ${horizonte - 8} L320 ${horizonte - 30} L320 ${horizonte} Z`} className="g-vid-monte" />
      <rect x="0" y={horizonte} width="320" height={180 - horizonte} className="g-vid-suelo" />
      <rect x="40" y={horizonte - 30} width="6" height="34" className="g-vid-tronco" />
      <circle cx="43" cy={horizonte - 36} r="16" className="g-vid-copa" />
    </g>
  )
}

// ───────── Parte 1: fotos fijas que se mueven ─────────

/** Una pelota que bota de lado a lado, mostrada a 2, 12 o 24 fotos por segundo. */
function Fotogramas({ k, demo }: { k: K; demo: boolean }) {
  const [fps, setFps] = useState(2)
  useDemo<number>(demo, [12, 24], 2600, setFps, 2400)
  const s = useReloj()
  const CICLO = 2
  const muestra = Math.floor(s * fps) / fps
  const pos = (tt: number) => {
    const q = (tt % CICLO) / CICLO
    const x = 30 + 260 * (q < 0.5 ? q * 2 : 2 - q * 2)
    const bote = Math.abs(Math.sin(q * Math.PI * 4))
    return [x, 140 - 100 * bote] as const
  }
  const [x, y] = pos(muestra)
  // La tira: las fotos de un segundo (máximo 12 dibujadas), con la actual resaltada.
  const enTira = Math.min(fps, 12)
  const actual = Math.floor((s * fps) % fps)
  return (
    <div className="g-herramienta g-vid">
      <h4>{k('titulo')}</h4>
      <svg viewBox="0 0 320 170" className="g-vid-cuadro" role="img" aria-label={k('titulo')}>
        <rect x="0" y="0" width="320" height="170" className="g-vid-cielo" />
        <rect x="0" y="150" width="320" height="20" className="g-vid-suelo" />
        <circle cx={x} cy={y} r="11" className="g-vid-pelota" />
      </svg>
      <div className="g-vid-tira">
        {Array.from({ length: enTira }, (_, i) => (
          <i key={i} className={Math.floor((actual * enTira) / fps) === i ? 'on' : ''} />
        ))}
      </div>
      <div className="g-opciones">
        <label>
          <span>{k('fps')}</span>
          <Segmentos valores={[2, 12, 24]} valor={fps} set={setFps} />
        </label>
      </div>
      <p className="g-nota g-ok">{k(fps === 2 ? 'saltos' : fps === 12 ? 'casi' : 'fluido')}</p>
    </div>
  )
}

// ───────── Parte 3: el encuadre ─────────

type Plano = 'general' | 'medio' | 'primer'
const CORTES: Record<Plano, [number, number, number]> = {
  // centro x, centro y y zoom sobre la escena de 320×180.
  general: [160, 90, 1],
  medio: [176, 100, 2.3],
  primer: [176, 84, 4.4],
}

/** La misma escena en plano general, medio y primer plano. */
function Planos({ k, demo }: { k: K; demo: boolean }) {
  const [plano, setPlano] = useState<Plano>('general')
  useDemo<Plano>(demo, ['medio', 'primer', 'general'], 3000, setPlano, 3400)
  const [cx, cy, z] = CORTES[plano]
  return (
    <div className="g-herramienta g-vid">
      <h4>{k('titulo')}</h4>
      <svg viewBox="0 0 320 180" className="g-vid-cuadro" role="img" aria-label={k(plano)}>
        <g className="g-vid-zoom" style={{ transform: `translate(160px, 90px) scale(${z}) translate(${-cx}px, ${-cy}px)` }}>
          <Paisaje />
          <Persona x={176} y={140} alto={70} />
        </g>
      </svg>
      <div className="g-opciones">
        <Segmentos valores={['general', 'medio', 'primer'] as Plano[]} valor={plano} set={setPlano} rotulo={(v) => k(v)} />
      </div>
      <p className="g-nota g-ok">{k(`${plano}Det`)}</p>
    </div>
  )
}

/** La regla de los tercios: la persona y el horizonte, al centro o sobre las líneas. */
function Tercios({ k, demo }: { k: K; demo: boolean }) {
  const [enTercio, setEnTercio] = useState(false)
  useDemo<boolean>(demo, [true], 3200, setEnTercio, 5200)
  const x = enTercio ? 107 : 160
  const horizonte = enTercio ? 120 : 90
  return (
    <div className="g-herramienta g-vid">
      <h4>{k('titulo')}</h4>
      <svg viewBox="0 0 320 180" className="g-vid-cuadro" role="img" aria-label={k('titulo')}>
        <Paisaje horizonte={horizonte} />
        <g className="g-vid-mueve" style={{ transform: `translateX(${x - 160}px)` }}>
          <Persona x={160} y={horizonte + 28} alto={86} />
        </g>
        {[107, 213].map((v) => (
          <line key={v} x1={v} y1="0" x2={v} y2="180" className="g-vid-rejilla" />
        ))}
        {[60, 120].map((v) => (
          <line key={v} x1="0" y1={v} x2="320" y2={v} className="g-vid-rejilla" />
        ))}
        {enTercio && <circle cx="107" cy="60" r="6" className="g-vid-punto" />}
      </svg>
      <div className="g-opciones">
        <Segmentos valores={['centro', 'tercio']} valor={enTercio ? 'tercio' : 'centro'} set={(v) => setEnTercio(v === 'tercio')} rotulo={(v) => k(v)} />
      </div>
      <p className="g-nota g-ok">{k(enTercio ? 'tercioDet' : 'centroDet')}</p>
    </div>
  )
}

type Angulo = 'picado' | 'normal' | 'contrapicado'

/** La misma persona desde arriba, a la altura de los ojos y desde abajo (con la cámara al lado). */
function Angulos({ k, demo }: { k: K; demo: boolean }) {
  const [angulo, setAngulo] = useState<Angulo>('normal')
  useDemo<Angulo>(demo, ['picado', 'contrapicado', 'normal'], 3200, setAngulo, 1400)
  // Tamaño de la persona, su base y el horizonte en cada ángulo.
  const v = { picado: { alto: 70, base: 160, horizonte: 40 }, normal: { alto: 110, base: 176, horizonte: 104 }, contrapicado: { alto: 168, base: 196, horizonte: 168 } }[angulo]
  const camY = { picado: 24, normal: 80, contrapicado: 140 }[angulo]
  return (
    <div className="g-herramienta g-vid">
      <h4>{k('titulo')}</h4>
      <div className="g-vid-dos">
        <svg viewBox="0 0 320 180" className="g-vid-cuadro" role="img" aria-label={k(angulo)}>
          <Paisaje horizonte={v.horizonte} />
          <Persona x={160} y={v.base} alto={v.alto} />
        </svg>
        <svg viewBox="0 0 120 180" className="g-vid-lado" aria-hidden="true">
          <line x1="0" y1="170" x2="120" y2="170" className="g-eje" />
          <Persona x={90} y={170} alto={92} />
          <g className="g-vid-mueve" style={{ transform: `translateY(${camY}px)` }}>
            <rect x="14" y="-9" width="22" height="18" rx="3" className="g-vid-camara" />
            <line x1="36" y1="0" x2="86" y2={100 - camY} className="g-vid-rayo" />
          </g>
        </svg>
      </div>
      <div className="g-opciones">
        <Segmentos valores={['picado', 'normal', 'contrapicado'] as Angulo[]} valor={angulo} set={setAngulo} rotulo={(a) => k(a)} />
      </div>
      <p className="g-nota g-ok">{k(`${angulo}Det`)}</p>
    </div>
  )
}

// ───────── Parte 4: la luz y el sonido ─────────

type Foco = 'principal' | 'relleno' | 'contra'

/** La luz de tres puntos: una cara que se ilumina foco por foco. */
function Luz({ k, demo }: { k: K; demo: boolean }) {
  const [on, setOn] = useState<Record<Foco, boolean>>({ principal: false, relleno: false, contra: false })
  const poner = (f: Foco, v: boolean) => setOn((o) => ({ ...o, [f]: v }))
  useDemo<Foco>(demo, ['principal', 'relleno', 'contra'], 3000, (f) => poner(f, true), 4200)
  return (
    <div className="g-herramienta g-vid">
      <h4>{k('titulo')}</h4>
      <div className="g-vid-dos">
        <svg viewBox="0 0 200 200" className="g-vid-cuadro g-vid-luz" role="img" aria-label={k('titulo')}>
          <defs>
            <radialGradient id="g-vid-principal" cx="25%" cy="40%" r="75%">
              <stop offset="0" stopColor="#fff3d6" stopOpacity="0.95" />
              <stop offset="1" stopColor="#fff3d6" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="g-vid-relleno" cx="80%" cy="45%" r="70%">
              <stop offset="0" stopColor="#dbeafe" stopOpacity="0.55" />
              <stop offset="1" stopColor="#dbeafe" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect x="0" y="0" width="200" height="200" className={on.contra ? 'g-vid-fondo-luz' : 'g-vid-fondo-oscuro'} />
          {/* Hombros y cabeza, a oscuras; cada foco suma su luz encima. */}
          <path d="M30 200 C40 150 70 140 100 140 C130 140 160 150 170 200 Z" className="g-vid-sombra" />
          <ellipse cx="100" cy="92" rx="42" ry="52" className="g-vid-sombra" />
          {on.principal && <ellipse cx="100" cy="92" rx="42" ry="52" fill="url(#g-vid-principal)" className="g-vid-aparece" />}
          {on.relleno && <ellipse cx="100" cy="92" rx="42" ry="52" fill="url(#g-vid-relleno)" className="g-vid-aparece" />}
          {on.contra && <ellipse cx="100" cy="92" rx="43" ry="53" className="g-vid-borde g-vid-aparece" />}
          {on.contra && <path d="M30 200 C40 150 70 140 100 140 C130 140 160 150 170 200" className="g-vid-borde g-vid-aparece" />}
        </svg>
        <svg viewBox="0 0 160 200" className="g-vid-lado" aria-hidden="true">
          <circle cx="80" cy="110" r="14" className="g-vid-sombra" />
          {(
            [
              ['principal', 22, 70],
              ['relleno', 140, 80],
              ['contra', 80, 186],
            ] as [Foco, number, number][]
          ).map(([f, x, y]) => (
            <g key={f}>
              <line x1={x} y1={y} x2="80" y2="110" className={on[f] ? 'g-vid-rayo on' : 'g-vid-rayo'} />
              <rect x={x - 12} y={y - 9} width="24" height="18" rx="4" className={on[f] ? 'g-vid-foco on' : 'g-vid-foco'} />
            </g>
          ))}
        </svg>
      </div>
      <div className="g-opciones g-vid-botones">
        {(['principal', 'relleno', 'contra'] as Foco[]).map((f) => (
          <button key={f} type="button" className={on[f] ? 'g-boton-suave on' : 'g-boton-suave'} onClick={() => poner(f, !on[f])}>
            {k(f)}
          </button>
        ))}
      </div>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

/** El micrófono cerca o lejos: la voz baja con la distancia y el ruido del cuarto se queda. */
function Microfono({ k, demo }: { k: K; demo: boolean }) {
  const [cm, setCm] = useState(20)
  useDemo<number>(demo, [60, 150, 300, 20], 1500, setCm, 4600)
  const s = useReloj()
  // Nivel de la voz respecto al ruido: a 20 cm, 1; cae con la distancia.
  const voz = Math.min(1, 20 / cm)
  const RUIDO = 0.16
  const onda = (amp: number, fase: number, rapido: number) =>
    Array.from({ length: 81 }, (_, i) => {
      const x = i * 4
      const y = 50 - amp * 40 * Math.sin(i * 0.5 * rapido + s * 6 + fase) * Math.sin(i * 0.07 + s)
      return `${i ? 'L' : 'M'}${x} ${y.toFixed(1)}`
    }).join(' ')
  const ruidoPath = Array.from({ length: 81 }, (_, i) => `${i ? 'L' : 'M'}${i * 4} ${(50 - RUIDO * 40 * Math.sin(i * 2.7 + s * 40) * Math.cos(i * 1.3 + s * 23)).toFixed(1)}`).join(' ')
  const clara = voz > RUIDO * 2.5
  return (
    <div className="g-herramienta g-vid">
      <h4>{k('titulo')}</h4>
      <svg viewBox="0 0 320 100" className="g-vid-cuadro g-vid-oscuro" role="img" aria-label={k('titulo')}>
        <path d={ruidoPath} className="g-vid-ruido" />
        <path d={onda(voz, 0, 1)} className="g-vid-voz" />
      </svg>
      <div className="g-opciones">
        <label>
          <span>{k('distancia')}</span>
          <Segmentos valores={[20, 60, 150, 300]} valor={cm} set={setCm} rotulo={(v) => (v < 100 ? `${v} cm` : `${(v / 100).toLocaleString(lang())} m`)} />
        </label>
      </div>
      <dl className="g-resultados">
        <div>
          <dt>{k('voz')}</dt>
          <dd>{num(voz * 100)} %</dd>
        </div>
        <div className={clara ? 'g-resultado-fuerte' : ''}>
          <dt>{k('ruido')}</dt>
          <dd>{num(RUIDO * 100)} %</dd>
        </div>
      </dl>
      <p className={clara ? 'g-nota g-ok' : 'g-nota'}>{k(clara ? 'clara' : 'tapada')}</p>
    </div>
  )
}

// ───────── A la mitad: like, suscríbete y comparte ─────────

type Apoyo = 'like' | 'suscribete' | 'comparte'

/** Los tres botones que se encienden al decir cada palabra, y la barra del video a la mitad. */
/**
 * `tiempos`: cuándo se enciende cada botón (ms desde que suena la línea) y `mitad`: la barra
 * de «mitad del video» (Mindfulness la usa sin barra, con su propia frase más corta).
 */
export function Apoyo({ k, demo, tiempos = [4300, 5600, 8100], mitad = true }: { k: K; demo: boolean; tiempos?: number[]; mitad?: boolean }) {
  const [on, setOn] = useState<Record<Apoyo, boolean>>({ like: false, suscribete: false, comparte: false })
  useEffect(() => {
    if (!demo) return
    // De fábrica: «… dale like» (≈ 4,6 s), «suscríbete» (≈ 5,9 s) y «compártela» (≈ 8,4 s) en la voz en español.
    const ids = (['like', 'suscribete', 'comparte'] as Apoyo[]).map((b, i) => window.setTimeout(() => setOn((o) => ({ ...o, [b]: true })), tiempos[i]))
    return () => ids.forEach(clearTimeout)
    // Los tiempos son literales de quien llama: solo importa encender/apagar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo])
  const iconos: Record<Apoyo, string> = {
    like: 'M7 22V10l5-8c1.4 0 2.4 1.2 2 2.6L13 9h6.3c1.3 0 2.2 1.2 1.9 2.4l-2 8.4c-.2.7-.9 1.2-1.6 1.2H7Zm-4 0V10h2v12H3Z',
    suscribete: 'M12 22c1.3 0 2.3-1 2.3-2.2H9.7C9.7 21 10.7 22 12 22Zm7-6V11c0-3.3-1.8-6-5-6.7V3.5a2 2 0 1 0-4 0v.8C6.8 5 5 7.7 5 11v5l-2 2v1h18v-1l-2-2Z',
    comparte: 'M18 16c-.8 0-1.5.3-2 .8l-7.1-4.1c.1-.2.1-.5.1-.7s0-.5-.1-.7L16 7.2c.5.5 1.2.8 2 .8a3 3 0 1 0-3-3c0 .2 0 .5.1.7L8 9.8A3 3 0 1 0 8 14.2l7.1 4.1c-.1.2-.1.4-.1.7a3 3 0 1 0 3-3Z',
  }
  return (
    <div className="g-herramienta g-vid g-vid-apoyo">
      <h4>{k('titulo')}</h4>
      {mitad && (
        <div className="g-vid-progreso" aria-hidden="true">
          <i />
          <span>{k('mitad')}</span>
        </div>
      )}
      <div className="g-vid-apoyos">
        {(['like', 'suscribete', 'comparte'] as Apoyo[]).map((b) => (
          <button key={b} type="button" className={on[b] ? `g-vid-apoyo-boton on ${b}` : `g-vid-apoyo-boton ${b}`} onClick={() => setOn((o) => ({ ...o, [b]: !o[b] }))}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d={iconos[b]} />
            </svg>
            <span>{k(on[b] && b === 'suscribete' ? 'suscrito' : b)}</span>
          </button>
        ))}
      </div>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 5: la edición ─────────

type Toma = 'sopa' | 'ataud' | 'mujer'

/** El efecto Kuleshov: la misma cara junto a tres tomas distintas, y lo que el público decía ver. */
function Kuleshov({ k, demo }: { k: K; demo: boolean }) {
  const [toma, setToma] = useState<Toma>('sopa')
  useDemo<Toma>(demo, ['ataud', 'mujer', 'sopa'], 2600, setToma, 5200)
  return (
    <div className="g-herramienta g-vid">
      <h4>{k('titulo')}</h4>
      <div className="g-vid-montaje">
        <figure>
          <svg viewBox="0 0 160 120" className="g-vid-cuadro g-vid-bn" aria-hidden="true">
            <rect width="160" height="120" className="g-vid-gris" />
            <ellipse cx="80" cy="64" rx="34" ry="42" className="g-vid-piel" />
            <ellipse cx="66" cy="58" rx="5" ry="3" className="g-vid-ojo" />
            <ellipse cx="94" cy="58" rx="5" ry="3" className="g-vid-ojo" />
            <line x1="68" y1="84" x2="92" y2="84" className="g-vid-boca" />
          </svg>
          <figcaption>{k('cara')}</figcaption>
        </figure>
        <b className="g-vid-mas">+</b>
        <figure>
          <svg viewBox="0 0 160 120" className="g-vid-cuadro g-vid-bn" aria-hidden="true">
            <rect width="160" height="120" className="g-vid-gris" />
            {toma === 'sopa' && (
              <g className="g-vid-aparece">
                <path d="M40 66 H120 C118 92 100 102 80 102 C60 102 42 92 40 66 Z" className="g-vid-claro" />
                <path d="M62 56 C56 46 68 40 62 30 M80 56 C74 46 86 40 80 30 M98 56 C92 46 104 40 98 30" className="g-vid-vapor" />
              </g>
            )}
            {toma === 'ataud' && (
              <g className="g-vid-aparece">
                <path d="M62 18 L98 18 L110 40 L98 104 L62 104 L50 40 Z" className="g-vid-oscuro2" />
                <circle cx="70" cy="16" r="6" className="g-vid-claro" />
                <circle cx="88" cy="14" r="6" className="g-vid-claro" />
              </g>
            )}
            {toma === 'mujer' && (
              <g className="g-vid-aparece">
                <path d="M30 110 C40 70 120 70 130 110 Z" className="g-vid-oscuro2" />
                <ellipse cx="80" cy="50" rx="18" ry="22" className="g-vid-claro" />
                <path d="M60 52 C56 20 104 20 100 52 C104 70 112 80 104 90 C96 70 64 70 56 90 C48 80 56 70 60 52 Z" className="g-vid-oscuro2" />
              </g>
            )}
          </svg>
          <figcaption>{k(toma)}</figcaption>
        </figure>
        <b className="g-vid-mas">=</b>
        <p className="g-vid-siente">{k(`${toma}Ve`)}</p>
      </div>
      <div className="g-opciones">
        <Segmentos valores={['sopa', 'ataud', 'mujer'] as Toma[]} valor={toma} set={setToma} rotulo={(v) => k(v)} />
      </div>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

type Corte = 'seco' | 'j' | 'l'

/** Corte seco, en J y en L: dos pistas (imagen y sonido) con el corte en el mismo sitio o desfasado. */
function CortesJL({ k, demo }: { k: K; demo: boolean }) {
  const [corte, setCorte] = useState<Corte>('seco')
  useDemo<Corte>(demo, ['j', 'l'], 4200, setCorte, 5000)
  const s = useReloj()
  const CORTE = 50
  const sonido = corte === 'j' ? 36 : corte === 'l' ? 64 : CORTE
  const cabeza = ((s % 4) / 4) * 100
  const veo = cabeza < CORTE ? 'A' : 'B'
  const oigo = cabeza < sonido ? 'A' : 'B'
  return (
    <div className="g-herramienta g-vid">
      <h4>{k('titulo')}</h4>
      <div className="g-vid-linea">
        <span>{k('imagen')}</span>
        <div>
          <i className="a" style={{ width: `${CORTE}%` }}>
            {k('tomaA')}
          </i>
          <i className="b" style={{ width: `${100 - CORTE}%` }}>
            {k('tomaB')}
          </i>
        </div>
        <span>{k('sonido')}</span>
        <div>
          <i className="a" style={{ width: `${sonido}%` }}>
            {k('vozA')}
          </i>
          <i className="b" style={{ width: `${100 - sonido}%` }}>
            {k('vozB')}
          </i>
        </div>
        <b className="g-vid-cabeza" style={{ insetInlineStart: `calc(var(--vid-rotulo) + (100% - var(--vid-rotulo)) * ${cabeza / 100})` }} />
      </div>
      <p className="g-vid-ahora">
        {k('ves')} <b className={veo === 'A' ? 'a' : 'b'}>{k(`toma${veo}`)}</b> · {k('oyes')} <b className={oigo === 'A' ? 'a' : 'b'}>{k(`voz${oigo}`)}</b>
      </p>
      <div className="g-opciones">
        <Segmentos valores={['seco', 'j', 'l'] as Corte[]} valor={corte} set={setCorte} rotulo={(v) => k(v)} />
      </div>
      <p className="g-nota g-ok">{k(`${corte}Det`)}</p>
    </div>
  )
}

// ───────── Parte 7: el plan ─────────

/** Cuántos videos haces en un año (y cuántos minutos publicas) según tu ritmo. */
function VideosAno({ k, demo }: { k: K; demo: boolean }) {
  const [porSemana, setPorSemana] = useState(1)
  const [minutos, setMinutos] = useState(1)
  useDemo<() => void>(demo, [() => setPorSemana(2), () => setPorSemana(3), () => setMinutos(3), () => setPorSemana(1), () => setMinutos(1)], 1500, (f) => f(), 4200)
  const videos = porSemana * 52
  return (
    <div className="g-herramienta g-vid">
      <h4>{k('titulo')}</h4>
      <div className="g-opciones">
        <label>
          <span>{k('porSemana')}</span>
          <Segmentos valores={[1, 2, 3, 5]} valor={porSemana} set={setPorSemana} />
        </label>
        <label>
          <span>{k('duracion')}</span>
          <Segmentos valores={[1, 3, 10]} valor={minutos} set={setMinutos} rotulo={(v) => `${v} min`} />
        </label>
      </div>
      <dl className="g-resultados">
        <div className="g-resultado-fuerte">
          <dt>{k('alAnio')}</dt>
          <dd>{num(videos)}</dd>
        </div>
        <div>
          <dt>{k('minutos')}</dt>
          <dd>
            {num(videos * minutos)} <small>min</small>
          </dd>
        </div>
      </dl>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Gráficas ─────────

export const GRAFICAS_VIDEO = new Set(['historiaVideo', 'duracionPlanos', 'estructura', 'rutinaVideo'])

/** Duración media de las tomas en las películas de Hollywood, aproximada (Cutting y colegas, 2010-2011). */
const DURACION_TOMAS: [string, number][] = [
  ['1930', 10],
  ['1950', 9],
  ['1960', 8],
  ['1970', 7],
  ['1980', 6],
  ['1990', 5],
  ['2000', 4],
]

export function GraficaVideo({ id, k }: { id: string; k: (s: string) => string }) {
  if (id === 'historiaVideo') {
    const hitos: [string, string][] = [
      ['1878', k('grafica.muybridgeDet')],
      ['1895', k('grafica.lumiereDet')],
      ['1902', k('grafica.meliesDet')],
      ['1927', k('grafica.sonidoDet')],
      ['2005', k('grafica.youtubeDet')],
      [k('grafica.hoy'), k('grafica.hoyDet')],
    ]
    return (
      <figure className="g-grafica">
        <ol className="g-historia" style={{ gridTemplateColumns: `repeat(${hitos.length}, 1fr)` }}>
          {hitos.map(([cuando, que]) => (
            <li key={cuando}>
              <b>{cuando}</b>
              <span>{que}</span>
            </li>
          ))}
        </ol>
        <figcaption>{k('grafica.historia')}</figcaption>
      </figure>
    )
  }
  if (id === 'duracionPlanos') {
    const max = 10
    return (
      <figure className="g-grafica">
        <svg viewBox="0 0 400 200" role="img" aria-label={k('grafica.duracion')}>
          {DURACION_TOMAS.map(([d, s], i) => {
            const x = 30 + i * 52
            const h = (s / max) * 140
            return (
              <g key={d}>
                <rect x={x} y={160 - h} width="34" height={h} rx="4" className="g-vid-barra" style={{ animationDelay: `${i * 120}ms` }} />
                <text x={x + 17} y={152 - h} textAnchor="middle" className="g-rotulo g-fuerte">
                  ≈{s} s
                </text>
                <text x={x + 17} y="180" textAnchor="middle" className="g-rotulo">
                  {k('grafica.decada').replace('{n}', d)}
                </text>
              </g>
            )
          })}
        </svg>
        <figcaption>{k('grafica.duracion')}</figcaption>
      </figure>
    )
  }
  if (id === 'estructura') {
    // Tres actos: la tensión sube en el nudo y cae en el final.
    const x = (q: number) => 20 + q * 360
    return (
      <figure className="g-grafica">
        <svg viewBox="0 0 400 190" role="img" aria-label={k('grafica.estructura')}>
          <rect x={x(0)} y="140" width={x(0.25) - x(0) - 4} height="22" rx="6" className="g-vid-acto a" />
          <rect x={x(0.25)} y="140" width={x(0.75) - x(0.25) - 4} height="22" rx="6" className="g-vid-acto b" />
          <rect x={x(0.75)} y="140" width={x(1) - x(0.75)} height="22" rx="6" className="g-vid-acto c" />
          <path d={`M${x(0)} 120 C${x(0.2)} 118 ${x(0.3)} 96 ${x(0.5)} 70 S${x(0.78)} 22 ${x(0.82)} 26 S${x(0.92)} 110 ${x(1)} 118`} className="g-curva" />
          <text x={x(0.82)} y="16" textAnchor="middle" className="g-rotulo">
            {k('grafica.climax')}
          </text>
          {(
            [
              ['inicio', 0.125],
              ['nudo', 0.5],
              ['final', 0.875],
            ] as [string, number][]
          ).map(([c, q]) => (
            <text key={c} x={x(q)} y="182" textAnchor="middle" className="g-rotulo g-fuerte">
              {k(`grafica.${c}`)}
            </text>
          ))}
        </svg>
        <figcaption>{k('grafica.estructura')}</figcaption>
      </figure>
    )
  }
  if (id === 'rutinaVideo') {
    const dias: [string, string][] = [
      ['lunes', 'g-z1'],
      ['martes', 'g-z2'],
      ['miercoles', 'g-z3'],
      ['jueves', 'g-z4'],
      ['viernes', 'g-z5'],
      ['finde', 'g-z1'],
    ]
    return (
      <figure className="g-grafica">
        <ol className="g-fin-cadena">
          {dias.map(([c, z]) => (
            <li key={c} className={z}>
              <b>{k(`grafica.${c}`)}</b>
              <span>{k(`grafica.${c}Det`)}</span>
            </li>
          ))}
        </ol>
        <figcaption>{k('grafica.rutina')}</figcaption>
      </figure>
    )
  }
  return null
}
