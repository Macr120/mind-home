import { useEffect, useRef, useState } from 'react'
import { useDiseño } from '../../state/disenoStore'
import { useCiclo } from '../../state/cicloStore'
import { FONDOS, ANIMACIONES, TEMA_DE_VIAJE, animacionesDeFondo, getFondo } from '../../house/fondos'
import { getTema } from '../../house/temas'
import { useEditorUi } from '../../state/editorUiStore'
import type { FondoImagen } from '../../data/db'
import type { AjusteFondoImagen } from '../../house/fondosImagen'
import { AJUSTE_FONDO_DEFAULT, ajusteADb, ajusteDesdeDb, escalaCubrir, medirImagen } from '../../house/fondosImagen'
import { useT } from '../../i18n/useT'
import { Icono } from '../iconos/Icono'
import { IconoMarca } from '../iconos/glifosApps'
import { ColorPicker } from '../comun/ColorPicker'
import { EditorFondoImagenPreview } from './EditorFondoImagenPreview'
import { GenerarTexturaIA } from './GenerarTexturaIA'

function MiniaturaFondo({ item }: { item: FondoImagen }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    const u = URL.createObjectURL(item.imagen)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- la URL debe nacer en el efecto: con useMemo el remount de StrictMode la reutilizaría ya revocada
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [item.imagen])
  if (!url) return <div className="h-full w-full bg-white/5" />
  return (
    <img src={url} alt="" className="h-full w-full object-cover" draggable={false} />
  )
}

