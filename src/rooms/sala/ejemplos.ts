import {
  bitacoraViajeRepo,
  diasItinerarioRepo,
  lugaresViajeRepo,
  portadasLugarRepo,
  rutasViajeRepo,
} from '../../core/data/repository'
import type { FilaEjemplo } from '../../core/data/ejemplos'
import { fechaLocalISO, isoMasDias } from '../../core/fechaLocal'
import { fotoEjemplo } from '../_shared/ejemplos/fotos'
import { filaEjemplo, porIdioma, retraducido, yaMaterializado, type PaqueteEjemplo } from '../_shared/ejemplos/tipos'
import { TEXTOS_SALA } from './ejemplos.data'
import { buscarLugares } from './geocoder'

/**
 * Ejemplo de fábrica de la sala: un viaje por conocer con tres días de plan, un
 * lugar ya visitado con su recuerdo y una ruta que los une.
 *
 * Las ciudades son reales, así que las coordenadas del pin se piden al mismo
 * geocoder que usa el formulario. Si no hay red, el lugar se crea igual y solo
 * se queda sin pin en el mapamundi: el resto del ejemplo (plan, bitácora, ruta)
 * no depende de eso.
 */

const ID = 'sala.viajes'

/** Coordenadas del pin, si el geocoder contesta. */
async function coords(ciudad: string, pais: string) {
  try {
    const [primero] = await buscarLugares(`${ciudad}, ${pais}`)
    return primero ? { lat: primero.lat, lng: primero.lng } : {}
  } catch {
    return {}
  }
}

export const ejemploSala: PaqueteEjemplo = {
  id: ID,
  tablas: [lugaresViajeRepo, diasItinerarioRepo, bitacoraViajeRepo, rutasViajeRepo],
  async materializar(restaurar) {
    if (await yaMaterializado(ID, () => lugaresViajeRepo.list())) return
    const T = porIdioma(TEXTOS_SALA)
    const hoy = fechaLocalISO()
    const creado = `${hoy}T12:00:00.000Z`

    const pendienteId = await lugaresViajeRepo.addSeed(
      filaEjemplo(ID, 'pendiente', restaurar, {
        nombre: T.lugarPendiente,
        pais: T.paisPendiente,
        ciudad: T.lugarPendiente,
        ...(await coords(T.lugarPendiente, T.paisPendiente)),
        visitado: 0,
        // A dos meses vista: el plan se ve en el calendario sin sonar a mañana.
        fechaPlan: isoMasDias(hoy, 60),
        nota: T.notaPendiente,
        creadoEn: creado,
      }),
    )
    const dias: { destino: string; actividades: string; hospedaje?: string; presupuesto: number }[] = [
      { destino: T.dia1Destino, actividades: T.dia1Actividades, hospedaje: T.dia1Hospedaje, presupuesto: 120 },
      { destino: T.dia2Destino, actividades: T.dia2Actividades, presupuesto: 90 },
      { destino: T.dia3Destino, actividades: T.dia3Actividades, presupuesto: 140 },
    ]
    for (const [i, d] of dias.entries()) {
      await diasItinerarioRepo.addSeed(
        filaEjemplo(ID, `dia${i}`, restaurar, {
          lugarId: pendienteId,
          dia: i + 1,
          fecha: isoMasDias(hoy, 60 + i),
          destino: d.destino,
          actividades: d.actividades,
          hospedaje: d.hospedaje,
          presupuesto: d.presupuesto,
        }),
      )
    }

    // El que ya se visitó: es el que estrena la bitácora y su álbum de fotos.
    const visitadoId = await lugaresViajeRepo.addSeed(
      filaEjemplo(ID, 'visitado', restaurar, {
        nombre: T.lugarVisitado,
        pais: T.paisVisitado,
        ciudad: T.lugarVisitado,
        ...(await coords(T.lugarVisitado, T.paisVisitado)),
        visitado: 1,
        fechaVisita: isoMasDias(hoy, -240),
        creadoEn: creado,
      }),
    )
    const foto = await fotoEjemplo('sala.recuerdo')
    await bitacoraViajeRepo.addSeed(
      filaEjemplo(ID, 'recuerdo', restaurar, {
        lugarId: visitadoId,
        fecha: isoMasDias(hoy, -238),
        texto: T.recuerdo,
        fotos: foto ? [foto] : undefined,
        creadoEn: creado,
      }),
    )
    // La portada también es del ejemplo: se va con él (ver `alBorrar`).
    if (foto) await portadasLugarRepo.addSeed(filaEjemplo(ID, 'portada', restaurar, { lugarId: visitadoId, foto }))

    await rutasViajeRepo.addSeed(
      filaEjemplo(ID, 'ruta', restaurar, {
        nombre: T.ruta,
        lugarIds: [visitadoId, pendienteId],
        creadoEn: creado,
      }),
    )
  },

  async alBorrar() {
    for (const p of await portadasLugarRepo.list()) {
      if ((p as FilaEjemplo).ejemploDe === ID && p.id != null) await portadasLugarRepo.remove(p.id)
    }
  },

  async retraducir() {
    // Las coordenadas del pin no se tocan: la ciudad traducida es la misma.
    for (const l of await lugaresViajeRepo.list()) {
      if (l.ejemploDe !== ID || l.id == null) continue
      const nombre = retraducido(TEXTOS_SALA, l.nombre, 'lugarPendiente', 'lugarVisitado')
      const ciudad = retraducido(TEXTOS_SALA, l.ciudad, 'lugarPendiente', 'lugarVisitado')
      const pais = retraducido(TEXTOS_SALA, l.pais, 'paisPendiente', 'paisVisitado')
      const nota = retraducido(TEXTOS_SALA, l.nota, 'notaPendiente')
      if (nombre || ciudad || pais || nota) {
        await lugaresViajeRepo.update(l.id, {
          ...(nombre && { nombre }),
          ...(ciudad && { ciudad }),
          ...(pais && { pais }),
          ...(nota && { nota }),
        })
      }
    }
    for (const d of await diasItinerarioRepo.list()) {
      if (d.ejemploDe !== ID || d.id == null) continue
      const destino = retraducido(TEXTOS_SALA, d.destino, 'dia1Destino', 'dia2Destino', 'dia3Destino')
      const actividades = retraducido(TEXTOS_SALA, d.actividades, 'dia1Actividades', 'dia2Actividades', 'dia3Actividades')
      const hospedaje = retraducido(TEXTOS_SALA, d.hospedaje, 'dia1Hospedaje')
      if (destino || actividades || hospedaje) {
        await diasItinerarioRepo.update(d.id, {
          ...(destino && { destino }),
          ...(actividades && { actividades }),
          ...(hospedaje && { hospedaje }),
        })
      }
    }
    for (const b of await bitacoraViajeRepo.list()) {
      if (b.ejemploDe !== ID || b.id == null) continue
      const texto = retraducido(TEXTOS_SALA, b.texto, 'recuerdo')
      if (texto) await bitacoraViajeRepo.update(b.id, { texto })
    }
    for (const r of await rutasViajeRepo.list()) {
      if (r.ejemploDe !== ID || r.id == null) continue
      const nombre = retraducido(TEXTOS_SALA, r.nombre, 'ruta')
      if (nombre) await rutasViajeRepo.update(r.id, { nombre })
    }
  },
}
