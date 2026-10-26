/**
 * La nube de ejemplo de la demo (cuarto Archivo): unas pocas carpetas poco
 * profundas, archivos con la fecha delante (AAAA-MM-DD) y bytes REALES que el
 * visor sabe enseñar sin R2: fotos de la propia demo (`public/demo/*.webp`, pasadas
 * a JPEG), PDFs de una página dibujados aquí (texto en canvas → JPEG → PDF), notas
 * de texto y una melodía WAV sintetizada.
 *
 * Los bytes viajan en la propia fila (`blob`, campo que solo existe en la demo): el
 * visor y la descarga los usan antes que la `clave` de R2 (ver `Abrible`). `tut`
 * es el ancla estable de cada elemento para el script de grabación
 * (`data-tut="archivos.item.<tut>"`). Las fechas son relativas al día de la demo.
 */
import type { ArchivoNube, CarpetaArchivo } from '../../core/data/db'
import { archivosNubeRepo, carpetasArchivoRepo } from '../../core/data/repository'
import { enIdioma } from '../../core/i18n/porIdioma'
import { conMontos } from '../../core/moneda'
import type { CtxDemo } from '../../demo/builders'
import { textoDemo } from '../../demo/textosDemo'
import { TEXTOS_ARCHIVO_DEMO, type CarpetaDemo, type PdfDemo, type TextoDemo } from './demo.data'

/** Ancho y alto de la página A4 dibujada (2× los puntos del PDF: 595 × 842). */
const PAG_W = 1190
const PAG_H = 1684
const FUENTE = 'system-ui, "Segoe UI", "Noto Sans", "Noto Sans JP", "Noto Sans SC", "Noto Sans KR", "Noto Sans Devanagari", "Noto Sans Arabic", sans-serif'

