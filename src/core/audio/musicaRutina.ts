import { create } from 'zustand'

/**
 * Música del reproductor de rutinas de Ejercicio. Mientras una rutina corre,
 * `useMusicaAmbiental` (la única dueña del audio generado, así no hay dos
 * arranques que se pisen) obedece este modo por encima de todo lo demás:
 * - `'on'`: suena el tema de ejercicio («energía») aunque la ambiental esté
 *   apagada; con «Mis pistas», suenan las pistas del usuario.
 * - `'off'`: silencio (el usuario la apagó desde el reproductor).
 * - `'auto'`: no hay rutina; mandan los ajustes de siempre.
 * La preferencia de apagarla se recuerda (`mh.musica.rutina`).
 */
export type ModoMusicaRutina = 'auto' | 'on' | 'off'

export const useMusicaRutina = create<{ modo: ModoMusicaRutina }>(() => ({ modo: 'auto' }))

const LS = 'mh.musica.rutina'

/** ¿Arranca la música al abrir el reproductor? (sí, salvo que el usuario la apagara). */
export function musicaRutinaEncendida(): boolean {
  try {
    return localStorage.getItem(LS) !== 'no'
  } catch {
    return true
  }
}

export function guardarMusicaRutina(encendida: boolean): void {
  try {
    localStorage.setItem(LS, encendida ? 'si' : 'no')
  } catch {
    // sin almacenamiento: la preferencia dura la sesión
  }
}
