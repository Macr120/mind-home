import { useEffect, useRef } from 'react'
import { COLOR_FORMA, type MascotaId, type Pieza3D } from '../../chat/mascotas'
import { useEditorUi } from '../../state/editorUiStore'
import { ColorPicker } from './ColorPicker'
import { useT } from '../../i18n/useT'
import { Icono } from '../iconos/Icono'

/**
 * Editor manual de geometría básica 3D: construye un modelo como lista de
 * piezas primitivas (caja/esfera/cono/cilindro) editables en posición, tamaño,
 * rotación y color. Es el mismo formato `Pieza3D` que genera la IA, así que el
 * resultado se renderiza con `ModeloPiezas` en previews, miniaturas y el mapa.
 * Lo comparten la pestaña Objetos (ObjetoCuarto.piezas) y la pestaña
 * Personajes (avatar.modelo3d / asistente.modelo3d).
 */

const COLOR_PIEZA_DEFAULT = '#60a5fa'

const TIPOS: { tipo: Pieza3D['tipo']; emoji: string }[] = [
  { tipo: 'caja', emoji: '⬛' },
  { tipo: 'esfera', emoji: '⚪' },
  { tipo: 'cono', emoji: '🔺' },
  { tipo: 'cilindro', emoji: '🛢️' },
  { tipo: 'plano', emoji: '⬜' },
]

/** Pieza nueva de cada tipo, apoyada sobre el suelo en el origen. */
function piezaNueva(tipo: Pieza3D['tipo'], color = COLOR_PIEZA_DEFAULT): Pieza3D {
  switch (tipo) {
    case 'caja':
      return { tipo, pos: [0, 0.25, 0], tam: [0.5, 0.5, 0.5], color }
    case 'esfera':
      return { tipo, pos: [0, 0.25, 0], tam: [0.25], color }
    case 'cono':
      return { tipo, pos: [0, 0.25, 0], tam: [0.25, 0.5], color }
    case 'cilindro':
      return { tipo, pos: [0, 0.25, 0], tam: [0.2, 0.2, 0.5], color }
    case 'plano':
      // Vertical (como pared/cartel); se orienta con la rotación.
      return { tipo, pos: [0, 0.25, 0], tam: [0.5, 0.5], color }
  }
}

/** Forma inicial de un objeto nuevo (o convertido): una caja. */
export function plantillaObjetoPiezas(color = '#f59e0b'): Pieza3D[] {
  return [piezaNueva('caja', color)]
}

/** Réplica en piezas del cuerpo base del avatar (mismas medidas y colores que sus cubos). */
export function piezasDesdeAvatar(av: { cabeza: string; torso: string; piernas: string }): Pieza3D[] {
  return [
    { tipo: 'caja', pos: [-0.14, 0.3, 0], tam: [0.24, 0.6, 0.26], color: av.piernas },
    { tipo: 'caja', pos: [0.14, 0.3, 0], tam: [0.24, 0.6, 0.26], color: av.piernas },
    { tipo: 'caja', pos: [0, 0.92, 0], tam: [0.6, 0.62, 0.3], color: av.torso },
    { tipo: 'caja', pos: [-0.42, 0.92, 0], tam: [0.2, 0.6, 0.26], color: av.torso },
    { tipo: 'caja', pos: [0.42, 0.92, 0], tam: [0.2, 0.6, 0.26], color: av.torso },
    { tipo: 'caja', pos: [0, 1.5, 0], tam: [0.44, 0.44, 0.44], color: av.cabeza },
  ]
}

const PIEL = '#f2c79a'
const OJO = '#111111'

/** Ojitos al frente (mismo par que usan las formas integradas). */
function ojos(y: number, z: number): Pieza3D[] {
  return [
    { tipo: 'esfera', pos: [-0.09, y, z], tam: [0.045], color: OJO },
    { tipo: 'esfera', pos: [0.09, y, z], tam: [0.045], color: OJO },
  ]
}