const lienzo = (w: number, h: number) => {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

const aBlob = (c: HTMLCanvasElement, tipo = 'image/jpeg', calidad = 0.86) =>
  new Promise<Blob>((ok, mal) => c.toBlob((b) => (b ? ok(b) : mal(new Error('canvas'))), tipo, calidad))

/** Parte un texto en renglones que caben en `ancho` (por palabras; sin espacios, por letras). */
function envolver(g: CanvasRenderingContext2D, texto: string, ancho: number): string[] {
  const piezas = texto.includes(' ') ? texto.split(' ') : [...texto]
  const sep = texto.includes(' ') ? ' ' : ''
  const r: string[] = []
  let linea = ''
  for (const p of piezas) {
    const prueba = linea ? linea + sep + p : p
    if (linea && g.measureText(prueba).width > ancho) {
      r.push(linea)
      linea = p
    } else linea = prueba
  }
  if (linea) r.push(linea)
  return r
}

/**
 * Una página de documento: banda de color con el título, subtítulo y renglones.
 * `nota` = papel amarillo de libreta (para la miniatura de los .txt).
 */
function pintarPagina(lineas: string[], color: string, rtl: boolean, nota = false): HTMLCanvasElement {
  const c = lienzo(PAG_W, PAG_H)
  const g = c.getContext('2d')!
  const margen = 96
  const x = rtl ? PAG_W - margen : margen
  const ancho = PAG_W - margen * 2
  g.direction = rtl ? 'rtl' : 'ltr'
  g.textAlign = rtl ? 'right' : 'left'
  g.textBaseline = 'alphabetic'
  g.fillStyle = nota ? '#fff8d6' : '#ffffff'
  g.fillRect(0, 0, PAG_W, PAG_H)
  const [titulo = '', sub = '', ...resto] = lineas
  let y: number
  if (nota) {
    // Libreta: renglones azules y margen rojo.
    g.strokeStyle = '#c9d8ef'
    g.lineWidth = 2
    for (let ry = 210; ry < PAG_H; ry += 64) {
      g.beginPath()
      g.moveTo(0, ry)
      g.lineTo(PAG_W, ry)
      g.stroke()
    }
    g.strokeStyle = '#f2a1a1'
    g.beginPath()
    g.moveTo(rtl ? PAG_W - 72 : 72, 0)
    g.lineTo(rtl ? PAG_W - 72 : 72, PAG_H)
    g.stroke()
    g.fillStyle = '#1f2937'
    g.font = `700 54px ${FUENTE}`
    g.fillText(titulo, x, 180)
    y = 270
    g.font = `400 38px ${FUENTE}`
    for (const l of [sub, ...resto].filter((l, i) => i > 0 || l)) {
      for (const r of envolver(g, l, ancho)) {
        g.fillText(r, x, y)
        y += 64
      }
    }
    return c
  }
  g.fillStyle = color
  g.fillRect(0, 0, PAG_W, 220)
  g.fillStyle = '#ffffff'
  g.font = `700 64px ${FUENTE}`
  g.fillText(envolver(g, titulo, ancho)[0] ?? '', x, 140)
  g.fillStyle = '#6b7280'
  g.font = `500 38px ${FUENTE}`
  g.fillText(sub, x, 310)
  g.fillStyle = color
  g.fillRect(margen, 350, ancho, 4)
  y = 450
  g.font = `400 40px ${FUENTE}`
  for (const l of resto) {
    for (const r of envolver(g, l, ancho)) {
      g.fillStyle = '#111827'
      g.fillText(r, x, y)
      y += 58
    }
    g.fillStyle = '#e5e7eb'
    g.fillRect(margen, y - 26, ancho, 2)
    y += 34
  }
  // Párrafos de relleno (barras grises): la página parece un documento de verdad.
  g.fillStyle = '#eef0f3'
  for (let i = 0; i < 9 && y < PAG_H - 200; i++, y += 46) g.fillRect(margen, y, ancho * (i % 3 === 2 ? 0.6 : 1), 20)
  g.fillStyle = color
  g.fillRect(0, PAG_H - 24, PAG_W, 24)
  return c
}

/** La parte de arriba de una página, reducida: la miniatura de la cuadrícula. */
async function miniaturaDePagina(c: HTMLCanvasElement): Promise<Blob> {
  const m = lienzo(320, 200)
  m.getContext('2d')!.drawImage(c, 0, 0, PAG_W, PAG_W * 0.625, 0, 0, 320, 200)
  return aBlob(m, 'image/jpeg', 0.8)
}

/** Un PDF de una página que es la imagen JPEG dada (filtro DCTDecode: sin librerías). */
async function pdfDeJpeg(jpeg: Blob, w: number, h: number): Promise<Blob> {
  const img = new Uint8Array(await jpeg.arrayBuffer())
  const enc = new TextEncoder()
  const partes: Uint8Array[] = []
  const pos: number[] = []
  let n = 0
  const poner = (p: string | Uint8Array) => {
    const b = typeof p === 'string' ? enc.encode(p) : p
    partes.push(b)
    n += b.length
  }
  const obj = (id: number, cuerpo: string) => {
    pos[id] = n
    poner(`${id} 0 obj\n${cuerpo}\nendobj\n`)
  }
  poner('%PDF-1.4\n')
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>')
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
  obj(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>')
  pos[4] = n
  poner(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.length} >>\nstream\n`)
  poner(img)
  poner('\nendstream\nendobj\n')
  const dibujo = 'q 595 0 0 842 0 0 cm /Im0 Do Q'
  obj(5, `<< /Length ${dibujo.length} >>\nstream\n${dibujo}\nendstream`)
  const xref = n
  const filas = [1, 2, 3, 4, 5].map((i) => `${String(pos[i]).padStart(10, '0')} 00000 n \n`).join('')
  poner(`xref\n0 6\n0000000000 65535 f \n${filas}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`)
  return new Blob(partes as BlobPart[], { type: 'application/pdf' })
}

/** Foto de la demo → JPEG (lado mayor 1600) y su miniatura; `borrosa` la desenfoca (la de la Papelera). */
async function fotoJpeg(fuente: Blob, borrosa = false): Promise<{ blob: Blob; miniatura: Blob }> {
  const bmp = await createImageBitmap(fuente)
  const escala = (lado: number) => Math.min(1, lado / Math.max(bmp.width, bmp.height))
  const pintar = (lado: number) => {
    const e = escala(lado)
    const c = lienzo(Math.round(bmp.width * e), Math.round(bmp.height * e))
    const g = c.getContext('2d')!
    if (borrosa) g.filter = `blur(${Math.max(2, Math.round(c.width / 90))}px)`
    g.drawImage(bmp, 0, 0, c.width, c.height)
    return c
  }
  const blob = await aBlob(pintar(1600), 'image/jpeg', 0.86)
  const miniatura = await aBlob(pintar(320), 'image/jpeg', 0.8)
  bmp.close()
  return { blob, miniatura }
}

/** Una melodía corta de piano (sinusoides con armónicos y caída), WAV de 16 bits. */
function melodiaWav(): Blob {
  const sr = 22050
  // [nota MIDI, duración en tiempos]; un tiempo = 0.42 s.
  const notas: [number, number][] = [
    [60, 1], [64, 1], [67, 1], [72, 2], [71, 1], [67, 1], [69, 2],
    [65, 1], [69, 1], [72, 1], [71, 1], [67, 1], [64, 1], [60, 3],
  ]
  const tiempo = 0.42
  const total = notas.reduce((s, [, d]) => s + d, 0) * tiempo + 1.5
  const muestras = new Float32Array(Math.ceil(total * sr))
  let t0 = 0
  for (const [midi, d] of notas) {
    const f = 440 * 2 ** ((midi - 69) / 12)
    const ini = Math.floor(t0 * sr)
    const largo = Math.floor(1.6 * sr)
    for (let i = 0; i < largo && ini + i < muestras.length; i++) {
      const t = i / sr
      const env = Math.min(1, t * 200) * Math.exp(-3 * t)
      muestras[ini + i] += env * (0.6 * Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(4 * Math.PI * f * t) + 0.1 * Math.sin(6 * Math.PI * f * t))
    }
    t0 += d * tiempo
  }
  const datos = muestras.length * 2
  const b = new DataView(new ArrayBuffer(44 + datos))
  const txt = (o: number, s: string) => [...s].forEach((ch, i) => b.setUint8(o + i, ch.charCodeAt(0)))
  txt(0, 'RIFF')
  b.setUint32(4, 36 + datos, true)
  txt(8, 'WAVE')
  txt(12, 'fmt ')
  b.setUint32(16, 16, true)
  b.setUint16(20, 1, true)
  b.setUint16(22, 1, true)
  b.setUint32(24, sr, true)
  b.setUint32(28, sr * 2, true)
  b.setUint16(32, 2, true)
  b.setUint16(34, 16, true)
  txt(36, 'data')
  b.setUint32(40, datos, true)
  for (let i = 0; i < muestras.length; i++) b.setInt16(44 + i * 2, Math.max(-1, Math.min(1, muestras[i] * 0.5)) * 0x7fff, true)
  return new Blob([b.buffer], { type: 'audio/wav' })
}

/** Fila de la demo: la de siempre más sus bytes locales y su ancla de grabación. */
type ArchivoDemo = Omit<ArchivoNube, 'id'> & { blob: Blob; tut: string }
type CarpetaDemoFila = Omit<CarpetaArchivo, 'id'> & { tut: string }

/** Colores de la banda de cada PDF (por tema, no por idioma). */
const COLOR_PDF: Record<PdfDemo, string> = {
  metas: '#7c3aed',
  turnos: '#d97706',
  proyecto: '#2563eb',
  contrato: '#0f766e',
  presupuesto: '#ea580c',
  pasaporte: '#1e3a8a',
  luz: '#ca8a04',
  internet: '#0891b2',
  analisis: '#dc2626',
}

export async function construirDemoArchivos(ctx: CtxDemo): Promise<void> {
  const tx = enIdioma(TEXTOS_ARCHIVO_DEMO, ctx.idioma)
  const rtl = ctx.idioma === 'ar'
  /** Mediodía local del día `off`, en ISO (las filas guardan instantes). */
  const cuando = (off: number) => new Date(`${ctx.fecha(off)}T12:00:00`).toISOString()
  const dia = (off: number) => ctx.fecha(off)
  const mes = (off: number) => ctx.fecha(off).slice(0, 7)

  // ── Carpetas ────────────────────────────────────────────────────────────────
  const ids = {} as Record<CarpetaDemo, number>
  const carpeta = async (clave: CarpetaDemo, padre: CarpetaDemo | null, off: number, destacado?: boolean) => {
    const fila: CarpetaDemoFila = {
      nombre: tx.carpetas[clave].replace('{anio}', ctx.hoy.slice(0, 4)),
      padreId: padre ? ids[padre] : null,
      creadoEn: cuando(off),
      destacado: destacado || undefined,
      tut: clave,
    }
    ids[clave] = await carpetasArchivoRepo.add(fila)
  }
  await carpeta('trabajo', null, -330)
  await carpeta('casa', null, -330, true)
  await carpeta('recibos', 'casa', -290)
  await carpeta('salud', null, -320)
  await carpeta('proyectos', null, -300)
  await carpeta('fotos', null, -330)
  await carpeta('japon', 'fotos', -197)

  // ── Archivos ────────────────────────────────────────────────────────────────
  const filas: ArchivoDemo[] = []
  const poner = (
    tut: string,
    nombre: string,
    carpetaId: CarpetaDemo | null,
    off: number,
    blob: Blob,
    miniatura: Blob | undefined,
    extra: { destacado?: boolean; borradoEn?: number } = {},
  ) =>
    filas.push({
      nombre,
      carpetaId: carpetaId ? ids[carpetaId] : null,
      clave: `demo/${tut}`,
      bytes: blob.size,
      mime: blob.type,
      miniatura,
      creadoEn: cuando(off),
      destacado: extra.destacado || undefined,
      borradoEn: extra.borradoEn != null ? cuando(extra.borradoEn) : undefined,
      blob,
      tut,
    })

  const lab = textoDemo(ctx.idioma, 'ag.labSur')
  const pdf = async (clave: PdfDemo) => {
    const lineas = tx.pdf[clave].map((l) => conMontos(l.replace('{lab}', lab)))
    const pagina = pintarPagina(lineas, COLOR_PDF[clave], rtl)
    const jpeg = await aBlob(pagina, 'image/jpeg', 0.82)
    return { blob: await pdfDeJpeg(jpeg, PAG_W, PAG_H), miniatura: await miniaturaDePagina(pagina) }
  }
  const nota = async (clave: TextoDemo) => {
    const lineas = tx.textos[clave]
    const blob = new Blob([lineas.join('\n') + '\n'], { type: 'text/plain;charset=utf-8' })
    return { blob, miniatura: await miniaturaDePagina(pintarPagina(lineas, '', rtl, true)) }
  }
  const foto = async (clave: string, borrosa = false) => {
    const f = await ctx.foto(clave)
    return f ? fotoJpeg(f, borrosa) : null
  }

  const n = tx.nombres
  const conPdf = async (tut: PdfDemo, nombre: string, donde: CarpetaDemo | null, off: number, extra?: { destacado?: boolean; borradoEn?: number }) => {
    const p = await pdf(tut)
    poner(tut, `${nombre}.pdf`, donde, off, p.blob, p.miniatura, extra)
  }
  const conNota = async (tut: TextoDemo, nombre: string, donde: CarpetaDemo | null, off: number, extra?: { destacado?: boolean }) => {
    const p = await nota(tut)
    poner(tut, `${nombre}.txt`, donde, off, p.blob, p.miniatura, extra)
  }
  const conFoto = async (tut: string, clave: string, nombre: string, donde: CarpetaDemo | null, off: number, extra?: { borradoEn?: number }) => {
    const p = await foto(clave, tut === 'borrosa')
    if (p) poner(tut, `${nombre}.jpg`, donde, off, p.blob, p.miniatura, extra)
  }

  // Sueltos en Mi Archivo.
  await conNota('pendientes', n.pendientes, null, -1, { destacado: true })
  await conPdf('metas', `${dia(-24)} ${n.metas}`, null, -24)
  // Trabajo.
  await conPdf('turnos', `${mes(-4)} ${n.turnos}`, 'trabajo', -4)
  await conPdf('proyecto', `${dia(-7)} ${n.proyecto}`, 'trabajo', -7)
  // Casa y trámites (+ Recibos del año).
  await conPdf('contrato', `${dia(-225)} ${n.contrato}`, 'casa', -225)
  await conPdf('presupuesto', `${mes(-27)} ${n.presupuesto}`, 'casa', -27)
  await conPdf('pasaporte', n.pasaporte, 'casa', -200)
  await conPdf('luz', `${mes(-55)} ${n.luz}`, 'recibos', -55)
  await conPdf('internet', `${mes(-20)} ${n.internet}`, 'recibos', -20)
  // Salud.
  await conPdf('analisis', `${dia(-176)} ${n.analisis}`, 'salud', -176, { destacado: true })
  await conNota('cardiologo', `${dia(-15)} ${n.cardiologo}`, 'salud', -15)
  // Proyectos.
  await conNota('jardin', n.jardin, 'proyectos', -3)
  const wav = melodiaWav()
  poner('melodia', `${dia(-13)} ${n.melodia}.wav`, 'proyectos', -13, wav, undefined)
  // Fotos (+ el viaje a Japón).
  await conFoto('laika', 'anecdotario/laika', `${dia(-2)} ${textoDemo(ctx.idioma, 'casa.laika.nombre')}`, 'fotos', -2)
  await conFoto('ramen', 'cocina/ramen-casero', `${dia(-6)} ${n.ramen}`, 'fotos', -6)
  await conFoto('oaxaca', 'sala/mexico-oaxaca', `${dia(-97)} ${textoDemo(ctx.idioma, 'sala.lugar.oaxaca')}`, 'fotos', -97)
  await conFoto('fuji', 'sala/japon-fuji', `${dia(-196)} ${n.fuji}`, 'japon', -196)
  await conFoto('bambu', 'sala/japon-kioto-bambu', `${dia(-192)} ${n.bambu}`, 'japon', -192)
  await conFoto('nara', 'sala/japon-nara', `${dia(-190)} ${n.nara}`, 'japon', -190)
  await conFoto('osaka', 'sala/japon-osaka-noche', `${dia(-189)} ${n.osaka}`, 'japon', -189)
  // Papelera: dos cosas tiradas hace poco.
  await conPdf('luz', `${mes(-55)} ${n.luzDuplicado}`, 'recibos', -55, { borradoEn: -2 })
  filas[filas.length - 1].tut = 'luzDuplicado'
  filas[filas.length - 1].clave = 'demo/luzDuplicado'
  await conFoto('borrosa', 'sala/japon-shibuya', `${dia(-189)} ${n.borrosa}`, 'fotos', -189, { borradoEn: -1 })

  for (const f of filas) await archivosNubeRepo.add(f)
}
