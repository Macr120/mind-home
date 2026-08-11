import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { playerPos, useHouse } from '../state/houseStore'
import { useCargar, RADIO_CARGA_OBJETO, RADIO_CARGA_CUARTO, type CandidatoCarga } from '../state/cargarStore'
import { useContexto, type AccionContextual } from '../state/contextoStore'
import { useDiseño, esObjetoMapa, esObjetoLibreria } from '../state/disenoStore'
import { useLayout, roomWorldPos } from '../state/layoutStore'
import { useAccionCuarto, accionCuartoFrame, RADIO_ACCION, type TipoAccionCuarto } from '../state/accionCuartoStore'
import { useParque, esJuegoParque } from '../state/parqueStore'
import { useFlotador, TIPO_FLOTADOR } from '../state/flotadorStore'
import { useMontura, monturaFrame } from '../state/monturaStore'
import { useHuerto } from '../state/huertoStore'
import { useHerramienta } from '../state/herramientaStore'
import { useTren, trenFrame } from '../state/trenStore'
import { useJuegoCancha } from '../state/juegoCanchaStore'
import { useCarrera } from '../state/carreraStore'
import { esCancha } from '../state/canchasStore'
import { useGranjaCerca } from '../state/granjaCercaStore'
import { corralSucio, estaEnfermo } from '../state/granjaStore'
import { VACIO, cultivosRepo, corralesRepo, cestaRepo, animalesRepo } from '../data/repository'
import { estadoCultivo, celdasRegadas } from './cultivos'
import { esAnuncio } from './especiales'
import { tipoPistolaDeObjeto } from './arma'
import { tieneAnimacion } from './animacion'
import { posObjetosVivos } from './vidaObjeto'
import { dragChar } from './characterDrag'
import {
  esAmbientalPlantilla,
  TIPO_CAMINADORA,
  TIPO_ESTACION_COMPUTO,
  TIPO_LAPTOP,
  TIPO_LIBRETA,
  TIPO_SILLON,
  TIPO_TAPETE,
} from './especialesPlantillaMeta'
import { worldToSubCell, subId, roomSubCells, footprintCells, cellToWorld, HALF, FOOTPRINT_DEFAULT } from './walls'

/**
 * Detector ÚNICO de lo que el personaje tiene al alcance. Publica en
 * `contextoStore` las acciones que ofrece el objeto más cercano y en
 * `cargarStore` el candidato a "Mover"; el hueco del cubo de vistas
 * (`ControlHerramienta`) las pinta como botones.
 *
 * Sustituye a seis detectores que hacían lo mismo por separado —
 * `CargarProximidad`, `ParqueProximity`, `FlotadorProximity`, `PistolaProximity`,
 * `HuertoProximity` y `useAbordarAccion` (uno por usable) — y, sobre todo,
 * cambia la regla: los cuatro últimos ACTIVABAN solos (te sentaban al pasar, te
 * subían al carrusel, cosechaban al caminar, equipaban la pistola borrando el
 * objeto del mapa) mientras que una silla del catálogo, al mismo radio, pedía
 * botón. Ahora la proximidad solo decide qué botones existen.
 *
 * Un solo `useFrame` a 5 Hz para toda la casa (antes eran ~10 en paralelo, cada
 * uno recorriendo la lista completa de objetos). Siguen aparte `VehiculoProximity`
 * y `AccionGenerica`: ya eran contextuales, y esta última mide la altura real del
 * asiento con un raycast al objeto 3D que no se puede reproducir desde los datos.
 *
 * SOLO se consideran los objetos del cuarto donde está el jugador (o los del mapa
 * si está fuera de todo cuarto). Eso resuelve de paso dos falsos positivos que el
 * detector de carga tenía y que antes no se notaban porque exigía equipar la
 * herramienta: ofrecer objetos del piso de arriba (la distancia es solo en XZ) y
 * objetos de dentro de un cuarto estando tú fuera, atravesando la pared.
 */

/** Radio para subirse a un juego del parque (antes en `especiales.tsx`). */
const RADIO_ABORDAR = 2.6
/** Radio para sentarse en la dona flotadora (antes en `flotador.tsx`). */
const RADIO_SENTARSE = 1.3
/** Radio para cosechar una parcela lista (antes en `huerto.tsx`). */
const RADIO_COSECHA = 2.0
/** Radio para recoger una pistola colocada en el mapa (antes en `arma.tsx`). */
const RADIO_TOMAR = 1.1

