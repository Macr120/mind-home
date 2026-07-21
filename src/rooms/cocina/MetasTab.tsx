import { useState } from 'react'
import { perfilNutricionRepo } from '../../core/data/repository'
import { PERFIL_DEFECTO } from './constantes'
import { caloriasDesdeMacros } from './macros'
import type { PerfilConId } from './macros'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'

export function MetasTab({
  perfil,
}: {
  perfil: PerfilConId | undefined
}) {
  const p = perfil ?? { id: 0, ...PERFIL_DEFECTO }
  const [calorias, setCalorias] = useState(String(p.calorias))
  const [proteinas, setProteinas] = useState(String(p.proteinas))
  const [carbos, setCarbos] = useState(String(p.carbohidratos))
  const [grasas, setGrasas] = useState(String(p.grasas))
  const [agua, setAgua] = useState(String(p.aguaMl))

  const guardarPerfil = async () => {
    const datos = {
      calorias: parseInt(calorias, 10) || PERFIL_DEFECTO.calorias,
      proteinas: parseInt(proteinas, 10) || PERFIL_DEFECTO.proteinas,
      carbohidratos: parseInt(carbos, 10) || PERFIL_DEFECTO.carbohidratos,
      grasas: parseInt(grasas, 10) || PERFIL_DEFECTO.grasas,
      aguaMl: parseInt(agua, 10) || PERFIL_DEFECTO.aguaMl,
    }
    if (p.id) await perfilNutricionRepo.update(p.id, datos)
    else await perfilNutricionRepo.add(datos)
  }

  const sugerirMacros = () => {
    const kcal = parseInt(calorias, 10) || 2200
    setProteinas(String(Math.round(kcal * 0.3 / 4)))
    setCarbos(String(Math.round(kcal * 0.4 / 4)))
    setGrasas(String(Math.round(kcal * 0.3 / 9)))
  }

  const kcalSugeridas = caloriasDesdeMacros(
    parseFloat(proteinas) || 0,
    parseFloat(carbos) || 0,
    parseFloat(grasas) || 0,
  )
  const t = useT()

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-white/5 p-4 border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold"><Icono nombre="objetivo" /> {t('cocina.metas.objetivos', 'Objetivos diarios')}</p>
          <button
            type="button"
            onClick={sugerirMacros}
            className="text-xs font-semibold text-amber-400 hover:underline"
          >
            Auto 30/40/30
          </button>
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
        </p>
        <button
          type="button"
          onClick={guardarPerfil}
          className="w-full rounded-xl py-2.5 font-bold bg-amber-600 texto-cta"
        >
          {t('cocina.metas.guardar', 'Guardar objetivos')}
        </button>
      </div>

      <div className="rounded-xl bg-white/5 p-4 border border-white/10">
        <p className="text-sm font-semibold mb-2"><Icono nombre="calculadora" /> {t('cocina.tdee.titulo', 'Calculadora rápida (TDEE)')}</p>
        <CalculadoraTdee perfil={p} onAplicar={(k) => setCalorias(String(k))} />
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

/** Preset de dieta: factor sobre la TDEE. */
const OBJETIVOS: { id: 'deficit' | 'mantener' | 'superavit'; icon: string; label: string; factor: number }[] = [
  { id: 'deficit', icon: '🔻', label: 'Bajar −15%', factor: 0.85 },
  { id: 'mantener', icon: '⚖️', label: 'Mantener', factor: 1 },
  { id: 'superavit', icon: '📈', label: 'Subir +10%', factor: 1.1 },
]

function CalculadoraTdee({
  perfil,
  onAplicar,
}: {
  perfil: PerfilConId
  onAplicar: (kcal: number) => void
}) {
  const t = useT()
  const [peso, setPeso] = useState(String(perfil.pesoKg ?? 70))
  const [altura, setAltura] = useState(String(perfil.alturaCm ?? 170))
  const [edad, setEdad] = useState(String(perfil.edad ?? 30))
  const [sexo, setSexo] = useState<'m' | 'f'>(perfil.sexo ?? 'm')
  const [actividad, setActividad] = useState(String(perfil.actividad ?? 1.55))
  const [objetivo, setObjetivo] = useState(perfil.objetivo ?? 'mantener')
  const [pesoObjetivo, setPesoObjetivo] = useState(String(perfil.pesoObjetivoKg || ''))
  const [ritmo, setRitmo] = useState(String(perfil.ritmoKgSemana || ''))

  const calcular = async () => {
    const p = parseFloat(peso) || 70
    const a = parseFloat(altura) || 170
    const e = parseFloat(edad) || 30
    const base =
      sexo === 'm'
        ? 10 * p + 6.25 * a - 5 * e + 5
        : 10 * p + 6.25 * a - 5 * e - 161
    const factor = OBJETIVOS.find((o) => o.id === objetivo)?.factor ?? 1
    const kcal = Math.round(base * parseFloat(actividad) * factor)
    onAplicar(kcal)
    // Persiste los datos para no retecletearlos la próxima vez.
    if (perfil.id) {
      const destino = parseFloat(pesoObjetivo)
      const kgSemana = Math.abs(parseFloat(ritmo))
      await perfilNutricionRepo.update(perfil.id, {
        pesoKg: p,
        alturaCm: a,
        edad: e,
        sexo,
        actividad: parseFloat(actividad),
        objetivo,
        pesoObjetivoKg: Number.isFinite(destino) && destino > 0 ? destino : undefined,
        ritmoKgSemana: Number.isFinite(kgSemana) && kgSemana > 0 ? kgSemana : undefined,
      })
    }
  }

  return (
    <div className="space-y-2 text-sm">
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
      {objetivo !== 'mantener' && (
        <div className="grid grid-cols-2 gap-2">
          <CampoMeta
            label={t('cocina.tdee.pesoObjetivo', 'Peso objetivo kg')}
            value={pesoObjetivo}
            onChange={setPesoObjetivo}
          />
          <CampoMeta
            label={t('cocina.tdee.ritmo', 'Ritmo kg/semana')}
            value={ritmo}
            onChange={setRitmo}
          />
        </div>
      )}
      <button
        type="button"
        onClick={calcular}
        className="w-full rounded-lg py-2 bg-white/10 font-semibold hover:bg-white/15"
      >
        {t('cocina.tdee.aplicar', 'Aplicar TDEE a calorías objetivo')}
      </button>
    </div>
  )
}
