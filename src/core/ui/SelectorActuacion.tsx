import { useEffect, useMemo, useState } from 'react'
import { useActuacion, type Actuacion } from '../state/actuacionStore'
import { useAsistentes } from '../state/asistentesStore'
import { EMOTES } from '../house/emotes'
import { nombreAsistente } from '../chat/mascotas'
import { gruposCardioRepo, gruposFlexRepo, gruposFuerzaRepo } from '../data/repository'
import { tienePatron } from '../../rooms/ejercicio/anim/mapa'
import { nombreEjercicio } from '../../rooms/ejercicio/nombres'
import { normalizarEjercicio } from '../../rooms/ejercicio/stats'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'

interface GrupoSel {
  id: string
  label: string
  ejercicios: string[]
}

/** Qué baile o qué ejercicio hace un asistente (abierto desde la burbuja de cercanía). */
export function SelectorActuacion() {
  const selector = useActuacion((s) => s.selector)
  if (!selector) return null
  return <Panel asistenteId={selector.asistenteId} tipo={selector.tipo} />
}

function Panel({ asistenteId, tipo }: { asistenteId: string; tipo: Actuacion['tipo'] }) {
  const t = useT()
  const asistente = useAsistentes((s) => s.lista.find((a) => a.id === asistenteId))
  const cerrar = useActuacion((s) => s.cerrarSelector)
  const actuar = useActuacion((s) => s.actuar)
  const [q, setQ] = useState('')
  const [grupos, setGrupos] = useState<GrupoSel[]>([])

  // Catálogo vivo del gym (o la semilla si está vacío), solo con lo que el rig sabe hacer.
  useEffect(() => {
    if (tipo !== 'ejercicio') return
    let vivo = true
    void (async () => {
      const [f, c, x] = await Promise.all([gruposFuerzaRepo.list(), gruposCardioRepo.list(), gruposFlexRepo.list()])
      let lista: GrupoSel[] = [...f, ...c, ...x].map((g) => ({
        id: g.grupoId,
        label: g.label,
        ejercicios: g.ejercicios.map((e) => e.nombre),
      }))
      if (!lista.length) {
        const cat = await import('../../rooms/ejercicio/catalogo')
        lista = [...cat.CATALOGO_FUERZA, ...cat.CATALOGO_CARDIO, ...cat.CATALOGO_FLEX].map((g) => ({
          id: g.id,
          label: g.label,
          ejercicios: g.ejercicios.map((e) => e.nombre),
        }))
      }
      lista = lista
        .map((g) => ({ ...g, ejercicios: g.ejercicios.filter(tienePatron) }))
        .filter((g) => g.ejercicios.length > 0)
      if (vivo) setGrupos(lista)
    })()
    return () => {
      vivo = false
    }
  }, [tipo])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      cerrar()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [cerrar])

  const nq = normalizarEjercicio(q)
  const secciones = useMemo(
    () =>
      grupos
        .map((g) => ({
          ...g,
          ejercicios: g.ejercicios.filter(
            (n) => !nq || normalizarEjercicio(n).includes(nq) || normalizarEjercicio(nombreEjercicio(t, n)).includes(nq),
          ),
        }))
        .filter((g) => g.ejercicios.length > 0),
    [grupos, nq, t],
  )

  if (!asistente) return null
  const nombre = nombreAsistente(t, asistente)
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={cerrar}
    >
      <div
        className="ui-panel ui-pop flex max-h-[80vh] w-full max-w-md flex-col gap-2 rounded-2xl border border-white/10 p-3 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold">
            {tipo === 'emote'
              ? t('actua.titulo.emote', '¿Qué baila {nombre}?', { nombre })
              : t('actua.titulo.ejercicio', '¿Qué ejercicio hace {nombre}?', { nombre })}
          </h3>
          <button
            type="button"
            onClick={cerrar}
            title={t('herr.quitar', 'Quitar herramienta')}
            className="rounded px-1 text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <Icono nombre="cerrar" />
          </button>
        </div>
        {tipo === 'emote' ? (
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {EMOTES.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => actuar(asistenteId, { tipo: 'emote', emote: e.id })}
                className="flex h-16 flex-col items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/10 transition hover:bg-white/20 active:scale-95"
              >
                <span className="text-2xl leading-none">
                  <Icono emoji={e.emoji} />
                </span>
                <span className="max-w-full truncate px-1 text-[11px] font-semibold">{t(`herr.emote.${e.id}`, e.fallback)}</span>
              </button>
            ))}
          </div>
        ) : (
          <>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('actua.buscar', 'Buscar ejercicio…')}
              autoFocus
              className="w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm outline-none"
            />
            <div className="min-h-0 flex-1 overflow-y-auto">
              {secciones.map((g) => (
                <div key={g.id} className="mb-2">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-white/40">
                    {t(`ejercicio.grupo.${g.id}`, g.label)}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {g.ejercicios.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => actuar(asistenteId, { tipo: 'ejercicio', nombre: n })}
                        className="rounded-md border border-white/10 bg-white/10 px-2 py-1 text-[11px] transition hover:bg-white/20 active:scale-95"
                      >
                        {nombreEjercicio(t, n)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
