import { useMemo } from 'react'
import { VACIO, conversacionesBiblioRepo, entradasBiblioRepo, sesionesEstudioRepo, temasArbolRepo } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { vivo } from '../../core/ui/estilos'
import { Icono } from '../../core/ui/iconos/Icono'
import { COLOR, PILAR_GENERAL, getPilar } from './constantes'
import { campos, contarIndiceVivo, useIndice } from './semilla'
import { hoyISO } from './fecha'
import { HeatmapEstudio } from './HeatmapEstudio'
import { HistorialSesiones } from './HistorialSesiones'
import { fmtMin, inicioSemana, minutosPorDia, rachaActual, rgba } from './stats'

/** Panorama de la enciclopedia (cobertura por campo) y del tiempo de estudio. */
export function ResumenTab() {
  const t = useT()
  const entradas = entradasBiblioRepo.useAll() ?? VACIO
  const sesiones = sesionesEstudioRepo.useAll() ?? VACIO
  const charlas = conversacionesBiblioRepo.useAll() ?? VACIO
  const nodos = temasArbolRepo.useAll() ?? VACIO
  const ix = useIndice()
  const indice = contarIndiceVivo(ix)

  const { porPilar, camposConEntrada, temasCubiertos } = useMemo(() => {
    const conteo = new Map<string, number>()
    for (const e of entradas) conteo.set(e.pilarId, (conteo.get(e.pilarId) ?? 0) + 1)
    const listaCampos = campos(ix)
    const porPilar = [
      ...listaCampos.map((p) => ({ id: p.id, titulo: p.titulo, icon: p.icono ?? '📚' })),
      { id: PILAR_GENERAL.id, titulo: PILAR_GENERAL.titulo, icon: PILAR_GENERAL.icon },
    ]
      .map((p) => ({ ...p, entradas: conteo.get(p.id) ?? 0 }))
      .filter((p) => p.entradas > 0)
      .sort((a, b) => b.entradas - a.entradas)
    return {
      porPilar,
      camposConEntrada: listaCampos.filter((p) => (conteo.get(p.id) ?? 0) > 0).length,
      temasCubiertos: new Set(entradas.map((e) => e.temaId).filter(Boolean)).size,
    }
  }, [entradas, ix])

  const { minPorDia, totalMin, semanaMin, racha } = useMemo(() => {
    const minPorDia = minutosPorDia(sesiones)
    let totalMin = 0
    for (const min of minPorDia.values()) totalMin += min
    const lunes = inicioSemana(hoyISO())
    const semanaMin = sesiones.filter((s) => s.fecha >= lunes).reduce((acc, s) => acc + s.minutos, 0)
    return { minPorDia, totalMin, semanaMin, racha: rachaActual(new Set(sesiones.map((s) => s.fecha))) }
  }, [sesiones])

  // Minutos acumulados por campo, del que más te llevó al que menos.
  const minPorPilar = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of sesiones) m.set(s.pilarId, (m.get(s.pilarId) ?? 0) + s.minutos)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [sesiones])

  const maxEntradas = Math.max(1, ...porPilar.map((p) => p.entradas))
  const maxMin = Math.max(1, ...minPorPilar.map(([, min]) => min))

  return (
    <div className="space-y-4">
      <div data-tut="biblioteca.r.cabecera" className="rounded-xl border border-white/10 p-4" style={{ background: `color-mix(in srgb, ${COLOR} 9%, transparent)` }}>
        <p className="text-xs text-white/50">{t('biblioteca.r.titulo', 'Tu enciclopedia personal')}</p>
        <p className="text-3xl font-black texto-vivo" style={vivo(COLOR)}>
          {t('biblioteca.r.entradas', '{n} entradas', { n: String(entradas.length) })}
        </p>
        <p className="mt-1 text-sm text-white/55">
          {t('biblioteca.r.cobertura', '{c}/{total} campos con entradas · {t}/{temas} temas del índice', {
            c: String(camposConEntrada),
            total: String(indice.campos),
            t: String(temasCubiertos),
            // El denominador es el índice VIVO: ya suma los temas desbloqueados
            // y descuenta los que hayas escondido.
            temas: String(indice.temas),
          })}
        </p>
        {nodos.length > 0 && (
          <p className="mt-1 text-xs text-white/45">
            <Icono nombre="brillo" /> {t('biblioteca.r.arbol', '{n} temas desbloqueados por tus charlas', { n: String(nodos.length) })}
          </p>
        )}
      </div>

      <div data-tut="biblioteca.r.stats" className="grid grid-cols-2 gap-3">
        <MiniStat label={t('biblioteca.r.charlas', 'Charlas con el Sabio')} valor={String(charlas.length)} />
        <MiniStat label={t('biblioteca.r.estudioTotal', 'Estudio total')} valor={fmtMin(totalMin)} />
        <MiniStat label={t('biblioteca.r.semana', 'Esta semana')} valor={fmtMin(semanaMin)} />
        <MiniStat
          label={t('biblioteca.r.racha', 'Racha de estudio')}
          valor={t('biblioteca.r.rachaDias', '{n} días', { n: String(racha) })}
        />
      </div>

      {porPilar.length > 0 && (
        <div data-tut="biblioteca.r.porCampo" className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="mb-3 text-sm font-semibold">{t('biblioteca.r.porCampo', 'Entradas por campo')}</p>
          <div className="space-y-2">
            {porPilar.map((p) => (
              <div key={p.id}>
                <div className="mb-0.5 flex justify-between text-sm">
                  <span>
                    <Icono emoji={p.icon} /> {p.titulo}
                  </span>
                  <span className="text-white/40">{p.entradas}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-black/40">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(p.entradas / maxEntradas) * 100}%`, background: COLOR }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {minPorPilar.length > 0 && (
        <div data-tut="biblioteca.r.tiempoPorCampo" className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-semibold">{t('biblioteca.est.porCampo', 'Tiempo por campo')}</p>
          {minPorPilar.map(([id, min]) => {
            const pilar = getPilar(id)
            return (
              <div key={id}>
                <div className="mb-0.5 flex justify-between text-xs">
                  <span className="text-white/80">
                    <Icono emoji={pilar.icon} /> {pilar.titulo}
                  </span>
                  <span className="text-white/40">{fmtMin(min)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-black/40">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(min / maxMin) * 100}%`, background: rgba(COLOR, 0.9) }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div data-tut="biblioteca.r.heatmap">
        <HeatmapEstudio minPorDia={minPorDia} color={COLOR} />
      </div>

      <HistorialSesiones sesiones={sesiones} entradas={entradas} />

      {entradas.length === 0 && sesiones.length === 0 && (
        <p className="px-4 text-center text-xs leading-relaxed text-white/35">
          {t('biblioteca.r.vacio', 'Tu biblioteca está esperando: charla con el Sabio, destila entradas y estudia con el temporizador para ver crecer estas gráficas.')}
        </p>
      )}
    </div>
  )
}

function MiniStat({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="text-xs text-white/50">{label}</p>
      <p className="text-xl font-bold text-white/90">{valor}</p>
    </div>
  )
}
