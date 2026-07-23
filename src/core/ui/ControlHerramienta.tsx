import { useEffect, useState } from 'react'
import { useDiseño, esObjetoMapa } from '../state/disenoStore'
import { useHouse } from '../state/houseStore'
import { useMontura } from '../state/monturaStore'
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
import { LosetaFormaSvg } from './planos/LosetaFormaSvg'
import { esVehiculo, vehiculoDe, type TipoVehiculo } from '../house/vehiculos'
import { puntoLibreCerca } from '../house/Character'
import { usePortales } from '../house/portales'
import { lanzarCohete } from '../house/fuegos'
import { useGrafitis } from '../state/grafitiStore'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'

const FICHAS = {
  saltar: { emoji: '🦘', clave: 'herr.saltar', fallback: 'Saltar' },
  correr: { emoji: '🏃', clave: 'herr.correr', fallback: 'Correr' },
  bailar: { emoji: '💃', clave: 'herr.bailar', fallback: 'Bailar' },
  cuerda: { emoji: '🪢', clave: 'herr.cuerda', fallback: 'Saltar la cuerda' },
  mortal: { emoji: '🤸', clave: 'herr.mortal', fallback: 'Mortal' },
  saludar: { emoji: '👋', clave: 'herr.saludar', fallback: 'Saludar' },
  laser: { emoji: '🔫', clave: 'herr.laser', fallback: 'Láser' },
  portales: { emoji: '🌀', clave: 'herr.portales', fallback: 'Portales' },
  fuegos: { emoji: '🎆', clave: 'herr.fuegos', fallback: 'Fuegos' },
  burbujas: { emoji: '🫧', clave: 'herr.burbujas', fallback: 'Burbujas' },
  grafiti: { emoji: '🎨', clave: 'herr.grafiti', fallback: 'Grafiti' },
} as const

/** Trae la instancia del mapa de ese tipo al jugador (o la crea) y la monta. */
async function invocar(tipo: TipoVehiculo) {
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

/** Marco de un panel: encabezado con la herramienta y ✕ para desequiparla. */
function Panel({ h, emoji, etiqueta, children }: { h: Herramienta; emoji: string; etiqueta: string; children: React.ReactNode }) {
  const t = useT()
  const equipar = useHerramienta((s) => s.equipar)
  return (
    <div className="ui-hud ui-pop flex w-full flex-col gap-1 rounded-lg border border-white/10 p-2">
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-white/50">
        <span>
          <Icono emoji={emoji} /> {etiqueta}
        </span>
        <button
          type="button"
          onClick={() => equipar(h)}
          title={t('herr.quitar', 'Quitar herramienta')}
          className="rounded px-1 text-white/60 transition hover:bg-white/10 hover:text-white active:scale-95"
        >
          <Icono nombre="cerrar" />
        </button>
      </div>
      {children}
    </div>
  )
}

const btn = 'flex h-14 w-full flex-col items-center justify-center gap-0.5 rounded-lg border transition active:scale-90'
const btnClaro = `${btn} border-white/10 bg-white/10 text-white hover:bg-white/20`
const btnVerde = `${btn} border-accent/60 bg-accent text-accent-ink`

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
function PanelHerramienta({ h }: { h: Herramienta }) {
  const t = useT()
  const correr = useHerramienta((s) => s.correr)
  const bailando = useHerramienta((s) => s.bailando)
  const cuerda = useHerramienta((s) => s.cuerda)
  const burbujas = useHerramienta((s) => s.burbujas)
  const avisoGrafiti = useGrafitis((s) => s.aviso)
  const montadoId = useMontura((s) => s.instanciaId)
  const nivel = useHouse((s) => s.playerLevel)

  if (esVehiculo(h)) {
    const def = vehiculoDe(h)
    return (
      <Panel h={h} emoji={def.icono} etiqueta={t(`herr.veh.${def.tipo}`, def.nombre)}>
        {montadoId != null ? (
          <button type="button" onClick={() => useMontura.getState().solicitarDesmontar()} className={btnVerde}>
            <span className="text-2xl leading-none"><Icono emoji={def.icono} /></span>
            <span className="text-xs font-semibold">{t('veh.bajarte', 'Bajarte')}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void invocar(h)}
            disabled={nivel > 0}
            title={nivel > 0 ? t('herr.soloPlantaBaja', 'Baja a la planta baja para invocarlo') : undefined}
            className={`${btnClaro} disabled:cursor-not-allowed disabled:opacity-40`}
          >
            <span className="text-2xl leading-none"><Icono emoji={def.icono} /></span>
            <span className="text-xs font-semibold">{t('herr.invocar', 'Invocar')}</span>
          </button>
        )}
      </Panel>
    )
  }

  if (h === 'construir') return <PanelConstruir />

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
      {h === 'laser' && (
        <button type="button" onClick={() => useHerramienta.getState().disparar()} className={btnClaro}>
          <span className="text-2xl leading-none"><Icono emoji={f.emoji} /></span>
          <span className="text-xs font-semibold">{t('herr.disparar', 'Disparar')}</span>
        </button>
      )}
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

/**
 * Pila de controles de las herramientas equipadas (máx 3): ocupa el hueco del
 * cubo de vistas en `NavControls`. Cada panel tiene su ✕ para desequipar.
 */
export function ControlHerramienta() {
  const equipadas = useHerramienta((s) => s.equipadas)
  if (equipadas.length === 0) return null
  return (
    <div className="flex w-full flex-col gap-1">
      {equipadas.map((h) => (
        <PanelHerramienta key={h} h={h} />
      ))}
    </div>
  )
}
