/**
 * Texto-a-voz con la voz del navegador (speechSynthesis), sin backend. Las
 * voces disponibles dependen del sistema: se busca la del código BCP-47
 * exacto, luego una del mismo idioma y, si no hay, se deja el `lang` puesto
 * para que el motor decida. Nunca lanza: sin soporte simplemente no suena.
 */

export function hayTTS(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

// Algunos navegadores devuelven getVoices() vacío hasta el evento voiceschanged.
let voces: SpeechSynthesisVoice[] = []
if (hayTTS()) {
  const cargar = () => {
    voces = window.speechSynthesis.getVoices()
  }
  cargar()
  window.speechSynthesis.addEventListener?.('voiceschanged', cargar)
}

// Android reporta lang con guion bajo ('en_US').
const norm = (lang: string) => lang.replace('_', '-').toLowerCase()

export function hablar(texto: string, codigo: string) {
  if (!hayTTS() || !texto.trim()) return
  try {
    const synth = window.speechSynthesis
    synth.cancel() // corta la lectura anterior: una sola voz a la vez
    const u = new SpeechSynthesisUtterance(texto)
    u.lang = codigo
    if (!voces.length) voces = synth.getVoices()
    const objetivo = codigo.toLowerCase()
    const voz =
      voces.find((v) => norm(v.lang) === objetivo) ??
      voces.find((v) => norm(v.lang).startsWith(objetivo.slice(0, 2)))
    if (voz) u.voice = voz
    u.rate = 0.95
    synth.speak(u)
  } catch {
    // Bloqueado o sin voces: silencio, sin romper la UI.
  }
}
