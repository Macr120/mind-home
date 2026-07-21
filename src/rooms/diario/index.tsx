import type { RoomModule } from '../../core/registry'
import { lecturasDiarioRepo } from '../../core/data/repository'
import { DiarioApp } from './DiarioApp'
import { tutorialDiario } from './tutorial'
import { COLOR } from './constantes'

const diario: RoomModule = {
  id: 'diario',
  nombre: 'Noticias · Periódico',
  icon: '📰',
  categoria: 'complemento',
  posicion: [-3, 0, 6],
  color: COLOR,
  App: DiarioApp,
  tutorial: tutorialDiario,
  metaDiaria: {
    clave: 'diario.metaDiaria',
    etiquetaEs: 'Lee el diario de hoy',
    seccion: 'titulares',
    del: async (fecha) => ({
      hecho: (await lecturasDiarioRepo.list()).filter((l) => l.fecha === fecha).length,
      objetivo: 1,
    }),
  },
  comandos: [
    { seccion: 'titulares', etiqueta: 'Titulares', nombres: ['titulares', 'titulares del dia'] },
    { seccion: 'efemerides', etiqueta: 'Efemérides', nombres: ['efemerides', 'tal dia como hoy'] },
  ],
}

export default diario
