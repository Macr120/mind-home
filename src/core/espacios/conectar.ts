import { hayBackend } from '../cuenta/supabase'
import { useSesion } from '../cuenta/sesionStore'
import * as api from './api'
import * as cache from './cache'
import { conectarCalendario, engancharCalendario } from './calendario'
import { useEspaciosStore } from './espaciosStore'
import { abrirEspacio, cerrarTodos, espacioAbierto } from './motor'
import { espacioLocal } from './transporte'
import type { Espacio } from './tipos'

/**
 * Enchufa los espacios compartidos al ciclo de sesión (llamar UNA vez desde
 * `main.tsx`, como `conectarBuzon`). Al aparecer el usuario refresca la lista;
 * al cambiar de cuenta en el mismo dispositivo vacía la caché de la anterior.
 *
 * De todos los tipos, en segundo plano solo se abren los CALENDARIOS: sus
 * eventos son filas de Dexie que la casa entera lee (rejilla, Misiones,
 * avisos). Los del Studio viven mientras su editor está montado.
 */

let conectado = false
/** Espacios que este módulo mantiene abiertos (una referencia cada uno). */
const deFondo = new Set<string>()

export function conectarEspacios(): void {
  if (conectado) return
  conectado = true
  conectarCalendario()
  // Modo de pruebas local: no hay sesión ni backend que seguir.
  if (espacioLocal()) {
    void refrescarEspacios()
    return
  }
  if (!hayBackend()) return
  // Se compara por `usuario.id`: el objeto `usuario` se reemplaza en cada refresh de token.
  useSesion.subscribe((s, prev) => {
    const ahora = s.usuario?.id ?? null
    const antes = prev.usuario?.id ?? null
    if (ahora === antes) return
    if (antes) detener()
    if (ahora) void iniciar(ahora)
  })
  const uid = useSesion.getState().usuario?.id
  if (uid) void iniciar(uid)
}

async function iniciar(uid: string): Promise<void> {
  if ((await cache.usuarioDeCache()) !== uid) {
    await cache.limpiarCacheEspacios()
    await cache.fijarUsuarioDeCache(uid)
  }
  await refrescarEspacios()
}

function detener(): void {
  cerrarTodos()
  deFondo.clear()
  useEspaciosStore.setState({ lista: [], vivos: {}, panelCompartir: null })
}

/** Relee la lista del servidor, la deja en la caché y abre los calendarios. */
export async function refrescarEspacios(): Promise<void> {
  try {
    const lista = await api.listar()
    useEspaciosStore.setState({ lista })
    await cache.guardarLista(lista)
    sincronizarFondo(lista)
  } catch {
    // El campanazo del buzón y la siguiente apertura lo reintentan.
  }
}

function sincronizarFondo(lista: Espacio[]): void {
  const calendarios = new Set(lista.filter((e) => e.tipo === 'calendario').map((e) => e.espacioId))
  for (const id of calendarios) {
    if (deFondo.has(id)) continue
    deFondo.add(id)
    // El tipo «calendario» le pone al espacio sus dos mitades: el drenado de la
    // cola local y la escritura en Dexie de lo que llega del log.
    engancharCalendario(abrirEspacio(id, { cursor: 'persistente' }))
  }
  for (const id of [...deFondo]) {
    if (calendarios.has(id)) continue
    deFondo.delete(id)
    espacioAbierto(id)?.cerrar()
  }
}

if (import.meta.env.DEV) {
  void import('./enlaces').then((enlaces) => {
    ;(window as unknown as { mhEspacios: unknown }).mhEspacios = {
      api,
      cache,
      abrirEspacio,
      espacioAbierto,
      refrescarEspacios,
      enlaceEspacio: enlaces.enlaceEspacio,
      useEspacios: useEspaciosStore,
    }
  })
}
