// Apariencia de los juegos: cada juego declara qué colores se le pueden cambiar
// (casillas, fichas, fondo…) y el jugador elige un estilo listo o pone los
// suyos. Se guarda por juego, en localStorage como los récords (almacen.ts):
// es preferencia de esta pantalla, no dato que viaje.
import { useSyncExternalStore } from 'react'
import { useT } from '../../../core/i18n/useT'
import { Icono } from '../../../core/ui/iconos/Icono'
import { guardarTexto, leerTexto } from './almacen'
import type { IdJuegoReal } from './catalogo'

/**
 * Papel genérico de un color. Los estilos listos dan un color por papel; así
 * un mismo «Madera» sirve para el tablero del ajedrez y para el paño del billar.
 */
export type PapelColor = 'fondo' | 'claro' | 'oscuro' | 'uno' | 'dos' | 'acento'

export interface ColorJuego {
  /** Clave del color dentro del juego (`casillaClara`, `fichaA`…). */
  clave: string
  /** Rótulo en español; la clave i18n es `entre.j.<juego>.ap.<clave>`. */
  labelEs: string
  papel: PapelColor
  /** El color de siempre: es el del estilo «Clásico». */
  porDefecto: string
}

export type IdEstilo = 'clasico' | 'madera' | 'marmol' | 'neon' | 'pastel' | 'oceano'

export const ESTILOS: { id: IdEstilo; labelEs: string; colores: Record<PapelColor, string> | null }[] = [
  { id: 'clasico', labelEs: 'Clásico', colores: null },
  {
    id: 'madera',
    labelEs: 'Madera',
    colores: { fondo: '#3b2416', claro: '#e8c99b', oscuro: '#8b5a2b', uno: '#f5ead8', dos: '#2b1a10', acento: '#d4a24c' },
  },
  {
    id: 'marmol',
    labelEs: 'Mármol',
    colores: { fondo: '#2a2d34', claro: '#eceff1', oscuro: '#8d99a6', uno: '#ffffff', dos: '#263238', acento: '#b0bec5' },
  },
  {
    id: 'neon',
    labelEs: 'Neón',
    colores: { fondo: '#0a0618', claro: '#312e81', oscuro: '#140f3a', uno: '#22d3ee', dos: '#f472b6', acento: '#a3e635' },
  },
  {
    id: 'pastel',
    labelEs: 'Pastel',
    colores: { fondo: '#fdf2f8', claro: '#fce7f3', oscuro: '#c4b5fd', uno: '#fb7185', dos: '#60a5fa', acento: '#f59e0b' },
  },
  {
    id: 'oceano',
    labelEs: 'Océano',
    colores: { fondo: '#04263b', claro: '#a5f3fc', oscuro: '#0e7490', uno: '#f8fafc', dos: '#0c4a6e', acento: '#fbbf24' },
  },
]

interface Eleccion {
  estilo: IdEstilo
  /** Colores puestos a mano: mandan sobre el estilo. */
  propios: Record<string, string>
}

const COLORES = new Map<IdJuegoReal, ColorJuego[]>()

/** Cada juego registra sus colores al importarse (como `registrarJuegoMesa`). */
export function registrarApariencia(juego: IdJuegoReal, colores: ColorJuego[]): void {
  COLORES.set(juego, colores)
}

export function coloresDe(juego: IdJuegoReal): ColorJuego[] | undefined {
  return COLORES.get(juego)
}

const CLAVE_LS = (juego: IdJuegoReal) => `apariencia-${juego}`
const HEX = /^#[0-9a-f]{6}$/i
const cache = new Map<IdJuegoReal, Eleccion>()
const oyentes = new Set<() => void>()

function leer(juego: IdJuegoReal): Eleccion {
  const enCache = cache.get(juego)
  if (enCache) return enCache
  let e: Eleccion = { estilo: 'clasico', propios: {} }
  try {
    const crudo = JSON.parse(leerTexto(CLAVE_LS(juego)) ?? 'null') as Partial<Eleccion> | null
    if (crudo && ESTILOS.some((s) => s.id === crudo.estilo)) {
      const propios: Record<string, string> = {}
      for (const [k, v] of Object.entries(crudo.propios ?? {})) if (typeof v === 'string' && HEX.test(v)) propios[k] = v
      e = { estilo: crudo.estilo as IdEstilo, propios }
    }
  } catch {
    // Sin almacenamiento (o con basura) se juega con el clásico.
  }
  cache.set(juego, e)
  return e
}

