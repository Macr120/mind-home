import { lazy, Suspense, useEffect, useState } from 'react'
import { idiomaActual, useT } from '../i18n/useT'
import { esDemo, esProbar, tieneUnlock } from '../edicion'
import { useSesion } from '../cuenta/sesionStore'
import { canalPago } from '../plataforma'
import { hayBackend } from '../cuenta/supabase'
import { comprarUnlock, hayPagos, obtenerUnlock, type OfertaPro } from '../cuenta/paywall'
import { URL_WEB as urlWeb } from '../cuenta/urlWeb'
import { entrarProbar } from '../../probar/modo'
import { Icono } from './iconos/Icono'
import { LogoApple, LogoGoogle } from './logosMarca'
import { Marca } from './Marca'
import { cargarTextos } from '../../../web/i18n/paginas/index.mjs'
import { sinHtml } from './queEs/laminas'
import { Pieza, Piezas } from './queEs/piezas'
import { SelectorIdioma } from './PuertaIdioma'
import { FormularioAcceso } from './editor/EditorCuentaSection'

// El recorrido de la web contada como historias: pesa lo suyo (catálogo de
// textos aparte) y solo lo abre quien toca el botón.
const QueEsOverlay = lazy(() => import('./queEs/QueEsOverlay'))

/**
 * La puerta de la casa propia, en dos pasos y en este orden: **cuenta** y
 * **compra**. Es el flujo del modelo de negocio (`edicion.ts`) y es el MISMO en
 * las tres plataformas desde ago 2026: la casa se compra dentro de la app, se
 * pague donde se pague.
 *
 * 1. Sin sesión → registro/login. Obligatorio: el correo es lo que ata la
 *    compra a la persona y lo que devuelve la casa en otro dispositivo.
 * 2. Con sesión → hace falta que la cuenta tenga la casa (`tieneUnlock()`).
 *    Aquí se vende, por la caja que toque (`canalPago()`): compra in-app en
 *    Android e iOS, checkout directo en el navegador y en el escritorio.
 *
 * Comprar UNA vez basta para todos los dispositivos: el unlock vive en
 * `perfiles`, no en la instalación. Quien ya compró en otra plataforma entra
 * con su cuenta y la puerta se abre sola al refrescar el perfil.
 *
 * NO pasan por aquí tres casos, y solo tres: la demo, el modo probar (casa
 * propia sin cuenta, BD paralela) y los builds sin backend (100% locales). No
 * hay atajo de dispositivo: quien deba entrar sin pagar
 * canjea un cupón, que concede el mismo unlock en la cuenta. El espejo
 * `mh.unlock` lo escribe sesionStore al refrescar el perfil, así que suscribirse
 * a la sesión re-evalúa la puerta en cuanto la compra o el cupón aterrizan.
 */
export function PuertaUnlock({ children }: { children: React.ReactNode }) {
  const cargando = useSesion((s) => s.cargando)
  const usuario = useSesion((s) => s.usuario)
  // Solo por reactividad: la verdad síncrona la tiene el espejo de localStorage.
  useSesion((s) => s.unlock)

  if (esDemo() || esProbar() || !hayBackend()) return <>{children}</>
  // Sin destello: mientras la sesión hidrata no se sabe si hay cuenta.
  if (cargando) return null

  if (!usuario) return <PantallaCuenta />
  if (!tieneUnlock()) return <PantallaTienda />
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
 * secuencia (idioma → cuenta → compra) y de cada paso se puede deshacer el
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
 * Paso 1: la cuenta. Va SIEMPRE antes de la compra: es lo que ata el pago a la
 * persona y lo que devuelve la casa en cualquier otro dispositivo, compre donde
 * compre.
 *
 * Abre en un MENÚ con las dos entradas separadas —entrar arriba, crear cuenta
 * abajo— porque son dos personas distintas: quien reinstala o estrena
 * dispositivo, y quien acaba de descubrir la app. A esta segunda le falta
 * además saber qué está a punto de comprar, y para eso está el recorrido
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
          {t('puerta.queEs', '¿Qué es {n}?', { n: t('marca.nombre', 'Planificador Mental-Casa') })}
        </button>
        <button type="button" onClick={() => entrarProbar()} className={botonSecundario}>
          <Icono nombre="play" />
          {t('puerta.probar', 'Probar hacer tu casa gratis')}
        </button>
        <p className="text-[11px] leading-snug text-white/40">
          {t('puerta.probarNota', 'Entra a tu propia casa y pruébala sin cuenta. Para guardar tus cambios, usar la IA y sincronizar, crearás tu cuenta.')}
        </p>
      </div>
    </Marco>
  )
}

