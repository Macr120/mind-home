import { useEffect, useState } from 'react'
import { useT } from '../i18n/useT'
import { esDemo, tieneUnlock } from '../edicion'
import { useSesion } from '../cuenta/sesionStore'
import { esEscritorio, puedeMostrarPagos } from '../plataforma'
import { hayPagos, obtenerUnlock, comprarUnlock, type OfertaPro } from '../cuenta/paywall'
import { URL_WEB as urlWeb } from '../cuenta/urlWeb'
import { entrarDemo } from '../../demo/modo'
import { FormularioAcceso } from './editor/EditorCuentaSection'

/**
 * La puerta del pago único: sin unlock, la casa propia no se abre — se ofrece
 * la demo (gratis, no persistente) o comprar la app ($6.99, incluye el primer
 * mes de IA y sync como plan `trial`).
 *
 * NO pasan por aquí: la demo, los builds sin backend (100% locales) y las
 * instalaciones con derechos adquiridos (`mh.unlockLocal`, ver
 * `edicion.ts::tieneUnlock`). El espejo `mh.unlock` lo escribe sesionStore al
 * refrescar el perfil, así que suscribirse a la sesión re-evalúa la puerta
 * cuando el webhook de la compra aterriza o el usuario entra con su cuenta.
 */
export function PuertaUnlock({ children }: { children: React.ReactNode }) {
  const cargando = useSesion((s) => s.cargando)
  // Solo por reactividad: la verdad síncrona la tiene el espejo de localStorage.
  useSesion((s) => s.usuario)
  useSesion((s) => s.unlock)

  if (esDemo() || tieneUnlock()) return <>{children}</>
  // Sin destello: mientras la sesión hidrata no se sabe si hay compra.
  if (cargando) return null
  return <Pantalla />
}

function Pantalla() {
  const t = useT()
  const usuario = useSesion((s) => s.usuario)
  const salir = useSesion((s) => s.salir)
  const refrescarPerfil = useSesion((s) => s.refrescarPerfil)
  const [oferta, setOferta] = useState<OfertaPro | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Compra embebida solo en web con sesión; en Electron el checkout va al
  // navegador y en tiendas no se menciona (misma regla que el resto de pagos).
  const compraEmbebida = !!usuario && puedeMostrarPagos() && !esEscritorio() && hayPagos()

  useEffect(() => {
    if (!compraEmbebida) return
    let vivo = true
    obtenerUnlock()
      .then((o) => {
        if (vivo) setOferta(o)
      })
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [compraEmbebida])

  const alComprar = async () => {
    if (!oferta || ocupado) return
    setOcupado(true)
    setError(null)
    try {
      const ok = await comprarUnlock(oferta.paquete)
      if (!ok) {
        setError(
          t('puerta.tarda', 'El pago está en camino: espera unos segundos y pulsa «Ya pagué».'),
        )
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setOcupado(false)
    }
  }

  const botonPrincipal =
    'ui-accent-bg block w-full rounded-md px-3 py-2 text-center text-sm font-bold transition disabled:opacity-50'
  const botonSecundario =
    'block w-full rounded-md border border-white/15 bg-white/10 px-3 py-2 text-center text-xs font-bold text-white/85 transition hover:bg-white/15'

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-[#0f1115] p-4">
      <div className="w-full max-w-sm space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5">
        <h1 className="text-lg font-extrabold text-white/95">Mind Planner Home</h1>
        <p className="text-xs leading-snug text-white/60">
          {t(
            'puerta.trato',
            'Un solo pago desbloquea tu casa para siempre e incluye el primer mes de IA y sincronización — sin tarjeta y sin suscripción.',
          )}
        </p>

        {compraEmbebida && oferta && (
          <button type="button" onClick={() => void alComprar()} disabled={ocupado} className={botonPrincipal}>
            {ocupado
              ? t('puerta.procesando', 'Procesando…')
              : t('puerta.comprar', 'Desbloquear mi casa — {p}', { p: oferta.precio })}
          </button>
        )}
        {!compraEmbebida && puedeMostrarPagos() && urlWeb && (
          <a href={urlWeb} target="_blank" rel="noreferrer" className={botonPrincipal}>
            {t('puerta.comprarWeb', 'Comprar en la web')}
          </a>
        )}

        <button type="button" onClick={() => entrarDemo()} className={botonSecundario}>
          {t('puerta.demo', 'Probar la demo gratis')}
        </button>
        <p className="text-[11px] leading-snug text-white/40">
          {t('puerta.demoNota', 'La casa de Pep@ con un año de vida dentro: pruébalo todo, nada se guarda.')}
        </p>

        {error && <p className="text-[11px] leading-snug text-red-400/90">{error}</p>}

        {usuario ? (
          <div className="space-y-1.5 border-t border-white/10 pt-3">
            <p className="text-[11px] leading-snug text-white/45">
              {t('puerta.sinCompra', 'Esta cuenta ({correo}) aún no tiene la compra.', {
                correo: usuario.email ?? '',
              })}
            </p>
            <button
              type="button"
              onClick={() => void refrescarPerfil()}
              className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] font-semibold text-white/60 transition hover:bg-white/10"
            >
              {t('puerta.yaPague', 'Ya pagué: revisar de nuevo')}
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
        ) : (
          <div className="space-y-1.5 border-t border-white/10 pt-3">
            <p className="text-[11px] font-semibold text-white/55">
              {t('puerta.cuenta', '¿Ya la compraste o tienes un cupón? Entra con tu cuenta y lo canjeas dentro.')}
            </p>
            <FormularioAcceso />
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Canje discreto de cupones (testers y accesos regalados). Exige sesión: la
 * Edge Function `canjear-cupon` valida el JWT y aplica la misma alta que la
 * compra del unlock. Al canjear, `refrescarPerfil` trae el unlock y la puerta
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
