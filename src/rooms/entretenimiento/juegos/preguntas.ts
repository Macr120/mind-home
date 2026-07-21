// Bancos de preguntas de los mazos de cartas. El contenido es en español
// (es contenido del juego, no interfaz); los rótulos de la UI sí pasan por i18n.

export interface Pregunta {
  texto: string
  grupo: string
}

export interface GrupoPregunta {
  id: string
  label: string
  color: string
}

// ───────────────────────── Para conocerse (100) ─────────────────────────

export const GRUPOS_CONOCERSE: GrupoPregunta[] = [
  { id: 'rompehielos', label: 'Rompehielos', color: '#4ade80' },
  { id: 'personal', label: 'Personal', color: '#60a5fa' },
  { id: 'profundo', label: 'Profundo', color: '#c084fc' },
]

const ROMPEHIELOS = [
  '¿Cuál es la comida que nunca te cansa?',
  '¿Eres más de mañanas o de noches?',
  '¿Qué canción pones cuando nadie te escucha?',
  '¿Cuál era tu caricatura favorita de niño?',
  '¿Playa o montaña? ¿Por qué?',
  '¿Qué app abres primero al despertar?',
  '¿Cuál es el mejor regalo que te han dado?',
  '¿Qué comida no probarías jamás?',
  '¿Tienes algún talento inútil?',
  '¿Qué serie has visto más de una vez?',
  '¿Cuál es tu forma favorita de perder el tiempo?',
  '¿Qué superpoder elegirías si solo durara una hora al día?',
  '¿Cuál es tu olor favorito?',
  '¿Qué emoji usas demasiado?',
  '¿Cómo es tu día perfecto de descanso?',
  '¿Qué famoso te cae bien sin conocerlo?',
  '¿Cuál es tu peor hábito con el teléfono?',
  '¿Qué coleccionabas de niño?',
  '¿Cuál es tu clima favorito?',
  '¿Qué platillo te sale mejor en la cocina?',
  '¿Cuál es la película que siempre recomiendas?',
  '¿Qué lugar de tu ciudad te encanta?',
  '¿Eres de planear o de improvisar?',
  '¿Qué idioma te gustaría hablar de la nada?',
  '¿Cuál es tu postre debilidad?',
  '¿Qué apodo te han puesto?',
  '¿Cuál fue tu primer trabajo o encargo?',
  '¿Qué animal serías y por qué?',
  '¿Café, té o ninguno?',
  '¿Qué juego te ha atrapado más horas?',
  '¿Cuál es tu sonido favorito?',
  '¿Qué compra reciente te hizo feliz?',
  'Para una buena historia: ¿libro, película o serie?',
]

const PERSONAL = [
  '¿Qué te hace perder la noción del tiempo?',
  '¿De qué logro te sientes más orgulloso?',
  '¿Qué tradición familiar quieres conservar?',
  '¿Quién te conoce mejor que nadie?',
  '¿Qué viaje te cambió aunque fuera un poco?',
  '¿Qué te costaba mucho antes y hoy se te da fácil?',
  '¿Cómo te describirían tus amigos en tres palabras?',
  '¿Qué consejo te dieron y todavía sigues?',
  '¿Qué hábito te gustaría construir este año?',
  '¿Cuál ha sido tu mejor época hasta ahora?',
  '¿Qué te saca de quicio aunque sea una tontería?',
  '¿A quién admiras de tu propia familia?',
  '¿Qué te reconforta cuando tienes un mal día?',
  '¿Qué decisión difícil resultó ser un acierto?',
  '¿Qué te da pena admitir que te gusta?',
  '¿En qué gastas dinero sin culpa?',
  '¿Qué materia le faltó a tu escuela?',
  '¿Qué amistad te ha durado más y por qué funciona?',
  '¿En qué eres distinto al resto de tu familia?',
  '¿Cuándo fue la última vez que lloraste de risa?',
  '¿Qué rutina pequeña te mejora mucho el día?',
  '¿Qué te hubiera gustado aprender de niño?',
  '¿Cómo celebras tus logros?',
  '¿Qué etapa de tu vida repetirías con gusto?',
  '¿Qué te pone nervioso aunque lo disimules?',
  '¿Cuál es el mejor cumplido que te han hecho?',
  '¿Qué proyecto pendiente te ilusiona empezar?',
  '¿Qué te enseñó tu peor jefe o maestro?',
  '¿Dónde te imaginas viviendo de viejo?',
  '¿Qué rasgo tuyo heredaste clarito de tus papás?',
  '¿Qué te motiva a levantarte los lunes?',
  '¿Qué manía tienes que poca gente nota?',
  '¿Qué fue lo último que aprendiste por puro gusto?',
]

