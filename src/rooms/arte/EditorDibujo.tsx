import { useEffect, useRef, useState } from 'react'
import { CREDITOS, opImagen } from '../../core/cuenta/costos'
import type { Dibujo } from '../../core/data/db'
import { dibujosRepo } from '../../core/data/repository'
import { descargarArchivo } from '../../core/descargarArchivo'
import { tGlobal, useT } from '../../core/i18n/useT'
import { generarImagen, imagenIaActiva, type AspectoImagen } from '../../core/imagenIA'
import { useAjustes } from '../../core/state/ajustesStore'
import { pedirTexto } from '../../core/state/confirmarStore'
import { Creditos } from '../../core/ui/Creditos'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import { miniaturaFoto, comprimirFoto } from '../_shared/fotos'
import { BotonPrimario, BotonSecundario, Campo, INPUT, Modal, Spinner } from '../_shared/ui'
import { PanelCapas } from './PanelCapas'
import { COLOR, GROSORES, PALETA, REJILLA_PASO, ZOOM_MAX, ZOOM_MIN } from './constantes'
import {
  crearLienzo,
  dibujarFormaEn,
  extremosEspejados,
  type FiltroArte,
  type FormaArte,
  type HerramientaArte,
  type Lienzo,
} from './lienzo'

/** El aspecto de IA más cercano a la proporción del lienzo. */
function aspectoDe(ancho: number, alto: number): AspectoImagen {
  const r = ancho / alto
  const opciones: [AspectoImagen, number][] = [
    ['1:1', 1],
    ['16:9', 16 / 9],
    ['9:16', 9 / 16],
    ['4:3', 4 / 3],
    ['3:4', 3 / 4],
  ]
  opciones.sort((a, b) => Math.abs(a[1] - r) - Math.abs(b[1] - r))
  return opciones[0][0]
}

const FILTROS: { id: FiltroArte; clave: string; es: string }[] = [
  { id: 'brillo+', clave: 'arte.filtro.brilloMas', es: 'Más brillo' },
  { id: 'brillo-', clave: 'arte.filtro.brilloMenos', es: 'Menos brillo' },
  { id: 'contraste+', clave: 'arte.filtro.contrasteMas', es: 'Más contraste' },
  { id: 'contraste-', clave: 'arte.filtro.contrasteMenos', es: 'Menos contraste' },
  { id: 'grises', clave: 'arte.filtro.grises', es: 'Escala de grises' },
  { id: 'desenfoque', clave: 'arte.filtro.desenfoque', es: 'Desenfoque' },
]

/** Color de las guías (regla, rejilla, ejes del espejo): azul ajeno al tema, sobre el blanco del lienzo. */
const GUIA = 'rgba(59, 130, 246, 0.55)'
const GUIA_TENUE = 'rgba(59, 130, 246, 0.2)'

/**
 * El editor de un dibujo: las capas son canvas apilados a resolución real
 * dentro de un wrapper que se escala por CSS (el bitmap nunca se reescala).
 * 1 puntero = herramienta; el 2.º dedo CANCELA el trazo en curso y los dos
 * hacen pellizco+paneo; rueda = zoom.
 */
