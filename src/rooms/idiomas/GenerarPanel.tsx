import { useState } from 'react'
import type { PerfilIdioma } from '../../core/data/db'
import { VACIO, tarjetasIdiomaRepo, temasIdiomaRepo } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { COLOR } from './constantes'
import { TEMARIO, getTema, type AreaTemario } from './temario'
import { OpcionesTemas } from './OpcionesTemas'
import { generarTarjetasTema, type TarjetaPropuesta } from './tutor'
import { hoyISO } from './stats'
import { Creditos } from '../../core/ui/Creditos'
import { OP_GENERAR_TARJETAS } from './costosIA'

interface Propuesta extends TarjetaPropuesta {
  sel: boolean
}

/**
 * Panel ✨: la IA genera tarjetas de un tema/nivel y el usuario elige cuáles
 * guardar. Con `temaFijo` (✨ de un tema del temario) el tema no se elige aquí.
 */
export function GenerarPanel({ perfil, temaFijo, onCerrar }: {
  perfil: PerfilIdioma
  temaFijo?: { id: string; titulo: string; nivel: string; area?: AreaTemario } | null
  onCerrar: () => void
}) {
  const t = useT()
  const nodos = (temasIdiomaRepo.useAll() ?? VACIO).filter((n) => n.idiomaId === perfil.id)
  const [temaId, setTemaId] = useState(temaFijo?.id ?? TEMARIO[0].temas[0].id)
  const [cantidad, setCantidad] = useState(10)
  const [cargando, setCargando] = useState(false)
  const [propuestas, setPropuestas] = useState<Propuesta[] | null>(null)
  const [fallo, setFallo] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const temaActual =
    temaFijo ??
    (() => {
      const est = getTema(temaId)
      if (est) return { id: est.id, titulo: est.titulo, nivel: est.nivel, area: est.area }
      const din = nodos.find((n) => n.temaId === temaId)
      return din ? { id: din.temaId, titulo: din.titulo, nivel: din.nivel } : null
    })()

  const generar = async () => {
    if (!temaActual || cargando) return
    setCargando(true)
    setFallo(false)
    const existentes = (await tarjetasIdiomaRepo.list())
      .filter((x) => x.idiomaId === perfil.id)
      .map((x) => x.termino)
    const r = await generarTarjetasTema(perfil, temaActual, cantidad, existentes)
    setPropuestas(r.length ? r.map((x) => ({ ...x, sel: true })) : null)
    setFallo(!r.length)
    setCargando(false)
  }

  const guardar = async () => {
    const elegidas = (propuestas ?? []).filter((p) => p.sel)
    const idiomaId = perfil.id
    if (!elegidas.length || guardando || idiomaId == null || !temaActual) return
    setGuardando(true)
    const ahora = new Date().toISOString()
    const hoy = hoyISO()
    await tarjetasIdiomaRepo.bulkAdd(
      elegidas.map((p) => ({
        termino: p.termino,
        traduccion: p.traduccion,
        ejemplo: p.ejemplo,
        tipo: p.tipo,
        nivel: p.nivel,
        idiomaId,
        temaId: temaActual.id,
        caja: 0,
        proximaISO: hoy,
        fuente: 'ia' as const,
        creadoEn: ahora,
      })),
    )
    onCerrar()
  }

  const nSel = (propuestas ?? []).filter((p) => p.sel).length

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onCerrar}>
      <div
        className="ui-panel max-h-[85vh] w-full max-w-md space-y-3 overflow-y-auto rounded-2xl border border-white/10 p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">
            <Icono nombre="brillo" /> {t('idiomas.gen.titulo', 'Generar vocabulario')}
          </p>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded px-2 py-1 text-sm text-white/40 transition hover:bg-white/10 hover:text-white/80"
          >
            ✕
          </button>
        </div>

        {propuestas === null && (
          <>
            {temaFijo ? (
              <p className="text-xs leading-relaxed text-white/45">
                {t('idiomas.gen.temaFijo', 'Tarjetas de «{tema}» (nivel {nivel}) en {idioma}.', {
                  tema: temaFijo.titulo,
                  nivel: temaFijo.nivel,
                  idioma: perfil.nombre,
                })}
              </p>
            ) : (
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wide text-white/40">
                  {t('idiomas.gen.tema', 'Tema')}
                </p>
                <select
                  value={temaId}
                  onChange={(e) => setTemaId(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-sm outline-none focus:border-white/30"
                >
                  <OpcionesTemas nodos={nodos} />
                </select>
              </div>
            )}

            <div className="flex items-center gap-2">
              <p className="text-[10px] uppercase tracking-wide text-white/40">
                {t('idiomas.gen.cantidad', 'Cantidad')}
              </p>
              {[5, 10, 15].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCantidad(n)}
                  className={`rounded-full px-3 py-1 text-xs transition ${
                    cantidad === n ? 'font-semibold text-black' : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                  style={cantidad === n ? { background: COLOR } : undefined}
                >
                  {n}
                </button>
              ))}
            </div>

            {fallo && (
              <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200/90">
                {t('idiomas.gen.fallo', 'La IA no pudo generar tarjetas. Reintenta o crea alguna a mano.')}
              </p>
            )}

            <button
              type="button"
              onClick={() => void generar()}
              disabled={cargando || !temaActual}
              className="w-full rounded-xl py-2.5 text-sm font-semibold text-black transition disabled:opacity-40"
              style={{ background: COLOR }}
            >
              {cargando ? (
                <span className="animate-pulse">
                  <Icono nombre="reloj-arena" /> {t('idiomas.gen.cargando', 'Generando…')}
                </span>
              ) : (
                <>
                  <Icono nombre="brillo" /> {t('idiomas.gen.generar', 'Generar')}
                  <Creditos op={OP_GENERAR_TARJETAS} />
                </>
              )}
            </button>
          </>
        )}

        {propuestas !== null && (
          <>
            <p className="text-xs leading-relaxed text-white/45">
              {t('idiomas.gen.revisar', 'Desmarca las que no quieras guardar:')}
            </p>
            {propuestas.map((p, i) => (
              <label key={i} className="flex items-start gap-2 rounded-lg bg-black/20 px-2.5 py-2">
                <input
                  type="checkbox"
                  checked={p.sel}
                  onChange={() =>
                    setPropuestas((prev) => (prev ?? []).map((x, j) => (j === i ? { ...x, sel: !x.sel } : x)))
                  }
                  className="mt-1 shrink-0"
                  style={{ accentColor: COLOR }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-white/90">
                    {p.termino} <span className="text-white/40">— {p.traduccion}</span>
                  </span>
                  {p.ejemplo && <span className="block text-[10px] leading-snug text-white/40">{p.ejemplo}</span>}
                </span>
                <span className="shrink-0 text-[9px] uppercase text-white/30">{p.nivel}</span>
              </label>
            ))}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPropuestas(null)}
                className="rounded-xl bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
              >
                {t('idiomas.gen.otraVez', 'Volver')}
              </button>
              <button
                type="button"
                onClick={() => void guardar()}
                disabled={nSel === 0 || guardando}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
                style={{ background: COLOR }}
              >
                {t('idiomas.gen.guardar', 'Guardar {n} tarjetas', { n: String(nSel) })}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
