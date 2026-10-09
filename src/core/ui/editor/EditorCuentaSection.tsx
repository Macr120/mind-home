import { useEffect, useState } from 'react'
import { idiomaActual, localeActual, useT } from '../../i18n/useT'
import { hayBackend } from '../../cuenta/supabase'
import { esperaConfirmacion, mensajeCuenta, useSesion } from '../../cuenta/sesionStore'
import { refrescarUsoAlmacen, useAlmacen } from '../../cuenta/almacen'
import { GB_POR_NIVEL, fechaPurga, formatoBytes, formatoUso } from '../../cuenta/almacenUso'
import {
  CompraCancelada,
  hayPagos,
  obtenerNiveles,
  cambiarNivel,
  detalleDeFallo,
  restaurarCompras,
  canjearCodigo,
  puedeCanjearCodigo,
  textoDeFallo,
  urlGestion,
  type OfertaPro,
} from '../../cuenta/paywall'
import { canalPago, esAppNativa, esEscritorio, nombrePlataforma } from '../../plataforma'
import { sincronizar } from '../../data/sync/motor'
import { GastoByok } from '../GastoByok'
import { LogoApple, LogoGoogle } from '../logosMarca'
import { FilaAlias } from '../../buzon/ui/FilaAlias'
import { cargarTextos } from '../../../../web/i18n/paginas/index.mjs'
import { useCuotaAgotada } from '../../state/avisosPlanStore'
import { navegarDestino } from '../../chat/destinoChat'
import { Icono } from '../iconos/Icono'
import { prefijo } from '../../../../web/i18n/idiomas.mjs'

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

/**
 * Login/registro (export: se reutiliza fuera de esta sección). `inicial` decide
 * con qué pestaña abre: lo eligen el menú de la puerta (según el botón que se
 * tocó) y el aviso de créditos sin cuenta, que pide crear una; el resto de
 * sitios asume que ya la tienes.
 */
