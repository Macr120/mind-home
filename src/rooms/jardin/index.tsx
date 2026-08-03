import { lazy } from 'react'
import type { Plantilla, EsquemaCaptura } from '../../core/registry'
import { vTexto, vNumero, vFecha } from '../../core/registry'
import {
  sesionesMindfulnessRepo,
  gratitudDiariaRepo,
  objetivoDiarioDe,
} from '../../core/data/repository'
import { normalizar } from '../../core/chat/dispatcher'
import { flujosJardin } from './tutorial'
import { fechaLocalISO } from '../../core/fechaLocal'
import type { PaisajeId } from '../../core/audio/paisaje'
import { PISTAS } from './pistas'

const PISTAS_TOKENS: [string[], PaisajeId][] = [
  [['bosque', 'arboles', 'pajaros', 'naturaleza'], 'bosque'],
  [['mar', 'olas', 'oceano', 'playa'], 'mar'],
  [['lluvia', 'lloviendo', 'lluvioso'], 'lluvia'],
  [['cuencos', 'cuenco', 'tibetanos', 'tibetano'], 'cuencos'],
]

// La app 2D se descarga al entrar al cuarto, no en el arranque (los puntos de
// montaje ya envuelven en Suspense). El resto del módulo (capturar, esquemas,
// metaDiaria) sí es eager: lo usa el núcleo sin abrir el cuarto.
const JardinApp = lazy(() => import('./JardinApp').then((m) => ({ default: m.JardinApp })))

async function capturar(texto: string): Promise<boolean> {
  // Agradecimientos: "agradezco X, Y y Z"
  const gratMatch = texto.match(/agradezco\s+(.+)/i)
  if (gratMatch) {
    const items = gratMatch[1]
      .split(/,| y /i)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 3)
    if (items.length) {
      await gratitudDiariaRepo.add({
        fecha: fechaLocalISO(),
        item1: items[0],
        item2: items[1] ?? '',
        item3: items[2] ?? '',
      })
      return true
    }
  }

  // Sesión con duración: "medité 10 min", "respiración 5 minutos"
  const norm = normalizar(texto)
  const tokens = new Set(norm.split(/[^a-z0-9]+/).filter(Boolean))
  const minMatch = norm.match(/(\d+)\s*(?:min(?:utos?)?|m\b)/)
  const hrMatch = norm.match(/(\d+(?:\.\d+)?)\s*h(?:oras?|rs?)?/)
  if (!minMatch && !hrMatch) return false

  const duracion = minMatch ? parseInt(minMatch[1]) : Math.round(parseFloat(hrMatch![1]) * 60)
  if (duracion <= 0) return false

  const esRespiracion = ['respire', 'respiracion', 'respirar'].some((k) => tokens.has(k))
  const tema = PISTAS_TOKENS.find(([claves]) => claves.some((k) => tokens.has(k)))?.[1]
  await sesionesMindfulnessRepo.add({
    fecha: fechaLocalISO(),
    tipo: esRespiracion ? 'respiracion' : 'meditacion',
    titulo: texto.slice(0, 60),
    duracionMin: duracion,
    tema,
    nota: texto,
  })
  return true
}

const esquemas: EsquemaCaptura[] = [
  {
    id: 'practica',
    descripcion: 'Una sesión de meditación o de respiración que el usuario realizó.',
    campos: [
      {
        campo: 'tipo',
        tipo: 'opcion',
        opciones: ['meditacion', 'respiracion'],
        descripcion: 'Tipo de práctica',
        requerido: true,
      },
      { campo: 'duracionMin', tipo: 'numero', descripcion: 'Duración en minutos', requerido: true },
      {
        campo: 'tema',
        tipo: 'opcion',
        opciones: PISTAS.map((p) => p.id),
        descripcion: 'Pista de sonido de la meditación (solo si se menciona)',
      },
      { campo: 'fecha', tipo: 'fecha', descripcion: 'Fecha yyyy-mm-dd (hoy si no se menciona)' },
    ],
    guardar: async (v) => {
      const duracion = vNumero(v.duracionMin)
      if (duracion <= 0) return
      const esRespiracion = vTexto(v.tipo) === 'respiracion'
      const tema = vTexto(v.tema)
      const nombrePista = PISTAS.find((p) => p.id === tema)?.nombre
      await sesionesMindfulnessRepo.add({
        fecha: vFecha(v.fecha),
        tipo: esRespiracion ? 'respiracion' : 'meditacion',
        titulo: esRespiracion ? 'Respiración' : nombrePista ? `Meditación · ${nombrePista}` : 'Meditación',
        duracionMin: duracion,
        tema: tema || undefined,
      })
    },
  },
  {
    id: 'gratitud',
    descripcion: 'Cosas por las que el usuario está agradecido hoy (hasta tres).',
    campos: [
      { campo: 'item1', tipo: 'texto', descripcion: 'Primera cosa por la que agradece', requerido: true },
      { campo: 'item2', tipo: 'texto', descripcion: 'Segunda cosa (si la menciona)' },
      { campo: 'item3', tipo: 'texto', descripcion: 'Tercera cosa (si la menciona)' },
      { campo: 'fecha', tipo: 'fecha', descripcion: 'Fecha yyyy-mm-dd (hoy si no se menciona)' },
    ],
    guardar: async (v) => {
      const item1 = vTexto(v.item1)
      if (!item1) return
      await gratitudDiariaRepo.add({
        fecha: vFecha(v.fecha),
        item1,
        item2: vTexto(v.item2),
        item3: vTexto(v.item3),
      })
    },
  },
]

const jardin: Plantilla = {
  id: 'jardin',
  nombre: 'Mindfulness · Jardín',
  icon: '🧘',
  categoria: 'complemento',
  color: '#4ade80',
  App: JardinApp,
  flujos: flujosJardin,
  capturar,
  esquemas,
  sinMuros: true,
  // `sinRacha` no es cosmético: el jardín no lleva rachas ni castiga faltar (ver
  // calma.ts). Se enseña lo acumulado y ahí acaba — nunca avisa.
  metaDiaria: {
    clave: 'jardin.metaDiaria',
    etiquetaEs: 'Calma de hoy',
    unidad: 'min',
    seccion: 'meditacion',
    sinRacha: true,
    del: async (fecha) => ({
      hecho: (await sesionesMindfulnessRepo.list())
        .filter((s) => s.fecha === fecha)
        .reduce((s, x) => s + x.duracionMin, 0),
      objetivo: await objetivoDiarioDe('jardin', 10),
    }),
  },
  comandos: [
    { seccion: 'meditacion', etiqueta: 'Meditación', nombres: ['meditacion', 'meditaciones', 'meditar'] },
    { seccion: 'respiracion', etiqueta: 'Respiración', nombres: ['respiracion', 'respirar'] },
    { seccion: 'gratitud', etiqueta: 'Agradecimientos', nombres: ['gratitud', 'agradecimientos'] },
  ],
}

export default jardin
