import { useEffect, useState } from 'react'
import { VistaBlob } from '../../../rooms/_shared/ImagenIA'
import { useT } from '../../i18n/useT'
import { getPlantilla } from '../../registry'
import { useMascota } from '../../state/mascotaStore'
import { Icono } from '../../ui/iconos/Icono'
import { mensajeErrorBuzon } from '../api'
import { proveedoresCompartibles, type ItemCompartible, type Paquete, type TipoCompartible } from '../compartibles'

interface Grupo {
  tipo: TipoCompartible
  items: ItemCompartible[]
}

/**
 * «Contenido de un cuarto» del menú «+»: pestañas por app que se registró como
 * compartible y, dentro, sus recetas, rutinas, mapas… Al elegir uno se
 * empaqueta y queda como adjunto de la barra, listo para enviar.
 */
export function SelectorCompartible({ onElegir, onCerrar }: { onElegir: (p: Paquete) => void; onCerrar: () => void }) {
  const t = useT()
  const hablar = useMascota((s) => s.decir)
  const proveedores = proveedoresCompartibles().filter((p) => p.tipos.length > 0)
  const [app, setApp] = useState<string | null>(proveedores[0]?.app ?? null)
  const [ocupado, setOcupado] = useState(false)
  const prov = proveedores.find((p) => p.app === app)

  const elegir = async (tipo: TipoCompartible, clave: string) => {
    setOcupado(true)
    try {
      const p = await tipo.empaquetar(clave)
      if (p) onElegir(p)
    } catch (e) {
      hablar(mensajeErrorBuzon(e, t), { persistir: false })
    } finally {
      setOcupado(false)
    }
  }

  const nombreApp = (id: string) => t(`room.${id}.nombre`, getPlantilla(id)?.nombre ?? id).split(' · ')[0]

  return (
    <div className="ui-panel-glass mb-2 max-h-[55vh] overflow-y-auto rounded-2xl border border-white/10 p-2 shadow-xl backdrop-blur-md">
      <div className="mb-2 flex items-center gap-2 border-b border-white/10 px-1 pb-2">
        <span className="text-base text-white/60">
          <Icono nombre="buzon" />
        </span>
        <p className="flex-1 text-[11px] font-semibold text-white/50">{t('buzon.selector.titulo', '¿Qué quieres enviar?')}</p>
        <button
          type="button"
          onClick={onCerrar}
          className="rounded px-2 py-1 text-sm text-white/40 transition hover:bg-white/10 hover:text-white/80"
          title={t('chat.conv.cerrar', 'Cerrar')}
        >
          ✕
        </button>
      </div>

      {proveedores.length === 0 && (
        <p className="px-2 py-3 text-center text-xs text-white/35">{t('buzon.selector.vacio', 'Esta app aún no tiene nada para enviar')}</p>
      )}

      {/* Pestañas por app */}
      <div className="mb-1 flex gap-1 overflow-x-auto px-1">
        {proveedores.map((p) => (
          <button
            key={p.app}
            type="button"
            onClick={() => setApp(p.app)}
            className={`flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition ${
              app === p.app ? 'bg-accent/15 text-accent' : 'text-white/40 hover:bg-white/10 hover:text-white/70'
            }`}
          >
            <Icono emoji={getPlantilla(p.app)?.icon ?? '📦'} /> {nombreApp(p.app)}
          </button>
        ))}
      </div>

      {/* La `key` remonta la lista al cambiar de app: arranca cargando, sin resetear estado en un efecto. */}
      {prov && <GruposDeApp key={prov.app} tipos={prov.tipos} ocupado={ocupado} onElegir={(tipo, clave) => void elegir(tipo, clave)} />}
    </div>
  )
}

function GruposDeApp({
  tipos,
  ocupado,
  onElegir,
}: {
  tipos: TipoCompartible[]
  ocupado: boolean
  onElegir: (tipo: TipoCompartible, clave: string) => void
}) {
  const t = useT()
  const [grupos, setGrupos] = useState<Grupo[] | null>(null)

  useEffect(() => {
    let vivo = true
    void Promise.all(tipos.map(async (tipo) => ({ tipo, items: await tipo.listar().catch(() => []) }))).then((g) => {
      if (vivo) setGrupos(g)
    })
    return () => {
      vivo = false
    }
  }, [tipos])

  if (grupos == null) return <p className="px-2 py-3 text-center text-xs text-white/35">…</p>
  return (
    <>
      {grupos.map((g) => (
        <div key={g.tipo.tipo} className="mb-1">
          <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/35">
            <Icono nombre={g.tipo.icono} /> {g.tipo.etiqueta(t)}
          </p>
          {g.items.length === 0 && <p className="px-2 pb-1 text-xs text-white/30">{t('buzon.selector.vacio', 'Esta app aún no tiene nada para enviar')}</p>}
          {g.items.map((it) => (
            <button
              key={it.clave}
              type="button"
              disabled={ocupado}
              onClick={() => onElegir(g.tipo, it.clave)}
              className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-start transition hover:bg-white/5 disabled:opacity-50"
            >
              {it.miniatura ? (
                <VistaBlob blob={it.miniatura} className="h-9 w-9 shrink-0 rounded-lg object-cover" />
              ) : (
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/5 text-base text-white/50">
                  <Icono nombre={g.tipo.icono} />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-white/85">{it.nombre}</span>
                {it.detalle && <span className="block truncate text-[10px] text-white/40">{it.detalle}</span>}
              </span>
            </button>
          ))}
        </div>
      ))}
    </>
  )
}
