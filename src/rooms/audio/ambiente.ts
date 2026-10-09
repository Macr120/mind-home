import { contextoAudio, gainMaestro } from '../../core/audio/motor'
import type { NotaAudio, ProyectoAudio } from '../../core/data/db'
import type { MoodMusica } from '../../core/state/ajustesStore'
import { desplegar, validarPlan } from './cancionIA'
import { FX_DEFAULT, MAESTRO_DEFAULT, PASOS_POR_COMPAS, segPorPaso } from './constantes'
import { crearBusMaestro, crearCadenaPista, crearRetornos } from './efectos'
import { tocarNota } from './instrumentos'

/**
 * Música ambiental de la casa hecha con el motor del Studio: una canción de
 * ~1 minuto por vibe, en bucle, que se TOCA en vivo (no se renderiza: 0 MB y
 * sin esperas). Cada receta es un plan en el mismo JSON que devuelve el
 * compositor de «Canción con IA» y pasa por el mismo `desplegar`; están
 * compuestas a mano para que ningún par de vibes comparta ritmo, acompañamiento,
 * bajo e instrumentos. La forma piensa en el bucle: sin final que se apague, la
 * última sección resuelve hacia el acorde del arranque.
 */

type Melodia = [number, number, number][]

const RECETAS: Record<MoodMusica, Record<string, unknown>> = {
  calma: {
    bpm: 72, tonica: 'A', modo: 'mayor', ritmo: 'ninguno', acomp: 'arpegio', bajo: 'raiz', espacio: 'catedral',
    instrumentos: { acordes: 'arpa', melodia: 'flauta' },
    secciones: [
      { tipo: 'intro', compases: 2, acordes: ['A', 'Dmaj7'], energia: 1 },
      { tipo: 'verso', compases: 8, acordes: ['A', 'F#m7', 'Dmaj7', 'E'], energia: 1 },
      { tipo: 'coro', compases: 8, acordes: ['Dmaj7', 'E', 'C#m7', 'F#m7'], energia: 1 },
    ],
    melodias: {
      verso: [[0, 6, 76], [6, 2, 73], [8, 8, 69], [16, 4, 78], [20, 4, 76], [24, 8, 73], [32, 6, 74], [38, 2, 73], [40, 8, 69], [48, 4, 71], [52, 4, 68], [56, 8, 71]],
      coro: [[0, 8, 78], [8, 8, 76], [16, 4, 76], [20, 4, 80], [24, 8, 76], [32, 8, 76], [40, 8, 73], [48, 4, 73], [52, 4, 71], [56, 8, 69]],
    } satisfies Record<string, Melodia>,
  },
  festivo: {
    bpm: 108, tonica: 'C', modo: 'mayor', ritmo: 'disco', acomp: 'pulso', bajo: 'octavas', espacio: 'sala',
    instrumentos: { acordes: 'piano', melodia: 'trompeta', bateria: 'bateria' },
    secciones: [
      { tipo: 'intro', compases: 4, acordes: ['C', 'F'], energia: 1 },
      { tipo: 'verso', compases: 8, acordes: ['C', 'F', 'G', 'F'], energia: 2 },
      { tipo: 'coro', compases: 8, acordes: ['F', 'G', 'Em', 'Am'], energia: 3 },
      { tipo: 'puente', compases: 8, acordes: ['Am', 'F', 'Dm', 'G'], energia: 2 },
    ],
    melodias: {
      verso: [[0, 2, 72], [2, 2, 76], [4, 4, 79], [8, 2, 76], [10, 2, 77], [12, 4, 76], [16, 2, 77], [18, 2, 81], [20, 4, 77], [24, 8, 72], [32, 2, 74], [34, 2, 79], [36, 4, 74], [40, 2, 71], [42, 2, 74], [44, 4, 79], [48, 4, 77], [52, 4, 76], [56, 8, 72]],
      coro: [[0, 4, 81], [4, 4, 79], [8, 4, 77], [12, 4, 76], [16, 4, 79], [20, 2, 74], [22, 2, 76], [24, 8, 79], [32, 4, 76], [36, 4, 79], [40, 8, 83], [48, 4, 81], [52, 4, 79], [56, 8, 76]],
      puente: [[0, 8, 72], [8, 8, 76], [16, 8, 77], [24, 8, 72], [32, 8, 74], [40, 8, 77], [48, 8, 79], [56, 8, 74]],
    } satisfies Record<string, Melodia>,
  },
  nocturno: {
    bpm: 60, tonica: 'A', modo: 'menor', ritmo: 'ninguno', acomp: 'pad', bajo: 'raiz', espacio: 'catedral',
    instrumentos: { acordes: 'pad', melodia: 'piano' },
    secciones: [
      { tipo: 'intro', compases: 4, acordes: ['Am', 'F'], energia: 1 },
      { tipo: 'verso', compases: 8, acordes: ['Am', 'F', 'C', 'G'], energia: 1 },
      { tipo: 'coro', compases: 4, acordes: ['F', 'G', 'Em', 'Am'], energia: 1 },
    ],
    melodias: {
      verso: [[0, 8, 76], [8, 4, 74], [12, 4, 72], [16, 12, 72], [28, 4, 69], [32, 8, 79], [40, 8, 76], [48, 8, 74], [56, 8, 71]],
      coro: [[0, 8, 77], [8, 8, 72], [16, 8, 79], [24, 8, 74], [32, 8, 76], [40, 8, 71], [48, 16, 69]],
    } satisfies Record<string, Melodia>,
  },
  chiptune: {
    bpm: 132, tonica: 'A', modo: 'mayor', ritmo: 'rock', acomp: 'arpegio', bajo: 'octavas', espacio: 'seco',
    instrumentos: { acordes: 'pluck', melodia: 'lead', bateria: 'bateria808' },
    secciones: [
      { tipo: 'intro', compases: 4, acordes: ['A', 'E'], energia: 1 },
      { tipo: 'verso', compases: 8, acordes: ['A', 'E', 'F#m', 'D'], energia: 2 },
      { tipo: 'coro', compases: 8, acordes: ['D', 'E', 'C#m', 'F#m'], energia: 3 },
      { tipo: 'puente', compases: 4, acordes: ['Bm', 'E'], energia: 2 },
      { tipo: 'coro', compases: 8, acordes: ['D', 'E', 'C#m', 'F#m'], energia: 3 },
    ],
    melodias: {
      verso: [[0, 2, 69], [2, 2, 73], [4, 2, 76], [6, 2, 81], [8, 4, 80], [12, 4, 76], [16, 2, 71], [18, 2, 76], [20, 2, 80], [22, 2, 83], [24, 8, 80], [32, 2, 73], [34, 2, 78], [36, 2, 81], [38, 2, 78], [40, 4, 76], [44, 4, 73], [48, 2, 74], [50, 2, 78], [52, 4, 81], [56, 8, 78]],
      coro: [[0, 4, 81], [4, 2, 78], [6, 2, 74], [8, 8, 78], [16, 4, 80], [20, 2, 76], [22, 2, 71], [24, 8, 76], [32, 4, 80], [36, 2, 76], [38, 2, 73], [40, 8, 76], [48, 4, 78], [52, 4, 81], [56, 8, 78]],
      puente: [[0, 8, 74], [8, 8, 78], [16, 8, 80], [24, 8, 76]],
    } satisfies Record<string, Melodia>,
  },
  acogedor: {
    bpm: 92, tonica: 'D', modo: 'mayor', ritmo: 'bossa', swing: 12, acomp: 'rasgueo', bajo: 'caminante', espacio: 'sala',
    instrumentos: { acordes: 'guitarra', melodia: 'piano', bateria: 'bateria' },
    secciones: [
      { tipo: 'intro', compases: 4, acordes: ['Dmaj7', 'Gmaj7', 'Dmaj7', 'A7'], energia: 1 },
      { tipo: 'verso', compases: 8, acordes: ['Dmaj7', 'Bm7', 'Em7', 'A7'], energia: 2 },
      { tipo: 'coro', compases: 8, acordes: ['Gmaj7', 'F#m7', 'Em7', 'A7'], energia: 2 },
      { tipo: 'puente', compases: 4, acordes: ['Em7', 'F#m7', 'Gmaj7', 'A7'], energia: 1 },
    ],
    melodias: {
      verso: [[0, 4, 73], [4, 2, 69], [6, 2, 66], [8, 6, 69], [14, 2, 71], [16, 4, 74], [20, 2, 73], [22, 2, 71], [24, 8, 66], [32, 4, 71], [36, 2, 67], [38, 2, 64], [40, 6, 67], [46, 2, 69], [48, 4, 73], [52, 4, 71], [56, 8, 69]],
      coro: [[0, 2, 74], [2, 2, 76], [4, 4, 78], [8, 4, 74], [12, 4, 71], [16, 6, 73], [22, 2, 76], [24, 8, 73], [32, 2, 71], [34, 2, 74], [36, 4, 79], [40, 4, 78], [44, 4, 74], [48, 4, 76], [52, 4, 73], [56, 8, 69]],
      puente: [[0, 8, 71], [8, 8, 74], [16, 8, 73], [24, 8, 76], [32, 8, 78], [40, 8, 74], [48, 8, 76], [56, 8, 73]],
    } satisfies Record<string, Melodia>,
  },
  energia: {
    bpm: 126, tonica: 'A', modo: 'menor', ritmo: 'house', acomp: 'bloques', bajo: 'octavas', espacio: 'sala',
    instrumentos: { acordes: 'pluck', melodia: 'lead', bateria: 'bateria' },
    secciones: [
      { tipo: 'intro', compases: 4, acordes: ['Am', 'F'], energia: 1 },
      { tipo: 'verso', compases: 8, acordes: ['Am', 'F', 'G', 'Em'], energia: 2 },
      { tipo: 'coro', compases: 8, acordes: ['F', 'G', 'Am', 'Am'], energia: 3 },
      { tipo: 'puente', compases: 4, acordes: ['Dm', 'Dm', 'Em', 'Em'], energia: 1 },
      { tipo: 'coro', compases: 8, acordes: ['F', 'G', 'Am', 'Am'], energia: 3 },
    ],
    melodias: {
      verso: [[0, 2, 76], [4, 2, 76], [6, 2, 79], [8, 4, 81], [12, 4, 79], [16, 2, 77], [20, 2, 77], [22, 2, 81], [24, 8, 81], [32, 2, 79], [36, 2, 79], [38, 2, 83], [40, 8, 79], [48, 4, 76], [52, 4, 79], [56, 8, 76]],
      coro: [[0, 4, 81], [4, 4, 77], [8, 4, 72], [12, 4, 77], [16, 4, 83], [20, 4, 79], [24, 4, 74], [28, 4, 79], [32, 4, 84], [36, 4, 81], [40, 4, 76], [44, 4, 81], [48, 8, 84], [56, 8, 81]],
      puente: [[0, 16, 74], [16, 16, 76]],
    } satisfies Record<string, Melodia>,
  },
  estudio: {
    bpm: 76, tonica: 'G', modo: 'mayor', ritmo: 'lofi', swing: 22, acomp: 'bloques', bajo: 'raiz', espacio: 'sala',
    instrumentos: { acordes: 'piano', melodia: 'campanas', bateria: 'bateria' },
    secciones: [
      { tipo: 'intro', compases: 4, acordes: ['Gmaj7', 'Em7'], energia: 1 },
      { tipo: 'verso', compases: 8, acordes: ['Gmaj7', 'Em7', 'Am7', 'Cmaj7'], energia: 2 },
      { tipo: 'coro', compases: 8, acordes: ['Cmaj7', 'Bm7', 'Am7', 'D7'], energia: 2 },
    ],
    melodias: {
      verso: [[0, 6, 71], [6, 2, 74], [8, 8, 78], [16, 4, 76], [20, 4, 74], [24, 8, 71], [32, 6, 72], [38, 2, 76], [40, 8, 79], [48, 4, 76], [52, 4, 74], [56, 8, 71]],
      coro: [[0, 4, 79], [4, 4, 76], [8, 8, 72], [16, 4, 78], [20, 4, 74], [24, 8, 71], [32, 4, 76], [36, 4, 72], [40, 8, 69], [48, 4, 72], [52, 4, 74], [56, 8, 78]],
    } satisfies Record<string, Melodia>,
  },
  arcade: {
    bpm: 138, tonica: 'A', modo: 'mayor', ritmo: 'disco', acomp: 'pulso', bajo: 'octavas', espacio: 'seco',
    instrumentos: { acordes: 'pluck', melodia: 'lead', bateria: 'bateria808' },
    secciones: [
      { tipo: 'intro', compases: 4, acordes: ['A', 'D'], energia: 1 },
      { tipo: 'verso', compases: 8, acordes: ['A', 'D', 'E', 'F#m'], energia: 2 },
      { tipo: 'coro', compases: 8, acordes: ['D', 'E', 'A', 'A'], energia: 3 },
      { tipo: 'puente', compases: 8, acordes: ['F#m', 'D', 'E', 'E'], energia: 2 },
      { tipo: 'coro', compases: 8, acordes: ['D', 'E', 'A', 'A'], energia: 3 },
    ],
    melodias: {
      verso: [[0, 2, 69], [2, 2, 73], [4, 2, 76], [6, 2, 81], [8, 2, 76], [10, 2, 73], [12, 2, 69], [14, 2, 64], [16, 2, 74], [18, 2, 78], [20, 2, 81], [22, 2, 78], [24, 2, 74], [26, 2, 69], [28, 4, 66], [32, 2, 76], [34, 2, 80], [36, 2, 83], [38, 2, 80], [40, 2, 76], [42, 2, 71], [44, 4, 68], [48, 2, 73], [50, 2, 78], [52, 2, 81], [54, 2, 78], [56, 8, 73]],
      coro: [[0, 4, 81], [4, 4, 78], [8, 8, 74], [16, 4, 80], [20, 4, 76], [24, 8, 83], [32, 4, 81], [36, 4, 76], [40, 4, 73], [44, 4, 76], [48, 16, 81]],
      puente: [[0, 8, 73], [8, 8, 78], [16, 8, 74], [24, 8, 78], [32, 8, 76], [40, 8, 80], [48, 8, 83], [56, 8, 80]],
    } satisfies Record<string, Melodia>,
  },
  bosque: {
    bpm: 66, tonica: 'E', modo: 'mayor', ritmo: 'ninguno', acomp: 'arpegio', bajo: 'raiz', espacio: 'catedral',
    instrumentos: { acordes: 'guitarra', melodia: 'flauta' },
    secciones: [
      { tipo: 'intro', compases: 4, acordes: ['Esus2', 'Aadd9'], energia: 1 },
      { tipo: 'verso', compases: 8, acordes: ['Esus2', 'Bsus4', 'C#m7', 'Aadd9'], energia: 1 },
      { tipo: 'coro', compases: 4, acordes: ['Amaj7', 'B', 'Esus2', 'Esus2'], energia: 1 },
    ],
    melodias: {
      verso: [[0, 4, 71], [4, 4, 73], [8, 8, 76], [16, 8, 71], [24, 4, 66], [28, 4, 68], [32, 6, 68], [38, 2, 71], [40, 8, 73], [48, 8, 69], [56, 8, 71]],
      coro: [[0, 8, 73], [8, 8, 76], [16, 8, 75], [24, 8, 71], [32, 16, 71], [48, 16, 64]],
    } satisfies Record<string, Melodia>,
  },
  viaje: {
    bpm: 104, tonica: 'C', modo: 'mayor', ritmo: 'reggae', acomp: 'rasgueo', bajo: 'bombo', espacio: 'sala',
    instrumentos: { acordes: 'guitarra', melodia: 'flauta', bateria: 'bateria' },
    secciones: [
      { tipo: 'intro', compases: 4, acordes: ['C', 'G'], energia: 1 },
      { tipo: 'verso', compases: 8, acordes: ['C', 'G', 'Am', 'F'], energia: 2 },
      { tipo: 'coro', compases: 8, acordes: ['F', 'G', 'C', 'Am'], energia: 2 },
      { tipo: 'puente', compases: 8, acordes: ['Am', 'Em', 'F', 'G'], energia: 2 },
    ],
    melodias: {
      verso: [[0, 4, 76], [4, 4, 79], [8, 8, 72], [16, 4, 74], [20, 4, 79], [24, 8, 71], [32, 4, 72], [36, 4, 76], [40, 8, 81], [48, 4, 77], [52, 4, 76], [56, 8, 72]],
      coro: [[0, 6, 81], [6, 2, 79], [8, 8, 77], [16, 6, 79], [22, 2, 77], [24, 8, 74], [32, 6, 76], [38, 2, 79], [40, 8, 84], [48, 8, 81], [56, 8, 76]],
      puente: [[0, 8, 72], [8, 8, 76], [16, 8, 71], [24, 8, 79], [32, 8, 77], [40, 8, 72], [48, 8, 74], [56, 8, 79]],
    } satisfies Record<string, Melodia>,
  },
  carrera: {
    bpm: 148, tonica: 'E', modo: 'menor', ritmo: 'rock', acomp: 'pulso', bajo: 'octavas', espacio: 'seco',
    instrumentos: { acordes: 'guitarra', melodia: 'lead', bateria: 'bateria' },
    secciones: [
      { tipo: 'intro', compases: 4, acordes: ['Em', 'C'], energia: 2 },
      { tipo: 'verso', compases: 8, acordes: ['Em', 'C', 'D', 'Bm'], energia: 2 },
      { tipo: 'coro', compases: 8, acordes: ['C', 'D', 'Em', 'Em'], energia: 3 },
      { tipo: 'puente', compases: 8, acordes: ['Am', 'C', 'D', 'B7'], energia: 2 },
      { tipo: 'coro', compases: 8, acordes: ['C', 'D', 'Em', 'Em'], energia: 3 },
    ],
    melodias: {
      verso: [[0, 2, 64], [2, 2, 64], [4, 2, 67], [6, 2, 69], [8, 2, 71], [10, 2, 71], [12, 2, 74], [14, 2, 76], [16, 2, 72], [18, 2, 72], [20, 2, 76], [22, 2, 79], [24, 8, 76], [32, 2, 74], [34, 2, 74], [36, 2, 78], [38, 2, 81], [40, 8, 78], [48, 2, 71], [50, 2, 74], [52, 2, 78], [54, 2, 74], [56, 8, 71]],
      coro: [[0, 4, 79], [4, 4, 76], [8, 8, 72], [16, 4, 81], [20, 4, 78], [24, 8, 74], [32, 4, 83], [36, 4, 79], [40, 4, 76], [44, 4, 79], [48, 16, 76]],
      puente: [[0, 8, 72], [8, 8, 76], [16, 8, 76], [24, 8, 79], [32, 8, 78], [40, 8, 81], [48, 8, 78], [56, 8, 75]],
    } satisfies Record<string, Melodia>,
  },
  cajita: {
    bpm: 84, tonica: 'E', modo: 'mayor', ritmo: 'ninguno', acomp: 'pad', bajo: 'raiz', espacio: 'catedral',
    instrumentos: { acordes: 'arpa', melodia: 'campanas' },
    secciones: [
      { tipo: 'intro', compases: 4, acordes: ['E', 'C#m'], energia: 1 },
      { tipo: 'verso', compases: 8, acordes: ['E', 'C#m', 'A', 'B'], energia: 1 },
      { tipo: 'coro', compases: 8, acordes: ['A', 'B', 'G#m', 'C#m'], energia: 1 },
    ],
    melodias: {
      verso: [[0, 2, 83], [2, 2, 80], [4, 4, 76], [8, 4, 80], [12, 4, 83], [16, 4, 80], [20, 4, 76], [24, 8, 73], [32, 2, 81], [34, 2, 78], [36, 4, 73], [40, 4, 76], [44, 4, 81], [48, 4, 78], [52, 4, 75], [56, 8, 71]],
      coro: [[0, 4, 81], [4, 4, 76], [8, 8, 73], [16, 4, 78], [20, 4, 83], [24, 8, 78], [32, 4, 80], [36, 4, 75], [40, 8, 71], [48, 4, 73], [52, 4, 76], [56, 8, 80]],
    } satisfies Record<string, Melodia>,
  },
  lectura: {
    bpm: 64, tonica: 'F', modo: 'mayor', ritmo: 'ninguno', acomp: 'arpegio', bajo: 'raiz', espacio: 'catedral',
    instrumentos: { acordes: 'piano', melodia: 'violines' },
    secciones: [
      { tipo: 'intro', compases: 4, acordes: ['Fmaj7', 'Bbmaj7'], energia: 1 },
      { tipo: 'verso', compases: 8, acordes: ['Fmaj7', 'Bbmaj7', 'Gm7', 'C7'], energia: 1 },
      { tipo: 'coro', compases: 4, acordes: ['Dm7', 'Bbmaj7', 'Gm7', 'C7'], energia: 1 },
    ],
    melodias: {
      verso: [[0, 8, 72], [8, 8, 69], [16, 8, 74], [24, 8, 70], [32, 8, 70], [40, 8, 67], [48, 8, 72], [56, 8, 76]],
      coro: [[0, 8, 77], [8, 8, 74], [16, 8, 74], [24, 8, 69], [32, 8, 70], [40, 8, 74], [48, 16, 72]],
    } satisfies Record<string, Melodia>,
  },
  oficina: {
    bpm: 100, tonica: 'C', modo: 'mayor', ritmo: 'balada', acomp: 'pulso', bajo: 'raiz', espacio: 'seco',
    instrumentos: { acordes: 'pluck', melodia: 'piano', bateria: 'bateria' },
    secciones: [
      { tipo: 'intro', compases: 4, acordes: ['Dm7', 'G7'], energia: 1 },
      { tipo: 'verso', compases: 8, acordes: ['Dm7', 'G7', 'Cmaj7', 'Cmaj7'], energia: 2 },
      { tipo: 'coro', compases: 8, acordes: ['Fmaj7', 'Em7', 'Dm7', 'G7'], energia: 2 },
      { tipo: 'puente', compases: 4, acordes: ['Am7', 'D7'], energia: 1 },
    ],
    melodias: {
      verso: [[0, 2, 74], [2, 2, 77], [4, 4, 81], [8, 4, 77], [12, 4, 74], [16, 2, 71], [18, 2, 74], [20, 4, 77], [24, 8, 79], [32, 4, 76], [36, 4, 79], [40, 8, 83], [48, 4, 79], [52, 4, 76], [56, 8, 72]],
      coro: [[0, 4, 81], [4, 4, 76], [8, 8, 72], [16, 4, 79], [20, 4, 74], [24, 8, 71], [32, 4, 77], [36, 4, 72], [40, 8, 69], [48, 4, 71], [52, 4, 74], [56, 8, 77]],
      puente: [[0, 8, 76], [8, 8, 72], [16, 8, 78], [24, 8, 74]],
    } satisfies Record<string, Melodia>,
  },
  taller: {
    bpm: 112, tonica: 'G', modo: 'mayor', ritmo: 'funk', swing: 10, acomp: 'bloques', bajo: 'octavas', espacio: 'sala',
    instrumentos: { acordes: 'organo', melodia: 'campanas', bateria: 'bateria' },
    secciones: [
      { tipo: 'intro', compases: 4, acordes: ['Gsus4', 'G'], energia: 1 },
      { tipo: 'verso', compases: 8, acordes: ['G', 'Csus2', 'Em7', 'Dsus4'], energia: 2 },
      { tipo: 'coro', compases: 8, acordes: ['C', 'D', 'Bm7', 'Em7'], energia: 3 },
      { tipo: 'puente', compases: 8, acordes: ['Am7', 'D', 'Gsus4', 'G'], energia: 2 },
    ],
    melodias: {
      verso: [[0, 1, 79], [2, 1, 74], [4, 1, 71], [6, 2, 74], [8, 1, 79], [10, 1, 81], [12, 4, 83], [16, 1, 79], [18, 1, 76], [20, 1, 74], [22, 2, 76], [24, 4, 79], [28, 4, 74], [32, 1, 79], [34, 1, 76], [36, 1, 71], [38, 2, 74], [40, 4, 76], [44, 4, 79], [48, 2, 81], [50, 2, 79], [52, 4, 74], [56, 8, 79]],
      coro: [[0, 2, 76], [2, 2, 79], [4, 4, 84], [8, 4, 79], [12, 4, 76], [16, 2, 78], [18, 2, 74], [20, 4, 81], [24, 8, 78], [32, 4, 83], [36, 4, 78], [40, 8, 74], [48, 4, 79], [52, 4, 76], [56, 8, 71]],
      puente: [[0, 8, 72], [8, 8, 76], [16, 8, 78], [24, 8, 81], [32, 8, 79], [40, 8, 74], [48, 16, 79]],
    } satisfies Record<string, Melodia>,
  },
  digital: {
    bpm: 118, tonica: 'D', modo: 'menor', ritmo: 'house', acomp: 'arpegio', bajo: 'octavas', espacio: 'sala',
    instrumentos: { acordes: 'pluck', melodia: 'lead', bateria: 'bateria808' },
    secciones: [
      { tipo: 'intro', compases: 4, acordes: ['Dm9', 'C'], energia: 1 },
      { tipo: 'verso', compases: 8, acordes: ['Dm9', 'C', 'Gm', 'Am'], energia: 2 },
      { tipo: 'coro', compases: 8, acordes: ['Bb', 'C', 'Dm', 'Dm'], energia: 3 },
      { tipo: 'puente', compases: 8, acordes: ['Gm', 'Am', 'Bb', 'C'], energia: 2 },
    ],
    melodias: {
      verso: [[0, 2, 74], [2, 2, 77], [4, 2, 81], [6, 2, 77], [8, 4, 76], [12, 4, 74], [16, 2, 72], [18, 2, 76], [20, 2, 79], [22, 2, 76], [24, 8, 72], [32, 2, 79], [34, 2, 82], [36, 2, 74], [38, 2, 79], [40, 8, 77], [48, 2, 81], [50, 2, 76], [52, 2, 72], [54, 2, 76], [56, 8, 81]],
      coro: [[0, 4, 82], [4, 4, 77], [8, 8, 74], [16, 4, 79], [20, 4, 76], [24, 8, 72], [32, 4, 77], [36, 4, 81], [40, 8, 81], [48, 16, 74]],
      puente: [[0, 8, 79], [8, 8, 74], [16, 8, 76], [24, 8, 72], [32, 8, 77], [40, 8, 82], [48, 8, 79], [56, 8, 76]],
    } satisfies Record<string, Melodia>,
  },
  noticias: {
    bpm: 108, tonica: 'C', modo: 'mayor', ritmo: 'rock', acomp: 'pulso', bajo: 'raiz', espacio: 'seco',
    instrumentos: { acordes: 'organo', melodia: 'trompeta', bateria: 'bateria' },
    secciones: [
      { tipo: 'intro', compases: 4, acordes: ['C', 'G'], energia: 1 },
      { tipo: 'verso', compases: 8, acordes: ['C', 'F', 'G', 'C'], energia: 2 },
      { tipo: 'coro', compases: 8, acordes: ['Am', 'F', 'G', 'G'], energia: 2 },
      { tipo: 'puente', compases: 8, acordes: ['F', 'G', 'Em', 'Am'], energia: 2 },
    ],
    melodias: {
      verso: [[0, 2, 72], [2, 2, 76], [4, 2, 79], [6, 2, 84], [8, 8, 79], [16, 2, 77], [18, 2, 81], [20, 4, 84], [24, 8, 81], [32, 2, 79], [34, 2, 83], [36, 4, 83], [40, 8, 79], [48, 4, 76], [52, 4, 79], [56, 8, 72]],
      coro: [[0, 4, 81], [4, 4, 76], [8, 8, 72], [16, 4, 77], [20, 4, 81], [24, 8, 84], [32, 4, 83], [36, 4, 79], [40, 8, 74], [48, 16, 79]],
      puente: [[0, 8, 77], [8, 8, 81], [16, 8, 79], [24, 8, 74], [32, 8, 76], [40, 8, 79], [48, 8, 81], [56, 8, 76]],
    } satisfies Record<string, Melodia>,
  },
  campo: {
    bpm: 96, tonica: 'D', modo: 'mayor', ritmo: 'balada', swing: 20, acomp: 'rasgueo', bajo: 'raiz', espacio: 'sala',
    instrumentos: { acordes: 'guitarra', melodia: 'violines', bateria: 'bateria' },
    secciones: [
      { tipo: 'intro', compases: 4, acordes: ['D', 'A'], energia: 1 },
      { tipo: 'verso', compases: 8, acordes: ['D', 'A', 'G', 'D'], energia: 2 },
      { tipo: 'coro', compases: 8, acordes: ['G', 'A', 'Bm', 'D'], energia: 2 },
      { tipo: 'puente', compases: 4, acordes: ['Em', 'A'], energia: 1 },
    ],
    melodias: {
      verso: [[0, 2, 74], [2, 2, 78], [4, 4, 81], [8, 4, 78], [12, 4, 74], [16, 2, 73], [18, 2, 76], [20, 4, 81], [24, 8, 76], [32, 2, 79], [34, 2, 83], [36, 4, 79], [40, 4, 74], [44, 4, 71], [48, 4, 78], [52, 4, 76], [56, 8, 74]],
      coro: [[0, 4, 83], [4, 4, 79], [8, 8, 74], [16, 4, 81], [20, 4, 76], [24, 8, 73], [32, 4, 78], [36, 4, 74], [40, 8, 71], [48, 4, 74], [52, 4, 78], [56, 8, 81]],
      puente: [[0, 8, 76], [8, 8, 79], [16, 8, 81], [24, 8, 76]],
    } satisfies Record<string, Melodia>,
  },
  deporte: {
    bpm: 120, tonica: 'E', modo: 'mayor', ritmo: 'rock', acomp: 'bloques', bajo: 'bombo', espacio: 'sala',
    instrumentos: { acordes: 'guitarra', melodia: 'trompeta', bateria: 'bateria' },
    secciones: [
      { tipo: 'intro', compases: 4, acordes: ['E', 'A'], energia: 1 },
      { tipo: 'verso', compases: 8, acordes: ['E', 'B', 'C#m', 'A'], energia: 2 },
      { tipo: 'coro', compases: 8, acordes: ['A', 'B', 'E', 'E'], energia: 3 },
      { tipo: 'puente', compases: 4, acordes: ['C#m', 'B'], energia: 2 },
      { tipo: 'coro', compases: 8, acordes: ['A', 'B', 'E', 'E'], energia: 3 },
    ],
    melodias: {
      verso: [[0, 4, 76], [4, 2, 80], [6, 2, 83], [8, 8, 80], [16, 4, 78], [20, 2, 75], [22, 2, 78], [24, 8, 83], [32, 4, 80], [36, 2, 76], [38, 2, 73], [40, 8, 76], [48, 4, 81], [52, 4, 78], [56, 8, 73]],
      coro: [[0, 4, 81], [4, 4, 83], [8, 8, 81], [16, 4, 83], [20, 4, 78], [24, 8, 75], [32, 4, 76], [36, 4, 80], [40, 4, 83], [44, 4, 80], [48, 16, 76]],
      puente: [[0, 8, 80], [8, 8, 76], [16, 8, 78], [24, 8, 83]],
    } satisfies Record<string, Melodia>,
  },
  ruta: {
    bpm: 100, tonica: 'G', modo: 'mayor', ritmo: 'rock', acomp: 'rasgueo', bajo: 'caminante', espacio: 'sala',
    instrumentos: { acordes: 'guitarra', melodia: 'sax', bateria: 'bateria' },
    secciones: [
      { tipo: 'intro', compases: 4, acordes: ['G', 'D'], energia: 1 },
      { tipo: 'verso', compases: 8, acordes: ['G', 'D', 'Em', 'C'], energia: 2 },
      { tipo: 'coro', compases: 8, acordes: ['C', 'D', 'G', 'Em'], energia: 2 },
      { tipo: 'puente', compases: 4, acordes: ['Am', 'D'], energia: 1 },
    ],
    melodias: {
      verso: [[0, 4, 79], [4, 4, 74], [8, 8, 71], [16, 4, 78], [20, 4, 74], [24, 8, 69], [32, 4, 76], [36, 4, 79], [40, 8, 83], [48, 4, 79], [52, 4, 76], [56, 8, 72]],
      coro: [[0, 6, 84], [6, 2, 83], [8, 8, 79], [16, 6, 81], [22, 2, 78], [24, 8, 74], [32, 4, 74], [36, 4, 79], [40, 8, 83], [48, 8, 79], [56, 8, 76]],
      puente: [[0, 8, 76], [8, 8, 72], [16, 8, 78], [24, 8, 81]],
    } satisfies Record<string, Melodia>,
  },
  tactico: {
    bpm: 120, tonica: 'D', modo: 'menor', ritmo: 'trap', acomp: 'pad', bajo: 'bombo', espacio: 'seco',
    instrumentos: { acordes: 'violines', melodia: 'trompeta', bateria: 'bateria' },
    secciones: [
      { tipo: 'intro', compases: 4, acordes: ['Dm', 'Bb'], energia: 1 },
      { tipo: 'verso', compases: 8, acordes: ['Dm', 'Bb', 'Gm', 'A'], energia: 2 },
      { tipo: 'coro', compases: 8, acordes: ['Bb', 'C', 'Dm', 'A'], energia: 3 },
      { tipo: 'puente', compases: 4, acordes: ['Gm', 'A'], energia: 1 },
      { tipo: 'coro', compases: 8, acordes: ['Bb', 'C', 'Dm', 'A'], energia: 3 },
    ],
    melodias: {
      verso: [[0, 2, 74], [2, 2, 74], [4, 4, 77], [8, 2, 81], [10, 2, 77], [12, 4, 74], [16, 2, 74], [18, 2, 74], [20, 4, 77], [24, 8, 82], [32, 2, 79], [34, 2, 79], [36, 4, 82], [40, 8, 74], [48, 4, 76], [52, 4, 79], [56, 8, 81]],
      coro: [[0, 4, 82], [4, 4, 77], [8, 8, 74], [16, 4, 79], [20, 4, 76], [24, 8, 72], [32, 4, 77], [36, 4, 81], [40, 8, 74], [48, 16, 76]],
      puente: [[0, 16, 79], [16, 16, 76]],
    } satisfies Record<string, Melodia>,
  },
}

