import { useEffect, useRef, useState } from 'react'
import { Icono } from '../../../core/ui/iconos/Icono'
import { useT } from '../../../core/i18n/useT'
import { COLOR } from '../constantes'
import { guardarRecord, leerNumero } from './almacen'
import { prepararLienzo, puntoLienzo, useBucle } from './arcade'
import type { Dificultad, PropsDificultad } from './dificultad'
import { ElegirModo } from './ElegirModo'

type Modo = '1j' | '2j'

// Ayuda al apuntar: largo de la guía y si se proyecta hasta el primer choque
const GUIA: Record<Dificultad, { largo: number; prediccion: boolean }> = {
  facil: { largo: 1, prediccion: true },
  medio: { largo: 1, prediccion: false },
  dificil: { largo: 0.45, prediccion: false },
}

const ANCHO = 360
const ALTO = 580
const R = 9
const R_TRONERA = 15
const TRONERAS = [
  { x: 14, y: 14 },
  { x: ANCHO - 14, y: 14 },
  { x: 6, y: ALTO / 2 },
  { x: ANCHO - 6, y: ALTO / 2 },
  { x: 14, y: ALTO - 14 },
  { x: ANCHO - 14, y: ALTO - 14 },
]

interface Bola {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  esBlanca?: boolean
}

interface Mundo {
  bolas: Bola[]
  moviendo: boolean
  metidas: number // bolas de color metidas en el tiro en curso
  blancaDentro: boolean
  apunte: { x: number; y: number } | null // punta del arrastre tipo resortera
}

function rack(): Bola[] {
  const bolas: Bola[] = [{ x: ANCHO / 2, y: 450, vx: 0, vy: 0, color: '#f8fafc', esBlanca: true }]
  // Triángulo con el ápice hacia la blanca; la negra al centro de la 3ª fila
  const colores: string[] = []
  for (let i = 0; i < 14; i++) colores.push(i % 2 === 0 ? '#facc15' : '#ef4444')
  colores.splice(4, 0, '#0f172a') // índice 4 = centro de la fila 3 (posiciones 3..5)
  let k = 0
  for (let f = 0; f < 5; f++) {
    for (let c = 0; c <= f; c++) {
      bolas.push({
        x: ANCHO / 2 + (c - f / 2) * (R * 2 + 1),
        y: 190 - f * (R * 2 * 0.87 + 1),
        vx: 0,
        vy: 0,
        color: colores[k++],
      })
    }
  }
  return bolas
}

function mundoInicial(): Mundo {
  return { bolas: rack(), moviendo: false, metidas: 0, blancaDentro: false, apunte: null }
}

// Recoloca la blanca tras una falta buscando un hueco libre en la cabecera
function reponerBlanca(bolas: Bola[]): Bola {
  const blanca: Bola = { x: ANCHO / 2, y: 450, vx: 0, vy: 0, color: '#f8fafc', esBlanca: true }
  while (bolas.some((b) => Math.hypot(b.x - blanca.x, b.y - blanca.y) < R * 2 + 1)) blanca.y += R * 2 + 2
  return blanca
}

