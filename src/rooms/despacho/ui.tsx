import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { BotonPrimario as BotonPrimarioBase, INPUT } from '../_shared/ui'

/**
 * Lenguaje visual de Finanzas: re-exporta el canon de `rooms/_shared/ui.tsx`
 * (misma tarjeta, mismo input, mismos botones) con el azul de marca del cuarto,
 * y añade lo propio de la app: el dinero se teclea con comas de miles.
 */

/** Colores de datos de la app. Antes iban escritos a mano ~40 veces. */
export const VERDE = '#34d399'
export const ROJO = '#f87171'
export const AZUL = '#60a5fa'

export { INPUT, TARJETA, BotonSecundario, TituloSeccion as Seccion } from '../_shared/ui'

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
      <span aria-hidden className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-sm text-white/40">
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
        className={className || `${INPUT} ps-7`}
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
  color,
  ...props
}: {
  children: ReactNode
  color?: string
  className?: string
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'color'>) {
  return <BotonPrimarioBase app={AZUL} color={color} {...props} />
}

// ----- Estructura -----

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
        className="text-start hover:text-white/55"
      >
        <Icono nombre="ayuda" /> {resumen} <Icono nombre={abierta ? 'desplegado' : 'plegado'} />
      </button>
      {abierta && <p className="mt-1">{detalle}</p>}
    </div>
  )
}
