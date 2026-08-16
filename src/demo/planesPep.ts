/**
 * Los planes de metas de Pep@, escritos a mano: uno por app de la casa.
 *
 * Van aparte del contenido generado por `npm run demo:texto` por lo mismo que
 * `demo.programa.ts`: el generador trocea el año y solo sabe concatenar arrays de
 * primer nivel, y un plan es un árbol de dos niveles con enteros (`ini`/`fin`)
 * que tienen que cuadrar entre sí. Llegaría a medias y con los días inventados.
 *
 * Los tres primeros enseñan los tres ESTADOS que puede tener un plan:
 *   · maratón  → propuesta SIN plazo (la IA calculó la duración)
 *   · cocina   → propuesta con fecha límite; meta general, sin app
 *   · posgrado → ya pasado al cronograma (lo acepta el builder de biblioteca)
 *
 * El resto son los de cada cuarto y los reparte `metasPep.ts`, que es quien
 * decide a qué meta cuelga cada uno y si nace propuesto o aceptado. Cada plan
 * respeta la GUÍA que su app le da a la IA (`planMetas` en su plantilla): el de
 * viajes es un itinerario de sitios reales, el de biblioteca un plan de estudio,
 * el de hobbies las etapas de un proyecto…
 *
 * Los `ini`/`fin` son días RELATIVOS al día 0 del plan, nunca a su fase, igual
 * que lo que devuelve la IA de verdad (ver `NodoPlan` en `db.ts`).
 */
import type { EnlaceApp, EntradaPlan } from '../core/data/db'
import { planesMetaRepo } from '../core/data/repository'
import { tGlobal } from '../core/i18n/useT'
import type { NodoPropuesto } from '../core/planIA'
import { aplanar } from '../core/planMeta'
import type { PorIdioma } from '../core/i18n/porIdioma'

export interface PlanDemo {
  /** Solo el de la cocina: su meta no existe todavía y la crea el builder. */
  meta?: string
  /** La categoría propia bajo la que se agrupa esa meta en el panel de Metas. */
  categoria?: string
  resumen: string
  nodos: NodoPropuesto[]
}

const n = (nombre: string, ini: number, fin: number, hijos: NodoPropuesto[] = []): NodoPropuesto => ({
  nombre,
  ini,
  fin,
  hijos,
})

/** Las claves de plan que existen; `metasPep.ts` referencia una de estas. */
export type ClavePlan =
  | 'maraton'
  | 'cocina'
  | 'posgrado'
  | 'nutricion'
  | 'sueno'
  | 'memorias'
  | 'calma'
  | 'nocturno'
  | 'prototipo'
  | 'b2'
  | 'semestral'
  | 'racha'
  | 'archivo'
  | 'coche'
  | 'corea'
  | 'fondo'
  | 'formulario'

/** Atajo para el mapa de chips: sin sección, el paso lleva a la portada de la app. */
const a = (plantillaId: string, seccion?: string): EnlaceApp => ({
  plantillaId,
  ...(seccion ? { seccion } : {}),
})

/**
 * A qué app lleva cada paso: el chip que abre el sitio donde ESO se registra
 * («Tres litros de agua» → Cocina · Registro). La llave es el id que numera
 * `aplanar` —pre-orden: fase 1 = 1, sus hijos 2…k, fase 2 = k+1…—, la misma
 * convención que `hechos`; así el mapa vale para los DOS idiomas sin duplicar el
 * árbol (la estructura es la misma en `es` y en `en`).
 *
 * Solo llevan chip las HOJAS: una fase no es algo que se apunte. Y los pasos que
 * no se registran en ninguna app —pedir permisos, dejar el cojín a la vista,
 * enseñarle el álbum a la familia— se quedan sin él a propósito: es lo mismo que
 * hace la IA de verdad, que omite la llave cuando el paso no tiene dónde ir.
 *
 * Las secciones son las de `Plantilla.comandos` de cada app; una que no exista se
 * degradaría en silencio a la portada (ver `textoEnlace`).
 */
const ENLACES_DEMO: Record<ClavePlan, Record<number, EnlaceApp>> = {
  // Correr se apunta en Ejercicio; el desayuno del día D, en Cocina.
  maraton: {
    2: a('ejercicio', 'resistencia'),
    3: a('ejercicio', 'resistencia'),
    4: a('ejercicio', 'fuerza'),
    6: a('ejercicio', 'resistencia'),
    7: a('ejercicio', 'resistencia'),
    8: a('ejercicio', 'resistencia'),
    10: a('ejercicio', 'resistencia'),
    11: a('ejercicio', 'resistencia'),
    12: a('ejercicio', 'resistencia'),
    14: a('ejercicio', 'resistencia'),
    15: a('cocina', 'diario'),
  },
  // Una obra en casa: casi nada se registra en la casa digital, solo el diseño y
  // el presupuesto.
  cocina: {
    2: a('ideas', 'mapas'),
    3: a('despacho', 'gastos'),
  },
  posgrado: {
    2: a('ideas', 'diagramas'),
    3: a('agenda', 'trabajo'),
    5: a('biblioteca', 'estudio'),
    6: a('biblioteca', 'estudio'),
    7: a('agenda', 'trabajo'),
    9: a('agenda', 'personas'),
    10: a('agenda', 'trabajo'),
    12: a('ideas', 'diario'),
    13: a('agenda', 'personas'),
    14: a('agenda', 'trabajo'),
    16: a('agenda', 'trabajo'),
    17: a('despacho', 'gastos'),
  },
  nutricion: {
    2: a('cocina', 'diario'),
    3: a('cocina', 'diario'),
    4: a('cocina', 'diario'),
    6: a('cocina', 'diario'),
    7: a('cocina', 'plan'),
    8: a('cocina', 'diario'),
    10: a('cocina', 'progreso'),
    11: a('cocina', 'compras'),
    12: a('cocina', 'diario'),
  },
  // La cafeína no es sueño: se apunta en Cocina aunque la meta sea de Descanso.
  sueno: {
    2: a('descanso', 'sueno'),
    3: a('cocina', 'diario'),
    5: a('descanso', 'sueno'),
    6: a('descanso', 'sueno'),
    8: a('descanso', 'sueno'),
    9: a('descanso', 'sueno'),
  },
  memorias: {
    2: a('anecdotario', 'anecdotas'),
    3: a('anecdotario', 'anecdotas'),
    5: a('anecdotario', 'anecdotas'),
    6: a('anecdotario', 'anecdotas'),
    8: a('anecdotario', 'anecdotas'),
  },
  calma: {
    2: a('jardin', 'meditacion'),
    5: a('jardin', 'respiracion'),
    6: a('jardin', 'meditacion'),
    8: a('jardin', 'gratitud'),
  },
  nocturno: {
    2: a('hobbies', 'hobbies'),
    3: a('hobbies', 'hobbies'),
    5: a('hobbies', 'hobbies'),
    6: a('hobbies', 'hobbies'),
    8: a('hobbies', 'hobbies'),
    9: a('hobbies', 'hobbies'),
    11: a('hobbies', 'hobbies'),
  },
  prototipo: {
    2: a('ideas', 'mapas'),
    3: a('ideas', 'diagramas'),
    5: a('ideas', 'diario'),
    6: a('agenda', 'personas'),
    8: a('ideas', 'diario'),
    9: a('ideas', 'diagramas'),
  },
  b2: {
    2: a('idiomas', 'repaso'),
    3: a('idiomas', 'temario'),
    5: a('idiomas', 'temario'),
    6: a('idiomas', 'temario'),
    8: a('idiomas', 'charlas'),
    9: a('idiomas', 'charlas'),
    11: a('idiomas', 'repaso'),
    12: a('idiomas', 'repaso'),
  },
  // El marco teórico se estudia en Biblioteca; el laboratorio y la entrega son
  // trabajo de la Agenda.
  semestral: {
    2: a('biblioteca', 'enciclopedia'),
    3: a('biblioteca', 'estudio'),
    5: a('agenda', 'trabajo'),
    6: a('agenda', 'trabajo'),
    8: a('agenda', 'trabajo'),
    9: a('agenda', 'trabajo'),
  },
  racha: {
    2: a('diario', 'titulares'),
    5: a('diario', 'titulares'),
    6: a('diario', 'titulares'),
    8: a('diario', 'titulares'),
    9: a('diario', 'titulares'),
  },
  archivo: {
    2: a('entretenimiento', 'archivo'),
    3: a('entretenimiento', 'archivo'),
    5: a('entretenimiento', 'archivo'),
    6: a('entretenimiento', 'archivo'),
    8: a('entretenimiento', 'archivo'),
    9: a('entretenimiento', 'archivo'),
  },
  coche: {
    2: a('garage', 'vehiculos'),
    3: a('garage', 'vehiculos'),
    5: a('garage', 'vehiculos'),
    6: a('garage', 'vehiculos'),
    8: a('garage', 'vehiculos'),
    9: a('garage', 'vehiculos'),
  },
  corea: {
    2: a('sala', 'porConocer'),
    3: a('sala', 'porConocer'),
    4: a('sala', 'rutas'),
    6: a('sala', 'porConocer'),
    7: a('sala', 'porConocer'),
    9: a('sala', 'porConocer'),
    10: a('sala', 'bitacora'),
  },
  fondo: {
    2: a('despacho', 'gastos'),
    3: a('despacho', 'metas'),
    5: a('despacho', 'metas'),
    6: a('despacho', 'ingresos'),
    8: a('despacho', 'balance'),
    9: a('despacho', 'balance'),
  },
  // Física II: las fórmulas se guardan en el formulario, los problemas se
  // resuelven en la calculadora y el repaso se apunta como estudio.
  formulario: {
    2: a('computo', 'formulario'),
    3: a('computo', 'formulario'),
    5: a('computo', 'calculadora'),
    6: a('computo', 'calculadora'),
    8: a('biblioteca', 'estudio'),
    9: a('computo', 'hojas'),
  },
}

