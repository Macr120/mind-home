import { accionFrame, useHerramienta } from '../state/herramientaStore'
import { useCarrera } from '../state/carreraStore'
import { useHouse } from '../state/houseStore'
import { useHud } from '../state/hudStore'
import { useLayout } from '../state/layoutStore'
import { useMontura } from '../state/monturaStore'
import { useDiseño } from '../state/disenoStore'
import { escribiendoEnCampo, hayCuartoAbierto, espacioTomado, mayusTomado } from './movement'

/**
 * Atajos de teclado del personaje (PC), aparte de WASD/flechas que maneja
 * `movement.ts`:
 *
 * - **Espacio**: saltar · **Ctrl**: agacharse (sostenido) · **Mayús**: correr.
 * - **1 / 2**: mano derecha / izquierda · **3**: bailar · **4**: mortal.
 * - **E**: la acción que tengas delante (entrar al cuarto, subirte o bajarte del
 *   vehículo, cambiar de nivel), en el mismo orden en que aparecen sus botones.
 * - **H**: esconder/mostrar el HUD.
 *
 * Funcionan sin equipar la herramienta: son controles directos del personaje.
 * (La rueda vive en `MenuHerramientas` con la tecla Q, y el chat en `ChatBox`
 * con la T: ambos guardan su propio estado abierto/cerrado.)
 */

/**
 * Tecla E: resuelve la única acción de contacto que tenga sentido ahora mismo.
 * El orden importa — conduciendo, bajarse gana a cualquier otra cosa.
 */
function interactuar() {
  // En plena carrera la E es del ítem (CarreraOverlay) y bajarse sería un
  // abandono accidental a medio circuito.
  const fase = useCarrera.getState().fase
  if (fase === 'semaforo' || fase === 'corriendo') return

  const montura = useMontura.getState()
  if (montura.instanciaId != null) {
    montura.solicitarDesmontar()
    return
  }
  const casa = useHouse.getState()
  // Con un cuarto abierto o en el editor no hay personaje al que mandar.
  if (casa.activeRoom || useLayout.getState().editMode) return

  if (montura.cercaId != null && montura.cercaTipo) {
    const inst = useDiseño.getState().objetos.find((o) => o.id === montura.cercaId)
    if (inst) montura.montar(inst)
    return
  }
  if (casa.nearRoomId) {
    casa.tryEnterRoom(casa.nearRoomId)
    return
  }
  if (casa.nearAcceso && casa.nearDir) {
    if (casa.nearDir === 'subir') casa.subirNivel()
    else casa.bajarNivel()
  }
}

function atajo(e: KeyboardEvent, abajo: boolean) {
  const esCtrl = e.code === 'ControlLeft' || e.code === 'ControlRight'
  // Agacharse es sostenido: su suelta se procesa siempre (si no, el personaje se
  // quedaría en cuclillas al soltar la tecla fuera de foco).
  if (esCtrl && !abajo) {
    accionFrame.agachado = false
    return
  }
  if (!abajo || e.repeat) return
  if (escribiendoEnCampo() || hayCuartoAbierto()) return
  // Ceder ante los controles contextuales que capturan la misma tecla y la
  // anulan (el Espacio del arma y el de las canchas): ellos van en fase de
  // captura, estos atajos en la de burbuja, así que llegan ya marcados.
  if (e.defaultPrevented) return
  // Con Ctrl/Alt/Win pulsados la tecla es de un atajo del navegador (Ctrl+1, Alt+F4…).
  if (!esCtrl && (e.ctrlKey || e.altKey || e.metaKey)) return

  const h = useHerramienta.getState()
  switch (e.code) {
    case 'Space':
      // Volando en el OVNI o derrapando en un vehículo el Espacio ya es del
      // movimiento (subir / freno de mano): ahí no salta.
      if (espacioTomado()) return
      h.saltar()
      break
    case 'ShiftLeft':
    case 'ShiftRight':
      // Volando en el OVNI, Mayús baja: ahí no toca el correr.
      if (mayusTomado()) return
      h.setCorrer(!h.correr)
      // Sin preventDefault: Mayús no tiene acción por defecto que estorbe y
      // anularla rompería combinaciones del navegador (Mayús+clic).
      return
    case 'ControlLeft':
    case 'ControlRight':
      accionFrame.agachado = true
      // Tampoco se anula: Ctrl solo no hace nada, pero Ctrl+C sí.
      return
    case 'Digit1':
      h.saludar('der')
      break
    case 'Digit2':
      h.saludar('izq')
      break
    case 'Digit3':
      h.setBailando(!h.bailando)
      break
    case 'Digit4':
      h.mortal()
      break
    case 'KeyE':
      interactuar()
      break
    case 'KeyH':
      useHud.getState().alternarTodo()
      break
    default:
      return
  }
  e.preventDefault()
}

/**
 * Registra los atajos en fase de BURBUJA (a propósito): los controles
 * contextuales escuchan en captura, así que se resuelven antes y estos atajos
 * solo actúan si nadie reclamó la tecla.
 */
export function bindAtajosPersonaje() {
  window.addEventListener('keydown', (e) => atajo(e, true))
  window.addEventListener('keyup', (e) => atajo(e, false))
  // Si la ventana pierde el foco agachado, Ctrl no llega a soltarse nunca.
  window.addEventListener('blur', () => {
    accionFrame.agachado = false
  })
}
