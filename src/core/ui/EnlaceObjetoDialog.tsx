import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useEnlaceObjeto } from '../state/enlaceObjetoStore'
import { useDiseño, objetoPorId } from '../state/disenoStore'
import { useVisitasDeUrl } from '../data/repository'
import { normalizarUrl, hostDe, faviconDe } from '../enlaces'
import { fechaLocalISO, addDias } from '../fechaLocal'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'

/**
 * Diálogo «Enlace web» de un objeto del mapa: pega la dirección, un nombre
 * opcional y listo — tocar el objeto sacará su burbuja «Visitar». Si el objeto
 * ya tenía enlace, muestra además sus estadísticas de visitas.
 *
 * Cáscara + interior (como `AsignarPlantillaDialog`): montado siempre en
 * App.tsx, el interior solo con el diálogo abierto. La `key` por objeto
 * reinicia los inputs sin efectos de sincronización.
 */
export function EnlaceObjetoDialog() {
  const objetoId = useEnlaceObjeto((s) => s.objetoId)
  if (objetoId == null) return null
  return <EnlaceObjetoInterior key={objetoId} objetoId={objetoId} />
}

function EnlaceObjetoInterior({ objetoId }: { objetoId: number }) {
  const t = useT()
  const cerrar = useEnlaceObjeto((s) => s.cerrar)
  const datos = useDiseño(
    useShallow((s) => {
      const o = objetoPorId(s.objetos, objetoId)
      return o ? { url: o.enlaceUrl ?? '', nombre: o.nombre ?? '' } : null
    }),
  )
  const [url, setUrl] = useState(datos?.url ?? '')
  const [nombre, setNombre] = useState(datos?.nombre ?? '')
  const [invalida, setInvalida] = useState(false)

  // Si el objeto desapareció (lo borró el sync, otra pestaña…), el diálogo se va con él.
  useEffect(() => {
    if (!datos) cerrar()
  }, [datos, cerrar])

  // Escape en `document`, como en ConfirmarDialog (en el panel se pierde con el foco).
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar()
    }
    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  }, [cerrar])

  if (!datos) return null

  const normalizada = normalizarUrl(url)

  const guardar = async () => {
    if (!normalizada) {
      setInvalida(true)
      return
    }
    await useDiseño.getState().setObjetoEnlace(objetoId, normalizada, nombre.trim())
    cerrar()
  }

  const quitar = async () => {
    await useDiseño.getState().setObjetoEnlace(objetoId, null)
    cerrar()
  }

  return (
    <div className="ui-scrim z-[70] flex items-center justify-center p-4" onClick={cerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('enlace.titulo', 'Enlace web')}
        className="ui-panel ui-pop w-full max-w-md rounded-2xl border border-white/10 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xl">
            <Icono nombre="vincular" />
          </span>
          <div className="min-w-0">
            <p className="text-base font-black">{t('enlace.titulo', 'Enlace web')}</p>
            <p className="text-[11px] text-white/45">
              {t('enlace.explica', 'Tocar el objeto abrirá esta página')}
            </p>
          </div>
          <button
            onClick={cerrar}
            title={t('rutinas.cerrar', 'Cerrar')}
            className="ms-auto shrink-0 rounded-lg px-2 py-1 text-white/40 transition hover:bg-white/10 hover:text-white/80"
          >
            <Icono nombre="cerrar" />
          </button>
        </header>

        <label className="mb-1 block text-[11px] font-semibold text-white/55">
          {t('enlace.url', 'Dirección de la página')}
        </label>
        <input
          autoFocus
          value={url}
          inputMode="url"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="https://…"
          onChange={(e) => {
            setUrl(e.target.value)
            setInvalida(false)
          }}
          onKeyDown={(e) => e.key === 'Enter' && void guardar()}
          className={`mb-1 w-full rounded-xl border bg-black/30 px-3 py-2 text-sm text-white/90 outline-none focus:border-white/35 ${
            invalida ? 'border-red-400/60' : 'border-white/15'
          }`}
        />
        {invalida ? (
          <p className="mb-3 text-[11px] font-medium text-red-400">
            {t('enlace.invalida', 'Esa dirección no parece válida')}
          </p>
        ) : (
          <p className="mb-3 flex min-h-4 items-center gap-1.5 text-[11px] text-white/45">
            {normalizada && (
              <>
                <FaviconMini key={normalizada} url={normalizada} />
                {hostDe(normalizada)}
              </>
            )}
          </p>
        )}

        <label className="mb-1 block text-[11px] font-semibold text-white/55">
          {t('enlace.nombre', 'Nombre (opcional)')}
        </label>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void guardar()}
          className="mb-4 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white/90 outline-none focus:border-white/35"
        />

        {datos.url && <EstadisticasEnlace url={datos.url} />}

        <div className="flex gap-2">
          {datos.url && (
            <button
              onClick={() => void quitar()}
              className="flex-1 rounded-xl border border-red-400/30 bg-red-400/10 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-400/20"
            >
              {t('enlace.quitar', 'Quitar enlace')}
            </button>
          )}
          <button
            onClick={cerrar}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2 text-sm font-semibold transition hover:bg-white/10"
          >
            {t('ui.cancelar', 'Cancelar')}
          </button>
          <button
            onClick={() => void guardar()}
            disabled={esPrograma ? !programa : !url.trim()}
            className="flex-1 rounded-xl border border-emerald-400/30 bg-emerald-400/10 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-400/20 disabled:opacity-40"
          >
            {t('ui.guardar', 'Guardar')}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Las visitas del enlace GUARDADO: chips de la semana y del total más una
 * barrita por día (últimos 7). La duración solo existe donde el navegador
 * in-app avisa del cierre (Android/iOS); sin minutos, el chip solo cuenta.
 */
