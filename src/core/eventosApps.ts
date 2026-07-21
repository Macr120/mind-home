import { useLiveQuery } from 'dexie-react-hooks'
import { plantillasTodas, type EventoApp } from './registry'

/**
 * Un evento ya resuelto: con el emoji y el color que le faltaban, y con la app de
 * la que salió (que la app no declara — sería repetir lo que ya se sabe por el
 * proveedor — pero el chip necesita para saber a dónde llevar al tocarlo).
 */
export interface EventoResuelto extends EventoApp {
  plantillaId: string
  emoji: string
  color: string
}

/**
 * Los eventos con fecha que aportan las apps al calendario, agrupados por día.
 *
 * Antes esto era el mapa de viajes cableado dentro de `CalendarioVista`: el
 * calendario importaba los repos de sala y sabía de sus lugares e itinerarios.
 * Ahora cada app lo declara con `eventos` en su `Plantilla` y el calendario solo
 * pinta lo que le llega, sin conocer a nadie.
 *
 * A propósito NO se filtra por las apps asignadas a un objeto: los viajes se
 * pintaban siempre, y gatearlos ahora los haría desaparecer del calendario de
 * quien no tenga la sala amueblada. La meta diaria sí sigue esa regla.
 */
export function useEventosApps(): Map<string, EventoResuelto[]> {
  return (
    useLiveQuery(async () => {
      const mapa = new Map<string, EventoResuelto[]>()
      for (const p of plantillasTodas()) {
        if (!p.eventos) continue
        for (const e of await p.eventos()) {
          if (!e.fecha) continue
          // El emoji y el color son opcionales: sin ellos manda la identidad de la app.
          const evento: EventoResuelto = {
            ...e,
            plantillaId: p.id,
            emoji: e.emoji ?? p.icon,
            color: e.color ?? p.color,
          }
          mapa.set(e.fecha, [...(mapa.get(e.fecha) ?? []), evento])
        }
      }
      return mapa
    }, []) ?? new Map()
  )
}
