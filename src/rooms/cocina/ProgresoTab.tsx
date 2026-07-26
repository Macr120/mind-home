import { useMemo, useRef, useState } from 'react'
import type { PerfilNutricion, RegistroComida, RegistroPeso } from '../../core/data/db'
import { perfilNutricionRepo } from '../../core/data/repository'
import type { PerfilConId } from './macros'
import { balanceSemanal, sugerirAjusteKcal } from './balance'
import { progresoMeta } from './peso'
import { PesoPanel } from './PesoPanel'
import { SemanaCard } from './SemanaCard'
import { HoyCompacto } from './ResumenHoy'
import { MetasTab } from './MetasTab'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'

/** El enfoque de peso: a dónde vas, cómo va la semana y qué ajustar. */
export function ProgresoTab({
  fecha,
  comidas,
  aguaMl,
  perfil,
  perfilRaw,
  pesos,
}: {
  fecha: string
  comidas: RegistroComida[]
  aguaMl: number
  perfil: PerfilNutricion
  perfilRaw: PerfilConId | undefined
  pesos: RegistroPeso[]
}) {
  const t = useT()
  const [ajustes, setAjustes] = useState(false)
  const refAjustes = useRef<HTMLDivElement>(null)

  const abrirAjustes = () => {
    setAjustes(true)
    // El acordeón está al final: sin esto el usuario no ve que se abrió.
    requestAnimationFrame(() => refAjustes.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  return (
    <div className="space-y-4">
      <PesoPanel fecha={fecha} pesos={pesos} perfil={perfil} onAjustar={abrirAjustes} />
      <HoyCompacto fecha={fecha} comidas={comidas} aguaMl={aguaMl} perfil={perfil} />
      <SemanaCard fecha={fecha} comidas={comidas} perfil={perfil} />
      <SugerenciaAjuste fecha={fecha} comidas={comidas} perfil={perfil} perfilRaw={perfilRaw} pesos={pesos} />

      <div ref={refAjustes} className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
        <button
          type="button"
          onClick={() => setAjustes((v) => !v)}
          className="flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold hover:bg-white/5"
        >
          <Icono nombre="objetivo" /> {t('cocina.ajustar.abrir', 'Ajustar objetivo')}
          <span className="ml-auto text-white/40">{ajustes ? '−' : '+'}</span>
        </button>
        {ajustes && (
          <div className="border-t border-white/10 p-4">
            <MetasTab perfil={perfilRaw} />
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Cuando la báscula no sigue al plan, proponer cuántas kcal mover. Se propone y
 * se aplica con un botón: nunca solo.
 */
function SugerenciaAjuste({
  fecha,
  comidas,
  perfil,
  perfilRaw,
  pesos,
}: {
  fecha: string
  comidas: RegistroComida[]
  perfil: PerfilNutricion
  perfilRaw: PerfilConId | undefined
  pesos: RegistroPeso[]
}) {
  const t = useT()
  const [aplicado, setAplicado] = useState(false)

  const sugerencia = useMemo(() => {
    const meta = progresoMeta(pesos, perfil, fecha)
    return sugerirAjusteKcal(meta, balanceSemanal(comidas, perfil, fecha), perfil)
  }, [pesos, comidas, perfil, fecha])

  if (!sugerencia || !perfilRaw?.id) return null

  const aplicar = async () => {
    await perfilNutricionRepo.update(perfilRaw.id, { calorias: sugerencia.kcalPropuestas })
    setAplicado(true)
  }

  if (aplicado) {
    return (
      <p className="rounded-xl bg-emerald-500/15 px-4 py-3 text-xs font-semibold text-emerald-400">
        {t('cocina.ajuste.aplicado', `Listo, tu objetivo ahora es de ${sugerencia.kcalPropuestas} kcal al día.`, {
          n: String(sugerencia.kcalPropuestas),
        })}
      </p>
    )
  }

  const sube = sugerencia.deltaKcal > 0
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
      <p className="text-sm font-semibold text-amber-300">
        <Icono nombre="brillo" /> {t('cocina.ajuste.titulo', 'Tu peso no va al ritmo pactado')}
      </p>
      <p className="mt-1 text-xs text-white/60">
        {sube
          ? t('cocina.ajuste.subir', `Prueba comer ${Math.abs(sugerencia.deltaKcal)} kcal más al día.`, {
              n: String(Math.abs(sugerencia.deltaKcal)),
            })
          : t('cocina.ajuste.bajar', `Prueba comer ${Math.abs(sugerencia.deltaKcal)} kcal menos al día.`, {
              n: String(Math.abs(sugerencia.deltaKcal)),
            })}
      </p>
      <button
        type="button"
        onClick={aplicar}
        className="mt-3 w-full rounded-lg bg-amber-600 py-2 text-xs font-bold texto-cta hover:brightness-110"
      >
        {t('cocina.ajuste.aplicar', `Poner ${sugerencia.kcalPropuestas} kcal como objetivo`, {
          n: String(sugerencia.kcalPropuestas),
        })}
      </button>
    </div>
  )
}
