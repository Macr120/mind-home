import { claveLS } from '../../core/edicion'

/**
 * ¿Puede el Diario gastar créditos por su cuenta?
 *
 * Es el ÚNICO cuarto donde la IA corre SOLA: las efemérides se generan una vez
 * al día al abrir la app y el reparto redacta cada entrega programada, sin que
 * nadie pulse nada. Con suscripción vigente eso son 4 créditos diarios (la op
 * `texto_largo`) que el usuario no pidió, así que **nace apagado** y él decide.
 *
 * Apagado no se pierde el cuarto: las efemérides caen al catálogo local curado
 * y el reparto entrega con su plantilla fija. Lo único que desaparece es la
 * redacción generada.
 */
const CLAVE = 'mh-diario-ia-auto'

export function iaAutoDiario(): boolean {
  return localStorage.getItem(claveLS(CLAVE)) === '1'
}

export function setIaAutoDiario(activa: boolean): void {
  localStorage.setItem(claveLS(CLAVE), activa ? '1' : '0')
}