/** Los 6 objetos de plantilla que el personaje usa con una pose guionizada. */
const USABLE_PLANTILLA: Record<string, TipoAccionCuarto> = {
  [TIPO_CAMINADORA]: 'caminadora',
  [TIPO_LAPTOP]: 'laptop',
  [TIPO_TAPETE]: 'tapete-yoga',
  [TIPO_LIBRETA]: 'libreta',
  [TIPO_SILLON]: 'sillon-lectura',
  [TIPO_ESTACION_COMPUTO]: 'estacion-computo',
}

/** Lista vacía estable: evita crear un array nuevo en cada barrido. */
const SIN_ACCIONES: AccionContextual[] = []

export function ContextoProximity() {
  // El huerto es el único que necesita datos de Dexie; se leen aquí (reactivo) y
  // el useFrame los consulta por ref, como hacía `HuertoProximity`.
  const filas = cultivosRepo.useAll() ?? VACIO
  const regadas = useMemo(() => celdasRegadas(filas), [filas])
  const cultivos = useRef({ filas, regadas })
  cultivos.current = { filas, regadas }

  // Granja: mismo caso que el huerto — los datos viven en Dexie y los cuidados
  // dependen de ellos (cuánto hay en la cesta, cuántos animales enfermos).
  const corrales = corralesRepo.useAll() ?? VACIO
  const cesta = cestaRepo.useAll() ?? VACIO
  const animales = animalesRepo.useAll() ?? VACIO
  const granja = useRef({ corrales, cesta, animales })
  granja.current = { corrales, cesta, animales }

  const acc = useRef(Math.random() * 0.2)

  useFrame((_st, delta) => {
    acc.current += delta
    if (acc.current < 0.2) return
    acc.current = 0

    const contexto = useContexto.getState()
    const carga = useCargar.getState()
    /** Nada al alcance: apaga los dos canales (el `cerca` pegado era un bug real). */
    const limpiar = () => {
      if (carga.cerca) carga.setCerca(null)
      contexto.setAcciones(SIN_ACCIONES)
    }

    // Cargando un objeto: el único botón es "Soltar", que `PanelMover` saca de
    // `sujeto`. No se ofrece nada más hasta dejarlo.
    if (carga.sujeto) {
      contexto.setAcciones(SIN_ACCIONES)
      return
    }

    const { transicion, playerLevel } = useHouse.getState()
    const L = useLayout.getState()
    if (transicion || L.editMode || dragChar.id) return limpiar()
    // Montado, sentado, acostado o jugando: solo debe quedar el botón de salida
    // (lo pinta el panel de cada sistema, no este detector).
    if (
      useMontura.getState().instanciaId != null ||
      useAccionCuarto.getState().instanciaId != null ||
      useParque.getState().instanciaId != null ||
      useFlotador.getState().instanciaId != null ||
      useHuerto.getState().activo ||
      monturaFrame.montado ||
      accionCuartoFrame.usando ||
      trenFrame.montado
    )
      return limpiar()

    // --- Cuartos primero: da el cuarto donde estás (filtro de los objetos) y el
    // candidato a cargar un cuarto entero.
    const sub = worldToSubCell(playerPos.x, playerPos.z)
    const subJugador = subId(sub.sc, sub.sr)
    let roomIdActual: string | null = null
    let mejorDist = Infinity
    let mejorCarga: CandidatoCarga | null = null

    for (const id of Object.keys(L.placed)) {
      if (!L.placed[id] || !L.cells[id]) continue
      if ((L.niveles[id] ?? 0) !== playerLevel) continue
      const fp = L.footprints[id] ?? FOOTPRINT_DEFAULT
      if (roomSubCells(L.cells[id], fp).includes(subJugador)) {
        roomIdActual = id
        continue // dentro de un cuarto no se puede agarrar ese mismo cuarto
      }
      // Distancia al BORDE del cuarto: desde fuera, el centro de la celda más
      // cercana ya está a media celda, así que medir a los centros dejaba una
      // ventana de centímetros (o ninguna) para poder agarrarlo.
      let dCuarto = Infinity
      for (const c of footprintCells(L.cells[id], fp)) {
        const [wx, , wz] = cellToWorld(c.col, c.row)
        const dx = Math.max(0, Math.abs(playerPos.x - wx) - HALF)
        const dz = Math.max(0, Math.abs(playerPos.z - wz) - HALF)
        const d = Math.hypot(dx, dz)
        if (d < dCuarto) dCuarto = d
      }
      if (dCuarto <= RADIO_CARGA_CUARTO && dCuarto < mejorDist) {
        mejorDist = dCuarto
        mejorCarga = { tipo: 'cuarto', id }
      }
    }

    // Los cuartos SOLO se agarran desde fuera de todo cuarto. Estando dentro, el
    // radio al borde alcanza al cuarto de al lado (y las puertas están justo en el
    // borde), así que salía «Agarrar cuarto» al entrar a cualquier sitio — y
    // cargarlo INMOVILIZA al personaje en cuanto el cuarto no cabe hacia donde
    // camina (`resolverAvanceConCarga` cancela el avance como si fuera un muro).
    if (roomIdActual != null && mejorCarga?.tipo === 'cuarto') {
      mejorCarga = null
      mejorDist = Infinity
    }

    // --- Objetos del cuarto actual (o del mapa, si el jugador está fuera).
    const objetos = useDiseño.getState().objetos
    // Un solo roomWorldPos para todos: antes se pedía uno POR OBJETO.
    const centro = roomIdActual != null ? roomWorldPos(roomIdActual) : null
    const enAgua = L.subCeldasAgua.has(subJugador)
    const equipadas = useHerramienta.getState().equipadas
    /** Objeto más cercano que ofrece algo: de él salen TODOS los botones (no se
     *  mezclan acciones de dos objetos distintos en la misma pila). */
    let foco: { acciones: AccionContextual[]; d: number } | null = null

    for (const o of objetos) {
      if (o.id == null || esObjetoLibreria(o)) continue
      let wx: number
      let wz: number
      if (esObjetoMapa(o)) {
        if (roomIdActual != null || playerLevel !== 0) continue
        wx = o.x ?? 0
        wz = o.z ?? 0
      } else {
        if (o.roomId !== roomIdActual || !centro) continue
        wx = centro[0] + (o.x ?? 0)
        wz = centro[2] + (o.z ?? 0)
      }
      // Un objeto con «Dale vida» deambula: se mide contra su posición VIVA, no
      // contra la que tiene guardada (ahí ya no está).
      const vivo = o.animacion?.preset === 'vida' ? posObjetosVivos[o.id] : undefined
      if (vivo) {
        wx = vivo.x
        wz = vivo.z
      }
      const d = Math.hypot(playerPos.x - wx, playerPos.z - wz)

      // Candidato a "Mover": las canchas quedan fuera (son enormes y ofrecerían
      // agarrarlas con solo pisar su centro).
      if (d <= RADIO_CARGA_OBJETO && d < mejorDist && !esCancha(o.tipo)) {
        mejorDist = d
        mejorCarga = { tipo: 'objeto', id: o.id }
      }

      if (foco && d >= foco.d) continue
      const acciones: AccionContextual[] = []
      const rotY = ((o.rotY ?? 0) * Math.PI) / 180

      const usable = USABLE_PLANTILLA[o.tipo]
      if (usable && d <= RADIO_ACCION) {
        acciones.push({ tipo: 'usable', id: o.id, usable, wx, wz, rotY })
      }
      if (esJuegoParque(o.tipo) && esObjetoMapa(o) && d <= RADIO_ABORDAR) {
        acciones.push({ tipo: 'juego', id: o.id })
      }
      if (o.tipo === TIPO_FLOTADOR && enAgua && d <= RADIO_SENTARSE) {
        acciones.push({ tipo: 'flotador', id: o.id, wx, wz })
      }
      if (esObjetoMapa(o) && d <= RADIO_TOMAR) {
        const pistola = tipoPistolaDeObjeto(o, objetos)
        // Ya en la mano: no ofrecer recogerla otra vez (equipar es un toggle).
        if (pistola && !equipadas.includes(pistola)) {
          acciones.push({ tipo: 'recoger', id: o.id, pistola })
        }
      }
      if (d <= RADIO_CARGA_OBJETO) {
        if (vivo) {
          // Un objeto con vida se cuida, no se «interactúa»: sus dos botones
          // sustituyen al de encender la animación (que ya está encendida).
          acciones.push({ tipo: 'alimentarObjeto', id: o.id })
          acciones.push({ tipo: 'acariciarObjeto', id: o.id })
          if (o.plantillaId) {
            acciones.push({ tipo: 'interactuar', id: o.id, plantillaId: o.plantillaId, roomId: o.roomId })
          }
        } else if (esAnuncio(o.tipo)) {
          acciones.push({ tipo: 'letrero', id: o.id })
        } else {
          // "Animado" incluye los objetos principales de plantilla: su animación
          // está cableada en el componente, no en `o.animacion`.
          const animado = tieneAnimacion(o.animacion) || esAmbientalPlantilla(o.tipo)
          if (o.plantillaId || animado) {
            acciones.push({
              tipo: 'interactuar',
              id: o.id,
              plantillaId: o.plantillaId,
              roomId: o.roomId,
              animado,
            })
          }
        }
      }
      if (acciones.length > 0) foco = { acciones, d }
    }

    // --- Cosecha: las parcelas no son objetos, van por su propia tabla.
    if (roomIdActual == null && playerLevel === 0) {
      const { filas, regadas } = cultivos.current
      const ahora = Date.now()
      for (const f of filas) {
        if (!f.especie || f.id == null) continue
        const [wx, , wz] = cellToWorld(f.col, f.row)
        const d = Math.hypot(playerPos.x - wx, playerPos.z - wz)
        if (d > RADIO_COSECHA) continue
        if (estadoCultivo(f, ahora, regadas.get(`${f.col},${f.row}`))?.etapa !== 'listo') continue
        if (!foco || d < foco.d) foco = { acciones: [{ tipo: 'cosechar', id: f.id }], d }
        break
      }
    }

    // --- Sistemas con detección propia (vía, cancha, meta de circuito): ya
    // publican su candidato en su store, aquí solo se convierten en botón. Van
    // ANTES que el foco por objeto porque no compiten por distancia: son sitios
    // en los que estás parado, no cosas a las que te acercas.
    const acciones: AccionContextual[] = []
    const tren = useTren.getState().cerca
    if (tren) acciones.push({ tipo: 'tren', id: 0, riel: tren.tipo })
    const cancha = useJuegoCancha.getState()
    if (cancha.cerca && cancha.fase == null) {
      acciones.push({ tipo: 'cancha', id: cancha.cerca.canchaId, clase: cancha.cerca.clase })
    }
    if (useCarrera.getState().cerca) acciones.push({ tipo: 'carrera', id: 0 })

    // Escalera/ascensor al alcance (lo publica `AccesoProximity`). Conduciendo no
    // se cambia de piso: la transición asume al peatón.
    const casa = useHouse.getState()
    if (casa.nearAcceso && casa.nearDir) {
      const subir = casa.nearDir === 'subir'
      acciones.push({
        tipo: 'nivel',
        id: 0,
        subir,
        nivelDestino: subir ? casa.nearAcceso.nivel : casa.nearAcceso.nivel - 1,
      })
    }

    // Corral de la granja: los cuidados que antes vivían en una burbuja anclada
    // sobre el corral. Curar y limpiar solo salen cuando hacen falta, para no
    // llevar cuatro botones encima todo el rato.
    const corralId = useGranjaCerca.getState().corralId
    if (corralId != null) {
      const corral = granja.current.corrales.find((c) => c.id === corralId)
      if (corral) {
        const ahora = Date.now()
        acciones.push({
          tipo: 'alimentar',
          id: corralId,
          cantidad: granja.current.cesta.reduce((n, c) => n + c.cantidad, 0),
        })
        acciones.push({ tipo: 'acariciar', id: corralId })
        const enfermos = granja.current.animales.filter(
          (a) => a.corralId === corralId && estaEnfermo(a, ahora),
        ).length
        if (enfermos > 0) acciones.push({ tipo: 'curar', id: corralId, cantidad: enfermos })
        if (corralSucio(corral, ahora)) acciones.push({ tipo: 'limpiar', id: corralId })
      }
    }

    acciones.push(...(foco?.acciones ?? []))

    if (carga.cerca?.tipo !== mejorCarga?.tipo || carga.cerca?.id !== mejorCarga?.id) {
      carga.setCerca(mejorCarga)
    }
    contexto.setAcciones(acciones.length ? acciones : SIN_ACCIONES)
  })

  return null
}