export function FormularioAcceso({ inicial = 'entrar' }: { inicial?: 'entrar' | 'registrar' }) {
  const t = useT()
  const entrar = useSesion((s) => s.entrar)
  const registrar = useSesion((s) => s.registrar)
  const restablecer = useSesion((s) => s.restablecer)
  const [modo, setModo] = useState<'entrar' | 'registrar'>(inicial)
  const [email, setEmail] = useState('')
  const [contrasena, setContrasena] = useState('')
  // Opt-in: desmarcada por defecto, nadie queda suscrito sin decir que sí.
  const [boletin, setBoletin] = useState(false)
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
      if (err) setError(mensajeCuenta(err, t))
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
        if (err) setError(mensajeCuenta(err, t))
      } else {
        const err = await registrar(email.trim(), contrasena, idiomaActual(), boletin)
        if (err) setError(mensajeCuenta(err, t))
        // Con la confirmación de correo apagada en Supabase la sesión ya está
        // abierta y la puerta pasa sola a la compra: no hay nada que avisar.
        else if (esperaConfirmacion())
          setAviso(
            t(
              'cuenta.confirmaCorreoVuelve',
              'Cuenta creada: abre el enlace que te enviamos por correo y vuelve a la app. Tu sesión se abrirá automáticamente.',
            ),
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
        {/* «Tu compra» venía del pago único de la casa, que ya no existe: en las
            tiendas solo hay las tres suscripciones y no se nombra otra cosa. */}
        {canalPago() === 'iap'
          ? t(
              'cuenta.introTienda',
              'Tu cuenta guarda tu MindHaOS (Casa Mental OS) y tu suscripción: es lo que te las devuelve en cualquier dispositivo.',
            )
          : t(
              'cuenta.intro',
              'Tu cuenta guarda tu MindHaOS (Casa Mental OS) y tu compra: es lo que te las devuelve en cualquier dispositivo.',
            )}
      </p>
      {/* En TODAS las plataformas. Google rechaza OAuth dentro de una ventana
          empotrada (`disallowed_useragent`), así que fuera de la web el flujo
          sale al navegador del SISTEMA y vuelve por deep link — ahí Google no
          ve ni al WebView ni a Electron, solo a Safari o Chrome. El escritorio
          estuvo sin estos botones mientras no existía esa vuelta; desde que
          `electron/precarga.cjs` reemite el enlace y `escucharDeepLinkAuth` lo
          canjea (ver `docs/ESCRITORIO.md` §3), no hay motivo para esconderlos. */}
      <BotonesOAuth />
      <div className="flex items-center gap-2 text-[10px] text-white/30">
        <span className="h-px flex-1 bg-white/10" />
        {t('cuenta.oCorreo', 'o con tu correo')}
        <span className="h-px flex-1 bg-white/10" />
      </div>
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
      {modo === 'registrar' && (
        <label className="flex cursor-pointer items-start gap-2 px-0.5 text-[11px] leading-snug text-white/60">
          <input
            type="checkbox"
            checked={boletin}
            onChange={(e) => setBoletin(e.target.checked)}
            className="mt-0.5 shrink-0 accent-[var(--color-accent)]"
          />
          {t(
            'cuenta.boletin',
            'Quiero recibir un correo diario con consejos de salud mental, promociones y noticias importantes. Puedo darme de baja cuando quiera.',
          )}
        </label>
      )}
      {error && <p className="whitespace-pre-line text-[11px] leading-snug text-red-400/90">{error}</p>}
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

/**
 * Login con Google/Apple. Los logos van en SVG en línea: son MARCAS, no iconos
 * del catálogo (`<Icono>` es para el sistema emoji→SVG de la UI).
 */
function BotonesOAuth() {
  const t = useT()
  const entrarConProveedor = useSesion((s) => s.entrarConProveedor)
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const con = async (proveedor: 'google' | 'apple') => {
    if (ocupado) return
    setOcupado(true)
    setError(null)
    const err = await entrarConProveedor(proveedor)
    // En la web, sin error, la página está saliendo hacia el proveedor: se
    // queda deshabilitado hasta la redirección. En la app no se sale de la
    // página (hoja nativa o navegador encima) y cerrarlos debe dejar reintentar.
    if (err) setError(mensajeCuenta(err, t))
    if (err || esAppNativa() || esEscritorio()) setOcupado(false)
  }

  const botonCls =
    'flex w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-semibold text-white/75 transition hover:bg-white/10 disabled:opacity-50'

  return (
    <div className="space-y-1.5">
      <button type="button" onClick={() => void con('google')} disabled={ocupado} className={botonCls}>
        <LogoGoogle />
        {t('cuenta.conGoogle', 'Continuar con Google')}
      </button>
      <button type="button" onClick={() => void con('apple')} disabled={ocupado} className={botonCls}>
        <LogoApple />
        {t('cuenta.conApple', 'Continuar con Apple')}
      </button>
      {error && <p className="whitespace-pre-line text-[11px] leading-snug text-red-400/90">{error}</p>}
    </div>
  )
}

/** Interruptor del boletín diario por correo: se puede cambiar cuando se quiera. */
function FilaBoletin() {
  const t = useT()
  const boletin = useSesion((s) => s.boletin)
  const elegirBoletin = useSesion((s) => s.elegirBoletin)
  const [ocupado, setOcupado] = useState(false)
  // Sin leer (o sin la tabla en el servidor): no se pinta.
  if (boletin === undefined) return null
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] leading-snug text-white/60">
      <input
        type="checkbox"
        checked={boletin === true}
        disabled={ocupado}
        onChange={async (e) => {
          setOcupado(true)
          await elegirBoletin(e.target.checked, idiomaActual())
          setOcupado(false)
        }}
        className="mt-0.5 shrink-0 accent-[var(--color-accent)]"
      />
      {t('cuenta.boletinFila', 'Correo diario: salud mental, promociones y noticias importantes')}
    </label>
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
  const sinPlanDesde = useSesion((s) => s.sinPlanDesde)
  const usoNube = useAlmacen((s) => s.uso)

  // Al abrir la sección, el plan y el uso se refrescan (pudo comprar/cancelar
  // en la web hace un momento).
  useEffect(() => {
    const s = useSesion.getState()
    void s.refrescarPerfil()
    void s.refrescarUso()
    void refrescarUsoAlmacen()
  }, [])

  // El trial (cupones) se comporta como Pro (pool + sync); solo cambia el copy.
  const conAcceso = plan === 'pro' || plan === 'trial'

  return (
    <div className="space-y-1.5" data-tut="cuenta.sesion">
      <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2 py-1.5">
        <span className="min-w-0 flex-1 truncate text-xs text-white/75">{usuario?.email}</span>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
            conAcceso ? 'ui-accent-bg' : 'bg-white/10 text-white/60'
          }`}
        >
          {plan === 'pro'
            ? t('cuenta.plan.pro', 'Pro')
            : plan === 'trial'
              ? t('cuenta.plan.prueba', 'Prueba')
              : t('cuenta.plan.local', 'Local')}
        </span>
      </div>
      {/* Alias público del buzón (mensajería entre usuarios) */}
      <FilaAlias />
      <FilaBoletin />
      {conAcceso && planExpira && (
        <p className="text-[11px] text-white/45">
          {plan === 'trial'
            ? t('cuenta.plan.pruebaExpira', 'Tu prueba termina el {f}.', {
                f: new Date(planExpira).toLocaleDateString(localeActual()),
              })
            : t('cuenta.plan.expira', 'Renueva o vence: {f}', {
                f: new Date(planExpira).toLocaleDateString(localeActual()),
              })}
        </p>
      )}
      {/* En local no hay pool mensual que medir, pero sí saldo de recargas: sin
          esto, quien compra créditos no puede ver cuántos le quedan. */}
      {(conAcceso ? !!usoIA : creditosExtra > 0) && (
        <div className="space-y-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
            {conAcceso
              ? t('cuenta.uso.titulo', 'Uso de IA este mes')
              : t('cuenta.uso.tituloLocal', 'Tus créditos de IA')}
          </p>
          {conAcceso && usoIA && (
            <BarraUso
              label={t('cuenta.uso.creditos', 'Créditos')}
              usadas={usoIA.creditos}
              limite={usoIA.limiteCreditos}
            />
          )}
          {creditosExtra > 0 && (
            <p className="text-[10px] text-white/45">
              {/* Las recargas sueltas ya no se venden: en las tiendas, ni nombrarlas. */}
              {canalPago() === 'iap'
                ? t('cuenta.uso.extraTienda', 'Créditos extra: {n}', { n: creditosExtra })
                : t('cuenta.uso.extra', 'Créditos extra (recargas): {n}', { n: creditosExtra })}
            </p>
          )}
          <p className="text-[10px] text-white/35">
            {t(
              'cuenta.uso.notaImagen',
              '1 respuesta = 1 crédito · un plan largo = 4 · una imagen o un modelo 3D = 10',
            )}
          </p>
        </div>
      )}
      {/* La nube (cuarto Archivo, R2). Quien se quedó sin plan la sigue viendo
          mientras tenga archivos: está en solo lectura hasta la purga. */}
      {usoNube && (conAcceso || usoNube.usados > 0) && (
        <div className="space-y-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
            {t('cuenta.nube.titulo', 'Tu nube (Archivo)')}
          </p>
          <BarraUso
            label={t('cuenta.nube.espacio', 'Espacio usado')}
            usadas={usoNube.usados}
            limite={usoNube.cuota ?? -1}
            texto={
              usoNube.cuota
                ? formatoUso(usoNube.usados, usoNube.cuota)
                : `${formatoBytes(usoNube.usados)}${usoNube.cuota == null ? '/∞' : ''}`
            }
          />
          {!conAcceso && (
            <p className="text-[10px] leading-snug text-amber-300/80">
              {t('archivos.soloLectura', 'Tu plan no incluye nube: puedes ver y bajar tus archivos, pero no subir nuevos.')}{' '}
              {(() => {
                const f = fechaPurga({ plan, planExpira, sinPlanDesde })
                return f
                  ? t('archivos.purga', 'Se borran de la nube el {fecha}: bájalos antes o reactiva Pro.', {
                      fecha: f.toLocaleDateString(localeActual()),
                    })
                  : null
              })()}
            </p>
          )}
        </div>
      )}
      {conAcceso ? (
        <FilaSync />
      ) : (
        // Sin plan, el botón está igual: al tocarlo sale el aviso «Suscríbete».
        <button
          type="button"
          onClick={() => useCuotaAgotada.getState().abrir('sync')}
          className="flex w-full items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-left text-[11px] font-semibold text-white/60 transition hover:bg-white/10"
        >
          <Icono nombre="sincronizar" />
          <span className="flex-1">{t('cuenta.sync.activar', 'Activar la sincronización entre dispositivos')}</span>
        </button>
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

/**
 * Borrado de cuenta con doble confirmación: Apple exige poder borrar la cuenta
 * desde la app (5.1.1(v)).
 */
export function BotonEliminarCuenta() {
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
      if (err) setError(mensajeCuenta(err, t))
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
      {error && <p className="whitespace-pre-line text-[11px] leading-snug text-red-400/90">{error}</p>}
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
                  f: new Date(ultima).toLocaleTimeString(localeActual()),
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
 * Compra/renovación (sin Pro) o gestión (con Pro), vía RevenueCat.
 * Se vende en las tres plataformas, cada una por su caja (`canalPago()`): compra
 * in-app en Android/iOS y checkout directo en el navegador. En escritorio
 * (Electron) el pago va SIEMPRE al navegador, vía la web.
 */
function BloquePaywall() {
  const t = useT()
  const plan = useSesion((s) => s.plan)
  const [urlG, setUrlG] = useState<string | null>(null)
  const escritorio = canalPago() === 'escritorio'

  useEffect(() => {
    if (escritorio || !hayPagos()) return
    if (plan !== 'pro') return
    let vivo = true
    void urlGestion().then((u) => {
      if (vivo) setUrlG(u)
    })
    return () => {
      vivo = false
    }
  }, [plan, escritorio])

  // Escritorio: todo el flujo de pago vive en la web (navegador externo).
  if (escritorio) {
    if (!URL_WEB) return null
    return (
      <a
        href={`${URL_WEB}/cuenta#planes`}
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

  /*
   * La escalera de niveles se pinta SIEMPRE, esté o no suscrito quien mira.
   * Vivía detrás de `plan === 'pro'`, y eso dejaba el ×2 y el ×3
   * INALCANZABLES para quien aún no se había suscrito: ni se veían ni había
   * forma de comprarlos, porque el único botón ofrecía el ×1 y nada más. Para
   * App Review era peor todavía: los productos de suscripción viajan
   * DENTRO del envío y las notas dicen que están en «Settings › Account», pero
   * el revisor, que llega sin suscripción, no habría encontrado más que un
   * «Hazte Pro». Ahora la lista los enseña todos con su precio de tienda.
   *
   * Y por eso ya no hay botón suelto de «Hazte Pro — {precio}/mes»: era el
   * mismo ×1 que encabeza la lista, con otro rótulo y a dos dedos de distancia.
   * Quien vuelve tras caducar tampoco lo echa en falta: la lista le deja
   * reengancharse en el nivel que quiera, no solo en el que tenía.
   */
  return (
    <div className="space-y-1.5">
      <Niveles />
      <CanjearCodigo />
      <Restaurar />
      {canalPago() !== 'iap' && <FilaCupon />}
      {plan === 'pro' && urlG && (
        <a
          href={urlG}
          target="_blank"
          rel="noreferrer"
          className="block w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-center text-[11px] font-semibold text-white/60 transition hover:bg-white/10"
        >
          {t('cuenta.pago.gestionar', 'Gestionar mi suscripción')}
        </a>
      )}
      <AvisoRenovacion />
      <EnlacesLegales />
    </div>
  )
}

/**
 * La OTRA mitad de lo que pide la guía 3.1.2, que faltaba junto a los enlaces:
 * el aviso de que la suscripción se cobra sola y dónde se cancela. Apple lo
 * quiere en la misma pantalla donde se vende, no solo en la ficha de la tienda,
 * y es de los motivos de rechazo más repetidos.
 *
 * Solo con `canalPago() === 'iap'`: en la web y el escritorio no hay renovación
 * de tienda que advertir, y el texto cambia de Apple a Google Play porque cada
 * una manda cancelar en su sitio.
 */
export function AvisoRenovacion() {
  const t = useT()
  if (canalPago() !== 'iap') return null
  return (
    <p className="text-[10px] leading-snug text-white/35">
      {nombrePlataforma() === 'ios'
        ? t(
            'cuenta.legal.renovacion.apple',
            'El pago se carga a tu ID de Apple al confirmar la compra. La suscripción se renueva sola salvo que la desactives al menos 24 horas antes de que acabe el periodo en curso, y el cobro de la renovación se hace dentro de esas 24 horas. Puedes gestionarla o cancelarla en los Ajustes de tu ID de Apple.',
          )
        : t(
            'cuenta.legal.renovacion.google',
            'El pago se carga a tu cuenta de Google Play al confirmar la compra. La suscripción se renueva sola salvo que la canceles antes de que acabe el periodo en curso. Puedes gestionarla o cancelarla en las suscripciones de Google Play.',
          )}
    </p>
  )
}

/**
 * Términos, privacidad y soporte al pie de la oferta: la guía 3.1.2 de Apple
 * exige los dos primeros DENTRO de la app, en la misma pantalla donde se venden
 * las suscripciones (el enlace de la ficha del App Store no basta), y la 1.5
 * un contacto de soporte a mano. Los rótulos y el prefijo de idioma salen del
 * catálogo de la web, igual que el pie de `PuertaCuenta`.
 */
const EULA_APPLE = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/'

/**
 * Soporte. En las tiendas es el CORREO, no la página: la de la web enlaza a
 * «Mi cuenta» y a las preguntas con precios, o sea, a dos toques de una compra
 * fuera de la tienda (3.1.1). Fuera de ellas, la página de soporte.
 */
export const CORREO_SOPORTE = 'mailto:help@mindhaos.com'
export function enlaceSoporte(base: string | null): string {
  return canalPago() === 'iap' || !base ? CORREO_SOPORTE : `${base}/soporte`
}

export function EnlacesLegales() {
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

  const base = URL_WEB ? `${URL_WEB}${prefijo(idiomaActual())}` : null
  // En las tiendas, los Términos son el EULA estándar de Apple (el que declara
  // la ficha): los de la web hablan de pagos «solo en este sitio», nombran
  // Stripe y llevan precios en dólares, y App Review rechaza enlazar desde la
  // app a una compra de fuera (3.1.1).
  const terminos = canalPago() === 'iap' && nombrePlataforma() === 'ios' ? EULA_APPLE : `${base}/terminos`
  const soporte: [string, string] = [enlaceSoporte(base), textos?.['pie.soporte'] ?? 'Soporte']
  // Sin web (build sin URL) queda al menos el soporte, que va por correo.
  const paginas: [string, string][] = base
    ? [[terminos, textos?.['pie.terminos'] ?? 'Términos'], [`${base}/privacidad`, textos?.['pie.privacidad'] ?? 'Privacidad'], soporte]
    : [soporte]
  return (
    <p className="flex flex-wrap justify-center gap-x-3 gap-y-1 pt-0.5 text-[10px] text-white/35">
      {paginas.map(([url, rotulo]) => (
        <a
          key={url}
          href={url}
          target="_blank"
          rel="noreferrer"
          className="transition hover:text-white/60"
        >
          {rotulo}
        </a>
      ))}
    </p>
  )
}

/**
 * Canje de códigos promocionales de la TIENDA (Offer Codes de Apple, códigos
 * de Google Play): la vía admitida para regalar o promocionar la suscripción
 * dentro de las apps de tienda. Abre la pantalla oficial de la tienda; el
 * cupón propio (`FilaCupon`) solo existe fuera de ellas.
 */
function CanjearCodigo() {
  const t = useT()
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  if (!puedeCanjearCodigo()) return null

  const alCanjear = async () => {
    if (ocupado) return
    setOcupado(true)
    setAviso(null)
    try {
      const ok = await canjearCodigo()
      setAviso(
        ok
          ? t('cuenta.codigo.listo', 'Código canjeado: tu suscripción ya está activa.')
          : t('cuenta.codigo.pendiente', 'Si canjeaste un código, tu suscripción aparecerá aquí en unos minutos.'),
      )
    } catch (e) {
      setAviso(textoDeFallo(e, t))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => void alCanjear()}
        disabled={ocupado}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] font-semibold text-white/60 transition hover:bg-white/10 disabled:opacity-50"
      >
        <Icono nombre="regalo" />
        {ocupado ? '…' : t('cuenta.codigo.canjear', 'Canjear un código promocional')}
      </button>
      {aviso && <p className="text-[11px] leading-snug text-white/45">{aviso}</p>}
    </div>
  )
}

