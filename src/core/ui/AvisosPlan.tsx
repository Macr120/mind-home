import { useEffect, useState } from 'react'
import { localeActual, useT } from '../i18n/useT'
import { useAvisoDemo, useAvisoRenovar, useAvisoSesion, useCuotaAgotada } from '../state/avisosPlanStore'
import { canalPago } from '../plataforma'
import {
  CompraCancelada,
  hayPagos,
  cambiarNivel,
  detalleDeFallo,
  textoDeFallo,
  type OfertaPro,
} from '../cuenta/paywall'
import { URL_WEB as urlWeb } from '../cuenta/urlWeb'
import { haySesionProbable, useSesion } from '../cuenta/sesionStore'
import { hayBackend } from '../cuenta/supabase'
import { esDemo, esPro, esProbar, esTrial, fuePro } from '../edicion'
import { elegir } from '../state/confirmarStore'
import { salirDemo } from '../../demo/modo'
import { salirProbar } from '../../probar/modo'
import {
  AvisoRenovacion,
  EnlacesLegales,
  FormularioAcceso,
  NivelesSinTienda,
  irAPreciosIA,
  useNiveles,
} from './editor/EditorCuentaSection'

/**
 * Modales globales del plan:
 * - CuotaAgotada: el aviso «Suscríbete». Lo abre el 429 del proxy,
 *   `chat/ia.ts::exigirTransporte` y cada función de pago (sync, nube,
 *   transporte, Jev, redes) al tocarla sin plan. Caras según el plan — nunca
 *   pagó, Pro sin créditos del mes, o suscripción vencida.
 * - AvisoRenovar: respaldo del 403 'sin-pro' (solo si el SQL viejo sigue vivo).
 *
 * Todos venden dentro de la app, por la caja de la plataforma (`canalPago()`).
 * En las apps de tienda la compra es in-app y NUNCA se pinta un enlace de pago
 * externo: Apple lo prohíbe y es motivo de rechazo.
 */
export function AvisosPlan() {
  return (
    <>
      <AvisoRenovar />
      <CuotaAgotada />
      <AvisoDemo />
      <AvisoSesion />
      <PreguntaBoletin />
    </>
  )
}

/** Una sola vez por arranque: si la cierra sin responder, se le pregunta en la próxima. */
let boletinPreguntado = false

/**
 * Quien se registró con Google/Apple (o antes de que existiera el boletín) no
 * vio la casilla del formulario: se le pregunta una vez, ya con la sesión
 * abierta. `boletin === null` = sin respuesta guardada en el servidor.
 */
function PreguntaBoletin() {
  const t = useT()
  const pendiente = useSesion((s) => !!s.usuario && s.boletin === null)
  useEffect(() => {
    if (!pendiente || boletinPreguntado || esDemo() || esProbar()) return
    // Unos segundos de margen: que no salte encima del arranque o del login.
    const id = setTimeout(async () => {
      if (boletinPreguntado) return
      boletinPreguntado = true
      const r = await elegir({
        titulo: t('boletin.titulo', '¿Quieres recibir nuestro correo diario?'),
        mensaje: t(
          'boletin.mensaje',
          'Cada día, un consejo breve de salud mental, además de promociones y noticias importantes de MindHaOS. Puedes darte de baja cuando quieras desde el propio correo o en Cuenta.',
        ),
        opciones: [
          { valor: 'si', texto: t('boletin.si', 'Sí, suscribirme') },
          { valor: 'no', texto: t('boletin.no', 'No, gracias') },
        ],
      })
      if (r) void useSesion.getState().elegirBoletin(r === 'si')
    }, 4000)
    return () => clearTimeout(id)
  }, [pendiente, t])
  return null
}

function Marco({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="ui-panel ui-pop w-full max-w-sm space-y-2 rounded-2xl border border-white/10 p-5 shadow-2xl">
        {children}
      </div>
    </div>
  )
}

