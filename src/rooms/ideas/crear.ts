import type { NodoMapa, TipoMapa } from '../../core/data/db'
import { mapasIdeasRepo, nodosMapaRepo } from '../../core/data/repository'
import { fechaLocalISO } from '../../core/fechaLocal'
import { tGlobal } from '../../core/i18n/useT'
import { COLOR, PALETA_RAMAS } from './constantes'
import { ejemploDe } from './ejemplos'
import { generarMapa, type MapaPropuesto } from './ia'
import { centroZona, layoutMapa, posRaizZonas } from './layouts'
import { agregarCriterio, agregarOpcion, ZONA_CRITERIO, ZONA_OPCION } from './matriz'
import { colorRaiz, defTipo, etiquetasRaiz, raizDeZona, zonaDeRaiz } from './tiposMapa'

/**
 * Alta de mapas conceptuales, compartida por la pestaña Mapas y por el chat
 * (tool `editor_mapa_ideas`): el mapa en blanco (solo sus raíces) o dibujado
 * entero por la IA. Las filas de nodos se arman igual por los dos caminos.
 */

type FilaNodo = Omit<NodoMapa, 'id'>

/** Crea el mapa y sus raíces (1 nodo, o una por región en los mapas por zonas). */
export async function crearMapaVacio(nombre: string, tipo: TipoMapa): Promise<number> {
  const ahora = new Date().toISOString()
  const base = { fecha: fechaLocalISO(), creadoEn: ahora }
  const id = await mapasIdeasRepo.add({ nombre, tipo, color: COLOR, ...base })

  // La matriz nace con dos criterios y dos opciones: una tabla vacía del todo
  // no se entiende, y así se ve para qué sirve cada casilla.
  if (tipo === 'matriz') {
    for (let i = 0; i < 2; i++) {
      await agregarCriterio(id, tGlobal('ideas.matriz.criterioN', 'Criterio {n}', { n: i + 1 }), i)
      await agregarOpcion(id, tGlobal('ideas.matriz.opcionN', 'Opción {n}', { n: i + 1 }), i)
    }
    return id
  }

  const porZonas = defTipo(tipo).porZonas
  const raices = etiquetasRaiz(tipo, nombre)

  for (let i = 0; i < raices.length; i++) {
    const p = porZonas ? posRaizZonas(tipo, i, raices.length) : { x: 0, y: 0 }
    await nodosMapaRepo.add({
      mapaId: id,
      nodoId: `nod-${crypto.randomUUID()}`,
      padreId: null,
      texto: raices[i],
      x: p.x,
      y: p.y,
      color: porZonas ? colorRaiz(tipo, i) : COLOR,
      ...(porZonas ? { zona: zonaDeRaiz(tipo, i) } : {}),
      ...(tipo === 'flujo' ? { forma: 'inicio' as const } : {}),
      ...base,
    })
  }
  return id
}

/**
 * Mapa mental nacido de una lluvia del diario: el tema al centro y una rama por
 * idea. Es el puente entre las dos primeras pestañas (capturar → ordenar).
 */
export async function crearMapaDesdeIdeas(tema: string, textos: string[]): Promise<number> {
  const ahora = new Date().toISOString()
  const id = await mapasIdeasRepo.add({
    nombre: tema,
    tipo: 'mental',
    color: COLOR,
    fecha: fechaLocalISO(),
    creadoEn: ahora,
  })
  const propuesta: MapaPropuesto = { raiz: tema, ramas: textos.map((t) => ({ texto: t, hijos: [] })) }
  await nodosMapaRepo.bulkAdd(filasJerarquicas(propuesta, 'mental', id, ahora))
  return id
}

/**
 * Genera el mapa completo con IA desde un tema y lo materializa según su
 * formato. Lanza con el motivo real (clave, red, formato) para que la UI o el
 * chat lo muestren tal cual.
 */
export async function crearMapaIA(tema: string, tipo: TipoMapa): Promise<{ id: number; nombre: string }> {
  const propuesta = await generarMapa(tema, tipo)
  const nombre = propuesta.titulo || propuesta.raiz || tema
  return { id: await materializarMapa(nombre, tipo, propuesta), nombre }
}

/**
 * Escribe un mapa completo (de la IA, del catálogo de ejemplos o del año demo)
 * con sus nodos ya colocados según el formato. `fecha`/`creadoEn` permiten
 * fecharlo en el pasado (el año de Pep@); por defecto es hoy, como siempre.
 */
export async function materializarMapa(
  nombre: string,
  tipo: TipoMapa,
  propuesta: MapaPropuesto,
  ejemplo = false,
  fecha = fechaLocalISO(),
  creadoEn = new Date().toISOString(),
): Promise<number> {
  const id = await mapasIdeasRepo.add({
    nombre,
    tipo,
    color: COLOR,
    ...(ejemplo ? { ejemplo: true } : {}),
    fecha,
    creadoEn,
  })
  const filas = defTipo(tipo).tabla
    ? filasMatriz(propuesta, id, creadoEn, fecha)
    : defTipo(tipo).porZonas
      ? filasPorZonas(propuesta, tipo, id, creadoEn, fecha)
      : filasJerarquicas(propuesta, tipo, id, creadoEn, fecha)
  await nodosMapaRepo.bulkAdd(filas)
  return id
}

