import { create } from 'zustand'
import { db, type DisenoRoom, type FondoImagen, type ObjetoCuarto } from '../data/db'
import { esMueblePrincipal } from '../house/muebles'
import type { TemaId } from '../house/temas'
import type { PisoTipoId } from '../house/pisos'
import type { TechoTipoId, TechoFormaId, TechoParams, TechoCeldaForma } from '../house/techos'
import { techoSugeridoPorTema, TECHO_PARAMS_DEFAULT } from '../house/techos'
import type { FondoId } from '../house/fondos'
import { fondoSugeridoPorTema } from '../house/fondos'
import {
  MAPA_SUPERFICIE_DEFAULT,
  MAPA_SUPERFICIE_ID,
  parseMapaSuperficieRow,
  serializarMapaSuperficie,
  type MapaSuperficieAjustes,
} from '../house/mapaSuperficie'
import type { AjusteFondoImagen } from '../house/fondosImagen'
import { AJUSTE_FONDO_DEFAULT, ajusteADb, medirImagen } from '../house/fondosImagen'
import { useCuartos } from './cuartosStore'
import type { Pieza3D } from '../chat/mascotas'
import { useLayout } from './layoutStore'
import { footprintCells, FOOTPRINT_DEFAULT, cellId, tileOcupado } from '../house/walls'
import { celdasConexas } from '../house/techoCeldas'

/** Color por defecto de un cuarto (su color de instancia, o gris si no existe). */
const colorCuarto = (roomId: string): string =>
  useCuartos.getState().cuartos.find((c) => c.id === roomId)?.color ?? '#94a3b8'

/** roomId sentinela donde se persiste el tema global de la casa. */
const TEMA_ROW = '__tema__'
/** roomId sentinela del fondo de cielo (`nombre` = id, `color` = '1'|'0' animaciones). */
const FONDO_ROW = '__fondo__'
/** roomId sentinela donde se persiste el tipo de piso de la casa. */
const PISO_TIPO_ROW = '__piso_tipo__'
const TECHO_TIPO_ROW = '__techo_tipo__'
/** roomId sentinela de la mascota (lo gestiona mascotaStore; aquí solo se ignora). */
const MASCOTA_ROW = '__mascota__'
/** roomId de objetos LIBRES sobre el mapa (x,z en coordenadas de mundo). */
export const MAPA_ROOM = '__mapa__'
/** ¿El objeto es un objeto libre del mapa (no pertenece a un cuarto)? */
export const esObjetoMapa = (o: ObjetoCuarto) => o.roomId === MAPA_ROOM

/**
 * Colores del avatar por defecto (estilo Roblox).
 * Se sobreescriben con los datos guardados en DB.
 */
export const AVATAR_DEFAULT = {
  cabeza: '#ffd23b',
  torso: '#e23b3b',
  piernas: '#2f5fd0',
}

/**
 * Estado de diseño visual: colores de cuartos y avatar.
 * Lo leen Room3D y Character para pintar la escena 3D en tiempo real.
 * Se carga desde DB al iniciar y se persiste al cambiar.
 */
