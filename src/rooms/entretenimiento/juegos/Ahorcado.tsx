import { useEffect, useState } from 'react'
import { Icono } from '../../../core/ui/iconos/Icono'
import { useT } from '../../../core/i18n/useT'
import { COLOR } from '../constantes'
import { guardarRecord, leerNumero } from './almacen'

const PALABRAS = [
  'ÁRBOL', 'MONTAÑA', 'GUITARRA', 'ELEFANTE', 'MARIPOSA', 'BIBLIOTECA', 'CHOCOLATE', 'VENTANA', 'PIRÁMIDE', 'DINOSAURIO',
  'TELÉFONO', 'CASTILLO', 'JIRAFA', 'HELADO', 'PLANETA', 'VOLCÁN', 'BRÚJULA', 'CANGREJO', 'ESPEJO', 'FANTASMA',
  'GALLETA', 'HORMIGA', 'INVIERNO', 'JARDÍN', 'LÁMPARA', 'MURCIÉLAGO', 'NARANJA', 'ORQUESTA', 'PAYASO', 'QUESO',
  'RELÁMPAGO', 'SEMÁFORO', 'TIBURÓN', 'UNICORNIO', 'VIOLÍN', 'ZANAHORIA', 'AVIÓN', 'BALLENA', 'CIRUELA', 'DELFÍN',
  'ESCALERA', 'FUEGO', 'GLOBO', 'HURACÁN', 'IGLESIA', 'JUGUETE', 'KOALA', 'LIMONADA', 'MERCADO', 'NUBE',
  'OSO', 'PINGÜINO', 'RATÓN', 'SERPIENTE', 'TORTUGA', 'UVA', 'VAMPIRO', 'YOGUR', 'ZAPATO', 'ARAÑA',
  'BOSQUE', 'CAMISETA', 'DRAGÓN', 'ESTRELLA', 'FLAUTA', 'GIRASOL', 'HOSPITAL', 'ISLA', 'JAMÓN', 'LEÓN',
  'MAGIA', 'NIEVE', 'OCÉANO', 'PELUCHE', 'RANA', 'SOMBRERO', 'TREN', 'VELERO', 'ZORRO', 'ANILLO',
  'BUFANDA', 'COMETA', 'DIAMANTE', 'ESQUELETO', 'FRESA', 'GAVIOTA', 'HAMACA', 'IMÁN', 'LADRILLO', 'MELÓN',
  'NIDO', 'OVEJA', 'PIRATA', 'ROBOT', 'SIRENA', 'TAMBOR', 'VACUNA', 'CIGÜEÑA', 'MUÑECA', 'PIÑATA',
]

const LETRAS = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('')
const MAX_FALLOS = 6

const SIN_TILDE: Record<string, string> = { Á: 'A', É: 'E', Í: 'I', Ó: 'O', Ú: 'U', Ü: 'U' }
// La Ñ se conserva: solo se pliegan las vocales acentuadas para comparar
const normalizar = (s: string) => s.toUpperCase().replace(/[ÁÉÍÓÚÜ]/g, (c) => SIN_TILDE[c])

function palabraAleatoria(): string {
  return PALABRAS[Math.floor(Math.random() * PALABRAS.length)]
}

