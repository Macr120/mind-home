import { useEffect } from 'react'
import { db } from './data/db'
import { esDemo } from './edicion'
import { fechaLocalISO, isoMasDias } from './fechaLocal'
import type { Asistente } from './chat/mascotas'
import { asistenteResponsable } from './gamificacion/asistentesPlantilla'
import { otorgarSiDiaCerradoCompleto, sembrarListasHistoricas } from './gamificacion/listas'
import { armarPasosHoy } from './hoy'
import {
  estadoMetaDiaria,
  metaDiariaDe,
  sellarDia,
  sincronizarAgendaDeMeta,
  sincronizarMetasDeApp,
} from './metaDiaria'
import { notificar } from './notificaciones'
import { plantillasAgendables, plantillasTodas } from './registry'
import { debeAvisar } from './rutinas'
import { avisoActivo, useAjustes } from './state/ajustesStore'
import { useAsistentes } from './state/asistentesStore'
import { useDiseño } from './state/disenoStore'
import { useMascota } from './state/mascotaStore'
import { useWrappedUi } from './state/wrappedUiStore'
import { tGlobal } from './i18n/useT'
import { ultimoCerrado, type TipoPeriodo } from './wrapped/periodo'

/**
 * El reloj de los avisos: revisa cada minuto lo agendado y las metas del día.
 *
 * Vive en App (montado una vez, como `useDiarioProgramado`) y no dentro de un
 * panel: cuando los disparaba el viejo panel de rutinas (hoy retirado), App lo
 * desmontaba al entrar a un cuarto o abrir el editor — o sea que dejaban de
 * avisar justo cuando estabas usando la app.
 */

const LS_ESTADO = 'mh.avisos.estado'
/** Cuántos días atrás se congela el cumplimiento (ver `mantenimientoDiario`). */
const MARGEN_SELLO_DIAS = 2
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

/**
 * Quién avisa de esta app: el asistente que el usuario le asignó y, mientras no
 * asigne ninguno, el que tiene activo. El mismo que enseña su cara en el panel de
 * Objetivos — el aviso y la cara tienen que ser la misma persona.
 */
const asistenteDeApp = (plantillaId?: string): Asistente | undefined =>
  plantillaId
    ? asistenteResponsable(
        useAsistentes.getState().lista,
        plantillaId,
        useMascota.getState().mascota,
      )
    : undefined

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
      asistenteId: asistenteDeApp(r.plantillaId)?.id,
    })
  }
}

/** Las apps que el usuario tiene puestas en la casa (las demás no son suyas todavía). */
function appsEnLaCasa(): Set<string> {
  return new Set(
    useDiseño
      .getState()
      .objetos.map((o) => o.plantillaId)
      .filter((p): p is string => !!p),
  )
}

/**
 * Lo que hay que hacer cada día pase lo que pase: cerrar las metas de ritmo que ya
 * sumaron sus días, reflejar el objetivo cumplido en lo agendado y congelar el día
 * de ayer para que no lo mueva un cambio de objetivo.
 *
 * Fuera de `avisarMetas` a propósito: aquello depende de que el usuario quiera
 * notificaciones (`mh.notif` nace apagado) y de la hora que eligiera, y el estado
 * de sus datos no puede depender de un interruptor de avisos.
 */
async function mantenimientoDiario(fecha: string) {
  const asignadas = appsEnLaCasa()
  // Anteayer y no ayer: un sello es definitivo, así que se le da un día entero de
  // margen para que lleguen los registros que otro dispositivo hizo tarde. Sellar
  // en cuanto pasa la medianoche congelaría el cero de un día que aún no acabó de
  // sincronizarse.
  const cerrado = isoMasDias(fecha, -MARGEN_SELLO_DIAS)
  for (const p of plantillasAgendables()) {
    if (!asignadas.has(p.id)) continue
    await sincronizarMetasDeApp(p.id, fecha)
    const estado = await estadoMetaDiaria(p.id, fecha)
    if (estado) await sincronizarAgendaDeMeta(p.id, fecha, estado.cumplida)
    await sellarDia(p.id, cerrado)
    // Red de seguridad del XP: si ese día cerrado quedó con la lista completa
    // sin que ningún panel lo viera, se otorga aquí (sin celebración).
    await otorgarSiDiaCerradoCompleto(p.id, cerrado)
  }
}

/**
 * Las metas del día que siguen sin cumplirse, a la hora elegida. Solo de las apps
 * que el usuario tiene en la casa y nunca las `sinRacha`: el jardín no presiona.
 */
