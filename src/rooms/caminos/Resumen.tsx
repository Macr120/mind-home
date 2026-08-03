import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { VACIO, caminosRepo } from '../../core/data/repository'
import { BarraEjemplo } from '../_shared/ejemplos/BarraEjemplo'
import { ejemploCaminos } from './ejemplos'

/** Resumen 2D de Caminos: conteo de tramos construidos en el mapa por tipo. */
export function Resumen() {
  const t = useT()
  const filas = caminosRepo.useAll() ?? VACIO
  const tipos = [
    { tipo: 'pista', icon: '🏎️', nombre: t('caminos.tipo.pista', 'Pista de carreras') },
    { tipo: 'riel', icon: '🚂', nombre: t('caminos.tipo.riel', 'Riel de tren') },
    { tipo: 'coaster', icon: '🎢', nombre: t('caminos.tipo.coaster', 'Montaña rusa') },
  ]
  return (
    <div className="mx-auto flex h-full max-w-md flex-col gap-3 p-4">
      <p className="text-sm text-white/60">
        {t('infra.resumen.ayuda', 'Esta plantilla se construye en el mapa 3D: menú → Plantillas → Complementos → Construir.')}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {tipos.map((x) => (
          <div key={x.tipo} className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
            <div className="text-2xl">
              <Icono emoji={x.icon} />
            </div>
            <div className="mt-1 text-2xl font-black text-white/90">
              {filas.filter((f) => f.tipo === x.tipo).length}
            </div>
            <div className="mt-0.5 text-[11px] leading-tight text-white/55">{x.nombre}</div>
          </div>
        ))}
      </div>
      <p className="text-xs text-white/40">
        {t('caminos.resumen.unidad', 'Los conteos son tramos (celdas del mapa con camino).')}
      </p>

      <BarraEjemplo paquete={ejemploCaminos} />
    </div>
  )
}
