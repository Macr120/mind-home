import { useEffect, useRef, useState } from 'react'
import { CREDITOS, opImagen } from '../../core/cuenta/costos'
import type { Dibujo } from '../../core/data/db'
import { dibujosRepo } from '../../core/data/repository'
import { descargarArchivo } from '../../core/descargarArchivo'
import { tGlobal, useT } from '../../core/i18n/useT'
import { generarImagen, imagenIaActiva, type AspectoImagen } from '../../core/imagenIA'
import { useAjustes } from '../../core/state/ajustesStore'
import { confirmar, pedirTexto } from '../../core/state/confirmarStore'
import { Creditos } from '../../core/ui/Creditos'
import { useArrastre, type PropsArrastre } from '../../core/ui/comun/arrastre'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import { miniaturaFoto, comprimirFoto } from '../_shared/fotos'
import { BotonPrimario, BotonSecundario, Campo, INPUT, Modal, Spinner } from '../_shared/ui'
import { PanelCapas } from './PanelCapas'
import {
  BARRA_DEFECTO,
  cargarBarra,
  esBarraDefecto,
  guardarBarra,
  moverGrupo,
  moverHerr,
  type Barra,
  type DestinoBarra,
  type GrupoBarra,
  type HerrBarra,
} from './barra'
import {
  COLOR,
  GROSORES,
  LADO_MAX,
  LADO_MIN,
  MAX_CAPAS,
  PALETA,
  PRESETS_LIENZO,
  REJILLA_PASO,
  ZOOM_MAX,
  ZOOM_MIN,
} from './constantes'
import {
  crearLienzo,
  dibujarFormaEn,
  extremosEspejados,
  type Caja,
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

/** Color de las guías (regla, rejilla, ejes del espejo, caja del objeto): azul ajeno al tema, sobre el blanco del lienzo. */
const GUIA = 'rgba(59, 130, 246, 0.55)'
const GUIA_TENUE = 'rgba(59, 130, 246, 0.2)'

type Esquina = 'nw' | 'ne' | 'sw' | 'se'

/** Las cuatro esquinas de una caja, con su nombre (para los tiradores de «mover»). */
const esquinasDe = (c: Caja): [number, number, Esquina][] => [
  [c.x, c.y, 'nw'],
  [c.x + c.w, c.y, 'ne'],
  [c.x, c.y + c.h, 'sw'],
  [c.x + c.w, c.y + c.h, 'se'],
]

/**
 * Botón cuadrado de la barra (herramienta o acción): `activo` lo tiñe con el
 * color de la app. Componente y no helper: así sus `onClick` son props de JSX
 * y el lint de refs no los toma por lecturas durante el render. `arrastre`
 * trae el gesto de la casa (y el `data-herr` que lo identifica bajo el dedo);
 * deshabilitado va por `aria-disabled` y no por `disabled`, que mataría los
 * pointer events y con ellos el arrastre.
 */
function BotonBarra({
  icono,
  etiqueta,
  onClick,
  activo = false,
  deshabilitado = false,
  arrastre,
  className = '',
}: {
  icono: NombreIcono
  etiqueta: string
  onClick: () => void
  activo?: boolean
  deshabilitado?: boolean
  arrastre?: PropsArrastre & { 'data-herr': HerrBarra }
  className?: string
}) {
  const { style: estiloArrastre, ...gesto } = arrastre ?? {}
  return (
    <button
      type="button"
      {...gesto}
      onClick={() => {
        if (!deshabilitado) onClick()
      }}
      aria-disabled={deshabilitado}
      title={etiqueta}
      aria-label={etiqueta}
      aria-pressed={activo}
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border text-white transition active:scale-90 ${
        activo ? 'border-transparent' : 'border-white/10 bg-white/10 hover:bg-white/20'
      } ${deshabilitado ? 'opacity-40' : ''} ${className}`}
      style={{ ...estiloArrastre, ...(activo ? { background: COLOR } : undefined) }}
    >
      <Icono nombre={icono} />
    </button>
  )
}

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
  // Los filtros van en una tira bajo la barra (no en un modal): se aplican viendo el lienzo.
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)
  const [panelCapas, setPanelCapas] = useState(false)
  const [panelApoyo, setPanelApoyo] = useState(false)
  const [panelTamano, setPanelTamano] = useState(false)
  const [tamano, setTamano] = useState({ ancho: 0, alto: 0, escalar: true })
  // La barra a gusto del usuario (orden de grupos y herramienta por grupo) y qué grupos están desplegados.
  const [barra, setBarra] = useState(cargarBarra)
  const [abiertos, setAbiertos] = useState<Record<GrupoBarra, boolean>>({
    pintar: true,
    formas: true,
    objetos: true,
    lienzo: true,
    color: true,
    historial: true,
  })
  // Ayudas de dibujo: regla colocable, espejo por eje y rejilla con imán.
  const [apoyo, setApoyo] = useState({ regla: false, espejoV: false, espejoH: false, rejilla: false })
  const [recta, setRecta] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  // ¿La capa activa tiene algo que mover? (la caja viva va en un ref: se repinta por gesto)
  const [hayObjeto, setHayObjeto] = useState(false)
  const [aviso, setAviso] = useState('')
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
  const avisoTimer = useRef(0)

  // Gestos (viven en refs: nada de esto re-renderiza)
  const punteros = useRef(new Map<number, { cx: number; cy: number }>())
  const trazando = useRef(false)
  const forma = useRef<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  const colocando = useRef<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  const paneando = useRef<{ cx: number; cy: number } | null>(null)
  const pinch = useRef<{ d0: number; esc0: number; mx: number; my: number; tx0: number; ty0: number } | null>(null)
  const vista = useRef({ esc: 1, tx: 0, ty: 0 })
  // Herramienta «mover»: caja del objeto (capa activa) y gesto en curso.
  const cajaRef = useRef<Caja | null>(null)
  const moviendo = useRef<{ esquina: Esquina | null; x0: number; y0: number; origen: Caja; cambio: boolean } | null>(null)

  const limpiarOverlay = () => {
    const o = overlayRef.current
    o?.getContext('2d')?.clearRect(0, 0, o.width, o.height)
  }

  /** La caja del objeto con sus cuatro tiradores, a tamaño constante en pantalla. */
  const pintarCajaMover = () => {
    const o = overlayRef.current
    const ctx = o?.getContext('2d')
    if (!o || !ctx) return
    ctx.clearRect(0, 0, o.width, o.height)
    const caja = cajaRef.current
    if (!caja) return
    const esc = vista.current.esc
    const lado = 12 / esc
    ctx.strokeStyle = GUIA
    ctx.lineWidth = 2 / esc
    ctx.setLineDash([8 / esc, 6 / esc])
    ctx.strokeRect(caja.x, caja.y, caja.w, caja.h)
    ctx.setLineDash([])
    ctx.fillStyle = '#ffffff'
    for (const [x, y] of esquinasDe(caja)) {
      ctx.fillRect(x - lado / 2, y - lado / 2, lado, lado)
      ctx.strokeRect(x - lado / 2, y - lado / 2, lado, lado)
    }
  }

  const aplicarVista = () => {
    const m = marcoRef.current
    if (!m) return
    const { esc, tx, ty } = vista.current
    m.style.transform = `translate(${tx}px, ${ty}px) scale(${esc})`
  }

  /** Zoom o paneo en marcha: los tiradores miden en px de pantalla y se repintan. */
  const refrescarVista = () => {
    aplicarVista()
    if (herramienta === 'mover') pintarCajaMover()
  }

  // Solo lee refs (como `guardarRef`): estable, la carga y el cambio de tamaño la comparten.
  const encuadrarRef = useRef((ancho: number, alto: number): boolean => {
    /** Centra el lienzo al contenedor; false si aún mide 0 (panel oculto al montar). */
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
  })

  /** Recalcula la caja del objeto de los píxeles de la capa activa (solo con «mover»). */
  const refrescarCaja = (conMover: boolean) => {
    const lienzo = lienzoRef.current
    cajaRef.current = conMover && lienzo ? lienzo.cajaActiva() : null
    setHayObjeto(cajaRef.current != null)
    pintarCajaMover()
  }

  const elegirHerramienta = (h: HerramientaArte) => {
    setHerramienta(h)
    refrescarCaja(h === 'mover')
  }

  /** Aviso fugaz bajo la barra (nada que confirmar: solo informa). */
  const avisar = (texto: string) => {
    setAviso(texto)
    window.clearTimeout(avisoTimer.current)
    avisoTimer.current = window.setTimeout(() => setAviso(''), 4000)
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
    // Con «mover», la caja del objeto sigue a los píxeles (también al cambiar de capa).
    if (herramienta === 'mover') refrescarCaja(true)
  }

  // Carga única: fila → lienzo (capas) → encuadre inicial centrado.
  useEffect(() => {
    let vivo = true
    const guardar = guardarRef.current // estable: se inicializa una sola vez
    const encuadrar = encuadrarRef.current
    let ro: ResizeObserver | null = null
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
      if (moviendo.current) {
        lienzo.cancelarTransformar()
        cajaRef.current = moviendo.current.origen
        moviendo.current = null
      }
      forma.current = null
      colocando.current = null
      paneando.current = null
      limpiarOverlay()
      if (herramienta === 'mover') pintarCajaMover()
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
    if (herramienta === 'mover') {
      // Sobre un tirador se escala; dentro de la caja se mueve; fuera, nada.
      const caja = cajaRef.current
      if (!caja) return
      const tol = 14 / vista.current.esc
      const esquina = esquinasDe(caja).find(([ex, ey]) => Math.abs(x - ex) <= tol && Math.abs(y - ey) <= tol)?.[2]
      const dentro = x >= caja.x - tol && x <= caja.x + caja.w + tol && y >= caja.y - tol && y <= caja.y + caja.h + tol
      if (!esquina && !dentro) return
      const origen = lienzo.empezarTransformar()
      if (!origen) return
      moviendo.current = { esquina: esquina ?? null, x0: x, y0: y, origen, cambio: false }
    } else if (herramienta === 'relleno') {
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
      refrescarVista()
      return
    }
    if (paneando.current) {
      vista.current.tx += e.clientX - paneando.current.cx
      vista.current.ty += e.clientY - paneando.current.cy
      paneando.current = { cx: e.clientX, cy: e.clientY }
      refrescarVista()
      return
    }
    if (moviendo.current) {
      const m = moviendo.current
      const { x, y } = coordsDe(e)
      const o = m.origen
      let destino: Caja
      if (!m.esquina) {
        destino = { ...o, x: Math.round(o.x + x - m.x0), y: Math.round(o.y + y - m.y0) }
      } else {
        // La esquina opuesta queda fija y la escala es proporcional: manda el
        // lado que más se estira (así el objeto nunca se aplasta).
        const oeste = m.esquina.includes('w')
        const norte = m.esquina.includes('n')
        const ax = oeste ? o.x + o.w : o.x
        const ay = norte ? o.y + o.h : o.y
        const sx = (oeste ? ax - x : x - ax) / o.w
        const sy = (norte ? ay - y : y - ay) / o.h
        const f = Math.max(0.02, sx, sy)
        const w = Math.max(1, Math.round(o.w * f))
        const h = Math.max(1, Math.round(o.h * f))
        destino = { x: oeste ? ax - w : ax, y: norte ? ay - h : ay, w, h }
      }
      m.cambio = true
      cajaRef.current = destino
      lienzo.transformar(destino)
      pintarCajaMover()
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
    if (moviendo.current && lienzo) {
      const m = moviendo.current
      moviendo.current = null
      lienzo.terminarTransformar(m.cambio)
      // Con cambio, `marcar` recalcula la caja de los píxeles ya movidos.
      if (m.cambio) marcar()
      return
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
    refrescarVista()
  }

  // ─── Acciones ────────────────────────────────────────────────────────────
  /** La foto entra como OBJETO: capa propia, entera y centrada, y lista para moverse. */
  const insertarFoto = async (archivo: File) => {
    const lienzo = lienzoRef.current
    if (!lienzo) return
    const nombre = archivo.name.replace(/\.[a-z0-9]+$/i, '') || t('arte.capa.foto', 'Foto')
    await lienzo.insertarImagen(await comprimirFoto(archivo), nombre)
    marcar()
    elegirHerramienta('mover')
  }

  const separarObjetos = async () => {
    const lienzo = lienzoRef.current
    if (!lienzo) return
    if (lienzo.capas().length >= MAX_CAPAS) {
      avisar(t('arte.objetos.sinSitio', 'No caben más capas: fusiona o borra alguna antes de separar.'))
      return
    }
    const si = await confirmar({
      titulo: t('arte.objetos.separar', 'Separar en objetos'),
      mensaje: t(
        'arte.objetos.separarMsg',
        'Cada objeto suelto de la capa activa pasa a una capa propia (en una foto, todo lo que no sea su fondo liso). No se puede deshacer.',
      ),
    })
    if (!si || !lienzoRef.current) return
    const n = lienzoRef.current.separarObjetos((k) => t('arte.objetos.nombre', 'Objeto {n}', { n: k }))
    if (n === 0) {
      avisar(t('arte.objetos.ninguno', 'No se encontró nada suelto en esta capa.'))
      return
    }
    setPanelCapas(true)
    marcar()
    elegirHerramienta('mover')
  }

  const abrirTamano = () => {
    if (!dibujo) return
    setTamano({ ancho: dibujo.ancho, alto: dibujo.alto, escalar: true })
    setPanelTamano(true)
  }

  const ladoValido = (v: number) => Number.isInteger(v) && v >= LADO_MIN && v <= LADO_MAX

  const aplicarTamano = async () => {
    const lienzo = lienzoRef.current
    if (!lienzo || !dibujo) return
    const { ancho, alto, escalar } = tamano
    if (!ladoValido(ancho) || !ladoValido(alto)) return
    lienzo.redimensionar(ancho, alto, escalar)
    dims.current = { ancho, alto }
    for (const c of [guiasRef.current, overlayRef.current]) {
      if (c) {
        c.width = ancho
        c.height = alto
      }
    }
    setRecta(null)
    setDibujo({ ...dibujo, ancho, alto })
    setPanelTamano(false)
    encuadrarRef.current(ancho, alto)
    await dibujosRepo.update(id, { ancho, alto })
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

  // ─── Barra de herramientas ───────────────────────────────────────────────
  const cambiarBarra = (f: (b: Barra) => Barra) =>
    setBarra((b) => {
      const nueva = f(b)
      guardarBarra(nueva)
      return nueva
    })

  /**
   * Arrastrar y soltar (el gesto de la casa): la cabecera mueve el grupo entero
   * antes o después de otro; un botón se recoloca antes o después de otro botón
   * (de cualquier grupo) o al final del grupo sobre el que se suelta. «Trazo y
   * color» solo se mueve como grupo: su contenido es fijo y no recibe botones.
   */
  const arr = useArrastre<DestinoBarra>(
    (e, mano) => {
      const bajo = document.elementFromPoint(e.clientX, e.clientY)
      if (!bajo) return null
      const id = mano.slice(2)
      const despuesDe = (el: Element) => {
        const caja = el.getBoundingClientRect()
        return e.clientX > caja.left + caja.width / 2
      }
      const contGrupo = bajo.closest('[data-grupo]')
      const grupo = contGrupo?.getAttribute('data-grupo') as GrupoBarra | undefined
      if (mano.startsWith('g:')) {
        return contGrupo && grupo && grupo !== id ? { tipo: 'grupo', grupo, despues: despuesDe(contGrupo) } : null
      }
      const boton = bajo.closest('[data-herr]')
      const herr = boton?.getAttribute('data-herr') as HerrBarra | undefined
      if (boton && herr) return herr === id ? null : { tipo: 'herr', herr, despues: despuesDe(boton) }
      return grupo && grupo !== 'color' ? { tipo: 'fin', grupo } : null
    },
    (mano, destino) => {
      const id = mano.slice(2)
      if (mano.startsWith('g:')) {
        if (destino.tipo === 'grupo') cambiarBarra((b) => moverGrupo(b, id as GrupoBarra, destino))
      } else {
        cambiarBarra((b) => moverHerr(b, id as HerrBarra, destino))
      }
    },
  )

  /** Gesto, identidad y marcas de un botón: el que va en la mano se atenúa y el destino lleva el acento. */
  const dndHerr = (id: HerrBarra) => {
    const d = arr.destino
    const marca =
      d?.tipo === 'herr' && d.herr === id ? (d.despues ? 'border-e-2 border-accent' : 'border-s-2 border-accent') : ''
    return {
      arrastre: { ...arr.props(`h:${id}`), 'data-herr': id },
      className: `cursor-grab ${arr.enMano === `h:${id}` ? 'opacity-40' : ''} ${marca}`,
    }
  }

  const herrBtn = (h: HerramientaArte, icono: NombreIcono, etiqueta: string) => (
    <BotonBarra
      key={h}
      icono={icono}
      etiqueta={etiqueta}
      activo={herramienta === h}
      onClick={() => elegirHerramienta(h)}
      {...dndHerr(h)}
    />
  )

  /** Cada botón de la barra por su id; en qué grupo y en qué orden va lo dice `barra`. */
  const pintarHerr = (id: HerrBarra) => {
    switch (id) {
      case 'pincel':
        return herrBtn('pincel', 'pincel', t('arte.herr.pincel', 'Pincel'))
      case 'spray':
        return herrBtn('spray', 'spray', t('arte.herr.spray', 'Spray'))
      case 'borrador':
        return herrBtn('borrador', 'borrador', t('arte.herr.borrador', 'Borrador'))
      case 'relleno':
        return herrBtn('relleno', 'bote', t('arte.herr.relleno', 'Rellenar'))
      case 'gotero':
        return herrBtn('gotero', 'gotero', t('arte.herr.gotero', 'Tomar color'))
      case 'linea':
        return herrBtn('linea', 'linea', t('arte.herr.linea', 'Línea'))
      case 'rect':
        return herrBtn('rect', 'rectangulo', t('arte.herr.rect', 'Rectángulo'))
      case 'elipse':
        return herrBtn('elipse', 'elipse', t('arte.herr.elipse', 'Elipse'))
      case 'compas':
        return herrBtn('compas', 'compas', t('arte.herr.compas', 'Compás'))
      case 'texto':
        return herrBtn('texto', 'letra', t('arte.herr.texto', 'Texto'))
      case 'mover':
        return herrBtn('mover', 'mover', t('arte.herr.mover', 'Mover y escalar'))
      case 'foto':
        return (
          <BotonBarra
            key={id}
            icono="foto"
            etiqueta={t('arte.editor.foto', 'Insertar foto')}
            onClick={() => archivoRef.current?.click()}
            {...dndHerr(id)}
          />
        )
      case 'separar':
        return (
          <BotonBarra
            key={id}
            icono="tijeras"
            etiqueta={t('arte.objetos.separar', 'Separar en objetos')}
            onClick={() => void separarObjetos()}
            {...dndHerr(id)}
          />
        )
      case 'capas':
        return (
          <BotonBarra
            key={id}
            icono="capas"
            etiqueta={t('arte.capa.titulo', 'Capas')}
            activo={panelCapas}
            onClick={() => setPanelCapas((v) => !v)}
            {...dndHerr(id)}
          />
        )
      case 'tamano':
        return (
          <BotonBarra
            key={id}
            icono="expandir"
            etiqueta={t('arte.lista.tamano', 'Tamaño del lienzo')}
            onClick={abrirTamano}
            {...dndHerr(id)}
          />
        )
      case 'ayudas':
        return (
          <BotonBarra
            key={id}
            icono="regla"
            etiqueta={t('arte.apoyo.titulo', 'Ayudas de dibujo')}
            activo={apoyoActivo}
            onClick={() => setPanelApoyo(true)}
            {...dndHerr(id)}
          />
        )
      case 'filtros':
        return (
          <BotonBarra
            key={id}
            icono="brillo"
            etiqueta={t('arte.editor.filtros', 'Filtros')}
            activo={filtrosAbiertos}
            onClick={() => setFiltrosAbiertos((v) => !v)}
            {...dndHerr(id)}
          />
        )
      case 'png':
        return (
          <BotonBarra
            key={id}
            icono="descargar"
            etiqueta={t('arte.editor.png', 'PNG')}
            onClick={() => void exportarPng()}
            {...dndHerr(id)}
          />
        )
      case 'deshacer':
        return (
          <BotonBarra
            key={id}
            icono="deshacer"
            etiqueta={t('arte.editor.deshacer', 'Deshacer')}
            deshabilitado={!pilas.deshacer}
            onClick={() => {
              if (lienzoRef.current?.deshacer()) marcar()
            }}
            {...dndHerr(id)}
          />
        )
      case 'rehacer':
        return (
          <BotonBarra
            key={id}
            icono="rehacer"
            etiqueta={t('arte.editor.rehacer', 'Rehacer')}
            deshabilitado={!pilas.rehacer}
            onClick={() => {
              if (lienzoRef.current?.rehacer()) marcar()
            }}
            {...dndHerr(id)}
          />
        )
      case 'limpiar':
        return (
          <BotonBarra
            key={id}
            icono="basura"
            etiqueta={t('arte.editor.limpiarCapa', 'Limpiar la capa')}
            onClick={() => {
              lienzoRef.current?.limpiar()
              marcar()
            }}
            {...dndHerr(id)}
          />
        )
    }
  }

  /** El contenido fijo del grupo «Trazo y color»: grosores, paleta y color libre. */
  const trazoYColor = (
    <>
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
    </>
  )

  const GRUPO_META: Record<GrupoBarra, { icono: NombreIcono; etiqueta: string }> = {
    pintar: { icono: 'paleta', etiqueta: t('arte.grupo.pintar', 'Pintar') },
    formas: { icono: 'poligono', etiqueta: t('arte.grupo.formas', 'Formas') },
    objetos: { icono: 'rompecabezas', etiqueta: t('arte.grupo.objetos', 'Objetos') },
    lienzo: { icono: 'imagen', etiqueta: t('arte.grupo.lienzo', 'Lienzo') },
    color: { icono: 'multicolor', etiqueta: t('arte.grupo.color', 'Trazo y color') },
    historial: { icono: 'repetir', etiqueta: t('arte.grupo.historial', 'Historial') },
  }

  /**
   * Un grupo plegable de la barra (calca el transporte del Studio de audio): su
   * icono + chevron encabezan —y son el asa que arrastra el grupo entero— y,
   * desplegado, siguen sus botones. En angosto se pliegan los que no se usan.
   */
  const grupoJsx = (id: GrupoBarra) => {
    const { icono, etiqueta } = GRUPO_META[id]
    const d = arr.destino
    const marca =
      d?.tipo === 'grupo' && d.grupo === id
        ? d.despues
          ? 'border-e-2 border-accent'
          : 'border-s-2 border-accent'
        : d?.tipo === 'fin' && d.grupo === id
          ? 'ring-2 ring-accent'
          : ''
    const { style: estiloArrastre, ...gesto } = arr.props(`g:${id}`)
    return (
      <div
        key={id}
        data-grupo={id}
        className={`flex flex-wrap items-center gap-1 rounded-lg border border-white/5 bg-white/[0.03] p-0.5 ${
          arr.enMano === `g:${id}` ? 'opacity-40' : ''
        } ${marca}`}
      >
        <button
          type="button"
          {...gesto}
          style={estiloArrastre}
          onClick={() => setAbiertos((a) => ({ ...a, [id]: !a[id] }))}
          aria-expanded={abiertos[id]}
          aria-label={etiqueta}
          title={etiqueta}
          className="flex h-9 shrink-0 cursor-grab items-center gap-0.5 rounded-lg px-1.5 text-white/60 transition hover:bg-white/10 active:scale-95"
        >
          <Icono nombre={icono} />
          <Icono nombre={abiertos[id] ? 'desplegado' : 'plegado'} />
        </button>
        {abiertos[id] && (id === 'color' ? trazoYColor : barra.herr[id].map(pintarHerr))}
      </div>
    )
  }

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

  const tamanoValido = ladoValido(tamano.ancho) && ladoValido(tamano.alto)
  const tamanoIgual = dibujo != null && tamano.ancho === dibujo.ancho && tamano.alto === dibujo.alto

  return (
    <div className="flex h-full flex-col gap-2">
      {/* Cabecera */}
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <BotonSecundario pequeno onClick={alCerrar}>
          <Icono nombre="volver" /> {t('arte.editor.volver', 'Volver a la galería')}
        </BotonSecundario>
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{dibujo?.nombre ?? ''}</p>
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

      {/* Barra de herramientas por grupos: grupos y botones se arrastran y el orden se guarda. */}
      <div className="flex shrink-0 flex-wrap items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5">
        {barra.grupos.map(grupoJsx)}
        {!esBarraDefecto(barra) && (
          <BotonBarra
            icono="restaurar"
            etiqueta={t('arte.barra.restablecer', 'Restablecer la barra')}
            onClick={() => cambiarBarra(() => BARRA_DEFECTO)}
          />
        )}
      </div>

      {/* Los filtros, en línea: se aplican a la capa activa viendo el lienzo. */}
      {filtrosAbiertos && (
        <div className="flex shrink-0 flex-wrap items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                lienzoRef.current?.filtrar(f.id)
                marcar()
              }}
              className="rounded-lg border border-white/10 bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20 active:scale-95"
            >
              {t(f.clave, f.es)}
            </button>
          ))}
          <span className="text-[11px] text-white/40">
            {t('arte.filtro.nota', 'Cada filtro se aplica a la capa activa y se puede deshacer.')}
          </span>
        </div>
      )}

      {(aviso || herramienta === 'mover') && (
        <p className="shrink-0 px-1 text-xs text-white/50">
          {aviso ||
            (hayObjeto
              ? t('arte.mover.nota', 'Arrastra el objeto para moverlo; tira de una esquina para cambiar su tamaño.')
              : t('arte.mover.vacia', 'La capa activa está vacía: elige otra capa en «Capas» o inserta una foto.'))}
        </p>
      )}

      {/* El lienzo */}
      <div
        ref={contRef}
        onPointerDown={alBajar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={alSoltar}
        onWheel={alRueda}
        onContextMenu={(e) => e.preventDefault()}
        className={`relative min-h-0 flex-1 overflow-hidden rounded-xl border border-white/10 bg-black/40 ${
          herramienta === 'mover' ? 'cursor-move' : 'cursor-crosshair'
        }`}
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

      {panelTamano && dibujo && (
        <Modal titulo={t('arte.lista.tamano', 'Tamaño del lienzo')} onCerrar={() => setPanelTamano(false)}>
          <div className="grid grid-cols-4 gap-2">
            {PRESETS_LIENZO.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setTamano((s) => ({ ...s, ancho: p.ancho, alto: p.alto }))}
                className={`rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                  tamano.ancho === p.ancho && tamano.alto === p.alto
                    ? 'border-white/60 bg-white/15'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                {p.id}
                <span className="block text-[10px] font-normal text-white/40">
                  {p.ancho}×{p.alto}
                </span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Campo etiqueta={t('arte.tamano.ancho', 'Ancho (px)')}>
              <input
                type="number"
                min={LADO_MIN}
                max={LADO_MAX}
                value={tamano.ancho}
                onChange={(e) => setTamano((s) => ({ ...s, ancho: Number(e.target.value) }))}
                className={INPUT}
              />
            </Campo>
            <Campo etiqueta={t('arte.tamano.alto', 'Alto (px)')}>
              <input
                type="number"
                min={LADO_MIN}
                max={LADO_MAX}
                value={tamano.alto}
                onChange={(e) => setTamano((s) => ({ ...s, alto: Number(e.target.value) }))}
                className={INPUT}
              />
            </Campo>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={tamano.escalar}
              onChange={(e) => setTamano((s) => ({ ...s, escalar: e.target.checked }))}
            />
            {t('arte.tamano.escalar', 'Escalar el dibujo al tamaño nuevo')}
          </label>
          <p className="text-xs text-white/40">
            {t(
              'arte.tamano.nota',
              'Sin escalar, el dibujo conserva sus píxeles centrados y el lienzo se recorta o se amplía. Cambiar el tamaño vacía el historial de deshacer.',
            )}{' '}
            {t('arte.tamano.limite', 'De {min} a {max} px por lado.', { min: LADO_MIN, max: LADO_MAX })}
          </p>
          <div className="flex justify-end">
            <BotonPrimario type="button" app={COLOR} disabled={!tamanoValido || tamanoIgual} onClick={() => void aplicarTamano()}>
              {t('arte.tamano.aplicar', 'Aplicar')}
            </BotonPrimario>
          </div>
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
