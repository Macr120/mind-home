/**
 * Flujos de Ideas: corren sobre el año de Pep@ en la casa demo. Los pasos
 * localizan sus mapas por los repos (leer sí se puede) y navegan con clicks
 * sobre las anclas — no crean datos.
 */
import type { TipoMapa } from '../../core/data/db'
import type { TextoTut, TutorialDef } from '../../core/tutorial/tipos'
import { abrirApp } from '../../core/abrirApp'
import { clickTut, esperarTut } from '../../core/tutorial/dom'
import { mapasIdeasRepo } from '../../core/data/repository'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

/** Abre el primer mapa de Pep@ de ese tipo (los ejemplos de fábrica no cuentan). */
async function abrirMapaDeTipo(tipo: TipoMapa): Promise<void> {
  const mapas = await mapasIdeasRepo.list()
  const m = mapas.find((x) => (x.tipo ?? 'mental') === tipo && !x.ejemplo)
  if (m?.id != null) {
    await esperarTut(`ideas.mapas.item.${m.id}`, 3000)
    clickTut(`ideas.mapas.item.${m.id}`)
  }
}

const flujoDiario: TutorialDef = {
  id: 'app-ideas--diario',
  titulo: T('tut.app-ideas--diario.titulo', 'Capturar ideas'),
  resumen: T(
    'tut.app-ideas--diario.resumen',
    'El diario de ideas captura ocurrencias sueltas o lluvias por tema; las destacas con estrella y las conviertes en mapas.',
  ),
  preparar: () => {
    abrirApp('ideas', 'diario')
  },
  pasos: [
    {
      sel: 'ideas.diario.alta',
      titulo: T('tut.app-ideas--diario.1.titulo', 'La bandeja'),
      texto: T(
        'tut.app-ideas--diario.1.texto',
        'Escribe la ocurrencia y ya. Pep@ soltó aquí ~90 ideas en el año: de física, de la cafetería, del entrenamiento. La estrella marca las favoritas.',
      ),
      alEntrar: () => {
        clickTut('ideas.tab.diario')
      },
    },
    {
      sel: 'ideas.diario.lluvia',
      titulo: T('tut.app-ideas--diario.2.titulo', 'Lluvias por tema'),
      texto: T(
        'tut.app-ideas--diario.2.texto',
        'Una lluvia agrupa todo bajo un tema. Busca las de Pep@: los nombres para la gata (ganó Laika), cómo pagar Japón y qué llevar al viaje.',
      ),
    },
    {
      texto: T(
        'tut.app-ideas--diario.3.texto',
        'Cuando una lluvia madura, un botón la convierte en mapa mental y sigues ordenándola en el lienzo.',
      ),
    },
  ],
}

const flujoMapas: TutorialDef = {
  id: 'app-ideas--mapas',
  titulo: T('tut.app-ideas--mapas.titulo', 'Los mapas de Pep@'),
  resumen: T(
    'tut.app-ideas--mapas.resumen',
    'Los mapas ordenan un tema en un lienzo libre: mental, árbol, flujo, línea del tiempo, ciclo, pirámide, Venn y más.',
  ),
  preparar: () => {
    abrirApp('ideas', 'mapas')
  },
  pasos: [
    {
      sel: 'ideas.mapas.tipos',
      titulo: T('tut.app-ideas--mapas.1.titulo', 'Diez formatos'),
      texto: T(
        'tut.app-ideas--mapas.1.texto',
        'Cada formato dibuja distinto. Abajo están los mapas que Pep@ hizo durante el año: su rutina de mañana en flujo, la termodinámica en árbol, física y música en Venn.',
      ),
      alEntrar: () => {
        clickTut('ideas.tab.mapas')
      },
    },
    {
      sel: 'ideas.mapa.lienzo',
      titulo: T('tut.app-ideas--mapas.2.titulo', '«Mi vida ideal»'),
      texto: T(
        'tut.app-ideas--mapas.2.texto',
        'El PRIMER mapa del año, del mes 1: la vida que Pep@ quería. Míralo con calma — casi todo lo que hay aquí acabó pasando.',
      ),
      alEntrar: async () => {
        clickTut('ideas.tab.mapas')
        await abrirMapaDeTipo('mental')
      },
    },
    {
      texto: T(
        'tut.app-ideas--mapas.3.texto',
        'En el lienzo: toca un nodo para elegirlo y otra vez para escribir; arrastra, haz zoom con pellizco y agrega ideas con la barra de abajo.',
      ),
    },
  ],
}

const flujoDecidir: TutorialDef = {
  id: 'app-ideas--decidir',
  titulo: T('tut.app-ideas--decidir.titulo', 'Decidir con diagramas'),
  resumen: T(
    'tut.app-ideas--decidir.resumen',
    'Los diagramas ayudan a decidir: ventajas y desventajas con peso, FODA, Eisenhower, matriz ponderada y más.',
  ),
  preparar: () => {
    abrirApp('ideas', 'diagramas')
  },
  pasos: [
    {
      sel: 'ideas.mapas.tipos',
      titulo: T('tut.app-ideas--decidir.1.titulo', 'Ocho formas de decidir'),
      texto: T(
        'tut.app-ideas--decidir.1.texto',
        'Pep@ los usó de verdad: un Eisenhower en semana de parciales, un FODA a mitad de año y una matriz para elegir cámara.',
      ),
      alEntrar: () => {
        clickTut('ideas.tab.diagramas')
      },
    },
    {
      sel: 'ideas.mapa.lienzo',
      titulo: T('tut.app-ideas--decidir.2.titulo', '¿Posgrado o trabajo?'),
      texto: T(
        'tut.app-ideas--decidir.2.texto',
        'LA decisión abierta del cierre del año: cada lado con su peso del 1 al 5 y el total abajo. Todavía no está decidida — así se ve pensar en serio.',
      ),
      alEntrar: async () => {
        clickTut('ideas.tab.diagramas')
        await abrirMapaDeTipo('proscontras')
      },
    },
    {
      texto: T(
        'tut.app-ideas--decidir.3.texto',
        'En los formatos por regiones cada elemento vive en una zona: elígela abajo antes de agregar, o arrástralo a otra y se cambia solo.',
      ),
    },
  ],
}

export const flujosIdeas: TutorialDef[] = [flujoDiario, flujoMapas, flujoDecidir]
