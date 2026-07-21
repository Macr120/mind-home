import type { Plantilla, EsquemaCaptura } from '../../core/registry'
import { vTexto, vFecha } from '../../core/registry'
import { anecdotasRepo } from '../../core/data/repository'
import { AnecdotarioApp } from './AnecdotarioApp'
import { tutorialAnecdotario } from './tutorial'

const esquemas: EsquemaCaptura[] = [
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

const anecdotario: Plantilla = {
  id: 'anecdotario',
  nombre: 'Diario · Escritorio',
  icon: '✍️',
  categoria: 'mente',
  color: '#a78bfa',
  App: AnecdotarioApp,
  tutorial: tutorialAnecdotario,
  esquemas,
  // La app es de página única: el deep link solo la abre (la sección se ignora).
  comandos: [
    { seccion: 'anecdotas', etiqueta: 'Anecdotario', nombres: ['anecdotas', 'mis recuerdos', 'album de fotos', 'calendario de animo'] },
  ],
}

export default anecdotario
