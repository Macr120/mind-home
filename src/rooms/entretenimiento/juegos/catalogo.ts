export type IdJuegoReal =
  | 'sudoku'
  | 'solitario'
  | 'j2048'
  | 'damas'
  | 'ajedrez'
  | 'blackjack'
  | 'ruleta'
  | 'buscaminas'
  | 'domino'
  | 'viborita'
  | 'space'
  | 'tetris'
  | 'dino'
  | 'pong'
  | 'hockey'
  | 'billar'
  | 'memorama'
  | 'cuatroenlinea'
  | 'simon'
  | 'ahorcado'
  | 'conocerse'
  | 'debates'

/** Familia del juego: ordena la cuadrícula y le da color al icono. */
export type FamiliaJuego = 'tablero' | 'ingenio' | 'arcade' | 'cartas' | 'grupo'

export const FAMILIAS: { id: FamiliaJuego; labelEs: string; tono: string }[] = [
  { id: 'tablero', labelEs: 'Tablero', tono: '#fbbf24' },
  { id: 'ingenio', labelEs: 'Ingenio', tono: '#60a5fa' },
  { id: 'arcade', labelEs: 'Arcade', tono: '#22d3ee' },
  { id: 'cartas', labelEs: 'Cartas y casino', tono: '#f472b6' },
  { id: 'grupo', labelEs: 'Para el grupo', tono: '#a78bfa' },
]

export interface JuegoReal {
  id: IdJuegoReal
  nombre: string
  icono: string
  familia: FamiliaJuego
  /** Rango de jugadores del juego digital; los '2+' también aparecen en la sección 3+. */
  jugadores: '1' | '1–2' | '2+'
  descripcion: string
  /** Acepta el selector fácil/medio/difícil de la barra superior. */
  dificultad?: boolean
}

export const JUEGOS_REALES: JuegoReal[] = [
  { id: 'sudoku', familia: 'ingenio', nombre: 'Sudoku', icono: '🔢', jugadores: '1', descripcion: 'Rellena el 9×9 sin repetir números.', dificultad: true },
  { id: 'solitario', familia: 'cartas', nombre: 'Solitario', icono: '🃏', jugadores: '1', descripcion: 'Klondike clásico: ordena las 52 cartas.', dificultad: true },
  { id: 'j2048', familia: 'ingenio', nombre: '2048', icono: '🧮', jugadores: '1', descripcion: 'Desliza y fusiona hasta llegar a 2048.' },
  { id: 'damas', familia: 'tablero', nombre: 'Damas', icono: '🔴', jugadores: '1–2', descripcion: 'Salta y captura todas las fichas rivales.', dificultad: true },
  { id: 'ajedrez', familia: 'tablero', nombre: 'Ajedrez', icono: '♟️', jugadores: '1–2', descripcion: 'El clásico de estrategia, hasta el jaque mate.', dificultad: true },
  { id: 'blackjack', familia: 'cartas', nombre: 'Blackjack', icono: '♠️', jugadores: '1', descripcion: 'Llega a 21 y vence al crupier.' },
  { id: 'ruleta', familia: 'cartas', nombre: 'Ruleta', icono: '🎰', jugadores: '1', descripcion: 'Apuesta al rojo, al negro o a tu número.' },
  { id: 'buscaminas', familia: 'ingenio', nombre: 'Buscaminas', icono: '💣', jugadores: '1', descripcion: 'Despeja el campo sin pisar ninguna mina.', dificultad: true },
  { id: 'domino', familia: 'tablero', nombre: 'Dominó', icono: '🁢', jugadores: '1', descripcion: 'Doble seis contra la máquina, con pozo.', dificultad: true },
  { id: 'viborita', familia: 'arcade', nombre: 'Viborita', icono: '🐍', jugadores: '1', descripcion: 'Come manzanas sin morderte la cola.', dificultad: true },
  { id: 'space', familia: 'arcade', nombre: 'Space Defender', icono: '👾', jugadores: '1', descripcion: 'Derriba las oleadas de invasores.', dificultad: true },
  { id: 'tetris', familia: 'arcade', nombre: 'Tetris', icono: '🧱', jugadores: '1', descripcion: 'Encaja las piezas y limpia líneas.', dificultad: true },
  { id: 'dino', familia: 'arcade', nombre: 'Dino Runner', icono: '🦖', jugadores: '1', descripcion: 'Salta cactus y corre sin parar.', dificultad: true },
  { id: 'pong', familia: 'arcade', nombre: 'Pong', icono: '🏓', jugadores: '1–2', descripcion: 'El clásico de paletas, solo o en pareja.', dificultad: true },
  { id: 'hockey', familia: 'arcade', nombre: 'Hockey de mesa', icono: '🏒', jugadores: '1–2', descripcion: 'Mete el disco en la portería rival.', dificultad: true },
  { id: 'billar', familia: 'arcade', nombre: 'Billar', icono: '🎱', jugadores: '1–2', descripcion: 'Apunta, tira y limpia la mesa.', dificultad: true },
  { id: 'memorama', familia: 'ingenio', nombre: 'Memorama', icono: '🧠', jugadores: '1', descripcion: 'Encuentra los pares en menos intentos.', dificultad: true },
  { id: 'cuatroenlinea', familia: 'tablero', nombre: '4 en línea', icono: '🟡', jugadores: '1–2', descripcion: 'Conecta cuatro fichas antes que el rival.', dificultad: true },
  { id: 'simon', familia: 'ingenio', nombre: 'Simon dice', icono: '🚦', jugadores: '1', descripcion: 'Repite la secuencia de colores.', dificultad: true },
  { id: 'ahorcado', familia: 'ingenio', nombre: 'Ahorcado', icono: '🪢', jugadores: '1', descripcion: 'Adivina la palabra letra por letra.', dificultad: true },
  { id: 'conocerse', familia: 'grupo', nombre: 'Para conocerse', icono: '💬', jugadores: '2+', descripcion: '100 preguntas en 3 niveles para conocerse de verdad.' },
  { id: 'debates', familia: 'grupo', nombre: 'Debates', icono: '🔥', jugadores: '2+', descripcion: '100 preguntas que encienden la sobremesa.' },
]
