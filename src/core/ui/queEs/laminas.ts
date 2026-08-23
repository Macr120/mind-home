import type { CanalPago } from '../../plataforma'

/**
 * Las láminas del recorrido «¿Qué es Mind Planner Home?»: el contenido de la
 * web pública contado en OCHO pantallas, en el mismo orden que la página
 * (`web/index.html`) y con sus mismos textos, que llegan del catálogo ya
 * traducido a los 16 idiomas (`web/i18n/paginas/<id>.mjs`).
 *
 * Una lámina por SECCIÓN de la web, no una por tarjeta: el recorrido se lee de
 * un tirón y cada pantalla se desplaza si hace falta. Las preguntas frecuentes
 * caben en la última porque van plegadas, como en la web.
 *
 * Queda fuera la sección «Descargar la app»: dentro de la app no aplica, y en
 * las tiendas hablar de otras vías de descarga es justo lo que no se puede.
 *
 * Los emojis salen de aquí (son DATOS, van por `<Icono emoji>`) porque en la web
 * viven en el HTML, no en el catálogo de textos; los logos de las marcas de IA
 * están en `logos.tsx`.
 */

export interface Punto {
  /** Emoji del catálogo de iconos; se pinta con `<Icono emoji>`. */
  emoji?: string
  titulo?: string
  texto: string
  /** Tira de logos de marca que acompaña al punto (ver `logos.tsx`). */
  logos?: 'nube' | 'local'
  /** Letra chica bajo el punto (la nota de la vía local). */
  nota?: string
}

export interface Caja {
  nombre: string
  cifra?: string
  /** Rótulo pequeño junto a la cifra («pago único»). */
  nota?: string
  puntos: string[]
  cta: string
  /** Qué hace su botón: cerrar y volver al inicio de sesión, o entrar a probar. */
  accion: 'cuenta' | 'probar'
  pie?: string
}

export type Lamina =
  | {
      tipo: 'texto'
      id: string
      titulo?: string
      intro?: string
      puntos: Punto[]
      cifras?: { n: string; etiqueta: string }[]
      pie?: string
      /** Muchos puntos cortos: se pintan apretados y a dos columnas. */
      compacto?: boolean
    }
  | {
      tipo: 'precio'
      id: string
      titulo: string
      cajas: Caja[]
      /** La franja de la IA opcional, que en la web va bajo los planes. */
      extra?: { titulo: string; precios?: string; texto: string }
    }
  | { tipo: 'faq'; id: string; titulo: string; preguntas: { q: string; a: string }[] }

/**
 * Los valores del catálogo pueden traer HTML en línea (un enlace dentro de la
 * frase). Aquí se pinta TEXTO: las etiquetas se despojan —los enlaces a la web
 * no tendrían adónde llevar, y en las tiendas no pueden ni aparecer— y `<br>`
 * pasa a salto de línea real.
 */
export function sinHtml(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .trim()
}

/** Las nueve tarjetas de «Una casa, muchas apps», con el emoji del HTML. */
const TARJETAS: { clave: string; emoji: string }[] = [
  { clave: 'car.todo', emoji: '🧩' },
  { clave: 'car.nocaduca', emoji: '🎁' },
  { clave: 'car.nuevas', emoji: '🚀' },
  { clave: 'car.1', emoji: '🏠' },
  { clave: 'car.2', emoji: '✨' },
  { clave: 'car.3', emoji: '🔄' },
  { clave: 'car.4', emoji: '🎮' },
  { clave: 'car.5', emoji: '📅' },
  { clave: 'car.6', emoji: '🔒' },
]

/** Las cuatro capacidades de la IA. */
const CAPACIDADES: { clave: string; emoji: string }[] = [
  { clave: 'ia.cap.1', emoji: '💬' },
  { clave: 'ia.cap.2', emoji: '🗺️' },
  { clave: 'ia.cap.3', emoji: '🎨' },
  { clave: 'ia.cap.4', emoji: '🎤' },
]

/** Lo que trae la casa en cifras: los números viven en el HTML de la web. */
const CIFRAS: { n: string; clave: string }[] = [
  { n: '17', clave: 'cifras.apps' },
  { n: '5', clave: 'cifras.infra' },
  { n: '2', clave: 'cifras.ra' },
  { n: '1', clave: 'cifras.calendario' },
  { n: '1', clave: 'cifras.chat' },
]

