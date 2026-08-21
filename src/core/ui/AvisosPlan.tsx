import { useEffect, useState } from 'react'
import { useT } from '../i18n/useT'
import { useAvisoDemo, useAvisoRenovar, useCuotaAgotada } from '../state/avisosPlanStore'
import { canalPago } from '../plataforma'
import {
  hayPagos,
  obtenerNiveles,
  obtenerCreditos,
  cambiarNivel,
  comprarCreditos,
  type OfertaPro,
} from '../cuenta/paywall'
import { URL_WEB as urlWeb } from '../cuenta/urlWeb'
import { haySesionProbable, useSesion } from '../cuenta/sesionStore'
import { hayBackend } from '../cuenta/supabase'
import { esPro, esTrial, fuePro } from '../edicion'
import { salirDemo } from '../../demo/modo'
import { FormularioAcceso } from './editor/EditorCuentaSection'

/**
 * Modales globales del plan:
 * - CuotaAgotada: no hay créditos para la llamada. Lo abre el 429 del proxy y
 *   también `chat/ia.ts::exigirTransporte` cuando ni siquiera hay con qué
 *   salir. Tiene tres caras según el plan — nunca pagó, Pro sin créditos del
 *   mes, o suscripción vencida.
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
    </>
  )
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
            href={`${urlWeb}/cuenta`}
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
        {t('demo.aviso.titulo', 'Estás en la casa demo')}
      </h2>
      <p className="text-xs leading-snug text-white/60">
        {t(
          'demo.aviso.cuerpo',
          'Pruébalo todo: puedes editar la casa y usar las apps con el año de vida de Pep@ dentro. Nada se guarda — al recargar, la casa vuelve a como estaba.',
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

function CuotaAgotada() {
  const t = useT()
  const abierto = useCuotaAgotada((s) => s.abierto)
  const motivo = useCuotaAgotada((s) => s.motivo)
  const cerrar = useCuotaAgotada((s) => s.cerrar)
  const usuario = useSesion((s) => s.usuario)
  const planCrudo = useSesion((s) => s.plan)
  const nivelActual = useSesion((s) => s.nivel)
  const [niveles, setNiveles] = useState<OfertaPro[]>([])
  const [creditos, setCreditos] = useState<OfertaPro | null>(null)
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

  useEffect(() => {
    if (!abierto || !compraEmbebida) return
    let vivo = true
    obtenerNiveles()
      .then((n) => {
        if (vivo) setNiveles(n)
      })
      .catch(() => {})
    obtenerCreditos()
      .then((c) => {
        if (vivo) setCreditos(c)
      })
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [abierto, compraEmbebida])

  if (!abierto) return null

  const pro = esPro() || esTrial()
  const vencida = !pro && fuePro()
  // El mes incluido del unlock terminó (plan sigue en 'trial' pero ya expiró).
  const trialVencido = !pro && !vencida && planCrudo === 'trial'
  // La cuota mensual se renueva el día 1 del mes siguiente (periodo UTC).
  const ahora = new Date()
  const renueva = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth() + 1, 1))

  // Sin cuenta (el «ahora no» de la puerta, o una instalación con derechos
  // adquiridos): lo que falta no es pagar, es registrarse. El primer mes viene
  // con la compra y espera a que haya un correo al que abonárselo, así que el
  // formulario va aquí mismo — mandar al usuario a buscarlo por los menús es
  // perder la única vez que le importan los créditos. `haySesionProbable()`
  // evita acusar de «no tienes cuenta» a quien la tiene y aún está hidratando.
  if (hayBackend() && !usuario && !haySesionProbable()) {
    return (
      <Marco>
        <h2 className="text-sm font-bold text-white/90">
          {t('cuenta.cuota.tituloSinCuenta', 'Inicia sesión para recibir tus créditos')}
        </h2>
        <p className="text-xs leading-snug text-white/60">
          {t(
            'cuenta.cuota.cuerpoSinCuenta',
            'Los créditos del primer mes vienen con tu compra, pero se abonan a una cuenta: sin correo registrado no hay dónde ponerlos.',
          )}
        </p>
        <FormularioAcceso inicial="registrar" />
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
            { f: renueva.toLocaleDateString() },
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

  const titulo = pro
    ? t('cuenta.cuota.titulo', 'Se acabaron tus créditos del mes')
    : vencida
      ? t('cuenta.renovar.titulo', 'Tu suscripción terminó')
      : trialVencido
        ? t('cuenta.cuota.tituloTrial', 'Tu mes incluido terminó')
        : t('cuenta.cuota.tituloSin', 'Necesitas créditos para usar la IA')

  const cuerpo = pro
    ? t(
        'cuenta.cuota.cuerpoNivel',
        'Tus créditos se renuevan el {f}. Si se te quedan cortos cada mes, sube de nivel.',
        { f: renueva.toLocaleDateString() },
      )
    : vencida
      ? t(
          'cuenta.cuota.cuerpoVencida',
          'Tus datos siguen en este dispositivo. Renueva para recuperar los créditos del mes y la sincronización.',
        )
      : trialVencido
        ? t(
            'cuenta.cuota.cuerpoTrial',
            'La app y tus datos son tuyos para siempre. Suscríbete a Pro para seguir con los créditos mensuales y la sincronización.',
          )
        : t(
            'cuenta.cuota.cuerpoLocal',
            'La app y tus datos son tuyos sin pagar nada. Solo la IA se cobra: suscríbete y recibe créditos cada mes.',
          )

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
      await cambiarNivel(oferta.paquete, oferta.nivel)
      cerrar()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setOcupado(false)
    }
  }

  // Recargar sí arregla la cuota agotada (los créditos comprados se gastan
  // cuando el pool mensual ya no alcanza), y es la única salida de quien no
  // quiere una suscripción.
  const alRecargar = async () => {
    if (ocupado || !creditos) return
    setOcupado(true)
    setError(null)
    try {
      await comprarCreditos(creditos.paquete)
      cerrar()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Marco>
      <h2 className="text-sm font-bold text-white/90">{titulo}</h2>
      <p className="text-xs leading-snug text-white/60">{cuerpo}</p>
      <div className="space-y-1.5 pt-1">
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
        {compraEmbebida && creditos && (
          <button
            type="button"
            onClick={() => void alRecargar()}
            disabled={ocupado}
            className="w-full rounded-md border border-white/15 bg-white/10 px-2 py-1.5 text-[11px] font-bold text-white/85 transition hover:bg-white/15 disabled:opacity-50"
          >
            {t('cuenta.creditos.comprar', 'Recargar {c} créditos — {p}', {
              c: creditos.creditos,
              p: creditos.precio,
            })}
          </button>
        )}
        {/* Sin compra embebida (escritorio, sin sesión) el checkout vive en la web. */}
        {enlaceWeb && (
          <a
            href={`${urlWeb}/cuenta`}
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
            {t('cuenta.cuota.nativo', 'Los créditos se gestionan desde tu cuenta.')}
          </p>
        )}
        {error && <p className="text-[11px] leading-snug text-red-400/90">{error}</p>}
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
