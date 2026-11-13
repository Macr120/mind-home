import { lazy, Suspense, useEffect, useState } from 'react'
import { idiomaActual, useT } from '../i18n/useT'
import { esDemo, esProbar } from '../edicion'
import { uidConPago, useSesion } from '../cuenta/sesionStore'
import {
  CompraCancelada,
  comprarUnlock,
  detalleDeFallo,
  hayPagos,
  obtenerUnlock,
  restaurarCompras,
  textoDeFallo,
  type OfertaPro,
} from '../cuenta/paywall'
import { canalPago } from '../plataforma'
import { hayBackend } from '../cuenta/supabase'
import { URL_WEB as urlWeb } from '../cuenta/urlWeb'
import { continuarProbar, entrarProbar } from '../../probar/modo'
import { Icono } from './iconos/Icono'
import { LogoApple, LogoGoogle } from './logosMarca'
import { Marca } from './Marca'
import { cargarTextos } from '../../../web/i18n/paginas/index.mjs'
import { prefijo } from '../../../web/i18n/idiomas.mjs'
import { Pieza, Piezas } from './queEs/piezas'
import { SelectorIdioma } from './PuertaIdioma'
import { BotonEliminarCuenta, FilaCupon, FormularioAcceso, enlaceSoporte } from './editor/EditorCuentaSection'

// El recorrido de la web contada como historias: pesa lo suyo (catálogo de
// textos aparte) y solo lo abre quien toca el botón.
const QueEsOverlay = lazy(() => import('./queEs/QueEsOverlay'))

/**
 * La puerta de la casa propia, en dos pasos: **cuenta** y **desbloqueo**.
 * Desde el 11-nov-2026 la casa vuelve a ser de pago único (5 USD,
 * con una semana de IA): sin pagar se construye igual en el modo probar, pero
 * nada se guarda. El correo ata la compra a la persona y devuelve la casa en
 * otro dispositivo. La IA, el sync y la nube se ofrecen donde se usan, con el
 * aviso «Suscríbete» (`AvisosPlan`); suscribirse también desbloquea la casa.
 *
 * NO pasan por aquí tres casos, y solo tres: la demo, el modo probar (casa
 * propia sin cuenta, BD paralela) y los builds sin backend (100% locales).
 */
