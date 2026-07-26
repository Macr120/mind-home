import { create } from 'zustand'
import { db, type DisenoRoom, type FondoImagen, type ObjetoCuarto } from '../data/db'
import { esAppNativa } from '../plataforma'
import { filaSeed } from '../data/sync/syncables'
import { esMueblePrincipal } from '../house/muebles'
import { aplicarOverridesTema, TEMAS, type TemaId, type TemaOverride } from '../house/temas'
import {
  getEstilo,
  configDeEstilo,
  type EstiloVisualId,
  type EfectosConfig,
  type EfectoId,
  type EfectoEstado,
} from '../house/estilos'
import type { PisoTipoId } from '../house/pisos'
import type { TechoTipoId, TechoFormaId, TechoParams, TechoCeldaForma } from '../house/techos'
import { techoSugeridoPorTema, TECHO_PARAMS_DEFAULT } from '../house/techos'
import type { FondoId } from '../house/fondos'
import { fondoSugeridoPorTema } from '../house/fondos'
import { RECURSOS } from '../house/recursos'
import { MODELOS } from '../house/modelosRecursos'
import {
  META_ESPECIAL_PLANTILLA,
  TIPO_LIBRERO_LIBRO,
  TIPO_GLOBO,
  TIPO_PERIODICO,
  TIPO_ESTANTERIA_HERR,
  TIPO_LAPTOP,
  TIPO_GUITARRA,
  TIPO_SILLON,
} from '../house/especialesPlantillaMeta'
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
import type { Pieza3D, MascotaId } from '../chat/mascotas'
import type { AnimacionModelo } from '../house/animacion'
import { aplicarCuerpoPreset, type CuerpoPreset } from '../house/cuerpos'
import {
  ESCALA_DEFAULT,
  parseRopa,
  serializarRopa,
  type ExpresionId,
  type PeinadoId,
  type PrendaId,
  type Ropa,
} from '../house/apariencia'
import { useLayout, roomWorldPos, cuartoEnMundo } from './layoutStore'
import { footprintCells, FOOTPRINT_DEFAULT, cellId, tileOcupado, SIZE, SIZE_DEFAULT } from '../house/walls'
import { remapearFormasOffTrasAncla } from '../house/formasLoseta'
import { celdasConexas } from '../house/techoCeldas'

/** Color por defecto de un cuarto (su color de instancia, o gris si no existe). */
const colorCuarto = (roomId: string): string =>
  useCuartos.getState().cuartos.find((c) => c.id === roomId)?.color ?? '#94a3b8'

/** roomId sentinela donde se persiste el tema global de la casa. */
const TEMA_ROW = '__tema__'
/** roomId sentinela del estilo de render (`nombre` = estilo, `color` = '1'|'0' efectos). */
const ESTILO_ROW = '__estilo__'
/** Prefijo de las filas centinela con la personalización de cada tema (`__tema_ov_<id>__`). */
const TEMA_OV_PREFIX = '__tema_ov_'
const temaOvRow = (id: TemaId) => `${TEMA_OV_PREFIX}${id}__`
/**
 * roomId sentinela del fondo de cielo (`nombre` = id, `color` = animaciones).
 * `color`: '0' = apagadas; con decimales ('0.60') = intensidad; '1' a secas = fila
 * antigua, anterior al slider → se lee como la intensidad por defecto.
 */
const FONDO_ROW = '__fondo__'
/** Intensidad inicial de las microanimaciones (≈ la densidad que había antes del slider). */
export const ANIM_INTENSIDAD_DEFAULT = 0.6
/** roomId sentinela donde se persiste el tipo de piso de la casa. */
const PISO_TIPO_ROW = '__piso_tipo__'
const TECHO_TIPO_ROW = '__techo_tipo__'
/** roomId sentinela de la mascota (lo gestiona mascotaStore; aquí solo se ignora). */
const MASCOTA_ROW = '__mascota__'
/** roomId de objetos LIBRES sobre el mapa (x,z en coordenadas de mundo). */
export const MAPA_ROOM = '__mapa__'
/** ¿El objeto es un objeto libre del mapa (no pertenece a un cuarto)? */
export const esObjetoMapa = (o: ObjetoCuarto) => o.roomId === MAPA_ROOM
/** roomId de la BIBLIOTECA del inventario: objetos plantilla que NO se renderizan ni colisionan. */
const LIBRERIA_ROOM = '__libreria__'
/** ¿El objeto pertenece a la biblioteca del inventario (no está en la casa)? */
export const esObjetoLibreria = (o: ObjetoCuarto) => o.roomId === LIBRERIA_ROOM

/**
 * Colores del avatar por defecto (estilo Roblox).
 * Se sobreescriben con los datos guardados en DB.
 */
export const AVATAR_DEFAULT = {
  cabeza: '#ffd23b',
  torso: '#e23b3b',
  piernas: '#2f5fd0',
}

/** Una prenda a medida puesta: copia de la geometría + `refId` al guardarropa. */
export interface PrendaCustomPuesta {
  /** id de la prenda en el guardarropa (para saber si está puesta y refrescarla). */
  refId: number
  nombre?: string
  piezas: Pieza3D[]
}

/** Apariencia completa del personaje principal (colores + tamaño + ropa + forma 3D). */
export interface Avatar {
  /** Nombre del personaje principal (vacío = "Tú" por defecto). */
  nombre?: string
  cabeza: string
  torso: string
  piernas: string
  /** Tamaño del personaje (1 = normal). */
  escala: number
  /** Prendas que lleva puestas. */
  ropa: Ropa
  /** Prendas a medida puestas (del guardarropa). */
  ropaCustom?: PrendaCustomPuesta[]
  /** Expresión del rostro dibujado (ojos + boca) del cuerpo base. */
  expresion?: ExpresionId
  /** Imagen de rostro subida por el usuario (tapa el frente de la cabeza). */
  rostro?: Blob
  /** Peinado dibujado sobre la cabeza del cuerpo base. */
  peinado?: PeinadoId
  /** Color del pelo. */
  peloColor?: string
  /** Forma integrada (mago/gato/perro/búho/robot) como cuerpo del avatar. */
  forma?: MascotaId
  /** Color del cuerpo con `forma` (vacío = el propio de la forma, `COLOR_FORMA`). */
  formaColor?: string
  /**
   * Qué preset de `CUERPOS_PRESET` (o `'base'`) originó `modelo3d`, mientras no
   * se edite (pieza movida/recoloreada, pose aplicada): así el ícono y la
   * animación de marcha saben qué cuerpo concreto es. Se limpia en cualquier
   * edición posterior.
   */
  cuerpoPresetId?: string
  /** Forma 3D descrita a la IA (gana a los cubos de colores). */
  modelo3d?: Pieza3D[]
  /** Modelo .glb subido por el usuario (gana a modelo3d y a los cubos). */
  modeloGlb?: Blob
  /** Animación del personaje (preset idle y/o poses de sus piezas). */
  animacion?: AnimacionModelo
}

