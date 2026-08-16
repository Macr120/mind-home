import { useEffect, useMemo, useRef, useState } from 'react'
import type { CeldaHoja, GraficaHoja, HojaCalculo } from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { ALTO_FILA, ANCHO_COL, COLOR, MAX_COLS, MAX_FILAS } from './constantes'
import { BarraAcciones } from './BarraAcciones'
import { BotonIA } from './BotonIA'
import { OP_ANALIZAR } from './costosIA'
import { detectarEncabezados } from './datosGrafica'
import { analizarDatos, graficaSugerida } from './ia'
import { PanelGraficas } from './PanelGraficas'
import {
  celdasDeRango,
  deRef,
  nombreCol,
  pintar,
  recalcular,
  refA1,
  resumenSeleccion,
  type Celdas,
} from './hoja'
import type { Motor } from './motor'
import {
  aTsv,
  celdasDeMatriz,
  copiarAlSistema,
  deTsv,
  leerDelSistema,
  recortar,
  type Recorte,
} from './portapapeles'
import { pegarRango, rectDe, refsDe, rellenar } from './refs'
import { TecladoMath } from './TecladoMath'
import { useInsercion } from './useInsercion'
import type { Historial } from './useHistorial'

/**
 * La rejilla A1 táctil.
 *
 * La celda se edita en la BARRA DE FÓRMULA de arriba y no dentro de la rejilla:
 * un input de 40 px con el teclado del teléfono encima es imposible de usar, y
 * además así se ve la fórmula completa aunque la celda muestre el resultado.
 *
 * Solo se renderizan las filas visibles (±6): con 200×52 el DOM entero serían
 * diez mil celdas.
 */

interface Pos {
  fila: number
  col: number
}

const VECINDAD = 6

