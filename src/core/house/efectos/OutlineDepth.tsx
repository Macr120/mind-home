import { forwardRef, useMemo } from 'react'
import { BlendFunction, Effect, EffectAttribute } from 'postprocessing'
import { Color, Uniform } from 'three'

/**
 * Contornos de silueta por profundidad (estilo cómic): un Sobel en cruz sobre
 * el depth buffer pinta línea donde la profundidad "salta" (bordes de objetos
 * contra el fondo/piso). Con la cámara ortográfica el depth es lineal, así que
 * un umbral fijo funciona bien en todo el mapa.
 */
const FRAG = /* glsl */ `
  uniform vec3 lineColor;
  uniform float umbral;
  uniform float grosor;

  void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
    vec2 t = texelSize * grosor;
    float dN = readDepth(uv + vec2(0.0, t.y));
    float dS = readDepth(uv - vec2(0.0, t.y));
    float dE = readDepth(uv + vec2(t.x, 0.0));
    float dW = readDepth(uv - vec2(t.x, 0.0));
    float borde = abs(dN - depth) + abs(dS - depth) + abs(dE - depth) + abs(dW - depth);
    float linea = smoothstep(umbral, umbral * 2.0, borde);
    outputColor = vec4(mix(inputColor.rgb, lineColor, linea), inputColor.a);
  }
`

export class OutlineDepthEffect extends Effect {
  constructor({ color = '#141414', umbral = 0.0004, grosor = 2 } = {}) {
    super('OutlineDepthEffect', FRAG, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.DEPTH,
      uniforms: new Map<string, Uniform>([
        ['lineColor', new Uniform(new Color(color))],
        ['umbral', new Uniform(umbral)],
        ['grosor', new Uniform(grosor)],
      ]),
    })
  }
}

export const OutlineDepth = forwardRef<
  OutlineDepthEffect,
  { color?: string; umbral?: number; grosor?: number }
>(function OutlineDepth(props, ref) {
  const { color, umbral, grosor } = props
  const effect = useMemo(
    () => new OutlineDepthEffect({ color, umbral, grosor }),
    [color, umbral, grosor],
  )
  return <primitive ref={ref} object={effect} />
})
