import { create } from 'zustand'
import { db, type CultivoCelda, type EspecieCultivo } from '../data/db'
import { useLayout } from './layoutStore'
import { useHouse } from './houseStore'
import { useCam, type Vista } from './cameraStore'
import { playerPos } from './playerPosition'
import { setCuartoAbierto } from '../house/movement'
import { estadoCultivo, celdasRegadas } from '../house/cultivos'

export type HerramientaHuerto = 'parcela' | 'sembrar' | 'regar' | 'cosechar' | 'aspersor' | 'quitar'

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
    set({ activo: true, herramienta: 'parcela' })
    setCuartoAbierto(true)
    casa.target.set(playerPos.x, 0, playerPos.z)
  },

  salir: () => {
    if (!get().activo) return
    set({ activo: false })
    setCuartoAbierto(false)
    useCam.getState().setVista(vistaAnterior)
  },

  setHerramienta: (herramienta) => set({ herramienta }),
  setEspecie: (especie) => set({ especie, herramienta: 'sembrar' }),

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
