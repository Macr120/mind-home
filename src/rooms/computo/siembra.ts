/**
 * Siembra inicial de la sala de cómputo: el formulario de Matemáticas, Física y
 * Química, y tres hojas para empezar.
 *
 * Esto NO es un «catálogo de fábrica» aparte: las filas que crea son datos del
 * usuario como cualquier otro, editables y borrables una a una. Por eso tampoco
 * llevan `ejemploDe` — esa marca las escondería en bloque desde el interruptor
 * de ejemplos, que es justo la división que aquí no se quiere.
 *
 * EXCEPCIÓN A LA REGLA 1 DE CLAUDE.md (las apps no importan `db`): se escribe
 * con `db` directo y no por repo porque `repository.add` sella
 * `updatedAt: Date.now()` y pisaría el `updatedAt: 1` de `filaSeed`. Ese 1 es lo
 * que hace que (a) la edición real de otro dispositivo gane siempre por LWW y
 * (b) `sync/motor.ts` pueda borrar las seeds vírgenes que el servidor no
 * conoce — que es lo único que evita que un segundo dispositivo resucite lo que
 * el usuario borró aquí. Mismo motivo y mismo patrón que `rooms/cocina/seed.ts`.
 */
import { db, type CarpetaFormula, type Formula, type HojaCalculo } from '../../core/data/db'
import { claveLS, esDemo } from '../../core/edicion'
import { filaSeed } from '../../core/data/sync/syncables'
import { fechaLocalISO } from '../../core/fechaLocal'
import { tGlobal } from '../../core/i18n/useT'
import { catalogoActual, idCatalogo } from './catalogo'
import { PLANTILLAS_HOJA } from './plantillasHoja'

let sembrado = false

/** Banderas versionadas: subir la versión añade lo nuevo sin repetir lo viejo. */
const LS_FORMULAS = claveLS('computo.catalogoSembrado')
const VERSION_FORMULAS = '1'
const LS_HOJAS = claveLS('computo.hojasSembradas')
const VERSION_HOJAS = '1'

// Mismo idioma que `rooms/biblioteca/arbol.ts` para quitar acentos tras NFD.
const DIACRITICOS = new RegExp('[\\u0300-\\u036f]', 'g')

/** Clave estable para el uid (la misma en todo dispositivo). */
const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(DIACRITICOS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/**
 * Siembra el formulario y las hojas de arranque. Idempotente por tres vías: la
 * guardia de módulo, la bandera de localStorage (que es lo que impide resucitar
 * lo que el usuario borró a propósito) y la comprobación de identidad fila a
 * fila (que cubre el caso «restauré un respaldo en un navegador nuevo»).
 */
export async function sembrarComputo(): Promise<void> {
  if (sembrado) return
  sembrado = true
  // La casa de Pep@ trae su propio formulario curado (ver `demo.ts`): 54
  // fórmulas encima lo volverían ilegible.
  if (esDemo()) return

  if (localStorage.getItem(LS_FORMULAS) !== VERSION_FORMULAS) {
    await sembrarFormulario()
    localStorage.setItem(LS_FORMULAS, VERSION_FORMULAS)
  }
  if (localStorage.getItem(LS_HOJAS) !== VERSION_HOJAS) {
    await sembrarHojas()
    localStorage.setItem(LS_HOJAS, VERSION_HOJAS)
  }
}

/** Las tres áreas, cada una con sus grupos como subcarpetas. */
async function sembrarFormulario(): Promise<void> {
  const carpetas = await db.carpetasFormula.toArray()
  const formulas = await db.formulas.toArray()
  const yaCarpeta = new Set(carpetas.map((c) => c.carpetaId))
  const yaFormula = new Set(formulas.map((f) => f.formulaId))
  const ahora = new Date().toISOString()
  const hoy = fechaLocalISO()

  const nuevasCarpetas: CarpetaFormula[] = []
  const nuevasFormulas: Formula[] = []

  for (const [iArea, area] of catalogoActual().entries()) {
    // Quien ya hubiera copiado del catálogo tiene una carpeta raíz con el
    // nombre del área y un `carpetaId` aleatorio: se reusa en vez de crear una
    // segunda «Física» al lado.
    const previa = carpetas.find((c) => c.padreId == null && c.nombre === area.nombre)
    const raizId = previa?.carpetaId ?? `cat-${area.id}`
    if (!previa && !yaCarpeta.has(raizId)) {
      nuevasCarpetas.push(
        filaSeed(`carpetasFormula-${raizId}`, {
          carpetaId: raizId,
          padreId: null,
          nombre: area.nombre,
          emoji: area.emoji,
          color: area.color,
          orden: iArea,
          creadoEn: ahora,
        }),
      )
      yaCarpeta.add(raizId)
    }

    const grupos = [...new Set(area.formulas.map((f) => f.grupo))]
    for (const [iGrupo, grupo] of grupos.entries()) {
      const grupoId = `cat-${area.id}-${slug(grupo)}`
      if (!yaCarpeta.has(grupoId)) {
        nuevasCarpetas.push(
          filaSeed(`carpetasFormula-${grupoId}`, {
            carpetaId: grupoId,
            padreId: raizId,
            nombre: grupo,
            orden: iGrupo,
            creadoEn: ahora,
          }),
        )
        yaCarpeta.add(grupoId)
      }

      for (const [iF, f] of area.formulas.filter((x) => x.grupo === grupo).entries()) {
        const formulaId = idCatalogo(area.id, f.slug)
        if (yaFormula.has(formulaId)) continue
        nuevasFormulas.push(
          filaSeed(`formulas-${formulaId}`, {
            formulaId,
            carpetaId: grupoId,
            nombre: f.nombre,
            expresion: f.expresion,
            resultado: f.resultado,
            tex: f.tex,
            variables: f.variables.map((v) => ({ ...v })),
            orden: iF,
            fecha: hoy,
            creadoEn: ahora,
          }),
        )
        yaFormula.add(formulaId)
      }
    }
  }

  if (nuevasCarpetas.length) await db.carpetasFormula.bulkAdd(nuevasCarpetas)
  if (nuevasFormulas.length) await db.formulas.bulkAdd(nuevasFormulas)
}

/**
 * Las hojas de arranque, ya rellenas y con sus fórmulas puestas. La plantilla
 * `blanco` no se siembra: una hoja vacía no enseña nada y es el botón «Hoja
 * nueva» de `HojasTab`.
 */
async function sembrarHojas(): Promise<void> {
  const hojas = (await db.hojasCalculo.toArray()) as (HojaCalculo & { uid?: string })[]
  const ya = new Set(hojas.map((h) => h.uid).filter(Boolean))
  const ahora = new Date().toISOString()

  const nuevas: HojaCalculo[] = []
  for (const p of PLANTILLAS_HOJA) {
    if (p.id === 'blanco') continue
    const uid = `seed-hojasCalculo-${p.id}`
    if (ya.has(uid)) continue
    nuevas.push(
      filaSeed(`hojasCalculo-${p.id}`, {
        nombre: tGlobal(p.claveNombre, p.nombreEs),
        celdas: structuredClone(p.celdas),
        filas: p.filas,
        cols: p.cols,
        creadoEn: ahora,
        actualizadoEn: ahora,
      }),
    )
  }
  if (nuevas.length) await db.hojasCalculo.bulkAdd(nuevas)
}

/** Los `carpetaId` de las áreas: el árbol nace plegado por ellas. */
export function carpetasSembradas(): string[] {
  return catalogoActual().map((a) => `cat-${a.id}`)
}
