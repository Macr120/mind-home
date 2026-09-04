import { useState } from 'react'
import { proyectosVideoRepo, VACIO } from '../../core/data/repository'
import { localeActual, useT } from '../../core/i18n/useT'
import { pedirTexto } from '../../core/state/confirmarStore'
import { Icono } from '../../core/ui/iconos/Icono'
import { BotonBorrar, BotonPrimario, FILA_INTERACTIVA, TARJETA, Vacio } from '../_shared/ui'
import { COLOR } from './constantes'
import { clipsDe, duracionTotal, migrarProyecto } from './modelo'
import { InsigniasPublicacion } from './publicar/InsigniasPublicacion'

/** La lista de proyectos: los videos normales o las animaciones 3D (`escenario`), que se abren en el mapa. */
export function ProyectosTab({ escenario, onAbrir }: { escenario: 'video' | '3d'; onAbrir: (id: number) => void }) {
  const t = useT()
  const todos = proyectosVideoRepo.useAll() ?? VACIO
  const es3d = escenario === '3d'
  const proyectos = todos.filter((p) => (p.escenario === '3d') === es3d)
  const [borrando, setBorrando] = useState<number | null>(null)
  const nuevo = es3d ? t('video.lista.nuevo3d', 'Nueva animación 3D') : t('video.lista.nuevo', 'Nuevo video')

  const crear = async () => {
    const nombre = await pedirTexto({
      titulo: nuevo,
      mensaje: t('video.lista.nuevoMsg', 'Nombre del proyecto'),
    })
    if (!nombre) return
    const ahora = new Date().toISOString()
    const id = await proyectosVideoRepo.add({
      nombre,
      aspecto: '16:9',
      escenas: [],
      ...(es3d ? { escenario: '3d' as const } : {}),
      creadoEn: ahora,
      actualizadoEn: ahora,
    })
    onAbrir(id)
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
      <ul className="space-y-2">
        {proyectos.map((p) => {
          // Resumen en cualquier formato: migra en memoria (nunca persiste aquí).
          const { clips } = migrarProyecto(p, () => undefined).proyecto
          return (
          <li key={p.id} className={`${TARJETA} ${FILA_INTERACTIVA} flex items-center gap-3 p-3`}>
            <button type="button" onClick={() => p.id != null && onAbrir(p.id)} className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-semibold">{p.nombre}</p>
              <p className="text-xs text-white/45">
                {t('video.lista.meta', '{escenas} escenas · {seg} s · {aspecto}', {
                  escenas: clipsDe(clips, 'video').length,
                  seg: Math.round(duracionTotal(clips)),
                  aspecto: p.aspecto,
                })}{' '}
                · {new Date(p.actualizadoEn).toLocaleDateString(localeActual(), { day: 'numeric', month: 'short' })}
              </p>
            </button>
            {/* Fuera del botón de abrir: un botón no puede anidar otro. */}
            <InsigniasPublicacion publicaciones={p.publicaciones} />
            <button
              type="button"
              onClick={() => p.id != null && void renombrar(p.id, p.nombre)}
              aria-label={t('video.lista.renombrar', 'Renombrar video')}
              title={t('video.lista.renombrar', 'Renombrar video')}
              className="rounded-lg px-2 py-1 text-white/40 transition hover:bg-white/10 hover:text-white/80"
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
          </li>
          )
        })}
      </ul>
    </div>
  )
}
