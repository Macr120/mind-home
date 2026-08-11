/**
 * Gráficas NATIVAS de Excel (DrawingML charts) escritas a mano.
 *
 * La gráfica no lleva los datos pegados: cada serie apunta con un `<c:f>` a su
 * rango de la hoja, así que dentro de Excel sigue viva (se edita un número y se
 * mueve la barra). Las cachés `numCache`/`strCache` son el retrato del momento
 * de exportar, para que la miniatura del Explorador y Excel Online pinten algo
 * antes de recalcular.
 *
 * El esquema de OOXML es una SECUENCIA estricta: aquí el orden de los elementos
 * no es estilo, es la diferencia entre abrir el archivo y que Excel diga que
 * necesita repararlo. Lo que más cuesta recordar:
 *
 * - `c:idx` y `c:order` van SIEMPRE primero dentro de `<c:ser>`.
 * - Los dos `<c:axId>` van al final del grupo y cruzados con los `crossAx` de
 *   los ejes.
 * - El pastel NO lleva ejes ni `c:axId`; la dispersión lleva DOS `valAx`.
 * - `<c:delete/>` sin `val` BORRA el eje (los booleanos de OOXML valen `true`
 *   por defecto), así que se escribe siempre `val="0"`.
 * - Nada de `schemeClr`: este libro no tiene `theme1.xml`, solo `srgbClr`.
 */
import { esc, refHoja } from './ooxml'
import type { TipoGraficaHoja } from '../../core/data/db'

export interface SerieXlsx {
  nombre: string
  /** Celda A1 del rótulo ('B1'), si sale de una cabecera de la hoja. */
  refNombre?: string
  /** Rango A1 de los valores ('B2:B7'). */
  rango: string
  valores: (number | null)[]
  /** Hex SIN almohadilla y en mayúsculas: '38BDF8'. */
  color: string
}

export interface GraficaXlsx {
  tipo: TipoGraficaHoja
  titulo?: string
  /** Rango A1 de las categorías; sin él, Excel numera 1..n. */
  rangoCat?: string
  etiquetas: string[]
  /** Las categorías como números (solo la dispersión las usa). */
  valoresCat: (number | null)[]
  series: SerieXlsx[]
  /** Colores de cada rebanada del pastel. */
  colores: string[]
  /** Rectángulo de celdas donde se coloca, 0-based y con el fin exclusivo. */
  ancla: { col: number; fila: number; colFin: number; filaFin: number }
}

const NS_C = 'http://schemas.openxmlformats.org/drawingml/2006/chart'
const NS_A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const NS_XDR = 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing'
const NS_REL = 'http://schemas.openxmlformats.org/package/2006/relationships'

/** Los dos ejes de un chart. Cada gráfica es su propio archivo: no hay colisión. */
const EJE_CAT = 111111111
const EJE_VAL = 222222222

const CABECERA = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'

export const OVERRIDE_DIBUJO = (n: number) =>
  `<Override PartName="/xl/drawings/drawing${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`

export const OVERRIDE_CHART = (n: number) =>
  `<Override PartName="/xl/charts/chart${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`

/** La hoja apunta a su dibujo. */
export const relsHoja = (nDibujo: number) =>
  `${CABECERA}
<Relationships xmlns="${NS_REL}"><Relationship Id="rId1" Type="${NS_R}/drawing" Target="../drawings/drawing${nDibujo}.xml"/></Relationships>`

/** El dibujo apunta a cada una de sus gráficas, en el mismo orden. */
export const relsDibujo = (idsChart: number[]) =>
  `${CABECERA}
<Relationships xmlns="${NS_REL}">${idsChart
    .map((n, i) => `<Relationship Id="rId${i + 1}" Type="${NS_R}/chart" Target="../charts/chart${n}.xml"/>`)
    .join('')}</Relationships>`

/** Números vivos: el rango, y la foto de los valores al exportar. */
function numRef(f: string, valores: (number | null)[]): string {
  const puntos = valores
    .map((v, i) => (v == null || !Number.isFinite(v) ? '' : `<c:pt idx="${i}"><c:v>${v}</c:v></c:pt>`))
    .join('')
  return `<c:numRef><c:f>${f}</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${valores.length}"/>${puntos}</c:numCache></c:numRef>`
}

