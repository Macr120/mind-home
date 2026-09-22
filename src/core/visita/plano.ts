/**
 * El plano de la casa, LADO ANFITRIÓN: qué sale de este dispositivo cuando
 * alguien viene de visita.
 *
 * El filtro va aquí, no en el invitado: lo que no se marca NUNCA sale del
 * dispositivo, que es el único modelo de privacidad que aguanta devtools. Son
 * dos allowlists encadenadas —`TABLAS_PLANO` (la estructura de la casa) ∪ las
 * `visita.tablas` de cada app marcada, y `CAMPOS_PLANO` campo a campo— más la
 * poda de §7: fuera los asistentes (personalidad), el avatar (el invitado vuelca
 * el SUYO), los marcadores, el guardarropa y la biblioteca de objetos.
 *
 * **Sin un solo Blob en v1.** Por eso no viajan `fondosImagen`,
 * `pisosImagenCuarto`, `techosImagenCuarto`, `murosImagenCuarto` ni `grafitis`:
 * su contenido ES la imagen y sin ella la fila no pinta nada. Tampoco viaja
 * `itemsPlantilla`: es el CONTENIDO de las apps personalizadas (notas,
 * pendientes, bitácora), no la estructura de la casa, y una plantilla custom no
 * puede declarar `visita`.
 */
import { db, type ObjetoCuarto } from '../data/db'
import { esObjetoLibreria } from '../state/disenoStore'
import { getPlantilla } from '../appContrato'

export interface PlanoCasa {
  version: 1
  tablas: Record<string, unknown[]>
}

/** La estructura de la casa: lo que se ve al pasear, sin datos de ninguna app. */
export const TABLAS_PLANO: readonly string[] = [
  // Identidad y plano
  'cuartos',
  'layout',
  'mapaConfig',
  'accesos',
  'zonas',
  'pisosExterior',
  'murosLibres',
  'formasLibres',
  // Diseño y objetos (la biblioteca de objetos se poda fila a fila)
  'disenoRooms',
  'objetosCuarto',
  // Plantillas personalizadas: la app existe y amuebla, pero sin su contenido
  'plantillasCustom',
  'gruposPlantilla',
  'objetosPlantilla',
  // Infraestructura viva
  'caminos',
  'pistasLibres',
  'cultivos',
  'corrales',
  'animales',
  'cesta',
  'carreras',
]

/**
 * Allowlist de campos por tabla. Ausente en la lista = no viaja, y eso incluye
 * a propósito:
 * - todo campo `Blob` (`iconoImagen`, `pisoImagen`, `modeloGlb`, `foto`…),
 * - `enlaceUrl` y `programa` de `objetosCuarto` (abrirían una página o un .exe
 *   elegidos por el anfitrión en el equipo del invitado),
 * - `portada` de `mediaArchivo` (URL remota: pintarla filtraría la IP del
 *   invitado a un servidor que eligió otro),
 * - `uid`/`updatedAt` (identidad de sync: en la BD de visita no sincroniza nada),
 * - `ejemploDe` (marca LOCAL de los ejemplos de fábrica: el invitado tiene su
 *   propio interruptor vacío y escondería filas que el anfitrión sí ve).
 */