export const PLANES_DEMO: PorIdioma<Record<ClavePlan, PlanDemo>> = {
  es: {
    // ── Sin plazo: 24 semanas, termina 4 días antes del maratón de la meta ──
    maraton: {
      resumen:
        'Necesita 24 semanas: ocho de base suave para volver del maratón anterior, y a 10 horas por ' +
        'semana el bloque específico y el afinado no caben en menos sin repetir la lesión.',
      nodos: [
        n('Reconstruir la base sin dolor', 0, 55, [
          n('Correr 40 min a ritmo conversado', 0, 20),
          n('Sumar la tirada larga de 90 minutos', 21, 41),
          n('Fuerza de cadera dos veces por semana', 42, 55),
        ]),
        n('Volumen progresivo', 56, 104, [
          n('Subir a 60 km por semana sin molestias', 56, 76),
          n('Tirada larga de 2 h 30 min', 77, 90),
          n('Ocho repeticiones en cuesta', 91, 104),
        ]),
        n('Bloque específico de maratón', 105, 146, [
          n('Series de 1 km a ritmo de 10K', 105, 118),
          n('Tirada larga con 20 km a ritmo objetivo', 119, 132),
          n('Simulacro de 32 km con avituallamiento', 133, 146),
        ]),
        n('Afinar y llegar entero', 147, 167, [
          n('Bajar el volumen a la mitad', 147, 160),
          n('Ensayar desayuno y ritmo de salida', 161, 167),
        ]),
      ],
    },
    // ── Con fecha límite: 13 semanas exactas (día 0..90) ────────────────────
    cocina: {
      meta: 'Construir una cocina',
      categoria: 'Casa',
      resumen:
        'Construir una cocina funcional en 13 semanas con 5 horas semanales: planificación, ' +
        'instalación de estructura base, conexiones de agua y gas, electricidad, acabados y pruebas finales.',
      nodos: [
        n('Planificación y preparación', 0, 13, [
          n('Diseñar layout y seleccionar materiales', 0, 6),
          n('Obtener permisos y presupuestar', 7, 13),
        ]),
        n('Instalación de estructura base', 14, 34, [
          n('Desmontar cocina antigua y preparar espacio', 14, 20),
          n('Montar muebles base y cajonería', 21, 30),
          n('Instalar muebles altos y entrepaños', 31, 34),
        ]),
        n('Conexiones técnicas (agua y gas)', 35, 55, [
          n('Instalar tuberías de agua fría y caliente', 35, 44),
          n('Conectar fregadero y grifo', 45, 49),
          n('Instalar toma de gas de la estufa', 50, 55),
        ]),
        n('Instalación eléctrica', 56, 69, [
          n('Tender líneas y centro de carga', 56, 61),
          n('Colocar contactos y apagadores', 62, 65),
          n('Conectar campana e iluminación', 66, 69),
        ]),
        n('Acabados', 70, 83, [
          n('Instalar cubierta y salpicadero', 70, 76),
          n('Sellar juntas y pintar muros', 77, 80),
          n('Colocar herrajes y puertas', 81, 83),
        ]),
        n('Pruebas finales y entrega', 84, 90, [
          n('Probar fugas de agua y gas', 84, 86),
          n('Probar circuitos y electrodomésticos', 87, 88),
          n('Limpieza final y ajustes', 89, 90),
        ]),
      ],
    },
    // ── Ya aceptado: 21 semanas, el último día cae en la fecha de la meta ───
    posgrado: {
      resumen:
        'Veintiuna semanas para llegar a la fecha límite sin prisas: primero elegir programas, ' +
        'después el examen de admisión, y solo al final la carta de intención, que es lo que más se reescribe.',
      nodos: [
        n('Elegir programas y requisitos', 0, 27, [
          n('Comparar seis programas y sus fechas límite', 0, 13),
          n('Reunir requisitos y documentos de cada uno', 14, 27),
        ]),
        n('Examen de admisión', 28, 83, [
          n('Repasar álgebra lineal y ecuaciones diferenciales', 28, 48),
          n('Resolver tres exámenes de práctica completos', 49, 69),
          n('Presentar el examen de admisión', 70, 83),
        ]),
        n('Cartas y expediente', 84, 104, [
          n('Pedir tres cartas de recomendación', 84, 93),
          n('Traducir y certificar el expediente', 94, 104),
        ]),
        n('Carta de intención y portafolio', 105, 132, [
          n('Escribir el primer borrador de la carta', 105, 118),
          n('Revisarla con la profesora de astrofísica', 119, 125),
          n('Preparar el portafolio de proyectos', 126, 132),
        ]),
        n('Enviar las solicitudes', 133, 146, [
          n('Llenar los formularios de las seis escuelas', 133, 139),
          n('Pagar cuotas y enviar antes de la fecha', 140, 146),
        ]),
      ],
    },
    // ── Cocina · aceptado: comer para el maratón que viene ──────────────────
    nutricion: {
      resumen:
        'Veintitrés semanas atadas al calendario de entrenamiento: comer para entrenar mientras ' +
        'sube el volumen, ensayar la comida de carrera en las tiradas largas y dejar la carga para el final.',
      nodos: [
        n('Comer para entrenar', 0, 55, [
          n('Cerrar en 2 400 kcal los días de entreno', 0, 27),
          n('Desayunar antes de la tirada larga', 28, 41),
          n('Tres litros de agua los días de calor', 42, 55),
        ]),
        n('Probar la comida de carrera', 56, 111, [
          n('Gel y agua cada 45 min en las tiradas', 56, 76),
          n('Cena alta en carbohidratos la víspera', 77, 90),
          n('Repetir tres veces el desayuno del día D', 91, 111),
        ]),
        n('Carga y semana de carrera', 112, 163, [
          n('Subir a 7 g de carbohidrato por kilo', 112, 146),
          n('Dejar hecha la lista de la compra', 147, 156),
          n('Desayuno del maratón, sin novedades', 157, 163),
        ]),
      ],
    },
    // ── Descanso · aceptado: seis semanas para dormirse antes ───────────────
    sueno: {
      resumen:
        'Seis semanas en tres pasos: primero la hora de cierre, luego el cuarto, y solo al final ' +
        'medir — cambiar tres cosas a la vez no diría cuál funcionó.',
      nodos: [
        n('Cerrar el día a la misma hora', 0, 13, [
          n('Apagar pantallas a las 23:10', 0, 6),
          n('Nada de cafeína después de las 16:00', 7, 13),
        ]),
        n('Preparar el cuarto', 14, 27, [
          n('Bajar la luz una hora antes', 14, 20),
          n('Dejar el teléfono fuera de la recámara', 21, 27),
        ]),
        n('Medir y ajustar', 28, 41, [
          n('Anotar cuánto tardo en dormirme', 28, 34),
          n('Levantarme a la misma hora también el domingo', 35, 41),
        ]),
      ],
    },
    // ── Anecdotario · aceptado: los doce recuerdos del año ──────────────────
    memorias: {
      resumen:
        'Ocho semanas para cerrar el año escrito: rescatar lo que quedó a medias, sostener un ' +
        'recuerdo por semana y terminar con el álbum ordenado.',
      nodos: [
        n('Recuperar lo que falta', 0, 20, [
          n('Escribir los tres días del viaje que quedaron a medias', 0, 10),
          n('Ponerle foto a las entradas del bache', 11, 20),
        ]),
        n('Un recuerdo por semana', 21, 41, [
          n('Escribir el domingo por la noche', 21, 34),
          n('Elegir la foto del mes', 35, 41),
        ]),
        n('El álbum del año', 42, 55, [
          n('Repasar los doce y ordenarlos', 42, 48),
          n('Enseñárselo a la familia', 49, 55),
        ]),
      ],
    },
    // ── Jardín · propuesta: la calma no se acepta a la fuerza ───────────────
    calma: {
      resumen:
        'Cuatro semanas sin exigencia: encontrar el hueco de verdad, subir de cinco a diez minutos ' +
        'y dejarlo atado a algo que ya haces.',
      nodos: [
        n('Encontrar el momento', 0, 6, [
          n('Probar a meditar al volver del turno', 0, 3),
          n('Dejar el cojín a la vista', 4, 6),
        ]),
        n('Diez minutos seguidos', 7, 20, [
          n('Cinco días de respiración en caja', 7, 13),
          n('Subir de cinco a diez minutos', 14, 20),
        ]),
        n('Que se sostenga solo', 21, 27, [
          n('Escribir un agradecimiento al terminar', 21, 27),
        ]),
      ],
    },
    // ── Hobbies · propuesta: el nocturno, el siguiente proyecto del piano ───
    nocturno: {
      resumen:
        'Dieciséis semanas a cuatro horas por semana: dos leyendo la partitura, seis juntando manos, ' +
        'cuatro con el pedal y los adornos, y dos para tocarlo entero sin pararse.',
      nodos: [
        n('Leer la partitura', 0, 27, [
          n('Solfear las dos primeras páginas', 0, 13),
          n('Manos separadas a media velocidad', 14, 27),
        ]),
        n('Manos juntas', 28, 69, [
          n('Primera página completa', 28, 48),
          n('Segunda página completa', 49, 69),
        ]),
        n('El adorno y el pedal', 70, 97, [
          n('Los tresillos del compás 16', 70, 83),
          n('Pedal por armonía, no por compás', 84, 97),
        ]),
        n('Tocarlo entero', 98, 111, [
          n('Grabarme tres veces seguidas', 98, 104),
          n('Tocarlo para la familia', 105, 111),
        ]),
      ],
    },
    // ── Ideas · aceptado: de la lluvia de ideas a algo real ─────────────────
    prototipo: {
      resumen:
        'Diez semanas para dejar de darle vueltas: elegir una, hacer la versión de una tarde y ' +
        'decidir con lo que pase, no con lo que imagine.',
      nodos: [
        n('Elegir', 0, 13, [
          n('Puntuar las cinco finalistas del mapa', 0, 6),
          n('Descartar tres sin culpa', 7, 13),
        ]),
        n('Probarla en pequeño', 14, 41, [
          n('Hacer la versión de una tarde', 14, 27),
          n('Enseñársela a tres personas', 28, 41),
        ]),
        n('Decidir con datos', 42, 69, [
          n('Anotar qué salió mal', 42, 55),
          n('Diagrama de decisión: seguir o soltarla', 56, 69),
        ]),
      ],
    },
    // ── Idiomas · propuesta: del B1 al B2 ───────────────────────────────────
    b2: {
      resumen:
        'Veinte semanas: cerrar lo que quedó abierto del B1, ensanchar el vocabulario, soltar la ' +
        'lengua hablando y dejar los simulacros para el final.',
      nodos: [
        n('Cerrar el B1', 0, 34, [
          n('Repasar las tarjetas atrasadas', 0, 20),
          n('Terminar el temario de gramática', 21, 34),
        ]),
        n('Vocabulario de B2', 35, 83, [
          n('Cuarenta tarjetas nuevas por semana', 35, 62),
          n('Leer una noticia diaria en el idioma', 63, 83),
        ]),
        n('Hablar sin pensarlo', 84, 118, [
          n('Tres conversaciones largas por semana', 84, 104),
          n('Grabarme contando el día', 105, 118),
        ]),
        n('El examen', 119, 139, [
          n('Dos simulacros completos', 119, 132),
          n('Repasar solo lo que falla', 133, 139),
        ]),
      ],
    },
    // ── Agenda · aceptado: el proyecto semestral, casi entregado ────────────
    semestral: {
      resumen:
        'Ocho semanas para llegar a la entrega: marco teórico, laboratorio y una semana entera ' +
        'reservada para escribir y ensayar la defensa.',
      nodos: [
        n('Marco teórico', 0, 20, [
          n('Reunir las diez fuentes', 0, 10),
          n('Escribir el estado del arte', 11, 20),
        ]),
        n('Laboratorio', 21, 41, [
          n('Montar el experimento', 21, 30),
          n('Tres tandas de medidas', 31, 41),
        ]),
        n('Entrega', 42, 55, [
          n('Escribir resultados y conclusiones', 42, 48),
          n('Póster y ensayo de la defensa', 49, 55),
        ]),
      ],
    },
    // ── Noticias · aceptado: cuidar la racha de lectura ─────────────────────
    racha: {
      resumen:
        'Cuatro semanas para que leer la edición deje de depender de acordarse: un hueco fijo, el ' +
        'reparto entre los asistentes y un cierre de mes que se pueda mirar.',
      nodos: [
        n('Que no se me pase', 0, 9, [
          n('Leerla en el descanso del turno', 0, 4),
          n('Poner el aviso a las 14:00', 5, 9),
        ]),
        n('Repartir el trabajo', 10, 19, [
          n('Dar deportes y ciencia a dos asistentes', 10, 14),
          n('Escuchar el resumen mientras desayuno', 15, 19),
        ]),
        n('Cerrar el mes', 20, 27, [
          n('Guardar las tres noticias que valieron la pena', 20, 24),
          n('Contar la racha y anotarla', 25, 27),
        ]),
      ],
    },
    // ── Entretenimiento · propuesta: vaciar la lista de pendientes ──────────
    archivo: {
      resumen:
        'Doce semanas para vaciar los pendientes del archivo, de lo que ya está empezado a lo que ' +
        'lleva más tiempo esperando.',
      nodos: [
        n('Lo que ya empecé', 0, 27, [
          n('Terminar la serie que quedó en la mitad', 0, 13),
          n('Acabar el libro de la mesita', 14, 27),
        ]),
        n('Las películas pendientes', 28, 55, [
          n('Dos sesiones por semana', 28, 48),
          n('Escribir la reseña al terminar cada una', 49, 55),
        ]),
        n('El videojuego que lleva un año', 56, 83, [
          n('Retomarlo desde el último guardado', 56, 76),
          n('Puntuar y archivar todo lo visto', 77, 83),
        ]),
      ],
    },
    // ── Garaje · aceptado: el coche listo antes del invierno ────────────────
    coche: {
      resumen:
        'Ocho semanas ordenadas por urgencia: primero lo que la ley pide y tiene fecha, después lo ' +
        'que quedó tocado de la avería, y al final lo del frío.',
      nodos: [
        n('Lo que la ley pide', 0, 20, [
          n('Verificación del semestre', 0, 10),
          n('Renovar la tenencia', 11, 20),
        ]),
        n('Lo que quedó de la avería', 21, 41, [
          n('Frenos y líquido', 21, 30),
          n('Batería y bujías', 31, 41),
        ]),
        n('Antes del frío', 42, 55, [
          n('Llantas y presión', 42, 48),
          n('Revisar el anticongelante', 49, 55),
        ]),
      ],
    },
    // ── Sala · propuesta: el itinerario de Corea, doce días ─────────────────
    corea: {
      resumen:
        'Doce días de norte a sur: cuatro en Seúl para el jet lag, el centro histórico en el medio ' +
        'y Jeju al final, volando de vuelta desde Seúl.',
      nodos: [
        n('Seúl', 0, 4, [
          n('Gyeongbokgung y el barrio de Bukchon', 0, 1),
          n('Mercado de Gwangjang y Myeongdong', 2, 2),
          n('Excursión a la DMZ', 3, 4),
        ]),
        n('Gyeongju y Busan', 5, 8, [
          n('Tumbas reales y el templo Bulguksa', 5, 6),
          n('Gamcheon y el mercado de Jagalchi', 7, 8),
        ]),
        n('Isla de Jeju', 9, 11, [
          n('Amanecer en Seongsan Ilchulbong', 9, 10),
          n('Volver a Seúl y última noche', 11, 11),
        ]),
      ],
    },
    // ── Despacho · aceptado: el fondo que faltó el día de la avería ─────────
    fondo: {
      resumen:
        'Veinticuatro semanas para juntar tres meses de gastos fijos: primero saber cuánto es, ' +
        'después apartarlo el día de la quincena, y lo difícil — no tocarlo.',
      nodos: [
        n('Saber cuánto es', 0, 13, [
          n('Sumar los gastos fijos de tres meses', 0, 6),
          n('Fijar la meta y anotarla', 7, 13),
        ]),
        n('Apartar antes de gastar', 14, 90, [
          n('Domiciliar la transferencia el día de la quincena', 14, 48),
          n('Meter ahí lo que dejan las clases particulares', 49, 90),
        ]),
        n('No tocarlo', 91, 167, [
          n('Cuenta aparte, sin tarjeta', 91, 118),
          n('Revisar el saldo una vez al mes', 119, 167),
        ]),
      ],
    },
    formulario: {
      resumen:
        'Seis semanas, que es lo que queda hasta el parcial: primero tener las fórmulas juntas y ' +
        'entendidas, después resolver hasta que salgan sin mirar, y al final un caso propio.',
      nodos: [
        n('Reunir las fórmulas del temario', 0, 13, [
          n('Copiar las de cinemática y dinámica', 0, 6),
          n('Añadir las de energía con sus unidades', 7, 13),
        ]),
        n('Resolver hasta que salgan solas', 14, 34, [
          n('Diez problemas de tiro parabólico', 14, 23),
          n('Diez de energía y trabajo', 24, 34),
        ]),
        n('Cerrarlo con algo propio', 35, 41, [
          n('Repasar lo que sigue fallando', 35, 38),
          n('Montar la hoja de notas del semestre', 39, 41),
        ]),
      ],
    },
  },
  en: {
    maraton: {
      resumen:
        "It needs 24 weeks: eight of easy base to recover from the last marathon, and at 10 hours a " +
        "week the marathon block and the taper don't fit into less without repeating the injury.",
      nodos: [
        n('Rebuild the base without pain', 0, 55, [
          n('Run 40 min at conversational pace', 0, 20),
          n('Add the 90-minute long run', 21, 41),
          n('Hip strength work twice a week', 42, 55),
        ]),
        n('Build the volume', 56, 104, [
          n('Reach 60 km a week with no niggles', 56, 76),
          n('Long run of 2 h 30 min', 77, 90),
          n('Eight hill repeats', 91, 104),
        ]),
        n('Marathon-specific block', 105, 146, [
          n('1 km intervals at 10K pace', 105, 118),
          n('Long run with 20 km at goal pace', 119, 132),
          n('32 km dress rehearsal with fuelling', 133, 146),
        ]),
        n('Taper and arrive in one piece', 147, 167, [
          n('Cut the volume in half', 147, 160),
          n('Rehearse breakfast and starting pace', 161, 167),
        ]),
      ],
    },
    cocina: {
      meta: 'Build a kitchen',
      categoria: 'Home',
      resumen:
        'Build a working kitchen in 13 weeks at 5 hours a week: planning, base structure install, ' +
        'water and gas connections, electrics, finishes and final tests.',
      nodos: [
        n('Planning and prep', 0, 13, [
          n('Design the layout and pick materials', 0, 6),
          n('Get permits and set the budget', 7, 13),
        ]),
        n('Base structure install', 14, 34, [
          n('Strip the old kitchen and clear the space', 14, 20),
          n('Fit base units and drawers', 21, 30),
          n('Fit wall units and shelving', 31, 34),
        ]),
        n('Water and gas connections', 35, 55, [
          n('Run the hot and cold water pipes', 35, 44),
          n('Connect the sink and tap', 45, 49),
          n('Fit the gas supply for the stove', 50, 55),
        ]),
        n('Electrics', 56, 69, [
          n('Run the lines and the consumer unit', 56, 61),
          n('Fit sockets and switches', 62, 65),
          n('Wire the hood and the lighting', 66, 69),
        ]),
        n('Finishes', 70, 83, [
          n('Fit the worktop and the splashback', 70, 76),
          n('Seal the joints and paint the walls', 77, 80),
          n('Fit the handles and the doors', 81, 83),
        ]),
        n('Final tests and handover', 84, 90, [
          n('Test for water and gas leaks', 84, 86),
          n('Test circuits and appliances', 87, 88),
          n('Final clean and adjustments', 89, 90),
        ]),
      ],
    },
    posgrado: {
      resumen:
        "Twenty-one weeks to reach the deadline without rushing: pick the programmes first, then the " +
        "entrance exam, and leave the statement of purpose for last — it's the one you rewrite most.",
      nodos: [
        n('Pick programmes and requirements', 0, 27, [
          n('Compare six programmes and their deadlines', 0, 13),
          n("Gather each one's requirements and papers", 14, 27),
        ]),
        n('Entrance exam', 28, 83, [
          n('Review linear algebra and differential equations', 28, 48),
          n('Sit three full practice papers', 49, 69),
          n('Take the entrance exam', 70, 83),
        ]),
        n('Letters and transcript', 84, 104, [
          n('Ask for three recommendation letters', 84, 93),
          n('Translate and certify the transcript', 94, 104),
        ]),
        n('Statement of purpose and portfolio', 105, 132, [
          n('Write the first draft of the statement', 105, 118),
          n('Review it with the astrophysics professor', 119, 125),
          n('Put the project portfolio together', 126, 132),
        ]),
        n('Send the applications', 133, 146, [
          n('Fill in the forms for the six schools', 133, 139),
          n('Pay the fees and send before the deadline', 140, 146),
        ]),
      ],
    },
    nutricion: {
      resumen:
        'Twenty-three weeks tied to the training calendar: eat for the training while the volume ' +
        'climbs, rehearse race food on the long runs, and leave the carb load for the end.',
      nodos: [
        n('Eat for the training', 0, 55, [
          n('Close at 2,400 kcal on training days', 0, 27),
          n('Have breakfast before the long run', 28, 41),
          n('Three litres of water on hot days', 42, 55),
        ]),
        n('Rehearse the race food', 56, 111, [
          n('Gel and water every 45 min on long runs', 56, 76),
          n('High-carb dinner the night before', 77, 90),
          n('Repeat race-day breakfast three times', 91, 111),
        ]),
        n('Carb load and race week', 112, 163, [
          n('Go up to 7 g of carbs per kilo', 112, 146),
          n('Have the shopping list ready', 147, 156),
          n('Marathon breakfast, no surprises', 157, 163),
        ]),
      ],
    },
    sueno: {
      resumen:
        'Six weeks in three steps: the closing time first, then the room, and only at the end the ' +
        'measuring — changing three things at once would never say which one worked.',
      nodos: [
        n('Close the day at the same time', 0, 13, [
          n('Screens off at 23:10', 0, 6),
          n('No caffeine after 16:00', 7, 13),
        ]),
        n('Set the room up', 14, 27, [
          n('Dim the lights an hour before', 14, 20),
          n('Leave the phone out of the bedroom', 21, 27),
        ]),
        n('Measure and adjust', 28, 41, [
          n('Log how long it takes me to fall asleep', 28, 34),
          n('Get up at the same time on Sundays too', 35, 41),
        ]),
      ],
    },
    memorias: {
      resumen:
        'Eight weeks to close the year in writing: rescue what was left half done, keep one memory ' +
        'a week, and finish with the album in order.',
      nodos: [
        n('Catch up on what is missing', 0, 20, [
          n('Write the three trip days left half done', 0, 10),
          n('Add a photo to the rough-patch entries', 11, 20),
        ]),
        n('One memory a week', 21, 41, [
          n('Write on Sunday night', 21, 34),
          n('Pick the photo of the month', 35, 41),
        ]),
        n('The album of the year', 42, 55, [
          n('Go through the twelve and order them', 42, 48),
          n('Show it to the family', 49, 55),
        ]),
      ],
    },
    calma: {
      resumen:
        'Four weeks with no pressure: find the slot that actually exists, go from five to ten ' +
        'minutes, and hook it to something you already do.',
      nodos: [
        n('Find the moment', 0, 6, [
          n('Try meditating after the shift', 0, 3),
          n('Leave the cushion in sight', 4, 6),
        ]),
        n('Ten minutes straight', 7, 20, [
          n('Five days of box breathing', 7, 13),
          n('Go from five to ten minutes', 14, 20),
        ]),
        n('Make it hold on its own', 21, 27, [
          n('Write one thank-you when finishing', 21, 27),
        ]),
      ],
    },
    nocturno: {
      resumen:
        'Sixteen weeks at four hours a week: two reading the score, six putting the hands together, ' +
        'four on pedal and ornaments, and two to play it through without stopping.',
      nodos: [
        n('Read the score', 0, 27, [
          n('Sight-read the first two pages', 0, 13),
          n('Hands separately at half speed', 14, 27),
        ]),
        n('Hands together', 28, 69, [
          n('First page complete', 28, 48),
          n('Second page complete', 49, 69),
        ]),
        n('Ornaments and pedal', 70, 97, [
          n('The triplets in bar 16', 70, 83),
          n('Pedal by harmony, not by bar', 84, 97),
        ]),
        n('Play it through', 98, 111, [
          n('Record myself three times in a row', 98, 104),
          n('Play it for the family', 105, 111),
        ]),
      ],
    },
    prototipo: {
      resumen:
        'Ten weeks to stop turning it over: pick one, build the one-afternoon version, and decide ' +
        'with what happens, not with what I imagine.',
      nodos: [
        n('Choose', 0, 13, [
          n('Score the five finalists from the map', 0, 6),
          n('Drop three without guilt', 7, 13),
        ]),
        n('Try it small', 14, 41, [
          n('Build the one-afternoon version', 14, 27),
          n('Show it to three people', 28, 41),
        ]),
        n('Decide with data', 42, 69, [
          n('Write down what went wrong', 42, 55),
          n('Decision diagram: carry on or let it go', 56, 69),
        ]),
      ],
    },
    b2: {
      resumen:
        'Twenty weeks: close what B1 left open, widen the vocabulary, loosen the tongue by talking, ' +
        'and leave the mock exams for the end.',
      nodos: [
        n('Close B1', 0, 34, [
          n('Review the overdue cards', 0, 20),
          n('Finish the grammar syllabus', 21, 34),
        ]),
        n('B2 vocabulary', 35, 83, [
          n('Forty new cards a week', 35, 62),
          n('Read one news story a day in the language', 63, 83),
        ]),
        n('Speak without thinking', 84, 118, [
          n('Three long conversations a week', 84, 104),
          n('Record myself telling the day', 105, 118),
        ]),
        n('The exam', 119, 139, [
          n('Two full mock exams', 119, 132),
          n('Review only what fails', 133, 139),
        ]),
      ],
    },
    semestral: {
      resumen:
        'Eight weeks to reach the hand-in: theory, lab work, and a whole week set aside to write up ' +
        'and rehearse the defence.',
      nodos: [
        n('Theory', 0, 20, [
          n('Gather the ten sources', 0, 10),
          n('Write the state of the art', 11, 20),
        ]),
        n('Lab', 21, 41, [
          n('Set the experiment up', 21, 30),
          n('Three rounds of measurements', 31, 41),
        ]),
        n('Hand-in', 42, 55, [
          n('Write results and conclusions', 42, 48),
          n('Poster and defence rehearsal', 49, 55),
        ]),
      ],
    },
    racha: {
      resumen:
        'Four weeks so that reading the edition stops depending on remembering: a fixed slot, the ' +
        'assistants sharing it out, and a month-end worth looking at.',
      nodos: [
        n('So it does not slip by', 0, 9, [
          n('Read it on the shift break', 0, 4),
          n('Set the reminder at 14:00', 5, 9),
        ]),
        n('Share the work out', 10, 19, [
          n('Give sports and science to two assistants', 10, 14),
          n('Listen to the summary over breakfast', 15, 19),
        ]),
        n('Close the month', 20, 27, [
          n('Keep the three stories that were worth it', 20, 24),
          n('Count the streak and write it down', 25, 27),
        ]),
      ],
    },
    archivo: {
      resumen:
        'Twelve weeks to empty the archive backlog, from what is already started to what has been ' +
        'waiting the longest.',
      nodos: [
        n('What I already started', 0, 27, [
          n('Finish the series left halfway', 0, 13),
          n('Finish the book on the nightstand', 14, 27),
        ]),
        n('The pending films', 28, 55, [
          n('Two sittings a week', 28, 48),
          n('Write the review after each one', 49, 55),
        ]),
        n('The game that has waited a year', 56, 83, [
          n('Pick it up from the last save', 56, 76),
          n('Rate and archive everything watched', 77, 83),
        ]),
      ],
    },
    coche: {
      resumen:
        'Eight weeks ordered by urgency: first what the law asks for and has a date, then what the ' +
        'breakdown left behind, and the cold-weather bits at the end.',
      nodos: [
        n('What the law asks for', 0, 20, [
          n('This half-year emissions test', 0, 10),
          n('Renew the road tax', 11, 20),
        ]),
        n('What the breakdown left', 21, 41, [
          n('Brakes and fluid', 21, 30),
          n('Battery and spark plugs', 31, 41),
        ]),
        n('Before the cold', 42, 55, [
          n('Tyres and pressure', 42, 48),
          n('Check the antifreeze', 49, 55),
        ]),
      ],
    },
    corea: {
      resumen:
        'Twelve days from north to south: four in Seoul for the jet lag, the historic centre in the ' +
        'middle and Jeju at the end, flying home out of Seoul.',
      nodos: [
        n('Seoul', 0, 4, [
          n('Gyeongbokgung and the Bukchon quarter', 0, 1),
          n('Gwangjang market and Myeongdong', 2, 2),
          n('Day trip to the DMZ', 3, 4),
        ]),
        n('Gyeongju and Busan', 5, 8, [
          n('Royal tombs and the Bulguksa temple', 5, 6),
          n('Gamcheon and the Jagalchi market', 7, 8),
        ]),
        n('Jeju Island', 9, 11, [
          n('Sunrise at Seongsan Ilchulbong', 9, 10),
          n('Back to Seoul and the last night', 11, 11),
        ]),
      ],
    },
    fondo: {
      resumen:
        'Twenty-four weeks to put together three months of fixed costs: work out how much it is, ' +
        'move it on payday, and the hard part — leave it alone.',
      nodos: [
        n('Work out how much', 0, 13, [
          n('Add up three months of fixed costs', 0, 6),
          n('Set the target and write it down', 7, 13),
        ]),
        n('Move it before spending', 14, 90, [
          n('Standing order on payday', 14, 48),
          n('Put the tutoring money in there', 49, 90),
        ]),
        n('Leave it alone', 91, 167, [
          n('Separate account, no card', 91, 118),
          n('Check the balance once a month', 119, 167),
        ]),
      ],
    },
    formulario: {
      resumen:
        'Six weeks, which is what is left before the midterm: first get the formulas together and ' +
        'understood, then solve until they come out without looking, and finish with something of your own.',
      nodos: [
        n('Gather the formulas for the syllabus', 0, 13, [
          n('Copy the kinematics and dynamics ones', 0, 6),
          n('Add the energy ones with their units', 7, 13),
        ]),
        n('Solve until they come out on their own', 14, 34, [
          n('Ten projectile motion problems', 14, 23),
          n('Ten on energy and work', 24, 34),
        ]),
        n('Close it with something of your own', 35, 41, [
          n('Go over what still trips you up', 35, 38),
          n('Build the term grades sheet', 39, 41),
        ]),
      ],
    },
  },
  pt: {
    maraton: {
      resumen:
        'Precisa de 24 semanas: oito de base leve para se recuperar da última maratona, e a 10 horas ' +
        'por semana o bloco específico e o polimento não cabem em menos tempo sem repetir a lesão.',
      nodos: [
        n('Reconstruir a base sem dor', 0, 55, [
          n('Correr 40 min em ritmo de conversa', 0, 20),
          n('Somar o treino longo de 90 minutos', 21, 41),
          n('Força de quadril duas vezes por semana', 42, 55),
        ]),
        n('Volume progressivo', 56, 104, [
          n('Subir a 60 km por semana sem dores', 56, 76),
          n('Treino longo de 2 h 30 min', 77, 90),
          n('Oito repetições em subida', 91, 104),
        ]),
        n('Bloco específico de maratona', 105, 146, [
          n('Séries de 1 km em ritmo de 10K', 105, 118),
          n('Treino longo com 20 km em ritmo objetivo', 119, 132),
          n('Simulado de 32 km com reposição', 133, 146),
        ]),
        n('Polir e chegar inteiro', 147, 167, [
          n('Reduzir o volume pela metade', 147, 160),
          n('Ensaiar café da manhã e ritmo de largada', 161, 167),
        ]),
      ],
    },
    cocina: {
      meta: 'Construir uma cozinha',
      categoria: 'Casa',
      resumen:
        'Construir uma cozinha funcional em 13 semanas com 5 horas semanais: planejamento, instalação ' +
        'da estrutura base, ligações de água e gás, elétrica, acabamentos e testes finais.',
      nodos: [
        n('Planejamento e preparação', 0, 13, [
          n('Desenhar o layout e escolher materiais', 0, 6),
          n('Obter licenças e definir o orçamento', 7, 13),
        ]),
        n('Instalação da estrutura base', 14, 34, [
          n('Desmontar a cozinha antiga e liberar o espaço', 14, 20),
          n('Montar armários base e gavetas', 21, 30),
          n('Instalar armários altos e prateleiras', 31, 34),
        ]),
        n('Ligações técnicas (água e gás)', 35, 55, [
          n('Instalar tubulação de água fria e quente', 35, 44),
          n('Conectar a pia e a torneira', 45, 49),
          n('Instalar a saída de gás do fogão', 50, 55),
        ]),
        n('Instalação elétrica', 56, 69, [
          n('Passar os fios e o quadro de disjuntores', 56, 61),
          n('Colocar tomadas e interruptores', 62, 65),
          n('Ligar a coifa e a iluminação', 66, 69),
        ]),
        n('Acabamentos', 70, 83, [
          n('Instalar bancada e revestimento', 70, 76),
          n('Vedar as juntas e pintar as paredes', 77, 80),
          n('Colocar ferragens e portas', 81, 83),
        ]),
        n('Testes finais e entrega', 84, 90, [
          n('Testar vazamentos de água e gás', 84, 86),
          n('Testar circuitos e eletrodomésticos', 87, 88),
          n('Limpeza final e ajustes', 89, 90),
        ]),
      ],
    },
    posgrado: {
      resumen:
        'Vinte e uma semanas para chegar ao prazo final sem pressa: primeiro escolher os programas, ' +
        'depois o exame de admissão, e só no fim a carta de intenção, que é o que mais se reescreve.',
      nodos: [
        n('Escolher programas e requisitos', 0, 27, [
          n('Comparar seis programas e seus prazos', 0, 13),
          n('Reunir requisitos e documentos de cada um', 14, 27),
        ]),
        n('Exame de admissão', 28, 83, [
          n('Revisar álgebra linear e equações diferenciais', 28, 48),
          n('Resolver três provas de prática completas', 49, 69),
          n('Fazer o exame de admissão', 70, 83),
        ]),
        n('Cartas e histórico', 84, 104, [
          n('Pedir três cartas de recomendação', 84, 93),
          n('Traduzir e autenticar o histórico', 94, 104),
        ]),
        n('Carta de intenção e portfólio', 105, 132, [
          n('Escrever o primeiro rascunho da carta', 105, 118),
          n('Revisá-la com a professora de astrofísica', 119, 125),
          n('Preparar o portfólio de projetos', 126, 132),
        ]),
        n('Enviar as inscrições', 133, 146, [
          n('Preencher os formulários das seis escolas', 133, 139),
          n('Pagar as taxas e enviar antes do prazo', 140, 146),
        ]),
      ],
    },
    nutricion: {
      resumen:
        'Vinte e três semanas presas ao calendário de treino: comer para treinar enquanto o volume ' +
        'sobe, ensaiar a comida de prova nos treinos longos e deixar a carga de carboidrato para o final.',
      nodos: [
        n('Comer para treinar', 0, 55, [
          n('Fechar em 2.400 kcal nos dias de treino', 0, 27),
          n('Tomar café da manhã antes do treino longo', 28, 41),
          n('Três litros de água nos dias de calor', 42, 55),
        ]),
        n('Testar a comida de prova', 56, 111, [
          n('Gel e água a cada 45 min nos treinos longos', 56, 76),
          n('Jantar rico em carboidratos na véspera', 77, 90),
          n('Repetir três vezes o café da manhã do dia D', 91, 111),
        ]),
        n('Carga e semana de prova', 112, 163, [
          n('Subir a 7 g de carboidrato por quilo', 112, 146),
          n('Deixar pronta a lista de compras', 147, 156),
          n('Café da manhã da maratona, sem novidades', 157, 163),
        ]),
      ],
    },
    sueno: {
      resumen:
        'Seis semanas em três passos: primeiro o horário de encerrar o dia, depois o quarto, e só no ' +
        'final medir — mudar três coisas ao mesmo tempo não diria qual funcionou.',
      nodos: [
        n('Encerrar o dia sempre na mesma hora', 0, 13, [
          n('Desligar as telas às 23:10', 0, 6),
          n('Nada de cafeína depois das 16:00', 7, 13),
        ]),
        n('Preparar o quarto', 14, 27, [
          n('Diminuir a luz uma hora antes', 14, 20),
          n('Deixar o celular fora do quarto', 21, 27),
        ]),
        n('Medir e ajustar', 28, 41, [
          n('Anotar quanto tempo demoro para dormir', 28, 34),
          n('Levantar na mesma hora também aos domingos', 35, 41),
        ]),
      ],
    },
    memorias: {
      resumen:
        'Oito semanas para fechar o ano por escrito: resgatar o que ficou pela metade, sustentar uma ' +
        'memória por semana e terminar com o álbum organizado.',
      nodos: [
        n('Recuperar o que falta', 0, 20, [
          n('Escrever os três dias da viagem que ficaram pela metade', 0, 10),
          n('Colocar foto nas entradas do período difícil', 11, 20),
        ]),
        n('Uma memória por semana', 21, 41, [
          n('Escrever no domingo à noite', 21, 34),
          n('Escolher a foto do mês', 35, 41),
        ]),
        n('O álbum do ano', 42, 55, [
          n('Rever as doze e organizá-las', 42, 48),
          n('Mostrar para a família', 49, 55),
        ]),
      ],
    },
    calma: {
      resumen:
        'Quatro semanas sem exigência: encontrar o horário que realmente existe, subir de cinco para ' +
        'dez minutos e amarrar isso a algo que você já faz.',
      nodos: [
        n('Encontrar o momento', 0, 6, [
          n('Tentar meditar ao voltar do turno', 0, 3),
          n('Deixar a almofada à vista', 4, 6),
        ]),
        n('Dez minutos seguidos', 7, 20, [
          n('Cinco dias de respiração quadrada', 7, 13),
          n('Subir de cinco para dez minutos', 14, 20),
        ]),
        n('Fazer com que se sustente sozinho', 21, 27, [
          n('Escrever um agradecimento ao terminar', 21, 27),
        ]),
      ],
    },
    nocturno: {
      resumen:
        'Dezesseis semanas a quatro horas por semana: duas lendo a partitura, seis juntando as mãos, ' +
        'quatro com o pedal e os ornamentos, e duas para tocá-lo inteiro sem parar.',
      nodos: [
        n('Ler a partitura', 0, 27, [
          n('Solfejar as duas primeiras páginas', 0, 13),
          n('Mãos separadas em velocidade reduzida', 14, 27),
        ]),
        n('Mãos juntas', 28, 69, [
          n('Primeira página completa', 28, 48),
          n('Segunda página completa', 49, 69),
        ]),
        n('O ornamento e o pedal', 70, 97, [
          n('As terminas do compasso 16', 70, 83),
          n('Pedal por harmonia, não por compasso', 84, 97),
        ]),
        n('Tocá-lo inteiro', 98, 111, [
          n('Gravar-me três vezes seguidas', 98, 104),
          n('Tocá-lo para a família', 105, 111),
        ]),
      ],
    },
    prototipo: {
      resumen:
        'Dez semanas para parar de dar voltas nisso: escolher uma, fazer a versão de uma tarde e ' +
        'decidir com o que aconteceu, não com o que eu imagino.',
      nodos: [
        n('Escolher', 0, 13, [
          n('Pontuar as cinco finalistas do mapa', 0, 6),
          n('Descartar três sem culpa', 7, 13),
        ]),
        n('Testar em pequena escala', 14, 41, [
          n('Fazer a versão de uma tarde', 14, 27),
          n('Mostrar para três pessoas', 28, 41),
        ]),
        n('Decidir com dados', 42, 69, [
          n('Anotar o que deu errado', 42, 55),
          n('Diagrama de decisão: continuar ou soltar', 56, 69),
        ]),
      ],
    },
    b2: {
      resumen:
        'Vinte semanas: fechar o que ficou aberto do B1, ampliar o vocabulário, soltar a língua ' +
        'falando e deixar os simulados para o final.',
      nodos: [
        n('Fechar o B1', 0, 34, [
          n('Revisar os cartões atrasados', 0, 20),
          n('Terminar o programa de gramática', 21, 34),
        ]),
        n('Vocabulário de B2', 35, 83, [
          n('Quarenta cartões novos por semana', 35, 62),
          n('Ler uma notícia por dia no idioma', 63, 83),
        ]),
        n('Falar sem pensar', 84, 118, [
          n('Três conversas longas por semana', 84, 104),
          n('Gravar-me contando o dia', 105, 118),
        ]),
        n('O exame', 119, 139, [
          n('Dois simulados completos', 119, 132),
          n('Revisar só o que erro', 133, 139),
        ]),
      ],
    },
    semestral: {
      resumen:
        'Oito semanas para chegar à entrega: referencial teórico, laboratório e uma semana inteira ' +
        'reservada para escrever e ensaiar a defesa.',
      nodos: [
        n('Referencial teórico', 0, 20, [
          n('Reunir as dez fontes', 0, 10),
          n('Escrever o estado da arte', 11, 20),
        ]),
        n('Laboratório', 21, 41, [
          n('Montar o experimento', 21, 30),
          n('Três rodadas de medições', 31, 41),
        ]),
        n('Entrega', 42, 55, [
          n('Escrever resultados e conclusões', 42, 48),
          n('Pôster e ensaio da defesa', 49, 55),
        ]),
      ],
    },
    racha: {
      resumen:
        'Quatro semanas para que ler a edição pare de depender de lembrar: um horário fixo, a ' +
        'divisão entre os assistentes e um fechamento de mês que dá para olhar.',
      nodos: [
        n('Para não passar batido', 0, 9, [
          n('Ler no intervalo do turno', 0, 4),
          n('Colocar o lembrete às 14:00', 5, 9),
        ]),
        n('Dividir o trabalho', 10, 19, [
          n('Dar esportes e ciência a dois assistentes', 10, 14),
          n('Ouvir o resumo durante o café da manhã', 15, 19),
        ]),
        n('Fechar o mês', 20, 27, [
          n('Guardar as três notícias que valeram a pena', 20, 24),
          n('Contar a sequência e anotá-la', 25, 27),
        ]),
      ],
    },
    archivo: {
      resumen:
        'Doze semanas para esvaziar as pendências do arquivo, do que já foi começado ao que espera ' +
        'há mais tempo.',
      nodos: [
        n('O que eu já comecei', 0, 27, [
          n('Terminar a série que ficou pela metade', 0, 13),
          n('Acabar o livro da mesinha', 14, 27),
        ]),
        n('Os filmes pendentes', 28, 55, [
          n('Duas sessões por semana', 28, 48),
          n('Escrever a resenha ao terminar cada um', 49, 55),
        ]),
        n('O videogame que espera há um ano', 56, 83, [
          n('Retomar a partir do último save', 56, 76),
          n('Avaliar e arquivar tudo que vi', 77, 83),
        ]),
      ],
    },
    coche: {
      resumen:
        'Oito semanas ordenadas por urgência: primeiro o que a lei exige e tem data, depois o que ' +
        'ficou da pane, e por fim as coisas do frio.',
      nodos: [
        n('O que a lei exige', 0, 20, [
          n('Vistoria do semestre', 0, 10),
          n('Renovar o licenciamento', 11, 20),
        ]),
        n('O que ficou da pane', 21, 41, [
          n('Freios e fluido', 21, 30),
          n('Bateria e velas', 31, 41),
        ]),
        n('Antes do frio', 42, 55, [
          n('Pneus e calibragem', 42, 48),
          n('Revisar o anticongelante', 49, 55),
        ]),
      ],
    },
    corea: {
      resumen:
        'Doze dias de norte a sul: quatro em Seul para o jet lag, o centro histórico no meio e Jeju ' +
        'no final, voando de volta a partir de Seul.',
      nodos: [
        n('Seul', 0, 4, [
          n('Gyeongbokgung e o bairro de Bukchon', 0, 1),
          n('Mercado de Gwangjang e Myeongdong', 2, 2),
          n('Excursão à DMZ', 3, 4),
        ]),
        n('Gyeongju e Busan', 5, 8, [
          n('Tumbas reais e o templo Bulguksa', 5, 6),
          n('Gamcheon e o mercado de Jagalchi', 7, 8),
        ]),
        n('Ilha de Jeju', 9, 11, [
          n('Nascer do sol em Seongsan Ilchulbong', 9, 10),
          n('Voltar a Seul e última noite', 11, 11),
        ]),
      ],
    },
    fondo: {
      resumen:
        'Vinte e quatro semanas para juntar três meses de gastos fixos: primeiro saber quanto é, ' +
        'depois separar no dia do pagamento, e a parte difícil — não tocar nisso.',
      nodos: [
        n('Saber quanto é', 0, 13, [
          n('Somar os gastos fixos de três meses', 0, 6),
          n('Definir a meta e anotá-la', 7, 13),
        ]),
        n('Separar antes de gastar', 14, 90, [
          n('Agendar a transferência no dia do pagamento', 14, 48),
          n('Colocar ali o que sobra das aulas particulares', 49, 90),
        ]),
        n('Não tocar nisso', 91, 167, [
          n('Conta separada, sem cartão', 91, 118),
          n('Conferir o saldo uma vez por mês', 119, 167),
        ]),
      ],
    },
    formulario: {
      resumen:
        'Seis semanas, que é o que falta até a prova: primeiro reunir as fórmulas e entendê-las, ' +
        'depois resolver até saírem sem olhar, e no final um caso próprio.',
      nodos: [
        n('Reunir as fórmulas do programa', 0, 13, [
          n('Copiar as de cinemática e dinâmica', 0, 6),
          n('Acrescentar as de energia com suas unidades', 7, 13),
        ]),
        n('Resolver até saírem sozinhas', 14, 34, [
          n('Dez problemas de lançamento oblíquo', 14, 23),
          n('Dez de energia e trabalho', 24, 34),
        ]),
        n('Fechar com algo próprio', 35, 41, [
          n('Rever o que ainda falha', 35, 38),
          n('Montar a folha de fórmulas do semestre', 39, 41),
        ]),
      ],
    },
  },
  fr: {
    maraton: {
      resumen:
        "Il faut 24 semaines : huit de base facile pour récupérer du dernier marathon, et à 10 heures " +
        "par semaine, le bloc spécifique et l'affûtage ne tiennent pas en moins sans répéter la blessure.",
      nodos: [
        n('Reconstruire la base sans douleur', 0, 55, [
          n('Courir 40 min à allure de conversation', 0, 20),
          n('Ajouter la sortie longue de 90 minutes', 21, 41),
          n('Renforcement des hanches deux fois par semaine', 42, 55),
        ]),
        n('Augmenter le volume', 56, 104, [
          n('Atteindre 60 km par semaine sans douleur', 56, 76),
          n('Sortie longue de 2 h 30', 77, 90),
          n('Huit répétitions en côte', 91, 104),
        ]),
        n('Bloc spécifique marathon', 105, 146, [
          n('Fractionné de 1 km à allure 10 km', 105, 118),
          n("Sortie longue avec 20 km à l'allure cible", 119, 132),
          n('Répétition générale de 32 km avec ravitaillement', 133, 146),
        ]),
        n('Affûter et arriver entier', 147, 167, [
          n('Réduire le volume de moitié', 147, 160),
          n("Répéter le petit-déjeuner et l'allure de départ", 161, 167),
        ]),
      ],
    },
    cocina: {
      meta: 'Construire une cuisine',
      categoria: 'Maison',
      resumen:
        'Construire une cuisine fonctionnelle en 13 semaines à 5 heures par semaine : planification, ' +
        'installation de la structure de base, raccordements eau et gaz, électricité, finitions et essais finaux.',
      nodos: [
        n('Planification et préparation', 0, 13, [
          n("Concevoir l'agencement et choisir les matériaux", 0, 6),
          n('Obtenir les autorisations et fixer le budget', 7, 13),
        ]),
        n('Installation de la structure de base', 14, 34, [
          n("Démonter l'ancienne cuisine et dégager l'espace", 14, 20),
          n('Poser les meubles bas et les tiroirs', 21, 30),
          n('Poser les meubles hauts et les étagères', 31, 34),
        ]),
        n('Raccordements eau et gaz', 35, 55, [
          n("Tirer les tuyaux d'eau chaude et froide", 35, 44),
          n("Raccorder l'évier et le robinet", 45, 49),
          n("Installer l'arrivée de gaz de la cuisinière", 50, 55),
        ]),
        n('Électricité', 56, 69, [
          n('Tirer les lignes et poser le tableau électrique', 56, 61),
          n('Poser les prises et interrupteurs', 62, 65),
          n("Câbler la hotte et l'éclairage", 66, 69),
        ]),
        n('Finitions', 70, 83, [
          n('Poser le plan de travail et la crédence', 70, 76),
          n('Jointer et peindre les murs', 77, 80),
          n('Poser les poignées et les portes', 81, 83),
        ]),
        n('Essais finaux et remise', 84, 90, [
          n("Tester les fuites d'eau et de gaz", 84, 86),
          n('Tester les circuits et les appareils', 87, 88),
          n('Nettoyage final et réglages', 89, 90),
        ]),
      ],
    },
    posgrado: {
      resumen:
        "Vingt et une semaines pour arriver à l'échéance sans se presser : choisir les programmes " +
        "d'abord, puis l'examen d'entrée, et laisser la lettre de motivation pour la fin — c'est celle " +
        "qu'on réécrit le plus.",
      nodos: [
        n('Choisir les programmes et les prérequis', 0, 27, [
          n('Comparer six programmes et leurs échéances', 0, 13),
          n('Réunir les prérequis et documents de chacun', 14, 27),
        ]),
        n("Examen d'entrée", 28, 83, [
          n("Réviser l'algèbre linéaire et les équations différentielles", 28, 48),
          n('Passer trois examens blancs complets', 49, 69),
          n("Passer l'examen d'entrée", 70, 83),
        ]),
        n('Lettres et relevé de notes', 84, 104, [
          n('Demander trois lettres de recommandation', 84, 93),
          n('Traduire et certifier le relevé de notes', 94, 104),
        ]),
        n('Lettre de motivation et portfolio', 105, 132, [
          n('Écrire le premier brouillon de la lettre', 105, 118),
          n("La relire avec la professeure d'astrophysique", 119, 125),
          n('Assembler le portfolio de projets', 126, 132),
        ]),
        n('Envoyer les candidatures', 133, 146, [
          n('Remplir les dossiers des six écoles', 133, 139),
          n("Payer les frais et envoyer avant l'échéance", 140, 146),
        ]),
      ],
    },
    nutricion: {
      resumen:
        "Vingt-trois semaines calées sur le calendrier d'entraînement : manger pour l'entraînement " +
        "pendant que le volume grimpe, tester la nutrition de course sur les sorties longues, et garder " +
        "la charge en glucides pour la fin.",
      nodos: [
        n("Manger pour l'entraînement", 0, 55, [
          n("Rester à 2 400 kcal les jours d'entraînement", 0, 27),
          n('Petit-déjeuner avant la sortie longue', 28, 41),
          n("Trois litres d'eau les jours de chaleur", 42, 55),
        ]),
        n('Tester la nutrition de course', 56, 111, [
          n('Gel et eau toutes les 45 min sur les sorties longues', 56, 76),
          n('Dîner riche en glucides la veille', 77, 90),
          n('Répéter trois fois le petit-déjeuner du jour J', 91, 111),
        ]),
        n('Charge en glucides et semaine de course', 112, 163, [
          n('Monter à 7 g de glucides par kilo', 112, 146),
          n('Préparer la liste de courses', 147, 156),
          n('Petit-déjeuner du marathon, sans surprise', 157, 163),
        ]),
      ],
    },
    sueno: {
      resumen:
        "Six semaines en trois étapes : d'abord l'heure de coucher, puis la chambre, et seulement à la " +
        "fin la mesure — changer trois choses à la fois ne dirait jamais laquelle a marché.",
      nodos: [
        n('Terminer la journée à heure fixe', 0, 13, [
          n('Écrans éteints à 23h10', 0, 6),
          n('Plus de caféine après 16h00', 7, 13),
        ]),
        n('Préparer la chambre', 14, 27, [
          n('Baisser la lumière une heure avant', 14, 20),
          n('Laisser le téléphone hors de la chambre', 21, 27),
        ]),
        n('Mesurer et ajuster', 28, 41, [
          n("Noter le temps d'endormissement", 28, 34),
          n('Se lever à la même heure aussi le dimanche', 35, 41),
        ]),
      ],
    },
    memorias: {
      resumen:
        "Huit semaines pour clore l'année par écrit : rattraper ce qui est resté à moitié fait, tenir " +
        "un souvenir par semaine, et finir avec l'album en ordre.",
      nodos: [
        n('Rattraper ce qui manque', 0, 20, [
          n('Écrire les trois jours de voyage restés à moitié faits', 0, 10),
          n('Ajouter une photo aux entrées du passage difficile', 11, 20),
        ]),
        n('Un souvenir par semaine', 21, 41, [
          n('Écrire le dimanche soir', 21, 34),
          n('Choisir la photo du mois', 35, 41),
        ]),
        n("L'album de l'année", 42, 55, [
          n('Relire les douze et les classer', 42, 48),
          n('Le montrer à la famille', 49, 55),
        ]),
      ],
    },
    calma: {
      resumen:
        "Quatre semaines sans pression : trouver le créneau qui existe vraiment, passer de cinq à dix " +
        "minutes, et l'accrocher à quelque chose que tu fais déjà.",
      nodos: [
        n('Trouver le moment', 0, 6, [
          n('Essayer de méditer en rentrant du travail', 0, 3),
          n('Laisser le coussin bien en vue', 4, 6),
        ]),
        n("Dix minutes d'affilée", 7, 20, [
          n('Cinq jours de respiration carrée', 7, 13),
          n('Passer de cinq à dix minutes', 14, 20),
        ]),
        n('Faire que ça tienne tout seul', 21, 27, [
          n('Écrire un remerciement à la fin', 21, 27),
        ]),
      ],
    },
    nocturno: {
      resumen:
        "Seize semaines à quatre heures par semaine : deux à lire la partition, six à assembler les " +
        "mains, quatre sur la pédale et les ornements, et deux pour le jouer en entier sans s'arrêter.",
      nodos: [
        n('Lire la partition', 0, 27, [
          n('Déchiffrer les deux premières pages', 0, 13),
          n('Mains séparées à vitesse réduite', 14, 27),
        ]),
        n('Mains ensemble', 28, 69, [
          n('Première page complète', 28, 48),
          n('Deuxième page complète', 49, 69),
        ]),
        n('Ornements et pédale', 70, 97, [
          n('Les triolets de la mesure 16', 70, 83),
          n('Pédale par harmonie, pas par mesure', 84, 97),
        ]),
        n("Le jouer d'un bout à l'autre", 98, 111, [
          n("M'enregistrer trois fois de suite", 98, 104),
          n('Le jouer pour la famille', 105, 111),
        ]),
      ],
    },
    prototipo: {
      resumen:
        "Dix semaines pour arrêter d'y penser en boucle : en choisir une, construire la version d'un " +
        "après-midi, et décider selon ce qui se passe, pas selon ce que j'imagine.",
      nodos: [
        n('Choisir', 0, 13, [
          n('Noter les cinq finalistes de la carte mentale', 0, 6),
          n('En écarter trois sans culpabilité', 7, 13),
        ]),
        n('La tester en petit', 14, 41, [
          n("Construire la version d'un après-midi", 14, 27),
          n('La montrer à trois personnes', 28, 41),
        ]),
        n('Décider avec des données', 42, 69, [
          n("Noter ce qui n'a pas marché", 42, 55),
          n('Diagramme de décision : continuer ou laisser tomber', 56, 69),
        ]),
      ],
    },
    b2: {
      resumen:
        'Vingt semaines : boucler ce que le B1 a laissé ouvert, élargir le vocabulaire, délier la ' +
        'langue en parlant, et garder les examens blancs pour la fin.',
      nodos: [
        n('Boucler le B1', 0, 34, [
          n('Réviser les cartes en retard', 0, 20),
          n('Terminer le programme de grammaire', 21, 34),
        ]),
        n('Vocabulaire du B2', 35, 83, [
          n('Quarante nouvelles cartes par semaine', 35, 62),
          n('Lire une actualité par jour dans la langue', 63, 83),
        ]),
        n('Parler sans réfléchir', 84, 118, [
          n('Trois longues conversations par semaine', 84, 104),
          n("M'enregistrer en racontant la journée", 105, 118),
        ]),
        n("L'examen", 119, 139, [
          n('Deux examens blancs complets', 119, 132),
          n('Ne réviser que ce qui échoue', 133, 139),
        ]),
      ],
    },
    semestral: {
      resumen:
        'Huit semaines pour arriver à la remise : théorie, travail de labo, et une semaine entière ' +
        'réservée pour rédiger et répéter la soutenance.',
      nodos: [
        n('Théorie', 0, 20, [
          n('Réunir les dix sources', 0, 10),
          n("Écrire l'état de l'art", 11, 20),
        ]),
        n('Labo', 21, 41, [
          n("Monter l'expérience", 21, 30),
          n('Trois séries de mesures', 31, 41),
        ]),
        n('Remise', 42, 55, [
          n('Écrire les résultats et les conclusions', 42, 48),
          n('Poster et répétition de la soutenance', 49, 55),
        ]),
      ],
    },
    racha: {
      resumen:
        "Quatre semaines pour que lire l'édition arrête de dépendre de s'en souvenir : un créneau " +
        "fixe, le partage entre les assistants, et un bilan de fin de mois qui vaut le coup d'œil.",
      nodos: [
        n('Pour ne pas la manquer', 0, 9, [
          n('La lire pendant la pause du travail', 0, 4),
          n('Mettre le rappel à 14h00', 5, 9),
        ]),
        n('Répartir le travail', 10, 19, [
          n('Confier sport et science à deux assistants', 10, 14),
          n('Écouter le résumé au petit-déjeuner', 15, 19),
        ]),
        n('Clore le mois', 20, 27, [
          n('Garder les trois articles qui en valaient la peine', 20, 24),
          n('Compter la série et la noter', 25, 27),
        ]),
      ],
    },
    archivo: {
      resumen:
        'Douze semaines pour vider les archives en attente, de ce qui est déjà commencé à ce qui ' +
        'attend depuis le plus longtemps.',
      nodos: [
        n("Ce que j'ai déjà commencé", 0, 27, [
          n('Terminer la série restée à moitié', 0, 13),
          n('Finir le livre sur la table de nuit', 14, 27),
        ]),
        n('Les films en attente', 28, 55, [
          n('Deux séances par semaine', 28, 48),
          n('Écrire la critique après chacun', 49, 55),
        ]),
        n('Le jeu qui attend depuis un an', 56, 83, [
          n('Reprendre depuis la dernière sauvegarde', 56, 76),
          n('Noter et archiver tout ce qui a été vu', 77, 83),
        ]),
      ],
    },
    coche: {
      resumen:
        "Huit semaines classées par urgence : d'abord ce que la loi exige et qui a une date, puis ce " +
        "que la panne a laissé, et les affaires du froid à la fin.",
      nodos: [
        n('Ce que la loi exige', 0, 20, [
          n('Le contrôle technique du semestre', 0, 10),
          n('Renouveler la vignette', 11, 20),
        ]),
        n('Ce que la panne a laissé', 21, 41, [
          n('Freins et liquide', 21, 30),
          n('Batterie et bougies', 31, 41),
        ]),
        n('Avant le froid', 42, 55, [
          n('Pneus et pression', 42, 48),
          n("Vérifier l'antigel", 49, 55),
        ]),
      ],
    },
    corea: {
      resumen:
        'Douze jours du nord au sud : quatre à Séoul pour le décalage horaire, le centre historique au ' +
        'milieu et Jeju à la fin, avec le vol retour depuis Séoul.',
      nodos: [
        n('Séoul', 0, 4, [
          n('Gyeongbokgung et le quartier de Bukchon', 0, 1),
          n('Marché de Gwangjang et Myeongdong', 2, 2),
          n('Excursion à la DMZ', 3, 4),
        ]),
        n('Gyeongju et Busan', 5, 8, [
          n('Tombeaux royaux et temple de Bulguksa', 5, 6),
          n('Gamcheon et le marché de Jagalchi', 7, 8),
        ]),
        n('Île de Jeju', 9, 11, [
          n('Lever de soleil à Seongsan Ilchulbong', 9, 10),
          n('Retour à Séoul et dernière nuit', 11, 11),
        ]),
      ],
    },
    fondo: {
      resumen:
        'Vingt-quatre semaines pour réunir trois mois de charges fixes : calculer le montant, le ' +
        'virer le jour de paie, et la partie difficile — ne pas y toucher.',
      nodos: [
        n('Calculer le montant', 0, 13, [
          n('Additionner trois mois de charges fixes', 0, 6),
          n("Fixer l'objectif et le noter", 7, 13),
        ]),
        n('Le virer avant de dépenser', 14, 90, [
          n('Virement automatique le jour de paie', 14, 48),
          n("Y mettre l'argent des cours particuliers", 49, 90),
        ]),
        n('Ne pas y toucher', 91, 167, [
          n('Compte séparé, sans carte', 91, 118),
          n('Vérifier le solde une fois par mois', 119, 167),
        ]),
      ],
    },
    formulario: {
      resumen:
        "Six semaines, c'est ce qu'il reste avant le partiel : d'abord réunir les formules et les " +
        "comprendre, puis résoudre jusqu'à les connaître par cœur, et finir avec un cas personnel.",
      nodos: [
        n('Réunir les formules du programme', 0, 13, [
          n('Recopier celles de cinématique et de dynamique', 0, 6),
          n("Ajouter celles d'énergie avec leurs unités", 7, 13),
        ]),
        n("Résoudre jusqu'à ce que ça vienne tout seul", 14, 34, [
          n('Dix problèmes de mouvement de projectile', 14, 23),
          n("Dix sur l'énergie et le travail", 24, 34),
        ]),
        n('Finir avec un cas personnel', 35, 41, [
          n('Revoir ce qui coince encore', 35, 38),
          n('Construire la feuille de notes du semestre', 39, 41),
        ]),
      ],
    },
  },
  de: {
    maraton: {
      resumen:
        'Du brauchst 24 Wochen: acht lockere Grundlagenwochen, um dich vom letzten Marathon zu ' +
        'erholen, und bei 10 Stunden pro Woche passen der marathonspezifische Block und das Tapering ' +
        'nicht in weniger Zeit, ohne die Verletzung zu wiederholen.',
      nodos: [
        n('Die Grundlage schmerzfrei aufbauen', 0, 55, [
          n('40 Minuten im Unterhaltungstempo laufen', 0, 20),
          n('Den 90-minütigen Longrun hinzufügen', 21, 41),
          n('Zweimal pro Woche Hüftkräftigung', 42, 55),
        ]),
        n('Das Volumen steigern', 56, 104, [
          n('Beschwerdefrei auf 60 km pro Woche kommen', 56, 76),
          n('Longrun von 2 Std. 30 Min.', 77, 90),
          n('Acht Bergwiederholungen', 91, 104),
        ]),
        n('Marathonspezifischer Block', 105, 146, [
          n('1-km-Intervalle im 10-km-Tempo', 105, 118),
          n('Longrun mit 20 km im Zieltempo', 119, 132),
          n('Generalprobe über 32 km mit Verpflegung', 133, 146),
        ]),
        n('Tapering, um heil anzukommen', 147, 167, [
          n('Das Volumen halbieren', 147, 160),
          n('Frühstück und Starttempo proben', 161, 167),
        ]),
      ],
    },
    cocina: {
      meta: 'Eine Küche bauen',
      categoria: 'Zuhause',
      resumen:
        'Eine funktionierende Küche in 13 Wochen mit 5 Stunden pro Woche bauen: Planung, Einbau der ' +
        'Grundstruktur, Wasser- und Gasanschlüsse, Elektrik, Endarbeiten und Abschlusstests.',
      nodos: [
        n('Planung und Vorbereitung', 0, 13, [
          n('Den Grundriss entwerfen und Materialien auswählen', 0, 6),
          n('Genehmigungen einholen und das Budget festlegen', 7, 13),
        ]),
        n('Einbau der Grundstruktur', 14, 34, [
          n('Die alte Küche ausbauen und den Raum räumen', 14, 20),
          n('Unterschränke und Schubladen einbauen', 21, 30),
          n('Hängeschränke und Regale einbauen', 31, 34),
        ]),
        n('Wasser- und Gasanschlüsse', 35, 55, [
          n('Kalt- und Warmwasserleitungen verlegen', 35, 44),
          n('Spüle und Wasserhahn anschließen', 45, 49),
          n('Die Gasleitung für den Herd installieren', 50, 55),
        ]),
        n('Elektrik', 56, 69, [
          n('Leitungen und Sicherungskasten installieren', 56, 61),
          n('Steckdosen und Schalter anbringen', 62, 65),
          n('Dunstabzugshaube und Beleuchtung verkabeln', 66, 69),
        ]),
        n('Endarbeiten', 70, 83, [
          n('Arbeitsplatte und Spritzschutz montieren', 70, 76),
          n('Fugen abdichten und Wände streichen', 77, 80),
          n('Griffe und Türen anbringen', 81, 83),
        ]),
        n('Abschlusstests und Übergabe', 84, 90, [
          n('Auf Wasser- und Gaslecks prüfen', 84, 86),
          n('Stromkreise und Geräte testen', 87, 88),
          n('Endreinigung und letzte Anpassungen', 89, 90),
        ]),
      ],
    },
    posgrado: {
      resumen:
        'Einundzwanzig Wochen bis zur Frist, ohne Hetze: zuerst die Studiengänge auswählen, dann die ' +
        'Aufnahmeprüfung, und das Motivationsschreiben zum Schluss — das wird am häufigsten umgeschrieben.',
      nodos: [
        n('Studiengänge und Voraussetzungen auswählen', 0, 27, [
          n('Sechs Studiengänge und ihre Fristen vergleichen', 0, 13),
          n('Voraussetzungen und Unterlagen für jeden sammeln', 14, 27),
        ]),
        n('Aufnahmeprüfung', 28, 83, [
          n('Lineare Algebra und Differentialgleichungen wiederholen', 28, 48),
          n('Drei vollständige Probeklausuren schreiben', 49, 69),
          n('Die Aufnahmeprüfung ablegen', 70, 83),
        ]),
        n('Empfehlungsschreiben und Notenauszug', 84, 104, [
          n('Um drei Empfehlungsschreiben bitten', 84, 93),
          n('Den Notenauszug übersetzen und beglaubigen lassen', 94, 104),
        ]),
        n('Motivationsschreiben und Portfolio', 105, 132, [
          n('Den ersten Entwurf des Motivationsschreibens verfassen', 105, 118),
          n('Es mit der Astrophysik-Professorin durchsehen', 119, 125),
          n('Das Projektportfolio zusammenstellen', 126, 132),
        ]),
        n('Die Bewerbungen abschicken', 133, 146, [
          n('Die Formulare für die sechs Hochschulen ausfüllen', 133, 139),
          n('Die Gebühren zahlen und vor Fristablauf abschicken', 140, 146),
        ]),
      ],
    },
    nutricion: {
      resumen:
        'Dreiundzwanzig Wochen im Takt des Trainingsplans: essen fürs Training, während das Volumen ' +
        'steigt, die Wettkampfverpflegung bei den Longruns proben und das Carboloading für den Schluss ' +
        'aufheben.',
      nodos: [
        n('Fürs Training essen', 0, 55, [
          n('An Trainingstagen bei 2.400 kcal bleiben', 0, 27),
          n('Vor dem Longrun frühstücken', 28, 41),
          n('Drei Liter Wasser an heißen Tagen', 42, 55),
        ]),
        n('Die Wettkampfverpflegung proben', 56, 111, [
          n('Alle 45 Minuten Gel und Wasser bei den Longruns', 56, 76),
          n('Kohlenhydratreiches Abendessen am Vorabend', 77, 90),
          n('Das Frühstück des Wettkampftags dreimal wiederholen', 91, 111),
        ]),
        n('Carboloading und Wettkampfwoche', 112, 163, [
          n('Auf 7 g Kohlenhydrate pro Kilo steigern', 112, 146),
          n('Die Einkaufsliste fertig haben', 147, 156),
          n('Marathon-Frühstück, keine Überraschungen', 157, 163),
        ]),
      ],
    },
    sueno: {
      resumen:
        'Sechs Wochen in drei Schritten: zuerst die feste Schlafenszeit, dann das Zimmer, und erst am ' +
        'Ende das Messen — drei Dinge gleichzeitig zu ändern würde nie zeigen, welches gewirkt hat.',
      nodos: [
        n('Den Tag immer zur gleichen Zeit beenden', 0, 13, [
          n('Bildschirme um 23:10 Uhr aus', 0, 6),
          n('Kein Koffein nach 16:00 Uhr', 7, 13),
        ]),
        n('Das Zimmer vorbereiten', 14, 27, [
          n('Eine Stunde vorher das Licht dimmen', 14, 20),
          n('Das Handy aus dem Schlafzimmer lassen', 21, 27),
        ]),
        n('Messen und anpassen', 28, 41, [
          n('Notieren, wie lange das Einschlafen dauert', 28, 34),
          n('Auch sonntags zur gleichen Zeit aufstehen', 35, 41),
        ]),
      ],
    },
    memorias: {
      resumen:
        'Acht Wochen, um das Jahr schriftlich abzuschließen: retten, was halb fertig blieb, eine ' +
        'Erinnerung pro Woche festhalten und mit dem geordneten Album enden.',
      nodos: [
        n('Nachholen, was fehlt', 0, 20, [
          n('Die drei halb fertigen Reisetage aufschreiben', 0, 10),
          n('Den Einträgen aus der schweren Zeit ein Foto hinzufügen', 11, 20),
        ]),
        n('Eine Erinnerung pro Woche', 21, 41, [
          n('Sonntagabend schreiben', 21, 34),
          n('Das Foto des Monats auswählen', 35, 41),
        ]),
        n('Das Album des Jahres', 42, 55, [
          n('Die zwölf durchgehen und ordnen', 42, 48),
          n('Es der Familie zeigen', 49, 55),
        ]),
      ],
    },
    calma: {
      resumen:
        'Vier Wochen ohne Druck: den Zeitpunkt finden, der wirklich existiert, von fünf auf zehn ' +
        'Minuten steigern und es an etwas knüpfen, das du schon tust.',
      nodos: [
        n('Den Moment finden', 0, 6, [
          n('Nach der Schicht meditieren ausprobieren', 0, 3),
          n('Das Kissen sichtbar lassen', 4, 6),
        ]),
        n('Zehn Minuten am Stück', 7, 20, [
          n('Fünf Tage Box-Atmung', 7, 13),
          n('Von fünf auf zehn Minuten steigern', 14, 20),
        ]),
        n('Dafür sorgen, dass es von allein weitergeht', 21, 27, [
          n('Zum Schluss eine Dankbarkeit aufschreiben', 21, 27),
        ]),
      ],
    },
    nocturno: {
      resumen:
        'Sechzehn Wochen mit vier Stunden pro Woche: zwei zum Lesen der Noten, sechs um die Hände ' +
        'zusammenzubringen, vier für Pedal und Verzierungen, und zwei, um es ohne Stocken durchzuspielen.',
      nodos: [
        n('Die Noten lesen', 0, 27, [
          n('Die ersten zwei Seiten vom Blatt spielen', 0, 13),
          n('Hände getrennt in halbem Tempo', 14, 27),
        ]),
        n('Hände zusammen', 28, 69, [
          n('Erste Seite komplett', 28, 48),
          n('Zweite Seite komplett', 49, 69),
        ]),
        n('Verzierungen und Pedal', 70, 97, [
          n('Die Triolen in Takt 16', 70, 83),
          n('Pedal nach Harmonie, nicht nach Takt', 84, 97),
        ]),
        n('Es durchspielen', 98, 111, [
          n('Mich dreimal hintereinander aufnehmen', 98, 104),
          n('Es der Familie vorspielen', 105, 111),
        ]),
      ],
    },
    prototipo: {
      resumen:
        'Zehn Wochen, um aufzuhören, es im Kopf zu wälzen: eine Idee auswählen, die Ein-Nachmittag-' +
        'Version bauen und nach dem entscheiden, was passiert, nicht nach dem, was ich mir vorstelle.',
      nodos: [
        n('Auswählen', 0, 13, [
          n('Die fünf Finalisten der Mindmap bewerten', 0, 6),
          n('Drei ohne schlechtes Gewissen verwerfen', 7, 13),
        ]),
        n('Im Kleinen ausprobieren', 14, 41, [
          n('Die Ein-Nachmittag-Version bauen', 14, 27),
          n('Es drei Leuten zeigen', 28, 41),
        ]),
        n('Mit Daten entscheiden', 42, 69, [
          n('Aufschreiben, was schiefgelaufen ist', 42, 55),
          n('Entscheidungsdiagramm: weitermachen oder loslassen', 56, 69),
        ]),
      ],
    },
    b2: {
      resumen:
        'Zwanzig Wochen: abschließen, was B1 offengelassen hat, den Wortschatz erweitern, durch ' +
        'Sprechen die Zunge lockern und die Probeprüfungen für den Schluss aufheben.',
      nodos: [
        n('B1 abschließen', 0, 34, [
          n('Die überfälligen Karten wiederholen', 0, 20),
          n('Den Grammatiklehrplan beenden', 21, 34),
        ]),
        n('B2-Wortschatz', 35, 83, [
          n('Vierzig neue Karten pro Woche', 35, 62),
          n('Täglich eine Nachricht in der Sprache lesen', 63, 83),
        ]),
        n('Sprechen, ohne nachzudenken', 84, 118, [
          n('Drei lange Gespräche pro Woche', 84, 104),
          n('Mich aufnehmen, wie ich vom Tag erzähle', 105, 118),
        ]),
        n('Die Prüfung', 119, 139, [
          n('Zwei vollständige Probeprüfungen', 119, 132),
          n('Nur wiederholen, was nicht klappt', 133, 139),
        ]),
      ],
    },
    semestral: {
      resumen:
        'Acht Wochen bis zur Abgabe: Theorie, Laborarbeit und eine ganze Woche, die fürs Schreiben und ' +
        'das Üben der Verteidigung reserviert ist.',
      nodos: [
        n('Theorie', 0, 20, [
          n('Die zehn Quellen zusammentragen', 0, 10),
          n('Den Forschungsstand schreiben', 11, 20),
        ]),
        n('Labor', 21, 41, [
          n('Das Experiment aufbauen', 21, 30),
          n('Drei Messreihen', 31, 41),
        ]),
        n('Abgabe', 42, 55, [
          n('Ergebnisse und Schlussfolgerungen schreiben', 42, 48),
          n('Poster und Probe der Verteidigung', 49, 55),
        ]),
      ],
    },
    racha: {
      resumen:
        'Vier Wochen, damit das Lesen der Ausgabe nicht mehr vom Erinnern abhängt: ein fester ' +
        'Zeitpunkt, die Aufteilung unter den Assistenten und ein Monatsabschluss, der sich anzusehen lohnt.',
      nodos: [
        n('Damit es nicht untergeht', 0, 9, [
          n('In der Schichtpause lesen', 0, 4),
          n('Die Erinnerung auf 14:00 Uhr stellen', 5, 9),
        ]),
        n('Die Arbeit aufteilen', 10, 19, [
          n('Sport und Wissenschaft zwei Assistenten geben', 10, 14),
          n('Die Zusammenfassung beim Frühstück anhören', 15, 19),
        ]),
        n('Den Monat abschließen', 20, 27, [
          n('Die drei lohnenswerten Geschichten aufbewahren', 20, 24),
          n('Die Serie zählen und aufschreiben', 25, 27),
        ]),
      ],
    },
    archivo: {
      resumen:
        'Zwölf Wochen, um den Rückstand im Archiv aufzuarbeiten, von dem, was schon begonnen wurde, ' +
        'bis zu dem, was am längsten wartet.',
      nodos: [
        n('Was ich schon begonnen habe', 0, 27, [
          n('Die auf halbem Weg liegen gebliebene Serie beenden', 0, 13),
          n('Das Buch auf dem Nachttisch fertig lesen', 14, 27),
        ]),
        n('Die ausstehenden Filme', 28, 55, [
          n('Zwei Sitzungen pro Woche', 28, 48),
          n('Nach jedem die Rezension schreiben', 49, 55),
        ]),
        n('Das Spiel, das ein Jahr gewartet hat', 56, 83, [
          n('Beim letzten Spielstand weitermachen', 56, 76),
          n('Alles Gesehene bewerten und archivieren', 77, 83),
        ]),
      ],
    },
    coche: {
      resumen:
        'Acht Wochen nach Dringlichkeit geordnet: zuerst, was das Gesetz verlangt und einen Termin ' +
        'hat, dann, was von der Panne übrig blieb, und die Winterthemen am Ende.',
      nodos: [
        n('Was das Gesetz verlangt', 0, 20, [
          n('Die Hauptuntersuchung dieses Halbjahres', 0, 10),
          n('Die Kfz-Steuer erneuern', 11, 20),
        ]),
        n('Was von der Panne übrig blieb', 21, 41, [
          n('Bremsen und Flüssigkeit', 21, 30),
          n('Batterie und Zündkerzen', 31, 41),
        ]),
        n('Vor der Kälte', 42, 55, [
          n('Reifen und Luftdruck', 42, 48),
          n('Das Frostschutzmittel prüfen', 49, 55),
        ]),
      ],
    },
    corea: {
      resumen:
        'Zwölf Tage von Nord nach Süd: vier in Seoul gegen den Jetlag, das historische Zentrum in der ' +
        'Mitte und Jeju am Ende, mit dem Rückflug ab Seoul.',
      nodos: [
        n('Seoul', 0, 4, [
          n('Gyeongbokgung und das Bukchon-Viertel', 0, 1),
          n('Gwangjang-Markt und Myeongdong', 2, 2),
          n('Tagesausflug zur DMZ', 3, 4),
        ]),
        n('Gyeongju und Busan', 5, 8, [
          n('Königsgräber und der Bulguksa-Tempel', 5, 6),
          n('Gamcheon und der Jagalchi-Markt', 7, 8),
        ]),
        n('Insel Jeju', 9, 11, [
          n('Sonnenaufgang am Seongsan Ilchulbong', 9, 10),
          n('Zurück nach Seoul und letzte Nacht', 11, 11),
        ]),
      ],
    },
    fondo: {
      resumen:
        'Vierundzwanzig Wochen, um drei Monate Fixkosten zusammenzubekommen: ausrechnen, wie viel es ' +
        'ist, es am Zahltag beiseitelegen, und der schwierige Teil — es nicht anrühren.',
      nodos: [
        n('Ausrechnen, wie viel es ist', 0, 13, [
          n('Drei Monate Fixkosten zusammenzählen', 0, 6),
          n('Das Ziel festlegen und aufschreiben', 7, 13),
        ]),
        n('Es beiseitelegen, bevor es ausgegeben wird', 14, 90, [
          n('Dauerauftrag am Zahltag', 14, 48),
          n('Das Geld aus den Nachhilfestunden dort hineintun', 49, 90),
        ]),
        n('Es nicht anrühren', 91, 167, [
          n('Separates Konto, keine Karte', 91, 118),
          n('Einmal im Monat den Kontostand prüfen', 119, 167),
        ]),
      ],
    },
    formulario: {
      resumen:
        'Sechs Wochen, das ist es, was bis zur Zwischenprüfung bleibt: zuerst die Formeln ' +
        'zusammenstellen und verstehen, dann üben, bis sie ohne Nachschauen sitzen, und mit etwas ' +
        'Eigenem abschließen.',
      nodos: [
        n('Die Formeln des Lehrplans zusammentragen', 0, 13, [
          n('Die zu Kinematik und Dynamik abschreiben', 0, 6),
          n('Die zur Energie mit ihren Einheiten ergänzen', 7, 13),
        ]),
        n('Üben, bis es von allein geht', 14, 34, [
          n('Zehn Aufgaben zum schiefen Wurf', 14, 23),
          n('Zehn zu Energie und Arbeit', 24, 34),
        ]),
        n('Mit etwas Eigenem abschließen', 35, 41, [
          n('Durchgehen, was noch nicht sitzt', 35, 38),
          n('Das Formelblatt fürs Semester erstellen', 39, 41),
        ]),
      ],
    },
  },
  it: {
    maraton: {
      resumen:
        "Servono 24 settimane: otto di base leggera per riprendersi dall'ultima maratona, e a 10 ore " +
        "alla settimana il blocco specifico e lo scarico non entrano in meno tempo senza ripetere " +
        "l'infortunio.",
      nodos: [
        n('Ricostruire la base senza dolore', 0, 55, [
          n('Correre 40 min a ritmo di conversazione', 0, 20),
          n('Aggiungere il lungo di 90 minuti', 21, 41),
          n("Rinforzo dell'anca due volte a settimana", 42, 55),
        ]),
        n('Aumentare il volume', 56, 104, [
          n('Arrivare a 60 km a settimana senza fastidi', 56, 76),
          n('Lungo di 2 h 30 min', 77, 90),
          n('Otto ripetute in salita', 91, 104),
        ]),
        n('Blocco specifico di maratona', 105, 146, [
          n('Ripetute di 1 km a ritmo 10K', 105, 118),
          n('Lungo con 20 km al ritmo obiettivo', 119, 132),
          n('Prova generale di 32 km con alimentazione', 133, 146),
        ]),
        n('Scarico e arrivare interi', 147, 167, [
          n('Dimezzare il volume', 147, 160),
          n('Provare colazione e ritmo di partenza', 161, 167),
        ]),
      ],
    },
    cocina: {
      meta: 'Costruire una cucina',
      categoria: 'Casa',
      resumen:
        'Costruire una cucina funzionale in 13 settimane con 5 ore a settimana: pianificazione, ' +
        'installazione della struttura base, allacci di acqua e gas, elettricità, finiture e collaudi finali.',
      nodos: [
        n('Pianificazione e preparazione', 0, 13, [
          n('Progettare il layout e scegliere i materiali', 0, 6),
          n('Ottenere i permessi e definire il budget', 7, 13),
        ]),
        n('Installazione della struttura base', 14, 34, [
          n('Smontare la vecchia cucina e liberare lo spazio', 14, 20),
          n('Montare i mobili base e i cassetti', 21, 30),
          n('Montare i pensili e le mensole', 31, 34),
        ]),
        n('Allacci di acqua e gas', 35, 55, [
          n("Posare i tubi dell'acqua calda e fredda", 35, 44),
          n('Collegare il lavello e il rubinetto', 45, 49),
          n("Installare l'attacco del gas per il piano cottura", 50, 55),
        ]),
        n('Impianto elettrico', 56, 69, [
          n('Posare le linee e il quadro elettrico', 56, 61),
          n('Montare prese e interruttori', 62, 65),
          n("Collegare la cappa e l'illuminazione", 66, 69),
        ]),
        n('Finiture', 70, 83, [
          n('Montare il top e la schienatura', 70, 76),
          n('Sigillare le giunte e dipingere le pareti', 77, 80),
          n('Montare maniglie e ante', 81, 83),
        ]),
        n('Collaudi finali e consegna', 84, 90, [
          n('Verificare perdite di acqua e gas', 84, 86),
          n('Testare circuiti ed elettrodomestici', 87, 88),
          n('Pulizia finale e ritocchi', 89, 90),
        ]),
      ],
    },
    posgrado: {
      resumen:
        "Ventuno settimane per arrivare alla scadenza senza fretta: prima scegliere i programmi, poi " +
        "l'esame di ammissione, e lasciare la lettera motivazionale per ultima — è quella che si " +
        "riscrive di più.",
      nodos: [
        n('Scegliere programmi e requisiti', 0, 27, [
          n('Confrontare sei programmi e le loro scadenze', 0, 13),
          n('Raccogliere requisiti e documenti di ciascuno', 14, 27),
        ]),
        n('Esame di ammissione', 28, 83, [
          n('Ripassare algebra lineare ed equazioni differenziali', 28, 48),
          n('Fare tre simulazioni complete', 49, 69),
          n("Sostenere l'esame di ammissione", 70, 83),
        ]),
        n('Lettere e certificato', 84, 104, [
          n('Chiedere tre lettere di referenze', 84, 93),
          n('Tradurre e certificare il certificato di laurea', 94, 104),
        ]),
        n('Lettera motivazionale e portfolio', 105, 132, [
          n('Scrivere la prima bozza della lettera', 105, 118),
          n('Rivederla con la professoressa di astrofisica', 119, 125),
          n('Preparare il portfolio dei progetti', 126, 132),
        ]),
        n('Inviare le domande', 133, 146, [
          n('Compilare i moduli delle sei scuole', 133, 139),
          n('Pagare le tasse e inviare prima della scadenza', 140, 146),
        ]),
      ],
    },
    nutricion: {
      resumen:
        "Ventitré settimane legate al calendario di allenamento: mangiare per allenarsi mentre il " +
        "volume sale, provare l'alimentazione da gara nei lunghi e lasciare il carico di carboidrati " +
        "per la fine.",
      nodos: [
        n("Mangiare per l'allenamento", 0, 55, [
          n('Restare a 2.400 kcal nei giorni di allenamento', 0, 27),
          n('Fare colazione prima del lungo', 28, 41),
          n("Tre litri d'acqua nei giorni caldi", 42, 55),
        ]),
        n("Provare l'alimentazione da gara", 56, 111, [
          n('Gel e acqua ogni 45 min nei lunghi', 56, 76),
          n('Cena ricca di carboidrati la sera prima', 77, 90),
          n('Ripetere tre volte la colazione del giorno della gara', 91, 111),
        ]),
        n('Carico di carboidrati e settimana di gara', 112, 163, [
          n('Salire a 7 g di carboidrati per chilo', 112, 146),
          n('Avere pronta la lista della spesa', 147, 156),
          n('Colazione della maratona, senza sorprese', 157, 163),
        ]),
      ],
    },
    sueno: {
      resumen:
        "Sei settimane in tre passi: prima l'orario di chiusura della giornata, poi la stanza, e solo " +
        "alla fine la misurazione — cambiare tre cose insieme non direbbe mai quale ha funzionato.",
      nodos: [
        n('Chiudere la giornata sempre alla stessa ora', 0, 13, [
          n('Schermi spenti alle 23:10', 0, 6),
          n('Niente caffeina dopo le 16:00', 7, 13),
        ]),
        n('Preparare la stanza', 14, 27, [
          n("Abbassare la luce un'ora prima", 14, 20),
          n('Lasciare il telefono fuori dalla camera', 21, 27),
        ]),
        n('Misurare e regolare', 28, 41, [
          n('Annotare quanto tempo impiego ad addormentarmi', 28, 34),
          n('Alzarmi alla stessa ora anche la domenica', 35, 41),
        ]),
      ],
    },
    memorias: {
      resumen:
        "Otto settimane per chiudere l'anno per iscritto: recuperare quello che è rimasto a metà, " +
        "tenere un ricordo a settimana e finire con l'album in ordine.",
      nodos: [
        n('Recuperare quello che manca', 0, 20, [
          n('Scrivere i tre giorni di viaggio rimasti a metà', 0, 10),
          n('Aggiungere una foto alle voci del periodo difficile', 11, 20),
        ]),
        n('Un ricordo a settimana', 21, 41, [
          n('Scrivere la domenica sera', 21, 34),
          n('Scegliere la foto del mese', 35, 41),
        ]),
        n("L'album dell'anno", 42, 55, [
          n('Rivedere i dodici e ordinarli', 42, 48),
          n('Mostrarlo alla famiglia', 49, 55),
        ]),
      ],
    },
    calma: {
      resumen:
        'Quattro settimane senza pretese: trovare il momento che esiste davvero, salire da cinque a ' +
        'dieci minuti e agganciarlo a qualcosa che già fai.',
      nodos: [
        n('Trovare il momento', 0, 6, [
          n('Provare a meditare tornando dal turno', 0, 3),
          n('Lasciare il cuscino in vista', 4, 6),
        ]),
        n('Dieci minuti di fila', 7, 20, [
          n('Cinque giorni di respirazione quadrata', 7, 13),
          n('Salire da cinque a dieci minuti', 14, 20),
        ]),
        n('Farlo reggere da solo', 21, 27, [
          n('Scrivere un ringraziamento alla fine', 21, 27),
        ]),
      ],
    },
    nocturno: {
      resumen:
        'Sedici settimane a quattro ore a settimana: due a leggere lo spartito, sei a unire le mani, ' +
        'quattro su pedale e abbellimenti, e due per suonarlo intero senza fermarsi.',
      nodos: [
        n('Leggere lo spartito', 0, 27, [
          n('Leggere a prima vista le prime due pagine', 0, 13),
          n('Mani separate a velocità dimezzata', 14, 27),
        ]),
        n('Mani insieme', 28, 69, [
          n('Prima pagina completa', 28, 48),
          n('Seconda pagina completa', 49, 69),
        ]),
        n('Abbellimenti e pedale', 70, 97, [
          n('Le terzine della battuta 16', 70, 83),
          n('Pedale per armonia, non per battuta', 84, 97),
        ]),
        n('Suonarlo per intero', 98, 111, [
          n('Registrarmi tre volte di fila', 98, 104),
          n('Suonarlo per la famiglia', 105, 111),
        ]),
      ],
    },
    prototipo: {
      resumen:
        'Dieci settimane per smettere di rimuginarci: sceglierne una, costruire la versione da un ' +
        'pomeriggio e decidere in base a quello che succede, non a quello che immagino.',
      nodos: [
        n('Scegliere', 0, 13, [
          n('Valutare le cinque finaliste della mappa', 0, 6),
          n('Scartarne tre senza sensi di colpa', 7, 13),
        ]),
        n('Provarla in piccolo', 14, 41, [
          n('Costruire la versione da un pomeriggio', 14, 27),
          n('Mostrarla a tre persone', 28, 41),
        ]),
        n('Decidere con i dati', 42, 69, [
          n('Annotare cosa non ha funzionato', 42, 55),
          n('Diagramma di decisione: continuare o lasciar perdere', 56, 69),
        ]),
      ],
    },
    b2: {
      resumen:
        'Venti settimane: chiudere quello che il B1 ha lasciato aperto, ampliare il vocabolario, ' +
        'sciogliere la lingua parlando e lasciare le simulazioni per la fine.',
      nodos: [
        n('Chiudere il B1', 0, 34, [
          n('Ripassare le carte in ritardo', 0, 20),
          n('Finire il programma di grammatica', 21, 34),
        ]),
        n('Vocabolario del B2', 35, 83, [
          n('Quaranta carte nuove a settimana', 35, 62),
          n('Leggere una notizia al giorno nella lingua', 63, 83),
        ]),
        n('Parlare senza pensarci', 84, 118, [
          n('Tre conversazioni lunghe a settimana', 84, 104),
          n('Registrarmi mentre racconto la giornata', 105, 118),
        ]),
        n("L'esame", 119, 139, [
          n('Due simulazioni complete', 119, 132),
          n('Ripassare solo quello che sbaglio', 133, 139),
        ]),
      ],
    },
    semestral: {
      resumen:
        'Otto settimane per arrivare alla consegna: teoria, lavoro di laboratorio e una settimana ' +
        'intera riservata per scrivere e provare la discussione.',
      nodos: [
        n('Teoria', 0, 20, [
          n('Raccogliere le dieci fonti', 0, 10),
          n("Scrivere lo stato dell'arte", 11, 20),
        ]),
        n('Laboratorio', 21, 41, [
          n("Allestire l'esperimento", 21, 30),
          n('Tre serie di misurazioni', 31, 41),
        ]),
        n('Consegna', 42, 55, [
          n('Scrivere risultati e conclusioni', 42, 48),
          n('Poster e prova della discussione', 49, 55),
        ]),
      ],
    },
    racha: {
      resumen:
        "Quattro settimane perché leggere l'edizione smetta di dipendere dal ricordarsene: un orario " +
        "fisso, la divisione tra gli assistenti e un bilancio di fine mese che vale la pena guardare.",
      nodos: [
        n('Perché non mi sfugga', 0, 9, [
          n('Leggerla nella pausa del turno', 0, 4),
          n("Impostare l'avviso alle 14:00", 5, 9),
        ]),
        n('Dividere il lavoro', 10, 19, [
          n('Affidare sport e scienza a due assistenti', 10, 14),
          n('Ascoltare il riassunto a colazione', 15, 19),
        ]),
        n('Chiudere il mese', 20, 27, [
          n('Conservare le tre notizie che ne valevano la pena', 20, 24),
          n('Contare la serie e annotarla', 25, 27),
        ]),
      ],
    },
    archivo: {
      resumen:
        "Dodici settimane per svuotare l'arretrato dell'archivio, da quello già iniziato a quello che " +
        "aspetta da più tempo.",
      nodos: [
        n('Quello che ho già iniziato', 0, 27, [
          n('Finire la serie rimasta a metà', 0, 13),
          n('Finire il libro sul comodino', 14, 27),
        ]),
        n('I film in sospeso', 28, 55, [
          n('Due sedute a settimana', 28, 48),
          n('Scrivere la recensione dopo ognuno', 49, 55),
        ]),
        n('Il videogioco che aspetta da un anno', 56, 83, [
          n("Riprenderlo dall'ultimo salvataggio", 56, 76),
          n('Valutare e archiviare tutto quello visto', 77, 83),
        ]),
      ],
    },
    coche: {
      resumen:
        'Otto settimane ordinate per urgenza: prima quello che la legge richiede e ha una data, poi ' +
        'quello che è rimasto del guasto, e le cose per il freddo alla fine.',
      nodos: [
        n('Quello che la legge richiede', 0, 20, [
          n('La revisione del semestre', 0, 10),
          n('Rinnovare il bollo', 11, 20),
        ]),
        n('Quello che è rimasto del guasto', 21, 41, [
          n('Freni e liquido', 21, 30),
          n('Batteria e candele', 31, 41),
        ]),
        n('Prima del freddo', 42, 55, [
          n('Gomme e pressione', 42, 48),
          n("Controllare l'antigelo", 49, 55),
        ]),
      ],
    },
    corea: {
      resumen:
        'Dodici giorni da nord a sud: quattro a Seoul per il fuso orario, il centro storico nel mezzo ' +
        'e Jeju alla fine, con il volo di ritorno da Seoul.',
      nodos: [
        n('Seoul', 0, 4, [
          n('Gyeongbokgung e il quartiere di Bukchon', 0, 1),
          n('Mercato di Gwangjang e Myeongdong', 2, 2),
          n('Gita di un giorno alla DMZ', 3, 4),
        ]),
        n('Gyeongju e Busan', 5, 8, [
          n('Tombe reali e il tempio di Bulguksa', 5, 6),
          n('Gamcheon e il mercato di Jagalchi', 7, 8),
        ]),
        n("L'isola di Jeju", 9, 11, [
          n('Alba a Seongsan Ilchulbong', 9, 10),
          n('Ritorno a Seoul e ultima notte', 11, 11),
        ]),
      ],
    },
    fondo: {
      resumen:
        'Ventiquattro settimane per mettere insieme tre mesi di spese fisse: calcolare quanto serve, ' +
        'metterlo da parte il giorno della paga, e la parte difficile — non toccarlo.',
      nodos: [
        n('Calcolare quanto serve', 0, 13, [
          n('Sommare tre mesi di spese fisse', 0, 6),
          n("Fissare l'obiettivo e annotarlo", 7, 13),
        ]),
        n('Metterlo da parte prima di spenderlo', 14, 90, [
          n('Bonifico automatico il giorno della paga', 14, 48),
          n('Metterci i soldi delle ripetizioni', 49, 90),
        ]),
        n('Non toccarlo', 91, 167, [
          n('Conto separato, senza carta', 91, 118),
          n('Controllare il saldo una volta al mese', 119, 167),
        ]),
      ],
    },
    formulario: {
      resumen:
        'Sei settimane, che è quello che resta prima del compito in classe: prima raccogliere le ' +
        'formule e capirle, poi risolvere finché non vengono senza guardare, e finire con un caso proprio.',
      nodos: [
        n('Raccogliere le formule del programma', 0, 13, [
          n('Copiare quelle di cinematica e dinamica', 0, 6),
          n('Aggiungere quelle di energia con le loro unità', 7, 13),
        ]),
        n('Risolvere finché non vengono da soli', 14, 34, [
          n('Dieci problemi di moto parabolico', 14, 23),
          n('Dieci su energia e lavoro', 24, 34),
        ]),
        n('Chiuderlo con qualcosa di proprio', 35, 41, [
          n('Rivedere quello che ancora sbaglio', 35, 38),
          n('Preparare il foglio di formule del semestre', 39, 41),
        ]),
      ],
    },
  },
  ja: {
    maraton: {
      resumen:
        '24週間必要です。前回のマラソンからの回復に充てる軽い土台づくりが8週間、週10時間のペースではマラソン特化ブロックとテーパリングをこれ以上短くすると同じ故障を繰り返しかねません。',
      nodos: [
        n('痛みなく土台をつくり直す', 0, 55, [
          n('会話できるペースで40分走る', 0, 20),
          n('90分のロング走を加える', 21, 41),
          n('股関節まわりの筋トレを週2回行う', 42, 55),
        ]),
        n('走行距離を段階的に増やす', 56, 104, [
          n('違和感なく週60kmまで伸ばす', 56, 76),
          n('2時間30分のロング走をこなす', 77, 90),
          n('坂道インターバルを8本行う', 91, 104),
        ]),
        n('マラソン特化ブロック', 105, 146, [
          n('10kmペースで1kmのインターバルを行う', 105, 118),
          n('目標ペースで20kmのロング走をこなす', 119, 132),
          n('補給込みで32kmの本番リハーサルを行う', 133, 146),
        ]),
        n('調整して万全な状態で迎える', 147, 167, [
          n('走行距離を半分に減らす', 147, 160),
          n('朝食とスタートペースを本番通りに試す', 161, 167),
        ]),
      ],
    },
    cocina: {
      meta: 'キッチンを作る',
      categoria: '家',
      resumen:
        '週5時間、13週間で使えるキッチンを作ります。計画、下地の設置、給排水とガスの接続、電気配線、仕上げ、最終テストという流れです。',
      nodos: [
        n('計画と準備', 0, 13, [
          n('レイアウトを決めて材料を選ぶ', 0, 6),
          n('許可を取って予算を立てる', 7, 13),
        ]),
        n('下地の設置', 14, 34, [
          n('古いキッチンを撤去してスペースを整える', 14, 20),
          n('下部キャビネットと引き出しを取り付ける', 21, 30),
          n('上部キャビネットと棚を取り付ける', 31, 34),
        ]),
        n('給排水とガスの接続', 35, 55, [
          n('給湯・給水の配管を通す', 35, 44),
          n('シンクと蛇口をつなぐ', 45, 49),
          n('コンロのガス栓を設置する', 50, 55),
        ]),
        n('電気配線', 56, 69, [
          n('配線と分電盤を設置する', 56, 61),
          n('コンセントとスイッチを取り付ける', 62, 65),
          n('換気扇と照明をつなぐ', 66, 69),
        ]),
        n('仕上げ', 70, 83, [
          n('天板とキッチンパネルを取り付ける', 70, 76),
          n('目地をコーキングして壁を塗る', 77, 80),
          n('取っ手と扉を取り付ける', 81, 83),
        ]),
        n('最終テストと引き渡し', 84, 90, [
          n('水漏れとガス漏れを確認する', 84, 86),
          n('配線と家電の動作を確認する', 87, 88),
          n('最終清掃と微調整をする', 89, 90),
        ]),
      ],
    },
    posgrado: {
      resumen:
        '締め切りまで焦らず進めて21週間です。まず志望校を選び、次に入学試験、そして志望動機書は最後に回します。書き直す回数がいちばん多いものだからです。',
      nodos: [
        n('志望校と要件を選ぶ', 0, 27, [
          n('6つのプログラムと締め切りを比較する', 0, 13),
          n('それぞれの要件と提出書類をそろえる', 14, 27),
        ]),
        n('入学試験', 28, 83, [
          n('線形代数と微分方程式を復習する', 28, 48),
          n('模擬試験を3回分通しで解く', 49, 69),
          n('入学試験を受ける', 70, 83),
        ]),
        n('推薦状と成績証明書', 84, 104, [
          n('推薦状を3通依頼する', 84, 93),
          n('成績証明書を翻訳して認証を受ける', 94, 104),
        ]),
        n('志望動機書とポートフォリオ', 105, 132, [
          n('志望動機書の第一稿を書く', 105, 118),
          n('天体物理学の教授に見てもらう', 119, 125),
          n('プロジェクトのポートフォリオをまとめる', 126, 132),
        ]),
        n('出願する', 133, 146, [
          n('6校分の出願書類に記入する', 133, 139),
          n('受験料を払って締め切り前に送る', 140, 146),
        ]),
      ],
    },
    nutricion: {
      resumen:
        'トレーニング計画に合わせて23週間です。走行距離が増える間はトレーニングのための食事をし、ロング走でレース当日の補給を試し、カーボローディングは最後に回します。',
      nodos: [
        n('トレーニングのために食べる', 0, 55, [
          n('練習日は2,400kcalに収める', 0, 27),
          n('ロング走の前に朝食をとる', 28, 41),
          n('暑い日は水を3リットル飲む', 42, 55),
        ]),
        n('レース当日の補給を試す', 56, 111, [
          n('ロング走中は45分ごとにジェルと水を摂る', 56, 76),
          n('前日は炭水化物中心の夕食にする', 77, 90),
          n('本番当日の朝食を3回試す', 91, 111),
        ]),
        n('カーボローディングとレース週', 112, 163, [
          n('体重1kgあたり炭水化物7gまで増やす', 112, 146),
          n('買い物リストを用意しておく', 147, 156),
          n('マラソン当日の朝食はいつも通りにする', 157, 163),
        ]),
      ],
    },
    sueno: {
      resumen:
        '3つの段階で6週間です。まず就寝前の締めの時間、次に寝室の環境、測定は最後にします。3つを同時に変えると何が効いたのか分からなくなるからです。',
      nodos: [
        n('毎日同じ時間に1日を締める', 0, 13, [
          n('23:10に画面を消す', 0, 6),
          n('16:00以降はカフェインを摂らない', 7, 13),
        ]),
        n('寝室を整える', 14, 27, [
          n('寝る1時間前に照明を落とす', 14, 20),
          n('スマホを寝室に持ち込まない', 21, 27),
        ]),
        n('測定して調整する', 28, 41, [
          n('眠りにつくまでの時間を記録する', 28, 34),
          n('日曜日も同じ時間に起きる', 35, 41),
        ]),
      ],
    },
    memorias: {
      resumen:
        '書き残した1年を締めくくるのに8週間です。書きかけのまま残っていたものを仕上げ、週1つのペースで思い出を書き、最後にアルバムを整理して終えます。',
      nodos: [
        n('書き残しを取り戻す', 0, 20, [
          n('旅行の書きかけだった3日分を書く', 0, 10),
          n('つらかった時期の記事に写真を添える', 11, 20),
        ]),
        n('週1つの思い出', 21, 41, [
          n('日曜の夜に書く', 21, 34),
          n('今月の1枚を選ぶ', 35, 41),
        ]),
        n('1年分のアルバム', 42, 55, [
          n('12か月分を見直して並べる', 42, 48),
          n('家族に見せる', 49, 55),
        ]),
      ],
    },
    calma: {
      resumen:
        '無理をしない4週間です。本当に続けられる時間帯を見つけ、5分から10分に伸ばし、すでにある習慣に結びつけます。',
      nodos: [
        n('タイミングを見つける', 0, 6, [
          n('仕事から帰ったら瞑想を試す', 0, 3),
          n('座布団を見える場所に置いておく', 4, 6),
        ]),
        n('10分続ける', 7, 20, [
          n('ボックス呼吸を5日間行う', 7, 13),
          n('5分から10分に伸ばす', 14, 20),
        ]),
        n('自然に続く形にする', 21, 27, [
          n('終えたら感謝を1つ書く', 21, 27),
        ]),
      ],
    },
    nocturno: {
      resumen:
        '週4時間で16週間です。楽譜を読むのに2週間、両手を合わせるのに6週間、ペダルと装飾音に4週間、止まらずに通して弾けるようにするのに2週間かけます。',
      nodos: [
        n('楽譜を読む', 0, 27, [
          n('最初の2ページを譜読みする', 0, 13),
          n('半分の速さで片手ずつ弾く', 14, 27),
        ]),
        n('両手を合わせる', 28, 69, [
          n('1ページ目を通して弾く', 28, 48),
          n('2ページ目を通して弾く', 49, 69),
        ]),
        n('装飾音とペダル', 70, 97, [
          n('16小節目の三連符を仕上げる', 70, 83),
          n('小節ではなく和声に合わせてペダルを踏む', 84, 97),
        ]),
        n('通して弾く', 98, 111, [
          n('3回連続で録音する', 98, 104),
          n('家族の前で弾く', 105, 111),
        ]),
      ],
    },
    prototipo: {
      resumen:
        '考え込むのをやめるための10週間です。1つに絞り、午後だけで作れる試作版を作り、想像ではなく実際に起きたことで判断します。',
      nodos: [
        n('1つに絞る', 0, 13, [
          n('マップに残った5案を採点する', 0, 6),
          n('3案を思い切って外す', 7, 13),
        ]),
        n('小さく試す', 14, 41, [
          n('午後だけで作れる試作版を作る', 14, 27),
          n('3人に見せる', 28, 41),
        ]),
        n('データで判断する', 42, 69, [
          n('うまくいかなかった点を書き留める', 42, 55),
          n('続けるか手放すか、決定木で判断する', 56, 69),
        ]),
      ],
    },
    b2: {
      resumen:
        '20週間です。B1で終わらなかった部分を仕上げ、語彙を広げ、話すことで口を慣らし、模擬試験は最後に回します。',
      nodos: [
        n('B1を仕上げる', 0, 34, [
          n('たまったカードを復習する', 0, 20),
          n('文法の範囲を終わらせる', 21, 34),
        ]),
        n('B2の語彙', 35, 83, [
          n('週40枚のペースで新しいカードを覚える', 35, 62),
          n('毎日その言語でニュースを1本読む', 63, 83),
        ]),
        n('考えずに話す', 84, 118, [
          n('週3回長めの会話をする', 84, 104),
          n('その日の出来事を話して録音する', 105, 118),
        ]),
        n('試験', 119, 139, [
          n('模擬試験を通しで2回受ける', 119, 132),
          n('苦手な部分だけ復習する', 133, 139),
        ]),
      ],
    },
    semestral: {
      resumen:
        '提出まで8週間です。理論的枠組み、実験、そして執筆と発表練習にまるまる1週間を確保します。',
      nodos: [
        n('理論的枠組み', 0, 20, [
          n('参考文献を10本そろえる', 0, 10),
          n('先行研究のまとめを書く', 11, 20),
        ]),
        n('実験', 21, 41, [
          n('実験の準備をする', 21, 30),
          n('計測を3回に分けて行う', 31, 41),
        ]),
        n('提出', 42, 55, [
          n('結果と結論を書く', 42, 48),
          n('ポスターを作って発表練習をする', 49, 55),
        ]),
      ],
    },
    racha: {
      resumen:
        '新聞を読むのを覚えていることに頼らないようにするための4週間です。決まった時間帯、アシスタントたちへの分担、そして見返せる形での月末のまとめを作ります。',
      nodos: [
        n('読み忘れないようにする', 0, 9, [
          n('休憩時間に読む', 0, 4),
          n('14:00に通知をセットする', 5, 9),
        ]),
        n('作業を分担する', 10, 19, [
          n('スポーツと科学を2人のアシスタントに任せる', 10, 14),
          n('朝食をとりながら要約を聞く', 15, 19),
        ]),
        n('月を締めくくる', 20, 27, [
          n('印象に残った記事を3本保存する', 20, 24),
          n('連続記録を数えて記録する', 25, 27),
        ]),
      ],
    },
    archivo: {
      resumen:
        '積読・積みリストを片付けるのに12週間です。すでに始めているものから、いちばん長く待っているものまで順に片付けます。',
      nodos: [
        n('すでに始めたもの', 0, 27, [
          n('途中で止まっているドラマを見終える', 0, 13),
          n('枕元の本を読み終える', 14, 27),
        ]),
        n('見ていない映画', 28, 55, [
          n('週2回鑑賞する', 28, 48),
          n('見終わるたびに感想を書く', 49, 55),
        ]),
        n('1年放置しているゲーム', 56, 83, [
          n('最後のセーブから再開する', 56, 76),
          n('見終わった作品すべてに評価をつけて記録する', 77, 83),
        ]),
      ],
    },
    coche: {
      resumen:
        '緊急度順に並べた8週間です。まず期限のある法定点検、次に故障で傷んだ部分、最後に冬支度です。',
      nodos: [
        n('法定で必要なもの', 0, 20, [
          n('半期の車検を受ける', 0, 10),
          n('自動車税を更新する', 11, 20),
        ]),
        n('故障で残った部分', 21, 41, [
          n('ブレーキとフルードを点検する', 21, 30),
          n('バッテリーとスパークプラグを交換する', 31, 41),
        ]),
        n('冬が来る前に', 42, 55, [
          n('タイヤと空気圧を確認する', 42, 48),
          n('不凍液を点検する', 49, 55),
        ]),
      ],
    },
    corea: {
      resumen:
        '北から南へ12日間です。時差に慣れるためソウルで4日、真ん中で歴史地区、最後に済州島。帰りの便もソウルから出ます。',
      nodos: [
        n('ソウル', 0, 4, [
          n('景福宮と北村を歩く', 0, 1),
          n('広蔵市場と明洞をまわる', 2, 2),
          n('DMZへの日帰り旅行', 3, 4),
        ]),
        n('慶州と釜山', 5, 8, [
          n('王陵と仏国寺をめぐる', 5, 6),
          n('甘川文化村とチャガルチ市場をまわる', 7, 8),
        ]),
        n('済州島', 9, 11, [
          n('城山日出峰で日の出を見る', 9, 10),
          n('ソウルに戻って最後の夜を過ごす', 11, 11),
        ]),
      ],
    },
    fondo: {
      resumen:
        '固定費3か月分を貯めるのに24週間です。まずいくら必要か把握し、給料日ごとに取り分け、そして難しいのは——それに手をつけないことです。',
      nodos: [
        n('必要な金額を把握する', 0, 13, [
          n('3か月分の固定費を合計する', 0, 6),
          n('目標額を決めて記録する', 7, 13),
        ]),
        n('使う前に取り分ける', 14, 90, [
          n('給料日に自動振替を設定する', 14, 48),
          n('家庭教師の収入をそこに入れる', 49, 90),
        ]),
        n('手をつけない', 91, 167, [
          n('カードを紐づけない別口座にする', 91, 118),
          n('月に1回残高を確認する', 119, 167),
        ]),
      ],
    },
    formulario: {
      resumen:
        '中間試験まで残り6週間です。まず公式をまとめて理解し、次に見なくても解けるまで練習し、最後に自分自身の問題を1つ仕上げます。',
      nodos: [
        n('範囲の公式をまとめる', 0, 13, [
          n('運動学と力学の公式を書き写す', 0, 6),
          n('エネルギーの公式を単位つきで加える', 7, 13),
        ]),
        n('自然に解けるまで練習する', 14, 34, [
          n('放物運動の問題を10問解く', 14, 23),
          n('エネルギーと仕事の問題を10問解く', 24, 34),
        ]),
        n('自分なりのまとめで締める', 35, 41, [
          n('まだ間違える部分を見直す', 35, 38),
          n('この学期の公式シートを作る', 39, 41),
        ]),
      ],
    },
  },
  zh: {
    maraton: {
      resumen:
        '需要24周：先用8周做轻松的基础训练，从上一场马拉松中恢复过来；按每周10小时的强度，马拉松专项训练和减量期已经压缩到极限，' +
        '再短就会重蹈伤病的覆辙。',
      nodos: [
        n('无痛重建基础', 0, 55, [
          n('以能聊天的配速跑40分钟', 0, 20),
          n('加入90分钟的长距离跑', 21, 41),
          n('每周两次髋部力量训练', 42, 55),
        ]),
        n('循序渐进增加跑量', 56, 104, [
          n('在没有不适的情况下提升到每周60公里', 56, 76),
          n('完成2小时30分钟的长距离跑', 77, 90),
          n('完成8组坡道冲刺', 91, 104),
        ]),
        n('马拉松专项训练', 105, 146, [
          n('以10公里配速做1公里间歇', 105, 118),
          n('以目标配速跑20公里长距离', 119, 132),
          n('带补给完成32公里模拟跑', 133, 146),
        ]),
        n('减量调整，完好无损地到达起点', 147, 167, [
          n('把跑量减半', 147, 160),
          n('演练比赛日早餐和起跑配速', 161, 167),
        ]),
      ],
    },
    cocina: {
      meta: '打造一个厨房',
      categoria: '家',
      resumen:
        '用13周、每周5小时打造一个能用的厨房：规划、基础结构安装、水电气接入、电路、收尾和最终测试。',
      nodos: [
        n('规划与准备', 0, 13, [
          n('设计布局并挑选材料', 0, 6),
          n('办理许可并做预算', 7, 13),
        ]),
        n('安装基础结构', 14, 34, [
          n('拆掉旧厨房并腾出空间', 14, 20),
          n('安装地柜和抽屉', 21, 30),
          n('安装吊柜和搁板', 31, 34),
        ]),
        n('水电气接入', 35, 55, [
          n('铺设冷热水管', 35, 44),
          n('接好水槽和水龙头', 45, 49),
          n('安装灶台燃气接口', 50, 55),
        ]),
        n('电路安装', 56, 69, [
          n('布线并安装配电箱', 56, 61),
          n('安装插座和开关', 62, 65),
          n('接好抽油烟机和照明', 66, 69),
        ]),
        n('收尾工作', 70, 83, [
          n('安装台面和挡水板', 70, 76),
          n('填缝并粉刷墙面', 77, 80),
          n('安装五金件和柜门', 81, 83),
        ]),
        n('最终测试与交付', 84, 90, [
          n('检查有无漏水漏气', 84, 86),
          n('测试电路和电器', 87, 88),
          n('最后清洁和微调', 89, 90),
        ]),
      ],
    },
    posgrado: {
      resumen:
        '不慌不忙地用21周到达截止日期：先选学校，再准备入学考试，个人陈述留到最后——那是改动最多的部分。',
      nodos: [
        n('选择学校和了解要求', 0, 27, [
          n('比较六个项目和它们的截止日期', 0, 13),
          n('收集每个项目的要求和材料', 14, 27),
        ]),
        n('入学考试', 28, 83, [
          n('复习线性代数和微分方程', 28, 48),
          n('完整做三套模拟题', 49, 69),
          n('参加入学考试', 70, 83),
        ]),
        n('推荐信与成绩单', 84, 104, [
          n('请三位老师写推荐信', 84, 93),
          n('翻译并公证成绩单', 94, 104),
        ]),
        n('个人陈述和作品集', 105, 132, [
          n('写出个人陈述的第一稿', 105, 118),
          n('和天体物理学教授一起修改', 119, 125),
          n('整理项目作品集', 126, 132),
        ]),
        n('提交申请', 133, 146, [
          n('填好六所学校的申请表', 133, 139),
          n('缴费并在截止日期前提交', 140, 146),
        ]),
      ],
    },
    nutricion: {
      resumen:
        '23周，跟着训练计划走：跑量上升期间为训练而吃，在长距离跑中演练比赛补给，碳水加载留到最后。',
      nodos: [
        n('为训练而吃', 0, 55, [
          n('训练日摄入控制在2400千卡', 0, 27),
          n('长距离跑前吃早餐', 28, 41),
          n('炎热天气每天喝三升水', 42, 55),
        ]),
        n('演练比赛补给', 56, 111, [
          n('长距离跑中每45分钟补充能量胶和水', 56, 76),
          n('前一晚吃高碳水晚餐', 77, 90),
          n('把比赛日早餐演练三次', 91, 111),
        ]),
        n('碳水加载和比赛周', 112, 163, [
          n('把碳水摄入提高到每公斤体重7克', 112, 146),
          n('提前准备好购物清单', 147, 156),
          n('马拉松当天早餐一切照旧', 157, 163),
        ]),
      ],
    },
    sueno: {
      resumen:
        '分三步走，共六周：先固定关灯时间，再调整房间，最后才开始记录——同时改三件事就说不清哪个起了作用。',
      nodos: [
        n('每天在同一时间结束这一天', 0, 13, [
          n('23:10关掉所有屏幕', 0, 6),
          n('16:00以后不再摄入咖啡因', 7, 13),
        ]),
        n('布置卧室', 14, 27, [
          n('睡前一小时调暗灯光', 14, 20),
          n('手机不带进卧室', 21, 27),
        ]),
        n('记录并调整', 28, 41, [
          n('记录入睡花了多久', 28, 34),
          n('周日也在同一时间起床', 35, 41),
        ]),
      ],
    },
    memorias: {
      resumen:
        '用8周为写了一年的日记收尾：补回没写完的部分，每周记一段回忆，最后整理好相册。',
      nodos: [
        n('补上落下的部分', 0, 20, [
          n('把旅行中没写完的三天补上', 0, 10),
          n('给低谷时期的记录配上照片', 11, 20),
        ]),
        n('每周记一段回忆', 21, 41, [
          n('周日晚上写', 21, 34),
          n('挑出这个月的照片', 35, 41),
        ]),
        n('这一年的相册', 42, 55, [
          n('回顾十二个月并整理排序', 42, 48),
          n('给家人看', 49, 55),
        ]),
      ],
    },
    calma: {
      resumen:
        '四周，不强求：找到真正能坚持的时段，从五分钟增加到十分钟，并把它和已有的习惯绑在一起。',
      nodos: [
        n('找到合适的时刻', 0, 6, [
          n('下班回家后试着冥想', 0, 3),
          n('把坐垫放在看得见的地方', 4, 6),
        ]),
        n('连续十分钟', 7, 20, [
          n('做五天的箱式呼吸', 7, 13),
          n('从五分钟增加到十分钟', 14, 20),
        ]),
        n('让它自己坚持下去', 21, 27, [
          n('结束时写一句感恩的话', 21, 27),
        ]),
      ],
    },
    nocturno: {
      resumen:
        '每周四小时，共16周：两周读谱，六周合手，四周练踏板和装饰音，最后两周不间断完整弹一遍。',
      nodos: [
        n('读谱', 0, 27, [
          n('视唱前两页', 0, 13),
          n('以一半速度分手练习', 14, 27),
        ]),
        n('双手合练', 28, 69, [
          n('完整弹完第一页', 28, 48),
          n('完整弹完第二页', 49, 69),
        ]),
        n('装饰音和踏板', 70, 97, [
          n('第16小节的三连音', 70, 83),
          n('踏板跟着和声走，而不是跟着小节', 84, 97),
        ]),
        n('完整弹一遍', 98, 111, [
          n('连续录三遍', 98, 104),
          n('弹给家人听', 105, 111),
        ]),
      ],
    },
    prototipo: {
      resumen:
        '十周，不再反复纠结：选定一个方向，做一个下午就能完成的版本，根据实际结果而不是想象来决定。',
      nodos: [
        n('做出选择', 0, 13, [
          n('给思维导图里入围的五个方案打分', 0, 6),
          n('干脆放弃其中三个', 7, 13),
        ]),
        n('小规模试验', 14, 41, [
          n('做一个下午就能完成的版本', 14, 27),
          n('给三个人看', 28, 41),
        ]),
        n('用数据做决定', 42, 69, [
          n('记下哪里出了问题', 42, 55),
          n('用决策图判断是继续还是放弃', 56, 69),
        ]),
      ],
    },
    b2: {
      resumen:
        '20周：先补完B1留下的部分，再扩大词汇量，通过多说来让表达变流畅，模拟考试留到最后。',
      nodos: [
        n('补完B1', 0, 34, [
          n('复习积压的卡片', 0, 20),
          n('学完语法大纲', 21, 34),
        ]),
        n('B2词汇', 35, 83, [
          n('每周学40张新卡片', 35, 62),
          n('每天用目标语言读一条新闻', 63, 83),
        ]),
        n('脱口而出', 84, 118, [
          n('每周三次长时间对话', 84, 104),
          n('录下自己讲述这一天的内容', 105, 118),
        ]),
        n('考试', 119, 139, [
          n('完整做两次模拟考试', 119, 132),
          n('只复习出错的部分', 133, 139),
        ]),
      ],
    },
    semestral: {
      resumen:
        '8周到提交日：理论框架、实验室工作，再留出整整一周专门写作和练习答辩。',
      nodos: [
        n('理论框架', 0, 20, [
          n('收集十篇参考文献', 0, 10),
          n('撰写文献综述', 11, 20),
        ]),
        n('实验室', 21, 41, [
          n('搭建实验', 21, 30),
          n('分三轮测量', 31, 41),
        ]),
        n('提交', 42, 55, [
          n('撰写结果和结论', 42, 48),
          n('制作海报并演练答辩', 49, 55),
        ]),
      ],
    },
    racha: {
      resumen:
        '四周让读报不再依赖记性：固定一个时段，把内容分给几位助手，再做一份可以回顾的月度总结。',
      nodos: [
        n('不错过阅读', 0, 9, [
          n('在换班休息时阅读', 0, 4),
          n('把提醒设在14:00', 5, 9),
        ]),
        n('分担任务', 10, 19, [
          n('把体育和科学交给两位助手', 10, 14),
          n('吃早餐时听摘要', 15, 19),
        ]),
        n('做月度总结', 20, 27, [
          n('保存三条最值得读的新闻', 20, 24),
          n('数一数连续天数并记下来', 25, 27),
        ]),
      ],
    },
    archivo: {
      resumen:
        '十二周清空积压清单，从已经开始的到等待最久的依次处理。',
      nodos: [
        n('已经开始的', 0, 27, [
          n('看完看到一半的剧', 0, 13),
          n('读完床头的那本书', 14, 27),
        ]),
        n('还没看的电影', 28, 55, [
          n('每周看两次', 28, 48),
          n('看完每一部都写一篇短评', 49, 55),
        ]),
        n('搁置了一年的游戏', 56, 83, [
          n('从上次存档继续', 56, 76),
          n('给看过的内容打分并归档', 77, 83),
        ]),
      ],
    },
    coche: {
      resumen:
        '按紧急程度排列的八周：先是法定要求且有截止日期的事，再是故障留下的问题，冬天的准备放在最后。',
      nodos: [
        n('法定要求', 0, 20, [
          n('做半年一次的车辆年检', 0, 10),
          n('续缴车船税', 11, 20),
        ]),
        n('故障留下的问题', 21, 41, [
          n('检查刹车和刹车油', 21, 30),
          n('更换电瓶和火花塞', 31, 41),
        ]),
        n('入冬前', 42, 55, [
          n('检查轮胎和胎压', 42, 48),
          n('检查防冻液', 49, 55),
        ]),
      ],
    },
    corea: {
      resumen:
        '十二天从北到南：先在首尔待四天倒时差，中间是历史古城，最后是济州岛，回程航班也从首尔出发。',
      nodos: [
        n('首尔', 0, 4, [
          n('逛景福宫和北村', 0, 1),
          n('逛广藏市场和明洞', 2, 2),
          n('去DMZ一日游', 3, 4),
        ]),
        n('庆州和釜山', 5, 8, [
          n('参观王陵和佛国寺', 5, 6),
          n('逛甘川文化村和札嘎其市场', 7, 8),
        ]),
        n('济州岛', 9, 11, [
          n('在城山日出峰看日出', 9, 10),
          n('返回首尔，度过最后一晚', 11, 11),
        ]),
      ],
    },
    fondo: {
      resumen:
        '24周攒够三个月的固定支出：先弄清楚需要多少，再在发薪日当天存进去，最难的部分是——不去动它。',
      nodos: [
        n('弄清楚需要多少', 0, 13, [
          n('把三个月的固定支出加起来', 0, 6),
          n('定下目标金额并记下来', 7, 13),
        ]),
        n('花之前先存起来', 14, 90, [
          n('在发薪日设置自动转账', 14, 48),
          n('把家教的收入存进去', 49, 90),
        ]),
        n('不去动它', 91, 167, [
          n('开一个不绑卡的独立账户', 91, 118),
          n('每月查一次余额', 119, 167),
        ]),
      ],
    },
    formulario: {
      resumen:
        '距离期中考试还有六周：先把公式整理清楚并理解透彻，再练到不看也能写出来，最后加上一份自己的总结。',
      nodos: [
        n('整理大纲里的公式', 0, 13, [
          n('抄下运动学和动力学的公式', 0, 6),
          n('补上能量公式和它们的单位', 7, 13),
        ]),
        n('练到脱口而出', 14, 34, [
          n('做十道抛体运动题', 14, 23),
          n('做十道能量和功的题', 24, 34),
        ]),
        n('用自己的总结收尾', 35, 41, [
          n('回顾还在出错的部分', 35, 38),
          n('整理这学期的公式表', 39, 41),
        ]),
      ],
    },
  },
  ko: {
    maraton: {
      resumen:
        '24주가 필요해요. 지난 마라톤에서 회복하는 가벼운 기초 훈련에 8주, 주 10시간 페이스로는 마라톤 전용 블록과 테이퍼링을 ' +
        '그보다 줄이면 같은 부상을 반복하게 돼요.',
      nodos: [
        n('통증 없이 기초 다지기', 0, 55, [
          n('대화 가능한 페이스로 40분 달리기', 0, 20),
          n('90분 장거리 달리기 추가하기', 21, 41),
          n('주 2회 고관절 근력 운동하기', 42, 55),
        ]),
        n('훈련량 단계적으로 늘리기', 56, 104, [
          n('무리 없이 주 60km까지 늘리기', 56, 76),
          n('2시간 30분 장거리 달리기', 77, 90),
          n('언덕 인터벌 8회 하기', 91, 104),
        ]),
        n('마라톤 전용 블록', 105, 146, [
          n('10K 페이스로 1km 인터벌 하기', 105, 118),
          n('목표 페이스로 20km 장거리 달리기', 119, 132),
          n('보급을 챙겨 32km 리허설하기', 133, 146),
        ]),
        n('테이퍼링으로 컨디션 조절하기', 147, 167, [
          n('훈련량 절반으로 줄이기', 147, 160),
          n('아침 식사와 출발 페이스 리허설하기', 161, 167),
        ]),
      ],
    },
    cocina: {
      meta: '주방 만들기',
      categoria: '집',
      resumen:
        '주 5시간, 13주 만에 쓸 수 있는 주방을 만들어요. 설계, 기초 구조 설치, 급배수와 가스 연결, 전기 배선, 마감, 최종 점검 순서예요.',
      nodos: [
        n('계획과 준비', 0, 13, [
          n('배치를 설계하고 자재 고르기', 0, 6),
          n('허가받고 예산 정하기', 7, 13),
        ]),
        n('기초 구조 설치', 14, 34, [
          n('기존 주방 철거하고 공간 정리하기', 14, 20),
          n('하부장과 서랍 설치하기', 21, 30),
          n('상부장과 선반 설치하기', 31, 34),
        ]),
        n('급배수와 가스 연결', 35, 55, [
          n('냉온수 배관 설치하기', 35, 44),
          n('싱크대와 수도꼭지 연결하기', 45, 49),
          n('가스레인지 배관 설치하기', 50, 55),
        ]),
        n('전기 배선', 56, 69, [
          n('배선하고 분전반 설치하기', 56, 61),
          n('콘센트와 스위치 설치하기', 62, 65),
          n('후드와 조명 연결하기', 66, 69),
        ]),
        n('마감', 70, 83, [
          n('상판과 벽면 마감재 설치하기', 70, 76),
          n('이음새 실리콘 처리하고 벽 페인트칠하기', 77, 80),
          n('손잡이와 문짝 달기', 81, 83),
        ]),
        n('최종 점검과 마무리', 84, 90, [
          n('누수와 가스 누출 점검하기', 84, 86),
          n('회로와 가전제품 작동 확인하기', 87, 88),
          n('마지막 청소와 마무리 손보기', 89, 90),
        ]),
      ],
    },
    posgrado: {
      resumen:
        '서두르지 않고 마감일까지 21주예요. 먼저 지원할 대학원을 고르고, 다음은 입학시험, 자기소개서는 마지막으로 미뤄요. ' +
        '가장 많이 고쳐 쓰게 되는 부분이니까요.',
      nodos: [
        n('대학원과 지원 요건 정하기', 0, 27, [
          n('여섯 개 프로그램과 마감일 비교하기', 0, 13),
          n('각 프로그램의 요건과 서류 모으기', 14, 27),
        ]),
        n('입학시험', 28, 83, [
          n('선형대수와 미분방정식 복습하기', 28, 48),
          n('모의고사 세 회분 완주하기', 49, 69),
          n('입학시험 응시하기', 70, 83),
        ]),
        n('추천서와 성적증명서', 84, 104, [
          n('추천서 세 통 부탁하기', 84, 93),
          n('성적증명서 번역하고 공증받기', 94, 104),
        ]),
        n('자기소개서와 포트폴리오', 105, 132, [
          n('자기소개서 초안 쓰기', 105, 118),
          n('천체물리학 교수님께 첨삭받기', 119, 125),
          n('프로젝트 포트폴리오 준비하기', 126, 132),
        ]),
        n('지원서 제출하기', 133, 146, [
          n('여섯 학교의 지원서 작성하기', 133, 139),
          n('지원료 내고 마감일 전에 제출하기', 140, 146),
        ]),
      ],
    },
    nutricion: {
      resumen:
        '훈련 일정에 맞춘 23주예요. 훈련량이 늘어나는 동안은 훈련을 위해 먹고, 장거리 달리기에서 레이스 당일 식단을 연습하고, ' +
        '탄수화물 로딩은 마지막에 해요.',
      nodos: [
        n('훈련을 위해 먹기', 0, 55, [
          n('훈련일에는 2,400kcal로 맞추기', 0, 27),
          n('장거리 달리기 전에 아침 먹기', 28, 41),
          n('더운 날엔 물 3리터 마시기', 42, 55),
        ]),
        n('레이스 당일 식단 연습하기', 56, 111, [
          n('장거리 달리기 중 45분마다 젤과 물 섭취하기', 56, 76),
          n('전날 저녁 탄수화물 위주로 먹기', 77, 90),
          n('대회 당일 아침 식단 세 번 연습하기', 91, 111),
        ]),
        n('탄수화물 로딩과 대회 주간', 112, 163, [
          n('체중 1kg당 탄수화물 7g까지 늘리기', 112, 146),
          n('장보기 목록 미리 준비하기', 147, 156),
          n('마라톤 당일 아침은 늘 먹던 대로 하기', 157, 163),
        ]),
      ],
    },
    sueno: {
      resumen:
        '세 단계로 나눈 6주예요. 먼저 하루를 마감하는 시간, 그다음 방, 측정은 마지막에 해요. 세 가지를 한꺼번에 바꾸면 ' +
        '뭐가 효과가 있었는지 알 수 없으니까요.',
      nodos: [
        n('매일 같은 시간에 하루 마감하기', 0, 13, [
          n('23시 10분에 화면 끄기', 0, 6),
          n('16시 이후엔 카페인 끊기', 7, 13),
        ]),
        n('침실 환경 정리하기', 14, 27, [
          n('자기 한 시간 전에 조명 낮추기', 14, 20),
          n('휴대폰은 침실 밖에 두기', 21, 27),
        ]),
        n('측정하고 조정하기', 28, 41, [
          n('잠드는 데 걸리는 시간 기록하기', 28, 34),
          n('일요일에도 같은 시간에 일어나기', 35, 41),
        ]),
      ],
    },
    memorias: {
      resumen:
        '글로 쓴 한 해를 마무리하는 데 8주예요. 반쯤 남겨둔 것을 채우고, 매주 하나씩 추억을 기록하고, 정리된 앨범으로 끝맺어요.',
      nodos: [
        n('빠진 부분 채우기', 0, 20, [
          n('여행 중 다 못 쓴 3일치 채워 쓰기', 0, 10),
          n('힘들었던 시기의 기록에 사진 넣기', 11, 20),
        ]),
        n('매주 추억 하나씩', 21, 41, [
          n('일요일 밤에 쓰기', 21, 34),
          n('이번 달 사진 고르기', 35, 41),
        ]),
        n('한 해의 앨범', 42, 55, [
          n('열두 달 치를 훑어보고 정리하기', 42, 48),
          n('가족에게 보여주기', 49, 55),
        ]),
      ],
    },
    calma: {
      resumen:
        '무리하지 않는 4주예요. 진짜로 지킬 수 있는 시간대를 찾고, 5분에서 10분으로 늘리고, 이미 하고 있는 일과에 연결해요.',
      nodos: [
        n('적당한 시간 찾기', 0, 6, [
          n('퇴근하고 명상 시도해보기', 0, 3),
          n('방석을 눈에 띄는 곳에 두기', 4, 6),
        ]),
        n('10분 이어가기', 7, 20, [
          n('박스 호흡 5일 하기', 7, 13),
          n('5분에서 10분으로 늘리기', 14, 20),
        ]),
        n('저절로 이어지게 만들기', 21, 27, [
          n('끝내고 감사한 일 하나 적기', 21, 27),
        ]),
      ],
    },
    nocturno: {
      resumen:
        '주 4시간씩 16주예요. 악보 읽기에 2주, 양손 맞추기에 6주, 페달과 장식음에 4주, 멈추지 않고 끝까지 치는 데 2주를 써요.',
      nodos: [
        n('악보 읽기', 0, 27, [
          n('처음 두 페이지 시창하기', 0, 13),
          n('절반 속도로 한 손씩 연습하기', 14, 27),
        ]),
        n('양손 맞추기', 28, 69, [
          n('첫 페이지 완주하기', 28, 48),
          n('두 번째 페이지 완주하기', 49, 69),
        ]),
        n('장식음과 페달', 70, 97, [
          n('16마디의 셋잇단음표 다듬기', 70, 83),
          n('마디가 아니라 화성에 맞춰 페달 밟기', 84, 97),
        ]),
        n('끝까지 연주하기', 98, 111, [
          n('연속으로 세 번 녹음하기', 98, 104),
          n('가족 앞에서 연주하기', 105, 111),
        ]),
      ],
    },
    prototipo: {
      resumen:
        '더는 고민만 하지 않기 위한 10주예요. 하나를 정하고, 하루 오후 만에 만들 수 있는 버전을 만들고, 상상이 아니라 ' +
        '실제로 일어난 일로 판단해요.',
      nodos: [
        n('하나 고르기', 0, 13, [
          n('마인드맵에 남은 다섯 후보 점수 매기기', 0, 6),
          n('죄책감 없이 세 개 걸러내기', 7, 13),
        ]),
        n('작게 시도해보기', 14, 41, [
          n('하루 오후 만에 만들 수 있는 버전 만들기', 14, 27),
          n('세 사람에게 보여주기', 28, 41),
        ]),
        n('데이터로 판단하기', 42, 69, [
          n('무엇이 잘못됐는지 적기', 42, 55),
          n('계속할지 접을지 결정 다이어그램으로 판단하기', 56, 69),
        ]),
      ],
    },
    b2: {
      resumen:
        '20주예요. B1에서 못 끝낸 부분을 마무리하고, 어휘를 넓히고, 말하기로 입을 트고, 모의시험은 마지막으로 미뤄요.',
      nodos: [
        n('B1 마무리하기', 0, 34, [
          n('밀린 카드 복습하기', 0, 20),
          n('문법 과정 끝내기', 21, 34),
        ]),
        n('B2 어휘', 35, 83, [
          n('주 40장씩 새 카드 익히기', 35, 62),
          n('매일 그 언어로 뉴스 하나 읽기', 63, 83),
        ]),
        n('생각 없이 바로 말하기', 84, 118, [
          n('주 3회 긴 대화하기', 84, 104),
          n('하루 일과를 말하며 녹음하기', 105, 118),
        ]),
        n('시험', 119, 139, [
          n('모의시험 두 번 통으로 치르기', 119, 132),
          n('틀리는 부분만 복습하기', 133, 139),
        ]),
      ],
    },
    semestral: {
      resumen:
        '제출까지 8주예요. 이론적 배경, 실험, 그리고 글쓰기와 발표 연습에 온전히 일주일을 따로 남겨둬요.',
      nodos: [
        n('이론적 배경', 0, 20, [
          n('참고문헌 열 편 모으기', 0, 10),
          n('선행 연구 정리해서 쓰기', 11, 20),
        ]),
        n('실험', 21, 41, [
          n('실험 준비하기', 21, 30),
          n('측정을 세 차례로 나눠 하기', 31, 41),
        ]),
        n('제출', 42, 55, [
          n('결과와 결론 쓰기', 42, 48),
          n('포스터 만들고 발표 연습하기', 49, 55),
        ]),
      ],
    },
    racha: {
      resumen:
        '신문 읽기가 기억력에 의존하지 않게 만드는 4주예요. 정해진 시간대, 어시스턴트들에게 나눠 맡기기, 그리고 돌아볼 수 있는 ' +
        '월말 정리를 만들어요.',
      nodos: [
        n('놓치지 않기', 0, 9, [
          n('근무 쉬는 시간에 읽기', 0, 4),
          n('14시에 알림 설정하기', 5, 9),
        ]),
        n('일 나눠 맡기기', 10, 19, [
          n('스포츠와 과학은 어시스턴트 둘에게 맡기기', 10, 14),
          n('아침 먹으면서 요약 듣기', 15, 19),
        ]),
        n('한 달 마무리하기', 20, 27, [
          n('인상 깊었던 뉴스 세 개 저장하기', 20, 24),
          n('연속 기록 세어서 적기', 25, 27),
        ]),
      ],
    },
    archivo: {
      resumen:
        '밀린 것들을 비우는 데 12주예요. 이미 시작한 것부터 가장 오래 기다린 것까지 순서대로요.',
      nodos: [
        n('이미 시작한 것', 0, 27, [
          n('보다 만 드라마 끝까지 보기', 0, 13),
          n('머리맡에 있는 책 끝까지 읽기', 14, 27),
        ]),
        n('밀린 영화들', 28, 55, [
          n('주 2회 보기', 28, 48),
          n('한 편 볼 때마다 감상평 쓰기', 49, 55),
        ]),
        n('1년째 손 못 댄 게임', 56, 83, [
          n('마지막 저장 지점부터 이어서 하기', 56, 76),
          n('본 것들 전부 평점 매기고 기록해두기', 77, 83),
        ]),
      ],
    },
    coche: {
      resumen:
        '급한 순서대로 정리한 8주예요. 먼저 법적으로 정해진 기한이 있는 일, 그다음 고장으로 남은 문제, 마지막으로 겨울 준비예요.',
      nodos: [
        n('법적으로 필요한 것', 0, 20, [
          n('반기 정기검사 받기', 0, 10),
          n('자동차세 납부하기', 11, 20),
        ]),
        n('고장으로 남은 문제', 21, 41, [
          n('브레이크와 브레이크액 점검하기', 21, 30),
          n('배터리와 점화 플러그 교체하기', 31, 41),
        ]),
        n('추워지기 전에', 42, 55, [
          n('타이어와 공기압 확인하기', 42, 48),
          n('부동액 점검하기', 49, 55),
        ]),
      ],
    },
    corea: {
      resumen:
        '북에서 중부로 내려가는 여행이에요. 시차에 적응하며 하노이 구시가지에서 며칠을 보내고, 다낭과 호이안에서 ' +
        '바다와 옛 거리로 마무리해요. 귀국 항공편도 다낭에서 출발해요.',
      nodos: [
        n('하노이', 0, 4, [
          n('하노이 구시가지에 도착해서 정처 없이 걸어보기', 0, 1),
          n('문묘와 호안끼엠 호수 둘러보기', 2, 2),
          n('서호에서 커피 로스터리를 돌아보고 동쑤언 시장에서 반꾸온을 맛보며 자꽝 언덕에 오르기', 3, 4),
        ]),
        n('다낭과 호이안', 5, 8, [
          n('다낭 안방 해변으로 이동하기', 5, 6),
          n('호이안 구시가지와 어시장 둘러보기', 7, 8),
        ]),
        n('다낭에서 마무리', 9, 11, [
          n('오행산 사원에 올라가기', 9, 10),
          n('안방 해변에서 여행을 정리하고 귀국 준비하기', 11, 11),
        ]),
      ],
    },
    fondo: {
      resumen:
        '고정비 3개월치를 모으는 데 24주예요. 먼저 얼마가 필요한지 파악하고, 월급날마다 따로 떼어두고, ' +
        '어려운 부분은—손대지 않는 거예요.',
      nodos: [
        n('필요한 금액 파악하기', 0, 13, [
          n('고정비 3개월치 합산하기', 0, 6),
          n('목표 금액 정하고 적어두기', 7, 13),
        ]),
        n('쓰기 전에 먼저 떼어두기', 14, 90, [
          n('월급날 자동이체 설정하기', 14, 48),
          n('과외로 번 돈 거기에 넣기', 49, 90),
        ]),
        n('손대지 않기', 91, 167, [
          n('카드 연결 안 한 별도 계좌 만들기', 91, 118),
          n('한 달에 한 번 잔액 확인하기', 119, 167),
        ]),
      ],
    },
    formulario: {
      resumen:
        '중간고사까지 남은 6주예요. 먼저 공식을 모아서 이해하고, 다음은 안 보고도 풀릴 때까지 연습하고, ' +
        '마지막엔 나만의 문제로 마무리해요.',
      nodos: [
        n('범위 안 공식 모으기', 0, 13, [
          n('운동학과 동역학 공식 정리하기', 0, 6),
          n('에너지 공식을 단위와 함께 추가하기', 7, 13),
        ]),
        n('저절로 풀릴 때까지 연습하기', 14, 34, [
          n('포물선 운동 문제 10개 풀기', 14, 23),
          n('에너지와 일 문제 10개 풀기', 24, 34),
        ]),
        n('나만의 정리로 마무리하기', 35, 41, [
          n('계속 틀리는 부분 다시 보기', 35, 38),
          n('이번 학기 공식 노트 만들기', 39, 41),
        ]),
      ],
    },
  },
  ru: {
    maraton: {
      resumen:
        'Нужно 24 недели: восемь недель лёгкой базы, чтобы восстановиться после прошлого марафона, а при 10 ' +
        'часах в неделю марафонский блок и снижение нагрузки не уместить в меньший срок — иначе рискуешь ' +
        'повторить травму.',
      nodos: [
        n('Восстановить базу без боли', 0, 55, [
          n('Бегать 40 минут в разговорном темпе', 0, 20),
          n('Добавить длительную пробежку на 90 минут', 21, 41),
          n('Укреплять тазобедренные мышцы дважды в неделю', 42, 55),
        ]),
        n('Наращивать объём постепенно', 56, 104, [
          n('Довести объём до 60 км в неделю без дискомфорта', 56, 76),
          n('Пробежать длительную на 2 часа 30 минут', 77, 90),
          n('Сделать восемь повторов в гору', 91, 104),
        ]),
        n('Марафонский специфический блок', 105, 146, [
          n('Бегать отрезки по 1 км в темпе 10 км', 105, 118),
          n('Пробежать 20 км в целевом темпе', 119, 132),
          n('Пробежать генеральную репетицию на 32 км с питанием', 133, 146),
        ]),
        n('Снизить нагрузку и подойти к старту в форме', 147, 167, [
          n('Снизить объём вдвое', 147, 160),
          n('Отрепетировать завтрак и стартовый темп', 161, 167),
        ]),
      ],
    },
    cocina: {
      meta: 'Построить кухню',
      categoria: 'Дом',
      resumen:
        'Построить рабочую кухню за 13 недель по 5 часов в неделю: планирование, монтаж базовой конструкции, ' +
        'подключение воды и газа, электрика, отделка и финальные проверки.',
      nodos: [
        n('Планирование и подготовка', 0, 13, [
          n('Спроектировать планировку и выбрать материалы', 0, 6),
          n('Получить разрешения и составить бюджет', 7, 13),
        ]),
        n('Монтаж базовой конструкции', 14, 34, [
          n('Демонтировать старую кухню и подготовить пространство', 14, 20),
          n('Установить нижние шкафы и ящики', 21, 30),
          n('Установить верхние шкафы и полки', 31, 34),
        ]),
        n('Подключение воды и газа', 35, 55, [
          n('Проложить трубы холодной и горячей воды', 35, 44),
          n('Подключить мойку и смеситель', 45, 49),
          n('Подвести газ к плите', 50, 55),
        ]),
        n('Электромонтаж', 56, 69, [
          n('Проложить линии и установить электрощит', 56, 61),
          n('Установить розетки и выключатели', 62, 65),
          n('Подключить вытяжку и освещение', 66, 69),
        ]),
        n('Отделка', 70, 83, [
          n('Установить столешницу и фартук', 70, 76),
          n('Заделать швы и покрасить стены', 77, 80),
          n('Установить фурнитуру и дверцы', 81, 83),
        ]),
        n('Финальные проверки и сдача', 84, 90, [
          n('Проверить утечки воды и газа', 84, 86),
          n('Проверить электропроводку и технику', 87, 88),
          n('Провести финальную уборку и мелкие доработки', 89, 90),
        ]),
      ],
    },
    posgrado: {
      resumen:
        'Двадцать одна неделя, чтобы дойти до дедлайна без спешки: сначала выбрать программы, потом ' +
        'вступительный экзамен, а мотивационное письмо оставить напоследок — его переписывают чаще всего.',
      nodos: [
        n('Выбрать программы и требования', 0, 27, [
          n('Сравнить шесть программ и их дедлайны', 0, 13),
          n('Собрать требования и документы для каждой', 14, 27),
        ]),
        n('Вступительный экзамен', 28, 83, [
          n('Повторить линейную алгебру и дифференциальные уравнения', 28, 48),
          n('Решить три полных пробных экзамена', 49, 69),
          n('Сдать вступительный экзамен', 70, 83),
        ]),
        n('Рекомендации и диплом', 84, 104, [
          n('Попросить три рекомендательных письма', 84, 93),
          n('Перевести и заверить диплом с приложением', 94, 104),
        ]),
        n('Мотивационное письмо и портфолио', 105, 132, [
          n('Написать первый черновик письма', 105, 118),
          n('Показать его преподавательнице астрофизики', 119, 125),
          n('Собрать портфолио проектов', 126, 132),
        ]),
        n('Отправить заявки', 133, 146, [
          n('Заполнить формы для всех шести вузов', 133, 139),
          n('Оплатить сборы и отправить до дедлайна', 140, 146),
        ]),
      ],
    },
    nutricion: {
      resumen:
        'Двадцать три недели, привязанные к плану тренировок: питаться под тренировки, пока растёт объём, ' +
        'отрабатывать питание на дистанции во время длительных пробежек, а углеводную загрузку оставить напоследок.',
      nodos: [
        n('Питаться под тренировки', 0, 55, [
          n('Укладываться в 2400 ккал в дни тренировок', 0, 27),
          n('Завтракать перед длительной пробежкой', 28, 41),
          n('Выпивать три литра воды в жаркие дни', 42, 55),
        ]),
        n('Отработать питание на гонке', 56, 111, [
          n('Принимать гель и воду каждые 45 минут на длительных', 56, 76),
          n('Есть ужин с высоким содержанием углеводов накануне', 77, 90),
          n('Повторить завтрак дня старта три раза', 91, 111),
        ]),
        n('Углеводная загрузка и неделя гонки', 112, 163, [
          n('Довести углеводы до 7 г на килограмм веса', 112, 146),
          n('Заранее составить список покупок', 147, 156),
          n('Позавтракать в день марафона без экспериментов', 157, 163),
        ]),
      ],
    },
    sueno: {
      resumen:
        'Шесть недель в три шага: сначала время отбоя, потом комната, и только в конце — замеры. Менять ' +
        'три вещи разом — так и не узнаешь, что сработало.',
      nodos: [
        n('Заканчивать день в одно и то же время', 0, 13, [
          n('Выключать экраны в 23:10', 0, 6),
          n('Не пить кофеин после 16:00', 7, 13),
        ]),
        n('Подготовить спальню', 14, 27, [
          n('Приглушать свет за час до сна', 14, 20),
          n('Оставлять телефон за пределами спальни', 21, 27),
        ]),
        n('Измерять и корректировать', 28, 41, [
          n('Записывать, сколько времени уходит на засыпание', 28, 34),
          n('Вставать в одно время и по воскресеньям', 35, 41),
        ]),
      ],
    },
    memorias: {
      resumen:
        'Восемь недель, чтобы закрыть год на бумаге: наверстать то, что осталось наполовину, вести по ' +
        'одному воспоминанию в неделю и закончить упорядоченным альбомом.',
      nodos: [
        n('Наверстать пропущенное', 0, 20, [
          n('Дописать три дня поездки, оставшиеся незаконченными', 0, 10),
          n('Добавить фото к записям о трудном периоде', 11, 20),
        ]),
        n('По одному воспоминанию в неделю', 21, 41, [
          n('Писать в воскресенье вечером', 21, 34),
          n('Выбирать фото месяца', 35, 41),
        ]),
        n('Альбом года', 42, 55, [
          n('Просмотреть все двенадцать записей и упорядочить их', 42, 48),
          n('Показать альбом семье', 49, 55),
        ]),
      ],
    },
    calma: {
      resumen:
        'Четыре недели без давления: найти время, которое реально существует, увеличить практику с пяти ' +
        'до десяти минут и привязать её к тому, что ты и так уже делаешь.',
      nodos: [
        n('Найти подходящий момент', 0, 6, [
          n('Попробовать медитировать после смены', 0, 3),
          n('Держать подушку для медитации на виду', 4, 6),
        ]),
        n('Десять минут подряд', 7, 20, [
          n('Практиковать квадратное дыхание пять дней', 7, 13),
          n('Увеличить время с пяти до десяти минут', 14, 20),
        ]),
        n('Сделать так, чтобы практика держалась сама', 21, 27, [
          n('Записывать одну благодарность в конце практики', 21, 27),
        ]),
      ],
    },
    nocturno: {
      resumen:
        'Шестнадцать недель по четыре часа в неделю: две — на чтение партитуры, шесть — на то, чтобы ' +
        'свести руки вместе, четыре — на педаль и украшения, и две — чтобы сыграть всё целиком без остановок.',
      nodos: [
        n('Читать партитуру', 0, 27, [
          n('Разобрать по нотам первые две страницы', 0, 13),
          n('Играть каждой рукой отдельно на половинной скорости', 14, 27),
        ]),
        n('Свести руки вместе', 28, 69, [
          n('Сыграть первую страницу целиком', 28, 48),
          n('Сыграть вторую страницу целиком', 49, 69),
        ]),
        n('Украшения и педаль', 70, 97, [
          n('Отработать триоли в 16-м такте', 70, 83),
          n('Нажимать педаль по гармонии, а не по такту', 84, 97),
        ]),
        n('Сыграть целиком', 98, 111, [
          n('Записать себя три раза подряд', 98, 104),
          n('Сыграть для семьи', 105, 111),
        ]),
      ],
    },
    prototipo: {
      resumen:
        'Десять недель, чтобы перестать крутить идею в голове: выбрать одну, сделать версию на один ' +
        'вечер и решать по тому, что получилось, а не по тому, что представляется.',
      nodos: [
        n('Выбрать', 0, 13, [
          n('Оценить пять финалистов из карты идей', 0, 6),
          n('Отбросить три без сожалений', 7, 13),
        ]),
        n('Проверить в малом масштабе', 14, 41, [
          n('Сделать версию на один вечер', 14, 27),
          n('Показать её трём людям', 28, 41),
        ]),
        n('Решать на основе фактов', 42, 69, [
          n('Записать, что пошло не так', 42, 55),
          n('Составить диаграмму решения: продолжать или отпустить', 56, 69),
        ]),
      ],
    },
    b2: {
      resumen:
        'Двадцать недель: закрыть то, что осталось от B1, расширить словарный запас, разговориться на ' +
        'практике и оставить пробные экзамены напоследок.',
      nodos: [
        n('Закрыть B1', 0, 34, [
          n('Повторить накопившиеся карточки', 0, 20),
          n('Закончить программу по грамматике', 21, 34),
        ]),
        n('Словарный запас B2', 35, 83, [
          n('Изучать по сорок новых карточек в неделю', 35, 62),
          n('Читать одну новость в день на изучаемом языке', 63, 83),
        ]),
        n('Говорить не задумываясь', 84, 118, [
          n('Вести три долгих разговора в неделю', 84, 104),
          n('Записывать себя, рассказывая о прошедшем дне', 105, 118),
        ]),
        n('Экзамен', 119, 139, [
          n('Пройти два полных пробных экзамена', 119, 132),
          n('Повторять только то, что не получается', 133, 139),
        ]),
      ],
    },
    semestral: {
      resumen:
        'Восемь недель до сдачи: теоретическая база, лабораторная работа и целая неделя, отведённая на ' +
        'написание и репетицию защиты.',
      nodos: [
        n('Теоретическая база', 0, 20, [
          n('Собрать десять источников', 0, 10),
          n('Написать обзор существующих исследований', 11, 20),
        ]),
        n('Лабораторная работа', 21, 41, [
          n('Собрать экспериментальную установку', 21, 30),
          n('Провести три серии измерений', 31, 41),
        ]),
        n('Сдача', 42, 55, [
          n('Написать результаты и выводы', 42, 48),
          n('Подготовить постер и порепетировать защиту', 49, 55),
        ]),
      ],
    },
    racha: {
      resumen:
        'Четыре недели, чтобы чтение выпуска перестало зависеть от памяти: фиксированное время, ' +
        'распределение тем между помощниками и итог месяца, на который можно взглянуть.',
      nodos: [
        n('Не пропускать выпуск', 0, 9, [
          n('Читать его в перерыве смены', 0, 4),
          n('Поставить напоминание на 14:00', 5, 9),
        ]),
        n('Распределить нагрузку', 10, 19, [
          n('Отдать спорт и науку двум помощникам', 10, 14),
          n('Слушать сводку за завтраком', 15, 19),
        ]),
        n('Подвести итог месяца', 20, 27, [
          n('Сохранить три новости, которые того стоили', 20, 24),
          n('Посчитать серию дней подряд и записать её', 25, 27),
        ]),
      ],
    },
    archivo: {
      resumen:
        'Двенадцать недель, чтобы разобрать завалы в архиве: от того, что уже начато, до того, что ждёт ' +
        'дольше всего.',
      nodos: [
        n('То, что уже начато', 0, 27, [
          n('Досмотреть сериал, брошенный на середине', 0, 13),
          n('Дочитать книгу с прикроватной тумбочки', 14, 27),
        ]),
        n('Фильмы в очереди', 28, 55, [
          n('Смотреть по два раза в неделю', 28, 48),
          n('Писать рецензию после каждого фильма', 49, 55),
        ]),
        n('Игра, которая ждёт уже год', 56, 83, [
          n('Продолжить с последнего сохранения', 56, 76),
          n('Оценить и занести в архив всё просмотренное', 77, 83),
        ]),
      ],
    },
    coche: {
      resumen:
        'Восемь недель по срочности: сначала то, что требует закон и что имеет срок, потом то, что ' +
        'осталось после поломки, а дела на холода — напоследок.',
      nodos: [
        n('То, что требует закон', 0, 20, [
          n('Пройти полугодовой техосмотр', 0, 10),
          n('Продлить транспортный налог', 11, 20),
        ]),
        n('То, что осталось после поломки', 21, 41, [
          n('Проверить тормоза и тормозную жидкость', 21, 30),
          n('Заменить аккумулятор и свечи', 31, 41),
        ]),
        n('Перед холодами', 42, 55, [
          n('Проверить шины и давление', 42, 48),
          n('Проверить антифриз', 49, 55),
        ]),
      ],
    },
    corea: {
      resumen:
        'Двенадцать дней с севера на юг: четыре дня в Сеуле для акклиматизации после перелёта, ' +
        'исторический центр страны в середине маршрута и Чеджу в конце — обратный рейс тоже из Сеула.',
      nodos: [
        n('Сеул', 0, 4, [
          n('Дворец Кёнбоккун и квартал Букчон', 0, 1),
          n('Рынок Кванджан и Мёндон', 2, 2),
          n('Поездка в демилитаризованную зону', 3, 4),
        ]),
        n('Кёнджу и Пусан', 5, 8, [
          n('Королевские гробницы и храм Пульгукса', 5, 6),
          n('Деревня Камчхон и рынок Чагальчхи', 7, 8),
        ]),
        n('Остров Чеджу', 9, 11, [
          n('Рассвет на пике Сонсан Ильчхульбон', 9, 10),
          n('Вернуться в Сеул на последнюю ночь', 11, 11),
        ]),
      ],
    },
    fondo: {
      resumen:
        'Двадцать четыре недели, чтобы накопить на три месяца обязательных расходов: сначала понять, ' +
        'сколько это, потом откладывать в день зарплаты, а самое сложное — не трогать эти деньги.',
      nodos: [
        n('Понять, сколько нужно', 0, 13, [
          n('Сложить обязательные расходы за три месяца', 0, 6),
          n('Определить цель и записать её', 7, 13),
        ]),
        n('Откладывать до того, как потратишь', 14, 90, [
          n('Настроить автоперевод в день зарплаты', 14, 48),
          n('Добавлять туда доход от репетиторства', 49, 90),
        ]),
        n('Не трогать эти деньги', 91, 167, [
          n('Держать их на отдельном счёте без карты', 91, 118),
          n('Проверять баланс раз в месяц', 119, 167),
        ]),
      ],
    },
    formulario: {
      resumen:
        'Шесть недель — вот сколько остаётся до контрольной: сначала собрать формулы и разобраться в них, ' +
        'потом решать, пока не начнёт получаться без подглядывания, и закончить своей собственной задачей.',
      nodos: [
        n('Собрать формулы по программе', 0, 13, [
          n('Выписать формулы кинематики и динамики', 0, 6),
          n('Добавить формулы энергии вместе с единицами измерения', 7, 13),
        ]),
        n('Решать, пока не начнёт получаться само собой', 14, 34, [
          n('Решить десять задач на движение тела, брошенного под углом', 14, 23),
          n('Решить десять задач на энергию и работу', 24, 34),
        ]),
        n('Завершить своей собственной задачей', 35, 41, [
          n('Повторить то, что всё ещё не получается', 35, 38),
          n('Составить шпаргалку по формулам за семестр', 39, 41),
        ]),
      ],
    },
  },
  hi: {
    maraton: {
      resumen:
        '24 हफ़्ते चाहिए: पिछली मैराथन से उबरने के लिए हल्की बुनियाद के आठ हफ़्ते, और हफ़्ते में 10 घंटे की रफ़्तार पर ' +
        'मैराथन-विशेष चरण और टेपरिंग इससे कम समय में नहीं समातीं — वरना वही चोट फिर से हो सकती है।',
      nodos: [
        n('बिना दर्द के बुनियाद फिर से बनाना', 0, 55, [
          n('बातचीत जितनी रफ़्तार पर 40 मिनट दौड़ना', 0, 20),
          n('90 मिनट की लंबी दौड़ जोड़ना', 21, 41),
          n('हफ़्ते में दो बार कूल्हों की मज़बूती वाली कसरत करना', 42, 55),
        ]),
        n('धीरे-धीरे दूरी बढ़ाना', 56, 104, [
          n('बिना तकलीफ़ हफ़्ते में 60 किमी तक पहुँचना', 56, 76),
          n('2 घंटे 30 मिनट की लंबी दौड़ लगाना', 77, 90),
          n('चढ़ाई पर आठ राउंड लगाना', 91, 104),
        ]),
        n('मैराथन-विशेष चरण', 105, 146, [
          n('10K की रफ़्तार पर 1 किमी के दौर लगाना', 105, 118),
          n('तय रफ़्तार पर 20 किमी की लंबी दौड़ लगाना', 119, 132),
          n('खाने-पीने के साथ 32 किमी की पूर्वाभ्यास दौड़ लगाना', 133, 146),
        ]),
        n('टेपरिंग करके पूरी तैयारी के साथ पहुँचना', 147, 167, [
          n('दूरी आधी करना', 147, 160),
          n('नाश्ते और शुरुआती रफ़्तार का पूर्वाभ्यास करना', 161, 167),
        ]),
      ],
    },
    cocina: {
      meta: 'रसोई बनाना',
      categoria: 'घर',
      resumen:
        'हफ़्ते में 5 घंटे देकर 13 हफ़्तों में एक चलती-फिरती रसोई बनाना: योजना, आधार ढांचे की स्थापना, पानी और गैस के ' +
        'कनेक्शन, बिजली, फ़िनिशिंग और आख़िरी जांच।',
      nodos: [
        n('योजना और तैयारी', 0, 13, [
          n('लेआउट डिज़ाइन करना और सामान चुनना', 0, 6),
          n('अनुमतियां लेना और बजट तय करना', 7, 13),
        ]),
        n('आधार ढांचे की स्थापना', 14, 34, [
          n('पुरानी रसोई हटाना और जगह तैयार करना', 14, 20),
          n('नीचे की अलमारियां और दराज़ लगाना', 21, 30),
          n('ऊपर की अलमारियां और शेल्फ़ लगाना', 31, 34),
        ]),
        n('पानी और गैस के कनेक्शन', 35, 55, [
          n('ठंडे और गरम पानी की पाइपलाइन बिछाना', 35, 44),
          n('सिंक और नल जोड़ना', 45, 49),
          n('चूल्हे के लिए गैस कनेक्शन लगाना', 50, 55),
        ]),
        n('बिजली की फिटिंग', 56, 69, [
          n('वायरिंग बिछाना और मेन बोर्ड लगाना', 56, 61),
          n('प्लग और स्विच लगाना', 62, 65),
          n('चिमनी और रोशनी जोड़ना', 66, 69),
        ]),
        n('फ़िनिशिंग', 70, 83, [
          n('काउंटरटॉप और बैकस्प्लैश लगाना', 70, 76),
          n('जोड़ों को सील करना और दीवारें रंगना', 77, 80),
          n('हैंडल और दरवाज़े लगाना', 81, 83),
        ]),
        n('आख़िरी जांच और सुपुर्दगी', 84, 90, [
          n('पानी और गैस के रिसाव की जांच करना', 84, 86),
          n('बिजली के सर्किट और उपकरण जांचना', 87, 88),
          n('आख़िरी सफ़ाई और बारीक सुधार करना', 89, 90),
        ]),
      ],
    },
    posgrado: {
      resumen:
        'बिना जल्दबाज़ी डेडलाइन तक पहुंचने के लिए इक्कीस हफ़्ते: पहले प्रोग्राम चुनना, फिर प्रवेश परीक्षा, और ' +
        'स्टेटमेंट ऑफ़ पर्पस को आख़िर के लिए रखना — यही वह है जिसे सबसे ज़्यादा दोबारा लिखा जाता है।',
      nodos: [
        n('प्रोग्राम और ज़रूरतें चुनना', 0, 27, [
          n('छह प्रोग्राम और उनकी डेडलाइन की तुलना करना', 0, 13),
          n('हर एक की ज़रूरतें और दस्तावेज़ जुटाना', 14, 27),
        ]),
        n('प्रवेश परीक्षा', 28, 83, [
          n('रेखीय बीजगणित और अवकल समीकरण दोहराना', 28, 48),
          n('तीन पूरे अभ्यास पेपर हल करना', 49, 69),
          n('प्रवेश परीक्षा देना', 70, 83),
        ]),
        n('सिफ़ारिशी पत्र और अंकतालिका', 84, 104, [
          n('तीन सिफ़ारिशी पत्र मांगना', 84, 93),
          n('अंकतालिका का अनुवाद करवाना और प्रमाणित करवाना', 94, 104),
        ]),
        n('स्टेटमेंट ऑफ़ पर्पस और पोर्टफ़ोलियो', 105, 132, [
          n('पत्र का पहला मसौदा लिखना', 105, 118),
          n('खगोल-भौतिकी की प्रोफ़ेसर के साथ उसे जांचना', 119, 125),
          n('प्रोजेक्ट का पोर्टफ़ोलियो तैयार करना', 126, 132),
        ]),
        n('आवेदन भेजना', 133, 146, [
          n('छहों संस्थानों के फ़ॉर्म भरना', 133, 139),
          n('फ़ीस भरना और डेडलाइन से पहले भेजना', 140, 146),
        ]),
      ],
    },
    nutricion: {
      resumen:
        'ट्रेनिंग कैलेंडर से जुड़े तेईस हफ़्ते: दूरी बढ़ने के साथ ट्रेनिंग के हिसाब से खाना, लंबी दौड़ों में रेस-डे का ' +
        'खाना आज़माना, और कार्ब लोडिंग को आख़िर के लिए रखना।',
      nodos: [
        n('ट्रेनिंग के हिसाब से खाना', 0, 55, [
          n('ट्रेनिंग वाले दिनों में 2,400 kcal पर रुकना', 0, 27),
          n('लंबी दौड़ से पहले नाश्ता करना', 28, 41),
          n('गर्मी के दिनों में तीन लीटर पानी पीना', 42, 55),
        ]),
        n('रेस-डे का खाना आज़माना', 56, 111, [
          n('लंबी दौड़ों में हर 45 मिनट पर जेल और पानी लेना', 56, 76),
          n('पिछली रात कार्ब्स से भरपूर खाना खाना', 77, 90),
          n('रेस-डे का नाश्ता तीन बार दोहराना', 91, 111),
        ]),
        n('कार्ब लोडिंग और रेस का हफ़्ता', 112, 163, [
          n('कार्ब्स को प्रति किलो 7 ग्राम तक बढ़ाना', 112, 146),
          n('ख़रीदारी की सूची पहले से तैयार रखना', 147, 156),
          n('मैराथन के दिन हमेशा वाला नाश्ता ही करना', 157, 163),
        ]),
      ],
    },
    sueno: {
      resumen:
        'तीन चरणों में छह हफ़्ते: पहले सोने का समय तय करना, फिर कमरा, और मापना सबसे आख़िर में — तीनों चीज़ें एक ' +
        'साथ बदलने से पता ही नहीं चलता कि किसने असर किया।',
      nodos: [
        n('हर दिन एक ही समय पर दिन ख़त्म करना', 0, 13, [
          n('23:10 बजे स्क्रीन बंद करना', 0, 6),
          n('16:00 बजे के बाद कैफ़ीन न लेना', 7, 13),
        ]),
        n('कमरा तैयार करना', 14, 27, [
          n('सोने से एक घंटा पहले रोशनी धीमी करना', 14, 20),
          n('फ़ोन को शयनकक्ष से बाहर रखना', 21, 27),
        ]),
        n('मापना और सुधारना', 28, 41, [
          n('नींद आने में लगने वाला समय लिखना', 28, 34),
          n('रविवार को भी उसी समय उठना', 35, 41),
        ]),
      ],
    },
    memorias: {
      resumen:
        'लिखे हुए साल को समेटने के लिए आठ हफ़्ते: जो आधा-अधूरा रह गया उसे पूरा करना, हर हफ़्ते एक याद संभालकर ' +
        'रखना और साल के अंत में अल्बम को व्यवस्थित करके ख़त्म करना।',
      nodos: [
        n('जो छूट गया उसे पूरा करना', 0, 20, [
          n('यात्रा के अधूरे रह गए तीन दिन लिखना', 0, 10),
          n('मुश्किल दौर की एंट्रीज़ में फ़ोटो जोड़ना', 11, 20),
        ]),
        n('हर हफ़्ते एक याद', 21, 41, [
          n('रविवार रात को लिखना', 21, 34),
          n('महीने की फ़ोटो चुनना', 35, 41),
        ]),
        n('साल का अल्बम', 42, 55, [
          n('बारहों महीनों को देखना और व्यवस्थित करना', 42, 48),
          n('परिवार को दिखाना', 49, 55),
        ]),
      ],
    },
    calma: {
      resumen:
        'बिना दबाव के चार हफ़्ते: वह समय ढूंढना जो सच में मिलता है, पांच से दस मिनट तक बढ़ाना, और उसे किसी पहले ' +
        'से चल रही आदत से जोड़ना।',
      nodos: [
        n('सही समय ढूंढना', 0, 6, [
          n('शिफ़्ट से लौटकर ध्यान आज़माना', 0, 3),
          n('कुशन को नज़र आने वाली जगह रखना', 4, 6),
        ]),
        n('लगातार दस मिनट', 7, 20, [
          n('पांच दिन बॉक्स ब्रीदिंग करना', 7, 13),
          n('पांच से दस मिनट तक बढ़ाना', 14, 20),
        ]),
        n('अपने आप चलते रहने लायक बनाना', 21, 27, [
          n('ख़त्म करके एक आभार लिखना', 21, 27),
        ]),
      ],
    },
    nocturno: {
      resumen:
        'हफ़्ते में चार घंटे के हिसाब से सोलह हफ़्ते: दो हफ़्ते स्वरलिपि पढ़ने में, छह दोनों हाथ मिलाने में, चार पेडल ' +
        'और सजावटी स्वरों में, और दो बिना रुके पूरा बजाने में।',
      nodos: [
        n('स्वरलिपि पढ़ना', 0, 27, [
          n('पहले दो पन्नों को सुर में गुनगुनाना', 0, 13),
          n('आधी रफ़्तार पर एक-एक हाथ से बजाना', 14, 27),
        ]),
        n('दोनों हाथ मिलाना', 28, 69, [
          n('पहला पन्ना पूरा बजाना', 28, 48),
          n('दूसरा पन्ना पूरा बजाना', 49, 69),
        ]),
        n('सजावटी स्वर और पेडल', 70, 97, [
          n('16वें कम्पास के त्रिक स्वर ठीक करना', 70, 83),
          n('कम्पास के बजाय सुर-संगति के हिसाब से पेडल दबाना', 84, 97),
        ]),
        n('पूरा बजाना', 98, 111, [
          n('लगातार तीन बार अपनी रिकॉर्डिंग करना', 98, 104),
          n('परिवार के सामने बजाना', 105, 111),
        ]),
      ],
    },
    prototipo: {
      resumen:
        'बार-बार सोचते रहना बंद करने के लिए दस हफ़्ते: एक चुनना, एक दोपहर में बनने लायक वर्शन बनाना, और जो असल ' +
        'में हुआ उसी के हिसाब से फ़ैसला लेना, न कि जो सोचा था उसके हिसाब से।',
      nodos: [
        n('एक चुनना', 0, 13, [
          n('मैप के पांच फ़ाइनलिस्ट को अंक देना', 0, 6),
          n('बेझिझक तीन को हटाना', 7, 13),
        ]),
        n('छोटे स्तर पर आज़माना', 14, 41, [
          n('एक दोपहर में बनने लायक वर्शन बनाना', 14, 27),
          n('तीन लोगों को दिखाना', 28, 41),
        ]),
        n('डेटा के हिसाब से फ़ैसला लेना', 42, 69, [
          n('क्या ग़लत हुआ यह लिखना', 42, 55),
          n('जारी रखना है या छोड़ना, यह डिसीज़न डायग्राम से तय करना', 56, 69),
        ]),
      ],
    },
    b2: {
      resumen:
        'बीस हफ़्ते: B1 में जो अधूरा रह गया उसे पूरा करना, शब्दावली बढ़ाना, बोलकर ज़ुबान खोलना, और मॉक टेस्ट को ' +
        'आख़िर के लिए रखना।',
      nodos: [
        n('B1 पूरा करना', 0, 34, [
          n('बाकी रह गए कार्ड दोहराना', 0, 20),
          n('व्याकरण का पाठ्यक्रम पूरा करना', 21, 34),
        ]),
        n('B2 की शब्दावली', 35, 83, [
          n('हफ़्ते में चालीस नए कार्ड सीखना', 35, 62),
          n('हर दिन उस भाषा में एक ख़बर पढ़ना', 63, 83),
        ]),
        n('बिना सोचे बोलना', 84, 118, [
          n('हफ़्ते में तीन लंबी बातचीत करना', 84, 104),
          n('दिन भर की बात सुनाते हुए ख़ुद को रिकॉर्ड करना', 105, 118),
        ]),
        n('परीक्षा', 119, 139, [
          n('दो पूरे मॉक टेस्ट देना', 119, 132),
          n('सिर्फ़ जो ग़लत होता है उसे दोहराना', 133, 139),
        ]),
      ],
    },
    semestral: {
      resumen:
        'जमा करने तक आठ हफ़्ते: सैद्धांतिक ढांचा, लैब का काम, और लिखने व बचाव (डिफ़ेंस) के पूर्वाभ्यास के लिए पूरा ' +
        'एक हफ़्ता अलग रखना।',
      nodos: [
        n('सैद्धांतिक ढांचा', 0, 20, [
          n('दस स्रोत जुटाना', 0, 10),
          n('मौजूदा शोध का सार लिखना', 11, 20),
        ]),
        n('लैब का काम', 21, 41, [
          n('प्रयोग तैयार करना', 21, 30),
          n('तीन दौर में मापन करना', 31, 41),
        ]),
        n('जमा करना', 42, 55, [
          n('नतीजे और निष्कर्ष लिखना', 42, 48),
          n('पोस्टर बनाना और डिफ़ेंस का पूर्वाभ्यास करना', 49, 55),
        ]),
      ],
    },
    racha: {
      resumen:
        'अख़बार पढ़ना याद रखने पर निर्भर न रहे, इसके लिए चार हफ़्ते: एक तय समय, सहायकों के बीच काम का बंटवारा, ' +
        'और महीने के अंत में देखने लायक सार।',
      nodos: [
        n('चूकना नहीं', 0, 9, [
          n('शिफ़्ट के ब्रेक में पढ़ना', 0, 4),
          n('14:00 बजे रिमाइंडर लगाना', 5, 9),
        ]),
        n('काम बांटना', 10, 19, [
          n('खेल और विज्ञान दो सहायकों को सौंपना', 10, 14),
          n('नाश्ता करते हुए सार सुनना', 15, 19),
        ]),
        n('महीना समेटना', 20, 27, [
          n('सबसे अच्छी तीन ख़बरें सहेजना', 20, 24),
          n('सिलसिला गिनकर लिखना', 25, 27),
        ]),
      ],
    },
    archivo: {
      resumen:
        'अटकी हुई सूची ख़ाली करने के लिए बारह हफ़्ते, जो पहले से शुरू है उससे लेकर जो सबसे लंबे समय से इंतज़ार में है ' +
        'उस तक।',
      nodos: [
        n('जो पहले से शुरू कर रखा है', 0, 27, [
          n('आधी छूटी सीरीज़ पूरी करना', 0, 13),
          n('साइड टेबल पर रखी किताब पूरी करना', 14, 27),
        ]),
        n('बाकी रह गई फ़िल्में', 28, 55, [
          n('हफ़्ते में दो बार देखना', 28, 48),
          n('हर एक ख़त्म करने पर समीक्षा लिखना', 49, 55),
        ]),
        n('एक साल से पड़ा वीडियो गेम', 56, 83, [
          n('आख़िरी सेव से दोबारा शुरू करना', 56, 76),
          n('देखी हुई हर चीज़ को रेट करके सहेजना', 77, 83),
        ]),
      ],
    },
    coche: {
      resumen:
        'ज़रूरत के हिसाब से तय आठ हफ़्ते: पहले जो क़ानून मांगता है और जिसकी तारीख़ तय है, फिर जो ख़राबी से बचा रह ' +
        'गया, और आख़िर में ठंड से जुड़े काम।',
      nodos: [
        n('जो क़ानून मांगता है', 0, 20, [
          n('छमाही जांच करवाना', 0, 10),
          n('रोड टैक्स रिन्यू करवाना', 11, 20),
        ]),
        n('जो ख़राबी से बचा रह गया', 21, 41, [
          n('ब्रेक और ब्रेक फ़्लूइड जांचना', 21, 30),
          n('बैटरी और स्पार्क प्लग बदलना', 31, 41),
        ]),
        n('ठंड से पहले', 42, 55, [
          n('टायर और हवा का दबाव जांचना', 42, 48),
          n('एंटीफ़्रीज़ जांचना', 49, 55),
        ]),
      ],
    },
    corea: {
      resumen:
        'उत्तर से दक्षिण तक बारह दिन: जेट लैग के लिए सोल में चार दिन, बीच में ऐतिहासिक इलाक़े, और आख़िर में जेजू ' +
        '— वापसी की फ़्लाइट भी सोल से।',
      nodos: [
        n('सोल', 0, 4, [
          n('ग्योंगबोकगुंग और बुकचोन इलाक़ा घूमना', 0, 1),
          n('ग्वांगजांग बाज़ार और म्योंगदोंग घूमना', 2, 2),
          n('DMZ की एक दिन की सैर', 3, 4),
        ]),
        n('ग्योंगजू और बुसान', 5, 8, [
          n('शाही मक़बरे और बुल्गुक्सा मंदिर देखना', 5, 6),
          n('गमचोन गांव और जगाल्ची बाज़ार घूमना', 7, 8),
        ]),
        n('जेजू द्वीप', 9, 11, [
          n('सोंगसान इलचुलबोंग पर सूर्योदय देखना', 9, 10),
          n('सोल लौटकर आख़िरी रात बिताना', 11, 11),
        ]),
      ],
    },
    fondo: {
      resumen:
        'तीन महीने के तय ख़र्च जोड़ने के लिए चौबीस हफ़्ते: पहले पता करना कितना चाहिए, फिर तनख़्वाह वाले दिन अलग ' +
        'रखना, और सबसे मुश्किल हिस्सा — उसे छूना नहीं।',
      nodos: [
        n('पता करना कितना चाहिए', 0, 13, [
          n('तीन महीनों के तय ख़र्च जोड़ना', 0, 6),
          n('लक्ष्य तय करना और लिख लेना', 7, 13),
        ]),
        n('ख़र्च करने से पहले अलग रखना', 14, 90, [
          n('तनख़्वाह वाले दिन ऑटो-ट्रांसफ़र लगाना', 14, 48),
          n('ट्यूशन से बची रक़म उसी में डालना', 49, 90),
        ]),
        n('उसे न छूना', 91, 167, [
          n('बिना कार्ड वाला अलग खाता रखना', 91, 118),
          n('महीने में एक बार बैलेंस देखना', 119, 167),
        ]),
      ],
    },
    formulario: {
      resumen:
        'मिड-टर्म तक बचे छह हफ़्ते: पहले सारे फ़ॉर्मूले जमा करके समझना, फिर बिना देखे हल होने तक अभ्यास करना, और ' +
        'आख़िर में अपना एक सवाल बनाकर ख़त्म करना।',
      nodos: [
        n('पाठ्यक्रम के फ़ॉर्मूले जमा करना', 0, 13, [
          n('गतिकी और बलगतिकी के फ़ॉर्मूले लिखना', 0, 6),
          n('ऊर्जा के फ़ॉर्मूले उनकी इकाइयों के साथ जोड़ना', 7, 13),
        ]),
        n('अपने आप हल होने तक अभ्यास करना', 14, 34, [
          n('प्रोजेक्टाइल मोशन के दस सवाल हल करना', 14, 23),
          n('ऊर्जा और कार्य के दस सवाल हल करना', 24, 34),
        ]),
        n('अपनी बनाई चीज़ से ख़त्म करना', 35, 41, [
          n('जो अब भी ग़लत होता है उसे दोहराना', 35, 38),
          n('इस सेमेस्टर की फ़ॉर्मूला शीट बनाना', 39, 41),
        ]),
      ],
    },
  },
  tr: {
    maraton: {
      resumen:
        'Sana 24 hafta gerekiyor: önceki maratondan toparlanmak için sekiz hafta hafif temel çalışması, ' +
        've haftada 10 saatlik tempoda maratona özel blokla son ayarlar, aynı sakatlığı tekrarlamadan daha ' +
        'kısaya sığmıyor.',
      nodos: [
        n('Temeli ağrısız yeniden kurmak', 0, 55, [
          n('Konuşabileceğin tempoda 40 dakika koşmak', 0, 20),
          n('90 dakikalık uzun koşuyu eklemek', 21, 41),
          n('Haftada iki kez kalça kuvvet çalışması yapmak', 42, 55),
        ]),
        n('Kademeli hacim artışı', 56, 104, [
          n("Rahatsızlık duymadan haftada 60 km'ye çıkmak", 56, 76),
          n('2 saat 30 dakikalık uzun koşu yapmak', 77, 90),
          n('Yokuşta sekiz tekrar koşmak', 91, 104),
        ]),
        n('Maratona özel blok', 105, 146, [
          n("10K temposunda 1 km'lik seriler koşmak", 105, 118),
          n("Hedef tempoda 20 km'lik uzun koşu yapmak", 119, 132),
          n("Beslenme dahil 32 km'lik prova koşusu yapmak", 133, 146),
        ]),
        n('Son ayarları yapıp sapasağlam varmak', 147, 167, [
          n('Hacmi yarıya indirmek', 147, 160),
          n('Kahvaltıyı ve start temposunu prova etmek', 161, 167),
        ]),
      ],
    },
    cocina: {
      meta: 'Mutfak tadilatı',
      categoria: 'Ev',
      resumen:
        'Haftada 5 saatle 13 haftada kullanışlı bir mutfak çıkarmak: planlama, temel yapının kurulumu, su ' +
        've gaz bağlantıları, elektrik, yüzey işleri ve son testler.',
      nodos: [
        n('Planlama ve hazırlık', 0, 13, [
          n('Yerleşimi tasarlamak ve malzemeleri seçmek', 0, 6),
          n('İzinleri almak ve bütçeyi çıkarmak', 7, 13),
        ]),
        n('Temel yapının kurulumu', 14, 34, [
          n('Eski mutfağı sökmek ve alanı hazırlamak', 14, 20),
          n('Alt dolapları ve çekmeceleri monte etmek', 21, 30),
          n('Üst dolapları ve rafları monte etmek', 31, 34),
        ]),
        n('Teknik bağlantılar (su ve gaz)', 35, 55, [
          n('Soğuk ve sıcak su borularını döşemek', 35, 44),
          n('Evyeyi ve musluğu bağlamak', 45, 49),
          n('Ocağın gaz bağlantısını yapmak', 50, 55),
        ]),
        n('Elektrik tesisatı', 56, 69, [
          n('Kabloları çekmek ve sigorta kutusunu kurmak', 56, 61),
          n('Prizleri ve anahtarları takmak', 62, 65),
          n('Davlumbazı ve aydınlatmayı bağlamak', 66, 69),
        ]),
        n('Yüzey işleri', 70, 83, [
          n('Tezgahı ve arkalığı monte etmek', 70, 76),
          n('Derzleri silikonlamak ve duvarları boyamak', 77, 80),
          n('Kulpları ve kapakları takmak', 81, 83),
        ]),
        n('Son testler ve teslim', 84, 90, [
          n('Su ve gaz kaçağı kontrolü yapmak', 84, 86),
          n('Devreleri ve beyaz eşyaları test etmek', 87, 88),
          n('Son temizlik ve ince ayarlar', 89, 90),
        ]),
      ],
    },
    posgrado: {
      resumen:
        'Son tarihe acele etmeden varman için yirmi bir hafta: önce programları seçmek, sonra giriş ' +
        'sınavı, ve en sona niyet mektubu — çünkü en çok o yeniden yazılıyor.',
      nodos: [
        n('Programları ve koşulları seçmek', 0, 27, [
          n('Altı programı ve son tarihlerini karşılaştırmak', 0, 13),
          n('Her birinin koşullarını ve belgelerini toplamak', 14, 27),
        ]),
        n('Giriş sınavı', 28, 83, [
          n('Lineer cebiri ve diferansiyel denklemleri tekrar etmek', 28, 48),
          n('Üç tam deneme sınavı çözmek', 49, 69),
          n('Giriş sınavına girmek', 70, 83),
        ]),
        n('Referans mektupları ve transkript', 84, 104, [
          n('Üç referans mektubu istemek', 84, 93),
          n('Transkripti tercüme ettirip onaylatmak', 94, 104),
        ]),
        n('Niyet mektubu ve portfolyo', 105, 132, [
          n('Mektubun ilk taslağını yazmak', 105, 118),
          n('Astrofizik hocasıyla birlikte gözden geçirmek', 119, 125),
          n('Proje portfolyosunu hazırlamak', 126, 132),
        ]),
        n('Başvuruları göndermek', 133, 146, [
          n('Altı okulun formlarını doldurmak', 133, 139),
          n('Ücretleri ödeyip son tarihten önce göndermek', 140, 146),
        ]),
      ],
    },
    nutricion: {
      resumen:
        'Antrenman takvimine bağlı yirmi üç hafta: hacim artarken antrenman için yemek, uzun koşularda ' +
        'yarış beslenmesini prova etmek ve karbonhidrat yüklemesini en sona bırakmak.',
      nodos: [
        n('Antrenman için beslenmek', 0, 55, [
          n('Antrenman günlerinde 2.400 kaloriyle sınırlı kalmak', 0, 27),
          n('Uzun koşudan önce kahvaltı yapmak', 28, 41),
          n('Sıcak günlerde üç litre su içmek', 42, 55),
        ]),
        n('Yarış beslenmesini prova etmek', 56, 111, [
          n('Uzun koşularda her 45 dakikada jel ve su almak', 56, 76),
          n('Bir gün öncesinden karbonhidrat ağırlıklı akşam yemeği yemek', 77, 90),
          n('Yarış günü kahvaltısını üç kez prova etmek', 91, 111),
        ]),
        n('Karbonhidrat yüklemesi ve yarış haftası', 112, 163, [
          n('Kilo başına 7 gram karbonhidrata çıkmak', 112, 146),
          n('Market listesini hazırlamış olmak', 147, 156),
          n('Maraton günü kahvaltısında sürpriz yapmamak', 157, 163),
        ]),
      ],
    },
    sueno: {
      resumen:
        'Üç adımda altı hafta: önce günü kapatma saati, sonra oda, ve ölçmeyi en sona bırakmak — üç şeyi ' +
        'aynı anda değiştirmek hangisinin işe yaradığını söylemez.',
      nodos: [
        n('Günü her gün aynı saatte kapatmak', 0, 13, [
          n("Ekranları 23:10'da kapatmak", 0, 6),
          n("16:00'dan sonra kafein almamak", 7, 13),
        ]),
        n('Odayı hazırlamak', 14, 27, [
          n('Yatmadan bir saat önce ışığı kısmak', 14, 20),
          n('Telefonu yatak odasının dışında bırakmak', 21, 27),
        ]),
        n('Ölçmek ve ayarlamak', 28, 41, [
          n('Uykuya dalmam ne kadar sürüyor not etmek', 28, 34),
          n('Pazar günleri de aynı saatte kalkmak', 35, 41),
        ]),
      ],
    },
    memorias: {
      resumen:
        'Yazılı yılı kapatmak için sekiz hafta: yarım kalanı tamamlamak, haftada bir anı yazmayı sürdürmek ' +
        've düzenlenmiş bir albümle bitirmek.',
      nodos: [
        n('Eksik kalanı tamamlamak', 0, 20, [
          n('Yolculuktan yarım kalan üç günü yazmak', 0, 10),
          n('Zor dönemin kayıtlarına fotoğraf eklemek', 11, 20),
        ]),
        n('Haftada bir anı', 21, 41, [
          n('Pazar akşamları yazmak', 21, 34),
          n('Ayın fotoğrafını seçmek', 35, 41),
        ]),
        n('Yılın albümü', 42, 55, [
          n('On iki ayı gözden geçirip düzenlemek', 42, 48),
          n('Aileye göstermek', 49, 55),
        ]),
      ],
    },
    calma: {
      resumen:
        'Baskısız dört hafta: gerçekten uyan boşluğu bulmak, beşten on dakikaya çıkmak ve zaten yaptığın ' +
        'bir şeye bağlamak.',
      nodos: [
        n('Anı bulmak', 0, 6, [
          n('Mesaiden dönünce meditasyon denemek', 0, 3),
          n('Minderi göz önünde bırakmak', 4, 6),
        ]),
        n('Kesintisiz on dakika', 7, 20, [
          n('Beş gün kutu nefesi yapmak', 7, 13),
          n('Beşten on dakikaya çıkmak', 14, 20),
        ]),
        n('Kendi kendine sürmesini sağlamak', 21, 27, [
          n('Bitirince bir şükran yazmak', 21, 27),
        ]),
      ],
    },
    nocturno: {
      resumen:
        'Haftada dört saatten on altı hafta: notaları okumaya iki, elleri birleştirmeye altı, pedal ve ' +
        'süslemelere dört, ve durmadan baştan sona çalmaya iki hafta.',
      nodos: [
        n('Notaları okumak', 0, 27, [
          n('İlk iki sayfayı solfej etmek', 0, 13),
          n('Yarı hızda elleri ayrı ayrı çalışmak', 14, 27),
        ]),
        n('Elleri birleştirmek', 28, 69, [
          n('İlk sayfayı baştan sona çalmak', 28, 48),
          n('İkinci sayfayı baştan sona çalmak', 49, 69),
        ]),
        n('Süsleme ve pedal', 70, 97, [
          n("16. ölçünün triolelerini oturtmak", 70, 83),
          n('Pedalı ölçüye değil armoniye göre basmak', 84, 97),
        ]),
        n('Baştan sona çalmak', 98, 111, [
          n('Kendimi arka arkaya üç kez kaydetmek', 98, 104),
          n('Aileye çalmak', 105, 111),
        ]),
      ],
    },
    prototipo: {
      resumen:
        'Etrafında dönüp durmayı bırakmak için on hafta: birini seçmek, bir öğleden sonrada yapılabilecek ' +
        'versiyonu hazırlamak ve hayal ettiğime değil olana göre karar vermek.',
      nodos: [
        n('Seçmek', 0, 13, [
          n('Haritadaki beş finalisti puanlamak', 0, 6),
          n('Vicdan azabı duymadan üçünü elemek', 7, 13),
        ]),
        n('Küçük ölçekte denemek', 14, 41, [
          n('Bir öğleden sonrada yapılacak versiyonu hazırlamak', 14, 27),
          n('Üç kişiye göstermek', 28, 41),
        ]),
        n('Verilerle karar vermek', 42, 69, [
          n('Neyin ters gittiğini not etmek', 42, 55),
          n('Karar diyagramı: devam mı bırakmak mı', 56, 69),
        ]),
      ],
    },
    b2: {
      resumen:
        "Yirmi hafta: B1'den açık kalanı kapatmak, kelime dağarcığını genişletmek, konuşarak dili çözmek " +
        've deneme sınavlarını en sona bırakmak.',
      nodos: [
        n("B1'i kapatmak", 0, 34, [
          n('Biriken kartları tekrar etmek', 0, 20),
          n('Gramer konularını bitirmek', 21, 34),
        ]),
        n('B2 kelime dağarcığı', 35, 83, [
          n('Haftada kırk yeni kart öğrenmek', 35, 62),
          n('Her gün o dilde bir haber okumak', 63, 83),
        ]),
        n('Düşünmeden konuşmak', 84, 118, [
          n('Haftada üç uzun sohbet etmek', 84, 104),
          n('Günü anlatırken kendimi kaydetmek', 105, 118),
        ]),
        n('Sınav', 119, 139, [
          n('İki tam deneme sınavı yapmak', 119, 132),
          n('Sadece yanlış yaptıklarımı tekrar etmek', 133, 139),
        ]),
      ],
    },
    semestral: {
      resumen:
        'Teslime varmak için sekiz hafta: kuramsal çerçeve, laboratuvar, ve yazmaya ve savunmayı prova ' +
        'etmeye ayrılmış tam bir hafta.',
      nodos: [
        n('Kuramsal çerçeve', 0, 20, [
          n('On kaynağı bir araya getirmek', 0, 10),
          n('Literatür özetini yazmak', 11, 20),
        ]),
        n('Laboratuvar', 21, 41, [
          n('Deneyi kurmak', 21, 30),
          n('Üç tur ölçüm almak', 31, 41),
        ]),
        n('Teslim', 42, 55, [
          n('Sonuçları ve çıkarımları yazmak', 42, 48),
          n('Posteri hazırlamak ve savunmayı prova etmek', 49, 55),
        ]),
      ],
    },
    racha: {
      resumen:
        'Gazeteyi okumanın hatırlamaya bağlı olmaktan çıkması için dört hafta: sabit bir zaman dilimi, ' +
        'asistanlar arasında paylaşım ve göz atılabilecek bir ay kapanışı.',
      nodos: [
        n('Kaçırmamak', 0, 9, [
          n('Mesai molasında okumak', 0, 4),
          n("Hatırlatıcıyı 14:00'e kurmak", 5, 9),
        ]),
        n('İşi paylaştırmak', 10, 19, [
          n('Spor ve bilimi iki asistana devretmek', 10, 14),
          n('Kahvaltı yaparken özeti dinlemek', 15, 19),
        ]),
        n('Ayı kapatmak', 20, 27, [
          n('Değer verdiğim üç haberi saklamak', 20, 24),
          n('Seriyi sayıp not etmek', 25, 27),
        ]),
      ],
    },
    archivo: {
      resumen:
        'Arşivdeki bekleyenleri boşaltmak için on iki hafta, zaten başlanmış olandan en uzun süredir ' +
        'bekleyene doğru.',
      nodos: [
        n('Zaten başladıklarım', 0, 27, [
          n('Yarıda kalan diziyi bitirmek', 0, 13),
          n('Komodindeki kitabı bitirmek', 14, 27),
        ]),
        n('Bekleyen filmler', 28, 55, [
          n('Haftada iki seans izlemek', 28, 48),
          n('Her birini bitirince eleştiri yazmak', 49, 55),
        ]),
        n('Bir yıldır bekleyen video oyunu', 56, 83, [
          n('Son kayıttan devam etmek', 56, 76),
          n('İzlenen her şeyi puanlayıp arşivlemek', 77, 83),
        ]),
      ],
    },
    coche: {
      resumen:
        'Aciliyete göre sıralanmış sekiz hafta: önce yasanın istediği ve tarihi belli olan, sonra ' +
        'arızadan kalan, ve en sonda soğuğa hazırlık.',
      nodos: [
        n('Yasanın istediği', 0, 20, [
          n('Araç muayenesini yaptırmak', 0, 10),
          n("MTV'yi yatırmak", 11, 20),
        ]),
        n('Arızadan kalanlar', 21, 41, [
          n('Fren balatalarını ve hidroliğini kontrol etmek', 21, 30),
          n('Aküyü ve bujileri değiştirmek', 31, 41),
        ]),
        n('Soğuk gelmeden', 42, 55, [
          n('Lastikleri ve hava basıncını kontrol etmek', 42, 48),
          n('Antifrizi kontrol etmek', 49, 55),
        ]),
      ],
    },
    corea: {
      resumen:
        'Kuzeyden güneye on iki gün: saat farkına alışmak için Seul’de dört gün, ortada tarihi ' +
        'merkez, sonunda Jeju — dönüş uçuşu da Seul’den.',
      nodos: [
        n('Seul', 0, 4, [
          n('Gyeongbokgung ve Bukchon mahallesi', 0, 1),
          n('Gwangjang Pazarı ve Myeongdong', 2, 2),
          n('DMZ bölgesine günübirlik gezi', 3, 4),
        ]),
        n('Gyeongju ve Busan', 5, 8, [
          n('Kral mezarları ve Bulguksa Tapınağı', 5, 6),
          n('Gamcheon ve Jagalchi Pazarı', 7, 8),
        ]),
        n('Jeju Adası', 9, 11, [
          n('Seongsan Ilchulbong’da gün doğumu', 9, 10),
          n('Son gece için Seul’e dönüş', 11, 11),
        ]),
      ],
    },
    fondo: {
      resumen:
        'Üç aylık sabit gideri bir araya getirmek için yirmi dört hafta: önce ne kadar olduğunu bilmek, ' +
        'sonra maaş gününde ayırmak, ve zor kısım — ona dokunmamak.',
      nodos: [
        n('Ne kadar olduğunu bilmek', 0, 13, [
          n('Üç aylık sabit giderleri toplamak', 0, 6),
          n('Hedefi belirleyip not etmek', 7, 13),
        ]),
        n('Harcamadan önce ayırmak', 14, 90, [
          n('Maaş gününde otomatik transfer talimatı vermek', 14, 48),
          n('Özel derslerden kalanı oraya koymak', 49, 90),
        ]),
        n('Ona dokunmamak', 91, 167, [
          n('Kartsız, ayrı bir hesapta tutmak', 91, 118),
          n('Ayda bir kez bakiyeyi kontrol etmek', 119, 167),
        ]),
      ],
    },
    formulario: {
      resumen:
        'Vizeye kadar kalan altı hafta: önce formülleri bir araya getirip anlamak, sonra bakmadan ' +
        'çözülene kadar pratik yapmak, ve sonunda kendi örneğimi hazırlamak.',
      nodos: [
        n('Müfredattaki formülleri toplamak', 0, 13, [
          n('Kinematik ve dinamik formüllerini çıkarmak', 0, 6),
          n('Enerji formüllerini birimleriyle eklemek', 7, 13),
        ]),
        n('Kendiliğinden çözülene kadar pratik yapmak', 14, 34, [
          n('On eğik atış problemi çözmek', 14, 23),
          n('Enerji ve iş üzerine on problem çözmek', 24, 34),
        ]),
        n('Kendi hazırladığım bir şeyle kapatmak', 35, 41, [
          n('Hâlâ yanlış yaptıklarımı tekrar etmek', 35, 38),
          n('Dönemin formül kağıdını hazırlamak', 39, 41),
        ]),
      ],
    },
  },
  id: {
    maraton: {
      resumen:
        'Kamu butuh 24 minggu: delapan minggu dasar ringan untuk pulih dari maraton sebelumnya, dan ' +
        'dengan 10 jam seminggu, blok khusus maraton dan penurunan beban tidak muat dalam waktu lebih ' +
        'singkat tanpa mengulang cedera yang sama.',
      nodos: [
        n('Membangun ulang dasar tanpa rasa sakit', 0, 55, [
          n('Lari 40 menit dengan tempo santai', 0, 20),
          n('Menambahkan lari panjang 90 menit', 21, 41),
          n('Latihan kekuatan pinggul dua kali seminggu', 42, 55),
        ]),
        n('Menaikkan volume secara bertahap', 56, 104, [
          n('Mencapai 60 km seminggu tanpa keluhan', 56, 76),
          n('Lari panjang 2 jam 30 menit', 77, 90),
          n('Delapan repetisi lari tanjakan', 91, 104),
        ]),
        n('Blok khusus maraton', 105, 146, [
          n('Interval 1 km dengan tempo 10K', 105, 118),
          n('Lari panjang 20 km dengan tempo target', 119, 132),
          n('Simulasi 32 km lengkap dengan nutrisi', 133, 146),
        ]),
        n('Menurunkan beban dan tiba dalam kondisi utuh', 147, 167, [
          n('Memangkas volume jadi separuh', 147, 160),
          n('Menjajal sarapan dan tempo start', 161, 167),
        ]),
      ],
    },
    cocina: {
      meta: 'Renovasi dapur',
      categoria: 'Rumah',
      resumen:
        'Membuat dapur yang berfungsi dalam 13 minggu dengan 5 jam seminggu: perencanaan, pemasangan ' +
        'struktur dasar, sambungan air dan gas, kelistrikan, finishing, dan uji coba akhir.',
      nodos: [
        n('Perencanaan dan persiapan', 0, 13, [
          n('Merancang tata letak dan memilih material', 0, 6),
          n('Mengurus izin dan menyusun anggaran', 7, 13),
        ]),
        n('Pemasangan struktur dasar', 14, 34, [
          n('Membongkar dapur lama dan menyiapkan ruang', 14, 20),
          n('Memasang kabinet bawah dan laci', 21, 30),
          n('Memasang kabinet atas dan rak', 31, 34),
        ]),
        n('Sambungan teknis (air dan gas)', 35, 55, [
          n('Memasang pipa air dingin dan panas', 35, 44),
          n('Menyambung wastafel dan keran', 45, 49),
          n('Memasang sambungan gas untuk kompor', 50, 55),
        ]),
        n('Instalasi listrik', 56, 69, [
          n('Menarik kabel dan memasang panel listrik', 56, 61),
          n('Memasang stopkontak dan saklar', 62, 65),
          n('Menyambung cooker hood dan lampu', 66, 69),
        ]),
        n('Finishing', 70, 83, [
          n('Memasang meja kerja dan backsplash', 70, 76),
          n('Menutup celah dengan sealant dan mengecat dinding', 77, 80),
          n('Memasang pegangan dan pintu kabinet', 81, 83),
        ]),
        n('Uji coba akhir dan serah terima', 84, 90, [
          n('Memeriksa kebocoran air dan gas', 84, 86),
          n('Menguji sirkuit dan peralatan elektronik', 87, 88),
          n('Membersihkan dan menyelesaikan detail terakhir', 89, 90),
        ]),
      ],
    },
    posgrado: {
      resumen:
        'Dua puluh satu minggu untuk sampai ke tenggat tanpa terburu-buru: pilih program dulu, lalu ' +
        'ujian masuk, dan simpan surat motivasi untuk paling akhir — itu yang paling sering ditulis ulang.',
      nodos: [
        n('Memilih program dan syaratnya', 0, 27, [
          n('Membandingkan enam program beserta tenggatnya', 0, 13),
          n('Mengumpulkan syarat dan dokumen tiap program', 14, 27),
        ]),
        n('Ujian masuk', 28, 83, [
          n('Mengulang aljabar linear dan persamaan diferensial', 28, 48),
          n('Mengerjakan tiga paket soal latihan penuh', 49, 69),
          n('Mengikuti ujian masuk', 70, 83),
        ]),
        n('Surat rekomendasi dan transkrip', 84, 104, [
          n('Meminta tiga surat rekomendasi', 84, 93),
          n('Menerjemahkan dan melegalisasi transkrip', 94, 104),
        ]),
        n('Surat motivasi dan portofolio', 105, 132, [
          n('Menulis draf pertama surat motivasi', 105, 118),
          n('Merevisinya bersama dosen astrofisika', 119, 125),
          n('Menyiapkan portofolio proyek', 126, 132),
        ]),
        n('Mengirim aplikasi', 133, 146, [
          n('Mengisi formulir keenam sekolah', 133, 139),
          n('Membayar biaya dan mengirim sebelum tenggat', 140, 146),
        ]),
      ],
    },
    nutricion: {
      resumen:
        'Dua puluh tiga minggu yang terikat pada kalender latihan: makan untuk mendukung latihan selagi ' +
        'volume naik, menjajal nutrisi hari lomba di lari panjang, dan menyimpan carbo loading untuk ' +
        'paling akhir.',
      nodos: [
        n('Makan untuk latihan', 0, 55, [
          n('Membatasi di 2.400 kkal pada hari latihan', 0, 27),
          n('Sarapan sebelum lari panjang', 28, 41),
          n('Minum tiga liter air saat cuaca panas', 42, 55),
        ]),
        n('Menjajal nutrisi hari lomba', 56, 111, [
          n('Minum gel dan air tiap 45 menit saat lari panjang', 56, 76),
          n('Makan malam tinggi karbohidrat sehari sebelumnya', 77, 90),
          n('Mengulang sarapan hari lomba sebanyak tiga kali', 91, 111),
        ]),
        n('Carbo loading dan minggu lomba', 112, 163, [
          n('Menaikkan karbohidrat sampai 7 g per kilo berat badan', 112, 146),
          n('Menyiapkan daftar belanja lebih awal', 147, 156),
          n('Sarapan hari maraton tanpa hal baru', 157, 163),
        ]),
      ],
    },
    sueno: {
      resumen:
        'Enam minggu dalam tiga langkah: dulukan jam tidur, lalu kamar, dan baru terakhir mengukur — ' +
        'mengubah tiga hal sekaligus tidak akan menunjukkan mana yang berhasil.',
      nodos: [
        n('Mengakhiri hari di jam yang sama', 0, 13, [
          n('Mematikan layar pukul 23.10', 0, 6),
          n('Tidak minum kafein setelah pukul 16.00', 7, 13),
        ]),
        n('Menyiapkan kamar', 14, 27, [
          n('Meredupkan lampu satu jam sebelum tidur', 14, 20),
          n('Meninggalkan ponsel di luar kamar tidur', 21, 27),
        ]),
        n('Mengukur dan menyesuaikan', 28, 41, [
          n('Mencatat berapa lama sampai tertidur', 28, 34),
          n('Bangun di jam yang sama juga pada hari Minggu', 35, 41),
        ]),
      ],
    },
    memorias: {
      resumen:
        'Delapan minggu untuk menutup tahun yang ditulis: menyelesaikan yang tertunda, menjaga satu ' +
        'kenangan tiap minggu, dan mengakhiri dengan album yang tertata.',
      nodos: [
        n('Menyelesaikan yang tertinggal', 0, 20, [
          n('Menulis tiga hari perjalanan yang tertunda', 0, 10),
          n('Menambahkan foto ke catatan masa sulit', 11, 20),
        ]),
        n('Satu kenangan tiap minggu', 21, 41, [
          n('Menulis pada Minggu malam', 21, 34),
          n('Memilih foto bulan ini', 35, 41),
        ]),
        n('Album tahun ini', 42, 55, [
          n('Meninjau ulang dua belas bulan dan menyusunnya', 42, 48),
          n('Menunjukkannya ke keluarga', 49, 55),
        ]),
      ],
    },
    calma: {
      resumen:
        'Empat minggu tanpa target berat: menemukan waktu yang benar-benar ada, naik dari lima ke ' +
        'sepuluh menit, dan mengaitkannya dengan kebiasaan yang sudah kamu jalani.',
      nodos: [
        n('Menemukan waktunya', 0, 6, [
          n('Mencoba meditasi sepulang kerja', 0, 3),
          n('Meletakkan bantal duduk di tempat yang terlihat', 4, 6),
        ]),
        n('Sepuluh menit tanpa jeda', 7, 20, [
          n('Lima hari latihan pernapasan kotak', 7, 13),
          n('Naik dari lima ke sepuluh menit', 14, 20),
        ]),
        n('Membuatnya bertahan sendiri', 21, 27, [
          n('Menulis satu rasa syukur setiap selesai', 21, 27),
        ]),
      ],
    },
    nocturno: {
      resumen:
        'Enam belas minggu dengan empat jam seminggu: dua minggu membaca partitur, enam menyatukan ' +
        'tangan, empat untuk pedal dan ornamen, dan dua untuk memainkannya utuh tanpa berhenti.',
      nodos: [
        n('Membaca partitur', 0, 27, [
          n('Membaca not dua halaman pertama', 0, 13),
          n('Berlatih tangan terpisah dengan setengah tempo', 14, 27),
        ]),
        n('Menyatukan tangan', 28, 69, [
          n('Memainkan halaman pertama secara utuh', 28, 48),
          n('Memainkan halaman kedua secara utuh', 49, 69),
        ]),
        n('Ornamen dan pedal', 70, 97, [
          n('Merapikan not triol di birama 16', 70, 83),
          n('Menginjak pedal mengikuti harmoni, bukan birama', 84, 97),
        ]),
        n('Memainkannya secara utuh', 98, 111, [
          n('Merekam diri sendiri tiga kali berturut-turut', 98, 104),
          n('Memainkannya untuk keluarga', 105, 111),
        ]),
      ],
    },
    prototipo: {
      resumen:
        'Sepuluh minggu untuk berhenti berputar-putar di kepala: memilih satu ide, membuat versi yang ' +
        'bisa selesai dalam satu sore, dan memutuskan berdasarkan hasil nyata, bukan bayangan.',
      nodos: [
        n('Memilih', 0, 13, [
          n('Menilai lima finalis dari peta pikiran', 0, 6),
          n('Menyingkirkan tiga tanpa rasa bersalah', 7, 13),
        ]),
        n('Mencobanya dalam skala kecil', 14, 41, [
          n('Membuat versi yang selesai dalam satu sore', 14, 27),
          n('Menunjukkannya ke tiga orang', 28, 41),
        ]),
        n('Memutuskan berdasarkan data', 42, 69, [
          n('Mencatat apa yang tidak berjalan baik', 42, 55),
          n('Diagram keputusan: lanjut atau berhenti', 56, 69),
        ]),
      ],
    },
    b2: {
      resumen:
        'Dua puluh minggu: menutup yang tertinggal dari B1, memperluas kosakata, melancarkan lidah ' +
        'dengan berbicara, dan menyimpan simulasi ujian untuk paling akhir.',
      nodos: [
        n('Menuntaskan B1', 0, 34, [
          n('Mengulang kartu yang menumpuk', 0, 20),
          n('Menyelesaikan silabus tata bahasa', 21, 34),
        ]),
        n('Kosakata B2', 35, 83, [
          n('Empat puluh kartu baru tiap minggu', 35, 62),
          n('Membaca satu berita tiap hari dalam bahasa itu', 63, 83),
        ]),
        n('Berbicara tanpa berpikir dulu', 84, 118, [
          n('Tiga percakapan panjang tiap minggu', 84, 104),
          n('Merekam diri sendiri menceritakan hari itu', 105, 118),
        ]),
        n('Ujian', 119, 139, [
          n('Dua simulasi ujian penuh', 119, 132),
          n('Hanya mengulang bagian yang masih salah', 133, 139),
        ]),
      ],
    },
    semestral: {
      resumen:
        'Delapan minggu untuk sampai ke pengumpulan: kerangka teori, kerja laboratorium, dan satu ' +
        'minggu penuh yang disisihkan untuk menulis dan berlatih sidang.',
      nodos: [
        n('Kerangka teori', 0, 20, [
          n('Mengumpulkan sepuluh sumber', 0, 10),
          n('Menulis tinjauan pustaka', 11, 20),
        ]),
        n('Laboratorium', 21, 41, [
          n('Menyiapkan eksperimen', 21, 30),
          n('Mengambil pengukuran dalam tiga putaran', 31, 41),
        ]),
        n('Pengumpulan', 42, 55, [
          n('Menulis hasil dan kesimpulan', 42, 48),
          n('Membuat poster dan berlatih sidang', 49, 55),
        ]),
      ],
    },
    racha: {
      resumen:
        'Empat minggu supaya membaca edisi harian tidak lagi bergantung pada ingatan: jam tetap, ' +
        'pembagian ke asisten, dan rangkuman akhir bulan yang layak dilihat.',
      nodos: [
        n('Supaya tidak terlewat', 0, 9, [
          n('Membacanya saat istirahat kerja', 0, 4),
          n('Memasang pengingat pukul 14.00', 5, 9),
        ]),
        n('Membagi pekerjaan', 10, 19, [
          n('Menyerahkan olahraga dan sains ke dua asisten', 10, 14),
          n('Mendengarkan ringkasan sambil sarapan', 15, 19),
        ]),
        n('Menutup bulan', 20, 27, [
          n('Menyimpan tiga berita yang paling berkesan', 20, 24),
          n('Menghitung rentetan hari dan mencatatnya', 25, 27),
        ]),
      ],
    },
    archivo: {
      resumen:
        'Dua belas minggu untuk mengosongkan tumpukan di arsip, dari yang sudah dimulai sampai yang ' +
        'paling lama menunggu.',
      nodos: [
        n('Yang sudah kumulai', 0, 27, [
          n('Menyelesaikan serial yang tertunda di tengah', 0, 13),
          n('Menyelesaikan buku di meja samping tempat tidur', 14, 27),
        ]),
        n('Film yang masih tertunda', 28, 55, [
          n('Menonton dua sesi tiap minggu', 28, 48),
          n('Menulis ulasan setiap selesai satu film', 49, 55),
        ]),
        n('Video game yang sudah setahun menunggu', 56, 83, [
          n('Melanjutkan dari save terakhir', 56, 76),
          n('Memberi nilai dan mengarsipkan semua yang sudah ditonton', 77, 83),
        ]),
      ],
    },
    coche: {
      resumen:
        'Delapan minggu diurutkan berdasarkan urgensi: dulukan yang diwajibkan hukum dan punya batas ' +
        'waktu, lalu yang tersisa dari kerusakan, dan persiapan cuaca dingin di akhir.',
      nodos: [
        n('Yang diwajibkan hukum', 0, 20, [
          n('Uji emisi enam bulanan', 0, 10),
          n('Memperpanjang pajak kendaraan', 11, 20),
        ]),
        n('Yang tersisa dari kerusakan', 21, 41, [
          n('Memeriksa rem dan minyak rem', 21, 30),
          n('Mengganti aki dan busi', 31, 41),
        ]),
        n('Sebelum musim dingin', 42, 55, [
          n('Memeriksa ban dan tekanan angin', 42, 48),
          n('Memeriksa cairan antibeku', 49, 55),
        ]),
      ],
    },
    corea: {
      resumen:
        'Dua belas hari dari utara ke selatan: empat hari pertama untuk menyesuaikan diri di Seoul, ' +
        'pusat sejarah di tengah, dan Jeju di akhir — penerbangan pulang juga dari Seoul.',
      nodos: [
        n('Seoul', 0, 4, [
          n('Gyeongbokgung dan kawasan Bukchon', 0, 1),
          n('Pasar Gwangjang dan Myeongdong', 2, 2),
          n('Perjalanan sehari ke zona DMZ', 3, 4),
        ]),
        n('Gyeongju dan Busan', 5, 8, [
          n('Makam kerajaan dan Kuil Bulguksa', 5, 6),
          n('Gamcheon dan Pasar Jagalchi', 7, 8),
        ]),
        n('Pulau Jeju', 9, 11, [
          n('Matahari terbit di Seongsan Ilchulbong', 9, 10),
          n('Kembali ke Seoul untuk malam terakhir', 11, 11),
        ]),
      ],
    },
    fondo: {
      resumen:
        'Dua puluh empat minggu untuk mengumpulkan tiga bulan pengeluaran tetap: dulu tahu berapa ' +
        'jumlahnya, lalu sisihkan di hari gajian, dan bagian sulitnya — jangan disentuh.',
      nodos: [
        n('Mengetahui berapa jumlahnya', 0, 13, [
          n('Menjumlahkan pengeluaran tetap tiga bulan', 0, 6),
          n('Menetapkan target dan mencatatnya', 7, 13),
        ]),
        n('Menyisihkan sebelum dibelanjakan', 14, 90, [
          n('Mengatur transfer otomatis di hari gajian', 14, 48),
          n('Memasukkan sisa uang dari les privat ke situ', 49, 90),
        ]),
        n('Tidak menyentuhnya', 91, 167, [
          n('Rekening terpisah tanpa kartu debit', 91, 118),
          n('Memeriksa saldo sebulan sekali', 119, 167),
        ]),
      ],
    },
    formulario: {
      resumen:
        'Enam minggu, sisa waktu sampai ujian tengah semester: dulu kumpulkan dan pahami rumus-rumusnya, ' +
        'lalu berlatih sampai bisa tanpa melihat catatan, dan akhiri dengan soal buatan sendiri.',
      nodos: [
        n('Mengumpulkan rumus dari silabus', 0, 13, [
          n('Menyalin rumus kinematika dan dinamika', 0, 6),
          n('Menambahkan rumus energi beserta satuannya', 7, 13),
        ]),
        n('Berlatih sampai lancar dengan sendirinya', 14, 34, [
          n('Sepuluh soal gerak parabola', 14, 23),
          n('Sepuluh soal energi dan usaha', 24, 34),
        ]),
        n('Menutupnya dengan hasil sendiri', 35, 41, [
          n('Mengulang bagian yang masih sering salah', 35, 38),
          n('Menyusun lembar rumus untuk semester ini', 39, 41),
        ]),
      ],
    },
  },
  pl: {
    maraton: {
      resumen:
        'Potrzeba 24 tygodni: osiem tygodni łagodnej bazy, by dojść do siebie po poprzednim maratonie, ' +
        'a przy 10 godzinach tygodniowo blok specyficzny i wyciszenie nie mieszczą się w krótszym czasie ' +
        'bez powtórki tej samej kontuzji.',
      nodos: [
        n('Odbudować bazę bez bólu', 0, 55, [
          n('Biegać 40 minut w tempie rozmowy', 0, 20),
          n('Dodać długie wybieganie na 90 minut', 21, 41),
          n('Siła bioder dwa razy w tygodniu', 42, 55),
        ]),
        n('Stopniowy wzrost objętości', 56, 104, [
          n('Dojść do 60 km tygodniowo bez dolegliwości', 56, 76),
          n('Długie wybieganie na 2 godz. 30 min', 77, 90),
          n('Osiem powtórzeń pod górkę', 91, 104),
        ]),
        n('Blok specyficzny pod maraton', 105, 146, [
          n('Serie po 1 km w tempie 10 km', 105, 118),
          n('Długie wybieganie 20 km w tempie docelowym', 119, 132),
          n('Próba generalna 32 km z odżywianiem', 133, 146),
        ]),
        n('Wyciszenie i dotarcie w całości', 147, 167, [
          n('Zmniejszyć objętość o połowę', 147, 160),
          n('Przećwiczyć śniadanie i tempo startowe', 161, 167),
        ]),
      ],
    },
    cocina: {
      meta: 'Remont kuchni',
      categoria: 'Dom',
      resumen:
        'Wyremontować funkcjonalną kuchnię w 13 tygodni po 5 godzin tygodniowo: planowanie, montaż ' +
        'konstrukcji bazowej, podłączenia wody i gazu, instalacja elektryczna, wykończenia i testy końcowe.',
      nodos: [
        n('Planowanie i przygotowanie', 0, 13, [
          n('Zaprojektować układ i wybrać materiały', 0, 6),
          n('Uzyskać pozwolenia i ustalić budżet', 7, 13),
        ]),
        n('Montaż konstrukcji bazowej', 14, 34, [
          n('Zdemontować starą kuchnię i przygotować przestrzeń', 14, 20),
          n('Zamontować szafki dolne i szuflady', 21, 30),
          n('Zamontować szafki górne i półki', 31, 34),
        ]),
        n('Podłączenia techniczne (woda i gaz)', 35, 55, [
          n('Zainstalować rury zimnej i ciepłej wody', 35, 44),
          n('Podłączyć zlewozmywak i baterię', 45, 49),
          n('Podłączyć gaz do kuchenki', 50, 55),
        ]),
        n('Instalacja elektryczna', 56, 69, [
          n('Poprowadzić przewody i zamontować rozdzielnicę', 56, 61),
          n('Zamontować gniazdka i włączniki', 62, 65),
          n('Podłączyć okap i oświetlenie', 66, 69),
        ]),
        n('Wykończenia', 70, 83, [
          n('Zamontować blat i panel przyścienny', 70, 76),
          n('Uszczelnić spoiny i pomalować ściany', 77, 80),
          n('Zamontować uchwyty i drzwiczki', 81, 83),
        ]),
        n('Testy końcowe i odbiór', 84, 90, [
          n('Sprawdzić szczelność wody i gazu', 84, 86),
          n('Sprawdzić obwody i sprzęt AGD', 87, 88),
          n('Sprzątanie końcowe i poprawki', 89, 90),
        ]),
      ],
    },
    posgrado: {
      resumen:
        'Dwadzieścia jeden tygodni, żeby dotrzeć do terminu bez pośpiechu: najpierw wybrać programy, ' +
        'potem egzamin wstępny, a dopiero na końcu list motywacyjny — to on jest przepisywany najczęściej.',
      nodos: [
        n('Wybrać programy i wymagania', 0, 27, [
          n('Porównać sześć programów i ich terminy', 0, 13),
          n('Zebrać wymagania i dokumenty każdego z nich', 14, 27),
        ]),
        n('Egzamin wstępny', 28, 83, [
          n('Powtórzyć algebrę liniową i równania różniczkowe', 28, 48),
          n('Rozwiązać trzy pełne egzaminy próbne', 49, 69),
          n('Podejść do egzaminu wstępnego', 70, 83),
        ]),
        n('Listy polecające i dokumentacja', 84, 104, [
          n('Poprosić o trzy listy polecające', 84, 93),
          n('Przetłumaczyć i uwierzytelnić dokumentację', 94, 104),
        ]),
        n('List motywacyjny i portfolio', 105, 132, [
          n('Napisać pierwszy szkic listu', 105, 118),
          n('Przejrzeć go z profesorką astrofizyki', 119, 125),
          n('Przygotować portfolio projektów', 126, 132),
        ]),
        n('Wysłać zgłoszenia', 133, 146, [
          n('Wypełnić formularze sześciu uczelni', 133, 139),
          n('Opłacić wpisowe i wysłać przed terminem', 140, 146),
        ]),
      ],
    },
    nutricion: {
      resumen:
        'Dwadzieścia trzy tygodnie powiązane z kalendarzem treningowym: jeść pod trening w miarę wzrostu ' +
        'objętości, przećwiczyć żywienie wyścigowe na długich wybieganiach i zostawić ładowanie ' +
        'węglowodanami na koniec.',
      nodos: [
        n('Jeść pod trening', 0, 55, [
          n('Trzymać się 2400 kcal w dni treningowe', 0, 27),
          n('Zjeść śniadanie przed długim wybieganiem', 28, 41),
          n('Trzy litry wody w upalne dni', 42, 55),
        ]),
        n('Przetestować żywienie wyścigowe', 56, 111, [
          n('Żel i woda co 45 minut na długich wybieganiach', 56, 76),
          n('Kolacja bogata w węglowodany dzień wcześniej', 77, 90),
          n('Powtórzyć trzykrotnie śniadanie z dnia startu', 91, 111),
        ]),
        n('Ładowanie węglowodanami i tydzień wyścigu', 112, 163, [
          n('Dojść do 7 g węglowodanów na kilogram', 112, 146),
          n('Przygotować listę zakupów z wyprzedzeniem', 147, 156),
          n('Śniadanie w dniu maratonu, bez eksperymentów', 157, 163),
        ]),
      ],
    },
    sueno: {
      resumen:
        'Sześć tygodni w trzech krokach: najpierw godzina zamknięcia dnia, potem pokój, i dopiero na ' +
        'końcu pomiary — zmiana trzech rzeczy naraz nie pokazałaby, co właściwie zadziałało.',
      nodos: [
        n('Kończyć dzień o tej samej porze', 0, 13, [
          n('Wyłączać ekrany o 23:10', 0, 6),
          n('Żadnej kofeiny po 16:00', 7, 13),
        ]),
        n('Przygotować pokój', 14, 27, [
          n('Przyciemnić światło godzinę wcześniej', 14, 20),
          n('Zostawiać telefon poza sypialnią', 21, 27),
        ]),
        n('Mierzyć i dostosowywać', 28, 41, [
          n('Zapisywać, ile czasu zajmuje zaśnięcie', 28, 34),
          n('Wstawać o tej samej porze także w niedzielę', 35, 41),
        ]),
      ],
    },
    memorias: {
      resumen:
        'Osiem tygodni, żeby zamknąć spisany rok: nadrobić to, co zostało w połowie, utrzymać jedno ' +
        'wspomnienie tygodniowo i skończyć uporządkowanym albumem.',
      nodos: [
        n('Nadrobić zaległości', 0, 20, [
          n('Dopisać trzy dni podróży, które zostały w połowie', 0, 10),
          n('Dodać zdjęcie do wpisów z trudnego okresu', 11, 20),
        ]),
        n('Jedno wspomnienie tygodniowo', 21, 41, [
          n('Pisać w niedzielny wieczór', 21, 34),
          n('Wybrać zdjęcie miesiąca', 35, 41),
        ]),
        n('Album roku', 42, 55, [
          n('Przejrzeć wszystkie dwanaście i je uporządkować', 42, 48),
          n('Pokazać go rodzinie', 49, 55),
        ]),
      ],
    },
    calma: {
      resumen:
        'Cztery tygodnie bez presji: znaleźć chwilę, która naprawdę istnieje, wydłużyć praktykę z pięciu ' +
        'do dziesięciu minut i powiązać ją z czymś, co już i tak robisz.',
      nodos: [
        n('Znaleźć odpowiednią chwilę', 0, 6, [
          n('Spróbować medytacji po powrocie ze zmiany', 0, 3),
          n('Zostawić poduszkę do medytacji na widoku', 4, 6),
        ]),
        n('Dziesięć minut bez przerwy', 7, 20, [
          n('Pięć dni oddychania kwadratowego', 7, 13),
          n('Wydłużyć z pięciu do dziesięciu minut', 14, 20),
        ]),
        n('Sprawić, żeby praktyka trwała sama', 21, 27, [
          n('Zapisywać jedną wdzięczność po zakończeniu', 21, 27),
        ]),
      ],
    },
    nocturno: {
      resumen:
        'Szesnaście tygodni po cztery godziny tygodniowo: dwa na czytanie partytury, sześć na łączenie ' +
        'rąk, cztery na pedał i ozdobniki, i dwa, żeby zagrać całość bez zatrzymywania się.',
      nodos: [
        n('Czytać partyturę', 0, 27, [
          n('Solfeżować dwie pierwsze strony', 0, 13),
          n('Ćwiczyć ręce osobno w połowie tempa', 14, 27),
        ]),
        n('Łączenie rąk', 28, 69, [
          n('Cała pierwsza strona', 28, 48),
          n('Cała druga strona', 49, 69),
        ]),
        n('Ozdobniki i pedał', 70, 97, [
          n('Triole w 16. takcie', 70, 83),
          n('Pedał według harmonii, nie taktu', 84, 97),
        ]),
        n('Zagrać całość', 98, 111, [
          n('Nagrać się trzy razy z rzędu', 98, 104),
          n('Zagrać dla rodziny', 105, 111),
        ]),
      ],
    },
    prototipo: {
      resumen:
        'Dziesięć tygodni, żeby przestać nad tym rozmyślać: wybrać jeden pomysł, zrobić wersję na jedno ' +
        'popołudnie i zdecydować na podstawie tego, co wyjdzie, a nie tego, co się wyobraża.',
      nodos: [
        n('Wybrać', 0, 13, [
          n('Ocenić pięciu finalistów z mapy pomysłów', 0, 6),
          n('Odrzucić trzy bez wyrzutów sumienia', 7, 13),
        ]),
        n('Sprawdzić w małej skali', 14, 41, [
          n('Zrobić wersję na jedno popołudnie', 14, 27),
          n('Pokazać ją trzem osobom', 28, 41),
        ]),
        n('Zdecydować na podstawie faktów', 42, 69, [
          n('Zapisać, co poszło nie tak', 42, 55),
          n('Diagram decyzyjny: kontynuować czy odpuścić', 56, 69),
        ]),
      ],
    },
    b2: {
      resumen:
        'Dwadzieścia tygodni: dokończyć to, co zostało z B1, poszerzyć słownictwo, rozgadać się w ' +
        'praktyce i zostawić egzaminy próbne na koniec.',
      nodos: [
        n('Dokończyć B1', 0, 34, [
          n('Powtórzyć zaległe fiszki', 0, 20),
          n('Skończyć program gramatyki', 21, 34),
        ]),
        n('Słownictwo poziomu B2', 35, 83, [
          n('Czterdzieści nowych fiszek tygodniowo', 35, 62),
          n('Czytać codziennie jedną wiadomość w tym języku', 63, 83),
        ]),
        n('Mówić bez zastanawiania się', 84, 118, [
          n('Trzy długie rozmowy tygodniowo', 84, 104),
          n('Nagrywać siebie, opowiadając o dniu', 105, 118),
        ]),
        n('Egzamin', 119, 139, [
          n('Dwa pełne egzaminy próbne', 119, 132),
          n('Powtarzać tylko to, co nie wychodzi', 133, 139),
        ]),
      ],
    },
    semestral: {
      resumen:
        'Osiem tygodni do oddania pracy: podstawy teoretyczne, laboratorium i cały tydzień zarezerwowany ' +
        'na pisanie i próbę obrony.',
      nodos: [
        n('Podstawy teoretyczne', 0, 20, [
          n('Zebrać dziesięć źródeł', 0, 10),
          n('Napisać przegląd literatury', 11, 20),
        ]),
        n('Laboratorium', 21, 41, [
          n('Zbudować układ doświadczalny', 21, 30),
          n('Trzy serie pomiarów', 31, 41),
        ]),
        n('Oddanie pracy', 42, 55, [
          n('Napisać wyniki i wnioski', 42, 48),
          n('Plakat i próba obrony', 49, 55),
        ]),
      ],
    },
    racha: {
      resumen:
        'Cztery tygodnie, żeby czytanie wydania przestało zależeć od pamięci: stały termin, podział ' +
        'pracy między asystentów i podsumowanie miesiąca, na które można spojrzeć.',
      nodos: [
        n('Żeby nie przegapić', 0, 9, [
          n('Czytać w przerwie na zmianie', 0, 4),
          n('Ustawić przypomnienie na 14:00', 5, 9),
        ]),
        n('Podzielić pracę', 10, 19, [
          n('Oddać sport i naukę dwóm asystentom', 10, 14),
          n('Słuchać podsumowania przy śniadaniu', 15, 19),
        ]),
        n('Zamknąć miesiąc', 20, 27, [
          n('Zachować trzy wiadomości, które były tego warte', 20, 24),
          n('Policzyć serię i ją zapisać', 25, 27),
        ]),
      ],
    },
    archivo: {
      resumen:
        'Dwanaście tygodni, żeby opróżnić zaległości w archiwum: od tego, co już zaczęte, po to, co ' +
        'czeka najdłużej.',
      nodos: [
        n('To, co już zaczęte', 0, 27, [
          n('Dokończyć serial, który został w połowie', 0, 13),
          n('Skończyć książkę z szafki nocnej', 14, 27),
        ]),
        n('Zaległe filmy', 28, 55, [
          n('Dwa seanse tygodniowo', 28, 48),
          n('Pisać recenzję po każdym', 49, 55),
        ]),
        n('Gra wideo, która czeka od roku', 56, 83, [
          n('Wrócić do niej od ostatniego zapisu', 56, 76),
          n('Ocenić i zarchiwizować wszystko obejrzane', 77, 83),
        ]),
      ],
    },
    coche: {
      resumen:
        'Osiem tygodni uporządkowanych według pilności: najpierw to, czego wymaga prawo i ma termin, ' +
        'potem to, co zostało po awarii, a na końcu przygotowania do zimna.',
      nodos: [
        n('To, czego wymaga prawo', 0, 20, [
          n('Przegląd techniczny', 0, 10),
          n('Odnowić podatek drogowy', 11, 20),
        ]),
        n('To, co zostało po awarii', 21, 41, [
          n('Hamulce i płyn hamulcowy', 21, 30),
          n('Akumulator i świece zapłonowe', 31, 41),
        ]),
        n('Przed zimnem', 42, 55, [
          n('Opony i ciśnienie', 42, 48),
          n('Sprawdzić płyn chłodniczy', 49, 55),
        ]),
      ],
    },
    corea: {
      resumen:
        'Dwanaście dni z północy na południe: cztery w Seulu na oswojenie różnicy czasu, historyczne ' +
        'centrum w środku i Jeju na koniec, z lotem powrotnym również z Seulu.',
      nodos: [
        n('Seul', 0, 4, [
          n('Gyeongbokgung i dzielnica Bukchon', 0, 1),
          n('Targ Gwangjang i Myeongdong', 2, 2),
          n('Wycieczka do strefy DMZ', 3, 4),
        ]),
        n('Gyeongju i Busan', 5, 8, [
          n('Królewskie grobowce i świątynia Bulguksa', 5, 6),
          n('Gamcheon i targ Jagalchi', 7, 8),
        ]),
        n('Wyspa Jeju', 9, 11, [
          n('Wschód słońca na Seongsan Ilchulbong', 9, 10),
          n('Powrót do Seulu na ostatnią noc', 11, 11),
        ]),
      ],
    },
    fondo: {
      resumen:
        'Dwadzieścia cztery tygodnie, żeby zebrać równowartość trzech miesięcy stałych wydatków: ' +
        'najpierw ustalić, ile to jest, potem odkładać w dniu wypłaty, a trudna część — nie ruszać tego.',
      nodos: [
        n('Ustalić, ile to jest', 0, 13, [
          n('Zsumować stałe wydatki z trzech miesięcy', 0, 6),
          n('Ustalić cel i go zapisać', 7, 13),
        ]),
        n('Odkładać, zanim się wyda', 14, 90, [
          n('Ustawić automatyczny przelew w dniu wypłaty', 14, 48),
          n('Dokładać to, co zostaje z korepetycji', 49, 90),
        ]),
        n('Nie ruszać tego', 91, 167, [
          n('Osobne konto, bez karty', 91, 118),
          n('Sprawdzać saldo raz w miesiącu', 119, 167),
        ]),
      ],
    },
    formulario: {
      resumen:
        'Sześć tygodni — tyle zostało do kolokwium: najpierw zebrać wzory i je zrozumieć, potem ' +
        'rozwiązywać zadania, aż zaczną wychodzić bez podglądania, i na koniec własny przykład.',
      nodos: [
        n('Zebrać wzory z programu', 0, 13, [
          n('Przepisać wzory z kinematyki i dynamiki', 0, 6),
          n('Dodać wzory na energię wraz z jednostkami', 7, 13),
        ]),
        n('Rozwiązywać, aż zaczną wychodzić same', 14, 34, [
          n('Dziesięć zadań z rzutu ukośnego', 14, 23),
          n('Dziesięć zadań z energii i pracy', 24, 34),
        ]),
        n('Zamknąć to czymś własnym', 35, 41, [
          n('Powtórzyć to, co wciąż nie wychodzi', 35, 38),
          n('Przygotować ściągawkę ze wzorami z semestru', 39, 41),
        ]),
      ],
    },
  },
  ar: {
    maraton: {
      resumen:
        'يحتاج الأمر إلى 24 أسبوعًا: ثمانية أسابيع من القاعدة الخفيفة للتعافي من الماراثون السابق، ' +
        'وبمعدّل 10 ساعات أسبوعيًا لا تتّسع المرحلة النوعية والتنقيص لوقت أقصر دون تكرار الإصابة نفسها.',
      nodos: [
        n('إعادة بناء القاعدة دون ألم', 0, 55, [
          n('الركض 40 دقيقة بوتيرة الحديث', 0, 20),
          n('إضافة الجري الطويل لمدة 90 دقيقة', 21, 41),
          n('تقوية الورك مرتين أسبوعيًا', 42, 55),
        ]),
        n('زيادة الحجم تدريجيًا', 56, 104, [
          n('الوصول إلى 60 كم أسبوعيًا دون إزعاج', 56, 76),
          n('جري طويل لمدة ساعتين ونصف', 77, 90),
          n('ثماني تكرارات على منحدر', 91, 104),
        ]),
        n('المرحلة النوعية لسباق الماراثون', 105, 146, [
          n('سلسلات من 1 كم بوتيرة سباق 10 كم', 105, 118),
          n('جري طويل 20 كم بالوتيرة المستهدفة', 119, 132),
          n('محاكاة 32 كم مع التزوّد بالغذاء', 133, 146),
        ]),
        n('التنقيص والوصول بحالة جيدة', 147, 167, [
          n('تخفيض الحجم إلى النصف', 147, 160),
          n('تجربة الفطور ووتيرة الانطلاق', 161, 167),
        ]),
      ],
    },
    cocina: {
      meta: 'تجديد المطبخ',
      categoria: 'البيت',
      resumen:
        'تجديد مطبخ عملي خلال 13 أسبوعًا بمعدّل 5 ساعات أسبوعيًا: التخطيط، تركيب الهيكل الأساسي، ' +
        'توصيلات المياه والغاز، الكهرباء، التشطيبات، والاختبارات النهائية.',
      nodos: [
        n('التخطيط والتحضير', 0, 13, [
          n('تصميم المخطط واختيار المواد', 0, 6),
          n('الحصول على التصاريح ووضع الميزانية', 7, 13),
        ]),
        n('تركيب الهيكل الأساسي', 14, 34, [
          n('تفكيك المطبخ القديم وتجهيز المساحة', 14, 20),
          n('تركيب الخزائن السفلية والأدراج', 21, 30),
          n('تركيب الخزائن العلوية والأرفف', 31, 34),
        ]),
        n('التوصيلات الفنية (المياه والغاز)', 35, 55, [
          n('تمديد أنابيب المياه الباردة والساخنة', 35, 44),
          n('توصيل الحوض والصنبور', 45, 49),
          n('توصيل الغاز للموقد', 50, 55),
        ]),
        n('التمديدات الكهربائية', 56, 69, [
          n('مدّ الأسلاك وتركيب لوحة التوزيع', 56, 61),
          n('تركيب المقابس والمفاتيح', 62, 65),
          n('توصيل الشفاط والإضاءة', 66, 69),
        ]),
        n('التشطيبات', 70, 83, [
          n('تركيب سطح العمل والحاجب الخلفي', 70, 76),
          n('سدّ الفواصل ودهان الجدران', 77, 80),
          n('تركيب المقابض والأبواب', 81, 83),
        ]),
        n('الاختبارات النهائية والتسليم', 84, 90, [
          n('فحص تسرّبات المياه والغاز', 84, 86),
          n('اختبار الدوائر والأجهزة المنزلية', 87, 88),
          n('التنظيف النهائي والتعديلات الأخيرة', 89, 90),
        ]),
      ],
    },
    posgrado: {
      resumen:
        'واحد وعشرون أسبوعًا للوصول إلى الموعد النهائي دون تسرّع: اختيار البرامج أولًا، ثم اختبار ' +
        'القبول، وفي النهاية فقط خطاب النوايا — وهو ما يُعاد كتابته أكثر من غيره.',
      nodos: [
        n('اختيار البرامج ومعرفة شروطها', 0, 27, [
          n('مقارنة ستة برامج ومواعيدها النهائية', 0, 13),
          n('جمع شروط ووثائق كل برنامج', 14, 27),
        ]),
        n('اختبار القبول', 28, 83, [
          n('مراجعة الجبر الخطي والمعادلات التفاضلية', 28, 48),
          n('حل ثلاثة اختبارات تدريبية كاملة', 49, 69),
          n('خوض اختبار القبول', 70, 83),
        ]),
        n('خطابات التوصية والملف الأكاديمي', 84, 104, [
          n('طلب ثلاثة خطابات توصية', 84, 93),
          n('ترجمة الملف الأكاديمي وتصديقه', 94, 104),
        ]),
        n('خطاب النوايا وملف الأعمال', 105, 132, [
          n('كتابة المسودة الأولى للخطاب', 105, 118),
          n('مراجعتها مع أستاذة الفيزياء الفلكية', 119, 125),
          n('إعداد ملف المشاريع', 126, 132),
        ]),
        n('إرسال الطلبات', 133, 146, [
          n('تعبئة استمارات الجامعات الست', 133, 139),
          n('دفع الرسوم والإرسال قبل الموعد النهائي', 140, 146),
        ]),
      ],
    },
    nutricion: {
      resumen:
        'ثلاثة وعشرون أسبوعًا مرتبطة بجدول التدريب: الأكل لخدمة التدريب مع ازدياد الحجم، تجربة ' +
        'تغذية السباق أثناء الجري الطويل، وترك التحميل بالكربوهيدرات للنهاية.',
      nodos: [
        n('الأكل لخدمة التدريب', 0, 55, [
          n('الالتزام بـ2400 سعرة حرارية في أيام التدريب', 0, 27),
          n('تناول الفطور قبل الجري الطويل', 28, 41),
          n('شرب ثلاثة لترات من الماء في الأيام الحارة', 42, 55),
        ]),
        n('تجربة تغذية يوم السباق', 56, 111, [
          n('تناول الجل والماء كل 45 دقيقة أثناء الجري الطويل', 56, 76),
          n('تناول عشاء غني بالكربوهيدرات ليلة السباق السابقة', 77, 90),
          n('تكرار فطور يوم السباق ثلاث مرات', 91, 111),
        ]),
        n('التحميل بالكربوهيدرات وأسبوع السباق', 112, 163, [
          n('الوصول إلى 7 غرامات من الكربوهيدرات لكل كيلوغرام', 112, 146),
          n('تجهيز قائمة المشتريات مسبقًا', 147, 156),
          n('فطور يوم الماراثون، دون أي جديد', 157, 163),
        ]),
      ],
    },
    sueno: {
      resumen:
        'ستة أسابيع في ثلاث خطوات: موعد إنهاء اليوم أولًا، ثم الغرفة، والقياس في النهاية فقط — ' +
        'تغيير ثلاثة أمور دفعة واحدة لن يكشف أيها كان الفعّال.',
      nodos: [
        n('إنهاء اليوم في الموعد نفسه', 0, 13, [
          n('إطفاء الشاشات الساعة 23:10', 0, 6),
          n('الامتناع عن الكافيين بعد الساعة 16:00', 7, 13),
        ]),
        n('تجهيز الغرفة', 14, 27, [
          n('خفض الإضاءة قبل النوم بساعة', 14, 20),
          n('إبقاء الهاتف خارج غرفة النوم', 21, 27),
        ]),
        n('القياس والتعديل', 28, 41, [
          n('تدوين الوقت المستغرق للنوم', 28, 34),
          n('الاستيقاظ في الموعد نفسه حتى يوم الأحد', 35, 41),
        ]),
      ],
    },
    memorias: {
      resumen:
        'ثمانية أسابيع لإغلاق سنة مدوَّنة: استكمال ما بقي ناقصًا، الحفاظ على تدوين ذكرى واحدة ' +
        'أسبوعيًا، والانتهاء بألبوم مرتّب.',
      nodos: [
        n('استكمال الناقص', 0, 20, [
          n('كتابة أيام الرحلة الثلاثة التي بقيت ناقصة', 0, 10),
          n('إضافة صورة لتدوينات فترة الانتكاسة', 11, 20),
        ]),
        n('ذكرى واحدة أسبوعيًا', 21, 41, [
          n('الكتابة مساء الأحد', 21, 34),
          n('اختيار صورة الشهر', 35, 41),
        ]),
        n('ألبوم السنة', 42, 55, [
          n('مراجعة الأشهر الاثني عشر وترتيبها', 42, 48),
          n('عرضه على العائلة', 49, 55),
        ]),
      ],
    },
    calma: {
      resumen:
        'أربعة أسابيع دون إلزام: العثور على الوقت المتاح فعلًا، والانتقال من خمس دقائق إلى عشر، ' +
        'وربطها بشيء تفعله أصلًا.',
      nodos: [
        n('العثور على اللحظة المناسبة', 0, 6, [
          n('تجربة التأمل عند العودة من الدوام', 0, 3),
          n('إبقاء وسادة التأمل في مرأى العين', 4, 6),
        ]),
        n('عشر دقائق متواصلة', 7, 20, [
          n('خمسة أيام من تمرين التنفس المربّع', 7, 13),
          n('الانتقال من خمس دقائق إلى عشر', 14, 20),
        ]),
        n('جعلها تستمر من تلقاء نفسها', 21, 27, [
          n('تدوين شكر واحد عند الانتهاء', 21, 27),
        ]),
      ],
    },
    nocturno: {
      resumen:
        'ستة عشر أسبوعًا بمعدّل أربع ساعات أسبوعيًا: أسبوعان لقراءة النوتة، ستة لدمج اليدين، أربعة ' +
        'للدواسة والزخارف، وأسبوعان لعزفها كاملة دون توقف.',
      nodos: [
        n('قراءة النوتة', 0, 27, [
          n('قراءة الصفحتين الأوليين غناءً', 0, 13),
          n('التمرين بكل يد على حدة بنصف السرعة', 14, 27),
        ]),
        n('دمج اليدين', 28, 69, [
          n('الصفحة الأولى كاملة', 28, 48),
          n('الصفحة الثانية كاملة', 49, 69),
        ]),
        n('الزخارف والدواسة', 70, 97, [
          n('الثلاثيات في القياس 16', 70, 83),
          n('استخدام الدواسة حسب التوافق لا حسب الإيقاع', 84, 97),
        ]),
        n('عزفها كاملة', 98, 111, [
          n('تسجيل نفسي ثلاث مرات متتالية', 98, 104),
          n('العزف للعائلة', 105, 111),
        ]),
      ],
    },
    prototipo: {
      resumen:
        'عشرة أسابيع للتوقف عن التفكير المتكرر: اختيار فكرة واحدة، صنع نسخة تُنجَز في أمسية واحدة، ' +
        'والحكم بناءً على ما يحدث فعلًا لا على ما يُتخيَّل.',
      nodos: [
        n('الاختيار', 0, 13, [
          n('تقييم الأفكار الخمس النهائية من الخريطة الذهنية', 0, 6),
          n('استبعاد ثلاث أفكار دون تردد', 7, 13),
        ]),
        n('تجربتها على نطاق صغير', 14, 41, [
          n('صنع نسخة أمسية واحدة', 14, 27),
          n('عرضها على ثلاثة أشخاص', 28, 41),
        ]),
        n('الحسم بناءً على الوقائع', 42, 69, [
          n('تدوين ما لم يسر بشكل جيد', 42, 55),
          n('مخطط قرار: المتابعة أم التخلي عنها', 56, 69),
        ]),
      ],
    },
    b2: {
      resumen:
        'عشرون أسبوعًا: إنهاء ما تبقّى من مستوى B1، توسيع المفردات، اكتساب الطلاقة بالتحدث، ' +
        'وترك الاختبارات التجريبية للنهاية.',
      nodos: [
        n('إنهاء مستوى B1', 0, 34, [
          n('مراجعة البطاقات المتراكمة', 0, 20),
          n('إنهاء منهج القواعد', 21, 34),
        ]),
        n('مفردات مستوى B2', 35, 83, [
          n('أربعون بطاقة جديدة أسبوعيًا', 35, 62),
          n('قراءة خبر يوميًا باللغة المستهدفة', 63, 83),
        ]),
        n('التحدث دون تفكير مسبق', 84, 118, [
          n('ثلاث محادثات طويلة أسبوعيًا', 84, 104),
          n('تسجيل نفسي وأنا أروي أحداث اليوم', 105, 118),
        ]),
        n('الاختبار', 119, 139, [
          n('اختباران تجريبيان كاملان', 119, 132),
          n('مراجعة نقاط الضعف فقط', 133, 139),
        ]),
      ],
    },
    semestral: {
      resumen:
        'ثمانية أسابيع للوصول إلى موعد التسليم: الإطار النظري، العمل المخبري، وأسبوع كامل مخصَّص ' +
        'للكتابة والتمرّن على المناقشة.',
      nodos: [
        n('الإطار النظري', 0, 20, [
          n('جمع المصادر العشرة', 0, 10),
          n('كتابة مراجعة الأدبيات', 11, 20),
        ]),
        n('العمل المخبري', 21, 41, [
          n('إعداد التجربة', 21, 30),
          n('ثلاث جولات من القياسات', 31, 41),
        ]),
        n('التسليم', 42, 55, [
          n('كتابة النتائج والاستنتاجات', 42, 48),
          n('الملصق العلمي والتمرّن على المناقشة', 49, 55),
        ]),
      ],
    },
    racha: {
      resumen:
        'أربعة أسابيع حتى لا تبقى قراءة النشرة رهينة التذكّر: موعد ثابت، توزيع المهام بين ' +
        'المساعدين، وملخّص شهري يمكن الرجوع إليه.',
      nodos: [
        n('حتى لا تفوتني', 0, 9, [
          n('قراءتها خلال استراحة الدوام', 0, 4),
          n('ضبط تنبيه الساعة 14:00', 5, 9),
        ]),
        n('توزيع المهام', 10, 19, [
          n('تكليف مساعدَين بالرياضة والعلوم', 10, 14),
          n('الاستماع إلى الملخّص أثناء الفطور', 15, 19),
        ]),
        n('إغلاق الشهر', 20, 27, [
          n('حفظ الأخبار الثلاثة الجديرة بالاهتمام', 20, 24),
          n('حساب سلسلة الأيام المتتالية وتدوينها', 25, 27),
        ]),
      ],
    },
    archivo: {
      resumen:
        'اثنا عشر أسبوعًا لتفريغ قائمة الأرشيف المعلَّقة، من العناوين التي بدأت بالفعل إلى تلك ' +
        'التي انتظرت أطول مدة.',
      nodos: [
        n('ما بدأته بالفعل', 0, 27, [
          n('إنهاء المسلسل الذي توقّف في المنتصف', 0, 13),
          n('إنهاء الكتاب الموجود على طاولة السرير', 14, 27),
        ]),
        n('الأفلام المعلَّقة', 28, 55, [
          n('جلستان أسبوعيًا', 28, 48),
          n('كتابة مراجعة بعد كل فيلم', 49, 55),
        ]),
        n('لعبة الفيديو المنتظرة منذ سنة', 56, 83, [
          n('استئنافها من آخر حفظ', 56, 76),
          n('تقييم كل ما شوهد وأرشفته', 77, 83),
        ]),
      ],
    },
    coche: {
      resumen:
        'ثمانية أسابيع مرتَّبة حسب الأولوية: ما يفرضه القانون وله موعد محدَّد أولًا، ثم ما تبقّى ' +
        'من أثر العطل، وأخيرًا التجهيز للبرد.',
      nodos: [
        n('ما يفرضه القانون', 0, 20, [
          n('الفحص الفني نصف السنوي', 0, 10),
          n('تجديد رسوم الترخيص', 11, 20),
        ]),
        n('ما تبقّى من العطل', 21, 41, [
          n('الفرامل وسائلها', 21, 30),
          n('البطارية وشمعات الإشعال', 31, 41),
        ]),
        n('قبل حلول البرد', 42, 55, [
          n('الإطارات وضغط الهواء', 42, 48),
          n('فحص سائل التبريد', 49, 55),
        ]),
      ],
    },
    corea: {
      resumen:
        'اثنا عشر يومًا من الشمال إلى الجنوب: أربعة في سيول لتجاوز فارق التوقيت، المركز التاريخي ' +
        'في المنتصف، وجيجو في النهاية، مع رحلة العودة أيضًا من سيول.',
      nodos: [
        n('سيول', 0, 4, [
          n('قصر غيونغبوك وحي بوكتشون', 0, 1),
          n('سوق غوانغجانغ ومنطقة ميونغدونغ', 2, 2),
          n('رحلة إلى المنطقة المنزوعة السلاح', 3, 4),
        ]),
        n('غيونغجو وبوسان', 5, 8, [
          n('المقابر الملكية ومعبد بولغوكسا', 5, 6),
          n('غامتشون وسوق جاغالتشي', 7, 8),
        ]),
        n('جزيرة جيجو', 9, 11, [
          n('شروق الشمس عند سيونغسان إلتشولبونغ', 9, 10),
          n('العودة إلى سيول لقضاء الليلة الأخيرة', 11, 11),
        ]),
      ],
    },
    fondo: {
      resumen:
        'أربعة وعشرون أسبوعًا لتجميع ما يعادل ثلاثة أشهر من المصاريف الثابتة: معرفة المبلغ المطلوب ' +
        'أولًا، ثم اقتطاعه يوم الراتب، والجزء الصعب — عدم المساس به.',
      nodos: [
        n('معرفة المبلغ المطلوب', 0, 13, [
          n('جمع المصاريف الثابتة لثلاثة أشهر', 0, 6),
          n('تحديد الهدف وتدوينه', 7, 13),
        ]),
        n('الاقتطاع قبل الإنفاق', 14, 90, [
          n('جدولة تحويل تلقائي يوم الراتب', 14, 48),
          n('إضافة ما يتبقّى من الدروس الخصوصية', 49, 90),
        ]),
        n('عدم المساس به', 91, 167, [
          n('حساب منفصل دون بطاقة', 91, 118),
          n('مراجعة الرصيد مرة شهريًا', 119, 167),
        ]),
      ],
    },
    formulario: {
      resumen:
        'ستة أسابيع، وهذا ما تبقّى حتى الاختبار النصفي: جمع القوانين وفهمها أولًا، ثم حلّ المسائل ' +
        'حتى تصبح تلقائية دون النظر، وأخيرًا مسألة من تأليفي.',
      nodos: [
        n('جمع قوانين المنهج', 0, 13, [
          n('نسخ قوانين الحركة والديناميكا', 0, 6),
          n('إضافة قوانين الطاقة مع وحداتها', 7, 13),
        ]),
        n('الحلّ حتى تصبح تلقائية', 14, 34, [
          n('عشر مسائل في الحركة القذفية', 14, 23),
          n('عشر مسائل في الطاقة والشغل', 24, 34),
        ]),
        n('الختام بمسألة من تأليفي', 35, 41, [
          n('مراجعة ما لا يزال يُخطَأ فيه', 35, 38),
          n('إعداد ورقة ملخّص قوانين الفصل الدراسي', 39, 41),
        ]),
      ],
    },
  },
  nl: {
    maraton: {
      resumen:
        'Het kost 24 weken: acht weken lichte basis om te herstellen van de vorige marathon, en bij ' +
        '10 uur per week passen het specifieke blok en de taper niet in minder tijd zonder dezelfde ' +
        'blessure te herhalen.',
      nodos: [
        n('De basis pijnvrij heropbouwen', 0, 55, [
          n('40 minuten hardlopen op gesprekstempo', 0, 20),
          n('De lange duurloop van 90 minuten toevoegen', 21, 41),
          n('Twee keer per week heupkracht trainen', 42, 55),
        ]),
        n('Geleidelijk meer volume', 56, 104, [
          n('Naar 60 km per week zonder klachten', 56, 76),
          n('Lange duurloop van 2 uur 30 minuten', 77, 90),
          n('Acht heuvelherhalingen', 91, 104),
        ]),
        n('Marathonspecifiek blok', 105, 146, [
          n('Intervallen van 1 km op 10K-tempo', 105, 118),
          n('Lange duurloop van 20 km op streeftempo', 119, 132),
          n('Generale repetitie van 32 km met voeding', 133, 146),
        ]),
        n('Tapering en heel aan de start komen', 147, 167, [
          n('Het volume halveren', 147, 160),
          n('Ontbijt en starttempo oefenen', 161, 167),
        ]),
      ],
    },
    cocina: {
      meta: 'Keukenrenovatie',
      categoria: 'Huis',
      resumen:
        'Een functionele keuken bouwen in 13 weken met 5 uur per week: planning, installatie van de ' +
        'basisconstructie, water- en gasaansluitingen, elektra, afwerking en eindtests.',
      nodos: [
        n('Planning en voorbereiding', 0, 13, [
          n('De indeling ontwerpen en materialen kiezen', 0, 6),
          n('Vergunningen regelen en een budget opstellen', 7, 13),
        ]),
        n('Installatie van de basisconstructie', 14, 34, [
          n('De oude keuken slopen en de ruimte voorbereiden', 14, 20),
          n('Onderkasten en lades monteren', 21, 30),
          n('Bovenkasten en planken monteren', 31, 34),
        ]),
        n('Technische aansluitingen (water en gas)', 35, 55, [
          n('Leidingen voor koud en warm water aanleggen', 35, 44),
          n('Spoelbak en kraan aansluiten', 45, 49),
          n('Gasaansluiting voor het fornuis maken', 50, 55),
        ]),
        n('Elektrische installatie', 56, 69, [
          n('Bekabeling aanleggen en de meterkast plaatsen', 56, 61),
          n('Stopcontacten en schakelaars plaatsen', 62, 65),
          n('Afzuigkap en verlichting aansluiten', 66, 69),
        ]),
        n('Afwerking', 70, 83, [
          n('Werkblad en achterwand monteren', 70, 76),
          n('Naden afkitten en muren schilderen', 77, 80),
          n('Grepen en deurtjes monteren', 81, 83),
        ]),
        n('Eindtests en oplevering', 84, 90, [
          n('Controleren op water- en gaslekken', 84, 86),
          n('Circuits en apparatuur testen', 87, 88),
          n('Eindschoonmaak en laatste aanpassingen', 89, 90),
        ]),
      ],
    },
    posgrado: {
      resumen:
        'Eenentwintig weken om zonder haast bij de deadline te komen: eerst programma’s kiezen, dan ' +
        'het toelatingsexamen, en pas op het laatst de motivatiebrief — die het vaakst wordt herschreven.',
      nodos: [
        n('Programma’s en eisen kiezen', 0, 27, [
          n('Zes programma’s en hun deadlines vergelijken', 0, 13),
          n('Eisen en documenten van elk programma verzamelen', 14, 27),
        ]),
        n('Toelatingsexamen', 28, 83, [
          n('Lineaire algebra en differentiaalvergelijkingen herhalen', 28, 48),
          n('Drie volledige proefexamens maken', 49, 69),
          n('Het toelatingsexamen afleggen', 70, 83),
        ]),
        n('Aanbevelingsbrieven en dossier', 84, 104, [
          n('Drie aanbevelingsbrieven aanvragen', 84, 93),
          n('Het dossier laten vertalen en waarmerken', 94, 104),
        ]),
        n('Motivatiebrief en portfolio', 105, 132, [
          n('De eerste versie van de brief schrijven', 105, 118),
          n('Hem doornemen met de docent astrofysica', 119, 125),
          n('Het portfolio met projecten samenstellen', 126, 132),
        ]),
        n('De aanvragen versturen', 133, 146, [
          n('De formulieren van de zes universiteiten invullen', 133, 139),
          n('Kosten betalen en voor de deadline versturen', 140, 146),
        ]),
      ],
    },
    nutricion: {
      resumen:
        'Drieëntwintig weken gekoppeld aan het trainingsschema: eten om te trainen terwijl het volume ' +
        'stijgt, wedstrijdvoeding oefenen tijdens de lange duurlopen en carbo loading tot het laatst ' +
        'bewaren.',
      nodos: [
        n('Eten om te trainen', 0, 55, [
          n('Op trainingsdagen op 2.400 kcal blijven', 0, 27),
          n('Ontbijten voor de lange duurloop', 28, 41),
          n('Drie liter water drinken op warme dagen', 42, 55),
        ]),
        n('Wedstrijdvoeding oefenen', 56, 111, [
          n('Gel en water elke 45 minuten tijdens de lange duurlopen', 56, 76),
          n('De avond ervoor koolhydraatrijk eten', 77, 90),
          n('Het ontbijt van de wedstrijddag drie keer herhalen', 91, 111),
        ]),
        n('Carbo loading en wedstrijdweek', 112, 163, [
          n('Naar 7 g koolhydraten per kilo gaan', 112, 146),
          n('De boodschappenlijst alvast klaarmaken', 147, 156),
          n('Marathonontbijt, zonder verrassingen', 157, 163),
        ]),
      ],
    },
    sueno: {
      resumen:
        'Zes weken in drie stappen: eerst het tijdstip om de dag af te sluiten, dan de kamer, en pas ' +
        'op het laatst meten — drie dingen tegelijk veranderen zou niet laten zien wat werkte.',
      nodos: [
        n('De dag steeds op dezelfde tijd afsluiten', 0, 13, [
          n('Schermen uitzetten om 23:10', 0, 6),
          n('Geen cafeïne meer na 16:00', 7, 13),
        ]),
        n('De kamer voorbereiden', 14, 27, [
          n('Het licht dimmen een uur van tevoren', 14, 20),
          n('De telefoon buiten de slaapkamer laten', 21, 27),
        ]),
        n('Meten en bijstellen', 28, 41, [
          n('Bijhouden hoe lang het duurt om in slaap te vallen', 28, 34),
          n('Ook op zondag op dezelfde tijd opstaan', 35, 41),
        ]),
      ],
    },
    memorias: {
      resumen:
        'Acht weken om het geschreven jaar af te sluiten: inhalen wat halverwege bleef steken, één ' +
        'herinnering per week volhouden en eindigen met een geordend album.',
      nodos: [
        n('Het ontbrekende inhalen', 0, 20, [
          n('De drie dagen van de reis afmaken die halverwege bleven', 0, 10),
          n('Foto’s toevoegen aan de aantekeningen van de moeilijke periode', 11, 20),
        ]),
        n('Eén herinnering per week', 21, 41, [
          n('Op zondagavond schrijven', 21, 34),
          n('De foto van de maand kiezen', 35, 41),
        ]),
        n('Het album van het jaar', 42, 55, [
          n('Alle twaalf doornemen en ordenen', 42, 48),
          n('Het aan de familie laten zien', 49, 55),
        ]),
      ],
    },
    calma: {
      resumen:
        'Vier weken zonder druk: het moment vinden dat er echt is, van vijf naar tien minuten gaan ' +
        'en het koppelen aan iets wat je al doet.',
      nodos: [
        n('Het juiste moment vinden', 0, 6, [
          n('Mediteren proberen na terugkomst van de dienst', 0, 3),
          n('Het meditatiekussen in het zicht laten liggen', 4, 6),
        ]),
        n('Tien minuten aan één stuk', 7, 20, [
          n('Vijf dagen box breathing', 7, 13),
          n('Van vijf naar tien minuten gaan', 14, 20),
        ]),
        n('Zorgen dat het zichzelf in stand houdt', 21, 27, [
          n('Na afloop één dankbaarheid opschrijven', 21, 27),
        ]),
      ],
    },
    nocturno: {
      resumen:
        'Zestien weken met vier uur per week: twee voor het lezen van de partituur, zes om de handen ' +
        'samen te voegen, vier voor pedaal en versieringen, en twee om het geheel zonder stoppen te spelen.',
      nodos: [
        n('De partituur lezen', 0, 27, [
          n('De eerste twee pagina’s solfègeren', 0, 13),
          n('De handen apart oefenen op half tempo', 14, 27),
        ]),
        n('De handen samenvoegen', 28, 69, [
          n('De eerste pagina helemaal', 28, 48),
          n('De tweede pagina helemaal', 49, 69),
        ]),
        n('Versieringen en pedaal', 70, 97, [
          n('De triolen in maat 16', 70, 83),
          n('Pedaal op de harmonie, niet op de maat', 84, 97),
        ]),
        n('Het geheel spelen', 98, 111, [
          n('Mezelf drie keer achter elkaar opnemen', 98, 104),
          n('Het voor de familie spelen', 105, 111),
        ]),
      ],
    },
    prototipo: {
      resumen:
        'Tien weken om te stoppen met erover te blijven malen: er één kiezen, een versie maken die ' +
        'in een middag af is, en beslissen op basis van wat er gebeurt, niet van wat je je voorstelt.',
      nodos: [
        n('Kiezen', 0, 13, [
          n('De vijf finalisten van de ideeënkaart beoordelen', 0, 6),
          n('Er drie schrappen zonder schuldgevoel', 7, 13),
        ]),
        n('Op kleine schaal uitproberen', 14, 41, [
          n('De versie van één middag maken', 14, 27),
          n('Hem aan drie mensen laten zien', 28, 41),
        ]),
        n('Beslissen op basis van feiten', 42, 69, [
          n('Opschrijven wat er misging', 42, 55),
          n('Beslisdiagram: doorgaan of loslaten', 56, 69),
        ]),
      ],
    },
    b2: {
      resumen:
        'Twintig weken: afronden wat van B1 nog openstond, de woordenschat uitbreiden, vlot leren ' +
        'praten en de proefexamens tot het laatst bewaren.',
      nodos: [
        n('B1 afronden', 0, 34, [
          n('De opgestapelde kaarten herhalen', 0, 20),
          n('Het grammaticaprogramma afmaken', 21, 34),
        ]),
        n('Woordenschat voor B2', 35, 83, [
          n('Veertig nieuwe kaarten per week', 35, 62),
          n('Elke dag een nieuwsbericht in de taal lezen', 63, 83),
        ]),
        n('Praten zonder na te denken', 84, 118, [
          n('Drie lange gesprekken per week', 84, 104),
          n('Mezelf opnemen terwijl ik over de dag vertel', 105, 118),
        ]),
        n('Het examen', 119, 139, [
          n('Twee volledige proefexamens', 119, 132),
          n('Alleen herhalen wat nog misgaat', 133, 139),
        ]),
      ],
    },
    semestral: {
      resumen:
        'Acht weken tot de inlevering: theoretisch kader, labwerk en een hele week gereserveerd om ' +
        'te schrijven en de verdediging te oefenen.',
      nodos: [
        n('Theoretisch kader', 0, 20, [
          n('De tien bronnen verzamelen', 0, 10),
          n('De literatuurstudie schrijven', 11, 20),
        ]),
        n('Labwerk', 21, 41, [
          n('De proefopstelling bouwen', 21, 30),
          n('Drie rondes metingen', 31, 41),
        ]),
        n('Inlevering', 42, 55, [
          n('Resultaten en conclusies schrijven', 42, 48),
          n('Poster maken en de verdediging oefenen', 49, 55),
        ]),
      ],
    },
    racha: {
      resumen:
        'Vier weken zodat het lezen van de editie niet langer van je geheugen afhangt: een vast ' +
        'moment, de verdeling onder de assistenten en een maandafsluiting om op terug te kijken.',
      nodos: [
        n('Zodat het niet aan me voorbijgaat', 0, 9, [
          n('Lezen in de pauze van de dienst', 0, 4),
          n('De herinnering instellen op 14:00', 5, 9),
        ]),
        n('Het werk verdelen', 10, 19, [
          n('Sport en wetenschap aan twee assistenten geven', 10, 14),
          n('De samenvatting beluisteren tijdens het ontbijt', 15, 19),
        ]),
        n('De maand afsluiten', 20, 27, [
          n('De drie berichten bewaren die het waard waren', 20, 24),
          n('De reeks tellen en opschrijven', 25, 27),
        ]),
      ],
    },
    archivo: {
      resumen:
        'Twaalf weken om de achterstand in het archief weg te werken, van wat al begonnen is tot ' +
        'wat het langst ligt te wachten.',
      nodos: [
        n('Wat ik al begonnen ben', 0, 27, [
          n('De serie afmaken die halverwege bleef liggen', 0, 13),
          n('Het boek op het nachtkastje uitlezen', 14, 27),
        ]),
        n('De films die nog wachten', 28, 55, [
          n('Twee keer per week kijken', 28, 48),
          n('Na elke film een recensie schrijven', 49, 55),
        ]),
        n('De game die al een jaar wacht', 56, 83, [
          n('Verdergaan vanaf het laatste savepoint', 56, 76),
          n('Alles wat bekeken is beoordelen en archiveren', 77, 83),
        ]),
      ],
    },
    coche: {
      resumen:
        'Acht weken geordend op urgentie: eerst wat wettelijk verplicht is en een deadline heeft, ' +
        'dan wat er nog overbleef van de pech, en tot slot de voorbereiding op de kou.',
      nodos: [
        n('Wat de wet vereist', 0, 20, [
          n('De halfjaarlijkse APK', 0, 10),
          n('De wegenbelasting verlengen', 11, 20),
        ]),
        n('Wat er nog overbleef van de pech', 21, 41, [
          n('Remmen en remvloeistof', 21, 30),
          n('Accu en bougies', 31, 41),
        ]),
        n('Voor de kou', 42, 55, [
          n('Banden en bandenspanning', 42, 48),
          n('De koelvloeistof controleren', 49, 55),
        ]),
      ],
    },
    corea: {
      resumen:
        'Twaalf dagen van noord naar zuid: vier in Seoul tegen de jetlag, het historische centrum ' +
        'in het midden en Jeju aan het eind, met de terugvlucht ook vanuit Seoul.',
      nodos: [
        n('Seoul', 0, 4, [
          n('Gyeongbokgung en de wijk Bukchon', 0, 1),
          n('De Gwangjang-markt en Myeongdong', 2, 2),
          n('Dagtocht naar de DMZ', 3, 4),
        ]),
        n('Gyeongju en Busan', 5, 8, [
          n('De koninklijke graven en de Bulguksa-tempel', 5, 6),
          n('Gamcheon en de Jagalchi-markt', 7, 8),
        ]),
        n('Het eiland Jeju', 9, 11, [
          n('Zonsopgang bij Seongsan Ilchulbong', 9, 10),
          n('Terug naar Seoul voor de laatste nacht', 11, 11),
        ]),
      ],
    },
    fondo: {
      resumen:
        'Vierentwintig weken om drie maanden vaste lasten bij elkaar te sparen: eerst weten hoeveel ' +
        'dat is, dan het opzijzetten op salarisdag, en het moeilijke deel — er niet aankomen.',
      nodos: [
        n('Weten hoeveel het is', 0, 13, [
          n('De vaste lasten van drie maanden optellen', 0, 6),
          n('Het doelbedrag vastleggen en opschrijven', 7, 13),
        ]),
        n('Opzijzetten voordat je het uitgeeft', 14, 90, [
          n('Een automatische overschrijving instellen op salarisdag', 14, 48),
          n('Wat de bijlessen opleveren erbij stoppen', 49, 90),
        ]),
        n('Er niet aankomen', 91, 167, [
          n('Een aparte rekening, zonder pas', 91, 118),
          n('Eén keer per maand het saldo checken', 119, 167),
        ]),
      ],
    },
    formulario: {
      resumen:
        'Zes weken, zoveel blijft er over tot het tentamen: eerst de formules verzamelen en ' +
        'begrijpen, dan oefenen tot ze vanzelf gaan zonder te spieken, en tot slot een eigen opgave.',
      nodos: [
        n('De formules uit de stof verzamelen', 0, 13, [
          n('Die van kinematica en dynamica overschrijven', 0, 6),
          n('Die van energie met hun eenheden toevoegen', 7, 13),
        ]),
        n('Oefenen tot het vanzelf gaat', 14, 34, [
          n('Tien opgaven over schuine worp', 14, 23),
          n('Tien over energie en arbeid', 24, 34),
        ]),
        n('Afsluiten met iets eigens', 35, 41, [
          n('Herhalen wat nog steeds misgaat', 35, 38),
          n('Het formuleblad van het semester samenstellen', 39, 41),
        ]),
      ],
    },
  },
}

