/**
 * Catálogo central de iconos de la interfaz: cada nombre semántico con su
 * emoji (estilo "emoji"). Los SVG de lucide viven APARTE en `catalogo.svg.ts`
 * (448 componentes, ~40 KB gz) y se cargan con import() solo en estilo
 * "profesional" (ver `svgStore.ts`): este módulo debe seguir LIGERO.
 *
 * El mapa inverso emoji → nombre permite resolver emojis guardados en
 * catálogos de dominio o en la BD (p. ej. `cuarto.icon`) sin migrar datos.
 * ANTE EMOJIS REPETIDOS GANA LA PRIMERA ENTRADA: mantener el orden
 * chrome → cuartos → tabs → dominios.
 *
 * Icono nuevo = su emoji aquí Y su SVG en `catalogo.svg.ts` (mismo nombre;
 * `Record<NombreIcono, …>` de allá obliga a que no falte ninguno).
 */

export const EMOJIS = {
  // — Chrome (editor, HUD, menús, chat) —
  editar: '✏️',
  confirmar: '✓',
  cerrar: '✕',
  enviar: '➤',
  compartir: '📤',
  herramienta: '🔧',
  casa: '🏠',
  // Explosión de la casa: separar los pisos ↔ volver a juntarlos.
  pisosSeparar: '🧇',
  pisosJuntar: '🥞',
  progreso: '📊',
  filtro: '🔽',
  cuartos: '🚪',
  inventario: '🎒',
  ajustes: '⚙️',
  agregar: '➕',
  quitar: '➖',
  restaurar: '♻️',
  salud: '❤️',
  energia: '⚡',
  racha: '🔥',
  registros: '📖',
  chat: '💬',
  nota: '🗒️',
  memoria: '🧠',
  alarma: '⏰',
  pantallas: '📵',
  foto: '📷',
  pdf: '📄',
  mascara: '🎭',
  'chat-ar': '🤳',
  microfono: '🎤',
  objetivo: '🎯',
  basura: '🗑️',
  abajo: '👇',
  'rotar-izq': '⟲',
  'rotar-der': '⟳',
  volver: '‹',
  siguiente: '›',
  // Chevrons de plegable (los `▸/▾` que antes iban crudos en los botones).
  plegado: '▸',
  desplegado: '▾',
  centrar: '⌂',
  dia: '☀️',
  noche: '🌙',
  calendario: '📅',
  anecdotario: '📒',
  foco: '💡',
  ubicacion: '📍',
  lluvia: '🌧️',
  humedad: '💧',
  viento: '💨',
  paraguas: '☔',
  amanecer: '🌅',
  atardecer: '🌇',
  'clima-nublado': '⛅',
  'clima-niebla': '🌫️',
  'clima-llovizna': '🌦️',
  'clima-nieve': '🌨️',
  'clima-tormenta': '⛈️',
  'clima-variable': '🌡️',
  subir: '⬆️',
  bajar: '⬇️',
  izquierda: '⬅️',
  derecha: '➡️',
  brillo: '✨',
  apunta: '☝️',
  vinculo: '🤝',
  paleta: '🎨',
  pincel: '🖌️',
  spray: '🧴',
  borrador: '🧽',
  bote: '🪣',
  deshacer: '↩️',
  guardar: '💾',
  // — Infraestructura del mapa (caminos, canchas, huerto) —
  construir: '🏗️',
  pista: '🏎️',
  riel: '🚂',
  'montana-rusa': '🎢',
  cancha: '🏟️',
  paintball: '🥎',
  parcela: '🟫',
  sembrar: '🌱',
  regadera: '💧',
  cosechar: '🧺',
  granja: '🐄',
  animal: '🐾',
  alimentar: '🌾',
  mimar: '💗',
  curar: '💊',
  escoba: '🧹',
  accesorio: '🧸',
  aspersor: '💦',
  regla: '📐',
  medida: '📏',
  ropa: '👕',
  perfil: '👤',
  esfera: '⚪',
  cilindro: '🛢️',
  caja: '⬛',
  plano: '⬜',
  duplicar: '📄',
  vincular: '🔗',
  silla: '🪑',
  persona: '🧍',
  archivador: '🗂️',
  mapa: '🗺️',
  imagen: '🖼️',
  multicolor: '🌈',
  repetir: '🔁',

  // — Constructor de mapa (modos y accesos) —
  nube: '☁️',
  muro: '🧱',
  ventana: '🪟',
  pasto: '🌿',
  'piso-interior': '🟫',
  techo: '🔺',
  mover: '✥',
  expandir: '⤢',
  escalera: '🌀',
  elevador: '🛗',
  resbaladilla: '💨',
  niveles: '🪜',

  // — Cuartos (mismo emoji que la plantilla en src/rooms/<id>/index.tsx) —
  'cuarto-cocina': '🍳',
  'cuarto-ejercicio': '💪',
  'cuarto-descanso': '🛏️',
  'cuarto-anecdotario': '✍️',
  'cuarto-despacho': '💰',
  'cuarto-biblioteca': '📚',
  'cuarto-entretenimiento': '🎮',
  'cuarto-sala': '✈️',
  'cuarto-jardin': '🧘',
  'cuarto-diario': '📰',
  'cuarto-bodega': '📦',

  // — Cocina (momentos, compras, metas) —
  comida: '🍽️',
  bebida: '🥤',
  verduras: '🥦',
  carne: '🥩',
  lacteos: '🧀',
  pan: '🍞',
  cereal: '🌾',
  dulces: '🍬',
  congelados: '🧊',
  limpieza: '🧻',
  balanza: '⚖️',
  calculadora: '🧮',
  bajando: '🔻',
  canasta: '🧺',
  chef: '👨‍🍳',

  // — Jardín (mindfulness) —
  cuaderno: '📔',
  respiracion: '🌬️',
  audifonos: '🎧',
  gratitud: '🙏',
  trofeo: '🏆',

  // — Despacho (categorías de gasto/ingreso) —
  hamburguesa: '🍔',
  fiesta: '🎉',
  pastilla: '💊',
  bolsa: '🛍️',
  maletin: '💼',
  regalo: '🎁',
  movimientos: '💸',

  // — Sala (viajes) —
  despegue: '🛫',
  playa: '🏖️',
  ciudad: '🏙️',
  aventura: '🥾',
  mundo: '🌍',
  hotel: '🏨',
  taxi: '🚕',
  boleto: '🎫',
  companeros: '👥',
  auto: '🚗',

  // — Agenda (trabajo, salud y personas) —
  agenda: '🗓️',
  telefono: '📞',
  correo: '✉️',
  pastel: '🎂',

  // — Idiomas —
  bocina: '🔊',
  musica: '🎵',
  idiomas: '🌐',

  // — Entretenimiento —
  pelicula: '🎬',
  serie: '📺',
  estrategia: '♟️',
  familia: '👨‍👩‍👧',
  rol: '📜',
  dados: '🎲',

  // — Garage (vehículos) —
  bici: '🚲',
  moto: '🏍️',
  scooter: '🛵',
  camioneta: '🛻',

  // — Diario (categorías de noticias) —
  red: '🌐',
  gobierno: '🏛️',
  voto: '🗳️',
  tecnologia: '💻',
  ciencia: '🔬',
  hospital: '🏥',
  deportes: '⚽',
  cultura: '🎭',
  sincronizar: '🔄',
  chip: '🖥️',
  estrella: '⭐',
  montaña: '⛰️',
  gema: '💎',

  // — Estilos de render y efectos visuales (Configuraciones › estilo del mapa) —
  'render-comic': '💥',
  'render-miniatura': '🔬',
  'render-retro': '👾',
  'render-neon': '🌟',
  'render-byn': '⚫',
  'render-sepia': '🟤',
  'render-vineta': '⭕',

  // — Biblioteca (pilares) —
  numeros: '🔢',
  atomo: '⚛️',
  rompecabezas: '🧩',
  archivo: '🗄️',

  // — Fondos de cielo y temas de la casa (selectores del editor) —
  'luna-nueva': '🌑',
  galaxia: '🌌',
  planeta: '🪐',
  castillo: '🏰',
  desierto: '🏜️',
  'ciudad-noche': '🌃',
  nieve: '❄️',
  cohete: '🚀',
  telaraña: '🕸️',
  corazon: '💖',
  navidad: '🎄',

  // — Tabs y acciones comunes de las apps —
  'tab-diario': '📝',
  'tab-recetas': '🍲',
  'tab-compras': '🛒',
  'tab-fuerza': '🏋️',
  'tab-cardio': '🏃',
  hecho: '✅',
  lista: '📋',
  rejilla: '▦',
  tablero: '🗂️',
  ver: '👀',
  ocultar: '🙈',
  tendencia: '📈',
  etiqueta: '🏷️',

  // — Sala de cómputo —
  rehacer: '↪️',
  cortar: '✂️',
  pegar: '📋',
  negrita: '🅱️',
  alinearIzq: '⬅️',
  alinearCentro: '↔️',
  alinearDer: '➡️',
  ordenar: '🔀',
  sigma: '∑',
  funcion: '📉',
  // Gráficas de las hojas de cálculo (una por tipo, para el selector)
  grafica: '📊',
  graficaLineas: '📈',
  graficaArea: '📈',
  graficaPastel: '🥧',
  graficaDispersion: '✳️',
  raiz: '√',
  hoja: '🧾',
  imprimir: '🖨️',
  descargar: '📥',

  // — Temas de UI (selector en Configuraciones) —
  'tema-neon': '🟣',
  'tema-bosque': '🌲',
  'tema-ambar': '🟠',
  'tema-ciruela': '🟪',

  // — Proveedores de IA (chat) —
  'ia-claude': '✴️',
  'ia-gemini': '♊',
  'ia-chatgpt': '🟢',
  'ia-deepseek': '🐋',
  'ia-local': '💻',

  // — Mascotas / asistentes —
  'mascota-mago': '🧙',
  'mascota-gato': '🐱',
  'mascota-perro': '🐶',
  'mascota-buho': '🦉',
  'mascota-robot': '🤖',

  // — Reproducción, juegos y avisos (migración de emojis de UI, jul 2026) —
  play: '▶️',
  pausa: '⏸️',
  detener: '⏹️',
  cronometro: '⏱️',
  'reloj-arena': '⏳',
  alerta: '⚠️',
  candado: '🔒',
  barajar: '🔀',
  bomba: '💣',
  banana: '🍌',
  bandera: '🚩',
  moneda: '🪙',
  brujula: '🧭',
  maleta: '🧳',
  carpeta: '📁',
  flor: '🌼',
  semilla: '🌱',
  rama: '🌿',
  nodos: '🕸️',
  flujo: '🔀',
  venn: '⚭',
  comparar: '⚖️',
  llaves: '❴',
  sombrero: '🎩',
  naipe: '🃏',
  'rueda-fortuna': '🎡',
  joystick: '🕹️',
  'reloj-pulsera': '⌚',
  mano: '✋',
  campana: '🔔',
  lupa: '🔍',
  sofa: '🛋️',
  captura: '📸',
  periodico: '🗞️',
  divisas: '💱',
  saltar: '🦘',
  bailar: '💃',
  laser: '🔫',
  juguete: '🧸',

  // — Muebles del catálogo de recursos (modelosRecursos.tsx, F4) —
  taller: '🛠️',
  fregadero: '🚰',
  espejo: '🪞',
  billar: '🎱',
  arbol: '🌳',
  'placa-verde': '🟩',

  // — Emociones (pickers de ánimo y estados del personaje) —
  'animo-sereno': '😌',
  'animo-contento': '🙂',
  'animo-neutral': '😐',
  'animo-triste': '😔',
  'animo-ansioso': '😰',
  'animo-genial': '🤩',
  'animo-dormido': '😴',
  'animo-enojado': '😤',
  'animo-feliz': '😄',
  'animo-llorando': '😢',
  'animo-sonriente': '😀',
  'animo-frustrado': '😣',
  'animo-cool': '😎',
  'animo-ko': '😵',
  'animo-descontento': '😕',
  'animo-alegre': '😊',

  // — Rueda de herramientas (movimientos y juguetes) —
  cuerda: '🪢',
  mortal: '🤸',
  saludar: '👋',
  fuegos: '🎆',
  burbujas: '🫧',
  // 🧊 pertenece a 'congelados' (cocina) en el mapa inverso: el centro de la
  // rueda usa este nombre explícito para mostrar un cubo y no un copo.
  'cubo-vistas': '🧊',
  atras: '←',
  ovni: '🛸',

  // — Objetos del catálogo de muebles (chips de creación del chat) —
  guitarra: '🎸',
  madera: '🪵',
  'caja-herramientas': '🧰',
  libro: '📕',
  maceta: '🪴',

  // — Granja y huerto —
  gallina: '🐔',
  cerdo: '🐷',
  cabra: '🐐',
  oveja: '🐑',
  caballo: '🐴',
  dormir: '💤',
  tina: '🛁',
  zanahoria: '🥕',
  lechuga: '🥬',
  girasol: '🌻',
  tomate: '🍅',
  maiz: '🌽',
  calabaza: '🎃',

  // — Canchas —
  'pelota-tenis': '🎾',
  basquet: '🏀',
  beisbol: '⚾',

  // — Prendas del editor de personajes —
  lentes: '🕶️',
  chamarra: '🧥',
  pantalon: '👖',
  calzado: '👟',

  // — Jardín (etapas de calma y meditación) —
  bellota: '🌰',
  'flor-cerezo': '🌸',
  paisaje: '🏞️',
  olas: '🌊',

  // — Animación y varios de UI —
  globo: '🎈',
  'meta-carrera': '🏁',
  ayuda: '❓',
  tutorial: '🎓',
  estetoscopio: '🩺',
  // Especialidades médicas de la Agenda. Lucide no trae diente: la sonrisa es lo
  // más cercano y se entiende en la fila de la cita.
  diente: '🦷',
  hueso: '🦴',
  chincheta: '📌',
  ciclo: '🩸',

  // — Mascotas de la agenda (🐶, 🐱, 🐟, 🐴 y 🐾 ya los resuelven otras entradas) —
  ave: '🐦',
  roedor: '🐹',
  reptil: '🦎',
  vacuna: '💉',
  desparasitar: '🪱',
  tijeras: '✂️',
  hablar: '🗣️',
  pin: '📌',
  'tema-oeste': '🤠',
  estambre: '🧶',
  'bandera-blanca': '🏳️',
  via: '🛤️',

  // — Comida (recetas sembradas y ejemplos) —
  ensalada: '🥗',
  pizza: '🍕',
  pescado: '🐟',
  pollo: '🍗',

  // — Prendas y rostros del editor de personajes (apariencia.ts) —
  bufanda: '🧣',
  'gorro-chef': '🧑‍🍳',
  gorra: '🧢',
  corbata: '👔',
  camisa: '🥼',
  capa: '🦸',
  vestido: '👗',
  falda: '🩱',
  shorts: '🩳',
  guantes: '🧤',
  'cara-sorpresa': '😮',
  'cara-guino': '😉',
  'cara-serio': '😠',
  'cara-ternura': '🥰',
  'cara-enojo': '😡',
  aprobar: '👍',

  // — Peinados (apariencia.ts) —
  'sin-pelo': '🚫',
  'pelo-corto': '💇',
  'pelo-puntas': '🦔',
  'pelo-coleta': '🎀',
  'pelo-chongo': '🍥',
  'pelo-largo': '🦱',
  'pelo-mohawk': '🦅',
  tazon: '🥣',

  // — Cuerpos preset (cuerpos.ts) —
  astronauta: '🧑‍🚀',
  ninja: '🥷',
  alien: '👽',
  princesa: '👸',

  // — Plantas del catálogo de recursos (modelosRecursos.tsx) —
  hibisco: '🌺',
  cactus: '🌵',
  hojas: '🍃',
  tulipan: '🌷',
  marchito: '🥀',

  // — Materiales y formas de techo/piso (techos.ts, pisos.ts) —
  piedra: '🪨',
  'casa-jardin': '🏡',
  baldosa: '🔲',
  ruina: '🏚️',
  metal: '🔩',
  lapida: '🪦',
  cupula: '🕌',
  choza: '🛖',

  // — Recetas sembradas (cocina/ejemplos.ts) —
  pasta: '🍝',
  taco: '🌮',
  wrap: '🥙',

  // — Juegos de la mesa digital (juegos/catalogo.ts) —
  'ficha-roja': '🔴',
  picas: '♠️',
  ruleta: '🎰',
  vibora: '🐍',
  dinosaurio: '🦖',
  pingpong: '🏓',
  hockey: '🏒',
  'ficha-amarilla': '🟡',
  semaforo: '🚦',
  domino: '🁢',

  // — Trámites del garaje (seguro y tarjeta de circulación) —
  escudo: '🛡️',
  tarjeta: '🪪',

  // — Sueltos que aún caían en emoji —
  hilo: '🧵',
  silencio: '🔇',
} satisfies Record<string, string>

export type NombreIcono = keyof typeof EMOJIS

/** Normaliza selectores de variación (FE0F) para que '✏️' y '✏' coincidan. */
const clave = (emoji: string) => emoji.replace(/\uFE0F/g, '')

const EMOJI_A_NOMBRE = new Map<string, NombreIcono>()
for (const [nombre, emoji] of Object.entries(EMOJIS) as [NombreIcono, string][]) {
  const k = clave(emoji)
  if (!EMOJI_A_NOMBRE.has(k)) EMOJI_A_NOMBRE.set(k, nombre)
}

/** Nombre del catálogo para un emoji dado (o null si no tiene equivalente). */
export function iconoDe(emoji: string): NombreIcono | null {
  return EMOJI_A_NOMBRE.get(clave(emoji)) ?? null
}
