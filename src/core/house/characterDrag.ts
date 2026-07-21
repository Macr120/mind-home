/**
 * Estado de arrastre de personajes en el editor (pestaña Personajes). Es un módulo
 * mutable a propósito (no Zustand): se lee/escribe cada frame al arrastrar, así no
 * provoca re-renders. `id` = 'avatar' o id de asistente; null = nadie se arrastra.
 */
export const dragChar = { id: null as string | null, x: 0, z: 0 }

if (import.meta.env.DEV) {
  ;(window as unknown as { dragChar: typeof dragChar }).dragChar = dragChar
}