/**
 * Guarda un plan de la demo y devuelve su id.
 *
 * `hechos` son ids de `NodoPlan` tal como los numera `aplanar`: recorrido en
 * pre-orden, o sea fase 1 = 1, sus hijos 2..k, fase 2 = k+1… Se cuentan sobre el
 * árbol de arriba, igual que las llaves de `ENLACES_DEMO`.
 *
 * El nombre sale de la misma clave que usa el generador de verdad, así que la
 * demo dice «Plan A» / «Plan A» según el idioma sin ninguna clave nueva.
 *
 * Los chips de app se pegan aquí y no en el árbol: así los dos idiomas comparten
 * el mismo reparto, y en los planes ACEPTADOS `aceptarPlan` los hereda solo a las
 * sub-metas reales (que es donde el paso se acaba haciendo).
 */
export async function sembrarPlanDemo(opts: {
  metaId: number
  clave: ClavePlan
  plan: PlanDemo
  inicioISO: string
  entrada: EntradaPlan
  creadoEn: string
  hechos?: number[]
}): Promise<number> {
  const enlaces = ENLACES_DEMO[opts.clave]
  return await planesMetaRepo.add({
    metaId: opts.metaId,
    nombre: tGlobal('cal.plan.nombreAuto', 'Plan {letra}', { letra: 'A' }),
    inicioISO: opts.inicioISO,
    nodos: aplanar(opts.plan.nodos).map((n) =>
      enlaces[n.id] ? { ...n, enlaceApp: enlaces[n.id] } : n,
    ),
    entrada: opts.entrada,
    resumen: opts.plan.resumen,
    creadoEn: opts.creadoEn,
    hechos: opts.hechos,
  })
}
