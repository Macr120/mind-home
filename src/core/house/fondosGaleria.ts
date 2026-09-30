/**
 * Galería de imágenes de fondo listas para elegir: ilustraciones a pantalla completa
 * (1920×1080) dibujadas en SVG por código, sin archivos que descargar. Al elegir una
 * se rasteriza y entra en «Mis imágenes» como cualquier imagen subida.
 */

const W = 1920
const H = 1080

/** Azar estable por semilla: la misma ilustración sale siempre igual. */
function azar(semilla: number) {
  let s = semilla >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

const cielo = (id: string, paradas: [number, string][]) =>
  `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${paradas
    .map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`)
    .join('')}</linearGradient></defs><rect width="${W}" height="${H}" fill="url(#${id})"/>`

const sol = (id: string, x: number, y: number, r: number, color: string, halo = 3) =>
  `<defs><radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="0.9"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient></defs>` +
  `<circle cx="${x}" cy="${y}" r="${r * halo}" fill="url(#${id})"/><circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/>`

function nube(x: number, y: number, s: number, fill = '#ffffff', op = 0.95) {
  const b = [
    [0, 0, 60, 34],
    [-55, 12, 45, 26],
    [55, 10, 50, 28],
    [-20, -22, 42, 30],
    [28, -18, 38, 26],
  ]
  return `<g fill="${fill}" opacity="${op}">${b
    .map(([dx, dy, rx, ry]) => `<ellipse cx="${x + dx * s}" cy="${y + dy * s}" rx="${rx * s}" ry="${ry * s}"/>`)
    .join('')}</g>`
}

/** Colinas suaves: una curva que cruza la pantalla a la altura `base`. */
function colinas(base: number, amp: number, n: number, semilla: number, fill: string) {
  const r = azar(semilla)
  const paso = W / n
  let d = `M0 ${H} L0 ${base + (r() - 0.5) * amp}`
  for (let i = 0; i < n; i++) {
    const x1 = i * paso + paso / 2
    const x2 = (i + 1) * paso
    d += ` Q${x1} ${base - amp * r()} ${x2} ${base + (r() - 0.5) * amp}`
  }
  return `<path d="${d} L${W} ${H} Z" fill="${fill}"/>`
}

/** Cordillera de picos; con `nieve`, cada pico lleva su casquete blanco. */
function montanas(base: number, alto: number, n: number, semilla: number, fill: string, nieve?: string) {
  const r = azar(semilla)
  const paso = W / n
  const picos: [number, number][] = []
  let d = `M0 ${H} L0 ${base}`
  for (let i = 0; i <= n; i++) {
    const xp = i * paso + (r() - 0.5) * paso * 0.4
    const yp = base - alto * (0.55 + r() * 0.45)
    const xv = xp + paso / 2
    const yv = base - alto * r() * 0.3
    d += ` L${xp} ${yp} L${xv} ${yv}`
    picos.push([xp, yp])
  }
  let s = `<path d="${d} L${W} ${H} Z" fill="${fill}"/>`
  if (nieve)
    for (const [x, y] of picos) {
      const h = alto * 0.22
      s += `<path d="M${x} ${y} L${x - h * 0.9} ${y + h} L${x - h * 0.3} ${y + h * 0.8} L${x} ${y + h * 1.05} L${x + h * 0.35} ${y + h * 0.8} L${x + h * 0.9} ${y + h} Z" fill="${nieve}"/>`
    }
  return s
}

function estrellas(n: number, semilla: number, hastaY = H, op = 1) {
  const r = azar(semilla)
  let s = `<g fill="#ffffff">`
  for (let i = 0; i < n; i++)
    s += `<circle cx="${(r() * W).toFixed(0)}" cy="${(r() * hastaY).toFixed(0)}" r="${(0.6 + r() * 1.8).toFixed(1)}" opacity="${(op * (0.4 + r() * 0.6)).toFixed(2)}"/>`
  return s + '</g>'
}

function palmera(x: number, y: number, s: number, tronco = '#7c5a36', hojas = '#2f7d32') {
  const t = `<path d="M${x} ${y} Q${x + 30 * s} ${y - 160 * s} ${x - 10 * s} ${y - 320 * s}" stroke="${tronco}" stroke-width="${18 * s}" fill="none" stroke-linecap="round"/>`
  const cx = x - 10 * s
  const cy = y - 320 * s
  const h = [-160, -120, -60, -20, 30, 80, 140]
    .map((a) => {
      const rad = (a * Math.PI) / 180
      const ex = cx + Math.cos(rad) * 150 * s
      const ey = cy + Math.sin(rad) * 60 * s + 40 * s
      return `<path d="M${cx} ${cy} Q${(cx + ex) / 2} ${cy - 50 * s} ${ex} ${ey}" stroke="${hojas}" stroke-width="${16 * s}" fill="none" stroke-linecap="round"/>`
    })
    .join('')
  return t + h
}

function pino(x: number, y: number, s: number, fill: string, nieve?: string) {
  let g = `<rect x="${x - 6 * s}" y="${y - 20 * s}" width="${12 * s}" height="${24 * s}" fill="#3f2a1a"/>`
  for (let i = 0; i < 3; i++) {
    const w = (70 - i * 16) * s
    const yb = y - 20 * s - i * 40 * s
    g += `<path d="M${x - w} ${yb} L${x} ${yb - 70 * s} L${x + w} ${yb} Z" fill="${fill}"/>`
    if (nieve) g += `<path d="M${x - w * 0.35} ${yb - 45 * s} L${x} ${yb - 70 * s} L${x + w * 0.35} ${yb - 45 * s} Z" fill="${nieve}"/>`
  }
  return g
}

function arbolCopa(x: number, y: number, s: number, copa: string[], semilla: number) {
  const r = azar(semilla)
  let g = `<rect x="${x - 8 * s}" y="${y - 90 * s}" width="${16 * s}" height="${90 * s}" fill="#4a3322"/>`
  for (let i = 0; i < 7; i++)
    g += `<circle cx="${x + (r() - 0.5) * 110 * s}" cy="${y - 120 * s - r() * 80 * s}" r="${(35 + r() * 25) * s}" fill="${copa[i % copa.length]}"/>`
  return g
}

// ---------------------------------------------------------------------------
// Las 14 ilustraciones.
// ---------------------------------------------------------------------------

function espacio() {
  return (
    cielo('c', [[0, '#02030a'], [1, '#0b1026']]) +
    `<defs><radialGradient id="n1"><stop offset="0" stop-color="#7c3aed" stop-opacity="0.5"/><stop offset="1" stop-color="#7c3aed" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="n2"><stop offset="0" stop-color="#0ea5e9" stop-opacity="0.35"/><stop offset="1" stop-color="#0ea5e9" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="pl" cx="0.35" cy="0.35"><stop offset="0" stop-color="#fbbf24"/><stop offset="1" stop-color="#7c2d12"/></radialGradient></defs>` +
    `<ellipse cx="1300" cy="380" rx="760" ry="400" fill="url(#n1)"/><ellipse cx="520" cy="740" rx="620" ry="340" fill="url(#n2)"/>` +
    estrellas(360, 7) +
    `<circle cx="420" cy="300" r="150" fill="url(#pl)"/>` +
    `<ellipse cx="420" cy="300" rx="250" ry="52" fill="none" stroke="#fde68a" stroke-width="10" opacity="0.7" transform="rotate(-18 420 300)"/>` +
    `<circle cx="1620" cy="820" r="46" fill="#94a3b8"/><circle cx="1606" cy="808" r="10" fill="#64748b"/>`
  )
}

function nubes() {
  const r = azar(11)
  let mar = ''
  for (const [y, s, c] of [[720, 1.3, '#dbeafe'], [800, 1.6, '#eff6ff'], [890, 1.9, '#ffffff'], [990, 2.2, '#ffffff']] as [number, number, string][])
    for (let x = -120; x < W + 150; x += 190 * s * 0.7) mar += nube(x + r() * 60, y + r() * 30, s, c, 1)
  return (
    cielo('c', [[0, '#2563eb'], [0.6, '#7cc0f0'], [1, '#dbeafe']]) +
    sol('s', 1450, 250, 80, '#fff7d6', 4) +
    nube(300, 220, 1, '#ffffff', 0.85) + nube(900, 160, 0.7, '#ffffff', 0.75) +
    mar
  )
}

function yermo() {
  const r = azar(5)
  let ruinas = ''
  for (let x = 80; x < W; x += 110 + r() * 120) {
    const h = 80 + r() * 260
    const w = 50 + r() * 90
    ruinas += `<path d="M${x} 740 L${x} ${740 - h} L${x + w * 0.3} ${740 - h + 20} L${x + w * 0.6} ${740 - h - 15} L${x + w} ${740 - h + 30} L${x + w} 740 Z" fill="#5b3a22" opacity="0.55"/>`
  }
  let grietas = ''
  for (let i = 0; i < 26; i++) {
    const x = r() * W
    const y = 860 + r() * 200
    grietas += `<path d="M${x} ${y} l${40 + r() * 60} ${(r() - 0.5) * 30} l${30 + r() * 40} ${(r() - 0.5) * 30}" stroke="#3f2a17" stroke-width="3" fill="none"/>`
  }
  return (
    cielo('c', [[0, '#7c2d12'], [0.55, '#ea8a3a'], [1, '#fcd34d']]) +
    sol('s', 980, 400, 110, '#fde68a', 2.5) +
    ruinas +
    colinas(760, 40, 6, 3, '#8a5a33') +
    colinas(850, 30, 5, 9, '#6b4423') +
    grietas +
    `<path d="M1500 900 L1505 760 M1503 800 L1460 740 M1504 780 L1560 720 M1480 755 L1455 735" stroke="#2b1d12" stroke-width="10" stroke-linecap="round" fill="none"/>` +
    `<g fill="#4a2c1a"><rect x="300" y="905" width="200" height="50" rx="10"/><rect x="340" y="870" width="110" height="45" rx="8"/><circle cx="345" cy="960" r="20"/><circle cx="455" cy="960" r="20"/></g>`
  )
}

function pradera() {
  const r = azar(21)
  let flores = ''
  const cols = ['#fde68a', '#f9a8d4', '#ffffff', '#c4b5fd', '#fca5a5']
  for (let i = 0; i < 180; i++)
    flores += `<circle cx="${r() * W}" cy="${860 + r() * 220}" r="${3 + r() * 5}" fill="${cols[i % cols.length]}"/>`
  return (
    cielo('c', [[0, '#3b8fe0'], [1, '#dbeafe']]) +
    sol('s', 1560, 200, 70, '#fff5cc', 3) +
    nube(380, 200, 1.1) + nube(1000, 140, 0.8) +
    colinas(640, 90, 4, 2, '#9cd08a') +
    colinas(760, 80, 5, 6, '#6fb456') +
    colinas(880, 60, 6, 8, '#4f9a3c') +
    arbolCopa(1450, 820, 1.4, ['#3f7d2c', '#4d8f35', '#5aa33f'], 4) +
    flores
  )
}

function mar() {
  const r = azar(33)
  let olas = ''
  for (let i = 0; i < 70; i++) {
    const x = r() * W
    const y = 620 + r() * 460
    const w = 20 + ((y - 600) / 480) * 70
    olas += `<path d="M${x} ${y} q${w / 2} ${-w / 4} ${w} 0" stroke="#e0f2fe" stroke-width="${1.5 + ((y - 600) / 480) * 3}" fill="none" opacity="0.7"/>`
  }
  let brillo = ''
  for (let i = 0; i < 14; i++) brillo += `<rect x="${1360 + (r() - 0.5) * 140}" y="${615 + i * 30}" width="${60 + r() * 60}" height="4" fill="#fff7d6" opacity="${0.8 - i * 0.05}"/>`
  return (
    cielo('c', [[0, '#1d6fd1'], [0.55, '#8fcdf2'], [0.556, '#0ea5e9'], [1, '#0c4a6e']]) +
    sol('s', 1400, 330, 75, '#fff7d6', 3) +
    nube(420, 220, 1) + nube(960, 300, 0.7, '#ffffff', 0.8) +
    `<path d="M200 600 Q300 540 420 600 Z" fill="#2f7d32"/>` + palmera(320, 600, 0.35, '#5b4330', '#1f5f23') +
    brillo + olas +
    `<g transform="translate(760 700)"><path d="M-60 0 L60 0 L40 22 L-40 22 Z" fill="#7c4a24"/><path d="M0 -5 L0 -130 L55 -10 Z" fill="#f8fafc"/><path d="M-5 -10 L-5 -110 L-50 -10 Z" fill="#e2e8f0"/></g>`
  )
}

function campo() {
  const r = azar(41)
  const cols = ['#b5c96a', '#d8c26a', '#8fb05a', '#c9a34a', '#a3c46b', '#e0cf86']
  let parcelas = ''
  for (let fila = 0; fila < 5; fila++) {
    const y0 = 700 + fila * 80
    let x = -50
    while (x < W) {
      const w = 180 + r() * 260
      parcelas += `<path d="M${x} ${y0} L${x + w} ${y0 + 12} L${x + w + 20} ${y0 + 92} L${x - 10} ${y0 + 80} Z" fill="${cols[Math.floor(r() * cols.length)]}" stroke="#7a8f45" stroke-width="3"/>`
      x += w
    }
  }
  let durmientes = ''
  for (let i = 0; i < 24; i++) {
    const t = i / 23
    durmientes += `<rect x="${200 + t * 1600}" y="${1010 - t * 170}" width="36" height="8" fill="#5b4330" transform="rotate(-6 ${218 + t * 1600} ${1014 - t * 170})"/>`
  }
  return (
    cielo('c', [[0, '#5fb0ea'], [1, '#e0f2fe']]) +
    nube(360, 200, 1) + nube(1180, 150, 0.9) +
    colinas(640, 60, 5, 12, '#8fbf6a') +
    parcelas +
    `<g transform="translate(1340 690)"><rect x="-70" y="-70" width="140" height="80" fill="#b91c1c"/><path d="M-85 -70 L0 -130 L85 -70 Z" fill="#7f1d1d"/><rect x="-18" y="-30" width="36" height="40" fill="#f5f5f4"/></g>` +
    `<path d="M200 1020 L1800 850" stroke="#9ca3af" stroke-width="5"/><path d="M215 1045 L1815 870" stroke="#9ca3af" stroke-width="5"/>` +
    durmientes +
    arbolCopa(260, 700, 0.9, ['#3f7d2c', '#4d8f35'], 13)
  )
}

function playa() {
  const r = azar(51)
  let conchas = ''
  for (let i = 0; i < 30; i++) conchas += `<ellipse cx="${r() * W}" cy="${860 + r() * 200}" rx="${4 + r() * 5}" ry="${3 + r() * 3}" fill="${i % 2 ? '#fde2e4' : '#fff7ed'}"/>`
  return (
    cielo('c', [[0, '#1e90d6'], [1, '#e0f7ff']]) +
    sol('s', 1500, 230, 80, '#fffbe6', 3) +
    nube(380, 180, 1) + nube(900, 120, 0.7) +
    `<rect y="560" width="${W}" height="200" fill="#10b3c8"/><rect y="560" width="${W}" height="40" fill="#0891b2" opacity="0.6"/>` +
    `<path d="M0 760 Q240 730 480 760 T960 760 T1440 760 T1920 760 L1920 790 L0 790 Z" fill="#f0fdff" opacity="0.9"/>` +
    `<path d="M0 780 L${W} 780 L${W} ${H} L0 ${H} Z" fill="#f2d7a2"/><path d="M0 780 L${W} 780 L${W} 860 L0 860 Z" fill="#e8c98a" opacity="0.6"/>` +
    palmera(1580, 980, 1.3) + palmera(1760, 1000, 1) +
    `<g transform="translate(560 960)"><path d="M0 0 L0 -220" stroke="#6b4a2b" stroke-width="8"/><path d="M-150 -200 Q0 -300 150 -200 Z" fill="#ef4444"/><path d="M-150 -200 Q-75 -240 0 -200 Z" fill="#fef3c7"/></g>` +
    conchas
  )
}

function nevadas() {
  const r = azar(61)
  let pinos = ''
  for (let i = 0; i < 18; i++) pinos += pino(r() * W, 900 + r() * 40, 0.8 + r() * 0.5, '#1f4d3a', '#f8fafc')
  let copos = ''
  for (let i = 0; i < 160; i++) copos += `<circle cx="${r() * W}" cy="${r() * H}" r="${1.5 + r() * 3}" fill="#ffffff" opacity="0.8"/>`
  return (
    cielo('c', [[0, '#1e3a8a'], [1, '#bfdbfe']]) +
    montanas(620, 380, 6, 2, '#64748b', '#f8fafc') +
    montanas(760, 300, 8, 5, '#475569', '#e2e8f0') +
    `<rect y="800" width="${W}" height="280" fill="#f1f5f9"/>` +
    `<ellipse cx="960" cy="930" rx="520" ry="70" fill="#bfe3f5"/><ellipse cx="900" cy="920" rx="240" ry="20" fill="#e0f2fe" opacity="0.8"/>` +
    pinos + copos
  )
}

function otonal() {
  const r = azar(71)
  const copas = ['#ea580c', '#dc2626', '#f59e0b', '#c2410c', '#fbbf24']
  let bosque = ''
  for (let fila = 0; fila < 3; fila++)
    for (let i = 0; i < 12; i++) bosque += arbolCopa(i * 170 + r() * 80, 640 + fila * 90, 0.9 + fila * 0.25, copas, fila * 40 + i)
  let hojas = ''
  for (let i = 0; i < 60; i++) {
    const x = r() * W
    const y = r() * H
    hojas += `<ellipse cx="${x}" cy="${y}" rx="7" ry="4" fill="${copas[i % copas.length]}" transform="rotate(${r() * 180} ${x} ${y})" opacity="0.9"/>`
  }
  return (
    cielo('c', [[0, '#f97316'], [1, '#fde68a']]) +
    sol('s', 1450, 280, 70, '#fff1c8', 3) +
    colinas(620, 60, 5, 3, '#b45309') +
    bosque +
    `<path d="M0 ${H} Q300 950 700 1000 T1300 950 T1920 1000 L1920 ${H} Z" fill="#7a4a24"/>` +
    `<path d="M600 ${H} Q800 960 1000 990 T1500 940 L1580 950 Q1300 1000 1100 1030 T800 ${H} Z" fill="#3b82c4"/>` +
    hojas
  )
}

function ciudad() {
  const edificios = (base: number, fill: string, luz: string, semilla: number, alto: number) => {
    const rr = azar(semilla)
    let g = ''
    let x = -20
    while (x < W) {
      const w = 70 + rr() * 110
      const h = alto * (0.4 + rr() * 0.6)
      g += `<rect x="${x}" y="${base - h}" width="${w}" height="${h}" fill="${fill}"/>`
      for (let wy = base - h + 16; wy < base - 20; wy += 26)
        for (let wx = x + 10; wx < x + w - 14; wx += 20) if (rr() > 0.55) g += `<rect x="${wx}" y="${wy}" width="10" height="14" fill="${luz}" opacity="${0.6 + rr() * 0.4}"/>`
      x += w + 6
    }
    return g
  }
  let farolas = ''
  for (let x = 120; x < W; x += 320)
    farolas += `<rect x="${x}" y="880" width="8" height="140" fill="#1f2937"/><circle cx="${x + 4}" cy="880" r="40" fill="#fde68a" opacity="0.18"/><circle cx="${x + 4}" cy="880" r="10" fill="#fef3c7"/>`
  return (
    cielo('c', [[0, '#020617'], [1, '#312e81']]) +
    estrellas(120, 3, 500, 0.8) +
    sol('s', 1600, 180, 55, '#f1f5f9', 2.5) +
    edificios(800, '#1e293b', '#fcd34d', 5, 420) +
    edificios(960, '#0f172a', '#fde68a', 9, 520) +
    `<rect y="960" width="${W}" height="120" fill="#111827"/><rect y="1010" width="${W}" height="6" fill="#facc15" opacity="0.5"/>` +
    farolas
  )
}

function volcan() {
  const r = azar(91)
  let ceniza = ''
  for (let i = 0; i < 8; i++) ceniza += nube(700 + r() * 600, 120 + r() * 200, 1.2 + r(), '#3f3f46', 0.7)
  let grietas = ''
  for (let i = 0; i < 16; i++) {
    const x = r() * W
    grietas += `<path d="M${x} ${920 + r() * 140} l${50 + r() * 80} ${(r() - 0.5) * 40} l${40 + r() * 60} ${(r() - 0.5) * 40}" stroke="#f97316" stroke-width="5" fill="none"/>`
  }
  return (
    cielo('c', [[0, '#1c0a0a'], [0.6, '#7f1d1d'], [1, '#f97316']]) +
    `<defs><radialGradient id="g"><stop offset="0" stop-color="#fde047" stop-opacity="0.9"/><stop offset="1" stop-color="#f97316" stop-opacity="0"/></radialGradient></defs>` +
    ceniza +
    `<ellipse cx="960" cy="360" rx="260" ry="140" fill="url(#g)"/>` +
    `<path d="M360 ${H} L860 380 L1060 380 L1600 ${H} Z" fill="#292524"/>` +
    `<path d="M880 380 Q900 360 960 362 Q1020 360 1040 380 Z" fill="#fde047"/>` +
    `<path d="M950 385 Q900 560 980 700 T920 ${H}" stroke="#f97316" stroke-width="34" fill="none"/><path d="M950 385 Q900 560 980 700 T920 ${H}" stroke="#fde047" stroke-width="12" fill="none"/>` +
    `<path d="M1010 390 Q1120 600 1080 800 T1200 ${H}" stroke="#ea580c" stroke-width="24" fill="none"/>` +
    `<path d="M0 ${H} L0 900 Q400 860 800 930 T1920 900 L1920 ${H} Z" fill="#0c0a09"/>` +
    grietas
  )
}

function luna() {
  const r = azar(101)
  let crateres = ''
  for (let i = 0; i < 22; i++) {
    const x = r() * W
    const y = 700 + r() * 360
    const rx = 30 + r() * 110 * ((y - 650) / 430)
    crateres += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${rx * 0.28}" fill="#6b7280"/><ellipse cx="${x}" cy="${y - rx * 0.05}" rx="${rx * 0.85}" ry="${rx * 0.2}" fill="#9ca3af"/>`
  }
  return (
    `<rect width="${W}" height="${H}" fill="#000000"/>` +
    estrellas(300, 13, 650) +
    `<defs><radialGradient id="t" cx="0.4" cy="0.35"><stop offset="0" stop-color="#60a5fa"/><stop offset="1" stop-color="#1e3a8a"/></radialGradient></defs>` +
    `<circle cx="1500" cy="260" r="130" fill="url(#t)"/>` +
    `<path d="M1430 200 q30 -20 60 0 q20 40 -20 60 q-40 10 -40 -60 Z M1520 290 q40 -10 50 30 q-20 40 -60 20 Z" fill="#22c55e" opacity="0.85"/>` +
    `<path d="M1400 250 q60 -30 120 0 M1450 330 q60 -20 110 10" stroke="#ffffff" stroke-width="10" fill="none" opacity="0.6"/>` +
    montanas(660, 90, 10, 3, '#4b5563') +
    `<rect y="660" width="${W}" height="420" fill="#9ca3af"/><rect y="660" width="${W}" height="80" fill="#6b7280" opacity="0.6"/>` +
    crateres
  )
}

