import { useState } from 'react'
import type { AlimentoFavorito } from '../../core/data/db'
import { favoritosRepo, perfilNutricionRepo } from '../../core/data/repository'
import { PERFIL_DEFECTO } from './constantes'
import { caloriasDesdeMacros } from './macros'
import type { PerfilConId } from './macros'
import { useT } from '../../core/i18n/useT'

export function MetasTab({
  perfil,
  favoritos,
}: {
  perfil: PerfilConId | undefined
  favoritos: AlimentoFavorito[]
}) {
  const p = perfil ?? { id: 0, ...PERFIL_DEFECTO }
  const [calorias, setCalorias] = useState(String(p.calorias))
  const [proteinas, setProteinas] = useState(String(p.proteinas))
  const [carbos, setCarbos] = useState(String(p.carbohidratos))
  const [grasas, setGrasas] = useState(String(p.grasas))
  const [agua, setAgua] = useState(String(p.aguaMl))

  const [fNombre, setFNombre] = useState('')
  const [fPorcion, setFPorcion] = useState('')
  const [fCal, setFCal] = useState('')
  const [fP, setFP] = useState('')
  const [fC, setFC] = useState('')
  const [fG, setFG] = useState('')

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

  const agregarFavorito = async (e: React.FormEvent) => {
    e.preventDefault()
    const pr = parseFloat(fP) || 0
    const ca = parseFloat(fC) || 0
    const gr = parseFloat(fG) || 0
    let kcal = parseFloat(fCal) || 0
    if (!kcal) kcal = caloriasDesdeMacros(pr, ca, gr)
    if (!fNombre.trim()) return
    await favoritosRepo.add({
      nombre: fNombre.trim(),
      porcion: fPorcion.trim() || '1 porción',
      calorias: Math.round(kcal),
      proteinas: Math.round(pr),
      carbohidratos: Math.round(ca),
      grasas: Math.round(gr),
    })
    setFNombre('')
    setFPorcion('')
    setFCal('')
    setFP('')
    setFC('')
    setFG('')
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
          <p className="text-sm font-semibold">{t('cocina.metas.objetivos', '🎯 Objetivos diarios')}</p>
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
          className="w-full rounded-xl py-2.5 font-bold bg-amber-400 text-black"
        >
          {t('cocina.metas.guardar', 'Guardar objetivos')}
        </button>
      </div>

      <div className="rounded-xl bg-white/5 p-4 border border-white/10">
        <p className="text-sm font-semibold mb-2">{t('cocina.tdee.titulo', '🧮 Calculadora rápida (TDEE)')}</p>
        <CalculadoraTdee onAplicar={(k) => setCalorias(String(k))} />
      </div>

      <form
        onSubmit={agregarFavorito}
        className="rounded-xl bg-white/5 p-4 space-y-3 border border-white/10"
      >
        <p className="text-sm font-semibold">{t('cocina.despensa', '⭐ Despensa rápida')}</p>
        <input
          value={fNombre}
          onChange={(e) => setFNombre(e.target.value)}
          placeholder={t('cocina.ph.alimento', 'Nombre del alimento')}
          className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10 outline-none"
        />
        <input
          value={fPorcion}
          onChange={(e) => setFPorcion(e.target.value)}
          placeholder={t('cocina.ph.porcion', 'Porción (ej. 1 taza)')}
          className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10 outline-none"
        />
        <div className="grid grid-cols-4 gap-2">
          <CampoMeta label="kcal" value={fCal} onChange={setFCal} />
          <CampoMeta label="P" value={fP} onChange={setFP} />
          <CampoMeta label="C" value={fC} onChange={setFC} />
          <CampoMeta label="G" value={fG} onChange={setFG} />
        </div>
        <button
          type="submit"
          className="w-full rounded-xl py-2 font-semibold bg-white/10 hover:bg-white/15"
        >
          {t('cocina.añadirFav', 'Añadir a favoritos')}
        </button>
      </form>

      <ul className="space-y-2">
        {favoritos.map((f) => (
          <li
            key={f.id}
            className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2.5 border border-white/10 text-sm"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium">{f.nombre}</p>
              <p className="text-xs text-white/40">
                {f.porcion} · {f.calorias} kcal · P{f.proteinas} C{f.carbohidratos} G
                {f.grasas}
              </p>
            </div>
            <button
              type="button"
              onClick={() => f.id && favoritosRepo.remove(f.id)}
              className="text-white/30 hover:text-red-400"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
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

function CalculadoraTdee({ onAplicar }: { onAplicar: (kcal: number) => void }) {
  const t = useT()
  const [peso, setPeso] = useState('70')
  const [altura, setAltura] = useState('170')
  const [edad, setEdad] = useState('30')
  const [sexo, setSexo] = useState<'m' | 'f'>('m')
  const [actividad, setActividad] = useState('1.55')

  const calcular = () => {
    const p = parseFloat(peso) || 70
    const a = parseFloat(altura) || 170
    const e = parseFloat(edad) || 30
    const base =
      sexo === 'm'
        ? 10 * p + 6.25 * a - 5 * e + 5
        : 10 * p + 6.25 * a - 5 * e - 161
    const tdee = Math.round(base * parseFloat(actividad))
    onAplicar(tdee)
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
              sexo === s ? 'bg-amber-400 text-black' : 'bg-white/5'
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
        onClick={calcular}
        className="w-full rounded-lg py-2 bg-white/10 font-semibold hover:bg-white/15"
      >
        {t('cocina.tdee.aplicar', 'Aplicar TDEE a calorías objetivo')}
      </button>
    </div>
  )
}
