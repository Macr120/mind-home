import { useState } from 'react'
import type { ComponentType } from 'react'
import { COLOR } from './constantes'
import { JUEGOS_REALES, type IdJuegoReal, type JuegoReal } from './juegos/catalogo'
import { Ahorcado } from './juegos/Ahorcado'
import { Ajedrez } from './juegos/Ajedrez'
import { Billar } from './juegos/Billar'
import { Blackjack } from './juegos/Blackjack'
import { Buscaminas } from './juegos/Buscaminas'
import { CartasConocerse, CartasDebates } from './juegos/CartasPreguntas'
import { CuatroEnLinea } from './juegos/CuatroEnLinea'
import { Damas } from './juegos/Damas'
import { DinoRunner } from './juegos/DinoRunner'
import { Domino } from './juegos/Domino'
import { Hockey } from './juegos/Hockey'
import { Juego2048 } from './juegos/Juego2048'
import { Memorama } from './juegos/Memorama'
import { Pong } from './juegos/Pong'
import { Ruleta } from './juegos/Ruleta'
import { SimonDice } from './juegos/SimonDice'
import { Solitario } from './juegos/Solitario'
import { SpaceDefender } from './juegos/SpaceDefender'
import { Sudoku } from './juegos/Sudoku'
import { Tetris } from './juegos/Tetris'
import { Viborita } from './juegos/Viborita'
import { useT } from '../../core/i18n/useT'
import { vivo } from '../../core/ui/estilos'
import { Icono } from '../../core/ui/iconos/Icono'

type Seccion = '12' | '3mas'

const COMPONENTES: Record<IdJuegoReal, ComponentType> = {
  sudoku: Sudoku,
  solitario: Solitario,
  j2048: Juego2048,
  damas: Damas,
  ajedrez: Ajedrez,
  blackjack: Blackjack,
  ruleta: Ruleta,
  buscaminas: Buscaminas,
  domino: Domino,
  viborita: Viborita,
  space: SpaceDefender,
  tetris: Tetris,
  dino: DinoRunner,
  pong: Pong,
  hockey: Hockey,
  billar: Billar,
  memorama: Memorama,
  cuatroenlinea: CuatroEnLinea,
  simon: SimonDice,
  ahorcado: Ahorcado,
  conocerse: CartasConocerse,
  debates: CartasDebates,
}

export function JuegosMesaTab({ juegoInicial }: { juegoInicial?: IdJuegoReal }) {
  const t = useT()
  const [seccion, setSeccion] = useState<Seccion>('12')
  // Arranca con el juego pedido por chat («quiero jugar la viborita»), si lo hay.
  const [juegoActivo, setJuegoActivo] = useState<JuegoReal | null>(
    () => JUEGOS_REALES.find((j) => j.id === juegoInicial) ?? null,
  )

  // Los juegos '2+' sirven igual en pareja que en grupo: salen en ambas secciones
  const juegosDigitales = JUEGOS_REALES.filter((j) => (seccion === '12' ? true : j.jugadores === '2+'))

  if (juegoActivo) {
    const ComponenteJuego = COMPONENTES[juegoActivo.id]
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setJuegoActivo(null)}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/20"
          >
            ← {t('entre.j.volver', 'Volver')}
          </button>
          <h3 className="text-lg font-bold">
            <Icono emoji={juegoActivo.icono} /> {t(`entre.j.${juegoActivo.id}.nombre`, juegoActivo.nombre)}
          </h3>
        </div>
        <ComponenteJuego />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1.5">
        {(
          [
            ['12', 'entre.j.seccion.12', '1–2 jugadores'],
            ['3mas', 'entre.j.seccion.3mas', '3+ jugadores'],
          ] as const
        ).map(([id, key, fallback]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSeccion(id)}
            className={`rounded-xl py-2 text-sm font-bold transition ${
              seccion === id ? 'text-black' : 'bg-white/5 hover:bg-white/10'
            }`}
            style={seccion === id ? { background: COLOR } : undefined}
          >
            <Icono nombre={id === '12' ? 'perfil' : 'companeros'} /> {t(key, fallback)}
          </button>
        ))}
      </div>

      {juegosDigitales.length > 0 && (
        <section className="space-y-2">
          <p className="text-sm font-semibold texto-vivo" style={vivo(COLOR)}>
            <Icono nombre="joystick" /> {t('entre.j.jugarAhora', 'Juega ahora')}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {juegosDigitales.map((j) => (
              <button
                key={j.id}
                type="button"
                onClick={() => setJuegoActivo(j)}
                className="rounded-xl border border-white/10 bg-white/5 p-3 text-left transition hover:bg-white/10"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">
                    <Icono emoji={j.icono} />
                  </span>
                  <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] text-white/55"><Icono nombre="perfil" /> {j.jugadores}</span>
                </div>
                <p className="mt-1 font-bold">{t(`entre.j.${j.id}.nombre`, j.nombre)}</p>
                <p className="mt-0.5 text-xs leading-snug text-white/50">{t(`entre.j.${j.id}.desc`, j.descripcion)}</p>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