interface DisenoState {
  /** color por roomId, vacío = usar el default del módulo */
  roomColors: Record<string, string>
  /** nombres personalizados por roomId, vacío = usar el nombre del módulo */
  roomNames: Record<string, string>
  /** Material de piso por cuarto (solo si el usuario personalizó). null = color/imagen custom. */
  roomPisoTipos: Record<string, PisoTipoId | null>
  /** Color de piso custom por cuarto (cuando roomPisoTipos[id] === null y no hay imagen). */
  roomPisoColors: Record<string, string>
  /** URL de objeto (objeto URL) de la imagen de piso guardada por cuarto (activa o no). */
  roomPisoImagenes: Record<string, string>
  /** true = la imagen está siendo mostrada en el piso del cuarto. */
  roomPisoImagenActiva: Record<string, boolean>
  /** Modo de repetición de la imagen de piso: 'x1' | 'x2' | 'x4'. */
  roomPisoImagenAjuste: Record<string, string>
  /** Techo por cuarto: material (null = color del cuarto). Ausente = heredar el global. */
  roomTechoTipos: Record<string, TechoTipoId | null>
  /** Tinte de color del techo por cuarto (ausente = color nativo del material). */
  roomTechoColors: Record<string, string>
  /** Object URL de la imagen de techo guardada por cuarto (activa o no). */
  roomTechoImagenes: Record<string, string>
  /** true = la imagen está siendo mostrada en el techo del cuarto. */
  roomTechoImagenActiva: Record<string, boolean>
  /** Modo de repetición de la imagen de techo: 'x1' | 'x2' | 'x4'. */
  roomTechoImagenAjuste: Record<string, string>
  /** Object URL de la imagen de muro guardada por arista. Clave: `${roomId}::${edgeKey}`. */
  roomMuroImagenes: Record<string, string>
  /** true = la imagen está siendo mostrada en ese muro. Clave: `${roomId}::${edgeKey}`. */
  roomMuroImagenActiva: Record<string, boolean>
  /** Modo de repetición de la imagen de muro: 'x1' | 'x2' | 'x4'. Clave: `${roomId}::${edgeKey}`. */
  roomMuroImagenAjuste: Record<string, string>
  /** Forma del techo por cuarto (ausente = plano). */
  roomTechoFormas: Record<string, TechoFormaId>
  /** Parámetros editables de la forma del techo por cuarto (ausente = valores por defecto). */
  roomTechoParams: Record<string, TechoParams>
  /** Forma de techo POR CELDA: roomId → (offKey `offCol,offRow` → forma). Fabricación por rejilla. */
  roomTechoFormasCelda: Record<string, Record<string, TechoCeldaForma>>
  /** Extensiones de techo (celdas absolutas fuera del footprint del cuarto). */
  roomTechoExtra: Record<string, import('../house/walls').Cell[]>
  /** objetos colocados (muebles permanentes + decoración) */
  objetos: ObjetoCuarto[]
  /** objeto que se está arrastrando dentro de un cuarto (modo edición) */
  draggingObjeto: number | null
  /** IDs de objetos seleccionados para agrupar (siempre del mismo roomId). */
  seleccion: number[]
  /** Offsets de cada miembro del grupo respecto al objeto arrastrado (se calculan al iniciar el drag). */
  dragGroupOffsets: Record<number, { x: number; z: number }>
  avatar: {
    cabeza: string
    torso: string
    piernas: string
    /** Forma 3D descrita a la IA (gana a los cubos de colores). */
    modelo3d?: Pieza3D[]
    /** Modelo .glb subido por el usuario (gana a modelo3d y a los cubos). */
    modeloGlb?: Blob
  }
  /** tema estacional global de la casa; null = sin tema (se controla en el editor de mapa) */
  temaGlobal: TemaId | null
  /** estilo de techo global; null = color de cada cuarto */
  techoTipo: TechoTipoId | null
  /** fondo de cielo; `auto` = ciclo día/noche */
  fondoId: FondoId
  /** Imagen personalizada activa (null = usar fondoId preset). */
  fondoImagenActivo: number | null
  /** Galería de fondos con imagen guardados localmente. */
  fondosImagen: FondoImagen[]
  /** microanimaciones de fondo (cometas, dragones, nieve, etc.) */
  animacionesFondo: boolean
  /** Papel del croquis, rejilla y base del mapa 3D. */
  mapaSuperficie: MapaSuperficieAjustes
  cargado: boolean
  cargar: () => Promise<void>
  setTemaGlobal: (tema: TemaId | null) => Promise<void>
  setFondoId: (fondo: FondoId) => Promise<void>
  setFondoImagenActivo: (id: number | null) => Promise<void>
  agregarFondoImagen: (
    blob: Blob,
    nombre: string,
    ajuste?: AjusteFondoImagen,
  ) => Promise<number>
  actualizarFondoImagen: (
    id: number,
    patch: Partial<Pick<FondoImagen, 'nombre' | 'ajusteX' | 'ajusteY' | 'escala'>>,
  ) => Promise<void>
  eliminarFondoImagen: (id: number) => Promise<void>
  setAnimacionesFondo: (activo: boolean) => Promise<void>
  setMapaSuperficie: (ajustes: MapaSuperficieAjustes) => Promise<void>
  setTechoTipo: (tipo: TechoTipoId | null) => Promise<void>
  setRoomColor: (roomId: string, color: string) => Promise<void>
  setRoomName: (roomId: string, nombre: string) => Promise<void>
  setRoomPisoTipo: (roomId: string, tipo: PisoTipoId | null) => Promise<void>
  setRoomPisoColor: (roomId: string, color: string) => Promise<void>
  /** Sube y activa una imagen de piso nueva (blob). Reemplaza la anterior si existía. */
  subirRoomPisoImagen: (roomId: string, blob: Blob) => Promise<void>
  /** Activa la imagen guardada para este cuarto (sin re-subir). */
  activarRoomPisoImagen: (roomId: string) => Promise<void>
  /** Desactiva la imagen (la imagen sigue guardada) sin borrarla. */
  desactivarRoomPisoImagen: (roomId: string) => Promise<void>
  /** Elimina permanentemente la imagen de piso del cuarto. */
  eliminarRoomPisoImagen: (roomId: string) => Promise<void>
  /** Cambia el modo de ajuste/repetición de la imagen de piso. */
  setRoomPisoImagenAjuste: (roomId: string, ajuste: string) => Promise<void>
  /** @deprecated Usar subirRoomPisoImagen / eliminarRoomPisoImagen */
  setRoomPisoImagen: (roomId: string, dataUrl: string | null) => void
  resetRoomPiso: (roomId: string) => Promise<void>
  /** Fija el material del techo del cuarto (null = color del cuarto). */
  setRoomTechoTipo: (roomId: string, tipo: TechoTipoId | null) => Promise<void>
  /** Fija el tinte de color del techo del cuarto (null = quitar tinte). */
  setRoomTechoColor: (roomId: string, color: string | null) => Promise<void>
  /** Sube y activa una imagen de techo nueva (blob). Reemplaza la anterior si existía. */
  subirRoomTechoImagen: (roomId: string, blob: Blob) => Promise<void>
  /** Activa la imagen guardada para este techo (sin re-subir). */
  activarRoomTechoImagen: (roomId: string) => Promise<void>
  /** Desactiva la imagen del techo (sigue guardada) sin borrarla. */
  desactivarRoomTechoImagen: (roomId: string) => Promise<void>
  /** Elimina permanentemente la imagen de techo del cuarto. */
  eliminarRoomTechoImagen: (roomId: string) => Promise<void>
  /** Cambia el modo de ajuste/repetición de la imagen de techo. */
  setRoomTechoImagenAjuste: (roomId: string, ajuste: string) => Promise<void>
  /** Sube y activa una imagen de muro (arista) nueva (blob). Reemplaza la anterior si existía. */
  subirRoomMuroImagen: (roomId: string, clave: string, blob: Blob) => Promise<void>
  /** Activa la imagen guardada para ese muro (sin re-subir). */
  activarRoomMuroImagen: (roomId: string, clave: string) => Promise<void>
  /** Desactiva la imagen del muro (sigue guardada) sin borrarla. */
  desactivarRoomMuroImagen: (roomId: string, clave: string) => Promise<void>
  /** Elimina permanentemente la imagen de ese muro. */
  eliminarRoomMuroImagen: (roomId: string, clave: string) => Promise<void>
  /** Cambia el modo de ajuste/repetición de la imagen del muro. */
  setRoomMuroImagenAjuste: (roomId: string, clave: string, ajuste: string) => Promise<void>
  /** Fija la forma del techo del cuarto. */
  setRoomTechoForma: (roomId: string, forma: TechoFormaId) => Promise<void>
  /** Ajusta uno o varios parámetros de la forma del techo del cuarto. */
  setRoomTechoParam: (roomId: string, patch: Partial<TechoParams>) => Promise<void>
  /** Fija (o limpia con null) la forma de techo de UNA celda del cuarto (fabricación por rejilla). */
  setRoomTechoCeldaForma: (roomId: string, offKey: string, forma: TechoCeldaForma | null) => Promise<void>
  /** Extiende el techo una línea completa (toda una dirección) sobre cuartos vecinos. */
  addTechoLinea: (roomId: string, celdas: import('../house/walls').Cell[]) => Promise<void>
  /** Retrae una línea completa (borde) de extensión del techo. */
  removeTechoLinea: (roomId: string, celdas: import('../house/walls').Cell[]) => Promise<void>
  /** Desplaza coordenadas absolutas de techoExtra (al expandir/contraer mapa al O/N). */
  desplazarTechoExtra: (dc: number, dr: number) => Promise<void>
  /** Elimina techos en el borde que se contrae y desplaza el resto. */
  ajustarTechoEnContraccion: (dir: 'N' | 'S' | 'E' | 'O') => Promise<void>
  /** Quita celdas de techo fuera de la rejilla tras contraer al E/S. */
  podarTechoExtra: (gridCols: number, gridRows: number) => Promise<void>
  /** Quita la personalización de techo del cuarto (vuelve a heredar el global y plano). */
  resetRoomTecho: (roomId: string) => Promise<void>
  /** Agrega un objeto al cuarto. Devuelve el id del objeto creado. */
  addObjeto: (roomId: string, tipo: string, color: string, plantillaId?: string) => Promise<number>
  /** Asigna (o quita, con null) la plantilla/app de un objeto. */
  setObjetoPlantilla: (id: number, plantillaId: string | null) => Promise<void>
  /** Agrega un objeto LIBRE sobre el mapa (editor de mapa, inventario completo). */
  addObjetoMapa: (tipo: string, color: string) => Promise<void>
  toggleSeleccion: (id: number) => void
  clearSeleccion: () => void
  /** Agrupa los objetos en `seleccion` (deben ser del mismo roomId). */
  agrupar: () => Promise<void>
  /** Rompe el grupo: quita grupoId de todos sus miembros. */
  desagrupar: (grupoId: string) => Promise<void>
  setObjetoColor: (id: number, color: string) => Promise<void>
  setObjetoRotacion: (id: number, rotY: number) => Promise<void>
  /** Mueve un objeto a (x,z) relativo al centro del cuarto (solo estado). */
  setObjetoPos: (id: number, x: number, z: number) => void
  startObjetoDrag: (id: number) => void
  endObjetoDrag: () => Promise<void>
  removeObjeto: (id: number) => Promise<void>
  /** Marca un objeto como punto de entrada del cuarto (solo uno por cuarto). */
  setObjetoPrincipal: (id: number) => Promise<void>
  setAvatarColor: (
    parte: 'cabeza' | 'torso' | 'piernas',
    color: string,
  ) => Promise<void>
  /** Fija la forma 3D del avatar generada por IA (limpia el .glb). */
  setAvatarModelo3d: (piezas: Pieza3D[]) => Promise<void>
  /** Fija el modelo .glb del avatar subido por el usuario (limpia las piezas IA). */
  setAvatarGlb: (blob: Blob) => Promise<void>
  /** Quita la forma 3D personalizada y vuelve a los cubos de colores. */
  quitarAvatarModelo: () => Promise<void>
  resetRoom: (roomId: string) => Promise<void>
  resetAvatar: () => Promise<void>
}

/** Posición por defecto (local) de un objeto nuevo en un cuarto, según cuántos haya. */
function posDefault(n: number): { x: number; z: number } {
  return { x: ((n % 3) - 1) * 1.6, z: 1.4 - Math.floor(n / 3) * 1.6 }
}
/** Posición de mundo por defecto de un objeto libre nuevo, según cuántos haya. */
function posMundoDefault(n: number): { x: number; z: number } {
  return { x: ((n % 5) - 2) * 1.3, z: ((Math.floor(n / 5)) % 5) * 1.3 }
}

/** Garantiza exactamente un objeto principal (`permanente`) por cuarto con objetos. */
async function asegurarPrincipalPorCuarto(objetos: ObjetoCuarto[]): Promise<ObjetoCuarto[]> {
  const lista = [...objetos]
  const porCuarto = new Map<string, ObjetoCuarto[]>()
  for (const o of lista) {
    if (o.roomId === MAPA_ROOM) continue
    const arr = porCuarto.get(o.roomId) ?? []
    arr.push(o)
    porCuarto.set(o.roomId, arr)
  }
  for (const items of porCuarto.values()) {
    if (items.length === 0) continue
    const marcados = items.filter((o) => o.permanente === true)
    const elegido =
      marcados.length === 1
        ? marcados[0]
        : (marcados[0] ?? items.find((o) => o.tipo.startsWith('mueble:')) ?? items[0])
    for (const o of items) {
      const debe = o.id === elegido.id
      if (o.permanente === debe || o.id == null) continue
      await db.objetosCuarto.update(o.id, { permanente: debe })
      const i = lista.findIndex((x) => x.id === o.id)
      if (i >= 0) lista[i] = { ...lista[i], permanente: debe }
    }
  }
  return lista
}

