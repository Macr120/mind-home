import { createLucideIcon } from 'lucide-react'

/**
 * Glifos propios (estilo lucide: trazo `currentColor`, 24×24) para lo que
 * lucide no trae: sombreros, vello facial y tatuajes del editor de personajes.
 * Viven en el chunk de SVGs (solo estilo Profesional), igual que el catálogo.
 */

export const SombreroVaquero = createLucideIcon('sombrero-vaquero', [
  ['path', { d: 'M2 13c1.5 3.5 18.5 3.5 20 0', key: 'ala' }],
  ['path', { d: 'M6.5 14.5 8 7c1.2-1.4 2.8-.6 4 .6 1.2-1.2 2.8-2 4-.6l1.5 7.5', key: 'copa' }],
  ['path', { d: 'M7.2 12h9.6', key: 'cinta' }],
])

export const SombreroCopa = createLucideIcon('sombrero-copa', [
  ['path', { d: 'M3 19h18', key: 'ala' }],
  ['rect', { x: '7', y: '4', width: '10', height: '15', rx: '1', key: 'copa' }],
  ['path', { d: 'M7 15h10', key: 'cinta' }],
])

export const Fedora = createLucideIcon('fedora', [
  ['path', { d: 'M2 16c3 2.5 17 2.5 20 0', key: 'ala' }],
  ['path', { d: 'M6 16.5 7.5 9c.4-1.6 2.2-2.5 4.5-1.4 2.3-1.1 4.1-.2 4.5 1.4L18 16.5', key: 'copa' }],
  ['path', { d: 'M6.8 13.5h10.4', key: 'cinta' }],
  ['path', { d: 'M12 7.6V10', key: 'pliegue' }],
])

export const Boina = createLucideIcon('boina', [
  ['path', { d: 'M3 14c0-4.5 4-8 9-8s9 3.5 9 8c0 1.5-3 2.5-9 2.5S3 15.5 3 14z', key: 'boina' }],
  ['path', { d: 'M12 6V3.5', key: 'rabito' }],
  ['path', { d: 'M5 17.5c2 1 12 1 14 0', key: 'borde' }],
])

export const GorroLana = createLucideIcon('gorro-lana', [
  ['path', { d: 'M5 15v-3a7 7 0 0 1 14 0v3', key: 'domo' }],
  ['rect', { x: '4', y: '15', width: '16', height: '5', rx: '1.5', key: 'doblez' }],
  ['circle', { cx: '12', cy: '3.5', r: '1.5', key: 'pompon' }],
  ['path', { d: 'M9 15v5M12 15v5M15 15v5', key: 'punto' }],
])

export const SombreroCharro = createLucideIcon('sombrero-charro', [
  ['path', { d: 'M1.5 15c0 2 4.7 3.5 10.5 3.5S22.5 17 22.5 15', key: 'ala' }],
  ['path', { d: 'M8 15.5 9.5 6h5l1.5 9.5', key: 'copa' }],
  ['path', { d: 'M8.6 12.5h6.8', key: 'cinta' }],
  ['path', { d: 'M4.5 16.5l1-1M19.5 16.5l-1-1', key: 'bordado' }],
])

export const SombreroMexicano = createLucideIcon('sombrero-mexicano', [
  ['path', { d: 'M1 11c1 4.5 6 6 11 6s10-1.5 11-6', key: 'ala' }],
  ['path', { d: 'M8 14.5 10.5 3.5h3L16 14.5', key: 'copa' }],
  ['path', { d: 'm9 11 1.5-1 1.5 1 1.5-1 1.5 1', key: 'greca' }],
  ['circle', { cx: '4', cy: '17.5', r: '1', key: 'borla1' }],
  ['circle', { cx: '20', cy: '17.5', r: '1', key: 'borla2' }],
])

export const SombreroPirata = createLucideIcon('sombrero-pirata', [
  ['path', { d: 'M2 16c3-8.5 17-8.5 20 0-6-2.5-14-2.5-20 0z', key: 'bicornio' }],
  ['circle', { cx: '12', cy: '11', r: '1.6', key: 'calavera' }],
  ['path', { d: 'M9.5 14.5l5-2M14.5 14.5l-5-2', key: 'huesos' }],
])

export const CascoVikingo = createLucideIcon('casco-vikingo', [
  ['path', { d: 'M6 15a6 6 0 0 1 12 0', key: 'domo' }],
  ['path', { d: 'M5 15h14', key: 'banda' }],
  ['path', { d: 'M12 15v4.5', key: 'nasal' }],
  ['path', { d: 'M6.5 12C3.5 11 2 8 2.5 4.5', key: 'cuerno1' }],
  ['path', { d: 'M17.5 12c3-1 4.5-4 4-7.5', key: 'cuerno2' }],
])

