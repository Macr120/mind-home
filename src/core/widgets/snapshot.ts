import { db } from '../data/db'
import { useDiseño } from '../state/disenoStore'
import { tGlobal, idiomaActual, localeActual } from '../i18n/useT'
import { hoyISO } from '../rutinas'
import { armarPasosDeTodas, repartirPasos } from '../hoy'
import { progresoDeEnfoques, EMOJI_HUMOR } from '../gamificacion/actividad'
import { estadoSisifoActual } from '../gamificacion/sisifo'
import type { ItemHoy, SnapshotWidgets } from './tipos'

const recortar = (s: string, n: number): string => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

/**
 * Arma el snapshot que pintan los widgets nativos. Función async pura (sin
 * hooks): la llama `useWidgets` dentro de un `useLiveQuery` —todo lo que lee es
 * Dexie o stores síncronos, así que la reactividad se conserva— y también el
 * ciclo de acciones, que necesita re-publicar fuera de React.
 */
export async function armarSnapshot(): Promise<SnapshotWidgets> {
  const fecha = hoyISO()

  // Las MISIONES de hoy de toda la casa: la misma lista que el botón «Misiones»
  // del reloj (`armarPasosDeTodas`), no una copia. El widget armaba antes su
  // propia mezcla de rutinas y metas diarias, así que enseñaba una cosa y la app
  // otra —y las metas diarias ya ni son la unidad con la que se pide el día—.
  const grupos = await armarPasosDeTodas(fecha)
  const items: ItemHoy[] = []
  for (const g of grupos) {
    // De dónde sale la misión. En la lista plana del widget no hay cabeceras por
    // app, así que el cuarto va en la línea de abajo de cada renglón.
    const deQuien = g.app
      ? tGlobal(`room.${g.app.id}.nombre`, g.app.nombre).split(' · ')[0]
      : tGlobal('hoy.casa.personales', 'Personales')
    for (const p of repartirPasos(g.pasos).cuentan) {
      // La misión de ARRANQUE no se palomea (se cumple creando la primera): aquí
      // solo sería un renglón que no responde al tap.
      if (p.accion.tipo === 'sinMisiones') continue
      items.push({
        id: p.id,
        tipo: p.origen,
        titulo: p.titulo,
        detalle: [deQuien, p.detalle ?? p.deQuien].filter(Boolean).join(' · '),
        emoji: p.emoji || g.app?.icon,
        hora: p.hora || undefined,
        hecho: p.hecho,
        urgente: p.urgente,
      })
    }
  }
  // Lo que falta arriba (lo atrasado, primero) y lo cumplido al fondo: la lista
  // del launcher se ve de tres renglones, y ahí lo pendiente no puede quedar
  // debajo de lo que ya está hecho.
  items.sort((a, b) => {
    if (a.hecho !== b.hecho) return a.hecho ? 1 : -1
    if (!!a.urgente !== !!b.urgente) return a.urgente ? -1 : 1
    return (a.hora ?? '99:99').localeCompare(b.hora ?? '99:99')
  })
  const hechas = items.filter((i) => i.hecho).length

  // Resumen: progreso del tamagotchi + Sísifo + próximo con hora + efeméride.
  const ids = [
    ...new Set(useDiseño.getState().objetos.map((o) => o.plantillaId).filter((p): p is string => !!p)),
  ].sort()
  const progreso = await progresoDeEnfoques(ids)
  const sisifo = await estadoSisifoActual()

  const ahora = new Date()
  const horaActual = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`
  const prox = items.find((i) => !i.hecho && i.hora && i.hora >= horaActual)
  const proximo = prox?.hora ? { titulo: prox.titulo, hora: prox.hora } : null

  // La edición del diario es efímera (solo vive la del día): si aún no se generó,
  // el widget sale sin efeméride. Nunca se dispara aquí la carga (red + IA).
  const edicion = (await db.edicionesDiario.toArray()).find((e) => e.fecha === fecha)
  const ef = edicion?.efemerides.find((e) => e.tipo === 'historia') ?? edicion?.efemerides[0]
  const efemeride = ef ? { titulo: ef.titulo, anio: ef.anio, texto: recortar(ef.texto, 200) } : null

  return {
    version: 1,
    fecha,
    idioma: idiomaActual(),
    textos: {
      titulo: tGlobal('hoy.titulo', 'Misiones'),
      fechaLarga: ahora.toLocaleDateString(localeActual(), { weekday: 'long', day: 'numeric', month: 'long' }),
      // Fecha partida en tres para el widget de la casa (el día, en grande).
      diaNumero: String(ahora.getDate()),
      diaSemana: ahora.toLocaleDateString(localeActual(), { weekday: 'long' }),
      mesAnio: ahora.toLocaleDateString(localeActual(), { month: 'long', year: 'numeric' }),
      humor: EMOJI_HUMOR[progreso.humor],
      racha: `🔥 ${progreso.racha}`,
      nivel: tGlobal('widgets.nivel', 'Nivel {n}', { n: progreso.nivel }),
      // Sin palabra al lado del título, que ya dice «Misiones»: la cifra sola cabe
      // en la cabecera en los dieciséis idiomas.
      misiones: items.length > 0 ? `${hechas}/${items.length}` : '',
      sisifo: sisifo ? `⛰️ ${tGlobal('widgets.sisifo', 'Día {d} · Rango {r}', { d: sisifo.altura, r: sisifo.rango })}` : '',
      proximoTitulo: tGlobal('widgets.proximoTitulo', 'Próximo'),
      proximo: proximo ? `${proximo.hora} · ${proximo.titulo}` : tGlobal('widgets.sinProximo', 'Nada pendiente con hora'),
      efemerideTitulo: efemeride ? tGlobal('widgets.efemerideTitulo', 'Tal día como hoy') : '',
      efemerideTexto: efemeride
        ? `${efemeride.titulo}${efemeride.anio ? ` (${efemeride.anio})` : ''} — ${efemeride.texto}`
        : '',
      vacio: tGlobal('hoy.casa.vacio', 'Nada pendiente hoy en ninguna app.'),
      desactualizado: tGlobal('widgets.desactualizado', 'Toca para actualizar'),
    },
    hoy: items,
    resumen: {
      racha: progreso.racha,
      nivel: progreso.nivel,
      xp: progreso.xp,
      humor: EMOJI_HUMOR[progreso.humor],
      sisifo,
      proximo,
      efemeride,
      misionesHechas: hechas,
      misionesTotal: items.length,
    },
  }
}
