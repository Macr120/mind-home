import type { TipoMapa } from '../../core/data/db'
import type { Idioma } from '../../core/i18n/idiomas'
import { idiomaActual } from '../../core/i18n/useT'
import { EJEMPLOS_EN } from './ejemplosEn'
import type { MapaPropuesto } from './ia'
import type { NodoPropuesto } from './layouts'

/**
 * Un ejemplo de fábrica por formato, con su guía.
 *
 * Explicar un formato con palabras no sirve de mucho: lo que enseña es verlo
 * hecho y poder moverlo. Por eso el ejemplo se MATERIALIZA como un mapa normal
 * (`MapaIdeas.ejemplo`), con su guía encima del lienzo, y el usuario puede
 * editarlo, quedárselo de plantilla o tirarlo.
 *
 * El CONTENIDO no pasa por `dict.ts` —en cuanto se crea es un dato del usuario,
 * no texto de interfaz—, así que el catálogo está entero en cada idioma
 * (`ejemplosEn.ts`) y se elige completo al crear. La guía sí es interfaz: viaja
 * por `ideas.guia.<tipo>` y aquí solo queda su español de respaldo.
 */

/** Lo que se materializa: el mapa de ejemplo en un idioma. */
export interface ContenidoEjemplo {
  /** Nombre del mapa que se crea. */
  titulo: string
  /** Mismo contrato que devuelve la IA: se materializa por el mismo camino. */
  propuesta: MapaPropuesto
}

export interface EjemploMapa extends ContenidoEjemplo {
  /** Para qué sirve el formato y cómo se llena (2-3 frases). */
  guiaEs: string
}

const n = (texto: string, ...hijos: NodoPropuesto[]): NodoPropuesto => ({ texto, hijos })

/** Encadena los pasos de un flujo: cada uno cuelga del anterior. */
function cadena(pasos: NodoPropuesto[]): NodoPropuesto[] {
  for (let i = pasos.length - 1; i > 0; i--) pasos[i - 1].hijos = [pasos[i]]
  return pasos[0] ? pasos[0].hijos : []
}

const paso = (texto: string, forma?: NodoPropuesto['forma']): NodoPropuesto => ({ texto, hijos: [], forma })

/**
 * El contenido traducido, por idioma. Un idioma que falte aquí se queda con el
 * español, que es el catálogo base (`EJEMPLOS`).
 */
const TRADUCIDOS: Partial<Record<Idioma, Record<TipoMapa, ContenidoEjemplo>>> = {
  en: EJEMPLOS_EN,
}

/** El ejemplo en el idioma activo; la guía siempre lleva su respaldo español. */
export function ejemploDe(tipo: TipoMapa): EjemploMapa {
  const es = EJEMPLOS[tipo]
  const traducido = TRADUCIDOS[idiomaActual()]?.[tipo]
  return traducido ? { ...traducido, guiaEs: es.guiaEs } : es
}

