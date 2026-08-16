import type { ReactNode } from 'react'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import { COLOR } from './constantes'
import { BotonPrimario as BotonPrimarioBase, BotonSecundario } from '../_shared/ui'

/**
 * Lenguaje visual del garaje: re-exporta el canon de `rooms/_shared/ui.tsx`
 * (mismo input, mismos botones) con el ámbar de marca del cuarto, y conserva
 * lo propio: acciones de fila como iconos y el pie común de sus formularios.
 *
 * El ámbar es claro, así que su tinta es OSCURA y no la blanca de `.texto-cta`:
 * blanco sobre #fbbf24 no llega ni a 2:1 de contraste.
 */
export const TINTA_CTA = '#1c1503'

export { INPUT, Campo, BotonSecundario, BotonBorrar, TituloSeccion as Cabecera } from '../_shared/ui'

/** Tarjeta del canon SIN el padding: aquí cada tarjeta pone el suyo (p-4 en
    formularios, p-6 en vacíos) y el p-4 del kit chocaría con esos p-*. */
export const TARJETA = 'rounded-xl border border-white/10 bg-white/5'

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
    <BotonPrimarioBase type="button" data-tut={tut} onClick={onClick} app={color} pequeno={pequeno} className={className}>
      {children}
    </BotonPrimarioBase>
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
      aria-label={titulo}
      className="rounded-lg px-2 py-1 text-white/40 transition hover:bg-white/10 hover:text-white/80"
    >
      <Icono nombre={nombre} />
    </button>
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
