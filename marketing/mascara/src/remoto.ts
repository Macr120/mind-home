/**
 * Control remoto de la máscara: un segundo teléfono ve por streaming lo que
 * compone el principal (cámara + máscara) y le manda acciones.
 *
 * Transporte: WebRTC punto a punto. El video viaja por el track del lienzo de
 * composición y las acciones/estado por un DataChannel, así cambiar de cámara
 * o de lente NO renegocia nada (la fuente siempre es el mismo canvas). La
 * señalización (oferta/respuesta/ICE) va por un canal efímero que inyecta la
 * app (`CrearSenal`; en MPH es Supabase Realtime): este archivo no conoce
 * Supabase para que el build standalone de marketing siga sin backend.
 *
 * Emparejamiento: el emisor genera un código corto y lo enseña; el controlador
 * lo teclea. Solo STUN (sin TURN): en la misma red funciona siempre; entre
 * redes distintas depende del NAT.
 */
import type { Encuadre } from './grabador'
import type { ModoCara } from './expresiones'

export type RolRemoto = 'emisor' | 'control'

/** Mensaje de señalización que viaja por el canal inyectado. */
export interface MensajeSenal {
  de: RolRemoto
  tipo: 'hola' | 'oferta' | 'respuesta' | 'hielo' | 'adios'
  sdp?: string
  candidato?: RTCIceCandidateInit
  /**
   * Identidad efímera del CONTROLADOR (la genera `controlar`). El emisor se
   * empareja con el primero que saluda y a partir de ahí ignora a cualquier otro
   * mientras dure la conexión: sin esto, un tercero que conociera el código podía
   * secuestrar la sesión viva con un `hola` (auditoría 26-ago-2026).
   */
  sesion?: string
}

/** Id aleatorio de sesión del controlador (16 hex de crypto). */
function nuevaSesion(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(8)), (n) => n.toString(16).padStart(2, '0')).join('')
}

/** Canal de señalización efímero (lo aporta la app anfitriona). */
export interface CanalSenal {
  enviar: (msj: MensajeSenal) => void
  onMensaje: (cb: (msj: MensajeSenal) => void) => void
  cerrar: () => void
}

export type CrearSenal = (codigo: string) => Promise<CanalSenal>

export type EstadoConexion = 'esperando' | 'conectando' | 'conectado' | 'cortado'

/**
 * Estado que el emisor difunde para que el controlador pinte sus controles.
 * Es exactamente el juego de valores que consume `ControlesAjustes`: los dos
 * teléfonos renderizan el MISMO panel con esta forma.
 */
export interface EstadoEmisor {
  camara: 'frontal' | 'trasera'
  lenteId: string
  lentes: { id: string; nombre: string }[]
  mascaraId: string
  modoCara: ModoCara
  encuadre: Encuadre
  expresion: string
  expresionDetectada: string | null
  peinado: string
  piel: string
  pelo: string
  escala: number
  altura: number
  profundidad: number
  zoom: { v: number; min: number; max: number; step: number } | null
  /** null = la cámara activa no tiene linterna. */
  linterna: boolean | null
  grabando: boolean
  segundos: number
  conCara: boolean
}

/** Claves de la Config del emisor que el controlador puede ajustar tal cual. */
export type ClaveAjuste =
  | 'camara'
  | 'lenteId'
  | 'mascaraId'
  | 'modoCara'
  | 'encuadre'
  | 'expresion'
  | 'peinado'
  | 'piel'
  | 'pelo'
  | 'escala'
  | 'altura'
  | 'profundidad'

/** Órdenes que el controlador puede mandar al teléfono principal. */
export type AccionRemota =
  | { accion: 'ajuste'; clave: ClaveAjuste; valor: string | number }
  | { accion: 'zoom'; valor: number }
  | { accion: 'linterna' }
  | { accion: 'grabar' }

type DatoCanal = { tipo: 'estado'; estado: EstadoEmisor } | { tipo: 'accion'; orden: AccionRemota }

const CONFIG_ICE: RTCConfiguration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }

/** Código de emparejamiento: 6 caracteres sin ambiguos (0/O, 1/I). */
export function generarCodigo(): string {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const azar = crypto.getRandomValues(new Uint8Array(6))
  return Array.from(azar, (n) => abc[n % abc.length]).join('')
}

