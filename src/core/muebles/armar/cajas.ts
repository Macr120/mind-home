import { RETRANQUEO_ENTREPANO } from '../materiales'
import type { Mm, Mueble, ParteMueble } from '../tipos'
import { base, bool, cajon, carcasa, frentes, num, panel, repartir, tuboColgar } from './comun'

/**
 * El módulo de madera: una carcasa de tablero con dentro lo que pida la receta
 * —columnas, entrepaños, cajones abajo y tubo de colgar—.
 *
 * Un solo armador cubre lo que antes eran cuatro módulos (armario, librero,
 * cajonera y zapatera): lo único que los diferenciaba eran estos parámetros,
 * así que tenerlos separados obligaba a elegir el mueble antes de saber qué se
 * quería, y luego no se podía cambiar de idea.
 */

/** Alto de cada cajón cuando el módulo lleva además entrepaños o tubo. */
const ALTO_CAJON: Mm = 200

/** Un entrepaño horizontal dentro del vano, retranqueado del frente. */
function entrepano(
  m: Mueble,
  o: { id: string; x: Mm; y: Mm; ancho: Mm; fondo: Mm; grados: number },
): ParteMueble {
  return panel(m, {
    id: o.id,
    rol: 'entrepano',
    clave: 'muebles.pieza.entrepano',
    nombreEs: 'Entrepaño',
    x: o.x,
    y: o.y,
    z: 0,
    dx: o.ancho,
    dy: m.tablero.grosor,
    dz: Math.max(100, o.fondo - RETRANQUEO_ENTREPANO),
    eje: 'y',
    veta: 'ancho',
    cantos: { arriba: true },
    // La inclinación (zapatera) es solo del render: el tablero se corta
    // rectangular y del mismo tamaño.
    rot: o.grados > 0 ? [(-o.grados * Math.PI) / 180, 0, 0] : undefined,
  })
}

export function armarMadera(m: Mueble): ParteMueble[] {
  const { ancho: A, alto: H, fondo: F } = m.medidas
  const t = m.tablero.grosor
  const zh = m.base.tipo === 'ninguna' ? 0 : m.base.altura
  const altoCuerpo = H - zh
  const partes = [...base(m, A, F), ...carcasa(m, { ancho: A, alto: altoCuerpo, fondo: F, y0: zh })]
  const anchoInterior = A - 2 * t
  const yInf = zh + t
  const ySup = zh + altoCuerpo - t
  const nCol = Math.max(1, num(m, 'columnas', 1))
  const nEnt = num(m, 'entrepanos', 3)
  const nCaj = num(m, 'cajones', 0)
  const conBarra = bool(m, 'barra', false)
  const grados = num(m, 'inclinacion', 0)

  // Los cajones ocupan la franja de abajo. Si no hay nada más dentro se
  // reparten el cuerpo entero (eso es una cajonera); si comparten con
  // entrepaños o con el tubo, cada uno mide lo de siempre y el resto queda
  // libre para ellos.
  let yLibre = yInf
  if (nCaj > 0) {
    const cabe = Math.floor((ySup - yInf) / nCaj)
    const alto = Math.max(80, nEnt === 0 && !conBarra ? cabe : Math.min(ALTO_CAJON, cabe))
    for (let i = 0; i < nCaj; i++) {
      partes.push(
        ...cajon(m, {
          id: `cajon.${i + 1}`,
          x: t,
          y: yLibre,
          z: F,
          ancho: anchoInterior,
          alto,
          fondo: F,
          n: i,
        }),
      )
      yLibre += alto
    }
  }

  // Lo que queda por encima de los cajones se parte en columnas, y cada hueco
  // lleva su propia tanda de entrepaños y su tubo.
  const anchoHueco = Math.round((anchoInterior - (nCol - 1) * t) / nCol)
  for (let c = 1; c < nCol; c++) {
    partes.push(
      panel(m, {
        id: `division.${c}`,
        rol: 'division',
        clave: 'muebles.pieza.division',
        nombreEs: 'División',
        x: t + c * (anchoHueco + t) - t,
        y: yLibre,
        z: 0,
        dx: t,
        dy: ySup - yLibre,
        dz: F,
        eje: 'x',
        veta: 'alto',
        cantos: { der: true },
      }),
    )
  }
  for (let c = 0; c < nCol; c++) {
    const x = t + c * (anchoHueco + t)
    for (const [i, y] of repartir(yLibre, ySup, nEnt, t).entries()) {
      partes.push(
        entrepano(m, { id: `entrepano.${c + 1}.${i + 1}`, x, y, ancho: anchoHueco, fondo: F, grados }),
      )
    }
    if (conBarra) {
      partes.push(
        tuboColgar(m, { id: `tubo.ropa.${c + 1}`, x, y: ySup - 80, z: F / 2, largo: anchoHueco }),
      )
    }
  }

  // El vano de puertas cubre solo lo que queda por encima de los cajones.
  partes.push(...frentes(m, { x: 0, y: yLibre - t, z: F, ancho: A, alto: ySup + t - (yLibre - t) }))
  return partes
}
