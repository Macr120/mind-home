import { useMemo } from 'react'
import type { GraficaHoja, HojaCalculo, TipoGraficaHoja } from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import { confirmar } from '../../core/state/confirmarStore'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import { datosDeGrafica } from './datosGrafica'
import { GraficaVista } from './GraficaVista'
import type { Celdas, ResultadoCelda } from './hoja'

/**
 * Las gráficas de la hoja, debajo de la rejilla.
 *
 * Guardan el RANGO, no los datos: al cambiar una celda la gráfica se redibuja
 * sola porque `resultados` ya viene recalculado de la rejilla. Es también lo que
 * hace que la gráfica del .xlsx exportado quede viva dentro de Excel.
 */

export const TIPOS: { id: TipoGraficaHoja; icono: NombreIcono; es: string }[] = [
  { id: 'barras', icono: 'grafica', es: 'Barras' },
  { id: 'lineas', icono: 'graficaLineas', es: 'Líneas' },
  { id: 'area', icono: 'graficaArea', es: 'Área' },
  { id: 'pastel', icono: 'graficaPastel', es: 'Pastel' },
  { id: 'dispersion', icono: 'graficaDispersion', es: 'Dispersión' },
]

export function PanelGraficas({
  hoja,
  resultados,
  editada,
  onEditar,
  onCambiar,
}: {
  hoja: HojaCalculo
  resultados: Record<string, ResultadoCelda>
  /** Id de la gráfica con el formulario abierto (solo una a la vez). */
  editada: string | null
  onEditar: (id: string | null) => void
  onCambiar: (celdas: Celdas, extra?: Partial<HojaCalculo>) => void
}) {
  const t = useT()
  const graficas = useMemo(() => hoja.graficas ?? [], [hoja.graficas])

  const guardar = (id: string, cambios: Partial<GraficaHoja>) => {
    onCambiar(hoja.celdas, { graficas: graficas.map((g) => (g.id === id ? { ...g, ...cambios } : g)) })
  }

  const borrar = async (g: GraficaHoja) => {
    const ok = await confirmar({
      titulo: t('computo.grafica.borrar', 'Borrar la gráfica'),
      mensaje: t('computo.grafica.borrarMsg', 'Los datos de la hoja se quedan como están.'),
      peligro: true,
    })
    if (!ok) return
    if (editada === g.id) onEditar(null)
    onCambiar(hoja.celdas, { graficas: graficas.filter((x) => x.id !== g.id) })
  }

  if (graficas.length === 0) return null

  return (
    <section className="space-y-2" data-tut="computo.hojas.graficas">
      {graficas.map((g) => {
        const datos = datosDeGrafica(g, hoja.celdas, resultados)
        const abierta = editada === g.id
        return (
          <div key={g.id} className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-2.5">
            <div className="flex items-center gap-1.5">
              <h3 className="min-w-0 flex-1 truncate text-xs font-semibold">
                {g.titulo || t('computo.grafica.sinTitulo', 'Gráfica de {rango}', { rango: g.rango })}
              </h3>
              <button
                type="button"
                onClick={() => onEditar(abierta ? null : g.id)}
                title={t('computo.grafica.ajustes', 'Ajustes de la gráfica')}
                aria-label={t('computo.grafica.ajustes', 'Ajustes de la gráfica')}
                className={`shrink-0 rounded-lg px-2 py-1.5 text-xs transition ${
                  abierta ? 'ui-accent-bg' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icono nombre="editar" />
              </button>
              <button
                type="button"
                onClick={() => void borrar(g)}
                title={t('computo.grafica.borrar', 'Borrar la gráfica')}
                aria-label={t('computo.grafica.borrar', 'Borrar la gráfica')}
                className="shrink-0 rounded-lg bg-white/5 px-2 py-1.5 text-xs text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                <Icono nombre="basura" />
              </button>
            </div>

            {datos ? (
              <GraficaVista datos={datos} />
            ) : (
              <p className="rounded-lg border border-dashed border-rose-400/30 px-3 py-4 text-center text-xs text-rose-300">
                {t('computo.grafica.rangoMalo', 'El rango «{rango}» no es válido.', { rango: g.rango })}
              </p>
            )}

            {abierta && <Ajustes g={g} onGuardar={(c) => guardar(g.id, c)} onCerrar={() => onEditar(null)} />}
          </div>
        )
      })}
    </section>
  )
}

function Ajustes({
  g,
  onGuardar,
  onCerrar,
}: {
  g: GraficaHoja
  onGuardar: (cambios: Partial<GraficaHoja>) => void
  onCerrar: () => void
}) {
  const t = useT()
  return (
    <div className="space-y-2 border-t border-white/10 pt-2">
      <div className="flex flex-wrap gap-1">
        {TIPOS.map((x) => (
          <button
            key={x.id}
            type="button"
            onClick={() => onGuardar({ tipo: x.id })}
            className={`rounded-lg px-2 py-1.5 text-[11px] font-semibold transition ${
              g.tipo === x.id ? 'ui-accent-bg' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Icono nombre={x.icono} /> {t(`computo.grafica.tipo.${x.id}`, x.es)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={g.titulo}
          onChange={(e) => onGuardar({ titulo: e.target.value })}
          placeholder={t('computo.grafica.tituloPlaceholder', 'Título de la gráfica')}
          className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-2.5 py-1.5 text-xs outline-none focus:border-accent"
        />
        <input
          value={g.rango}
          onChange={(e) => onGuardar({ rango: e.target.value.toUpperCase() })}
          spellCheck={false}
          title={t('computo.grafica.rango', 'Rango de datos')}
          aria-label={t('computo.grafica.rango', 'Rango de datos')}
          className="w-28 shrink-0 rounded-lg border border-white/15 bg-black/30 px-2.5 py-1.5 font-mono text-xs outline-none focus:border-accent"
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-white/60">
        <label className="inline-flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={!!g.encabezadoFila}
            onChange={(e) => onGuardar({ encabezadoFila: e.target.checked })}
            className="accent-accent"
          />
          {t('computo.grafica.encFila', 'La primera fila son los nombres')}
        </label>
        <label className="inline-flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={!!g.encabezadoCol}
            onChange={(e) => onGuardar({ encabezadoCol: e.target.checked })}
            disabled={g.tipo === 'dispersion'}
            className="accent-accent disabled:opacity-40"
          />
          {g.tipo === 'dispersion'
            ? t('computo.grafica.encColX', 'La primera columna son las X')
            : t('computo.grafica.encCol', 'La primera columna son las etiquetas')}
        </label>
        <span className="flex-1" />
        <button
          type="button"
          onClick={onCerrar}
          className="rounded-lg bg-white/5 px-2.5 py-1 transition hover:bg-white/10"
        >
          {t('computo.grafica.listo', 'Listo')}
        </button>
      </div>
    </div>
  )
}