const cache = new Map<MoodMusica, ProyectoAudio>()

/** La canción de un vibe, desplegada en pistas (memoizada: siempre la misma). */
export function proyectoAmbiente(mood: MoodMusica): ProyectoAudio {
  const hecho = cache.get(mood)
  if (hecho) return hecho
  const plan = validarPlan(RECETAS[mood], false, { maxCompases: 128 })
  const { compases, pistas } = desplegar(plan, false, 'mujer', { maxNotas: 4000, repetirMelodias: true })
  const p: ProyectoAudio = {
    nombre: mood,
    bpm: plan.bpm,
    compases,
    swing: plan.swing,
    pistas,
    creadoEn: '',
    actualizadoEn: '',
  }
  cache.set(mood, p)
  return p
}

// ─── Reproductor en vivo ────────────────────────────────────────────────────

const TICK_MS = 100
const LOOKAHEAD_S = 0.3
/** La ambiental va por debajo de una canción: es fondo. */
const NIVEL = 0.55

interface Sesion {
  mood: MoodMusica
  ctx: AudioContext
  salida: GainNode
  desconectar: () => void
  /** Notas por paso entero: [índice de pista, nota]. */
  porPaso: Map<number, [number, NotaAudio][]>
  entradas: GainNode[]
  instrumentos: ProyectoAudio['pistas']
  spb: number
  swingSeg: number
  totalPasos: number
  paso: number
  proximaT: number
  timer: number | null
  /** Fundido de salida en curso (se cancela si vuelven a pedir el mismo vibe). */
  apagando: number | null
}

