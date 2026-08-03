import { useState } from 'react'
import type { MapaIdeas, NodoMapa } from '../../core/data/db'
import { nodosMapaRepo, useNodosMapa } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { vivo } from '../../core/ui/estilos'
import { COLOR } from './constantes'
import {
  agregarCriterio,
  agregarOpcion,
  borrarDeMatriz,
  celdaDe,
  ciclarPuntaje,
  COLORES_PUNTAJE,
  ganadora,
  leerMatriz,
  MAX_PUNTAJE,
  puntaje,
  totalOpcion,
} from './matriz'

/**
 * Vista de la matriz de decisión: la única que no usa el lienzo.
 *
 * Filas = criterios con su peso; columnas = opciones; celdas = qué tan bien
 * cumple cada opción cada criterio. Todo se cambia TOCANDO (el número da la
 * vuelta al llegar a 5) porque en el teléfono un stepper por celda no cabe, y
 * el color hace el trabajo de leer la tabla de un vistazo.
 */
export function MatrizDecision({ mapa }: { mapa: MapaIdeas }) {
  const t = useT()
  const nodos = useNodosMapa(mapa.id ?? null) ?? []
  const [editando, setEditando] = useState<string | null>(null)
  const [borrando, setBorrando] = useState<string | null>(null)

  const m = leerMatriz(nodos)
  const gana = ganadora(m)

  const renombrar = async (n: NodoMapa, texto: string) => {
    setEditando(null)
    const tx = texto.trim()
    if (tx && tx !== n.texto && n.id != null) await nodosMapaRepo.update(n.id, { texto: tx })
  }

  /** El peso del criterio también da la vuelta: 5 → 1. */
  const ciclarPeso = async (c: NodoMapa) => {
    if (c.id != null) await nodosMapaRepo.update(c.id, { peso: ((c.peso ?? 1) % MAX_PUNTAJE) + 1 })
  }

  const Nombre = ({ n, ancho }: { n: NodoMapa; ancho: string }) =>
    editando === n.nodoId ? (
      <input
        autoFocus
        defaultValue={n.texto}
        onBlur={(e) => void renombrar(n, e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          if (e.key === 'Escape') setEditando(null)
        }}
        className={`${ancho} rounded border border-white/20 bg-transparent px-1 py-0.5 text-xs outline-none`}
      />
    ) : (
      <button
        type="button"
        onClick={() => setEditando(n.nodoId)}
        className={`${ancho} truncate text-left text-xs font-semibold`}
        title={n.texto}
      >
        {n.texto}
      </button>
    )

  const BotonBorrar = ({ n }: { n: NodoMapa }) =>
    borrando === n.nodoId ? (
      <button
        type="button"
        onClick={async () => {
          setBorrando(null)
          await borrarDeMatriz(nodos, n)
        }}
        // En una tabla el «¿Borrar?» a medias es peligroso: si te vas, se cancela.
        onBlur={() => setBorrando(null)}
        className="text-[10px] font-bold text-red-300"
      >
        {t('ideas.mapas.confirmarBorrar', '¿Borrar?')}
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setBorrando(n.nodoId)}
        className="text-white/25 transition hover:text-red-400"
        title={t('ideas.borrar', 'Borrar')}
        aria-label={t('ideas.borrar', 'Borrar')}
      >
        <Icono nombre="basura" />
      </button>
    )

  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-auto" data-tut="ideas.matriz">
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-1 text-center">
          <thead>
            <tr>
              <th className="w-32 min-w-32 text-left text-[11px] font-semibold text-white/40">
                {t('ideas.matriz.criterio', 'Criterio')}
              </th>
              <th className="w-10 text-[11px] font-semibold text-white/40" title={t('ideas.matriz.pesoAyuda', 'Cuánto te importa ese criterio (1-5)')}>
                {t('ideas.matriz.peso', 'Peso')}
              </th>
              {m.opciones.map((o, i) => (
                <th key={o.nodoId} className="w-20 min-w-20">
                  <div className="flex flex-col items-center gap-0.5">
                    <Nombre n={o} ancho="w-full" />
                    <span className="flex items-center gap-1 text-[10px]">
                      {i === gana && (
                        <span className="texto-vivo" style={vivo(COLOR)}>
                          <Icono nombre="trofeo" />
                        </span>
                      )}
                      <BotonBorrar n={o} />
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {m.criterios.map((c) => (
              <tr key={c.nodoId}>
                <td className="text-left">
                  <div className="flex items-center gap-1">
                    <Nombre n={c} ancho="min-w-0 flex-1" />
                    <BotonBorrar n={c} />
                  </div>
                </td>
                <td>
                  <button
                    type="button"
                    onClick={() => void ciclarPeso(c)}
                    className="w-9 rounded-lg py-1.5 text-xs font-bold text-black"
                    style={{ background: c.color ?? COLOR }}
                    title={t('ideas.matriz.pesoAyuda', 'Cuánto te importa ese criterio (1-5)')}
                  >
                    {c.peso ?? 1}
                  </button>
                </td>
                {m.opciones.map((o) => {
                  const p = puntaje(m, c, o)
                  const tocada = celdaDe(m, c, o) != null
                  return (
                    <td key={o.nodoId}>
                      <button
                        type="button"
                        onClick={() => void ciclarPuntaje(m, mapa.id!, c, o)}
                        className={`w-full rounded-lg py-2 text-sm font-bold ${tocada ? 'text-black' : 'text-white/50'}`}
                        style={{
                          background: tocada ? COLORES_PUNTAJE[p - 1] : 'rgba(255,255,255,0.06)',
                        }}
                        title={t('ideas.matriz.puntajeAyuda', 'Qué tan bien cumple (toca para subir)')}
                      >
                        {p}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}

            {m.criterios.length > 0 && m.opciones.length > 0 && (
              <tr>
                <td className="text-left text-xs font-bold" colSpan={2}>
                  {t('ideas.matriz.total', 'Total')}
                </td>
                {m.opciones.map((o, i) => (
                  <td key={o.nodoId}>
                    <div
                      className={`rounded-lg py-1.5 text-base font-bold ${i === gana ? 'text-black' : 'text-white/70'}`}
                      style={{ background: i === gana ? COLOR : 'rgba(255,255,255,0.06)' }}
                    >
                      {totalOpcion(m, o)}
                    </div>
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() =>
            void agregarCriterio(mapa.id!, t('ideas.matriz.nuevoCriterio', 'Nuevo criterio'), m.criterios.length)
          }
          className="flex-1 rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/5"
        >
          <Icono nombre="agregar" /> {t('ideas.matriz.criterio', 'Criterio')}
        </button>
        <button
          type="button"
          onClick={() => void agregarOpcion(mapa.id!, t('ideas.matriz.nuevaOpcion', 'Opción'), m.opciones.length)}
          className="flex-1 rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/5"
        >
          <Icono nombre="agregar" /> {t('ideas.matriz.opcion', 'Opción')}
        </button>
      </div>

      <p className="text-center text-[11px] leading-relaxed text-white/35">
        {t(
          'ideas.matriz.ayuda',
          'Toca un nombre para cambiarlo, el peso para subir lo que te importa ese criterio y cada casilla para puntuar del 1 al 5. El total ya viene multiplicado por los pesos.',
        )}
      </p>
    </div>
  )
}
