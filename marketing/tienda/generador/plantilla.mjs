// Plantilla HTML de una lámina de tienda: se renderiza al tamaño exacto del
// lienzo (Play 1080×1920, App Store 1290×2796) y se captura tal cual.
// Fondo BLANCO con el halo de color de cada lámina (morado, ámbar, rojo, verde).

const ICONO = `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="112" fill="#576748"/>
  <g transform="translate(77.5 206)">
    <rect x="0" y="3" width="94" height="94" rx="20" fill="#DA9425"/>
    <path d="M137 0V100H237Z" fill="#C23A40"/>
    <path d="M257 0H357V100A100 100 0 0 1 257 0Z" fill="#895AC6"/>
  </g>
</svg>`

/** Tinta de la app (`--ui-ink` del canon claro). */
const TINTA = '#1c2333'
/** Color al que muere el fondo abajo: lo comparten el degradado y el fundido. */
const FIN = '#f4f6fb'

/**
 * @param {{titulo:string, sub:string, glow:string, acento:string, img:string,
 *          marca?:boolean, tel?:number, cab?:number, rtl?:boolean,
 *          chip?:{texto:string,arriba:number,lado:'izq'|'der'}}} s
 * @param {{w:number,h:number}} tam
 */
export function lamina(s, tam) {
  const { w, h } = tam
  // Todo se mide contra el ANCHO del lienzo: así las dos relaciones de aspecto
  // (9:16 de Play y 19.5:9 de Apple) comparten proporciones tipográficas y solo
  // cambia cuánto asoma el teléfono por abajo.
  const u = w / 1000
  const anchoTel = w * (s.tel || 0.74)
  const altoTel = anchoTel / 0.4621 // relación de la captura (1170×2532)
  const cabecera = h * (s.cab || 0.3)
  const asoma = cabecera + altoTel - h // cuánto se sale el teléfono por abajo
  return `<meta charset="utf-8">
<title>lamina</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: ${w}px; height: ${h}px; overflow: hidden; }
  body {
    position: relative;
    background: #fff;
    font-family: 'Segoe UI Variable Display', 'Segoe UI', system-ui, -apple-system, sans-serif;
    color: ${TINTA};
    -webkit-font-smoothing: antialiased;
  }
  /* Fondo blanco + el color de la lámina en dos halos: uno arriba (tras el
     titular) y otro detrás del teléfono. La rejilla isométrica, en tinta. */
  .fondo, .rejilla, .halo, .halo-tel { position: absolute; inset: 0; }
  .fondo {
    background:
      radial-gradient(130% 62% at 50% -12%, ${s.glow}4d 0%, ${s.glow}1c 42%, transparent 72%),
      linear-gradient(180deg, #ffffff 0%, #ffffff 52%, ${FIN} 100%);
  }
  .rejilla {
    opacity: .9;
    background-image:
      repeating-linear-gradient(30deg, ${TINTA}12 0 1px, transparent 1px ${58 * u}px),
      repeating-linear-gradient(150deg, ${TINTA}12 0 1px, transparent 1px ${58 * u}px);
    -webkit-mask-image: radial-gradient(72% 56% at 50% 44%, #000 0%, transparent 78%);
            mask-image: radial-gradient(72% 56% at 50% 44%, #000 0%, transparent 78%);
  }
  .halo-tel {
    top: ${cabecera - h * 0.05}px;
    background: radial-gradient(46% 26% at 50% 24%, ${s.glow}59 0%, transparent 72%);
    filter: blur(${22 * u}px);
  }

  .cabecera {
    position: absolute; inset: 0 auto auto 0; width: 100%;
    height: ${cabecera}px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 0 ${72 * u}px;
    text-align: center;
  }

  .marca { display: flex; align-items: center; gap: ${16 * u}px; margin-bottom: ${34 * u}px; }
  .marca svg { width: ${58 * u}px; height: ${58 * u}px; border-radius: ${13 * u}px; display: block; }
  .marca span {
    font-size: ${26 * u}px; font-weight: 700; letter-spacing: ${0.6 * u}px;
    color: ${TINTA}b8;
  }

  h1 {
    font-size: ${92 * u}px;
    line-height: 1.03;
    font-weight: 800;
    letter-spacing: ${s.rtl ? 0 : -2.4 * u}px;
    text-wrap: balance;
  }
  h1 em { font-style: normal; color: ${s.acento}; }

  p.sub {
    margin-top: ${28 * u}px;
    font-size: ${31 * u}px;
    line-height: 1.35;
    font-weight: 500;
    color: ${TINTA}b0;
    max-width: ${820 * u}px;
  }

  /* Teléfono: marco dibujado en CSS (sin imagen de bisel). */
  .telefono {
    position: absolute;
    left: 50%;
    top: ${cabecera}px;
    width: ${anchoTel}px;
    height: ${altoTel}px;
    transform: translateX(-50%);
    border-radius: ${64 * u}px;
    padding: ${11 * u}px;
    background: linear-gradient(160deg, #565c74 0%, #1d2131 26%, #141724 62%, #3f4459 100%);
    box-shadow:
      0 ${40 * u}px ${90 * u}px ${s.glow}3d,
      0 ${26 * u}px ${60 * u}px rgba(28, 35, 51, .22),
      0 ${6 * u}px ${16 * u}px rgba(28, 35, 51, .14),
      inset 0 0 0 ${1.5 * u}px rgba(255, 255, 255, .18);
  }
  .pantalla {
    position: relative;
    width: 100%; height: 100%;
    border-radius: ${54 * u}px;
    overflow: hidden;
    background: #0b0e1a;
  }
  .pantalla img { width: 100%; display: block; }
  /* Degradado inferior: funde el teléfono con el fondo cuando asoma por abajo. */
  .fundido {
    position: absolute; left: 0; right: 0; bottom: 0; height: ${h * 0.15}px;
    opacity: ${asoma > 30 ? 1 : 0};
    background: linear-gradient(180deg, transparent 0%, ${FIN} 76%);
    pointer-events: none;
  }

  .chip {
    position: absolute;
    top: ${s.chip ? s.chip.arriba * u : 0}px;
    ${s.chip && s.chip.lado === 'izq' ? `left: ${44 * u}px;` : `right: ${44 * u}px;`}
    display: flex; align-items: center; gap: ${12 * u}px;
    padding: ${16 * u}px ${26 * u}px;
    border-radius: 999px;
    background: #fff;
    border: ${1.5 * u}px solid ${s.glow}59;
    font-size: ${24 * u}px; font-weight: 700; color: ${TINTA}; white-space: nowrap;
    box-shadow: 0 ${14 * u}px ${34 * u}px rgba(28, 35, 51, .2);
    transform: rotate(${s.chip && s.chip.lado === 'izq' ? '-4' : '4'}deg);
  }
  .chip b { color: ${s.acento}; }
</style>
<div class="fondo"></div>
<div class="rejilla"></div>
<div class="halo-tel"></div>
<div class="cabecera"${s.rtl ? ' dir="rtl"' : ''}>
  ${s.marca ? `<div class="marca">${ICONO}<span>Mind Planner Home</span></div>` : ''}
  <h1>${s.titulo}</h1>
  <p class="sub">${s.sub}</p>
</div>
<div class="telefono">
  <div class="pantalla">
    <img src="data:image/png;base64,${s.img}" alt="">
  </div>
</div>
${s.chip ? `<div class="chip"${s.rtl ? ' dir="rtl"' : ''}>${s.chip.texto}</div>` : ''}
<div class="fundido"></div>
`
}
