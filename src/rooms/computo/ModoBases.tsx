import { useMemo, useRef, useState, type ReactNode } from 'react'
import { anotarCalculo } from '../../core/data/repository'
import { fechaLocalISO } from '../../core/fechaLocal'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { vivo } from '../../core/ui/estilos'
import { BASES, COLOR, PREFIJO_BASE } from './constantes'
import type { Motor } from './motor'
import { ErrorMotor } from './motor'
import { useInsercion } from './useInsercion'

/**
 * Sistemas de numeración: no solo convierte, CALCULA. En cualquier base de la 2
 * a la 16.
 *
 * Hay dos formas de leer lo escrito y la regla es la longitud:
 *
 *  - UN NÚMERO SUELTO (solo dígitos válidos, sin operadores) se lee en la base
 *    elegida. Es lo que hace falta para convertir, y es la única manera de
 *    escribir en base 7: mathjs no tiene literal para ella.
 *  - CON OPERACIONES, manda el motor y los prefijos (`0xFF + 0b1010`). Ahí las
 *    bases se pueden mezclar, que es la gracia.
 *
 * El resultado se lee en las quince bases a la vez, con `toString(base)`: la
 * misma cuenta que haría el motor y sin depender de que esté cargado.
 */

const HEX = ['A', 'B', 'C', 'D', 'E', 'F']

const TECLAS = [
  ['7', '8', '9', '/'],
  ['4', '5', '6', '*'],
  ['1', '2', '3', '-'],
  ['0', '(', ')', '+'],
]

const BITS: { escribe: string; muestra: string }[] = [
  { escribe: 'bitAnd($0, )', muestra: 'AND' },
  { escribe: 'bitOr($0, )', muestra: 'OR' },
  { escribe: 'bitXor($0, )', muestra: 'XOR' },
  { escribe: 'bitNot($0)', muestra: 'NOT' },
  { escribe: ' << ', muestra: '<<' },
  { escribe: ' >> ', muestra: '>>' },
]

const esTactil = () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

/** ¿Esta tecla es un dígito que cabe en la base elegida? */
function cabe(k: string, base: number): boolean {
  const v = parseInt(k, 16)
  return Number.isNaN(v) ? true : v < base
}

/** El número en una base, con su prefijo si lo tiene. Solo para enteros. */
function lectura(n: number, base: number): string {
  const cuerpo = Math.trunc(Math.abs(n)).toString(base).toUpperCase()
  return `${n < 0 ? '-' : ''}${PREFIJO_BASE[base] ?? ''}${cuerpo}`
}

/** Un número suelto en la base elegida, o null si lleva operaciones. */
function comoNumeroSuelto(texto: string, base: number): number | null {
  const t = texto.trim()
  if (!t) return null
  const digitos = '0123456789ABCDEF'.slice(0, base)
  const limpio = t.replace(/^-/, '')
  if (!limpio || ![...limpio.toUpperCase()].every((c) => digitos.includes(c))) return null
  const n = parseInt(limpio, base)
  return Number.isFinite(n) ? (t.startsWith('-') ? -n : n) : null
}

