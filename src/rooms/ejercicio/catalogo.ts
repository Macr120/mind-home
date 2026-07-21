import type { EjercicioCardio, EjercicioFuerza, EjercicioFlex, GrupoFuerza } from '../../core/data/db'

/**
 * Catálogo de ejercicios preguardados, ordenados por funcionalidad.
 * Alimenta el autocompletado de cada modalidad; el usuario puede
 * escribir ejercicios propios que no estén aquí.
 */
export interface GrupoCatalogo {
  id: string
  label: string
  ejercicios: string[]
}

/** Forma de la semilla estática (antes de sembrarse en `gruposFuerza`/`gruposFlex`). */
interface GrupoFuerzaSeed {
  id: string
  label: string
  ejercicios: EjercicioFuerza[]
}
interface GrupoFlexSeed {
  id: string
  label: string
  ejercicios: EjercicioFlex[]
}
interface GrupoCardioSeed {
  id: string
  label: string
  ejercicios: EjercicioCardio[]
}

/** Semilla inicial de fuerza (solo para sembrar `gruposFuerza` la primera vez; luego el catálogo vivo es el de la BD). */
export const CATALOGO_FUERZA: GrupoFuerzaSeed[] = [
  {
    id: 'pecho',
    label: 'Pecho',
    ejercicios: [
      { nombre: 'Press banca', descripcion: 'Acostado en banca, baja la barra al pecho y empuja hasta extender los codos.' },
      { nombre: 'Press inclinado', descripcion: 'En banca inclinada, empuja la barra o mancuernas para enfatizar el pecho superior.' },
      { nombre: 'Press con mancuernas', descripcion: 'Acostado, empuja dos mancuernas hacia arriba con mayor rango que la barra.' },
      { nombre: 'Aperturas con mancuernas', descripcion: 'Acostado, abre los brazos en arco y ciérralos con los codos semiflexionados.' },
      { nombre: 'Cruce en polea', descripcion: 'De pie entre poleas altas, junta las manos al frente contrayendo el pecho.' },
      { nombre: 'Fondos en paralelas', descripcion: 'Suspendido en paralelas, baja flexionando codos con el torso inclinado y empuja.' },
      { nombre: 'Flexiones', descripcion: 'Boca abajo, baja el pecho al suelo con el cuerpo recto y empuja hacia arriba.' },
    ],
  },
  {
    id: 'espalda',
    label: 'Espalda',
    ejercicios: [
      { nombre: 'Dominadas', descripcion: 'Colgado de la barra, tira del cuerpo hasta pasar la barbilla sobre la barra.' },
      { nombre: 'Jalón al pecho', descripcion: 'Sentado en polea alta, jala la barra al pecho llevando los codos abajo.' },
      { nombre: 'Remo con barra', descripcion: 'Inclinado con espalda recta, jala la barra al abdomen apretando la espalda.' },
      { nombre: 'Remo con mancuerna', descripcion: 'Apoyado en banca, jala una mancuerna al costado sin girar el torso.' },
      { nombre: 'Remo en polea baja', descripcion: 'Sentado, jala el maneral al abdomen manteniendo la espalda erguida.' },
      { nombre: 'Pull-over', descripcion: 'Acostado, lleva una mancuerna detrás de la cabeza y regrésala sobre el pecho.' },
      { nombre: 'Face pull', descripcion: 'En polea a la cara, jala la cuerda hacia la frente abriendo los codos.' },
      { nombre: 'Hiperextensiones', descripcion: 'En el banco, baja el torso y súbelo extendiendo la zona lumbar.' },
    ],
  },
  {
    id: 'hombros',
    label: 'Hombros',
    ejercicios: [
      { nombre: 'Press militar', descripcion: 'De pie, empuja la barra desde los hombros hasta arriba de la cabeza.' },
      { nombre: 'Press Arnold', descripcion: 'Sentado, empuja las mancuernas girando las palmas de dentro hacia afuera.' },
      { nombre: 'Elevaciones laterales', descripcion: 'De pie, sube las mancuernas a los lados hasta la altura de los hombros.' },
      { nombre: 'Elevaciones frontales', descripcion: 'De pie, levanta la mancuerna al frente hasta la altura de los ojos.' },
      { nombre: 'Pájaros', descripcion: 'Inclinado, abre los brazos a los lados para trabajar el hombro posterior.' },
      { nombre: 'Encogimientos', descripcion: 'De pie con peso, sube los hombros hacia las orejas y baja con control.' },
    ],
  },
  {
    id: 'biceps',
    label: 'Bíceps',
    ejercicios: [
      { nombre: 'Curl con barra', descripcion: 'De pie, flexiona los codos subiendo la barra sin balancear el torso.' },
      { nombre: 'Curl con mancuernas', descripcion: 'De pie o sentado, sube las mancuernas flexionando los codos, alternando o juntas.' },
      { nombre: 'Curl martillo', descripcion: 'Con agarre neutro (palmas enfrentadas), sube las mancuernas trabajando el antebrazo.' },
      { nombre: 'Curl predicador', descripcion: 'Con el brazo apoyado en el banco, flexiona el codo aislando el bíceps.' },
      { nombre: 'Curl concentrado', descripcion: 'Sentado, apoya el codo en el muslo y sube la mancuerna concentrando la contracción.' },
    ],
  },
  {
    id: 'triceps',
    label: 'Tríceps',
    ejercicios: [
      { nombre: 'Extensión tríceps en polea', descripcion: 'De pie en polea alta, empuja la barra hacia abajo extendiendo los codos.' },
      { nombre: 'Press francés', descripcion: 'Acostado, baja la barra hacia la frente y extiende los codos sin moverlos.' },
      { nombre: 'Fondos entre bancos', descripcion: 'Con las manos en un banco, baja el cuerpo flexionando codos y empuja.' },
      { nombre: 'Extensión sobre cabeza', descripcion: 'Sube una mancuerna tras la cabeza y extiende los codos hacia arriba.' },
      { nombre: 'Patada de tríceps', descripcion: 'Inclinado con el codo alto, extiende el antebrazo hacia atrás.' },
    ],
  },
  {
    id: 'piernas',
    label: 'Piernas',
    ejercicios: [
      { nombre: 'Sentadilla', descripcion: 'Con la barra en la espalda, baja las caderas hasta muslos paralelos y sube.' },
      { nombre: 'Sentadilla frontal', descripcion: 'Con la barra al frente, desciende manteniendo el torso vertical.' },
      { nombre: 'Sentadilla búlgara', descripcion: 'Con un pie atrás elevado, baja la pierna delantera hasta 90 grados.' },
      { nombre: 'Prensa de pierna', descripcion: 'En la máquina, empuja la plataforma extendiendo las piernas sin bloquear rodillas.' },
      { nombre: 'Zancadas', descripcion: 'Da un paso al frente y baja la rodilla trasera casi al suelo, alternando.' },
      { nombre: 'Peso muerto', descripcion: 'Con espalda recta, levanta la barra del suelo extendiendo cadera y rodillas.' },
      { nombre: 'Peso muerto rumano', descripcion: 'Baja la barra pegada a las piernas flexionando la cadera, con rodillas casi rectas.' },
      { nombre: 'Curl femoral', descripcion: 'En la máquina, flexiona las rodillas llevando los talones hacia los glúteos.' },
      { nombre: 'Extensión de cuádriceps', descripcion: 'Sentado en la máquina, extiende las rodillas subiendo el peso con control.' },
      { nombre: 'Elevación de talones', descripcion: 'De pie con peso, eleva los talones contrayendo las pantorrillas.' },
    ],
  },
  {
    id: 'gluteos',
    label: 'Glúteos',
    ejercicios: [
      { nombre: 'Hip thrust', descripcion: 'Con la espalda en el banco, empuja la cadera arriba apretando los glúteos.' },
      { nombre: 'Puente de glúteo', descripcion: 'Acostado, eleva la cadera hasta alinear hombros, cadera y rodillas.' },
      { nombre: 'Patada de glúteo en polea', descripcion: 'En cuadrupedia o de pie, lleva la pierna atrás contrayendo el glúteo.' },
      { nombre: 'Abducción de cadera', descripcion: 'Sentado o de lado, abre las piernas contra resistencia.' },
    ],
  },
  {
    id: 'core',
    label: 'Core',
    ejercicios: [
      { nombre: 'Plancha', descripcion: 'Apoyado en antebrazos, mantén el cuerpo recto sin hundir la cadera.' },
      { nombre: 'Plancha lateral', descripcion: 'De lado sobre un antebrazo, mantén la cadera elevada y alineada.' },
      { nombre: 'Crunch abdominal', descripcion: 'Acostado, eleva los hombros contrayendo el abdomen sin tirar del cuello.' },
      { nombre: 'Elevación de piernas', descripcion: 'Acostado o colgado, sube las piernas rectas controlando la bajada.' },
      { nombre: 'Russian twist', descripcion: 'Sentado con el torso inclinado, gira el tronco de lado a lado.' },
      { nombre: 'Rueda abdominal', descripcion: 'De rodillas, rueda hacia el frente sin arquear la espalda y regresa.' },
      { nombre: 'Escaladores', descripcion: 'En plancha, lleva las rodillas al pecho alternando de forma rápida.' },
    ],
  },
]

