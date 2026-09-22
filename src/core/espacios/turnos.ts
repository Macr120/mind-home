import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useT } from '../i18n/useT'
import { mensajeErrorEspacio, bloquear, liberar } from './api'
import { useEspaciosStore } from './espaciosStore'
import { espacioAbierto } from './motor'
import { ErrorEspacio, RENOVAR_MS, type BloqueoEspacio } from './tipos'

/**
 * El TURNO de edición de un espacio: el arriendo con el que audio y video se
 * editan de uno en uno (su unidad es el proyecto entero, así que dos personas
 * escribiendo a la vez se pisarían el JSON).
 *
 * Quien tiene el turno lo renueva cada dos minutos; al soltarlo, al desmontar
 * el editor o al ocultar la app se libera (antes se vacía lo pendiente con
 * `antesDeSoltar`, para que quien entre después no herede un estado viejo). Si
 * la pestaña muere sin liberar, el arriendo caduca solo a los cinco minutos.
 *
 * Genérico a propósito: no sabe nada de audio ni de video, solo del espacio.
 */

/** Cada cuánto se recalcula si el arriendo ajeno ya venció (el banner caduca solo). */
const TIC_MS = 15_000

/**
 * Reloj compartido por todos los `useTurno`: sin él habría que leer `Date.now()`
 * al pintar (impuro) y el banner de un arriendo vencido se quedaría pegado
 * hasta que algo más provocara un render.
 */
let ahoraTic = Date.now()
let timerTic = 0
const oyentesTic = new Set<() => void>()

function suscribirTic(fn: () => void): () => void {
  oyentesTic.add(fn)
  if (!timerTic) {
    ahoraTic = Date.now()
    timerTic = window.setInterval(() => {
      ahoraTic = Date.now()
      for (const o of [...oyentesTic]) o()
    }, TIC_MS)
  }
  return () => {
    oyentesTic.delete(fn)
    if (oyentesTic.size === 0) {
      window.clearInterval(timerTic)
      timerTic = 0
    }
  }
}

const leerTic = () => ahoraTic

export interface BloqueoConAlias extends BloqueoEspacio {
  /** Alias de quien tiene el turno; null si aún no se conocen los miembros. */
  alias: string | null
}

export interface Turno {
  tengoTurno: boolean
  bloqueo: BloqueoConAlias | null
  /** Nadie lo tiene o su arriendo ya venció: el botón de tomar el turno sirve. */
  puedoTomar: boolean
  tomar: () => Promise<void>
  soltar: () => Promise<void>
  error: string
  ocupado: boolean
}

export function useTurno(
  espacioId: string | undefined,
  opciones?: { antesDeSoltar?: () => Promise<void> },
): Turno {
  const t = useT()
  // El motor ya espeja aquí lo que dice el servidor (releer tras cada `bloqueo`).
  const bloqueoVivo = useEspaciosStore((s) => (espacioId ? (s.vivos[espacioId]?.bloqueo ?? null) : null))
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)
  // Con un arriendo en pie hay que repintar aunque nadie toque nada: al pasar
  // su hora, el botón «Tomar el turno» se habilita solo.
  const ahora = useSyncExternalStore(suscribirTic, leerTic)
  const renovarRef = useRef(0)

  const abierto = espacioId ? espacioAbierto(espacioId) : null
  const yo = abierto?.estado()?.yo ?? ''
  const vencido = !bloqueoVivo || new Date(bloqueoVivo.hasta).getTime() <= ahora
  const tengoTurno = !!bloqueoVivo && !vencido && bloqueoVivo.por === yo
  const bloqueo: BloqueoConAlias | null = bloqueoVivo
    ? { ...bloqueoVivo, alias: abierto?.miembros().find((m) => m.miembroId === bloqueoVivo.por)?.alias ?? null }
    : null

  const pararRenovacion = () => {
    if (!renovarRef.current) return
    window.clearInterval(renovarRef.current)
    renovarRef.current = 0
  }

  const tomar = useCallback(async () => {
    if (!espacioId) return
    setOcupado(true)
    setError('')
    try {
      await bloquear(espacioId)
      pararRenovacion()
      renovarRef.current = window.setInterval(() => {
        void bloquear(espacioId).catch(() => undefined)
      }, RENOVAR_MS)
      // El aviso del canal no vuelve al emisor: el estado propio se relee.
      await espacioAbierto(espacioId)?.releer()
    } catch (e) {
      setError(
        e instanceof ErrorEspacio && e.codigo === 'bloqueado'
          ? t('esp.turno.ocupado', 'Alguien más está editando; espera a que suelte o venza su turno')
          : mensajeErrorEspacio(e, t),
      )
      // El aviso se va solo: en cuanto el otro suelte dejaría de ser cierto.
      window.setTimeout(() => setError(''), 6000)
    } finally {
      setOcupado(false)
    }
  }, [espacioId, t])

  // `antesDeSoltar` cambia de identidad en cada render de quien llama: se lee
  // por ref para que `soltar` (y con ella los efectos) no se rehagan.
  const flushRef = useRef(opciones?.antesDeSoltar)
  useEffect(() => {
    flushRef.current = opciones?.antesDeSoltar
  })

  const soltar = useCallback(async () => {
    if (!espacioId) return
    pararRenovacion()
    try {
      await flushRef.current?.()
    } catch {
      // Lo que no se pudo enviar se reintenta al siguiente guardado.
    }
    setError('')
    try {
      await liberar(espacioId)
      await espacioAbierto(espacioId)?.releer()
    } catch {
      // Sin liberar, el arriendo caduca solo: no vale la pena molestar con esto.
    }
  }, [espacioId])

  const tengoRef = useRef(false)
  useEffect(() => {
    tengoRef.current = tengoTurno
  })

  // Al cerrar el editor se suelta. Al OCULTARSE no: cambiar de pestaña diez
  // segundos no puede costar el turno; solo se vacía lo pendiente (por si la
  // pestaña muere) y el arriendo sigue renovándose, o caduca solo a los cinco
  // minutos si la pestaña no vuelve.
  useEffect(() => {
    if (!espacioId) return
    const alOcultar = () => {
      if (document.visibilityState === 'hidden' && tengoRef.current) void flushRef.current?.()
    }
    document.addEventListener('visibilitychange', alOcultar)
    return () => {
      document.removeEventListener('visibilitychange', alOcultar)
      pararRenovacion()
      if (tengoRef.current) void soltar()
    }
  }, [espacioId, soltar])

  return { tengoTurno, bloqueo, puedoTomar: !bloqueoVivo || vencido, tomar, soltar, error, ocupado }
}
