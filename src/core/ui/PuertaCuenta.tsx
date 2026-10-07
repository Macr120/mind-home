import { lazy, Suspense, useEffect, useState } from 'react'
import { idiomaActual, useT } from '../i18n/useT'
import { esDemo, esProbar } from '../edicion'
import { useSesion } from '../cuenta/sesionStore'
import { canalPago } from '../plataforma'
import { hayBackend } from '../cuenta/supabase'
import { URL_WEB as urlWeb } from '../cuenta/urlWeb'
import { entrarProbar } from '../../probar/modo'
import { Icono } from './iconos/Icono'
import { LogoApple, LogoGoogle } from './logosMarca'
import { Marca } from './Marca'
import { cargarTextos } from '../../../web/i18n/paginas/index.mjs'
import { prefijo } from '../../../web/i18n/idiomas.mjs'
import { Piezas } from './queEs/piezas'
import { SelectorIdioma } from './PuertaIdioma'
import { FormularioAcceso, enlaceSoporte } from './editor/EditorCuentaSection'

// El recorrido de la web contada como historias: pesa lo suyo (catálogo de
// textos aparte) y solo lo abre quien toca el botón.
const QueEsOverlay = lazy(() => import('./queEs/QueEsOverlay'))

/**
 * La puerta de la casa propia: solo la **cuenta** (desde el 5-oct-2026 la casa
 * es gratis). El correo es lo que ata la suscripción a la persona y lo que
 * devuelve la casa en otro dispositivo. Lo que cuesta dinero (IA, sync, nube)
 * se ofrece donde se usa, con el aviso «Suscríbete» (`AvisosPlan`).
 *
 * NO pasan por aquí tres casos, y solo tres: la demo, el modo probar (casa
 * propia sin cuenta, BD paralela) y los builds sin backend (100% locales).
 */
export function PuertaCuenta({ children }: { children: React.ReactNode }) {
  const cargando = useSesion((s) => s.cargando)
  const usuario = useSesion((s) => s.usuario)

  if (esDemo() || esProbar() || !hayBackend()) return <>{children}</>
  // Sin destello: mientras la sesión hidrata no se sabe si hay cuenta.
  if (cargando) return null

  if (!usuario) return <PantallaCuenta />
  return <>{children}</>
}

const botonPrincipal =
  'ui-accent-bg ui-presion flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-center text-sm font-bold transition disabled:opacity-50'
const botonSecundario =
  'ui-presion flex w-full items-center justify-center gap-2 rounded-md border border-white/15 bg-white/10 px-3 py-2 text-center text-xs font-bold text-white/85 transition hover:bg-white/15'

/**
 * El panel de la puerta. `paso` es la `key` del panel: al cambiar de pantalla
 * (menú → entrar → recorrido…) React lo remonta y el `ui-pop` se reproduce, así
 * que cada menú entra con su propia animación en vez de cambiar de golpe.
 *
 * `alVolver` pinta el botón de regreso arriba del todo: el arranque es una
 * secuencia (idioma → cuenta) y de cada paso se puede deshacer el
 * anterior. Solo el primero, el idioma, no lo lleva.
 */
function Marco({
  children,
  paso,
  alVolver,
}: {
  children: React.ReactNode
  paso?: string
  alVolver?: () => void
}) {
  const t = useT()
  return (
    // Superficie y panel DEL TEMA (`ui-app`/`ui-panel`), como la puerta de idioma:
    // el arranque entero respeta la luz elegida y en una instalación nueva sale
    // claro. Con un fondo oscuro fijo, en base clara los `text-white/X` se
    // volvían tinta casi negra sobre negro y no se leía nada.
    <div className="ui-app ui-arranque fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto p-4">
      <div
        key={paso}
        className="ui-panel ui-pop w-full max-w-sm space-y-3 rounded-2xl border border-white/10 p-5"
      >
        {alVolver && (
          <button
            type="button"
            onClick={alVolver}
            className="ui-presion -mt-1 flex items-center gap-1 self-start rounded-md px-1 py-0.5 text-xs font-semibold text-white/50 transition hover:text-white/80"
          >
            <Icono nombre="atras" />
            {t('puerta.volver', 'Volver')}
          </button>
        )}
        {/* El emblema de la marca son las tres piezas sueltas, como en la web;
            el icono de la app (con su fondo opaco) es para el lanzador, no para
            una pantalla que ya tiene su propio fondo. */}
        <div className="flex items-center gap-2.5">
          <Piezas className="h-3.5 w-14" />
          <h1 className="text-lg font-extrabold leading-tight text-white/95">
            <Marca />
          </h1>
        </div>
        {children}
      </div>
    </div>
  )
}

/**
 * La cuenta: es lo que ata la suscripción a la
 * persona y lo que devuelve la casa en cualquier otro dispositivo, compre donde
 * compre.
 *
 * Abre en un MENÚ con las dos entradas separadas —entrar arriba, crear cuenta
 * abajo— porque son dos personas distintas: quien reinstala o estrena
 * dispositivo, y quien acaba de descubrir la app. A esta segunda le falta
 * además saber qué es, y para eso está el recorrido
 * «¿Qué es Mind Planner Home?» (la web pública contada como historias).
 */
