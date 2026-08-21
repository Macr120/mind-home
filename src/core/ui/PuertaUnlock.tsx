import { useEffect, useState } from 'react'
import { useT } from '../i18n/useT'
import { derechosAdquiridos, esDemo, tieneUnlock } from '../edicion'
import { useSesion } from '../cuenta/sesionStore'
import { canalPago } from '../plataforma'
import { hayBackend } from '../cuenta/supabase'
import { comprarUnlock, hayPagos, obtenerUnlock, restaurarCompras, type OfertaPro } from '../cuenta/paywall'
import { URL_WEB as urlWeb } from '../cuenta/urlWeb'
import { entrarDemo } from '../../demo/modo'
import { FormularioAcceso } from './editor/EditorCuentaSection'

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
 * NO pasan por aquí: la demo, los builds sin backend (100% locales) y las
 * instalaciones anteriores a la cuenta obligatoria (`derechosAdquiridos()`).
 * El espejo `mh.unlock` lo escribe sesionStore al refrescar el perfil, así que
 * suscribirse a la sesión re-evalúa la puerta en cuanto la compra aterriza.
 */
export function PuertaUnlock({ children }: { children: React.ReactNode }) {
  const cargando = useSesion((s) => s.cargando)
  const usuario = useSesion((s) => s.usuario)
  // Solo por reactividad: la verdad síncrona la tiene el espejo de localStorage.
  useSesion((s) => s.unlock)

  if (esDemo() || !hayBackend() || derechosAdquiridos()) return <>{children}</>
  // Sin destello: mientras la sesión hidrata no se sabe si hay cuenta.
  if (cargando) return null

  if (!usuario) return <PantallaCuenta />
  if (!tieneUnlock()) return <PantallaTienda />
  return <>{children}</>
}

const botonPrincipal =
  'ui-accent-bg block w-full rounded-md px-3 py-2 text-center text-sm font-bold transition disabled:opacity-50'
const botonSecundario =
  'block w-full rounded-md border border-white/15 bg-white/10 px-3 py-2 text-center text-xs font-bold text-white/85 transition hover:bg-white/15'

