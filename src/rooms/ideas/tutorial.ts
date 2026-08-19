/**
 * Flujos de Ideas: corren sobre el año de Pep@ en la casa demo. Los pasos
 * localizan sus mapas por los repos (leer sí se puede) y navegan con clicks
 * sobre las anclas — no crean datos.
 */
import type { TipoMapa } from '../../core/data/db'
import type { CuerpoTutorial, TextoTut } from '../../core/tutorial/tipos'
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

export const cuerpoDiario: CuerpoTutorial = {
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

export const cuerpoMapas: CuerpoTutorial = {
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
    {
      sel: 'ideas.mapas.ia',
      titulo: T('tut.app-ideas--mapas.4.titulo', 'Un mapa entero, de un tema'),
      texto: T(
        'tut.app-ideas--mapas.4.texto',
        'Dale un tema a la IA y arma el mapa completo, con sus nodos ya organizados: el punto de partida para un tema que no sabes por dónde empezar a ordenar.',
      ),
      alEntrar: () => {
        clickTut('ideas.tab.mapas')
      },
    },
    {
      sel: 'ideas.mapa.expandir',
      titulo: T('tut.app-ideas--mapas.5.titulo', 'Ampliar un nodo con IA'),
      texto: T(
        'tut.app-ideas--mapas.5.texto',
        'Ya dentro de un mapa, cualquier nodo se puede ampliar: la IA le propone sub-nodos según lo que ya escribiste alrededor, sin perder tu estructura.',
      ),
      alEntrar: async () => {
        clickTut('ideas.tab.mapas')
        await abrirMapaDeTipo('mental')
      },
    },
  ],
}

export const cuerpoDecidir: CuerpoTutorial = {
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
    {
      sel: 'ideas.matriz',
      titulo: T('tut.app-ideas--decidir.4.titulo', 'La matriz ponderada'),
      texto: T(
        'tut.app-ideas--decidir.4.texto',
        'No es un lienzo, es una tabla: cada opción contra cada criterio, con un peso del 1 al 5 por lo importante que te resulte ese criterio. El total ordena las opciones solo.',
      ),
      alEntrar: async () => {
        clickTut('ideas.tab.diagramas')
        await abrirMapaDeTipo('matriz')
      },
    },
  ],
}

/**
 * ESENCIAL: corre en la casa real y recorre los tres menús de Ideas uno por
 * uno. Sin datos de por medio: sus anclas son las pestañas raíz, que existen
 * con la BD vacía.
 */
export const cuerpoEsencial: CuerpoTutorial = {
  preparar: () => {
    abrirApp('ideas')
  },
  pasos: [
    {
      titulo: T('tut.app-ideas--esencial.1.titulo', 'Ideas'),
      texto: T(
        'tut.app-ideas--esencial.1.texto',
        'Ideas guarda lo que se te ocurre y lo ayuda a madurar: primero se anota, después se ordena en un mapa y, si hace falta, se compara para decidir. Son tres menús.',
      ),
    },
    {
      sel: 'ideas.tab.diario',
      titulo: T('tut.app-ideas--esencial.2.titulo', 'Diario de ideas'),
      texto: T(
        'tut.app-ideas--esencial.2.texto',
        'La bandeja donde cae cualquier ocurrencia, suelta o agrupada en una lluvia por tema. Se puede archivar en carpetas, destacar con estrella y, cuando madura, convertir en un mapa.',
      ),
      alEntrar: async () => {
        await esperarTut('ideas.tab.diario', 4000)
        clickTut('ideas.tab.diario')
      },
    },
    {
      sel: 'ideas.tab.mapas',
      titulo: T('tut.app-ideas--esencial.3.titulo', 'Mapas conceptuales'),
      texto: T(
        'tut.app-ideas--esencial.3.texto',
        'Un lienzo libre para ordenar un tema en el formato que le quede mejor: mental, árbol, flujo, línea del tiempo, ciclo, pirámide, Venn y más.',
      ),
      alEntrar: () => {
        clickTut('ideas.tab.mapas')
      },
    },
    {
      sel: 'ideas.tab.diagramas',
      titulo: T('tut.app-ideas--esencial.4.titulo', 'Diagramas de decisiones'),
      texto: T(
        'tut.app-ideas--esencial.4.texto',
        'El mismo lienzo, con formatos pensados para decidir: ventajas y desventajas con peso, FODA, Eisenhower o una matriz ponderada que ordena las opciones sola.',
      ),
      alEntrar: () => {
        clickTut('ideas.tab.diagramas')
      },
    },
  ],
}