let actual: Sesion | null = null

function agendar(s: Sesion) {
  while (s.proximaT < s.ctx.currentTime + LOOKAHEAD_S) {
    for (const [i, n] of s.porPaso.get(s.paso) ?? []) {
      const t = s.proximaT + (n[0] - s.paso) * s.spb + (s.paso % 2 === 1 ? s.swingSeg : 0)
      tocarNota(s.ctx, s.entradas[i], s.instrumentos[i].instrumento, t, n[2], Math.max(0.06, n[1] * s.spb), n[3] / 127, {
        sinte: s.instrumentos[i].sinte,
      })
    }
    s.proximaT += s.spb
    s.paso = (s.paso + 1) % s.totalPasos // al terminar vuelve al compás 0, sin hueco
  }
}

function arrancarReloj(s: Sesion) {
  if (s.timer != null) return
  // Tras una pausa (pestaña oculta) se re-sincroniza en vez de «alcanzar» lo perdido.
  if (s.proximaT < s.ctx.currentTime) s.proximaT = s.ctx.currentTime + 0.05
  agendar(s)
  s.timer = window.setInterval(() => agendar(s), TICK_MS)
}

function pararReloj(s: Sesion) {
  if (s.timer != null) window.clearInterval(s.timer)
  s.timer = null
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!actual || actual.apagando != null) return
    if (document.hidden) pararReloj(actual)
    else arrancarReloj(actual)
  })
}

