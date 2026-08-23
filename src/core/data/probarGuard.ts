/**
 * Guard del modo probar (middleware DBCore).
 *
 * En la casa de prueba se puede hacer TODO: la bienvenida arma la casa y el
 * visitante la usa de verdad, pero nada cuenta como guardado. Este middleware
 * no bloquea: cuando una escritura viene del propio usuario (click/tecla
 * reciente, ver `intencion.ts`) marca la prueba como sucia —la señal de que hay
 * casa que ofrecer recuperar al convertirse— y abre el aviso de sesión, una vez
 * por carga.
 *
 * Se instala en `db.ts` únicamente con `esProbar()`, por FUERA del middleware
 * de sync (level 2 > 1), así un solo punto cubre repos, stores de la casa,
 * seeds y cualquier código futuro. Ignora las escrituras del pull del motor
 * (nunca debería haberlas: la sync va apagada en probar), las de un tutorial y
 * las del wizard de bienvenida.
 */
import type { DBCore, DBCoreMutateRequest, DBCoreMutateResponse, Middleware } from 'dexie'
import { marcarPruebaSucia } from '../../probar/modo'
import { useAvisoSesion } from '../state/avisosPlanStore'
import { hayBienvenidaActiva, hayIntencionHumana, hayTutorialActivo } from './intencion'

let avisado = false

interface TransMarcada {
  __mhAplicandoPull?: boolean
}

function apuntar(): void {
  if (hayTutorialActivo()) return
  if (!hayIntencionHumana()) return
  marcarPruebaSucia()
  // El wizard de bienvenida arma la casa: cuenta como «casa que recuperar» al
  // convertirse, pero avisarle ahí taparía el propio wizard.
  if (hayBienvenidaActiva()) return
  if (!avisado) {
    avisado = true
    useAvisoSesion.getState().abrir()
  }
}

export const probarGuard: Middleware<DBCore> = {
  stack: 'dbcore',
  name: 'mh-probar-marcador',
  level: 2,
  create(down) {
    return {
      ...down,
      table(nombre) {
        const tabla = down.table(nombre)
        if (nombre.startsWith('_')) return tabla
        return {
          ...tabla,
          mutate(req: DBCoreMutateRequest): Promise<DBCoreMutateResponse> {
            if ((req.trans as TransMarcada).__mhAplicandoPull !== true) apuntar()
            return tabla.mutate(req)
          },
        }
      },
    }
  },
}
