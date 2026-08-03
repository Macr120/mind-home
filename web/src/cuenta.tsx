/**
 * Portal de cuenta de la web pública (dominio.com/cuenta): registro, login,
 * suscripción (RevenueCat Web Billing), recargas, gestión y borrado de cuenta.
 *
 * REUTILIZA los módulos de cuenta de la app (`src/core/cuenta/*`) por import
 * relativo — misma sesión de Supabase, mismo paywall, mismo espejo del plan.
 * Ojo: NO importar nada que arrastre dexie/three (ni useT/ajustesStore): esta
 * página debe seguir pesando poco. Solo español a propósito (la landing es ES).
 */
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './cuenta.css'
import { supabase, hayBackend } from '../../src/core/cuenta/supabase'
import { iniciarSesion, useSesion } from '../../src/core/cuenta/sesionStore'
import {
  hayPagos,
  obtenerOfertas,
  obtenerRecargas,
  comprar,
  comprarRecarga,
  urlGestion,
  type OfertaPro,
} from '../../src/core/cuenta/paywall'

iniciarSesion()

const URL_APP = import.meta.env.VITE_URL_APP as string | undefined

// ─── Piezas de UI ────────────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85 outline-none placeholder:text-white/30 focus:border-white/25'
const botonPrincipal =
  'w-full rounded-lg bg-[#863bff] px-3 py-2 text-sm font-bold text-white transition hover:bg-[#a06bff] disabled:opacity-50'
const botonSecundario =
  'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/60 transition hover:bg-white/10 disabled:opacity-50'

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">{children}</div>
  )
}

function Marco({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-3 px-4 py-8">
      <a href="/" className="flex items-center justify-center gap-2 text-white/90">
        <img src="/icon.svg" alt="" className="h-9 w-9 rounded-lg" />
        <span className="text-lg font-extrabold">Mind Planner Home</span>
      </a>
      {children}
      <p className="text-center text-[11px] text-white/30">
        <a href="/privacidad" className="hover:text-white/60">Privacidad</a>
        {' · '}
        <a href="/terminos" className="hover:text-white/60">Términos</a>
      </p>
    </div>
  )
}

// ─── Acceso (login / registro / olvidé) ──────────────────────────────────────

