import type { SeccionHistoria } from '../../core/data/db'
import type { TFunc } from '../../core/i18n/useT'
import { escaparHtml } from './sanitizarHtml'

// Solo tags de la lista blanca de `sanitizarHtml`: las semillas se guardan
// como contenido normal (y sus h2 alimentan el índice automático).
const h2 = (texto: string) => `<h2>${escaparHtml(texto)}</h2><p><br></p>`

/** Contenido inicial de una ficha del modo Historia. */
export function semillaSeccion(seccion: SeccionHistoria, t: TFunc): string {
  switch (seccion) {
    case 'personaje':
      return (
        h2(t('escritura.semilla.personaje.apariencia', 'Apariencia')) +
        h2(t('escritura.semilla.personaje.personalidad', 'Personalidad')) +
        h2(t('escritura.semilla.personaje.quiere', 'Qué quiere')) +
        h2(t('escritura.semilla.personaje.historia', 'Historia'))
      )
    case 'lugar':
      return (
        h2(t('escritura.semilla.lugar.descripcion', 'Descripción')) +
        h2(t('escritura.semilla.lugar.atmosfera', 'Atmósfera')) +
        h2(t('escritura.semilla.lugar.ocurre', 'Qué pasa aquí'))
      )
    case 'acto':
      return h2(t('escritura.semilla.acto.resumen', 'Resumen')) + h2(t('escritura.semilla.acto.escenas', 'Escenas'))
    case 'trama':
      return (
        h2(t('escritura.semilla.trama.planteamiento', 'Planteamiento')) +
        h2(t('escritura.semilla.trama.nudo', 'Nudo')) +
        h2(t('escritura.semilla.trama.desenlace', 'Desenlace'))
      )
    case 'capitulo':
    case 'relacion':
      // Capítulos y notas de conexión son texto corrido: nacen en blanco.
      return ''
  }
}
