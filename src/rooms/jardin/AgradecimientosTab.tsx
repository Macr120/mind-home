import { useState } from 'react'
import { gratitudDiariaRepo } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { hoyISO, nombreDia } from './fecha'

/** Journaling de agradecimientos: 1–3 cosas de hoy + entradas guardadas por fecha. */
export function AgradecimientosTab() {
  const t = useT()
  const gratitudes = gratitudDiariaRepo.useAll() ?? []
  const hoy = hoyISO()
  const deHoy = gratitudes.find((g) => g.fecha === hoy)

  const [items, setItems] = useState(['', '', ''])
  const [editado, setEditado] = useState(false)
  const [guardado, setGuardado] = useState(false)

  // Precarga la entrada de hoy cuando llega de la base, sin pisar lo que se
  // escribe (ajuste en render, sin efecto).
  const [prevDeHoy, setPrevDeHoy] = useState(deHoy)
  if (deHoy !== prevDeHoy) {
    setPrevDeHoy(deHoy)
    if (!editado && deHoy) setItems([deHoy.item1, deHoy.item2, deHoy.item3])
  }

  const setItem = (i: number, valor: string) => {
    setEditado(true)
    setGuardado(false)
    setItems((arr) => arr.map((x, j) => (j === i ? valor : x)))
  }

  const guardar = async () => {
    const limpios = items.map((s) => s.trim()).filter(Boolean)
    if (!limpios.length) return
    const datos = { fecha: hoy, item1: limpios[0], item2: limpios[1] ?? '', item3: limpios[2] ?? '' }
    if (deHoy?.id) await gratitudDiariaRepo.update(deHoy.id, datos)
    else await gratitudDiariaRepo.add(datos)
    setGuardado(true)
  }

  const placeholders = [
    t('jardin.gra.ph1', 'Algo o alguien de hoy…'),
    t('jardin.gra.ph2', 'Algo pequeño que sueles dar por hecho…'),
    t('jardin.gra.ph3', 'Algo tuyo que aprecias…'),
  ]

  return (
    <div className="space-y-4">
      <section className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2">
        <p className="text-sm font-semibold">
          <Icono nombre="gratitud" /> {t('jardin.gra.hoy', 'Hoy agradezco…')}
        </p>
        <p className="text-xs text-white/45">{t('jardin.gra.desc', 'Con una basta. Tres, mejor.')}</p>
        {items.map((valor, i) => (
          <input
            key={i}
            value={valor}
            onChange={(e) => setItem(i, e.target.value)}
            placeholder={placeholders[i]}
            className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10"
          />
        ))}
        <button
          type="button"
          onClick={() => void guardar()}
          className="w-full rounded-lg py-2 text-sm font-bold bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/35"
        >
          {guardado ? <><Icono nombre="flor" /> {t('jardin.gra.guardado', 'Guardado')}</> : t('jardin.gra.guardar', 'Guardar agradecimientos')}
        </button>
      </section>

      <section className="space-y-2" data-tut="jardin.gratitud.historial">
        <p className="text-sm font-semibold">{t('jardin.gra.historial', 'Entradas anteriores')}</p>
        {gratitudes.length === 0 && (
          <p className="text-xs text-white/40">
            {t('jardin.gra.vacio', 'Tus agradecimientos guardados aparecerán aquí.')}
          </p>
        )}
        {gratitudes.map((g) => (
          <div key={g.id} className="rounded-xl bg-white/5 border border-white/10 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/50 capitalize">
                {g.fecha === hoy ? t('jardin.gra.hoyTag', 'Hoy') : nombreDia(g.fecha)}
              </p>
              <button
                type="button"
                onClick={() => g.id && void gratitudDiariaRepo.remove(g.id)}
                className="text-xs text-white/25 hover:text-white/70 transition"
              >
                <Icono nombre="basura" />
              </button>
            </div>
            <ul className="mt-1 space-y-0.5">
              {[g.item1, g.item2, g.item3].filter(Boolean).map((item, i) => (
                <li key={i} className="text-sm text-white/80">
                  <Icono nombre="flor" /> {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  )
}
