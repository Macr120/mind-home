import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ClipPrincipal, ClipVideo, FuenteSonido, MedioVideo, NarradorVideo, PistaId } from '../../core/data/db'
import { mediosVideoRepo, proyectosVideoRepo, VACIO } from '../../core/data/repository'
import { descargarArchivo } from '../../core/descargarArchivo'
import {
  detenerGrabacionPantalla,
  iniciarGrabacionPantalla,
  tomarResultadoGrabacion,
  useGrabacionPantalla,
} from '../../core/grabacionPantalla'
import { useT } from '../../core/i18n/useT'
import type { Plataforma } from '../../core/redes/tipos'
import { useAsistentes } from '../../core/state/asistentesStore'
import { capturarCamara } from '../../core/state/cameraStore'
import { useChatArUi } from '../../core/state/chatArUiStore'
import { confirmar } from '../../core/state/confirmarStore'
import { useHud } from '../../core/state/hudStore'
import { useMascaraUi } from '../../core/state/mascaraUiStore'
import { ES_JUGADOR, peliculaFrame, registrarEjecutorColocar, usePelicula } from '../../core/state/peliculaStore'
import { playerPos } from '../../core/state/playerPosition'
import { Creditos } from '../../core/ui/Creditos'
import { Icono } from '../../core/ui/iconos/Icono'
import { BotonPrimario, BotonSecundario, Campo, INPUT, Modal, Spinner } from '../_shared/ui'
import { esActorEscena, puntoActor } from './actores'
import { AvatarLienzo } from './AvatarLienzo'
import { BarraHerramientas } from './BarraHerramientas'
import {
  clipLibreDe,
  clipPersonaje,
  clipPlano,
  clipPrincipalDe,
  clipVozDeTexto,
  duracionPorDefecto,
  indicePrincipalEn,
  pistaPorDefecto,
  pistasQueAceptan,
  type ItemArrastre,
  type MedioConId,
} from './clipsNuevos'
import {
  ALTO_PELICULA_FRACCION,
  AVISO_DURACION_EXPORT,
  COLOR,
  DUR_DEFECTO,
  LS_ALTO_PELICULA,
  LS_PANEL_CLIP,
  LS_PANEL_MEDIOS,
  MAX_CLIPS,
  MAX_CLIPS_PRINCIPAL,
  MAX_NARRADORES,
  MEDIA_ANCHO_SM,
  MEDIA_LATERALES_ANCHOS,
  MIN_CLIP,
  nuevoClipId,
  RESOLUCIONES,
  TAMANOS_AVATAR,
} from './constantes'
import { OP_GUION, OP_TITULOS } from './costosIA'
import { capturarEscena3d, exportarVideo, firmaExport, mimeExport, type ExportListo } from './exportar'
import { crearPool, type PoolFuentes } from './fuentes'
import { GrabarMedioModal, type TipoGrabacion } from './GrabarMedio'
import { Guion } from './Guion'
import { generarGuion, mejorarTitulos } from './ia'
import { completarGrabacion } from './importar'
import { ListaSonidos } from './ListaSonidos'
import { MediosPanel } from './MediosPanel'
import { MenuAnadir, type OpcionAnadir } from './MenuAnadir'
import {
  actoresDe,
  asignarNarrador,
  clipsDe,
  colocarEnHueco,
  dividirClip,
  duplicarClip,
  duracionTotal,
  fin,
  finPrincipal,
  insertarPrincipal,
  lineasNarracion,
  medioIdDe,
  migrarProyecto,
  moverClip,
  moverPrincipalEnOrden,
  narradorDe,
  normalizar,
  permiteSolape,
  recortarClip,
  reordenarPrincipal,
  sinNarrador,
  vozEfectiva,
  type ProyectoAbierto,
} from './modelo'
import { MotorVideo } from './motor'
import { envolventeDe, generarAudioNarracion } from './narracion'
import { nombreNarrador, nuevoNarrador, reproducirLineas } from './narradores'
import { PanelClip, tituloPista } from './PanelClip'
import { PanelLateral } from './PanelLateral'
import { PanelMedios, type TabMedios } from './PanelMedios'
import { PeliculaEncuadre, resolucionPantalla } from './PeliculaEncuadre'
import { MenuExportar } from './publicar/MenuExportar'
import { PublicarDialog } from './publicar/PublicarDialog'
import { traerRecurso } from './traerRecurso'
import { BotonVisor, Preview } from './Preview'
import type { RenderizadorAvatar } from './render'
import { sonidoFabrica } from './sonidos'
import { generarSubtitulos } from './subtitulos'
import { fmtSeg, TimelinePistas, type TimelineHandle } from './TimelinePistas'
import { useAltoPreview } from './useAltoPreview'
import { useAmplio, useMediaQuery } from './useAmplio'
import { useArrastreMedio } from './useArrastreMedio'
import type { LadoAsa } from './useGestosClips'
import { usePreferenciaPanel } from './usePreferenciaPanel'
import { LineasGuion, PanelNarradores } from './VocesGuion'