function AvisoRenovar() {
  const t = useT()
  const abierto = useAvisoRenovar((s) => s.abierto)
  const cerrar = useAvisoRenovar((s) => s.cerrar)
  if (!abierto) return null

  return (
    <Marco>
      <h2 className="text-sm font-bold text-white/90">
        {t('cuenta.renovar.titulo', 'Tu suscripción terminó')}
      </h2>
      <p className="text-xs leading-snug text-white/60">
        {t(
          'cuenta.renovar.cuerpo',
          'La IA y la sincronización se reactivan al renovar. Tus datos siguen en este dispositivo.',
        )}
      </p>
      <div className="space-y-1.5 pt-1">
        {/* En la tienda no se enlaza fuera: allí se renueva desde el modal de
            cuota o desde Editor › Cuenta, con compra in-app. */}
        {canalPago() !== 'iap' && urlWeb && (
          <a
            href={`${urlWeb}/cuenta#planes`}
            target="_blank"
            rel="noreferrer"
            className="ui-accent-bg block w-full rounded-md px-2 py-1.5 text-center text-xs font-bold"
          >
            {t('cuenta.renovar.cta', 'Renovar suscripción')}
          </a>
        )}
        <button
          type="button"
          onClick={cerrar}
          className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] font-semibold text-white/60 transition hover:bg-white/10"
        >
          {t('comun.entendido', 'Entendido')}
        </button>
      </div>
    </Marco>
  )
}

/**
 * El trato de la casa demo, una sola vez por carga: lo abre el marcador
 * (`data/demoGuard.ts`) en el primer cambio que hace el visitante. No bloquea
 * nada — el cambio ya se aplicó; solo explica que no sobrevive a la recarga.
 */
function AvisoDemo() {
  const t = useT()
  const abierto = useAvisoDemo((s) => s.abierto)
  const cerrar = useAvisoDemo((s) => s.cerrar)
  if (!abierto) return null

  return (
    <Marco>
      <h2 className="text-sm font-bold text-white/90">
        {t('demo.aviso.titulo', 'Estás en la MindHaOS demo')}
      </h2>
      <p className="text-xs leading-snug text-white/60">
        {t(
          'demo.aviso.cuerpo',
          'Pruébalo todo: puedes editar la MindHaOS (Casa Mental OS) y usar las apps con el año de vida de Pep@ dentro. Nada se guarda — al recargar, la MindHaOS vuelve a como estaba.',
        )}
      </p>
      <div className="space-y-1.5 pt-1">
        <button
          type="button"
          onClick={cerrar}
          className="ui-accent-bg block w-full rounded-md px-2 py-1.5 text-center text-xs font-bold"
        >
          {t('demo.aviso.seguir', 'Seguir explorando')}
        </button>
        <button
          type="button"
          onClick={() => salirDemo()}
          className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] font-semibold text-white/60 transition hover:bg-white/10"
        >
          {t('demo.salir', 'Salir de la demo')}
        </button>
      </div>
    </Marco>
  )
}

/**
 * El trato del modo probar, una sola vez por carga: lo abre el marcador
 * (`data/probarGuard.ts`) en la primera edición del visitante. No bloquea nada
 * — el cambio ya se aplicó en la casa de prueba; solo explica que para que sus
 * cambios se guarden de verdad (y para la IA y la sync) hace falta una cuenta.
 */