function marino() {
  const r = azar(111)
  let rayos = ''
  for (let i = 0; i < 7; i++) {
    const x = 200 + i * 260 + r() * 60
    rayos += `<path d="M${x} 0 L${x + 90} 0 L${x + 260} ${H} L${x + 140} ${H} Z" fill="#e0f2fe" opacity="0.08"/>`
  }
  const coral = (x: number, c: string, s: number) =>
    `<path d="M${x} 1000 q-10 -80 -60 -140 M${x} 1000 q5 -120 10 -200 M${x} 1000 q30 -90 80 -130 M${x - 30} 900 q-40 -20 -50 -60 M${x + 8} 860 q30 -30 30 -70" stroke="${c}" stroke-width="${16 * s}" fill="none" stroke-linecap="round"/>`
  let algas = ''
  for (let i = 0; i < 14; i++) {
    const x = r() * W
    algas += `<path d="M${x} ${H} q30 -60 0 -120 t0 -120 t0 -100" stroke="#15803d" stroke-width="10" fill="none" opacity="0.9"/>`
  }
  let peces = ''
  const cp = ['#f97316', '#facc15', '#ec4899', '#22d3ee', '#a3e635']
  for (let i = 0; i < 16; i++) {
    const x = r() * W
    const y = 200 + r() * 600
    const s = 0.6 + r() * 0.9
    peces += `<g transform="translate(${x} ${y}) scale(${s})"><ellipse rx="30" ry="14" fill="${cp[i % cp.length]}"/><path d="M26 0 L48 -14 L48 14 Z" fill="${cp[i % cp.length]}"/><circle cx="-16" cy="-3" r="3" fill="#111"/></g>`
  }
  let burbujas = ''
  for (let i = 0; i < 40; i++) burbujas += `<circle cx="${r() * W}" cy="${r() * 900}" r="${3 + r() * 9}" fill="none" stroke="#e0f2fe" stroke-width="2" opacity="0.6"/>`
  return (
    cielo('c', [[0, '#38bdf8'], [0.5, '#0369a1'], [1, '#082f49']]) +
    rayos +
    colinas(980, 40, 6, 4, '#d6c28a') +
    algas +
    coral(420, '#fb7185', 1) + coral(1300, '#f97316', 1.1) + coral(1650, '#e879f9', 0.9) +
    peces + burbujas
  )
}

