import { useEffect, useState } from 'react'
import { useDiseño, esObjetoMapa } from '../state/disenoStore'
import { useHouse } from '../state/houseStore'
import { useMontura } from '../state/monturaStore'
import { useAccionCuarto } from '../state/accionCuartoStore'
import { playerPos } from '../state/playerPosition'
import { useHerramienta, type Herramienta } from '../state/herramientaStore'
import { usePlanos, type ModoConstructor } from '../state/planosStore'
import { useLayout } from '../state/layoutStore'
import { useCam } from '../state/cameraStore'
import { useEditorUi } from '../state/editorUiStore'
import { useCuartos } from '../state/cuartosStore'
import { nivelMaximo, nivelMinimo } from '../house/planoGeometria'
import { TIPOS_PUERTA, TIPOS_VENTANA_CONTENIDO } from '../house/murosPuertas'
import type { FormaLoseta } from '../house/formasLoseta'
import { LosetaFormaSvg } from './comun/LosetaFormaSvg'
import { esVehiculo, vehiculoDe, defDeMontura, type TipoVehiculo } from '../house/vehiculos'
import { puntoLibreCerca } from '../house/Character'
import { usePortales } from '../house/portales'
import { lanzarCohete } from '../house/fuegos'
import { useGrafitis } from '../state/grafitiStore'
import { useCargar } from '../state/cargarStore'
import { useContexto, type AccionContextual } from '../state/contextoStore'
import { useParque, parqueFrame } from '../state/parqueStore'
import { useFlotador } from '../state/flotadorStore'
import { useTren } from '../state/trenStore'
import { useJuegoCancha } from '../state/juegoCanchaStore'
import { useCarrera } from '../state/carreraStore'
import { type ClaseCancha } from '../state/canchasStore'
import { alimentarCorral, mimarCorral, curarCorral, limpiarCorral } from '../state/granjaStore'
import { alimentarObjeto, mimarObjeto } from '../state/vidaObjetoStore'
import { cosecharParcelaPorId } from '../state/huertoStore'
import { pulsarAnimacion } from '../house/animacion'
import { recogerPistola } from '../house/arma'
import { abrirAppDeObjeto } from '../abrirApp'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'
import { ControlesTiro } from './ControlesTiro'

const FICHAS = {
  saltar: { emoji: '🦘', clave: 'herr.saltar', fallback: 'Saltar' },
  correr: { emoji: '🏃', clave: 'herr.correr', fallback: 'Correr' },
  bailar: { emoji: '💃', clave: 'herr.bailar', fallback: 'Bailar' },
  cuerda: { emoji: '🪢', clave: 'herr.cuerda', fallback: 'Saltar la cuerda' },
  mortal: { emoji: '🤸', clave: 'herr.mortal', fallback: 'Mortal' },
  saludar: { emoji: '👋', clave: 'herr.saludar', fallback: 'Saludar' },
  laser: { emoji: '🔫', clave: 'herr.laser', fallback: 'Láser' },
  pintura: { emoji: '🥎', clave: 'herr.pintura', fallback: 'Pintura' },
  portales: { emoji: '🌀', clave: 'herr.portales', fallback: 'Portales' },
  fuegos: { emoji: '🎆', clave: 'herr.fuegos', fallback: 'Fuegos' },
  burbujas: { emoji: '🫧', clave: 'herr.burbujas', fallback: 'Burbujas' },
  grafiti: { emoji: '🎨', clave: 'herr.grafiti', fallback: 'Grafiti' },
} as const

/**
 * Trae la instancia del mapa de ese tipo al jugador (o la crea) y la monta. La
 * usan el botón del vehículo (junto a la rueda) y la propia rueda al elegirlo.
 * Solo en planta baja: arriba no hay dónde dejarlo.
 */
export async function invocarVehiculo(tipo: TipoVehiculo) {
  if (useHouse.getState().playerLevel > 0) return
  const d = useDiseño.getState()
  let inst = d.objetos.find((o) => esObjetoMapa(o) && o.tipo === tipo)
  if (!inst) {
    await d.addObjetoMapa(tipo, vehiculoDe(tipo).defaultColor)
    inst = useDiseño
      .getState()
      .objetos.filter((o) => esObjetoMapa(o) && o.tipo === tipo)
      .at(-1)
  }
  if (!inst || inst.id == null) return
  const rotY = inst.rotY ?? 0
  // Buscar un hueco libre para el radio del vehículo: si nace solapado con otro
  // objeto o un muro, la conducción queda bloqueada (el auto era el más afectado).
  const nivel = useHouse.getState().playerLevel
  const libre = puntoLibreCerca(playerPos.x, playerPos.z, nivel, vehiculoDe(tipo).radio)
  await d.setObjetoPose(inst.id, libre.x, libre.z, rotY)
  useMontura.getState().montar({ ...inst, x: libre.x, z: libre.z, rotY })
}

/**
 * Marco de un panel: encabezado con la herramienta y ✕ para desequiparla.
 * `compacto` quita el encabezado y usa botones más bajos: es el modo de los
 * paneles que aparecen SOLOS por proximidad, que pueden llegar a apilarse tres
 * y con la altura normal no caben en un teléfono en horizontal.
 */
function Panel({
  h,
  emoji,
  etiqueta,
  sinCerrar,
  compacto,
  children,
}: {
  /** Herramienta de la hotbar a la que pertenece; sin ella no hay ✕ que mostrar. */
  h?: Herramienta
  emoji: string
  etiqueta: string
  /** Panel prestado (vehículo montado sin equipar): no hay nada que desequipar. */
  sinCerrar?: boolean
  compacto?: boolean
  children: React.ReactNode
}) {
  const t = useT()
  const equipar = useHerramienta((s) => s.equipar)
  return (
    <div className="ui-hud ui-pop flex w-full flex-col gap-1 rounded-lg border border-white/10 p-2">
      {!compacto && (
        <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-white/50">
          <span>
            <Icono emoji={emoji} /> {etiqueta}
          </span>
          {h && !sinCerrar && (
            <button
              type="button"
              onClick={() => equipar(h)}
              title={t('herr.quitar', 'Quitar herramienta')}
              className="rounded px-1 text-white/60 transition hover:bg-white/10 hover:text-white active:scale-95"
            >
              <Icono nombre="cerrar" />
            </button>
          )}
        </div>
      )}
      {children}
    </div>
  )
}

const btn = 'flex h-14 w-full flex-col items-center justify-center gap-0.5 rounded-lg border transition active:scale-90'
const btnClaro = `${btn} border-white/10 bg-white/10 text-white hover:bg-white/20`
const btnVerde = `${btn} border-accent/60 bg-accent text-accent-ink`

/** Botón de un panel compacto: icono y texto en fila, para apilar varios sin desbordar. */
const btnCorto =
  'flex h-11 w-full items-center justify-center gap-1.5 rounded-lg border transition active:scale-90'
const btnCortoClaro = `${btnCorto} border-white/10 bg-white/10 text-white hover:bg-white/20`
const btnCortoVerde = `${btnCorto} border-accent/60 bg-accent text-accent-ink`