function strRef(f: string, textos: string[]): string {
  const puntos = textos.map((s, i) => `<c:pt idx="${i}"><c:v>${esc(s)}</c:v></c:pt>`).join('')
  return `<c:strRef><c:f>${f}</c:f><c:strCache><c:ptCount val="${textos.length}"/>${puntos}</c:strCache></c:strRef>`
}

const relleno = (color: string) => `<a:solidFill><a:srgbClr val="${color}"/></a:solidFill>`

const marcador = (color: string) =>
  `<c:marker><c:symbol val="circle"/><c:size val="5"/><c:spPr>${relleno(color)}<a:ln>${relleno(color)}</a:ln></c:spPr></c:marker>`

function serieXml(g: GraficaXlsx, s: SerieXlsx, i: number, hoja: string): string {
  const cabeza =
    `<c:idx val="${i}"/><c:order val="${i}"/>` +
    (s.refNombre
      ? `<c:tx>${strRef(refHoja(hoja, s.refNombre), [s.nombre])}</c:tx>`
      : `<c:tx><c:v>${esc(s.nombre)}</c:v></c:tx>`)
  const cat = g.rangoCat ? `<c:cat>${strRef(refHoja(hoja, g.rangoCat), g.etiquetas)}</c:cat>` : ''
  const val = `<c:val>${numRef(refHoja(hoja, s.rango), s.valores)}</c:val>`

  switch (g.tipo) {
    case 'barras':
      return `<c:ser>${cabeza}<c:spPr>${relleno(s.color)}<a:ln><a:noFill/></a:ln></c:spPr><c:invertIfNegative val="0"/>${cat}${val}</c:ser>`
    case 'lineas':
      return `<c:ser>${cabeza}<c:spPr><a:ln w="28575" cap="rnd">${relleno(s.color)}<a:round/></a:ln></c:spPr>${marcador(s.color)}${cat}${val}<c:smooth val="0"/></c:ser>`
    case 'area':
      // CT_AreaSer no admite marker ni smooth: colarlos aquí es reparación segura.
      return `<c:ser>${cabeza}<c:spPr><a:solidFill><a:srgbClr val="${s.color}"><a:alpha val="60000"/></a:srgbClr></a:solidFill><a:ln>${relleno(s.color)}</a:ln></c:spPr>${cat}${val}</c:ser>`
    case 'pastel': {
      // Una rebanada por dato, con su color explícito.
      const puntos = s.valores
        .map((_, k) => {
          const color = g.colores[k % g.colores.length]
          return `<c:dPt><c:idx val="${k}"/><c:bubble3D val="0"/><c:spPr>${relleno(color)}<a:ln w="19050"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:ln></c:spPr></c:dPt>`
        })
        .join('')
      return `<c:ser>${cabeza}${puntos}${cat}${val}</c:ser>`
    }
    case 'dispersion': {
      // Sin columna de X, `c:xVal` se OMITE: apuntarlo al propio rango de las Y
      // dibujaría la recta y = x, que es una gráfica falsa. Excel numera 1..n.
      const x = g.rangoCat ? `<c:xVal>${numRef(refHoja(hoja, g.rangoCat), g.valoresCat)}</c:xVal>` : ''
      return `<c:ser>${cabeza}<c:spPr><a:ln w="28575"><a:noFill/></a:ln></c:spPr>${marcador(
        s.color,
      )}${x}<c:yVal>${numRef(refHoja(hoja, s.rango), s.valores)}</c:yVal><c:smooth val="0"/></c:ser>`
    }
  }
}

