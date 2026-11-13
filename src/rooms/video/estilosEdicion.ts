import type { TFunc } from '../../core/i18n/useT'
import { ESTILOS_EDICION, type OpcionesEdicion } from './iaEdicion'

/**
 * Estilos de «Editar con IA»: tres de fábrica (TikTok, YouTube, Podcast) y los
 * que guarde el usuario. Un estilo es la configuración ENTERA de la edición
 * (tono, qué hacer e indicaciones) para aplicarla con un toque. Los propios
 * son una preferencia de este dispositivo (localStorage, como los sonidos
 * ocultos), no datos de un proyecto.
 */

export interface EstiloGuardado {
  id: string
  nombre: string
  opciones: OpcionesEdicion
}

type Interruptores = Omit<OpcionesEdicion, 'instrucciones' | 'estilo'>

const BASE: Interruptores = {
  subtitulos: true,
  silencios: true,
  titulos: true,
  efectos: true,
  filtros: false,
  sonidos: false,
  musica: true,
  limpiarVoz: true,
  apoyos: false,
}

/** De fábrica: las indicaciones van traducidas (las lee el usuario en el cuadro y la IA en su idioma). */
const FABRICA: { id: string; nombre: string; estilo: OpcionesEdicion['estilo']; cambios: Partial<Interruptores>; clave: string; es: string }[] = [
  {
    id: 'fab-tiktok',
    nombre: 'TikTok',
    estilo: 'dinamico',
    cambios: { sonidos: true },
    clave: 'video.estilos.tiktok',
    es: 'Ritmo muy rápido: gancho fuerte en los 2 primeros segundos, subtítulos grandes al centro y golpes de zoom en los remates.',
  },
  {
    id: 'fab-youtube',
    nombre: 'YouTube',
    estilo: 'profesional',
    cambios: {},
    clave: 'video.estilos.youtube',
    es: 'Ritmo ágil pero cómodo: título de apertura, rótulos en cada cambio de tema y subtítulos abajo.',
  },
  {
    id: 'fab-podcast',
    nombre: 'Podcast',
    estilo: 'elegante',
    cambios: { titulos: false, efectos: false, musica: false },
    clave: 'video.estilos.podcast',
    es: 'Conversación: quita muletillas y repeticiones, sin efectos llamativos y con subtítulos sobrios abajo.',
  },
]

export function estilosDeFabrica(t: TFunc): EstiloGuardado[] {
  return FABRICA.map((f) => ({ id: f.id, nombre: f.nombre, opciones: { ...BASE, ...f.cambios, estilo: f.estilo, instrucciones: t(f.clave, f.es) } }))
}

const LS_ESTILOS = 'mh.video.estilosEdicion'
const MAX_PROPIOS = 12

/** Los guardados por el usuario, saneados (lo de localStorage puede venir de otra versión). */
export function estilosPropios(): EstiloGuardado[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(LS_ESTILOS) ?? '[]')
    if (!Array.isArray(v)) return []
    return v.flatMap((x): EstiloGuardado[] => {
      if (!x || typeof x !== 'object') return []
      const e = x as Record<string, unknown>
      const o = (e.opciones ?? {}) as Record<string, unknown>
      if (typeof e.id !== 'string' || typeof e.nombre !== 'string') return []
      const interruptores = Object.fromEntries(Object.entries(BASE).map(([k, def]) => [k, typeof o[k] === 'boolean' ? o[k] : def])) as Interruptores
      const estilo = ESTILOS_EDICION.includes(o.estilo as OpcionesEdicion['estilo']) ? (o.estilo as OpcionesEdicion['estilo']) : 'profesional'
      const instrucciones = typeof o.instrucciones === 'string' ? o.instrucciones.slice(0, 600) : ''
      return [{ id: e.id, nombre: e.nombre.slice(0, 30), opciones: { ...interruptores, estilo, instrucciones } }]
    })
  } catch {
    return []
  }
}

function guardar(lista: EstiloGuardado[]) {
  try {
    if (lista.length) localStorage.setItem(LS_ESTILOS, JSON.stringify(lista))
    else localStorage.removeItem(LS_ESTILOS)
  } catch {
    // Sin localStorage (modo privado): el estilo dura lo que la sesión.
  }
}

/** Guarda (o reemplaza, si ya hay uno con ese nombre) y devuelve la lista nueva. */
export function guardarEstilo(nombre: string, opciones: OpcionesEdicion): EstiloGuardado[] {
  const limpio = nombre.trim().slice(0, 30)
  const previos = estilosPropios().filter((e) => e.nombre.toLowerCase() !== limpio.toLowerCase())
  const lista = [...previos, { id: `est-${Date.now().toString(36)}`, nombre: limpio, opciones }].slice(-MAX_PROPIOS)
  guardar(lista)
  return lista
}

export function borrarEstilo(id: string): EstiloGuardado[] {
  const lista = estilosPropios().filter((e) => e.id !== id)
  guardar(lista)
  return lista
}

/** ¿Las opciones actuales son exactamente las de ese estilo? (para marcarlo como elegido). */
export const esElEstilo = (e: EstiloGuardado, o: OpcionesEdicion): boolean =>
  (Object.keys(e.opciones) as (keyof OpcionesEdicion)[]).every((k) => e.opciones[k] === o[k])
