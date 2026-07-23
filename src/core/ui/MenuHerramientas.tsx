import { useEffect, useState, type ReactNode } from 'react'
import { useHerramienta, type Herramienta } from '../state/herramientaStore'
import { usePlanos, type ModoConstructor } from '../state/planosStore'
import { VEHICULOS_JUGABLES } from '../house/vehiculos'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'
import { useHud } from '../state/hudStore'
import { TiradorHud } from './HudPlegable'

// Geometría de la rueda (SVG 288×288): anillo de sectores + círculo central.
// El número de sectores es dinámico (360°/n) para que cada categoría pueda
// crecer con más entradas sin tocar la geometría.
const CX = 144
const R_EXT = 132
const R_INT = 52
const PAD = 1.5 // separación visual entre sectores (grados)

const pt = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180
  return `${CX + r * Math.cos(a)} ${CX + r * Math.sin(a)}`
}

/** Path del sector i de n (el 0 arriba, sentido horario). */
function pathSector(i: number, n: number): string {
  const paso = 360 / n
  const a0 = -90 - paso / 2 + i * paso + PAD
  const a1 = -90 - paso / 2 + (i + 1) * paso - PAD
  // Con una sola entrada (n=1) el sector abarca casi 360°: el arco es "largo"
  // y el flag debe ser 1, o SVG dibuja el arco corto (el hueco) en su lugar.
  const largo = a1 - a0 > 180 ? 1 : 0
  return `M ${pt(R_EXT, a0)} A ${R_EXT} ${R_EXT} 0 ${largo} 1 ${pt(R_EXT, a1)} L ${pt(R_INT, a1)} A ${R_INT} ${R_INT} 0 ${largo} 0 ${pt(R_INT, a0)} Z`
}

/** Punto medio del sector i de n (para el emoji y la etiqueta). */
function centroSector(i: number, n: number) {
  const paso = 360 / n
  const a = ((-90 + i * paso) * Math.PI) / 180
  const r = (R_INT + R_EXT) / 2
  return { x: CX + r * Math.cos(a), y: CX + r * Math.sin(a) }
}

/** Un gajo del anillo (categoría o herramienta dentro de ella). */
function Sector({
  i,
  n,
  emoji,
  etiqueta,
  activo,
  onSelect,
}: {
  i: number
  n: number
  emoji: string
  etiqueta: string
  activo: boolean
  onSelect: () => void
}) {
  const c = centroSector(i, n)
  return (
    <g className="cursor-pointer" onClick={onSelect}>
      <path
        d={pathSector(i, n)}
        className={`transition-colors ${activo ? 'fill-white/25' : 'fill-black/55 hover:fill-white/20'}`}
        stroke={activo ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.1)'}
      />
      <foreignObject x={c.x - 14} y={c.y - 12} width={28} height={28} className="pointer-events-none">
        <div className="grid h-full w-full place-items-center text-[22px] leading-none text-white">
          <Icono emoji={emoji} />
        </div>
      </foreignObject>
      <text x={c.x} y={c.y + 18} textAnchor="middle" fontSize={10} className="pointer-events-none fill-white/70 font-semibold">
        {etiqueta}
      </text>
    </g>
  )
}

/** Círculo central: "Cubo" (nivel categorías) o "Atrás" (dentro de una categoría). */
function Centro({
  icono,
  etiqueta,
  activo,
  onSelect,
}: {
  icono: ReactNode
  etiqueta: string
  activo: boolean
  onSelect: () => void
}) {
  return (
    <g className="cursor-pointer" onClick={onSelect}>
      <circle
        cx={CX}
        cy={CX}
        r={44}
        className={`transition-colors ${activo ? 'fill-white/25' : 'fill-black/55 hover:fill-white/20'}`}
        stroke={activo ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.1)'}
      />
      <foreignObject x={CX - 14} y={CX - 12} width={28} height={28} className="pointer-events-none">
        <div className="grid h-full w-full place-items-center text-[22px] leading-none text-white">
          {icono}
        </div>
      </foreignObject>
      <text x={CX} y={CX + 18} textAnchor="middle" fontSize={10} className="pointer-events-none fill-white/70 font-semibold">
        {etiqueta}
      </text>
    </g>
  )
}

interface EntradaHerramienta {
  herramienta: Herramienta
  emoji: string
  etiqueta: string
  /** Atajo de construcción: modo del constructor de mapa que activa en el 3D. */
  modo?: ModoConstructor
}
interface Categoria {
  id: string
  emoji: string
  etiqueta: string
  entradas: EntradaHerramienta[]
}

