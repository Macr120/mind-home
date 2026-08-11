import { useMemo, useState } from 'react'
import type { Hobby, ProyectoHobby, SesionHobby } from '../../core/data/db'
import { hobbiesRepo, proyectosHobbyRepo, sesionesHobbyRepo } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { borrarMetasDeAmbito } from '../../core/metas'
import { actividadId } from '../../core/rutinas'
import { HorarioActividad } from '../../core/ui/HorarioActividad'
import { CronogramaApp } from '../../core/ui/metas/CronogramaApp'
import { Icono } from '../../core/ui/iconos/Icono'
import { Archivador } from '../_shared/Archivador'
import { HeatmapAnual } from './HeatmapAnual'
import { HeatmapMes } from './HeatmapMes'
import { Proyectos } from './Proyectos'
import {
  diasSemana,
  fmtMin,
  hoyISO,
  inicioSemana,
  mejorRacha,
  minutosPorDia,
  rachaActual,
  rgba,
  totales,
} from './stats'
import { vivo } from '../../core/ui/estilos'

const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const MINUTOS_RAPIDOS = [15, 30, 45, 60]

/** Vista de un hobby: stats, meta semanal, registro de sesiones, heatmaps y proyectos. */
export function DetalleHobby({
  hobby,
  sesiones,
  proyectos,
  onVolver,
  onEditar,
  onAbrirProyecto,
}: {
  hobby: Hobby
  sesiones: SesionHobby[]
  proyectos: ProyectoHobby[]
  onVolver: () => void
  onEditar: () => void
  onAbrirProyecto: (p: ProyectoHobby) => void
}) {
  const t = useT()
  const [minutos, setMinutos] = useState(30)
  const [fecha, setFecha] = useState(hoyISO())
  const [nota, setNota] = useState('')
  const [proyectoSel, setProyectoSel] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  // Día elegido en un calendario: el historial de abajo lo abre y lo destaca.
  const [diaSel, setDiaSel] = useState<string | undefined>()

  const porDia = useMemo(() => minutosPorDia(sesiones), [sesiones])
  const fechas = useMemo(() => new Set(sesiones.map((s) => s.fecha)), [sesiones])
  const { totalMin, diasActivos, promedioMin } = useMemo(() => totales(sesiones), [sesiones])
  const racha = rachaActual(fechas)
  const mejor = mejorRacha(fechas)

  const semana = diasSemana(inicioSemana(hoyISO()))
  const logrados = semana.filter((f) => fechas.has(f)).length

  const registrar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (minutos <= 0 || !fecha) return
    await sesionesHobbyRepo.add({
      hobbyId: hobby.id!,
      fecha,
      minutos,
      nota: nota.trim() || undefined,
      proyectoId: proyectoSel ? Number(proyectoSel) : undefined,
    })
    setNota('')
  }

  // Cascada: primero los registros dependientes (con las metas de cada ámbito),
  // al final el hobby.
  const eliminar = async () => {
    for (const s of sesiones) if (s.id != null) await sesionesHobbyRepo.remove(s.id)
    for (const p of proyectos) {
      if (p.id == null) continue
      await borrarMetasDeAmbito(`proyecto:${p.id}`)
      await proyectosHobbyRepo.remove(p.id)
    }
    await borrarMetasDeAmbito(`hobby:${hobby.id}`)
    await hobbiesRepo.remove(hobby.id!)
    onVolver()
  }

  // Volver a tocar el mismo día lo suelta (el historial deja de destacarlo).
  const elegirDia = (iso: string) => setDiaSel((v) => (v === iso ? undefined : iso))

  const enCurso = proyectos.filter((p) => p.estado === 'en-curso')
  const nombreProyecto = (id?: number) => proyectos.find((p) => p.id === id)?.nombre

  const stats = [
    { valor: `${racha}`, label: t('hobbies.stat.racha', 'Racha') },
    { valor: `${mejor}`, label: t('hobbies.stat.mejor', 'Mejor racha') },
    { valor: fmtMin(totalMin), label: t('hobbies.stat.total', 'Total') },
    { valor: `${diasActivos}`, label: t('hobbies.stat.activos', 'Días activos') },
    { valor: fmtMin(promedioMin), label: t('hobbies.stat.promedio', 'Promedio/día') },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onVolver}
          className="rounded-lg px-2 py-1 text-lg hover:bg-white/10"
          title={t('hobbies.det.volver', 'Volver')}
        >
          ‹
        </button>
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xl"
          style={{ background: rgba(hobby.color, 0.2) }}
        >
          <Icono emoji={hobby.emoji} />
        </span>
        <p className="min-w-0 flex-1 truncate text-lg font-bold">{hobby.nombre}</p>
        {confirmando ? (
          <div className="flex shrink-0 items-center gap-1.5 text-xs">
            <span className="text-white/60">{t('hobbies.det.confirmar', '¿Borrar todo?')}</span>
            <button
              type="button"
              onClick={eliminar}
              className="rounded-lg bg-red-500/20 px-2 py-1 font-semibold text-red-300 hover:bg-red-500/30"
            >
              {t('hobbies.det.si', 'Sí')}
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              className="rounded-lg bg-white/5 px-2 py-1 hover:bg-white/10"
            >
              {t('hobbies.det.no', 'No')}
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={onEditar}
              className="shrink-0 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs font-semibold hover:bg-white/10"
            >
              {t('hobbies.det.editar', 'Editar')}
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(true)}
              title={t('hobbies.det.eliminar', 'Eliminar hobby')}
              className="shrink-0 rounded-lg bg-white/5 px-2 py-1.5 text-xs text-white/50 hover:bg-red-500/20 hover:text-red-300"
            >
              <Icono nombre="basura" />
            </button>
          </>
        )}
      </div>

      <div data-tut="hobbies.detalle.stats" className="grid grid-cols-5 gap-2 text-center">
        {stats.map((s, i) => (
          <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-2">
            <p className="text-sm font-bold" style={i === 0 && racha > 0 ? { color: hobby.color } : undefined}>
              {i === 0 && racha > 0 && <Icono nombre="racha" />} {s.valor}
            </p>
            <p className="text-[9px] text-white/40">{s.label}</p>
          </div>
        ))}
      </div>

      {!!hobby.metaDiasSemana && (
        <div data-tut="hobbies.meta.semanal" className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold">
              <Icono nombre="objetivo" /> {t('hobbies.meta.titulo', 'Meta semanal')}
            </p>
            <p className="text-[10px] text-white/45">
              {logrados >= hobby.metaDiasSemana
                ? t('hobbies.meta.lograda', '¡Lograda! 🎉')
                : t('hobbies.meta.progreso', '{d}/{m} días', { d: logrados, m: hobby.metaDiasSemana })}
            </p>
          </div>
          <div className="flex justify-between gap-1.5">
            {semana.map((f, i) => (
              <div
                key={f}
                className={`flex h-8 flex-1 items-center justify-center rounded-lg text-[10px] font-semibold ${
                  f === hoyISO() ? 'ring-1 ring-white/40' : ''
                } ${fechas.has(f) ? 'texto-cta' : 'text-white/35'}`}
                style={{ background: fechas.has(f) ? hobby.color : 'rgba(255,255,255,0.05)' }}
              >
                {DIAS_SEMANA[i]}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* A qué hora y qué días practicas esto: el bloque vive en el calendario. */}
      <HorarioActividad
        actividad={{
          actividadId: actividadId('hobby', hobby.id!),
          plantillaId: 'hobbies',
          nombre: hobby.nombre,
          emoji: hobby.emoji,
          horaSugerida: '19:00',
          duracionMin: minutos,
          seccion: 'hobbies',
          registroRapido: {
            esquemaId: 'practica',
            valores: { hobby: hobby.nombre, minutos },
            etiqueta: t('hobbies.registrarMin', 'Registrar {n} min', { n: minutos }),
          },
        }}
        hechoHoy={fechas.has(hoyISO())}
      />

      <form data-tut="hobbies.sesion.form" onSubmit={registrar} className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
        <p className="text-sm font-semibold">{t('hobbies.sesion.titulo', 'Registrar práctica')}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {MINUTOS_RAPIDOS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMinutos(m)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                minutos === m ? 'texto-cta' : 'bg-white/5 hover:bg-white/10'
              }`}
              style={minutos === m ? { background: hobby.color } : undefined}
            >
              {m} min
            </button>
          ))}
          <input
            type="number"
            min={1}
            max={720}
            value={minutos || ''}
            onChange={(e) => setMinutos(Number(e.target.value))}
            className="w-20 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm outline-none focus:border-white/30"
          />
          <span className="text-xs text-white/45">min</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="date"
            value={fecha}
            max={hoyISO()}
            onChange={(e) => setFecha(e.target.value)}
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-sm outline-none focus:border-white/30"
          />
          {enCurso.length > 0 && (
            <select
              value={proyectoSel}
              onChange={(e) => setProyectoSel(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm outline-none focus:border-white/30"
            >
              <option value="">{t('hobbies.sesion.sinProyecto', '— Sin proyecto —')}</option>
              {enCurso.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          )}
        </div>
        <input
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder={t('hobbies.sesion.nota', 'Nota (opcional): ¿qué practicaste?')}
          maxLength={200}
          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 outline-none focus:border-white/30"
        />
        <button
          type="submit"
          className="w-full rounded-lg py-2 font-bold texto-cta transition hover:opacity-90"
          style={{ background: hobby.color }}
        >
          {t('hobbies.sesion.guardar', '+ Registrar')}
        </button>
      </form>

      <div data-tut="hobbies.detalle.heatmap">
        <HeatmapAnual minPorDia={porDia} color={hobby.color} sel={diaSel} onDia={elegirDia} />
      </div>
      <HeatmapMes minPorDia={porDia} color={hobby.color} sel={diaSel} onDia={elegirDia} />

      <Proyectos
        hobby={hobby}
        proyectos={proyectos}
        sesiones={sesiones}
        onAbrir={onAbrirProyecto}
      />

      {/* El cronograma de ESTE hobby: las metas generales, las que no son de un
          proyecto concreto (esas viven dentro de cada proyecto). */}
      <div className="rounded-xl border border-white/10 bg-white/5" data-tut="hobbies.cronograma.hobby">
        <div className="flex h-96 flex-col">
          <CronogramaApp plantillaId="hobbies" ambitoId={`hobby:${hobby.id}`} />
        </div>
      </div>

      {sesiones.length > 0 && (
        <div data-tut="hobbies.detalle.sesiones" className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="mb-2 text-xs font-semibold">{t('hobbies.sesion.todas', 'Tus sesiones')}</p>
          <Archivador
            items={sesiones}
            fecha={(s) => s.fecha}
            clave={(s) => s.id ?? s.fecha}
            abrirEn={diaSel}
            resumen={(ses) => fmtMin(ses.reduce((acc, s) => acc + s.minutos, 0))}
          >
            {(s) => (
              <div className="flex items-center gap-2 rounded-lg bg-black/20 px-2.5 py-1.5 text-xs">
                <span className="texto-vivo w-14 shrink-0 font-semibold" style={vivo(hobby.color)}>
                  {fmtMin(s.minutos)}
                </span>
                <span className="shrink-0 text-white/45">{s.fecha}</span>
                {s.proyectoId != null && nombreProyecto(s.proyectoId) && (
                  <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[9px]">
                    {nombreProyecto(s.proyectoId)}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-white/50">{s.nota}</span>
                <button
                  type="button"
                  onClick={() => sesionesHobbyRepo.remove(s.id!)}
                  className="shrink-0 text-white/30 hover:text-red-400"
                  title={t('hobbies.sesion.borrar', 'Borrar sesión')}
                >
                  ✕
                </button>
              </div>
            )}
          </Archivador>
        </div>
      )}
    </div>
  )
}
