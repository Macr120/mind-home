import { useEffect, useMemo, useRef, useState } from 'react'
import type { PerfilIdioma } from '../../core/data/db'
import {
  conversacionesIdiomaRepo,
  eliminarConversacionIdioma,
  mensajesIdiomaRepo,
  useMensajesConversacionIdioma,
} from '../../core/data/repository'
import { conversarIA, iaActiva, type MensajeIA } from '../../core/chat/ia'
import { useAsistentes } from '../../core/state/asistentesStore'
import { asistenteDePlantilla, semillaAsistente } from '../../core/gamificacion/asistentesPlantilla'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { COLOR } from './constantes'
import { todosVivos, useTemario } from './temarioVivo'
import { TextoConEnlaces } from '../_shared/TextoConEnlaces'
import { systemTutor, tituloDerivado } from './tutor'
import { ubicarCharla, type AnclaTema } from './arbol'
import { DestilarPanel } from './DestilarPanel'
import { TarjetaForm, type TarjetaFormInicial } from './TarjetaForm'
import { hablar, hayTTS } from './tts'
import { Creditos } from '../../core/ui/Creditos'
import { OP_CHARLA, OP_CHARLA_NUEVA, OP_EXTRAER_TARJETAS } from './costosIA'

/**
 * Charla de práctica con el tutor: burbujas estilo WhatsApp (patrón de
 * biblioteca/ChatCharla con datos propios), cabecera con título editable +
 * extraer vocabulario (🃏) + borrar, y 🔊 en cada mensaje del tutor.
 * `conversacionId === null` = charla nueva: se crea al enviar el primer mensaje.
 */
