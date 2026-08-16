import { useState } from 'react'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import type { Motor } from './motor'
import { GRUPOS_NOTACION } from './notaciones'
import { Tex } from './Tex'

/**
 * Paleta de notaciones para escribir ecuaciones a golpe de botón: se elige el
 * grupo y cada botón mete su notación donde esté el cursor.
 *
 * La comparten el formulario, la calculadora y las hojas porque las tres
 * escriben en la misma sintaxis (ver `notaciones.ts`).
 *
 * En la calculadora nace ABIERTA porque ahí sustituye al viejo teclado
 * científico, pero se pliega como en todas partes: cien botones de KaTeX encima
 * del teclado estorban en cuanto sabes lo que quieres escribir. En los demás
 * sitios nace plegada, que es ayuda para escribir y no la herramienta.
 *
 * `onMouseDown` con `preventDefault` en cada botón es lo que hace que el campo
 * NO pierda el foco al pulsar: sin eso se perdería el cursor y, en la hoja, la
 * celda se confirmaría sola en cuanto se tocara la paleta.
 */
export function TecladoMath({
  motor,
  onInsertar,
  abiertaAlPrincipio = false,
}: {
  motor: Motor | null
  /** Recibe lo que hay que escribir; `$0` marca dónde va el cursor. */
  onInsertar: (escribe: string) => void
  /** Nace desplegada. Siempre se puede plegar desde su cabecera. */
  abiertaAlPrincipio?: boolean
}) {
  const t = useT()
  const [abierto, setAbierto] = useState(abiertaAlPrincipio)
  const [grupo, setGrupo] = useState(GRUPOS_NOTACION[0].id)

  const actual = GRUPOS_NOTACION.find((g) => g.id === grupo) ?? GRUPOS_NOTACION[0]

  return (
    <div className="rounded-xl border border-white/10 bg-black/20" data-tut="computo.notaciones">
      <button
        type="button"
        onClick={() => setAbierto((x) => !x)}
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-start text-xs font-semibold text-white/60 transition hover:text-white/90"
      >
        <Icono nombre="sigma" />
        <span className="min-w-0 flex-1">{t('computo.not.titulo', 'Notaciones')}</span>
        <span className="text-white/40">
          <Icono nombre={abierto ? 'subir' : 'bajar'} />
        </span>
      </button>

      {abierto && (
        <div className="space-y-2 border-t border-white/10 p-2">
          <div className="flex flex-wrap gap-1">
            {GRUPOS_NOTACION.map((g) => (
              <button
                key={g.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setGrupo(g.id)}
                className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition ${
                  grupo === g.id ? 'ui-accent-bg' : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {t(`computo.not.${g.id}`, g.labelEs)}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1">
            {actual.notaciones.map((x) => (
              <button
                key={x.escribe + x.tex}
                type="button"
                // El title es el código que escribe: no es texto de interfaz,
                // es la sintaxis del motor (igual que las teclas `sqrt(`).
                title={x.escribe.replace('$0', '')}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onInsertar(x.escribe)}
                className="grid h-10 min-w-[2.5rem] place-items-center rounded-lg bg-white/5 px-2 text-white/85 transition hover:bg-white/15"
              >
                <Tex tex={x.tex} motor={motor} crudo={x.escribe.replace('$0', '')} className="text-sm" />
              </button>
            ))}
          </div>

          <p className="px-0.5 text-[10px] leading-relaxed text-white/35">
            {t('computo.not.ayuda', 'Se escriben donde tengas el cursor y el hueco queda listo para teclear. La vista bonita sale sola de lo que escribas.')}
          </p>
        </div>
      )}
    </div>
  )
}
