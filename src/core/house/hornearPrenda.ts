import * as THREE from 'three'
import type { Pieza3D } from '../chat/mascotas'
import { holgurasRopa, type AnclasRopa, type PrendaId } from './apariencia'

/**
 * Traduce una prenda de fábrica (la geometría de `Prendas.tsx`) a la lista de
 * primitivas equivalente, para poder editarla con el editor de piezas.
 *
 * Es una COPIA CONGELADA con las medidas del cuerpo que se le pase: deja de
 * adaptarse a otros personajes y las mangas/perneras pierden el balanceo al
 * caminar (los `<PivoteMarcha>` se aplanan a posición absoluta). Por eso el
 * horneado es bajo demanda y crea una copia: el original sigue siendo mejor
 * mientras no lo edites.
 */

/** Prendas cuyo horneado pierde el balanceo al caminar (mangas o perneras). */
export const PIERDE_MARCHA: ReadonlySet<PrendaId> = new Set<PrendaId>([
  'tenis', 'pantalon', 'playera', 'chamarra', 'camisa', 'shorts', 'botas', 'guantes',
])

/**
 * Prendas que NO tienen geometría propia en `Prendas.tsx`: se dibujan con las
 * piezas de aquí mismo (sombreros extra y vello facial), así la versión de
 * fábrica y la copia horneada son idénticas.
 */
export const PRENDAS_DE_PIEZAS: ReadonlySet<PrendaId> = new Set<PrendaId>([
  'vaquero', 'copa', 'fedora', 'boina', 'gorroLana', 'charro', 'mexicano', 'pirata', 'corona', 'vikingo',
  'bigote', 'bigoteManubrio', 'bigoteMorsa', 'barba', 'barbaCandado', 'barbaLarga', 'patillas',
])

const caja = (
  pos: [number, number, number],
  tam: [number, number, number],
  color: string,
): Pieza3D => ({ tipo: 'caja', pos, tam, color })

/** Cilindro de `Pieza3D`: `tam` = [radio arriba, radio abajo, alto]. */
const cilindro = (
  pos: [number, number, number],
  tam: [number, number, number],
  color: string,
): Pieza3D => ({ tipo: 'cilindro', pos, tam, color })

/**
 * Esfera de `Pieza3D`: con 3 valores es un elipsoide, pero `escalaPieza` NO
 * escala la X (toma `tam[0]` como radio base). Para un elipsoide achatado hay
 * que dar el radio mayor en X/Z y el aplastado en Y.
 */
const esfera = (
  pos: [number, number, number],
  tam: number[],
  color: string,
): Pieza3D => ({ tipo: 'esfera', pos, tam, color })

/** Cono de `Pieza3D`: `tam` = [radio, alto]; apunta a +Y sin rotación. */
const cono = (
  pos: [number, number, number],
  tam: [number, number],
  color: string,
  rot?: [number, number, number],
): Pieza3D => ({ tipo: 'cono', pos, tam, color, rot })