const MODOS_CONSTRUIR: { id: ModoConstructor; emoji: string; labelEs: string }[] = [
  { id: 'cuartos', emoji: '🏠', labelEs: 'Cuartos' },
  { id: 'muros', emoji: '🧱', labelEs: 'Muros' },
  { id: 'puertas', emoji: '🚪', labelEs: 'Puertas' },
  { id: 'ventanas', emoji: '🪟', labelEs: 'Ventanas' },
  { id: 'piso-ext', emoji: '🌿', labelEs: 'Piso ext.' },
  { id: 'piso-int', emoji: '🟫', labelEs: 'Piso int.' },
  { id: 'techos', emoji: '🔺', labelEs: 'Techos' },
]

/** Chip pequeño del panel de construcción (sub-opciones y niveles). */
const chipConstr = (act: boolean) =>
  `flex h-7 flex-1 items-center justify-center rounded-md border text-[10px] font-semibold transition active:scale-95 ${
    act
      ? 'border-accent/60 bg-accent text-accent-ink'
      : 'border-white/10 bg-white/10 text-white/70 hover:bg-white/20'
  }`

/** Botón cuadrado de variante (forma/figura) del panel de construcción. */
const btnVariante = (act: boolean) =>
  `grid h-8 flex-1 place-items-center rounded-md border transition active:scale-90 ${
    act ? 'border-accent/70 bg-accent/30' : 'border-white/10 bg-white/10 hover:bg-white/20'
  }`

/** Botón chico de variante (fila de esquinas, más compacta). */
const btnVarianteChico = (act: boolean) =>
  `grid h-6 flex-1 place-items-center rounded-md border transition active:scale-90 ${
    act ? 'border-accent/70 bg-accent/30' : 'border-white/10 bg-white/10 hover:bg-white/20'
  }`

const FORMAS_FIGURA: { id: FormaLoseta }[] = [{ id: 'cuadrado' }, { id: 'triangular' }, { id: 'circular' }]
/** Formas que recortan una esquina (¼ de celda): cuadrado no aplica. */
const ESQUINAS_FIGURA: { id: FormaLoseta }[] = [{ id: 'triangular' }, { id: 'circular' }]
const ROTS_FIGURA: (0 | 90 | 180 | 270)[] = [0, 90, 180, 270]

/** Miniatura SVG de una forma de loseta (cuadrado/triángulo/círculo con rotación). */
function FiguraSvg({ forma, rot, act, size = 18 }: { forma: FormaLoseta; rot?: 0 | 90 | 180 | 270; act: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" aria-hidden>
      <LosetaFormaSvg x={0} y={0} w={26} h={26} forma={{ forma, rotacion: rot ?? 0 }} fill={act ? 'var(--ui-accent)' : '#94a3b8'} rx={4} />
    </svg>
  )
}

/** Las 4 esquinas donde curva el muro circular (mismo mapeo que FormaMuroOverlay). */
const CURVAS_MURO: { rot: 0 | 90 | 180 | 270; label: string; d: string }[] = [
  { rot: 0, label: 'Curva sup. derecha', d: 'M13,0 A13,13 0 0,0 26,13' },
  { rot: 90, label: 'Curva inf. derecha', d: 'M13,26 A13,13 0 0,1 26,13' },
  { rot: 180, label: 'Curva inf. izquierda', d: 'M0,13 A13,13 0 0,1 13,26' },
  { rot: 270, label: 'Curva sup. izquierda', d: 'M13,0 A13,13 0 0,1 0,13' },
]

/** Emoji del contenido de la ventana (ventana/cuadro/espejo). */
const EMOJI_CONTENIDO: Record<string, string> = { ventana: '🪟', cuadro: '🖼️', espejo: '🪞' }

/**
 * Variantes de forma/tipo del modo activo del constructor, sin ajustes de tamaño ni
 * color (esos van en «Abrir editor»): formas de cuarto, muros rectos/curvos, tipo de
 * puerta y contenido de la ventana. Todo se aplica tocando el mapa 3D.
 */