function dunas() {
  return (
    cielo('c', [[0, '#f97316'], [1, '#fde68a']]) +
    sol('s', 1400, 330, 110, '#fff7d6', 2.5) +
    colinas(620, 120, 3, 7, '#e8b04a') +
    `<g transform="translate(560 630)"><ellipse rx="130" ry="20" fill="#38bdf8"/>` + palmera(-60, 0, 0.35, '#6b4a2b', '#2f7d32') + palmera(60, 5, 0.3, '#6b4a2b', '#2f7d32') + `</g>` +
    colinas(760, 110, 4, 11, '#d9963b') +
    colinas(900, 90, 3, 17, '#c47f2f') +
    `<g fill="#2f6b3a"><rect x="1500" y="700" width="46" height="260" rx="23"/><rect x="1440" y="760" width="36" height="110" rx="18"/><rect x="1440" y="840" width="80" height="30" rx="15"/><rect x="1570" y="730" width="36" height="120" rx="18"/><rect x="1530" y="820" width="76" height="30" rx="15"/></g>`
  )
}

export interface FondoGaleria {
  id: string
  nombre: string
  dibujar: () => string
}

export const GALERIA_FONDOS: FondoGaleria[] = [
  { id: 'espacio', nombre: 'Espacio profundo', dibujar: espacio },
  { id: 'nubes', nombre: 'Sobre las nubes', dibujar: nubes },
  { id: 'yermo', nombre: 'Tierra baldía', dibujar: yermo },
  { id: 'pradera', nombre: 'Pradera', dibujar: pradera },
  { id: 'mar', nombre: 'Mar abierto', dibujar: mar },
  { id: 'campo', nombre: 'Campiña', dibujar: campo },
  { id: 'playa', nombre: 'Playa tropical', dibujar: playa },
  { id: 'nevadas', nombre: 'Montañas nevadas', dibujar: nevadas },
  { id: 'otonal', nombre: 'Bosque otoñal', dibujar: otonal },
  { id: 'ciudad', nombre: 'Ciudad nocturna', dibujar: ciudad },
  { id: 'volcan', nombre: 'Volcán', dibujar: volcan },
  { id: 'luna', nombre: 'Superficie lunar', dibujar: luna },
  { id: 'marino', nombre: 'Fondo marino', dibujar: marino },
  { id: 'dunas', nombre: 'Desierto con dunas', dibujar: dunas },
]

/** SVG completo de una ilustración (para la miniatura y para rasterizar). */
export function svgFondo(f: FondoGaleria): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${f.dibujar()}</svg>`
}

/** Rasteriza la ilustración a JPG 1920×1080 para guardarla como imagen de fondo. */
export function imagenDeFondo(f: FondoGaleria): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svgFondo(f)], { type: 'image/svg+xml' }))
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const c = document.createElement('canvas')
      c.width = W
      c.height = H
      c.getContext('2d')!.drawImage(img, 0, 0, W, H)
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo crear la imagen'))), 'image/jpeg', 0.9)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo dibujar la imagen'))
    }
    img.src = url
  })
}
