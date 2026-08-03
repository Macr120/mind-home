import type { PerfilNutricion, Receta, RegistroComida, RegistroPeso } from '../../core/data/db'
import { aguaRepo, comidasRepo } from '../../core/data/repository'
import { MOMENTOS } from './constantes'
import { Icono } from '../../core/ui/iconos/Icono'
import { getMomento } from './momentos'
import { Pesaje } from './Pesaje'
import { RegistroComida as FormRegistro } from './RegistroComida'
import { ResumenHoy } from './ResumenHoy'
import { useT } from '../../core/i18n/useT'
import { Archivador } from '../_shared/Archivador'

export function DiarioTab({
  fecha,
  comidas,
  recetas,
  aguaMl,
  pesos,
  perfil,
}: {
  fecha: string
  comidas: RegistroComida[]
  recetas: Receta[]
  aguaMl: number
  pesos: RegistroPeso[]
  perfil: PerfilNutricion
}) {
  const t = useT()
  const aguaObjetivo = perfil.aguaMl

  const delDia = comidas
    .filter((c) => c.fecha === fecha)
    .sort((a, b) => a.momento.localeCompare(b.momento))

  const agregarAgua = async (ml: number) => {
    await aguaRepo.add({ fecha, ml })
  }

  const pctAgua = aguaObjetivo > 0 ? Math.min(100, (aguaMl / aguaObjetivo) * 100) : 0

  return (
    <div className="space-y-5">
      <div data-tut="cocina.diario.resumen">
        <ResumenHoy fecha={fecha} comidas={comidas} aguaMl={aguaMl} perfil={perfil} />
      </div>

      <FormRegistro fecha={fecha} comidas={comidas} recetas={recetas} />

      <div className="rounded-xl bg-white/5 p-4 border border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold"><Icono nombre="humedad" /> {t('cocina.hidratacion', 'Hidratación')}</span>
          <span className="text-sm text-white/60">
            {aguaMl} / {aguaObjetivo} ml
          </span>
        </div>
        <div className="mt-2 h-2 w-full rounded-full bg-black/40 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-400 transition-all"
            style={{ width: `${pctAgua}%` }}
          />
        </div>
        <div className="mt-3 flex gap-2">
          {[250, 500, 750].map((ml) => (
            <button
              key={ml}
              type="button"
              onClick={() => agregarAgua(ml)}
              className="flex-1 rounded-lg bg-emerald-500/20 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/30"
            >
              +{ml} ml
            </button>
          ))}
        </div>
      </div>

      <Pesaje fecha={fecha} pesos={pesos} perfil={perfil} />

      <div className="space-y-3">
        <p className="text-sm font-semibold">{t('cocina.registroDia', 'Registro del día')}</p>
        {delDia.length === 0 && (
          <p className="text-sm text-white/40">{t('cocina.sinComidas', 'Sin comidas registradas.')}</p>
        )}
        {MOMENTOS.map((m) => {
          const items = delDia.filter((c) => c.momento === m.id)
          if (items.length === 0) return null
          const kcal = items.reduce((s, i) => s + i.calorias, 0)
          return (
            <div key={m.id} className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-white/5 text-sm font-semibold">
                <span><Icono emoji={m.icon} /></span>
                <span>{m.label}</span>
                <span className="ml-auto text-amber-400">{kcal} kcal</span>
              </div>
              <ul className="divide-y divide-white/5">
                {items.map((item) => (
                  <li key={item.id} className="flex items-start gap-2 px-3 py-2.5 text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white/90">{item.nombre}</p>
                      <p className="text-xs text-white/40">
                        P {item.proteinas}g · C {item.carbohidratos}g · G {item.grasas}g
                        {item.nota ? ` · ${item.nota}` : ''}
                      </p>
                    </div>
                    <span className="text-white/70 font-semibold">{item.calorias}</span>
                    <button
                      type="button"
                      onClick={() => item.id && comidasRepo.remove(item.id)}
                      className="text-white/30 hover:text-red-400 px-1"
                      aria-label={t('chat.eliminar', 'Eliminar')}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      {/* Todo lo registrado, guardado en carpetas: año › mes › semana. */}
      <div className="space-y-3">
        <p className="text-sm font-semibold">{t('cocina.historial', 'Historial de comidas')}</p>
        <Archivador
          items={comidas}
          fecha={(c) => c.fecha}
          clave={(c) => c.id ?? `${c.fecha}-${c.nombre}`}
          vacio={t('cocina.sinComidas', 'Sin comidas registradas.')}
          resumen={(items) => `${items.reduce((s, c) => s + c.calorias, 0)} kcal`}
        >
          {(c) => (
            <div className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
              <span className="shrink-0"><Icono emoji={getMomento(c.momento).icon} /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-white/90">{c.nombre}</p>
                <p className="text-xs text-white/40">
                  {c.fecha} · P {c.proteinas}g · C {c.carbohidratos}g · G {c.grasas}g
                </p>
              </div>
              <span className="shrink-0 font-semibold text-white/70">{c.calorias}</span>
            </div>
          )}
        </Archivador>
      </div>
    </div>
  )
}
