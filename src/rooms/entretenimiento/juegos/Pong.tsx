import { useEffect, useRef, useState } from 'react'
import { Icono } from '../../../core/ui/iconos/Icono'
import { useT } from '../../../core/i18n/useT'
import { COLOR } from '../constantes'
import { prepararLienzo, puntoLienzo, useBucle, useTeclas } from './arcade'

type Modo = '2j' | 'ia'
type Fase = 'lista' | 'jugando' | 'fin'

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

export function Pong() {
  const t = useT()
  const lienzo = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const mundo = useRef<Mundo>(mundoInicial())
  const [modo, setModo] = useState<Modo | null>(null)
  const [fase, setFase] = useState<Fase>('lista')
  const [marcador, setMarcador] = useState({ abajo: 0, arriba: 0 })
  const teclas = useTeclas(TECLAS_PONG)

  useEffect(() => {
    if (modo === null) return
    ctxRef.current = prepararLienzo(lienzo.current!, ANCHO, ALTO)
    dibujar(ctxRef.current, mundo.current)
  }, [modo])

  const reiniciar = (m: Modo | null) => {
    setModo(m)
    mundo.current = mundoInicial()
    setMarcador({ abajo: 0, arriba: 0 })
    setFase('lista')
  }

  useBucle((dt) => {
    const m = mundo.current
    const { bola } = m

    // Paleta de abajo: flechas; la de arriba: A/D (2 jugadores)
    if (teclas.has('arrowleft')) m.abajo -= VEL_PALETA * dt
    if (teclas.has('arrowright')) m.abajo += VEL_PALETA * dt
    if (modo === '2j') {
      if (teclas.has('a')) m.arriba -= VEL_PALETA * dt
      if (teclas.has('d')) m.arriba += VEL_PALETA * dt
    } else {
      // La máquina persigue la bola con velocidad acotada (alcanzable)
      const objetivo = bola.vy < 0 ? bola.x : ANCHO / 2
      const delta = objetivo - m.arriba
      m.arriba += Math.max(-230 * dt, Math.min(230 * dt, delta))
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

    dibujar(ctxRef.current!, m)
  }, fase === 'jugando' && modo !== null)

  const moverConPuntero = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (fase !== 'jugando') return
    const p = puntoLienzo(lienzo.current!, e, ANCHO, ALTO)
    const m = mundo.current
    if (p.y > ALTO / 2) m.abajo = p.x
    else if (modo === '2j') m.arriba = p.x
  }

  if (modo === null) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-semibold">{t('entre.j.modo.titulo', '¿Cómo quieres jugar?')}</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => reiniciar('ia')}
            className="rounded-xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10"
          >
            <p className="text-2xl"><Icono nombre="mascota-robot" /></p>
            <p className="mt-1 font-bold">{t('entre.j.modo.ia', 'Contra la máquina')}</p>
            <p className="text-xs text-white/50">{t('entre.j.pong.iaDesc', 'Tú llevas la paleta de abajo')}</p>
          </button>
          <button
            type="button"
            onClick={() => reiniciar('2j')}
            className="rounded-xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10"
          >
            <p className="text-2xl"><Icono nombre="companeros" /></p>
            <p className="mt-1 font-bold">{t('entre.j.modo.2j', '2 jugadores')}</p>
            <p className="text-xs text-white/50">{t('entre.j.modo.2jDesc', 'En el mismo dispositivo')}</p>
          </button>
        </div>
      </div>
    )
  }

  const nombreArriba = modo === 'ia' ? t('entre.j.maquina', 'Máquina') : t('entre.j.pong.j2', 'Jugador 2')
  const nombreAbajo = modo === 'ia' ? t('entre.j.tu', 'Tú') : t('entre.j.pong.j1', 'Jugador 1')

  return (
    <div className="space-y-3">
      <div className="mx-auto flex max-w-[360px] flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-semibold">
          {nombreAbajo} {marcador.abajo} · {marcador.arriba} {nombreArriba}
        </span>
        <div className="flex gap-2">
          <button type="button" onClick={() => reiniciar(modo)} className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold">
            <Icono nombre="sincronizar" /> {t('entre.j.nueva', 'Nueva partida')}
          </button>
          <button type="button" onClick={() => reiniciar(null)} className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold">
            {t('entre.j.modo.cambiar', 'Cambiar modo')}
          </button>
        </div>
      </div>

      <div className="relative mx-auto max-w-[360px]">
        <canvas
          ref={lienzo}
          onPointerMove={moverConPuntero}
          onPointerDown={moverConPuntero}
          className="w-full rounded-xl bg-white/5"
          style={{ touchAction: 'none', aspectRatio: `${ANCHO} / ${ALTO}` }}
        />
        {fase !== 'jugando' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/60">
            {fase === 'fin' && (
              <p className="px-4 text-center font-black">
                {(modo === 'ia' && marcador.abajo >= META) ? t('entre.j.ganaste', '¡Ganaste! 🎉') : t('entre.j.pong.gana', 'Gana {j}', { j: marcador.abajo >= META ? nombreAbajo : nombreArriba })}
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                mundo.current = mundoInicial()
                setMarcador({ abajo: 0, arriba: 0 })
                setFase('jugando')
              }}
              className="rounded-xl px-4 py-2 font-bold text-black"
              style={{ background: COLOR }}
            >
              {fase === 'fin' ? t('entre.j.nueva', 'Nueva partida') : t('entre.j.jugar', 'Jugar')}
            </button>
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

function dibujar(ctx: CanvasRenderingContext2D, m: Mundo) {
  ctx.clearRect(0, 0, ANCHO, ALTO)

  // Línea central
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'
  ctx.lineWidth = 2
  ctx.setLineDash([8, 10])
  ctx.beginPath()
  ctx.moveTo(0, ALTO / 2)
  ctx.lineTo(ANCHO, ALTO / 2)
  ctx.stroke()
  ctx.setLineDash([])

  // Paletas
  ctx.fillStyle = '#f8fafc'
  ctx.fillRect(m.abajo - PALETA_W / 2, ALTO - 20, PALETA_W, PALETA_H)
  ctx.fillRect(m.arriba - PALETA_W / 2, 20 - PALETA_H, PALETA_W, PALETA_H)

  // Bola
  ctx.beginPath()
  ctx.arc(m.bola.x, m.bola.y, 6, 0, Math.PI * 2)
  ctx.fillStyle = COLOR
  ctx.fill()
}