export const EJEMPLOS: Record<TipoMapa, EjemploMapa> = {
  mental: {
    titulo: 'Viaje a Japón',
    guiaEs:
      'El mapa mental abre un tema en todas direcciones: la idea al centro, las ramas grandes alrededor y sus detalles colgando de ellas. Es para vaciar la cabeza sin decidir todavía un orden.',
    propuesta: {
      raiz: 'Viaje a Japón',
      ramas: [
        n('Ruta', n('Tokio'), n('Kioto'), n('Osaka')),
        n('Presupuesto', n('Vuelos'), n('Hotel'), n('Comida diaria')),
        n('Qué llevar', n('Adaptador'), n('JR Pass'), n('Zapatos cómodos')),
        n('Antes de salir', n('Revisar el pasaporte'), n('Cambiar yenes')),
      ],
    },
  },

  arbol: {
    titulo: 'Fuentes de energía',
    guiaEs:
      'El árbol baja de lo general a lo concreto, como un organigrama. Úsalo cuando lo que tienes son categorías que se parten en subcategorías, no ideas sueltas.',
    propuesta: {
      raiz: 'Fuentes de energía',
      ramas: [
        n('Renovables', n('Solar'), n('Eólica'), n('Hidráulica')),
        n('Fósiles', n('Carbón'), n('Petróleo'), n('Gas natural')),
        n('Nuclear', n('Fisión'), n('Fusión')),
      ],
    },
  },

  etimologia: {
    titulo: 'Idea',
    guiaEs:
      'El árbol etimológico desarma una palabra: de dónde viene, qué significa, cómo se usa y qué palabras son de su familia. Va bien para entender un concepto a fondo antes de una lluvia o para ponerle nombre a algo.',
    propuesta: {
      raiz: 'Idea',
      ramas: [
        n('Origen', n('Gr. idéa: ‘forma, aspecto’'), n('De ideîn: ‘ver’'), n('Al español por el latín')),
        n('Significados', n('Representación mental'), n('Plan o propósito'), n('Concepto u opinión')),
        n('Usos', n('«Tener una idea»'), n('«Ni idea»'), n('«Hacerse a la idea»')),
        n('Familia léxica', n('Ideal'), n('Idear'), n('Ideología'), n('Ideario')),
      ],
    },
  },

  llaves: {
    titulo: 'Partes de una bicicleta',
    guiaEs:
      'Las llaves parten un todo en sus piezas, de izquierda a derecha: el cuadro sinóptico de toda la vida. Va bien para desarmar algo y ver de qué está hecho.',
    propuesta: {
      raiz: 'Bicicleta',
      ramas: [
        n('Cuadro', n('Tubo superior'), n('Horquilla'), n('Sillín')),
        n('Transmisión', n('Pedales'), n('Cadena'), n('Piñones')),
        n('Ruedas', n('Llanta'), n('Rayos'), n('Cámara')),
        n('Frenos', n('Manetas'), n('Pastillas')),
      ],
    },
  },

  circulo: {
    titulo: 'El café',
    guiaEs:
      'El círculo pone un tema al centro y lo rodea con todo lo que sabes de él, sin jerarquía ni orden. Sirve para explorar un concepto o para repasar antes de un examen.',
    propuesta: {
      raiz: 'El café',
      ramas: [
        n('Tiene cafeína'),
        n('Crece en el trópico'),
        n('Arábica y robusta'),
        n('Tueste claro u oscuro'),
        n('Espresso'),
        n('Se cosecha a mano'),
        n('Descafeinado'),
        n('Segunda bebida del mundo'),
      ],
    },
  },

  flujo: {
    titulo: 'Sacar una cita médica',
    guiaEs:
      'El flujo encadena pasos con flechas. Toca un paso y usa el botón de la figura para volverlo inicio, decisión o fin: los rombos son las preguntas de sí o no.',
    propuesta: {
      raiz: 'Necesito consulta',
      formaRaiz: 'inicio',
      ramas: cadena([
        paso('Necesito consulta', 'inicio'),
        paso('Abrir la app del seguro'),
        paso('¿Hay cita esta semana?', 'decision'),
        paso('Elegir día y hora'),
        paso('Confirmar y guardar'),
        paso('Ponerla en el calendario', 'fin'),
      ]),
    },
  },

  linea: {
    titulo: 'Historia de internet',
    guiaEs:
      'La línea del tiempo ordena por fechas: cada hito cae alternando arriba y abajo de la recta y sus detalles cuelgan hacia afuera. Empieza el hito con el año y se lee solo.',
    propuesta: {
      raiz: 'Historia de internet',
      ramas: [
        n('1969 · Nace ARPANET', n('Cuatro universidades')),
        n('1983 · Se adopta TCP/IP'),
        n('1991 · Primera web pública', n('Tim Berners-Lee')),
        n('2004 · Llegan las redes sociales'),
        n('2007 · El móvil se lleva todo'),
      ],
    },
  },

  ciclo: {
    titulo: 'Ciclo del agua',
    guiaEs:
      'El ciclo encadena etapas que vuelven a empezar. Agrega cada etapa desde la raíz —toca el fondo para no colgarla de la anterior— y se reparten solas en el círculo.',
    propuesta: {
      raiz: 'Ciclo del agua',
      ramas: [
        n('Evaporación', n('El sol calienta el mar')),
        n('Condensación', n('Se forman las nubes')),
        n('Precipitación', n('Llueve o nieva')),
        n('Escorrentía', n('Los ríos vuelven al mar')),
      ],
    },
  },

  piramide: {
    titulo: 'Pirámide de Maslow',
    guiaEs:
      'La pirámide apila niveles: cada uno se sostiene sobre el de abajo, así que la base es lo primero que hay que cubrir. Toca dos veces el nombre de un nivel para cambiarlo.',
    propuesta: {
      raiz: 'Pirámide de Maslow',
      ramas: [],
      conjuntos: ['Autorrealización', 'Reconocimiento', 'Afecto y seguridad', 'Necesidades básicas'],
      elementos: [
        { texto: 'Crear y dar sentido', zona: 'p1' },
        { texto: 'Respeto y logros', zona: 'p2' },
        { texto: 'Amistad y pareja', zona: 'p3' },
        { texto: 'Casa y trabajo', zona: 'p3' },
        { texto: 'Comer y dormir', zona: 'p4' },
        { texto: 'Salud', zona: 'p4' },
      ],
    },
  },

  venn: {
    titulo: 'Perros y gatos',
    guiaEs:
      'El Venn enfrenta dos conjuntos y lo que comparten cae donde se solapan. Elige la región en la barra de abajo antes de agregar, o arrastra un elemento a otra y se cambia solo.',
    propuesta: {
      raiz: 'Perros y gatos',
      ramas: [],
      conjuntos: ['Perros', 'Gatos'],
      elementos: [
        { texto: 'Salen a pasear', zona: 'a' },
        { texto: 'Obedecen órdenes', zona: 'a' },
        { texto: 'Se limpian solos', zona: 'b' },
        { texto: 'Usan arenero', zona: 'b' },
        { texto: 'Mamíferos', zona: 'ab' },
        { texto: 'Necesitan vacunas', zona: 'ab' },
        { texto: 'Viven en casa', zona: 'ab' },
      ],
    },
  },

  comparacion: {
    titulo: 'Café o té',
    guiaEs:
      'La comparación pone dos temas en columnas y lo común en el medio. Es el Venn en forma de tabla: se lee más rápido cuando hay muchos puntos por lado.',
    propuesta: {
      raiz: 'Café o té',
      ramas: [],
      conjuntos: ['Café', 'Té'],
      elementos: [
        { texto: 'Más cafeína', zona: 'izq' },
        { texto: 'Sabor tostado', zona: 'izq' },
        { texto: 'Se toman calientes', zona: 'centro' },
        { texto: 'Tienen antioxidantes', zona: 'centro' },
        { texto: 'Más suave', zona: 'der' },
        { texto: 'Muchísimas variedades', zona: 'der' },
      ],
    },
  },

  proscontras: {
    titulo: 'Trabajar desde casa',
    guiaEs:
      'Cada punto pesa de 1 a 5: selecciónalo y usa − + en la barra de abajo. La suma de cada columna va a su pie, así la decisión deja de ser «cuál lista es más larga».',
    propuesta: {
      raiz: 'Trabajar desde casa',
      ramas: [],
      elementos: [
        { texto: 'Me ahorro el traslado', zona: 'izq', peso: 5 },
        { texto: 'Horario flexible', zona: 'izq', peso: 4 },
        { texto: 'Como en casa', zona: 'izq', peso: 2 },
        { texto: 'Menos roce con el equipo', zona: 'der', peso: 4 },
        { texto: 'Cuesta desconectar', zona: 'der', peso: 3 },
        { texto: 'Sube el recibo de luz', zona: 'der', peso: 1 },
      ],
    },
  },

  fuerzas: {
    titulo: 'Salir a correr por las mañanas',
    guiaEs:
      'El campo de fuerzas mira un cambio: a la izquierda lo que lo empuja, a la derecha lo que lo frena, cada uno con su peso. Si gana la derecha, ataca primero la fuerza más pesada.',
    propuesta: {
      raiz: 'Salir a correr por las mañanas',
      ramas: [],
      elementos: [
        { texto: 'Quiero dormir mejor', zona: 'izq', peso: 4 },
        { texto: 'Tengo un parque cerca', zona: 'izq', peso: 3 },
        { texto: 'Una amiga me acompaña', zona: 'izq', peso: 4 },
        { texto: 'Me acuesto tarde', zona: 'der', peso: 5 },
        { texto: 'Hace frío al amanecer', zona: 'der', peso: 3 },
        { texto: 'Mis tenis están acabados', zona: 'der', peso: 2 },
      ],
    },
  },

  foda: {
    titulo: 'Abrir una cafetería',
    guiaEs:
      'Fortalezas y debilidades son TUYAS; oportunidades y amenazas vienen de fuera. Si dudas dónde va algo, pregúntate si depende de ti o no.',
    propuesta: {
      raiz: 'Abrir una cafetería',
      ramas: [],
      elementos: [
        { texto: 'Sé mucho de café', zona: 'f' },
        { texto: 'Receta propia de pan', zona: 'f' },
        { texto: 'Poco capital', zona: 'd' },
        { texto: 'Nunca he contratado a nadie', zona: 'd' },
        { texto: 'Barrio sin cafeterías', zona: 'o' },
        { texto: 'Oficinas a dos calles', zona: 'o' },
        { texto: 'La renta va subiendo', zona: 'a' },
        { texto: 'Una cadena abre cerca', zona: 'a' },
      ],
    },
  },

  eisenhower: {
    titulo: 'Mi semana',
    guiaEs:
      'Arriba lo importante, a la izquierda lo urgente. El cuadrante de «agéndalo» es el que mueve la aguja: si vive vacío, estás apagando fuegos todo el día.',
    propuesta: {
      raiz: 'Mi semana',
      ramas: [],
      elementos: [
        { texto: 'Entregar el informe hoy', zona: 'hacer' },
        { texto: 'Llamar al dentista', zona: 'hacer' },
        { texto: 'Preparar la presentación', zona: 'agendar' },
        { texto: 'Hacer ejercicio', zona: 'agendar' },
        { texto: 'Pedir el material', zona: 'delegar' },
        { texto: 'Contestar al proveedor', zona: 'delegar' },
        { texto: 'Mirar el móvil cada rato', zona: 'quitar' },
        { texto: 'Junta sin orden del día', zona: 'quitar' },
      ],
    },
  },

  decision: {
    titulo: '¿Acepto el trabajo nuevo?',
    guiaEs:
      'Cada rama es una opción y de ella cuelgan sus consecuencias. Escríbelas aunque parezcan obvias: lo que no está escrito no se compara con nada.',
    propuesta: {
      raiz: '¿Acepto el trabajo nuevo?',
      ramas: [
        n('Acepto', n('Sueldo más alto'), n('Mudarme de ciudad'), n('Empezar de cero')),
        n('Me quedo', n('Equipo que ya conozco'), n('Techo de sueldo')),
        n('Negocio quedarme', n('Puede salir bien'), n('Puede incomodar')),
      ],
    },
  },

  tier: {
    titulo: 'Mis desayunos',
    guiaEs:
      'S es lo mejor y D lo peor. Lo que todavía no clasificas espera abajo en «Sin clasificar»: arrástralo a su fila cuando lo tengas claro.',
    propuesta: {
      raiz: 'Mis desayunos',
      ramas: [],
      elementos: [
        { texto: 'Chilaquiles', zona: 's' },
        { texto: 'Huevos rancheros', zona: 's' },
        { texto: 'Fruta con yogur', zona: 'a' },
        { texto: 'Molletes', zona: 'a' },
        { texto: 'Pan tostado', zona: 'b' },
        { texto: 'Cereal de caja', zona: 'c' },
        { texto: 'Solo café', zona: 'd' },
        { texto: 'Tamales', zona: 'sin' },
      ],
    },
  },

  matriz: {
    titulo: '¿Qué laptop compro?',
    guiaEs:
      'Cada criterio pesa lo que te importe (1-5) y cada opción se puntúa del 1 al 5 en él. El total multiplica puntaje por peso, así nada gana por ser buenísimo en lo que te da igual.',
    propuesta: {
      raiz: '¿Qué laptop compro?',
      ramas: [],
      criterios: [
        { texto: 'Precio', peso: 5 },
        { texto: 'Batería', peso: 4 },
        { texto: 'Peso', peso: 3 },
        { texto: 'Pantalla', peso: 2 },
      ],
      opciones: [
        { texto: 'La barata', puntajes: [5, 3, 3, 2] },
        { texto: 'La ligera', puntajes: [3, 4, 5, 3] },
        { texto: 'La potente', puntajes: [1, 2, 2, 5] },
      ],
    },
  },

  ishikawa: {
    titulo: 'El pastel no esponjó',
    guiaEs:
      'La cabeza es el problema y cada espina, una familia de causas (método, equipo, materiales, medición…). Busca CAUSAS, no soluciones: eso viene después.',
    propuesta: {
      raiz: 'El pastel no esponjó',
      ramas: [
        n('Ingredientes', n('Polvo para hornear vencido'), n('Huevos fríos')),
        n('Método', n('Batí de más la mezcla'), n('Abrí el horno antes de tiempo')),
        n('Equipo', n('Horno descalibrado'), n('Molde demasiado grande')),
        n('Medición', n('Medí con taza, no con báscula')),
      ],
    },
  },
}
