import { lazy, memo, Suspense, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { VistaBlob } from '../../../rooms/_shared/ImagenIA'
import { descargarArchivo } from '../../descargarArchivo'
import { useT } from '../../i18n/useT'
import { useMascota } from '../../state/mascotaStore'
import { Icono } from '../../ui/iconos/Icono'
import { bloquear, mensajeErrorBuzon, reportar } from '../api'
import { useBuzon } from '../buzonStore'
import { actualizarMensaje, contactosCache, useContactoDeHilo, useMensajesHilo } from '../cache'
import { extractoDe, separarCita } from '../cita'
import { borrarMensaje, descargarBlobDe, marcarLeido, reenviable, reenviar, refrescarContactos, reintentar } from '../motor'
import { pedirReporte } from '../reportar'
import { elegir } from '../../state/confirmarStore'
import { useSesion } from '../../cuenta/sesionStore'
import type { NombreIcono } from '../../ui/iconos/catalogo'
import type { AccionHilo } from './PanelAccionesHilo'
import type { Contacto, MensajeBuzon } from '../tipos'
import { Retrato } from './Retrato'
import { TarjetaContenido } from './TarjetaContenido'
import { TarjetaJuego } from './TarjetaJuego'
import { TarjetaEspacio } from '../../espacios/ui/TarjetaEspacio'

const PanelAccionesHilo = lazy(() => import('./PanelAccionesHilo').then((m) => ({ default: m.PanelAccionesHilo })))

/** Pulsación larga en táctil (misma que en el mapa). */
const LARGA_MS = 450
const ACCIONES: AccionHilo[] = ['jugar', 'enviar', 'colaborar']
const ICONO_ACCION: Record<AccionHilo, NombreIcono> = { jugar: 'joystick', enviar: 'enviar', colaborar: 'vincular' }

/** Dónde se abrió el menú de un mensaje, relativo al hilo. */
interface MenuAbierto {
  m: MensajeBuzon
  x: number
  y: number
  /** Tamaño del hilo al abrirlo (para que el menú no se salga). */
  ancho: number
  alto: number
}

/**
 * El hilo con una persona del buzón: misma forma que la conversación con un
 * asistente (burbujas propias a la derecha), pero los datos vienen de la caché
 * del buzón y se responde desde la barra de abajo, que en este estado envía a
 * la persona en vez de al modelo.
 */
function ChatConversacionPersonaInterno({ hiloId, onCerrar }: { hiloId: string; onCerrar: () => void }) {
  const t = useT()
  const contacto = useContactoDeHilo(hiloId)
  const mensajes = useMensajesHilo(hiloId)
  const refLista = useRef<HTMLDivElement>(null)
  const refRaiz = useRef<HTMLDivElement>(null)
  const [accion, setAccion] = useState<AccionHilo | null>(null)
  const [menu, setMenu] = useState<MenuAbierto | null>(null)
  const [soloFavoritos, setSoloFavoritos] = useState(false)
  const [iFijado, setIFijado] = useState(0)
  const [resaltado, setResaltado] = useState<string | null>(null)

  useEffect(() => {
    const el = refLista.current
    if (el && !soloFavoritos) el.scrollTop = el.scrollHeight
  }, [mensajes?.length, hiloId, soloFavoritos])

  // Leído: al abrir el hilo y con cada mensaje nuevo, si la pestaña está a la vista.
  useEffect(() => {
    if (document.visibilityState === 'visible') void marcarLeido(hiloId)
  }, [hiloId, mensajes?.length])

  if (!contacto) return null
  const bloqueado = contacto.estado === 'bloqueado'
  const fijados = (mensajes ?? []).filter((m) => m.fijado).sort((a, b) => (b.fijado ?? '').localeCompare(a.fijado ?? ''))
  const fijado = fijados.length ? fijados[iFijado % fijados.length] : null
  const visibles = soloFavoritos ? (mensajes ?? []).filter((m) => m.favorito) : mensajes

  /** Lleva la vista a un mensaje y lo resalta un momento. */
  const irA = (uid: string) => {
    setSoloFavoritos(false)
    requestAnimationFrame(() => {
      document.getElementById(`msj-${uid}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      setResaltado(uid)
      setTimeout(() => setResaltado((r) => (r === uid ? null : r)), 1600)
    })
  }

  /** Tocar una cita busca el mensaje citado (el más reciente anterior con ese extracto). */
  const irACita = (uidDesde: string, extracto: string) => {
    const lista = mensajes ?? []
    const hasta = lista.findIndex((m) => m.uid === uidDesde)
    const base = extracto.replace(/…$/, '')
    for (let i = (hasta < 0 ? lista.length : hasta) - 1; i >= 0; i--) {
      if (extractoDe(lista[i], t).startsWith(base)) return irA(lista[i].uid)
    }
  }

  const abrirMenu = (m: MensajeBuzon, cx: number, cy: number) => {
    const r = refRaiz.current?.getBoundingClientRect()
    if (!r) return
    setMenu({ m, x: cx - r.left, y: cy - r.top, ancho: r.width, alto: r.height })
  }

  return (
    <div
      ref={refRaiz}
      className="ui-panel-glass relative mb-2 flex max-h-[55vh] flex-col rounded-2xl border border-white/10 shadow-xl backdrop-blur-md"
    >
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <Retrato retrato={contacto.retrato} emoji={contacto.emoji} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white/90">{contacto.nombre || `@${contacto.alias}`}</p>
          <p className="truncate text-[10px] text-white/40">
            @{contacto.alias}
            {bloqueado && ` · ${t('buzon.bloqueado', 'Bloqueado')}`}
          </p>
        </div>
        {/* Jugar · Enviar · Colaborar: cada uno abre su panel encima del hilo */}
        {!bloqueado &&
          contacto.hiloId &&
          ACCIONES.map((a) => {
            const texto =
              a === 'jugar'
                ? t('buzon.accion.jugar', 'Jugar')
                : a === 'enviar'
                  ? t('buzon.accion.enviar', 'Enviar')
                  : t('buzon.accion.colaborar', 'Colaborar')
            return (
              <button
                key={a}
                type="button"
                onClick={() => setAccion((x) => (x === a ? null : a))}
                title={texto}
                aria-pressed={accion === a}
                className={`flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition ${
                  accion === a ? 'bg-accent/20 text-accent' : 'text-white/60 hover:bg-white/10 hover:text-white/90'
                }`}
              >
                <Icono nombre={ICONO_ACCION[a]} />
                <span className="hidden sm:inline">{texto}</span>
              </button>
            )
          })}
        <button
          type="button"
          onClick={() => setSoloFavoritos((v) => !v)}
          className={`rounded px-1.5 py-1 text-sm transition hover:bg-white/10 ${soloFavoritos ? 'text-amber-300' : 'text-white/25 hover:text-white/70'}`}
          title={t('buzon.favoritos', 'Favoritos')}
          aria-pressed={soloFavoritos}
        >
          <Icono nombre="estrella" />
        </button>
        <button
          type="button"
          onClick={() => useBuzon.getState().abrirContactos()}
          className="rounded px-1.5 py-1 text-sm text-white/25 transition hover:bg-white/10 hover:text-white/70"
          title={t('buzon.contactos', 'Contactos')}
        >
          <Icono nombre="companeros" />
        </button>
        <button
          type="button"
          onClick={onCerrar}
          className="rounded px-2 py-1 text-sm text-white/40 transition hover:bg-white/10 hover:text-white/80"
          title={t('chat.conv.cerrar', 'Cerrar')}
        >
          ✕
        </button>
      </div>

      {/* Mensaje fijado (el más reciente; tocar el contador pasa al siguiente) */}
      {fijado && !soloFavoritos && (
        <div className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-3 py-1">
          <span className="text-xs text-white/45">
            <Icono nombre="chincheta" />
          </span>
          <button type="button" onClick={() => irA(fijado.uid)} className="min-w-0 flex-1 text-start">
            <span className="block text-[10px] font-semibold text-white/45">{t('buzon.fijado', 'Mensaje fijado')}</span>
            <span className="block truncate text-[11px] text-white/75">{extractoDe(fijado, t) || t('buzon.borrado', 'Mensaje eliminado')}</span>
          </button>
          {fijados.length > 1 && (
            <button
              type="button"
              onClick={() => setIFijado((i) => i + 1)}
              className="rounded px-1.5 py-0.5 text-[10px] text-white/45 transition hover:bg-white/10"
            >
              {(iFijado % fijados.length) + 1}/{fijados.length}
            </button>
          )}
        </div>
      )}

      <div ref={refLista} className="min-h-[8rem] flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {soloFavoritos && visibles?.length === 0 && (
          <p className="px-2 py-8 text-center text-xs text-white/35">
            {t('buzon.favoritos.vacio', 'Aún no hay favoritos. Mantén pulsado un mensaje (o clic derecho) y elige «Favorito»')}
          </p>
        )}
        {!soloFavoritos && (!mensajes || mensajes.length === 0) && (
          <p className="px-2 py-8 text-center text-xs text-white/35">
            {t('buzon.conv.vacia', 'Aún no hay mensajes con {n}. Escríbele desde la barra de abajo', {
              n: contacto.nombre || `@${contacto.alias}`,
            })}{' '}
            <Icono nombre="abajo" />
          </p>
        )}
        {visibles?.map((m, i) => {
          const dia = m.creadoEn.slice(0, 10)
          const diaPrevio = i > 0 ? visibles[i - 1].creadoEn.slice(0, 10) : null
          return (
            <div key={m.uid} id={`msj-${m.uid}`}>
              {dia !== diaPrevio && (
                <div className="my-2 flex justify-center">
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] text-white/45">
                    {new Date(m.creadoEn).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              )}
              <Burbuja
                m={m}
                resaltado={resaltado === m.uid}
                onMenu={(x, y) => abrirMenu(m, x, y)}
                onCita={(extracto) => irACita(m.uid, extracto)}
              />
            </div>
          )
        })}
      </div>

      {accion && (
        <div className="absolute inset-x-1 bottom-1 top-14 z-20">
          <Suspense fallback={null}>
            <PanelAccionesHilo accion={accion} contacto={contacto} onCerrar={() => setAccion(null)} />
          </Suspense>
        </div>
      )}

      {menu && <MenuMensaje menu={menu} contacto={contacto} onCerrar={() => setMenu(null)} />}
    </div>
  )
}

const ANCHO_MENU = 190

/** Opciones de un mensaje (pulsación larga, clic derecho o la flechita), estilo WhatsApp. */
function MenuMensaje({
  menu,
  contacto,
  onCerrar,
}: {
  menu: MenuAbierto
  contacto: Contacto
  onCerrar: () => void
}) {
  const t = useT()
  const miAlias = useSesion((s) => s.alias)
  const hablar = useMascota((s) => s.decir)
  const { m, alto, ancho } = menu
  const fallo = (e: unknown) => hablar(mensajeErrorBuzon(e, t), { persistir: false })
  const vivo = m.tipo !== 'borrado'
  const cuerpo = separarCita(m.texto).cuerpo

  const opciones: { id: string; icono: NombreIcono; texto: string; peligro?: boolean; hacer: () => unknown }[] = []
  if (vivo && !m.sistema) {
    opciones.push({
      id: 'responder',
      icono: 'atras',
      texto: t('buzon.menu.responder', 'Responder'),
      hacer: () =>
        useBuzon.getState().responder(m.hiloId, {
          autor: m.mio ? `@${miAlias ?? ''}` : `@${contacto.alias}`,
          extracto: extractoDe(m, t),
        }),
    })
  }
  if (cuerpo.trim()) {
    opciones.push({
      id: 'copiar',
      icono: 'duplicar',
      texto: t('buzon.menu.copiar', 'Copiar'),
      hacer: async () => {
        await navigator.clipboard.writeText(cuerpo)
        hablar(t('buzon.copiado', 'Copiado'), { persistir: false })
      },
    })
  }
  if (vivo && reenviable(m)) {
    opciones.push({
      id: 'reenviar',
      icono: 'siguiente',
      texto: t('buzon.menu.reenviar', 'Reenviar'),
      hacer: async () => {
        const otros = (await contactosCache()).filter((c) => c.estado === 'aceptado' && c.hiloId)
        const hilo = await elegir({
          titulo: t('buzon.reenviar.titulo', 'Reenviar a…'),
          opciones: otros.map((c) => ({ valor: c.hiloId!, texto: c.nombre ? `${c.nombre} · @${c.alias}` : `@${c.alias}` })),
        })
        if (!hilo) return
        await reenviar(m, hilo)
        const c = otros.find((x) => x.hiloId === hilo)
        hablar(t('buzon.reenviar.listo', 'Reenviado a @{a}', { a: c?.alias ?? '' }), { persistir: false })
      },
    })
  }
  if (vivo) {
    opciones.push({
      id: 'fijar',
      icono: 'chincheta',
      texto: m.fijado ? t('buzon.menu.desfijar', 'Desfijar') : t('buzon.menu.fijar', 'Fijar'),
      hacer: () => actualizarMensaje(m.uid, { fijado: m.fijado ? undefined : new Date().toISOString() }),
    })
    opciones.push({
      id: 'favorito',
      icono: 'estrella',
      texto: m.favorito ? t('buzon.menu.quitarFavorito', 'Quitar de favoritos') : t('buzon.menu.favorito', 'Favorito'),
      hacer: () => actualizarMensaje(m.uid, { favorito: !m.favorito }),
    })
  }
  // Solo lo que mandó la otra persona y ya está en el servidor (es la copia que se guarda como prueba).
  if (vivo && !m.mio && !m.sistema && m.serverSeq > 0) {
    opciones.push({
      id: 'reportar',
      icono: 'bandera',
      texto: t('buzon.reportar', 'Reportar'),
      peligro: true,
      hacer: async () => {
        const r = await pedirReporte(`@${contacto.alias}`, contacto.estado !== 'bloqueado')
        if (!r) return
        await reportar(contacto.contactoId, m.uid, r.motivo, r.detalle)
        if (r.bloquear) {
          await bloquear(contacto.contactoId, true)
          await refrescarContactos()
        }
        hablar(t('buzon.reportar.listo', 'Gracias. Lo revisaremos en menos de 24 horas.'), { persistir: false })
      },
    })
  }
  opciones.push({
    id: 'borrar',
    icono: 'basura',
    texto: t('buzon.menu.borrar', 'Borrar'),
    peligro: true,
    hacer: async () => {
      // Para todos solo lo mío que ya llegó al servidor; las notas locales, solo aquí.
      const salidas = [{ valor: 'mi', texto: t('buzon.borrar.paraMi', 'Borrar para mí') }]
      if (m.mio && !m.sistema && m.serverSeq > 0 && vivo) {
        salidas.push({ valor: 'todos', texto: t('buzon.borrar.paraTodos', 'Borrar para todos') })
      }
      const r = await elegir({ titulo: t('buzon.borrar.titulo', '¿Borrar este mensaje?'), opciones: salidas })
      if (r) await borrarMensaje(m, r === 'todos')
    },
  })

  // Dentro del hilo: se abre hacia donde haya sitio.
  const altoMenu = opciones.length * 34 + 8
  const left = Math.max(4, Math.min(menu.x, ancho - ANCHO_MENU - 4))
  const top = Math.max(4, Math.min(menu.y, alto - altoMenu - 4))

  return (
    <>
      <div
        className="absolute inset-0 z-30"
        onPointerDown={onCerrar}
        onContextMenu={(e) => {
          e.preventDefault()
          onCerrar()
        }}
      />
      <div
        role="menu"
        className="ui-panel-glass absolute z-40 overflow-hidden rounded-xl border border-white/15 py-1 shadow-2xl backdrop-blur-md"
        style={{ left, top, width: ANCHO_MENU }}
      >
        {opciones.map((o) => (
          <button
            key={o.id}
            type="button"
            role="menuitem"
            onClick={() => {
              onCerrar()
              void Promise.resolve()
                .then(o.hacer)
                .catch(fallo)
            }}
            className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-start text-sm transition hover:bg-white/10 ${
              o.peligro ? 'text-red-300' : 'text-white/85'
            }`}
          >
            <span className="w-4 text-center text-white/50">
              <Icono nombre={o.icono} />
            </span>
            {o.texto}
          </button>
        ))}
      </div>
    </>
  )
}

