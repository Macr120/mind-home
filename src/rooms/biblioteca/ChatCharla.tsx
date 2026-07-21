import { useEffect, useRef, useState } from 'react'
import {
  conversacionesBiblioRepo,
  mensajesBiblioRepo,
  useMensajesConversacionBiblio,
  useEntradaDeConversacion,
  eliminarConversacionBiblio,
} from '../../core/data/repository'
import { conversarIA, iaActiva, type MensajeIA } from '../../core/chat/ia'
import { useAsistentes } from '../../core/state/asistentesStore'
import { asistenteDePlantilla, semillaAsistente } from '../../core/gamificacion/asistentesPlantilla'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { COLOR, PILAR_GENERAL, getPilar } from './constantes'
import { PILARES } from './pilares'
import { systemSabio, destilarConversacion, tituloDerivado } from './sabio'
import { ubicarCharla, resolverTema, type AnclaTema } from './arbol'
import { EntradaForm, type EntradaFormInicial } from './EntradaForm'
import { RamificarPanel } from './RamificarPanel'

/**
 * Vista de una charla con el Sabio: burbujas estilo WhatsApp (patrón visual de
 * ChatConversacion, con datos propios de la biblioteca), cabecera con título
 * editable + campo reclasificable + destilar/borrar, e input propio.
 * `conversacionId === null` = charla nueva: se crea al enviar el primer mensaje.
 */
