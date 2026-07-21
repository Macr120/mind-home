/** Ánimos del anecdotario y el color con que pintan el calendario. */
export const ANIMOS = ['😀', '🙂', '😐', '😔', '😣', '🤩', '😴'] as const

const COLOR_ANIMO: Record<string, string> = {
  '😀': '#4ade80', // feliz · verde
  '🙂': '#a3e635', // bien · lima
  '😐': '#94a3b8', // neutral · gris
  '😔': '#60a5fa', // triste · azul
  '😣': '#f87171', // estresado · rojo
  '🤩': '#e879f9', // emocionado · fucsia
  '😴': '#818cf8', // cansado · índigo
}

/** Ánimos libres (texto de la IA o emoji fuera del catálogo) caen al violeta de la app. */
export const colorDeAnimo = (animo: string): string => COLOR_ANIMO[animo] ?? '#a78bfa'