export function PuertaCuenta({ children }: { children: React.ReactNode }) {
  const cargando = useSesion((s) => s.cargando)
  const usuario = useSesion((s) => s.usuario)
  // Espejo de `public.pago()`: unlock, plan vigente o cuenta ilimitada.
  const pagada = useSesion((s) => uidConPago(s) !== null)

  if (esDemo() || esProbar() || !hayBackend()) return <>{children}</>
  // Sin destello: mientras la sesión hidrata no se sabe si hay cuenta.
  if (cargando) return null

  if (!usuario) return <PantallaCuenta />
  if (!pagada) return <PantallaTienda />
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
          {t('puerta.probarNota', 'Entra a tu propia MindHaOS (Casa Mental OS) y constrúyela sin cuenta. Para guardarla, creas tu cuenta y la desbloqueas con un pago único que incluye una semana de IA.')}
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

/**
 * Paso 2: el desbloqueo de la casa, por la caja de esta plataforma (`canalPago()`):
 *
 * - `iap` (Android/iOS): compra in-app. Lo único que admiten sus normativas, así
 *   que aquí NO se pinta ningún enlace de pago externo ni el cupón (Apple 3.1.1).
 * - `web`: checkout de RevenueCat en la propia página, sin comisión.
 * - `escritorio`: el mismo cobro directo, pero abriendo el navegador.
 *
 * Quien no quiere pagar todavía vuelve a la prueba SIN perderla
 * (`continuarProbar`): al pagar, `RecuperarPrueba` ofrece pasarla a la casa.
 * Rescatada de la `PuertaUnlock` de antes del 5-oct-2026 (commit ef8c3249).
 */
function PantallaTienda() {
  const t = useT()
  const salir = useSesion((s) => s.salir)
  const canal = canalPago()
  // Constante durante toda la vida de la pantalla: de qué caja se cobra aquí.
  const compraAqui = canal !== 'escritorio' && hayPagos()
  const [oferta, setOferta] = useState<OfertaPro | null>(null)
  const [cargando, setCargando] = useState(compraAqui)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // El código de la tienda bajo el error: con él una captura dice qué pasó.
  const [detalle, setDetalle] = useState<string | null>(null)
  // La tienda cobró y el perfil aún no lo refleja: NO es un error, es espera.
  const [activando, setActivando] = useState(false)

  // Devuelve lo que encontró además de guardarlo: así el botón encadena
  // «no tengo → la pido → la compro» en un solo toque.
  const pedirOferta = async (): Promise<OfertaPro | null> => {
    setCargando(true)
    try {
      const nueva = await obtenerUnlock()
      setOferta(nueva)
      return nueva
    } catch {
      setOferta(null)
      return null
    } finally {
      setCargando(false)
    }
  }

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
    setOcupado(true)
    setError(null)
    setDetalle(null)
    setActivando(false)
    try {
      // Que el catálogo aún no llegara no puede dejar el toque en nada (App
      // Review, 9-sep-2026): se vuelve a pedir aquí y se compra sin soltar el botón.
      const aCobrar = oferta ?? (await pedirOferta())
      if (!aCobrar) {
        if (!useSesion.getState().unlock) {
          setError(t('puerta.sinOferta', 'La tienda no respondió. Revisa tu conexión y vuelve a intentarlo.'))
          setDetalle('sin-productos')
        }
        return
      }
      const ok = await comprarUnlock(aCobrar)
      if (!ok) setActivando(true)
    } catch (e) {
      if (e instanceof CompraCancelada) return
      setError(textoDeFallo(e, t))
      setDetalle(detalleDeFallo(e))
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

      {/* Escritorio: el pago vive en la web. En las apps de tienda NUNCA. */}
      {canal === 'escritorio' && urlWeb && (
        <a href={`${urlWeb}/cuenta`} target="_blank" rel="noreferrer" className={botonPrincipal}>
          {t('puerta.comprarWeb', 'Comprar la MindHaOS en la web')}
        </a>
      )}

      {error && <p className="text-xs leading-snug text-red-400/90">{error}</p>}
      {error && detalle && detalle !== error && (
        <p className="break-all text-[10px] leading-snug text-white/35">{detalle}</p>
      )}
      {activando && !error && (
        <p className="text-xs leading-snug text-accent/90">
          {t('puerta.activando', 'Pago recibido: activando tu MindHaOS (Casa Mental OS). Si tarda, toca «Ya la compré».')}
        </p>
      )}

      <button type="button" onClick={() => continuarProbar()} className={botonSecundario}>
        <Icono nombre="play" />
        {t('puerta.casa.probar', 'Seguir construyendo sin guardar')}
      </button>

      <FilaRestaurar />
      {canal !== 'iap' && <FilaCupon />}
      {/* Hay sesión pero no casa: sin esto la cuenta no se podría borrar (Apple 5.1.1(v)). */}
      <BotonEliminarCuenta />
    </Marco>
  )
}

/**
 * La tarjeta del desbloqueo. La CIFRA la manda SIEMPRE la tienda (en la moneda
 * de cada quien, 5 USD de base): mientras llega van puntos suspensivos y
 * nunca se rellena con una cifra fija, que en las tiendas ni siquiera vale.
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
  const puntos = [
    t('puerta.casa.1', 'Tu casa y todo lo que hagas en ella, guardado para siempre'),
    t('puerta.casa.2', 'Una semana de IA incluida'),
    t('puerta.casa.3', 'Visitas, juegos y mensajes con tus amigos'),
  ]
  return (
    <div className="ui-panel space-y-2 rounded-xl border border-accent/40 p-3 text-center">
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
        {t('puerta.casa.nombre', 'Tu casa mental')}
      </p>
      <p className="text-2xl font-black leading-none text-white/95">
        {precio ?? <span className="text-white/30">{cargando ? '···' : '—'}</span>}
        <small className="ml-1.5 text-xs font-semibold text-white/50">
          {t('puerta.casa.pagoUnico', 'pago único')}
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
      {/* Deshabilitado SOLO con una compra en marcha: un toque durante la carga
          vale como intento (`alComprar` reintenta el catálogo). */}
      <button type="button" onClick={alComprar} disabled={ocupado} className={botonPrincipal}>
        <Icono nombre="casa" />
        {ocupado ? t('puerta.comprando', 'Procesando…') : t('puerta.casa.cta', 'Desbloquear mi casa')}
      </button>
      {cargando && !precio && (
        <p className="text-[11px] leading-snug text-white/45">
          {t('puerta.conectandoTienda', 'Conectando con la tienda…')}
        </p>
      )}
      <p className="text-[11px] leading-snug text-white/40">
        {t('puerta.casa.nota', 'Después de esa semana, la IA es aparte: una suscripción que cancelas cuando quieras.')}
      </p>
    </div>
  )
}

/**
 * Las dos salidas de quien YA pagó: «Restaurar compras» (Apple lo exige, y
 * sirve a quien reinstala) y «Ya la compré», que solo relee el perfil (compró
 * en otra plataforma o acaba de canjear un cupón).
 */
function FilaRestaurar() {
  const t = useT()
  const refrescarPerfil = useSesion((s) => s.refrescarPerfil)
  const [ocupado, setOcupado] = useState<'tienda' | 'cuenta' | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const enTienda = canalPago() === 'iap' && hayPagos()

  const intentar = async (cual: 'tienda' | 'cuenta') => {
    if (ocupado) return
    setOcupado(cual)
    setAviso(null)
    try {
      let ok: boolean
      if (cual === 'tienda') ok = await restaurarCompras()
      else {
        await refrescarPerfil()
        ok = uidConPago(useSesion.getState()) !== null
      }
      // Si llegó, la puerta de arriba se abre sola: está suscrita a la sesión.
      if (!ok) setAviso(t('puerta.sinRestaurar', 'No encontramos compras de esta cuenta.'))
    } catch (e) {
      setAviso(textoDeFallo(e, t))
    } finally {
      setOcupado(null)
    }
  }

  return (
    <div className="space-y-1.5">
      {enTienda && (
        <button
          type="button"
          onClick={() => void intentar('tienda')}
          disabled={!!ocupado}
          className={`${botonSecundario} disabled:opacity-50`}
        >
          <Icono nombre="restaurar" />
          {ocupado === 'tienda' ? '…' : t('puerta.restaurar', 'Restaurar compras')}
        </button>
      )}
      <button
        type="button"
        onClick={() => void intentar('cuenta')}
        disabled={!!ocupado}
        className={`${botonSecundario} disabled:opacity-50`}
      >
        <Icono nombre="sincronizar" />
        {ocupado === 'cuenta' ? '…' : t('puerta.yaCompre', 'Ya la compré: comprobar de nuevo')}
      </button>
      {aviso && <p className="text-[11px] leading-snug text-white/45">{aviso}</p>}
    </div>
  )
}
