import type { Cuarto, ObjetoCuarto } from '../data/db'
import { normalizar, buscarCuarto, OBJETOS } from './dispatcher'
import { marcarUltimoMapa } from './editorIntencion'
import type { ToolNeutra } from './ia'
import { plantillasCuarto, type Plantilla, type ComandoApp } from '../appContrato'
import { useCuartos } from '../state/cuartosStore'
import { useDiseño, esObjetoLibreria } from '../state/disenoStore'
import { useLayout, roomWorldPos } from '../state/layoutStore'
import { useAjustes, type MoodMusica } from '../state/ajustesStore'
import { IDIOMAS } from '../i18n/idiomas'
import { useWrappedUi } from '../state/wrappedUiStore'
import { useMascaraUi } from '../state/mascaraUiStore'
import { useChatArUi } from '../state/chatArUiStore'
import { useRutinasUI, type VistaCalendario } from '../state/rutinasUiStore'
import { useCam } from '../state/cameraStore'
import { useMontura } from '../state/monturaStore'
import { VEHICULOS_JUGABLES, esVehiculo } from '../house/vehiculos'
import { abrirApp } from '../abrirApp'
import {
  footprintCells,
  cellId,
  roomEdges,
  cabeEnRejilla,
  SIDE_KEYS,
  FOOTPRINT_DEFAULT,
  type SideKey,
  type WallState,
  type TipoAcceso,
} from '../house/walls'
import type { CeldaFormaLoseta, FormaLoseta } from '../house/formasLoseta'
import { TIPOS_MURO, TIPOS_PUERTA, type EstiloMuro, type EstiloPuerta } from '../house/murosPuertas'
import { playerPos, useHouse } from '../state/houseStore'
import { getCatalogoItem } from '../house/catalogo'
import { TEMAS, type TemaId } from '../house/temas'
import { FONDOS, type FondoId } from '../house/fondos'
import { PISOS, type PisoTipoId } from '../house/pisos'
import { TECHOS, TECHO_FORMAS, type TechoTipoId, type TechoFormaId } from '../house/techos'
import { PRENDAS, PRENDA_COLOR_DEFAULT, ESCALA_MIN, ESCALA_MAX, type PrendaId } from '../house/apariencia'
import { TEMAS_UI, type TemaUIId, type ModoUI } from '../ui/temasUI'
import { TIPOGRAFIAS, type TipografiaId } from '../ui/tipografias'
import { ESTILOS, type EstiloVisualId } from '../house/estilos'
import { useEditorUi } from '../state/editorUiStore'
import { useBienvenida } from '../bienvenida/bienvenidaStore'
import { exportarRespaldo } from '../data/respaldo'
import { permisoNotificaciones } from '../notificaciones'
import { useHuerto, regarTodo, cosecharTodo, type HerramientaHuerto } from '../state/huertoStore'
import {
  useGranja,
  alimentarTodos,
  mimarTodos,
  curarTodos,
  limpiarTodos,
  ANIMALES,
  type HerramientaGranja,
} from '../state/granjaStore'
import { useCaminos, borrarCaminos, type HerramientaCamino, type TipoCamino } from '../state/caminosStore'
import { useCanchas, CANCHAS, esCancha, escalaCancha, type ClaseCancha } from '../state/canchasStore'
import { usePistaLibreEditor } from '../state/pistaLibreStore'
import { useCarrera } from '../state/carreraStore'
import { useTren } from '../state/trenStore'
import { useAsistentes } from '../state/asistentesStore'
import { usePaintball, MAX_BOTS_ROYALE, VIDAS_PAINTBALL, type ModoPaintball } from '../state/paintballStore'
import { TIPOS_MAPA } from '../../rooms/ideas/tiposMapa'
import { ESPECIES } from '../house/cultivos'
import { posicionInfra, type DestinoInfra } from '../house/infraPosiciones'
import { infraNota } from '../state/infraNotaStore'
import type { EspecieCultivo, TipoAnimal, TipoMapa } from '../data/db'

/**
 * Acciones de EDICIÓN de la casa pedidas por el chat box ("el arquitecto").
 *
 * Un único punto ejecuta todo (`ejecutarToolEditor`): lo usan tanto la capa de IA
 * (tool use, `ia.ts`) como la capa determinista sin IA (`interpretarEdicionLocal`,
 * consumida por `ChatBox`). Así no se duplican las llamadas a los stores: la IA
 * arma `(name, input)` con el modelo; el parser determinista arma el mismo
 * `(name, input)` con regex. Cada acción coincide con lo que hace el Editor
 * (`EditPanel` y sus stores `disenoStore`/`cuartosStore`/`ajustesStore`).
 */

// ───────────────────────── Vocabularios y resolución ─────────────────────────

/** Nombres de color en español → hex. Para el parser determinista y como
 *  respaldo cuando la IA manda un nombre en vez de hex. */
const COLORES_NOMBRADOS: Record<string, string> = {
  rojo: '#ef4444',
  azul: '#3b82f6',
  celeste: '#38bdf8',
  verde: '#22c55e',
  amarillo: '#eab308',
  naranja: '#f97316',
  morado: '#8b5cf6',
  violeta: '#8b5cf6',
  lila: '#c084fc',
  rosa: '#ec4899',
  rosado: '#ec4899',
  negro: '#111827',
  blanco: '#f8fafc',
  gris: '#9ca3af',
  cafe: '#92400e',
  marron: '#92400e',
  turquesa: '#14b8a6',
  cian: '#06b6d4',
  dorado: '#d4af37',
  plateado: '#cbd5e1',
  beige: '#e7d3a1',
  magenta: '#d946ef',
}

/** Acepta `#rrggbb` o un nombre de color en español. */
function resolverColor(texto: string): string | null {
  const hex = /#[0-9a-f]{6}\b/i.exec(texto)
  if (hex) return hex[0].toLowerCase()
  const norm = normalizar(texto)
  for (const nombre in COLORES_NOMBRADOS) {
    if (new RegExp(`\\b${nombre}\\b`).test(norm)) return COLORES_NOMBRADOS[nombre]
  }
  return null
}

/** Etiqueta amigable de un hex (nombre conocido si lo hay; si no, el hex). */
function etiquetaColor(hex: string): string {
  for (const nombre in COLORES_NOMBRADOS) {
    if (COLORES_NOMBRADOS[nombre] === hex) return nombre
  }
  return hex
}

interface ConNombre {
  id: string
  nombre: string
}

/** Casa un elemento de un catálogo por id, por su nombre o por sinónimos. */
function resolverPorNombre<T extends ConNombre>(
  lista: T[],
  texto: string,
  sinonimos?: Record<string, string[]>,
): T | null {
  const n = normalizar(texto)
  const tokens = new Set(n.split(/[^a-z0-9]+/).filter(Boolean))
  for (const it of lista) {
    if (tokens.has(normalizar(it.id))) return it
    const idEsp = normalizar(it.id).replace(/_/g, ' ')
    if (n.includes(idEsp)) return it
    const nom = normalizar(it.nombre)
    if (n.includes(nom)) return it
    for (const s of sinonimos?.[it.id] ?? []) if (n.includes(normalizar(s))) return it
  }
  return null
}

/** Nombre efectivo (override del editor o el del cuarto). */
function nombreCuarto(id: string): string {
  const c = useCuartos.getState().cuartos.find((x) => x.id === id)
  return useDiseño.getState().roomNames[id] || c?.nombre || id
}

/** Resuelve un cuarto por id/nombre, incluyendo el nombre personalizado del editor. */
function resolverCuarto(texto: string): Cuarto | null {
  const directo = buscarCuarto(texto)
  if (directo) return directo
  const cuartos = useCuartos.getState().cuartos
  const nombres = useDiseño.getState().roomNames
  const n = normalizar(texto)
  for (const c of cuartos) {
    const nom = normalizar(nombres[c.id] || c.nombre)
    if (nom && n.includes(nom)) return c
  }
  return null
}

