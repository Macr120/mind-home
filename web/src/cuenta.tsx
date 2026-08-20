/**
 * Portal de cuenta de la web pública (dominio.com/cuenta): registro, login,
 * suscripción (RevenueCat Web Billing), recargas, gestión y borrado de cuenta.
 *
 * La APP no se vende aquí: se compra en Google Play o el App Store (ver
 * `src/core/edicion.ts`). En esta página solo se pagan la suscripción de IA y
 * las recargas de créditos, que valen para todos los dispositivos.
 *
 * REUTILIZA los módulos de cuenta de la app (`src/core/cuenta/*`) por import
 * relativo — misma sesión de Supabase, mismo paywall, mismo espejo del plan.
 * Ojo: NO importar nada que arrastre dexie/three (ni useT/ajustesStore): esta
 * página debe seguir pesando poco. Los textos van por su propio i18n
 * (`./i18n`: `t()` y `ruta()`), con el español inline y los otros quince en
 * `web/i18n/cuenta/`.
 */
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './cuenta.css'
import { obtenerSupabase, hayBackend } from '../../src/core/cuenta/supabase'
import { aplicarIdioma, IDIOMA, ruta, t } from './i18n'
import { iniciarSesion, useSesion } from '../../src/core/cuenta/sesionStore'
import {
  hayPagos,
  obtenerNiveles,
  obtenerCreditos,
  obtenerAnual,
  comprar,
  cambiarNivel,
  comprarCreditos,
  urlGestion,
  type OfertaPro,
} from '../../src/core/cuenta/paywall'

iniciarSesion()

const URL_APP = import.meta.env.VITE_URL_APP as string | undefined

// Congelado a la carga (regla de pureza en render): para decidir si el trial
// sigue vigente basta el instante en que se abrió la página.
const AHORA = Date.now()

// ─── Piezas de UI ────────────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85 outline-none placeholder:text-white/30 focus:border-white/25'
const botonPrincipal =
  'ui-boton ui-accent-bg w-full rounded-lg px-3 py-2 text-sm font-bold hover:brightness-110 disabled:opacity-50'
const botonSecundario =
  'ui-boton w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/60 hover:bg-white/10 disabled:opacity-50'

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">{children}</div>
  )
}

function Marco({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-3 px-4 py-8">
      <div className="barra flex items-center gap-2 !p-0">
        <a href={ruta('/')} className="flex flex-1 items-center gap-2 text-white/90">
          <img src="/favicon.svg?v=2" alt="" className="h-9 w-9 rounded-lg" />
          <span className="flex flex-col leading-tight">
            <span className="text-lg font-extrabold">{t('marca.nombre', 'Planificador Mental-Casa')}</span>
            <small className="text-[11px] font-semibold text-white/55">{t('marca.sub', 'Mind Planner Home')}</small>
          </span>
        </a>
      </div>
      {children}
      <p className="text-center text-[11px] text-white/55">
        <a href={ruta('/privacidad')} className="hover:text-white/85">{t('marco.privacidad', 'Privacidad')}</a>
        {' · '}
        <a href={ruta('/terminos')} className="hover:text-white/85">{t('marco.terminos', 'Términos')}</a>
      </p>
    </div>
  )
}

// ─── Acceso (login / registro / olvidé) ──────────────────────────────────────