/** Avatar por defecto (colores base, tamaño normal, sin ropa ni forma propia). */
const AVATAR_INICIAL: Avatar = { ...AVATAR_DEFAULT, escala: ESCALA_DEFAULT, ropa: {} }

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
  /**
   * Material del piso EXTERIOR de las celdas con forma (triángulo/círculo) por cuarto.
   * PisoTipoId = textura, null = color sólido (roomPisoExtColors), ausente = jardín.
   */
  roomPisoExtTipos: Record<string, PisoTipoId | null>
  /** Color del piso exterior cuando roomPisoExtTipos[id] === null. */
  roomPisoExtColors: Record<string, string>
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
  avatar: Avatar
  /** tema estacional global de la casa; null = sin tema (se controla en el editor de mapa) */
  temaGlobal: TemaId | null
  /** Personalizaciones del usuario por tema (colores, materiales, luz, niebla). */
  temasOverrides: Partial<Record<TemaId, TemaOverride>>
  /** Contador que cambia al editar un tema; los componentes de escena lo observan para refrescar. */
  temaRev: number
  /** estilo de render ACTIVO del mapa 3D (derivado del tema o de "sin tema") */
  estiloVisual: EstiloVisualId
  /** postprocesado ACTIVO (derivado del tema o de "sin tema") */
  efectosVisuales: boolean
  /** ajuste fino ACTIVO de efectos (on/off + intensidad por efecto) */
  efectosConfig: EfectosConfig
  /** estilo/efectos que se usan cuando NO hay tema activo */
  estiloSinTema: EstiloVisualId
  efectosSinTema: boolean
  efectosConfigSinTema: EfectosConfig
  /** estilo de techo global; null = color de cada cuarto */
  techoTipo: TechoTipoId | null
  /** fondo de cielo; `auto` = ciclo día/noche, `color_fijo` = color sólido sin cambio horario */
  fondoId: FondoId
  /** Color sólido cuando fondoId = 'color_fijo' (no varía con la hora). */
  fondoColorFijo: string
  /** Imagen personalizada activa (null = usar fondoId preset). */
  fondoImagenActivo: number | null
  /** Galería de fondos con imagen guardados localmente. */
  fondosImagen: FondoImagen[]
  /** microanimaciones de fondo (cometas, dragones, nieve, etc.) */
  animacionesFondo: boolean
  /** Intensidad de las microanimaciones (0.1–1): cantidad y discreción de los elementos. */
  animacionesIntensidad: number
  /** Papel del croquis, rejilla y base del mapa 3D. */
  mapaSuperficie: MapaSuperficieAjustes
  cargado: boolean
  cargar: () => Promise<void>
  setTemaGlobal: (tema: TemaId | null) => Promise<void>
  /** Sobreescribe campos de un tema (merge profundo con lo ya guardado). */
  setTemaOverride: (tema: TemaId, patch: TemaOverride) => Promise<void>
  /** Restaura un tema a sus valores originales (borra la personalización). */
  resetTema: (tema: TemaId) => Promise<void>
  setEstiloVisual: (estilo: EstiloVisualId) => Promise<void>
  setEfectosVisuales: (activo: boolean) => Promise<void>
  /** Ajusta un efecto individual (on/off + intensidad) del contexto activo (tema o sin-tema). */
  setEfecto: (id: EfectoId, estado: EfectoEstado) => Promise<void>
  setFondoId: (fondo: FondoId) => Promise<void>
  /** Activa el fondo de color sólido fijo con el color dado. */
  setFondoColorFijo: (color: string) => Promise<void>
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
  setAnimacionesIntensidad: (valor: number) => Promise<void>
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
  /** Fija el material del piso EXTERIOR de las celdas con forma (null = color sólido). */
  setRoomPisoExtTipo: (roomId: string, tipo: PisoTipoId | null) => Promise<void>
  /** Fija el color del piso exterior (celdas con forma); pasa a modo color sólido. */
  setRoomPisoExtColor: (roomId: string, color: string) => Promise<void>
  /** Quita la personalización del piso exterior (vuelve al jardín por defecto). */
  resetRoomPisoExt: (roomId: string) => Promise<void>
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
  /**
   * Renumera las claves del techo por celda cuando el cuarto cambia de ancla o footprint
   * (crecer/encoger): van por offset igual que `formasCelda`, así que sin esto el techo se
   * quedaría en la celda equivocada. La llama layoutStore al reanclar.
   */
  remapearTechoCeldas: (
    roomId: string,
    anchorAntes: import('../house/walls').Cell,
    fpAntes: import('../house/walls').Footprint,
    anchorDespues: import('../house/walls').Cell,
    fpDespues: import('../house/walls').Footprint,
  ) => Promise<void>
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
  /** Agrega un objeto al cuarto (posición opcional). Devuelve el id del objeto creado. */
  addObjeto: (
    roomId: string,
    tipo: string,
    color: string,
    plantillaId?: string,
    pos?: { x: number; z: number },
  ) => Promise<number>
  /** Asigna (o quita, con null) la plantilla/app de un objeto. */
  setObjetoPlantilla: (id: number, plantillaId: string | null) => Promise<void>
  /** Agrega un objeto LIBRE sobre el mapa (editor de mapa, inventario completo). */
  addObjetoMapa: (tipo: string, color: string) => Promise<void>
  /** Crea un objeto construido con geometría básica. `roomId` = destino elegido (mapa o cuarto). Devuelve su id. */
  addObjetoPiezas: (piezas: Pieza3D[], color: string, roomId?: string) => Promise<number>
  /** Crea un objeto con un modelo .glb subido por el usuario. `roomId` = destino elegido. Devuelve su id. */
  addObjetoGlb: (glb: Blob, color: string, roomId?: string) => Promise<number>
  /** Reemplaza el contenido de un objeto por un modelo .glb subido por el usuario. */
  setObjetoModeloGlb: (id: number, glb: Blob) => Promise<void>
  /** Foto de un cuadro especial o espectacular; undefined = quitarla. */
  setObjetoFoto: (id: number, foto: Blob | undefined) => Promise<void>
  /** Texto de un anuncio (espectacular/letreros); vacío = texto de muestra. */
  setObjetoTexto: (id: number, texto: string) => Promise<void>
  /** Siembra en la BIBLIOTECA los objetos base del catálogo que falten. Devuelve cuántos añadió. */
  sembrarLibreriaBase: () => Promise<number>
  /** Crea un objeto en la BIBLIOTECA dentro de una categoría/carpeta. Devuelve su id. */
  addObjetoLibreria: (tipo: string, color: string, categoria: string, piezas?: Pieza3D[]) => Promise<number>
  /** Coloca en el mundo una copia (instancia) de un objeto de la biblioteca. `pos` = coords de mundo (omitida = posición por defecto); `roomId` = destino elegido. Devuelve su id. */
  instanciarObjetoEnMapa: (
    libId: number,
    pos?: { x: number; z: number },
    roomId?: string,
  ) => Promise<number | null>
  /** Renombra una carpeta (categoría) de la biblioteca en todos sus objetos. */
  renombrarCategoriaLibreria: (oldCat: string, newCat: string) => Promise<void>
  /** Aplica categoría+orden a varios objetos de biblioteca de una vez (drag & drop). */
  reordenarLibreria: (cambios: { id: number; categoria: string; orden: number }[]) => Promise<void>
  /** Reemplaza las piezas de un objeto construido con geometría básica. */
  setObjetoPiezas: (id: number, piezas: Pieza3D[]) => Promise<void>
  /** Convierte un objeto existente a piezas editables (guarda su tipo para restaurarlo). */
  convertirObjetoAPiezas: (id: number, piezas: Pieza3D[]) => Promise<void>
  /** Devuelve un objeto convertido a su modelo original (predeterminado). */
  restaurarObjetoPredeterminado: (id: number) => Promise<void>
  /** Pone el nombre personalizado de un objeto (vacío = quitarlo). */
  setObjetoNombre: (id: number, nombre: string) => Promise<void>
  toggleSeleccion: (id: number) => void
  clearSeleccion: () => void
  /** Agrupa los objetos en `seleccion` (deben ser del mismo roomId). */
  agrupar: () => Promise<void>
  /** Rompe el grupo: quita grupoId de todos sus miembros. */
  desagrupar: (grupoId: string) => Promise<void>
  setObjetoColor: (id: number, color: string) => Promise<void>
  setObjetoRotacion: (id: number, rotY: number) => Promise<void>
  /** Fija la rotación de un objeto en un eje (grados 0-359). x/z = inclinar, y = girar. */
  setObjetoRotEje: (id: number, eje: 'x' | 'y' | 'z', grados: number) => Promise<void>
  /** Fija la altura extra (levantar/flotar) de un objeto, en unidades. */
  setObjetoAltura: (id: number, y: number) => Promise<void>
  /** Fija el tamaño (escala) de un objeto colocado. */
  setObjetoEscala: (id: number, escala: number) => Promise<void>
  /** Fija la intensidad de los efectos (agua/luz/velocidad) de un objeto especial. */
  setObjetoFx: (id: number, fx: number) => Promise<void>
  /** Fija (o quita, con undefined) la animación de un objeto colocado. */
  setObjetoAnimacion: (id: number, anim: AnimacionModelo | undefined) => Promise<void>
  /** Mueve un objeto a (x,z) relativo al centro del cuarto (solo estado). */
  setObjetoPos: (id: number, x: number, z: number) => void
  /** Fija y PERSISTE posición+rumbo de un objeto sin reasignarlo de cuarto (estacionar un vehículo). */
  setObjetoPose: (id: number, x: number, z: number, rotY: number) => Promise<void>
  /** Desplaza (dx,dz) un objeto y su grupo, acotado a su cuarto, y PERSISTE de inmediato (flechas del modo mover-objetos). */
  nudgeObjeto: (id: number, dx: number, dz: number) => Promise<void>
  startObjetoDrag: (id: number) => void
  endObjetoDrag: () => Promise<void>
  removeObjeto: (id: number) => Promise<void>
  /** Marca un objeto como punto de entrada del cuarto (solo uno por cuarto). */
  setObjetoPrincipal: (id: number) => Promise<void>
  /** Fija el nombre del personaje principal. */
  setAvatarNombre: (nombre: string) => Promise<void>
  setAvatarColor: (
    parte: 'cabeza' | 'torso' | 'piernas',
    color: string,
  ) => Promise<void>
  /** Fija el tamaño (escala) del personaje principal. */
  setAvatarEscala: (escala: number) => Promise<void>
  /** Pone (con color) o quita (null) una prenda del personaje principal. */
  setAvatarPrenda: (prenda: PrendaId, color: string | null) => Promise<void>
  /** Pinta TODAS las prendas puestas del personaje principal de un mismo color. */
  setAvatarRopaColor: (color: string) => Promise<void>
  /** Reemplaza TODA la ropa puesta (aplicar un atuendo completo de un toque). */
  setAvatarRopaCompleta: (ropa: Ropa) => Promise<void>
  /**
   * Quita TODA la ropa del personaje principal (ropa vacía) y deja el torso y
   * las piernas del color de la piel (cabeza), como un maniquí en blanco listo
   * para vestir de nuevo.
   */
  desnudarAvatar: () => Promise<void>
  /** Fija la expresión del rostro dibujado del personaje principal. */
  setAvatarExpresion: (expresion: ExpresionId) => Promise<void>
  /** Sube (o quita, con undefined) la imagen de rostro del personaje principal. */
  setAvatarRostro: (rostro: Blob | undefined) => Promise<void>
  /** Fija el peinado del personaje principal. */
  setAvatarPeinado: (peinado: PeinadoId) => Promise<void>
  /** Fija el color de pelo del personaje principal. */
  setAvatarPeloColor: (color: string) => Promise<void>
  /** Pone (o reemplaza) una prenda a medida del guardarropa en el personaje principal. */
  ponerAvatarPrendaCustom: (refId: number, piezas: Pieza3D[], nombre?: string) => Promise<void>
  /** Quita una prenda a medida del personaje principal (por su refId). */
  quitarAvatarPrendaCustom: (refId: number) => Promise<void>
  /** Usa una forma integrada (mago/gato/…) como cuerpo del avatar (limpia piezas/.glb). */
  setAvatarForma: (forma: MascotaId) => Promise<void>
  /** Color del cuerpo con `forma` (vacío = el propio de la forma, `COLOR_FORMA`). */
  setAvatarFormaColor: (color: string) => Promise<void>
  /** Fija la forma 3D del avatar generada por IA (limpia el .glb y la forma integrada). */
  setAvatarModelo3d: (piezas: Pieza3D[]) => Promise<void>
  /** Aplica un preset de `CUERPOS_PRESET` (piezas + su id, para el ícono y la marcha). */
  setAvatarCuerpoPreset: (preset: CuerpoPreset) => Promise<void>
  /** Fija el modelo .glb del avatar subido por el usuario (limpia las piezas IA). */
  setAvatarGlb: (blob: Blob) => Promise<void>
  /** Quita la forma 3D personalizada y vuelve a los cubos de colores. */
  quitarAvatarModelo: () => Promise<void>
  /** Fija (o quita, con undefined) la animación del personaje principal. */
  setAvatarAnimacion: (anim: AnimacionModelo | undefined) => Promise<void>
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

