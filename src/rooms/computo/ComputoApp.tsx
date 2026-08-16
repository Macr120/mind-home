import { useEffect, useState } from 'react'
import { intencionApp } from '../../core/state/intencionApp'
import { Calculadora } from './Calculadora'
import { HojasTab } from './HojasTab'
import { cargarMotor } from './motor'
import { esModo, type Modo } from './modos'
import { sembrarComputo } from './siembra'
import { PestanasCarpeta, type ItemPestana } from '../_shared/PestanasCarpeta'
import { COLOR } from './constantes'

/**
 * La sala de cómputo en dos tiempos: la CALCULADORA —con sus ocho modos, entre
 * ellos la gráfica y el formulario— y las HOJAS para todo lo tabular.
 */

type Tab = 'calculadora' | 'hojas'

const TABS: ItemPestana<Tab>[] = [
  { id: 'calculadora', icono: 'calculadora', labelEs: 'Calculadora' },
  { id: 'hojas', icono: 'hoja', labelEs: 'Hojas de cálculo' },
]

/**
 * A dónde llega quien viene del chat, de un enlace de plan o de un widget.
 *
 * «grafica» era un menú plegable y hoy es un MODO con el mismo id, así que sus
 * enlaces siguen valiendo sin caso especial. «formulario» sigue siendo un menú y
 * abre el suyo. Ningún id de sección guardado puede dejar de existir.
 */
function destinoInicial(): { tab: Tab; modo: Modo; formulario: boolean } {
  const seccion = intencionApp('computo')?.seccion
  if (seccion === 'hojas') return { tab: 'hojas', modo: 'normal', formulario: false }
  if (seccion === 'formulario') return { tab: 'calculadora', modo: 'normal', formulario: true }
  if (esModo(seccion)) return { tab: 'calculadora', modo: seccion, formulario: false }
  // «calculadora», «ecuacion» y cualquier otra: la calculadora limpia.
  return { tab: 'calculadora', modo: 'normal', formulario: false }
}

export function ComputoApp() {
  // La intención se lee UNA vez: caduca a los 15 s y volver a mirarla en cada
  // repintado daría destinos distintos a mitad de sesión.
  const [inicio] = useState(destinoInicial)
  const [tab, setTab] = useState<Tab>(inicio.tab)
  const [plegado, setPlegado] = useState(false)

  // El motor se pide al montar: cuando el usuario llega a la calculadora, ya
  // está caliente. Si falla, cada pestaña enseña su propio aviso. Y de paso se
  // siembra el formulario y las hojas de arranque la primera vez (es idempotente
  // y corta sola en la casa demo).
  useEffect(() => {
    void cargarMotor().catch(() => {})
    void sembrarComputo().catch((e) => console.error('[computo] no se pudo sembrar:', e))
  }, [])

  return (
    // Sin `h-full` ni scroll propio: el que manda es el `<main>` del cuarto. Así
    // las dos pestañas se van con el desplazamiento en vez de quedarse clavadas
    // arriba comiéndose una franja, y lo que se pega es lo que de verdad hace
    // falta a la vista (el plano y sus funciones).
    <div className="space-y-3">
      <div className="mx-auto w-full max-w-3xl">
        <PestanasCarpeta
          items={TABS}
          activo={tab}
          onCambio={setTab}
          prefijoClave="computo.tab"
          color={COLOR}
          variante="raiz"
          plegado={plegado}
          onAlternarPliegue={() => setPlegado((v) => !v)}
        />
      </div>

      {!plegado && (
        <>
          {tab === 'calculadora' && <Calculadora modoInicial={inicio.modo} formularioInicial={inicio.formulario} />}
          {tab === 'hojas' && <HojasTab />}
        </>
      )}
    </div>
  )
}
