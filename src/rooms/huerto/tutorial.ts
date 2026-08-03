import type { TextoTut, TutorialDef } from '../../core/tutorial/tipos'
import { abrirEditorInfra } from '../../core/tutorial/infraEditor'
import { useHuerto } from '../../core/state/huertoStore'
import { cestaRepo } from '../../core/data/repository'
import { encenderParaTutorial } from '../_shared/ejemplos/tipos'
import { ejemploHuerto } from './ejemplos'
import { focoParcelas, focoZona } from '../../demo/mapa/focos'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

const h = () => useHuerto.getState()

export const tutorialHuerto: TutorialDef = {
  // El id NO empieza por 'app-': eso dispararía el aviso de "app sin cuarto",
  // falso para una infraestructura (nunca se asigna a un objeto).
  id: 'infra-huerto',
  titulo: T('tut.infra-huerto.titulo', 'Comida'),
  resumen: T(
    'tut.infra-huerto.resumen',
    'Comida se construye sobre el mapa 3D: preparas parcelas de tierra y siembras seis especies que crecen en tiempo real. Piden riego cada cierto rato y, si te tardas, se marchitan sin remedio; un aspersor riega su celda y las ocho vecinas para siempre. Lo que cosechas cae en la cesta, que es lo que comen tus mascotas.',
  ),
  preparar: () => abrirEditorInfra(() => h().iniciar(), 'huerto.header'),
  pasos: [
    {
      sel: 'huerto.barra',
      // El ejemplo planta cuatro parcelas en un hueco libre del mapa: sin nada
      // sembrado, las herramientas se explican sobre tierra vacía.
      alEntrar: async (ctx) => {
        await ctx.unaVez('ejemplo', async () => {
          const apagar = await encenderParaTutorial(ejemploHuerto)
          if (apagar) ctx.alLimpiar(apagar)
        })
      },
      texto: T(
        'tut.infra-huerto.1.texto',
        'Comida no vive dentro de un cuarto: se construye sobre el mapa. Esta barra son tus herramientas, y cada toque se aplica en la celda del mapa que elijas. Encendí un ejemplo con cuatro parcelas en las cuatro etapas; se esconde al terminar.',
      ),
    },
    {
      sel: 'infra.campos',
      titulo: T('tut.infra-huerto.campos.titulo', 'Comida y Granja, juntas'),
      texto: T(
        'tut.infra-huerto.campos.texto',
        'Son el mismo editor con dos pestañas: aquí siembras y cosechas, y en Granja crías a los animales que se comen esa cosecha. Cambias de una a otra sin salir al mapa.',
      ),
    },
    {
      sel: 'huerto.herr.parcela',
      alEntrar: () => h().setHerramienta('parcela'),
      titulo: T('tut.infra-huerto.2.titulo', 'Primero, la tierra'),
      texto: T(
        'tut.infra-huerto.2.texto',
        'Con Parcela tocas una celda y queda tierra lista para sembrar. Tocar de nuevo una parcela vacía la quita.',
      ),
    },
    {
      sel: 'huerto.especies',
      alEntrar: () => h().setHerramienta('sembrar'),
      esperar: 'huerto.especies',
      titulo: T('tut.infra-huerto.3.titulo', 'Elegir qué sembrar'),
      texto: T(
        'tut.infra-huerto.3.texto',
        'Al activar Sembrar aparecen las seis especies. Debajo de cada una ves cuánto tarda en estar lista y cada cuánto pide agua.',
      ),
    },
    {
      sel: 'huerto.especie.zanahoria',
      alEntrar: () => h().setEspecie('zanahoria'),
      titulo: T('tut.infra-huerto.4.titulo', 'Empieza por la zanahoria'),
      texto: T(
        'tut.infra-huerto.4.texto',
        'La zanahoria está lista en 3 minutos y la calabaza tarda 2 horas: para probar, siembra zanahoria. Con la especie elegida, toca una parcela para sembrarla.',
      ),
    },
    {
      sel: 'huerto.herr.regar',
      alEntrar: () => h().setHerramienta('regar'),
      titulo: T('tut.infra-huerto.5.titulo', 'Regar a tiempo'),
      texto: T(
        'tut.infra-huerto.5.texto',
        'Una gota azul sobre la planta significa que tiene sed. Si vence su ventana de riego antes de estar lista se marchita, y lo marchito ya no se salva con agua.',
      ),
    },
    {
      sel: 'huerto.herr.aspersor',
      alEntrar: () => h().setHerramienta('aspersor'),
      titulo: T('tut.infra-huerto.6.titulo', 'Regar sin estar encima'),
      texto: T(
        'tut.infra-huerto.6.texto',
        'Un aspersor mantiene regadas su celda y las ocho vecinas para siempre. Es la forma de dejar los cultivos solos sin que se te marchiten.',
      ),
    },
    {
      sel: 'huerto.herr.cosechar',
      alEntrar: () => h().setHerramienta('cosechar'),
      titulo: T('tut.infra-huerto.7.titulo', 'Cosechar'),
      texto: T(
        'tut.infra-huerto.7.texto',
        'Cuando la planta está lista ya no se marchita: cosecha con calma. También cosechas caminando por encima de lo que está listo, sin abrir el editor. La parcela queda libre para volver a sembrar.',
      ),
    },
    {
      sel: 'huerto.cesta',
      alEntrar: async (ctx) => {
        await ctx.unaVez('cesta-ejemplo', async () => {
          // Si ya hay cosecha real, no se toca la base de datos: el panel se pinta solo.
          const filas = await cestaRepo.list()
          if (filas.some((c) => c.cantidad > 0)) return
          const previa = filas.find((c) => c.especie === 'zanahoria')
          if (previa?.id != null) {
            const id = previa.id
            await cestaRepo.update(id, { cantidad: 1 })
            ctx.alLimpiar(async () => {
              await cestaRepo.update(id, { cantidad: 0 })
            })
          } else {
            const id = (await cestaRepo.add({ especie: 'zanahoria', cantidad: 1 })) as number
            ctx.datos.set('cestaId', id)
            ctx.alLimpiar(() => cestaRepo.remove(id))
          }
        })
      },
      esperar: 'huerto.cesta',
      titulo: T('tut.infra-huerto.8.titulo', 'La cesta'),
      texto: T(
        'tut.infra-huerto.8.texto',
        'Todo lo cosechado se acumula aquí. Puse una zanahoria de ejemplo para que veas la cesta con algo dentro; se quita al terminar. La cesta es la despensa de Mascotas: alimentar consume una pieza de lo que más tengas.',
      ),
    },
    {
      sel: 'huerto.herr.quitar',
      alEntrar: () => h().setHerramienta('quitar'),
      titulo: T('tut.infra-huerto.9.titulo', 'Deshacer'),
      texto: T(
        'tut.infra-huerto.9.texto',
        'Quitar va de uno en uno sobre la misma celda: primero la planta (o lo marchito), luego el aspersor y al final la parcela.',
      ),
    },
    {
      sel: 'huerto.salir',
      titulo: T('tut.infra-huerto.10.titulo', 'Listo'),
      texto: T(
        'tut.infra-huerto.10.texto',
        'Todo se guarda solo. Sal con la ✕ y tus cultivos siguen creciendo en el mapa mientras haces otras cosas. También puedes pedirme por chat «riega los cultivos» o «cosecha los cultivos».',
      ),
    },
  ],
}

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