/**
 * «Restaurar compras»: Apple lo EXIGE en cualquier app con compra in-app, y en
 * Android saca del apuro a quien reinstala o estrena teléfono. En la web no
 * aparece: allí las compras ya cuelgan de la cuenta, no del dispositivo.
 */
function Restaurar() {
  const t = useT()
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  if (canalPago() !== 'iap' || !hayPagos()) return null

  const alRestaurar = async () => {
    if (ocupado) return
    setOcupado(true)
    setAviso(null)
    try {
      const ok = await restaurarCompras()
      // Con o sin compras, siempre se contesta: un «Restaurar» que no dice nada
      // parece un botón roto, y App Review lo prueba (2.1).
      setAviso(
        ok
          ? t('cuenta.pago.restaurado', 'Compras restauradas: tu suscripción está al día.')
          : t('cuenta.pago.sinRestaurar', 'No encontramos compras de esta cuenta.'),
      )
    } catch (e) {
      setAviso(textoDeFallo(e, t))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => void alRestaurar()}
        disabled={ocupado}
        className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] font-semibold text-white/60 transition hover:bg-white/10 disabled:opacity-50"
      >
        {t('cuenta.pago.restaurar', 'Restaurar compras')}
      </button>
      {aviso && <p className="text-[11px] leading-snug text-white/45">{aviso}</p>}
    </div>
  )
}

