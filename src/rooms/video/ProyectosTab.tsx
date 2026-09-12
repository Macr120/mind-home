import { useState } from 'react'
import type { ClipVideo, MedioVideo, ProyectoVideo } from '../../core/data/db'
import { mediosVideoRepo, proyectosVideoRepo, VACIO } from '../../core/data/repository'
import { localeActual, tGlobal, useT } from '../../core/i18n/useT'
import { pedirTexto } from '../../core/state/confirmarStore'
import { Icono } from '../../core/ui/iconos/Icono'
import { BarraEjemplo } from '../_shared/ejemplos/BarraEjemplo'
import { BotonBorrar, BotonPrimario, Vacio } from '../_shared/ui'
import { COLOR } from './constantes'
import { ejemploVideo } from './ejemplos'
import { clipsDe, duracionTotal, migrarProyecto } from './modelo'
import { InsigniasPublicacion } from './publicar/InsigniasPublicacion'
import { useMiniaturas } from './useMiniaturas'

/** Pide el nombre y estrena un proyecto (video o animación 3D); devuelve su id, o null si se canceló. */
export async function crearProyecto(escenario: 'video' | '3d'): Promise<number | null> {
  const es3d = escenario === '3d'
  const nombre = await pedirTexto({
    titulo: es3d ? tGlobal('video.lista.nuevo3d', 'Nueva animación 3D') : tGlobal('video.lista.nuevo', 'Nuevo video'),
    mensaje: tGlobal('video.lista.nuevoMsg', 'Nombre del proyecto'),
  })
  if (!nombre) return null
  const ahora = new Date().toISOString()
  return proyectosVideoRepo.add({
    nombre,
    aspecto: '16:9',
    escenas: [],
    ...(es3d ? { escenario: '3d' as const } : {}),
    creadoEn: ahora,
    actualizadoEn: ahora,
  })
}

/**
 * El medio cuya miniatura hace de portada: el primer clip principal con imagen
 * o video que la tenga; en una animación 3D, su última toma guardada (`fuente`
 * 'pelicula:<id>'). Sin él, la tarjeta enseña el icono.
 */
function medioPortada(p: ProyectoVideo, clips: ClipVideo[], medios: MedioVideo[]): number | undefined {
  if (p.escenario === '3d') {
    const fuente = `pelicula:${p.id}`
    return [...medios].reverse().find((m) => m.fuente === fuente && m.miniatura)?.id
  }
  for (const c of clipsDe(clips, 'video')) {
    if (c.fuente.tipo !== 'imagen' && c.fuente.tipo !== 'video') continue
    const id = c.fuente.medioId
    if (medios.some((m) => m.id === id && m.miniatura)) return id
  }
  return undefined
}