/** Login con Google/Apple. Logos en SVG en línea (marcas, no iconos de la UI). */
function BotonesOAuth() {
  const entrarConProveedor = useSesion((s) => s.entrarConProveedor)
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const con = async (proveedor: 'google' | 'apple') => {
    if (ocupado) return
    setOcupado(true)
    setError(null)
    const err = await entrarConProveedor(proveedor)
    // Sin error, el navegador está saliendo hacia el proveedor.
    if (err) {
      setError(err)
      setOcupado(false)
    }
  }

  const botonCls =
    'ui-boton flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/80 hover:bg-white/10 disabled:opacity-50'

  return (
    <>
      <button type="button" onClick={() => void con('google')} disabled={ocupado} className={botonCls}>
        <svg viewBox="0 0 48 48" className="h-4 w-4 shrink-0" aria-hidden>
          <path
            fill="#EA4335"
            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
          />
          <path
            fill="#4285F4"
            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
          />
          <path
            fill="#FBBC05"
            d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
          />
          <path
            fill="#34A853"
            d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
          />
        </svg>
        {t('oauth.google', 'Continuar con Google')}
      </button>
      <button type="button" onClick={() => void con('apple')} disabled={ocupado} className={botonCls}>
        <svg viewBox="0 0 384 512" className="h-4 w-4 shrink-0 fill-current" aria-hidden>
          <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
        </svg>
        {t('oauth.apple', 'Continuar con Apple')}
      </button>
      {error && <p className="text-xs leading-snug text-red-400/90">{error}</p>}
      <div className="flex items-center gap-2 text-[11px] text-white/45">
        <span className="h-px flex-1 bg-white/10" />
        {t('oauth.oCorreo', 'o con tu correo')}
        <span className="h-px flex-1 bg-white/10" />
      </div>
    </>
  )
}

function Acceso() {
  const entrar = useSesion((s) => s.entrar)
  const registrar = useSesion((s) => s.registrar)
  const restablecer = useSesion((s) => s.restablecer)
  // Quien llega aquí ya suele tener cuenta: la creó en la app al comprarla, y
  // viene a suscribirse o a gestionar lo suyo.
  const [modo, setModo] = useState<'entrar' | 'registrar'>('entrar')
  const [email, setEmail] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const enviar = async () => {
    if (!email.trim() || !contrasena || ocupado) return
    setOcupado(true)
    setError(null)
    setAviso(null)
    try {
      if (modo === 'entrar') {
        const err = await entrar(email.trim(), contrasena)
        if (err) setError(err)
      } else {
        const err = await registrar(email.trim(), contrasena)
        if (err) setError(err)
        else setAviso(t('acc.creada', 'Cuenta creada: revisa tu correo y confírmalo para poder entrar.'))
      }
    } finally {
      setOcupado(false)
    }
  }

  const olvide = async () => {
    if (ocupado) return
    if (!email.trim()) {
      setError(t('acc.faltaCorreo', 'Escribe tu correo arriba primero.'))
      return
    }
    setOcupado(true)
    setError(null)
    try {
      const err = await restablecer(email.trim())
      if (err) setError(err)
      else setAviso(t('acc.enviado', 'Te enviamos un correo para restablecer tu contraseña.'))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Panel>
      <h1 className="text-base font-bold text-white/90">
        {modo === 'registrar' ? t('acc.crear', 'Crea tu cuenta') : t('acc.entrar', 'Entra a tu cuenta')}
      </h1>
      <p className="text-xs text-white/45">
        {modo === 'registrar'
          ? t('acc.crear.sub', 'Primero tu cuenta; después eliges tu suscripción.')
          : t('acc.entrar.sub', 'Tu suscripción y tu casa te esperan.')}
      </p>
      <BotonesOAuth />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t('acc.correo', 'Correo')}
        autoComplete="email"
        className={inputCls}
      />
      <input
        type="password"
        value={contrasena}
        onChange={(e) => setContrasena(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void enviar()
        }}
        placeholder={t('acc.contrasena', 'Contraseña')}
        autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
        className={inputCls}
      />
      {error && <p className="text-xs leading-snug text-red-400/90">{error}</p>}
      {aviso && <p className="text-xs leading-snug text-emerald-300/90">{aviso}</p>}
      <button type="button" onClick={() => void enviar()} disabled={ocupado} className={botonPrincipal}>
        {modo === 'entrar' ? t('acc.btEntrar', 'Entrar') : t('acc.btCrear', 'Crear cuenta')}
      </button>
      <button
        type="button"
        onClick={() => {
          setModo(modo === 'entrar' ? 'registrar' : 'entrar')
          setError(null)
          setAviso(null)
        }}
        className={botonSecundario}
      >
        {modo === 'entrar'
          ? t('acc.sinCuenta', 'No tengo cuenta: crear una')
          : t('acc.conCuenta', 'Ya tengo cuenta: entrar')}
      </button>
      {modo === 'entrar' && (
        <button
          type="button"
          onClick={() => void olvide()}
          disabled={ocupado}
          className="w-full py-0.5 text-[11px] text-white/40 transition hover:text-white/60"
        >
          {t('acc.olvide', '¿Olvidaste tu contraseña?')}
        </button>
      )}
    </Panel>
  )
}

