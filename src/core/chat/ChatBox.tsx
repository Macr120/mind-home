import { useMemo, useRef, useState, useEffect } from 'react'
import { getPlantilla } from '../registry'
import { getCuarto, useCuartos } from '../state/cuartosStore'
import { bitacoraRepo, memoriasRepo, mensajesChatRepo, useUltimosMensajes } from '../data/repository'
import { useAjustes } from '../state/ajustesStore'
import { useLayout, roomWorldPos } from '../state/layoutStore'
import { useMascota } from '../state/mascotaStore'
import { useDiseño } from '../state/disenoStore'
import { playerPos } from '../state/houseStore'
import { getCatalogoItem } from '../house/catalogo'
import { interpretar, appsAsignadas } from './dispatcher'
import {
  iaActiva,
  interpretarIA,
  PROVEEDORES,
  getProveedor,
  setProveedor,
  getIaKey,
  setIaKey,
  getModeloLocal,
  setModeloLocal,
  type ProveedorId,
} from './ia'
import { responder, type EventoTipo } from './mascotas'
import { useAsistentes } from '../state/asistentesStore'
import { ChatConversacion } from './ChatConversacion'
import { AsistentesConfig } from './AsistentesConfig'
import { useT } from '../i18n/useT'

/** Mínimo de la Web Speech API que usamos (no viene en lib.dom). */
interface ReconocimientoVoz {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onend: (() => void) | null
  onerror: ((ev: { error?: string }) => void) | null
  start(): void
  stop(): void
}

const CtorVoz = (window as unknown as {
  SpeechRecognition?: new () => ReconocimientoVoz
  webkitSpeechRecognition?: new () => ReconocimientoVoz
}).SpeechRecognition ?? (window as unknown as {
  webkitSpeechRecognition?: new () => ReconocimientoVoz
}).webkitSpeechRecognition

/** Imagen adjunta lista para previsualizar y enviar al modelo. */
interface ImagenLocal {
  dataUrl: string
  base64: string
  mediaType: string
}

/** Cuarto colocado en el mapa más cercano al avatar (para soltar objetos ahí). */
function cuartoMasCercano(): string | null {
  const placed = useLayout.getState().placed
  let mejor: string | null = null
  let mejorDist = Infinity
  for (const r of useCuartos.getState().cuartos) {
    if (!placed[r.id]) continue
    const [x, , z] = roomWorldPos(r.id)
    const d = (x - playerPos.x) ** 2 + (z - playerPos.z) ** 2
    if (d < mejorDist) {
      mejorDist = d
      mejor = r.id
    }
  }
  return mejor
}

/**
 * Chat box del "arquitecto" (orquestador), anclado abajo-centro.
 *
 * Funciones en capa SIN IA:
 *   1. Bitácora + etiqueta de cuarto (guarda texto con roomId detectado).
 *   2. Quick-capture: si el cuarto tiene `capturar()`, escribe en su tabla real.
 *   3. Comandos: "agregar/quitar <cuarto>" afectan el layout del mapa.
 *   4. Retag manual: ✏️ en una entrada → selector de cuarto.
 *   5. Mascota: una "cara y voz" (mago/gato/perro…) que responde cada mensaje.
 */
