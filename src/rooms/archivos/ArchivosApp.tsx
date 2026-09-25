import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { archivosNubeRepo, carpetasArchivoRepo } from '../../core/data/repository'
import type { ArchivoNube, CarpetaArchivo } from '../../core/data/db'
import { esDemo, tieneAcceso } from '../../core/edicion'
import { hayBackend } from '../../core/cuenta/supabase'
import { useSesion } from '../../core/cuenta/sesionStore'
import { formatoBytes, refrescarUsoAlmacen, useAlmacen } from '../../core/cuenta/almacen'
import { tabInicial } from '../../core/state/intencionApp'
import { confirmar, elegir, pedirTexto } from '../../core/state/confirmarStore'
import { PestanasCarpeta, type ItemPestana } from '../_shared/PestanasCarpeta'
import { BotonPrimario, BotonSecundario, FILA_INTERACTIVA, TARJETA, Vacio } from '../_shared/ui'
import { COLOR, iconoDeMime } from './constantes'
import {
  borrarArchivo,
  borrarCarpeta,
  crearCarpeta,
  descargar,
  descartarSubida,
  descendencia,
  mensajeDeError,
  moverArchivo,
  moverCarpeta,
  renombrarArchivo,
  renombrarCarpeta,
  subirArchivos,
  useSubidas,
} from './acciones'
import { Visor } from './Visor'

/**
 * El cuarto Archivo: la nube del usuario (Pro). Carpetas y archivos como en un
 * Drive; los bytes viven en Cloudflare R2 y aquí solo se leen sus metadatos,
 * que el sync reparte entre dispositivos. Abrir un archivo pide una URL firmada.
 */

type Tab = 'archivos' | 'recientes'
const TABS_IDS = ['archivos', 'recientes'] as const

const TABS: ItemPestana<Tab>[] = [
  { id: 'archivos', icono: 'carpeta', labelEs: 'Archivos' },
  { id: 'recientes', icono: 'cronometro', labelEs: 'Recientes' },
]

const porNombre = <T extends { nombre: string }>(a: T, b: T) => a.nombre.localeCompare(b.nombre)

export function ArchivosApp() {
  const t = useT()
  const usuario = useSesion((s) => s.usuario)
  // Leído para repintar cuando cambia el plan; el gate en sí es `tieneAcceso()`.
  useSesion((s) => s.plan)
  const [tab, setTab] = useState<Tab>(() => tabInicial('archivos', TABS_IDS, 'archivos'))
  const [plegado, setPlegado] = useState(false)

  if (esDemo() || !hayBackend()) {
    return <Vacio icono="nube" titulo={t('archivos.demo.titulo', 'La demo no sube archivos')} sub={t('archivos.demo.sub', 'En tu casa, con Pro, aquí guardas tus archivos en la nube y los abres desde cualquier dispositivo.')} />
  }
  if (!usuario) {
    return <Vacio icono="nube" titulo={t('archivos.sinSesion.titulo', 'Inicia sesión para usar tu Archivo')} sub={t('archivos.sinSesion.sub', 'Tus archivos viven en tu cuenta, no en este dispositivo.')} />
  }

  return (
    <div className="space-y-3">
      <div className="mx-auto w-full max-w-4xl">
        <PestanasCarpeta
          items={TABS}
          activo={tab}
          onCambio={setTab}
          prefijoClave="archivos.tab"
          color={COLOR}
          variante="raiz"
          plegado={plegado}
          onAlternarPliegue={() => setPlegado((v) => !v)}
        />
      </div>
      {!plegado && <Explorador tab={tab} puedeSubir={tieneAcceso()} />}
    </div>
  )
}

function Medidor({ puedeSubir }: { puedeSubir: boolean }) {
  const t = useT()
  const uso = useAlmacen((s) => s.uso)
  useEffect(() => {
    void refrescarUsoAlmacen()
  }, [])
  if (!uso) return null
  const pct = uso.cuota ? Math.min(100, (uso.usados / uso.cuota) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-white/60">
        <span>
          <Icono nombre="nube" />{' '}
          {uso.cuota == null
            ? t('archivos.uso.sinTope', '{usados} usados', { usados: formatoBytes(uso.usados) })
            : t('archivos.uso', '{usados} de {cuota}', { usados: formatoBytes(uso.usados), cuota: formatoBytes(uso.cuota) })}
        </span>
        {uso.cuota != null && uso.cuota > 0 && <span>{Math.round(pct)} %</span>}
      </div>
      {uso.cuota != null && uso.cuota > 0 && (
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: pct >= 90 ? '#f87171' : COLOR }}
          />
        </div>
      )}
      {!puedeSubir && (
        <p className="text-xs text-amber-300/80">
          {t('archivos.soloLectura', 'Tu plan no incluye nube: puedes ver y bajar tus archivos, pero no subir nuevos.')}
        </p>
      )}
    </div>
  )
}

