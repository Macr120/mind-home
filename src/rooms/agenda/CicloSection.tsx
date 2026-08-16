import { useMemo, useState } from 'react'
import type { AjustesCiclo, DiaCiclo, SangradoCiclo } from '../../core/data/db'
import { deIso, fechaLocalISO } from '../../core/fechaLocal'
import { localeActual, useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { COLOR_AREA } from './constantes'
import { acento } from '../_shared/acento'
import { PestanasCarpeta } from '../_shared/PestanasCarpeta'
import { guardarAjustesCiclo, guardarDiaCiclo } from './crear'
import {
  duracionesPeriodo,
  NIVELES_SANGRADO,
  predecir,
  SINTOMAS_CICLO,
  textoFase,
} from './ciclo'
import { Campo, INPUT, Modal } from './ui'

/**
 * Seguimiento de ciclo, dentro de Salud › Tú.
 *
 * Se enciende con su propio interruptor: no se deduce del `sexo` de la Cocina,
 * que es un dato de otra app, opcional y que por defecto asume hombre.
 */
export function CicloSection({ ajustes, dias }: { ajustes: AjustesCiclo | null; dias: DiaCiclo[] }) {
  const t = useT()
  const [mes, setMes] = useState(() => fechaLocalISO().slice(0, 7))
  const [diaAbierto, setDiaAbierto] = useState<string | null>(null)
  const [configurando, setConfigurando] = useState(false)
  /** Recién encendido en esta sesión: se ofrece deshacerlo a la vista. */
  const [reciente, setReciente] = useState(false)

  const p = useMemo(
    () => predecir(dias, ajustes?.duracionCicloMedia ?? 28),
    [dias, ajustes?.duracionCicloMedia],
  )
  const historial = useMemo(() => duracionesPeriodo(dias).slice(0, 6), [dias])

  if (!ajustes?.activo) {
    return (
      <section className="space-y-2">
        <p className="text-sm font-bold">
          <Icono nombre="ciclo" /> {t('agenda.ciclo.titulo', 'Ciclo')}
        </p>
        <div className="rounded-xl border border-dashed border-white/15 p-4 text-center">
          <p className="text-sm text-white/50">
            {t(
              'agenda.ciclo.apagado',
              'Lleva el registro de tu periodo, con estimación del siguiente, síntomas y recordatorios.',
            )}
          </p>
          <button
            type="button"
            onClick={() => {
              setReciente(true)
              void guardarAjustesCiclo({ activo: true })
            }}
            className="mt-3 rounded-xl px-3 py-1.5 text-xs font-bold ui-accent-bg transition hover:brightness-110"
            style={acento(COLOR_AREA.salud)}
          >
            {t('agenda.ciclo.activar', 'Activar seguimiento de ciclo')}
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-2" data-tut="agenda.salud.ciclo">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold">
          <Icono nombre="ciclo" /> {t('agenda.ciclo.titulo', 'Ciclo')}
        </p>
        <button
          type="button"
          onClick={() => setConfigurando(true)}
          className="rounded-lg bg-white/5 px-2.5 py-1.5 text-xs font-semibold transition hover:bg-white/10"
        >
          <Icono nombre="ajustes" /> {t('agenda.ciclo.ajustes', 'Ajustes')}
        </button>
      </div>

      {/* Deshacer a la vista: si lo encendiste sin querer, apagarlo no debería
          obligarte a entrar en Ajustes a buscarlo. */}
      {reciente && (
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <span className="min-w-0 flex-1 text-[11px] text-white/50">
            {t('agenda.ciclo.recienActivado', 'Seguimiento activado. ¿Fue sin querer?')}
          </span>
          <button
            type="button"
            onClick={() => {
              setReciente(false)
              void guardarAjustesCiclo({ activo: false })
            }}
            className="shrink-0 rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-semibold hover:bg-white/20"
          >
            {t('agenda.ciclo.deshacer', 'Deshacer')}
          </button>
          <button
            type="button"
            onClick={() => setReciente(false)}
            className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold text-white/40 hover:bg-white/5"
          >
            {t('agenda.ciclo.mantener', 'Dejarlo')}
          </button>
        </div>
      )}

      {/* Resumen: siempre dice que es estimación y con cuántos ciclos se calculó */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
        <p className="text-sm font-semibold">
          {p.diaActual
            ? t('agenda.ciclo.diaN', 'Día {n} del ciclo', { n: p.diaActual })
            : t('agenda.ciclo.sinRegistro', 'Sin registros todavía')}
        </p>
        <p className="mt-0.5 text-xs text-white/50">{textoFase(p, t)}</p>
        {p.proximo && (
          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-lg bg-white/5 p-2">
              <p className="text-white/40">{t('agenda.ciclo.proximo', 'Próximo periodo')}</p>
              <p className="font-semibold">{fechaCorta(p.proximo)}</p>
            </div>
            {p.fertil && (
              <div className="rounded-lg bg-white/5 p-2">
                <p className="text-white/40">{t('agenda.ciclo.fertil', 'Ventana fértil')}</p>
                <p className="font-semibold">
                  {fechaCorta(p.fertil[0])} – {fechaCorta(p.fertil[1])}
                </p>
              </div>
            )}
          </div>
        )}
        <p className="mt-2 text-[10px] leading-relaxed text-white/35">
          {p.mediaMedida
            ? t('agenda.ciclo.base', 'Estimación con tus {n} últimos ciclos (media de {d} días).', {
                n: p.ciclos,
                d: p.mediaMedida,
              })
            : t('agenda.ciclo.baseSinDatos', 'Estimación con la duración de tus ajustes ({d} días): aún no hay dos periodos que medir.', {
                d: p.duracion,
              })}
        </p>
      </div>

      <Calendario
        mes={mes}
        dias={dias}
        prediccion={p}
        onMes={setMes}
        onDia={setDiaAbierto}
      />

      {historial.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-xs font-semibold text-white/60">
            {t('agenda.ciclo.historial', 'Tus últimos periodos')}
          </p>
          <ul className="mt-1.5 space-y-1">
            {historial.map((h) => (
              <li key={h.inicio} className="flex justify-between text-[11px]">
                <span className="text-white/70">{fechaCorta(h.inicio)}</span>
                <span className="text-white/45">
                  {t('agenda.ciclo.duroDias', 'duró {n} días', { n: h.dias })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {diaAbierto && (
        <FormDia
          fecha={diaAbierto}
          previo={dias.find((d) => d.fecha === diaAbierto) ?? null}
          onCerrar={() => setDiaAbierto(null)}
        />
      )}
      {configurando && <FormAjustes ajustes={ajustes} onCerrar={() => setConfigurando(false)} />}
    </section>
  )
}

const fechaCorta = (iso: string) =>
  deIso(iso).toLocaleDateString(localeActual(), { day: 'numeric', month: 'short' })

/** Rejilla del mes: lo registrado en sólido y lo estimado en punteado. */
function Calendario({
  mes,
  dias,
  prediccion,
  onMes,
  onDia,
}: {
  mes: string
  dias: DiaCiclo[]
  prediccion: ReturnType<typeof predecir>
  onMes: (m: string) => void
  onDia: (f: string) => void
}) {
  const t = useT()
  const porFecha = useMemo(() => new Map(dias.map((d) => [d.fecha, d])), [dias])
  const [anio, mesN] = mes.split('-').map(Number)
  const primero = new Date(anio, mesN - 1, 1)
  const diasMes = new Date(anio, mesN, 0).getDate()
  // Semana que empieza en lunes, como el resto del proyecto.
  const hueco = (primero.getDay() + 6) % 7
  const hoy = fechaLocalISO()

  const fertilDesde = prediccion.fertil?.[0]
  const fertilHasta = prediccion.fertil?.[1]

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMes(mesRelativo(mes, -1))}
          className="rounded-lg px-2 py-1 text-white/50 hover:bg-white/10"
        >
          <Icono nombre="volver" />
        </button>
        <p className="text-xs font-semibold">
          {primero.toLocaleDateString(localeActual(), { month: 'long', year: 'numeric' })}
        </p>
        <button
          type="button"
          onClick={() => onMes(mesRelativo(mes, 1))}
          className="rounded-lg px-2 py-1 text-white/50 hover:bg-white/10"
        >
          <Icono nombre="siguiente" />
        </button>
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1">
        {Array.from({ length: hueco }, (_, i) => <span key={`h${i}`} />)}
        {Array.from({ length: diasMes }, (_, i) => {
          const fecha = `${mes}-${String(i + 1).padStart(2, '0')}`
          const dia = porFecha.get(fecha)
          const nivel = dia?.sangrado ?? 0
          const color = NIVELES_SANGRADO.find((n) => n.valor === nivel)?.color
          const esFertil = !!fertilDesde && !!fertilHasta && fecha >= fertilDesde && fecha <= fertilHasta
          const esProximo = fecha === prediccion.proximo
          return (
            <button
              key={fecha}
              type="button"
              onClick={() => onDia(fecha)}
              title={fecha}
              className={`relative aspect-square rounded-lg text-[11px] font-semibold transition hover:brightness-125 ${
                color ? 'text-black' : 'bg-white/5 text-white/60'
              } ${fecha === hoy ? 'ring-1 ring-white/50' : ''} ${
                esProximo && !color ? 'border border-dashed border-red-400/70' : ''
              } ${esFertil && !color ? 'border border-dashed border-sky-400/50' : ''}`}
              style={color ? { background: color } : undefined}
            >
              {i + 1}
              {!!dia?.sintomas.length && (
                <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-current opacity-60" />
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-2 flex flex-wrap gap-2.5 text-[10px] text-white/45">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm" style={{ background: NIVELES_SANGRADO[1].color }} />
          {t('agenda.ciclo.leyRegistrado', 'Registrado')}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm border border-dashed border-red-400/70" />
          {t('agenda.ciclo.leyEstimado', 'Estimado')}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm border border-dashed border-sky-400/50" />
          {t('agenda.ciclo.fertil', 'Ventana fértil')}
        </span>
      </div>
    </div>
  )
}

function mesRelativo(mes: string, delta: number): string {
  const [a, m] = mes.split('-').map(Number)
  const d = new Date(a, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Registro de un día: sangrado, síntomas, ánimo y nota. */
function FormDia({
  fecha,
  previo,
  onCerrar,
}: {
  fecha: string
  previo: DiaCiclo | null
  onCerrar: () => void
}) {
  const t = useT()
  const [sangrado, setSangrado] = useState<SangradoCiclo>(previo?.sangrado ?? 0)
  const [sintomas, setSintomas] = useState<string[]>(previo?.sintomas ?? [])
  const [animo, setAnimo] = useState<number | undefined>(previo?.animo)
  const [nota, setNota] = useState(previo?.nota ?? '')

  const guardar = async () => {
    await guardarDiaCiclo(fecha, { sangrado, sintomas, animo, nota: nota.trim() || undefined })
    onCerrar()
  }

  return (
    <Modal titulo={fechaCorta(fecha)} onCerrar={onCerrar}>
      <div className="space-y-3">
        <div>
          <p className="text-xs text-white/50">{t('agenda.ciclo.sangrado', 'Sangrado')}</p>
          <div className="mt-1">
            <PestanasCarpeta
              items={[
                { id: '0', labelEs: 'Ninguno', clave: 'agenda.ciclo.ninguno' },
                ...NIVELES_SANGRADO.map((n) => ({
                  id: String(n.valor),
                  labelEs: n.es,
                  clave: n.clave,
                  // El color por nivel es el mismo con el que el día se pinta en el calendario del ciclo.
                  color: n.color,
                })),
              ]}
              activo={String(sangrado)}
              onCambio={(id) => setSangrado(Number(id) as SangradoCiclo)}
              color={COLOR_AREA.salud}
              variante="sub"
              nivel={3}
              flecha={false}
            />
          </div>
        </div>

        <div>
          <p className="text-xs text-white/50">{t('agenda.ciclo.sintomas', 'Síntomas')}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {SINTOMAS_CICLO.map((s) => {
              const activo = sintomas.includes(s.id)
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() =>
                    setSintomas(activo ? sintomas.filter((x) => x !== s.id) : [...sintomas, s.id])
                  }
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                    activo ? 'text-black' : 'bg-white/5 text-white/55 hover:bg-white/10'
                  }`}
                  style={activo ? acento(COLOR_AREA.salud) : undefined}
                >
                  <Icono nombre={s.icono} /> {t(s.clave, s.es)}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <p className="text-xs text-white/50">{t('agenda.ciclo.animo', 'Ánimo')}</p>
          <div className="mt-1 flex gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setAnimo(animo === n ? undefined : n)}
                className={`flex-1 rounded-lg py-1.5 text-sm transition ${
                  animo === n ? 'bg-white/20' : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <Icono nombre={ICONO_ANIMO[n - 1]} />
              </button>
            ))}
          </div>
        </div>

        <Campo etiqueta={t('agenda.form.notas', 'Notas')}>
          <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={2} className={INPUT} />
        </Campo>

        <button
          type="button"
          onClick={() => void guardar()}
          className="w-full rounded-lg py-2.5 text-sm font-bold ui-accent-bg transition hover:brightness-110"
          style={acento(COLOR_AREA.salud)}
        >
          {t('agenda.guardar', 'Guardar')}
        </button>
      </div>
    </Modal>
  )
}

const ICONO_ANIMO = ['animo-llorando', 'animo-triste', 'animo-neutral', 'animo-contento', 'animo-feliz'] as const

function FormAjustes({ ajustes, onCerrar }: { ajustes: AjustesCiclo; onCerrar: () => void }) {
  const t = useT()
  const [ciclo, setCiclo] = useState(ajustes.duracionCicloMedia)
  const [periodo, setPeriodo] = useState(ajustes.duracionPeriodoMedia)
  const [avisar, setAvisar] = useState(ajustes.avisarAntes)
  const [pastilla, setPastilla] = useState(ajustes.anticonceptivoHora ?? '')

  const guardar = async () => {
    await guardarAjustesCiclo({
      duracionCicloMedia: ciclo,
      duracionPeriodoMedia: periodo,
      avisarAntes: avisar,
      anticonceptivoHora: pastilla || undefined,
    })
    onCerrar()
  }

  return (
    <Modal titulo={t('agenda.ciclo.ajustes', 'Ajustes')} onCerrar={onCerrar}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Campo etiqueta={t('agenda.ciclo.duracionCiclo', 'Duración del ciclo (días)')}>
            <input
              type="number"
              min={15}
              max={60}
              value={ciclo}
              onChange={(e) => setCiclo(Number(e.target.value))}
              className={INPUT}
            />
          </Campo>
          <Campo etiqueta={t('agenda.ciclo.duracionPeriodo', 'Duración del periodo (días)')}>
            <input
              type="number"
              min={1}
              max={14}
              value={periodo}
              onChange={(e) => setPeriodo(Number(e.target.value))}
              className={INPUT}
            />
          </Campo>
        </div>
        <p className="text-[11px] text-white/40">
          {t(
            'agenda.ciclo.ayudaDuracion',
            'Solo se usan mientras no haya dos periodos registrados: en cuanto los hay, manda tu media real.',
          )}
        </p>

        <div className="grid grid-cols-2 gap-2">
          <Campo etiqueta={t('agenda.ciclo.avisarAntes', 'Avisarme con (días)')}>
            <input
              type="number"
              min={0}
              max={10}
              value={avisar}
              onChange={(e) => setAvisar(Number(e.target.value))}
              className={INPUT}
            />
          </Campo>
          <Campo etiqueta={t('agenda.ciclo.anticonceptivo', 'Anticonceptivo a las')}>
            <input
              type="time"
              value={pastilla}
              onChange={(e) => setPastilla(e.target.value)}
              className={INPUT}
            />
          </Campo>
        </div>

        <button
          type="button"
          onClick={() => void guardar()}
          className="w-full rounded-lg py-2.5 text-sm font-bold ui-accent-bg transition hover:brightness-110"
          style={acento(COLOR_AREA.salud)}
        >
          {t('agenda.guardar', 'Guardar')}
        </button>

        <button
          type="button"
          onClick={() => {
            void guardarAjustesCiclo({ activo: false })
            onCerrar()
          }}
          className="w-full rounded-lg py-2 text-xs font-semibold text-white/45 transition hover:bg-white/5"
        >
          {t('agenda.ciclo.desactivar', 'Desactivar seguimiento (los registros se conservan)')}
        </button>
      </div>
    </Modal>
  )
}
