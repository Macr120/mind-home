/**
 * Estado de las redes conectadas y de la subida en curso. Lo leen el diálogo
 * «Publicar» del Studio de video, la píldora global y la sección «Cuentas
 * conectadas» de Configuraciones.
 *
 * `conectar` abre el OAuth FUERA de la app (ventana emergente en la web,
 * navegador del sistema en la app de tienda y en el escritorio) y la vuelta
 * llega por `retorno.ts` → `alVolver`. Las llamadas al servidor se importan
 * bajo demanda: este store lo monta `App` y no debe arrastrar Supabase al
 * chunk de arranque (ni ciclar con `cuenta/*`, que importa `retorno.ts`).
 */
import { create } from 'zustand'
import { esAppNativa, esEscritorio } from '../plataforma'
import type { AvisosRedes, CuentaRed, MotivoVuelta, Plataforma, TrabajoPublicacion } from './tipos'

interface RedesState {
  cuentas: CuentaRed[]
  avisos: AvisosRedes
  youtubeRestantes: number
  cargando: boolean
  /** Ya se pidió el estado al menos una vez con éxito. */
  cargado: boolean
  error: string | null
  /** Conexión en vuelo: la app espera a que el usuario vuelva del proveedor. */
  pendiente: { plataforma: Plataforma; desde: number } | null
  /** Cómo acabó la última vuelta (el diálogo la enseña y la limpia). */
  ultimaVuelta: { ok: boolean; plataforma: Plataforma | null; error: MotivoVuelta | null } | null
  trabajo: TrabajoPublicacion | null
  refrescar: () => Promise<void>
  /** Abre el OAuth; devuelve un mensaje de error o null si el navegador salió hacia el proveedor. */
  conectar: (plataforma: Plataforma) => Promise<string | null>
  desconectar: (plataforma: Plataforma) => Promise<string | null>
  elegirPagina: (plataforma: 'facebook' | 'instagram', pageId: string) => Promise<string | null>
  alVolver: (ok: boolean, plataforma: Plataforma | null, error: MotivoVuelta | null) => void
  limpiarVuelta: () => void
}

/** Sin vuelta en 10 min se da la conexión por abandonada. */
const VIGENCIA_PENDIENTE_MS = 10 * 60_000
let ultimoRefresco = 0

const mensajeDe = (e: unknown) => (e instanceof Error ? e.message : String(e))

export const useRedes = create<RedesState>((set, get) => ({
  cuentas: [],
  avisos: {},
  youtubeRestantes: 0,
  cargando: false,
  cargado: false,
  error: null,
  pendiente: null,
  ultimaVuelta: null,
  trabajo: null,

  refrescar: async () => {
    if (get().cargando) return
    set({ cargando: true, error: null })
    try {
      const { estadoRedes } = await import('./api')
      const e = await estadoRedes()
      set({ cuentas: e.cuentas, avisos: e.avisos, youtubeRestantes: e.youtube_restantes_hoy, cargado: true })
    } catch (e) {
      set({ error: mensajeDe(e) })
    } finally {
      ultimoRefresco = Date.now()
      set({ cargando: false })
    }
  },

  conectar: async (plataforma) => {
    // En la web la ventana se abre ANTES de cualquier await: si no, el bloqueador de emergentes la para.
    // (El simulacro de DEV «conecta» solo y no abre nada.)
    const simulado = import.meta.env.DEV && localStorage.getItem('mh.redesStub') === '1'
    const web = !esAppNativa() && !esEscritorio()
    const popup = web && !simulado ? window.open('', 'mph-redes', 'popup,width=520,height=720') : null
    set({ pendiente: { plataforma, desde: Date.now() }, ultimaVuelta: null })
    try {
      const { iniciarConexion } = await import('./api')
      if (simulado) {
        await iniciarConexion(plataforma, { tipo: 'app' })
        return null
      }
      if (!web) {
        const { url } = await iniciarConexion(plataforma, { tipo: 'app' })
        if (esAppNativa()) {
          const { Browser } = await import('@capacitor/browser')
          // Si cierra la pestaña sin terminar, al menos se refresca el estado.
          void Browser.addListener('browserFinished', () => void get().refrescar())
          await Browser.open({ url })
        } else {
          // El shell del escritorio deniega la ventana y la manda al navegador del sistema.
          window.open(url, '_blank', 'noopener')
        }
        return null
      }
      if (popup) {
        const { url } = await iniciarConexion(plataforma, { tipo: 'popup', origen: window.location.origin })
        popup.location.href = url
        return null
      }
      // Emergente bloqueada: la pestaña entera va al proveedor y vuelve a la raíz con `?redes=`.
      const { url } = await iniciarConexion(plataforma, { tipo: 'pestana', origen: window.location.origin })
      window.location.assign(url)
      return null
    } catch (e) {
      popup?.close()
      set({ pendiente: null })
      return mensajeDe(e)
    }
  },

  desconectar: async (plataforma) => {
    try {
      const { desconectarRed } = await import('./api')
      await desconectarRed(plataforma)
      await get().refrescar()
      return null
    } catch (e) {
      return mensajeDe(e)
    }
  },

  elegirPagina: async (plataforma, pageId) => {
    try {
      const { elegirPagina } = await import('./api')
      await elegirPagina(plataforma, pageId)
      await get().refrescar()
      return null
    } catch (e) {
      return mensajeDe(e)
    }
  },

  alVolver: (ok, plataforma, error) => {
    set({ pendiente: null, ultimaVuelta: { ok, plataforma, error } })
    void get().refrescar()
  },

  limpiarVuelta: () => set({ ultimaVuelta: null }),
}))

/**
 * Se llama UNA vez al arrancar (main.tsx): la vuelta por `postMessage` o por
 * `?redes=` en la web, y el refresco al volver a primer plano mientras hay una
 * conexión pendiente (el deep link lo reparte `escucharDeepLinkAuth`).
 */
export function arrancarRedes(): void {
  if (typeof window === 'undefined') return
  void (async () => {
    const { recibirMensajeRedes, recibirQueryRedes } = await import('./retorno')
    // La vuelta del OAuth aterriza SIEMPRE aquí, en nuestro origen, por el 302 de
    // `redes-oauth` (Supabase no deja servir HTML con script desde sus funciones).
    // Si esta pestaña es la emergente, se lo pasa a quien la abrió y se cierra;
    // si no, la procesa ella misma y limpia la URL.
    const q = new URLSearchParams(window.location.search)
    const redes = q.get('redes')
    if (redes && window.opener && !window.opener.closed) {
      const mensaje = { tipo: 'mph-redes', ok: redes === 'ok', plataforma: q.get('plataforma'), error: q.get('motivo') }
      window.opener.postMessage(mensaje, window.location.origin)
      window.close()
      return
    }
    if (recibirQueryRedes(window.location.search)) {
      const limpia = new URL(window.location.href)
      for (const k of ['redes', 'plataforma', 'motivo']) limpia.searchParams.delete(k)
      window.history.replaceState(null, '', limpia.toString())
    }
    window.addEventListener('message', (e) => void recibirMensajeRedes(e, window.location.origin))
  })()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return
    const { pendiente, refrescar } = useRedes.getState()
    if (!pendiente || Date.now() - pendiente.desde > VIGENCIA_PENDIENTE_MS) return
    if (Date.now() - ultimoRefresco > 15_000) void refrescar()
  })
}