export function hornearPrenda(id: PrendaId, a: AnclasRopa, color: string): Pieza3D[] {
  // Mismos derivados que `Prendas.tsx`, para que la copia calce con el original.
  const k = a.cabezaR / 0.22
  const cinturaW = Math.max(...a.piernasX) - Math.min(...a.piernasX) + a.piernaW + 0.06
  const caderaY = a.piernasY + a.piernaH / 2
  const hombroY = a.torsoY + a.torsoH / 2
  const frenteZ = a.torsoD / 2
  const faldaH = a.piernaH * 1.15
  const brazos = [-a.brazoX, a.brazoX]
  const h = holgurasRopa(a)
  const pernera = (x: number, y: number, z: number, w: number, alto: number, fondo: number) => {
    const [cx, ancho] = h.pernera(x, w)
    return caja([cx, y, z], [ancho, alto, fondo], color)
  }
  const manga = (x: number, y: number, w: number, alto: number, fondo: number, exterior = false) => {
    const [cx, ancho] = h.manga(x, w, exterior)
    return caja([cx, y, 0], [ancho, alto, fondo], color)
  }
  // Cabeza: corona, medio-ancho y cara (vello facial a la altura de la boca de `Rostro`).
  const top = a.cabezaTop
  const hw = a.cabezaR
  const bocaY = a.cabezaY - 0.1 * k
  const barbillaY = a.cabezaY - hw * 1.09
  const lados = [-1, 1]
  const girada = (p: Pieza3D, rot: [number, number, number]): Pieza3D => ({ ...p, rot })
  // Tono secundario (cintas, pliegues) sacado del color elegido.
  const oscuro = '#' + new THREE.Color(color).multiplyScalar(0.55).getHexString()
  const barbaBase = () => [
    caja([0, (barbillaY - 0.05 * k + bocaY - 0.035 * k) / 2, a.caraZ - 0.005], [hw * 2 + 0.04, bocaY - barbillaY + 0.015 * k, 0.05], color),
    ...lados.map((sx) =>
      caja([sx * (hw + 0.015), (barbillaY - 0.03 * k + a.cabezaY) / 2, 0.05], [0.04, a.cabezaY - barbillaY + 0.03 * k, hw * 1.6], color),
    ),
    ...lados.map((sx) => caja([sx * hw * 0.72, bocaY + 0.02 * k, a.caraZ - 0.005], [hw * 0.56, 0.1 * k, 0.05], color)),
  ]

  switch (id) {
    case 'sombrero':
      return [
        cilindro([0, a.cabezaTop + 0.02, 0], [a.cabezaR + 0.14, a.cabezaR + 0.14, 0.05], color),
        cilindro([0, a.cabezaTop + 0.18, 0], [a.cabezaR - 0.01, a.cabezaR, 0.28], color),
      ]

    case 'gorroChef': {
      // Copete: esfera de radio `r` con scale [1.15, 0.8, 1.15]. Como la X no se
      // escala, el radio base pasa a ser r*1.15 y la Y se aplasta a r*0.8.
      const r = a.cabezaR + 0.2
      return [
        cilindro([0, a.cabezaTop + 0.07, 0], [a.cabezaR + 0.02, a.cabezaR + 0.02, 0.1], color),
        esfera([0, a.cabezaTop + 0.29, 0], [r * 1.15, r * 0.8, r * 1.15], color),
      ]
    }

    case 'gorra':
      return [
        // La cúpula original es MEDIA esfera; aquí sale entera y la mitad de
        // abajo queda dentro de la cabeza.
        esfera([0, a.cabezaTop - 0.04, 0], [a.cabezaR + 0.05], color),
        caja(
          [0, a.cabezaTop - 0.03, a.cabezaR + 0.12],
          [(a.cabezaR + 0.05) * 1.3, 0.05, 0.22],
          color,
        ),
      ]

    case 'lentes':
      return [
        ...[-a.cabezaR * 0.5, a.cabezaR * 0.5].map((x) =>
          caja([x, a.cabezaY, a.caraZ], [0.15 * k, 0.12 * k, 0.04], color),
        ),
        caja([0, a.cabezaY, a.caraZ], [0.1 * k, 0.03, 0.03], color),
      ]

    case 'bufanda':
      return [
        cilindro([0, hombroY + 0.05, 0], [a.torsoW * 0.42, a.torsoW * 0.42, 0.16], color),
        caja([0.06, hombroY - 0.16, frenteZ + 0.02], [0.13, 0.4, 0.06], color),
      ]

    case 'corbata':
      return [
        caja([0, hombroY - 0.02, frenteZ + 0.02], [0.1, 0.1, 0.04], color),
        caja([0, a.torsoY - 0.02, frenteZ + 0.02], [0.12, a.torsoH * 0.6, 0.03], color),
      ]

    case 'camisa':
      return [
        caja([0, a.torsoY, 0], [h.torso(0.06), a.torsoH + 0.04, a.torsoD + 0.06], color),
        ...brazos.map((x) => manga(x, a.torsoY, 0.26, a.torsoH + 0.02, a.torsoD + 0.02)),
      ]

    case 'playera':
      return [
        caja([0, a.torsoY, 0], [h.torso(0.06), a.torsoH + 0.04, a.torsoD + 0.06], color),
        ...brazos.map((x) => manga(x, hombroY - 0.13, 0.26, 0.3, a.torsoD + 0.02)),
      ]

    case 'chamarra':
      // Cuerpos redondos y anchos (el búho) llevan una prenda grande de una pieza.
      if (a.chamarra) {
        return [caja([0, a.chamarra.y, 0], [a.chamarra.w, a.chamarra.h, a.chamarra.d], color)]
      }
      return [
        caja([0, a.torsoY - 0.02, 0], [h.torso(0.12, true), a.torsoH + 0.1, a.torsoD + 0.14], color),
        ...brazos.map((x) => manga(x, a.torsoY + 0.01, 0.3, a.torsoH + 0.04, a.torsoD + 0.04, true)),
        caja([0, a.torsoY + a.torsoH * 0.58, 0], [a.torsoW * 0.83, 0.16, a.torsoD + 0.1], color),
      ]

    case 'capa':
      // El original es de doble cara; horneado solo se ve por delante.
      return [
        caja(
          [0, a.torsoY - 0.08, -(a.torsoD / 2 + 0.04)],
          [h.torso(0.14, true), a.torsoH + 0.34, 0.04],
          color,
        ),
      ]

    case 'vestido':
      return [
        caja([0, a.torsoY, 0], [h.torso(0.06), a.torsoH + 0.04, a.torsoD + 0.06], color),
        // La campana original es hueca y de doble cara: horneada sale maciza.
        cilindro([0, caderaY - faldaH / 2 + 0.05, 0], [cinturaW * 0.55, cinturaW, faldaH], color),
      ]

    case 'falda':
      return [
        cilindro([0, caderaY, 0], [cinturaW * 0.5, cinturaW * 0.5, 0.14], color),
        cilindro([0, caderaY - faldaH / 2 + 0.02, 0], [cinturaW * 0.52, cinturaW, faldaH], color),
      ]

    case 'pantalon':
      return [
        ...a.piernasX.map((x) => pernera(x, a.piernasY, 0, a.piernaW, a.piernaH, a.piernaD)),
        caja([0, a.piernasY + a.piernaH * 0.5, 0], [cinturaW, 0.2, a.piernaD + 0.02], color),
      ]

    case 'shorts':
      return [
        ...a.piernasX.map((x) =>
          pernera(x, a.piernasY + a.piernaH * 0.25, 0, a.piernaW + 0.04, a.piernaH * 0.5, a.piernaD + 0.04),
        ),
        caja([0, caderaY, 0], [cinturaW, 0.2, a.piernaD + 0.02], color),
      ]

    case 'botas':
      return a.piernasX.flatMap((x) => [
        pernera(x, a.piesY + a.piernaH * 0.22, 0, a.piernaW + 0.05, a.piernaH * 0.5, a.piernaD + 0.05),
        pernera(x, a.piesY, 0.05, a.piernaW + 0.05, 0.18, a.piernaD * 1.3),
      ])

    case 'tenis':
      return a.piernasX.map((x) => pernera(x, a.piesY, 0.04, a.piernaW + 0.03, 0.2, a.piernaD * 1.25 + 0.03))

    case 'guantes':
      return brazos.map((x) =>
        caja([x, hombroY - (a.torsoH * 0.95 + 0.05), 0], [0.16, 0.16, a.torsoD + 0.02], color),
      )

    case 'mochila':
      return [
        caja(
          [0, a.torsoY + 0.02, -(a.torsoD / 2 + 0.12)],
          [a.torsoW * 0.8, a.torsoH * 0.85, 0.22],
          color,
        ),
        ...[-a.torsoW * 0.28, a.torsoW * 0.28].map((x) =>
          caja([x, a.torsoY + 0.05, frenteZ], [0.07, a.torsoH * 0.8, 0.05], color),
        ),
      ]

    case 'vaquero':
      return [
        cilindro([0, top + 0.02, 0], [hw + 0.2, hw + 0.2, 0.04], color),
        // Alas levantadas a los lados.
        ...lados.map((sx) => girada(caja([sx * (hw + 0.17), top + 0.08, 0], [0.1, 0.03, (hw + 0.14) * 1.6], color), [0, 0, sx * 0.7])),
        cilindro([0, top + 0.15, 0], [hw - 0.04, hw, 0.24], color),
        cilindro([0, top + 0.07, 0], [hw + 0.005, hw + 0.005, 0.05], oscuro),
        caja([0, top + 0.27, 0], [0.05, 0.03, hw * 1.4], oscuro),
      ]

    case 'copa':
      return [
        cilindro([0, top + 0.02, 0], [hw + 0.1, hw + 0.1, 0.04], color),
        cilindro([0, top + 0.25, 0], [hw + 0.01, hw - 0.01, 0.44], color),
        cilindro([0, top + 0.09, 0], [hw + 0.005, hw + 0.005, 0.08], '#8b1e2d'),
      ]

    case 'fedora':
      return [
        cilindro([0, top + 0.02, 0], [hw + 0.12, hw + 0.12, 0.035], color),
        cilindro([0, top + 0.12, 0], [hw - 0.05, hw - 0.01, 0.2], color),
        cilindro([0, top + 0.06, 0], [hw - 0.005, hw - 0.005, 0.05], oscuro),
        caja([0, top + 0.22, 0], [0.04, 0.03, hw * 1.2], oscuro),
      ]

    case 'boina':
      return [
        girada(esfera([0.03, top + 0.03, 0], [hw + 0.08, (hw + 0.08) * 0.32, hw + 0.08], color), [0, 0, -0.18]),
        cilindro([0.05, top + 0.1, 0], [0.015, 0.02, 0.05], oscuro),
      ]

    case 'gorroLana':
      return [
        esfera([0, top - 0.02, 0], [hw + 0.05, hw + 0.02, hw + 0.05], color),
        caja([0, top - 0.06, 0], [hw * 2 + 0.05, 0.11, hw * 2 + 0.05], oscuro),
        esfera([0, top + 0.24, 0], [0.07], '#f5f5f0'),
      ]

    case 'charro':
      return [
        cilindro([0, top + 0.02, 0], [hw + 0.36, hw + 0.36, 0.03], color),
        // Aro decorativo del ala: disco oscuro tapado por otro del color, deja un anillo.
        cilindro([0, top + 0.04, 0], [hw + 0.3, hw + 0.3, 0.012], oscuro),
        cilindro([0, top + 0.05, 0], [hw + 0.26, hw + 0.26, 0.012], color),
        cilindro([0, top + 0.2, 0], [hw * 0.55, hw + 0.02, 0.36], color),
        cilindro([0, top + 0.08, 0], [hw + 0.015, hw + 0.02, 0.07], oscuro),
      ]

    case 'mexicano':
      return [
        cilindro([0, top + 0.02, 0], [hw + 0.42, hw + 0.42, 0.03], color),
        // Ala levantada en la orilla: tronco de cono más ancho arriba.
        cilindro([0, top + 0.07, 0], [hw + 0.46, hw + 0.4, 0.08], color),
        cilindro([0, top + 0.25, 0], [hw * 0.3, hw + 0.03, 0.44], color),
        esfera([0, top + 0.47, 0], [hw * 0.32], color),
        // Cinta tricolor.
        cilindro([0, top + 0.13, 0], [hw + 0.01, hw + 0.02, 0.04], '#1e8449'),
        cilindro([0, top + 0.17, 0], [hw - 0.02, hw - 0.01, 0.04], '#f5f5f0'),
        cilindro([0, top + 0.21, 0], [hw - 0.05, hw - 0.04, 0.04], '#c0392b'),
        // Borlas colgando del ala.
        ...[0, 1, 2, 3, 4, 5].map((i) => {
          const ang = (i * Math.PI * 2) / 6 + Math.PI / 6
          return esfera([Math.sin(ang) * (hw + 0.44), top + 0.01, Math.cos(ang) * (hw + 0.44)], [0.035], i % 2 ? '#c0392b' : '#1e8449')
        }),
      ]

    case 'pirata':
      return [
        cilindro([0, top + 0.04, 0], [hw + 0.01, hw + 0.02, 0.1], color),
        // Bicornio: elipsoide ancho y delgado atravesado sobre la cabeza.
        esfera([0, top + 0.1, 0], [hw + 0.2, hw * 0.75, 0.09], color),
        esfera([0, top + 0.13, 0.085], [0.045], '#f5f5f0'),
      ]

    case 'corona':
      return [
        { ...cilindro([0, top + 0.05, 0], [hw + 0.03, hw + 0.03, 0.1], color), mat: 'brillante' },
        ...[0, 1, 2, 3, 4].map((i): Pieza3D => {
          const ang = (i * Math.PI * 2) / 5
          return { ...cono([Math.sin(ang) * (hw + 0.02), top + 0.15, Math.cos(ang) * (hw + 0.02)], [0.045, 0.12], color), mat: 'brillante' }
        }),
        { ...esfera([0, top + 0.05, hw + 0.035], [0.03], '#dc2626'), mat: 'brillante' },
      ]

    case 'vikingo':
      return [
        { ...esfera([0, top, 0], [hw + 0.05], color), mat: 'brillante' },
        { ...caja([0, top - 0.05, 0], [hw * 2 + 0.06, 0.07, hw * 2 + 0.06], oscuro), mat: 'brillante' },
        { ...caja([0, top - 0.12, hw + 0.035], [0.04, 0.14, 0.03], oscuro), mat: 'brillante' },
        ...lados.map((sx) => cono([sx * (hw + 0.12), top - 0.02, 0], [0.065, 0.28], '#efe6cf', [0, 0, -sx * 0.8])),
      ]

    case 'bigote':
      return [
        caja([0, bocaY + 0.045 * k, a.caraZ], [0.17 * k, 0.045 * k, 0.03], color),
        ...lados.map((sx) => caja([sx * 0.085 * k, bocaY + 0.025 * k, a.caraZ], [0.04 * k, 0.05 * k, 0.03], color)),
      ]

    case 'bigoteManubrio':
      return [
        caja([0, bocaY + 0.045 * k, a.caraZ], [0.13 * k, 0.04 * k, 0.03], color),
        ...lados.map((sx) => girada(caja([sx * 0.09 * k, bocaY + 0.06 * k, a.caraZ], [0.08 * k, 0.03 * k, 0.03], color), [0, 0, sx * 0.5])),
        ...lados.map((sx) => esfera([sx * 0.13 * k, bocaY + 0.09 * k, a.caraZ], [0.022 * k], color)),
      ]

    case 'bigoteMorsa':
      return [
        caja([0, bocaY + 0.03 * k, a.caraZ + 0.005], [0.22 * k, 0.08 * k, 0.04], color),
        ...lados.map((sx) => caja([sx * 0.1 * k, bocaY - 0.01 * k, a.caraZ + 0.005], [0.05 * k, 0.1 * k, 0.04], color)),
      ]

    case 'barba':
      return barbaBase()

    case 'barbaCandado':
      return [
        caja([0, bocaY - 0.075 * k, a.caraZ - 0.005], [0.13 * k, 0.1 * k, 0.05], color),
        caja([0, bocaY + 0.045 * k, a.caraZ], [0.15 * k, 0.035 * k, 0.03], color),
        ...lados.map((sx) => caja([sx * 0.07 * k, bocaY - 0.01 * k, a.caraZ], [0.03 * k, 0.1 * k, 0.03], color)),
      ]

    case 'barbaLarga':
      return [
        ...barbaBase(),
        caja([0, bocaY + 0.03 * k, a.caraZ + 0.005], [0.22 * k, 0.07 * k, 0.04], color),
        caja([0, barbillaY - 0.15 * k, a.caraZ - 0.02], [hw * 1.6, 0.3 * k, 0.06], color),
        cono([0, barbillaY - 0.37 * k, a.caraZ - 0.02], [hw * 0.8, 0.14 * k], color, [Math.PI, 0, 0]),
      ]

    case 'patillas':
      return lados.map((sx) => caja([sx * (hw + 0.012), a.cabezaY - 0.02 * k, 0.1], [0.03, 0.2 * k, 0.12], color))

    // Los tatuajes son calcomanías (textura sobre la piel): no hay piezas que hornear.
    case 'tatuajeCorazon':
    case 'tatuajeAncla':
    case 'tatuajeTribal':
    case 'tatuajeRosa':
    case 'tatuajeDragon':
    case 'tatuajeEstrella':
    case 'tatuajeLagrima':
      return []
  }
}
