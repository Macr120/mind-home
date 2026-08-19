import { create } from 'zustand'
import { db, type CultivoCelda, type EspecieCultivo } from '../data/db'
import { useLayout } from './layoutStore'
import { useHouse } from './houseStore'
import { useCam, type Vista } from './cameraStore'
import { playerPos } from './playerPosition'
import { setCuartoAbierto } from '../house/movement'
import { bandaDeLado, type LadoRect, type RectCeldas } from '../house/ResizeCeldas3D'
import { estadoCultivo, celdasRegadas, MARCHITO_VISIBLE_MIN } from '../house/cultivos'

export type HerramientaHuerto =
  | 'parcela'
  | 'sembrar'
  | 'regar'
  | 'cosechar'
  | 'aspersor'
  | 'mover'
  | 'quitar'

/**
 * Cosecha una parcela lista: limpia el cultivo, suma su contador y manda la
 * cosecha a la cesta. La usan la herramienta del editor y la cosecha al caminar.
 */
export async function cosecharParcela(previa: CultivoCelda): Promise<void> {
  if (previa.id == null || !previa.especie) return
  const esp = previa.especie
  await db.cultivos.update(previa.id, {
    especie: undefined,
    plantadoEn: undefined,
    regadoEn: undefined,
    cosechas: (previa.cosechas ?? 0) + 1,
  })
  // La cosecha va a la cesta (alimento de los animales de la granja).
  const fila = await db.cesta.where('especie').equals(esp).first()
  if (fila?.id != null) await db.cesta.update(fila.id, { cantidad: fila.cantidad + 1 })
  else await db.cesta.add({ especie: esp, cantidad: 1 })
}

/**
 * Cosecha por id, releyendo la fila de la BD: la usa el botón «Cosechar» del
 * hueco del cubo, que solo lleva el id (así el panel no tiene que suscribirse a
 * la tabla de cultivos entera para pintar un botón).
 */
export async function cosecharParcelaPorId(id: number): Promise<void> {
  const fila = await db.cultivos.get(id)
  if (fila) await cosecharParcela(fila)
}

/**
 * Riega de golpe todo el huerto (lo pide el chat: «riega el huerto»). Salta lo
 * listo y lo marchito, que ya no cambian con agua. Devuelve cuántos regó.
 */
export async function regarTodo(): Promise<number> {
  const todas = await db.cultivos.toArray()
  const regadas = celdasRegadas(todas)
  const ahora = Date.now()
  let n = 0
  for (const c of todas) {
    if (c.id == null) continue
    const e = estadoCultivo(c, ahora, regadas.get(`${c.col},${c.row}`))
    if (!e || e.etapa === 'listo' || e.etapa === 'marchito') continue
    await db.cultivos.update(c.id, { regadoEn: ahora })
    n++
  }
  return n
}

/**
 * Barrido de marchitos: pasada su ventana visible, el cultivo perdido se borra
 * y la parcela queda como nueva (tierra vacía, lista para volver a sembrar; se
 * conserva su contador de cosechas). Devuelve cuántas limpió.
 */
export async function limpiarMarchitos(ahora = Date.now()): Promise<number> {
  const todas = await db.cultivos.toArray()
  const regadas = celdasRegadas(todas)
  let n = 0
  for (const c of todas) {
    if (c.id == null || !c.especie) continue
    const e = estadoCultivo(c, ahora, regadas.get(`${c.col},${c.row}`))
    if (e?.etapa !== 'marchito' || e.marchitoEn == null) continue
    if (ahora - e.marchitoEn < MARCHITO_VISIBLE_MIN * 60_000) continue
    await db.cultivos.update(c.id, { especie: undefined, plantadoEn: undefined, regadoEn: undefined })
    n++
  }
  return n
}

/** Cosecha todas las parcelas listas (todo va a la cesta). Devuelve cuántas. */
export async function cosecharTodo(): Promise<number> {
  const todas = await db.cultivos.toArray()
  const regadas = celdasRegadas(todas)
  const ahora = Date.now()
  let n = 0
  for (const c of todas) {
    if (estadoCultivo(c, ahora, regadas.get(`${c.col},${c.row}`))?.etapa !== 'listo') continue
    await cosecharParcela(c)
    n++
  }
  return n
}

