import type { CSSProperties } from 'react'

/**
 * Ajuste del fondo basado en ANCLA: qué punto de la imagen (0–1) cae en el centro
 * del viewport, más un zoom donde 1 = imagen completa visible («contain»).
 * Es independiente del tamaño/aspecto de pantalla, así la vista previa y el cielo
 * 3D usan exactamente la misma fórmula y coinciden.
 */
export interface AjusteFondoImagen {
  anclaU: number
  anclaV: number
  escala: number
}

export const AJUSTE_FONDO_DEFAULT: AjusteFondoImagen = { anclaU: 0.5, anclaV: 0.5, escala: 1 }

export function clampAjuste(a: AjusteFondoImagen): AjusteFondoImagen {
  return {
    anclaU: a.anclaU,
    anclaV: a.anclaV,
    escala: Math.min(4, Math.max(0.2, a.escala)),
  }
}

export function ajusteFondoInicial(): AjusteFondoImagen {
  return { anclaU: 0.5, anclaV: 0.5, escala: 1 }
}

/** Escala base «contain»: la imagen completa cabe en el viewport (sin recortar). */
function escalaContener(iw: number, ih: number, cw: number, ch: number) {
  return Math.min(cw / Math.max(iw, 1), ch / Math.max(ih, 1))
}

/**
 * Rectángulo de la imagen (en píxeles del viewport): tamaño mostrado y esquina
 * superior-izquierda. El punto `ancla` de la imagen queda en el centro del viewport.
 */
export function layoutFondoImagen(
  anchoImg: number,
  altoImg: number,
  anchoVp: number,
  altoVp: number,
  ajuste: AjusteFondoImagen,
) {
  const { anclaU, anclaV, escala } = clampAjuste(ajuste)
  const iw = Math.max(anchoImg, 1)
  const ih = Math.max(altoImg, 1)
  const cw = Math.max(anchoVp, 1)
  const ch = Math.max(altoVp, 1)

  const base = escalaContener(iw, ih, cw, ch)
  const anchoD = iw * base * escala
  const altoD = ih * base * escala
  const left = cw * 0.5 - anclaU * anchoD
  const top = ch * 0.5 - anclaV * altoD

  return { anchoD, altoD, left, top }
}

/** Estilo CSS para el <img> de la vista previa (mismas coordenadas que el 3D). */
export function estiloPreviewFondo(
  anchoImg: number,
  altoImg: number,
  anchoVp: number,
  altoVp: number,
  ajuste: AjusteFondoImagen,
): Pick<CSSProperties, 'width' | 'height' | 'left' | 'top' | 'maxWidth'> {
  const e = layoutFondoImagen(anchoImg, altoImg, anchoVp, altoVp, ajuste)
  return {
    width: e.anchoD,
    height: e.altoD,
    left: e.left,
    top: e.top,
    maxWidth: 'none',
  }
}

/**
 * Nuevo ajuste tras arrastrar: `dxFrac`/`dyFrac` son el desplazamiento del puntero
 * como fracción del ancho/alto del viewport. La imagen sigue al puntero.
 */
export function ajusteTrasArrastre(
  ajuste: AjusteFondoImagen,
  anchoImg: number,
  altoImg: number,
  anchoVp: number,
  altoVp: number,
  dxFrac: number,
  dyFrac: number,
): AjusteFondoImagen {
  const e = layoutFondoImagen(anchoImg, altoImg, anchoVp, altoVp, ajuste)
  const newLeft = e.left + dxFrac * anchoVp
  const newTop = e.top + dyFrac * altoVp
  return {
    ...clampAjuste(ajuste),
    anclaU: (anchoVp * 0.5 - newLeft) / e.anchoD,
    anclaV: (altoVp * 0.5 - newTop) / e.altoD,
  }
}

/** Lee dimensiones de un archivo de imagen. */
export function medirImagen(file: Blob): Promise<{ ancho: number; alto: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ ancho: img.naturalWidth, alto: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la imagen'))
    }
    img.src = url
  })
}

/** Persistencia: ajuste → campos de DB. */
export function ajusteADb(a: AjusteFondoImagen) {
  return { ajusteX: a.anclaU, ajusteY: a.anclaV, escala: a.escala }
}

/** Persistencia: campos de DB → ajuste (migra valores antiguos fuera de rango). */
export function ajusteDesdeDb(ajusteX: number, ajusteY: number, escala: number): AjusteFondoImagen {
  const u = Number.isFinite(ajusteX) && ajusteX >= 0 && ajusteX <= 1 ? ajusteX : 0.5
  const v = Number.isFinite(ajusteY) && ajusteY >= 0 && ajusteY <= 1 ? ajusteY : 0.5
  const e = Number.isFinite(escala) ? Math.min(4, Math.max(0.2, escala)) : 1
  return { anclaU: u, anclaV: v, escala: e }
}
