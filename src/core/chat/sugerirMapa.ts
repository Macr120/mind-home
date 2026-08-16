import { create } from 'zustand'
import type { TipoMapa } from '../data/db'
import { useMascota } from '../state/mascotaStore'
import { tGlobal } from '../i18n/useT'
import { normalizar } from './dispatcher'
import { tomarUltimoMapa } from './editorIntencion'

/**
 * ¿La charla que acaba de tener el usuario pide dibujarse?
 *
 * Detector DETERMINISTA (ni una llamada de IA): mira la pregunta y la respuesta
 * del asistente y, cuando la explicación tiene forma de mapa (pasos, tipos,
 * partes, comparación…), ofrece un mapa de la app Ideas EN LA CONVERSACIÓN con
 * ese asistente (y sobre la barra del chat si el hilo no está abierto). Es una
 * oferta, no una acción: el mapa solo se dibuja —y solo entonces gasta IA— si
 * el usuario toca el botón.
 *
 * Es a propósito conservador: mejor no ofrecer que ofrecer en cada mensaje.
 */

export interface SugerenciaMapa {
  /** Tema ya limpio, listo para `editor_mapa_ideas`. */
  tema: string
  tipo: TipoMapa
  /** Asistente que dio la explicación: la oferta cuelga de SU hilo. */
  asistenteId: string
}

/** Respuesta mínima para que valga la pena dibujarla. */
const LARGO_MINIMO = 220
/** Sin señal de formato hace falta una explicación de verdad larga. */
const LARGO_SOBRADO = 420
/** Descanso entre ofertas: el asistente no debe volverse pesado. */
const ESPERA_MS = 5 * 60_000

let ultimoOfrecido = 0
let temaOfrecido = ''

/** Pregunta que pide una explicación (lo que suele valer un mapa). */
const PIDE_EXPLICACION =
  /\b(explica|explicame|que es|que son|como funciona|como funcionan|como se|como hago|como puedo|cuales son|cual es|diferencia|diferencias|compara|comparacion|ventajas|desventajas|tipos de|clases de|partes de|pasos|resume|resumeme|hablame|cuentame|de que trata|por que)\b/

/** Señales de formato en la respuesta, en orden de prioridad. */
const SENALES: { tipo: TipoMapa; re: RegExp }[] = [
  { tipo: 'comparacion', re: /\b(a diferencia|mientras que|en cambio|frente a|versus|vs|mejor que)\b/ },
  // Sin dos temas enfrentados, las ventajas y desventajas son de UNA opción.
  { tipo: 'proscontras', re: /\b(ventajas|desventajas|inconvenientes|pros|contras)\b/ },
  { tipo: 'venn', re: /\b(ambos|ambas|en comun|comparten|los dos|las dos|coinciden)\b/ },
  { tipo: 'flujo', re: /\b(primero|luego|despues|a continuacion|finalmente|por ultimo|paso|pasos|etapas)\b/ },
  { tipo: 'arbol', re: /\b(tipos|clases|categorias|se divide|se dividen|se clasifica|ramas|niveles|grupos)\b/ },
  { tipo: 'llaves', re: /\b(partes|componentes|consta de|se compone|elementos|piezas)\b/ },
]

/** Arranques de pregunta que no forman parte del tema (ya normalizados). */
const ARRANQUES = [
  'oye', 'hey', 'por favor', 'me puedes', 'puedes', 'podrias', 'quiero saber', 'quisiera saber',
  'explicame', 'explica', 'dime', 'cuentame', 'hablame', 'resumeme', 'ensename',
  'que es', 'que son', 'cuales son', 'cual es', 'como funciona', 'como funcionan',
  'como se hace', 'como se hacen', 'como hago', 'como puedo', 'de que trata', 'por que',
  'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'sobre', 'acerca de', 'lo de',
]