function AvisoSesion() {
  const t = useT()
  const abierto = useAvisoSesion((s) => s.abierto)
  const cerrar = useAvisoSesion((s) => s.cerrar)
  if (!abierto) return null

  return (
    <Marco>
      <h2 className="text-sm font-bold text-white/90">
        {t('probar.aviso.titulo', 'Inicia sesión para que se guarden tus cambios')}
      </h2>
      <p className="text-xs leading-snug text-white/60">
        {t(
          'probar.aviso.cuerpo',
          'Estás probando la app sin cuenta: puedes editarlo todo, pero nada cuenta como guardado. Con tu cuenta, tus cambios se guardan y podrás usar la IA y la sincronización — lo que hiciste en la prueba se recupera.',
        )}
      </p>
      <div className="space-y-1.5 pt-1">
        <button
          type="button"
          onClick={() => salirProbar()}
          className="ui-accent-bg block w-full rounded-md px-2 py-1.5 text-center text-xs font-bold"
        >
          {t('probar.aviso.crear', 'Crear mi cuenta o iniciar sesión')}
        </button>
        <button
          type="button"
          onClick={cerrar}
          className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] font-semibold text-white/60 transition hover:bg-white/10"
        >
          {t('probar.aviso.seguir', 'Seguir probando')}
        </button>
      </div>
    </Marco>
  )
}

