import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { getPlantilla } from '../registry'
import { abrirBusqueda, abrirEnlace, busquedaDeMensaje, hostDe, urlDeMensaje } from '../enlaces'
import { useNavegador } from '../state/navegadorStore'
import { getCuarto, useCuartos } from '../state/cuartosStore'
import {
  bitacoraRepo,
  guardarMemoria,
  mensajesChatRepo,
  ultimosMensajesAsistente,
  useUltimosMensajes,
} from '../data/repository'
import { useLayout, roomWorldPos } from '../state/layoutStore'
import { useMascota } from '../state/mascotaStore'
import { useDialogo } from '../state/dialogoStore'
import { useConfirmar } from '../state/confirmarStore'
import { useDiseño } from '../state/disenoStore'
import { useAccionGlobal } from '../state/accionGlobal'
import { playerPos } from '../state/houseStore'
import { getCatalogoItem } from '../house/catalogo'
import { escribiendoEnCampo, hayCuartoAbierto } from '../house/movement'
import { interpretar } from './dispatcher'
import { hayIntencionEditor, tomarUltimoMapa } from './editorIntencion'
import type { EdicionLocal } from './editorAcciones'
import { destinoDeTool } from './destinoChat'
import type { DestinoChat } from '../data/db'
import { interpretarAyuda, type AyudaDetectada } from './ayuda'
import { useSugerenciaMapa } from './sugerirMapa'
import { TIPOS_MAPA } from '../../rooms/ideas/tiposMapa'
import { useTutorial } from '../tutorial/tutorialStore'
import { esEsencial, lanzarEsencial, lanzarFlujo } from '../tutorial/registro'
import { iaActiva, interpretarIA, pdfNativo, getProveedor } from './ia'
import { responder, nombreAsistente, saludoAsistente, type EventoTipo } from './mascotas'
import { EMOCION_POR_EVENTO } from './emociones'
import { reaccionar } from '../state/emocionesStore'
import { getAsistente, useAsistentes } from '../state/asistentesStore'
import { ChatConversacion } from './ChatConversacion'
import { CaraAsistente, CarasAsistentesAlDia } from './carasAsistentes'
import { enChat, traerAsistente } from './chatsAsistentes'
import { IconoVistaChat } from './IconoVistaChat'
import { sonar } from '../audio/sfx'
import { vibrar } from '../audio/vibrar'
// Paneles que solo existen tras pulsar su botón: fuera del arranque (18 KB gz).
const AsistentesConfig = lazy(() =>
  import('./AsistentesConfig').then((m) => ({ default: m.AsistentesConfig })),
)
const ManualComandos = lazy(() =>
  import('./ManualComandos').then((m) => ({ default: m.ManualComandos })),
)
const PanelNavegador = lazy(() =>
  import('../ui/navegador/PanelNavegador').then((m) => ({ default: m.PanelNavegador })),
)
const TabAjustesNav = lazy(() => import('../ui/navegador/TabAjustes').then((m) => ({ default: m.TabAjustes })))
const PanelLugares = lazy(() => import('./PanelLugares').then((m) => ({ default: m.PanelLugares })))
const AjustesNavegacion = lazy(() =>
  import('../../rooms/sala/navegacion/AjustesNavegacion').then((m) => ({ default: m.AjustesNavegacion })),
)
import { ordenFoco, ordenNavegador, type PestanaNav } from '../navegador/ordenes'
import { destinoDeFrase, rutaPedida, useOrdenRuta } from '../../rooms/sala/navegacion/ordenRuta'
import type { PestanaPanelNav } from '../ui/navegador/PanelNavegador'
import type { NombreIcono } from '../ui/iconos/catalogo'
import { ordenMenu, type VistaMenu } from './ordenesMenu'
import { aliasDeRespuesta, fijarPendiente, limpiarPendiente, ordenJugar, pendiente, type OrdenJugar } from './ordenJugar'
import { mensajeErrorPartida } from '../partida/api'
import { ErrorPartida } from '../partida/tipos'
import { invitarAJugar } from '../visita/anfitrion'

/** Las cuatro vistas de la barra del menú del chat, de izquierda a derecha. */
const MENUS_CHAT: { id: VistaMenu; icono: NombreIcono; clave: string; es: string }[] = [
  { id: 'amigos', icono: 'companeros', clave: 'chat.menu.amigos', es: 'Amigos' },
  { id: 'asistentes', icono: 'chat', clave: 'chat.menu.asistentes', es: 'Asistentes' },
  { id: 'lugares', icono: 'navegar', clave: 'chat.menu.lugares', es: 'Lugares' },
  { id: 'navegador', icono: 'mundo', clave: 'chat.menu.navegador', es: 'Navegador' },
]
/** Carpeta del Manual que abre cada vista (Asistentes: la primera app, como siempre). */
const CARPETA_MANUAL: Partial<Record<VistaMenu, string>> = { amigos: 'amigos', lugares: 'sala', navegador: 'navegador' }
/** Última vista elegida (ajuste del dispositivo). */
const LS_VISTA = 'mh.chat.vista'
import { useFoco } from '../state/focoStore'

/**
 * Captura sin modelo con `RoomModule.capturar`. Cada app recibe SOLO sus
 * cláusulas, y una por una: si no, el primer número del mensaje se lo lleva
 * todo y el resto de entradas se pierde. Devuelve las apps que guardaron algo.
 */
async function capturarLocal(
  roomIds: string[],
  texto: string,
  fragmentos?: Record<string, string[]>,
): Promise<{ id: string; n: number }[]> {
  const hechos: { id: string; n: number }[] = []
  for (const rid of roomIds) {
    const app = getPlantilla(rid)
    if (!app?.capturar) continue
    let n = 0
    for (const entrada of fragmentos?.[rid] ?? [texto]) {
      if (await app.capturar(entrada)) n++
    }
    if (n > 0) hechos.push({ id: rid, n })
  }
  return hechos
}

/**
 * Espejo del módulo diferido de edición: `interpretarEdicionLocal` corre en un
 * useMemo POR TECLA y no puede esperar un await, así que el módulo (120 KB) se
 * descarga al primer texto escrito y el memo re-computa cuando aterriza.
 */
let editorLocal: typeof import('./editorAcciones') | null = null

/** Interpretación diferida para el envío: cierra el hueco de teclear+Enter muy rápido. */
async function interpretarEdicionDiferida(texto: string): Promise<EdicionLocal | null> {
  editorLocal ??= await import('./editorAcciones')
  const e = editorLocal.interpretarEdicionLocal(texto)
  return e?.soloSinIA && iaActiva() ? null : e
}
import { useT } from '../i18n/useT'
import { Icono } from '../ui/iconos/Icono'
import { IconoMarca } from '../ui/iconos/glifosApps'
import { LogoIA } from '../ui/iconos/logosIA'
import { useHud } from '../state/hudStore'
import { BotonPlegarHud } from '../ui/HudPlegable'
import { useTopeHud, anclajeChat } from '../ui/hudMedida'
import { vivo } from '../ui/estilos'
import { esDemo, iaHabilitada } from '../edicion'
import { ErrorIA, usarViaCuenta } from '../cuenta/api'
import { haySesionProbable, useSesion } from '../cuenta/sesionStore'
import { formatoBytes, formatoUso, refrescarUsoAlmacen, useAlmacen } from '../cuenta/almacen'
import { blobABase64, comprimirImagen } from '../imagenIA'
import { useMascaraUi } from '../state/mascaraUiStore'
import { useChatArUi } from '../state/chatArUiStore'
import { useDictado } from '../audio/useDictado'
import { PanelIA } from '../ui/PanelIA'
import { useBuzon } from '../buzon/buzonStore'
import { enviar as enviarBuzon } from '../buzon/motor'
import { mensajeErrorBuzon } from '../buzon/api'
import { contactosCache } from '../buzon/cache'
import { citar } from '../buzon/cita'
import { ejecutarComandoHilo } from '../buzon/comandoHilo'
import { ErrorBuzon, TOPE_MEDIA } from '../buzon/tipos'
import type { Paquete } from '../buzon/compartibles'
import { ListaAmigos } from '../buzon/ui/ListaAmigos'
import { useVistaGrafo } from '../grafoApps'
// Paneles del buzón: solo existen con una persona o el panel de contactos abiertos.
const ChatConversacionPersona = lazy(() =>
  import('../buzon/ui/ChatConversacionPersona').then((m) => ({ default: m.ChatConversacionPersona })),
)
const ContactosPanel = lazy(() => import('../buzon/ui/ContactosPanel').then((m) => ({ default: m.ContactosPanel })))
const SelectorCompartible = lazy(() =>
  import('../buzon/ui/SelectorCompartible').then((m) => ({ default: m.SelectorCompartible })),
)

/** Adjunto listo para previsualizar: para el modelo (imagen o PDF) o para una persona del buzón. */
interface AdjuntoLocal {
  tipo: 'imagen' | 'pdf' | 'audio' | 'video' | 'contenido'
  /** Para la IA; el buzón manda el `blob`. */
  base64?: string
  mediaType?: string
  nombre: string
  /** Miniatura del chip de preview (solo imagen). */
  dataUrl?: string
  /** El archivo tal cual, para mandarlo a una persona. */
  blob?: Blob
  /** Contenido de un cuarto elegido para el buzón. */
  paquete?: Paquete
}

/** Cuarto colocado en el mapa más cercano al avatar (para soltar objetos ahí). */
function cuartoMasCercano(): string | null {
  const placed = useLayout.getState().placed
  let mejor: string | null = null
  let mejorDist = Infinity
  for (const r of useCuartos.getState().cuartos) {
    if (!placed[r.id]) continue
    const [x, , z] = roomWorldPos(r.id)
    const d = (x - playerPos.x) ** 2 + (z - playerPos.z) ** 2
    if (d < mejorDist) {
      mejorDist = d
      mejor = r.id
    }
  }
  return mejor
}

/** Píldora de créditos y nube plegada (por dispositivo). */
const LS_MEDIDORES_PLEGADOS = 'mh.chat.medidoresPlegados'

/**
 * Chat box del "arquitecto" (orquestador), anclado abajo-centro.
 *
 * Funciones en capa SIN IA:
 *   1. Bitácora + etiqueta de cuarto (guarda texto con roomId detectado).
 *   2. Quick-capture: si el cuarto tiene `capturar()`, escribe en su tabla real.
 *   3. Comandos: "agregar/quitar <cuarto>" afectan el layout del mapa.
 *   4. Retag manual: ✏️ en una entrada → selector de cuarto.
 *   5. Mascota: una "cara y voz" (mago/gato/perro…) que responde cada mensaje.
 */
