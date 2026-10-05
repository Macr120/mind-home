import { useState } from 'react'
import { BotonPrimario, BotonSecundario, Modal } from '../../../rooms/_shared/ui'
import { sonar } from '../../audio/sfx'
import { abrirAppOPlantilla } from '../../abrirApp'
import { useT } from '../../i18n/useT'
import { Icono } from '../../ui/iconos/Icono'
import { Retrato } from '../../buzon/ui/Retrato'
import { mensajeErrorPartida } from '../api'
import { irAlJuego } from '../irAlJuego'
import { JUEGOS_INVITABLES, nombreJuego } from '../juegosInvitables'
import { usePartida } from '../partidaStore'
import { entrarYConectar } from '../sala'
import { entrarAVisita } from '../../visita/visitaStore'
import type { InvitacionRecibida } from '../tipos'

/**
 * «@alias te invita a su casa»: modal GLOBAL, montado UNA vez en `App.tsx` junto
 * a `<EnviarAContacto />`, porque dentro de un cuarto, del editor o de una
 * partida el `ChatBox` no existe y el timbre se perdería.
 */
export function InvitacionModal() {
  const invitacion = usePartida((s) => s.invitacionPendiente)
  const n = usePartida((s) => s.invitacionN)
  if (!invitacion) return null
  // Cada invitación nueva arranca el diálogo limpio: la `key` lo remonta.
  return <Dialogo key={n} invitacion={invitacion} />
}

function Dialogo({ invitacion }: { invitacion: InvitacionRecibida }) {
  const t = useT()
  const cerrar = usePartida((s) => s.cerrarInvitacion)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const quien = invitacion.alias ? `@${invitacion.alias}` : invitacion.nombre || t('partida.alguien', 'Alguien')
  // Juego de mesa: no hay visita, cada quien juega desde su casa.
  const deMesa = invitacion.juegoInvitable
    ? !!JUEGOS_INVITABLES[invitacion.juegoInvitable].mesa
    : !invitacion.casa && invitacion.apps.includes('entretenimiento')
  const titulo = invitacion.juegoInvitable
    ? t('partida.invitacion.jugarJuego', '{n} te invita a jugar {j}', { n: quien, j: nombreJuego(invitacion.juegoInvitable, t) })
    : deMesa
      ? t('partida.invitacion.jugarMesa', '{n} te invita a jugar', { n: quien })
      : t('partida.invitacion.texto', '{n} te invita a su MindHaOS', { n: quien })

  const aceptar = async () => {
    setOcupado(true)
    setError('')
    try {
      const sala = await entrarYConectar(invitacion.partidaId)
      sonar('tick')
      // Se sabe el juego (respaldo del mensaje): la mesa se abre en mi casa y en
      // línea; la cancha y el paintball, en la del anfitrión.
      const j = invitacion.juegoInvitable
      if (j && JUEGOS_INVITABLES[j].mesa) {
        irAlJuego(j, 1, false)
        cerrar()
        return
      }
      if (j && sala.casa) {
        entrarAVisita(sala.partidaId, sala.apps, j)
        return
      }
      // `casa` y `apps` se leen del RESULTADO, no de la invitación: el timbre
      // llegó por broadcast y pudo quedarse viejo (el anfitrión pudo subir el
      // plano o cambiar las apps entre el timbre y el «Aceptar»).
      if (sala.casa) {
        // Recarga contra `mind-home-visita`: la BD propia ni se toca.
        entrarAVisita(sala.partidaId, sala.apps)
        return
      }
      // Sala de mesa (sin casa, con Entretenimiento): se juega desde la casa
      // propia; la pestaña de la mesa enseña «@alias te espera en…».
      if (sala.apps.includes('entretenimiento')) abrirAppOPlantilla('entretenimiento', 'mesa')
      cerrar()
    } catch (e) {
      setError(mensajeErrorPartida(e, t))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Modal titulo={t('partida.invitacion.titulo', 'Invitación')} onCerrar={cerrar}>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Retrato retrato={invitacion.retrato} emoji={invitacion.emoji} className="h-14 w-14" textoClase="text-3xl" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{titulo}</p>
            <p className="text-[11px] text-white/45">
              {deMesa
                ? t('partida.invitacion.desdeTuCasa', 'Desde tu MindHaOS, cada quien en su cuenta')
                : invitacion.juegoInvitable
                  ? t('partida.invitacion.enSuCasa', 'En su MindHaOS')
                  : invitacion.juego === 'visita'
                ? t('partida.invitacion.pasear', 'Para pasear juntos')
                  : t('partida.invitacion.jugar', 'Para jugar')}
            </p>
          </div>
        </div>
        {error && <p className="text-[11px] leading-snug text-red-400/90">{error}</p>}
        <div className="flex justify-end gap-2">
          <BotonSecundario onClick={cerrar} disabled={ocupado}>
            {t('partida.invitacion.rechazar', 'Ahora no')}
          </BotonSecundario>
          <BotonPrimario onClick={() => void aceptar()} disabled={ocupado}>
            <Icono nombre="casa" /> {t('partida.invitacion.aceptar', 'Aceptar')}
          </BotonPrimario>
        </div>
      </div>
    </Modal>
  )
}
