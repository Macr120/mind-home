import { abrirEnlace } from '../../enlaces'
import { hayNavegadorEscritorio } from '../../plataforma'

/** «1 h 5 min», «12 min», «< 1 min». */
export function formatoDuracion(seg: number, t: (clave: string, es: string) => string): string {
  const min = Math.round(seg / 60)
  if (min < 1) return `< 1 ${t('nav.tiempo.min', 'min')}`
  const h = Math.floor(min / 60)
  const m = min % 60
  if (!h) return `${m} ${t('nav.tiempo.min', 'min')}`
  return m ? `${h} ${t('nav.tiempo.h', 'h')} ${m} ${t('nav.tiempo.min', 'min')}` : `${h} ${t('nav.tiempo.h', 'h')}`
}

/** Abre una página desde el panel: pestaña nueva en el escritorio, el navegador in-app en el resto. */
export async function abrirDesdePanel(url: string): Promise<void> {
  if (hayNavegadorEscritorio()) {
    const { useNavegador } = await import('../../state/navegadorStore')
    await useNavegador.getState().abrir(url, undefined, { nueva: true })
    return
  }
  await abrirEnlace(url)
}
