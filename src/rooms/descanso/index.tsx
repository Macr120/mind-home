import { lazy } from 'react'
import type { Plantilla, EsquemaCaptura } from '../../core/appContrato'
import { vTexto, vNumero, vFecha } from '../../core/appContrato'
import { suenoRepo } from '../../core/data/repository'
import { normalizar } from '../../core/chat/dispatcher'
import { flujosDescanso } from './tutorial'
import { fechaLocalISO } from '../../core/fechaLocal'
import { OPERACIONES_IA } from './costosIA'
import { planMetasDescanso } from './plan'

async function capturar(texto: string): Promise<boolean> {
  const norm = normalizar(texto)

  // Detecta horas: "dormí 7 horas", "7h", "7 hrs" (solo dígitos por ahora)
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
    fecha: fechaLocalISO(),
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
      { campo: 'horaAcostarse', tipo: 'texto', descripcion: "Hora en que se acostó 'HH:mm' en 24 h (vacío si no se menciona)" },
      { campo: 'horaDespertar', tipo: 'texto', descripcion: "Hora en que despertó 'HH:mm' en 24 h (vacío si no se menciona)" },
      { campo: 'interrupciones', tipo: 'numero', descripcion: 'Veces que se despertó en la noche (0 si no se menciona)' },
      { campo: 'fecha', tipo: 'fecha', descripcion: 'Fecha yyyy-mm-dd (hoy si no se menciona)' },
      { campo: 'nota', tipo: 'texto', descripcion: 'Observación breve (despertares, sueños, etc.)' },
    ],
    guardar: async (v) => {
      const horas = vNumero(v.horas)
      if (horas <= 0 || horas > 24) return
      const hhmm = (x: unknown) => (typeof x === 'string' && /^\d{1,2}:\d{2}$/.test(x) ? x : undefined)
      await suenoRepo.add({
        fecha: vFecha(v.fecha),
        horas,
        calidad: Math.min(5, Math.max(1, vNumero(v.calidad, 3))),
        nota: vTexto(v.nota) || undefined,
        horaAcostarse: hhmm(v.horaAcostarse),
        horaDespertar: hhmm(v.horaDespertar),
        interrupciones: Math.max(0, vNumero(v.interrupciones, 0)) || undefined,
      })
    },
  },
]

// La app 2D se descarga al entrar al cuarto, no en el arranque (los puntos de
// montaje ya envuelven en Suspense). El resto del módulo (capturar, esquemas,
// metaDiaria) sí es eager: lo usa el núcleo sin abrir el cuarto.
const DescansoApp = lazy(() => import('./DescansoApp').then((m) => ({ default: m.DescansoApp })))

const descanso: Plantilla = {
  id: 'descanso',
  nombre: 'Descanso · Cama',
  icon: '🛏️',
  categoria: 'cuerpo',
  color: '#22d3ee',
  App: DescansoApp,
  flujos: flujosDescanso,
  // Acotamiento del planificador ✨: en Descanso el plan es de higiene del sueño.
  planMetas: planMetasDescanso,
  capturar,
  esquemas,
  operacionesIA: OPERACIONES_IA,
  // La app es de página única: el deep link solo la abre (la sección se ignora).
  comandos: [
    { seccion: 'sueno', etiqueta: 'Descanso', nombres: ['despertador', 'mi sueno', 'horario de sueno', 'registrar noche'] },
  ],
  metaDiaria: {
    clave: 'descanso.metaDiaria',
    etiquetaEs: 'Registra tu noche',
    del: async (fecha) => ({
      hecho: (await suenoRepo.list()).filter((s) => s.fecha === fecha).length,
      objetivo: 1,
    }),
  },
}

export default descanso
