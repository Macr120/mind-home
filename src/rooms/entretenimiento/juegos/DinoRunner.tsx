import { useEffect, useRef, useState } from 'react'
import { useT } from '../../../core/i18n/useT'
import { COLOR } from '../constantes'
import { guardarRecord, leerNumero } from './almacen'
import { prepararLienzo, useBucle, useTeclas } from './arcade'

type Fase = 'lista' | 'jugando' | 'fin'

const ANCHO = 420
const ALTO = 180
const SUELO = 150
const DINO_X = 40
const GRAVEDAD = 2300
const IMPULSO = 640

const TECLAS_DINO = [' ', 'arrowup'] as const

interface Obstaculo {
  x: number
  w: number
  h: number
}

interface Mundo {
  alt: number // altura del dino sobre el suelo
  vy: number
  obst: Obstaculo[]
  vel: number
  dist: number
  proxSpawn: number
}

function mundoInicial(): Mundo {
  return { alt: 0, vy: 0, obst: [], vel: 260, dist: 0, proxSpawn: 1 }
}

export function DinoRunner() {
  const t = useT()
  const lienzo = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const mundo = useRef<Mundo>(mundoInicial())
  const [fase, setFase] = useState<Fase>('lista')
  const [final, setFinal] = useState(0)
  const [record, setRecord] = useState(() => leerNumero('dino-record', 0))
  const teclas = useTeclas(TECLAS_DINO)

  useEffect(() => {
    ctxRef.current = prepararLienzo(lienzo.current!, ANCHO, ALTO)
    dibujar(ctxRef.current, mundo.current)
  }, [])

  const saltar = (m: Mundo) => {
    if (m.alt <= 0) {
      m.alt = 0.01
      m.vy = IMPULSO
    }
  }

  const empezar = () => {
    mundo.current = mundoInicial()
    setFase('jugando')
  }

  useBucle((dt) => {
    const m = mundo.current
    if (teclas.has(' ') || teclas.has('arrowup')) saltar(m)

    // Física del salto
    if (m.alt > 0 || m.vy > 0) {
      m.vy -= GRAVEDAD * dt
      m.alt = Math.max(0, m.alt + m.vy * dt)
      if (m.alt === 0) m.vy = 0
    }

    // El mundo corre hacia el dino y acelera con el tiempo
    m.vel += 8 * dt
    m.dist += m.vel * dt * 0.05
    m.proxSpawn -= dt
    if (m.proxSpawn <= 0) {
      const h = 24 + Math.random() * 18
      m.obst.push({ x: ANCHO + 30, w: 14 + Math.random() * 10, h })
      m.proxSpawn = (0.9 + Math.random() * 0.8) * (300 / m.vel)
    }
    for (const o of m.obst) o.x -= m.vel * dt
    m.obst = m.obst.filter((o) => o.x > -40)

    // Colisión AABB con hitbox reducida para que se sienta justa
    const dinoY = SUELO - m.alt
    for (const o of m.obst) {
      if (DINO_X + 18 > o.x + 3 && DINO_X + 4 < o.x + o.w - 3 && dinoY - 4 > SUELO - o.h + 3) {
        setFase('fin')
        setFinal(Math.floor(m.dist))
        setRecord(guardarRecord('dino-record', Math.floor(m.dist)))
        break
      }
    }

    dibujar(ctxRef.current!, m)
  }, fase === 'jugando')

  const toque = () => {
    if (fase === 'jugando') saltar(mundo.current)
    else empezar()
  }

  return (
    <div className="space-y-3">
      <div className="mx-auto flex max-w-[420px] items-center justify-between text-sm">
        <span className="font-semibold text-white/60">
          {t('entre.j.mejor', 'Mejor')}: {record}
        </span>
        <span className="text-xs text-white/40">{t('entre.j.dino.ayuda', 'Espacio, ↑ o toca para saltar')}</span>
      </div>
      <div className="relative mx-auto max-w-[420px]">
        <canvas
          ref={lienzo}
          onPointerDown={toque}
          className="w-full rounded-xl bg-white/5"
          style={{ touchAction: 'none', aspectRatio: `${ANCHO} / ${ALTO}` }}
        />
        {fase !== 'jugando' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/60">
            {fase === 'fin' && (
              <p className="font-black">
                {t('entre.j.puntos', 'Puntos')}: {final} · {t('entre.j.mejor', 'Mejor')}: {record}
              </p>
            )}
            <button type="button" onClick={empezar} className="rounded-xl px-4 py-2 font-bold text-black" style={{ background: COLOR }}>
              {fase === 'fin' ? t('entre.j.nueva', 'Nueva partida') : t('entre.j.jugar', 'Jugar')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function dibujar(ctx: CanvasRenderingContext2D, m: Mundo) {
  ctx.clearRect(0, 0, ANCHO, ALTO)

  // Suelo
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, SUELO + 2)
  ctx.lineTo(ANCHO, SUELO + 2)
  ctx.stroke()

  ctx.textBaseline = 'bottom'
  ctx.textAlign = 'left'

  // Dino (el emoji mira a la izquierda: se voltea para correr a la derecha)
  ctx.save()
  ctx.translate(DINO_X + 13, SUELO - m.alt)
  ctx.scale(-1, 1)
  ctx.font = '26px sans-serif'
  ctx.fillText('🦖', -13, 2)
  ctx.restore()

  // Cactus
  for (const o of m.obst) {
    ctx.font = `${Math.round(o.h)}px sans-serif`
    ctx.fillText('🌵', o.x, SUELO + 2)
  }

  // Distancia
  ctx.font = 'bold 14px sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.textAlign = 'right'
  ctx.fillText(String(Math.floor(m.dist)), ANCHO - 10, 22)
}
