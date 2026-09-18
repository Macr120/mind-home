import { create } from 'zustand'
import { hostDe } from '../navegador/dominio'
import { useAjustesNav } from '../navegador/ajustes'
import { guardarFavicon, ponerTituloPagina, registrarPagina } from '../navegador/historial'
import {
  abrirVisita,
  cerrarVisita,
  mismoSitio,
  pausarVisita,
  reanudarVisita,
  sellarVisita,
  type VisitaEnCurso,
} from '../navegador/visitas'
import { hayNavegadorEscritorio, type BoundsNavegador } from '../plataforma'
import type { PestanaNav } from '../navegador/ordenes'
import { borrarHistorial } from '../navegador/sitios'
import { claveExceso, excesosDeHoy, fraseExceso, sinAvisarHoy } from '../navegador/limites'
import { tGlobal } from '../i18n/useT'
import { useFoco } from './focoStore'
import { useHud } from './hudStore'
import { useHouse } from './houseStore'
import { useMascota } from './mascotaStore'

/**
 * El navegador embebido del escritorio: el shell pinta cada pestaña en una
 * vista nativa (`WebContentsView`, solo la activa visible) y aquí viven las
 * pestañas, el registro de visitas e historial, el «modo web» del chat y la
 * geometría (la página ocupa desde arriba hasta el borde superior del chat; la
 * tira de pestañas va al pie, debajo del chat).
 *
 * Tiempo HONESTO: la visita del sitio de la pestaña ACTIVA (`visitasWeb`, una
 * por sitio) se pausa cuando el shell avisa de que la ventana perdió el foco,
 * se minimizó o el usuario lleva un rato sin tocar nada (`mph:nav-actividad`),
 * y al cambiar de pestaña o de sitio rota. Cada minuto se sella el parcial.
 */

/** Alto de la tira de pestañas al pie (px CSS). La página nunca baja de ahí. */
export const ALTO_TIRA = 48

export interface Pestana {
  id: number
  url: string
  titulo: string
  atras: boolean
  adelante: boolean
  /** La página suena (video, música): la tira lo marca y la visita cuenta en segundo plano. */
  audible: boolean
  /** Llevaba mucho en segundo plano y el shell soltó su proceso; al activarla se recarga. */
  dormida: boolean
}

interface NavegadorState {
  abierto: boolean
  pestanas: Pestana[]
  activaId: number | null
  /**
   * Modo web del chat: lo que se escriba va al navegador (URL o búsqueda) en
   * vez de al asistente. Se enciende al abrir el navegador y se apaga al
   * cerrarlo; el botón 🌐 de la barra lo alterna a mano.
   */
  modoWeb: boolean
  /** La próxima URL o búsqueda del chat abre pestaña NUEVA (tras «+» o Ctrl+T). */
  nuevaPendiente: boolean
  /** false con la ventana en segundo plano o el usuario inactivo: la visita no cuenta. */
  activo: boolean
  /** La visita del sitio de la pestaña activa (id de `visitasWeb` + tramos de tiempo). */
  visita: VisitaEnCurso | null
  /** Quién esconde la página (un panel del chat, un diálogo, un menú): con alguno, la vista nativa se oculta. */
  ocultoPor: string[]
  /** Hasta dónde baja la página: px desde el borde inferior hasta el tope del chat (0 = sin chat). */
  topeInferior: number
  /** Pestaña del panel «Navegador» que alguien pidió abrir (la tira, un atajo); el ChatBox la atiende y la limpia. */
  panelPedido: PestanaNav | null
  /** Pide abrir el panel del chat (saliendo del cuarto y desplegando el chat si hace falta). */
  pedirPanel: (p: PestanaNav | null) => void
  /** Límites diarios superados hoy (`sitio:<host>` / `categoria:<clave>`), para las marcas de la tira y las listas. */
  excedidos: string[]
  /** Recalcula los excesos de hoy y hace que el asistente avise de los nuevos (una vez al día cada uno). */
  revisarLimites: () => Promise<void>
  /** El shell cortó la navegación a un sitio del modo foco. */
  alBloqueado: (d: { url: string }) => void
  /** Abre `url`: en la pestaña activa, o en una nueva con `nueva` (y sin activarla con `fondo`). */
  abrir: (url: string, nombre?: string, opts?: { nueva?: boolean; fondo?: boolean }) => Promise<void>
  /** «+» / Ctrl+T: lo siguiente que se escriba en el chat abre pestaña nueva. */
  nuevaPestana: () => void
  activar: (id: number) => void
  cerrarPestana: (id: number) => void
  cerrar: () => Promise<void>
  setModoWeb: (v: boolean) => void
  setOculto: (clave: string, v: boolean) => void
  setTopeInferior: (px: number) => void
  /** Manda al shell los bounds actuales (al abrir, al redimensionar, al moverse el chat). */
  reencuadrar: () => void
  /** Atajo de teclado (de la app o de dentro de la página): nueva, cerrar, siguiente, anterior, ir:N, atras, adelante, recargar, direccion. */
  atajo: (accion: string) => void
  // Lo que cuenta el shell (`mph:nav-*`).
  alPestana: (d: { pestanaId: number; url: string; fondo: boolean }) => void
  alActiva: (d: { pestanaId: number }) => void
  alNavegar: (d: { pestanaId: number; url: string; atras: boolean; adelante: boolean; enPagina?: boolean }) => void
  alTitulo: (d: { pestanaId: number; titulo: string }) => void
  alFavicon: (d: { pestanaId: number; url: string; dataUrl: string }) => void
  alAudible: (d: { pestanaId: number; audible: boolean }) => void
  alDormida: (d: { pestanaId: number }) => void
  alActividad: (d: { activo: boolean }) => void
  /** El shell cerró una pestaña por su cuenta (proceso caído); `ultima` = ya no queda ninguna. */
  alCerrado: (d: { pestanaId: number; ultima: boolean }) => void
}

