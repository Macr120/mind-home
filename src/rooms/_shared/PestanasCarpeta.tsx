import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { sonar } from '../../core/audio/sfx'
import { vibrar } from '../../core/audio/vibrar'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import { acento, tinta, tono } from './acento'

export interface ItemPestana<T extends string> {
  id: T
  icono?: NombreIcono
  /** Emoji guardado como dato (secciones de plantillas custom); `icono` manda si están los dos. */
  emoji?: string
  labelEs?: string
  /** Texto YA resuelto (nombres libres del usuario): salta el i18n. */
  label?: string
  /** Clave i18n propia cuando `${prefijoClave}.<id>` ya la usa otro menú. */
  clave?: string
  /** Color propio del ítem activo (caso agenda: un color por área, no por app). */
  color?: string
  /** Nodo extra tras el texto (caso biblioteca: puntito de estudio en curso). */
  extra?: ReactNode
}

// `flex` y no el centrado nativo del botón: con icono, texto y chevron sueltos,
// un rótulo que no cabe partía en dos líneas y empujaba al chevron debajo,
// dejando la fila descuadrada. En fila flex todo queda centrado en ambos ejes.
const BASE = {
  raiz: 'flex items-center justify-center gap-1 rounded-xl py-2.5 text-center text-xs font-semibold transition',
  sub: 'flex items-center justify-center gap-1 rounded-lg py-1.5 text-center text-xs font-semibold transition',
}

/**
 * Fila de pestañas estilo «árbol de carpetas»: la activa lleva el color de su
 * app (`color`; sin él, el acento del tema) y las hermanas se atenúan. En la
 * fila raíz, re-pulsar la activa pliega el contenido; el estado vive en el
 * padre, que es quien oculta subfila y cuerpo. Solo los clicks reales pliegan
 * (`isTrusted`): los del tutorial (`clickTut`) nunca, para que los tours no se
 * queden sin anclas.
 */
