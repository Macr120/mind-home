import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useLayout } from '../state/layoutStore'
import { useHouse } from '../state/houseStore'
import { useGranjaCerca } from '../state/granjaCercaStore'
import {
  alimentarCorral,
  mimarCorral,
  curarCorral,
  limpiarCorral,
  corralSucio,
  estaEnfermo,
} from '../state/granjaStore'
import { VACIO, corralesRepo, cestaRepo, animalesRepo } from '../data/repository'
import { cellToWorld } from '../house/walls'
import { registrarAncla, quitarAncla, registrarDom, quitarDom } from '../house/etiquetasMapa'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'

const btnBurbuja =
  'pointer-events-auto flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-[11px] font-semibold text-white transition hover:bg-white/20 active:scale-95 disabled:opacity-40'

/**
 * Burbuja de cuidado en juego: al caminar junto a un corral (GranjaProximity)
 * ofrece alimentar y acariciar sin abrir el editor. Se ancla al centro del
 * corral con el proyector de etiquetasMapa.
 */
export function GranjaCercaOverlay() {
  const editMode = useLayout((s) => s.editMode)
  const activeRoom = useHouse((s) => s.activeRoom)
  const corralId = useGranjaCerca((s) => s.corralId)
  if (editMode || activeRoom || corralId == null) return null
  return <Burbuja corralId={corralId} />
}

function Burbuja({ corralId }: { corralId: number }) {
  const t = useT()
  const corral = (corralesRepo.useAll() ?? VACIO).find((c) => c.id === corralId)
  const cesta = (cestaRepo.useAll() ?? VACIO).reduce((n, c) => n + c.cantidad, 0)
  const ancla = useRef(new THREE.Vector3())
  // Tick de 30 s: enfermedad y suciedad se derivan de timestamps, así que aparecen
  // mientras estás parado junto al corral aunque no cambie ningún dato.
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setAhora(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [])
  const enfermos = (animalesRepo.useAll() ?? VACIO).filter(
    (a) => a.corralId === corralId && estaEnfermo(a, ahora),
  ).length
  const sucio = corral != null && corralSucio(corral, ahora)

  useEffect(() => {
    if (!corral) return
    const [xa, , za] = cellToWorld(corral.col, corral.row)
    const [xb, , zb] = cellToWorld(corral.col + corral.ancho - 1, corral.row + corral.alto - 1)
    ancla.current.set((xa + xb) / 2, 3.2, (za + zb) / 2)
    const id = `corral:${corralId}`
    registrarAncla(id, () => ancla.current)
    return () => quitarAncla(id)
  }, [corral, corralId])

  if (!corral) return null

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      <div
        ref={(el) => {
          const id = `corral:${corralId}`
          if (el) registrarDom(id, el)
          else quitarDom(id)
        }}
        className="absolute left-0 top-0"
        style={{ display: 'none' }}
      >
        <div className="flex -translate-x-1/2 -translate-y-full select-none flex-col items-center">
          <div className="ui-panel-glass flex items-center gap-1.5 rounded-2xl border border-white/15 px-2.5 py-1.5 shadow-xl backdrop-blur-md">
            <button
              type="button"
              disabled={cesta === 0}
              title={cesta === 0 ? t('granja.sinComida', 'No hay nada en la cesta: cosecha el huerto para alimentar.') : undefined}
              onClick={() => void alimentarCorral(corralId)}
              className={btnBurbuja}
            >
              <Icono nombre="alimentar" /> {t('granja.burbuja.alimentar', 'Alimentar')}
              <span className="font-normal text-white/60">({cesta})</span>
            </button>
            <button type="button" onClick={() => void mimarCorral(corralId)} className={btnBurbuja}>
              <Icono nombre="mimar" /> {t('granja.burbuja.acariciar', 'Acariciar')}
            </button>
            {/* Curar y limpiar solo asoman cuando hacen falta: si no, la burbuja
                de andar por la casa acabaría con cuatro botones siempre. */}
            {enfermos > 0 && (
              <button type="button" onClick={() => void curarCorral(corralId)} className={btnBurbuja}>
                <Icono nombre="curar" /> {t('granja.burbuja.curar', 'Curar')}
                <span className="font-normal text-white/60">({enfermos})</span>
              </button>
            )}
            {sucio && (
              <button type="button" onClick={() => void limpiarCorral(corralId)} className={btnBurbuja}>
                <Icono nombre="escoba" /> {t('granja.burbuja.limpiar', 'Limpiar')}
              </button>
            )}
          </div>
          <span
            className="pointer-events-none -mt-px h-0 w-0 border-x-[8px] border-t-[10px] border-x-transparent"
            style={{ borderTopColor: 'rgba(255,255,255,0.25)' }}
            aria-hidden
          />
        </div>
      </div>
    </div>
  )
}
