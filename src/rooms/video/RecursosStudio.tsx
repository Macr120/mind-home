import { useEffect, useState, type ReactNode } from 'react'
import { useT } from '../../core/i18n/useT'
import { APPS_STUDIO, proveedorRecursos, type AppStudio, type RecursoStudio } from '../../core/recursosStudio'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import { VistaBlob } from '../_shared/ImagenIA'
import { TARJETA } from '../_shared/ui'
import type { PropsArrastreItem } from './useArrastreMedio'

const ICONO_APP: Record<AppStudio, NombreIcono> = { audio: 'musica', arte: 'pincel', escritura: 'libro' }
const ICONO_TIPO: Record<RecursoStudio['tipo'], NombreIcono> = { audio: 'musica', imagen: 'imagen', texto: 'letra' }

/**
 * La pestaña «Studio» del panel de medios: lo que las otras apps del Studio
 * prestan (canciones, grabaciones y música; dibujos; textos), en tres secciones
 * plegables. Tocar trae el recurso al video y lo añade en el cursor; arrastrar
 * lo suelta en una pista. Las listas se piden al abrir cada sección.
 */
export function RecursosStudio({
  onElegir,
  propsArrastre,
  tipos,
}: {
  onElegir: (app: AppStudio, recurso: RecursoStudio) => void
  /** Gesto de arrastre a la timeline (panel lateral); en un selector modal no hay. */
  propsArrastre?: (app: AppStudio, recurso: RecursoStudio) => PropsArrastreItem
  /** Solo estos tipos (imágenes para un fondo o un PIP, audio para música y sonidos); ausente = todo. */
  tipos?: RecursoStudio['tipo'][]
}) {
  const t = useT()
  const nombreApp: Record<AppStudio, string> = {
    audio: t('video.studio.audio', 'Audio'),
    arte: t('video.studio.arte', 'Arte'),
    escritura: t('video.studio.escritura', 'Escritura'),
  }
  return (
    <div className="space-y-2">
      {APPS_STUDIO.filter((app) => proveedorRecursos(app)).map((app) => (
        <Seccion key={app} app={app} titulo={nombreApp[app]} tipos={tipos} onElegir={onElegir} propsArrastre={propsArrastre} />
      ))}
    </div>
  )
}

function Seccion({
  app,
  titulo,
  tipos,
  onElegir,
  propsArrastre,
}: {
  app: AppStudio
  titulo: string
  tipos?: RecursoStudio['tipo'][]
  onElegir: (app: AppStudio, recurso: RecursoStudio) => void
  propsArrastre?: (app: AppStudio, recurso: RecursoStudio) => PropsArrastreItem
}) {
  const t = useT()
  const [abierta, setAbierta] = useState(true)
  const [lista, setLista] = useState<RecursoStudio[] | null>(null)
  useEffect(() => {
    if (!abierta) return
    let vivo = true
    proveedorRecursos(app)
      ?.listar()
      .then((l) => {
        if (vivo) setLista(l)
      })
      .catch(() => {
        if (vivo) setLista([])
      })
    return () => {
      vivo = false
    }
  }, [app, abierta])

  // Con filtro de tipos, una app que no tiene nada de eso no aparece (en cuanto se conoce su lista).
  const visibles = lista && tipos ? lista.filter((r) => tipos.includes(r.tipo)) : lista
  if (tipos && visibles && visibles.length === 0) return null
  let cuerpo: ReactNode = null
  if (abierta) {
    if (visibles == null) cuerpo = <p className="px-1 text-[11px] text-white/40">…</p>
    else if (visibles.length === 0) cuerpo = <p className="px-1 text-[11px] text-white/40">{t('video.studio.vacio', 'Aún no hay nada en esta app')}</p>
    else {
      const rejilla = visibles.every((r) => r.tipo === 'imagen')
      cuerpo = (
        <ul className={`grid gap-1.5 ${rejilla ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {visibles.map((r, i) => {
            const nuevoGrupo = i === 0 || visibles[i - 1].grupo !== r.grupo
            return (
              <Recurso key={r.clave} app={app} recurso={r} grupo={nuevoGrupo ? r.grupo : undefined} rejilla={rejilla} onElegir={onElegir} propsArrastre={propsArrastre} />
            )
          })}
        </ul>
      )
    }
  }
  return (
    <section>
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        aria-expanded={abierta}
        className="flex w-full items-center gap-1.5 rounded-lg px-1 py-1 text-xs font-semibold hover:bg-white/5"
      >
        <Icono nombre={ICONO_APP[app]} />
        <span className="min-w-0 flex-1 truncate text-left">{titulo}</span>
        <Icono nombre={abierta ? 'desplegado' : 'plegado'} />
      </button>
      {cuerpo}
    </section>
  )
}

function Recurso({
  app,
  recurso,
  grupo,
  rejilla,
  onElegir,
  propsArrastre,
}: {
  app: AppStudio
  recurso: RecursoStudio
  /** Cabecera de subgrupo que va justo encima (solo en el primero de cada grupo). */
  grupo?: string
  rejilla: boolean
  onElegir: (app: AppStudio, recurso: RecursoStudio) => void
  propsArrastre?: (app: AppStudio, recurso: RecursoStudio) => PropsArrastreItem
}) {
  const t = useT()
  const etiqueta = t('video.medios.anadirCursor', 'Añadir «{n}» en el cursor', { n: recurso.nombre })
  return (
    <>
      {grupo && <li className="col-span-full pt-1 text-[10px] tracking-wide text-white/40 uppercase">{grupo}</li>}
      <li className={`${TARJETA} ${rejilla ? 'space-y-1 p-1.5' : 'flex items-center gap-2 p-2'} select-none [-webkit-touch-callout:none]`} {...propsArrastre?.(app, recurso)}>
        <button
          type="button"
          onClick={() => onElegir(app, recurso)}
          aria-label={etiqueta}
          title={etiqueta}
          className={`${rejilla ? 'block w-full overflow-hidden rounded-lg bg-black/40 transition hover:brightness-110' : 'grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 text-base hover:bg-white/20'}`}
        >
          {recurso.miniatura ? <VistaBlob blob={recurso.miniatura} className={rejilla ? 'aspect-video w-full' : 'h-8 w-8'} /> : <Icono nombre={ICONO_TIPO[recurso.tipo]} />}
        </button>
        <div className="min-w-0 flex-1 px-0.5">
          <p className="truncate text-xs font-semibold">{recurso.nombre}</p>
          {recurso.detalle && <p className="truncate text-[10px] text-white/40">{recurso.detalle}</p>}
        </div>
      </li>
    </>
  )
}
