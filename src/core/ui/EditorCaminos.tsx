import { useCaminos, type HerramientaCamino, type TipoCamino } from '../state/caminosStore'
import { usePistaLibreEditor, type HerramientaTrazo } from '../state/pistaLibreStore'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'
import type { NombreIcono } from './iconos/catalogo'
import { MarcoEditorInfra } from './MarcoEditorInfra'

const btn =
  'flex h-10 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-xs font-semibold text-white transition active:scale-95'

/**
 * Overlay del editor de Caminos: sin capa de captura (la cámara iso sigue
 * navegable); un clic sobre una celda del mapa aplica la herramienta activa
 * (CaminosController). Barra inferior con tipo y herramientas.
 */
export function EditorCaminos() {
  const t = useT()
  const activo = useCaminos((s) => s.activo)
  const tipo = useCaminos((s) => s.tipo)
  const herramienta = useCaminos((s) => s.herramienta)
  const trazoActivo = usePistaLibreEditor((s) => s.activo)
  const herrTrazo = usePistaLibreEditor((s) => s.herramienta)
  const trazoCerrada = usePistaLibreEditor((s) => s.cerrada)
  if (!activo) return null
  const c = useCaminos.getState()
  const tz = usePistaLibreEditor.getState()

  const trazoBtn = (h: HerramientaTrazo, icono: NombreIcono, etiqueta: string) => (
    <button
      type="button"
      data-tut={`caminos.trazo.${h}`}
      onClick={() => tz.setHerramienta(h)}
      title={etiqueta}
      aria-label={etiqueta}
      className={`${btn} ${herrTrazo === h ? 'border-emerald-400/60 bg-emerald-600' : 'bg-white/10 hover:bg-white/20'}`}
    >
      <Icono nombre={icono} />
    </button>
  )

  const tipoBtn = (tp: TipoCamino, icono: NombreIcono, etiqueta: string) => (
    <button
      type="button"
      data-tut={`caminos.tipo.${tp}`}
      onClick={() => {
        tz.salir() // elegir un tipo de celdas sale del sub-modo de trazo libre
        c.setTipo(tp)
      }}
      title={etiqueta}
      aria-label={etiqueta}
      className={`${btn} ${tipo === tp && !trazoActivo ? 'border-amber-400/60 bg-amber-600' : 'bg-white/10 hover:bg-white/20'}`}
    >
      <Icono nombre={icono} /> {etiqueta}
    </button>
  )
  const herrBtn = (h: HerramientaCamino, icono: NombreIcono, etiqueta: string) => (
    <button
      type="button"
      data-tut={`caminos.herr.${h}`}
      onClick={() => c.setHerramienta(h)}
      title={etiqueta}
      aria-label={etiqueta}
      className={`${btn} ${herramienta === h ? 'border-emerald-400/60 bg-emerald-600' : 'bg-white/10 hover:bg-white/20'}`}
    >
      <Icono nombre={icono} />
    </button>
  )

  return (
    <MarcoEditorInfra
      icono="pista"
      titulo={t('room.caminos.nombre', 'Circuitos')}
      tut="caminos"
      onSalir={() => c.salir()}
      ancho="max-w-full"
    >
      <div data-tut="caminos.tipos" className="flex flex-wrap items-center justify-center gap-1.5">
            {tipoBtn('pista', 'pista', t('caminos.tipo.pista', 'Pista de carreras'))}
            {tipoBtn('riel', 'riel', t('caminos.tipo.riel', 'Riel de tren'))}
            {tipoBtn('coaster', 'montana-rusa', t('caminos.tipo.coaster', 'Montaña rusa'))}
            <button
              type="button"
              data-tut="caminos.tipo.trazo"
              onClick={() => (trazoActivo ? tz.salir() : void tz.entrar())}
              title={t('caminos.tipo.trazo', 'Trazo libre')}
              aria-label={t('caminos.tipo.trazo', 'Trazo libre')}
              className={`${btn} ${trazoActivo ? 'border-amber-400/60 bg-amber-600' : 'bg-white/10 hover:bg-white/20'}`}
            >
              <Icono nombre="editar" /> {t('caminos.tipo.trazo', 'Trazo libre')}
            </button>
          </div>
          {trazoActivo ? (
            <div data-tut="caminos.barra.trazo" className="flex flex-wrap items-center justify-center gap-1.5">
              {trazoBtn('punto', 'pincel', t('trazo.herr.punto', 'Poner puntos'))}
              {trazoBtn('mover', 'mover', t('trazo.herr.mover', 'Mover puntos'))}
              <span className="mx-1 h-6 w-px bg-white/15" />
              {/* Estado del circuito: se cierra tocando la meta en el mapa, no aquí. */}
              <span
                data-tut="caminos.trazo.cerrar"
                className={`flex h-10 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold ${
                  trazoCerrada
                    ? 'border-emerald-400/60 bg-emerald-600/30 text-emerald-200'
                    : 'border-white/10 bg-white/5 text-white/60'
                }`}
              >
                <Icono nombre="bandera" />
                {trazoCerrada ? t('trazo.cerrado', 'Circuito cerrado') : t('trazo.abierto', 'Circuito abierto')}
              </span>
              <button
                type="button"
                data-tut="caminos.trazo.borrarTodo"
                onClick={() => tz.borrarTodo()}
                title={t('trazo.borrarTodo', 'Borrar la pista')}
                aria-label={t('trazo.borrarTodo', 'Borrar la pista')}
                className={`${btn} bg-white/10 hover:bg-white/20`}
              >
                <Icono nombre="basura" />
              </button>
              <span className="mx-1 h-6 w-px bg-white/15" />
              <span className="max-w-52 text-[10px] leading-tight text-white/50">
                {t(
                  'trazo.ayuda',
                  'Toca el mapa para poner puntos y toca un punto para borrarlo. El primero es la meta: tócalo para cerrar el circuito y poder correr.',
                )}
              </span>
            </div>
          ) : (
            <div data-tut="caminos.barra.herr" className="flex flex-wrap items-center justify-center gap-1.5">
              {herrBtn('pintar', 'pincel', t('caminos.herr.pintar', 'Pintar tramos'))}
              {herrBtn('borrar', 'borrador', t('caminos.herr.borrar', 'Borrar tramos'))}
              {tipo === 'pista' && (
                <>
                  <span className="mx-1 h-6 w-px bg-white/15" />
                  {herrBtn('meta', 'bandera', t('caminos.herr.meta', 'Línea de meta'))}
                </>
              )}
              <span className="mx-1 h-6 w-px bg-white/15" />
              {herrBtn('subir', 'subir', t('caminos.herr.subir', 'Subir altura'))}
              {herrBtn('bajar', 'bajar', t('caminos.herr.bajar', 'Bajar altura'))}
              <span className="mx-1 h-6 w-px bg-white/15" />
              <span className="max-w-52 text-[10px] leading-tight text-white/50">
                {t('caminos.ayuda', 'Toca una celda del mapa para aplicar; arrastra para mover la cámara.')}
              </span>
            </div>
          )}
    </MarcoEditorInfra>
  )
}
