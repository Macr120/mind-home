import { AMANECER, CYAN, NOCHE, posicionEnFranja } from './descanso'

const TICKS = ['21:00', '00:00', '03:00', '06:00', '09:00']

/**
 * Franja de noche: representa la ventana de sueño (acostarse → despertar) como
 * una banda horizontal de 20:00 a 10:00, con luna al dormir y sol al despertar.
 * Es la firma visual del cuarto — deliberadamente NO es un reloj circular.
 */
export function FranjaNoche({
  dormir,
  despertar,
  refDormir,
  refDespertar,
  altura = 'h-9',
}: {
  dormir?: string
  despertar?: string
  /** Ventana objetivo de referencia (marcadores punteados), opcional. */
  refDormir?: string
  refDespertar?: string
  altura?: string
}) {
  const l = posicionEnFranja(dormir)
  const r = posicionEnFranja(despertar)
  const ancho = Math.max(0, r - l)
  const hayVentana = !!dormir && !!despertar

  return (
    <div>
      <div
        className={`relative ${altura} rounded-xl border border-white/10 overflow-hidden`}
        style={{ background: 'linear-gradient(90deg,#0b1024,#111a35 55%,#1a1526)' }}
      >
        {/* Estrellitas sutiles del fondo nocturno */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(1px 1px at 20% 35%,#fff6,transparent),radial-gradient(1px 1px at 62% 60%,#fff5,transparent),radial-gradient(1px 1px at 80% 30%,#fff4,transparent)',
          }}
        />

        {/* Marcadores del horario objetivo (referencia) */}
        {refDormir && (
          <Marcador pos={posicionEnFranja(refDormir)} />
        )}
        {refDespertar && (
          <Marcador pos={posicionEnFranja(refDespertar)} />
        )}

        {/* Ventana de sueño */}
        {hayVentana && ancho > 0 && (
          <div
            className="absolute inset-y-1 rounded-lg shadow-inner"
            style={{
              left: `${l * 100}%`,
              width: `${ancho * 100}%`,
              background: `linear-gradient(90deg, ${NOCHE}, ${CYAN} 55%, ${AMANECER})`,
            }}
          />
        )}

        {/* Luna al inicio, sol al final */}
        {hayVentana && (
          <>
            <span
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-xs drop-shadow"
              style={{ left: `${l * 100}%` }}
            >
              🌙
            </span>
            <span
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-xs drop-shadow"
              style={{ left: `${r * 100}%` }}
            >
              ☀️
            </span>
          </>
        )}

        {!hayVentana && (
          <span className="absolute inset-0 grid place-items-center text-[10px] text-white/30">
            Sin horario registrado
          </span>
        )}
      </div>

      <div className="relative mt-1 h-3">
        {TICKS.map((t) => (
          <span
            key={t}
            className="absolute -translate-x-1/2 text-[9px] text-white/30"
            style={{ left: `${posicionEnFranja(t) * 100}%` }}
          >
            {t.slice(0, 2)}h
          </span>
        ))}
      </div>
    </div>
  )
}

function Marcador({ pos }: { pos: number }) {
  return (
    <div
      className="absolute inset-y-0 w-px border-l border-dashed border-white/40"
      style={{ left: `${pos * 100}%` }}
    />
  )
}
