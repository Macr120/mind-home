import type { EsquemaCaptura, RoomModule } from '../../core/registry'
import { vFecha, vLista, vNumero, vTexto } from '../../core/registry'
import {
  entradasBiblioRepo,
  objetivoDiarioDe,
  sesionesEstudioRepo,
} from '../../core/data/repository'
import { BibliotecaApp } from './BibliotecaApp'
import { tutorialBiblioteca } from './tutorial'
import { PILARES } from './pilares'
import { PILAR_GENERAL } from './constantes'

const IDS_PILARES = [...PILARES.map((p) => p.id), PILAR_GENERAL.id]
const DESC_PILARES = PILARES.map((p) => `${p.id} = ${p.titulo}`).join(', ')

const pilarValido = (v: unknown) => {
  const id = vTexto(v)
  return IDS_PILARES.includes(id) ? id : PILAR_GENERAL.id
}

/** Esquemas para el asistente global: apuntes de conocimiento y sesiones de estudio. */
const esquemas: EsquemaCaptura[] = [
  {
    id: 'apunte',
    descripcion:
      'Guarda una entrada de conocimiento en la enciclopedia personal cuando el usuario cuenta algo que aprendió, leyó o quiere apuntar ("aprendí que…", "apunta esto sobre…"). Destila tú el aprendizaje en formato wiki.',
    campos: [
      { campo: 'titulo', tipo: 'texto', descripcion: 'Título corto de la entrada (estilo wiki)', requerido: true },
      { campo: 'resumen', tipo: 'texto', descripcion: 'Resumen de 2-4 frases de lo aprendido', requerido: true },
      { campo: 'puntosClave', tipo: 'lista', descripcion: 'De 2 a 5 puntos clave, uno por elemento' },
      {
        campo: 'pilarId',
        tipo: 'opcion',
        opciones: IDS_PILARES,
        descripcion: `Campo del conocimiento de la entrada: ${DESC_PILARES}, general = sin clasificar`,
      },
    ],
    guardar: async (v) => {
      const titulo = vTexto(v.titulo)
      const resumen = vTexto(v.resumen)
      if (!titulo || !resumen) return
      const ahora = new Date().toISOString()
      await entradasBiblioRepo.add({
        pilarId: pilarValido(v.pilarId),
        titulo,
        resumen,
        puntosClave: vLista(v.puntosClave),
        creadoEn: ahora,
        actualizadoEn: ahora,
      })
    },
  },
  {
    id: 'estudio',
    descripcion:
      'Registra una sesión de estudio cuando el usuario dice cuánto tiempo estudió un tema (ej. "estudié 40 minutos de historia").',
    campos: [
      { campo: 'minutos', tipo: 'numero', descripcion: 'Minutos estudiados (1 hora = 60)', requerido: true },
      {
        campo: 'pilarId',
        tipo: 'opcion',
        opciones: IDS_PILARES,
        descripcion: `Campo del conocimiento estudiado: ${DESC_PILARES}`,
      },
      { campo: 'nota', tipo: 'texto', descripcion: 'Tema concreto estudiado, si se menciona' },
      { campo: 'fecha', tipo: 'fecha', descripcion: 'Fecha yyyy-mm-dd (hoy si no se menciona)' },
    ],
    guardar: async (v) => {
      const minutos = Math.round(vNumero(v.minutos))
      if (minutos <= 0) return
      await sesionesEstudioRepo.add({
        pilarId: pilarValido(v.pilarId),
        minutos,
        fecha: vFecha(v.fecha),
        nota: vTexto(v.nota) || undefined,
      })
    },
  },
]

const biblioteca: RoomModule = {
  id: 'biblioteca',
  nombre: 'Biblioteca · Enciclopedia',
  icon: '📚',
  categoria: 'mente',
  posicion: [-9, 0, 0],
  color: '#818cf8',
  App: BibliotecaApp,
  tutorial: tutorialBiblioteca,
  esquemas,
  metaDiaria: {
    clave: 'biblioteca.metaDiaria',
    etiquetaEs: 'Estudio de hoy',
    unidad: 'min',
    seccion: 'estudio',
    del: async (fecha) => ({
      hecho: (await sesionesEstudioRepo.list())
        .filter((s) => s.fecha === fecha)
        .reduce((s, x) => s + x.minutos, 0),
      objetivo: await objetivoDiarioDe('biblioteca', 20),
    }),
  },
  comandos: [
    { seccion: 'charlas', etiqueta: 'Charlas', nombres: ['charlas'] },
    { seccion: 'enciclopedia', etiqueta: 'Enciclopedia', nombres: ['enciclopedia', 'wiki'] },
    { seccion: 'estudio', etiqueta: 'Estudio', nombres: ['sesion de estudio', 'temporizador de estudio'] },
    { seccion: 'resumen', etiqueta: 'Resumen', nombres: ['resumen de estudio', 'progreso de estudio'] },
  ],
}

export default biblioteca
