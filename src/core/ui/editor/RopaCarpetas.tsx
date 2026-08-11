import { useState } from 'react'
import { useCarpetasRopa } from '../../state/carpetasRopaStore'
import { useEditorUi } from '../../state/editorUiStore'
import { useDiseño } from '../../state/disenoStore'
import { confirmar, pedirTexto } from '../../state/confirmarStore'
import { prendasCustomRepo } from '../../data/repository'
import {
  PRENDAS,
  PRENDA_COLOR_DEFAULT,
  anclasDe,
  type PrendaCategoriaId,
  type PrendaId,
  type Ropa,
} from '../../house/apariencia'
import { hornearPrenda, PIERDE_MARCHA } from '../../house/hornearPrenda'
import { GuardarropaEditor } from './GuardarropaEditor'
import { useReordenRopa } from './useEditorSecciones'
import { iniciarArrastre } from '../arrastre'
import { useT } from '../../i18n/useT'
import { Icono } from '../iconos/Icono'
import type { CarpetaRopa } from '../../data/db'

/**
 * Contenido de una categoría de la pestaña Ropa: sus carpetas (una por prenda de
 * fábrica, más las que cree el usuario) y, dentro de cada una, sus elementos.
 *
 * La prenda de fábrica es un elemento sin fila propia: su geometría vive en
 * `Prendas.tsx`. Para editarla se hornea una COPIA de piezas (`hornearPrenda`),
 * que el usuario ya puede retocar como cualquier prenda a medida.
 */
export function CarpetasDeCategoria({
  categoria,
  ropa,
  setPrenda,
  esAvatar,
}: {
  categoria: PrendaCategoriaId
  ropa: Ropa
  setPrenda: (id: PrendaId, color: string | null) => void
  esAvatar: boolean
}) {
  const t = useT()
  const carpetas = useCarpetasRopa((s) => s.carpetas)
  const crear = useCarpetasRopa((s) => s.crear)
  const reordenarCarpetas = useCarpetasRopa((s) => s.reordenar)

  const dePropia = carpetas
    .filter((c) => c.categoria === categoria)
    .sort((a, b) => a.orden - b.orden)
  const visibles = dePropia.filter((c) => !c.oculta)
  const ocultas = dePropia.filter((c) => c.oculta)

  const arr = useReordenRopa((ids) => void reordenarCarpetas(ids))

  const nuevaCarpeta = async () => {
    const nombre = await pedirTexto({
      titulo: t('editor.ropa.carpetaNueva', 'Nueva carpeta'),
      mensaje: t('editor.ropa.carpetaNombre', '¿Cómo se llama?'),
    })
    if (nombre) await crear(categoria, nombre)
  }

  return (
    <div className="space-y-1.5">
      {visibles.map((c) => (
        <Carpeta
          key={c.id}
          carpeta={c}
          hermanas={visibles}
          ropa={ropa}
          setPrenda={setPrenda}
          esAvatar={esAvatar}
          arr={arr}
        />
      ))}

      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => void nuevaCarpeta()}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/15 px-2 py-1.5 text-[11px] font-semibold text-white/50 transition hover:bg-white/10 hover:text-white/80"
        >
          <Icono nombre="agregar" /> {t('editor.ropa.carpetaNueva', 'Nueva carpeta')}
        </button>
        {ocultas.length > 0 && <CarpetasOcultas carpetas={ocultas} />}
      </div>
    </div>
  )
}

