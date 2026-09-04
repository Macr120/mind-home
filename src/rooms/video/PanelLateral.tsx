import { useEffect, type ReactNode } from 'react'

/**
 * Un menú lateral del editor: en pantallas anchas (`amplio`) es una columna y
 * en móvil un cajón deslizante sobre el cuerpo del editor, con telón. Los
 * botones que lo abren y lo pliegan flotan en las esquinas del visor (y en la
 * barra cuando el visor está plegado). Va ABSOLUTO dentro del cuerpo y no
 * `fixed`: el cuarto (`.ui-app`) es contexto de apilamiento y un `fixed`
 * seguiría dentro de él, tapando de más. Un solo `<aside>` para los dos
 * modos: al cruzar el umbral React no remonta a los hijos. Cerrado, se
 * desmonta (un `role="dialog"` oculto seguiría bloqueando el Escape de
 * pantalla completa). La cabecera la pintan los hijos.
 */
export function PanelLateral({
  lado,
  amplio,
  abierto,
  onCerrar,
  titulo,
  anchoClase,
  ocultoDuranteArrastre = false,
  arriba,
  children,
}: {
  lado: 'inicio' | 'fin'
  amplio: boolean
  abierto: boolean
  onCerrar: () => void
  titulo: string
  anchoClase: 'w-60' | 'w-72'
  /** Móvil: el cajón sigue MONTADO pero invisible mientras se arrastra una tarjeta a la timeline. */
  ocultoDuranteArrastre?: boolean
  /** Clase de la arista superior del cajón (modo película: deja libres los botones de las esquinas); ausente = `inset-y-0`. */
  arriba?: string
  children: ReactNode
}) {
  // Escape cierra el cajón (solo móvil), cediendo ante un modal abierto encima.
  useEffect(() => {
    if (amplio || !abierto) return
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.querySelector('[role="dialog"]:not([data-cajon])')) return
      onCerrar()
    }
    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  }, [amplio, abierto, onCerrar])

  if (!abierto) return null
  const inicio = lado === 'inicio'
  return (
    <>
      {/* `pointer-events-auto` explícito: en el modo película el editor entero deja pasar los toques al mapa. */}
      {!amplio && (
        <div
          aria-hidden
          className={`absolute inset-0 z-[29] bg-black/55 ${ocultoDuranteArrastre ? 'pointer-events-none opacity-0' : 'pointer-events-auto'}`}
          onClick={onCerrar}
        />
      )}
      <aside
        role={amplio ? undefined : 'dialog'}
        aria-modal={amplio ? undefined : true}
        aria-label={titulo}
        data-cajon
        className={
          amplio
            ? `flex ${anchoClase} min-h-0 shrink-0 flex-col rounded-xl border border-white/10 bg-white/5`
            : `ui-panel absolute ${arriba ? `${arriba} bottom-0` : 'inset-y-0'} z-30 flex w-[82%] max-w-xs flex-col border-white/10 shadow-2xl ${
                inicio ? 'start-0 rounded-e-xl border-e ui-desliza-inicio' : 'end-0 rounded-s-xl border-s ui-desliza-fin'
              } ${ocultoDuranteArrastre ? 'pointer-events-none opacity-0' : 'pointer-events-auto'}`
        }
      >
        {children}
      </aside>
    </>
  )
}