/** Vista "solo nombres" de un catálogo vivo (autocompletado, pirámide y rutinas). */
export function aGrupoCatalogo(
  grupos: { grupoId: string; label: string; ejercicios: { nombre: string }[] }[],
): GrupoCatalogo[] {
  return grupos.map((g) => ({ id: g.grupoId, label: g.label, ejercicios: g.ejercicios.map((e) => e.nombre) }))
}

/** Opción de la pirámide de fuerza: un enfoque que abarca uno o más grupos musculares. */
export interface OpcionSplit {
  id: string
  label: string
  grupos: string[]
}

// Niveles fijos de la pirámide: agrupan los grupos musculares BASE por región.
// Un grupo creado por el usuario no encaja aquí (ambigüedad de a qué región
// pertenece); sí aparece en "Full body" y en su propia hoja al final.
const PIRAMIDE_NIVEL_TREN: OpcionSplit[] = [
  { id: 'trenSuperior', label: 'Tren superior', grupos: ['pecho', 'espalda', 'hombros', 'biceps', 'triceps'] },
  { id: 'trenInferior', label: 'Tren inferior', grupos: ['piernas', 'gluteos', 'core'] },
]
const PIRAMIDE_NIVEL_SPLIT: OpcionSplit[] = [
  { id: 'empuje', label: 'Empuje', grupos: ['pecho', 'hombros', 'triceps'] },
  { id: 'jale', label: 'Jale', grupos: ['espalda', 'biceps'] },
  { id: 'pierna', label: 'Pierna', grupos: ['piernas', 'gluteos'] },
]