function EstadisticasEnlace({ url }: { url: string }) {
  const t = useT()
  const visitas = useVisitasDeUrl(url)
  if (!visitas) return null

  const dias = [...Array(7)].map((_, i) => fechaLocalISO(addDias(new Date(), i - 6)))
  const porDia = new Map(dias.map((d) => [d, 0]))
  let semana = 0
  let semanaSeg = 0
  for (const v of visitas) {
    const dia = fechaLocalISO(new Date(v.inicio))
    const n = porDia.get(dia)
    if (n == null) continue
    porDia.set(dia, n + 1)
    semana++
    semanaSeg += v.duracionSeg ?? 0
  }
  const min = Math.round(semanaSeg / 60)
  const tope = Math.max(1, ...porDia.values())

  return (
    <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-3">
      {visitas.length === 0 ? (
        <p className="text-[11px] text-white/45">{t('enlace.sinVisitas', 'Aún sin visitas')}</p>
      ) : (
        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-white/45">{t('enlace.visitasSemana', 'Esta semana')}</p>
            <p className="text-sm font-black text-white/90">
              {semana}
              {min > 0 && <span className="font-semibold text-white/55"> · {min} {t('enlace.min', 'min')}</span>}
            </p>
            <p className="mt-1 text-[11px] text-white/45">
              {t('enlace.visitasTotal', 'Total')}: <span className="font-semibold text-white/70">{visitas.length}</span>
            </p>
          </div>
          {/* La semana en barras, de hace 6 días a hoy. */}
          <div className="flex h-10 items-end gap-1" aria-hidden>
            {dias.map((d) => (
              <span
                key={d}
                className="w-2 rounded-sm bg-emerald-400/70"
                style={{ height: `${Math.max(8, ((porDia.get(d) ?? 0) / tope) * 100)}%`, opacity: (porDia.get(d) ?? 0) > 0 ? 1 : 0.25 }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/** Favicon pequeño de la vista previa (se esconde si no carga). */
function FaviconMini({ url }: { url: string }) {
  const [fallo, setFallo] = useState(false)
  const src = faviconDe(url)
  if (!src || fallo) return null
  return <img src={src} alt="" aria-hidden draggable={false} className="h-3.5 w-3.5 rounded-xs" onError={() => setFallo(true)} />
}
