import { useState } from 'react'
import { iaActiva } from '../../core/chat/ia'
import type { CarpetaIdea, Idea, PuntoIdea } from '../../core/data/db'
import { ideasRepo } from '../../core/data/repository'
import { fechaLocalISO } from '../../core/fechaLocal'
import { useT } from '../../core/i18n/useT'
import { Creditos } from '../../core/ui/Creditos'
import { Icono } from '../../core/ui/iconos/Icono'
import { vivo } from '../../core/ui/estilos'
import { COLOR } from './constantes'
import { OP_EXPANDIR } from './costosIA'
import { desarrollarIdea, ideasComplementarias } from './ia'
import { EntradasQueUsan } from '../_shared/EntradasQueUsan'
import { MoverIdeaDialog } from './MoverIdeaDialog'
import { PanelSugerencias } from './PanelSugerencias'

/** Id estable de un punto: dos puntos con el mismo texto se editan sin confundirse. */
function nuevoPuntoId(): string {
  return `pt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

/**
 * Una idea abierta: su título y la LISTA de puntos que la desarrollan.
 *
 * Los puntos van embebidos en la fila (`Idea.puntos`), así que cada operación
 * —añadir, palomear, reordenar, borrar— es UNA escritura. El campo viejo
 * `detalle` se conserva y se puede convertir en puntos de un toque.
 */
export function IdeaDetalle({
  idea,
  /** Las otras ideas de la misma carpeta: contexto de «complementarias». */
  hermanas,
  carpetas,
  onCerrar,
}: {
  idea: Idea
  hermanas: Idea[]
  carpetas: CarpetaIdea[]
  onCerrar: () => void
}) {
  const t = useT()
  const [nuevo, setNuevo] = useState('')
  const [pidiendo, setPidiendo] = useState<'puntos' | 'hermanas' | null>(null)
  const [encarpetando, setEncarpetando] = useState(false)

  const puntos = idea.puntos ?? []
  const conIA = iaActiva()
  const nombreCarpeta = carpetas.find((c) => c.carpetaId === idea.carpetaId)?.nombre

  const guardar = async (cambios: Partial<Idea>) => {
    if (idea.id != null) await ideasRepo.update(idea.id, cambios)
  }
  const guardarPuntos = (ps: PuntoIdea[]) => guardar({ puntos: ps })

  const agregar = async (textos: string[]) => {
    const limpios = textos.map((x) => x.trim()).filter(Boolean)
    if (!limpios.length) return
    await guardarPuntos([...puntos, ...limpios.map((texto) => ({ puntoId: nuevoPuntoId(), texto }))])
  }

  const desplazar = (i: number, delta: number) => {
    const j = i + delta
    if (j < 0 || j >= puntos.length) return
    const orden = [...puntos]
    ;[orden[i], orden[j]] = [orden[j], orden[i]]
    void guardarPuntos(orden)
  }

  const btnIcono = 'shrink-0 rounded px-1 py-0.5 text-[11px] text-white/25 transition hover:text-white/80'

  return (
    // La idea abierta ocupa TODA la hoja (la lista del diario sí va acotada):
    // es la pantalla donde se trabaja, y los puntos se leen mejor anchos. Los
    // botones de IA no se estiran con ella: llevan ancho propio.
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onCerrar}
          className="text-xs text-white/50 transition hover:text-white/80"
        >
          ← {t('ideas.detalle.volver', 'Volver al diario')}
        </button>
        <button
          type="button"
          onClick={() => setEncarpetando(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] text-white/60 transition hover:bg-white/10 hover:text-white/90"
          title={t('ideas.diario.encarpetar', 'Guardarla en una carpeta')}
        >
          <Icono nombre="carpeta" />
          <span className="max-w-[10rem] truncate">
            {nombreCarpeta ?? t('ideas.mover.raiz', 'Suelta en el diario')}
          </span>
        </button>
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={() => void guardar({ favorita: !idea.favorita })}
            className={`mt-0.5 shrink-0 transition ${idea.favorita ? 'texto-vivo' : 'text-white/25 hover:text-white/60'}`}
            style={idea.favorita ? vivo(COLOR) : undefined}
            title={t('ideas.diario.destacar', 'Destacar')}
            aria-label={t('ideas.diario.destacar', 'Destacar')}
          >
            <Icono nombre="estrella" />
          </button>
          <input
            defaultValue={idea.texto}
            onBlur={(e) => {
              const tx = e.target.value.trim()
              if (tx && tx !== idea.texto) void guardar({ texto: tx })
            }}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-base font-semibold outline-none focus:border-white/15"
          />
        </div>

        <EntradasQueUsan tipo="idea" id={idea.id} />

        <ul className="space-y-1.5">
          {puntos.map((p, i) => (
            <li key={p.puntoId} className="flex items-start gap-2 rounded-lg bg-black/20 px-2.5 py-1.5">
              <input
                type="checkbox"
                checked={p.hecho === true}
                onChange={() =>
                  void guardarPuntos(puntos.map((x) => (x.puntoId === p.puntoId ? { ...x, hecho: !x.hecho } : x)))
                }
                className="mt-1 shrink-0"
                style={{ accentColor: COLOR }}
                title={t('ideas.detalle.resuelto', 'Resuelto o descartado')}
              />
              <input
                defaultValue={p.texto}
                onBlur={(e) => {
                  const tx = e.target.value.trim()
                  if (!tx) return
                  if (tx !== p.texto) {
                    void guardarPuntos(puntos.map((x) => (x.puntoId === p.puntoId ? { ...x, texto: tx } : x)))
                  }
                }}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                className={`min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm outline-none focus:border-white/15 ${
                  p.hecho ? 'text-white/35 line-through' : ''
                }`}
              />
              <button
                type="button"
                onClick={() => desplazar(i, -1)}
                disabled={i === 0}
                className={`${btnIcono} disabled:opacity-20`}
                title={t('ideas.detalle.subir', 'Subir')}
                aria-label={t('ideas.detalle.subir', 'Subir')}
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => desplazar(i, 1)}
                disabled={i === puntos.length - 1}
                className={`${btnIcono} disabled:opacity-20`}
                title={t('ideas.detalle.bajar', 'Bajar')}
                aria-label={t('ideas.detalle.bajar', 'Bajar')}
              >
                ▼
              </button>
              <button
                type="button"
                onClick={() => void guardarPuntos(puntos.filter((x) => x.puntoId !== p.puntoId))}
                className={`${btnIcono} hover:text-red-400`}
                title={t('ideas.borrar', 'Borrar')}
                aria-label={t('ideas.borrar', 'Borrar')}
              >
                <Icono nombre="basura" />
              </button>
            </li>
          ))}
        </ul>

        <div className="flex gap-2">
          <input
            value={nuevo}
            onChange={(e) => setNuevo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' || !nuevo.trim()) return
              void agregar([nuevo])
              setNuevo('')
            }}
            placeholder={t('ideas.detalle.nuevoPunto', 'Añade un punto…')}
            className="min-w-0 flex-1 rounded-xl border border-white/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={() => {
              void agregar([nuevo])
              setNuevo('')
            }}
            disabled={!nuevo.trim()}
            className="ui-accent-bg rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-40"
          >
            <Icono nombre="agregar" />
          </button>
        </div>

        {/* El `detalle` de las ideas viejas se conserva y se convierte cuando quieras:
            así los puntos no necesitaron ninguna migración de la base. */}
        {idea.detalle && (
          <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-2.5">
            <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-white/45">{idea.detalle}</p>
            <button
              type="button"
              onClick={() =>
                void (async () => {
                  const lineas = idea.detalle!.split('\n').map((x) => x.replace(/^[-*·•\s]+/, '').trim())
                  await guardar({
                    puntos: [
                      ...puntos,
                      ...lineas.filter(Boolean).map((texto) => ({ puntoId: nuevoPuntoId(), texto })),
                    ],
                    detalle: undefined,
                  })
                })()
              }
              className="rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] text-white/70 transition hover:bg-white/10"
            >
              <Icono nombre="lista" /> {t('ideas.detalle.convertir', 'Convertir en puntos')}
            </button>
          </div>
        )}

        {conIA && (
          <div className="flex flex-wrap gap-2 border-t border-white/10 pt-2.5">
            <button
              type="button"
              onClick={() => setPidiendo('puntos')}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/5 sm:w-64"
            >
              <Icono nombre="brillo" /> {t('ideas.detalle.desarrollar', 'Desarrollar')}
              <Creditos op={OP_EXPANDIR} />
            </button>
            <button
              type="button"
              onClick={() => setPidiendo('hermanas')}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/5 sm:w-64"
            >
              <Icono nombre="nodos" /> {t('ideas.detalle.complementarias', 'Ideas complementarias')}
              <Creditos op={OP_EXPANDIR} />
            </button>
          </div>
        )}
      </div>

      {pidiendo === 'puntos' && (
        <PanelSugerencias
          titulo={t('ideas.detalle.desarrollar', 'Desarrollar')}
          descripcion={t('ideas.detalle.desarrollarDesc', 'Puntos que desarrollan «{idea}»:', { idea: idea.texto })}
          cargar={() => desarrollarIdea({ texto: idea.texto, puntos: puntos.map((p) => p.texto) })}
          onAceptar={agregar}
          onCerrar={() => setPidiendo(null)}
        />
      )}

      {pidiendo === 'hermanas' && (
        <PanelSugerencias
          titulo={t('ideas.detalle.complementarias', 'Ideas complementarias')}
          descripcion={t('ideas.detalle.complementariasDesc', 'Ideas nuevas que acompañan a «{idea}»:', {
            idea: idea.texto,
          })}
          cargar={() =>
            ideasComplementarias({
              idea: idea.texto,
              carpeta: nombreCarpeta,
              hermanas: hermanas.map((h) => h.texto),
            })
          }
          onAceptar={async (textos) => {
            // Nacen en la MISMA carpeta (y en la misma lluvia, si la había).
            const ahora = new Date().toISOString()
            await ideasRepo.bulkAdd(
              textos.map((texto) => ({
                texto,
                ...(idea.carpetaId ? { carpetaId: idea.carpetaId } : {}),
                ...(idea.tema ? { tema: idea.tema } : {}),
                fecha: fechaLocalISO(),
                creadoEn: ahora,
              })),
            )
          }}
          onCerrar={() => setPidiendo(null)}
        />
      )}

      {encarpetando && (
        <MoverIdeaDialog
          carpetas={carpetas}
          actual={idea.carpetaId ?? ''}
          titulo={t('ideas.diario.encarpetarTit', 'Guardar «{idea}» en…', { idea: idea.texto })}
          onElegir={async (carpetaId) => {
            await guardar({ carpetaId: carpetaId || undefined })
            setEncarpetando(false)
          }}
          onCerrar={() => setEncarpetando(false)}
        />
      )}
    </div>
  )
}
