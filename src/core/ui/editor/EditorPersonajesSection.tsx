import { useEffect, useState } from 'react'
import { useDiseño } from '../../state/disenoStore'
import { useAsistentes } from '../../state/asistentesStore'
import { useEditorUi, PERSONAJE_AVATAR } from '../../state/editorUiStore'
import {
  MASCOTAS,
  COLOR_FORMA,
  nombreAsistente,
  nombreForma,
  iconoModelo,
  type Asistente,
  type Pieza3D,
} from '../../chat/mascotas'
import {
  PRENDAS,
  PRENDA_COLOR_DEFAULT,
  CATEGORIAS_PRENDA,
  EXPRESIONES,
  EXPRESION_DEFAULT,
  PEINADOS,
  PELO_COLOR_DEFAULT,
  ESCALA_MIN,
  ESCALA_MAX,
  ESCALA_DEFAULT,
  soportaRostro,
  soportaPeinado,
  type PrendaId,
  type Ropa,
  type ExpresionId,
  type PeinadoId,
} from '../../house/apariencia'
import { CUERPOS_PRESET, piezasBase, aplicarCuerpoPreset } from '../../house/cuerpos'
import { GuardarropaEditor } from './GuardarropaEditor'
import { AtuendosEditor } from './AtuendosEditor'
import { iaActiva, generarModelo3D } from '../../chat/ia'
import { iaHabilitada } from '../../edicion'
import { Creditos } from '../Creditos'
import { OP_PERSONAJE_3D } from '../../cuenta/catalogoNucleo'
import { ColorPicker } from '../comun/ColorPicker'
import { PreviewPersonaje3D } from './PreviewPersonaje3D'
import { EditorPiezas, plantillaPersonajePiezas, piezasDesdeAvatar, piezasDesdeForma } from '../comun/EditorPiezas'
import { EditorAnimacion } from './EditorAnimacion'
import { useT } from '../../i18n/useT'
import { Icono } from '../iconos/Icono'

type ToolId = 'cuerpo' | 'rostro' | 'color' | 'tamano' | 'ropa' | 'anim'
/** La Princesa se muestra justo después de Humano en la galería de modelos, no al final. */
const PRINCESA_PRESET = CUERPOS_PRESET.find((c) => c.id === 'princesa')!
/** id del personaje seleccionado; 'avatar' = el personaje principal. */
const AVATAR = PERSONAJE_AVATAR

const inputCls =
  'rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white/85 placeholder:text-white/25 focus:outline-none'

/**
 * Editor de personajes (pestaña Personajes): todos los personajes como botones
 * (el principal + los agentes), una vista previa 3D del seleccionado y las
 * herramientas de edición — cuerpo, color, tamaño y ropa.
 */