const PROFUNDO = [
  '¿Qué miedo te gustaría soltar de una vez?',
  '¿Qué significa para ti una vida bien vivida?',
  '¿Qué le dirías a tu yo de hace diez años?',
  '¿Qué te cuesta perdonar?',
  '¿Cuándo fue la última vez que cambiaste de opinión en algo importante?',
  '¿Qué herencia no material quieres dejar?',
  '¿En qué momento te has sentido más orgulloso de ser tú?',
  '¿Qué conversación pendiente traes contigo?',
  '¿Qué te da paz de verdad?',
  '¿Qué parte de tu historia te costó aceptar?',
  '¿A qué dices que sí por compromiso queriendo decir que no?',
  '¿Qué crees del amor que la mayoría no cree?',
  '¿Qué pregunta te da miedo responderte?',
  '¿Quién te hace falta y qué le dirías?',
  '¿Qué máscara usas más seguido?',
  '¿Qué te gustaría que dijeran de ti cuando no estés?',
  '¿Cuál ha sido tu fracaso más útil?',
  '¿Qué necesitas escuchar más seguido?',
  '¿Qué sueño estás posponiendo y qué lo detiene?',
  '¿Cuándo te has sentido realmente vulnerable?',
  '¿Qué relación de tu vida merece más cuidado ahora mismo?',
  '¿Qué te enseñó la persona que más te ha lastimado?',
  '¿Qué significa "éxito" para ti hoy, comparado con hace años?',
  '¿Qué agradeces que casi nunca dices en voz alta?',
  '¿Qué límite te costó aprender a poner?',
  '¿Qué versión de ti quieres ser en cinco años?',
  '¿Qué te reconcilia con el mundo cuando todo pesa?',
  '¿Qué historia tuya contarías para que alguien te conociera de verdad?',
  '¿Qué duelo cargas todavía?',
  '¿Cuándo sentiste que estabas justo donde debías estar?',
  '¿Qué prejuicio tuyo te ha tocado desmontar?',
  '¿Qué promesa te has hecho a ti mismo?',
  '¿Qué te haría sentir en paz con tu pasado?',
  'Si hoy fuera tu último día normal, ¿qué harías diferente?',
]

export const PREGUNTAS_CONOCERSE: Pregunta[] = [
  ...ROMPEHIELOS.map((texto) => ({ texto, grupo: 'rompehielos' })),
  ...PERSONAL.map((texto) => ({ texto, grupo: 'personal' })),
  ...PROFUNDO.map((texto) => ({ texto, grupo: 'profundo' })),
]

// ───────────────────────── Debates (100) ─────────────────────────

export const GRUPOS_DEBATES: GrupoPregunta[] = [
  { id: 'sociedad', label: 'Sociedad', color: '#60a5fa' },
  { id: 'etica', label: 'Ética', color: '#c084fc' },
  { id: 'tecnologia', label: 'Tecnología', color: '#22d3ee' },
  { id: 'cultura', label: 'Cultura', color: '#fbbf24' },
  { id: 'futuro', label: 'Futuro', color: '#4ade80' },
]

const SOCIEDAD = [
  '¿Debería ser obligatorio votar?',
  '¿Las redes sociales han hecho más daño que bien?',
  '¿Debería existir la semana laboral de 4 días para todos?',
  '¿El dinero en efectivo debería desaparecer?',
  '¿Está bien que los famosos opinen de política?',
  '¿Deberían los niños tener celular antes de los 12?',
  '¿La fama es más una carga que un premio?',
  '¿Deberían prohibirse los autos en el centro de las ciudades?',
  '¿La renta básica universal es buena idea?',
  '¿Deberían las escuelas eliminar la tarea?',
  '¿Hoy conviene más rentar que comprar casa?',
  '¿El turismo masivo arruina los lugares que toca?',
  '¿Deberían pagar más impuestos los que más ganan, aunque ya paguen mucho?',
  '¿La propina debería desaparecer y pagarse sueldos justos?',
  '¿Deberían ser gratuitas todas las universidades públicas?',
  '¿Debería ser un derecho trabajar remoto si el puesto lo permite?',
  '¿Los zoológicos deberían existir?',
  '¿Es defendible exagerar el currículum para conseguir una oportunidad?',
  '¿Deberían regularse los influencers como medios de comunicación?',
  '¿El servicio militar o social obligatorio aporta algo?',
]

const ETICA = [
  '¿Mentir es aceptable si evita un daño?',
  '¿Debería incentivarse la adopción por encima de tener hijos biológicos?',
  '¿Es ético comer carne existiendo alternativas?',
  '¿Debería permitirse la eutanasia?',
  '¿Se justifica revisar el teléfono de tu pareja si sospechas algo?',
  '¿Es peor robar un banco o desfalcar con corbata?',
  '¿Deberíamos perdonar todo si hay arrepentimiento sincero?',
  '¿Es ético comprar ropa ultrabarata sabiendo cómo se produce?',
  '¿Salvarías a tu mascota antes que a un desconocido?',
  '¿Está bien que los padres publiquen fotos de sus hijos?',
  '¿El fin justifica los medios alguna vez?',
  '¿Es ético clonar mascotas?',
  '¿Deberían los museos devolver piezas a sus países de origen?',
  '¿La honestidad brutal es virtud o pretexto para herir?',
  '¿Comprarías un órgano si fuera legal y salvara a alguien que amas?',
  '¿Es ético heredar grandes fortunas?',
  '¿Denunciarías a un amigo si cometiera un delito grave?',
  '¿Los animales deberían tener derechos legales como las personas?',
  '¿Los linchamientos en redes hacen justicia o solo daño?',
  '¿Aceptarías un beneficio injusto si nadie jamás lo supiera?',
]

