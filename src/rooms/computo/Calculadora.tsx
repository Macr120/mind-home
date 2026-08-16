import { useState, type ReactNode } from 'react'
import { VACIO, calculosComputoRepo } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { Archivador } from '../_shared/Archivador'
import { estadoGraficaInicial, type ObjetivoFormula } from './curvas'
import { MenuFormulario } from './MenuFormulario'
import { MODOS, type Modo } from './modos'
import { ModoBases } from './ModoBases'
import { ModoGrafica } from './ModoGrafica'
import { ModoMatrices } from './ModoMatrices'
import { ModoNormal } from './ModoNormal'
import { ModoPropina } from './ModoPropina'
import { ModoRegla3 } from './ModoRegla3'
import { ModoSistemas } from './ModoSistemas'
import { ModoUnidades } from './ModoUnidades'
import { useMotor } from './useMotor'

/**
 * La calculadora, su formulario y sus ocho modos.
 *
 * Un modo SUSTITUYE la vista entera, no se apila: en un teléfono, apilar la
 * rejilla de matrices debajo del teclado dejaría todo a dos pantallas de
 * distancia. Lo único que sobrevive a los ocho es el historial.
 *
 * El FORMULARIO no es un modo sino un menú plegable arriba: es un almacén de
 * fórmulas al que se entra y se sale, no una forma de calcular, y su árbol de 54
 * fórmulas se DESMONTA al cerrarlo (montarlo con su KaTeX cada vez que se entra
 * a sumar dos números no tiene ningún sentido).
 *
 * Aquí viven los dos estados que tienen que SOBREVIVIR a un cambio de modo: la
 * `entrada`, que el historial reinyecta, y la `grafica`, porque ir al formulario
 * a por una fórmula y volver no puede borrar las funciones escritas.
 *
 * El motor se pide UNA vez y baja por prop: lo necesitan la calculadora, el
 * formulario y la gráfica, y antes cada uno enseñaba su propio aviso de error.
 */
export function Calculadora({ modoInicial, formularioInicial }: { modoInicial: Modo; formularioInicial: boolean }) {
  const t = useT()
  const { motor, error, reintentar } = useMotor()
  const historial = calculosComputoRepo.useAll({ limit: 120 }) ?? VACIO
  const [modo, setModo] = useState<Modo>(modoInicial)
  const [entrada, setEntrada] = useState('')
  const [grafica, setGrafica] = useState(estadoGraficaInicial)
  const [formulario, setFormulario] = useState(formularioInicial)

  // Cada modo lo coloca donde le cuadra: el normal en la fila del campo, los
  // demás en la cabecera de su tarjeta.
  const selector = <SelectorModo modo={modo} onModo={setModo} />

  /** Del formulario a la gráfica: se lleva la fórmula, cierra el menú y va allí. */
  const graficar = (o: ObjetivoFormula) => {
    setGrafica((g) => ({ ...g, objetivo: o }))
    setFormulario(false)
    setModo('grafica')
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-3 pb-4">
      {error != null && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs">
          <span className="min-w-0 flex-1">
            {t('computo.motor.error', 'No se pudo cargar el motor de cálculo. Revisa la conexión.')}
          </span>
          <button type="button" onClick={reintentar} className="shrink-0 rounded-lg bg-white/10 px-2 py-1 font-semibold">
            {t('computo.motor.reintentar', 'Reintentar')}
          </button>
        </div>
      )}

      <Desplegable
        ancla="computo.menu.formulario"
        titulo={t('computo.menu.formulario', 'Formulario')}
        abierto={formulario}
        onAlternar={() => setFormulario((x) => !x)}
      >
        <MenuFormulario motor={motor} onGraficar={graficar} />
      </Desplegable>

      {modo === 'normal' && (
        <ModoNormal motor={motor} entrada={entrada} onEntrada={setEntrada} selector={selector} />
      )}
      {modo === 'grafica' && (
        <ModoGrafica motor={motor} estado={grafica} onEstado={setGrafica} selector={selector} />
      )}
      {modo === 'bases' && <ModoBases motor={motor} selector={selector} />}
      {modo === 'matrices' && <ModoMatrices motor={motor} selector={selector} />}
      {modo === 'sistemas' && <ModoSistemas motor={motor} selector={selector} />}
      {modo === 'unidades' && <ModoUnidades motor={motor} selector={selector} />}
      {modo === 'propina' && <ModoPropina selector={selector} />}
      {modo === 'regla3' && <ModoRegla3 selector={selector} />}

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-white/45">
          {t('computo.calc.historial', 'Historial')}
        </h2>
        <Archivador
          items={historial}
          fecha={(c) => c.fecha}
          clave={(c) => c.id ?? c.creadoEn}
          vacio={t('computo.calc.sinHistorial', 'Aquí se guarda lo que vayas calculando.')}
        >
          {(c) => (
            <button
              type="button"
              // Todo lo que se guarda es una expresión que el motor entiende, así
              // que siempre se puede devolver al campo de la calculadora normal.
              onClick={() => {
                setEntrada(c.entrada)
                setModo('normal')
              }}
              className="flex w-full items-baseline gap-2 rounded-lg px-2 py-1 text-start transition hover:bg-white/5"
            >
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-white/70">{c.entrada}</span>
              <span className="shrink-0 font-mono text-xs text-white/45">= {c.salida}</span>
            </button>
          )}
        </Archivador>
      </section>
    </div>
  )
}

