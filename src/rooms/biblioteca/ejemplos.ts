import {
  conversacionesBiblioRepo,
  entradasBiblioRepo,
  mensajesBiblioRepo,
  sesionesEstudioRepo,
} from '../../core/data/repository'
import { fechaLocalISO, isoMasDias } from '../../core/fechaLocal'
import { fotoEjemplo } from '../_shared/ejemplos/fotos'
import { filaEjemplo, porIdioma, retraducido, yaMaterializado, type PaqueteEjemplo } from '../_shared/ejemplos/tipos'
import { TEXTOS_BIBLIOTECA } from './ejemplos.data'

/**
 * Ejemplo de fábrica de la biblioteca: una charla con el Sabio, dos entradas
 * de la enciclopedia y tres sesiones de estudio de la última semana.
 *
 * La charla llena la pestaña por defecto (Charlas) y trae sus respuestas ya
 * escritas: abrirla no llama a la IA. La primera entrada cuelga de ella
 * (`conversacionId`), como las que destila una charla de verdad.
 *
 * Las dos entradas cuelgan de temas REALES del índice de `pilares.ts`, así que
 * el árbol las enseña donde toca en vez de dejarlas sueltas en «general». Las
 * sesiones apuntan a la primera entrada: con eso el heatmap y el resumen del
 * pilar tienen algo que contar.
 */

const ID = 'biblioteca.enciclopedia'

const PILAR = 'filosofia'

