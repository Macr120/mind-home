import { useEffect, useState } from 'react'
import type { EnlaceApp, EnlaceObjetoApp } from '../../data/db'
import type { NodoEntidadApp } from '../../grafoApps'
import { abrirEnlace, appsParaEnlace, destinosDeApp, textoEnlace } from '../../enlaceApp'
import { useT } from '../../i18n/useT'
import type { Plantilla } from '../../registry'
import { vivo } from '../estilos'
import { Icono } from '../iconos/Icono'

/**
 * El chip de app de un paso: «tomar agua» con la cocina colgando, y un toque abre
 * la cocina donde eso se apunta. Lo llevan los nodos de un plan y las metas, y el
 * enlace es siempre NAVEGACIÓN: el registro lo pide la app con su propia pantalla.
 *
 * Se pinta con el color de su app (`texto-vivo` + `vivo()`, que es lo que aguanta
 * el modo claro) para que en una hoja de veinte pasos se reconozca de un vistazo
 * cuál manda a dónde.
 */
export function ChipApp({
  enlace,
  onQuitar,
  soloLectura,
}: {
  enlace: EnlaceApp
  onQuitar?: () => void
  /** Pinta el chip sin navegar: en la propuesta del generador, abrir la app se
   * llevaría por delante un plan que todavía no está guardado. */
  soloLectura?: boolean
}) {
  const t = useT()
  const [perdida, setPerdida] = useState(false)
  const { app, seccion } = textoEnlace(enlace)
  if (!app) return null

  return (
    <span
      data-tut="cal.enlace.chip"
      className="inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5"
      style={{
        borderColor: `color-mix(in srgb, ${app.color} 40%, transparent)`,
        background: `color-mix(in srgb, ${app.color} 12%, transparent)`,
      }}
    >
      <button
        type="button"
        disabled={soloLectura}
        onClick={() => setPerdida(!abrirEnlace(enlace))}
        title={
          perdida
            ? t('cal.enlace.perdida', 'Esa app ya no está en ningún cuarto de tu MindHaOS.')
            : soloLectura
              ? t('cal.enlace.dondeSeRegistra', 'Se registra en {app}', { app: app.nombre })
              : t('cal.enlace.abrir', 'Abrir {app}', { app: app.nombre })
        }
        className={`ui-presion flex items-center gap-1 text-[10px] font-semibold leading-none transition disabled:cursor-default ${
          perdida ? 'text-amber-300' : 'texto-vivo hover:brightness-125'
        }`}
        style={vivo(app.color)}
      >
        <Icono emoji={app.icon} />
        <span className="max-w-[7rem] truncate">{seccion ?? app.nombre}</span>
      </button>
      {onQuitar && (
        <button
          type="button"
          onClick={onQuitar}
          title={t('cal.enlace.quitar', 'Quitar el chip')}
          className="ui-presion text-[9px] leading-none text-white/35 transition hover:text-red-400"
        >
          <Icono nombre="cerrar" />
        </button>
      )}
    </span>
  )
}

/**
 * Elegir a qué app y a qué parte de ella lleva un paso, en dos pasos dentro de la
 * misma caja (app → sección). Solo se ofrecen las apps que están puestas en un
 * cuarto: enlazar a una que no se puede abrir sería un chip muerto.
 *
 * Inline y no en un diálogo: es el mismo gesto que poner fechas o colgar una
 * sub-meta, y esas ya se hacen bajo la fila.
 */
