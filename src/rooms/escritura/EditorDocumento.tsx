import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChainedCommands, Editor } from '@tiptap/core'
import { EditorContent, useEditor } from '@tiptap/react'
import type { Documento } from '../../core/data/db'
import { documentosRepo, historiasRepo, relacionesLibroRepo, VACIO } from '../../core/data/repository'
import { descargarArchivo } from '../../core/descargarArchivo'
import * as apiEspacios from '../../core/espacios/api'
import { useEspacio } from '../../core/espacios/cache'
import { useEspaciosStore } from '../../core/espacios/espaciosStore'
import { abrirEspacio, type EspacioAbierto } from '../../core/espacios/motor'
import { BotonCompartir } from '../../core/espacios/ui/BotonCompartir'
import { ChipMiembros } from '../../core/espacios/ui/ChipMiembros'
import { abrirDocYjs, colorDeMiembro, type DocCompartido } from '../../core/espacios/yjs'
import { tGlobal, useT } from '../../core/i18n/useT'
import { imprimir, puedeImprimir } from '../../core/imprimir'
import { confirmar } from '../../core/state/confirmarStore'
import { useBuzon } from '../../core/buzon/buzonStore'
import { Creditos } from '../../core/ui/Creditos'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import { BotonPrimario, BotonSecundario, Campo, INPUT, Modal, Spinner } from '../_shared/ui'
import { compartirDocumento } from './compartido'
import { COLOR, MAX_HTML, PALETA_TEXTO } from './constantes'
import { OP_CONTINUAR, OP_MEJORAR, OP_REDACTAR, OP_RESUMIR } from './costosIA'
import { DiagramaRelaciones } from './DiagramaRelaciones'
import { extensiones } from './editorTiptap'
import { continuar, mejorar, redactar, resumir } from './ia'
import { IndiceDocumento } from './IndiceDocumento'
import { extraerIndice, htmlIndice, irAEncabezado, type EntradaIndice } from './indice'
import {
  borrarPintado,
  buscarMenciones,
  cssMenciones,
  esTipoRef,
  fichasDe,
  mencionEn,
  pintarMenciones,
  puntoBajo,
} from './menciones'
import { PanelHistoria } from './PanelHistoria'
import { CabeceraFicha, GloboReferencia } from './Referencias'
import { contarPalabras, escaparHtml, parrafosHtml, sanitizarHtml } from './sanitizarHtml'

/** Hoja de impresión del documento (papel limpio tipo A4, serif). */
const ESTILO_DOC = `
@page { size: A4; margin: 18mm; }
:root, html, body {
  background: #fff !important; color: #111 !important;
  height: auto !important; overflow: visible !important;
  font-family: Georgia, 'Times New Roman', serif;
}
* { color: #111 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font-size: 12pt; line-height: 1.55; }
h1 { font-size: 20pt; margin: 0 0 10pt; }
h2 { font-size: 15pt; margin: 14pt 0 6pt; }
h3 { font-size: 13pt; margin: 12pt 0 5pt; }
p { margin: 0 0 8pt; }
ul, ol { margin: 0 0 8pt; padding-inline-start: 22pt; }
ul { list-style: disc; }
ol { list-style: decimal; }
blockquote { border-inline-start: 3pt solid #bbb; padding-inline-start: 10pt; margin: 0 0 8pt; }
/* Índice de primera página. Sin números de página: Chromium no soporta target-counter. */
nav.doc-indice { page-break-after: always; }
nav.doc-indice ol { list-style: none; margin: 0; padding-inline-start: 14pt; }
nav.doc-indice > ol { padding-inline-start: 0; }
nav.doc-indice li { margin: 0 0 4pt; }
`

type AccionIA = 'redactar' | 'mejorar' | 'resumir' | 'continuar'

/** Botón de la barra: `preventDefault` en pointerdown o roba el foco y la selección. */
function BotonBarra({ icono, etiqueta, onUsar }: { icono: NombreIcono; etiqueta: string; onUsar: () => void }) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      title={etiqueta}
      onPointerDown={(e) => e.preventDefault()}
      onClick={onUsar}
      className="rounded-lg px-2 py-1.5 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
    >
      <Icono nombre={icono} />
    </button>
  )
}

/**
 * El editor de un documento: TipTap (ProseMirror) con el subconjunto de bloques
 * que sobrevive a `sanitizarHtml`.
 *
 * Dos modos con el MISMO editor:
 *  - privado: el HTML de Dexie se monta una vez por hoja y el autosave lo
 *    devuelve saneado con debounce de 1,5 s;
 *  - compartido (`Documento.espacioId`): el texto vive en un `Y.Doc` que
 *    `core/espacios/yjs.ts` mantiene al día contra el espacio, con los cursores
 *    de los demás. El autosave sigue corriendo para dejar la caché local fresca.
 */