// ─── Recuperación de contraseña ──────────────────────────────────────────────

function NuevaContrasena({ alTerminar }: { alTerminar: () => void }) {
  const cambiarContrasena = useSesion((s) => s.cambiarContrasena)
  const [nueva, setNueva] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const guardar = async () => {
    if (nueva.length < 8 || ocupado) {
      if (nueva.length < 8) setError(t('pass.minimo', 'Mínimo 8 caracteres.'))
      return
    }
    setOcupado(true)
    setError(null)
    const err = await cambiarContrasena(nueva)
    setOcupado(false)
    if (err) setError(err)
    else alTerminar()
  }

  return (
    <Panel>
      <h1 className="text-base font-bold text-white/90">{t('pass.titulo', 'Elige tu nueva contraseña')}</h1>
      <input
        type="password"
        value={nueva}
        onChange={(e) => setNueva(e.target.value)}
        placeholder={t('pass.nueva', 'Nueva contraseña')}
        autoComplete="new-password"
        className={inputCls}
      />
      {error && <p className="text-xs leading-snug text-red-400/90">{error}</p>}
      <button type="button" onClick={() => void guardar()} disabled={ocupado} className={botonPrincipal}>
        {t('pass.guardar', 'Guardar contraseña')}
      </button>
    </Panel>
  )
}

// ─── Conseguir la app (se compra en las tiendas, no aquí) ────────────────────

/**
 * La cuenta todavía no tiene la app. Aquí no se vende: se compra en Google Play
 * o el App Store y, al registrar el correo desde la app, esta misma cuenta abre
 * la casa en cualquier dispositivo (`alta-tienda`).
 */
function ConseguirApp() {
  return (
    <Panel>
      <h2 className="text-sm font-bold text-white/90">{t('app.titulo', 'Consigue la app')}</h2>
      <div className="space-y-2 rounded-xl border border-accent/50 bg-white/5 p-3">
        <p className="text-2xl font-extrabold text-white/95">
          6.99 USD<span className="text-sm font-semibold text-white/50">{' '}
            {t('app.pagoUnico', 'pago único')}
          </span>
        </p>
        <ul className="list-none space-y-1 text-xs text-white/60">
          <li>✓ {t('app.b1', 'Tu casa para siempre, con todas las apps')}</li>
          <li>✓ {t('app.b2', 'Primer mes incluido: 700 créditos de IA + sincronización')}</li>
          <li>✓ {t('app.b3', 'Se compra en Google Play o el App Store')}</li>
        </ul>
        <a href="/#descargas" className={botonPrincipal + ' block text-center'}>
          {t('app.cta', 'Ver dónde descargarla')}
        </a>
      </div>
      <p className="text-[11px] leading-snug text-white/45">
        {t('app.pie', 'Al abrirla, entra con este mismo correo y tu casa te sigue a todos tus dispositivos.')}
      </p>
    </Panel>
  )
}

// ─── Créditos sueltos (recarga consumible) ───────────────────────────────────

