import biblioteca from '../rooms/biblioteca'
import hobbies from '../rooms/hobbies'
import idiomas from '../rooms/idiomas'
import entretenimiento from '../rooms/entretenimiento'
import garage from '../rooms/garage'
import jardin from '../rooms/jardin'
import sala from '../rooms/sala'
import cocina from '../rooms/cocina'
import ejercicio from '../rooms/ejercicio'
import despacho from '../rooms/despacho'
import diario from '../rooms/diario'
import descanso from '../rooms/descanso'
import anecdotario from '../rooms/anecdotario'
import caminos from '../rooms/caminos'
import canchas from '../rooms/canchas'
import huerto from '../rooms/huerto'
import granja from '../rooms/granja'
import paintball from '../rooms/paintball'
import ideas from '../rooms/ideas'
import computo from '../rooms/computo'
import agenda from '../rooms/agenda'
import metas from '../rooms/metas'
import { fijarPlantillasCustom, registrarPlantillasCodigo, type Plantilla } from './appContrato'

/**
 * QUÉ apps existen: el único módulo que importa los 21 cuartos.
 *
 * El CONTRATO de una app (tipos, coerciones) y las consultas al catálogo viven en
 * `./appContrato`, que es hoja. Aquí solo se arma la lista y se publica allá.
 * Los cuartos y los servicios del núcleo importan de `./appContrato`, NUNCA de
 * este archivo: importarlo desde un cuarto cierra un ciclo que en desarrollo
 * rompe el hot-reload (`Cannot access '<X>' before initialization`).
 *
 * Se re-exporta el contrato por comodidad de los consumidores que ya existían.
 */
export * from './appContrato'

/** Catálogo de plantillas (las apps). Antes eran los "cuartos" cableados. */
export const plantillas: Plantilla[] = [
  cocina,
  ejercicio,
  descanso,
  anecdotario,
  despacho,
  biblioteca,
  entretenimiento,
  sala,
  jardin,
  garage,
  diario,
  hobbies,
  idiomas,
  caminos,
  canchas,
  huerto,
  granja,
  paintball,
  ideas,
  computo,
  agenda,
  metas,
]

// Publica las apps de código en el catálogo hoja, de donde las leen todos.
registrarPlantillasCodigo(plantillas)