/**
 * Botón sobre el joystick que abre la rueda de herramientas (estilo GTA), en
 * dos niveles: primero categoría (Movimientos / Juguetes / Vehículos) y luego
 * la herramienta dentro de ella. Así cada categoría puede sumar más entradas
 * sin amontonar un solo anillo. La herramienta elegida sustituye el cubo de
 * vistas en `NavControls` por su control (`ControlHerramienta`).
 */
export function MenuHerramientas() {
  const t = useT()
  const [abierta, setAbierta] = useState(false)
  const [catAbierta, setCatAbierta] = useState<string | null>(null)
  const equipadas = useHerramienta((s) => s.equipadas)
  const equipar = useHerramienta((s) => s.equipar)
  const soltarTodo = useHerramienta((s) => s.soltarTodo)
  const planosModo = usePlanos((s) => s.modo)
  const planosOn = usePlanos((s) => s.activo)
  const plegado = useHud((s) => s.plegado.infIzq)
  const movilVertical = useHud((s) => s.movilVertical)
  const chatPlegado = useHud((s) => s.plegado.chat)

  const cerrar = () => {
    setAbierta(false)
    setCatAbierta(null)
  }

  useEffect(() => {
    if (!abierta) return
    // Escape retrocede un nivel si hay una categoría abierta; si no, cierra.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (catAbierta) setCatAbierta(null)
      else setAbierta(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [abierta, catAbierta])

  const categorias: Categoria[] = [
    {
      id: 'movimientos',
      emoji: '🏃',
      etiqueta: t('herr.cat.movimientos', 'Movimientos'),
      entradas: [
        { herramienta: 'saltar', emoji: '🦘', etiqueta: t('herr.saltar', 'Saltar') },
        { herramienta: 'correr', emoji: '🏃', etiqueta: t('herr.correr', 'Correr') },
        { herramienta: 'bailar', emoji: '💃', etiqueta: t('herr.bailar', 'Bailar') },
        { herramienta: 'cuerda', emoji: '🪢', etiqueta: t('herr.cuerda', 'Saltar la cuerda') },
        { herramienta: 'mortal', emoji: '🤸', etiqueta: t('herr.mortal', 'Mortal') },
        { herramienta: 'saludar', emoji: '👋', etiqueta: t('herr.saludar', 'Saludar') },
      ],
    },
    {
      id: 'juguetes',
      emoji: '🧸',
      etiqueta: t('herr.cat.juguetes', 'Juguetes'),
      entradas: [
        { herramienta: 'laser', emoji: '🔫', etiqueta: t('herr.laser', 'Láser') },
        { herramienta: 'portales', emoji: '🌀', etiqueta: t('herr.portales', 'Portales') },
        { herramienta: 'fuegos', emoji: '🎆', etiqueta: t('herr.fuegos', 'Fuegos') },
        { herramienta: 'burbujas', emoji: '🫧', etiqueta: t('herr.burbujas', 'Burbujas') },
        { herramienta: 'grafiti', emoji: '🎨', etiqueta: t('herr.grafiti', 'Grafiti') },
      ],
    },
    {
      id: 'vehiculos',
      emoji: '🚗',
      etiqueta: t('herr.cat.vehiculos', 'Vehículos'),
      entradas: VEHICULOS_JUGABLES.map((v) => ({
        herramienta: v.tipo as Herramienta,
        emoji: v.icono,
        etiqueta: t(`herr.veh.${v.tipo}`, v.nombre),
      })),
    },
    {
      id: 'construccion',
      emoji: '🏗️',
      etiqueta: t('herr.cat.construccion', 'Construcción'),
      entradas: [
        { herramienta: 'construir', modo: 'cuartos', emoji: '🏠', etiqueta: t('constructor.modo.cuartos', 'Cuartos') },
        { herramienta: 'construir', modo: 'muros', emoji: '🧱', etiqueta: t('constructor.modo.muros', 'Muros') },
        { herramienta: 'construir', modo: 'puertas', emoji: '🚪', etiqueta: t('constructor.modo.puertas', 'Puertas') },
        { herramienta: 'construir', modo: 'ventanas', emoji: '🪟', etiqueta: t('constructor.modo.ventanas', 'Ventanas') },
        { herramienta: 'construir', modo: 'piso-ext', emoji: '🌿', etiqueta: t('constructor.modo.piso-ext', 'Piso ext.') },
        { herramienta: 'construir', modo: 'piso-int', emoji: '🟫', etiqueta: t('constructor.modo.piso-int', 'Piso int.') },
        { herramienta: 'construir', modo: 'techos', emoji: '🔺', etiqueta: t('constructor.modo.techos', 'Techos') },
      ],
    },
  ]

  const emojiActivo =
    equipadas[0] === 'construir'
      ? '🏗️'
      : categorias.flatMap((c) => c.entradas).find((e) => e.herramienta === equipadas[0])?.emoji

  // Equipar/desequipar sin cerrar la rueda: permite armar el set de hasta 3.
  const elegir = (h: Herramienta) => equipar(h)

  // Atajo de construcción: equipa la herramienta (si falta), activa ese modo del
  // constructor en el 3D y cierra la rueda para dejar toda la pantalla al mapa.
  const elegirModo = (m: ModoConstructor) => {
    if (!useHerramienta.getState().equipadas.includes('construir')) equipar('construir')
    usePlanos.getState().setModo(m)
    // Modo Cuartos: celda entera + pincel cuadrado listo para dibujar al primer toque.
    if (m === 'cuartos') {
      usePlanos.getState().setDetalleRejilla('celda')
      if (!usePlanos.getState().pincelForma) usePlanos.getState().setPincelForma('cuadrado')
    }
    cerrar()
  }

  const categoriaActual = catAbierta ? categorias.find((c) => c.id === catAbierta) : undefined

  // Teléfono vertical con el chat abierto: el abanico cede el bajo (chat ⊕ esquinas).
  if (movilVertical && !chatPlegado) return null

  return (
    <>
      {/* Con la esquina plegada el abanico baja al hueco del joystick, con su chevron al lado. */}
      <div className={`absolute left-4 z-10 flex items-center gap-1 ${plegado ? 'bottom-4' : 'bottom-32'}`}>
        <button
          type="button"
          data-tut="herr.boton"
          data-tut-zona="herramientas"
          onClick={() => setAbierta(true)}
          title={t('herr.boton', 'Herramientas')}
          className="ui-panel-glass grid h-11 w-11 place-items-center rounded-full border border-white/10 text-xl backdrop-blur-sm transition hover:bg-white/10 active:scale-90"
        >
          {emojiActivo ? <Icono emoji={emojiActivo} /> : <Icono nombre="cubo-vistas" />}
        </button>
        {plegado && (
          <TiradorHud zona="infIzq" chico>
            ›
          </TiradorHud>
        )}
      </div>

      {abierta && (
        <div
          data-tut="herr.fondo"
          className="ui-noche absolute inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
          onClick={cerrar}
        >
          <svg
            data-tut="herr.rueda"
            viewBox="0 0 288 288"
            width={288}
            height={288}
            role="menu"
            aria-label={categoriaActual ? categoriaActual.etiqueta : t('herr.rueda', 'Rueda de herramientas')}
            className="ui-pop touch-none select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {categoriaActual ? (
              <>
                {categoriaActual.entradas.map((en, i) => (
                  <Sector
                    key={en.modo ?? en.herramienta}
                    i={i}
                    n={categoriaActual.entradas.length}
                    emoji={en.emoji}
                    etiqueta={en.etiqueta}
                    activo={
                      en.modo
                        ? planosOn && planosModo === en.modo && equipadas.includes('construir')
                        : equipadas.includes(en.herramienta)
                    }
                    onSelect={() => (en.modo ? elegirModo(en.modo) : elegir(en.herramienta))}
                  />
                ))}
                <Centro
                  icono={<Icono nombre="atras" />}
                  etiqueta={t('herr.atras', 'Atrás')}
                  activo={false}
                  onSelect={() => setCatAbierta(null)}
                />
              </>
            ) : (
              <>
                {categorias.map((cat, i) => (
                  <Sector
                    key={cat.id}
                    i={i}
                    n={categorias.length}
                    emoji={cat.emoji}
                    etiqueta={cat.etiqueta}
                    activo={cat.entradas.some((e) => equipadas.includes(e.herramienta))}
                    onSelect={() => setCatAbierta(cat.id)}
                  />
                ))}
                {/* Centro: soltar todas las herramientas y volver al cubo de vistas */}
                <Centro
                  icono={<Icono nombre="cubo-vistas" />}
                  etiqueta={t('herr.cubo', 'Cubo')}
                  activo={equipadas.length === 0}
                  onSelect={() => {
                    soltarTodo()
                    cerrar()
                  }}
                />
              </>
            )}
          </svg>
        </div>
      )}
    </>
  )
}
