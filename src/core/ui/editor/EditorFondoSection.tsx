import { useEffect, useRef, useState } from 'react'
import { useDiseño } from '../../state/disenoStore'
import { FONDOS } from '../../house/fondos'
import type { FondoImagen } from '../../data/db'
import type { AjusteFondoImagen } from '../../house/fondosImagen'
import { AJUSTE_FONDO_DEFAULT, ajusteADb, ajusteDesdeDb } from '../../house/fondosImagen'
import { TEMAS } from '../../house/temas'
import { useT } from '../../i18n/useT'
import { EditorFondoImagenPreview } from './EditorFondoImagenPreview'

function MiniaturaFondo({ item }: { item: FondoImagen }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    const u = URL.createObjectURL(item.imagen)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [item.id, item.imagen])
  if (!url) return <div className="h-full w-full bg-white/5" />
  return (
    <img src={url} alt="" className="h-full w-full object-cover" draggable={false} />
  )
}

/**
 * Selector de fondo de cielo y microanimaciones (editor de mapa).
 * Incluye galería de imágenes propias con vista previa ajustable.
 */
export function EditorFondoSection({ embed }: { embed?: boolean } = {}) {
  const t = useT()
  const inputRef = useRef<HTMLInputElement>(null)
  const {
    fondoId,
    fondoImagenActivo,
    fondosImagen,
    setFondoId,
    setFondoImagenActivo,
    agregarFondoImagen,
    actualizarFondoImagen,
    eliminarFondoImagen,
    animacionesFondo,
    setAnimacionesFondo,
    temaGlobal,
  } = useDiseño()
  const temaNombre = TEMAS.find((tema) => tema.id === temaGlobal)?.nombre

  const [borrador, setBorrador] = useState<{
    blob: Blob
    url: string
    nombre: string
    ajuste: AjusteFondoImagen
  } | null>(null)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [guardando, setGuardando] = useState(false)

  const cerrarBorrador = () => {
    setBorrador((prev) => {
      if (prev) URL.revokeObjectURL(prev.url)
      return null
    })
    setEditandoId(null)
  }

  useEffect(
    () => () => {
      if (borrador) URL.revokeObjectURL(borrador.url)
    },
    [borrador],
  )

  const onArchivo = (file: File | undefined) => {
    if (!file?.type.startsWith('image/')) return
    cerrarBorrador()
    const url = URL.createObjectURL(file)
    const base = file.name.replace(/\.[^.]+$/, '').slice(0, 32) || 'Mi fondo'
    setBorrador({ blob: file, url, nombre: base, ajuste: { ...AJUSTE_FONDO_DEFAULT } })
  }

  const editarExistente = (item: FondoImagen) => {
    if (item.id == null) return
    cerrarBorrador()
    const url = URL.createObjectURL(item.imagen)
    setEditandoId(item.id)
    setBorrador({
      blob: item.imagen,
      url,
      nombre: item.nombre,
      ajuste: ajusteDesdeDb(item.ajusteX, item.ajusteY, item.escala),
    })
  }

  const guardarBorrador = async () => {
    if (!borrador) return
    setGuardando(true)
    try {
      if (editandoId != null) {
        await actualizarFondoImagen(editandoId, {
          nombre: borrador.nombre.trim() || 'Mi fondo',
          ...ajusteADb(borrador.ajuste),
        })
        await setFondoImagenActivo(editandoId)
      } else {
        await agregarFondoImagen(borrador.blob, borrador.nombre, borrador.ajuste)
      }
      cerrarBorrador()
    } finally {
      setGuardando(false)
    }
  }

  const borrar = async (id: number) => {
    if (!window.confirm(t('editor.fondo.confirmBorrar', '¿Eliminar este fondo guardado?'))) return
    if (editandoId === id) cerrarBorrador()
    await eliminarFondoImagen(id)
  }

  return (
    <div className={embed ? 'space-y-3' : 'rounded-xl border border-white/10 bg-white/5 p-3 space-y-3'}>
      {!embed && <p className="text-sm font-semibold">{t('editor.fondo.titulo', 'Fondo de cielo')}</p>}
      <p className="text-[11px] leading-snug text-white/45">
        {t('editor.fondo.desc', 'Se elige automáticamente al cambiar el tema. También puedes cambiarlo a mano.')}
      </p>

      <div className="space-y-2 rounded-lg border border-white/10 bg-black/15 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
            {t('editor.fondo.misImagenes', 'Mis imágenes')}
          </p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-md bg-emerald-500/90 px-2 py-1 text-[10px] font-bold text-black hover:bg-emerald-400"
          >
            {t('editor.fondo.subir', '+ Subir imagen')}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              onArchivo(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </div>

        {borrador && (
          <EditorFondoImagenPreview
            url={borrador.url}
            blob={borrador.blob}
            nombre={borrador.nombre}
            ajuste={borrador.ajuste}
            onAjuste={(a) => setBorrador((b) => (b ? { ...b, ajuste: a } : b))}
            onNombre={(nombre) => setBorrador((b) => (b ? { ...b, nombre } : b))}
            onCancelar={cerrarBorrador}
            onGuardar={guardarBorrador}
            guardando={guardando}
          />
        )}

        {fondosImagen.length === 0 && !borrador && (
          <p className="text-[10px] text-white/35">
            {t('editor.fondo.sinImagenes', 'Sube una imagen para usarla como fondo del cielo.')}
          </p>
        )}

        {fondosImagen.length > 0 && (
          <div className="grid grid-cols-2 gap-1.5">
            {fondosImagen.map((item) => {
              if (item.id == null) return null
              const activo = fondoImagenActivo === item.id
              return (
                <div
                  key={item.id}
                  className={[
                    'overflow-hidden rounded-lg border transition',
                    activo ? 'border-emerald-400/60 bg-emerald-400/10' : 'border-white/10 bg-white/5',
                  ].join(' ')}
                >
                  <button
                    type="button"
                    onClick={() => void setFondoImagenActivo(item.id!)}
                    className="block w-full text-left"
                    title={item.nombre}
                  >
                    <div className="aspect-video w-full overflow-hidden bg-black/30">
                      <MiniaturaFondo item={item} />
                    </div>
                    <p className="truncate px-2 py-1 text-[10px] font-medium text-white/75">
                      {activo ? '✓ ' : ''}
                      {item.nombre}
                    </p>
                  </button>
                  <div className="flex border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => editarExistente(item)}
                      className="flex-1 py-1 text-[9px] text-white/45 hover:bg-white/5 hover:text-white/70"
                    >
                      {t('editor.fondo.ajustar', 'Ajustar')}
                    </button>
                    <button
                      type="button"
                      onClick={() => void borrar(item.id!)}
                      className="flex-1 border-l border-white/10 py-1 text-[9px] text-red-300/70 hover:bg-red-500/10"
                    >
                      {t('editor.fondo.borrar', 'Borrar')}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
        {t('editor.fondo.presets', 'Fondos predefinidos')}
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {FONDOS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => void setFondoId(f.id)}
            className="flex flex-col items-start gap-1 rounded-lg border px-2 py-2 text-left transition"
            style={{
              borderColor:
                fondoImagenActivo == null && fondoId === f.id
                  ? 'rgba(52,211,153,0.6)'
                  : 'rgba(255,255,255,0.08)',
              background:
                fondoImagenActivo == null && fondoId === f.id
                  ? 'rgba(52,211,153,0.12)'
                  : 'rgba(255,255,255,0.04)',
            }}
            title={f.tema ? `Sugerido para tema ${f.tema}` : undefined}
          >
            <span className="flex items-center gap-1.5 text-sm">
              <span>{f.icon}</span>
              <span className="text-white/85 font-medium">{f.nombre}</span>
            </span>
            <span
              className="h-2 w-full rounded-sm"
              style={{
                background: `linear-gradient(90deg, ${f.gradiente[0]}, ${f.gradiente[1]})`,
              }}
            />
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2.5">
        <div>
          <p className="text-sm font-semibold">{t('editor.fondo.anim', 'Microanimaciones')}</p>
          <p className="text-[10px] text-white/45 leading-snug">
            {temaGlobal
              ? t('editor.fondo.animActivo', `Activas con tema ${temaNombre ?? temaGlobal} (cometas, dragones, nieve…)`, {
                  tema: temaNombre ?? temaGlobal ?? '',
                })
              : t('editor.fondo.animDesc', 'Elige un tema para ver animaciones en el cielo')}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={animacionesFondo}
          onClick={() => void setAnimacionesFondo(!animacionesFondo)}
          className={[
            'relative h-7 w-12 flex-shrink-0 rounded-full transition',
            animacionesFondo ? 'bg-emerald-500' : 'bg-white/15',
          ].join(' ')}
        >
          <span
            className={[
              'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition',
              animacionesFondo ? 'left-[22px]' : 'left-0.5',
            ].join(' ')}
          />
        </button>
      </div>
    </div>
  )
}
