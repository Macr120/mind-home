/**
 * Voz y vocabulario fijo de MPH para las traducciones automáticas.
 *
 * El glosario NO es decorativo: la interfaz se traduce en ~80 lotes por idioma
 * y cada lote es una llamada independiente, así que sin un término fijado de
 * antemano el modelo elegiría «meta» de tres maneras distintas según el lote.
 * Aquí se decide una vez y se repite en todos.
 */

/** Instrucciones comunes a los cuatro idiomas. */
export const VOZ = `Traduces la interfaz de Mind Planner Home (MPH), una app personal donde la
vida del usuario es una CASA ISOMÉTRICA 3D y cada cuarto es una mini-app:
cocina y nutrición, ejercicio, descanso, finanzas, aprendizaje, viajes,
mindfulness, agenda, ideas… Se acompaña de una gamificación suave (rachas,
insignias, un ascenso anual) y de asistentes que charlan con el usuario.

El tono es cálido y cercano, de alguien que acompaña sin sermonear: ni
corporativo ni infantil. Frases cortas, verbos directos.

REGLAS DURAS
1. Devuelve SOLO la traducción de cada texto. Nada de comentarios ni comillas
   añadidas.
2. Los marcadores entre llaves —{nombre}, {n}, {total}— se copian TAL CUAL,
   sin traducir, sin cambiar de nombre y sin añadir ni quitar ninguno.
3. «Mind Planner Home» y «MPH» no se traducen nunca.
4. No metas emojis. Si el original no lleva, la traducción tampoco.
5. Respeta el marcado del manual de comandos: los corchetes [así] y las llaves
   {así} delimitan partes de la frase y deben seguir delimitando lo mismo.
6. Conserva mayúsculas iniciales, signos finales y saltos de línea (\\n) del
   original.
7. Los textos de botón, pestaña y menú son ESTRECHOS: si el inglés cabe en una
   o dos palabras, la traducción también tiene que caber. Prefiere la palabra
   corta aunque pierdas un matiz.
8. Traduce el SENTIDO, no las palabras: si la frase española es idiomática,
   busca la expresión natural equivalente en tu idioma.`

/**
 * Un idioma de destino: cómo se le habla al usuario y qué palabra fija se usa
 * para cada concepto de la casa.
 *
 * Los términos van en español porque el español es el original; la columna de
 * la derecha es la palabra que debe aparecer en la traducción.
 */