/** Cuarto destino para soltar un objeto: nombrado, o el más cercano al avatar. */
function cuartoDestino(texto?: string): string | null {
  if (texto) {
    const c = resolverCuarto(texto)
    if (c) return c.id
  }
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

// ── Vocabularios de infraestructura (los catálogos son Record, no listas) ──
const LISTA_ESPECIES = Object.entries(ESPECIES).map(([id, d]) => ({ id, nombre: d.nombre }))
const LISTA_ANIMALES = Object.entries(ANIMALES).map(([id, d]) => ({ id, nombre: d.nombre }))
const LISTA_CANCHAS = Object.entries(CANCHAS).map(([id, d]) => ({ id, nombre: d.corto }))

const SINONIMOS_ESPECIE: Record<string, string[]> = {
  maiz: ['elote', 'choclo', 'mazorca'],
  calabaza: ['zapallo'],
  girasol: ['flor de sol'],
}
const SINONIMOS_ANIMAL: Record<string, string[]> = {
  gallina: ['pollo', 'gallo', 'aves'],
  cerdo: ['puerco', 'marrano', 'chancho', 'cochino'],
  cabra: ['chivo', 'chiva'],
  oveja: ['borrego', 'cordero'],
  vaca: ['toro', 'ternera', 'res'],
  caballo: ['yegua', 'potro', 'pony'],
}
const SINONIMOS_CANCHA: Record<string, string[]> = {
  futbol: ['futbol', 'futbolito', 'soccer', 'futsal', 'balompie'],
  tenis: ['tenis'],
  basket: ['basquet', 'basquetbol', 'baloncesto', 'basketball'],
  beisbol: ['beisbol', 'baseball', 'beis', 'pelota caliente', 'softbol'],
}

/** Grupos plegables de la pestaña Configuraciones (para abrirlos desde el chat). */
const GRUPOS_CONFIG = [
  { id: 'cuenta', nombre: 'Cuenta' },
  { id: 'estilo', nombre: 'Estilo visual del mapa' },
  { id: 'interfaz', nombre: 'Interfaz e idioma' },
  { id: 'musica', nombre: 'Música' },
  { id: 'tutoriales', nombre: 'Tutoriales y bienvenida' },
  { id: 'notificaciones', nombre: 'Notificaciones' },
  { id: 'respaldo', nombre: 'Respaldo de datos' },
]

/** Modos de apariencia de la interfaz (ajustesStore.modoUI). */
const MODOS_UI: ModoUI[] = ['claro', 'oscuro', 'transparente']

/** Ambientes de la música generada (mismo orden que ajustesStore.MOODS). */
const MOODS_MUSICA: MoodMusica[] = [
  'calma', 'festivo', 'nocturno', 'chiptune', 'acogedor', 'energia',
  'estudio', 'arcade', 'bosque', 'viaje', 'carrera', 'cajita',
]

const LISTA_VEHICULOS = VEHICULOS_JUGABLES.map((v) => ({ id: v.tipo, nombre: v.nombre }))
const SINONIMOS_VEHICULO: Record<string, string[]> = {
  bicicleta: ['bici', 'cleta'],
  motocicleta: ['moto'],
  automovil: ['auto', 'coche', 'carro'],
  ovni: ['platillo', 'nave'],
}

// ── Helpers espaciales (fase 2: layout, muros, niveles, objetos) ──
const LADO_NOMBRE: Record<SideKey, string> = { N: 'norte', S: 'sur', E: 'este', O: 'oeste' }
const DELTA_DIR: Record<SideKey, { col: number; row: number }> = {
  N: { col: 0, row: -1 }, S: { col: 0, row: 1 }, O: { col: -1, row: 0 }, E: { col: 1, row: 0 },
}
const ladoNombre = (s: SideKey): string => LADO_NOMBRE[s]

/** Palabra de dirección/lado → SideKey (N/S/E/O). */
function ladoDeTexto(texto: string): SideKey | null {
  const n = normalizar(texto)
  if (/\b(norte|arriba)\b/.test(n)) return 'N'
  if (/\b(sur|abajo)\b/.test(n)) return 'S'
  if (/\b(este|derecha)\b/.test(n)) return 'E'
  if (/\b(oeste|izquierda)\b/.test(n)) return 'O'
  return null
}

/** Tipo de objeto del catálogo desde texto (sinónimos de OBJETOS). */
function buscarTipoObjeto(texto: string): string | null {
  const tokens = normalizar(texto).split(/[^a-z0-9]+/).filter(Boolean)
  for (const tok of tokens) for (const tipo in OBJETOS) if (OBJETOS[tipo].includes(tok)) return tipo
  return null
}

/** Último objeto creado (mayor id), opcionalmente filtrado por cuarto/tipo. */
function ultimoObjeto(cuartoTexto?: string, tipoTexto?: string): ObjetoCuarto | null {
  let objs = useDiseño.getState().objetos.filter((o) => o.id != null && !esObjetoLibreria(o))
  if (cuartoTexto) {
    const c = resolverCuarto(cuartoTexto)
    if (c) objs = objs.filter((o) => o.roomId === c.id)
  }
  if (tipoTexto) {
    const tipo = buscarTipoObjeto(tipoTexto)
    if (tipo) objs = objs.filter((o) => o.tipo === tipo)
  }
  if (!objs.length) return null
  return objs.reduce((a, b) => ((b.id as number) > (a.id as number) ? b : a))
}

// ── Abrir apps, secciones y juegos por chat ──

/** Sinónimos para pedir una app por otro nombre que su id (minúsculas, sin acentos). */
const ALIAS_APPS: Record<string, string[]> = {
  cocina: ['nutricion'],
  ejercicio: ['gimnasio', 'gym'],
  descanso: ['recamara', 'dormitorio'],
  despacho: ['finanzas'],
  entretenimiento: ['sala de juegos'],
  sala: ['viajes'],
  jardin: ['calma'],
  garage: ['garaje', 'taller'],
  diario: ['periodico', 'noticias'],
  hobbies: ['pasatiempos'],
  anecdotario: ['album', 'recuerdos'],
}

/** ¿El nombre pedible aparece en el texto? (multi-palabra por inclusión, simple por token). */
function nombreEnTexto(nombre: string, n: string, tokens: Set<string>): boolean {
  return nombre.includes(' ') ? n.includes(nombre) : tokens.has(nombre)
}

/** Busca una sección/juego pedible («recetario», «viborita») entre los comandos de las apps. */
function resolverComandoApp(texto: string): { app: Plantilla; cmd: ComandoApp } | null {
  const n = normalizar(texto)
  const tokens = new Set(n.split(/[^a-z0-9]+/).filter(Boolean))
  // Gana el nombre más largo: «juegos de mesa» antes que «mesa».
  let mejor: { app: Plantilla; cmd: ComandoApp; largo: number } | null = null
  for (const app of plantillasCuarto()) {
    for (const cmd of app.comandos ?? []) {
      for (const nombre of cmd.nombres) {
        if (nombreEnTexto(nombre, n, tokens) && (!mejor || nombre.length > mejor.largo)) {
          mejor = { app, cmd, largo: nombre.length }
        }
      }
    }
  }
  return mejor
}

/**
 * Las vistas del calendario, pedibles por chat. Vive aquí y no en una plantilla
 * porque el calendario dejó de ser una app: se abre en el reloj del HUD, así que
 * `resolverComandoApp` (que recorre el catálogo) ya no lo encuentra.
 */
const VISTAS_CALENDARIO: { vista: VistaCalendario; etiqueta: string; nombres: string[] }[] = [
  // «mis metas»/«mis planes» NO están aquí: eso es el cuarto de Metas, y lo
  // resuelve `resolverApp` por el nombre de la plantilla.
  {
    vista: 'objetivos',
    etiqueta: 'Misiones',
    nombres: ['misiones', 'mis misiones', 'objetivos', 'mis objetivos', 'lo de hoy', 'que me toca hoy'],
  },
  { vista: 'dia', etiqueta: 'Agenda de hoy', nombres: ['agenda de hoy', 'agenda del dia', 'mi dia'] },
  { vista: 'semana', etiqueta: 'Semana', nombres: ['agenda de la semana', 'mi semana'] },
  { vista: 'mes', etiqueta: 'Mes', nombres: ['calendario del mes', 'mi mes'] },
  { vista: 'anio', etiqueta: 'Año', nombres: ['calendario del ano', 'mi ano'] },
  // El genérico al final: gana el nombre más largo, así «mi semana» no cae aquí.
  { vista: 'semana', etiqueta: 'Calendario', nombres: ['calendario'] },
]

/** ¿El texto pide el calendario (o una de sus vistas)? Gana el nombre más largo. */
function resolverVistaCalendario(texto: string): { vista: VistaCalendario; etiqueta: string } | null {
  const n = normalizar(texto)
  const tokens = new Set(n.split(/[^a-z0-9]+/).filter(Boolean))
  let mejor: { vista: VistaCalendario; etiqueta: string; largo: number } | null = null
  for (const v of VISTAS_CALENDARIO) {
    for (const nombre of v.nombres) {
      if (nombreEnTexto(nombre, n, tokens) && (!mejor || nombre.length > mejor.largo)) {
        mejor = { vista: v.vista, etiqueta: v.etiqueta, largo: nombre.length }
      }
    }
  }
  return mejor
}

/** Busca una app por id, alias o nombre («finanzas» → despacho). */
function resolverApp(texto: string): Plantilla | null {
  const n = normalizar(texto)
  const tokens = new Set(n.split(/[^a-z0-9]+/).filter(Boolean))
  for (const app of plantillasCuarto()) {
    if (tokens.has(normalizar(app.id))) return app
    const nombreCorto = normalizar(app.nombre.split(' · ')[0])
    if (nombreEnTexto(nombreCorto, n, tokens)) return app
    for (const alias of ALIAS_APPS[app.id] ?? []) {
      if (nombreEnTexto(alias, n, tokens)) return app
    }
  }
  return null
}

/** Nombre corto de una app para chips y mensajes. */
const nombreApp = (app: Plantilla): string => app.nombre.split(' · ')[0]

/** Lista de cuartos para el system prompt de la IA (id = nombre). */
export function descripcionCuartos(): string {
  const cuartos = useCuartos.getState().cuartos
  const nombres = useDiseño.getState().roomNames
  if (!cuartos.length) return 'El usuario aún no tiene cuartos en la casa.'
  return (
    'Cuartos actuales (id = nombre): ' +
    cuartos.map((c) => `${c.id} = ${nombres[c.id] || c.nombre}`).join('; ')
  )
}

// ───────────────────────── Ejecución (única) ─────────────────────────

const str = (i: Record<string, unknown>, k: string): string | undefined =>
  typeof i[k] === 'string' && (i[k] as string).trim() ? (i[k] as string).trim() : undefined
const num = (i: Record<string, unknown>, k: string): number | undefined =>
  typeof i[k] === 'number' ? (i[k] as number) : undefined
const bool = (i: Record<string, unknown>, k: string): boolean => i[k] === true

/** Resuelve el cuarto desde el input de una tool (campo `cuarto`). */
function cuartoDeInput(i: Record<string, unknown>): Cuarto | null {
  const t = str(i, 'cuarto')
  return t ? resolverCuarto(t) : null
}

/**
 * Ejecuta UNA acción de edición. Devuelve un mensaje de confirmación (en la voz
 * neutra del asistente) o `null` si el input no resolvió (cuarto/valor inválido).
 */
export async function ejecutarToolEditor(
  name: string,
  input: Record<string, unknown>,
): Promise<string | null> {
  const d = useDiseño.getState()
  const c = useCuartos.getState()

  switch (name) {
    // ── Cuartos ──
    case 'editor_crear_cuarto': {
      const nombre = str(input, 'nombre')
      const icon = str(input, 'icono')
      const color = str(input, 'color') ? resolverColor(str(input, 'color')!) ?? undefined : undefined
      const cat = str(input, 'categoria') as Cuarto['categoria'] | undefined
      const categoria = cat && ['cuerpo', 'mente', 'complemento', 'config'].includes(cat) ? cat : undefined
      await c.crear({ nombre, icon, color, categoria })
      return `Creé el cuarto «${nombre || 'Cuarto nuevo'}» y lo coloqué en el mapa.`
    }
    case 'editor_renombrar_cuarto': {
      const cu = cuartoDeInput(input)
      const nombre = str(input, 'nombre')
      if (!cu || !nombre) return null
      await c.renombrar(cu.id, nombre)
      return `Renombré ese cuarto a «${nombre}».`
    }
    case 'editor_icono_cuarto': {
      const cu = cuartoDeInput(input)
      const icono = str(input, 'icono')
      if (!cu || !icono) return null
      await c.setIcon(cu.id, icono)
      return `Cambié el ícono de «${nombreCuarto(cu.id)}» a ${icono}.`
    }
    case 'editor_categoria_cuarto': {
      const cu = cuartoDeInput(input)
      const cat = str(input, 'categoria') as Cuarto['categoria'] | undefined
      if (!cu || !cat || !['cuerpo', 'mente', 'complemento', 'config'].includes(cat)) return null
      await c.setCategoria(cu.id, cat)
      return `Puse «${nombreCuarto(cu.id)}» en la categoría ${cat}.`
    }
    case 'editor_eliminar_cuarto': {
      const cu = cuartoDeInput(input)
      if (!cu) return null
      const nom = nombreCuarto(cu.id)
      await c.eliminar(cu.id)
      return `Eliminé el cuarto «${nom}».`
    }

    // ── Apariencia / superficies del cuarto ──
    case 'editor_pintar_cuarto': {
      const cu = cuartoDeInput(input)
      const hex = str(input, 'color') ? resolverColor(str(input, 'color')!) : null
      if (!cu || !hex) return null
      await d.setRoomColor(cu.id, hex)
      return `Pinté «${nombreCuarto(cu.id)}» de ${etiquetaColor(hex)}.`
    }
    case 'editor_piso_cuarto': {
      const cu = cuartoDeInput(input)
      const piso = resolverPorNombre(PISOS, str(input, 'piso') ?? '')
      if (!cu || !piso) return null
      await d.setRoomPisoTipo(cu.id, piso.id as PisoTipoId)
      return `Cambié el piso de «${nombreCuarto(cu.id)}» a ${piso.nombre}.`
    }
    case 'editor_piso_color_cuarto': {
      const cu = cuartoDeInput(input)
      const hex = str(input, 'color') ? resolverColor(str(input, 'color')!) : null
      if (!cu || !hex) return null
      await d.setRoomPisoColor(cu.id, hex)
      return `Pinté el piso de «${nombreCuarto(cu.id)}» de ${etiquetaColor(hex)}.`
    }
    case 'editor_techo_cuarto': {
      const cu = cuartoDeInput(input)
      const techo = resolverPorNombre(TECHOS, str(input, 'techo') ?? '')
      if (!cu || !techo) return null
      await d.setRoomTechoTipo(cu.id, techo.id as TechoTipoId)
      return `Cambié el techo de «${nombreCuarto(cu.id)}» a ${techo.nombre}.`
    }
    case 'editor_techo_color_cuarto': {
      const cu = cuartoDeInput(input)
      const hex = str(input, 'color') ? resolverColor(str(input, 'color')!) : null
      if (!cu || !hex) return null
      await d.setRoomTechoColor(cu.id, hex)
      return `Pinté el techo de «${nombreCuarto(cu.id)}» de ${etiquetaColor(hex)}.`
    }
    case 'editor_techo_forma_cuarto': {
      const cu = cuartoDeInput(input)
      const forma = resolverPorNombre(TECHO_FORMAS, str(input, 'forma') ?? '', {
        dos_aguas: ['dos aguas', 'a dos aguas', 'aguas'],
        abovedado: ['boveda', 'bóveda'],
        cupula: ['cúpula', 'domo'],
      })
      if (!cu || !forma) return null
      await d.setRoomTechoForma(cu.id, forma.id as TechoFormaId)
      return `Le puse techo ${forma.nombre.toLowerCase()} a «${nombreCuarto(cu.id)}».`
    }

    // ── Objetos ──
    case 'editor_crear_objeto': {
      const tipo = str(input, 'tipo')
      const item = tipo ? getCatalogoItem(tipo) : null
      if (!item) return null
      const roomId = cuartoDestino(str(input, 'cuarto'))
      if (!roomId) return 'No hay ningún cuarto en el mapa donde colocarlo. Agrega uno primero.'
      await d.addObjeto(roomId, item.id, item.defaultColor)
      return `Agregué ${item.nombre.toLowerCase()} a «${nombreCuarto(roomId)}».`
    }

    // ── Avatar / personaje ──
    case 'editor_avatar_color': {
      const parte = str(input, 'parte')
      const hex = str(input, 'color') ? resolverColor(str(input, 'color')!) : null
      if (!hex || (parte !== 'cabeza' && parte !== 'torso' && parte !== 'piernas')) return null
      await d.setAvatarColor(parte, hex)
      return `Pinté ${parte === 'cabeza' ? 'la cabeza' : parte === 'torso' ? 'el torso' : 'las piernas'} de tu personaje de ${etiquetaColor(hex)}.`
    }
    case 'editor_avatar_tamano': {
      const escala = num(input, 'escala')
      if (escala == null) return null
      const e = Math.max(ESCALA_MIN, Math.min(ESCALA_MAX, escala))
      await d.setAvatarEscala(e)
      return `Ajusté el tamaño de tu personaje a ${e.toFixed(2)}×.`
    }
    case 'editor_avatar_prenda': {
      const prenda = str(input, 'prenda') as PrendaId | undefined
      if (!prenda || !PRENDAS.some((p) => p.id === prenda)) return null
      if (bool(input, 'quitar')) {
        await d.setAvatarPrenda(prenda, null)
        return `Le quité ${prenda} a tu personaje.`
      }
      const hex = str(input, 'color') ? resolverColor(str(input, 'color')!) : null
      await d.setAvatarPrenda(prenda, hex ?? PRENDA_COLOR_DEFAULT[prenda])
      return `Le puse ${prenda}${hex ? ` ${etiquetaColor(hex)}` : ''} a tu personaje.`
    }

    // ── Diseño global ──
    case 'editor_tema': {
      const t = str(input, 'tema')
      if (t === 'ninguno' || t === 'sin') {
        await d.setTemaGlobal(null)
        return 'Quité el tema de la casa.'
      }
      const tema = resolverPorNombre(TEMAS, t ?? '')
      if (!tema) return null
      await d.setTemaGlobal(tema.id as TemaId)
      return `Le puse el tema ${tema.nombre} a la casa.`
    }
    case 'editor_fondo': {
      const fondo = resolverPorNombre(FONDOS, str(input, 'fondo') ?? '')
      if (!fondo) return null
      await d.setFondoId(fondo.id as FondoId)
      return `Cambié el fondo del cielo a ${fondo.nombre}.`
    }
    case 'editor_animaciones_fondo': {
      const activo = bool(input, 'activo')
      await d.setAnimacionesFondo(activo)
      const intensidad = num(input, 'intensidad')
      if (activo && intensidad != null) {
        // Acepta 0-1 y 0-100 (la IA manda una u otra según cómo lo pida el usuario).
        await d.setAnimacionesIntensidad(intensidad > 1 ? intensidad / 100 : intensidad)
        const val = useDiseño.getState().animacionesIntensidad
        return `Puse las animaciones del fondo al ${Math.round(val * 100)}%.`
      }
      return activo ? 'Activé las animaciones del fondo.' : 'Apagué las animaciones del fondo.'
    }

    // ── Ajustes de interfaz ──
    case 'editor_idioma': {
      const pedido = str(input, 'idioma')
      const datos = IDIOMAS.find((i) => i.id === pedido)
      if (!datos) return null
      useAjustes.getState().setIdioma(datos.id)
      return `Cambié el idioma de la app a ${datos.nombreIA}.`
    }
    case 'editor_tema_interfaz': {
      const tema = resolverPorNombre(TEMAS_UI, str(input, 'tema') ?? '')
      if (!tema) return null
      useAjustes.getState().setTemaUI(tema.id as TemaUIId)
      return `Cambié el tema de la interfaz a ${tema.nombre}.`
    }
    case 'editor_tipografia': {
      const tipo = resolverPorNombre(TIPOGRAFIAS, str(input, 'tipografia') ?? '')
      if (!tipo) return null
      useAjustes.getState().setTipografia(tipo.id as TipografiaId)
      return `Cambié la tipografía a ${tipo.nombre}.`
    }
    case 'editor_apariencia': {
      const aj = useAjustes.getState()
      const modo = str(input, 'modo')
      const iconos = str(input, 'iconos')
      const transp = num(input, 'transparencia')
      const intens = num(input, 'intensidad')
      const partes: string[] = []
      if (modo === 'claro' || modo === 'oscuro' || modo === 'transparente') {
        aj.setModoUI(modo)
        partes.push(`modo ${modo}`)
      }
      if (iconos === 'emoji' || iconos === 'profesional') {
        aj.setEstiloIconos(iconos)
        partes.push(iconos === 'emoji' ? 'iconos con emojis' : 'iconos profesionales')
      }
      if (transp != null) {
        const v = Math.max(0, Math.min(1, transp))
        aj.setVidrioTransparencia(v)
        partes.push(`transparencia al ${Math.round(v * 100)}%`)
      }
      if (intens != null) {
        const v = Math.max(0, Math.min(1, intens))
        aj.setVidrioIntensidad(v)
        partes.push(`desenfoque al ${Math.round(v * 100)}%`)
      }
      if (!partes.length) return null
      return `Listo: ${partes.join(', ')}.`
    }
    case 'editor_estilo_mapa': {
      const estilo = resolverPorNombre(ESTILOS, str(input, 'estilo') ?? '', {
        comic: ['caricatura', 'cartoon'],
        miniatura: ['maqueta', 'juguete'],
        retro: ['pixel', 'pixelado', '8 bits'],
        normal: ['ninguno', 'sin estilo'],
      })
      if (estilo) {
        await d.setEstiloVisual(estilo.id as EstiloVisualId)
        // Elegir un estilo con los efectos apagados no se vería: se encienden.
        if (estilo.id !== 'normal' && !useDiseño.getState().efectosVisuales) {
          await d.setEfectosVisuales(true)
        }
        return `Le puse el estilo ${estilo.nombre.toLowerCase()} al mapa.`
      }
      if ('efectos' in input) {
        const activo = bool(input, 'efectos')
        await d.setEfectosVisuales(activo)
        return activo ? 'Activé los efectos visuales del mapa.' : 'Apagué los efectos visuales del mapa.'
      }
      return null
    }
    case 'editor_notificaciones': {
      const aj = useAjustes.getState()
      const activo = bool(input, 'activo')
      const que = str(input, 'que') ?? 'todo'
      const hora = str(input, 'hora')
      if (hora && /^\d{1,2}:\d{2}$/.test(hora)) {
        aj.setNotifHoraMetas(hora.padStart(5, '0'))
        aj.setNotifMetas(true)
        return `Te avisaré de tus metas del día a las ${hora}.`
      }
      const aviso =
        activo && permisoNotificaciones() !== 'granted'
          ? ' Si el navegador no te pide permiso, dáselo desde Configuraciones → Notificaciones.'
          : ''
      switch (que) {
        case 'rutinas':
          aj.setNotifRutinas(activo)
          return activo ? `Te avisaré de tus rutinas del calendario.${aviso}` : 'Ya no te aviso de las rutinas.'
        case 'metas':
          aj.setNotifMetas(activo)
          return activo ? `Te avisaré de tus metas del día.${aviso}` : 'Ya no te aviso de las metas.'
        case 'wrapped':
          aj.setNotifWrapped(activo)
          return activo ? `Te avisaré cuando haya un resumen nuevo.${aviso}` : 'Ya no te aviso de los resúmenes.'
        default:
          aj.setNotif(activo)
          return activo ? `Encendí los avisos.${aviso}` : 'Apagué todos los avisos.'
      }
    }
    case 'editor_respaldo': {
      await exportarRespaldo()
      return 'Descargué un respaldo de tus datos en formato JSON.'
    }
    case 'editor_bienvenida': {
      useBienvenida.getState().abrir()
      return 'Abrí el menú de bienvenida.'
    }
    case 'editor_ajustes_abrir': {
      const grupo = str(input, 'grupo')
      const g = GRUPOS_CONFIG.find((x) => x.id === grupo)
      useLayout.getState().setEditMode(true)
      useEditorUi.getState().setTab('config')
      if (g) useEditorUi.getState().abrirConfigGrupo(g.id)
      return g
        ? `Abrí Configuraciones en «${g.nombre}».`
        : 'Abrí las Configuraciones del editor.'
    }

    // ── Fase 2: forma, tamaño, muros, niveles, mapa y objetos ──
    case 'editor_forma_cuarto': {
      const cu = cuartoDeInput(input)
      const f = str(input, 'forma')
      if (!cu || (f !== 'cuadrado' && f !== 'circular' && f !== 'triangular')) return null
      const forma: CeldaFormaLoseta | null =
        f === 'cuadrado' ? null : { forma: f as FormaLoseta, rotacion: 0 }
      await useLayout.getState().aplicarFormaCuartoTodas(cu.id, forma)
      return `Cambié la forma de «${nombreCuarto(cu.id)}» a ${f === 'circular' ? 'redonda' : f}.`
    }
    case 'editor_crecer_cuarto': {
      const cu = cuartoDeInput(input)
      if (!cu) return null
      const L = useLayout.getState()
      const anchor = L.cells[cu.id]
      const fp = L.footprints[cu.id] ?? FOOTPRINT_DEFAULT
      if (!anchor) return null
      const own = new Set(footprintCells(anchor, fp).map((c) => cellId(c.col, c.row)))
      const antes = fp.length
      for (const c of footprintCells(anchor, fp)) {
        for (const s of SIDE_KEYS) {
          const abs = { col: c.col + DELTA_DIR[s].col, row: c.row + DELTA_DIR[s].row }
          if (own.has(cellId(abs.col, abs.row))) continue
          await L.addRoomCell(cu.id, abs)
          if ((useLayout.getState().footprints[cu.id] ?? FOOTPRINT_DEFAULT).length > antes) {
            return `Agrandé «${nombreCuarto(cu.id)}» una celda.`
          }
        }
      }
      return 'No hay espacio libre junto a ese cuarto para agrandarlo.'
    }
    case 'editor_encoger_cuarto': {
      const cu = cuartoDeInput(input)
      if (!cu) return null
      const L = useLayout.getState()
      const anchor = L.cells[cu.id]
      const fp = L.footprints[cu.id] ?? FOOTPRINT_DEFAULT
      if (!anchor) return null
      if (fp.length <= 1) return 'Ese cuarto ya es del tamaño mínimo.'
      const antes = fp.length
      for (const off of [...fp].reverse()) {
        await L.removeRoomCell(cu.id, { col: anchor.col + off.col, row: anchor.row + off.row })
        if ((useLayout.getState().footprints[cu.id] ?? FOOTPRINT_DEFAULT).length < antes) {
          return `Encogí «${nombreCuarto(cu.id)}» una celda.`
        }
      }
      return 'No pude encoger ese cuarto sin partirlo.'
    }
    case 'editor_muro': {
      const cu = cuartoDeInput(input)
      const lado = ladoDeTexto(str(input, 'lado') ?? '')
      const e = normalizar(str(input, 'estado') ?? '')
      const estado: WallState | null = /puerta/.test(e)
        ? 'puerta'
        : /abre|abrir|abiert|quita|sin/.test(e)
        ? 'abierto'
        : /pared|muro|cierr|cerrad/.test(e)
        ? 'pared'
        : null
      if (!cu || !lado || !estado) return null
      const L = useLayout.getState()
      const anchor = L.cells[cu.id]
      const fp = L.footprints[cu.id] ?? FOOTPRINT_DEFAULT
      const occ = L.ocupadoPorNivel.get(L.niveles[cu.id] ?? 0) ?? new Set<string>()
      const edges = roomEdges(anchor, fp, occ).filter((ed) => ed.side === lado)
      if (!edges.length) return 'Ese lado no tiene muro exterior.'
      for (const ed of edges) await L.paintEdge(cu.id, ed.off, ed.side, estado)
      const verbo = estado === 'abierto' ? 'Abrí' : estado === 'puerta' ? 'Puse una puerta en' : 'Cerré'
      return `${verbo} el muro ${ladoNombre(lado)} de «${nombreCuarto(cu.id)}».`
    }
    case 'editor_mover_cuarto': {
      const cu = cuartoDeInput(input)
      const dir = ladoDeTexto(str(input, 'direccion') ?? '')
      if (!cu || !dir) return null
      const L = useLayout.getState()
      const anchor = L.cells[cu.id]
      const fp = L.footprints[cu.id] ?? FOOTPRINT_DEFAULT
      const nivel = L.niveles[cu.id] ?? 0
      const target = { col: anchor.col + DELTA_DIR[dir].col, row: anchor.row + DELTA_DIR[dir].row }
      if (!cabeEnRejilla(target, fp, L.gridCols, L.gridRows)) return 'No cabe en esa dirección.'
      const destino = new Set(footprintCells(target, fp).map((c) => cellId(c.col, c.row)))
      const choca = useCuartos.getState().cuartos.some(
        (r) =>
          r.id !== cu.id &&
          L.placed[r.id] &&
          (L.niveles[r.id] ?? 0) === nivel &&
          footprintCells(L.cells[r.id], L.footprints[r.id] ?? FOOTPRINT_DEFAULT).some((c) =>
            destino.has(cellId(c.col, c.row)),
          ),
      )
      if (choca) return 'Hay otro cuarto en esa dirección.'
      await L.moveRoom(cu.id, target)
      return `Moví «${nombreCuarto(cu.id)}» hacia el ${ladoNombre(dir)}.`
    }
    case 'editor_apilar_cuarto': {
      const cu = cuartoDeInput(input)
      const baseTxt = str(input, 'base')
      const base = baseTxt ? resolverCuarto(baseTxt) : null
      if (!cu || !base || cu.id === base.id) return null
      const acc = str(input, 'acceso')
      const acceso: TipoAcceso = acc === 'elevador' || acc === 'resbaladilla' ? acc : 'escalera'
      await useLayout.getState().addRoomOnTop(cu.id, base.id, acceso)
      return `Apilé «${nombreCuarto(cu.id)}» encima de «${nombreCuarto(base.id)}».`
    }
    case 'editor_redimensionar_mapa': {
      const dir = ladoDeTexto(str(input, 'direccion') ?? '') ?? 'E'
      const accion = normalizar(str(input, 'accion') ?? '')
      const L = useLayout.getState()
      if (/encog|reduc|achic|peque/.test(accion)) {
        await L.contractGrid(dir)
        return `Encogí el mapa por el lado ${ladoNombre(dir)}.`
      }
      await L.expandGrid(dir)
      return `Agrandé el mapa por el lado ${ladoNombre(dir)}.`
    }
    case 'editor_objeto_color': {
      const hex = str(input, 'color') ? resolverColor(str(input, 'color')!) : null
      const o = ultimoObjeto(str(input, 'cuarto'), str(input, 'tipo'))
      if (!hex || !o?.id) return null
      await useDiseño.getState().setObjetoColor(o.id, hex)
      return `Pinté el último objeto de ${etiquetaColor(hex)}.`
    }
    case 'editor_objeto_tamano': {
      const escala = num(input, 'escala')
      const o = ultimoObjeto(str(input, 'cuarto'), str(input, 'tipo'))
      if (escala == null || !o?.id) return null
      await useDiseño.getState().setObjetoEscala(o.id, Math.max(0.3, Math.min(3, escala)))
      return 'Cambié el tamaño del último objeto.'
    }
    case 'editor_objeto_rotar': {
      const o = ultimoObjeto(str(input, 'cuarto'), str(input, 'tipo'))
      if (!o?.id) return null
      const grados = num(input, 'grados') ?? 90
      await useDiseño.getState().setObjetoRotacion(o.id, (o.rotY ?? 0) + grados)
      return 'Giré el último objeto.'
    }
    case 'editor_eliminar_objeto': {
      const o = ultimoObjeto(str(input, 'cuarto'), str(input, 'tipo'))
      if (!o?.id) return null
      await useDiseño.getState().removeObjeto(o.id)
      return 'Quité el último objeto.'
    }
    case 'editor_muro_estilo': {
      const cu = cuartoDeInput(input)
      const lado = ladoDeTexto(str(input, 'lado') ?? '')
      if (!cu || !lado) return null
      const muro: Partial<EstiloMuro> = {}
      const puerta: Partial<EstiloPuerta> = {}
      const tipoM = resolverPorNombre(TIPOS_MURO, str(input, 'tipo') ?? '')
      if (tipoM) muro.tipo = tipoM.id
      const hex = str(input, 'color') ? resolverColor(str(input, 'color')!) : null
      if (hex) muro.color = hex
      const g = normalizar(str(input, 'grosor') ?? '')
      if (g) {
        const f = /delg|fin/.test(g) ? 0.6 : /grues|anch/.test(g) ? 1.7 : parseFloat(g)
        if (!Number.isNaN(f)) muro.grosor = f
      }
      const al = normalizar(str(input, 'alto') ?? '')
      if (al) {
        const f = /baj/.test(al) ? 0.7 : /alt/.test(al) ? 1.4 : parseFloat(al)
        if (!Number.isNaN(f)) muro.alto = f
      }
      const tipoP = resolverPorNombre(TIPOS_PUERTA, str(input, 'puerta') ?? '')
      if (tipoP) puerta.tipo = tipoP.id
      if (!Object.keys(muro).length && !tipoP) return null
      const L = useLayout.getState()
      const anchor = L.cells[cu.id]
      const fp = L.footprints[cu.id] ?? FOOTPRINT_DEFAULT
      const occ = L.ocupadoPorNivel.get(L.niveles[cu.id] ?? 0) ?? new Set<string>()
      const edges = roomEdges(anchor, fp, occ).filter((e) => e.side === lado)
      if (!edges.length) return 'Ese lado no tiene muro exterior.'
      for (const e of edges) {
        if (tipoP) await L.paintEdge(cu.id, e.off, e.side, 'puerta')
        await L.setEdgeEstilo(cu.id, e.off, e.side, {
          ...(Object.keys(muro).length ? { muro } : {}),
          ...(tipoP ? { puerta } : {}),
        })
      }
      return `Cambié el estilo del muro ${ladoNombre(lado)} de «${nombreCuarto(cu.id)}».`
    }
    case 'editor_agrupar_objetos': {
      const cu = cuartoDeInput(input)
      if (!cu) return null
      const ids = useDiseño
        .getState()
        .objetos.filter((o) => o.roomId === cu.id && o.id != null)
        .map((o) => o.id as number)
      if (ids.length < 2) return 'Ese cuarto no tiene suficientes objetos para agrupar.'
      useDiseño.setState({ seleccion: ids })
      await useDiseño.getState().agrupar()
      return `Agrupé ${ids.length} objetos de «${nombreCuarto(cu.id)}».`
    }
    case 'editor_desagrupar_objetos': {
      const cu = cuartoDeInput(input)
      if (!cu) return null
      const grupo = useDiseño.getState().objetos.find((o) => o.roomId === cu.id && o.grupoId)?.grupoId
      if (!grupo) return 'No hay ningún grupo en ese cuarto.'
      await useDiseño.getState().desagrupar(grupo)
      return `Desagrupé los objetos de «${nombreCuarto(cu.id)}».`
    }

    // ── Abrir cuarto / app / sección / juego ──
    case 'editor_abrir_app': {
      const seccion = str(input, 'seccion')
      const dato = str(input, 'dato')
      const appTxt = str(input, 'app')
      const cuartoTxt = str(input, 'cuarto')
      // Solo cuarto: se abre y el overlay muestra su(s) app(s).
      if (!appTxt && cuartoTxt) {
        const cu = resolverCuarto(cuartoTxt)
        if (!cu) return null
        useHouse.getState().openRoom(cu.id)
        return `Abrí «${nombreCuarto(cu.id)}».`
      }
      if (!appTxt) return null
      const app = resolverApp(appTxt) ?? resolverComandoApp(appTxt)?.app ?? null
      if (!app) return null
      // La app lee la intención al montarse y abre la sección/juego pedido.
      const roomId = abrirApp(app.id, seccion, dato)
      if (!roomId) {
        return `No tienes «${nombreApp(app)}» en ningún cuarto: asígnala a un objeto desde el editor.`
      }
      const cmd = seccion
        ? app.comandos?.find((x) => x.seccion === seccion && (dato ? x.dato === dato : !x.dato))
        : undefined
      return cmd
        ? `Abrí ${cmd.etiqueta} (${nombreApp(app)}) en «${nombreCuarto(roomId)}».`
        : `Abrí ${nombreApp(app)} en «${nombreCuarto(roomId)}».`
    }

    // El calendario no vive en ningún cuarto: se abre sobre la casa, desde el reloj.
    case 'editor_abrir_calendario': {
      const pedida = str(input, 'vista')
      const vista = VISTAS_CALENDARIO.find((v) => v.vista === pedida)
      useRutinasUI.getState().abrirCalendario(vista?.vista)
      return vista ? `Abrí el calendario en ${vista.etiqueta}.` : 'Abrí el calendario.'
    }

    // ── Ideas: mapas conceptuales ──
    // El módulo de alta se carga al vuelo: la app Ideas no tiene por qué viajar
    // en el bundle del chat solo por esta acción.
    case 'editor_mapa_ideas': {
      const tema = str(input, 'tema')
      if (!tema) return null
      const pedido = str(input, 'tipo')
      const def = TIPOS_MAPA.find((d) => d.id === pedido) ?? TIPOS_MAPA[0]
      const { crearMapaIA, crearMapaVacio } = await import('../../rooms/ideas/crear')
      let id: number
      let nombre = tema
      try {
        if (bool(input, 'vacio')) {
          id = await crearMapaVacio(tema, def.id as TipoMapa)
        } else {
          const r = await crearMapaIA(tema, def.id as TipoMapa)
          id = r.id
          nombre = r.nombre
        }
      } catch (e) {
        console.warn('[MPH] no pude dibujar el mapa desde el chat:', e)
        return 'No pude dibujar el mapa: la IA no devolvió nada usable. Prueba otra vez o con un tema más concreto.'
      }
      marcarUltimoMapa(id)
      const roomId = abrirApp('ideas', def.familia, String(id))
      const etiqueta = def.nombreEs.toLowerCase()
      return roomId
        ? `Dibujé «${nombre}» (${etiqueta}) y lo abrí en «${nombreCuarto(roomId)}».`
        : `Dibujé «${nombre}» (${etiqueta}), pero no tienes la app Ideas en ningún cuarto: asígnala a un objeto para verlo.`
    }

    // ── Paintball: batalla contra los asistentes por toda la casa ──
    case 'editor_paintball': {
      const pb = usePaintball.getState()
      if (bool(input, 'salir')) {
        if (!pb.fase) return 'No hay ninguna batalla en marcha.'
        pb.cancelar()
        return 'Salimos del paintball. La casa vuelve a la normalidad.'
      }
      const dif = num(input, 'dificultad')
      if (dif != null) pb.setDificultad(Math.max(0, Math.min(1, dif)))
      const vista = str(input, 'vista')
      if (vista === 'primera' || vista === 'tercera') pb.setVistaCombate(vista)
      if (pb.fase === 'cuenta' || pb.fase === 'jugando') return 'Ya estás en plena batalla: ¡a disparar!'

      pb.iniciar() // deja fase='config' (el menú de batalla)
      if (!usePaintball.getState().fase) return 'No puedo abrir el paintball mientras editas la casa: sal del editor primero.'
      const modoTxt = str(input, 'modo')
      if (!modoTxt) return 'Abrí el menú del paintball: elige modo, rival y dificultad.'
      const modo: ModoPaintball = modoTxt === '1v1' || modoTxt === '2v2' ? modoTxt : 'royale'

      const asistentes = useAsistentes.getState().lista
      if (!asistentes.length) return 'Necesitas al menos un asistente para jugar: créalo en la configuración del chat.'
      if (modo === '2v2' && asistentes.length < 3) return 'Para un 2 vs 2 hacen falta al menos 3 asistentes (tu compañero y dos rivales).'
      // Rival (o compañero en 2v2) pedido por su nombre; los demás salen al azar.
      const nom = str(input, 'rival')
      const elegido = nom
        ? asistentes.find((a) => normalizar(a.nombre).startsWith(normalizar(nom)))
        : undefined
      const resto = asistentes.filter((a) => a.id !== elegido?.id).sort(() => Math.random() - 0.5)
      const orden = elegido ? [elegido, ...resto] : resto
      // En 2v2 el PRIMERO es el compañero (contrato de `empezar`).
      const equipo = orden.slice(0, modo === '1v1' ? 1 : modo === '2v2' ? 3 : MAX_BOTS_ROYALE)
      pb.empezar(modo, equipo.map((a) => a.id))
      if (usePaintball.getState().fase === 'config') {
        return 'El paintball se juega en la planta baja: baja por la escalera y te preparo la batalla.'
      }
      const comoJuega =
        modo === '1v1'
          ? `1 vs 1 contra ${equipo[0].nombre}`
          : modo === '2v2'
            ? `2 vs 2 con ${equipo[0].nombre} de compañero`
            : `batalla campal contra ${equipo.length} asistentes`
      return `¡Marcadora en mano! ${comoJuega}. Aguantas ${VIDAS_PAINTBALL} bolazos: apunta y dispara.`
    }

    // ── Infraestructura del mapa (huerto, granja, caminos, canchas) ──
    // Abrir un editor DESMONTA el ChatBox (`construyendo` en App.tsx), así que la
    // respuesta se repite con `infraNota` para que se lea dentro del editor.
    case 'editor_infra_construir': {
      const obra = str(input, 'obra')
      const herr = str(input, 'herramienta')
      switch (obra) {
        case 'huerto': {
          const h = useHuerto.getState()
          h.iniciar() // fija herramienta 'parcela': preseleccionar SIEMPRE después
          const esp = str(input, 'especie')
          if (esp && esp in ESPECIES) {
            h.setEspecie(esp as EspecieCultivo) // ya deja la herramienta en 'sembrar'
            const nom = ESPECIES[esp as EspecieCultivo].nombre.toLowerCase()
            infraNota(`Listo para sembrar ${nom}: toca las parcelas del mapa.`)
            return `Abrí el huerto con ${nom} lista para sembrar.`
          }
          if (herr) h.setHerramienta(herr as HerramientaHuerto)
          infraNota('Pinta parcelas tocando el mapa y luego siembra en ellas.')
          return 'Abrí el editor del huerto.'
        }
        case 'granja': {
          const g = useGranja.getState()
          g.iniciar() // fija herramienta 'animal'
          const an = str(input, 'animal')
          if (an && an in ANIMALES) {
            g.setTipo(an as TipoAnimal) // ya deja la herramienta en 'animal'
            const nom = ANIMALES[an as TipoAnimal].nombre.toLowerCase()
            infraNota(`Toca dentro de un corral para poner ${nom}s.`)
            return `Abrí la granja lista para poner ${nom}s.`
          }
          if (herr) g.setHerramienta(herr as HerramientaGranja)
          infraNota('Dibuja un corral tocando el mapa y mete animales dentro.')
          return 'Abrí el editor de la granja.'
        }
        case 'caminos': {
          const cm = useCaminos.getState()
          cm.iniciar() // fija herramienta 'pintar'
          const via = str(input, 'via')
          if (via === 'pista' || via === 'riel' || via === 'coaster') cm.setTipo(via)
          if (herr) cm.setHerramienta(herr as HerramientaCamino) // después de setTipo
          const nom = via === 'coaster' ? 'la montaña rusa' : via === 'riel' ? 'las vías del tren' : 'la pista'
          infraNota(`Pinta ${nom} tocando las celdas del mapa.`)
          return `Abrí el editor de caminos para trazar ${nom}.`
        }
        case 'canchas': {
          const k = useCanchas.getState()
          k.iniciar() // resetea la clase a 'futbol'
          const clase = str(input, 'clase')
          if (clase && clase in CANCHAS) k.setClase(clase as ClaseCancha)
          infraNota('Toca el mapa para soltar la cancha donde quieras.')
          return 'Abrí el editor de canchas.'
        }
        default:
          return null
      }
    }

    case 'editor_infra_cancha': {
      const clase = str(input, 'clase')
      if (!clase || !(clase in CANCHAS)) return null
      const k = useCanchas.getState()
      k.setClase(clase as ClaseCancha) // `colocar` lee la clase activa del store
      const hexTxt = str(input, 'color')
      if (hexTxt) {
        const hex = resolverColor(hexTxt)
        if (hex) k.setColor(hex)
      }
      const esc = num(input, 'escala')
      const escala = esc != null ? Math.max(0.25, Math.min(2, esc)) : 1
      k.setEscala(escala)
      // Igual que `cuartoDestino`: se resuelve por cercanía al avatar, sin pedir
      // coordenadas. Delante de él (con el tamaño ya escalado por la celda del mapa)
      // para no dejarlo dentro de la cancha.
      const def = CANCHAS[clase as ClaseCancha]
      await k.colocar(playerPos.x + (def.largo * escalaCancha(escala)) / 2 + 2, playerPos.z)
      return `Puse una ${def.corto.toLowerCase()} junto a ti. Camina dentro para jugar.`
    }

    case 'editor_infra_huerto_accion': {
      const accion = str(input, 'accion')
      if (accion === 'regar') {
        const n = await regarTodo()
        return n ? `Regué ${n} cultivo${n > 1 ? 's' : ''} del huerto.` : 'No hay nada que regar ahora mismo.'
      }
      if (accion === 'cosechar') {
        const n = await cosecharTodo()
        return n
          ? `Coseché ${n} parcela${n > 1 ? 's' : ''}; todo fue a la cesta.`
          : 'Todavía no hay nada listo para cosechar.'
      }
      return null
    }

    case 'editor_infra_granja_accion': {
      const accion = str(input, 'accion')
      if (accion === 'alimentar') {
        const r = await alimentarTodos()
        if (!r.corrales) return 'Aún no tienes corrales en la granja.'
        if (r.ok) return `Alimenté a los animales de ${r.ok} corral${r.ok > 1 ? 'es' : ''}.`
        if (r.sinComida) return 'La cesta está vacía: cosecha algo del huerto y vuelvo a alimentarlos.'
        return r.enfermos
          ? 'Los que quedan están enfermos y no comen: pídeme que los cure.'
          : 'Ninguno tiene hambre todavía.'
      }
      if (accion === 'mimar') {
        const n = await mimarTodos()
        return n ? `Mimé a los animales de ${n} corral${n > 1 ? 'es' : ''}.` : 'Aún no tienes corrales en la granja.'
      }
      if (accion === 'curar') {
        const n = await curarTodos()
        return n ? `Curé a ${n} animal${n > 1 ? 'es' : ''}.` : 'Ninguno está enfermo ahora mismo.'
      }
      if (accion === 'limpiar') {
        const n = await limpiarTodos()
        return n ? `Limpié ${n} corral${n > 1 ? 'es' : ''}.` : 'Los corrales ya estaban limpios.'
      }
      return null
    }

    case 'editor_infra_borrar': {
      const que = str(input, 'que')
      if (que === 'trazo') {
        const p = usePistaLibreEditor.getState()
        await p.entrar() // asegura la fila de la pista antes de borrarla
        p.borrarTodo()
        p.salir()
        return 'Borré el trazo libre de la pista.'
      }
      const tipo = que === 'pista' || que === 'riel' || que === 'coaster' ? (que as TipoCamino) : undefined
      const n = await borrarCaminos(tipo)
      return n ? `Borré ${n} tramo${n > 1 ? 's' : ''} del mapa.` : 'No había nada que borrar ahí.'
    }

    case 'editor_infra_carrera': {
      const carrera = useCarrera.getState()
      if (carrera.fase) return 'Ya hay una carrera en marcha.'
      const dif = num(input, 'dificultad')
      if (dif != null) carrera.setDificultad(Math.max(0, Math.min(1, dif)))
      const vueltas = Math.max(1, Math.min(9, Math.round(num(input, 'vueltas') ?? 3)))
      let rival: { id: string; nombre: string; color?: string } | undefined
      if (bool(input, 'rival')) {
        const a = useAsistentes.getState().lista[0]
        if (a) rival = { id: a.id, nombre: a.nombre, color: a.color }
      }
      // `ofrecer` fija fase='previa' de forma SÍNCRONA antes de su await: hay que
      // encadenar `iniciar` en el MISMO tick o CarreraRuntime cancela la previa
      // por estar lejos de la meta (house/carrera.tsx).
      void carrera.ofrecer(null)
      if (!useCarrera.getState().fase) void useCarrera.getState().ofrecer(null, 'libre')
      if (!useCarrera.getState().fase)
        return 'Todavía no hay línea de meta: ponla en Caminos con la herramienta de meta sobre una celda de pista.'
      useCarrera.getState().iniciar(vueltas, rival)
      if (useCarrera.getState().fase === 'previa') {
        useCarrera.getState().cancelar()
        return 'El circuito es demasiado corto: necesita al menos 8 tramos de pista enlazados.'
      }
      return `¡A correr! ${vueltas} vuelta${vueltas > 1 ? 's' : ''}${rival ? ` contra ${rival.nombre}` : ' a contrarreloj'}.`
    }

    case 'editor_infra_montar_tren': {
      const tr = useTren.getState()
      if (tr.montado) return 'Ya vas montado.'
      if (tr.cerca) {
        tr.montar()
        return '¡Arriba! Disfruta el paseo.'
      }
      const p = await posicionInfra('tren')
      if (!p) return 'Aún no hay vías en el mapa: traza unas en Caminos (riel o montaña rusa).'
      useHouse.getState().target.set(p.x, 0, p.z)
      return 'Te llevo caminando a la vía más cercana; al llegar toca «Montar».'
    }

    case 'editor_infra_ir_a': {
      const destino = str(input, 'destino')
      if (!destino) return null
      if (destino === 'cancha') {
        const canchas = useDiseño.getState().objetos.filter((o) => esCancha(o.tipo))
        if (!canchas.length) return 'Aún no tienes ninguna cancha en el mapa.'
        const mejor = canchas.reduce((a, b) => {
          const da = ((a.x ?? 0) - playerPos.x) ** 2 + ((a.z ?? 0) - playerPos.z) ** 2
          const db2 = ((b.x ?? 0) - playerPos.x) ** 2 + ((b.z ?? 0) - playerPos.z) ** 2
          return db2 < da ? b : a
        })
        useHouse.getState().target.set(mejor.x ?? 0, 0, mejor.z ?? 0)
        return 'Vamos a la cancha. Al entrar te pregunto cómo quieres jugar.'
      }
      const p = await posicionInfra(destino as DestinoInfra)
      if (!p) return 'Todavía no hay nada de eso construido en el mapa.'
      useHouse.getState().target.set(p.x, 0, p.z)
      return 'Vamos para allá.'
    }

    // ── Casa e interfaz: música, wrapped y vista de cámara ──
    case 'editor_musica': {
      const aj = useAjustes.getState()
      const accion = str(input, 'accion')
      const mood = str(input, 'mood')
      const vol = num(input, 'volumen')
      const partes: string[] = []
      if (accion === 'apagar') {
        aj.setMusicaAmbiental(false)
        return 'Apagué la música.'
      }
      if (mood && MOODS_MUSICA.includes(mood as MoodMusica)) {
        aj.setMusicaFuente('generada')
        aj.setMusicaMood(mood as MoodMusica)
        partes.push(`ambiente ${mood}`)
      }
      if (vol != null) {
        const v = Math.max(0, Math.min(1, vol))
        aj.setMusicaVolumen(v)
        partes.push(`volumen al ${Math.round(v * 100)}%`)
      }
      if (accion === 'encender' || partes.length) {
        if (!aj.musicaAmbiental) aj.setMusicaAmbiental(true)
        return partes.length ? `Música lista: ${partes.join(', ')}.` : 'Encendí la música ambiental.'
      }
      return null
    }
    case 'editor_wrapped': {
      const p = str(input, 'periodo')
      const periodo = p === 'mes' || p === 'anio' ? p : 'semana'
      useWrappedUi.getState().abrir(periodo)
      return `Abrí tu resumen ${periodo === 'semana' ? 'semanal' : periodo === 'mes' ? 'mensual' : 'anual'}.`
    }
    case 'editor_mascara': {
      useMascaraUi.getState().abrir()
      return 'Abrí la máscara AR: mírate a la cámara.'
    }
    case 'editor_chat_ar': {
      useChatArUi.getState().abrir()
      return 'Abrí el Chat AR: aquí estoy, en tu cámara.'
    }
    case 'editor_vista': {
      const v = str(input, 'vista')
      if (v !== 'iso' && v !== 'tercera' && v !== 'primera') return null
      useCam.getState().setVista(v)
      return v === 'iso'
        ? 'Volví a la vista isométrica.'
        : v === 'tercera'
          ? 'Cambié a tercera persona: arrastra para mirar alrededor.'
          : 'Cambié a primera persona: arrastra para mirar alrededor.'
    }

    // ── Vehículos: montar el más cercano o bajarse ──
    case 'editor_vehiculo': {
      const m = useMontura.getState()
      if (bool(input, 'bajar')) {
        if (!m.tipo) return 'No vas montado en nada ahora mismo.'
        m.solicitarDesmontar()
        return 'Listo, te bajas aquí.'
      }
      const pedido = str(input, 'vehiculo')
      const candidatos = useDiseño
        .getState()
        .objetos.filter(
          (o) =>
            o.id != null &&
            !esObjetoLibreria(o) &&
            esVehiculo(o.tipo) &&
            (!pedido || o.tipo === pedido),
        )
      if (!candidatos.length) {
        const nom = pedido ? VEHICULOS_JUGABLES.find((v) => v.tipo === pedido)?.nombre.toLowerCase() : null
        return nom
          ? `No hay ninguna ${nom} en el mapa: créala desde Editor → Vehículos.`
          : 'No tienes vehículos en el mapa: créalos desde Editor → Vehículos.'
      }
      const cerca = candidatos.reduce((a, b) => {
        const da = ((a.x ?? 0) - playerPos.x) ** 2 + ((a.z ?? 0) - playerPos.z) ** 2
        const db2 = ((b.x ?? 0) - playerPos.x) ** 2 + ((b.z ?? 0) - playerPos.z) ** 2
        return db2 < da ? b : a
      })
      const dist = Math.hypot((cerca.x ?? 0) - playerPos.x, (cerca.z ?? 0) - playerPos.z)
      const nombre = VEHICULOS_JUGABLES.find((v) => v.tipo === cerca.tipo)?.nombre.toLowerCase() ?? 'vehículo'
      if (m.tipo) return 'Ya vas montado: bájate primero para cambiar de vehículo.'
      if (dist <= 2.5) {
        m.montar(cerca)
        return `¡Arriba! Conduce con las flechas o el joystick.`
      }
      useHouse.getState().target.set(cerca.x ?? 0, 0, cerca.z ?? 0)
      return `Te llevo caminando a la ${nombre}; al llegar toca «Subirte».`
    }

    default:
      return null
  }
}

// ───────────────────────── Herramientas para la IA ─────────────────────────

const opciones = (lista: ConNombre[]): string =>
  lista.map((x) => `${x.id} (${x.nombre})`).join(', ')

const enumIds = (lista: ConNombre[]): string[] => lista.map((x) => x.id)

const CUARTO_PROP = {
  type: 'string',
  description: 'Cuarto destino: su id o su nombre (ver la lista de cuartos del system prompt).',
}
const COLOR_PROP = {
  type: 'string',
  description: 'Color en hex (#rrggbb) o un nombre común en español (rojo, azul, verde…).',
}

/** Herramientas de EDICIÓN que ve el modelo (siempre disponibles). */
export const TOOLS_EDITOR: ToolNeutra[] = [
  {
    name: 'editor_crear_cuarto',
    description: 'Crea un cuarto nuevo (vacío) y lo coloca en el mapa.',
    schema: {
      type: 'object',
      properties: {
        nombre: { type: 'string', description: 'Nombre del cuarto (ej. "Estudio")' },
        icono: { type: 'string', description: 'Un emoji para el cuarto (opcional)' },
        color: COLOR_PROP,
        categoria: { type: 'string', enum: ['cuerpo', 'mente', 'complemento', 'config'] },
      },
    },
  },
  {
    name: 'editor_renombrar_cuarto',
    description: 'Cambia el nombre de un cuarto existente.',
    schema: {
      type: 'object',
      properties: { cuarto: CUARTO_PROP, nombre: { type: 'string', description: 'Nuevo nombre' } },
      required: ['cuarto', 'nombre'],
    },
  },
  {
    name: 'editor_icono_cuarto',
    description: 'Cambia el emoji/ícono de un cuarto.',
    schema: {
      type: 'object',
      properties: { cuarto: CUARTO_PROP, icono: { type: 'string', description: 'Un emoji' } },
      required: ['cuarto', 'icono'],
    },
  },
  {
    name: 'editor_categoria_cuarto',
    description: 'Cambia la categoría de un cuarto.',
    schema: {
      type: 'object',
      properties: {
        cuarto: CUARTO_PROP,
        categoria: { type: 'string', enum: ['cuerpo', 'mente', 'complemento', 'config'] },
      },
      required: ['cuarto', 'categoria'],
    },
  },
  {
    name: 'editor_eliminar_cuarto',
    description: 'Elimina un cuarto por completo (borra el cuarto y su contenido).',
    schema: { type: 'object', properties: { cuarto: CUARTO_PROP }, required: ['cuarto'] },
  },
  {
    name: 'editor_pintar_cuarto',
    description: 'Cambia el color de un cuarto (se ve en el modelo 3D).',
    schema: {
      type: 'object',
      properties: { cuarto: CUARTO_PROP, color: COLOR_PROP },
      required: ['cuarto', 'color'],
    },
  },
  {
    name: 'editor_piso_cuarto',
    description: `Cambia el material del piso de un cuarto. Opciones: ${opciones(PISOS)}.`,
    schema: {
      type: 'object',
      properties: { cuarto: CUARTO_PROP, piso: { type: 'string', enum: enumIds(PISOS) } },
      required: ['cuarto', 'piso'],
    },
  },
  {
    name: 'editor_piso_color_cuarto',
    description: 'Pinta el piso de un cuarto de un color sólido.',
    schema: {
      type: 'object',
      properties: { cuarto: CUARTO_PROP, color: COLOR_PROP },
      required: ['cuarto', 'color'],
    },
  },
  {
    name: 'editor_techo_cuarto',
    description: `Cambia el material del techo de un cuarto. Opciones: ${opciones(TECHOS)}.`,
    schema: {
      type: 'object',
      properties: { cuarto: CUARTO_PROP, techo: { type: 'string', enum: enumIds(TECHOS) } },
      required: ['cuarto', 'techo'],
    },
  },
  {
    name: 'editor_techo_color_cuarto',
    description: 'Pinta (tinta) el techo de un cuarto.',
    schema: {
      type: 'object',
      properties: { cuarto: CUARTO_PROP, color: COLOR_PROP },
      required: ['cuarto', 'color'],
    },
  },
  {
    name: 'editor_techo_forma_cuarto',
    description: `Cambia la forma del techo de un cuarto. Opciones: ${opciones(TECHO_FORMAS)}.`,
    schema: {
      type: 'object',
      properties: { cuarto: CUARTO_PROP, forma: { type: 'string', enum: enumIds(TECHO_FORMAS) } },
      required: ['cuarto', 'forma'],
    },
  },
  {
    name: 'editor_crear_objeto',
    description: `Crea un objeto/decoración del catálogo en un cuarto. Tipos: ${Object.keys(OBJETOS).join(', ')}.`,
    schema: {
      type: 'object',
      properties: {
        tipo: { type: 'string', enum: Object.keys(OBJETOS) },
        cuarto: { type: 'string', description: 'Cuarto destino (opcional; si falta, el más cercano).' },
      },
      required: ['tipo'],
    },
  },
  {
    name: 'editor_avatar_color',
    description: 'Cambia el color de una parte del personaje principal.',
    schema: {
      type: 'object',
      properties: {
        parte: { type: 'string', enum: ['cabeza', 'torso', 'piernas'] },
        color: COLOR_PROP,
      },
      required: ['parte', 'color'],
    },
  },
  {
    name: 'editor_avatar_tamano',
    description: `Cambia el tamaño del personaje principal (${ESCALA_MIN}–${ESCALA_MAX}, 1 = normal).`,
    schema: {
      type: 'object',
      properties: { escala: { type: 'number', description: `Escala entre ${ESCALA_MIN} y ${ESCALA_MAX}` } },
      required: ['escala'],
    },
  },
  {
    name: 'editor_avatar_prenda',
    description: `Pone o quita una prenda al personaje principal. Prendas: ${opciones(PRENDAS)}.`,
    schema: {
      type: 'object',
      properties: {
        prenda: { type: 'string', enum: enumIds(PRENDAS) },
        color: COLOR_PROP,
        quitar: { type: 'boolean', description: 'true para quitar la prenda en vez de ponerla' },
      },
      required: ['prenda'],
    },
  },
  {
    name: 'editor_tema',
    description: `Aplica un tema estacional global a toda la casa (o "ninguno" para quitarlo). Temas: ${opciones(TEMAS)}.`,
    schema: {
      type: 'object',
      properties: { tema: { type: 'string', enum: [...enumIds(TEMAS), 'ninguno'] } },
      required: ['tema'],
    },
  },
  {
    name: 'editor_fondo',
    description: `Cambia el fondo del cielo de la escena. Opciones: ${opciones(FONDOS)}.`,
    schema: {
      type: 'object',
      properties: { fondo: { type: 'string', enum: enumIds(FONDOS) } },
      required: ['fondo'],
    },
  },
  {
    name: 'editor_animaciones_fondo',
    description:
      'Activa o desactiva las microanimaciones del fondo (cometas, nieve, nubes, etc.). ' +
      'Opcionalmente ajusta su intensidad de 0 a 100.',
    schema: {
      type: 'object',
      properties: { activo: { type: 'boolean' }, intensidad: { type: 'number' } },
      required: ['activo'],
    },
  },
  {
    name: 'editor_idioma',
    // El enum sale del catálogo: añadir un idioma no obliga a tocar la tool.
    description: `Cambia el idioma de la app (${IDIOMAS.map((i) => `${i.id} = ${i.nombreIA}`).join(', ')}).`,
    schema: {
      type: 'object',
      properties: { idioma: { type: 'string', enum: IDIOMAS.map((i) => i.id) } },
      required: ['idioma'],
    },
  },
  {
    name: 'editor_tema_interfaz',
    description: `Cambia el tema visual de la interfaz (menús/paneles). Opciones: ${opciones(TEMAS_UI)}.`,
    schema: {
      type: 'object',
      properties: { tema: { type: 'string', enum: enumIds(TEMAS_UI) } },
      required: ['tema'],
    },
  },
  {
    name: 'editor_tipografia',
    description: `Cambia la tipografía de la interfaz. Opciones: ${opciones(TIPOGRAFIAS)}.`,
    schema: {
      type: 'object',
      properties: { tipografia: { type: 'string', enum: enumIds(TIPOGRAFIAS) } },
      required: ['tipografia'],
    },
  },
  {
    name: 'editor_apariencia',
    description:
      'Ajusta la apariencia de la interfaz: modo claro/oscuro/transparente, estilo de iconos (emojis o SVG profesionales) y el vidrio de los paneles flotantes (transparencia y desenfoque). Se pueden combinar varios campos.',
    schema: {
      type: 'object',
      properties: {
        modo: { type: 'string', enum: MODOS_UI },
        iconos: { type: 'string', enum: ['emoji', 'profesional'] },
        transparencia: { type: 'number', description: 'Transparencia del vidrio 0–1.' },
        intensidad: { type: 'number', description: 'Desenfoque del vidrio 0–1.' },
      },
    },
  },
  {
    name: 'editor_estilo_mapa',
    description: `Cambia el estilo de render del mapa 3D (se guarda por tema) o enciende/apaga los efectos visuales. Estilos: ${opciones(ESTILOS)}.`,
    schema: {
      type: 'object',
      properties: {
        estilo: { type: 'string', enum: enumIds(ESTILOS) },
        efectos: { type: 'boolean', description: 'true/false para encender o apagar los efectos visuales.' },
      },
    },
  },
  {
    name: 'editor_notificaciones',
    description:
      'Enciende o apaga los avisos de la app: todos ("todo"), los de rutinas del calendario, los de metas del día o los del resumen Wrapped. Con `hora` fija a qué hora avisar de las metas (HH:MM).',
    schema: {
      type: 'object',
      properties: {
        que: { type: 'string', enum: ['todo', 'rutinas', 'metas', 'wrapped'] },
        activo: { type: 'boolean' },
        hora: { type: 'string', description: 'Hora del aviso de metas en formato HH:MM.' },
      },
      required: ['activo'],
    },
  },
  {
    name: 'editor_respaldo',
    description:
      'Descarga un respaldo (JSON) con todos los datos del dispositivo. Restaurar o borrar datos NO se hace por chat: eso se toca a mano en Configuraciones → Respaldo de datos.',
    schema: { type: 'object', properties: {} },
  },
  {
    name: 'editor_bienvenida',
    description: 'Vuelve a abrir el menú de bienvenida (el de la primera vez). No duplica cuartos.',
    schema: { type: 'object', properties: {} },
  },
  {
    name: 'editor_ajustes_abrir',
    description: `Abre el Editor en la pestaña Configuraciones, opcionalmente desplegando un grupo: ${opciones(GRUPOS_CONFIG)}. Úsalo cuando el ajuste que pide el usuario no tenga tool propia (por ejemplo iniciar sesión o restaurar datos).`,
    schema: {
      type: 'object',
      properties: { grupo: { type: 'string', enum: enumIds(GRUPOS_CONFIG) } },
    },
  },
  {
    name: 'editor_forma_cuarto',
    description: 'Cambia la forma/silueta de un cuarto (aplica a todas sus celdas).',
    schema: {
      type: 'object',
      properties: { cuarto: CUARTO_PROP, forma: { type: 'string', enum: ['cuadrado', 'circular', 'triangular'] } },
      required: ['cuarto', 'forma'],
    },
  },
  {
    name: 'editor_crecer_cuarto',
    description: 'Agranda un cuarto una celda hacia un espacio libre adyacente.',
    schema: { type: 'object', properties: { cuarto: CUARTO_PROP }, required: ['cuarto'] },
  },
  {
    name: 'editor_encoger_cuarto',
    description: 'Encoge un cuarto una celda (sin partirlo).',
    schema: { type: 'object', properties: { cuarto: CUARTO_PROP }, required: ['cuarto'] },
  },
  {
    name: 'editor_muro',
    description: 'Abre, cierra o pone una puerta en un lado (pared exterior) de un cuarto.',
    schema: {
      type: 'object',
      properties: {
        cuarto: CUARTO_PROP,
        lado: { type: 'string', enum: ['norte', 'sur', 'este', 'oeste'] },
        estado: { type: 'string', enum: ['abierto', 'pared', 'puerta'] },
      },
      required: ['cuarto', 'lado', 'estado'],
    },
  },
  {
    name: 'editor_mover_cuarto',
    description: 'Mueve un cuarto una celda en una dirección (si hay espacio libre).',
    schema: {
      type: 'object',
      properties: { cuarto: CUARTO_PROP, direccion: { type: 'string', enum: ['norte', 'sur', 'este', 'oeste'] } },
      required: ['cuarto', 'direccion'],
    },
  },
  {
    name: 'editor_apilar_cuarto',
    description: 'Apila un cuarto encima de otro (crea/usa un segundo piso) con un acceso.',
    schema: {
      type: 'object',
      properties: {
        cuarto: CUARTO_PROP,
        base: { type: 'string', description: 'Cuarto base (el de abajo): id o nombre.' },
        acceso: { type: 'string', enum: ['escalera', 'elevador', 'resbaladilla'] },
      },
      required: ['cuarto', 'base'],
    },
  },
  {
    name: 'editor_redimensionar_mapa',
    description: 'Agranda o encoge la rejilla del mapa por un lado.',
    schema: {
      type: 'object',
      properties: {
        accion: { type: 'string', enum: ['agrandar', 'encoger'] },
        direccion: { type: 'string', enum: ['norte', 'sur', 'este', 'oeste'] },
      },
      required: ['accion'],
    },
  },
  {
    name: 'editor_objeto_color',
    description: 'Cambia el color del último objeto creado (opcional: de un cuarto o tipo).',
    schema: {
      type: 'object',
      properties: { color: COLOR_PROP, cuarto: { type: 'string' }, tipo: { type: 'string' } },
      required: ['color'],
    },
  },
  {
    name: 'editor_objeto_tamano',
    description: 'Cambia el tamaño del último objeto creado (0.3–3).',
    schema: {
      type: 'object',
      properties: { escala: { type: 'number' }, cuarto: { type: 'string' }, tipo: { type: 'string' } },
      required: ['escala'],
    },
  },
  {
    name: 'editor_objeto_rotar',
    description: 'Gira el último objeto creado (grados; por defecto 90).',
    schema: {
      type: 'object',
      properties: { grados: { type: 'number' }, cuarto: { type: 'string' }, tipo: { type: 'string' } },
    },
  },
  {
    name: 'editor_eliminar_objeto',
    description: 'Elimina el último objeto creado (opcional: de un cuarto o tipo).',
    schema: { type: 'object', properties: { cuarto: { type: 'string' }, tipo: { type: 'string' } } },
  },
  {
    name: 'editor_muro_estilo',
    description: `Cambia el estilo de un lado (pared/puerta) de un cuarto: tipo de muro (${TIPOS_MURO.map((t) => `${t.id} (${t.nombre})`).join(', ')}), color, grosor, alto, o tipo de puerta (${TIPOS_PUERTA.map((t) => `${t.id} (${t.nombre})`).join(', ')}).`,
    schema: {
      type: 'object',
      properties: {
        cuarto: CUARTO_PROP,
        lado: { type: 'string', enum: ['norte', 'sur', 'este', 'oeste'] },
        tipo: { type: 'string', enum: TIPOS_MURO.map((t) => t.id) },
        color: COLOR_PROP,
        grosor: { type: 'string', description: 'grueso | delgado | factor numérico (1 = normal)' },
        alto: { type: 'string', description: 'alto | bajo | factor numérico (1 = normal)' },
        puerta: { type: 'string', enum: TIPOS_PUERTA.map((t) => t.id) },
      },
      required: ['cuarto', 'lado'],
    },
  },
  {
    name: 'editor_agrupar_objetos',
    description: 'Agrupa todos los objetos de un cuarto para tratarlos como uno (moverlos juntos).',
    schema: { type: 'object', properties: { cuarto: CUARTO_PROP }, required: ['cuarto'] },
  },
  {
    name: 'editor_desagrupar_objetos',
    description: 'Deshace la agrupación de los objetos de un cuarto.',
    schema: { type: 'object', properties: { cuarto: CUARTO_PROP }, required: ['cuarto'] },
  },
  {
    name: 'editor_abrir_app',
    description:
      'Abre un cuarto o una app de la casa, y opcionalmente una sección interna o un juego. Úsala cuando el usuario pida entrar/abrir/jugar algo («abre el recetario», «quiero jugar la viborita»).',
    schema: {
      type: 'object',
      properties: {
        app: {
          type: 'string',
          description:
            'App a abrir: su id o nombre (cocina, ejercicio, descanso, despacho, biblioteca, entretenimiento, sala, jardin, garage, diario, hobbies, anecdotario, idiomas…).',
        },
        cuarto: CUARTO_PROP,
        seccion: {
          type: 'string',
          description:
            'Pestaña interna de la app (p. ej. recetas, compras, mercados, plan, mesa, repaso…).',
        },
        dato: {
          type: 'string',
          description:
            'Dato de la sección: para juegos de mesa el id del juego (viborita, tetris, ajedrez, sudoku, damas, pong…). Requiere app=entretenimiento y seccion=mesa.',
        },
      },
    },
  },
  {
    name: 'editor_abrir_calendario',
    description:
      'Abre el calendario de la casa (el del reloj: no vive en ningún cuarto). Úsala cuando el usuario pida su calendario, su agenda del día o de la semana, o las misiones que le tocan hoy. OJO: sus metas y planes NO están aquí — para eso se abre el cuarto «Metas» con editor_abrir_app.',
    schema: {
      type: 'object',
      properties: {
        vista: {
          type: 'string',
          enum: ['dia', 'semana', 'mes', 'anio', 'objetivos'],
          description:
            'Con qué vista abrirlo. «objetivos» son las Misiones: la checklist de hoy de todas las apps juntas. Por defecto, semana.',
        },
      },
    },
  },

  // ── Ideas: mapas conceptuales ──
  {
    name: 'editor_mapa_ideas',
    description: `Dibuja un mapa conceptual en la app Ideas a partir de un tema y lo abre en su lienzo. Úsala cuando el usuario pida un mapa mental, un mapa conceptual, un esquema o un diagrama de algo, cuando quiera «organizar» o «dibujar» un tema, o cuando acepte el mapa que le ofreciste al final de una explicación. Elige tú el formato que mejor le vaya al tema: ${TIPOS_MAPA.map((d) => `${d.id} (${d.descripcionEs})`).join(' ')}. El contenido lo redacta la IA, así que tarda unos segundos: llámala SOLA.`,
    schema: {
      type: 'object',
      properties: {
        tema: {
          type: 'string',
          description:
            'Tema del mapa, concreto y en el idioma del usuario (ej. "la fotosíntesis", "café de olla vs. espresso", "cómo hacer pan"). Si viene de una explicación tuya, resúmela aquí en pocas palabras.',
        },
        tipo: {
          type: 'string',
          enum: TIPOS_MAPA.map((d) => d.id),
          description: 'Formato del mapa. Por defecto mental.',
        },
        vacio: {
          type: 'boolean',
          description: 'true para crear el mapa en blanco (solo la raíz) y que el usuario lo llene a mano.',
        },
      },
      required: ['tema'],
    },
  },

  // ── Infraestructura del mapa ──
  {
    name: 'editor_paintball',
    description: `Modo paintball: el usuario contra sus asistentes usando la casa como campo de batalla (cada quien aguanta ${VIDAS_PAINTBALL} bolazos). Sin "modo" abre el menú de batalla para que elija; con "modo" arma los equipos y arranca la cuenta atrás. Se juega en la planta baja.`,
    schema: {
      type: 'object',
      properties: {
        modo: {
          type: 'string',
          enum: ['1v1', '2v2', 'royale'],
          description:
            '1v1 = contra un asistente; 2v2 = con un asistente de compañero (necesita 3 asistentes); royale = batalla campal, todos contra todos. Omitir para abrir el menú.',
        },
        rival: {
          type: 'string',
          description:
            'Nombre del asistente que el usuario quiere de rival (o de compañero en 2v2). Omitir = al azar.',
        },
        dificultad: { type: 'number', description: 'Puntería de los bots, de 0 (muy fácil) a 1 (experto).' },
        vista: { type: 'string', enum: ['primera', 'tercera'], description: 'Vista con la que se combate.' },
        salir: { type: 'boolean', description: 'true para cerrar el paintball (menú o batalla) y volver a la casa.' },
      },
    },
  },
  {
    name: 'editor_infra_construir',
    description:
      'Abre el editor de una construcción del MAPA exterior con la herramienta ya elegida, para que el usuario la dibuje tocando las celdas. Úsala cuando pida construir/hacer/empezar un huerto, una granja, un corral, una pista de carreras, vías de tren o una montaña rusa. IMPORTANTE: abre un editor a pantalla completa que cierra el chat, así que llámala SOLA (nunca junto a otras tools).',
    schema: {
      type: 'object',
      properties: {
        obra: { type: 'string', enum: ['huerto', 'granja', 'caminos', 'canchas'] },
        herramienta: {
          type: 'string',
          description:
            'Herramienta a preseleccionar. huerto: parcela|sembrar|regar|cosechar|aspersor|quitar. granja: corral|animal|alimentar|mimar|curar|limpiar|accesorio|nombrar|quitar. caminos: pintar|borrar|subir|bajar|meta.',
        },
        especie: {
          type: 'string',
          enum: enumIds(LISTA_ESPECIES),
          description: 'Solo obra=huerto: qué sembrar.',
        },
        animal: {
          type: 'string',
          enum: enumIds(LISTA_ANIMALES),
          description: 'Solo obra=granja: qué animal poner.',
        },
        via: {
          type: 'string',
          enum: ['pista', 'riel', 'coaster'],
          description: 'Solo obra=caminos: pista de carreras, vías de tren o montaña rusa.',
        },
        clase: { type: 'string', enum: enumIds(LISTA_CANCHAS), description: 'Solo obra=canchas.' },
      },
      required: ['obra'],
    },
  },
  {
    name: 'editor_infra_cancha',
    description: `Coloca una cancha deportiva terminada en el mapa, junto al avatar (no hace falta pedir coordenadas). Opciones: ${opciones(LISTA_CANCHAS)}. Para jugar, el usuario camina dentro.`,
    schema: {
      type: 'object',
      properties: {
        clase: { type: 'string', enum: enumIds(LISTA_CANCHAS) },
        color: COLOR_PROP,
        escala: { type: 'number', description: 'Tamaño 0.5–2 (1 = normal).' },
      },
      required: ['clase'],
    },
  },
  {
    name: 'editor_infra_huerto_accion',
    description:
      'Cuida TODO el huerto de una vez, sin abrir el editor: regar los cultivos en crecimiento, o cosechar las parcelas listas (lo cosechado va a la cesta, que alimenta a la granja).',
    schema: {
      type: 'object',
      properties: { accion: { type: 'string', enum: ['regar', 'cosechar'] } },
      required: ['accion'],
    },
  },
  {
    name: 'editor_infra_granja_accion',
    description:
      'Cuida a TODOS los animales de la granja sin abrir el editor: alimentarlos (consume cosechas de la cesta), mimarlos (sube su ánimo), curar a los enfermos (los que llevan mucho sin comer; si no se curan, mueren) o limpiar los corrales (toca una vez por semana o el ánimo cae al doble).',
    schema: {
      type: 'object',
      properties: { accion: { type: 'string', enum: ['alimentar', 'mimar', 'curar', 'limpiar'] } },
      required: ['accion'],
    },
  },
  {
    name: 'editor_infra_borrar',
    description:
      'Borra del mapa la pista de carreras, las vías de tren, la montaña rusa, todos los caminos, o el trazo libre de la pista.',
    schema: {
      type: 'object',
      properties: { que: { type: 'string', enum: ['pista', 'riel', 'coaster', 'caminos', 'trazo'] } },
      required: ['que'],
    },
  },
  {
    name: 'editor_infra_carrera',
    description:
      'Arranca una carrera en la pista: lleva al avatar a la línea de meta con un vehículo prestado y da el banderazo. Requiere una pista con línea de meta ya trazada.',
    schema: {
      type: 'object',
      properties: {
        vueltas: { type: 'number', description: 'Vueltas al circuito (1–9; por defecto 3).' },
        rival: { type: 'boolean', description: 'true para correr contra un asistente en vez de contrarreloj.' },
        dificultad: { type: 'number', description: 'Nivel del rival, de 0 (muy fácil) a 1 (experto).' },
      },
    },
  },
  {
    name: 'editor_infra_montar_tren',
    description:
      'Sube al avatar al tren o a la montaña rusa. Si no hay vía al alcance, lo manda caminando a la más cercana.',
    schema: { type: 'object', properties: {} },
  },
  {
    name: 'editor_infra_ir_a',
    description:
      'Manda al avatar caminando hasta una construcción del mapa (el huerto, la granja, una cancha, la pista o la línea de meta).',
    schema: {
      type: 'object',
      properties: { destino: { type: 'string', enum: ['huerto', 'granja', 'cancha', 'pista', 'meta', 'tren'] } },
      required: ['destino'],
    },
  },

  // ── Casa e interfaz: música, wrapped, vista y vehículos ──
  {
    name: 'editor_musica',
    description: `Controla la música ambiental de la casa: encenderla, apagarla, cambiar el ambiente de la música generada o ajustar el volumen. Ambientes: ${MOODS_MUSICA.join(', ')}.`,
    schema: {
      type: 'object',
      properties: {
        accion: { type: 'string', enum: ['encender', 'apagar'] },
        mood: { type: 'string', enum: MOODS_MUSICA, description: 'Ambiente de la música generada (enciende la música si estaba apagada).' },
        volumen: { type: 'number', description: 'Volumen maestro 0–1 (0.5 = medio).' },
      },
    },
  },
  {
    name: 'editor_wrapped',
    description:
      'Abre el Wrapped: el resumen visual de la actividad del usuario en un periodo (semana, mes o año), estilo "stories".',
    schema: {
      type: 'object',
      properties: { periodo: { type: 'string', enum: ['semana', 'mes', 'anio'] } },
    },
  },
  {
    name: 'editor_mascara',
    description:
      'Abre la máscara AR: la cámara frontal con la cabeza del avatar puesta sobre la cara del usuario (para verse y grabarse).',
    schema: { type: 'object', properties: {} },
  },
  {
    name: 'editor_chat_ar',
    description:
      'Abre el Chat AR: la cámara del dispositivo con el asistente 3D encima, para conversar con él cara a cara por voz o texto.',
    schema: { type: 'object', properties: {} },
  },
  {
    name: 'editor_vista',
    description:
      'Cambia la vista de la cámara: iso (isométrica clásica), tercera (tercera persona siguiendo al personaje) o primera (primera persona).',
    schema: {
      type: 'object',
      properties: { vista: { type: 'string', enum: ['iso', 'tercera', 'primera'] } },
      required: ['vista'],
    },
  },
  {
    name: 'editor_vehiculo',
    description: `Monta al usuario en un vehículo del mapa (camina hasta él si está lejos) o lo baja del actual. Vehículos: ${opciones(LISTA_VEHICULOS)}. El OVNI vuela con Space/Shift.`,
    schema: {
      type: 'object',
      properties: {
        vehiculo: { type: 'string', enum: enumIds(LISTA_VEHICULOS), description: 'Omitir = el vehículo más cercano.' },
        bajar: { type: 'boolean', description: 'true para bajarse del vehículo actual.' },
      },
    },
  },
]

// ───────────────────────── Capa determinista (sin IA) ─────────────────────────
// `hayIntencionEditor` (el gate que decide si este módulo hace falta) vive en
// `editorIntencion.ts`: tiene que poder evaluarse SIN descargar este archivo.

export interface EdicionLocal {
  /** Resumen corto para el chip y el placeholder. */
  resumen: string
  /** Tool que ejecuta (para derivar el chip de destino del mensaje). */
  tool: string
  /** Ejecuta la acción (reusa el mismo despacho que la IA). */
  ejecutar: () => Promise<string>
  /** Atajo de respaldo: con la IA activa el ChatBox lo ignora (ella lo hace mejor). */
  soloSinIA?: boolean
}

/** Envuelve un `(name, input)` en una EdicionLocal con su resumen. */
function edicion(resumen: string, name: string, input: Record<string, unknown>): EdicionLocal {
  return {
    resumen,
    tool: name,
    ejecutar: async () => (await ejecutarToolEditor(name, input)) ?? 'No pude completar esa edición.',
  }
}

/**
 * Interpreta una orden de edición SIN IA. Estricta a propósito (verbo imperativo
 * + valor resoluble) para no secuestrar registros de bitácora como "pinté la sala".
 * Devuelve null si no es una orden de edición clara (entonces la IA o la captura
 * normal se encargan).
 */
export function interpretarEdicionLocal(texto: string): EdicionLocal | null {
  const limpio = texto.trim()
  if (!limpio) return null
  const n = normalizar(limpio)

  // 1. Crear cuarto: "crea un cuarto (llamado) X"
  const crear = /^(?:crea(?:r|me)?|nuevo)\s+(?:un[ao]?\s+)?(?:cuarto|habitaci[oó]n|recamara|rec[aá]mara|oficina|estudio|sala)\b\s*(?:llamad[oa]|de nombre|con nombre|:)?\s*(.*)$/i.exec(limpio)
  if (crear) {
    const nombre = crear[1].replace(/^["']|["']$/g, '').trim()
    return edicion(`✏️ Crear cuarto${nombre ? ` «${nombre}»` : ''}`, 'editor_crear_cuarto', { nombre })
  }

  // 2. Renombrar cuarto: "renombra X a Y" / "cambia el nombre de X a Y"
  const renom = /^(?:renombra(?:r)?|cambia(?:le)?\s+el\s+nombre\s+(?:de|del)?|pon(?:le)?\s+(?:de\s+)?nombre)\s+(.+?)\s+(?:a|como|por)\s+["']?(.+?)["']?$/i.exec(limpio)
  if (renom) {
    const cu = resolverCuarto(renom[1])
    if (cu) return edicion(`✏️ Renombrar a «${renom[2].trim()}»`, 'editor_renombrar_cuarto', { cuarto: cu.id, nombre: renom[2].trim() })
  }

  // 3. Idioma (antes que "tema", por si dicen "interfaz")
  if (/\b(idioma|language)\b/.test(n) || /\b(al?|en)\s+(ingles|english|espanol|spanish|castellano)\b/.test(n)) {
    if (/\bingl|english\b/.test(n)) return edicion('✏️ Idioma: inglés', 'editor_idioma', { idioma: 'en' })
    if (/\bespanol|spanish|castellano\b/.test(n)) return edicion('✏️ Idioma: español', 'editor_idioma', { idioma: 'es' })
  }

  // 4. Tema / tipografía de la INTERFAZ (más específico que el tema 3D)
  if (/\b(interfaz|tema ui)\b/.test(n)) {
    const tui = resolverPorNombre(TEMAS_UI, limpio)
    if (tui) return edicion(`✏️ Interfaz: ${tui.nombre}`, 'editor_tema_interfaz', { tema: tui.id })
  }
  if (/\b(tipografia|tipograf[ií]a|fuente|letra)\b/.test(n)) {
    const tip = resolverPorNombre(TIPOGRAFIAS, limpio)
    if (tip) return edicion(`✏️ Tipografía: ${tip.nombre}`, 'editor_tipografia', { tipografia: tip.id })
  }

  // ── Configuraciones (pestaña del editor) ──
  // Van ANTES del tema estacional: «tema oscuro» es la apariencia de la
  // interfaz, no el tema 3D de la casa. Todas exigen su sustantivo propio
  // (apariencia, iconos, vidrio, efectos, avisos, respaldo…), así que no le
  // roban nada a las reglas de abajo.

  // C-0. Abrir la pestaña Configuraciones (opcionalmente en un grupo). Va la
  //      PRIMERA: «abre las configuraciones de notificaciones» pide el menú, no
  //      encender los avisos.
  if (
    /\b(configuracion(es)?|ajustes|preferencias)\b/.test(n) &&
    /\b(abre|abrir|abreme|muestra|muestrame|mostrar|ensena|ensename|entra|entrar|llevame|vamos|ve|quiero|dame)\b/.test(n)
  ) {
    const grupo = /\b(cuenta|sesion|login|plan|suscripcion)\b/.test(n)
      ? 'cuenta'
      : /\b(estilo|efectos?|render)\b/.test(n)
        ? 'estilo'
        : /\b(musica|volumen)\b/.test(n)
          ? 'musica'
          : /\b(tutorial(es)?|bienvenida)\b/.test(n)
            ? 'tutoriales'
            : /\b(notificacion(es)?|avisos?)\b/.test(n)
              ? 'notificaciones'
              : /\b(respaldo|backup|datos)\b/.test(n)
                ? 'respaldo'
                : /\b(interfaz|idioma|apariencia|tema|tipografia)\b/.test(n)
                  ? 'interfaz'
                  : undefined
    return edicion('⚙️ Abrir Configuraciones', 'editor_ajustes_abrir', grupo ? { grupo } : {})
  }

  // C-0b. Cuenta: iniciar sesión / ver el plan (no se hace por chat, se abre).
  if (
    /\b(cuenta|sesion|suscripcion|plan pro)\b/.test(n) &&
    /\b(inicia|iniciar|entra|entrar|abre|abrir|muestra|mostrar|ver|crea|crear|registrar|registrarme)\b/.test(n)
  ) {
    return edicion('⚙️ Abrir Cuenta', 'editor_ajustes_abrir', { grupo: 'cuenta' })
  }

  // C-1. Apariencia: modo claro / oscuro / transparente.
  if (
    /\b(modo|apariencia|interfaz|tema|app|aplicacion)\b/.test(n) &&
    !/\b(fondo|cielo|casa)\b/.test(n)
  ) {
    const modo = /\boscur/.test(n)
      ? 'oscuro'
      : /\bclar[oa]\b/.test(n)
        ? 'claro'
        : /\btransparent/.test(n)
          ? 'transparente'
          : null
    if (modo) return edicion(`✏️ Modo ${modo}`, 'editor_apariencia', { modo })
  }

  // C-2. Estilo de iconos (emojis o SVG profesionales). Sin emoji suelto en el
  //      texto: «cambia el ícono de la cocina a 🍳» es otra regla.
  if (/\bicono?s?\b/.test(n) || /\bemojis?\b/.test(n)) {
    if (!/(\p{Extended_Pictographic})/u.test(limpio)) {
      const iconos = /\bemojis?\b/.test(n)
        ? 'emoji'
        : /\b(profesional(es)?|svg|minimalista|serios?)\b/.test(n)
          ? 'profesional'
          : null
      if (iconos) return edicion(`✏️ Iconos: ${iconos}`, 'editor_apariencia', { iconos })
    }
  }

  // C-3. Vidrio de los paneles: transparencia y desenfoque.
  if (/\b(vidrio|transparencia|desenfoque|difuminado|blur)\b/.test(n)) {
    const campo = /\b(desenfoque|difuminado|blur|intensidad)\b/.test(n) ? 'intensidad' : 'transparencia'
    const aj = useAjustes.getState()
    const actual = campo === 'intensidad' ? aj.vidrioIntensidad : aj.vidrioTransparencia
    const pct = /(\d{1,3})\s*%/.exec(n)
    const v = pct
      ? Math.max(0, Math.min(100, parseInt(pct[1], 10))) / 100
      : /\b(sube|subir|mas|aumenta|aumentar)\b/.test(n)
        ? Math.min(1, actual + 0.15)
        : /\b(baja|bajar|menos|reduce|reducir|quita|quitar)\b/.test(n)
          ? Math.max(0, actual - 0.15)
          : null
    if (v != null) {
      const et = campo === 'intensidad' ? 'Desenfoque' : 'Transparencia'
      return edicion(`✏️ ${et} al ${Math.round(v * 100)}%`, 'editor_apariencia', { [campo]: v })
    }
  }

  // C-4. Estilo visual del mapa 3D y sus efectos.
  if (/\b(estilo|render|efectos?)\b/.test(n)) {
    if (/\befectos?\b/.test(n)) {
      if (/\b(apaga|apagar|quita|quitar|desactiva|desactivar|sin)\b/.test(n))
        return edicion('✏️ Efectos apagados', 'editor_estilo_mapa', { efectos: false })
      if (/\b(activa|activar|enciende|encender|prende|pon|poner|quiero)\b/.test(n))
        return edicion('✏️ Efectos activados', 'editor_estilo_mapa', { efectos: true })
    }
    const est = resolverPorNombre(ESTILOS, limpio, {
      comic: ['caricatura', 'cartoon'],
      miniatura: ['maqueta', 'juguete'],
      retro: ['pixel', 'pixelado', 'pixeles'],
      normal: ['ninguno'],
    })
    if (est) return edicion(`✏️ Estilo ${est.nombre.toLowerCase()}`, 'editor_estilo_mapa', { estilo: est.id })
  }

  // C-5. Notificaciones: general, rutinas, metas, resumen y hora de las metas.
  // «recordatorio» queda fuera a propósito: «ponme un recordatorio de…» es una
  // rutina del calendario, no el interruptor de avisos.
  if (/\b(notificacion(es)?|avisos?|avisame|alertas?)\b/.test(n)) {
    const apagar = /\b(apaga|apagar|desactiva|desactivar|quita|quitar|silencia|silenciar|deja de|ya no|no me|sin)\b/.test(n)
    const que = /\b(rutinas?|calendario)\b/.test(n)
      ? 'rutinas'
      : /\bmetas?\b/.test(n)
        ? 'metas'
        : /\b(wrapped|resumen(es)?|retrospectiva)\b/.test(n)
          ? 'wrapped'
          : 'todo'
    const hm = /\ba\s+las\s+(\d{1,2})(?::(\d{2}))?/.exec(n)
    if (hm && que === 'metas' && !apagar) {
      const hora = `${hm[1].padStart(2, '0')}:${hm[2] ?? '00'}`
      return edicion(`🔔 Avisar metas a las ${hora}`, 'editor_notificaciones', { que, activo: true, hora })
    }
    const et = que === 'todo' ? 'avisos' : que === 'wrapped' ? 'avisos del resumen' : `avisos de ${que}`
    return edicion(`${apagar ? '🔕 Apagar' : '🔔 Encender'} ${et}`, 'editor_notificaciones', {
      que,
      activo: !apagar,
    })
  }

  // C-6. Respaldo de datos: exportar por chat; restaurar/borrar solo a mano.
  if (/\b(respald(o|a|ame|ar)|backup|copia de seguridad)\b/.test(n) || (/\bexporta/.test(n) && /\b(datos|todo)\b/.test(n))) {
    if (/\b(restaura|restaurar|importa|importar|borra|borrar|elimina|eliminar)\b/.test(n))
      return edicion('⚙️ Abrir Respaldo de datos', 'editor_ajustes_abrir', { grupo: 'respaldo' })
    return edicion('💾 Descargar respaldo', 'editor_respaldo', {})
  }

  // C-7. Bienvenida: volver a ver el menú de la primera vez.
  if (/\bbienvenida\b/.test(n) && /\b(ver|vuelve|volver|abre|abrir|muestra|mostrar|repite|repetir|otra vez)\b/.test(n)) {
    return edicion('👋 Abrir la bienvenida', 'editor_bienvenida', {})
  }

  // 5. Tema estacional global
  if (/\b(tema|ambiente|estilo)\b/.test(n)) {
    if (/\b(quita|quitar|sin|ninguno|nada)\b/.test(n)) return edicion('✏️ Quitar tema', 'editor_tema', { tema: 'ninguno' })
    const tema = resolverPorNombre(TEMAS, limpio)
    if (tema) return edicion(`✏️ Tema: ${tema.nombre}`, 'editor_tema', { tema: tema.id })
  }

  // 6. Fondo de cielo
  if (/\b(fondo|cielo)\b/.test(n)) {
    const fondo = resolverPorNombre(FONDOS, limpio)
    if (fondo) return edicion(`✏️ Fondo: ${fondo.nombre}`, 'editor_fondo', { fondo: fondo.id })
  }

  // 7. Piso de un cuarto (material o color)
  if (/\bpiso\b/.test(n)) {
    const cu = resolverCuarto(limpio)
    const piso = resolverPorNombre(PISOS, limpio)
    if (piso && cu) return edicion(`✏️ Piso ${piso.nombre} · ${nombreCuarto(cu.id)}`, 'editor_piso_cuarto', { cuarto: cu.id, piso: piso.id })
    const hex = resolverColor(limpio)
    if (hex && cu) return edicion(`✏️ Piso de «${nombreCuarto(cu.id)}» ${etiquetaColor(hex)}`, 'editor_piso_color_cuarto', { cuarto: cu.id, color: hex })
  }

  // 8. Techo de un cuarto (forma o material)
  if (/\btecho\b/.test(n)) {
    const cu = resolverCuarto(limpio)
    const forma = resolverPorNombre(TECHO_FORMAS, limpio, {
      dos_aguas: ['dos aguas', 'a dos aguas', 'aguas'],
      abovedado: ['boveda', 'bóveda'],
      cupula: ['cúpula', 'domo'],
    })
    if (cu && forma) return edicion(`✏️ Techo ${forma.nombre} · ${nombreCuarto(cu.id)}`, 'editor_techo_forma_cuarto', { cuarto: cu.id, forma: forma.id })
    const mat = resolverPorNombre(TECHOS, limpio)
    if (cu && mat) return edicion(`✏️ Techo ${mat.nombre} · ${nombreCuarto(cu.id)}`, 'editor_techo_cuarto', { cuarto: cu.id, techo: mat.id })
  }

  // ── Infraestructura del mapa (huerto, granja, caminos, canchas) ──
  // Va ANTES de la regla de prendas: "tenis" es una PRENDA y se llevaría
  // «pon una cancha de tenis». Toda regla de aquí exige un sustantivo de
  // infraestructura, así que no le roba nada a las reglas de cuarto de abajo.
  // Los verbos son imperativo/presente: el pasado sigue siendo registro
  // («coseché zanahorias» es bitácora, no una orden).

  const nHuerto = /\b(huerto|cultivos?|parcelas?|siembra|sembrado|hortaliza|aspersor(es)?)\b/.test(n)
  // 'mascotas' es el nombre nuevo de la granja; 'comida' NO entra como sinónimo
  // del huerto porque se lo robaría a los registros de la cocina.
  const nGranja =
    /\b(granja|mascotas?|corral(es)?|animal(es)?|gallinas?|cerdos?|cabras?|ovejas?|vacas?|caballos?|yeguas?|establo)\b/.test(n)
  const nVia = /\b(pista|pistas|caminos?|riel(es)?|vias?|tren|montana rusa|coaster|circuito|carrito)\b/.test(n)

  // I-A. Paintball. Solo la frase pelada («juguemos paintball», con modo opcional):
  // en cuanto pide rival o dificultad se deja pasar a la IA, que sí sabe elegirlos.
  if (/\bpaintball\b/.test(n)) {
    if (/\b(sal|salir|salgamos|termina|terminar|acaba|acabar|cancela|cancelar|deja|dejar|basta)\b/.test(n))
      return edicion('🥎 Salir del paintball', 'editor_paintball', { salir: true })
    const pb =
      /^(?:juguemos|jueguemos|juega|jugar|quiero jugar|vamos a jugar|abre(?:me)?|abrir|inicia|empieza|empecemos)\s+(?:al?\s+|el\s+|la\s+|un[ao]?\s+)?(?:partida\s+de\s+|batalla\s+de\s+)?paintball(?:\s+(1v1|2v2|campal|batalla campal|royale))?$/.exec(n)
    if (pb) {
      const modo = pb[1] ? (pb[1] === '1v1' || pb[1] === '2v2' ? pb[1] : 'royale') : undefined
      return edicion(
        `🥎 Paintball${modo ? ` ${modo === 'royale' ? 'campal' : modo}` : ''}`,
        'editor_paintball',
        modo ? { modo } : {},
      )
    }
  }

  // I-0. Llévame: antes que construir («llévame al huerto» ≠ «haz un huerto»).
  if (/^(?:llevame|vamos|vayamos|ve|camina|acompaname|llevate)\b/.test(n)) {
    const destino = nHuerto
      ? 'huerto'
      : nGranja
        ? 'granja'
        : /\bcanchas?\b/.test(n)
          ? 'cancha'
          : /\bmeta\b/.test(n)
            ? 'meta'
            : /\b(tren|riel(es)?|vias?)\b/.test(n)
              ? 'tren'
              : /\b(pista|circuito)\b/.test(n)
                ? 'pista'
                : null
    if (destino) return edicion('🚶 Ir a ' + destino, 'editor_infra_ir_a', { destino })
  }

  // I-1. Carrera: «carrera» sola no basta (existe «estudiar una carrera»).
  if (
    /\bcarreras?\b/.test(n) &&
    (/\b(corre|corramos|arranca|arranquemos|empieza|empecemos|inicia|iniciemos|echa|echemos|hagamos|haz|organiza)\b/.test(n) ||
      /\d+\s*vueltas?\b/.test(n))
  ) {
    const mv = /(\d+)\s*vueltas?\b/.exec(n)
    const vueltas = mv ? Math.max(1, Math.min(9, parseInt(mv[1], 10))) : 3
    const rival = /\b(contra|rival|reta|retame|asistente)\b/.test(n) && !/\bsolo\b/.test(n)
    const dificultad = /\b(dificil|experto)\b/.test(n) ? 1 : /\bfacil\b/.test(n) ? 0 : undefined
    return edicion(`🏁 Carrera · ${vueltas} vuelta${vueltas > 1 ? 's' : ''}`, 'editor_infra_carrera', {
      vueltas,
      rival,
      ...(dificultad != null ? { dificultad } : {}),
    })
  }

  // I-2. Montar el tren / la montaña rusa. ANTES de I-7, que también casa "tren".
  if (
    /\b(tren|vagon|montana rusa|coaster|carrito)\b/.test(n) &&
    /\b(monta|montame|montar|montarme|montemos|sube|subir|subirme|subeme|quiero|paseo|pasear)\b/.test(n) &&
    !/\b(traza|trazar|construye|construir|crea|crear|pinta|pintar|borra|borrar)\b/.test(n)
  ) {
    return edicion('🚂 Montar el tren', 'editor_infra_montar_tren', {})
  }

  // I-3. Canchas. El guardián \bcancha es OBLIGATORIO: sin él, «ponme tenis
  // rojos» caería aquí en vez de en la regla de prendas.
  if (/\bcanchas?\b/.test(n)) {
    const clase = (resolverPorNombre(LISTA_CANCHAS, limpio, SINONIMOS_CANCHA)?.id ?? 'futbol') as ClaseCancha
    const nom = CANCHAS[clase].corto.toLowerCase()
    if (/\b(edita|editar|editor|mueve|mover|rota|rotar|acomoda)\b/.test(n))
      return edicion('🏟️ Editor de canchas', 'editor_infra_construir', { obra: 'canchas', clase })
    if (/\b(pon|poner|ponme|coloca|colocar|crea|crear|construye|construir|haz|hazme|quiero|agrega|agregar|arma|armar|dame|necesito)\b/.test(n)) {
      const hex = resolverColor(limpio)
      return edicion(`🏟️ Cancha de ${nom}`, 'editor_infra_cancha', { clase, ...(hex ? { color: hex } : {}) })
    }
  }

  // I-4. Huerto: cuidado global (antes que "construir huerto").
  if (nHuerto && /\b(riega|riegue|riegalo|regar|reguemos|riego)\b/.test(n))
    return edicion('💧 Regar el huerto', 'editor_infra_huerto_accion', { accion: 'regar' })
  if (
    (nHuerto || /\bcosech/.test(n)) &&
    /\b(cosecha|cosechar|cosechemos|recoge|recoger|recolecta|recolectar)\b/.test(n)
  )
    return edicion('🧺 Cosechar el huerto', 'editor_infra_huerto_accion', { accion: 'cosechar' })

  // I-5. Granja: cuidado global.
  if (nGranja && /\b(alimenta|alimentar|alimentemos|dales de comer|de comer)\b/.test(n))
    return edicion('🌾 Alimentar a los animales', 'editor_infra_granja_accion', { accion: 'alimentar' })
  if (nGranja && /\b(mima|mimar|acaricia|acariciar|consiente|consentir)\b/.test(n))
    return edicion('💛 Mimar a los animales', 'editor_infra_granja_accion', { accion: 'mimar' })
  if (nGranja && /\b(cura|curar|curalos|curalas|sana|sanar|sanalos|medicina)\b/.test(n))
    return edicion('💊 Curar a los animales', 'editor_infra_granja_accion', { accion: 'curar' })
  if (nGranja && /\b(limpia|limpiar|limpialos|limpiemos|asea|asear|barre|barrer)\b/.test(n))
    return edicion('🧹 Limpiar los corrales', 'editor_infra_granja_accion', { accion: 'limpiar' })

  // I-6. Borrar caminos / trazo (no toca muros ni puertas).
  if (
    nVia &&
    /\b(borra|borrar|borremos|quita|quitar|elimina|eliminar|limpia|limpiar|deshaz|tira)\b/.test(n) &&
    !/\b(muro|pared|puerta)\b/.test(n)
  ) {
    const que = /\b(trazo|libre)\b/.test(n)
      ? 'trazo'
      : /\b(montana rusa|coaster|rusa)\b/.test(n)
        ? 'coaster'
        : /\b(riel(es)?|vias?|tren)\b/.test(n)
          ? 'riel'
          : /\bpista/.test(n)
            ? 'pista'
            : 'caminos'
    return edicion(`🧹 Borrar ${que}`, 'editor_infra_borrar', { que })
  }

  // I-7. Construir / abrir el editor con la herramienta lista.
  if (
    /\b(construye|construir|construyeme|crea|crear|creame|haz|hazme|hagamos|arma|armar|armemos|agrega|agregar|pon|poner|ponme|coloca|colocar|abre|abrir|quiero|quisiera|necesito|dame|traza|trazar|edita|editar|empieza|empecemos|quita|quitar|siembra|sembrar|planta|plantar|cultiva|cultivar)\b/.test(n)
  ) {
    if (nHuerto || /\b(sembrar|plantar|cultivar)\b/.test(n)) {
      const esp = resolverPorNombre(LISTA_ESPECIES, limpio, SINONIMOS_ESPECIE)
      if (esp)
        return edicion(`🌱 Sembrar ${esp.nombre.toLowerCase()}`, 'editor_infra_construir', {
          obra: 'huerto',
          especie: esp.id,
        })
      const herramienta = /\baspersor/.test(n)
        ? 'aspersor'
        : /\b(sembrar|siembra|plantar|semilla)\b/.test(n)
          ? 'sembrar'
          : /\b(quita|quitar|arranca)\b/.test(n)
            ? 'quitar'
            : 'parcela'
      return edicion('🌱 Construir el huerto', 'editor_infra_construir', { obra: 'huerto', herramienta })
    }
    if (nGranja) {
      const an = resolverPorNombre(LISTA_ANIMALES, limpio, SINONIMOS_ANIMAL)
      if (an)
        return edicion(`🐄 Poner ${an.nombre.toLowerCase()}s`, 'editor_infra_construir', {
          obra: 'granja',
          animal: an.id,
        })
      const herramienta = /\b(corral|establo|cerca)\b/.test(n) ? 'corral' : 'animal'
      return edicion('🐄 Construir la granja', 'editor_infra_construir', { obra: 'granja', herramienta })
    }
    // El tren "de montar" ya se atendió en I-2: aquí solo se traza la vía.
    if (nVia || /\bmeta\b/.test(n)) {
      const via = /\b(montana rusa|coaster|rusa)\b/.test(n)
        ? 'coaster'
        : /\b(riel(es)?|vias?|tren)\b/.test(n)
          ? 'riel'
          : 'pista'
      const herramienta = /\bmeta\b/.test(n)
        ? 'meta'
        : /\b(rampa|sube|subir|eleva|elevar)\b/.test(n)
          ? 'subir'
          : undefined
      const et = via === 'coaster' ? 'Montaña rusa' : via === 'riel' ? 'Vías de tren' : 'Pista de carreras'
      return edicion(`🛤️ ${et}`, 'editor_infra_construir', {
        obra: 'caminos',
        via,
        ...(herramienta ? { herramienta } : {}),
      })
    }
  }

  // ── Casa: música, wrapped, vista de cámara y vehículos ──

  // Música ambiental y volumen. Guardián \bmusica|volumen\b: no roba nada.
  if (/\b(musica|volumen|cancion|melodia)\b/.test(n)) {
    if (/\b(apaga|apagar|quita|quitar|silencia|silenciar|deten|pausa|pausar)\b/.test(n) && /\bmusica\b/.test(n)) {
      return edicion('🔇 Apagar la música', 'editor_musica', { accion: 'apagar' })
    }
    const mood = MOODS_MUSICA.find((m) => new RegExp(`\\b${m}\\b`).test(n))
      ?? (/\b(relajante|tranquila|chill)\b/.test(n) ? 'calma'
        : /\b(fiesta|alegre)\b/.test(n) ? 'festivo'
        : /\b(retro|8 bits|videojuego)\b/.test(n) ? 'chiptune'
        : undefined)
    const pct = /(\d{1,3})\s*%/.exec(n) ?? (/\bvolumen\b.*?\b(\d{1,3})\b/.exec(n) || undefined)
    if (pct) {
      const v = Math.max(0, Math.min(100, parseInt(pct[1], 10))) / 100
      return edicion(`🔊 Volumen al ${Math.round(v * 100)}%`, 'editor_musica', { volumen: v, ...(mood ? { mood } : {}) })
    }
    if (/\bvolumen\b/.test(n) && /\b(sube|subir|alza|mas alto)\b/.test(n)) {
      const v = Math.min(1, useAjustes.getState().musicaVolumen + 0.15)
      return edicion('🔊 Subir el volumen', 'editor_musica', { volumen: v })
    }
    if (/\bvolumen\b/.test(n) && /\b(baja|bajar|menos|mas bajo)\b/.test(n)) {
      const v = Math.max(0, useAjustes.getState().musicaVolumen - 0.15)
      return edicion('🔉 Bajar el volumen', 'editor_musica', { volumen: v })
    }
    if (mood) return edicion(`🎵 Música ${mood}`, 'editor_musica', { mood })
    if (/\b(musica|cancion|melodia)\b/.test(n) && /\b(pon|ponme|enciende|activa|quiero|reproduce|toca|dale)\b/.test(n)) {
      return edicion('🎵 Encender la música', 'editor_musica', { accion: 'encender' })
    }
  }

  // Máscara AR: abrirla no necesita IA (la cámara con la cabeza del avatar).
  if (/\bmascara\b/.test(n) && /\b(abre|abrir|abreme|pon|ponme|quiero|entra|entrar|activa)\b/.test(n)) {
    return edicion('🎭 Máscara AR', 'editor_mascara', {})
  }

  // Chat AR: tampoco necesita IA para abrirse (la cámara con el asistente encima).
  if (/\bchat ?ar\b/.test(n) && /\b(abre|abrir|abreme|pon|ponme|quiero|entra|entrar|activa)\b/.test(n)) {
    return edicion('🤳 Chat AR', 'editor_chat_ar', {})
  }

  // Wrapped / resumen del periodo. Exige "wrapped" o resumen+periodo para no
  // robar «resumen de finanzas/estudio/garage» (esos son secciones de apps).
  if (
    /\b(wrapped|retrospectiva)\b/.test(n) ||
    (/\bresumen\b/.test(n) && /\b(semanal|mensual|anual|semana|mes|ano|anio)\b/.test(n))
  ) {
    const periodo = /\b(mensual|mes)\b/.test(n) ? 'mes' : /\b(anual|ano|anio)\b/.test(n) ? 'anio' : 'semana'
    const et = periodo === 'mes' ? 'mensual' : periodo === 'anio' ? 'anual' : 'semanal'
    return edicion(`📊 Resumen ${et}`, 'editor_wrapped', { periodo })
  }

  // Vista de cámara: primera/tercera persona o isométrica.
  if (/\bprimera persona\b/.test(n)) return edicion('🎥 Primera persona', 'editor_vista', { vista: 'primera' })
  if (/\btercera persona\b/.test(n)) return edicion('🎥 Tercera persona', 'editor_vista', { vista: 'tercera' })
  if (/\b(vista|camara)\b/.test(n) && /\b(iso|isometrica|aerea|normal|clasica)\b/.test(n)) {
    return edicion('🎥 Vista isométrica', 'editor_vista', { vista: 'iso' })
  }

  // Vehículos montables: bajarse o montar el pedido/más cercano. Verbos en
  // presente/imperativo (como el tren): «monté la bici 20 min» sigue siendo registro.
  if (/\b(bajame|bajarme|bajate|me bajo|desmonta|desmontar|desmontame)\b/.test(n)) {
    return edicion('🚲 Bajarse del vehículo', 'editor_vehiculo', { bajar: true })
  }
  {
    const veh = resolverPorNombre(LISTA_VEHICULOS, limpio, SINONIMOS_VEHICULO)
    if (
      veh &&
      /\b(monta|montame|montar|montarme|montemos|sube|subir|subirme|subeme|conduce|conducir|maneja|manejar|pilotea|pilotear|quiero|paseo|pasear|andar)\b/.test(n) &&
      !/\b(crea|crear|pinta|pintar|borra|borrar|elimina|eliminar|quita|quitar|compra|comprar|vende|vender)\b/.test(n)
    ) {
      return edicion(`🚗 Montar la ${veh.nombre.toLowerCase()}`, 'editor_vehiculo', { vehiculo: veh.id })
    }
  }

  // ── Fase 2 ──

  // Ícono de un cuarto: "cambia el ícono de la cocina a 🍳"
  if (/\b(icono|[ií]cono|emoji)\b/.test(n)) {
    const emoji = /(\p{Extended_Pictographic})/u.exec(limpio)
    const cu = resolverCuarto(limpio)
    if (emoji && cu) return edicion(`✏️ Ícono ${emoji[1]} · ${nombreCuarto(cu.id)}`, 'editor_icono_cuarto', { cuarto: cu.id, icono: emoji[1] })
  }

  // Categoría de un cuarto
  if (/\bcategor[ií]a\b/.test(n)) {
    const cat = /\b(cuerpo|mente|complemento|config)\b/.exec(n)
    const cu = resolverCuarto(limpio)
    if (cat && cu) return edicion(`✏️ Categoría ${cat[1]} · ${nombreCuarto(cu.id)}`, 'editor_categoria_cuarto', { cuarto: cu.id, categoria: cat[1] })
  }

  // Forma/silueta de un cuarto: "haz la cocina redonda"
  const formaMatch = /\b(redond|circular|cuadrad|triangul)/.exec(n)
  if (formaMatch) {
    const cu = resolverCuarto(limpio)
    if (cu) {
      const forma = /redond|circular/.test(formaMatch[1]) ? 'circular' : formaMatch[1].startsWith('triangul') ? 'triangular' : 'cuadrado'
      return edicion(`✏️ Forma ${forma === 'circular' ? 'redonda' : forma} · ${nombreCuarto(cu.id)}`, 'editor_forma_cuarto', { cuarto: cu.id, forma })
    }
  }

  // Rejilla del mapa: "agranda el mapa hacia el este"
  if (/\bmapa\b/.test(n) && /\b(agranda|agrandar|ampl[ií]a|ampliar|crece|crecer|expande|expandir|encoge|encoger|achica|reduce|reducir)\b/.test(n)) {
    const accion = /\b(encoge|encoger|achica|reduce|reducir)\b/.test(n) ? 'encoger' : 'agrandar'
    const dir = ladoDeTexto(limpio) ?? 'E'
    return edicion(`✏️ ${accion === 'encoger' ? 'Encoger' : 'Agrandar'} mapa (${ladoNombre(dir)})`, 'editor_redimensionar_mapa', { accion, direccion: ladoNombre(dir) })
  }

  // Apilar un cuarto sobre otro: "apila la sala sobre la cocina"
  if (/\b(apila|apilar|encima|sobre|arriba de)\b/.test(n)) {
    const m = /^(?:apila(?:r)?\s+)?(.+?)\s+(?:sobre|encima\s+de|arriba\s+de)\s+(.+)$/i.exec(limpio)
    if (m) {
      const cu = resolverCuarto(m[1])
      const base = resolverCuarto(m[2])
      if (cu && base && cu.id !== base.id) return edicion(`✏️ Apilar «${nombreCuarto(cu.id)}» sobre «${nombreCuarto(base.id)}»`, 'editor_apilar_cuarto', { cuarto: cu.id, base: base.id })
    }
  }

  // Mover un cuarto: "mueve la cocina a la derecha"
  if (/\b(mueve|mover|desplaza|desplazar)\b/.test(n)) {
    const dir = ladoDeTexto(limpio)
    const cu = resolverCuarto(limpio)
    if (dir && cu) return edicion(`✏️ Mover «${nombreCuarto(cu.id)}» al ${ladoNombre(dir)}`, 'editor_mover_cuarto', { cuarto: cu.id, direccion: ladoNombre(dir) })
  }

  // Estilo de un lado: material/color/grosor/alto del muro o tipo de puerta
  if (/\b(muro|pared|puerta)\b/.test(n)) {
    const lado = ladoDeTexto(limpio)
    const cu = resolverCuarto(limpio)
    if (lado && cu) {
      const tipoM = resolverPorNombre(TIPOS_MURO, limpio, { vitraje: ['cristal', 'vidrio'], ladrillo: ['ladrillos', 'tabique'] })
      const tipoP = resolverPorNombre(
        TIPOS_PUERTA.filter((p) => p.id !== 'sin' && p.id !== 'recta'),
        limpio,
        { porton: ['portón'], corredera: ['corrediza'] },
      )
      const hex = /\b(pinta|pintar|color|colorea)\b/.test(n) ? resolverColor(limpio) : null
      const grosor = /\b(grues|m[aá]s\s+ancho)/.test(n) ? 'grueso' : /\b(delgad|fin[oa]|m[aá]s\s+delgad)/.test(n) ? 'delgado' : null
      const alto = /\bm[aá]s\s+alt/.test(n) ? 'alto' : /\bm[aá]s\s+baj/.test(n) ? 'bajo' : null
      if (tipoM || tipoP || hex || grosor || alto) {
        const inp: Record<string, unknown> = { cuarto: cu.id, lado: ladoNombre(lado) }
        if (tipoM) inp.tipo = tipoM.id
        if (tipoP) inp.puerta = tipoP.id
        if (hex) inp.color = hex
        if (grosor) inp.grosor = grosor
        if (alto) inp.alto = alto
        return edicion(`✏️ Estilo muro ${ladoNombre(lado)} · ${nombreCuarto(cu.id)}`, 'editor_muro_estilo', inp)
      }
    }
  }

  // Muros/puertas por lado: "abre el muro norte de la cocina"
  if (/\b(muro|pared|puerta)\b/.test(n) && /\b(abre|abrir|cierra|cerrar|pon|poner|coloca|colocar|quita|quitar|agrega|agregar)\b/.test(n)) {
    const lado = ladoDeTexto(limpio)
    const cu = resolverCuarto(limpio)
    if (lado && cu) {
      const estado = /puerta/.test(n) ? 'puerta' : /\b(abre|abrir|quita|quitar)\b/.test(n) ? 'abierto' : 'pared'
      return edicion(`✏️ Muro ${ladoNombre(lado)} (${estado}) · ${nombreCuarto(cu.id)}`, 'editor_muro', { cuarto: cu.id, lado: ladoNombre(lado), estado })
    }
  }

  // Crecer / encoger un cuarto (no el mapa, no el avatar)
  if (!/\bmapa\b/.test(n) && !/\b(avatar|personaje|monito)\b/.test(n)) {
    if (/\b(agranda|agrandar|ampl[ií]a|ampliar|crece|crecer|expande|expandir)\b/.test(n) || /\bm[aá]s\s+grande\b/.test(n)) {
      const cu = resolverCuarto(limpio)
      if (cu) return edicion(`✏️ Agrandar «${nombreCuarto(cu.id)}»`, 'editor_crecer_cuarto', { cuarto: cu.id })
    }
    if (/\b(encoge|encoger|achica|achicar|reduce|reducir)\b/.test(n) || /\bm[aá]s\s+peque/.test(n)) {
      const cu = resolverCuarto(limpio)
      if (cu) return edicion(`✏️ Encoger «${nombreCuarto(cu.id)}»`, 'editor_encoger_cuarto', { cuarto: cu.id })
    }
  }

  // Agrupar / desagrupar objetos de un cuarto
  if (/\b(agrupa|agrupar|junta|juntar)\b/.test(n) && /\b(objeto|objetos|muebles|cosas)\b/.test(n)) {
    const cu = resolverCuarto(limpio)
    if (cu) return edicion(`✏️ Agrupar objetos · ${nombreCuarto(cu.id)}`, 'editor_agrupar_objetos', { cuarto: cu.id })
  }
  if (/\b(desagrupa|desagrupar|separa|separar)\b/.test(n) && /\b(objeto|objetos|muebles|grupo)\b/.test(n)) {
    const cu = resolverCuarto(limpio)
    if (cu) return edicion(`✏️ Desagrupar objetos · ${nombreCuarto(cu.id)}`, 'editor_desagrupar_objetos', { cuarto: cu.id })
  }

  // Editar el último objeto: "gira/quita/pinta/agranda el último objeto"
  if (/\b[uú]ltimo\b/.test(n) && /\b(objeto|mueble|cosa)\b/.test(n)) {
    if (/\b(gira|girar|rota|rotar|voltea|voltear)\b/.test(n)) return edicion('✏️ Girar último objeto', 'editor_objeto_rotar', {})
    if (/\b(quita|quitar|elimina|eliminar|borra|borrar)\b/.test(n)) return edicion('✏️ Quitar último objeto', 'editor_eliminar_objeto', {})
    if (/\b(grande|agranda|agrandar)\b/.test(n)) return edicion('✏️ Agrandar último objeto', 'editor_objeto_tamano', { escala: 1.4 })
    if (/\b(peque|chico|achica|achicar)\b/.test(n)) return edicion('✏️ Encoger último objeto', 'editor_objeto_tamano', { escala: 0.7 })
    const hexObj = resolverColor(limpio)
    if (hexObj) return edicion(`✏️ Pintar último objeto de ${etiquetaColor(hexObj)}`, 'editor_objeto_color', { color: hexObj })
  }

  // 9. Avatar: poner/quitar prenda
  const prendaVerbo = /\b(pon(?:me|te)?|us[ao]|qu[ií]ta(?:me|te)?)\b/.test(n)
  if (prendaVerbo) {
    const prenda = resolverPorNombre(PRENDAS, limpio, { pantalon: ['pantalones'], tenis: ['zapatos', 'zapatillas'], lentes: ['gafas', 'anteojos'] })
    if (prenda) {
      const quitar = /\bqu[ií]ta/.test(n)
      const hex = resolverColor(limpio)
      return edicion(
        `✏️ ${quitar ? 'Quitar' : 'Poner'} ${prenda.nombre.toLowerCase()}`,
        'editor_avatar_prenda',
        { prenda: prenda.id, quitar, ...(hex ? { color: hex } : {}) },
      )
    }
  }

  // 10. Avatar: color de una parte (cabeza/torso/piernas)
  const parteMatch = /\b(cabeza|torso|cuerpo|pecho|piernas|pierna)\b/.exec(n)
  if (parteMatch && /\b(avatar|personaje|monito|me\b)/.test(n)) {
    const hex = resolverColor(limpio)
    if (hex) {
      const parte = parteMatch[1] === 'cabeza' ? 'cabeza' : parteMatch[1].startsWith('pierna') ? 'piernas' : 'torso'
      return edicion(`✏️ Avatar: ${parte}`, 'editor_avatar_color', { parte, color: hex })
    }
  }

  // 11. Avatar: tamaño (relativo o absoluto)
  if (/\b(avatar|personaje|monito|me\b)/.test(n) && /\b(grande|alto|peque|chico|bajo|enano|gigante|tama[nñ]o)\b/.test(n)) {
    const numMatch = /(\d(?:\.\d+)?)\s*x?/.exec(n)
    const actual = useDiseño.getState().avatar.escala
    let escala = actual
    if (numMatch) escala = parseFloat(numMatch[1])
    else if (/\b(grande|alto|gigante|mayor|mas)\b/.test(n)) escala = actual + 0.25
    else if (/\b(peque|chico|bajo|enano|menor)\b/.test(n)) escala = actual - 0.25
    if (escala !== actual) return edicion('✏️ Tamaño del personaje', 'editor_avatar_tamano', { escala })
  }

  // 12. Pintar un cuarto (al final: muchos verbos podrían chocar)
  if (/\b(pinta|pintar|colorea|colorear|color)\b/.test(n)) {
    const hex = resolverColor(limpio)
    const cu = resolverCuarto(limpio)
    if (hex && cu) return edicion(`✏️ Pintar «${nombreCuarto(cu.id)}» de ${etiquetaColor(hex)}`, 'editor_pintar_cuarto', { cuarto: cu.id, color: hex })
  }

  // 12b. Mapa conceptual: sin IA solo se puede crear en blanco con el tema de
  //      raíz (como el botón «Crear» de la app), así que es `soloSinIA`: con IA
  //      gana el modelo, que además lo dibuja entero.
  const mapaIdeas =
    /^(?:h[aá]z(?:me)?|cre[aá](?:me)?|dib[uú]ja(?:me)?|arma(?:me)?|gener[aá](?:me)?|quiero|necesito)\s+(?:un[ao]?\s+)?(mapa\s+mental|mapa\s+conceptual|diagrama\s+de\s+flujo|diagrama\s+de\s+venn|comparaci[oó]n|foda|dafo|ishikawa|espina\s+de\s+pescado|ventajas\s+y\s+desventajas|pros\s+y\s+contras|campo\s+de\s+fuerzas|eisenhower|l[ií]nea\s+(?:del|de)\s+tiempo|ciclo|pir[aá]mide|[aá]rbol\s+de\s+decisi[oó]n(?:es)?|tier\s*list|[aá]rbol|diagrama|esquema)\s+(?:de|sobre|para|acerca\s+de|con)\s+(.+)$/i.exec(
      limpio,
    )
  if (mapaIdeas) {
    const tema = mapaIdeas[2].replace(/^["']|["']$/g, '').trim()
    const k = normalizar(mapaIdeas[1])
    // De la palabra al formato, del más específico al más genérico («árbol de
    // decisiones» tiene que ganarle a «árbol» a secas).
    const CLAVES: [string, TipoMapa][] = [
      ['flujo', 'flujo'],
      ['venn', 'venn'],
      ['foda', 'foda'],
      ['dafo', 'foda'],
      ['ishikawa', 'ishikawa'],
      ['espina', 'ishikawa'],
      ['ventajas', 'proscontras'],
      ['pros', 'proscontras'],
      ['fuerzas', 'fuerzas'],
      ['eisenhower', 'eisenhower'],
      ['linea', 'linea'],
      ['ciclo', 'ciclo'],
      ['piramide', 'piramide'],
      ['tier', 'tier'],
      ['arbol de decision', 'decision'],
      ['compara', 'comparacion'],
      ['arbol', 'arbol'],
    ]
    const tipo: TipoMapa = CLAVES.find(([palabra]) => k.includes(palabra))?.[1] ?? 'mental'
    return {
      ...edicion(`💡 Mapa: ${tema}`, 'editor_mapa_ideas', { tema, tipo, vacio: true }),
      soloSinIA: true,
    }
  }

  // 13. Jugar un juego de la mesa: "quiero jugar la viborita", "juega tetris".
  //     Solo presente/imperativo: "jugué…" (pasado) es un registro, no una orden.
  if (/\b(juega|jugar|juguemos)\b/.test(n)) {
    const res = resolverComandoApp(limpio)
    if (res && res.cmd.dato) {
      return edicion(`🎮 Jugar ${res.cmd.etiqueta}`, 'editor_abrir_app', {
        app: res.app.id,
        seccion: res.cmd.seccion,
        dato: res.cmd.dato,
      })
    }
  }

  // 14. Abrir cuarto / app / sección: "abre la cocina", "abre el recetario",
  //     "llévame al jardín". Al final: los "abre el muro…" ya se atendieron arriba.
  const abrirMatch = /^(?:abre(?:me)?|abrir|entra(?:r)?|entremos|lanza(?:r)?|ll[eé]vame|mu[eé]strame|vamos|vayamos)\b\s*(?:a(?:l)?\s+)?(.+)$/i.exec(limpio)
  if (abrirMatch) {
    const resto = abrirMatch[1]
    // El calendario primero: no es una app, así que `resolverComandoApp` no lo ve.
    const cal = resolverVistaCalendario(resto)
    if (cal) {
      return edicion(`🗓️ Abrir ${cal.etiqueta}`, 'editor_abrir_calendario', { vista: cal.vista })
    }
    const res = resolverComandoApp(resto)
    if (res) {
      return edicion(`🚪 Abrir ${res.cmd.etiqueta} · ${nombreApp(res.app)}`, 'editor_abrir_app', {
        app: res.app.id,
        seccion: res.cmd.seccion,
        ...(res.cmd.dato ? { dato: res.cmd.dato } : {}),
      })
    }
    const cu = resolverCuarto(resto)
    if (cu) return edicion(`🚪 Abrir «${nombreCuarto(cu.id)}»`, 'editor_abrir_app', { cuarto: cu.id })
    const app = resolverApp(resto)
    if (app) return edicion(`🚪 Abrir ${nombreApp(app)}`, 'editor_abrir_app', { app: app.id })
  }

  return null
}
