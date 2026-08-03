import { useEffect, useState } from 'react'
import { useT } from '../i18n/useT'
import { useAvisoDemo, useAvisoRenovar, useCuotaAgotada } from '../state/avisosPlanStore'
import { esEscritorio, puedeMostrarPagos } from '../plataforma'
import { hayPagos, obtenerRecargas, comprarRecarga, type OfertaPro } from '../cuenta/paywall'
import { URL_WEB as urlWeb } from '../cuenta/urlWeb'
import { useSesion } from '../cuenta/sesionStore'
import { esPro, fuePro } from '../edicion'
import { salirDemo } from '../../demo/modo'

/**
 * Modales globales del plan:
 * - CuotaAgotada: no hay créditos para la llamada. Lo abre el 429 del proxy y
 *   también `chat/ia.ts::exigirTransporte` cuando ni siquiera hay con qué
 *   salir. Tiene tres caras según el plan — nunca pagó, Pro sin créditos del
 *   mes, o suscripción vencida.
 * - AvisoRenovar: respaldo del 403 'sin-pro' (solo si el SQL viejo sigue vivo).
 * En apps de tienda (Android/iOS) ninguno menciona compras ni enlaza fuera.
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
        {puedeMostrarPagos() && urlWeb && (
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
          'Pruébalo todo: puedes editar la casa y usar las apps con el año de vida de Pep@ dentro. Nada se guarda — al recargar, la casa vuelve a como estaba. Con tu suscripción, la casa es tuya.',
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
        {puedeMostrarPagos() && urlWeb && (
          <a
            href={urlWeb}
            target="_blank"
            rel="noreferrer"
            className="block w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-center text-[11px] font-semibold text-white/60 transition hover:bg-white/10"
          >
            {t('demo.aviso.cta', 'Quiero mi propia casa')}
          </a>
        )}
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
  const cerrar = useCuotaAgotada((s) => s.cerrar)
  const usuario = useSesion((s) => s.usuario)
  const [recargas, setRecargas] = useState<OfertaPro[]>([])
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // La recarga se compra dentro de la app SOLO en web y con sesión: en Electron
  // el checkout va al navegador (enlace) y en tiendas ni se ofrece.
  const compraEmbebida = !!usuario && puedeMostrarPagos() && !esEscritorio() && hayPagos()

  useEffect(() => {
    if (!abierto || !compraEmbebida) return
    let vivo = true
    obtenerRecargas()
      .then((r) => {
        if (vivo) setRecargas(r)
      })
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [abierto, compraEmbebida])

  if (!abierto) return null

  const pro = esPro()
  const vencida = !pro && fuePro()
  // La cuota mensual se renueva el día 1 del mes siguiente (periodo UTC).
  const ahora = new Date()
  const renueva = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth() + 1, 1))

  const titulo = pro
    ? t('cuenta.cuota.titulo', 'Se acabaron tus créditos del mes')
    : vencida
      ? t('cuenta.renovar.titulo', 'Tu suscripción terminó')
      : t('cuenta.cuota.tituloSin', 'Necesitas créditos para usar la IA')

  const cuerpo = pro
    ? t('cuenta.cuota.cuerpo', 'Tus créditos se renuevan el {f}.', { f: renueva.toLocaleDateString() })
    : vencida
      ? t(
          'cuenta.cuota.cuerpoVencida',
          'Tus datos siguen en este dispositivo. Renueva para recuperar los créditos del mes y la sincronización, o recarga créditos sueltos.',
        )
      : t(
          'cuenta.cuota.cuerpoLocal',
          'La app y tus datos son tuyos sin pagar nada. Solo la IA se cobra: recarga créditos cuando los necesites, o suscríbete y recíbelos cada mes.',
        )

  const alComprar = async (oferta: OfertaPro) => {
    if (ocupado) return
    setOcupado(true)
    setError(null)
    try {
      await comprarRecarga(oferta.paquete)
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
          recargas.map((r) => (
            <button
              key={r.paquete.identifier}
              type="button"
              onClick={() => void alComprar(r)}
              disabled={ocupado}
              className="ui-accent-bg w-full rounded-md px-2 py-1.5 text-xs font-bold transition disabled:opacity-50"
            >
              {t('cuenta.cuota.recargaN', '+{n} créditos — {p}', { n: r.creditos, p: r.precio })}
            </button>
          ))}
        {/* Sin compra embebida (escritorio, sin sesión) el checkout vive en la web. */}
        {puedeMostrarPagos() && !compraEmbebida && urlWeb && (
          <a
            href={`${urlWeb}/cuenta`}
            target="_blank"
            rel="noreferrer"
            className="ui-accent-bg block w-full rounded-md px-2 py-1.5 text-center text-xs font-bold"
          >
            {t('cuenta.cuota.web', 'Comprar créditos en mi cuenta')}
          </a>
        )}
        {/* Al que nunca pagó se le ofrece además el plan: sale más barato por crédito. */}
        {!pro && puedeMostrarPagos() && urlWeb && (
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
        {/* En tiendas no se menciona ni precio ni enlace: modelo solo-consumo. */}
        {!puedeMostrarPagos() && (
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
