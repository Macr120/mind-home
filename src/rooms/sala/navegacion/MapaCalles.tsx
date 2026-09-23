import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import type { ItinerarioNav, PuntoNav } from '../../../core/data/db'
import { useAjustes } from '../../../core/state/ajustesStore'
import { EMOJIS, type NombreIcono } from '../../../core/ui/iconos/catalogo'
import { ATRIBUCION, teselas } from './config'
import type { PosicionGps } from './geo'
import { COLOR_MODO, familiaModo } from './modos'

/** Lugar guardado dibujado en el mapa, con el pin (icono y color) de su categoría. */
export interface PinLugar {
  nombre: string
  lat: number
  lng: number
  icono: NombreIcono
  color: string
}

interface Props {
  origen: PuntoNav | null
  destino: PuntoNav | null
  itinerario: ItinerarioNav | null
  posicion: PosicionGps | null
  /** Navegación viva: la cámara sigue la posición (salvo que el usuario acabe de mover el mapa). */
  seguir: boolean
  /** Tramo en curso durante la navegación; los demás se atenúan. */
  tramoActivo: number | null
  /** Modo «elegir en el mapa»: al tocar devuelve la coordenada. */
  onTocar?: (p: { lat: number; lng: number }) => void
  eligiendo: boolean
  /** Centro tras un gesto del usuario: sirve para sesgar el buscador a esa zona. */
  onMover?: (p: { lat: number; lng: number }) => void
  /** Alto en píxeles si el usuario lo estiró; si no, manda el de las clases. */
  alto?: number | null
  /** Lugares guardados: se pintan con el pin de su categoría. */
  lugares?: PinLugar[]
  /** Tocar un lugar guardado lo pone de destino. */
  onLugar?: (p: PuntoNav) => void
}

const teselasDeTema = (idioma: string) =>
  teselas(document.documentElement.dataset.baseUi === 'claro' ? 'claro' : 'oscuro', idioma)

