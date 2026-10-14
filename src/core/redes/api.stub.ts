/**
 * Simulacro de `api.ts` para probar la UI sin cuentas ni consolas (solo DEV,
 * con `localStorage.mh.redesStub = '1'`). Mandos:
 *   mh.redesStub.cuentas  = 'youtube,facebook:2,instagram,tiktok'  (facebook:N = N Páginas)
 *   mh.redesStub.privado  = '1'  → el resultado sale privado por auditoría
 *   mh.redesStub.fallo    = '1'  → la publicación falla
 *   mh.redesStub.maxSeg   = '600' → tope de duración de TikTok
 *   mh.redesStub.ranuras  = '16' → varias cuentas por red; en `cuentas`, `youtube@3` = la de la ranura 3
 */
import type { OpcionesPublicacion, OpcionesPublicar, Retorno } from './api'
import { ErrorRedes, type CuentaRed, type EstadoRedes, type Plataforma, type ResultadoPublicacion } from './tipos'
import { useRedes } from './redesStore'

const LS = 'mh.redesStub.'
const leer = (clave: string) => localStorage.getItem(LS + clave) ?? ''

function cuentasStub(): CuentaRed[] {
  const lista = leer('cuentas').split(',').map((s) => s.trim()).filter(Boolean)
  const paginas = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ id: `${100 + i}`, nombre: `Página ${i + 1}`, avatar: null, instagram: i === 0 ? { id: '900', username: 'mph_demo' } : null }))
  return lista.map((item) => {
    const [conRanura, n] = item.split(':')
    const [plataforma, r] = conRanura.split('@') as [Plataforma, string | undefined]
    const ranura = Number(r ?? 0)
    const sufijo = ranura ? ` ${ranura + 1}` : ''
    const base = { ranura, cuenta_id: `stub-${plataforma}-${ranura}`, avatar: null, expira_en: null, estado: 'ok' as const, extra: {} }
    if (plataforma === 'facebook') return { ...base, plataforma, nombre: `Página${sufijo || ' 1'}`, extra: { page_id: `${100 + ranura}`, paginas: paginas(Number(n ?? 1)) } }
    if (plataforma === 'instagram') return { ...base, plataforma, nombre: `mph_demo${sufijo}`, extra: { page_id: `${100 + ranura}`, username: `mph_demo${ranura || ''}` } }
    return { ...base, plataforma, nombre: plataforma === 'youtube' ? `Canal demo${sufijo}` : `@mph_demo${sufijo}` }
  })
}

const espera = (ms: number, senal?: AbortSignal) =>
  new Promise<void>((resolver, rechazar) => {
    const id = window.setTimeout(resolver, ms)
    senal?.addEventListener('abort', () => {
      window.clearTimeout(id)
      rechazar(new ErrorRedes('cancelado', 'Cancelado.'))
    })
  })

const claveStub = (plataforma: Plataforma, ranura: number) => (ranura ? `${plataforma}@${ranura}` : plataforma)

export async function iniciarConexion(plataforma: Plataforma, _retorno: Retorno, ranura = 0): Promise<{ url: string }> {
  // «Conecta» sola al segundo y medio, como si el usuario volviera del proveedor.
  window.setTimeout(() => {
    const actuales = leer('cuentas').split(',').filter(Boolean)
    const clave = claveStub(plataforma, ranura)
    if (!actuales.some((c) => c.split(':')[0] === clave)) localStorage.setItem(LS + 'cuentas', [...actuales, clave].join(','))
    useRedes.getState().alVolver(true, plataforma, null)
  }, 1500)
  return { url: 'about:blank' }
}

export async function estadoRedes(): Promise<EstadoRedes> {
  await espera(200)
  return {
    cuentas: cuentasStub(),
    avisos: leer('privado') === '1' ? { youtube: 'privado', tiktok: 'solo-yo', meta: 'modo-desarrollo' } : {},
    youtube_restantes_hoy: 4,
    max_ranuras: Number(leer('ranuras') || 1),
  }
}

export async function elegirPagina(_plataforma: 'facebook' | 'instagram', _pageId: string, _ranura = 0): Promise<void> {
  await espera(200)
}

export async function desconectarRed(plataforma: Plataforma, ranura = 0): Promise<void> {
  const quitar = (plataforma === 'facebook' || plataforma === 'instagram' ? ['facebook', 'instagram'] : [plataforma]) as Plataforma[]
  localStorage.setItem(
    LS + 'cuentas',
    leer('cuentas')
      .split(',')
      .filter((c) => c && !quitar.some((q) => c.split(':')[0] === claveStub(q, ranura)))
      .join(','),
  )
  await espera(200)
}

export async function opcionesPublicacion(plataforma: Plataforma): Promise<OpcionesPublicacion> {
  await espera(600)
  const privado = leer('privado') === '1'
  if (plataforma === 'tiktok') {
    return {
      nickname: '@mph_demo',
      avatar: null,
      privacidad: privado ? ['SELF_ONLY'] : ['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'SELF_ONLY'],
      comentarios: true,
      duet: false,
      stitch: true,
      max_duracion_seg: Number(leer('maxSeg') || 600),
      auditado: !privado,
    }
  }
  if (plataforma === 'youtube') return { privacidad: ['public', 'unlisted', 'private'], auditado: !privado }
  if (plataforma === 'facebook') {
    const fb = cuentasStub().find((c) => c.plataforma === 'facebook')
    return { paginas: fb?.extra.paginas ?? [], page_id: fb?.extra.page_id ?? '', live: !privado }
  }
  return { requiere: { mime: 'video/mp4', aspecto: '9:16' }, username: 'mph_demo', live: !privado }
}

export async function publicar(o: OpcionesPublicar): Promise<ResultadoPublicacion> {
  for (let i = 1; i <= 20; i++) {
    await espera(150, o.senal)
    o.onProgreso?.(i / 20, 'subiendo')
  }
  o.onProgreso?.(1, 'procesando')
  await espera(1000, o.senal)
  if (leer('fallo') === '1') throw new ErrorRedes('proveedor', 'Cuota excedida (simulacro).')
  return { plataforma: o.plataforma, id: 'stub-1', url: 'https://example.com/stub', privado: leer('privado') === '1' }
}
