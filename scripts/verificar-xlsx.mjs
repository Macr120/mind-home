/**
 * Valida un .xlsx sin abrir Excel.
 *
 *   node scripts/verificar-xlsx.mjs ruta\al\archivo.xlsx
 *   node scripts/verificar-xlsx.mjs --fixture      genera uno con las 5 gráficas y lo valida
 *
 * Excel no explica por qué «necesita reparar» un archivo: dice que hay contenido
 * ilegible y borra lo que no entiende. Esto revisa a mano lo que él comprueba en
 * silencio — content types, relaciones, orden de los elementos y escapado — para
 * que un fallo del escritor OOXML salga aquí y no en la máquina del usuario.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { strFromU8, unzipSync } from 'fflate'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const TIPO_DIBUJO = 'application/vnd.openxmlformats-officedocument.drawing+xml'
const TIPO_CHART = 'application/vnd.openxmlformats-officedocument.drawingml.chart+xml'

const problemas = []
const fallo = (parte, texto) => problemas.push(`${parte}: ${texto}`)

// ─── Validaciones ───────────────────────────────────────────────────────────

function validar(buffer) {
  const zip = unzipSync(new Uint8Array(buffer))
  const partes = Object.fromEntries(Object.entries(zip).map(([k, v]) => [k, strFromU8(v)]))
  const nombres = Object.keys(partes)

  const tipos = partes['[Content_Types].xml']
  if (!tipos) return fallo('[Content_Types].xml', 'no existe (Excel ni siquiera lo intenta)')

  // 1. Toda parte .xml declarada, y con el content type EXACTO.
  for (const n of nombres) {
    if (n.endsWith('.rels') || !n.endsWith('.xml') || n === '[Content_Types].xml') continue
    if (!tipos.includes(`PartName="/${n}"`)) fallo(n, 'sin <Override> en [Content_Types].xml')
  }
  for (const n of nombres.filter((x) => /^xl\/drawings\/drawing\d+\.xml$/.test(x))) {
    if (!tipos.includes(`PartName="/${n}" ContentType="${TIPO_DIBUJO}"`)) fallo(n, 'content type del dibujo incorrecto')
  }
  for (const n of nombres.filter((x) => /^xl\/charts\/chart\d+\.xml$/.test(x))) {
    if (!tipos.includes(`PartName="/${n}" ContentType="${TIPO_CHART}"`)) fallo(n, 'content type del chart incorrecto')
  }

  // 2. Cada r:id usado tiene su Relationship, y cada Target existe.
  for (const n of nombres) {
    if (n.endsWith('.rels') || !n.endsWith('.xml')) continue
    const rels = partes[path.posix.join(path.posix.dirname(n), '_rels', `${path.posix.basename(n)}.rels`)]
    const usados = [...partes[n].matchAll(/r:id="(rId\d+)"/g)].map((m) => m[1])
    for (const id of new Set(usados)) {
      if (!rels || !rels.includes(`Id="${id}"`)) fallo(n, `usa ${id} y no está en su .rels`)
    }
    if (!rels) continue
    for (const m of rels.matchAll(/Target="([^"]+)"/g)) {
      const destino = path.posix.normalize(path.posix.join(path.posix.dirname(n), m[1]))
      if (!partes[destino]) fallo(n, `relación rota hacia ${destino}`)
    }
  }

  // 3. Escapado: el fallo número uno de los escritores caseros.
  for (const n of nombres) {
    if (!n.endsWith('.xml') && !n.endsWith('.rels')) continue
    const suelto = partes[n].match(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/)
    if (suelto) fallo(n, `un & sin escapar cerca de «${contexto(partes[n], suelto.index)}»`)
  }

  // 4. La hoja: el <drawing> va después de </sheetData> y con xmlns:r declarado.
  for (const n of nombres.filter((x) => /^xl\/worksheets\/sheet\d+\.xml$/.test(x))) {
    const xml = partes[n]
    if (!xml.includes('<drawing ')) continue
    if (!xml.includes('xmlns:r=')) fallo(n, 'usa <drawing r:id> sin declarar xmlns:r en <worksheet>')
    if (xml.indexOf('<drawing ') < xml.indexOf('</sheetData>')) fallo(n, '<drawing> antes de </sheetData>')
  }

  // 5. Los charts: orden de la secuencia y ejes cruzados.
  for (const n of nombres.filter((x) => /^xl\/charts\/chart\d+\.xml$/.test(x))) validarChart(n, partes[n])

  // 6. Los dibujos: lo que el esquema exige en cada anclaje.
  for (const n of nombres.filter((x) => /^xl\/drawings\/drawing\d+\.xml$/.test(x))) {
    const xml = partes[n]
    const anclas = xml.split('<xdr:twoCellAnchor').length - 1
    if (anclas === 0) fallo(n, 'un dibujo sin ningún anclaje')
    if ((xml.split('<xdr:clientData/>').length - 1) !== anclas) fallo(n, 'falta <xdr:clientData/> en algún anclaje')
    if ((xml.split('<xdr:xfrm>').length - 1) !== anclas) fallo(n, 'falta <xdr:xfrm> en algún graphicFrame')
    const ids = [...xml.matchAll(/<xdr:cNvPr id="(\d+)"/g)].map((m) => Number(m[1]))
    if (ids.some((x) => x < 1)) fallo(n, 'un cNvPr con id 0')
    if (new Set(ids).size !== ids.length) fallo(n, 'dos cNvPr con el mismo id')
    for (const m of xml.matchAll(/<xdr:from>([\s\S]*?)<\/xdr:from>|<xdr:to>([\s\S]*?)<\/xdr:to>/g)) {
      const cuerpo = m[1] ?? m[2]
      for (const hijo of ['col', 'colOff', 'row', 'rowOff']) {
        if (!cuerpo.includes(`<xdr:${hijo}>`)) fallo(n, `un anclaje sin <xdr:${hijo}>`)
      }
    }
  }
}

function validarChart(n, xml) {
  const grupos = ['barChart', 'lineChart', 'areaChart', 'pieChart', 'scatterChart'].filter((g) =>
    xml.includes(`<c:${g}>`),
  )
  if (grupos.length !== 1) return fallo(n, `esperaba un grupo de series y hay ${grupos.length}`)
  const grupo = grupos[0]

  if (xml.indexOf('<c:layout/>') > xml.indexOf(`<c:${grupo}>`)) fallo(n, '<c:layout/> después del grupo de series')
  for (const ser of xml.split('<c:ser>').slice(1)) {
    if (!ser.startsWith('<c:idx val=')) fallo(n, '<c:ser> que no empieza por <c:idx>')
    else if (!/^<c:idx val="\d+"\/><c:order val="\d+"\/>/.test(ser)) fallo(n, '<c:order> no va justo tras <c:idx>')
  }

  // Obligatorios propios de cada tipo.
  const exige = {
    barChart: ['<c:barDir val='],
    lineChart: ['<c:grouping val='],
    areaChart: ['<c:grouping val='],
    scatterChart: ['<c:scatterStyle val='],
    pieChart: [],
  }[grupo]
  for (const e of exige) if (!xml.includes(e)) fallo(n, `un ${grupo} sin ${e}…>`)

  // Elementos prestados entre tipos: el área no admite marker ni smooth.
  if (grupo === 'areaChart' && (xml.includes('<c:smooth') || xml.includes('<c:marker'))) {
    fallo(n, 'un areaChart con marker/smooth (CT_AreaSer no los admite)')
  }
  if (grupo === 'scatterChart' && (!xml.includes('<c:xVal>') || !xml.includes('<c:yVal>'))) {
    fallo(n, 'una dispersión sin xVal/yVal')
  }

  // Ejes: el pastel no lleva; el resto los lleva cruzados.
  const delEjes = [...xml.matchAll(/<c:(catAx|valAx)><c:axId val="(\d+)"/g)]
  if (grupo === 'pieChart') {
    if (delEjes.length > 0 || xml.includes('<c:axId')) fallo(n, 'un pastel con ejes (Excel lo repara)')
  } else {
    const delGrupo = [...xml.matchAll(/<c:axId val="(\d+)"\/>/g)].map((m) => m[1])
    const ids = delEjes.map((m) => m[2])
    if (ids.length !== 2) fallo(n, `esperaba 2 ejes y hay ${ids.length}`)
    if (new Set(delGrupo.slice(0, 2)).size !== 2) fallo(n, 'los dos <c:axId> del grupo son el mismo')
    for (const id of ids) if (!delGrupo.includes(id)) fallo(n, `el eje ${id} no está declarado en el grupo`)
    // Cada eje tiene que cruzarse con el OTRO: apuntar a un axId que no existe
    // deja la gráfica vacía, y apuntarse a sí mismo la repara.
    for (const m of xml.matchAll(/<c:axId val="(\d+)"\/><c:scaling>[\s\S]*?<c:crossAx val="(\d+)"\/>/g)) {
      if (m[1] === m[2]) fallo(n, `el eje ${m[1]} se cruza consigo mismo`)
      else if (!ids.includes(m[2])) fallo(n, `el eje ${m[1]} se cruza con ${m[2]}, que no es ningún eje`)
    }
    if (grupo === 'scatterChart' && xml.includes('<c:catAx>')) fallo(n, 'una dispersión con catAx (van dos valAx)')
    if (!xml.includes('<c:delete val="0"/>')) fallo(n, 'un eje sin <c:delete val="0"/> (se borraría solo)')
  }

  // Cachés sanas: un texto o un NaN aquí pinta ceros o repara.
  for (const cache of xml.split('<c:numCache>').slice(1)) {
    const cuerpo = cache.split('</c:numCache>')[0]
    const total = Number(/<c:ptCount val="(\d+)"\/>/.exec(cuerpo)?.[1] ?? 0)
    for (const m of cuerpo.matchAll(/<c:pt idx="(\d+)"><c:v>([^<]*)<\/c:v>/g)) {
      if (Number(m[1]) >= total) fallo(n, `un punto idx=${m[1]} con ptCount=${total}`)
      if (!Number.isFinite(Number(m[2]))) fallo(n, `un numCache con «${m[2]}», que no es un número`)
    }
  }
}

const contexto = (texto, i) => texto.slice(Math.max(0, i - 20), i + 20).replace(/\s+/g, ' ')

/** Lo que Excel comprueba antes que nada: que el paquete OPC sea válido y el XML abra. */
function validarPaqueteOpc(ruta) {
  const guion = `
Add-Type -AssemblyName WindowsBase
$pkg = [System.IO.Packaging.Package]::Open('${ruta.replace(/'/g, "''")}', 'Open', 'Read')
try {
  foreach ($p in $pkg.GetParts()) {
    $sr = New-Object System.IO.StreamReader($p.GetStream())
    $txt = $sr.ReadToEnd(); $sr.Close()
    if ($p.ContentType -like '*xml*') {
      try { $null = [xml]$txt } catch {
        # El mensaje trae el documento entero pegado: se recorta o inunda la salida.
        $m = $_.Exception.Message -replace '\\s+', ' '
        if ($m.Length -gt 160) { $m = $m.Substring($m.Length - 160) }
        "$($p.Uri) XML MAL FORMADO: ...$m"
      }
    }
  }
} finally { $pkg.Close() }
`
  try {
    const salida = execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', guion], {
      encoding: 'utf8',
    }).trim()
    if (salida) for (const linea of salida.split(/\r?\n/)) fallo('OPC', linea)
  } catch (e) {
    fallo('OPC', `el paquete no abre como OPC: ${String(e.stderr || e.message).split(/\r?\n/)[0]}`)
  }
}

