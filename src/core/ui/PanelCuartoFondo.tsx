import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { FondoImagen } from '../data/db'
import { useDiseño } from '../state/disenoStore'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'
import { usePreviewBlob } from './comun/usePreviewBlob'
import { GenerarTexturaIA } from './editor/GenerarTexturaIA'
import { Modal } from '../../rooms/_shared/ui'

function Miniatura({ item }: { item: FondoImagen }) {
  const url = usePreviewBlob(item.imagen)
  if (!url) return <div className="h-full w-full bg-white/5" />
  return <img src={url} alt="" className="h-full w-full object-cover" draggable={false} />
}

/**
 * Fondo de pantalla de la pantalla de inicio, con galería PROPIA: nada de lo que
 * se suba aquí aparece en el fondo de cielo de la casa, ni al revés. Son dos
 * cosas distintas y compartir galería obligaba a que un encuadre valiera para las
 * dos.
 */
export function PanelCuartoFondo({ onCerrar }: { onCerrar: () => void }) {
  const t = useT()
  const inputRef = useRef<HTMLInputElement>(null)
  const fondos = useDiseño((s) => s.fondosPanel)
  const panelFondoId = useDiseño((s) => s.panelFondoId)
  const atenuacion = useDiseño((s) => s.panelFondoAtenuacion)
  const setPanelFondo = useDiseño((s) => s.setPanelFondo)
  const agregarFondoPanel = useDiseño((s) => s.agregarFondoPanel)
  const eliminarFondoPanel = useDiseño((s) => s.eliminarFondoPanel)
  const [guardando, setGuardando] = useState(false)

  const usarNueva = async (blob: Blob, nombre: string) => {
    setGuardando(true)
    try {
      await agregarFondoPanel(blob, nombre)
    } finally {
      setGuardando(false)
    }
  }

  return createPortal(
    <Modal titulo={t('nav.fondo.titulo', 'Fondo de pantalla')} onCerrar={onCerrar} ancho="max-w-lg">
      <div className="grid grid-cols-3 gap-1.5">
        <button
          type="button"
          onClick={() => void setPanelFondo(null, atenuacion)}
          className={`grid aspect-video place-items-center rounded-lg border text-[10px] transition ${
            panelFondoId == null
              ? 'border-accent bg-white/10 text-white/80'
              : 'border-dashed border-white/15 text-white/40 hover:bg-white/5'
          }`}
        >
          {t('nav.fondo.sin', 'Sin fondo')}
        </button>
        {fondos.map((item) =>
          item.id == null ? null : (
            <div
              key={item.id}
              className={`overflow-hidden rounded-lg border transition ${
                panelFondoId === item.id ? 'border-accent' : 'border-white/10'
              }`}
            >
              <button
                type="button"
                onClick={() => void setPanelFondo(item.id!, atenuacion)}
                title={item.nombre}
                className="block aspect-video w-full bg-black/30"
              >
                <Miniatura item={item} />
              </button>
              <button
                type="button"
                onClick={() => void eliminarFondoPanel(item.id!)}
                className="w-full border-t border-white/10 py-1 text-[9px] text-red-400/70 transition hover:bg-red-500/10"
              >
                {t('nav.fondo.borrar', 'Borrar')}
              </button>
            </div>
          ),
        )}
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={guardando}
        className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-white/20 bg-white/5 py-2 text-[11px] text-white/50 transition hover:border-white/40 hover:text-white/70 disabled:opacity-40"
      >
        <Icono nombre="foto" />
        {t('nav.fondo.subir', 'Subir una imagen')}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f?.type.startsWith('image/')) {
            void usarNueva(f, f.name.replace(/\.[^.]+$/, '').slice(0, 32) || 'Mi fondo')
          }
          e.target.value = ''
        }}
      />

      <GenerarTexturaIA
        superficie="fondo"
        onGenerada={(blob) => usarNueva(blob, t('nav.fondo.nombreIA', 'Fondo con IA'))}
      />

      {panelFondoId != null && (
        <label className="block space-y-1">
          <span className="text-[11px] font-semibold text-white/50">
            {t('nav.fondo.atenuacion', 'Atenuar el fondo')}
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(atenuacion * 100)}
            onChange={(e) => void setPanelFondo(panelFondoId, Number(e.target.value) / 100)}
            className="w-full accent-accent"
          />
        </label>
      )}
    </Modal>,
    document.body,
  )
}