interface HuertoState {
  /** El editor del huerto está abierto (trabajando sobre el mapa). */
  activo: boolean
  herramienta: HerramientaHuerto
  especie: EspecieCultivo
  /** Parcela agarrada con la herramienta 'mover' (su celda actual). */
  sel: { col: number; row: number } | null
  /** Arrastre en curso: dónde se está viendo la parcela mientras el dedo la lleva. */
  moverPreview: { id: number; col: number; row: number } | null
  setMoverPreview: (p: { id: number; col: number; row: number } | null) => void
  /** Lleva la parcela (con su cultivo y su aspersor) a esa celda. false si está ocupada. */
  moverParcela: (id: number, col: number, row: number) => Promise<boolean>
  /** Agranda (+1) o encoge (−1) el tablón por ese lado: siembra o levanta esa fila. */
  redimensionarTablon: (rect: RectCeldas, lado: LadoRect, delta: 1 | -1) => Promise<boolean>
  iniciar: () => void
  salir: () => void
  setHerramienta: (h: HerramientaHuerto) => void
  setEspecie: (e: EspecieCultivo) => void
  /** Aplica la herramienta activa sobre una celda del mapa (escribe a db.cultivos). */
  aplicarEnCelda: (col: number, row: number) => Promise<void>
}

// Vista de juego a restaurar al salir del editor (solo iso/tercera/primera).
let vistaAnterior: Vista = 'iso'

