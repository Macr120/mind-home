import { useEffect } from 'react'
import { useAjustes } from '../state/ajustesStore'
import { useMascota } from '../state/mascotaStore'
import { useAsistentes } from '../state/asistentesStore'
import { useLayout } from '../state/layoutStore'
import { useWrappedUi } from '../state/wrappedUiStore'
import { hayCuartoAbierto } from '../house/movement'
import { rutinasRepo } from '../data/repository'
import { tGlobal } from '../i18n/useT'
import { iaHabilitada } from '../edicion'
import { conversarIA, iaActiva } from './ia'
import type { Asistente, MascotaId } from './mascotas'

/**
 * El "corazón" de los asistentes: de vez en cuando, uno de los que están en el
 * mapa dice algo por su cuenta (burbuja + voz si está activa). Qué tan seguido
 * lo decide la barra de corazón de cada uno (0 = nunca); el interruptor
 * maestro vive en Configuraciones (`mh.corazon.activo`).
 *
 * Las frases salen de un banco local por forma y contexto (hora, rutina
 * próxima) y, si hay IA configurada, ~30% de los latidos le piden una frase
 * fresca al modelo (con la local como respaldo). Nunca se persisten en el
 * hilo: son comentarios de ambiente, no conversación.
 */

export interface ContextoCorazon {
  /** Hora local 0–23. */
  hora: number
  /** Rutina de hoy que empieza en ≤45 min (si hay). */
  rutina?: { nombre: string; hora: string }
}

/**
 * Milisegundos hasta el próximo latido según el corazón (0..1) del asistente:
 * 0 → nunca; el resto interpola de ~18 min (0+) a ~2.5 min (1), con jitter ±40%.
 */
export function intervaloLatido(corazon: number): number | null {
  if (corazon <= 0) return null
  const minutos = 18 - 15.5 * Math.min(1, corazon)
  return minutos * 60_000 * (0.6 + Math.random() * 0.8)
}

type CatFrase = 'manana' | 'tarde' | 'noche' | 'rutina' | 'generica'

