import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { IconoCuarto } from '../../core/ui/IconoCuarto'
import type { PropsArrastre } from '../../core/ui/comun/arrastre'
import { formatoBytes } from '../../core/cuenta/almacen'
import { FILA_INTERACTIVA, TARJETA } from '../_shared/ui'
import { iconoDeMime } from './constantes'
import { destinoCarpeta, fechaDe, type Item } from './modelo'

export type ModoVista = 'rejilla' | 'lista'

/** Miniatura de un blob (se revoca al desmontar); sin ella, el icono del tipo. */
function Miniatura({ blob, mime }: { blob?: Blob; mime: string }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!blob) return
    const u = URL.createObjectURL(blob)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- la URL nace y muere con el efecto (StrictMode la revocaría en un useMemo)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  if (blob && url) return <img src={url} alt="" draggable={false} className="h-full w-full object-cover" />
  return <Icono nombre={iconoDeMime(mime)} className="text-3xl text-white/60" />
}

/** Lo que se pinta como vista previa: miniatura propia, o el blob si es una imagen. */
function vistaPrevia(i: Item): ReactNode {
  if (i.tipo === 'archivo') return <Miniatura blob={i.archivo.miniatura} mime={i.archivo.mime} />
  if (i.tipo === 'app') {
    const e = i.elem
    return <Miniatura blob={e.miniatura ?? (e.mime.startsWith('image/') ? e.blob : undefined)} mime={e.mime} />
  }
  return null
}

function IconoItem({ i, className = '' }: { i: Item; className?: string }) {
  if (i.tipo === 'virtual' && i.cuarto) {
    return (
      <span className={`grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg ${className}`}>
        <IconoCuarto cuarto={i.cuarto} />
      </span>
    )
  }
  const nombre = i.tipo === 'virtual' ? i.icono : 'carpeta'
  return <Icono nombre={nombre} className={`text-2xl ${className}`} />
}

export interface PropsVista {
  items: Item[]
  modo: ModoVista
  seleccion: Set<string>
  /** `data-destino` sobre el que hay algo a punto de caer. */
  resaltado: string | null
  enMano: string | null
  /** Texto bajo el nombre en lugar del de siempre (la ruta en Recientes o en la búsqueda). */
  subtitulo?: (i: Item) => string | undefined
  alPulsar: (i: Item, e: MouseEvent, tactil: boolean) => void
  alDoble: (i: Item) => void
  alMenu: (i: Item, x: number, y: number) => void
  alMarcar: (i: Item) => void
  arrastre: (i: Item) => PropsArrastre | undefined
}

/**
 * Los elementos de la ubicación, en cuadrícula o en lista. Con ratón, un clic
 * selecciona y el doble clic abre (como Drive); con el dedo, el toque abre y el
 * círculo selecciona. El clic derecho y el «⋯» abren el menú.
 */