/**
 * Pirámide de especificidad para fuerza, de lo general a lo específico:
 * full body → tren superior/inferior → empuje/jale/pierna → grupos musculares.
 * "Full body" y la hoja final se calculan de los grupos VIVOS (catálogo editable).
 */
export function piramideFuerza(grupos: GrupoFuerza[]): OpcionSplit[][] {
  return [
    [{ id: 'fullbody', label: 'Full body', grupos: grupos.map((g) => g.grupoId) }],
    PIRAMIDE_NIVEL_TREN,
    PIRAMIDE_NIVEL_SPLIT,
    grupos.map((g) => ({ id: g.grupoId, label: g.label, grupos: [g.grupoId] })),
  ]
}

// Marcas diacríticas combinantes (acentos) que deja `normalize('NFD')`, para quitarlas al hacer un slug.
const DIACRITICOS_RE = /[̀-ͯ]/g

/** Slug estable a partir de una etiqueta, evitando choques con los ids existentes. */
export function slugGrupo(label: string, existentes: string[]): string {
  const base =
    label
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(DIACRITICOS_RE, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-+|-+$)/g, '') || 'grupo'
  let slug = base
  let i = 2
  while (existentes.includes(slug)) slug = `${base}-${i++}`
  return slug
}

/** Semilla inicial de resistencia (solo para sembrar `gruposCardio` la primera vez). */
export const CATALOGO_CARDIO: GrupoCardioSeed[] = [
  {
    id: 'aire',
    label: 'Al aire libre',
    ejercicios: [
      { nombre: 'Carrera', descripcion: 'Ritmo sostenido en zona 2–3, pisada suave y tronco erguido.' },
      { nombre: 'Trote suave', descripcion: 'Ritmo cómodo en el que puedas conversar; ideal para rodajes largos.' },
      { nombre: 'Caminata rápida', descripcion: 'Paso vivo con braceo activo, sin llegar a trotar.' },
      { nombre: 'Ciclismo', descripcion: 'Pedalea con cadencia alta y resistencia moderada, espalda relajada.' },
      { nombre: 'Senderismo', descripcion: 'Camina en terreno natural con desnivel; el ritmo lo marca la pendiente.' },
      { nombre: 'Trail running', descripcion: 'Carrera en montaña o terreno irregular; acorta el paso en las subidas.' },
    ],
  },
  {
    id: 'maquinas',
    label: 'Máquinas',
    ejercicios: [
      { nombre: 'Caminadora', descripcion: 'Camina o corre en cinta sin agarrarte de los pasamanos.' },
      { nombre: 'Caminata inclinada', descripcion: 'Cinta con pendiente y ritmo moderado: quema constante y bajo impacto.' },
      { nombre: 'Elíptica', descripcion: 'Movimiento fluido empujando también con los brazos, sin impacto en rodillas.' },
      { nombre: 'Bicicleta estática', descripcion: 'Ajusta el sillín a la altura de la cadera y pedalea con cadencia constante.' },
      { nombre: 'Escaladora', descripcion: 'Sube escalones a ritmo continuo apoyando el pie completo.' },
      { nombre: 'Remo (máquina)', descripcion: 'Empuja con las piernas, luego tira con la espalda y termina con los brazos.' },
    ],
  },
  {
    id: 'intenso',
    label: 'Alta intensidad',
    ejercicios: [
      { nombre: 'HIIT', descripcion: 'Intervalos cortos al máximo alternados con descansos breves.' },
      { nombre: 'Sprints', descripcion: 'Series a velocidad máxima con recuperación completa entre repeticiones.' },
      { nombre: 'Saltar cuerda', descripcion: 'Saltos bajos con las muñecas girando la cuerda, no los brazos.' },
      { nombre: 'Burpees', descripcion: 'De pie a plancha, flexión, recoge y salta con los brazos arriba.' },
      { nombre: 'Circuito metabólico', descripcion: 'Encadena varios ejercicios sin descanso para mantener el pulso alto.' },
    ],
  },
  {
    id: 'bajoImpacto',
    label: 'Bajo impacto',
    ejercicios: [
      { nombre: 'Natación', descripcion: 'Nada a ritmo constante coordinando la respiración con la brazada.' },
      { nombre: 'Aqua aeróbicos', descripcion: 'Ejercicio en el agua: la resistencia trabaja sin cargar articulaciones.' },
      { nombre: 'Caminata', descripcion: 'Paso tranquilo y continuo; la base del volumen aeróbico.' },
    ],
  },
  {
    id: 'deportes',
    label: 'Deportes',
    ejercicios: [
      { nombre: 'Fútbol', descripcion: 'Carrera intermitente con cambios de ritmo y dirección.' },
      { nombre: 'Básquetbol', descripcion: 'Sprints cortos, saltos y desplazamientos laterales constantes.' },
      { nombre: 'Tenis', descripcion: 'Esfuerzos explosivos con pausas; mucho trabajo de tren inferior.' },
      { nombre: 'Pádel', descripcion: 'Puntos cortos e intensos en pista reducida, con muchos cambios de dirección.' },
      { nombre: 'Boxeo', descripcion: 'Combinaciones y trabajo de piernas manteniendo la guardia alta.' },
      { nombre: 'Baile', descripcion: 'Movimiento continuo al ritmo de la música; cardio sin sensación de entreno.' },
    ],
  },
]