const TECNOLOGIA = [
  '¿La IA quitará más empleos de los que crea?',
  '¿Deberían los robots pagar impuestos?',
  '¿Confiarías en un coche totalmente autónomo?',
  '¿Deberían prohibirse los deepfakes aunque sean parodia?',
  '¿Está bien que una IA escriba libros y gane premios?',
  '¿Te pondrías un chip en el cerebro si mejorara tu memoria?',
  '¿Los videojuegos competitivos son un deporte?',
  '¿Deberían las redes verificar la edad de verdad?',
  '¿La privacidad ya se perdió y toca aceptarlo?',
  '¿Se aprende mejor con IA que con maestros humanos?',
  '¿Colonizar Marte o arreglar la Tierra primero?',
  '¿Confiarías en un médico IA para un diagnóstico serio?',
  '¿Las criptomonedas son el futuro o una burbuja eterna?',
  '¿Deberían las apps decirte cuánto tiempo te roban al día?',
  '¿Está bien revivir actores fallecidos con efectos digitales?',
  '¿Debería un algoritmo decidir quién recibe un crédito?',
  '¿Desconectarse del trabajo debería ser un derecho por ley?',
  '¿Las máquinas podrán amar algún día o solo simularlo?',
  '¿Los niños deberían aprender a programar antes que otro idioma?',
  '¿Pagarías por redes sociales sin anuncios ni algoritmo?',
]

const CULTURA = [
  '¿El reguetón es el rock de esta generación?',
  '¿Los remakes arruinan los clásicos?',
  '¿El libro siempre es mejor que la película?',
  '¿El arte moderno es arte o es cuento?',
  '¿Subtítulos o doblaje?',
  'La piña en la pizza: ¿crimen o genialidad?',
  '¿El fútbol está sobrevalorado?',
  '¿Los premios como el Óscar siguen significando algo?',
  '¿Se puede hacer memes de todo, sin límites?',
  '¿La letra de una canción importa más que el ritmo?',
  '¿Ver series a velocidad 1.5x cuenta como verlas?',
  '¿Los spoilers deberían considerarse ofensa grave?',
  '¿La comida de tu país es la mejor del mundo o pura costumbre?',
  '¿Un creador de contenido puede ser tan artista como un pintor?',
  '¿Deberían editarse los clásicos "problemáticos" en nuevas ediciones?',
  '¿El cine de superhéroes envejeció bien o ya cansó?',
  '¿Concierto íntimo o estadio lleno?',
  '¿Escuchar el resumen cuenta como leer el libro?',
  '¿La moda es expresión o puro consumo?',
  '¿Los museos deberían ser gratis siempre?',
]

const FUTURO = [
  '¿Viviremos más de 120 años? ¿Querrías?',
  '¿En 20 años seguiremos manejando nosotros?',
  '¿Tus nietos trabajarán o las máquinas lo harán todo?',
  '¿El dinero físico existirá en 2050?',
  '¿Volverías a elegir tu carrera sabiendo cómo viene el futuro?',
  '¿Las ciudades del futuro serán mejores o más caóticas?',
  '¿Deberíamos frenar la IA hasta entenderla mejor?',
  '¿La gente del futuro será más feliz que la de hoy?',
  '¿Los traductores instantáneos matarán los idiomas?',
  '¿Comeremos carne de laboratorio sin problema?',
  '¿La oficina desaparecerá por completo?',
  '¿Habrá una moneda global única?',
  '¿La escuela como la conocemos existirá en 30 años?',
  '¿Preferirías vivir en otra época? ¿Cuál?',
  '¿La humanidad se unirá más o se dividirá más?',
  '¿Qué invento actual nos parecerá ridículo en 50 años?',
  '¿Tendremos amigos virtuales indistinguibles de los reales?',
  '¿El clima nos cambiará la vida o nos adaptaremos sin sacrificio?',
  '¿Las vacaciones espaciales serán normales para la clase media?',
  '¿El futuro te emociona o te preocupa más?',
]

export const PREGUNTAS_DEBATES: Pregunta[] = [
  ...SOCIEDAD.map((texto) => ({ texto, grupo: 'sociedad' })),
  ...ETICA.map((texto) => ({ texto, grupo: 'etica' })),
  ...TECNOLOGIA.map((texto) => ({ texto, grupo: 'tecnologia' })),
  ...CULTURA.map((texto) => ({ texto, grupo: 'cultura' })),
  ...FUTURO.map((texto) => ({ texto, grupo: 'futuro' })),
]
