import { useState } from 'react'
import { getPlantilla } from '../registry'
import { getCuarto } from '../state/cuartosStore'
import type { Memoria } from '../data/db'
import { editarMemoria, guardarMemoria, olvidarMemoria, restaurarMemoria } from '../data/repository'
import { conexionesDe, useGrafo, useVistaGrafo } from '../grafoApps'
import { refMemoria, tipoDeRef } from '../grafo/memoria'
import { useT } from '../i18n/useT'
import { Icono } from '../ui/iconos/Icono'

/**
 * «Lo que recuerdo de ti» (Chat › Asistentes › Registros): las memorias del
 * asistente, editables, con cuántas cosas conecta cada una y la puerta a la
 * vista de grafo. Lo que otra memoria reemplazó queda plegado en «Ya no aplica».
 *
 * Conserva `data-tut="chat.memorias"`: el tutorial «Chat · Registros y
 * memorias» lo señala.
 */
export function PanelMemorias() {
  const t = useT()
  const { memorias, enlaces } = useGrafo()
  const abrirGrafo = useVistaGrafo((s) => s.abrir)
  const [nueva, setNueva] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const vigentes = memorias.filter((m) => m.vigente)
  const viejas = memorias.filter((m) => !m.vigente)

  const anadir = async () => {
    const hecho = nueva?.trim()
    if (!hecho) return setNueva(null)
    const r = await guardarMemoria({ hecho })
    setAviso(r === 'repetida' ? t('chat.memorias.repetida', 'Eso ya lo recuerdo.') : null)
    setNueva(null)
  }

  return (
    <div data-tut="chat.memorias" className="mb-2 border-b border-white/10 px-1 pb-2">
      <div className="mb-1 flex items-center gap-1">
        <p className="min-w-0 flex-1 text-[11px] font-semibold text-violet-400/70">
          <Icono nombre="memoria" /> {t('chat.memorias', 'Lo que recuerdo de ti')}
        </p>
        <button
          type="button"
          data-tut="chat.memorias.grafo"
          onClick={() => abrirGrafo()}
          className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-white/60 transition hover:bg-white/10 hover:text-white/90"
        >
          <Icono nombre="nodos" /> {t('grafo.ver', 'Ver grafo')}
        </button>
        <button
          type="button"
          onClick={() => setNueva(nueva === null ? '' : null)}
          className="rounded-full px-1.5 py-0.5 text-[11px] text-white/40 transition hover:bg-white/10 hover:text-white/80"
          title={t('chat.memorias.anadir', 'Añadir memoria')}
          aria-label={t('chat.memorias.anadir', 'Añadir memoria')}
        >
          <Icono nombre="agregar" />
        </button>
      </div>

      {nueva !== null && (
        <input
          autoFocus
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void anadir()
            if (e.key === 'Escape') setNueva(null)
          }}
          onBlur={() => void anadir()}
          placeholder={t('chat.memorias.placeholder', 'Ej.: soy vegetariana desde 2020')}
          className="mb-1 w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-xs outline-none transition focus:border-accent/60"
        />
      )}
      {aviso && <p className="mb-1 px-1 text-[11px] text-white/45">{aviso}</p>}
      {vigentes.length === 0 && nueva === null && (
        <p className="px-1 text-[11px] text-white/35">
          {t('chat.memorias.vacio', 'Aún no recuerdo nada de ti. Dime «recuerda que…» o añádelo con el +.')}
        </p>
      )}

      {vigentes.map((m) => (
        <FilaMemoria
          key={m.id}
          m={m}
          conexiones={
            // Sin contar la app de la memoria: el chip dice con cuántas COSAS conecta.
            m.uid ? conexionesDe(refMemoria(m.uid), enlaces).filter((c) => tipoDeRef(c.ref) !== 'app').length : 0
          }
          onGrafo={() => m.uid && abrirGrafo(refMemoria(m.uid))}
        />
      ))}

      {viejas.length > 0 && (
        <details className="mt-1 px-1">
          <summary className="cursor-pointer text-[11px] text-white/35 hover:text-white/60">
            {t('chat.memorias.historial', 'Ya no aplica ({n})', { n: viejas.length })}
          </summary>
          {viejas.map((m) => (
            <div key={m.id} className="flex items-start gap-2 rounded-lg px-1 py-1">
              <p className="min-w-0 flex-1 break-words text-xs text-white/40 line-through">{m.hecho}</p>
              <button
                type="button"
                onClick={() => m.id != null && void restaurarMemoria(m.id)}
                className="px-1 py-0.5 text-[11px] text-white/30 transition hover:text-white/70"
                title={t('chat.memorias.restaurar', 'Volver a recordarlo')}
                aria-label={t('chat.memorias.restaurar', 'Volver a recordarlo')}
              >
                <Icono nombre="restaurar" />
              </button>
              <button
                type="button"
                onClick={() => m.id != null && void olvidarMemoria(m.id)}
                className="px-1 py-0.5 text-[11px] text-white/20 transition hover:text-white/60"
                title={t('chat.olvidar', 'Olvidar')}
                aria-label={t('chat.olvidar', 'Olvidar')}
              >
                <Icono nombre="cerrar" />
              </button>
            </div>
          ))}
        </details>
      )}
    </div>
  )
}

function FilaMemoria({ m, conexiones, onGrafo }: { m: Memoria; conexiones: number; onGrafo: () => void }) {
  const t = useT()
  const [texto, setTexto] = useState<string | null>(null)

  const guardar = async () => {
    if (texto !== null && texto.trim() && texto.trim() !== m.hecho && m.id != null) await editarMemoria(m.id, texto)
    setTexto(null)
  }

  return (
    <div className="flex items-start gap-2 rounded-lg px-1 py-1 hover:bg-white/5">
      <span className="mt-0.5 text-sm leading-none">
        <Icono emoji={(m.roomId && (getPlantilla(m.roomId) ?? getCuarto(m.roomId))?.icon) || '🧠'} />
      </span>
      {texto !== null ? (
        <textarea
          autoFocus
          value={texto}
          rows={2}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void guardar()
            }
            if (e.key === 'Escape') setTexto(null)
          }}
          onBlur={() => void guardar()}
          aria-label={t('chat.memorias.editar', 'Editar memoria')}
          className="min-w-0 flex-1 resize-none rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-xs outline-none transition focus:border-accent/60"
        />
      ) : (
        <button
          type="button"
          onClick={() => setTexto(m.hecho)}
          className="min-w-0 flex-1 break-words text-left text-xs text-white/75"
          title={t('chat.memorias.editar', 'Editar memoria')}
        >
          {m.hecho}
        </button>
      )}
      {conexiones > 0 && (
        <button
          type="button"
          onClick={onGrafo}
          className="flex shrink-0 items-center gap-0.5 rounded-full bg-violet-400/10 px-1.5 py-0.5 text-[10px] tabular-nums text-violet-300/80 transition hover:bg-violet-400/20"
          title={t('grafo.conexiones', '{n} conexiones', { n: conexiones })}
        >
          <Icono nombre="vinculo" /> {conexiones}
        </button>
      )}
      <button
        type="button"
        onClick={() => m.id != null && void olvidarMemoria(m.id)}
        className="px-1 py-0.5 text-[11px] text-white/20 transition hover:text-white/60"
        title={t('chat.olvidar', 'Olvidar')}
        aria-label={t('chat.olvidar', 'Olvidar')}
      >
        <Icono nombre="cerrar" />
      </button>
    </div>
  )
}
