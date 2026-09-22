import { useEffect, useState } from 'react'
import { useT } from '../../i18n/useT'
import { escriturasDescartadas } from '../../data/visitaGuard'
import { esVisita } from '../../edicion'
import { usePartida } from '../partidaStore'
import { invalidos } from '../protocolo'
import { jitterP95, retraso, rtt } from '../reloj'
import { perdidos } from '../sala'
import { fijarPerfilRed, PERFIL_POR_DEFECTO, perdidosSimulados, perfilRed } from '../transporteLocal'
import type { PerfilRed } from '../transporte'

const PERFILES: { id: string; etiqueta: string; perfil: PerfilRed }[] = [
  { id: 'ideal', etiqueta: 'Ideal (0/0/0 %)', perfil: { lag: 0, jitter: 0, perdida: 0 } },
  { id: 'normal', etiqueta: 'Normal (120/40/3 %)', perfil: PERFIL_POR_DEFECTO },
  { id: 'malo', etiqueta: 'Malo (250/80/8 %)', perfil: { lag: 250, jitter: 80, perdida: 0.08 } },
]

/**
 * Consola de red de la partida. Solo en desarrollo: es el instrumento con el
 * que se verifica cada fase contra la red simulada (nunca en LAN a 0 ms).
 */
export function HudRedDev() {
  const t = useT()
  const sala = usePartida((s) => s.sala)
  const [medidas, setMedidas] = useState({ rtt: 0, retraso: 0, jitter: 0, huecos: 0, tirados: 0, malos: 0, descartadas: 0 })
  const [perfil, setPerfil] = useState(
    () => PERFILES.find((p) => p.perfil.lag === perfilRed().lag)?.id ?? 'normal',
  )

  useEffect(() => {
    const id = setInterval(
      () =>
        setMedidas({
          rtt: Math.round(rtt()),
          retraso: Math.round(retraso()),
          jitter: Math.round(jitterP95()),
          huecos: perdidos(),
          tirados: perdidosSimulados(),
          malos: invalidos(),
          descartadas: escriturasDescartadas(),
        }),
      500,
    )
    return () => clearInterval(id)
  }, [])

  if (!import.meta.env.DEV || !sala) return null

  return (
    <div className="ui-panel-glass pointer-events-auto fixed bottom-2 left-2 z-40 rounded-xl border border-white/10 px-3 py-2 text-[11px] leading-tight shadow-lg">
      <div className="mb-1 font-semibold">
        {t('partida.dev.titulo', 'Red de la partida')} · {sala.miRanura} ·{' '}
        {sala.soyAnfitrion ? t('partida.dev.anfitrion', 'anfitrión') : t('partida.dev.invitado', 'invitado')}
      </div>
      <div className="grid grid-cols-2 gap-x-3">
        <span>{t('partida.dev.rtt', 'RTT')}</span>
        <span>{medidas.rtt} ms</span>
        <span>{t('partida.dev.retraso', 'Retraso')}</span>
        <span>{medidas.retraso} ms</span>
        <span>{t('partida.dev.jitter', 'Jitter p95')}</span>
        <span>{medidas.jitter} ms</span>
        <span>{t('partida.dev.perdidos', 'Perdidos')}</span>
        <span>{medidas.huecos}</span>
        <span>{t('partida.dev.tirados', 'Tirados por la red')}</span>
        <span>{medidas.tirados}</span>
        <span>{t('partida.dev.invalidos', 'Inválidos')}</span>
        <span>{medidas.malos}</span>
        {/* Solo en visita: lo que el guard tira por ser casa de otro. */}
        {esVisita() && (
          <>
            <span>{t('partida.dev.descartadas', 'Escrituras tiradas')}</span>
            <span>{medidas.descartadas}</span>
          </>
        )}
      </div>
      <label className="mt-1 flex items-center gap-1">
        <span>{t('partida.dev.perfil', 'Perfil de red')}</span>
        <select
          className="rounded-md border border-white/10 bg-black/40 px-1 py-0.5 text-white/85 focus:outline-none"
          value={perfil}
          onChange={(e) => {
            const elegido = PERFILES.find((p) => p.id === e.target.value)
            if (!elegido) return
            setPerfil(elegido.id)
            fijarPerfilRed(elegido.perfil)
          }}
        >
          {PERFILES.map((p) => (
            <option key={p.id} value={p.id}>
              {t(`partida.dev.perfil.${p.id}`, p.etiqueta)}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