/**
 * Los tres niveles de la suscripción, con el actual marcado. Tocar otro sube o
 * baja de nivel al instante; cancelar del todo vive en el portal de gestión.
 */
function Niveles() {
  const t = useT()
  const nivelActual = useSesion((s) => s.nivel)
  const plan = useSesion((s) => s.plan)
  const { niveles, estado, reintentar } = useNiveles()
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Nunca en blanco: sin la lista no hay por dónde comprar, y una oferta que
  // desaparece sin decir nada es motivo de rechazo (2.1).
  if (estado === 'cargando') return <p className="text-[11px] text-white/45">{t('cuenta.cargando', 'Cargando…')}</p>
  if (estado === 'fallo') return <NivelesSinTienda onReintentar={reintentar} />

  // Sin comparar con el nivel actual: el botón del nivel vigente ya va deshabilitado.
  const alCambiar = async (oferta: OfertaPro) => {
    if (ocupado) return
    setOcupado(true)
    setError(null)
    try {
      const ok = await cambiarNivel(oferta)
      // Cobrado y el perfil aún no lo dice: se avisa como espera, no como fallo.
      // Antes el booleano se tiraba y una compra cobrada no enseñaba nada.
      if (!ok) setError(t('cuenta.pago.pendiente', 'Pago recibido: tu plan aparecerá aquí en unos segundos.'))
    } catch (e) {
      if (e instanceof CompraCancelada) return
      setError(`${textoDeFallo(e, t)}\n${detalleDeFallo(e)}`)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="space-y-1">
      {/* «Tu nivel» solo tiene sentido para quien ya tiene uno. A quien todavía
          no se ha suscrito la lista le sirve de escaparate, así que la encabeza
          la invitación. Se reutiliza `cuenta.pago.comprar`, que ya venía
          traducida a los dieciséis idiomas, en vez de estrenar una clave. */}
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
        {plan === 'pro'
          ? t('cuenta.nivel.titulo', 'Tu nivel')
          : t('cuenta.pago.comprar', 'Hazte Pro')}
      </p>
      {niveles.map((n) => {
        // Solo hay «nivel actual» si de verdad hay SUSCRIPCIÓN. El trial deja
        // `nivel = 1` en el perfil sin que nadie se haya suscrito, y comparar a
        // secas marcaba el ×1 como «Actual» y lo DESHABILITABA.
        const actual = plan === 'pro' && n.nivel === nivelActual
        return (
          <button
            key={n.id}
            type="button"
            onClick={() => void alCambiar(n)}
            disabled={ocupado || actual}
            className={`flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-[11px] font-semibold transition disabled:opacity-100 ${
              actual
                ? 'border-accent/40 bg-accent/10 text-white/80'
                : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-50'
            }`}
          >
            <span className="flex-1 text-left">
              {t('cuenta.nivel.nGb', 'Nivel ×{n} — {c} créditos y {g} GB de nube al mes', {
                n: n.nivel,
                c: n.creditos,
                g: GB_POR_NIVEL[n.nivel] ?? GB_POR_NIVEL[1],
              })}
            </span>
            <span className="shrink-0 tabular-nums text-white/45">
              {t('cuenta.precio.mes', '{p} / mes', { p: n.precio })}
            </span>
            {actual && (
              <span className="shrink-0 text-[10px] font-bold text-accent/90">
                {t('cuenta.nivel.actual', 'Actual')}
              </span>
            )}
          </button>
        )
      })}
      <p className="text-[10px] leading-snug text-white/35">
        {/* En iOS manda Apple: la subida es inmediata (y ELLA prorratea) y la
            bajada espera a la siguiente renovación; decir «a prorrata» a secas
            describiría mal su caja. */}
        {nombrePlataforma() === 'ios'
          ? t(
              'cuenta.nivel.notaApple',
              'Puedes subir o bajar de nivel cuando quieras. Al subir, el cambio es inmediato y Apple descuenta lo que no usaste del nivel anterior; al bajar, el nuevo nivel empieza en la siguiente renovación.',
            )
          : t(
              'cuenta.nivel.nota',
              'Puedes subir o bajar de nivel cuando quieras; el cambio se cobra a prorrata.',
            )}
      </p>
      <EnlaceCreditos />
      {error && <p className="whitespace-pre-line text-[11px] leading-snug text-red-400/90">{error}</p>}
    </div>
  )
}

type EstadoNiveles = 'cargando' | 'listo' | 'fallo'

/**
 * Los niveles de la tienda con su estado. Una tienda que falla o devuelve la
 * lista vacía (StoreKit lo hace a ratos, sobre todo en el sandbox de App
 * Review) cuenta como «fallo»: quien lo pinta lo dice y ofrece reintentar, en
 * vez de dejar la oferta en blanco. Con `activo` en falso no pide nada, y al
 * volver a verdadero (el aviso que se reabre) empieza de cero.
 */
export function useNiveles(activo = true): { niveles: OfertaPro[]; estado: EstadoNiveles; reintentar: () => void } {
  const [resultado, setResultado] = useState<OfertaPro[] | 'fallo' | null>(null)
  const [intento, setIntento] = useState(0)
  // Ajuste durante el render (no en un efecto): al reactivarse se olvida lo de la vez anterior.
  const [activoAntes, setActivoAntes] = useState(activo)
  if (activo !== activoAntes) {
    setActivoAntes(activo)
    if (activo) setResultado(null)
  }

  useEffect(() => {
    if (!activo) return
    let vivo = true
    obtenerNiveles()
      .then((n) => {
        if (vivo) setResultado(n.length ? n : 'fallo')
      })
      .catch(() => {
        if (vivo) setResultado('fallo')
      })
    return () => {
      vivo = false
    }
  }, [activo, intento])

  const reintentar = () => {
    setResultado(null)
    setIntento((i) => i + 1)
  }
  if (resultado === null) return { niveles: [], estado: 'cargando', reintentar }
  if (resultado === 'fallo') return { niveles: [], estado: 'fallo', reintentar }
  return { niveles: resultado, estado: 'listo', reintentar }
}

/** La tienda no dio los planes: mensaje neutro y «Reintentar», nunca un hueco. */
export function NivelesSinTienda({ onReintentar }: { onReintentar: () => void }) {
  const t = useT()
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] leading-snug text-white/50">
        {t('cuenta.niveles.sinTienda', 'No pudimos cargar los planes de la tienda.')}
      </p>
      <button
        type="button"
        onClick={onReintentar}
        className="block w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-center text-[11px] font-semibold text-white/70 transition hover:bg-white/10"
      >
        {t('ui.reintentar', 'Reintentar')}
      </button>
    </div>
  )
}

