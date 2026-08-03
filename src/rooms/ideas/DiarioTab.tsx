import { useState } from 'react'
import { iaActiva } from '../../core/chat/ia'
import type { Idea } from '../../core/data/db'
import { ideasRepo } from '../../core/data/repository'
import { fechaLocalISO } from '../../core/fechaLocal'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { vivo } from '../../core/ui/estilos'
import { Archivador, CarpetasPorEtiqueta } from '../_shared/Archivador'
import { COLOR } from './constantes'
import { crearMapaDesdeIdeas } from './crear'
import { expandirNodo } from './ia'
import { PanelSugerencias } from './PanelSugerencias'
import { Creditos } from '../../core/ui/Creditos'
import { OP_EXPANDIR } from './costosIA'

/**
 * Diario de ideas: la bandeja donde cae lo que se te ocurre, sin pensar dónde
 * guardarlo. Una idea suelta solo tiene fecha; las que comparten `tema` son una
 * LLUVIA, y por eso no hace falta una tabla de sesiones: el tema las agrupa.
 *
 * Con una lluvia abierta, todo lo que escribes se le pega, la IA propone más
 * sobre ese tema y el botón del mapa se lleva el montón a un mapa mental
 * (pestaña Mapas): capturar aquí, ordenar allá.
 */
