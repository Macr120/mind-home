import { useEffect, useState } from 'react'
import { BotonSecundario, Modal } from '../../../rooms/_shared/ui'
import { Retrato } from '../../buzon/ui/Retrato'
import { useT } from '../../i18n/useT'
import { confirmar } from '../../state/confirmarStore'
import { Icono } from '../../ui/iconos/Icono'
import { mensajeErrorPartida, reportarJugador } from '../api'
import { lineasDe } from '../charla'
import { pedirReporte } from '../../buzon/reportar'
import { refrescarContactos } from '../../buzon/motor'
import { usePartida } from '../partidaStore'
import { rtt } from '../reloj'
import { desconectarSala, expulsarDeSala } from '../sala'
import { esVisita } from '../../edicion'
import { salirDeVisita } from '../../visita/visitaStore'
import type { JugadorSala } from '../tipos'

/**
 * La sala viva: quién está en cada ranura, quién es el anfitrión y el retraso
 * medido. Expulsar y salir pasan por el servidor y vuelven por el evento
 * `sala`, nunca se deciden aquí. Denunciar está para TODOS (no solo el
 * anfitrión) y sobre cualquier otro jugador: los mismos pasos del buzón
 * (`pedirReporte`), con bloqueo opcional que además lo saca de tus salas.
 */
export function PanelSala({ onCerrar }: { onCerrar: () => void }) {
  const t = useT()
  const sala = usePartida((s) => s.sala)
  const [retraso, setRetraso] = useState(0)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    const id = setInterval(() => setRetraso(Math.round(rtt())), 1000)
    return () => clearInterval(id)
  }, [])

  if (!sala) return null

  const expulsar = async (j: JugadorSala) => {
    const nombre = j.alias ? `@${j.alias}` : j.nombre || j.ranura
    const si = await confirmar({
      titulo: t('partida.sala.expulsar.titulo', 'Sacar de la sala'),
      mensaje: t('partida.sala.expulsar.pregunta', '¿Sacar a {n} de tu MindHaOS?', { n: nombre }),
      textoOk: t('partida.sala.expulsar', 'Expulsar'),
      peligro: true,
    })
    if (!si) return
    try {
      await expulsarDeSala(j.ranura)
    } catch (e) {
      setError(mensajeErrorPartida(e, t))
    }
  }

  const denunciar = async (j: JugadorSala) => {
    const nombre = j.alias ? `@${j.alias}` : j.nombre || j.ranura
    const r = await pedirReporte(nombre, true)
    if (!r) return
    setError('')
    try {
      await reportarJugador(sala.partidaId, j.ranura, r.motivo, r.detalle, r.bloquear, lineasDe(j.ranura))
      if (r.bloquear) void refrescarContactos().catch(() => undefined)
      setAviso(t('buzon.reportar.listo', 'Gracias. Lo revisaremos en menos de 24 horas.'))
    } catch (e) {
      setError(mensajeErrorPartida(e, t))
    }
  }

  const salir = async () => {
    const si = await confirmar({
      titulo: t('partida.sala.salir', 'Salir de la sala'),
      mensaje: sala.soyAnfitrion
        ? t('partida.sala.salir.anfitrion', 'La sala se cerrará para todos.')
        : t('partida.sala.salir.invitado', 'Volverás a tu MindHaOS.'),
      textoOk: t('partida.sala.salir', 'Salir de la sala'),
      peligro: true,
    })
    if (!si) return
    // Dentro de la casa de otro, salir de la sala es VOLVER A CASA: hay que
    // recargar contra la BD propia, no quedarse en `mind-home-visita`.
    if (esVisita()) {
      salirDeVisita()
      return
    }
    desconectarSala('boton')
    onCerrar()
  }

  return (
    <Modal titulo={t('partida.sala.titulo', 'Tu sala')} onCerrar={onCerrar}>
      <div className="space-y-2">
        <div className="space-y-1">
          {sala.jugadores.map((j) => (
            <div key={j.ranura} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5">
              <span className="w-6 shrink-0 text-center text-[10px] font-black tabular-nums text-white/35">{j.ranura}</span>
              <Retrato retrato={j.retrato} emoji={j.emoji} className="h-8 w-8" textoClase="text-lg" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">
                  {j.ranura === sala.miRanura ? t('partida.sala.tu', 'Tú') : j.nombre || (j.alias ? `@${j.alias}` : j.ranura)}
                </span>
                <span className="block truncate text-[10px] text-white/45">
                  {j.anfitrion ? t('partida.sala.anfitrion', 'Anfitrión') : t('partida.sala.invitado', 'Invitado')}
                  {j.estado === 'invitado' ? ` · ${t('partida.sala.esperando', 'sin llegar')}` : ''}
                  {j.estado === 'fuera' ? ` · ${t('partida.sala.fuera', 'se fue')}` : ''}
                </span>
              </span>
              {j.ranura !== sala.miRanura && (
                <button
                  type="button"
                  onClick={() => void denunciar(j)}
                  title={t('partida.sala.denunciar', 'Denunciar')}
                  aria-label={t('partida.sala.denunciar', 'Denunciar')}
                  className="rounded-lg px-2 py-1 text-white/40 transition hover:bg-white/10 hover:text-red-400"
                >
                  <Icono nombre="bandera" />
                </button>
              )}
              {sala.soyAnfitrion && j.ranura !== sala.miRanura && (
                <button
                  type="button"
                  onClick={() => void expulsar(j)}
                  title={t('partida.sala.expulsar', 'Expulsar')}
                  className="rounded-lg px-2 py-1 text-white/40 transition hover:bg-white/10 hover:text-red-400"
                >
                  <Icono nombre="quitar" />
                </button>
              )}
            </div>
          ))}
        </div>
        {error && <p className="text-[11px] leading-snug text-red-400/90">{error}</p>}
        {aviso && !error && <p className="text-[11px] leading-snug text-emerald-300/90">{aviso}</p>}
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] tabular-nums text-white/35">
            {retraso > 0 ? t('partida.sala.rtt', 'Retraso {n} ms', { n: retraso }) : t('partida.sala.anfitriona', 'Tu MindHaOS manda')}
          </p>
          <BotonSecundario pequeno onClick={() => void salir()}>
            {t('partida.sala.salir', 'Salir de la sala')}
          </BotonSecundario>
        </div>
      </div>
    </Modal>
  )
}