export interface Emisor {
  enviarEstado: (estado: EstadoEmisor) => void
  cerrar: () => void
}

/** Lado del teléfono principal: sirve el stream y obedece las órdenes. */
export function emitir(
  senal: CanalSenal,
  stream: MediaStream,
  avisos: { onEstado: (e: EstadoConexion) => void; onAccion: (orden: AccionRemota) => void },
): Emisor {
  let pc: RTCPeerConnection | null = null
  let dc: RTCDataChannel | null = null
  let pendientes: RTCIceCandidateInit[] = []
  let ultimoEstado: EstadoEmisor | null = null
  let cerrado = false
  // Controlador con el que estamos emparejados; null = libre para el primero.
  let sesionActiva: string | null = null

  const colgar = () => {
    dc?.close()
    pc?.close()
    dc = null
    pc = null
    pendientes = []
  }

  senal.onMensaje((msj) => {
    if (cerrado || msj.de !== 'control') return
    const sesion = msj.sesion ?? ''
    // Primer control gana: emparejados con un controlador, se ignora a cualquier
    // OTRO (distinto `sesion`) —incluidos sus `hola`, `respuesta` e `hielo`—
    // mientras dure la conexión. El mismo controlador sí puede volver a llamar
    // tras un corte (mismo `sesion`). Cierra el secuestro por `hola` ajeno.
    if (sesionActiva !== null && sesion !== sesionActiva) return
    if (msj.tipo === 'hola') {
      // Cada hola del controlador emparejado arranca una conexión limpia: así el
      // mismo código sobrevive a un corte y a que vuelva a llamar.
      sesionActiva = sesion
      colgar()
      avisos.onEstado('conectando')
      const p = new RTCPeerConnection(CONFIG_ICE)
      pc = p
      for (const pista of stream.getTracks()) p.addTrack(pista, stream)
      const canal = p.createDataChannel('control')
      dc = canal
      canal.onopen = () => {
        avisos.onEstado('conectado')
        // El recién llegado necesita el estado completo para pintar sus controles.
        if (ultimoEstado) canal.send(JSON.stringify({ tipo: 'estado', estado: ultimoEstado } satisfies DatoCanal))
      }
      canal.onmessage = (e) => {
        try {
          const dato = JSON.parse(e.data as string) as DatoCanal
          if (dato.tipo === 'accion') avisos.onAccion(dato.orden)
        } catch {
          // mensaje ajeno: ignorar
        }
      }
      p.onicecandidate = (e) => {
        if (e.candidate) senal.enviar({ de: 'emisor', tipo: 'hielo', candidato: e.candidate.toJSON() })
      }
      p.onconnectionstatechange = () => {
        const st = p.connectionState
        if (st === 'failed' || st === 'disconnected' || st === 'closed') {
          // El controlador se fue: liberar el emparejamiento para que otro pueda
          // conectar, sin quedar clavado al `sesion` de quien ya no está.
          if (p === pc) sesionActiva = null
          avisos.onEstado('cortado')
        }
      }
      void (async () => {
        const oferta = await p.createOffer()
        await p.setLocalDescription(oferta)
        senal.enviar({ de: 'emisor', tipo: 'oferta', sdp: oferta.sdp })
      })().catch(() => avisos.onEstado('cortado'))
    } else if (msj.tipo === 'respuesta' && msj.sdp && pc) {
      const p = pc
      void (async () => {
        await p.setRemoteDescription({ type: 'answer', sdp: msj.sdp! })
        for (const c of pendientes) void p.addIceCandidate(c).catch(() => {})
        pendientes = []
      })().catch(() => avisos.onEstado('cortado'))
    } else if (msj.tipo === 'hielo' && msj.candidato) {
      if (pc?.remoteDescription) void pc.addIceCandidate(msj.candidato).catch(() => {})
      else pendientes.push(msj.candidato)
    } else if (msj.tipo === 'adios') {
      sesionActiva = null
      colgar()
      avisos.onEstado('esperando')
    }
  })

  return {
    enviarEstado: (estado) => {
      ultimoEstado = estado
      if (dc?.readyState === 'open') dc.send(JSON.stringify({ tipo: 'estado', estado } satisfies DatoCanal))
    },
    cerrar: () => {
      cerrado = true
      senal.enviar({ de: 'emisor', tipo: 'adios' })
      colgar()
      senal.cerrar()
    },
  }
}

