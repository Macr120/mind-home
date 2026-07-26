import { useEffect, useRef, useState } from 'react'
import { useT } from '../../../core/i18n/useT'
import { COLOR } from '../constantes'
import { guardarRecord, leerNumero } from './almacen'
import { FONDO_LIENZO, prepararLienzo, puntoLienzo, useBucle, useTeclas } from './arcade'
import { claveDificultad, type Dificultad, type PropsDificultad } from './dificultad'

type Fase = 'lista' | 'jugando' | 'fin'

// Vidas, avance de la formación (base + por oleada) y presión de las bombas
const AJUSTE: Record<Dificultad, { vidas: number; vel: number; velOleada: number; bombas: number }> = {
  facil: { vidas: 5, vel: 26, velOleada: 8, bombas: 0.1 },
  medio: { vidas: 3, vel: 36, velOleada: 12, bombas: 0.18 },
  dificil: { vidas: 2, vel: 50, velOleada: 16, bombas: 0.3 },
}

const ANCHO = 360
const ALTO = 480
const COLS = 5
const FILAS = 4
const SEP_X = 56
const SEP_Y = 38
const ENEMIGO = 30
const NAVE_Y = 445

const TECLAS_SPACE = ['arrowleft', 'arrowright', 'a', 'd'] as const

interface Mundo {
  nave: number
  balas: { x: number; y: number }[]
  bombas: { x: number; y: number }[]
  vivos: boolean[]
  ox: number
  oy: number
  dir: number
  vel: number
  tFuego: number
  tBomba: number
  puntos: number
  oleada: number
  vidas: number
  invul: number
}

function formacion(m: Mundo, oleada: number, ajuste: (typeof AJUSTE)[Dificultad]) {
  m.vivos = new Array<boolean>(COLS * FILAS).fill(true)
  m.ox = (ANCHO - (COLS - 1) * SEP_X - ENEMIGO) / 2
  m.oy = 46
  m.dir = 1
  m.vel = ajuste.vel + oleada * ajuste.velOleada
  m.balas = []
  m.bombas = []
}

function mundoInicial(ajuste: (typeof AJUSTE)[Dificultad]): Mundo {
  const m = {
    nave: ANCHO / 2,
    balas: [],
    bombas: [],
    vivos: [],
    ox: 0,
    oy: 0,
    dir: 1,
    vel: 0,
    tFuego: 0,
    tBomba: 1.2,
    puntos: 0,
    oleada: 1,
    vidas: ajuste.vidas,
    invul: 0,
  }
  formacion(m, 1, ajuste)
  return m
}

