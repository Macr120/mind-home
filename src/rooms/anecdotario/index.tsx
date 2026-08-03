import { lazy } from 'react'
import type { Plantilla, EsquemaCaptura } from '../../core/registry'
import { vTexto, vFecha } from '../../core/registry'
import { anecdotasRepo } from '../../core/data/repository'
import { flujosAnecdotario } from './tutorial'

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

// La app 2D se descarga al entrar al cuarto, no en el arranque (los puntos de
// montaje ya envuelven en Suspense). El resto del módulo (capturar, esquemas,
// metaDiaria) sí es eager: lo usa el núcleo sin abrir el cuarto.
const AnecdotarioApp = lazy(() => import('./AnecdotarioApp').then((m) => ({ default: m.AnecdotarioApp })))

const anecdotario: Plantilla = {
  id: 'anecdotario',
  nombre: 'Diario · Escritorio',
  icon: '✍️',
  categoria: 'mente',
  color: '#a78bfa',
  App: AnecdotarioApp,
  flujos: flujosAnecdotario,
  esquemas,
  // La app es de página única: el deep link solo la abre (la sección se ignora).
  comandos: [
    { seccion: 'anecdotas', etiqueta: 'Anecdotario', nombres: ['anecdotas', 'mis recuerdos', 'album de fotos', 'calendario de animo'] },
  ],
}

export default anecdotario
