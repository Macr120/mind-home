import { useMemo } from 'react'
import type { Viaje } from '../../core/data/db'
import { COLOR, getTipo } from './constantes'
import { dinero, formatearRango, hoyISO } from './fecha'
import { useT } from '../../core/i18n/useT'

export function ResumenTab({
  viajes,
  gastosPorViaje,
  onAbrir,
}: {
  viajes: Viaje[]
  gastosPorViaje: Map<number, number>
  onAbrir: (id: number) => void
}) {
  const t = useT()
  const hoy = hoyISO()

  const proximos = useMemo(
    () =>
      viajes
        .filter(
          (v) =>
            v.estado !== 'completado' &&
            v.estado !== 'wishlist' &&
            v.fechaFin >= hoy,
        )
        .sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio)),
    [viajes, hoy],
  )

  const wishlist = viajes.filter((v) => v.estado === 'wishlist')
  const completados = viajes.filter((v) => v.estado === 'completado')
  const paises = useMemo(
    () => new Set(completados.map((v) => v.pais)).size,
    [completados],
  )

  const presupuestoProx = proximos.reduce((s, v) => s + v.presupuesto, 0)
  const gastoTotal = [...gastosPorViaje.values()].reduce((s, n) => s + n, 0)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div
          className="rounded-xl border border-white/10 p-4 col-span-2"
          style={{ background: `${COLOR}18` }}
        >
          <p className="text-xs text-white/50">{t('sala.r.paises', 'Países visitados')}</p>
          <p className="text-3xl font-black" style={{ color: COLOR }}>
            {paises}
          </p>
        </div>
        <Mini label={t('sala.r.proximos', 'Próximos')} valor={String(proximos.length)} />
        <Mini label={t('sala.r.wishlist', 'Lista de deseos')} valor={String(wishlist.length)} />
        <Mini label={t('sala.r.completados', 'Completados')} valor={String(completados.length)} />
        <Mini label={t('sala.r.gasto', 'Gasto registrado')} valor={dinero(gastoTotal)} />
      </div>

      {proximos.length > 0 && (
        <section className="rounded-xl bg-white/5 p-4 border border-white/10">
          <p className="text-sm font-semibold mb-3">{t('sala.r.secProx', '🛫 Próximos viajes')}</p>
          <ul className="space-y-2">
            {proximos.slice(0, 4).map((v) => (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => v.id && onAbrir(v.id)}
                  className="w-full text-left rounded-lg bg-black/25 px-3 py-2 hover:bg-black/40"
                >
                  <span className="font-medium text-white/90">{v.titulo}</span>
                  <p className="text-xs text-white/45">
                    {v.destino} · {formatearRango(v.fechaInicio, v.fechaFin)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
          {presupuestoProx > 0 && (
            <p className="text-xs text-white/40 mt-2">
              {t('sala.r.presupuesto', `Presupuesto planeado: ${dinero(presupuestoProx)}`, { n: dinero(presupuestoProx) })}
            </p>
          )}
        </section>
      )}

      {wishlist.length > 0 && (
        <section className="rounded-xl bg-white/5 p-4 border border-white/10">
          <p className="text-sm font-semibold mb-2">{t('sala.r.secWish', '✨ Lista de deseos')}</p>
          <ul className="space-y-1.5">
            {wishlist.map((v) => (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => v.id && onAbrir(v.id)}
                  className="text-sm text-teal-300 hover:underline"
                >
                  {getTipo(v.tipoViaje).icon} {v.titulo} — {v.destino}, {v.pais}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {completados.length > 0 && (
        <section className="rounded-xl bg-white/5 p-4 border border-white/10">
          <p className="text-sm font-semibold mb-2">{t('sala.r.secRec', '✅ Viajes recientes')}</p>
          <ul className="space-y-2">
            {completados.slice(0, 3).map((v) => (
              <li key={v.id} className="text-sm">
                <button
                  type="button"
                  onClick={() => v.id && onAbrir(v.id)}
                  className="text-left hover:text-teal-300"
                >
                  <span className="font-medium">{v.titulo}</span>
                  <span className="text-white/40 ml-1">
                    {v.calificacion > 0 ? `${v.calificacion}★` : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {viajes.length === 0 && (
        <p className="text-center text-sm text-white/40 py-8">
          {t('sala.r.vacio', 'Registra tu primer viaje en la pestaña Viajes.')}
        </p>
      )}
    </div>
  )
}

function Mini({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-xl bg-white/5 p-3 border border-white/10">
      <p className="text-xs text-white/50">{label}</p>
      <p className="text-lg font-bold text-white/90">{valor}</p>
    </div>
  )
}
