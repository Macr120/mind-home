/**
 * Año demo de idiomas: dos perfiles — el idioma principal (inglés si la app
 * está en español, español si está en inglés) que va de A2 a B1, y el japonés
 * de supervivencia que Pep@ estudió antes del viaje y casi abandonó al volver.
 *
 * Las cajas del SRS no se inventan: se SIMULA un año de repasos con el mismo
 * algoritmo Leitner de la app (`srs.ts`), día a día desde que nace cada tarjeta.
 * Así las cajas, la próxima cita y el historial de repasos son coherentes entre
 * sí, y quedan unas cuantas tarjetas vencidas para hoy.
 */
import {
  conversacionesIdiomaRepo,
  idiomasRepo,
  materialesIdiomaRepo,
  mensajesIdiomaRepo,
  repasosIdiomaRepo,
  rutinasRepo,
  tarjetasIdiomaRepo,
  temasIdiomaRepo,
} from '../../core/data/repository'
import { claveLS } from '../../core/edicion'
import { rngDemo, type CtxDemo } from '../../demo/builders'
import { sembrarMetasApp } from '../../demo/metasPep'
import { INTERVALOS_DIAS } from './constantes'
import { DEMO_IDIOMAS } from './demo.data'
import { enIdioma, type PorIdioma } from '../../core/i18n/porIdioma'

/** El idioma que Pep@ estudia: el suyo no, claro, así que depende de la interfaz. */
interface PerfilDemo {
  codigo: string
  nombre: string
  bandera: string
}

const PERFIL_PRINCIPAL: PorIdioma<PerfilDemo> = {
  es: { codigo: 'en-US', nombre: 'Inglés', bandera: '🇺🇸' },
  en: { codigo: 'es-ES', nombre: 'Spanish', bandera: '🇪🇸' },
}

const PERFIL_JAPONES: PorIdioma<PerfilDemo> = {
  es: { codigo: 'ja-JP', nombre: 'Japonés', bandera: '🇯🇵' },
  en: { codigo: 'ja-JP', nombre: 'Japanese', bandera: '🇯🇵' },
}

/** Un día del año en el que Pep@ se sentó a repasar ese idioma. */
function repasaEse(idioma: 'principal' | 'japones', off: number, r: () => number): boolean {
  if (idioma === 'japones') {
    if (off < -270) return false // nace al decidir el viaje (mes 4)
    if (off > -95) return r() < 0.15 // de vuelta a casa, ya casi no
    return true
  }
  if (off < -340) return false
  if (off >= -184 && off <= -155) return r() < 0.5 // el bache le come días
  if (off > -6) return r() < 0.7 // en los últimos días se le juntan repasos
  return true
}

/** Acierta más según avanza el año (y con el japonés siempre le cuesta). */
function pAcierto(idioma: 'principal' | 'japones', off: number): number {
  if (idioma === 'japones') return 0.68
  return 0.65 + (1 - Math.min(1, -off / 364)) * 0.25
}

