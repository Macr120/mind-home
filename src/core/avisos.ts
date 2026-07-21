import { useEffect } from 'react'
import { db } from './data/db'
import { fechaLocalISO } from './fechaLocal'
import { metaDiariaDe, sincronizarAgendaDeMeta } from './metaDiaria'
import { notificar } from './notificaciones'
import { plantillasAgendables } from './registry'
import { debeAvisar } from './rutinas'
import { avisoActivo, useAjustes } from './state/ajustesStore'
import { useDiseño } from './state/disenoStore'
import { useWrappedUi } from './state/wrappedUiStore'
import { tGlobal } from './i18n/useT'
import { ultimoCerrado, type TipoPeriodo } from './wrapped/periodo'

/**
 * El reloj de los avisos: revisa cada minuto lo agendado y las metas del día.
 *
 * Vive en App (montado una vez, como `useDiarioProgramado`) y no dentro de un
 * panel: los recordatorios se disparaban desde `RutinasPanel`, que App desmonta
 * al entrar a un cuarto o abrir el editor — o sea que dejaban de avisar justo
 * cuando estabas usando la app.
 */

const LS_ESTADO = 'mh.avisos.estado'
/** Un minuto: en segundo plano el navegador no acelera más los timers. */
const TICK_MS = 60_000
/**
 * Cuánto puede llegar tarde un aviso. Sin esto, abrir la app a las 9:00 vaciaría
 * de golpe todo lo que venció de madrugada; pasado ese margen sigue en el panel,
 * que es donde toca verlo, pero ya no interrumpe.
 */
const VENTANA_TARDE_MIN = 120

interface EstadoAvisos {
  fecha: string
  /** clave del aviso → cuándo se lanzó (ISO). */
  avisados: Record<string, string>
}

/**
 * Lo ya avisado hoy, en localStorage y no en memoria: antes era un `Set` de
 * módulo, así que recargar la página volvía a anunciar lo mismo.
 */
function leerEstado(): EstadoAvisos {
  const hoy = fechaLocalISO()
  try {
    const raw = localStorage.getItem(LS_ESTADO)
    const previo = raw ? (JSON.parse(raw) as EstadoAvisos) : null
    // Día nuevo: se empieza de cero (el rollover de medianoche).
    if (previo?.fecha === hoy) return previo
  } catch {
    /* json corrupto: se regenera */
  }
  return { fecha: hoy, avisados: {} }
}

function marcarAvisado(estado: EstadoAvisos, clave: string) {
  estado.avisados[clave] = new Date().toISOString()
  try {
    localStorage.setItem(LS_ESTADO, JSON.stringify(estado))
  } catch {
    /* quota / modo privado */
  }
}

const enMinutos = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))

