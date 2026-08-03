import { useState } from 'react'
import type { DietaGuardada, PerfilNutricion, Receta } from '../../core/data/db'
import { perfilNutricionRepo } from '../../core/data/repository'
import { OBJETIVOS, PERFIL_DEFECTO } from './constantes'
import { caloriasDesdeMacros } from './macros'
import type { PerfilConId } from './macros'
import { PlanAlimenticio } from './PlanAlimenticio'
import { CronogramaApp } from '../../core/ui/metas/CronogramaApp'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'

/**
 * Paso 1 del control de alimentación, en orden de flujo: primero quién eres
 * (información corporal), luego a dónde vas (metas y objetivos diarios) y al
 * final el cronograma con el plan alimenticio que te lleva ahí.
 */
export function MetasTab({
  perfil,
  dietas,
  recetas,
  onIrARecetario,
}: {
  perfil: PerfilConId | undefined
  dietas: DietaGuardada[]
  recetas: Receta[]
  onIrARecetario: () => void
}) {
  const t = useT()
  const p = perfil ?? { id: 0, ...PERFIL_DEFECTO }

  // Tu información (perfil corporal)
  const [peso, setPeso] = useState(String(p.pesoKg ?? ''))
  const [altura, setAltura] = useState(String(p.alturaCm ?? ''))
  const [edad, setEdad] = useState(String(p.edad ?? ''))
  const [sexo, setSexo] = useState<'m' | 'f'>(p.sexo ?? 'm')
  const [actividad, setActividad] = useState(String(p.actividad ?? 1.55))

  // Tus metas
  const [objetivo, setObjetivo] = useState(p.objetivo ?? 'mantener')
  const [pesoObjetivo, setPesoObjetivo] = useState(String(p.pesoObjetivoKg || ''))
  const [ritmo, setRitmo] = useState(String(p.ritmoKgSemana || ''))
  const [calorias, setCalorias] = useState(String(p.calorias))
  const [proteinas, setProteinas] = useState(String(p.proteinas))
  const [carbos, setCarbos] = useState(String(p.carbohidratos))
  const [grasas, setGrasas] = useState(String(p.grasas))
  const [agua, setAgua] = useState(String(p.aguaMl))

  const [guardadoInfo, setGuardadoInfo] = useState(false)
  const [guardadoMetas, setGuardadoMetas] = useState(false)

  /**
   * TODO write pasa por aquí: sin perfil aún, lo crea (el bug histórico era
   * que la calculadora TDEE no guardaba nada en silencio si no había fila).
   */
  const persistir = async (datos: Partial<PerfilNutricion>) => {
    if (p.id) await perfilNutricionRepo.update(p.id, datos)
    else await perfilNutricionRepo.add({ ...PERFIL_DEFECTO, ...datos })
  }

  const datosInfo = () => ({
    pesoKg: parseFloat(peso) || undefined,
    alturaCm: parseFloat(altura) || undefined,
    edad: parseFloat(edad) || undefined,
    sexo,
    actividad: parseFloat(actividad),
  })

  const guardarInfo = async () => {
    await persistir(datosInfo())
    setGuardadoInfo(true)
    setTimeout(() => setGuardadoInfo(false), 2500)
  }

  /** Mifflin-St Jeor con la información de arriba × el factor del objetivo. */
  const usarTdee = async () => {
    const pk = parseFloat(peso) || 70
    const a = parseFloat(altura) || 170
    const e = parseFloat(edad) || 30
    const base = sexo === 'm' ? 10 * pk + 6.25 * a - 5 * e + 5 : 10 * pk + 6.25 * a - 5 * e - 161
    const factor = OBJETIVOS.find((o) => o.id === objetivo)?.factor ?? 1
    setCalorias(String(Math.round(base * parseFloat(actividad) * factor)))
    // La información con la que se calculó se guarda de paso.
    await persistir(datosInfo())
  }

  const guardarMetas = async () => {
    const destino = parseFloat(pesoObjetivo)
    const kgSemana = Math.abs(parseFloat(ritmo))
    await persistir({
      objetivo,
      pesoObjetivoKg: Number.isFinite(destino) && destino > 0 ? destino : undefined,
      ritmoKgSemana: Number.isFinite(kgSemana) && kgSemana > 0 ? kgSemana : undefined,
      calorias: parseInt(calorias, 10) || PERFIL_DEFECTO.calorias,
      proteinas: parseInt(proteinas, 10) || PERFIL_DEFECTO.proteinas,
      carbohidratos: parseInt(carbos, 10) || PERFIL_DEFECTO.carbohidratos,
      grasas: parseInt(grasas, 10) || PERFIL_DEFECTO.grasas,
      aguaMl: parseInt(agua, 10) || PERFIL_DEFECTO.aguaMl,
    })
    setGuardadoMetas(true)
    setTimeout(() => setGuardadoMetas(false), 2500)
  }

  const sugerirMacros = () => {
    const kcal = parseInt(calorias, 10) || 2200
    setProteinas(String(Math.round((kcal * 0.3) / 4)))
    setCarbos(String(Math.round((kcal * 0.4) / 4)))
    setGrasas(String(Math.round((kcal * 0.3) / 9)))
  }

  const kcalSugeridas = caloriasDesdeMacros(
    parseFloat(proteinas) || 0,
    parseFloat(carbos) || 0,
    parseFloat(grasas) || 0,
  )

  return (
    <div className="space-y-5">
      {/* 1. Tu información */}
      <div className="rounded-xl bg-white/5 p-4 border border-white/10 space-y-3">
        <p className="text-sm font-semibold">
          <Icono nombre="perfil" /> {t('cocina.metas.info', 'Tu información')}
        </p>
        <div className="grid grid-cols-3 gap-2">
          <CampoMeta label={t('cocina.tdee.peso', 'Peso kg')} value={peso} onChange={setPeso} />
          <CampoMeta label={t('cocina.tdee.altura', 'Altura cm')} value={altura} onChange={setAltura} />
          <CampoMeta label={t('cocina.tdee.edad', 'Edad')} value={edad} onChange={setEdad} />
        </div>
        <div className="flex gap-2">
          {(['m', 'f'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSexo(s)}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold ${
                sexo === s ? 'bg-amber-600 texto-cta' : 'bg-white/5'
              }`}
            >
              {s === 'm' ? t('cocina.tdee.hombre', 'Hombre') : t('cocina.tdee.mujer', 'Mujer')}
            </button>
          ))}
        </div>
        <select
          value={actividad}
          onChange={(e) => setActividad(e.target.value)}
          className="w-full rounded-lg bg-black/30 px-2 py-2 text-sm border border-white/10"
        >
          <option value="1.2">{t('cocina.tdee.sedentario', 'Sedentario')}</option>
          <option value="1.375">{t('cocina.tdee.ligero', 'Ligero')}</option>
          <option value="1.55">{t('cocina.tdee.moderado', 'Moderado')}</option>
          <option value="1.725">{t('cocina.tdee.activo', 'Activo')}</option>
          <option value="1.9">{t('cocina.tdee.muyActivo', 'Muy activo')}</option>
        </select>
        <button
          type="button"
          onClick={guardarInfo}
          className="w-full rounded-xl py-2.5 font-bold bg-white/10 hover:bg-white/15"
        >
          {guardadoInfo
            ? t('cocina.metas.infoGuardada', '✓ Información guardada')
            : t('cocina.metas.guardarInfo', 'Guardar información')}
        </button>
      </div>

      {/* 2. Tus metas */}
      <div className="rounded-xl bg-white/5 p-4 border border-white/10 space-y-3">
        <p className="text-sm font-semibold">
          <Icono nombre="balanza" /> {t('cocina.metas.tusMetas', 'Tus metas')}
        </p>
        <div className="flex gap-2">
          {OBJETIVOS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setObjetivo(o.id)}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold ${
                objetivo === o.id ? 'bg-amber-600 texto-cta' : 'bg-white/5'
              }`}
            >
              <Icono emoji={o.icon} /> {t(`cocina.tdee.${o.id}`, o.label)}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <CampoMeta
            label={
              objetivo === 'mantener'
                ? t('cocina.metas.pesoMantener', 'Peso a mantener (kg)')
                : t('cocina.metas.pesoObjetivo', 'Peso objetivo (kg)')
            }
            value={pesoObjetivo}
            onChange={setPesoObjetivo}
          />
          <CampoMeta
            label={t('cocina.metas.ritmo', 'Ritmo (kg/semana)')}
            value={ritmo}
            onChange={setRitmo}
          />
        </div>
        <p className="text-xs text-white/40">
          {t('cocina.metas.metaAyuda', 'Sin peso objetivo no se puede calcular tu progreso ni cuándo llegas.')}
        </p>

        <div data-tut="cocina.metas.objetivos" className="flex items-center justify-between border-t border-white/10 pt-3">
          <p className="text-sm font-semibold">
            <Icono nombre="objetivo" /> {t('cocina.metas.objetivos', 'Objetivos diarios')}
          </p>
          <span className="flex gap-3">
            <button
              type="button"
              onClick={usarTdee}
              className="text-xs font-semibold text-amber-400 hover:underline"
            >
              {t('cocina.metas.usarTdee', 'Usar mi TDEE')}
            </button>
            <button
              type="button"
              onClick={sugerirMacros}
              className="text-xs font-semibold text-amber-400 hover:underline"
            >
              {t('cocina.metas.auto', 'Auto 30/40/30')}
            </button>
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <CampoMeta label={t('cocina.metas.cal', 'Calorías (kcal)')} value={calorias} onChange={setCalorias} />
          <CampoMeta label={t('cocina.metas.aguaMl', 'Agua (ml)')} value={agua} onChange={setAgua} />
          <CampoMeta label={t('cocina.metas.prot', 'Proteína (g)')} value={proteinas} onChange={setProteinas} />
          <CampoMeta label={t('cocina.metas.carb', 'Carbohidratos (g)')} value={carbos} onChange={setCarbos} />
          <CampoMeta label={t('cocina.metas.gras', 'Grasas (g)')} value={grasas} onChange={setGrasas} />
        </div>
        <p className="text-xs text-white/40">
          {t('cocina.metas.suma', `Suma macros ≈ ${kcalSugeridas} kcal (fórmula 4-4-9)`, { n: String(kcalSugeridas) })}
          {' · '}
          {t('cocina.metas.tdeeAyuda', '«Usar mi TDEE» calcula tus calorías con la información de arriba.')}
        </p>
        <button
          type="button"
          onClick={guardarMetas}
          className="w-full rounded-xl py-2.5 font-bold bg-amber-600 texto-cta"
        >
          {guardadoMetas
            ? t('cocina.metas.metasGuardadas', '✓ Metas guardadas')
            : t('cocina.metas.guardarMetas', 'Guardar metas')}
        </button>
      </div>

      {/* 3. Cronograma + plan alimenticio */}
      <div className="space-y-3">
        <p className="text-sm font-semibold">
          <Icono nombre="calendario" /> {t('cocina.metas.cronograma', 'Cronograma')}
        </p>
        <CronogramaApp plantillaId="cocina" />
        <PlanAlimenticio perfil={p} dietas={dietas} recetas={recetas} onIrARecetario={onIrARecetario} />
      </div>
    </div>
  )
}

function CampoMeta({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="block">
      <span className="text-[10px] text-white/45">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 w-full rounded-lg bg-black/30 px-2 py-1.5 text-sm border border-white/10 outline-none"
      />
    </label>
  )
}
