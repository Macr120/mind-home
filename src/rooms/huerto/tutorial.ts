import type { TextoTut, TutorialDef } from '../../core/tutorial/tipos'
import { abrirEditorInfra } from '../../core/tutorial/infraEditor'
import { useHuerto } from '../../core/state/huertoStore'
import { cestaRepo } from '../../core/data/repository'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

const h = () => useHuerto.getState()

export const tutorialHuerto: TutorialDef = {
  // El id NO empieza por 'app-': eso dispararía el aviso de "app sin cuarto",
  // falso para una infraestructura (nunca se asigna a un objeto).
  id: 'infra-huerto',
  titulo: T('tut.infra-huerto.titulo', 'Huerto'),
  resumen: T(
    'tut.infra-huerto.resumen',
    'El huerto se construye sobre el mapa 3D: preparas parcelas de tierra y siembras seis especies que crecen en tiempo real. Piden riego cada cierto rato y, si te tardas, se marchitan sin remedio; un aspersor riega su celda y las ocho vecinas para siempre. Lo que cosechas cae en la cesta, que es la comida de los animales de la granja.',
  ),
  preparar: () => abrirEditorInfra(() => h().iniciar(), 'huerto.header'),
  pasos: [
    {
      sel: 'huerto.barra',
      texto: T(
        'tut.infra-huerto.1.texto',
        'El huerto no vive dentro de un cuarto: se construye sobre el mapa. Esta barra son tus herramientas, y cada toque se aplica en la celda del mapa que elijas.',
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
        'Un aspersor mantiene regadas su celda y las ocho vecinas para siempre. Es la forma de dejar el huerto solo sin que se te marchite.',
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
        'Todo lo cosechado se acumula aquí. Puse una zanahoria de ejemplo para que veas la cesta con algo dentro; se quita al terminar. La cesta es la despensa de la granja: alimentar consume una pieza de lo que más tengas.',
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
        'Todo se guarda solo. Sal con la ✕ y tu huerto sigue creciendo en el mapa mientras haces otras cosas. También puedes pedirme por chat «riega el huerto» o «cosecha el huerto».',
      ),
    },
  ],
}