/**
 * Destino de un objeto NUEVO creado desde el editor. Con `destino` explícito (el que
 * el usuario eligió en `DestinoObjetoDialog`) manda ese; si no, editando un cuarto
 * (`editingRoomId`) cae dentro de él, cerca de su centro, y en cualquier otro caso
 * queda libre sobre el mapa.
 */
function destinoObjetoNuevo(
  objetos: ObjetoCuarto[],
  destino?: string,
): { roomId: string; x: number; z: number } {
  const room = destino ?? useLayout.getState().editingRoomId
  if (room && room !== MAPA_ROOM && useLayout.getState().placed[room]) {
    return { roomId: room, ...posDefault(objetosDeCuarto(objetos, room).length) }
  }
  return { roomId: MAPA_ROOM, ...posMundoDefault(objetosMapa(objetos).length) }
}

/** Garantiza exactamente un objeto principal (`permanente`) por cuarto con objetos. */
async function asegurarPrincipalPorCuarto(objetos: ObjetoCuarto[]): Promise<ObjetoCuarto[]> {
  const lista = [...objetos]
  const porCuarto = new Map<string, ObjetoCuarto[]>()
  for (const o of lista) {
    if (o.roomId === MAPA_ROOM || o.roomId === LIBRERIA_ROOM) continue
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

/**
 * Estilo/efectos ACTIVOS según el tema: cada tema recuerda el suyo (override) o usa
 * su estilo sugerido; sin tema, usa la config de "sin tema". Los efectos por defecto van ON.
 * `config` = ajuste fino guardado, o el del preset del estilo si no se ha tocado.
 */
function resolverEstilo(
  temaGlobal: TemaId | null,
  temasOverrides: Partial<Record<TemaId, TemaOverride>>,
  estiloSinTema: EstiloVisualId,
  efectosSinTema: boolean,
  efectosConfigSinTema: EfectosConfig,
): { estilo: EstiloVisualId; efectos: boolean; config: EfectosConfig } {
  if (temaGlobal == null) {
    return { estilo: estiloSinTema, efectos: efectosSinTema, config: efectosConfigSinTema }
  }
  const ov = temasOverrides[temaGlobal]
  const estilo = ov?.estilo ?? TEMAS.find((t) => t.id === temaGlobal)?.estilo ?? 'normal'
  return {
    estilo,
    efectos: ov?.efectos ?? true,
    config: ov?.efectosConfig ?? configDeEstilo(estilo),
  }
}

/**
 * Serializa las escrituras a filas centinela. Sin esto, arrastrar un slider dispara
 * muchos setTemaOverride seguidos y varios hacen `.add()` antes de que el primero
 * termine → filas duplicadas para el mismo roomId.
 */
let colaDiseno: Promise<unknown> = Promise.resolve()
function enCola<T>(fn: () => Promise<T>): Promise<T> {
  const p = colaDiseno.then(fn, fn)
  colaDiseno = p.catch(() => {})
  return p
}

async function guardarEstiloRow(estilo: EstiloVisualId, efectos: boolean, config: EfectosConfig) {
  const existing = await db.disenoRooms.where('roomId').equals(ESTILO_ROW).first()
  const row = { nombre: estilo, color: efectos ? '1' : '0', efectosConfig: config }
  if (existing?.id) await db.disenoRooms.update(existing.id, row)
  else await db.disenoRooms.add({ roomId: ESTILO_ROW, ...row })
}

async function guardarFondoRow(
  fondo: FondoId,
  anim: boolean,
  intensidad: number,
  imagenId: number | null,
  colorFijo: string,
) {
  const existing = await db.disenoRooms.where('roomId').equals(FONDO_ROW).first()
  const row = {
    nombre: fondo,
    // Siempre con 2 decimales: así '1.00' (elegido) no se confunde con el '1' antiguo.
    color: anim ? intensidad.toFixed(2) : '0',
    muebleColor: imagenId != null ? String(imagenId) : '',
    pisoColor: colorFijo, // color sólido cuando fondoId = 'color_fijo'
  }
  if (existing?.id) await db.disenoRooms.update(existing.id, row)
  else await db.disenoRooms.add({ roomId: FONDO_ROW, ...row })
}

/** Persiste la fila única del avatar (colores + forma 3D personalizada). */
async function guardarAvatar(av: DisenoState['avatar']) {
  const row = {
    nombre: av.nombre ?? '',
    cabeza: av.cabeza,
    torso: av.torso,
    piernas: av.piernas,
    escala: av.escala,
    ropa: serializarRopa(av.ropa),
    ropaCustom: av.ropaCustom?.length ? JSON.stringify(av.ropaCustom) : '',
    expresion: av.expresion ?? '',
    rostro: av.rostro,
    peinado: av.peinado ?? '',
    peloColor: av.peloColor ?? '',
    forma: av.forma ?? '',
    formaColor: av.formaColor ?? '',
    cuerpoPresetId: av.cuerpoPresetId ?? '',
    modelo3d: av.modelo3d ? JSON.stringify(av.modelo3d) : '',
    modeloGlb: av.modeloGlb,
    animacion: av.animacion ? JSON.stringify(av.animacion) : '',
  }
  const existing = await db.disenoAvatar.toArray()
  if (existing[0]?.id) await db.disenoAvatar.update(existing[0].id, row)
  else await db.disenoAvatar.add(row)
}

export function objetosDeCuarto(objetos: ObjetoCuarto[], roomId: string) {
  return objetos.filter((o) => o.roomId === roomId)
}

/** Objetos libres colocados sobre el mapa (fuera de los cuartos). */
function objetosMapa(objetos: ObjetoCuarto[]) {
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
  roomPisoExtTipos: {},
  roomPisoExtColors: {},
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
  avatar: { ...AVATAR_INICIAL },
  temaGlobal: null,
  temasOverrides: {},
  temaRev: 0,
  estiloVisual: 'normal',
  efectosVisuales: !esAppNativa(),
  efectosConfig: configDeEstilo('normal'),
  estiloSinTema: 'normal',
  efectosSinTema: !esAppNativa(),
  efectosConfigSinTema: configDeEstilo('normal'),
  techoTipo: null,
  fondoId: 'auto',
  fondoColorFijo: '#87ceeb',
  fondoImagenActivo: null,
  fondosImagen: [],
  animacionesFondo: true,
  animacionesIntensidad: ANIM_INTENSIDAD_DEFAULT,
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
    // Limpieza única (pedido del usuario): quita de los cuartos la TV grande
    // (recurso:58) y la consola+control (recurso:59) de entretenimiento; se
    // conservan en la biblioteca para volver a colocarlas si se quiere.
    const LIMPIEZA_TV = 'mh_limpieza_tv_entretenimiento_v1'
    if (!localStorage.getItem(LIMPIEZA_TV)) {
      localStorage.setItem(LIMPIEZA_TV, '1')
      const aBorrar = objetos.filter(
        (o) => o.id != null && o.roomId !== LIBRERIA_ROOM && (o.tipo === 'recurso:58' || o.tipo === 'recurso:59'),
      )
      if (aBorrar.length) {
        await db.objetosCuarto.bulkDelete(aBorrar.map((o) => o.id!))
        for (const o of aBorrar) {
          const i = objetos.findIndex((x) => x.id === o.id)
          if (i >= 0) objetos.splice(i, 1)
        }
      }
    }
    // Reposición única v2 (pedido del usuario): librero a una esquina + sofá de
    // biblioteca girado; globo+mesa de sala a la izquierda de la TV (centrada);
    // sofá de diario a la esquina izquierda; garage: principal a la izquierda,
    // estantería metálica a la derecha, banco al centro y se borra la puerta de
    // garage. Identifica el cuarto de cada app por el `plantillaId` de su objeto
    // principal (el id del cuarto no es el de la app).
    const REPOSICION = 'mh_reposicion_v2'
    if (!localStorage.getItem(REPOSICION)) {
      localStorage.setItem(REPOSICION, '1')
      const roomDe = (plantillaId: string) => objetos.find((o) => o.plantillaId === plantillaId)?.roomId
      const enCuarto = (room: string | undefined, tipo: string) =>
        room ? objetos.find((o) => o.roomId === room && o.tipo === tipo) : undefined
      const patch = async (o: (typeof objetos)[number] | undefined, cambios: { x?: number; z?: number; rotY?: number }) => {
        if (o?.id == null) return
        await db.objetosCuarto.update(o.id, cambios)
        Object.assign(o, cambios)
      }
      const roomBiblioteca = roomDe('biblioteca')
      await patch(enCuarto(roomBiblioteca, TIPO_LIBRERO_LIBRO), { x: -2.1, z: -2.35 })
      await patch(enCuarto(roomBiblioteca, 'recurso:30'), { rotY: 180 })
      const roomSala = roomDe('sala')
      await patch(enCuarto(roomSala, TIPO_GLOBO), { x: -2.0, z: -2.3 })
      await patch(enCuarto(roomSala, 'recurso:67'), { x: -2.0, z: -2.3 })
      await patch(enCuarto(roomSala, 'recurso:68'), { x: 0, z: -2.4 })
      await patch(enCuarto(roomSala, 'recurso:69'), { x: 0, z: -2.5 })
      await patch(enCuarto(roomSala, 'recurso:66'), { x: 0, z: 1.5 })
      const roomDiario = roomDe('diario')
      await patch(enCuarto(roomDiario, TIPO_PERIODICO), { x: -1.4, z: -2.3 })
      const roomGarage = roomDe('garage')
      await patch(enCuarto(roomGarage, TIPO_ESTANTERIA_HERR), { x: -2.1, z: -2.5 })
      await patch(enCuarto(roomGarage, 'recurso:22'), { x: 2.1, z: -2.5 })
      await patch(enCuarto(roomGarage, 'recurso:21'), { x: 0, z: 0 })
      // Borra la puerta de garage, salvo que sea la que lleva la app (no romper el cuarto).
      const puerta = enCuarto(roomGarage, 'recurso:20')
      if (puerta?.id != null && !puerta.plantillaId) {
        await db.objetosCuarto.delete(puerta.id)
        const i = objetos.findIndex((x) => x.id === puerta.id)
        if (i >= 0) objetos.splice(i, 1)
      }
    }
    // Reposición única v3 (pedido del usuario): mesa de diario a la esquina
    // izquierda a 175%; despacho con escritorio+computadora al fondo, silla al
    // frente girada 180° y se quita el monitor suelto duplicado.
    const REPOSICION3 = 'mh_reposicion_v3'
    if (!localStorage.getItem(REPOSICION3)) {
      localStorage.setItem(REPOSICION3, '1')
      const roomDe = (plantillaId: string) => objetos.find((o) => o.plantillaId === plantillaId)?.roomId
      const enCuarto = (room: string | undefined, tipo: string) =>
        room ? objetos.find((o) => o.roomId === room && o.tipo === tipo) : undefined
      const patch = async (
        o: (typeof objetos)[number] | undefined,
        cambios: { x?: number; z?: number; rotY?: number; escala?: number },
      ) => {
        if (o?.id == null) return
        await db.objetosCuarto.update(o.id, cambios)
        Object.assign(o, cambios)
      }
      const roomDiario = roomDe('diario')
      await patch(enCuarto(roomDiario, TIPO_PERIODICO), { x: -2.0, z: -2.3, escala: 1.75 })
      const roomDespacho = roomDe('despacho')
      await patch(enCuarto(roomDespacho, TIPO_LAPTOP), { x: 0, z: -1.8 })
      await patch(enCuarto(roomDespacho, 'recurso:49'), { x: 0, z: -0.85, rotY: 180 })
      const monitor = enCuarto(roomDespacho, 'recurso:50') // monitor suelto → borrar (salvo que lleve la app)
      if (monitor?.id != null && !monitor.plantillaId) {
        await db.objetosCuarto.delete(monitor.id)
        const i = objetos.findIndex((x) => x.id === monitor.id)
        if (i >= 0) objetos.splice(i, 1)
      }
    }
    // Reposición única v4 (pedido del usuario): escritorio+silla centrados,
    // mesa de diario casi al doble (2x), piano de hobbies a la esquina izquierda.
    const REPOSICION4 = 'mh_reposicion_v4'
    if (!localStorage.getItem(REPOSICION4)) {
      localStorage.setItem(REPOSICION4, '1')
      const roomDe = (plantillaId: string) => objetos.find((o) => o.plantillaId === plantillaId)?.roomId
      const enCuarto = (room: string | undefined, tipo: string) =>
        room ? objetos.find((o) => o.roomId === room && o.tipo === tipo) : undefined
      const patch = async (
        o: (typeof objetos)[number] | undefined,
        cambios: { x?: number; z?: number; rotY?: number; escala?: number },
      ) => {
        if (o?.id == null) return
        await db.objetosCuarto.update(o.id, cambios)
        Object.assign(o, cambios)
      }
      const roomDespacho = roomDe('despacho')
      await patch(enCuarto(roomDespacho, TIPO_LAPTOP), { x: 0, z: -1.7 })
      await patch(enCuarto(roomDespacho, 'recurso:49'), { x: 0, z: -0.8, rotY: 180 })
      await patch(enCuarto(roomDe('diario'), TIPO_PERIODICO), { escala: 2.0 })
      await patch(enCuarto(roomDe('hobbies'), TIPO_GUITARRA), { x: -2.0, z: -2.2 })
    }
    // Reposición única v5 (pedido del usuario): escritorio de noticias (ahora
    // ambiental, pulsa al acercarse) a la esquina izquierda y más grande.
    const REPOSICION5 = 'mh_reposicion_v5'
    if (!localStorage.getItem(REPOSICION5)) {
      localStorage.setItem(REPOSICION5, '1')
      const roomDiario = objetos.find((o) => o.plantillaId === 'diario')?.roomId
      const escritorio = roomDiario
        ? objetos.find((o) => o.roomId === roomDiario && o.tipo === TIPO_PERIODICO)
        : undefined
      if (escritorio?.id != null) {
        const cambios = { x: -1.4, z: -2.3, escala: 2.2 }
        await db.objetosCuarto.update(escritorio.id, cambios)
        Object.assign(escritorio, cambios)
      }
    }
    // Reparación única v6: cuartos de diario amueblados ANTES del escritorio
    // especial tienen un principal viejo (silla/mesa genérica), no `periodico`,
    // así que las migraciones previas no los tocaron. Convierte ese principal en
    // el escritorio de noticias y limpia el mobiliario suelto sobrante.
    const REPARA_DIARIO = 'mh_repara_diario_v1'
    if (!localStorage.getItem(REPARA_DIARIO)) {
      localStorage.setItem(REPARA_DIARIO, '1')
      const carrier = objetos.find((o) => o.plantillaId === 'diario')
      if (carrier?.id != null && carrier.tipo !== TIPO_PERIODICO) {
        const cambios = { tipo: TIPO_PERIODICO, x: -1.4, z: -2.3, escala: 2.2, color: '#6b4423' }
        await db.objetosCuarto.update(carrier.id, cambios)
        Object.assign(carrier, cambios)
        const sobrantes = objetos.filter(
          (o) => o.roomId === carrier.roomId && o.id != null && o.id !== carrier.id && !o.plantillaId,
        )
        if (sobrantes.length) {
          await db.objetosCuarto.bulkDelete(sobrantes.map((o) => o.id!))
          for (const o of sobrantes) {
            const i = objetos.findIndex((x) => x.id === o.id)
            if (i >= 0) objetos.splice(i, 1)
          }
        }
      }
    }
    // Intercambio único (tras aclarar nombres): el cuarto de NOTICIAS (plantilla
    // `diario`) pasa a un sillón de lectura donde el personaje se sienta; el
    // DIARIO PERSONAL (plantilla `anecdotario`) recibe el escritorio, más chico.
    // Convierte el principal de cada cuarto sin importar qué tenga ahora.
    const SWAP_NOTICIA_DIARIO = 'mh_swap_noticia_diario_v1'
    if (!localStorage.getItem(SWAP_NOTICIA_DIARIO)) {
      localStorage.setItem(SWAP_NOTICIA_DIARIO, '1')
      const convertir = async (plantillaId: string, tipo: string, escala: number, color: string) => {
        const carrier = objetos.find((o) => o.plantillaId === plantillaId)
        if (carrier?.id == null) return
        const cambios = { tipo, x: -1.4, z: -2.3, escala, color }
        await db.objetosCuarto.update(carrier.id, cambios)
        Object.assign(carrier, cambios)
      }
      await convertir('diario', TIPO_SILLON, 1, '#9ca3af')
      await convertir('anecdotario', TIPO_PERIODICO, 1.2, '#6b4423')
    }
    // Limpieza única: la silla ejecutiva (recurso:49) venía en la siembra VIEJA
    // del diario personal (anecdotario) junto con la libreta; ya no se siembra,
    // pero sigue colocada en cuartos creados antes de este cambio.
    const LIMPIA_SILLA_ANECDOTARIO = 'mh_limpia_silla_anecdotario_v1'
    if (!localStorage.getItem(LIMPIA_SILLA_ANECDOTARIO)) {
      localStorage.setItem(LIMPIA_SILLA_ANECDOTARIO, '1')
      const roomAnecdotario = objetos.find((o) => o.plantillaId === 'anecdotario')?.roomId
      const silla = roomAnecdotario
        ? objetos.find((o) => o.roomId === roomAnecdotario && o.tipo === 'recurso:49')
        : undefined
      if (silla?.id != null && !silla.plantillaId) {
        await db.objetosCuarto.delete(silla.id)
        const i = objetos.findIndex((x) => x.id === silla.id)
        if (i >= 0) objetos.splice(i, 1)
      }
    }
    const roomColors: Record<string, string> = {}
    const roomNames: Record<string, string> = {}
    const roomPisoTipos: Record<string, PisoTipoId | null> = {}
    const roomPisoColors: Record<string, string> = {}
    const roomPisoExtTipos: Record<string, PisoTipoId | null> = {}
    const roomPisoExtColors: Record<string, string> = {}
    const roomTechoTipos: Record<string, TechoTipoId | null> = {}
    const roomTechoColors: Record<string, string> = {}
    const roomTechoFormas: Record<string, TechoFormaId> = {}
    const roomTechoParams: Record<string, TechoParams> = {}
    const roomTechoFormasCelda: Record<string, Record<string, TechoCeldaForma>> = {}
    const roomTechoExtra: Record<string, import('../house/walls').Cell[]> = {}
    let temaGlobal: TemaId | null = null
    const temasOverrides: Partial<Record<TemaId, TemaOverride>> = {}
    const temaOvIds: Partial<Record<TemaId, number[]>> = {}
    let estiloSinTema: EstiloVisualId = 'normal'
    // En la app nativa (Capacitor) el postprocesado (oclusión + bloom) es demasiado
    // caro para el GPU del teléfono: arranca apagado por defecto (el usuario lo
    // puede encender igual desde Configuraciones si su equipo aguanta).
    let efectosSinTema = !esAppNativa()
    let efectosConfigSinTema: EfectosConfig = configDeEstilo('normal')
    let techoTipo: TechoTipoId | null = null
    let fondoId: FondoId = 'auto'
    let animacionesFondo = true
    let animacionesIntensidad = ANIM_INTENSIDAD_DEFAULT
    let fondoColorFijo = '#87ceeb'
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
      if (d.roomId === ESTILO_ROW) {
        estiloSinTema = getEstilo(d.nombre)
        efectosSinTema = d.color !== '0'
        efectosConfigSinTema = d.efectosConfig ?? configDeEstilo(estiloSinTema)
        continue
      }
      if (d.roomId.startsWith(TEMA_OV_PREFIX)) {
        const temaId = d.roomId.slice(TEMA_OV_PREFIX.length, -2) as TemaId
        if (d.temaOverride) {
          // Fusiona por si hubiera filas duplicadas de una carrera antigua (no se pierde nada).
          const prev = temasOverrides[temaId]
          temasOverrides[temaId] = {
            ...prev,
            ...d.temaOverride,
            shell: { ...prev?.shell, ...d.temaOverride.shell },
            luz: { ...prev?.luz, ...d.temaOverride.luz },
            niebla: { ...prev?.niebla, ...d.temaOverride.niebla },
          }
        }
        ;(temaOvIds[temaId] ??= []).push(d.id!)
        continue
      }
      if (d.roomId === FONDO_ROW) {
        fondoId = (d.nombre as FondoId) || 'auto'
        animacionesFondo = d.color !== '0'
        // Solo el valor con decimales lo eligió el usuario; '1' es la fila vieja.
        if (d.color?.includes('.')) {
          const n = parseFloat(d.color)
          if (Number.isFinite(n)) animacionesIntensidad = Math.min(1, Math.max(0.1, n))
        }
        if (d.pisoColor) fondoColorFijo = d.pisoColor
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
      if (d.pisoExtTipo !== undefined && d.pisoExtTipo !== '') {
        roomPisoExtTipos[d.roomId] = d.pisoExtTipo === '__color__' ? null : (d.pisoExtTipo as PisoTipoId)
      }
      if (d.pisoExtColor) roomPisoExtColors[d.roomId] = d.pisoExtColor
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

    // Sana filas duplicadas de temas (carreras antiguas): deja una sola por tema con el override fusionado.
    for (const [temaId, ids] of Object.entries(temaOvIds)) {
      if (ids.length <= 1) continue
      const ov = temasOverrides[temaId as TemaId]
      await db.disenoRooms.bulkDelete(ids.slice(1))
      if (ov) await db.disenoRooms.update(ids[0], { temaOverride: ov })
    }

    const objetosConMuebles = await asegurarPrincipalPorCuarto(objetos)
    // Sincroniza el registro que usa getTema() para que la escena arranque con los temas ya personalizados.
    aplicarOverridesTema(temasOverrides)
    // Estilo/efectos activos: los del tema cargado (o los de "sin tema").
    const {
      estilo: estiloVisual,
      efectos: efectosVisuales,
      config: efectosConfig,
    } = resolverEstilo(temaGlobal, temasOverrides, estiloSinTema, efectosSinTema, efectosConfigSinTema)
    const av = disenoAvatars[0]
    let avModelo3d: Pieza3D[] | undefined
    if (av?.modelo3d) {
      try {
        avModelo3d = JSON.parse(av.modelo3d) as Pieza3D[]
      } catch {
        avModelo3d = undefined
      }
    }
    let avAnimacion: AnimacionModelo | undefined
    if (av?.animacion) {
      try {
        avAnimacion = JSON.parse(av.animacion) as AnimacionModelo
      } catch {
        avAnimacion = undefined
      }
    }
    let avRopaCustom: PrendaCustomPuesta[] | undefined
    if (av?.ropaCustom) {
      try {
        avRopaCustom = JSON.parse(av.ropaCustom) as PrendaCustomPuesta[]
      } catch {
        avRopaCustom = undefined
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
      roomPisoExtTipos,
      roomPisoExtColors,
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
      temasOverrides,
      estiloVisual,
      efectosVisuales,
      efectosConfig,
      estiloSinTema,
      efectosSinTema,
      efectosConfigSinTema,
      techoTipo,
      fondoId,
      fondoColorFijo,
      fondoImagenActivo,
      fondosImagen,
      animacionesFondo,
      animacionesIntensidad,
      mapaSuperficie,
      avatar: av
        ? {
            nombre: av.nombre || undefined,
            cabeza: av.cabeza,
            torso: av.torso,
            piernas: av.piernas,
            escala: av.escala ?? ESCALA_DEFAULT,
            ropa: parseRopa(av.ropa),
            ropaCustom: avRopaCustom,
            expresion: (av.expresion as ExpresionId) || undefined,
            rostro: av.rostro,
            peinado: (av.peinado as PeinadoId) || undefined,
            peloColor: av.peloColor || undefined,
            forma: (av.forma as MascotaId) || undefined,
            formaColor: av.formaColor || undefined,
            cuerpoPresetId: av.cuerpoPresetId || undefined,
            modelo3d: avModelo3d,
            modeloGlb: av.modeloGlb,
            animacion: avAnimacion,
          }
        : { ...AVATAR_INICIAL },
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
    // Al cambiar de tema se aplica su estilo/efectos (el guardado o el sugerido).
    const { estilo, efectos, config } = resolverEstilo(
      tema,
      get().temasOverrides,
      get().estiloSinTema,
      get().efectosSinTema,
      get().efectosConfigSinTema,
    )
    set({
      temaGlobal: tema,
      fondoId: fondoPorTema,
      fondoImagenActivo: null,
      techoTipo: techoPorTema,
      estiloVisual: estilo,
      efectosVisuales: efectos,
      efectosConfig: config,
    })
    const existing = await db.disenoRooms.where('roomId').equals(TEMA_ROW).first()
    if (existing?.id) await db.disenoRooms.update(existing.id, { nombre: tema ?? '' })
    else await db.disenoRooms.add({ roomId: TEMA_ROW, color: '', nombre: tema ?? '' })
    const et = await db.disenoRooms.where('roomId').equals(TECHO_TIPO_ROW).first()
    if (et?.id) await db.disenoRooms.update(et.id, { nombre: techoPorTema ?? '' })
    else await db.disenoRooms.add({ roomId: TECHO_TIPO_ROW, color: '', nombre: techoPorTema ?? '' })
    const anim = get().animacionesFondo
    await guardarFondoRow(fondoPorTema, anim, get().animacionesIntensidad, null, get().fondoColorFijo)
  },

  setTemaOverride: async (tema, patch) => {
    const prev = get().temasOverrides[tema]
    const merged: TemaOverride = {
      ...prev,
      ...patch,
      shell: { ...prev?.shell, ...patch.shell },
      luz: { ...prev?.luz, ...patch.luz },
      niebla: { ...prev?.niebla, ...patch.niebla },
    }
    const temasOverrides = { ...get().temasOverrides, [tema]: merged }
    aplicarOverridesTema(temasOverrides)
    set({ temasOverrides, temaRev: get().temaRev + 1 })
    const roomId = temaOvRow(tema)
    await enCola(async () => {
      const existing = await db.disenoRooms.where('roomId').equals(roomId).first()
      if (existing?.id) await db.disenoRooms.update(existing.id, { temaOverride: merged })
      else await db.disenoRooms.add({ roomId, color: '', temaOverride: merged })
    })
  },

  resetTema: async (tema) => {
    const temasOverrides = { ...get().temasOverrides }
    delete temasOverrides[tema]
    aplicarOverridesTema(temasOverrides)
    // Al restaurar, el estilo del tema vuelve a su sugerido: refresca el activo si es el tema en uso.
    const { estilo, efectos, config } = resolverEstilo(
      get().temaGlobal,
      temasOverrides,
      get().estiloSinTema,
      get().efectosSinTema,
      get().efectosConfigSinTema,
    )
    set({
      temasOverrides,
      temaRev: get().temaRev + 1,
      estiloVisual: estilo,
      efectosVisuales: efectos,
      efectosConfig: config,
    })
    await enCola(() => db.disenoRooms.where('roomId').equals(temaOvRow(tema)).delete())
  },

  setEstiloVisual: async (estilo) => {
    // Elegir un estilo es un ATAJO: rellena la config de efectos con la del preset.
    const config = configDeEstilo(estilo)
    set({ estiloVisual: estilo, efectosConfig: config })
    const { temaGlobal } = get()
    if (temaGlobal == null) {
      set({ estiloSinTema: estilo, efectosConfigSinTema: config })
      await guardarEstiloRow(estilo, get().efectosSinTema, config)
    } else {
      await get().setTemaOverride(temaGlobal, { estilo, efectosConfig: config })
    }
  },

  setEfectosVisuales: async (activo) => {
    set({ efectosVisuales: activo })
    const { temaGlobal } = get()
    if (temaGlobal == null) {
      set({ efectosSinTema: activo })
      await guardarEstiloRow(get().estiloSinTema, activo, get().efectosConfigSinTema)
    } else {
      await get().setTemaOverride(temaGlobal, { efectos: activo })
    }
  },

  setEfecto: async (id, estado) => {
    const config = { ...get().efectosConfig, [id]: estado }
    set({ efectosConfig: config })
    const { temaGlobal } = get()
    if (temaGlobal == null) {
      set({ efectosConfigSinTema: config })
      await guardarEstiloRow(get().estiloSinTema, get().efectosSinTema, config)
    } else {
      await get().setTemaOverride(temaGlobal, { efectosConfig: config })
    }
  },

  setFondoId: async (fondo) => {
    set({ fondoId: fondo, fondoImagenActivo: null })
    await guardarFondoRow(fondo, get().animacionesFondo, get().animacionesIntensidad, null, get().fondoColorFijo)
  },

  setFondoColorFijo: async (color) => {
    set({ fondoId: 'color_fijo', fondoColorFijo: color, fondoImagenActivo: null })
    await guardarFondoRow('color_fijo', get().animacionesFondo, get().animacionesIntensidad, null, color)
  },

  setFondoImagenActivo: async (id) => {
    if (id != null && !get().fondosImagen.some((f) => f.id === id)) return
    set({ fondoImagenActivo: id })
    await guardarFondoRow(get().fondoId, get().animacionesFondo, get().animacionesIntensidad, id, get().fondoColorFijo)
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
    await guardarFondoRow(get().fondoId, get().animacionesFondo, get().animacionesIntensidad, id, get().fondoColorFijo)
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
    if (eraActivo) {
      await guardarFondoRow(get().fondoId, get().animacionesFondo, get().animacionesIntensidad, null, get().fondoColorFijo)
    }
  },

  setAnimacionesFondo: async (activo) => {
    set({ animacionesFondo: activo })
    await guardarFondoRow(
      get().fondoId,
      activo,
      get().animacionesIntensidad,
      get().fondoImagenActivo,
      get().fondoColorFijo,
    )
  },

  setAnimacionesIntensidad: async (valor) => {
    const intensidad = Math.min(1, Math.max(0.1, valor))
    set({ animacionesIntensidad: intensidad })
    await guardarFondoRow(
      get().fondoId,
      get().animacionesFondo,
      intensidad,
      get().fondoImagenActivo,
      get().fondoColorFijo,
    )
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

  setRoomPisoExtTipo: async (roomId, tipo) => {
    set((s) => ({ roomPisoExtTipos: { ...s.roomPisoExtTipos, [roomId]: tipo } }))
    const val = tipo === null ? '__color__' : tipo
    const existing = await db.disenoRooms.where('roomId').equals(roomId).first()
    if (existing?.id) await db.disenoRooms.update(existing.id, { pisoExtTipo: val })
    else {
      const defaultColor = colorCuarto(roomId)
      await db.disenoRooms.add({ roomId, color: defaultColor, nombre: '', pisoExtTipo: val })
    }
  },

  setRoomPisoExtColor: async (roomId, color) => {
    // Elegir un color pasa el exterior a modo "color sólido".
    set((s) => ({
      roomPisoExtTipos: { ...s.roomPisoExtTipos, [roomId]: null },
      roomPisoExtColors: { ...s.roomPisoExtColors, [roomId]: color },
    }))
    const existing = await db.disenoRooms.where('roomId').equals(roomId).first()
    if (existing?.id) await db.disenoRooms.update(existing.id, { pisoExtTipo: '__color__', pisoExtColor: color })
    else {
      const defaultColor = colorCuarto(roomId)
      await db.disenoRooms.add({ roomId, color: defaultColor, nombre: '', pisoExtTipo: '__color__', pisoExtColor: color })
    }
  },

  resetRoomPisoExt: async (roomId) => {
    set((s) => {
      const tipos = { ...s.roomPisoExtTipos }
      const cols = { ...s.roomPisoExtColors }
      delete tipos[roomId]; delete cols[roomId]
      return { roomPisoExtTipos: tipos, roomPisoExtColors: cols }
    })
    const existing = await db.disenoRooms.where('roomId').equals(roomId).first()
    if (existing?.id) await db.disenoRooms.update(existing.id, { pisoExtTipo: '', pisoExtColor: '' })
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

  remapearTechoCeldas: async (roomId, anchorAntes, fpAntes, anchorDespues, fpDespues) => {
    const prev = get().roomTechoFormasCelda[roomId]
    if (!prev || !Object.keys(prev).length) return // el cuarto no fabrica techo por celda
    const next = remapearFormasOffTrasAncla(prev, anchorAntes, fpAntes, anchorDespues, fpDespues)
    set((s) => {
      const room = { ...s.roomTechoFormasCelda }
      if (next && Object.keys(next).length) room[roomId] = next
      else delete room[roomId]
      return { roomTechoFormasCelda: room }
    })
    const existing = await db.disenoRooms.where('roomId').equals(roomId).first()
    if (existing?.id) await db.disenoRooms.update(existing.id, { techoFormasCelda: next })
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

  addObjeto: async (roomId, tipo, color, plantillaId, pos) => {
    const delCuarto = objetosDeCuarto(get().objetos, roomId)
    const { x, z } = pos ?? posDefault(delCuarto.length)
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
    const { roomId, x, z } = destinoObjetoNuevo(get().objetos)
    const item = { roomId, tipo, color, slot: 0, x, z, rotY: 0 }
    const id = await db.objetosCuarto.add(item)
    set((s) => ({ objetos: [...s.objetos, { id, ...item }] }))
  },

  addObjetoPiezas: async (piezas, color, destino) => {
    const { roomId, x, z } = destinoObjetoNuevo(get().objetos, destino)
    const item: ObjetoCuarto = { roomId, tipo: 'piezas', color, slot: 0, x, z, rotY: 0, piezas }
    const id = await db.objetosCuarto.add(item)
    set((s) => ({ objetos: [...s.objetos, { id, ...item }] }))
    return id
  },

  addObjetoGlb: async (glb, color, destino) => {
    const { roomId, x, z } = destinoObjetoNuevo(get().objetos, destino)
    const item: ObjetoCuarto = { roomId, tipo: 'glb', color, slot: 0, x, z, rotY: 0, modeloGlb: glb }
    const id = await db.objetosCuarto.add(item)
    set((s) => ({ objetos: [...s.objetos, { id, ...item }] }))
    return id
  },

  setObjetoModeloGlb: async (id, glb) => {
    const patch = { tipo: 'glb', modeloGlb: glb, piezas: undefined }
    set((s) => ({
      objetos: s.objetos.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }))
    await db.objetosCuarto.update(id, patch)
  },

  setObjetoFoto: async (id, foto) => {
    set((s) => ({
      objetos: s.objetos.map((x) => (x.id === id ? { ...x, foto } : x)),
    }))
    await db.objetosCuarto.update(id, { foto })
  },

  setObjetoTexto: async (id, texto) => {
    const valor = texto || undefined
    set((s) => ({
      objetos: s.objetos.map((x) => (x.id === id ? { ...x, texto: valor } : x)),
    }))
    await db.objetosCuarto.update(id, { texto: valor })
  },

  sembrarLibreriaBase: async () => {
    const yaBase = new Set(
      get().objetos.filter(esObjetoLibreria).map((o) => o.baseId).filter((n): n is number => n != null),
    )
    const nuevos: ObjetoCuarto[] = []
    // Identidad determinista de siembra: misma biblioteca = mismos uids en
    // cualquier dispositivo (el sync deduplica solo).
    const addLib = (item: ObjetoCuarto) =>
      db.objetosCuarto.add(filaSeed(`objetosCuarto-lib-${item.baseId ?? item.tipo}`, item))
    for (const r of RECURSOS) {
      if (!MODELOS[r.id] || yaBase.has(r.id)) continue
      const item: ObjetoCuarto = {
        roomId: LIBRERIA_ROOM,
        tipo: `recurso:${r.id}`,
        color: MODELOS[r.id].defaultColor,
        slot: 0,
        categoria: r.categoria,
        baseId: r.id,
        nombre: r.nombre,
      }
      const id = await addLib(item)
      nuevos.push({ id, ...item })
    }
    // Vehículos montables: carpeta propia (no vienen de RECURSOS sino del catálogo;
    // se listan aquí para no importar vehiculos.tsx desde el store — ciclo).
    const VEHICULOS_LIB: [string, string, string][] = [
      ['bicicleta', '#ef4444', 'Bicicleta'],
      ['motocicleta', '#8b5cf6', 'Motocicleta'],
      ['automovil', '#3b82f6', 'Automóvil'],
      ['ovni', '#22c55e', 'Platillo OVNI'],
    ]
    const tiposLib = new Set(get().objetos.filter(esObjetoLibreria).map((o) => o.tipo))
    for (const [tipo, color, nombre] of VEHICULOS_LIB) {
      if (tiposLib.has(tipo)) continue
      const item: ObjetoCuarto = { roomId: LIBRERIA_ROOM, tipo, color, slot: 0, categoria: 'Vehículos', nombre }
      const id = await addLib(item)
      nuevos.push({ id, ...item })
    }
    // Cuadro con foto y espejo: ambos son un apoyo de pared con reflejo/imagen
    // real (render dedicado en especiales.tsx; tipos literales por la misma razón).
    const CUADRO_ESPEJO_LIB: [string, string, string][] = [
      ['cuadro-foto', '#8b5a2b', 'Cuadro con foto'],
      ['espejo', '#94a3b8', 'Espejo'],
    ]
    for (const [tipo, color, nombre] of CUADRO_ESPEJO_LIB) {
      if (tiposLib.has(tipo)) continue
      const item: ObjetoCuarto = { roomId: LIBRERIA_ROOM, tipo, color, slot: 0, categoria: 'Cuadro y espejo', nombre }
      const id = await addLib(item)
      nuevos.push({ id, ...item })
    }
    // Fuentes: agua animada (render dedicado en especiales.tsx).
    const FUENTES_LIB: [string, string, string][] = [
      ['fuente', '#a8a29e', 'Fuente clásica'],
      ['estanque', '#78716c', 'Estanque con chorro'],
      ['cascada-pared', '#a8a29e', 'Cascada de pared'],
    ]
    for (const [tipo, color, nombre] of FUENTES_LIB) {
      if (tiposLib.has(tipo)) continue
      const item: ObjetoCuarto = { roomId: LIBRERIA_ROOM, tipo, color, slot: 0, categoria: 'Fuentes', nombre }
      const id = await addLib(item)
      nuevos.push({ id, ...item })
    }
    // Migración: bibliotecas sembradas antes de separar 'Especiales' en las dos
    // carpetas de arriba deben mover sus filas ya existentes a la carpeta nueva.
    const MIGRA_CATEGORIA: [string, string][] = [
      ['cuadro-foto', 'Cuadro y espejo'],
      ['espejo', 'Cuadro y espejo'],
      ['fuente', 'Fuentes'],
      ['estanque', 'Fuentes'],
      ['cascada-pared', 'Fuentes'],
    ]
    for (const o of get().objetos) {
      if (o.id == null || !esObjetoLibreria(o) || o.categoria !== 'Especiales') continue
      const cat = MIGRA_CATEGORIA.find(([tipo]) => tipo === o.tipo)?.[1]
      if (!cat) continue
      await db.objetosCuarto.update(o.id, { categoria: cat })
      set((s) => ({
        objetos: s.objetos.map((x) => (x.id === o.id ? { ...x, categoria: cat } : x)),
      }))
    }
    // Juegos de parque: carpeta propia; el carrusel gira y el columpio se mece solos.
    const PARQUE_LIB: [string, string, string][] = [
      ['resbaladilla', '#ef4444', 'Resbaladilla'],
      ['pasamanos', '#3b82f6', 'Pasamanos'],
      ['carrusel', '#f59e0b', 'Carrusel'],
      ['columpio', '#22c55e', 'Columpio'],
    ]
    for (const [tipo, color, nombre] of PARQUE_LIB) {
      if (tiposLib.has(tipo)) continue
      const item: ObjetoCuarto = { roomId: LIBRERIA_ROOM, tipo, color, slot: 0, categoria: 'Parque', nombre }
      const id = await addLib(item)
      nuevos.push({ id, ...item })
    }
    // Luces: carpeta propia; emiten luz real de noche (pointLight + emissive).
    // Nombre distinto de la categoría "Iluminación" de RECURSOS (mobiliario sin luz real):
    // usar el mismo nombre mezclaría ambas carpetas en una sola.
    const LUCES_LIB: [string, string, string][] = [
      ['antorcha', '#6b4423', 'Antorcha'],
      ['farol', '#2f2f33', 'Farol'],
      ['lampara-pie', '#c99a52', 'Lámpara de pie'],
      ['vela', '#c9a227', 'Vela'],
    ]
    for (const [tipo, color, nombre] of LUCES_LIB) {
      if (tiposLib.has(tipo)) continue
      const item: ObjetoCuarto = { roomId: LIBRERIA_ROOM, tipo, color, slot: 0, categoria: 'Luces', nombre }
      const id = await addLib(item)
      nuevos.push({ id, ...item })
    }
    // Anuncios: letreros con texto/foto del usuario (espectacular tipo carretera,
    // marquesina Las Vegas y neón; render dedicado en especiales.tsx).
    const ANUNCIOS_LIB: [string, string, string][] = [
      ['espectacular', '#64748b', 'Espectacular de carretera'],
      ['letrero-vegas', '#b91c1c', 'Letrero Las Vegas'],
      ['letrero-neon', '#22d3ee', 'Letrero de neón'],
    ]
    for (const [tipo, color, nombre] of ANUNCIOS_LIB) {
      if (tiposLib.has(tipo)) continue
      const item: ObjetoCuarto = { roomId: LIBRERIA_ROOM, tipo, color, slot: 0, categoria: 'Anuncios', nombre }
      const id = await addLib(item)
      nuevos.push({ id, ...item })
    }
    // Migración: filas ya sembradas como 'Iluminación' (categoría que colisionaba
    // con la de RECURSOS) deben pasar a 'Luces'.
    const TIPOS_LUCES = new Set(LUCES_LIB.map(([tipo]) => tipo))
    for (const o of get().objetos) {
      if (o.id == null || !esObjetoLibreria(o) || o.categoria !== 'Iluminación' || !TIPOS_LUCES.has(o.tipo)) continue
      await db.objetosCuarto.update(o.id, { categoria: 'Luces' })
      set((s) => ({
        objetos: s.objetos.map((x) => (x.id === o.id ? { ...x, categoria: 'Luces' } : x)),
      }))
    }
    // Objetos principales de plantilla: el objeto animado que encarna cada app
    // (render dedicado en especialesPlantilla.tsx; se colocan como principal al amueblar).
    for (const [tipo, meta] of Object.entries(META_ESPECIAL_PLANTILLA)) {
      if (tiposLib.has(tipo)) continue
      const item: ObjetoCuarto = {
        roomId: LIBRERIA_ROOM, tipo, color: meta.color, slot: 0, categoria: 'Principales', nombre: meta.nombre,
      }
      const id = await addLib(item)
      nuevos.push({ id, ...item })
    }
    if (nuevos.length) set((s) => ({ objetos: [...s.objetos, ...nuevos] }))
    return nuevos.length
  },

  addObjetoLibreria: async (tipo, color, categoria, piezas) => {
    const item: ObjetoCuarto = { roomId: LIBRERIA_ROOM, tipo, color, slot: 0, categoria, ...(piezas ? { piezas } : {}) }
    const id = await db.objetosCuarto.add(item)
    set((s) => ({ objetos: [...s.objetos, { id, ...item }] }))
    return id
  },

  instanciarObjetoEnMapa: async (libId, pos, roomId) => {
    const lib = get().objetos.find((o) => o.id === libId)
    if (!lib) return null
    // Con `pos` explícita (p. ej. el chat la suelta junto al jugador) va libre al mapa;
    // sin ella manda el destino elegido (mapa o cuarto) y, en su defecto, el contexto.
    const destino = pos
      ? { roomId: MAPA_ROOM, x: pos.x, z: pos.z }
      : destinoObjetoNuevo(get().objetos, roomId)
    const item: ObjetoCuarto = {
      roomId: destino.roomId,
      tipo: lib.tipo,
      color: lib.color,
      slot: 0,
      x: destino.x,
      z: destino.z,
      rotY: 0,
      libreriaId: libId,
      ...(lib.piezas ? { piezas: JSON.parse(JSON.stringify(lib.piezas)) as Pieza3D[] } : {}),
      ...(lib.foto ? { foto: lib.foto } : {}),
      ...(lib.texto ? { texto: lib.texto } : {}),
      ...(lib.escala ? { escala: lib.escala } : {}),
      ...(lib.fx != null ? { fx: lib.fx } : {}),
      ...(lib.animacion
        ? { animacion: JSON.parse(JSON.stringify(lib.animacion)) as AnimacionModelo }
        : {}),
    }
    const id = await db.objetosCuarto.add(item)
    set((s) => ({ objetos: [...s.objetos, { id, ...item }] }))
    return id
  },

  renombrarCategoriaLibreria: async (oldCat, newCat) => {
    const cat = newCat.trim()
    if (!cat || cat === oldCat) return
    const afectados = get().objetos.filter((o) => esObjetoLibreria(o) && o.categoria === oldCat)
    set((s) => ({
      objetos: s.objetos.map((o) =>
        esObjetoLibreria(o) && o.categoria === oldCat ? { ...o, categoria: cat } : o,
      ),
    }))
    for (const o of afectados) if (o.id != null) await db.objetosCuarto.update(o.id, { categoria: cat })
  },

  reordenarLibreria: async (cambios) => {
    set((s) => ({
      objetos: s.objetos.map((o) => {
        const c = cambios.find((x) => x.id === o.id)
        return c ? { ...o, categoria: c.categoria, orden: c.orden } : o
      }),
    }))
    for (const c of cambios) await db.objetosCuarto.update(c.id, { categoria: c.categoria, orden: c.orden })
  },

  setObjetoPiezas: async (id, piezas) => {
    set((s) => ({
      objetos: s.objetos.map((x) => (x.id === id ? { ...x, piezas } : x)),
    }))
    await db.objetosCuarto.update(id, { piezas })
  },

  convertirObjetoAPiezas: async (id, piezas) => {
    const o = get().objetos.find((x) => x.id === id)
    if (!o || o.tipo === 'piezas') return
    const patch = { tipo: 'piezas', tipoOriginal: o.tipo, piezas }
    set((s) => ({
      objetos: s.objetos.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }))
    await db.objetosCuarto.update(id, patch)
  },

  restaurarObjetoPredeterminado: async (id) => {
    const o = get().objetos.find((x) => x.id === id)
    if (!o?.tipoOriginal) return
    set((s) => ({
      objetos: s.objetos.map((x) =>
        x.id === id ? { ...x, tipo: o.tipoOriginal!, piezas: undefined, tipoOriginal: undefined } : x,
      ),
    }))
    await db.objetosCuarto.update(id, { tipo: o.tipoOriginal, piezas: undefined, tipoOriginal: undefined })
  },

  setObjetoNombre: async (id, nombre) => {
    const limpio = nombre || undefined
    set((s) => ({
      objetos: s.objetos.map((x) => (x.id === id ? { ...x, nombre: limpio } : x)),
    }))
    await db.objetosCuarto.update(id, { nombre: limpio })
  },

  setObjetoRotacion: async (id, rotY) => {
    const grados = ((rotY % 360) + 360) % 360
    set((s) => ({
      objetos: s.objetos.map((x) => (x.id === id ? { ...x, rotY: grados } : x)),
    }))
    await db.objetosCuarto.update(id, { rotY: grados })
  },

  setObjetoRotEje: async (id, eje, grados) => {
    const g = ((grados % 360) + 360) % 360
    const patch: Partial<ObjetoCuarto> =
      eje === 'x' ? { rotX: g } : eje === 'z' ? { rotZ: g } : { rotY: g }
    set((s) => ({
      objetos: s.objetos.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }))
    await db.objetosCuarto.update(id, patch)
  },

  setObjetoAltura: async (id, y) => {
    const alt = Math.max(0, y)
    set((s) => ({
      objetos: s.objetos.map((x) => (x.id === id ? { ...x, y: alt } : x)),
    }))
    await db.objetosCuarto.update(id, { y: alt })
  },

  setObjetoColor: async (id, color) => {
    set((s) => ({
      objetos: s.objetos.map((x) => (x.id === id ? { ...x, color } : x)),
    }))
    await db.objetosCuarto.update(id, { color })
  },

  setObjetoEscala: async (id, escala) => {
    set((s) => ({
      objetos: s.objetos.map((x) => (x.id === id ? { ...x, escala } : x)),
    }))
    await db.objetosCuarto.update(id, { escala })
  },

  setObjetoFx: async (id, fx) => {
    set((s) => ({
      objetos: s.objetos.map((x) => (x.id === id ? { ...x, fx } : x)),
    }))
    await db.objetosCuarto.update(id, { fx })
  },

  setObjetoAnimacion: async (id, anim) => {
    set((s) => ({
      objetos: s.objetos.map((x) => (x.id === id ? { ...x, animacion: anim } : x)),
    }))
    // Con undefined, Dexie elimina la clave de la fila (quitar animación).
    await db.objetosCuarto.update(id, { animacion: anim })
  },

  setObjetoPos: (id, x, z) =>
    set((s) => ({
      objetos: s.objetos.map((o) => (o.id === id ? { ...o, x, z } : o)),
    })),

  setObjetoPose: async (id, x, z, rotY) => {
    const grados = ((rotY % 360) + 360) % 360
    set((s) => ({
      objetos: s.objetos.map((o) => (o.id === id ? { ...o, x, z, rotY: grados } : o)),
    }))
    await db.objetosCuarto.update(id, { x, z, rotY: grados })
  },

  nudgeObjeto: async (id, dx, dz) => {
    const { objetos } = get()
    const o = objetos.find((x) => x.id === id)
    if (!o) return
    // Mueve también al resto del grupo, cada miembro acotado a su propio cuarto.
    const miembros = o.grupoId ? objetos.filter((m) => m.grupoId === o.grupoId && m.id != null) : [o]
    const cambios = miembros.map((m) => {
      let nx = (m.x ?? 0) + dx
      let nz = (m.z ?? 0) + dz
      if (!esObjetoMapa(m)) {
        const size = useLayout.getState().sizes[m.roomId] ?? SIZE_DEFAULT
        const halfW = (size.w * SIZE) / 2 - 0.7
        const halfH = (size.h * SIZE) / 2 - 0.7
        nx = Math.max(-halfW, Math.min(halfW, nx))
        nz = Math.max(-halfH, Math.min(halfH, nz))
      }
      return { id: m.id as number, x: nx, z: nz }
    })
    set((s) => ({
      objetos: s.objetos.map((x) => {
        const c = cambios.find((c) => c.id === x.id)
        return c ? { ...x, x: c.x, z: c.z } : x
      }),
    }))
    await Promise.all(cambios.map((c) => db.objetosCuarto.update(c.id, { x: c.x, z: c.z })))
  },

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
    if (!o) return

    // Un objeto libre del mapa soltado dentro de un cuarto pasa a PERTENECER al cuarto
    // (desde entonces se mueve con él): reasigna roomId y pasa a coords locales del cuarto.
    if (esObjetoMapa(o) && !o.grupoId) {
      const roomId = cuartoEnMundo(o.x ?? 0, o.z ?? 0)
      if (roomId) {
        const [cx, , cz] = roomWorldPos(roomId)
        const size = useLayout.getState().sizes[roomId] ?? SIZE_DEFAULT
        const hw = (size.w * SIZE) / 2 - 0.7
        const hh = (size.h * SIZE) / 2 - 0.7
        const nx = Math.max(-hw, Math.min(hw, (o.x ?? 0) - cx))
        const nz = Math.max(-hh, Math.min(hh, (o.z ?? 0) - cz))
        set((s) => ({ objetos: s.objetos.map((x) => (x.id === id ? { ...x, roomId, x: nx, z: nz } : x)) }))
        await db.objetosCuarto.update(id, { roomId, x: nx, z: nz })
        return
      }
    }

    await db.objetosCuarto.update(id, { x: o.x, z: o.z, rotY: o.rotY ?? 0 })
    // Persistir también todos los miembros del grupo que se movieron con él.
    if (o.grupoId) {
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

    if (o.roomId === MAPA_ROOM || o.roomId === LIBRERIA_ROOM) {
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

  setAvatarNombre: async (nombre) => {
    set((s) => ({ avatar: { ...s.avatar, nombre } }))
    await guardarAvatar(get().avatar)
  },

  setAvatarColor: async (parte, color) => {
    set((s) => ({ avatar: { ...s.avatar, [parte]: color } }))
    await guardarAvatar(get().avatar)
  },

  setAvatarEscala: async (escala) => {
    set((s) => ({ avatar: { ...s.avatar, escala } }))
    await guardarAvatar(get().avatar)
  },

  setAvatarPrenda: async (prenda, color) => {
    set((s) => {
      const ropa = { ...s.avatar.ropa }
      if (color) ropa[prenda] = { color }
      else delete ropa[prenda]
      return { avatar: { ...s.avatar, ropa } }
    })
    await guardarAvatar(get().avatar)
  },

  setAvatarRopaColor: async (color) => {
    set((s) => {
      const ropa = Object.fromEntries(
        Object.keys(s.avatar.ropa).map((id) => [id, { color }]),
      ) as typeof s.avatar.ropa
      return { avatar: { ...s.avatar, ropa } }
    })
    await guardarAvatar(get().avatar)
  },

  setAvatarRopaCompleta: async (ropa) => {
    set((s) => ({ avatar: { ...s.avatar, ropa } }))
    await guardarAvatar(get().avatar)
  },

  desnudarAvatar: async () => {
    set((s) => ({ avatar: { ...s.avatar, ropa: {}, torso: s.avatar.cabeza, piernas: s.avatar.cabeza } }))
    await guardarAvatar(get().avatar)
  },

  setAvatarExpresion: async (expresion) => {
    set((s) => ({ avatar: { ...s.avatar, expresion } }))
    await guardarAvatar(get().avatar)
  },

  setAvatarRostro: async (rostro) => {
    set((s) => ({ avatar: { ...s.avatar, rostro } }))
    await guardarAvatar(get().avatar)
  },

  setAvatarPeinado: async (peinado) => {
    set((s) => ({ avatar: { ...s.avatar, peinado } }))
    await guardarAvatar(get().avatar)
  },

  setAvatarPeloColor: async (color) => {
    set((s) => ({ avatar: { ...s.avatar, peloColor: color } }))
    await guardarAvatar(get().avatar)
  },

  ponerAvatarPrendaCustom: async (refId, piezas, nombre) => {
    set((s) => {
      const otras = (s.avatar.ropaCustom ?? []).filter((g) => g.refId !== refId)
      return { avatar: { ...s.avatar, ropaCustom: [...otras, { refId, nombre, piezas }] } }
    })
    await guardarAvatar(get().avatar)
  },

  quitarAvatarPrendaCustom: async (refId) => {
    set((s) => ({
      avatar: { ...s.avatar, ropaCustom: (s.avatar.ropaCustom ?? []).filter((g) => g.refId !== refId) },
    }))
    await guardarAvatar(get().avatar)
  },

  setAvatarForma: async (forma) => {
    set((s) => ({
      avatar: { ...s.avatar, forma, modelo3d: undefined, modeloGlb: undefined, cuerpoPresetId: undefined },
    }))
    await guardarAvatar(get().avatar)
  },

  setAvatarFormaColor: async (color) => {
    set((s) => ({ avatar: { ...s.avatar, formaColor: color } }))
    await guardarAvatar(get().avatar)
  },

  setAvatarModelo3d: async (piezas) => {
    set((s) => ({
      avatar: { ...s.avatar, modelo3d: piezas, modeloGlb: undefined, forma: undefined, cuerpoPresetId: undefined },
    }))
    await guardarAvatar(get().avatar)
  },

  setAvatarCuerpoPreset: async (preset) => {
    set((s) => ({ avatar: { ...s.avatar, ...aplicarCuerpoPreset(preset), forma: undefined } }))
    await guardarAvatar(get().avatar)
  },

  setAvatarGlb: async (blob) => {
    set((s) => ({
      avatar: { ...s.avatar, modeloGlb: blob, modelo3d: undefined, forma: undefined, cuerpoPresetId: undefined },
    }))
    await guardarAvatar(get().avatar)
  },

  quitarAvatarModelo: async () => {
    set((s) => ({
      avatar: {
        ...s.avatar,
        modelo3d: undefined,
        modeloGlb: undefined,
        forma: undefined,
        cuerpoPresetId: undefined,
      },
    }))
    await guardarAvatar(get().avatar)
  },

  setAvatarAnimacion: async (anim) => {
    set((s) => ({ avatar: { ...s.avatar, animacion: anim } }))
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
    set({ avatar: { ...AVATAR_INICIAL } })
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
