/**
 * Marcador de la casa demo (middleware DBCore).
 *
 * En el demo se puede hacer TODO: es una plantilla llena que sirve para ver la
 * app funcionando de verdad. Nada de lo que el visitante escriba sobrevive a
 * una recarga — este middleware no bloquea, apunta: registra qué tablas se
 * ensuciaron para que `demo/sandbox.ts` reponga solo esas desde la foto del
 * original (la repone `db.ts` en `on('ready')`).
 *
 * Se instala en `db.ts` únicamente con `esDemo()`, por FUERA del middleware de
 * sync (level 2 > 1), así un solo punto cubre repos, stores de la casa, seeds
 * y cualquier código futuro. No apunta las transacciones de la construcción ni
 * de la propia reposición (`construyendo`), ni las del pull del motor.
 */
import type { DBCore, DBCoreMutateRequest, DBCoreMutateResponse, Middleware } from 'dexie'
import { claveLS, esDemo } from '../edicion'
import { limpiarSandboxDemoSucio, marcarSandboxDemoSucio } from '../../demo/modo'
import { useAvisoDemo } from '../state/avisosPlanStore'

/** Tablas que el visitante escribió en esta carga (y en las anteriores sin reponer). */
const LS_TABLAS = 'mh.sandbox.tablas'

function leerTablas(): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(claveLS(LS_TABLAS)) ?? 'null') as unknown
    return new Set(Array.isArray(raw) ? (raw as string[]) : [])
  } catch {
    return new Set()
  }
}

// Espejo en memoria: se consulta en cada mutación, y solo se escribe cuando
// aparece una tabla nueva.
const sucias = typeof localStorage !== 'undefined' && esDemo() ? leerTablas() : new Set<string>()

/** Las tablas por reponer al recargar (ver demo/sandbox.ts). */
export function tablasSucias(): string[] {
  return [...sucias]
}

export function limpiarTablasSucias(): void {
  sucias.clear()
  localStorage.removeItem(claveLS(LS_TABLAS))
}

/** Deja de considerar sucias esas tablas: ya se fotografiaron como originales. */
export function desapuntarTablas(nombres: string[]): void {
  for (const n of nombres) sucias.delete(n)
  if (sucias.size) {
    localStorage.setItem(claveLS(LS_TABLAS), JSON.stringify([...sucias]))
    return
  }
  // Sin lista, `reponer()` cree que se perdió el apunte y repone la BD entera:
  // la marca de sucio tiene que irse con ella.
  localStorage.removeItem(claveLS(LS_TABLAS))
  limpiarSandboxDemoSucio()
}

/**
 * Construcción PEREZOSA del año de una app (la que se abre tarde). Sus
 * escrituras se apuntan igual —si la pestaña muere a medias, la recarga limpia
 * las tablas a medio llenar y la app se reconstruye entera—, pero no son
 * «cambios del visitante»: ni encienden el aviso ni cuentan como suciedad. La
 * colecta dice además qué tablas tocó el builder, para fotografiarlas.
 */
let colector: Set<string> | null = null

export function empezarColectaPerezosa(): void {
  colector = new Set()
}

export function terminarColectaPerezosa(): string[] {
  const tocadas = [...(colector ?? [])]
  colector = null
  return tocadas
}

// Mientras el orquestador construye el demo —o lo repone— TODO pasa sin
// apuntarse: snapshot, seeds, builders y la propia reposición.
let construyendo = false
export function setConstruyendoDemo(v: boolean): void {
  construyendo = v
}

// Un tutorial escribe por su cuenta —crea el dato de ejemplo y lo borra al
// salir— y lo hace justo después del click en «Siguiente», así que el
// heurístico de abajo lo tomaba por una edición del visitante: el aviso salía
// solo y encima tapaba el spotlight (velo z-70 sobre overlay z-60). El trato se
// cuenta cuando el visitante edita POR SU CUENTA. Las tablas se apuntan igual:
// lo que el tour escribió también hay que reponerlo al recargar.
let enTutorial = false
export function setTutorialActivo(v: boolean): void {
  enTutorial = v
}

// Los procesos de fondo también escriben: se apuntan igual, pero solo una
// mutación cercana a un click/tecla del usuario explica el trato una vez.
let ultimaInteraccion = 0
let avisado = false
if (typeof window !== 'undefined' && esDemo()) {
  const marcar = () => {
    ultimaInteraccion = Date.now()
  }
  window.addEventListener('pointerdown', marcar, true)
  window.addEventListener('keydown', marcar, true)
}

interface TransMarcada {
  __mhAplicandoPull?: boolean
}

function apuntar(nombre: string): void {
  if (!sucias.has(nombre)) {
    sucias.add(nombre)
    localStorage.setItem(claveLS(LS_TABLAS), JSON.stringify([...sucias]))
    marcarSandboxDemoSucio()
  }
  // El aviso del trato solo sale si el cambio lo hizo el VISITANTE por su
  // cuenta: los procesos de fondo (racha de Sísifo, la edición del día del
  // diario…) también escriben y también se reponen, pero no son «sus cambios».
  if (enTutorial || colector) return
  if (Date.now() - ultimaInteraccion >= 3000) return
  if (!avisado) {
    avisado = true
    useAvisoDemo.getState().abrir()
  }
}

export const demoGuard: Middleware<DBCore> = {
  stack: 'dbcore',
  name: 'mh-demo-marcador',
  level: 2,
  create(down) {
    return {
      ...down,
      table(nombre) {
        const tabla = down.table(nombre)
        if (nombre.startsWith('_')) return tabla
        return {
          ...tabla,
          mutate(req: DBCoreMutateRequest): Promise<DBCoreMutateResponse> {
            // Dentro del `mutate` (no en la fábrica `table`): esta corre una
            // sola vez al montar el stack DBCore y congelaría el estado.
            if (!construyendo && (req.trans as TransMarcada).__mhAplicandoPull !== true) {
              colector?.add(nombre)
              apuntar(nombre)
            }
            return tabla.mutate(req)
          },
        }
      },
    }
  },
}
