import { useEffect } from 'react'
import { Icono } from './iconos/Icono'
import type { NombreIcono } from './iconos/catalogo'
import { useT } from '../i18n/useT'
import { useHouse } from '../state/houseStore'
import { useLayout } from '../state/layoutStore'
import { useCuartos, getCuarto } from '../state/cuartosStore'
import { useDiseño, objetoPorId, esObjetoMapa, objetosDeCuartoIdx } from '../state/disenoStore'
import { useEditorUi } from '../state/editorUiStore'
import { useCanchas, esCancha } from '../state/canchasStore'
import { useDespierto } from '../state/despiertoStore'
import { confirmar } from '../state/confirmarStore'

/**
 * Menú de lo que despertó una pulsación larga en el mapa: mientras tiembla se
 * puede arrastrar para moverlo, y de aquí salen sus dos acciones —borrarlo o
 * abrir su editor—. Solo iconos: la burbuja va pegada a lo tocado y el texto
 * la volvía una barra que tapaba media escena.
 *
 * Va anclado sobre el sujeto (`DespiertoAnchor` lo proyecta desde el 3D), como
 * la burbuja de `InteractOverlay`, y no usa `Html` de drei para no bloquear el
 * raycast del mapa.
 */
export function MenuDespierto() {
  const t = useT()
  const sujeto = useDespierto((s) => s.sujeto)
  const screenX = useDespierto((s) => s.screenX)
  const screenY = useDespierto((s) => s.screenY)
  const terminar = useDespierto((s) => s.terminar)
  // Solo el TIPO del objeto (o null si ya no existe): suscribirse a `objetos`
  // crudo repintaría este menú en CADA frame del arrastre (ver disenoStore).
  const tipoObjeto = useDiseño((s) =>
    sujeto?.tipo === 'objeto' ? (objetoPorId(s.objetos, sujeto.id)?.tipo ?? null) : null,
  )
  const existeCuarto = useCuartos((s) =>
    sujeto?.tipo === 'cuarto' ? s.cuartos.some((c) => c.id === sujeto.id) : false,
  )
  // Un cuarto no puede quedarse sin objetos (`removeObjeto` lo impide): con el
  // último, en vez de un botón que no hace nada, no se ofrece borrar.
  const puedeBorrar = useDiseño((s) => {
    if (sujeto?.tipo !== 'objeto') return true
    const o = objetoPorId(s.objetos, sujeto.id)
    if (!o) return false
    return esObjetoMapa(o) || objetosDeCuartoIdx(s.objetos, o.roomId).length > 1
  })
  const activeRoom = useHouse((s) => s.activeRoom)
  const editMode = useLayout((s) => s.editMode)

  // Escape suelta lo despierto (mismo papel que el botón Listo).
  useEffect(() => {
    if (!sujeto) return
    const alTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') terminar()
    }
    window.addEventListener('keydown', alTecla)
    return () => window.removeEventListener('keydown', alTecla)
  }, [sujeto, terminar])

  // Entrar al editor termina el modo: allí ya se arrastra y se edita con el panel
  // (cubre también el botón de editar de abajo).
  useEffect(() => {
    if (editMode) terminar()
  }, [editMode, terminar])

  if (!sujeto || editMode || activeRoom) return null
  if (sujeto.tipo === 'objeto' ? tipoObjeto == null : !existeCuarto) return null

  const cancha = sujeto.tipo === 'objeto' && tipoObjeto != null && esCancha(tipoObjeto)

  const borrar = async () => {
    if (sujeto.tipo === 'objeto') {
      const ok = await confirmar({
        titulo: t('mapa.objeto.borrarTitulo', '¿Borrar este objeto del mapa?'),
        textoOk: t('ui.borrar', 'Borrar'),
        peligro: true,
      })
      if (!ok) return
      await useDiseño.getState().removeObjeto(sujeto.id)
    } else {
      const ok = await confirmar({
        titulo: t('casa.eliminarCuartoTitulo', 'Eliminar cuarto'),
        mensaje: getCuarto(sujeto.id)?.nombre,
        textoOk: t('ui.borrar', 'Borrar'),
        peligro: true,
      })
      if (!ok) return
      // Con apps asignadas pide su propia confirmación (EliminarCuartoDialog).
      await useCuartos.getState().eliminar(sujeto.id)
    }
    terminar()
  }

  const editar = () => {
    if (sujeto.tipo === 'cuarto') {
      // Editar un cuarto = el editor de mapa enfocado en él.
      useLayout.getState().editRoom(sujeto.id)
      return
    }
    if (cancha) {
      // Las canchas tienen su propio editor (tamaño, giro, color): entra en su
      // modo Editar con esta ya seleccionada.
      const canchas = useCanchas.getState()
      canchas.iniciar()
      canchas.setClase(null)
      canchas.seleccionar(sujeto.id)
      terminar()
      return
    }
    // El orden importa: abrir el editor pasa por `setEditor3d(false)`, que LIMPIA
    // el objeto seleccionado. Si se elige antes, el panel abre con otro objeto.
    useLayout.getState().setEditMode(true)
    const ui = useEditorUi.getState()
    ui.setTab('objetos')
    ui.setObjetoSel(sujeto.id)
    // Con el engrane abierto, el panel entra directo a la Forma del objeto.
    ui.setPiezasControles(true)
  }

  const iconoEditar: NombreIcono =
    sujeto.tipo === 'cuarto' || cancha ? 'editar' : 'herramienta'
  const tituloEditar =
    sujeto.tipo === 'cuarto'
      ? t('nav.editar.titulo', 'Editar cuarto')
      : cancha
        ? t('canchas.editar', 'Editar cancha')
        : t('mapa.objeto.forma', 'Editar forma')

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      <div
        className="ui-panel-glass pointer-events-auto absolute flex items-center gap-0.5 rounded-2xl border-2 border-white/20 p-1 shadow-xl backdrop-blur-md"
        style={{ left: screenX, top: screenY, transform: 'translate(-50%, -100%)' }}
      >
        {puedeBorrar && (
          <BotonMenu icono="basura" titulo={t('ui.borrar', 'Borrar')} onClick={() => void borrar()} peligro />
        )}
        <BotonMenu icono={iconoEditar} titulo={tituloEditar} onClick={editar} />
        <BotonMenu icono="confirmar" titulo={t('mapa.listo', 'Listo')} onClick={terminar} />
      </div>
    </div>
  )
}

function BotonMenu({
  icono,
  titulo,
  onClick,
  peligro,
}: {
  icono: NombreIcono
  titulo: string
  onClick: () => void
  peligro?: boolean
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      title={titulo}
      aria-label={titulo}
      className={`flex h-9 w-9 items-center justify-center rounded-xl transition active:scale-95 ${
        peligro ? 'text-red-300 hover:bg-red-500/20' : 'text-white/80 hover:bg-white/12 hover:text-white'
      }`}
    >
      <Icono nombre={icono} />
    </button>
  )
}
