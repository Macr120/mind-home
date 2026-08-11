import { Suspense, lazy, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { RANGO_XY_3D } from './constantes'
import {
  TIPOS_GRAFICA,
  VARIABLES,
  type EstadoGrafica,
  type FuncionGrafica,
  type TipoGrafica,
} from './curvas'
import { esTactil, ListaFunciones } from './ListaFunciones'
import { CabeceraModo } from './ModoCampos'
import type { Motor } from './motor'
import { PanelFormula } from './PanelFormula'
import { Plano2D } from './Plano2D'
import { PlanoParametrico } from './PlanoParametrico'
import { PlanoPolar } from './PlanoPolar'
import { TecladoMath } from './TecladoMath'
import { useInsercion } from './useInsercion'

// El 3D arrastra three: solo se descarga si de verdad se abre la superficie.
const Superficie3D = lazy(() => import('./Superficie3D'))

/**
 * El modo Gráfica: TODO lo que se dibuja en la calculadora pasa por aquí.
 *
 * Arriba el plano, debajo el tipo, la lista de funciones y el teclado. Escribir
 * una curva y verla cambiar sin salir de la pantalla es la razón de que esto sea
 * un modo y no un menú aparte.
 *
 * Las funciones ya no se escriben en inputs pelados: el teclado y las notaciones
 * de abajo escriben en la que esté en edición, que en un teléfono es la única
 * forma cómoda de teclear `theta` o una raíz.
 */

const TECLAS = [
  ['7', '8', '9', '/'],
  ['4', '5', '6', '*'],
  ['1', '2', '3', '-'],
  ['0', '.', '^', '+'],
  ['(', ')', ',', 'pi'],
]

export function ModoGrafica({
  motor,
  estado,
  onEstado,
  selector,
}: {
  motor: Motor | null
  estado: EstadoGrafica
  onEstado: Dispatch<SetStateAction<EstadoGrafica>>
  selector: ReactNode
}) {
  const t = useT()
  const [tactil] = useState(esTactil)
  const campo = useRef<HTMLInputElement>(null)

  const { tipo, objetivo } = estado
  const lista = estado.listas[tipo]

  // Una fórmula del formulario no tiene quién sea θ ni t: se dibuja en el plano
  // o como superficie. El tipo CRUDO se conserva, así que al soltarla vuelve.
  const tipoEfectivo: TipoGrafica = objetivo ? (tipo === '3d' ? '3d' : '2d') : tipo

  const activa = lista.find((f) => f.id === estado.edita) ?? lista[0]
  const texto = (estado.campo === 'expr2' ? activa?.expr2 : activa?.expr) ?? ''

  const ponerLista = (fs: FuncionGrafica[]) =>
    onEstado((e) => ({ ...e, listas: { ...e.listas, [e.tipo]: fs } }))

  const escribirEn = (v: string) => {
    if (!activa) return
    ponerLista(lista.map((f) => (f.id === activa.id ? { ...f, [estado.campo]: v } : f)))
  }
  const escribir = useInsercion(texto, escribirEn, campo)

  return (
    <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-3" data-tut="computo.calc.grafica">
      <CabeceraModo selector={selector}>
        {objetivo && (
          <>
            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-white/70">
              <Icono nombre="sigma" /> {objetivo.nombre}
            </span>
            <button
              type="button"
              onClick={() => onEstado((e) => ({ ...e, objetivo: null }))}
              className="shrink-0 rounded-lg bg-white/5 px-2 py-1 text-white/60 transition hover:bg-white/10"
              title={t('computo.graf.soltar', 'Volver a las funciones sueltas')}
              aria-label={t('computo.graf.soltar', 'Volver a las funciones sueltas')}
            >
              <Icono nombre="cerrar" />
            </button>
          </>
        )}
      </CabeceraModo>

      {/* TIPOS, encima del plano: es lo que decide QUÉ se está mirando, así que
          va antes de mirarlo. Los cuatro se renderizan siempre y los que no
          aplican se esconden — el tutorial pulsa `computo.graf.tipo.<id>` para
          plantarse en uno concreto, y un botón desmontado no se puede pulsar. */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5" data-tut="computo.graf.tipos">
        {TIPOS_GRAFICA.map((x) => {
          const cabe = !objetivo || x.id === '2d' || x.id === '3d'
          return (
            <button
              key={x.id}
              type="button"
              data-tut={`computo.graf.tipo.${x.id}`}
              onClick={() => onEstado((e) => ({ ...e, tipo: x.id }))}
              className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${cabe ? '' : 'hidden'} ${
                tipoEfectivo === x.id ? 'ui-accent-bg' : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              <Icono nombre={x.icono} /> {t(`computo.graf.tipo.${x.id}`, x.labelEs)}
            </button>
          )
        })}
      </div>

      {/* EL PLANO. La `key` con el motor remonta una sola vez al cargarlo: polar
          y paramétrica se encuadran al montar y sin él no tendrían qué medir.

          Con una fórmula del formulario NO se pega: ahí la tarjeta no lleva ni
          lista ni teclado, así que no hay nada que se le pase por debajo. */}
      {objetivo ? (
        <>
          <PanelFormula
            key={objetivo.clave}
            motor={motor}
            objetivo={objetivo}
            modo={tipoEfectivo === '3d' ? '3d' : '2d'}
            onModo={(m) => onEstado((e) => ({ ...e, tipo: m }))}
          />
          <p className="px-1 text-[11px] leading-relaxed text-white/35">
            {t('computo.graf.sinPolarFormula', 'Una fórmula del formulario se dibuja en el plano o como superficie.')}
          </p>
        </>
      ) : (
        <>
          {/* El plano y sus FUNCIONES se pegan juntos: al bajar al teclado hay
              que seguir viendo qué se escribe y en qué curva, no solo la curva.

              Fondo OPACO: `ui-panel-legible` aguanta el modo de interfaz
              transparente, donde `ui-panel` se vuelve translúcido y dejaría ver
              las teclas pasando por detrás.

              El tope de alto es la válvula: con seis funciones y el plano en
              «Alta» el bloque pegado sería más largo que la pantalla y sus
              últimas filas quedarían fuera de alcance mientras esté pegado. */}
          <div className="ui-panel-legible sticky top-0 z-10 max-h-[70vh] space-y-2 overflow-y-auto rounded-xl pb-1">
            {tipoEfectivo === '2d' ? (
              <Plano2D motor={motor} lista={lista} />
            ) : tipoEfectivo === 'polar' ? (
              <PlanoPolar key={`polar${motor ? ':m' : ''}`} motor={motor} lista={lista} />
            ) : tipoEfectivo === 'parametrica' ? (
              <PlanoParametrico key={`param${motor ? ':m' : ''}`} motor={motor} lista={lista} rangoT={estado.rangoT} />
            ) : (
              <Suspense
                fallback={
                  <div className="grid h-64 place-items-center rounded-xl border border-white/10 bg-black/25 text-xs text-white/40">
                    {t('computo.sup.cargando', 'Preparando la superficie…')}
                  </div>
                }
              >
                <Superficie3D
                  motor={motor}
                  expresion={lista[0]?.expr ?? ''}
                  resultado="z"
                  ejeX="x"
                  ejeY="y"
                  rangoX={RANGO_XY_3D}
                  rangoY={RANGO_XY_3D}
                  scope={VACIO_3D}
                />
              </Suspense>
            )}

            {tipo === 'parametrica' && (
              <div className="flex items-center gap-2 text-[11px] text-white/45">
                <span className="shrink-0">t</span>
                <CampoT
                  valor={estado.rangoT[0]}
                  onCambiar={(v) => onEstado((e) => ({ ...e, rangoT: [v, e.rangoT[1]] }))}
                />
                <span className="shrink-0">{t('computo.graf.hasta', 'hasta')}</span>
                <CampoT
                  valor={estado.rangoT[1]}
                  onCambiar={(v) => onEstado((e) => ({ ...e, rangoT: [e.rangoT[0], v] }))}
                />
              </div>
            )}

            <ListaFunciones
              tipo={tipo}
              lista={lista}
              onLista={ponerLista}
              edita={activa?.id ?? 0}
              campo={estado.campo}
              onEditar={(id, c) => onEstado((e) => ({ ...e, edita: id, campo: c }))}
              refEdicion={campo}
              tactil={tactil}
            />
          </div>

          <TecladoMath motor={motor} onInsertar={escribir} />

          <div className="grid grid-cols-4 gap-1.5">
            {VARIABLES[tipo].map((v) => (
              <button
                key={v.escribe}
                type="button"
                onClick={() => escribir(v.escribe)}
                className="rounded-lg bg-white/5 py-2.5 font-mono text-sm font-semibold transition hover:bg-white/15"
              >
                {v.muestra}
              </button>
            ))}
            <button
              type="button"
              onClick={() => escribirEn(texto.slice(0, -1))}
              className="rounded-lg bg-white/5 py-2.5 text-xs font-semibold transition hover:bg-white/15"
              title={t('computo.calc.borrar', 'Borrar')}
              aria-label={t('computo.calc.borrar', 'Borrar')}
            >
              <Icono nombre="volver" />
            </button>
            {/* Las variables ocupan 1 o 2 huecos: el resto de la fila se rellena
                para que el teclado de abajo no baile. */}
            {VARIABLES[tipo].length === 1 && <span />}
            <span />

            {TECLAS.flat().map((k, i) => (
              <button
                key={`${k}-${i}`}
                type="button"
                onClick={() => escribir(k)}
                className="rounded-lg bg-white/10 py-2.5 font-mono text-sm transition hover:bg-white/20"
              >
                {k}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/** El ámbito de una superficie suelta: sus dos variables las pone el muestreo. */
const VACIO_3D: Record<string, number> = {}

/** Un extremo del rango de t. Acepta expresiones no: solo números. */
function CampoT({ valor, onCambiar }: { valor: number; onCambiar: (v: number) => void }) {
  return (
    <input
      inputMode="decimal"
      defaultValue={String(Math.round(valor * 1000) / 1000)}
      onBlur={(e) => {
        const n = Number(e.target.value.replace(',', '.'))
        if (Number.isFinite(n)) onCambiar(n)
      }}
      className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-2 py-1 font-mono text-[11px] outline-none focus:border-accent"
    />
  )
}
