import { db, type Rutina } from '../data/db'
import { visibles } from '../data/ejemplos'
import { useDiseño } from '../state/disenoStore'
import { appsAsignadas } from '../chat/dispatcher'
import { tGlobal, idiomaActual, localeActual } from '../i18n/useT'
import { hoyISO, tocaHoy, pasosHechosHoy } from '../rutinas'
import { estadoMetaDiaria } from '../metaDiaria'
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

  // Rutinas y eventos del día. Los de Agenda (citas, medicamentos, cumpleaños,
  // cuidados) ya viven proyectados como rutinas, así que esta lista los incluye
  // sin leer sus tablas — y palomearlos aquí equivale a palomear su bloque del
  // calendario (reconciliarAgenda repara la ficha al abrir la room).
  const rutinas = visibles(await db.rutinas.toArray()).filter(tocaHoy)
  const ejecs = await db.ejecucionesRutina.where('fecha').equals(fecha).toArray()
  const hechaHoy = (r: Rutina): boolean => {
    if (r.pasos.length > 0) return pasosHechosHoy(r, ejecs).size >= r.pasos.length
    return !!ejecs.find((e) => e.rutinaId === r.id)?.hecho
  }
  const itemsRutina: ItemHoy[] = rutinas
    .filter((r) => r.id != null)
    .map((r) => ({
      id: `rutina:${r.id}`,
      tipo: 'rutina' as const,
      titulo: r.nombre,
      emoji: r.emoji,
      hora: r.hora || undefined,
      hecho: hechaHoy(r),
    }))
    .sort((a, b) => (a.hora && b.hora ? a.hora.localeCompare(b.hora) : a.hora ? -1 : b.hora ? 1 : 0))

  // Metas diarias de las apps asignadas: el mismo estado que la barra del cuarto.
  const itemsMeta: ItemHoy[] = []
  for (const p of appsAsignadas()) {
    const estado = await estadoMetaDiaria(p.id, fecha)
    if (!estado || estado.avance.objetivo <= 0) continue
    const etiqueta = tGlobal(estado.meta.clave, estado.meta.etiquetaEs)
    itemsMeta.push({
      id: `meta:${p.id}`,
      tipo: 'meta',
      titulo: tGlobal(`room.${p.id}.nombre`, p.nombre).split(' · ')[0],
      detalle:
        estado.avance.objetivo > 1
          ? `${etiqueta} · ${estado.avance.hecho}/${estado.avance.objetivo}`
          : etiqueta,
      emoji: p.icon,
      hecho: estado.cumplida,
    })
  }

  // Resumen: progreso del tamagotchi + Sísifo + próximo con hora + efeméride.
  const ids = [
    ...new Set(useDiseño.getState().objetos.map((o) => o.plantillaId).filter((p): p is string => !!p)),
  ].sort()
  const progreso = await progresoDeEnfoques(ids)
  const sisifo = await estadoSisifoActual()

  const ahora = new Date()
  const horaActual = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`
  const prox = itemsRutina.find((i) => !i.hecho && i.hora && i.hora >= horaActual)
  const proximo = prox?.hora ? { titulo: prox.titulo, hora: prox.hora } : null

  // La edición del diario es efímera (solo vive la del día): si aún no se generó,
  // el widget sale sin efeméride. Nunca se dispara aquí la carga (red + IA).
  const edicion = (await db.edicionesDiario.toArray()).find((e) => e.fecha === fecha)
  const ef = edicion?.efemerides.find((e) => e.tipo === 'historia') ?? edicion?.efemerides[0]
  const efemeride = ef ? { titulo: ef.titulo, anio: ef.anio, texto: recortar(ef.texto, 200) } : null

  const metasHechas = itemsMeta.filter((m) => m.hecho).length

  return {
    version: 1,
    fecha,
    idioma: idiomaActual(),
    textos: {
      titulo: tGlobal('widgets.titulo', 'Hoy'),
      fechaLarga: ahora.toLocaleDateString(localeActual(), { weekday: 'long', day: 'numeric', month: 'long' }),
      // Fecha partida en tres para el widget de la casa (el día, en grande).
      diaNumero: String(ahora.getDate()),
      diaSemana: ahora.toLocaleDateString(localeActual(), { weekday: 'long' }),
      mesAnio: ahora.toLocaleDateString(localeActual(), { month: 'long', year: 'numeric' }),
      humor: EMOJI_HUMOR[progreso.humor],
      racha: `🔥 ${progreso.racha}`,
      nivel: tGlobal('widgets.nivel', 'Nivel {n}', { n: progreso.nivel }),
      metas: tGlobal('widgets.metas', 'Metas {h}/{t}', { h: metasHechas, t: itemsMeta.length }),
      sisifo: sisifo ? `⛰️ ${tGlobal('widgets.sisifo', 'Día {d} · Rango {r}', { d: sisifo.altura, r: sisifo.rango })}` : '',
      proximoTitulo: tGlobal('widgets.proximoTitulo', 'Próximo'),
      proximo: proximo ? `${proximo.hora} · ${proximo.titulo}` : tGlobal('widgets.sinProximo', 'Nada pendiente con hora'),
      efemerideTitulo: efemeride ? tGlobal('widgets.efemerideTitulo', 'Tal día como hoy') : '',
      efemerideTexto: efemeride
        ? `${efemeride.titulo}${efemeride.anio ? ` (${efemeride.anio})` : ''} — ${efemeride.texto}`
        : '',
      vacio: tGlobal('widgets.vacio', 'Nada agendado para hoy'),
      desactualizado: tGlobal('widgets.desactualizado', 'Toca para actualizar'),
    },
    hoy: [...itemsRutina, ...itemsMeta],
    resumen: {
      racha: progreso.racha,
      nivel: progreso.nivel,
      xp: progreso.xp,
      humor: EMOJI_HUMOR[progreso.humor],
      sisifo,
      proximo,
      efemeride,
      metasHechas,
      metasTotal: itemsMeta.length,
    },
  }
}
