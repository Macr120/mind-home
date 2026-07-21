import type { RoomModule, EsquemaCaptura } from '../../core/registry'
import { vTexto, vFecha } from '../../core/registry'
import { lugaresViajeRepo, bitacoraViajeRepo } from '../../core/data/repository'
import { normalizar } from '../../core/chat/dispatcher'
import { buscarLugares } from './geocoder'
import { SalaApp } from './SalaApp'
import { tutorialSala } from './tutorial'
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

const sala: RoomModule = {
  id: 'sala',
  nombre: 'Viajes · Sala',
  icon: '✈️',
  categoria: 'complemento',
  posicion: [3, 0, 0],
  color: '#2dd4bf',
  App: SalaApp,
  tutorial: tutorialSala,
  eventos: eventosViaje,
  esquemas,
  comandos: [
    { seccion: 'mapa', etiqueta: 'Mapamundi', nombres: ['mapamundi', 'mapa de viajes'] },
    { seccion: 'porConocer', etiqueta: 'Por conocer', nombres: ['por conocer', 'itinerario'] },
    { seccion: 'rutas', etiqueta: 'Rutas', nombres: ['rutas'] },
    { seccion: 'bitacora', etiqueta: 'Bitácora', nombres: ['bitacora', 'bitacora de viajes'] },
  ],
}

export default sala