/**
 * Un ejercicio de flexibilidad/movilidad. Además del nombre puede traer datos
 * ricos (descripción, dificultad y series o tiempo). Las posturas de yoga
 * antiguas solo tienen nombre y esos campos quedan vacíos.
 */
// El label de cada grupo coincide con el enfoque guardado en la sesión.
export const CATALOGO_FLEX: GrupoFlexSeed[] = [
  {
    id: 'flexCompleto',
    label: 'Cuerpo completo',
    ejercicios: [
      { nombre: 'Movilidad matutina', descripcion: 'Secuencia suave para despertar el cuerpo y soltar las articulaciones al inicio del día.' },
      { nombre: 'Yoga flow', descripcion: 'Enlaza posturas con la respiración en un flujo continuo de cuerpo completo.' },
      { nombre: 'Saludo al sol', descripcion: 'Serie clásica de yoga que estira y activa todo el cuerpo en secuencia.' },
      { nombre: 'Estiramiento general', descripcion: 'Recorre los principales grupos musculares con estiramientos suaves y sostenidos.' },
      { nombre: 'Guerrero I', descripcion: 'En zancada, sube los brazos y abre el pecho manteniendo la cadera al frente.' },
      { nombre: 'Guerrero II', descripcion: 'En zancada amplia, abre brazos y mirada al frente flexionando la rodilla delantera.' },
      { nombre: 'Triángulo', descripcion: 'Con piernas abiertas, inclina el torso y baja una mano hacia el tobillo.' },
      { nombre: 'Flexión de pie', descripcion: 'De pie, deja caer el torso hacia las piernas soltando cuello y espalda.' },
    ],
  },
  {
    id: 'flexCadera',
    label: 'Cadera y piernas',
    ejercicios: [
      { nombre: 'Apertura de cadera', descripcion: 'Movilidad para liberar la cadera y ganar rango en las piernas.' },
      { nombre: 'Postura de la paloma', descripcion: 'Con una pierna flexionada al frente, baja el torso para abrir el glúteo.' },
      { nombre: 'Mariposa', descripcion: 'Sentado, junta las plantas de los pies y deja caer las rodillas a los lados.' },
      { nombre: 'Estiramiento de isquiotibiales', descripcion: 'Estira la parte trasera del muslo con la rodilla extendida.' },
      { nombre: 'Zancada baja', descripcion: 'Con una rodilla al suelo, adelanta la cadera para estirar el flexor.' },
      { nombre: 'Postura de la guirnalda', descripcion: 'En cuclillas profunda, abre las rodillas con los codos para soltar la cadera.' },
      { nombre: 'Figura 4', descripcion: 'Cruza el tobillo sobre la rodilla contraria y acerca el muslo para estirar el glúteo.' },
      { nombre: 'Estiramiento de aductores', descripcion: 'Abre las piernas y baja el torso para estirar la cara interna del muslo.' },
      { nombre: 'Rana', descripcion: 'En cuadrupedia con rodillas abiertas, mece la cadera hacia atrás.' },
    ],
  },
  {
    id: 'flexEspalda',
    label: 'Espalda y hombros',
    // "Gato-vaca" se movió al grupo "Espalda baja" como "Postura Gato-Vaca" (prioridad al Excel).
    ejercicios: [
      { nombre: 'Perro boca abajo', descripcion: 'En V invertida, empuja las caderas arriba estirando espalda y piernas.' },
      { nombre: 'Torsión espinal', descripcion: 'Sentado o acostado, gira el tronco suavemente para movilizar la columna.' },
      { nombre: 'Postura del niño', descripcion: 'Sentado sobre los talones, estira los brazos al frente relajando la espalda.' },
      { nombre: 'Apertura de pecho', descripcion: 'Lleva los brazos atrás para abrir el pecho y contrarrestar la postura encorvada.' },
      { nombre: 'Esfinge', descripcion: 'Boca abajo apoyado en antebrazos, eleva el pecho extendiendo la zona lumbar.' },
      { nombre: 'Hilo y aguja', descripcion: 'En cuadrupedia, pasa un brazo por debajo del cuerpo para estirar el hombro.' },
      { nombre: 'Estiramiento de dorsales', descripcion: 'Estira los costados llevando los brazos arriba y ligeramente al lado.' },
    ],
  },
  {
    id: 'flexCuello',
    label: 'Cuello y columna',
    // "Retracción de barbilla" se movió al grupo "Cuello" como "Retracciones de Barbilla (Chin Tucks)".
    ejercicios: [
      { nombre: 'Movilidad cervical', descripcion: 'Movimientos lentos de cuello en todas direcciones para soltar tensión.' },
      { nombre: 'Rotaciones de columna', descripcion: 'Gira suavemente la columna segmento a segmento para movilizarla.' },
      { nombre: 'Postura de la cobra', descripcion: 'Boca abajo, eleva el pecho con las manos extendiendo la espalda.' },
      { nombre: 'Inclinación lateral de cuello', descripcion: 'Lleva la oreja hacia el hombro para estirar el costado del cuello.' },
    ],
  },
  {
    id: 'flexPost',
    label: 'Post-entreno',
    ejercicios: [
      { nombre: 'Estiramiento de cuádriceps', descripcion: 'De pie, lleva el talón al glúteo sujetando el pie para estirar el muslo.' },
      { nombre: 'Estiramiento de gemelos', descripcion: 'Apoya las manos en la pared y estira la pantorrilla con la pierna atrás recta.' },
      { nombre: 'Estiramiento de hombros', descripcion: 'Cruza un brazo frente al pecho y acércalo con el otro.' },
      { nombre: 'Foam roller', descripcion: 'Rueda los músculos sobre el rodillo para liberar tensión tras el entreno.' },
      { nombre: 'Estiramiento de tríceps', descripcion: 'Lleva el codo detrás de la cabeza y empuja suavemente con la otra mano.' },
      { nombre: 'Estiramiento de flexores de cadera', descripcion: 'En zancada, adelanta la cadera para estirar el frente del muslo.' },
    ],
  },
  {
    id: 'flexRestaurativo',
    label: 'Yoga restaurativo',
    ejercicios: [
      { nombre: 'Piernas en la pared', descripcion: 'Acostado, sube las piernas apoyadas en la pared para descansar y drenar.' },
      { nombre: 'Savasana', descripcion: 'Acostado boca arriba, relaja todo el cuerpo respirando lento.' },
      { nombre: 'Postura del niño apoyada', descripcion: 'Postura del niño con soporte para relajarse por más tiempo.' },
      { nombre: 'Respiración profunda', descripcion: 'Inhala y exhala lento y hondo para calmar el sistema nervioso.' },
      { nombre: 'Mariposa reclinada', descripcion: 'Acostado con plantas juntas, deja caer las rodillas y relaja la cadera.' },
      { nombre: 'Torsión reclinada', descripcion: 'Acostado, deja caer las rodillas a un lado girando suavemente la columna.' },
    ],
  },
  // --- Movilidad y alineación por zona (importado de ALYN.xlsx) ---
  {
    id: 'flexPies',
    label: 'Pies y tobillos',
    ejercicios: [
      {
        nombre: 'Liberación Miofascial con Pelota',
        descripcion: 'Rueda una pelota dura con presión controlada desde el talón hasta los metatarsos.',
        dificultad: 'Baja',
        tiempo: '1 a 2 minutos por pie (movimiento continuo).',
      },
      {
        nombre: 'Círculos de Tobillo',
        descripcion: 'Eleva una pierna y mueve el tobillo en círculos amplios en ambas direcciones.',
        dificultad: 'Baja',
        tiempo: '10 a 12 repeticiones por cada dirección y tobillo.',
      },
      {
        nombre: 'Recogida de Toalla con Dedos',
        descripcion: 'Intenta arrugar y recoger una toalla en el suelo usando únicamente los dedos de los pies.',
        dificultad: 'Baja',
        tiempo: '10 a 15 repeticiones (arrugar y soltar) por pie.',
      },
      {
        nombre: 'Estiramiento de Dorsiflexión',
        descripcion: 'Frente a una pared, flexiona la rodilla delantera manteniendo el talón pegado al suelo para estirar.',
        dificultad: 'Media',
        tiempo: 'Mantener de 15 a 30 segundos por pierna, hacer de 2 a 4 series.',
      },
      {
        nombre: 'Elevación de Talones Unipodal',
        descripcion: 'De pie sobre un pie, eleva el talón lentamente y bájalo con control excéntrico.',
        dificultad: 'Media',
        tiempo: '10 a 15 repeticiones por pierna.',
      },
    ],
  },
  {
    id: 'flexRodillas',
    label: 'Rodillas',
    ejercicios: [
      {
        nombre: 'Flexión y Extensión en Descarga',
        descripcion: 'Tumbado, flexiona la rodilla llevando el talón al glúteo y luego estira sin despegar el pie.',
        dificultad: 'Baja',
        tiempo: '8 a 10 repeticiones por pierna.',
      },
      {
        nombre: 'Estiramiento Dinámico de Isquiotibiales',
        descripcion: 'Apoya un talón al frente y deja caer el tronco suavemente con la rodilla extendida.',
        dificultad: 'Baja',
        tiempo: 'Mantener 20 segundos por pierna.',
      },
      {
        nombre: 'Sentadilla Isométrica (Wall Squat)',
        descripcion: 'Apoya la espalda en la pared, desciende a 90 grados y sostén verificando que las rodillas no colapsen.',
        dificultad: 'Media',
        tiempo: 'Mantener de 5 a 15 segundos, ponerse de pie y repetir (3 a 5 veces).',
      },
      {
        nombre: 'Equilibrio Unipodal (Single Leg Balance)',
        descripcion: 'Mantente sobre una pierna con la rodilla ligeramente flexionada, sin que colapse hacia adentro.',
        dificultad: 'Media',
        tiempo: 'Mantener de 15 a 60 segundos por pierna (repetir 2 a 3 veces).',
      },
      {
        nombre: 'Sentadillas del Arquero',
        descripcion: 'Piernas separadas, flexiona una rodilla trasladando el peso y manteniendo la otra extendida.',
        dificultad: 'Media / Alta',
        tiempo: '15 repeticiones alternando lados.',
      },
      {
        nombre: 'Estocadas (Lunges)',
        descripcion: 'Da un paso al frente y baja la cadera formando 90 grados con la rodilla delantera.',
        dificultad: 'Alta',
        tiempo: '8 a 12 repeticiones por pierna.',
      },
    ],
  },
  {
    id: 'flexCaderaMov',
    label: 'Cadera (movilidad)',
    ejercicios: [
      {
        nombre: 'Movilidad 90/90',
        descripcion: 'Sentado con piernas a 90 grados, rota el tronco y las piernas de un lado a otro.',
        dificultad: 'Media',
        tiempo: '8 a 12 repeticiones por lado (aprox. 1-2 minutos).',
      },
      {
        nombre: 'El Puente (Glute Bridge)',
        descripcion: 'Boca arriba, eleva la pelvis contrayendo glúteos hasta alinear hombros, caderas y rodillas.',
        dificultad: 'Baja',
        tiempo: '15 repeticiones (mantener arriba 2-3 segundos en cada una).',
      },
      {
        nombre: 'Estiramiento de Flexores en Estocada',
        descripcion: 'Una rodilla al suelo, adelanta la pelvis con espalda recta para estirar el psoas.',
        dificultad: 'Baja',
        tiempo: 'Mantener 20 segundos por pierna.',
      },
      {
        nombre: 'Abducción Lateral de Cadera',
        descripcion: 'Tumbado de lado, eleva la pierna superior manteniendo la pelvis estable.',
        dificultad: 'Media',
        tiempo: '10 a 15 repeticiones por lado y sostener unos segundos arriba.',
      },
      {
        nombre: 'Sentadilla Profunda con Apertura',
        descripcion: 'En cuclillas, empuja las rodillas hacia afuera con los codos para abrir cadera.',
        dificultad: 'Alta',
        tiempo: '15 repeticiones de apertura.',
      },
      {
        nombre: 'Balanceo Dinámico de Piernas',
        descripcion: 'De pie, balancea una pierna hacia adelante, atrás y a los lados como un péndulo.',
        dificultad: 'Baja',
        tiempo: '8 a 10 repeticiones por pierna.',
      },
    ],
  },
  {
    id: 'flexEspaldaBaja',
    label: 'Espalda baja',
    ejercicios: [
      {
        nombre: 'Postura Gato-Vaca',
        descripcion: 'En cuadrupedia, alterna entre arquear la espalda al techo y llevar el abdomen al suelo.',
        dificultad: 'Baja',
        tiempo: '1 minuto continuo (o 10 a 15 respiraciones).',
      },
      {
        nombre: 'Torsiones Lumbares Suaves',
        descripcion: 'Boca arriba, deja caer ambas rodillas juntas hacia un lado y luego al otro.',
        dificultad: 'Baja',
        tiempo: '10 a 15 repeticiones por lado.',
      },
      {
        nombre: 'Pointer (Bird-Dog)',
        descripcion: 'En cuadrupedia, extiende pierna y brazo contrarios manteniendo la lumbar plana.',
        dificultad: 'Media',
        tiempo: 'Mantener 30 segundos de un lado y cambiar al otro.',
      },
      {
        nombre: 'Plancha Frontal (Isométricos)',
        descripcion: 'Mantén posición de tabla apoyado en antebrazos formando una línea recta.',
        dificultad: 'Media / Alta',
        tiempo: 'Mantener de 15 a 60 segundos según capacidad.',
      },
      {
        nombre: 'Roll Down (Curl Jefferson)',
        descripcion: 'De pie, flexiona la columna lentamente hacia abajo vértebra a vértebra.',
        dificultad: 'Media',
        tiempo: '15 repeticiones de forma lenta.',
      },
      {
        nombre: 'Estiramiento Lumbar (Boca abajo)',
        descripcion: 'Tumbado boca abajo, levanta cadera y luego desciende extendiendo espalda.',
        dificultad: 'Baja',
        tiempo: '1 minuto continuo.',
      },
    ],
  },
  {
    id: 'flexEspaldaAlta',
    label: 'Espalda alta',
    ejercicios: [
      {
        nombre: 'Rotación Torácica',
        descripcion: 'En cuadrupedia, levanta un brazo por el lateral y sigue la mano con la mirada.',
        dificultad: 'Baja',
        tiempo: '30 segundos por lado.',
      },
      {
        nombre: 'Retracción Escapular',
        descripcion: 'Junta los omóplatos hacia atrás y hacia abajo manteniendo postura erguida.',
        dificultad: 'Baja',
        tiempo: '8 a 10 repeticiones, manteniendo la contracción 5 a 10 segundos cada vez.',
      },
      {
        nombre: 'Ángeles de Pared (Wall Angels)',
        descripcion: 'Espalda en pared, desliza brazos arriba y abajo manteniendo codos en contacto.',
        dificultad: 'Media',
        tiempo: '10 a 15 repeticiones lentas.',
      },
      {
        nombre: 'Lunge con Apertura de Pectoral',
        descripcion: 'En zancada, entrelaza manos tras la nuca y abre codos hacia atrás.',
        dificultad: 'Media',
        tiempo: '15 repeticiones a cada lado.',
      },
      {
        nombre: 'Estiramiento Dorsal en Pared',
        descripcion: 'Apoya manos en pared y deja caer el tronco con rodillas estiradas.',
        dificultad: 'Baja',
        tiempo: 'Mantener 20 segundos.',
      },
      {
        nombre: 'El Gato y la Mesa',
        descripcion: 'En cuadrupedia, arquea espalda y luego baja el pecho.',
        dificultad: 'Baja',
        tiempo: '15 repeticiones coordinadas con la respiración.',
      },
    ],
  },
  {
    id: 'flexHombros',
    label: 'Hombros',
    ejercicios: [
      {
        nombre: 'Círculos de Hombros',
        descripcion: 'Movimientos circulares amplios, priorizando el recorrido hacia atrás y abajo.',
        dificultad: 'Baja',
        tiempo: '8 a 10 repeticiones (hacia adelante y hacia atrás).',
      },
      {
        nombre: 'Estiramiento de Pecho/Pectoral',
        descripcion: 'Junta manos detrás de la espalda y abre el pecho sin forzar cuello.',
        dificultad: 'Baja',
        tiempo: 'Mantener de 15 a 20 segundos.',
      },
      {
        nombre: 'Dislocaciones con Goma (o Palo)',
        descripcion: 'Pasa una banda por encima de la cabeza hacia la espalda con codos estirados.',
        dificultad: 'Media',
        tiempo: '10 a 15 repeticiones.',
      },
      {
        nombre: 'Rotación Externa con Banda',
        descripcion: 'Codos a 90 grados pegados al cuerpo, rota manos hacia afuera con resistencia.',
        dificultad: 'Media',
        tiempo: '8 a 12 repeticiones.',
      },
      {
        nombre: 'Thread the Needle (Enhebrar aguja)',
        descripcion: 'En cuadrupedia, cruza un brazo por debajo del cuerpo apoyando el hombro en el suelo.',
        dificultad: 'Media',
        tiempo: 'Mantener de 15 a 30 segundos por lado (2-3 series).',
      },
    ],
  },
  {
    id: 'flexCuelloMov',
    label: 'Cuello (movilidad)',
    ejercicios: [
      {
        nombre: 'Rotaciones y Medios Círculos',
        descripcion: 'Barbilla al pecho, dibuja círculos amplios y muy lentos sin forzar dolor.',
        dificultad: 'Baja',
        tiempo: '8 a 10 repeticiones por dirección.',
      },
      {
        nombre: 'Estiramiento de Trapecio Superior',
        descripcion: 'Inclina suavemente la cabeza llevando la oreja hacia el hombro contrario.',
        dificultad: 'Baja',
        tiempo: 'Mantener de 15 a 30 segundos por lado.',
      },
      {
        nombre: 'Rotaciones Cervicales con Nodding',
        descripcion: 'Gira la cabeza y realiza pequeños movimientos afirmando ("sí").',
        dificultad: 'Baja',
        tiempo: '8 a 12 repeticiones por lado.',
      },
      {
        nombre: 'Retracciones de Barbilla (Chin Tucks)',
        descripcion: 'Lleva la barbilla recta hacia atrás haciendo "papada" para alinear cuello.',
        dificultad: 'Baja',
        tiempo: '10 a 15 repeticiones, manteniendo la postura de 5 a 10 segundos.',
      },
      {
        nombre: 'Isométricos Cervicales',
        descripcion: 'Empuja la cabeza contra tu mano resistiendo el movimiento para no flexionar.',
        dificultad: 'Media',
        tiempo: '8 a 12 repeticiones (manteniendo tensión 5-10 seg).',
      },
    ],
  },
  {
    id: 'flexMunecas',
    label: 'Muñecas y manos',
    ejercicios: [
      {
        nombre: 'Flexión y Extensión de Muñeca',
        descripcion: 'Brazos estirados, flexiona muñeca hacia el techo y luego hacia el suelo.',
        dificultad: 'Baja',
        tiempo: '10 a 12 repeticiones.',
      },
      {
        nombre: 'Círculos de Muñecas',
        descripcion: 'Gira ambas muñecas haciendo círculos en ambas direcciones.',
        dificultad: 'Baja',
        tiempo: '10 a 15 círculos por dirección.',
      },
      {
        nombre: 'Estiramiento de Flexores',
        descripcion: 'Palma hacia arriba, con la otra mano empuja dedos hacia el cuerpo.',
        dificultad: 'Baja',
        tiempo: 'Mantener de 15 a 30 segundos.',
      },
      {
        nombre: 'Agarre Activo y Pasivo',
        descripcion: 'Cierra los puños con mucha fuerza y luego ábrelos relajando al máximo.',
        dificultad: 'Baja',
        tiempo: '10 a 15 repeticiones.',
      },
      {
        nombre: 'Plancha de Muñecas',
        descripcion: 'En posición de plancha o rodillas, elévate para apoyar solo las yemas y baja.',
        dificultad: 'Alta',
        tiempo: '8 a 12 repeticiones.',
      },
    ],
  },
]