function Subidas() {
  const t = useT()
  const lista = useSubidas((s) => s.lista)
  if (!lista.length) return null
  return (
    <div className={`${TARJETA} space-y-2 p-3`}>
      {lista.map((s) => (
        <div key={s.id} className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="truncate">
              <Icono nombre="subir" /> {s.nombre}
            </span>
            {s.error ? (
              <button
                type="button"
                onClick={() => descartarSubida(s.id)}
                aria-label={t('rutinas.cerrar', 'Cerrar')}
                className="rounded px-1 text-white/50 hover:bg-white/10"
              >
                <Icono nombre="cerrar" />
              </button>
            ) : (
              <span className="text-white/50">{Math.round(s.fraccion * 100)} %</span>
            )}
          </div>
          {s.error ? (
            <p className="text-xs text-red-400">{s.error}</p>
          ) : (
            <div className="h-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full" style={{ width: `${s.fraccion * 100}%`, background: COLOR }} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function Miniatura({ archivo }: { archivo: ArchivoNube }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!archivo.miniatura) return
    const u = URL.createObjectURL(archivo.miniatura)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- la URL nace y muere con el efecto (StrictMode la revocaría en un useMemo)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [archivo.miniatura])
  if (url) return <img src={url} alt="" className="h-full w-full object-cover" />
  return <Icono nombre={iconoDeMime(archivo.mime)} className="text-3xl text-white/60" />
}

function Explorador({ tab, puedeSubir }: { tab: Tab; puedeSubir: boolean }) {
  const t = useT()
  const carpetas = carpetasArchivoRepo.useAll()
  const archivos = archivosNubeRepo.useAll()
  const [actual, setActual] = useState<number | null>(null)
  const [abierto, setAbierto] = useState<ArchivoNube | null>(null)
  const [arrastrando, setArrastrando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const entrada = useRef<HTMLInputElement>(null)

  const porId = useMemo(() => new Map((carpetas ?? []).map((c) => [c.id!, c])), [carpetas])
  // Una carpeta que se borró en otro dispositivo deja al usuario en la raíz.
  const carpetaActual = actual != null && porId.has(actual) ? actual : null

  const ruta = useMemo(() => {
    const r: CarpetaArchivo[] = []
    let c = carpetaActual != null ? porId.get(carpetaActual) : undefined
    while (c && r.length < 50) {
      r.unshift(c)
      c = c.padreId != null ? porId.get(c.padreId) : undefined
    }
    return r
  }, [carpetaActual, porId])

  const rutaDe = (id: number | null): string => {
    const partes: string[] = []
    let c = id != null ? porId.get(id) : undefined
    while (c && partes.length < 50) {
      partes.unshift(c.nombre)
      c = c.padreId != null ? porId.get(c.padreId) : undefined
    }
    return [t('archivos.raiz', 'Mi Archivo'), ...partes].join(' › ')
  }

  const intentar = async (f: () => Promise<void>) => {
    setError(null)
    try {
      await f()
    } catch (e) {
      setError(mensajeDeError(e))
    }
  }

  const subir = (lista: FileList | File[] | null) => {
    const files = [...(lista ?? [])]
    if (files.length && puedeSubir) void subirArchivos(files, carpetaActual)
  }

  const nuevaCarpeta = async () => {
    const nombre = await pedirTexto({
      titulo: t('archivos.nuevaCarpeta', 'Nueva carpeta'),
      mensaje: t('archivos.nombreCarpeta', 'Nombre de la carpeta'),
      textoOk: t('archivos.crear', 'Crear'),
    })
    if (nombre?.trim()) await crearCarpeta(nombre.trim(), carpetaActual)
  }

  /** Destino de «Mover»: todas las carpetas menos `excluir` (la propia y su descendencia). */
  const elegirDestino = async (excluir: Set<number>, desde: number | null): Promise<number | null | undefined> => {
    const opciones = [
      { valor: 'raiz', texto: t('archivos.raiz', 'Mi Archivo') },
      ...(carpetas ?? [])
        .filter((c) => c.id != null && !excluir.has(c.id))
        .map((c) => ({ valor: String(c.id), texto: rutaDe(c.id!) }))
        .sort((a, b) => a.texto.localeCompare(b.texto)),
    ].filter((o) => o.valor !== (desde == null ? 'raiz' : String(desde)))
    const r = await elegir({ titulo: t('archivos.moverA', 'Mover a…'), opciones })
    if (r == null) return undefined
    return r === 'raiz' ? null : Number(r)
  }

  const accionesCarpeta = async (c: CarpetaArchivo) => {
    const r = await elegir({
      titulo: c.nombre,
      opciones: [
        { valor: 'renombrar', texto: t('archivos.renombrar', 'Renombrar') },
        { valor: 'mover', texto: t('archivos.mover', 'Mover') },
        { valor: 'borrar', texto: t('archivos.borrar', 'Borrar') },
      ],
    })
    if (r === 'renombrar') {
      const nombre = await pedirTexto({ titulo: t('archivos.renombrar', 'Renombrar'), valor: c.nombre, textoOk: t('archivos.guardar', 'Guardar') })
      if (nombre?.trim()) await renombrarCarpeta(c, nombre.trim())
    } else if (r === 'mover') {
      const destino = await elegirDestino(descendencia(c.id!, carpetas ?? []), c.padreId)
      if (destino !== undefined) await moverCarpeta(c, destino)
    } else if (r === 'borrar') {
      const ids = descendencia(c.id!, carpetas ?? [])
      const n = (archivos ?? []).filter((a) => a.carpetaId != null && ids.has(a.carpetaId)).length + ids.size - 1
      const ok = await confirmar({
        titulo: t('archivos.borrar.titulo', '¿Borrar «{nombre}»?', { nombre: c.nombre }),
        mensaje: n
          ? t('archivos.borrarCarpeta.msg', 'Se borran también sus {n} elementos, en la nube y en todos tus dispositivos.', { n })
          : t('archivos.borrar.msg', 'Se borra de la nube y de todos tus dispositivos.'),
        textoOk: t('archivos.borrar', 'Borrar'),
        peligro: true,
      })
      if (ok) await intentar(() => borrarCarpeta(c, carpetas ?? [], archivos ?? []))
    }
  }

  const accionesArchivo = {
    descargar: (a: ArchivoNube) => intentar(() => descargar(a)),
    renombrar: async (a: ArchivoNube) => {
      const nombre = await pedirTexto({ titulo: t('archivos.renombrar', 'Renombrar'), valor: a.nombre, textoOk: t('archivos.guardar', 'Guardar') })
      if (nombre?.trim()) await renombrarArchivo(a, nombre.trim())
    },
    mover: async (a: ArchivoNube) => {
      const destino = await elegirDestino(new Set(), a.carpetaId)
      if (destino !== undefined) await moverArchivo(a, destino)
    },
    borrar: async (a: ArchivoNube) => {
      const ok = await confirmar({
        titulo: t('archivos.borrar.titulo', '¿Borrar «{nombre}»?', { nombre: a.nombre }),
        mensaje: t('archivos.borrar.msg', 'Se borra de la nube y de todos tus dispositivos.'),
        textoOk: t('archivos.borrar', 'Borrar'),
        peligro: true,
      })
      if (!ok) return false
      await intentar(() => borrarArchivo(a))
      return true
    },
  }

  if (!carpetas || !archivos) return null

  const subcarpetas = carpetas.filter((c) => c.padreId === carpetaActual).sort(porNombre)
  const aqui = tab === 'recientes' ? archivos.slice(0, 40) : archivos.filter((a) => a.carpetaId === carpetaActual).sort(porNombre)
  const vacio = tab === 'recientes' ? !aqui.length : !aqui.length && !subcarpetas.length

  const alSoltar = (e: DragEvent) => {
    e.preventDefault()
    setArrastrando(false)
    subir(e.dataTransfer.files)
  }

  return (
    <div
      className={`mx-auto w-full max-w-4xl space-y-3 rounded-2xl ${arrastrando ? 'outline-2 outline-dashed outline-sky-400/60' : ''}`}
      onDragOver={(e) => {
        if (!puedeSubir || !e.dataTransfer.types.includes('Files')) return
        e.preventDefault()
        setArrastrando(true)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setArrastrando(false)
      }}
      onDrop={alSoltar}
    >
      <div className={`${TARJETA} space-y-3 p-3`}>
        <Medidor puedeSubir={puedeSubir} />
        <div className="flex flex-wrap items-center gap-2">
          {tab === 'archivos' && (
            <nav className="flex min-w-0 flex-1 flex-wrap items-center gap-1 text-sm">
              <button type="button" onClick={() => setActual(null)} className="rounded-lg px-2 py-1 font-semibold hover:bg-white/10">
                <Icono nombre="nube" /> {t('archivos.raiz', 'Mi Archivo')}
              </button>
              {ruta.map((c) => (
                <span key={c.id} className="flex items-center gap-1">
                  <span className="text-white/30">›</span>
                  <button type="button" onClick={() => setActual(c.id!)} className="max-w-40 truncate rounded-lg px-2 py-1 hover:bg-white/10">
                    {c.nombre}
                  </button>
                </span>
              ))}
            </nav>
          )}
          {tab === 'recientes' && <p className="flex-1 text-sm font-semibold text-white/80">{t('archivos.tab.recientes', 'Recientes')}</p>}
          {tab === 'archivos' && (
            <BotonSecundario pequeno onClick={() => void nuevaCarpeta()}>
              <Icono nombre="carpeta" /> {t('archivos.nuevaCarpeta', 'Nueva carpeta')}
            </BotonSecundario>
          )}
          {puedeSubir && (
            <BotonPrimario pequeno app={COLOR} onClick={() => entrada.current?.click()}>
              <Icono nombre="subir" /> {t('archivos.subir', 'Subir')}
            </BotonPrimario>
          )}
          <input
            ref={entrada}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              subir(e.target.files)
              e.target.value = ''
            }}
          />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      <Subidas />

      {vacio ? (
        <Vacio
          icono={tab === 'recientes' ? 'cronometro' : 'carpeta'}
          titulo={tab === 'recientes' ? t('archivos.recientes.vacio', 'Aún no has subido nada') : t('archivos.vacio.titulo', 'Esta carpeta está vacía')}
          sub={puedeSubir ? t('archivos.vacio.sub', 'Sube archivos o arrástralos aquí. Se guardan en tu nube y los ves en todos tus dispositivos.') : undefined}
        />
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {tab === 'archivos' &&
            subcarpetas.map((c) => {
              const n = archivos.filter((a) => a.carpetaId === c.id).length + carpetas.filter((x) => x.padreId === c.id).length
              return (
                <div key={c.id} className={`${TARJETA} ${FILA_INTERACTIVA} relative flex items-center gap-2 p-3`}>
                  <button type="button" onClick={() => setActual(c.id!)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    <Icono nombre="carpeta" className="text-2xl" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{c.nombre}</span>
                      <span className="block text-xs text-white/45">{t('archivos.carpeta.n', '{n} elementos', { n })}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void accionesCarpeta(c)}
                    aria-label={t('archivos.opciones', 'Opciones')}
                    className="rounded-lg px-1.5 py-1 text-white/50 hover:bg-white/10"
                  >
                    <Icono nombre="editar" />
                  </button>
                </div>
              )
            })}
          {aqui.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAbierto(a)}
              className={`${TARJETA} ${FILA_INTERACTIVA} flex flex-col overflow-hidden p-0 text-left`}
            >
              <span className="grid h-24 place-items-center overflow-hidden bg-black/20">
                <Miniatura archivo={a} />
              </span>
              <span className="space-y-0.5 p-2">
                <span className="block truncate text-sm font-semibold">{a.nombre}</span>
                <span className="block truncate text-xs text-white/45">
                  {tab === 'recientes' ? rutaDe(a.carpetaId) : `${formatoBytes(a.bytes)} · ${new Date(a.creadoEn).toLocaleDateString()}`}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {abierto && (
        <Visor
          archivo={abierto}
          onCerrar={() => setAbierto(null)}
          onDescargar={() => void accionesArchivo.descargar(abierto)}
          onRenombrar={async () => {
            await accionesArchivo.renombrar(abierto)
            setAbierto(null)
          }}
          onMover={async () => {
            await accionesArchivo.mover(abierto)
            setAbierto(null)
          }}
          onBorrar={async () => {
            if (await accionesArchivo.borrar(abierto)) setAbierto(null)
          }}
        />
      )}
    </div>
  )
}
