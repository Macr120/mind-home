import { useState } from 'react'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import type { ArchivoNube, EnNube } from '../../core/data/db'
import {
  grabacionesAudioRepo,
  mediosVideoRepo,
  musicaImportadaRepo,
  pistasMusicaRepo,
  VACIO,
} from '../../core/data/repository'
import { formatoBytes } from '../../core/cuenta/almacen'
import { useNubeStudio } from '../../core/studio/nubeStudio'
import { FILA_INTERACTIVA, TARJETA, Vacio } from '../_shared/ui'
import { iconoDeMime } from './constantes'
import { descargar, mensajeDeError } from './acciones'
import { Visor } from './Visor'

/**
 * Pestaña «Del Studio»: lo que el Studio subió solo a la nube (clips, tomas,
 * canciones y pistas; ver `core/studio/nubeStudio.ts`), por app y con lo que
 * ocupa. Solo ver y bajar: borrar se hace desde su app, que sabe qué proyecto
 * se quedaría sin su medio.
 */

interface ConNube {
  id?: number
  nombre: string
  nube?: EnNube
  creadoEn: string
}

/** El medio visto como un archivo más, para el visor y la descarga. */
const comoArchivo = (f: ConNube & { nube: EnNube }): ArchivoNube => ({
  id: f.id,
  nombre: f.nombre,
  carpetaId: null,
  clave: f.nube.clave,
  bytes: f.nube.bytes,
  mime: f.nube.mime,
  creadoEn: f.creadoEn,
})

export function DelStudio() {
  const t = useT()
  const llena = useNubeStudio((s) => s.llena)
  const grupos: { clave: string; icono: NombreIcono; titulo: string; filas: ConNube[] }[] = [
    { clave: 'video', icono: 'pelicula', titulo: t('archivos.studio.video', 'Video'), filas: mediosVideoRepo.useAll() ?? VACIO },
    { clave: 'audio', icono: 'microfono', titulo: t('archivos.studio.tomas', 'Tomas de audio'), filas: grabacionesAudioRepo.useAll() ?? VACIO },
    { clave: 'dj', icono: 'vinilo', titulo: t('archivos.studio.mezclador', 'Canciones del mezclador'), filas: musicaImportadaRepo.useAll() ?? VACIO },
    { clave: 'musica', icono: 'musica', titulo: t('archivos.studio.musica', 'Música'), filas: pistasMusicaRepo.useAll() ?? VACIO },
  ]
  const [abierto, setAbierto] = useState<ArchivoNube | null>(null)
  const [error, setError] = useState<string | null>(null)

  const conNube = grupos
    .map((g) => ({ ...g, filas: g.filas.filter((f): f is ConNube & { nube: EnNube } => f.nube != null) }))
    .filter((g) => g.filas.length)

  return (
    <div className="space-y-3">
      {llena && (
        <p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs text-amber-200">
          {t('archivos.studio.llena', 'Tu nube está llena: lo nuevo del Studio se queda solo en este dispositivo.')}
        </p>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
      {!conNube.length ? (
        <Vacio
          icono="pelicula"
          titulo={t('archivos.studio.vacio', 'Aún no hay nada del Studio en tu nube')}
          sub={t('archivos.studio.vacioSub', 'Los clips, tomas y canciones que creas en el Studio suben solos y se abren en tus otros dispositivos.')}
        />
      ) : (
        conNube.map((g) => (
          <div key={g.clave} className={`${TARJETA} space-y-1 p-3`}>
            <p className="flex items-center justify-between text-sm font-semibold">
              <span>
                <Icono nombre={g.icono} /> {g.titulo}
              </span>
              <span className="text-xs font-normal text-white/45">
                {formatoBytes(g.filas.reduce((n, f) => n + f.nube.bytes, 0))}
              </span>
            </p>
            {g.filas.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setAbierto(comoArchivo(f))}
                className={`${FILA_INTERACTIVA} flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm`}
              >
                <Icono nombre={iconoDeMime(f.nube.mime)} className="text-white/60" />
                <span className="min-w-0 flex-1 truncate">{f.nombre}</span>
                <span className="shrink-0 text-xs text-white/45">{formatoBytes(f.nube.bytes)}</span>
              </button>
            ))}
          </div>
        ))
      )}
      {abierto && (
        <Visor
          archivo={abierto}
          onCerrar={() => setAbierto(null)}
          onDescargar={() =>
            void descargar(abierto).catch((e) => {
              setError(mensajeDeError(e))
            })
          }
        />
      )}
    </div>
  )
}