export const useHuerto = create<HuertoState>((set, get) => ({
  activo: false,
  herramienta: 'parcela',
  especie: 'zanahoria',
  sel: null,
  moverPreview: null,

  iniciar: () => {
    const layout = useLayout.getState()
    if (get().activo || layout.editMode) return
    // El editor de cuarto puede estar solo OCULTO (menú abierto): salir de él para
    // que al cerrarse el menú no se restaure encima de este editor.
    if (layout.editingRoomId) layout.editRoom(null)
    const casa = useHouse.getState()
    if (casa.activeRoom) casa.closeRoom()
    const v = useCam.getState().vista
    vistaAnterior = v === 'tercera' || v === 'primera' ? v : 'iso'
    useCam.getState().setVista('iso')
    set({ activo: true, herramienta: 'parcela', sel: null, moverPreview: null })
    setCuartoAbierto(true)
    casa.target.set(playerPos.x, 0, playerPos.z)
  },

  salir: () => {
    if (!get().activo) return
    set({ activo: false, sel: null, moverPreview: null })
    setCuartoAbierto(false)
    useCam.getState().setVista(vistaAnterior)
  },

  // Pasar a «Mover» CONSERVA la parcela ya elegida (viene de la pulsación larga en
  // el mapa): es justo la que se va a arrastrar.
  setHerramienta: (herramienta) =>
    set((s) => ({
      herramienta,
      sel: herramienta === 'mover' ? s.sel : null,
      moverPreview: null,
    })),
  setEspecie: (especie) => set({ especie, herramienta: 'sembrar', sel: null, moverPreview: null }),

  setMoverPreview: (moverPreview) => set({ moverPreview }),

  redimensionarTablon: async (rect, lado, delta) => {
    if (delta === -1 && ((lado === 'izq' || lado === 'der' ? rect.ancho : rect.alto) <= 1)) return false
    const { gridCols, gridRows } = useLayout.getState()
    const banda = bandaDeLado(rect, lado, delta)
    if (banda.some((c) => c.col < 0 || c.row < 0 || c.col >= gridCols || c.row >= gridRows)) return false
    const todas = await db.cultivos.toArray()
    for (const c of banda) {
      const previa = todas.find((x) => x.col === c.col && x.row === c.row)
      if (delta === 1) {
        // Crecer: la fila nueva nace como tierra; lo que ya hubiera ahí se respeta.
        if (!previa) await db.cultivos.add({ col: c.col, row: c.row })
      } else if (previa?.id != null) {
        // Encoger: se levanta la fila entera (con lo que tuviera sembrado).
        await db.cultivos.delete(previa.id)
      }
    }
    // Si la parcela agarrada estaba en la fila levantada, se suelta.
    const sel = get().sel
    if (delta === -1 && sel && banda.some((c) => c.col === sel.col && c.row === sel.row)) {
      set({ sel: null })
    }
    return true
  },

  moverParcela: async (id, col, row) => {
    const todas = await db.cultivos.toArray()
    // La celda destino tiene que estar libre: el índice [col+row] es único.
    if (todas.some((c) => c.id !== id && c.col === col && c.row === row)) return false
    const { gridCols, gridRows } = useLayout.getState()
    if (col < 0 || row < 0 || col >= gridCols || row >= gridRows) return false
    await db.cultivos.update(id, { col, row })
    return true
  },

  aplicarEnCelda: async (col, row) => {
    const { herramienta, especie } = get()
    const todas = await db.cultivos.toArray()
    const previa = todas.find((c) => c.col === col && c.row === row)
    const estado = previa
      ? estadoCultivo(previa, Date.now(), celdasRegadas(todas).get(`${col},${row}`))
      : null

    switch (herramienta) {
      case 'parcela':
        // Toggle de tierra: crea la parcela, o quita la vacía (con cultivo o aspersor no hace nada).
        if (!previa) await db.cultivos.add({ col, row })
        else if (previa.id != null && !previa.especie && previa.aspersorEn == null)
          await db.cultivos.delete(previa.id)
        return
      case 'sembrar': {
        const ahora = Date.now()
        if (!previa) await db.cultivos.add({ col, row, especie, plantadoEn: ahora, regadoEn: ahora })
        else if (previa.id != null && !previa.especie)
          await db.cultivos.update(previa.id, { especie, plantadoEn: ahora, regadoEn: ahora })
        return
      }
      case 'regar':
        // Solo cultivos en crecimiento: lo listo/marchito ya no cambia con agua.
        if (previa?.id != null && estado && estado.etapa !== 'listo' && estado.etapa !== 'marchito')
          await db.cultivos.update(previa.id, { regadoEn: Date.now() })
        return
      case 'cosechar':
        if (previa != null && estado?.etapa === 'listo') await cosecharParcela(previa)
        return
      case 'aspersor':
        // Toggle: instala el aspersor (creando la parcela si hace falta) o lo quita.
        if (!previa) await db.cultivos.add({ col, row, aspersorEn: Date.now() })
        else if (previa.id != null)
          await db.cultivos.update(previa.id, {
            aspersorEn: previa.aspersorEn == null ? Date.now() : undefined,
          })
        return
      case 'mover': {
        const { sel } = get()
        const agarrada = sel ? todas.find((c) => c.col === sel.col && c.row === sel.row) : undefined
        // Tocar una parcela la agarra; tocar la que ya estaba agarrada, la suelta.
        if (previa) {
          set({ sel: agarrada && previa.id === agarrada.id ? null : { col, row } })
          return
        }
        // Celda libre con una parcela agarrada: se muda entera (cultivo y aspersor incluidos).
        if (agarrada?.id == null) return
        if (await get().moverParcela(agarrada.id, col, row)) set({ sel: { col, row } })
        return
      }
      case 'quitar':
        // De a uno: cultivo (marchito incluido) → aspersor → parcela vacía.
        if (previa?.id == null) return
        if (previa.especie)
          await db.cultivos.update(previa.id, { especie: undefined, plantadoEn: undefined, regadoEn: undefined })
        else if (previa.aspersorEn != null) await db.cultivos.update(previa.id, { aspersorEn: undefined })
        else await db.cultivos.delete(previa.id)
        return
    }
  },
}))

if (import.meta.env.DEV) {
  ;(window as unknown as { useHuerto: typeof useHuerto }).useHuerto = useHuerto
}