/**
 * Recarga de créditos: mismo precio por crédito que la suscripción ($6 = 700),
 * pero sin renovación. No caducan y se gastan cuando el pool mensual ya no
 * alcanza, así que sirve tanto al suscriptor que se quedó corto como a quien
 * no quiere suscribirse.
 */
function Creditos() {
  const [oferta, setOferta] = useState<OfertaPro | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    let vivo = true
    obtenerCreditos()
      .then((o) => {
        if (vivo) setOferta(o)
      })
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [])

  if (!hayPagos() || !oferta) return null

  const alComprar = async () => {
    if (ocupado) return
    setOcupado(true)
    setError(null)
    try {
      const ok = await comprarCreditos(oferta.paquete)
      if (!ok) setError(t('cred.enCamino', 'El pago está en camino: recarga la página en unos segundos.'))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Panel>
      <h2 className="text-sm font-bold text-white/90">{t('cred.titulo', 'Créditos sueltos')}</h2>
      <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
        <p className="text-2xl font-extrabold text-white/95">
          {oferta.precio}
          <span className="text-sm font-semibold text-white/50">{' '}
            {t('app.pagoUnico', 'pago único')}
          </span>
        </p>
        <ul className="list-none space-y-1 text-xs text-white/60">
          <li>✓ {t('cred.b1', '{n} créditos de IA, sin suscripción', { n: oferta.creditos })}</li>
          <li>✓ {t('cred.b2', 'No caducan: se quedan en tu cuenta hasta que los gastes')}</li>
          <li>✓ {t('cred.b3', 'Se usan cuando tus créditos del mes se acaban')}</li>
        </ul>
        <button type="button" onClick={() => void alComprar()} disabled={ocupado} className={botonSecundario}>
          {ocupado
            ? t('comun.procesando', 'Procesando…')
            : t('cred.cta', 'Recargar {n} créditos', { n: oferta.creditos })}
        </button>
      </div>
      {error && <p className="text-xs leading-snug text-red-400/90">{error}</p>}
    </Panel>
  )
}

// ─── Tarifas (suscribirse / renovar) ─────────────────────────────────────────