export function Ahorcado() {
  const t = useT()
  const [palabra, setPalabra] = useState(palabraAleatoria)
  const [usadas, setUsadas] = useState<Set<string>>(new Set())
  const [racha, setRacha] = useState(0)
  const [record, setRecord] = useState(() => leerNumero('ahorcado-racha', 0))

  const letrasPalabra = new Set(normalizar(palabra).split('').filter((c) => LETRAS.includes(c)))
  const fallos = [...usadas].filter((l) => !letrasPalabra.has(l)).length
  const ganado = [...letrasPalabra].every((l) => usadas.has(l))
  const perdido = fallos >= MAX_FALLOS
  const terminado = ganado || perdido

  const probar = (letra: string) => {
    if (terminado || usadas.has(letra)) return
    const nuevas = new Set(usadas).add(letra)
    setUsadas(nuevas)
    if ([...letrasPalabra].every((l) => nuevas.has(l))) {
      const nueva = racha + 1
      setRacha(nueva)
      setRecord(guardarRecord('ahorcado-racha', nueva))
    } else if ([...nuevas].filter((l) => !letrasPalabra.has(l)).length >= MAX_FALLOS) {
      setRacha(0)
    }
  }

  const siguiente = () => {
    setPalabra(palabraAleatoria())
    setUsadas(new Set())
  }

  useEffect(() => {
    const manejar = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
      const letra = normalizar(e.key)
      if (letra.length === 1 && LETRAS.includes(letra)) probar(letra)
    }
    window.addEventListener('keydown', manejar)
    return () => window.removeEventListener('keydown', manejar)
  })

  return (
    <div className="mx-auto max-w-[420px] space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">
          {t('entre.j.ahorcado.racha', 'Racha')}: {racha}
          <span className="ml-2 text-white/45">
            {t('entre.j.mejor', 'Mejor')}: {record}
          </span>
        </span>
        <button type="button" onClick={siguiente} className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold hover:bg-white/20">
          <Icono nombre="sincronizar" /> {t('entre.j.ahorcado.otra', 'Otra palabra')}
        </button>
      </div>

      <div className="flex items-center justify-center gap-4 rounded-xl bg-white/5 p-3">
        <svg viewBox="0 0 120 140" className="h-36 w-28 shrink-0 stroke-white/70" fill="none" strokeWidth="4" strokeLinecap="round">
          {/* Horca */}
          <path d="M10 130 H70 M30 130 V15 M30 15 H85 M85 15 V32" className="stroke-white/35" />
          {/* Muñeco: una parte por fallo */}
          {fallos >= 1 && <circle cx="85" cy="45" r="13" />}
          {fallos >= 2 && <path d="M85 58 V95" />}
          {fallos >= 3 && <path d="M85 66 L65 82" />}
          {fallos >= 4 && <path d="M85 66 L105 82" />}
          {fallos >= 5 && <path d="M85 95 L68 118" />}
          {fallos >= 6 && <path d="M85 95 L102 118" />}
        </svg>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-xs text-white/45">
            {t('entre.j.ahorcado.fallos', 'Fallos')}: {fallos} / {MAX_FALLOS}
          </p>
          <p className="flex flex-wrap gap-1.5 text-xl font-black tracking-wide">
            {palabra.split('').map((c, i) => {
              const visible = terminado || usadas.has(normalizar(c))
              return (
                <span key={i} className={`border-b-2 px-0.5 ${visible ? 'border-transparent' : 'border-white/40'}`}>
                  <span className={visible ? (perdido && !usadas.has(normalizar(c)) ? 'text-red-400' : '') : 'invisible'}>{c}</span>
                </span>
              )
            })}
          </p>
          {ganado && (
            <p className="text-sm font-bold" style={{ color: COLOR }}>
              {t('entre.j.ganaste', '¡Ganaste! 🎉')}
            </p>
          )}
          {perdido && <p className="text-sm font-bold text-red-400">{t('entre.j.ahorcado.perdiste', 'Perdiste esta ronda')}</p>}
          {terminado && (
            <button type="button" onClick={siguiente} className="rounded-lg px-3 py-1.5 text-sm font-bold text-black" style={{ background: COLOR }}>
              {t('entre.j.ahorcado.siguiente', 'Siguiente palabra')}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-9 gap-1">
        {LETRAS.map((l) => {
          const usada = usadas.has(l)
          const acierto = usada && letrasPalabra.has(l)
          return (
            <button
              key={l}
              type="button"
              onClick={() => probar(l)}
              disabled={usada || terminado}
              className={`rounded-md py-1.5 text-sm font-bold disabled:opacity-90 ${
                !usada ? 'bg-white/10 hover:bg-white/20 disabled:opacity-35' : acierto ? 'bg-emerald-500/40' : 'bg-red-500/30 text-white/40'
              }`}
            >
              {l}
            </button>
          )
        })}
      </div>
    </div>
  )
}
