import { useEffect, useRef, useState } from 'react'
import { Icono } from '../../../core/ui/iconos/Icono'
import { useT } from '../../../core/i18n/useT'
import { COLOR } from '../constantes'
import { prepararLienzo, puntoLienzo, useBucle } from './arcade'

type Modo = '2j' | 'ia'
type Fase = 'lista' | 'jugando' | 'fin'

const ANCHO = 360
const ALTO = 520
const R_DISCO = 13
const R_MAZO = 24
const PORTERIA = 110
const META = 7

interface Mazo {
  x: number
  y: number
  tx: number
  ty: number
}

interface Mundo {
  disco: { x: number; y: number; vx: number; vy: number }
  abajo: Mazo
  arriba: Mazo
}

function mundoInicial(discoAbajo?: boolean): Mundo {
  const y = discoAbajo === undefined ? ALTO / 2 : discoAbajo ? ALTO * 0.7 : ALTO * 0.3
  return {
    disco: { x: ANCHO / 2, y, vx: 0, vy: 0 },
    abajo: { x: ANCHO / 2, y: ALTO - 70, tx: ANCHO / 2, ty: ALTO - 70 },
    arriba: { x: ANCHO / 2, y: 70, tx: ANCHO / 2, ty: 70 },
  }
}

export function Hockey() {
  const t = useT()
  const lienzo = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const mundo = useRef<Mundo>(mundoInicial())
  const punteros = useRef(new Map<number, 'abajo' | 'arriba'>())
  const [modo, setModo] = useState<Modo | null>(null)
  const [fase, setFase] = useState<Fase>('lista')
  const [marcador, setMarcador] = useState({ abajo: 0, arriba: 0 })

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
    const { disco } = m

    // La máquina persigue el disco en su mitad y luego cubre su portería
    if (modo === 'ia') {
      if (disco.y < ALTO / 2) {
        m.arriba.tx = disco.x
        m.arriba.ty = Math.min(disco.y - 6, ALTO / 2 - R_MAZO)
      } else {
        m.arriba.tx = ANCHO / 2
        m.arriba.ty = 70
      }
    }

    // Mover mazos hacia su objetivo y conservar su velocidad para el empuje
    const moverMazo = (mazo: Mazo, esAbajo: boolean, velMax: number) => {
      let dx = mazo.tx - mazo.x
      let dy = mazo.ty - mazo.y
      const dist = Math.hypot(dx, dy)
      const paso = velMax * dt
      if (dist > paso) {
        dx = (dx / dist) * paso
        dy = (dy / dist) * paso
      }
      const nx = Math.max(R_MAZO, Math.min(ANCHO - R_MAZO, mazo.x + dx))
      const ny = esAbajo
        ? Math.max(ALTO / 2 + R_MAZO, Math.min(ALTO - R_MAZO, mazo.y + dy))
        : Math.max(R_MAZO, Math.min(ALTO / 2 - R_MAZO, mazo.y + dy))
      const vx = (nx - mazo.x) / dt
      const vy = (ny - mazo.y) / dt
      mazo.x = nx
      mazo.y = ny
      return { vx, vy }
    }
    const velAbajo = moverMazo(m.abajo, true, 1500)
    const velArriba = moverMazo(m.arriba, false, modo === 'ia' ? 340 : 1500)

    // Disco: fricción ligera y avance
    disco.vx *= 1 - 0.35 * dt
    disco.vy *= 1 - 0.35 * dt
    disco.x += disco.vx * dt
    disco.y += disco.vy * dt

    // Choque mazo-disco: separa y refleja la velocidad relativa
    const chocar = (mazo: Mazo, vm: { vx: number; vy: number }) => {
      const dx = disco.x - mazo.x
      const dy = disco.y - mazo.y
      const dist = Math.hypot(dx, dy)
      if (dist === 0 || dist >= R_DISCO + R_MAZO) return
      const nx = dx / dist
      const ny = dy / dist
      disco.x = mazo.x + nx * (R_DISCO + R_MAZO)
      disco.y = mazo.y + ny * (R_DISCO + R_MAZO)
      const relN = (disco.vx - vm.vx) * nx + (disco.vy - vm.vy) * ny
      if (relN < 0) {
        disco.vx -= 1.8 * relN * nx
        disco.vy -= 1.8 * relN * ny
      }
      const rapidez = Math.hypot(disco.vx, disco.vy)
      if (rapidez > 950) {
        disco.vx *= 950 / rapidez
        disco.vy *= 950 / rapidez
      }
    }
    chocar(m.abajo, velAbajo)
    chocar(m.arriba, velArriba)

    // Bandas laterales
    if (disco.x < R_DISCO) {
      disco.x = R_DISCO
      disco.vx = Math.abs(disco.vx) * 0.85
    } else if (disco.x > ANCHO - R_DISCO) {
      disco.x = ANCHO - R_DISCO
      disco.vx = -Math.abs(disco.vx) * 0.85
    }

    // Fondos: gol dentro del hueco, rebote fuera de él
    const enPorteria = Math.abs(disco.x - ANCHO / 2) < PORTERIA / 2
    if (disco.y < R_DISCO) {
      if (enPorteria && disco.y < -R_DISCO) {
        const nuevo = { ...marcador, abajo: marcador.abajo + 1 }
        setMarcador(nuevo)
        mundo.current = mundoInicial(false)
        if (nuevo.abajo >= META) setFase('fin')
      } else if (!enPorteria) {
        disco.y = R_DISCO
        disco.vy = Math.abs(disco.vy) * 0.85
      }
    } else if (disco.y > ALTO - R_DISCO) {
      if (enPorteria && disco.y > ALTO + R_DISCO) {
        const nuevo = { ...marcador, arriba: marcador.arriba + 1 }
        setMarcador(nuevo)
        mundo.current = mundoInicial(true)
        if (nuevo.arriba >= META) setFase('fin')
      } else if (!enPorteria) {
        disco.y = ALTO - R_DISCO
        disco.vy = -Math.abs(disco.vy) * 0.85
      }
    }

    dibujar(ctxRef.current!, mundo.current)
  }, fase === 'jugando' && modo !== null)

  const bajarPuntero = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (fase !== 'jugando') return
    const p = puntoLienzo(lienzo.current!, e, ANCHO, ALTO)
    const lado = p.y > ALTO / 2 ? 'abajo' : 'arriba'
    if (lado === 'arriba' && modo === 'ia') return
    punteros.current.set(e.pointerId, lado)
    lienzo.current!.setPointerCapture(e.pointerId)
    moverPuntero(e)
  }

  const moverPuntero = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const lado = punteros.current.get(e.pointerId)
    if (!lado) return
    const p = puntoLienzo(lienzo.current!, e, ANCHO, ALTO)
    const mazo = mundo.current[lado]
    mazo.tx = p.x
    mazo.ty = p.y
  }

  const soltarPuntero = (e: React.PointerEvent<HTMLCanvasElement>) => {
    punteros.current.delete(e.pointerId)
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
            <p className="text-xs text-white/50">{t('entre.j.hockey.iaDesc', 'Tú defiendes la portería de abajo')}</p>
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
          onPointerDown={bajarPuntero}
          onPointerMove={moverPuntero}
          onPointerUp={soltarPuntero}
          onPointerCancel={soltarPuntero}
          className="w-full rounded-xl bg-white/5"
          style={{ touchAction: 'none', aspectRatio: `${ANCHO} / ${ALTO}` }}
        />
        {fase !== 'jugando' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/60">
            {fase === 'fin' && (
              <p className="px-4 text-center font-black">
                {modo === 'ia' && marcador.abajo >= META
                  ? t('entre.j.ganaste', '¡Ganaste! 🎉')
                  : t('entre.j.pong.gana', 'Gana {j}', { j: marcador.abajo >= META ? nombreAbajo : nombreArriba })}
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
      <p className="text-center text-xs text-white/35">{t('entre.j.hockey.ayuda', 'Arrastra tu mazo para golpear el disco')}</p>
    </div>
  )
}

function dibujar(ctx: CanvasRenderingContext2D, m: Mundo) {
  ctx.clearRect(0, 0, ANCHO, ALTO)

  // Cancha: línea central, círculo y bocas de portería
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, ALTO / 2)
  ctx.lineTo(ANCHO, ALTO / 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(ANCHO / 2, ALTO / 2, 40, 0, Math.PI * 2)
  ctx.stroke()
  ctx.strokeStyle = COLOR
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(ANCHO / 2 - PORTERIA / 2, 2)
  ctx.lineTo(ANCHO / 2 + PORTERIA / 2, 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(ANCHO / 2 - PORTERIA / 2, ALTO - 2)
  ctx.lineTo(ANCHO / 2 + PORTERIA / 2, ALTO - 2)
  ctx.stroke()

  // Mazos y disco
  const circulo = (x: number, y: number, r: number, relleno: string, borde: string) => {
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = relleno
    ctx.fill()
    ctx.lineWidth = 3
    ctx.strokeStyle = borde
    ctx.stroke()
  }
  circulo(m.abajo.x, m.abajo.y, R_MAZO, '#dc2626', '#fca5a5')
  circulo(m.arriba.x, m.arriba.y, R_MAZO, '#2563eb', '#93c5fd')
  circulo(m.disco.x, m.disco.y, R_DISCO, '#f8fafc', '#94a3b8')
}
