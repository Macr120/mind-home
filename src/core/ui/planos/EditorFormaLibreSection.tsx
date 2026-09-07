import { useMemo, type CSSProperties, type ReactNode } from 'react'
import type { FormaLibre, TechoLibreId, TipoFormaLibre, VanoLibre } from '../../data/db'
import { VACIO, formasLibresRepo, murosLibresRepo } from '../../data/repository'
import { usePlanos, type HerramientaPlano } from '../../state/planosStore'
import { useFormaLibre } from '../../state/formaLibreStore'
import { useCuartos } from '../../state/cuartosStore'
import { useDiseño } from '../../state/disenoStore'
import { useLayout } from '../../state/layoutStore'
import { confirmar } from '../../state/confirmarStore'
import { TIPOS_MURO, TIPOS_PUERTA, TIPOS_FORMA_MURO } from '../../house/murosPuertas'
import { PISOS, type PisoTipo } from '../../house/pisos'
import { TECHOS_GENERICOS } from '../../house/techos'
import { TechoMaterialSwatch } from '../editor/TechoMaterialSwatch'
import { FORMA_ALTO_TECHO } from '../../house/walls'
import {
  ANCHO_PUERTA_LIBRE,
  ANCHO_VENTANA_LIBRE,
  MIN_PUNTOS_CERRAR,
  contornoTecho,
  esPoligonoConvexo,
  tieneMuro,
  tienePiso,
  tieneTecho,
} from '../../house/formasLibre'
import { SliderProp } from '../comun/SliderProp'
import { ColorPicker } from '../comun/ColorPicker'
import { useT } from '../../i18n/useT'
import { Icono } from '../iconos/Icono'
import type { NombreIcono } from '../iconos/catalogo'
import { vivo } from '../estilos'

/** Acento del modo Libre (mismo que su chip en la barra de modos). */
const ACENTO = '#e879f9'

/** Texturas de muro disponibles (la "ventana" es un modo aparte, no una textura). */
const TEXTURAS_MURO = TIPOS_MURO.filter((m) => m.id !== 'ventana')

const HERRAMIENTAS: { id: HerramientaPlano; labelEs: string; icono: NombreIcono }[] = [
  { id: 'trazar', labelEs: 'Dibujar', icono: 'pluma' },
  { id: 'seleccionar', labelEs: 'Editar', icono: 'apunta' },
  { id: 'borrar', labelEs: 'Borrar', icono: 'borrador' },
  { id: 'puerta', labelEs: 'Puerta', icono: 'cuartos' },
  { id: 'ventana', labelEs: 'Ventana', icono: 'ventana' },
]

const TIPOS: { id: TipoFormaLibre; labelEs: string; icono: NombreIcono }[] = [
  { id: 'muro', labelEs: 'Muro', icono: 'muro' },
  { id: 'piso', labelEs: 'Piso', icono: 'piso-interior' },
  { id: 'recinto', labelEs: 'Recinto', icono: 'poligono' },
]

/** Formas de techo de un recinto libre (el material se elige aparte). */
const TECHOS_LIBRE: { id: TechoLibreId; labelEs: string }[] = [
  { id: 'plano', labelEs: 'Plano' },
  { id: 'tienda', labelEs: 'Tienda' },
  { id: 'una_agua', labelEs: '1 agua' },
  { id: 'dos_aguas', labelEs: '2 aguas' },
]

/** Misma receta que los chips de la barra de modos del constructor. */
function Chip({
  activo,
  onClick,
  children,
  accent,
  disabled,
}: {
  activo: boolean
  onClick: () => void
  children: ReactNode
  accent?: string
  disabled?: boolean
}) {
  const c = accent ?? '#34d399'
  const conColor = activo || accent != null
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition disabled:opacity-40${conColor ? ' texto-vivo' : ''}`}
      style={
        activo
          ? {
              ...vivo(c),
              background: `color-mix(in srgb, ${c} 20%, transparent)`,
              boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${c} 55%, transparent)`,
            }
          : accent != null
            ? { ...vivo(c), background: 'color-mix(in srgb, var(--ui-ink) 6%, transparent)' }
            : {
                background: 'color-mix(in srgb, var(--ui-ink) 6%, transparent)',
                color: 'color-mix(in srgb, var(--ui-ink) 55%, transparent)',
              }
      }
    >
      {children}
    </button>
  )
}