function Burbuja({
  m,
  resaltado,
  onMenu,
  onCita,
}: {
  m: MensajeBuzon
  resaltado: boolean
  onMenu: (x: number, y: number) => void
  onCita: (extracto: string) => void
}) {
  const t = useT()
  const miAlias = useSesion((s) => s.alias)
  const [ocupado, setOcupado] = useState(false)
  const hablar = useMascota((s) => s.decir)
  const fallo = (e: unknown) => hablar(mensajeErrorBuzon(e, t), { persistir: false })
  const larga = useRef<{ timer: number; x: number; y: number } | null>(null)
  const { cita, cuerpo } = separarCita(m.texto)

  const descargar = async () => {
    setOcupado(true)
    try {
      const blob = m.blob ?? (await descargarBlobDe(m))
      if (blob && m.tipo === 'pdf') await descargarArchivo(blob, m.adjunto?.nombre || 'documento.pdf')
    } catch (e) {
      fallo(e)
    } finally {
      setOcupado(false)
    }
  }

  const volverAEnviar = async () => {
    setOcupado(true)
    try {
      await reintentar(m.uid)
    } catch (e) {
      fallo(e)
    } finally {
      setOcupado(false)
    }
  }

  // Clic derecho en escritorio; pulsación larga en táctil (iOS no dispara `contextmenu`).
  const cancelarLarga = () => {
    if (larga.current) clearTimeout(larga.current.timer)
    larga.current = null
  }
  const gestos = {
    onContextMenu: (e: ReactMouseEvent) => {
      e.preventDefault()
      cancelarLarga()
      onMenu(e.clientX, e.clientY)
    },
    onPointerDown: (e: ReactPointerEvent) => {
      if (e.pointerType === 'mouse') return
      const { clientX: x, clientY: y } = e
      cancelarLarga()
      larga.current = { x, y, timer: window.setTimeout(() => ((larga.current = null), onMenu(x, y)), LARGA_MS) }
    },
    onPointerMove: (e: ReactPointerEvent) => {
      if (larga.current && Math.hypot(e.clientX - larga.current.x, e.clientY - larga.current.y) > 10) cancelarLarga()
    },
    onPointerUp: cancelarLarga,
    onPointerCancel: cancelarLarga,
  }

  /** La flechita que aparece al pasar el ratón (como en WhatsApp Web). */
  const flecha = (
    <button
      type="button"
      onClick={(e) => onMenu(e.clientX, e.clientY)}
      className="absolute end-1 top-1 hidden rounded-full bg-black/30 px-1 text-[10px] text-white/60 transition hover:text-white group-hover:block"
      title={t('buzon.menu.opciones', 'Opciones')}
      aria-label={t('buzon.menu.opciones', 'Opciones')}
    >
      <Icono nombre="desplegado" />
    </button>
  )

  // Respuesta de la app a una orden: nota centrada, no una burbuja de la persona.
  if (m.sistema && !m.mio) {
    return (
      <div className="my-1 flex justify-center">
        <p
          {...gestos}
          className={`group relative max-w-[90%] rounded-xl px-3 py-1.5 text-center text-[11px] text-white/60 transition ${
            resaltado ? 'bg-accent/20' : 'bg-white/5'
          }`}
        >
          <Icono nombre="campana" /> {m.texto}
          <span className="ms-1.5 text-[9px] text-white/30">{t('buzon.sistema.soloTu', 'Solo tú ves esto')}</span>
          {m.fijado && (
            <span className="ms-1 text-[9px] text-white/40">
              <Icono nombre="chincheta" />
            </span>
          )}
          {flecha}
        </p>
      </div>
    )
  }

  return (
    <div className={`flex ${m.mio ? 'justify-end' : 'justify-start'}`}>
      <div
        {...gestos}
        className={`group relative max-w-[80%] rounded-2xl px-3 py-1.5 text-sm transition ${
          m.mio ? 'rounded-ee-sm bg-emerald-500/25 text-white/95' : 'rounded-es-sm bg-white/10 text-white/85'
        } ${m.estado === 'enviando' ? 'opacity-60' : ''} ${resaltado ? 'ring-2 ring-accent/70' : ''}`}
      >
        {flecha}
        {cita && (
          <button
            type="button"
            onClick={() => onCita(cita.extracto)}
            className="mb-1 block w-full rounded-lg border-s-2 border-emerald-400/70 bg-black/20 px-2 py-1 text-start"
          >
            <span className="block text-[10px] font-semibold text-emerald-300/90">
              {cita.autor === `@${miAlias}` ? t('buzon.tu', 'Tú') : cita.autor}
            </span>
            <span className="block truncate text-[11px] text-white/55">{cita.extracto}</span>
          </button>
        )}
        {m.tipo === 'imagen' &&
          (m.blob ? (
            <div className="mb-1 overflow-hidden rounded-xl border border-white/10">
              <VistaBlob blob={m.blob} ampliable className="max-h-64 w-full object-contain" />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void descargar()}
              disabled={ocupado}
              className="mb-1 flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/70 transition hover:border-accent/50"
            >
              <Icono nombre="imagen" /> {t('buzon.adjunto.descargar', 'Descargar')}
            </button>
          ))}
        {m.tipo === 'pdf' && (
          <button
            type="button"
            onClick={() => void descargar()}
            disabled={ocupado}
            className="mb-1 flex w-full items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-2.5 py-2 text-start transition hover:border-accent/50"
          >
            <span className="text-xl">
              <Icono nombre="pdf" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold">{m.adjunto?.nombre || 'PDF'}</span>
              <span className="block text-[10px] text-white/45">
                {m.adjunto ? `${Math.max(1, Math.round(m.adjunto.size / 1024))} KB · ` : ''}
                {t('buzon.adjunto.descargar', 'Descargar')}
              </span>
            </span>
          </button>
        )}
        {(m.tipo === 'audio' || m.tipo === 'video') &&
          (m.blob ? (
            <Reproductor blob={m.blob} video={m.tipo === 'video'} />
          ) : (
            <button
              type="button"
              onClick={() => void descargar()}
              disabled={ocupado}
              className="mb-1 flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/70 transition hover:border-accent/50"
            >
              <Icono nombre={m.tipo === 'video' ? 'pelicula' : 'musica'} />
              <span className="max-w-40 truncate">{m.adjunto?.nombre}</span>
              <span className="text-white/45">· {t('buzon.adjunto.reproducir', 'Reproducir')}</span>
            </button>
          ))}
        {m.tipo === 'contenido' &&
          m.contenido &&
          (m.contenido.app === 'espacio' ? (
            <TarjetaEspacio m={m} />
          ) : m.contenido.app === 'partida' ? (
            <TarjetaJuego m={m} />
          ) : (
            <TarjetaContenido m={m} />
          ))}
        {m.tipo === 'borrado' && <p className="italic text-white/45">{t('buzon.borrado', 'Mensaje eliminado')}</p>}
        {cuerpo && <p className="whitespace-pre-line break-words">{cuerpo}</p>}
        <div className="mt-0.5 flex items-center justify-end gap-1.5">
          {m.favorito && (
            <span className="text-[9px] text-amber-300/90" title={t('buzon.favoritos', 'Favoritos')}>
              <Icono nombre="estrella" />
            </span>
          )}
          {m.fijado && (
            <span className="text-[9px] text-white/45" title={t('buzon.fijado', 'Mensaje fijado')}>
              <Icono nombre="chincheta" />
            </span>
          )}
          {m.estado === 'error' && (
            <button
              type="button"
              onClick={() => void volverAEnviar()}
              disabled={ocupado}
              className="text-[10px] font-semibold text-red-400 hover:underline"
            >
              {t('buzon.error.envio', 'No se pudo enviar')} · {t('buzon.reintentar', 'Reintentar')}
            </button>
          )}
          {m.estado === 'enviando' && <span className="text-[9px] text-white/40">{t('buzon.enviando', 'Enviando…')}</span>}
          {m.sistema && <span className="text-[9px] text-white/40">{t('buzon.sistema.soloTu', 'Solo tú ves esto')}</span>}
          {m.mio && !m.estado && m.leidoEn && (
            <span className="text-[9px] text-emerald-300/80" title={t('buzon.leido', 'Leído')}>
              <Icono nombre="confirmar" />
            </span>
          )}
          <p className={`text-[9px] ${m.mio ? 'text-emerald-400/80' : 'text-white/30'}`}>
            {new Date(m.creadoEn).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    </div>
  )
}

/** Audio o video ya descargado: el reproductor nativo sobre una URL del blob. */
function Reproductor({ blob, video }: { blob: Blob; video: boolean }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    const u = URL.createObjectURL(blob)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- la URL debe nacer en el efecto para sobrevivir el remount de StrictMode (como VistaBlob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  if (!url) return null
  return video ? (
    <video src={url} controls playsInline className="mb-1 max-h-64 w-full rounded-xl" />
  ) : (
    <audio src={url} controls className="mb-1 w-60 max-w-full" />
  )
}

/**
 * Memoizado: ChatBox se re-renderiza en cada tecla del textarea; los datos
 * llegan por hooks propios, así que solo `hiloId` y `onCerrar` deciden el repintado.
 */
export const ChatConversacionPersona = memo(ChatConversacionPersonaInterno)