const ahoraEnMinutos = () => {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

/** ¿Ya pasó su hora, y no hace tanto como para que avisar sea absurdo? */
function toca(hora: string): boolean {
  const delta = ahoraEnMinutos() - enMinutos(hora)
  return delta >= 0 && delta <= VENTANA_TARDE_MIN
}

/** Rutinas y eventos con hora que ya tocaron y siguen sin hacerse. */
async function avisarRutinas(estado: EstadoAvisos, fecha: string) {
  const rutinas = await db.rutinas.toArray()
  const ejecuciones = await db.ejecucionesRutina.where('fecha').equals(fecha).toArray()

  for (const r of rutinas) {
    if (!r.hora || !toca(r.hora)) continue
    if (!avisoActivo(r.plantillaId)) continue
    if (!debeAvisar(r, ejecuciones)) continue
    const clave = `rutina:${r.id}|${fecha}`
    if (estado.avisados[clave]) continue
    marcarAvisado(estado, clave)
    // Con un paso que sepa registrar, el aviso ofrece hacerlo de un toque; si no,
    // solo lleva a la app (una comida sin nombre ni macros no se registra sola).
    const paso = r.pasos[0]
    await notificar({
      clave,
      titulo: `⏰ ${r.emoji} ${r.nombre}`,
      cuerpo:
        r.pasos.length > 0
          ? tGlobal('avisos.rutinaPasos', 'Te tocan {n} pasos.', { n: r.pasos.length })
          : tGlobal('avisos.rutinaHora', 'Es la hora.'),
      plantillaId: r.plantillaId,
      seccion: r.seccion,
      rutinaId: r.id,
      accionRegistrar: paso?.esquemaId ? paso.titulo : undefined,
      accionAbrir: r.plantillaId ? tGlobal('avisos.abrir', 'Abrir') : undefined,
    })
  }
}

/**
 * Las metas del día que siguen sin cumplirse, a la hora elegida. Solo de las apps
 * que el usuario tiene en la casa (las demás no son suyas todavía) y nunca las
 * `sinRacha`: el jardín no presiona.
 */
async function avisarMetas(estado: EstadoAvisos, fecha: string) {
  const asignadas = new Set(
    useDiseño
      .getState()
      .objetos.map((o) => o.plantillaId)
      .filter((p): p is string => !!p),
  )

  for (const p of plantillasAgendables()) {
    if (!asignadas.has(p.id) || !avisoActivo(p.id)) continue
    const meta = metaDiariaDe(p.id)
    if (!meta || meta.sinRacha) continue
    const clave = `meta:${p.id}|${fecha}`
    if (estado.avisados[clave]) continue

    const avance = await meta.del(fecha)
    if (avance.objetivo <= 0) continue
    const fila = await db.metasDiariasManual
      .where('[plantillaId+fecha]')
      .equals([p.id, fecha])
      .first()
    const cumplida = fila ? fila.hecha : avance.hecho >= avance.objetivo
    // Lo agendado sigue a la meta aunque su app lleve el día entero cerrada.
    await sincronizarAgendaDeMeta(p.id, fecha, cumplida)
    if (cumplida) continue

    marcarAvisado(estado, clave)
    await notificar({
      clave,
      titulo: `${p.icon} ${tGlobal(meta.clave, meta.etiquetaEs)}`,
      cuerpo:
        avance.detalle ??
        tGlobal('avisos.metaFalta', 'Llevas {hecho} de {objetivo}.', {
          hecho: avance.hecho,
          objetivo: avance.objetivo,
        }),
      plantillaId: p.id,
      seccion: meta.seccion,
    })
  }
}

const LS_WRAPPED_AVISADO = (tipo: TipoPeriodo) => `mh.wrapped.avisado.${tipo}`

/**
 * Aviso "tu wrapped está listo": dispara cuando el último periodo CERRADO ya no
 * es el último avisado, así llega aunque la app se abra el miércoles y no el
 * lunes, y solo una vez. La primera ejecución siembra las claves SIN notificar
 * (si no, el día del estreno soltaría los tres avisos de golpe). Cuando toca el
 * del año, ese tick se salta el del mes (lo subsume).
 */
async function avisarWrapped() {
  for (const tipo of ['anio', 'mes', 'semana'] as const) {
    const p = ultimoCerrado(tipo)
    const clave = LS_WRAPPED_AVISADO(tipo)
    const previo = localStorage.getItem(clave)
    if (previo === p.id) continue
    try {
      localStorage.setItem(clave, p.id)
    } catch {
      /* quota / modo privado */
    }
    if (previo === null) continue
    const titulo =
      tipo === 'anio'
        ? tGlobal('wrapped.aviso.titulo.anio', '✨ Tu resumen del año está listo')
        : tipo === 'mes'
          ? tGlobal('wrapped.aviso.titulo.mes', '✨ Tu resumen del mes está listo')
          : tGlobal('wrapped.aviso.titulo.semana', '✨ Tu resumen de la semana está listo')
    await notificar({
      clave: `wrapped:${tipo}|${p.id}`,
      titulo,
      cuerpo: tGlobal('wrapped.aviso.cuerpo', 'Mira tus progresos del periodo.'),
      wrapped: tipo,
      accionAbrir: tGlobal('wrapped.aviso.abrir', 'Ver'),
    })
    if (tipo === 'anio') return
  }
}

export function useAvisos() {
  useEffect(() => {
    const tick = () => {
      void (async () => {
        const fecha = fechaLocalISO()
        const estado = leerEstado()
        // El badge "resumen nuevo" del personaje se refresca SIEMPRE (no depende
        // del interruptor de notificaciones: es visual, no un aviso).
        useWrappedUi.getState().refrescarNuevo()
        const { notif, notifRutinas, notifMetas, notifHoraMetas, notifWrapped } =
          useAjustes.getState()
        if (!notif) return
        try {
          if (notifRutinas) await avisarRutinas(estado, fecha)
          if (notifMetas && toca(notifHoraMetas)) await avisarMetas(estado, fecha)
          if (notifWrapped) await avisarWrapped()
        } catch (err) {
          console.warn('[Mind Home] Falló la revisión de avisos:', err)
        }
      })()
    }
    tick()
    const intervalo = window.setInterval(tick, TICK_MS)
    return () => window.clearInterval(intervalo)
  }, [])
}