export function EditorDibujo({ id, alCerrar }: { id: number; alCerrar: () => void }) {
  const t = useT()
  const calidad = useAjustes((s) => s.calidadImagen)
  const [dibujo, setDibujo] = useState<Dibujo | null>(null)
  const [herramienta, setHerramienta] = useState<HerramientaArte>('pincel')
  const [color, setColor] = useState(PALETA[2])
  const [grosor, setGrosor] = useState(GROSORES[1])
  // Tick para refrescar la UI (el lienzo vive fuera de React) y estado de las pilas.
  const [, setVersion] = useState(0)
  const [pilas, setPilas] = useState({ deshacer: false, rehacer: false })
  const [panelIA, setPanelIA] = useState(false)
  const [panelFiltros, setPanelFiltros] = useState(false)
  const [panelCapas, setPanelCapas] = useState(false)
  const [panelApoyo, setPanelApoyo] = useState(false)
  // Ayudas de dibujo: regla colocable, espejo por eje y rejilla con imán.
  const [apoyo, setApoyo] = useState({ regla: false, espejoV: false, espejoH: false, rejilla: false })
  const [recta, setRecta] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  const [prompt, setPrompt] = useState('')
  const [generando, setGenerando] = useState(false)
  const [errorIA, setErrorIA] = useState('')

  const contRef = useRef<HTMLDivElement>(null)
  const marcoRef = useRef<HTMLDivElement>(null)
  const capasRef = useRef<HTMLDivElement>(null)
  const guiasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const lienzoRef = useRef<Lienzo | null>(null)
  // El mismo lienzo como estado, para quien lo necesita al RENDERIZAR (el panel de capas).
  const [lienzoListo, setLienzoListo] = useState<Lienzo | null>(null)
  const archivoRef = useRef<HTMLInputElement>(null)
  const dims = useRef({ ancho: 0, alto: 0 })

  // Gestos (viven en refs: nada de esto re-renderiza)
  const punteros = useRef(new Map<number, { cx: number; cy: number }>())
  const trazando = useRef(false)
  const forma = useRef<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  const colocando = useRef<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  const paneando = useRef<{ cx: number; cy: number } | null>(null)
  const pinch = useRef<{ d0: number; esc0: number; mx: number; my: number; tx0: number; ty0: number } | null>(null)
  const vista = useRef({ esc: 1, tx: 0, ty: 0 })

  const aplicarVista = () => {
    const m = marcoRef.current
    if (!m) return
    const { esc, tx, ty } = vista.current
    m.style.transform = `translate(${tx}px, ${ty}px) scale(${esc})`
  }

  // ─── Guardado (debounce ~4 s tras el último cambio + flush al salir) ─────
  const sucio = useRef(false)
  const timer = useRef(0)
  // Solo lee refs: es estable y no necesita el patrón de "última versión".
  const guardarRef = useRef(async () => {
    const lienzo = lienzoRef.current
    if (!sucio.current || !lienzo) return
    sucio.current = false
    const imagen = await lienzo.aBlob()
    const capas = await lienzo.aCapas()
    const actualizadoEn = new Date().toISOString()
    // `capasEn` = `actualizadoEn`: si un cliente sin capas edita después, difieren y manda `imagen`.
    await dibujosRepo.update(id, {
      imagen,
      capas,
      capasEn: actualizadoEn,
      miniatura: await miniaturaFoto(imagen),
      actualizadoEn,
    })
  })

  /** Toda acción que toca el bitmap o las capas pasa por aquí: tick de UI + autosave. */
  const marcar = () => {
    setVersion((v) => v + 1)
    setPilas({
      deshacer: lienzoRef.current?.puedeDeshacer() ?? false,
      rehacer: lienzoRef.current?.puedeRehacer() ?? false,
    })
    sucio.current = true
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => void guardarRef.current(), 4000)
  }

  // Carga única: fila → lienzo (capas) → encuadre inicial centrado.
  useEffect(() => {
    let vivo = true
    const guardar = guardarRef.current // estable: se inicializa una sola vez
    let ro: ResizeObserver | null = null
    /** Centra el lienzo al contenedor; false si aún mide 0 (panel oculto al montar). */
    const encuadrar = (ancho: number, alto: number): boolean => {
      const cont = contRef.current
      if (!cont || cont.clientWidth === 0 || cont.clientHeight === 0) return false
      const esc = Math.min(cont.clientWidth / ancho, cont.clientHeight / alto) * 0.95
      vista.current = {
        esc,
        tx: (cont.clientWidth - ancho * esc) / 2,
        ty: (cont.clientHeight - alto * esc) / 2,
      }
      aplicarVista()
      return true
    }
    void dibujosRepo.list().then(async (filas) => {
      const d = filas.find((x) => x.id === id)
      const host = capasRef.current
      if (!vivo || !d || !host) return
      const lienzo = crearLienzo(host, d.ancho, d.alto)
      await lienzo.iniciar(d, tGlobal('arte.capa.fondo', 'Fondo'))
      if (!vivo) return
      lienzoRef.current = lienzo
      setLienzoListo(lienzo)
      dims.current = { ancho: d.ancho, alto: d.alto }
      for (const c of [guiasRef.current, overlayRef.current]) {
        if (c) {
          c.width = d.ancho
          c.height = d.alto
        }
      }
      if (!encuadrar(d.ancho, d.alto) && contRef.current) {
        // El contenedor aún no tiene tamaño: reintenta en cuanto lo tenga.
        ro = new ResizeObserver(() => {
          if (encuadrar(d.ancho, d.alto)) {
            ro?.disconnect()
            ro = null
          }
        })
        ro.observe(contRef.current)
      }
      setDibujo(d)
    })
    const alOcultar = () => {
      if (document.visibilityState === 'hidden') void guardar()
    }
    document.addEventListener('visibilitychange', alOcultar)
    return () => {
      vivo = false
      ro?.disconnect()
      document.removeEventListener('visibilitychange', alOcultar)
      window.clearTimeout(timer.current)
      void guardar()
    }
  }, [id])

  // El espejo vive en el motor (refleja trazos y formas al pintar).
  useEffect(() => {
    lienzoRef.current?.setEspejo(apoyo.espejoV, apoyo.espejoH)
  }, [apoyo.espejoV, apoyo.espejoH, dibujo])

  // Capa de guías: rejilla, ejes del espejo y la recta de la regla.
  useEffect(() => {
    const g = guiasRef.current
    const { ancho, alto } = dims.current
    if (!g || !ancho) return
    const ctx = g.getContext('2d')!
    ctx.clearRect(0, 0, ancho, alto)
    if (apoyo.rejilla) {
      ctx.strokeStyle = GUIA_TENUE
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let x = REJILLA_PASO; x < ancho; x += REJILLA_PASO) {
        ctx.moveTo(x, 0)
        ctx.lineTo(x, alto)
      }
      for (let y = REJILLA_PASO; y < alto; y += REJILLA_PASO) {
        ctx.moveTo(0, y)
        ctx.lineTo(ancho, y)
      }
      ctx.stroke()
    }
    ctx.strokeStyle = GUIA
    ctx.lineWidth = 2
    ctx.setLineDash([14, 10])
    if (apoyo.espejoV || apoyo.espejoH) {
      ctx.beginPath()
      if (apoyo.espejoV) {
        ctx.moveTo(ancho / 2, 0)
        ctx.lineTo(ancho / 2, alto)
      }
      if (apoyo.espejoH) {
        ctx.moveTo(0, alto / 2)
        ctx.lineTo(ancho, alto / 2)
      }
      ctx.stroke()
    }
    if (apoyo.regla && recta) {
      // La recta colocada se dibuja extendida de borde a borde.
      const dx = recta.x1 - recta.x0
      const dy = recta.y1 - recta.y0
      const l = Math.hypot(dx, dy)
      const k = (ancho + alto) / l
      ctx.beginPath()
      ctx.moveTo(recta.x0 - dx * k, recta.y0 - dy * k)
      ctx.lineTo(recta.x0 + dx * k, recta.y0 + dy * k)
      ctx.stroke()
    }
    ctx.setLineDash([])
  }, [apoyo, recta, dibujo])

  // ─── Gestos ──────────────────────────────────────────────────────────────
  const aBitmap = (clientX: number, clientY: number) => {
    const c = capasRef.current!
    const r = c.getBoundingClientRect()
    return {
      x: ((clientX - r.left) * dims.current.ancho) / r.width,
      y: ((clientY - r.top) * dims.current.alto) / r.height,
    }
  }
  const coordsDe = (e: React.PointerEvent) => aBitmap(e.clientX, e.clientY)

  /** Imán de la rejilla (solo extremos de formas). */
  const ajustar = (v: number) => (apoyo.rejilla ? Math.round(v / REJILLA_PASO) * REJILLA_PASO : v)

  /** Proyección sobre la recta de la regla: el trazo libre se pega a ella. */
  const proyectar = (x: number, y: number) => {
    if (!recta) return { x, y }
    const dx = recta.x1 - recta.x0
    const dy = recta.y1 - recta.y0
    const l2 = dx * dx + dy * dy
    if (l2 < 1) return { x, y }
    const tt = ((x - recta.x0) * dx + (y - recta.y0) * dy) / l2
    return { x: recta.x0 + tt * dx, y: recta.y0 + tt * dy }
  }

  const limpiarOverlay = () => {
    const o = overlayRef.current
    o?.getContext('2d')?.clearRect(0, 0, o.width, o.height)
  }

  const esForma = (h: HerramientaArte) => h === 'linea' || h === 'rect' || h === 'elipse' || h === 'compas'

  const alBajar = (e: React.PointerEvent) => {
    const lienzo = lienzoRef.current
    if (!lienzo) return
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // El puntero pudo morir entre el evento y la captura (Android WebView).
    }
    punteros.current.set(e.pointerId, { cx: e.clientX, cy: e.clientY })

    if (punteros.current.size === 2) {
      // Entró el 2.º dedo: se cancela lo que hubiera y arranca pellizco+paneo.
      if (trazando.current) {
        lienzo.cancelarTrazo()
        trazando.current = false
      }
      forma.current = null
      colocando.current = null
      paneando.current = null
      limpiarOverlay()
      const [a, b] = [...punteros.current.values()]
      pinch.current = {
        d0: Math.hypot(a.cx - b.cx, a.cy - b.cy),
        esc0: vista.current.esc,
        mx: (a.cx + b.cx) / 2,
        my: (a.cy + b.cy) / 2,
        tx0: vista.current.tx,
        ty0: vista.current.ty,
      }
      return
    }
    if (punteros.current.size > 2) return

    // Botón secundario o central: paneo también en escritorio.
    if (e.button !== 0) {
      paneando.current = { cx: e.clientX, cy: e.clientY }
      return
    }

    const { x, y } = coordsDe(e)
    // La regla recién activada: el primer arrastre coloca la recta.
    if (apoyo.regla && !recta) {
      colocando.current = { x0: x, y0: y, x1: x, y1: y }
      return
    }
    if (herramienta === 'relleno') {
      lienzo.rellenar(x, y, color)
      marcar()
    } else if (herramienta === 'gotero') {
      setColor(lienzo.colorEn(x, y))
      setHerramienta('pincel')
    } else if (herramienta === 'texto') {
      void pedirTexto({ titulo: t('arte.editor.texto', 'Texto en el lienzo') }).then((txt) => {
        if (txt) {
          lienzo.texto(x, y, txt, color, 16 + grosor * 4)
          marcar()
        }
      })
    } else if (esForma(herramienta)) {
      forma.current = { x0: ajustar(x), y0: ajustar(y), x1: ajustar(x), y1: ajustar(y) }
    } else {
      const p = apoyo.regla ? proyectar(x, y) : { x, y }
      lienzo.empezarTrazo(p.x, p.y)
      trazando.current = true
    }
  }

  const alMover = (e: React.PointerEvent) => {
    const lienzo = lienzoRef.current
    const p = punteros.current.get(e.pointerId)
    if (!lienzo || !p) return
    p.cx = e.clientX
    p.cy = e.clientY

    if (pinch.current && punteros.current.size === 2) {
      const [a, b] = [...punteros.current.values()]
      const d = Math.hypot(a.cx - b.cx, a.cy - b.cy)
      const mx = (a.cx + b.cx) / 2
      const my = (a.cy + b.cy) / 2
      const g = pinch.current
      const esc = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, (g.esc0 * d) / Math.max(1, g.d0)))
      // El punto bajo el centro del pellizco se queda bajo el centro.
      vista.current = {
        esc,
        tx: mx - ((g.mx - g.tx0) / g.esc0) * esc,
        ty: my - ((g.my - g.ty0) / g.esc0) * esc,
      }
      aplicarVista()
      return
    }
    if (paneando.current) {
      vista.current.tx += e.clientX - paneando.current.cx
      vista.current.ty += e.clientY - paneando.current.cy
      paneando.current = { cx: e.clientX, cy: e.clientY }
      aplicarVista()
      return
    }
    if (trazando.current) {
      // Todos los puntos del puntero (no solo el último por frame): a 22 FPS
      // los trazos rápidos salían poligonales.
      const nativos = e.nativeEvent.getCoalescedEvents?.() ?? []
      for (const ev of nativos.length > 0 ? nativos : [e.nativeEvent]) {
        let { x, y } = aBitmap(ev.clientX, ev.clientY)
        if (apoyo.regla) ({ x, y } = proyectar(x, y))
        const presion = ev.pointerType === 'pen' && ev.pressure > 0 ? ev.pressure : undefined
        lienzo.trazar(x, y, color, grosor, herramienta as 'pincel' | 'spray' | 'borrador', presion)
      }
      return
    }
    if (colocando.current) {
      const { x, y } = coordsDe(e)
      colocando.current.x1 = x
      colocando.current.y1 = y
      const o = overlayRef.current
      const octx = o?.getContext('2d')
      if (o && octx) {
        octx.clearRect(0, 0, o.width, o.height)
        octx.strokeStyle = GUIA
        octx.lineWidth = 2
        octx.setLineDash([14, 10])
        octx.beginPath()
        octx.moveTo(colocando.current.x0, colocando.current.y0)
        octx.lineTo(x, y)
        octx.stroke()
        octx.setLineDash([])
      }
      return
    }
    if (forma.current) {
      const { x, y } = coordsDe(e)
      forma.current.x1 = ajustar(x)
      forma.current.y1 = ajustar(y)
      const o = overlayRef.current
      const octx = o?.getContext('2d')
      if (o && octx) {
        octx.clearRect(0, 0, o.width, o.height)
        octx.globalAlpha = 0.85
        // El preview también refleja el espejo: lo que ves es lo que se comete.
        const f = forma.current
        for (const [a0, b0, a1, b1] of extremosEspejados(
          f.x0,
          f.y0,
          f.x1,
          f.y1,
          apoyo.espejoV,
          apoyo.espejoH,
          dims.current.ancho,
          dims.current.alto,
        ))
          dibujarFormaEn(octx, herramienta as FormaArte, a0, b0, a1, b1, color, grosor)
        octx.globalAlpha = 1
      }
    }
  }

  const alSoltar = (e: React.PointerEvent) => {
    const lienzo = lienzoRef.current
    punteros.current.delete(e.pointerId)
    if (pinch.current && punteros.current.size < 2) pinch.current = null
    if (paneando.current) paneando.current = null
    if (trazando.current) {
      trazando.current = false
      marcar()
    }
    if (colocando.current) {
      const c = colocando.current
      colocando.current = null
      limpiarOverlay()
      // Un tap no define dirección: se ignora y el siguiente arrastre lo intenta.
      if (Math.hypot(c.x1 - c.x0, c.y1 - c.y0) > 8) setRecta(c)
      return
    }
    if (forma.current && lienzo) {
      const f = forma.current
      forma.current = null
      limpiarOverlay()
      lienzo.cometerForma(herramienta as FormaArte, f.x0, f.y0, f.x1, f.y1, color, grosor)
      marcar()
    }
  }

  const alRueda = (e: React.WheelEvent) => {
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
    const v = vista.current
    const esc = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v.esc * factor))
    // Zoom anclado al cursor.
    const r = contRef.current!.getBoundingClientRect()
    const cx = e.clientX - r.left
    const cy = e.clientY - r.top
    vista.current = {
      esc,
      tx: cx - ((cx - v.tx) / v.esc) * esc,
      ty: cy - ((cy - v.ty) / v.esc) * esc,
    }
    aplicarVista()
  }

  // ─── Acciones ────────────────────────────────────────────────────────────
  const insertarFoto = async (archivo: File) => {
    const lienzo = lienzoRef.current
    if (!lienzo) return
    await lienzo.pintarImagen(await comprimirFoto(archivo))
    marcar()
  }

  const correrIA = async (conReferencia: boolean) => {
    const lienzo = lienzoRef.current
    if (!lienzo || !dibujo) return
    setErrorIA('')
    setGenerando(true)
    try {
      const referencia = conReferencia ? await lienzo.aBlob() : undefined
      const blob = await generarImagen(
        prompt.trim(),
        Math.max(dibujo.ancho, dibujo.alto),
        referencia,
        aspectoDe(dibujo.ancho, dibujo.alto),
        calidad,
      )
      await lienzo.pintarImagen(blob)
      marcar()
      setPanelIA(false)
    } catch (e) {
      setErrorIA(e instanceof Error ? e.message : String(e))
    } finally {
      setGenerando(false)
    }
  }

  const exportarPng = async () => {
    const lienzo = lienzoRef.current
    if (!lienzo || !dibujo) return
    await guardarRef.current()
    void descargarArchivo(await lienzo.aBlob(), `${dibujo.nombre || 'dibujo'}.png`)
  }

  const herrBtn = (h: HerramientaArte, icono: NombreIcono, etiqueta: string) => (
    <button
      type="button"
      onClick={() => setHerramienta(h)}
      title={etiqueta}
      aria-label={etiqueta}
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border text-white transition active:scale-90 ${
        herramienta === h ? 'ui-accent-bg border-transparent' : 'border-white/10 bg-white/10 hover:bg-white/20'
      }`}
      style={herramienta === h ? { background: COLOR } : undefined}
    >
      <Icono nombre={icono} />
    </button>
  )

  const apoyoActivo = apoyo.regla || apoyo.espejoV || apoyo.espejoH || apoyo.rejilla

  const apoyoBtn = (activo: boolean, icono: NombreIcono, etiqueta: string, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-white transition active:scale-95 ${
        activo ? 'border-transparent' : 'border-white/10 bg-white/10 hover:bg-white/20'
      }`}
      style={activo ? { background: COLOR } : undefined}
    >
      <Icono nombre={icono} /> {etiqueta}
    </button>
  )

  return (
    <div className="flex h-full flex-col gap-2">
      {/* Cabecera */}
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <BotonSecundario pequeno onClick={alCerrar}>
          <Icono nombre="volver" /> {t('arte.editor.volver', 'Volver a la galería')}
        </BotonSecundario>
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{dibujo?.nombre ?? ''}</p>
        <BotonSecundario pequeno onClick={() => setPanelCapas((v) => !v)}>
          <Icono nombre="capas" /> {t('arte.capa.titulo', 'Capas')}
        </BotonSecundario>
        <BotonSecundario pequeno onClick={() => setPanelFiltros(true)}>
          <Icono nombre="brillo" /> {t('arte.editor.filtros', 'Filtros')}
        </BotonSecundario>
        <BotonSecundario pequeno onClick={() => archivoRef.current?.click()}>
          <Icono nombre="foto" /> {t('arte.editor.foto', 'Insertar foto')}
        </BotonSecundario>
        <BotonSecundario pequeno onClick={() => void exportarPng()}>
          <Icono nombre="descargar" /> {t('arte.editor.png', 'PNG')}
        </BotonSecundario>
        <BotonPrimario
          type="button"
          pequeno
          app={COLOR}
          onClick={() => {
            setErrorIA('')
            setPanelIA(true)
          }}
        >
          <Icono nombre="brillo" /> {t('arte.ia.boton', 'IA')}
        </BotonPrimario>
      </div>

      {/* Barra de herramientas */}
      <div className="flex shrink-0 flex-wrap items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5">
        {herrBtn('pincel', 'pincel', t('arte.herr.pincel', 'Pincel'))}
        {herrBtn('spray', 'spray', t('arte.herr.spray', 'Spray'))}
        {herrBtn('borrador', 'borrador', t('arte.herr.borrador', 'Borrador'))}
        {herrBtn('linea', 'linea', t('arte.herr.linea', 'Línea'))}
        {herrBtn('rect', 'rectangulo', t('arte.herr.rect', 'Rectángulo'))}
        {herrBtn('elipse', 'elipse', t('arte.herr.elipse', 'Elipse'))}
        {herrBtn('compas', 'compas', t('arte.herr.compas', 'Compás'))}
        {herrBtn('relleno', 'bote', t('arte.herr.relleno', 'Rellenar'))}
        {herrBtn('gotero', 'gotero', t('arte.herr.gotero', 'Tomar color'))}
        {herrBtn('texto', 'letra', t('arte.herr.texto', 'Texto'))}
        <button
          type="button"
          onClick={() => setPanelApoyo(true)}
          title={t('arte.apoyo.titulo', 'Ayudas de dibujo')}
          aria-label={t('arte.apoyo.titulo', 'Ayudas de dibujo')}
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border text-white transition active:scale-90 ${
            apoyoActivo ? 'border-transparent' : 'border-white/10 bg-white/10 hover:bg-white/20'
          }`}
          style={apoyoActivo ? { background: COLOR } : undefined}
        >
          <Icono nombre="regla" />
        </button>
        <span className="mx-1 h-6 w-px bg-white/10" />
        {GROSORES.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGrosor(g)}
            title={t('arte.editor.grosor', 'Grosor')}
            aria-label={t('arte.editor.grosor', 'Grosor')}
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border transition active:scale-90 ${
              grosor === g ? 'border-white/60 bg-white/20' : 'border-white/10 bg-white/10 hover:bg-white/20'
            }`}
          >
            <span className="rounded-full bg-white" style={{ width: 4 + g * 0.7, height: 4 + g * 0.7 }} />
          </button>
        ))}
        <span className="mx-1 h-6 w-px bg-white/10" />
        {PALETA.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            title={t('arte.editor.color', 'Color')}
            aria-label={t('arte.editor.color', 'Color')}
            style={{ background: c }}
            className={`h-6 w-6 shrink-0 rounded-full border transition active:scale-90 ${
              color === c ? 'scale-110 border-white ring-2 ring-white/70' : 'border-white/20'
            }`}
          />
        ))}
        <label
          title={t('arte.editor.colorLibre', 'Otro color')}
          className={`relative h-6 w-6 shrink-0 cursor-pointer rounded-full border transition active:scale-90 ${
            PALETA.includes(color) ? 'border-white/20' : 'scale-110 border-white ring-2 ring-white/70'
          }`}
          style={{
            background: PALETA.includes(color)
              ? 'conic-gradient(#e11d48, #facc15, #22c55e, #0ea5e9, #8b5cf6, #e11d48)'
              : color,
          }}
        >
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            aria-label={t('arte.editor.colorLibre', 'Otro color')}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
        <span className="mx-1 h-6 w-px bg-white/10" />
        <button
          type="button"
          onClick={() => {
            if (lienzoRef.current?.deshacer()) marcar()
          }}
          disabled={!pilas.deshacer}
          title={t('arte.editor.deshacer', 'Deshacer')}
          aria-label={t('arte.editor.deshacer', 'Deshacer')}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/10 transition hover:bg-white/20 disabled:opacity-40"
        >
          <Icono nombre="deshacer" />
        </button>
        <button
          type="button"
          onClick={() => {
            if (lienzoRef.current?.rehacer()) marcar()
          }}
          disabled={!pilas.rehacer}
          title={t('arte.editor.rehacer', 'Rehacer')}
          aria-label={t('arte.editor.rehacer', 'Rehacer')}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/10 transition hover:bg-white/20 disabled:opacity-40"
        >
          <Icono nombre="rehacer" />
        </button>
        <button
          type="button"
          onClick={() => {
            lienzoRef.current?.limpiar()
            marcar()
          }}
          title={t('arte.editor.limpiarCapa', 'Limpiar la capa')}
          aria-label={t('arte.editor.limpiarCapa', 'Limpiar la capa')}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/10 transition hover:bg-white/20"
        >
          <Icono nombre="basura" />
        </button>
      </div>

      {/* El lienzo */}
      <div
        ref={contRef}
        onPointerDown={alBajar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={alSoltar}
        onWheel={alRueda}
        onContextMenu={(e) => e.preventDefault()}
        className="relative min-h-0 flex-1 cursor-crosshair overflow-hidden rounded-xl border border-white/10 bg-black/40"
        style={{ touchAction: 'none' }}
      >
        <div ref={marcoRef} className="absolute left-0 top-0" style={{ transformOrigin: '0 0' }}>
          {/* Blanco literal (no `bg-white`, que se invierte con el tema): es el fondo del dibujo. */}
          <div ref={capasRef} className="relative bg-[#ffffff]" />
          <canvas ref={guiasRef} className="pointer-events-none absolute left-0 top-0" />
          <canvas ref={overlayRef} className="pointer-events-none absolute left-0 top-0" />
        </div>
        {!dibujo && (
          <div className="absolute inset-0 grid place-items-center">
            <Spinner etiqueta={t('arte.editor.cargando', 'Cargando el dibujo')} />
          </div>
        )}
        {panelCapas && dibujo && lienzoListo && (
          <PanelCapas lienzo={lienzoListo} alCambiar={marcar} alCerrar={() => setPanelCapas(false)} />
        )}
      </div>

      <input
        ref={archivoRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const archivo = e.target.files?.[0]
          if (archivo) void insertarFoto(archivo)
          e.target.value = ''
        }}
      />

      {panelFiltros && (
        <Modal titulo={t('arte.editor.filtros', 'Filtros')} onCerrar={() => setPanelFiltros(false)}>
          <div className="grid grid-cols-2 gap-2">
            {FILTROS.map((f) => (
              <BotonSecundario
                key={f.id}
                onClick={() => {
                  lienzoRef.current?.filtrar(f.id)
                  marcar()
                }}
              >
                {t(f.clave, f.es)}
              </BotonSecundario>
            ))}
          </div>
          <p className="text-xs text-white/40">
            {t('arte.filtro.nota', 'Cada filtro se aplica a la capa activa y se puede deshacer.')}
          </p>
        </Modal>
      )}

      {panelApoyo && (
        <Modal titulo={t('arte.apoyo.titulo', 'Ayudas de dibujo')} onCerrar={() => setPanelApoyo(false)}>
          <div className="grid grid-cols-2 gap-2">
            {apoyoBtn(apoyo.regla, 'regla', t('arte.apoyo.regla', 'Regla'), () => {
              setApoyo((a) => ({ ...a, regla: !a.regla }))
              setRecta(null)
            })}
            {apoyoBtn(apoyo.rejilla, 'rejilla', t('arte.apoyo.rejilla', 'Rejilla con imán'), () =>
              setApoyo((a) => ({ ...a, rejilla: !a.rejilla })),
            )}
            {apoyoBtn(apoyo.espejoV, 'espejo', t('arte.apoyo.espejoV', 'Espejo vertical'), () =>
              setApoyo((a) => ({ ...a, espejoV: !a.espejoV })),
            )}
            {apoyoBtn(apoyo.espejoH, 'espejo', t('arte.apoyo.espejoH', 'Espejo horizontal'), () =>
              setApoyo((a) => ({ ...a, espejoH: !a.espejoH })),
            )}
          </div>
          <p className="text-xs text-white/40">
            {t(
              'arte.apoyo.nota',
              'La regla se coloca arrastrando sobre el lienzo y los trazos libres se pegan a ella. El espejo refleja lo que dibujas y la rejilla imanta los extremos de las formas.',
            )}
          </p>
        </Modal>
      )}

      {panelIA && (
        <Modal titulo={t('arte.ia.titulo', 'Pintar con IA')} onCerrar={() => setPanelIA(false)}>
          <Campo etiqueta={t('arte.ia.prompt', 'Qué quieres ver')}>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder={t('arte.ia.promptPh', 'Un faro en la tormenta, estilo acuarela…')}
              className={INPUT}
            />
          </Campo>
          {errorIA && <p className="text-xs text-red-400">{errorIA}</p>}
          <div className="grid grid-cols-1 gap-2">
            <BotonSecundario disabled={generando || !prompt.trim() || !imagenIaActiva()} onClick={() => void correrIA(false)}>
              {generando ? <Spinner pequeno /> : <Icono nombre="brillo" />} {t('arte.ia.generar', 'Generar dibujo')}{' '}
              <Creditos n={CREDITOS[opImagen(calidad)]} />
            </BotonSecundario>
            <BotonSecundario disabled={generando || !prompt.trim() || !imagenIaActiva()} onClick={() => void correrIA(true)}>
              {generando ? <Spinner pequeno /> : <Icono nombre="paleta" />}{' '}
              {t('arte.ia.reinterpretar', 'Reinterpretar mi lienzo')} <Creditos n={CREDITOS[opImagen(calidad)]} />
            </BotonSecundario>
          </div>
          <p className="text-xs text-white/40">
            {t(
              'arte.ia.nota',
              'El resultado cubre la capa activa (se puede deshacer). Al reinterpretar, tu dibujo compuesto viaja como referencia.',
            )}
          </p>
        </Modal>
      )}
    </div>
  )
}