export function SpaceDefender({ dificultad = 'medio' }: PropsDificultad) {
  const t = useT()
  const ajuste = AJUSTE[dificultad]
  const clave = claveDificultad('space-record', dificultad)
  const lienzo = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const mundo = useRef<Mundo>(mundoInicial(ajuste))
  const [fase, setFase] = useState<Fase>('lista')
  const [final, setFinal] = useState(0)
  const [record, setRecord] = useState(() => leerNumero(clave, 0))
  const teclas = useTeclas(TECLAS_SPACE)

  useEffect(() => {
    ctxRef.current = prepararLienzo(lienzo.current!, ANCHO, ALTO)
    dibujar(ctxRef.current, mundo.current)
  }, [])

  const empezar = () => {
    mundo.current = mundoInicial(ajuste)
    setFase('jugando')
  }

  const perder = (m: Mundo) => {
    setFase('fin')
    setFinal(m.puntos)
    setRecord(guardarRecord(clave, m.puntos))
  }

  useBucle((dt) => {
    const m = mundo.current

    // Nave: mover es el único control, el disparo es automático
    if (teclas.has('arrowleft') || teclas.has('a')) m.nave -= 300 * dt
    if (teclas.has('arrowright') || teclas.has('d')) m.nave += 300 * dt
    m.nave = Math.max(16, Math.min(ANCHO - 16, m.nave))

    m.tFuego -= dt
    if (m.tFuego <= 0) {
      m.balas.push({ x: m.nave, y: NAVE_Y - 14 })
      m.tFuego = 0.35
    }

    // Formación: rebota en los bordes, baja un escalón y acelera
    m.ox += m.dir * m.vel * dt
    let minX = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    m.vivos.forEach((v, i) => {
      if (!v) return
      const x = m.ox + (i % COLS) * SEP_X
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x + ENEMIGO)
      maxY = Math.max(maxY, m.oy + Math.floor(i / COLS) * SEP_Y + ENEMIGO)
    })
    if (minX < 8 || maxX > ANCHO - 8) {
      m.dir *= -1
      m.ox += m.dir * 4
      m.oy += 14
      m.vel *= 1.06
    }
    if (maxY >= NAVE_Y - 10) {
      perder(m)
      dibujar(ctxRef.current!, m)
      return
    }

    // Bombas enemigas: cadencia que aprieta con cada oleada
    m.tBomba -= dt
    if (m.tBomba <= 0) {
      const indices = m.vivos.flatMap((v, i) => (v ? [i] : []))
      if (indices.length) {
        const i = indices[Math.floor(Math.random() * indices.length)]
        m.bombas.push({ x: m.ox + (i % COLS) * SEP_X + ENEMIGO / 2, y: m.oy + Math.floor(i / COLS) * SEP_Y + ENEMIGO })
      }
      m.tBomba = (0.55 + Math.random() * 0.6) / (1 + m.oleada * ajuste.bombas)
    }

    for (const b of m.balas) b.y -= 430 * dt
    for (const b of m.bombas) b.y += 250 * dt
    m.balas = m.balas.filter((b) => b.y > -12)
    m.bombas = m.bombas.filter((b) => b.y < ALTO + 12)

    // Bala contra enemigo
    for (const b of m.balas) {
      for (let i = 0; i < m.vivos.length; i++) {
        if (!m.vivos[i]) continue
        const ex = m.ox + (i % COLS) * SEP_X
        const ey = m.oy + Math.floor(i / COLS) * SEP_Y
        if (b.x > ex - 2 && b.x < ex + ENEMIGO + 2 && b.y > ey && b.y < ey + ENEMIGO) {
          m.vivos[i] = false
          b.y = -100
          m.puntos += 10 * m.oleada
          break
        }
      }
    }

    // Bomba contra la nave
    m.invul = Math.max(0, m.invul - dt)
    if (m.invul === 0) {
      for (const b of m.bombas) {
        if (Math.abs(b.x - m.nave) < 15 && b.y > NAVE_Y - 10 && b.y < NAVE_Y + 12) {
          b.y = ALTO + 100
          m.vidas--
          m.invul = 1.5
          if (m.vidas <= 0) {
            perder(m)
            dibujar(ctxRef.current!, m)
            return
          }
          break
        }
      }
    }

    // Oleada limpiada: llega la siguiente, más rápida
    if (m.vivos.every((v) => !v)) {
      m.oleada++
      formacion(m, m.oleada, ajuste)
    }

    dibujar(ctxRef.current!, m)
  }, fase === 'jugando')

  const arrastrar = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (fase !== 'jugando') return
    mundo.current.nave = Math.max(16, Math.min(ANCHO - 16, puntoLienzo(lienzo.current!, e, ANCHO, ALTO).x))
  }

  return (
    <div className="space-y-3">
      <div className="mx-auto flex max-w-[360px] items-center justify-between text-sm">
        <span className="font-semibold text-white/60">
          {t('entre.j.mejor', 'Mejor')}: {record}
        </span>
        <span className="text-xs text-white/40">{t('entre.j.space.ayuda', '← → o arrastra · disparo automático')}</span>
      </div>
      <div className="relative mx-auto max-w-[360px]">
        <canvas
          ref={lienzo}
          onPointerMove={arrastrar}
          onPointerDown={arrastrar}
          className="w-full rounded-xl"
          style={{ touchAction: 'none', aspectRatio: `${ANCHO} / ${ALTO}`, background: FONDO_LIENZO }}
        />
        {fase !== 'jugando' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/60 ui-noche">
            {fase === 'fin' && (
              <p className="px-4 text-center font-black">
                {t('entre.j.space.fin', 'La flota te superó.')} {t('entre.j.puntos', 'Puntos')}: {final}
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

  // Enemigos
  ctx.font = `${ENEMIGO - 2}px sans-serif`
  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'
  m.vivos.forEach((v, i) => {
    if (!v) return
    ctx.fillText('👾', m.ox + (i % COLS) * SEP_X, m.oy + Math.floor(i / COLS) * SEP_Y)
  })

  // Nave (parpadea si es invulnerable)
  if (m.invul === 0 || Math.floor(m.invul * 10) % 2 === 0) {
    ctx.fillStyle = COLOR
    ctx.beginPath()
    ctx.moveTo(m.nave, NAVE_Y - 12)
    ctx.lineTo(m.nave - 14, NAVE_Y + 10)
    ctx.lineTo(m.nave + 14, NAVE_Y + 10)
    ctx.closePath()
    ctx.fill()
  }

  // Proyectiles
  ctx.fillStyle = '#a7f3d0'
  for (const b of m.balas) ctx.fillRect(b.x - 1.5, b.y - 6, 3, 10)
  ctx.fillStyle = '#f87171'
  for (const b of m.bombas) ctx.fillRect(b.x - 2, b.y - 5, 4, 9)

  // HUD
  ctx.font = 'bold 13px sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.textAlign = 'left'
  ctx.fillText('♥'.repeat(Math.max(0, m.vidas)), 10, 8)
  ctx.textAlign = 'center'
  ctx.fillText(`— ${m.oleada} —`, ANCHO / 2, 8)
  ctx.textAlign = 'right'
  ctx.fillText(String(m.puntos), ANCHO - 10, 8)
}
