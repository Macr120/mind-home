import { useEffect, useMemo, useRef, useState } from 'react'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { vivo } from '../../core/ui/estilos'
import { iaActiva } from '../../core/chat/ia'
import { borrarNodosMapa, nodosMapaRepo, useNodosMapa } from '../../core/data/repository'
import type { MapaIdeas, NodoMapa, TipoMapa } from '../../core/data/db'
import { fechaLocalISO } from '../../core/fechaLocal'
import { ANCHO_MIN, COLOR, PALETA_RAMAS } from './constantes'
import {
  bandaPiramide,
  baseEspina,
  cajasZonas,
  centroZona,
  circulosVenn,
  colocarHijo,
  conDescendencia,
  hijosDe,
  poligonoPiramide,
  posEnZona,
  posEtapa,
  raicesDe,
  reapilarCiclo,
  reapilarZona,
} from './layouts'
import { colorRaiz, defTipo, raizDeZona, zonasDe } from './tiposMapa'
import { expandirNodo } from './ia'
import { PanelSugerencias } from './PanelSugerencias'

/**
 * Lienzo libre de los mapas conceptuales (molde de gestos: MapaMundi de viajes).
 *
 * Coordenadas del mundo = px a zoom 1. El viewport es un viewBox `{x, y, w}`
 * (el alto se deriva del contenedor); 1 dedo panea, 2 hacen pellizco y la rueda
 * acerca al cursor. Los nodos son overlays HTML posicionados en % del recuadro
 * visible y escalados con el zoom; arrastrar un nodo mueve su subárbol y solo
 * escribe en la base AL SOLTAR (un write por pointermove machaca IndexedDB).
 *
 * El FORMATO del mapa (`tiposMapa.ts`) decide el fondo, cómo se unen los nodos
 * y dónde nace cada nodo nuevo; los de zonas (Venn y comparación) no cuelgan de
 * un padre visual: cada elemento vive en una región y al soltarlo en otra se
 * cambia de región solo.
 */

interface Vista {
  x: number
  y: number
  w: number
}

/** Gesto de arrastre de un nodo: pinta el delta y escribe al soltar. */
interface GestoNodo {
  nodoId: string
  /** El subárbol completo que se mueve con él. */
  ids: Set<string>
  x0: number
  y0: number
  dx: number
  dy: number
  movio: boolean
}