export function Rejilla({
  hoja,
  motor,
  onCambiar,
  historial,
}: {
  hoja: HojaCalculo
  motor: Motor | null
  onCambiar: (celdas: Celdas, extra?: Partial<HojaCalculo>) => void
  /** Deshacer/rehacer; lo trae `HojasTab` porque vive por encima del borrador. */
  historial: Historial<Celdas>
}) {
  const t = useT()
  const [activa, setActiva] = useState<Pos>({ fila: 0, col: 0 })
  const [ancla, setAncla] = useState<Pos | null>(null)
  const [borrador, setBorrador] = useState(() => hoja.celdas.A1?.crudo ?? '')
  const [refCargada, setRefCargada] = useState('A1')
  const [editando, setEditando] = useState(false)
  const [scroll, setScroll] = useState(0)
  const [alto, setAlto] = useState(360)
  const [moviendo, setMoviendo] = useState(false)
  const [pegando, setPegando] = useState<string | null>(null)
  /** Tras una pulsación larga con el dedo: el toque siguiente cierra el rango. */
  const [rangoTactil, setRangoTactil] = useState(false)
  const [graficaEditada, setGraficaEditada] = useState<string | null>(null)
  const [analisis, setAnalisis] = useState<{ rango: string; texto: string } | null>(null)
  const [pensando, setPensando] = useState(false)
  const [errorIA, setErrorIA] = useState('')
  const caja = useRef<HTMLDivElement>(null)
  const campo = useRef<HTMLInputElement>(null)
  /** Arrastre de selección en curso: desde dónde y sobre qué se está barriendo. */
  const arrastre = useRef<{ tipo: 'celda' | 'col' | 'fila'; desde: Pos } | null>(null)
  /** Pulsación larga táctil: temporizador y punto donde bajó el dedo. */
  const pulsacion = useRef<{ id: number; x: number; y: number } | null>(null)
  // El recorte (que puede ser una hoja entera de celdas) vive en un ref para no
  // re-renderizar al copiar; el botón «Pegar» solo necesita saber SI lo hay, y
  // eso sí es estado — un ref leído en el render no repinta nada.
  const recorte = useRef<Recorte | null>(null)
  const [hayRecorte, setHayRecorte] = useState(false)

  /**
   * La paleta escribe en la barra de fórmula, donde esté el cursor. Una
   * notación solo tiene sentido DENTRO de una fórmula, así que si la celda aún
   * no empezaba por «=» se lo pone delante (y el cursor se corre con él).
   */
  const escribirNotacion = useInsercion(borrador, setBorrador, campo, (v) =>
    v.startsWith('=') ? v : `=${v}`,
  )

  const refActiva = refA1(activa.fila, activa.col)
  const resultados = useMemo(() => recalcular(hoja.celdas, motor), [hoja.celdas, motor])

  // Al cambiar de celda, la barra muestra lo que ESA celda guarda de verdad.
  // Ajuste durante el render (no en un efecto): así nunca se ve un fotograma con
  // el contenido de la celda anterior.
  if (refActiva !== refCargada) {
    setRefCargada(refActiva)
    setBorrador(hoja.celdas[refActiva]?.crudo ?? '')
    setEditando(false)
  }

  useEffect(() => {
    const el = caja.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setAlto(e.contentRect.height))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /**
   * Selección arrastrando, como en Excel. Se sigue el puntero por
   * `elementFromPoint` y no con `onPointerEnter` de cada celda: al capturar el
   * puntero, las demás celdas dejan de recibir eventos propios.
   */
  useEffect(() => {
    const alMover = (e: PointerEvent) => {
      // Un dedo que se desplaza está haciendo scroll: se cancela la espera larga.
      const p = pulsacion.current
      if (p && Math.abs(e.clientX - p.x) + Math.abs(e.clientY - p.y) > 10) {
        window.clearTimeout(p.id)
        pulsacion.current = null
      }
      const barrido = arrastre.current
      if (!barrido) return
      const bajo = document.elementFromPoint(e.clientX, e.clientY)
      // Barrer cabeceras selecciona columnas o filas enteras, como en Excel.
      const dato =
        barrido.tipo === 'celda'
          ? bajo?.closest('[data-celda]')?.getAttribute('data-celda')
          : barrido.tipo === 'col'
            ? bajo?.closest('[data-cab-col]')?.getAttribute('data-cab-col')
            : bajo?.closest('[data-cab-fila]')?.getAttribute('data-cab-fila')
      if (dato == null) return
      const destino =
        barrido.tipo === 'celda'
          ? deRef(dato)
          : barrido.tipo === 'col'
            ? { fila: 0, col: Number(dato) }
            : { fila: Number(dato), col: 0 }
      if (!destino) return
      setAncla((a) => a ?? barrido.desde)
      setActiva((a) => (a.fila === destino.fila && a.col === destino.col ? a : destino))
    }
    const alSoltar = () => {
      arrastre.current = null
      if (pulsacion.current) window.clearTimeout(pulsacion.current.id)
      pulsacion.current = null
    }
    window.addEventListener('pointermove', alMover)
    window.addEventListener('pointerup', alSoltar)
    window.addEventListener('pointercancel', alSoltar)
    return () => {
      window.removeEventListener('pointermove', alMover)
      window.removeEventListener('pointerup', alSoltar)
      window.removeEventListener('pointercancel', alSoltar)
      if (pulsacion.current) window.clearTimeout(pulsacion.current.id)
    }
  }, [])

  const desde = Math.max(0, Math.floor(scroll / ALTO_FILA) - VECINDAD)
  const hasta = Math.min(hoja.filas, Math.ceil((scroll + alto) / ALTO_FILA) + VECINDAD)

  /** Referencias seleccionadas (una celda, o el rectángulo desde el ancla). */
  const seleccion = useMemo(
    () => (ancla ? celdasDeRango(refA1(ancla.fila, ancla.col), refActiva) : [refActiva]),
    [ancla, refActiva],
  )
  const resumen = useMemo(() => resumenSeleccion(seleccion, resultados), [seleccion, resultados])

  /** Todo cambio de celdas pasa por aquí: así el historial nunca se salta uno. */
  const aplicar = (celdas: Celdas, extra?: Partial<HojaCalculo>) => {
    historial.registrar(hoja.celdas)
    onCambiar(celdas, extra)
  }

  const escribir = (ref: string, crudo: string) => {
    if ((hoja.celdas[ref]?.crudo ?? '') === crudo) return
    const celdas: Celdas = { ...hoja.celdas }
    if (crudo === '') delete celdas[ref]
    else celdas[ref] = { ...celdas[ref], crudo }
    aplicar(celdas)
  }

  /** El rectángulo seleccionado ahora mismo. */
  const rect = useMemo(() => rectDe(ancla ?? activa, activa), [ancla, activa])

  const copiar = async (cortar: boolean) => {
    recorte.current = recortar(hoja.celdas, rect, cortar)
    setHayRecorte(true)
    // Al portapapeles del sistema van los VALORES: una fórmula en español no le
    // sirve de nada a Excel.
    await copiarAlSistema(aTsv(hoja.celdas, rect, resultados))
    if (cortar) setMoviendo(false)
  }

  const pegarEn = (destino: Pos) => {
    const r = recorte.current
    if (!r) return
    aplicar(pegarRango(hoja.celdas, { rect: r.rect, celdas: r.celdas }, destino, r.cortado))
    if (r.cortado) {
      recorte.current = null
      setHayRecorte(false)
    }
    setMoviendo(false)
  }

  const pegar = async () => {
    if (recorte.current) return pegarEn(activa)
    const texto = await leerDelSistema()
    // En el WebView de Android leer el portapapeles falla: se pide a mano.
    if (texto == null) return setPegando('')
    pegarTexto(texto)
  }

  const pegarTexto = (texto: string) => {
    const matriz = deTsv(texto)
    if (!matriz.length) return
    aplicar({ ...hoja.celdas, ...celdasDeMatriz(matriz, activa) })
    setPegando(null)
  }

  const borrarSeleccion = () => {
    const celdas: Celdas = { ...hoja.celdas }
    let cambio = false
    for (const ref of refsDe(rect)) {
      if (celdas[ref]) {
        delete celdas[ref]
        cambio = true
      }
    }
    if (cambio) aplicar(celdas)
  }

  /**
   * Una gráfica con lo que hay seleccionado. Nace con las cabeceras ya
   * detectadas y abierta en sus ajustes: el gesto es «selecciono y grafico»,
   * no «relleno un formulario y luego elijo el rango».
   */
  const graficar = (tipo: GraficaHoja['tipo'] = 'barras') => {
    const rango = `${refA1(rect.f0, rect.c0)}:${refA1(rect.f1, rect.c1)}`
    const nueva: GraficaHoja = {
      id: `gra-${crypto.randomUUID()}`,
      tipo,
      titulo: '',
      rango,
      ...detectarEncabezados(rango, resultados),
    }
    onCambiar(hoja.celdas, { graficas: [...(hoja.graficas ?? []), nueva] })
    setGraficaEditada(nueva.id)
  }

  /**
   * Qué dicen los datos seleccionados. Se le mandan los valores YA calculados
   * (el mismo TSV que va al portapapeles), no las fórmulas: se le pide leer los
   * números, no volver a calcularlos.
   */
  const analizar = async () => {
    const rango = `${refA1(rect.f0, rect.c0)}:${refA1(rect.f1, rect.c1)}`
    setErrorIA('')
    setPensando(true)
    try {
      setAnalisis({ rango, texto: await analizarDatos(aTsv(hoja.celdas, rect, resultados), rango) })
    } catch (e) {
      setErrorIA(e instanceof Error ? e.message : t('computo.ia.falloAnalizar', 'No se pudieron leer los datos.'))
    } finally {
      setPensando(false)
    }
  }

  const deshacer = () => {
    const previo = historial.deshacer(hoja.celdas)
    if (previo) onCambiar(previo)
  }

  const rehacer = () => {
    const siguiente = historial.rehacer(hoja.celdas)
    if (siguiente) onCambiar(siguiente)
  }

  const confirmar = (avanza: 'abajo' | 'derecha' | null) => {
    escribir(refActiva, borrador.trim())
    setEditando(false)
    if (avanza === 'abajo') mover(activa.fila + 1, activa.col)
    if (avanza === 'derecha') mover(activa.fila, activa.col + 1)
  }

  const mover = (fila: number, col: number) => {
    const f = Math.max(0, Math.min(hoja.filas - 1, fila))
    const c = Math.max(0, Math.min(hoja.cols - 1, col))
    setActiva({ fila: f, col: c })
    setAncla(null)
    // Mantener a la vista la celda a la que se salta.
    const el = caja.current
    if (el) {
      const arriba = f * ALTO_FILA
      if (arriba < el.scrollTop) el.scrollTop = arriba
      else if (arriba + ALTO_FILA > el.scrollTop + el.clientHeight)
        el.scrollTop = arriba + ALTO_FILA - el.clientHeight
    }
  }

  /**
   * Mientras se escribe una fórmula, tocar una celda inserta su referencia (el
   * gesto de toda la vida). Fuera de ese caso, la selecciona.
   */
  const tocarCelda = (fila: number, col: number, conAncla: boolean) => {
    if (editando && borrador.startsWith('=') && /[+\-*/^(,:%<>=&\s]$/.test(borrador)) {
      setBorrador((s) => s + refA1(fila, col))
      campo.current?.focus()
      return
    }
    // Con la selección «en la mano», el siguiente toque es el destino. Se usa un
    // botón y no arrastrar desde el borde porque ese gesto pelea con el scroll
    // táctil de la propia rejilla.
    if (moviendo && recorte.current) return pegarEn({ fila, col })
    if (conAncla || rangoTactil) {
      setAncla((a) => a ?? activa)
      setActiva({ fila, col })
      setRangoTactil(false)
      return
    }
    setEditando(false)
    mover(fila, col)
  }

  /**
   * Arranca el arrastre de selección. Con el DEDO no se arrastra —ese gesto es
   * el scroll de la rejilla—: se mantiene pulsada la primera celda y el toque
   * siguiente cierra el rango.
   */
  const empezarSeleccion = (e: React.PointerEvent, fila: number, col: number) => {
    if (moviendo || (editando && borrador.startsWith('='))) return
    if (e.pointerType !== 'touch') {
      arrastre.current = { tipo: 'celda', desde: { fila, col } }
      return
    }
    if (pulsacion.current) window.clearTimeout(pulsacion.current.id)
    pulsacion.current = {
      x: e.clientX,
      y: e.clientY,
      id: window.setTimeout(() => {
        pulsacion.current = null
        setAncla({ fila, col })
        setActiva({ fila, col })
        setRangoTactil(true)
      }, 400),
    }
  }

  /**
   * Cabeceras: una columna, una fila o la hoja entera de un toque, y barriendo
   * se cogen varias. La celda ACTIVA queda en el extremo de arriba/izquierda
   * (como Excel), así que el ancla se pone en el extremo contrario.
   */
  const seleccionarCol = (col: number) => {
    setEditando(false)
    setAncla({ fila: hoja.filas - 1, col })
    setActiva({ fila: 0, col })
    arrastre.current = { tipo: 'col', desde: { fila: hoja.filas - 1, col } }
  }

  const seleccionarFila = (fila: number) => {
    setEditando(false)
    setAncla({ fila, col: hoja.cols - 1 })
    setActiva({ fila, col: 0 })
    arrastre.current = { tipo: 'fila', desde: { fila, col: hoja.cols - 1 } }
  }

  const seleccionarTodo = () => {
    setEditando(false)
    setAncla({ fila: hoja.filas - 1, col: hoja.cols - 1 })
    setActiva({ fila: 0, col: 0 })
  }

  /**
   * Asa para MOVER la selección arrastrándola, como el borde de un rango en
   * Excel. El recorte se hace al agarrar y se suelta sobre la celda destino; si
   * se suelta fuera de la rejilla, no pasa nada y la hoja se queda igual.
   */
  const arrastreMover = {
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        // El puntero ya se liberó; el gesto sigue valiendo.
      }
      recorte.current = recortar(hoja.celdas, rect, true)
    },
    onPointerUp: (e: React.PointerEvent) => {
      const ref = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-celda]')?.getAttribute('data-celda')
      const destino = ref ? deRef(ref) : null
      if (destino && recorte.current) pegarEn(destino)
      else recorte.current = null
    },
  }

  /** Teclas de la rejilla. Con la barra de fórmula enfocada no se toca nada. */
  const teclaRejilla = (e: React.KeyboardEvent) => {
    if (editando) return
    const ctrl = e.ctrlKey || e.metaKey
    if (ctrl && e.key.toLowerCase() === 'c') return void copiar(false)
    if (ctrl && e.key.toLowerCase() === 'x') return void copiar(true)
    if (ctrl && e.key.toLowerCase() === 'v') return void pegar()
    if (ctrl && e.key.toLowerCase() === 'z') return deshacer()
    if (ctrl && e.key.toLowerCase() === 'y') return rehacer()
    // Ctrl+E es «seleccionar todo» en el Excel en español; se aceptan las dos.
    if (ctrl && (e.key.toLowerCase() === 'a' || e.key.toLowerCase() === 'e')) {
      e.preventDefault()
      return seleccionarTodo()
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      return borrarSeleccion()
    }
    const pasos: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    }
    const paso = pasos[e.key]
    if (!paso) return
    e.preventDefault()
    const [df, dc] = paso
    if (e.shiftKey) {
      setAncla((a) => a ?? activa)
      setActiva((p) => ({
        fila: Math.max(0, Math.min(hoja.filas - 1, p.fila + df)),
        col: Math.max(0, Math.min(hoja.cols - 1, p.col + dc)),
      }))
      return
    }
    mover(activa.fila + df, activa.col + dc)
  }

  /** Estira la selección arrastrando su esquina (el «fill handle» de Excel). */
  const arrastreRelleno = {
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        // El puntero ya se liberó; el gesto sigue valiendo.
      }
    },
    onPointerUp: (e: React.PointerEvent) => {
      const celda = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-celda]')
      const ref = celda?.getAttribute('data-celda')
      const p = ref ? deRef(ref) : null
      if (p) aplicar(rellenar(hoja.celdas, rect, p))
    },
  }

  const ampliar = (que: 'filas' | 'cols') => {
    if (que === 'filas') onCambiar(hoja.celdas, { filas: Math.min(MAX_FILAS, hoja.filas + 20) })
    else onCambiar(hoja.celdas, { cols: Math.min(MAX_COLS, hoja.cols + 4) })
  }

  const anchoDe = (col: number) => hoja.anchos?.[nombreCol(col)] ?? ANCHO_COL

  return (
    <div className="space-y-2">
      {/* Barra de fórmula */}
      <div className="flex items-center gap-2" data-tut="computo.hojas.barra">
        <span className="w-14 shrink-0 rounded-lg bg-black/30 py-1.5 text-center font-mono text-xs font-semibold">
          {refActiva}
        </span>
        <input
          ref={campo}
          value={borrador}
          onChange={(e) => {
            setBorrador(e.target.value)
            setEditando(true)
          }}
          onFocus={() => setEditando(true)}
          onBlur={() => editando && confirmar(null)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              confirmar('abajo')
            } else if (e.key === 'Tab') {
              e.preventDefault()
              confirmar('derecha')
            } else if (e.key === 'Escape') {
              setBorrador(hoja.celdas[refActiva]?.crudo ?? '')
              setEditando(false)
            }
          }}
          placeholder={t('computo.hojas.formulaPlaceholder', 'Un valor, un texto o =SUMA(A1:A5)')}
          spellCheck={false}
          className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-2.5 py-1.5 font-mono text-sm outline-none focus:border-accent"
        />
      </div>

      <TecladoMath
        motor={motor}
        onInsertar={(escribe) => {
          setEditando(true)
          escribirNotacion(escribe)
        }}
      />

      <BarraAcciones
        puedeDeshacer={historial.puedeDeshacer}
        puedeRehacer={historial.puedeRehacer}
        hayRecorte={hayRecorte}
        moviendo={moviendo}
        onDeshacer={deshacer}
        onRehacer={rehacer}
        onCopiar={() => void copiar(false)}
        onCortar={() => void copiar(true)}
        onPegar={() => void pegar()}
        onMover={() => {
          if (moviendo) return setMoviendo(false)
          recorte.current = recortar(hoja.celdas, rect, true)
          setHayRecorte(true)
          setMoviendo(true)
        }}
        onBorrar={borrarSeleccion}
        onGraficar={() => graficar()}
      />

      {pegando !== null && (
        <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-xs text-white/60">
            {t(
              'computo.hojas.pegarManual',
              'Este navegador no deja leer el portapapeles. Pega aquí lo que copiaste y se colocará desde {ref}.',
              { ref: refActiva },
            )}
          </p>
          <textarea
            autoFocus
            value={pegando}
            onChange={(e) => setPegando(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-white/15 bg-black/30 px-2.5 py-1.5 font-mono text-xs outline-none focus:border-accent"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => pegarTexto(pegando)}
              disabled={!pegando.trim()}
              className="ui-accent-bg flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
            >
              {t('computo.hojas.pegar', 'Pegar')}
            </button>
            <button
              type="button"
              onClick={() => setPegando(null)}
              className="rounded-lg bg-white/5 px-3 py-1.5 text-xs transition hover:bg-white/10"
            >
              {t('computo.hojas.cancelar', 'Cancelar')}
            </button>
          </div>
        </div>
      )}

      {/* Rejilla */}
      <div
        ref={caja}
        tabIndex={0}
        onKeyDown={teclaRejilla}
        onScroll={(e) => setScroll(e.currentTarget.scrollTop)}
        className="relative max-h-[52vh] select-none overflow-auto rounded-xl border border-white/10 bg-black/20 outline-none"
      >
        <div style={{ height: hoja.filas * ALTO_FILA + ALTO_FILA, position: 'relative' }}>
          {/* Cabecera de columnas */}
          <div className="sticky top-0 z-10 flex bg-[color:var(--ui-panel-2)]" style={{ height: ALTO_FILA }}>
            <button
              type="button"
              onPointerDown={seleccionarTodo}
              title={t('computo.hojas.selTodo', 'Seleccionar toda la hoja')}
              aria-label={t('computo.hojas.selTodo', 'Seleccionar toda la hoja')}
              className="shrink-0 border-b border-e border-white/10 text-white/25 transition hover:bg-white/10 hover:text-white/60"
              style={{ width: 40 }}
            >
              ◢
            </button>
            {Array.from({ length: hoja.cols }, (_, c) => (
              <button
                key={c}
                type="button"
                data-cab-col={c}
                onPointerDown={() => seleccionarCol(c)}
                title={t('computo.hojas.selCol', 'Seleccionar la columna {col}', { col: nombreCol(c) })}
                className={`shrink-0 border-b border-e border-white/10 text-center text-[11px] font-semibold leading-[34px] transition hover:bg-white/10 ${
                  c >= rect.c0 && c <= rect.c1 ? 'bg-white/10 text-white' : 'text-white/45'
                }`}
                style={{ width: anchoDe(c) }}
              >
                {nombreCol(c)}
              </button>
            ))}
          </div>

          {/* Filas visibles, colocadas en su sitio real */}
          {Array.from({ length: Math.max(0, hasta - desde) }, (_, i) => {
            const fila = desde + i
            return (
              <div
                key={fila}
                className="absolute flex"
                style={{ top: (fila + 1) * ALTO_FILA, height: ALTO_FILA }}
              >
                <button
                  type="button"
                  data-cab-fila={fila}
                  onPointerDown={() => seleccionarFila(fila)}
                  title={t('computo.hojas.selFila', 'Seleccionar la fila {n}', { n: String(fila + 1) })}
                  className={`sticky start-0 z-[5] shrink-0 border-b border-e border-white/10 bg-[color:var(--ui-panel-2)] text-center text-[11px] leading-[34px] transition hover:bg-white/10 ${
                    fila >= rect.f0 && fila <= rect.f1 ? 'text-white' : 'text-white/40'
                  }`}
                  style={{ width: 40 }}
                >
                  {fila + 1}
                </button>
                {Array.from({ length: hoja.cols }, (_, col) => {
                  const ref = refA1(fila, col)
                  const celda = hoja.celdas[ref]
                  const res = resultados[ref]
                  // Por rectángulo y no por `seleccion.includes`: con la hoja
                  // entera seleccionada eso serían millones de comparaciones.
                  const dentro = fila >= rect.f0 && fila <= rect.f1 && col >= rect.c0 && col <= rect.c1
                  const esActiva = fila === activa.fila && col === activa.col
                  // La esquina de abajo a la derecha de la selección lleva el
                  // tirador de relleno; la de arriba a la izquierda, el asa de
                  // mover (el equivalente al borde arrastrable de Excel).
                  const esEsquina = fila === rect.f1 && col === rect.c1
                  const esAsa = fila === rect.f0 && col === rect.c0
                  return (
                    <button
                      key={col}
                      type="button"
                      data-celda={ref}
                      onPointerDown={(e) => {
                        tocarCelda(fila, col, e.shiftKey)
                        empezarSeleccion(e, fila, col)
                      }}
                      onDoubleClick={() => campo.current?.focus()}
                      className={`relative shrink-0 overflow-visible border-b border-e border-white/10 px-1 text-[11px] leading-[32px] ${
                        esActiva ? 'ring-1 ring-inset ring-accent' : dentro ? 'bg-white/10' : ''
                      } ${res?.error ? 'text-rose-300' : ''} ${
                        celda?.fmt?.neg ? 'font-bold' : ''
                      } ${alineacion(celda, res?.valor)}`}
                      style={{ width: anchoDe(col) }}
                      title={res?.error ?? undefined}
                    >
                      <span className="block truncate">{res?.error ?? pintar(res?.valor, celda)}</span>
                      {esAsa && (
                        <span
                          {...arrastreMover}
                          className="absolute -start-1 -top-1 z-10 h-3 w-3 cursor-move touch-none rounded-sm border border-accent bg-[color:var(--ui-panel-2)]"
                          title={t('computo.hojas.asaMover', 'Arrastra para mover la selección')}
                          aria-label={t('computo.hojas.asaMover', 'Arrastra para mover la selección')}
                        />
                      )}
                      {esEsquina && (
                        <span
                          {...arrastreRelleno}
                          className="absolute -bottom-1 -end-1 z-10 h-3 w-3 cursor-crosshair touch-none rounded-sm bg-accent"
                          title={t('computo.hojas.rellenar', 'Arrastra para rellenar')}
                          aria-label={t('computo.hojas.rellenar', 'Arrastra para rellenar')}
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Barra de estado y ampliación */}
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/45">
        {rangoTactil && (
          <span className="texto-cta rounded px-1.5 py-0.5 font-semibold" style={{ background: COLOR }}>
            {t('computo.hojas.rangoTactil', 'Toca la última celda')}
          </span>
        )}
        <span className="font-mono">
          {t('computo.hojas.resumen', 'Suma {suma} · Promedio {prom} · Cuenta {n}', {
            suma: String(Math.round(resumen.suma * 1e6) / 1e6),
            prom: String(Math.round(resumen.promedio * 1e6) / 1e6),
            n: String(resumen.cuenta),
          })}
        </span>
        <span className="flex-1" />
        {hoja.filas < MAX_FILAS && (
          <button type="button" onClick={() => ampliar('filas')} className="rounded bg-white/5 px-2 py-1 hover:bg-white/10">
            <Icono nombre="agregar" /> {t('computo.hojas.masFilas', 'Filas')}
          </button>
        )}
        {hoja.cols < MAX_COLS && (
          <button type="button" onClick={() => ampliar('cols')} className="rounded bg-white/5 px-2 py-1 hover:bg-white/10">
            <Icono nombre="agregar" /> {t('computo.hojas.masCols', 'Columnas')}
          </button>
        )}
      </div>

      <BotonIA
        op={OP_ANALIZAR}
        etiqueta={t('computo.ia.analizar', 'Leer los datos seleccionados')}
        generando={pensando}
        error={errorIA}
        onClick={() => void analizar()}
      />

      {analisis && (
        <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-baseline gap-2">
            <p className="min-w-0 flex-1 truncate font-mono text-xs text-white/45">{analisis.rango}</p>
            <button
              type="button"
              onClick={() => setAnalisis(null)}
              className="shrink-0 text-white/40 transition hover:text-white/80"
              title={t('computo.ia.cerrarAnalisis', 'Cerrar la lectura')}
              aria-label={t('computo.ia.cerrarAnalisis', 'Cerrar la lectura')}
            >
              <Icono nombre="cerrar" />
            </button>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">{analisis.texto}</p>
          {(() => {
            // La IA solo PROPONE el tipo; la gráfica la inserta el usuario.
            const sugerida = graficaSugerida(analisis.texto)
            if (!sugerida) return null
            return (
              <button
                type="button"
                onClick={() => graficar(sugerida)}
                className="ui-accent-bg rounded-lg px-2.5 py-1.5 text-xs font-semibold"
              >
                <Icono nombre="grafica" /> {t('computo.ia.insertarSugerida', 'Insertar esa gráfica')}
              </button>
            )
          })()}
        </div>
      )}

      <PanelGraficas
        hoja={hoja}
        resultados={resultados}
        editada={graficaEditada}
        onEditar={setGraficaEditada}
        onCambiar={onCambiar}
      />
    </div>
  )
}

/** Los números a la derecha y el texto a la izquierda, salvo que se fije otra. */
function alineacion(celda: CeldaHoja | undefined, valor: number | string | undefined): string {
  const puesta = celda?.fmt?.ali
  if (puesta === 'cen') return 'text-center'
  if (puesta === 'der') return 'text-end'
  if (puesta === 'izq') return 'text-start'
  return typeof valor === 'number' ? 'text-end' : 'text-start'
}

/** Una celda vacía, para quien necesite el molde. */
export const CELDA_VACIA: CeldaHoja = { crudo: '' }

/** Comprueba que una referencia escrita a mano exista dentro de la hoja. */
export const refValida = (ref: string, hoja: HojaCalculo): boolean => {
  const p = deRef(ref)
  return !!p && p.fila < hoja.filas && p.col < hoja.cols
}
