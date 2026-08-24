// Lámina de tienda para iPad (2048×2732, 12.9"): mismo lenguaje visual que
// plantilla.mjs (fondo blanco + halo morado, marco de tablet en CSS), pero con
// el aspecto de pantalla de un iPad (0.75, no el 0.4621 del teléfono) y
// proporciones recalculadas para ese formato casi cuadrado.
const ICONO = `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="112" fill="#576748"/>
  <g transform="translate(77.5 206)">
    <rect x="0" y="3" width="94" height="94" rx="20" fill="#DA9425"/>
    <path d="M137 0V100H237Z" fill="#C23A40"/>
    <path d="M257 0H357V100A100 100 0 0 1 257 0Z" fill="#895AC6"/>
  </g>
</svg>`

const TINTA = '#1c2333'
const FIN = '#f4f6fb'
const GLOW = '#895ac6'
const ACENTO = '#6d34b8'

/**
 * @param {{titulo:string, sub:string, img:string, rtl?:boolean}} s
 * @param {{w:number,h:number}} tam
 */
export function laminaIpad(s, tam) {
  const { w, h } = tam
  const u = w / 1000
  // La captura de la app es 1024×1366 (aspecto 0.7496, ya el de un iPad real):
  // se pinta 1:1 en CSS, sin escalar por Chrome — el navegador la reescala como
  // imagen normal, no como canvas WebGL, así que no hay riesgo de crash.
  const anchoTel = w * 0.64
  const altoTel = anchoTel / 0.7496
  const cabecera = h * 0.29

  return `<meta charset="utf-8">
<title>lamina-ipad</title>
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
  .fondo, .rejilla, .halo-tel { position: absolute; inset: 0; }
  .fondo {
    background:
      radial-gradient(120% 56% at 50% -10%, ${GLOW}4d 0%, ${GLOW}1c 42%, transparent 72%),
      linear-gradient(180deg, #ffffff 0%, #ffffff 60%, ${FIN} 100%);
  }
  .rejilla {
    opacity: .9;
    background-image:
      repeating-linear-gradient(30deg, ${TINTA}12 0 1px, transparent 1px ${58 * u}px),
      repeating-linear-gradient(150deg, ${TINTA}12 0 1px, transparent 1px ${58 * u}px);
    -webkit-mask-image: radial-gradient(66% 52% at 50% 60%, #000 0%, transparent 78%);
            mask-image: radial-gradient(66% 52% at 50% 60%, #000 0%, transparent 78%);
  }
  .halo-tel {
    top: ${cabecera - h * 0.05}px;
    background: radial-gradient(50% 24% at 50% 20%, ${GLOW}59 0%, transparent 72%);
    filter: blur(${26 * u}px);
  }

  .cabecera {
    position: absolute; inset: 0 auto auto 0; width: 100%;
    height: ${cabecera}px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 0 ${100 * u}px;
    text-align: center;
  }
  .marca { display: flex; align-items: center; gap: ${16 * u}px; margin-bottom: ${30 * u}px; }
  .marca svg { width: ${52 * u}px; height: ${52 * u}px; border-radius: ${12 * u}px; display: block; }
  .marca span { font-size: ${24 * u}px; font-weight: 700; letter-spacing: ${0.6 * u}px; color: ${TINTA}b8; }

  h1 {
    font-size: ${76 * u}px;
    line-height: 1.06;
    font-weight: 800;
    letter-spacing: ${s.rtl ? 0 : -2 * u}px;
    text-wrap: balance;
  }
  h1 em { font-style: normal; color: ${ACENTO}; }

  p.sub {
    margin-top: ${24 * u}px;
    font-size: ${27 * u}px;
    line-height: 1.35;
    font-weight: 500;
    color: ${TINTA}b0;
    max-width: ${760 * u}px;
  }

  .telefono {
    position: absolute;
    left: 50%;
    top: ${cabecera}px;
    width: ${anchoTel}px;
    height: ${altoTel}px;
    transform: translateX(-50%);
    border-radius: ${46 * u}px;
    padding: ${16 * u}px;
    background: linear-gradient(160deg, #565c74 0%, #1d2131 26%, #141724 62%, #3f4459 100%);
    box-shadow:
      0 ${44 * u}px ${100 * u}px ${GLOW}3d,
      0 ${28 * u}px ${64 * u}px rgba(28, 35, 51, .22),
      0 ${6 * u}px ${16 * u}px rgba(28, 35, 51, .14),
      inset 0 0 0 ${1.5 * u}px rgba(255, 255, 255, .18);
  }
  .pantalla {
    position: relative;
    width: 100%; height: 100%;
    border-radius: ${32 * u}px;
    overflow: hidden;
    background: #0b0e1a;
  }
  .pantalla img { width: 100%; height: 100%; display: block; object-fit: cover; }
</style>
<div class="fondo"></div>
<div class="rejilla"></div>
<div class="halo-tel"></div>
<div class="cabecera">
  <div class="marca">${ICONO}<span>Mind Planner Home</span></div>
  <h1${s.rtl ? ' dir="rtl"' : ''}>${s.titulo}</h1>
  <p class="sub"${s.rtl ? ' dir="rtl"' : ''}>${s.sub}</p>
</div>
<div class="telefono">
  <div class="pantalla">
    <img src="data:image/png;base64,${s.img}" alt="">
  </div>
</div>
`
}