/** Descripción corta de cada plantilla (para el catálogo de asignación). */
export const DESCRIPCIONES: Record<string, string> = {
  cocina: 'Nutrición: comidas, macros, agua, plan semanal, recetario y lista del súper.',
  ejercicio: 'Rutinas de fuerza, resistencia y flexibilidad con metas.',
  descanso: 'Tu sueño como un cielo nocturno: horario, despertador, puntuación y registro de noches.',
  anecdotario: 'Tu diario personal: anécdotas con fotos y el ánimo de cada día.',
  despacho: 'Finanzas: presupuesto con gastos e ingresos (fijos y variables), metas (calculadoras financieras, ahorro/inversión, deuda) con simuladores y mercados en vivo (divisas, cripto, acciones y materias primas).',
  biblioteca: 'Enciclopedia conversacional: charlas con IA, entradas wiki y sesiones de estudio.',
  entretenimiento: 'Archivo de películas, series, libros y juegos de mesa.',
  sala: 'Viajes: mapamundi con pines, lugares por conocer, rutas y bitácora.',
  jardin: 'Calma: meditación con pistas de sonido, respiración y agradecimientos.',
  garage: 'Mantenimiento de tus vehículos, sus trámites en el calendario y la libreta de talleres.',
  diario: 'Periódico del día: titulares con imagen y efemérides, con reparto por asistentes.',
  hobbies: 'Pasatiempos: sesiones de práctica, rachas, metas y proyectos.',
  idiomas: 'Aprende idiomas: tutor conversacional con IA, vocabulario con repaso espaciado, temario por niveles y ejercicios.',
  caminos: 'Traza pistas de carreras, rieles de tren y montañas rusas sobre el mapa.',
  canchas: 'Coloca canchas de fútbol, tenis, básquet y béisbol en el mapa.',
  huerto: 'Prepara parcelas, siembra cultivos, riégalos y cosecha en tiempo real.',
  granja: 'Cría gallinas, cerdos, cabras, ovejas, vacas y caballos, y cultiva su comida en el mismo editor.',
  paintball: 'Batallas de paintball contra tus asistentes (1v1, 2v2 o campal) usando la casa como mapa.',
  ideas: 'Tu diario de ideas y lluvias, diez formatos de mapa conceptual en lienzo libre (mental, árbol, línea del tiempo, ciclo, pirámide, Venn…) y ocho diagramas para decidir (ventajas y desventajas, campo de fuerzas, FODA, Eisenhower, árbol de decisiones, tier list, matriz de decisión ponderada e Ishikawa), a mano o con IA.',
  computo:
    'Sala de cómputo: una calculadora científica de la que cuelga tu formulario de fórmulas en carpetas (Matemáticas, Física y Química de fábrica, editables), con ocho modos —un graficador con cuatro tipos (2D, polar, paramétrica y superficie 3D), binario y hexadecimal, matrices, sistemas de ecuaciones, conversión de unidades, propina y regla de tres—; y hojas de cálculo que se exportan a Excel y a PDF.',
  agenda: 'Tu agenda: pendientes de trabajo con tablero Kanban; salud en tres partes (la tuya con citas por especialidad, medicamentos, cuidados que se repiten y seguimiento de ciclo; las personas a tu cuidado; y las mascotas), y la libreta de contactos con sus cumpleaños.',
  metas: 'Lo que te propusiste, de toda la casa: la lista de metas con sus sub-metas y pasos, los planes que la IA propone para cada una (fases con fecha que se vuelven sub-metas reales) y el cronograma donde todo ocupa su periodo sobre el eje del tiempo.',
}

/**
 * Descripción de TRES PALABRAS de cada app de cuarto (bienvenida: bajo el
 * preview del cuarto no cabe un párrafo). Solo las plantillas de cuarto: la
 * infraestructura y las apps propias del usuario no salen en ese paso.
 */
export const CORTAS: Record<string, string> = {
  cocina: 'Comidas, macros y recetas',
  ejercicio: 'Rutinas, fuerza y metas',
  descanso: 'Horario, despertador y noches',
  anecdotario: 'Anécdotas, fotos y ánimo',
  despacho: 'Presupuesto, metas y mercados',
  biblioteca: 'Charlas, wiki y estudio',
  entretenimiento: 'Películas, series y juegos',
  sala: 'Mapamundi, rutas y bitácora',
  jardin: 'Meditación, respiración y calma',
  garage: 'Vehículos, trámites y talleres',
  diario: 'Titulares, imágenes y efemérides',
  hobbies: 'Practica, avanza y proyecta',
  idiomas: 'Tutor, vocabulario y ejercicios',
  ideas: 'Ideas, mapas y decisiones',
  computo: 'Calculadora, gráficas y hojas',
  agenda: 'Pendientes, salud y personas',
  metas: 'Metas, planes y cronograma',
}

/** Ids personalizados publicados la última vez: sus descripciones se retiran al reemplazarlos. */
let idsCustom: string[] = []

/**
 * Publica las plantillas personalizadas en el catálogo (reemplaza las anteriores).
 * Dependencia invertida: el store las sintetiza y las inyecta aquí para que
 * `getPlantilla` siga siendo síncrono para todos los consumidores.
 */
export function registrarPlantillasCustom(
  lista: Plantilla[],
  descripciones: Record<string, string>,
) {
  for (const id of idsCustom) delete DESCRIPCIONES[id]
  idsCustom = lista.map((p) => p.id)
  fijarPlantillasCustom(lista)
  Object.assign(DESCRIPCIONES, descripciones)
}
