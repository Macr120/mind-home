/**
 * Año demo de descanso: de la una de la madrugada a las 23:30.
 *
 * El mes 1 son noches de cinco horas y pico con el techo de testigo; a partir
 * del mes 2 aparece un horario, el bache del mes 7 lo estropea (la rodilla
 * duele acostado) y Japón mete jet lag por partida doble. El año termina con
 * siete horas y media casi clavadas.
 *
 * Las notas vienen escritas y su `tono` MANDA sobre la curva: si la nota dice
 * que durmió fatal, esa noche se reescribe para que el número no la desmienta.
 *
 * Ojo con la rutina espejo del final: sin ella, abrir la app en el demo
 * intentaría crearla y el visitante se comería el aviso de solo lectura.
 */
import type { RegistroSueno } from '../../core/data/db'
import { perfilSuenoRepo, suenoRepo } from '../../core/data/repository'
import { rngDemo, type CtxDemo } from '../../demo/builders'
import { enBache, enJapon, JAPON_FIN, JAPON_INICIO } from '../../demo/hitosPep'
import { sembrarMetasApp } from '../../demo/metasPep'
import { DEMO_DESCANSO } from './demo.data'
import { duracionHoras } from './puntuacion'
import { sincronizarRutinaSueno } from './rutinaSueno'

type Noche = Omit<RegistroSueno, 'id'>
type Tono = 'mala' | 'regular' | 'buena' | 'excelente'

/** El horario al que Pep@ llegó (y con el que vive hoy). */
const PERFIL = {
  horaDormir: '23:30',
  horaDespertar: '07:00',
  objetivoHoras: 7.5,
  alarmaActiva: true,
  // Los avisos quedan APAGADOS a propósito: pintan un banner a pantalla
  // completa, y la evidencia de la alarma llega a pedir la cámara.
  avisoDormir: false,
  avisoPantallas: false,
  evidenciaActiva: false,
}

/** Media de horas y hora de acostarse (en minutos) según el mes del año. */
function objetivoNoche(off: number): { horas: number; sd: number; acostarse: number; interrupciones: number } {
  if (enJapon(off)) return { horas: 6.3, sd: 1.4, acostarse: 23 * 60 + 10, interrupciones: 2 }
  if (enBache(off)) return { horas: 6.2, sd: 0.9, acostarse: 23 * 60 + 55, interrupciones: 2 }
  if (off < -334) return { horas: 5.3, sd: 0.9, acostarse: 25 * 60 + 20, interrupciones: 2 }
  if (off < -304) return { horas: 5.9, sd: 0.8, acostarse: 24 * 60 + 55, interrupciones: 2 }
  if (off < -244) return { horas: 6.5, sd: 0.6, acostarse: 24 * 60 + 10, interrupciones: 1 }
  if (off < -184) return { horas: 6.9, sd: 0.6, acostarse: 23 * 60 + 50, interrupciones: 1 }
  if (off < JAPON_INICIO) return { horas: 7.0, sd: 0.5, acostarse: 23 * 60 + 40, interrupciones: 1 }
  if (off < -60) return { horas: 7.3, sd: 0.5, acostarse: 23 * 60 + 35, interrupciones: 1 }
  return { horas: 7.5, sd: 0.35, acostarse: 23 * 60 + 30, interrupciones: 0 }
}

/** Cuántas noches se registran: al principio se le olvidaba, y en Japón más. */
function densidad(off: number): number {
  if (enJapon(off)) return 0.3
  if (off < -334) return 0.45
  if (off < -304) return 0.65
  if (enBache(off)) return 0.7
  if (off < -120) return 0.82
  return 0.9
}

