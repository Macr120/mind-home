import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { getPlantilla } from '../registry'
import { abrirBusqueda, abrirEnlace, busquedaDeMensaje, hostDe, urlDeMensaje } from '../enlaces'
import { useNavegador } from '../state/navegadorStore'
import { getCuarto, useCuartos } from '../state/cuartosStore'
import { bitacoraRepo, memoriasRepo, mensajesChatRepo, ultimosMensajesAsistente, useUltimosMensajes } from '../data/repository'
import { useLayout, roomWorldPos } from '../state/layoutStore'
import { useMascota } from '../state/mascotaStore'
import { useDialogo } from '../state/dialogoStore'
import { useConfirmar } from '../state/confirmarStore'
import { useDiseño } from '../state/disenoStore'
import { useAccionGlobal } from '../state/accionGlobal'
import { playerPos } from '../state/houseStore'
import { getCatalogoItem } from '../house/catalogo'
import { escribiendoEnCampo, hayCuartoAbierto } from '../house/movement'
import { interpretar, appsAsignadas } from './dispatcher'
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
import { useAsistentes } from '../state/asistentesStore'
import { ChatConversacion } from './ChatConversacion'
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
import { ordenFoco, ordenNavegador, type PestanaNav } from '../navegador/ordenes'
import { useFoco } from '../state/focoStore'

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
import { LogoIA } from '../ui/iconos/logosIA'
import { useHud } from '../state/hudStore'
import { BotonPlegarHud } from '../ui/HudPlegable'
import { useTopeHud, anclajeChat } from '../ui/hudMedida'
import { vivo } from '../ui/estilos'
import { iaHabilitada } from '../edicion'
import { ErrorIA, usarViaCuenta } from '../cuenta/api'
import { useSesion } from '../cuenta/sesionStore'
import { blobABase64, comprimirImagen } from '../imagenIA'
import { useMascaraUi } from '../state/mascaraUiStore'
import { useChatArUi } from '../state/chatArUiStore'
import { useDictado } from '../audio/useDictado'
import { PanelIA } from '../ui/PanelIA'
import { useBuzon } from '../buzon/buzonStore'
import { enviar as enviarBuzon } from '../buzon/motor'
import { mensajeErrorBuzon } from '../buzon/api'
import type { Paquete } from '../buzon/compartibles'
import { ListaAmigos } from '../buzon/ui/ListaAmigos'
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
  tipo: 'imagen' | 'pdf' | 'contenido'
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
  // Modo web: lo escrito va al navegador (URL o búsqueda), no al asistente.
  const modoWeb = useNavegador((s) => s.modoWeb)
  // Con el navegador embebido abierto el chat sube sobre su tira de pestañas (al pie).
  const navAbierto = useNavegador((s) => s.abierto)
  const [retagId, setRetagId] = useState<number | null>(null)
  const [adjunto, setAdjunto] = useState<AdjuntoLocal | null>(null)
  // Mapa ofrecido tras una explicación: aquí solo se pinta si su conversación
  // NO está abierta (con el hilo abierto la oferta vive dentro, como un mensaje).
  const sugerencia = useSugerenciaMapa((s) => s.sugerencia)
  const dibujando = useSugerenciaMapa((s) => s.dibujando)
  const [menuModelo, setMenuModelo] = useState(false)
  // El panel de IA guarda en localStorage; este tick refresca el botón (emoji/punto).
  const [, setTickIA] = useState(0)
  const [menuAdjuntar, setMenuAdjuntar] = useState(false)
  const areaRef = useRef<HTMLTextAreaElement>(null)
  // Input propio para la cámara («Tomar foto» del menú + y el widget de Android):
  // `capture` en el input de galería se saltaría el selector de archivos.
  const camaraRef = useRef<HTMLInputElement>(null)
  // Los otros dos inputs del menú «+»: galería y PDF.
  const galeriaRef = useRef<HTMLInputElement>(null)
  const pdfRef = useRef<HTMLInputElement>(null)
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
  // Solo se pintan las 15 más recientes: acotar la consulta al índice evita
  // materializar la bitácora entera en cada mensaje enviado.
  const entradas = bitacoraRepo.useAll({ limit: 15 })
  const memorias = memoriasRepo.useAll()
  const addRoomGround = useLayout((s) => s.addRoomGround)
  const placed = useLayout((s) => s.placed)
  const mascotaId = useMascota((s) => s.mascota)
  const setMascota = useMascota((s) => s.setMascota)
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
  const contactosAbierto = useBuzon((s) => s.panelContactos)
  const noLeidos = useBuzon((s) => s.totalNoLeidos)
  const solicitudes = useBuzon((s) => s.solicitudesPendientes)
  const [selectorAbierto, setSelectorAbierto] = useState(false)
  // El panel del menú alterna entre los asistentes (con sus pestañas) y los amigos del buzón.
  const [vistaPanel, setVistaPanel] = useState<'asistentes' | 'amigos'>('asistentes')
  // Dictado por voz compartido (nativo o fallback Whisper): ver audio/useDictado.
  const {
    soportado: vozSoportada,
    grabando,
    transcribiendo,
    toggle: toggleVoz,
  } = useDictado({ onTexto: setTexto, onError: (m) => hablar(m) })
  const [configAbierto, setConfigAbierto] = useState(false)
  const [manualAbierto, setManualAbierto] = useState(false)
  // Panel «Navegador» (historial, sitios, tiempo, ajustes), como el Manual.
  const [navegadorAbierto, setNavegadorAbierto] = useState(false)
  const [pestanaNav, setPestanaNav] = useState<PestanaNav>('historial')
  const abrirPanelNav = (p: PestanaNav) => {
    setPestanaNav(p)
    setAbierto(false)
    setConfigAbierto(false)
    setManualAbierto(false)
    setNavegadorAbierto(true)
  }
  // La tira (o un atajo) pidió abrir el panel «Navegador» en una pestaña concreta.
  // Suscripción al store (no un efecto que llame a setState): se atiende también
  // lo pedido ANTES de montar, p. ej. desde dentro de un cuarto.
  useEffect(() => {
    const atender = (p: PestanaNav | null) => {
      if (!p) return
      useNavegador.getState().pedirPanel(null)
      setPestanaNav(p)
      setAbierto(false)
      setConfigAbierto(false)
      setManualAbierto(false)
      setNavegadorAbierto(true)
    }
    const pendiente = setTimeout(() => atender(useNavegador.getState().panelPedido), 0)
    const baja = useNavegador.subscribe((s, prev) => {
      if (s.panelPedido !== prev.panelPedido) atender(s.panelPedido)
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
  // Pestaña del panel: chats (con quién platicaste) o registros de la bitácora.
  const [pestana, setPestana] = useState<'chats' | 'registros'>('chats')
  const ultimos = useUltimosMensajes()
  // Contador de créditos bajo la caja: pool del mes restante + recargas. El
  // medidor se refresca solo tras cada llamada (api.ts::refrescarMedidor).
  const usoIA = useSesion((s) => s.usoIA)
  const creditosExtra = useSesion((s) => s.creditosExtra)
  // Tope -1 = cuenta ilimitada: no hay resta que hacer, el chip dice ∞.
  const creditosIlimitados = !!usoIA && usoIA.limiteCreditos < 0
  const creditosRestantes =
    Math.max(0, usoIA ? usoIA.limiteCreditos - usoIA.creditos : 0) + creditosExtra
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
        setPestana('chats')
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
      sonar('tick')
      vibrar(10)
      setTexto('')
      setAdjunto(null)
      void enviarBuzon(hiloPersona, {
        texto: txt,
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
    // «Busca en internet …» abre el buscador. En MODO WEB (botón 🌐, o el
    // navegador abierto) también cualquier texto que no sea una orden del chat:
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
      await memoriasRepo.add({
        hecho: interp.texto,
        roomId: interp.roomId ?? undefined,
        creado: new Date().toISOString(),
        vigente: true,
      })
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
        const r = await interpretarIA(textoEnvio, destinoId, adj, historial)
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
      const capturados: string[] = []
      const destinosLocal: DestinoChat[] = []
      for (const rid of interp.roomIds) {
        const app = getPlantilla(rid)
        if (!app?.capturar) continue
        // Cada app recibe SOLO sus cláusulas, y una por una: si no, el primer
        // número del mensaje se lo lleva todo y el resto de entradas se pierde.
        let n = 0
        for (const entrada of interp.fragmentos?.[rid] ?? [interp.texto]) {
          if (await app.capturar(entrada)) n++
        }
        if (n > 0) {
          // El «×n» avisa de que cuajaron varias entradas en la misma app.
          capturados.push(n > 1 ? `${nombreCorto(rid)} ×${n}` : nombreCorto(rid))
          destinosLocal.push({ tipo: 'app', appId: rid })
        }
      }
      if (capturados.length > 0) {
        await bitacoraRepo.update(id as number, { procesado: true })
        decir('capturado', capturados.join(' y '), undefined, destinosLocal)
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

  // Retag: asigna una app a una entrada y reintenta quick-capture
  const retag = async (entradaId: number, roomId: string) => {
    const app = getPlantilla(roomId)
    if (!app) return
    const entrada = entradas?.find((e) => e.id === entradaId)
    if (!entrada) return

    let procesado = false
    if (app.capturar) procesado = await app.capturar(entrada.texto)
    await bitacoraRepo.update(entradaId, { roomId, procesado })
    setRetagId(null)
    decir(
      procesado ? 'capturado' : 'clasificado',
      nombreCorto(roomId),
      undefined,
      procesado ? [{ tipo: 'app', appId: roomId }] : undefined,
    )
  }

  const recientes = entradas?.slice(0, 15) ?? []
  const memoriasVigentes = memorias?.filter((m) => m.vigente) ?? []
  // Plegar el chat esconde TODO, también la conversación (es la forma de
  // recuperar la pantalla ahora que el hilo vive siempre sobre la barra). Se suma
  // `menuAbierto` sin esperar al efecto que sincroniza el store: si no, al abrir
  // el menú con el editor abierto (que desmonta y remonta este componente) el
  // primer render pinta la conversación un instante antes de que el efecto la pliegue.
  const chatPlegado = plegado || menuAbierto
  const otroPanel = abierto || configAbierto || manualAbierto || contactosAbierto || navegadorAbierto
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
  const panelChatAbierto = otroPanel || hiloVisible || hiloPersonaVisible || menuAdjuntar || menuModelo
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
    setNavegadorAbierto(false)
    setMenuModelo(false)
    setMenuAdjuntar(false)
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
   * Tocar fuera del chat cierra sus paneles (y Escape hace lo mismo). El
   * listener solo existe mientras hay algo abierto. El registro se difiere un
   * tick porque el propio clic que abrió el panel sigue propagándose (mismo
   * motivo que en `InteractOverlay`), y se ignora con un diálogo modal encima:
   * ese vive fuera del chat y cerrar por detrás dejaría la pregunta huérfana.
   */
  useEffect(() => {
    if (!otroPanel && !hiloVisible && !hiloPersonaVisible && !menuModelo && !menuAdjuntar && !selectorAbierto) return
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
  }, [otroPanel, hiloVisible, hiloPersonaVisible, menuModelo, menuAdjuntar, selectorAbierto, cerrarPaneles])

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
  // Plegado en teléfono vertical: solo queda la carita, así que el contenedor se
  // encoge a su contenido (en vez de ancho completo invisible) para no tapar con
  // su z-20 los tiradores de las esquinas inferiores que quedan por debajo.
  const angostoMovil = chatPlegado && movilVertical

  return (
    <div
      ref={raizRef}
      className={
        // Plegado va centrado con `translate`, así que ahí no lleva los márgenes
        // laterales de la zona segura: descentrarían la barra.
        angostoMovil
          ? `safe-inf absolute ${navAbierto ? 'bottom-16' : 'bottom-4'} left-1/2 ${encima ? 'z-[70]' : 'z-20'} -translate-x-1/2 select-none`
          : ['safe-inf safe-ini safe-fin absolute min-w-0 select-none', navAbierto ? 'bottom-16' : 'bottom-4', encima ? 'z-[70]' : 'z-20', anclajeChat(menuAbierto)].join(' ')
      }
    >
      {/* Conversación con el asistente (estilo WhatsApp): siempre sobre la barra */}
      {hiloVisible && <ChatConversacion onCerrar={cerrarHilo} />}

      {/* Hilo con una persona (buzón): mismo sitio, otro origen de datos */}
      {hiloPersonaVisible && hiloPersona && (
        <Suspense fallback={null}>
          <ChatConversacionPersona hiloId={hiloPersona} onCerrar={cerrarHiloPersona} />
        </Suspense>
      )}

      {/* Configuración de asistentes (crear, eliminar, personalizar, mapa) */}
      {configAbierto && (
        <Suspense fallback={null}>
          <AsistentesConfig onCerrar={() => setConfigAbierto(false)} />
        </Suspense>
      )}

      {/* Contactos del buzón: mi alias, buscar por alias, solicitudes */}
      {contactosAbierto && (
        <Suspense fallback={null}>
          <ContactosPanel
            onCerrar={() => useBuzon.getState().cerrarContactos()}
            onAbrirHilo={(id) => useBuzon.getState().abrirHilo(id)}
          />
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

      {/* Manual de comandos: qué pedirle al asistente (determinista, por tema) */}
      {manualAbierto && (
        <Suspense fallback={null}>
          <ManualComandos
            onUsar={(frase) => {
              setTexto(frase)
              setManualAbierto(false)
            }}
            onCerrar={() => setManualAbierto(false)}
          />
        </Suspense>
      )}

      {/* Navegador: historial por página, sitios con categoría, tiempo y ajustes */}
      {navegadorAbierto && (
        <Suspense fallback={null}>
          <PanelNavegador pestana={pestanaNav} onPestana={setPestanaNav} onCerrar={() => setNavegadorAbierto(false)} />
        </Suspense>
      )}

      {/* Historial reciente + selector de mascota */}
      {abierto && !configAbierto && !manualAbierto && !navegadorAbierto && (
        <div className="ui-panel-glass mb-2 max-h-72 overflow-y-auto rounded-2xl border border-white/10 p-2 shadow-xl backdrop-blur-md">
          {/* Cabecera: alternar asistentes/amigos (esquina izquierda) y elegir asistente */}
          <div className="mb-2 flex items-center gap-2 border-b border-white/10 px-1 pb-2">
            <button
              type="button"
              onClick={() => setVistaPanel((v) => (v === 'amigos' ? 'asistentes' : 'amigos'))}
              className={`relative grid h-8 w-8 shrink-0 place-items-center rounded-lg text-base transition ${
                vistaPanel === 'amigos' ? 'bg-accent/20 text-accent ring-1 ring-accent/50' : 'text-white/50 hover:bg-white/10 hover:text-white/85'
              }`}
              title={vistaPanel === 'amigos' ? t('buzon.vista.asistentes', 'Asistentes') : t('buzon.amigos', 'Amigos')}
            >
              {vistaPanel === 'amigos' ? <Icono emoji={mascota.emoji} /> : <Icono nombre="companeros" />}
              {vistaPanel !== 'amigos' && noLeidos > 0 && (
                <span className="pointer-events-none absolute -end-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[9px] font-black tabular-nums text-white">
                  {noLeidos}
                </span>
              )}
            </button>
            {vistaPanel === 'amigos' ? (
              <>
                <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-white/50">
                  <Icono nombre="companeros" /> {t('buzon.amigos', 'Amigos')}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAbierto(false)
                    useBuzon.getState().abrirContactos()
                  }}
                  className="relative flex h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-base text-white/40 transition hover:bg-white/10 hover:text-white/85"
                  title={t('buzon.contactos', 'Contactos')}
                >
                  <Icono nombre="ajustes" />
                  <span className="text-[11px] font-semibold">{t('buzon.contactos', 'Contactos')}</span>
                  {solicitudes > 0 && (
                    <span className="grid h-4 min-w-4 place-items-center rounded-full bg-amber-500 px-1 text-[9px] font-black tabular-nums text-white">
                      {solicitudes}
                    </span>
                  )}
                </button>
              </>
            ) : (
              <>
            <span className="text-[11px] font-semibold text-white/50">
              {t('chat.tuAsistente', 'Tu asistente:')}
            </span>
            <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
              {asistentes.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    // Re-tocar el asistente activo abre su conversación.
                    if (m.id === mascotaId) {
                      abrirConv(m.id)
                    } else {
                      setMascota(m.id)
                      hablar(saludoAsistente(t, m))
                    }
                  }}
                  title={
                    m.id === mascotaId
                      ? `${nombreAsistente(t, m)} · ${t('chat.abrirConv', 'ver conversación')}`
                      : nombreAsistente(t, m)
                  }
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-lg transition ${
                    m.id === mascotaId ? 'bg-accent/20 ring-1 ring-accent/50' : 'hover:bg-white/10'
                  }`}
                >
                  <Icono emoji={m.emoji} />
                </button>
              ))}
            </div>
            <button
              type="button"
              data-tut="chat.manual"
              onClick={() => {
                setConfigAbierto(false)
                setManualAbierto(true)
              }}
              className="flex h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-base text-white/40 transition hover:bg-white/10 hover:text-white/85"
              title={t('chat.manual.abrir', 'Manual: qué puedes pedir')}
            >
              <Icono nombre="registros" />
              <span className="text-[11px] font-semibold">{t('chat.manual', 'Manual')}</span>
            </button>
            <button
              type="button"
              data-tut="chat.navegador"
              onClick={() => abrirPanelNav('historial')}
              className="flex h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-base text-white/40 transition hover:bg-white/10 hover:text-white/85"
              title={t('nav.panel.titulo', 'Navegador: historial, sitios y tiempo')}
            >
              <Icono nombre="mundo" />
              <span className="text-[11px] font-semibold">{t('nav.panel.boton', 'Navegador')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setConfigAbierto(true)
                setAbierto(false)
              }}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-base text-white/40 transition hover:bg-white/10 hover:text-white/85"
              title={t('chat.config.abrir', 'Configurar asistentes')}
            >
              <Icono nombre="ajustes" />
            </button>
              </>
            )}
          </div>

          {/* Amigos del buzón: cada uno con el busto de su personaje y su último mensaje */}
          {vistaPanel === 'amigos' && (
            <ListaAmigos
              onAbrir={(id) => {
                setAbierto(false)
                useBuzon.getState().abrirHilo(id)
              }}
              onContactos={() => {
                setAbierto(false)
                useBuzon.getState().abrirContactos()
              }}
            />
          )}

          {/* Pestañas: conversaciones (con quién platicaste) / registros (lo que pediste) */}
          <div data-tut="chat.tabs" className={`mb-1 flex gap-1 px-1 ${vistaPanel === 'amigos' ? 'hidden' : ''}`}>
            {(['chats', 'registros'] as const).map((p) => (
              <button
                key={p}
                type="button"
                data-tut={`chat.tab.${p}`}
                onClick={() => setPestana(p)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                  pestana === p
                    ? 'bg-accent/15 text-accent'
                    : 'text-white/40 hover:bg-white/10 hover:text-white/70'
                }`}
              >
                {p === 'chats' ? (
                  <>
                    <Icono nombre="chat" /> {t('chat.tab.chats', 'Chats')}
                    {noLeidos > 0 && (
                      <span className="ms-1 rounded-full bg-red-600 px-1.5 text-[9px] font-black tabular-nums text-white">{noLeidos}</span>
                    )}
                  </>
                ) : (
                  <><Icono nombre="nota" /> {t('chat.tab.registros', 'Registros')}</>
                )}
              </button>
            ))}
          </div>

          {/* Lista de conversaciones, estilo lista de chats */}
          {vistaPanel === 'asistentes' &&
            pestana === 'chats' &&
            asistentes.map((m) => {
              const u = ultimos?.[m.id]
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => abrirConv(m.id)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-start transition hover:bg-white/5"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-xl">
                    <Icono emoji={m.emoji} />
                  </span>
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

          {vistaPanel === 'asistentes' && pestana === 'registros' && (
            <>
          {/* Memorias del arquitecto: lo que sabe de ti entre sesiones */}
          {memoriasVigentes.length > 0 && (
            <div data-tut="chat.memorias" className="mb-2 border-b border-white/10 px-1 pb-2">
              <p className="mb-1 text-[11px] font-semibold text-violet-400/70">
                <Icono nombre="memoria" /> {t('chat.memorias', 'Lo que recuerdo de ti')}
              </p>
              {memoriasVigentes.map((m) => (
                <div key={m.id} className="flex items-start gap-2 rounded-lg px-1 py-1 hover:bg-white/5">
                  <span className="mt-0.5 text-sm leading-none">
                    <Icono emoji={(m.roomId && (getPlantilla(m.roomId) ?? getCuarto(m.roomId))?.icon) || '🧠'} />
                  </span>
                  <p className="min-w-0 flex-1 break-words text-xs text-white/75">{m.hecho}</p>
                  <button
                    type="button"
                    onClick={() => m.id != null && memoriasRepo.remove(m.id)}
                    className="px-1 py-0.5 text-[11px] text-white/20 transition hover:text-white/60"
                    title={t('chat.olvidar', 'Olvidar')}
                  >
                    <Icono nombre="cerrar" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {recientes.length === 0 && (
            <p className="px-2 py-3 text-center text-xs text-white/35">
              {t('chat.vacio', 'Aún no hay registros. Cuéntale al arquitecto qué hiciste.')}
            </p>
          )}

          {recientes.map((e) => {
            const room = e.roomId ? getPlantilla(e.roomId) ?? getCuarto(e.roomId) : null
            const enRetag = retagId === e.id
            return (
              <div key={e.id} className="group">
                <div className="flex items-start gap-2 rounded-xl px-2 py-1.5 hover:bg-white/5">
                  <span className="mt-0.5 text-base leading-none"><Icono emoji={room ? room.icon : '🗒️'} /></span>
                  {/* Tocar el registro abre la conversación con el asistente. */}
                  <div
                    className="min-w-0 flex-1 cursor-pointer"
                    onClick={() => abrirConv(mascotaId)}
                    title={t('chat.verConv', 'Ver la conversación completa')}
                  >
                    <p className="break-words text-sm text-white/85">{e.texto}</p>
                    <p className="flex items-center gap-1.5 text-[10px] text-white/35">
                      <span>{room ? nombreCortoT(room.id) : t('chat.sinClasificar', 'Sin clasificar')}</span>
                      {e.procesado && <span className="text-accent"><Icono nombre="confirmar" /> {t('chat.capturado', 'capturado')}</span>}
                      <span>·</span>
                      <span>
                        {new Date(e.creado).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setRetagId(enRetag ? null : (e.id ?? null))}
                      className={`rounded px-1 py-0.5 text-[11px] transition hover:bg-white/10 ${enRetag ? 'text-white/80' : 'text-white/25 hover:text-white/70'}`}
                      title={t('chat.reclasificar', 'Reclasificar')}
                    >
                      <Icono nombre="editar" />
                    </button>
                    <button
                      type="button"
                      onClick={() => e.id != null && bitacoraRepo.remove(e.id)}
                      className="px-1 py-0.5 text-[11px] text-white/20 transition hover:text-white/60"
                      title={t('chat.eliminar', 'Eliminar')}
                    >
                      ✕
                    </button>
                  </div>
                </div>
                {enRetag && (
                  <div className="mb-1 ms-8 flex flex-wrap gap-1">
                    {appsAsignadas().length === 0 && (
                      <span className="px-1 py-1 text-[10px] text-white/35">
                        {t('chat.sinApps', 'No hay apps asignadas. Asígnalas a un objeto en un cuarto.')}
                      </span>
                    )}
                    {appsAsignadas().map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => e.id != null && retag(e.id, r.id)}
                        className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/70 hover:bg-white/15"
                        style={{ borderColor: `${r.color}44` }}
                      >
                        <span><Icono emoji={r.icon} /></span>
                        <span>{nombreCortoT(r.id)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
            </>
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
            <Icono emoji={mascota.emoji} />
            {/* Mensajes de personas sin leer (estilo BadgeMisiones) */}
            {noLeidos > 0 && (
              <span className="pointer-events-none absolute -end-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-black tabular-nums text-white shadow-lg">
                {noLeidos}
              </span>
            )}
          </button>
        </div>
      ) : (
        <div ref={refTope}>
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

      {/* Adjunto (imagen o PDF: lo interpreta la IA al enviar) */}
      {adjunto && (
        <div className="ui-panel-glass mb-2 inline-flex items-center gap-2 rounded-xl border border-white/10 p-1.5 shadow-xl backdrop-blur-md">
          {adjunto.tipo === 'imagen' ? (
            <img src={adjunto.dataUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
          ) : (
            <span className="grid h-12 w-12 place-items-center rounded-lg bg-white/5 text-2xl">
              <Icono nombre={adjunto.tipo === 'contenido' ? 'buzon' : 'pdf'} />
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
            setNavegadorAbierto(false)
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
            // apartan la conversación y los otros dos paneles.
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
          title={abierto ? t('chat.ocultar', 'Cerrar el menú') : `${nombreAsistente(t, mascota)} · ${t('chat.verMenu', 'abrir el menú')}`}
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-2xl transition hover:scale-105 ${
            abierto || hiloVisible ? 'bg-accent/20' : 'bg-white/5 hover:bg-white/10'
          }`}
        >
          <Icono emoji={mascota.emoji} />
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
            setMenuAdjuntar((v) => !v)
          }}
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-2xl font-light leading-none transition hover:bg-white/10 ${
            menuAdjuntar ? 'bg-white/10 text-white/85' : 'text-white/45 hover:text-white/85'
          }`}
          title={t('chat.adjuntar', 'Adjuntar imagen o PDF, tomar foto o abrir la máscara AR')}
        >
          +
        </button>
        {/* Modo web: lo que escribas se abre o se busca en internet, no va al asistente. */}
        <button
          type="button"
          data-tut="chat.web"
          onClick={() => useNavegador.getState().setModoWeb(!modoWeb)}
          aria-pressed={modoWeb}
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg leading-none transition hover:bg-white/10 ${
            modoWeb ? 'bg-accent/20 text-white/90' : 'text-white/45 hover:text-white/85'
          }`}
          title={
            modoWeb
              ? t('nav.modoWebOn', 'Modo web: lo que escribas se abre o se busca en internet')
              : t('nav.modoWebOff', 'Modo web apagado: lo que escribas va al asistente')
          }
        >
          <Icono nombre="mundo" />
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
      {usarViaCuenta() && (creditosIlimitados || creditosRestantes > 0) && (
        <div className="mt-1 flex justify-end">
          <span className="ui-panel-glass rounded-lg border border-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/50 shadow-xl backdrop-blur-md">
            <Icono nombre="brillo" />{' '}
            {t('chat.creditos', 'Créditos: {n}', {
              n: creditosIlimitados ? '∞' : creditosRestantes,
            })}
          </span>
        </div>
      )}
        </div>
      )}
    </div>
  )
}
