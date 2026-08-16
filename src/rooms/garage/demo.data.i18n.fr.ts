/**
 * Rama «fr» del año demo de garage. Solo se descarga si el usuario
 * está en ese idioma (el índice `demo.data.i18n.ts` la carga con import()).
 *
 * Las frases se traducen en `traducciones/garage.fr.json`; este
 * archivo lo montan `partir-demo-i18n.mjs` / `traducir-a-mano.mjs meter` —
 * no lo edites a mano.
 */
export default {
  "vehiculos": {
    "biciNombre": "La Grulla",
    "biciNota": "Vélo en acier d’occasion, gris et un peu bruyant, qui m’emmène au travail, au labo et à l’entraînement tous les jours. En un an, il ne m’a jamais laissé en plan.",
    "autoNombre": "El Mastodonte",
    "autoNota": "Berline héritée de mon oncle, plus vieille que moi, avec un tableau de bord décoloré par le soleil. Je la démarre une fois toutes les deux semaines, et elle me fait payer chaque oubli avec intérêts."
  },
  "servicios": [
    {
      "dia": -350,
      "vehiculo": "bici",
      "tipo": "revision",
      "titulo": "Sauvetage de la cave",
      "nota": "Je l’ai sorti de la cave avec les pneus à plat et la chaîne toute rouillée ; une demi-après-midi de chiffon, d’air et d’huile pour qu’il roule à nouveau."
    },
    {
      "dia": -336,
      "vehiculo": "auto",
      "tipo": "aceite",
      "titulo": "Vidange très en retard",
      "nota": "Elle est sortie noire comme du café froid, et le mécanicien a juste haussé les sourcils, sa façon à lui de me gronder."
    },
    {
      "dia": -318,
      "vehiculo": "bici",
      "tipo": "llantas",
      "titulo": "Chambre à air neuve et rustine",
      "nota": "Crevaison rue Doctor Vértiz en allant au café ; j’ai appris à changer une chambre à air sur le trottoir, tard mais je l’ai appris."
    },
    {
      "dia": -300,
      "vehiculo": "auto",
      "tipo": "bateria",
      "titulo": "Nouvelle batterie",
      "nota": "À force de ne pas s’en servir, elle est morte toute seule ; j’ai demandé un démarrage à un voisin puis foncé acheter une batterie."
    },
    {
      "dia": -284,
      "vehiculo": "bici",
      "tipo": "cadena",
      "titulo": "Chaîne enfin propre",
      "nota": "Dégraissage et lubrification tranquille un dimanche : elle a arrêté de grincer comme une vieille charnière, et le pédalage est même plus léger."
    },
    {
      "dia": -252,
      "vehiculo": "auto",
      "tipo": "frenos",
      "titulo": "Plaquettes avant",
      "nota": "Elles grinçaient à chaque feu rouge, impossible de faire comme si de rien n’était ; ça a mangé la moitié de ma paie, mais j’ai dormi tranquille."
    },
    {
      "dia": -236,
      "vehiculo": "bici",
      "tipo": "frenos",
      "titulo": "Patins de frein neufs",
      "nota": "Avec la pluie, je freinais deux mètres trop tard, alors j’ai changé les patins et réglé les câbles."
    },
    {
      "dia": -190,
      "vehiculo": "bici",
      "tipo": "llantas",
      "titulo": "Crevaison en allant au labo",
      "nota": "Un bout de verre sur Eje 8, et je suis arrivé au labo vingt minutes en retard, en poussant le vélo."
    },
    {
      "dia": -178,
      "vehiculo": "auto",
      "tipo": "otro",
      "titulo": "En panne sur Calzada de Tlalpan",
      "nota": "La voiture a calé en pleine avenue un mardi soir, et j’ai passé une heure et demie sur le trottoir à attendre la dépanneuse, à faire les comptes d’un argent que je n’avais pas ; c’est là que tout le mois m’est tombé dessus d’un coup."
    },
    {
      "dia": -150,
      "vehiculo": "bici",
      "tipo": "revision",
      "titulo": "Révision complète",
      "nota": "Avec le genou en kiné, je ne pouvais pas courir, alors j’ai consacré ce temps au vélo : roues dévoilées, câbles et tout bien resserré."
    },
    {
      "dia": -140,
      "vehiculo": "auto",
      "tipo": "filtros",
      "titulo": "Filtres après la frayeur",
      "nota": "J’ai changé le filtre à air et le filtre à essence par pure paranoïa ; je préfère payer ça que d’attendre encore une dépanneuse."
    },
    {
      "dia": -88,
      "vehiculo": "bici",
      "tipo": "cadena",
      "titulo": "Chaîne distendue, changée",
      "nota": "Avec le plan semi-marathon, je l’utilise tous les jours, et la chaîne patinait déjà au démarrage."
    },
    {
      "dia": -64,
      "vehiculo": "bici",
      "tipo": "transmision",
      "titulo": "Cassette et câbles neufs",
      "nota": "Les vitesses sautaient en montée ; avec la nouvelle cassette, je peux enfin faire confiance au petit plateau."
    },
    {
      "dia": -46,
      "vehiculo": "auto",
      "tipo": "aceite",
      "titulo": "Vidange et révision générale",
      "nota": "Entretien normal et sans surprise, ce qui avec cette voiture compte déjà comme une bonne nouvelle."
    },
    {
      "dia": -27,
      "vehiculo": "bici",
      "tipo": "frenos",
      "titulo": "Freins avant le marathon",
      "nota": "Réglage rapide, parce que ces semaines-là le vélo était mon seul moyen de transport et je ne voulais aucun prétexte."
    },
    {
      "dia": -8,
      "vehiculo": "auto",
      "tipo": "lavado",
      "titulo": "Lavage avant la visite de la famille",
      "nota": "Je l’ai lavée et aspirée pour aller chercher ma famille à la gare routière : ça ne répare rien de mécanique, mais ça change tout."
    }
  ],
  "talleres": [
    {
      "clave": "taller",
      "nombre": "Taller Mecánico Rivas",
      "direccion": "Av. Cuauhtémoc 812, Col. Narvarte, Benito Juárez",
      "notas": "Don Rivas m’explique ce qui est vraiment urgent et ce qui peut attendre, et il n’a jamais gonflé une facture ; c’est le seul en qui j’ai confiance pour cette voiture."
    },
    {
      "clave": "aseguradora",
      "nombre": "Seguros Meridiano - agente Nadia Ortega",
      "direccion": "Av. Insurgentes Sur 1234, 3e étage, Col. Del Valle",
      "notas": "Nadia répond sur WhatsApp même le dimanche, et elle m’a mis en place des paiements mensuels quand je suis passé à la couverture tous risques."
    },
    {
      "clave": "verificentro",
      "nombre": "Verificentro 09-118 Iztaccíhuatl",
      "direccion": "Calz. Iztaccíhuatl 240, Col. Iztaccíhuatl, Benito Juárez",
      "notas": "Rendez-vous à sept heures du matin, et je ressors en quarante minutes ; celui de Coyoacán m’a coûté une demi-matinée de queue."
    },
    {
      "clave": "ciclos",
      "nombre": "Ciclos Malinche",
      "direccion": "Zacatecas 145, Col. Roma Sur, Cuauhtémoc",
      "notas": "C’est là que j’ai acheté le vélo et là que je le fais réviser ; ils me prêtent des outils et m’apprennent à le faire moi-même au lieu de me facturer chaque chose."
    },
    {
      "clave": "grua",
      "nombre": "Grúas Tepeyac 24 horas",
      "direccion": "Base à Eje Central Lázaro Cárdenas 1105, Col. Álamos",
      "notas": "C’est le numéro que j’ai composé la nuit de la panne ; ils sont arrivés en une heure et demie et n’ont pas essayé de m’arnaquer sur le prix."
    }
  ],
  "tramites": [
    {
      "clave": "verificacion",
      "titulo": "Contrôle antipollution semestriel",
      "nota": "Ça tombe selon ma vignette, et je prends toujours rendez-vous la première semaine : si je rate le coche, l’amende fait plus mal que la démarche."
    },
    {
      "clave": "seguro",
      "titulo": "Renouvellement de l’assurance",
      "nota": "Cette année, je suis passé à la couverture tous risques avec Nadia après la frayeur de la panne ; je paie en mensualités et je l’intègre au budget de chaque quinzaine."
    },
    {
      "clave": "tenencia",
      "titulo": "Taxe automobile annuelle",
      "nota": "Je la paie dans les premiers mois de l’année pour profiter de la réduction et me débarrasser de cette corvée."
    },
    {
      "clave": "circulacion",
      "titulo": "Changement de propriétaire et carte grise",
      "nota": "La carte grise est encore au nom de mon oncle, et il est temps de régulariser ça avant que ça me pose problème à un contrôle."
    },
    {
      "clave": "afinacionBici",
      "titulo": "Révision du vélo",
      "nota": "Tous les six mois chez Ciclos Malinche : dévoilage des roues, câbles et freins, ce qui revient bien moins cher que de réparer une roue voilée."
    }
  ]
}