export function ChatTutor({ perfil, conversacionId, borradorInicial, anclaInicial, onCreada, onSalir, onIrAlTemario }: {
  perfil: PerfilIdioma
  conversacionId: number | null
  borradorInicial: string
  /** Tema del temario del que nace la charla nueva (💬 en un tema); null = libre. */
  anclaInicial: AnclaTema | null
  onCreada: (id: number) => void
  onSalir: () => void
  /** Enlaces al temario desde el chat: con tema abierto, o al temario a secas. */
  onIrAlTemario: (temaId: string | null) => void
}) {
  const t = useT()
  const charlas = conversacionesIdiomaRepo.useAll()
  const conv = conversacionId != null ? charlas?.find((c) => c.id === conversacionId) : undefined
  const mensajes = useMensajesConversacionIdioma(conversacionId)
  const tx = useTemario(perfil.id)
  const lista = useAsistentes((s) => s.lista)
  const voz = asistenteDePlantilla(lista, 'idiomas') ?? semillaAsistente('idiomas')

  const [input, setInput] = useState(borradorInicial)
  const [pensando, setPensando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [borrando, setBorrando] = useState(false)
  const [editandoTitulo, setEditandoTitulo] = useState(false)
  const [tituloTmp, setTituloTmp] = useState('')
  const [panel, setPanel] = useState<{ alSalir: boolean } | null>(null)
  const [form, setForm] = useState<{ inicial: TarjetaFormInicial; aviso?: string } | null>(null)
  const refLista = useRef<HTMLDivElement>(null)

  const conIA = iaActiva()
  const conTTS = hayTTS()
  const hayRespuesta = !!mensajes?.some((m) => m.rol === 'asistente')
  const perfilTutor = { nombre: perfil.nombre, nivel: perfil.nivel }

  // Lo que el texto del tutor puede enlazar: todos los temas vivos del idioma.
  const temasEnlazables = useMemo(
    () => todosVivos(tx).map((x) => ({ id: x.id, titulo: x.titulo })),
    [tx],
  )
  const temaId = conv?.temaId ?? anclaInicial?.temaId
  const temaTitulo = (temaId ? tx.porId.get(temaId)?.titulo : null) ?? anclaInicial?.titulo ?? null
  // El vocabulario de una charla se extrae UNA vez: solo se vuelve a ofrecer si
  // desde entonces se ha seguido conversando (hay material nuevo que sacar).
  const yaExtraido = !!conv?.destiladaEn && !(conv.actualizadoEn > conv.destiladaEn)

  /** ← con recordatorio: ofrece extraer vocabulario una vez antes de salir. */
  const salir = () => {
    if (conIA && hayRespuesta && conv && !yaExtraido && !panel) {
      setPanel({ alSalir: true })
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
    conv?.titulo || (mensajes?.length ? tituloDerivado(aMensajesIA()) : t('idiomas.charla.nueva', 'Nueva charla'))

  const pedirRespuesta = async (id: number, historial: MensajeIA[], clasificar: boolean) => {
    setPensando(true)
    setError(null)
    try {
      const respuesta = await conversarIA(systemTutor(voz, perfilTutor, temaTitulo ?? undefined), historial.slice(-20))
      const ahora = new Date().toISOString()
      await mensajesIdiomaRepo.add({ conversacionId: id, rol: 'asistente', texto: respuesta, creado: ahora })
      await conversacionesIdiomaRepo.update(id, { actualizadoEn: ahora })
      if (clasificar && perfil.id != null) {
        // En segundo plano: título y tema en el temario. No bloquea el chat.
        void ubicarCharla(id, perfil.id, perfilTutor, [...historial, { rol: 'asistente', texto: respuesta }])
      }
    } catch {
      setError(t('idiomas.charla.error', 'Tu tutor no pudo responder. Revisa tu IA en Ajustes o reintenta.'))
    } finally {
      setPensando(false)
    }
  }

  const enviar = async () => {
    const texto = input.trim()
    if (!texto || pensando || !conIA || perfil.id == null) return
    setInput('')
    const ahora = new Date().toISOString()
    let id = conversacionId
    if (id == null) {
      // Charla desde un tema del temario: nace anclada; libre si no hay ancla.
      id = await conversacionesIdiomaRepo.add({
        idiomaId: perfil.id,
        titulo: '',
        temaId: anclaInicial?.temaId,
        creadoEn: ahora,
        actualizadoEn: ahora,
      })
      onCreada(id)
    } else {
      await conversacionesIdiomaRepo.update(id, { actualizadoEn: ahora })
    }
    await mensajesIdiomaRepo.add({ conversacionId: id, rol: 'usuario', texto, creado: ahora })
    const historial = [...aMensajesIA(), { rol: 'usuario' as const, texto }]
    await pedirRespuesta(id, historial, !conv?.titulo)
  }

  const reintentar = () => {
    if (conversacionId == null || pensando) return
    void pedirRespuesta(conversacionId, aMensajesIA(), !conv?.titulo)
  }

  const guardarTitulo = () => {
    setEditandoTitulo(false)
    const limpio = tituloTmp.trim()
    if (conversacionId != null && limpio) void conversacionesIdiomaRepo.update(conversacionId, { titulo: limpio })
  }

  const borrar = async () => {
    if (conversacionId == null) return
    await eliminarConversacionIdioma(conversacionId)
    onSalir()
  }

  /** Fallback del destilado fallido: crear una tarjeta a mano ligada al tema. */
  const abrirFormManual = () => {
    setForm({
      inicial: {
        termino: '',
        traduccion: '',
        tipo: 'palabra',
        nivel: perfil.nivel,
        temaId: conv?.temaId,
      },
      aviso: t('idiomas.charla.destilarFallo', 'La IA no pudo extraer vocabulario de la charla; crea la tarjeta a mano.'),
    })
  }

  return (
    <div data-tut="idiomas.tutor" className="flex h-[62vh] min-h-[24rem] flex-col rounded-2xl border border-white/10 bg-white/5">
      {/* Cabecera */}
      <div className="space-y-2 border-b border-white/10 px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={salir}
            className="rounded px-1.5 py-1 text-sm text-white/40 transition hover:bg-white/10 hover:text-white/80"
            title={t('idiomas.charla.volver', 'Volver a las charlas')}
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
                className="block w-full truncate text-start text-sm font-semibold text-white/90"
                title={t('idiomas.charla.renombrar', 'Tocar para renombrar')}
              >
                {tituloMostrado}
              </button>
            )}
            <p className="truncate text-[10px] text-white/40">
              {voz.nombre} · {t('idiomas.charla.sub', 'Tutor de {idioma} · nivel {nivel}', { idioma: perfil.nombre, nivel: perfil.nivel })}
              {temaTitulo && ` · ${temaTitulo}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPanel({ alSalir: false })}
            disabled={!conIA || !hayRespuesta || conversacionId == null || yaExtraido}
            className="rounded-lg bg-white/5 px-2 py-1.5 text-xs transition hover:bg-white/10 disabled:opacity-35"
            title={
              yaExtraido
                ? t('idiomas.charla.yaExtraido', 'Ya extrajiste el vocabulario de esta charla; sigue conversando para que haya más')
                : t('idiomas.charla.destilarTip', 'La IA extrae el vocabulario de la charla como tarjetas de repaso')
            }
          >
            <Icono nombre={yaExtraido ? 'confirmar' : 'registros'} />{' '}
            {yaExtraido ? t('idiomas.charla.extraido', 'Extraído') : t('idiomas.charla.destilar', 'Extraer')}
          </button>
          {!yaExtraido && <Creditos op={OP_EXTRAER_TARJETAS} />}
          <button
            type="button"
            onClick={() => setBorrando(true)}
            disabled={conversacionId == null}
            className="rounded px-1.5 py-1 text-sm text-white/25 transition hover:bg-white/10 hover:text-white/70 disabled:opacity-35"
            title={t('idiomas.charla.borrar', 'Borrar charla')}
          >
            <Icono nombre="basura" />
          </button>
        </div>

        {/* Enlaces al temario: de qué tema es esta charla y dónde vive. */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onIrAlTemario(temaId ?? null)}
            className="max-w-[16rem] truncate rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] text-white/70 transition hover:bg-white/20"
            title={
              temaTitulo
                ? t('idiomas.charla.verEnTemario', 'Ver «{tema}» en el temario', { tema: temaTitulo })
                : t('idiomas.charla.verTemario', 'Abrir el temario')
            }
          >
            <Icono nombre="idiomas" /> {temaTitulo ?? t('idiomas.charla.libre', 'Práctica libre')}
          </button>
          {conIA && conv && !conv.temaId && !!mensajes?.length && (
            <button
              type="button"
              onClick={() => {
                if (conversacionId == null || perfil.id == null) return
                void ubicarCharla(conversacionId, perfil.id, perfilTutor, aMensajesIA())
              }}
              className="rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] transition hover:bg-white/10"
              title={t('idiomas.charla.clasificarTip', 'Pedir a la IA que ponga título y tema a la charla')}
            >
              <Icono nombre="brillo" /> {t('idiomas.charla.clasificar', 'Clasificar')}
            </button>
          )}
        </div>

        {borrando && (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs">
            <span className="text-rose-200/90">
              {t('idiomas.charla.confirmarBorrar', '¿Borrar la charla? Las tarjetas extraídas se conservan.')}
            </span>
            <span className="flex shrink-0 gap-2">
              <button type="button" onClick={() => void borrar()} className="font-semibold text-rose-300 hover:text-rose-200">
                {t('idiomas.charla.siBorrar', 'Borrar')}
              </button>
              <button type="button" onClick={() => setBorrando(false)} className="text-white/50 hover:text-white/80">
                {t('idiomas.form.cancelar', 'Cancelar')}
              </button>
            </span>
          </div>
        )}
      </div>

      {/* Mensajes */}
      <div ref={refLista} className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {(!mensajes || mensajes.length === 0) && (
          <p className="px-2 py-8 text-center text-xs leading-relaxed text-white/35">
            {t('idiomas.charla.vacia', 'Salúdalo en {idioma} o en español: {tutor} conversa a tu nivel, te corrige con suavidad y al final puedes extraer el vocabulario nuevo.', { idioma: perfil.nombre, tutor: voz.nombre })}
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
                    esUsuario ? 'rounded-ee-sm bg-emerald-500/25 text-white/95' : 'rounded-es-sm bg-white/10 text-white/85'
                  }`}
                >
                  {esUsuario ? (
                    <p className="whitespace-pre-wrap break-words">{m.texto}</p>
                  ) : (
                    <TextoConEnlaces
                      texto={m.texto}
                      terminos={temasEnlazables}
                      color={COLOR}
                      onIr={onIrAlTemario}
                    />
                  )}
                  <div className={`mt-0.5 flex items-center justify-end gap-1.5 text-[9px] ${esUsuario ? 'text-emerald-400/80' : 'text-white/30'}`}>
                    {!esUsuario && conTTS && (
                      <button
                        type="button"
                        onClick={() => hablar(m.texto, perfil.codigo)}
                        className="rounded px-1 transition hover:bg-white/10 hover:text-white/70"
                        title={t('idiomas.voc.escuchar', 'Escuchar')}
                      >
                        <Icono nombre="bocina" />
                      </button>
                    )}
                    <span>{new Date(m.creado).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        {pensando && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-es-sm bg-white/10 px-3 py-1.5 text-sm text-white/60">
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
              {t('idiomas.charla.reintentar', 'Reintentar')}
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
              ? t('idiomas.charla.placeholder', 'Escribe en {idioma} o en español…', { idioma: perfil.nombre })
              : t('idiomas.charla.sinIAInput', 'Configura tu IA en Ajustes para charlar')
          }
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-white/30 disabled:opacity-40"
        />
        <Creditos op={conv?.temaId ? OP_CHARLA : OP_CHARLA_NUEVA} />
        <button
          type="submit"
          disabled={!conIA || !input.trim() || pensando}
          className="rounded-xl px-4 py-2 text-sm font-semibold text-black transition disabled:opacity-40"
          style={{ background: COLOR }}
        >
          <Icono nombre="enviar" />
        </button>
      </form>

      {panel && conversacionId != null && (
        <DestilarPanel
          perfil={perfil}
          conversacionId={conversacionId}
          temaId={conv?.temaId}
          mensajes={aMensajesIA()}
          onManual={abrirFormManual}
          onCerrar={() => {
            const alSalir = panel.alSalir
            setPanel(null)
            if (alSalir) onSalir()
          }}
        />
      )}

      {form && (
        <TarjetaForm perfil={perfil} inicial={form.inicial} aviso={form.aviso} onCerrar={() => setForm(null)} />
      )}
    </div>
  )
}
