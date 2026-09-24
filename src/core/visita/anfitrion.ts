/**
 * Lado ANFITRIÓN de la visita: abrir la casa a un contacto.
 *
 * El orden importa. El plano se sube ANTES de invitar, así el timbre ya llega
 * con `casa: true` (lo marca `subirPlano`) y el invitado no acepta para
 * quedarse esperando a que aparezca el archivo en el bucket.
 */
import { getPlantilla } from '../appContrato'
import { esVisita } from '../edicion'
import { asignarPlantillaACuarto } from '../gamificacion/plantillaBundle'
import type { TFunc } from '../i18n/useT'
import { enviar } from '../buzon/motor'
import type { Contacto } from '../buzon/tipos'
import { invitar } from '../partida/api'
import { irAlJuego } from '../partida/irAlJuego'
import {
  enlaceJuego,
  JUEGOS_INVITABLES,
  nombreJuego,
  posicionDeJuego,
  type JuegoInvitable,
} from '../partida/juegosInvitables'
import { crearYConectar, salaViva } from '../partida/sala'
import { elegir } from '../state/confirmarStore'
import { useCuartos } from '../state/cuartosStore'
import { esObjetoLibreria, useDiseño } from '../state/disenoStore'
import { guardarPlano } from './almacenPlano'
import { armarPlano } from './plano'
import { appsDeUrl } from './visitaStore'

/** Sala de visita nueva con estas apps abiertas, plano publicado y timbre. */
export async function invitarACasa(contactoId: string, apps: readonly string[]): Promise<void> {
  const sala = await crearYConectar('visita', apps)
  await guardarPlano(sala.partidaId, await armarPlano(apps))
  await invitar(sala.partidaId, contactoId)
}

/**
 * «Invitar a mi MindHaOS» desde la lista de amigos. Reutiliza mi sala si ya la
 * tengo abierta, pero siempre con el plano publicado: sin él, el invitado acepta
 * y se queda en su propia casa sin saber por qué.
 */
export async function invitarAMiCasa(contactoId: string): Promise<void> {
  const viva = salaViva()
  if (!viva?.soyAnfitrion) return invitarACasa(contactoId, [])
  if (!viva.casa) await guardarPlano(viva.partidaId, await armarPlano(viva.apps))
  await invitar(viva.partidaId, contactoId)
}

/**
 * Sin Entretenimiento en la casa, un juego de mesa pregunta cómo seguir: poner
 * un cuarto con la app o jugar en la plantilla (la app sola, sin cuarto).
 * Devuelve false si el usuario cancela.
 */
async function prepararMesa(j: string, t: TFunc): Promise<boolean> {
  const r = await elegir({
    titulo: t('partida.jugar.elegir.titulo', 'No tienes Entretenimiento en tu MindHaOS'),
    mensaje: t('partida.jugar.elegir.mensaje', '¿Cómo quieres jugar {j}?', { j }),
    opciones: [
      { valor: 'cuarto', texto: t('partida.jugar.elegir.cuarto', 'Agregar un cuarto con Entretenimiento') },
      { valor: 'plantilla', texto: t('partida.jugar.elegir.plantilla', 'Jugar en la plantilla, sin cuarto') },
    ],
  })
  if (r === null) return false
  if (r === 'cuarto') {
    const cuartoId = await useCuartos.getState().crear({ categoria: getPlantilla('entretenimiento')?.categoria })
    await asignarPlantillaACuarto(cuartoId, 'entretenimiento')
  }
  return true
}

/**
 * Modo LOCAL de pruebas (`?partidaLocal=<codigo>`): sin servidor no hay
 * invitación que disparar el plano, así que el anfitrión lo publica solo al
 * conectar. Las apps abiertas se pasan por la URL (`?visitaApps=`).
 */
export async function publicarPlanoLocal(salaId: string): Promise<void> {
  const apps = appsDeUrl()
  await guardarPlano(salaId, await armarPlano(apps))
}

/**
 * «Jugar <juego> con @amigo»: abre la casa (o reutiliza la sala viva), toca el
 * timbre, manda al hilo del buzón el mensaje con el enlace directo al juego y
 * se planta en él. Devuelve lo que dirá el asistente.
 *
 * Todo lo que el usuario puede arreglar se devuelve como frase; los fallos de
 * red y de RPC se dejan propagar (`ErrorPartida` / `ErrorBuzon`) para que quien
 * llama los traduzca con su `mensajeError…`.
 */
