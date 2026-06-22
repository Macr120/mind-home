import type { ZonaPlano } from '../../data/db'
import { useDiseño } from '../../state/disenoStore'
import { zonasRepo } from '../../data/repository'
import type { PisoTipoId } from '../../house/pisos'
import { PISO_SIN_PISO } from '../../house/pisos'
import { cuartosEnNivel } from '../../house/planoPisoSeleccion'

function zonasDelNivel(nivel: number, zonas: ZonaPlano[]) {
  return zonas.filter((z) => z.nivel === nivel && z.id != null)
}

/** Aplica textura o color sólido a todos los pisos interiores del nivel. */
export async function aplicarPisoInterioresNivel(
  nivel: number,
  zonas: ZonaPlano[],
  pisoTipo: string | null,
  pisoColor: string,
) {
  const store = useDiseño.getState()
  for (const roomId of cuartosEnNivel(nivel)) {
    if (pisoTipo === null) await store.setRoomPisoColor(roomId, pisoColor)
    else await store.setRoomPisoTipo(roomId, pisoTipo as PisoTipoId)
  }
  for (const z of zonasDelNivel(nivel, zonas)) {
    await zonasRepo.update(z.id!, {
      pisoTipo,
      pisoColor,
      pisoImagenActiva: false,
    })
  }
}

export async function subirPisoImagenInterioresNivel(
  nivel: number,
  zonas: ZonaPlano[],
  blob: Blob,
  ajuste = 'x1',
) {
  const store = useDiseño.getState()
  for (const roomId of cuartosEnNivel(nivel)) {
    await store.subirRoomPisoImagen(roomId, blob)
    if (ajuste !== 'x1') await store.setRoomPisoImagenAjuste(roomId, ajuste)
  }
  for (const z of zonasDelNivel(nivel, zonas)) {
    await zonasRepo.update(z.id!, {
      pisoImagen: blob,
      pisoImagenActiva: true,
      pisoImagenAjuste: ajuste,
      pisoTipo: null,
    })
  }
}

export async function activarPisoImagenInterioresNivel(
  nivel: number,
  zonas: ZonaPlano[],
  activa: boolean,
) {
  const store = useDiseño.getState()
  for (const roomId of cuartosEnNivel(nivel)) {
    if (activa) await store.activarRoomPisoImagen(roomId)
    else await store.desactivarRoomPisoImagen(roomId)
  }
  for (const z of zonasDelNivel(nivel, zonas)) {
    await zonasRepo.update(z.id!, {
      pisoImagenActiva: activa,
      ...(activa ? { pisoTipo: null } : {}),
    })
  }
}

export async function ajustarPisoImagenInterioresNivel(
  nivel: number,
  zonas: ZonaPlano[],
  ajuste: string,
) {
  const store = useDiseño.getState()
  for (const roomId of cuartosEnNivel(nivel)) {
    await store.setRoomPisoImagenAjuste(roomId, ajuste)
  }
  for (const z of zonasDelNivel(nivel, zonas)) {
    await zonasRepo.update(z.id!, { pisoImagenAjuste: ajuste })
  }
}

export async function eliminarPisoImagenInterioresNivel(nivel: number, zonas: ZonaPlano[]) {
  const store = useDiseño.getState()
  for (const roomId of cuartosEnNivel(nivel)) {
    await store.eliminarRoomPisoImagen(roomId)
  }
  for (const z of zonasDelNivel(nivel, zonas)) {
    await zonasRepo.update(z.id!, {
      pisoImagen: undefined,
      pisoImagenActiva: false,
      pisoImagenAjuste: undefined,
    })
  }
}

/** Quita la loseta de piso en todos los interiores del nivel (cuartos + zonas). */
export async function quitarPisoInterioresNivel(nivel: number, zonas: ZonaPlano[]) {
  const store = useDiseño.getState()
  for (const roomId of cuartosEnNivel(nivel)) {
    await store.setRoomPisoTipo(roomId, PISO_SIN_PISO as PisoTipoId)
  }
  for (const z of zonasDelNivel(nivel, zonas)) {
    await zonasRepo.update(z.id!, {
      pisoTipo: PISO_SIN_PISO,
      pisoColor: '',
      pisoImagenActiva: false,
    })
  }
}
