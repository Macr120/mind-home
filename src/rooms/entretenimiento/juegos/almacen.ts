// Récords y saldo del casino de los juegos de la sala.
// Datos ligeros de minijuego: viven en localStorage, no en la db.
const PREFIJO = 'mh-juegos-'

export function leerNumero(clave: string, defecto = 0): number {
  const crudo = localStorage.getItem(PREFIJO + clave)
  const n = crudo == null ? NaN : Number(crudo)
  return Number.isFinite(n) ? n : defecto
}

function guardarNumero(clave: string, valor: number) {
  localStorage.setItem(PREFIJO + clave, String(valor))
}

/** Guarda `valor` solo si mejora el récord actual y devuelve el récord vigente. */
export function guardarRecord(clave: string, valor: number, menorEsMejor = false): number {
  const actual = leerNumero(clave, menorEsMejor ? Infinity : 0)
  const mejor = menorEsMejor ? Math.min(actual, valor) : Math.max(actual, valor)
  if (Number.isFinite(mejor)) guardarNumero(clave, mejor)
  return mejor
}

export const SALDO_INICIAL = 500

/** Saldo de fichas compartido entre blackjack y ruleta. */
export function leerSaldo(): number {
  return leerNumero('casino-saldo', SALDO_INICIAL)
}

export function guardarSaldo(valor: number) {
  guardarNumero('casino-saldo', valor)
}

export function formatearTiempo(segundos: number): string {
  const m = Math.floor(segundos / 60)
  const s = segundos % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
