import { useMemo } from 'react'
import { conversacionesBiblioRepo, entradasBiblioRepo, sesionesEstudioRepo, temasArbolRepo } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { vivo } from '../../core/ui/estilos'
import { Icono } from '../../core/ui/iconos/Icono'
import { COLOR, PILAR_GENERAL } from './constantes'
import { PILARES, contarIndice } from './pilares'
import { hoyISO } from './fecha'
import { HeatmapEstudio } from './HeatmapEstudio'
import { fmtMin, inicioSemana, minutosPorDia, rachaActual } from './stats'

/** Panorama de la enciclopedia (cobertura por campo) y del tiempo de estudio. */
export function ResumenTab() {
  const t = useT()
  const entradas = entradasBiblioRepo.useAll() ?? []
  const sesiones = sesionesEstudioRepo.useAll() ?? []
  const charlas = conversacionesBiblioRepo.useAll() ?? []
  const nodos = temasArbolRepo.useAll() ?? []
  const indice = contarIndice()

  const { porPilar, camposConEntrada, temasCubiertos } = useMemo(() => {
    const conteo = new Map<string, number>()
    for (const e of entradas) conteo.set(e.pilarId, (conteo.get(e.pilarId) ?? 0) + 1)
    const porPilar = [...PILARES, PILAR_GENERAL]
      .map((p) => ({ id: p.id, titulo: p.titulo, icon: p.icon, entradas: conteo.get(p.id) ?? 0 }))
      .filter((p) => p.entradas > 0)
      .sort((a, b) => b.entradas - a.entradas)
    return {
      porPilar,
      camposConEntrada: PILARES.filter((p) => (conteo.get(p.id) ?? 0) > 0).length,
      temasCubiertos: new Set(entradas.map((e) => e.temaId).filter(Boolean)).size,
    }
  }, [entradas])

  const { minPorDia, totalMin, semanaMin, racha } = useMemo(() => {
    const minPorDia = minutosPorDia(sesiones)
    let totalMin = 0
    for (const min of minPorDia.values()) totalMin += min
    const lunes = inicioSemana(hoyISO())
    const semanaMin = sesiones.filter((s) => s.fecha >= lunes).reduce((acc, s) => acc + s.minutos, 0)
    return { minPorDia, totalMin, semanaMin, racha: rachaActual(new Set(sesiones.map((s) => s.fecha))) }
  }, [sesiones])

  const maxEntradas = Math.max(1, ...porPilar.map((p) => p.entradas))

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 p-4" style={{ background: `${COLOR}18` }}>
        <p className="text-xs text-white/50">{t('biblioteca.r.titulo', 'Tu enciclopedia personal')}</p>
        <p className="text-3xl font-black texto-vivo" style={vivo(COLOR)}>
          {t('biblioteca.r.entradas', '{n} entradas', { n: String(entradas.length) })}
        </p>
        <p className="mt-1 text-sm text-white/55">
          {t('biblioteca.r.cobertura', '{c}/{total} campos con entradas · {t}/{temas} temas del índice', {
            c: String(camposConEntrada),
            total: String(PILARES.length),
            t: String(temasCubiertos),
            // El denominador crece con el árbol: temas semilla + desbloqueados.
            temas: String(indice.temas + nodos.length),
          })}
        </p>
        {nodos.length > 0 && (
          <p className="mt-1 text-xs text-white/45">
            <Icono nombre="brillo" /> {t('biblioteca.r.arbol', '{n} temas desbloqueados por tus charlas', { n: String(nodos.length) })}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MiniStat label={t('biblioteca.r.charlas', 'Charlas con el Sabio')} valor={String(charlas.length)} />
        <MiniStat label={t('biblioteca.r.estudioTotal', 'Estudio total')} valor={fmtMin(totalMin)} />
        <MiniStat label={t('biblioteca.r.semana', 'Esta semana')} valor={fmtMin(semanaMin)} />
        <MiniStat
          label={t('biblioteca.r.racha', 'Racha de estudio')}
          valor={t('biblioteca.r.rachaDias', '{n} días', { n: String(racha) })}
        />
      </div>

      {porPilar.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
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

      <HeatmapEstudio minPorDia={minPorDia} color={COLOR} />

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
