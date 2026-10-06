import { useEffect, useRef, useState } from 'react'
import { Icono } from '../../../core/ui/iconos/Icono'
import { useT } from '../../../core/i18n/useT'
import { registrarJuegoMesa, useMesa } from '../../../core/partida/mesa'
import { COLOR } from '../constantes'
import { FONDO_LIENZO, prepararLienzo, puntoLienzo, useBucle } from './arcade'
import type { Dificultad, PropsDificultad } from './dificultad'
import { registrarApariencia, useApariencia } from './apariencia'
import { ElegirModo } from './ElegirModo'
import { BarraMesa, PERIODO_VIVO, nombreAsiento, numVivo, opcionEnLinea, useRecibidoVivo } from './mesaJuego'

type Modo = '2j' | 'ia' | 'online'
type Fase = 'lista' | 'jugando' | 'fin'

// Mazo de la máquina: velocidad y hasta dónde baja a buscar el disco
const RIVAL: Record<Dificultad, { vel: number; alcance: number }> = {
  facil: { vel: 235, alcance: 0.35 },
  medio: { vel: 340, alcance: 0.5 },
  dificil: { vel: 520, alcance: 0.62 },
}

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

/**
 * En línea la partida va EN VIVO (igual que el Pong): quien abre la mesa
 * (asiento `a`, mazo rojo de abajo) mueve el disco y manda el cuadro; el de
 * enfrente (`b`, el azul) manda adónde lleva su mazo y `go` al pulsar «Jugar».
 */
registrarJuegoMesa<{ v: number }, never>('hockey', {
  inicial: () => ({ v: 1 }),
  aplicar: () => null,
  terminado: () => false,
})

registrarApariencia('hockey', [
  { clave: 'fondo', labelEs: 'Pista', papel: 'fondo', porDefecto: FONDO_LIENZO },
  { clave: 'lineas', labelEs: 'Líneas', papel: 'claro', porDefecto: '#ffffff' },
  { clave: 'porterias', labelEs: 'Porterías', papel: 'oscuro', porDefecto: '#34d399' },
  { clave: 'abajo', labelEs: 'Mazo de abajo', papel: 'uno', porDefecto: '#dc2626' },
  { clave: 'arriba', labelEs: 'Mazo de arriba', papel: 'dos', porDefecto: '#2563eb' },
  { clave: 'disco', labelEs: 'Disco', papel: 'acento', porDefecto: '#f8fafc' },
])

const FASES: readonly Fase[] = ['lista', 'jugando', 'fin']
const r1 = (n: number) => Math.round(n * 10) / 10

/** Acerca un mazo a su objetivo con tope de velocidad y dentro de su mitad. */
function moverMazo(mazo: Mazo, esAbajo: boolean, velMax: number, dt: number): { vx: number; vy: number } {
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
  const vx = dt > 0 ? (nx - mazo.x) / dt : 0
  const vy = dt > 0 ? (ny - mazo.y) / dt : 0
  mazo.x = nx
  mazo.y = ny
  return { vx, vy }
}