export interface Controlador {
  enviarAccion: (orden: AccionRemota) => void
  /** Vuelve a llamar a la puerta (tras un corte, o si la oferta se perdió). */
  reintentar: () => void
  cerrar: () => void
}

/** Lado del segundo teléfono: recibe el stream y manda las órdenes. */
export function controlar(
  senal: CanalSenal,
  avisos: {
    onEstado: (e: EstadoConexion) => void
    onVideo: (stream: MediaStream) => void
    onEstadoEmisor: (estado: EstadoEmisor) => void
  },
): Controlador {
  let pc: RTCPeerConnection | null = null
  let dc: RTCDataChannel | null = null
  let pendientes: RTCIceCandidateInit[] = []
  let cerrado = false
  let toque: number | null = null
  // Identidad de este controlador: viaja en todos sus mensajes para que el
  // emisor pueda aplicar «primer control gana» y no dejarse secuestrar.
  const sesion = nuevaSesion()

  // El hola se repite hasta que llegue la oferta: cubre un broadcast perdido y
  // el instante en que el emisor todavía no estaba suscrito.
  const detenerToques = () => {
    if (toque !== null) {
      clearInterval(toque)
      toque = null
    }
  }
  const llamar = () => {
    detenerToques()
    senal.enviar({ de: 'control', tipo: 'hola', sesion })
    toque = window.setInterval(() => senal.enviar({ de: 'control', tipo: 'hola', sesion }), 2000)
  }

  senal.onMensaje((msj) => {
    if (cerrado || msj.de !== 'emisor') return
    if (msj.tipo === 'oferta' && msj.sdp) {
      detenerToques()
      dc?.close()
      pc?.close()
      pendientes = []
      avisos.onEstado('conectando')
      const p = new RTCPeerConnection(CONFIG_ICE)
      pc = p
      p.ontrack = (e) => {
        const s = e.streams[0]
        if (s) avisos.onVideo(s)
      }
      p.ondatachannel = (e) => {
        dc = e.channel
        dc.onopen = () => avisos.onEstado('conectado')
        dc.onmessage = (ev) => {
          try {
            const dato = JSON.parse(ev.data as string) as DatoCanal
            if (dato.tipo === 'estado') avisos.onEstadoEmisor(dato.estado)
          } catch {
            // mensaje ajeno: ignorar
          }
        }
      }
      p.onicecandidate = (e) => {
        if (e.candidate) senal.enviar({ de: 'control', tipo: 'hielo', candidato: e.candidate.toJSON(), sesion })
      }
      p.onconnectionstatechange = () => {
        const st = p.connectionState
        if (st === 'failed' || st === 'disconnected' || st === 'closed') avisos.onEstado('cortado')
      }
      void (async () => {
        await p.setRemoteDescription({ type: 'offer', sdp: msj.sdp! })
        for (const c of pendientes) void p.addIceCandidate(c).catch(() => {})
        pendientes = []
        const respuesta = await p.createAnswer()
        await p.setLocalDescription(respuesta)
        senal.enviar({ de: 'control', tipo: 'respuesta', sdp: respuesta.sdp, sesion })
      })().catch(() => avisos.onEstado('cortado'))
    } else if (msj.tipo === 'hielo' && msj.candidato) {
      if (pc?.remoteDescription) void pc.addIceCandidate(msj.candidato).catch(() => {})
      else pendientes.push(msj.candidato)
    } else if (msj.tipo === 'adios') {
      avisos.onEstado('cortado')
    }
  })

  llamar()

  return {
    enviarAccion: (orden) => {
      if (dc?.readyState === 'open') dc.send(JSON.stringify({ tipo: 'accion', orden } satisfies DatoCanal))
    },
    reintentar: llamar,
    cerrar: () => {
      cerrado = true
      detenerToques()
      senal.enviar({ de: 'control', tipo: 'adios', sesion })
      dc?.close()
      pc?.close()
      senal.cerrar()
    },
  }
}