export function Vista(p: PropsVista) {
  const t = useT()
  const tactil = useRef(false)
  const hayMarcados = p.seleccion.size > 0

  const destinoDe = (i: Item) => (i.tipo === 'carpeta' ? destinoCarpeta(i.carpeta.id!) : i.tipo === 'virtual' ? i.destino : undefined)

  const meta = (i: Item): string => {
    const sub = p.subtitulo?.(i)
    if (sub) return sub
    if (i.tipo === 'carpeta' || i.tipo === 'virtual') {
      if (i.n == null) return ''
      return i.n === 1 ? t('archivos.carpeta.uno', '1 elemento') : t('archivos.carpeta.n', '{n} elementos', { n: i.n })
    }
    const bytes = i.tipo === 'archivo' ? i.archivo.bytes : i.elem.bytes
    const fecha = fechaDe(i)
    return fecha ? `${formatoBytes(bytes)} · ${new Date(fecha).toLocaleDateString()}` : formatoBytes(bytes)
  }

  const propsComunes = (i: Item) => {
    const arr = p.arrastre(i)
    const destino = destinoDe(i)
    return {
      ...arr,
      'data-destino': destino,
      onPointerDown: (e: React.PointerEvent) => {
        tactil.current = e.pointerType !== 'mouse'
        arr?.onPointerDown(e)
      },
      onClick: (e: MouseEvent) => p.alPulsar(i, e, tactil.current),
      onDoubleClick: () => p.alDoble(i),
      onContextMenu: (e: MouseEvent) => {
        e.preventDefault()
        p.alMenu(i, e.clientX, e.clientY)
      },
      role: 'button',
      tabIndex: 0,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && e.target === e.currentTarget) p.alDoble(i)
      },
    }
  }

  const estado = (i: Item) => {
    const marcado = p.seleccion.has(i.k)
    const destino = destinoDe(i)
    return [
      marcado ? 'ring-2 ring-sky-400/80 bg-sky-400/10' : '',
      destino && p.resaltado === destino ? 'ring-2 ring-emerald-400/80' : '',
      p.enMano && (p.enMano === i.k || (marcado && p.seleccion.has(p.enMano))) ? 'opacity-40' : '',
    ].join(' ')
  }

  const circulo = (i: Item) =>
    i.tipo === 'carpeta' || i.tipo === 'archivo' ? (
      <button
        type="button"
        aria-label={t('archivos.seleccionar', 'Seleccionar')}
        onClick={(e) => {
          e.stopPropagation()
          p.alMarcar(i)
        }}
        onDoubleClick={(e) => e.stopPropagation()}
        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[11px] transition ${
          p.seleccion.has(i.k)
            ? 'border-sky-400 bg-sky-400 text-black opacity-100'
            : `border-white/40 bg-black/40 text-transparent ${hayMarcados ? 'opacity-100' : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100'}`
        }`}
      >
        <Icono nombre="confirmar" />
      </button>
    ) : null

  const botonMenu = (i: Item) => (
    <button
      type="button"
      aria-label={t('archivos.opciones', 'Opciones')}
      onClick={(e) => {
        e.stopPropagation()
        const r = e.currentTarget.getBoundingClientRect()
        p.alMenu(i, r.left, r.bottom + 4)
      }}
      onDoubleClick={(e) => e.stopPropagation()}
      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-white/50 hover:bg-white/10"
    >
      <Icono nombre="masOpciones" />
    </button>
  )

  const estrella = (i: Item) =>
    (i.tipo === 'carpeta' && i.carpeta.destacado) || (i.tipo === 'archivo' && i.archivo.destacado) ? (
      <Icono nombre="estrella" className="shrink-0 text-xs text-amber-300" />
    ) : null

  const soloAqui = (i: Item) =>
    i.tipo === 'app' && i.elem.soloAqui ? (
      <span className="shrink-0 rounded bg-amber-300/15 px-1 text-[10px] text-amber-200">{t('archivos.soloAqui', 'Solo aquí')}</span>
    ) : null

  if (p.modo === 'lista') {
    return (
      <div className={`${TARJETA} divide-y divide-white/5 p-1`}>
        {p.items.map((i) => (
          <div
            key={i.k}
            {...propsComunes(i)}
            className={`group flex cursor-default select-none items-center gap-2 rounded-lg px-2 py-1.5 ${FILA_INTERACTIVA} ${estado(i)}`}
          >
            {circulo(i) ?? <span className="w-6 shrink-0" />}
            <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-md bg-black/20">
              {vistaPrevia(i) ?? <IconoItem i={i} className="text-lg" />}
            </span>
            <span className="flex min-w-0 flex-1 items-center gap-1.5">
              <span className="truncate text-sm">{i.tipo === 'virtual' ? i.nombre : i.tipo === 'carpeta' ? i.carpeta.nombre : i.tipo === 'archivo' ? i.archivo.nombre : i.elem.nombre}</span>
              {estrella(i)}
              {soloAqui(i)}
            </span>
            <span className="hidden w-48 shrink-0 truncate text-end text-xs text-white/45 sm:block">{meta(i)}</span>
            {i.tipo !== 'virtual' ? botonMenu(i) : <span className="w-7 shrink-0" />}
          </div>
        ))}
      </div>
    )
  }

  const compactos = p.items.filter((i) => i.tipo === 'carpeta' || i.tipo === 'virtual')
  const conVista = p.items.filter((i) => i.tipo === 'archivo' || i.tipo === 'app')
  return (
    <div className="space-y-3">
      {compactos.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {compactos.map((i) => (
            <div
              key={i.k}
              {...propsComunes(i)}
              className={`${TARJETA} ${FILA_INTERACTIVA} group relative flex cursor-default select-none items-center gap-2 p-2.5 ${estado(i)}`}
            >
              {i.tipo === 'carpeta' && <span className="absolute -start-1.5 -top-1.5">{circulo(i)}</span>}
              <IconoItem i={i} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1">
                  <span className="truncate text-sm font-semibold">{i.tipo === 'virtual' ? i.nombre : i.tipo === 'carpeta' ? i.carpeta.nombre : ''}</span>
                  {estrella(i)}
                </span>
                <span className="block truncate text-xs text-white/45">{meta(i)}</span>
              </span>
              {i.tipo === 'carpeta' && botonMenu(i)}
            </div>
          ))}
        </div>
      )}
      {conVista.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {conVista.map((i) => (
            <div
              key={i.k}
              {...propsComunes(i)}
              className={`${TARJETA} ${FILA_INTERACTIVA} group relative flex cursor-default select-none flex-col overflow-hidden p-0 ${estado(i)}`}
            >
              <span className="pointer-events-none grid h-24 place-items-center overflow-hidden bg-black/20">{vistaPrevia(i)}</span>
              <span className="absolute start-1.5 top-1.5">{circulo(i)}</span>
              <span className="flex items-start gap-1 p-2">
                <span className="min-w-0 flex-1 space-y-0.5">
                  <span className="flex items-center gap-1">
                    <span className="truncate text-sm font-semibold">{i.tipo === 'archivo' ? i.archivo.nombre : i.tipo === 'app' ? i.elem.nombre : ''}</span>
                    {estrella(i)}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="truncate text-xs text-white/45">{meta(i)}</span>
                    {soloAqui(i)}
                  </span>
                </span>
                {botonMenu(i)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