function bounds(s: { topeInferior: number }): BoundsNavegador {
  const tope = Math.max(s.topeInferior, ALTO_TIRA)
  return { x: 0, y: 0, width: window.innerWidth, height: Math.max(0, window.innerHeight - tope) }
}

/** Sello periódico del parcial de la visita (la app puede morir sin cerrar). */
let sello: ReturnType<typeof setInterval> | null = null

function pararSello(): void {
  if (sello) clearInterval(sello)
  sello = null
}

/** Las rotaciones de visita van en fila: dos navegaciones seguidas no abren dos filas. */
let cola: Promise<void> = Promise.resolve()

/** Si `url` es de otro sitio que la visita en curso, la cierra y abre la nueva. */
function sincronizarVisita(url: string, nombre?: string): Promise<void> {
  cola = cola.then(async () => {
    const { visita, activo, abierto } = useNavegador.getState()
    if (!abierto || mismoSitio(visita, url)) return
    cerrarVisita(visita)
    useNavegador.setState({ visita: null })
    let nueva = await abrirVisita(url, nombre, { activa: activo })
    // Un aviso de actividad que llegó MIENTRAS se escribía la fila no encontró
    // visita que pausar o reanudar: se reconcilia con el estado actual.
    const s = useNavegador.getState()
    if (!s.abierto) {
      cerrarVisita(nueva)
      return
    }
    nueva = s.activo ? reanudarVisita(nueva) : pausarVisita(nueva)
    useNavegador.setState({ visita: nueva })
  })
  return cola
}

function pestanaDe(s: NavegadorState, id: number): Pestana | undefined {
  return s.pestanas.find((p) => p.id === id)
}

function conCambios(pestanas: Pestana[], id: number, cambios: Partial<Pestana>): Pestana[] {
  return pestanas.map((p) => (p.id === id ? { ...p, ...cambios } : p))
}

function nuevaPestanaDe(id: number, url: string, titulo = ''): Pestana {
  return { id, url, titulo: titulo || hostDe(url), atras: false, adelante: false, audible: false, dormida: false }
}

/** Pone el foco en la caja del chat para teclear la dirección o la búsqueda. */
function enfocarChat(): void {
  setTimeout(() => document.querySelector<HTMLTextAreaElement>('[data-tut="chat.caja"] textarea')?.focus(), 60)
}