const ICONO_ORIGEN = L.divIcon({
  className: '',
  html: '<div style="width:16px;height:16px;border-radius:50%;background:#22c55e;border:3px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.35)"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})
const ICONO_DESTINO = L.divIcon({
  className: '',
  html:
    '<svg width="28" height="36" viewBox="0 0 28 36"><path d="M14 35C14 35 2 21 2 13a12 12 0 0 1 24 0c0 8-12 22-12 22z" fill="#ef4444" stroke="#fff" stroke-width="2"/><circle cx="14" cy="13" r="4.5" fill="#fff"/></svg>',
  iconSize: [28, 36],
  iconAnchor: [14, 35],
})
/**
 * Pin de un lugar guardado: gota del color de su categoría con el icono dentro.
 * Va el EMOJI del catálogo aunque la interfaz esté en estilo profesional: el
 * marcador es HTML suelto de Leaflet, fuera de React, y no puede montar el SVG.
 */
const iconoLugar = (icono: NombreIcono, color: string) =>
  L.divIcon({
    className: '',
    html:
      `<div style="display:grid;place-items:center;width:26px;height:26px;border-radius:50% 50% 50% 0;` +
      `transform:rotate(-45deg);background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.5)">` +
      `<span style="transform:rotate(45deg);font-size:13px;line-height:1">${EMOJIS[icono]}</span></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
  })

const ICONO_POSICION = L.divIcon({
  className: '',
  html: '<div style="width:18px;height:18px;border-radius:50%;background:#3b82f6;border:3px solid #fff;box-shadow:0 0 0 2px rgba(59,130,246,.35)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

/** Mapa de calles (Leaflet + teselas raster) con origen, destino, trazo por tramos y posición GPS. */
export default function MapaCalles({
  origen,
  destino,
  itinerario,
  posicion,
  seguir,
  tramoActivo,
  onTocar,
  eligiendo,
  onMover,
  alto,
  lugares,
  onLugar,
}: Props) {
  const idioma = useAjustes((s) => s.idioma)
  const div = useRef<HTMLDivElement>(null)
  const mapa = useRef<L.Map | null>(null)
  const capaTeselas = useRef<L.TileLayer | null>(null)
  const idiomaRef = useRef(idioma)
  const capaRuta = useRef<L.LayerGroup | null>(null)
  const capaPuntos = useRef<L.LayerGroup | null>(null)
  const capaLugares = useRef<L.LayerGroup | null>(null)
  const onTocarRef = useRef(onTocar)
  const onMoverRef = useRef(onMover)
  const onLugarRef = useRef(onLugar)
  /** Último gesto del usuario sobre el mapa: la cámara no lo pisa durante unos segundos. */
  const ultimoGesto = useRef(0)
  /** Último punto elegido TOCANDO el mapa: ya está a la vista, encuadrarlo sobraría. */
  const ultimoToque = useRef<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    onTocarRef.current = onTocar
    onMoverRef.current = onMover
    onLugarRef.current = onLugar
  }, [onTocar, onMover, onLugar])

  // Las etiquetas del mapa siguen el idioma de la interfaz.
  useEffect(() => {
    idiomaRef.current = idioma
    capaTeselas.current?.setUrl(teselasDeTema(idioma))
  }, [idioma])

  // El mapa se crea una sola vez.
  useEffect(() => {
    const el = div.current
    if (!el) return
    const m = L.map(el, { zoomControl: true, attributionControl: true, worldCopyJump: true })
    m.setView([20, 0], 2)
    capaTeselas.current = L.tileLayer(teselasDeTema(idiomaRef.current), { attribution: ATRIBUCION, maxZoom: 18 }).addTo(m)
    capaRuta.current = L.layerGroup().addTo(m)
    capaLugares.current = L.layerGroup().addTo(m)
    capaPuntos.current = L.layerGroup().addTo(m)
    m.on('click', (e: L.LeafletMouseEvent) => {
      // `wrap()` por lo mismo que en `moveend`: tras cruzar el antimeridiano
      // Leaflet da longitudes fuera de rango que ningún servicio acepta.
      const p = e.latlng.wrap()
      ultimoToque.current = { lat: p.lat, lng: p.lng }
      onTocarRef.current?.({ lat: p.lat, lng: p.lng })
    })
    // Solo los movimientos que vienen de un gesto: los que hace la propia app
    // (encuadrar la ruta, seguir al usuario) no dicen a dónde mira el usuario.
    // Y solo con el mapa acercado: el centro de un mapamundi no es una ciudad.
    // `wrap()` es obligatorio: al cruzar el antimeridiano Leaflet devuelve
    // longitudes fuera de rango (−684°) que ningún servicio acepta.
    m.on('moveend', () => {
      if (Date.now() - ultimoGesto.current > 4000 || m.getZoom() < 6) return
      const c = m.getCenter().wrap()
      onMoverRef.current?.({ lat: c.lat, lng: c.lng })
    })
    const gesto = () => {
      ultimoGesto.current = Date.now()
    }
    el.addEventListener('pointerdown', gesto)
    el.addEventListener('wheel', gesto, { passive: true })
    // Las teselas siguen la base clara/oscura de la interfaz.
    const obs = new MutationObserver(() => capaTeselas.current?.setUrl(teselasDeTema(idiomaRef.current)))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-base-ui'] })
    // El contenedor cambia de tamaño al plegar paneles o girar el teléfono.
    const ro = new ResizeObserver(() => m.invalidateSize())
    ro.observe(el)
    mapa.current = m
    return () => {
      obs.disconnect()
      ro.disconnect()
      el.removeEventListener('pointerdown', gesto)
      el.removeEventListener('wheel', gesto)
      m.remove()
      mapa.current = null
    }
  }, [])

  // Origen, destino y posición.
  useEffect(() => {
    const capa = capaPuntos.current
    if (!capa) return
    capa.clearLayers()
    if (origen) L.marker([origen.lat, origen.lng], { icon: ICONO_ORIGEN, interactive: false }).addTo(capa)
    if (destino) L.marker([destino.lat, destino.lng], { icon: ICONO_DESTINO, interactive: false }).addTo(capa)
    if (posicion) {
      L.circle([posicion.lat, posicion.lng], {
        radius: posicion.precision,
        color: '#3b82f6',
        weight: 1,
        opacity: 0.4,
        fillOpacity: 0.08,
        interactive: false,
      }).addTo(capa)
      L.marker([posicion.lat, posicion.lng], { icon: ICONO_POSICION, interactive: false, zIndexOffset: 1000 }).addTo(capa)
    }
  }, [origen, destino, posicion])

  // Lugares guardados: van en su propia capa, bajo el origen y el destino.
  useEffect(() => {
    const capa = capaLugares.current
    if (!capa) return
    capa.clearLayers()
    for (const l of lugares ?? []) {
      L.marker([l.lat, l.lng], { icon: iconoLugar(l.icono, l.color), keyboard: false })
        .bindTooltip(l.nombre, { direction: 'top', offset: [0, -24] })
        .on('click', () => onLugarRef.current?.({ nombre: l.nombre, lat: l.lat, lng: l.lng }))
        .addTo(capa)
    }
  }, [lugares])

  // Trazo del itinerario, un color por modo; encuadre al cambiar de itinerario.
  useEffect(() => {
    const capa = capaRuta.current
    const m = mapa.current
    if (!capa || !m) return
    capa.clearLayers()
    if (!itinerario) {
      if (origen && destino) {
        m.fitBounds(L.latLngBounds([[origen.lat, origen.lng], [destino.lat, destino.lng]]), { padding: [40, 40], maxZoom: 15 })
      } else if (origen || destino) {
        const p = (origen ?? destino) as PuntoNav
        // Un punto que acaba de salir de un toque YA está donde el usuario mira:
        // acercarse a zoom 13 lo dejaba mirando un cuadro de mar (un píxel del
        // mapamundi son cientos de kilómetros). Solo se encuadra lo que llega
        // del buscador o de «Mi ubicación», que sí es una coordenada exacta.
        const t = ultimoToque.current
        if (!t || t.lat !== p.lat || t.lng !== p.lng) m.setView([p.lat, p.lng], Math.max(m.getZoom(), 13))
      }
      return
    }
    const todos: [number, number][] = []
    itinerario.piernas.forEach((p, i) => {
      if (p.puntos.length < 2) return
      const color = p.color ?? COLOR_MODO[familiaModo(p.modo)]
      const activo = tramoActivo == null || tramoActivo === i
      const aPie = familiaModo(p.modo) === 'WALK'
      L.polyline(p.puntos, { color: '#000', weight: aPie ? 6 : 9, opacity: activo ? 0.25 : 0.08, interactive: false }).addTo(capa)
      L.polyline(p.puntos, {
        color,
        weight: aPie ? 4 : 6,
        opacity: activo ? 1 : 0.4,
        dashArray: aPie ? '1 9' : undefined,
        lineCap: 'round',
        interactive: false,
      }).addTo(capa)
      todos.push(...p.puntos)
      // Punto de cambio de modo o de línea.
      if (i > 0) {
        L.circleMarker(p.puntos[0], { radius: 5, color, weight: 2, fillColor: '#fff', fillOpacity: 1, interactive: false }).addTo(capa)
      }
    })
    if (todos.length && tramoActivo == null) m.fitBounds(L.latLngBounds(todos), { padding: [30, 30] })
  }, [itinerario, tramoActivo, origen, destino])

  // Navegación viva: seguir la posición.
  useEffect(() => {
    const m = mapa.current
    if (!m || !seguir || !posicion) return
    if (Date.now() - ultimoGesto.current < 8000) return
    m.setView([posicion.lat, posicion.lng], Math.max(m.getZoom(), 16), { animate: true })
  }, [seguir, posicion])

  return (
    <div
      ref={div}
      // `isolate` + `z-0`: los z-index internos de Leaflet (hasta 1000) no se cuelan sobre los diálogos de la app.
      // La clase va FIJA y el cursor por `style`: Leaflet se añade las suyas
      // (`leaflet-container`…) a mano, y si React reescribiera `className` al
      // cambiar de modo se las llevaría por delante y el mapa se vería en blanco.
      // `@3xl`/`@5xl`: en dos columnas (ver NavegarTab) el mapa manda, así que
      // crece con el ancho del panel; a pantalla completa se lleva medio alto.
      className="relative isolate z-0 h-64 w-full overflow-hidden rounded-xl border border-white/10 sm:h-80 @3xl:h-96 @5xl:h-[32rem]"
      style={{
        background: 'var(--ui-panel)',
        cursor: eligiendo ? 'crosshair' : undefined,
        height: alto ?? undefined,
      }}
    />
  )
}