function escribir(juego: IdJuegoReal, e: Eleccion): void {
  cache.set(juego, e)
  try {
    guardarTexto(CLAVE_LS(juego), JSON.stringify(e))
  } catch {
    // Sin almacenamiento la elección dura lo que la pestaña.
  }
  for (const o of oyentes) o()
}

function suscribir(fn: () => void): () => void {
  oyentes.add(fn)
  return () => {
    oyentes.delete(fn)
  }
}

/**
 * Lo resuelto, por elección: la misma elección devuelve el MISMO objeto, así
 * los juegos pueden poner los colores en las dependencias de un efecto.
 */
const resueltos = new WeakMap<Eleccion, Record<string, string>>()

/** El color de cada clave con la elección vigente: propio > estilo > de siempre. */
function resolver(juego: IdJuegoReal, e: Eleccion): Record<string, string> {
  const hecho = resueltos.get(e)
  if (hecho) return hecho
  const estilo = ESTILOS.find((s) => s.id === e.estilo)?.colores
  const salida: Record<string, string> = {}
  for (const c of COLORES.get(juego) ?? []) salida[c.clave] = e.propios[c.clave] ?? estilo?.[c.papel] ?? c.porDefecto
  resueltos.set(e, salida)
  return salida
}

/**
 * Los colores del juego, ya resueltos y suscritos (el panel los cambia en vivo).
 * Devuelve un objeto con una entrada por cada `clave` que registró el juego.
 */
export function useApariencia(juego: IdJuegoReal): Record<string, string> {
  const e = useSyncExternalStore(suscribir, () => leer(juego))
  return resolver(juego, e)
}

/** Panel «Apariencia»: estilos listos arriba y, debajo, cada color a mano. */
export function PanelApariencia({ juego }: { juego: IdJuegoReal }) {
  const t = useT()
  const e = useSyncExternalStore(suscribir, () => leer(juego))
  const colores = COLORES.get(juego) ?? []
  const actuales = resolver(juego, e)
  if (!colores.length) return null
  return (
    <div className="ui-pop space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-white/60">{t('entre.j.ap.estilo', 'Estilo')}</p>
        <div className="flex flex-wrap gap-1.5">
          {ESTILOS.map((s) => {
            // La muestra del estilo: sus colores (o los del juego, en el clásico).
            const muestra = s.colores
              ? [s.colores.claro, s.colores.oscuro, s.colores.uno, s.colores.dos]
              : colores.slice(0, 4).map((c) => c.porDefecto)
            const activo = e.estilo === s.id
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={activo}
                // Cambiar de estilo deja atrás los colores puestos a mano.
                onClick={() => escribir(juego, { estilo: s.id, propios: {} })}
                className={`flex items-center gap-1.5 rounded-xl border px-2 py-1 text-xs font-semibold transition ${
                  activo ? 'border-accent bg-accent/20' : 'border-white/10 hover:bg-white/10'
                }`}
              >
                <span className="flex overflow-hidden rounded-md border border-black/20">
                  {muestra.map((c, i) => (
                    <span key={i} className="h-4 w-2" style={{ background: c }} />
                  ))}
                </span>
                {t(`entre.j.ap.estilo.${s.id}`, s.labelEs)}
              </button>
            )
          })}
        </div>
      </div>
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-white/60">{t('entre.j.ap.colores', 'Colores')}</p>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {colores.map((c) => (
            <label
              key={c.clave}
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 px-2 py-1.5 text-xs hover:bg-white/10"
            >
              <input
                type="color"
                value={actuales[c.clave]}
                onChange={(ev) => escribir(juego, { ...e, propios: { ...e.propios, [c.clave]: ev.target.value } })}
                className="h-6 w-6 shrink-0 cursor-pointer rounded-md border-0 bg-transparent p-0"
              />
              <span className="min-w-0 truncate">{t(`entre.j.${juego}.ap.${c.clave}`, c.labelEs)}</span>
            </label>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={() => escribir(juego, { estilo: 'clasico', propios: {} })}
        className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold hover:bg-white/20"
      >
        <Icono nombre="sincronizar" /> {t('entre.j.ap.restablecer', 'Restablecer')}
      </button>
    </div>
  )
}