/**
 * Réplica en piezas de las formas integradas de los asistentes (mago/gato/perro/
 * búho/robot), con las mismas medidas y posiciones que `ModeloMascota`
 * (Asistente3D.tsx) y respetando el color personalizado. El brazo articulado se
 * replica en reposo; los brillos (orbe, visor) quedan como color plano.
 */
export function piezasDesdeForma(forma: MascotaId, color?: string): Pieza3D[] {
  const c = color || COLOR_FORMA[forma]
  switch (forma) {
    case 'gato':
      return [
        { tipo: 'caja', pos: [0, 0.55, 0], tam: [0.5, 0.62, 0.42], color: c },
        { tipo: 'caja', pos: [0, 1.08, 0.02], tam: [0.46, 0.42, 0.4], color: c },
        { tipo: 'cono', pos: [-0.16, 1.36, 0], tam: [0.1, 0.2], color: c },
        { tipo: 'cono', pos: [0.16, 1.36, 0], tam: [0.1, 0.2], color: c },
        { tipo: 'caja', pos: [0, 0.7, -0.3], tam: [0.1, 0.5, 0.1], color: c, rot: [0.6, 0, 0] },
        ...ojos(1.08, 0.21),
        { tipo: 'caja', pos: [-0.28, 0.36, 0.1], tam: [0.14, 0.4, 0.14], color: c },
        { tipo: 'caja', pos: [0.28, 0.4, 0.1], tam: [0.14, 0.44, 0.14], color: c },
      ]
    case 'perro':
      return [
        { tipo: 'caja', pos: [0, 0.55, 0], tam: [0.54, 0.62, 0.46], color: c },
        { tipo: 'caja', pos: [0, 1.06, 0.04], tam: [0.48, 0.44, 0.44], color: c },
        { tipo: 'caja', pos: [0, 0.98, 0.3], tam: [0.22, 0.2, 0.18], color: '#8a5e34' },
        { tipo: 'caja', pos: [-0.26, 1.18, 0.02], tam: [0.1, 0.32, 0.16], color: '#8a5e34' },
        { tipo: 'caja', pos: [0.26, 1.18, 0.02], tam: [0.1, 0.32, 0.16], color: '#8a5e34' },
        ...ojos(1.12, 0.23),
        { tipo: 'caja', pos: [-0.28, 0.36, 0.1], tam: [0.15, 0.4, 0.15], color: c },
        { tipo: 'caja', pos: [0.28, 0.4, 0.1], tam: [0.14, 0.44, 0.14], color: c },
      ]
    case 'buho':
      return [
        { tipo: 'esfera', pos: [0, 0.7, 0], tam: [0.42], color: c },
        { tipo: 'esfera', pos: [-0.16, 0.92, 0.34], tam: [0.14], color: '#fdfdf5' },
        { tipo: 'esfera', pos: [0.16, 0.92, 0.34], tam: [0.14], color: '#fdfdf5' },
        { tipo: 'esfera', pos: [-0.16, 0.92, 0.45], tam: [0.06], color: OJO },
        { tipo: 'esfera', pos: [0.16, 0.92, 0.45], tam: [0.06], color: OJO },
        { tipo: 'cono', pos: [0, 0.78, 0.42], tam: [0.07, 0.18], color: '#e0a73a', rot: [Math.PI, 0, 0] },
        { tipo: 'caja', pos: [-0.42, 0.7, 0], tam: [0.12, 0.5, 0.3], color: '#6b4f38', rot: [0, 0, 0.2] },
        { tipo: 'caja', pos: [0.42, 0.63, 0], tam: [0.14, 0.44, 0.14], color: '#6b4f38' },
      ]
    case 'robot':
      return [
        { tipo: 'caja', pos: [0, 0.55, 0], tam: [0.5, 0.6, 0.36], color: c },
        { tipo: 'caja', pos: [0, 1.05, 0], tam: [0.44, 0.4, 0.36], color: c },
        { tipo: 'cilindro', pos: [0, 1.34, 0], tam: [0.02, 0.02, 0.16], color: '#5a6b7a' },
        { tipo: 'esfera', pos: [0, 1.46, 0], tam: [0.05], color: '#ff5d5d' },
        { tipo: 'caja', pos: [0, 1.06, 0.19], tam: [0.3, 0.12, 0.02], color: '#39bfff' },
        { tipo: 'caja', pos: [-0.34, 0.7, 0], tam: [0.13, 0.44, 0.13], color: c },
        { tipo: 'caja', pos: [0.32, 0.63, 0], tam: [0.14, 0.44, 0.14], color: c },
      ]
    default: // mago
      return [
        { tipo: 'cono', pos: [0, 0.5, 0], tam: [0.46, 1.0], color: c },
        { tipo: 'esfera', pos: [0, 1.12, 0], tam: [0.24], color: PIEL },
        { tipo: 'cono', pos: [0, 0.92, 0.12], tam: [0.16, 0.34], color: '#e8e8ee' },
        { tipo: 'cilindro', pos: [0, 1.3, 0], tam: [0.36, 0.36, 0.05], color: c },
        { tipo: 'cono', pos: [0, 1.62, 0], tam: [0.26, 0.7], color: c },
        ...ojos(1.14, 0.2),
        { tipo: 'caja', pos: [-0.32, 0.7, 0], tam: [0.14, 0.44, 0.14], color: c },
        { tipo: 'caja', pos: [0.32, 0.7, 0], tam: [0.14, 0.44, 0.14], color: c },
        { tipo: 'esfera', pos: [0.32, 0.46, 0], tam: [0.12], color: '#7ee0ff' },
      ]
  }
}