export function DiarioTab({ onAbrirMapa }: { onAbrirMapa: (mapaId: number) => void }) {
  const t = useT()
  const ideas = ideasRepo.useAll() ?? []
  const [texto, setTexto] = useState('')
  const [tema, setTema] = useState('')
  const [temaBorrador, setTemaBorrador] = useState<string | null>(null)
  const [vista, setVista] = useState<'dia' | 'tema'>('dia')
  const [soloFav, setSoloFav] = useState(false)
  const [editando, setEditando] = useState<number | null>(null)
  const [borrando, setBorrando] = useState<number | null>(null)
  const [pidiendoIA, setPidiendoIA] = useState(false)

  const deLaLluvia = tema ? ideas.filter((i) => i.tema === tema) : []
  const visibles = soloFav ? ideas.filter((i) => i.favorita) : ideas

  const anotar = async (textos: string[]) => {
    const ahora = new Date().toISOString()
    await ideasRepo.bulkAdd(
      textos.map((tx) => ({
        texto: tx,
        ...(tema ? { tema } : {}),
        fecha: fechaLocalISO(),
        creadoEn: ahora,
      })),
    )
  }

  const agregar = async () => {
    const tx = texto.trim()
    if (!tx) return
    setTexto('')
    await anotar([tx])
  }

  /** Se lleva la lluvia a un mapa mental y la abre allá. */
  const llevarAMapa = async () => {
    if (deLaLluvia.length === 0) return
    const id = await crearMapaDesdeIdeas(tema, deLaLluvia.map((i) => i.texto))
    onAbrirMapa(id)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <div className="space-y-2.5 rounded-2xl border border-white/10 bg-white/5 p-3" data-tut="ideas.diario.alta">
        {tema ? (
          <div className="flex items-center gap-2 rounded-xl px-2.5 py-1.5" style={{ background: `${COLOR}22` }}>
            <span className="texto-vivo" style={vivo(COLOR)}>
              <Icono nombre="lluvia" />
            </span>
            <span className="min-w-0 flex-1 truncate text-xs font-semibold">
              {t('ideas.diario.enLluvia', 'Lluvia: {tema}', { tema })}
            </span>
            <span className="shrink-0 text-[11px] text-white/45">{deLaLluvia.length}</span>
            <button
              type="button"
              onClick={() => setTema('')}
              className="shrink-0 text-white/40 transition hover:text-white/80"
              title={t('ideas.diario.cerrarLluvia', 'Cerrar la lluvia')}
              aria-label={t('ideas.diario.cerrarLluvia', 'Cerrar la lluvia')}
            >
              <Icono nombre="cerrar" />
            </button>
          </div>
        ) : temaBorrador !== null ? (
          <div className="flex gap-2">
            <input
              autoFocus
              value={temaBorrador}
              onChange={(e) => setTemaBorrador(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && temaBorrador.trim()) {
                  setTema(temaBorrador.trim())
                  setTemaBorrador(null)
                }
                if (e.key === 'Escape') setTemaBorrador(null)
              }}
              placeholder={t('ideas.diario.temaPlaceholder', '¿Sobre qué es la lluvia?')}
              className="min-w-0 flex-1 rounded-xl border border-white/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={() => {
                if (temaBorrador.trim()) setTema(temaBorrador.trim())
                setTemaBorrador(null)
              }}
              disabled={!temaBorrador.trim()}
              className="ui-accent-bg rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-40"
            >
              {t('ideas.diario.empezar', 'Empezar')}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setTemaBorrador('')}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/5"
            data-tut="ideas.diario.lluvia"
          >
            <Icono nombre="lluvia" /> {t('ideas.diario.nuevaLluvia', 'Hacer una lluvia de ideas')}
          </button>
        )}

        <div className="flex gap-2">
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void agregar()}
            placeholder={
              tema
                ? t('ideas.diario.placeholderLluvia', 'Suelta otra idea, sin filtrar…')
                : t('ideas.diario.placeholder', 'Se me ocurrió que…')
            }
            className="min-w-0 flex-1 rounded-xl border border-white/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={() => void agregar()}
            disabled={!texto.trim()}
            className="ui-accent-bg rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-40"
          >
            <Icono nombre="agregar" /> {t('ideas.diario.anotar', 'Anotar')}
          </button>
        </div>

        {tema && (
          <div className="flex flex-wrap gap-2">
            {iaActiva() && (
              <button
                type="button"
                onClick={() => setPidiendoIA(true)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/5"
              >
                <Icono nombre="brillo" /> {t('ideas.diario.masIdeas', 'Traer más ideas')}
                <Creditos op={OP_EXPANDIR} />
              </button>
            )}
            <button
              type="button"
              onClick={() => void llevarAMapa()}
              disabled={deLaLluvia.length === 0}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/5 disabled:opacity-40"
            >
              <Icono nombre="nodos" /> {t('ideas.diario.aMapa', 'Volverla un mapa')}
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-1.5">
        {(['dia', 'tema'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setVista(v)}
            className={`flex-1 rounded-xl py-1.5 text-xs font-semibold transition ${
              vista === v ? 'text-black' : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
            style={vista === v ? { background: COLOR } : undefined}
          >
            <Icono nombre={v === 'dia' ? 'calendario' : 'etiqueta'} />{' '}
            {v === 'dia' ? t('ideas.diario.porDia', 'Por día') : t('ideas.diario.porTema', 'Por tema')}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSoloFav((x) => !x)}
          className={`rounded-xl px-3 py-1.5 text-xs transition ${
            soloFav ? 'text-black' : 'bg-white/5 text-white/60 hover:bg-white/10'
          }`}
          style={soloFav ? { background: COLOR } : undefined}
          title={t('ideas.diario.soloFav', 'Solo las destacadas')}
          aria-label={t('ideas.diario.soloFav', 'Solo las destacadas')}
        >
          <Icono nombre="estrella" />
        </button>
      </div>

      {vista === 'dia' ? (
        <Archivador
          items={visibles}
          fecha={(i) => i.fecha}
          clave={(i) => i.id ?? i.creadoEn}
          vacio={t('ideas.diario.vacio', 'Aquí cae todo lo que se te ocurra; ya lo ordenarás después.')}
        >
          {(idea) => (
            <TarjetaIdea
              idea={idea}
              editando={editando === idea.id}
              borrando={borrando === idea.id}
              onEditar={() => setEditando(idea.id ?? null)}
              onCerrarEdicion={() => setEditando(null)}
              onBorrar={() => setBorrando(idea.id ?? null)}
              onConfirmarBorrar={() => setBorrando(null)}
              onTema={(tx) => setTema(tx)}
            />
          )}
        </Archivador>
      ) : (
        <CarpetasPorEtiqueta
          items={visibles}
          etiqueta={(i) => i.tema ?? ''}
          clave={(i) => i.id ?? i.creadoEn}
          sinEtiqueta={t('ideas.diario.sinTema', 'Ideas sueltas')}
        >
          {(idea) => (
            <TarjetaIdea
              idea={idea}
              editando={editando === idea.id}
              borrando={borrando === idea.id}
              onEditar={() => setEditando(idea.id ?? null)}
              onCerrarEdicion={() => setEditando(null)}
              onBorrar={() => setBorrando(idea.id ?? null)}
              onConfirmarBorrar={() => setBorrando(null)}
              onTema={(tx) => setTema(tx)}
            />
          )}
        </CarpetasPorEtiqueta>
      )}

      {pidiendoIA && (
        <PanelSugerencias
          titulo={t('ideas.diario.iaTitulo', 'Más ideas')}
          descripcion={t('ideas.diario.iaDesc', 'Ideas propuestas para «{tema}»:', { tema })}
          cargar={() =>
            expandirNodo(
              `Lluvia de ideas sobre: ${tema}`,
              deLaLluvia.map((i) => i.texto),
            )
          }
          onAceptar={anotar}
          onCerrar={() => setPidiendoIA(false)}
        />
      )}
    </div>
  )
}

/** Una idea del diario: destacarla, desarrollarla, retomar su lluvia o tirarla. */
function TarjetaIdea({
  idea,
  editando,
  borrando,
  onEditar,
  onCerrarEdicion,
  onBorrar,
  onConfirmarBorrar,
  onTema,
}: {
  idea: Idea
  editando: boolean
  borrando: boolean
  onEditar: () => void
  onCerrarEdicion: () => void
  onBorrar: () => void
  onConfirmarBorrar: () => void
  onTema: (tema: string) => void
}) {
  const t = useT()
  const tema = idea.tema

  const guardar = async (cambios: Partial<Idea>) => {
    if (idea.id != null) await ideasRepo.update(idea.id, cambios)
  }

  if (editando) {
    return (
      <div className="space-y-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5">
        <input
          autoFocus
          defaultValue={idea.texto}
          onBlur={(e) => {
            const tx = e.target.value.trim()
            if (tx && tx !== idea.texto) void guardar({ texto: tx })
          }}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          className="w-full rounded-lg border border-white/15 bg-transparent px-2 py-1.5 text-sm outline-none"
        />
        <textarea
          rows={3}
          defaultValue={idea.detalle ?? ''}
          onBlur={(e) => {
            const tx = e.target.value.trim()
            if (tx !== (idea.detalle ?? '')) void guardar({ detalle: tx || undefined })
          }}
          placeholder={t('ideas.diario.detalle', 'Desarrolla la idea…')}
          className="w-full resize-none rounded-lg border border-white/15 bg-transparent px-2 py-1.5 text-xs outline-none"
        />
        <button
          type="button"
          onClick={onCerrarEdicion}
          className="ui-accent-bg w-full rounded-lg py-1.5 text-xs font-semibold"
        >
          {t('ideas.diario.listo', 'Listo')}
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
      <button
        type="button"
        onClick={() => void guardar({ favorita: !idea.favorita })}
        className={`shrink-0 transition ${idea.favorita ? 'texto-vivo' : 'text-white/25 hover:text-white/60'}`}
        style={idea.favorita ? vivo(COLOR) : undefined}
        title={t('ideas.diario.destacar', 'Destacar')}
        aria-label={t('ideas.diario.destacar', 'Destacar')}
      >
        <Icono nombre="estrella" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-sm">{idea.texto}</p>
        {idea.detalle && <p className="mt-0.5 text-[11px] leading-relaxed text-white/45">{idea.detalle}</p>}
        {tema && (
          <button
            type="button"
            onClick={() => onTema(tema)}
            className="mt-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/50 transition hover:bg-white/20"
            title={t('ideas.diario.retomar', 'Retomar esta lluvia')}
          >
            <Icono nombre="lluvia" /> {tema}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onEditar}
        className="shrink-0 text-white/30 transition hover:text-white/70"
        title={t('ideas.editar', 'Editar')}
        aria-label={t('ideas.editar', 'Editar')}
      >
        <Icono nombre="editar" />
      </button>
      {borrando ? (
        <button
          type="button"
          onClick={async () => {
            onConfirmarBorrar()
            if (idea.id != null) await ideasRepo.remove(idea.id)
          }}
          className="shrink-0 text-xs font-bold text-red-300"
        >
          {t('ideas.mapas.confirmarBorrar', '¿Borrar?')}
        </button>
      ) : (
        <button
          type="button"
          onClick={onBorrar}
          className="shrink-0 text-white/30 transition hover:text-red-400"
          title={t('ideas.borrar', 'Borrar')}
          aria-label={t('ideas.borrar', 'Borrar')}
        >
          <Icono nombre="basura" />
        </button>
      )}
    </div>
  )
}
