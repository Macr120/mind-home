import type { CuerpoTutorial, TextoTut } from '../../core/tutorial/tipos'
import { abrirEditorInfra } from '../../core/tutorial/infraEditor'
import { useGranja } from '../../core/state/granjaStore'
import { focoCorral, focoZona } from '../../demo/mapa/focos'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

const g = () => useGranja.getState()

// ─── Flujos de la casa demo: corren sobre el santuario de Pep@ (animales
// reales con hambre, ánimo y hasta un enfermo), sin crear ni borrar datos.
// El editor de la granja es jugable en demo: cuidar es parte del paseo.

export const cuerpoCuidar: CuerpoTutorial = {
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

export const cuerpoCorrales: CuerpoTutorial = {
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

