/**
 * Lo que cada app de la casa ya guarda como archivo (fotos, dibujos, clips,
 * tomas…), para enseñarlo en la carpeta de su cuarto dentro de Archivo. Es de
 * SOLO LECTURA: se ve, se baja y se abre en su app, que es quien sabe qué
 * receta o qué proyecto se quedaría sin su foto.
 *
 * Los datos de las apps son globales por app (no por cuarto): la carpeta de un
 * cuarto enseña las fuentes de la app que tiene puesta. Lo de fábrica
 * (`ejemploDe`) y la promo del Studio no son del usuario y no salen.
 */
import { useLiveQuery } from 'dexie-react-hooks'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import type { EnNube } from '../../core/data/db'
import {
  anecdotasRepo,
  bitacoraViajeRepo,
  contactosAgendaRepo,
  dibujosRepo,
  dietasGuardadasRepo,
  documentosRepo,
  entradasBiblioRepo,
  grabacionesAudioRepo,
  mascotasRepo,
  materialesIdiomaRepo,
  mediaArchivoRepo,
  mediosVideoRepo,
  musicaImportadaRepo,
  pistasMusicaRepo,
  portadasViajeRepo,
  proyectosHobbyRepo,
  recetasRepo,
  tarjetasIdiomaRepo,
} from '../../core/data/repository'

/** Un archivo de una app, visto como archivo más (visor, descarga, compartir). */
export interface ElementoApp {
  /** Llave estable en la vista: `e:<fuente>:<id>:<n>`. */
  llave: string
  fuente: string
  appId: string
  nombre: string
  mime: string
  bytes: number
  creadoEn: string
  /** Los bytes en este dispositivo (lo normal fuera del Studio). */
  blob?: Blob
  /** Copia en R2 (medios del Studio): se abre con URL firmada y se puede compartir. */
  nube?: EnNube
  miniatura?: Blob
  /** Medio del Studio que aún no subió (cuota llena o sin Pro): solo existe aquí. */
  soloAqui?: boolean
}

export interface Fuente {
  clave: string
  appId: string
  /** Título en español; la clave i18n es `archivos.fuente.<clave>`. */
  titulo: string
  icono: NombreIcono
  leer: () => Promise<ElementoApp[]>
}

const PREFIJO_PROMO = 'promo:'

const propios = <T extends { ejemploDe?: string }>(filas: T[]) => filas.filter((f) => !f.ejemploDe)

/** Una fila con uno o varios blobs → un elemento por blob («Receta · 2»). */
function deBlobs(
  fuente: string,
  appId: string,
  id: number | undefined,
  nombre: string,
  blobs: (Blob | undefined)[] | undefined,
  creadoEn: string,
  miniaturas?: (Blob | undefined)[],
): ElementoApp[] {
  const hay = (blobs ?? []).filter((b): b is Blob => b instanceof Blob)
  return hay.map((blob, i) => ({
    llave: `e:${fuente}:${id}:${i}`,
    fuente,
    appId,
    nombre: hay.length > 1 ? `${nombre} · ${i + 1}` : nombre,
    mime: blob.type || 'application/octet-stream',
    bytes: blob.size,
    creadoEn,
    blob,
    miniatura: miniaturas?.[i],
  }))
}

/** Medio del Studio: puede estar solo en la nube (otro dispositivo lo subió). */
function deMedio(
  fuente: string,
  appId: string,
  f: { id?: number; nombre: string; blob?: Blob; nube?: EnNube; creadoEn: string; miniatura?: Blob },
): ElementoApp[] {
  if (!f.blob && !f.nube) return []
  return [
    {
      llave: `e:${fuente}:${f.id}:0`,
      fuente,
      appId,
      nombre: f.nombre,
      mime: f.blob?.type || f.nube?.mime || 'application/octet-stream',
      bytes: f.blob?.size ?? f.nube?.bytes ?? 0,
      creadoEn: f.creadoEn,
      blob: f.blob,
      nube: f.nube,
      miniatura: f.miniatura,
      soloAqui: !f.nube,
    },
  ]
}

const fuente = (
  clave: string,
  appId: string,
  titulo: string,
  icono: NombreIcono,
  leer: () => Promise<ElementoApp[]>,
): Fuente => ({ clave, appId, titulo, icono, leer })

