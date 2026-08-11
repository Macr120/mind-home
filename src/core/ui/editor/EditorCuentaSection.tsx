import { useEffect, useState } from 'react'
import { useT } from '../../i18n/useT'
import { hayBackend } from '../../cuenta/supabase'
import { useSesion } from '../../cuenta/sesionStore'
import {
  hayPagos,
  obtenerOferta,
  obtenerRecargas,
  comprar,
  comprarRecarga,
  urlGestion,
  type OfertaPro,
} from '../../cuenta/paywall'
import { esAppNativa, esEscritorio } from '../../plataforma'
import { sincronizar } from '../../data/sync/motor'
import { GastoByok } from '../GastoByok'

const URL_WEB = import.meta.env.VITE_URL_WEB as string | undefined

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
      {/* Gasto BYOK: independiente de sesión/backend, es local a este dispositivo. */}
      <GastoByok />
    </div>
  )
}

/** Login/registro (export: se reutiliza fuera de esta sección). */
export function FormularioAcceso() {
  const t = useT()
  const entrar = useSesion((s) => s.entrar)
  const registrar = useSesion((s) => s.registrar)
  const restablecer = useSesion((s) => s.restablecer)
  const [modo, setModo] = useState<'entrar' | 'registrar'>('entrar')
  const [email, setEmail] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const olvide = async () => {
    if (ocupado) return
    if (!email.trim()) {
      setError(t('cuenta.olvide.sinCorreo', 'Escribe tu correo arriba primero.'))
      return
    }
    setOcupado(true)
    setError(null)
    setAviso(null)
    try {
      const err = await restablecer(email.trim())
      if (err) setError(err)
      else setAviso(t('cuenta.olvide.enviado', 'Te enviamos un correo para restablecerla.'))
    } finally {
      setOcupado(false)
    }
  }

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
      {modo === 'entrar' && (
        <button
          type="button"
          onClick={() => void olvide()}
          disabled={ocupado}
          className="w-full px-2 py-0.5 text-[11px] text-white/40 transition hover:text-white/60 disabled:opacity-50"
        >
          {t('cuenta.olvide', '¿Olvidaste tu contraseña?')}
        </button>
      )}
    </div>
  )
}

