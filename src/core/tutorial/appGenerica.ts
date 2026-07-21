import type { TextoTut, TutorialDef } from './tipos'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

/**
 * Tutorial genérico de app: cubre las plantillas custom (armadas con bloques)
 * y cualquier app que aún no tenga tutorial propio. Solo usa anclajes del
 * wrapper del cuarto (`room.*`) y de la app genérica (`plantilla.bloques`).
 */
export const tutorialAppGenerica: TutorialDef = {
  id: 'app-generica',
  titulo: T('tut.app-generica.titulo', 'Esta app'),
  resumen: T(
    'tut.app-generica.resumen',
    'Cada app vive en un cuarto: el encabezado muestra el cuarto y la app, la barra de meta diaria lleva tu avance del día y «Volver a la casa» la cierra. Las plantillas propias se arman con bloques: notas, listas, contadores, hábitos…',
  ),
  pasos: [
    {
      sel: 'room.header',
      texto: T(
        'tut.app-generica.1.texto',
        'El encabezado muestra el cuarto y la app abierta. Si el cuarto tiene varias apps, la flecha ‹ vuelve al lanzador.',
      ),
    },
    {
      sel: 'room.meta',
      titulo: T('tut.app-generica.2.titulo', 'Meta diaria'),
      texto: T(
        'tut.app-generica.2.texto',
        'La barra de meta diaria: tu avance de hoy en esta app. Se llena con tu actividad real.',
      ),
    },
    {
      sel: 'plantilla.bloques',
      titulo: T('tut.app-generica.3.titulo', 'Los bloques'),
      texto: T(
        'tut.app-generica.3.texto',
        'Esta plantilla está armada con bloques (notas, listas, contadores, hábitos…). Puedes cambiarlos en Menú › Plantillas › editar.',
      ),
    },
    {
      sel: 'room.volver',
      titulo: T('tut.app-generica.4.titulo', 'Salir'),
      texto: T(
        'tut.app-generica.4.texto',
        '«Volver a la casa» cierra la app y te deja de nuevo en el 3D. Lo que registres aquí ya quedó guardado.',
      ),
    },
  ],
}
