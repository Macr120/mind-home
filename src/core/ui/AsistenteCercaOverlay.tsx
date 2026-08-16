import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useAsistenteCerca } from '../state/asistenteCercaStore'
import { useAsistentes } from '../state/asistentesStore'
import { useMascota } from '../state/mascotaStore'
import { useDialogo } from '../state/dialogoStore'
import { posAsistentes } from '../state/posAsistentes'
import { ALTURA_FLOTE } from '../house/Asistente3D'
import { registrarAncla, quitarAncla, registrarDom, quitarDom } from '../house/etiquetasMapa'
import { nombreAsistente, type Asistente } from '../chat/mascotas'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'

/**
 * Burbuja de «Hablar» en juego: al acercarse a un asistente (AsistenteProximity)
 * ofrece entrar al diálogo cara a cara sin tener que atinarle con el clic. Se
 * ancla a su cabeza con el proyector de etiquetasMapa, que la sigue mientras
 * el asistente deambula.
 */
export function AsistenteCercaOverlay() {
  const asistenteId = useAsistenteCerca((s) => s.asistenteId)
  const lista = useAsistentes((s) => s.lista)
  const mensaje = useMascota((s) => s.mensaje)
  const pensando = useMascota((s) => s.pensando)
  const hablanteId = useMascota((s) => s.hablanteId)
  const mascotaId = useMascota((s) => s.mascota)
  if (!asistenteId) return null
  // Mientras habla, su burbuja de diálogo ocupa ese mismo punto: no estorbarla.
  if ((mensaje || pensando) && (hablanteId ?? mascotaId) === asistenteId) return null
  const a = lista.find((x) => x.id === asistenteId)
  if (!a) return null
  return <Burbuja asistente={a} />
}

function Burbuja({ asistente }: { asistente: Asistente }) {
  const t = useT()
  const id = asistente.id
  const ancla = useRef(new THREE.Vector3())

  useEffect(() => {
    const anclaId = `hablar:${id}`
    registrarAncla(anclaId, () => {
      const p = posAsistentes[id]
      return p ? ancla.current.set(p.x, ALTURA_FLOTE + 1.5, p.z) : null
    })
    return () => quitarAncla(anclaId)
  }, [id])

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      <div
        ref={(el) => {
          const anclaId = `hablar:${id}`
          if (el) registrarDom(anclaId, el)
          else quitarDom(anclaId)
        }}
        className="absolute start-0 top-0"
        style={{ display: 'none' }}
      >
        <div className="flex -translate-x-1/2 -translate-y-full select-none flex-col items-center">
          <button
            type="button"
            onClick={() => useDialogo.getState().entrar(id)}
            className="ui-panel-glass pointer-events-auto flex items-center gap-1.5 rounded-2xl border border-white/15 px-3 py-1.5 text-[12px] font-semibold text-white shadow-xl backdrop-blur-md transition hover:border-emerald-400/50 hover:bg-white/10 active:scale-95"
          >
            <Icono nombre="hablar" /> {t('dialogo.hablar', 'Hablar')}
            <span className="max-w-24 truncate font-normal text-white/50">
              {nombreAsistente(t, asistente)}
            </span>
          </button>
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
