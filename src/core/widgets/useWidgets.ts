import { useEffect, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { esAppNativa } from '../plataforma'
import { esDemo } from '../edicion'
import { abrirApp } from '../abrirApp'
import { hoyISO } from '../rutinas'
import { useHouse } from '../state/houseStore'
import { useDiseño } from '../state/disenoStore'
import { esAccionGlobal, lanzarAccionGlobal } from '../state/accionGlobal'
import { Widgets } from './plugin'
import { armarSnapshot } from './snapshot'
import { fotoCasa, reducirFoto } from './CapturaCasa'
import { aplicarAccionesPendientes } from './acciones'
import type { SnapshotWidgets } from './tipos'

/** Ancho al que se reduce la foto de la casa antes de mandarla al widget. */
const ANCHO_FOTO = 640

/**
 * Mantiene vivos los widgets nativos de Android. Va montado una vez en App
 * (como useAvisos): publica el snapshot cuando cambian los datos (liveQuery +
 * debounce) y la foto de la casa cuando cambia el diseño, drena la cola de
 * acciones del widget al arrancar y al volver a la app, y re-publica al cambiar
 * el día. Fuera de la app nativa —o en la casa demo, cuyos datos no son del
 * usuario— no hace nada.
 */
export function useWidgets(): void {
  // Ambos son fijos por sesión: la demo y la plataforma se deciden al cargar.
  const activo = esAppNativa() && !esDemo()

  // Reactivo: rastrea todas las tablas Dexie que lee armarSnapshot. Qué apps
  // tiene la casa sale además del DISEÑO, no de Dexie: sin esa dependencia el
  // primer snapshot —armado antes de que la casa cargue— se quedaría sin
  // misiones hasta la siguiente escritura en la base.
  const apps = useDiseño((s) => {
    const ids = new Set<string>()
    for (const o of s.objetos) if (o.plantillaId) ids.add(o.plantillaId)
    return [...ids].sort().join(',')
  })
  const snapshot = useLiveQuery(() => (activo ? armarSnapshot() : undefined), [activo, apps])

  const timer = useRef<number | undefined>(undefined)
  const fechaPublicada = useRef('')

  useEffect(() => {
    if (!snapshot) return
    // Debounce: el snapshot lee muchas tablas y una racha de escrituras lo
    // recalcularía en cadena; publicar 1 s después de la última basta.
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      void publicar(snapshot).then((ok) => {
        if (ok) fechaPublicada.current = snapshot.fecha
      })
    }, 1000)
    return () => window.clearTimeout(timer.current)
  }, [snapshot])

  // Acciones y deep links de los taps del widget: al arrancar y al volver a la
  // app (resume del WebView = visibilitychange, sin el plugin App de Capacitor).
  useEffect(() => {
    if (!activo) return
    void drenarAcciones()
    void seguirDestino()
    // La casa tarda en montar y en dar su primer frame; sin margen, la foto
    // saldría del canvas todavía vacío.
    const primera = window.setTimeout(() => void publicarFotoCasa(), 3000)
    const alVolver = () => {
      if (document.visibilityState !== 'visible') return
      void drenarAcciones()
      void seguirDestino()
      window.setTimeout(() => void publicarFotoCasa(), 1500)
    }
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      window.clearTimeout(primera)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [activo])

  // La casa cambió (construiste, moviste, pintaste): foto nueva, sin prisa.
  useEffect(() => {
    if (!activo) return
    let espera: number | undefined
    const cancelar = useDiseño.subscribe(() => {
      window.clearTimeout(espera)
      espera = window.setTimeout(() => void publicarFotoCasa(), 10_000)
    })
    return () => {
      window.clearTimeout(espera)
      cancelar()
    }
  }, [activo])

  // Medianoche con la app abierta: lo publicado quedó fechado ayer; re-armar.
  useEffect(() => {
    if (!activo) return
    const reloj = window.setInterval(() => {
      if (!fechaPublicada.current || fechaPublicada.current === hoyISO()) return
      void armarSnapshot()
        .then(publicar)
        .then((ok) => {
          if (ok) fechaPublicada.current = hoyISO()
        })
    }, 60_000)
    return () => window.clearInterval(reloj)
  }, [activo])
}

/** Publica si hay widgets colocados en el launcher. Devuelve si publicó. */
async function publicar(snapshot: SnapshotWidgets): Promise<boolean> {
  try {
    if (!(await Widgets.hayWidgets()).hay) return false
    await Widgets.publicarSnapshot({ json: JSON.stringify(snapshot) })
    return true
  } catch (err) {
    console.warn('[Widgets] no se pudo publicar el snapshot:', err)
    return false
  }
}

/**
 * Manda al widget una foto del frame actual de la casa. Se salta la captura si
 * lo que se vería no es la casa (dentro de un cuarto) o si la app está en
 * segundo plano, donde el canvas ni siquiera está renderizando.
 */
async function publicarFotoCasa(): Promise<void> {
  try {
    if (useHouse.getState().activeRoom || document.visibilityState !== 'visible') return
    if (!(await Widgets.hayWidgets()).casa) return
    const foto = fotoCasa()
    if (!foto) return
    const base64 = await reducirFoto(foto, ANCHO_FOTO)
    if (base64) await Widgets.publicarFotoCasa({ base64 })
  } catch (err) {
    console.warn('[Widgets] no se pudo publicar la foto de la casa:', err)
  }
}

/**
 * Atiende el toque que abrió la app: un cuarto (widget de la casa/agenda) o una
 * acción global (los tres botones del widget de chat).
 */
async function seguirDestino(): Promise<void> {
  try {
    const { appId, seccion, accion } = await Widgets.tomarDestinoPendiente()
    if (accion && esAccionGlobal(accion)) {
      // No hay setTimeout: ChatBox la toma al montarse y la acción caduca sola.
      lanzarAccionGlobal(accion)
      return
    }
    if (!appId) return
    // Mismo margen que los deep links de notificaciones (main.tsx): la casa
    // tarda en montarse y sin esperar, openRoom se pierde en el vacío.
    setTimeout(() => abrirApp(appId, seccion), 500)
  } catch (err) {
    console.warn('[Widgets] no se pudo seguir el destino del widget:', err)
  }
}

/**
 * Toma y aplica las acciones encoladas por el widget y re-publica la verdad
 * (ese publicar además poda los optimistas ya aplicados). En bucle acotado: si
 * mientras se aplicaban cayeron taps nuevos, otra vuelta hasta vaciar la cola.
 */
async function drenarAcciones(): Promise<void> {
  try {
    for (let vuelta = 0; vuelta < 10; vuelta++) {
      const { acciones } = await Widgets.tomarAccionesPendientes()
      if (acciones.length === 0) break
      await aplicarAccionesPendientes(acciones)
      await publicar(await armarSnapshot())
    }
  } catch (err) {
    console.warn('[Widgets] no se pudieron aplicar las acciones del widget:', err)
  }
}
