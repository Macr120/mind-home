import { useEffect, useState } from 'react'
import { useT } from '../../core/i18n/useT'
import { intencionApp } from '../../core/state/intencionApp'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import { Calculadora } from './Calculadora'
import { COLOR } from './constantes'
import { HojasTab } from './HojasTab'
import { cargarMotor } from './motor'
import { esModo, type Modo } from './modos'
import { sembrarComputo } from './siembra'

/**
 * La sala de cómputo en dos tiempos: la CALCULADORA —con sus nueve modos, entre
 * ellos la gráfica y el formulario— y las HOJAS para todo lo tabular.
 */

type Tab = 'calculadora' | 'hojas'

const TABS: { id: Tab; icono: NombreIcono; labelEs: string }[] = [
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
  const t = useT()
  // La intención se lee UNA vez: caduca a los 15 s y volver a mirarla en cada
  // repintado daría destinos distintos a mitad de sesión.
  const [inicio] = useState(destinoInicial)
  const [tab, setTab] = useState<Tab>(inicio.tab)

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
      <div className="mx-auto flex w-full max-w-3xl gap-2">
        {TABS.map((x) => (
          <button
            key={x.id}
            data-tut={`computo.tab.${x.id}`}
            onClick={() => setTab(x.id)}
            className={`flex-1 rounded-xl px-1 py-2 text-xs font-semibold leading-tight transition ${
              tab === x.id ? 'texto-cta' : 'bg-white/5 hover:bg-white/10'
            }`}
            style={tab === x.id ? { background: COLOR } : undefined}
          >
            <Icono nombre={x.icono} /> {t(`computo.tab.${x.id}`, x.labelEs)}
          </button>
        ))}
      </div>

      {tab === 'calculadora' && <Calculadora modoInicial={inicio.modo} formularioInicial={inicio.formulario} />}
      {tab === 'hojas' && <HojasTab />}
    </div>
  )
}