/**
 * El menú plegable del formulario. `ancla` es el `data-tut` de la CABECERA: los
 * pasos del tutorial la pulsan para abrirlo antes de señalar lo de dentro.
 */
function Desplegable({
  ancla,
  titulo,
  abierto,
  onAlternar,
  children,
}: {
  ancla: string
  titulo: string
  abierto: boolean
  onAlternar: () => void
  children: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5">
      <button
        type="button"
        data-tut={ancla}
        onClick={onAlternar}
        aria-expanded={abierto}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-start text-sm font-semibold transition hover:bg-white/5"
      >
        <Icono nombre="sigma" />
        <span className="min-w-0 flex-1">{titulo}</span>
        <span className="text-white/40">
          <Icono nombre={abierto ? 'subir' : 'bajar'} />
        </span>
      </button>

      {abierto && <div className="border-t border-white/10 p-3">{children}</div>}
    </div>
  )
}

/**
 * Menú de modos. Dice en qué modo estás y deja cambiarlo sin gastar una fila.
 *
 * La lista se renderiza SIEMPRE y se esconde con `hidden` en vez de desmontarse:
 * los pasos del tutorial pulsan `computo.modo.<id>` para plantarse en un modo
 * concreto, y un botón desmontado no se puede pulsar.
 */
function SelectorModo({ modo, onModo }: { modo: Modo; onModo: (m: Modo) => void }) {
  const t = useT()
  const [abierto, setAbierto] = useState(false)
  const actual = MODOS.find((m) => m.id === modo) ?? MODOS[0]

  return (
    <div className="relative shrink-0">
      {/* Tapa que cierra el menú al tocar fuera, sin escuchar en el documento. */}
      {abierto && <div className="fixed inset-0 z-10" onClick={() => setAbierto(false)} />}

      <button
        type="button"
        data-tut="computo.calc.modos"
        onClick={() => setAbierto((x) => !x)}
        aria-expanded={abierto}
        className="flex items-center gap-1.5 rounded-xl bg-white/10 px-2.5 py-2.5 text-xs font-semibold transition hover:bg-white/20"
      >
        <Icono nombre={actual.icono} />
        <span className="hidden sm:inline">{t(`computo.modo.${actual.id}`, actual.labelEs)}</span>
        <span className="text-white/40">
          <Icono nombre={abierto ? 'subir' : 'bajar'} />
        </span>
      </button>

      <div
        className={`ui-panel absolute end-0 top-full z-20 mt-1 max-h-[60vh] w-48 space-y-0.5 overflow-y-auto rounded-xl border border-white/10 p-1 shadow-xl ${
          abierto ? '' : 'hidden'
        }`}
      >
        {MODOS.map((m) => (
          <button
            key={m.id}
            type="button"
            data-tut={`computo.modo.${m.id}`}
            onClick={() => {
              onModo(m.id)
              setAbierto(false)
            }}
            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-start text-xs font-semibold transition ${
              modo === m.id ? 'ui-accent-bg' : 'hover:bg-white/10'
            }`}
          >
            <Icono nombre={m.icono} /> {t(`computo.modo.${m.id}`, m.labelEs)}
          </button>
        ))}
      </div>
    </div>
  )
}