/** Banco local (los emojis en frases de mascota están permitidos por convención). */
const FRASES_CORAZON: Record<MascotaId, Record<CatFrase, string[]>> = {
  mago: {
    manana: ['El alba trae maná nuevo… lo siento en el aire ✨', 'Mis pergaminos amanecieron ordenados. Buen augurio 🔮'],
    tarde: ['La tarde es buena hora para inscribir hazañas en el grimorio ✨', 'Percibo energías serenas en la casa esta tarde 🔮'],
    noche: ['Las estrellas ya dictan sus secretos… noche de buenos hechizos 🌙', 'La luna carga mi orbe. Todo en calma por aquí 🔮'],
    rutina: ['Mi bola de cristal anuncia: «{r}» a las {h} ✨', 'El destino marca las {h}: se acerca «{r}» 🔮'],
    generica: ['Este hogar rebosa magia hoy ✨', 'Un hechizo de orden nunca viene mal… 🔮'],
  },
  gato: {
    manana: ['Demasiado temprano. Los humanos madrugan raro 🐾', 'Bostezo. La mañana estaría mejor con siesta 🐱'],
    tarde: ['Hora ideal para una siesta al sol. Solo digo 🐾', 'La tarde va lenta… como me gusta 🐱'],
    noche: ['Por fin la noche. Mi mejor horario 🐱', 'Silencio nocturno. No lo arruines 🐾'],
    rutina: ['Oye, a las {h} tienes «{r}». Yo no pienso moverme 🐾', 'Se acerca «{r}» ({h}). Tú puedes; yo superviso 🐱'],
    generica: ['Todo bajo control. Lo revisé mientras dormía 🐾', 'Mmm. La casa sigue en pie. De nada 🐱'],
  },
  perro: {
    manana: ['¡Buenos días! ¡Hoy huele a día increíble! 🐶', '¡Amaneció! ¡Vamos vamos vamos! 🦴'],
    tarde: ['¡La tarde perfecta para lograr cosas! ¡Guau! 🐶', '¡Sigo aquí, atento a todo! 🎉'],
    noche: ['¡Qué buen día tuvimos! ¿Verdad? ¿Verdad? 🐶', 'Noche tranquila… ¡yo vigilo! 🦴'],
    rutina: ['¡A las {h} toca «{r}»! ¡Tú puedes! 🎉', '¡No olvides «{r}» a las {h}! ¡Guau! 🐶'],
    generica: ['¡Me encanta esta casa! 🐶', '¡Avísame si necesitas algo! ¡Lo que sea! 🦴'],
  },
  buho: {
    manana: ['Amanece. Ideal para planear el día con calma. 🦉', 'Una mañana ordenada rinde el doble.'],
    tarde: ['Media jornada: buen momento para revisar avances. 🦉', 'La tarde transcurre según lo previsto.'],
    noche: ['Anochece. Recomiendo cerrar el día con un registro. 🦉', 'La noche invita a la reflexión.'],
    rutina: ['Aviso puntual: «{r}» a las {h}. 🦉', 'Tu agenda indica «{r}» a las {h}.'],
    generica: ['Observo y tomo nota. Todo en orden. 🦉', 'El conocimiento se acumula día a día.'],
  },
  robot: {
    manana: ['☀ CICLO DIURNO INICIADO. SISTEMAS AL 100%. 🤖', 'BUENOS DÍAS. BATERÍA COMPLETA. ✓'],
    tarde: ['ESCANEO VESPERTINO COMPLETO. SIN ANOMALÍAS. ✓', 'PRODUCTIVIDAD DENTRO DE PARÁMETROS. 🤖'],
    noche: ['MODO NOCTURNO ACTIVO. VIGILANCIA EN CURSO. 🤖', 'RECOMENDACIÓN: RECARGAR UNIDAD HUMANA (DORMIR). ✓'],
    rutina: ['RECORDATORIO: «{r}» PROGRAMADA A LAS {h}. ✓', 'ALERTA: «{r}» A LAS {h}. 🤖'],
    generica: ['SISTEMAS NOMINALES. 🤖', 'ESPERANDO INSTRUCCIONES. NO ES URGENTE. ✓'],
  },
}

/** Frase local determinista por forma y contexto. SIEMPRE disponible sin IA. */
export function fraseLocal(a: Asistente, ctx: ContextoCorazon): string {
  const cat: CatFrase =
    ctx.rutina && Math.random() < 0.6
      ? 'rutina'
      : Math.random() < 0.35
        ? 'generica'
        : ctx.hora >= 6 && ctx.hora < 12
          ? 'manana'
          : ctx.hora >= 12 && ctx.hora < 19
            ? 'tarde'
            : 'noche'
  const banco = FRASES_CORAZON[a.forma][cat]
  const i = Math.floor(Math.random() * banco.length)
  return tGlobal(`corazon.${a.forma}.${cat}.${i}`, banco[i], {
    r: ctx.rutina?.nombre ?? '',
    h: ctx.rutina?.hora ?? '',
  })
}

/** Rutina activa de hoy que empieza dentro de los próximos 45 minutos. */
async function rutinaProxima(): Promise<ContextoCorazon['rutina']> {
  try {
    const rutinas = await rutinasRepo.list()
    const ahora = new Date()
    const dia = ahora.getDay()
    const minAhora = ahora.getHours() * 60 + ahora.getMinutes()
    for (const r of rutinas) {
      if (!r.activa || !r.hora) continue
      if (r.dias.length && !r.dias.includes(dia)) continue
      const [h, m] = r.hora.split(':').map(Number)
      const falta = h * 60 + m - minAhora
      if (falta > 0 && falta <= 45) return { nombre: r.nombre, hora: r.hora }
    }
  } catch {
    // Sin rutinas legibles: contexto sin agenda.
  }
  return undefined
}