export function ModoBases({ motor, selector }: { motor: Motor | null; selector: ReactNode }) {
  const t = useT()
  const [base, setBase] = useState(16)
  const [entrada, setEntrada] = useState('')
  const [tactil] = useState(esTactil)
  const campo = useRef<HTMLInputElement>(null)

  const escribir = useInsercion(entrada, setEntrada, campo)

  const valor = useMemo(() => {
    if (!entrada.trim()) return null
    // Primero la lectura directa: en base 7 no hay literal que el motor entienda.
    const suelto = comoNumeroSuelto(entrada, base)
    if (suelto != null) return { n: suelto, error: null }
    if (!motor) return null
    try {
      const bruto = motor.evaluar(entrada)
      if (typeof bruto !== 'number' || !Number.isFinite(bruto)) {
        return { n: null, error: t('computo.bases.noEntero', 'Solo los números enteros se leen en otras bases.') }
      }
      return { n: bruto, error: null }
    } catch (e) {
      return { n: null, error: e instanceof ErrorMotor ? t(e.clave, '…') : '…' }
    }
  }, [motor, entrada, base, t])

  const entero = valor?.n != null && Number.isInteger(valor.n) ? valor.n : null

  const guardar = async () => {
    if (entero == null) return
    await anotarCalculo({
      tipo: 'base',
      entrada,
      salida: lectura(entero, base),
      fecha: fechaLocalISO(),
      creadoEn: new Date().toISOString(),
    })
  }

  return (
    <div data-tut="computo.calc.bases" className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 text-[11px] text-white/45">{t('computo.bases.base', 'Base')}</span>
        {selector}
      </div>

      <div className="flex gap-1 overflow-x-auto pb-0.5">
        {BASES.map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => setBase(b)}
            title={t('computo.bases.enBase', 'Base {n}', { n: String(b) })}
            className={`shrink-0 rounded-lg px-2.5 py-1.5 font-mono text-xs font-semibold transition ${
              base === b ? 'ui-accent-bg' : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            {b}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          ref={campo}
          value={entrada}
          readOnly={tactil}
          onChange={(e) => setEntrada(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void guardar()
          }}
          placeholder={t('computo.bases.placeholder', 'FF, o 0xFF + 0b1010')}
          spellCheck={false}
          className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 font-mono text-base outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={() => setEntrada((s) => s.slice(0, -1))}
          className="shrink-0 rounded-xl bg-white/5 px-3 py-2.5 transition hover:bg-white/10"
          title={t('computo.calc.borrar', 'Borrar')}
          aria-label={t('computo.calc.borrar', 'Borrar')}
        >
          <Icono nombre="volver" />
        </button>
      </div>

      <p className="px-0.5 text-[10px] leading-relaxed text-white/35">
        {t(
          'computo.bases.ayuda',
          'Un número suelto se lee en la base elegida. Con operaciones manda el motor: usa 0b, 0o o 0x para mezclar bases.',
        )}
      </p>

      <div className="rounded-xl bg-black/25 p-2">
        {valor?.error ? (
          <p className="px-1 py-2 text-xs text-white/45">{valor.error}</p>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 sm:grid-cols-3">
            {BASES.map((b) => (
              <div key={b} className="flex items-baseline gap-1.5 px-1">
                <span className="w-6 shrink-0 text-end font-mono text-[10px] text-white/35">{b}</span>
                <span
                  className={`min-w-0 flex-1 truncate font-mono ${
                    base === b ? 'texto-vivo text-base font-bold' : 'text-xs text-white/55'
                  }`}
                  style={base === b ? vivo(COLOR) : undefined}
                >
                  {entero == null ? ' ' : lectura(entero, b)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {PREFIJO_BASE[base] && (
          <button
            type="button"
            onClick={() => escribir(PREFIJO_BASE[base])}
            className="rounded-lg bg-white/5 px-2.5 py-1.5 font-mono text-xs font-semibold transition hover:bg-white/10"
            title={t('computo.bases.prefijo', 'Empezar un número en esta base')}
          >
            {PREFIJO_BASE[base]}
          </button>
        )}
        {BITS.map((b) => (
          <button
            key={b.muestra}
            type="button"
            onClick={() => escribir(b.escribe)}
            className="rounded-lg bg-white/5 px-2.5 py-1.5 font-mono text-xs text-white/70 transition hover:bg-white/10"
          >
            {b.muestra}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-6 gap-1.5">
        {HEX.map((k) => (
          <Tecla key={k} k={k} apagada={!cabe(k, base)} onTecla={escribir} />
        ))}
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {TECLAS.flat().map((k, i) => (
          <Tecla key={`${k}-${i}`} k={k} apagada={!cabe(k, base)} onTecla={escribir} />
        ))}
      </div>

      <button
        type="button"
        onClick={() => void guardar()}
        disabled={entero == null}
        className="ui-accent-bg w-full rounded-lg py-2 text-xs font-semibold transition disabled:opacity-40"
      >
        {t('computo.bases.guardar', 'Guardar en el historial')}
      </button>
    </div>
  )
}

/** Tecla que se apaga cuando su dígito no existe en la base elegida. */
function Tecla({ k, apagada, onTecla }: { k: string; apagada: boolean; onTecla: (k: string) => void }) {
  return (
    <button
      type="button"
      disabled={apagada}
      onClick={() => onTecla(k)}
      className="rounded-lg bg-white/10 py-2.5 font-mono text-sm transition hover:bg-white/20 disabled:bg-white/[0.03] disabled:text-white/20"
    >
      {k}
    </button>
  )
}
