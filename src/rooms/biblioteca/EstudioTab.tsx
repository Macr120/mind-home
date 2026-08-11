import { useEffect, useState } from 'react'
import { VACIO, entradasBiblioRepo } from '../../core/data/repository'
import { claveLS } from '../../core/edicion'
import { useT } from '../../core/i18n/useT'
import { actividadId } from '../../core/rutinas'
import { HorarioActividad } from '../../core/ui/HorarioActividad'
import { CronogramaApp } from '../../core/ui/metas/CronogramaApp'
import { Icono } from '../../core/ui/iconos/Icono'
import { CICLOS_POMODORO, COLOR, DURACIONES_ESTUDIO, PILAR_GENERAL, getPilar } from './constantes'
import { campos, useIndice } from './semilla'
import { useEstudio, restanteMs, type CicloPomodoro, type FasePomodoro } from './estudioStore'
import { CAMPANA_DESCANSO, tocarCampana } from './campana'

/** Color de la fase: el descanso se ve distinto de un vistazo. */
const COLOR_DESCANSO = '#34d399'
const colorFase = (fase: FasePomodoro) => (fase === 'trabajo' ? COLOR : COLOR_DESCANSO)

// El último ciclo elegido sobrevive a cerrar el cuarto (igual que la sesión).
const LS_CICLO = claveLS('mh.pomodoroBiblio')

function leerCiclo(): CicloPomodoro {
  try {
    const raw = localStorage.getItem(LS_CICLO)
    if (raw) {
      const c = JSON.parse(raw) as CicloPomodoro
      if (typeof c.trabajoMin === 'number' && typeof c.cortoMin === 'number') return c
    }
  } catch {
    // Ajuste corrupto: se arranca con el clásico.
  }
  return CICLOS_POMODORO[0].ciclo
}

/**
 * Sesiones de estudio con temporizador: eliges campo, estudias, se registra.
 * En modo pomodoro la sesión encadena tramos de trabajo y descansos, y cada
 * tramo de trabajo se guarda como una sesión normal (los descansos no cuentan).
 *
 * El historial y el tiempo por campo viven en la pestaña Resumen: aquí se HACE.
 */
