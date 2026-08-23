/**
 * Puente pull → casa 3D. Los stores de la casa (cuartos, layout, diseño,
 * grafitis) leen Dexie UNA vez al importarse; cuando el pull trae filas de sus
 * tablas hay que recargarlos para que el cambio del otro dispositivo se pinte
 * sin recargar la página (las apps 2D no lo necesitan: useLiveQuery).
 *
 * Salvaguarda: mientras hay edición activa en ESTE dispositivo no se recarga
 * (pisaría el arrastre/selección en curso); lo tocado se acumula y se aplica
 * en el siguiente aviso (cada ciclo de sync avisa, incluso con set vacío, y el
 * intervalo del motor garantiza uno periódico).
 *
 * Imports dinámicos a propósito: evitan el ciclo motor ↔ stores y no engordan
 * el chunk del motor (mismo patrón que cuartosStore → layoutStore).
 */
const GRUPOS: { tablas: string[]; recargar: () => Promise<void> }[] = [
  // El orden importa: layout mapea sobre los cuartos ya cargados, y el diseño
  // sobre ambos.
  {
    tablas: ['cuartos'],
    recargar: async () => (await import('../../state/cuartosStore')).useCuartos.getState().recargar(),
  },
  {
    tablas: ['layout', 'mapaConfig', 'accesos', 'zonas'],
    recargar: async () => (await import('../../state/layoutStore')).useLayout.getState().cargar(),
  },
  {
    tablas: [
      'disenoRooms',
      'disenoAvatar',
      'objetosCuarto',
      'fondosImagen',
      'fondosPanel',
      'temasPropios',
      'pisosImagenCuarto',
      'techosImagenCuarto',
      'murosImagenCuarto',
    ],
    recargar: async () => (await import('../../state/disenoStore')).useDiseño.getState().cargar(),
  },
  {
    tablas: ['grafitis'],
    recargar: async () => (await import('../../state/grafitiStore')).useGrafitis.getState().cargar(),
  },
]

let pendientes = new Set<string>()
let repintando = false

async function hayEdicionActiva(): Promise<boolean> {
  const { useLayout } = await import('../../state/layoutStore')
  const { useEditorUi } = await import('../../state/editorUiStore')
  const L = useLayout.getState()
  return (
    L.editMode ||
    L.editingRoomId != null ||
    L.moverObjetosRoomId != null ||
    L.draggingId != null ||
    useEditorUi.getState().editor3d
  )
}

/** Lo llama el motor tras cada pull con las tablas que trajeron cambios. */
export function notificarRepintado(tocadas: Set<string>): void {
  for (const t of tocadas) pendientes.add(t)
  if (!pendientes.size || repintando) return
  void (async () => {
    if (await hayEdicionActiva()) return // se reintenta al siguiente aviso
    repintando = true
    const lote = pendientes
    pendientes = new Set()
    try {
      for (const g of GRUPOS) {
        if (g.tablas.some((t) => lote.has(t))) await g.recargar()
      }
    } finally {
      repintando = false
    }
  })()
}
