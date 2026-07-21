import type { RoomModule, EsquemaCaptura } from '../../core/registry'
import { vTexto, vNumero, vFecha } from '../../core/registry'
import { hobbiesRepo, sesionesHobbyRepo } from '../../core/data/repository'
import { normalizar } from '../../core/chat/dispatcher'
import { fechaLocalISO } from '../../core/fechaLocal'
import { HobbiesApp } from './HobbiesApp'
import { tutorialHobbies } from './tutorial'

/** Duración en minutos detectada en el texto ("30 min", "1 hora", "45m"), o 0. */
function extraerMinutos(norm: string): number {
  const minMatch = norm.match(/(\d+)\s*(?:min(?:utos?)?|m\b)/)
  const hrMatch = norm.match(/(\d+(?:\.\d+)?)\s*h(?:oras?|rs?)?/)
  if (minMatch) return parseInt(minMatch[1])
  if (hrMatch) return Math.round(parseFloat(hrMatch[1]) * 60)
  return 0
}

async function capturar(texto: string): Promise<boolean> {
  const norm = normalizar(texto)
  // El nombre de un hobby existente debe aparecer en el texto (el más largo gana).
  const lista = await hobbiesRepo.list()
  const hobby = lista
    .filter((h) => h.id != null && norm.includes(normalizar(h.nombre)))
    .sort((a, b) => b.nombre.length - a.nombre.length)[0]
  if (!hobby) return false

  const minutos = extraerMinutos(norm)
  if (minutos <= 0) return false

  await sesionesHobbyRepo.add({
    hobbyId: hobby.id!,
    fecha: fechaLocalISO(),
    minutos,
    nota: texto,
  })
  return true
}

const esquemas: EsquemaCaptura[] = [
  {
    id: 'practica',
    descripcion: 'Una sesión de práctica de un hobby o pasatiempo del usuario.',
    campos: [
      { campo: 'hobby', tipo: 'texto', descripcion: 'Nombre del hobby practicado (ej. "guitarra", "pintura", "ajedrez")', requerido: true },
      { campo: 'minutos', tipo: 'numero', descripcion: 'Minutos dedicados a la práctica', requerido: true },
      { campo: 'fecha', tipo: 'fecha', descripcion: 'Fecha yyyy-mm-dd (hoy si no se menciona)' },
      { campo: 'nota', tipo: 'texto', descripcion: 'Observación breve de la sesión' },
    ],
    guardar: async (v) => {
      const minutos = vNumero(v.minutos)
      const nombre = vTexto(v.hobby)
      if (minutos <= 0 || !nombre) return
      // Busca el hobby por nombre normalizado; si no existe se crea (la captura no descarta datos).
      const lista = await hobbiesRepo.list()
      const existente = lista.find((h) => normalizar(h.nombre) === normalizar(nombre))
      const hobbyId =
        existente?.id ??
        (await hobbiesRepo.add({
          nombre,
          emoji: '🎯',
          color: '#8b5cf6',
          creadoEn: new Date().toISOString(),
        }))
      await sesionesHobbyRepo.add({
        hobbyId,
        fecha: vFecha(v.fecha),
        minutos,
        nota: vTexto(v.nota) || undefined,
      })
    },
  },
]

const hobbies: RoomModule = {
  id: 'hobbies',
  nombre: 'Hobbies',
  icon: '🎯',
  categoria: 'complemento',
  posicion: [9, 0, 6],
  color: '#8b5cf6',
  App: HobbiesApp,
  tutorial: tutorialHobbies,
  capturar,
  esquemas,
  comandos: [
    { seccion: 'hobbies', etiqueta: 'Hobbies', nombres: ['mis hobbies', 'pasatiempos', 'mis proyectos'] },
    { seccion: 'cronograma', etiqueta: 'Cronograma', nombres: ['cronograma de hobbies', 'metas de hobbies'] },
  ],
  // `metaDiasSemana` es por hobby y semanal: el x/7 de cada uno se queda en su
  // detalle. Aquí la pregunta es la de la app entera: ¿practicaste algo hoy?
  metaDiaria: {
    clave: 'hobbies.metaDiaria',
    etiquetaEs: 'Practica hoy',
    del: async (fecha) => {
      const sesiones = (await sesionesHobbyRepo.list()).filter((s) => s.fecha === fecha)
      const minutos = sesiones.reduce((s, x) => s + x.minutos, 0)
      return {
        hecho: sesiones.length,
        objetivo: 1,
        detalle: minutos > 0 ? `${minutos} min` : undefined,
      }
    },
  },
}

export default hobbies