export function EstudioTab() {
  const t = useT()
  const activa = useEstudio((s) => s.activa)
  const iniciar = useEstudio((s) => s.iniciar)
  const cancelar = useEstudio((s) => s.cancelar)
  const pausar = useEstudio((s) => s.pausar)
  const reanudar = useEstudio((s) => s.reanudar)
  const saltarDescanso = useEstudio((s) => s.saltarDescanso)
  const avanzarSiVencio = useEstudio((s) => s.avanzarSiVencio)
  const entradas = entradasBiblioRepo.useAll() ?? VACIO
  const ix = useIndice()

  const [modo, setModo] = useState<'simple' | 'pomodoro'>('simple')
  const [duracion, setDuracion] = useState(25)
  const [ciclo, setCiclo] = useState<CicloPomodoro>(leerCiclo)
  // Vacío = «el primero del índice»: cuál es eso depende del índice vivo, que
  // el usuario puede reordenar u ocultar, así que se resuelve en cada render.
  const [pilarId, setPilarId] = useState<string>('')
  const [entradaSel, setEntradaSel] = useState('')
  const [fin, setFin] = useState<{ pilarId: string; minutos: number } | null>(null)
  const [, setTick] = useState(0)

  // Tick de 1 s SOLO para repintar (el tiempo real vive en el timestamp del
  // store); el mismo tick detecta el fin de la fase. El avance es atómico en el
  // store, así que coincidir con el poll de auto-cierre no acredita dos veces.
  useEffect(() => {
    if (!activa) return
    let vivo = true
    const revisar = async () => {
      if (!vivo) return
      const cambio = await avanzarSiVencio()
      if (!cambio) {
        setTick((n) => n + 1)
        return
      }
      if (cambio.cerro === 'trabajo') {
        tocarCampana(2)
        // El campo lo toma de la sesión del closure: al cerrarse la última fase
        // el store ya la puso a null y `getState()` no lo tendría.
        setFin({ pilarId: activa.pilarId, minutos: cambio.minutos })
      } else {
        tocarCampana(1, CAMPANA_DESCANSO)
      }
    }
    const id = setInterval(() => void revisar(), 1000)
    // Si la pestaña vuelve a montarse con la fase ya vencida, detectarlo ya.
    const t0 = setTimeout(() => void revisar(), 0)
    return () => {
      vivo = false
      clearInterval(id)
      clearTimeout(t0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- avanzarSiVencio/setFin son del render vigente; re-suscribir solo si cambia la sesión activa
  }, [activa])

  const campoActivo = pilarId || campos(ix)[0]?.id || PILAR_GENERAL.id
  const entradasDelPilar = entradas.filter((e) => e.pilarId === campoActivo)

  const guardarCiclo = (c: CicloPomodoro) => {
    setCiclo(c)
    localStorage.setItem(LS_CICLO, JSON.stringify(c))
  }

  // ----- Sesión corriendo -----
  if (activa) {
    const fase = activa.fase ?? 'trabajo'
    const pausada = activa.pausadaMs != null
    const rest = Math.max(0, restanteMs(activa))
    const mm = Math.floor(rest / 60000)
    const ss = Math.floor((rest % 60000) / 1000)
    const avance = 1 - rest / (activa.duracionMin * 60000)
    const pilar = getPilar(activa.pilarId)
    const entrada = activa.entradaId != null ? entradas.find((e) => e.id === activa.entradaId) : undefined
    const color = colorFase(fase)
    const hechos = activa.completados ?? 0

    return (
      <div className="space-y-4">
        <div
          className="space-y-4 rounded-2xl border p-6 text-center"
          style={{ background: `${color}14`, borderColor: `${color}44` }}
        >
          <p className="text-sm text-white/60">
            <Icono emoji={pilar.icon} /> {pilar.titulo}
            {entrada && <span className="text-white/40"> · {entrada.titulo}</span>}
          </p>

          {activa.ciclo && (
            <p className="text-xs font-semibold" style={{ color }}>
              <Icono nombre={fase === 'trabajo' ? 'tomate' : 'sofa'} />{' '}
              {fase === 'trabajo'
                ? t('biblioteca.est.faseTrabajo', 'Concentración')
                : fase === 'largo'
                  ? t('biblioteca.est.faseLarga', 'Descanso largo')
                  : t('biblioteca.est.faseCorta', 'Descanso')}
            </p>
          )}

          <p className="text-6xl font-black tabular-nums text-white/95">
            {mm}:{String(ss).padStart(2, '0')}
          </p>

          <div className="h-2 overflow-hidden rounded-full bg-black/40">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${avance * 100}%`, background: color }}
            />
          </div>

          {activa.ciclo ? (
            <>
              {/* Puntos de la tanda: cuántos tramos llevas de los que te propusiste. */}
              <p
                className="text-sm tracking-[0.3em]"
                title={t('biblioteca.est.tandaTip', '{n} tramos de concentración completados', {
                  n: String(hechos),
                })}
              >
                {activa.ciclo.tandas > 0
                  ? Array.from({ length: activa.ciclo.tandas }, (_, i) => (i < hechos ? '●' : '○')).join('')
                  : '●'.repeat(Math.min(hechos, 8))}
              </p>
              <p className="text-xs text-white/40">
                {t('biblioteca.est.pomodoroNota', 'Cada tramo de concentración se registra al terminar; los descansos no cuentan.')}
              </p>
            </>
          ) : (
            <p className="text-xs text-white/40">
              {t('biblioteca.est.sesionDe', 'Sesión de {n} min — al terminar se registra sola', {
                n: String(activa.duracionMin),
              })}
            </p>
          )}

          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => (pausada ? reanudar() : pausar())}
              className="rounded-xl bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10"
            >
              <Icono nombre={pausada ? 'play' : 'pausa'} />{' '}
              {pausada ? t('biblioteca.est.reanudar', 'Reanudar') : t('biblioteca.est.pausar', 'Pausar')}
            </button>
            {activa.ciclo && fase !== 'trabajo' && (
              <button
                type="button"
                onClick={saltarDescanso}
                className="rounded-xl bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10"
              >
                <Icono nombre="siguiente" /> {t('biblioteca.est.saltar', 'Saltar descanso')}
              </button>
            )}
            <button
              type="button"
              onClick={() => void cancelar()}
              className="rounded-xl bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10"
              title={t('biblioteca.est.cancelarTip', 'Los minutos completos ya transcurridos se acreditan')}
            >
              <Icono nombre="mano" /> {t('biblioteca.est.cancelar', 'Terminar antes')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ----- Configuración de una sesión nueva -----
  const pill = (activo: boolean) =>
    `flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
      activo ? 'text-black' : 'bg-white/5 text-white/70 hover:bg-white/10'
    }`
  const inputMin =
    'w-14 rounded-lg border border-white/10 bg-black/30 px-1.5 py-1 text-center text-xs outline-none focus:border-white/30'

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
            <Icono nombre="cerrar" />
          </button>
        </div>
      )}

      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4" data-tut="biblioteca.estudio.timer">
        <p className="text-sm font-semibold"><Icono nombre="cronometro" /> {t('biblioteca.est.titulo', 'Sesión de estudio')}</p>

        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setModo('simple')}
            className={pill(modo === 'simple')}
            style={modo === 'simple' ? { background: COLOR } : undefined}
          >
            <Icono nombre="cronometro" /> {t('biblioteca.est.modoSimple', 'Simple')}
          </button>
          <button
            type="button"
            onClick={() => setModo('pomodoro')}
            className={pill(modo === 'pomodoro')}
            style={modo === 'pomodoro' ? { background: COLOR } : undefined}
          >
            <Icono nombre="tomate" /> {t('biblioteca.est.modoPomodoro', 'Pomodoro')}
          </button>
        </div>

        {modo === 'simple' ? (
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
        ) : (
          <div className="space-y-2.5">
            <p className="text-[11px] leading-relaxed text-white/40">
              {t('biblioteca.est.pomodoroDesc', 'Trabajas a tramos y descansas entre uno y otro; tras varios tramos, un descanso largo. Cada tramo de concentración se registra solo.')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {CICLOS_POMODORO.map((c) => {
                const elegido = ciclo.trabajoMin === c.ciclo.trabajoMin && ciclo.cortoMin === c.ciclo.cortoMin
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => guardarCiclo(c.ciclo)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      elegido ? 'text-black' : 'bg-white/5 text-white/70 hover:bg-white/10'
                    }`}
                    style={elegido ? { background: COLOR } : undefined}
                  >
                    {t(`biblioteca.est.ciclo.${c.id}`, c.labelEs)} {c.ciclo.trabajoMin}/{c.ciclo.cortoMin}
                  </button>
                )
              })}
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-white/55 sm:grid-cols-4">
              <CampoCiclo
                label={t('biblioteca.est.trabajoMin', 'Concentración')}
                valor={ciclo.trabajoMin}
                max={240}
                clase={inputMin}
                onCambiar={(v) => guardarCiclo({ ...ciclo, trabajoMin: v })}
              />
              <CampoCiclo
                label={t('biblioteca.est.cortoMin', 'Descanso')}
                valor={ciclo.cortoMin}
                max={60}
                clase={inputMin}
                onCambiar={(v) => guardarCiclo({ ...ciclo, cortoMin: v })}
              />
              <CampoCiclo
                label={t('biblioteca.est.largoMin', 'Descanso largo')}
                valor={ciclo.largoMin}
                max={60}
                clase={inputMin}
                onCambiar={(v) => guardarCiclo({ ...ciclo, largoMin: v })}
              />
              <CampoCiclo
                label={t('biblioteca.est.tandas', 'Tramos')}
                valor={ciclo.tandas}
                min={0}
                max={12}
                clase={inputMin}
                onCambiar={(v) => guardarCiclo({ ...ciclo, tandas: v })}
              />
            </div>
            <p className="text-[10px] text-white/30">
              {t('biblioteca.est.largoCada', 'Descanso largo cada {n} tramos · 0 tramos = sin fin, hasta que tú pares', {
                n: String(ciclo.cadaN),
              })}
            </p>
          </div>
        )}

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
              duracionMin: modo === 'simple' ? duracion : ciclo.trabajoMin,
              seccion: 'estudio',
              registroRapido: {
                esquemaId: 'estudio',
                valores: { minutos: modo === 'simple' ? duracion : ciclo.trabajoMin },
                etiqueta: t('biblioteca.registrarMin', 'Registrar {n} min', {
                  n: modo === 'simple' ? duracion : ciclo.trabajoMin,
                }),
              },
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wide text-white/40">{t('biblioteca.ent.campo', 'Campo')}</p>
            <select
              value={campoActivo}
              onChange={(e) => {
                setPilarId(e.target.value)
                setEntradaSel('')
              }}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm outline-none"
            >
              {campos(ix).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icono} {p.titulo}
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
            iniciar({
              pilarId: campoActivo,
              entradaId: entradaSel ? Number(entradaSel) : undefined,
              duracionMin: modo === 'simple' ? duracion : ciclo.trabajoMin,
              ...(modo === 'pomodoro' ? { ciclo, fase: 'trabajo' as const, completados: 0 } : {}),
            })
          }
          className="w-full rounded-xl py-2.5 text-sm font-semibold text-black transition"
          style={{ background: COLOR }}
        >
          <Icono nombre="play" />{' '}
          {t('biblioteca.est.iniciar', 'Iniciar {n} min', {
            n: String(modo === 'simple' ? duracion : ciclo.trabajoMin),
          })}
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
    </div>
  )
}

/** Un minuto ajustable del ciclo (etiqueta arriba, número abajo). */
function CampoCiclo({
  label,
  valor,
  min = 1,
  max,
  clase,
  onCambiar,
}: {
  label: string
  valor: number
  min?: number
  max: number
  clase: string
  onCambiar: (v: number) => void
}) {
  return (
    <label className="flex items-center justify-between gap-1.5">
      <span className="min-w-0 truncate">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={valor}
        onChange={(e) => onCambiar(Math.max(min, Math.min(max, Number(e.target.value) || min)))}
        className={clase}
      />
    </label>
  )
}