const hhmm = (minutos: number): string => {
  const m = ((minutos % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** Ajustes que impone el tono de una nota escrita. */
const POR_TONO: Record<Tono, { horas: number; interrupciones: number; retraso: number }> = {
  mala: { horas: 4.6, interrupciones: 3, retraso: 75 },
  regular: { horas: 6.2, interrupciones: 2, retraso: 30 },
  buena: { horas: 7.4, interrupciones: 0, retraso: 0 },
  excelente: { horas: 8.4, interrupciones: 0, retraso: -20 },
}

export async function construirDemoDescanso(ctx: CtxDemo): Promise<void> {
  const datos = await ctx.textos(DEMO_DESCANSO, () => import('./demo.data.i18n'))
  const r = rngDemo(19891109)

  // ── Perfil: la app lo crearía sola al abrirse (y en demo eso está vetado) ─
  const [perfil] = await perfilSuenoRepo.list()
  if (perfil?.id != null) await perfilSuenoRepo.update(perfil.id, PERFIL)
  else await perfilSuenoRepo.add(PERFIL)

  // ── El bloque «Dormir» del calendario, ya en su punto fijo ───────────────
  // Se llama a la MISMA función que llama la app: al reencontrarla con estas
  // horas, `sincronizarRutinaSueno` sale sin escribir nada.
  await sincronizarRutinaSueno(
    undefined,
    PERFIL.horaDormir,
    PERFIL.horaDespertar,
    ctx.idioma === 'en' ? 'Sleep' : 'Dormir',
  )

  /** Una noche cualquiera del año, según su tramo. */
  const nocheDe = (off: number, tono?: Tono): Noche => {
    const base = objetivoNoche(off)
    const ajuste = tono ? POR_TONO[tono] : null
    const horasBrutas = ajuste
      ? ajuste.horas + (r() - 0.5) * 0.4
      : base.horas + (r() - 0.5) * base.sd * 2
    const acostarse = base.acostarse + (ajuste?.retraso ?? 0) + Math.round((r() - 0.5) * 50)
    const horas = Math.round(Math.min(10, Math.max(3.5, horasBrutas)) * 4) / 4
    const despertar = acostarse + horas * 60
    const interrupciones =
      ajuste?.interrupciones ?? (r() < 0.45 ? base.interrupciones : Math.max(0, base.interrupciones - 1))
    // La calidad no se inventa: sale de lo que la app va a mostrar.
    const calidad = Math.min(
      5,
      Math.max(1, Math.round(1 + horas * 0.5 - interrupciones * 0.45 + (r() - 0.5) * 0.6)),
    )
    return {
      fecha: ctx.fecha(off),
      horaAcostarse: hhmm(acostarse),
      horaDespertar: hhmm(despertar),
      // Que las horas cuadren con las dos horas mostradas en la ficha.
      horas: duracionHoras(hhmm(acostarse), hhmm(despertar)),
      calidad,
      interrupciones,
    }
  }

  const porDia = new Map<number, Noche>()
  for (let off = -364; off <= 0; off++) {
    // Los últimos siete días siempre: son la gráfica de «Últimas 7 noches».
    if (off >= -6 || r() < densidad(off)) porDia.set(off, nocheDe(off))
  }

  // ── Las noches con texto: el tono manda sobre el número ──────────────────
  for (const n of datos.notas) {
    porDia.set(n.dia, { ...nocheDe(n.dia, n.tono as Tono), nota: n.nota })
  }
  for (const h of datos.hitos) {
    const tono: Tono =
      h.clave === 'peorNoche' || h.clave === 'jetLagIda' || h.clave === 'jetLagVuelta'
        ? 'mala'
        : h.clave === 'visperaMaraton'
          ? 'regular'
          : h.clave === 'mejorNoche' || h.clave === 'trasMaraton'
            ? 'excelente'
            : 'buena'
    porDia.set(h.dia, { ...nocheDe(h.dia, tono), nota: h.nota })
  }

  // La víspera del maratón se acostó pronto aunque durmiera regular.
  const vispera = datos.hitos.find((h) => h.clave === 'visperaMaraton')
  if (vispera) {
    const n = porDia.get(vispera.dia)
    if (n) {
      n.horaAcostarse = '21:45'
      n.horaDespertar = '04:30'
      n.horas = duracionHoras('21:45', '04:30')
    }
  }

  // La noche más reciente se deja «buena», no perfecta: un 100 huele a plástico.
  const anoche = porDia.get(0)
  if (anoche) {
    anoche.horaAcostarse = '00:05'
    anoche.horaDespertar = '07:05'
    anoche.horas = duracionHoras('00:05', '07:05')
    anoche.calidad = 4
    anoche.interrupciones = 1
  }

  // Japón se registró poco: quitar el sobrante que hayan metido las notas.
  for (const off of [...porDia.keys()]) {
    if (enJapon(off) && off !== JAPON_INICIO && off !== JAPON_FIN && r() < 0.45 && !porDia.get(off)?.nota) {
      porDia.delete(off)
    }
  }

  await suenoRepo.bulkAdd([...porDia.values()])

  // El mes que ya cumplió y el plan de higiene del sueño que tiene en marcha.
  await sembrarMetasApp(ctx, 'descanso')
}