/** Por app: qué guarda como archivo. Las que no están aquí solo tienen «Tus archivos». */
export const FUENTES: Record<string, Fuente[]> = {
  video: [
    fuente('mediosVideo', 'video', 'Clips e imágenes', 'pelicula', async () =>
      (await mediosVideoRepo.list()).filter((m) => !m.fuente?.startsWith(PREFIJO_PROMO)).flatMap((m) => deMedio('mediosVideo', 'video', m)),
    ),
  ],
  audio: [
    fuente('grabacionesAudio', 'audio', 'Tomas de micrófono', 'microfono', async () =>
      (await grabacionesAudioRepo.list()).flatMap((g) => deMedio('grabacionesAudio', 'audio', g)),
    ),
    fuente('musicaImportada', 'audio', 'Canciones del mezclador', 'vinilo', async () =>
      (await musicaImportadaRepo.list()).flatMap((m) => deMedio('musicaImportada', 'audio', m)),
    ),
    fuente('pistasMusica', 'audio', 'Música', 'musica', async () =>
      (await pistasMusicaRepo.list()).flatMap((p) => deMedio('pistasMusica', 'audio', p)),
    ),
  ],
  arte: [
    fuente('dibujos', 'arte', 'Dibujos', 'imagen', async () =>
      propios(await dibujosRepo.list()).flatMap((d) => deBlobs('dibujos', 'arte', d.id, d.nombre, [d.imagen], d.actualizadoEn, [d.miniatura])),
    ),
  ],
  escritura: [
    fuente('documentos', 'escritura', 'Imágenes de documentos', 'imagen', async () =>
      propios(await documentosRepo.list()).flatMap((d) => deBlobs('documentos', 'escritura', d.id, d.titulo, [d.imagen], d.actualizadoEn)),
    ),
  ],
  cocina: [
    fuente('recetas', 'cocina', 'Fotos de recetas', 'imagen', async () =>
      (await recetasRepo.list()).flatMap((r) => deBlobs('recetas', 'cocina', r.id, r.nombre, [r.foto], r.creadaEn)),
    ),
    fuente('dietasGuardadas', 'cocina', 'Fotos de dietas', 'imagen', async () =>
      (await dietasGuardadasRepo.list()).flatMap((d) => deBlobs('dietasGuardadas', 'cocina', d.id, d.nombre, [d.foto], d.creadoEn)),
    ),
  ],
  sala: [
    fuente('bitacoraViaje', 'sala', 'Fotos de viajes', 'imagen', async () =>
      propios(await bitacoraViajeRepo.list()).flatMap((r) =>
        deBlobs('bitacoraViaje', 'sala', r.id, r.texto.trim().slice(0, 40) || r.fecha, r.fotos, r.creadoEn),
      ),
    ),
    fuente('portadasViaje', 'sala', 'Portadas de países', 'imagen', async () =>
      (await portadasViajeRepo.list()).flatMap((p) => deBlobs('portadasViaje', 'sala', p.id, p.pais, [p.foto], '')),
    ),
  ],
  anecdotario: [
    fuente('anecdotas', 'anecdotario', 'Fotos de anécdotas', 'imagen', async () =>
      propios(await anecdotasRepo.list()).flatMap((a) => deBlobs('anecdotas', 'anecdotario', a.id, a.titulo, a.fotos, a.fecha, a.miniaturas)),
    ),
  ],
  hobbies: [
    fuente('proyectosHobby', 'hobbies', 'Fotos de proyectos', 'imagen', async () =>
      propios(await proyectosHobbyRepo.list()).flatMap((p) => deBlobs('proyectosHobby', 'hobbies', p.id, p.nombre, p.imagenes, p.creadoEn)),
    ),
  ],
  biblioteca: [
    fuente('entradasBiblio', 'biblioteca', 'Imágenes de apuntes', 'imagen', async () =>
      propios(await entradasBiblioRepo.list()).flatMap((e) => deBlobs('entradasBiblio', 'biblioteca', e.id, e.titulo, [e.imagen], e.actualizadoEn)),
    ),
  ],
  idiomas: [
    fuente('tarjetasIdioma', 'idiomas', 'Imágenes de tarjetas', 'imagen', async () =>
      propios(await tarjetasIdiomaRepo.list()).flatMap((c) => deBlobs('tarjetasIdioma', 'idiomas', c.id, c.termino, [c.imagen], c.creadoEn)),
    ),
    fuente('materialesIdioma', 'idiomas', 'Material de estudio', 'nota', async () =>
      (await materialesIdiomaRepo.list()).flatMap((m) => deBlobs('materialesIdioma', 'idiomas', m.id, m.titulo, [m.blob], m.creadoEn)),
    ),
  ],
  entretenimiento: [
    fuente('mediaArchivo', 'entretenimiento', 'Portadas', 'imagen', async () =>
      propios(await mediaArchivoRepo.list()).flatMap((m) => deBlobs('mediaArchivo', 'entretenimiento', m.id, m.titulo, [m.portadaFoto], m.creadoEn)),
    ),
  ],
  agenda: [
    fuente('contactosAgenda', 'agenda', 'Fotos de contactos', 'imagen', async () =>
      (await contactosAgendaRepo.list()).flatMap((c) => deBlobs('contactosAgenda', 'agenda', c.id, c.nombre, [c.foto], c.creadoEn)),
    ),
    fuente('mascotas', 'agenda', 'Fotos de mascotas', 'imagen', async () =>
      (await mascotasRepo.list()).flatMap((m) => deBlobs('mascotas', 'agenda', m.id, m.nombre, [m.foto], m.creadoEn)),
    ),
  ],
}

/**
 * Lee en vivo los elementos de varias fuentes (se repinta al cambiar sus tablas).
 * Solo se monta con las fuentes a la vista: la casa entera tiene demasiados
 * blobs para leerlos todos a la vez.
 */
export function useElementos(fuentes: Fuente[]): Map<string, ElementoApp[]> | undefined {
  const claves = fuentes.map((f) => f.clave).join(',')
  return useLiveQuery(
    async () => new Map(await Promise.all(fuentes.map(async (f) => [f.clave, await f.leer()] as const))),
    // `fuentes` sale de `FUENTES`: basta con sus claves para saber si cambió.
    [claves],
  )
}