/**
 * Paso 2: la compra de la casa, dentro de la app y por la caja de esta
 * plataforma (`canalPago()`):
 *
 * - `iap` (Android/iOS): compra in-app de la tienda. Es lo único que admiten
 *   sus normativas, así que aquí NO se pinta ningún enlace de pago externo.
 * - `web`: checkout de RevenueCat en la propia página, sin comisión.
 * - `escritorio`: el mismo cobro directo, pero abriendo el navegador — Electron
 *   no es sitio para un formulario de pago.
 *
 * Se paga UNA vez para todos los dispositivos: quien ya compró en otra
 * plataforma solo tiene que entrar con su cuenta («Ya la compré»), y quien
 * reinstala usa «Restaurar compras», que Apple además exige.
 */
function PantallaTienda() {
  const t = useT()
  const salir = useSesion((s) => s.salir)
  const canal = canalPago()
  // Constante durante toda la vida de la pantalla: de qué caja se cobra aquí.
  const compraAqui = canal !== 'escritorio' && hayPagos()
  const [oferta, setOferta] = useState<OfertaPro | null>(null)
  // Solo hay algo que esperar si esta plataforma cobra aquí dentro.
  const [cargando, setCargando] = useState(compraAqui)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // La oferta de la tienda. Se pide al entrar y se puede volver a pedir desde
  // el propio botón si no llegó (red caída, catálogo aún propagándose).
  const pedirOferta = async () => {
    setCargando(true)
    try {
      setOferta(await obtenerUnlock())
    } catch {
      setOferta(null)
    } finally {
      setCargando(false)
    }
  }

  // Primera carga: suscripción a la tienda, con el resultado en el callback (la
  // regla de hooks no admite setState síncrono dentro del efecto).
  useEffect(() => {
    if (!compraAqui) return
    let vivo = true
    obtenerUnlock()
      .then((o) => {
        if (!vivo) return
        setOferta(o)
        setCargando(false)
      })
      .catch(() => {
        if (vivo) setCargando(false)
      })
    return () => {
      vivo = false
    }
  }, [compraAqui])

  const alComprar = async () => {
    if (ocupado) return
    // Sin oferta no hay nada que cobrar: el botón sirve para reintentar.
    if (!oferta) {
      await pedirOferta()
      if (!useSesion.getState().unlock) {
        setError(t('puerta.sinOferta', 'La tienda no respondió. Revisa tu conexión y vuelve a intentarlo.'))
      }
      return
    }
    setOcupado(true)
    setError(null)
    try {
      const ok = await comprarUnlock(oferta.paquete)
      if (!ok) setError(t('puerta.compraFallo', 'La compra no se completó. Vuelve a intentarlo.'))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Marco paso="tienda" alVolver={() => void salir()}>
      {compraAqui && (
        <TarjetaPrecio
          precio={oferta?.precio}
          ocupado={ocupado}
          cargando={cargando}
          alComprar={() => void alComprar()}
        />
      )}

      {/* Escritorio: el pago vive en la web (directo, sin comisión de tienda).
          En las apps de tienda este enlace NO se pinta nunca. */}
      {canal === 'escritorio' && urlWeb && (
        <a href={`${urlWeb}/cuenta`} target="_blank" rel="noreferrer" className={botonPrincipal}>
          {t('puerta.comprarWeb', 'Comprar la casa en la web')}
        </a>
      )}

      {error && <p className="text-[11px] leading-snug text-red-400/90">{error}</p>}

      {/* El cupón es la ÚNICA vía de entrar sin pagar (ya no hay atajo local),
          así que va aquí arriba con la compra y no escondido al pie. */}
      <FilaCupon />

    </Marco>
  )
}

/**
 * La caja de precio de la web (`#precio`, la columna «La app»), aquí dentro:
 * mismo rótulo, misma cifra, los mismos tres beneficios y las piezas de la
 * marca como viñeta. Los textos vienen del catálogo traducido de la web
 * (`precio.app.*`), que ya está en los dieciséis idiomas — el mismo puente que
 * usa el recorrido, así que retocar la web actualiza también esta pantalla.
 *
 * La CIFRA la manda SIEMPRE la tienda (`oferta.precio`, en la moneda de cada
 * quien): mientras llega se deja en puntos suspensivos, y nunca se rellena con
 * el «8.89 USD» del catálogo — verlo saltar de una cifra a otra parecía un
 * cambio de precio, y en las tiendas ese importe fijo ni siquiera vale. Y el pie
 * de la web («cómprala aquí mismo, sin pasar por ninguna tienda…») no se pinta:
 * dentro de la app señalaría una caja de fuera, que es justo lo que las tiendas
 * prohíben.
 */
function TarjetaPrecio({
  precio,
  ocupado,
  cargando,
  alComprar,
}: {
  precio?: string
  ocupado: boolean
  cargando: boolean
  alComprar: () => void
}) {
  const t = useT()
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

  const x = (clave: string, respaldo: string): string => sinHtml(textos?.[clave] ?? respaldo)
  const puntos = ['precio.app.1', 'precio.app.2', 'precio.app.3']
    .map((c) => (textos ? sinHtml(textos[c] ?? '') : ''))
    .filter(Boolean)

  return (
    <div className="ui-panel space-y-2 rounded-xl border border-accent/40 p-3 text-center">
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
        {x('precio.app.nombre', 'La app')}
      </p>
      <p className="text-2xl font-black leading-none text-white/95">
        {precio ?? <span className="text-white/30">···</span>}
        <small className="ml-1.5 text-xs font-semibold text-white/50">
          {x('precio.app.pagoUnico', 'pago único')}
        </small>
      </p>
      <ul className="space-y-1.5 text-left">
        {puntos.map((punto, i) => (
          <li key={punto} className="flex items-start gap-2 text-[11px] leading-snug text-white/65">
            <Pieza i={i} className="mt-0.5 h-2.5 w-2.5" />
            <span className="min-w-0">{punto}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={alComprar}
        disabled={ocupado || cargando}
        className={botonPrincipal}
      >
        <Icono nombre="casa" />
        {ocupado ? t('puerta.comprando', 'Procesando…') : x('precio.app.cta', 'Comprar la casa')}
      </button>
    </div>
  )
}

/**
 * Canje discreto de cupones (testers y accesos regalados). Exige sesión: la
 * Edge Function `canjear-cupon` valida el JWT y aplica la misma alta que la
 * compra en la tienda. Al canjear, `refrescarPerfil` trae el unlock y la puerta
 * de arriba se abre sola (está suscrita a `s.unlock`).
 */
function FilaCupon() {
  const t = useT()
  const canjearCupon = useSesion((s) => s.canjearCupon)
  const [abierto, setAbierto] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className={botonSecundario}>
        <Icono nombre="regalo" />
        {t('puerta.cupon.tengo', 'Tengo un cupón')}
      </button>
    )
  }

  const alCanjear = async () => {
    if (!codigo.trim() || ocupado) return
    setOcupado(true)
    setError(null)
    const mensaje = await canjearCupon(codigo)
    setOcupado(false)
    if (mensaje) setError(mensaje)
  }

  return (
    <div className="space-y-1.5 rounded-md border border-white/10 bg-white/5 p-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
        {t('puerta.cupon.desc', 'Link de referido')}
      </p>
      <div className="flex gap-1.5">
        <input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void alCanjear()
          }}
          placeholder={t('puerta.cupon.codigo', 'Código del cupón')}
          className="min-w-0 flex-1 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white/85 placeholder:text-white/30 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => void alCanjear()}
          disabled={ocupado || !codigo.trim()}
          className="shrink-0 rounded-md border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-white/85 transition hover:bg-white/15 disabled:opacity-50"
        >
          {ocupado ? '…' : t('puerta.cupon.canjear', 'Canjear')}
        </button>
      </div>
      {error && <p className="text-[11px] leading-snug text-red-400/90">{error}</p>}
    </div>
  )
}