export function Billar({ dificultad = 'medio' }: PropsDificultad) {
  const t = useT()
  const guia = GUIA[dificultad]
  const lienzo = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const mundo = useRef<Mundo>(mundoInicial())
  const [modo, setModo] = useState<Modo | null>(null)
  const [turno, setTurno] = useState<1 | 2>(1)
  const [puntos, setPuntos] = useState({ j1: 0, j2: 0 })
  const [tiros, setTiros] = useState(0)
  const [aviso, setAviso] = useState<'falta' | 'sigue' | null>(null)
  const [fin, setFin] = useState(false)
  const [record, setRecord] = useState(() => leerNumero('billar-record', 0))

  useEffect(() => {
    if (modo === null) return
    ctxRef.current = prepararLienzo(lienzo.current!, ANCHO, ALTO)
    dibujar(ctxRef.current, mundo.current, guia)
  }, [modo, guia])

  const reiniciar = (m: Modo | null) => {
    setModo(m)
    mundo.current = mundoInicial()
    setTurno(1)
    setPuntos({ j1: 0, j2: 0 })
    setTiros(0)
    setAviso(null)
    setFin(false)
  }

  useBucle((dt) => {
    const m = mundo.current
    if (m.moviendo) {
      // 3 subpasos por frame: colisiones estables sin túneles
      const h = dt / 3
      for (let s = 0; s < 3; s++) paso(m, h)

      if (m.bolas.every((b) => b.vx === 0 && b.vy === 0)) {
        m.moviendo = false
        // Resolver el tiro: falta, racha o cambio de turno
        if (m.blancaDentro) {
          m.bolas.push(reponerBlanca(m.bolas))
          m.blancaDentro = false
          setAviso('falta')
          setTurno((v) => (modo === '2j' ? (v === 1 ? 2 : 1) : v))
        } else if (m.metidas > 0) {
          setPuntos((p) => (turno === 1 ? { ...p, j1: p.j1 + m.metidas } : { ...p, j2: p.j2 + m.metidas }))
          setAviso('sigue')
        } else {
          setAviso(null)
          setTurno((v) => (modo === '2j' ? (v === 1 ? 2 : 1) : v))
        }
        m.metidas = 0
        // Mesa limpia (solo queda la blanca): termina la partida
        if (m.bolas.every((b) => b.esBlanca)) {
          setFin(true)
          if (modo === '1j') setRecord(guardarRecord('billar-record', tiros + 1, true))
        }
      }
    }
    dibujar(ctxRef.current!, m, guia)
  }, modo !== null && !fin)

  const bajar = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const m = mundo.current
    if (m.moviendo || fin) return
    lienzo.current!.setPointerCapture(e.pointerId)
    m.apunte = puntoLienzo(lienzo.current!, e, ANCHO, ALTO)
  }

  const mover = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const m = mundo.current
    if (m.apunte) m.apunte = puntoLienzo(lienzo.current!, e, ANCHO, ALTO)
  }

  const soltar = () => {
    const m = mundo.current
    if (!m.apunte) return
    const blanca = m.bolas.find((b) => b.esBlanca)
    if (blanca) {
      // Resortera: se dispara en dirección contraria al arrastre
      const dx = blanca.x - m.apunte.x
      const dy = blanca.y - m.apunte.y
      const dist = Math.hypot(dx, dy)
      if (dist > 14) {
        const v = Math.min(1150, dist * 4)
        blanca.vx = (dx / dist) * v
        blanca.vy = (dy / dist) * v
        m.moviendo = true
        m.metidas = 0
        setTiros((n) => n + 1)
        setAviso(null)
      }
    }
    m.apunte = null
  }

  if (modo === null) {
    return (
      <ElegirModo
        opciones={[
          {
            clave: '1j',
            icono: <Icono emoji="🎱" />,
            titulo: t('entre.j.billar.solo', 'Solitario'),
            desc: t('entre.j.billar.soloDesc', 'Limpia la mesa en pocos tiros'),
            alElegir: () => reiniciar('1j'),
          },
          {
            clave: '2j',
            icono: <Icono nombre="companeros" />,
            titulo: t('entre.j.modo.2j', '2 jugadores'),
            desc: t('entre.j.modo.2jDesc', 'En el mismo dispositivo'),
            alElegir: () => reiniciar('2j'),
          },
        ]}
      />
    )
  }

  return (
    <div className="space-y-3">
      <div className="mx-auto flex max-w-[360px] flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-semibold">
          {modo === '1j' ? (
            <>
              {t('entre.j.billar.tiros', 'Tiros')}: {tiros}
              {record > 0 && (
                <span className="ms-2 text-white/45">
                  {t('entre.j.mejor', 'Mejor')}: {record}
                </span>
              )}
            </>
          ) : (
            <>
              <span style={{ color: turno === 1 ? COLOR : undefined }}>J1 {puntos.j1}</span>
              {' · '}
              <span style={{ color: turno === 2 ? COLOR : undefined }}>J2 {puntos.j2}</span>
            </>
          )}
          {aviso === 'falta' && <span className="ms-2 text-red-400">{t('entre.j.billar.falta', 'Falta: la blanca se metió')}</span>}
          {aviso === 'sigue' && <span className="ms-2" style={{ color: COLOR }}>{t('entre.j.billar.sigue', '¡Bola dentro, sigues tú!')}</span>}
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

      <div className="relative mx-auto max-w-[300px]">
        <canvas
          ref={lienzo}
          onPointerDown={bajar}
          onPointerMove={mover}
          onPointerUp={soltar}
          onPointerCancel={soltar}
          className="w-full rounded-xl"
          style={{ touchAction: 'none', aspectRatio: `${ANCHO} / ${ALTO}`, background: '#14532d' }}
        />
        {fin && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/70 ui-noche">
            <p className="px-4 text-center font-black">
              {modo === '1j'
                ? t('entre.j.billar.fin1j', 'Mesa limpia en {n} tiros', { n: tiros })
                : puntos.j1 === puntos.j2
                  ? t('entre.j.cuatroenlinea.empate', 'Empate: tablero lleno')
                  : t('entre.j.pong.gana', 'Gana {j}', { j: puntos.j1 > puntos.j2 ? 'J1' : 'J2' })}
            </p>
            <button type="button" onClick={() => reiniciar(modo)} className="rounded-xl px-4 py-2 font-bold text-black" style={{ background: COLOR }}>
              {t('entre.j.nueva', 'Nueva partida')}
            </button>
          </div>
        )}
      </div>
      <p className="text-center text-xs text-white/35">{t('entre.j.billar.ayuda', 'Arrastra desde la mesa y suelta para tirar (resortera)')}</p>
    </div>
  )
}