const fmtDur = (seg: number) => {
  const s = Math.round(seg)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/**
 * La lista de proyectos: los videos normales o las animaciones 3D (`escenario`),
 * que se abren en el mapa. Rejilla de portadas (estilo TikTok/Instagram): la
 * miniatura del primer clip con formato y duración encima, y debajo el nombre.
 */
export function ProyectosTab({ escenario, onAbrir }: { escenario: 'video' | '3d'; onAbrir: (id: number) => void }) {
  const t = useT()
  const todos = proyectosVideoRepo.useAll() ?? VACIO
  const medios = mediosVideoRepo.useAll() ?? (VACIO as MedioVideo[])
  const urlDe = useMiniaturas(medios)
  const es3d = escenario === '3d'
  const proyectos = todos.filter((p) => (p.escenario === '3d') === es3d)
  const [borrando, setBorrando] = useState<number | null>(null)
  const nuevo = es3d ? t('video.lista.nuevo3d', 'Nueva animación 3D') : t('video.lista.nuevo', 'Nuevo video')

  const crear = async () => {
    const id = await crearProyecto(escenario)
    if (id != null) onAbrir(id)
  }

  const renombrar = async (id: number, actual: string) => {
    const nombre = await pedirTexto({ titulo: t('video.lista.renombrar', 'Renombrar video'), valor: actual })
    if (nombre && nombre !== actual) {
      await proyectosVideoRepo.update(id, { nombre, actualizadoEn: new Date().toISOString() })
    }
  }

  if (proyectos.length === 0) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <Vacio
          icono={es3d ? 'cubo-vistas' : 'pelicula'}
          titulo={es3d ? t('video.lista.vacio3d', 'Aún no hay animaciones 3D') : t('video.lista.vacio', 'Aún no hay videos')}
          sub={
            es3d
              ? t(
                  'video.lista.vacio3dSub',
                  'Se filman en el mapa: tus asistentes y tu avatar actúan por planos, con diálogos y reacciones; expórtala o guárdala en Medios.',
                )
              : t('video.lista.vacioSub', 'Escenas con clips, títulos y narración: el guion y la línea de tiempo son la misma cosa.')
          }
          cta={{ texto: nuevo, onClick: () => void crear() }}
        />
        {/* El ejemplo es un video normal: la animación 3D se rueda en el mapa. */}
        {!es3d && <BarraEjemplo paquete={ejemploVideo} />}
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-3">
      <div className="flex justify-end">
        <BotonPrimario type="button" pequeno app={COLOR} onClick={() => void crear()}>
          <Icono nombre="agregar" /> {nuevo}
        </BotonPrimario>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {proyectos.map((p) => {
          // Resumen en cualquier formato: migra en memoria (nunca persiste aquí).
          const { clips } = migrarProyecto(p, () => undefined).proyecto
          const medioId = medioPortada(p, clips, medios)
          const url = medioId != null ? urlDe(medioId) : undefined
          const abrir = () => p.id != null && onAbrir(p.id)
          return (
            <li key={p.id} className="min-w-0">
              <button
                type="button"
                onClick={abrir}
                title={p.nombre}
                className="relative block aspect-square w-full overflow-hidden rounded-xl border border-white/10 bg-black/40 transition hover:border-white/40"
              >
                {url ? (
                  <img src={url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="grid h-full w-full place-items-center text-3xl text-white/25">
                    <Icono nombre={es3d ? 'cubo-vistas' : 'pelicula'} />
                  </span>
                )}
                <span className="absolute bottom-1.5 start-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">{p.aspecto}</span>
                <span className="absolute bottom-1.5 end-1.5 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[10px] text-white">
                  {fmtDur(duracionTotal(clips))}
                </span>
              </button>
              <div className="mt-1.5 min-w-0">
                <button type="button" onClick={abrir} className="block w-full truncate text-left text-sm font-semibold">
                  {p.nombre}
                </button>
                {/* Fuera del botón de abrir: un botón no puede anidar otro. */}
                <div className="flex flex-wrap items-center gap-0.5 text-[11px] text-white/45">
                  <span className="min-w-0 flex-1 truncate">
                    {t('video.lista.escenas', '{n} escenas', { n: clipsDe(clips, 'video').length })} ·{' '}
                    {new Date(p.actualizadoEn).toLocaleDateString(localeActual(), { day: 'numeric', month: 'short' })}
                  </span>
                  <InsigniasPublicacion publicaciones={p.publicaciones} />
                  <button
                    type="button"
                    onClick={() => p.id != null && void renombrar(p.id, p.nombre)}
                    aria-label={t('video.lista.renombrar', 'Renombrar video')}
                    title={t('video.lista.renombrar', 'Renombrar video')}
                    className="rounded px-1 py-0.5 text-white/40 transition hover:bg-white/10 hover:text-white/80"
                  >
                    <Icono nombre="editar" />
                  </button>
                  <BotonBorrar
                    confirmando={borrando === p.id}
                    onPedir={() => setBorrando(p.id ?? null)}
                    onConfirmar={() => {
                      if (p.id != null) void proyectosVideoRepo.remove(p.id)
                      setBorrando(null)
                    }}
                    onCancelar={() => setBorrando(null)}
                  />
                </div>
              </div>
            </li>
          )
        })}
      </ul>
      {!es3d && <BarraEjemplo paquete={ejemploVideo} />}
    </div>
  )
}
