import { useEffect, useRef, useState } from 'react'

/**
 * Barra de progreso compacta con color propio. Vivía dentro de `ProgresoPanel`;
 * se movió aquí al necesitarla también la celebración de lista cumplida (que no
 * puede importar aquel panel: arrastra React Three Fiber por `AvatarMini`).
 *
 * Cuando el valor CRECE, la transición es larga (estilo Duolingo) y la barra da
 * un pulso de brillo (`xp-brillo`); `prefers-reduced-motion` apaga ambas cosas.
 */
export function Barra({ valor, color }: { valor: number; color: string }) {
  const prev = useRef(valor)
  const [brilla, setBrilla] = useState(false)

  useEffect(() => {
    if (valor <= prev.current) {
      prev.current = valor
      return
    }
    prev.current = valor
    setBrilla(true)
    const timer = window.setTimeout(() => setBrilla(false), 800)
    return () => window.clearTimeout(timer)
  }, [valor])

  return (
    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
      <div
        className={`h-full rounded-full transition-[width] duration-700 ease-fluida motion-reduce:transition-none ${brilla ? 'xp-brillo' : ''}`}
        style={{ width: `${Math.round(Math.min(1, Math.max(0, valor)) * 100)}%`, background: color }}
      />
    </div>
  )
}
