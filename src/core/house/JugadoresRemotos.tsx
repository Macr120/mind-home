import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { JugadorRemoto3D } from './JugadorRemoto3D'
import { aAvatar } from '../partida/aspecto'
import { alRecibir, conectarPartidaLocal, entrarYConectar, soyArbitro } from '../partida/sala'
import { hayPartida, usePartida } from '../partida/partidaStore'
import { partidaLocal } from '../partida/transporte'
import { ErrorPartida } from '../partida/tipos'
import { alInterpolar, muestraRemoto } from '../state/remotosFrame'
import { esVisita, salaVisitada } from '../edicion'
import { abandonarVisita } from '../visita/visitaStore'

/**
 * Entra a la sala de la casa que se está visitando. Solo se abandona la visita
 * con un fallo DEFINITIVO (sala cerrada, expulsado, ya no invitado): un corte de
 * red pasajero no puede echar de la casa a quien ya está dentro.
 */
async function reconectarVisita(salaId: string): Promise<void> {
  try {
    await entrarYConectar(salaId)
  } catch (e) {
    const codigo = e instanceof ErrorPartida ? e.codigo : 'red'
    if (codigo === 'no-encontrado' || codigo === 'expulsado' || codigo === 'no-invitado') abandonarVisita('sala')
    else console.warn('[MPH] No se pudo reconectar a la sala de la visita:', e)
  }
}

/**
 * Los cuerpos de los demás jugadores y el interpolador que los mueve. Sin sala
 * no monta nada, así que fuera de partida cuesta un `useFrame` vacío.
 */
export function JugadoresRemotos() {
  const sala = usePartida((s) => s.sala)
  const bots = usePartida((s) => s.cuerposBot)

  // Prioridad negativa: los cuerpos se colocan DESPUÉS de interpolar, o irían
  // un frame por detrás. Negativa (no positiva) para no desactivar el render
  // automático del Canvas.
  useFrame(() => alInterpolar(), -1)

  useEffect(() => {
    if (hayPartida()) return
    const codigo = partidaLocal()
    if (codigo) {
      // Sala LOCAL de pruebas. El anfitrión publica su plano nada más conectar:
      // sin servidor no hay invitación que lo dispare.
      void conectarPartidaLocal(codigo).then(() => {
        if (!esVisita() && soyArbitro()) void import('../visita/anfitrion').then((m) => m.publicarPlanoLocal(codigo))
      })
      return
    }
    // La pestaña recargó dentro de la visita: la sala sigue abierta en el
    // servidor y `partida_entrar` devuelve la MISMA ranura.
    const salaId = esVisita() ? salaVisitada() : null
    if (salaId) void reconectarVisita(salaId)
  }, [])

  useEffect(() => {
    const fueraS = alRecibir('s', (p) => {
      for (const pose of p.p) {
        // El `s` del anfitrión trae también MI pose reemitida: esa se ignora.
        // Cada cuerpo puede traer su propio `t` (la pose de un invitado llegó
        // al anfitrión hasta un periodo antes que la suya).
        if (pose.j !== usePartida.getState().sala?.miRanura) muestraRemoto(pose.j, pose, pose.t ?? p.t)
      }
    })
    const fueraI = alRecibir('i', (p, de) => muestraRemoto(de, p.p, p.t))
    return () => {
      fueraS()
      fueraI()
    }
  }, [])

  const cuerpos = useMemo(() => {
    const jugadores = (sala?.jugadores ?? [])
      .filter((j) => j.ranura !== sala?.miRanura)
      .map((j) => ({
        id: j.ranura as string,
        av: aAvatar(j.aspecto),
        etiqueta: j.alias || j.nombre || j.ranura,
        retrato: j.retrato as string | null,
      }))
    // Los bots del anfitrión son cuerpos del mundo: él los mueve y los pinta con
    // su propio componente, así que solo los monta quien NO los tiene.
    if (sala?.soyAnfitrion) return jugadores
    return [
      ...jugadores,
      ...bots.map((b) => ({ id: b.j as string, av: aAvatar(b.av), etiqueta: b.al, retrato: null })),
    ]
  }, [sala, bots])

  if (!sala) return null
  return (
    <>
      {cuerpos.map((c) => (
        <JugadorRemoto3D
          key={c.id}
          id={c.id}
          av={c.av}
          etiqueta={c.etiqueta}
          retrato={c.retrato}
          conMarcadora={sala.juego === 'paintball'}
        />
      ))}
    </>
  )
}