function Marco({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-[#0f1115] p-4">
      <div className="w-full max-w-sm space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5">
        <h1 className="text-lg font-extrabold text-white/95">Mind Planner Home</h1>
        {children}
      </div>
    </div>
  )
}

/**
 * Paso 1: el correo. Va SIEMPRE antes de la compra: es lo que ata el pago a la
 * persona y lo que devuelve la casa en cualquier otro dispositivo, compre donde
 * compre. En la app de tienda se llega recién instalada, así que abre en «crear
 * cuenta»; en el navegador, en «entrar».
 */
function PantallaCuenta() {
  const t = useT()

  return (
    <Marco>
      <p className="text-xs leading-snug text-white/60">
        {t(
          'puerta.correo',
          'Registra tu correo para empezar: es lo que guarda tu casa, la sincroniza y te la devuelve en cualquier dispositivo.',
        )}
      </p>
      <FormularioAcceso inicial={canalPago() === 'iap' ? 'registrar' : 'entrar'} />
      <div className="space-y-1.5 border-t border-white/10 pt-3">
        <button type="button" onClick={() => entrarDemo()} className={botonSecundario}>
          {t('puerta.demo', 'Probar la demo gratis')}
        </button>
        <p className="text-[11px] leading-snug text-white/40">
          {t('puerta.demoNota', 'La casa de Pep@ con un año de vida dentro: pruébalo todo, nada se guarda.')}
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
  const usuario = useSesion((s) => s.usuario)
  const salir = useSesion((s) => s.salir)
  const refrescarPerfil = useSesion((s) => s.refrescarPerfil)
  const canal = canalPago()
  const [oferta, setOferta] = useState<OfertaPro | null>(null)
  const [ocupado, setOcupado] = useState<'compra' | 'restaura' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const compraAqui = canal !== 'escritorio' && hayPagos()

  useEffect(() => {
    if (!compraAqui) return
    let vivo = true
    obtenerUnlock()
      .then((o) => {
        if (vivo) setOferta(o)
      })
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [compraAqui])

  const alComprar = async () => {
    if (!oferta || ocupado) return
    setOcupado('compra')
    setError(null)
    try {
      const ok = await comprarUnlock(oferta.paquete)
      if (!ok) setError(t('puerta.compraFallo', 'La compra no se completó. Si ya pagaste, prueba «Restaurar compras».'))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setOcupado(null)
    }
  }

  const alRestaurar = async () => {
    if (ocupado) return
    setOcupado('restaura')
    setError(null)
    try {
      const ok = await restaurarCompras()
      if (!ok) setError(t('puerta.sinRestaurar', 'No encontramos compras de esta cuenta.'))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setOcupado(null)
    }
  }

  return (
    <Marco>
      <p className="text-xs leading-snug text-white/60">
        {t(
          'puerta.compra',
          'Compra la casa una vez y es tuya en todos tus dispositivos: móvil, tablet y navegador. Incluye el primer mes de créditos de IA.',
        )}
      </p>

      {compraAqui && oferta && (
        <button type="button" onClick={() => void alComprar()} disabled={!!ocupado} className={botonPrincipal}>
          {ocupado === 'compra'
            ? t('puerta.comprando', 'Procesando…')
            : oferta.precio
              ? t('puerta.comprarPrecio', 'Comprar la casa — {p}', { p: oferta.precio })
              : t('puerta.comprar', 'Comprar la casa')}
        </button>
      )}

      {/* Escritorio: el pago vive en la web (directo, sin comisión de tienda).
          En las apps de tienda este enlace NO se pinta nunca. */}
      {canal === 'escritorio' && urlWeb && (
        <a href={`${urlWeb}/cuenta`} target="_blank" rel="noreferrer" className={botonPrincipal}>
          {t('puerta.comprarWeb', 'Comprar la casa en la web')}
        </a>
      )}

      {compraAqui && (
        <button type="button" onClick={() => void alRestaurar()} disabled={!!ocupado} className={botonSecundario}>
          {ocupado === 'restaura' ? t('puerta.comprando', 'Procesando…') : t('puerta.restaurar', 'Restaurar compras')}
        </button>
      )}
      {error && <p className="text-[11px] leading-snug text-red-400/90">{error}</p>}

      <button type="button" onClick={() => entrarDemo()} className={botonSecundario}>
        {t('puerta.demo', 'Probar la demo gratis')}
      </button>
      <p className="text-[11px] leading-snug text-white/40">
        {t('puerta.demoNota', 'La casa de Pep@ con un año de vida dentro: pruébalo todo, nada se guarda.')}
      </p>

      <div className="space-y-1.5 border-t border-white/10 pt-3">
        <p className="text-[11px] leading-snug text-white/45">
          {t('puerta.sinCompra', 'Esta cuenta ({correo}) aún no tiene la compra.', {
            correo: usuario?.email ?? '',
          })}
        </p>
        <button
          type="button"
          onClick={() => void refrescarPerfil()}
          className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] font-semibold text-white/60 transition hover:bg-white/10"
        >
          {t('puerta.yaCompre', 'Ya la compré: revisar de nuevo')}
        </button>
        <FilaCupon />
        <button
          type="button"
          onClick={() => void salir()}
          className="w-full px-2 py-0.5 text-[11px] text-white/40 transition hover:text-white/60"
        >
          {t('puerta.salir', 'Salir de la cuenta')}
        </button>
      </div>
    </Marco>
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
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="w-full px-2 py-0.5 text-[11px] text-white/40 transition hover:text-white/60"
      >
        {t('puerta.cupon.tengo', '¿Tienes un cupón?')}
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
    <div className="space-y-1.5">
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
