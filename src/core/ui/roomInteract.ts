import type { TFunc } from '../i18n/useT'

/**
 * Verbo de interacción sobre el mueble principal, por la APP que tiene el
 * cuarto: los ids de cuarto son generados (`cuarto-msy90fpi-u715`), así que
 * indexar por ellos caía siempre en «Entrar». Una app sin verbo propio —y un
 * cuarto todavía sin app— se queda con él.
 */
const ACCION_APP = (t: TFunc): Record<string, string> => ({
  cocina: t('interact.cocina', 'Cocinar'),
  ejercicio: t('interact.ejercicio', 'Entrenar'),
  descanso: t('interact.descanso', 'Descansar'),
  anecdotario: t('interact.anecdotario', 'Escribir'),
  despacho: t('interact.despacho', 'Finanzas'),
  biblioteca: t('interact.biblioteca', 'Estudiar'),
  entretenimiento: t('interact.entretenimiento', 'Entretenerse'),
  sala: t('interact.sala', 'Explorar el mundo'),
  jardin: t('interact.jardin', 'Meditar'),
  garage: t('interact.garage', 'Mantenimiento'),
  diario: t('interact.diario', 'Leer noticias'),
  hobbies: t('interact.hobbies', 'Practicar'),
})

export function accionCuarto(appId: string | undefined, t: TFunc): string {
  return (appId ? ACCION_APP(t)[appId] : undefined) ?? t('interact.entrar', 'Entrar')
}