export const CAMPOS_PLANO: Record<string, readonly string[]> = {
  cuartos: ['id', 'nombre', 'icon', 'color', 'categoria', 'creado', 'orden', 'ordenPanel', 'temaMusical'],
  layout: [
    'id', 'roomId', 'placed', 'col', 'row', 'footprint', 'nivel', 'w', 'h',
    'muros', 'estilos', 'pinceles', 'formasCelda', 'sinMuros', 'agua', 'puertas',
  ],
  mapaConfig: ['id', 'cols', 'rows', 'celda', 'cuadrantes'],
  accesos: ['id', 'nivel', 'tipo', 'col', 'row', 'esquina', 'lado'],
  zonas: ['id', 'nombre', 'color', 'nivel', 'celdas', 'pisoTipo', 'pisoColor', 'muros', 'roomId', 'formasCelda'],
  pisosExterior: ['id', 'nivel', 'col', 'row', 'pisoTipo', 'pisoColor', 'forma'],
  murosLibres: [
    'id', 'nivel', 'clase', 'orient', 'col', 'row', 'forma', 'rotacion', 'tipo', 'color', 'alto',
    'silueta', 'formaAlto', 'formaAncho', 'formaPosX', 'formaDividir', 'formaColor',
    'ventana', 'ventAncho', 'ventAlto', 'ventColor',
    'puerta', 'puertaAncho', 'puertaColor', 'puertaAlto', 'puertaTipo',
    'puertaForma', 'puertaFormaAlto', 'puertaFormaAncho', 'puertaFormaPosX',
    'ventForma', 'ventPosX', 'ventPosY', 'ventRot', 'ventMosaico', 'ventMulticolor',
    'ventContenido', 'ventCara',
  ],
  formasLibres: [
    'id', 'nivel', 'tipo', 'puntos', 'cerrada', 'suave', 'nombre', 'muroTipo', 'muroColor', 'alto',
    'silueta', 'formaAlto', 'formaAncho', 'formaPosX', 'vanos', 'pisoTipo', 'pisoColor',
    'techo', 'techoTipo', 'techoColor', 'techoAlto', 'techoDir', 'fecha',
  ],
  disenoRooms: [
    'id', 'roomId', 'color', 'nombre', 'muebleColor', 'pisoTipo', 'pisoColor', 'pisoExtTipo', 'pisoExtColor',
    'techoColor', 'techoTipo', 'techoForma', 'techoParams', 'techoExtra', 'techoFormasCelda',
    'temaOverride', 'efectosConfig',
  ],
  objetosCuarto: [
    'id', 'roomId', 'tipo', 'color', 'slot', 'x', 'z', 'rotY', 'rotX', 'rotZ', 'y', 'escala', 'fx',
    'piezas', 'tipoOriginal', 'nombre', 'permanente', 'grupoId', 'plantillaId',
    'categoria', 'baseId', 'orden', 'libreriaId', 'animacion', 'vidaComidaEn', 'vidaMimoEn',
    'texto', 'grupoAccion', 'mueble',
  ],
  plantillasCustom: ['id', 'nombre', 'icon', 'color', 'bloques', 'secciones', 'creadoEn'],
  gruposPlantilla: ['id', 'nombre', 'emoji', 'orden', 'miembros', 'esBase', 'plegado'],
  objetosPlantilla: ['plantillaId', 'objetos'],
  caminos: ['id', 'col', 'row', 'tipo', 'altura', 'meta'],
  pistasLibres: ['id', 'puntos', 'cerrada', 'fecha'],
  cultivos: ['id', 'col', 'row', 'especie', 'plantadoEn', 'regadoEn', 'cosechas', 'aspersorEn'],
  corrales: ['id', 'col', 'row', 'ancho', 'alto', 'accesorios', 'limpiadoEn'],
  animales: ['id', 'corralId', 'tipo', 'alimentadoEn', 'mimadoEn', 'enfermoDesde', 'nombre', 'col', 'row'],
  cesta: ['id', 'especie', 'cantidad'],
  carreras: ['id', 'metaCol', 'metaRow', 'vehiculo', 'mejorVuelta', 'mejorTotal', 'vueltasDeTotal', 'victorias', 'derrotas', 'fecha'],
  // ── Apps que se pueden compartir (§7): sus tablas las declara cada plantilla ──
  recetas: [
    'id', 'nombre', 'emoji', 'porciones', 'minutos', 'etiquetas', 'carpeta', 'momentos',
    'ingredientes', 'pasos', 'calorias', 'proteinas', 'carbohidratos', 'grasas', 'fuente', 'creadaEn',
  ],
  entradasBiblio: ['id', 'pilarId', 'temaId', 'titulo', 'resumen', 'puntosClave', 'creadoEn', 'actualizadoEn'],
  mediaArchivo: [
    'id', 'tipo', 'titulo', 'genero', 'fecha', 'estado', 'calificacion', 'resena', 'autor', 'resumen', 'creadoEn',
  ],
  juegosMesa: [
    'id', 'nombre', 'categoria', 'jugadoresMin', 'jugadoresMax', 'duracionMin', 'editorial',
    'calificacion', 'notas', 'vecesJugado', 'ultimaPartida', 'estado', 'creadoEn',
  ],
}

/** Las tablas que abre una app marcada, si es que declara `visita` (§7). */
function tablasDeApp(plantillaId: string): readonly string[] {
  const tablas = getPlantilla(plantillaId)?.visita?.tablas ?? []
  // Doble llave: una app no puede abrir una tabla sin allowlist de campos.
  return tablas.filter((t) => CAMPOS_PLANO[t] !== undefined)
}

/** Las tablas que de verdad van a viajar con estas apps marcadas. */
export function tablasDelPlano(apps: readonly string[]): string[] {
  const nombres = new Set(TABLAS_PLANO)
  for (const id of apps) for (const t of tablasDeApp(id)) nombres.add(t)
  return [...nombres]
}

/** Deja solo los campos permitidos y tira lo que no sea dato serializable. */
function podarFila(tabla: string, fila: Record<string, unknown>): Record<string, unknown> {
  const salida: Record<string, unknown> = {}
  for (const campo of CAMPOS_PLANO[tabla]) {
    const v = fila[campo]
    // Un Blob se serializaría como `{}` (ver casaSnapshot.ts) y viajaría vacío.
    if (v === undefined || v === null || v instanceof Blob) continue
    salida[campo] = v
  }
  return salida
}

/**
 * Arma el paquete que sube al bucket. Devuelve JSON en un Blob: el gzip lo
 * pone `subirPlano` (o el stub local de `planoLocal.ts`).
 */
export async function armarPlano(apps: readonly string[]): Promise<Blob> {
  const tablas: PlanoCasa['tablas'] = {}
  for (const nombre of tablasDelPlano(apps)) {
    let filas = (await db.table(nombre).toArray()) as Record<string, unknown>[]
    // La biblioteca de objetos es el inventario del anfitrión, no su casa (§7).
    if (nombre === 'objetosCuarto') {
      filas = filas.filter((f) => !esObjetoLibreria(f as unknown as ObjetoCuarto))
    }
    tablas[nombre] = filas.map((f) => podarFila(nombre, f))
  }
  const plano: PlanoCasa = { version: 1, tablas }
  return new Blob([JSON.stringify(plano)], { type: 'application/json' })
}
