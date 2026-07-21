import { useEffect, useMemo, useState } from 'react'
import { db } from '../data/db'
import { useAjustes, type MoodMusica } from '../state/ajustesStore'
import { useWrappedUi } from '../state/wrappedUiStore'
import { useHouse } from '../state/houseStore'
import { useCuartos } from '../state/cuartosStore'
import { useDiseño } from '../state/disenoStore'
import { useCarrera } from '../state/carreraStore'
import { useJuegoCancha } from '../state/juegoCanchaStore'
import { useTren } from '../state/trenStore'
import { useCuartoPisado } from '../state/useCuartoPisado'
import { desbloquearAudio } from './motor'
import { detenerMusica, iniciarMusica } from './musicaGenerada'
import { detenerPista, iniciarPista, reproducirLista } from './pistas'
import { temaAutoDeCuarto } from './temas'

/**
 * Música ambiental de la casa. Montado UNA vez en App (como useAvisos): suena
 * también dentro de los cuartos. Por la política de autoplay no puede arrancar
 * sola: espera el primer pointerdown de la sesión. Mientras el Wrapped está
 * abierto NO toca el audio (el overlay pone su propia música y, al cerrarse,
 * este efecto re-corre y la ambiental vuelve sola).
 *
 * Con la fuente generada, el mood efectivo tiene prioridades: la música de
 * juego (carrera/cancha/tren/montaña rusa) manda sobre el tema del cuarto
 * (el abierto, o el que pisa el personaje), y este sobre el ambiente global.
 * Con «Mis pistas» o «Sistema» no se interrumpe la música propia del usuario.
 */
export function useMusicaAmbiental(): void {
  const ambiental = useAjustes((s) => s.musicaAmbiental)
  const fuente = useAjustes((s) => s.musicaFuente)
  const mood = useAjustes((s) => s.musicaMood)
  const pistaId = useAjustes((s) => s.musicaPistaId)
  const wrappedAbierto = useWrappedUi((s) => s.abierto)
  const [desbloqueado, setDesbloqueado] = useState(false)

  // ¿Jugando? El tema del juego manda (solo aplica a la música generada).
  const carreraFase = useCarrera((s) => s.fase)
  const canchaJugando = useJuegoCancha((s) => s.fase === 'jugando')
  const trenMontado = useTren((s) => s.montado)
  const trenTipo = useTren((s) => s.tipo)
  const temaJuego: MoodMusica | null =
    carreraFase === 'semaforo' || carreraFase === 'corriendo'
      ? 'carrera'
      : canchaJugando
        ? 'arcade'
        : trenMontado
          ? trenTipo === 'coaster'
            ? 'energia'
            : 'viaje'
          : null

  // Tema del cuarto: el abierto (app) o, paseando, el que pisa el personaje.
  const activeRoom = useHouse((s) => s.activeRoom)
  const objetos = useDiseño((s) => s.objetos)
  const pisado = useCuartoPisado()
  const idCuarto = activeRoom ?? pisado
  const temaGuardado = useCuartos((s) =>
    idCuarto ? s.cuartos.find((c) => c.id === idCuarto)?.temaMusical : undefined,
  )
  const temaCuarto = useMemo(
    () => (idCuarto ? (temaGuardado ?? temaAutoDeCuarto(idCuarto, objetos)) : null),
    [idCuarto, temaGuardado, objetos],
  )

  // Solo la fuente generada cambia de tema; con pistas/sistema queda en null
  // para no reiniciar la música del usuario al pasear entre cuartos.
  const efectivo = fuente === 'generada' ? (temaJuego ?? temaCuarto ?? mood) : null

  // Primer gesto de la sesión → el audio queda 'running' para siempre.
  useEffect(() => {
    const onGesto = () => {
      desbloquearAudio()
      setDesbloqueado(true)
    }
    window.addEventListener('pointerdown', onGesto, { once: true, capture: true })
    return () => window.removeEventListener('pointerdown', onGesto, true)
  }, [])

  useEffect(() => {
    // El Wrapped tomó el control: no detener aquí (su efecto corre antes que este).
    if (wrappedAbierto) return
    if (fuente === 'sistema') {
      // El audio del sistema suena solo (es externo); aquí solo se callan las
      // fuentes propias. Conectarlo/desconectarlo vive en Configuraciones.
      detenerMusica()
      detenerPista()
      return
    }
    if (!ambiental || !desbloqueado) {
      detenerMusica()
      detenerPista()
      return
    }
    let vivo = true
    if (fuente === 'generada') {
      detenerPista()
      if (efectivo == null || efectivo === 'silencio') detenerMusica()
      else iniciarMusica(efectivo)
    } else {
      detenerMusica()
      void db.pistasMusica.toArray().then((pistas) => {
        if (!vivo) return
        const elegida = pistaId != null ? pistas.find((p) => p.id === pistaId) : undefined
        if (elegida) void iniciarPista(elegida, { loop: true })
        else reproducirLista(pistas, true)
      })
    }
    // Cleanup idempotente: en StrictMode el efecto corre doble sin duplicar audio.
    return () => {
      vivo = false
      detenerMusica()
      detenerPista()
    }
  }, [ambiental, desbloqueado, wrappedAbierto, fuente, efectivo, pistaId])
}
