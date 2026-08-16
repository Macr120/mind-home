/**
 * Extracción de texto de un PDF en el cliente: el respaldo para proveedores sin
 * PDF nativo (ChatGPT, DeepSeek, Ollama) — ver `pdfNativo()` en ia.ts. pdfjs se
 * importa dinámico (como mathjs/katex): jamás debe entrar al bundle de arranque.
 */

const MAX_PAGINAS = 30
// LIMITES.texto del proxy es 10 000 chars por mensaje: 8 000 dejan sitio al texto del usuario.
const MAX_CHARS = 8_000

/** Devuelve el texto del PDF (base64). Lanza si no hay texto extraíble (escaneado). */
export async function extraerTextoPdf(base64: string): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  const tarea = pdfjs.getDocument({ data: bytes })
  const doc = await tarea.promise
  try {
    let texto = ''
    for (let n = 1; n <= Math.min(doc.numPages, MAX_PAGINAS) && texto.length < MAX_CHARS; n++) {
      const contenido = await (await doc.getPage(n)).getTextContent()
      texto += `\n[Página ${n}] ` + contenido.items.map((i) => ('str' in i ? i.str : '')).join(' ')
    }
    const limpio = texto.trim()
    if (!limpio) throw new Error('PDF sin texto extraíble')
    return limpio.length > MAX_CHARS ? `${limpio.slice(0, MAX_CHARS)}… [truncado]` : limpio
  } finally {
    void tarea.destroy()
  }
}
