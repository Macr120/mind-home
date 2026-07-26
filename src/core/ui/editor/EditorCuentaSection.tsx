import { useEffect, useState } from 'react'
import { useT } from '../../i18n/useT'
import { hayBackend } from '../../cuenta/supabase'
import { useSesion } from '../../cuenta/sesionStore'
import { hayPagos, obtenerOferta, comprar, urlGestion, type OfertaPro } from '../../cuenta/paywall'
import { sincronizar } from '../../data/sync/motor'

/**
 * Sección del editor (pestaña Configuraciones): cuenta de MPH.
 * Login/registro, plan actual y uso de IA del mes. Con el backend sin
 * configurar solo informa: la app sigue 100% local.
 */
export function EditorCuentaSection({
  embed,
  sinTitulo,
}: { embed?: boolean; sinTitulo?: boolean } = {}) {
  const t = useT()
  const usuario = useSesion((s) => s.usuario)
  const cargando = useSesion((s) => s.cargando)

  return (
    <div className={embed ? 'space-y-1.5' : 'rounded-xl border border-white/10 bg-white/5 p-3 space-y-1.5'}>
      {!sinTitulo && (
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
          {t('cuenta.titulo', 'Cuenta')}
        </p>
      )}
      {!hayBackend() ? (
        <p className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] leading-snug text-white/45">
          {t(
            'cuenta.sinBackend',
            'Esta instalación no tiene backend configurado: todo se guarda solo en este dispositivo.',
          )}
        </p>
      ) : cargando ? (
        <p className="text-[11px] text-white/45">{t('cuenta.cargando', 'Cargando…')}</p>
      ) : usuario ? (
        <CuentaConSesion />
      ) : (
        <FormularioAcceso />
      )}
    </div>
  )
}

function FormularioAcceso() {
  const t = useT()
  const entrar = useSesion((s) => s.entrar)
  const registrar = useSesion((s) => s.registrar)
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
        else
          setAviso(
            t('cuenta.confirmaCorreo', 'Cuenta creada: revisa tu correo y confírmalo para poder entrar.'),
          )
      }
    } finally {
      setOcupado(false)
    }
  }

  const inputCls =
    'w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white/85 outline-none placeholder:text-white/30 focus:border-white/25'

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] leading-snug text-white/45">
        {t('cuenta.intro', 'Con una cuenta, tu plan y tu casa te siguen a cualquier dispositivo.')}
      </p>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t('cuenta.email', 'Correo')}
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
        placeholder={t('cuenta.contrasena', 'Contraseña')}
        autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
        className={inputCls}
      />
      {error && <p className="text-[11px] leading-snug text-red-400/90">{error}</p>}
      {aviso && <p className="text-[11px] leading-snug text-accent/90">{aviso}</p>}
      <button
        type="button"
        onClick={() => void enviar()}
        disabled={ocupado}
        className="ui-accent-bg w-full rounded-md px-2 py-1.5 text-xs font-bold transition disabled:opacity-50"
      >
        {modo === 'entrar' ? t('cuenta.entrar', 'Entrar') : t('cuenta.registrar', 'Crear cuenta')}
      </button>
      <button
        type="button"
        onClick={() => {
          setModo(modo === 'entrar' ? 'registrar' : 'entrar')
          setError(null)
          setAviso(null)
        }}
        className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] font-semibold text-white/60 transition hover:bg-white/10"
      >
        {modo === 'entrar'
          ? t('cuenta.cambioRegistrar', 'No tengo cuenta: crear una')
          : t('cuenta.cambioEntrar', 'Ya tengo cuenta: entrar')}
      </button>
    </div>
  )
}

