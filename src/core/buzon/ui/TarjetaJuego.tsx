import { useState } from 'react'
import { sonar } from '../../audio/sfx'
import { esVisita, salaVisitada } from '../../edicion'
import { useT } from '../../i18n/useT'
import { mensajeErrorPartida } from '../../partida/api'
import { irAlJuego } from '../../partida/irAlJuego'
import { JUEGOS_INVITABLES, enlaceJuego, leerDatosJuego, nombreJuego } from '../../partida/juegosInvitables'
import { entrarYConectar } from '../../partida/sala'
import { entrarAVisita } from '../../visita/visitaStore'
import { Icono } from '../../ui/iconos/Icono'
import { useContactoDeHilo } from '../cache'
import type { MensajeBuzon } from '../tipos'

/**
 * Burbuja de una solicitud de juego (`contenido.app === 'partida'`): el botón
 * que lleva DIRECTO al juego en casa de quien invita. Es un `<a>` de verdad
 * —con el enlace web que también viaja en el texto— para poder abrirlo en otra
 * pestaña, pero el clic normal lo atiende la app sin recargar cuando puede.
 *
 * Calca el camino del `InvitacionModal`: `entrarYConectar` y, si la sala trae
 * casa, `entrarAVisita` (que recarga contra `mind-home-visita`).
 */
export function TarjetaJuego({ m }: { m: MensajeBuzon }) {
  const t = useT()
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const contacto = useContactoDeHilo(m.hiloId)
  const c = m.contenido
  const datos = leerDatosJuego(c?.datos)
  if (!c) return null

  const nombre = datos ? nombreJuego(datos.juego, t) : c.nombre
  const emoji = datos ? JUEGOS_INVITABLES[datos.juego].emoji : (c.emoji ?? '🎮')

  const unirse = async () => {
    if (!datos) return
    setOcupado(true)
    setError('')
    try {
      // Ya estoy dentro de esa casa: nada de recargar, solo caminar al juego.
      if (esVisita() && salaVisitada() === datos.partidaId) {
        // Solo falla si el invitado anda por un piso alto o con el editor abierto.
        if (!irAlJuego(datos.juego, 1, false)) {
          setError(t('partida.jugar.bajar', 'Baja a la planta baja y ve a la cancha.'))
        }
        return
      }
      const sala = await entrarYConectar(datos.partidaId)
      sonar('tick')
      if (sala.casa) entrarAVisita(sala.partidaId, sala.apps, datos.juego)
      // Sin plano no hay casa a la que ir. La mesa en línea no la necesita (se
      // juega por la sala desde cualquier casa); la cancha y el paintball, sí.
      else if (JUEGOS_INVITABLES[datos.juego].mesa) irAlJuego(datos.juego, 1, false)
      else setError(t('partida.jugar.sinCasa', '@{a} aún no abrió su casa: pídele que te invite otra vez', { a: contacto?.alias ?? '' }))
    } catch (e) {
      console.error('[partida] unirse', e)
      setError(mensajeErrorPartida(e, t))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="mb-1 w-60 max-w-full rounded-xl border border-white/10 bg-black/20 p-2">
      <div className="flex items-center gap-2">
        <span className="text-xl">
          <Icono emoji={emoji} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{nombre}</p>
          <p className="truncate text-[10px] text-white/45">
            {m.mio
              ? t('partida.jugar.tarjeta.enviada', 'Invitación enviada')
              : contacto
                ? t('partida.jugar.tarjeta.de', 'Invitación para jugar en la MindHaOS de @{a}', { a: contacto.alias })
                : t('partida.jugar.tarjeta.recibida', 'Invitación para jugar')}
          </p>
        </div>
      </div>
      {datos && (
        <div className="mt-1.5">
          {m.mio ? (
            <button
              type="button"
              onClick={() => irAlJuego(datos.juego, -1, true)}
              className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-black/20 px-2.5 py-1 text-[11px] text-white/70 transition hover:border-accent/50 hover:text-white"
            >
              <Icono nombre="navegar" /> {t('partida.jugar.tarjeta.ir', 'Ir al juego')}
            </button>
          ) : (
            <a
              href={enlaceJuego(datos.partidaId, datos.juego, datos.apps)}
              onClick={(e) => {
                e.preventDefault()
                if (!ocupado) void unirse()
              }}
              aria-disabled={ocupado}
              className={`inline-block rounded-lg bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-ink transition hover:brightness-110 ${
                ocupado ? 'pointer-events-none opacity-50' : ''
              }`}
            >
              {t('partida.jugar.tarjeta.jugar', 'Jugar {j}', { j: nombre })}
            </a>
          )}
          {error && <p className="mt-1 text-[10px] text-red-400">{error}</p>}
          {!m.mio && (
            <p className="mt-1 text-[10px] text-white/40">
              {t('partida.jugar.tarjeta.pista', 'Para invitar tú, escribe «jugar» y el nombre del juego en este chat')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
