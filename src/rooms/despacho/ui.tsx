import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'

/**
 * Lenguaje visual de Finanzas (mismo canon que `rooms/garage/ui.tsx` y
 * `rooms/agenda/ui.tsx`): un solo azul de marca para las acciones principales,
 * la misma tarjeta y el mismo input en las cuatro pestañas, y el dinero se
 * teclea con comas de miles.
 */

/** Colores de datos de la app. Antes iban escritos a mano ~40 veces. */
export const VERDE = '#34d399'
export const ROJO = '#f87171'
export const AZUL = '#60a5fa'

export const INPUT =
  'w-full rounded-lg bg-black/30 px-3 py-2 text-sm outline-none border border-white/10 focus:border-white/30'

export const TARJETA = 'rounded-xl bg-white/5 p-4 border border-white/10'

// ----- Dinero con comas -----

/** Deja dígitos y UN punto, con máximo dos decimales: '1,2a3.456' → '123.45'. */
export function limpiar(texto: string): string {
  const soloValidos = texto.replace(/[^\d.]/g, '')
  const punto = soloValidos.indexOf('.')
  if (punto < 0) return soloValidos
  const entera = soloValidos.slice(0, punto)
  const decimal = soloValidos.slice(punto + 1).replace(/\./g, '').slice(0, 2)
  return `${entera}.${decimal}`
}

/** Agrupa la parte entera con comas: '1234567.5' → '1,234,567.5'. */
export function formatearMiles(crudo: string): string {
  if (!crudo) return ''
  const punto = crudo.indexOf('.')
  const entera = punto < 0 ? crudo : crudo.slice(0, punto)
  const resto = punto < 0 ? '' : crudo.slice(punto)
  return entera.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + resto
}

/**
 * Input de dinero: `$` integrado, comas de miles mientras escribes y teclado
 * decimal en el teléfono.
 *
 * Dos modos, igual que los inputs que sustituye:
 * - CONTROLADO (`valor`/`onValor`): el padre guarda el CRUDO ('1200000.5') y lo
 *   vacía tras el submit. Los formularios de alta.
 * - SUELTO (`defaultValue`/`onNumero`): número inicial + aviso al salir del
 *   campo. Las filas vivas de `useLiveQuery`, donde un input controlado
 *   entraría en guerra con cada repintado de la base.
 *
 * El texto visible siempre vive DENTRO del componente: el padre nunca ve las
 * comas, solo el crudo o el número.
 */
export function CampoDinero({
  valor,
  onValor,
  defaultValue,
  onNumero,
  placeholder,
  className = '',
  ...aria
}: {
  valor?: string
  onValor?: (crudo: string) => void
  defaultValue?: number
  onNumero?: (n: number | undefined) => void
  placeholder?: string
  className?: string
  'aria-label'?: string
}) {
  const [texto, setTexto] = useState(() =>
    formatearMiles(valor ?? (defaultValue != null ? String(defaultValue) : '')),
  )
  /** Último crudo visto del padre: distingue un cambio de fuera de un eco nuestro. */
  const [previo, setPrevio] = useState(valor)
  const ref = useRef<HTMLInputElement>(null)
  /** Caret pendiente de recolocar tras el repintado (nº de dígitos a su izquierda). */
  const caret = useRef<number | null>(null)

  // Modo controlado: si el padre cambia el valor por FUERA (lo vació tras
  // crear, lo precargó una calculadora), el texto visible lo sigue. Es el
  // patrón de React de ajustar estado durante el render, no un efecto.
  if (valor !== undefined && valor !== previo) {
    setPrevio(valor)
    const nuevo = formatearMiles(valor)
    if (nuevo !== texto) setTexto(nuevo)
  }

  useLayoutEffect(() => {
    if (caret.current == null || !ref.current) return
    // Recorre el texto formateado hasta pasar tantos dígitos como había a la
    // izquierda del cursor antes de reformatear: así escribir en MEDIO de
    // «1,000,000» no manda el caret al final.
    let vistos = 0
    let pos = 0
    while (pos < texto.length && vistos < caret.current) {
      if (/[\d.]/.test(texto[pos])) vistos++
      pos++
    }
    ref.current.setSelectionRange(pos, pos)
    caret.current = null
  }, [texto])

  const cambiar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.target
    const digitosAntes = (el.value.slice(0, el.selectionStart ?? 0).match(/[\d.]/g) ?? []).length
    const crudo = limpiar(el.value)
    caret.current = digitosAntes
    setTexto(formatearMiles(crudo))
    setPrevio(crudo)
    onValor?.(crudo)
  }

  const salir = () => {
    if (!onNumero) return
    const n = parseFloat(limpiar(texto))
    onNumero(Number.isFinite(n) ? n : undefined)
  }

  return (
    <span className="relative block">
      <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-white/40">
        $
      </span>
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        value={texto}
        onChange={cambiar}
        onBlur={onNumero ? salir : undefined}
        placeholder={placeholder}
        className={className || `${INPUT} pl-7`}
        {...aria}
      />
    </span>
  )
}

// ----- Botones -----

/**
 * Botón de acción principal: el azul de marca del cuarto (`index.tsx`). El
 * `color` opcional es para semántica real (el alta de Movimientos pinta verde
 * un ingreso y rojo un gasto), no para inventar variantes.
 */
export function BotonPrimario({
  children,
  color,
  className = '',
  ...props
}: {
  children: ReactNode
  color?: string
  className?: string
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'color'>) {
  return (
    <button
      {...props}
      className={`rounded-lg py-2 font-bold texto-cta transition hover:brightness-110 active:scale-[0.99] ${
        color ? '' : 'bg-blue-600'
      } ${className}`}
      style={color ? { background: color } : undefined}
    >
      {children}
    </button>
  )
}

/** Botón de acompañamiento (cargar ejemplo, cancelar, acciones tibias). */
export function BotonSecundario({
  children,
  className = '',
  ...props
}: {
  children: ReactNode
  className?: string
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className'>) {
  return (
    <button
      {...props}
      className={`rounded-lg bg-white/10 py-2 text-sm font-semibold transition hover:bg-white/15 ${className}`}
    >
      {children}
    </button>
  )
}

// ----- Estructura -----

/** Encabezado uniforme de bloque interno (Simulador, Metas, Controles…). */
export function Seccion({
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

/** El chevron de un plegable, con su estado anunciado al lector de pantalla. */
export function Plegable({
  abierto,
  onToggle,
  etiqueta,
  className = '',
}: {
  abierto: boolean
  onToggle: () => void
  etiqueta: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={abierto}
      className={className || 'text-[11px] font-semibold text-white/40 hover:text-white/70'}
    >
      <Icono nombre={abierto ? 'desplegado' : 'plegado'} /> {etiqueta}
    </button>
  )
}

/**
 * Un párrafo de ayuda largo, plegado tras su primera frase: el que quiere
 * leerlo lo abre y el que ya lo sabe deja de cargar con el muro de texto.
 */
export function Ayuda({ resumen, detalle }: { resumen: string; detalle: string }) {
  const t = useT()
  const [abierta, setAbierta] = useState(false)
  return (
    <div className="text-[11px] leading-relaxed text-white/40">
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        aria-expanded={abierta}
        aria-label={t('despacho.ui.masAyuda', 'Más detalles')}
        className="text-left hover:text-white/55"
      >
        <Icono nombre="ayuda" /> {resumen} <Icono nombre={abierta ? 'desplegado' : 'plegado'} />
      </button>
      {abierta && <p className="mt-1">{detalle}</p>}
    </div>
  )
}