function CuentaConSesion() {
  const t = useT()
  const usuario = useSesion((s) => s.usuario)
  const plan = useSesion((s) => s.plan)
  const planExpira = useSesion((s) => s.planExpira)
  const usoIA = useSesion((s) => s.usoIA)
  const salir = useSesion((s) => s.salir)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2 py-1.5">
        <span className="min-w-0 flex-1 truncate text-xs text-white/75">{usuario?.email}</span>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
            plan === 'pro' ? 'ui-accent-bg' : 'bg-white/10 text-white/60'
          }`}
        >
          {plan === 'pro' ? t('cuenta.plan.pro', 'Pro') : t('cuenta.plan.local', 'Gratis')}
        </span>
      </div>
      {plan === 'pro' && planExpira && (
        <p className="text-[11px] text-white/45">
          {t('cuenta.plan.expira', 'Renueva o vence: {f}', {
            f: new Date(planExpira).toLocaleDateString(),
          })}
        </p>
      )}
      {plan === 'pro' && usoIA && (
        <div className="space-y-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
            {t('cuenta.uso.titulo', 'Uso de IA este mes')}
          </p>
          <BarraUso
            label={t('cuenta.uso.chat', 'Mensajes')}
            usadas={usoIA.solicitudes}
            limite={usoIA.limiteSolicitudes}
          />
          <BarraUso
            label={t('cuenta.uso.imagenes', 'Imágenes')}
            usadas={usoIA.imagenes}
            limite={usoIA.limiteImagenes}
          />
        </div>
      )}
      <FilaSync />
      <BloquePaywall />
      <button
        type="button"
        onClick={() => void salir()}
        className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] font-semibold text-white/60 transition hover:bg-white/10"
      >
        {t('cuenta.salir', 'Cerrar sesión')}
      </button>
    </div>
  )
}

/** Estado de la sincronización multi-dispositivo + botón manual. */
function FilaSync() {
  const t = useT()
  const estado = useSesion((s) => s.estadoSync)
  const ultima = useSesion((s) => s.ultimaSync)
  const error = useSesion((s) => s.errorSync)

  return (
    <div className="space-y-1 rounded-md border border-white/10 bg-white/5 px-2 py-1.5">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-[11px] text-white/60">
          {estado === 'sincronizando'
            ? t('cuenta.sync.activo', 'Sincronizando…')
            : ultima
              ? t('cuenta.sync.ultima', 'Sincronizado: {f}', {
                  f: new Date(ultima).toLocaleTimeString(),
                })
              : t('cuenta.sync.nunca', 'Sin sincronizar todavía')}
        </span>
        <button
          type="button"
          onClick={() => void sincronizar(true)}
          disabled={estado === 'sincronizando'}
          className="shrink-0 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-white/60 transition hover:bg-white/10 disabled:opacity-50"
        >
          {t('cuenta.sync.ahora', 'Sincronizar')}
        </button>
      </div>
      {estado === 'error' && error && (
        <p className="text-[11px] leading-snug text-red-400/90">{error}</p>
      )}
    </div>
  )
}

/** Compra (sin Pro) o gestión de la suscripción (con Pro), vía RevenueCat. */
function BloquePaywall() {
  const t = useT()
  const plan = useSesion((s) => s.plan)
  const [oferta, setOferta] = useState<OfertaPro | null>(null)
  const [urlG, setUrlG] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    if (!hayPagos()) return
    let vivo = true
    if (plan === 'pro') {
      void urlGestion().then((u) => {
        if (vivo) setUrlG(u)
      })
    } else {
      obtenerOferta()
        .then((o) => {
          if (vivo) setOferta(o)
        })
        .catch(() => {})
    }
    return () => {
      vivo = false
    }
  }, [plan])

  if (!hayPagos()) return null

  if (plan === 'pro') {
    if (!urlG) return null
    return (
      <a
        href={urlG}
        target="_blank"
        rel="noreferrer"
        className="block w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-center text-[11px] font-semibold text-white/60 transition hover:bg-white/10"
      >
        {t('cuenta.pago.gestionar', 'Gestionar mi suscripción')}
      </a>
    )
  }

  const alComprar = async () => {
    if (!oferta || ocupado) return
    setOcupado(true)
    setError(null)
    try {
      const ok = await comprar(oferta.paquete)
      if (!ok) setError(t('cuenta.pago.cancelado', 'La compra no se completó.'))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() => void alComprar()}
        disabled={!oferta || ocupado}
        className="ui-accent-bg w-full rounded-md px-2 py-1.5 text-xs font-bold transition disabled:opacity-50"
      >
        {oferta?.precio
          ? t('cuenta.pago.comprarPrecio', 'Hazte Pro — {p}/mes', { p: oferta.precio })
          : t('cuenta.pago.comprar', 'Hazte Pro')}
      </button>
      {error && <p className="text-[11px] leading-snug text-red-400/90">{error}</p>}
    </div>
  )
}

function BarraUso({ label, usadas, limite }: { label: string; usadas: number; limite: number }) {
  const pct = limite > 0 ? Math.min(100, Math.round((usadas / limite) * 100)) : 0
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="flex-1 truncate text-[11px] text-white/60">{label}</span>
        <span className="text-[10px] tabular-nums text-white/40">
          {usadas}/{limite}
        </span>
      </div>
      <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="ui-accent-bg h-full rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
