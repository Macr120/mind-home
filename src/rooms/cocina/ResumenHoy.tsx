import { useState } from 'react'
import type { PerfilNutricion, RegistroComida } from '../../core/data/db'
import { pctObjetivo, sumarMacros } from './macros'
import { COLOR } from './constantes'
import { useT } from '../../core/i18n/useT'
import { vivo } from '../../core/ui/estilos'
import { Icono } from '../../core/ui/iconos/Icono'

type Clave = 'calorias' | 'proteinas' | 'carbohidratos' | 'grasas' | 'agua'

/** Las cinco medidas del día, en el mismo orden en que se leen. */
const METRICAS: { clave: Clave; color: string; unidad: string; cortoEs: string; tituloEs: string }[] = [
  { clave: 'calorias', color: COLOR, unidad: 'kcal', cortoEs: 'Kcal', tituloEs: 'Calorías hoy' },
  { clave: 'proteinas', color: '#f472b6', unidad: 'g', cortoEs: 'Prot', tituloEs: 'Proteína' },
  { clave: 'carbohidratos', color: '#60a5fa', unidad: 'g', cortoEs: 'Carbos', tituloEs: 'Carbos' },
  { clave: 'grasas', color: '#a78bfa', unidad: 'g', cortoEs: 'Grasas', tituloEs: 'Grasas' },
  { clave: 'agua', color: '#34d399', unidad: 'L', cortoEs: 'Agua', tituloEs: 'Agua' },
]

/**
 * Lo de hoy vive donde se registra: los cinco anillos ocupan lo mismo y el que
 * tocas se abre arriba en grande con su barra. Un vistazo que no empuja el
 * registro de comidas fuera de la pantalla.
 */
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
  const [sel, setSel] = useState<Clave>('calorias')
  const tot = sumarMacros(comidas.filter((c) => c.fecha === fecha))

  const valores: Record<Clave, { valor: number; objetivo: number }> = {
    calorias: { valor: tot.calorias, objetivo: perfil.calorias },
    proteinas: { valor: tot.proteinas, objetivo: perfil.proteinas },
    carbohidratos: { valor: tot.carbohidratos, objetivo: perfil.carbohidratos },
    grasas: { valor: tot.grasas, objetivo: perfil.grasas },
    // El agua se guarda en ml pero se lee en litros: cuatro cifras no caben.
    agua: { valor: aguaMl / 1000, objetivo: perfil.aguaMl / 1000 },
  }

  const activa = METRICAS.find((m) => m.clave === sel)!
  const { valor, objetivo } = valores[sel]
  const falta = Math.max(0, objetivo - valor)
  const pasado = sel === 'calorias' && valor > objetivo
  const cifra = (n: number) => (sel === 'agua' ? n.toFixed(1) : String(Math.round(n)))

  return (
    <div className="rounded-xl border border-white/10 p-4 transition-colors" style={{ background: `${activa.color}18` }}>
      <p className="text-[10px] text-white/50">{t(`cocina.metrica.${activa.clave}`, activa.tituloEs)}</p>
      <p className="text-2xl font-black leading-tight texto-vivo" style={vivo(activa.color)}>
        {cifra(valor)}
        <span className="text-sm font-semibold text-white/50">
          {' '}
          / {cifra(objetivo)} {activa.unidad}
        </span>
      </p>
      <div className="mt-1 h-1.5 w-full rounded-full bg-black/40 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pctObjetivo(valor, objetivo)}%`,
            background: pasado ? '#ef4444' : activa.color,
          }}
        />
      </div>

      <p className="mt-2 text-[11px] text-white/50">
        {sel === 'calorias' ? (
          falta > 0 ? (
            t('cocina.calRestantes', `Te quedan ${Math.round(falta)} kcal para tu objetivo`, {
              n: String(Math.round(falta)),
            })
          ) : (
            <>
              <Icono nombre="alerta" /> {t('cocina.calSuperado', 'Superaste el objetivo calórico de hoy')}
            </>
          )
        ) : falta > 0 ? (
          t('cocina.faltan', `Te faltan ${cifra(falta)} ${activa.unidad} para tu objetivo`, {
            n: cifra(falta),
            u: activa.unidad,
          })
        ) : (
          t('cocina.cumplido', 'Objetivo cumplido')
        )}
      </p>

      <div className="mt-3 grid grid-cols-5 gap-1">
        {METRICAS.map((m) => (
          <Anillo
            key={m.clave}
            label={t(`cocina.metricaCorta.${m.clave}`, m.cortoEs)}
            valor={valores[m.clave].valor}
            objetivo={valores[m.clave].objetivo}
            decimales={m.clave === 'agua'}
            color={m.color}
            activo={m.clave === sel}
            onClick={() => setSel(m.clave)}
          />
        ))}
      </div>
    </div>
  )
}

const R = 17
const CIRCUNFERENCIA = 2 * Math.PI * R

/** Anillo de progreso de una medida; al tocarlo se abre en grande arriba. */
function Anillo({
  label,
  valor,
  objetivo,
  decimales,
  color,
  activo,
  onClick,
}: {
  label: string
  valor: number
  objetivo: number
  decimales: boolean
  color: string
  activo: boolean
  onClick: () => void
}) {
  const pct = pctObjetivo(valor, objetivo)

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`flex flex-col items-center gap-0.5 rounded-lg py-1.5 transition ${
        activo ? 'bg-white/10' : 'hover:bg-white/5'
      }`}
    >
      <span className="relative block h-11 w-11">
        <svg viewBox="0 0 44 44" className="h-11 w-11 -rotate-90">
          <circle cx="22" cy="22" r={R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
          <circle
            cx="22"
            cy="22"
            r={R}
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={CIRCUNFERENCIA}
            strokeDashoffset={CIRCUNFERENCIA * (1 - pct / 100)}
            className="transition-all"
          />
        </svg>
        {/* El texto va fuera del SVG: dentro heredaría el giro de -90°. */}
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white/90">
          {decimales ? valor.toFixed(1) : Math.round(valor)}
        </span>
      </span>
      <span className={`truncate text-[9px] uppercase tracking-wide ${activo ? 'text-white/70' : 'text-white/40'}`}>
        {label}
      </span>
    </button>
  )
}