/** El grupo de series: cada tipo tiene su elemento y sus obligaciones. */
function grupoXml(g: GraficaXlsx, hoja: string): string {
  const series = g.series.map((s, i) => serieXml(g, s, i, hoja)).join('')
  const ejes = `<c:axId val="${EJE_CAT}"/><c:axId val="${EJE_VAL}"/>`
  switch (g.tipo) {
    case 'barras':
      return `<c:barChart><c:barDir val="col"/><c:grouping val="clustered"/><c:varyColors val="0"/>${series}<c:gapWidth val="150"/><c:overlap val="-27"/>${ejes}</c:barChart>`
    case 'lineas':
      return `<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>${series}<c:marker val="1"/>${ejes}</c:lineChart>`
    case 'area':
      return `<c:areaChart><c:grouping val="standard"/><c:varyColors val="0"/>${series}${ejes}</c:areaChart>`
    case 'pastel':
      return `<c:pieChart><c:varyColors val="1"/>${series}<c:firstSliceAng val="0"/></c:pieChart>`
    case 'dispersion':
      return `<c:scatterChart><c:scatterStyle val="lineMarker"/><c:varyColors val="0"/>${series}${ejes}</c:scatterChart>`
  }
}

const ejeValores = (id: number, cruza: number, pos: 'b' | 'l', entre: 'between' | 'midCat') =>
  `<c:valAx><c:axId val="${id}"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="${pos}"/>${
    pos === 'l' ? '<c:majorGridlines/>' : ''
  }<c:numFmt formatCode="General" sourceLinked="1"/><c:majorTickMark val="out"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:crossAx val="${cruza}"/><c:crosses val="autoZero"/><c:crossBetween val="${entre}"/></c:valAx>`

const ejeCategorias = () =>
  `<c:catAx><c:axId val="${EJE_CAT}"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:numFmt formatCode="General" sourceLinked="1"/><c:majorTickMark val="out"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:crossAx val="${EJE_VAL}"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="0"/></c:catAx>`

function ejesXml(tipo: TipoGraficaHoja): string {
  if (tipo === 'pastel') return ''
  if (tipo === 'dispersion') {
    return ejeValores(EJE_CAT, EJE_VAL, 'b', 'midCat') + ejeValores(EJE_VAL, EJE_CAT, 'l', 'midCat')
  }
  return ejeCategorias() + ejeValores(EJE_VAL, EJE_CAT, 'l', 'between')
}

/** Un `xl/charts/chartN.xml` completo. */
export function chartXml(g: GraficaXlsx, hoja: string): string {
  const titulo = g.titulo
    ? `<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="1200"/></a:pPr><a:r><a:t>${esc(
        g.titulo,
      )}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title><c:autoTitleDeleted val="0"/>`
    : '<c:autoTitleDeleted val="1"/>'
  // La leyenda solo estorba cuando hay una sola serie con nombre de columna.
  const leyenda =
    g.tipo === 'pastel' || g.series.length > 1
      ? '<c:legend><c:legendPos val="b"/><c:overlay val="0"/></c:legend>'
      : ''
  return `${CABECERA}
<c:chartSpace xmlns:c="${NS_C}" xmlns:a="${NS_A}" xmlns:r="${NS_R}"><c:roundedCorners val="0"/><c:chart>${titulo}<c:plotArea><c:layout/>${grupoXml(
    g,
    hoja,
  )}${ejesXml(g.tipo)}</c:plotArea>${leyenda}<c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart></c:chartSpace>`
}

/**
 * El `xl/drawings/drawingN.xml`: dónde se planta cada gráfica.
 *
 * `twoCellAnchor` expresa la posición en CELDAS, que es lo que ya sabemos, sin
 * aritmética de EMU; y `editAs="oneCell"` hace que la gráfica se mueva con las
 * filas pero no se deforme al ensanchar una columna.
 */
export function drawingXml(graficas: GraficaXlsx[]): string {
  const anclas = graficas
    .map((g, i) => {
      const a = g.ancla
      return `<xdr:twoCellAnchor editAs="oneCell"><xdr:from><xdr:col>${a.col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${
        a.fila
      }</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>${a.colFin}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${
        a.filaFin
      }</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${
        i + 2
      }" name="${esc(g.titulo || `Gráfico ${i + 1}`)}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="${NS_C}"><c:chart xmlns:c="${NS_C}" xmlns:r="${NS_R}" r:id="rId${
        i + 1
      }"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>`
    })
    .join('')
  return `${CABECERA}
<xdr:wsDr xmlns:xdr="${NS_XDR}" xmlns:a="${NS_A}" xmlns:r="${NS_R}">${anclas}</xdr:wsDr>`
}
