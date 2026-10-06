import { useEffect, useRef, useState } from 'react'
import { Icono } from '../../../core/ui/iconos/Icono'
import { useT } from '../../../core/i18n/useT'
import { registrarJuegoMesa, useMesa } from '../../../core/partida/mesa'
import { COLOR } from '../constantes'
import { FONDO_LIENZO, prepararLienzo, puntoLienzo, useBucle, useTeclas } from './arcade'
import type { Dificultad, PropsDificultad } from './dificultad'
import { registrarApariencia, useApariencia } from './apariencia'
import { ElegirModo } from './ElegirModo'
import { BarraMesa, PERIODO_VIVO, nombreAsiento, numVivo, opcionEnLinea, useRecibidoVivo } from './mesaJuego'

type Modo = '2j' | 'ia' | 'online'
type Fase = 'lista' | 'jugando' | 'fin'

// Paleta de la máquina: qué tan rápido se mueve y si persigue la bola también cuando se aleja
const RIVAL: Record<Dificultad, { vel: number; persigueSiempre: boolean }> = {
  facil: { vel: 165, persigueSiempre: false },
  medio: { vel: 230, persigueSiempre: false },
  dificil: { vel: 340, persigueSiempre: true },
}

const ANCHO = 360
const ALTO = 480
const PALETA_W = 70
const PALETA_H = 10
const META = 7
const VEL_PALETA = 340

const TECLAS_PONG = ['arrowleft', 'arrowright', 'a', 'd'] as const

interface Mundo {
  bola: { x: number; y: number; vx: number; vy: number }
  abajo: number // centro x de cada paleta
  arriba: number
}

function saque(haciaAbajo: boolean): Mundo['bola'] {
  const ang = (Math.random() * 0.6 - 0.3) * Math.PI
  const v = 300
  return { x: ANCHO / 2, y: ALTO / 2, vx: Math.sin(ang) * v, vy: Math.cos(ang) * v * (haciaAbajo ? 1 : -1) }
}

function mundoInicial(): Mundo {
  return { bola: saque(Math.random() < 0.5), abajo: ANCHO / 2, arriba: ANCHO / 2 }
}

/**
 * En línea la mesa solo sienta a los dos: la partida va EN VIVO. Quien la abre
 * (asiento `a`, paleta de abajo) mueve la bola y manda el cuadro; el de
 * enfrente (`b`, la de arriba) manda dónde tiene su paleta y `go`, que sube
 * cada vez que pulsa «Jugar».
 */
registrarJuegoMesa<{ v: number }, never>('pong', {
  inicial: () => ({ v: 1 }),
  aplicar: () => null,
  terminado: () => false,
})

registrarApariencia('pong', [
  { clave: 'fondo', labelEs: 'Fondo', papel: 'fondo', porDefecto: FONDO_LIENZO },
  { clave: 'linea', labelEs: 'Línea central', papel: 'claro', porDefecto: '#ffffff' },
  { clave: 'abajo', labelEs: 'Paleta de abajo', papel: 'uno', porDefecto: '#f8fafc' },
  { clave: 'arriba', labelEs: 'Paleta de arriba', papel: 'dos', porDefecto: '#f8fafc' },
  { clave: 'bola', labelEs: 'Bola', papel: 'acento', porDefecto: '#34d399' },
])

const FASES: readonly Fase[] = ['lista', 'jugando', 'fin']
const r1 = (n: number) => Math.round(n * 10) / 10

/** Pliega una x que se pasó de banda como si hubiera rebotado (la bola adelantada). */
function plegarX(x: number): number {
  const min = 6
  const ancho = ANCHO - 12
  const p = (((x - min) % (2 * ancho)) + 2 * ancho) % (2 * ancho)
  return min + (p <= ancho ? p : 2 * ancho - p)
}