export function ChatBox({
  menuAbierto = false,
  encima = false,
}: {
  menuAbierto?: boolean
  /** Modo película: por encima del dock del Studio (z-60), para que sus menús salgan delante de la timeline. */
  encima?: boolean
}) {
  const t = useT()
  const [texto, setTexto] = useState('')
  const [abierto, setAbierto] = useState(false)
  const plegado = useHud((s) => s.plegado.chat)
  const movilVertical = useHud((s) => s.movilVertical)
  // Con el navegador embebido abierto el chat sube sobre su tira de pestañas (al pie).
  const navAbierto = useNavegador((s) => s.abierto)
  const [adjunto, setAdjunto] = useState<AdjuntoLocal | null>(null)
  // Mapa ofrecido tras una explicación: aquí solo se pinta si su conversación
  // NO está abierta (con el hilo abierto la oferta vive dentro, como un mensaje).
  const sugerencia = useSugerenciaMapa((s) => s.sugerencia)
  const dibujando = useSugerenciaMapa((s) => s.dibujando)
  const [menuModelo, setMenuModelo] = useState(false)
  // El panel de IA guarda en localStorage; este tick refresca el botón (emoji/punto).
  const [, setTickIA] = useState(0)
  const [menuAdjuntar, setMenuAdjuntar] = useState(false)
  // Selector de la barra (junto al «+»): elige la vista que abre el mago.
  const [menuVistas, setMenuVistas] = useState(false)
  const areaRef = useRef<HTMLTextAreaElement>(null)
  // Input propio para la cámara («Tomar foto» del menú + y el widget de Android):
  // `capture` en el input de galería se saltaría el selector de archivos.
  const camaraRef = useRef<HTMLInputElement>(null)
  // Los otros dos inputs del menú «+»: galería y PDF.
  const galeriaRef = useRef<HTMLInputElement>(null)
  const pdfRef = useRef<HTMLInputElement>(null)
  const mediaRef = useRef<HTMLInputElement>(null)
  // Medición de la barra para decidir si la caja de texto se lleva un renglón entero.
  const barraRef = useRef<HTMLDivElement>(null)
  const cajaRef = useRef<HTMLDivElement>(null)
  // Contenedor completo del chat: lo necesita el cierre por clic fuera.
  const raizRef = useRef<HTMLDivElement>(null)
  const medidorRef = useRef<HTMLSpanElement>(null)
  const anchoBarra = useRef(0)
  const [lineaPropia, setLineaPropia] = useState(false)
  const [medida, setMedida] = useState(0)
  // Barra del chat: publica su alto para que los prompts se apilen encima de ella.
  const refTope = useTopeHud('chat')
  const addRoomGround = useLayout((s) => s.addRoomGround)
  const placed = useLayout((s) => s.placed)
  const mascotaId = useMascota((s) => s.mascota)
  const hablar = useMascota((s) => s.decir)
  const irA = useMascota((s) => s.irA)
  const conversacion = useMascota((s) => s.conversacion)
  const abrirConversacion = useMascota((s) => s.abrirConversacion)
  const cerrarConversacion = useMascota((s) => s.cerrarConversacion)
  const setPensando = useMascota((s) => s.setPensando)
  const pensando = useMascota((s) => s.pensando)
  const asistentes = useAsistentes((s) => s.lista)
  // Buzón: hilo con una persona (excluyente con la conversación de un asistente).
  const hiloPersona = useBuzon((s) => s.hiloAbierto)
  const respuesta = useBuzon((s) => s.respuesta)
  const miAlias = useSesion((s) => s.alias)
  // Elegir «Responder» en una burbuja deja la barra lista para escribir.
  useEffect(() => {
    if (respuesta) areaRef.current?.focus()
  }, [respuesta])
  const noLeidos = useBuzon((s) => s.totalNoLeidos)
  const solicitudes = useBuzon((s) => s.solicitudesPendientes)
  const [selectorAbierto, setSelectorAbierto] = useState(false)
  // Vista de la barra del menú: Amigos (buzón), Asistentes, Lugares («Cómo llegar») o Navegador.
  // Sobrevive a entrar en un cuarto (el chat se desmonta): es la que abre el mago.
  const [vistaPanel, setVistaPanel] = useState<VistaMenu>(() => {
    if (useNavegador.getState().modoWeb) return 'navegador'
    const guardada = localStorage.getItem(LS_VISTA)
    return MENUS_CHAT.some((m) => m.id === guardada) ? (guardada as VistaMenu) : 'asistentes'
  })
  // Modo web (lo escrito va al navegador, URL o búsqueda, y no al asistente) =
  // la vista Navegador elegida.
  const modoWeb = vistaPanel === 'navegador'
  useEffect(() => {
    localStorage.setItem(LS_VISTA, vistaPanel)
    // El store lo refleja para que la siguiente página abierta (que lo enciende)
    // se note como un cambio y traiga la vista Navegador.
    useNavegador.getState().setModoWeb(modoWeb)
  }, [vistaPanel, modoWeb])
  // Dictado por voz compartido (nativo o fallback Whisper): ver audio/useDictado.
  const {
    soportado: vozSoportada,
    grabando,
    transcribiendo,
    toggle: toggleVoz,
  } = useDictado({ onTexto: setTexto, onError: (m) => hablar(m) })
  // Manual y ⚙ de la barra: se despliegan DENTRO del menú, para la vista activa.
  const [configAbierto, setConfigAbierto] = useState(false)
  const [manualAbierto, setManualAbierto] = useState(false)
  // La flecha al norte estira el menú a toda la pantalla (mapas, historiales y
  // el Manual se quedaban cortos en 60vh). Se mantiene entre aperturas.
  const [expandido, setExpandido] = useState(false)
  // Pestaña de la vista Navegador (historial, sitios, tiempo); sus ajustes van en el ⚙.
  const [pestanaNav, setPestanaNav] = useState<PestanaPanelNav>('historial')
  /** Abre el menú del chat en una vista; `sub` = su Manual o su ⚙. */
  const abrirMenu = (vista: VistaMenu, sub: 'menu' | 'manual' | 'config' = 'menu') => {
    setVistaPanel(vista)
    setManualAbierto(sub === 'manual')
    setConfigAbierto(sub === 'config')
    setAbierto(true)
  }
  /** «historial», «sitios», «tiempo en internet» o «ajustes del navegador»: la vista Navegador. */
  const abrirPanelNav = (p: PestanaNav) => {
    if (p !== 'ajustes') setPestanaNav(p)
    abrirMenu('navegador', p === 'ajustes' ? 'config' : 'menu')
  }
  // «Contactos» pedido desde el hilo de una persona: es el ⚙ de la vista Amigos.
  useEffect(
    () =>
      useBuzon.subscribe((s, prev) => {
        if (!s.panelContactos || prev.panelContactos) return
        useBuzon.getState().cerrarContactos()
        setVistaPanel('amigos')
        setManualAbierto(false)
        setConfigAbierto(true)
        setAbierto(true)
      }),
    [],
  )
  // Una ruta pedida desde fuera del chat (un lugar tocado en el grafo): la
  // atiende «Cómo llegar», que solo vive en la vista Lugares.
  useEffect(
    () =>
      useOrdenRuta.subscribe((s, prev) => {
        if (s.sello === prev.sello || !s.destino) return
        setVistaPanel('lugares')
        setManualAbierto(false)
        setConfigAbierto(false)
        setAbierto(true)
      }),
    [],
  )
  // La tira (o un atajo) pidió abrir la vista Navegador en una pestaña concreta.
  // Suscripción al store (no un efecto que llame a setState): se atiende también
  // lo pedido ANTES de montar, p. ej. desde dentro de un cuarto.
  useEffect(() => {
    const atender = (p: PestanaNav | null) => {
      if (!p) return
      useNavegador.getState().pedirPanel(null)
      if (p !== 'ajustes') setPestanaNav(p)
      setVistaPanel('navegador')
      setManualAbierto(false)
      setConfigAbierto(p === 'ajustes')
      setAbierto(true)
    }
    const pendiente = setTimeout(() => atender(useNavegador.getState().panelPedido), 0)
    const baja = useNavegador.subscribe((s, prev) => {
      if (s.panelPedido !== prev.panelPedido) atender(s.panelPedido)
      // Se abrió una página (o pestaña nueva / barra de dirección): el chat pasa a la vista Navegador.
      if (s.modoWeb && !prev.modoWeb) setVistaPanel('navegador')
    })
    return () => {
      clearTimeout(pendiente)
      baja()
    }
  }, [])
  // El hilo nace apartado (nunca se abre solo al arrancar la app) y, una vez
  // que lo abres, se queda así hasta que lo cierres con la ✕. Vive en el store
  // (no en useState local) para sobrevivir el desmontaje de este componente al
  // entrar/salir del editor: ver mascotaStore.ts.
  const hiloOculto = useMascota((s) => s.hiloOculto)
  const setHiloOculto = useMascota((s) => s.setHiloOculto)
  // «Agregar asistente» desplegado bajo los chats.
  const [agregando, setAgregando] = useState(false)
  const ultimos = useUltimosMensajes()
  // Contador de créditos bajo la caja: pool del mes restante + recargas. El
  // medidor se refresca solo tras cada llamada (api.ts::refrescarMedidor).
  const usoIA = useSesion((s) => s.usoIA)
  const creditosExtra = useSesion((s) => s.creditosExtra)
  // Tope -1 = cuenta ilimitada: no hay resta que hacer, el chip dice ∞.
  const creditosIlimitados = !!usoIA && usoIA.limiteCreditos < 0
  const creditosRestantes =
    Math.max(0, usoIA ? usoIA.limiteCreditos - usoIA.creditos : 0) + creditosExtra
  // Medidor de la nube (cuarto Archivo, R2) junto al de créditos. Se lee al
  // entrar con sesión; Archivo y las subidas lo refrescan después.
  const usuarioId = useSesion((s) => s.usuario?.id)
  const usoNube = useAlmacen((s) => s.uso)
  useEffect(() => {
    if (usuarioId && !esDemo()) void refrescarUsoAlmacen()
  }, [usuarioId])
  const verNube = !!usuarioId && !esDemo() && !!usoNube && (usoNube.cuota !== 0 || usoNube.usados > 0)
  // Créditos en el mismo formato corto que la nube: «450/700» (∞ sin tope).
  const verCreditos = usarViaCuenta() && (creditosIlimitados || !!usoIA || creditosExtra > 0)
  const creditosTotal = Math.max(0, usoIA?.limiteCreditos ?? 0) + creditosExtra
  // La píldora de medidores se pliega a sus iconos; se recuerda por dispositivo.
  const [medidoresPlegados, setMedidoresPlegados] = useState(() => {
    try {
      return localStorage.getItem(LS_MEDIDORES_PLEGADOS) === '1'
    } catch {
      return false
    }
  })
  const alternarMedidores = () =>
    setMedidoresPlegados((v) => {
      try {
        localStorage.setItem(LS_MEDIDORES_PLEGADOS, v ? '0' : '1')
      } catch {
        // Sin almacenamiento: el pliegue dura lo que la sesión.
      }
      return !v
    })
  const addObjeto = useDiseño((s) => s.addObjeto)
  const mascota = asistentes.find((a) => a.id === mascotaId) ?? asistentes[0]

  /** Con el menú lateral abierto se cierran los paneles del chat (ajuste en render, sin efecto). */
  const [prevMenuAbierto, setPrevMenuAbierto] = useState(false)
  if (menuAbierto !== prevMenuAbierto) {
    setPrevMenuAbierto(menuAbierto)
    if (menuAbierto) {
      setAbierto(false)
      setConfigAbierto(false)
    }
  }

  /**
   * ...y el chat queda plegado mientras dure (también al arrancar, que el menú ya
   * viene abierto); al cerrarlo vuelve a su barra. El plegado vive en el store del HUD.
   */
  useEffect(() => {
    // Abrir el menú lateral pliega el chat. Al cerrarlo, en escritorio vuelve a
    // su barra; en teléfono vertical se queda plegado (default minimalista).
    const hud = useHud.getState()
    if (menuAbierto) hud.setPlegado('chat', true)
    else if (!hud.movilVertical) hud.setPlegado('chat', false)
  }, [menuAbierto])

  /** Despliega el chat y pone el cursor en la caja (atajo T y widget del launcher). */
  const abrirParaEscribir = useCallback((alAbrir?: () => void) => {
    useHud.getState().setMenuAbierto(false)
    useHud.getState().setPlegado('chat', false)
    // Tras el render que despliega la barra: antes el textarea no existe.
    requestAnimationFrame(() => {
      areaRef.current?.focus()
      alAbrir?.()
    })
  }, [])

  // T abre el chat con el cursor puesto (convención de juego). Cierra el menú
  // lateral porque mientras está abierto el chat se queda plegado.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyT' || e.repeat || e.ctrlKey || e.altKey || e.metaKey) return
      if (escribiendoEnCampo() || hayCuartoAbierto()) return
      e.preventDefault()
      abrirParaEscribir()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [abrirParaEscribir])

  /**
   * La caja está anclada abajo: al ajustar el alto del textarea al contenido, el
   * texto crece HACIA ARRIBA y se lee completo lo que escribes (antes era un
   * input de una línea que solo se desplazaba). Tope de 8rem y luego scroll.
   *
   * Además, en cuanto el texto deja de caber en la ranura que le dejan los
   * botones, la caja se pasa al renglón completo de arriba (los botones bajan al
   * siguiente). La comparación se hace SIEMPRE contra el ancho de esa ranura
   * angosta (con el medidor invisible), también cuando ya está en su renglón: así
   * la decisión es estable y no parpadea entre las dos formas.
   */
  useLayoutEffect(() => {
    const el = areaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`

    const barra = barraRef.current
    const medidor = medidorRef.current
    if (!barra || !medidor) return
    let ocupado = 0
    for (const hijo of Array.from(barra.children)) {
      if (!(hijo instanceof HTMLElement) || hijo === cajaRef.current) continue
      if (!hijo.offsetWidth || getComputedStyle(hijo).position === 'absolute') continue
      ocupado += hijo.offsetWidth + 8 // gap-2
    }
    const cs = getComputedStyle(barra)
    const angosto =
      barra.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - ocupado
    setLineaPropia(medidor.offsetWidth > angosto)
  }, [texto, lineaPropia, medida])

  // Previsualización en vivo de a dónde irá la entrada.
  const interp = useMemo(() => interpretar(texto), [texto])
  // El intérprete de edición vive en el módulo diferido: se descarga al primer
  // texto escrito (una sola vez por sesión) y el flag re-computa el memo.
  const [editorListo, setEditorListo] = useState(() => editorLocal != null)
  useEffect(() => {
    if (editorLocal || !texto.trim()) return
    let vivo = true
    void import('./editorAcciones').then((m) => {
      editorLocal = m
      if (vivo) setEditorListo(true)
    })
    return () => {
      vivo = false
    }
  }, [texto])
  // Orden de edición de la casa detectada sin IA (pintar, tema, avatar, etc.).
  // Los atajos `soloSinIA` se dejan pasar al modelo cuando hay IA: él hace más
  // (p. ej. dibuja el mapa entero en vez de crearlo en blanco).
  const edicion = useMemo(() => {
    if (!editorListo || !editorLocal) return null
    const e = editorLocal.interpretarEdicionLocal(texto)
    return e?.soloSinIA && iaActiva() ? null : e
  }, [texto, editorListo])
  // Petición de ayuda/tutorial detectada sin IA («¿cómo funciona la cocina?»).
  const ayuda = useMemo(() => interpretarAyuda(texto), [texto])
  // El id detectado puede ser una APP (captura/recordar) o un CUARTO (comando):
  // sus ids son disjuntos, así que se resuelve probando ambos.
  const destino = interp.roomId ? getPlantilla(interp.roomId) ?? getCuarto(interp.roomId) : null
  const destinoCaptura = interp.roomId ? getPlantilla(interp.roomId) : null
  const objetoCat = interp.objeto ? getCatalogoItem(interp.objeto) : null
  // Color de marca del chip de interpretación (null = neutro). Con `texto-vivo` el
  // texto queda legible en claro y oscuro; el fondo es un tinte del mismo color.
  const chipColor =
    ayuda
      ? '#a78bfa'
      : edicion
        ? '#6ea8fe'
        : interp.objeto && objetoCat
          ? objetoCat.defaultColor
          : interp.comando === 'recordar'
            ? '#a78bfa'
            : destino
              ? destino.color
              : null

  /** Definición del formato de mapa ofrecido (ícono y nombre para el chip). */
  const defMapa = sugerencia
    ? (TIPOS_MAPA.find((d) => d.id === sugerencia.tipo) ?? TIPOS_MAPA[0])
    : null

  /** Hace hablar al asistente del hilo abierto (la respuesta sale por la burbuja flotante 3D). */
  const decir = (tipo: EventoTipo, cuarto?: string, objeto?: string, chips?: DestinoChat[]) => {
    const destinoId = useDialogo.getState().asistenteId ?? conversacion ?? mascotaId
    const quien = asistentes.find((a) => a.id === destinoId) ?? mascota
    hablar(responder(quien.forma, { tipo, cuarto, objeto }, t), { asistenteId: quien.id, destinos: chips })
    reaccionar(quien.id, EMOCION_POR_EVENTO[tipo])
  }

  /** Abre la conversación tipo chat con un asistente (cierra los otros paneles). */
  const abrirConv = (id: string) => {
    setAbierto(false)
    setConfigAbierto(false)
    useBuzon.getState().cerrarHilo()
    useBuzon.getState().cerrarContactos()
    setHiloOculto(false)
    abrirConversacion(id)
    void traerAsistente(id)
  }

  /** Comprime la foto elegida a 1280px (el tope que asume el proxy) y la deja lista. */
  const cargarImagen = async (file: File) => {
    const blob = await comprimirImagen(file, 1280)
    const base64 = await blobABase64(blob)
    setAdjunto({
      tipo: 'imagen',
      base64,
      mediaType: blob.type,
      nombre: file.name,
      dataUrl: `data:${blob.type};base64,${base64}`,
      blob,
    })
  }

  /** Deja el PDF listo (base64 tal cual). El tope evita el rechazo del proxy (~2 MB); al buzón van hasta 8. */
  const cargarPdf = (file: File) => {
    const topeMB = hiloPersona ? 8 : usarViaCuenta() ? 2 : 5
    if (file.size > topeMB * 1024 * 1024) {
      hablar(t('chat.pdfGrande', 'El PDF pesa más de {mb} MB, usa uno más ligero.', { mb: topeMB }))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setAdjunto({
        tipo: 'pdf',
        base64: dataUrl.slice(dataUrl.indexOf(',') + 1),
        mediaType: 'application/pdf',
        nombre: file.name,
        blob: file,
      })
    }
    reader.readAsDataURL(file)
  }

  /** Audio o video para una persona del buzón (la IA no los lee). */
  const cargarMedia = (file: File) => {
    const tipo = file.type.startsWith('video/') ? 'video' : 'audio'
    if (file.size > TOPE_MEDIA) {
      hablar(t('chat.mediaGrande', 'El archivo pesa más de {mb} MB, usa uno más ligero.', { mb: TOPE_MEDIA / 1024 / 1024 }))
      return
    }
    setAdjunto({ tipo, nombre: file.name, blob: file })
  }

  const proveedor = getProveedor()
  const conIA = iaActiva()
  // Imagen/PDF/foto piden IA… salvo que vayan a una persona del buzón.
  const adjuntable = conIA || hiloPersona != null

  // Los tres botones del widget de chat de Android. Reactivo (y no un efecto de
  // montaje) porque el toque puede llegar con la app viva y el chat ya montado.
  const accionWidget = useAccionGlobal((s) => s.pendiente)
  useEffect(() => {
    if (!accionWidget) return
    const accion = useAccionGlobal.getState().consumir()
    if (!accion) return
    if (accion === 'buzon') {
      abrirParaEscribir(() => {
        setVistaPanel('amigos')
        setManualAbierto(false)
        setConfigAbierto(false)
        setAbierto(true)
      })
      return
    }
    if (accion === 'chat-foto' && !conIA) {
      abrirParaEscribir()
      hablar(t('chat.fotoSinIa', 'Las fotos requieren IA: elige un modelo en el botón de la derecha'))
      return
    }
    abrirParaEscribir(() => {
      if (accion === 'chat-voz') toggleVoz()
      else if (accion === 'chat-foto') camaraRef.current?.click()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo dispara el cambio de acción
  }, [accionWidget])

  const nombreCorto = (roomId: string) =>
    (getPlantilla(roomId) ?? getCuarto(roomId))?.nombre.split(' · ')[0] ?? roomId
  /** Nombre corto traducido (para mostrar en la UI). */
  const nombreCortoT = (roomId: string) =>
    t(`room.${roomId}.nombre`, nombreCorto(roomId))
  /** Nombre corto del objetivo de una ayuda (app traducida o menú sin el prefijo "Menú ·"). */
  const nombreAyuda = (a: AyudaDetectada) =>
    (a.plantillaId
      ? nombreCortoT(a.plantillaId).split(' · ')[0]
      : (t(a.tutorial.titulo.clave, a.tutorial.titulo.es).split('·').pop() ?? '').trim()
    ).toLowerCase()

  const enviar = async () => {
    if (!interp.texto.trim() && !adjunto) return
    // Hilo con una persona: el mensaje va al buzón tal cual (sin IA, sin
    // dispatcher, sin bitácora). Acuse inmediato; el fallo lo cuenta el asistente.
    if (hiloPersona) {
      const txt = texto.trim()
      const adj = adjunto
      // «jugar ajedrez», «enviar receta Tacos», «colaborar documento Capítulo 1»:
      // órdenes para ESTA persona (ver `buzon/comandoHilo`). Con adjunto es un mensaje.
      if (!adj) {
        const r = await ejecutarComandoHilo(hiloPersona, txt, t, () => {
          sonar('tick')
          vibrar(10)
          setTexto('')
        })
        if (r) {
          if (r.abrirSelector) setSelectorAbierto(true)
          return
        }
      }
      // Respondiendo a un mensaje: la cita viaja como primera línea del texto.
      const resp = useBuzon.getState().respuesta
      const conCita = resp && resp.hiloId === hiloPersona ? citar(resp.cita, txt) : txt
      if (resp) useBuzon.getState().cancelarRespuesta()
      sonar('tick')
      vibrar(10)
      setTexto('')
      setAdjunto(null)
      void enviarBuzon(hiloPersona, {
        texto: conCita,
        adjunto:
          adj && adj.tipo !== 'contenido' && adj.blob
            ? { tipo: adj.tipo, blob: adj.blob, nombre: adj.nombre }
            : undefined,
        paquete: adj?.paquete,
      }).catch((e) => hablar(mensajeErrorBuzon(e, t), { sistema: true }))
      return
    }
    useSugerenciaMapa.getState().descartar() // la oferta anterior caduca con el mensaje nuevo
    // Hilo de destino: el diálogo cara a cara manda; luego la conversación abierta; si no, el activo.
    const destinoId = useDialogo.getState().asistenteId ?? conversacion ?? mascotaId
    // Acuse INMEDIATO de que el mensaje salió, antes de cualquier await: sonido,
    // vibración, burbuja "pensando…" y caja vacía. Dictar y esperar en silencio
    // varios segundos se sentía como que el envío no había ocurrido.
    sonar('tick')
    vibrar(10)
    setPensando(true, destinoId)
    setTexto('') // `interp` es del render actual: el resto de la función lo sigue viendo
    // Contexto para la IA: se lee ANTES de guardar el turno actual (evita duplicarlo).
    const historial = await ultimosMensajesAsistente(destinoId, 12)
    // El asistente activo se reubica al lugar desde donde le pediste algo.
    if (destinoId === mascotaId) irA(playerPos.x + 1.2, playerPos.z + 1.2)

    // Platicar con un asistente lo trae al mapa (y lo vuelve el que te sigue).
    void traerAsistente(destinoId)
    // Lo que escribes queda en la conversación del hilo abierto.
    mensajesChatRepo.add({
      asistenteId: destinoId,
      rol: 'usuario',
      texto: interp.texto.trim() || '📷 Foto',
      creado: new Date().toISOString(),
    })

    // Una página web tecleada (o «abre <url>»): se abre ahí mismo — navegador
    // embebido en el escritorio, hoja in-app en el teléfono, pestaña en la web.
    // Determinista y ANTES que el resto: una URL no es entrada de ninguna app.
    const urlChat = urlDeMensaje(interp.texto)
    if (urlChat) {
      hablar(t('enlace.chatAbriendo', 'Abriendo {h}…', { h: hostDe(urlChat) }), { asistenteId: destinoId })
      void abrirEnlace(urlChat)
      setTexto('')
      return
    }
    // «historial», «sitios», «tiempo en internet»…: el panel del navegador.
    const pestanaPedida = ordenNavegador(interp.texto)
    if (pestanaPedida) {
      abrirPanelNav(pestanaPedida)
      hablar(t('nav.chatAbriendoPanel', 'Aquí tienes tu navegador.'), { asistenteId: destinoId })
      return
    }
    // «amigos», «asistentes», «lugares» / «cómo llegar»: las otras vistas del menú.
    const vistaPedida = ordenMenu(interp.texto)
    if (vistaPedida) {
      abrirMenu(vistaPedida)
      hablar(t('chat.menu.abriendo', 'Aquí lo tienes.'), { asistenteId: destinoId })
      return
    }
    // «jugar paintball con @ana»: solicitud de juego con el enlace directo.
    // Determinista y en dos pasos: sin alias, el asistente pregunta con quién y
    // se queda esperando el «@alias» del mensaje siguiente.
    let jugar: OrdenJugar | null = null
    const juegoEnEspera = pendiente()
    if (juegoEnEspera) {
      const alias = aliasDeRespuesta(interp.texto)
      // Un alias suelto solo cuenta si lleva `@` o si de verdad es un contacto:
      // si no, «tenis» o «ana» taparían cualquier frase normal.
      const esRespuesta =
        alias &&
        (interp.texto.trim().startsWith('@') ||
          (await contactosCache()).some((c) => c.estado === 'aceptado' && c.alias === alias))
      if (esRespuesta) jugar = { juego: juegoEnEspera, alias }
      else limpiarPendiente()
    }
    jugar ??= ordenJugar(interp.texto)
    if (jugar) {
      const orden = jugar
      if (!orden.alias) {
        fijarPendiente(orden.juego)
        hablar(t('chat.jugar.conQuien', '¿Con quién? Escribe el @alias de tu amigo (o «amigos» para ver tu lista).'), {
          asistenteId: destinoId,
        })
        return
      }
      limpiarPendiente()
      if (!useSesion.getState().usuario && !haySesionProbable()) {
        hablar(mensajeErrorPartida(new ErrorPartida('sin-sesion'), t), { asistenteId: destinoId })
        return
      }
      const contacto = (await contactosCache()).find((c) => c.estado === 'aceptado' && c.alias === orden.alias)
      if (!contacto) {
        hablar(
          t('chat.jugar.sinContacto', 'No tienes un contacto aceptado con el alias @{a}. Revisa en Amigos.', {
            a: orden.alias,
          }),
          { asistenteId: destinoId },
        )
        return
      }
      try {
        hablar(await invitarAJugar(orden.juego, contacto, t), { asistenteId: destinoId })
      } catch (e) {
        hablar(e instanceof ErrorBuzon ? mensajeErrorBuzon(e, t) : mensajeErrorPartida(e, t), {
          asistenteId: destinoId,
          sistema: true,
        })
      }
      return
    }
    // «modo foco 25 min» / «fin del foco»: bloquear (o liberar) los sitios elegidos.
    const foco = ordenFoco(interp.texto)
    if (foco) {
      if (foco.accion === 'terminar') {
        useFoco.getState().terminar('manual')
        hablar(t('nav.foco.terminado', 'Modo foco terminado.'), { asistenteId: destinoId })
      } else {
        await useFoco.getState().activar(foco.min)
        hablar(t('nav.foco.iniciado', 'Modo foco durante {m} min: sin distracciones.', { m: useFoco.getState().duracionMin }), {
          asistenteId: destinoId,
        })
      }
      return
    }
    // Ruta en el mapa. «Llévame a X» se entiende desde CUALQUIER vista; con la
    // vista Lugares elegida basta el nombre del sitio, igual que en el modo web
    // basta el texto para buscar. Los comandos, el prefijo @app y los adjuntos
    // siguen ganando.
    const destinoRuta =
      adjunto || interp.motivo === 'prefijo'
        ? null
        : (rutaPedida(interp.texto) ??
          (vistaPanel === 'lugares' && !interp.comando ? destinoDeFrase(interp.texto) : null))
    if (destinoRuta && destinoRuta.length > 1) {
      abrirMenu('lugares')
      hablar(
        t('sala.nav.chatRuta', 'Voy a «{q}»: calculo la mejor ruta desde donde estás.', { q: destinoRuta }),
        { asistenteId: destinoId },
      )
      useOrdenRuta.getState().pedirRuta(destinoRuta)
      return
    }

    // «Busca en internet …» abre el buscador. En MODO WEB (la vista Navegador
    // elegida) también cualquier texto que no sea una orden del chat:
    // los comandos del arquitecto y el prefijo @app siguen ganando, y un adjunto
    // es siempre para la IA.
    const consulta =
      busquedaDeMensaje(interp.texto) ??
      (modoWeb && !adjunto && !interp.comando && interp.motivo !== 'prefijo' ? interp.texto.trim() : null)
    if (consulta) {
      hablar(t('nav.chatBuscando', 'Buscando «{q}»…', { q: consulta }), { asistenteId: destinoId })
      void abrirBusqueda(consulta)
      return
    }
    // Ayuda: «¿cómo funciona X?» contesta con el resumen; «tutorial de X» lanza
    // el tour del mago en pantalla. Determinista: funciona con y sin IA.
    if (ayuda) {
      if (ayuda.modo === 'tour') {
        hablar(t('tut.chat.abriendo', 'Ahí va: el mago te lo enseña en pantalla.'), { asistenteId: destinoId })
        // «tutorial de X» lanza el ESENCIAL de la app (corre aquí mismo); los
        // ejemplos y los tours del núcleo van por lanzarFlujo (saltan al año
        // de la casa demo con intent).
        const clave = ayuda.plantillaId ?? ayuda.claveFlujo
        if (ayuda.plantillaId && esEsencial(ayuda.tutorial)) void lanzarEsencial(ayuda.plantillaId)
        else if (clave) void lanzarFlujo(clave, ayuda.tutorial)
        else void useTutorial.getState().iniciar(ayuda.tutorial)
      } else {
        hablar(
          `${t(ayuda.tutorial.resumen.clave, ayuda.tutorial.resumen.es)} ${t(
            'tut.chat.ofrecer',
            'Escribe «tutorial de {n}» o pulsa su botón ? y te lo muestro en pantalla.',
            { n: nombreAyuda(ayuda) },
          )}`,
          { asistenteId: destinoId },
        )
      }
      setTexto('')
      return
    }

    // Crear objeto del catálogo en el cuarto más cercano al avatar.
    if (interp.objeto) {
      const item = getCatalogoItem(interp.objeto)
      const roomId = cuartoMasCercano()
      if (!item || !roomId) {
        hablar(t('chat.ed.sinCuartoObjeto', 'No hay ningún cuarto en el mapa donde colocarlo. Agrega uno primero.'), {
          asistenteId: destinoId,
        })
        setTexto('')
        return
      }
      await addObjeto(roomId, item.id, item.defaultColor)
      await bitacoraRepo.add({
        texto: interp.texto,
        roomId,
        creado: new Date().toISOString(),
        procesado: true,
      })
      decir('objeto', nombreCorto(roomId), t(`objeto.${item.id}`, item.nombre).toLowerCase())
      setTexto('')
      return
    }

    // Memoria del arquitecto: "recuerda que…" (puede no tener cuarto).
    if (interp.comando === 'recordar') {
      await guardarMemoria({ hecho: interp.texto, roomId: interp.roomId ?? undefined, asistenteId: destinoId })
      decir('recordado', interp.roomId ? nombreCorto(interp.roomId) : undefined)
      setTexto('')
      return
    }

    // Comandos del arquitecto: agregar (asegura colocación) / quitar (elimina) cuarto
    if (interp.comando && interp.roomId) {
      const nom = nombreCorto(interp.roomId)
      if (interp.comando === 'quitar') await useCuartos.getState().eliminar(interp.roomId)
      else await addRoomGround(interp.roomId)
      decir(interp.comando, nom)
      setTexto('')
      return
    }

    // Edición de la casa pedida por chat (pintar, tema, avatar…): funciona con o sin IA.
    // Si se tecleó y envió antes de que el import() del intérprete aterrizara, el memo
    // quedó null: se re-interpreta aquí esperando el módulo (solo si huele a edición).
    const edicionLista = edicion ?? (hayIntencionEditor([texto]) ? await interpretarEdicionDiferida(texto) : null)
    if (edicionLista) {
      const msg = await edicionLista.ejecutar()
      await bitacoraRepo.add({
        texto: interp.texto,
        creado: new Date().toISOString(),
        procesado: true,
      })
      const chip = destinoDeTool(edicionLista.tool)
      hablar(msg, { asistenteId: destinoId, mapaId: tomarUltimoMapa(), destinos: chip ? [chip] : undefined })
      reaccionar(destinoId, 'aprobacion')
      setTexto('')
      return
    }

    // Capa de IA: el modelo interpreta, registra vía esquemas y responde en
    // la voz de la mascota. Si falla (sin red, clave inválida), cae al
    // dispatcher determinista de abajo sin que el usuario pierda el mensaje.
    if (conIA) {
      try {
        const textoMsg =
          interp.texto.trim() ||
          (adjunto?.tipo === 'pdf' ? 'Resume y registra lo que contenga el documento.' : 'Registra lo que muestra la imagen.')
        let textoEnvio = textoMsg
        let adj = adjunto?.base64 && adjunto.mediaType ? { base64: adjunto.base64, mediaType: adjunto.mediaType } : null
        // Proveedor sin PDF nativo (ChatGPT/Ollama): el texto se extrae
        // aquí (pdfjs, lazy) y viaja dentro del mensaje, sin adjunto.
        if (adjunto?.tipo === 'pdf' && !pdfNativo()) {
          try {
            const { extraerTextoPdf } = await import('./pdf')
            textoEnvio = `${textoMsg}\n\nContenido del PDF «${adjunto.nombre}» (texto extraído):\n${await extraerTextoPdf(adjunto.base64 ?? '')}`
            adj = null
          } catch {
            setPensando(false)
            hablar(
              t('chat.pdfSinTexto', 'No pude leer texto en ese PDF (¿es escaneado?). Con Claude sí puedo verlo completo.'),
              { asistenteId: destinoId, sistema: true },
            )
            return
          }
        }
        let r = await interpretarIA(textoEnvio, destinoId, adj, historial, getAsistente(destinoId).respuestasRapidas === true)
        // Respuesta rápida: el proxy vio un registro simple y no llamó al modelo.
        // Se captura aquí; si ninguna app lo entiende, se pide al modelo de verdad.
        if (r.rapido) {
          const hechos = await capturarLocal(r.rapido, interp.texto, interp.fragmentos)
          if (hechos.length) {
            await bitacoraRepo.add({ texto: interp.texto, roomId: hechos[0].id, creado: new Date().toISOString(), procesado: true })
            decir(
              'capturado',
              hechos.map((h) => (h.n > 1 ? `${nombreCorto(h.id)} ×${h.n}` : nombreCorto(h.id))).join(' y '),
              undefined,
              hechos.map((h): DestinoChat => ({ tipo: 'app', appId: h.id })),
            )
            setTexto('')
            setAdjunto(null)
            return
          }
          r = await interpretarIA(textoEnvio, destinoId, adj, historial)
        }
        // La emoción etiquetada por el modelo; las ramas de evento (decir) pueden pisarla.
        reaccionar(destinoId, r.emocion)
        await bitacoraRepo.add({
          texto: interp.texto.trim() || (adjunto?.tipo === 'pdf' ? `📄 ${adjunto.nombre}` : '📷 Foto'),
          roomId: r.roomIds[0],
          creado: new Date().toISOString(),
          procesado: r.capturado || r.ediciones.length > 0 || !!r.creado3d || !!r.imagen,
        })
        // El mapa que haya dibujado el modelo cuelga de SU mensaje (miniatura),
        // igual que el chip de destino y la imagen generada en este turno.
        const opts = { asistenteId: destinoId, mapaId: tomarUltimoMapa(), destinos: r.destinos, imagen: r.imagen }
        if (r.creado3d) hablar(r.respuesta ?? t('chat.creado3d', 'Creé «{desc}»: lo puse en el mapa junto a mí y lo guardé en tu inventario 🧊', { desc: r.creado3d }), opts)
        // El modelo responde dando la imagen por hecha: si falló, hay que decirlo.
        else if (r.respuesta && r.imagenFallo) hablar(`${r.respuesta} ${t('chat.imagenFallo', 'No pude generar la imagen, inténtalo de nuevo.')}`, opts)
        else if (r.respuesta) hablar(r.respuesta, opts)
        else if (r.imagen) hablar(t('chat.imagenLista', '¡Listo! Aquí está tu imagen 🎨'), opts)
        else if (r.imagenFallo) hablar(t('chat.imagenFallo', 'No pude generar la imagen, inténtalo de nuevo.'), { ...opts, sistema: true })
        else if (r.rutinaCreada) hablar(t('chat.rutinaCreada', '⏰ Rutina «{n}» creada. La verás en el panel de rutinas.', { n: r.rutinaCreada }), opts)
        else if (r.ediciones.length) hablar(r.ediciones.join(' '), opts)
        else if (r.capturado) decir('capturado', r.roomIds.map(nombreCorto).join(' y '), undefined, r.destinos)
        else if (r.memoriaGuardada) decir('recordado')
        else decir('sinClasificar')
        // Charla de explicación con forma de mapa: ofrecerlo en el hilo de ese
        // asistente (sin dibujarlo aún: solo gasta IA si el usuario acepta).
        const charla = !r.capturado && !r.ediciones.length && !r.creado3d && !r.rutinaCreada && !r.imagen && !r.imagenFallo
        if (charla && r.respuesta) {
          useSugerenciaMapa.getState().ofrecer(textoMsg, r.respuesta, destinoId)
        }
        setTexto('')
        setAdjunto(null)
        return
      } catch (err) {
        // Sin plan o sin cuota: mensaje claro con CTA, no el fallback silencioso.
        if (err instanceof ErrorIA && (err.codigo === 'cuota-agotada' || err.codigo === 'sin-pro')) {
          hablar(
            err.codigo === 'cuota-agotada'
              ? t('chat.cuotaAgotada', 'Agotaste tu cuota de IA de este mes. Revisa tu uso en Editor → Configuraciones → Cuenta.')
              : t('chat.sinPro', 'Tu cuenta no tiene la suscripción activa.'),
            { asistenteId: destinoId, sistema: true },
          )
          setTexto('')
          setAdjunto(null)
          return
        }
        console.warn('[MPH] IA no disponible, usando dispatcher local:', err)
        setPensando(false)
        setAdjunto(null) // el dispatcher local no puede ver fotos ni PDFs
      }
    }
    if (!interp.texto.trim()) {
      setPensando(false) // única salida que no habla: apagar la burbuja a mano
      return // solo había foto y la IA falló
    }

    // Guardar en bitácora (con el cuarto principal detectado)
    const id = await bitacoraRepo.add({
      texto: interp.texto,
      roomId: interp.roomId ?? undefined,
      creado: new Date().toISOString(),
      procesado: false,
    })

    // Quick-capture: intentar escribir en TODOS los cuartos mencionados (multi-cuarto).
    if (interp.roomIds.length > 0) {
      const hechos = await capturarLocal(interp.roomIds, interp.texto, interp.fragmentos)
      if (hechos.length > 0) {
        await bitacoraRepo.update(id as number, { procesado: true })
        decir(
          'capturado',
          // El «×n» avisa de que cuajaron varias entradas en la misma app.
          hechos.map((h) => (h.n > 1 ? `${nombreCorto(h.id)} ×${h.n}` : nombreCorto(h.id))).join(' y '),
          undefined,
          hechos.map((h): DestinoChat => ({ tipo: 'app', appId: h.id })),
        )
      } else {
        decir('clasificado', interp.roomIds.map(nombreCorto).join(' y '))
      }
    } else {
      decir('sinClasificar')
    }

    setTexto('')
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviar()
    }
    if (e.key === 'Escape') (e.target as HTMLTextAreaElement).blur()
  }

  // Plegar el chat esconde TODO, también la conversación (es la forma de
  // recuperar la pantalla ahora que el hilo vive siempre sobre la barra). Se suma
  // `menuAbierto` sin esperar al efecto que sincroniza el store: si no, al abrir
  // el menú con el editor abierto (que desmonta y remonta este componente) el
  // primer render pinta la conversación un instante antes de que el efecto la pliegue.
  const chatPlegado = plegado || menuAbierto
  const otroPanel = abierto
  // Amigos y Asistentes son listas cortas: el menú se queda bajito; el resto (mapa,
  // historial, Manual, ⚙) necesita sitio.
  const menuCompacto = !manualAbierto && !configAbierto && !expandido && (vistaPanel === 'asistentes' || vistaPanel === 'amigos')
  // La vista elegida: la pinta el selector de la barra y es la que abre el mago.
  const menuElegido = MENUS_CHAT.find((m) => m.id === vistaPanel) ?? MENUS_CHAT[1]
  // Plegado en teléfono vertical: solo queda la carita, así que el contenedor se
  // encoge a su contenido (en vez de ancho completo invisible) para no tapar con
  // su z-20 los tiradores de las esquinas inferiores que quedan por debajo.
  const angostoMovil = chatPlegado && movilVertical
  // Menú a pantalla completa: la caja del chat se ancla también arriba y el panel
  // crece hasta llenarla, con la barra de escribir siempre al pie. Encogida a la
  // carita no aplica: ahí el menú no tiene dónde estirarse.
  const pantallaCompleta = abierto && expandido && !angostoMovil
  /**
   * El hilo con el asistente: SOLO si lo abriste tú desde la lista de chats. El
   * panel por defecto de la carita es el menú (Chats/Registros), no la
   * conversación: con el hilo siempre puesto, la barra quedaba enterrada bajo un
   * historial que casi nunca era el que buscabas.
   */
  const hiloVisible = conversacion != null && !otroPanel && !hiloOculto && !chatPlegado
  /** El hilo con una persona del buzón, en el mismo sitio que el del asistente. */
  const hiloPersonaVisible = hiloPersona != null && !otroPanel && !chatPlegado

  // Navegador embebido (escritorio): la página nativa tapa el DOM, así que con
  // cualquier panel del chat desplegado se esconde; y su borde inferior sigue al
  // borde superior de este chat (la tira de pestañas va debajo, por eso bottom-16).
  const panelChatAbierto = otroPanel || hiloVisible || hiloPersonaVisible || menuAdjuntar || menuModelo || menuVistas
  useEffect(() => {
    if (!navAbierto) return
    // Al destapar se espera un instante: el chat tiene que encogerse y medirse antes.
    const id = setTimeout(() => useNavegador.getState().setOculto('chat', panelChatAbierto), panelChatAbierto ? 0 : 60)
    return () => {
      clearTimeout(id)
      useNavegador.getState().setOculto('chat', false)
    }
  }, [navAbierto, panelChatAbierto])
  useEffect(() => {
    const el = raizRef.current
    if (!navAbierto || !el) return
    const medir = () =>
      useNavegador.getState().setTopeInferior(Math.max(0, Math.round(window.innerHeight - el.getBoundingClientRect().top)))
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => {
      ro.disconnect()
      useNavegador.getState().setTopeInferior(0)
    }
  }, [navAbierto])
  /** Cierra todo lo que el chat haya desplegado sobre su barra. */
  const cerrarPaneles = useCallback(() => {
    setAbierto(false)
    setConfigAbierto(false)
    setManualAbierto(false)
    setMenuModelo(false)
    setMenuAdjuntar(false)
    setMenuVistas(false)
    setSelectorAbierto(false)
    cerrarConversacion()
    setHiloOculto(true)
    useBuzon.getState().cerrarHilo()
    useBuzon.getState().cerrarContactos()
  }, [cerrarConversacion, setHiloOculto])
  /** Cierra solo el hilo de la persona: estable para el `memo` de su conversación. */
  const cerrarHiloPersona = useCallback(() => useBuzon.getState().cerrarHilo(), [])
  /** Cierra solo el hilo: estable para que `ChatConversacion` (memo) no se repinte por cada tecla. */
  const cerrarHilo = useCallback(() => {
    cerrarConversacion()
    setHiloOculto(true)
  }, [cerrarConversacion, setHiloOculto])

  /**
   * Jugar · Registrar · Crear del hilo del asistente: la frase va a la barra.
   * Con `enviarYa` sale sola en el render siguiente, cuando `interp` ya la leyó.
   */
  const enviarAlEscribir = useRef<string | null>(null)
  const usarFrase = useCallback((frase: string, enviarYa: boolean) => {
    enviarAlEscribir.current = enviarYa ? frase : null
    setTexto(frase)
    if (!enviarYa) requestAnimationFrame(() => areaRef.current?.focus())
  }, [])
  useEffect(() => {
    if (enviarAlEscribir.current === null || enviarAlEscribir.current !== texto) return
    enviarAlEscribir.current = null
    void enviar()
  })

  /**
   * Tocar fuera del chat cierra sus paneles (y Escape hace lo mismo). El
   * listener solo existe mientras hay algo abierto. El registro se difiere un
   * tick porque el propio clic que abrió el panel sigue propagándose (mismo
   * motivo que en `InteractOverlay`), y se ignora con un diálogo modal encima:
   * ese vive fuera del chat y cerrar por detrás dejaría la pregunta huérfana.
   */
  useEffect(() => {
    if (!otroPanel && !hiloVisible && !hiloPersonaVisible && !menuModelo && !menuAdjuntar && !menuVistas && !selectorAbierto) return
    const fuera = (e: PointerEvent) => {
      if (useConfirmar.getState().pendiente) return
      // `contains` LANZA si el target no es un Node (eventos que nacen en
      // window/document): sin la guarda el error sube al ErrorBoundary y se
      // lleva el chat por delante. Si no es un Node, desde luego no está dentro.
      if (e.target instanceof Node && raizRef.current?.contains(e.target)) return
      cerrarPaneles()
    }
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrarPaneles()
    }
    const timer = setTimeout(() => window.addEventListener('pointerdown', fuera), 0)
    window.addEventListener('keydown', escape)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('pointerdown', fuera)
      window.removeEventListener('keydown', escape)
    }
  }, [otroPanel, hiloVisible, hiloPersonaVisible, menuModelo, menuAdjuntar, menuVistas, selectorAbierto, cerrarPaneles])

  // Al cambiar el ANCHO de la barra (abrir el menú lateral, girar el teléfono…)
  // hay que rehacer la cuenta: la altura cambia sola al crecer el texto.
  useEffect(() => {
    const el = barraRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === anchoBarra.current) return
      anchoBarra.current = el.clientWidth
      setMedida((n) => n + 1)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [chatPlegado])
  return (
    <div
      ref={raizRef}
      className={
        // Plegado va centrado con `translate`, así que ahí no lleva los márgenes
        // laterales de la zona segura: descentrarían la barra.
        angostoMovil
          ? `safe-inf absolute ${navAbierto ? 'bottom-16' : 'bottom-4'} left-1/2 ${encima ? 'z-[70]' : 'z-20'} -translate-x-1/2 select-none`
          : [
              'safe-inf absolute min-w-0 select-none',
              navAbierto ? 'bottom-16' : 'bottom-4',
              // Con el menú abierto sube por encima de la capa del mapa (z-30):
              // las burbujas de los asistentes se quedan DETRÁS del panel.
              encima ? 'z-[70]' : abierto ? 'z-40' : 'z-20',
              pantallaCompleta
                ? // A pantalla completa manda el ancho entero (los offsets del
                  // joystick y del cubo ya no aplican: quedan tapados) y el alto
                  // se reparte con flex, así la barra de escribir no se va abajo.
                  'flex flex-col start-[calc(0.5rem+var(--safe-left))] end-[calc(0.5rem+var(--safe-right))] top-[calc(0.5rem+var(--safe-top))]'
                : `safe-ini safe-fin ${anclajeChat(menuAbierto)}`,
            ].join(' ')
      }
    >
      {/* Conversación con el asistente (estilo WhatsApp): siempre sobre la barra */}
      {hiloVisible && <ChatConversacion onCerrar={cerrarHilo} onUsar={usarFrase} />}
      {/* Las caras de los asistentes (busto 3D) se capturan aparte cuando cambian */}
      <CarasAsistentesAlDia />

      {/* Hilo con una persona (buzón): mismo sitio, otro origen de datos */}
      {hiloPersonaVisible && hiloPersona && (
        <Suspense fallback={null}>
          <ChatConversacionPersona hiloId={hiloPersona} onCerrar={cerrarHiloPersona} />
        </Suspense>
      )}

      {/* Elegir contenido de un cuarto para mandarlo a la persona del hilo */}
      {selectorAbierto && (
        <Suspense fallback={null}>
          <SelectorCompartible
            onElegir={(p) => {
              setAdjunto({ tipo: 'contenido', nombre: p.nombre, paquete: p })
              setSelectorAbierto(false)
            }}
            onCerrar={() => setSelectorAbierto(false)}
          />
        </Suspense>
      )}

      {/* Menú del chat: cuatro vistas a la izquierda (Amigos, Asistentes, Lugares y
          Navegador) y, a la derecha, el Manual y el ⚙ de la vista activa. Los dos
          se despliegan DENTRO del menú, así la barra de vistas nunca se va. */}
      {abierto && (
        <div
          className={`ui-panel-glass mb-2 flex flex-col rounded-2xl border border-white/10 p-2 shadow-xl backdrop-blur-md ${
            pantallaCompleta ? 'min-h-0 flex-1' : menuCompacto ? 'max-h-72' : 'max-h-[60vh]'
          }`}
        >
          <div className="mb-2 flex shrink-0 items-center gap-0.5 border-b border-white/10 px-0.5 pb-2 sm:gap-1 sm:px-1">
            {/* Las vistas ceden espacio (y se desplazan si no caben): los botones
                de la derecha nunca se salen del panel. El relleno (con margen
                negativo que lo compensa) deja sitio al anillo del botón activo y
                al globo de no leídos, que el `overflow` recortaría. */}
            <div className="sin-deslizador -my-2 -ms-1 flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto py-2 pe-1.5 ps-1 sm:gap-1">
            {MENUS_CHAT.map((m) => {
              const activo = vistaPanel === m.id
              return (
                <button
                  key={m.id}
                  type="button"
                  data-tut={`chat.menu.${m.id}`}
                  onClick={() => {
                    setVistaPanel(m.id)
                    setManualAbierto(false)
                    setConfigAbierto(false)
                  }}
                  aria-pressed={activo}
                  title={t(m.clave, m.es)}
                  className={`relative flex h-8 shrink-0 items-center gap-1 rounded-lg px-1.5 text-base transition sm:px-2 ${
                    activo ? 'bg-accent/20 text-accent ring-1 ring-accent/50' : 'text-white/45 hover:bg-white/10 hover:text-white/85'
                  }`}
                >
                  {m.id === 'asistentes' ? (
                    <IconoMarca glifo="asistentes" emoji={mascota.emoji} />
                  ) : (
                    <IconoMarca glifo={m.id} nombre={m.icono} />
                  )}
                  <span className="hidden text-[11px] font-semibold sm:inline">{t(m.clave, m.es)}</span>
                  {m.id === 'amigos' && noLeidos > 0 && (
                    <span className="pointer-events-none absolute -end-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[9px] font-black tabular-nums text-white">
                      {noLeidos}
                    </span>
                  )}
                </button>
              )
            })}
            </div>
            <button
              type="button"
              data-tut="chat.pantallaCompleta"
              onClick={() => setExpandido((v) => !v)}
              aria-pressed={expandido}
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-base transition ${
                expandido ? 'bg-accent/20 text-accent ring-1 ring-accent/50' : 'text-white/45 hover:bg-white/10 hover:text-white/85'
              }`}
              title={
                expandido
                  ? t('chat.menu.reducir', 'Volver al tamaño normal')
                  : t('chat.menu.expandir', 'Ver a pantalla completa')
              }
            >
              <Icono nombre={expandido ? 'bajar' : 'subir'} />
            </button>
            <button
              type="button"
              data-tut="chat.grafo"
              onClick={() => useVistaGrafo.getState().abrir(undefined, vistaPanel)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-base text-white/45 transition hover:bg-white/10 hover:text-white/85"
              title={t('grafo.deVista', 'Ver el grafo de esta vista')}
              aria-label={t('grafo.deVista', 'Ver el grafo de esta vista')}
            >
              <Icono nombre="nodos" />
            </button>
            <button
              type="button"
              data-tut="chat.manual"
              onClick={() => {
                setManualAbierto((v) => !v)
                setConfigAbierto(false)
              }}
              aria-pressed={manualAbierto}
              className={`flex h-8 shrink-0 items-center gap-1 rounded-lg px-1.5 text-base transition sm:px-2 ${
                manualAbierto ? 'bg-accent/20 text-accent ring-1 ring-accent/50' : 'text-white/45 hover:bg-white/10 hover:text-white/85'
              }`}
              title={t('chat.manual.abrir', 'Manual: qué puedes pedir')}
            >
              <Icono nombre="registros" />
              <span className="hidden text-[11px] font-semibold xl:inline">{t('chat.manual', 'Manual')}</span>
            </button>
            <button
              type="button"
              data-tut="chat.config"
              onClick={() => {
                setConfigAbierto((v) => !v)
                setManualAbierto(false)
              }}
              aria-pressed={configAbierto}
              className={`relative grid h-8 w-8 shrink-0 place-items-center rounded-lg text-base transition ${
                configAbierto ? 'bg-accent/20 text-accent ring-1 ring-accent/50' : 'text-white/45 hover:bg-white/10 hover:text-white/85'
              }`}
              title={
                vistaPanel === 'amigos'
                  ? t('buzon.contactos', 'Contactos')
                  : vistaPanel === 'asistentes'
                    ? t('chat.config.abrir', 'Configurar asistentes')
                    : vistaPanel === 'lugares'
                      ? t('sala.nav.prefs.titulo', 'Ajustes de «Cómo llegar»')
                      : t('nav.ajustes.titulo', 'Ajustes del navegador')
              }
            >
              <Icono nombre="ajustes" />
              {vistaPanel === 'amigos' && solicitudes > 0 && (
                <span className="pointer-events-none absolute -end-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-amber-500 px-1 text-[9px] font-black tabular-nums text-white">
                  {solicitudes}
                </span>
              )}
            </button>
          </div>

          {manualAbierto ? (
            /* Manual de comandos, abierto por la carpeta de la vista activa */
            <div className="min-h-0 flex-1 overflow-y-auto">
              <Suspense fallback={null}>
                <ManualComandos
                  // Cambiar de vista con el manual abierto lo remonta: así abre SU carpeta.
                  key={vistaPanel}
                  carpetaInicial={CARPETA_MANUAL[vistaPanel]}
                  onUsar={(frase) => {
                    setTexto(frase)
                    setManualAbierto(false)
                  }}
                />
              </Suspense>
            </div>
          ) : configAbierto ? (
            /* El ⚙ de cada vista: contactos del buzón, asistentes, «Cómo llegar» o el navegador */
            <div className="min-h-0 flex-1 overflow-y-auto">
              <Suspense fallback={null}>
                {vistaPanel === 'amigos' && (
                  <ContactosPanel
                    onAbrirHilo={(id) => {
                      setAbierto(false)
                      useBuzon.getState().abrirHilo(id)
                    }}
                  />
                )}
                {vistaPanel === 'asistentes' && <AsistentesConfig />}
                {vistaPanel === 'lugares' && <AjustesNavegacion />}
                {vistaPanel === 'navegador' && <TabAjustesNav />}
              </Suspense>
            </div>
          ) : vistaPanel === 'navegador' ? (
            /* Navegador: historial por página, sitios con categoría y tiempo */
            <Suspense fallback={null}>
              <PanelNavegador pestana={pestanaNav} onPestana={setPestanaNav} onCerrar={() => setAbierto(false)} />
            </Suspense>
          ) : vistaPanel === 'lugares' ? (
            /* «Cómo llegar»: el navegador multimodal de la sala de viajes */
            <div className="min-h-0 flex-1 overflow-y-auto">
              <Suspense fallback={null}>
                <PanelLugares />
              </Suspense>
            </div>
          ) : vistaPanel === 'amigos' ? (
            /* Amigos del buzón: cada uno con el busto de su personaje y su último mensaje */
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ListaAmigos
                onAbrir={(id) => {
                  setAbierto(false)
                  useBuzon.getState().abrirHilo(id)
                }}
                onContactos={() => setConfigAbierto(true)}
              />
            </div>
          ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Chats: los asistentes que están en el mapa (platicar con uno lo trae) */}
          {asistentes
            .filter((m) => enChat(m, mascotaId))
            .map((m) => {
              const u = ultimos?.[m.id]
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => abrirConv(m.id)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-start transition hover:bg-white/5"
                >
                  <CaraAsistente asistente={m} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-white/85">{nombreAsistente(t, m)}</span>
                      {u && (
                        <span className="shrink-0 text-[10px] text-white/35">
                          {new Date(u.creado).toLocaleTimeString(undefined, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-white/45">
                      {u
                        ? u.rol === 'usuario'
                          ? `${t('chat.tu', 'Tú')}: ${u.texto}`
                          : u.texto
                        : saludoAsistente(t, m)}
                    </p>
                  </div>
                </button>
              )
            })}

          {/* Agregar asistente: uno que no esté en el mapa, o crear otro en el ⚙ */}
          <div className="mt-1 border-t border-white/10 pt-1">
            <button
              type="button"
              data-tut="chat.agregarAsistente"
              onClick={() => setAgregando((v) => !v)}
              aria-expanded={agregando}
              className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-start text-sm text-white/60 transition hover:bg-white/5 hover:text-white/90"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-dashed border-white/25">
                <Icono nombre="agregar" />
              </span>
              {t('chat.agregarAsistente', 'Agregar asistente')}
            </button>
            {agregando && (
              <div className="flex flex-wrap gap-1 px-2 pb-1">
                {asistentes
                  .filter((m) => !enChat(m, mascotaId))
                  .map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setAgregando(false)
                        abrirConv(m.id)
                        hablar(saludoAsistente(t, m), { asistenteId: m.id })
                      }}
                      className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 py-0.5 pe-2.5 ps-0.5 text-xs text-white/75 transition hover:bg-white/15"
                    >
                      <CaraAsistente asistente={m} className="h-7 w-7" textoClase="text-base" />
                      {nombreAsistente(t, m)}
                    </button>
                  ))}
                <button
                  type="button"
                  onClick={() => {
                    setAgregando(false)
                    setConfigAbierto(true)
                  }}
                  className="flex items-center gap-1 rounded-full border border-dashed border-white/25 px-2.5 py-1 text-xs text-white/60 transition hover:bg-white/10"
                >
                  <Icono nombre="agregar" /> {t('chat.crearAsistente', 'Crear uno nuevo')}
                </button>
              </div>
            )}
          </div>
          </div>
          )}
        </div>
      )}

      {chatPlegado ? (
        <div ref={refTope} className={angostoMovil ? '' : 'flex justify-end'}>
          <button
            type="button"
            onClick={() => useHud.getState().setPlegado('chat', false)}
            title={`${nombreAsistente(t, mascota)} · ${t('chat.abrir', 'Abrir chat')}`}
            className="ui-hud relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 text-2xl shadow-xl transition hover:scale-105 hover:bg-white/10"
          >
            <CaraAsistente asistente={mascota} className="h-9 w-9" textoClase="text-2xl" />
            {/* Mensajes de personas sin leer (estilo BadgeMisiones) */}
            {noLeidos > 0 && (
              <span className="pointer-events-none absolute -end-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-black tabular-nums text-white shadow-lg">
                {noLeidos}
              </span>
            )}
          </button>
        </div>
      ) : (
        <div ref={refTope} className={pantallaCompleta ? 'shrink-0' : undefined}>
      {/* Mapa ofrecido tras una explicación (si el hilo se ve, lo pinta él) */}
      {sugerencia && defMapa && !dibujando && !hiloVisible && (
        <div className="ui-panel-glass mb-2 flex items-center gap-2 rounded-xl border border-white/10 py-1.5 ps-2.5 pe-1.5 shadow-xl backdrop-blur-md">
          <span className="shrink-0 text-base text-accent">
            <Icono nombre={defMapa.icono} />
          </span>
          <span className="min-w-0 flex-1 truncate text-[11px] text-white/60">
            {t('chat.mapa.ofrecer', '¿Te lo dibujo como {tipo} de «{tema}»?', {
              tipo: t(`ideas.tipo.${defMapa.id}`, defMapa.nombreEs).toLowerCase(),
              tema: sugerencia.tema,
            })}
          </span>
          <button
            type="button"
            onClick={() => void useSugerenciaMapa.getState().dibujar()}
            className="shrink-0 rounded-lg bg-accent px-2 py-1 text-[11px] font-semibold text-accent-ink transition hover:brightness-110"
          >
            {t('chat.mapa.dibujar', 'Dibujarlo')}
          </button>
          <button
            type="button"
            onClick={() => useSugerenciaMapa.getState().descartar()}
            className="shrink-0 px-1.5 text-xs text-white/40 transition hover:text-white/80"
            title={t('chat.mapa.descartar', 'Ahora no')}
          >
            ✕
          </button>
        </div>
      )}
      {dibujando && !hiloVisible && (
        <div className="ui-panel-glass mb-2 inline-flex items-center gap-2 rounded-xl border border-white/10 px-2.5 py-1.5 shadow-xl backdrop-blur-md">
          <span className="animate-pulse text-base text-accent">
            <Icono nombre="brillo" />
          </span>
          <span className="text-[11px] text-white/60">
            {t('chat.mapa.dibujando', 'Dibujando el mapa…')}
          </span>
        </div>
      )}

      {/* Respondiendo a un mensaje del hilo de una persona */}
      {respuesta && respuesta.hiloId === hiloPersona && (
        <div className="ui-panel-glass mb-2 flex items-center gap-2 rounded-xl border border-white/10 p-1.5 shadow-xl backdrop-blur-md">
          <span className="min-w-0 flex-1 border-s-2 border-emerald-400/70 ps-2">
            <span className="block text-[10px] font-semibold text-emerald-300/90">
              {t('buzon.respondiendo', 'Respondiendo a {n}', {
                n: respuesta.cita.autor === `@${miAlias}` ? t('buzon.tu', 'Tú') : respuesta.cita.autor,
              })}
            </span>
            <span className="block truncate text-[11px] text-white/55">{respuesta.cita.extracto}</span>
          </span>
          <button
            type="button"
            onClick={() => useBuzon.getState().cancelarRespuesta()}
            className="px-1.5 text-xs text-white/40 transition hover:text-white/80"
            title={t('chat.conv.cerrar', 'Cerrar')}
          >
            ✕
          </button>
        </div>
      )}

      {/* Adjunto (imagen o PDF: lo interpreta la IA al enviar) */}
      {adjunto && (
        <div className="ui-panel-glass mb-2 inline-flex items-center gap-2 rounded-xl border border-white/10 p-1.5 shadow-xl backdrop-blur-md">
          {adjunto.tipo === 'imagen' ? (
            <img src={adjunto.dataUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
          ) : (
            <span className="grid h-12 w-12 place-items-center rounded-lg bg-white/5 text-2xl">
              <Icono
                nombre={
                  adjunto.tipo === 'contenido' ? 'buzon' : adjunto.tipo === 'audio' ? 'musica' : adjunto.tipo === 'video' ? 'pelicula' : 'pdf'
                }
              />
            </span>
          )}
          <span className="max-w-40 truncate text-[11px] text-white/50">
            {adjunto.tipo === 'imagen' ? t('chat.fotoLista', 'Foto lista para enviar') : adjunto.nombre}
          </span>
          <button
            type="button"
            onClick={() => setAdjunto(null)}
            className="px-1.5 text-xs text-white/40 transition hover:text-white/80"
            title={t('chat.quitarAdjunto', 'Quitar adjunto')}
          >
            ✕
          </button>
        </div>
      )}

      {/* Barra de entrada, con el botón de plegar FUERA del panel (como los demás
          cuadrantes del HUD): en el extremo izquierdo, que el chat se recoge hacia
          la derecha. */}
      <div className="flex items-end gap-1">
        {/* Plegar el chat: deja solo la carita del asistente (como los cuadrantes del HUD). */}
        <BotonPlegarHud
          zona="chat"
          onPlegar={() => {
            setAbierto(false)
            setConfigAbierto(false)
            setManualAbierto(false)
          }}
          className="mb-3.5"
        />
      {/* items-end: al crecer el texto hacia arriba, los botones se quedan abajo.
          flex-wrap: en pantalla angosta —o cuando el texto ya no cabe entre los
          botones— la caja se lleva su propio renglón completo arriba (con los
          botones al lado quedaba de 3 caracteres de ancho y no se leía nada). */}
      <div ref={barraRef} data-tut="chat.caja" data-tut-zona="chat" className="ui-panel-glass relative flex min-w-0 flex-1 flex-wrap items-end gap-2 rounded-2xl border border-white/10 px-2.5 py-2 shadow-xl backdrop-blur-md">
        {/* Panel de IA: transporte (créditos/BYOK) + proveedor, cerebro, voz e imagen. */}
        {iaHabilitada() && menuModelo && (
          <div data-tut="chat.modelo.panel" className="ui-panel-glass absolute bottom-full end-0 mb-2 w-72 rounded-2xl border border-white/10 p-2 shadow-xl backdrop-blur-md">
            <p className="mb-1.5 px-1 text-[11px] font-semibold text-white/50">
              <Icono nombre="memoria" /> {t('chat.modelo.titulo', 'Modelo de IA de los asistentes')}
            </p>
            <PanelIA variante="chat" onCambio={() => setTickIA((n) => n + 1)} />
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            // Toggle limpio del menú: el segundo toque lo cierra. Al abrirlo se
            // apartan la conversación y los otros dos paneles. Abre la vista que
            // marque el selector de al lado (`vistaPanel`).
            setMenuVistas(false)
            if (abierto) {
              setAbierto(false)
              return
            }
            setConfigAbierto(false)
            setManualAbierto(false)
            cerrarConversacion()
            setAbierto(true)
          }}
          data-tut="chat.asistente"
          title={
            abierto
              ? t('chat.ocultar', 'Cerrar el menú')
              : `${nombreAsistente(t, mascota)} · ${t('chat.verMenu', 'abrir el menú')} · ${t(menuElegido.clave, menuElegido.es)}`
          }
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-2xl transition hover:scale-105 ${
            abierto || hiloVisible ? 'bg-accent/20' : 'bg-white/5 hover:bg-white/10'
          }`}
        >
          <IconoVistaChat
            vista={vistaPanel}
            asistente={asistentes.find((a) => a.id === conversacion) ?? mascota}
          />
        </button>

        {/* Menú del «+»: imagen/PDF/foto (piden IA) + máscara AR (sin IA) */}
        {menuAdjuntar && (
          <div data-tut="chat.adjuntar.menu" className="ui-panel-glass absolute bottom-full start-0 mb-2 w-60 rounded-2xl border border-white/10 p-2 shadow-xl backdrop-blur-md">
            <div className="space-y-1">
              {(
                [
                  { icono: 'imagen', texto: t('chat.menu.imagen', 'Subir imagen'), ref: galeriaRef },
                  { icono: 'pdf', texto: t('chat.menu.pdf', 'Subir PDF'), ref: pdfRef },
                  { icono: 'foto', texto: t('chat.menu.foto', 'Tomar foto'), ref: camaraRef },
                ] as const
              ).map((op) => (
                <button
                  key={op.icono}
                  type="button"
                  disabled={!adjuntable}
                  onClick={() => {
                    setMenuAdjuntar(false)
                    op.ref.current?.click()
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-semibold transition ${
                    adjuntable ? 'text-white/70 hover:bg-white/10' : 'cursor-not-allowed text-white/25'
                  }`}
                  title={adjuntable ? undefined : t('chat.fotoSinIa', 'Las fotos requieren IA: elige un modelo en el botón de la derecha')}
                >
                  <Icono nombre={op.icono} />
                  <span className="flex-1 text-start">{op.texto}</span>
                </button>
              ))}
              {/* Con una persona abierta: audio o video (sin IA de por medio) */}
              {hiloPersona && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuAdjuntar(false)
                    mediaRef.current?.click()
                  }}
                  className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/10"
                >
                  <Icono nombre="musica" />
                  <span className="flex-1 text-start">{t('buzon.menu.media', 'Audio o video')}</span>
                </button>
              )}
              {/* Con una persona abierta: una receta, una rutina… de tus cuartos */}
              {hiloPersona && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuAdjuntar(false)
                    setSelectorAbierto(true)
                  }}
                  className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/10"
                >
                  <Icono nombre="buzon" />
                  <span className="flex-1 text-start">{t('buzon.menu.contenido', 'Contenido de un cuarto')}</span>
                </button>
              )}
              <button
                type="button"
                data-tut="chat.adjuntar.mascara"
                onClick={() => {
                  cerrarPaneles()
                  useMascaraUi.getState().abrir()
                }}
                className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/10"
              >
                <Icono nombre="mascara" />
                <span className="flex-1 text-start">{t('chat.menu.mascara', 'Máscara AR')}</span>
              </button>
              <button
                type="button"
                data-tut="chat.adjuntar.chatAr"
                onClick={() => {
                  cerrarPaneles()
                  useChatArUi.getState().abrir()
                }}
                className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/10"
              >
                <Icono nombre="chat-ar" />
                <span className="flex-1 text-start">{t('chat.menu.chatAr', 'Chat AR')}</span>
              </button>
            </div>
          </div>
        )}

        {/* Adjuntar: imagen, PDF, foto de cámara o entrar a la máscara AR */}
        <button
          type="button"
          data-tut="chat.foto"
          onClick={() => {
            setMenuModelo(false)
            setMenuVistas(false)
            setMenuAdjuntar((v) => !v)
          }}
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-2xl font-light leading-none transition hover:bg-white/10 ${
            menuAdjuntar ? 'bg-white/10 text-white/85' : 'text-white/45 hover:text-white/85'
          }`}
          title={t('chat.adjuntar', 'Adjuntar imagen o PDF, tomar foto o abrir la máscara AR')}
        >
          +
        </button>
        {/* Selector de vistas: las mismas cuatro de la barra del menú (comparten
            `vistaPanel`), así el botón de al lado abre —y pinta— la elegida aquí.
            Navegador elegido = modo web encendido. */}
        {menuVistas && (
          <div data-tut="chat.vistas.menu" className="ui-panel-glass absolute bottom-full start-0 mb-2 w-56 rounded-2xl border border-white/10 p-2 shadow-xl backdrop-blur-md">
            <div className="space-y-1">
              {MENUS_CHAT.map((m) => {
                const activo = vistaPanel === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    data-tut={`chat.vistas.${m.id}`}
                    onClick={() => {
                      setVistaPanel(m.id)
                      setManualAbierto(false)
                      setConfigAbierto(false)
                      setMenuVistas(false)
                    }}
                    aria-pressed={activo}
                    className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-xs font-semibold transition ${
                      activo
                        ? 'border-accent/50 bg-accent/20 text-accent'
                        : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <IconoMarca glifo={m.id} nombre={m.icono} />
                    <span className="flex-1 text-start">{t(m.clave, m.es)}</span>
                    {m.id === 'amigos' && noLeidos > 0 && (
                      <span className="grid h-4 min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[9px] font-black tabular-nums text-white">
                        {noLeidos}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
        <button
          type="button"
          data-tut="chat.vistas"
          onClick={() => {
            setMenuModelo(false)
            setMenuAdjuntar(false)
            setMenuVistas((v) => !v)
          }}
          aria-expanded={menuVistas}
          className={`-ms-2 grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg leading-none transition hover:bg-white/10 ${
            menuVistas ? 'bg-white/10 text-white/85' : 'text-white/45 hover:text-white/85'
          }`}
          title={`${t('chat.menu.cambiar', 'Cambiar de menú')} · ${t(menuElegido.clave, menuElegido.es)}`}
        >
          <IconoMarca glifo={menuElegido.id} nombre={menuElegido.icono} />
        </button>
        <input
          ref={galeriaRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) cargarImagen(f)
            e.target.value = ''
          }}
        />
        <input
          ref={pdfRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) cargarPdf(f)
            e.target.value = ''
          }}
        />

        <input
          ref={mediaRef}
          type="file"
          accept="audio/*,video/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) cargarMedia(f)
            e.target.value = ''
          }}
        />

        {/* Cámara directa: no tiene botón en la barra, la dispara el widget de Android. */}
        <input
          ref={camaraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) cargarImagen(f)
            e.target.value = ''
          }}
        />

        <div
          ref={cajaRef}
          className={`relative order-first w-full min-w-0 overflow-hidden ${
            lineaPropia ? '' : 'sm:order-none sm:w-auto sm:flex-1'
          }`}
        >
          {/* Medidor invisible: da el ancho real del texto en una sola línea. */}
          <span
            ref={medidorRef}
            aria-hidden
            className="pointer-events-none invisible absolute start-0 top-0 whitespace-pre text-sm leading-snug"
          >
            {texto}
          </span>
          <textarea
            ref={areaRef}
            data-tut="chat.input"
            rows={1}
            value={texto}
            onChange={(ev) => setTexto(ev.target.value)}
            onKeyDown={onKeyDown}
            // Caja limpia: sin frase de ayuda y sin deslizador (crece sola hasta 8rem).
            className="sin-deslizador block max-h-32 w-full resize-none overflow-y-auto bg-transparent py-1.5 text-sm leading-snug text-white/90 focus:outline-none"
          />
        </div>

        {/* Chip de destino, comando u objeto en vivo. En teléfono no se pinta: al
            aparecer al escribir reacomodaba los botones en dos filas. */}
        {texto.trim() && (
          <span
            className={`hidden shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold sm:flex ${chipColor ? 'texto-vivo' : ''}`}
            style={
              chipColor
                ? { ...vivo(chipColor), backgroundColor: `color-mix(in srgb, ${chipColor} 15%, transparent)` }
                : {
                    backgroundColor: 'color-mix(in srgb, var(--ui-ink) 6%, transparent)',
                    color: 'color-mix(in srgb, var(--ui-ink) 45%, transparent)',
                  }
            }
          >
            {ayuda ? (
              <span className="max-w-[12rem] truncate">
                <span className="font-bold">?</span>{' '}
                {ayuda.modo === 'tour'
                  ? t('tut.chat.chipTour', 'Tutorial: {n}', { n: nombreAyuda(ayuda) })
                  : t('tut.chat.chipAyuda', 'Ayuda: {n}', { n: nombreAyuda(ayuda) })}
              </span>
            ) : edicion ? (
              <span className="max-w-[12rem] truncate">{edicion.resumen}</span>
            ) : interp.objeto && objetoCat ? (
              <>
                <span><Icono emoji={objetoCat.icon} /></span>
                <span>{t('chat.chip.crear', 'Crear')} {t(`objeto.${objetoCat.id}`, objetoCat.nombre).toLowerCase()}</span>
              </>
            ) : interp.comando === 'recordar' ? (
              <>
                <span><Icono nombre="memoria" /></span>
                <span>{t('chat.chip.recordar', 'Recordar')}</span>
              </>
            ) : interp.comando ? (
              <>
                <span><Icono nombre={interp.comando === 'agregar' ? 'agregar' : 'quitar'} /></span>
                <span>{destino ? nombreCortoT(destino.id) : '?'}</span>
                {destino && (
                  <span className="ms-0.5 text-[10px] opacity-60">
                    {placed[destino.id] ? t('chat.chip.enMapa', '(en mapa)') : t('chat.chip.fuera', '(fuera)')}
                  </span>
                )}
              </>
            ) : (
              <>
                <span><Icono emoji={destino ? destino.icon : '🗒️'} /></span>
                <span className="max-w-[7rem] truncate">
                  {destino ? nombreCortoT(destino.id) : t('chat.sinClasificar', 'Sin clasificar')}
                </span>
                {destinoCaptura?.capturar && <span className="ms-0.5 text-[10px] opacity-60"><Icono nombre="energia" /></span>}
              </>
            )}
          </span>
        )}

        {/* Grupo pegado a la derecha (ms-auto): cuando la caja se lleva su renglón,
            dictado/modelo/enviar quedan en la orilla y plegar y el asistente en la
            otra. En una sola fila no cambia nada: la caja ya se come el hueco. */}
        <div className="ms-auto flex shrink-0 items-center gap-2">
          {/* Dictado por voz: nativo, o fallback de Whisper si no hay SpeechRecognition */}
          {vozSoportada && (
            <button
              type="button"
              data-tut="chat.voz"
              onClick={toggleVoz}
              disabled={transcribiendo}
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg transition ${
                grabando
                  ? 'animate-pulse bg-red-500/20 text-red-400'
                  : transcribiendo
                    ? 'animate-pulse bg-white/10 text-white/45'
                    : 'text-white/45 hover:bg-white/10 hover:text-white/85'
              }`}
              title={
                grabando
                  ? t('chat.vozParar', 'Detener dictado')
                  : transcribiendo
                    ? t('chat.vozTranscribiendo', 'Transcribiendo…')
                    : t('chat.voz', 'Dictar por voz')
              }
            >
              <Icono nombre="microfono" />
            </button>
          )}

          {/* Modelo de IA (solo Pro / pruebas internas) */}
          {iaHabilitada() && (
            <button
              type="button"
              data-tut="chat.modelo"
              onClick={() => {
                setMenuAdjuntar(false)
                setMenuVistas(false)
                setMenuModelo((v) => !v)
              }}
              className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg transition hover:bg-white/10 ${
                menuModelo ? 'bg-white/10' : ''
              }`}
              title={t('chat.modelo', 'Modelo de IA: {prov}', { prov: proveedor.nombre })}
            >
              <LogoIA prov={proveedor.id} />
              <span
                className={`absolute end-1 top-1 h-1.5 w-1.5 rounded-full ${
                  conIA ? 'bg-accent' : 'bg-white/20'
                }`}
              />
            </button>
          )}

          <button
            type="button"
            onClick={enviar}
            disabled={(pensando && !hiloPersona) || (!interp.texto.trim() && !adjunto)}
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent text-lg text-accent-ink transition hover:bg-accent disabled:opacity-30 ${
              pensando && !hiloPersona ? 'animate-pulse' : ''
            }`}
            title={
              hiloPersona
                ? t('buzon.enviar', 'Enviar')
                : pensando
                  ? t('chat.enviando', 'Enviado, preparando la respuesta…')
                  : t('chat.registrar', 'Registrar')
            }
          >
            <Icono nombre="enviar" />
          </button>
        </div>
      </div>
      </div>
      {/* Contador de créditos de IA, bajo la caja y a la derecha. Solo si la IA
          sale por créditos (no BYOK) y de verdad queda algo que gastar. */}
      {(verCreditos || verNube) && (
        <div className="mt-1 flex justify-end">
          <button
            type="button"
            onClick={alternarMedidores}
            aria-expanded={!medidoresPlegados}
            title={
              medidoresPlegados
                ? t('chat.medidores.mostrar', 'Mostrar créditos y nube')
                : t('chat.medidores.plegar', 'Plegar créditos y nube')
            }
            className="ui-panel-glass flex items-center gap-2 rounded-lg border border-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/50 shadow-xl backdrop-blur-md transition hover:text-white/70"
          >
            {verNube && usoNube && (
              <span>
                <Icono nombre="nube" />
                {!medidoresPlegados && (
                  <>
                    {' '}
                    {usoNube.cuota == null
                      ? t('chat.nube.sinTope', 'Nube: {usados}', { usados: formatoBytes(usoNube.usados) })
                      : t('chat.nube', 'Nube: {uso}', { uso: formatoUso(usoNube.usados, usoNube.cuota) })}
                  </>
                )}
              </span>
            )}
            {verCreditos && (
              <span>
                <Icono nombre="brillo" />
                {!medidoresPlegados && (
                  <>
                    {' '}
                    {t('chat.creditos', 'Créditos: {n}', {
                      n: creditosIlimitados ? '∞' : `${creditosRestantes}/${creditosTotal}`,
                    })}
                  </>
                )}
              </span>
            )}
            <Icono nombre={medidoresPlegados ? 'izquierda' : 'derecha'} className="text-white/35" />
          </button>
        </div>
      )}
        </div>
      )}
    </div>
  )
}
