import { hobbiesRepo, proyectosHobbyRepo, sesionesHobbyRepo } from '../../core/data/repository'
import { fechaLocalISO, isoMasDias } from '../../core/fechaLocal'
import { fotoEjemplo } from '../_shared/ejemplos/fotos'
import { porIdioma, retraducido, yaMaterializado, type PaqueteEjemplo } from '../_shared/ejemplos/tipos'
import { TEXTOS_HOBBIES } from './ejemplos.data'

/**
 * Ejemplo de fábrica de los hobbies: un hobby con tres semanas de sesiones
 * (para que el heatmap y la racha tengan de qué vivir) y un proyecto en curso.
 *
 * Las fechas cuelgan de HOY: un ejemplo fechado en el pasado no pinta el
 * heatmap ni la racha, y no enseña nada. El texto sale de `ejemplos.data.ts`
 * (los dos idiomas) y la foto del proyecto, de `public/ejemplos/`.
 */

const ID = 'hobbies.hobbies'

/** Días atrás y minutos de cada sesión (la de hoy y la de ayer dejan racha de 2). */
const SESIONES: { dias: number; minutos: number; nota: keyof (typeof TEXTOS_HOBBIES)['es'] }[] = [
  { dias: -20, minutos: 25, nota: 'sesionCorta' },
  { dias: -18, minutos: 40, nota: 'sesionLarga' },
  { dias: -15, minutos: 30, nota: 'sesionCorta' },
  { dias: -13, minutos: 55, nota: 'sesionLarga' },
  { dias: -11, minutos: 20, nota: 'sesionCorta' },
  { dias: -8, minutos: 45, nota: 'sesionLarga' },
  { dias: -6, minutos: 35, nota: 'sesionCorta' },
  { dias: -4, minutos: 60, nota: 'sesionLarga' },
  { dias: -2, minutos: 30, nota: 'sesionCorta' },
  { dias: -1, minutos: 50, nota: 'sesionLarga' },
  { dias: 0, minutos: 25, nota: 'sesionHoy' },
]

export const ejemploHobbies: PaqueteEjemplo = {
  id: ID,
  async materializar() {
    if (await yaMaterializado(ID, () => hobbiesRepo.list())) return
    const T = porIdioma(TEXTOS_HOBBIES)
    const hoy = fechaLocalISO()

    const hobbyId = await hobbiesRepo.add({
      nombre: T.hobby,
      emoji: '🎨',
      color: '#8b5cf6',
      metaDiasSemana: 3,
      creadoEn: isoMasDias(hoy, -21),
      ejemploDe: ID,
    })
    // El proyecto se crea antes que las sesiones para poder colgarle las
    // últimas: así su detalle no sale a cero.
    const foto = await fotoEjemplo('hobbies.proyecto')
    const proyectoId = await proyectosHobbyRepo.add({
      hobbyId,
      nombre: T.proyecto,
      estado: 'en-curso',
      nota: T.notaProyecto,
      imagenes: foto ? [foto] : undefined,
      creadoEn: isoMasDias(hoy, -12),
      ejemploDe: ID,
    })
    for (const s of SESIONES) {
      await sesionesHobbyRepo.add({
        hobbyId,
        fecha: isoMasDias(hoy, s.dias),
        minutos: s.minutos,
        nota: T[s.nota],
        // Solo las posteriores al proyecto cuentan para su avance.
        proyectoId: s.dias >= -12 ? proyectoId : undefined,
        ejemploDe: ID,
      })
    }
  },

  async retraducir() {
    for (const h of await hobbiesRepo.list()) {
      if (h.ejemploDe !== ID || h.id == null) continue
      const nombre = retraducido(TEXTOS_HOBBIES, h.nombre, 'hobby')
      if (nombre) await hobbiesRepo.update(h.id, { nombre })
    }
    for (const p of await proyectosHobbyRepo.list()) {
      if (p.ejemploDe !== ID || p.id == null) continue
      const nombre = retraducido(TEXTOS_HOBBIES, p.nombre, 'proyecto')
      const nota = retraducido(TEXTOS_HOBBIES, p.nota, 'notaProyecto')
      if (nombre || nota) {
        await proyectosHobbyRepo.update(p.id, { ...(nombre && { nombre }), ...(nota && { nota }) })
      }
    }
    for (const s of await sesionesHobbyRepo.list()) {
      if (s.ejemploDe !== ID || s.id == null) continue
      const nota = retraducido(TEXTOS_HOBBIES, s.nota, 'sesionCorta', 'sesionLarga', 'sesionHoy')
      if (nota) await sesionesHobbyRepo.update(s.id, { nota })
    }
  },
}
