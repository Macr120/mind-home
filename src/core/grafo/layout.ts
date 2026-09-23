/**
 * Acomodo de la vista de grafo por fuerzas (estilo Obsidian): los nodos se
 * repelen, los enlaces los atraen como resortes y una gravedad suave los
 * mantiene al centro. Sin librería (CLAUDE.md: gráficas con SVG propio).
 *
 * Determinista: la posición de partida sale del id, así el mismo grafo se
 * dibuja siempre igual y no «baila» al reabrirlo. PURO y sin imports, como
 * `memoria.ts` (lo revisa `tsconfig.grafo.json`).
 */

export interface Punto {
  x: number
  y: number
}

/** Hash FNV-1a de 32 bits: semilla estable por id. */
function hash(texto: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/**
 * Posiciones en un plano centrado en (0, 0). `distancia` es el largo de
 * reposo de un enlace; el resto de medidas salen de ella.
 */
export function layoutFuerzas(
  ids: readonly string[],
  aristas: readonly (readonly [string, string])[],
  opts: { iteraciones?: number; distancia?: number } = {},
): Map<string, Punto> {
  const n = ids.length
  const d = opts.distancia ?? 60
  const iteraciones = opts.iteraciones ?? 200
  const indice = new Map(ids.map((id, i) => [id, i]))
  const xs = new Float64Array(n)
  const ys = new Float64Array(n)
  const radio = d * Math.sqrt(n)
  ids.forEach((id, i) => {
    const h = hash(id)
    const angulo = ((h & 0xffff) / 0xffff) * Math.PI * 2
    const r = radio * Math.sqrt(((h >>> 16) & 0xffff) / 0xffff)
    xs[i] = Math.cos(angulo) * r
    ys[i] = Math.sin(angulo) * r
  })
  const pares: [number, number][] = []
  for (const [a, b] of aristas) {
    const ia = indice.get(a)
    const ib = indice.get(b)
    if (ia !== undefined && ib !== undefined && ia !== ib) pares.push([ia, ib])
  }

  const dx = new Float64Array(n)
  const dy = new Float64Array(n)
  // La repulsión solo actúa de cerca: sin corte, cada nodo empuja a todos y
  // los grupos sueltos acaban lejísimos (y todo se ve diminuto al encajar).
  const corte2 = (d * 3) ** 2
  for (let it = 0; it < iteraciones; it++) {
    // Enfriamiento: al principio se mueve mucho, al final casi nada.
    const temperatura = d * 2 * (1 - it / iteraciones) + 0.5
    dx.fill(0)
    dy.fill(0)
    for (let i = 0; i < n; i++) {
      const xi = xs[i] ?? 0
      const yi = ys[i] ?? 0
      for (let j = i + 1; j < n; j++) {
        let vx = xi - (xs[j] ?? 0)
        let vy = yi - (ys[j] ?? 0)
        let dist2 = vx * vx + vy * vy
        if (dist2 < 0.01) {
          // Dos nodos encimados: se separan en una dirección fija por el par.
          vx = ((i * 7 + j * 13) % 11) / 11 - 0.5
          vy = ((i * 11 + j * 7) % 13) / 13 - 0.5
          dist2 = vx * vx + vy * vy + 0.01
        }
        if (dist2 > corte2) continue
        const f = (d * d) / dist2
        dx[i] = (dx[i] ?? 0) + vx * f
        dy[i] = (dy[i] ?? 0) + vy * f
        dx[j] = (dx[j] ?? 0) - vx * f
        dy[j] = (dy[j] ?? 0) - vy * f
      }
    }
    for (const [a, b] of pares) {
      const vx = (xs[a] ?? 0) - (xs[b] ?? 0)
      const vy = (ys[a] ?? 0) - (ys[b] ?? 0)
      const dist = Math.sqrt(vx * vx + vy * vy) || 0.01
      const f = dist / d
      dx[a] = (dx[a] ?? 0) - vx * f
      dy[a] = (dy[a] ?? 0) - vy * f
      dx[b] = (dx[b] ?? 0) + vx * f
      dy[b] = (dy[b] ?? 0) + vy * f
    }
    for (let i = 0; i < n; i++) {
      // Gravedad al centro: junta los grupos sueltos.
      const gx = (dx[i] ?? 0) - (xs[i] ?? 0) * 0.1
      const gy = (dy[i] ?? 0) - (ys[i] ?? 0) * 0.1
      const largo = Math.sqrt(gx * gx + gy * gy) || 1
      const paso = Math.min(largo, temperatura)
      xs[i] = (xs[i] ?? 0) + (gx / largo) * paso
      ys[i] = (ys[i] ?? 0) + (gy / largo) * paso
    }
  }

  const salida = new Map<string, Punto>()
  ids.forEach((id, i) => salida.set(id, { x: xs[i] ?? 0, y: ys[i] ?? 0 }))
  return salida
}