export function EditorPersonajesSection() {
  const t = useT()
  const avatar = useDiseño((s) => s.avatar)
  const setAvatarModelo3d = useDiseño((s) => s.setAvatarModelo3d)
  const setAvatarNombre = useDiseño((s) => s.setAvatarNombre)
  const lista = useAsistentes((s) => s.lista)
  const guardar = useAsistentes((s) => s.guardar)
  const eliminarAsistente = useAsistentes((s) => s.eliminar)
  const selId = useEditorUi((s) => s.personajeSel)
  const setSelId = useEditorUi((s) => s.setPersonajeSel)
  const [tool, setTool] = useState<ToolId>('cuerpo')

  const asis = lista.find((a) => a.id === selId)
  const esAvatar = selId === AVATAR || !asis

  // Piezas editables del personaje seleccionado (si su cuerpo es un modelo de piezas):
  // activan la selección tocando el preview y las herramientas de los cuadrantes.
  const piezasSel = esAvatar
    ? (avatar.modeloGlb ? undefined : avatar.modelo3d)
    : (asis!.modeloGlb ? undefined : asis!.modelo3d)
  const piezasEdit =
    piezasSel && piezasSel.length > 0
      ? {
          piezas: piezasSel,
          onChange: (p: Pieza3D[]) =>
            esAvatar
              ? setAvatarModelo3d(p)
              : guardar({ ...asis!, modelo3d: p, modeloGlb: undefined }),
        }
      : undefined

  // Personaje sin piezas: el engrane ⚙️ lo convierte a una réplica exacta de su
  // modelo real (los cubos del avatar o la forma integrada del asistente).
  const activarPiezas = esAvatar
    ? () => setAvatarModelo3d(piezasDesdeAvatar(avatar))
    : () => guardar({ ...asis!, modelo3d: piezasDesdeForma(asis!.forma, asis!.color), modeloGlb: undefined })

  // Crea un personaje nuevo construido con piezas, visible en el mapa, y lo abre en Cuerpo.
  const crearPersonaje = async () => {
    const id = `custom-${Date.now()}`
    await guardar({
      id,
      nombre: t('editor.pers.nuevoNombre', 'Personaje'),
      emoji: '🧱',
      forma: 'robot',
      historia: '',
      personalidad: '',
      saludo: t('chat.config.nuevoSaludo', '¡Hola! Soy tu nuevo asistente.'),
      cuartos: [],
      enMapa: true,
      modelo3d: plantillaPersonajePiezas(),
    })
    setSelId(id)
    setTool('cuerpo')
  }

  const tools: { id: ToolId; label: string; emoji: string }[] = [
    { id: 'cuerpo', label: t('editor.pers.cuerpo', 'Cuerpo'), emoji: '🧍' },
    { id: 'rostro', label: t('editor.pers.rostro', 'Rostro'), emoji: '🙂' },
    { id: 'color', label: t('editor.pers.color', 'Color'), emoji: '🎨' },
    { id: 'tamano', label: t('editor.pers.tamano', 'Tamaño'), emoji: '📏' },
    { id: 'ropa', label: t('editor.pers.ropa', 'Ropa'), emoji: '👕' },
    { id: 'anim', label: t('editor.pers.anim', 'Animación'), emoji: '✨' },
  ]

  return (
    <div className="space-y-3">
      {/* 1) Botones de todos los personajes */}
      <div className="grid grid-cols-3 gap-1.5">
        <BotonPersonaje
          emoji={iconoModelo(avatar)}
          nombre={avatar.nombre || t('editor.pers.tu', 'Tú')}
          activo={esAvatar}
          onClick={() => setSelId(AVATAR)}
        />
        {lista.map((a) => (
          <BotonPersonaje
            key={a.id}
            emoji={iconoModelo(a)}
            nombre={nombreAsistente(t, a)}
            activo={!esAvatar && selId === a.id}
            onClick={() => setSelId(a.id)}
          />
        ))}
        <button
          type="button"
          onClick={crearPersonaje}
          title={t('editor.pers.crearDesc', 'Crear un personaje con piezas 3D (aparece en el mapa)')}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-accent/40 bg-accent/10 px-2 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent/20"
        >
          <Icono nombre="agregar" className="shrink-0 text-base leading-none" />
          {t('editor.pers.crear', 'Crear')}
        </button>
      </div>

      {/* 2) Vista previa 3D del personaje seleccionado */}
      <PreviewPersonaje3D
        avatar={esAvatar ? avatar : undefined}
        asistente={esAvatar ? undefined : asis}
        piezasEdit={piezasEdit}
        onActivarPiezas={piezasEdit ? undefined : activarPiezas}
      />

      {/* Nombre del personaje + eliminar (solo personajes creados por el usuario) */}
      <div className="flex items-stretch gap-1.5">
        <input
          value={esAvatar ? avatar.nombre ?? '' : asis!.nombre}
          onChange={(e) =>
            esAvatar ? void setAvatarNombre(e.target.value) : guardar({ ...asis!, nombre: e.target.value })
          }
          placeholder={
            esAvatar
              ? t('editor.pers.tu', 'Tú')
              : t('editor.pers.nombrePh', 'Nombre del personaje')
          }
          autoComplete="off"
          className={`${inputCls} min-w-0 flex-1`}
        />
        {!esAvatar && asis!.id.startsWith('custom-') && (
          <button
            type="button"
            onClick={async () => {
              await eliminarAsistente(asis!.id)
              setSelId(AVATAR)
            }}
            title={t('editor.pers.eliminar', 'Eliminar personaje')}
            className="grid w-9 place-items-center rounded-md border border-white/10 bg-white/5 text-sm transition hover:bg-red-500/25"
          >
            <Icono nombre="basura" />
          </button>
        )}
      </div>

      {/* 3) Herramientas de edición */}
      <div className="grid grid-cols-3 gap-1 rounded-lg border border-white/10 bg-black/30 p-1">
        {tools.map((tb) => (
          <button
            key={tb.id}
            type="button"
            onClick={() => setTool(tb.id)}
            className={`flex h-9 items-center justify-center gap-1 whitespace-nowrap rounded-md px-1 text-[11px] font-semibold transition ${
              tool === tb.id
                ? 'bg-white/15 text-white'
                : 'text-white/50 hover:bg-white/8 hover:text-white/75'
            }`}
          >
            <Icono emoji={tb.emoji} />
            {tb.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
        {tool === 'cuerpo' && (esAvatar ? <CuerpoAvatar /> : <CuerpoAsistente a={asis!} />)}
        {tool === 'rostro' && <RostroEditor esAvatar={esAvatar} asis={asis} />}
        {tool === 'color' && (esAvatar ? <ColorAvatar /> : <ColorAsistente a={asis!} />)}
        {tool === 'tamano' && <Tamano esAvatar={esAvatar} asis={asis} />}
        {tool === 'ropa' && <RopaEditor esAvatar={esAvatar} asis={asis} />}
        {tool === 'anim' && <AnimacionPersonaje esAvatar={esAvatar} asis={asis} />}
      </div>
    </div>
  )
}

function BotonPersonaje({
  emoji,
  nombre,
  activo,
  onClick,
}: {
  emoji: string
  nombre: string
  activo: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-semibold transition ${
        activo
          ? 'border-accent/50 bg-accent text-accent-ink'
          : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
      }`}
    >
      <span className="shrink-0 text-base leading-none"><Icono emoji={emoji} /></span>
      <span className="min-w-0 truncate">{nombre}</span>
    </button>
  )
}

// ---------- Herramienta: Cuerpo ----------

/** Botón de la galería de modelos: emoji grande + nombre debajo. */
function ModeloBtn({
  emoji,
  label,
  activo = false,
  onClick,
}: {
  emoji: string
  label: string
  activo?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`flex h-14 flex-col items-center justify-center gap-0.5 rounded-lg border px-1 text-center transition ${
        activo ? 'border-accent/50 bg-accent/15' : 'border-white/10 bg-white/5 hover:bg-white/10'
      }`}
    >
      <span className="text-lg leading-none">
        <Icono emoji={emoji} />
      </span>
      <span className="w-full truncate text-[9px] font-medium text-white/60">{label}</span>
    </button>
  )
}

/**
 * Galería de cuerpos listos para el personaje principal: el cuerpo base, las 5
 * formas integradas (conservan su cara) y varios cuerpos prediseñados de piezas
 * (quedan editables abajo). Un toque aplica el modelo.
 */
function GaleriaModelos() {
  const t = useT()
  const av = useDiseño((s) => s.avatar)
  const setAvatarForma = useDiseño((s) => s.setAvatarForma)
  const setAvatarCuerpoPreset = useDiseño((s) => s.setAvatarCuerpoPreset)
  const quitarAvatarModelo = useDiseño((s) => s.quitarAvatarModelo)
  const esBase = !av.modeloGlb && !(av.modelo3d?.length ?? 0) && !av.forma

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
        {t('editor.pers.modelos', 'Modelos')}
      </p>
      <div className="grid grid-cols-4 gap-1.5">
        <ModeloBtn
          emoji="🧍"
          label={t('editor.pers.modeloBase', 'Humano')}
          activo={esBase}
          onClick={() => void quitarAvatarModelo()}
        />
        <ModeloBtn
          emoji={PRINCESA_PRESET.emoji}
          label={t(`editor.pers.cuerpo.${PRINCESA_PRESET.id}`, PRINCESA_PRESET.nombre)}
          activo={av.cuerpoPresetId === PRINCESA_PRESET.id}
          onClick={() => void setAvatarCuerpoPreset(PRINCESA_PRESET)}
        />
        {MASCOTAS.map((f) => (
          <ModeloBtn
            key={f.id}
            emoji={f.emoji}
            label={nombreForma(t, f)}
            activo={av.forma === f.id}
            onClick={() => void setAvatarForma(f.id)}
          />
        ))}
        {CUERPOS_PRESET.filter((c) => c.id !== PRINCESA_PRESET.id).map((c) => (
          <ModeloBtn
            key={c.id}
            emoji={c.emoji}
            label={t(`editor.pers.cuerpo.${c.id}`, c.nombre)}
            activo={av.cuerpoPresetId === c.id}
            onClick={() => void setAvatarCuerpoPreset(c)}
          />
        ))}
      </div>
      <p className="text-[10px] leading-snug text-white/35">
        {t(
          'editor.pers.modelosNota',
          'Elige un cuerpo listo. Los de piezas puedes seguir editándolos abajo; las formas conservan su propia cara.',
        )}
      </p>
    </div>
  )
}

function CuerpoAvatar() {
  const t = useT()
  const setAvatarModelo3d = useDiseño((s) => s.setAvatarModelo3d)
  const setAvatarGlb = useDiseño((s) => s.setAvatarGlb)
  const quitarAvatarModelo = useDiseño((s) => s.quitarAvatarModelo)
  const av = useDiseño((s) => s.avatar)
  const tieneModeloPropio = !!av.modeloGlb || (av.modelo3d?.length ?? 0) > 0

  return (
    <div className="space-y-2">
      <GaleriaModelos />
      <p className="text-[11px] leading-snug text-white/45">
        {t(
          'editor.pers.cuerpoAvatar',
          'El personaje principal usa el cuerpo base (cabeza, torso y piernas). Dale una forma propia construyéndola con piezas 3D, con IA o subiendo un modelo .glb.',
        )}
      </p>
      <PiezasBlock
        piezas={av.modeloGlb ? undefined : av.modelo3d}
        onChange={(p) => setAvatarModelo3d(p)}
        onRestaurar={() => quitarAvatarModelo()}
        plantilla={() => piezasDesdeAvatar(av)}
      />
      <Forma3DBlock
        tieneModeloPropio={tieneModeloPropio}
        esGlb={!!av.modeloGlb}
        onModelo3d={(piezas) => setAvatarModelo3d(piezas)}
        onGlb={(f) => setAvatarGlb(f)}
        onQuitar={() => quitarAvatarModelo()}
      />
    </div>
  )
}

function CuerpoAsistente({ a }: { a: Asistente }) {
  const guardar = useAsistentes((s) => s.guardar)
  const tieneModeloPropio = !!a.modeloGlb || (a.modelo3d?.length ?? 0) > 0

  return (
    <div className="space-y-2">
      <GaleriaModelosAsistente a={a} />
      <PiezasBlock
        piezas={a.modeloGlb ? undefined : a.modelo3d}
        onChange={(p) => guardar({ ...a, modelo3d: p, modeloGlb: undefined, cuerpoPresetId: undefined })}
        onRestaurar={() => guardar({ ...a, modelo3d: undefined, modeloGlb: undefined, cuerpoPresetId: undefined })}
        plantilla={() => piezasDesdeForma(a.forma, a.color)}
      />
      <Forma3DBlock
        tieneModeloPropio={tieneModeloPropio}
        esGlb={!!a.modeloGlb}
        onModelo3d={(piezas) => guardar({ ...a, modelo3d: piezas, modeloGlb: undefined, cuerpoPresetId: undefined })}
        onGlb={(f) => guardar({ ...a, modeloGlb: f, modelo3d: undefined, cuerpoPresetId: undefined })}
        onQuitar={() => guardar({ ...a, modelo3d: undefined, modeloGlb: undefined, cuerpoPresetId: undefined })}
      />
    </div>
  )
}

/**
 * Galería de los 12 modelos para un asistente (Base + las 5 formas integradas +
 * los 6 cuerpos prediseñados), igual que `GaleriaModelos` del personaje
 * principal. "Base" se hornea en piezas (misma huella que el box-man): un
 * asistente no tiene cubos propios, así que necesita piezas para caminar/tener
 * rostro igual que el jugador.
 */
function GaleriaModelosAsistente({ a }: { a: Asistente }) {
  const t = useT()
  const guardar = useAsistentes((s) => s.guardar)
  const tieneModeloPropio = !!a.modeloGlb || (a.modelo3d?.length ?? 0) > 0

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
        {t('editor.pers.modelos', 'Modelos')}
      </p>
      <div className="grid grid-cols-4 gap-1.5">
        <ModeloBtn
          emoji="🧍"
          label={t('editor.pers.modeloBase', 'Humano')}
          activo={a.cuerpoPresetId === 'base'}
          onClick={() =>
            guardar({
              ...a,
              modelo3d: piezasBase(a.color ?? COLOR_FORMA[a.forma]),
              modeloGlb: undefined,
              cuerpoPresetId: 'base',
            })
          }
        />
        <ModeloBtn
          emoji={PRINCESA_PRESET.emoji}
          label={t(`editor.pers.cuerpo.${PRINCESA_PRESET.id}`, PRINCESA_PRESET.nombre)}
          activo={a.cuerpoPresetId === PRINCESA_PRESET.id}
          onClick={() => guardar({ ...a, ...aplicarCuerpoPreset(PRINCESA_PRESET) })}
        />
        {MASCOTAS.map((f) => (
          <ModeloBtn
            key={f.id}
            emoji={f.emoji}
            label={nombreForma(t, f)}
            activo={!tieneModeloPropio && a.forma === f.id}
            onClick={() =>
              guardar({ ...a, forma: f.id, modelo3d: undefined, modeloGlb: undefined, cuerpoPresetId: undefined })
            }
          />
        ))}
        {CUERPOS_PRESET.filter((c) => c.id !== PRINCESA_PRESET.id).map((c) => (
          <ModeloBtn
            key={c.id}
            emoji={c.emoji}
            label={t(`editor.pers.cuerpo.${c.id}`, c.nombre)}
            activo={a.cuerpoPresetId === c.id}
            onClick={() => guardar({ ...a, ...aplicarCuerpoPreset(c) })}
          />
        ))}
      </div>
      <p className="text-[10px] leading-snug text-white/35">
        {t(
          'editor.pers.modelosNota',
          'Elige un cuerpo listo. Los de piezas puedes seguir editándolos abajo; las formas conservan su propia cara.',
        )}
      </p>
    </div>
  )
}

/**
 * Bloque: construir el cuerpo con piezas de geometría básica. Si el personaje ya
 * tiene piezas, muestra el editor completo (edición en vivo); si no (cuerpo base,
 * forma integrada o .glb), ofrece empezar desde el muñeco de plantilla.
 */
function PiezasBlock({
  piezas,
  onChange,
  onRestaurar,
  plantilla,
}: {
  piezas?: Pieza3D[]
  onChange: (piezas: Pieza3D[]) => void
  /** Regresa el personaje a su cuerpo predeterminado (cubos o forma integrada). */
  onRestaurar: () => void
  /** Piezas iniciales al construir: la réplica del modelo real del personaje. */
  plantilla: () => Pieza3D[]
}) {
  const t = useT()
  // El editor de Forma (por pieza) solo se muestra con el engrane ⚙️ del preview
  // abierto; cerrado, se edita el personaje completo desde la pestaña Tamaño.
  const piezasControles = useEditorUi((s) => s.piezasControles)
  if (!piezas || piezas.length === 0) {
    return (
      <button
        type="button"
        onClick={() => onChange(plantilla())}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-2.5 py-2 text-xs font-semibold text-accent transition hover:bg-accent/20"
      >
        <Icono nombre="muro" /> {t('editor.pers.construirPiezas', 'Construir con piezas 3D')}
      </button>
    )
  }
  if (!piezasControles) {
    return (
      <p className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-[11px] leading-snug text-white/45">
        {t(
          'editor.pers.formaCerrada',
          'Toca el engrane del visor para editar la forma pieza por pieza. El tamaño general está en la pestaña Tamaño.',
        )}
      </p>
    )
  }
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-2">
      <EditorPiezas piezas={piezas} onChange={onChange} onRestaurar={onRestaurar} />
    </div>
  )
}

/** Bloque reutilizable: describir la forma a la IA o subir un .glb. */
function Forma3DBlock({
  tieneModeloPropio,
  esGlb,
  onModelo3d,
  onGlb,
  onQuitar,
}: {
  tieneModeloPropio: boolean
  esGlb: boolean
  onModelo3d: (piezas: Awaited<ReturnType<typeof generarModelo3D>>) => void
  onGlb: (glb: Blob) => void
  onQuitar: () => void
}) {
  const t = useT()
  const [descForma, setDescForma] = useState('')
  const [generando, setGenerando] = useState(false)
  const [optimizando, setOptimizando] = useState(false)
  const [errorForma, setErrorForma] = useState<string | null>(null)

  const generarForma = async () => {
    if (!descForma.trim() || generando) return
    setGenerando(true)
    setErrorForma(null)
    try {
      const piezas = await generarModelo3D(descForma.trim())
      onModelo3d(piezas)
      setDescForma('')
    } catch (err) {
      console.warn('[MPH] No se pudo generar la forma 3D:', err)
      setErrorForma(
        t('editor.pers.formaError', 'No pude crear la forma. Revisa el modelo de IA e inténtalo de nuevo.'),
      )
    } finally {
      setGenerando(false)
    }
  }

  return (
    <div className="space-y-1.5 rounded-lg border border-white/10 bg-white/5 p-2">
      {/* Describir la forma con IA: cuesta créditos. Subir un .glb propio es gratis. */}
      {iaHabilitada() && (
      <div className="flex gap-1.5">
        <input
          value={descForma}
          onChange={(e) => setDescForma(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && generarForma()}
          placeholder={
            iaActiva()
              ? t('editor.pers.formaPh', 'Descríbelo: "robot azul con capa roja"')
              : t('editor.pers.formaSinIa', 'Describir la forma requiere IA (elige modelo en la barra)')
          }
          disabled={!iaActiva() || generando}
          className={`${inputCls} min-w-0 flex-1 disabled:opacity-40`}
        />
        <button
          type="button"
          onClick={generarForma}
          disabled={!iaActiva() || generando || !descForma.trim()}
          className="rounded-md border border-accent/30 bg-accent/10 px-2.5 text-xs font-semibold text-accent transition hover:bg-accent/20 disabled:opacity-30"
          title={t('editor.pers.formaGenerar', 'Crear la forma con IA')}
        >
          {generando ? <span className="animate-pulse">…</span> : <Icono nombre="brillo" />}
        </button>
        <Creditos op={OP_PERSONAJE_3D} />
      </div>
      )}
      {errorForma && <p className="px-1 text-[10px] text-red-400/80">{errorForma}</p>}

      <div className="flex items-center gap-1.5">
        <label
          className={`rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/60 transition ${
            optimizando ? 'cursor-wait opacity-60' : 'cursor-pointer hover:bg-white/15'
          }`}
        >
          {optimizando ? (
            <span className="animate-pulse">{t('editor.pers.optimizando', 'Optimizando modelo…')}</span>
          ) : (
            <>
              <Icono nombre="cuarto-bodega" /> {t('editor.pers.subirGlb', 'Subir modelo .glb')}
            </>
          )}
          <input
            type="file"
            accept=".glb,.gltf,model/gltf-binary"
            className="hidden"
            disabled={optimizando}
            onChange={async (e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (!f) return
              setOptimizando(true)
              setErrorForma(null)
              try {
                // Decima/comprime el modelo (los .glb de IA pesan decenas de MB y no cargan).
                const { optimizarGlb } = await import('../../house/optimizarGlb')
                onGlb(await optimizarGlb(f))
              } catch (err) {
                console.warn('[MPH] No se pudo optimizar el .glb:', err)
                setErrorForma(t('editor.pers.glbError', 'No pude procesar ese modelo .glb. ¿Es un archivo válido?'))
              } finally {
                setOptimizando(false)
              }
            }}
          />
        </label>
        {tieneModeloPropio && (
          <button
            type="button"
            onClick={onQuitar}
            className="rounded-md px-2 py-1 text-[11px] text-white/40 transition hover:bg-white/10 hover:text-white/75"
          >
            {esGlb
              ? `✕ ${t('editor.pers.quitarGlb', 'Quitar modelo subido')}`
              : `✕ ${t('editor.pers.quitarFormaIa', 'Quitar la forma de piezas')}`}
          </button>
        )}
      </div>
    </div>
  )
}

// ---------- Herramienta: Color ----------

/**
 * Color por CONJUNTO para personajes hechos de piezas: pinta la pieza
 * seleccionada y todas las de su mismo color — así un toque cambia toda la ropa
 * de un humano o todo el pelaje/metal de un animal o robot, sin tocar los
 * detalles (ojos, hocico, orbe…). Para pintar una sola pieza está el color de
 * la herramienta Cuerpo.
 */
function ColorPiezaSel({
  piezas,
  onChange,
}: {
  piezas: Pieza3D[]
  onChange: (piezas: Pieza3D[]) => void
}) {
  const t = useT()
  const sel = useEditorUi((s) => s.piezaSel)
  const iSel = Math.min(sel, piezas.length - 1)
  const pieza = piezas[iSel]
  const grupo = piezas.filter((p) => p.color === pieza.color).length

  return (
    <div className="space-y-2">
      <p className="text-[11px] leading-snug text-white/45">
        {t(
          'editor.pers.colorPieza',
          'Pinta la pieza seleccionada y todas las de su mismo color (toda la ropa o todo el cuerpo). Toca una pieza en el visor con el engrane abierto para elegir otro conjunto.',
        )}
      </p>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white/60">
        <span className="h-3 w-3 rounded-sm" style={{ background: pieza.color }} />
        {t('editor.pers.colorGrupo', 'Pinta {n} pieza(s) de este color', { n: grupo })}
      </div>
      <ColorPicker
        value={pieza.color}
        onChange={(c) => {
          const base = pieza.color
          onChange(piezas.map((p) => (p.color === base ? { ...p, color: c } : p)))
        }}
      />
    </div>
  )
}

function ColorAvatar() {
  const t = useT()
  const avatar = useDiseño((s) => s.avatar)
  const setAvatarRopaColor = useDiseño((s) => s.setAvatarRopaColor)
  const setAvatarModelo3d = useDiseño((s) => s.setAvatarModelo3d)
  const setAvatarFormaColor = useDiseño((s) => s.setAvatarFormaColor)

  // Con cuerpo de piezas, el color pinta la pieza seleccionada.
  if (!avatar.modeloGlb && (avatar.modelo3d?.length ?? 0) > 0) {
    return <ColorPiezaSel piezas={avatar.modelo3d!} onChange={(p) => setAvatarModelo3d(p)} />
  }

  if (avatar.modeloGlb) {
    return (
      <p className="rounded-lg border border-accent/20 bg-accent/10 px-2.5 py-1.5 text-[11px] text-accent/90">
        {t('editor.pers.colorSinEfecto', 'Este personaje usa un modelo propio; los colores del cuerpo no le aplican.')}
      </p>
    )
  }

  // Con una forma integrada, el color pinta el cuerpo (mismo color por defecto que un asistente con esa forma).
  if (avatar.forma) {
    return (
      <div className="space-y-2">
        <p className="text-[11px] leading-snug text-white/45">
          {t('editor.pers.colorForma', 'Pinta el cuerpo de esta forma.')}
        </p>
        <ColorPicker
          value={avatar.formaColor ?? COLOR_FORMA[avatar.forma]}
          onChange={(c) => setAvatarFormaColor(c)}
        />
      </div>
    )
  }

  // Los humanos se pintan por la ropa: un solo color para todas las prendas puestas.
  const prendasPuestas = Object.values(avatar.ropa)
  if (prendasPuestas.length === 0) {
    return (
      <p className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] leading-snug text-white/45">
        {t(
          'editor.pers.colorSinRopa',
          'Este personaje no trae ropa puesta. Ponle una prenda en la pestaña Ropa y aquí podrás pintarla.',
        )}
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] leading-snug text-white/45">
        {t('editor.pers.colorRopaAvatar', 'Pinta toda la ropa puesta de un mismo color.')}
      </p>
      <ColorPicker value={prendasPuestas[0].color} onChange={(c) => setAvatarRopaColor(c)} />
    </div>
  )
}

function ColorAsistente({ a }: { a: Asistente }) {
  const t = useT()
  const guardar = useAsistentes((s) => s.guardar)

  // Con cuerpo de piezas, el color pinta la pieza seleccionada.
  if (!a.modeloGlb && (a.modelo3d?.length ?? 0) > 0) {
    return (
      <ColorPiezaSel
        piezas={a.modelo3d!}
        onChange={(p) => guardar({ ...a, modelo3d: p, modeloGlb: undefined, cuerpoPresetId: undefined })}
      />
    )
  }

  return (
    <div className="space-y-2">
      {a.modeloGlb && (
        <p className="rounded-lg border border-accent/20 bg-accent/10 px-2.5 py-1.5 text-[11px] text-accent/90">
          {t('editor.pers.colorSinEfecto', 'Este personaje usa un modelo propio; los colores del cuerpo no le aplican.')}
        </p>
      )}
      <ColorPicker
        value={a.color || COLOR_FORMA[a.forma]}
        onChange={(c) => guardar({ ...a, color: c })}
      />
    </div>
  )
}

// ---------- Herramienta: Tamaño ----------

function Tamano({ esAvatar, asis }: { esAvatar: boolean; asis?: Asistente }) {
  const t = useT()
  const avatarEscala = useDiseño((s) => s.avatar.escala)
  const setAvatarEscala = useDiseño((s) => s.setAvatarEscala)
  const guardar = useAsistentes((s) => s.guardar)

  const escala = esAvatar ? avatarEscala : asis?.escala ?? ESCALA_DEFAULT
  const setEscala = (n: number) => {
    if (esAvatar) setAvatarEscala(n)
    else if (asis) guardar({ ...asis, escala: n })
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
          {t('editor.pers.tamano', 'Tamaño')}
        </p>
        <span className="text-xs font-semibold tabular-nums text-white/70">
          {Math.round(escala * 100)}%
        </span>
      </div>
      <input
        type="range"
        min={ESCALA_MIN}
        max={ESCALA_MAX}
        step={0.05}
        value={escala}
        onChange={(e) => setEscala(parseFloat(e.target.value))}
        className="w-full accent-accent"
      />
      <div className="flex justify-between text-[10px] text-white/30">
        <span>{Math.round(ESCALA_MIN * 100)}%</span>
        <button
          type="button"
          onClick={() => setEscala(ESCALA_DEFAULT)}
          className="rounded px-2 py-0.5 text-white/40 transition hover:bg-white/10 hover:text-white/75"
        >
          ↺ {t('editor.pers.normal', 'Normal')}
        </button>
        <span>{Math.round(ESCALA_MAX * 100)}%</span>
      </div>
    </div>
  )
}

// ---------- Herramienta: Animación ----------

function AnimacionPersonaje({ esAvatar, asis }: { esAvatar: boolean; asis?: Asistente }) {
  const t = useT()
  const avatar = useDiseño((s) => s.avatar)
  const setAvatarAnimacion = useDiseño((s) => s.setAvatarAnimacion)
  const setAvatarModelo3d = useDiseño((s) => s.setAvatarModelo3d)
  const guardar = useAsistentes((s) => s.guardar)

  const anim = esAvatar ? avatar.animacion : asis?.animacion
  const piezas = esAvatar
    ? (avatar.modeloGlb ? undefined : avatar.modelo3d)
    : (asis?.modeloGlb ? undefined : asis?.modelo3d)
  const conPiezas = piezas && piezas.length > 0

  return (
    <div className="space-y-2">
      {!esAvatar && (
        <p className="text-[11px] leading-snug text-white/45">
          {t('editor.pers.animFlote', 'El movimiento sustituye el flote natural del personaje; el saludo se conserva.')}
        </p>
      )}
      <EditorAnimacion
        anim={anim}
        onChange={(a) => (esAvatar ? void setAvatarAnimacion(a) : asis && void guardar({ ...asis, animacion: a }))}
        piezas={conPiezas ? piezas : undefined}
        onAplicarPose={
          conPiezas
            ? (p) =>
                esAvatar
                  ? void setAvatarModelo3d(p)
                  : asis && void guardar({ ...asis, modelo3d: p, modeloGlb: undefined, cuerpoPresetId: undefined })
            : undefined
        }
      />
      {!conPiezas && (
        <p className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] leading-snug text-white/45">
          {t(
            'editor.pers.animSinPiezas',
            'Para crear animaciones con poses, construye el cuerpo con piezas 3D en la pestaña Cuerpo.',
          )}
        </p>
      )}
    </div>
  )
}

// ---------- Herramienta: Rostro ----------

/** Object URL de un blob para <img> del DOM (se revoca al cambiar/desmontar). */
function useObjectUrl(blob: Blob | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!blob) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- limpia el URL al quitar la foto
      setUrl(null)
      return
    }
    // El URL debe nacer en un render comprometido (StrictMode revoca en la limpieza).
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return url
}

/**
 * Rostro del personaje principal: subir una foto que tapa el frente de la cabeza
 * o elegir una expresión dibujada (ojos + boca). La foto manda sobre la expresión.
 * Los asistentes ya tienen cara según su forma, así que aquí solo se avisa.
 */
function RostroEditor({ esAvatar, asis }: { esAvatar: boolean; asis?: Asistente }) {
  const t = useT()
  const avatar = useDiseño((s) => s.avatar)
  const setAvatarExpresion = useDiseño((s) => s.setAvatarExpresion)
  const setAvatarRostro = useDiseño((s) => s.setAvatarRostro)
  const setAvatarPeinado = useDiseño((s) => s.setAvatarPeinado)
  const setAvatarPeloColor = useDiseño((s) => s.setAvatarPeloColor)
  const guardar = useAsistentes((s) => s.guardar)
  const [procesando, setProcesando] = useState(false)

  const personaje = esAvatar ? avatar : asis
  const conRostro = !!personaje && soportaRostro(personaje)
  const conPeinado = !!personaje && soportaPeinado(personaje)
  const rostro = personaje?.rostro
  const rostroUrl = useObjectUrl(rostro)

  if (!conRostro && !conPeinado) {
    return (
      <p className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] leading-snug text-white/45">
        {t(
          'editor.pers.rostroNoAplica',
          'Este modelo ya tiene su propia cara (casco, careta, pelaje…): el rostro y el peinado del editor no le aplican.',
        )}
      </p>
    )
  }

  const setExpresion = (id: ExpresionId) =>
    esAvatar ? void setAvatarExpresion(id) : asis && void guardar({ ...asis, expresion: id })
  const setRostro = async (blob: Blob | undefined) => {
    if (esAvatar) await setAvatarRostro(blob)
    else if (asis) await guardar({ ...asis, rostro: blob })
  }
  const setPeinado = (id: PeinadoId) =>
    esAvatar ? void setAvatarPeinado(id) : asis && void guardar({ ...asis, peinado: id })
  const setPeloColor = (color: string) =>
    esAvatar ? void setAvatarPeloColor(color) : asis && void guardar({ ...asis, peloColor: color })

  const expSel = personaje?.expresion ?? EXPRESION_DEFAULT
  const peinado = personaje?.peinado
  const peloColor = personaje?.peloColor

  return (
    <div className="space-y-3">
      {conRostro && (
        <>
          {/* Foto de rostro */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
              {t('editor.pers.rostroImagen', 'Foto de rostro')}
            </p>
            {rostro && (
              <div className="flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/10 p-1.5">
                {rostroUrl && (
                  <img
                    src={rostroUrl}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-lg border border-white/10 object-cover"
                  />
                )}
                <p className="min-w-0 flex-1 text-[11px] leading-snug text-white/55">
                  {t('editor.pers.rostroImagenPuesta', 'La foto tapa el frente de la cabeza (manda sobre la expresión).')}
                </p>
                <button
                  type="button"
                  onClick={() => void setRostro(undefined)}
                  title={t('editor.pers.rostroQuitar', 'Quitar foto')}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-white/10 bg-white/5 text-sm transition hover:bg-red-500/25"
                >
                  <Icono nombre="basura" />
                </button>
              </div>
            )}
            <label
              className={`flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs font-semibold text-white/70 transition ${
                procesando ? 'cursor-wait opacity-60' : 'cursor-pointer hover:bg-white/15'
              }`}
            >
              {procesando ? (
                <span className="animate-pulse">{t('editor.pers.rostroProcesando', 'Procesando foto…')}</span>
              ) : (
                <>
                  <Icono nombre="foto" />
                  {rostro
                    ? t('editor.pers.rostroCambiar', 'Cambiar foto')
                    : t('editor.pers.rostroSubir', 'Subir foto de rostro')}
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={procesando}
                onChange={async (e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ''
                  if (!f) return
                  setProcesando(true)
                  try {
                    // Redimensiona a máx 1280px (mismo helper que los cuadros con foto).
                    const { comprimirFoto } = await import('../../house/especiales')
                    await setRostro(await comprimirFoto(f))
                  } catch (err) {
                    console.warn('[MPH] No se pudo procesar la foto de rostro:', err)
                  } finally {
                    setProcesando(false)
                  }
                }}
              />
            </label>
          </div>

          {/* Expresión dibujada (se atenúa si hay foto, que manda) */}
          <div className={`space-y-1.5 ${rostro ? 'pointer-events-none opacity-40' : ''}`}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
              {t('editor.pers.rostroExpresion', 'Expresión')}
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {EXPRESIONES.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => setExpresion(ex.id)}
                  title={t(`editor.pers.expresion.${ex.id}`, ex.nombre)}
                  className={`grid h-11 place-items-center rounded-lg text-xl transition ${
                    expSel === ex.id
                      ? 'bg-accent/20 ring-1 ring-accent/50'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <Icono emoji={ex.emoji} />
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Peinado + color de pelo */}
      {conPeinado && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
              {t('editor.pers.peinado', 'Peinado')}
            </p>
            <input
              type="color"
              value={peloColor || PELO_COLOR_DEFAULT}
              onChange={(e) => setPeloColor(e.target.value)}
              className="h-7 w-9 cursor-pointer rounded border border-white/10 bg-transparent"
              title={t('editor.pers.peloColor', 'Color de pelo')}
            />
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {PEINADOS.map((h) => (
              <ModeloBtn
                key={h.id}
                emoji={h.emoji}
                label={t(`editor.pers.peinado.${h.id}`, h.nombre)}
                activo={(peinado ?? 'ninguno') === h.id}
                onClick={() => setPeinado(h.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------- Herramienta: Ropa ----------

/**
 * Sección plegable de una categoría de la pestaña Ropa (arranca plegada,
 * recuerda lo abierto por id — mismo mecanismo que el acordeón de
 * Configuraciones, `useEditorUi().configAbiertos`).
 */
function SeccionRopa({
  id,
  titulo,
  emoji,
  children,
}: {
  id: string
  titulo: string
  emoji: string
  children: React.ReactNode
}) {
  const t = useT()
  const abierto = useEditorUi((s) => s.configAbiertos[id] === true)
  const toggle = useEditorUi((s) => s.toggleConfigGrupo)
  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-white/5">
      <button
        type="button"
        onClick={() => toggle(id)}
        aria-expanded={abierto}
        title={
          abierto
            ? t('editor.sec.contraer', `Contraer ${titulo}`, { titulo })
            : t('editor.sec.expandir', `Expandir ${titulo}`, { titulo })
        }
        className="flex w-full items-center gap-2 px-2.5 py-2 text-left transition hover:bg-white/10"
      >
        <span className="text-base leading-none">
          <Icono emoji={emoji} />
        </span>
        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-white/75">{titulo}</span>
        <span className="shrink-0 text-[10px] text-white/40">{abierto ? '▼' : '▶'}</span>
      </button>
      {abierto && <div className="border-t border-white/10 p-2">{children}</div>}
    </div>
  )
}

function RopaEditor({ esAvatar, asis }: { esAvatar: boolean; asis?: Asistente }) {
  const t = useT()
  const avatarRopa = useDiseño((s) => s.avatar.ropa)
  const setAvatarPrenda = useDiseño((s) => s.setAvatarPrenda)
  const guardar = useAsistentes((s) => s.guardar)

  const ropa: Ropa = esAvatar ? avatarRopa : asis?.ropa ?? {}

  const setPrenda = (id: PrendaId, color: string | null) => {
    if (esAvatar) {
      setAvatarPrenda(id, color)
    } else if (asis) {
      const nueva = { ...(asis.ropa ?? {}) }
      if (color) nueva[id] = { color }
      else delete nueva[id]
      guardar({ ...asis, ropa: nueva })
    }
  }

  return (
    <div className="space-y-1.5">
      {esAvatar && (
        <SeccionRopa id="ropa-atuendos" titulo={t('editor.pers.atuendos', 'Atuendos')} emoji="🧳">
          <AtuendosEditor />
        </SeccionRopa>
      )}
      {CATEGORIAS_PRENDA.map((cat) => (
        <SeccionRopa
          key={cat.id}
          id={`ropa-${cat.id}`}
          titulo={t(`editor.pers.categoria.${cat.id}`, cat.nombre)}
          emoji={cat.emoji}
        >
          <div className="space-y-1.5">
            {PRENDAS.filter((p) => p.categoria === cat.id).map((p) => {
              const puesta = !!ropa[p.id]
              const color = ropa[p.id]?.color ?? PRENDA_COLOR_DEFAULT[p.id]
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 transition ${
                    puesta ? 'border-accent/30 bg-accent/10' : 'border-white/10 bg-white/5'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setPrenda(p.id, puesta ? null : color)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <span className="text-lg leading-none">
                      <Icono emoji={p.emoji} />
                    </span>
                    <span className={`truncate text-xs font-semibold ${puesta ? 'text-white/90' : 'text-white/55'}`}>
                      {t(`editor.pers.prenda.${p.id}`, p.nombre)}
                    </span>
                  </button>
                  {puesta && (
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setPrenda(p.id, e.target.value)}
                      className="h-7 w-9 cursor-pointer rounded border border-white/10 bg-transparent"
                      title={t('editor.pers.colorPrenda', 'Color de la prenda')}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setPrenda(p.id, puesta ? null : color)}
                    className={`grid h-6 w-6 place-items-center rounded-md text-xs transition ${
                      puesta ? 'bg-accent/30 text-accent' : 'bg-white/5 text-white/40 hover:bg-white/15'
                    }`}
                    title={puesta ? t('editor.pers.quitarPrenda', 'Quitar') : t('editor.pers.ponerPrenda', 'Poner')}
                  >
                    {puesta ? '✓' : '+'}
                  </button>
                </div>
              )
            })}
          </div>
        </SeccionRopa>
      ))}
      {esAvatar && <GuardarropaEditor />}
    </div>
  )
}
