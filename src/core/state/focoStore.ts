import { create } from 'zustand'
import { tGlobal } from '../i18n/useT'
import { hostsBloqueados, htmlFoco } from '../navegador/foco'
import { hayNavegadorEscritorio } from '../plataforma'
import { useMascota } from './mascotaStore'

/**
 * Modo foco del navegador: durante un rato, los sitios de las categorías (o
 * los sitios) elegidos no se abren. La configuración y el «hasta» viven en
 * localStorage: cerrar la app no rompe una sesión de foco en marcha. En el
 * escritorio el bloqueo lo aplica el shell (`mph:nav-foco`); en el teléfono,
 * el WebView (fase 5).
 */

const LS = 'mh.nav.foco'

interface Guardado {
  hasta: number | null
  categorias: string[]
  sitios: string[]
  duracionMin: number
}

function leer(): Guardado {
  try {
    const g = JSON.parse(localStorage.getItem(LS) || '{}') as Partial<Guardado>
    return {
      hasta: typeof g.hasta === 'number' && g.hasta > Date.now() ? g.hasta : null,
      categorias: Array.isArray(g.categorias) ? g.categorias.filter((c) => typeof c === 'string') : ['redes', 'video', 'juegos'],
      sitios: Array.isArray(g.sitios) ? g.sitios.filter((s) => typeof s === 'string') : [],
      duracionMin: typeof g.duracionMin === 'number' && g.duracionMin > 0 ? g.duracionMin : 25,
    }
  } catch {
    return { hasta: null, categorias: ['redes', 'video', 'juegos'], sitios: [], duracionMin: 25 }
  }
}

function guardar(g: Guardado): void {
  localStorage.setItem(LS, JSON.stringify(g))
}

interface FocoState extends Guardado {
  /** Hosts bloqueados ahora mismo (resueltos al activar). */
  hosts: string[]
  activar: (min?: number) => Promise<void>
  terminar: (motivo?: 'vencido' | 'manual') => void
  setCategorias: (c: string[]) => void
  setSitios: (s: string[]) => void
  setDuracionMin: (m: number) => void
  /** Minutos que quedan (0 si no hay foco). */
  restanteMin: () => number
}

let temporizador: ReturnType<typeof setTimeout> | null = null

/** Manda al shell la lista (o la vacía) para que corte la navegación a esos sitios. */
function avisarShell(hosts: string[], hasta: number | null): void {
  if (!hayNavegadorEscritorio()) return
  void window.mph?.navegador?.foco?.({ hosts, hasta, html: htmlFoco() })
}

export const useFoco = create<FocoState>((set, get) => {
  const programarFin = (hasta: number) => {
    if (temporizador) clearTimeout(temporizador)
    temporizador = setTimeout(() => get().terminar('vencido'), Math.max(0, hasta - Date.now()))
  }
  const inicial = leer()
  // Un foco en marcha al arrancar: se rearma (los hosts se resuelven enseguida).
  if (inicial.hasta) {
    setTimeout(() => {
      const s = get()
      if (!s.hasta) return
      programarFin(s.hasta)
      void hostsBloqueados(s.categorias, s.sitios).then((hosts) => {
        set({ hosts })
        avisarShell(hosts, s.hasta)
      })
    }, 0)
  }
  return {
    ...inicial,
    hosts: [],

    activar: async (min) => {
      const s = get()
      const duracionMin = min && min > 0 ? Math.min(min, 480) : s.duracionMin
      const hasta = Date.now() + duracionMin * 60_000
      const hosts = await hostsBloqueados(s.categorias, s.sitios)
      set({ hasta, hosts, duracionMin })
      guardar({ hasta, categorias: s.categorias, sitios: s.sitios, duracionMin })
      programarFin(hasta)
      avisarShell(hosts, hasta)
    },

    terminar: (motivo = 'manual') => {
      const s = get()
      if (temporizador) clearTimeout(temporizador)
      temporizador = null
      if (!s.hasta) return
      set({ hasta: null, hosts: [] })
      guardar({ hasta: null, categorias: s.categorias, sitios: s.sitios, duracionMin: s.duracionMin })
      avisarShell([], null)
      if (motivo === 'vencido') {
        useMascota.getState().decir(tGlobal('nav.foco.fin', 'Se acabó el modo foco. ¡Bien hecho!'), { persistir: false })
      }
    },

    setCategorias: (categorias) => {
      const s = get()
      set({ categorias })
      guardar({ hasta: s.hasta, categorias, sitios: s.sitios, duracionMin: s.duracionMin })
    },
    setSitios: (sitios) => {
      const s = get()
      set({ sitios })
      guardar({ hasta: s.hasta, categorias: s.categorias, sitios, duracionMin: s.duracionMin })
    },
    setDuracionMin: (duracionMin) => {
      const s = get()
      set({ duracionMin })
      guardar({ hasta: s.hasta, categorias: s.categorias, sitios: s.sitios, duracionMin })
    },

    restanteMin: () => {
      const { hasta } = get()
      return hasta ? Math.max(0, Math.ceil((hasta - Date.now()) / 60_000)) : 0
    },
  }
})

// Para depurar y probar el modo foco desde la consola (solo en desarrollo).
if (import.meta.env.DEV) Object.assign(window as unknown as Record<string, unknown>, { useFoco })