export function construirLaminas(textos: Record<string, string>, canal: CanalPago): Lamina[] {
  const x = (clave: string): string => sinHtml(textos[clave] ?? '')
  const tarjeta = ({ clave, emoji }: { clave: string; emoji: string }): Punto => ({
    emoji,
    titulo: x(`${clave}.t`),
    texto: x(`${clave}.p`),
  })
  // En las tiendas la caja es la suya: ni cifras en dólares —cobran en moneda
  // local— ni el remate de la web sobre comprar fuera de la tienda.
  const enTienda = canal === 'iap'

  const laminas: Lamina[] = [
    // 1 ─── Portada: la frase de la web y lo que trae la casa, en cifras ───
    {
      tipo: 'texto',
      id: 'hero',
      titulo: x('hero.h1'),
      // La frase con los tres huecos que en la web rotan solos: aquí se fija la
      // primera terna, que es la que cuadra entera (cocina → nutrición → recetas).
      intro: [
        x('hero.sub.1'),
        x('hero.sub.ej1.1'),
        x('hero.sub.2'),
        x('hero.sub.ej2.1'),
        x('hero.sub.3'),
        x('hero.sub.ej3.1'),
        x('hero.sub.4'),
      ]
        .filter(Boolean)
        .join(' '),
      puntos: [],
      cifras: CIFRAS.map((c) => ({ n: c.n, etiqueta: x(c.clave) })),
      // La nota habla de comprar «aquí en la web»: fuera en las tiendas.
      pie: enTienda ? undefined : x('hero.nota'),
    },

    // 2 ─── Cómo funciona: los tres pasos, numerados como en la web ───
    {
      tipo: 'texto',
      id: 'como',
      titulo: x('como.h2'),
      intro: x('como.sub'),
      puntos: [1, 2, 3].map((n) => ({
        emoji: '🏠',
        titulo: `${n}. ${x(`como.${n}.t`)}`,
        texto: x(`como.${n}.p`),
      })),
    },

    // 3 ─── Una casa, muchas apps: las nueve tarjetas, apretadas ───
    {
      tipo: 'texto',
      id: 'apps',
      titulo: x('car.h2'),
      puntos: TARJETAS.map(tarjeta),
      compacto: true,
    },

    // 4 ─── Lo que hace la IA ───
    {
      tipo: 'texto',
      id: 'ia-caps',
      titulo: x('ia.h2'),
      intro: x('ia.sub'),
      puntos: CAPACIDADES.map(tarjeta),
      compacto: true,
    },

    // 5 ─── Y con quién: la nube que elijas o tu propia máquina ───
    {
      tipo: 'texto',
      id: 'ia-vias',
      puntos: [
        { emoji: '☁️', titulo: x('ia.nube.t'), texto: x('ia.nube.p'), logos: 'nube' },
        {
          emoji: '💻',
          titulo: x('ia.local.t'),
          texto: x('ia.local.p'),
          logos: 'local',
          nota: x('ia.local.nota'),
        },
      ],
    },

    // 6 ─── Manifiesto ───
    {
      tipo: 'texto',
      id: 'manifiesto',
      titulo: x('mani.h2'),
      puntos: [{ texto: x('mani.p1') }, { texto: x('mani.p2') }],
      pie: x('mani.cierre'),
    },

    // 7 ─── Precio: la lámina con los dos botones que cierran el recorrido ───
    {
      tipo: 'precio',
      id: 'precio',
      titulo: x('precio.h2'),
      cajas: [
        {
          nombre: x('precio.probar.nombre'),
          cifra: x('precio.probar.cifra'),
          puntos: [x('precio.probar.1'), x('precio.probar.2'), x('precio.probar.3')],
          cta: x('precio.probar.cta'),
          accion: 'probar',
          pie: x('precio.probar.pie'),
        },
        {
          nombre: x('precio.app.nombre'),
          cifra: enTienda ? undefined : x('precio.app.cifra'),
          nota: enTienda ? undefined : x('precio.app.pagoUnico'),
          puntos: [x('precio.app.1'), x('precio.app.2'), x('precio.app.3')],
          cta: x('precio.app.cta'),
          accion: 'cuenta',
          pie: enTienda ? undefined : x('precio.app.pie'),
        },
      ],
      extra: {
        titulo: x('ia.t'),
        // La línea de precios de la suscripción: fuera en las tiendas, que
        // cobran en su moneda y muestran su propia cifra al comprar.
        precios: enTienda ? undefined : x('ia.precios'),
        texto: x('ia.p'),
      },
    },

    // 8 ─── Preguntas frecuentes: todas en una pantalla, plegadas ───
    {
      tipo: 'faq',
      id: 'faq',
      titulo: x('faq.h2'),
      preguntas: preguntas(enTienda).map((n) => ({ q: x(`faq.${n}.q`), a: x(`faq.${n}.a`) })),
    },
  ]

  // Un catálogo a medio traducir dejaría láminas en blanco: se caen solas.
  return laminas.filter((l) =>
    l.tipo === 'texto' ? !!l.intro || l.puntos.some((p) => p.texto || p.titulo) : true,
  )
}

/**
 * Las ocho preguntas de la web, menos las que mandan a comprar fuera de la
 * tienda: dónde se compra la app (1), cuánto cuesta la IA —con sus cifras en
 * dólares y el «se paga aquí»— (3) y cómo se cancela (8). Sus respuestas viven
 * de todos modos dentro de la app: la compra y la gestión del plan están en
 * Configuraciones → Cuenta.
 */
function preguntas(enTienda: boolean): number[] {
  const todas = [1, 2, 3, 4, 5, 6, 7, 8]
  return enTienda ? todas.filter((n) => n !== 1 && n !== 3 && n !== 8) : todas
}