/** Botón de una fila segmentada («flex gap-1 rounded-lg bg-black/20 p-1»). */
function Segmento({
  activo,
  onClick,
  children,
  disabled,
}: {
  activo: boolean
  onClick: () => void
  children: ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-1 items-center justify-center gap-1 rounded-md py-1 text-[10px] font-semibold transition disabled:opacity-40 ${
        activo ? 'bg-white/15 text-white' : 'text-white/45 hover:text-white/70'
      }`}
    >
      {children}
    </button>
  )
}

/** Interruptor con borde (misma receta que Mosaico/Multicolor del editor de muros). */
function Toggle({
  activo,
  onClick,
  children,
}: {
  activo: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1 rounded-md border py-1.5 text-[10px] font-semibold transition ${
        activo
          ? 'border-emerald-400/70 bg-emerald-400/15 text-emerald-400'
          : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  )
}

/** Botón de material de techo: miniatura del swatch + nombre (misma receta que las texturas). */
function BotonMaterialTecho({
  activo,
  nombre,
  onClick,
  children,
}: {
  activo: boolean
  nombre: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={nombre}
      onClick={onClick}
      className={[
        'flex flex-col items-center gap-1 rounded-lg border px-1 py-1.5 text-center transition',
        activo
          ? 'border-emerald-400/70 bg-emerald-400/15 text-emerald-400'
          : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10',
      ].join(' ')}
    >
      <div className="w-full">{children}</div>
      <span className="line-clamp-1 text-[8px] font-medium leading-tight">{nombre}</span>
    </button>
  )
}

function Titulo({ children }: { children: ReactNode }) {
  return <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">{children}</p>
}

/** Estilo de la miniatura de cada textura de piso: imagen real o patrón CSS para los procedurales. */
function swatchStyle(p: PisoTipo): CSSProperties {
  if (p.textura)
    return { backgroundColor: p.color, backgroundImage: `url(/textures/floors/${p.textura}_color.jpg)` }
  if (p.id === 'mosaico' || p.id === 'ajedrez') {
    const [a, b] = p.id === 'mosaico' ? ['#c8c6d8', '#9896a8'] : ['#f0ede8', '#161616']
    return {
      background: `conic-gradient(${a} 90deg, ${b} 90deg 180deg, ${a} 180deg 270deg, ${b} 270deg)`,
      backgroundSize: '14px 14px',
    }
  }
  if (p.id === 'grid_neon')
    return {
      backgroundColor: '#050a18',
      backgroundImage:
        'linear-gradient(#3b6cff 1.5px, transparent 1.5px), linear-gradient(90deg, #3b6cff 1.5px, transparent 1.5px)',
      backgroundSize: '9px 9px',
    }
  return { backgroundColor: p.color }
}

const pct = (v: number) => `${Math.round(v * 100)}%`

/**
 * Panel inferior del modo LIBRE del constructor: herramientas, opciones de trazado,
 * botones del borrador, propiedades de la forma seleccionada y conversiones de
 * muros de rejilla y cuartos a formas libres.
 */
export function EditorFormaLibreSection() {
  const t = useT()
  const herramienta = usePlanos((s) => s.herramienta)
  const setHerramienta = usePlanos((s) => s.setHerramienta)
  const nivel = usePlanos((s) => s.nivel)
  const formaLibreSel = usePlanos((s) => s.formaLibreSel)
  const muroLibreSel = usePlanos((s) => s.muroLibreSel)
  const seleccion = usePlanos((s) => s.seleccion)

  const tipoNuevo = useFormaLibre((s) => s.tipoNuevo)
  const setTipoNuevo = useFormaLibre((s) => s.setTipoNuevo)
  const suaveNuevo = useFormaLibre((s) => s.suaveNuevo)
  const setSuaveNuevo = useFormaLibre((s) => s.setSuaveNuevo)
  const iman = useFormaLibre((s) => s.iman)
  const setIman = useFormaLibre((s) => s.setIman)
  const borrador = useFormaLibre((s) => s.borrador)

  const formas = formasLibresRepo.useAll() ?? VACIO
  const f = formas.find((x) => x.id === formaLibreSel)
  const hayFormasNivel = formas.some((x) => x.nivel === nivel)

  const n = borrador?.length ?? 0
  // El muro puede terminar abierto con 2 puntos; piso y recinto necesitan encerrar área.
  const minPuntos = tipoNuevo === 'muro' ? 2 : MIN_PUNTOS_CERRAR
  const puedeTerminar = n >= minPuntos

  const hint =
    herramienta === 'trazar'
      ? t(
          'constructor.libre.hint.trazar',
          'Toca para poner puntos o arrastra para dibujar a mano alzada. Toca el primer punto para cerrar la forma, o usa Terminar.',
        )
      : herramienta === 'seleccionar'
        ? t(
            'constructor.libre.hint.seleccionar',
            'Toca una forma para seleccionarla. Arrastra sus puntos para deformarla, toca el punto medio de un tramo para añadir uno y arrastra el interior para moverla. Toca un cuarto o un muro de rejilla para convertirlo.',
          )
        : herramienta === 'borrar'
          ? t('constructor.libre.hint.borrar', 'Toca un punto de la forma seleccionada para quitarlo.')
          : t(
              'constructor.libre.hint.vano',
              'Toca un muro libre donde quieras la puerta o la ventana; toca el mismo sitio otra vez para quitarla.',
            )

  return (
    <div className="space-y-4">
      {/* Herramientas (3 por fila: en el panel de w-80 cinco chips con etiqueta no caben) */}
      <div className="grid grid-cols-3 gap-1.5">
        {HERRAMIENTAS.map((h) => (
          <Chip key={h.id} activo={herramienta === h.id} onClick={() => setHerramienta(h.id)} accent={ACENTO}>
            <Icono nombre={h.icono} /> {t(`constructor.libre.herr.${h.id}`, h.labelEs)}
          </Chip>
        ))}
      </div>

      {/* Opciones de trazado */}
      {herramienta === 'trazar' && (
        <div className="space-y-2">
          <Titulo>{t('constructor.libre.tipo', 'Qué construir')}</Titulo>
          <div className="flex gap-1 rounded-lg bg-black/20 p-1">
            {TIPOS.map((tp) => (
              <Segmento key={tp.id} activo={tipoNuevo === tp.id} onClick={() => setTipoNuevo(tp.id)}>
                <Icono nombre={tp.icono} /> {t(`constructor.libre.tipo.${tp.id}`, tp.labelEs)}
              </Segmento>
            ))}
          </div>
          <div className="flex gap-1.5">
            <Toggle activo={suaveNuevo} onClick={() => setSuaveNuevo(!suaveNuevo)}>
              <Icono nombre="curva" /> {t('constructor.libre.suave', 'Curva suave')}
            </Toggle>
            <Toggle activo={iman} onClick={() => setIman(!iman)}>
              <Icono nombre="iman" /> {t('constructor.libre.iman', 'Imán a la rejilla')}
            </Toggle>
          </div>

          {/* Borrador en curso */}
          {borrador && (
            <div className="space-y-1.5 rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-2">
              <p className="text-[11px] font-semibold text-emerald-400">
                <Icono nombre="nodos" /> {t('constructor.libre.puntos', 'Puntos: {n}', { n })}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                <Chip
                  activo
                  disabled={!puedeTerminar}
                  onClick={() => void useFormaLibre.getState().terminarBorrador(tipoNuevo !== 'muro')}
                >
                  <Icono nombre="confirmar" /> {t('constructor.libre.terminar', 'Terminar')}
                </Chip>
                {tipoNuevo === 'muro' && n >= MIN_PUNTOS_CERRAR && (
                  <Chip activo onClick={() => void useFormaLibre.getState().terminarBorrador(true)}>
                    <Icono nombre="poligono" /> {t('constructor.libre.cerrarTerminar', 'Cerrar y terminar')}
                  </Chip>
                )}
                <Chip activo={false} onClick={() => useFormaLibre.getState().quitarUltimoBorrador()}>
                  <Icono nombre="deshacer" /> {t('constructor.libre.quitarUltimo', 'Quitar último punto')}
                </Chip>
                <Chip activo={false} onClick={() => useFormaLibre.getState().cancelarBorrador()}>
                  <Icono nombre="cerrar" /> {t('constructor.libre.cancelar', 'Cancelar')}
                </Chip>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Forma seleccionada, o candidatos a convertir (muro de rejilla / cuarto) */}
      {f ? (
        <PanelForma key={f.id} f={f} />
      ) : muroLibreSel != null ? (
        <TarjetaMuroRejilla muroId={muroLibreSel} />
      ) : seleccion?.tipo === 'cuarto' ? (
        <TarjetaCuarto roomId={seleccion.roomId} />
      ) : null}

      {!hayFormasNivel && !borrador && (
        <p className="rounded-xl border border-dashed border-white/15 px-3 py-3 text-center text-[11px] leading-snug text-white/40">
          {t('constructor.libre.vacio', 'Aún no hay formas libres en este nivel.')}
        </p>
      )}

      <p className="text-[10px] leading-snug text-white/45">{hint}</p>
    </div>
  )
}

/** Muro libre de REJILLA tocado en modo Libre: se ofrece convertirlo en forma libre. */
function TarjetaMuroRejilla({ muroId }: { muroId: number }) {
  const t = useT()
  const muros = murosLibresRepo.useAll() ?? VACIO
  const m = muros.find((x) => x.id === muroId)
  if (!m) return null
  return (
    <div className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-white/70">
          <Icono nombre="muro" /> {t('constructor.libre.muroRejillaSel', 'Muro de rejilla seleccionado')}
        </p>
        <button
          type="button"
          onClick={() => usePlanos.getState().setMuroLibreSel(null)}
          className="text-[11px] text-white/40 transition hover:text-white/70"
        >
          <Icono nombre="cerrar" />
        </button>
      </div>
      <button
        type="button"
        onClick={() => void useFormaLibre.getState().liberarMuroRejilla(m)}
        className="texto-vivo flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-semibold transition"
        style={{
          ...vivo(ACENTO),
          background: `color-mix(in srgb, ${ACENTO} 20%, transparent)`,
          boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${ACENTO} 55%, transparent)`,
        }}
      >
        <Icono nombre="pluma" /> {t('constructor.libre.convertirMuro', 'Convertir a forma libre')}
      </button>
    </div>
  )
}