async function guardarMapaSuperficieRow(a: MapaSuperficieAjustes) {
  const existing = await db.disenoRooms.where('roomId').equals(MAPA_SUPERFICIE_ID).first()
  const row = serializarMapaSuperficie(a)
  if (existing?.id) await db.disenoRooms.update(existing.id, row)
  else await db.disenoRooms.add({ roomId: MAPA_SUPERFICIE_ID, ...row })
}

async function guardarFondoRow(fondo: FondoId, anim: boolean, imagenId: number | null) {
  const existing = await db.disenoRooms.where('roomId').equals(FONDO_ROW).first()
  const row = {
    nombre: fondo,
    color: anim ? '1' : '0',
    muebleColor: imagenId != null ? String(imagenId) : '',
  }
  if (existing?.id) await db.disenoRooms.update(existing.id, row)
  else await db.disenoRooms.add({ roomId: FONDO_ROW, ...row })
}

/** Persiste la fila única del avatar (colores + forma 3D personalizada). */
async function guardarAvatar(av: DisenoState['avatar']) {
  const row = {
    cabeza: av.cabeza,
    torso: av.torso,
    piernas: av.piernas,
    modelo3d: av.modelo3d ? JSON.stringify(av.modelo3d) : '',
    modeloGlb: av.modeloGlb,
  }
  const existing = await db.disenoAvatar.toArray()
  if (existing[0]?.id) await db.disenoAvatar.update(existing[0].id, row)
  else await db.disenoAvatar.add(row)
}

export function objetosDeCuarto(objetos: ObjetoCuarto[], roomId: string) {
  return objetos.filter((o) => o.roomId === roomId)
}

export function objetosDecorativos(objetos: ObjetoCuarto[], roomId: string) {
  return objetos.filter((o) => o.roomId === roomId && !esMueblePrincipal(o))
}

/** Objetos libres colocados sobre el mapa (fuera de los cuartos). */
export function objetosMapa(objetos: ObjetoCuarto[]) {
  return objetos.filter(esObjetoMapa)
}

export function muebleDeCuarto(objetos: ObjetoCuarto[], roomId: string) {
  const delCuarto = objetosDeCuarto(objetos, roomId)
  return delCuarto.find((o) => esMueblePrincipal(o)) ?? delCuarto[0]
}

