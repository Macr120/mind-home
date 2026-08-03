import { useEffect, useState } from 'react'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { cultivosRepo } from '../../core/data/repository'
import { estadoCultivo } from '../../core/house/cultivos'
import { BarraEjemplo } from '../_shared/ejemplos/BarraEjemplo'
import { ejemploHuerto } from './ejemplos'

/** Resumen 2D del Huerto: parcelas, cultivos por estado y cosechas acumuladas. */
export function Resumen() {
  const t = useT()
  const filas = cultivosRepo.useAll() ?? []
  // Tick de 30 s: los cultivos avanzan de etapa aunque no cambien los datos.
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setAhora(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [])
  const estados = filas.map((f) => estadoCultivo(f, ahora))
  const creciendo = estados.filter((e) => e && e.etapa !== 'listo' && e.etapa !== 'marchito').length
  const listos = estados.filter((e) => e?.etapa === 'listo').length
  const marchitos = estados.filter((e) => e?.etapa === 'marchito').length
  const cosechas = filas.reduce((n, f) => n + (f.cosechas ?? 0), 0)
  const stats = [
    { icon: '🟫', nombre: t('huerto.stat.parcelas', 'Parcelas'), n: filas.length },
    { icon: '🌱', nombre: t('huerto.stat.creciendo', 'Creciendo'), n: creciendo },
    { icon: '✅', nombre: t('huerto.stat.listos', 'Listos'), n: listos },
    { icon: '🥀', nombre: t('huerto.stat.marchitos', 'Marchitos'), n: marchitos },
    { icon: '🧺', nombre: t('huerto.stat.cosechas', 'Cosechas'), n: cosechas },
  ]
  return (
    <div className="mx-auto flex h-full max-w-md flex-col gap-3 p-4">
      <p className="text-sm text-white/60">
        {t('infra.resumen.ayuda', 'Esta plantilla se construye en el mapa 3D: menú → Plantillas → Complementos → Construir.')}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {stats.map((x) => (
          <div key={x.nombre} className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
            <div className="text-2xl">
              <Icono emoji={x.icon} />
            </div>
            <div className="mt-1 text-2xl font-black text-white/90">{x.n}</div>
            <div className="mt-0.5 text-[11px] leading-tight text-white/55">{x.nombre}</div>
          </div>
        ))}
      </div>
      <p className="text-xs text-white/40">
        {t('huerto.resumen.nota', 'Los cultivos crecen en tiempo real; riégalos a tiempo o se marchitan.')}
      </p>

      <BarraEjemplo paquete={ejemploHuerto} />
    </div>
  )
}
