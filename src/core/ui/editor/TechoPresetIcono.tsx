import type { ReactNode } from 'react'

/** Previsualización genérica (silueta SVG) de una forma de techo, por id de preset. */
const PATHS: Record<string, ReactNode> = {
  plano: <rect x="4" y="11" width="16" height="3" rx="0.5" />,
  una_agua: <path d="M4 15 H20 V8 Z" />,
  dos_aguas: <path d="M3 15 L12 6 L21 15 Z" />,
  piramidal: (
    <>
      <path d="M3 15 L12 6 L21 15 Z" />
      <path d="M12 6 V15" opacity={0.45} />
    </>
  ),
  abovedado: <path d="M4 15 Q12 4 20 15 Z" />,
  cupula: <path d="M4 15 A8 8 0 0 1 20 15 Z" />,
  un_pico: (
    <>
      <path d="M5 15 L12 5 L19 15" />
      <path d="M5 15 Q12 16.6 19 15" opacity={0.45} />
    </>
  ),
  dos_picos: <path d="M3 15 L7.5 8 L12 12.5 L16.5 8 L21 15 Z" />,
  cono: (
    <>
      <path d="M6 14 L12 5 L18 14" />
      <path d="M6 14 A6 2 0 0 0 18 14" />
    </>
  ),
}

export function TechoPresetIcono({ id, className }: { id: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 20"
      className={className ?? 'h-5 w-6'}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden
    >
      {PATHS[id] ?? PATHS.plano}
    </svg>
  )
}