export function Pong({ dificultad = 'medio', mesaOnline = false }: PropsDificultad) {
  const t = useT()
  const col = useApariencia('pong')
  const rival = RIVAL[dificultad]
  const lienzo = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const mundo = useRef<Mundo>(mundoInicial())
  const mesa = useMesa<{ v: number }, never>('pong')
  const recibido = useRecibidoVivo('pong')
  const [modo, setModo] = useState<Modo | null>(mesaOnline ? 'online' : null)
  const [fase, setFase] = useState<Fase>('lista')
  const [marcador, setMarcador] = useState({ abajo: 0, arriba: 0 })
  const teclas = useTeclas(TECLAS_PONG)
  /** Tiempo desde el último envío por la mesa en vivo. */
  const envio = useRef(0)
  /** Pulsaciones de «Jugar» del de enfrente: las que manda y la última atendida. */
  const go = useRef(0)
  const goVisto = useRef(0)

  const online = modo === 'online'
  // Quien abre simula; el de enfrente y quien mira pintan lo que les llega.
  const manda = !online || mesa.miAsiento === 'a'
  // El de enfrente ve la mesa girada: su paleta, como la de todos, abajo.
  const girada = online && mesa.miAsiento === 'b'
  const sinRival = online && mesa.asientos.b === null

  useEffect(() => {
    if (modo === null) return
    ctxRef.current = prepararLienzo(lienzo.current!, ANCHO, ALTO)
  }, [modo])

  // Pinta al abrir y, con la partida parada, también al cambiar los colores.
  useEffect(() => {
    if (modo !== null && ctxRef.current) dibujar(ctxRef.current, mundo.current, col, girada)
  }, [modo, col, girada])

  useEffect(() => {
    if (online && mesa.enLinea && !mesa.abierta) mesa.abrir()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, mesa.enLinea])

  useEffect(() => {
    if (online && mesa.abierta && mesa.miAsiento === null && sinRival) mesa.sentar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, mesa.abierta, mesa.miAsiento, sinRival])

  const empezar = () => {
    mundo.current = mundoInicial()
    setMarcador({ abajo: 0, arriba: 0 })
    setFase('jugando')
  }

  const reiniciar = (m: Modo | null) => {
    if (online && m !== 'online') mesa.levantar()
    setModo(m)
    mundo.current = mundoInicial()
    setMarcador({ abajo: 0, arriba: 0 })
    setFase('lista')
  }

  /** Lado de quien no simula: pinta el último cuadro con la bola adelantada. */
  const seguirCuadro = (dt: number) => {
    const m = mundo.current
    const c = recibido.cuadro.current
    if (mesa.miAsiento === 'b') {
      // Mi paleta va por mi cuenta (respuesta inmediata) y sale como mando. La
      // mesa está girada: la flecha izquierda va hacia la x del mundo que crece.
      const dir =
        (teclas.has('arrowleft') || teclas.has('a') ? 1 : 0) - (teclas.has('arrowright') || teclas.has('d') ? 1 : 0)
      m.arriba = Math.max(PALETA_W / 2, Math.min(ANCHO - PALETA_W / 2, m.arriba + dir * VEL_PALETA * dt))
      envio.current += dt * 1000
      if (envio.current >= PERIODO_VIVO) {
        envio.current = 0
        mesa.enVivo({ p: r1(m.arriba), go: go.current })
      }
    }
    if (c) {
      const d = c.d
      const f = FASES.find((x) => x === d.f) ?? 'lista'
      const ma = numVivo(d.ma, 0)
      const mr = numVivo(d.mr, 0)
      if (f !== fase) setFase(f)
      if (ma !== marcador.abajo || mr !== marcador.arriba) setMarcador({ abajo: ma, arriba: mr })
      const enCamino = f === 'jugando' ? Math.min(0.25, (performance.now() - c.llegada) / 1000) : 0
      const vx = numVivo(d.vx, 0)
      const vy = numVivo(d.vy, 0)
      m.bola = {
        x: plegarX(numVivo(d.x, ANCHO / 2) + vx * enCamino),
        y: numVivo(d.y, ALTO / 2) + vy * enCamino,
        vx,
        vy,
      }
      // La paleta del otro se acerca a la que dice el cuadro (sin saltos).
      m.abajo += (numVivo(d.ab, ANCHO / 2) - m.abajo) * Math.min(1, dt * 18)
      if (mesa.miAsiento !== 'b') m.arriba += (numVivo(d.ar, ANCHO / 2) - m.arriba) * Math.min(1, dt * 18)
    }
    dibujar(ctxRef.current!, m, col, girada)
  }

  useBucle((dt) => {
    if (!manda) {
      seguirCuadro(dt)
      return
    }
    const m = mundo.current
    const { bola } = m

    if (online) {
      // El de enfrente pulsó «Jugar».
      const suGo = numVivo(recibido.mando.current?.go, 0)
      if (suGo > goVisto.current) {
        goVisto.current = suGo
        if (fase !== 'jugando' && !sinRival) empezar()
      }
      envio.current += dt * 1000
      if (envio.current >= PERIODO_VIVO) {
        envio.current = 0
        mesa.enVivo({
          x: r1(bola.x),
          y: r1(bola.y),
          vx: r1(bola.vx),
          vy: r1(bola.vy),
          ab: r1(m.abajo),
          ar: r1(m.arriba),
          ma: marcador.abajo,
          mr: marcador.arriba,
          f: fase,
        })
      }
      // Si el de enfrente se levanta a media partida, la partida se para.
      if (fase === 'jugando' && sinRival) setFase('lista')
      if (fase !== 'jugando' || sinRival) {
        dibujar(ctxRef.current!, m, col)
        return
      }
    }

    // Paleta de abajo: flechas; la de arriba: A/D (2 jugadores)
    if (teclas.has('arrowleft') || (online && teclas.has('a'))) m.abajo -= VEL_PALETA * dt
    if (teclas.has('arrowright') || (online && teclas.has('d'))) m.abajo += VEL_PALETA * dt
    if (online) {
      // La de arriba es la del de enfrente: la que dice su mando.
      m.arriba = numVivo(recibido.mando.current?.p, m.arriba)
    } else if (modo === '2j') {
      if (teclas.has('a')) m.arriba -= VEL_PALETA * dt
      if (teclas.has('d')) m.arriba += VEL_PALETA * dt
    } else {
      // La máquina persigue la bola con velocidad acotada (alcanzable)
      const objetivo = bola.vy < 0 || rival.persigueSiempre ? bola.x : ANCHO / 2
      const delta = objetivo - m.arriba
      m.arriba += Math.max(-rival.vel * dt, Math.min(rival.vel * dt, delta))
    }
    m.abajo = Math.max(PALETA_W / 2, Math.min(ANCHO - PALETA_W / 2, m.abajo))
    m.arriba = Math.max(PALETA_W / 2, Math.min(ANCHO - PALETA_W / 2, m.arriba))

    bola.x += bola.vx * dt
    bola.y += bola.vy * dt

    // Rebote en las bandas laterales
    if (bola.x < 6) {
      bola.x = 6
      bola.vx = Math.abs(bola.vx)
    } else if (bola.x > ANCHO - 6) {
      bola.x = ANCHO - 6
      bola.vx = -Math.abs(bola.vx)
    }

    // Rebote en paletas: el punto de impacto decide el ángulo y acelera un 5%
    const golpe = (palX: number) => {
      const rel = Math.max(-1, Math.min(1, (bola.x - palX) / (PALETA_W / 2)))
      const rapidez = Math.min(640, Math.hypot(bola.vx, bola.vy) * 1.05)
      const ang = rel * 0.9
      return { vx: Math.sin(ang) * rapidez, vy: Math.cos(ang) * rapidez }
    }
    if (bola.vy > 0 && bola.y > ALTO - 20 - PALETA_H && bola.y < ALTO - 12 && Math.abs(bola.x - m.abajo) < PALETA_W / 2 + 6) {
      const v = golpe(m.abajo)
      bola.vx = v.vx
      bola.vy = -v.vy
    } else if (bola.vy < 0 && bola.y < 20 + PALETA_H && bola.y > 12 && Math.abs(bola.x - m.arriba) < PALETA_W / 2 + 6) {
      const v = golpe(m.arriba)
      bola.vx = v.vx
      bola.vy = v.vy
    }

    // Gol: la bola salió por un fondo
    if (bola.y < -10 || bola.y > ALTO + 10) {
      const paraAbajo = bola.y < 0
      const nuevo = { abajo: marcador.abajo + (paraAbajo ? 1 : 0), arriba: marcador.arriba + (paraAbajo ? 0 : 1) }
      setMarcador(nuevo)
      m.bola = saque(!paraAbajo)
      if (nuevo.abajo >= META || nuevo.arriba >= META) setFase('fin')
    }

    dibujar(ctxRef.current!, m, col)
  }, (fase === 'jugando' && modo !== null) || online)

  const moverConPuntero = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (fase !== 'jugando') return
    const p = puntoLienzo(lienzo.current!, e, ANCHO, ALTO)
    const m = mundo.current
    if (online) {
      // En línea cada quien mueve SU paleta, toque donde toque.
      if (mesa.miAsiento === 'a') m.abajo = p.x
      else if (mesa.miAsiento === 'b') m.arriba = ANCHO - p.x
      return
    }
    if (p.y > ALTO / 2) m.abajo = p.x
    else if (modo === '2j') m.arriba = p.x
  }

  if (modo === null) {
    return (
      <ElegirModo
        opciones={[
          {
            clave: 'ia',
            icono: <Icono nombre="mascota-robot" />,
            titulo: t('entre.j.modo.ia', 'Contra la máquina'),
            desc: t('entre.j.pong.iaDesc', 'Tú llevas la paleta de abajo'),
            alElegir: () => reiniciar('ia'),
          },
          {
            clave: '2j',
            icono: <Icono nombre="companeros" />,
            titulo: t('entre.j.modo.2j', '2 jugadores'),
            desc: t('entre.j.modo.2jDesc', 'En el mismo dispositivo'),
            alElegir: () => reiniciar('2j'),
          },
          // Sin tocar el mundo: la partida en línea empieza al pulsar «Jugar».
          ...(mesa.enLinea ? [opcionEnLinea(t, mesa.asientos, () => setModo('online'))] : []),
        ]}
      />
    )
  }

  const nombreArriba = online
    ? nombreAsiento(t, mesa.asientos, 'b', mesa.miAsiento)
    : modo === 'ia'
      ? t('entre.j.maquina', 'Máquina')
      : t('entre.j.pong.j2', 'Jugador 2')
  const nombreAbajo = online
    ? nombreAsiento(t, mesa.asientos, 'a', mesa.miAsiento)
    : modo === 'ia'
      ? t('entre.j.tu', 'Tú')
      : t('entre.j.pong.j1', 'Jugador 1')
  const ganaAbajo = marcador.abajo >= META
  const gane = (modo === 'ia' && ganaAbajo) || (online && mesa.miAsiento === (ganaAbajo ? 'a' : 'b'))
  // «Jugar» lo pulsan los dos asientos; quien mira solo espera.
  const puedeEmpezar = !online || (mesa.miAsiento !== null && !sinRival)

  return (
    <div className="space-y-3">
      <div className="mx-auto flex max-w-[360px] flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-semibold">
          {nombreAbajo} {marcador.abajo} · {marcador.arriba} {nombreArriba}
        </span>
        <div className="flex gap-2">
          {!online && (
            <button type="button" onClick={() => reiniciar(modo)} className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold">
              <Icono nombre="sincronizar" /> {t('entre.j.nueva', 'Nueva partida')}
            </button>
          )}
          <button type="button" onClick={() => reiniciar(null)} className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold">
            {online ? t('entre.j.mesa.salir', 'Salir de la mesa') : t('entre.j.modo.cambiar', 'Cambiar modo')}
          </button>
        </div>
      </div>

      {online && (
        <div className="mx-auto max-w-[360px]">
          <BarraMesa abierta={mesa.abierta} cerrada={mesa.cerrada} asientos={mesa.asientos} miAsiento={mesa.miAsiento} />
        </div>
      )}

      <div className="relative mx-auto max-w-[360px]">
        <canvas
          ref={lienzo}
          onPointerMove={moverConPuntero}
          onPointerDown={moverConPuntero}
          className="w-full rounded-xl"
          style={{ touchAction: 'none', aspectRatio: `${ANCHO} / ${ALTO}`, background: col.fondo }}
        />
        {fase !== 'jugando' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/60 ui-noche">
            {fase === 'fin' && (
              <p className="px-4 text-center font-black">
                {gane ? t('entre.j.ganaste', '¡Ganaste! 🎉') : t('entre.j.pong.gana', 'Gana {j}', { j: ganaAbajo ? nombreAbajo : nombreArriba })}
              </p>
            )}
            {online && sinRival ? (
              <p className="px-4 text-center text-sm text-white/70">
                {t('entre.j.mesa.esperandoRival', 'Esperando a que alguien se siente enfrente…')}
              </p>
            ) : puedeEmpezar ? (
              <button
                type="button"
                onClick={() => {
                  if (manda) empezar()
                  else go.current += 1
                }}
                className="rounded-xl px-4 py-2 font-bold text-black"
                style={{ background: COLOR }}
              >
                {fase === 'fin' ? t('entre.j.nueva', 'Nueva partida') : t('entre.j.jugar', 'Jugar')}
              </button>
            ) : null}
          </div>
        )}
      </div>
      <p className="text-center text-xs text-white/35">
        {modo === '2j'
          ? t('entre.j.pong.ayuda2j', 'Abajo: ← →  ·  Arriba: A / D  ·  o arrastra en tu mitad')
          : t('entre.j.pong.ayudaIa', 'Mueve con ← → o arrastrando')}
      </p>
    </div>
  )
}

function dibujar(ctx: CanvasRenderingContext2D, m: Mundo, col: Record<string, string>, girada = false) {
  ctx.clearRect(0, 0, ANCHO, ALTO)
  ctx.save()
  if (girada) {
    ctx.translate(ANCHO, ALTO)
    ctx.rotate(Math.PI)
  }

  // Línea central
  ctx.strokeStyle = col.linea
  ctx.globalAlpha = 0.15
  ctx.lineWidth = 2
  ctx.setLineDash([8, 10])
  ctx.beginPath()
  ctx.moveTo(0, ALTO / 2)
  ctx.lineTo(ANCHO, ALTO / 2)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.globalAlpha = 1

  // Paletas
  ctx.fillStyle = col.abajo
  ctx.fillRect(m.abajo - PALETA_W / 2, ALTO - 20, PALETA_W, PALETA_H)
  ctx.fillStyle = col.arriba
  ctx.fillRect(m.arriba - PALETA_W / 2, 20 - PALETA_H, PALETA_W, PALETA_H)

  // Bola
  ctx.beginPath()
  ctx.arc(m.bola.x, m.bola.y, 6, 0, Math.PI * 2)
  ctx.fillStyle = col.bola
  ctx.fill()
  ctx.restore()
}