export const ejemploBiblioteca: PaqueteEjemplo = {
  id: ID,
  tablas: [entradasBiblioRepo, sesionesEstudioRepo, conversacionesBiblioRepo, mensajesBiblioRepo],
  async materializar(restaurar) {
    // Cualquier resto lo frena: charla, entradas y sesiones se borran por
    // separado. Los mensajes no hace falta mirarlos: se van con su charla.
    const yaEsta = await yaMaterializado(
      ID,
      () => entradasBiblioRepo.list(),
      () => sesionesEstudioRepo.list(),
      () => conversacionesBiblioRepo.list(),
    )
    if (yaEsta) return
    const T = porIdioma(TEXTOS_BIBLIOTECA)
    const hoy = fechaLocalISO()
    const cuando = (dias: number) => `${isoMasDias(hoy, dias)}T18:00:00.000Z`

    // La charla va a las 19:00 LOCALES de hace ocho días: las burbujas enseñan
    // la hora, y con una hora UTC fija saldría de madrugada en medio mundo.
    const inicio = new Date(`${isoMasDias(hoy, -8)}T19:00:00`).getTime()
    const aLos = (min: number) => new Date(inicio + min * 60_000).toISOString()
    // Antes que las entradas: la primera se destiló de ella y la lleva colgada.
    const charlaId = await conversacionesBiblioRepo.addSeed(
      filaEjemplo(ID, 'charla', restaurar, {
        titulo: T.charlaTitulo,
        pilarId: PILAR,
        temaId: 'fil-libre',
        creadoEn: aLos(0),
        actualizadoEn: aLos(7),
        // Destilada DESPUÉS del último mensaje: al salir de la charla no se
        // vuelve a destilar, que sería una llamada de pago que nadie pidió.
        destiladaEn: aLos(8),
      }),
    )
    const mensajes = [
      { rol: 'usuario', texto: T.charlaPregunta1, min: 0 },
      { rol: 'asistente', texto: T.charlaRespuesta1, min: 1 },
      { rol: 'usuario', texto: T.charlaPregunta2, min: 6 },
      { rol: 'asistente', texto: T.charlaRespuesta2, min: 7 },
    ] as const
    for (const [i, m] of mensajes.entries()) {
      await mensajesBiblioRepo.addSeed(
        filaEjemplo(ID, `mensaje${i}`, restaurar, {
          conversacionId: charlaId,
          rol: m.rol,
          texto: m.texto,
          creado: aLos(m.min),
        }),
      )
    }

    const imagen = await fotoEjemplo('biblioteca.entrada')
    const entradaId = await entradasBiblioRepo.addSeed(
      filaEjemplo(ID, 'entrada1', restaurar, {
        pilarId: PILAR,
        temaId: 'fil-libre',
        titulo: T.entrada1Titulo,
        resumen: T.entrada1Resumen,
        puntosClave: [T.entrada1Punto1, T.entrada1Punto2, T.entrada1Punto3],
        imagen,
        conversacionId: charlaId,
        creadoEn: cuando(-8),
        actualizadoEn: cuando(-2),
      }),
    )
    // La segunda va sin ilustración: se ve que la imagen es opcional.
    await entradasBiblioRepo.addSeed(
      filaEjemplo(ID, 'entrada2', restaurar, {
        pilarId: PILAR,
        temaId: 'fil-ser',
        titulo: T.entrada2Titulo,
        resumen: T.entrada2Resumen,
        puntosClave: [T.entrada2Punto1, T.entrada2Punto2],
        creadoEn: cuando(-3),
        actualizadoEn: cuando(-3),
      }),
    )

    const sesiones: { dias: number; minutos: number; nota: string }[] = [
      { dias: -6, minutos: 25, nota: T.notaEstudio1 },
      { dias: -4, minutos: 20, nota: T.notaEstudio2 },
      { dias: -1, minutos: 10, nota: T.notaEstudio3 },
    ]
    for (const [i, s] of sesiones.entries()) {
      await sesionesEstudioRepo.addSeed(
        filaEjemplo(ID, `sesion${i}`, restaurar, {
          pilarId: PILAR,
          entradaId,
          minutos: s.minutos,
          fecha: isoMasDias(hoy, s.dias),
          nota: s.nota,
        }),
      )
    }
  },

  async retraducir() {
    const claves = ['entrada1Punto1', 'entrada1Punto2', 'entrada1Punto3', 'entrada2Punto1', 'entrada2Punto2'] as const
    for (const e of await entradasBiblioRepo.list()) {
      if (e.ejemploDe !== ID || e.id == null) continue
      const titulo = retraducido(TEXTOS_BIBLIOTECA, e.titulo, 'entrada1Titulo', 'entrada2Titulo')
      const resumen = retraducido(TEXTOS_BIBLIOTECA, e.resumen, 'entrada1Resumen', 'entrada2Resumen')
      // Los puntos clave se guardan como lista: se retraduce punto a punto y los
      // que el usuario añadió o retocó se quedan tal cual.
      const puntos = (e.puntosClave ?? []).map((p) => retraducido(TEXTOS_BIBLIOTECA, p, ...claves) ?? p)
      const puntosCambian = puntos.some((p, i) => p !== e.puntosClave?.[i])
      if (titulo || resumen || puntosCambian) {
        await entradasBiblioRepo.update(e.id, {
          ...(titulo && { titulo }),
          ...(resumen && { resumen }),
          ...(puntosCambian && { puntosClave: puntos }),
        })
      }
    }
    for (const s of await sesionesEstudioRepo.list()) {
      if (s.ejemploDe !== ID || s.id == null) continue
      const nota = retraducido(TEXTOS_BIBLIOTECA, s.nota, 'notaEstudio1', 'notaEstudio2', 'notaEstudio3')
      if (nota) await sesionesEstudioRepo.update(s.id, { nota })
    }
    // Sin tocar `actualizadoEn`: la charla no «crece» y no se vuelve a destilar.
    for (const c of await conversacionesBiblioRepo.list()) {
      if (c.ejemploDe !== ID || c.id == null) continue
      const titulo = retraducido(TEXTOS_BIBLIOTECA, c.titulo, 'charlaTitulo')
      if (titulo) await conversacionesBiblioRepo.update(c.id, { titulo })
    }
    // Lo que el usuario siga charlando en ella no lleva la marca: no se toca.
    for (const m of await mensajesBiblioRepo.list()) {
      if (m.ejemploDe !== ID || m.id == null) continue
      const texto = retraducido(
        TEXTOS_BIBLIOTECA,
        m.texto,
        'charlaPregunta1',
        'charlaRespuesta1',
        'charlaPregunta2',
        'charlaRespuesta2',
      )
      if (texto) await mensajesBiblioRepo.update(m.id, { texto })
    }
  },
}