/** Quita signos y muletillas del inicio para quedarse con el tema pelado. */
function temaDe(pregunta: string): string {
  let s = pregunta.trim().replace(/^[¿¡\s]+/, '').replace(/[?!.\s]+$/, '')
  for (let quitado = true; quitado; ) {
    quitado = false
    const n = normalizar(s)
    for (const a of ARRANQUES) {
      if (n.startsWith(`${a} `)) {
        s = s.slice(a.length + 1).trimStart()
        quitado = true
        break
      }
    }
  }
  // Una sola idea: hasta el primer corte fuerte y sin pasar de 60 caracteres.
  s = s.split(/[.?!\n;]/)[0].trim()
  if (s.length > 60) s = `${s.slice(0, 60).replace(/\s+\S*$/, '')}…`
  return s
}

/**
 * Decide si ofrecer un mapa tras una respuesta conversacional. Devuelve null
 * cuando no lo amerita, cuando se ofreció hace poco o cuando el tema no se deja
 * resumir en una frase. Al ofrecer arranca el descanso, se acepte o no: una
 * oferta por charla basta.
 */
function detectarMapa(pregunta: string, respuesta: string): { tema: string; tipo: TipoMapa } | null {
  if (respuesta.length < LARGO_MINIMO) return null
  if (Date.now() - ultimoOfrecido < ESPERA_MS) return null

  const nPregunta = normalizar(pregunta)
  const nRespuesta = normalizar(respuesta)
  const senal = SENALES.find((s) => s.re.test(nRespuesta))
  // Explicación pedida, o respuesta larguísima con forma reconocible.
  if (!PIDE_EXPLICACION.test(nPregunta) && !(senal && respuesta.length >= LARGO_SOBRADO)) return null

  const tema = temaDe(pregunta)
  if (tema.length < 3 || normalizar(tema) === normalizar(temaOfrecido)) return null

  // Venn solo si además hay contraste: «ambos» suelto no es un diagrama.
  const tipo: TipoMapa =
    senal?.tipo === 'venn' && !SENALES[0].re.test(nRespuesta) ? 'mental' : (senal?.tipo ?? 'mental')
  ultimoOfrecido = Date.now()
  temaOfrecido = tema
  return { tema, tipo }
}

interface SugerenciaState {
  /** Oferta viva (una a la vez), o null. */
  sugerencia: SugerenciaMapa | null
  /** El mapa se está dibujando (la IA tarda unos segundos). */
  dibujando: boolean
  /** Analiza el turno y deja la oferta colgada del hilo de ese asistente. */
  ofrecer: (pregunta: string, respuesta: string, asistenteId: string) => void
  descartar: () => void
  /** Acepta: dibuja el mapa con IA, lo abre y contesta en el hilo del asistente. */
  dibujar: () => Promise<void>
}

/**
 * Estado de la oferta, fuera de React: la pinta tanto la conversación abierta
 * (`ChatConversacion`) como la barra del chat cuando no lo está (`ChatBox`).
 */
export const useSugerenciaMapa = create<SugerenciaState>((set, get) => ({
  sugerencia: null,
  dibujando: false,

  ofrecer: (pregunta, respuesta, asistenteId) => {
    const s = detectarMapa(pregunta, respuesta)
    set({ sugerencia: s ? { ...s, asistenteId } : null })
  },

  descartar: () => set({ sugerencia: null }),

  dibujar: async () => {
    const s = get().sugerencia
    if (!s || get().dibujando) return
    const mascota = useMascota.getState()
    set({ sugerencia: null, dibujando: true })
    mascota.setPensando(true, s.asistenteId)
    // `editorAcciones` es diferido (120 KB): se descarga al aceptar el ofrecimiento.
    const { ejecutarToolEditor } = await import('./editorAcciones')
    const msg = await ejecutarToolEditor('editor_mapa_ideas', { tema: s.tema, tipo: s.tipo })
    set({ dibujando: false })
    mascota.decir(msg ?? tGlobal('chat.mapa.fallo', 'No pude dibujar ese mapa.'), {
      asistenteId: s.asistenteId,
      mapaId: tomarUltimoMapa(),
    })
  },
}))
