import { useEffect, useRef, useState } from 'react'
import type { FuenteSonido, MedioVideo } from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { BotonBorrar, BotonSecundario, TARJETA } from '../_shared/ui'
import type { ItemArrastre, MedioConId } from './clipsNuevos'
import { guardarSonidosOcultos, leerSonidosOcultos, SONIDOS_FABRICA, urlSonido } from './sonidos'
import type { PropsArrastreItem } from './useArrastreMedio'

/** Lo que se arrastra desde la carpeta: un sonido de fábrica o uno del usuario. */
export type ItemSonido = Extract<ItemArrastre, { tipo: 'sonido' | 'efecto' }>

/** Un solo reproductor de muestra para todo el módulo: escuchar otro corta al anterior. */
let muestra: HTMLAudioElement | null = null
let urlMuestra = ''
function pararMuestra() {
  if (muestra) {
    muestra.pause()
    muestra = null
  }
  if (urlMuestra) {
    URL.revokeObjectURL(urlMuestra)
    urlMuestra = ''
  }
}
/** Reproduce `src` (revocando `url` al acabar, si la hay); `alTerminar` se llama al acabar o fallar. */
function reproducirMuestra(src: string, url: string, alTerminar: () => void) {
  pararMuestra()
  urlMuestra = url
  const audio = new Audio(src)
  const fin = () => {
    if (muestra !== audio) return
    pararMuestra()
    alTerminar()
  }
  audio.onended = fin
  audio.onerror = fin
  muestra = audio
  void audio.play().catch(fin)
}

/** Fuente de un sonido → src reproducible (y la object URL a revocar, si es un medio). */
function srcDeSonido(fuente: FuenteSonido, porId: Map<number, MedioVideo>): { src: string; url: string } | null {
  if (fuente.tipo === 'fabrica') {
    const src = urlSonido(fuente.clave)
    return src ? { src, url: '' } : null
  }
  const m = porId.get(fuente.medioId)
  if (!m) return null
  const url = URL.createObjectURL(m.blob)
  return { src: url, url }
}

/** Botón escuchar/parar de un sonido (lo usan la lista y el panel del clip). */
export function BotonEscuchar({
  fuente,
  porId,
  sonando,
  onSonando,
}: {
  fuente: FuenteSonido
  porId: Map<number, MedioVideo>
  sonando: boolean
  onSonando: (v: boolean) => void
}) {
  const t = useT()
  return (
    <button
      type="button"
      data-no-arrastre
      onClick={() => {
        if (sonando) {
          pararMuestra()
          onSonando(false)
          return
        }
        const s = srcDeSonido(fuente, porId)
        if (!s) return
        reproducirMuestra(s.src, s.url, () => onSonando(false))
        onSonando(true)
      }}
      aria-label={sonando ? t('video.sonidos.parar', 'Parar') : t('video.sonidos.escuchar', 'Escuchar')}
      title={sonando ? t('video.sonidos.parar', 'Parar') : t('video.sonidos.escuchar', 'Escuchar')}
      className="ui-boton grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20"
    >
      <Icono nombre={sonando ? 'pausa' : 'play'} />
    </button>
  )
}

/** Una fila de la carpeta: escuchar, nombre, duración, añadir y borrar. */
function FilaSonido({
  fuente,
  item,
  nombre,
  duracion,
  porId,
  sonando,
  onSonando,
  confirmando,
  onPedirBorrar,
  onBorrar,
  onCancelarBorrar,
  onElegir,
  propsArrastre,
}: {
  fuente: FuenteSonido
  item: ItemSonido
  nombre: string
  duracion: number
  porId: Map<number, MedioVideo>
  sonando: boolean
  onSonando: (v: boolean) => void
  confirmando: boolean
  onPedirBorrar: () => void
  onBorrar: () => void
  onCancelarBorrar: () => void
  onElegir: (fuente: FuenteSonido) => void
  propsArrastre?: (item: ItemSonido) => PropsArrastreItem
}) {
  const t = useT()
  return (
    <li
      className={`${TARJETA} flex items-center gap-2 p-2${propsArrastre ? ' select-none [-webkit-touch-callout:none]' : ''}`}
      {...propsArrastre?.(item)}
    >
      <BotonEscuchar fuente={fuente} porId={porId} sonando={sonando} onSonando={onSonando} />
      <span className="min-w-0 flex-1 truncate text-xs font-semibold">{nombre}</span>
      {duracion > 0 && <span className="shrink-0 text-[10px] text-white/40">{Math.round(duracion * 10) / 10}s</span>}
      <BotonSecundario pequeno data-no-arrastre onClick={() => onElegir(fuente)}>
        <Icono nombre="agregar" /> {t('video.sonidos.agregar', 'Añadir')}
      </BotonSecundario>
      <span data-no-arrastre className="contents">
        <BotonBorrar confirmando={confirmando} onPedir={onPedirBorrar} onConfirmar={onBorrar} onCancelar={onCancelarBorrar} />
      </span>
    </li>
  )
}

/**
 * La carpeta «Sonidos»: los efectos de fábrica (se pueden borrar de la lista y
 * restaurar) y los del usuario (audios importados aquí, que se borran de la
 * biblioteca), para elegir uno o pasar a la biblioteca de audios importados.
 */