/** Forma inicial de un personaje nuevo: muñeco básico (piernas, torso, brazos, cabeza). */
export function plantillaPersonajePiezas(): Pieza3D[] {
  return [
    { tipo: 'caja', pos: [-0.13, 0.3, 0], tam: [0.22, 0.6, 0.24], color: '#2f5fd0' },
    { tipo: 'caja', pos: [0.13, 0.3, 0], tam: [0.22, 0.6, 0.24], color: '#2f5fd0' },
    { tipo: 'caja', pos: [0, 0.9, 0], tam: [0.56, 0.6, 0.3], color: '#e23b3b' },
    { tipo: 'caja', pos: [-0.4, 0.9, 0], tam: [0.18, 0.55, 0.24], color: '#e23b3b' },
    { tipo: 'caja', pos: [0.4, 0.9, 0], tam: [0.18, 0.55, 0.24], color: '#e23b3b' },
    { tipo: 'esfera', pos: [0, 1.48, 0], tam: [0.27], color: '#ffd23b' },
  ]
}

const aGrados = (rad: number) => Math.round((rad * 180) / Math.PI)
const aRadianes = (grados: number) => (grados * Math.PI) / 180

export function EditorPiezas({
  piezas,
  onChange,
  onRestaurar,
}: {
  piezas: Pieza3D[]
  /** Cada cambio entrega la lista completa (edición en vivo). */
  onChange: (piezas: Pieza3D[]) => void
  /** Regresa el modelo a sus ajustes predeterminados (botón al final). */
  onRestaurar?: () => void
}) {
  const t = useT()
  // Selección compartida con el preview 3D (se puede elegir la pieza tocándola).
  const sel = useEditorUi((s) => s.piezaSel)
  const setSel = useEditorUi((s) => s.setPiezaSel)
  const iSel = piezas.length ? Math.min(sel, piezas.length - 1) : -1
  const pieza = iSel >= 0 ? piezas[iSel] : null

  const nombreTipo = (tipo: Pieza3D['tipo']) =>
    t(
      `editor.piezas.tipo.${tipo}`,
      { caja: 'Caja', esfera: 'Esfera', cono: 'Cono', cilindro: 'Cilindro', plano: 'Plano' }[tipo],
    )

  const setPieza = (patch: Partial<Pieza3D>) =>
    onChange(piezas.map((p, i) => (i === iSel ? { ...p, ...patch } : p)))

  const agregar = (tipo: Pieza3D['tipo']) => {
    onChange([...piezas, piezaNueva(tipo)])
    setSel(piezas.length)
  }

  const duplicar = () => {
    if (!pieza) return
    const copia: Pieza3D = {
      ...pieza,
      pos: [pieza.pos[0] + 0.3, pieza.pos[1], pieza.pos[2]],
      tam: [...pieza.tam],
      rot: pieza.rot ? ([...pieza.rot] as [number, number, number]) : undefined,
    }
    onChange([...piezas, copia])
    setSel(piezas.length)
  }

  const eliminar = () => {
    if (piezas.length <= 1) return
    onChange(piezas.filter((_, i) => i !== iSel))
    setSel(Math.max(0, iSel - 1))
  }

  return (
    <div className="space-y-3">
      {/* 1) Forma 3D de la pieza seleccionada (conserva posición y color) */}
      {pieza && (
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            {t('editor.piezas.forma', 'Forma 3D')}
          </p>
          <div className="flex overflow-hidden rounded-lg border border-white/10">
            {TIPOS.map(({ tipo, emoji }) => (
              <button
                key={tipo}
                type="button"
                onClick={() => tipo !== pieza.tipo && setPieza({ tipo, tam: piezaNueva(tipo).tam })}
                title={nombreTipo(tipo)}
                className={`h-9 flex-1 text-base transition ${
                  pieza.tipo === tipo ? 'bg-emerald-500/20 ring-1 ring-inset ring-emerald-400/50' : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <Icono emoji={emoji} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 2) Añadir pieza */}
      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
          {t('editor.piezas.agregar', 'Añadir pieza')}
        </p>
        <div className="flex gap-1.5">
          {TIPOS.map(({ tipo, emoji }) => (
            <button
              key={tipo}
              type="button"
              onClick={() => agregar(tipo)}
              title={nombreTipo(tipo)}
              className="flex h-9 flex-1 items-center justify-center gap-1 rounded-lg bg-white/5 text-[11px] font-semibold text-white/70 transition hover:bg-white/15"
            >
              <span className="text-sm leading-none"><Icono emoji={emoji} /></span>+
            </button>
          ))}
        </div>
      </div>

      {/* 3) Duplicar y 4) borrar la pieza seleccionada */}
      {pieza && (
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={duplicar}
            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/5 text-[11px] font-semibold text-white/70 transition hover:bg-white/15"
          >
            <Icono nombre="duplicar" /> {t('editor.piezas.duplicar', 'Duplicar pieza')}
          </button>
          <button
            type="button"
            onClick={eliminar}
            disabled={piezas.length <= 1}
            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/5 text-[11px] font-semibold text-white/70 transition hover:bg-red-600 hover:texto-cta disabled:opacity-30"
          >
            <Icono nombre="basura" /> {t('editor.piezas.borrar', 'Borrar pieza')}
          </button>
        </div>
      )}

      {/* 5) Color de la pieza seleccionada */}
      {pieza && (
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            {t('editor.piezas.color', 'Color de la pieza')}
          </p>
          <ColorPicker value={pieza.color} onChange={(c) => setPieza({ color: c })} />
        </div>
      )}

      {/* 6) Regresar a los ajustes predeterminados */}
      {onRestaurar && (
        <button
          type="button"
          onClick={onRestaurar}
          className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 text-[11px] font-semibold text-white/55 transition hover:bg-white/15 hover:text-white/85"
        >
          <Icono nombre="restaurar" /> {t('editor.piezas.restaurar', 'Regresar a los ajustes predeterminados')}
        </button>
      )}
    </div>
  )
}

// ---------- Controles rápidos sobre el visualizador 3D ----------

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/** Botón compacto del overlay (translúcido, flotando sobre el canvas). */
export function BotonOverlay({
  children,
  title,
  onClick,
  ancho = 'w-7',
  activo = false,
}: {
  children: React.ReactNode
  title: string
  onClick: () => void
  ancho?: string
  activo?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`pointer-events-auto grid h-7 ${ancho} place-items-center rounded-md text-xs leading-none backdrop-blur-sm transition hover:bg-emerald-600 hover:texto-cta ${
        activo ? 'bg-emerald-600 texto-cta ring-1 ring-emerald-400/60' : 'ui-hud text-white/80'
      }`}
    >
      {children}
    </button>
  )
}

/** Título pequeño bajo cada grupo de controles del overlay. */
function TituloOverlay({ children }: { children: React.ReactNode }) {
  return (
    <span className="ui-hud rounded px-1 text-[8px] font-semibold uppercase tracking-wider text-white/55">
      {children}
    </span>
  )
}

/**
 * Engrane suelto para modelos que aún NO son de piezas (cuerpo base del avatar,
 * formas integradas de asistentes, objetos del catálogo): al pulsarlo, el dueño
 * convierte el modelo a piezas (`onActivar`) y los controles quedan abiertos.
 */
export function EngraneActivarPiezas({ onActivar }: { onActivar: () => void }) {
  const t = useT()
  const setAbierto = useEditorUi((s) => s.setPiezasControles)
  return (
    <div className="pointer-events-none absolute inset-0 p-1.5">
      <div className="absolute right-1.5 top-1.5">
        <BotonOverlay
          title={t('editor.piezas.activar', 'Editar con piezas 3D')}
          onClick={() => {
            onActivar()
            setAbierto(true)
          }}
        >
          <Icono nombre="ajustes" />
        </BotonOverlay>
      </div>
    </div>
  )
}

/**
 * Herramientas rápidas de la pieza seleccionada, superpuestas por cuadrantes en
 * el visualizador 3D: pieza activa (arriba-izq, tocar = siguiente), rotación
 * (arriba-der), posición (abajo-izq) y tamaño (abajo-der). Un engrane ⚙️ fijo en
 * la esquina superior derecha abre y cierra los controles (estado en el store,
 * que también apaga la selección táctil en el preview cuando están cerrados).
 */
export function ControlesPiezasOverlay({
  piezas,
  onChange,
}: {
  piezas: Pieza3D[]
  onChange: (piezas: Pieza3D[]) => void
}) {
  const t = useT()
  const sel = useEditorUi((s) => s.piezaSel)
  const setSel = useEditorUi((s) => s.setPiezaSel)
  const abierto = useEditorUi((s) => s.piezasControles)
  const setAbierto = useEditorUi((s) => s.setPiezasControles)
  // Los taps rápidos llegan antes del re-render (React los agrupa): se acumula
  // sobre un ref con la lista más reciente para no perder pasos intermedios.
  const ultimas = useRef(piezas)
  useEffect(() => {
    ultimas.current = piezas
  }, [piezas])
  const iSel = piezas.length ? Math.min(sel, piezas.length - 1) : -1
  const pieza = iSel >= 0 ? piezas[iSel] : null
  if (!pieza) return null

  const setPieza = (patch: Partial<Pieza3D> | ((p: Pieza3D) => Partial<Pieza3D>)) => {
    const next = ultimas.current.map((p, i) =>
      i === iSel ? { ...p, ...(typeof patch === 'function' ? patch(p) : patch) } : p,
    )
    ultimas.current = next
    onChange(next)
  }

  const mover = (eje: 0 | 1 | 2, d: number) =>
    setPieza((p) => {
      const pos = [...p.pos] as [number, number, number]
      const lim: [number, number] = eje === 1 ? [0, 3] : [-2, 2]
      pos[eje] = clamp(+(pos[eje] + d).toFixed(2), lim[0], lim[1])
      return { pos }
    })

  const escalar = (factor: number) =>
    setPieza((p) => ({ tam: p.tam.map((v) => clamp(+(v * factor).toFixed(3), 0.05, 2.5)) }))

  const rotarY = (dGrados: number) =>
    setPieza((p) => {
      const rot = [...(p.rot ?? [0, 0, 0])] as [number, number, number]
      let g = aGrados(rot[1]) + dGrados
      if (g > 180) g -= 360
      if (g < -180) g += 360
      rot[1] = aRadianes(g)
      return { rot }
    })

  return (
    <div className="pointer-events-none absolute inset-0 p-1.5">
      {/* Esquina sup-der: rotación (si está abierto) + engrane que abre/cierra los controles */}
      <div className="absolute right-1.5 top-1.5 flex items-start gap-1.5">
        {abierto && (
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex gap-0.5">
              <BotonOverlay title={t('editor.piezas.rotIzq', 'Girar a la izquierda')} onClick={() => rotarY(-15)}>
                ⟲
              </BotonOverlay>
              <BotonOverlay title={t('editor.piezas.rotDer', 'Girar a la derecha')} onClick={() => rotarY(15)}>
                ⟳
              </BotonOverlay>
            </div>
            <TituloOverlay>{t('editor.piezas.rotacion', 'Rotación')}</TituloOverlay>
          </div>
        )}
        <BotonOverlay
          title={
            abierto
              ? t('editor.piezas.cerrarControles', 'Cerrar los controles de edición')
              : t('editor.piezas.abrirControles', 'Editar las piezas (abrir controles)')
          }
          onClick={() => setAbierto(!abierto)}
          activo={abierto}
        >
          <Icono nombre="ajustes" />
        </BotonOverlay>
      </div>

      {abierto ? (
        <>
          {/* Arriba-izq: pieza activa (tocar = siguiente pieza) */}
          <div className="absolute left-1.5 top-1.5">
            <button
              type="button"
              onClick={() => setSel((iSel + 1) % piezas.length)}
              title={t('editor.piezas.siguiente', 'Siguiente pieza')}
              className="ui-hud pointer-events-auto flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-semibold text-white/85 transition hover:bg-emerald-500/40"
            >
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: pieza.color }} />
              <Icono emoji={TIPOS.find((x) => x.tipo === pieza.tipo)?.emoji ?? '⬛'} /> {iSel + 1}/{piezas.length}
            </button>
          </div>

          {/* Abajo-izq: posición — diagonales isométricas (X/Z) con subir/bajar (Y) al centro */}
          <div className="absolute bottom-1.5 left-1.5 flex flex-col items-center gap-0.5">
            <div className="grid grid-cols-3 gap-0.5">
              <BotonOverlay title={t('editor.piezas.izq', 'Izquierda (X−)')} onClick={() => mover(0, -0.1)}>↖</BotonOverlay>
              <BotonOverlay title={t('editor.piezas.subir', 'Subir (Y+)')} onClick={() => mover(1, 0.1)}>▲</BotonOverlay>
              <BotonOverlay title={t('editor.piezas.atras', 'Atrás (Z−)')} onClick={() => mover(2, -0.1)}>↗</BotonOverlay>
              <BotonOverlay title={t('editor.piezas.frente', 'Al frente (Z+)')} onClick={() => mover(2, 0.1)}>↙</BotonOverlay>
              <BotonOverlay title={t('editor.piezas.bajar', 'Bajar (Y−)')} onClick={() => mover(1, -0.1)}>▼</BotonOverlay>
              <BotonOverlay title={t('editor.piezas.der', 'Derecha (X+)')} onClick={() => mover(0, 0.1)}>↘</BotonOverlay>
            </div>
            <TituloOverlay>{t('editor.piezas.posicion', 'Posición')}</TituloOverlay>
          </div>

          {/* Abajo-der: tamaño */}
          <div className="absolute bottom-1.5 right-1.5 flex flex-col items-center gap-0.5">
            <div className="flex gap-0.5">
              <BotonOverlay title={t('editor.piezas.reducir', 'Reducir tamaño')} onClick={() => escalar(1 / 1.1)}>
                −
              </BotonOverlay>
              <BotonOverlay title={t('editor.piezas.agrandar', 'Agrandar tamaño')} onClick={() => escalar(1.1)}>
                ＋
              </BotonOverlay>
            </div>
            <TituloOverlay>{t('editor.piezas.tamano', 'Tamaño')}</TituloOverlay>
          </div>
        </>
      ) : (
        <span className="pointer-events-none absolute bottom-1.5 left-0 right-0 text-center text-[10px] text-white/35">
          {t('preview.girar', 'Arrastra para girar · rueda para acercar')}
        </span>
      )}
    </div>
  )
}