/**
 * Crea el ejemplo de fábrica de un formato. Es un mapa normal y corriente: se
 * puede editar, usar de plantilla o borrar; solo lleva la marca `ejemplo` para
 * que la app le enseñe su guía encima y no lo duplique.
 */
export async function crearEjemplo(tipo: TipoMapa): Promise<number> {
  const ej = ejemploDe(tipo)
  const propuesta: MapaPropuesto = {
    ...ej.propuesta,
    // Columnas y cuadrantes se titulan solos salvo que el ejemplo diga otra cosa.
    conjuntos: ej.propuesta.conjuntos ?? (defTipo(tipo).porZonas ? etiquetasRaiz(tipo, ej.titulo) : undefined),
  }
  return materializarMapa(ej.titulo, tipo, propuesta, true)
}

/** Mapas jerárquicos y de flujo: layout por formato y color heredado de su rama. */
function filasJerarquicas(
  propuesta: MapaPropuesto,
  tipo: TipoMapa,
  mapaId: number,
  ahora: string,
  fecha = fechaLocalISO(),
): FilaNodo[] {
  const colocados = layoutMapa(tipo, propuesta.raiz, propuesta.ramas)
  const colores: string[] = []
  const nodoIds: string[] = []
  let rama = 0
  return colocados.map((c, i) => {
    colores[i] =
      c.profundidad === 0
        ? COLOR
        : c.profundidad === 1
          ? PALETA_RAMAS[rama++ % PALETA_RAMAS.length]
          : colores[c.padre]
    nodoIds[i] = `nod-${crypto.randomUUID()}`
    return {
      mapaId,
      nodoId: nodoIds[i],
      padreId: c.padre === -1 ? null : nodoIds[c.padre],
      texto: c.texto,
      x: c.x,
      y: c.y,
      color: colores[i],
      ...(tipo === 'flujo'
        ? { forma: c.padre === -1 ? (propuesta.formaRaiz ?? 'inicio') : (c.forma ?? 'proceso') }
        : {}),
      fecha,
      creadoEn: ahora,
    }
  })
}

/**
 * Matriz de decisión: criterios y opciones como filas raíz, y una celda por
 * cruce con su puntaje (solo las que la IA puntuó; las demás salen neutras).
 */
function filasMatriz(
  propuesta: MapaPropuesto,
  mapaId: number,
  ahora: string,
  fecha = fechaLocalISO(),
): FilaNodo[] {
  const base = { mapaId, x: 0, y: 0, fecha, creadoEn: ahora }
  const criterios = propuesta.criterios ?? []
  const opciones = propuesta.opciones ?? []
  const idsCriterio = criterios.map(() => `nod-${crypto.randomUUID()}`)
  const idsOpcion = opciones.map(() => `nod-${crypto.randomUUID()}`)

  const filas: FilaNodo[] = criterios.map((c, i) => ({
    ...base,
    nodoId: idsCriterio[i],
    padreId: null,
    zona: ZONA_CRITERIO,
    texto: c.texto,
    peso: c.peso,
    color: PALETA_RAMAS[i % PALETA_RAMAS.length],
  }))

  opciones.forEach((o, j) => {
    filas.push({
      ...base,
      nodoId: idsOpcion[j],
      padreId: null,
      zona: ZONA_OPCION,
      texto: o.texto,
      color: PALETA_RAMAS[j % PALETA_RAMAS.length],
    })
    o.puntajes.forEach((p, i) => {
      if (!idsCriterio[i]) return
      filas.push({
        ...base,
        nodoId: `nod-${crypto.randomUUID()}`,
        padreId: idsCriterio[i],
        zona: idsOpcion[j],
        texto: '',
        peso: p,
      })
    })
  })
  return filas
}

/** Venn y comparación: los conjuntos son las raíces y cada elemento va a su región. */
function filasPorZonas(
  propuesta: MapaPropuesto,
  tipo: TipoMapa,
  mapaId: number,
  ahora: string,
  fecha = fechaLocalISO(),
): FilaNodo[] {
  const conjuntos = propuesta.conjuntos ?? []
  const n = conjuntos.length
  const base = { mapaId, fecha, creadoEn: ahora }
  const idsRaiz = conjuntos.map(() => `nod-${crypto.randomUUID()}`)

  const filas: FilaNodo[] = conjuntos.map((texto, i) => {
    const p = posRaizZonas(tipo, i, n)
    return {
      ...base,
      nodoId: idsRaiz[i],
      padreId: null,
      texto,
      x: p.x,
      y: p.y,
      color: colorRaiz(tipo, i),
      zona: zonaDeRaiz(tipo, i),
    }
  })

  const cuenta = new Map<string, number>()
  for (const el of propuesta.elementos ?? []) {
    const i = cuenta.get(el.zona) ?? 0
    cuenta.set(el.zona, i + 1)
    const c = centroZona(tipo, el.zona, n)
    // Los elementos toman el color de su región; las compartidas, el de la app.
    const raiz = raizDeZona(tipo, el.zona)
    const color = raiz >= 0 ? colorRaiz(tipo, raiz) : COLOR
    filas.push({
      ...base,
      nodoId: `nod-${crypto.randomUUID()}`,
      // Cuelgan del primer conjunto solo para tener padre: su sitio lo da `zona`.
      padreId: idsRaiz[0],
      texto: el.texto,
      x: c.x,
      y: c.y + i * 48,
      color,
      zona: el.zona,
      ...(el.peso ? { peso: el.peso } : {}),
    })
  }
  return filas
}
