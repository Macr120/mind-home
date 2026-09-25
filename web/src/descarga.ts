/**
 * La página de un archivo compartido (mindhaos.com/d/<token>). Pregunta a la
 * función `archivo-publico` por el enlace y enseña el estado que toca; los
 * textos ya vienen traducidos en el HTML, aquí solo se elige y se rellena.
 */

type Estado = 'cargando' | 'ok' | 'no-existe' | 'vencido' | 'tope' | 'error'

interface Respuesta {
  nombre?: string
  bytes?: number
  mime?: string
  vista?: string
  descarga?: string
  motivo?: string
}

function ver(estado: Estado): void {
  for (const s of document.querySelectorAll<HTMLElement>('[data-estado]')) s.hidden = s.dataset.estado !== estado
}

/** Como `formatoBytes` de la app, en el idioma de la página. */
function tamano(bytes: number): string {
  const unidades = ['B', 'KB', 'MB', 'GB']
  let v = bytes
  let i = 0
  while (v >= 1024 && i < unidades.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toLocaleString(document.documentElement.lang, { maximumFractionDigits: i ? 1 : 0 })} ${unidades[i]}`
}

/** La vista previa, si el navegador la sabe pintar. */
function vistaPrevia(r: Required<Pick<Respuesta, 'mime' | 'vista' | 'nombre'>>): HTMLElement | null {
  const { mime, vista, nombre } = r
  if (mime.startsWith('image/')) return Object.assign(document.createElement('img'), { src: vista, alt: nombre })
  if (mime.startsWith('video/')) return Object.assign(document.createElement('video'), { src: vista, controls: true, playsInline: true })
  if (mime.startsWith('audio/')) return Object.assign(document.createElement('audio'), { src: vista, controls: true })
  return null
}

async function cargar(): Promise<void> {
  const token = /\/d\/([\w-]{16,40})\/?$/.exec(location.pathname)?.[1]
  if (!token) return ver('no-existe')
  const reportar = document.getElementById('descarga-reportar') as HTMLAnchorElement | null
  if (reportar) reportar.href += `?subject=${encodeURIComponent(`Reporte de enlace ${token}`)}`

  let resp: Response
  try {
    resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/archivo-publico`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
  } catch {
    return ver('error')
  }
  const r = (await resp.json().catch(() => ({}))) as Respuesta
  if (!resp.ok || !r.nombre || !r.vista || !r.descarga) {
    const m = r.motivo
    return ver(m === 'no-existe' || m === 'vencido' || m === 'tope' ? m : 'error')
  }

  document.title = `${r.nombre} — MindHaOS`
  document.getElementById('descarga-nombre')!.textContent = r.nombre
  document.getElementById('descarga-tamano')!.textContent = tamano(r.bytes ?? 0)
  ;(document.getElementById('descarga-boton') as HTMLAnchorElement).href = r.descarga
  const vista = vistaPrevia({ mime: r.mime ?? '', vista: r.vista, nombre: r.nombre })
  if (vista) document.getElementById('descarga-vista')!.append(vista)
  ver('ok')
}

void cargar()
