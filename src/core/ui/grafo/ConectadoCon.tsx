import { useState } from 'react'
import { abrirApp } from '../../abrirApp'
import { conexionesDe, useGrafo, useVistaGrafo, type NodoEntidadApp } from '../../grafoApps'
import { idDeRef, tipoDeRef, type RefNodo } from '../../grafo/memoria'
import { useT } from '../../i18n/useT'
import { Icono } from '../iconos/Icono'

/**
 * Backlinks del grafo de memoria: «dónde se usa esto». En la ficha de una
 * receta, una persona, una idea o una meta salen las memorias del asistente
 * que la nombran y lo que el usuario conectó a mano. Tocar una memoria abre el
 * grafo en ella; tocar otra cosa abre su app.
 *
 * Mismo patrón que `rooms/_shared/EntradasQueUsan.tsx`: si no hay nada
 * conectado, no se dibuja nada.
 */
export function ConectadoCon({ refNodo, className = '' }: { refNodo: RefNodo | null | undefined; className?: string }) {
  const t = useT()
  const { memorias, entidades, enlaces } = useGrafo()
  const abrirGrafo = useVistaGrafo((s) => s.abrir)
  const [aviso, setAviso] = useState<string | null>(null)

  if (!refNodo) return null
  // Las apps son los «hubs» del grafo: que una receta es de la cocina no aporta nada aquí.
  const conexiones = conexionesDe(refNodo, enlaces).filter((c) => tipoDeRef(c.ref) !== 'app')
  if (conexiones.length === 0) return null

  const porRef = new Map<string, NodoEntidadApp>(entidades.map((e) => [e.ref, e]))
  const hechoDe = new Map(memorias.map((m) => [m.uid, m.hecho]))

  const abrirCosa = (e: NodoEntidadApp) => {
    if (e.abrir) return e.abrir()
    if (!e.appId) return abrirGrafo(e.ref)
    setAviso(
      abrirApp(e.appId, e.seccion, e.dato)
        ? null
        : t('grafo.sinApp', 'Coloca esa app en tu MindHaOS para abrirla desde aquí.'),
    )
  }

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <span className="text-[10px] uppercase tracking-wide text-white/40">
        {t('grafo.conectadoCon', 'Conectado con')}
      </span>
      {conexiones.map(({ ref }) => {
        const cosa = porRef.get(ref)
        const texto = cosa?.titulo ?? hechoDe.get(idDeRef(ref))
        if (!texto) return null
        return (
          <button
            key={ref}
            type="button"
            onClick={() => (cosa ? abrirCosa(cosa) : abrirGrafo(ref))}
            className="flex max-w-[16rem] items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-white/70 transition hover:bg-white/10 hover:text-white/95"
            title={texto}
          >
            {cosa ? <Icono emoji={cosa.emoji} /> : <Icono nombre="memoria" />}
            <span className="min-w-0 truncate">{texto}</span>
          </button>
        )
      })}
      <button
        type="button"
        onClick={() => abrirGrafo(refNodo)}
        className="rounded-full px-1.5 py-1 text-[11px] text-white/40 transition hover:bg-white/10 hover:text-white/80"
        title={t('grafo.verAqui', 'Verlo en el grafo')}
        aria-label={t('grafo.verAqui', 'Verlo en el grafo')}
      >
        <Icono nombre="nodos" />
      </button>
      {aviso && (
        <p className="w-full rounded-lg border border-amber-400/30 bg-amber-400/10 px-2.5 py-1.5 text-[11px] text-amber-200/90">
          {aviso}
        </p>
      )}
    </div>
  )
}
