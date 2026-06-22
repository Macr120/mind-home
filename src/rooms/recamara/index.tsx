import type { RoomModule, EsquemaCaptura } from '../../core/registry'
import { vTexto, vNumero, vFecha } from '../../core/registry'
import { suenoRepo, anecdotasRepo } from '../../core/data/repository'
import { normalizar } from '../../core/chat/dispatcher'
import { RecamaraApp } from './RecamaraApp'

async function capturar(texto: string): Promise<boolean> {
  const norm = normalizar(texto)

  // Detecta horas: "dormí 7 horas", "7h", "7 hrs", "siete horas" (solo dígitos por ahora)
  const horasMatch = norm.match(/(\d+(?:\.\d+)?)\s*(?:h(?:r?s?|oras?))/)
    ?? norm.match(/(?:dormi|dorme|dormir|sueno|descanso)[^0-9]*(\d+(?:\.\d+)?)/)
  if (!horasMatch) return false

  const horas = parseFloat(horasMatch[1])
  if (horas <= 0 || horas > 24) return false

  // Calidad opcional: "calidad 4", "4/5", "calidad: 4"
  const calidadMatch = norm.match(/(?:calidad|quality)[:\s]*(\d)|(\d)\s*\/\s*5/)
  const calidad = calidadMatch
    ? Math.min(5, Math.max(1, parseInt(calidadMatch[1] ?? calidadMatch[2])))
    : 3 // default neutral

  await suenoRepo.add({
    fecha: new Date().toISOString().slice(0, 10),
    horas,
    calidad,
    nota: texto,
  })
  return true
}

const esquemas: EsquemaCaptura[] = [
  {
    id: 'sueno',
    descripcion: 'Cómo durmió el usuario una noche.',
    campos: [
      { campo: 'horas', tipo: 'numero', descripcion: 'Horas dormidas (0–24, admite decimales)', requerido: true },
      { campo: 'calidad', tipo: 'numero', descripcion: 'Calidad del sueño 1–5 (3 si no se menciona)' },
      { campo: 'fecha', tipo: 'fecha', descripcion: 'Fecha yyyy-mm-dd (hoy si no se menciona)' },
      { campo: 'nota', tipo: 'texto', descripcion: 'Observación breve (despertares, sueños, etc.)' },
    ],
    guardar: async (v) => {
      const horas = vNumero(v.horas)
      if (horas <= 0 || horas > 24) return
      await suenoRepo.add({
        fecha: vFecha(v.fecha),
        horas,
        calidad: Math.min(5, Math.max(1, vNumero(v.calidad, 3))),
        nota: vTexto(v.nota) || undefined,
      })
    },
  },
  {
    id: 'anecdota',
    descripcion: 'Una anécdota o momento personal que el usuario quiere recordar.',
    campos: [
      { campo: 'titulo', tipo: 'texto', descripcion: 'Título corto de la anécdota', requerido: true },
      { campo: 'contenido', tipo: 'texto', descripcion: 'La anécdota completa, en palabras del usuario', requerido: true },
      { campo: 'animo', tipo: 'texto', descripcion: 'Ánimo asociado: un emoji o una palabra' },
      { campo: 'fecha', tipo: 'fecha', descripcion: 'Fecha yyyy-mm-dd (hoy si no se menciona)' },
    ],
    guardar: async (v) => {
      await anecdotasRepo.add({
        fecha: vFecha(v.fecha),
        titulo: vTexto(v.titulo, 'Anécdota'),
        contenido: vTexto(v.contenido),
        animo: vTexto(v.animo, '🙂'),
      })
    },
  },
]

const recamara: RoomModule = {
  id: 'recamara',
  nombre: 'Recámara · Sueño',
  icon: '🛏️',
  categoria: 'cuerpo',
  posicion: [3, 0, -6],
  color: '#a78bfa',
  App: RecamaraApp,
  capturar,
  esquemas,
}

export default recamara
