// Música de fondo de las guías, compuesta en el Studio de audio de MindHaOS:
// cada receta es un plan en el mismo JSON que «Canción con IA» y que los vibes
// de la casa (rooms/audio/ambiente.ts), y `componer.mjs` la despliega y la
// renderiza con el motor de la app. Música propia: sin licencias de terceros.
//
// Van DEBAJO de la voz de Pep@: melodías con pocas notas, apoyadas en los
// acordes, y energía que sube y baja para que el bucle no canse.
//
// melodías: [inicio (semicorchea desde el arranque de la sección), duración, tono MIDI]

export const RECETAS = {
  'paso-firme': {
    titulo: 'Paso firme',
    bpm: 112, tonica: 'D', modo: 'mayor', ritmo: 'house', swing: 0, acomp: 'pulso', bajo: 'octavas', espacio: 'sala',
    instrumentos: { acordes: 'pluck', melodia: 'campanas', bateria: 'bateria808' },
    secciones: [
      { tipo: 'intro', compases: 4, acordes: ['D', 'Bm'], energia: 1 },
      { tipo: 'verso', compases: 8, acordes: ['D', 'A', 'Bm', 'G'], energia: 2 },
      { tipo: 'coro', compases: 8, acordes: ['G', 'A', 'F#m', 'Bm'], energia: 3 },
      { tipo: 'verso', compases: 8, acordes: ['D', 'A', 'Bm', 'G'], energia: 2 },
      { tipo: 'coro', compases: 8, acordes: ['G', 'A', 'F#m', 'Bm'], energia: 3 },
      { tipo: 'instrumental', compases: 8, acordes: ['Em', 'G', 'A', 'A'], energia: 2 },
      { tipo: 'verso', compases: 8, acordes: ['D', 'A', 'Bm', 'G'], energia: 1 },
      { tipo: 'coro', compases: 8, acordes: ['G', 'A', 'F#m', 'Bm'], energia: 3 },
      { tipo: 'coro', compases: 8, acordes: ['G', 'A', 'F#m', 'Bm'], energia: 3 },
      { tipo: 'final', compases: 4, acordes: ['D'], energia: 1 },
    ],
    melodias: {
      verso: [[0, 4, 74], [4, 2, 78], [6, 2, 81], [8, 6, 78], [16, 4, 76], [20, 2, 74], [22, 2, 76], [24, 8, 73], [32, 4, 74], [36, 2, 78], [38, 2, 81], [40, 6, 83], [48, 4, 81], [52, 4, 78], [56, 8, 79]],
      coro: [[0, 8, 83], [8, 4, 81], [12, 4, 79], [16, 8, 81], [24, 4, 78], [28, 4, 76], [32, 6, 78], [38, 2, 76], [40, 8, 73], [48, 4, 74], [52, 4, 76], [56, 8, 78]],
      instrumental: [[0, 4, 79], [4, 4, 76], [8, 8, 71], [16, 4, 74], [20, 4, 79], [24, 8, 83], [32, 4, 81], [36, 4, 76], [40, 8, 73], [48, 16, 76]],
    },
  },
  // Disco alegre: piano en pulso, bajo en octavas y trompeta en el gancho.
  chispa: {
    titulo: 'Chispa',
    bpm: 124, tonica: 'E', modo: 'mayor', ritmo: 'disco', swing: 0, acomp: 'pulso', bajo: 'octavas', espacio: 'sala',
    instrumentos: { acordes: 'piano', melodia: 'trompeta', bateria: 'bateria' },
    secciones: [
      { tipo: 'intro', compases: 4, acordes: ['E', 'A'], energia: 2 },
      { tipo: 'verso', compases: 8, acordes: ['E', 'C#m', 'A', 'B'], energia: 2 },
      { tipo: 'precoro', compases: 4, acordes: ['F#m', 'G#m', 'A', 'B'], energia: 2 },
      { tipo: 'coro', compases: 8, acordes: ['A', 'B', 'G#m', 'C#m'], energia: 3 },
      { tipo: 'verso', compases: 8, acordes: ['E', 'C#m', 'A', 'B'], energia: 2 },
      { tipo: 'precoro', compases: 4, acordes: ['F#m', 'G#m', 'A', 'B'], energia: 2 },
      { tipo: 'coro', compases: 8, acordes: ['A', 'B', 'G#m', 'C#m'], energia: 3 },
      { tipo: 'puente', compases: 8, acordes: ['C#m', 'A', 'E', 'B'], energia: 1 },
      { tipo: 'instrumental', compases: 8, acordes: ['A', 'B', 'E', 'E'], energia: 3 },
      { tipo: 'coro', compases: 8, acordes: ['A', 'B', 'G#m', 'C#m'], energia: 3 },
      { tipo: 'coro', compases: 8, acordes: ['A', 'B', 'G#m', 'C#m'], energia: 3 },
      { tipo: 'final', compases: 4, acordes: ['E'], energia: 2 },
    ],
    melodias: {
      verso: [[0, 2, 71], [2, 2, 73], [4, 4, 76], [10, 2, 75], [12, 4, 73], [16, 2, 73], [18, 2, 71], [20, 4, 69], [26, 2, 68], [28, 4, 69], [32, 2, 71], [34, 2, 73], [36, 4, 76], [42, 2, 78], [44, 4, 80], [48, 6, 78], [54, 2, 76], [56, 8, 75]],
      precoro: [[0, 4, 73], [4, 4, 75], [8, 8, 76], [16, 4, 75], [20, 4, 76], [24, 8, 78], [32, 4, 76], [36, 4, 78], [40, 8, 80], [48, 4, 78], [52, 4, 80], [56, 8, 81]],
      coro: [[0, 3, 81], [3, 3, 80], [6, 2, 78], [8, 8, 80], [16, 3, 78], [19, 3, 80], [22, 2, 81], [24, 8, 83], [32, 3, 83], [35, 3, 81], [38, 2, 80], [40, 8, 78], [48, 2, 76], [50, 2, 78], [52, 4, 80], [56, 8, 76]],
      puente: [[0, 8, 76], [8, 8, 73], [16, 8, 76], [24, 8, 75], [32, 8, 73], [40, 8, 71], [48, 16, 75]],
      instrumental: [[0, 2, 76], [2, 2, 80], [4, 2, 83], [6, 2, 88], [8, 8, 85], [16, 2, 78], [18, 2, 83], [20, 2, 87], [22, 2, 90], [24, 8, 87], [32, 2, 76], [34, 2, 80], [36, 2, 83], [38, 2, 88], [40, 8, 85], [48, 4, 83], [52, 4, 80], [56, 8, 76]],
    },
  },
  // Pop-rock luminoso: guitarras rasgueadas a 140 y un lead que sube en el coro.
  'a-todo-color': {
    titulo: 'A todo color',
    bpm: 140, tonica: 'G', modo: 'mayor', ritmo: 'rock', swing: 0, acomp: 'rasgueo', bajo: 'raiz', espacio: 'sala',
    instrumentos: { acordes: 'guitarra', melodia: 'lead', bateria: 'bateria' },
    secciones: [
      { tipo: 'intro', compases: 4, acordes: ['G', 'C'], energia: 2 },
      { tipo: 'verso', compases: 8, acordes: ['G', 'D', 'Em', 'C'], energia: 2 },
      { tipo: 'precoro', compases: 4, acordes: ['C', 'D', 'Em', 'D'], energia: 2 },
      { tipo: 'coro', compases: 8, acordes: ['C', 'D', 'G', 'Em'], energia: 3 },
      { tipo: 'verso', compases: 8, acordes: ['G', 'D', 'Em', 'C'], energia: 2 },
      { tipo: 'precoro', compases: 4, acordes: ['C', 'D', 'Em', 'D'], energia: 2 },
      { tipo: 'coro', compases: 8, acordes: ['C', 'D', 'G', 'Em'], energia: 3 },
      { tipo: 'puente', compases: 8, acordes: ['Em', 'C', 'G', 'D'], energia: 1 },
      { tipo: 'instrumental', compases: 8, acordes: ['C', 'D', 'G', 'G'], energia: 3 },
      { tipo: 'verso', compases: 8, acordes: ['G', 'D', 'Em', 'C'], energia: 2 },
      { tipo: 'precoro', compases: 4, acordes: ['C', 'D', 'Em', 'D'], energia: 2 },
      { tipo: 'coro', compases: 8, acordes: ['C', 'D', 'G', 'Em'], energia: 3 },
      { tipo: 'coro', compases: 8, acordes: ['C', 'D', 'G', 'Em'], energia: 3 },
      { tipo: 'final', compases: 4, acordes: ['G'], energia: 2 },
    ],
    melodias: {
      verso: [[0, 2, 71], [2, 2, 71], [4, 2, 74], [6, 2, 71], [8, 4, 69], [12, 4, 67], [16, 2, 69], [18, 2, 71], [20, 4, 74], [24, 8, 76], [32, 2, 76], [34, 2, 74], [36, 2, 71], [38, 2, 74], [40, 8, 71], [48, 2, 72], [50, 2, 71], [52, 4, 69], [56, 8, 67]],
      precoro: [[0, 4, 72], [4, 4, 74], [8, 4, 76], [12, 4, 74], [16, 4, 72], [20, 4, 74], [24, 8, 79], [32, 4, 76], [36, 4, 74], [40, 8, 71], [48, 4, 74], [52, 4, 76], [56, 8, 78]],
      coro: [[0, 4, 79], [4, 2, 76], [6, 2, 79], [8, 8, 81], [16, 4, 78], [20, 2, 74], [22, 2, 78], [24, 8, 81], [32, 4, 83], [36, 4, 81], [40, 8, 79], [48, 4, 79], [52, 4, 78], [56, 8, 76]],
      puente: [[0, 8, 76], [8, 8, 79], [16, 8, 79], [24, 8, 74], [32, 8, 71], [40, 8, 74], [48, 16, 74]],
      instrumental: [[0, 2, 79], [2, 2, 76], [4, 2, 72], [6, 2, 76], [8, 8, 79], [16, 2, 81], [18, 2, 78], [20, 2, 74], [22, 2, 78], [24, 8, 81], [32, 2, 83], [34, 2, 79], [36, 2, 74], [38, 2, 79], [40, 8, 83], [48, 4, 81], [52, 4, 79], [56, 8, 78]],
    },
  },
  // Funk con sax: órgano en pulso, bajo en octavas y un coro que salta.
  'buena-vibra': {
    titulo: 'Buena vibra',
    bpm: 118, tonica: 'Bb', modo: 'mayor', ritmo: 'funk', swing: 10, acomp: 'pulso', bajo: 'octavas', espacio: 'sala',
    instrumentos: { acordes: 'organo', melodia: 'sax', bateria: 'bateria' },
    secciones: [
      { tipo: 'intro', compases: 4, acordes: ['Bbmaj7', 'Ebmaj7'], energia: 2 },
      { tipo: 'verso', compases: 8, acordes: ['Bbmaj7', 'Gm7', 'Cm7', 'F7'], energia: 2 },
      { tipo: 'coro', compases: 8, acordes: ['Ebmaj7', 'F', 'Dm7', 'Gm7'], energia: 3 },
      { tipo: 'verso', compases: 8, acordes: ['Bbmaj7', 'Gm7', 'Cm7', 'F7'], energia: 2 },
      { tipo: 'coro', compases: 8, acordes: ['Ebmaj7', 'F', 'Dm7', 'Gm7'], energia: 3 },
      { tipo: 'puente', compases: 8, acordes: ['Cm7', 'F7', 'Bbmaj7', 'Gm7'], energia: 1 },
      { tipo: 'instrumental', compases: 8, acordes: ['Ebmaj7', 'F', 'Bbmaj7', 'Bbmaj7'], energia: 3 },
      { tipo: 'coro', compases: 8, acordes: ['Ebmaj7', 'F', 'Dm7', 'Gm7'], energia: 3 },
      { tipo: 'coro', compases: 8, acordes: ['Ebmaj7', 'F', 'Dm7', 'Gm7'], energia: 3 },
      { tipo: 'final', compases: 4, acordes: ['Bbmaj7'], energia: 2 },
    ],
    melodias: {
      verso: [[0, 2, 82], [3, 1, 81], [4, 4, 77], [10, 2, 79], [12, 4, 77], [16, 2, 74], [19, 1, 75], [20, 4, 77], [26, 2, 79], [28, 4, 82], [32, 2, 82], [35, 1, 81], [36, 4, 77], [42, 2, 79], [44, 4, 82], [48, 3, 84], [51, 3, 82], [54, 2, 81], [56, 8, 77]],
      coro: [[0, 3, 82], [3, 3, 84], [6, 2, 86], [8, 8, 84], [16, 3, 81], [19, 3, 82], [22, 2, 84], [24, 8, 81], [32, 3, 82], [35, 3, 84], [38, 2, 86], [40, 6, 89], [46, 2, 86], [48, 4, 84], [52, 4, 82], [56, 8, 79]],
      puente: [[0, 8, 79], [8, 8, 81], [16, 8, 82], [24, 8, 79], [32, 8, 77], [40, 8, 79], [48, 16, 81]],
      instrumental: [[0, 1, 77], [2, 1, 79], [4, 2, 82], [8, 2, 84], [10, 2, 82], [12, 4, 79], [16, 1, 77], [18, 1, 79], [20, 2, 82], [24, 8, 86], [32, 1, 77], [34, 1, 79], [36, 2, 82], [40, 2, 84], [42, 2, 86], [44, 4, 89], [48, 8, 86], [56, 8, 82]],
    },
  },
}
