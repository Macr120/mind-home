/** Tema leaf en el índice enciclopédico. */
export interface TemaIndice {
  id: string
  titulo: string
  descripcion: string
}

export interface RamaIndice {
  id: string
  titulo: string
  temas: TemaIndice[]
}

export interface PilarConocimiento {
  id: string
  titulo: string
  icon: string
  descripcion: string
  ramas: RamaIndice[]
}

/** Diez pilares del conocimiento — mapa temático de la enciclopedia. */
export const PILARES: PilarConocimiento[] = [
  {
    id: 'filosofia',
    titulo: 'Filosofía y pensamiento',
    icon: '🧠',
    descripcion: 'Preguntas fundamentales sobre la realidad, el conocimiento, la mente y la conducta.',
    ramas: [
      {
        id: 'fil-metafisica',
        titulo: 'Metafísica y ontología',
        temas: [
          { id: 'fil-ser', titulo: 'Ser y existencia', descripcion: 'Qué significa que algo exista.' },
          { id: 'fil-mente', titulo: 'Mente y conciencia', descripcion: 'Problema mente-cuerpo y fenomenología.' },
          { id: 'fil-libre', titulo: 'Libertad y determinismo', descripcion: '¿Somos libres o todo está causado?' },
        ],
      },
      {
        id: 'fil-epistemologia',
        titulo: 'Epistemología',
        temas: [
          { id: 'fil-conocimiento', titulo: 'Teoría del conocimiento', descripcion: 'Justificación, verdad y creencia.' },
          { id: 'fil-ciencia-fil', titulo: 'Filosofía de la ciencia', descripcion: 'Método, paradigmas y demarcación.' },
          { id: 'fil-escepticismo', titulo: 'Escepticismo', descripcion: 'Límites de lo que podemos saber.' },
        ],
      },
      {
        id: 'fil-etica',
        titulo: 'Ética y política filosófica',
        temas: [
          { id: 'fil-moral', titulo: 'Teorías morales', descripcion: 'Deontología, utilitarismo, virtud.' },
          { id: 'fil-justicia', titulo: 'Justicia social', descripcion: 'Equidad, derechos y bien común.' },
          { id: 'fil-bioetica', titulo: 'Bioética', descripcion: 'Vida, medicina y tecnología aplicada.' },
        ],
      },
    ],
  },
  {
    id: 'matematicas',
    titulo: 'Matemáticas y lógica',
    icon: '🔢',
    descripcion: 'Estructuras abstractas, razonamiento formal y modelos cuantitativos.',
    ramas: [
      {
        id: 'mat-puras',
        titulo: 'Matemáticas puras',
        temas: [
          { id: 'mat-algebra', titulo: 'Álgebra', descripcion: 'Estructuras, ecuaciones y simetrías.' },
          { id: 'mat-analisis', titulo: 'Análisis', descripcion: 'Límites, continuidad y cálculo.' },
          { id: 'mat-geometria', titulo: 'Geometría y topología', descripcion: 'Formas, espacios y transformaciones.' },
        ],
      },
      {
        id: 'mat-aplicadas',
        titulo: 'Matemáticas aplicadas',
        temas: [
          { id: 'mat-prob', titulo: 'Probabilidad', descripcion: 'Incertidumbre y eventos aleatorios.' },
          { id: 'mat-stats', titulo: 'Estadística', descripcion: 'Datos, inferencia y modelos.' },
          { id: 'mat-discreta', titulo: 'Matemática discreta', descripcion: 'Combinatoria, grafos y recursión.' },
        ],
      },
      {
        id: 'mat-logica',
        titulo: 'Lógica',
        temas: [
          { id: 'mat-log-formal', titulo: 'Lógica formal', descripcion: 'Proposiciones, predicados y demostración.' },
          { id: 'mat-log-comput', titulo: 'Lógica computacional', descripcion: 'Algoritmos, complejidad y verificación.' },
        ],
      },
    ],
  },
  {
    id: 'naturales',
    titulo: 'Ciencias naturales',
    icon: '⚛️',
    descripcion: 'Leyes del universo físico, la materia, la energía y los sistemas vivos.',
    ramas: [
      {
        id: 'nat-fisica',
        titulo: 'Física',
        temas: [
          { id: 'nat-mecanica', titulo: 'Mecánica clásica', descripcion: 'Movimiento, fuerzas y energía.' },
          { id: 'nat-cuantica', titulo: 'Física cuántica', descripcion: 'Partículas, ondas y probabilidad.' },
          { id: 'nat-relatividad', titulo: 'Relatividad', descripcion: 'Espacio-tiempo y cosmología.' },
          { id: 'nat-termodinamica', titulo: 'Termodinámica', descripcion: 'Calor, entropía y equilibrio.' },
        ],
      },
      {
        id: 'nat-quimica',
        titulo: 'Química',
        temas: [
          { id: 'nat-org', titulo: 'Química orgánica', descripcion: 'Carbono, biomoléculas y reacciones.' },
          { id: 'nat-inorg', titulo: 'Química inorgánica', descripcion: 'Elementos, enlaces y materiales.' },
          { id: 'nat-fisicoquim', titulo: 'Fisicoquímica', descripcion: 'Energía en reacciones y equilibrio.' },
        ],
      },
      {
        id: 'nat-biologia',
        titulo: 'Biología',
        temas: [
          { id: 'nat-celula', titulo: 'Biología celular', descripcion: 'Célula, metabolismo y señalización.' },
          { id: 'nat-genetica', titulo: 'Genética y evolución', descripcion: 'ADN, selección y filogenia.' },
          { id: 'nat-ecologia', titulo: 'Ecología', descripcion: 'Ecosistemas, biodiversidad y ciclos.' },
        ],
      },
    ],
  },
  {
    id: 'tierra',
    titulo: 'Ciencias de la Tierra',
    icon: '🌍',
    descripcion: 'Planeta, atmósfera, océanos y procesos geológicos.',
    ramas: [
      {
        id: 'tie-geologia',
        titulo: 'Geología y geofísica',
        temas: [
          { id: 'tie-placas', titulo: 'Tectónica de placas', descripcion: 'Formación del relieve y sismos.' },
          { id: 'tie-minerales', titulo: 'Mineralogía', descripcion: 'Rocas, minerales y recursos.' },
          { id: 'tie-paleont', titulo: 'Paleontología', descripcion: 'Fósiles y historia de la vida.' },
        ],
      },
      {
        id: 'tie-clima',
        titulo: 'Clima y atmósfera',
        temas: [
          { id: 'tie-meteorologia', titulo: 'Meteorología', descripcion: 'Tiempo, presión y precipitación.' },
          { id: 'tie-climatologia', titulo: 'Climatología', descripcion: 'Patrones a largo plazo y cambio climático.' },
          { id: 'tie-oceanos', titulo: 'Oceanografía', descripcion: 'Corrientes, mares y costas.' },
        ],
      },
      {
        id: 'tie-espacial',
        titulo: 'Geografía y espacio',
        temas: [
          { id: 'tie-cartografia', titulo: 'Cartografía', descripcion: 'Mapas, coordenadas y SIG.' },
          { id: 'tie-geomorf', titulo: 'Geomorfología', descripcion: 'Paisajes y erosión.' },
        ],
      },
    ],
  },
  {
    id: 'sociales',
    titulo: 'Ciencias sociales',
    icon: '👥',
    descripcion: 'Sociedades, economías, instituciones y comportamiento humano colectivo.',
    ramas: [
      {
        id: 'soc-sociologia',
        titulo: 'Sociología y antropología',
        temas: [
          { id: 'soc-estructura', titulo: 'Estructura social', descripcion: 'Clases, redes y desigualdad.' },
          { id: 'soc-cultura', titulo: 'Antropología cultural', descripcion: 'Rituales, identidad y símbolos.' },
          { id: 'soc-urbano', titulo: 'Estudios urbanos', descripcion: 'Ciudad, migración y territorio.' },
        ],
      },
      {
        id: 'soc-economia',
        titulo: 'Economía',
        temas: [
          { id: 'soc-micro', titulo: 'Microeconomía', descripcion: 'Oferta, demanda y decisiones.' },
          { id: 'soc-macro', titulo: 'Macroeconomía', descripcion: 'PIB, inflación y política fiscal.' },
          { id: 'soc-comercio', titulo: 'Comercio internacional', descripcion: 'Globalización y cadenas de valor.' },
        ],
      },
      {
        id: 'soc-politica',
        titulo: 'Ciencia política',
        temas: [
          { id: 'soc-estado', titulo: 'Estado y gobierno', descripcion: 'Poder, leyes y democracia.' },
          { id: 'soc-derechos', titulo: 'Derechos humanos', descripcion: 'Libertades, justicia y ciudadanía.' },
          { id: 'soc-relaciones', titulo: 'Relaciones internacionales', descripcion: 'Diplomacia, conflictos y cooperación.' },
        ],
      },
    ],
  },
  {
    id: 'psicologia',
    titulo: 'Psicología y mente humana',
    icon: '🧩',
    descripcion: 'Cognición, emoción, desarrollo y bienestar psicológico.',
    ramas: [
      {
        id: 'psi-cognitiva',
        titulo: 'Psicología cognitiva',
        temas: [
          { id: 'psi-percepcion', titulo: 'Percepción y atención', descripcion: 'Cómo procesamos estímulos.' },
          { id: 'psi-memoria', titulo: 'Memoria y aprendizaje', descripcion: 'Codificación, recuerdo y olvido.' },
          { id: 'psi-lenguaje-psi', titulo: 'Psicolingüística', descripcion: 'Adquisición y procesamiento del lenguaje.' },
        ],
      },
      {
        id: 'psi-desarrollo',
        titulo: 'Desarrollo y personalidad',
        temas: [
          { id: 'psi-infancia', titulo: 'Desarrollo infantil', descripcion: 'Hitos cognitivos y sociales.' },
          { id: 'psi-personalidad', titulo: 'Personalidad', descripcion: 'Rasgos, temperamentos y modelos.' },
          { id: 'psi-social-psi', titulo: 'Psicología social', descripcion: 'Grupos, actitudes y conformidad.' },
        ],
      },
      {
        id: 'psi-clinica',
        titulo: 'Salud mental',
        temas: [
          { id: 'psi-clinica-gen', titulo: 'Psicología clínica', descripcion: 'Trastornos, diagnóstico y terapia.' },
          { id: 'psi-neuropsi', titulo: 'Neuropsicología', descripcion: 'Cerebro, lesión y rehabilitación.' },
        ],
      },
    ],
  },
  {
    id: 'humanidades',
    titulo: 'Humanidades e historia',
    icon: '📜',
    descripcion: 'Experiencia humana en el tiempo, el pensamiento y el patrimonio cultural.',
    ramas: [
      {
        id: 'hum-historia',
        titulo: 'Historia',
        temas: [
          { id: 'hum-antigua', titulo: 'Historia antigua', descripcion: 'Civilizaciones clásicas y orígenes.' },
          { id: 'hum-moderna', titulo: 'Edad moderna y contemporánea', descripcion: 'Revoluciones, estados y globalización.' },
          { id: 'hum-metodo', titulo: 'Historiografía', descripcion: 'Fuentes, interpretación y debate.' },
        ],
      },
      {
        id: 'hum-religion',
        titulo: 'Religión y mitología',
        temas: [
          { id: 'hum-comparada', titulo: 'Religiones comparadas', descripcion: 'Tradiciones, textos y prácticas.' },
          { id: 'hum-mito', titulo: 'Mitología', descripcion: 'Narrativas fundacionales y arquetipos.' },
        ],
      },
      {
        id: 'hum-patrimonio',
        titulo: 'Patrimonio y estudios culturales',
        temas: [
          { id: 'hum-museos', titulo: 'Patrimonio material', descripcion: 'Museos, conservación y artefactos.' },
          { id: 'hum-memoria', titulo: 'Memoria colectiva', descripcion: 'Testimonio, archivo y olvido.' },
        ],
      },
    ],
  },
  {
    id: 'lengua',
    titulo: 'Lengua y literatura',
    icon: '📖',
    descripcion: 'Comunicación, textos, análisis lingüístico y tradición escrita.',
    ramas: [
      {
        id: 'len-linguistica',
        titulo: 'Lingüística',
        temas: [
          { id: 'len-fonetica', titulo: 'Fonética y fonología', descripcion: 'Sonidos y sistemas fonológicos.' },
          { id: 'len-sintaxis', titulo: 'Sintaxis y morfología', descripcion: 'Estructura de oraciones y palabras.' },
          { id: 'len-semantica', titulo: 'Semántica y pragmática', descripcion: 'Significado en contexto.' },
        ],
      },
      {
        id: 'len-literatura',
        titulo: 'Literatura',
        temas: [
          { id: 'len-generos', titulo: 'Géneros literarios', descripcion: 'Novela, poesía, teatro y ensayo.' },
          { id: 'len-teoria-lit', titulo: 'Teoría literaria', descripcion: 'Crítica, narratología y canones.' },
          { id: 'len-mundo', titulo: 'Literaturas del mundo', descripcion: 'Tradiciones regionales y traducción.' },
        ],
      },
      {
        id: 'len-comunicacion',
        titulo: 'Comunicación',
        temas: [
          { id: 'len-periodismo', titulo: 'Periodismo', descripcion: 'Noticia, verificación y opinión.' },
          { id: 'len-retorica', titulo: 'Retórica y argumentación', descripcion: 'Persuasión y debate público.' },
        ],
      },
    ],
  },
  {
    id: 'artes',
    titulo: 'Artes y expresión',
    icon: '🎨',
    descripcion: 'Creación estética, percepción artística y cultura visual y sonora.',
    ramas: [
      {
        id: 'art-visuales',
        titulo: 'Artes visuales',
        temas: [
          { id: 'art-pintura', titulo: 'Pintura y dibujo', descripcion: 'Técnicas, composición y color.' },
          { id: 'art-escultura', titulo: 'Escultura y arquitectura', descripcion: 'Espacio, forma y diseño.' },
          { id: 'art-fotografia', titulo: 'Fotografía', descripcion: 'Luz, encuadre y narrativa visual.' },
        ],
      },
      {
        id: 'art-musica',
        titulo: 'Música',
        temas: [
          { id: 'art-teoria-mus', titulo: 'Teoría musical', descripcion: 'Armonía, ritmo y notación.' },
          { id: 'art-historia-mus', titulo: 'Historia de la música', descripcion: 'Estilos, épocas y compositores.' },
        ],
      },
      {
        id: 'art-escenicas',
        titulo: 'Artes escénicas y cine',
        temas: [
          { id: 'art-teatro', titulo: 'Teatro y performance', descripcion: 'Dramaturgia, actuación y escena.' },
          { id: 'art-cine', titulo: 'Cine y audiovisual', descripcion: 'Guion, montaje y lenguaje fílmico.' },
        ],
      },
    ],
  },
  {
    id: 'tecnologia',
    titulo: 'Tecnología e ingeniería',
    icon: '⚙️',
    descripcion: 'Aplicación del conocimiento para resolver problemas y transformar el mundo.',
    ramas: [
      {
        id: 'tec-informatica',
        titulo: 'Informática',
        temas: [
          { id: 'tec-algoritmos', titulo: 'Algoritmos y estructuras', descripcion: 'Eficiencia, datos y diseño.' },
          { id: 'tec-ia', titulo: 'Inteligencia artificial', descripcion: 'Aprendizaje automático y ética de IA.' },
          { id: 'tec-redes', titulo: 'Redes y sistemas', descripcion: 'Internet, seguridad y distribución.' },
        ],
      },
      {
        id: 'tec-ingenieria',
        titulo: 'Ingeniería',
        temas: [
          { id: 'tec-mecanica', titulo: 'Ingeniería mecánica', descripcion: 'Máquinas, materiales y manufactura.' },
          { id: 'tec-electrica', titulo: 'Ingeniería eléctrica', descripcion: 'Circuitos, energía y electrónica.' },
          { id: 'tec-civil', titulo: 'Ingeniería civil', descripcion: 'Infraestructura, hidráulica y estructuras.' },
        ],
      },
      {
        id: 'tec-energia',
        titulo: 'Energía y sostenibilidad',
        temas: [
          { id: 'tec-renovables', titulo: 'Energías renovables', descripcion: 'Solar, eólica e hidrógeno.' },
          { id: 'tec-ambiental', titulo: 'Ingeniería ambiental', descripcion: 'Residuos, agua y huella ecológica.' },
        ],
      },
    ],
  },
  {
    id: 'salud',
    titulo: 'Salud y medicina',
    icon: '🏥',
    descripcion: 'Cuerpo humano, enfermedad, prevención y sistemas de atención.',
    ramas: [
      {
        id: 'sal-anatomia',
        titulo: 'Anatomía y fisiología',
        temas: [
          { id: 'sal-cuerpo', titulo: 'Sistemas del cuerpo', descripcion: 'Órganos, homeostasis y integración.' },
          { id: 'sal-neuro', titulo: 'Neurociencia médica', descripcion: 'Cerebro, sensores y movimiento.' },
        ],
      },
      {
        id: 'sal-clinica',
        titulo: 'Medicina clínica',
        temas: [
          { id: 'sal-patologia', titulo: 'Patología', descripcion: 'Enfermedad, diagnóstico y causas.' },
          { id: 'sal-farmacologia', titulo: 'Farmacología', descripcion: 'Fármacos, dosis y efectos.' },
          { id: 'sal-salud-pub', titulo: 'Salud pública', descripcion: 'Epidemiología, vacunas y políticas.' },
        ],
      },
      {
        id: 'sal-bienestar',
        titulo: 'Bienestar y nutrición',
        temas: [
          { id: 'sal-nutricion', titulo: 'Nutrición clínica', descripcion: 'Dietas, metabolismo y micronutrientes.' },
          { id: 'sal-prevencion', titulo: 'Medicina preventiva', descripcion: 'Hábitos, cribado y longevidad.' },
        ],
      },
    ],
  },
]

export function contarIndice() {
  let ramas = 0
  let temas = 0
  for (const p of PILARES) {
    ramas += p.ramas.length
    for (const r of p.ramas) temas += r.temas.length
  }
  return { pilares: PILARES.length, ramas, temas }
}

export function todosLosTemas() {
  return PILARES.flatMap((p) =>
    p.ramas.flatMap((r) =>
      r.temas.map((t) => ({ ...t, pilarId: p.id, pilarTitulo: p.titulo, ramaId: r.id })),
    ),
  )
}

export function getPilar(id: string) {
  return PILARES.find((p) => p.id === id)
}