export function ChatCharla({
  conversacionId,
  borradorInicial,
  anclaInicial,
  onCreada,
  onSalir,
  onCharlaNueva,
}: {
  conversacionId: number | null
  borradorInicial: string
  /** Nodo del árbol del que nace la charla nueva (💬 en un tema); null = libre. */
  anclaInicial: AnclaTema | null
  onCreada: (id: number) => void
  onSalir: () => void
  /** Abre otra charla nueva anclada (💬 de una sugerencia del panel 🌿). */
  onCharlaNueva: (ancla: AnclaTema, borrador: string) => void
}) {
  const t = useT()
  const charlas = conversacionesBiblioRepo.useAll()
  const conv = conversacionId != null ? charlas?.find((c) => c.id === conversacionId) : undefined
  const mensajes = useMensajesConversacionBiblio(conversacionId)
  const entradaLigada = useEntradaDeConversacion(conversacionId)
  const lista = useAsistentes((s) => s.lista)
  const voz = asistenteDePlantilla(lista, 'biblioteca') ?? semillaAsistente('biblioteca')

  const [input, setInput] = useState(borradorInicial)
  const [pensando, setPensando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [destilando, setDestilando] = useState(false)
  const [form, setForm] = useState<{ inicial: EntradaFormInicial; aviso?: string } | null>(null)
  const [borrando, setBorrando] = useState(false)
  const [editandoTitulo, setEditandoTitulo] = useState(false)
  const [tituloTmp, setTituloTmp] = useState('')
  const [panel, setPanel] = useState<{ alSalir: boolean; ancla: { temaId: string; pilarId: string; titulo: string } } | null>(null)
  const refLista = useRef<HTMLDivElement>(null)

  const conIA = iaActiva()
  const hayRespuesta = !!mensajes?.some((m) => m.rol === 'asistente')

  /** Abre el panel 🌿 (resuelve el ancla primero). */
  const abrirPanel = async (alSalir: boolean) => {
    const ancla = conv?.temaId ? await resolverTema(conv.temaId) : null
    if (!ancla) {
      if (alSalir) onSalir()
      return
    }
    setPanel({ alSalir, ancla })
  }

  /** ← con recordatorio: ofrece ramificar una vez antes de salir. */
  const salir = () => {
    if (conIA && hayRespuesta && conv && conv.temaId && !conv.ramificadaEn && !panel) {
      void abrirPanel(true)
    } else {
      onSalir()
    }
  }

  // Siempre pegado al último mensaje (como un chat real).
  useEffect(() => {
    const el = refLista.current
    if (el) el.scrollTop = el.scrollHeight
  }, [mensajes?.length, pensando])

  const aMensajesIA = (): MensajeIA[] => (mensajes ?? []).map((m) => ({ rol: m.rol, texto: m.texto }))

  const tituloMostrado =
    conv?.titulo || (mensajes?.length ? tituloDerivado(aMensajesIA()) : t('biblioteca.charla.nueva', 'Nueva charla'))

  const pedirRespuesta = async (id: number, historial: MensajeIA[], clasificar: boolean, pilarId: string) => {
    setPensando(true)
    setError(null)
    try {
      const pilarTitulo = pilarId !== PILAR_GENERAL.id ? getPilar(pilarId).titulo : undefined
      const respuesta = await conversarIA(systemSabio(voz, pilarTitulo), historial.slice(-20))
      const ahora = new Date().toISOString()
      await mensajesBiblioRepo.add({ conversacionId: id, rol: 'asistente', texto: respuesta, creado: ahora })
      await conversacionesBiblioRepo.update(id, { actualizadoEn: ahora })
      if (clasificar) {
        // En segundo plano: título+campo y colocación profunda en el índice
        // (elegirPadre). No bloquea el chat; fallos silenciosos.
        void ubicarCharla(id, [...historial, { rol: 'asistente', texto: respuesta }])
      }
    } catch {
      setError(t('biblioteca.charla.error', 'El Sabio no pudo responder. Revisa tu IA en Ajustes o reintenta.'))
    } finally {
      setPensando(false)
    }
  }

  const enviar = async () => {
    const texto = input.trim()
    if (!texto || pensando || !conIA) return
    setInput('')
    const ahora = new Date().toISOString()
    let id = conversacionId
    if (id == null) {
      // Charla desde un tema del árbol: nace anclada y con su campo (no 'general').
      id = await conversacionesBiblioRepo.add({
        titulo: '',
        pilarId: anclaInicial?.pilarId ?? PILAR_GENERAL.id,
        temaId: anclaInicial?.temaId,
        creadoEn: ahora,
        actualizadoEn: ahora,
      })
      onCreada(id)
    } else {
      await conversacionesBiblioRepo.update(id, { actualizadoEn: ahora })
    }
    await mensajesBiblioRepo.add({ conversacionId: id, rol: 'usuario', texto, creado: ahora })
    const historial = [...aMensajesIA(), { rol: 'usuario' as const, texto }]
    await pedirRespuesta(id, historial, !conv?.titulo, conv?.pilarId ?? anclaInicial?.pilarId ?? PILAR_GENERAL.id)
  }

  const reintentar = () => {
    if (conversacionId == null || pensando) return
    void pedirRespuesta(conversacionId, aMensajesIA(), !conv?.titulo, conv?.pilarId ?? anclaInicial?.pilarId ?? PILAR_GENERAL.id)
  }

  const guardarTitulo = () => {
    setEditandoTitulo(false)
    const limpio = tituloTmp.trim()
    if (conversacionId != null && limpio) void conversacionesBiblioRepo.update(conversacionId, { titulo: limpio })
  }

  const destilar = async () => {
    if (conversacionId == null || !mensajes?.length || destilando) return
    setDestilando(true)
    try {
      // Charla anclada al árbol: el tema/campo ya se conocen, la IA solo redacta.
      const ancla = conv?.temaId ? await resolverTema(conv.temaId) : null
      const d = await destilarConversacion(aMensajesIA(), conv?.pilarId ?? PILAR_GENERAL.id, ancla)
      setForm({ inicial: d })
    } catch {
      setForm({
        inicial: {
          titulo: conv?.titulo || tituloDerivado(aMensajesIA()),
          resumen: '',
          puntosClave: [],
          pilarId: conv?.pilarId ?? PILAR_GENERAL.id,
          temaId: conv?.temaId,
        },
        aviso: t('biblioteca.charla.destilarFallo', 'La IA no pudo destilar la charla; completa la entrada a mano.'),
      })
    } finally {
      setDestilando(false)
    }
  }

  const borrar = async () => {
    if (conversacionId == null) return
    await eliminarConversacionBiblio(conversacionId)
    onSalir()
  }

  return (
    <div className="flex h-[62vh] min-h-[24rem] flex-col rounded-2xl border border-white/10 bg-white/5">
      {/* Cabecera */}
      <div className="space-y-2 border-b border-white/10 px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={salir}
            className="rounded px-1.5 py-1 text-sm text-white/40 transition hover:bg-white/10 hover:text-white/80"
            title={t('biblioteca.charla.volver', 'Volver a las charlas')}
          >
            <Icono nombre="volver" />
          </button>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-lg">
            <Icono emoji={voz.emoji} />
          </span>
          <div className="min-w-0 flex-1">
            {editandoTitulo ? (
              <input
                autoFocus
                value={tituloTmp}
                onChange={(e) => setTituloTmp(e.target.value)}
                onBlur={guardarTitulo}
                onKeyDown={(e) => e.key === 'Enter' && guardarTitulo()}
                className="w-full rounded border border-white/20 bg-black/30 px-1.5 py-0.5 text-sm outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (conversacionId == null) return
                  setTituloTmp(conv?.titulo ?? '')
                  setEditandoTitulo(true)
                }}
                className="block w-full truncate text-left text-sm font-semibold text-white/90"
                title={t('biblioteca.charla.renombrar', 'Tocar para renombrar')}
              >
                {tituloMostrado}
              </button>
            )}
            <p className="text-[10px] text-white/40">
              {voz.nombre} · {t('biblioteca.charla.sub', 'Charla de enciclopedia')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void abrirPanel(false)}
            disabled={!conIA || !hayRespuesta || !conv?.temaId}
            className="rounded-lg bg-white/5 px-2 py-1.5 text-xs transition hover:bg-white/10 disabled:opacity-35"
            title={
              conv?.temaId
                ? t('biblioteca.charla.ramificarTip', 'Ramificar: agrega subtemas de esta charla al árbol')
                : t('biblioteca.charla.ramificarSinTema', 'La charla aún no tiene lugar en el árbol')
            }
          >
            <Icono nombre="rama" />
          </button>
          <button
            type="button"
            onClick={destilar}
            disabled={!conIA || !mensajes?.length || destilando}
            className="rounded-lg bg-white/5 px-2 py-1.5 text-xs transition hover:bg-white/10 disabled:opacity-35"
            title={t('biblioteca.charla.destilarTip', 'La IA resume la charla en una entrada de la enciclopedia')}
          >
            <Icono nombre={destilando ? 'reloj-arena' : 'registros'} />{' '}
            {entradaLigada
              ? t('biblioteca.charla.reDestilar', 'Actualizar entrada')
              : t('biblioteca.charla.destilar', 'Destilar')}
          </button>
          <button
            type="button"
            onClick={() => setBorrando(true)}
            disabled={conversacionId == null}
            className="rounded px-1.5 py-1 text-sm text-white/25 transition hover:bg-white/10 hover:text-white/70 disabled:opacity-35"
            title={t('biblioteca.charla.borrar', 'Borrar charla')}
          >
            <Icono nombre="basura" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={conv?.pilarId ?? PILAR_GENERAL.id}
            onChange={(e) =>
              conversacionId != null && conversacionesBiblioRepo.update(conversacionId, { pilarId: e.target.value })
            }
            disabled={conversacionId == null}
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-xs outline-none disabled:opacity-40"
            title={t('biblioteca.charla.campoTip', 'Campo del conocimiento donde se archiva la charla')}
          >
            <option value={PILAR_GENERAL.id}>
              {PILAR_GENERAL.icon} {PILAR_GENERAL.titulo}
            </option>
            {PILARES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.icon} {p.titulo}
              </option>
            ))}
          </select>
          {conIA && conv && !conv.temaId && !!mensajes?.length && (
            <button
              type="button"
              onClick={() => {
                if (conversacionId == null) return
                // Clasifica Y ubica la charla en el árbol (habilita 🌿).
                void ubicarCharla(conversacionId, aMensajesIA())
              }}
              className="rounded-lg bg-white/5 px-2 py-1 text-xs transition hover:bg-white/10"
              title={t('biblioteca.charla.reclasificarTip', 'Pedir a la IA que clasifique y ubique la charla en el árbol')}
            >
              <Icono nombre="brillo" /> {t('biblioteca.charla.reclasificar', 'Clasificar')}
            </button>
          )}
        </div>

        {borrando && (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs">
            <span className="text-rose-200/90">
              {t('biblioteca.charla.confirmarBorrar', '¿Borrar la charla? La entrada destilada se conserva.')}
            </span>
            <span className="flex shrink-0 gap-2">
              <button type="button" onClick={borrar} className="font-semibold text-rose-300 hover:text-rose-200">
                {t('biblioteca.charla.siBorrar', 'Borrar')}
              </button>
              <button type="button" onClick={() => setBorrando(false)} className="text-white/50 hover:text-white/80">
                {t('biblioteca.ent.cancelar', 'Cancelar')}
              </button>
            </span>
          </div>
        )}
      </div>

      {/* Mensajes */}
      <div ref={refLista} className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {(!mensajes || mensajes.length === 0) && (
          <p className="px-2 py-8 text-center text-xs text-white/35">
            {t('biblioteca.charla.vacia', 'Pregúntale lo que quieras a {sabio}: la charla se archivará sola en su campo del conocimiento', { sabio: voz.nombre })}
          </p>
        )}
        {mensajes?.map((m, i) => {
          const dia = m.creado.slice(0, 10)
          const diaPrevio = i > 0 ? mensajes[i - 1].creado.slice(0, 10) : null
          const esUsuario = m.rol === 'usuario'
          return (
            <div key={m.id}>
              {dia !== diaPrevio && (
                <div className="my-2 flex justify-center">
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] text-white/45">
                    {new Date(m.creado).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              )}
              <div className={`flex ${esUsuario ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-1.5 text-sm ${
                    esUsuario ? 'rounded-br-sm bg-emerald-500/25 text-white/95' : 'rounded-bl-sm bg-white/10 text-white/85'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.texto}</p>
                  <p className={`mt-0.5 text-right text-[9px] ${esUsuario ? 'text-emerald-400/50' : 'text-white/30'}`}>
                    {new Date(m.creado).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
        {pensando && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm bg-white/10 px-3 py-1.5 text-sm text-white/60">
              <span className="animate-pulse tracking-widest">
                <Icono emoji={voz.emoji} /> …
              </span>
            </div>
          </div>
        )}
        {error && (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs">
            <span className="text-amber-200/90">{error}</span>
            <button
              type="button"
              onClick={reintentar}
              className="shrink-0 font-semibold text-amber-300 hover:text-amber-200"
            >
              {t('biblioteca.charla.reintentar', 'Reintentar')}
            </button>
          </div>
        )}
      </div>

      {/* Entrada de texto */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void enviar()
        }}
        className="flex gap-2 border-t border-white/10 p-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!conIA}
          placeholder={
            conIA
              ? t('biblioteca.charla.placeholder', 'Pregunta sobre cualquier tema…')
              : t('biblioteca.charla.sinIA', 'Configura tu IA en Ajustes para charlar')
          }
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-white/30 disabled:opacity-40"
        />
        <button
          type="submit"
          disabled={!conIA || !input.trim() || pensando}
          className="rounded-xl px-4 py-2 text-sm font-semibold text-black transition disabled:opacity-40"
          style={{ background: COLOR }}
        >
          <Icono nombre="enviar" />
        </button>
      </form>

      {form && (
        <EntradaForm
          inicial={form.inicial}
          aviso={form.aviso}
          entradaId={entradaLigada?.id}
          conversacionId={conversacionId ?? undefined}
          onCerrar={() => setForm(null)}
        />
      )}

      {panel && conversacionId != null && (
        <RamificarPanel
          conversacionId={conversacionId}
          ancla={panel.ancla}
          mensajes={aMensajesIA()}
          onCerrar={() => {
            const alSalir = panel.alSalir
            setPanel(null)
            if (alSalir) onSalir()
          }}
          onCharlaNueva={onCharlaNueva}
        />
      )}
    </div>
  )
}
