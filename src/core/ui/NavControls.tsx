import { useEffect, useState } from 'react'
import { useCam, type Vista } from '../state/cameraStore'
import { useLayout, mapFocusPos } from '../state/layoutStore'
import { usePlanos } from '../state/planosStore'
import { useEditorUi } from '../state/editorUiStore'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'
import { ViewCube, VIEW_CUBE_PX } from './ViewCube'
import { LookPad } from './MoveControls'
import { ControlHerramienta } from './ControlHerramienta'
import { ControlesConduccion } from './VehiculoOverlay'
import { FlechasMoverObjeto, BotonListoMoverObjetos } from './EditorHud'
import { BotonAccionCancha } from './BotonAccionCancha'
import { useHerramienta } from '../state/herramientaStore'
import { useMontura } from '../state/monturaStore'
import { useAccionCuarto } from '../state/accionCuartoStore'
import { useContexto } from '../state/contextoStore'
import { useCargar } from '../state/cargarStore'
import { useParque } from '../state/parqueStore'
import { useFlotador } from '../state/flotadorStore'
import { useTren } from '../state/trenStore'
import { playerPos } from '../state/playerPosition'
import { esArmaDeTiro } from '../house/arma'
import { useCarrera } from '../state/carreraStore'
import { usePaintball } from '../state/paintballStore'
import { useJuegoCancha } from '../state/juegoCanchaStore'
import { useHud } from '../state/hudStore'
import { useConstruyendo } from '../state/construyendo'
import { BotonPlegarHud, TiradorHud } from './HudPlegable'
import { useTopeHud } from './hudMedida'

/**
 * Controles de vista 3D: selector iso/3ª/1ª, cubo y rotación debajo (mismo ancho).
 */
