import { useEffect, useState } from 'react'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { VACIO, animalesRepo, cestaRepo, corralesRepo } from '../../core/data/repository'
import {
  ANIMALES,
  estaHambriento,
  estaAburrido,
  estaEnfermo,
  corralSucio,
} from '../../core/state/granjaStore'
import type { TipoAnimal } from '../../core/data/db'
import { BarraEjemplo } from '../_shared/ejemplos/BarraEjemplo'
import { ejemploGranja } from './ejemplos'

/** Resumen 2D de la Granja: animales por especie, hambrientos y cesta disponible. */
export function Resumen() {
  const t = useT()
  const filas = animalesRepo.useAll() ?? VACIO
  const corrales = corralesRepo.useAll() ?? VACIO
  const cesta = (cestaRepo.useAll() ?? VACIO).reduce((n, c) => n + c.cantidad, 0)
  // Tick de 30 s: el hambre/aburrimiento avanzan aunque no cambien los datos.
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setAhora(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [])
  const sucios = corrales.filter((c) => corralSucio(c, ahora))
  const idsSucios = new Set(sucios.map((c) => c.id))
  const hambrientos = filas.filter((f) => estaHambriento(f, ahora)).length
  const aburridos = filas.filter((f) => estaAburrido(f, ahora, idsSucios.has(f.corralId))).length
  const enfermos = filas.filter((f) => estaEnfermo(f, ahora)).length
  const tipos = Object.keys(ANIMALES) as TipoAnimal[]
  return (
    <div className="mx-auto flex h-full max-w-md flex-col gap-3 p-4">
      <p className="text-sm text-white/60">
        {t('infra.resumen.ayuda', 'Esta plantilla se construye en el mapa 3D: menú → Plantillas → Complementos → Construir.')}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {tipos.map((a) => (
          <div key={a} className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
            <div className="text-2xl">
              <Icono emoji={ANIMALES[a].icon} />
            </div>
            <div className="mt-1 text-2xl font-black text-white/90">
              {filas.filter((f) => f.tipo === a).length}
            </div>
            <div className="mt-0.5 text-[11px] leading-tight text-white/55">
              {t(`granja.animal.${a}`, ANIMALES[a].nombre)}
            </div>
          </div>
        ))}
        <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-center">
          <div className="text-2xl">
            <Icono emoji="🍽️" />
          </div>
          <div className="mt-1 text-2xl font-black text-amber-200">{hambrientos}</div>
          <div className="mt-0.5 text-[11px] leading-tight text-white/55">
            {t('granja.stat.hambrientos', 'Con hambre')}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
          <div className="text-2xl">
            <Icono emoji="💤" />
          </div>
          <div className="mt-1 text-2xl font-black text-white/80">{aburridos}</div>
          <div className="mt-0.5 text-[11px] leading-tight text-white/55">
            {t('granja.stat.aburridos', 'Aburridos')}
          </div>
        </div>
        <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-center">
          <div className="text-2xl">
            <Icono emoji="🤒" />
          </div>
          <div className="mt-1 text-2xl font-black text-red-200">{enfermos}</div>
          <div className="mt-0.5 text-[11px] leading-tight text-white/55">
            {t('granja.stat.enfermos', 'Enfermos')}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
          <div className="text-2xl">
            <Icono emoji="🧹" />
          </div>
          <div className="mt-1 text-2xl font-black text-white/80">{sucios.length}</div>
          <div className="mt-0.5 text-[11px] leading-tight text-white/55">
            {t('granja.stat.sucios', 'Corrales sucios')}
          </div>
        </div>
      </div>
      <p className="text-xs text-white/40">
        {t('granja.resumen.nota', 'Se alimentan con la cesta de Comida.')} {t('huerto.cesta', 'Cesta')}: {cesta}
      </p>

      <BarraEjemplo paquete={ejemploGranja} />
    </div>
  )
}