// ─── Fixture: una hoja con los cinco tipos y todos los casos venenosos ──────

async function fixture() {
  const { build } = await import('vite')
  const tmp = path.join(tmpdir(), 'mph-verificar-xlsx')
  mkdirSync(tmp, { recursive: true })
  const entrada = path.join(tmp, 'entrada.mjs')
  // Las rutas del proyecto se importan con extensión .ts: lo resuelve Vite.
  writeFileSync(
    entrada,
    [
      `export { construirXlsx } from ${JSON.stringify(path.join(RAIZ, 'src/rooms/computo/xlsx.ts'))}`,
      `export { datosDeGrafica } from ${JSON.stringify(path.join(RAIZ, 'src/rooms/computo/datosGrafica.ts'))}`,
      `export { recalcular } from ${JSON.stringify(path.join(RAIZ, 'src/rooms/computo/hoja.ts'))}`,
    ].join('\n'),
  )
  const r = await build({
    configFile: false,
    logLevel: 'error',
    // `noExternal` y `codeSplitting: false` empaquetan fflate DENTRO: el bundle
    // vive en el temporal del sistema y desde ahí no hay node_modules que valga.
    ssr: { noExternal: true },
    build: {
      write: false,
      ssr: true,
      target: 'node20',
      minify: false,
      lib: { entry: entrada, formats: ['es'], fileName: () => 'paquete' },
      rollupOptions: { output: { codeSplitting: false } },
    },
  })
  const salida = Array.isArray(r) ? r[0] : r
  const js = path.join(tmp, 'paquete.mjs')
  writeFileSync(js, salida.output[0].code)
  const { construirXlsx, datosDeGrafica, recalcular } = await import(pathToFileURL(js).href)

  // Casos venenosos a la vez: nombre de hoja con apóstrofo y `&`, etiquetas con
  // `&` y `<`, una fórmula con `<`, un hueco en medio y un texto entre números.
  const crudas = {
    A1: 'Mes', B1: 'Ingresos & más', C1: 'Gastos <netos>',
    A2: "Ene's", B2: '1200', C2: '=B2*0.4',
    A3: 'Feb', B3: '1345.5', C3: '=B3*0.4',
    A4: 'Mar', B4: '980', C4: '=SI(B4<1000,1,0)',
    A5: 'Abr', C5: '=B5*0.4',
    A6: 'May', B6: 'sin dato', C6: '=B6',
    A7: 'Jun', B7: '1710', C7: '=B7*0.4',
  }
  const celdas = Object.fromEntries(Object.entries(crudas).map(([k, v]) => [k, { crudo: v }]))
  const res = recalcular(celdas, motorFalso())

  const tipos = ['barras', 'lineas', 'area', 'pastel', 'dispersion']
  const graficas = tipos.map((tipo, i) => {
    const g = { id: `g${i}`, tipo, titulo: `Prueba & <${tipo}>`, rango: 'A1:C7', encabezadoFila: true, encabezadoCol: true }
    const d = datosDeGrafica(g, celdas, res)
    return {
      tipo: d.tipo,
      titulo: d.titulo,
      rangoCat: d.rangoCat,
      etiquetas: d.etiquetas,
      valoresCat: d.numerosCat,
      series: d.series.map((s) => ({ ...s, color: s.color.replace('#', '').toUpperCase() })),
      colores: ['38BDF8', 'F472B6', '4ADE80', 'FBBF24', 'A78BFA', 'FB7185'],
      ancla: { col: 4, fila: i * 16, colFin: 12, filaFin: i * 16 + 15 },
    }
  })

  const xlsxCeldas = Object.entries(crudas).map(([ref, crudo]) =>
    crudo.startsWith('=')
      ? { ref, formula: crudo.slice(1), valor: typeof res[ref]?.valor === 'number' ? res[ref].valor : undefined }
      : { ref, valor: Number.isFinite(Number(crudo)) && crudo.trim() !== '' ? Number(crudo) : crudo },
  )
  const blob = await construirXlsx([
    { nombre: "Ventas 'Q1' & Co con un nombre larguísimo", celdas: xlsxCeldas, graficas },
  ])
  const destino = path.join(tmp, 'fixture.xlsx')
  writeFileSync(destino, Buffer.from(await blob.arrayBuffer()))
  return destino
}

/** Un motor mínimo: solo hace falta evaluar las cuatro fórmulas del fixture. */
function motorFalso() {
  return {
    evaluar: (expr) => {
      try {
        return Function(`"use strict";const SI=(c,a,b)=>c?a:b;return (${expr})`)()
      } catch {
        return 0
      }
    },
  }
}

// ─── Entrada ────────────────────────────────────────────────────────────────

const arg = process.argv[2]
if (!arg) {
  console.error('Uso: node scripts/verificar-xlsx.mjs <archivo.xlsx> | --fixture')
  process.exit(2)
}
const ruta = arg === '--fixture' ? await fixture() : path.resolve(arg)
console.log(`Revisando ${ruta}`)
validar(readFileSync(ruta))
validarPaqueteOpc(ruta)

if (problemas.length === 0) {
  console.log('✔ El paquete está bien formado y las gráficas cumplen el esquema.')
} else {
  console.log(`✘ ${problemas.length} problema(s):`)
  for (const p of problemas) console.log(`  · ${p}`)
  process.exit(1)
}