function Tarifas({ titulo }: { titulo: string }) {
  const nivelActual = useSesion((s) => s.nivel)
  const plan = useSesion((s) => s.plan)
  const [ofertas, setOfertas] = useState<OfertaPro[]>([])
  const [anual, setAnual] = useState<OfertaPro | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    let vivo = true
    obtenerNiveles()
      .then((o) => {
        if (vivo) setOfertas(o)
      })
      .catch(() => {
        if (vivo) setError(t('tar.errorPrecios', 'No se pudieron cargar los precios. Recarga la página.'))
      })
    obtenerAnual()
      .then((o) => {
        if (vivo) setAnual(o)
      })
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [])

  // Con la suscripción activa, tocar otra tarjeta cambia de nivel; sin ella, es
  // el alta. RevenueCat resuelve el cambio a prorrata en ambos sentidos.
  const suscrito = plan === 'pro'

  const alComprar = async (o: OfertaPro) => {
    if (ocupado) return
    setOcupado(true)
    setError(null)
    try {
      const ok = suscrito ? await cambiarNivel(o.paquete, o.nivel) : await comprar(o.paquete)
      if (!ok) setError(t('tar.errorCambio', 'El cambio no se completó. Recarga la página en unos segundos.'))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setOcupado(false)
    }
  }

  if (!hayPagos()) {
    return (
      <p className="text-xs text-white/45">
        {t('tar.sinPagos', 'Los pagos no están configurados en este entorno.')}
      </p>
    )
  }

  return (
    <Panel>
      <h2 className="text-sm font-bold text-white/90">{titulo}</h2>
      {ofertas.length === 0 && !error && (
        <p className="text-xs text-white/45">{t('tar.cargando', 'Cargando precios…')}</p>
      )}
      {ofertas.map((o) => {
        const actual = suscrito && o.nivel === nivelActual
        return (
          <div
            key={o.paquete.identifier}
            className={`space-y-2 rounded-xl border bg-white/5 p-3 ${
              actual ? 'border-accent' : 'border-white/10'
            }`}
          >
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-extrabold text-white/95">
                {o.precio}
                <span className="text-sm font-semibold text-white/50">
                  {o.periodo === 'anio'
                    ? ` ${t('tar.porAnio', '/año')}`
                    : o.periodo === 'mes'
                      ? ` ${t('tar.porMes', '/mes')}`
                      : ''}
                </span>
              </p>
              {actual && (
                <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-ink">
                  {t('tar.tuNivel', 'Tu nivel')}
                </span>
              )}
            </div>
            <ul className="list-none space-y-1 text-xs text-white/60">
              <li>✓ {t('tar.b1', 'Nivel ×{n}: {c} créditos de IA al mes', { n: o.nivel, c: o.creditos })}</li>
              <li>✓ {t('tar.b2', 'Todas las apps de la casa, en todos tus dispositivos')}</li>
              <li>✓ {t('tar.b3', 'Sincronización y respaldo en la nube')}</li>
            </ul>
            <button
              type="button"
              onClick={() => void alComprar(o)}
              disabled={ocupado || actual}
              className={botonPrincipal}
            >
              {actual
                ? t('tar.actual', 'Es tu nivel actual')
                : ocupado
                  ? t('comun.procesando', 'Procesando…')
                  : suscrito
                    ? o.nivel > nivelActual
                      ? t('tar.subir', 'Subir a ×{n}', { n: o.nivel })
                      : t('tar.bajar', 'Bajar a ×{n}', { n: o.nivel })
                    : titulo}
            </button>
          </div>
        )
      })}
      {/* La anualidad no es otro nivel: es el ×1 pagado de una vez, con dos
          meses de regalo. Por eso va aparte y nunca se marca como «tu nivel». */}
      {anual && (
        <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-extrabold text-white/95">
              {anual.precio}
              <span className="text-sm font-semibold text-white/50">{` ${t('tar.porAnio', '/año')}`}</span>
            </p>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold text-white/70">
              {t('tar.regalo', '2 meses de regalo')}
            </span>
          </div>
          <ul className="list-none space-y-1 text-xs text-white/60">
            <li>✓ {t('tar.a1', 'El nivel ×1 pagado de una vez: {n} créditos de IA cada mes', { n: anual.creditos })}</li>
            <li>✓ {t('tar.a2', 'Un solo cobro al año en lugar de doce')}</li>
            <li>✓ {t('tar.b3', 'Sincronización y respaldo en la nube')}</li>
          </ul>
          <button
            type="button"
            onClick={() => void alComprar(anual)}
            disabled={ocupado}
            className={botonSecundario}
          >
            {ocupado ? t('comun.procesando', 'Procesando…') : t('tar.anual', 'Pagar un año')}
          </button>
        </div>
      )}
      {error && <p className="text-xs leading-snug text-red-400/90">{error}</p>}
      <p className="text-[11px] leading-snug text-white/35">
        {t(
          'tar.pie',
          'Sin permanencia: subes, bajas o cancelas cuando quieras y solo pagas la diferencia. Si cancelas, la app sigue en tus dispositivos en modo local, sin IA ni sincronización.',
        )}
      </p>
    </Panel>
  )
}

// ─── Cuenta con sesión ───────────────────────────────────────────────────────