export const Bigote = createLucideIcon('bigote', [
  ['path', { d: 'M3 14c2.5 1 5-.5 6.5-2.5.8-1 2.2-1 2.5.3.3-1.3 1.7-1.3 2.5-.3C16 13.5 18.5 15 21 14c-1 2.5-4.5 3.5-7 2.3-1-.5-1.5-1-2-1.8-.5.8-1 1.3-2 1.8-2.5 1.2-6 .2-7-2.3z', key: 'bigote' }],
])

export const BigoteManubrio = createLucideIcon('bigote-manubrio', [
  ['path', { d: 'M12 13c-2.5-2.5-6.5-2.5-8 0-.8 1.3-2.5.5-2.2-1.5', key: 'izq' }],
  ['path', { d: 'M12 13c2.5-2.5 6.5-2.5 8 0 .8 1.3 2.5.5 2.2-1.5', key: 'der' }],
  ['path', { d: 'M5 14c2 1.5 5 1 7-1 2 2 5 2.5 7 1', key: 'base' }],
])

export const BigoteMorsa = createLucideIcon('bigote-morsa', [
  ['path', { d: 'M4 11c0-2.5 16-2.5 16 0v4H4z', key: 'bloque' }],
  ['path', { d: 'M5 15v3M8 15v3.5M11 15v3.5M13 15v3.5M16 15v3.5M19 15v3', key: 'cerdas' }],
])

export const Barba = createLucideIcon('barba', [
  ['path', { d: 'M4 5v6c0 5 3.5 9 8 9s8-4 8-9V5', key: 'barba' }],
  ['path', { d: 'M7 11.5c1.5-1.5 3.3-1.5 5-.5 1.7-1 3.5-1 5 .5', key: 'bigote' }],
  ['path', { d: 'M10 14.5h4', key: 'boca' }],
])

export const BarbaCandado = createLucideIcon('barba-candado', [
  ['path', { d: 'M6.5 10c2-1.5 3.5-.5 5.5-.5s3.5-1 5.5.5', key: 'bigote' }],
  ['path', { d: 'M8 10.5v3.5M16 10.5v3.5', key: 'lados' }],
  ['path', { d: 'M8 14c0 3 1.8 6 4 6s4-3 4-6', key: 'menton' }],
  ['path', { d: 'M10.5 13.5h3', key: 'boca' }],
])

export const BarbaLarga = createLucideIcon('barba-larga', [
  ['path', { d: 'M5 3v5c0 7 3 14 7 14s7-7 7-14V3', key: 'barba' }],
  ['path', { d: 'M8 8.5c1.5-1 2.5-.2 4-.2s2.5-.8 4 .2', key: 'bigote' }],
  ['path', { d: 'M12 12v6M9.5 12.5l.5 4M14.5 12.5l-.5 4', key: 'mechones' }],
])

export const Patillas = createLucideIcon('patillas', [
  ['path', { d: 'M5 3v11c0 1.5 1 2.5 2.5 2.5H9V3', key: 'izq' }],
  ['path', { d: 'M19 3v11c0 1.5-1 2.5-2.5 2.5H15V3', key: 'der' }],
  ['path', { d: 'M9 20c1.8 1.3 4.2 1.3 6 0', key: 'menton' }],
])

export const TatuajeTribal = createLucideIcon('tatuaje-tribal', [
  ['path', { d: 'M3 7c3-3 6 3 9 0s6 3 9 0', key: 'a' }],
  ['path', { d: 'M3 12c3-4 6 4 9 0s6 4 9 0', key: 'b' }],
  ['path', { d: 'M3 17c3-3 6 3 9 0s6 3 9 0', key: 'c' }],
])

export const TatuajeDragon = createLucideIcon('tatuaje-dragon', [
  ['path', { d: 'M3 19c3 0 4-3.5 6.5-3.5s3.5 3.5 6.5 3.5c2.5 0 4.5-3 3.5-6.5-.8-2.7-3.4-3.8-5.5-3', key: 'cuerpo' }],
  ['path', { d: 'M14 9.5 15 5l2 2.5 3-1.5-1 3.5', key: 'cabeza' }],
  ['path', { d: 'M9.5 15.5c-.5-3-2.5-5-5-5.5 2.5-.8 5 0 6.5 2', key: 'ala' }],
])