export function ChatBox({ menuAbierto = false }: { menuAbierto?: boolean }) {
  const t = useT()
  const [texto, setTexto] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [plegado, setPlegado] = useState(false)
  const [retagId, setRetagId] = useState<number | null>(null)
  const [imagen, setImagen] = useState<ImagenLocal | null>(null)
  const [grabando, setGrabando] = useState(false)
  const [menuModelo, setMenuModelo] = useState(false)
  const [provId, setProvId] = useState<ProveedorId>(() => getProveedor().id)
  const [claveDraft, setClaveDraft] = useState(() => getIaKey(getProveedor().id))
  const [modeloLocalDraft, setModeloLocalDraft] = useState(() => getModeloLocal())
  const recRef = useRef<ReconocimientoVoz | null>(null)
  const idioma = useAjustes((s) => s.idioma)
  const entradas = bitacoraRepo.useAll()
  const memorias = memoriasRepo.useAll()
  const addRoomGround = useLayout((s) => s.addRoomGround)
  const placed = useLayout((s) => s.placed)
  const mascotaId = useMascota((s) => s.mascota)
  const setMascota = useMascota((s) => s.setMascota)
  const hablar = useMascota((s) => s.decir)
  const irA = useMascota((s) => s.irA)
  const conversacion = useMascota((s) => s.conversacion)
  const abrirConversacion = useMascota((s) => s.abrirConversacion)
  const cerrarConversacion = useMascota((s) => s.cerrarConversacion)
  const setPensando = useMascota((s) => s.setPensando)
  const asistentes = useAsistentes((s) => s.lista)
  const [configAbierto, setConfigAbierto] = useState(false)
  // Pestaña del panel: chats (con quién platicaste) o registros de la bitácora.
  const [pestana, setPestana] = useState<'chats' | 'registros'>('chats')
  const ultimos = useUltimosMensajes()
  const addObjeto = useDiseño((s) => s.addObjeto)
  const mascota = asistentes.find((a) => a.id === mascotaId) ?? asistentes[0]

  /** Con el menú lateral abierto, pliega el chat para no tapar la UI. */
  useEffect(() => {
    if (menuAbierto) {
      setAbierto(false)
      setConfigAbierto(false)
      setPlegado(true)
    } else {
      setPlegado(false)
    }
  }, [menuAbierto])

  // Previsualización en vivo de a dónde irá la entrada.
  const interp = useMemo(() => interpretar(texto), [texto])
  // El id detectado puede ser una APP (captura/recordar) o un CUARTO (comando):
  // sus ids son disjuntos, así que se resuelve probando ambos.
  const destino = interp.roomId ? getPlantilla(interp.roomId) ?? getCuarto(interp.roomId) : null
  const destinoCaptura = interp.roomId ? getPlantilla(interp.roomId) : null
  const objetoCat = interp.objeto ? getCatalogoItem(interp.objeto) : null

  /** Hace hablar al asistente (la respuesta sale por la burbuja flotante 3D). */
  const decir = (tipo: EventoTipo, cuarto?: string, objeto?: string) => {
    hablar(responder(mascota.forma, { tipo, cuarto, objeto }))
  }

  /** Abre la conversación tipo chat con un asistente (cierra los otros paneles). */
  const abrirConv = (id: string) => {
    setAbierto(false)
    setConfigAbierto(false)
    abrirConversacion(id)
  }

  /** Lee la foto elegida y la deja lista (dataURL → base64 + mediaType). */
  const cargarImagen = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const coma = dataUrl.indexOf(',')
      const mediaType = dataUrl.slice(5, dataUrl.indexOf(';'))
      setImagen({ dataUrl, base64: dataUrl.slice(coma + 1), mediaType })
    }
    reader.readAsDataURL(file)
  }

  /** Dictado por voz (Web Speech API): el resultado va al input. */
  const toggleVoz = () => {
    if (grabando) {
      recRef.current?.stop()
      return
    }
    if (!CtorVoz) return
    const rec = new CtorVoz()
    rec.lang = idioma === 'en' ? 'en-US' : 'es-MX'
    rec.interimResults = true
    rec.continuous = false
    rec.onresult = (ev) => {
      let s = ''
      for (let i = 0; i < ev.results.length; i++) s += ev.results[i][0].transcript
      setTexto(s)
    }
    rec.onend = () => setGrabando(false)
    // El error más común es el permiso del micrófono: dilo claro, no falles en silencio.
    rec.onerror = (ev) => {
      setGrabando(false)
      const motivo = ev.error ?? ''
      if (motivo === 'no-speech') return // terminó sin oír nada, no es un error real
      const MENSAJES: Record<string, string> = {
        'not-allowed': t('chat.voz.permiso', 'El navegador bloqueó el micrófono. Actívalo en el candado 🔒 junto a la dirección.'),
        'service-not-allowed': t('chat.voz.permiso', 'El navegador bloqueó el micrófono. Actívalo en el candado 🔒 junto a la dirección.'),
        'audio-capture': t('chat.voz.sinMic', 'No encontré ningún micrófono en este equipo.'),
        network: t('chat.voz.red', 'El dictado del navegador necesita internet.'),
        'language-not-supported': t('chat.voz.idioma', 'Tu navegador no soporta dictado en este idioma.'),
      }
      hablar(MENSAJES[motivo] ?? t('chat.voz.error', 'No pude usar el dictado ({motivo}).', { motivo }))
    }
    recRef.current = rec
    setGrabando(true)
    try {
      rec.start()
    } catch {
      setGrabando(false)
    }
  }

  const elegirProveedor = (id: ProveedorId) => {
    setProveedor(id)
    setProvId(id)
    setClaveDraft(getIaKey(id))
  }

  const proveedor = PROVEEDORES.find((p) => p.id === provId) ?? PROVEEDORES[0]
  const conIA = iaActiva()

  const nombreCorto = (roomId: string) =>
    (getPlantilla(roomId) ?? getCuarto(roomId))?.nombre.split(' · ')[0] ?? roomId
  /** Nombre corto traducido (para mostrar en la UI). */
  const nombreCortoT = (roomId: string) =>
    t(`room.${roomId}.nombre`, nombreCorto(roomId))

  const enviar = async () => {
    if (!interp.texto.trim() && !imagen) return
    // El asistente se reubica al lugar desde donde le pediste algo.
    irA(playerPos.x + 1.2, playerPos.z + 1.2)

    // Lo que escribes queda en la conversación con el asistente activo.
    mensajesChatRepo.add({
      asistenteId: mascotaId,
      rol: 'usuario',
      texto: interp.texto.trim() || '📷 Foto',
      creado: new Date().toISOString(),
    })

    // Crear objeto del catálogo en el cuarto más cercano al avatar.
    if (interp.objeto) {
      const item = getCatalogoItem(interp.objeto)
      const roomId = cuartoMasCercano()
      if (!item || !roomId) {
        hablar('No hay ningún cuarto en el mapa donde colocarlo. Agrega uno primero.')
        setTexto('')
        return
      }
      await addObjeto(roomId, item.id, item.defaultColor)
      await bitacoraRepo.add({
        texto: interp.texto,
        roomId,
        creado: new Date().toISOString(),
        procesado: true,
      })
      decir('objeto', nombreCorto(roomId), item.nombre.toLowerCase())
      setTexto('')
      return
    }

    // Memoria del arquitecto: "recuerda que…" (puede no tener cuarto).
    if (interp.comando === 'recordar') {
      await memoriasRepo.add({
        hecho: interp.texto,
        roomId: interp.roomId ?? undefined,
        creado: new Date().toISOString(),
        vigente: true,
      })
      decir('recordado', interp.roomId ? nombreCorto(interp.roomId) : undefined)
      setTexto('')
      return
    }

    // Comandos del arquitecto: agregar (asegura colocación) / quitar (elimina) cuarto
    if (interp.comando && interp.roomId) {
      const nom = nombreCorto(interp.roomId)
      if (interp.comando === 'quitar') await useCuartos.getState().eliminar(interp.roomId)
      else await addRoomGround(interp.roomId)
      decir(interp.comando, nom)
      setTexto('')
      return
    }

    // Capa de IA: el modelo interpreta, registra vía esquemas y responde en
    // la voz de la mascota. Si falla (sin red, clave inválida), cae al
    // dispatcher determinista de abajo sin que el usuario pierda el mensaje.
    if (conIA) {
      try {
        // Burbuja "pensando…" inmediata: feedback de que el Enter sí envió.
        setPensando(true)
        const textoMsg = interp.texto.trim() || 'Registra lo que muestra la imagen.'
        const r = await interpretarIA(
          textoMsg,
          mascotaId,
          imagen ? { base64: imagen.base64, mediaType: imagen.mediaType } : null,
        )
        await bitacoraRepo.add({
          texto: interp.texto.trim() || '📷 Foto',
          roomId: r.roomIds[0],
          creado: new Date().toISOString(),
          procesado: r.capturado,
        })
        if (r.respuesta) hablar(r.respuesta)
        else if (r.rutinaCreada) hablar(`⏰ Rutina «${r.rutinaCreada}» creada. La verás en el panel de rutinas.`)
        else if (r.capturado) decir('capturado', r.roomIds.map(nombreCorto).join(' y '))
        else if (r.memoriaGuardada) decir('recordado')
        else decir('sinClasificar')
        setTexto('')
        setImagen(null)
        return
      } catch (err) {
        console.warn('[Mind Home] IA no disponible, usando dispatcher local:', err)
        setPensando(false)
        setImagen(null) // el dispatcher local no puede ver fotos
      }
    }
    if (!interp.texto.trim()) return // solo había foto y la IA falló

    // Guardar en bitácora (con el cuarto principal detectado)
    const id = await bitacoraRepo.add({
      texto: interp.texto,
      roomId: interp.roomId ?? undefined,
      creado: new Date().toISOString(),
      procesado: false,
    })

    // Quick-capture: intentar escribir en TODOS los cuartos mencionados (multi-cuarto).
    if (interp.roomIds.length > 0) {
      const capturados: string[] = []
      for (const rid of interp.roomIds) {
        const app = getPlantilla(rid)
        if (app?.capturar && (await app.capturar(interp.texto))) {
          capturados.push(nombreCorto(rid))
        }
      }
      if (capturados.length > 0) {
        await bitacoraRepo.update(id as number, { procesado: true })
        decir('capturado', capturados.join(' y '))
      } else {
        decir('clasificado', interp.roomIds.map(nombreCorto).join(' y '))
      }
    } else {
      decir('sinClasificar')
    }

    setTexto('')
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviar()
    }
    if (e.key === 'Escape') (e.target as HTMLInputElement).blur()
  }

  // Retag: asigna una app a una entrada y reintenta quick-capture
  const retag = async (entradaId: number, roomId: string) => {
    const app = getPlantilla(roomId)
    if (!app) return
    const entrada = entradas?.find((e) => e.id === entradaId)
    if (!entrada) return

    let procesado = false
    if (app.capturar) procesado = await app.capturar(entrada.texto)
    await bitacoraRepo.update(entradaId, { roomId, procesado })
    setRetagId(null)
    decir(procesado ? 'capturado' : 'clasificado', nombreCorto(roomId))
  }

  const recientes = entradas?.slice(0, 15) ?? []
  const memoriasVigentes = memorias?.filter((m) => m.vigente) ?? []
  const chatPlegado = menuAbierto && plegado && !conversacion

  return (
    // left-44: margen al joystick (izq.); right-48: deja hueco con el cubo/botones de rotación (der.).
    // Con menú lateral: anclado a la derecha del sidebar (w-60 = 15rem).
    <div
      className={[
        'absolute bottom-4 z-20 min-w-0 select-none',
        menuAbierto ? 'left-60 right-4 sm:right-48' : 'left-4 right-4 sm:left-44 sm:right-48',
      ].join(' ')}
    >
      {/* Conversación tipo chat con el asistente (estilo WhatsApp) */}
      {conversacion && <ChatConversacion />}

      {/* Configuración de asistentes (crear, eliminar, personalizar, mapa) */}
      {configAbierto && !conversacion && (
        <AsistentesConfig onCerrar={() => setConfigAbierto(false)} />
      )}

      {/* Historial reciente + selector de mascota */}
      {abierto && !conversacion && !configAbierto && (
        <div className="ui-panel-glass mb-2 max-h-72 overflow-y-auto rounded-2xl border border-white/10 p-2 shadow-xl backdrop-blur-md">
          {/* Cabecera: elegir asistente */}
          <div className="mb-2 flex items-center gap-2 border-b border-white/10 px-1 pb-2">
            <span className="text-[11px] font-semibold text-white/50">
              {t('chat.tuAsistente', 'Tu asistente:')}
            </span>
            <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
              {asistentes.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    // Re-tocar el asistente activo abre su conversación.
                    if (m.id === mascotaId) {
                      abrirConv(m.id)
                    } else {
                      setMascota(m.id)
                      hablar(m.saludo)
                    }
                  }}
                  title={
                    m.id === mascotaId
                      ? `${m.nombre} · ${t('chat.abrirConv', 'ver conversación')}`
                      : m.nombre
                  }
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-lg transition ${
                    m.id === mascotaId ? 'bg-emerald-500/20 ring-1 ring-emerald-400/50' : 'hover:bg-white/10'
                  }`}
                >
                  {m.emoji}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                setConfigAbierto(true)
                setAbierto(false)
              }}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-base text-white/40 transition hover:bg-white/10 hover:text-white/85"
              title={t('chat.config.abrir', 'Configurar asistentes')}
            >
              ⚙️
            </button>
          </div>

          {/* Pestañas: conversaciones (con quién platicaste) / registros (lo que pediste) */}
          <div className="mb-1 flex gap-1 px-1">
            {(['chats', 'registros'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPestana(p)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                  pestana === p
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : 'text-white/40 hover:bg-white/10 hover:text-white/70'
                }`}
              >
                {p === 'chats' ? `💬 ${t('chat.tab.chats', 'Chats')}` : `🗒️ ${t('chat.tab.registros', 'Registros')}`}
              </button>
            ))}
          </div>

          {/* Lista de conversaciones, estilo lista de chats */}
          {pestana === 'chats' &&
            asistentes.map((m) => {
              const u = ultimos?.[m.id]
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => abrirConv(m.id)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition hover:bg-white/5"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-xl">
                    {m.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-white/85">{m.nombre}</span>
                      {u && (
                        <span className="shrink-0 text-[10px] text-white/35">
                          {new Date(u.creado).toLocaleTimeString(undefined, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-white/45">
                      {u
                        ? u.rol === 'usuario'
                          ? `${t('chat.tu', 'Tú')}: ${u.texto}`
                          : u.texto
                        : m.saludo}
                    </p>
                  </div>
                </button>
              )
            })}

          {pestana === 'registros' && (
            <>
          {/* Memorias del arquitecto: lo que sabe de ti entre sesiones */}
          {memoriasVigentes.length > 0 && (
            <div className="mb-2 border-b border-white/10 px-1 pb-2">
              <p className="mb-1 text-[11px] font-semibold text-violet-300/70">
                🧠 {t('chat.memorias', 'Lo que recuerdo de ti')}
              </p>
              {memoriasVigentes.map((m) => (
                <div key={m.id} className="flex items-start gap-2 rounded-lg px-1 py-1 hover:bg-white/5">
                  <span className="mt-0.5 text-sm leading-none">
                    {(m.roomId && (getPlantilla(m.roomId) ?? getCuarto(m.roomId))?.icon) || '🧠'}
                  </span>
                  <p className="min-w-0 flex-1 break-words text-xs text-white/75">{m.hecho}</p>
                  <button
                    type="button"
                    onClick={() => m.id != null && memoriasRepo.remove(m.id)}
                    className="px-1 py-0.5 text-[11px] text-white/20 transition hover:text-white/60"
                    title={t('chat.olvidar', 'Olvidar')}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {recientes.length === 0 && (
            <p className="px-2 py-3 text-center text-xs text-white/35">
              {t('chat.vacio', 'Aún no hay registros. Cuéntale al arquitecto qué hiciste.')}
            </p>
          )}

          {recientes.map((e) => {
            const room = e.roomId ? getPlantilla(e.roomId) ?? getCuarto(e.roomId) : null
            const enRetag = retagId === e.id
            return (
              <div key={e.id} className="group">
                <div className="flex items-start gap-2 rounded-xl px-2 py-1.5 hover:bg-white/5">
                  <span className="mt-0.5 text-base leading-none">{room ? room.icon : '🗒️'}</span>
                  {/* Tocar el registro abre la conversación con el asistente. */}
                  <div
                    className="min-w-0 flex-1 cursor-pointer"
                    onClick={() => abrirConv(mascotaId)}
                    title={t('chat.verConv', 'Ver la conversación completa')}
                  >
                    <p className="break-words text-sm text-white/85">{e.texto}</p>
                    <p className="flex items-center gap-1.5 text-[10px] text-white/35">
                      <span>{room ? nombreCortoT(room.id) : t('chat.sinClasificar', 'Sin clasificar')}</span>
                      {e.procesado && <span className="text-emerald-400">✓ {t('chat.capturado', 'capturado')}</span>}
                      <span>·</span>
                      <span>
                        {new Date(e.creado).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setRetagId(enRetag ? null : (e.id ?? null))}
                      className={`rounded px-1 py-0.5 text-[11px] transition hover:bg-white/10 ${enRetag ? 'text-white/80' : 'text-white/25 hover:text-white/70'}`}
                      title={t('chat.reclasificar', 'Reclasificar')}
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => e.id != null && bitacoraRepo.remove(e.id)}
                      className="px-1 py-0.5 text-[11px] text-white/20 transition hover:text-white/60"
                      title={t('chat.eliminar', 'Eliminar')}
                    >
                      ✕
                    </button>
                  </div>
                </div>
                {enRetag && (
                  <div className="mb-1 ml-8 flex flex-wrap gap-1">
                    {appsAsignadas().length === 0 && (
                      <span className="px-1 py-1 text-[10px] text-white/35">
                        {t('chat.sinApps', 'No hay apps asignadas. Asígnalas a un objeto en un cuarto.')}
                      </span>
                    )}
                    {appsAsignadas().map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => e.id != null && retag(e.id, r.id)}
                        className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/70 hover:bg-white/15"
                        style={{ borderColor: `${r.color}44` }}
                      >
                        <span>{r.icon}</span>
                        <span>{nombreCortoT(r.id)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
            </>
          )}
        </div>
      )}

      {chatPlegado ? (
        <button
          type="button"
          onClick={() => setPlegado(false)}
          title={`${mascota.nombre} · ${t('chat.abrir', 'Abrir chat')}`}
          className="ml-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/55 text-2xl shadow-xl backdrop-blur-md transition hover:scale-105 hover:bg-white/10"
        >
          {mascota.emoji}
        </button>
      ) : (
        <>
      {/* Foto adjunta (la interpreta la IA al enviar) */}
      {imagen && (
        <div className="ui-panel-glass mb-2 inline-flex items-center gap-2 rounded-xl border border-white/10 p-1.5 shadow-xl backdrop-blur-md">
          <img src={imagen.dataUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
          <span className="text-[11px] text-white/50">{t('chat.fotoLista', 'Foto lista para enviar')}</span>
          <button
            type="button"
            onClick={() => setImagen(null)}
            className="px-1.5 text-xs text-white/40 transition hover:text-white/80"
            title={t('chat.quitarFoto', 'Quitar foto')}
          >
            ✕
          </button>
        </div>
      )}

      {/* Barra de entrada */}
      <div className="ui-panel-glass relative flex items-center gap-2 rounded-2xl border border-white/10 px-2.5 py-2 shadow-xl backdrop-blur-md">
        {menuAbierto && (
          <button
            type="button"
            onClick={() => setPlegado(true)}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm text-white/45 transition hover:bg-white/10 hover:text-white/80"
            title={t('chat.plegar', 'Plegar chat')}
          >
            ›
          </button>
        )}
        {/* Selector de modelo de IA */}
        {menuModelo && (
          <div className="ui-panel-glass absolute bottom-full right-0 mb-2 w-72 rounded-2xl border border-white/10 p-2 shadow-xl backdrop-blur-md">
            <p className="mb-1.5 px-1 text-[11px] font-semibold text-white/50">
              🧠 {t('chat.modelo.titulo', 'Modelo de IA de los asistentes')}
            </p>
            <div className="space-y-1">
              {PROVEEDORES.map((p) => {
                const activo = p.id === provId
                const listo = p.sinClave || getIaKey(p.id).length > 0
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => elegirProveedor(p.id)}
                    className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-xs font-semibold transition ${
                      activo
                        ? 'border-emerald-400/40 bg-emerald-500/15 text-white'
                        : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <span>{p.emoji}</span>
                    <span className="flex-1 text-left">{p.nombre}</span>
                    {listo && <span className="text-[10px] text-emerald-400">●</span>}
                  </button>
                )
              })}
            </div>
            {proveedor.sinClave ? (
              <div className="mt-2 space-y-1 border-t border-white/10 pt-2">
                <input
                  value={modeloLocalDraft}
                  onChange={(e) => {
                    setModeloLocalDraft(e.target.value)
                    setModeloLocal(e.target.value)
                  }}
                  placeholder="gemma4"
                  className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white/85 placeholder:text-white/25 focus:outline-none"
                />
                <p className="text-[10px] leading-relaxed text-white/35">
                  {t('chat.modelo.local', 'Requiere Ollama corriendo en tu equipo (puerto 11434). Gratis y privado.')}
                </p>
              </div>
            ) : (
              <div className="mt-2 space-y-1 border-t border-white/10 pt-2">
                <input
                  type="password"
                  value={claveDraft}
                  onChange={(e) => {
                    setClaveDraft(e.target.value)
                    setIaKey(provId, e.target.value)
                  }}
                  placeholder={t('chat.modelo.clave', 'Clave API de {prov}', { prov: proveedor.nombre })}
                  autoComplete="off"
                  className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white/85 placeholder:text-white/25 focus:outline-none"
                />
                <p className="text-[10px] leading-relaxed text-white/35">
                  {t('chat.modelo.priv', 'Se guarda solo en este dispositivo. Sin clave: modo local por palabras clave.')}
                </p>
              </div>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            // Con la conversación abierta, este botón regresa al historial.
            if (conversacion) {
              cerrarConversacion()
              setAbierto(true)
            } else {
              setConfigAbierto(false)
              setAbierto((v) => !v)
            }
          }}
          title={abierto ? t('chat.ocultar', 'Ocultar bitácora') : `${mascota.nombre} · ${t('chat.verBitacora', 'ver bitácora')}`}
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-2xl transition hover:scale-105 ${
            abierto || conversacion ? 'bg-emerald-500/20' : 'bg-white/5 hover:bg-white/10'
          }`}
        >
          {mascota.emoji}
        </button>

        {/* Adjuntar foto/archivo (requiere IA activa para interpretarla) */}
        <label
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-2xl font-light leading-none transition ${
            conIA
              ? 'cursor-pointer text-white/45 hover:bg-white/10 hover:text-white/85'
              : 'cursor-not-allowed text-white/15'
          }`}
          title={
            conIA
              ? t('chat.foto', 'Adjuntar foto (comida, ticket…)')
              : t('chat.fotoSinIa', 'Las fotos requieren IA: elige un modelo en el botón de la derecha')
          }
        >
          +
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={!conIA}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) cargarImagen(f)
              e.target.value = ''
            }}
          />
        </label>

        <div className="relative min-w-0 flex-1">
          <input
            value={texto}
            onChange={(ev) => setTexto(ev.target.value)}
            onKeyDown={onKeyDown}
            placeholder={
              interp.objeto && objetoCat
                ? t('chat.ph.crear', '{icon} Crear {obj} en el mapa', {
                    icon: objetoCat.icon,
                    obj: objetoCat.nombre.toLowerCase(),
                  })
                : interp.comando === 'recordar'
                ? t('chat.ph.recordar', '🧠 Guardar en la memoria de {pet}', { pet: mascota.nombre })
                : interp.comando
                ? `${interp.comando === 'agregar' ? t('chat.ph.agregar', '➕ Agregar') : t('chat.ph.quitar', '➖ Quitar')} ${destino ? nombreCortoT(destino.id) : '…'} ${t('chat.ph.delMapa', 'del mapa')}`
                : t('chat.ph.principal', 'Dile a {pet} qué hiciste…  (usa @cuarto para forzar destino)', { pet: mascota.nombre })
            }
            className="w-full bg-transparent py-1.5 text-sm text-white/90 placeholder:text-white/30 focus:outline-none"
          />
        </div>

        {/* Chip de destino, comando u objeto en vivo */}
        {texto.trim() && (
          <span
            className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold"
            style={
              interp.objeto && objetoCat
                ? { backgroundColor: `${objetoCat.defaultColor}22`, color: objetoCat.defaultColor }
                : interp.comando === 'recordar'
                ? { backgroundColor: 'rgba(167,139,250,0.15)', color: '#a78bfa' }
                : destino
                ? { backgroundColor: `${destino.color}22`, color: destino.color }
                : { backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' }
            }
          >
            {interp.objeto && objetoCat ? (
              <>
                <span>{objetoCat.icon}</span>
                <span>{t('chat.chip.crear', 'Crear')} {objetoCat.nombre.toLowerCase()}</span>
              </>
            ) : interp.comando === 'recordar' ? (
              <>
                <span>🧠</span>
                <span>{t('chat.chip.recordar', 'Recordar')}</span>
              </>
            ) : interp.comando ? (
              <>
                <span>{interp.comando === 'agregar' ? '➕' : '➖'}</span>
                <span>{destino ? nombreCortoT(destino.id) : '?'}</span>
                {destino && (
                  <span className="ml-0.5 text-[10px] opacity-60">
                    {placed[destino.id] ? t('chat.chip.enMapa', '(en mapa)') : t('chat.chip.fuera', '(fuera)')}
                  </span>
                )}
              </>
            ) : (
              <>
                <span>{destino ? destino.icon : '🗒️'}</span>
                <span className="max-w-[7rem] truncate">
                  {destino ? nombreCortoT(destino.id) : t('chat.sinClasificar', 'Sin clasificar')}
                </span>
                {destinoCaptura?.capturar && <span className="ml-0.5 text-[10px] opacity-60">⚡</span>}
              </>
            )}
          </span>
        )}

        {/* Dictado por voz */}
        {CtorVoz && (
          <button
            type="button"
            onClick={toggleVoz}
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg transition ${
              grabando
                ? 'animate-pulse bg-red-500/20 text-red-300'
                : 'text-white/45 hover:bg-white/10 hover:text-white/85'
            }`}
            title={grabando ? t('chat.vozParar', 'Detener dictado') : t('chat.voz', 'Dictar por voz')}
          >
            🎤
          </button>
        )}

        {/* Modelo de IA */}
        <button
          type="button"
          onClick={() => setMenuModelo((v) => !v)}
          className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg transition hover:bg-white/10 ${
            menuModelo ? 'bg-white/10' : ''
          }`}
          title={t('chat.modelo', 'Modelo de IA: {prov}', { prov: proveedor.nombre })}
        >
          {proveedor.emoji}
          <span
            className={`absolute right-1 top-1 h-1.5 w-1.5 rounded-full ${
              conIA ? 'bg-emerald-400' : 'bg-white/20'
            }`}
          />
        </button>

        <button
          type="button"
          onClick={enviar}
          disabled={!interp.texto.trim() && !imagen}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500/90 text-lg text-white transition hover:bg-emerald-400 disabled:opacity-30"
          title={t('chat.registrar', 'Registrar')}
        >
          ↑
        </button>
      </div>
        </>
      )}
    </div>
  )
}