export function EditorDocumento({
  id,
  alCerrar,
  onIrADoc,
}: {
  id: number
  alCerrar: () => void
  /** Cambia el documento abierto (las carpetas del libro dentro del editor). */
  onIrADoc?: (id: number) => void
}) {
  const t = useT()
  const [doc, setDoc] = useState<Documento | null>(null)
  const [titulo, setTitulo] = useState('')
  const [palabras, setPalabras] = useState(0)
  const [grande, setGrande] = useState(false)
  /** Hoja cuyo contenido ya salió de Dexie (hasta entonces no hay nada que montar). */
  const [cargadoId, setCargadoId] = useState<number | null>(null)
  const cargado = cargadoId === id

  // Índice automático (los h1/h2/h3 del DOM vivo; ver `indice.ts`)
  const [panelIndice, setPanelIndice] = useState(false)
  const [entradas, setEntradas] = useState<EntradaIndice[]>([])

  // Las carpetas del libro viven aquí dentro: en escritorio arrancan abiertas
  // como columna; en móvil son un pop-up que se pide con el botón de la barra.
  const [panelHistoria, setPanelHistoria] = useState(() => window.matchMedia('(min-width: 768px)').matches)

  // Qué ocupa la hoja: el documento o el diagrama de relaciones (otra «carpeta»
  // del libro, en grande aquí o en pequeño dentro del panel). El documento
  // sigue montado y oculto: así no se pierde ni el caret ni el historial.
  const [vista, setVista] = useState<'hoja' | 'relaciones'>('hoja')
  const [relacionesEnPanel, setRelacionesEnPanel] = useState(false)

  // ─── Compartido ──────────────────────────────────────────────────────────
  const espacioId = doc?.espacioId
  const espRef = useRef<EspacioAbierto | null>(null)
  /** El `Y.Doc` ya cargado: hasta que existe, el editor va en solo lectura. */
  const [colab, setColab] = useState<{ dc: DocCompartido; usuario: UsuarioColab } | null>(null)
  const [soloLectura, setSoloLectura] = useState(false)
  /** El dueño dejó de compartirlo (o me sacaron): la hoja vuelve a ser privada. */
  const [salioDelEspacio, setSalioDelEspacio] = useState(false)
  const conectado = useEspaciosStore((s) => (espacioId ? (s.vivos[espacioId]?.conectado ?? false) : true))
  const espCache = useEspacio(espacioId ?? null)
  const tituloRemoto = espCache?.titulo

  // Referencias del libro: los nombres de sus fichas se marcan en el texto y
  // llevan a su ficha (ver `menciones.ts`). Se pintan sobre el DOM vivo, sin
  // tocar el HTML: el documento guardado no cambia.
  const documentos = documentosRepo.useAll() ?? VACIO
  const historias = historiasRepo.useAll() ?? VACIO
  const docVivo = documentos.find((d) => d.id === id)
  const historiaId = doc?.historiaId
  const historia = historias.find((h) => h.id === historiaId)
  const fichas = useMemo(
    () => (historiaId != null ? fichasDe(documentos, historiaId, historia, id) : []),
    [documentos, historia, historiaId, id],
  )
  // Solo lo que se pinta: así el autosave (que muta `documentos`) no repinta cada vez.
  const firmaFichas = fichas.map((f) => `${f.id}|${f.nombres.join(',')}|${f.color}`).join('\n')
  const fichasRef = useRef(fichas)
  const mencionesRef = useRef<Map<number, Range[]>>(new Map())
  const timerPintarRef = useRef(0)
  const papelRef = useRef<HTMLDivElement>(null)
  /** El globo bajo la mención donde está el caret (`docId` lo invalida al cambiar de hoja). */
  const [globo, setGlobo] = useState<{ docId: number; id: number; top: number; left: number } | null>(null)
  const fichaGlobo = globo && globo.docId === id ? fichas.find((f) => f.id === globo.id) : undefined

  // Panel de IA
  const [panelIA, setPanelIA] = useState(false)
  const [instruccion, setInstruccion] = useState('')
  const [trabajando, setTrabajando] = useState<AccionIA | null>(null)
  const [errorIA, setErrorIA] = useState('')
  const [resumen, setResumen] = useState('')
  const [haySeleccion, setHaySeleccion] = useState(false)
  const rangoRef = useRef<{ from: number; to: number } | null>(null)
  const seleccionRef = useRef('')

  // ─── Guardado ────────────────────────────────────────────────────────────
  const sucioRef = useRef(false)
  /** El título lo tocó el usuario: un cambio que llega de fuera no debe reescribirlo. */
  const tituloSucioRef = useRef(false)
  const timerRef = useRef(0)
  const tituloRef = useRef('')
  /** Último HTML saneado: el que se remonta si la hoja vuelve a ser privada. */
  const contenidoRef = useRef('')
  const editorRef = useRef<Editor | null>(null)
  const guardarRef = useRef(async () => {})
  const guardar = async () => {
    if (!sucioRef.current) return
    const ed = editorRef.current
    if (!ed || ed.isDestroyed) return
    const html = sanitizarHtml(ed.getHTML())
    if (html.length > MAX_HTML) {
      setGrande(true)
      return
    }
    setGrande(false)
    sucioRef.current = false
    contenidoRef.current = html
    const conTitulo = tituloSucioRef.current
    tituloSucioRef.current = false
    await documentosRepo.update(id, {
      ...(conTitulo ? { titulo: tituloRef.current } : {}),
      contenido: html,
      palabras: contarPalabras(ed.getText()),
      actualizadoEn: new Date().toISOString(),
    })
    // El título compartido vive en el espacio: solo su dueño puede cambiarlo.
    const e = espRef.current
    if (conTitulo && e && e.estado()?.rol === 'dueno') {
      try {
        await apiEspacios.editar(e.espacioId, tituloRef.current, e.estado()?.meta ?? {})
      } catch {
        // No es crítico: el nombre local ya cambió y se reintenta al siguiente renombrado.
      }
    }
  }

  /** Busca las menciones en el texto vivo y las pinta. */
  const repintar = () => {
    const ed = editorRef.current
    if (!ed || ed.isDestroyed) return
    mencionesRef.current = buscarMenciones(ed.view.dom, fichasRef.current)
    pintarMenciones(mencionesRef.current)
  }
  const repintarRef = useRef(repintar)

  /** Marca sucio, recuenta y reprograma el autosave (~1.5 s tras el último cambio). */
  const alInput = () => {
    sucioRef.current = true
    // Las menciones se repintan antes que el guardado: que un nombre recién escrito se vea pronto.
    window.clearTimeout(timerPintarRef.current)
    timerPintarRef.current = window.setTimeout(() => repintarRef.current(), 400)
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      const ed = editorRef.current
      if (ed && !ed.isDestroyed) {
        setPalabras(contarPalabras(ed.getText()))
        setEntradas(extraerIndice(ed.view.dom))
      }
      void guardarRef.current()
    }, 1500)
  }
  const alInputRef = useRef(alInput)

  // ─── El editor ───────────────────────────────────────────────────────────
  // Se REHACE solo al entrar o salir del modo compartido (la extensión de
  // colaboración se enchufa al crearlo). Cambiar de hoja NO lo rehace: así el
  // volcado de la hoja anterior encuentra vivo el editor del que sale.
  const editor = useEditor(
    {
      extensions: extensiones(
        colab
          ? { colaboracion: { doc: colab.dc.doc, awareness: colab.dc.awareness, usuario: colab.usuario } }
          : undefined,
      ),
      editable: false,
      immediatelyRender: false,
      onUpdate: () => alInputRef.current(),
      editorProps: {
        attributes: {
          class: 'mph-doc flex-1 px-5 py-4 text-[15px] outline-none',
          role: 'textbox',
          'aria-multiline': 'true',
          'aria-label': t('escritura.editor.area', 'Contenido del documento'),
        },
      },
    },
    [colab],
  )

  // Refs "de lo último": se sincronizan tras cada render, nunca durante (regla react-hooks/refs).
  useEffect(() => {
    tituloRef.current = titulo
    guardarRef.current = guardar
    fichasRef.current = fichas
    repintarRef.current = repintar
    alInputRef.current = alInput
    editorRef.current = editor
  })

  // Repintar cuando cambian las fichas (nueva, renombrada, otro color); el
  // efecto de arriba ya sincronizó `fichasRef` porque va antes en el orden.
  useEffect(() => {
    repintarRef.current()
  }, [firmaFichas])

  // Carga única + flush al ocultar la app (Android mata el proceso sin avisar) y al salir.
  useEffect(() => {
    let vivo = true
    sucioRef.current = false
    tituloSucioRef.current = false
    void documentosRepo.list().then((docs) => {
      const d = docs.find((x) => x.id === id)
      if (!vivo || !d) return
      setDoc(d)
      setTitulo(d.titulo)
      setPalabras(d.palabras)
      setSalioDelEspacio(false)
      contenidoRef.current = sanitizarHtml(d.contenido)
      setCargadoId(id)
    })
    const alOcultar = () => {
      if (document.visibilityState === 'hidden') void guardarRef.current()
    }
    document.addEventListener('visibilitychange', alOcultar)
    return () => {
      vivo = false
      document.removeEventListener('visibilitychange', alOcultar)
      window.clearTimeout(timerRef.current)
      window.clearTimeout(timerPintarRef.current)
      mencionesRef.current = new Map()
      borrarPintado()
      void guardarRef.current()
    }
  }, [id])

  // El contenido en la hoja: en privado se monta el HTML de Dexie (una vez por
  // documento); en compartido lo pone Yjs al crear el editor y NUNCA se toca.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    if (!colab) {
      if (!cargado) return
      editor.commands.setContent(contenidoRef.current, { emitUpdate: false })
    }
    // El índice no se recalcula aquí (sería un setState dentro del efecto): lo
    // refrescan el botón del índice y el temporizador del autosave.
    repintarRef.current()
  }, [editor, colab, cargado])

  const editable = cargado && !!editor && (!espacioId || (!!colab && !soloLectura))
  useEffect(() => {
    if (editor && !editor.isDestroyed) editor.setEditable(editable)
  }, [editor, editable])

  // ─── Conexión del documento compartido ───────────────────────────────────
  useEffect(() => {
    if (!espacioId) return
    let vivo = true
    let compartido: DocCompartido | null = null
    const e = abrirEspacio(espacioId, { cursor: 'memoria' })
    espRef.current = e
    const bajas = [
      e.on('borrado', () => {
        if (!vivo) return
        // Vuelve a ser una hoja privada con el texto que hay AHORA en pantalla
        // (el autosave va 1,5 s por detrás y el `Y.Doc` está a punto de morir).
        const ed = editorRef.current
        if (ed && !ed.isDestroyed) contenidoRef.current = sanitizarHtml(ed.getHTML())
        setSalioDelEspacio(true)
        setDoc((d) => (d ? { ...d, espacioId: undefined } : d))
        void documentosRepo.update(id, { espacioId: undefined })
      }),
      e.on('miembros', () => {
        if (vivo) setSoloLectura(!e.puedeEditar())
      }),
    ]
    void (async () => {
      // El motor responde `estado()` tras su primer `releer`: hasta entonces no
      // se sabe ni el rol ni el `miembroId` con el que se pinta mi cursor.
      for (let i = 0; i < 100 && vivo && !e.estado(); i++) await new Promise((r) => setTimeout(r, 100))
      if (!vivo) return
      const usuario = usuarioColab(e)
      compartido = abrirDocYjs(e, usuario)
      await compartido.listo
      if (!vivo) return
      setSoloLectura(!e.puedeEditar())
      setColab({ dc: compartido, usuario })
    })()
    return () => {
      vivo = false
      for (const baja of bajas) baja()
      espRef.current = null
      setColab(null)
      setSoloLectura(false)
      if (compartido) void compartido.cerrar()
      else e.cerrar()
    }
  }, [espacioId, id])

  // El dueño renombró el documento compartido: el nombre local lo sigue.
  useEffect(() => {
    if (!tituloRemoto || tituloRemoto === tituloRef.current) return
    setTitulo(tituloRemoto)
    void documentosRepo.update(id, { titulo: tituloRemoto })
  }, [tituloRemoto, id])

  // El globo de la mención: aparece cuando el caret (colapsado) entra en un nombre marcado.
  useEffect(() => {
    const alCambiar = () => {
      const ed = editorRef.current
      const el = ed && !ed.isDestroyed ? ed.view.dom : null
      const papel = papelRef.current
      const sel = window.getSelection()
      const nodo = sel && sel.rangeCount > 0 && sel.isCollapsed ? sel.anchorNode : null
      const m = el && papel && nodo && el.contains(nodo) ? mencionEn(mencionesRef.current, nodo, sel!.anchorOffset) : null
      if (!m || !papel) {
        setGlobo((g) => (g ? null : g))
        return
      }
      const r = m.rango.getBoundingClientRect()
      const c = papel.getBoundingClientRect()
      const top = Math.round(r.bottom - c.top + papel.scrollTop + 6)
      const left = Math.round(Math.max(0, Math.min(r.left - c.left + papel.scrollLeft, papel.clientWidth - 264)))
      setGlobo((g) => (g && g.docId === id && g.id === m.id && g.top === top && g.left === left ? g : { docId: id, id: m.id, top, left }))
    }
    document.addEventListener('selectionchange', alCambiar)
    return () => document.removeEventListener('selectionchange', alCambiar)
  }, [id])

  // ─── Barra de formato ────────────────────────────────────────────────────
  /** Encadena un comando sobre el editor vivo (el `onUpdate` ya marca sucio). */
  const cmd = (fn: (c: ChainedCommands) => ChainedCommands) => {
    const ed = editorRef.current
    if (!ed || ed.isDestroyed) return
    fn(ed.chain().focus()).run()
  }

  /** El `<select>` de tipo de bloque (párrafo, títulos, cita). */
  const cambiarBloque = (v: string) => {
    if (v === 'p') cmd((c) => c.setParagraph())
    else if (v === 'cita') cmd((c) => c.toggleBlockquote())
    else cmd((c) => c.toggleHeading({ level: Number(v) as 1 | 2 | 3 }))
  }

  // ─── Índice automático ───────────────────────────────────────────────────
  const alternarIndice = () => {
    const ed = editorRef.current
    if (ed && !ed.isDestroyed) setEntradas(extraerIndice(ed.view.dom))
    setPanelIndice((v) => !v)
  }

  const irA = (pos: number) => {
    const ed = editorRef.current
    if (!ed || ed.isDestroyed) return
    irAEncabezado(ed.view.dom, pos)
    // En pantallas chicas el panel flota sobre el papel: se quita al navegar.
    if (!window.matchMedia('(min-width: 768px)').matches) setPanelIndice(false)
  }

  /** Cambia de ficha desde las carpetas (el efecto de carga guarda la actual antes). */
  const irAFicha = (nuevo: number) => {
    setVista('hoja')
    if (nuevo !== id) onIrADoc?.(nuevo)
    if (!window.matchMedia('(min-width: 768px)').matches) setPanelHistoria(false)
  }

  /** «Ver en grande»: el diagrama de relaciones ocupa la hoja. */
  const abrirRelacionesGrande = () => {
    setVista('relaciones')
    if (!window.matchMedia('(min-width: 768px)').matches) setPanelHistoria(false)
  }

  /** «Ver en pequeño en el panel»: vuelve el documento y el diagrama se despliega en su carpeta. */
  const pasarRelacionesAlPanel = () => {
    setVista('hoja')
    setRelacionesEnPanel(true)
    setPanelHistoria(true)
  }

  // Fichas desplegadas en pequeño dentro de la barra. Viven aquí y no en el
  // panel para sobrevivir al cambio de hoja (y al cierre del panel en móvil).
  const [fichasAbiertas, setFichasAbiertas] = useState<Set<number>>(new Set())
  const alternarFicha = (ficha: number) =>
    setFichasAbiertas((prev) => {
      const sig = new Set(prev)
      if (sig.has(ficha)) sig.delete(ficha)
      else sig.add(ficha)
      return sig
    })

  // La hoja anterior: a ella se vuelve al pasar una ficha «a pequeño en la barra».
  const anteriorRef = useRef<number | null>(null)
  useEffect(
    () => () => {
      anteriorRef.current = id
    },
    [id],
  )

  /**
   * «Ver en pequeño en la barra»: la ficha se despliega en el panel y la hoja
   * vuelve al texto anterior (o al más reciente del libro si se entró directo).
   */
  const pasarABarra = () => {
    setFichasAbiertas((prev) => new Set(prev).add(id))
    setPanelHistoria(true)
    const delLibro = (x: Documento) => x.historiaId === historiaId && x.id !== id
    let destino = anteriorRef.current
    if (destino == null || !documentos.some((x) => x.id === destino && delLibro(x))) {
      // `documentos` viene por `actualizadoEn` descendente: el primero es el más reciente.
      destino = documentos.find(delLibro)?.id ?? null
    }
    if (destino != null) onIrADoc?.(destino)
  }

  /** Ctrl/⌘ + clic sobre una mención abre su ficha directo (el clic normal solo mueve el caret). */
  const alClick = (e: React.MouseEvent) => {
    if (!(e.ctrlKey || e.metaKey)) return
    const p = puntoBajo(e.clientX, e.clientY)
    const m = p && mencionEn(mencionesRef.current, p.nodo, p.offset)
    if (m) irAFicha(m.id)
  }

  /** Borra la ficha abierta (un acto arrastra sus tramas) y vuelve a la estantería. */
  const borrarDoc = async () => {
    const tramas = doc?.seccion === 'acto' ? (await documentosRepo.list()).filter((x) => x.actoId === id) : []
    const ok = await confirmar({
      titulo: t('escritura.editor.borrar', 'Borrar este texto'),
      mensaje:
        tramas.length > 0
          ? t('escritura.historias.borrarActoMsg', 'También se borrarán sus {n} tramas.', { n: tramas.length })
          : t('escritura.editor.borrarMsg', 'Se borrará junto con su contenido.'),
      peligro: true,
    })
    if (!ok) return
    // Que el flush del cleanup no reviva lo borrado.
    sucioRef.current = false
    for (const x of tramas) if (x.id != null) await documentosRepo.remove(x.id)
    // Un personaje arrastra sus conexiones del diagrama (con sus notas); borrar
    // solo la nota deja la conexión viva pero sin nota (se re-estrena al abrirla).
    if (doc?.seccion === 'personaje') {
      const suyas = (await relacionesLibroRepo.list()).filter((r) => r.aId === id || r.bId === id)
      for (const r of suyas) {
        if (r.docId != null) await documentosRepo.remove(r.docId)
        if (r.id != null) await relacionesLibroRepo.remove(r.id)
      }
    } else if (doc?.seccion === 'relacion') {
      const dueña = (await relacionesLibroRepo.list()).find((r) => r.docId === id)
      if (dueña?.id != null) await relacionesLibroRepo.update(dueña.id, { docId: undefined })
    }
    await documentosRepo.remove(id)
    alCerrar()
  }

  const cambiarConIndice = (v: boolean) => {
    setDoc((d) => (d ? { ...d, conIndice: v } : d))
    // Sin tocar `actualizadoEn`: una preferencia de impresión no reordena la lista.
    void documentosRepo.update(id, { conIndice: v })
  }

  const insertarIndice = async () => {
    const ed = editorRef.current
    if (!ed || ed.isDestroyed) return
    const ok = await confirmar({
      titulo: t('escritura.indice.insertar', 'Insertar al inicio'),
      mensaje: t(
        'escritura.indice.insertarMsg',
        'El índice se inserta como texto normal: si luego cambias los títulos, no se actualiza solo.',
      ),
    })
    if (!ok) return
    const html = htmlIndice(
      extraerIndice(ed.view.dom),
      t('escritura.indice.encabezado', 'Índice'),
      t('escritura.indice.sinTitulo', '(sin título)'),
    )
    ed.chain().focus('start').insertContent(`${html}<p></p>`).run()
  }

  // ─── IA ──────────────────────────────────────────────────────────────────
  const abrirIA = () => {
    const ed = editorRef.current
    if (ed && !ed.isDestroyed) {
      const { from, to } = ed.state.selection
      rangoRef.current = { from, to }
      seleccionRef.current = from === to ? '' : ed.state.doc.textBetween(from, to, ' ')
    }
    setHaySeleccion(seleccionRef.current.trim().length > 0)
    setErrorIA('')
    setResumen('')
    setPanelIA(true)
  }

  /** Inserta HTML en la selección capturada (o al final del documento). */
  const insertarHtml = (html: string, donde: 'seleccion' | 'final') => {
    const ed = editorRef.current
    if (!ed || ed.isDestroyed) return
    const fin = ed.state.doc.content.size
    const rango = donde === 'seleccion' && rangoRef.current ? rangoRef.current : { from: fin, to: fin }
    ed.chain().focus().insertContentAt(rango, html).run()
  }

  const correrIA = async (accion: AccionIA) => {
    const ed = editorRef.current
    if (!ed || ed.isDestroyed) return
    setErrorIA('')
    setTrabajando(accion)
    try {
      if (accion === 'redactar') {
        const texto = await redactar(instruccion.trim())
        insertarHtml(parrafosHtml(texto), 'final')
        setPanelIA(false)
      } else if (accion === 'mejorar') {
        const texto = await mejorar(seleccionRef.current, instruccion.trim() || undefined)
        insertarHtml(parrafosHtml(texto), 'seleccion')
        setPanelIA(false)
      } else if (accion === 'continuar') {
        const texto = await continuar(ed.getText({ blockSeparator: '\n\n' }))
        insertarHtml(parrafosHtml(texto), 'final')
        setPanelIA(false)
      } else {
        setResumen(await resumir(ed.getText({ blockSeparator: '\n\n' })))
      }
    } catch (e) {
      setErrorIA(e instanceof Error ? e.message : String(e))
    } finally {
      setTrabajando(null)
    }
  }

  // ─── Export ──────────────────────────────────────────────────────────────
  const exportarTxt = () => {
    const ed = editorRef.current
    if (!ed || ed.isDestroyed) return
    void descargarArchivo(new Blob([ed.getText({ blockSeparator: '\n\n' })], { type: 'text/plain' }), `${titulo || 'documento'}.txt`)
  }

  /** «Enviar a un contacto»: el texto actual (saneado) como documento del buzón. */
  const enviarAContacto = async () => {
    const ed = editorRef.current
    if (!ed || ed.isDestroyed) return
    const { empaquetarDocumento } = await import('./compartible')
    useBuzon.getState().abrirCompartir(await empaquetarDocumento({ titulo: titulo || 'Documento', contenido: ed.getHTML() }))
  }

  const exportarPdf = async () => {
    const ed = editorRef.current
    if (!ed || ed.isDestroyed) return
    if (!puedeImprimir()) {
      // Claves de cómputo a propósito: ya están traducidas a los 15 idiomas.
      await confirmar({
        titulo: t('computo.export.sinImprimir', 'Imprimir solo funciona en la web'),
        mensaje: t(
          'computo.export.sinImprimirMsg',
          'En la app de Android no hay diálogo de impresión. Ábrelo desde el navegador para guardarlo en PDF.',
        ),
      })
      return
    }
    let cuerpo = `<h1>${escaparHtml(titulo)}</h1>`
    if (doc?.conIndice) {
      const ent = extraerIndice(ed.view.dom)
      if (ent.length > 0) {
        const rotulo = t('escritura.indice.encabezado', 'Índice')
        cuerpo += `<nav class="doc-indice">${htmlIndice(ent, rotulo, t('escritura.indice.sinTitulo', '(sin título)'))}</nav>`
      }
    }
    await imprimir(cuerpo + sanitizarHtml(ed.getHTML()), titulo || 'documento', ESTILO_DOC)
  }

  /** «Compartir»: crea el espacio con el texto de ahora y abre el panel. */
  const compartir = async () => {
    const ed = editorRef.current
    if (!ed || ed.isDestroyed) return
    await guardarRef.current()
    const nuevo = await compartirDocumento(id, ed)
    setDoc((d) => (d ? { ...d, espacioId: nuevo } : d))
    setSalioDelEspacio(false)
    useEspaciosStore.getState().abrirCompartir(nuevo)
  }

  const carpetasAbiertas = panelHistoria && doc?.historiaId != null && onIrADoc != null
  const anchoMax =
    panelIndice && carpetasAbiertas ? 'max-w-6xl' : panelIndice || carpetasAbiertas ? 'max-w-5xl' : 'max-w-3xl'
  const conectando = !!espacioId && !colab

  return (
    <div className={`mx-auto flex h-full w-full ${anchoMax} flex-col gap-2`}>
      {vista === 'relaciones' ? (
        // El diagrama en grande: solo volver y (en móvil) las carpetas
        <div className="flex shrink-0 items-center gap-2">
          <BotonSecundario pequeno onClick={alCerrar} aria-label={t('escritura.libros.volver', 'Volver a los libros')}>
            <Icono nombre="volver" /> {t('escritura.libros.volver', 'Volver a los libros')}
          </BotonSecundario>
          <span className="flex-1" />
          {doc?.historiaId != null && onIrADoc && (
            <BotonBarra
              icono="carpeta"
              etiqueta={t('escritura.historias.boton', 'Carpetas de la historia')}
              onUsar={() => setPanelHistoria((v) => !v)}
            />
          )}
        </div>
      ) : (
        <>
      {/* Cabecera: volver + título + contador */}
      <div className="flex shrink-0 items-center gap-2">
        <BotonSecundario pequeno onClick={alCerrar} aria-label={t('escritura.libros.volver', 'Volver a los libros')}>
          <Icono nombre="volver" /> {t('escritura.libros.volver', 'Volver a los libros')}
        </BotonSecundario>
        <input
          value={titulo}
          onChange={(e) => {
            setTitulo(e.target.value)
            tituloSucioRef.current = true
            alInput()
          }}
          placeholder={t('escritura.editor.tituloPh', 'Título del documento')}
          className={`${INPUT} flex-1 font-semibold`}
        />
        <span className="shrink-0 text-xs text-white/45">
          {t('escritura.lista.palabras', '{n} palabras', { n: palabras })}
          {palabras > 0 && <> · {t('escritura.editor.paginas', '~{n} págs.', { n: Math.ceil(palabras / 300) })}</>}
        </span>
        <button
          type="button"
          onClick={() => void borrarDoc()}
          aria-label={t('escritura.editor.borrar', 'Borrar este texto')}
          title={t('escritura.editor.borrar', 'Borrar este texto')}
          className="shrink-0 rounded-lg px-2 py-1 text-white/40 transition hover:bg-white/10 hover:text-red-400"
        >
          <Icono nombre="basura" />
        </button>
      </div>

      {/* Barra de herramientas */}
      <div className="flex shrink-0 flex-wrap items-center gap-0.5 rounded-xl border border-white/10 bg-white/5 px-1.5 py-1">
        <BotonBarra
          icono="deshacer"
          etiqueta={t('escritura.editor.deshacer', 'Deshacer')}
          onUsar={() => cmd((c) => c.undo())}
        />
        <BotonBarra
          icono="rehacer"
          etiqueta={t('escritura.editor.rehacer', 'Rehacer')}
          onUsar={() => cmd((c) => c.redo())}
        />
        <span className="mx-1 h-5 w-px bg-white/10" />
        <select
          aria-label={t('escritura.editor.bloque', 'Tipo de bloque')}
          onChange={(e) => {
            cambiarBloque(e.target.value)
            e.target.value = ''
          }}
          value=""
          className="rounded-lg border border-white/10 bg-black/30 px-1.5 py-1 text-xs outline-none"
        >
          <option value="" disabled>
            {t('escritura.editor.bloque', 'Tipo de bloque')}
          </option>
          <option value="p">{t('escritura.editor.parrafo', 'Párrafo')}</option>
          <option value="1">{t('escritura.editor.titulo1', 'Título 1')}</option>
          <option value="2">{t('escritura.editor.titulo2', 'Título 2')}</option>
          <option value="3">{t('escritura.editor.titulo3', 'Título 3')}</option>
          <option value="cita">{t('escritura.editor.cita', 'Cita')}</option>
        </select>
        <span className="mx-1 h-5 w-px bg-white/10" />
        <BotonBarra
          icono="negrita"
          etiqueta={t('escritura.editor.negrita', 'Negrita')}
          onUsar={() => cmd((c) => c.toggleBold())}
        />
        <BotonBarra
          icono="cursiva"
          etiqueta={t('escritura.editor.cursiva', 'Cursiva')}
          onUsar={() => cmd((c) => c.toggleItalic())}
        />
        <BotonBarra
          icono="subrayado"
          etiqueta={t('escritura.editor.subrayado', 'Subrayado')}
          onUsar={() => cmd((c) => c.toggleUnderline())}
        />
        <BotonBarra
          icono="tachado"
          etiqueta={t('escritura.editor.tachado', 'Tachado')}
          onUsar={() => cmd((c) => c.toggleStrike())}
        />
        <span className="mx-1 h-5 w-px bg-white/10" />
        <BotonBarra
          icono="lista"
          etiqueta={t('escritura.editor.lista', 'Lista con viñetas')}
          onUsar={() => cmd((c) => c.toggleBulletList())}
        />
        <BotonBarra
          icono="lista-num"
          etiqueta={t('escritura.editor.listaNum', 'Lista numerada')}
          onUsar={() => cmd((c) => c.toggleOrderedList())}
        />
        <span className="mx-1 h-5 w-px bg-white/10" />
        <BotonBarra
          icono="alinearIzq"
          etiqueta={t('escritura.editor.alinearIzq', 'Alinear a la izquierda')}
          onUsar={() => cmd((c) => c.setTextAlign('left'))}
        />
        <BotonBarra
          icono="alinearCentro"
          etiqueta={t('escritura.editor.alinearCentro', 'Centrar')}
          onUsar={() => cmd((c) => c.setTextAlign('center'))}
        />
        <BotonBarra
          icono="alinearDer"
          etiqueta={t('escritura.editor.alinearDer', 'Alinear a la derecha')}
          onUsar={() => cmd((c) => c.setTextAlign('right'))}
        />
        <span className="mx-1 h-5 w-px bg-white/10" />
        {/* Paleta de color de texto, en línea (12 puntos; el primero quita el color) */}
        <span className="flex items-center gap-0.5 px-1" aria-label={t('escritura.editor.color', 'Color del texto')}>
          {PALETA_TEXTO.map((c, i) => (
            <button
              key={c}
              type="button"
              aria-label={t('escritura.editor.color', 'Color del texto')}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => cmd((ch) => (i === 0 ? ch.unsetColor() : ch.setColor(c)))}
              className="h-4 w-4 rounded-full border border-white/20 transition hover:scale-125"
              style={{ background: c }}
            />
          ))}
        </span>
        <span className="mx-1 h-5 w-px bg-white/10" />
        {doc?.historiaId != null && onIrADoc && (
          <BotonBarra
            icono="carpeta"
            etiqueta={t('escritura.historias.boton', 'Carpetas de la historia')}
            onUsar={() => setPanelHistoria((v) => !v)}
          />
        )}
        <BotonBarra icono="indice" etiqueta={t('escritura.indice.boton', 'Índice del documento')} onUsar={alternarIndice} />
        <BotonBarra icono="descargar" etiqueta={t('escritura.export.txt', 'Descargar TXT')} onUsar={exportarTxt} />
        <BotonBarra icono="buzon" etiqueta={t('buzon.enviarA', 'Enviar a un contacto')} onUsar={() => void enviarAContacto()} />
        <BotonBarra
          icono="imprimir"
          etiqueta={t('escritura.export.pdf', 'Imprimir o guardar en PDF')}
          onUsar={() => void exportarPdf()}
        />
        <span className="mx-1 h-5 w-px bg-white/10" />
        {espacioId && (
          <ChipMiembros espacioId={espacioId} onClick={() => useEspaciosStore.getState().abrirCompartir(espacioId)} />
        )}
        <BotonCompartir espacioId={espacioId} onCompartir={compartir} pequeno />
        <span className="flex-1" />
        <BotonPrimario type="button" pequeno app={COLOR} onPointerDown={(e) => e.preventDefault()} onClick={abrirIA}>
          <Icono nombre="brillo" /> {t('escritura.ia.boton', 'IA')}
        </BotonPrimario>
      </div>
        </>
      )}

      {grande && (
        <p className="shrink-0 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs text-amber-300">
          {t('escritura.editor.grande', 'El documento es demasiado grande y no se está guardando: recórtalo un poco.')}
        </p>
      )}
      {conectando && (
        <p className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60">
          {t('esp.doc.conectando', 'Conectando con el documento compartido…')}
        </p>
      )}
      {!conectando && soloLectura && (
        <p className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60">
          {t('esp.doc.soloLectura', 'Solo puedes leer este documento: quien lo comparte no te dio permiso de editarlo.')}
        </p>
      )}
      {!conectando && !conectado && (
        <p className="shrink-0 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs text-amber-300">
          {t('esp.doc.sinConexion', 'Sin conexión: lo que escribas se enviará cuando vuelva.')}
        </p>
      )}
      {salioDelEspacio && (
        <p className="shrink-0 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs text-amber-300">
          {t('esp.doc.fuera', 'Ya no se comparte: esta hoja vuelve a ser solo tuya.')}
        </p>
      )}

      {/* El documento (+ carpetas de la historia e índice, overlays en chico y columnas en md+) */}
      <div className="relative flex min-h-0 flex-1 gap-2">
        {carpetasAbiertas && (
          <PanelHistoria
            historiaId={doc!.historiaId!}
            docId={id}
            onIr={irAFicha}
            onCerrar={() => setPanelHistoria(false)}
            relacionesEnPanel={relacionesEnPanel}
            relacionesEnHoja={vista === 'relaciones'}
            onAlternarRelaciones={() => setRelacionesEnPanel((v) => !v)}
            onRelacionesGrande={abrirRelacionesGrande}
            abiertas={fichasAbiertas}
            onAlternarFicha={alternarFicha}
          />
        )}
        {vista === 'relaciones' && historiaId != null && (
          <div className="min-h-0 flex-1">
            <DiagramaRelaciones historiaId={historiaId} onAbrirDoc={irAFicha} onPequeno={pasarRelacionesAlPanel} />
          </div>
        )}
        {/* Oculto (no desmontado) mientras el diagrama ocupa la hoja: el editor sigue vivo */}
        <div
          ref={papelRef}
          hidden={vista !== 'hoja'}
          className="relative flex min-h-0 flex-1 flex-col overflow-y-auto rounded-xl border border-white/10 bg-black/20"
        >
          {/* Una ficha lleva arriba su imagen, descripción y color de menciones */}
          {docVivo && esTipoRef(docVivo.seccion) && (
            <CabeceraFicha
              key={docVivo.id}
              doc={docVivo}
              tipo={docVivo.seccion}
              historia={historia}
              onPequeno={historiaId != null && onIrADoc ? pasarABarra : undefined}
            />
          )}
          <EditorContent editor={editor} onClick={alClick} className="flex min-h-0 flex-1 flex-col" />
          {fichaGlobo && globo && (
            <GloboReferencia ficha={fichaGlobo} top={globo.top} left={globo.left} onAbrir={() => irAFicha(globo.id)} />
          )}
        </div>
        {/* El color de cada ficha en su capa de menciones (solo hex, ver menciones.ts) */}
        {fichas.length > 0 && <style>{cssMenciones(fichas)}</style>}
        {panelIndice && vista === 'hoja' && (
          <IndiceDocumento
            entradas={entradas}
            onIr={irA}
            onCerrar={() => setPanelIndice(false)}
            incluirPdf={doc?.conIndice ?? false}
            onIncluirPdf={cambiarConIndice}
            onInsertar={() => void insertarIndice()}
          />
        )}
      </div>

      {panelIA && (
        <Modal titulo={t('escritura.ia.titulo', 'Escribir con IA')} onCerrar={() => setPanelIA(false)}>
          {resumen ? (
            <div className="space-y-3">
              <p className="max-h-60 overflow-y-auto whitespace-pre-wrap rounded-lg bg-black/25 p-3 text-sm text-white/85">
                {resumen}
              </p>
              <div className="flex justify-end gap-2">
                <BotonSecundario pequeno onClick={() => void navigator.clipboard?.writeText(resumen)}>
                  <Icono nombre="duplicar" /> {t('escritura.ia.copiar', 'Copiar')}
                </BotonSecundario>
                <BotonPrimario
                  type="button"
                  pequeno
                  app={COLOR}
                  onClick={() => {
                    insertarHtml(parrafosHtml(resumen), 'final')
                    setPanelIA(false)
                  }}
                >
                  {t('escritura.ia.insertar', 'Insertar al final')}
                </BotonPrimario>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Campo etiqueta={t('escritura.ia.instruccion', 'Qué quieres (para redactar o mejorar)')}>
                <textarea
                  value={instruccion}
                  onChange={(e) => setInstruccion(e.target.value)}
                  rows={3}
                  placeholder={t('escritura.ia.instruccionPh', 'Una carta para… / un ensayo sobre…')}
                  className={INPUT}
                />
              </Campo>
              {errorIA && <p className="text-xs text-red-400">{errorIA}</p>}
              <div className="grid grid-cols-2 gap-2">
                <BotonSecundario
                  disabled={trabajando != null || !instruccion.trim()}
                  onClick={() => void correrIA('redactar')}
                >
                  {trabajando === 'redactar' ? <Spinner pequeno /> : <Icono nombre="brillo" />}{' '}
                  {t('escritura.ia.redactar', 'Redactar')} <Creditos op={OP_REDACTAR} />
                </BotonSecundario>
                <BotonSecundario disabled={trabajando != null || !haySeleccion} onClick={() => void correrIA('mejorar')}>
                  {trabajando === 'mejorar' ? <Spinner pequeno /> : <Icono nombre="editar" />}{' '}
                  {t('escritura.ia.mejorar', 'Mejorar selección')} <Creditos op={OP_MEJORAR} />
                </BotonSecundario>
                <BotonSecundario disabled={trabajando != null} onClick={() => void correrIA('continuar')}>
                  {trabajando === 'continuar' ? <Spinner pequeno /> : <Icono nombre="siguiente" />}{' '}
                  {t('escritura.ia.continuar', 'Continuar el texto')} <Creditos op={OP_CONTINUAR} />
                </BotonSecundario>
                <BotonSecundario disabled={trabajando != null} onClick={() => void correrIA('resumir')}>
                  {trabajando === 'resumir' ? <Spinner pequeno /> : <Icono nombre="lista" />}{' '}
                  {t('escritura.ia.resumir', 'Resumir')} <Creditos op={OP_RESUMIR} />
                </BotonSecundario>
              </div>
              {!haySeleccion && (
                <p className="text-xs text-white/40">
                  {t('escritura.ia.sinSeleccion', 'Para «mejorar», selecciona antes el texto en el documento.')}
                </p>
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}

interface UsuarioColab {
  name: string
  color: string
}

/** Cómo me ven los demás en el documento compartido: mi alias y mi color. */
function usuarioColab(esp: EspacioAbierto): UsuarioColab {
  const yo = esp.miembros().find((m) => m.yo)
  return {
    name: yo?.alias || yo?.nombre || tGlobal('esp.panel.tu', 'Tú'),
    color: colorDeMiembro(esp.estado()?.yo ?? ''),
  }
}
