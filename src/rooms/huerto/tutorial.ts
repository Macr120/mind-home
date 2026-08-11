import type { TextoTut, TutorialDef } from '../../core/tutorial/tipos'
import { abrirEditorInfra } from '../../core/tutorial/infraEditor'
import { useHuerto } from '../../core/state/huertoStore'
import { focoParcelas, focoZona } from '../../demo/mapa/focos'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

const h = () => useHuerto.getState()

// ─── Flujos de la casa demo: corren sobre el santuario de Pep@ (un año de
// huerto ya VIVO), sin crear ni borrar datos. El editor del huerto es jugable
// en demo (sus tablas están permitidas), así que se abre de verdad.

const flujoCiclo: TutorialDef = {
  id: 'infra-huerto--ciclo',
  titulo: T('tut.infra-huerto--ciclo.titulo', 'El ciclo del huerto'),
  resumen: T(
    'tut.infra-huerto--ciclo.resumen',
    'Un paseo por el huerto vivo del santuario: las etapas de cada cultivo, el riego, la cosecha y la cesta con un año de trabajo.',
  ),
  // Sin `preparar`: el editor se abre en el paso 2, para que la panorámica del
  // paso 1 se vea con el mapa limpio (su barra ocupa todo el bajo de pantalla).
  pasos: [
    {
      zona: () => focoZona('zona-santuario'),
      texto: T(
        'tut.infra-huerto--ciclo.8.texto',
        'Este es el santuario de Pep@: a un lado los corrales y al otro el huerto que los alimenta. Vamos a las parcelas.',
      ),
    },
    {
      alEntrar: () => abrirEditorInfra(() => h().iniciar(), 'huerto.header'),
      foco: () => focoParcelas(),
      sel: 'huerto.barra',
      texto: T(
        'tut.infra-huerto--ciclo.1.texto',
        'Este es el huerto del santuario de Pep@: parcelas reales con un año de trabajo encima. Nada de esto es un ejemplo — está vivo, crece en tiempo real y puedes tocarlo.',
      ),
    },
    {
      sel: 'infra.campos',
      texto: T(
        'tut.infra-huerto--ciclo.2.texto',
        'Comida y Granja comparten editor: lo que se cosecha aquí llena la despensa de los animales de al lado. Es una sola cadena.',
      ),
    },
    {
      sel: 'huerto.herr.regar',
      alEntrar: () => h().setHerramienta('regar'),
      titulo: T('tut.infra-huerto--ciclo.3.titulo', 'El riego manda'),
      texto: T(
        'tut.infra-huerto--ciclo.3.texto',
        'Mira las parcelas: hay una semilla recién puesta, plantas a medio crecer, un girasol listo… y una zanahoria marchita que Pep@ dejó sin agua a propósito. La gota azul avisa la sed; lo marchito ya no se salva.',
      ),
    },
    {
      sel: 'huerto.herr.aspersor',
      alEntrar: () => h().setHerramienta('aspersor'),
      titulo: T('tut.infra-huerto--ciclo.4.titulo', 'Riego automático'),
      texto: T(
        'tut.infra-huerto--ciclo.4.texto',
        'El tomate tiene aspersor: riega su celda y las ocho vecinas para siempre. Así se deja el huerto solo sin que se marchite nada.',
      ),
    },
    {
      sel: 'huerto.herr.cosechar',
      alEntrar: () => h().setHerramienta('cosechar'),
      titulo: T('tut.infra-huerto--ciclo.5.titulo', 'Cosechar'),
      texto: T(
        'tut.infra-huerto--ciclo.5.texto',
        'El girasol está listo: un toque y a la cesta. También se cosecha caminando por encima de lo que está listo, sin abrir este editor.',
      ),
    },
    {
      sel: 'huerto.cesta',
      titulo: T('tut.infra-huerto--ciclo.6.titulo', 'Un año en la cesta'),
      texto: T(
        'tut.infra-huerto--ciclo.6.texto',
        'Cada parcela lleva la cuenta de sus cosechas y la cesta acumula las de todo el año — más de 400 piezas. De aquí comen los animales del santuario.',
      ),
    },
    {
      texto: T(
        'tut.infra-huerto--ciclo.7.texto',
        'Todo sigue corriendo al salir. En la demo puedes regar, cosechar y sembrar de verdad: pruébalo antes de irte.',
      ),
    },
  ],
}

const flujoParcelas: TutorialDef = {
  id: 'infra-huerto--parcelas',
  titulo: T('tut.infra-huerto--parcelas.titulo', 'Sembrar de cero'),
  resumen: T(
    'tut.infra-huerto--parcelas.resumen',
    'Cómo se prepara la tierra, se elige la especie y se deshace un error — probándolo de verdad en el santuario.',
  ),
  preparar: () => abrirEditorInfra(() => h().iniciar(), 'huerto.header'),
  pasos: [
    {
      sel: 'huerto.herr.parcela',
      zona: () => focoZona('zona-santuario'),
      foco: () => focoParcelas(),
      alEntrar: () => h().setHerramienta('parcela'),
      titulo: T('tut.infra-huerto--parcelas.1.titulo', 'Primero, la tierra'),
      texto: T(
        'tut.infra-huerto--parcelas.1.texto',
        'Con Parcela tocas una celda del mapa y queda tierra lista. En el santuario hay dos parcelas vacías esperándote.',
      ),
    },
    {
      sel: 'huerto.especies',
      alEntrar: () => h().setHerramienta('sembrar'),
      esperar: 'huerto.especies',
      titulo: T('tut.infra-huerto--parcelas.2.titulo', 'Elegir qué sembrar'),
      texto: T(
        'tut.infra-huerto--parcelas.2.texto',
        'Seis especies, y debajo de cada una cuánto tarda y cada cuánto pide agua: la zanahoria en 3 minutos, la calabaza en 2 horas.',
      ),
    },
    {
      sel: 'huerto.especie.zanahoria',
      alEntrar: () => h().setEspecie('zanahoria'),
      titulo: T('tut.infra-huerto--parcelas.3.titulo', 'La rápida'),
      texto: T(
        'tut.infra-huerto--parcelas.3.texto',
        'Para ver el ciclo completo hoy, siembra zanahoria en una parcela libre: estará lista antes de que termines de pasear.',
      ),
    },
    {
      sel: 'huerto.herr.quitar',
      alEntrar: () => h().setHerramienta('quitar'),
      titulo: T('tut.infra-huerto--parcelas.4.titulo', 'Deshacer'),
      texto: T(
        'tut.infra-huerto--parcelas.4.texto',
        'Quitar va de uno en uno sobre la misma celda: primero la planta, luego el aspersor y al final la parcela.',
      ),
    },
    {
      texto: T(
        'tut.infra-huerto--parcelas.5.texto',
        'Eso es todo: tierra, especie y paciencia. Lo que siembres en la demo crece de verdad mientras exploras el resto.',
      ),
    },
  ],
}

export const flujosHuerto: TutorialDef[] = [flujoCiclo, flujoParcelas]