/** Cuarto tocado en modo Libre: se ofrece liberar su contorno como recinto libre. */
function TarjetaCuarto({ roomId }: { roomId: string }) {
  const t = useT()
  const nombre = useCuartos((s) => s.cuartos.find((c) => c.id === roomId)?.nombre)
  const liberar = async () => {
    const ok = await confirmar({
      titulo: t('constructor.libre.liberarCuarto', 'Liberar la forma del cuarto'),
      mensaje: t(
        'constructor.libre.liberarCuartoConfirmar',
        'El cuarto conserva su lugar, sus objetos y su app; sus muros pasan a ser una forma libre que puedes deformar a tu gusto. ¿Continuar?',
      ),
      textoOk: t('constructor.libre.liberarCuarto', 'Liberar la forma del cuarto'),
    })
    if (ok) await useFormaLibre.getState().liberarCuarto(roomId)
  }
  return (
    <div className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-white/70">
          <Icono nombre="casa" /> {t('constructor.libre.cuartoSel', 'Cuarto seleccionado')}
          {nombre ? <span className="text-white/45">: {nombre}</span> : null}
        </p>
        <button
          type="button"
          onClick={() => usePlanos.getState().setSeleccion(null)}
          className="text-[11px] text-white/40 transition hover:text-white/70"
        >
          <Icono nombre="cerrar" />
        </button>
      </div>
      <button
        type="button"
        onClick={() => void liberar()}
        className="texto-vivo flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-semibold transition"
        style={{
          ...vivo(ACENTO),
          background: `color-mix(in srgb, ${ACENTO} 20%, transparent)`,
          boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${ACENTO} 55%, transparent)`,
        }}
      >
        <Icono nombre="poligono" /> {t('constructor.libre.liberarCuarto', 'Liberar la forma del cuarto')}
      </button>
    </div>
  )
}

/** Propiedades de la forma libre seleccionada. */
function PanelForma({ f }: { f: FormaLibre }) {
  const t = useT()
  const id = f.id as number
  const setFormaLibreSel = usePlanos((s) => s.setFormaLibreSel)
  const techoTipoGlobal = useDiseño((s) => s.techoTipo)
  const gridCols = useLayout((s) => s.gridCols)
  const gridRows = useLayout((s) => s.gridRows)
  const set = (patch: Partial<FormaLibre>) => void useFormaLibre.getState().actualizarForma(id, patch)
  const setVano = (i: number, patch: Partial<VanoLibre>) =>
    void useFormaLibre.getState().actualizarVano(f, i, patch)

  const alto = f.alto ?? 1
  const silueta = f.silueta ?? 'recta'
  const formaAlto = f.formaAlto ?? FORMA_ALTO_TECHO
  const muroTipo = f.muroTipo ?? 'solido'
  const muroColor = f.muroColor ?? '#8c8073'
  const pisoTipo = f.pisoTipo === undefined ? 'madera' : f.pisoTipo
  const pisoColor = f.pisoColor ?? '#b9a27a'
  const puedeCerrar = f.puntos.length >= MIN_PUNTOS_CERRAR
  const techoColor = f.techoColor ?? muroColor
  // La tienda (abanico a un ápice) solo cubre bien un contorno convexo.
  const tiendaPosible = useMemo(
    () => tieneTecho(f) && esPoligonoConvexo(contornoTecho(f, gridCols, gridRows)),
    [f, gridCols, gridRows],
  )
  const vanos = f.vanos ?? []

  const eliminar = async () => {
    const ok = await confirmar({
      titulo: t('constructor.libre.eliminarConfirmar', '¿Eliminar esta forma libre?'),
      textoOk: t('constructor.libre.eliminar', 'Eliminar forma'),
      peligro: true,
    })
    if (ok) await useFormaLibre.getState().eliminarForma(id)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[11px] font-semibold text-white/70">
          <Icono nombre="pluma" /> {f.nombre || t('constructor.libre.forma', 'Forma libre')}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => void eliminar()}
            title={t('constructor.libre.eliminar', 'Eliminar forma')}
            className="flex items-center gap-1 rounded-md border border-red-400/30 bg-red-400/10 px-2 py-0.5 text-[10px] font-semibold text-red-400/90 transition hover:bg-red-400/20"
          >
            <Icono nombre="basura" /> {t('constructor.muro.eliminarCorto', 'Eliminar')}
          </button>
          <button
            type="button"
            onClick={() => setFormaLibreSel(null)}
            className="text-[11px] text-white/40 transition hover:text-white/70"
          >
            <Icono nombre="cerrar" />
          </button>
        </div>
      </div>

      {/* Nombre (se guarda al salir del campo o con Intro) */}
      <label className="block space-y-1">
        <Titulo>{t('constructor.libre.nombre', 'Nombre')}</Titulo>
        <input
          type="text"
          defaultValue={f.nombre ?? ''}
          placeholder={t('constructor.libre.forma', 'Forma libre')}
          onBlur={(e) => {
            const nombre = e.target.value.trim()
            if (nombre !== (f.nombre ?? '')) set({ nombre: nombre || undefined })
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          }}
          className="w-full rounded-md border border-white/10 bg-black/20 px-2 py-1.5 text-[11px] text-white/80 outline-none placeholder:text-white/30 focus:border-white/30"
        />
      </label>

      {/* Tipo */}
      <div className="space-y-1.5">
        <Titulo>{t('constructor.libre.tipo', 'Qué construir')}</Titulo>
        <div className="flex gap-1 rounded-lg bg-black/20 p-1">
          {TIPOS.map((tp) => (
            <Segmento
              key={tp.id}
              activo={f.tipo === tp.id}
              // Un piso/recinto necesita al menos 3 vértices: con menos la forma no se pintaría.
              disabled={tp.id !== 'muro' && !puedeCerrar}
              onClick={() => set({ tipo: tp.id, cerrada: tp.id !== 'muro' ? true : f.cerrada })}
            >
              <Icono nombre={tp.icono} /> {t(`constructor.libre.tipo.${tp.id}`, tp.labelEs)}
            </Segmento>
          ))}
        </div>
      </div>

      <div className="flex gap-1.5">
        {f.tipo === 'muro' && puedeCerrar && (
          <Toggle activo={f.cerrada} onClick={() => set({ cerrada: !f.cerrada })}>
            <Icono nombre="poligono" /> {t('constructor.libre.cerrada', 'Forma cerrada')}
          </Toggle>
        )}
        <Toggle activo={f.suave} onClick={() => set({ suave: !f.suave })}>
          <Icono nombre="curva" /> {t('constructor.libre.suave', 'Curva suave')}
        </Toggle>
      </div>

      {/* Muro: textura, color, altura y silueta */}
      {tieneMuro(f.tipo) && (
        <>
          <div className="space-y-1.5">
            <Titulo>{t('paredes.textura', 'Textura')}</Titulo>
            <div className="grid grid-cols-4 gap-1.5">
              {TEXTURAS_MURO.map((tm) => (
                <button
                  key={tm.id}
                  type="button"
                  title={t(`paredes.muro.${tm.id}`, tm.nombre)}
                  onClick={() => set({ muroTipo: tm.id, muroColor: tm.defaultColor })}
                  className={`flex flex-col items-center gap-1 rounded-lg p-1 transition ${
                    muroTipo === tm.id ? 'bg-white/10 ring-1 ring-amber-400/70' : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <span className="h-7 w-full rounded-md border border-white/10" style={{ background: tm.preview }} />
                  <span className="line-clamp-1 text-center text-[8px] leading-tight text-white/60">
                    {t(`paredes.muro.${tm.id}`, tm.nombre)}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Titulo>{t('paredes.color', 'Color')}</Titulo>
            <ColorPicker value={muroColor} onChange={(c) => set({ muroColor: c })} />
          </div>
          <SliderProp
            label={t('paredes.alto', 'Altura')}
            value={alto}
            min={0.3}
            max={3}
            step={0.05}
            fmt={pct}
            onChange={(v) => set({ alto: v })}
            onReset={() => set({ alto: 1 })}
          />
          <div className="space-y-1.5">
            <Titulo>{t('paredes.formas', 'Forma')}</Titulo>
            <div className="flex gap-1 rounded-lg bg-black/20 p-1">
              {TIPOS_FORMA_MURO.map((fm) => (
                <Segmento key={fm.id} activo={silueta === fm.id} onClick={() => set({ silueta: fm.id })}>
                  {t(`paredes.forma.${fm.id}`, fm.nombre)}
                </Segmento>
              ))}
            </div>
            {silueta !== 'recta' && (
              <SliderProp
                label={
                  silueta === 'arco'
                    ? t('paredes.formaAlto', 'Alto del arco')
                    : t('paredes.formaAltoPico', 'Alto del pico')
                }
                value={formaAlto}
                min={0.1}
                max={1.5}
                step={0.05}
                fmt={pct}
                onChange={(v) => set({ formaAlto: v })}
                onReset={() => set({ formaAlto: FORMA_ALTO_TECHO })}
              />
            )}
          </div>
        </>
      )}

      {/* Techo: solo formas cerradas con muro */}
      {tieneTecho(f) && (
        <div className="space-y-2">
          <Titulo>{t('constructor.libre.techo', 'Techo')}</Titulo>
          <div className="grid grid-cols-3 gap-1.5">
            <Chip activo={!f.techo} onClick={() => set({ techo: undefined })}>
              {t('constructor.libre.techo.ninguno', 'Sin techo')}
            </Chip>
            {TECHOS_LIBRE.map((tl) => (
              <Chip
                key={tl.id}
                activo={f.techo === tl.id}
                disabled={tl.id === 'tienda' && !tiendaPosible}
                onClick={() => set({ techo: tl.id })}
              >
                {t(`constructor.libre.techo.${tl.id}`, tl.labelEs)}
              </Chip>
            ))}
          </div>
          {!tiendaPosible && (
            <p className="text-[10px] leading-snug text-white/35">
              {t('constructor.libre.techo.tiendaConvexa', 'La tienda solo va sobre formas convexas.')}
            </p>
          )}
          {f.techo && (
            <>
              <div className="grid grid-cols-4 gap-1.5">
                <BotonMaterialTecho
                  activo={f.techoTipo === undefined}
                  nombre={t('editor.techoCuarto.heredar', 'De la casa')}
                  onClick={() => set({ techoTipo: undefined })}
                >
                  <TechoMaterialSwatch modo="heredar" colorCuarto={techoColor} techoGlobal={techoTipoGlobal} />
                </BotonMaterialTecho>
                <BotonMaterialTecho
                  activo={f.techoTipo === null}
                  nombre={t('constructor.libre.techo.color', 'Color liso')}
                  onClick={() => set({ techoTipo: null })}
                >
                  <TechoMaterialSwatch modo="color" colorCuarto={techoColor} />
                </BotonMaterialTecho>
                {TECHOS_GENERICOS.map((tt) => (
                  <BotonMaterialTecho
                    key={tt.id}
                    activo={f.techoTipo === tt.id}
                    nombre={t(`techo.${tt.id}`, tt.nombre)}
                    onClick={() => set({ techoTipo: tt.id })}
                  >
                    <TechoMaterialSwatch modo="tipo" tipo={tt.id} colorCuarto={techoColor} />
                  </BotonMaterialTecho>
                ))}
              </div>
              <div className="space-y-1.5">
                <Titulo>{t('constructor.libre.techoColor', 'Color del techo')}</Titulo>
                <ColorPicker value={techoColor} onChange={(c) => set({ techoColor: c })} />
              </div>
              {f.techo !== 'plano' && (
                <SliderProp
                  label={t('editor.techoCuarto.altura', 'Altura')}
                  value={f.techoAlto ?? 1}
                  min={0.3}
                  max={2.5}
                  step={0.05}
                  fmt={pct}
                  onChange={(v) => set({ techoAlto: v })}
                  onReset={() => set({ techoAlto: 1 })}
                />
              )}
              {(f.techo === 'una_agua' || f.techo === 'dos_aguas') && (
                <button
                  type="button"
                  // Dos aguas solo distingue el eje del caballete: dos orientaciones, no cuatro.
                  onClick={() => set({ techoDir: ((f.techoDir ?? 0) + 1) % (f.techo === 'dos_aguas' ? 2 : 4) })}
                  className="flex w-full items-center justify-center gap-1 rounded-md border border-white/10 bg-white/5 py-1.5 text-[10px] font-semibold text-white/60 transition hover:bg-white/10"
                >
                  <Icono nombre="rotar-der" /> {t('editor.techoCuarto.dir', 'Girar orientación')}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Piso: textura y color */}
      {tienePiso(f.tipo) && (
        <>
          <div className="space-y-1.5">
            <Titulo>{t('constructor.libre.pisoTextura', 'Textura del piso')}</Titulo>
            <div className="grid grid-cols-4 gap-1.5">
              {PISOS.map((p) => {
                const activo = pisoTipo === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    // Al elegir textura se olvida el color liso: manda el material.
                    onClick={() => set({ pisoTipo: p.id, pisoColor: undefined })}
                    className={[
                      'flex flex-col items-center gap-1 rounded-lg border px-1 py-1.5 text-center transition',
                      activo
                        ? 'border-emerald-400/70 bg-emerald-400/15 text-emerald-400'
                        : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10',
                    ].join(' ')}
                  >
                    <div className="w-full rounded-md bg-cover bg-center" style={{ height: 24, ...swatchStyle(p) }} />
                    <span className="line-clamp-1 text-[8px] font-medium leading-tight">{t(`piso.${p.id}`, p.nombre)}</span>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="space-y-1.5">
            <Titulo>{t('constructor.libre.pisoColor', 'Color del piso')}</Titulo>
            {/* Elegir un color liso apaga la textura (pisoTipo null = color). */}
            <ColorPicker value={pisoColor} onChange={(c) => set({ pisoTipo: null, pisoColor: c })} />
          </div>
        </>
      )}

      {/* Puertas y ventanas del muro */}
      {tieneMuro(f.tipo) && (
        <div className="space-y-1.5">
          <Titulo>{t('constructor.libre.vanos', 'Puertas y ventanas')}</Titulo>
          {vanos.length === 0 ? (
            <p className="text-[10px] leading-snug text-white/35">
              {t(
                'constructor.libre.sinVanos',
                'Toca un muro con la herramienta Puerta o Ventana para abrir un vano.',
              )}
            </p>
          ) : (
            vanos.map((v, i) => (
              <div key={i} className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold text-white/70">
                    <Icono nombre={v.tipo === 'puerta' ? 'cuartos' : 'ventana'} />{' '}
                    {v.tipo === 'puerta' ? t('paredes.puerta', 'Puerta') : t('paredes.ventana', 'Ventana')}
                  </p>
                  <button
                    type="button"
                    onClick={() => void useFormaLibre.getState().quitarVano(f, i)}
                    className="flex items-center gap-1 rounded-md border border-red-400/30 bg-red-400/10 px-2 py-0.5 text-[10px] font-semibold text-red-400/90 transition hover:bg-red-400/20"
                  >
                    <Icono nombre="basura" /> {t('constructor.libre.vano.quitar', 'Quitar')}
                  </button>
                </div>
                <SliderProp
                  label={t('constructor.libre.vano.ancho', 'Ancho')}
                  value={v.ancho}
                  min={0.6}
                  max={4}
                  step={0.1}
                  fmt={(x) => `${x.toFixed(1)} m`}
                  onChange={(x) => setVano(i, { ancho: x })}
                  onReset={() =>
                    setVano(i, { ancho: v.tipo === 'puerta' ? ANCHO_PUERTA_LIBRE : ANCHO_VENTANA_LIBRE })
                  }
                />
                {v.tipo === 'puerta' && (
                  <div className="flex gap-1 rounded-lg bg-black/20 p-1">
                    {TIPOS_PUERTA.map((tp) => (
                      <Segmento
                        key={tp.id}
                        activo={(v.puertaTipo ?? 'recta') === tp.id}
                        onClick={() => setVano(i, { puertaTipo: tp.id, color: tp.defaultColor })}
                      >
                        {t(`paredes.puerta.${tp.id}`, tp.nombre)}
                      </Segmento>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