const fmtTotal = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`

/**
 * El editor de un proyecto, estilo CapCut: visor con alto ajustable, barra de
 * herramientas, timeline multipista y panel del clip (hoja en móvil, columna
 * en pantallas amplias). Todo muta por `mutar` y el motor lee la referencia
 * nueva; el tiempo corre imperativo (refs), nunca con setState por frame.
 *
 * `pelicula` (animación 3D, ver `peliculaStore`): el mismo editor como dock
 * sobre el mapa. La zona del visor es transparente (se ve y se maneja la casa;
 * el encuadre pinta encima textos e imágenes), los laterales son cajones, el
 * reloj y el proyecto se publican en `peliculaFrame` para el Director 3D, y el
 * export captura la escena viva.
 */
export function Editor({ id, alCerrar, pelicula = false }: { id: number; alCerrar: () => void; pelicula?: boolean }) {
  const t = useT()
  const [proyecto, setProyecto] = useState<ProyectoAbierto | null>(null)
  const mediosCargados = mediosVideoRepo.useAll()
  const medios = mediosCargados ?? (VACIO as MedioVideo[])
  const hayMedios = mediosCargados !== undefined
  const asistentes = useAsistentes((s) => s.lista)
  const [seleccion, setSeleccionEstado] = useState<string | null>(null)
  const [reproduciendo, setReproduciendo] = useState(false)
  const [panelIA, setPanelIA] = useState(false)
  const [iaTexto, setIaTexto] = useState('')
  const [iaOcupado, setIaOcupado] = useState(false)
  const [iaError, setIaError] = useState('')
  const [selector, setSelector] = useState<{ tipos: MedioVideo['tipo'][]; alElegir: (m: MedioVideo) => void } | null>(null)
  const [listaSonidos, setListaSonidos] = useState<{ alElegir: (f: FuenteSonido) => void } | null>(null)
  const [progresoExport, setProgresoExport] = useState<number | null>(null)
  // Modo película: cuenta regresiva (3, 2, 1) sobre el mapa antes de rodar la toma.
  const [cuenta, setCuenta] = useState<number | null>(null)
  const cuentaTimer = useRef(0)
  useEffect(() => () => window.clearInterval(cuentaTimer.current), [])
  // Grabación de la app en curso (si el usuario reabrió el Studio con ella andando) y la toma que espera a este proyecto.
  const grabando = useGrabacionPantalla((s) => s.estado !== 'inactivo')
  const resultadoGrabacion = useGrabacionPantalla((s) => s.resultado)
  const [menuAnadir, setMenuAnadir] = useState(false)
  /** Grabar con la cámara o el micrófono del equipo desde «Añadir»: la toma entra en el cursor. */
  const [grabarMedio, setGrabarMedio] = useState<TipoGrabacion | null>(null)
  const [menuExportar, setMenuExportar] = useState(false)
  const [publicando, setPublicando] = useState<{ plataforma: Plataforma; poster: string | null } | null>(null)
  const [pantallaCompleta, setPantallaCompleta] = useState(false)
  const [iman, setIman] = useState(true)
  const [tabPanel, setTabPanel] = useState<'clip' | 'guion'>('guion')
  const [tabMedios, setTabMedios] = useState<TabMedios>('medios')
  // Laterales: columnas plegables (preferencia recordada) en pantallas anchas; cajones (estado transitorio) en móvil.
  // En el modo película siempre cajones: una columna taparía el mapa.
  const amplio = useAmplio() && !pelicula
  // Modo película: se graba la pantalla entera, así que la composición toma el tamaño del lienzo
  // de la casa (lo publica `PeliculaEncuadre`); la timeline vive en el hueco del chat, entre el
  // joystick y los controles de vista, y en pantallas angostas encima de ellos (topes del HUD).
  const [firmaPantalla, setFirmaPantalla] = useState('')
  const onMedidaPantalla = useCallback((w: number, h: number) => setFirmaPantalla(`${w}x${h}`), [])
  const tamPantalla = useMemo(() => {
    const [w, h] = firmaPantalla.split('x').map(Number)
    return w > 0 && h > 0 ? { w, h } : null
  }, [firmaPantalla])
  const angosto = !useMediaQuery(MEDIA_ANCHO_SM)
  const topes = useHud((s) => s.topes)
  // El chat va debajo de la timeline: el dock se apoya en su tope (como la caja del diálogo RPG).
  const topeChat = topes.chat ?? 0
  const topeInferior = Math.max(topeChat, topes.joystick ?? 0, topes.herramientas ?? 0, topes.navegacion ?? 0)
  const fondoDock = pelicula ? Math.max(8, (angosto ? topeInferior : topeChat) + 8) : 8
  const [mediosAbierto, setMediosAbierto] = usePreferenciaPanel(LS_PANEL_MEDIOS, () => window.matchMedia(MEDIA_LATERALES_ANCHOS).matches)
  const [clipAbierto, setClipAbierto] = usePreferenciaPanel(LS_PANEL_CLIP, () => true)
  const [cajon, setCajon] = useState<'medios' | 'clip' | null>(null)
  // Arrastre desde el panel de medios: pistas vacías que se ofrecen («Suelta aquí») y cajón invisible mientras dura.
  const [pistasExtra, setPistasExtra] = useState<PistaId[]>([])
  const [arrastrando, setArrastrando] = useState(false)
  const [puedeDividir, setPuedeDividir] = useState(false)
  const [aviso, setAviso] = useState('')
  const [narrandoId, setNarrandoId] = useState<string | null>(null)
  // «Escuchar el guion»: la línea que suena y cómo pararla.
  const [lineaSonando, setLineaSonando] = useState<string | null>(null)
  const pararLecturaRef = useRef<(() => void) | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  // El último archivo exportado y su firma: se reutiliza si el proyecto no cambió (muere con el Editor).
  const ultimoExportRef = useRef<ExportListo | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const cuerpoRef = useRef<HTMLDivElement>(null)
  const etiquetaRef = useRef<HTMLSpanElement>(null)
  const motorRef = useRef<MotorVideo | null>(null)
  const poolRef = useRef<PoolFuentes | null>(null)
  const timelineRef = useRef<TimelineHandle>(null)
  const avatarRef = useRef<RenderizadorAvatar | null>(null)
  const tiempoRef = useRef(0)
  const oyentesTiempo = useRef(new Set<(seg: number) => void>())
  const proyectoRef = useRef<ProyectoAbierto | null>(null)
  const mediosRef = useRef(medios)
  const seleccionRef = useRef<string | null>(null)
  const puedeDividirRef = useRef(false)
  const avisoTimer = useRef(0)
  // Modo película: mientras se rueda, el reloj del Director es el del motor de export, no el del preview.
  const exportandoRef = useRef(false)
  // Refs "de lo último": se sincronizan tras cada render, nunca durante (regla react-hooks/refs).
  useEffect(() => {
    proyectoRef.current = proyecto
    mediosRef.current = medios
    seleccionRef.current = seleccion
  })

  const { alto, colapsado, props: propsDivisor, altoMax } = useAltoPreview(
    cuerpoRef,
    previewRef,
    proyecto != null,
    pelicula ? { clave: LS_ALTO_PELICULA, fraccion: ALTO_PELICULA_FRACCION } : undefined,
  )

  const mostrarAviso = (texto: string) => {
    setAviso(texto)
    window.clearTimeout(avisoTimer.current)
    avisoTimer.current = window.setTimeout(() => setAviso(''), 3000)
  }

  /** El clip que partiría la tijera en `seg`: el seleccionado si lo contiene; si no, el principal. */
  const clipParaDividir = (seg: number): ClipVideo | null => {
    const clips = proyectoRef.current?.clips ?? []
    const dentro = (c: ClipVideo) => c.inicio + MIN_CLIP <= seg && seg <= fin(c) - MIN_CLIP
    const sel = clips.find((c) => c.id === seleccionRef.current)
    if (sel && dentro(sel)) return sel
    return clipsDe(clips, 'video').find(dentro) ?? null
  }

  const notificarTiempo = (seg: number) => {
    tiempoRef.current = seg
    if (pelicula && !exportandoRef.current) peliculaFrame.t = seg
    const total = duracionTotal(proyectoRef.current?.clips ?? [])
    if (etiquetaRef.current) etiquetaRef.current.textContent = `${fmtSeg(seg)} / ${fmtTotal(total)}`
    for (const fn of oyentesTiempo.current) fn(seg)
    const puede = !!clipParaDividir(seg)
    if (puede !== puedeDividirRef.current) {
      puedeDividirRef.current = puede
      setPuedeDividir(puede)
    }
  }
  const registrarTiempo = useCallback((fn: (seg: number) => void) => {
    oyentesTiempo.current.add(fn)
    fn(tiempoRef.current)
    return () => {
      oyentesTiempo.current.delete(fn)
    }
  }, [])
  // El total del contador depende de las duraciones: se refresca tras cada commit y no en
  // `mutar` (el actualizador de setState puede correr más tarde y dejaría el total viejo).
  useEffect(() => {
    notificarTiempo(tiempoRef.current)
  })

  // ─── Guardado ────────────────────────────────────────────────────────────
  const sucio = useRef(false)
  const timer = useRef(0)
  // Solo lee refs: es estable y no necesita el patrón de "última versión".
  const guardarRef = useRef(async () => {
    const p = proyectoRef.current
    if (!sucio.current || !p) return
    sucio.current = false
    await proyectosVideoRepo.update(id, {
      nombre: p.nombre,
      aspecto: p.aspecto,
      clips: p.clips,
      pistasSilenciadas: p.pistasSilenciadas,
      volumenPistas: p.volumenPistas,
      vozNarrador: p.vozNarrador,
      narradores: p.narradores,
      escenas: [],
      musica: undefined,
      // La sella `mutar` en memoria (es la firma del último export): aquí solo se persiste.
      actualizadoEn: p.actualizadoEn,
    })
  })
  const programarGuardado = () => {
    sucio.current = true
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => void guardarRef.current(), 600)
  }

  // Síncrono y sobre la ref, no un actualizador de setState (React puede correrlo más tarde):
  // quien muta y acto seguido hace `seek` o lee `proyectoRef` necesita el proyecto nuevo YA, y el motor también.
  const mutar = (fn: (p: ProyectoAbierto) => ProyectoAbierto) => {
    const prev = proyectoRef.current
    if (!prev) return
    const nuevo = { ...fn(prev), actualizadoEn: new Date().toISOString() }
    proyectoRef.current = nuevo
    if (pelicula) peliculaFrame.proyecto = nuevo
    motorRef.current?.fijarProyecto(nuevo)
    setProyecto(nuevo)
    programarGuardado()
  }
  const mutarClips = (fn: (clips: ClipVideo[]) => ClipVideo[]) => mutar((p) => ({ ...p, clips: fn(p.clips) }))
  const cambiarClip = (clipId: string, patch: Partial<ClipVideo>) =>
    mutarClips((clips) => normalizar(clips.map((c) => (c.id === clipId ? ({ ...c, ...patch } as ClipVideo) : c))))

  // Carga única (cuando los medios ya están: la migración necesita sus duraciones) + flush al salir.
  useEffect(() => {
    if (!hayMedios) return
    let vivo = true
    const guardar = guardarRef.current // estable: se inicializa una sola vez
    void proyectosVideoRepo.list().then((filas) => {
      const p = filas.find((x) => x.id === id)
      if (!vivo || !p) return
      const lista = mediosRef.current
      const { proyecto: abierto, cambiado } = migrarProyecto(p, (mid) => lista.find((m) => m.id === mid)?.duracion)
      proyectoRef.current = abierto
      if (pelicula) peliculaFrame.proyecto = abierto
      setProyecto(abierto)
      if (cambiado) programarGuardado()
      // Una animación 3D recién creada estrena su primer plano con la cámara actual: sin clips no hay nada que reproducir.
      if (pelicula && abierto.clips.length === 0) mutarClips((clips) => insertarPrincipal(clips, clipPlano(capturarCamara()), 0))
    })
    const alOcultar = () => {
      if (document.visibilityState === 'hidden') void guardar()
    }
    document.addEventListener('visibilitychange', alOcultar)
    return () => {
      vivo = false
      document.removeEventListener('visibilitychange', alOcultar)
      window.clearTimeout(timer.current)
      void guardar()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- carga única por proyecto y medios; `mutarClips` y `pelicula` solo se usan al cargar
  }, [id, hayMedios])

  // Motor + pool: nacen y mueren juntos; se rehacen si cambian los medios o el
  // aspecto (el canvas cambia de resolución). Patrón VistaBlob para StrictMode.
  const firmaMedios = medios.map((m) => m.id).join(',')
  const cargado = proyecto != null
  const aspecto = proyecto?.aspecto ?? '16:9'
  // El lienzo de la composición: 720p por aspecto o, en el modo película, la pantalla (encuadres del PIP y avatar incluidos).
  const lienzo = useMemo(
    () => (pelicula && tamPantalla ? resolucionPantalla(tamPantalla.w, tamPantalla.h) : RESOLUCIONES[aspecto]),
    [pelicula, tamPantalla, aspecto],
  )
  // Modo película: la resolución sigue a la pantalla (rehace el motor si el lienzo cambia de tamaño).
  const firmaResolucion = pelicula ? firmaPantalla : ''
  useEffect(() => {
    const canvas = canvasRef.current
    const p = proyectoRef.current
    if (!canvas || !p) return
    const { ancho, alto: altoLienzo } = lienzo
    canvas.width = ancho
    canvas.height = altoLienzo
    const pool = crearPool(medios)
    const motor = new MotorVideo(canvas, p, pool, medios, { avatar: avatarRef.current, vozEnVivo: true, transparente: pelicula })
    motor.onTiempo = notificarTiempo
    motor.onFin = () => setReproduciendo(false)
    poolRef.current = pool
    motorRef.current = motor
    motor.seek(tiempoRef.current)
    return () => {
      motor.destruir()
      pool.dispose()
      motorRef.current = null
      poolRef.current = null
      setReproduciendo(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- se rehace por carga, firma de medios, aspecto y tamaño de pantalla
  }, [cargado, firmaMedios, aspecto, firmaResolucion])

  // El lienzo 3D del avatar solo existe si el proyecto tiene clips de avatar PIP (los actores viven en la casa).
  const firmaAvatar = proyecto
    ? Array.from(
        new Set(
          clipsDe(proyecto.clips, 'avatar')
            .filter((c) => c.modo !== 'escena')
            .map((c) => c.asistenteId),
        ),
      )
        .sort()
        .join(',')
    : ''
  const idsAvatar = useMemo(() => (firmaAvatar ? firmaAvatar.split(',') : []), [firmaAvatar])
  const ladoAvatar = Math.ceil(lienzo.alto * TAMANOS_AVATAR.L)
  const onListoAvatar = useCallback((r: RenderizadorAvatar | null) => {
    avatarRef.current = r
    motorRef.current?.fijarAvatar(r)
  }, [])

  // ─── Modo película ───────────────────────────────────────────────────────
  // El estado por frame que lee el Director 3D nace y muere con el editor; y tocar el
  // mapa coloca al actor del clip seleccionado (se lee por refs: se registra una vez).
  useEffect(() => {
    if (!pelicula) return
    peliculaFrame.activo = true
    peliculaFrame.t = tiempoRef.current
    peliculaFrame.proyecto = proyectoRef.current
    registrarEjecutorColocar((x, z) => {
      const sel = proyectoRef.current?.clips.find((c) => c.id === seleccionRef.current)
      if (esActorEscena(sel)) cambiarClip(sel.id, { escena: { ...sel.escena, x, z } })
    })
    return () => {
      registrarEjecutorColocar(null)
      peliculaFrame.activo = false
      peliculaFrame.reproduciendo = false
      peliculaFrame.proyecto = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo lee refs
  }, [pelicula])
  useEffect(() => {
    if (pelicula) peliculaFrame.reproduciendo = reproduciendo
  }, [pelicula, reproduciendo])
  // Los asistentes que actúan: la casa los monta aunque no estén en el mapa.
  const firmaActores = pelicula && proyecto ? actoresDe(proyecto).join(',') : ''
  useEffect(() => {
    if (pelicula) usePelicula.getState().setActores(firmaActores ? firmaActores.split(',') : [])
  }, [pelicula, firmaActores])
  // Con un actor seleccionado, tocar el mapa lo coloca; el anillo marca su punto.
  const clipSelPelicula = pelicula ? (proyecto?.clips.find((c) => c.id === seleccion) ?? null) : null
  const actorSel = esActorEscena(clipSelPelicula) ? clipSelPelicula : null
  const marcadorX = actorSel?.escena.x
  const marcadorZ = actorSel?.escena.z
  useEffect(() => {
    if (!pelicula) return
    const hay = marcadorX != null && marcadorZ != null
    usePelicula.getState().setColocando(hay, hay ? { x: marcadorX, z: marcadorZ } : null)
    return () => usePelicula.getState().setColocando(false)
  }, [pelicula, marcadorX, marcadorZ])

  // Al salir del editor se corta la lectura del guion.
  useEffect(() => () => pararLecturaRef.current?.(), [])

  // Pantalla completa: Escape sale, salvo que haya un diálogo abierto (que escucha Escape en document).
  useEffect(() => {
    if (!pantallaCompleta) return
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('[role="dialog"]')) setPantallaCompleta(false)
    }
    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  }, [pantallaCompleta])

  const playPausa = () => {
    const motor = motorRef.current
    if (!motor) return
    if (reproduciendo) {
      motor.pausa()
      setReproduciendo(false)
    } else {
      motor.play()
      setReproduciendo(true)
    }
  }
  const seek = (seg: number) => {
    motorRef.current?.seek(seg)
    // El Director rearma sus one-shots (globo, emoción) en cada salto.
    if (pelicula) peliculaFrame.seekTick++
  }

  /** `abrirPanel`: en móvil, un segundo toque sobre el clip ya seleccionado abre el cajón del editor (un arrastre nunca). */
  const seleccionar = (clipId: string | null, abrirPanel = true) => {
    const repetido = clipId != null && seleccionRef.current === clipId
    setSeleccionEstado(clipId)
    seleccionRef.current = clipId
    if (clipId) {
      setTabPanel('clip')
      if (abrirPanel && !amplio && repetido) setCajon('clip')
    }
  }

  // ─── Clips ───────────────────────────────────────────────────────────────
  const durMedioDe = (c: ClipVideo): number | undefined => {
    const mid = medioIdDe(c)
    const m = mid != null ? mediosRef.current.find((x) => x.id === mid) : undefined
    if (m?.duracion) return m.duracion
    if (c.pista === 'sfx' && c.fuente.tipo === 'fabrica') return sonidoFabrica(c.fuente.clave)?.duracion
    return undefined
  }
  const onMover = (clipId: string, inicio: number) => mutarClips((clips) => moverClip(clips, clipId, inicio))
  const onReordenar = (orden: string[]) => mutarClips((clips) => reordenarPrincipal(clips, orden))
  const onRecortar = (clipId: string, lado: LadoAsa, seg: number) =>
    mutarClips((clips) => {
      const c = clips.find((x) => x.id === clipId)
      return c ? recortarClip(clips, clipId, lado, seg, durMedioDe(c)) : clips
    })
  const onSilenciar = (pista: PistaId) =>
    mutar((p) => {
      const s = new Set(p.pistasSilenciadas ?? [])
      if (s.has(pista)) s.delete(pista)
      else s.add(pista)
      return { ...p, pistasSilenciadas: [...s] }
    })
  const dividir = (clipId?: string) => {
    const seg = tiempoRef.current
    const c = clipId ? proyectoRef.current?.clips.find((x) => x.id === clipId) : clipParaDividir(seg)
    if (!c || !(c.inicio + MIN_CLIP <= seg && seg <= fin(c) - MIN_CLIP)) {
      mostrarAviso(t('video.aviso.dividir', 'Coloca el cursor dentro del clip para dividirlo'))
      return
    }
    mutarClips((clips) => dividirClip(clips, c.id, seg))
  }
  const borrarClip = async (clipId: string) => {
    const si = await confirmar({ titulo: t('video.barra.borrar', 'Borrar el clip'), peligro: true })
    if (!si) return
    mutarClips((clips) => normalizar(clips.filter((c) => c.id !== clipId)))
    if (seleccionRef.current === clipId) seleccionar(null)
  }
  const duplicar = (clipId: string) => mutarClips((clips) => duplicarClip(clips, clipId))

  /** Inserta en la principal (donde manda el cursor, salvo índice explícito) y deja el cursor al FINAL del clip nuevo: varios seguidos se encadenan en orden. */
  const insertarEnPrincipal = (clip: ClipPrincipal, idx?: number) => {
    const p = proyectoRef.current
    if (!p) return
    const main = clipsDe(p.clips, 'video')
    const indice = idx ?? indicePrincipalEn(main, tiempoRef.current, 'cursor')
    const inicio = indice < main.length ? main[indice].inicio : finPrincipal(p.clips)
    mutarClips((clips) => insertarPrincipal(clips, clip, indice))
    seleccionar(clip.id)
    seek(inicio + clip.duracion)
  }
  const meterLibre = (clip: ClipVideo, alFinal: boolean) => {
    mutarClips((clips) => normalizar([...clips, clip]))
    seleccionar(clip.id)
    if (alFinal) mostrarAviso(t('video.aviso.noCabe', 'No cabe aquí: el clip se puso al final de la pista'))
  }
  /** Topes de clips: avisa y no añade. */
  const puedeAnadir = (pista: PistaId): boolean => {
    const clips = proyectoRef.current?.clips ?? []
    const cabe = clips.length < MAX_CLIPS && (pista !== 'video' || clipsDe(clips, 'video').length < MAX_CLIPS_PRINCIPAL)
    if (!cabe) mostrarAviso(t('video.anadir.tope', 'No caben más clips'))
    return cabe
  }
  /**
   * Un recurso de otra app del Studio: se copia como medio (o vuelve como texto)
   * y sigue por el camino normal; mientras tanto, aviso en la barra.
   */
  const traer = (item: Extract<ItemArrastre, { tipo: 'recurso' }>, conMedio: (m: MedioConId) => void, conTexto: (texto: string) => void) => {
    mostrarAviso(t('video.studio.trayendo', 'Trayendo «{n}»…', { n: item.recurso.nombre }))
    void traerRecurso(item.app, item.recurso)
      .then((traido) => {
        if (!traido) {
          mostrarAviso(t('video.studio.noDisponible', 'Ese recurso ya no está disponible'))
          return
        }
        setAviso('')
        if (traido.tipo === 'medio') conMedio(traido.medio)
        else conTexto(traido.texto)
      })
      .catch((e: unknown) => mostrarAviso(e instanceof Error ? e.message : String(e)))
  }
  /** Un medio o un sonido soltado (o tocado) en una pista y un tiempo. */
  const soltar = (item: ItemArrastre, destino: { pista: PistaId; seg: number }) => {
    const p = proyectoRef.current
    if (!p || !puedeAnadir(destino.pista)) return
    if (item.tipo === 'recurso') {
      traer(
        item,
        (medio) => soltar({ tipo: 'medio', medio }, destino),
        (texto) => {
          if (destino.pista !== 'voz') return
          const { inicio, duracion, alFinal } = colocarEnHueco(clipsDe(p.clips, 'voz'), destino.seg, duracionPorDefecto(item, 'voz'), false)
          meterLibre(clipVozDeTexto(texto, inicio, duracion), alFinal)
        },
      )
      return
    }
    if (destino.pista === 'video') {
      if (item.tipo === 'medio') insertarEnPrincipal(clipPrincipalDe(item.medio), indicePrincipalEn(clipsDe(p.clips, 'video'), destino.seg, 'mitad'))
      return
    }
    const dur = duracionPorDefecto(item, destino.pista)
    const { inicio, duracion, alFinal } = colocarEnHueco(clipsDe(p.clips, destino.pista), destino.seg, dur, permiteSolape(destino.pista))
    const clip = clipLibreDe(item, destino.pista, inicio, duracion, lienzo)
    if (clip) meterLibre(clip, alFinal)
  }
  /** Toque en una tarjeta del panel de medios: a su pista por defecto, en el cursor. */
  const tocar = (item: ItemArrastre) => {
    const pista = pistaPorDefecto(item)
    const t0 = Math.max(0, Math.round(tiempoRef.current * 10) / 10)
    if (item.tipo === 'recurso' && pista === 'video') {
      // Imagen del Studio de arte: como tocar su copia en Medios (regla del cursor).
      if (puedeAnadir('video')) traer(item, (medio) => tocar({ tipo: 'medio', medio }), () => {})
    } else if (pista === 'video') {
      if (item.tipo === 'medio' && puedeAnadir('video')) insertarEnPrincipal(clipPrincipalDe(item.medio))
    } else soltar(item, { pista, seg: t0 })
    if (!amplio) setCajon(null)
  }
  const { propsDe } = useArrastreMedio({
    timelineRef,
    aceptaDe: (item) => {
      const clips = proyectoRef.current?.clips ?? []
      if (clips.length >= MAX_CLIPS) return []
      return pistasQueAceptan(item, clipsDe(clips, 'video').length >= MAX_CLIPS_PRINCIPAL)
    },
    duracionDe: (item) => duracionPorDefecto(item, pistaPorDefecto(item)),
    etiquetaDe: (item) => {
      if (item.tipo === 'medio') return item.medio.nombre
      if (item.tipo === 'recurso') return item.recurso.nombre
      const s = sonidoFabrica(item.clave)
      return s ? t(s.claveNombre, s.es) : item.clave
    },
    onEmpezar: (_item, acepta) => {
      setPistasExtra(acepta)
      setArrastrando(true)
    },
    onSoltar: soltar,
    onTerminar: (soltado) => {
      setPistasExtra([])
      setArrastrando(false)
      if (soltado && !amplio) setCajon(null)
    },
  })
  const clipColor = (): ClipPrincipal => ({
    id: nuevoClipId(),
    pista: 'video',
    inicio: 0,
    duracion: DUR_DEFECTO.color,
    fuente: { tipo: 'color', color: '#0f1115' },
    filtro: 'ninguno',
    volumen: 1,
  })

  const anadir = (opcion: OpcionAnadir) => {
    setMenuAnadir(false)
    const p = proyectoRef.current
    if (!p) return
    const t0 = Math.max(0, Math.round(tiempoRef.current * 10) / 10)
    const colocar = (pista: PistaId, dur: number) => colocarEnHueco(clipsDe(p.clips, pista), t0, dur, permiteSolape(pista))
    const elegir = (tipos: MedioVideo['tipo'][], alElegir: (m: MedioVideo & { id: number }) => void) =>
      setSelector({
        tipos,
        alElegir: (m) => {
          setSelector(null)
          if (m.id != null) alElegir(m as MedioVideo & { id: number })
        },
      })
    switch (opcion) {
      case 'plano':
        // La cámara tal como está ahora: el plano se retoca desde su panel.
        insertarEnPrincipal(clipPlano(capturarCamara()))
        break
      case 'personaje': {
        const { inicio, duracion, alFinal } = colocar('avatar', DUR_DEFECTO.personaje)
        // Nace con el primer narrador con personaje (si lo hay); si no, con el primer asistente, junto a tu avatar.
        const conPersonaje = (p.narradores ?? []).find((n) => n.asistenteId)
        const quien = conPersonaje?.asistenteId ?? asistentes[0]?.id ?? ES_JUGADOR
        const punto = quien === ES_JUGADOR ? puntoActor(quien) : { x: playerPos.x + 2, z: playerPos.z }
        meterLibre(clipPersonaje(quien, conPersonaje?.id, inicio, duracion, punto), alFinal)
        break
      }
      case 'clip':
        elegir(['video', 'imagen'], (m) => insertarEnPrincipal(clipPrincipalDe(m)))
        break
      case 'grabarCamara':
        if (puedeAnadir('video')) setGrabarMedio('camara')
        break
      case 'grabarAudio':
        if (puedeAnadir('voz')) setGrabarMedio('microfono')
        break
      case 'mascaraAr':
      case 'chatAr': {
        // El overlay AR se abre ENCIMA del Studio; su toma vuelve por el mismo canal que la grabación de la app.
        if (!puedeAnadir('video')) break
        motorRef.current?.pausa()
        setReproduciendo(false)
        const destino = { proyectoId: id, cursor: tiempoRef.current }
        if (opcion === 'mascaraAr') useMascaraUi.getState().abrirParaStudio(destino)
        else useChatArUi.getState().abrirParaStudio(destino)
        break
      }
      case 'color':
        insertarEnPrincipal(clipColor())
        break
      case 'fondo':
        elegir(['imagen'], (m) => soltar({ tipo: 'medio', medio: m }, { pista: 'fondo', seg: t0 }))
        break
      case 'imagen':
        elegir(['imagen'], (m) => soltar({ tipo: 'medio', medio: m }, { pista: 'imagen', seg: t0 }))
        break
      case 'texto': {
        const { inicio, duracion, alFinal } = colocar('texto', DUR_DEFECTO.texto)
        meterLibre(
          {
            id: nuevoClipId(),
            pista: 'texto',
            inicio,
            duracion,
            texto: { contenido: t('video.anadir.textoDefecto', 'Tu texto'), posicion: 'abajo', tamano: 'M', color: '#ffffff' },
          },
          alFinal,
        )
        break
      }
      case 'voz': {
        const { inicio, duracion, alFinal } = colocar('voz', DUR_DEFECTO.voz)
        // Nace con el primer narrador en off (si lo hay); el panel deja cambiarlo.
        const enOff = (p.narradores ?? []).find((n) => !n.asistenteId)
        meterLibre({ id: nuevoClipId(), pista: 'voz', inicio, duracion, volumen: 1, narradorId: enOff?.id }, alFinal)
        break
      }
      case 'musica':
        elegir(['audio'], (m) => soltar({ tipo: 'medio', medio: m }, { pista: 'musica', seg: t0 }))
        break
      case 'sfx':
        setListaSonidos({
          alElegir: (fuente) => {
            setListaSonidos(null)
            const medio = fuente.tipo === 'medio' ? mediosRef.current.find((m) => m.id === fuente.medioId) : undefined
            const item: ItemArrastre | null =
              fuente.tipo === 'fabrica' ? { tipo: 'sonido', clave: fuente.clave } : medio?.id != null ? { tipo: 'medio', medio: medio as MedioConId } : null
            if (item) soltar(item, { pista: 'sfx', seg: t0 })
          },
        })
        break
      case 'avatar': {
        const { inicio, duracion, alFinal } = colocar('avatar', DUR_DEFECTO.avatar)
        // Nace con el primer narrador con personaje (si lo hay); si no, con el primer asistente.
        const conPersonaje = (p.narradores ?? []).find((n) => n.asistenteId)
        meterLibre(
          {
            id: nuevoClipId(),
            pista: 'avatar',
            inicio,
            duracion,
            asistenteId: conPersonaje?.asistenteId ?? asistentes[0]?.id ?? '',
            narradorId: conPersonaje?.id,
            esquina: 'infDer',
            tamano: 'M',
            plano: 'busto',
            texto: '',
            volumen: 1,
          },
          alFinal,
        )
        break
      }
      case 'portada': {
        const principal: ClipPrincipal = { ...clipColor(), transicion: { tipo: 'fundido' } }
        const { inicio, duracion } = colocarEnHueco(clipsDe(p.clips, 'texto'), 0, DUR_DEFECTO.color, false)
        mutarClips((clips) =>
          normalizar([
            ...insertarPrincipal(clips, principal, 0),
            {
              id: nuevoClipId(),
              pista: 'texto',
              inicio,
              duracion,
              texto: { contenido: p.nombre, posicion: 'centro', tamano: 'L', color: '#ffffff', fuente: 'display', animacion: 'fundido' },
            },
          ]),
        )
        seleccionar(principal.id)
        seek(0)
        break
      }
      case 'creditos': {
        const principal: ClipPrincipal = { ...clipColor(), transicion: { tipo: 'fundido' } }
        const inicioFinal = finPrincipal(p.clips)
        const { inicio, duracion } = colocarEnHueco(clipsDe(p.clips, 'texto'), inicioFinal, DUR_DEFECTO.color, false)
        mutarClips((clips) =>
          normalizar([
            ...insertarPrincipal(clips, principal, clipsDe(clips, 'video').length),
            {
              id: nuevoClipId(),
              pista: 'texto',
              inicio,
              duracion,
              texto: { contenido: t('video.guion.graciasPorVer', 'Gracias por ver'), subtitulo: p.nombre, posicion: 'centro', tamano: 'M', color: '#ffffff', animacion: 'subir' },
            },
          ]),
        )
        seleccionar(principal.id)
        seek(inicioFinal)
        break
      }
    }
  }

  // ─── Voz, audio y subtítulos ─────────────────────────────────────────────
  const ponerAudio = (clipId: string, patch: Partial<ClipVideo>, duracionAudio: number | undefined) =>
    mutarClips((clips) => {
      const lista = clips.map((c) => (c.id === clipId ? ({ ...c, ...patch } as ClipVideo) : c))
      const c = lista.find((x) => x.id === clipId)
      if (!c || !duracionAudio) return normalizar(lista)
      const dur = Math.max(MIN_CLIP, Math.ceil(duracionAudio * 10) / 10)
      return recortarClip(lista, clipId, 'fin', c.inicio + dur, duracionAudio)
    })
  const narrarClip = async (clipId: string) => {
    const p = proyectoRef.current
    const c = p?.clips.find((x) => x.id === clipId)
    if (!p || !c || (c.pista !== 'voz' && c.pista !== 'avatar') || !c.texto?.trim()) return
    setNarrandoId(clipId)
    try {
      const r = await generarAudioNarracion(c.texto, vozEfectiva(p, c), { envolvente: c.pista === 'avatar' })
      ponerAudio(
        clipId,
        c.pista === 'avatar' ? { medioId: r.medioId, desde: 0, envolvente: r.envolvente, envolventeHz: r.hz } : { medioId: r.medioId, desde: 0 },
        r.duracion,
      )
    } catch (e) {
      await confirmar({ titulo: t('video.voz.fallo', 'No se pudo generar la voz'), mensaje: e instanceof Error ? e.message : String(e) })
    } finally {
      setNarrandoId(null)
    }
  }
  const elegirAudioPara = (clipId: string) =>
    setSelector({
      tipos: ['audio'],
      alElegir: (m) => {
        setSelector(null)
        const c = proyectoRef.current?.clips.find((x) => x.id === clipId)
        if (m.id == null || !c || (c.pista !== 'voz' && c.pista !== 'avatar')) return
        if (c.pista === 'avatar') {
          void envolventeDe(m.blob).then((env) =>
            ponerAudio(clipId, { medioId: m.id, desde: 0, envolvente: env.envolvente, envolventeHz: env.hz }, m.duracion ?? env.duracion),
          )
        } else ponerAudio(clipId, { medioId: m.id, desde: 0 }, m.duracion)
      },
    })
  const subtitulosDe = (clipId: string) => {
    const c = proyectoRef.current?.clips.find((x) => x.id === clipId)
    if (!c || (c.pista !== 'voz' && c.pista !== 'avatar')) return
    const dur = c.medioId != null ? mediosRef.current.find((m) => m.id === c.medioId)?.duracion : undefined
    mutarClips((clips) => generarSubtitulos(clips, c, dur))
  }
  const subtitulosTodos = () =>
    mutarClips((clips) => {
      let out = clips
      for (const c of clips) {
        if ((c.pista !== 'voz' && c.pista !== 'avatar') || !c.texto?.trim()) continue
        const dur = c.medioId != null ? mediosRef.current.find((m) => m.id === c.medioId)?.duracion : undefined
        out = generarSubtitulos(out, c, dur)
      }
      return out
    })

  // ─── Narradores y lectura del guion ──────────────────────────────────────
  const anadirNarrador = (asistenteId?: string) =>
    mutar((p) =>
      (p.narradores?.length ?? 0) >= MAX_NARRADORES ? p : { ...p, narradores: [...(p.narradores ?? []), nuevoNarrador(p, asistenteId)] },
    )
  const cambiarNarrador = (narradorId: string, patch: Partial<NarradorVideo>) =>
    mutar((p) => ({ ...p, narradores: (p.narradores ?? []).map((n) => (n.id === narradorId ? { ...n, ...patch } : n)) }))
  const quitarNarrador = (narradorId: string) =>
    mutar((p) => ({ ...p, narradores: (p.narradores ?? []).filter((n) => n.id !== narradorId), clips: sinNarrador(p.clips, narradorId) }))
  /** Quién dice un clip: con personaje pasa a la pista avatar, que necesita la envolvente de la boca si ya tiene audio. */
  const asignarNarradorA = (clipId: string, narradorId: string) => {
    const n = proyectoRef.current?.narradores?.find((x) => x.id === narradorId)
    if (!n) return
    // En el modo película la línea con personaje va a la casa 3D: nace donde esté hoy ese actor.
    mutarClips((clips) => asignarNarrador(clips, clipId, n, pelicula && n.asistenteId ? puntoActor(n.asistenteId) : undefined))
    const c = proyectoRef.current?.clips.find((x) => x.id === clipId)
    const m = c?.pista === 'avatar' && c.medioId != null && !c.envolvente ? mediosRef.current.find((x) => x.id === c.medioId) : undefined
    if (m) void envolventeDe(m.blob).then((env) => cambiarClip(clipId, { envolvente: env.envolvente, envolventeHz: env.hz }))
  }
  /** Lee las líneas del guion (todas, o una) con la voz de cada narrador; las que ya tienen audio suenan tal cual. */
  const escucharLineas = (clipId?: string) => {
    const p = proyectoRef.current
    if (!p) return
    pararLecturaRef.current?.()
    motorRef.current?.pausa()
    setReproduciendo(false)
    const lineas = lineasNarracion(p.clips).filter((c) => !clipId || c.id === clipId)
    pararLecturaRef.current = reproducirLineas(
      lineas.map((c) => ({
        id: c.id,
        texto: c.texto ?? '',
        voz: vozEfectiva(p, c),
        blob: c.medioId != null ? mediosRef.current.find((m) => m.id === c.medioId)?.blob : undefined,
      })),
      setLineaSonando,
      () => mostrarAviso(t('video.lineas.fallo', 'No se pudo leer la línea')),
    )
  }

  // ─── IA de guion ─────────────────────────────────────────────────────────
  const correrGuion = async () => {
    const p = proyectoRef.current
    if (!p) return
    if (clipsDe(p.clips, 'video').length > 0) {
      const si = await confirmar({
        titulo: t('video.ia.reemplazar', 'Reemplazar el guion'),
        mensaje: t('video.ia.reemplazarMsg', 'El guion nuevo sustituye a las escenas actuales.'),
        peligro: true,
      })
      if (!si) return
    }
    setIaError('')
    setIaOcupado(true)
    try {
      const clips = await generarGuion(
        iaTexto.trim(),
        medios,
        p,
        (p.narradores ?? []).map((n) => ({ narrador: n, nombre: nombreNarrador(t, n) })),
      )
      mutar((prev) => {
        // Se conserva la música; la que empieza en 0 en bucle se estira al total nuevo.
        const total = duracionTotal(clips)
        const musica = clipsDe(prev.clips, 'musica').map((m, i) =>
          i === 0 && m.inicio === 0 && m.bucle && total > 0 ? { ...m, duracion: total } : m,
        )
        return { ...prev, clips: normalizar([...clips, ...musica]) }
      })
      seleccionar(null)
      seek(0)
      setPanelIA(false)
    } catch (e) {
      setIaError(e instanceof Error ? e.message : String(e))
    } finally {
      setIaOcupado(false)
    }
  }
  const correrTitulos = async () => {
    const p = proyectoRef.current
    if (!p) return
    setIaError('')
    setIaOcupado(true)
    try {
      const mapa = await mejorarTitulos(p.clips)
      mutarClips((clips) =>
        clips.map((c) => {
          const nuevo = mapa.get(c.id)
          return nuevo && c.pista === 'texto' ? { ...c, texto: { ...c.texto, contenido: nuevo } } : c
        }),
      )
      setPanelIA(false)
    } catch (e) {
      setIaError(e instanceof Error ? e.message : String(e))
    } finally {
      setIaOcupado(false)
    }
  }

  // ─── Grabar la app ───────────────────────────────────────────────────────
  /**
   * Cierra el Studio y graba la app en uso (píldora flotante de `grabacionPantalla`);
   * al detener, el Studio vuelve a este proyecto y la toma entra como clip en el cursor.
   */
  const grabarApp = async () => {
    if (grabando) {
      detenerGrabacionPantalla()
      return
    }
    if (!puedeAnadir('video')) return
    motorRef.current?.pausa()
    setReproduciendo(false)
    const r = await iniciarGrabacionPantalla({ proyectoId: id, cursor: tiempoRef.current })
    if (r === 'sin-soporte') {
      await confirmar({
        titulo: t('video.export.sinSoporte', 'Este navegador no puede grabar video'),
        mensaje: t('video.export.sinSoporteMsg', 'Prueba en Chrome o en la app de escritorio.'),
      })
    }
  }
  // La toma vuelve con el proyecto: entra en la principal donde estaba el cursor (el motor ya existe: su efecto va antes).
  useEffect(() => {
    if (!cargado || !resultadoGrabacion || resultadoGrabacion.proyectoId !== id) return
    const medio = mediosRef.current.find((m) => m.id === resultadoGrabacion.medioId) as MedioConId | undefined
    if (!medio) return // la fila aún no llegó: se reintenta con la firma de medios
    tomarResultadoGrabacion(id)
    if (!puedeAnadir('video')) return
    seek(resultadoGrabacion.cursor)
    insertarEnPrincipal({ ...clipPrincipalDe(medio), duracion: Math.max(MIN_CLIP, medio.duracion ?? DUR_DEFECTO.imagen) })
    void completarGrabacion(medio) // miniatura y dimensiones en segundo plano; la timeline las recoge al llegar
    // eslint-disable-next-line react-hooks/exhaustive-deps -- por carga, firma de medios y toma pendiente
  }, [cargado, firmaMedios, resultadoGrabacion])

  // ─── Export ──────────────────────────────────────────────────────────────
  /**
   * Chequeos + render, o el último export si el proyecto no cambió desde entonces
   * (misma firma: descargar y luego publicar no renderiza dos veces). Devuelve
   * null si el usuario declinó en algún aviso; lanza 'cancelado'/'grabacion'.
   */
  const renderizarParaEntrega = async (o: {
    preferirMp4?: boolean
    senal: AbortSignal
    onProgreso: (f: number) => void
    /** Los chequeos pasaron y el render va a empezar (para abrir la barra). */
    alEmpezar?: () => void
  }): Promise<ExportListo | null> => {
    const p = proyectoRef.current
    if (!p) return null
    const formato = mimeExport({ preferirMp4: o.preferirMp4 })
    if (!formato) {
      await confirmar({
        titulo: t('video.export.sinSoporte', 'Este navegador no puede grabar video'),
        mensaje: t('video.export.sinSoporteMsg', 'Prueba en Chrome o en la app de escritorio.'),
      })
      return null
    }
    const previo = ultimoExportRef.current
    // En el modo película la toma recién grabada es lo que se entrega (descargar, guardar, publicar) mientras
    // el proyecto no cambie; un encuadre nuevo de cámara sin tocar clips pide volver a grabar.
    if (previo && previo.firma === firmaExport(p, formato.mime)) {
      if (import.meta.env.DEV) console.info('[video] export reutilizado')
      return previo
    }
    // Las líneas sin audio (voz del dispositivo en vivo, o IA sin generar) no entran en el archivo.
    const sinAudio = lineasNarracion(p.clips).filter((c) => c.medioId == null).length
    if (sinAudio > 0) {
      const si = await confirmar({
        titulo: t('video.export.sinAudio', 'Narraciones sin audio'),
        mensaje: t('video.export.sinAudioMsg', '{n} líneas del guion no tienen audio generado y no sonarán en el archivo. ¿Exportar igual?', {
          n: sinAudio,
        }),
      })
      if (!si) return null
    }
    const total = duracionTotal(p.clips)
    if (total > AVISO_DURACION_EXPORT) {
      const si = await confirmar({
        titulo: t('video.export.largo', 'Export largo'),
        mensaje: t('video.export.largoMsg', 'El export dura lo que dura el video ({m} min). ¿Seguir?', {
          m: Math.ceil(total / 60),
        }),
      })
      if (!si) return null
    }
    motorRef.current?.pausa()
    setReproduciendo(false)
    // Modo película: la escena 3D viva entra por captureStream; sin ella no hay archivo.
    const escena = pelicula ? await capturarEscena3d() : null
    if (pelicula && !escena) {
      await confirmar({
        titulo: t('video.export.sinSoporte', 'Este navegador no puede grabar video'),
        mensaje: t('video.pelicula.sinCaptura', 'Este navegador no puede capturar la escena 3D.'),
      })
      return null
    }
    o.alEmpezar?.()
    await guardarRef.current()
    // Mientras se rueda, el Director sigue al motor de export (no al cursor del preview, que
    // `notificarTiempo` refresca en cada commit) y no pinta globos: no salen en el archivo.
    exportandoRef.current = true
    peliculaFrame.exportando = pelicula
    peliculaFrame.reproduciendo = pelicula
    peliculaFrame.seekTick++
    try {
      const listo = await exportarVideo(p, medios, {
        senal: o.senal,
        avatar: avatarRef.current,
        preferirMp4: o.preferirMp4,
        onProgreso: o.onProgreso,
        fuente3d: escena?.fuente3d,
        onTiempo: pelicula
          ? (seg) => {
              peliculaFrame.t = seg
            }
          : undefined,
        // La pantalla entera, con su aspecto.
        resolucion: pelicula ? lienzo : undefined,
        // Mientras se rueda, el monitor del HUD enseña la composición de la toma, no la del preview.
        onLienzo: pelicula
          ? (c) => {
              peliculaFrame.lienzoComposicion = c
            }
          : undefined,
      })
      ultimoExportRef.current = listo
      return listo
    } finally {
      escena?.cerrar()
      exportandoRef.current = false
      peliculaFrame.exportando = false
      peliculaFrame.reproduciendo = false
      if (pelicula) {
        peliculaFrame.lienzoComposicion = canvasRef.current
        peliculaFrame.t = tiempoRef.current
        peliculaFrame.seekTick++
      }
    }
  }

  /** Renderiza (o reutiliza) el archivo y lo entrega: descargar, o guardarlo en Medios (modo película). */
  const entregar = async (alTerminar: (listo: ExportListo, p: ProyectoAbierto) => Promise<void>) => {
    const p = proyectoRef.current
    if (!p || progresoExport != null) return
    const abort = new AbortController()
    abortRef.current = abort
    let ultimo = 0
    try {
      const listo = await renderizarParaEntrega({
        senal: abort.signal,
        alEmpezar: () => setProgresoExport(0),
        onProgreso: (f) => {
          if (f - ultimo >= 0.01) {
            ultimo = f
            setProgresoExport(f)
          }
        },
      })
      if (listo) await alTerminar(listo, p)
    } catch (e) {
      if (!(e instanceof Error && e.message === 'cancelado')) {
        await confirmar({
          titulo: t('video.export.fallo', 'El export falló'),
          mensaje: e instanceof Error ? e.message : String(e),
        })
      }
    } finally {
      abortRef.current = null
      setProgresoExport(null)
    }
  }
  /** «Descargar»: el archivo al dispositivo (en la app de tienda, la hoja de compartir). */
  const exportar = () => entregar((listo, p) => descargarArchivo(listo.blob, `${p.nombre || 'video'}.${listo.extension}`))
  /** «Guardar en Medios» (modo película): la animación como clip para montarla dentro de un video. */
  const guardarEnMedios = () =>
    entregar(async (listo, p) => {
      const fila = {
        tipo: 'video' as const,
        nombre: t('video.pelicula.nombreMedio', 'Animación 3D · {n}', { n: p.nombre }),
        blob: listo.blob,
        // Los webm de MediaRecorder no traen duración: la del proyecto.
        duracion: duracionTotal(p.clips),
        origen: 'grabacion' as const,
        creadoEn: new Date().toISOString(),
      }
      const medioId = await mediosVideoRepo.add(fila)
      void completarGrabacion({ ...fila, id: medioId }) // miniatura y dimensiones en segundo plano
      mostrarAviso(t('video.pelicula.guardado', 'Guardado en Medios: ya puedes usarlo en un video'))
    })
  const cancelarCuenta = () => {
    window.clearInterval(cuentaTimer.current)
    cuentaTimer.current = 0
    setCuenta(null)
    mostrarAviso(t('video.pelicula.tomaCancelada', 'Grabación cancelada'))
  }
  /**
   * «Grabar la toma» (modo película): al principio, cuenta regresiva de 3 sobre el mapa y se
   * rueda la película entera; la toma queda lista para Exportar (descargar, Medios, redes).
   * Con la toma andando, el mismo botón la detiene; en la cuenta, la cancela.
   */
  const grabarToma = () => {
    if (progresoExport != null) {
      abortRef.current?.abort()
      return
    }
    if (cuenta != null) {
      cancelarCuenta()
      return
    }
    motorRef.current?.pausa()
    setReproduciendo(false)
    seek(0)
    let n = 3
    setCuenta(n)
    cuentaTimer.current = window.setInterval(() => {
      n -= 1
      if (n > 0) {
        setCuenta(n)
        return
      }
      window.clearInterval(cuentaTimer.current)
      cuentaTimer.current = 0
      setCuenta(null)
      void entregar(async () => {
        mostrarAviso(t('video.pelicula.tomaLista', 'Toma grabada: usa Exportar para descargarla, guardarla en Medios o publicarla'))
      })
    }, 1000)
  }

  if (!proyecto) {
    return (
      <div className="grid h-full place-items-center">
        <Spinner etiqueta={t('video.editor.cargando', 'Cargando el proyecto')} />
      </div>
    )
  }

  const clipSel = proyecto.clips.find((c) => c.id === seleccion) ?? null
  const nPrincipales = clipsDe(proyecto.clips, 'video').length
  // Para la etiqueta «generado con IA» de TikTok: imágenes IA o voces sintéticas en el proyecto.
  const usaMediosIA = proyecto.clips.some((c) => {
    const id = medioIdDe(c)
    const m = id == null ? undefined : medios.find((x) => x.id === id)
    return m?.origen === 'ia' || m?.origen === 'tts'
  })
  const cerrarEditor = () => {
    setPantallaCompleta(false)
    alCerrar()
  }
  // Los dos laterales: columna (preferencia recordada) o cajón, según el modo; sus botones flotan en el visor.
  const mediosVisible = amplio ? mediosAbierto : cajon === 'medios'
  const clipVisible = amplio ? clipAbierto : cajon === 'clip'
  const cerrarMedios = () => (amplio ? setMediosAbierto(false) : setCajon(null))
  const cerrarClip = () => (amplio ? setClipAbierto(false) : setCajon(null))
  const alternarMedios = () => (amplio ? setMediosAbierto(!mediosAbierto) : setCajon((c) => (c === 'medios' ? null : 'medios')))
  const alternarClip = () => {
    if (amplio) setClipAbierto(!clipAbierto)
    else {
      setTabPanel(clipSel ? 'clip' : 'guion')
      setCajon((c) => (c === 'clip' ? null : 'clip'))
    }
  }
  const etiquetaMedios = mediosVisible
    ? amplio
      ? t('video.lateral.plegarMedios', 'Plegar los medios')
      : t('video.panel.cerrar', 'Cerrar el panel')
    : t('video.lateral.abrirMedios', 'Mostrar los medios')
  const etiquetaClip = clipVisible
    ? amplio
      ? t('video.lateral.plegarEditor', 'Plegar el editor')
      : t('video.panel.cerrar', 'Cerrar el panel')
    : t('video.lateral.abrirEditor', 'Mostrar el editor del clip')

  // Modo película: el mapa a pantalla completa y el editor encima como HUD, sin capturar toques
  // (`pointer-events-none` en la raíz): la timeline en el hueco del chat, el menú de medios en la
  // esquina superior izquierda (donde iba el menú de la casa) y el editor del clip en la derecha
  // (donde iba la barra del editor); cada pieza interactiva se marca `pointer-events-auto`. Lo que
  // se graba es el lienzo 3D entero: los controles son DOM y no salen. Los botones de las esquinas
  // siguen el tema como el HUD de la casa; el dock, los cajones y los modales son una «isla oscura»
  // (`ui-noche ui-isla-oscura`: blanco real y paneles nocturnos también en modo claro).
  // `data-teclado-propio` = sus flechas y letras no mueven al avatar.
  const claseRaiz = pelicula
    ? 'pointer-events-none fixed inset-0 z-[60]'
    : pantallaCompleta
      ? 'ui-panel fixed inset-0 z-[60] flex flex-col gap-2 p-2 pt-[calc(0.5rem+var(--safe-top))] pb-[calc(0.5rem+var(--safe-bottom))] ps-[calc(0.5rem+var(--safe-left))] pe-[calc(0.5rem+var(--safe-right))]'
      : 'flex h-full flex-col gap-2'
  const interactivo = pelicula ? ' pointer-events-auto' : ''
  const isla = pelicula ? ' ui-noche ui-isla-oscura' : ''
  // Botones de las esquinas del modo película: el mismo vidrio (y la misma tinta) que el HUD de la casa.
  const CLASE_HUD = 'ui-hud ui-boton flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/85 transition hover:bg-white/15 disabled:opacity-40'
  const botonesAspecto = (
    <div className="flex items-center gap-1">
      {(['16:9', '9:16'] as const).map((a) => (
        <button
          key={a}
          type="button"
          onClick={() => mutar((p) => ({ ...p, aspecto: a }))}
          aria-pressed={proyecto.aspecto === a}
          className={`rounded-full border px-2 py-0.5 text-xs transition ${
            proyecto.aspecto === a ? 'border-white/60 bg-white/20 font-semibold' : 'border-white/10 bg-white/5'
          }`}
        >
          {a}
        </button>
      ))}
    </div>
  )
  const abrirExportar = () => {
    setCajon(null)
    setMenuExportar(true)
  }
  const abrirIA = () => {
    setIaError('')
    setPanelIA(true)
  }

  return (
    <div className={claseRaiz} data-teclado-propio={pelicula || undefined}>
      {pelicula ? (
        <>
          {/* La capa de composición sobre el mapa entero, detrás de todo: se graba la pantalla completa. */}
          <PeliculaEncuadre canvasRef={canvasRef} onMedida={onMedidaPantalla} />
          {/* Esquina superior izquierda: salir del modo (el proyecto se guarda al desmontar) y los medios. */}
          <div className="safe-sup safe-ini pointer-events-auto absolute start-3 top-3 z-40 flex items-center gap-2">
            <button
              type="button"
              onClick={cerrarEditor}
              title={t('video.pelicula.salirTitulo', 'Salir del modo película y volver al Studio')}
              className={`${CLASE_HUD} font-semibold`}
            >
              <span aria-hidden className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              <Icono nombre="pelicula" /> {t('video.pelicula.modo', 'Modo película')}
              <span className="hidden max-w-32 truncate font-normal text-white/55 sm:inline">· {proyecto.nombre}</span>
            </button>
            <button
              type="button"
              onClick={alternarMedios}
              aria-pressed={mediosVisible}
              title={etiquetaMedios}
              aria-label={etiquetaMedios}
              className={`${CLASE_HUD}${mediosVisible ? ' bg-white/20' : ''}`}
            >
              <Icono nombre="carpeta" /> <span className="hidden sm:inline">{t('video.lateral.medios', 'Medios')}</span>
            </button>
          </div>
          {/* Esquina superior derecha: exportar, IA y el editor del clip (el aspecto es el de la pantalla). */}
          <div className="safe-sup safe-fin pointer-events-auto absolute end-3 top-3 z-40 flex items-center gap-2">
            <button
              type="button"
              onClick={abrirExportar}
              disabled={proyecto.clips.length === 0 || progresoExport != null}
              title={t('video.export.boton', 'Exportar')}
              aria-label={t('video.export.boton', 'Exportar')}
              className={CLASE_HUD}
            >
              <Icono nombre="compartir" />
            </button>
            <button type="button" onClick={abrirIA} title={t('video.ia.boton', 'IA')} aria-label={t('video.ia.boton', 'IA')} className={CLASE_HUD}>
              <Icono nombre="brillo" />
            </button>
            <button
              type="button"
              onClick={alternarClip}
              aria-pressed={clipVisible}
              title={etiquetaClip}
              aria-label={etiquetaClip}
              className={`${CLASE_HUD}${clipVisible ? ' bg-white/20' : ''}`}
            >
              <Icono nombre="editar" /> <span className="hidden sm:inline">{t('video.lateral.editor', 'Editor')}</span>
            </button>
          </div>
          {/* Cuenta regresiva de la toma: un número grande sobre el mapa; tocarlo cancela. Es DOM: no se graba. */}
          {cuenta != null && (
            <button
              type="button"
              onClick={cancelarCuenta}
              aria-label={t('video.pelicula.cuenta', 'La grabación empieza en {n}. Toca para cancelar.', { n: cuenta })}
              className="pointer-events-auto absolute inset-0 z-30 grid place-items-center bg-black/20"
            >
              <span key={cuenta} className="ui-pop text-[9rem] font-bold leading-none text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.7)]">
                {cuenta}
              </span>
            </button>
          )}
        </>
      ) : (
        <div className="flex shrink-0 items-center gap-2">
          {/* Cabecera del editor normal */}
          <BotonSecundario pequeno onClick={cerrarEditor}>
            <Icono nombre="volver" /> <span className="hidden sm:inline">{t('video.editor.volver', 'Volver')}</span>
          </BotonSecundario>
          <p className="min-w-0 flex-1 truncate text-sm font-semibold">{proyecto.nombre}</p>
          {/* Grabar la app en uso: la toma vuelve como clip. Con la toma andando, el mismo botón la detiene. */}
          <BotonSecundario
            pequeno
            onClick={() => void grabarApp()}
            disabled={progresoExport != null}
            title={t('video.grabar.titulo', 'Grabar dentro de la app: ve a la casa, haz lo que quieras y vuelve con la toma como clip')}
          >
            <Icono nombre={grabando ? 'detener' : 'grabar'} />{' '}
            <span className="hidden sm:inline">
              {grabando ? t('video.grabar.detener', 'Detener') : t('video.grabar.boton', 'Grabar dentro de la app')}
            </span>
          </BotonSecundario>
          {botonesAspecto}
          <BotonSecundario pequeno onClick={abrirExportar} disabled={proyecto.clips.length === 0 || progresoExport != null}>
            <Icono nombre="compartir" /> <span className="hidden sm:inline">{t('video.export.boton', 'Exportar')}</span>
          </BotonSecundario>
          <BotonPrimario type="button" pequeno app={COLOR} onClick={abrirIA}>
            <Icono nombre="brillo" /> {t('video.ia.boton', 'IA')}
          </BotonPrimario>
        </div>
      )}

      <div
        ref={cuerpoRef}
        className={
          pelicula
            ? `absolute inset-0 z-10 flex flex-col pt-[var(--safe-top)] ps-[var(--safe-left)] pe-[var(--safe-right)]${isla}`
            : 'relative flex min-h-0 flex-1 flex-col amplio:flex-row amplio:gap-2'
        }
        style={pelicula ? { paddingBottom: `calc(${fondoDock}px + var(--safe-bottom))` } : undefined}
      >
        <PanelLateral
          lado="inicio"
          amplio={amplio}
          abierto={mediosVisible}
          onCerrar={cerrarMedios}
          titulo={t('video.lateral.medios', 'Medios')}
          anchoClase="w-60"
          ocultoDuranteArrastre={arrastrando}
          arriba={pelicula ? 'top-[calc(3.75rem+var(--safe-top))]' : undefined}
        >
          <PanelMedios
            tab={tabMedios}
            onTab={setTabMedios}
            medios={medios}
            iconoCerrar={amplio ? 'volver' : 'cerrar'}
            onCerrar={cerrarMedios}
            onElegirMedio={(m) => tocar({ tipo: 'medio', medio: m })}
            onElegirSonido={(clave) => tocar({ tipo: 'sonido', clave })}
            onElegirRecurso={(app, recurso) => tocar({ tipo: 'recurso', app, recurso })}
            propsMedio={(m) => propsDe({ tipo: 'medio', medio: m })}
            propsSonido={(clave) => propsDe({ tipo: 'sonido', clave })}
            propsRecurso={(app, recurso) => propsDe({ tipo: 'recurso', app, recurso })}
          />
        </PanelLateral>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {pelicula ? (
            // El hueco del mapa (transparente, sin capturar toques): el divisor decide cuánto se lleva la timeline.
            <div ref={previewRef} style={{ height: alto }} className="shrink-0" />
          ) : (
            <Preview canvasRef={canvasRef} previewRef={previewRef} alto={alto}>
              <BotonVisor className="start-2" icono="carpeta" activo={mediosVisible} etiqueta={etiquetaMedios} onClick={alternarMedios} />
              <BotonVisor className="end-2" icono="editar" activo={clipVisible} etiqueta={etiquetaClip} onClick={alternarClip} />
            </Preview>
          )}
          {/* Divisor: arrastrar cambia el alto del visor; doble toque restaura; colapsado enseña un chevron. */}
          <div
            role="separator"
            aria-orientation="horizontal"
            aria-valuenow={alto}
            aria-valuemin={0}
            aria-valuemax={altoMax}
            aria-label={
              colapsado
                ? t('video.divisor.mostrar', 'Mostrar el visor')
                : t('video.divisor.titulo', 'Arrastra para cambiar el tamaño del visor; doble toque para restaurar')
            }
            title={
              colapsado
                ? t('video.divisor.mostrar', 'Mostrar el visor')
                : t('video.divisor.titulo', 'Arrastra para cambiar el tamaño del visor; doble toque para restaurar')
            }
            tabIndex={0}
            {...propsDivisor}
            className={`relative mx-auto my-1 flex h-1.5 w-16 shrink-0 cursor-row-resize touch-none items-center justify-center rounded-full bg-white/15 transition before:absolute before:-inset-x-8 before:-inset-y-2.5 before:content-[''] hover:bg-white/40 active:bg-white/60${interactivo}`}
          >
            {colapsado && (
              <span className="pointer-events-none absolute -bottom-3 text-[10px] text-white/50">
                <Icono nombre="bajar" />
              </span>
            )}
          </div>
          {/* El dock: barra + timeline. En el modo película, vidrio oscuro en el hueco del chat: entre el
              joystick y los controles de vista (mismos offsets que `anclajeChat`); angosto, encima de ellos. */}
          <div
            className={
              pelicula
                ? 'pointer-events-auto mx-2 flex min-h-0 flex-1 flex-col rounded-xl bg-black/70 p-1 backdrop-blur sm:ms-[calc(11rem+var(--safe-left))] sm:me-[calc(12rem+var(--safe-right))]'
                : 'contents'
            }
          >
          <BarraHerramientas
            etiquetaRef={etiquetaRef}
            reproduciendo={reproduciendo}
            onPlayPausa={playPausa}
            onAnadir={() => setMenuAnadir(true)}
            puedeDividir={puedeDividir}
            onDividir={() => dividir()}
            puedeBorrar={clipSel != null}
            onBorrar={() => {
              if (clipSel) void borrarClip(clipSel.id)
            }}
            iman={iman}
            onIman={() => setIman((v) => !v)}
            onZoom={(d) => timelineRef.current?.zoom(d)}
            pantallaCompleta={pelicula ? undefined : pantallaCompleta}
            onPantallaCompleta={pelicula ? undefined : () => setPantallaCompleta((v) => !v)}
            onInicio={() => seek(0)}
            onGrabar={pelicula ? grabarToma : undefined}
            grabando={pelicula && (progresoExport != null || cuenta != null)}
            progreso={pelicula ? progresoExport : null}
            aviso={aviso}
            onMedios={colapsado && !pelicula ? alternarMedios : undefined}
            onEditor={colapsado && !pelicula ? alternarClip : undefined}
            medios={mediosVisible}
            editor={clipVisible}
          />
          <TimelinePistas
            ref={timelineRef}
            className="min-h-0 flex-1"
            proyecto={proyecto}
            medios={medios}
            seleccion={seleccion}
            iman={iman}
            tiempoRef={tiempoRef}
            registrarTiempo={registrarTiempo}
            onSeleccion={(clipId, abrirPanel) => {
              if (clipId) seleccionar(clipId, abrirPanel ?? true)
              else {
                setSeleccionEstado(null)
                seleccionRef.current = null
              }
            }}
            pistasExtra={pistasExtra}
            onSeek={seek}
            onMover={onMover}
            onReordenar={onReordenar}
            onRecortar={onRecortar}
            onSilenciar={onSilenciar}
            onBorrar={(clipId) => void borrarClip(clipId)}
            onDividir={(clipId) => dividir(clipId)}
            onTransicion={(clipId) => seleccionar(clipId)}
          />
          </div>
        </div>
        <PanelLateral
          lado="fin"
          amplio={amplio}
          abierto={clipVisible}
          onCerrar={cerrarClip}
          titulo={clipSel ? tituloPista(t, clipSel.pista, pelicula) : t('video.lateral.editor', 'Editor')}
          anchoClase="w-72"
          arriba={pelicula ? 'top-[calc(3.75rem+var(--safe-top))]' : undefined}
        >
          <PanelClip
            clip={clipSel}
            proyecto={proyecto}
            lienzo={lienzo}
            medios={medios}
            tab={clipSel ? tabPanel : 'guion'}
            onTab={setTabPanel}
            onCerrar={cerrarClip}
            iconoCerrar={amplio ? 'siguiente' : 'cerrar'}
            narrando={narrandoId != null && narrandoId === clipSel?.id}
            guion={
              <>
                <PanelNarradores proyecto={proyecto} onAnadir={anadirNarrador} onCambiar={cambiarNarrador} onQuitar={quitarNarrador} />
                <LineasGuion
                  proyecto={proyecto}
                  sonando={lineaSonando}
                  onEscuchar={escucharLineas}
                  onParar={() => pararLecturaRef.current?.()}
                  onSeleccion={(clipId) => {
                    seleccionar(clipId)
                    const c = proyectoRef.current?.clips.find((x) => x.id === clipId)
                    if (c) seek(c.inicio)
                  }}
                />
                <Guion
                  proyecto={proyecto}
                  medios={medios}
                  seleccion={seleccion}
                  onSeleccion={(clipId) => {
                    seleccionar(clipId)
                    const c = proyectoRef.current?.clips.find((x) => x.id === clipId)
                    if (c) seek(c.inicio)
                  }}
                  onMover={(clipId, delta) => mutarClips((clips) => moverPrincipalEnOrden(clips, clipId, delta))}
                  onDuplicar={duplicar}
                  onBorrar={(clipId) => void borrarClip(clipId)}
                />
              </>
            }
            acciones={{
              onCambiar: (patch) => {
                if (clipSel) cambiarClip(clipSel.id, patch)
              },
              onInicio: (seg) => {
                if (clipSel) onMover(clipSel.id, seg)
              },
              onDuracion: (seg) => {
                if (clipSel) onRecortar(clipSel.id, 'fin', clipSel.inicio + seg)
              },
              onCambiarVoz: (voz) =>
                mutar((p) => {
                  const c = p.clips.find((k) => k.id === clipSel?.id)
                  const n = c && (c.pista === 'voz' || c.pista === 'avatar') ? narradorDe(p, c) : undefined
                  // Con narrador la voz es suya (cambia en todas sus líneas); sin él, la del clip y la del proyecto, como antes.
                  if (n) return { ...p, narradores: (p.narradores ?? []).map((x) => (x.id === n.id ? { ...x, voz } : x)) }
                  return {
                    ...p,
                    vozNarrador: voz,
                    clips: p.clips.map((k) => (k.id === clipSel?.id && k.pista === 'voz' ? { ...k, voz } : k)),
                  }
                }),
              onAsignarNarrador: (narradorId) => {
                if (clipSel) asignarNarradorA(clipSel.id, narradorId)
              },
              onElegirMedio: (tipos, alElegir) =>
                setSelector({
                  tipos,
                  alElegir: (m) => {
                    setSelector(null)
                    alElegir(m)
                  },
                }),
              onElegirSonido: () =>
                setListaSonidos({
                  alElegir: (fuente) => {
                    setListaSonidos(null)
                    if (!clipSel) return
                    const dur =
                      fuente.tipo === 'fabrica'
                        ? (sonidoFabrica(fuente.clave)?.duracion ?? clipSel.duracion)
                        : (mediosRef.current.find((m) => m.id === fuente.medioId)?.duracion ?? clipSel.duracion)
                    cambiarClip(clipSel.id, { fuente, duracion: Math.max(MIN_CLIP, Math.round(dur * 10) / 10), desde: 0 })
                  },
                }),
              onNarrar: () => {
                if (clipSel) void narrarClip(clipSel.id)
              },
              onElegirAudio: () => {
                if (clipSel) elegirAudioPara(clipSel.id)
              },
              onSubtitulos: () => {
                if (clipSel) subtitulosDe(clipSel.id)
              },
              onDuplicar: () => {
                if (clipSel) duplicar(clipSel.id)
              },
              onDividir: () => {
                if (clipSel) dividir(clipSel.id)
              },
              onBorrar: () => {
                if (clipSel) void borrarClip(clipSel.id)
              },
            }}
          />
        </PanelLateral>
      </div>

      {idsAvatar.length > 0 && <AvatarLienzo key={ladoAvatar} asistenteIds={idsAvatar} lado={ladoAvatar} onListo={onListoAvatar} />}

      {/* Modales: `pointer-events` (y los tokens de la isla oscura) se heredan a través de `display: contents`. */}
      <div className={`contents${interactivo}${isla}`}>
      {/* Selector de medios (fondo, audio, imagen…) */}
      {selector && (
        <Modal titulo={t('video.medios.elegir', 'Elegir un medio')} onCerrar={() => setSelector(null)} ancho="max-w-2xl">
          <MediosPanel tipos={selector.tipos} onElegir={selector.alElegir} />
        </Modal>
      )}

      {/* Grabar con la cámara o el micrófono (menú «Añadir»): la toma entra en el cursor */}
      {grabarMedio && (
        <GrabarMedioModal
          tipo={grabarMedio}
          onCerrar={() => setGrabarMedio(null)}
          onGuardado={(m) => {
            if (m.tipo === 'video') {
              insertarEnPrincipal({ ...clipPrincipalDe(m), duracion: Math.max(MIN_CLIP, m.duracion ?? DUR_DEFECTO.imagen) })
            } else {
              soltar({ tipo: 'medio', medio: m }, { pista: 'voz', seg: Math.max(0, Math.round(tiempoRef.current * 10) / 10) })
            }
          }}
        />
      )}

      {/* Carpeta de sonidos */}
      {listaSonidos && (
        <Modal titulo={t('video.sonidos.titulo', 'Sonidos')} onCerrar={() => setListaSonidos(null)} ancho="max-w-2xl">
          <ListaSonidos
            medios={medios}
            onElegir={listaSonidos.alElegir}
            onImportado={() => {
              // Cerrar antes de abrir el selector: cada Modal escucha Escape en document.
              const alElegir = listaSonidos.alElegir
              setListaSonidos(null)
              setSelector({
                tipos: ['audio'],
                alElegir: (m) => {
                  setSelector(null)
                  if (m.id != null) alElegir({ tipo: 'medio', medioId: m.id })
                },
              })
            }}
          />
        </Modal>
      )}

      {menuAnadir && (
        <MenuAnadir
          onElegir={anadir}
          onCerrar={() => setMenuAnadir(false)}
          tope={proyecto.clips.length >= MAX_CLIPS}
          topePrincipal={nPrincipales >= MAX_CLIPS_PRINCIPAL}
          pelicula={pelicula}
        />
      )}

      {/* IA de guion */}
      {panelIA && (
        <Modal titulo={t('video.ia.titulo', 'Guion con IA')} onCerrar={() => setPanelIA(false)}>
          <Campo etiqueta={t('video.ia.desc', 'De qué va el video')}>
            <textarea
              value={iaTexto}
              onChange={(e) => setIaTexto(e.target.value)}
              rows={3}
              placeholder={t('video.ia.descPh', 'Un video corto sobre mi viaje a la playa, con tono alegre…')}
              className={INPUT}
            />
          </Campo>
          {iaError && <p className="text-xs text-red-400">{iaError}</p>}
          <div className="grid grid-cols-1 gap-2">
            <BotonSecundario disabled={iaOcupado || !iaTexto.trim()} onClick={() => void correrGuion()}>
              {iaOcupado ? <Spinner pequeno /> : <Icono nombre="brillo" />}{' '}
              {nPrincipales > 0 ? t('video.ia.rehacer', 'Rehacer el guion') : t('video.ia.generar', 'Generar el guion')}{' '}
              <Creditos op={OP_GUION} />
            </BotonSecundario>
            <BotonSecundario
              disabled={iaOcupado || !clipsDe(proyecto.clips, 'texto').some((c) => c.texto.contenido.trim() && c.origen !== 'narracion')}
              onClick={() => void correrTitulos()}
            >
              {iaOcupado ? <Spinner pequeno /> : <Icono nombre="letra" />} {t('video.ia.titulos', 'Mejorar los títulos')}{' '}
              <Creditos op={OP_TITULOS} />
            </BotonSecundario>
            <BotonSecundario
              disabled={!proyecto.clips.some((c) => (c.pista === 'voz' || c.pista === 'avatar') && c.texto?.trim())}
              onClick={() => {
                subtitulosTodos()
                setPanelIA(false)
              }}
            >
              <Icono nombre="letra" /> {t('video.subtitulos.generarTodos', 'Generar subtítulos de todas las narraciones')}
            </BotonSecundario>
          </div>
          <p className="text-xs text-white/40">
            {t('video.ia.nota', 'La IA usa tus medios importados por su nombre; luego ajusta escenas a mano o pide narración por escena.')}
          </p>
        </Modal>
      )}

      {/* Exportar: descargar/compartir, guardar en Medios (modo película) o publicar en una red */}
      {menuExportar && (
        <MenuExportar
          // En película el archivo tiene el aspecto de la pantalla: vertical u horizontal decide lo que acepta cada red.
          aspecto={pelicula && tamPantalla ? (tamPantalla.h > tamPantalla.w ? '9:16' : '16:9') : proyecto.aspecto}
          publicaciones={proyecto.publicaciones ?? []}
          conMedios={pelicula}
          onCerrar={() => setMenuExportar(false)}
          onElegir={(opcion) => {
            setMenuExportar(false)
            if (opcion === 'archivo') {
              void exportar()
              return
            }
            if (opcion === 'medios') {
              void guardarEnMedios()
              return
            }
            // El frame del visor como vista previa (el motor está en pausa al abrir el menú).
            let poster: string | null = null
            try {
              poster = canvasRef.current?.toDataURL('image/jpeg', 0.6) ?? null
            } catch {
              /* lienzo no exportable: sin poster */
            }
            setPublicando({ plataforma: opcion, poster })
          }}
        />
      )}
      {publicando && (
        <PublicarDialog
          proyecto={proyecto}
          plataforma={publicando.plataforma}
          poster={publicando.poster}
          esIA={usaMediosIA}
          renderizar={renderizarParaEntrega}
          onCerrar={() => setPublicando(null)}
        />
      )}

      {/* Progreso del export (en el modo película va en la barra: el modal taparía el mapa y el monitor) */}
      {progresoExport != null && !pelicula && (
        <Modal titulo={t('video.export.titulo', 'Exportando video')} onCerrar={() => abortRef.current?.abort()}>
          <div className="space-y-3">
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(progresoExport * 100)}%`, background: COLOR }} />
            </div>
            <p className="text-xs text-white/50">
              {pelicula
                ? t('video.pelicula.exportNota', 'Deja esta pestaña a la vista: la escena 3D solo se dibuja mientras está en pantalla.')
                : t('video.export.nota', 'El export dura lo que dura el video: no bloquees la pantalla ni cambies de app.')}
            </p>
            <div className="flex justify-end">
              <BotonSecundario pequeno onClick={() => abortRef.current?.abort()}>
                {t('video.export.cancelar', 'Cancelar')}
              </BotonSecundario>
            </div>
          </div>
        </Modal>
      )}
      </div>
    </div>
  )
}
