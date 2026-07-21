import { useState } from 'react'
import type { MomentoComida, RegistroComida } from '../../core/data/db'
import { aguaRepo, comidasRepo } from '../../core/data/repository'
import { HORA_SUGERIDA, MOMENTOS } from './constantes'
import { actividadId } from '../../core/rutinas'
import { HorarioActividad } from '../../core/ui/HorarioActividad'
import { Icono } from '../../core/ui/iconos/Icono'
import { getMomento } from './momentos'
import { caloriasDesdeMacros } from './macros'
import { estimarMacros } from './estimarMacros'
import { iaActiva } from '../../core/chat/ia'
import { useT } from '../../core/i18n/useT'

export function DiarioTab({
  fecha,
  comidas,
  aguaMl,
  aguaObjetivo,
}: {
  fecha: string
  comidas: RegistroComida[]
  aguaMl: number
  aguaObjetivo: number
}) {
  const t = useT()
  const [momento, setMomento] = useState<MomentoComida>('desayuno')
  const [nombre, setNombre] = useState('')
  const [calorias, setCalorias] = useState('')
  const [proteinas, setProteinas] = useState('')
  const [carbos, setCarbos] = useState('')
  const [grasas, setGrasas] = useState('')
  const [nota, setNota] = useState('')
  const [estimando, setEstimando] = useState(false)
  const [errorIA, setErrorIA] = useState('')

  const delDia = comidas
    .filter((c) => c.fecha === fecha)
    .sort((a, b) => a.momento.localeCompare(b.momento))

  const estimar = async () => {
    if (!nombre.trim() || estimando) return
    setEstimando(true)
    setErrorIA('')
    try {
      const m = await estimarMacros(nombre.trim())
      setCalorias(String(m.calorias))
      setProteinas(String(m.proteinas))
      setCarbos(String(m.carbohidratos))
      setGrasas(String(m.grasas))
    } catch {
      setErrorIA(t('cocina.estimar.error', 'No se pudo estimar. Escribe los valores a mano.'))
    } finally {
      setEstimando(false)
    }
  }

  const agregar = async (e: React.FormEvent) => {
    e.preventDefault()
    const p = parseFloat(proteinas) || 0
    const c = parseFloat(carbos) || 0
    const f = parseFloat(grasas) || 0
    let kcal = parseFloat(calorias) || 0
    if (!kcal && (p || c || f)) kcal = caloriasDesdeMacros(p, c, f)
    if (!nombre.trim() || kcal <= 0) return

    await comidasRepo.add({
      fecha,
      momento,
      nombre: nombre.trim(),
      calorias: Math.round(kcal),
      proteinas: Math.round(p),
      carbohidratos: Math.round(c),
      grasas: Math.round(f),
      nota: nota.trim() || undefined,
    })
    setNombre('')
    setCalorias('')
    setProteinas('')
    setCarbos('')
    setGrasas('')
    setNota('')
  }

  const agregarAgua = async (ml: number) => {
    await aguaRepo.add({ fecha, ml })
  }

  const pctAgua = aguaObjetivo > 0 ? Math.min(100, (aguaMl / aguaObjetivo) * 100) : 0

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-white/5 p-4 border border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold"><Icono nombre="humedad" /> {t('cocina.hidratacion', 'Hidratación')}</span>
          <span className="text-sm text-white/60">
            {aguaMl} / {aguaObjetivo} ml
          </span>
        </div>
        <div className="mt-2 h-2 w-full rounded-full bg-black/40 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-400 transition-all"
            style={{ width: `${pctAgua}%` }}
          />
        </div>
        <div className="mt-3 flex gap-2">
          {[250, 500, 750].map((ml) => (
            <button
              key={ml}
              type="button"
              onClick={() => agregarAgua(ml)}
              className="flex-1 rounded-lg bg-emerald-500/20 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/30"
            >
              +{ml} ml
            </button>
          ))}
        </div>
      </div>

      <form
        onSubmit={agregar}
        className="rounded-xl bg-white/5 p-4 space-y-3 border border-white/10"
      >
        <p className="text-sm font-semibold">{t('cocina.registrar', 'Registrar comida')}</p>
        <div className="grid grid-cols-4 gap-1.5">
          {MOMENTOS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMomento(m.id)}
              className={`rounded-lg py-2 text-xs font-semibold transition ${
                momento === m.id ? 'bg-amber-600 texto-cta' : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              <Icono emoji={m.icon} />
            </button>
          ))}
        </div>

        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder={t('cocina.ph.comiste', 'Qué comiste...')}
          className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10 outline-none focus:border-amber-400/50"
        />
        {iaActiva() && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={estimar}
              disabled={!nombre.trim() || estimando}
              className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/15 disabled:opacity-40"
            >
              <Icono nombre="brillo" />{' '}
              {estimando
                ? t('cocina.estimar.cargando', 'Estimando…')
                : t('cocina.estimar', 'Estimar calorías y macros')}
            </button>
            <span className="text-[10px] text-white/40">
              {errorIA || t('cocina.estimar.ayuda', 'Aproximado; puedes corregirlo.')}
            </span>
          </div>
        )}
        <div className="grid grid-cols-4 gap-2">
          <Campo label="kcal" value={calorias} onChange={setCalorias} />
          <Campo label={t('cocina.proteina', 'Prot') + ' g'} value={proteinas} onChange={setProteinas} />
          <Campo label={t('cocina.carbos', 'Carb') + ' g'} value={carbos} onChange={setCarbos} />
          <Campo label={t('cocina.grasas', 'Gras') + ' g'} value={grasas} onChange={setGrasas} />
        </div>
        <input
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder={t('cocina.ph.nota', 'Nota (opcional)')}
          className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10 outline-none"
        />
        <button
          type="submit"
          className="w-full rounded-xl py-2.5 font-bold bg-amber-600 texto-cta hover:brightness-110"
        >
          {t('cocina.añadir', `Añadir a ${getMomento(momento).label}`, { momento: getMomento(momento).label })}
        </button>
      </form>

      {/* Sección propia, y no la cabecera de cada grupo de abajo: esos grupos solo
          existen si ya registraste algo, así que no podrías ponerle hora a la cena
          hasta haber cenado — que es justo cuando hace falta. */}
      <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm font-bold text-amber-400">
          <Icono nombre="alarma" /> {t('cocina.horarios', 'Horarios de comida')}
        </p>
        <p className="text-xs text-white/40">
          {t('cocina.horarios.ayuda', 'A qué hora comes cada cosa. Aparecen en tu calendario y te avisan si quieres.')}
        </p>
        <div className="space-y-1.5">
          {MOMENTOS.map((m) => (
            <div key={m.id} className="flex items-center gap-2">
              <span className="w-24 shrink-0 text-xs font-semibold text-white/70">
                <Icono emoji={m.icon} /> {m.label}
              </span>
              <HorarioActividad
                actividad={{
                  actividadId: actividadId('momento', m.id),
                  plantillaId: 'cocina',
                  nombre: m.label,
                  emoji: m.icon,
                  horaSugerida: HORA_SUGERIDA[m.id],
                  seccion: 'diario',
                  // Sin registro rápido a propósito: una comida necesita nombre y
                  // macros, y una «Cena» de un toque sería 0 kcal envenenando los
                  // totales. El aviso lleva aquí, que es donde se captura.
                }}
                hechoHoy={delDia.some((c) => c.momento === m.id)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold">{t('cocina.registroDia', 'Registro del día')}</p>
        {delDia.length === 0 && (
          <p className="text-sm text-white/40">{t('cocina.sinComidas', 'Sin comidas registradas.')}</p>
        )}
        {MOMENTOS.map((m) => {
          const items = delDia.filter((c) => c.momento === m.id)
          if (items.length === 0) return null
          const kcal = items.reduce((s, i) => s + i.calorias, 0)
          return (
            <div key={m.id} className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-white/5 text-sm font-semibold">
                <span><Icono emoji={m.icon} /></span>
                <span>{m.label}</span>
                <span className="ml-auto text-amber-400">{kcal} kcal</span>
              </div>
              <ul className="divide-y divide-white/5">
                {items.map((item) => (
                  <li key={item.id} className="flex items-start gap-2 px-3 py-2.5 text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white/90">{item.nombre}</p>
                      <p className="text-xs text-white/40">
                        P {item.proteinas}g · C {item.carbohidratos}g · G {item.grasas}g
                        {item.nota ? ` · ${item.nota}` : ''}
                      </p>
                    </div>
                    <span className="text-white/70 font-semibold">{item.calorias}</span>
                    <button
                      type="button"
                      onClick={() => item.id && comidasRepo.remove(item.id)}
                      className="text-white/30 hover:text-red-400 px-1"
                      aria-label={t('chat.eliminar', 'Eliminar')}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Campo({
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
      <span className="text-[10px] text-white/40">{label}</span>
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
