import type { Mm, Mueble, ParteMueble } from '../tipos'
import {
  bool,
  cruzCentral,
  esquinasInscritas,
  herraje,
  num,
  panel,
  repartir,
  texto,
  tono,
  tuboColgar,
  tuboParte,
} from './comun'

/**
 * Los tres módulos que llevan metal: la estructura de postes, la mesa y la
 * silla. El metal entra como postes y travesaños de tubo (`tuboParte`), que se
 * cotizan por metro lineal y en el 3D se ven metálicos.
 *
 * Planta circular: los cuatro postes o patas se mudan al cuadrado inscrito
 * (`esquinasInscritas`) y todo lo que va entre ellos —travesaños, largueros,
 * respaldo, brazos— se calcula desde esas esquinas, así que el mismo código
 * sirve para las dos plantas. Lo plano (cubierta, asiento, repisa) pasa a disco.
 */

/** Cuánto sobresale el descansabrazos por encima del asiento. */
const ALTO_BRAZO: Mm = 200

/** Esquinas de los cuatro apoyos: las del rectángulo o las del círculo inscrito. */
function esquinas(m: Mueble, s: Mm, inset: Mm): [Mm, Mm][] {
  const { ancho: A, fondo: F } = m.medidas
  if (m.forma === 'circular') return esquinasInscritas(A, s, inset)
  return [
    [inset, inset],
    [A - inset - s, inset],
    [inset, F - inset - s],
    [A - inset - s, F - inset - s],
  ]
}

/**
 * Estructura metálica: cuatro postes, niveles de travesaños y la repisa que se
 * apoye en ellos. Con el tubo de colgar es un burro de ropa; sin repisa, un
 * bastidor a secas.
 */
export function armarMetal(m: Mueble): ParteMueble[] {
  const { ancho: A, alto: H, fondo: F } = m.medidas
  const t = m.tablero.grosor
  const s = m.metal.seccion
  const circular = m.forma === 'circular'
  const nNiveles = Math.max(2, num(m, 'niveles', 5))
  const tipoRepisa = texto(m, 'repisa', 'tablero')
  const partes: ParteMueble[] = []
  // En planta circular los postes se meten del borde para que la repisa
  // redonda los cubra; en rectangular van a ras.
  const esq = esquinas(m, s, circular ? 40 : 0)
  const [x0, z0] = esq[0]
  const x1 = esq[1][0]
  const z1 = esq[2][1]
  const anchoLibre = x1 - x0 - s
  const fondoLibre = z1 - z0 - s

  for (const [i, [px, pz]] of esq.entries()) {
    partes.push(
      tuboParte(m, {
        id: `poste.${i + 1}`,
        rol: 'poste',
        clave: 'muebles.pieza.poste',
        nombreEs: 'Poste',
        x: px,
        y: 0,
        z: pz,
        dx: s,
        dy: H,
        dz: s,
      }),
    )
  }

  // Los niveles se reparten en el alto; el más bajo va a 80 mm del suelo.
  const alturas = repartir(80, H - s, nNiveles, s)
  for (const [i, y] of alturas.entries()) {
    for (const [j, pz] of ([z0, z1] as Mm[]).entries()) {
      partes.push(
        tuboParte(m, {
          id: `travesano.${i + 1}.${j + 1}`,
          rol: 'travesano-metal',
          clave: 'muebles.pieza.travesanoMetal',
          nombreEs: 'Travesaño',
          x: x0 + s,
          y,
          z: pz,
          dx: anchoLibre,
          dy: s,
          dz: s,
        }),
      )
    }
    for (const [j, px] of ([x0, x1] as Mm[]).entries()) {
      partes.push(
        tuboParte(m, {
          id: `larguero.${i + 1}.${j + 1}`,
          rol: 'travesano-metal',
          clave: 'muebles.pieza.larguero',
          nombreEs: 'Larguero',
          x: px,
          y,
          z: z0 + s,
          dx: s,
          dy: s,
          dz: fondoLibre,
        }),
      )
    }
    // La repisa rectangular va entre los postes; la redonda es un disco del
    // diámetro del mueble que se apoya encima de ellos.
    const repisa = circular
      ? { x: 0, z: 0, dx: A, dz: A, disco: true }
      : { x: x0 + s, z: z0 + s, dx: anchoLibre, dz: fondoLibre, disco: false }
    if (tipoRepisa === 'tablero') {
      partes.push(
        panel(m, {
          id: `repisa.${i + 1}`,
          rol: 'repisa',
          clave: 'muebles.pieza.repisa',
          nombreEs: 'Repisa',
          x: repisa.x,
          y: y + s,
          z: repisa.z,
          dx: repisa.dx,
          dy: t,
          dz: repisa.dz,
          eje: 'y',
          veta: 'ancho',
          cantos: { arriba: true, abajo: true, izq: true, der: true },
          disco: repisa.disco,
        }),
      )
    } else if (tipoRepisa === 'rejilla') {
      // La rejilla se compra hecha: se pinta y se cotiza, no se despieza.
      partes.push({
        id: `rejilla.${i + 1}`,
        rol: 'repisa',
        clave: 'muebles.pieza.rejilla',
        nombreEs: 'Rejilla',
        x: repisa.x,
        y: y + s,
        z: repisa.z,
        dx: repisa.dx,
        dy: 6,
        dz: repisa.dz,
        hechoDe: 'accesorio',
        color: tono(m.metal.color, 0.12),
        soloVisual: true,
        disco: repisa.disco,
        herrajes: [herraje('her-rejilla', 'muebles.her.rejilla', 'Rejilla metálica', 1)],
      })
    }
  }

  if (bool(m, 'barra', false)) {
    partes.push(
      tuboColgar(m, { id: 'tubo.ropa', x: x0 + s, y: H - 120, z: F / 2, largo: anchoLibre }),
    )
  }

  if (bool(m, 'refuerzoX', false)) {
    const largo = Math.round(Math.hypot(anchoLibre, H - 160))
    for (const [i, giro] of ([1, -1] as number[]).entries()) {
      partes.push({
        ...tuboParte(m, {
          id: `refuerzo.${i + 1}`,
          rol: 'refuerzo',
          clave: 'muebles.pieza.refuerzo',
          nombreEs: 'Refuerzo en diagonal',
          // Se coloca por su CENTRO: `rot` gira la pieza alrededor de su punto
          // medio, así que apoyarla en la esquina la mandaba fuera del mueble.
          x: Math.round((A - largo) / 2),
          y: Math.round((H - s) / 2),
          z: z0,
          dx: largo,
          dy: s,
          dz: s,
        }),
        rot: [0, 0, giro * Math.atan2(H - 160, anchoLibre)],
      })
    }
  }

  if (bool(m, 'ruedas', false)) {
    partes.push({
      id: 'ruedas',
      rol: 'pata-metal',
      clave: 'muebles.pieza.ruedas',
      nombreEs: 'Ruedas',
      x: 0,
      y: 0,
      z: 0,
      dx: 0,
      dy: 0,
      dz: 0,
      hechoDe: 'accesorio',
      color: m.metal.color,
      soloVisual: true,
      herrajes: [herraje('her-rodaja', 'muebles.her.rodaja', 'Rodaja con freno', 4)],
    })
  }
  return partes
}

