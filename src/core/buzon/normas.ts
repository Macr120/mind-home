import { prefijo } from '../../../web/i18n/idiomas.mjs'
import { useSesion } from '../cuenta/sesionStore'
import { URL_WEB } from '../cuenta/urlWeb'
import { idiomaActual, tGlobal as t } from '../i18n/useT'
import { confirmar } from '../state/confirmarStore'
import * as api from './api'

/**
 * Normas de la comunidad: Apple (guideline 1.2) y Google Play exigen que el
 * usuario las acepte antes de poder escribir a otras personas. La aceptación
 * vive en el servidor (`perfiles.normas_aceptadas`), así que se pide UNA vez
 * por cuenta aunque se cambie de dispositivo; aquí solo se recuerda en memoria
 * para no consultarla en cada envío.
 */
const aceptadasPor = new Set<string>()

/** true si ya estaban aceptadas o el usuario las acepta ahora. */
export async function asegurarNormas(): Promise<boolean> {
  const uid = useSesion.getState().usuario?.id
  // Sin sesión decide la RPC de la acción («Inicia sesión…»), no este diálogo.
  if (!uid || aceptadasPor.has(uid)) return true
  if (await api.normasAceptadas()) {
    aceptadasPor.add(uid)
    return true
  }
  const enlace = URL_WEB ? ` ${URL_WEB}${prefijo(idiomaActual())}/terminos#normas` : ''
  const si = await confirmar({
    titulo: t('buzon.normas.titulo', 'Normas de la comunidad'),
    mensaje:
      t(
        'buzon.normas.texto',
        'Para escribir y compartir con otras personas aceptas no enviar acoso, odio, contenido sexual, violencia ni spam. No toleramos el contenido abusivo: puedes reportar cualquier mensaje o persona, y retiramos lo reportado y expulsamos a su autor en menos de 24 horas.',
      ) + enlace,
    textoOk: t('buzon.normas.aceptar', 'Acepto'),
  })
  if (!si) return false
  await api.aceptarNormas()
  aceptadasPor.add(uid)
  return true
}
