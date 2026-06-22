import type { CSSProperties } from 'react'
import {
  colorTechoLoseta,
  getTechoTipo,
  type TechoTipo,
  type TechoTipoId,
} from '../../house/techos'

/**
 * Estilo de la miniatura de cada tipo de techo.
 * Si el tipo tiene `textura`, usa la imagen JPG igual que el piso.
 * Si no, usa gradientes CSS procedurales.
 */
function swatchStyle(conf: TechoTipo, color: string): CSSProperties {
  if (conf.textura)
    return {
      backgroundColor: color,
      backgroundImage: `url(/textures/${conf.textura}_color.jpg)`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }
  if (conf.variante === 'tejas_rojas' || conf.variante === 'tejas_oscuras' || conf.variante === 'teja_castillo') {
    // Canvas pattern aproximado: filas de rectángulos con luz/sombra
    return {
      backgroundColor: color,
      backgroundImage: `
        repeating-linear-gradient(
          0deg,
          rgba(0,0,0,0.22) 0 2px,
          transparent 2px 16px
        ),
        repeating-linear-gradient(
          90deg,
          rgba(255,255,255,0.1) 0 1px,
          transparent 1px 24px
        ),
        linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(0,0,0,0.1) 100%)`,
    }
  }
  return patron(conf.variante, color, conf.emissive)
}

/** Patrones CSS que aproximan la apariencia de cada material de techo. */
function patron(id: TechoTipoId, base: string, emissive?: string): CSSProperties {
  switch (id) {
    case 'tejas_rojas':
    case 'tejas_oscuras':
    case 'teja_castillo':
      return {
        backgroundColor: base,
        backgroundImage: `
          repeating-linear-gradient(
            163deg,
            transparent,
            transparent 5px,
            rgba(0,0,0,0.22) 5px,
            rgba(0,0,0,0.22) 7px
          ),
          repeating-linear-gradient(
            17deg,
            rgba(255,255,255,0.08) 0 3px,
            transparent 3px 11px
          )`,
      }
    case 'metal':
      return {
        backgroundColor: base,
        backgroundImage: `
          linear-gradient(135deg, rgba(255,255,255,0.35) 0%, transparent 45%, rgba(0,0,0,0.15) 100%),
          repeating-linear-gradient(
            0deg,
            rgba(255,255,255,0.12) 0 1px,
            transparent 1px 5px
          )`,
      }
    case 'paja':
      return {
        backgroundColor: base,
        backgroundImage: `
          radial-gradient(circle at 20% 30%, rgba(255,220,100,0.5) 0 18%, transparent 19%),
          radial-gradient(circle at 65% 55%, rgba(255,200,80,0.45) 0 14%, transparent 15%),
          radial-gradient(circle at 40% 75%, rgba(200,140,30,0.35) 0 12%, transparent 13%),
          radial-gradient(circle at 80% 25%, rgba(255,230,120,0.4) 0 10%, transparent 11%)`,
      }
    case 'losa_pizarra':
      return {
        backgroundColor: base,
        backgroundImage:
          'linear-gradient(145deg, rgba(255,255,255,0.06) 0%, transparent 40%, rgba(0,0,0,0.18) 100%)',
      }
    case 'cristal':
      return {
        backgroundColor: base,
        backgroundImage:
          'linear-gradient(135deg, rgba(255,255,255,0.55) 0%, transparent 35%, rgba(125,211,252,0.35) 100%)',
        opacity: 0.88,
      }
    case 'panel_orbital':
      return {
        backgroundColor: base,
        backgroundImage: `
          repeating-linear-gradient(
            90deg,
            ${emissive ?? '#22d3ee'}55 0 1px,
            transparent 1px 7px
          ),
          radial-gradient(circle at 50% 50%, ${emissive ?? '#22d3ee'}44 0 22%, transparent 23%)`,
        boxShadow: emissive ? `inset 0 0 8px ${emissive}66` : undefined,
      }
    case 'neon_techo':
      return {
        backgroundColor: base,
        backgroundImage: `
          repeating-linear-gradient(
            90deg,
            ${emissive ?? '#d946ef'}66 0 1px,
            transparent 1px 6px
          ),
          linear-gradient(180deg, rgba(217,70,239,0.15) 0%, transparent 60%)`,
        boxShadow: emissive ? `inset 0 0 10px ${emissive}55` : undefined,
      }
    case 'lapida':
      return {
        backgroundColor: base,
        backgroundImage:
          'linear-gradient(160deg, rgba(88,28,135,0.25) 0%, transparent 50%, rgba(0,0,0,0.3) 100%)',
        boxShadow: emissive ? `inset 0 0 6px ${emissive}44` : undefined,
      }
    case 'rosa_brillo':
      return {
        backgroundColor: base,
        backgroundImage:
          'linear-gradient(135deg, rgba(255,255,255,0.45) 0%, transparent 40%, rgba(255,95,162,0.35) 100%)',
        boxShadow: emissive ? `inset 0 0 8px ${emissive}55` : undefined,
      }
    case 'madera_sol':
      return {
        backgroundColor: base,
        backgroundImage: `
          repeating-linear-gradient(
            90deg,
            rgba(0,0,0,0.12) 0 1px,
            transparent 1px 5px
          ),
          linear-gradient(180deg, rgba(255,200,100,0.15) 0%, transparent 100%)`,
      }
    case 'nieve_techo':
      return {
        backgroundColor: base,
        backgroundImage: `
          radial-gradient(circle at 25% 35%, rgba(255,255,255,0.9) 0 16%, transparent 17%),
          radial-gradient(circle at 70% 60%, rgba(255,255,255,0.85) 0 12%, transparent 13%),
          radial-gradient(circle at 50% 80%, rgba(186,230,253,0.7) 0 10%, transparent 11%)`,
      }
    default:
      return {
        backgroundColor: base,
        backgroundImage:
          'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, transparent 50%, rgba(0,0,0,0.12) 100%)',
      }
  }
}