export function LienzoMapa({ mapa }: { mapa: MapaIdeas }) {
  const t = useT()
  const consulta = useNodosMapa(mapa.id ?? null)
  const nodos = useMemo(() => consulta ?? [], [consulta])
  const tipo: TipoMapa = mapa.tipo ?? 'mental'
  const def = defTipo(tipo)

  const contRef = useRef<HTMLDivElement>(null)
  const punteros = useRef(new Map<number, { x: number; y: number }>())
  const arrastre = useRef(0)

  const [rect, setRect] = useState({ w: 1, h: 1 })
  const [vista, setVista] = useState<Vista | null>(null)
  const [gesto, setGesto] = useState<GestoNodo | null>(null)
  const [sel, setSel] = useState<string | null>(null)
  const [editando, setEditando] = useState<string | null>(null)
  const [borrador, setBorrador] = useState('')
  const [confirmandoBorrar, setConfirmandoBorrar] = useState(false)
  const [expandiendo, setExpandiendo] = useState(false)
  const [zonaActiva, setZonaActiva] = useState<string>('')

  const raices = useMemo(() => raicesDe(nodos), [nodos])
  const zonas = useMemo(() => zonasDe(tipo, raices.length), [tipo, raices.length])

  // Caja de los nodos: acota el paneo/zoom y da el encuadre inicial.
  const bb = useMemo(() => {
    const puntos = nodos.map((n) => ({ x: n.x, y: n.y }))
    if (def.porZonas) {
      // Con el mapa vacío, el encuadre debe abarcar igual sus regiones.
      for (const z of zonas) puntos.push(centroZona(tipo, z, raices.length))
      if (tipo === 'venn') {
        for (const c of circulosVenn(raices.length)) {
          puntos.push({ x: c.x - c.r, y: c.y - c.r }, { x: c.x + c.r, y: c.y + c.r })
        }
      } else if (tipo === 'piramide') {
        // La pirámide no tiene recuadros: su caja es la banda de la base.
        const base = bandaPiramide(zonas.length - 1)
        puntos.push({ x: -base.wInf, y: bandaPiramide(0).y }, { x: base.wInf, y: base.y + base.h })
      } else {
        for (const c of cajasZonas(tipo, zonas, raices.length)) {
          puntos.push({ x: c.x, y: c.y }, { x: c.x + c.w, y: c.y + c.h })
        }
      }
    }
    if (puntos.length === 0) return { minX: -300, maxX: 300, minY: -200, maxY: 200 }
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    for (const p of puntos) {
      minX = Math.min(minX, p.x)
      maxX = Math.max(maxX, p.x)
      minY = Math.min(minY, p.y)
      maxY = Math.max(maxY, p.y)
    }
    return { minX, maxX, minY, maxY }
  }, [nodos, def.porZonas, zonas, tipo, raices.length])

  const aspecto = rect.h / Math.max(rect.w, 1)
  const alto = (vista?.w ?? 1) * aspecto

  const clampVista = (v: Vista): Vista => {
    const anchoMax = Math.max(2400, bb.maxX - bb.minX + 1200)
    const w = Math.min(Math.max(v.w, ANCHO_MIN), anchoMax)
    const h = w * aspecto
    const cx = Math.min(Math.max(v.x + w / 2, bb.minX - 600), bb.maxX + 600)
    const cy = Math.min(Math.max(v.y + h / 2, bb.minY - 600), bb.maxY + 600)
    return { x: cx - w / 2, y: cy - h / 2, w }
  }

  const encajarVista = (): Vista => {
    const asp = Math.max(aspecto, 0.01)
    // Ajuste dinámico al contenido real: un margen de aire (no un mínimo fijo),
    // así un mapa chico se ve grande y uno grande se ve completo.
    const w = Math.max(bb.maxX - bb.minX + 220, (bb.maxY - bb.minY + 180) / asp, 360)
    return {
      x: (bb.minX + bb.maxX) / 2 - w / 2,
      y: (bb.minY + bb.maxY) / 2 - (w * asp) / 2,
      w,
    }
  }

  const zoomHacia = (factor: number, clientX?: number, clientY?: number) => {
    const r = contRef.current?.getBoundingClientRect()
    setVista((v) => {
      if (!v || !r) return v
      const px = clientX != null ? (clientX - r.left) / r.width : 0.5
      const py = clientY != null ? (clientY - r.top) / r.height : 0.5
      const asp = r.height / Math.max(r.width, 1)
      const w = v.w / factor
      return clampRef.current({ x: v.x + (v.w - w) * px, y: v.y + (v.w * asp - w * asp) * py, w })
    })
  }

  // Las funciones vigentes se escriben tras CADA render (nunca durante: regla
  // react-hooks/refs), para que los handlers registrados una sola vez las usen.
  const clampRef = useRef(clampVista)
  const encajarRef = useRef(encajarVista)
  const zoomRef = useRef(zoomHacia)
  useEffect(() => {
    clampRef.current = clampVista
    encajarRef.current = encajarVista
    zoomRef.current = zoomHacia
  })

  // Mide el contenedor (el alto del viewBox se deriva de aquí). La primera
  // medida es directa: el ResizeObserver puede tardar un frame en llegar (o no
  // llegar nunca si la pestaña está oculta) y sin ella no habría viewBox.
  useEffect(() => {
    const el = contRef.current
    if (!el) return
    const medir = () => {
      const r = el.getBoundingClientRect()
      setRect({ w: Math.max(r.width, 1), h: Math.max(r.height, 1) })
    }
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Encuadre inicial. Se repite mientras la consulta venga vacía: el primer
  // render llega antes que los nodos y encuadrar con la caja por defecto dejaba
  // el mapa fuera de pantalla.
  const encuadrado = useRef(false)
  useEffect(() => {
    if (consulta === undefined || rect.w <= 1 || encuadrado.current) return
    setVista(encajarRef.current())
    if (consulta.length > 0) encuadrado.current = true
  }, [consulta, rect])

  // La rueda necesita preventDefault (React la registra como pasiva).
  useEffect(() => {
    const el = contRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      zoomRef.current(e.deltaY < 0 ? 1.3 : 1 / 1.3, e.clientX, e.clientY)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // ----- Paneo y pellizco del fondo -----

  const onPointerDown = (e: React.PointerEvent) => {
    try {
      contRef.current?.setPointerCapture(e.pointerId)
    } catch {
      /* puntero ya liberado */
    }
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (punteros.current.size === 1) arrastre.current = 0
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const previo = punteros.current.get(e.pointerId)
    if (!previo) return
    const actual = { x: e.clientX, y: e.clientY }
    if (punteros.current.size === 2) {
      const otro = [...punteros.current.entries()].find(([id]) => id !== e.pointerId)?.[1]
      if (otro) {
        const dPrev = Math.hypot(previo.x - otro.x, previo.y - otro.y)
        const dAct = Math.hypot(actual.x - otro.x, actual.y - otro.y)
        if (dPrev > 0) zoomHacia(dAct / dPrev, (actual.x + otro.x) / 2, (actual.y + otro.y) / 2)
      }
    } else {
      const k = (vista?.w ?? 1) / rect.w
      const dx = (actual.x - previo.x) * k
      const dy = (actual.y - previo.y) * k
      arrastre.current += Math.abs(actual.x - previo.x) + Math.abs(actual.y - previo.y)
      setVista((v) => (v ? clampRef.current({ ...v, x: v.x - dx, y: v.y - dy }) : v))
    }
    punteros.current.set(e.pointerId, actual)
  }

  const onPointerUp = (e: React.PointerEvent) => {
    if (!punteros.current.delete(e.pointerId)) return
    // Toque sin arrastre sobre el fondo = deseleccionar.
    if (arrastre.current < 6 && punteros.current.size === 0) {
      setSel(null)
      setEditando(null)
      setConfirmandoBorrar(false)
    }
  }

  // ----- Arrastre / toque de un nodo -----

  const bajarNodo = (e: React.PointerEvent, n: NodoMapa) => {
    e.stopPropagation()
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      /* puntero ya liberado */
    }
    setGesto({
      nodoId: n.nodoId,
      // En los mapas por zonas cada elemento se mueve solo (no hay ramas).
      ids: def.porZonas ? new Set([n.nodoId]) : conDescendencia(nodos, n.nodoId),
      x0: e.clientX,
      y0: e.clientY,
      dx: 0,
      dy: 0,
      movio: false,
    })
  }

  const moverNodo = (e: React.PointerEvent) => {
    if (!gesto || !vista) return
    const k = vista.w / rect.w
    const movio = gesto.movio || Math.abs(e.clientX - gesto.x0) + Math.abs(e.clientY - gesto.y0) > 6
    setGesto({ ...gesto, dx: (e.clientX - gesto.x0) * k, dy: (e.clientY - gesto.y0) * k, movio })
  }

  const soltarNodo = async (n: NodoMapa) => {
    const g = gesto
    if (!g || g.nodoId !== n.nodoId) return
    setGesto(null)
    if (!g.movio) {
      setConfirmandoBorrar(false)
      if (sel === n.nodoId) {
        // Segundo toque sobre el mismo nodo: editar en el lugar.
        setEditando(n.nodoId)
        setBorrador(n.texto)
      } else {
        setSel(n.nodoId)
        setEditando(null)
        if (n.zona) setZonaActiva(n.zona)
      }
      return
    }
    const x = n.x + g.dx
    const y = n.y + g.dy

    // Mapas por zonas: soltar un elemento cerca de otra región lo cambia de región.
    if (def.porZonas && n.padreId != null) {
      let mejor = n.zona ?? zonas[0]
      let dist = Infinity
      for (const z of zonas) {
        const c = centroZona(tipo, z, raices.length)
        const d = Math.hypot(c.x - x, c.y - y)
        if (d < dist) {
          dist = d
          mejor = z
        }
      }
      if (mejor !== n.zona && n.id != null) {
        const destino = posEnZona(nodos, tipo, mejor, raices.length)
        await nodosMapaRepo.update(n.id, { zona: mejor, ...destino, color: colorDeZona(mejor) })
        for (const p of reapilarZona(
          nodos.filter((o) => o.nodoId !== n.nodoId),
          tipo,
          n.zona ?? '',
          raices.length,
        )) {
          const fila = nodos.find((o) => o.nodoId === p.nodoId)
          if (fila?.id != null) await nodosMapaRepo.update(fila.id, { x: p.x, y: p.y })
        }
        setZonaActiva(mejor)
        return
      }
    }

    for (const nodo of nodos) {
      if (g.ids.has(nodo.nodoId) && nodo.id != null) {
        await nodosMapaRepo.update(nodo.id, { x: nodo.x + g.dx, y: nodo.y + g.dy })
      }
    }
  }

  /** Posición del mundo con el arrastre en curso pintado encima. */
  const pos = (n: NodoMapa) =>
    gesto && gesto.movio && gesto.ids.has(n.nodoId)
      ? { x: n.x + gesto.dx, y: n.y + gesto.dy }
      : { x: n.x, y: n.y }

  // ----- Acciones -----

  const nodoSel = nodos.find((n) => n.nodoId === sel) ?? null

  /** Color de un elemento según su región (las compartidas van neutras). */
  const colorDeZona = (zona: string): string => {
    const i = raizDeZona(tipo, zona)
    return i >= 0 ? (raices[i]?.color ?? colorRaiz(tipo, i)) : COLOR
  }

  const zonaElegida = zonaActiva || zonas[0] || ''

  /** Nodo nuevo: hijo del seleccionado (jerárquicos) o elemento de la región activa. */
  const agregar = async () => {
    if (mapa.id == null) return
    const ahora = new Date().toISOString()
    const base = { mapaId: mapa.id, fecha: fechaLocalISO(), creadoEn: ahora }

    if (def.porZonas) {
      const padre = raices[0]
      if (!padre) return
      const { x, y } = posEnZona(nodos, tipo, zonaElegida, raices.length)
      const nodoId = `nod-${crypto.randomUUID()}`
      await nodosMapaRepo.add({
        ...base,
        nodoId,
        padreId: padre.nodoId,
        texto: t('ideas.mapa.nuevaIdea', 'Nueva idea'),
        x,
        y,
        color: colorDeZona(zonaElegida),
        zona: zonaElegida,
      })
      setSel(nodoId)
      setEditando(nodoId)
      setBorrador('')
      return
    }

    const padre = nodoSel ?? raices[0]
    if (!padre) return
    const color =
      padre.padreId == null
        ? PALETA_RAMAS[hijosDe(nodos, padre.nodoId).length % PALETA_RAMAS.length]
        : (padre.color ?? COLOR)
    const { x, y } = colocarHijo(tipo, nodos, padre)
    const nodoId = `nod-${crypto.randomUUID()}`
    await nodosMapaRepo.add({
      ...base,
      nodoId,
      padreId: padre.nodoId,
      texto: t('ideas.mapa.nuevaIdea', 'Nueva idea'),
      x,
      y,
      color,
      ...(tipo === 'flujo' ? { forma: 'proceso' as const } : {}),
    })
    if (tipo === 'ciclo' && padre.padreId == null) await repartirCiclo(padre, 1)
    setSel(nodoId)
    setEditando(nodoId)
    setBorrador('')
  }

  /**
   * Recoloca las etapas que YA existían cuando entran `nuevas`: la que se acaba
   * de crear nace en su sitio (`colocarHijo`), pero las demás se corren para
   * que el círculo siga repartido por igual.
   */
  const repartirCiclo = async (raiz: NodoMapa, nuevas: number) => {
    const previas = hijosDe(nodos, raiz.nodoId)
    for (const p of reapilarCiclo(previas, previas.length + nuevas)) {
      const fila = nodos.find((o) => o.nodoId === p.nodoId)
      if (fila?.id != null) await nodosMapaRepo.update(fila.id, { x: p.x, y: p.y })
    }
  }

  const guardarNodo = async (n: NodoMapa) => {
    const tx = borrador.trim()
    setEditando(null)
    if (tx && tx !== n.texto && n.id != null) await nodosMapaRepo.update(n.id, { texto: tx })
  }

  /** Sube o baja lo que pesa el punto elegido (1-5) en ventajas y desventajas. */
  const cambiarPeso = async (paso: number) => {
    if (!nodoSel || nodoSel.id == null) return
    const peso = Math.min(5, Math.max(1, (nodoSel.peso ?? 1) + paso))
    if (peso !== (nodoSel.peso ?? 1)) await nodosMapaRepo.update(nodoSel.id, { peso })
  }

  /** Cicla la figura de un paso del diagrama de flujo. */
  const ciclarForma = async (n: NodoMapa) => {
    const orden = ['proceso', 'decision', 'inicio', 'fin'] as const
    const i = orden.indexOf((n.forma ?? 'proceso') as (typeof orden)[number])
    if (n.id != null) await nodosMapaRepo.update(n.id, { forma: orden[(i + 1) % orden.length] })
  }

  const borrarSel = async () => {
    if (!nodoSel || nodoSel.padreId == null) return
    const ids = conDescendencia(nodos, nodoSel.nodoId)
    const filas = nodos.filter((n) => ids.has(n.nodoId) && n.id != null).map((n) => n.id!)
    setConfirmandoBorrar(false)
    setSel(null)
    await borrarNodosMapa(filas)
  }

  /** Contexto que se le da a la IA al expandir (ruta del nodo o región activa). */
  const contextoIA = (): string => {
    if (def.porZonas) {
      const nombres = raices.map((r) => r.texto).join(' / ')
      return `Mapa «${mapa.nombre}» (${def.nombreEs}) sobre: ${nombres}. Propón elementos para la región: ${etiquetaZona(zonaElegida)}`
    }
    const ruta = nodoSel ? [nodoSel.texto] : [mapa.nombre]
    let actual = nodoSel
    while (actual?.padreId) {
      const p = nodos.find((n) => n.nodoId === actual!.padreId)
      if (!p) break
      ruta.unshift(p.texto)
      actual = p
    }
    return `Mapa «${mapa.nombre}» (${def.nombreEs}). Ruta del nodo: ${ruta.join(' › ')}`
  }

  const existentesIA = (): string[] =>
    def.porZonas
      ? nodos.filter((n) => n.zona === zonaElegida).map((n) => n.texto)
      : hijosDe(nodos, nodoSel?.nodoId ?? raices[0]?.nodoId ?? null).map((n) => n.texto)

  /** Inserta las sugerencias elegidas (una a una: cada colocación ve las previas). */
  const aceptarExpansion = async (elegidas: string[]) => {
    if (mapa.id == null) return
    const locales = [...nodos]
    const ahora = new Date().toISOString()
    const padre = def.porZonas ? raices[0] : (nodoSel ?? raices[0])
    if (!padre) return
    // El ciclo necesita saber cuántas etapas habrá EN TOTAL para repartirlas.
    const etapas = hijosDe(nodos, padre.nodoId).length + elegidas.length
    for (const texto of elegidas) {
      const zona = def.porZonas ? zonaElegida : undefined
      const p = def.porZonas
        ? posEnZona(locales, tipo, zonaElegida, raices.length)
        : tipo === 'ciclo' && padre.padreId == null
          ? posEtapa(hijosDe(locales, padre.nodoId).length, etapas)
          : colocarHijo(tipo, locales, padre)
      const color = def.porZonas
        ? colorDeZona(zonaElegida)
        : padre.padreId == null
          ? PALETA_RAMAS[hijosDe(locales, padre.nodoId).length % PALETA_RAMAS.length]
          : (padre.color ?? COLOR)
      const fila = {
        mapaId: mapa.id,
        nodoId: `nod-${crypto.randomUUID()}`,
        padreId: padre.nodoId,
        texto,
        x: p.x,
        y: p.y,
        color,
        ...(zona ? { zona } : {}),
        ...(tipo === 'flujo' ? { forma: 'proceso' as const } : {}),
        fecha: fechaLocalISO(),
        creadoEn: ahora,
      }
      await nodosMapaRepo.add(fila)
      locales.push(fila as NodoMapa)
    }
    if (tipo === 'ciclo' && padre.padreId == null) await repartirCiclo(padre, elegidas.length)
  }

  /** Etiqueta legible de una región («Solo A», «A y B», «Ventajas», «En común»…). */
  const etiquetaZona = (zona: string): string => {
    const i = raizDeZona(tipo, zona)
    if (i >= 0) {
      const nombre = raices[i]?.texto ?? zona.toUpperCase()
      // En el Venn la región es «lo que solo pertenece a ese conjunto»; en las
      // columnas y los cuadrantes la región ES el conjunto.
      return tipo === 'venn' ? t('ideas.mapa.soloX', 'Solo {x}', { x: nombre }) : nombre
    }
    if (tipo === 'tier') return t('ideas.mapa.sinClasificar', 'Sin clasificar')
    if (tipo !== 'venn') return t('ideas.mapa.enComun', 'En común')
    return [...zona].map((c) => raices[c.charCodeAt(0) - 97]?.texto ?? c.toUpperCase()).join(' + ')
  }

  // ----- Render -----

  const porId = useMemo(() => new Map(nodos.map((n) => [n.nodoId, n])), [nodos])

  // Uniones en coordenadas del mundo: panear NO las recalcula (memo sin `vista`).
  const aristas = useMemo(() => {
    if (def.porZonas) return null

    // Ishikawa y línea del tiempo: los de primer nivel nacen de la RECTA (la
    // columna o la línea), no de la raíz, y lo que cuelga de ellos va derecho.
    if (tipo === 'ishikawa' || tipo === 'linea') {
      return nodos.map((n) => {
        if (!n.padreId) return null
        const padre = porId.get(n.padreId)
        if (!padre) return null
        const b = pos(n)
        const a =
          padre.padreId != null
            ? pos(padre)
            : tipo === 'ishikawa'
              ? baseEspina(b)
              : { x: b.x, y: 0 }
        return (
          <path
            key={n.nodoId}
            d={`M ${a.x} ${a.y} L ${b.x} ${b.y}`}
            stroke={n.color ?? COLOR}
            strokeOpacity={0.55}
          />
        )
      })
    }

    // Ciclo: las etapas se encadenan entre ellas (la última cierra con la
    // primera) en vez de colgar de la raíz, que aquí solo da nombre al ciclo.
    if (tipo === 'ciclo') {
      const etapas = hijosDe(nodos, raices[0]?.nodoId ?? null)
      return nodos.map((n) => {
        if (!n.padreId) return null
        const i = etapas.findIndex((e) => e.nodoId === n.nodoId)
        if (i < 0) {
          const padre = porId.get(n.padreId)
          if (!padre) return null
          const a = pos(padre)
          const b = pos(n)
          const mx = (a.x + b.x) / 2
          return (
            <path
              key={n.nodoId}
              d={`M ${a.x} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}`}
              stroke={n.color ?? COLOR}
              strokeOpacity={0.5}
            />
          )
        }
        if (etapas.length < 2) return null
        const a = pos(etapas[(i + etapas.length - 1) % etapas.length])
        const b = pos(n)
        // Arco por fuera (no una cuerda): el ciclo se lee girando.
        const r = Math.round((Math.hypot(a.x, a.y) + Math.hypot(b.x, b.y)) / 2) || 1
        return (
          <path
            key={n.nodoId}
            d={`M ${a.x} ${a.y} A ${r} ${r} 0 0 1 ${b.x} ${b.y}`}
            stroke={n.color ?? COLOR}
            strokeOpacity={0.55}
            markerEnd="url(#punta-ideas)"
          />
        )
      })
    }

    // Llaves: una por GRUPO de hermanos (el lomo abarca de la primera a la
    // última parte y su punta señala al padre), no una línea por hijo.
    if (tipo === 'llaves') {
      return nodos.map((padre) => {
        const hijos = hijosDe(nodos, padre.nodoId)
        if (hijos.length === 0) return null
        const p = pos(padre)
        const puntos = hijos.map(pos)
        const yMin = Math.min(...puntos.map((q) => q.y))
        const yMax = Math.max(...puntos.map((q) => q.y))
        const hx = Math.min(...puntos.map((q) => q.x))
        const lomo = (p.x + hx) / 2 + 30
        const yMid = (yMin + yMax) / 2
        const d = [
          `M ${lomo} ${yMin} L ${lomo} ${yMid - 16} L ${lomo - 16} ${yMid} L ${lomo} ${yMid + 16} L ${lomo} ${yMax}`,
          `M ${p.x} ${p.y} L ${lomo - 16} ${yMid}`,
          ...puntos.map((q) => `M ${lomo} ${q.y} L ${q.x} ${q.y}`),
        ].join(' ')
        return (
          <path key={padre.nodoId} d={d} stroke={hijos[0].color ?? COLOR} strokeOpacity={0.55} />
        )
      })
    }

    return nodos.map((n) => {
      if (!n.padreId) return null
      const padre = porId.get(n.padreId)
      if (!padre) return null
      const a = pos(padre)
      const b = pos(n)
      let d: string
      if (tipo === 'arbol' || tipo === 'flujo') {
        // Codo ortogonal: baja, cruza y vuelve a bajar (aire de organigrama).
        const my = (a.y + b.y) / 2
        d = `M ${a.x} ${a.y} L ${a.x} ${my} L ${b.x} ${my} L ${b.x} ${b.y}`
      } else if (tipo === 'decision') {
        // El mismo codo pero tumbado: el árbol de decisiones avanza a la derecha.
        const mx = (a.x + b.x) / 2
        d = `M ${a.x} ${a.y} L ${mx} ${a.y} L ${mx} ${b.y} L ${b.x} ${b.y}`
      } else {
        const mx = (a.x + b.x) / 2
        d = `M ${a.x} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}`
      }
      return (
        <path
          key={n.nodoId}
          d={d}
          stroke={n.color ?? COLOR}
          strokeOpacity={0.5}
          markerEnd={def.flechas ? 'url(#punta-ideas)' : undefined}
        />
      )
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pos() solo depende de `gesto`
  }, [nodos, porId, gesto, tipo, def.porZonas, def.flechas])

  const k = vista ? rect.w / vista.w : 1
  const pct = (x: number, y: number) =>
    vista
      ? {
          left: `${((x - vista.x) / vista.w) * 100}%`,
          top: `${((y - vista.y) / alto) * 100}%`,
        }
      : undefined

  return (
    <>
      <div
        ref={contRef}
        data-tut="ideas.mapa.lienzo"
        className="relative min-h-0 flex-1 cursor-grab touch-none select-none overflow-hidden rounded-xl border border-white/10 bg-white/5 active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={(e) => punteros.current.delete(e.pointerId)}
      >
        {vista && (
          <svg viewBox={`${vista.x} ${vista.y} ${vista.w} ${alto}`} className="h-full w-full">
            <defs>
              <marker
                id="punta-ideas"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={COLOR} fillOpacity={0.7} />
              </marker>
            </defs>

            <FondoMapa
              tipo={tipo}
              nodos={nodos}
              raices={raices}
              zonas={zonas}
              etiqueta={etiquetaZona}
            />

            <g
              fill="none"
              strokeWidth={Math.max(vista.w / 400, 2)}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {aristas}
            </g>
          </svg>
        )}

        {vista &&
          nodos.map((n) => {
            const p = pos(n)
            const color = n.color ?? mapa.color ?? COLOR
            const esRaiz = n.padreId == null
            const editandoEste = editando === n.nodoId
            const forma = tipo === 'flujo' ? (n.forma ?? 'proceso') : null
            // El rombo se recorta con clip-path en vez de rotar la caja: así el
            // texto se queda horizontal y legible por largo que sea.
            const esRombo = forma === 'decision'
            const redondez =
              forma === 'inicio' || forma === 'fin' ? 'rounded-full' : esRombo ? '' : 'rounded-xl'
            return (
              <div
                key={n.nodoId}
                onPointerDown={editandoEste ? undefined : (e) => bajarNodo(e, n)}
                onPointerMove={editandoEste ? undefined : moverNodo}
                onPointerUp={editandoEste ? undefined : () => void soltarNodo(n)}
                onPointerCancel={() => setGesto(null)}
                className={`ui-panel absolute z-10 text-center leading-snug shadow-md ${
                  esRombo ? 'max-w-[150px] px-9 py-4' : 'max-w-[190px] border-2 px-2.5 py-1.5'
                } ${redondez} ${esRaiz ? 'text-sm font-bold' : 'text-xs font-medium'} ${
                  editandoEste ? '' : 'cursor-grab active:cursor-grabbing'
                }`}
                style={{
                  ...pct(p.x, p.y),
                  borderColor: color,
                  transform: `translate(-50%, -50%) scale(${k})`,
                  boxShadow: sel === n.nodoId ? `0 0 0 3px ${color}55` : undefined,
                  ...(esRombo
                    ? {
                        clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                        background: `${color}33`,
                        outline: sel === n.nodoId ? `2px solid ${color}` : undefined,
                      }
                    : {}),
                }}
              >
                <span>
                  {editandoEste ? (
                    <input
                      autoFocus
                      value={borrador}
                      onChange={(e) => setBorrador(e.target.value)}
                      onPointerDown={(e) => e.stopPropagation()}
                      onBlur={() => void guardarNodo(n)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void guardarNodo(n)
                        if (e.key === 'Escape') setEditando(null)
                      }}
                      className="w-36 bg-transparent text-center outline-none"
                    />
                  ) : (
                    n.texto
                  )}
                </span>
                {/* El peso va DESPUÉS del texto: delante se leería como el
                    número de una lista en vez de como lo que pesa el punto. */}
                {def.pesos && !esRaiz && (
                  <span
                    className="texto-vivo ml-1.5 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-bold"
                    style={vivo(color)}
                  >
                    {n.peso ?? 1}
                  </span>
                )}
              </div>
            )
          })}

        {/* Controles de zoom */}
        <div className="absolute right-2 top-2 z-20 flex flex-col gap-1">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => zoomHacia(1.5)}
            title={t('ideas.mapa.acercar', 'Acercar')}
            aria-label={t('ideas.mapa.acercar', 'Acercar')}
            className="ui-hud flex h-8 w-8 items-center justify-center rounded-lg text-lg text-white/80 hover:bg-white/10"
          >
            +
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => zoomHacia(1 / 1.5)}
            title={t('ideas.mapa.alejar', 'Alejar')}
            aria-label={t('ideas.mapa.alejar', 'Alejar')}
            className="ui-hud flex h-8 w-8 items-center justify-center rounded-lg text-lg text-white/80 hover:bg-white/10"
          >
            −
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setVista(encajarVista())}
            title={t('ideas.mapa.encajar', 'Encajar el mapa')}
            aria-label={t('ideas.mapa.encajar', 'Encajar el mapa')}
            className="ui-hud flex h-8 w-8 items-center justify-center rounded-lg text-lg text-white/80 hover:bg-white/10"
          >
            ⤢
          </button>
        </div>

        {/* Barra de acciones */}
        <div
          className="ui-hud absolute bottom-2 left-1/2 z-20 flex max-w-[95%] -translate-x-1/2 flex-wrap items-center justify-center gap-1 rounded-xl px-1.5 py-1 shadow-lg"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Mapas por zonas: a qué región va lo que agregues */}
          {def.porZonas &&
            zonas.map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => setZonaActiva(z)}
                className={`rounded-lg px-2 py-1.5 text-[11px] font-semibold transition ${
                  z === zonaElegida ? 'text-black' : 'text-white/60 hover:bg-white/10'
                }`}
                style={z === zonaElegida ? { background: colorDeZona(z) } : undefined}
              >
                {etiquetaZona(z)}
              </button>
            ))}

          <button
            type="button"
            onClick={() => void agregar()}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold hover:bg-white/10"
            data-tut="ideas.mapa.hijo"
          >
            <Icono nombre="agregar" />{' '}
            {def.porZonas
              ? t('ideas.mapa.elemento', 'Elemento')
              : tipo === 'ishikawa'
                ? nodoSel?.padreId != null
                  ? t('ideas.mapa.causa', 'Causa')
                  : t('ideas.mapa.categoria', 'Categoría')
                : nodoSel
                  ? t('ideas.mapa.hijo', 'Idea hija')
                  : t('ideas.mapa.idea', 'Idea')}
          </button>

          {nodoSel && (
            <button
              type="button"
              onClick={() => {
                setEditando(nodoSel.nodoId)
                setBorrador(nodoSel.texto)
              }}
              className="rounded-lg px-2 py-1.5 text-white/70 hover:bg-white/10"
              title={t('ideas.editar', 'Editar')}
              aria-label={t('ideas.editar', 'Editar')}
            >
              <Icono nombre="editar" />
            </button>
          )}

          {def.pesos && nodoSel?.padreId != null && (
            <span className="flex items-center gap-0.5 rounded-lg bg-white/5 px-1">
              <button
                type="button"
                onClick={() => void cambiarPeso(-1)}
                className="px-1.5 py-1 text-white/70 hover:text-white"
                title={t('ideas.mapa.pesoMenos', 'Pesa menos')}
                aria-label={t('ideas.mapa.pesoMenos', 'Pesa menos')}
              >
                −
              </button>
              <span className="w-4 text-center text-xs font-bold" title={t('ideas.mapa.peso', 'Cuánto pesa (1-5)')}>
                {nodoSel.peso ?? 1}
              </span>
              <button
                type="button"
                onClick={() => void cambiarPeso(1)}
                className="px-1.5 py-1 text-white/70 hover:text-white"
                title={t('ideas.mapa.pesoMas', 'Pesa más')}
                aria-label={t('ideas.mapa.pesoMas', 'Pesa más')}
              >
                +
              </button>
            </span>
          )}

          {nodoSel && tipo === 'flujo' && nodoSel.padreId != null && (
            <button
              type="button"
              onClick={() => void ciclarForma(nodoSel)}
              className="rounded-lg px-2 py-1.5 text-white/70 hover:bg-white/10"
              title={t('ideas.mapa.forma', 'Cambiar la figura del paso')}
              aria-label={t('ideas.mapa.forma', 'Cambiar la figura del paso')}
            >
              <Icono nombre="flujo" />
            </button>
          )}

          {iaActiva() && (
            <button
              type="button"
              onClick={() => setExpandiendo(true)}
              className="rounded-lg px-2 py-1.5 text-white/70 hover:bg-white/10"
              title={t('ideas.mapa.expandir', 'Ampliar con IA')}
              aria-label={t('ideas.mapa.expandir', 'Ampliar con IA')}
              data-tut="ideas.mapa.expandir"
            >
              <Icono nombre="brillo" />
            </button>
          )}

          {nodoSel?.padreId != null &&
            (confirmandoBorrar ? (
              <button
                type="button"
                onClick={() => void borrarSel()}
                className="rounded-lg px-2 py-1.5 text-xs font-bold text-red-300 hover:bg-white/10"
              >
                {t('ideas.mapa.confirmarBorrar', 'Borrar {n}', {
                  n: def.porZonas ? 1 : conDescendencia(nodos, nodoSel.nodoId).size,
                })}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmandoBorrar(true)}
                className="rounded-lg px-2 py-1.5 text-white/70 hover:bg-white/10"
                title={t('ideas.borrar', 'Borrar')}
                aria-label={t('ideas.borrar', 'Borrar')}
              >
                <Icono nombre="basura" />
              </button>
            ))}
        </div>
      </div>

      {expandiendo && (
        <PanelSugerencias
          titulo={t('ideas.mapa.iaTitulo', 'Ampliar el mapa')}
          descripcion={
            def.porZonas
              ? t('ideas.mapa.iaDescZona', 'Elementos propuestos para «{zona}»:', {
                  zona: etiquetaZona(zonaElegida),
                })
              : t('ideas.mapa.iaDescNodo', 'Ideas propuestas para colgar de «{nodo}»:', {
                  nodo: nodoSel?.texto ?? mapa.nombre,
                })
          }
          cargar={() => expandirNodo(contextoIA(), existentesIA())}
          onAceptar={aceptarExpansion}
          onCerrar={() => setExpandiendo(false)}
        />
      )}
    </>
  )
}

