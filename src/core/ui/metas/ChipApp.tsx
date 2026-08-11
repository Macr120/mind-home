import { useState } from 'react'
import type { EnlaceApp } from '../../data/db'
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
      style={{ borderColor: `${app.color}66`, background: `${app.color}1f` }}
    >
      <button
        type="button"
        disabled={soloLectura}
        onClick={() => setPerdida(!abrirEnlace(enlace))}
        title={
          perdida
            ? t('cal.enlace.perdida', 'Esa app ya no está en ningún cuarto de tu casa.')
            : soloLectura
              ? t('cal.enlace.dondeSeRegistra', 'Se registra en {app}', { app: app.nombre })
              : t('cal.enlace.abrir', 'Abrir {app}', { app: app.nombre })
        }
        className={`flex items-center gap-1 text-[10px] font-semibold leading-none transition disabled:cursor-default ${
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
          className="text-[9px] leading-none text-white/35 transition hover:text-red-400"
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
export function SelectorApp({ onElegir, onCerrar }: { onElegir: (e: EnlaceApp) => void; onCerrar: () => void }) {
  const t = useT()
  const [app, setApp] = useState<Plantilla | null>(null)
  const apps = appsParaEnlace()

  if (apps.length === 0)
    return (
      <div className="rounded-lg bg-black/30 px-2 py-1.5 text-[10px] leading-relaxed text-white/45">
        {t('cal.enlace.sinApps', 'Pon apps en los objetos de tus cuartos para poder enlazarlas a un paso.')}
      </div>
    )

  return (
    <div data-tut="cal.enlace.selector" className="space-y-1 rounded-lg bg-black/30 p-2">
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-[10px] uppercase tracking-wide text-white/40">
          {app
            ? t('cal.enlace.elegirSeccion', '¿A qué parte de {app}?', { app: app.nombre })
            : t('cal.enlace.elegirApp', '¿Dónde se registra este paso?')}
        </p>
        <button
          type="button"
          onClick={() => (app ? setApp(null) : onCerrar())}
          className="shrink-0 text-[10px] text-white/35 transition hover:text-white/80"
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
                (p.comandos?.length ?? 0) > 0 ? setApp(p) : onElegir({ plantillaId: p.id })
              }
              className="flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold transition hover:brightness-125"
              style={{ borderColor: `${p.color}66`, background: `${p.color}1f` }}
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
              className="rounded-full border border-white/15 px-2 py-1 text-[10px] font-semibold text-white/70 transition hover:border-white/35 hover:text-white"
            >
              {d.etiqueta}
            </button>
          ))}
      </div>
    </div>
  )
}
