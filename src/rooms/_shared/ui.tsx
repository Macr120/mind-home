import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import { acento } from './acento'

/**
 * Canon visual compartido de las apps de los cuartos: la misma tarjeta, el
 * mismo input y los mismos botones en todos. Los kits por cuarto
 * (`despacho/ui.tsx`, `garage/ui.tsx`, `agenda/ui.tsx`) re-exportan de aquí.
 *
 * Convenciones (las mismas de la tabla de `index.css`): botón/input
 * `rounded-lg`, tarjeta `rounded-xl`, modal `rounded-2xl`, chip `rounded-full`.
 */

export const INPUT =
  'w-full rounded-lg bg-black/30 px-3 py-2 text-sm outline-none border border-white/10 transition focus:border-accent/60'

export const TARJETA = 'rounded-xl bg-white/5 p-4 border border-white/10'

/** Fila de lista que responde al toque: en táctil el `active:` ES el feedback. */
export const FILA_INTERACTIVA = 'transition hover:bg-white/10 active:bg-white/10'

/** Base de todo botón del kit: `ui-boton` engancha el resorte del press y la regla táctil de index.css. */
const BASE = 'ui-boton disabled:opacity-40 disabled:pointer-events-none'

/**
 * Botón de acción principal de un formulario: lleva el color de la app (`app`),
 * el mismo que llevan sus menús, y la tinta la decide la luminancia.
 * `color` es para semántica real (verde ingreso / rojo gasto) y manda tal cual.
 * Sin `app` ni `color` hereda el acento del cuarto que baja `RoomOverlay`.
 */
