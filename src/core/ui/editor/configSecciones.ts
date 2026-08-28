/**
 * Orden de los grupos de la pestaña Configuraciones. Vive aparte del acordeón
 * (`useEditorUi().configAbiertos`, que solo recuerda qué está desplegado) porque
 * el usuario lo reordena arrastrando y se persiste en localStorage.
 */

export type ConfigGrupoId =
  | 'cuenta'
  | 'estilo'
  | 'idioma'
  | 'interfaz'
  | 'fondo'
  | 'musica'
  | 'tutoriales'
  | 'notificaciones'
  | 'ia'
  | 'respaldo'

/**
 * Orden de fábrica: «Precios de la IA» va DEBAJO de «Notificaciones». Es una
 * tabla de consulta, no un ajuste del día a día: arriba estorbaba.
 */
const ORDEN_CONFIG_DEFAULT: ConfigGrupoId[] = [
  'cuenta',
  'estilo',
  'idioma',
  'interfaz',
  'fondo',
  'musica',
  'tutoriales',
  'notificaciones',
  'ia',
  'respaldo',
]

const KEY_ORDEN_CONFIG = 'mind-home-editor-orden-config'

/**
 * Quita ids desconocidos y duplicados, y añade AL FINAL los que falten: así, al
 * agregar un grupo nuevo, a quien ya tenga un orden guardado le aparece abajo en
 * vez de desaparecer.
 */
export function sanitizarOrdenConfig(orden: readonly string[]): ConfigGrupoId[] {
  const validos: ConfigGrupoId[] = []
  for (const id of orden) {
    if (ORDEN_CONFIG_DEFAULT.includes(id as ConfigGrupoId) && !validos.includes(id as ConfigGrupoId)) {
      validos.push(id as ConfigGrupoId)
    }
  }
  return [...validos, ...ORDEN_CONFIG_DEFAULT.filter((id) => !validos.includes(id))]
}

export function leerOrdenConfig(): ConfigGrupoId[] {
  try {
    const raw = localStorage.getItem(KEY_ORDEN_CONFIG)
    if (!raw) return ORDEN_CONFIG_DEFAULT
    return sanitizarOrdenConfig(JSON.parse(raw) as string[])
  } catch {
    return ORDEN_CONFIG_DEFAULT
  }
}

export function guardarOrdenConfig(orden: ConfigGrupoId[]) {
  try {
    localStorage.setItem(KEY_ORDEN_CONFIG, JSON.stringify(orden))
  } catch {
    /* quota / modo privado */
  }
}