export async function invitarAJugar(juego: JuegoInvitable, contacto: Contacto, t: TFunc): Promise<string> {
  const def = JUEGOS_INVITABLES[juego]
  const j = nombreJuego(juego, t)
  const enVisita = t('partida.jugar.enVisita', 'Estás de visita: vuelve a tu MindHaOS para invitar a jugar')
  if (esVisita()) return enVisita

  // El juego tiene que existir en ESTA casa (el paintball es la casa entera).
  const objetos = useDiseño.getState().objetos
  if (def.cancha && !posicionDeJuego(juego, objetos, 1)) {
    return t('partida.jugar.sinCancha', 'No tienes {j} en tu mapa: colócala desde el editor', { j })
  }
  if (def.mesa && !objetos.some((o) => o.plantillaId === 'entretenimiento' && !esObjetoLibreria(o))) {
    if (!(await prepararMesa(j, t))) return t('partida.jugar.cancelada', 'Invitación cancelada')
  }
  // Sin hilo no hay dónde dejar el enlace: se comprueba antes de abrir la sala.
  const hiloId = contacto.hiloId
  if (!hiloId) return t('partida.jugar.sinHilo', 'Ese contacto aún no tiene chat')

  // Se reutiliza la sala viva si es MÍA: abrir otra cerraría esta y echaría a
  // quien ya estuviera dentro. Las `apps` de una sala son un snapshot del
  // momento de crearla, así que una sala sin Entretenimiento no sirve para mesa.
  const viva = salaViva()
  if (viva && !viva.soyAnfitrion) return enVisita
  if (viva && def.mesa && !viva.apps.includes('entretenimiento')) {
    return t(
      'partida.jugar.salaSinApp',
      'Tu sala abierta no incluye Entretenimiento. Ciérrala desde Amigos · Tu sala y pídemelo otra vez',
    )
  }
  let partidaId: string
  let apps: readonly string[]
  if (viva) {
    partidaId = viva.partidaId
    apps = viva.apps
    // Una sala abierta sin plano (se cayó la subida, o se abrió desde otro
    // sitio) dejaría al invitado en su propia casa al pulsar el enlace.
    if (!viva.casa) await guardarPlano(partidaId, await armarPlano(apps))
  } else {
    const nuevas = def.mesa ? ['entretenimiento'] : []
    const sala = await crearYConectar('visita', nuevas)
    await guardarPlano(sala.partidaId, await armarPlano(nuevas))
    partidaId = sala.partidaId
    apps = sala.apps
  }

  // Quien ya está dentro de la sala no necesita otro timbre (le saldría el
  // modal de «te invita a su casa» estando en ella): le basta el enlace.
  const dentro = viva?.jugadores.some((j) => j.alias === contacto.alias && j.estado === 'dentro') === true
  if (!dentro) await invitar(partidaId, contacto.contactoId)
  const url = enlaceJuego(partidaId, juego, apps)
  await enviar(hiloId, {
    texto: t('partida.jugar.mensaje', '¿Jugamos {j} en mi casa? {url}', { j, url }),
    paquete: {
      app: 'partida',
      tipo: 'juego',
      version: 1,
      nombre: j,
      emoji: def.emoji,
      datos: { partidaId, juego, apps: [...apps] },
    },
  })

  const llegue = irAlJuego(juego, -1, true)
  const a = contacto.alias
  const confirmacion = def.cancha
    ? t('partida.jugar.enviada.cancha', 'Le mandé a @{a} el enlace a la cancha. Cuando llegue, pulsa «Partido en línea».', { a }) +
      (llegue ? '' : ` ${t('partida.jugar.bajar', 'Baja a la planta baja y ve a la cancha.')}`)
    : def.mesa
      ? t('partida.jugar.enviada.mesa', 'Le mandé a @{a} el enlace a {j}. Cuando entre, elige «En línea» en la mesa.', { a, j })
      : t(
          'partida.jugar.enviada.paintball',
          'Le mandé a @{a} el enlace al paintball. Cuando entre a tu MindHaOS, elige «En línea» en el menú de batalla.',
          { a },
        )
  if (viva) return confirmacion
  const aviso = def.mesa
    ? t('partida.jugar.salaNuevaMesa', 'Abrí tu MindHaOS con el mapa y Entretenimiento.')
    : t('partida.jugar.salaNueva', 'Abrí tu MindHaOS solo con el mapa.')
  return `${aviso} ${confirmacion}`
}