type Props =
  | { modo: 'heredar'; colorCuarto: string; techoGlobal: TechoTipoId | null }
  | { modo: 'color'; colorCuarto: string }
  | { modo: 'tipo'; tipo: TechoTipoId; colorCuarto: string }

/** Muestra una miniatura del color/textura del material de techo. */
export function TechoMaterialSwatch(props: Props) {
  let estilo: CSSProperties

  if (props.modo === 'color') {
    estilo = {
      backgroundColor: props.colorCuarto,
      backgroundImage:
        'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)',
    }
  } else if (props.modo === 'heredar') {
    if (props.techoGlobal) {
      const conf = getTechoTipo(props.techoGlobal)!
      const mat = colorTechoLoseta(props.techoGlobal, props.colorCuarto)
      const basePatron = swatchStyle(conf, mat.color)
      estilo = {
        ...basePatron,
        boxShadow: `inset 0 0 0 2px rgba(255,255,255,0.28)${basePatron.boxShadow ? `, ${basePatron.boxShadow}` : ''}`,
      }
    } else {
      estilo = {
        backgroundColor: props.colorCuarto,
        backgroundImage: `
          linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 50%, rgba(0,0,0,0.1) 100%),
          repeating-linear-gradient(
            45deg,
            rgba(255,255,255,0.06) 0 4px,
            transparent 4px 8px
          )`,
        boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.2)',
      }
    }
  } else {
    // Mostrar el material con su color NATIVO (sin mezclar el color del cuarto),
    // así cada textura se distingue y se ve como realmente es.
    const conf = getTechoTipo(props.tipo)!
    estilo = swatchStyle(conf, conf.color)
  }

  return (
    <span
      className="block h-8 w-full min-w-[2rem] rounded-md border border-white/15 shadow-inner"
      style={estilo}
      aria-hidden
    />
  )
}