/**
 * Lleva a Configuraciones › «IA: activar y precios» y baja hasta la tabla de lo
 * que cuesta cada cosa (el editor y el grupo tardan en montarse: se reintenta).
 */
export function irAPreciosIA() {
  navegarDestino({ tipo: 'editor', tab: 'config', grupo: 'ia' })
  let intentos = 0
  const bajar = () => {
    const tabla = document.querySelector('[data-tut="ia.tabla"]')
    if (tabla) tabla.scrollIntoView({ behavior: 'smooth', block: 'start' })
    else if (++intentos < 20) window.setTimeout(bajar, 150)
  }
  window.setTimeout(bajar, 150)
}

/** «¿Qué puedes hacer con los créditos?» */
function EnlaceCreditos() {
  const t = useT()
  return (
    <button
      type="button"
      onClick={irAPreciosIA}
      className="w-full px-2 py-0.5 text-center text-[11px] font-semibold text-accent/90 underline-offset-2 transition hover:underline"
    >
      {t('plan.creditosQueHacer', '¿Qué puedes hacer con los créditos?')}
    </button>
  )
}

/**
 * Canje discreto de cupones (testers y accesos regalados): dan un periodo de
 * prueba (plan `trial`). Exige sesión: la Edge Function `canjear-cupon` valida
 * el JWT.
 *
 * NO puede vivir en las apps de TIENDA: conceder funciones a cambio de un
 * código es, en palabras de Apple, «unlock or enable additional functionality
 * with mechanisms other than In-App Purchase» (rechazo de la 1.0, 13-sep-2026,
 * 3.1.1), y la misma regla rige en Google Play Payments.
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
      <button type="button" onClick={() => setAbierto(true)} className="flex w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] font-semibold text-white/60 transition hover:bg-white/10">
        <Icono nombre="regalo" />
        {t('puerta.cupon.tengo', 'Tengo un cupón')}
      </button>
    )
  }

  const alCanjear = async () => {
    if (!codigo.trim() || ocupado) return
    setOcupado(true)
    setError(null)
    const err = await canjearCupon(codigo)
    setOcupado(false)
    if (err) setError(mensajeCuenta(err, t))
  }

  return (
    <div className="space-y-1.5 rounded-md border border-white/10 bg-white/5 p-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
        {t('puerta.cupon.desc', '¿Tienes un código?')}
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

function BarraUso({
  label,
  usadas,
  limite,
  texto,
}: {
  label: string
  usadas: number
  limite: number
  /** Cifra de la derecha ya formateada (la nube va en GB, no en unidades). */
  texto?: string
}) {
  // limite < 0 = cuenta ilimitada: se enseña lo gastado y la barra queda vacía.
  const pct = limite > 0 ? Math.min(100, Math.round((usadas / limite) * 100)) : 0
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="flex-1 truncate text-[11px] text-white/60">{label}</span>
        <span className="text-[10px] tabular-nums text-white/40">
          {texto ?? `${usadas}/${limite < 0 ? '∞' : limite}`}
        </span>
      </div>
      <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="ui-accent-bg h-full rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
