import { useState } from 'react'
import type { PerfilNutricion } from '../../core/data/db'
import { perfilNutricionRepo } from '../../core/data/repository'
import { OBJETIVOS, PERFIL_DEFECTO } from './constantes'
import { PISO_KCAL, derivarObjetivo, objetivosSugeridos, ritmoSugerido } from './balance'
import { fechaEnSemanas, semanasHasta } from './fecha'
import { caloriasDesdeMacros } from './macros'
import type { PerfilConId } from './macros'
import { CronogramaApp } from '../../core/ui/metas/CronogramaApp'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'

/**
 * Paso 1 del control de alimentación, en orden de flujo: primero quién eres
 * (información corporal), luego a dónde vas (metas y objetivos diarios) y al
 * final las metas grandes sobre el eje del tiempo.
 *
 * Nada se guarda con un botón: cada campo persiste al salir de él.
 */
export function MetasTab({ perfil }: { perfil: PerfilConId | undefined }) {
  const p = perfil ?? { id: 0, ...PERFIL_DEFECTO }
  // El perfil llega asíncrono: el `key` remonta el formulario con los valores
  // buenos cuando el id pasa de 0 a real (también tras restaurar un respaldo).
  return <Formulario key={p.id ?? 0} p={p} />
}

function Formulario({ p }: { p: PerfilConId }) {
  const t = useT()

  // Tu información (perfil corporal)
  const [peso, setPeso] = useState(String(p.pesoKg ?? ''))
  const [altura, setAltura] = useState(String(p.alturaCm ?? ''))
  const [edad, setEdad] = useState(String(p.edad ?? ''))
  const [sexo, setSexo] = useState<'m' | 'f'>(p.sexo ?? 'm')
  const [actividad, setActividad] = useState(String(p.actividad ?? 1.55))

  // Tus metas
  const [pesoObjetivo, setPesoObjetivo] = useState(String(p.pesoObjetivoKg || ''))
  const [fechaObjetivo, setFechaObjetivo] = useState(p.fechaObjetivo ?? '')
  const [semanas, setSemanas] = useState(p.fechaObjetivo ? String(semanasHasta(p.fechaObjetivo)) : '')
  const [ritmo, setRitmo] = useState(String(p.ritmoKgSemana || ''))
  const [calorias, setCalorias] = useState(String(p.calorias))
  const [proteinas, setProteinas] = useState(String(p.proteinas))
  const [carbos, setCarbos] = useState(String(p.carbohidratos))
  const [grasas, setGrasas] = useState(String(p.grasas))
  const [agua, setAgua] = useState(String(p.aguaMl))

  const num = (v: string) => parseFloat(v) || 0
  const entero = (v: string, porDefecto: number) => parseInt(v, 10) || porDefecto

  const numPeso = num(peso)
  const numObjetivo = num(pesoObjetivo)
  const numRitmo = Math.abs(num(ritmo))
  /** El objetivo ya no se elige: sale de dónde estás y a dónde vas. */
  const objetivo = derivarObjetivo(numPeso, numObjetivo)
  const sugerencia = objetivosSugeridos(
    { pesoKg: numPeso, alturaCm: num(altura), edad: num(edad), sexo, actividad: num(actividad) },
    numRitmo,
    objetivo,
  )

  /**
   * Escribe en la fila del perfil, creándola si aún no existe. Relee antes de
   * crear: dos guardados casi simultáneos con la base vacía dejarían dos filas
   * y `usePerfil` solo lee la primera.
   */
  const persistir = async (datos: Partial<PerfilNutricion>) => {
    const fila = (await perfilNutricionRepo.list())[0]
    if (fila?.id) await perfilNutricionRepo.update(fila.id, datos)
    else await perfilNutricionRepo.add({ ...PERFIL_DEFECTO, ...datos })
  }

  const guardarInfo = () =>
    persistir({
      pesoKg: num(peso) || undefined,
      alturaCm: num(altura) || undefined,
      edad: num(edad) || undefined,
      sexo,
      actividad: num(actividad),
      objetivo,
    })

  const guardarObjetivos = () =>
    persistir({
      calorias: entero(calorias, PERFIL_DEFECTO.calorias),
      proteinas: entero(proteinas, PERFIL_DEFECTO.proteinas),
      carbohidratos: entero(carbos, PERFIL_DEFECTO.carbohidratos),
      grasas: entero(grasas, PERFIL_DEFECTO.grasas),
      aguaMl: entero(agua, PERFIL_DEFECTO.aguaMl),
    })

  /** El plazo y el ritmo son la misma cosa vista de dos formas: se guardan juntos. */
  const guardarPlazo = (fecha: string, kgSemana: number) =>
    persistir({
      pesoObjetivoKg: numObjetivo > 0 ? numObjetivo : undefined,
      objetivo: derivarObjetivo(numPeso, numObjetivo),
      fechaObjetivo: fecha || undefined,
      ritmoKgSemana: kgSemana > 0 ? kgSemana : undefined,
    })

  /** Fecha ⇄ semanas ⇄ ritmo: tocas uno y los otros dos se recalculan. */
  const desdeFecha = (valor: string) => {
    setFechaObjetivo(valor)
    if (!valor) {
      setSemanas('')
      return void guardarPlazo('', numRitmo)
    }
    const n = semanasHasta(valor)
    setSemanas(String(n))
    const kg = ritmoSugerido(numPeso, numObjetivo, n)
    if (kg !== null) setRitmo(kg.toFixed(2))
    void guardarPlazo(valor, kg ?? numRitmo)
  }

  const desdeSemanas = (valor: string) => {
    setSemanas(valor)
    const n = entero(valor, 0)
    if (n <= 0) return
    const fecha = fechaEnSemanas(n)
    setFechaObjetivo(fecha)
    const kg = ritmoSugerido(numPeso, numObjetivo, n)
    if (kg !== null) setRitmo(kg.toFixed(2))
    void guardarPlazo(fecha, kg ?? numRitmo)
  }

  const desdeRitmo = (valor: string) => {
    setRitmo(valor)
    const kg = Math.abs(num(valor))
    if (kg <= 0 || !numPeso || !numObjetivo) return
    const n = Math.max(1, Math.ceil(Math.abs(numObjetivo - numPeso) / kg))
    setSemanas(String(n))
    const fecha = fechaEnSemanas(n)
    setFechaObjetivo(fecha)
    void guardarPlazo(fecha, kg)
  }

  const usarSugerido = () => {
    setCalorias(String(sugerencia.calorias))
    setProteinas(String(sugerencia.proteinas))
    setCarbos(String(sugerencia.carbohidratos))
    setGrasas(String(sugerencia.grasas))
    void persistir({
      calorias: sugerencia.calorias,
      proteinas: sugerencia.proteinas,
      carbohidratos: sugerencia.carbohidratos,
      grasas: sugerencia.grasas,
    })
  }

  const kcalSugeridas = caloriasDesdeMacros(num(proteinas), num(carbos), num(grasas))
  const nombreObjetivo = (id: PerfilNutricion['objetivo']) => {
    const o = OBJETIVOS.find((x) => x.id === id)!
    return t(`cocina.tdee.${o.id}`, o.label)
  }

  return (
    <div className="space-y-5">
      {/* 1. Tu información */}
      <div className="rounded-xl bg-white/5 p-4 border border-white/10 space-y-3">
        <p className="text-sm font-semibold">
          <Icono nombre="perfil" /> {t('cocina.metas.info', 'Tu información')}
        </p>
        <div className="grid grid-cols-3 gap-2">
          <CampoMeta label={t('cocina.tdee.peso', 'Peso kg')} value={peso} onChange={setPeso} onGuardar={guardarInfo} />
          <CampoMeta label={t('cocina.tdee.altura', 'Altura cm')} value={altura} onChange={setAltura} onGuardar={guardarInfo} />
          <CampoMeta label={t('cocina.tdee.edad', 'Edad')} value={edad} onChange={setEdad} onGuardar={guardarInfo} />
        </div>
        <div className="flex gap-2">
          {(['m', 'f'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setSexo(s)
                void persistir({ sexo: s })
              }}
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
          onChange={(e) => {
            setActividad(e.target.value)
            void persistir({ actividad: parseFloat(e.target.value) })
          }}
          className="w-full rounded-lg bg-black/30 px-2 py-2 text-sm border border-white/10"
        >
          <option value="1.2">{t('cocina.tdee.sedentario', 'Sedentario')}</option>
          <option value="1.375">{t('cocina.tdee.ligero', 'Ligero')}</option>
          <option value="1.55">{t('cocina.tdee.moderado', 'Moderado')}</option>
          <option value="1.725">{t('cocina.tdee.activo', 'Activo')}</option>
          <option value="1.9">{t('cocina.tdee.muyActivo', 'Muy activo')}</option>
        </select>
        <p className="text-xs text-white/40">{t('cocina.metas.autoguardado', 'Todo se guarda al escribirlo.')}</p>
      </div>

      {/* 2. Tus metas */}
      <div className="rounded-xl bg-white/5 p-4 border border-white/10 space-y-3">
        <p className="text-sm font-semibold">
          <Icono nombre="balanza" /> {t('cocina.metas.tusMetas', 'Tus metas')}
        </p>

        {/* Adorno, no control: el objetivo lo decide el peso objetivo. Lo que
            leen los lectores de pantalla es la frase de estado de abajo. */}
        <div role="group" aria-hidden="true" className="flex gap-2">
          {OBJETIVOS.map((o) => (
            <span
              key={o.id}
              className={`flex-1 rounded-lg py-1.5 text-center text-xs font-semibold ${
                objetivo === o.id ? 'bg-amber-600 texto-cta' : 'bg-white/5 text-white/35'
              }`}
            >
              <Icono emoji={o.icon} /> {t(`cocina.tdee.${o.id}`, o.label)}
            </span>
          ))}
        </div>
        <p role="status" className="text-xs text-white/60">
          {objetivo === 'mantener'
            ? t('cocina.metas.estadoMantener', 'Mantener tu peso.')
            : t(
                'cocina.metas.estadoCambio',
                `${nombreObjetivo(objetivo)}: ${sugerencia.pctSobreTdee}% sobre tu gasto · ${numRitmo || 0} kg/semana`,
                {
                  obj: nombreObjetivo(objetivo),
                  pct: String(sugerencia.pctSobreTdee),
                  ritmo: String(numRitmo || 0),
                },
              )}
          {' · '}
          <span className="text-white/40">
            {t('cocina.metas.objetivoAuto', 'Se elige solo con tu peso y tu peso objetivo.')}
          </span>
        </p>

        <div className="grid grid-cols-2 gap-3">
          <CampoMeta
            label={
              objetivo === 'mantener'
                ? t('cocina.metas.pesoMantener', 'Peso a mantener (kg)')
                : t('cocina.metas.pesoObjetivo', 'Peso objetivo (kg)')
            }
            value={pesoObjetivo}
            onChange={setPesoObjetivo}
            onGuardar={() => guardarPlazo(fechaObjetivo, numRitmo)}
          />
          <label className="block">
            <span className="text-[10px] text-white/45">{t('cocina.metas.plazo', 'Fecha límite')}</span>
            <input
              type="date"
              value={fechaObjetivo}
              onChange={(e) => desdeFecha(e.target.value)}
              className="mt-0.5 w-full rounded-lg bg-black/30 px-2 py-1.5 text-sm border border-white/10 outline-none"
            />
          </label>
          <CampoMeta label={t('cocina.metas.semanas', 'Semanas')} value={semanas} onChange={desdeSemanas} />
          <CampoMeta
            label={t('cocina.metas.ritmo', 'Ritmo (kg/semana)')}
            value={ritmo}
            onChange={desdeRitmo}
          />
        </div>
        <p className="text-xs text-white/40">
          {t('cocina.metas.plazoAyuda', 'Pon el plazo o el ritmo: el otro se calcula solo.')}{' '}
          {t('cocina.metas.metaAyuda', 'Sin peso objetivo no se puede calcular tu progreso ni cuándo llegas.')}
        </p>
        {sugerencia.peligroso && (
          <p className="rounded-lg bg-amber-500/15 px-3 py-2 text-xs text-amber-300">
            <Icono nombre="alerta" />{' '}
            {t('cocina.metas.ritmoPeligroso', 'Más de 1 kg por semana no se sostiene. Date más tiempo.')}
          </p>
        )}
        {sugerencia.bajoElPiso && (
          <p className="rounded-lg bg-amber-500/15 px-3 py-2 text-xs text-amber-300">
            <Icono nombre="alerta" />{' '}
            {t(
              'cocina.metas.kcalBajas',
              `Ese ritmo te deja por debajo de ${PISO_KCAL} kcal al día. Alarga el plazo.`,
              { n: String(PISO_KCAL) },
            )}
          </p>
        )}

        <div data-tut="cocina.metas.objetivos" className="flex items-center justify-between border-t border-white/10 pt-3">
          <p className="text-sm font-semibold">
            <Icono nombre="objetivo" /> {t('cocina.metas.objetivos', 'Objetivos diarios')}
          </p>
          <button
            type="button"
            onClick={usarSugerido}
            className="text-xs font-semibold text-amber-400 hover:underline"
          >
            {t('cocina.metas.usarSugerido', 'Usar lo sugerido')}
          </button>
        </div>
        <p className="text-xs text-white/45">
          {t(
            'cocina.metas.sugerido',
            `Sugerido: ${sugerencia.calorias} kcal · P ${sugerencia.proteinas} · C ${sugerencia.carbohidratos} · G ${sugerencia.grasas}`,
            {
              cal: String(sugerencia.calorias),
              p: String(sugerencia.proteinas),
              c: String(sugerencia.carbohidratos),
              g: String(sugerencia.grasas),
            },
          )}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <CampoMeta label={t('cocina.metas.cal', 'Calorías (kcal)')} value={calorias} onChange={setCalorias} onGuardar={guardarObjetivos} />
          <CampoMeta label={t('cocina.metas.aguaMl', 'Agua (ml)')} value={agua} onChange={setAgua} onGuardar={guardarObjetivos} />
          <CampoMeta label={t('cocina.metas.prot', 'Proteína (g)')} value={proteinas} onChange={setProteinas} onGuardar={guardarObjetivos} />
          <CampoMeta label={t('cocina.metas.carb', 'Carbohidratos (g)')} value={carbos} onChange={setCarbos} onGuardar={guardarObjetivos} />
          <CampoMeta label={t('cocina.metas.gras', 'Grasas (g)')} value={grasas} onChange={setGrasas} onGuardar={guardarObjetivos} />
        </div>
        <p className="text-xs text-white/40">
          {t('cocina.metas.suma', `Suma macros ≈ ${kcalSugeridas} kcal (fórmula 4-4-9)`, { n: String(kcalSugeridas) })}
        </p>
      </div>

      {/* 3. Las metas grandes sobre el eje del tiempo */}
      <div className="space-y-3" data-tut="cocina.cronograma">
        <p className="text-sm font-semibold">
          <Icono nombre="calendario" /> {t('cocina.metas.cronograma', 'Metas')}
        </p>
        <CronogramaApp plantillaId="cocina" />
      </div>
    </div>
  )
}

function CampoMeta({
  label,
  value,
  onChange,
  onGuardar,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  /** Se llama al salir del campo; sin él, quien escribe ya guardó en `onChange`. */
  onGuardar?: () => void
}) {
  return (
    <label className="block">
      <span className="text-[10px] text-white/45">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onGuardar}
        // En el teclado móvil, Enter es el «ya está»: cierra el campo y guarda.
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        className="mt-0.5 w-full rounded-lg bg-black/30 px-2 py-1.5 text-sm border border-white/10 outline-none"
      />
    </label>
  )
}