function Acceso() {
  const entrar = useSesion((s) => s.entrar)
  const registrar = useSesion((s) => s.registrar)
  const restablecer = useSesion((s) => s.restablecer)
  const [modo, setModo] = useState<'entrar' | 'registrar'>('registrar')
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
        else setAviso('Cuenta creada: revisa tu correo y confírmalo para poder entrar.')
      }
    } finally {
      setOcupado(false)
    }
  }

  const olvide = async () => {
    if (ocupado) return
    if (!email.trim()) {
      setError('Escribe tu correo arriba primero.')
      return
    }
    setOcupado(true)
    setError(null)
    try {
      const err = await restablecer(email.trim())
      if (err) setError(err)
      else setAviso('Te enviamos un correo para restablecer tu contraseña.')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Panel>
      <h1 className="text-base font-bold text-white/90">
        {modo === 'registrar' ? 'Crea tu cuenta' : 'Entra a tu cuenta'}
      </h1>
      <p className="text-xs text-white/45">
        {modo === 'registrar'
          ? 'Primero tu cuenta; después eliges tu suscripción.'
          : 'Tu suscripción y tu casa te esperan.'}
      </p>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Correo"
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
        placeholder="Contraseña"
        autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
        className={inputCls}
      />
      {error && <p className="text-xs leading-snug text-red-400/90">{error}</p>}
      {aviso && <p className="text-xs leading-snug text-emerald-300/90">{aviso}</p>}
      <button type="button" onClick={() => void enviar()} disabled={ocupado} className={botonPrincipal}>
        {modo === 'entrar' ? 'Entrar' : 'Crear cuenta'}
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
        {modo === 'entrar' ? 'No tengo cuenta: crear una' : 'Ya tengo cuenta: entrar'}
      </button>
      {modo === 'entrar' && (
        <button
          type="button"
          onClick={() => void olvide()}
          disabled={ocupado}
          className="w-full py-0.5 text-[11px] text-white/40 transition hover:text-white/60"
        >
          ¿Olvidaste tu contraseña?
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
      if (nueva.length < 8) setError('Mínimo 8 caracteres.')
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
      <h1 className="text-base font-bold text-white/90">Elige tu nueva contraseña</h1>
      <input
        type="password"
        value={nueva}
        onChange={(e) => setNueva(e.target.value)}
        placeholder="Nueva contraseña"
        autoComplete="new-password"
        className={inputCls}
      />
      {error && <p className="text-xs leading-snug text-red-400/90">{error}</p>}
      <button type="button" onClick={() => void guardar()} disabled={ocupado} className={botonPrincipal}>
        Guardar contraseña
      </button>
    </Panel>
  )
}

// ─── Tarifas (suscribirse / renovar) ─────────────────────────────────────────

function Tarifas({ titulo }: { titulo: string }) {
  const [ofertas, setOfertas] = useState<OfertaPro[]>([])
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    let vivo = true
    obtenerOfertas()
      .then((o) => {
        if (vivo) setOfertas(o)
      })
      .catch(() => {
        if (vivo) setError('No se pudieron cargar los precios. Recarga la página.')
      })
    return () => {
      vivo = false
    }
  }, [])

  const alComprar = async (o: OfertaPro) => {
    if (ocupado) return
    setOcupado(true)
    setError(null)
    try {
      const ok = await comprar(o.paquete)
      if (!ok) setError('La compra no se completó.')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setOcupado(false)
    }
  }

  if (!hayPagos()) {
    return <p className="text-xs text-white/45">Los pagos no están configurados en este entorno.</p>
  }

  return (
    <Panel>
      <h2 className="text-sm font-bold text-white/90">{titulo}</h2>
      {ofertas.length === 0 && !error && <p className="text-xs text-white/45">Cargando precios…</p>}
      {ofertas.map((o) => (
        <div key={o.paquete.identifier} className="space-y-2 rounded-xl border border-[#863bff]/50 bg-white/5 p-3">
          <p className="text-2xl font-extrabold text-white/95">
            {o.precio}
            <span className="text-sm font-semibold text-white/50">
              {o.periodo === 'anio' ? ' /año' : o.periodo === 'mes' ? ' /mes' : ''}
            </span>
          </p>
          <ul className="list-none space-y-1 text-xs text-white/60">
            <li>✓ Todas las apps de la casa, en todos tus dispositivos</li>
            <li>✓ 600 créditos de IA al mes</li>
            <li>✓ Sincronización y respaldo en la nube</li>
          </ul>
          <button type="button" onClick={() => void alComprar(o)} disabled={ocupado} className={botonPrincipal}>
            {ocupado ? 'Procesando…' : titulo}
          </button>
        </div>
      ))}
      {error && <p className="text-xs leading-snug text-red-400/90">{error}</p>}
      <p className="text-[11px] leading-snug text-white/35">
        Sin permanencia. Si cancelas, la app sigue en tus dispositivos en modo local, sin IA ni
        sincronización.
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
  const usoIA = useSesion((s) => s.usoIA)
  const creditosExtra = useSesion((s) => s.creditosExtra)
  const salir = useSesion((s) => s.salir)

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
              plan === 'pro' ? 'bg-[#863bff] text-white' : 'bg-white/10 text-white/60'
            }`}
          >
            {plan === 'pro' ? 'Pro' : 'Local'}
          </span>
        </div>
        {plan === 'pro' && planExpira && (
          <p className="text-xs text-white/45">
            Renueva o vence: {new Date(planExpira).toLocaleDateString()}
          </p>
        )}
      </Panel>

      {plan === 'pro' ? (
        <ProActivo usoIA={usoIA} creditosExtra={creditosExtra} />
      ) : (
        <>
          <Panel>
            <p className="text-xs leading-snug text-white/60">
              {fuePro
                ? 'Tu suscripción terminó: la app sigue en tus dispositivos en modo local. Renueva y los créditos mensuales y la sincronización vuelven tal como los dejaste.'
                : 'Estás en modo local: la app y tus datos son tuyos sin pagar nada. La IA se paga por uso — compra los créditos que necesites, o suscríbete y recíbelos cada mes.'}
            </p>
            {creditosExtra > 0 && (
              <p className="text-[11px] text-white/45">Créditos disponibles: {creditosExtra}</p>
            )}
          </Panel>
          {/* Las recargas se venden sin suscripción: son el acceso a la IA en local. */}
          <Recargas />
          <Tarifas titulo={fuePro ? 'Renovar suscripción' : 'Suscribirme'} />
        </>
      )}

      <Panel>
        {URL_APP && (
          <a href={URL_APP} className={botonSecundario + ' block text-center'}>
            Abrir la app en el navegador
          </a>
        )}
        <a href="/#descargas" className={botonSecundario + ' block text-center'}>
          Descargas para tus dispositivos
        </a>
        <button type="button" onClick={() => void salir()} className={botonSecundario}>
          Cerrar sesión
        </button>
        <EliminarCuenta />
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
              <span className="flex-1">Créditos de IA este mes</span>
              <span className="tabular-nums text-white/40">
                {usoIA.creditos}/{usoIA.limiteCreditos}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[#863bff]" style={{ width: `${pct}%` }} />
            </div>
            {creditosExtra > 0 && (
              <p className="mt-1 text-[11px] text-white/45">
                Créditos extra (recargas, no caducan): {creditosExtra}
              </p>
            )}
          </div>
        )}
        {urlG && (
          <a href={urlG} target="_blank" rel="noreferrer" className={botonSecundario + ' block text-center'}>
            Gestionar suscripción (cancelar, cambiar pago)
          </a>
        )}
      </Panel>
      <Recargas />
    </>
  )
}

/**
 * Paquetes de créditos sueltos. Se venden con y sin suscripción: en modo local
 * son la única forma de usar la IA, y con Pro son el desahogo del que se quedó
 * corto a mitad de mes. No caducan.
 */
function Recargas() {
  const [recargas, setRecargas] = useState<OfertaPro[]>([])
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  const alRecargar = async (oferta: OfertaPro) => {
    if (ocupado) return
    setOcupado(true)
    setError(null)
    setAviso(null)
    try {
      await comprarRecarga(oferta.paquete)
      setAviso('Recarga aplicada: tus créditos ya están en tu cuenta.')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Panel>
      <p className="text-xs font-semibold text-white/70">Comprar créditos</p>
      <p className="text-[11px] leading-snug text-white/45">
        Se gastan solo cuando pides algo y no caducan. 1 respuesta = 1 crédito · un plan largo
        = 3 · una imagen o un modelo 3D = 10.
      </p>
      {recargas.map((r) => (
        <button
          key={r.paquete.identifier}
          type="button"
          onClick={() => void alRecargar(r)}
          disabled={ocupado}
          className={botonSecundario}
        >
          {ocupado ? 'Procesando…' : `+${r.creditos} créditos — ${r.precio}`}
        </button>
      ))}
      {aviso && <p className="text-[11px] leading-snug text-emerald-300/90">{aviso}</p>}
      {error && <p className="text-[11px] leading-snug text-red-400/90">{error}</p>}
    </Panel>
  )
}

function EliminarCuenta() {
  const eliminarCuenta = useSesion((s) => s.eliminarCuenta)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const alBorrar = async () => {
    if (ocupado) return
    if (
      !window.confirm(
        '¿Borrar tu cuenta y todos tus datos de los servidores? Esta acción no se puede deshacer. Los datos locales de tus dispositivos se conservan.',
      )
    )
      return
    if (!window.confirm('Última confirmación: ¿borrar la cuenta definitivamente?')) return
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
    <>
      <button
        type="button"
        onClick={() => void alBorrar()}
        disabled={ocupado}
        className="w-full rounded-lg border border-red-400/20 bg-red-400/5 px-3 py-2 text-xs font-semibold text-red-400/70 transition hover:bg-red-400/10 disabled:opacity-50"
      >
        {ocupado ? 'Borrando…' : 'Eliminar cuenta'}
      </button>
      {error && <p className="text-[11px] leading-snug text-red-400/90">{error}</p>}
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
    if (!supabase) return
    const { data } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === 'PASSWORD_RECOVERY') setRecovery(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  if (!hayBackend()) {
    return (
      <Marco>
        <Panel>
          <p className="text-xs text-white/60">
            Este entorno no tiene backend configurado (faltan las variables VITE_SUPABASE_*).
          </p>
        </Panel>
      </Marco>
    )
  }
  if (cargando) {
    return (
      <Marco>
        <p className="text-center text-sm text-white/45">Cargando…</p>
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Pagina />
  </StrictMode>,
)
