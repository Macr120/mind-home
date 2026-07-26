import type { PerfilNutricion, RegistroComida } from '../../core/data/db'
import { MacroAnillo } from './MacroAnillo'
import { pctObjetivo, sumarMacros } from './macros'
import { COLOR } from './constantes'
import { useT } from '../../core/i18n/useT'
import { vivo } from '../../core/ui/estilos'
import { Icono } from '../../core/ui/iconos/Icono'

/** Lo de hoy vive donde se registra: calorías, macros y agua del día. */
export function ResumenHoy({
  fecha,
  comidas,
  aguaMl,
  perfil,
}: {
  fecha: string
  comidas: RegistroComida[]
  aguaMl: number
  perfil: PerfilNutricion
}) {
  const t = useT()
  const tot = sumarMacros(comidas.filter((c) => c.fecha === fecha))
  const restantes = Math.max(0, perfil.calorias - tot.calorias)
  const pctCal = pctObjetivo(tot.calorias, perfil.calorias)

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-white/10 p-4" style={{ background: `${COLOR}18` }}>
        <p className="text-xs text-white/50">{t('cocina.calHoy', 'Calorías hoy')}</p>
        <p className="text-3xl font-black texto-vivo" style={vivo(COLOR)}>
          {tot.calorias}
          <span className="text-lg font-semibold text-white/50"> / {perfil.calorias} kcal</span>
        </p>
        <div className="mt-2 h-2.5 w-full rounded-full bg-black/40 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pctCal}%`,
              background: tot.calorias > perfil.calorias ? '#ef4444' : COLOR,
            }}
          />
        </div>
        <p className="mt-2 text-xs text-white/50">
          {restantes > 0 ? (
            t('cocina.calRestantes', `Te quedan ${restantes} kcal para tu objetivo`, { n: String(restantes) })
          ) : (
            <>
              <Icono nombre="alerta" /> {t('cocina.calSuperado', 'Superaste el objetivo calórico de hoy')}
            </>
          )}
        </p>
      </div>

      <div className="rounded-xl bg-white/5 p-4 border border-white/10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 justify-items-center">
          <MacroAnillo
            label={t('cocina.proteina', 'Proteína')}
            consumido={tot.proteinas}
            objetivo={perfil.proteinas}
            unidad="g"
            color="#f472b6"
          />
          <MacroAnillo
            label={t('cocina.carbos', 'Carbos')}
            consumido={tot.carbohidratos}
            objetivo={perfil.carbohidratos}
            unidad="g"
            color="#60a5fa"
          />
          <MacroAnillo
            label={t('cocina.grasas', 'Grasas')}
            consumido={tot.grasas}
            objetivo={perfil.grasas}
            unidad="g"
            color="#a78bfa"
          />
          <MacroAnillo
            label={t('cocina.aguaMeta', 'Agua')}
            consumido={aguaMl}
            objetivo={perfil.aguaMl}
            unidad="ml"
            color="#34d399"
          />
        </div>
      </div>
    </div>
  )
}

/** El vistazo de hoy en una línea, para no perderlo en la pantalla de Progreso. */
export function HoyCompacto({
  fecha,
  comidas,
  aguaMl,
  perfil,
}: {
  fecha: string
  comidas: RegistroComida[]
  aguaMl: number
  perfil: PerfilNutricion
}) {
  const t = useT()
  const tot = sumarMacros(comidas.filter((c) => c.fecha === fecha))

  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3 border border-white/10 text-sm">
      <span className="text-xs text-white/45">{t('cocina.hoy', 'Hoy')}</span>
      <span className="font-bold texto-vivo" style={vivo(COLOR)}>
        {tot.calorias}
        <span className="font-normal text-white/40"> / {perfil.calorias} kcal</span>
      </span>
      <span className="ml-auto text-xs text-white/60">
        <Icono nombre="humedad" /> {(aguaMl / 1000).toFixed(1)} / {(perfil.aguaMl / 1000).toFixed(1)} L
      </span>
    </div>
  )
}
