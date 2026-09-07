import type { ClipVideo } from '../../core/data/db'
import { proyectosVideoRepo } from '../../core/data/repository'
import { porIdioma, retraducido, yaMaterializado, type PaqueteEjemplo } from '../_shared/ejemplos/tipos'
import { TEXTOS_VIDEO } from './ejemplos.data'

/**
 * Ejemplo de fábrica del Studio de video: doce segundos con cinco pistas vivas
 * —tres planos de color encadenados, dos rótulos, dos narraciones y un efecto—
 * para abrir el editor con la línea de tiempo puesta en vez de en blanco.
 *
 * No usa NINGÚN binario a propósito: los medios (`mediosVideo`) son locales, y
 * un ejemplo que dependiera de ellos aparecería roto en cuanto el proyecto
 * viajara por el sync. Colores, texto y los sonidos de fábrica (por clave)
 * suenan y se ven en cualquier dispositivo. Las narraciones nacen SIN voz
 * generada: el paso siguiente —darle a «Narrar»— queda a la vista.
 */

const ID = 'video.proyecto'

export const ejemploVideo: PaqueteEjemplo = {
  id: ID,
  async materializar() {
    if (await yaMaterializado(ID, () => proyectosVideoRepo.list())) return
    const T = porIdioma(TEXTOS_VIDEO)
    const ahora = new Date().toISOString()

    const clips: ClipVideo[] = [
      // Pista principal: tres planos de color, cada uno con su transición de entrada.
      { id: 'clp-ej-0', pista: 'video', inicio: 0, duracion: 4, fuente: { tipo: 'color', color: '#1e293b' }, filtro: 'ninguno', volumen: 0 },
      {
        id: 'clp-ej-1',
        pista: 'video',
        inicio: 4,
        duracion: 4,
        fuente: { tipo: 'color', color: '#6d28d9' },
        filtro: 'ninguno',
        volumen: 0,
        transicion: { tipo: 'disolver' },
      },
      {
        id: 'clp-ej-2',
        pista: 'video',
        inicio: 8,
        duracion: 4,
        fuente: { tipo: 'color', color: '#b45309' },
        filtro: 'ninguno',
        volumen: 0,
        transicion: { tipo: 'deslizar', direccion: 'izq' },
      },
      // Rótulos: el de entrada con subtítulo, el de cierre con caja.
      {
        id: 'clp-ej-3',
        pista: 'texto',
        inicio: 0.4,
        duracion: 3.2,
        texto: { contenido: T.titulo, subtitulo: T.subtitulo, posicion: 'centro', tamano: 'L', color: '#ffffff', animacion: 'fundido' },
      },
      {
        id: 'clp-ej-4',
        pista: 'texto',
        inicio: 8.4,
        duracion: 3.2,
        texto: { contenido: T.cierre, posicion: 'abajo', tamano: 'M', color: '#ffffff', caja: true, animacion: 'subir' },
      },
      // Narraciones sin audio: se oyen al generarles la voz desde su panel.
      { id: 'clp-ej-5', pista: 'voz', inicio: 0.5, duracion: 3, texto: T.narracion1, volumen: 1 },
      { id: 'clp-ej-6', pista: 'voz', inicio: 4.5, duracion: 3.2, texto: T.narracion2, volumen: 1 },
      // Efecto de la carpeta de fábrica: va por clave, así que suena en cualquier dispositivo.
      { id: 'clp-ej-7', pista: 'sfx', inicio: 4, duracion: 0.4, fuente: { tipo: 'fabrica', clave: 'click' }, volumen: 0.8 },
    ]

    await proyectosVideoRepo.add({
      nombre: T.proyecto,
      aspecto: '16:9',
      clips,
      escenas: [],
      creadoEn: ahora,
      actualizadoEn: ahora,
      ejemploDe: ID,
    })
  },

  async retraducir() {
    for (const p of await proyectosVideoRepo.list()) {
      if (p.ejemploDe !== ID || p.id == null) continue
      const nombre = retraducido(TEXTOS_VIDEO, p.nombre, 'proyecto')
      // Los clips viajan dentro de la fila: se reescribe el array entero, y
      // solo los textos que sigan siendo los de fábrica.
      const clips = p.clips?.map((c) => {
        if (c.pista === 'texto') {
          const contenido = retraducido(TEXTOS_VIDEO, c.texto.contenido, 'titulo', 'cierre')
          const subtitulo = retraducido(TEXTOS_VIDEO, c.texto.subtitulo, 'subtitulo')
          return contenido || subtitulo
            ? { ...c, texto: { ...c.texto, ...(contenido && { contenido }), ...(subtitulo && { subtitulo }) } }
            : c
        }
        if (c.pista === 'voz') {
          const texto = retraducido(TEXTOS_VIDEO, c.texto, 'narracion1', 'narracion2')
          // Con la voz ya generada el audio diría otra cosa: ese clip se queda.
          return texto && c.medioId == null ? { ...c, texto } : c
        }
        return c
      })
      const cambianClips = clips?.some((c, i) => c !== p.clips?.[i])
      if (nombre || cambianClips) {
        await proyectosVideoRepo.update(p.id, { ...(nombre && { nombre }), ...(cambianClips && { clips }) })
      }
    }
  },
}
