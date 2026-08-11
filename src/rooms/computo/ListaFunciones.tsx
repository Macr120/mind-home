import type { RefObject } from 'react'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { COLORES_FUNCION, MAX_FUNCIONES } from './constantes'
import type { FuncionGrafica, TipoGrafica } from './curvas'

/**
 * La lista ƒ₁…ƒ₆ del modo Gráfica. La comparten 2D, polar, paramétrica y 3D.
 *
 * El chip ƒₙ enciende y apaga la curva; tocar el CAMPO la pone en edición, que
 * es lo que decide a quién escriben el teclado y las notaciones de abajo. Los
 * campos van `readOnly` en táctil: si no, el teclado del sistema se planta
 * encima del plano en cuanto se toca uno.
 */

const esTactil = () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

export function ListaFunciones({
  tipo,
  lista,
  onLista,
  edita,
  campo,
  onEditar,
  refEdicion,
  tactil,
}: {
  tipo: TipoGrafica
  lista: FuncionGrafica[]
  onLista: (fs: FuncionGrafica[]) => void
  edita: number
  campo: 'expr' | 'expr2'
  onEditar: (id: number, c: 'expr' | 'expr2') => void
  /** Se coloca SOLO en el campo en edición: es el que recibe lo que se teclea. */
  refEdicion: RefObject<HTMLInputElement | null>
  tactil: boolean
}) {
  const t = useT()
  // Una superficie es un campo de altura sobre todo el plano: dos superpuestas
  // no se leerían, así que aquí no hay lista que valga.
  const soloUna = tipo === '3d'
  const visibles = soloUna ? lista.slice(0, 1) : lista

  const cambiar = (id: number, cambios: Partial<FuncionGrafica>) =>
    onLista(lista.map((f) => (f.id === id ? { ...f, ...cambios } : f)))

  const marcador = (c: 'expr' | 'expr2') =>
    tipo === 'polar'
      ? t('computo.graf.placeholderPolar', 'r en función de θ, p. ej. 2*cos(3*theta)')
      : tipo === '3d'
        ? t('computo.graf.placeholder3d', 'z en función de x e y, p. ej. sin(x)*cos(y)')
        : tipo === 'parametrica'
          ? c === 'expr'
            ? t('computo.graf.placeholderX', 'x(t), p. ej. cos(t)')
            : t('computo.graf.placeholderY', 'y(t), p. ej. sin(2*t)')
          : t('computo.graf.placeholder', 'una función de x, p. ej. sin(x)')

  return (
    <div className="space-y-1.5" data-tut="computo.graf.lista">
      {visibles.map((f, i) => {
        const color = COLORES_FUNCION[i % COLORES_FUNCION.length]
        return (
          <div key={f.id} className="flex items-start gap-1.5">
            <button
              type="button"
              onClick={() => cambiar(f.id, { visible: !f.visible })}
              className="mt-0.5 shrink-0 rounded-lg px-2 py-1.5 text-xs font-bold transition"
              style={{
                background: f.visible ? `${color}33` : 'rgb(255 255 255 / 0.05)',
                color: f.visible ? color : undefined,
              }}
              title={f.visible ? t('computo.graf.ocultar', 'Ocultar') : t('computo.graf.mostrar', 'Mostrar')}
              aria-label={f.visible ? t('computo.graf.ocultar', 'Ocultar') : t('computo.graf.mostrar', 'Mostrar')}
            >
              ƒ{i + 1}
            </button>

            <div className="min-w-0 flex-1 space-y-1">
              <Campo
                valor={f.expr}
                activo={edita === f.id && campo === 'expr'}
                color={color}
                marcador={marcador('expr')}
                tactil={tactil}
                refEdicion={refEdicion}
                onFoco={() => onEditar(f.id, 'expr')}
                onCambiar={(v) => cambiar(f.id, { expr: v })}
              />
              {tipo === 'parametrica' && (
                <Campo
                  valor={f.expr2 ?? ''}
                  activo={edita === f.id && campo === 'expr2'}
                  color={color}
                  marcador={marcador('expr2')}
                  tactil={tactil}
                  refEdicion={refEdicion}
                  onFoco={() => onEditar(f.id, 'expr2')}
                  onCambiar={(v) => cambiar(f.id, { expr2: v })}
                />
              )}
            </div>

            {!soloUna && lista.length > 1 && (
              <button
                type="button"
                onClick={() => onLista(lista.filter((x) => x.id !== f.id))}
                className="mt-0.5 shrink-0 rounded px-1.5 py-1.5 text-white/35 transition hover:bg-white/10 hover:text-white"
                title={t('computo.graf.quitar', 'Quitar')}
                aria-label={t('computo.graf.quitar', 'Quitar')}
              >
                <Icono nombre="quitar" />
              </button>
            )}
          </div>
        )
      })}

      {!soloUna && lista.length < MAX_FUNCIONES && (
        <button
          type="button"
          onClick={() => {
            const id = Date.now()
            onLista([...lista, { id, expr: '', expr2: tipo === 'parametrica' ? '' : undefined, visible: true }])
            onEditar(id, 'expr')
          }}
          className="w-full rounded-lg border border-dashed border-white/15 py-1.5 text-xs text-white/45 transition hover:bg-white/5"
        >
          <Icono nombre="agregar" /> {t('computo.graf.otra', 'Otra función')}
        </button>
      )}
    </div>
  )
}

/** Un campo de expresión. El activo lleva el ref y el marco de su color. */
function Campo({
  valor,
  activo,
  color,
  marcador,
  tactil,
  refEdicion,
  onFoco,
  onCambiar,
}: {
  valor: string
  activo: boolean
  color: string
  marcador: string
  tactil: boolean
  refEdicion: RefObject<HTMLInputElement | null>
  onFoco: () => void
  onCambiar: (v: string) => void
}) {
  return (
    <input
      ref={activo ? refEdicion : null}
      value={valor}
      readOnly={tactil}
      onFocus={onFoco}
      onClick={onFoco}
      onChange={(e) => onCambiar(e.target.value)}
      placeholder={marcador}
      spellCheck={false}
      className="w-full rounded-lg border bg-black/30 px-2.5 py-1.5 font-mono text-xs outline-none"
      style={{ borderColor: activo ? color : 'rgb(255 255 255 / 0.15)' }}
    />
  )
}

export { esTactil }