export function PestanasCarpeta<T extends string>({
  items,
  activo,
  onCambio,
  prefijoClave = '',
  prefijoTut = prefijoClave,
  variante,
  nivel = variante === 'raiz' ? 1 : 2,
  flecha = true,
  color,
  desplazable = false,
  rejilla = false,
  plegado,
  onAlternarPliegue,
}: {
  items: ItemPestana<T>[]
  activo: T
  onCambio: (id: T) => void
  /** Prefijo i18n: `t(`${prefijoClave}.${id}`, labelEs)`, salvo `item.clave`/`item.label`. */
  prefijoClave?: string
  /** Prefijo de las anclas `data-tut`; por defecto igual a `prefijoClave`. */
  prefijoTut?: string
  /** raiz = carpetas · sub = ramas (más compactas). */
  variante: 'raiz' | 'sub'
  /** Peldaño de la escalera tonal: 1 color puro, 2 y 3 tonos apagados. Default: raíz 1, sub 2. */
  nivel?: 1 | 2 | 3
  /** Con `false` la activa no pinta el chevron (conmutadores de formulario: son inputs, no ramas). */
  flecha?: boolean
  /** Color de la app: el activo se pinta con él (item.color manda si está). */
  color?: string
  /** Con muchas pestañas: scroll horizontal en vez de repartir el ancho. */
  desplazable?: boolean
  /** Rejilla-panel: las pestañas envuelven en filas (catálogos largos) en vez de desplazarse. */
  rejilla?: boolean
  /** Plegado controlado por el padre (solo tiene sentido en la fila raíz). */
  plegado?: boolean
  onAlternarPliegue?: () => void
}) {
  const t = useT()
  const riel = useRef<HTMLDivElement>(null)
  const [pildora, setPildora] = useState<{ izq: number; arriba: number; ancho: number; alto: number } | null>(null)

  // La píldora de color persigue a la pestaña activa: se mide sobre el DOM ya
  // pintado (offset*) y el CSS anima posición y tamaño — también en vertical,
  // que en modo rejilla la activa puede cambiar de fila.
  // El ResizeObserver la recoloca cuando el carril cambia de ancho.
  useLayoutEffect(() => {
    const cont = riel.current
    if (!cont) return
    const medir = () => {
      const btn = cont.querySelector<HTMLElement>('[aria-selected="true"]')
      // Sin activa (p. ej. duración personalizada fuera de los presets) la píldora se esconde.
      setPildora(
        btn
          ? { izq: btn.offsetLeft, arriba: btn.offsetTop, ancho: btn.offsetWidth, alto: btn.offsetHeight }
          : null,
      )
    }
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(cont)
    return () => ro.disconnect()
  }, [activo, items.length, plegado])

  // El color contextual por ítem (verde/rojo, áreas…) va PURO; solo el de la app se entona.
  const propio = items.find((i) => i.id === activo)?.color
  const colorActivo = propio ?? (color ? tono(color, nivel) : undefined)
  // Carril: las pestañas viven sobre un panel; el radio del panel envuelve al de los botones.
  const marco = `relative border border-white/10 bg-white/5 p-1 ${variante === 'raiz' ? 'rounded-2xl' : 'rounded-xl'}`
  // Sin scroll ni rejilla, el carril ENVUELVE: con los rótulos en una sola línea
  // (ver `BASE`) una fila muy llena desbordaría el panel, y una segunda fila se
  // lee mejor que unos botones partiendo palabras. La píldora ya sigue al activo
  // en vertical.
  const panel = rejilla
    ? `${marco} grid grid-cols-3 gap-1 sm:grid-cols-4`
    : desplazable
      ? `${marco} flex gap-1 overflow-x-auto`
      : `${marco} flex flex-wrap gap-1`
  return (
    <div role="tablist" ref={riel} className={panel}>
      {pildora && (
        <span
          aria-hidden
          className={`ui-accent-bg pointer-events-none absolute transition-[left,top,width,height] duration-300 ease-out motion-reduce:transition-none ${
            variante === 'raiz' ? 'rounded-xl' : 'rounded-lg'
          }`}
          style={{
            left: pildora.izq,
            top: pildora.arriba,
            width: pildora.ancho,
            height: pildora.alto,
            ...acento(colorActivo),
          }}
        />
      )}
      {items.map((item) => {
        const esActiva = item.id === activo
        const clase = esActiva ? '' : 'text-white/40 hover:bg-white/10 hover:text-white/80'
        // flex-1 + shrink-0: reparten el ancho del carril y, si no caben, asoma el scroll.
        const ancho = rejilla ? 'px-2' : desplazable ? 'flex-1 shrink-0 px-3' : variante === 'raiz' ? 'flex-1 px-1' : 'flex-1'
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={esActiva}
            aria-expanded={esActiva && onAlternarPliegue ? !plegado : undefined}
            data-tut={prefijoTut ? `${prefijoTut}.${item.id}` : undefined}
            onClick={(e) => {
              if (!esActiva) {
                onCambio(item.id)
                // Feedback discreto del cambio de pestaña (solo gestos reales,
                // no los clicks del tutorial); lo gobierna el volumen de SFX.
                if (e.isTrusted) {
                  sonar('tick')
                  vibrar(8)
                }
              }
              if (!onAlternarPliegue) return
              if (plegado) onAlternarPliegue()
              else if (esActiva && e.isTrusted) onAlternarPliegue()
            }}
            className={`relative ${BASE[variante]} ${ancho} ${clase}`}
            style={esActiva ? { color: colorActivo ? tinta(colorActivo) : 'var(--ui-accent-ink)' } : undefined}
          >
            {/* En fila flex los espacios sueltos no cuentan: separa el `gap`. */}
            {item.icono ? (
              <Icono nombre={item.icono} />
            ) : item.emoji ? (
              <Icono emoji={item.emoji} />
            ) : null}
            {/* En una línea: partido en dos, el rótulo descuadra la fila entera. */}
            <span className="whitespace-nowrap">
              {item.label ?? t(item.clave ?? `${prefijoClave}.${item.id}`, item.labelEs ?? '')}
            </span>
            {item.extra}
            {/* La rama abierta enseña su flecha en todos los niveles, aunque solo la raíz pliegue. */}
            {esActiva && flecha && <Icono nombre={plegado ? 'plegado' : 'desplegado'} />}
          </button>
        )
      })}
    </div>
  )
}
