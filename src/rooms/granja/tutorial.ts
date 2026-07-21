import type { TextoTut, TutorialDef } from '../../core/tutorial/tipos'
import { abrirEditorInfra } from '../../core/tutorial/infraEditor'
import { useGranja } from '../../core/state/granjaStore'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

const g = () => useGranja.getState()

export const tutorialGranja: TutorialDef = {
  id: 'infra-granja',
  titulo: T('tut.infra-granja.titulo', 'Granja'),
  resumen: T(
    'tut.infra-granja.resumen',
    'La granja se construye en el mapa: levantas corrales rectangulares —caben tres animales por celda y se agrandan tocando una celda pegada— y los pueblas con gallinas, cerdos, cabras, ovejas y vacas, cada uno con su nombre. Comen de la cesta del huerto según su propia ventana de hambre y se aburren si pasan seis horas sin mimos. Puedes acariciarlos y ponerles juguetes desde el editor, o alimentarlos al pasar caminando junto al corral.',
  ),
  preparar: () => abrirEditorInfra(() => g().iniciar(), 'granja.header'),
  pasos: [
    {
      sel: 'granja.barra',
      texto: T(
        'tut.infra-granja.1.texto',
        'La granja se construye sobre el mapa, igual que el huerto. Estas son las herramientas; cada una se aplica en la celda que toques.',
      ),
    },
    {
      sel: 'granja.herr.corral',
      alEntrar: () => g().setHerramienta('corral'),
      titulo: T('tut.infra-granja.2.titulo', 'Primero, el corral'),
      texto: T(
        'tut.infra-granja.2.texto',
        'Toca una celda libre y nace un corral de 1×1. Toca una celda pegada a él y el corral se estira para cubrirla. Caben tres animales por celda, así que agrandarlo es ampliarle el cupo.',
      ),
    },
    {
      sel: 'granja.animales',
      alEntrar: () => g().setHerramienta('animal'),
      esperar: 'granja.animales',
      titulo: T('tut.infra-granja.3.titulo', 'Elegir el animal'),
      texto: T(
        'tut.infra-granja.3.texto',
        'Cinco especies, y debajo de cada una cada cuántas horas le da hambre: la gallina cada 4, la vaca cada 12.',
      ),
    },
    {
      sel: 'granja.animal.gallina',
      alEntrar: () => g().setTipo('gallina'),
      titulo: T('tut.infra-granja.4.titulo', 'Poblar el corral'),
      texto: T(
        'tut.infra-granja.4.texto',
        'Toca dentro del corral y aparece el animal, ya con un nombre puesto. Si tocas fuera de todo corral, te construyo uno de 1×1 ahí mismo.',
      ),
    },
    {
      sel: 'granja.cesta',
      titulo: T('tut.infra-granja.5.titulo', 'La despensa'),
      texto: T(
        'tut.infra-granja.5.texto',
        'Aquí ves lo que has cosechado en el huerto. Si está vacía no puedes alimentar: la granja y el huerto son la misma cadena.',
      ),
    },
    {
      sel: 'granja.herr.alimentar',
      alEntrar: () => g().setHerramienta('alimentar'),
      titulo: T('tut.infra-granja.6.titulo', 'Alimentar'),
      texto: T(
        'tut.infra-granja.6.texto',
        'Un toque en el corral da de comer a todos los que tengan hambre, empezando por el más hambriento, y gasta de la cesta lo que más te sobre.',
      ),
    },
    {
      sel: 'granja.herr.mimar',
      alEntrar: () => g().setHerramienta('mimar'),
      titulo: T('tut.infra-granja.7.titulo', 'Mimar'),
      texto: T(
        'tut.infra-granja.7.texto',
        'Además de comida necesitan cariño: seis horas sin mimos y el animal se aburre. Un toque acaricia a todo el corral de golpe.',
      ),
    },
    {
      sel: 'granja.accesorios',
      alEntrar: () => g().setHerramienta('accesorio'),
      esperar: 'granja.accesorios',
      titulo: T('tut.infra-granja.8.titulo', 'Juguetes'),
      texto: T(
        'tut.infra-granja.8.texto',
        'Charco de lodo, tina de baño y pelota, uno por celda dentro del corral. Los animales van solos a usarlos, y jugar también les levanta el ánimo. Tocar la misma celda con el mismo juguete lo quita.',
      ),
    },
    {
      sel: 'granja.herr.nombrar',
      alEntrar: () => g().setHerramienta('nombrar'),
      titulo: T('tut.infra-granja.9.titulo', 'Nombres'),
      texto: T(
        'tut.infra-granja.9.texto',
        'Con Nombrar, toca un corral y aparece la lista de sus animales con el cupo usado. Toca uno para cambiarle el nombre.',
      ),
    },
    {
      sel: 'granja.herr.quitar',
      alEntrar: () => g().setHerramienta('quitar'),
      titulo: T('tut.infra-granja.10.titulo', 'Deshacer'),
      texto: T(
        'tut.infra-granja.10.texto',
        'Quitar va de uno en uno: primero el último animal que metiste, después el juguete de esa celda y, con el corral ya vacío, el corral.',
      ),
    },
    {
      titulo: T('tut.infra-granja.11.titulo', 'Cuidarlos sin abrir esto'),
      texto: T(
        'tut.infra-granja.11.texto',
        'En el juego normal, al caminar junto a un corral sale una burbuja sobre él con Alimentar y Acariciar. Para el día a día no necesitas abrir el editor, y también puedes pedírmelo por chat.',
      ),
    },
    {
      sel: 'granja.salir',
      titulo: T('tut.infra-granja.12.titulo', 'Listo'),
      texto: T(
        'tut.infra-granja.12.texto',
        'Se guarda solo. El hambre y el ánimo corren en tiempo real, así que date una vuelta por la granja de vez en cuando.',
      ),
    },
  ],
}