export function Hockey({ dificultad = 'medio', mesaOnline = false }: PropsDificultad) {
  const t = useT()
  const col = useApariencia('hockey')
  const rival = RIVAL[dificultad]
  const lienzo = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const mundo = useRef<Mundo>(mundoInicial())
  const punteros = useRef(new Map<number, 'abajo' | 'arriba'>())
  const mesa = useMesa<{ v: number }, never>('hockey')
  const recibido = useRecibidoVivo('hockey')
  const [modo, setModo] = useState<Modo | null>(mesaOnline ? 'online' : null)
  const [fase, setFase] = useState<Fase>('lista')
  const [marcador, setMarcador] = useState({ abajo: 0, arriba: 0 })
  /** Tiempo desde el último envío por la mesa en vivo. */
  const envio = useRef(0)
  /** Pulsaciones de «Jugar» del de enfrente: las que manda y la última atendida. */
  const go = useRef(0)
  const goVisto = useRef(0)

  const online = modo === 'online'
  // Quien abre simula; el de enfrente y quien mira pintan lo que les llega.
  const manda = !online || mesa.miAsiento === 'a'
  // El de enfrente ve la mesa girada: su mazo, como el de todos, abajo.
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

  /** Lado de quien no simula: pinta el último cuadro con el disco adelantado. */
  const seguirCuadro = (dt: number) => {
    const m = mundo.current
    const c = recibido.cuadro.current
    if (mesa.miAsiento === 'b') {
      // Mi mazo va por mi cuenta (respuesta inmediata) y sale como mando.
      moverMazo(m.arriba, false, 1500, dt)
      envio.current += dt * 1000
      if (envio.current >= PERIODO_VIVO) {
        envio.current = 0
        mesa.enVivo({ x: r1(m.arriba.tx), y: r1(m.arriba.ty), go: go.current })
      }
    }
    if (c) {
      const d = c.d
      const f = FASES.find((x) => x === d.f) ?? 'lista'
      const ma = numVivo(d.ma, 0)
      const mr = numVivo(d.mr, 0)
      if (f !== fase) setFase(f)
      if (ma !== marcador.abajo || mr !== marcador.arriba) setMarcador({ abajo: ma, arriba: mr })
      const enCamino = f === 'jugando' ? Math.min(0.2, (performance.now() - c.llegada) / 1000) : 0
      const vx = numVivo(d.vx, 0)
      const vy = numVivo(d.vy, 0)
      m.disco = {
        x: Math.max(R_DISCO, Math.min(ANCHO - R_DISCO, numVivo(d.x, ANCHO / 2) + vx * enCamino)),
        y: numVivo(d.y, ALTO / 2) + vy * enCamino,
        vx,
        vy,
      }
      // Los mazos ajenos se acercan a los del cuadro (sin saltos).
      const k = Math.min(1, dt * 18)
      m.abajo.x += (numVivo(d.ax, ANCHO / 2) - m.abajo.x) * k
      m.abajo.y += (numVivo(d.ay, ALTO - 70) - m.abajo.y) * k
      if (mesa.miAsiento !== 'b') {
        m.arriba.x += (numVivo(d.bx, ANCHO / 2) - m.arriba.x) * k
        m.arriba.y += (numVivo(d.by, 70) - m.arriba.y) * k
      }
    }
    dibujar(ctxRef.current!, m, col, girada)
  }

  useBucle((dt) => {
    if (!manda) {
      seguirCuadro(dt)
      return
    }
    const m = mundo.current
    const { disco } = m

    if (online) {
      // El de enfrente pulsó «Jugar».
      const mando = recibido.mando.current
      const suGo = numVivo(mando?.go, 0)
      if (suGo > goVisto.current) {
        goVisto.current = suGo
        if (fase !== 'jugando' && !sinRival) empezar()
      }
      envio.current += dt * 1000
      if (envio.current >= PERIODO_VIVO) {
        envio.current = 0
        mesa.enVivo({
          x: r1(disco.x),
          y: r1(disco.y),
          vx: r1(disco.vx),
          vy: r1(disco.vy),
          ax: r1(m.abajo.x),
          ay: r1(m.abajo.y),
          bx: r1(m.arriba.x),
          by: r1(m.arriba.y),
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
      // El mazo azul va adonde dice su mando.
      m.arriba.tx = numVivo(mando?.x, m.arriba.tx)
      m.arriba.ty = numVivo(mando?.y, m.arriba.ty)
    }

    // La máquina persigue el disco hasta su alcance y luego cubre su portería
    if (modo === 'ia') {
      if (disco.y < ALTO * rival.alcance) {
        m.arriba.tx = disco.x
        m.arriba.ty = Math.min(disco.y - 6, ALTO / 2 - R_MAZO)
      } else {
        m.arriba.tx = ANCHO / 2
        m.arriba.ty = 70
      }
    }

    // Mover mazos hacia su objetivo y conservar su velocidad para el empuje
    const velAbajo = moverMazo(m.abajo, true, 1500, dt)
    const velArriba = moverMazo(m.arriba, false, modo === 'ia' ? rival.vel : 1500, dt)

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

    dibujar(ctxRef.current!, mundo.current, col)
  }, (fase === 'jugando' && modo !== null) || online)

  /** Punto del lienzo en coordenadas de la mesa (la del de enfrente va girada). */
  const puntoMesa = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = puntoLienzo(lienzo.current!, e, ANCHO, ALTO)
    return girada ? { x: ANCHO - p.x, y: ALTO - p.y } : p
  }

  const bajarPuntero = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (fase !== 'jugando') return
    const p = puntoMesa(e)
    // En línea cada quien lleva SU mazo, toque donde toque.
    const lado = online ? (mesa.miAsiento === 'a' ? 'abajo' : mesa.miAsiento === 'b' ? 'arriba' : null) : p.y > ALTO / 2 ? 'abajo' : 'arriba'
    if (!lado || (lado === 'arriba' && modo === 'ia')) return
    punteros.current.set(e.pointerId, lado)
    lienzo.current!.setPointerCapture(e.pointerId)
    moverPuntero(e)
  }

  const moverPuntero = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const lado = punteros.current.get(e.pointerId)
    if (!lado) return
    const p = puntoMesa(e)
    const mazo = mundo.current[lado]
    mazo.tx = p.x
    mazo.ty = p.y
  }

  const soltarPuntero = (e: React.PointerEvent<HTMLCanvasElement>) => {
    punteros.current.delete(e.pointerId)
  }

  if (modo === null) {
    return (
      <ElegirModo
        opciones={[
          {
            clave: 'ia',
            icono: <Icono nombre="mascota-robot" />,
            titulo: t('entre.j.modo.ia', 'Contra la máquina'),
            desc: t('entre.j.hockey.iaDesc', 'Tú defiendes la portería de abajo'),
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
          onPointerDown={bajarPuntero}
          onPointerMove={moverPuntero}
          onPointerUp={soltarPuntero}
          onPointerCancel={soltarPuntero}
          className="w-full rounded-xl"
          style={{ touchAction: 'none', aspectRatio: `${ANCHO} / ${ALTO}`, background: col.fondo }}
        />
        {fase !== 'jugando' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/60 ui-noche">
            {fase === 'fin' && (
              <p className="px-4 text-center font-black">
                {gane
                  ? t('entre.j.ganaste', '¡Ganaste! 🎉')
                  : t('entre.j.pong.gana', 'Gana {j}', { j: ganaAbajo ? nombreAbajo : nombreArriba })}
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
      <p className="text-center text-xs text-white/35">{t('entre.j.hockey.ayuda', 'Arrastra tu mazo para golpear el disco')}</p>
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

  // Cancha: línea central, círculo y bocas de portería
  ctx.strokeStyle = col.lineas
  ctx.globalAlpha = 0.15
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, ALTO / 2)
  ctx.lineTo(ANCHO, ALTO / 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(ANCHO / 2, ALTO / 2, 40, 0, Math.PI * 2)
  ctx.stroke()
  ctx.globalAlpha = 1
  ctx.strokeStyle = col.porterias
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(ANCHO / 2 - PORTERIA / 2, 2)
  ctx.lineTo(ANCHO / 2 + PORTERIA / 2, 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(ANCHO / 2 - PORTERIA / 2, ALTO - 2)
  ctx.lineTo(ANCHO / 2 + PORTERIA / 2, ALTO - 2)
  ctx.stroke()

  // Mazos y disco: el borde es el mismo color, aclarado (mazos) u oscurecido (disco)
  const circulo = (x: number, y: number, r: number, relleno: string, velo: string) => {
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = relleno
    ctx.fill()
    ctx.lineWidth = 3
    ctx.strokeStyle = relleno
    ctx.stroke()
    ctx.strokeStyle = velo
    ctx.stroke()
  }
  circulo(m.abajo.x, m.abajo.y, R_MAZO, col.abajo, 'rgba(255,255,255,0.55)')
  circulo(m.arriba.x, m.arriba.y, R_MAZO, col.arriba, 'rgba(255,255,255,0.55)')
  circulo(m.disco.x, m.disco.y, R_DISCO, col.disco, 'rgba(0,0,0,0.35)')
  ctx.restore()
}
