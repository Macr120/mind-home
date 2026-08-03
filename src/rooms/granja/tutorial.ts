import type { TextoTut, TutorialDef } from '../../core/tutorial/tipos'
import { abrirEditorInfra } from '../../core/tutorial/infraEditor'
import { useGranja } from '../../core/state/granjaStore'
import { encenderParaTutorial } from '../_shared/ejemplos/tipos'
import { ejemploGranja } from './ejemplos'
import { focoCorral, focoZona } from '../../demo/mapa/focos'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

const g = () => useGranja.getState()

export const tutorialGranja: TutorialDef = {
  id: 'infra-granja',
  titulo: T('tut.infra-granja.titulo', 'Granja'),
  resumen: T(
    'tut.infra-granja.resumen',
    'Granja se construye en el mapa: levantas corrales rectangulares —caben tres animales por celda y se agrandan tocando una celda pegada— y los pueblas con gallinas, cerdos, cabras, ovejas, vacas y caballos, cada uno con su nombre. Comen de la cesta de Comida según su propia ventana de hambre y se aburren si pasan seis horas sin mimos. Puedes acariciarlos y ponerles juguetes desde el editor, o alimentarlos al pasar caminando junto al corral.',
  ),
  preparar: () => abrirEditorInfra(() => g().iniciar(), 'granja.header'),
  pasos: [
    {
      sel: 'granja.barra',
      alEntrar: async (ctx) => {
        await ctx.unaVez('ejemplo', async () => {
          const apagar = await encenderParaTutorial(ejemploGranja)
          if (apagar) ctx.alLimpiar(apagar)
        })
      },
      texto: T(
        'tut.infra-granja.1.texto',
        'Granja se construye sobre el mapa, no dentro de un cuarto. Estas son las herramientas; cada una se aplica en la celda que toques. Encendí un ejemplo con un corral y tres animales; se esconde al terminar.',
      ),
    },
    {
      sel: 'infra.campos',
      titulo: T('tut.infra-granja.campos.titulo', 'Comida y Granja, juntas'),
      texto: T(
        'tut.infra-granja.campos.texto',
        'Son el mismo editor con dos pestañas: en Comida siembras y cosechas, y aquí crías y cuidas a los animales que se comen esa cosecha. Cambias de una a otra sin salir al mapa.',
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
        'Seis especies, y junto a cada una cada cuántas horas le da hambre: la gallina cada 4, la vaca cada 12.',
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
        'Aquí ves lo que has cosechado en Comida. Si está vacía no puedes alimentar: Comida y Granja son la misma cadena.',
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
      sel: 'granja.herr.curar',
      alEntrar: () => g().setHerramienta('curar'),
      titulo: T('tut.infra-granja.13.titulo', 'Curar'),
      texto: T(
        'tut.infra-granja.13.texto',
        'Si la barra de comida lleva mucho tiempo en cero, el animal enferma: deja de comer y solo Curar lo levanta. Tienes una semana desde que te aviso; si no, se muere.',
      ),
    },
    {
      sel: 'granja.herr.limpiar',
      alEntrar: () => g().setHerramienta('limpiar'),
      titulo: T('tut.infra-granja.14.titulo', 'Limpiar'),
      texto: T(
        'tut.infra-granja.14.texto',
        'Cada corral se limpia al menos una vez por semana. Si se te pasa, la paja se ensucia y el ánimo de todos sus animales cae al doble de rápido.',
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
        'Se guarda solo. El hambre y el ánimo corren en tiempo real, así que date una vuelta por tus mascotas de vez en cuando.',
      ),
    },
  ],
}

// ─── Flujos de la casa demo: corren sobre el santuario de Pep@ (animales
// reales con hambre, ánimo y hasta un enfermo), sin crear ni borrar datos.
// El editor de la granja es jugable en demo: cuidar es parte del paseo.

const flujoCuidar: TutorialDef = {
  id: 'infra-granja--cuidar',
  titulo: T('tut.infra-granja--cuidar.titulo', 'Cuidar el santuario'),
  resumen: T(
    'tut.infra-granja--cuidar.resumen',
    'Alimentar, mimar, limpiar y curar a los rescatados del santuario — con un corral sucio y un cerdo enfermo esperándote de verdad.',
  ),
  // Sin `preparar`: el editor se abre en el paso 2, para que la panorámica del
  // paso 1 se vea con el mapa limpio (su barra ocupa todo el bajo de pantalla).
  pasos: [
    {
      zona: () => focoZona('zona-santuario'),
      texto: T(
        'tut.infra-granja--cuidar.8.texto',
        'Este es el santuario de Pep@: los corrales de los rescatados y, al sur, el huerto del que comen. Bajemos con ellos.',
      ),
    },
    {
      alEntrar: () => abrirEditorInfra(() => g().iniciar(), 'granja.header'),
      foco: () => focoCorral(0),
      sel: 'granja.barra',
      texto: T(
        'tut.infra-granja--cuidar.1.texto',
        'Estos son los rescatados del santuario de Pep@: cada uno con su nombre, su hambre y su ánimo corriendo en tiempo real. Nada es un ejemplo — puedes cuidarlos de verdad.',
      ),
    },
    {
      sel: 'granja.cesta',
      titulo: T('tut.infra-granja--cuidar.2.titulo', 'La despensa del año'),
      texto: T(
        'tut.infra-granja--cuidar.2.texto',
        'Alimentar consume de la cesta, y la cesta se llena cosechando el huerto de al lado. Pep@ dejó reservas de un año: úsalas.',
      ),
    },
    {
      sel: 'granja.herr.alimentar',
      alEntrar: () => g().setHerramienta('alimentar'),
      titulo: T('tut.infra-granja--cuidar.3.titulo', 'Alimentar'),
      texto: T(
        'tut.infra-granja--cuidar.3.texto',
        'Un toque en el corral da de comer a todos los que tengan hambre, empezando por el más hambriento. La gallina pide cada 4 horas; la vaca aguanta 12.',
      ),
    },
    {
      sel: 'granja.herr.mimar',
      alEntrar: () => g().setHerramienta('mimar'),
      titulo: T('tut.infra-granja--cuidar.4.titulo', 'Mimar'),
      texto: T(
        'tut.infra-granja--cuidar.4.texto',
        'Seis horas sin cariño y se aburren (el doble de rápido si el corral está sucio). Un toque acaricia a todo el corral.',
      ),
    },
    {
      sel: 'granja.herr.limpiar',
      // El corral chico (el sucio, y donde está el cerdo enfermo del paso 6).
      foco: () => focoCorral(1),
      alEntrar: () => g().setHerramienta('limpiar'),
      titulo: T('tut.infra-granja--cuidar.5.titulo', 'El corral sucio'),
      texto: T(
        'tut.infra-granja--cuidar.5.texto',
        'El corral chico lleva ocho días sin limpiarse — se le nota la paja. Tócalo con Limpiar y déjalo como nuevo: en la demo se puede.',
      ),
    },
    {
      sel: 'granja.herr.curar',
      alEntrar: () => g().setHerramienta('curar'),
      titulo: T('tut.infra-granja--cuidar.6.titulo', 'El recién llegado'),
      texto: T(
        'tut.infra-granja--cuidar.6.texto',
        'El cerdo llegó enfermo al santuario esta mañana. Un animal enfermo deja de comer y solo Curar lo levanta — tiene una semana antes de que sea tarde. Cúralo tú.',
      ),
    },
    {
      texto: T(
        'tut.infra-granja--cuidar.7.texto',
        'Para el día a día no hace falta abrir esto: al caminar junto a un corral sale su burbuja con Alimentar y Acariciar, y también puedes pedírmelo por chat.',
      ),
    },
  ],
}

const flujoCorrales: TutorialDef = {
  id: 'infra-granja--corrales',
  titulo: T('tut.infra-granja--corrales.titulo', 'Corrales y cupo'),
  resumen: T(
    'tut.infra-granja--corrales.resumen',
    'Cómo se levanta un corral, se puebla con sus especies, se le ponen juguetes y nombres.',
  ),
  preparar: () => abrirEditorInfra(() => g().iniciar(), 'granja.header'),
  pasos: [
    {
      sel: 'granja.herr.corral',
      zona: () => focoZona('zona-santuario'),
      foco: () => focoCorral(0),
      alEntrar: () => g().setHerramienta('corral'),
      titulo: T('tut.infra-granja--corrales.1.titulo', 'El corral'),
      texto: T(
        'tut.infra-granja--corrales.1.texto',
        'Toca una celda libre y nace un corral de 1×1; toca una pegada y se estira. Caben tres animales por celda: mira los dos del santuario, uno grande de pastoreo y uno chico de aves.',
      ),
    },
    {
      sel: 'granja.animales',
      alEntrar: () => g().setHerramienta('animal'),
      esperar: 'granja.animales',
      titulo: T('tut.infra-granja--corrales.2.titulo', 'Las especies'),
      texto: T(
        'tut.infra-granja--corrales.2.texto',
        'Seis especies, cada una con su ventana de hambre. Toca dentro de un corral con cupo y aparece con nombre puesto.',
      ),
    },
    {
      sel: 'granja.accesorios',
      alEntrar: () => g().setHerramienta('accesorio'),
      esperar: 'granja.accesorios',
      titulo: T('tut.infra-granja--corrales.3.titulo', 'Juguetes'),
      texto: T(
        'tut.infra-granja--corrales.3.texto',
        'Lodo, tina y pelota, uno por celda: los animales van solos y jugar les levanta el ánimo. El santuario ya tiene los tres repartidos.',
      ),
    },
    {
      sel: 'granja.herr.nombrar',
      alEntrar: () => g().setHerramienta('nombrar'),
      titulo: T('tut.infra-granja--corrales.4.titulo', 'Nombres'),
      texto: T(
        'tut.infra-granja--corrales.4.texto',
        'Con Nombrar tocas un corral y ves su lista con el cupo usado; toca un animal para renombrarlo.',
      ),
    },
    {
      texto: T(
        'tut.infra-granja--corrales.5.texto',
        'Eso es todo el oficio: corral, cupo, juguetes y cariño. En la demo puedes ampliar el santuario si te animas.',
      ),
    },
  ],
}

export const flujosGranja: TutorialDef[] = [flujoCuidar, flujoCorrales]