export async function construirDemoIdiomas(ctx: CtxDemo): Promise<void> {
  const datos = await ctx.textos(DEMO_IDIOMAS, () => import('./demo.data.i18n'))
  // Aquí «es» significa «no es inglés»: los idiomas que todavía no tienen
  // su variante inline leen el español, que es el respaldo de todo.
  const es = ctx.idioma !== 'en'
  const r = rngDemo(26011936)
  const enHora = (off: number, hora: string) => `${ctx.fecha(off)}T${hora}:00.000Z`

  // ── Los dos perfiles (el principal primero: es el que abre la app) ───────
  const principal = enIdioma(PERFIL_PRINCIPAL, ctx.idioma)
  const principalId = await idiomasRepo.add({
    codigo: principal.codigo,
    nombre: principal.nombre,
    bandera: principal.bandera,
    nivel: 'B1',
    creadoEn: enHora(-340, '09:00'),
  })
  const japones = enIdioma(PERFIL_JAPONES, ctx.idioma)
  const japonesId = await idiomasRepo.add({
    codigo: japones.codigo,
    nombre: japones.nombre,
    bandera: japones.bandera,
    nivel: 'A1',
    creadoEn: enHora(-270, '21:00'),
  })
  localStorage.setItem(claveLS('mh.idiomaActivo'), String(principalId))

  // ── Simulación del SRS: un año de repasos, tarjeta a tarjeta ─────────────
  type Dia = { repasos: number; aciertos: number }
  const historial = new Map<number, Map<number, Dia>>([
    [principalId, new Map()],
    [japonesId, new Map()],
  ])

  const anota = (idiomaId: number, off: number, acierto: boolean) => {
    const porDia = historial.get(idiomaId)!
    const dia = porDia.get(off) ?? { repasos: 0, aciertos: 0 }
    dia.repasos++
    if (acierto) dia.aciertos++
    porDia.set(off, dia)
  }

  /** Corre el Leitner desde `nace` hasta hoy y devuelve el estado final. */
  const simular = (idiomaId: number, tipo: 'principal' | 'japones', nace: number) => {
    let caja = 0
    let proxima = nace
    let ultima: number | null = null
    // Tope de vueltas: una tarjeta de caja 0 se repasa a diario, no más.
    for (let vueltas = 0; proxima <= 0 && vueltas < 400; vueltas++) {
      if (!repasaEse(tipo, proxima, r)) {
        // En los últimos días la cita se queda SIN atender: así hay tarjetas
        // vencidas esperando hoy (si no, el repaso de hoy saldría vacío).
        if (proxima > -6) break
        proxima++ // más atrás en el año, simplemente se corrió un día
        continue
      }
      const acierto = r() < pAcierto(tipo, proxima)
      caja = acierto ? Math.min(caja + 1, 6) : Math.max(caja - 2, 0)
      anota(idiomaId, proxima, acierto)
      ultima = proxima
      // Caja 0 vuelve "hoy mismo"; en el año demo eso es el día siguiente.
      proxima += Math.max(1, INTERVALOS_DIAS[caja])
    }
    return { caja, proxima, ultima }
  }

  // ── Tarjetas del idioma principal ────────────────────────────────────────
  const tarjetas = datos.tarjetas.map((t) => {
    const { caja, proxima, ultima } = simular(principalId, 'principal', t.dia)
    return {
      idiomaId: principalId,
      termino: t.termino,
      traduccion: t.traduccion,
      ejemplo: t.ejemplo,
      tipo: t.tipo,
      temaId: t.tema,
      nivel: t.nivel,
      caja,
      proximaISO: ctx.fecha(proxima),
      ...(ultima != null ? { ultimaISO: ctx.fecha(ultima) } : {}),
      fuente: (r() < 0.3 ? 'charla' : 'manual') as 'charla' | 'manual',
      creadoEn: enHora(t.dia, '20:30'),
    }
  })

  // ── Tarjetas de japonés: el ejemplo lleva los caracteres al lado ─────────
  const tarjetasJa = datos.tarjetasJa.map((t) => {
    const { caja, proxima, ultima } = simular(japonesId, 'japones', t.dia)
    return {
      idiomaId: japonesId,
      termino: t.termino,
      traduccion: t.traduccion,
      ejemplo: `${t.termino} (${t.lectura})`,
      tipo: t.tipo,
      nivel: 'A1',
      caja,
      proximaISO: ctx.fecha(proxima),
      ...(ultima != null ? { ultimaISO: ctx.fecha(ultima) } : {}),
      fuente: 'manual' as const,
      creadoEn: enHora(t.dia, '21:30'),
    }
  })

  await tarjetasIdiomaRepo.bulkAdd([...tarjetas, ...tarjetasJa])

  // El historial diario, ya agregado (la tabla lleva un par idioma+fecha).
  const filasRepaso: { idiomaId: number; fecha: string; repasos: number; aciertos: number }[] = []
  for (const [idiomaId, porDia] of historial) {
    for (const [off, dia] of porDia) {
      filasRepaso.push({ idiomaId, fecha: ctx.fecha(off), repasos: dia.repasos, aciertos: dia.aciertos })
    }
  }
  await repasosIdiomaRepo.bulkAdd(filasRepaso)

  // ── Temas propios que Pep@ añadió a su temario ──────────────────────────
  await temasIdiomaRepo.bulkAdd(
    datos.temas.map((t, i) => ({
      temaId: `din-demo-idi-${i}`,
      idiomaId: principalId,
      nivel: t.nivel,
      padreId: null,
      titulo: t.titulo,
      descripcion: t.descripcion,
      creadoEn: enHora(t.dia, '20:00'),
    })),
  )

  // ── Una charla guardada con el tutor ─────────────────────────────────────
  const ch = datos.charla
  const convId = await conversacionesIdiomaRepo.add({
    idiomaId: principalId,
    titulo: ch.titulo,
    creadoEn: enHora(ch.dia, '20:00'),
    actualizadoEn: enHora(ch.dia, '20:12'),
    destiladaEn: enHora(ch.dia, '20:12'),
  })
  await mensajesIdiomaRepo.bulkAdd([
    { conversacionId: convId, rol: 'usuario', texto: ch.pregunta, creado: enHora(ch.dia, '20:00') },
    { conversacionId: convId, rol: 'asistente', texto: ch.respuesta, creado: enHora(ch.dia, '20:01') },
  ])

  // ── Material propio (apuntes que se guardó para el viaje y el trabajo) ───
  await materialesIdiomaRepo.bulkAdd(
    datos.materiales.map((m) => ({
      idiomaId: principalId,
      temaId: m.tema,
      tipo: 'texto' as const,
      titulo: m.titulo,
      texto: m.texto,
      creadoEn: enHora(m.dia, '19:00'),
    })),
  )

  // Una meta de cronograma para el idioma principal.
  await rutinasRepo.add({
    nombre: es ? 'Llegar a B1 antes del viaje' : 'Reach B1 before the trip',
    emoji: '🎯',
    dias: [],
    pasos: [],
    activa: true,
    esMeta: true,
    completada: true,
    repeticion: 'una_vez',
    fechaInicio: ctx.fecha(-130),
    color: '#14b8a6',
    orden: 0,
    plantillaId: 'idiomas',
    ambitoId: `idioma:${principalId}`,
    creadoEn: enHora(-300, '09:00'),
  })

  // Las dos que faltan (el B2 que viene y el japonés del viaje), cada una en el
  // ámbito de SU perfil: es lo que las hace salir dentro de su pestaña.
  await sembrarMetasApp(ctx, 'idiomas', {
    ordenDesde: 1,
    ambitos: { principal: `idioma:${principalId}`, japones: `idioma:${japonesId}` },
  })
}
