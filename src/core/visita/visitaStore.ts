import { create } from 'zustand'
import { esVisita, salaVisitada, SS_VISITA } from '../edicion'
import { notificar } from '../notificaciones'
import { tGlobal } from '../i18n/useT'
import { podar } from '../partida/aspecto'
import { esJuegoInvitable, type JuegoInvitable } from '../partida/juegosInvitables'
import { desconectarSala } from '../partida/sala'
import { useDiseño } from '../state/disenoStore'
import type { AspectoRemoto } from '../partida/tipos'

/**
 * Estado de la visita en curso. Entrar a casa de otro RECARGA la pestaña (la BD
 * ya abrió con un nombre y los stores de casa ya hidrataron de ella), así que lo
 * que hay que llevarse al otro lado viaja en `sessionStorage`: el id de la sala,
 * las apps que el anfitrión abrió y MI aspecto podado —el invitado vuelca su
 * propio personaje, o se vería con el cuerpo del anfitrión—.
 *
 * Todo va en `sessionStorage` y nunca en `localStorage`: el flag es de ESTA
 * pestaña, así conviven la casa propia en una ventana y la visitada en otra, y
 * cerrarla lo limpia sin dejar rastro.
 */

/** Apps que el anfitrión abrió para esta visita (ids de plantilla). */
const SS_APPS = 'mh.visita.apps'
/** MI aspecto (`podar`, sin un solo Blob), para volcarlo en la BD de visita. */
const SS_ASPECTO = 'mh.visita.aspecto'
/** Motivo por el que la visita se abortó; lo consume `avisarVisitaAbortada`. */
const SS_ABORTADA = 'mh.visita.abortada'
/** Juego al que hay que llevar al invitado nada más entrar (se consume una vez). */
const SS_JUEGO = 'mh.visita.juego'

export type FaseVisita = 'bajando' | 'aplicando' | 'lista' | 'error'
export type MotivoAbandono = 'plano' | 'sala' | 'red'

/**
 * Modo LOCAL de pruebas: sin invitación no hay nada en `sessionStorage`, así que
 * las apps abiertas se pasan por la URL (`?visitaApps=cocina,biblioteca`). Las
 * leen las dos ventanas: el anfitrión para armar el plano y el invitado para
 * saber qué cuartos puede abrir.
 */
export function appsDeUrl(): string[] {
  if (typeof location === 'undefined') return []
  const crudo = new URLSearchParams(location.search).get('visitaApps')
  if (!crudo) return []
  return crudo
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean)
    .slice(0, 32)
}

function leerApps(): string[] {
  try {
    const crudo = JSON.parse(sessionStorage.getItem(SS_APPS) ?? 'null') as unknown
    if (Array.isArray(crudo)) return crudo.filter((a): a is string => typeof a === 'string').slice(0, 32)
  } catch {
    // Almacenamiento bloqueado: queda la vía de la URL.
  }
  return appsDeUrl()
}

interface VisitaState {
  salaId: string | null
  apps: readonly string[]
  fase: FaseVisita
  fijarFase: (fase: FaseVisita) => void
}

export const useVisita = create<VisitaState>((set) => ({
  salaId: salaVisitada(),
  apps: esVisita() ? leerApps() : [],
  fase: esVisita() ? 'bajando' : 'lista',
  fijarFase: (fase) => set({ fase }),
}))

/** MI aspecto guardado antes de recargar (lo vuelca `aplicarPlano`). */
export function aspectoDelInvitado(): AspectoRemoto | null {
  try {
    const crudo = JSON.parse(sessionStorage.getItem(SS_ASPECTO) ?? 'null') as unknown
    return crudo && typeof crudo === 'object' ? (crudo as AspectoRemoto) : null
  } catch {
    return null
  }
}

/** La URL de esta pestaña con (o sin) `?visita=`, sin duplicar el resto. */
function urlVisita(salaId: string | null): string {
  const url = new URL(location.href)
  if (salaId) url.searchParams.set('visita', salaId)
  else url.searchParams.delete('visita')
  return url.toString()
}

function limpiarSesion(): void {
  try {
    sessionStorage.removeItem(SS_VISITA)
    sessionStorage.removeItem(SS_APPS)
    sessionStorage.removeItem(SS_ASPECTO)
    sessionStorage.removeItem(SS_JUEGO)
  } catch {
    // Almacenamiento bloqueado: la recarga ya sale de la visita igual.
  }
}