export function BotonPrimario({
  children,
  app,
  color,
  pequeno,
  className = '',
  ...props
}: {
  children: ReactNode
  /** Color de la app (constantes.ts del cuarto). */
  app?: string
  /** Color semántico literal; manda sobre `app`. */
  color?: string
  /** Versión compacta, para acompañar a una cabecera o un vacío. */
  pequeno?: boolean
  className?: string
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'color'>) {
  const fondo = color ?? app
  return (
    <button
      {...props}
      className={`${BASE} ui-accent-bg rounded-lg font-bold hover:brightness-110 ${
        pequeno ? 'px-3 py-1.5 text-xs' : 'min-h-11 px-4 py-2'
      } ${className}`}
      style={acento(fondo)}
    >
      {children}
    </button>
  )
}

/** Botón de acompañamiento (cancelar, volver, cargar ejemplo). */
export function BotonSecundario({
  children,
  pequeno,
  className = '',
  ...props
}: {
  children: ReactNode
  pequeno?: boolean
  className?: string
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'>) {
  return (
    <button
      type="button"
      {...props}
      className={`${BASE} rounded-lg bg-white/10 font-semibold hover:bg-white/15 ${
        pequeno ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
      } ${className}`}
    >
      {children}
    </button>
  )
}

/** Acción destructiva con confirmación aparte (el patrón de ConfirmarDialog). */
export function BotonPeligro({
  children,
  pequeno,
  className = '',
  ...props
}: {
  children: ReactNode
  pequeno?: boolean
  className?: string
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'>) {
  return (
    <button
      type="button"
      {...props}
      className={`${BASE} rounded-lg border border-red-400/30 bg-red-400/10 font-semibold text-red-400 hover:bg-red-400/20 ${
        pequeno ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
      } ${className}`}
    >
      {children}
    </button>
  )
}

/**
 * Borrado en dos toques dentro de la propia fila: `confirm()` no encaja con el
 * tema de la casa y en móvil saca al usuario del contexto. Las claves del
 * garaje se reutilizan a propósito: ya están traducidas a los 15 idiomas.
 */
export function BotonBorrar({
  confirmando,
  onPedir,
  onConfirmar,
  onCancelar,
}: {
  confirmando: boolean
  onPedir: () => void
  onConfirmar: () => void
  onCancelar: () => void
}) {
  const t = useT()
  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={onPedir}
        aria-label={t('garage.detalle.borrar', 'Borrar')}
        title={t('garage.detalle.borrar', 'Borrar')}
        className="rounded-lg px-2 py-1 text-white/40 transition hover:bg-white/10 hover:text-red-400"
      >
        <Icono nombre="basura" />
      </button>
    )
  }
  return (
    <span className="flex items-center gap-1 text-xs text-red-400">
      {t('garage.borrar.confirmar', '¿Borrar?')}
      <button
        type="button"
        onClick={onConfirmar}
        className="rounded-lg bg-red-500/20 px-2 py-1 font-semibold transition hover:bg-red-500/30"
      >
        {t('garage.borrar.si', 'Sí')}
      </button>
      <button
        type="button"
        onClick={onCancelar}
        className="rounded-lg bg-white/10 px-2 py-1 font-semibold text-white/70 transition hover:bg-white/15"
      >
        {t('garage.borrar.no', 'No')}
      </button>
    </span>
  )
}

/** Rueda de carga discreta (antes copiada a mano en seis archivos). */
export function Spinner({
  pequeno,
  etiqueta,
  className = '',
}: {
  pequeno?: boolean
  /** Qué se está cargando, para el lector de pantalla. */
  etiqueta?: string
  className?: string
}) {
  return (
    <span
      role="status"
      aria-label={etiqueta}
      className={`inline-block animate-spin rounded-full border-white/25 border-t-white/80 align-middle motion-reduce:animate-none ${
        pequeno ? 'h-3.5 w-3.5 border' : 'h-6 w-6 border-2'
      } ${className}`}
    />
  )
}

/**
 * Estado vacío con invitación a actuar: icono grande, título, explicación y
 * (si se pasa) el botón que abre el alta. Los textos llegan YA traducidos.
 */
export function Vacio({
  icono,
  titulo,
  sub,
  cta,
  className = '',
}: {
  icono: NombreIcono
  titulo: string
  sub?: string
  cta?: { texto: string; onClick: () => void }
  className?: string
}) {
  return (
    <div className={`${TARJETA} space-y-1 p-6 text-center ${className}`}>
      <p className="text-3xl">
        <Icono nombre={icono} />
      </p>
      <p className="text-sm font-semibold text-white/70">{titulo}</p>
      {sub && <p className="text-xs leading-relaxed text-white/45">{sub}</p>}
      {cta && (
        <BotonPrimario type="button" pequeno onClick={cta.onClick} className="mt-3">
          {cta.texto}
        </BotonPrimario>
      )}
    </div>
  )
}

/** Encabezado uniforme de bloque interno: icono + título y acción a la derecha. */
export function TituloSeccion({
  icono,
  titulo,
  children,
}: {
  icono: NombreIcono
  titulo: string
  children?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-sm font-semibold text-white/85">
        <Icono nombre={icono} /> {titulo}
      </p>
      {children}
    </div>
  )
}

/** Campo de formulario con su etiqueta encima. */
export function Campo({
  etiqueta,
  children,
  className = '',
}: {
  etiqueta: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={`block text-xs text-white/50 ${className}`}>
      {etiqueta}
      <div className="mt-0.5">{children}</div>
    </label>
  )
}

/** Modal centrado; el clic fuera y Escape cierran. */
export function Modal({
  titulo,
  onCerrar,
  children,
  ancho = 'max-w-md',
}: {
  titulo: string
  onCerrar: () => void
  children: ReactNode
  /** Clase max-w-* del panel. */
  ancho?: string
}) {
  const t = useT()
  // Escape se escucha en `document`: puesto en el panel deja de funcionar en
  // cuanto el foco sale de él (p. ej. tras un clic en el telón).
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
    }
    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  }, [onCerrar])
  return (
    <div className="ui-scrim z-50 grid place-items-center p-4" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={`ui-panel ui-pop max-h-[85vh] w-full space-y-3 overflow-y-auto rounded-2xl border border-white/10 p-4 shadow-xl ${ancho}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">{titulo}</p>
          <button
            type="button"
            onClick={onCerrar}
            aria-label={t('rutinas.cerrar', 'Cerrar')}
            className="rounded-lg px-2 py-1 text-white/50 transition hover:bg-white/10"
          >
            <Icono nombre="cerrar" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
