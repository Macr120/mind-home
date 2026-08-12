import { abrirApp } from '../abrirApp'
import type { TextoTut, TutorialDef } from './tipos'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

/**
 * Tutorial genérico de app: cubre las plantillas custom (armadas con bloques)
 * y cualquier app que aún no tenga tutorial propio. Solo usa anclajes del
 * wrapper del cuarto (`room.*`) y de la app genérica (`plantilla.bloques`).
 *
 * Los pasos viven en `appGenerica.pasos.ts` (chunk aparte): esta ficha sí es
 * eager, la pide `flujosDeApp` para toda plantilla sin tours propios.
 */
export const tutorialAppGenerica = (plantillaId: string): TutorialDef => ({
  id: 'app-generica',
  titulo: T('tut.app-generica.titulo', 'Esta app'),
  resumen: T(
    'tut.app-generica.resumen',
    'Cada app vive en un cuarto: el encabezado muestra el cuarto y la app, la lista de hoy lleva lo que toca hacer aquí y «Volver a la casa» la cierra. Las plantillas propias se arman con bloques: notas, listas, contadores, hábitos…',
  ),
  cargar: () =>
    import('./appGenerica.pasos').then((m) => ({
      preparar: () => {
        abrirApp(plantillaId)
      },
      pasos: m.PASOS_APP_GENERICA,
    })),
})
