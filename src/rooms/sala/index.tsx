import { lazy } from 'react'
import type { Plantilla, EsquemaCaptura } from '../../core/appContrato'
import { vTexto, vFecha } from '../../core/appContrato'
import { lugaresViajeRepo, bitacoraViajeRepo } from '../../core/data/repository'
import { normalizar } from '../../core/chat/dispatcher'
import { tGlobal } from '../../core/i18n/useT'
import { CLAUSULA_RECHAZO } from '../../core/planIA'
import { buscarLugares } from './geocoder'
import { esencialSala, flujosSala } from './tutorial.meta'
import { eventosViaje } from './eventos'

const esquemas: EsquemaCaptura[] = [
  {
    id: 'visita',
    descripcion: 'Un lugar de viaje: uno que el usuario visitó o uno que quiere conocer.',
    campos: [
      { campo: 'lugar', tipo: 'texto', descripcion: 'Nombre del lugar (ciudad, sitio o país)', requerido: true },
      { campo: 'estado', tipo: 'opcion', opciones: ['visitado', 'por conocer'], descripcion: "'visitado' si ya fue; 'por conocer' si es un plan futuro" },
      { campo: 'fecha', tipo: 'fecha', descripcion: 'Fecha de la visita yyyy-mm-dd (hoy si no se menciona)' },
      { campo: 'nota', tipo: 'texto', descripcion: 'Recuerdo o nota breve del lugar (vacío si no hay)' },
    ],
    guardar: async (v) => {
      const nombre = vTexto(v.lugar)
      if (!nombre) return
      const visitado = v.estado === 'por conocer' ? 0 : 1
      const fecha = vFecha(v.fecha)
      const nota = vTexto(v.nota) || undefined
      // Si el lugar ya existe (por nombre), solo se actualiza su estado.
      const existente = (await lugaresViajeRepo.list()).find(
        (l) => normalizar(l.nombre) === normalizar(nombre),
      )
      let lugarId = existente?.id
      if (existente?.id != null) {
        await lugaresViajeRepo.update(existente.id, {
          visitado,
          ...(visitado === 1 ? { fechaVisita: fecha } : {}),
        })
      } else {
        // Geocodificar para el pin del mapamundi; sin internet igual se guarda.
        let geo: Awaited<ReturnType<typeof buscarLugares>>[number] | undefined
        try {
          geo = (await buscarLugares(nombre))[0]
        } catch {
          geo = undefined
        }
        lugarId = (await lugaresViajeRepo.add({
          nombre: geo?.nombre ?? nombre,
          pais: geo?.pais ?? '',
          estado: geo?.estado,
          ciudad: geo?.ciudad,
          lat: geo?.lat,
          lng: geo?.lng,
          visitado,
          ...(visitado === 1 ? { fechaVisita: fecha } : {}),
          nota,
          creadoEn: new Date().toISOString(),
        })) as number
      }
      if (nota && visitado === 1 && lugarId != null) {
        await bitacoraViajeRepo.add({ lugarId, fecha, texto: nota, creadoEn: new Date().toISOString() })
      }
    },
  },
]

// La app 2D se descarga al entrar al cuarto, no en el arranque (los puntos de
// montaje ya envuelven en Suspense). El resto del módulo (capturar, esquemas,
// metaDiaria) sí es eager: lo usa el núcleo sin abrir el cuarto.
const SalaApp = lazy(() => import('./SalaApp').then((m) => ({ default: m.SalaApp })))

const sala: Plantilla = {
  id: 'sala',
  nombre: 'Viajes · Sala',
  icon: '✈️',
  categoria: 'complemento',
  color: '#2dd4bf',
  App: SalaApp,
  flujos: flujosSala,
  esencial: esencialSala,
  eventos: eventosViaje,
  esquemas,
  // Acotamiento del planificador ✨: en viajes el plan es SIEMPRE un itinerario.
  planMetas: async () => {
    const lugares = await lugaresViajeRepo.list()
    const pendientes = lugares.filter((l) => l.visitado === 0)
    const contexto: string[] = []
    if (pendientes.length > 0)
      contexto.push(
        `Por conocer: ${pendientes
          .slice(0, 5)
          .map((l) => l.nombre + (l.fechaPlan ? ` (plan: ${l.fechaPlan})` : ''))
          .join(', ')}.`,
      )
    const visitados = lugares.filter((l) => l.visitado === 1).length
    if (visitados > 0) contexto.push(`Ya visitados: ${visitados} lugares.`)
    return {
      guia: [
        'La meta es de la app de Viajes: eres un guía de viajes y el plan es SIEMPRE un itinerario — lugares recomendados por visitar en la ciudad, estado o país que nombre la meta, dentro del tiempo del plan.',
        'Las fases son días o zonas del destino, en un orden geográfico sensato.',
        'Los hijos son lugares y actividades concretas y REALES del destino («Visitar el Fushimi Inari», «Cenar en el mercado de Nishiki»); nunca inventes sitios.',
        CLAUSULA_RECHAZO('los viajes o un destino por visitar'),
      ],
      contexto,
      ejemplo: pendientes[0]
        ? tGlobal('sala.plan.ejLugar', 'Itinerario de viaje a {lugar}', { lugar: pendientes[0].nombre })
        : tGlobal('sala.plan.ejemplo', 'Itinerario de 5 días en Kioto'),
      // El material son los lugares que el usuario YA guardó por conocer: si
      // alguno cae en el destino de la meta, el itinerario lo integra con su porqué.
      material:
        pendientes.length > 0
          ? {
              titulo: tGlobal('sala.plan.material', 'De tu lista Por conocer'),
              instruccion:
                'El material son lugares que el usuario ya guardó Por conocer. Integra al itinerario SOLO los que corresponden al destino de la meta, con su porqué; los de otros destinos no van — si ninguno corresponde, manda "material": []. Deja "rutina" vacía.',
              items: pendientes.map((l) => ({
                nombre: l.nombre,
                detalle:
                  [l.ciudad, l.estado, l.pais].filter(Boolean).join(', ') +
                  (l.fechaPlan ? ` · plan: ${l.fechaPlan}` : ''),
              })),
            }
          : undefined,
    }
  },
  comandos: [
    { seccion: 'mapa', etiqueta: 'Mapamundi', nombres: ['mapamundi', 'mapa de viajes'] },
    { seccion: 'porConocer', etiqueta: 'Por conocer', nombres: ['por conocer', 'itinerario'] },
    { seccion: 'rutas', etiqueta: 'Rutas', nombres: ['rutas'] },
    { seccion: 'bitacora', etiqueta: 'Bitácora', nombres: ['bitacora', 'bitacora de viajes'] },
  ],
}

export default sala
