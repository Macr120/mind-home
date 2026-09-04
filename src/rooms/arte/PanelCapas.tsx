import { useT } from '../../core/i18n/useT'
import { confirmar, pedirTexto } from '../../core/state/confirmarStore'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import { MAX_CAPAS } from './constantes'
import type { Lienzo } from './lienzo'

/**
 * El panel de capas del editor (calca `audio/Pistas.tsx`): hoja inferior en
 * móvil, columna derecha en pantallas medianas. Flota DENTRO del contenedor de
 * gestos del lienzo, así que corta punteros y rueda para no dibujar ni hacer
 * zoom al tocarlo.
 */
export function PanelCapas({
  lienzo,
  alCambiar,
  alCerrar,
}: {
  lienzo: Lienzo
  /** Toda mutación pasa por aquí (tick de UI + autosave del editor). */
  alCambiar: () => void
  alCerrar: () => void
}) {
  const t = useT()
  const lista = lienzo.capas() // 0 = la de abajo del apilado
  const activa = lienzo.capaActiva()
  const filas = lista.map((capa, i) => ({ capa, i })).reverse() // la de arriba primero

  const accion = (icono: NombreIcono, etiqueta: string, onClick: () => void, deshabilitado = false) => (
    <button
      type="button"
      onClick={onClick}
      disabled={deshabilitado}
      aria-label={etiqueta}
      title={etiqueta}
      className="rounded px-1 py-0.5 text-white/45 transition hover:bg-white/10 hover:text-white/90 disabled:pointer-events-none disabled:opacity-30"
    >
      <Icono nombre={icono} />
    </button>
  )

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      className="absolute inset-x-2 bottom-2 z-10 max-h-[45%] space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-black/50 p-2 backdrop-blur md:inset-x-auto md:inset-y-2 md:right-2 md:max-h-none md:w-64"
    >
      <div className="flex items-center gap-2 px-1">
        <p className="flex-1 text-xs font-semibold">
          {t('arte.capa.titulo', 'Capas')}{' '}
          <span className="text-white/40">
            {lista.length}/{MAX_CAPAS}
          </span>
        </p>
        <button
          type="button"
          onClick={alCerrar}
          aria-label={t('arte.capa.cerrar', 'Cerrar el panel')}
          title={t('arte.capa.cerrar', 'Cerrar el panel')}
          className="rounded px-1 text-white/45 transition hover:bg-white/10 hover:text-white/90"
        >
          <Icono nombre="cerrar" />
        </button>
      </div>

      {filas.map(({ capa, i }) => (
        <div
          key={capa.capaId}
          className={`rounded-lg border px-2 py-1 ${
            capa.capaId === activa ? 'border-white/30 bg-white/10' : 'border-white/5 bg-white/[0.03]'
          }`}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                lienzo.activarCapa(capa.capaId)
                alCambiar()
              }}
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
            >
              {/* Blanco literal: la miniatura se ve como sobre el lienzo, ajena al tema. */}
              <img
                src={lienzo.miniaturaCapa(capa.capaId)}
                alt=""
                className="h-9 w-9 shrink-0 rounded border border-white/10 bg-[#ffffff] object-contain"
              />
              <span className={`truncate text-xs font-semibold ${capa.visible ? '' : 'text-white/40 line-through'}`}>
                {capa.nombre}
              </span>
            </button>
            {accion(
              'ver',
              capa.visible ? t('arte.capa.ocultar', 'Ocultar la capa') : t('arte.capa.mostrar', 'Mostrar la capa'),
              () => {
                lienzo.setVisibleCapa(capa.capaId, !capa.visible)
                alCambiar()
              },
            )}
          </div>
          {capa.capaId === activa && (
            <div className="mt-1 flex items-center gap-1">
              <input
                type="range"
                min={0.05}
                max={1}
                step={0.05}
                value={capa.opacidad}
                aria-label={t('arte.capa.opacidad', 'Opacidad')}
                title={t('arte.capa.opacidad', 'Opacidad')}
                onChange={(e) => {
                  lienzo.setOpacidadCapa(capa.capaId, Number(e.target.value))
                  alCambiar()
                }}
                className="min-w-0 flex-1"
              />
              {accion('editar', t('arte.capa.renombrar', 'Renombrar la capa'), () =>
                void pedirTexto({ titulo: t('arte.capa.renombrar', 'Renombrar la capa'), valor: capa.nombre }).then(
                  (nombre) => {
                    if (nombre) {
                      lienzo.renombrarCapa(capa.capaId, nombre)
                      alCambiar()
                    }
                  },
                ),
              )}
              {accion(
                'duplicar',
                t('arte.capa.duplicar', 'Duplicar la capa'),
                () => {
                  if (lienzo.duplicarCapa(capa.capaId, t('arte.capa.copiaDe', '{nombre} (copia)', { nombre: capa.nombre })))
                    alCambiar()
                },
                lista.length >= MAX_CAPAS,
              )}
              {accion(
                'subir',
                t('arte.capa.subir', 'Subir la capa'),
                () => {
                  if (lienzo.moverCapa(capa.capaId, 1)) alCambiar()
                },
                i === lista.length - 1,
              )}
              {accion(
                'bajar',
                t('arte.capa.bajar', 'Bajar la capa'),
                () => {
                  if (lienzo.moverCapa(capa.capaId, -1)) alCambiar()
                },
                i === 0,
              )}
              {accion(
                'fusionar',
                t('arte.capa.fusionar', 'Fusionar hacia abajo'),
                () =>
                  void confirmar({
                    titulo: t('arte.capa.fusionar', 'Fusionar hacia abajo'),
                    mensaje: t('arte.capa.fusionarMsg', 'La capa se mezcla con la de abajo y no se puede deshacer.'),
                  }).then((si) => {
                    if (si && lienzo.fusionarAbajo(capa.capaId)) alCambiar()
                  }),
                i === 0,
              )}
              {accion(
                'basura',
                t('arte.capa.borrar', 'Borrar la capa'),
                () =>
                  void confirmar({
                    titulo: t('arte.capa.borrar', 'Borrar la capa'),
                    mensaje: t('arte.capa.borrarMsg', 'Se pierde lo dibujado en ella.'),
                    peligro: true,
                  }).then((si) => {
                    if (si && lienzo.borrarCapa(capa.capaId)) alCambiar()
                  }),
                lista.length <= 1,
              )}
            </div>
          )}
        </div>
      ))}

      {lista.length < MAX_CAPAS && (
        <button
          type="button"
          onClick={() => {
            if (lienzo.agregarCapa(t('arte.capa.nueva', 'Capa {n}', { n: lista.length + 1 }))) alCambiar()
          }}
          className="w-full rounded-lg border border-dashed border-white/15 px-2 py-1 text-xs text-white/50 transition hover:bg-white/5 hover:text-white/80"
        >
          <Icono nombre="agregar" /> {t('arte.capa.agregar', 'Añadir capa')}
        </button>
      )}
    </div>
  )
}
