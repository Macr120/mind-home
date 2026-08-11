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

export const PLANES_DEMO: Record<'es' | 'en', Record<ClavePlan, PlanDemo>> = {
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
