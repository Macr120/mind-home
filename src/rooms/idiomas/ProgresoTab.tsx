import type { PerfilIdioma } from '../../core/data/db'
import {
  conversacionesIdiomaRepo,
  repasosIdiomaRepo,
  tarjetasIdiomaRepo,
  temasIdiomaRepo,
} from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { vivo } from '../../core/ui/estilos'
import { Icono } from '../../core/ui/iconos/Icono'
import { COLOR, NIVELES } from './constantes'
import { esDominada } from './srs'
import { getTema } from './temario'
import { hoyISO, inicioSemana, rachaActual, repasosPorDia } from './stats'
import { HeatmapIdiomas } from './HeatmapIdiomas'

/** Panorama del idioma activo: dominio del vocabulario, constancia y cobertura. */
export function ProgresoTab({ perfil }: { perfil: PerfilIdioma }) {
  const t = useT()
  const tarjetas = (tarjetasIdiomaRepo.useAll() ?? []).filter((x) => x.idiomaId === perfil.id)
  const repasos = (repasosIdiomaRepo.useAll() ?? []).filter((x) => x.idiomaId === perfil.id)
  const charlas = (conversacionesIdiomaRepo.useAll() ?? []).filter((x) => x.idiomaId === perfil.id)
  const nodos = (temasIdiomaRepo.useAll() ?? []).filter((n) => n.idiomaId === perfil.id)

  const dominadas = tarjetas.filter((x) => esDominada(x.caja)).length

  const porDia = repasosPorDia(repasos)
  const lunes = inicioSemana(hoyISO())
  const semana = repasos.filter((r) => r.fecha >= lunes).reduce((acc, r) => acc + r.repasos, 0)
  const totalRepasos = repasos.reduce((acc, r) => acc + r.repasos, 0)
  const totalAciertos = repasos.reduce((acc, r) => acc + r.aciertos, 0)
  const racha = rachaActual(new Set(repasos.map((r) => r.fecha)))
  const acierto = totalRepasos > 0 ? Math.round((totalAciertos / totalRepasos) * 100) : null

  const porNivel = NIVELES.map((n) => ({ nivel: n, n: tarjetas.filter((x) => x.nivel === n).length }))
  const maxNivel = Math.max(1, ...porNivel.map((x) => x.n))

  const conteoTemas = new Map<string, number>()
  for (const x of tarjetas) if (x.temaId) conteoTemas.set(x.temaId, (conteoTemas.get(x.temaId) ?? 0) + 1)
  const tituloTema = (id: string) => getTema(id)?.titulo ?? nodos.find((n) => n.temaId === id)?.titulo ?? id
  const topTemas = [...conteoTemas.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([id, n]) => ({ id, titulo: tituloTema(id), n }))
  const maxTema = Math.max(1, ...topTemas.map((x) => x.n))

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 p-4" style={{ background: `${COLOR}18` }}>
        <p className="text-xs text-white/50">
          <Icono emoji={perfil.bandera} /> {t('idiomas.pr.titulo', 'Tu {idioma}', { idioma: perfil.nombre })} · {perfil.nivel}
        </p>
        <p className="text-3xl font-black texto-vivo" style={vivo(COLOR)}>
          {t('idiomas.pr.tarjetas', '{n} tarjetas', { n: String(tarjetas.length) })}
        </p>
        <p className="mt-1 text-sm text-white/55">
          {t('idiomas.pr.dominadas', '{d} dominadas · {p} en camino', {
            d: String(dominadas),
            p: String(tarjetas.length - dominadas),
          })}
        </p>
        {nodos.length > 0 && (
          <p className="mt-1 text-xs text-white/45">
            <Icono nombre="brillo" /> {t('idiomas.pr.desbloqueados', '{n} temas desbloqueados por tus charlas', { n: String(nodos.length) })}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MiniStat
          label={t('idiomas.pr.racha', 'Racha de práctica')}
          valor={t('idiomas.pr.rachaDias', '{n} días', { n: String(racha) })}
        />
        <MiniStat label={t('idiomas.pr.semana', 'Repasos esta semana')} valor={String(semana)} />
        <MiniStat
          label={t('idiomas.pr.acierto', 'Acierto histórico')}
          valor={acierto == null ? '—' : `${acierto}%`}
        />
        <MiniStat label={t('idiomas.pr.charlas', 'Charlas con tu tutor')} valor={String(charlas.length)} />
      </div>

      {tarjetas.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="mb-3 text-sm font-semibold">{t('idiomas.pr.porNivel', 'Vocabulario por nivel')}</p>
          <div className="space-y-2">
            {porNivel
              .filter((x) => x.n > 0)
              .map((x) => (
                <div key={x.nivel}>
                  <div className="mb-0.5 flex justify-between text-sm">
                    <span>{x.nivel}</span>
                    <span className="text-white/40">{x.n}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-black/40">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(x.n / maxNivel) * 100}%`, background: COLOR }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {topTemas.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="mb-3 text-sm font-semibold">{t('idiomas.pr.porTema', 'Temas con más vocabulario')}</p>
          <div className="space-y-2">
            {topTemas.map((x) => (
              <div key={x.id}>
                <div className="mb-0.5 flex justify-between text-sm">
                  <span className="truncate">{x.titulo}</span>
                  <span className="shrink-0 text-white/40">{x.n}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-black/40">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(x.n / maxTema) * 100}%`, background: COLOR }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <HeatmapIdiomas porDia={porDia} color={COLOR} />

      {tarjetas.length === 0 && repasos.length === 0 && (
        <p className="px-4 text-center text-xs leading-relaxed text-white/35">
          {t('idiomas.pr.vacio', 'Tu progreso está esperando: junta vocabulario, repásalo a diario y estas gráficas cobrarán vida.')}
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
