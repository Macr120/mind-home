/**
 * Rama «fr» del año demo de biblioteca. Solo se descarga si el usuario
 * está en ese idioma (el índice `demo.data.i18n.ts` la carga con import()).
 *
 * Las frases se traducen en `traducciones/biblioteca.fr.json`; este
 * archivo lo montan `partir-demo-i18n.mjs` / `traducir-a-mano.mjs meter` —
 * no lo edites a mano.
 */
export default {
  "entradas": [
    {
      "dia": -358,
      "tema": "nat-mecanica",
      "titulo": "Les trois lois de Newton, relues calmement",
      "resumen": "Je les ai apprises au lycée et je jurais que je les connaissais. Faux : la première n’a rien d’évident, elle dit que le mouvement n’a besoin d’aucune cause, c’est le changement qui en a besoin. Ça m’est devenu clair en freinant à vélo et en sentant mon sac continuer sa route.",
      "puntosClave": [
        "Sans force nette, l’état de mouvement se maintient, pas seulement le repos",
        "F = ma parle de la variation de la quantité de mouvement, pas de la vitesse qu’on a",
        "Action et réaction s’exercent sur des corps différents, c’est pour ça qu’elles ne s’annulent pas"
      ]
    },
    {
      "dia": -348,
      "tema": "mat-analisis",
      "titulo": "La dérivée comme vitesse instantanée",
      "resumen": "Je dérivais par recettes, en appliquant des règles sans y penser. Cette semaine j’ai enfin compris ce que ça mesure : de combien change une grandeur par unité de temps, à un instant précis. J’ai tracé la position de mon vélo sur le trajet vers le café, et la pente racontait toute l’histoire du parcours.",
      "puntosClave": [
        "C’est la limite du taux d’accroissement quand l’intervalle tend vers zéro",
        "La dérivée seconde, c’est l’accélération : la courbure du graphique",
        "Continue n’implique pas dérivable : sur un pic, il n’y a pas une seule pente"
      ]
    },
    {
      "dia": -336,
      "tema": "nat-mecanica",
      "titulo": "Travail et énergie : le raccourci qui sauve les exercices",
      "resumen": "J’ai découvert que beaucoup d’exercices que je résolvais avec trois équations s’effondrent tout seuls si j’utilise l’énergie. Pas besoin de connaître le détail du trajet, juste le début et la fin. C’est la première fois que la physique me paraît économique plutôt que fastidieuse.",
      "puntosClave": [
        "Seule la composante de la force dans la direction du mouvement travaille",
        "Théorème de l’énergie cinétique : le travail net est égal à la variation d’énergie cinétique",
        "Avec des forces conservatives, le chemin importe peu et l’énergie potentielle apparaît"
      ]
    },
    {
      "dia": -322,
      "tema": "nat-mecanica",
      "titulo": "Quantité de mouvement et chocs",
      "resumen": "La quantité de mouvement, c’est ce qui se conserve même quand l’énergie se perd en bruit et en chaleur. J’ai étudié le choc de deux chariots au labo et le nombre est tombé presque juste ; l’énergie cinétique, elle, a perdu un tiers en route. J’ai aimé voir une loi tenir bon là où une autre cède.",
      "puntosClave": [
        "p = mv, et la force est le taux de variation de la quantité de mouvement",
        "Dans tout choc, la quantité de mouvement totale du système se conserve",
        "Le centre de masse poursuit sa trajectoire comme si de rien n’était"
      ]
    },
    {
      "dia": -308,
      "tema": "nat-mecanica",
      "titulo": "Mouvement circulaire : qui courbe qui",
      "resumen": "Ça faisait des années que je croyais à la force centrifuge parce que je la sens en prenant un virage à vélo. Elle n’existe pas dans un référentiel inertiel : ce qu’il y a, c’est du frottement qui pousse vers le centre et mon corps qui veut continuer tout droit. Le comprendre a même changé ma façon de m’incliner dans les virages.",
      "puntosClave": [
        "L’accélération centripète pointe vers le centre et vaut v²/r",
        "La sensation d’être projeté vers l’extérieur, c’est de l’inertie, pas une vraie force",
        "Sans assez de frottement, la trajectoire redevient droite : c’est exactement ce qu’est un dérapage"
      ]
    },
    {
      "dia": -296,
      "tema": "nat-mecanica",
      "titulo": "Moment cinétique et l’astuce de la patineuse",
      "resumen": "Le grand classique de la patineuse qui tourne plus vite en resserrant les bras, mais enfin avec des chiffres. L’énergie n’apparaît pas de nulle part : c’est elle qui fournit le travail en ramenant ses bras vers l’intérieur. Laika fait quelque chose de semblable quand elle se tord en l’air en tombant.",
      "puntosClave": [
        "L = Iω, et le moment d’inertie dépend de la façon dont la masse est répartie",
        "Sans couple externe, le moment cinétique total se conserve",
        "Tourner plus vite avec moins d’inertie coûte bel et bien de l’énergie : quelqu’un doit la fournir"
      ]
    },
    {
      "dia": -284,
      "tema": "nat-mecanica",
      "titulo": "L’oscillateur harmonique est partout",
      "resumen": "Ressort, pendule, corde, atome dans un réseau : suffisamment près de l’équilibre, tout oscille de la même façon. C’est le problème que j’ai résolu le plus de fois cette année et celui qui me fatigue le moins. C’est là que j’ai commencé à soupçonner que la physique recycle quelques idées sous des tas de déguisements.",
      "puntosClave": [
        "Une force de rappel proportionnelle au déplacement donne une solution sinusoïdale",
        "Pour de petites amplitudes, la période ne dépend pas de l’amplitude",
        "Avec du frottement apparaît l’amortissement ; avec une excitation forcée, la résonance"
      ]
    },
    {
      "dia": -272,
      "tema": "nat-termodinamica",
      "titulo": "Loi zéro : ce qu’est vraiment la température",
      "resumen": "La thermodynamique commence, et la première loi que je vois est celle qui n’a même pas de vrai numéro. Elle dit quelque chose de simple et de nécessaire : si A est en équilibre avec C, et B aussi, alors A et B le sont entre eux. C’est ce qui permet à un thermomètre de vouloir dire quelque chose.",
      "puntosClave": [
        "L’équilibre thermique est transitif, et c’est ça qui définit la température",
        "Température n’est pas chaleur : l’une est un état, l’autre de l’énergie en transit",
        "L’échelle absolue en kelvin évite l’absurdité des températures négatives"
      ]
    },
    {
      "dia": -258,
      "tema": "nat-termodinamica",
      "titulo": "Premier principe : la comptabilité de l’énergie",
      "resumen": "ΔU = Q − W, c’est essentiellement un livre de comptes où rien ne se perd. Ce qui m’a donné du mal, c’est que U ne dépend que de l’état, alors que Q et W dépendent du chemin pris pour y arriver. Comme mon budget : le solde est le solde, mais la façon d’y arriver n’est pas indifférente.",
      "puntosClave": [
        "L’énergie interne est une fonction d’état ; la chaleur et le travail, non",
        "Boucler un cycle ramène U à son point de départ, mais pas la dépense engagée",
        "Aucune machine ne restitue plus d’énergie qu’elle n’en consomme"
      ]
    },
    {
      "dia": -244,
      "tema": "nat-termodinamica",
      "titulo": "Théorie cinétique et la distribution des vitesses",
      "resumen": "La pression cesse d’être un simple nombre dans l’énoncé et devient des millions de chocs par seconde. Le plus beau, c’est la queue de la distribution : il y a toujours des molécules bien plus rapides que la moyenne. C’est pour ça que le café s’évapore sans avoir besoin de bouillir.",
      "puntosClave": [
        "La pression vient du transfert de quantité de mouvement lors des chocs contre la paroi",
        "La température suit l’énergie cinétique moyenne, pas celle d’une molécule isolée",
        "La queue rapide de Maxwell-Boltzmann explique l’évaporation"
      ]
    },
    {
      "dia": -230,
      "tema": "nat-termodinamica",
      "titulo": "L’entropie sans mysticisme",
      "resumen": "J’ai refusé de me contenter du slogan comme quoi l’entropie, c’est le désordre. Avec la définition de Boltzmann, je l’ai vue comme un comptage : combien de configurations microscopiques donnent le même état que celui que j’observe. Ranger ma chambre ne viole rien, ça se contente d’exporter le désordre sous forme de chaleur.",
      "puntosClave": [
        "Définition thermodynamique : dS égale la chaleur réversible δQ divisée par T",
        "Définition statistique : S = k ln Ω, littéralement un comptage de micro-états",
        "Le second principe donne une flèche du temps, il n’interdit pas l’ordre local"
      ]
    },
    {
      "dia": -216,
      "tema": "nat-termodinamica",
      "titulo": "Carnot et le plafond que personne ne dépasse",
      "resumen": "Un cycle impossible à construire, mais qui sert à savoir jusqu’où peut aller n’importe quel moteur réel. Le rendement ne dépend que des deux températures, et c’est d’une pureté presque brutale. J’ai aimé découvrir que la physique tire des idées utiles précisément de ses fictions.",
      "puntosClave": [
        "Rendement maximal : 1 − Tfroide/Tchaude, en températures absolues",
        "Aucune machine réelle ne dépasse Carnot entre les deux mêmes sources",
        "La réversibilité exige une lenteur infinie : c’est pour ça que ce n’est qu’une limite"
      ]
    },
    {
      "dia": -200,
      "tema": "nat-termodinamica",
      "titulo": "Chaleur latente, ou pourquoi la vapeur chauffe si vite",
      "resumen": "J’ai étudié les changements de phase et d’un coup mon travail a eu de la théorie derrière lui. En se condensant, la vapeur cède une quantité folle d’énergie sans que sa température baisse, et c’est pour ça que le lait passe de froid à prêt en vingt secondes. Maintenant je surveille le thermomètre en pensant au diagramme de phases.",
      "puntosClave": [
        "Pendant un changement de phase, l’énergie s’absorbe sans que la température monte",
        "La chaleur latente de vaporisation est bien plus grande que celle de fusion",
        "Le diagramme de phases et le point triple mettent tout le tableau en ordre"
      ]
    },
    {
      "dia": -190,
      "tema": "mat-stats",
      "titulo": "Incertitudes : ce que le labo m’a forcé à apprendre",
      "resumen": "On m’a fait perdre des points pour avoir écrit 9,81734 m/s² alors que mon chronomètre était mon propre pouce. L’incertitude n’est pas une décoration à la fin du rapport, elle fait partie du résultat. Depuis, je commence chaque labo en me demandant d’où vient l’erreur, plutôt que d’y penser à la fin.",
      "puntosClave": [
        "L’erreur aléatoire diminue en répétant la mesure ; l’erreur systématique, non",
        "Pour des variables indépendantes, les erreurs s’additionnent en quadrature",
        "Les chiffres significatifs ne doivent pas promettre plus de précision qu’il n’y en a"
      ]
    },
    {
      "dia": -168,
      "tema": "mat-stats",
      "titulo": "Moindres carrés : ajuster sans se mentir",
      "resumen": "Trois semaines sans courir à cause du genou m’ont donné de longues après-midis de bureau. J’ai appris qu’un R² élevé peut très bien accompagner un ajustement catastrophique si le modèle est faux. Ce qui trahit vraiment, c’est de regarder les résidus et de voir s’ils se moquent de toi en dessinant une courbe.",
      "puntosClave": [
        "On minimise la somme des carrés des résidus",
        "Un khi carré réduit proche de 1 indique des barres d’erreur bien estimées",
        "Les résidus doivent avoir l’air aléatoires : le moindre motif est un indice"
      ]
    },
    {
      "dia": -148,
      "tema": "nat-relatividad",
      "titulo": "Les deux postulats et le casse-tête de la simultanéité",
      "resumen": "La relativité commence, et ce qui est étrange, ce ne sont pas les formules, c’est d’accepter que deux événements simultanés pour moi ne le soient pas pour quelqu’un qui passe en train. Les postulats sont courts, presque têtus, et tout le reste en découle. J’ai passé une après-midi entière à dessiner des trains et des lampes de poche.",
      "puntosClave": [
        "Les lois de la physique sont les mêmes dans tout référentiel inertiel",
        "La vitesse de la lumière est la même pour tout observateur",
        "La simultanéité n’est pas absolue : elle dépend de l’état de mouvement"
      ]
    },
    {
      "dia": -132,
      "tema": "nat-relatividad",
      "titulo": "Dilatation du temps et les muons qui ne devraient pas arriver",
      "resumen": "Le cas des muons cosmiques m’a convaincu plus que n’importe quelle démonstration. Avec leur demi-vie, ils devraient se désintégrer avant de toucher le sol, et pourtant on les détecte. Selon qui regarde, soit leur horloge tourne au ralenti, soit l’atmosphère se contracte, et les deux versions donnent le même nombre.",
      "puntosClave": [
        "Le facteur gamma ne grimpe vite qu’à l’approche de la vitesse de la lumière",
        "Dilatation du temps et contraction des longueurs racontent la même histoire vue de deux côtés",
        "Ce n’est pas une illusion de mesure : ce sont de vraies horloges qui indiquent des heures différentes"
      ]
    },
    {
      "dia": -90,
      "tema": "nat-relatividad",
      "titulo": "Minkowski : ce que tout le monde mesure pareil",
      "resumen": "Après le voyage, je suis retourné à mes notes et l’espace-temps s’est enfin mis en place. Si le temps et l’espace s’étirent selon l’observateur, quelque chose doit rester invariant, et ce quelque chose, c’est l’intervalle. Avec ça, E = mc² cesse d’être un slogan de t-shirt et devient un cas particulier.",
      "puntosClave": [
        "L’intervalle entre deux événements est le même pour tous les observateurs",
        "L’énergie et la quantité de mouvement forment un seul quadrivecteur",
        "La masse ne se convertit pas en énergie : elle est l’énergie au repos du système"
      ]
    },
    {
      "dia": -72,
      "tema": "nat-mecanica",
      "titulo": "Pourquoi un piano sonne comme un piano",
      "resumen": "Ça fait dix mois que je joue, et cette semaine j’ai étudié ce qui se passe à l’intérieur de la corde. Le timbre n’est pas dans la note, il est dans le mélange d’harmoniques et dans les premières millisecondes du coup de marteau. La meilleure découverte : les cordes réelles sont rigides, et c’est pour ça qu’on les accorde étirées.",
      "puntosClave": [
        "Une corde fixée vibre selon des modes : fondamentale plus harmoniques supérieures",
        "Le timbre dépend du mélange d’amplitudes et de l’attaque, pas seulement de la fréquence",
        "L’inharmonicité de la corde réelle oblige l’accordeur à étirer les octaves"
      ],
      "foto": "ondas"
    },
    {
      "dia": -52,
      "tema": "nat-relatividad",
      "titulo": "Trous noirs : l’horizon n’est pas un mur",
      "resumen": "J’ai travaillé la métrique de Schwarzschild calmement et calculé le rayon pour le Soleil, pour la Terre et, pour rire, pour Laika. L’horizon n’est pas une surface qu’on pourrait toucher : c’est le point au-delà duquel aucune trajectoire ne revient. Ce qui me déstabilise le plus, c’est que vu de loin, on ne voit jamais vraiment quelqu’un arriver au bout de sa chute.",
      "puntosClave": [
        "Le rayon de Schwarzschild est proportionnel à la masse de l’objet",
        "L’horizon est une frontière causale, pas un objet matériel",
        "Pour un observateur lointain, la chute semble se figer et rougir"
      ],
      "foto": "agujero-negro"
    },
    {
      "dia": -40,
      "tema": "nat-relatividad",
      "titulo": "Des vies d’étoiles dans un seul diagramme",
      "resumen": "Le diagramme de Hertzsprung-Russell ressemble à un vilain nuage de points jusqu’à ce qu’on comprenne que c’est un recensement de destins. Une étoile, c’est un très long bras de fer entre la gravité qui écrase et la pression qui résiste. Et ce qui décide de la fin, c’est la masse, presque rien d’autre.",
      "puntosClave": [
        "Équilibre hydrostatique : gravité vers l’intérieur, pression vers l’extérieur",
        "La masse initiale détermine le rythme de fusion et le dénouement",
        "La séquence principale, c’est là où les étoiles passent presque toute leur vie"
      ]
    },
    {
      "dia": -26,
      "tema": "nat-cuantica",
      "titulo": "Corps noir : là où la physique classique s’est brisée",
      "resumen": "J’ai commencé à lire de la quantique en autodidacte pour la candidature de master et je suis tombé sur le problème du corps noir. La théorie classique prédisait une énergie infinie dans l’ultraviolet, ce qui est une façon élégante de dire qu’elle avait tort. Planck a quantifié par désespoir et ça a marché ; ça me console de savoir que les grandes idées commencent souvent comme des rustines.",
      "puntosClave": [
        "La prédiction classique diverge à haute fréquence : la catastrophe ultraviolette",
        "Planck a supposé une énergie en paquets proportionnels à la fréquence",
        "La constante h est apparue en mesurant des spectres thermiques, pas en philosophant"
      ]
    },
    {
      "dia": -8,
      "tema": "mat-stats",
      "titulo": "Bayes, ou comment mettre à jour ce que je crois",
      "resumen": "Je l’ai laissé pour la fin de l’année, et j’aurais aimé le voir avant mon premier labo. L’idée est simple : je pars de ce que je croyais, je le confronte aux données, et je garde une version mise à jour. En astrophysique, on s’en sert tout le temps pour ajuster des modèles avec peu de données et beaucoup de bruit.",
      "puntosClave": [
        "La probabilité a posteriori est proportionnelle à la vraisemblance fois la probabilité a priori",
        "Déclarer son a priori, ce n’est pas tricher : le cacher, si",
        "Avec beaucoup de données, l’a priori pèse de moins en moins"
      ]
    }
  ],
  "charlas": [
    {
      "dia": -300,
      "titulo": "Pourquoi la quantité de mouvement se conserve",
      "pregunta": "Je sais par cœur que la quantité de mouvement se conserve dans les chocs, mais je ne comprends pas pourquoi. C’est une loi à part ou ça se déduit de celles de Newton ?",
      "respuesta": "Ça vient de Newton : si deux corps ne font que se pousser l’un l’autre, les forces sont égales et opposées, donc ce que l’un gagne en quantité de mouvement, l’autre le perd. La somme ne change pas parce qu’il n’y a aucune force extérieure au système. Ce qui compte, c’est comment tu délimites le système : si tu laisses de côté le sol ou le mur, une quantité de mouvement va sembler disparaître. Et il y a une raison plus profonde : la conservation de la quantité de mouvement équivaut à dire que les lois de la physique sont les mêmes ici et un mètre plus loin.",
      "ramas": [
        "Symétries et théorème de Noether",
        "Chocs inélastiques"
      ]
    },
    {
      "dia": -226,
      "titulo": "L’entropie sans le mot désordre",
      "pregunta": "Toutes les vidéos me disent que l’entropie, c’est le désordre, mais alors je ne comprends pas comment je peux ranger ma chambre sans violer le second principe. C’est quoi, vraiment ?",
      "respuesta": "Pense comptage, pas esthétique : l’entropie mesure combien de configurations microscopiques sont compatibles avec ce que tu observes à grande échelle. Un état qui peut se réaliser de beaucoup de façons différentes est simplement plus probable, et c’est pour ça que les systèmes évoluent dans cette direction. Quand tu ranges ta chambre, tu réduis l’entropie de cette petite région, mais ton corps dissipe de la chaleur dans l’air et le bilan total augmente. Le second principe parle de l’univers entier, pas de chaque coin séparément.",
      "ramas": [
        "Micro-états et probabilité",
        "Démon de Maxwell"
      ]
    },
    {
      "dia": -170,
      "titulo": "Savoir si mon ajustement tient la route",
      "pregunta": "Dans mon rapport de labo, j’obtiens un R² de 0,99, mais la droite ne passe pas par la moitié de mes barres d’erreur. Lequel des deux chiffres je dois croire ?",
      "respuesta": "Aucun des deux pris isolément. R² dit seulement quelle part de la variation tu expliques, et avec une large plage de données il s’envole même si le modèle est faux. Ce qui t’intéresse, c’est le khi carré réduit, qui compare les résidus à tes incertitudes : s’il est bien supérieur à 1, soit le modèle est faux, soit tu as sous-estimé les erreurs. Et avant tout, trace les résidus : s’ils dessinent une courbe, il te manque un terme.",
      "ramas": [
        "Khi carré réduit",
        "Lire les résidus"
      ]
    },
    {
      "dia": -85,
      "titulo": "Pourquoi un piano sonne comme un piano",
      "pregunta": "Je joue un la sur mon clavier et sur le piano droit de l’école, et ça sonne complètement différent alors que c’est la même note. Qu’est-ce qui change physiquement ?",
      "respuesta": "La fréquence fondamentale est identique, mais ce que ton oreille appelle « son », c’est le paquet complet : le mélange d’harmoniques supérieures et la façon dont il évolue dans le temps. Sur un vrai piano, la corde est rigide, donc ses harmoniques ne tombent pas sur des multiples exacts, ce qui donne cette brillance caractéristique. L’attaque compte aussi énormément, ces premières millisecondes de marteau et de bruit de mécanique, qu’un clavier bon marché simplifie. Si tu enregistres les deux notes et que tu regardes le spectre, la différence se voit avant de s’entendre.",
      "ramas": [
        "Inharmonicité de la corde",
        "Tempérament égal"
      ]
    },
    {
      "dia": -30,
      "titulo": "Quoi réviser pour le master",
      "pregunta": "Je veux candidater à un master en astrophysique et j’ai peur que ma base en relativité générale soit d’amateur. Par où je commence pour combler ça ?",
      "respuesta": "Avec ce que tu as, tu peux déjà commencer : relativité restreinte solide, mécanique lagrangienne et statistique des données, c’est la vraie base du quotidien. Avant de te lancer dans les tenseurs à l’arrache, consacre quelques semaines à un minimum de géométrie différentielle et à une métrique de Schwarzschild bien travaillée. Pour la candidature, un petit projet fini pèse plus qu’une longue liste de sujets survolés : ton ajustement de courbes de lumière vaut plus que tu ne le penses. Et choisis ton groupe pour la personne qui va t’encadrer, pas seulement pour le nom de l’institut.",
      "ramas": [
        "Calcul tensoriel minimal",
        "Choisir un encadrant et un groupe"
      ]
    }
  ],
  "notasEstudio": [
    {
      "dia": -360,
      "nota": "Deux heures de cinématique après le service ; je me suis endormi sur le cahier, mais les diagrammes du corps libre sont faits."
    },
    {
      "dia": -330,
      "nota": "Plan incliné avec frottement : je comprends la physique, ce sont les signes qui me perdent."
    },
    {
      "dia": -310,
      "nota": "Première séance d’exercices avec Marta, de la fac : trois sur cinq justes, bien mieux que tout seul."
    },
    {
      "dia": -286,
      "nota": "Oscillateur harmonique à la bibliothèque jusqu’à la fermeture ; j’ai trouvé la solution sans ouvrir le livre."
    },
    {
      "dia": -262,
      "nota": "La thermodynamique démarre : j’ai lu la loi zéro et le premier principe deux fois, la seconde avec du sens."
    },
    {
      "dia": -240,
      "nota": "Exercices de gaz parfaits entre deux commandes ; le cahier a fini par sentir le café."
    },
    {
      "dia": -212,
      "nota": "Examen blanc : huit exercices sur dix, et j’ai raté celui de Carnot à cause de l’arithmétique, pas de la théorie."
    },
    {
      "dia": -195,
      "nota": "Partiel de thermo rendu ; je suis sorti avec la sensation étrange de l’avoir vraiment compris."
    },
    {
      "dia": -172,
      "nota": "Genou sous la glace, après-midi entière sur les moindres carrés : si je ne peux pas courir, autant avancer ici."
    },
    {
      "dia": -150,
      "nota": "La relativité commence : une demi-heure de cours enregistré et une heure à dessiner des trains et des horloges."
    },
    {
      "dia": -130,
      "nota": "Révisé les transformations de Lorentz et fermé le classeur jusqu’au retour du voyage."
    },
    {
      "dia": -88,
      "nota": "Retour aux études avec le décalage horaire : relu mes notes d’avant le voyage sans comprendre ma propre écriture."
    },
    {
      "dia": -70,
      "nota": "Moitié séance de physique du son, moitié à accorder le clavier ; je compte ça comme réviser."
    },
    {
      "dia": -50,
      "nota": "Métrique de Schwarzschild prise lentement ; calculé le rayon du Soleil et, pour le plaisir, celui de Laika."
    },
    {
      "dia": -30,
      "nota": "Corps noir et Planck : je vois enfin où la thermo classique se brisait."
    },
    {
      "dia": -14,
      "nota": "Révision générale pour le partiel final et premier brouillon de la lettre de motivation."
    },
    {
      "dia": -6,
      "nota": "Courte séance de statistique bayésienne et liste d’articles à lire pendant les vacances."
    }
  ],
  "metas": {
    "termo": "Boucler la thermodynamique avant le partiel",
    "posgrado": "Préparer la candidature de master en astrophysique"
  }
}
