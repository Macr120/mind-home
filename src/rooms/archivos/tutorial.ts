/**
 * Tutorial esencial de Archivo: corre en la casa real y recorre el explorador
 * sin crear datos. Los textos valen también sin él: la demo y la casa sin sesión
 * se quedan en la puerta de la app, y sin plan no hay «Nuevo». Ahí los pasos se
 * leen junto al mago y cuentan qué hay dentro y qué hace falta.
 */
import type { CuerpoTutorial, TextoTut } from '../../core/tutorial/tipos'
import { abrirApp } from '../../core/abrirApp'
import { clickTut, elTut, esperarTut } from '../../core/tutorial/dom'
import { nombrePlataforma } from '../../core/plataforma'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

/**
 * El primer anclaje que SE VE, o ninguno. Escritorio y teléfono pintan piezas
 * distintas (el lateral o los chips, «Nuevo» y el medidor en uno u otro sitio),
 * y la que no toca sigue en el DOM oculta y sin tamaño.
 */
const visible =
  (...sels: string[]) =>
  () =>
    sels.find((s) => !!elTut(s)?.getClientRects().length) ?? ''

/**
 * La raíz de Mi Archivo, sin selección ni búsqueda (ahí sale «Nuevo» también en
 * el teléfono). Pulsar la entrada del menú en la que ya estás no cambia nada, así
 * que re-entrar con «Atrás» es idempotente.
 */
const aMiArchivo = () => {
  clickTut('archivos.menu.mia')
}

export const cuerpoEsencial: CuerpoTutorial = {
  preparar: () => {
    abrirApp('archivos')
  },
  pasos: [
    {
      titulo: T('tut.app-archivos--esencial.1.titulo', 'Tu nube'),
      texto: T(
        'tut.app-archivos--esencial.1.texto',
        'Archivo guarda en la nube carpetas y archivos de cualquier tipo, con vista previa de imágenes, video, audio, PDF y texto, y los abres desde cualquier dispositivo. Hace falta iniciar sesión y tener un plan Pro, con 10, 30 o 100 GB según el nivel.',
      ),
    },
    {
      sel: visible('archivos.menu', 'archivos.chips'),
      titulo: T('tut.app-archivos--esencial.2.titulo', 'Las secciones'),
      texto: T(
        'tut.app-archivos--esencial.2.texto',
        'Mi Archivo reúne tus carpetas y archivos; Recientes, lo último que subiste, y Destacados, lo que marcas con la estrella. Lo que borras pasa 30 días en la Papelera, donde todavía puedes restaurarlo.',
      ),
      alEntrar: async () => {
        // La app baja perezosa: se le da un momento. Si no llega, es la puerta.
        await esperarTut('archivos.explorador', 1500)
        aMiArchivo()
      },
    },
    {
      sel: visible('archivos.menu.cuartos', 'archivos.chip.cuartos'),
      titulo: T('tut.app-archivos--esencial.3.titulo', 'Una carpeta por cuarto'),
      texto: T(
        'tut.app-archivos--esencial.3.texto',
        'Cada cuarto de tu MindHaOS tiene su carpeta en Cuartos. Arriba sale lo que su app ya guarda, como las fotos de las recetas o los dibujos, que aquí solo se ve y se baja; debajo va lo que subas tú.',
      ),
      alEntrar: () => {
        clickTut('archivos.menu.cuartos')
      },
    },
    {
      sel: visible('archivos.nuevo', 'archivos.nuevo.movil'),
      titulo: T('tut.app-archivos--esencial.4.titulo', 'Subir y crear'),
      // En iOS no se nombran otras plataformas (App Review, 2.3.10), y allí
      // no se suben carpetas enteras ni se suelta nada desde el equipo.
      texto:
        nombrePlataforma() === 'ios'
          ? T(
              'tut.app-archivos--esencial.4.textoIos',
              'Con Pro, «Nuevo» crea una carpeta o sube archivos, y lo que ya está dentro se lleva a otra carpeta arrastrándolo.',
            )
          : T(
              'tut.app-archivos--esencial.4.texto',
              'Con Pro, «Nuevo» crea una carpeta o sube archivos, y en la web o en la app de escritorio también carpetas enteras. Desde tu equipo puedes además soltarlos en tu Archivo, y lo que ya está dentro se lleva a otra carpeta arrastrándolo.',
            ),
      alEntrar: aMiArchivo,
    },
    {
      sel: visible('archivos.herramientas'),
      titulo: T('tut.app-archivos--esencial.5.titulo', 'Buscar y ordenar'),
      texto: T(
        'tut.app-archivos--esencial.5.texto',
        'En Mi Archivo, el buscador mira en todo tu Archivo; en otras secciones, solo en lo que tienes delante. Junto a él eliges el orden, por nombre, fecha o tamaño, y cambias entre cuadrícula y lista.',
      ),
      alEntrar: aMiArchivo,
    },
    {
      titulo: T('tut.app-archivos--esencial.6.titulo', 'Opciones de cada archivo'),
      texto: T(
        'tut.app-archivos--esencial.6.texto',
        'El clic derecho sobre un archivo, o su botón «⋯», abre sus opciones: descargar, compartir, destacar, renombrar, mover o mandarlo a la papelera. «Compartir» crea un enlace que dura 1, 7 o 30 días y que cualquiera abre sin cuenta.',
      ),
    },
    {
      sel: visible('archivos.medidor', 'archivos.medidor.movil'),
      titulo: T('tut.app-archivos--esencial.7.titulo', 'Tu espacio'),
      texto: T(
        'tut.app-archivos--esencial.7.texto',
        'El medidor dice cuánto llevas usado de tu nube: 10, 30 o 100 GB según tu nivel de Pro. Si tu plan se acaba, lo subido se puede ver y bajar durante 90 días, y después se borra de la nube.',
      ),
    },
  ],
}