/** Pastilla de una microanimación (o del modo automático). */
function BotonAnim({
  activo,
  icono,
  texto,
  onClick,
}: {
  activo: boolean
  icono: string
  texto: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] transition"
      style={{
        borderColor: activo
          ? 'rgba(52,211,153,0.6)'
          : 'color-mix(in srgb, var(--ui-ink) 8%, transparent)',
        background: activo
          ? 'rgba(52,211,153,0.12)'
          : 'color-mix(in srgb, var(--ui-ink) 4%, transparent)',
      }}
    >
      <span className="flex-shrink-0"><Icono emoji={icono} /></span>
      <span className={activo ? 'text-white/85' : 'text-white/55'}>{texto}</span>
    </button>
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
    fondoColorFijo,
    fondoImagenActivo,
    fondosImagen,
    setFondoId,
    setFondoColorFijo,
    setFondoImagenActivo,
    agregarFondoImagen,
    actualizarFondoImagen,
    eliminarFondoImagen,
    animacionesFondo,
    setAnimacionesFondo,
    animacionesIntensidad,
    setAnimacionesIntensidad,
    animacionesIds,
    setAnimacionesIds,
  } = useDiseño()
  const setTemaOverride = useDiseño((s) => s.setTemaOverride)
  useDiseño((s) => s.temaRev)
  const setPrevia = useEditorUi((s) => s.setPreviaEscenario)
  // Fondo en movimiento activo: su barra de velocidad guarda en el tema dinámico del vehículo.
  const viaje = fondoImagenActivo == null ? getFondo(fondoId).viaje : undefined
  const temaViaje = viaje ? TEMA_DE_VIAJE[viaje] : null
  const velocidadViaje = (temaViaje && getTema(temaViaje)?.velocidadEscenario) ?? 1
  const deNoche = useCiclo((s) => s.minutos < 6 * 60 || s.minutos >= 19 * 60)
  const colorFijoActivo = fondoImagenActivo == null && fondoId === 'color_fijo'
  // En automático se marcan las que sugiere el fondo: al tocar una se parte de ahí.
  const activas =
    animacionesIds ??
    (fondoImagenActivo != null ? [] : animacionesDeFondo(getFondo(fondoId), deNoche))

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

  /** Abre el borrador de ajuste con una imagen recién llegada (del disco o de la IA). */
  const abrirBorrador = (blob: Blob, nombre: string) => {
    cerrarBorrador()
    setBorrador({
      blob,
      url: URL.createObjectURL(blob),
      nombre,
      ajuste: { ...AJUSTE_FONDO_DEFAULT },
    })
    // Por defecto la imagen cubre la pantalla completa (sin bandas a los lados).
    void medirImagen(blob)
      .then(({ ancho, alto }) =>
        setBorrador((prev) =>
          prev && prev.blob === blob
            ? { ...prev, ajuste: { ...prev.ajuste, escala: escalaCubrir(ancho, alto, window.innerWidth, window.innerHeight) } }
            : prev,
        ),
      )
      .catch(() => {})
  }

  const onArchivo = (file: File | undefined) => {
    if (!file?.type.startsWith('image/')) return
    abrirBorrador(file, file.name.replace(/\.[^.]+$/, '').slice(0, 32) || 'Mi fondo')
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

  const tarjetaFondo = (f: (typeof FONDOS)[number]) => (
    <button
      key={f.id}
      type="button"
      onClick={() => void setFondoId(f.id)}
      className="flex flex-col items-start gap-1 rounded-lg border px-2 py-2 text-start transition"
      style={{
        borderColor:
          fondoImagenActivo == null && fondoId === f.id
            ? 'rgba(52,211,153,0.6)'
            : 'color-mix(in srgb, var(--ui-ink) 8%, transparent)',
        background:
          fondoImagenActivo == null && fondoId === f.id
            ? 'rgba(52,211,153,0.12)'
            : 'color-mix(in srgb, var(--ui-ink) 4%, transparent)',
      }}
      title={f.tema ? t('editor.fondo.sugerido', 'Sugerido para el tema {tema}', { tema: t(`tema.${f.tema}`, f.tema) }) : undefined}
    >
      <span className="flex items-center gap-1.5 text-sm">
        <span><Icono emoji={f.icon} /></span>
        <span className="text-white/85 font-medium">{t(`fondo.${f.id}`, f.nombre)}</span>
      </span>
      <span
        className="h-2 w-full rounded-sm"
        style={{
          background: `linear-gradient(90deg, ${f.gradiente[0]}, ${f.gradiente[1]})`,
        }}
      />
    </button>
  )

  /** Paisaje 3D: miniatura con su cielo arriba y su suelo abajo. */
  const tarjetaPaisaje = (f: (typeof FONDOS)[number]) => {
    const activo = fondoImagenActivo == null && fondoId === f.id
    return (
      <button
        key={f.id}
        type="button"
        onClick={() => {
          void setFondoId(f.id)
          // En el editor el vehículo se ve en marcha al elegirlo (si no, vuelve el plano).
          setPrevia(!!f.viaje)
        }}
        className="overflow-hidden rounded-lg border text-start transition"
        style={{
          borderColor: activo ? 'rgba(52,211,153,0.7)' : 'color-mix(in srgb, var(--ui-ink) 8%, transparent)',
          background: activo ? 'rgba(52,211,153,0.12)' : 'color-mix(in srgb, var(--ui-ink) 4%, transparent)',
        }}
      >
        <span
          className="flex aspect-video w-full items-end justify-center pb-1 text-2xl"
          style={{
            background: `linear-gradient(180deg, ${f.gradiente[0]} 0%, ${f.gradiente[1]} 58%, ${f.suelo ?? f.gradiente[1]} 58%, ${f.suelo ?? f.gradiente[1]} 100%)`,
          }}
        >
          <IconoMarca emoji={f.icon} size="1em" />
        </span>
        <span className="block truncate px-2 py-1 text-[11px] font-medium text-white/80">
          {activo ? '✓ ' : ''}
          {t(`fondo.${f.id}`, f.nombre)}
        </span>
      </button>
    )
  }

  return (
    <div className={embed ? 'space-y-3' : 'rounded-xl border border-white/10 bg-white/5 p-3 space-y-3'}>
      {!embed && <p className="text-sm font-semibold">{t('editor.fondo.titulo', 'Fondo de cielo')}</p>}
      <p className="text-[11px] leading-snug text-white/45">
        {t('editor.fondo.desc', 'Se elige automáticamente al cambiar el tema. También puedes cambiarlo a mano.')}
      </p>

      <div className="space-y-2 rounded-lg border border-white/10 bg-black/15 p-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
          {t('editor.fondo.paisajes', 'Paisajes completos')}
        </p>
        <p className="text-[10px] leading-snug text-white/45">
          {t('editor.fondo.paisajesDesc', 'El suelo, el mar o el cielo alrededor de la casa, como en los temas dinámicos pero quietos.')}
        </p>
        <div className="grid grid-cols-2 gap-1.5">{FONDOS.filter((f) => f.escena).map(tarjetaPaisaje)}</div>

        <p className="pt-1 text-[10px] font-semibold uppercase tracking-wide text-white/40">
          {t('editor.fondo.enMovimiento', 'En movimiento')}
        </p>
        <p className="text-[10px] leading-snug text-white/45">
          {t('editor.fondo.enMovimientoDesc', 'La casa viaja en un vehículo y el paisaje corre. Solo cambia el fondo: muros, pisos y lo demás siguen siendo los de tu tema.')}
        </p>
        <div className="grid grid-cols-2 gap-1.5">{FONDOS.filter((f) => f.viaje).map(tarjetaPaisaje)}</div>
        {temaViaje && (
          <div className="space-y-0.5 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            <div className="flex items-center justify-between text-xs text-white/70">
              <span>{t('editor.tema.velocidad', 'Velocidad')}</span>
              <span className="tabular-nums text-white/50">
                {velocidadViaje === 0 ? t('editor.tema.parado', 'Parado') : `×${velocidadViaje.toFixed(1)}`}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={3}
              step={0.1}
              value={velocidadViaje}
              onChange={(e) => {
                setPrevia(true)
                void setTemaOverride(temaViaje, { velocidadEscenario: parseFloat(e.target.value) })
              }}
              aria-label={t('editor.tema.velocidad', 'Velocidad')}
              className="w-full accent-emerald-400"
            />
          </div>
        )}
      </div>

      <div className="space-y-2 rounded-lg border border-white/10 bg-black/15 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
            {t('editor.fondo.misImagenes', 'Mis imágenes')}
          </p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-bold texto-cta hover:bg-emerald-600"
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

        <GenerarTexturaIA
          superficie="fondo"
          onGenerada={(blob) => abrirBorrador(blob, t('editor.fondo.nombreIA', 'Fondo con IA'))}
        />

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
                    className="block w-full text-start"
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
                      className="flex-1 border-s border-white/10 py-1 text-[9px] text-red-400/70 hover:bg-red-500/10"
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

      <div
        className="space-y-2 rounded-lg border p-2.5"
        style={{
          borderColor: colorFijoActivo ? 'rgba(52,211,153,0.6)' : 'rgba(255,255,255,0.1)',
          background: colorFijoActivo ? 'rgba(52,211,153,0.1)' : 'rgba(0,0,0,0.15)',
        }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
          {colorFijoActivo ? '✓ ' : ''}
          {t('editor.fondo.colorFijo', 'Color fijo')}
        </p>
        <p className="text-[10px] leading-snug text-white/45">
          {t('editor.fondo.colorFijoDesc', 'Un color sólido para el cielo que no cambia con la hora del día.')}
        </p>
        <ColorPicker value={fondoColorFijo} onChange={(c) => void setFondoColorFijo(c)} />
      </div>

      <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
        {t('editor.fondo.presets', 'Fondos predefinidos')}
      </p>
      <div className="grid grid-cols-2 gap-1.5">{FONDOS.filter((f) => !f.escena && !f.viaje).map(tarjetaFondo)}</div>

      <div className="space-y-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">{t('editor.fondo.anim', 'Microanimaciones')}</p>
            <p className="text-[10px] text-white/45 leading-snug">
              {t('editor.fondo.animDesc', 'Elige cuáles quieres en el cielo o déjalo en automático')}
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
                animacionesFondo ? 'start-[22px]' : 'start-0.5',
              ].join(' ')}
            />
          </button>
        </div>

        {animacionesFondo && (
          <>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/45">
                  {t('editor.fondo.animIntensidad', 'Intensidad')}
                </span>
                <span className="text-[10px] tabular-nums text-white/40">
                  {Math.round(animacionesIntensidad * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={animacionesIntensidad}
                onChange={(e) => void setAnimacionesIntensidad(parseFloat(e.target.value))}
                className="mt-1 w-full accent-emerald-400"
              />
            </div>

            <div className="space-y-2 rounded-lg border border-white/10 bg-black/15 p-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
                {t('editor.fondo.animTipo', 'Tipo de animación')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                <BotonAnim
                  activo={animacionesIds == null}
                  icono="🔄"
                  texto={t('editor.fondo.animAuto', 'Automático')}
                  onClick={() => void setAnimacionesIds(null)}
                />
                {ANIMACIONES.map((a) => (
                  <BotonAnim
                    key={a.id}
                    activo={activas.includes(a.id)}
                    icono={a.icon}
                    texto={t(`anim.${a.id}`, a.nombre)}
                    onClick={() =>
                      void setAnimacionesIds(
                        activas.includes(a.id)
                          ? activas.filter((id) => id !== a.id)
                          : [...activas, a.id],
                      )
                    }
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