function CuentaConSesion() {
  const t = useT()
  const usuario = useSesion((s) => s.usuario)
  const plan = useSesion((s) => s.plan)
  const planExpira = useSesion((s) => s.planExpira)
  const usoIA = useSesion((s) => s.usoIA)
  const creditosExtra = useSesion((s) => s.creditosExtra)
  const salir = useSesion((s) => s.salir)

  // Al abrir la sección, el plan y el uso se refrescan (pudo comprar/cancelar
  // en la web hace un momento).
  useEffect(() => {
    const s = useSesion.getState()
    void s.refrescarPerfil()
    void s.refrescarUso()
  }, [])

  return (
    <div className="space-y-1.5" data-tut="cuenta.sesion">
      <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2 py-1.5">
        <span className="min-w-0 flex-1 truncate text-xs text-white/75">{usuario?.email}</span>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
            plan === 'pro' ? 'ui-accent-bg' : 'bg-white/10 text-white/60'
          }`}
        >
          {plan === 'pro' ? t('cuenta.plan.pro', 'Pro') : t('cuenta.plan.local', 'Local')}
        </span>
      </div>
      {plan === 'pro' && planExpira && (
        <p className="text-[11px] text-white/45">
          {t('cuenta.plan.expira', 'Renueva o vence: {f}', {
            f: new Date(planExpira).toLocaleDateString(),
          })}
        </p>
      )}
      {/* En local no hay pool mensual que medir, pero sí saldo de recargas: sin
          esto, quien compra créditos no puede ver cuántos le quedan. */}
      {(plan === 'pro' ? !!usoIA : creditosExtra > 0) && (
        <div className="space-y-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
            {plan === 'pro'
              ? t('cuenta.uso.titulo', 'Uso de IA este mes')
              : t('cuenta.uso.tituloLocal', 'Tus créditos de IA')}
          </p>
          {plan === 'pro' && usoIA && (
            <BarraUso
              label={t('cuenta.uso.creditos', 'Créditos')}
              usadas={usoIA.creditos}
              limite={usoIA.limiteCreditos}
            />
          )}
          {creditosExtra > 0 && (
            <p className="text-[10px] text-white/45">
              {t('cuenta.uso.extra', 'Créditos extra (recargas): {n}', { n: creditosExtra })}
            </p>
          )}
          <p className="text-[10px] text-white/35">
            {t(
              'cuenta.uso.notaImagen',
              '1 respuesta = 1 crédito · un plan largo = 3 · una imagen o un modelo 3D = 10',
            )}
          </p>
        </div>
      )}
      {plan === 'pro' ? (
        <FilaSync />
      ) : (
        <p className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] leading-snug text-white/45">
          {t('cuenta.sync.soloPro', 'La sincronización entre dispositivos es parte de Pro.')}
        </p>
      )}
      <BloquePaywall />
      <button
        type="button"
        onClick={() => void salir()}
        className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] font-semibold text-white/60 transition hover:bg-white/10"
      >
        {t('cuenta.salir', 'Cerrar sesión')}
      </button>
      <BotonEliminarCuenta />
    </div>
  )
}

/** Borrado de cuenta con doble confirmación (requisito de las tiendas). */
function BotonEliminarCuenta() {
  const t = useT()
  const eliminarCuenta = useSesion((s) => s.eliminarCuenta)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const alBorrar = async () => {
    if (ocupado) return
    const msj = t(
      'cuenta.eliminar.confirma',
      '¿Borrar tu cuenta y todos tus datos de los servidores? Esta acción no se puede deshacer. Los datos locales de este dispositivo se conservan.',
    )
    if (!window.confirm(msj)) return
    if (!window.confirm(t('cuenta.eliminar.confirma2', 'Última confirmación: ¿borrar la cuenta definitivamente?'))) return
    setOcupado(true)
    setError(null)
    try {
      const err = await eliminarCuenta()
      if (err) setError(err)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => void alBorrar()}
        disabled={ocupado}
        className="w-full rounded-md border border-red-400/20 bg-red-400/5 px-2 py-1.5 text-[11px] font-semibold text-red-400/70 transition hover:bg-red-400/10 disabled:opacity-50"
      >
        {ocupado ? t('cuenta.eliminar.borrando', 'Borrando…') : t('cuenta.eliminar', 'Eliminar cuenta')}
      </button>
      {error && <p className="text-[11px] leading-snug text-red-400/90">{error}</p>}
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

/**
 * Compra/renovación (sin Pro) o gestión + recarga (con Pro), vía RevenueCat.
 * En apps de tienda (Android/iOS) NO se renderiza nada: ni compra, ni
 * "gestionar", ni enlaces de pago (modelo solo-consumo).
 * En escritorio (Electron) el checkout va SIEMPRE al navegador, vía la web.
 */
function BloquePaywall() {
  const t = useT()
  const plan = useSesion((s) => s.plan)
  const fuePro = useSesion((s) => s.fuePro)
  const [oferta, setOferta] = useState<OfertaPro | null>(null)
  const [urlG, setUrlG] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const nativo = esAppNativa()
  const escritorio = esEscritorio()

  useEffect(() => {
    if (nativo || escritorio || !hayPagos()) return
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
  }, [plan, nativo, escritorio])

  if (nativo) return null

  // Escritorio: todo el flujo de pago vive en la web (navegador externo).
  if (escritorio) {
    if (!URL_WEB) return null
    return (
      <a
        href={`${URL_WEB}/cuenta`}
        target="_blank"
        rel="noreferrer"
        className={
          plan === 'pro'
            ? 'block w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-center text-[11px] font-semibold text-white/60 transition hover:bg-white/10'
            : 'ui-accent-bg block w-full rounded-md px-2 py-1.5 text-center text-xs font-bold'
        }
      >
        {plan === 'pro'
          ? t('cuenta.pago.gestionar', 'Gestionar mi suscripción')
          : t('cuenta.pago.comprarWeb', 'Hazte Pro en la web')}
      </a>
    )
  }

  if (!hayPagos()) return null

  if (plan === 'pro') {
    return (
      <div className="space-y-1.5">
        {urlG && (
          <a
            href={urlG}
            target="_blank"
            rel="noreferrer"
            className="block w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-center text-[11px] font-semibold text-white/60 transition hover:bg-white/10"
          >
            {t('cuenta.pago.gestionar', 'Gestionar mi suscripción')}
          </a>
        )}
        <BotonesRecarga />
      </div>
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
          ? fuePro
            ? t('cuenta.pago.renovar', 'Renovar suscripción — {p}/mes', { p: oferta.precio })
            : t('cuenta.pago.comprarPrecio', 'Hazte Pro — {p}/mes', { p: oferta.precio })
          : t('cuenta.pago.comprar', 'Hazte Pro')}
      </button>
      {/* Sin suscripción las recargas también se venden: son el acceso a la IA
          en modo local, no un extra del Pro que se quedó corto. */}
      <BotonesRecarga />
      {error && <p className="text-[11px] leading-snug text-red-400/90">{error}</p>}
    </div>
  )
}

/** Paquetes de créditos sueltos. Sirven con y sin suscripción. */
function BotonesRecarga() {
  const t = useT()
  const [recargas, setRecargas] = useState<OfertaPro[]>([])
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [listo, setListo] = useState(false)

  useEffect(() => {
    let vivo = true
    obtenerRecargas()
      .then((r) => {
        if (vivo) setRecargas(r)
      })
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [])

  if (!recargas.length) return null

  const alComprar = async (oferta: OfertaPro) => {
    if (ocupado) return
    setOcupado(true)
    setError(null)
    setListo(false)
    try {
      await comprarRecarga(oferta.paquete)
      setListo(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="space-y-1">
      {recargas.map((r) => (
        <button
          key={r.paquete.identifier}
          type="button"
          onClick={() => void alComprar(r)}
          disabled={ocupado}
          className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] font-semibold text-white/60 transition hover:bg-white/10 disabled:opacity-50"
        >
          {t('cuenta.cuota.recargaN', '+{n} créditos — {p}', { n: r.creditos, p: r.precio })}
        </button>
      ))}
      {listo && (
        <p className="text-[11px] leading-snug text-accent/90">
          {t('cuenta.cuota.recargaLista', 'Recarga aplicada: tus créditos extra ya están en tu cuenta.')}
        </p>
      )}
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