export function SelectorApp({
  onElegir,
  onCerrar,
  pregunta,
  sinApps,
  conEntradas,
}: {
  onElegir: (e: EnlaceObjetoApp) => void
  onCerrar: () => void
  /** Texto del primer paso (qué app); sin él, el de los pasos de una meta. */
  pregunta?: string
  /** Aviso cuando no hay apps en la casa; sin él, el de los pasos de una meta. */
  sinApps?: string
  /** Ofrece además los registros concretos de la app (sus nodos del grafo). */
  conEntradas?: boolean
}) {
  const t = useT()
  const [app, setApp] = useState<Plantilla | null>(null)
  const apps = appsParaEnlace()

  if (apps.length === 0)
    return (
      <div className="rounded-lg bg-black/30 px-2 py-1.5 text-[10px] leading-relaxed text-white/45">
        {sinApps ?? t('cal.enlace.sinApps', 'Pon apps en los objetos de tus cuartos para poder enlazarlas a un paso.')}
      </div>
    )

  return (
    <div data-tut="cal.enlace.selector" className="space-y-1 rounded-lg bg-black/30 p-2">
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-[10px] uppercase tracking-wide text-white/40">
          {app
            ? t('cal.enlace.elegirSeccion', '¿A qué parte de {app}?', { app: app.nombre })
            : (pregunta ?? t('cal.enlace.elegirApp', '¿Dónde se registra este paso?'))}
        </p>
        <button
          type="button"
          onClick={() => (app ? setApp(null) : onCerrar())}
          className="ui-presion shrink-0 text-[10px] text-white/35 transition hover:text-white/80"
        >
          {app ? `‹ ${t('cal.enlace.otraApp', 'Otra app')}` : <Icono nombre="cerrar" />}
        </button>
      </div>

      <div className="flex flex-wrap gap-1">
        {!app &&
          apps.map((p) => (
            <button
              key={p.id}
              type="button"
              // Con una sola sección (o ninguna) no hay nada que preguntar: la app
              // entera ES el destino y un segundo paso sería un clic de trámite.
              onClick={() =>
                conEntradas || (p.comandos?.length ?? 0) > 0 ? setApp(p) : onElegir({ plantillaId: p.id })
              }
              className="ui-presion flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold transition hover:brightness-125"
              style={{
                borderColor: `color-mix(in srgb, ${p.color} 40%, transparent)`,
                background: `color-mix(in srgb, ${p.color} 12%, transparent)`,
              }}
            >
              <span className="texto-vivo" style={vivo(p.color)}>
                <Icono emoji={p.icon} /> {p.nombre}
              </span>
            </button>
          ))}
        {app &&
          destinosDeApp(app).map((d) => (
            <button
              key={`${d.seccion ?? ''}|${d.dato ?? ''}`}
              type="button"
              onClick={() => onElegir({ plantillaId: app.id, seccion: d.seccion, dato: d.dato })}
              className="ui-presion rounded-full border border-white/15 px-2 py-1 text-[10px] font-semibold text-white/70 transition hover:border-white/35 hover:text-white"
            >
              {d.etiqueta}
            </button>
          ))}
      </div>
      {app && conEntradas && <EntradasDeApp appId={app.id} onElegir={onElegir} />}
    </div>
  )
}

/** Tope de registros listados: más no se leen en una caja así; para eso está el buscador. */
const MAX_ENTRADAS = 40

/**
 * Los registros concretos de una app (recetas, metas, lugares…), sacados de sus
 * nodos del grafo de memoria. El enlace guarda además el `ref` estable del nodo:
 * el `dato` es un id local que en otro dispositivo apuntaría a otra fila.
 */
function EntradasDeApp({ appId, onElegir }: { appId: string; onElegir: (e: EnlaceObjetoApp) => void }) {
  const t = useT()
  const [nodos, setNodos] = useState<NodoEntidadApp[] | null>(null)
  const [busca, setBusca] = useState('')
  useEffect(() => {
    let vivoAun = true
    void import('../../grafoApps').then(async ({ nodosDeApps }) => {
      const todos = await nodosDeApps()
      if (vivoAun) setNodos(todos.filter((n) => n.appId === appId && !n.abrir))
    })
    return () => {
      vivoAun = false
    }
  }, [appId])
  if (!nodos?.length) return null
  const q = busca.trim().toLowerCase()
  const lista = (q ? nodos.filter((n) => n.titulo.toLowerCase().includes(q)) : nodos).slice(0, MAX_ENTRADAS)
  return (
    <div className="space-y-1 pt-1">
      <p className="text-[10px] uppercase tracking-wide text-white/40">{t('enlace.app.registros', 'Tus registros')}</p>
      {nodos.length > 8 && (
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder={t('enlace.app.buscar', 'Buscar…')}
          className="w-full rounded-md bg-black/30 px-2 py-1 text-[11px] text-white/80 outline-none placeholder:text-white/30"
        />
      )}
      <div className="flex max-h-40 flex-wrap gap-1 overflow-y-auto">
        {lista.map((n) => (
          <button
            key={n.ref}
            type="button"
            onClick={() =>
              onElegir({ plantillaId: appId, seccion: n.seccion, dato: n.dato, ref: n.ref, titulo: n.titulo })
            }
            className="ui-presion flex max-w-full items-center gap-1 rounded-full border border-white/15 px-2 py-1 text-[10px] font-semibold text-white/70 transition hover:border-white/35 hover:text-white"
          >
            <Icono emoji={n.emoji} />
            <span className="truncate">{n.titulo}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
