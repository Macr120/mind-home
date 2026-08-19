import { useEffect, useState } from 'react'
import { useT } from '../i18n/useT'
import { derechosAdquiridos, esDemo, posponerCuenta, pospusoCuenta, tieneUnlock } from '../edicion'
import { useSesion } from '../cuenta/sesionStore'
import { esAppNativa, nombrePlataforma } from '../plataforma'
import { hayBackend } from '../cuenta/supabase'
import { tokenTienda } from '../cuenta/reciboTienda'
import { URL_WEB as urlWeb } from '../cuenta/urlWeb'
import { entrarDemo } from '../../demo/modo'
import { FormularioAcceso } from './editor/EditorCuentaSection'

/**
 * La puerta de la casa propia, en dos pasos y en este orden: **cuenta** y
 * **compra**. Es el flujo del modelo de negocio (`edicion.ts`): se compra la
 * app en la tienda, se registra el correo y entonces empieza la bienvenida.
 *
 * 1. Sin sesión → registro/login. Obligatorio: el correo es lo que ata la
 *    compra a la persona y lo que devuelve la casa en otro dispositivo.
 * 2. Con sesión y en el NAVEGADOR → hace falta que la cuenta tenga la app
 *    (`tieneUnlock()`). Aquí no se vende nada: se compra en Google Play o el
 *    App Store y se entra con esa misma cuenta. En la app NATIVA este paso no
 *    existe — es una app de pago, instalada = pagada.
 *
 * NO pasan por aquí: la demo, los builds sin backend (100% locales) y las
 * instalaciones anteriores a la cuenta obligatoria (`derechosAdquiridos()`).
 * El espejo `mh.unlock` lo escribe sesionStore al refrescar el perfil, así que
 * suscribirse a la sesión re-evalúa la puerta cuando el alta de tienda aterriza
 * o el usuario entra con su cuenta.
 */
export function PuertaUnlock({ children }: { children: React.ReactNode }) {
  const cargando = useSesion((s) => s.cargando)
  const usuario = useSesion((s) => s.usuario)
  // Solo por reactividad: la verdad síncrona la tiene el espejo de localStorage.
  useSesion((s) => s.unlock)
  const [pospuesto, setPospuesto] = useState(pospusoCuenta())

  if (esDemo() || !hayBackend() || derechosAdquiridos()) return <>{children}</>
  // Sin destello: mientras la sesión hidrata no se sabe si hay cuenta.
  if (cargando) return null

  // El «ahora no» solo existe en la app de tienda: en el navegador la cuenta es
  // lo único que demuestra la compra, así que allí no hay nada que posponer.
  const puedePosponer = esAppNativa()
  if (!usuario && !(puedePosponer && pospuesto)) {
    return (
      <PantallaCuenta
        alPosponer={
          puedePosponer
            ? () => {
                posponerCuenta()
                setPospuesto(true)
              }
            : undefined
        }
      />
    )
  }
  if (!esAppNativa() && !tieneUnlock()) return <PantallaTienda />
  return (
    <>
      <AltaTienda />
      {children}
    </>
  )
}

/**
 * Ata la compra de la tienda a la cuenta. La app nativa es de PAGO: quien llega
 * aquí ya pagó, así que el perfil se marca `unlock` y estrena el primer mes.
 * Sirve para que la MISMA cuenta abra la casa también en el navegador, donde no
 * hay tienda que lo garantice. Sin UI y sin ruido: si falla (sin red) se
 * reintenta al volver a abrir la app, porque el espejo sigue sin unlock.
 */
function AltaTienda() {
  const usuario = useSesion((s) => s.usuario)
  const unlock = useSesion((s) => s.unlock)
  const altaTienda = useSesion((s) => s.altaTienda)

  useEffect(() => {
    if (!esAppNativa() || !usuario || tieneUnlock()) return
    void tokenTienda().then((token) => altaTienda(nombrePlataforma(), token))
  }, [usuario, unlock, altaTienda])

  return null
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
 * Paso 1: el correo. En la app nativa se llega recién comprada, así que abre en
 * «crear cuenta» y ofrece dejarlo para luego (`alPosponer`): la casa ya está
 * pagada y funciona sin conexión — lo que espera a la cuenta son los créditos
 * del primer mes y la sincronización.
 */
function PantallaCuenta({ alPosponer }: { alPosponer?: () => void }) {
  const t = useT()

  return (
    <Marco>
      <p className="text-xs leading-snug text-white/60">
        {t(
          'puerta.correo',
          'Registra tu correo para empezar: es lo que guarda tu casa, la sincroniza y te la devuelve en cualquier dispositivo.',
        )}
      </p>
      <FormularioAcceso inicial={esAppNativa() ? 'registrar' : 'entrar'} />
      {alPosponer && (
        <div className="space-y-1.5 border-t border-white/10 pt-3">
          <button type="button" onClick={alPosponer} className={botonSecundario}>
            {t('puerta.ahoraNo', 'Ahora no: entrar sin cuenta')}
          </button>
          <p className="text-[11px] leading-snug text-white/40">
            {t(
              'puerta.ahoraNoNota',
              'Tu casa funciona igual, pero los créditos de IA y la sincronización llegan cuando registres tu correo.',
            )}
          </p>
        </div>
      )}
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
 * Paso 2, solo en el navegador: la cuenta entró pero no tiene la app. Aquí no
 * se vende — la app se compra en las tiendas y esta pantalla lleva a ellas.
 */
function PantallaTienda() {
  const t = useT()
  const usuario = useSesion((s) => s.usuario)
  const salir = useSesion((s) => s.salir)
  const refrescarPerfil = useSesion((s) => s.refrescarPerfil)

  return (
    <Marco>
      <p className="text-xs leading-snug text-white/60">
        {t(
          'puerta.tienda',
          'La app se compra en Google Play o el App Store. Al comprarla, entra aquí con esta misma cuenta y tu casa te espera en el navegador.',
        )}
      </p>

      {urlWeb && (
        <a href={`${urlWeb}/#descargas`} target="_blank" rel="noreferrer" className={botonPrincipal}>
          {t('puerta.verDescargas', 'Ver dónde descargarla')}
        </a>
      )}

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
