import type { PasoTutorial, TextoTut } from './tipos'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

/** Pasos del tutorial genérico de app (su ficha vive en `appGenerica.ts`). */
export const PASOS_APP_GENERICA: PasoTutorial[] = [
  {
    sel: 'room.header',
    texto: T(
      'tut.app-generica.1.texto',
      'El encabezado muestra el cuarto y la app abierta. Si el cuarto tiene varias apps, la flecha ‹ vuelve al lanzador.',
    ),
  },
  {
    sel: 'room.meta',
    titulo: T('tut.app-generica.2.titulo', 'Lo de hoy'),
    texto: T(
      'tut.app-generica.2.texto',
      'Tus pasos de hoy en esta app: tus objetivos, lo que tengas agendado y lo que pidan tus metas. Tócala para desplegarla; cada paso se tacha solo en cuanto registras.',
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
]
