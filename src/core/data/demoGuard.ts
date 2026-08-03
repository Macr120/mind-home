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
import { marcarSandboxDemoSucio } from '../../demo/modo'
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

// Aviso a la UI de que ya hay cambios que descartar; lo inyecta el sandbox
// para que este módulo no importe de `demo/` (ciclo con db.ts).
let alEnsuciar: (() => void) | null = null
export function registrarAlEnsuciar(fn: () => void): void {
  alEnsuciar = fn
}

// Mientras el orquestador construye el demo —o lo repone— TODO pasa sin
// apuntarse: snapshot, seeds, builders y la propia reposición.
let construyendo = false
export function setConstruyendoDemo(v: boolean): void {
  construyendo = v
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
  // El botón «Descartar mis cambios» y el aviso del trato solo salen si el
  // cambio lo hizo el VISITANTE: los procesos de fondo (racha de Sísifo, la
  // edición del día del diario…) también escriben y también se reponen, pero
  // no son «sus cambios».
  if (Date.now() - ultimaInteraccion >= 3000) return
  alEnsuciar?.()
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
              apuntar(nombre)
            }
            return tabla.mutate(req)
          },
        }
      },
    }
  },
}