export const useNavegador = create<NavegadorState>((set, get) => {
  const nav = () => window.mph?.navegador

  /** Estado local de «cerrado» (el shell ya no tiene pestañas o se le pidió cerrar). */
  const cerrarLocal = () => {
    cerrarVisita(get().visita)
    pararSello()
    set({ abierto: false, pestanas: [], activaId: null, visita: null, modoWeb: false, nuevaPendiente: false, ocultoPor: [] })
    if (useAjustesNav.getState().borrarAlCerrar) void borrarHistorial()
  }

  /** Cada minuto mientras se navega: sellar el parcial y mirar los límites. */
  const tic = () => {
    sellarVisita(get().visita)
    void get().revisarLimites()
  }

  const aplicarVisible = () => {
    const s = get()
    if (s.abierto) void nav()?.visible(s.ocultoPor.length === 0)
  }

  return {
    abierto: false,
    pestanas: [],
    activaId: null,
    modoWeb: false,
    nuevaPendiente: false,
    activo: true,
    visita: null,
    ocultoPor: [],
    topeInferior: 0,
    panelPedido: null,
    excedidos: [],

    revisarLimites: async () => {
      const v = get().visita
      const enCurso =
        v && v.id != null
          ? { id: v.id, seg: Math.round(v.acumulado + (v.desde == null ? 0 : (Date.now() - v.desde) / 1000)) }
          : null
      const excesos = await excesosDeHoy(enCurso)
      const claves = excesos.map(claveExceso)
      const s = get()
      if (claves.length !== s.excedidos.length || claves.some((c) => !s.excedidos.includes(c))) set({ excedidos: claves })
      for (const e of sinAvisarHoy(excesos)) useMascota.getState().decir(fraseExceso(e), { persistir: false })
    },

    alBloqueado: () => {
      useMascota
        .getState()
        .decir(tGlobal('nav.foco.bloqueado', 'Ese sitio está en tu modo foco: {m} min más y se abre.', { m: useFoco.getState().restanteMin() }), {
          persistir: false,
        })
    },

    pedirPanel: (p) => {
      if (p) {
        if (useHouse.getState().activeRoom) useHouse.getState().closeRoom()
        useHud.getState().setPlegado('chat', false)
      }
      set({ panelPedido: p })
    },

    abrir: async (url, nombre, opts = {}) => {
      if (!hayNavegadorEscritorio()) return
      const s = get()
      if (!s.abierto) {
        void nav()!.configurar({ inactivoSeg: useAjustesNav.getState().inactivoSeg })
        // La página baja hasta el chat: plegado no habría dónde teclear.
        useHud.getState().setPlegado('chat', false)
      }
      const nueva = !!opts.nueva || s.nuevaPendiente || s.activaId == null
      const id = await nav()!.abrir(url, bounds(s), { pestanaId: nueva ? undefined : s.activaId!, fondo: !!opts.fondo })
      if (!id) return
      set((st) => ({
        abierto: true,
        modoWeb: true,
        nuevaPendiente: false,
        pestanas: pestanaDe(st, id)
          ? conCambios(st.pestanas, id, { url, titulo: nombre || hostDe(url) })
          : [...st.pestanas, nuevaPestanaDe(id, url, nombre)],
        activaId: opts.fondo && st.activaId != null ? st.activaId : id,
      }))
      if (!sello) sello = setInterval(tic, 60_000)
      aplicarVisible()
      // La visita se abre ya (con el nombre del objeto); el did-navigate del
      // mismo sitio no la duplica.
      if (!opts.fondo) await sincronizarVisita(url, nombre)
    },

    nuevaPestana: () => {
      // El chat no vive dentro de los cuartos: para teclear hay que salir.
      if (useHouse.getState().activeRoom) useHouse.getState().closeRoom()
      set({ nuevaPendiente: true, modoWeb: true })
      useHud.getState().setPlegado('chat', false)
      enfocarChat()
    },

    activar: (id) => {
      if (!pestanaDe(get(), id)) return
      void nav()?.activar(id) // el shell contesta con mph:nav-activa
    },

    cerrarPestana: (id) => {
      if (!pestanaDe(get(), id)) return
      void nav()?.cerrarPestana(id)
      set((st) => ({ pestanas: st.pestanas.filter((p) => p.id !== id) }))
      // Sin pestañas el shell cierra todo por su cuenta; la activa nueva llega por mph:nav-activa.
      if (get().pestanas.length === 0) cerrarLocal()
    },

    cerrar: async () => {
      cerrarLocal()
      await nav()?.cerrar()
    },

    setModoWeb: (modoWeb) => set({ modoWeb }),

    setOculto: (clave, v) => {
      const s = get()
      const tiene = s.ocultoPor.includes(clave)
      if (tiene === v) return
      set({ ocultoPor: v ? [...s.ocultoPor, clave] : s.ocultoPor.filter((c) => c !== clave) })
      // Al destapar, primero el encuadre (el chat acaba de encogerse) y luego la vista.
      if (!v) get().reencuadrar()
      aplicarVisible()
    },

    setTopeInferior: (px) => {
      if (px === get().topeInferior) return
      set({ topeInferior: px })
      get().reencuadrar()
    },

    reencuadrar: () => {
      if (get().abierto) void nav()?.bounds(bounds(get()))
    },

    atajo: (accion) => {
      const s = get()
      const i = s.pestanas.findIndex((p) => p.id === s.activaId)
      const ir = (idx: number) => {
        const p = s.pestanas[idx]
        if (p) s.activar(p.id)
      }
      if (accion === 'nueva') s.nuevaPestana()
      else if (accion === 'cerrar' && s.activaId != null) s.cerrarPestana(s.activaId)
      else if (accion === 'siguiente' && s.pestanas.length) ir((i + 1) % s.pestanas.length)
      else if (accion === 'anterior' && s.pestanas.length) ir((i - 1 + s.pestanas.length) % s.pestanas.length)
      else if (accion.startsWith('ir:')) ir(Number(accion.slice(3)) - 1)
      else if (accion === 'atras') void nav()?.atras()
      else if (accion === 'adelante') void nav()?.adelante()
      else if (accion === 'recargar') void nav()?.recargar()
      else if (accion === 'direccion') {
        set({ modoWeb: true })
        useHud.getState().setPlegado('chat', false)
        enfocarChat()
      }
    },

    alPestana: ({ pestanaId, url }) => {
      if (!get().abierto || pestanaDe(get(), pestanaId)) return
      set((st) => ({ pestanas: [...st.pestanas, nuevaPestanaDe(pestanaId, url)] }))
    },

    alActiva: ({ pestanaId }) => {
      const p = pestanaDe(get(), pestanaId)
      if (!get().abierto || !p) return
      set({ activaId: pestanaId })
      void sincronizarVisita(p.url)
    },

    alNavegar: ({ pestanaId, url, atras, adelante, enPagina }) => {
      const s = get()
      const p = pestanaDe(s, pestanaId)
      if (!s.abierto || !p || !url) return
      const activa = pestanaId === s.activaId
      // Una pestaña dormida que despierta recarga su misma URL: no es una vista nueva.
      const despierta = p.dormida && url === p.url
      set({ pestanas: conCambios(s.pestanas, pestanaId, { url, atras, adelante, dormida: false }) })
      // La página del modo foco (data:) no es un sitio: ni visita ni historial.
      if (!activa || !/^https?:/.test(url)) return
      void sincronizarVisita(url).then(() => get().revisarLimites())
      // Un pushState/replaceState a la URL que ya se muestra tampoco lo es
      // (los buscadores retocan la query al cargar resultados).
      if (despierta || (enPagina && url === p.url)) return
      void registrarPagina(url, enPagina ? p.titulo : undefined)
    },

    alTitulo: ({ pestanaId, titulo }) => {
      const s = get()
      const p = pestanaDe(s, pestanaId)
      if (!s.abierto || !p || !titulo) return
      set({ pestanas: conCambios(s.pestanas, pestanaId, { titulo }) })
      void ponerTituloPagina(p.url, titulo)
    },

    alFavicon: ({ url, dataUrl }) => {
      if (get().abierto && url && dataUrl) void guardarFavicon(url, dataUrl)
    },

    alAudible: ({ pestanaId, audible }) => {
      const s = get()
      if (pestanaDe(s, pestanaId)) set({ pestanas: conCambios(s.pestanas, pestanaId, { audible }) })
    },

    alDormida: ({ pestanaId }) => {
      const s = get()
      if (pestanaDe(s, pestanaId)) set({ pestanas: conCambios(s.pestanas, pestanaId, { dormida: true, audible: false }) })
    },

    alActividad: ({ activo }) => {
      if (activo === get().activo) return
      const v = get().visita
      set({ activo, visita: v ? (activo ? reanudarVisita(v) : pausarVisita(v)) : null })
      // Al pausar se sella: si la app muere mientras está en segundo plano, la
      // visita ya tiene su duración real.
      if (!activo) sellarVisita(get().visita)
    },

    alCerrado: ({ pestanaId, ultima }) => {
      set((st) => ({ pestanas: st.pestanas.filter((p) => p.id !== pestanaId) }))
      if (ultima || get().pestanas.length === 0) cerrarLocal()
    },
  }
})

// Para depurar y probar el navegador desde la consola (solo en desarrollo).
if (import.meta.env.DEV) Object.assign(window as unknown as Record<string, unknown>, { useNavegador })