function MiCuenta() {
  const usuario = useSesion((s) => s.usuario)
  const plan = useSesion((s) => s.plan)
  const planExpira = useSesion((s) => s.planExpira)
  const fuePro = useSesion((s) => s.fuePro)
  const unlock = useSesion((s) => s.unlock)
  const usoIA = useSesion((s) => s.usoIA)
  const creditosExtra = useSesion((s) => s.creditosExtra)
  const salir = useSesion((s) => s.salir)

  // El mes incluido del unlock: vigente se comporta como Pro (pool + sync).
  const trialVigente = plan === 'trial' && !!planExpira && Date.parse(planExpira) > AHORA
  const trialVencido = plan === 'trial' && !trialVigente

  // Entrar es «mi cuenta», no una tienda: aquí NO se ofrecen las tarifas. Solo
  // se pintan si el usuario vino a eso, que es lo que dice `/cuenta#planes` — el
  // enlace «Ver los planes» de la landing. Sin el hash, esta pantalla es la
  // cuenta y nada más.
  const verPlanes = location.hash === '#planes'

  // La compra pudo aterrizar hace segundos (webhook): refrescar al montar.
  useEffect(() => {
    const s = useSesion.getState()
    void s.refrescarPerfil()
    void s.refrescarUso()
  }, [])

  return (
    <>
      <Panel>
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm text-white/80">{usuario?.email}</span>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
              plan === 'pro' || trialVigente ? 'bg-accent text-accent-ink' : 'bg-white/10 text-white/60'
            }`}
          >
            {plan === 'pro'
              ? t('mi.pro', 'Pro')
              : trialVigente
                ? t('mi.trial', 'Primer mes')
                : t('mi.local', 'Local')}
          </span>
        </div>
        {plan === 'pro' && planExpira && (
          <p className="text-xs text-white/45">
            {t('mi.vence', 'Renueva o vence: {f}', {
              f: new Date(planExpira).toLocaleDateString(IDIOMA),
            })}
          </p>
        )}
        {trialVigente && planExpira && (
          <p className="text-xs text-white/45">
            {t('mi.trialHasta', 'Tu mes incluido termina el {f}.', {
              f: new Date(planExpira).toLocaleDateString(IDIOMA),
            })}
          </p>
        )}
      </Panel>

      {plan === 'pro' || trialVigente ? (
        <>
          <ProActivo usoIA={usoIA} creditosExtra={creditosExtra} />
          {/* Con Pro, las tarjetas sirven para subir o bajar de nivel; con el
              trial, para convertir. En ninguno de los dos casos es lo que quiere
              ver quien solo entró a su cuenta, así que solo salen con `#planes`. */}
          {verPlanes && (
            <>
              <Tarifas
                titulo={trialVigente ? t('tar.hazte', 'Hazte Pro') : t('tar.cambiar', 'Cambiar de nivel')}
              />
              <Creditos />
            </>
          )}
        </>
      ) : (
        <>
          <Panel>
            <p className="text-xs leading-snug text-white/60">
              {fuePro
                ? t(
                    'mi.estado.fuePro',
                    'Tu suscripción terminó: la app sigue en tus dispositivos en modo local. Renueva y los créditos mensuales y la sincronización vuelven tal como los dejaste.',
                  )
                : trialVencido
                  ? t(
                      'mi.estado.trialVencido',
                      'Tu mes incluido terminó: la app y tus datos son tuyos para siempre. Suscríbete para seguir con los créditos mensuales y la sincronización, o recarga créditos sueltos.',
                    )
                  : t(
                      'mi.estado.local',
                      'Estás en modo local: la app y tus datos son tuyos sin pagar nada. La IA se paga por uso — compra los créditos que necesites, o suscríbete y recíbelos cada mes.',
                    )}
            </p>
            {creditosExtra > 0 && (
              <p className="text-[11px] text-white/45">
                {t('mi.disponibles', 'Créditos disponibles: {n}', { n: creditosExtra })}
              </p>
            )}
          </Panel>
          {/* Sin la compra, lo primero es conseguir la app en la tienda. */}
          {!unlock && <ConseguirApp />}
          {verPlanes && (
            <>
              <Tarifas
                titulo={fuePro ? t('tar.renovar', 'Renovar suscripción') : t('tar.suscribir', 'Suscribirme')}
              />
              {/* Solo con la app desbloqueada: sin unlock, la IA todavía no
                  tiene dónde usarse. */}
              {unlock && <Creditos />}
            </>
          )}
        </>
      )}

      {/* Dos acciones y nada más: abrir la app y salir. Las descargas viven en
          la landing (`/#descargas`), a la que ya lleva «Consigue la app». */}
      <Panel>
        {URL_APP && (
          <a href={URL_APP} className={botonSecundario + ' block text-center'}>
            {t('mi.abrirApp', 'Abrir la app en el navegador')}
          </a>
        )}
        <button type="button" onClick={() => void salir()} className={botonSecundario}>
          {t('mi.salir', 'Cerrar sesión')}
        </button>
      </Panel>
    </>
  )
}