export const useDiseño = create<DisenoState>((set, get) => ({
  roomColors: {},
  roomNames: {},
  roomPisoTipos: {},
  roomPisoColors: {},
  roomPisoImagenes: {},
  roomPisoImagenActiva: {},
  roomPisoImagenAjuste: {},
  roomTechoTipos: {},
  roomTechoColors: {},
  roomTechoImagenes: {},
  roomTechoImagenActiva: {},
  roomTechoImagenAjuste: {},
  roomMuroImagenes: {},
  roomMuroImagenActiva: {},
  roomMuroImagenAjuste: {},
  roomTechoFormas: {},
  roomTechoParams: {},
  roomTechoFormasCelda: {},
  roomTechoExtra: {},
  objetos: [],
  draggingObjeto: null,
  seleccion: [],
  dragGroupOffsets: {},
  avatar: { ...AVATAR_DEFAULT },
  temaGlobal: null,
  techoTipo: null,
  fondoId: 'auto',
  fondoImagenActivo: null,
  fondosImagen: [],
  animacionesFondo: true,
  mapaSuperficie: { ...MAPA_SUPERFICIE_DEFAULT },
  cargado: false,

  cargar: async () => {
    const [disenoRooms, disenoAvatars, objetos, fondosImagen, pisosImagen, techosImagen, murosImagen] = await Promise.all([
      db.disenoRooms.toArray(),
      db.disenoAvatar.toArray(),
      db.objetosCuarto.toArray(),
      db.fondosImagen.orderBy('creado').reverse().toArray(),
      db.pisosImagenCuarto.toArray(),
      db.techosImagenCuarto.toArray(),
      db.murosImagenCuarto.toArray(),
    ])
    const roomColors: Record<string, string> = {}
    const roomNames: Record<string, string> = {}
    const roomPisoTipos: Record<string, PisoTipoId | null> = {}
    const roomPisoColors: Record<string, string> = {}
    const roomTechoTipos: Record<string, TechoTipoId | null> = {}
    const roomTechoColors: Record<string, string> = {}
    const roomTechoFormas: Record<string, TechoFormaId> = {}
    const roomTechoParams: Record<string, TechoParams> = {}
    const roomTechoFormasCelda: Record<string, Record<string, TechoCeldaForma>> = {}
    const roomTechoExtra: Record<string, import('../house/walls').Cell[]> = {}
    let temaGlobal: TemaId | null = null
    let techoTipo: TechoTipoId | null = null
    let fondoId: FondoId = 'auto'
    let animacionesFondo = true
    let fondoImagenActivo: number | null = null
    let mapaSuperficie: MapaSuperficieAjustes = { ...MAPA_SUPERFICIE_DEFAULT }
    for (const d of disenoRooms) {
      if (d.roomId === MAPA_SUPERFICIE_ID) {
        mapaSuperficie = parseMapaSuperficieRow(d.color, d.nombre)
        continue
      }
      if (d.roomId === TEMA_ROW) {
        temaGlobal = (d.nombre as TemaId) || null
        continue
      }
      if (d.roomId === FONDO_ROW) {
        fondoId = (d.nombre as FondoId) || 'auto'
        animacionesFondo = d.color !== '0'
        const imgId = parseInt(d.muebleColor ?? '', 10)
        if (!Number.isNaN(imgId) && fondosImagen.some((f) => f.id === imgId)) {
          fondoImagenActivo = imgId
        }
        continue
      }
      if (d.roomId === PISO_TIPO_ROW) continue
      if (d.roomId === TECHO_TIPO_ROW) {
        techoTipo = (d.nombre as TechoTipoId) || null
        continue
      }
      if (d.roomId === MASCOTA_ROW) continue
      if (d.color) roomColors[d.roomId] = d.color
      if (d.nombre) roomNames[d.roomId] = d.nombre
      if (d.pisoTipo !== undefined && d.pisoTipo !== '') {
        roomPisoTipos[d.roomId] = d.pisoTipo as PisoTipoId
      } else if (d.pisoColor) {
        roomPisoTipos[d.roomId] = null
      }
      if (d.pisoColor) roomPisoColors[d.roomId] = d.pisoColor
      if (d.techoTipo !== undefined) {
        roomTechoTipos[d.roomId] = d.techoTipo === '__color__' ? null : (d.techoTipo as TechoTipoId)
      }
      if (d.techoColor) roomTechoColors[d.roomId] = d.techoColor
      if (d.techoForma) roomTechoFormas[d.roomId] = d.techoForma as TechoFormaId
      if (d.techoParams) {
        roomTechoParams[d.roomId] = { ...TECHO_PARAMS_DEFAULT, ...(d.techoParams as Partial<TechoParams>) }
      }
      if (d.techoFormasCelda && Object.keys(d.techoFormasCelda).length) {
        roomTechoFormasCelda[d.roomId] = d.techoFormasCelda
      }
      if (d.techoExtra?.length) roomTechoExtra[d.roomId] = d.techoExtra
    }
    // Imágenes de piso persistidas: crear object URLs y poblar mapas
    const roomPisoImagenes: Record<string, string> = {}
    const roomPisoImagenActiva: Record<string, boolean> = {}
    const roomPisoImagenAjuste: Record<string, string> = {}
    for (const p of pisosImagen) {
      const url = URL.createObjectURL(p.imagen)
      roomPisoImagenes[p.roomId] = url
      roomPisoImagenActiva[p.roomId] = p.activa
      roomPisoImagenAjuste[p.roomId] = p.ajuste || 'x1'
      if (p.activa) {
        // La imagen activa marca el cuarto como "personalizado" (pisoTipo=null)
        roomPisoTipos[p.roomId] = null
      }
    }

    // Imágenes de techo persistidas: igual que el piso
    const roomTechoImagenes: Record<string, string> = {}
    const roomTechoImagenActiva: Record<string, boolean> = {}
    const roomTechoImagenAjuste: Record<string, string> = {}
    for (const t of techosImagen) {
      const url = URL.createObjectURL(t.imagen)
      roomTechoImagenes[t.roomId] = url
      roomTechoImagenActiva[t.roomId] = t.activa
      roomTechoImagenAjuste[t.roomId] = t.ajuste || 'x1'
    }

    // Imágenes de muro (por arista) persistidas: clave `${roomId}::${edgeKey}`
    const roomMuroImagenes: Record<string, string> = {}
    const roomMuroImagenActiva: Record<string, boolean> = {}
    const roomMuroImagenAjuste: Record<string, string> = {}
    for (const m of murosImagen) {
      const k = `${m.roomId}::${m.clave}`
      roomMuroImagenes[k] = URL.createObjectURL(m.imagen)
      roomMuroImagenActiva[k] = m.activa
      roomMuroImagenAjuste[k] = m.ajuste || 'x1'
    }

    const objetosConMuebles = await asegurarPrincipalPorCuarto(objetos)
    const av = disenoAvatars[0]
    let avModelo3d: Pieza3D[] | undefined
    if (av?.modelo3d) {
      try {
        avModelo3d = JSON.parse(av.modelo3d) as Pieza3D[]
      } catch {
        avModelo3d = undefined
      }
    }
    set({
      roomColors,
      roomNames,
      roomPisoTipos,
      roomPisoColors,
      roomPisoImagenes,
      roomPisoImagenActiva,
      roomPisoImagenAjuste,
      roomTechoTipos,
      roomTechoColors,
      roomTechoImagenes,
      roomTechoImagenActiva,
      roomTechoImagenAjuste,
      roomMuroImagenes,
      roomMuroImagenActiva,
      roomMuroImagenAjuste,
      roomTechoFormas,
      roomTechoParams,
      roomTechoFormasCelda,
      roomTechoExtra,
      objetos: objetosConMuebles,
      temaGlobal,
      techoTipo,
      fondoId,
      fondoImagenActivo,
      fondosImagen,
      animacionesFondo,
      mapaSuperficie,
      avatar: av
        ? {
            cabeza: av.cabeza,
            torso: av.torso,
            piernas: av.piernas,
            modelo3d: avModelo3d,
            modeloGlb: av.modeloGlb,
          }
        : { ...AVATAR_DEFAULT },
      cargado: true,
    })
  },

  setTechoTipo: async (tipo) => {
    set({ techoTipo: tipo })
    const existing = await db.disenoRooms.where('roomId').equals(TECHO_TIPO_ROW).first()
    if (existing?.id) await db.disenoRooms.update(existing.id, { nombre: tipo ?? '' })
    else await db.disenoRooms.add({ roomId: TECHO_TIPO_ROW, color: '', nombre: tipo ?? '' })
  },

  setTemaGlobal: async (tema) => {
    const fondoPorTema = fondoSugeridoPorTema(tema)
    const techoPorTema = techoSugeridoPorTema(tema)
    set({
      temaGlobal: tema,
      fondoId: fondoPorTema,
      fondoImagenActivo: null,
      techoTipo: techoPorTema,
    })
    const existing = await db.disenoRooms.where('roomId').equals(TEMA_ROW).first()
    if (existing?.id) await db.disenoRooms.update(existing.id, { nombre: tema ?? '' })
    else await db.disenoRooms.add({ roomId: TEMA_ROW, color: '', nombre: tema ?? '' })
    const et = await db.disenoRooms.where('roomId').equals(TECHO_TIPO_ROW).first()
    if (et?.id) await db.disenoRooms.update(et.id, { nombre: techoPorTema ?? '' })
    else await db.disenoRooms.add({ roomId: TECHO_TIPO_ROW, color: '', nombre: techoPorTema ?? '' })
    const anim = get().animacionesFondo
    await guardarFondoRow(fondoPorTema, anim, null)
  },

  setFondoId: async (fondo) => {
    set({ fondoId: fondo, fondoImagenActivo: null })
    await guardarFondoRow(fondo, get().animacionesFondo, null)
  },

  setFondoImagenActivo: async (id) => {
    if (id != null && !get().fondosImagen.some((f) => f.id === id)) return
    set({ fondoImagenActivo: id })
    await guardarFondoRow(get().fondoId, get().animacionesFondo, id)
  },

  agregarFondoImagen: async (blob, nombre, ajuste = AJUSTE_FONDO_DEFAULT) => {
    const { ancho, alto } = await medirImagen(blob)
    const item: Omit<FondoImagen, 'id'> = {
      nombre: nombre.trim() || 'Mi fondo',
      imagen: blob,
      ancho,
      alto,
      ...ajusteADb(ajuste),
      creado: new Date().toISOString(),
    }
    const id = await db.fondosImagen.add(item)
    const nuevo = { id, ...item }
    set((s) => ({
      fondosImagen: [nuevo, ...s.fondosImagen],
      fondoImagenActivo: id,
    }))
    await guardarFondoRow(get().fondoId, get().animacionesFondo, id)
    return id
  },

  actualizarFondoImagen: async (id, patch) => {
    await db.fondosImagen.update(id, patch)
    set((s) => ({
      fondosImagen: s.fondosImagen.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    }))
  },

  eliminarFondoImagen: async (id) => {
    await db.fondosImagen.delete(id)
    const eraActivo = get().fondoImagenActivo === id
    set((s) => ({
      fondosImagen: s.fondosImagen.filter((f) => f.id !== id),
      fondoImagenActivo: eraActivo ? null : s.fondoImagenActivo,
    }))
    if (eraActivo) await guardarFondoRow(get().fondoId, get().animacionesFondo, null)
  },

  setAnimacionesFondo: async (activo) => {
    set({ animacionesFondo: activo })
    await guardarFondoRow(get().fondoId, activo, get().fondoImagenActivo)
  },

  setMapaSuperficie: async (ajustes) => {
    set({ mapaSuperficie: ajustes })
    await guardarMapaSuperficieRow(ajustes)
  },

  setRoomColor: async (roomId, color) => {
    set((s) => ({ roomColors: { ...s.roomColors, [roomId]: color } }))
    const existing = await db.disenoRooms.where('roomId').equals(roomId).first()
    if (existing?.id) await db.disenoRooms.update(existing.id, { color })
    else await db.disenoRooms.add({ roomId, color, nombre: '' })
  },

  setRoomName: async (roomId, nombre) => {
    set((s) => ({ roomNames: { ...s.roomNames, [roomId]: nombre } }))
    const existing = await db.disenoRooms.where('roomId').equals(roomId).first()
    if (existing?.id) await db.disenoRooms.update(existing.id, { nombre })
    else {
      const defaultColor = colorCuarto(roomId)
      await db.disenoRooms.add({ roomId, color: defaultColor, nombre })
    }
  },

  setRoomPisoTipo: async (roomId, tipo) => {
    const colorFallback =
      get().roomPisoColors[roomId] ?? colorCuarto(roomId)
    set((s) => {
      const activa = { ...s.roomPisoImagenActiva }
      const cols = { ...s.roomPisoColors }
      if (tipo !== null) {
        activa[roomId] = false // un material concreto desactiva la imagen (sin borrarla)
        delete cols[roomId]   // la textura se muestra nativa; el color es un tinte opcional
      } else {
        cols[roomId] = cols[roomId] ?? colorFallback
      }
      return {
        roomPisoTipos: { ...s.roomPisoTipos, [roomId]: tipo },
        roomPisoImagenActiva: activa,
        roomPisoColors: cols,
      }
    })
    // Si hay imagen guardada y seleccionamos una textura, marcarla inactiva en DB
    if (tipo !== null) {
      const row = await db.pisosImagenCuarto.where('roomId').equals(roomId).first()
      if (row?.id) await db.pisosImagenCuarto.update(row.id, { activa: false })
    }
    const existing = await db.disenoRooms.where('roomId').equals(roomId).first()
    const pisoColor = tipo === null ? get().roomPisoColors[roomId] : ''
    if (existing?.id) {
      await db.disenoRooms.update(existing.id, { pisoTipo: tipo ?? '', pisoColor })
    } else {
      const defaultColor = colorCuarto(roomId)
      await db.disenoRooms.add({
        roomId,
        color: defaultColor,
        nombre: '',
        pisoTipo: tipo ?? '',
        ...(tipo === null ? { pisoColor: get().roomPisoColors[roomId] ?? defaultColor } : {}),
      })
    }
  },

  setRoomPisoColor: async (roomId, color) => {
    // Conserva el tipo actual: si hay textura, el color la tinta; si no, es color sólido.
    const tipoActual = get().roomPisoTipos[roomId] ?? null
    set((s) => ({
      roomPisoTipos: { ...s.roomPisoTipos, [roomId]: tipoActual },
      roomPisoColors: { ...s.roomPisoColors, [roomId]: color },
      roomPisoImagenActiva: { ...s.roomPisoImagenActiva, [roomId]: false }, // desactiva la imagen
    }))
    const existing = await db.disenoRooms.where('roomId').equals(roomId).first()
    const pisoTipo = tipoActual ?? ''
    if (existing?.id) await db.disenoRooms.update(existing.id, { pisoTipo, pisoColor: color })
    else {
      const defaultColor = colorCuarto(roomId)
      await db.disenoRooms.add({ roomId, color: defaultColor, nombre: '', pisoTipo, pisoColor: color })
    }
  },

  resetRoomPiso: async (roomId) => {
    const url = get().roomPisoImagenes[roomId]
    if (url) URL.revokeObjectURL(url)
    set((s) => {
      const tipos = { ...s.roomPisoTipos }
      const colores = { ...s.roomPisoColors }
      const imgs = { ...s.roomPisoImagenes }
      const activa = { ...s.roomPisoImagenActiva }
      const ajuste = { ...s.roomPisoImagenAjuste }
      delete tipos[roomId]; delete colores[roomId]; delete imgs[roomId]
      delete activa[roomId]; delete ajuste[roomId]
      return { roomPisoTipos: tipos, roomPisoColors: colores, roomPisoImagenes: imgs, roomPisoImagenActiva: activa, roomPisoImagenAjuste: ajuste }
    })
    const existing = await db.disenoRooms.where('roomId').equals(roomId).first()
    if (existing?.id) await db.disenoRooms.update(existing.id, { pisoTipo: '', pisoColor: '' })
    await db.pisosImagenCuarto.where('roomId').equals(roomId).delete()
  },

  subirRoomPisoImagen: async (roomId, blob) => {
    // Revocar URL anterior si existía
    const oldUrl = get().roomPisoImagenes[roomId]
    if (oldUrl) URL.revokeObjectURL(oldUrl)
    const ajuste = get().roomPisoImagenAjuste[roomId] ?? 'x1'
    const row = await db.pisosImagenCuarto.where('roomId').equals(roomId).first()
    if (row?.id) {
      await db.pisosImagenCuarto.update(row.id, { imagen: blob, ajuste, activa: true })
    } else {
      await db.pisosImagenCuarto.add({ roomId, imagen: blob, ajuste, activa: true })
    }
    const url = URL.createObjectURL(blob)
    // Persiste pisoTipo=null en disenoRooms para que cargar() lo restaure correctamente
    const existing = await db.disenoRooms.where('roomId').equals(roomId).first()
    if (existing?.id) await db.disenoRooms.update(existing.id, { pisoTipo: '' })
    else {
      const defaultColor = colorCuarto(roomId)
      await db.disenoRooms.add({ roomId, color: defaultColor, nombre: '', pisoTipo: '' })
    }
    set((s) => ({
      roomPisoImagenes: { ...s.roomPisoImagenes, [roomId]: url },
      roomPisoImagenActiva: { ...s.roomPisoImagenActiva, [roomId]: true },
      roomPisoTipos: { ...s.roomPisoTipos, [roomId]: null },
    }))
  },

  activarRoomPisoImagen: async (roomId) => {
    const row = await db.pisosImagenCuarto.where('roomId').equals(roomId).first()
    if (row?.id) await db.pisosImagenCuarto.update(row.id, { activa: true })
    const existing = await db.disenoRooms.where('roomId').equals(roomId).first()
    if (existing?.id) await db.disenoRooms.update(existing.id, { pisoTipo: '' })
    set((s) => ({
      roomPisoImagenActiva: { ...s.roomPisoImagenActiva, [roomId]: true },
      roomPisoTipos: { ...s.roomPisoTipos, [roomId]: null },
    }))
  },

  desactivarRoomPisoImagen: async (roomId) => {
    const row = await db.pisosImagenCuarto.where('roomId').equals(roomId).first()
    if (row?.id) await db.pisosImagenCuarto.update(row.id, { activa: false })
    set((s) => ({
      roomPisoImagenActiva: { ...s.roomPisoImagenActiva, [roomId]: false },
    }))
  },

  eliminarRoomPisoImagen: async (roomId) => {
    const url = get().roomPisoImagenes[roomId]
    if (url) URL.revokeObjectURL(url)
    await db.pisosImagenCuarto.where('roomId').equals(roomId).delete()
    set((s) => {
      const imgs = { ...s.roomPisoImagenes }
      const activa = { ...s.roomPisoImagenActiva }
      const ajuste = { ...s.roomPisoImagenAjuste }
      delete imgs[roomId]; delete activa[roomId]; delete ajuste[roomId]
      return { roomPisoImagenes: imgs, roomPisoImagenActiva: activa, roomPisoImagenAjuste: ajuste }
    })
  },

  setRoomPisoImagenAjuste: async (roomId, ajuste) => {
    set((s) => ({ roomPisoImagenAjuste: { ...s.roomPisoImagenAjuste, [roomId]: ajuste } }))
    const row = await db.pisosImagenCuarto.where('roomId').equals(roomId).first()
    if (row?.id) await db.pisosImagenCuarto.update(row.id, { ajuste })
  },

  // Mantener compatibilidad con código existente (el editor ya usa subirRoomPisoImagen)
  setRoomPisoImagen: (roomId, dataUrl) => {
    set((s) => {
      const imgs = { ...s.roomPisoImagenes }
      const activa = { ...s.roomPisoImagenActiva }
      if (dataUrl) {
        imgs[roomId] = dataUrl
        activa[roomId] = true
        return { roomPisoImagenes: imgs, roomPisoImagenActiva: activa, roomPisoTipos: { ...s.roomPisoTipos, [roomId]: null } }
      }
      delete imgs[roomId]; delete activa[roomId]
      return { roomPisoImagenes: imgs, roomPisoImagenActiva: activa }
    })
  },

  setRoomTechoTipo: async (roomId, tipo) => {
    // Elegir un material desactiva la imagen (pero la conserva para re-usarla).
    set((s) => ({
      roomTechoTipos: { ...s.roomTechoTipos, [roomId]: tipo },
      roomTechoImagenActiva: { ...s.roomTechoImagenActiva, [roomId]: false },
    }))
    const imgRow = await db.techosImagenCuarto.where('roomId').equals(roomId).first()
    if (imgRow?.id) await db.techosImagenCuarto.update(imgRow.id, { activa: false })
    const val = tipo === null ? '__color__' : tipo
    const existing = await db.disenoRooms.where('roomId').equals(roomId).first()
    if (existing?.id) await db.disenoRooms.update(existing.id, { techoTipo: val })
    else {
      const defaultColor = colorCuarto(roomId)
      await db.disenoRooms.add({ roomId, color: defaultColor, nombre: '', techoTipo: val })
    }
  },

  setRoomTechoColor: async (roomId, color) => {
    // Elegir un color desactiva la imagen (pero la conserva para re-usarla).
    set((s) => {
      const cols = { ...s.roomTechoColors }
      if (color) cols[roomId] = color
      else delete cols[roomId]
      return { roomTechoColors: cols, roomTechoImagenActiva: { ...s.roomTechoImagenActiva, [roomId]: false } }
    })
    const imgRow = await db.techosImagenCuarto.where('roomId').equals(roomId).first()
    if (imgRow?.id) await db.techosImagenCuarto.update(imgRow.id, { activa: false })
    const existing = await db.disenoRooms.where('roomId').equals(roomId).first()
    if (existing?.id) await db.disenoRooms.update(existing.id, { techoColor: color ?? '' })
    else if (color) {
      const defaultColor = colorCuarto(roomId)
      await db.disenoRooms.add({ roomId, color: defaultColor, nombre: '', techoColor: color })
    }
  },

  subirRoomTechoImagen: async (roomId, blob) => {
    const oldUrl = get().roomTechoImagenes[roomId]
    if (oldUrl) URL.revokeObjectURL(oldUrl)
    const ajuste = get().roomTechoImagenAjuste[roomId] ?? 'x1'
    const row = await db.techosImagenCuarto.where('roomId').equals(roomId).first()
    if (row?.id) await db.techosImagenCuarto.update(row.id, { imagen: blob, ajuste, activa: true })
    else await db.techosImagenCuarto.add({ roomId, imagen: blob, ajuste, activa: true })
    const url = URL.createObjectURL(blob)
    set((s) => ({
      roomTechoImagenes: { ...s.roomTechoImagenes, [roomId]: url },
      roomTechoImagenActiva: { ...s.roomTechoImagenActiva, [roomId]: true },
    }))
  },

  activarRoomTechoImagen: async (roomId) => {
    const row = await db.techosImagenCuarto.where('roomId').equals(roomId).first()
    if (row?.id) await db.techosImagenCuarto.update(row.id, { activa: true })
    set((s) => ({ roomTechoImagenActiva: { ...s.roomTechoImagenActiva, [roomId]: true } }))
  },

  desactivarRoomTechoImagen: async (roomId) => {
    const row = await db.techosImagenCuarto.where('roomId').equals(roomId).first()
    if (row?.id) await db.techosImagenCuarto.update(row.id, { activa: false })
    set((s) => ({ roomTechoImagenActiva: { ...s.roomTechoImagenActiva, [roomId]: false } }))
  },

  eliminarRoomTechoImagen: async (roomId) => {
    const url = get().roomTechoImagenes[roomId]
    if (url) URL.revokeObjectURL(url)
    await db.techosImagenCuarto.where('roomId').equals(roomId).delete()
    set((s) => {
      const imgs = { ...s.roomTechoImagenes }
      const activa = { ...s.roomTechoImagenActiva }
      const ajuste = { ...s.roomTechoImagenAjuste }
      delete imgs[roomId]; delete activa[roomId]; delete ajuste[roomId]
      return { roomTechoImagenes: imgs, roomTechoImagenActiva: activa, roomTechoImagenAjuste: ajuste }
    })
  },

  setRoomTechoImagenAjuste: async (roomId, ajuste) => {
    set((s) => ({ roomTechoImagenAjuste: { ...s.roomTechoImagenAjuste, [roomId]: ajuste } }))
    const row = await db.techosImagenCuarto.where('roomId').equals(roomId).first()
    if (row?.id) await db.techosImagenCuarto.update(row.id, { ajuste })
  },

  subirRoomMuroImagen: async (roomId, clave, blob) => {
    const k = `${roomId}::${clave}`
    const oldUrl = get().roomMuroImagenes[k]
    if (oldUrl) URL.revokeObjectURL(oldUrl)
    const ajuste = get().roomMuroImagenAjuste[k] ?? 'x1'
    const row = await db.murosImagenCuarto.where({ roomId, clave }).first()
    if (row?.id) await db.murosImagenCuarto.update(row.id, { imagen: blob, ajuste, activa: true })
    else await db.murosImagenCuarto.add({ roomId, clave, imagen: blob, ajuste, activa: true })
    const url = URL.createObjectURL(blob)
    set((s) => ({
      roomMuroImagenes: { ...s.roomMuroImagenes, [k]: url },
      roomMuroImagenActiva: { ...s.roomMuroImagenActiva, [k]: true },
      roomMuroImagenAjuste: { ...s.roomMuroImagenAjuste, [k]: ajuste },
    }))
  },

  activarRoomMuroImagen: async (roomId, clave) => {
    const k = `${roomId}::${clave}`
    const row = await db.murosImagenCuarto.where({ roomId, clave }).first()
    if (row?.id) await db.murosImagenCuarto.update(row.id, { activa: true })
    set((s) => ({ roomMuroImagenActiva: { ...s.roomMuroImagenActiva, [k]: true } }))
  },

  desactivarRoomMuroImagen: async (roomId, clave) => {
    const k = `${roomId}::${clave}`
    const row = await db.murosImagenCuarto.where({ roomId, clave }).first()
    if (row?.id) await db.murosImagenCuarto.update(row.id, { activa: false })
    set((s) => ({ roomMuroImagenActiva: { ...s.roomMuroImagenActiva, [k]: false } }))
  },

  eliminarRoomMuroImagen: async (roomId, clave) => {
    const k = `${roomId}::${clave}`
    const url = get().roomMuroImagenes[k]
    if (url) URL.revokeObjectURL(url)
    await db.murosImagenCuarto.where({ roomId, clave }).delete()
    set((s) => {
      const imgs = { ...s.roomMuroImagenes }
      const activa = { ...s.roomMuroImagenActiva }
      const ajuste = { ...s.roomMuroImagenAjuste }
      delete imgs[k]; delete activa[k]; delete ajuste[k]
      return { roomMuroImagenes: imgs, roomMuroImagenActiva: activa, roomMuroImagenAjuste: ajuste }
    })
  },

  setRoomMuroImagenAjuste: async (roomId, clave, ajuste) => {
    const k = `${roomId}::${clave}`
    set((s) => ({ roomMuroImagenAjuste: { ...s.roomMuroImagenAjuste, [k]: ajuste } }))
    const row = await db.murosImagenCuarto.where({ roomId, clave }).first()
    if (row?.id) await db.murosImagenCuarto.update(row.id, { ajuste })
  },

  setRoomTechoForma: async (roomId, forma) => {
    set((s) => ({ roomTechoFormas: { ...s.roomTechoFormas, [roomId]: forma } }))
    const existing = await db.disenoRooms.where('roomId').equals(roomId).first()
    if (existing?.id) await db.disenoRooms.update(existing.id, { techoForma: forma })
    else {
      const defaultColor = colorCuarto(roomId)
      await db.disenoRooms.add({ roomId, color: defaultColor, nombre: '', techoForma: forma })
    }
  },

  setRoomTechoParam: async (roomId, patch) => {
    const actual = get().roomTechoParams[roomId] ?? TECHO_PARAMS_DEFAULT
    const merged = { ...actual, ...patch }
    set((s) => ({ roomTechoParams: { ...s.roomTechoParams, [roomId]: merged } }))
    const existing = await db.disenoRooms.where('roomId').equals(roomId).first()
    if (existing?.id) await db.disenoRooms.update(existing.id, { techoParams: merged })
    else {
      const defaultColor = colorCuarto(roomId)
      await db.disenoRooms.add({ roomId, color: defaultColor, nombre: '', techoParams: merged })
    }
  },

  setRoomTechoCeldaForma: async (roomId, offKey, forma) => {
    const prev = get().roomTechoFormasCelda[roomId] ?? {}
    const next = { ...prev }
    if (forma) next[offKey] = forma
    else delete next[offKey]
    set((s) => {
      const room = { ...s.roomTechoFormasCelda }
      if (Object.keys(next).length) room[roomId] = next
      else delete room[roomId]
      return { roomTechoFormasCelda: room }
    })
    const persistible = Object.keys(next).length ? next : undefined
    const existing = await db.disenoRooms.where('roomId').equals(roomId).first()
    if (existing?.id) await db.disenoRooms.update(existing.id, { techoFormasCelda: persistible })
    else if (persistible) {
      const defaultColor = colorCuarto(roomId)
      await db.disenoRooms.add({ roomId, color: defaultColor, nombre: '', techoFormasCelda: persistible })
    }
  },

  resetRoomTecho: async (roomId) => {
    // Vuelve a heredar el techo de la casa, pero CONSERVA la imagen subida
    // (solo se desactiva) para poder re-elegirla después. Solo el botón ✕ la borra.
    set((s) => {
      const tipos = { ...s.roomTechoTipos }
      const cols = { ...s.roomTechoColors }
      const formas = { ...s.roomTechoFormas }
      const params = { ...s.roomTechoParams }
      const formasCelda = { ...s.roomTechoFormasCelda }
      const extra = { ...s.roomTechoExtra }
      delete tipos[roomId]; delete cols[roomId]
      delete formas[roomId]; delete params[roomId]; delete formasCelda[roomId]; delete extra[roomId]
      return {
        roomTechoTipos: tipos, roomTechoColors: cols,
        roomTechoFormas: formas, roomTechoParams: params, roomTechoFormasCelda: formasCelda, roomTechoExtra: extra,
        roomTechoImagenActiva: { ...s.roomTechoImagenActiva, [roomId]: false },
      }
    })
    const imgRow = await db.techosImagenCuarto.where('roomId').equals(roomId).first()
    if (imgRow?.id) await db.techosImagenCuarto.update(imgRow.id, { activa: false })
    const existing = await db.disenoRooms.where('roomId').equals(roomId).first()
    if (existing?.id) {
      await db.disenoRooms.where('id').equals(existing.id).modify((o) => {
        delete (o as DisenoRoom).techoTipo
        delete (o as DisenoRoom).techoColor
        delete (o as DisenoRoom).techoForma
        delete (o as DisenoRoom).techoParams
        delete (o as DisenoRoom).techoFormasCelda
        delete (o as DisenoRoom).techoExtra
      })
    }
  },

  addTechoLinea: async (roomId, celdas) => {
    const { cells, footprints, ocupadoPorNivel, niveles, gridCols, gridRows } =
      useLayout.getState()
    const anchor = cells[roomId]
    if (!anchor || !celdas.length) return

    const fp = footprints[roomId] ?? FOOTPRINT_DEFAULT
    const base = footprintCells(anchor, fp)
    const baseSet = new Set(base.map((c) => cellId(c.col, c.row)))
    const prev = get().roomTechoExtra[roomId] ?? []
    const prevSet = new Set(prev.map((c) => cellId(c.col, c.row)))
    const nivel = niveles[roomId] ?? 0
    const ocupado = ocupadoPorNivel.get(nivel)
    const ocupadoSup = ocupadoPorNivel.get(nivel + 1)

    const nuevas: import('../house/walls').Cell[] = []
    for (const abs of celdas) {
      if (abs.col < 0 || abs.row < 0 || abs.col > gridCols - 1 || abs.row > gridRows - 1) return
      const k = cellId(abs.col, abs.row)
      if (baseSet.has(k) || prevSet.has(k)) continue
      if (!ocupado || !tileOcupado(ocupado, abs.col, abs.row)) return // toda la línea debe estar sobre cuartos
      if (ocupadoSup && tileOcupado(ocupadoSup, abs.col, abs.row)) return
      nuevas.push(abs)
    }
    if (!nuevas.length) return

    const next = [...prev, ...nuevas]
    set((s) => ({ roomTechoExtra: { ...s.roomTechoExtra, [roomId]: next } }))
    const existing = await db.disenoRooms.where('roomId').equals(roomId).first()
    if (existing?.id) await db.disenoRooms.update(existing.id, { techoExtra: next })
    else {
      const defaultColor = colorCuarto(roomId)
      await db.disenoRooms.add({ roomId, color: defaultColor, nombre: '', techoExtra: next })
    }
  },

  desplazarTechoExtra: async (dc, dr) => {
    const prev = get().roomTechoExtra
    const ids = Object.keys(prev)
    if (!ids.length) return
    const next: Record<string, import('../house/walls').Cell[]> = {}
    for (const roomId of ids) {
      next[roomId] = prev[roomId].map((c) => ({ col: c.col + dc, row: c.row + dr }))
    }
    set({ roomTechoExtra: next })
    await Promise.all(
      ids.map(async (roomId) => {
        const existing = await db.disenoRooms.where('roomId').equals(roomId).first()
        if (existing?.id) await db.disenoRooms.update(existing.id, { techoExtra: next[roomId] })
      }),
    )
  },

  ajustarTechoEnContraccion: async (dir) => {
    const prev = get().roomTechoExtra
    const ids = Object.keys(prev)
    if (!ids.length) return

    const filtrar = (c: import('../house/walls').Cell) => {
      if (dir === 'O') return c.col !== 0
      if (dir === 'E') return true // se poda después por gridCols en layout
      if (dir === 'N') return c.row !== 0
      return true
    }
    const dc = dir === 'O' ? -1 : 0
    const dr = dir === 'N' ? -1 : 0

    const next: Record<string, import('../house/walls').Cell[]> = {}
    for (const roomId of ids) {
      const podado = prev[roomId].filter(filtrar).map((c) => ({ col: c.col + dc, row: c.row + dr }))
      if (podado.length) next[roomId] = podado
    }
    set({ roomTechoExtra: next })
    await Promise.all(
      Object.entries(next).map(async ([roomId, extra]) => {
        const existing = await db.disenoRooms.where('roomId').equals(roomId).first()
        if (existing?.id) await db.disenoRooms.update(existing.id, { techoExtra: extra })
      }),
    )
    // Quitar techoExtra vacío de la DB
    for (const roomId of ids) {
      if (next[roomId]) continue
      const existing = await db.disenoRooms.where('roomId').equals(roomId).first()
      if (existing?.id) {
        await db.disenoRooms.where('id').equals(existing.id).modify((o) => {
          delete (o as DisenoRoom).techoExtra
        })
      }
    }
  },

  podarTechoExtra: async (gridCols, gridRows) => {
    const prev = get().roomTechoExtra
    const ids = Object.keys(prev)
    if (!ids.length) return
    const next: Record<string, import('../house/walls').Cell[]> = {}
    for (const roomId of ids) {
      const filtrado = prev[roomId].filter(
        (c) => c.col >= 0 && c.row >= 0 && c.col < gridCols && c.row < gridRows,
      )
      if (filtrado.length) next[roomId] = filtrado
    }
    set({ roomTechoExtra: next })
    await Promise.all(
      ids.map(async (roomId) => {
        const existing = await db.disenoRooms.where('roomId').equals(roomId).first()
        if (!existing?.id) return
        const extra = next[roomId]
        if (extra?.length) await db.disenoRooms.update(existing.id, { techoExtra: extra })
        else {
          await db.disenoRooms.where('id').equals(existing.id).modify((o) => {
            delete (o as DisenoRoom).techoExtra
          })
        }
      }),
    )
  },

  removeTechoLinea: async (roomId, celdas) => {
    const anchor = useLayout.getState().cells[roomId]
    if (!anchor || !celdas.length) return
    const fp = useLayout.getState().footprints[roomId] ?? FOOTPRINT_DEFAULT
    const prev = get().roomTechoExtra[roomId] ?? []
    const quitar = new Set(celdas.map((c) => cellId(c.col, c.row)))
    const resto = prev.filter((c) => !quitar.has(cellId(c.col, c.row)))
    if (resto.length === prev.length) return // nada que quitar

    const base = footprintCells(anchor, fp)
    if (!celdasConexas([...base, ...resto])) return

    set((s) => {
      const extra = { ...s.roomTechoExtra }
      if (resto.length === 0) delete extra[roomId]
      else extra[roomId] = resto
      return { roomTechoExtra: extra }
    })

    const existing = await db.disenoRooms.where('roomId').equals(roomId).first()
    if (existing?.id) {
      if (resto.length === 0) {
        await db.disenoRooms.where('id').equals(existing.id).modify((o) => {
          delete (o as DisenoRoom).techoExtra
        })
      } else {
        await db.disenoRooms.update(existing.id, { techoExtra: resto })
      }
    }
  },

  addObjeto: async (roomId, tipo, color, plantillaId) => {
    const delCuarto = objetosDeCuarto(get().objetos, roomId)
    const { x, z } = posDefault(delCuarto.length)
    const item: ObjetoCuarto = {
      roomId,
      tipo,
      color,
      slot: 0,
      x,
      z,
      rotY: 0,
      permanente: delCuarto.length === 0,
      ...(plantillaId ? { plantillaId } : {}),
    }
    const id = await db.objetosCuarto.add(item)
    set((s) => ({ objetos: [...s.objetos, { id, ...item }] }))
    return id
  },

  setObjetoPlantilla: async (id, plantillaId) => {
    set((s) => ({
      objetos: s.objetos.map((o) =>
        o.id === id ? { ...o, plantillaId: plantillaId ?? undefined } : o,
      ),
    }))
    await db.objetosCuarto.update(id, { plantillaId: plantillaId ?? undefined })
  },

  addObjetoMapa: async (tipo, color) => {
    const n = objetosMapa(get().objetos).length
    const { x, z } = posMundoDefault(n)
    const item = { roomId: MAPA_ROOM, tipo, color, slot: 0, x, z, rotY: 0 }
    const id = await db.objetosCuarto.add(item)
    set((s) => ({ objetos: [...s.objetos, { id, ...item }] }))
  },

  setObjetoRotacion: async (id, rotY) => {
    const grados = ((rotY % 360) + 360) % 360
    set((s) => ({
      objetos: s.objetos.map((x) => (x.id === id ? { ...x, rotY: grados } : x)),
    }))
    await db.objetosCuarto.update(id, { rotY: grados })
  },

  setObjetoColor: async (id, color) => {
    set((s) => ({
      objetos: s.objetos.map((x) => (x.id === id ? { ...x, color } : x)),
    }))
    await db.objetosCuarto.update(id, { color })
  },

  setObjetoPos: (id, x, z) =>
    set((s) => ({
      objetos: s.objetos.map((o) => (o.id === id ? { ...o, x, z } : o)),
    })),

  startObjetoDrag: (id) => {
    const { objetos } = get()
    const o = objetos.find((x) => x.id === id)
    const offsets: Record<number, { x: number; z: number }> = {}
    if (o?.grupoId) {
      for (const m of objetos) {
        if (m.grupoId === o.grupoId && m.id !== id && m.id != null) {
          offsets[m.id] = { x: (m.x ?? 0) - (o.x ?? 0), z: (m.z ?? 0) - (o.z ?? 0) }
        }
      }
    }
    set({ draggingObjeto: id, dragGroupOffsets: offsets })
  },

  endObjetoDrag: async () => {
    const id = get().draggingObjeto
    set({ draggingObjeto: null, dragGroupOffsets: {} })
    if (id == null) return
    const { objetos } = get()
    const o = objetos.find((x) => x.id === id)
    if (o) await db.objetosCuarto.update(id, { x: o.x, z: o.z, rotY: o.rotY ?? 0 })
    // Persistir también todos los miembros del grupo que se movieron con él.
    if (o?.grupoId) {
      for (const m of objetos) {
        if (m.grupoId === o.grupoId && m.id !== id && m.id != null) {
          await db.objetosCuarto.update(m.id, { x: m.x, z: m.z })
        }
      }
    }
  },

  removeObjeto: async (id) => {
    const { objetos } = get()
    const o = objetos.find((x) => x.id === id)
    if (!o) return

    if (o.roomId === MAPA_ROOM) {
      set((s) => ({
        objetos: s.objetos.filter((x) => x.id !== id),
        seleccion: s.seleccion.filter((x) => x !== id),
        draggingObjeto: s.draggingObjeto === id ? null : s.draggingObjeto,
      }))
      await db.objetosCuarto.delete(id)
      return
    }

    const delCuarto = objetosDeCuarto(objetos, o.roomId)
    if (delCuarto.length <= 1) return
    const eraPrincipal = esMueblePrincipal(o)
    const restantes = delCuarto.filter((x) => x.id !== id)
    set((s) => ({
      objetos: s.objetos.filter((x) => x.id !== id),
      seleccion: s.seleccion.filter((x) => x !== id),
    }))
    await db.objetosCuarto.delete(id)
    if (eraPrincipal && restantes[0]?.id != null) {
      await get().setObjetoPrincipal(restantes[0].id)
    }
  },

  setObjetoPrincipal: async (id) => {
    const o = get().objetos.find((x) => x.id === id)
    if (!o || o.roomId === MAPA_ROOM || esMueblePrincipal(o)) return
    const roomId = o.roomId
    const idsActualizar: { id: number; permanente: boolean }[] = []
    set((s) => ({
      objetos: s.objetos.map((x) => {
        if (x.roomId !== roomId || x.id == null) return x
        const debe = x.id === id
        if (x.permanente !== debe) idsActualizar.push({ id: x.id, permanente: debe })
        return { ...x, permanente: debe }
      }),
    }))
    for (const u of idsActualizar) {
      await db.objetosCuarto.update(u.id, { permanente: u.permanente })
    }
  },

  toggleSeleccion: (id) =>
    set((s) => ({
      seleccion: s.seleccion.includes(id)
        ? s.seleccion.filter((x) => x !== id)
        : [...s.seleccion, id],
    })),

  clearSeleccion: () => set({ seleccion: [] }),

  agrupar: async () => {
    const { seleccion, objetos } = get()
    if (seleccion.length < 2) return
    // Solo se agrupa si todos los objetos son del mismo cuarto.
    const selected = objetos.filter((o) => o.id != null && seleccion.includes(o.id))
    const roomIds = new Set(selected.map((o) => o.roomId))
    if (roomIds.size !== 1) return
    const grupoId = Date.now().toString(36)
    set((s) => ({
      objetos: s.objetos.map((o) =>
        o.id != null && seleccion.includes(o.id) ? { ...o, grupoId } : o,
      ),
      seleccion: [],
    }))
    for (const id of seleccion) {
      await db.objetosCuarto.update(id, { grupoId })
    }
  },

  desagrupar: async (grupoId) => {
    const members = get().objetos.filter((o) => o.grupoId === grupoId)
    set((s) => ({
      objetos: s.objetos.map((o) =>
        o.grupoId === grupoId ? { ...o, grupoId: undefined } : o,
      ),
    }))
    for (const m of members) {
      if (m.id != null) {
        // Eliminar el campo del registro persistido (modify + delete).
        await db.objetosCuarto.where('id').equals(m.id).modify((o) => {
          delete (o as ObjetoCuarto).grupoId
        })
      }
    }
  },

  setAvatarColor: async (parte, color) => {
    set((s) => ({ avatar: { ...s.avatar, [parte]: color } }))
    await guardarAvatar(get().avatar)
  },

  setAvatarModelo3d: async (piezas) => {
    set((s) => ({ avatar: { ...s.avatar, modelo3d: piezas, modeloGlb: undefined } }))
    await guardarAvatar(get().avatar)
  },

  setAvatarGlb: async (blob) => {
    set((s) => ({ avatar: { ...s.avatar, modeloGlb: blob, modelo3d: undefined } }))
    await guardarAvatar(get().avatar)
  },

  quitarAvatarModelo: async () => {
    set((s) => ({ avatar: { ...s.avatar, modelo3d: undefined, modeloGlb: undefined } }))
    await guardarAvatar(get().avatar)
  },

  resetRoom: async (roomId) => {
    // Borra color/nombre y TODOS los objetos del cuarto, luego re-siembra.
    const urlPiso = get().roomPisoImagenes[roomId]
    if (urlPiso) URL.revokeObjectURL(urlPiso)
    const urlTecho = get().roomTechoImagenes[roomId]
    if (urlTecho) URL.revokeObjectURL(urlTecho)
    set((s) => {
      const rc = { ...s.roomColors }
      const rn = { ...s.roomNames }
      delete rc[roomId]
      delete rn[roomId]
      const rpt = { ...s.roomPisoTipos }
      const rpc = { ...s.roomPisoColors }
      const rtt = { ...s.roomTechoTipos }
      const rtc = { ...s.roomTechoColors }
      const rtf = { ...s.roomTechoFormas }
      const rtp = { ...s.roomTechoParams }
      const rte = { ...s.roomTechoExtra }
      const rimgs = { ...s.roomPisoImagenes }
      const ractiva = { ...s.roomPisoImagenActiva }
      const rajuste = { ...s.roomPisoImagenAjuste }
      const rtimgs = { ...s.roomTechoImagenes }
      const rtactiva = { ...s.roomTechoImagenActiva }
      const rtajuste = { ...s.roomTechoImagenAjuste }
      delete rpt[roomId]; delete rpc[roomId]; delete rtt[roomId]; delete rtc[roomId]
      delete rtf[roomId]; delete rtp[roomId]; delete rte[roomId]
      delete rimgs[roomId]; delete ractiva[roomId]; delete rajuste[roomId]
      delete rtimgs[roomId]; delete rtactiva[roomId]; delete rtajuste[roomId]
      return {
        roomColors: rc, roomNames: rn,
        roomPisoTipos: rpt, roomPisoColors: rpc,
        roomTechoTipos: rtt, roomTechoColors: rtc, roomTechoFormas: rtf, roomTechoParams: rtp, roomTechoExtra: rte,
        roomPisoImagenes: rimgs, roomPisoImagenActiva: ractiva, roomPisoImagenAjuste: rajuste,
        roomTechoImagenes: rtimgs, roomTechoImagenActiva: rtactiva, roomTechoImagenAjuste: rtajuste,
        objetos: s.objetos.filter((o) => o.roomId !== roomId),
      }
    })
    await db.pisosImagenCuarto.where('roomId').equals(roomId).delete()
    await db.techosImagenCuarto.where('roomId').equals(roomId).delete()
    await db.disenoRooms.where('roomId').equals(roomId).delete()
    const ids = (await db.objetosCuarto.where('roomId').equals(roomId).toArray())
      .map((o) => o.id!)
      .filter(Boolean)
    await db.objetosCuarto.bulkDelete(ids)
  },

  resetAvatar: async () => {
    set({ avatar: { ...AVATAR_DEFAULT } })
    await db.disenoAvatar.clear()
  },
}))

/**
 * Color y nombre EFECTIVOS de un cuarto = personalización del usuario si existe,
 * si no, los del registro. Fuente única para casa 3D, menú lateral y cabeceras.
 */
export function useRoomVisual(id: string, colorBase: string, nombreBase: string) {
  const color = useDiseño((s) => s.roomColors[id] ?? colorBase)
  const nombre = useDiseño((s) => s.roomNames[id] || nombreBase)
  return { color, nombre }
}

if (import.meta.env.DEV) {
  ;(window as unknown as { useDiseño: typeof useDiseño }).useDiseño = useDiseño
}

/** Carga el diseño una vez al arrancar la app. */
useDiseño.getState().cargar()
