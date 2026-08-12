import { callarVoz, hablarVoz, hayVoz, vozDeAsistente } from '../audio/voz'
import { getAsistente } from '../state/asistentesStore'
import { useAjustes } from '../state/ajustesStore'

/**
 * Narración por voz de los tutoriales: el mago lee cada paso mientras se pinta
 * su tarjeta. Apagada por defecto (`ajustes.vozTutoriales`, Configuraciones ›
 * Tutoriales, o el altavoz de la propia tarjeta).
 *
 * Voz NATIVA siempre, aunque el mago tenga encendida la voz con IA en su ficha:
 * un tour de ocho pasos son ocho llamadas de pago, y nadie espera que ver un
 * tutorial le gaste créditos. Sí hereda su tono y velocidad.
 *
 * El habla se pide como dueña `'tutorial'` (ver `core/audio/voz.ts`): mientras
 * dura, la charla espontánea de los asistentes no la interrumpe.
 */
export function narrarPaso(titulo: string, texto: string): void {
  if (!useAjustes.getState().vozTutoriales || !hayVoz()) return
  const v = vozDeAsistente(getAsistente('mago'))
  // El título va delante y con punto: da el respiro que separa encabezado de cuerpo.
  hablarVoz(`${titulo}. ${texto}`, {
    vozNombre: v.vozNombre,
    rate: v.rate,
    pitch: v.pitch,
    volumen: v.volumen,
    duenio: 'tutorial',
  })
}

/** Corta la narración (cambio de paso, salir del tour o desmontar la tarjeta). */
export function callarNarracion(): void {
  callarVoz()
}

/** ¿Tiene sentido ofrecer el altavoz? Sin voces del sistema, no sonaría nada. */
export function hayNarracion(): boolean {
  return hayVoz()
}