function VariantesConstruir() {
  const t = useT()
  const modo = usePlanos((s) => s.modo)
  const pincelForma = usePlanos((s) => s.pincelForma)
  const herrPlano = usePlanos((s) => s.herramienta)
  const rotForma = usePlanos((s) => s.rotForma)
  const detalleRejilla = usePlanos((s) => s.detalleRejilla)
  const formaMuro = usePlanos((s) => s.formaMuro)
  const orientMuro = usePlanos((s) => s.orientMuro)
  const tipoPuerta = usePlanos((s) => s.tipoPuerta)
  const ventContenido = usePlanos((s) => s.ventContenido)
  const ventCara = usePlanos((s) => s.ventCara)

  const labelForma = (f: FormaLoseta) =>
    f === 'cuadrado'
      ? t('constructor.forma.cuadrado', 'Cuadrado')
      : f === 'triangular'
        ? t('constructor.forma.triangulo', 'Triángulo')
        : t('constructor.forma.circulo', 'Círculo')

  if (modo === 'cuartos') {
    const fino = detalleRejilla === 'subcelda'
    // Elegir forma fija la rejilla (celda entera o fina) y el pincel de una vez.
    const usarForma = (f: FormaLoseta, sub: boolean) => {
      usePlanos.getState().setDetalleRejilla(sub ? 'subcelda' : 'celda')
      usePlanos.getState().setPincelForma(f)
    }
    return (
      <div className="space-y-1">
        {/* Forma del cuarto (celda entera): cuadrado, triángulo o círculo. */}
        <div className="flex gap-1">
          {FORMAS_FIGURA.map((f) => {
            const act = !fino && pincelForma === f.id
            return (
              <button key={f.id} type="button" title={labelForma(f.id)} onClick={() => usarForma(f.id, false)} className={btnVariante(act)}>
                <FiguraSvg forma={f.id} act={act} />
              </button>
            )
          })}
        </div>
        {/* Posición (rotación) de la forma de celda entera. */}
        {!fino && (pincelForma === 'triangular' || pincelForma === 'circular') && (
          <div className="flex gap-1">
            {ROTS_FIGURA.map((r) => (
              <button
                key={r}
                type="button"
                title={t('constructor.forma.posicion', 'Posición')}
                onClick={() => usePlanos.getState().setRotForma(r)}
                className={btnVariante(rotForma === r)}
              >
                <FiguraSvg forma={pincelForma} rot={r} act={rotForma === r} />
              </button>
            ))}
          </div>
        )}
        {/* Esquinas: recorta un cuadrante (¼ de celda) con triángulo o círculo (rejilla fina). */}
        <div className="flex items-center gap-1.5 pt-0.5">
          <span className="text-[8px] font-bold uppercase tracking-wide text-white/40">{t('constructor.esquinas', 'Esquinas')}</span>
          <span className="h-px flex-1 bg-white/10" />
        </div>
        <div className="flex gap-1">
          {ESQUINAS_FIGURA.map((f) => {
            const act = fino && pincelForma === f.id
            return (
              <button
                key={f.id}
                type="button"
                title={f.id === 'triangular' ? t('constructor.forma.triangulo', 'Triángulo') : t('constructor.forma.circulo', 'Círculo')}
                onClick={() => usarForma(f.id, true)}
                className={btnVarianteChico(act)}
              >
                <FiguraSvg forma={f.id} act={act} size={13} />
              </button>
            )
          })}
        </div>
        {/* Posición del recorte de esquina. */}
        {fino && (pincelForma === 'triangular' || pincelForma === 'circular') && (
          <div className="flex gap-1">
            {ROTS_FIGURA.map((r) => (
              <button
                key={r}
                type="button"
                title={t('constructor.forma.posicion', 'Posición')}
                onClick={() => usePlanos.getState().setRotForma(r)}
                className={btnVarianteChico(rotForma === r)}
              >
                <FiguraSvg forma={pincelForma} rot={r} act={rotForma === r} size={13} />
              </button>
            ))}
          </div>
        )}
        {/* Expandir: crecer/recortar/eliminar cuartos con los +/− del 3D.
            Mover: arrastrar un cuarto entero a otra celda. */}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => usePlanos.getState().setHerramienta('expandir')}
            className={chipConstr(pincelForma == null && herrPlano === 'expandir')}
          >
            {t('planos.herr.expandir', 'Expandir')}
          </button>
          <button
            type="button"
            onClick={() => usePlanos.getState().setHerramienta('mover')}
            className={chipConstr(pincelForma == null && herrPlano === 'mover')}
          >
            {t('planos.herr.mover', 'Mover')}
          </button>
        </div>
      </div>
    )
  }

  if (modo === 'muros' && herrPlano === 'muro') {
    return (
      <div className="space-y-1">
        {/* Forma del muro: lados (rectos), triángulo o círculo (curvo). */}
        <div className="flex gap-1">
          {FORMAS_FIGURA.map((f) => (
            <button
              key={f.id}
              type="button"
              title={
                f.id === 'cuadrado'
                  ? t('constructor.muro.lados', 'Lados (aristas)')
                  : f.id === 'triangular'
                    ? t('constructor.muro.triangulo', 'Triángulo')
                    : t('constructor.muro.circulo', 'Círculo')
              }
              onClick={() => usePlanos.getState().setFormaMuro(f.id)}
              className={btnVariante(formaMuro === f.id)}
            >
              <FiguraSvg forma={f.id} act={formaMuro === f.id} />
            </button>
          ))}
        </div>
        {/* Lados: orientación horizontal/vertical del muro recto. */}
        {formaMuro === 'cuadrado' && (
          <div className="flex gap-1">
            {(['h', 'v'] as const).map((o) => (
              <button
                key={o}
                type="button"
                title={o === 'h' ? t('constructor.muro.horizontal', 'Horizontal') : t('constructor.muro.vertical', 'Vertical')}
                onClick={() => usePlanos.getState().setOrientMuro(o)}
                className={btnVariante(orientMuro === o)}
              >
                <svg width={16} height={16} viewBox="0 0 26 26" aria-hidden>
                  <line
                    x1={o === 'h' ? 4 : 13} y1={o === 'h' ? 13 : 4}
                    x2={o === 'h' ? 22 : 13} y2={o === 'h' ? 13 : 22}
                    stroke={orientMuro === o ? '#a7f3d0' : '#94a3b8'} strokeWidth={3} strokeLinecap="round"
                  />
                </svg>
              </button>
            ))}
          </div>
        )}
        {/* Triángulo: las dos diagonales. */}
        {formaMuro === 'triangular' && (
          <div className="flex gap-1">
            {([0, 90] as const).map((r) => (
              <button
                key={r}
                type="button"
                title={r === 0 ? t('constructor.muro.diagonal1', 'Diagonal') : t('constructor.muro.diagonal2', 'Diagonal opuesta')}
                onClick={() => usePlanos.getState().setRotForma(r)}
                className={btnVariante(rotForma === r)}
              >
                <svg width={16} height={16} viewBox="0 0 26 26" aria-hidden>
                  <line
                    x1={4} y1={r === 0 ? 4 : 22} x2={22} y2={r === 0 ? 22 : 4}
                    stroke={rotForma === r ? '#a7f3d0' : '#94a3b8'} strokeWidth={3} strokeLinecap="round"
                  />
                </svg>
              </button>
            ))}
          </div>
        )}
        {/* Círculo: en qué esquina curva el muro. */}
        {formaMuro === 'circular' && (
          <div className="flex gap-1">
            {CURVAS_MURO.map((c) => (
              <button
                key={c.rot}
                type="button"
                title={t(
                  `constructor.muro.${c.rot === 0 ? 'curvaSupDer' : c.rot === 90 ? 'curvaInfDer' : c.rot === 180 ? 'curvaInfIzq' : 'curvaSupIzq'}` as Parameters<typeof t>[0],
                  c.label,
                )}
                onClick={() => usePlanos.getState().setRotForma(c.rot)}
                className={btnVariante(rotForma === c.rot)}
              >
                <svg width={20} height={20} viewBox="0 0 26 26" aria-hidden>
                  <path d={c.d} fill="none" stroke={rotForma === c.rot ? '#a7f3d0' : '#94a3b8'} strokeWidth={3} strokeLinecap="round" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (modo === 'puertas') {
    return (
      <div className="grid grid-cols-5 gap-1">
        {TIPOS_PUERTA.map((tp) => (
          <button
            key={tp.id}
            type="button"
            title={t(`paredes.puerta.${tp.id}` as Parameters<typeof t>[0], tp.nombre)}
            onClick={() => usePlanos.getState().setTipoPuerta(tp.id)}
            className={`grid place-items-center rounded-md border p-0.5 transition active:scale-90 ${
              tipoPuerta === tp.id ? 'border-accent/70 bg-accent/30' : 'border-white/10 bg-white/10 hover:bg-white/20'
            }`}
          >
            <span className="h-7 w-full rounded-sm border border-white/10" style={{ background: tp.preview }} />
          </button>
        ))}
      </div>
    )
  }

  if (modo === 'ventanas') {
    return (
      <div className="space-y-1">
        <div className="flex gap-1">
          {TIPOS_VENTANA_CONTENIDO.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => usePlanos.getState().setVentContenido(c.id)}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-md border py-1 transition active:scale-90 ${
                ventContenido === c.id ? 'border-accent/70 bg-accent/30' : 'border-white/10 bg-white/10 hover:bg-white/20'
              }`}
            >
              <span className="text-base leading-none"><Icono emoji={EMOJI_CONTENIDO[c.id]} /></span>
              <span className="text-[8px] font-semibold text-white/70">{t(`paredes.cont.${c.id}` as Parameters<typeof t>[0], c.nombre)}</span>
            </button>
          ))}
        </div>
        {/* Cuadro/espejo: en qué cara del muro vive (la otra queda lisa). La ventana normal
            atraviesa el muro, así que no ofrece cara. */}
        {ventContenido !== 'ventana' && (
          <div className="flex gap-1">
            {(['interior', 'exterior'] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => usePlanos.getState().setVentCara(c)}
                className={chipConstr(ventCara === c)}
              >
                {c === 'interior' ? t('paredes.caraInterior', 'Cara interior') : t('paredes.caraExterior', 'Cara exterior')}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return null
}

/**
 * Panel del atajo de construcción: cambia de modo del constructor y de nivel y, debajo,
 * las variantes de forma/tipo del modo activo (ver VariantesConstruir). Se construye
 * tocando directamente el mapa 3D, sin abrir el panel del editor (clave en móvil).
 */
function PanelConstruir() {
  const t = useT()
  const modo = usePlanos((s) => s.modo)
  const activo = usePlanos((s) => s.activo)
  const nivel = usePlanos((s) => s.nivel)
  const aviso = usePlanos((s) => s.aviso)
  const placed = useLayout((s) => s.placed)
  const cells = useLayout((s) => s.cells)
  const niveles = useLayout((s) => s.niveles)
  const accesos = useLayout((s) => s.accesos)
  const cuartos = useCuartos((s) => s.cuartos)

  // Grid de modos plegable (persistido): plegado deja solo las variantes del elemento
  // activo, para ganar espacio en pantallas chicas.
  const [modosAbierto, setModosAbierto] = useState(() => {
    try {
      return localStorage.getItem('mh.construir.modos') !== '0'
    } catch {
      return true
    }
  })
  const toggleModos = () =>
    setModosAbierto((v) => {
      const n = !v
      try {
        localStorage.setItem('mh.construir.modos', n ? '1' : '0')
      } catch {
        /* modo privado */
      }
      return n
    })

  // Reactiva el motor 3D al montar si quedó apagado (p. ej. tras cerrar el editor con
  // el atajo aún equipado). Grid/Fondo no son modos del atajo: cae a Cuartos.
  useEffect(() => {
    const P = usePlanos.getState()
    if (P.activo || useLayout.getState().editMode) return
    P.setModo(P.modo === 'grid' || P.modo === 'fondo' ? 'cuartos' : P.modo)
  }, [])

  const cambiarModo = (m: ModoConstructor) => {
    const P = usePlanos.getState()
    P.setModo(m)
    if (m === 'cuartos') {
      // Empezar siempre en celda entera (la fila «Esquinas» pasa a rejilla fina).
      P.setDetalleRejilla('celda')
      if (!usePlanos.getState().pincelForma) P.setPincelForma('cuadrado')
    }
  }

  // Relevo al editor completo (mismo modo y selección); la herramienta sigue equipada
  // y el atajo se reactiva solo al cerrar el editor.
  const abrirEditor = () => {
    if (useCam.getState().vista !== 'iso') useEditorUi.getState().setEditor3d(true)
    useEditorUi.getState().setTab('mapa')
    useLayout.getState().setEditMode(true)
  }

  // Mismo abanico de niveles que el editor: pisos construidos + estrenar arriba (+1)
  // y excavar sótano (−1), estos dos solo en modo Cuartos.
  const maxNivel = nivelMaximo(placed, niveles, accesos)
  const minNivel = nivelMinimo(placed, niveles)
  const hayCuartos = cuartos.some((r) => placed[r.id] && cells[r.id])
  const nuevoNivel = modo === 'cuartos' && hayCuartos ? maxNivel + 1 : null
  const nuevoSotano = modo === 'cuartos' && minNivel === 0 ? -1 : null
  const nivMin = nuevoSotano ?? minNivel
  const nivMax = nuevoNivel ?? maxNivel

  const modoActual =
    modo === 'ascensos'
      ? { labelEs: 'Ascensos' }
      : MODOS_CONSTRUIR.find((m) => m.id === modo)
  const emojiModo = modo === 'ascensos' ? null : MODOS_CONSTRUIR.find((m) => m.id === modo)?.emoji
  return (
    <Panel h="construir" emoji="🏗️" etiqueta={t('herr.construir', 'Construir')}>
      {/* Toggle del menú de elementos: plegado deja solo las variantes del activo. */}
      {modoActual && (
        <button
          type="button"
          onClick={toggleModos}
          title={modosAbierto ? t('constructor.plegarModos', 'Ocultar los elementos') : t('constructor.verModos', 'Ver todos los elementos')}
          className="flex w-full items-center justify-center gap-1 rounded-md py-0.5 text-[10px] font-semibold text-white/75 transition hover:bg-white/10 hover:text-white"
        >
          {emojiModo ? <Icono emoji={emojiModo} /> : <Icono nombre="elevador" />}
          {modo === 'ascensos' ? t('constructor.modo.ascensos', 'Ascensos') : t(`constructor.modo.${modo}`, modoActual.labelEs)}
          <span className={`inline-block text-[8px] transition-transform ${modosAbierto ? 'rotate-180' : ''}`}>▾</span>
        </button>
      )}

      {modosAbierto && (
        <div className="grid grid-cols-4 gap-1">
          {MODOS_CONSTRUIR.map((m) => {
            // Fuera de la planta baja el hueco de Piso ext. es Ascensos (como el editor).
            const esAscensos = m.id === 'piso-ext' && nivel !== 0
            const id: ModoConstructor = esAscensos ? 'ascensos' : m.id
            const etiqueta = esAscensos
              ? t('constructor.modo.ascensos', 'Ascensos')
              : t(`constructor.modo.${m.id}`, m.labelEs)
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => cambiarModo(id)}
                title={etiqueta}
                className={`grid h-8 place-items-center rounded-md border text-base leading-none transition active:scale-90 ${
                  modo === id && (activo || id === 'ascensos')
                    ? 'border-accent/60 bg-accent/80'
                    : 'border-white/10 bg-white/10 hover:bg-white/20'
                }`}
              >
                {esAscensos ? <Icono nombre="elevador" /> : <Icono emoji={m.emoji} />}
              </button>
            )
          })}
        </div>
      )}

      {nivMax > nivMin && (
        <div className="flex w-full overflow-hidden rounded-lg border border-white/10 bg-white/5">
          {Array.from({ length: nivMax - nivMin + 1 }, (_, k) => nivMin + k).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => usePlanos.getState().setNivel(n)}
              title={t('planos.nivel', 'Nivel')}
              className={`h-7 flex-1 text-[10px] font-bold transition ${
                nivel === n
                  ? 'bg-accent text-accent-ink'
                  : n === nuevoNivel || n === nuevoSotano
                    ? 'text-sky-300 hover:bg-white/10'
                    : 'text-white/60 hover:bg-white/10'
              }`}
            >
              {n === nuevoNivel ? `+${n}` : n}
            </button>
          ))}
        </div>
      )}

      {/* Aviso del motor de planos (p. ej. "solo puedes construir sobre un cuarto de
          abajo"): en el editor completo lo muestra PlanoPanelProps; aquí no había panel
          equivalente y el atajo fallaba en silencio. */}
      {aviso && (
        <p className="rounded-lg border border-amber-400/35 bg-amber-400/10 px-2 py-1.5 text-[10px] leading-snug text-amber-400">
          {aviso}
        </p>
      )}

      {/* Variantes de forma/tipo del modo activo (formas, muros rectos/curvos,
          tipo de puerta, contenido de ventana). */}
      <VariantesConstruir />

      <button
        type="button"
        onClick={abrirEditor}
        className="h-8 w-full rounded-lg border border-white/10 bg-white/5 text-xs text-white/70 transition hover:bg-white/15 active:scale-95"
      >
        <Icono nombre="editar" /> {t('herr.abrirEditor', 'Abrir editor')}
      </button>
    </Panel>
  )
}

/** Panel de una herramienta equipada (botón one-shot, toggle o vehículo). */
/**
 * Panel de la herramienta "mover": agarrar/soltar un objeto o un cuarto
 * completo (ver `cargarStore`). Botón dinámico en el hueco del Cubo, mismo
 * patrón que vehículos/asiento genérico.
 */
function PanelMover({ suelto }: { suelto?: boolean }) {
  const t = useT()
  const cerca = useCargar((s) => s.cerca)
  const sujeto = useCargar((s) => s.sujeto)
  return (
    <Panel h="mover" emoji="✋" etiqueta={t('herr.mover', 'Mover')} sinCerrar={suelto} compacto={suelto}>
      {sujeto ? (
        <>
          {!suelto && (
            <p className="px-1 text-center text-xs text-white/70">
              {sujeto.tipo === 'cuarto'
                ? t('herr.moverCargandoCuarto', 'Cargando el cuarto')
                : t('herr.moverCargandoObjeto', 'Cargando el objeto')}
            </p>
          )}
          <button
            type="button"
            onClick={() => useCargar.getState().soltar()}
            className={suelto ? btnCortoVerde : btnVerde}
          >
            <span className={suelto ? 'text-lg leading-none' : 'text-2xl leading-none'}>
              <Icono emoji="✋" />
            </span>
            <span className="text-xs font-semibold">{t('herr.soltar', 'Soltar')}</span>
          </button>
        </>
      ) : cerca ? (
        <button
          type="button"
          onClick={() => useCargar.getState().agarrar()}
          className={suelto ? btnCortoClaro : btnClaro}
        >
          <span className={suelto ? 'text-lg leading-none' : 'text-2xl leading-none'}>
            <Icono emoji="✋" />
          </span>
          <span className="text-xs font-semibold">
            {cerca.tipo === 'cuarto' ? t('herr.agarrarCuarto', 'Agarrar cuarto') : t('herr.agarrar', 'Agarrar')}
          </span>
        </button>
      ) : (
        <p className="px-1 text-center text-[10px] leading-tight text-white/45">
          {t('herr.moverAcercate', 'Acércate a un objeto o cuarto')}
        </p>
      )}
    </Panel>
  )
}

function PanelHerramienta({
  h,
  montadoSuelto,
  cercaId,
}: {
  h: Herramienta
  montadoSuelto?: boolean
  /** Vehículo AL ALCANCE (sin montar): id de la instancia a subir con el botón dinámico. */
  cercaId?: number
}) {
  const t = useT()
  const correr = useHerramienta((s) => s.correr)
  const bailando = useHerramienta((s) => s.bailando)
  const cuerda = useHerramienta((s) => s.cuerda)
  const burbujas = useHerramienta((s) => s.burbujas)
  const avisoGrafiti = useGrafitis((s) => s.aviso)
  const montadoId = useMontura((s) => s.instanciaId)
  const accionInstanciaId = useAccionCuarto((s) => s.instanciaId)
  const nivel = useHouse((s) => s.playerLevel)
  const vista = useCam((s) => s.vista)
  const conMira = vista === 'tercera' || vista === 'primera'

  // Vehículo: un solo botón DINÁMICO en el hueco del cubo — "Subirte" mientras
  // está al alcance (sin montar) y, en cuanto lo montas, el mismo botón se
  // convierte en "Bajarte". Al alcance sin equipar, `cercaId` trae la instancia
  // exacta a montar (no "invocar" una nueva); equipado en la rueda, sí se
  // invoca por tipo (puede no haber ninguno cerca). El genérico no se invoca:
  // solo llega aquí ya montado (no vive en ningún catálogo fijo).
  if (esVehiculo(h) || h === 'generico') {
    const def = defDeMontura(h)
    const subirte = () => {
      if (cercaId != null) {
        const inst = useDiseño.getState().objetos.find((o) => o.id === cercaId)
        if (inst) useMontura.getState().montar(inst)
      } else if (h !== 'generico') {
        void invocarVehiculo(h)
      }
    }
    return (
      <Panel
        h={h}
        emoji={def.icono}
        etiqueta={t(`herr.veh.${def.tipo}`, def.nombre)}
        sinCerrar={montadoSuelto}
      >
        {montadoId != null ? (
          <button type="button" onClick={() => useMontura.getState().solicitarDesmontar()} className={btnVerde}>
            <span className="text-2xl leading-none"><Icono emoji={def.icono} /></span>
            <span className="text-xs font-semibold">{t('veh.bajarte', 'Bajarte')}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={subirte}
            disabled={cercaId == null && nivel > 0}
            title={
              cercaId == null && nivel > 0
                ? t('herr.soloPlantaBaja', 'Baja a la planta baja para invocarlo')
                : undefined
            }
            className={`${btnClaro} disabled:cursor-not-allowed disabled:opacity-40`}
          >
            <span className="text-2xl leading-none"><Icono emoji={def.icono} /></span>
            <span className="text-xs font-semibold">{t('veh.subirte', 'Subirte')}</span>
          </button>
        )}
      </Panel>
    )
  }

  // Sentado/acostado en un objeto genérico: mismo botón dinámico — "Sentarte"/
  // "Acostarte" al alcance, "Levantarte" en cuanto se activa.
  if (h === 'asiento-generico' || h === 'acostarse-generico') {
    const esAcostado = h === 'acostarse-generico'
    const activo = accionInstanciaId != null
    return (
      <Panel
        h={h}
        emoji={esAcostado ? '🛏️' : '🪑'}
        etiqueta={esAcostado ? t('accion.acostarse', 'Acostarse') : t('accion.sentarse', 'Sentarse')}
        sinCerrar={montadoSuelto}
      >
        {activo ? (
          <button type="button" onClick={() => useAccionCuarto.getState().pedirSalir()} className={btnVerde}>
            <span className="text-2xl leading-none"><Icono emoji="🧍" /></span>
            <span className="text-xs font-semibold">{t('accion.levantarte', 'Levantarte')}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => useAccionCuarto.getState().activarCercano()}
            className={btnClaro}
          >
            <span className="text-2xl leading-none"><Icono emoji={esAcostado ? '🛏️' : '🪑'} /></span>
            <span className="text-xs font-semibold">
              {esAcostado ? t('accion.acostarte', 'Acostarte') : t('accion.sentarte', 'Sentarte')}
            </span>
          </button>
        )}
      </Panel>
    )
  }

  if (h === 'construir') return <PanelConstruir />
  if (h === 'mover') return <PanelMover />

  const f = FICHAS[h]
  return (
    <Panel h={h} emoji={f.emoji} etiqueta={t(f.clave, f.fallback)}>
      {h === 'saltar' && (
        <button type="button" onClick={() => useHerramienta.getState().saltar()} className={btnClaro}>
          <span className="text-2xl leading-none"><Icono emoji={f.emoji} /></span>
          <span className="text-xs font-semibold">{t('herr.saltarBtn', '¡Saltar!')}</span>
        </button>
      )}
      {h === 'correr' && (
        <button
          type="button"
          onClick={() => useHerramienta.getState().setCorrer(!correr)}
          className={correr ? btnVerde : btnClaro}
        >
          <span className="text-2xl leading-none"><Icono emoji={f.emoji} /></span>
          <span className="text-xs font-semibold">
            {correr ? t('herr.corriendo', 'Corriendo') : t('herr.correr', 'Correr')}
          </span>
        </button>
      )}
      {h === 'bailar' && (
        <button
          type="button"
          onClick={() => useHerramienta.getState().setBailando(!bailando)}
          className={bailando ? btnVerde : btnClaro}
        >
          <span className="text-2xl leading-none"><Icono emoji={f.emoji} /></span>
          <span className="text-xs font-semibold">
            {bailando ? t('herr.bailando', 'Bailando') : t('herr.bailar', 'Bailar')}
          </span>
        </button>
      )}
      {h === 'cuerda' && (
        <button
          type="button"
          onClick={() => useHerramienta.getState().setCuerda(!cuerda)}
          className={cuerda ? btnVerde : btnClaro}
        >
          <span className="text-2xl leading-none"><Icono emoji={f.emoji} /></span>
          <span className="text-xs font-semibold">
            {cuerda ? t('herr.cuerdaOn', 'Saltando la cuerda') : t('herr.cuerda', 'Saltar la cuerda')}
          </span>
        </button>
      )}
      {h === 'mortal' && (
        <button type="button" onClick={() => useHerramienta.getState().mortal()} className={btnClaro}>
          <span className="text-2xl leading-none"><Icono emoji={f.emoji} /></span>
          <span className="text-xs font-semibold">{t('herr.mortalBtn', '¡Mortal!')}</span>
        </button>
      )}
      {h === 'saludar' && (
        <button type="button" onClick={() => useHerramienta.getState().saludar()} className={btnClaro}>
          <span className="text-2xl leading-none"><Icono emoji={f.emoji} /></span>
          <span className="text-xs font-semibold">{t('herr.saludarBtn', '¡Hola!')}</span>
        </button>
      )}
      {(h === 'laser' || h === 'pintura') &&
        // Con mira (3ª/1ª persona) se usan los controles de shooter: mantener
        // para disparar y apuntar. En iso no hay mira: queda el tiro simple.
        (conMira ? (
          <div className="flex justify-center py-0.5">
            <ControlesTiro />
          </div>
        ) : (
          <>
            <button type="button" onClick={() => useHerramienta.getState().disparar()} className={btnClaro}>
              <span className="text-2xl leading-none"><Icono emoji={f.emoji} /></span>
              <span className="text-xs font-semibold">{t('herr.disparar', 'Disparar')}</span>
            </button>
            <p className="px-1 text-center text-[10px] leading-tight text-white/45">
              {t('herr.miraEnPerspectiva', 'Cambia a 3ª o 1ª persona para apuntar con la mira')}
            </p>
          </>
        ))}
      {h === 'portales' && (
        <>
          <button
            type="button"
            onClick={() => useHerramienta.getState().colocarPortal()}
            disabled={nivel > 0}
            title={nivel > 0 ? t('herr.soloPlantaBaja', 'Baja a la planta baja para invocarlo') : undefined}
            className={`${btnClaro} disabled:cursor-not-allowed disabled:opacity-40`}
          >
            <span className="text-2xl leading-none"><Icono emoji={f.emoji} /></span>
            <span className="text-xs font-semibold">{t('herr.portalColocar', 'Colocar portal')}</span>
          </button>
          <button
            type="button"
            onClick={() => usePortales.getState().limpiar()}
            className="h-8 w-full rounded-lg border border-white/10 bg-white/5 text-xs text-white/70 transition hover:bg-white/15 active:scale-95"
          >
            {t('herr.portalQuitar', 'Quitar portales')}
          </button>
        </>
      )}
      {h === 'fuegos' && (
        <button
          type="button"
          onClick={() => lanzarCohete(playerPos.x, playerPos.y, playerPos.z)}
          className={btnClaro}
        >
          <span className="text-2xl leading-none"><Icono emoji={f.emoji} /></span>
          <span className="text-xs font-semibold">{t('herr.fuegosBtn', '¡Lanzar!')}</span>
        </button>
      )}
      {h === 'burbujas' && (
        <button
          type="button"
          onClick={() => useHerramienta.getState().setBurbujas(!burbujas)}
          className={burbujas ? btnVerde : btnClaro}
        >
          <span className="text-2xl leading-none"><Icono emoji={f.emoji} /></span>
          <span className="text-xs font-semibold">
            {burbujas ? t('herr.burbujasOn', 'Soplando burbujas') : t('herr.burbujas', 'Burbujas')}
          </span>
        </button>
      )}
      {h === 'grafiti' && (
        <>
          <button type="button" onClick={() => useHerramienta.getState().pintarGrafiti()} className={btnClaro}>
            <span className="text-2xl leading-none"><Icono emoji={f.emoji} /></span>
            <span className="text-xs font-semibold">{t('herr.grafitiPintar', 'Pintar pared')}</span>
          </button>
          {avisoGrafiti && (
            <div className="rounded px-1 text-center text-[10px] font-semibold text-amber-300">
              {avisoGrafiti === 'sinMuro'
                ? t('herr.grafitiSinMuro', 'Acércate a una pared')
                : avisoGrafiti === 'curvo'
                  ? t('herr.grafitiMuroCurvo', 'Los muros curvos no se pintan')
                  : t('herr.grafitiMuroPuerta', 'Los muros con puerta no se pintan')}
            </div>
          )}
        </>
      )}
    </Panel>
  )
}

/** Deporte de cada cancha para el botón «Jugar …» (el nombre de `CANCHAS` ya dice "Cancha de…"). */
const DEPORTE: Record<string, string> = {
  futbol: 'fútbol',
  tenis: 'tenis',
  basket: 'básquet',
  beisbol: 'béisbol',
}

/** Abre el editor con ESE objeto seleccionado (mismo combo que `ObjetosCatalogo`). */
function abrirEditorObjeto(id: number) {
  // En perspectiva el editor de mapa no existe: hay que pasar por el editor 3D
  // (mismo apaño que el panel de construir) o el panel saldría vacío.
  if (useCam.getState().vista !== 'iso') useEditorUi.getState().setEditor3d(true)
  useEditorUi.getState().setObjetoSel(id)
  useEditorUi.getState().setTab('objetos')
  useLayout.getState().setEditMode(true)
}

/** Ejecuta la acción contextual (lo que ofrece el objeto que tienes enfrente). */
function ejecutar(a: AccionContextual) {
  switch (a.tipo) {
    case 'interactuar':
      // Las dos cosas: se anima con más fuerza Y entra a su app, si tiene ambas.
      if (a.animado) pulsarAnimacion(a.id)
      if (a.plantillaId) abrirAppDeObjeto(a.id)
      break
    case 'letrero':
      abrirEditorObjeto(a.id)
      break
    case 'usable':
      if (a.usable) useAccionCuarto.getState().usar(a.id, a.wx ?? 0, a.wz ?? 0, a.rotY ?? 0, a.usable)
      break
    case 'juego': {
      const inst = useDiseño.getState().objetos.find((o) => o.id === a.id)
      if (inst) useParque.getState().usar(inst)
      break
    }
    case 'flotador': {
      const inst = useDiseño.getState().objetos.find((o) => o.id === a.id)
      if (inst) useFlotador.getState().sentarse(inst, a.wx ?? 0, a.wz ?? 0)
      break
    }
    case 'cosechar':
      void cosecharParcelaPorId(a.id)
      break
    case 'recoger':
      if (a.pistola) void recogerPistola(a.id, a.pistola)
      break
    case 'tren':
      useTren.getState().montar()
      break
    case 'cancha':
      // Abre la elección de modo (`MarcadorCancha`); el partido arranca ahí.
      if (a.clase) void useJuegoCancha.getState().activar(a.id, a.clase as ClaseCancha)
      break
    case 'carrera': {
      const c = useCarrera.getState().cerca
      if (c) void useCarrera.getState().ofrecer(c.vehiculo, c.modo)
      break
    }
    case 'alimentar':
      void alimentarCorral(a.id)
      break
    case 'acariciar':
      void mimarCorral(a.id)
      break
    case 'curar':
      void curarCorral(a.id)
      break
    case 'limpiar':
      void limpiarCorral(a.id)
      break
    case 'alimentarObjeto':
      void alimentarObjeto(a.id)
      break
    case 'acariciarObjeto':
      void mimarObjeto(a.id)
      break
    case 'nivel':
      if (a.subir) useHouse.getState().subirNivel()
      else useHouse.getState().bajarNivel()
      break
  }
}

/**
 * Botones de lo que el personaje tiene AL ALCANCE (`contextoStore`): reemplazan
 * a la vieja activación automática, que sentaba/subía/cosechaba con solo pasar
 * cerca. Van todos en un mismo marco para no gastar altura de más.
 */
function PanelContextual() {
  const t = useT()
  const acciones = useContexto((s) => s.acciones)
  const cuartos = useCuartos((s) => s.cuartos)
  if (acciones.length === 0) return null
  const texto = (
    a: AccionContextual,
  ): {
    etiqueta: string
    /** Línea chica encima de la etiqueta (el verbo, cuando la etiqueta es un nombre). */
    sub?: string
    icono:
      | 'apunta' | 'brillo' | 'cuartos' | 'editar' | 'mano' | 'riel' | 'montana-rusa'
      | 'alimentar' | 'mimar' | 'curar' | 'escoba' | 'subir' | 'bajar'
  } => {
    switch (a.tipo) {
      case 'interactuar': {
        if (!a.plantillaId) return { etiqueta: t('ctx.interactuar', 'Interactuar'), icono: 'brillo' }
        // Con el nombre del cuarto se distingue de un vistazo a qué app entras,
        // que es justo lo que un «Entrar a la app» no dice. Va en dos líneas: en
        // una sola, «Revisar tu Cocina» no cabe en los 128 px de la columna y se
        // cortaba precisamente por el nombre, que es lo que hay que leer.
        const nombre = cuartos.find((c) => c.id === a.roomId)?.nombre
        return nombre
          ? { etiqueta: nombre, sub: t('ctx.revisarTu', 'Revisar tu'), icono: 'cuartos' }
          : { etiqueta: t('ctx.entrarApp', 'Entrar a la app'), icono: 'cuartos' }
      }
      case 'letrero':
        return { etiqueta: t('ctx.cambiarLetrero', 'Cambiar letrero'), icono: 'editar' }
      case 'usable':
        return { etiqueta: t('ctx.usar', 'Usar'), icono: 'apunta' }
      case 'juego':
        return { etiqueta: t('ctx.subirte', 'Subirte'), icono: 'apunta' }
      case 'flotador':
        return { etiqueta: t('ctx.subirteDona', 'Subirte a la dona'), icono: 'apunta' }
      case 'cosechar':
        return { etiqueta: t('ctx.cosechar', 'Cosechar'), icono: 'mano' }
      case 'recoger':
        return { etiqueta: t('ctx.recoger', 'Recoger'), icono: 'mano' }
      case 'tren':
        return a.riel === 'coaster'
          ? { etiqueta: t('tren.montarCarrito', 'Montar el carrito'), icono: 'montana-rusa' }
          : { etiqueta: t('tren.montarTren', 'Montar el tren'), icono: 'riel' }
      case 'cancha':
        // El nombre de `CANCHAS` ya dice "Cancha de tenis": aquí solo el deporte.
        return { etiqueta: t(`ctx.jugar.${a.clase}`, `Jugar ${DEPORTE[a.clase ?? ''] ?? ''}`.trim()), icono: 'apunta' }
      case 'carrera':
        return { etiqueta: t('ctx.correr', 'Correr'), icono: 'apunta' }
      case 'alimentar':
        return { etiqueta: t('granja.burbuja.alimentar', 'Alimentar'), icono: 'alimentar' }
      case 'acariciar':
        return { etiqueta: t('granja.burbuja.acariciar', 'Acariciar'), icono: 'mimar' }
      case 'curar':
        return { etiqueta: t('granja.burbuja.curar', 'Curar'), icono: 'curar' }
      case 'limpiar':
        return { etiqueta: t('granja.burbuja.limpiar', 'Limpiar'), icono: 'escoba' }
      case 'alimentarObjeto':
        return { etiqueta: t('granja.burbuja.alimentar', 'Alimentar'), icono: 'alimentar' }
      case 'acariciarObjeto':
        return { etiqueta: t('granja.burbuja.acariciar', 'Acariciar'), icono: 'mimar' }
      case 'nivel':
        // En dos líneas por lo mismo que «Revisar tu …»: "Subir al nivel 1" entero
        // no cabe en la columna y se cortaría por el número, que es el dato.
        return {
          sub: a.subir ? t('ctx.subirA', 'Subir a') : t('ctx.bajarA', 'Bajar a'),
          etiqueta:
            a.nivelDestino === 0
              ? t('ctx.plantaBaja', 'Planta baja')
              : t('ctx.nivelN', 'Nivel {n}', { n: a.nivelDestino ?? 0 }),
          icono: a.subir ? 'subir' : 'bajar',
        }
    }
  }
  return (
    <div className="ui-hud ui-pop flex w-full flex-col gap-1 rounded-lg border border-white/10 p-2">
      {acciones.map((a) => {
        const { etiqueta, sub, icono } = texto(a)
        // Sin nada en la cesta no se puede alimentar: el botón se queda a la vista
        // (si no, no se entendería por qué falta) pero apagado y con el motivo.
        const sinComida = a.tipo === 'alimentar' && a.cantidad === 0
        return (
          <button
            key={a.tipo}
            type="button"
            disabled={sinComida}
            // Con la cesta vacía manda el motivo; si no, el texto completo (se trunca).
            title={
              sinComida
                ? t('granja.sinComida', 'No hay nada en la cesta: cosecha el huerto para alimentar.')
                : sub
                  ? `${sub} ${etiqueta}`
                  : etiqueta
            }
            onClick={() => ejecutar(a)}
            className={`${btnCortoClaro} px-1.5 disabled:cursor-not-allowed disabled:opacity-40`}
          >
            <span className="shrink-0 text-lg leading-none">
              <Icono nombre={icono} />
            </span>
            {/* El nombre del cuarto puede ser largo y la columna mide 128 px fijos. */}
            <span className="flex min-w-0 flex-col items-start leading-tight">
              {sub && <span className="text-[9px] font-medium text-white/55">{sub}</span>}
              <span className="w-full truncate text-xs font-semibold">{etiqueta}</span>
            </span>
            {a.cantidad != null && a.tipo !== 'acariciar' && (
              <span className="shrink-0 text-xs font-normal text-white/60">({a.cantidad})</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Botón para dejar lo que se está usando cuando no hay panel propio que lo haga:
 * los 5 usables de plantilla, los juegos del parque y la dona. Antes solo se
 * salía caminando, que sigue funcionando pero no se ve por ningún lado.
 */
function PanelSalida() {
  const t = useT()
  const accionTipo = useAccionCuarto((s) => s.tipo)
  const accionId = useAccionCuarto((s) => s.instanciaId)
  const parqueTipo = useParque((s) => s.tipo)
  const flotadorId = useFlotador((s) => s.instanciaId)
  const trenMontado = useTren((s) => s.montado)
  // Los genéricos ya tienen su propio "Levantarte" en `PanelHerramienta`.
  const enUsable =
    accionId != null && accionTipo !== 'asiento-generico' && accionTipo !== 'acostarse-generico'
  // Resbaladilla y pasamanos son de una pasada y terminan solas: no hay de qué bajarse.
  const enJuego = parqueTipo === 'carrusel' || parqueTipo === 'columpio'
  if (!enUsable && !enJuego && !trenMontado && flotadorId == null) return null
  const salir = () => {
    // Usables y carrusel/columpio los baja `Character`, que reposiciona al
    // personaje en un punto libre: forzar el store aquí lo dejaría dentro.
    if (enUsable) useAccionCuarto.getState().pedirSalir()
    else if (enJuego) parqueFrame.salirPendiente = true
    else if (trenMontado) useTren.getState().bajar()
    else useFlotador.getState().salirForzado()
  }
  return (
    <div className="ui-hud ui-pop flex w-full flex-col gap-1 rounded-lg border border-white/10 p-2">
      <button type="button" onClick={salir} className={btnCortoVerde}>
        <span className="text-lg leading-none">
          <Icono emoji="🧍" />
        </span>
        <span className="text-xs font-semibold">
          {enUsable ? t('accion.levantarte', 'Levantarte') : t('ctx.bajarte', 'Bajarte')}
        </span>
      </button>
    </div>
  )
}

/**
 * Pila de controles del hueco del cubo de vistas (ver `NavControls`): las
 * herramientas equipadas (máx 3, cada una con su ✕) más los botones que aparecen
 * solos por proximidad — lo que tienes al alcance, mover, y subirse/bajarse.
 */
export function ControlHerramienta() {
  const equipadas = useHerramienta((s) => s.equipadas)
  // Vehículo: el hueco del cubo lo ocupa tanto MONTADO (botón "Bajarte") como
  // simplemente AL ALCANCE sin montar (botón "Subirte" de la instancia exacta)
  // — ninguno de los 2 depende de la hotbar, es la única forma de subir/bajar.
  const montadoId = useMontura((s) => s.instanciaId)
  const montadoTipo = useMontura((s) => s.tipo)
  const cercaVehId = useMontura((s) => s.cercaId)
  const cercaVehTipo = useMontura((s) => s.cercaTipo)
  const vehSuelto = montadoId != null ? montadoTipo : cercaVehTipo
  const vehSueltoEnHotbar = vehSuelto != null && equipadas.includes(vehSuelto)
  // Sentado/acostado (grupo genérico): mismo patrón — AL ALCANCE (botón
  // "Sentarte/Acostarte") o ya ACTIVO (botón "Levantarte"), sin depender de la hotbar.
  const accionTipo = useAccionCuarto((s) => s.tipo)
  const accionCercaGrupo = useAccionCuarto((s) => s.cercaGrupo)
  const accionActivoTipo =
    accionTipo === 'asiento-generico' || accionTipo === 'acostarse-generico' ? accionTipo : null
  const accionSuelto =
    accionActivoTipo ?? (accionCercaGrupo === 'acostarse' ? 'acostarse-generico' : accionCercaGrupo === 'asiento' ? 'asiento-generico' : null)
  const accionSueltoEnHotbar = accionSuelto != null && equipadas.includes(accionSuelto)
  // Yendo montado, sentado o jugando solo debe quedar el botón para bajarse: ni
  // "Mover" ni las acciones de lo que tengas al lado (el detector ya las apaga,
  // pero el panel de la hotbar seguiría diciendo "acércate a un objeto").
  const accionId = useAccionCuarto((s) => s.instanciaId)
  const parqueId = useParque((s) => s.instanciaId)
  const flotadorId = useFlotador((s) => s.instanciaId)
  const trenMontado = useTren((s) => s.montado)
  const ocupado =
    montadoId != null || accionId != null || parqueId != null || flotadorId != null || trenMontado
  const hayContextual = useContexto((s) => s.acciones.length > 0)
  const cargando = useCargar((s) => s.sujeto != null)
  const cercaCarga = useCargar((s) => s.cerca != null)
  const moverSuelto = !ocupado && (cercaCarga || cargando) && !equipadas.includes('mover')
  if (equipadas.length === 0 && !vehSuelto && !accionSuelto && !hayContextual && !moverSuelto && !ocupado)
    return null
  return (
    // Tope de altura por si se juntan varios: la columna del cubo crece hacia
    // arriba y en un teléfono en horizontal se saldría de la pantalla.
    <div
      className="flex w-full flex-col gap-1 overflow-y-auto"
      style={{ maxHeight: 'min(52vh, 26rem)' }}
    >
      {!ocupado && <PanelContextual />}
      {moverSuelto && <PanelMover suelto />}
      <PanelSalida />
      {vehSuelto && !vehSueltoEnHotbar && (
        <PanelHerramienta h={vehSuelto} montadoSuelto cercaId={montadoId == null ? (cercaVehId ?? undefined) : undefined} />
      )}
      {accionSuelto && !accionSueltoEnHotbar && <PanelHerramienta h={accionSuelto} montadoSuelto />}
      {equipadas.map((h) => (h === 'mover' && ocupado ? null : <PanelHerramienta key={h} h={h} />))}
    </div>
  )
}
