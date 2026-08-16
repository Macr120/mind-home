import { normalizar } from './dispatcher'

/**
 * Capa LIGERA de la edición por chat: lo poco que la ruta caliente necesita de
 * `editorAcciones.ts` sin pagar sus 120 KB (las 54 tools + ~40 catálogos).
 * Gracias a este módulo, `editorAcciones` se carga con import() solo cuando el
 * mensaje de verdad huele a edición.
 */

/**
 * ¿El mensaje huele a edición/control de la casa? Red AMPLIA a propósito
 * (falso positivo = solo tokens de más; falso negativo = el modelo no podría
 * editar en ese turno): basta CUALQUIER verbo imperativo o sustantivo del
 * dominio para enviar las TOOLS_EDITOR. Se evalúa sobre el mensaje actual +
 * los últimos turnos del hilo (los follow-ups «ahora en azul» conservan tools
 * porque la confirmación previa del asistente menciona el tema).
 * Patrones sin tildes: operan sobre texto pasado por `normalizar()`.
 */
const RE_EDITOR_VERBOS =
  /\b(pinta\w*|cambia\w*|pon(le|te|er|me|gan)?|crea\w*|renombra\w*|elimina\w*|borra\w*|quita\w*|mueve|mover|agranda\w*|crece\w*|encoge\w*|achica\w*|apila\w*|coloca\w*|agrega\w*|anade\w*|abre|abrir|abreme|muestra\w*|activa\w*|desactiva\w*|enciende\w*|apaga\w*|sube\w*|baja\w*|reproduce|toca\w*|viste\w*|vestir|monta\w*|conduce|maneja\w*|construye|construir|decora\w*|riega|regar|cosecha\w*|alimenta\w*|redimensiona\w*|rota\w*|gira\w*|agrupa\w*|desagrupa\w*|edita\w*|personaliza\w*|dibuja\w*|jueg\w*|jugar|organiza\w*|resume\w*)\b/

const RE_EDITOR_TEMAS =
  /\b(cuartos?|habitacion\w*|recamaras?|casa|mapa|muros?|pared\w*|pisos?|suelo|techos?|tejado|objetos?|muebles?|inventario|avatar|personajes?|ropa|prendas?|atuendos?|guardarropa|color\w*|temas?|fondo|cielo|estacion\w*|idiomas?|ingles|espanol|interfaz|iconos?|emojis?|tipografia|fuente|letra|apariencia|claro|oscuro|transparente|vidrio|configuracion\w*|ajustes|preferencias|notificacion\w*|avisos?|respaldo|backup|bienvenida|tutorial\w*|musica|cancion\w*|volumen|camaras?|vistas?|isometric\w*|primera persona|tercera persona|vehiculos?|coche|carro|auto|moto|tren|ovni|nave|bici\w*|wrapped|resumen|huertos?|granjas?|cultivos?|canchas?|futbol|basquet|tenis|pistas?|carreras?|montana rusa|vias?|grafiti|efectos?|animacion\w*|paintball|marcadora|bolazos?|diagrama\w*|esquemas?|venn|organigrama|lluvia de ideas)\b/

export function hayIntencionEditor(textos: string[]): boolean {
  const n = normalizar(textos.join(' \n '))
  return RE_EDITOR_VERBOS.test(n) || RE_EDITOR_TEMAS.test(n)
}

/**
 * Último mapa de Ideas dibujado por `editor_mapa_ideas`. El ejecutor solo puede
 * devolver texto, así que el id viaja por aquí: quien acaba de llamar a la tool
 * lo RECOGE (se consume) para colgarlo del mensaje del asistente y enseñar la
 * miniatura en la conversación.
 */
let ultimoMapa: number | null = null

/** La llama SOLO `editorAcciones` (la tool que dibuja el mapa). */
export function marcarUltimoMapa(id: number): void {
  ultimoMapa = id
}

export function tomarUltimoMapa(): number | undefined {
  const v = ultimoMapa
  ultimoMapa = null
  return v ?? undefined
}
