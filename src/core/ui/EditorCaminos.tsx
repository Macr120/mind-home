import { useCaminos, type HerramientaCamino, type TipoCamino } from '../state/caminosStore'
import { usePistaLibreEditor, type HerramientaTrazo } from '../state/pistaLibreStore'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'
import type { NombreIcono } from './iconos/catalogo'

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
    <div className="pointer-events-none absolute inset-0 z-40">
      {/* Encabezado. */}
      <div className="absolute left-0 right-0 top-3 flex items-start justify-center">
        <div
          data-tut="caminos.header"
          className="ui-hud ui-pop pointer-events-auto flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-sm font-semibold text-white"
        >
          <Icono nombre="pista" /> {t('room.caminos.nombre', 'Caminos')}
          <button
            type="button"
            data-tut="caminos.salir"
            onClick={() => c.salir()}
            title={t('infra.salirEditor', 'Salir del editor')}
            aria-label={t('infra.salirEditor', 'Salir del editor')}
            className="ml-2 rounded px-1 text-white/60 transition hover:bg-white/10 hover:text-white active:scale-95"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Barra de tipos y herramientas. */}
      <div className="absolute bottom-3 left-0 right-0 flex justify-center px-2">
        <div
          data-tut="caminos.barra"
          data-tut-zona="app:caminos"
          className="ui-hud ui-pop pointer-events-auto flex max-w-full flex-col gap-2 rounded-xl border border-white/10 p-2"
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
              {trazoBtn('borrarPunto', 'borrador', t('trazo.herr.borrar', 'Borrar puntos'))}
              <span className="mx-1 h-6 w-px bg-white/15" />
              <button
                type="button"
                data-tut="caminos.trazo.cerrar"
                onClick={() => tz.alternarCerrada()}
                title={t('trazo.cerrar', 'Cerrar circuito')}
                aria-label={t('trazo.cerrar', 'Cerrar circuito')}
                className={`${btn} ${trazoCerrada ? 'border-emerald-400/60 bg-emerald-600' : 'bg-white/10 hover:bg-white/20'}`}
              >
                <Icono nombre="bandera" />
              </button>
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
                {t('trazo.ayuda', 'Toca el mapa para poner puntos; la meta es el primero. Cierra el circuito para correr.')}
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
        </div>
      </div>
    </div>
  )
}