function ProActivo({
  usoIA,
  creditosExtra,
}: {
  usoIA: { creditos: number; limiteCreditos: number } | null
  creditosExtra: number
}) {
  const [urlG, setUrlG] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    void urlGestion().then((u) => {
      if (vivo) setUrlG(u)
    })
    return () => {
      vivo = false
    }
  }, [])

  const pct =
    usoIA && usoIA.limiteCreditos > 0
      ? Math.min(100, Math.round((usoIA.creditos / usoIA.limiteCreditos) * 100))
      : 0

  return (
    <>
      <Panel>
        {usoIA && (
          <div>
            <div className="flex items-center gap-2 text-xs text-white/60">
              <span className="flex-1">{t('pro.creditosMes', 'Créditos de IA este mes')}</span>
              <span className="tabular-nums text-white/40">
                {usoIA.creditos}/{usoIA.limiteCreditos}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
            </div>
            {creditosExtra > 0 && (
              <p className="mt-1 text-[11px] text-white/45">
                {t('pro.extra', 'Créditos extra (recargas, no caducan): {n}', { n: creditosExtra })}
              </p>
            )}
          </div>
        )}
        {urlG && (
          <a href={urlG} target="_blank" rel="noreferrer" className={botonSecundario + ' block text-center'}>
            {t('pro.gestionar', 'Gestionar suscripción (cancelar, cambiar pago)')}
          </a>
        )}
      </Panel>
    </>
  )
}

// ─── Raíz ────────────────────────────────────────────────────────────────────

function Pagina() {
  const cargando = useSesion((s) => s.cargando)
  const usuario = useSesion((s) => s.usuario)
  const [recovery, setRecovery] = useState(false)

  // El enlace de «olvidé mi contraseña» aterriza aquí con una sesión de
  // recuperación; Supabase lo anuncia con el evento PASSWORD_RECOVERY.
  useEffect(() => {
    let sub: { unsubscribe: () => void } | null = null
    let vivo = true
    void obtenerSupabase().then((sb) => {
      if (!sb || !vivo) return
      const { data } = sb.auth.onAuthStateChange((evento: string) => {
        if (evento === 'PASSWORD_RECOVERY') setRecovery(true)
      })
      sub = data.subscription
    })
    return () => {
      vivo = false
      sub?.unsubscribe()
    }
  }, [])

  if (!hayBackend()) {
    return (
      <Marco>
        <Panel>
          <p className="text-xs text-white/60">
            {t(
              'pag.sinBackend',
              'Este entorno no tiene backend configurado (faltan las variables VITE_SUPABASE_*).',
            )}
          </p>
        </Panel>
      </Marco>
    )
  }
  if (cargando) {
    return (
      <Marco>
        <p className="text-center text-sm text-white/45">{t('pag.cargando', 'Cargando…')}</p>
      </Marco>
    )
  }
  if (recovery) {
    return (
      <Marco>
        <NuevaContrasena alTerminar={() => setRecovery(false)} />
      </Marco>
    )
  }
  return <Marco>{usuario ? <MiCuenta /> : <Acceso />}</Marco>
}

aplicarIdioma()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Pagina />
  </StrictMode>,
)