function PantallaCuenta() {
  const t = useT()
  const [paso, setPaso] = useState<'menu' | 'entrar' | 'registrar' | 'idioma'>('menu')
  const [queEs, setQueEs] = useState(false)

  if (queEs) {
    return (
      <Suspense fallback={<div className="ui-app fixed inset-0 z-[90]" />}>
        <QueEsOverlay alCerrar={() => setQueEs(false)} />
      </Suspense>
    )
  }

  // El paso ANTERIOR del arranque: el idioma. Se reabre entero (el mismo
  // selector de banderas de `PuertaIdioma`) y su botón dice «Volver».
  if (paso === 'idioma') {
    return <SelectorIdioma alListo={() => setPaso('menu')} textoBoton={t('puerta.volver', 'Volver')} />
  }

  if (paso !== 'menu') {
    return (
      <Marco paso={paso} alVolver={() => setPaso('menu')}>
        <FormularioAcceso inicial={paso} />
      </Marco>
    )
  }

  // Los cuatro botones entran en cascada detrás del panel, cada uno con su
  // icono: sin ellos la puerta es una columna de rectángulos iguales.
  return (
    <Marco paso="menu" alVolver={() => setPaso('idioma')}>
      <p className="ui-cascada text-xs leading-snug text-white/60" style={{ animationDelay: '60ms' }}>
        {t('puerta.correo', 'Tu cuenta te acompaña en cualquier dispositivo.')}
      </p>
      <button
        type="button"
        onClick={() => setPaso('entrar')}
        className={`ui-cascada ${botonPrincipal}`}
        style={{ animationDelay: '130ms' }}
      >
        <Icono nombre="cuartos" />
        {t('puerta.entrarCuenta', 'Ya tengo una cuenta: iniciar sesión')}
      </button>
      {/* Con qué se puede crear la cuenta se enseña con los LOGOS, no con sus
          nombres: se reconocen antes y el botón cabe en una línea en los
          dieciséis idiomas. */}
      <button
        type="button"
        onClick={() => setPaso('registrar')}
        className={`ui-cascada ${botonSecundario}`}
        style={{ animationDelay: '200ms' }}
      >
        {t('puerta.crearCuenta', 'Crear una cuenta')}
        <span className="flex items-center gap-1.5 text-white/45">
          <LogoGoogle className="h-4 w-4" />
          <LogoApple className="h-4 w-4" />
          <Icono nombre="correo" />
        </span>
      </button>
      <div
        className="ui-cascada space-y-1.5 border-t border-white/10 pt-3"
        style={{ animationDelay: '270ms' }}
      >
        <button type="button" onClick={() => setQueEs(true)} className={botonSecundario}>
          <Icono nombre="ayuda" />
          {t('puerta.queEs', '¿Qué es {n}?', { n: t('marca.nombre', 'MindHaOS') })}
        </button>
        <button type="button" onClick={() => entrarProbar()} className={botonSecundario}>
          <Icono nombre="play" />
          {t('puerta.probar', 'Probar hacer tu MindHaOS gratis')}
        </button>
        <p className="text-[11px] leading-snug text-white/40">
          {t('puerta.probarNota', 'Entra a tu propia MindHaOS (Casa Mental OS) y pruébala sin cuenta. Para guardar tus cambios, usar la IA y sincronizar, crearás tu cuenta.')}
        </p>
      </div>
      {((canalPago() === 'web' && urlWeb) || canalPago() === 'iap') && <PiePaginas />}
    </Marco>
  )
}

/**
 * Los enlaces de páginas del sitio (privacidad, términos, soporte) en el
 * navegador: desde que la raíz del dominio redirige a la app, esta puerta hace
 * también de portada y esas páginas deben poder abrirse desde ella. En las apps
 * de tienda queda SOLO el soporte, por correo (ver `enlaceSoporte`): Apple pide
 * el contacto a mano (1.5) y las páginas del sitio llevan a la compra de fuera.
 * En el escritorio no se pinta. Los rótulos salen del catálogo traducido de la
 * web (`pie.*`), el mismo puente de la tarjeta de precio, y el enlace lleva el
 * prefijo del idioma en curso.
 */
function PiePaginas() {
  const [textos, setTextos] = useState<Record<string, string> | null>(null)

  useEffect(() => {
    let vivo = true
    void cargarTextos(idiomaActual()).then((x) => {
      if (vivo) setTextos(x)
    })
    return () => {
      vivo = false
    }
  }, [])

  const base = `${urlWeb}${prefijo(idiomaActual())}`
  const soporte: [string, string] = [enlaceSoporte(base), textos?.['pie.soporte'] ?? 'Soporte']
  const paginas: [string, string][] =
    canalPago() === 'iap'
      ? [soporte]
      : [
          [`${base}/privacidad`, textos?.['pie.privacidad'] ?? 'Privacidad'],
          [`${base}/terminos`, textos?.['pie.terminos'] ?? 'Términos'],
          soporte,
        ]
  return (
    <p
      className="ui-cascada flex flex-wrap justify-center gap-x-4 gap-y-1 pt-1 text-[11px] text-white/40"
      style={{ animationDelay: '340ms' }}
    >
      {paginas.map(([url, rotulo]) => (
        <a
          key={url}
          href={url}
          target="_blank"
          rel="noreferrer"
          className="transition hover:text-white/70"
        >
          {rotulo}
        </a>
      ))}
    </p>
  )
}