function CuotaAgotada() {
  const t = useT()
  const abierto = useCuotaAgotada((s) => s.abierto)
  const motivo = useCuotaAgotada((s) => s.motivo)
  const cerrar = useCuotaAgotada((s) => s.cerrar)
  const usuario = useSesion((s) => s.usuario)
  const planCrudo = useSesion((s) => s.plan)
  const nivelActual = useSesion((s) => s.nivel)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Se compra dentro de la app en todas partes menos en el escritorio, donde
  // el checkout se abre en el navegador. Exige sesión: la compra se ata a la
  // cuenta, que es lo que la lleva a los demás dispositivos.
  const canal = canalPago()
  const compraEmbebida = !!usuario && canal !== 'escritorio' && hayPagos()
  // El enlace a la web es el plan B del escritorio (y de un build sin claves);
  // en la tienda no se pinta jamás.
  const enlaceWeb = canal !== 'iap' && !compraEmbebida && !!urlWeb

  // Si la tienda falla o no devuelve nada, el aviso lo dice y ofrece
  // reintentar: un «Suscríbete» sin botones de compra no se enseña nunca.
  const { niveles, estado: estadoNiveles, reintentar } = useNiveles(abierto && compraEmbebida)

  if (!abierto) return null

  const pro = esPro() || esTrial()
  const vencida = !pro && fuePro()
  // El trial (cupón, o el mes que traía la casa cuando se vendía) terminó: el
  // plan sigue en 'trial' pero ya expiró.
  const trialVencido = !pro && !vencida && planCrudo === 'trial'
  // La cuota mensual se renueva el día 1 del mes siguiente (periodo UTC).
  const ahora = new Date()
  const renueva = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth() + 1, 1))

  // Sin cuenta (modo probar, o una sesión que se cerró): lo que falta primero
  // es registrarse, que es gratis. El formulario va aquí mismo — mandar al
  // usuario a buscarlo por los menús es perder la única vez que le importa.
  // `haySesionProbable()` evita acusar de «no tienes cuenta» a quien la tiene y
  // aún está hidratando.
  if (hayBackend() && !usuario && !haySesionProbable()) {
    return (
      <Marco>
        <h2 className="text-sm font-bold text-white/90">
          {t('plan.suscribete.tituloSinCuenta', 'Crea tu cuenta gratis')}
        </h2>
        <p className="text-xs leading-snug text-white/60">
          {t(
            'plan.suscribete.sinCuenta',
            'Tu casa es gratis con una cuenta. La IA, la sincronización y la nube vienen con la suscripción, y se abonan a tu cuenta.',
          )}
        </p>
        {/* En el modo probar no se inicia sesión DENTRO (quedaría sesión viva
            sobre la BD de prueba, con la sync apagada): se sale a la puerta. */}
        {esProbar() ? (
          <button
            type="button"
            onClick={() => salirProbar()}
            className="ui-accent-bg block w-full rounded-md px-2 py-1.5 text-center text-xs font-bold"
          >
            {t('probar.aviso.crear', 'Crear mi cuenta o iniciar sesión')}
          </button>
        ) : (
          <FormularioAcceso inicial="registrar" />
        )}
        <button
          type="button"
          onClick={cerrar}
          className="w-full px-2 py-0.5 text-[11px] text-white/40 transition hover:text-white/60"
        >
          {t('comun.masTarde', 'Más tarde')}
        </button>
      </Marco>
    )
  }

  // El techo es el bucket de uso REAL del mes: recargar no lo quita, así que
  // tiene su propia cara y no ofrece compras.
  if (motivo === 'techo') {
    return (
      <Marco>
        <h2 className="text-sm font-bold text-white/90">
          {t('cuenta.techo.titulo', 'Alcanzaste el límite de uso del mes')}
        </h2>
        <p className="text-xs leading-snug text-white/60">
          {t(
            'cuenta.techo.cuerpo',
            'Este mes tus peticiones usaron mucho más contexto de lo normal y se llegó al límite de uso justo. Se restablece el {f}.',
            { f: renueva.toLocaleDateString(localeActual()) },
          )}
        </p>
        <div className="space-y-1.5 pt-1">
          <button
            type="button"
            onClick={cerrar}
            className="ui-accent-bg block w-full rounded-md px-2 py-1.5 text-center text-xs font-bold"
          >
            {t('comun.entendido', 'Entendido')}
          </button>
        </div>
      </Marco>
    )
  }

  // Qué intentó usar quien no tiene plan: el título lo nombra.
  const tituloSuscribete: Record<string, string> = {
    sync: t('plan.suscribete.sync', 'Suscríbete para sincronizar tus dispositivos'),
    nube: t('plan.suscribete.nube', 'Suscríbete para guardar tus archivos en la nube'),
    transporte: t('plan.suscribete.transporte', 'Suscríbete para buscar rutas en transporte público'),
    jev: t('plan.suscribete.jev', 'Suscríbete para jugar con la IA'),
    redes: t('plan.suscribete.redes', 'Suscríbete para publicar en tus redes'),
  }

  const titulo = pro
    ? t('cuenta.cuota.titulo', 'Se acabaron tus créditos del mes')
    : vencida
      ? t('cuenta.renovar.titulo', 'Tu suscripción terminó')
      : trialVencido
        ? t('cuenta.cuota.tituloTrial', 'Tu periodo de prueba terminó')
        : (tituloSuscribete[motivo] ?? t('plan.suscribete.ia', 'Suscríbete para usar la IA'))

  const cuerpo = pro
    ? t(
        'cuenta.cuota.cuerpoNivel',
        'Tus créditos se renuevan el {f}. Si se te quedan cortos cada mes, sube de nivel.',
        { f: renueva.toLocaleDateString(localeActual()) },
      )
    : vencida
      ? t(
          'cuenta.cuota.cuerpoVencida',
          'Tus datos siguen en este dispositivo. Renueva para recuperar los créditos del mes y la sincronización.',
        )
      : t(
          'plan.suscribete.cuerpo',
          'Tu casa es gratis. La IA, la sincronización y la nube vienen con la suscripción: elige un nivel.',
        )

  // La tabla de lo que cuesta cada cosa vive en Configuraciones › «IA: activar
  // y precios»; el enlace cierra el aviso y lleva allí.
  const verCreditos = () => {
    cerrar()
    irAPreciosIA()
  }

  // Con Pro solo se ofrecen los niveles por encima del actual: bajar de nivel a
  // mitad de mes con la cuota agotada no arreglaría nada. Sin Pro se ofrecen
  // todos —es la primera suscripción—, y así también se vende en la tienda,
  // donde no hay enlace a la web que ofrecerle.
  const superiores = pro ? niveles.filter((n) => n.nivel > nivelActual) : niveles

  const alSubir = async (oferta: OfertaPro) => {
    if (ocupado) return
    setOcupado(true)
    setError(null)
    try {
      await cambiarNivel(oferta)
      cerrar()
    } catch (e) {
      if (e instanceof CompraCancelada) return
      setError(`${textoDeFallo(e, t)}\n${detalleDeFallo(e)}`)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Marco>
      <h2 className="text-sm font-bold text-white/90">{titulo}</h2>
      <p className="text-xs leading-snug text-white/60">{cuerpo}</p>
      <div className="space-y-1.5 pt-1">
        {compraEmbebida && estadoNiveles === 'cargando' && (
          <p className="text-[11px] text-white/45">{t('cuenta.cargando', 'Cargando…')}</p>
        )}
        {compraEmbebida && estadoNiveles === 'fallo' && <NivelesSinTienda onReintentar={reintentar} />}
        {compraEmbebida &&
          superiores.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => void alSubir(n)}
              disabled={ocupado}
              className="ui-accent-bg w-full rounded-md px-2 py-1.5 text-xs font-bold transition disabled:opacity-50"
            >
              {pro
                ? t('cuenta.nivel.subir', 'Subir a ×{n} — {c} créditos al mes por {p}', {
                    n: n.nivel,
                    c: n.creditos,
                    p: n.precio,
                  })
                : t('cuenta.nivel.contratar', 'Nivel ×{n} — {c} créditos al mes por {p}', {
                    n: n.nivel,
                    c: n.creditos,
                    p: n.precio,
                  })}
            </button>
          ))}
        <button
          type="button"
          onClick={verCreditos}
          className="flex w-full items-center justify-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-accent/90 underline-offset-2 transition hover:underline"
        >
          {t('plan.creditosQueHacer', '¿Qué puedes hacer con los créditos?')}
        </button>
        {/* Guía 3.1.2: donde se vende una suscripción van, en la MISMA
            pantalla, el aviso de renovación automática y Términos/Privacidad. */}
        {compraEmbebida && superiores.length > 0 && (
          <>
            <AvisoRenovacion />
            <EnlacesLegales />
          </>
        )}
        {/* Sin compra embebida (escritorio, sin sesión) el checkout vive en la web. */}
        {enlaceWeb && (
          <a
            href={`${urlWeb}/cuenta#planes`}
            target="_blank"
            rel="noreferrer"
            className="ui-accent-bg block w-full rounded-md px-2 py-1.5 text-center text-xs font-bold"
          >
            {t('cuenta.cuota.web', 'Ver mi suscripción')}
          </a>
        )}
        {/* Al que nunca pagó se le ofrece además el plan: sale más barato por crédito. */}
        {!pro && enlaceWeb && (
          <a
            href={urlWeb}
            target="_blank"
            rel="noreferrer"
            className="block w-full rounded-md border border-white/15 bg-white/10 px-2 py-1.5 text-center text-[11px] font-bold text-white/85 transition hover:bg-white/15"
          >
            {vencida
              ? t('cuenta.renovar.cta', 'Renovar suscripción')
              : t('cuenta.cuota.suscribirse', 'Ver la suscripción')}
          </a>
        )}
        {/* Tienda sin caja configurada (falta la clave de RevenueCat en el
            build): no hay nada que ofrecer y tampoco se enlaza fuera. */}
        {canal === 'iap' && !compraEmbebida && (
          <p className="text-[11px] leading-snug text-white/45">
            {/* Sin usuario aquí es la sesión que aún se hidrata: al llegar,
                la compra embebida se enciende y carga los niveles. */}
            {usuario
              ? t('cuenta.cuota.nativo', 'Los créditos se gestionan desde tu cuenta.')
              : t('cuenta.cargando', 'Cargando…')}
          </p>
        )}
        {error && <p className="whitespace-pre-line text-[11px] leading-snug text-red-400/90">{error}</p>}
        <button
          type="button"
          onClick={cerrar}
          className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] font-semibold text-white/60 transition hover:bg-white/10"
        >
          {t('comun.entendido', 'Entendido')}
        </button>
      </div>
    </Marco>
  )
}
