import { useAjustes } from '../state/ajustesStore'
import { esEscritorio } from '../plataforma'
import { dictStore } from './dict'
import { tGlobal } from './useT'

/**
 * Los textos del shell de escritorio: el menú y los diálogos de `electron/main.js`.
 * El proceso principal no tiene diccionarios, así que la app se los manda ya
 * traducidos (mismas claves que `TEXTOS` allí, que guarda el español de fábrica).
 */
function textos(): Record<string, string> {
  return {
    acercaDe: tGlobal('escritorio.menu.acercaDe', 'Acerca de MindHaOS'),
    servicios: tGlobal('escritorio.menu.servicios', 'Servicios'),
    ocultar: tGlobal('escritorio.menu.ocultar', 'Ocultar MindHaOS'),
    ocultarOtras: tGlobal('escritorio.menu.ocultarOtras', 'Ocultar otras'),
    mostrarTodas: tGlobal('escritorio.menu.mostrarTodas', 'Mostrar todas'),
    salir: tGlobal('escritorio.menu.salir', 'Salir de MindHaOS'),
    editar: tGlobal('escritorio.menu.editar', 'Editar'),
    deshacer: tGlobal('escritorio.menu.deshacer', 'Deshacer'),
    rehacer: tGlobal('escritorio.menu.rehacer', 'Rehacer'),
    cortar: tGlobal('escritorio.menu.cortar', 'Cortar'),
    copiar: tGlobal('escritorio.menu.copiar', 'Copiar'),
    pegar: tGlobal('escritorio.menu.pegar', 'Pegar'),
    seleccionarTodo: tGlobal('escritorio.menu.seleccionarTodo', 'Seleccionar todo'),
    ver: tGlobal('escritorio.menu.ver', 'Ver'),
    recargar: tGlobal('escritorio.menu.recargar', 'Recargar'),
    tamanoNormal: tGlobal('escritorio.menu.tamanoNormal', 'Tamaño normal'),
    acercar: tGlobal('escritorio.menu.acercar', 'Acercar'),
    alejar: tGlobal('escritorio.menu.alejar', 'Alejar'),
    pantallaCompleta: tGlobal('escritorio.menu.pantallaCompleta', 'Pantalla completa'),
    herramientas: tGlobal('escritorio.menu.herramientas', 'Herramientas de desarrollo'),
    ventana: tGlobal('escritorio.menu.ventana', 'Ventana'),
    minimizar: tGlobal('escritorio.menu.minimizar', 'Minimizar'),
    zoom: tGlobal('escritorio.menu.zoom', 'Zoom'),
    alFrente: tGlobal('escritorio.menu.alFrente', 'Traer todo al frente'),
    cerrar: tGlobal('escritorio.menu.cerrar', 'Cerrar'),
    ayuda: tGlobal('escritorio.menu.ayuda', 'Ayuda'),
    soporte: tGlobal('escritorio.menu.soporte', 'Soporte'),
    sitioWeb: tGlobal('escritorio.menu.sitioWeb', 'Sitio web'),
    versionNueva: tGlobal('escritorio.version.nueva', 'Hay una versión nueva ({v}).'),
    versionDetalle: tGlobal('escritorio.version.detalle', 'Descárgala para tener las últimas mejoras. Tus datos se quedan como están.'),
    descargar: tGlobal('escritorio.version.descargar', 'Descargar'),
    ahoraNo: tGlobal('escritorio.version.ahoraNo', 'Ahora no'),
    elegirPrograma: tGlobal('escritorio.programa.elegir', 'Elegir programa'),
    programas: tGlobal('escritorio.programa.programas', 'Programas'),
    todosArchivos: tGlobal('escritorio.programa.todos', 'Todos los archivos'),
  }
}

/** Manda los textos al arrancar y los repite al cambiar de idioma o al llegar su diccionario. */
export function sincronizarTextosEscritorio(): void {
  const mandar = typeof window === 'undefined' ? undefined : window.mph?.idioma
  if (!esEscritorio() || !mandar) return
  const enviar = () => void mandar(textos()).catch(() => {})
  enviar()
  useAjustes.subscribe((s, prev) => {
    if (s.idioma !== prev.idioma) enviar()
  })
  dictStore.subscribe(enviar)
}