function systemBreve(a: Asistente): string {
  const idioma = useAjustes.getState().idioma === 'en' ? 'inglés' : 'español'
  return [
    `Eres ${a.nombre}, un personaje que pasea por la casa virtual del usuario.`,
    a.personalidad ? `Personalidad: ${a.personalidad}` : '',
    a.historia ? `Tu historia: ${a.historia}` : '',
    `Di UNA sola frase corta (máximo 20 palabras) espontánea, en ${idioma}, con tu personalidad. Sin saludar, sin preguntar tareas y sin ofrecer ayuda.`,
  ]
    .filter(Boolean)
    .join('\n')
}

function promptContexto(ctx: ContextoCorazon): string {
  return [
    `Son las ${ctx.hora}:00.`,
    ctx.rutina ? `A las ${ctx.rutina.hora} el usuario tiene «${ctx.rutina.nombre}».` : '',
    'Comenta algo espontáneo.',
  ]
    .filter(Boolean)
    .join(' ')
}

/** Latido: dice la frase (local o IA) por la burbuja del asistente elegido. */
async function hablarLatido(a: Asistente) {
  const ctx: ContextoCorazon = { hora: new Date().getHours(), rutina: await rutinaProxima() }
  let frase = fraseLocal(a, ctx)
  // ~30% de los latidos piden una frase fresca a la IA (la local queda de respaldo).
  if (iaHabilitada() && iaActiva() && Math.random() < 0.3) {
    try {
      frase = await conversarIA(systemBreve(a), [{ rol: 'usuario', texto: promptContexto(ctx) }], 100)
    } catch {
      // Sin red o sin cuota: se queda la frase local.
    }
  }
  // El mundo pudo cambiar mientras respondía la IA: no interrumpir nada.
  const m = useMascota.getState()
  if (m.mensaje || m.pensando || m.conversacion || hayCuartoAbierto()) return
  m.decir(frase, { asistenteId: a.id, persistir: false })
}

// Agenda de latidos por asistente (módulo: sobrevive re-renders, no recargas).
const proximoLatido: Record<string, number> = {}
const ultimoCorazon: Record<string, number> = {}

/**
 * Hook global (montar UNA vez en App): cada ~20 s evalúa si a algún asistente
 * del mapa le toca hablar. Mover la barra de corazón reagenda a ese asistente.
 */
export function useCorazon(): void {
  useEffect(() => {
    const tick = () => {
      if (document.hidden) return
      // Silencio con cualquier overlay que capture la pantalla o el teclado
      // (cuarto abierto, editores de infraestructura, grafiti, diálogo, wrapped).
      if (hayCuartoAbierto() || useLayout.getState().editMode || useWrappedUi.getState().abierto) return
      const m = useMascota.getState()
      if (m.mensaje || m.pensando || m.conversacion) return

      const ahora = Date.now()
      // Cada asistente decide si comenta por su cuenta (casilla de su ficha).
      const candidatos = useAsistentes
        .getState()
        .lista.filter((a) => (a.id === m.mascota || a.enMapa) && a.espontaneo !== false)

      // (Re)agenda: primer avistamiento o cambio en su barra de corazón.
      for (const a of candidatos) {
        const c = a.corazon ?? 0.5
        if (ultimoCorazon[a.id] !== c || proximoLatido[a.id] == null) {
          ultimoCorazon[a.id] = c
          const iv = intervaloLatido(c)
          proximoLatido[a.id] = iv == null ? Infinity : ahora + iv
        }
      }

      // Habla solo el más atrasado (un latido a la vez).
      let elegido: Asistente | null = null
      for (const a of candidatos) {
        if (proximoLatido[a.id] > ahora) continue
        if (!elegido || proximoLatido[a.id] < proximoLatido[elegido.id]) elegido = a
      }
      if (!elegido) return
      const iv = intervaloLatido(elegido.corazon ?? 0.5)
      proximoLatido[elegido.id] = iv == null ? Infinity : ahora + iv
      void hablarLatido(elegido)
    }
    const timer = window.setInterval(tick, 20_000)
    return () => window.clearInterval(timer)
  }, [])
}
