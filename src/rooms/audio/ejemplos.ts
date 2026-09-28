import type { NotaAudio, ProyectoAudio } from '../../core/data/db'
import { grabacionesAudioRepo } from '../../core/data/repository'
import { filaEjemplo, porIdioma, retraducido, yaMaterializado, type PaqueteEjemplo } from '../_shared/ejemplos/tipos'
import { SEMILLAS_CANCIONES } from './canciones'
import { nuevaPistaId, PASOS_POR_COMPAS } from './constantes'
import { renderizarBuffer, wavDesdeBuffer } from './exportarWav'
import { calcularPicos } from './grabadorClip'

/**
 * Ejemplo de fábrica de Grabaciones: una toma corta que no sale de ningún
 * archivo, sino del render offline de los primeros compases de una canción del
 * banco (el mismo camino que el export WAV). Así no depende de binarios: cada
 * dispositivo la regenera. La fila nace sin `nube` y `nubeStudio` no sube
 * ejemplos, así que se queda local (como toda toma sin copia en la nube).
 */

const ID = 'audio.grabaciones'
const SEMILLA = 'sem-himno-alegria'
const COMPASES = 4

const TEXTOS = {
  es: { toma: 'Himno de la alegría · toma de ejemplo' },
  en: { toma: 'Ode to Joy · sample take' },
  pt: { toma: 'Hino à alegria · gravação de exemplo' },
  fr: { toma: 'Hymne à la joie · prise d’exemple' },
  de: { toma: 'Ode an die Freude · Beispielaufnahme' },
  it: { toma: 'Inno alla gioia · registrazione di esempio' },
  nl: { toma: 'Ode an die Freude · voorbeeldopname' },
  pl: { toma: 'Oda do radości · przykładowe nagranie' },
  tr: { toma: 'Neşeye Övgü · örnek kayıt' },
  id: { toma: 'Ode to Joy · rekaman contoh' },
  ja: { toma: '歓喜の歌 · サンプル録音' },
  zh: { toma: '欢乐颂 · 示例录音' },
  ko: { toma: '환희의 송가 · 예시 녹음' },
  ru: { toma: 'Ода к радости · пример записи' },
  hi: { toma: 'ओड टू जॉय · नमूना रिकॉर्डिंग' },
  ar: { toma: 'نشيد الفرح · تسجيل تجريبي' },
}

export const ejemploGrabaciones: PaqueteEjemplo = {
  id: ID,
  tablas: [grabacionesAudioRepo],
  async materializar(restaurar) {
    if (await yaMaterializado(ID, () => grabacionesAudioRepo.list())) return
    const semilla = SEMILLAS_CANCIONES.find((s) => s.id === SEMILLA)
    if (!semilla) return
    // Solo las notas que caben en los primeros compases (el render llega hasta la última nota).
    const tope = COMPASES * PASOS_POR_COMPAS
    const recortar = (notas: NotaAudio[]) =>
      notas.filter((n) => n[0] < tope).map((n): NotaAudio => [n[0], Math.min(n[1], tope - n[0]), n[2], n[3]])
    // Las dos manos al piano, como `proyectoDeSemilla` (aquí sin importarlo: Albumes monta este panel).
    const pista = (notas: NotaAudio[], volumen: number) => ({ pistaId: nuevaPistaId(), nombre: '', instrumento: 'piano' as const, volumen, notas: recortar(notas) })
    const proyecto: ProyectoAudio = {
      nombre: semilla.tituloEs,
      bpm: semilla.bpm,
      compases: COMPASES,
      pistas: [pista(semilla.manoDer, 0.9), pista(semilla.manoIzq, 0.75)],
      creadoEn: '',
      actualizadoEn: '',
    }
    const buffer = await renderizarBuffer(proyecto)
    await grabacionesAudioRepo.addSeed(
      filaEjemplo(ID, 'toma', restaurar, {
        nombre: porIdioma(TEXTOS).toma,
        blob: wavDesdeBuffer(buffer),
        duracionSeg: buffer.duration,
        picos: calcularPicos(buffer, 0),
        creadoEn: new Date().toISOString(),
      }),
    )
  },

  async retraducir() {
    for (const g of await grabacionesAudioRepo.list()) {
      if (g.ejemploDe !== ID || g.id == null) continue
      const nombre = retraducido(TEXTOS, g.nombre, 'toma')
      if (nombre) await grabacionesAudioRepo.update(g.id, { nombre })
    }
  },
}