/**
 * Acepta la visita: deja el equipaje en `sessionStorage` y recarga contra la BD
 * `mind-home-visita`. `assign` (no `replace`): volver atrás devuelve a la casa
 * propia, que es lo que espera el botón de retroceso.
 */
export function entrarAVisita(salaId: string, apps: readonly string[], juego?: JuegoInvitable): void {
  try {
    sessionStorage.setItem(SS_VISITA, salaId)
    sessionStorage.setItem(SS_APPS, JSON.stringify([...apps].slice(0, 32)))
    sessionStorage.setItem(SS_ASPECTO, JSON.stringify(podar(useDiseño.getState().avatar)))
    if (juego) sessionStorage.setItem(SS_JUEGO, juego)
    else sessionStorage.removeItem(SS_JUEGO)
  } catch {
    // Sin sessionStorage la visita no puede sobrevivir a la recarga: no se entra.
    return
  }
  location.assign(urlVisita(salaId))
}

/**
 * El juego que pidió el enlace, si lo hay. Primero `sessionStorage` (lo dejó
 * `entrarAVisita`) y si no el `?juego=` de la URL, que es lo único que queda al
 * abrir el enlace en frío en otro dispositivo.
 */
export function juegoPendienteVisita(): JuegoInvitable | null {
  try {
    const guardado = sessionStorage.getItem(SS_JUEGO)
    if (esJuegoInvitable(guardado)) return guardado
  } catch {
    // Almacenamiento bloqueado: queda la vía de la URL.
  }
  if (typeof location === 'undefined') return null
  const enUrl = new URLSearchParams(location.search).get('juego')
  return esJuegoInvitable(enUrl) ? enUrl : null
}

/** Se lleva una sola vez: una recarga dentro de la visita ya no teletransporta. */
export function consumirJuegoVisita(): void {
  try {
    sessionStorage.removeItem(SS_JUEGO)
  } catch {
    // Almacenamiento bloqueado: solo queda limpiar la URL.
  }
  if (typeof location === 'undefined') return
  const url = new URL(location.href)
  if (!url.searchParams.has('juego')) return
  url.searchParams.delete('juego')
  history.replaceState(null, '', url.toString())
}

/** Vuelve a casa propia por decisión del invitado. */
export function salirDeVisita(): void {
  // El `salir` sale por el canal antes de navegar; el `partida_salir` puede
  // quedarse a medias con la navegación y entonces la sala muere por latido.
  desconectarSala('boton')
  limpiarSesion()
  location.replace(urlVisita(null))
}

/**
 * Sale de la visita SIN pasar por la BD (C10): la usa el `db.on('ready')` de
 * `db.ts` cuando el plano no se puede bajar, inflar o validar. No lanza nunca y
 * no toca la sala: la pestaña se va de inmediato y la sala muere por latido.
 * `replace` (no `assign`) para no dejar la URL de visita en el historial: con
 * ella, un «atrás» reintentaría el mismo fallo.
 */
export function abandonarVisita(motivo: MotivoAbandono): void {
  try {
    sessionStorage.setItem(SS_ABORTADA, motivo)
  } catch {
    // Sin aviso, pero saliendo igual.
  }
  limpiarSesion()
  location.replace(urlVisita(null))
}

/** Al arrancar en casa propia: si la visita anterior se cortó, se dice por qué. */
export function avisarVisitaAbortada(): void {
  let motivo: string | null
  try {
    motivo = sessionStorage.getItem(SS_ABORTADA)
    if (motivo) sessionStorage.removeItem(SS_ABORTADA)
  } catch {
    return
  }
  if (!motivo) return
  const cuerpo =
    motivo === 'sala'
      ? tGlobal('visita.abortada.sala', 'La sala se cerró.')
      : motivo === 'red'
        ? tGlobal('visita.abortada.red', 'Se perdió la conexión.')
        : tGlobal('visita.abortada.plano', 'No se pudo cargar esa casa.')
  void notificar({
    clave: 'visita:abortada',
    titulo: tGlobal('visita.abortada.titulo', 'Volviste a tu casa'),
    cuerpo,
    efimero: true,
  })
}
