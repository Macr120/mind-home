import { useMemo } from 'react'
import { VACIO, partidasEjercicioRepo } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { Archivador } from '../_shared/Archivador'
import { COLOR } from './constantes'
import type { ModoEjercicio } from './ejercicios'
import { MEDALLAS, RETOS, records } from './juego'

const MODOS: { id: ModoEjercicio; labelEs: string }[] = [
  { id: 'opcion', labelEs: '¿Qué significa?' },
  { id: 'inverso', labelEs: 'Al revés' },
  { id: 'cloze', labelEs: 'Completar' },
]

/** Etiqueta en español de un modo (el respaldo de `t()`; nunca el id crudo). */
const labelModo = (id: ModoEjercicio) => MODOS.find((m) => m.id === id)?.labelEs ?? id

/**
 * Lo que dejaron las partidas: récord por modo, mejor racha, medallas ganadas y
 * el historial completo. Vive en Progreso —no en Repaso— por lo mismo que el
 * historial de Biblioteca vive en Resumen: una pestaña es para hacer y otra
 * para ver.
 */
export function RecordsEjercicios({ idiomaId }: { idiomaId: number }) {
  const t = useT()
  const todas = partidasEjercicioRepo.useAll() ?? VACIO
  const partidas = useMemo(() => todas.filter((p) => p.idiomaId === idiomaId), [todas, idiomaId])
  const { porModo, mejorCombo, medallas } = useMemo(() => records(partidas), [partidas])

  if (partidas.length === 0) return null

  const ganadas = MEDALLAS.filter((m) => medallas.has(m.id))

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-sm font-semibold">
        <Icono nombre="trofeo" /> {t('idiomas.rec.titulo', 'Récords de ejercicios')}
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {MODOS.map((m) => (
          <Dato
            key={m.id}
            label={t(`idiomas.ej.modo.${m.id}`, m.labelEs)}
            valor={String(porModo.get(m.id) ?? 0)}
          />
        ))}
        <Dato label={t('idiomas.rec.mejorCombo', 'Mejor racha')} valor={String(mejorCombo)} />
      </div>

      {ganadas.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {ganadas.map((m) => (
            <span
              key={m.id}
              className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-black"
              style={{ background: COLOR }}
            >
              <Icono nombre={m.icono} /> {t(`idiomas.medalla.${m.id}`, m.es)}
            </span>
          ))}
        </div>
      )}

      <Archivador
        items={partidas}
        fecha={(p) => p.fecha}
        clave={(p) => p.id ?? p.creadoEn}
        resumen={(xs) => `${xs.reduce((a, p) => a + p.puntos, 0)} pts`}
        vacio={t('idiomas.rec.vacio', 'Todavía no has jugado ninguna ronda.')}
      >
        {(p) => (
          <div className="flex items-center justify-between gap-2 rounded-lg bg-black/20 px-2.5 py-1.5 text-sm">
            <span className="min-w-0 flex-1 truncate text-white/80">
              <Icono nombre={RETOS.find((r) => r.id === p.reto)?.icono ?? 'objetivo'} />{' '}
              {t(`idiomas.ej.modo.${p.modo}`, labelModo(p.modo))}
              <span className="text-white/40"> · {p.aciertos}/{p.preguntas}</span>
            </span>
            <span className="shrink-0 text-xs font-semibold" style={{ color: COLOR }}>
              {p.puntos}
            </span>
          </div>
        )}
      </Archivador>
    </div>
  )
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-lg bg-black/20 px-2.5 py-2">
      <p className="truncate text-[10px] text-white/45">{label}</p>
      <p className="text-lg font-bold text-white/90">{valor}</p>
    </div>
  )
}
