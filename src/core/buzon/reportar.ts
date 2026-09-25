import { esDemo } from '../edicion'
import { tGlobal as t } from '../i18n/useT'
import { confirmar, elegir, pedirTexto } from '../state/confirmarStore'
import type { MotivoReporte } from './api'

/**
 * Los pasos de un reporte, iguales en el hilo, en los contactos y en los
 * espacios: elegir el motivo, contarlo (opcional) y, con `bloqueable`, decidir
 * si además se bloquea. Devuelve null si el usuario se echa atrás; quien llama
 * manda el reporte y, si toca, bloquea.
 */
export async function pedirReporte(
  quien: string,
  bloqueable: boolean,
): Promise<{ motivo: MotivoReporte; detalle: string; bloquear: boolean } | null> {
  const motivo = (await elegir({
    titulo: t('buzon.reportar.titulo', 'Reportar a {q}', { q: quien }),
    mensaje: t('buzon.reportar.pregunta', '¿Qué está pasando? Lo revisamos en menos de 24 horas y la otra persona no sabrá quién reportó.'),
    opciones: [
      { valor: 'acoso', texto: t('buzon.reportar.acoso', 'Acoso o amenazas') },
      { valor: 'odio', texto: t('buzon.reportar.odio', 'Odio o discriminación') },
      { valor: 'sexual', texto: t('buzon.reportar.sexual', 'Contenido sexual') },
      { valor: 'violencia', texto: t('buzon.reportar.violencia', 'Violencia') },
      { valor: 'spam', texto: t('buzon.reportar.spam', 'Spam o estafa') },
      { valor: 'otro', texto: t('buzon.reportar.otro', 'Otra cosa') },
    ],
  })) as MotivoReporte | null
  if (!motivo) return null
  const detalle =
    (await pedirTexto({
      titulo: t('buzon.reportar.detalle', 'Cuéntanos más (opcional)'),
      textoOk: t('buzon.reportar.enviar', 'Enviar reporte'),
    })) ?? ''
  // En el demo no hay servidor que bloquee: el reporte solo se simula.
  const bloquear = bloqueable && !esDemo() && await confirmar({
    titulo: t('buzon.reportar.bloquear.titulo', '¿Bloquear también a {q}?', { q: quien }),
    mensaje: t('buzon.reportar.bloquear.texto', 'No podrá escribirte ni invitarte a nada.'),
    textoOk: t('buzon.bloquear', 'Bloquear'),
    peligro: true,
  })
  return { motivo, detalle: detalle.slice(0, 500), bloquear }
}
