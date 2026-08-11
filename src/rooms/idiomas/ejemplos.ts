import { idiomasRepo, tarjetasIdiomaRepo, temasIdiomaRepo } from '../../core/data/repository'
import { fechaLocalISO, isoMasDias } from '../../core/fechaLocal'
import { idiomaActual } from '../../core/i18n/useT'
import { fotoEjemplo } from '../_shared/ejemplos/fotos'
import { porIdioma, yaMaterializado, type PaqueteEjemplo } from '../_shared/ejemplos/tipos'
import { TEXTOS_IDIOMAS } from './ejemplos.data'

/**
 * Ejemplo de fábrica de idiomas: un idioma en A2 con seis tarjetas repartidas
 * por las cajas de Leitner y dos temas del temario.
 *
 * El idioma que se estudia depende del que habla el usuario: con la app en
 * español el ejemplo aprende inglés, y al revés. Las tarjetas no están todas en
 * la misma caja a propósito: así se ve de un vistazo que unas vuelven mañana y
 * otras dentro de dos semanas, que es de lo que va el repaso espaciado.
 */

const ID = 'idiomas.vocabulario'

/** El idioma del ejemplo es siempre «el otro»: el que no habla la interfaz. */
const OBJETIVO = {
  es: { codigo: 'en-US', nombre: 'Inglés', bandera: '🇬🇧' },
  en: { codigo: 'es-ES', nombre: 'Spanish', bandera: '🇪🇸' },
}

/** Caja Leitner y cuándo vuelve cada tarjeta (negativo = vencida, toca repasarla). */
const TARJETAS: { n: 1 | 2 | 3 | 4 | 5 | 6; tipo: 'palabra' | 'frase' | 'expresion'; caja: number; proxima: number }[] =
  [
    { n: 1, tipo: 'palabra', caja: 3, proxima: 4 },
    { n: 2, tipo: 'palabra', caja: 1, proxima: -1 },
    { n: 3, tipo: 'palabra', caja: 2, proxima: 0 },
    { n: 4, tipo: 'expresion', caja: 0, proxima: -2 },
    { n: 5, tipo: 'palabra', caja: 5, proxima: 16 },
    { n: 6, tipo: 'frase', caja: 1, proxima: 1 },
  ]

export const ejemploIdiomas: PaqueteEjemplo = {
  id: ID,
  async materializar() {
    if (await yaMaterializado(ID, () => idiomasRepo.list())) return
    const T = porIdioma(TEXTOS_IDIOMAS)
    const lengua = OBJETIVO[idiomaActual()]
    const hoy = fechaLocalISO()
    const creado = `${isoMasDias(hoy, -21)}T10:00:00.000Z`

    const idiomaId = await idiomasRepo.add({ ...lengua, nivel: 'A2', creadoEn: creado, ejemploDe: ID })

    // Dos temas propios colgando del nivel A2 del temario. Van ANTES que las
    // tarjetas porque cada tarjeta nace ya clasificada en uno de ellos: el
    // vocabulario vive dentro del temario.
    const tema1 = `din-ej-${idiomaId}-1`
    const tema2 = `din-ej-${idiomaId}-2`
    await temasIdiomaRepo.add({
      temaId: tema1,
      idiomaId,
      nivel: 'A2',
      area: 'temas',
      padreId: null,
      titulo: T.tema1Titulo,
      descripcion: T.tema1Desc,
      creadoEn: creado,
      ejemploDe: ID,
    })
    await temasIdiomaRepo.add({
      temaId: tema2,
      idiomaId,
      nivel: 'A2',
      area: 'temas',
      padreId: null,
      titulo: T.tema2Titulo,
      descripcion: T.tema2Desc,
      creadoEn: creado,
      ejemploDe: ID,
    })

    const imagen = await fotoEjemplo('idiomas.tarjeta')
    for (const t of TARJETAS) {
      await tarjetasIdiomaRepo.add({
        idiomaId,
        termino: T[`termino${t.n}`],
        traduccion: T[`traduccion${t.n}`],
        ejemplo: T[`ejemplo${t.n}`],
        // La imagen mnemotécnica solo en una: es un extra, no la norma.
        imagen: t.n === 5 ? imagen : undefined,
        tipo: t.tipo,
        temaId: t.n <= 3 ? tema1 : tema2,
        nivel: 'A2',
        caja: t.caja,
        proximaISO: isoMasDias(hoy, t.proxima),
        ultimaISO: isoMasDias(hoy, -3),
        fuente: 'manual',
        creadoEn: creado,
        ejemploDe: ID,
      })
    }

  },
}