async function avisarMetas(estado: EstadoAvisos, fecha: string) {
  const asignadas = appsEnLaCasa()

  for (const p of plantillasAgendables()) {
    if (!asignadas.has(p.id) || !avisoActivo(p.id)) continue
    const meta = metaDiariaDe(p.id)
    if (!meta || meta.sinRacha) continue
    const clave = `meta:${p.id}|${fecha}`
    if (estado.avisados[clave]) continue

    // Por `estadoMetaDiaria` y no a mano: el override vive en una fila por app,
    // día y objetivo, y resolver cuál toca es cosa suya.
    const estadoMeta = await estadoMetaDiaria(p.id, fecha)
    if (!estadoMeta || estadoMeta.avance.objetivo <= 0 || estadoMeta.cumplida) continue
    const { avance } = estadoMeta

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
      asistenteId: asistenteDeApp(p.id)?.id,
    })
  }
}

/**
 * Lo que el usuario se propuso en una app y hoy sigue pendiente **sin hora**: los
 * objetivos del catálogo se ponen marcando días, no relojes, así que nunca pasan
 * por `avisarRutinas`. Aquí los recoge su asistente una vez al día, a la misma
 * hora que las metas.
 *
 * Se salta la app si `avisarMetas` ya habló hoy de ella: dos avisos seguidos del
 * mismo cuarto y el mismo asistente es ruido, no insistencia.
 */
async function avisarObjetivos(estado: EstadoAvisos, fecha: string) {
  const asignadas = appsEnLaCasa()

  for (const p of plantillasTodas()) {
    if (!asignadas.has(p.id) || !avisoActivo(p.id)) continue
    if (estado.avisados[`meta:${p.id}|${fecha}`]) continue
    const clave = `objetivos:${p.id}|${fecha}`
    if (estado.avisados[clave]) continue

    // Solo lo agendado sin hora: lo que la tiene ya avisó (o avisará) a la suya, y
    // los objetivos propios de la app son cosa de `avisarMetas`.
    const pasos = await armarPasosHoy(p.id, fecha)
    const pendientes = pasos.filter((x) => x.origen === 'rutina' && !x.hora && !x.hecho)
    if (pendientes.length === 0) continue

    marcarAvisado(estado, clave)
    const quien = asistenteDeApp(p.id)
    await notificar({
      clave,
      titulo: quien ? `${quien.emoji} ${quien.nombre}` : `${p.icon} ${p.nombre.split(' · ')[0]}`,
      cuerpo:
        pendientes.length === 1
          ? pendientes[0].titulo
          : tGlobal('avisos.objetivos', 'Te faltan {n} misiones en {app}.', {
              n: pendientes.length,
              app: tGlobal(`room.${p.id}.nombre`, p.nombre).split(' · ')[0],
            }),
      plantillaId: p.id,
      seccion: pendientes[0].seccion,
      accionAbrir: tGlobal('avisos.abrir', 'Abrir'),
      asistenteId: quien?.id,
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
    // Casa demo: sin recordatorios (notificarían las rutinas de Pep@ y
    // `sincronizarAgendaDeMeta` chocaría con el guard de solo lectura).
    if (esDemo()) return
    // Una vez por dispositivo: el histórico aproximado de listas cumplidas.
    void sembrarListasHistoricas().catch((err) =>
      console.warn('[MPH] Falló la siembra de listas cumplidas:', err),
    )
    const tick = () => {
      void (async () => {
        const fecha = fechaLocalISO()
        const estado = leerEstado()
        // El badge "resumen nuevo" del personaje se refresca SIEMPRE (no depende
        // del interruptor de notificaciones: es visual, no un aviso).
        useWrappedUi.getState().refrescarNuevo()
        try {
          // Antes del interruptor: esto es el estado de sus datos, no un aviso.
          await mantenimientoDiario(fecha)
        } catch (err) {
          console.warn('[MPH] Falló el mantenimiento diario:', err)
        }
        const { notif, notifRutinas, notifMetas, notifHoraMetas, notifWrapped } =
          useAjustes.getState()
        if (!notif) return
        try {
          if (notifRutinas) await avisarRutinas(estado, fecha)
          if (notifMetas && toca(notifHoraMetas)) {
            await avisarMetas(estado, fecha)
            await avisarObjetivos(estado, fecha)
          }
          if (notifWrapped) await avisarWrapped()
        } catch (err) {
          console.warn('[MPH] Falló la revisión de avisos:', err)
        }
      })()
    }
    tick()
    const intervalo = window.setInterval(tick, TICK_MS)
    return () => window.clearInterval(intervalo)
  }, [])
}
