import { create } from 'zustand'

/**
 * Confirmaciones y peticiones de texto con un modal propio, en vez de
 * `window.confirm` / `window.prompt`.
 *
 * Los diálogos del navegador no son fiables aquí: en WebView/Capacitor o en el
 * preview embebido pueden no mostrarse y devolver `false`/`null` sin avisar, con
 * lo que la acción se cancela sola y parece que el botón "no hace nada" (fue
 * justo lo que pasó al borrar cuartos, ver `EliminarCuartoDialog`).
 *
 * Mismo patrón promesa-en-store que `pedirDestinoObjeto`: quien pregunta hace
 * `await confirmar(...)` y no necesita estado propio ni montar ningún modal — el
 * único `<ConfirmarDialog>` vive en `App.tsx`. Eso importa porque los sitios que
 * preguntan (`FilaMeta`, `FilaPlanNodo`) se pintan UNA VEZ POR FILA.
 */
export interface PeticionConfirmar {
  /** Correlativo: le sirve de `key` al diálogo para reiniciar su input sin efectos. */
  id: number
  /** 'texto' añade un input y resuelve la cadena escrita (o null al cancelar). */
  tipo: 'confirmar' | 'texto'
  titulo: string
  mensaje?: string
  /** Etiqueta del botón que acepta; sin valor, «Confirmar». */
  textoOk?: string
  /** Pinta el botón en rojo: la acción destruye algo. */
  peligro?: boolean
  /** Valor de arranque del input (solo en 'texto'). */
  valor?: string
}

/** Lo que devuelve cada tipo al cancelar. */
const CANCELADO = (tipo: PeticionConfirmar['tipo']) => (tipo === 'texto' ? null : false)

interface ConfirmarState {
  pendiente: PeticionConfirmar | null
  resolver: ((r: boolean | string | null) => void) | null
  /** Cierra el diálogo con la respuesta del usuario. */
  responder: (r: boolean | string | null) => void
}

export const useConfirmar = create<ConfirmarState>((set, get) => ({
  pendiente: null,
  resolver: null,
  responder: (r) => {
    const resolver = get().resolver
    set({ pendiente: null, resolver: null })
    resolver?.(r)
  },
}))

/**
 * Abre el diálogo y espera la respuesta. Si ya había una pregunta en el aire
 * (el componente que la hizo se desmontó, por ejemplo), se cancela antes: sin
 * esto su promesa quedaría colgada para siempre.
 */
let siguienteId = 1

function pedir(peticion: Omit<PeticionConfirmar, 'id'>): Promise<boolean | string | null> {
  const { pendiente, resolver } = useConfirmar.getState()
  if (pendiente) resolver?.(CANCELADO(pendiente.tipo))
  return new Promise((resolve) =>
    useConfirmar.setState({ pendiente: { ...peticion, id: siguienteId++ }, resolver: resolve }),
  )
}

/** ¿Seguir adelante? Devuelve false si el usuario cancela o cierra. */
export async function confirmar(o: Omit<PeticionConfirmar, 'id' | 'tipo' | 'valor'>): Promise<boolean> {
  return (await pedir({ ...o, tipo: 'confirmar' })) === true
}

/** Pide un texto. Devuelve null si el usuario cancela o lo deja vacío. */
export async function pedirTexto(
  o: Omit<PeticionConfirmar, 'id' | 'tipo' | 'peligro'>,
): Promise<string | null> {
  const r = await pedir({ ...o, tipo: 'texto' })
  return typeof r === 'string' ? r : null
}