export function NavControls() {
  const t = useT()
  const editMode = useLayout((s) => s.editMode)
  const moverObjetosRoomId = useLayout((s) => s.moverObjetosRoomId)
  const planosActivo = usePlanos((s) => s.activo)
  const vista = useCam((s) => s.vista)
  const setVista = useCam((s) => s.setVista)
  const centrarIso = useCam((s) => s.centrarIso)
  const rotar = useCam((s) => s.rotar)
  const editor3d = useEditorUi((s) => s.editor3d)
  const setEditor3d = useEditorUi((s) => s.setEditor3d)
  const objetoSel = useEditorUi((s) => s.objetoSel)
  const equipadas = useHerramienta((s) => s.equipadas)
  const montado = useMontura((s) => s.instanciaId != null)
  // AL ALCANCE de un vehículo (sin montar): el hueco del cubo ya muestra el
  // botón dinámico "Subirte" ahí mismo (ver ControlHerramienta), no un aviso aparte.
  const cercaVehiculo = useMontura((s) => s.cercaId != null)
  // Sentado/acostado en un objeto genérico, o AL ALCANCE de uno: mismo hueco
  // que el vehículo (botón dinámico Sentarte/Acostarte → Levantarte). Los 5
  // usables de plantilla (sillón, laptop…) NO entran aquí — se activan/salen
  // solos, sin panel, como siempre.
  const sentadoGenerico = useAccionCuarto(
    (s) => s.tipo === 'asiento-generico' || s.tipo === 'acostarse-generico',
  )
  const cercaAccionGenerica = useAccionCuarto((s) => s.cercaId != null)
  // Botones de lo que tienes al alcance (ver `contextoStore`) y de lo que estás
  // usando: comparten el hueco del cubo, pero NO pueden entrar en `conHerramienta`
  // — esa condición también sustituye al joystick de vista en 3ª/1ª persona, y el
  // LookPad desaparecería cada vez que pasas junto a una silla.
  const hayContextual = useContexto((s) => s.acciones.length > 0)
  const cercaCarga = useCargar((s) => s.cerca != null || s.sujeto != null)
  const accionActiva = useAccionCuarto((s) => s.instanciaId != null)
  const enParque = useParque((s) => s.instanciaId != null)
  const enFlotador = useFlotador((s) => s.instanciaId != null)
  const enTren = useTren((s) => s.montado)
  const faseCarrera = useCarrera((s) => s.fase)
  const fasePaintball = usePaintball((s) => s.fase)
  // Arma de tiro en la mano y vista con mira: los controles de tiro viven aquí.
  const conArmaDeTiro =
    equipadas.some(esArmaDeTiro) && (vista === 'tercera' || vista === 'primera')
  // Jugando en una cancha: el botón de acción ocupa el hueco del cubo/LookPad.
  const jugandoCancha = useJuegoCancha((s) => s.fase === 'jugando')
  const plegado = useHud((s) => s.plegado.infDer)
  const movilVertical = useHud((s) => s.movilVertical)
  const chatPlegado = useHud((s) => s.plegado.chat)
  const construyendo = useConstruyendo()
  // Mover objetos: las flechas ocupan el hueco del cubo, pero se pueden plegar para
  // recuperar el cubo y cambiar la perspectiva sin salir del modo.
  const [verCuboMoviendo, setVerCuboMoviendo] = useState(false)
  const refTope = useTopeHud('navegacion')

  // Editar en perspectiva es ahora un estado de la cámara, no un modo aparte: el
  // editor sigue abierto al cambiar de vista y solo se marca dónde está.
  useEffect(() => {
    if (!useLayout.getState().editMode) return
    setEditor3d(vista === 'tercera' || vista === 'primera')
  }, [vista, setEditor3d])

  // Al soltar el objeto (o salir del modo) vuelve a arrancar mostrando las flechas.
  useEffect(() => {
    // Reset intencional al cambiar la entrada: derivarlo dejaría el cubo puesto
    // al seleccionar el siguiente objeto.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (objetoSel == null) setVerCuboMoviendo(false)
  }, [objetoSel])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'v') return
      const el = document.activeElement as HTMLElement | null
      if (
        el &&
        (el.tagName === 'INPUT' ||
          el.tagName === 'TEXTAREA' ||
          el.tagName === 'SELECT' ||
          el.isContentEditable)
      )
        return
      if (useLayout.getState().editMode) return
      // En plena batalla, V solo alterna 1ª/3ª (es lo que promete su ayuda). El
      // ciclo normal pasa por la isométrica, y ahí no hay mira ni forma de
      // apuntar: el combate se quedaba injugable y sin controles para salir.
      const pb = usePaintball.getState()
      if (pb.fase === 'cuenta' || pb.fase === 'jugando') {
        pb.setVistaCombate(useCam.getState().vista === 'primera' ? 'tercera' : 'primera')
        return
      }
      useCam.getState().ciclarVista()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // En plena carrera el hueco lo ocupa la pila de carrera (derrape + ítem) de CarreraOverlay.
  if (faseCarrera === 'semaforo' || faseCarrera === 'corriendo') return null
  // Y en plena batalla de paintball, el botón de disparo de PaintballOverlay.
  if (fasePaintball === 'cuenta' || fasePaintball === 'jugando') return null

  // Teléfono vertical con el chat abierto: los controles de vista ceden el bajo
  // (chat ⊕ esquinas). El editor sí conserva sus controles, y con un arma en la
  // mano tampoco se ceden: es donde viven los botones de apuntar y disparar.
  if (movilVertical && !chatPlegado && !editMode && !conArmaDeTiro) return null

  // Editor de infraestructura en vertical: su barra ocupa el bajo completo (antes
  // tapaba estos controles). La cámara se mueve arrastrando el mapa.
  if (movilVertical && construyendo) return null

  const reiniciarVista = () => centrarIso(mapFocusPos())
  const vistaIso = vista === 'iso'
  const vistaInterior = vista === 'interior'
  // El cubo y la rotación se muestran en iso y en la vista interior del cuarto.
  const mostrarCubo = vistaIso || vistaInterior
  // Herramientas equipadas: su pila de controles ocupa el hueco del cubo/LookPad (solo en juego).
  // Conduciendo también, aunque el vehículo no esté en la hotbar: ahí vive el "Bajarte".
  const conHerramienta =
    (equipadas.length > 0 || montado || cercaVehiculo || sentadoGenerico || cercaAccionGenerica) && !editMode
  // Solo suma en la rama del cubo (vista iso/interior), nunca en la del LookPad.
  const conContextual =
    (hayContextual || cercaCarga || accionActiva || enParque || enFlotador || enTren) && !editMode
  // Modo "mover objetos" con un objeto seleccionado: las flechas ocupan el hueco del cubo.
  const moviendoObjeto = moverObjetosRoomId != null && objetoSel != null

  const vistas: { id: Vista; etiqueta: string; title: string }[] = [
    { id: 'iso', etiqueta: t('nav3d.vistaIsoCorta', 'Iso'), title: t('nav3d.vistaIso', 'Vista isométrica') },
    { id: 'tercera', etiqueta: t('nav3d.vista3Corta', '3ª'), title: t('nav3d.vistaTercera', 'Tercera persona') },
    { id: 'primera', etiqueta: t('nav3d.vista1Corta', '1ª'), title: t('nav3d.vistaPrimera', 'Primera persona') },
  ]

  const ancho = { width: VIEW_CUBE_PX }

  /*
   * Girar un cuarto de vuelta. En perspectiva mueve la mirada del personaje (yaw)
   * y en isométrica el azimut del mapa; el tercer botón, «centrar», solo tiene
   * sentido con el mapa delante, así que no baja a primera ni a tercera.
   * dir=ltr: par direccional — el orden visual no se espeja en RTL.
   */
  const rotacion = (
    <div dir="ltr" data-tut="nav.rotar" className="ui-hud flex w-full overflow-hidden rounded-lg border border-white/10">
      <button
        type="button"
        onClick={() => rotar(-1)}
        title={t('nav3d.rotarIzq', 'Rotar vista a la izquierda')}
        className="h-8 flex-1 text-base font-semibold text-white/60 transition hover:bg-white/10 hover:text-white/90 active:scale-95"
      >
        <Icono nombre="rotar-izq" />
      </button>
      <button
        type="button"
        onClick={() => rotar(1)}
        title={t('nav3d.rotarDer', 'Rotar vista a la derecha')}
        className="h-8 flex-1 text-base font-semibold text-white/60 transition hover:bg-white/10 hover:text-white/90 active:scale-95"
      >
        <Icono nombre="rotar-der" />
      </button>
      {mostrarCubo && (
        <button
          type="button"
          onClick={reiniciarVista}
          title={t('nav3d.centrarMapa', 'Centrar en el mapa')}
          className="h-8 flex-1 text-base font-semibold text-white/60 transition hover:bg-white/10 hover:text-white/90 active:scale-95"
        >
          <Icono nombre="centrar" />
        </button>
      )}
    </div>
  )

  // En el editor 3D los controles van a la izquierda del panel (que ocupa la derecha).
  const posControles = editor3d
    ? 'end-[21rem]'
    : !editMode
      ? 'end-4'
      : planosActivo
        ? 'end-[21rem]'
        : 'start-4'
  // El selector de vistas y el botón de editor 3D se ven en juego y en el editor 3D
  // (no en el editor iso, que usa su propio panel).
  const mostrarVistas = !editMode || editor3d

  // Plegado (solo en juego, el editor necesita sus controles): queda el cubo, que los devuelve.
  // Mover objetos siempre muestra sus controles (si no, el botón "Listo" quedaría inalcanzable),
  // y con un arma en la mano tampoco se pliegan: dejarían el tiro sin botones. Por lo mismo, con
  // algo al alcance: plegado no habría forma de sentarse, subirse ni bajarse.
  if (plegado && !editMode && !moverObjetosRoomId && !conArmaDeTiro && !conContextual) {
    return (
      <div ref={refTope} className={`absolute bottom-4 z-10 ${posControles}`}>
        <TiradorHud zona="infDer">
          <Icono nombre="cubo-vistas" />
        </TiradorHud>
      </div>
    )
  }

  return (
    <div
      ref={refTope}
      data-tut="nav.controles"
      data-tut-zona="navegacion"
      className={`absolute bottom-4 z-10 flex flex-col items-stretch gap-1 ${posControles}`}
      style={ancho}
      aria-label={t('nav3d.aria', 'Controles de vista')}
    >
      {!editMode && (
        <div className="flex justify-end">
          <BotonPlegarHud zona="infDer" />
        </div>
      )}

      {/* Modo "mover objetos": botón fijo para terminar, fuera del cuarto. */}
      {moverObjetosRoomId && <BotonListoMoverObjetos />}

      {mostrarVistas && (
        <div
          data-tut="nav.vistas"
          className="ui-hud flex w-full overflow-hidden rounded-lg border border-white/10"
          title={t('nav3d.cambiarVista', 'Cambiar vista (tecla V)')}
        >
          {vistas.map((v) => (
            <button
              key={v.id}
              type="button"
              // Iso también RECENTRA sobre el personaje (aunque ya estuvieras en
              // iso): es la forma de recuperar el mapa si te fuiste lejos.
              onClick={() =>
                v.id === 'iso'
                  ? centrarIso([playerPos.x, playerPos.y, playerPos.z])
                  : setVista(v.id)
              }
              title={v.title}
              className={`h-8 flex-1 text-xs font-semibold transition active:scale-95 ${
                vista === v.id
                  ? 'bg-white/20 text-white'
                  : 'text-white/60 hover:bg-white/10 hover:text-white/90'
              }`}
            >
              {v.etiqueta}
            </button>
          ))}
        </div>
      )}

      {editMode && mostrarCubo && (
        <p className="ui-panel-glass self-center rounded-md px-2 py-0.5 text-center text-[10px] font-semibold uppercase tracking-wide text-white/50">
          {vistaInterior
            ? t('nav3d.vistaInterior', 'Mirando la pared')
            : t('nav3d.vistaCuarto', 'Vista del cuarto')}
        </p>
      )}

      {mostrarCubo && (
        <>
          {/* Mover objetos: alterna entre las flechas y el cubo, para poder cambiar la
              perspectiva sin salir del modo ni perder el objeto seleccionado. */}
          {moviendoObjeto && !jugandoCancha && !conHerramienta && !conContextual && (
            <button
              type="button"
              onClick={() => setVerCuboMoviendo((v) => !v)}
              title={
                verCuboMoviendo
                  ? t('nav3d.verFlechas', 'Volver a las flechas de movimiento')
                  : t('nav3d.verCubo', 'Plegar las flechas y ver el cubo de vistas')
              }
              className="ui-hud flex h-7 w-full items-center justify-center gap-1 rounded-lg border border-white/10 text-[10px] font-semibold text-white/70 transition hover:bg-white/10 active:scale-95"
            >
              <Icono nombre={verCuboMoviendo ? 'mover' : 'cubo-vistas'} />
              {verCuboMoviendo ? t('nav3d.verFlechasBtn', 'Ver flechas') : t('nav3d.verCuboBtn', 'Ver vistas')}
            </button>
          )}
          {/* El hueco lo comparten cuatro cosas (el cubo de vistas, la herramienta
              equipada, la acción de la cancha, las flechas de mover objeto): solo
              una a la vez, por eso una sola ancla envuelve las cuatro ramas. */}
          <div data-tut="nav.hueco">
            {jugandoCancha ? (
              <BotonAccionCancha />
            ) : conHerramienta || conContextual ? (
              <div className="relative">
                {/* Conduciendo: el derrape (u ↑/↓ del OVNI) a la IZQUIERDA del panel
                    del vehículo, sin ensanchar la columna (queda fuera de su flujo). */}
                <div className="absolute end-full top-0 me-1">
                  <ControlesConduccion />
                </div>
                <ControlHerramienta />
              </div>
            ) : moviendoObjeto && !verCuboMoviendo ? (
              <FlechasMoverObjeto />
            ) : (
              <ViewCube />
            )}
          </div>
          {rotacion}
        </>
      )}

      {/* En 3ª/1ª persona el LookPad hace de cubo, y ahora también en esto: el hueco
          es de UNO a la vez y el panel lo SUSTITUYE, en vez de crecer hacia arriba
          apilándose encima. Girar la cámara sin el pad sigue estando a mano: el par
          de rotación de abajo mueve la mirada de a 90°, y el arrastre y el clic
          derecho siguen igual. */}
      {!vistaIso && (
        <>
          <div className="flex w-full flex-col items-center gap-2">
            {jugandoCancha ? (
              <BotonAccionCancha />
            ) : conHerramienta || conContextual ? (
              <div className="relative w-full">
                {/* Conduciendo: el derrape (u ↑/↓ del OVNI) a la izquierda, fuera
                    del flujo, igual que en la vista isométrica. */}
                <div className="absolute end-full top-0 me-1">
                  <ControlesConduccion />
                </div>
                <ControlHerramienta />
              </div>
            ) : (
              <LookPad />
            )}
          </div>
          {rotacion}
        </>
      )}
    </div>
  )
}