/** Fondo del lienzo según el formato: los círculos del Venn, los recuadros de
 *  las columnas y los cuadrantes, la columna del Ishikawa y el anillo del
 *  mapa circular. */
function FondoMapa({
  tipo,
  nodos,
  raices,
  zonas,
  etiqueta,
}: {
  tipo: TipoMapa
  nodos: NodoMapa[]
  raices: NodoMapa[]
  zonas: string[]
  etiqueta: (zona: string) => string
}) {
  const t = useT()
  const colorZona = (i: number) => (i >= 0 ? (raices[i]?.color ?? colorRaiz(tipo, i)) : COLOR)

  if (tipo === 'ishikawa') {
    // La columna llega hasta la espina más lejana y apunta a la cabeza.
    const izquierda = Math.min(-320, ...nodos.map((n) => n.x)) - 60
    return (
      <path
        d={`M ${izquierda} 0 L -70 0`}
        fill="none"
        stroke={COLOR}
        strokeOpacity={0.55}
        strokeWidth={6}
        strokeLinecap="round"
        markerEnd="url(#punta-ideas)"
      />
    )
  }

  if (tipo === 'linea') {
    // La recta arranca antes del tema y termina pasado el último hito.
    const derecha = Math.max(320, ...nodos.map((n) => n.x)) + 150
    return (
      <path
        d={`M -150 0 L ${derecha} 0`}
        fill="none"
        stroke={COLOR}
        strokeOpacity={0.55}
        strokeWidth={6}
        strokeLinecap="round"
        markerEnd="url(#punta-ideas)"
      />
    )
  }

  if (tipo === 'piramide') {
    return (
      <g>
        {zonas.map((z, i) => (
          <polygon
            key={z}
            points={poligonoPiramide(i)}
            fill={colorZona(i)}
            fillOpacity={0.14}
            stroke={colorZona(i)}
            strokeOpacity={0.45}
            strokeWidth={3}
          />
        ))}
      </g>
    )
  }

  if (tipo === 'venn') {
    return (
      <g>
        {circulosVenn(raices.length).map((c, i) => (
          <circle
            key={i}
            cx={c.x}
            cy={c.y}
            r={c.r}
            fill={raices[i]?.color ?? PALETA_RAMAS[i]}
            fillOpacity={0.12}
            stroke={raices[i]?.color ?? PALETA_RAMAS[i]}
            strokeOpacity={0.5}
            strokeWidth={3}
          />
        ))}
      </g>
    )
  }

  const cajas = cajasZonas(tipo, zonas, raices.length)
  if (cajas.length > 0) {
    // Ventajas/desventajas y fuerzas se SUMAN: cada punto vale lo que pesa (1
    // si no se tocó) y el total de la columna es lo que se compara al final.
    const conPesos = defTipo(tipo).pesos
    const total = (zona: string) =>
      nodos
        .filter((n) => n.padreId != null && n.zona === zona)
        .reduce((suma, n) => suma + (n.peso ?? 1), 0)
    const filas = tipo === 'tier'
    return (
      <g>
        {cajas.map((caja) => {
          const i = raizDeZona(tipo, caja.zona)
          const color = colorZona(i)
          return (
            <g key={caja.zona}>
              <rect
                x={caja.x}
                y={caja.y}
                width={caja.w}
                height={caja.h}
                rx={Math.min(40, caja.h / 3)}
                fill={color}
                fillOpacity={0.09}
                stroke={color}
                strokeOpacity={0.35}
                strokeWidth={3}
              />
              {/* Las regiones compartidas no tienen raíz que las titule: la
                  columna del medio de la comparación y la bandeja de la tier. */}
              {i < 0 && (
                <text
                  x={filas ? caja.x + 100 : caja.x + caja.w / 2}
                  y={filas ? caja.y + caja.h / 2 + 7 : caja.y + 50}
                  textAnchor="middle"
                  fill={COLOR}
                  fillOpacity={0.75}
                  fontSize={filas ? 19 : 26}
                  fontWeight="bold"
                >
                  {etiqueta(caja.zona)}
                </text>
              )}
              {conPesos && (
                <>
                  <text
                    x={caja.x + caja.w / 2}
                    y={caja.y + caja.h - 64}
                    textAnchor="middle"
                    fill={color}
                    fillOpacity={0.5}
                    fontSize={17}
                    fontWeight="bold"
                  >
                    {t('ideas.mapa.total', 'Total')}
                  </text>
                  <text
                    x={caja.x + caja.w / 2}
                    y={caja.y + caja.h - 26}
                    textAnchor="middle"
                    fill={color}
                    fillOpacity={0.9}
                    fontSize={36}
                    fontWeight="bold"
                  >
                    {total(caja.zona)}
                  </text>
                </>
              )}
            </g>
          )
        })}
        {/* Campo de fuerzas: las dos columnas empujan contra la misma raya. */}
        {tipo === 'fuerzas' && (
          <g stroke={COLOR} fill="none">
            <path d="M 0 -230 L 0 330" strokeOpacity={0.45} strokeWidth={4} strokeDasharray="16 12" />
            <path d="M -95 -170 L -20 -170" strokeOpacity={0.6} strokeWidth={5} markerEnd="url(#punta-ideas)" />
            <path d="M 95 -170 L 20 -170" strokeOpacity={0.6} strokeWidth={5} markerEnd="url(#punta-ideas)" />
          </g>
        )}
      </g>
    )
  }

  if (tipo === 'circulo') {
    return (
      <circle
        cx={0}
        cy={0}
        r={320}
        fill="none"
        stroke={COLOR}
        strokeOpacity={0.25}
        strokeWidth={3}
        strokeDasharray="14 12"
      />
    )
  }

  return null
}
