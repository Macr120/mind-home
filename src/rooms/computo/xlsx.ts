/**
 * Escritor de .xlsx en OOXML, a mano.
 *
 * ESTE ARCHIVO Y `motor.ts` SON LOS ÚNICOS QUE PUEDEN NOMBRAR LIBRERÍAS PESADAS,
 * y solo con `import()`: `fflate` entra al pulsar Exportar, no al arrancar.
 *
 * Trampas que deciden si Excel abre el archivo o dice «contenido ilegible»:
 *
 * - Hay que ESCAPAR el XML también DENTRO de `<f>`: `=SI(A1<B1,1,0)` rompe el
 *   documento sin eso, y es el fallo número uno de los escritores caseros.
 * - Las filas y las celdas van en orden ascendente, y las vacías se omiten.
 * - Los nombres de función van en INGLÉS canónico con coma de separador, pase lo
 *   que pase: Excel los vuelve a mostrar en el idioma del usuario.
 * - Se escribe `<f>` Y el `<v>` ya calculado. Con `fullCalcOnLoad` bastaría el
 *   primero para Excel y LibreOffice, pero los previsualizadores estrictos
 *   quieren el valor.
 * - El texto va como `t="inlineStr"`, lo que ahorra el `sharedStrings.xml` entero.
 */
import { A_OOXML } from './funcionesHoja'
import { esc, nombreHoja } from './ooxml'
import {
  chartXml,
  drawingXml,
  OVERRIDE_CHART,
  OVERRIDE_DIBUJO,
  relsDibujo,
  relsHoja,
  type GraficaXlsx,
} from './xlsxChart'

export interface CeldaXlsx {
  /** Referencia A1. */
  ref: string
  /** Fórmula del usuario SIN el `=` (ya en español), si la celda es fórmula. */
  formula?: string
  /** Valor ya calculado. */
  valor?: number | string
  negrita?: boolean
}

export interface HojaXlsx {
  nombre: string
  celdas: CeldaXlsx[]
  /** Gráficas nativas de esta hoja. Sin ellas no se emite ni dibujo ni charts. */
  graficas?: GraficaXlsx[]
}

/** Traduce los nombres de función al canónico de OOXML. */
export function formulaOoxml(formula: string): string {
  let salida = formula
  // Los de punto primero: `CONTAR.SI` contiene `CONTAR`, y al revés se rompería.
  for (const es of Object.keys(A_OOXML).sort((a, b) => b.length - a.length)) {
    salida = salida.replace(new RegExp(`\\b${es.replace('.', '\\.')}\\s*\\(`, 'g'), `${A_OOXML[es]}(`)
  }
  return salida.replace(/;/g, ',')
}

const filaDe = (ref: string) => Number(/\d+/.exec(ref)?.[0] ?? 1)
const colDe = (ref: string) => {
  const letras = /^[A-Z]+/.exec(ref)?.[0] ?? 'A'
  let n = 0
  for (const c of letras) n = n * 26 + (c.charCodeAt(0) - 64)
  return n
}

function celdaXml(c: CeldaXlsx): string {
  const estilo = c.negrita ? ' s="1"' : ''
  if (c.formula) {
    const cache = typeof c.valor === 'number' && Number.isFinite(c.valor) ? `<v>${c.valor}</v>` : ''
    return `<c r="${c.ref}"${estilo}><f>${esc(formulaOoxml(c.formula))}</f>${cache}</c>`
  }
  if (typeof c.valor === 'number' && Number.isFinite(c.valor)) {
    return `<c r="${c.ref}"${estilo}><v>${c.valor}</v></c>`
  }
  const texto = c.valor == null ? '' : String(c.valor)
  if (texto === '') return ''
  return `<c r="${c.ref}"${estilo} t="inlineStr"><is><t xml:space="preserve">${esc(texto)}</t></is></c>`
}

function sheetXml(hoja: HojaXlsx, conDibujo: boolean): string {
  const porFila = new Map<number, CeldaXlsx[]>()
  for (const c of hoja.celdas) {
    const f = filaDe(c.ref)
    porFila.set(f, [...(porFila.get(f) ?? []), c])
  }
  const filas = [...porFila.keys()].sort((a, b) => a - b)
  const cuerpo = filas
    .map((f) => {
      const celdas = porFila
        .get(f)!
        .sort((a, b) => colDe(a.ref) - colDe(b.ref))
        .map(celdaXml)
        .join('')
      return celdas ? `<row r="${f}">${celdas}</row>` : ''
    })
    .join('')
  // `<drawing>` va DESPUÉS de `</sheetData>` (los hijos de `worksheet` son una
  // secuencia estricta) y obliga a declarar `xmlns:r` en la raíz.
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetData>${cuerpo}</sheetData>${
    conDibujo ? '<drawing r:id="rId1"/>' : ''
  }</worksheet>`
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`

const RELS_RAIZ = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`

/** Construye el .xlsx completo. */
export async function construirXlsx(hojas: HojaXlsx[]): Promise<Blob> {
  const { zipSync, strToU8 } = await import('fflate')
  const utiles: HojaXlsx[] = hojas.length > 0 ? hojas : [{ nombre: 'Hoja1', celdas: [] }]
  // El nombre saneado se calcula UNA vez: el libro y los `<c:f>` de las gráficas
  // tienen que nombrar la hoja exactamente igual.
  const nombres = utiles.map((h, i) => nombreHoja(h.nombre, i))

  // Solo las hojas con gráficas generan dibujo. Los charts se numeran con un
  // contador global para que dos hojas no escriban el mismo `chart1.xml`.
  let nChart = 0
  const conGrafica = utiles.flatMap((h, i) => {
    const gs = h.graficas ?? []
    return gs.length === 0 ? [] : [{ hoja: i, dibujo: i + 1, charts: gs.map(() => ++nChart), gs }]
  })

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${utiles
    .map((_, i) => `<sheet name="${esc(nombres[i])}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
    .join('')}</sheets>
<calcPr calcId="0" fullCalcOnLoad="1"/></workbook>`

  const relsLibro = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${utiles
    .map(
      (_, i) =>
        `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
    )
    .join('')}<Relationship Id="rId${utiles.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`

  const tipos = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
${utiles
  .map(
    (_, i) =>
      `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
  )
  .join('')}
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${conGrafica.map((p) => OVERRIDE_DIBUJO(p.dibujo)).join('')}
${conGrafica.flatMap((p) => p.charts).map(OVERRIDE_CHART).join('')}
</Types>`

  const archivos: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(tipos),
    '_rels/.rels': strToU8(RELS_RAIZ),
    'xl/workbook.xml': strToU8(workbook),
    'xl/_rels/workbook.xml.rels': strToU8(relsLibro),
    'xl/styles.xml': strToU8(STYLES),
  }
  utiles.forEach((h, i) => {
    archivos[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(sheetXml(h, conGrafica.some((p) => p.hoja === i)))
  })
  for (const p of conGrafica) {
    archivos[`xl/worksheets/_rels/sheet${p.hoja + 1}.xml.rels`] = strToU8(relsHoja(p.dibujo))
    archivos[`xl/drawings/drawing${p.dibujo}.xml`] = strToU8(drawingXml(p.gs))
    archivos[`xl/drawings/_rels/drawing${p.dibujo}.xml.rels`] = strToU8(relsDibujo(p.charts))
    p.charts.forEach((n, k) => {
      archivos[`xl/charts/chart${n}.xml`] = strToU8(chartXml(p.gs[k], nombres[p.hoja]))
    })
  }

  const zip = zipSync(archivos, { level: 6 })
  return new Blob([zip as unknown as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}
