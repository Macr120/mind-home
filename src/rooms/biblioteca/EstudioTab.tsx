import { useEffect, useMemo, useState } from 'react'
import { entradasBiblioRepo, sesionesEstudioRepo } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { actividadId } from '../../core/rutinas'
import { HorarioActividad } from '../../core/ui/HorarioActividad'
import { CronogramaApp } from '../../core/ui/metas/CronogramaApp'
import { Icono } from '../../core/ui/iconos/Icono'
import { COLOR, DURACIONES_ESTUDIO, PILAR_GENERAL, getPilar } from './constantes'
import { PILARES } from './pilares'
import { useEstudio, restanteMs } from './estudioStore'
import { tocarCampana } from './campana'
import { fmtMin, rgba } from './stats'

/** Sesiones de estudio con temporizador: eliges campo, estudias, se registra. */
export function EstudioTab() {
  const t = useT()
  const activa = useEstudio((s) => s.activa)
  const iniciar = useEstudio((s) => s.iniciar)
  const cancelar = useEstudio((s) => s.cancelar)
  const completar = useEstudio((s) => s.completar)
  const sesiones = sesionesEstudioRepo.useAll() ?? []
  const entradas = entradasBiblioRepo.useAll() ?? []

  const [duracion, setDuracion] = useState(25)
  const [pilarId, setPilarId] = useState<string>(PILARES[0].id)
  const [entradaSel, setEntradaSel] = useState('')
  const [fin, setFin] = useState<{ pilarId: string; minutos: number } | null>(null)
  const [, setTick] = useState(0)

  // Tick de 1 s SOLO para repintar (el tiempo real vive en el timestamp del store);
  // el mismo tick detecta el fin de la sesión: campana + guardado + pantalla de
  // cierre, todo en callbacks. `disparado` evita campana doble si el store tarda.
  useEffect(() => {
    if (!activa) return
    let disparado = false
    const revisar = () => {
      if (disparado) return
      if (restanteMs(activa) <= 0) {
        disparado = true
        setFin({ pilarId: activa.pilarId, minutos: activa.duracionMin })
        tocarCampana(2)
        void completar()
      } else {
        setTick((n) => n + 1)
      }
    }
    const id = setInterval(revisar, 1000)
    // Si la pestaña vuelve a montarse con la sesión ya vencida, detectarlo de inmediato.
    const t0 = setTimeout(revisar, 0)
    return () => {
      clearInterval(id)
      clearTimeout(t0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- completar/setFin son del render vigente; re-suscribir solo si cambia la sesión activa
  }, [activa])

  const minPorPilar = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of sesiones) m.set(s.pilarId, (m.get(s.pilarId) ?? 0) + s.minutos)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [sesiones])
  const maxMin = Math.max(1, ...minPorPilar.map(([, min]) => min))

  const entradasDelPilar = entradas.filter((e) => e.pilarId === pilarId)

  // ----- Sesión corriendo -----
  if (activa) {
    const rest = Math.max(0, restanteMs(activa))
    const mm = Math.floor(rest / 60000)
    const ss = Math.floor((rest % 60000) / 1000)
    const avance = 1 - rest / (activa.duracionMin * 60000)
    const pilar = getPilar(activa.pilarId)
    const entrada = activa.entradaId != null ? entradas.find((e) => e.id === activa.entradaId) : undefined
    return (
      <div className="space-y-4">
        <div
          className="space-y-4 rounded-2xl border p-6 text-center"
          style={{ background: `${COLOR}14`, borderColor: `${COLOR}44` }}
        >
          <p className="text-sm text-white/60">
            <Icono emoji={pilar.icon} /> {pilar.titulo}
            {entrada && <span className="text-white/40"> · {entrada.titulo}</span>}
          </p>
          <p className="text-6xl font-black tabular-nums text-white/95">
            {mm}:{String(ss).padStart(2, '0')}
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-black/40">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${avance * 100}%`, background: COLOR }}
            />
          </div>
          <p className="text-xs text-white/40">
            {t('biblioteca.est.sesionDe', 'Sesión de {n} min — al terminar se registra sola', {
              n: String(activa.duracionMin),
            })}
          </p>
          <button
            type="button"
            onClick={() => void cancelar()}
            className="rounded-xl bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10"
            title={t('biblioteca.est.cancelarTip', 'Los minutos completos ya transcurridos se acreditan')}
          >
            <Icono nombre="mano" /> {t('biblioteca.est.cancelar', 'Terminar antes')}
          </button>
        </div>
        <HistorialSesiones sesiones={sesiones} entradas={entradas} />
      </div>
    )
  }

  // ----- Configuración de una sesión nueva -----
  return (
    <div className="space-y-4">
      {fin && (
        <div
          className="flex items-center justify-between gap-2 rounded-xl border p-3 text-sm"
          style={{ background: `${COLOR}18`, borderColor: `${COLOR}55` }}
        >
          <span>
            <Icono nombre="campana" /> {t('biblioteca.est.fin', '¡Sesión completada! +{n} min en {campo}', {
              n: String(fin.minutos),
              campo: getPilar(fin.pilarId).titulo,
            })}
          </span>
          <button
            type="button"
            onClick={() => setFin(null)}
            className="shrink-0 rounded px-2 py-1 text-white/50 hover:bg-white/10 hover:text-white/80"
          >
            ✕
          </button>
        </div>
      )}

      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm font-semibold"><Icono nombre="cronometro" /> {t('biblioteca.est.titulo', 'Sesión de estudio')}</p>

        <div className="flex flex-wrap items-center gap-1.5">
          {DURACIONES_ESTUDIO.map((min) => (
            <button
              key={min}
              type="button"
              onClick={() => setDuracion(min)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                duracion === min ? 'text-black' : 'bg-white/5 text-white/70 hover:bg-white/10'
              }`}
              style={duracion === min ? { background: COLOR } : undefined}
            >
              {min} min
            </button>
          ))}
          <input
            type="number"
            min={1}
            max={240}
            value={duracion}
            onChange={(e) => setDuracion(Math.max(1, Math.min(240, Number(e.target.value) || 1)))}
            className="w-16 rounded-full border border-white/10 bg-black/30 px-2 py-1 text-center text-xs outline-none focus:border-white/30"
            title={t('biblioteca.est.personalizada', 'Duración personalizada (minutos)')}
          />
        </div>

        {/* Reservarte el rato de estudio: el bloque vive en el calendario. */}
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-xs text-white/50">
            {t('biblioteca.est.reservar', 'Tu rato de estudio')}
          </span>
          <HorarioActividad
            actividad={{
              actividadId: actividadId('biblioteca', 'estudio'),
              plantillaId: 'biblioteca',
              nombre: t('biblioteca.est.bloque', 'Estudiar'),
              emoji: '📚',
              horaSugerida: '19:00',
              duracionMin: duracion,
              seccion: 'estudio',
              registroRapido: {
                esquemaId: 'estudio',
                valores: { minutos: duracion },
                etiqueta: t('biblioteca.registrarMin', 'Registrar {n} min', { n: duracion }),
              },
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wide text-white/40">{t('biblioteca.ent.campo', 'Campo')}</p>
            <select
              value={pilarId}
              onChange={(e) => {
                setPilarId(e.target.value)
                setEntradaSel('')
              }}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm outline-none"
            >
              {PILARES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icon} {p.titulo}
                </option>
              ))}
              <option value={PILAR_GENERAL.id}>
                {PILAR_GENERAL.icon} {PILAR_GENERAL.titulo}
              </option>
            </select>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wide text-white/40">
              {t('biblioteca.est.entrada', 'Entrada (opcional)')}
            </p>
            <select
              value={entradaSel}
              onChange={(e) => setEntradaSel(e.target.value)}
              disabled={entradasDelPilar.length === 0}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm outline-none disabled:opacity-40"
            >
              <option value="">{t('biblioteca.est.libre', '— Estudio libre —')}</option>
              {entradasDelPilar.map((e) => (
                <option key={e.id} value={String(e.id)}>
                  {e.titulo}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            iniciar({ pilarId, entradaId: entradaSel ? Number(entradaSel) : undefined, duracionMin: duracion })
          }
          className="w-full rounded-xl py-2.5 text-sm font-semibold text-black transition"
          style={{ background: COLOR }}
        >
          <Icono nombre="play" /> {t('biblioteca.est.iniciar', 'Iniciar {n} min', { n: String(duracion) })}
        </button>
        <p className="text-center text-[10px] text-white/35">
          {t('biblioteca.est.nota', 'El temporizador sigue corriendo aunque cierres el cuarto.')}
        </p>
      </div>

      {/* Plan de estudio: las metas de la app en el mismo cronograma del calendario.
          El ✨ de cada meta pide el plan a la IA (fecha objetivo, horas y días
          disponibles) y agenda plan + rato de estudio. */}
      <div className="space-y-2" data-tut="biblioteca.estudio.plan">
        <p className="text-sm font-semibold">
          <Icono nombre="calendario" /> {t('biblioteca.plan.titulo', 'Plan de estudio')}
        </p>
        <p className="text-[11px] leading-relaxed text-white/40">
          {t('biblioteca.plan.desc', 'Crea una meta (p. ej. «Aprender estadística») y pídele el plan a la IA: te pregunta tu fecha objetivo, horas por semana y días disponibles, y agenda el plan con tu rato de estudio en el calendario.')}
        </p>
        <CronogramaApp plantillaId="biblioteca" />
      </div>

      {minPorPilar.length > 0 && (
        <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-semibold">{t('biblioteca.est.porCampo', 'Tiempo por campo')}</p>
          {minPorPilar.map(([id, min]) => {
            const pilar = getPilar(id)
            return (
              <div key={id}>
                <div className="mb-0.5 flex justify-between text-xs">
                  <span className="text-white/80">
                    <Icono emoji={pilar.icon} /> {pilar.titulo}
                  </span>
                  <span className="text-white/40">{fmtMin(min)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-black/40">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(min / maxMin) * 100}%`, background: rgba(COLOR, 0.9) }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      <HistorialSesiones sesiones={sesiones} entradas={entradas} />
    </div>
  )
}

function HistorialSesiones({
  sesiones,
  entradas,
}: {
  sesiones: { id?: number; pilarId: string; entradaId?: number; minutos: number; fecha: string }[]
  entradas: { id?: number; titulo: string }[]
}) {
  const t = useT()
  if (sesiones.length === 0) return null
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4" data-tut="biblioteca.estudio.historial">
      <p className="mb-2 text-sm font-semibold">{t('biblioteca.est.historial', 'Sesiones recientes')}</p>
      <ul className="space-y-1.5 text-sm">
        {sesiones.slice(0, 8).map((s) => {
          const pilar = getPilar(s.pilarId)
          const entrada = s.entradaId != null ? entradas.find((e) => e.id === s.entradaId) : undefined
          return (
            <li key={s.id} className="flex items-center justify-between gap-2">
              <span className="min-w-0 flex-1 truncate text-white/80">
                <Icono emoji={pilar.icon} /> {pilar.titulo}
                {entrada && <span className="text-white/40"> · {entrada.titulo}</span>}
              </span>
              <span className="shrink-0 text-xs text-white/40">
                {fmtMin(s.minutos)} · {s.fecha.slice(5)}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
