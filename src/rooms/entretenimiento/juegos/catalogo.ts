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

export interface JuegoReal {
  id: IdJuegoReal
  nombre: string
  icono: string
  /** Rango de jugadores del juego digital; los '2+' también aparecen en la sección 3+. */
  jugadores: '1' | '1–2' | '2+'
  descripcion: string
}

export const JUEGOS_REALES: JuegoReal[] = [
  { id: 'sudoku', nombre: 'Sudoku', icono: '🔢', jugadores: '1', descripcion: 'Rellena el 9×9 sin repetir números.' },
  { id: 'solitario', nombre: 'Solitario', icono: '🃏', jugadores: '1', descripcion: 'Klondike clásico: ordena las 52 cartas.' },
  { id: 'j2048', nombre: '2048', icono: '🧮', jugadores: '1', descripcion: 'Desliza y fusiona hasta llegar a 2048.' },
  { id: 'damas', nombre: 'Damas', icono: '🔴', jugadores: '1–2', descripcion: 'Salta y captura todas las fichas rivales.' },
  { id: 'ajedrez', nombre: 'Ajedrez', icono: '♟️', jugadores: '1–2', descripcion: 'El clásico de estrategia, hasta el jaque mate.' },
  { id: 'blackjack', nombre: 'Blackjack', icono: '♠️', jugadores: '1', descripcion: 'Llega a 21 y vence al crupier.' },
  { id: 'ruleta', nombre: 'Ruleta', icono: '🎰', jugadores: '1', descripcion: 'Apuesta al rojo, al negro o a tu número.' },
  { id: 'buscaminas', nombre: 'Buscaminas', icono: '💣', jugadores: '1', descripcion: 'Despeja el campo sin pisar ninguna mina.' },
  { id: 'domino', nombre: 'Dominó', icono: '🁢', jugadores: '1', descripcion: 'Doble seis contra la máquina, con pozo.' },
  { id: 'viborita', nombre: 'Viborita', icono: '🐍', jugadores: '1', descripcion: 'Come manzanas sin morderte la cola.' },
  { id: 'space', nombre: 'Space Defender', icono: '👾', jugadores: '1', descripcion: 'Derriba las oleadas de invasores.' },
  { id: 'tetris', nombre: 'Tetris', icono: '🧱', jugadores: '1', descripcion: 'Encaja las piezas y limpia líneas.' },
  { id: 'dino', nombre: 'Dino Runner', icono: '🦖', jugadores: '1', descripcion: 'Salta cactus y corre sin parar.' },
  { id: 'pong', nombre: 'Pong', icono: '🏓', jugadores: '1–2', descripcion: 'El clásico de paletas, solo o en pareja.' },
  { id: 'hockey', nombre: 'Hockey de mesa', icono: '🏒', jugadores: '1–2', descripcion: 'Mete el disco en la portería rival.' },
  { id: 'billar', nombre: 'Billar', icono: '🎱', jugadores: '1–2', descripcion: 'Apunta, tira y limpia la mesa.' },
  { id: 'memorama', nombre: 'Memorama', icono: '🧠', jugadores: '1', descripcion: 'Encuentra los pares en menos intentos.' },
  { id: 'cuatroenlinea', nombre: '4 en línea', icono: '🟡', jugadores: '1–2', descripcion: 'Conecta cuatro fichas antes que el rival.' },
  { id: 'simon', nombre: 'Simon dice', icono: '🚦', jugadores: '1', descripcion: 'Repite la secuencia de colores.' },
  { id: 'ahorcado', nombre: 'Ahorcado', icono: '🪢', jugadores: '1', descripcion: 'Adivina la palabra letra por letra.' },
  { id: 'conocerse', nombre: 'Para conocerse', icono: '💬', jugadores: '2+', descripcion: '100 preguntas en 3 niveles para conocerse de verdad.' },
  { id: 'debates', nombre: 'Debates', icono: '🔥', jugadores: '2+', descripcion: '100 preguntas que encienden la sobremesa.' },
]