export function ListaSonidos({
  medios,
  onElegir,
  onImportado,
  compacto = false,
  propsArrastre,
}: {
  medios: MedioVideo[]
  onElegir: (fuente: FuenteSonido) => void
  /** Pasar a la biblioteca de audios importados; sin él no se ofrece (el panel lateral ya los lista). */
  onImportado?: () => void
  /** Una sola columna: la versión del panel lateral del editor. */
  compacto?: boolean
  /** Gesto de arrastre a la timeline (panel lateral); el botón «Añadir» sigue siendo el toque. */
  propsArrastre?: (item: ItemSonido) => PropsArrastreItem
}) {
  const t = useT()
  const [sonando, setSonando] = useState<string | null>(null)
  const [borrando, setBorrando] = useState<string | null>(null)
  const [ocultos, setOcultos] = useState(() => leerSonidosOcultos())
  const [importando, setImportando] = useState(false)
  const archivoRef = useRef<HTMLInputElement>(null)
  const porId = new Map(medios.filter((m) => m.id != null).map((m) => [m.id!, m]))
  const tuyos = medios.filter((m): m is MedioConId => m.tipo === 'audio' && m.sonido === true && m.id != null)
  const fabrica = SONIDOS_FABRICA.filter((f) => !ocultos.has(f.clave))
  useEffect(() => () => pararMuestra(), [])

  // Borrar uno de fábrica solo lo quita de la lista: los clips que ya lo usan siguen sonando.
  const ocultar = (clave: string) => {
    const s = new Set(ocultos)
    s.add(clave)
    setOcultos(s)
    guardarSonidosOcultos(s)
    setBorrando(null)
  }
  const restaurar = () => {
    const s = new Set<string>()
    setOcultos(s)
    guardarSonidosOcultos(s)
  }
  const importar = async (archivo: File) => {
    setImportando(true)
    try {
      const { importarMedio } = await import('./importar')
      await importarMedio(archivo, { sonido: true })
    } finally {
      setImportando(false)
    }
  }
  const borrarTuyo = async (m: MedioConId) => {
    setBorrando(null)
    const { borrarMedio } = await import('./importar')
    await borrarMedio(m)
  }
  const lista = `grid grid-cols-1 gap-1.5 ${compacto ? '' : 'sm:grid-cols-2'}`

  return (
    <div className="space-y-3">
      <BotonSecundario pequeno disabled={importando} onClick={() => archivoRef.current?.click()} className={compacto ? 'w-full' : undefined}>
        <Icono nombre="agregar" /> {t('video.sonidos.anadirSonido', 'Añadir sonido')}
      </BotonSecundario>
      {tuyos.length > 0 && (
        <div>
          <p className="mb-1 text-xs text-white/50">{t('video.sonidos.tuyos', 'Tus sonidos')}</p>
          <ul className={lista}>
            {tuyos.map((m) => {
              const clave = `m:${m.id}`
              return (
                <FilaSonido
                  key={clave}
                  fuente={{ tipo: 'medio', medioId: m.id }}
                  item={{ tipo: 'efecto', medio: m }}
                  nombre={m.nombre}
                  duracion={m.duracion ?? 0}
                  porId={porId}
                  sonando={sonando === clave}
                  onSonando={(v) => setSonando(v ? clave : null)}
                  confirmando={borrando === clave}
                  onPedirBorrar={() => setBorrando(clave)}
                  onBorrar={() => void borrarTuyo(m)}
                  onCancelarBorrar={() => setBorrando(null)}
                  onElegir={onElegir}
                  propsArrastre={propsArrastre}
                />
              )
            })}
          </ul>
        </div>
      )}
      <div>
        <p className="mb-1 text-xs text-white/50">{t('video.sonidos.fabrica', 'De fábrica')}</p>
        {fabrica.length > 0 && (
          <ul className={lista}>
            {fabrica.map((f) => (
              <FilaSonido
                key={f.clave}
                fuente={{ tipo: 'fabrica', clave: f.clave }}
                item={{ tipo: 'sonido', clave: f.clave }}
                nombre={t(f.claveNombre, f.es)}
                duracion={f.duracion}
                porId={porId}
                sonando={sonando === f.clave}
                onSonando={(v) => setSonando(v ? f.clave : null)}
                confirmando={borrando === f.clave}
                onPedirBorrar={() => setBorrando(f.clave)}
                onBorrar={() => ocultar(f.clave)}
                onCancelarBorrar={() => setBorrando(null)}
                onElegir={onElegir}
                propsArrastre={propsArrastre}
              />
            ))}
          </ul>
        )}
        {ocultos.size > 0 && (
          <button type="button" onClick={restaurar} className="mt-1.5 text-xs text-white/50 underline-offset-2 hover:text-white/80 hover:underline">
            {t('video.sonidos.restaurar', 'Restaurar los de fábrica')}
          </button>
        )}
      </div>
      {onImportado && (
        <BotonSecundario pequeno onClick={onImportado}>
          <Icono nombre="musica" /> {t('video.sonidos.importado', 'Audio importado')}
        </BotonSecundario>
      )}
      <input
        ref={archivoRef}
        type="file"
        accept="audio/*"
        hidden
        onChange={(e) => {
          const archivo = e.target.files?.[0]
          if (archivo) void importar(archivo)
          e.target.value = ''
        }}
      />
    </div>
  )
}