// Un subpaso de física: avance, fricción, troneras, bandas y choques entre bolas
function paso(m: Mundo, h: number) {
  const frenado = Math.pow(0.32, h)
  for (const b of m.bolas) {
    b.x += b.vx * h
    b.y += b.vy * h
    b.vx *= frenado
    b.vy *= frenado
    if (Math.hypot(b.vx, b.vy) < 5) {
      b.vx = 0
      b.vy = 0
    }
  }

  // Troneras primero: cerca del hoyo la bola cae, no rebota
  for (let i = m.bolas.length - 1; i >= 0; i--) {
    const b = m.bolas[i]
    if (TRONERAS.some((tr) => Math.hypot(b.x - tr.x, b.y - tr.y) < R_TRONERA)) {
      m.bolas.splice(i, 1)
      if (b.esBlanca) m.blancaDentro = true
      else m.metidas++
    }
  }

  // Bandas
  for (const b of m.bolas) {
    if (b.x < R) {
      b.x = R
      b.vx = Math.abs(b.vx) * 0.9
    } else if (b.x > ANCHO - R) {
      b.x = ANCHO - R
      b.vx = -Math.abs(b.vx) * 0.9
    }
    if (b.y < R) {
      b.y = R
      b.vy = Math.abs(b.vy) * 0.9
    } else if (b.y > ALTO - R) {
      b.y = ALTO - R
      b.vy = -Math.abs(b.vy) * 0.9
    }
  }

  // Choques elásticos de masas iguales: se intercambia la componente normal
  for (let i = 0; i < m.bolas.length; i++)
    for (let j = i + 1; j < m.bolas.length; j++) {
      const a = m.bolas[i]
      const b = m.bolas[j]
      const dx = b.x - a.x
      const dy = b.y - a.y
      const dist = Math.hypot(dx, dy)
      if (dist === 0 || dist >= R * 2) continue
      const nx = dx / dist
      const ny = dy / dist
      const solape = R * 2 - dist
      a.x -= (nx * solape) / 2
      a.y -= (ny * solape) / 2
      b.x += (nx * solape) / 2
      b.y += (ny * solape) / 2
      const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny
      if (rel > 0) {
        a.vx -= rel * nx
        a.vy -= rel * ny
        b.vx += rel * nx
        b.vy += rel * ny
      }
    }
}

/** Distancia desde la blanca hasta el primer choque (bola o banda) en esa dirección. */
function alcance(m: Mundo, blanca: Bola, dx: number, dy: number): number {
  let mejor = dx > 0 ? (ANCHO - R - blanca.x) / dx : dx < 0 ? (R - blanca.x) / dx : Infinity
  const hastaBanda = dy > 0 ? (ALTO - R - blanca.y) / dy : dy < 0 ? (R - blanca.y) / dy : Infinity
  mejor = Math.min(mejor, hastaBanda)
  for (const b of m.bolas) {
    if (b === blanca) continue
    const ox = b.x - blanca.x
    const oy = b.y - blanca.y
    const proy = ox * dx + oy * dy
    if (proy <= 0) continue
    const perp2 = ox * ox + oy * oy - proy * proy
    const radio2 = (R * 2) ** 2
    if (perp2 > radio2) continue
    mejor = Math.min(mejor, proy - Math.sqrt(radio2 - perp2))
  }
  return Math.max(0, mejor)
}

function dibujar(ctx: CanvasRenderingContext2D, m: Mundo, guia: (typeof GUIA)[Dificultad]) {
  ctx.clearRect(0, 0, ANCHO, ALTO)

  // Troneras
  for (const tr of TRONERAS) {
    ctx.beginPath()
    ctx.arc(tr.x, tr.y, R_TRONERA, 0, Math.PI * 2)
    ctx.fillStyle = '#0a0f0a'
    ctx.fill()
  }

  // Guía de tiro (resortera)
  const blanca = m.bolas.find((b) => b.esBlanca)
  if (m.apunte && blanca && !m.moviendo) {
    const dx = blanca.x - m.apunte.x
    const dy = blanca.y - m.apunte.y
    const dist = Math.hypot(dx, dy)
    if (dist > 4) {
      const fuerza = Math.min(1150, dist * 4) / 1150
      const ux = dx / dist
      const uy = dy / dist
      const largo = guia.prediccion
        ? alcance(m, blanca, ux, uy)
        : (40 + fuerza * 120) * guia.largo
      ctx.strokeStyle = `rgba(255,255,255,${0.35 + fuerza * 0.5})`
      ctx.lineWidth = 2
      ctx.setLineDash([6, 6])
      ctx.beginPath()
      ctx.moveTo(blanca.x, blanca.y)
      ctx.lineTo(blanca.x + ux * largo, blanca.y + uy * largo)
      ctx.stroke()
      ctx.setLineDash([])
      // En fácil, la silueta marca dónde acabaría la blanca al chocar
      if (guia.prediccion) {
        ctx.beginPath()
        ctx.arc(blanca.x + ux * largo, blanca.y + uy * largo, R, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
  }

  // Bolas
  for (const b of m.bolas) {
    ctx.beginPath()
    ctx.arc(b.x, b.y, R, 0, Math.PI * 2)
    ctx.fillStyle = b.color
    ctx.fill()
    ctx.lineWidth = 1.5
    ctx.strokeStyle = b.esBlanca ? '#cbd5e1' : 'rgba(0,0,0,0.35)'
    if (b.color === '#0f172a') ctx.strokeStyle = '#e2e8f0'
    ctx.stroke()
  }
}
