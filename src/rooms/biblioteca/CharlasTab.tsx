import { useState } from 'react'
import { VACIO, conversacionesBiblioRepo } from '../../core/data/repository'
import { iaActiva } from '../../core/chat/ia'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { COLOR, PILAR_GENERAL, getPilar } from './constantes'
import { ChatCharla } from './ChatCharla'
import type { AnclaTema } from './arbol'

/** Lista de charlas con el Sabio (filtrable por campo) o la charla abierta. */
export function CharlasTab({
  abierta,
  onAbrir,
  onCerrar,
  borradorInicial,
  anclaInicial,
  sesion,
  onIrANodo,
  onVerEntrada,
}: {
  abierta: number | 'nueva' | null
  onAbrir: (id: number | 'nueva') => void
  onCerrar: () => void
  borradorInicial: string
  anclaInicial: AnclaTema | null
  /** Key de la charla: cambia con cada charla nueva para remontar limpio. */
  sesion: number
  onIrANodo: (nodoId: string) => void
  onVerEntrada: (entradaId: number) => void
}) {
  const t = useT()
  const charlas = conversacionesBiblioRepo.useAll() ?? VACIO
  const [filtro, setFiltro] = useState('todos')

  if (abierta !== null) {
    return (
      <ChatCharla
        key={sesion}
        conversacionId={abierta === 'nueva' ? null : abierta}
        borradorInicial={borradorInicial}
        anclaInicial={anclaInicial}
        onCreada={onAbrir}
        onSalir={onCerrar}
        onIrANodo={onIrANodo}
        onVerEntrada={onVerEntrada}
      />
    )
  }

  const conIA = iaActiva()
  const pilaresConCharlas = [...new Set(charlas.map((c) => c.pilarId))]
  const filtradas = filtro === 'todos' ? charlas : charlas.filter((c) => c.pilarId === filtro)

  return (
    <div className="space-y-3">
      {!conIA && (
        <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2.5 text-xs leading-relaxed text-amber-200/90">
          {t('biblioteca.sinIA', 'Configura tu IA (Ajustes → Inteligencia artificial) para charlar con el Sabio. Mientras, puedes crear entradas a mano en la Enciclopedia.')}
        </p>
      )}

      <button
        type="button"
        onClick={() => onAbrir('nueva')}
        disabled={!conIA}
        className="w-full rounded-xl py-2.5 text-sm font-semibold text-black transition disabled:opacity-40"
        style={{ background: COLOR }}
      >
        <Icono nombre="chat" /> {t('biblioteca.charla.nuevaBtn', 'Nueva charla con el Sabio')}
      </button>

      {pilaresConCharlas.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {['todos', ...pilaresConCharlas].map((id) => {
            const activo = filtro === id
            const pilar = id === 'todos' ? null : getPilar(id)
            return (
              <button
                key={id}
                type="button"
                onClick={() => setFiltro(id)}
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs transition ${
                  activo ? 'text-black' : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
                style={activo ? { background: COLOR } : undefined}
              >
                {pilar ? <><Icono emoji={pilar.icon} /> {pilar.titulo}</> : t('biblioteca.charla.todas', 'Todas')}
              </button>
            )
          })}
        </div>
      )}

      {filtradas.length === 0 && (
        <p className="px-4 py-10 text-center text-xs leading-relaxed text-white/35">
          {t('biblioteca.charla.vacio', 'Aún no hay charlas. Pregunta lo que sea — «¿por qué el cielo es azul?» — y la biblioteca la archivará en su campo del conocimiento.')}
        </p>
      )}

      <div className="space-y-2">
        {filtradas.map((c) => {
          const pilar = getPilar(c.pilarId)
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => c.id != null && onAbrir(c.id)}
              className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left transition hover:bg-white/10"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/25 text-lg">
                <Icono emoji={pilar.icon} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-white/90">
                  {c.titulo || t('biblioteca.charla.sinTitulo', 'Charla sin título')}
                </span>
                <span className="block truncate text-[10px] text-white/40">
                  {pilar.titulo}
                  {c.pilarId === PILAR_GENERAL.id && ` · ${t('biblioteca.charla.porClasificar', 'por clasificar')}`}
                </span>
              </span>
              <span className="shrink-0 text-[10px] text-white/35">
                {new Date(c.actualizadoEn).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
