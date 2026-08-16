import { useShallow } from 'zustand/react/shallow'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { useDiseño } from '../../core/state/disenoStore'
import { esCancha, claseDeCancha, CANCHAS, type ClaseCancha } from '../../core/state/canchasStore'

const CLASES: ClaseCancha[] = ['futbol', 'tenis', 'basket', 'beisbol']

/** Resumen 2D de Canchas: conteo de canchas colocadas en el mapa por clase. */
export function Resumen() {
  const t = useT()
  // Solo los CONTEOS (primitivos con useShallow): `s.objetos` crudo re-renderizaba
  // este resumen con cualquier movimiento de cualquier objeto de la casa.
  const conteos = useDiseño(
    useShallow((s) => {
      const n: Record<string, number> = {}
      for (const o of s.objetos) if (esCancha(o.tipo)) n[claseDeCancha(o.tipo)] = (n[claseDeCancha(o.tipo)] ?? 0) + 1
      return CLASES.map((c) => n[c] ?? 0)
    }),
  )
  const clases = CLASES
  return (
    <div className="mx-auto flex h-full max-w-md flex-col gap-3 p-4">
      <p className="text-sm text-white/60">
        {t('infra.resumen.ayuda', 'Esta plantilla se construye en el mapa 3D: menú → Plantillas → Complementos → Construir.')}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {clases.map((c, i) => (
          <div key={c} className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
            <div className="text-2xl">
              <Icono emoji={CANCHAS[c].icon} />
            </div>
            <div className="mt-1 text-2xl font-black text-white/90">{conteos[i]}</div>
            <div className="mt-0.5 text-[11px] leading-tight text-white/55">
              {t(`canchas.clase.${c}`, CANCHAS[c].corto)}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-white/40">
        {t('canchas.resumen.nota', 'Una vez colocada, una cancha se mueve y borra como cualquier objeto del mapa.')}
      </p>
    </div>
  )
}
