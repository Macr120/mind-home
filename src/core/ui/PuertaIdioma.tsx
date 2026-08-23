import { useState } from 'react'
import { useAjustes } from '../state/ajustesStore'
import { esDemo } from '../edicion'
import { IDIOMAS } from '../i18n/idiomas'
import { useT } from '../i18n/useT'
import { Marca } from './Marca'
import { Piezas } from './queEs/piezas'

/**
 * Lo PRIMERO que ve quien abre la app: en qué idioma la quiere. Va delante de
 * `PuertaUnlock`, así que se pregunta antes del login — quien ya compró la app
 * y entra en un dispositivo nuevo tampoco tiene que leer la pantalla de cuenta
 * en un idioma que no es el suyo.
 *
 * Arranca en INGLÉS (`IDIOMA_DEFAULT`) porque todavía no hay nada que sepa del
 * usuario; tocar una bandera aplica el idioma EN VIVO, así que la pregunta se
 * responde viendo el resultado.
 *
 * Se pregunta UNA vez por instalación. No la ven: la casa demo (es una vitrina,
 * no la casa de nadie) ni quien ya venía usando la app —ya vio la bienvenida o
 * ya tocó el idioma alguna vez—, que no tendría por qué contestar de nuevo.
 */

const LS_ELEGIDO = 'mh.idioma.elegido'
// CRUDA a propósito (sin claveLS): aquí es señal de «instalación veterana», no
// de casa — la copia `probar:mh.bienvenida` del modo probar no cuenta.
const LS_BIENVENIDA = 'mh.bienvenida'
const LS_IDIOMA = 'mh.idioma'

function yaSeEligio(): boolean {
  try {
    return (
      localStorage.getItem(LS_ELEGIDO) === '1' ||
      localStorage.getItem(LS_BIENVENIDA) === '1' ||
      !!localStorage.getItem(LS_IDIOMA)
    )
  } catch {
    return true
  }
}

export function PuertaIdioma({ children }: { children: React.ReactNode }) {
  const [pendiente, setPendiente] = useState(() => !esDemo() && !yaSeEligio())
  if (!pendiente) return <>{children}</>
  return <SelectorIdioma alListo={() => setPendiente(false)} />
}

/**
 * El selector suelto (export): la puerta de la casa lo reabre cuando se toca
 * «Volver» en su menú, porque el idioma es el paso ANTERIOR del arranque y
 * quien se equivocó de bandera tiene que poder deshacerlo. `textoBoton` cambia
 * el rótulo: «Siguiente» cuando se avanza, «Volver» cuando se regresa.
 */
export function SelectorIdioma({
  alListo,
  textoBoton,
}: {
  alListo: () => void
  textoBoton?: string
}) {
  const t = useT()
  const idioma = useAjustes((s) => s.idioma)
  const setIdioma = useAjustes((s) => s.setIdioma)

  const confirmar = () => {
    // `setIdioma` ya escribió `mh.idioma`; esta bandera es la que dice que la
    // PREGUNTA está contestada, para no repetirla a quien solo miró y siguió.
    localStorage.setItem(LS_ELEGIDO, '1')
    alListo()
  }

  return (
    <div className="ui-app ui-arranque fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
      <div className="ui-panel ui-pop flex w-full max-w-lg flex-col rounded-2xl border border-white/10 p-5 shadow-2xl">
        <div className="flex items-center gap-2.5">
          <Piezas className="h-3 w-12" />
          <p className="text-xs font-bold leading-tight text-white/70">
            <Marca />
          </p>
        </div>
        <h1 className="mt-0.5 text-lg font-black text-white/90">
          {t('bienvenida.idioma.titulo', '¿En qué idioma quieres la casa?')}
        </h1>
        <p className="mt-1 text-sm text-white/60">
          {t('bienvenida.idioma.desc', 'Puedes cambiarlo después en Configuraciones.')}
        </p>

        {/* Cada chip lleva su endónimo (banderas: excepción deliberada a <Icono>). */}
        {/* Las banderas entran en cascada rápida: es la primera pantalla de la
            app y aparecer de golpe la dejaba seca. */}
        <div className="mt-3 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
          {IDIOMAS.map((it, i) => {
            const activo = idioma === it.id
            return (
              <button
                key={it.id}
                type="button"
                lang={it.id}
                onClick={() => setIdioma(it.id)}
                style={{ animationDelay: `${80 + i * 28}ms` }}
                className={`ui-cascada ui-presion flex flex-col items-center justify-center gap-1 rounded-xl border px-1.5 py-2.5 text-xs font-semibold leading-tight transition ${
                  activo
                    ? 'ui-accent-bg border-transparent'
                    : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                <span className="text-lg">{it.flag}</span>
                <span className="text-center">{it.endonimo}</span>
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={confirmar}
          className="ui-accent-bg mt-4 self-end rounded-xl px-5 py-2 text-sm font-bold"
        >
          {textoBoton ?? t('bienvenida.siguiente', 'Siguiente')}
        </button>
      </div>
    </div>
  )
}