export function armarMesa(m: Mueble): ParteMueble[] {
  const { ancho: A, alto: H, fondo: F } = m.medidas
  const t = m.tablero.grosor
  const circular = m.forma === 'circular'
  const voladizo = num(m, 'voladizo', 60)
  const tipoPatas = texto(m, 'patas', 'tubo')
  const altoPata = H - t
  const partes: ParteMueble[] = [
    panel(m, {
      id: 'cubierta',
      rol: 'cubierta',
      clave: 'muebles.pieza.cubierta',
      nombreEs: 'Cubierta',
      x: 0,
      y: H - t,
      z: 0,
      dx: A,
      dy: t,
      dz: F,
      eje: 'y',
      veta: 'ancho',
      cantos: { arriba: true, abajo: true, izq: true, der: true },
      disco: circular,
    }),
  ]

  if (tipoPatas === 'tablero' && circular) {
    // Una mesa redonda de tablero se sostiene en una cruz, no en dos costados.
    partes.push(
      ...cruzCentral(m, {
        diametro: A,
        y: 0,
        alto: altoPata,
        inset: voladizo,
        clave: 'muebles.pieza.lateralMesa',
        nombreEs: 'Costado',
      }),
    )
  } else if (tipoPatas === 'tablero') {
    for (const [i, lado] of (['izq', 'der'] as const).entries()) {
      partes.push(
        panel(m, {
          id: `lateral.${i + 1}`,
          rol: 'lateral',
          clave: 'muebles.pieza.lateralMesa',
          nombreEs: 'Costado',
          x: lado === 'izq' ? voladizo : A - voladizo - t,
          y: 0,
          z: voladizo,
          dx: t,
          dy: altoPata,
          dz: F - 2 * voladizo,
          eje: 'x',
          veta: 'alto',
          cantos: { der: true, izq: true },
        }),
      )
    }
  } else {
    const s = m.metal.seccion
    const caballete = tipoPatas === 'caballete'
    const esq = esquinas(m, s, voladizo)
    for (const [i, [px, pz]] of esq.entries()) {
      partes.push({
        ...tuboParte(m, {
          id: `pata.${i + 1}`,
          rol: 'pata-metal',
          clave: 'muebles.pieza.pataTubo',
          nombreEs: 'Pata',
          x: px,
          y: 0,
          z: pz,
          dx: s,
          dy: altoPata,
          dz: s,
        }),
        // El caballete abre las patas hacia fuera: puro render, el tubo se
        // corta del mismo largo (por eso no toca `dy`).
        rot: caballete ? [0, 0, (px < A / 2 ? -1 : 1) * 0.12] : undefined,
      })
    }
    // Travesaños que amarran las patas por pares.
    for (const [i, pz] of ([esq[0][1], esq[2][1]] as Mm[]).entries()) {
      partes.push(
        tuboParte(m, {
          id: `travesano.${i + 1}`,
          rol: 'travesano-metal',
          clave: 'muebles.pieza.travesanoMetal',
          nombreEs: 'Travesaño',
          x: esq[0][0] + s,
          y: altoPata - 120,
          z: pz,
          dx: esq[1][0] - esq[0][0] - s,
          dy: s,
          dz: s,
        }),
      )
    }
  }

  // Un faldón recto no le va a una cubierta redonda (y el chip no se enseña).
  if (!circular && bool(m, 'faldon', false)) {
    partes.push(
      panel(m, {
        id: 'faldon',
        rol: 'faldon',
        clave: 'muebles.pieza.faldon',
        nombreEs: 'Faldón',
        x: voladizo,
        y: altoPata - 120,
        z: F - voladizo - t,
        dx: A - 2 * voladizo,
        dy: 120,
        dz: t,
        eje: 'z',
        veta: 'ancho',
        cantos: { abajo: true, izq: true, der: true },
        color: tono(m.tablero.color, -0.04),
      }),
    )
  }

  if (bool(m, 'entrepano', false)) {
    partes.push(
      panel(m, {
        id: 'entrepano.1',
        rol: 'entrepano',
        clave: 'muebles.pieza.entrepano',
        nombreEs: 'Entrepaño',
        x: voladizo,
        y: Math.round(altoPata * 0.3),
        z: voladizo,
        dx: A - 2 * voladizo,
        dy: t,
        dz: F - 2 * voladizo,
        eje: 'y',
        veta: 'ancho',
        cantos: { arriba: true, abajo: true, izq: true, der: true },
        disco: circular,
      }),
    )
  }
  return partes
}