export const IDIOMAS = {
  pt: {
    nombre: 'portugués de Brasil (pt-BR)',
    registro:
      'Trata al usuario de «você», nunca de «tu» ni de «o senhor». Portugués de BRASIL: ' +
      'usa el léxico brasileño (celular, tela, ônibus, café da manhã), no el europeo.',
    terminos: {
      casa: 'casa',
      cuarto: 'cômodo (NUNCA «quarto», que en portugués es solo el dormitorio)',
      mapa: 'mapa',
      plantilla: 'modelo',
      objeto: 'objeto',
      meta: 'meta',
      plan: 'plano',
      paso: 'passo',
      cronograma: 'cronograma',
      racha: 'sequência',
      insignia: 'emblema',
      rango: 'patente',
      nivel: 'nível',
      asistente: 'assistente',
      mascota: 'mascote',
      ámbito: 'âmbito',
      rutina: 'rotina',
      hábito: 'hábito',
      huerto: 'horta',
      granja: 'fazenda',
      cancha: 'quadra',
      recámara: 'quarto',
      despacho: 'escritório',
      anecdotario: 'diário de memórias',
      bitácora: 'diário de bordo',
      respaldo: 'backup',
      créditos: 'créditos',
      'ejemplo de fábrica': 'exemplo pronto',
    },
  },

  fr: {
    nombre: 'francés',
    registro:
      'Tutea al usuario: «tu», nunca «vous». Es una app personal, no una herramienta ' +
      'de empresa. Evita el anglicismo cuando exista la palabra francesa corriente.',
    terminos: {
      casa: 'maison',
      cuarto: 'pièce',
      mapa: 'plan',
      plantilla: 'modèle',
      objeto: 'objet',
      meta: 'objectif',
      plan: 'plan',
      paso: 'étape',
      cronograma: 'planning',
      racha: 'série',
      insignia: 'badge',
      rango: 'rang',
      nivel: 'niveau',
      asistente: 'assistant',
      mascota: 'mascotte',
      ámbito: 'domaine',
      rutina: 'routine',
      hábito: 'habitude',
      huerto: 'potager',
      granja: 'ferme',
      cancha: 'terrain',
      recámara: 'chambre',
      despacho: 'bureau',
      anecdotario: 'carnet de souvenirs',
      bitácora: 'journal de bord',
      respaldo: 'sauvegarde',
      créditos: 'crédits',
      'ejemplo de fábrica': 'exemple prêt à l’emploi',
    },
  },

  de: {
    nombre: 'alemán',
    registro:
      'Tutea al usuario: «du» y sus formas (dein, dir), nunca «Sie». Es una app ' +
      'personal. Sustantivos siempre en mayúscula, como manda la ortografía.',
    terminos: {
      casa: 'Haus',
      cuarto: 'Raum',
      mapa: 'Karte',
      plantilla: 'Vorlage',
      objeto: 'Objekt',
      meta: 'Ziel',
      plan: 'Plan',
      paso: 'Schritt',
      cronograma: 'Zeitplan',
      racha: 'Serie',
      insignia: 'Abzeichen',
      rango: 'Rang',
      nivel: 'Level',
      asistente: 'Assistent',
      mascota: 'Maskottchen',
      ámbito: 'Bereich',
      rutina: 'Routine',
      hábito: 'Gewohnheit',
      huerto: 'Gemüsegarten',
      granja: 'Bauernhof',
      cancha: 'Platz',
      recámara: 'Schlafzimmer',
      despacho: 'Arbeitszimmer',
      anecdotario: 'Erinnerungsbuch',
      bitácora: 'Logbuch',
      respaldo: 'Sicherung',
      créditos: 'Credits',
      'ejemplo de fábrica': 'fertiges Beispiel',
    },
  },

  it: {
    nombre: 'italiano',
    registro:
      'Da del «tu» al usuario, nunca del «Lei». Es una app personal. Evita el ' +
      'anglicismo cuando exista la palabra italiana corriente.',
    terminos: {
      casa: 'casa',
      cuarto: 'stanza',
      mapa: 'mappa',
      plantilla: 'modello',
      objeto: 'oggetto',
      meta: 'obiettivo',
      plan: 'piano',
      paso: 'passo',
      cronograma: 'programma',
      racha: 'serie',
      insignia: 'distintivo',
      rango: 'grado',
      nivel: 'livello',
      asistente: 'assistente',
      mascota: 'mascotte',
      ámbito: 'ambito',
      rutina: 'routine',
      hábito: 'abitudine',
      huerto: 'orto',
      granja: 'fattoria',
      cancha: 'campo',
      recámara: 'camera da letto',
      despacho: 'studio',
      anecdotario: 'diario dei ricordi',
      bitácora: 'diario di bordo',
      respaldo: 'backup',
      créditos: 'crediti',
      'ejemplo de fábrica': 'esempio pronto',
    },
  },
}

/** El system prompt completo de un idioma (estable: se cachea entre lotes). */
export function sistemaDe(id) {
  const idioma = IDIOMAS[id]
  if (!idioma) throw new Error(`idioma sin glosario: ${id}`)
  const glosario = Object.entries(idioma.terminos)
    .map(([es, destino]) => `  ${es} → ${destino}`)
    .join('\n')
  return `${VOZ}

IDIOMA DE DESTINO: ${idioma.nombre}

TRATAMIENTO
${idioma.registro}

GLOSARIO OBLIGATORIO (concepto en español → palabra que debes usar)
${glosario}

Cuando un texto use uno de estos conceptos, usa esa palabra y no un sinónimo:
la misma pantalla se traduce en tandas distintas y tienen que concordar.`
}