function apagar(s: Sesion, fadeMs: number) {
  if (s.apagando != null) return
  const t = s.ctx.currentTime
  s.salida.gain.cancelScheduledValues(t)
  s.salida.gain.setValueAtTime(s.salida.gain.value, t)
  s.salida.gain.linearRampToValueAtTime(0, t + fadeMs / 1000)
  s.apagando = window.setTimeout(() => {
    pararReloj(s)
    s.desconectar()
    if (actual === s) actual = null
  }, fadeMs + 300)
}

export function iniciar(mood: MoodMusica): void {
  const ctx = contextoAudio()
  const maestroCasa = gainMaestro()
  if (!ctx || !maestroCasa) return
  if (actual?.mood === mood) {
    // El mismo vibe que se estaba apagando: sigue sonando donde iba.
    if (actual.apagando != null) {
      window.clearTimeout(actual.apagando)
      actual.apagando = null
      const t = ctx.currentTime
      actual.salida.gain.cancelScheduledValues(t)
      actual.salida.gain.setValueAtTime(actual.salida.gain.value, t)
      actual.salida.gain.linearRampToValueAtTime(NIVEL, t + 0.4)
      if (!document.hidden) arrancarReloj(actual)
    }
    return
  }
  if (actual) {
    apagar(actual, 600)
    actual = null
  }

  const p = proyectoAmbiente(mood)
  const salida = ctx.createGain()
  salida.gain.value = 0
  salida.connect(maestroCasa)
  const maestro = crearBusMaestro(ctx, salida, MAESTRO_DEFAULT)
  const retornos = crearRetornos(ctx, maestro.entrada, p.bpm)
  const cadenas = p.pistas.map((pista) => crearCadenaPista(ctx, maestro.entrada, retornos, pista.efectos ?? FX_DEFAULT))
  const entradas = p.pistas.map((pista, i) => {
    const g = ctx.createGain()
    g.gain.value = pista.volumen
    g.connect(cadenas[i].entrada)
    return g
  })
  const porPaso = new Map<number, [number, NotaAudio][]>()
  p.pistas.forEach((pista, i) => {
    for (const n of pista.notas) {
      const k = Math.floor(n[0])
      const lista = porPaso.get(k) ?? []
      lista.push([i, n])
      porPaso.set(k, lista)
    }
  })
  const spb = segPorPaso(p.bpm)
  const s: Sesion = {
    mood,
    ctx,
    salida,
    desconectar: () => {
      entradas.forEach((g) => g.disconnect())
      cadenas.forEach((c) => c.desconectar())
      retornos.desconectar()
      maestro.desconectar()
      salida.disconnect()
    },
    porPaso,
    entradas,
    instrumentos: p.pistas,
    spb,
    swingSeg: ((p.swing ?? 0) / 100) * spb,
    totalPasos: p.compases * PASOS_POR_COMPAS,
    paso: 0,
    proximaT: ctx.currentTime + 0.1,
    timer: null,
    apagando: null,
  }
  actual = s
  salida.gain.setValueAtTime(0, ctx.currentTime)
  salida.gain.linearRampToValueAtTime(NIVEL, ctx.currentTime + 0.8)
  if (!document.hidden) arrancarReloj(s)
}

export function detener(fadeMs = 400): void {
  if (actual) apagar(actual, fadeMs)
}