/**
 * Silla: asiento, respaldo y patas de tubo o costados de tablero. El alto de la
 * receta es el TOTAL (con respaldo) y el asiento es un parámetro: si el
 * respaldo que queda no da ni 150 mm, sale un banco.
 */
export function armarSilla(m: Mueble): ParteMueble[] {
  const { ancho: A, alto: H, fondo: F } = m.medidas
  const t = m.tablero.grosor
  const s = m.metal.seccion
  const circular = m.forma === 'circular'
  const conTubo = texto(m, 'patas', 'tubo') !== 'tablero'
  const hAsiento = Math.min(num(m, 'alturaAsiento', 450), H)
  const altoRespaldo = H - hAsiento
  // Con costados de tablero y planta redonda la base es una cruz, que no tiene
  // dónde sujetar un respaldo: sale un banco redondo.
  const conRespaldo = altoRespaldo >= 150 && (conTubo || !circular)
  const conBrazos = conTubo && bool(m, 'brazos', false)
  const partes: ParteMueble[] = []
  // Con patas de tubo el asiento va por fuera de ellas; con costados de
  // tablero, entre ellos (los costados hacen de pata y de estructura).
  const ins = conTubo || circular ? 0 : t
  const esq = esquinas(m, s, circular ? 20 : 0)

  partes.push(
    panel(m, {
      id: 'asiento',
      rol: 'asiento',
      clave: 'muebles.pieza.asiento',
      nombreEs: 'Asiento',
      x: ins,
      y: hAsiento - t,
      z: 0,
      dx: A - 2 * ins,
      dy: t,
      dz: F,
      eje: 'y',
      veta: 'ancho',
      cantos: { arriba: true, abajo: true, izq: true, der: true },
      disco: circular,
    }),
  )

  if (conRespaldo) {
    // Entre las patas traseras (tubo) o entre los costados (tablero).
    const x = conTubo ? esq[0][0] + s : t
    const dx = conTubo ? esq[1][0] - esq[0][0] - s : A - 2 * t
    partes.push(
      panel(m, {
        id: 'respaldo',
        rol: 'respaldo',
        clave: 'muebles.pieza.respaldo',
        nombreEs: 'Respaldo',
        x,
        y: hAsiento + (conTubo ? 60 : 0),
        z: conTubo ? esq[0][1] + s : 0,
        dx,
        dy: altoRespaldo - (conTubo ? 80 : 30),
        dz: t,
        eje: 'z',
        veta: 'ancho',
        cantos: { arriba: true, abajo: true, izq: true, der: true },
        color: tono(m.tablero.color, -0.04),
      }),
    )
  }

  if (conTubo) {
    // Las patas traseras siguen hasta arriba y hacen de bastidor del respaldo;
    // las delanteras solo suben si la silla lleva descansabrazos.
    for (const [i, [px, pz]] of esq.entries()) {
      const atras = i < 2
      const alto = atras && conRespaldo ? H : conBrazos ? hAsiento + ALTO_BRAZO : hAsiento - t
      partes.push(
        tuboParte(m, {
          id: `pata.${i + 1}`,
          rol: 'pata-metal',
          clave: 'muebles.pieza.pataTubo',
          nombreEs: 'Pata',
          x: px,
          y: 0,
          z: pz,
          dx: s,
          dy: alto,
          dz: s,
          herrajes: [herraje('her-nivelador', 'muebles.her.nivelador', 'Nivelador', 1)],
        }),
      )
    }

    if (bool(m, 'travesanos', true)) {
      // Un aro de travesaños a 150 mm del suelo amarra las cuatro patas.
      for (const [i, pz] of ([esq[0][1], esq[2][1]] as Mm[]).entries()) {
        partes.push(
          tuboParte(m, {
            id: `travesano.${i + 1}`,
            rol: 'travesano-metal',
            clave: 'muebles.pieza.travesanoMetal',
            nombreEs: 'Travesaño',
            x: esq[0][0] + s,
            y: 150,
            z: pz,
            dx: esq[1][0] - esq[0][0] - s,
            dy: s,
            dz: s,
          }),
        )
      }
      for (const [i, px] of ([esq[0][0], esq[1][0]] as Mm[]).entries()) {
        partes.push(
          tuboParte(m, {
            id: `larguero.${i + 1}`,
            rol: 'travesano-metal',
            clave: 'muebles.pieza.larguero',
            nombreEs: 'Larguero',
            x: px,
            y: 150,
            z: esq[0][1] + s,
            dx: s,
            dy: s,
            dz: esq[2][1] - esq[0][1] - s,
          }),
        )
      }
    }

    if (conBrazos) {
      for (const [i, px] of ([esq[0][0], esq[1][0]] as Mm[]).entries()) {
        partes.push(
          tuboParte(m, {
            id: `brazo.${i + 1}`,
            rol: 'brazo',
            clave: 'muebles.pieza.brazo',
            nombreEs: 'Descansabrazos',
            x: px,
            y: hAsiento + ALTO_BRAZO - s,
            z: esq[0][1],
            dx: s,
            dy: s,
            dz: esq[2][1] + s - esq[0][1],
          }),
        )
      }
    }
    return partes
  }

  if (circular) {
    partes.push(
      ...cruzCentral(m, {
        diametro: A,
        y: 0,
        alto: hAsiento - t,
        inset: 30,
        clave: 'muebles.pieza.lateralMesa',
        nombreEs: 'Costado',
      }),
    )
    return partes
  }

  // Costados de tablero: llegan hasta arriba cuando hay respaldo, para que
  // tenga dónde apoyarse.
  for (const [i, lado] of (['izq', 'der'] as const).entries()) {
    partes.push(
      panel(m, {
        id: `lateral.${i + 1}`,
        rol: 'lateral',
        clave: 'muebles.pieza.lateralMesa',
        nombreEs: 'Costado',
        x: lado === 'izq' ? 0 : A - t,
        y: 0,
        z: 0,
        dx: t,
        dy: conRespaldo ? H : hAsiento - t,
        dz: F,
        eje: 'x',
        veta: 'alto',
        cantos: { der: true, izq: true },
      }),
    )
  }
  partes.push(
    panel(m, {
      id: 'travesano.1',
      rol: 'travesano',
      clave: 'muebles.pieza.travesano',
      nombreEs: 'Travesaño',
      x: t,
      y: Math.max(0, hAsiento - t - 140),
      z: F - t,
      dx: A - 2 * t,
      dy: 120,
      dz: t,
      eje: 'z',
      veta: 'ancho',
      cantos: { abajo: true },
      color: tono(m.tablero.color, -0.04),
    }),
  )
  return partes
}
