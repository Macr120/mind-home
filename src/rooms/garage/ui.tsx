import type { ReactNode } from 'react'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import { COLOR } from './constantes'

/**
 * Lenguaje visual del garaje (mismo canon que `rooms/agenda/ui.tsx`): tarjetas
 * redondeadas, un solo ámbar de marca y las acciones de fila como iconos que
 * aparecen al pasar por encima.
 *
 * El ámbar es claro, así que su tinta es OSCURA y no la blanca de `.texto-cta`:
 * blanco sobre #fbbf24 no llega ni a 2:1 de contraste.
 */
export const TINTA_CTA = '#1c1503'

export const INPUT =
  'mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none transition focus:border-white/30'

export const TARJETA = 'rounded-2xl border border-white/10 bg-white/5'

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
      {children}
    </label>
  )
}

/** Botón de acción principal: relleno de marca, tinta oscura. */
export function BotonPrimario({
  onClick,
  children,
  color = COLOR,
  className = '',
  pequeno,
  tut,
}: {
  onClick: () => void
  children: ReactNode
  color?: string
  className?: string
  /** Versión compacta, para acompañar a una cabecera de sección. */
  pequeno?: boolean
  tut?: string
}) {
  return (
    <button
      type="button"
      data-tut={tut}
      onClick={onClick}
      className={`shrink-0 rounded-xl font-bold shadow-sm transition hover:brightness-110 active:scale-[0.99] ${
        pequeno ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm'
      } ${className}`}
      style={{ background: color, color: TINTA_CTA }}
    >
      {children}
    </button>
  )
}

/** Botón de acompañamiento (cancelar, volver). */
export function BotonSecundario({
  onClick,
  children,
  className = '',
}: {
  onClick: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/15 ${className}`}
    >
      {children}
    </button>
  )
}

/** Acción discreta de una fila (editar, llamar…). */
export function AccionIcono({
  nombre,
  titulo,
  onClick,
}: {
  nombre: NombreIcono
  titulo: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={titulo}
      className="rounded-lg px-2 py-1 text-white/40 transition hover:bg-white/10 hover:text-white/80"
    >
      <Icono nombre={nombre} />
    </button>
  )
}

/**
 * Borrado en dos toques dentro de la propia fila: `confirm()` no encaja con el
 * tema de la casa y en móvil saca al usuario del contexto. Aquí importa más que
 * en otros cuartos: borrar un vehículo se lleva su historial y sus trámites.
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

/**
 * Envoltura de los cuatro formularios del cuarto: tarjeta, título y la misma
 * botonera abajo. Antes cada uno repetía su propio pie y se habían ido
 * separando (unos con hover, otros no; radios distintos).
 */
export function Formulario({
  icono,
  titulo,
  onGuardar,
  onCancelar,
  children,
}: {
  icono: NombreIcono
  titulo: string
  onGuardar: () => void
  onCancelar: () => void
  children: ReactNode
}) {
  const t = useT()
  return (
    <div className={`${TARJETA} ui-pop space-y-3 p-4`}>
      <p className="text-sm font-bold">
        <Icono nombre={icono} /> {titulo}
      </p>
      {children}
      <div className="flex gap-2 pt-1">
        <BotonPrimario onClick={onGuardar} className="flex-1">
          {t('garage.form.guardar', 'Guardar')}
        </BotonPrimario>
        <BotonSecundario onClick={onCancelar}>
          {t('garage.form.cancelar', 'Cancelar')}
        </BotonSecundario>
      </div>
    </div>
  )
}

/** Cabecera de sección: icono + título a la izquierda, acción a la derecha. */
export function Cabecera({
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
      <p className="text-sm font-bold text-white/80">
        <Icono nombre={icono} /> {titulo}
      </p>
      {children}
    </div>
  )
}

/** Etiqueta pequeña de dato (odómetro, nº de servicios, taller…). */
export function Chip({
  children,
  color,
  className = '',
}: {
  children: ReactNode
  /** Hex de marca; sin valor, gris neutro. */
  color?: string
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        color ? '' : 'bg-white/8'
      } ${className}`}
      style={color ? { background: `${color}22` } : undefined}
    >
      {children}
    </span>
  )
}

/** Tile cuadrado con el icono del vehículo o del contacto. */
export function Tile({
  emoji,
  nombre,
  color = COLOR,
  grande,
}: {
  emoji?: string
  nombre?: NombreIcono
  color?: string
  grande?: boolean
}) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-2xl ${
        grande ? 'h-14 w-14 text-3xl' : 'h-11 w-11 text-xl'
      }`}
      style={{ background: `${color}24`, boxShadow: `inset 0 0 0 1px ${color}33` }}
    >
      <Icono emoji={emoji} nombre={nombre} />
    </span>
  )
}
