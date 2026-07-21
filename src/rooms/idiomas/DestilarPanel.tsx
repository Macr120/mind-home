import { useEffect, useState } from 'react'
import type { PerfilIdioma } from '../../core/data/db'
import type { MensajeIA } from '../../core/chat/ia'
import { conversacionesIdiomaRepo, tarjetasIdiomaRepo } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { COLOR } from './constantes'
import { extraerTarjetas, type TarjetaPropuesta } from './tutor'
import { hoyISO } from './stats'

interface Propuesta extends TarjetaPropuesta {
  sel: boolean
}

/**
 * Panel 🃏: la IA extrae el vocabulario de la charla y el usuario elige qué
 * tarjetas guardar. TODA salida marca `destiladaEn` para que el ofrecimiento
 * al salir no vuelva a preguntar.
 */
export function DestilarPanel({ perfil, conversacionId, temaId, mensajes, onManual, onCerrar }: {
  perfil: PerfilIdioma
  conversacionId: number
  /** Tema de la charla: se hereda a las tarjetas extraídas. */
  temaId?: string
  mensajes: MensajeIA[]
  /** Fallback si la IA falla: el caller abre el form de tarjeta manual. */
  onManual: () => void
  onCerrar: () => void
}) {
  const t = useT()
  const [propuestas, setPropuestas] = useState<Propuesta[] | null>(null)
  const [fallo, setFallo] = useState(false)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    let vivo = true
    const cargar = async () => {
      try {
        const existentes = (await tarjetasIdiomaRepo.list())
          .filter((x) => x.idiomaId === perfil.id)
          .map((x) => x.termino)
        const r = await extraerTarjetas(mensajes, { nombre: perfil.nombre, nivel: perfil.nivel }, existentes)
        if (vivo) setPropuestas(r.map((x) => ({ ...x, sel: true })))
      } catch {
        if (vivo) {
          setPropuestas([])
          setFallo(true)
        }
      }
    }
    void cargar()
    return () => {
      vivo = false
    }
    // Solo al montar: el panel se abre con la charla ya completa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const marcar = () =>
    conversacionesIdiomaRepo.update(conversacionId, { destiladaEn: new Date().toISOString() })

  const cerrar = async () => {
    if (ocupado) return
    await marcar()
    onCerrar()
  }

  const guardar = async () => {
    const elegidas = (propuestas ?? []).filter((p) => p.sel)
    const idiomaId = perfil.id
    if (!elegidas.length || ocupado || idiomaId == null) return
    setOcupado(true)
    const ahora = new Date().toISOString()
    const hoy = hoyISO()
    await tarjetasIdiomaRepo.bulkAdd(
      elegidas.map((p) => ({
        termino: p.termino,
        traduccion: p.traduccion,
        ejemplo: p.ejemplo,
        tipo: p.tipo,
        nivel: p.nivel,
        idiomaId,
        temaId,
        caja: 0,
        proximaISO: hoy,
        fuente: 'charla' as const,
        creadoEn: ahora,
      })),
    )
    await marcar()
    onCerrar()
  }

  const nSel = (propuestas ?? []).filter((p) => p.sel).length

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => void cerrar()}>
      <div
        className="ui-panel max-h-[85vh] w-full max-w-md space-y-3 overflow-y-auto rounded-2xl border border-white/10 p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">
            <Icono nombre="registros" /> {t('idiomas.dest.titulo', 'Vocabulario de la charla')}
          </p>
          <button
            type="button"
            onClick={() => void cerrar()}
            className="rounded px-2 py-1 text-sm text-white/40 transition hover:bg-white/10 hover:text-white/80"
          >
            ✕
          </button>
        </div>

        {propuestas === null && (
          <p className="animate-pulse px-2 py-6 text-center text-sm text-white/50">
            <Icono nombre="reloj-arena" /> {t('idiomas.dest.cargando', 'Buscando vocabulario nuevo en la charla…')}
          </p>
        )}

        {fallo && (
          <div className="space-y-3">
            <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200/90">
              {t('idiomas.dest.fallo', 'La IA no pudo extraer vocabulario (o no encontró nada nuevo).')}
            </p>
            <button
              type="button"
              onClick={() => {
                void marcar()
                onCerrar()
                onManual()
              }}
              className="w-full rounded-xl bg-white/10 py-2 text-sm font-semibold transition hover:bg-white/15"
            >
              {t('idiomas.dest.aMano', 'Crear una tarjeta a mano')}
            </button>
          </div>
        )}

        {propuestas !== null && !fallo && (
          <>
            <p className="text-xs leading-relaxed text-white/45">
              {t('idiomas.dest.desc', 'Esto apareció en la charla y aún no está en tu vocabulario:')}
            </p>
            {propuestas.map((p, i) => (
              <label key={i} className="flex items-start gap-2 rounded-lg bg-black/20 px-2.5 py-2">
                <input
                  type="checkbox"
                  checked={p.sel}
                  onChange={() =>
                    setPropuestas((prev) => (prev ?? []).map((x, j) => (j === i ? { ...x, sel: !x.sel } : x)))
                  }
                  className="mt-1 shrink-0"
                  style={{ accentColor: COLOR }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-white/90">
                    {p.termino} <span className="text-white/40">— {p.traduccion}</span>
                  </span>
                  {p.ejemplo && <span className="block text-[10px] leading-snug text-white/40">{p.ejemplo}</span>}
                </span>
                <span className="shrink-0 text-[9px] uppercase text-white/30">{p.nivel}</span>
              </label>
            ))}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => void cerrar()}
                className="rounded-xl bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
              >
                {t('idiomas.dest.ahoraNo', 'Ahora no')}
              </button>
              <button
                type="button"
                onClick={() => void guardar()}
                disabled={nSel === 0 || ocupado}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
                style={{ background: COLOR }}
              >
                {t('idiomas.dest.guardar', 'Guardar {n} tarjetas', { n: String(nSel) })}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
