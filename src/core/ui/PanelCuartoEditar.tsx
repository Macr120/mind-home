import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Cuarto } from '../data/db'
import { useCuartos } from '../state/cuartosStore'
import { useDiseño } from '../state/disenoStore'
import { arisIndividuales, pintarCuarto } from '../state/pintarCuarto'
import { confirmar } from '../state/confirmarStore'
import { comprimirImagen } from '../imagenIA'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'
import { ColorPicker } from './comun/ColorPicker'
import { usePreviewBlob } from './comun/usePreviewBlob'
import { GenerarTexturaIA } from './editor/GenerarTexturaIA'
import { Modal, BotonPeligro } from '../../rooms/_shared/ui'
import { PestanasCarpeta, type ItemPestana } from '../../rooms/_shared/PestanasCarpeta'

/** Emojis a mano para el cuarto; el campo libre acepta cualquier otro. */
const EMOJIS = ['🚪', '🍳', '💪', '🛏️', '💼', '📚', '🎮', '🌿', '🚗', '🎯', '💡', '✈️']

type Pestana = 'emoji' | 'imagen'

/**
 * Ficha de una tarjeta de la pantalla de inicio: nombre, icono y color.
 *
 * Lo que se toca aquí es el CUARTO, no una capa del panel: el nombre y el color
 * se escriben en las dos fuentes (la instancia y el override de diseño) porque
 * `useNombreCuarto` y el propio panel leen antes el override. Los muros NO se
 * repintan: eso borraría lo que el usuario haya pintado en el editor de mapa.
 *
 * Va por portal al body: el telón del panel lleva `backdrop-filter` y eso
 * convierte al scrim en el marco de referencia de los `fixed` de dentro.
 */
export function PanelCuartoEditar({ cuarto, onCerrar }: { cuarto: Cuarto; onCerrar: () => void }) {
  const t = useT()
  const inputRef = useRef<HTMLInputElement>(null)
  const renombrar = useCuartos((s) => s.renombrar)
  const setIcon = useCuartos((s) => s.setIcon)
  const setIconoImagen = useCuartos((s) => s.setIconoImagen)
  const setRoomName = useDiseño((s) => s.setRoomName)
  const colorActual = useDiseño((s) => s.roomColors[cuarto.id]) ?? cuarto.color
  const nombreGuardado = useDiseño((s) => s.roomNames[cuarto.id]) || cuarto.nombre

  const [nombre, setNombre] = useState(nombreGuardado)
  const [pestana, setPestana] = useState<Pestana>(cuarto.iconoImagen ? 'imagen' : 'emoji')
  const urlIcono = usePreviewBlob(cuarto.iconoImagen)

  const guardarNombre = async () => {
    const limpio = nombre.trim().slice(0, 40)
    if (!limpio || limpio === nombreGuardado) return
    await renombrar(cuarto.id, limpio)
    await setRoomName(cuarto.id, limpio)
  }

  /**
   * El color del cuarto pinta piso, techo y muros. Los muros que el usuario haya
   * pintado a mano en el editor de mapa son trabajo suyo: antes de borrarlos se
   * pregunta, y si dice que no se quedan como están.
   */
  const guardarColor = async (color: string) => {
    const aMano = arisIndividuales(cuarto.id).length > 0
    const muros =
      !aMano ||
      (await confirmar({
        titulo: t('nav.editar.murosTitulo', '¿Repintar también los muros?'),
        mensaje: t(
          'nav.editar.murosMensaje',
          'Este cuarto tiene muros que pintaste a mano en el editor de mapa. Si los repintas, pierden su color.',
        ),
        textoOk: t('nav.editar.murosOk', 'Repintar'),
      }))
    await pintarCuarto(cuarto.id, color, muros)
  }

  const guardarImagen = async (blob: Blob) => {
    await setIconoImagen(cuarto.id, await comprimirImagen(blob, 256))
    setPestana('imagen')
  }

  const cerrar = () => {
    void guardarNombre()
    onCerrar()
  }

  const pestanas: ItemPestana<Pestana>[] = [
    { id: 'emoji', icono: 'estrella', labelEs: 'Emoji' },
    { id: 'imagen', icono: 'imagen', labelEs: 'Imagen' },
  ]

  return createPortal(
    <Modal titulo={t('nav.editar.titulo', 'Editar cuarto')} onCerrar={cerrar}>
      <label className="block space-y-1">
        <span className="text-[11px] font-semibold text-white/50">
          {t('nav.editar.nombre', 'Nombre')}
        </span>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onBlur={() => void guardarNombre()}
          maxLength={40}
          autoFocus
          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 outline-none focus:border-white/30"
        />
      </label>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-white/50">{t('nav.editar.icono', 'Icono')}</p>
        <PestanasCarpeta
          items={pestanas}
          activo={pestana}
          onCambio={setPestana}
          prefijoClave="nav.editar.tab"
          variante="sub"
          flecha={false}
          color={colorActual}
        />

        {pestana === 'emoji' ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => void setIcon(cuarto.id, e)}
                className={`h-9 w-9 rounded-lg text-xl transition ${
                  cuarto.icon === e ? 'bg-white/15 ring-2 ring-white/60' : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                {e}
              </button>
            ))}
            <input
              value={cuarto.icon}
              onChange={(e) => void setIcon(cuarto.id, e.target.value)}
              maxLength={4}
              title={t('nav.editar.emojiLibre', 'Otro emoji')}
              className="h-9 w-12 rounded-lg border border-white/10 bg-black/30 text-center text-xl outline-none focus:border-white/30"
            />
          </div>
        ) : (
          <div className="space-y-2">
            {urlIcono && (
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 p-2">
                <img
                  src={urlIcono}
                  alt=""
                  className="h-14 w-14 rounded-xl object-cover"
                  draggable={false}
                />
                <span className="flex-1 text-[11px] leading-snug text-white/50">
                  {t('nav.editar.imagenPuesta', 'Esta imagen sustituye al emoji en los menús.')}
                </span>
                <BotonPeligro pequeno onClick={() => void setIconoImagen(cuarto.id, undefined)}>
                  {t('nav.editar.quitarImagen', 'Quitar')}
                </BotonPeligro>
              </div>
            )}

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-white/20 bg-white/5 py-2 text-[11px] text-white/50 transition hover:border-white/40 hover:text-white/70"
            >
              <Icono nombre="foto" />
              {t('nav.editar.subirImagen', 'Subir una imagen')}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f?.type.startsWith('image/')) void guardarImagen(f)
                e.target.value = ''
              }}
            />

            <GenerarTexturaIA superficie="icono" onGenerada={guardarImagen} />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-white/50">{t('nav.editar.color', 'Color')}</p>
        <ColorPicker value={colorActual} onChange={(c) => void guardarColor(c)} />
      </div>
    </Modal>,
    document.body,
  )
}