/** Botón que despliega las carpetas de fábrica escondidas para recuperarlas. */
function CarpetasOcultas({ carpetas }: { carpetas: CarpetaRopa[] }) {
  const t = useT()
  const restaurar = useCarpetasRopa((s) => s.restaurar)
  const [abierto, setAbierto] = useState(false)
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] font-semibold text-white/50 transition hover:bg-white/10"
      >
        <Icono nombre="ver" /> {carpetas.length}
      </button>
      {abierto && (
        <div className="absolute bottom-full right-0 z-10 mb-1 w-44 space-y-1 rounded-lg border border-white/10 bg-black/85 p-1.5 backdrop-blur">
          <p className="px-1 text-[10px] uppercase tracking-wider text-white/40">
            {t('editor.ropa.ocultas', 'Carpetas escondidas')}
          </p>
          {carpetas.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => void restaurar(c.id!)}
              className="flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-[11px] text-white/70 transition hover:bg-white/10"
            >
              <Icono emoji={c.emoji ?? '📁'} />
              <span className="min-w-0 flex-1 truncate">{c.nombre}</span>
              <Icono nombre="restaurar" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

type Reorden = ReturnType<typeof useReordenRopa>

function Carpeta({
  carpeta,
  hermanas,
  ropa,
  setPrenda,
  esAvatar,
  arr,
}: {
  carpeta: CarpetaRopa
  hermanas: CarpetaRopa[]
  ropa: Ropa
  setPrenda: (id: PrendaId, color: string | null) => void
  esAvatar: boolean
  arr: Reorden
}) {
  const t = useT()
  const id = carpeta.id!
  // El plegado comparte el mecanismo del acordeón de Configuraciones.
  const abierto = useEditorUi((s) => s.configAbiertos[`ropa-carp-${id}`] === true)
  const toggle = useEditorUi((s) => s.toggleConfigGrupo)
  const renombrar = useCarpetasRopa((s) => s.renombrar)
  const eliminar = useCarpetasRopa((s) => s.eliminar)
  const [abrirPrendaId, setAbrirPrendaId] = useState<number | undefined>()

  const pedirNombre = async () => {
    const nombre = await pedirTexto({
      titulo: t('editor.ropa.renombrar', 'Cambiar el nombre'),
      valor: carpeta.nombre,
    })
    if (nombre) await renombrar(id, nombre)
  }

  const borrar = async () => {
    const ok = await confirmar({
      titulo: carpeta.base
        ? t('editor.ropa.ocultar', 'Esconder «{nombre}»', { nombre: carpeta.nombre })
        : t('editor.ropa.borrar', 'Borrar «{nombre}»', { nombre: carpeta.nombre }),
      mensaje: carpeta.base
        ? t(
            'editor.ropa.ocultarMsg',
            'La carpeta deja de listarse, pero no se pierde nada: la ropa que ya lleves puesta sigue puesta y puedes recuperarla cuando quieras.',
          )
        : t(
            'editor.ropa.borrarMsg',
            'Sus elementos pasan a otra carpeta de la misma categoría; no se borra ninguna prenda.',
          ),
      textoOk: carpeta.base ? t('editor.ropa.ocultarOk', 'Esconder') : t('editor.ropa.borrarOk', 'Borrar'),
      peligro: !carpeta.base,
    })
    if (ok) await eliminar(id)
  }

  const esObjetivo = arr.objetivo === id && arr.arrastrando !== id

  return (
    <div
      className={[
        'overflow-hidden rounded-lg border bg-white/5 transition',
        esObjetivo ? 'border-emerald-400/50 ring-1 ring-emerald-400/30' : 'border-white/10',
        arr.arrastrando === id ? 'opacity-40' : 'opacity-100',
      ].join(' ')}
      onDragEnter={(e) => {
        e.preventDefault()
        arr.entrarObjetivo(id)
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        arr.soltar(id, hermanas.map((c) => c.id!))
      }}
    >
      <div className="flex items-center">
        <button
          type="button"
          draggable
          onDragStart={(e) => {
            iniciarArrastre(
              e.currentTarget.parentElement?.parentElement ?? e.currentTarget,
              e.dataTransfer,
              e.nativeEvent.offsetX,
              e.nativeEvent.offsetY,
            )
            arr.iniciarArrastre(id)
          }}
          onDragEnd={arr.finArrastre}
          title={t('editor.sec.reordenar', 'Arrastrar para reordenar')}
          className="ml-0.5 flex h-7 w-6 shrink-0 cursor-grab items-center justify-center rounded text-sm leading-none text-white/35 transition hover:bg-white/10 hover:text-white/70 active:cursor-grabbing"
        >
          ⠿
        </button>
        <button
          type="button"
          onClick={() => toggle(`ropa-carp-${id}`)}
          aria-expanded={abierto}
          className="flex min-w-0 flex-1 items-center gap-2 py-2 pr-1 text-left transition hover:bg-white/10"
        >
          <span className="text-base leading-none">
            <Icono emoji={carpeta.emoji ?? '📁'} />
          </span>
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-white/75">
            {carpeta.nombre}
          </span>
          <span className="shrink-0 text-[10px] text-white/40">{abierto ? '▼' : '▶'}</span>
        </button>
        <button
          type="button"
          onClick={() => void pedirNombre()}
          title={t('editor.ropa.renombrar', 'Cambiar el nombre')}
          className="grid h-7 w-7 shrink-0 place-items-center text-xs text-white/40 transition hover:bg-white/10 hover:text-white/80"
        >
          <Icono nombre="editar" />
        </button>
        <button
          type="button"
          onClick={() => void borrar()}
          title={
            carpeta.base
              ? t('editor.ropa.ocultarTip', 'Esconder la carpeta')
              : t('editor.ropa.borrarTip', 'Borrar la carpeta')
          }
          className="mr-1 grid h-7 w-7 shrink-0 place-items-center text-xs text-white/40 transition hover:bg-red-500/25 hover:text-white/80"
        >
          <Icono nombre={carpeta.base ? 'ocultar' : 'basura'} />
        </button>
      </div>

      {abierto && (
        <div className="space-y-1.5 border-t border-white/10 p-2">
          {carpeta.base && (
            <FilaFabrica
              prendaId={carpeta.base as PrendaId}
              ropa={ropa}
              setPrenda={setPrenda}
              esAvatar={esAvatar}
              carpetaId={id}
              onHorneada={setAbrirPrendaId}
            />
          )}
          {esAvatar ? (
            <GuardarropaEditor carpetaId={id} abrirPrendaId={abrirPrendaId} />
          ) : (
            !carpeta.base && (
              <p className="text-[11px] leading-snug text-white/40">
                {t(
                  'editor.ropa.soloAvatar',
                  'Los elementos a medida son del personaje principal: los asistentes solo llevan las prendas de fábrica.',
                )}
              </p>
            )
          )}
        </div>
      )}
    </div>
  )
}

/** El elemento de fábrica de una carpeta: se pone, se colorea y se copia a piezas. */
function FilaFabrica({
  prendaId,
  ropa,
  setPrenda,
  esAvatar,
  carpetaId,
  onHorneada,
}: {
  prendaId: PrendaId
  ropa: Ropa
  setPrenda: (id: PrendaId, color: string | null) => void
  esAvatar: boolean
  carpetaId: number
  onHorneada: (id: number) => void
}) {
  const t = useT()
  const avatar = useDiseño((s) => s.avatar)
  const meta = PRENDAS.find((p) => p.id === prendaId)
  const puesta = !!ropa[prendaId]
  const color = ropa[prendaId]?.color ?? PRENDA_COLOR_DEFAULT[prendaId]
  const nombre = t(`editor.pers.prenda.${prendaId}`, meta?.nombre ?? prendaId)

  const hornear = async () => {
    const piezas = hornearPrenda(prendaId, anclasDe(avatar), color)
    const ok = await confirmar({
      titulo: t('editor.ropa.hornear', 'Editar «{nombre}»', { nombre }),
      mensaje: PIERDE_MARCHA.has(prendaId)
        ? t(
            'editor.ropa.hornearMsgMarcha',
            'Se crea una copia editable de {n} piezas. La copia ya no se mueve con tus pasos ni se adapta a otros cuerpos; el original se queda en la carpeta.',
            { n: piezas.length },
          )
        : t(
            'editor.ropa.hornearMsg',
            'Se crea una copia editable de {n} piezas. La copia deja de adaptarse a otros cuerpos; el original se queda en la carpeta.',
            { n: piezas.length },
          ),
      textoOk: t('editor.ropa.hornearOk', 'Crear copia editable'),
    })
    if (!ok) return
    const id = await prendasCustomRepo.add({
      nombre: t('editor.ropa.copiaDe', 'Mi {nombre}', { nombre }),
      piezas: JSON.stringify(piezas),
      carpetaId,
      orden: -1, // la copia encabeza la carpeta, junto al original
      origen: prendaId,
      creadoEn: Date.now(),
    })
    onHorneada(id)
  }

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 transition ${
        puesta ? 'border-accent/30 bg-accent/10' : 'border-white/10 bg-white/5'
      }`}
    >
      <button
        type="button"
        onClick={() => setPrenda(prendaId, puesta ? null : color)}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <span className="text-lg leading-none">
          <Icono emoji={meta?.emoji ?? '👕'} />
        </span>
        <span className={`truncate text-xs font-semibold ${puesta ? 'text-white/90' : 'text-white/55'}`}>
          {nombre}
        </span>
      </button>
      {puesta && (
        <input
          type="color"
          value={color}
          onChange={(e) => setPrenda(prendaId, e.target.value)}
          className="h-7 w-9 cursor-pointer rounded border border-white/10 bg-transparent"
          title={t('editor.pers.colorPrenda', 'Color de la prenda')}
        />
      )}
      {esAvatar && (
        <button
          type="button"
          onClick={() => void hornear()}
          title={t('editor.ropa.hornearTip', 'Crear una copia editable pieza por pieza')}
          className="grid h-6 w-6 place-items-center rounded-md bg-white/5 text-xs text-white/50 transition hover:bg-white/15"
        >
          <Icono nombre="editar" />
        </button>
      )}
      <button
        type="button"
        onClick={() => setPrenda(prendaId, puesta ? null : color)}
        className={`grid h-6 w-6 place-items-center rounded-md text-xs transition ${
          puesta ? 'bg-accent/30 text-accent' : 'bg-white/5 text-white/40 hover:bg-white/15'
        }`}
        title={puesta ? t('editor.pers.quitarPrenda', 'Quitar') : t('editor.pers.ponerPrenda', 'Poner')}
      >
        {puesta ? '✓' : '+'}
      </button>
    </div>
  )
}
