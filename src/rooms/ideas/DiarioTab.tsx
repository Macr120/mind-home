import { useMemo, useState } from 'react'
import { iaActiva } from '../../core/chat/ia'
import type { Idea } from '../../core/data/db'
import { VACIO, carpetasIdeaRepo, ideasRepo } from '../../core/data/repository'
import { fechaLocalISO } from '../../core/fechaLocal'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { vivo } from '../../core/ui/estilos'
import { Archivador } from '../_shared/Archivador'
import { PestanasCarpeta } from '../_shared/PestanasCarpeta'
import { acento, tono } from '../_shared/acento'
import { ArbolCarpetas } from './ArbolCarpetas'
import { COLOR } from './constantes'
import { crearMapaDesdeIdeas, crearMapaIA } from './crear'
import { expandirNodo } from './ia'
import { IdeaDetalle } from './IdeaDetalle'
import { MoverIdeaDialog } from './MoverIdeaDialog'
import { PanelSugerencias } from './PanelSugerencias'
import { Creditos } from '../../core/ui/Creditos'
import { OP_EXPANDIR, OP_MAPA } from './costosIA'

/**
 * Diario de ideas: la bandeja donde cae lo que se te ocurre, sin pensar dónde
 * guardarlo. Cada idea es un TÍTULO con su lista de puntos, y vive en una
 * carpeta (anidable) o suelta en la raíz.
 *
 * La LLUVIA sigue existiendo, al pie de la pestaña: abres un tema, sueltas todo
 * lo que se te pase por la cabeza y luego lo conviertes en mapa. Arriba queda
 * solo la captura de una línea, que es el 90 % de las veces.
 */
