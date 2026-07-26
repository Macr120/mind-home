import { useDestinoObjeto } from '../state/destinoObjetoStore'
import { useCuartos } from '../state/cuartosStore'
import { useLayout } from '../state/layoutStore'
import { MAPA_ROOM } from '../state/disenoStore'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'

/**
 * Al crear o colocar un objeto: pregunta dónde va, suelto en el mapa o dentro de
 * uno de los cuartos ya construidos (ver `pedirDestinoObjeto`).
 */
export function DestinoObjetoDialog() {
  const t = useT()
  const abierto = useDestinoObjeto((s) => s.resolver != null)
  const elegir = useDestinoObjeto((s) => s.elegir)
  const cuartos = useCuartos((s) => s.cuartos)
  const placed = useLayout((s) => s.placed)

  if (!abierto) return null
  const disponibles = cuartos.filter((c) => placed[c.id])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={() => elegir(null)}
    >
      <div
        className="ui-panel ui-pop flex max-h-[80vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-white/10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center gap-2 px-4 py-3">
          <span className="min-w-0 flex-1 text-base font-black text-white/90">
            {t('destinoObj.titulo', '¿Dónde lo pones?')}
          </span>
          <button
            type="button"
            onClick={() => elegir(null)}
            className="shrink-0 rounded-lg bg-white/10 px-2.5 py-1 text-sm font-semibold text-white/80 transition hover:bg-white/20"
          >
            ✕
          </button>
        </header>

        <div className="min-h-0 space-y-2 overflow-y-auto px-4 pb-4">
          <button
            type="button"
            onClick={() => elegir(MAPA_ROOM)}
            className="flex w-full items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-left transition hover:bg-white/10"
          >
            <span className="text-xl"><Icono nombre="mapa" /></span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-white/90">
                {t('destinoObj.mapa', 'En el mapa')}
              </span>
              <span className="block text-[11px] leading-snug text-white/50">
                {t('destinoObj.mapaDesc', 'Suelto en el exterior, fuera de los cuartos.')}
              </span>
            </span>
          </button>

          <div className="flex items-center gap-1.5 pt-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-white/35">
              {t('destinoObj.enCuarto', 'O dentro de un cuarto')}
            </span>
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {disponibles.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => elegir(c.id)}
                title={c.nombre}
                className="flex items-center gap-2 rounded-xl border p-2.5 text-left transition hover:bg-white/8"
                style={{ borderColor: `${c.color}44`, background: `${c.color}10` }}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-base"
                  style={{ background: `${c.color}33` }}
                >
                  <Icono emoji={c.icon} />
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-white/85">
                  {c.nombre.split(' · ')[0]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
