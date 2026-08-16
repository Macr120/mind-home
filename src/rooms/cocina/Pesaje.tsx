import { useMemo, useState } from 'react'
import type { PerfilNutricion, RegistroPeso } from '../../core/data/db'
import { registrarPeso } from './peso'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'

const VERDE = '#34d399'

/**
 * El pesaje del día, junto a la hidratación: todo lo que se APUNTA vive en el
 * paso Registro. La tendencia y la meta se leen en Progreso.
 */
export function Pesaje({
  fecha,
  pesos,
  perfil,
}: {
  fecha: string
  pesos: RegistroPeso[]
  perfil: PerfilNutricion
}) {
  const t = useT()
  const [kg, setKg] = useState('')

  // Último pesaje del día (si se pesó varias veces, gana el más reciente).
  const delDia = useMemo(() => {
    let ultimo: RegistroPeso | null = null
    for (const p of pesos) {
      if (p.fecha === fecha && (!ultimo || (p.id ?? 0) > (ultimo.id ?? 0))) ultimo = p
    }
    return ultimo
  }, [pesos, fecha])

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    const n = parseFloat(kg)
    if (!Number.isFinite(n) || n <= 0) return
    await registrarPeso(fecha, Math.round(n * 10) / 10)
    setKg('')
  }

  const un = (n: number) => (Math.round(n * 10) / 10).toFixed(1)

  return (
    <div className="rounded-xl bg-white/5 p-4 border border-white/10">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">
          <Icono nombre="balanza" /> {t('cocina.peso.titulo', 'Peso corporal')}
        </span>
        <span className="text-sm" style={{ color: delDia ? VERDE : undefined }}>
          {delDia ? (
            <span className="font-bold">{un(delDia.kg)} kg</span>
          ) : (
            <span className="text-white/40">{t('cocina.peso.sinHoy', 'Sin pesaje')}</span>
          )}
          {perfil.pesoObjetivoKg != null && (
            <span className="ms-1.5 text-xs text-white/40">
              {t('cocina.peso.lineaMeta', `Meta ${un(perfil.pesoObjetivoKg)} kg`, {
                n: un(perfil.pesoObjetivoKg),
              })}
            </span>
          )}
        </span>
      </div>

      <form onSubmit={guardar} className="mt-3 flex items-center gap-2">
        <input
          type="number"
          min={0}
          step="0.1"
          value={kg}
          onChange={(e) => setKg(e.target.value)}
          placeholder={
            delDia
              ? t('cocina.peso.phCorregir', 'Corrige tu peso… (kg)')
              : t('cocina.peso.ph', 'Pésate hoy… (kg)')
          }
          className="flex-1 rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10 outline-none focus:border-emerald-400/50"
        />
        <button
          type="submit"
          className="rounded-lg bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/30"
        >
          {t('cocina.peso.registrar', 'Registrar')}
        </button>
      </form>
    </div>
  )
}