export function DiarioTab({ onAbrirMapa }: { onAbrirMapa: (mapaId: number) => void }) {
  const t = useT()
  const ideas = ideasRepo.useAll() ?? VACIO
  const carpetas = carpetasIdeaRepo.useAll() ?? VACIO
  const [texto, setTexto] = useState('')
  const [tema, setTema] = useState('')
  const [temaBorrador, setTemaBorrador] = useState<string | null>(null)
  const [lluviaAbierta, setLluviaAbierta] = useState(false)
  const [carpeta, setCarpeta] = useState('')
  const [vista, setVista] = useState<'carpetas' | 'dia'>('carpetas')
  const [soloFav, setSoloFav] = useState(false)
  const [abierta, setAbierta] = useState<number | null>(null)
  const [borrando, setBorrando] = useState<number | null>(null)
  const [pidiendoIA, setPidiendoIA] = useState(false)
  const [generandoArbol, setGenerandoArbol] = useState(false)
  const [errorArbol, setErrorArbol] = useState('')
  /** Idea que se está encarpetando (diálogo de carpetas). */
  const [encarpetando, setEncarpetando] = useState<Idea | null>(null)

  const deLaLluvia = tema ? ideas.filter((i) => i.tema === tema) : []
  const porFav = soloFav ? ideas.filter((i) => i.favorita) : ideas
  // En la vista de carpetas se ve SOLO la carpeta elegida; en las otras, todo.
  const visibles = vista === 'carpetas' ? porFav.filter((i) => (i.carpetaId ?? '') === carpeta) : porFav

  const conteos = useMemo(() => {
    const m = new Map<string, number>()
    for (const i of ideas) {
      const c = i.carpetaId ?? ''
      m.set(c, (m.get(c) ?? 0) + 1)
    }
    return m
  }, [ideas])

  const nombreCarpeta = carpetas.find((c) => c.carpetaId === carpeta)?.nombre

  const anotar = async (textos: string[]) => {
    const ahora = new Date().toISOString()
    await ideasRepo.bulkAdd(
      textos.map((tx) => ({
        texto: tx,
        ...(tema ? { tema } : {}),
        ...(carpeta ? { carpetaId: carpeta } : {}),
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

  /**
   * Árbol etimológico de la palabra de la lluvia, dibujado por la IA: origen,
   * significados, usos y familia léxica. Lanza con el motivo real y aquí se
   * muestra tal cual (mismo trato que en MapasTab).
   */
  const arbolEtimologico = async () => {
    if (generandoArbol) return
    setGenerandoArbol(true)
    setErrorArbol('')
    try {
      const { id } = await crearMapaIA(tema, 'etimologia')
      onAbrirMapa(id)
    } catch (e) {
      console.error('[ideas] fallo al generar el árbol etimológico:', e)
      setErrorArbol(e instanceof Error ? e.message : String(e))
    } finally {
      setGenerandoArbol(false)
    }
  }

  // ----- Vista: una idea abierta -----
  const ideaAbierta = abierta != null ? ideas.find((i) => i.id === abierta) : undefined
  if (ideaAbierta) {
    return (
      <IdeaDetalle
        idea={ideaAbierta}
        hermanas={ideas.filter(
          (i) => i.id !== ideaAbierta.id && (i.carpetaId ?? '') === (ideaAbierta.carpetaId ?? ''),
        )}
        carpetas={carpetas}
        onCerrar={() => setAbierta(null)}
      />
    )
  }

  const fila = (idea: Idea) => (
    <TarjetaIdea
      idea={idea}
      borrando={borrando === idea.id}
      carpeta={carpetas.find((c) => c.carpetaId === idea.carpetaId)?.nombre}
      onAbrir={() => setAbierta(idea.id ?? null)}
      onBorrar={() => setBorrando(idea.id ?? null)}
      onConfirmarBorrar={() => setBorrando(null)}
      onEncarpetar={() => setEncarpetando(idea)}
      onTema={(tx) => {
        setTema(tx)
        setLluviaAbierta(true)
      }}
    />
  )

  return (
    <div className="mx-auto w-full max-w-2xl space-y-3">
      <div className="space-y-2.5 rounded-2xl border border-white/10 bg-white/5 p-3" data-tut="ideas.diario.alta">
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
        <p className="text-[11px] text-white/35">
          {carpeta
            ? t('ideas.diario.caeEn', 'Cae en «{carpeta}»', { carpeta: nombreCarpeta ?? '' })
            : t('ideas.diario.caeSuelta', 'Cae suelta en el diario; puedes moverla a una carpeta después.')}
          {tema && ` · ${t('ideas.diario.enLluvia', 'Lluvia: {tema}', { tema })}`}
        </p>
      </div>

      <div className="flex gap-1.5">
        <div className="min-w-0 flex-[2]">
          <PestanasCarpeta
            items={[
              { id: 'carpetas', icono: 'carpeta', labelEs: 'Carpetas', clave: 'ideas.diario.porCarpeta' },
              { id: 'dia', icono: 'calendario', labelEs: 'Por día', clave: 'ideas.diario.porDia' },
            ]}
            activo={vista}
            onCambio={setVista}
            color={COLOR}
            variante="sub"
            nivel={2}
          />
        </div>
        {/* Favoritas no es una vista: filtra la que esté puesta. Mismo tono que la fila. */}
        <button
          type="button"
          onClick={() => setSoloFav((x) => !x)}
          className={`flex-1 rounded-xl py-1.5 text-xs font-semibold transition ${
            soloFav ? 'ui-accent-bg' : 'bg-white/5 text-white/60 hover:bg-white/10'
          }`}
          style={soloFav ? acento(tono(COLOR, 2)) : undefined}
          title={t('ideas.diario.soloFav', 'Solo las destacadas')}
        >
          <Icono nombre="estrella" /> {t('ideas.diario.favoritas', 'Favoritas')}
        </button>
      </div>

      {vista === 'carpetas' && (
        <>
          <ArbolCarpetas carpetas={carpetas} conteos={conteos} actual={carpeta} onElegir={setCarpeta} />
          {visibles.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs leading-relaxed text-white/35">
              {t('ideas.diario.vacio', 'Aquí cae todo lo que se te ocurra; ya lo ordenarás después.')}
            </p>
          ) : (
            <div className="space-y-2">{visibles.map((idea) => <div key={idea.id}>{fila(idea)}</div>)}</div>
          )}
        </>
      )}

      {vista === 'dia' && (
        <Archivador
          items={visibles}
          fecha={(i) => i.fecha}
          clave={(i) => i.id ?? i.creadoEn}
          vacio={t('ideas.diario.vacio', 'Aquí cae todo lo que se te ocurra; ya lo ordenarás después.')}
        >
          {fila}
        </Archivador>
      )}

      {/* La lluvia al final: es el modo intensivo, no la captura del día a día. */}
      <div className="space-y-2.5 rounded-2xl border border-white/10 bg-white/5 p-3" data-tut="ideas.diario.lluvia">
        <button
          type="button"
          onClick={() => setLluviaAbierta((x) => !x)}
          className="flex w-full items-center gap-2 text-start text-xs font-semibold text-white/70 transition hover:text-white/95"
        >
          <span className="texto-vivo" style={vivo(COLOR)}>
            <Icono nombre="lluvia" />
          </span>
          <span className="flex-1">
            {tema
              ? t('ideas.diario.enLluvia', 'Lluvia: {tema}', { tema })
              : t('ideas.diario.nuevaLluvia', 'Hacer una lluvia de ideas')}
          </span>
          {tema && <span className="text-white/35">{deLaLluvia.length}</span>}
          <span className="text-white/40">{lluviaAbierta ? '▾' : '▸'}</span>
        </button>

        {lluviaAbierta && (
          <>
            <p className="text-[11px] leading-relaxed text-white/40">
              {t('ideas.diario.lluviaDesc', 'Abre un tema y todo lo que anotes arriba se le pega. Cuando tengas el montón, conviértelo en un mapa para ordenarlo.')}
            </p>

            {tema ? (
              <div className="flex flex-wrap gap-2">
                {iaActiva() && (
                  <>
                    <button
                      type="button"
                      onClick={() => setPidiendoIA(true)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/5"
                    >
                      <Icono nombre="brillo" /> {t('ideas.diario.masIdeas', 'Traer más ideas')}
                      <Creditos op={OP_EXPANDIR} />
                    </button>
                    {/* La palabra a fondo: no necesita ideas anotadas, solo el tema. */}
                    <button
                      type="button"
                      onClick={() => void arbolEtimologico()}
                      disabled={generandoArbol}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/5 disabled:opacity-40"
                    >
                      <Icono nombre="libro" />
                      {generandoArbol
                        ? t('ideas.diario.arbolEtimoGenerando', 'Desarmando la palabra…')
                        : t('ideas.diario.arbolEtimo', 'Árbol etimológico')}
                      <Creditos op={OP_MAPA} />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => void llevarAMapa()}
                  disabled={deLaLluvia.length === 0}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/5 disabled:opacity-40"
                >
                  <Icono nombre="nodos" /> {t('ideas.diario.aMapa', 'Volverla un mapa')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTema('')
                    setErrorArbol('')
                  }}
                  className="rounded-xl border border-white/15 px-3 py-2 text-xs text-white/50 transition hover:bg-white/5"
                  title={t('ideas.diario.cerrarLluvia', 'Cerrar la lluvia')}
                  aria-label={t('ideas.diario.cerrarLluvia', 'Cerrar la lluvia')}
                >
                  <Icono nombre="cerrar" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={temaBorrador ?? ''}
                  onChange={(e) => setTemaBorrador(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && temaBorrador?.trim()) {
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
                    if (temaBorrador?.trim()) setTema(temaBorrador.trim())
                    setTemaBorrador(null)
                  }}
                  disabled={!temaBorrador?.trim()}
                  className="ui-accent-bg rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-40"
                >
                  {t('ideas.diario.empezar', 'Empezar')}
                </button>
              </div>
            )}

            {errorArbol && (
              <p className="rounded-lg bg-red-500/10 px-2.5 py-2 text-[11px] leading-relaxed text-red-300">
                {t('ideas.diario.errorArbol', 'La IA no pudo armar el árbol:')} {errorArbol}
              </p>
            )}
          </>
        )}
      </div>

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

      {encarpetando && (
        <MoverIdeaDialog
          carpetas={carpetas}
          actual={encarpetando.carpetaId ?? ''}
          titulo={t('ideas.diario.encarpetarTit', 'Guardar «{idea}» en…', { idea: encarpetando.texto })}
          onElegir={async (carpetaId) => {
            if (encarpetando.id != null) {
              await ideasRepo.update(encarpetando.id, { carpetaId: carpetaId || undefined })
            }
            setEncarpetando(null)
          }}
          onCerrar={() => setEncarpetando(null)}
        />
      )}
    </div>
  )
}

/** Una idea en la lista: destacarla, abrirla para desarrollarla o tirarla. */
function TarjetaIdea({
  idea,
  borrando,
  carpeta,
  onAbrir,
  onBorrar,
  onConfirmarBorrar,
  onEncarpetar,
  onTema,
}: {
  idea: Idea
  borrando: boolean
  /** Nombre de su carpeta; ausente = suelta en el diario. */
  carpeta?: string
  onAbrir: () => void
  onBorrar: () => void
  onConfirmarBorrar: () => void
  onEncarpetar: () => void
  onTema: (tema: string) => void
}) {
  const t = useT()
  const tema = idea.tema
  const puntos = idea.puntos ?? []
  const hechos = puntos.filter((p) => p.hecho).length

  const guardar = async (cambios: Partial<Idea>) => {
    if (idea.id != null) await ideasRepo.update(idea.id, cambios)
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
      <button type="button" onClick={onAbrir} className="min-w-0 flex-1 text-start">
        <p className="text-sm">{idea.texto}</p>
        {puntos.length > 0 ? (
          <p className="mt-0.5 text-[11px] text-white/45">
            <Icono nombre="lista" />{' '}
            {t('ideas.diario.nPuntos', '{hechos}/{total} puntos', {
              hechos: String(hechos),
              total: String(puntos.length),
            })}
          </p>
        ) : (
          idea.detalle && <p className="mt-0.5 truncate text-[11px] leading-relaxed text-white/45">{idea.detalle}</p>
        )}
      </button>
      {tema && (
        <button
          type="button"
          onClick={() => onTema(tema)}
          className="mt-0.5 shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/50 transition hover:bg-white/20"
          title={t('ideas.diario.retomar', 'Retomar esta lluvia')}
        >
          <Icono nombre="lluvia" />
        </button>
      )}
      {/* Encarpetar: una idea suelta se guarda sin pensar dónde, y desde aquí
          se manda a su carpeta cuando ya sabes de qué va. */}
      <button
        type="button"
        onClick={onEncarpetar}
        className={`mt-0.5 shrink-0 transition hover:text-white/80 ${carpeta ? 'text-white/50' : 'text-white/25'}`}
        title={
          carpeta
            ? t('ideas.diario.enCarpeta', 'En «{carpeta}» · tocar para moverla', { carpeta })
            : t('ideas.diario.encarpetar', 'Guardarla en una carpeta')
        }
        aria-label={t('ideas.diario.encarpetar', 'Guardarla en una carpeta')}
      >
        <Icono nombre="carpeta" />
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
