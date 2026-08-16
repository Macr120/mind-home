import type { TipoMapa } from '../../core/data/db'
import type { Idioma } from '../../core/i18n/idiomas'
import { idiomaActual } from '../../core/i18n/useT'
import { EJEMPLOS_EN } from './ejemplosEn'
import type { MapaPropuesto } from './ia'
import type { NodoPropuesto } from './layouts'

/**
 * Un ejemplo de fábrica por formato, con su guía.
 *
 * Explicar un formato con palabras no sirve de mucho: lo que enseña es verlo
 * hecho y poder moverlo. Por eso el ejemplo se MATERIALIZA como un mapa normal
 * (`MapaIdeas.ejemplo`), con su guía encima del lienzo, y el usuario puede
 * editarlo, quedárselo de plantilla o tirarlo.
 *
 * El CONTENIDO no pasa por `dict.ts` —en cuanto se crea es un dato del usuario,
 * no texto de interfaz—, así que el catálogo está entero en cada idioma
 * (`ejemplosEn.ts`) y se elige completo al crear. La guía sí es interfaz: viaja
 * por `ideas.guia.<tipo>` y aquí solo queda su español de respaldo.
 */

/** Lo que se materializa: el mapa de ejemplo en un idioma. */
export interface ContenidoEjemplo {
  /** Nombre del mapa que se crea. */
  titulo: string
  /** Mismo contrato que devuelve la IA: se materializa por el mismo camino. */
  propuesta: MapaPropuesto
}

export interface EjemploMapa extends ContenidoEjemplo {
  /** Para qué sirve el formato y cómo se llena (2-3 frases). */
  guiaEs: string
}

const n = (texto: string, ...hijos: NodoPropuesto[]): NodoPropuesto => ({ texto, hijos })

/** Encadena los pasos de un flujo: cada uno cuelga del anterior. */
function cadena(pasos: NodoPropuesto[]): NodoPropuesto[] {
  for (let i = pasos.length - 1; i > 0; i--) pasos[i - 1].hijos = [pasos[i]]
  return pasos[0] ? pasos[0].hijos : []
}

const paso = (texto: string, forma?: NodoPropuesto['forma']): NodoPropuesto => ({ texto, hijos: [], forma })

export const EJEMPLOS_PT: Record<TipoMapa, ContenidoEjemplo> = {
  mental: {
    titulo: 'Viagem ao Japão',
    propuesta: {
      raiz: 'Viagem ao Japão',
      ramas: [
        n('Rota', n('Tóquio'), n('Quioto'), n('Osaka')),
        n('Orçamento', n('Passagens'), n('Hotel'), n('Comida por dia')),
        n('O que levar', n('Adaptador'), n('JR Pass'), n('Sapatos confortáveis')),
        n('Antes de sair', n('Verificar o passaporte'), n('Trocar ienes')),
      ],
    },
  },

  arbol: {
    titulo: 'Fontes de energia',
    propuesta: {
      raiz: 'Fontes de energia',
      ramas: [
        n('Renováveis', n('Solar'), n('Eólica'), n('Hidrelétrica')),
        n('Fósseis', n('Carvão'), n('Petróleo'), n('Gás natural')),
        n('Nuclear', n('Fissão'), n('Fusão')),
      ],
    },
  },

  etimologia: {
    titulo: 'Ideia',
    propuesta: {
      raiz: 'Ideia',
      ramas: [
        n('Origem', n('Gr. idéa: ‘forma, aspecto’'), n('De ideîn: ‘ver’'), n('Ao português pelo latim')),
        n('Significados', n('Representação mental'), n('Plano ou intenção'), n('Conceito ou opinião')),
        n('Usos', n('«Ter uma ideia»'), n('«Nem ideia»'), n('«Acostumar-se com a ideia»')),
        n('Família de palavras', n('Ideal'), n('Idear'), n('Ideologia'), n('Ideário')),
      ],
    },
  },

  llaves: {
    titulo: 'Partes de uma bicicleta',
    propuesta: {
      raiz: 'Bicicleta',
      ramas: [
        n('Quadro', n('Tubo superior'), n('Garfo'), n('Selim')),
        n('Transmissão', n('Pedais'), n('Corrente'), n('Catraca')),
        n('Rodas', n('Aro'), n('Raios'), n('Câmara de ar')),
        n('Freios', n('Manetes'), n('Pastilhas')),
      ],
    },
  },

  circulo: {
    titulo: 'Café',
    propuesta: {
      raiz: 'Café',
      ramas: [
        n('Tem cafeína'),
        n('Cresce nos trópicos'),
        n('Arábica e robusta'),
        n('Torra clara ou escura'),
        n('Espresso'),
        n('Colhido à mão'),
        n('Descafeinado'),
        n('Segunda bebida mais consumida do mundo'),
      ],
    },
  },

  flujo: {
    titulo: 'Marcar uma consulta médica',
    propuesta: {
      raiz: 'Preciso de uma consulta',
      formaRaiz: 'inicio',
      ramas: cadena([
        paso('Preciso de uma consulta', 'inicio'),
        paso('Abrir o app do plano de saúde'),
        paso('Tem horário esta semana?', 'decision'),
        paso('Escolher dia e horário'),
        paso('Confirmar e salvar'),
        paso('Colocar no calendário', 'fin'),
      ]),
    },
  },

  linea: {
    titulo: 'História da internet',
    propuesta: {
      raiz: 'História da internet',
      ramas: [
        n('1969 · Nasce a ARPANET', n('Quatro universidades')),
        n('1983 · O TCP/IP é adotado'),
        n('1991 · Primeiro site público', n('Tim Berners-Lee')),
        n('2004 · Chegam as redes sociais'),
        n('2007 · O celular domina tudo'),
      ],
    },
  },

  ciclo: {
    titulo: 'O ciclo da água',
    propuesta: {
      raiz: 'O ciclo da água',
      ramas: [
        n('Evaporação', n('O sol aquece o mar')),
        n('Condensação', n('As nuvens se formam')),
        n('Precipitação', n('Chove ou neva')),
        n('Escoamento', n('Os rios voltam ao mar')),
      ],
    },
  },

  piramide: {
    titulo: 'Pirâmide de Maslow',
    propuesta: {
      raiz: 'Pirâmide de Maslow',
      ramas: [],
      conjuntos: ['Autorrealização', 'Reconhecimento', 'Afeto e segurança', 'Necessidades básicas'],
      elementos: [
        { texto: 'Criar e dar sentido', zona: 'p1' },
        { texto: 'Respeito e conquistas', zona: 'p2' },
        { texto: 'Amizade e parceria', zona: 'p3' },
        { texto: 'Casa e trabalho', zona: 'p3' },
        { texto: 'Comer e dormir', zona: 'p4' },
        { texto: 'Saúde', zona: 'p4' },
      ],
    },
  },

  venn: {
    titulo: 'Cães e gatos',
    propuesta: {
      raiz: 'Cães e gatos',
      ramas: [],
      conjuntos: ['Cães', 'Gatos'],
      elementos: [
        { texto: 'Saem para passear', zona: 'a' },
        { texto: 'Obedecem a comandos', zona: 'a' },
        { texto: 'Se limpam sozinhos', zona: 'b' },
        { texto: 'Usam caixa de areia', zona: 'b' },
        { texto: 'Mamíferos', zona: 'ab' },
        { texto: 'Precisam de vacinas', zona: 'ab' },
        { texto: 'Vivem dentro de casa', zona: 'ab' },
      ],
    },
  },

  comparacion: {
    titulo: 'Café ou chá',
    propuesta: {
      raiz: 'Café ou chá',
      ramas: [],
      conjuntos: ['Café', 'Chá'],
      elementos: [
        { texto: 'Mais cafeína', zona: 'izq' },
        { texto: 'Sabor tostado', zona: 'izq' },
        { texto: 'Ambos tomados quentes', zona: 'centro' },
        { texto: 'Cheios de antioxidantes', zona: 'centro' },
        { texto: 'Mais suave', zona: 'der' },
        { texto: 'Variedades incontáveis', zona: 'der' },
      ],
    },
  },

  proscontras: {
    titulo: 'Trabalhar em casa',
    propuesta: {
      raiz: 'Trabalhar em casa',
      ramas: [],
      elementos: [
        { texto: 'Sem deslocamento', zona: 'izq', peso: 5 },
        { texto: 'Horário flexível', zona: 'izq', peso: 4 },
        { texto: 'Como em casa', zona: 'izq', peso: 2 },
        { texto: 'Menos contato com a equipe', zona: 'der', peso: 4 },
        { texto: 'Difícil desligar', zona: 'der', peso: 3 },
        { texto: 'Conta de luz mais alta', zona: 'der', peso: 1 },
      ],
    },
  },

  fuerzas: {
    titulo: 'Correr pela manhã',
    propuesta: {
      raiz: 'Correr pela manhã',
      ramas: [],
      elementos: [
        { texto: 'Quero dormir melhor', zona: 'izq', peso: 4 },
        { texto: 'Tenho um parque perto', zona: 'izq', peso: 3 },
        { texto: 'Uma amiga me acompanha', zona: 'izq', peso: 4 },
        { texto: 'Durmo tarde', zona: 'der', peso: 5 },
        { texto: 'Faz frio ao amanhecer', zona: 'der', peso: 3 },
        { texto: 'Meu tênis já era', zona: 'der', peso: 2 },
      ],
    },
  },

  foda: {
    titulo: 'Abrir uma cafeteria',
    propuesta: {
      raiz: 'Abrir uma cafeteria',
      ramas: [],
      elementos: [
        { texto: 'Entendo muito de café', zona: 'f' },
        { texto: 'Receita própria de pão', zona: 'f' },
        { texto: 'Pouco capital', zona: 'd' },
        { texto: 'Nunca contratei ninguém', zona: 'd' },
        { texto: 'Bairro sem cafeterias', zona: 'o' },
        { texto: 'Escritórios a duas quadras', zona: 'o' },
        { texto: 'O aluguel está subindo', zona: 'a' },
        { texto: 'Uma rede está abrindo perto', zona: 'a' },
      ],
    },
  },

  eisenhower: {
    titulo: 'Minha semana',
    propuesta: {
      raiz: 'Minha semana',
      ramas: [],
      elementos: [
        { texto: 'Entregar o relatório hoje', zona: 'hacer' },
        { texto: 'Ligar para o dentista', zona: 'hacer' },
        { texto: 'Preparar a apresentação', zona: 'agendar' },
        { texto: 'Fazer exercício', zona: 'agendar' },
        { texto: 'Pedir o material', zona: 'delegar' },
        { texto: 'Responder ao fornecedor', zona: 'delegar' },
        { texto: 'Ficar no celular o tempo todo', zona: 'quitar' },
        { texto: 'Reunião sem pauta', zona: 'quitar' },
      ],
    },
  },

  decision: {
    titulo: 'Aceito o emprego novo?',
    propuesta: {
      raiz: 'Aceito o emprego novo?',
      ramas: [
        n('Aceito', n('Salário mais alto'), n('Mudar de cidade'), n('Começar do zero')),
        n('Fico', n('Equipe que já conheço'), n('Teto salarial')),
        n('Negociar para ficar', n('Pode dar certo'), n('Pode ficar estranho')),
      ],
    },
  },

  tier: {
    titulo: 'Meus cafés da manhã',
    propuesta: {
      raiz: 'Meus cafés da manhã',
      ramas: [],
      elementos: [
        { texto: 'Chilaquiles', zona: 's' },
        { texto: 'Ovos rancheros', zona: 's' },
        { texto: 'Fruta com iogurte', zona: 'a' },
        { texto: 'Molletes', zona: 'a' },
        { texto: 'Torrada', zona: 'b' },
        { texto: 'Cereal de caixinha', zona: 'c' },
        { texto: 'Só café', zona: 'd' },
        { texto: 'Tamales', zona: 'sin' },
      ],
    },
  },

  matriz: {
    titulo: 'Qual notebook eu compro?',
    propuesta: {
      raiz: 'Qual notebook eu compro?',
      ramas: [],
      criterios: [
        { texto: 'Preço', peso: 5 },
        { texto: 'Bateria', peso: 4 },
        { texto: 'Peso', peso: 3 },
        { texto: 'Tela', peso: 2 },
      ],
      opciones: [
        { texto: 'O barato', puntajes: [5, 3, 3, 2] },
        { texto: 'O leve', puntajes: [3, 4, 5, 3] },
        { texto: 'O potente', puntajes: [1, 2, 2, 5] },
      ],
    },
  },

  ishikawa: {
    titulo: 'O bolo não cresceu',
    propuesta: {
      raiz: 'O bolo não cresceu',
      ramas: [
        n('Ingredientes', n('Fermento vencido'), n('Ovos gelados')),
        n('Método', n('Bati demais a massa'), n('Abri o forno cedo demais')),
        n('Equipamento', n('Forno descalibrado'), n('Forma grande demais')),
        n('Medição', n('Medi com xícara, não com balança')),
      ],
    },
  },
}

export const EJEMPLOS_FR: Record<TipoMapa, ContenidoEjemplo> = {
  mental: {
    titulo: 'Voyage au Japon',
    propuesta: {
      raiz: 'Voyage au Japon',
      ramas: [
        n('Itinéraire', n('Tokyo'), n('Kyoto'), n('Osaka')),
        n('Budget', n('Vols'), n('Hôtel'), n('Repas par jour')),
        n('Quoi emporter', n('Adaptateur'), n('JR Pass'), n('Chaussures confortables')),
        n('Avant de partir', n('Vérifier le passeport'), n('Changer des yens')),
      ],
    },
  },

  arbol: {
    titulo: "Sources d'énergie",
    propuesta: {
      raiz: "Sources d'énergie",
      ramas: [
        n('Renouvelables', n('Solaire'), n('Éolienne'), n('Hydraulique')),
        n('Fossiles', n('Charbon'), n('Pétrole'), n('Gaz naturel')),
        n('Nucléaire', n('Fission'), n('Fusion')),
      ],
    },
  },

  etimologia: {
    titulo: 'Idée',
    propuesta: {
      raiz: 'Idée',
      ramas: [
        n(
          'Origine',
          n('Gr. idéa : ‘forme, aspect’'),
          n('De ideîn : ‘voir’'),
          n('Vers le français par le latin'),
        ),
        n('Significations', n('Représentation mentale'), n('Projet ou intention'), n('Concept ou opinion')),
        n('Usages', n('«Avoir une idée»'), n('«Aucune idée»'), n("«Se faire à l'idée»")),
        n('Famille de mots', n('Idéal'), n('Idéaliser'), n('Idéologie')),
      ],
    },
  },

  llaves: {
    titulo: "Les pièces d'un vélo",
    propuesta: {
      raiz: 'Vélo',
      ramas: [
        n('Cadre', n('Tube supérieur'), n('Fourche'), n('Selle')),
        n('Transmission', n('Pédales'), n('Chaîne'), n('Pignons')),
        n('Roues', n('Jante'), n('Rayons'), n('Chambre à air')),
        n('Freins', n('Leviers'), n('Plaquettes')),
      ],
    },
  },

  circulo: {
    titulo: 'Le café',
    propuesta: {
      raiz: 'Le café',
      ramas: [
        n('Contient de la caféine'),
        n('Pousse sous les tropiques'),
        n('Arabica et robusta'),
        n('Torréfaction claire ou foncée'),
        n('Expresso'),
        n('Récolté à la main'),
        n('Décaféiné'),
        n('Deuxième boisson la plus bue au monde'),
      ],
    },
  },

  flujo: {
    titulo: 'Prendre un rendez-vous médical',
    propuesta: {
      raiz: "J'ai besoin d'une consultation",
      formaRaiz: 'inicio',
      ramas: cadena([
        paso("J'ai besoin d'une consultation", 'inicio'),
        paso("Ouvrir l'appli de l'assurance"),
        paso('Un créneau cette semaine ?', 'decision'),
        paso('Choisir un jour et une heure'),
        paso('Confirmer et enregistrer'),
        paso("L'ajouter au calendrier", 'fin'),
      ]),
    },
  },

  linea: {
    titulo: "Histoire d'Internet",
    propuesta: {
      raiz: "Histoire d'Internet",
      ramas: [
        n("1969 · Naissance d'ARPANET", n('Quatre universités')),
        n('1983 · Adoption de TCP/IP'),
        n('1991 · Premier site web public', n('Tim Berners-Lee')),
        n('2004 · Arrivée des réseaux sociaux'),
        n('2007 · Le mobile prend le dessus'),
      ],
    },
  },

  ciclo: {
    titulo: "Le cycle de l'eau",
    propuesta: {
      raiz: "Le cycle de l'eau",
      ramas: [
        n('Évaporation', n('Le soleil chauffe la mer')),
        n('Condensation', n('Les nuages se forment')),
        n('Précipitations', n('Il pleut ou il neige')),
        n('Ruissellement', n('Les rivières retournent à la mer')),
      ],
    },
  },

  piramide: {
    titulo: 'La pyramide de Maslow',
    propuesta: {
      raiz: 'La pyramide de Maslow',
      ramas: [],
      conjuntos: ['Accomplissement de soi', 'Estime', 'Amour et sécurité', 'Besoins de base'],
      elementos: [
        { texto: 'Créer et donner du sens', zona: 'p1' },
        { texto: 'Respect et réussite', zona: 'p2' },
        { texto: 'Amitié et couple', zona: 'p3' },
        { texto: 'Un foyer et un travail', zona: 'p3' },
        { texto: 'Manger et dormir', zona: 'p4' },
        { texto: 'Santé', zona: 'p4' },
      ],
    },
  },

  venn: {
    titulo: 'Chiens et chats',
    propuesta: {
      raiz: 'Chiens et chats',
      ramas: [],
      conjuntos: ['Chiens', 'Chats'],
      elementos: [
        { texto: 'Sortent en promenade', zona: 'a' },
        { texto: 'Obéissent aux ordres', zona: 'a' },
        { texto: 'Font leur toilette seuls', zona: 'b' },
        { texto: 'Utilisent une litière', zona: 'b' },
        { texto: 'Mammifères', zona: 'ab' },
        { texto: 'Ont besoin de vaccins', zona: 'ab' },
        { texto: "Vivent à l'intérieur", zona: 'ab' },
      ],
    },
  },

  comparacion: {
    titulo: 'Café ou thé',
    propuesta: {
      raiz: 'Café ou thé',
      ramas: [],
      conjuntos: ['Café', 'Thé'],
      elementos: [
        { texto: 'Plus de caféine', zona: 'izq' },
        { texto: 'Goût torréfié', zona: 'izq' },
        { texto: 'Se boivent chauds tous les deux', zona: 'centro' },
        { texto: "Pleins d'antioxydants", zona: 'centro' },
        { texto: 'Plus doux', zona: 'der' },
        { texto: 'Variétés infinies', zona: 'der' },
      ],
    },
  },

  proscontras: {
    titulo: 'Travailler à domicile',
    propuesta: {
      raiz: 'Travailler à domicile',
      ramas: [],
      elementos: [
        { texto: 'Pas de trajet', zona: 'izq', peso: 5 },
        { texto: 'Horaires flexibles', zona: 'izq', peso: 4 },
        { texto: 'Je mange à la maison', zona: 'izq', peso: 2 },
        { texto: "Moins de contact avec l'équipe", zona: 'der', peso: 4 },
        { texto: 'Difficile de décrocher', zona: 'der', peso: 3 },
        { texto: "Facture d'électricité plus élevée", zona: 'der', peso: 1 },
      ],
    },
  },

  fuerzas: {
    titulo: 'Courir le matin',
    propuesta: {
      raiz: 'Courir le matin',
      ramas: [],
      elementos: [
        { texto: 'Je veux mieux dormir', zona: 'izq', peso: 4 },
        { texto: "J'ai un parc à côté", zona: 'izq', peso: 3 },
        { texto: "Une amie m'accompagne", zona: 'izq', peso: 4 },
        { texto: 'Je me couche tard', zona: 'der', peso: 5 },
        { texto: "Il fait froid à l'aube", zona: 'der', peso: 3 },
        { texto: 'Mes baskets sont fichues', zona: 'der', peso: 2 },
      ],
    },
  },

  foda: {
    titulo: 'Ouvrir un café',
    propuesta: {
      raiz: 'Ouvrir un café',
      ramas: [],
      elementos: [
        { texto: "Je m'y connais en café", zona: 'f' },
        { texto: 'Recette de pain maison', zona: 'f' },
        { texto: 'Peu de capital', zona: 'd' },
        { texto: "Je n'ai jamais embauché personne", zona: 'd' },
        { texto: 'Pas de café dans le quartier', zona: 'o' },
        { texto: 'Des bureaux à deux rues', zona: 'o' },
        { texto: "Le loyer ne cesse d'augmenter", zona: 'a' },
        { texto: 'Une chaîne ouvre à côté', zona: 'a' },
      ],
    },
  },

  eisenhower: {
    titulo: 'Ma semaine',
    propuesta: {
      raiz: 'Ma semaine',
      ramas: [],
      elementos: [
        { texto: "Envoyer le rapport aujourd'hui", zona: 'hacer' },
        { texto: 'Appeler le dentiste', zona: 'hacer' },
        { texto: 'Préparer la présentation', zona: 'agendar' },
        { texto: 'Faire du sport', zona: 'agendar' },
        { texto: 'Commander le matériel', zona: 'delegar' },
        { texto: 'Répondre au fournisseur', zona: 'delegar' },
        { texto: 'Regarder mon téléphone sans arrêt', zona: 'quitar' },
        { texto: 'Réunion sans ordre du jour', zona: 'quitar' },
      ],
    },
  },

  decision: {
    titulo: 'Dois-je accepter le nouveau poste ?',
    propuesta: {
      raiz: 'Dois-je accepter le nouveau poste ?',
      ramas: [
        n('Accepter', n('Salaire plus élevé'), n('Déménager'), n('Repartir de zéro')),
        n('Rester', n('Une équipe que je connais déjà'), n('Plafond de salaire')),
        n('Négocier pour rester', n('Ça pourrait bien se passer'), n('Ça pourrait devenir gênant')),
      ],
    },
  },

  tier: {
    titulo: 'Mes petits-déjeuners',
    propuesta: {
      raiz: 'Mes petits-déjeuners',
      ramas: [],
      elementos: [
        { texto: 'Chilaquiles', zona: 's' },
        { texto: 'Œufs à la mexicaine', zona: 's' },
        { texto: 'Fruits et yaourt', zona: 'a' },
        { texto: 'Molletes', zona: 'a' },
        { texto: 'Toast', zona: 'b' },
        { texto: 'Céréales en boîte', zona: 'c' },
        { texto: 'Juste un café', zona: 'd' },
        { texto: 'Tamales', zona: 'sin' },
      ],
    },
  },

  matriz: {
    titulo: 'Quel ordinateur portable acheter ?',
    propuesta: {
      raiz: 'Quel ordinateur portable acheter ?',
      ramas: [],
      criterios: [
        { texto: 'Prix', peso: 5 },
        { texto: 'Batterie', peso: 4 },
        { texto: 'Poids', peso: 3 },
        { texto: 'Écran', peso: 2 },
      ],
      opciones: [
        { texto: 'Le pas cher', puntajes: [5, 3, 3, 2] },
        { texto: 'Le léger', puntajes: [3, 4, 5, 3] },
        { texto: 'Le puissant', puntajes: [1, 2, 2, 5] },
      ],
    },
  },

  ishikawa: {
    titulo: "Le gâteau n'a pas gonflé",
    propuesta: {
      raiz: "Le gâteau n'a pas gonflé",
      ramas: [
        n('Ingrédients', n('Levure périmée'), n('Œufs froids')),
        n('Méthode', n('Pâte trop travaillée'), n('Four ouvert trop tôt')),
        n('Équipement', n('Four mal calibré'), n('Moule trop grand')),
        n('Mesure', n('Mesuré à la tasse, pas à la balance')),
      ],
    },
  },
}

export const EJEMPLOS_DE: Record<TipoMapa, ContenidoEjemplo> = {
  mental: {
    titulo: 'Japanreise',
    propuesta: {
      raiz: 'Japanreise',
      ramas: [
        n('Route', n('Tokio'), n('Kyoto'), n('Osaka')),
        n('Budget', n('Flüge'), n('Hotel'), n('Essen pro Tag')),
        n('Was mitnehmen', n('Adapter'), n('JR Pass'), n('Bequeme Schuhe')),
        n('Vor der Abreise', n('Reisepass prüfen'), n('Yen wechseln')),
      ],
    },
  },

  arbol: {
    titulo: 'Energiequellen',
    propuesta: {
      raiz: 'Energiequellen',
      ramas: [
        n('Erneuerbar', n('Solar'), n('Wind'), n('Wasserkraft')),
        n('Fossil', n('Kohle'), n('Erdöl'), n('Erdgas')),
        n('Kernkraft', n('Kernspaltung'), n('Kernfusion')),
      ],
    },
  },

  etimologia: {
    titulo: 'Idee',
    propuesta: {
      raiz: 'Idee',
      ramas: [
        n(
          'Ursprung',
          n('Griech. idéa: „Form, Gestalt“'),
          n('Von ideîn: „sehen“'),
          n('Über das Latein ins Deutsche'),
        ),
        n('Bedeutungen', n('Gedankenbild'), n('Plan oder Absicht'), n('Konzept oder Meinung')),
        n('Verwendung', n('„Eine Idee haben“'), n('„Keine Ahnung“'), n('„Mit einer Idee spielen“')),
        n('Wortfamilie', n('Ideal'), n('Idealisieren'), n('Ideologie')),
      ],
    },
  },

  llaves: {
    titulo: 'Teile eines Fahrrads',
    propuesta: {
      raiz: 'Fahrrad',
      ramas: [
        n('Rahmen', n('Oberrohr'), n('Gabel'), n('Sattel')),
        n('Antrieb', n('Pedale'), n('Kette'), n('Ritzel')),
        n('Räder', n('Felge'), n('Speichen'), n('Schlauch')),
        n('Bremsen', n('Bremshebel'), n('Bremsbeläge')),
      ],
    },
  },

  circulo: {
    titulo: 'Kaffee',
    propuesta: {
      raiz: 'Kaffee',
      ramas: [
        n('Enthält Koffein'),
        n('Wächst in den Tropen'),
        n('Arabica und Robusta'),
        n('Helle oder dunkle Röstung'),
        n('Espresso'),
        n('Von Hand gepflückt'),
        n('Koffeinfrei'),
        n('Zweitmeistgetrunkenes Getränk der Welt'),
      ],
    },
  },

  flujo: {
    titulo: 'Einen Arzttermin buchen',
    propuesta: {
      raiz: 'Ich brauche einen Termin',
      formaRaiz: 'inicio',
      ramas: cadena([
        paso('Ich brauche einen Termin', 'inicio'),
        paso('Die App der Versicherung öffnen'),
        paso('Gibt es diese Woche einen Termin?', 'decision'),
        paso('Tag und Uhrzeit wählen'),
        paso('Bestätigen und speichern'),
        paso('In den Kalender eintragen', 'fin'),
      ]),
    },
  },

  linea: {
    titulo: 'Geschichte des Internets',
    propuesta: {
      raiz: 'Geschichte des Internets',
      ramas: [
        n('1969 · ARPANET entsteht', n('Vier Universitäten')),
        n('1983 · TCP/IP wird eingeführt'),
        n('1991 · Erste öffentliche Website', n('Tim Berners-Lee')),
        n('2004 · Soziale Netzwerke kommen auf'),
        n('2007 · Das Handy übernimmt alles'),
      ],
    },
  },

  ciclo: {
    titulo: 'Der Wasserkreislauf',
    propuesta: {
      raiz: 'Der Wasserkreislauf',
      ramas: [
        n('Verdunstung', n('Die Sonne erwärmt das Meer')),
        n('Kondensation', n('Wolken bilden sich')),
        n('Niederschlag', n('Es regnet oder schneit')),
        n('Abfluss', n('Flüsse fließen zurück ins Meer')),
      ],
    },
  },

  piramide: {
    titulo: 'Maslows Bedürfnispyramide',
    propuesta: {
      raiz: 'Maslows Bedürfnispyramide',
      ramas: [],
      conjuntos: ['Selbstverwirklichung', 'Wertschätzung', 'Liebe und Sicherheit', 'Grundbedürfnisse'],
      elementos: [
        { texto: 'Sinn schaffen und finden', zona: 'p1' },
        { texto: 'Respekt und Erfolge', zona: 'p2' },
        { texto: 'Freundschaft und Partnerschaft', zona: 'p3' },
        { texto: 'Zuhause und Arbeit', zona: 'p3' },
        { texto: 'Essen und Schlafen', zona: 'p4' },
        { texto: 'Gesundheit', zona: 'p4' },
      ],
    },
  },

  venn: {
    titulo: 'Hunde und Katzen',
    propuesta: {
      raiz: 'Hunde und Katzen',
      ramas: [],
      conjuntos: ['Hunde', 'Katzen'],
      elementos: [
        { texto: 'Gehen spazieren', zona: 'a' },
        { texto: 'Befolgen Kommandos', zona: 'a' },
        { texto: 'Putzen sich selbst', zona: 'b' },
        { texto: 'Benutzen ein Katzenklo', zona: 'b' },
        { texto: 'Säugetiere', zona: 'ab' },
        { texto: 'Brauchen Impfungen', zona: 'ab' },
        { texto: 'Leben drinnen', zona: 'ab' },
      ],
    },
  },

  comparacion: {
    titulo: 'Kaffee oder Tee',
    propuesta: {
      raiz: 'Kaffee oder Tee',
      ramas: [],
      conjuntos: ['Kaffee', 'Tee'],
      elementos: [
        { texto: 'Mehr Koffein', zona: 'izq' },
        { texto: 'Gerösteter Geschmack', zona: 'izq' },
        { texto: 'Beide werden heiß getrunken', zona: 'centro' },
        { texto: 'Voller Antioxidantien', zona: 'centro' },
        { texto: 'Milder', zona: 'der' },
        { texto: 'Unzählige Sorten', zona: 'der' },
      ],
    },
  },

  proscontras: {
    titulo: 'Von zu Hause arbeiten',
    propuesta: {
      raiz: 'Von zu Hause arbeiten',
      ramas: [],
      elementos: [
        { texto: 'Kein Arbeitsweg', zona: 'izq', peso: 5 },
        { texto: 'Flexible Zeiten', zona: 'izq', peso: 4 },
        { texto: 'Ich esse zu Hause', zona: 'izq', peso: 2 },
        { texto: 'Weniger Kontakt zum Team', zona: 'der', peso: 4 },
        { texto: 'Schwer abzuschalten', zona: 'der', peso: 3 },
        { texto: 'Höhere Stromrechnung', zona: 'der', peso: 1 },
      ],
    },
  },

  fuerzas: {
    titulo: 'Morgens laufen gehen',
    propuesta: {
      raiz: 'Morgens laufen gehen',
      ramas: [],
      elementos: [
        { texto: 'Ich will besser schlafen', zona: 'izq', peso: 4 },
        { texto: 'Es gibt einen Park in der Nähe', zona: 'izq', peso: 3 },
        { texto: 'Eine Freundin läuft mit', zona: 'izq', peso: 4 },
        { texto: 'Ich gehe spät ins Bett', zona: 'der', peso: 5 },
        { texto: 'Morgens ist es kalt', zona: 'der', peso: 3 },
        { texto: 'Meine Laufschuhe sind hinüber', zona: 'der', peso: 2 },
      ],
    },
  },

  foda: {
    titulo: 'Ein Café eröffnen',
    propuesta: {
      raiz: 'Ein Café eröffnen',
      ramas: [],
      elementos: [
        { texto: 'Ich kenne mich mit Kaffee aus', zona: 'f' },
        { texto: 'Eigenes Brotrezept', zona: 'f' },
        { texto: 'Wenig Kapital', zona: 'd' },
        { texto: 'Ich habe noch nie jemanden eingestellt', zona: 'd' },
        { texto: 'Kein Café in der Gegend', zona: 'o' },
        { texto: 'Büros zwei Straßen weiter', zona: 'o' },
        { texto: 'Die Miete steigt ständig', zona: 'a' },
        { texto: 'Eine Kette eröffnet in der Nähe', zona: 'a' },
      ],
    },
  },

  eisenhower: {
    titulo: 'Meine Woche',
    propuesta: {
      raiz: 'Meine Woche',
      ramas: [],
      elementos: [
        { texto: 'Bericht heute abschicken', zona: 'hacer' },
        { texto: 'Zahnarzt anrufen', zona: 'hacer' },
        { texto: 'Präsentation vorbereiten', zona: 'agendar' },
        { texto: 'Sport machen', zona: 'agendar' },
        { texto: 'Material bestellen', zona: 'delegar' },
        { texto: 'Lieferanten antworten', zona: 'delegar' },
        { texto: 'Ständig aufs Handy schauen', zona: 'quitar' },
        { texto: 'Meeting ohne Tagesordnung', zona: 'quitar' },
      ],
    },
  },

  decision: {
    titulo: 'Nehme ich den neuen Job an?',
    propuesta: {
      raiz: 'Nehme ich den neuen Job an?',
      ramas: [
        n('Annehmen', n('Höheres Gehalt'), n('Umzug in eine andere Stadt'), n('Neu anfangen')),
        n('Bleiben', n('Ein Team, das ich schon kenne'), n('Gehaltsdeckel')),
        n('Über das Bleiben verhandeln', n('Könnte gut ausgehen'), n('Könnte unangenehm werden')),
      ],
    },
  },

  tier: {
    titulo: 'Meine Frühstücke',
    propuesta: {
      raiz: 'Meine Frühstücke',
      ramas: [],
      elementos: [
        { texto: 'Chilaquiles', zona: 's' },
        { texto: 'Ranchero-Eier', zona: 's' },
        { texto: 'Obst mit Joghurt', zona: 'a' },
        { texto: 'Molletes', zona: 'a' },
        { texto: 'Toast', zona: 'b' },
        { texto: 'Frühstücksflocken aus der Packung', zona: 'c' },
        { texto: 'Nur Kaffee', zona: 'd' },
        { texto: 'Tamales', zona: 'sin' },
      ],
    },
  },

  matriz: {
    titulo: 'Welchen Laptop kaufe ich?',
    propuesta: {
      raiz: 'Welchen Laptop kaufe ich?',
      ramas: [],
      criterios: [
        { texto: 'Preis', peso: 5 },
        { texto: 'Akku', peso: 4 },
        { texto: 'Gewicht', peso: 3 },
        { texto: 'Bildschirm', peso: 2 },
      ],
      opciones: [
        { texto: 'Der günstige', puntajes: [5, 3, 3, 2] },
        { texto: 'Der leichte', puntajes: [3, 4, 5, 3] },
        { texto: 'Der starke', puntajes: [1, 2, 2, 5] },
      ],
    },
  },

  ishikawa: {
    titulo: 'Der Kuchen ist nicht aufgegangen',
    propuesta: {
      raiz: 'Der Kuchen ist nicht aufgegangen',
      ramas: [
        n('Zutaten', n('Abgelaufenes Backpulver'), n('Kalte Eier')),
        n('Methode', n('Teig zu lange gerührt'), n('Backofen zu früh geöffnet')),
        n('Ausrüstung', n('Backofen falsch kalibriert'), n('Form zu groß')),
        n('Messung', n('Mit Tasse statt Waage gemessen')),
      ],
    },
  },
}

export const EJEMPLOS_IT: Record<TipoMapa, ContenidoEjemplo> = {
  mental: {
    titulo: 'Viaggio in Giappone',
    propuesta: {
      raiz: 'Viaggio in Giappone',
      ramas: [
        n('Itinerario', n('Tokyo'), n('Kyoto'), n('Osaka')),
        n('Budget', n('Voli'), n('Hotel'), n('Cibo al giorno')),
        n('Cosa portare', n('Adattatore'), n('JR Pass'), n('Scarpe comode')),
        n('Prima di partire', n('Controllare il passaporto'), n('Cambiare gli yen')),
      ],
    },
  },

  arbol: {
    titulo: 'Fonti di energia',
    propuesta: {
      raiz: 'Fonti di energia',
      ramas: [
        n('Rinnovabili', n('Solare'), n('Eolica'), n('Idraulica')),
        n('Fossili', n('Carbone'), n('Petrolio'), n('Gas naturale')),
        n('Nucleare', n('Fissione'), n('Fusione')),
      ],
    },
  },

  etimologia: {
    titulo: 'Idea',
    propuesta: {
      raiz: 'Idea',
      ramas: [
        n(
          'Origine',
          n('Gr. idéa: «forma, aspetto»'),
          n('Da ideîn: «vedere»'),
          n("All'italiano tramite il latino"),
        ),
        n('Significati', n('Rappresentazione mentale'), n('Piano o proposito'), n('Concetto o opinione')),
        n('Usi', n("«Avere un'idea»"), n('«Nessuna idea»'), n("«Farsi un'idea»")),
        n('Famiglia lessicale', n('Ideale'), n('Ideare'), n('Ideologia'), n('Ideario')),
      ],
    },
  },

  llaves: {
    titulo: 'Le parti di una bicicletta',
    propuesta: {
      raiz: 'Bicicletta',
      ramas: [
        n('Telaio', n('Tubo superiore'), n('Forcella'), n('Sella')),
        n('Trasmissione', n('Pedali'), n('Catena'), n('Pignoni')),
        n('Ruote', n('Cerchione'), n('Raggi'), n("Camera d'aria")),
        n('Freni', n('Leve'), n('Pastiglie')),
      ],
    },
  },

  circulo: {
    titulo: 'Il caffè',
    propuesta: {
      raiz: 'Il caffè',
      ramas: [
        n('Contiene caffeina'),
        n('Cresce ai tropici'),
        n('Arabica e robusta'),
        n('Tostatura chiara o scura'),
        n('Espresso'),
        n('Raccolto a mano'),
        n('Decaffeinato'),
        n('Seconda bevanda più consumata al mondo'),
      ],
    },
  },

  flujo: {
    titulo: 'Prenotare una visita medica',
    propuesta: {
      raiz: 'Ho bisogno di una visita',
      formaRaiz: 'inicio',
      ramas: cadena([
        paso('Ho bisogno di una visita', 'inicio'),
        paso("Aprire l'app dell'assicurazione"),
        paso("C'è un posto libero questa settimana?", 'decision'),
        paso('Scegliere giorno e ora'),
        paso('Confermare e salvare'),
        paso('Aggiungerlo al calendario', 'fin'),
      ]),
    },
  },

  linea: {
    titulo: 'Storia di internet',
    propuesta: {
      raiz: 'Storia di internet',
      ramas: [
        n('1969 · Nasce ARPANET', n('Quattro università')),
        n('1983 · Si adotta il TCP/IP'),
        n('1991 · Primo sito web pubblico', n('Tim Berners-Lee')),
        n('2004 · Arrivano i social network'),
        n('2007 · Il cellulare conquista tutto'),
      ],
    },
  },

  ciclo: {
    titulo: "Il ciclo dell'acqua",
    propuesta: {
      raiz: "Il ciclo dell'acqua",
      ramas: [
        n('Evaporazione', n('Il sole riscalda il mare')),
        n('Condensazione', n('Si formano le nuvole')),
        n('Precipitazione', n('Piove o nevica')),
        n('Ruscellamento', n('I fiumi tornano al mare')),
      ],
    },
  },

  piramide: {
    titulo: 'La piramide di Maslow',
    propuesta: {
      raiz: 'La piramide di Maslow',
      ramas: [],
      conjuntos: ['Autorealizzazione', 'Stima', 'Affetto e sicurezza', 'Bisogni di base'],
      elementos: [
        { texto: 'Creare e dare un senso', zona: 'p1' },
        { texto: 'Rispetto e successi', zona: 'p2' },
        { texto: 'Amicizia e coppia', zona: 'p3' },
        { texto: 'Casa e lavoro', zona: 'p3' },
        { texto: 'Mangiare e dormire', zona: 'p4' },
        { texto: 'Salute', zona: 'p4' },
      ],
    },
  },

  venn: {
    titulo: 'Cani e gatti',
    propuesta: {
      raiz: 'Cani e gatti',
      ramas: [],
      conjuntos: ['Cani', 'Gatti'],
      elementos: [
        { texto: 'Escono a passeggio', zona: 'a' },
        { texto: 'Obbediscono ai comandi', zona: 'a' },
        { texto: 'Si puliscono da soli', zona: 'b' },
        { texto: 'Usano la lettiera', zona: 'b' },
        { texto: 'Mammiferi', zona: 'ab' },
        { texto: 'Hanno bisogno di vaccini', zona: 'ab' },
        { texto: 'Vivono in casa', zona: 'ab' },
      ],
    },
  },

  comparacion: {
    titulo: 'Caffè o tè',
    propuesta: {
      raiz: 'Caffè o tè',
      ramas: [],
      conjuntos: ['Caffè', 'Tè'],
      elementos: [
        { texto: 'Più caffeina', zona: 'izq' },
        { texto: 'Sapore tostato', zona: 'izq' },
        { texto: 'Si bevono entrambi caldi', zona: 'centro' },
        { texto: 'Ricchi di antiossidanti', zona: 'centro' },
        { texto: 'Più delicato', zona: 'der' },
        { texto: 'Varietà infinite', zona: 'der' },
      ],
    },
  },

  proscontras: {
    titulo: 'Lavorare da casa',
    propuesta: {
      raiz: 'Lavorare da casa',
      ramas: [],
      elementos: [
        { texto: 'Niente spostamenti', zona: 'izq', peso: 5 },
        { texto: 'Orario flessibile', zona: 'izq', peso: 4 },
        { texto: 'Mangio a casa', zona: 'izq', peso: 2 },
        { texto: 'Meno contatto con il team', zona: 'der', peso: 4 },
        { texto: 'Difficile staccare', zona: 'der', peso: 3 },
        { texto: 'Bolletta della luce più alta', zona: 'der', peso: 1 },
      ],
    },
  },

  fuerzas: {
    titulo: 'Correre al mattino',
    propuesta: {
      raiz: 'Correre al mattino',
      ramas: [],
      elementos: [
        { texto: 'Voglio dormire meglio', zona: 'izq', peso: 4 },
        { texto: 'Ho un parco vicino', zona: 'izq', peso: 3 },
        { texto: "Un'amica mi accompagna", zona: 'izq', peso: 4 },
        { texto: 'Vado a letto tardi', zona: 'der', peso: 5 },
        { texto: "Fa freddo all'alba", zona: 'der', peso: 3 },
        { texto: 'Le mie scarpe sono da buttare', zona: 'der', peso: 2 },
      ],
    },
  },

  foda: {
    titulo: 'Aprire un bar',
    propuesta: {
      raiz: 'Aprire un bar',
      ramas: [],
      elementos: [
        { texto: 'Conosco bene il caffè', zona: 'f' },
        { texto: 'Ricetta di pane tutta mia', zona: 'f' },
        { texto: 'Poco capitale', zona: 'd' },
        { texto: 'Non ho mai assunto nessuno', zona: 'd' },
        { texto: 'Nessun bar in zona', zona: 'o' },
        { texto: 'Uffici a due isolati', zona: 'o' },
        { texto: "L'affitto continua a salire", zona: 'a' },
        { texto: 'Apre una catena qui vicino', zona: 'a' },
      ],
    },
  },

  eisenhower: {
    titulo: 'La mia settimana',
    propuesta: {
      raiz: 'La mia settimana',
      ramas: [],
      elementos: [
        { texto: 'Consegnare il rapporto oggi', zona: 'hacer' },
        { texto: 'Chiamare il dentista', zona: 'hacer' },
        { texto: 'Preparare la presentazione', zona: 'agendar' },
        { texto: 'Fare esercizio', zona: 'agendar' },
        { texto: 'Ordinare il materiale', zona: 'delegar' },
        { texto: 'Rispondere al fornitore', zona: 'delegar' },
        { texto: 'Guardare il telefono in continuazione', zona: 'quitar' },
        { texto: 'Riunione senza ordine del giorno', zona: 'quitar' },
      ],
    },
  },

  decision: {
    titulo: 'Accetto il nuovo lavoro?',
    propuesta: {
      raiz: 'Accetto il nuovo lavoro?',
      ramas: [
        n('Accetto', n('Stipendio più alto'), n('Cambiare città'), n('Ricominciare da zero')),
        n('Resto', n('Una squadra che conosco già'), n('Tetto di stipendio')),
        n('Negoziare per restare', n('Potrebbe andare bene'), n('Potrebbe diventare scomodo')),
      ],
    },
  },

  tier: {
    titulo: 'Le mie colazioni',
    propuesta: {
      raiz: 'Le mie colazioni',
      ramas: [],
      elementos: [
        { texto: 'Chilaquiles', zona: 's' },
        { texto: 'Uova rancheras', zona: 's' },
        { texto: 'Frutta con yogurt', zona: 'a' },
        { texto: 'Molletes', zona: 'a' },
        { texto: 'Toast', zona: 'b' },
        { texto: 'Cereali in scatola', zona: 'c' },
        { texto: 'Solo caffè', zona: 'd' },
        { texto: 'Tamales', zona: 'sin' },
      ],
    },
  },

  matriz: {
    titulo: 'Quale laptop compro?',
    propuesta: {
      raiz: 'Quale laptop compro?',
      ramas: [],
      criterios: [
        { texto: 'Prezzo', peso: 5 },
        { texto: 'Batteria', peso: 4 },
        { texto: 'Peso', peso: 3 },
        { texto: 'Schermo', peso: 2 },
      ],
      opciones: [
        { texto: 'Quello economico', puntajes: [5, 3, 3, 2] },
        { texto: 'Quello leggero', puntajes: [3, 4, 5, 3] },
        { texto: 'Quello potente', puntajes: [1, 2, 2, 5] },
      ],
    },
  },

  ishikawa: {
    titulo: 'La torta non è lievitata',
    propuesta: {
      raiz: 'La torta non è lievitata',
      ramas: [
        n('Ingredienti', n('Lievito scaduto'), n('Uova fredde')),
        n('Metodo', n('Impasto lavorato troppo'), n('Forno aperto troppo presto')),
        n('Attrezzatura', n('Forno scalibrato'), n('Stampo troppo grande')),
        n('Misurazione', n('Misurato con la tazza, non con la bilancia')),
      ],
    },
  },
}

export const EJEMPLOS_JA: Record<TipoMapa, ContenidoEjemplo> = {
  mental: {
    titulo: 'メキシコ旅行',
    propuesta: {
      raiz: 'メキシコ旅行',
      ramas: [
        n('ルート', n('メキシコシティ'), n('オアハカ'), n('メリダ')),
        n('予算', n('航空券'), n('ホテル'), n('1日の食費')),
        n('持ち物', n('スペイン語の会話帳'), n('歩きやすい靴'), n('日焼け止め')),
        n('出発前に', n('パスポートを確認'), n('ペソに両替')),
      ],
    },
  },

  arbol: {
    titulo: 'エネルギー源',
    propuesta: {
      raiz: 'エネルギー源',
      ramas: [
        n('再生可能', n('太陽光'), n('風力'), n('水力')),
        n('化石', n('石炭'), n('石油'), n('天然ガス')),
        n('原子力', n('核分裂'), n('核融合')),
      ],
    },
  },

  etimologia: {
    titulo: 'アイデア',
    propuesta: {
      raiz: 'アイデア',
      ramas: [
        n('語源', n('ギリシャ語 idéa「形、姿」'), n('ideîn「見る」から'), n('英語を経て日本語に定着')),
        n('意味', n('心に浮かぶ考え'), n('計画や意図'), n('概念や意見')),
        n('使い方', n('「アイデアが浮かぶ」'), n('「いいアイデアがない」'), n('「アイデアに慣れる」')),
        n('よく使う形', n('アイデアマン'), n('グッドアイデア'), n('アイデア倒れ')),
      ],
    },
  },

  llaves: {
    titulo: '自転車の部品',
    propuesta: {
      raiz: '自転車',
      ramas: [
        n('フレーム', n('トップチューブ'), n('フォーク'), n('サドル')),
        n('駆動系', n('ペダル'), n('チェーン'), n('スプロケット')),
        n('車輪', n('リム'), n('スポーク'), n('チューブ')),
        n('ブレーキ', n('レバー'), n('ブレーキパッド')),
      ],
    },
  },

  circulo: {
    titulo: 'コーヒー',
    propuesta: {
      raiz: 'コーヒー',
      ramas: [
        n('カフェインを含む'),
        n('熱帯地域で育つ'),
        n('アラビカ種とロブスタ種'),
        n('浅煎りと深煎り'),
        n('エスプレッソ'),
        n('手摘みで収穫'),
        n('カフェインレス'),
        n('世界で2番目に飲まれている飲み物'),
      ],
    },
  },

  flujo: {
    titulo: '病院の予約を取る',
    propuesta: {
      raiz: '診察が必要',
      formaRaiz: 'inicio',
      ramas: cadena([
        paso('診察が必要', 'inicio'),
        paso('保険のアプリを開く'),
        paso('今週空きはある?', 'decision'),
        paso('日時を選ぶ'),
        paso('確認して保存'),
        paso('カレンダーに登録', 'fin'),
      ]),
    },
  },

  linea: {
    titulo: 'インターネットの歴史',
    propuesta: {
      raiz: 'インターネットの歴史',
      ramas: [
        n('1969年・ARPANET誕生', n('4つの大学')),
        n('1983年・TCP/IPが採用される'),
        n('1991年・最初の公開ウェブサイト', n('ティム・バーナーズ=リー')),
        n('2004年・SNSの登場'),
        n('2007年・スマホがすべてを飲み込む'),
      ],
    },
  },

  ciclo: {
    titulo: '水の循環',
    propuesta: {
      raiz: '水の循環',
      ramas: [
        n('蒸発', n('太陽が海を温める')),
        n('凝結', n('雲ができる')),
        n('降水', n('雨や雪が降る')),
        n('流出', n('川が海に戻る')),
      ],
    },
  },

  piramide: {
    titulo: 'マズローの欲求段階',
    propuesta: {
      raiz: 'マズローの欲求段階',
      ramas: [],
      conjuntos: ['自己実現', '承認', '愛情と安心', '基本的欲求'],
      elementos: [
        { texto: '創造し意味を見出す', zona: 'p1' },
        { texto: '尊敬と達成', zona: 'p2' },
        { texto: '友情とパートナー', zona: 'p3' },
        { texto: '家と仕事', zona: 'p3' },
        { texto: '食事と睡眠', zona: 'p4' },
        { texto: '健康', zona: 'p4' },
      ],
    },
  },

  venn: {
    titulo: '犬と猫',
    propuesta: {
      raiz: '犬と猫',
      ramas: [],
      conjuntos: ['犬', '猫'],
      elementos: [
        { texto: '散歩に行く', zona: 'a' },
        { texto: '指示に従う', zona: 'a' },
        { texto: '自分で毛づくろいする', zona: 'b' },
        { texto: 'トイレの砂を使う', zona: 'b' },
        { texto: '哺乳類', zona: 'ab' },
        { texto: 'ワクチンが必要', zona: 'ab' },
        { texto: '室内で暮らす', zona: 'ab' },
      ],
    },
  },

  comparacion: {
    titulo: 'コーヒーか紅茶か',
    propuesta: {
      raiz: 'コーヒーか紅茶か',
      ramas: [],
      conjuntos: ['コーヒー', '紅茶'],
      elementos: [
        { texto: 'カフェインが多い', zona: 'izq' },
        { texto: '香ばしい味', zona: 'izq' },
        { texto: 'どちらも温かくして飲む', zona: 'centro' },
        { texto: '抗酸化物質を含む', zona: 'centro' },
        { texto: 'まろやか', zona: 'der' },
        { texto: '種類がとても豊富', zona: 'der' },
      ],
    },
  },

  proscontras: {
    titulo: '在宅勤務',
    propuesta: {
      raiz: '在宅勤務',
      ramas: [],
      elementos: [
        { texto: '通勤がない', zona: 'izq', peso: 5 },
        { texto: '自由な時間割', zona: 'izq', peso: 4 },
        { texto: '家で食事できる', zona: 'izq', peso: 2 },
        { texto: 'チームとの接点が減る', zona: 'der', peso: 4 },
        { texto: '仕事を終わらせにくい', zona: 'der', peso: 3 },
        { texto: '電気代が上がる', zona: 'der', peso: 1 },
      ],
    },
  },

  fuerzas: {
    titulo: '朝のランニング',
    propuesta: {
      raiz: '朝のランニング',
      ramas: [],
      elementos: [
        { texto: 'よく眠りたい', zona: 'izq', peso: 4 },
        { texto: '近くに公園がある', zona: 'izq', peso: 3 },
        { texto: '友達が付き合ってくれる', zona: 'izq', peso: 4 },
        { texto: '夜更かししてしまう', zona: 'der', peso: 5 },
        { texto: '明け方は寒い', zona: 'der', peso: 3 },
        { texto: 'スニーカーがボロボロ', zona: 'der', peso: 2 },
      ],
    },
  },

  foda: {
    titulo: 'カフェを開く',
    propuesta: {
      raiz: 'カフェを開く',
      ramas: [],
      elementos: [
        { texto: 'コーヒーに詳しい', zona: 'f' },
        { texto: '自家製パンのレシピがある', zona: 'f' },
        { texto: '資金が少ない', zona: 'd' },
        { texto: '人を雇ったことがない', zona: 'd' },
        { texto: '近所にカフェがない', zona: 'o' },
        { texto: '2ブロック先にオフィス街', zona: 'o' },
        { texto: '家賃が上がり続けている', zona: 'a' },
        { texto: '近くにチェーン店ができる', zona: 'a' },
      ],
    },
  },

  eisenhower: {
    titulo: '今週のタスク',
    propuesta: {
      raiz: '今週のタスク',
      ramas: [],
      elementos: [
        { texto: '今日中に報告書を出す', zona: 'hacer' },
        { texto: '歯医者に電話する', zona: 'hacer' },
        { texto: 'プレゼンの準備をする', zona: 'agendar' },
        { texto: '運動する', zona: 'agendar' },
        { texto: '資材を発注する', zona: 'delegar' },
        { texto: '取引先に返信する', zona: 'delegar' },
        { texto: 'しょっちゅうスマホを見る', zona: 'quitar' },
        { texto: '議題のない会議', zona: 'quitar' },
      ],
    },
  },

  decision: {
    titulo: '新しい仕事を受ける?',
    propuesta: {
      raiz: '新しい仕事を受ける?',
      ramas: [
        n('受ける', n('給料が上がる'), n('引っ越しが必要'), n('ゼロからのスタート')),
        n('残る', n('もう知っているチーム'), n('給料の頭打ち')),
        n('残る交渉をする', n('うまくいくかもしれない'), n('気まずくなるかもしれない')),
      ],
    },
  },

  tier: {
    titulo: '朝ごはんランキング',
    propuesta: {
      raiz: '朝ごはんランキング',
      ramas: [],
      elementos: [
        { texto: 'チラキレス', zona: 's' },
        { texto: 'ウエボス・ランチェロス', zona: 's' },
        { texto: 'フルーツとヨーグルト', zona: 'a' },
        { texto: 'モジェテス', zona: 'a' },
        { texto: 'トースト', zona: 'b' },
        { texto: '箱入りシリアル', zona: 'c' },
        { texto: 'コーヒーだけ', zona: 'd' },
        { texto: 'タマレス', zona: 'sin' },
      ],
    },
  },

  matriz: {
    titulo: 'どのノートパソコンを買う?',
    propuesta: {
      raiz: 'どのノートパソコンを買う?',
      ramas: [],
      criterios: [
        { texto: '価格', peso: 5 },
        { texto: 'バッテリー', peso: 4 },
        { texto: '重さ', peso: 3 },
        { texto: '画面', peso: 2 },
      ],
      opciones: [
        { texto: '安い方', puntajes: [5, 3, 3, 2] },
        { texto: '軽い方', puntajes: [3, 4, 5, 3] },
        { texto: '高性能な方', puntajes: [1, 2, 2, 5] },
      ],
    },
  },

  ishikawa: {
    titulo: 'ケーキが膨らまなかった',
    propuesta: {
      raiz: 'ケーキが膨らまなかった',
      ramas: [
        n('材料', n('ベーキングパウダーが期限切れ'), n('卵が冷たいまま')),
        n('やり方', n('生地を混ぜすぎた'), n('オーブンを早く開けすぎた')),
        n('道具', n('オーブンの温度が合っていない'), n('型が大きすぎる')),
        n('計量', n('カップで量って、はかりを使わなかった')),
      ],
    },
  },
}

export const EJEMPLOS_ZH: Record<TipoMapa, ContenidoEjemplo> = {
  mental: {
    titulo: '日本之旅',
    propuesta: {
      raiz: '日本之旅',
      ramas: [
        n('路线', n('东京'), n('京都'), n('大阪')),
        n('预算', n('机票'), n('酒店'), n('每日餐费')),
        n('要带的东西', n('转换插头'), n('JR周游券'), n('舒适的鞋子')),
        n('出发前', n('检查护照'), n('兑换日元')),
      ],
    },
  },

  arbol: {
    titulo: '能源',
    propuesta: {
      raiz: '能源',
      ramas: [
        n('可再生能源', n('太阳能'), n('风能'), n('水力')),
        n('化石能源', n('煤炭'), n('石油'), n('天然气')),
        n('核能', n('裂变'), n('聚变')),
      ],
    },
  },

  etimologia: {
    titulo: '主意',
    propuesta: {
      raiz: '主意',
      ramas: [
        n('字源', n('主:主要、为主'), n('意:心意、想法'), n('合起来:主要的想法')),
        n('意思', n('个人的看法或决定'), n('计划或打算'), n('概念或见解')),
        n('用法', n('「拿主意」'), n('「没主意」'), n('「打主意」')),
        n('同源词', n('意思'), n('意见'), n('意图')),
      ],
    },
  },

  llaves: {
    titulo: '自行车的部件',
    propuesta: {
      raiz: '自行车',
      ramas: [
        n('车架', n('上管'), n('前叉'), n('车座')),
        n('传动系统', n('脚踏'), n('链条'), n('飞轮')),
        n('车轮', n('轮圈'), n('辐条'), n('内胎')),
        n('刹车', n('刹车把'), n('刹车片')),
      ],
    },
  },

  circulo: {
    titulo: '咖啡',
    propuesta: {
      raiz: '咖啡',
      ramas: [
        n('含有咖啡因'),
        n('生长在热带地区'),
        n('阿拉比卡和罗布斯塔'),
        n('浅烘或深烘'),
        n('浓缩咖啡'),
        n('人工采摘'),
        n('低因咖啡'),
        n('世界第二大饮品'),
      ],
    },
  },

  flujo: {
    titulo: '预约看医生',
    propuesta: {
      raiz: '需要看诊',
      formaRaiz: 'inicio',
      ramas: cadena([
        paso('需要看诊', 'inicio'),
        paso('打开保险App'),
        paso('这周有号吗?', 'decision'),
        paso('选日期和时间'),
        paso('确认并保存'),
        paso('加入日历', 'fin'),
      ]),
    },
  },

  linea: {
    titulo: '互联网的历史',
    propuesta: {
      raiz: '互联网的历史',
      ramas: [
        n('1969年・ARPANET诞生', n('四所大学')),
        n('1983年・采用TCP/IP协议'),
        n('1991年・第一个公开网站', n('蒂姆·伯纳斯-李')),
        n('2004年・社交网络兴起'),
        n('2007年・手机接管一切'),
      ],
    },
  },

  ciclo: {
    titulo: '水循环',
    propuesta: {
      raiz: '水循环',
      ramas: [
        n('蒸发', n('太阳晒热海洋')),
        n('凝结', n('云朵形成')),
        n('降水', n('下雨或下雪')),
        n('径流', n('河流流回大海')),
      ],
    },
  },

  piramide: {
    titulo: '马斯洛需求层次',
    propuesta: {
      raiz: '马斯洛需求层次',
      ramas: [],
      conjuntos: ['自我实现', '尊重', '爱与安全感', '基本需求'],
      elementos: [
        { texto: '创造并赋予意义', zona: 'p1' },
        { texto: '尊重与成就', zona: 'p2' },
        { texto: '友谊与伴侣', zona: 'p3' },
        { texto: '家庭与工作', zona: 'p3' },
        { texto: '吃饭与睡眠', zona: 'p4' },
        { texto: '健康', zona: 'p4' },
      ],
    },
  },

  venn: {
    titulo: '狗和猫',
    propuesta: {
      raiz: '狗和猫',
      ramas: [],
      conjuntos: ['狗', '猫'],
      elementos: [
        { texto: '会出去散步', zona: 'a' },
        { texto: '会听从指令', zona: 'a' },
        { texto: '自己清洁', zona: 'b' },
        { texto: '用猫砂盆', zona: 'b' },
        { texto: '哺乳动物', zona: 'ab' },
        { texto: '需要打疫苗', zona: 'ab' },
        { texto: '住在家里', zona: 'ab' },
      ],
    },
  },

  comparacion: {
    titulo: '咖啡还是茶',
    propuesta: {
      raiz: '咖啡还是茶',
      ramas: [],
      conjuntos: ['咖啡', '茶'],
      elementos: [
        { texto: '咖啡因更多', zona: 'izq' },
        { texto: '烘焙的味道', zona: 'izq' },
        { texto: '都可以热着喝', zona: 'centro' },
        { texto: '富含抗氧化物', zona: 'centro' },
        { texto: '口感更柔和', zona: 'der' },
        { texto: '品种多得数不清', zona: 'der' },
      ],
    },
  },

  proscontras: {
    titulo: '在家办公',
    propuesta: {
      raiz: '在家办公',
      ramas: [],
      elementos: [
        { texto: '省去通勤', zona: 'izq', peso: 5 },
        { texto: '时间灵活', zona: 'izq', peso: 4 },
        { texto: '在家吃饭', zona: 'izq', peso: 2 },
        { texto: '和团队接触变少', zona: 'der', peso: 4 },
        { texto: '很难下班', zona: 'der', peso: 3 },
        { texto: '电费变高', zona: 'der', peso: 1 },
      ],
    },
  },

  fuerzas: {
    titulo: '早晨跑步',
    propuesta: {
      raiz: '早晨跑步',
      ramas: [],
      elementos: [
        { texto: '想睡得更好', zona: 'izq', peso: 4 },
        { texto: '附近有公园', zona: 'izq', peso: 3 },
        { texto: '有朋友陪着跑', zona: 'izq', peso: 4 },
        { texto: '睡得太晚', zona: 'der', peso: 5 },
        { texto: '清晨很冷', zona: 'der', peso: 3 },
        { texto: '跑鞋已经不行了', zona: 'der', peso: 2 },
      ],
    },
  },

  foda: {
    titulo: '开一家咖啡馆',
    propuesta: {
      raiz: '开一家咖啡馆',
      ramas: [],
      elementos: [
        { texto: '很懂咖啡', zona: 'f' },
        { texto: '有自己的面包配方', zona: 'f' },
        { texto: '资金不多', zona: 'd' },
        { texto: '从没雇过人', zona: 'd' },
        { texto: '附近没有咖啡馆', zona: 'o' },
        { texto: '两条街外全是办公楼', zona: 'o' },
        { texto: '房租一直在涨', zona: 'a' },
        { texto: '附近要开一家连锁店', zona: 'a' },
      ],
    },
  },

  eisenhower: {
    titulo: '我的这一周',
    propuesta: {
      raiz: '我的这一周',
      ramas: [],
      elementos: [
        { texto: '今天交报告', zona: 'hacer' },
        { texto: '给牙医打电话', zona: 'hacer' },
        { texto: '准备演讲', zona: 'agendar' },
        { texto: '去运动', zona: 'agendar' },
        { texto: '订购材料', zona: 'delegar' },
        { texto: '回复供应商', zona: 'delegar' },
        { texto: '总是刷手机', zona: 'quitar' },
        { texto: '没有议程的会议', zona: 'quitar' },
      ],
    },
  },

  decision: {
    titulo: '要不要接受新工作?',
    propuesta: {
      raiz: '要不要接受新工作?',
      ramas: [
        n('接受', n('薪水更高'), n('要搬去别的城市'), n('一切从零开始')),
        n('留下', n('已经熟悉的团队'), n('薪资天花板')),
        n('谈判留下来', n('可能会顺利'), n('也可能变得尴尬')),
      ],
    },
  },

  tier: {
    titulo: '我的早餐排行',
    propuesta: {
      raiz: '我的早餐排行',
      ramas: [],
      elementos: [
        { texto: '奇拉基莱斯', zona: 's' },
        { texto: '农场蛋', zona: 's' },
        { texto: '水果酸奶', zona: 'a' },
        { texto: '莫耶特', zona: 'a' },
        { texto: '吐司', zona: 'b' },
        { texto: '盒装麦片', zona: 'c' },
        { texto: '只喝咖啡', zona: 'd' },
        { texto: '塔马利', zona: 'sin' },
      ],
    },
  },

  matriz: {
    titulo: '买哪台笔记本?',
    propuesta: {
      raiz: '买哪台笔记本?',
      ramas: [],
      criterios: [
        { texto: '价格', peso: 5 },
        { texto: '电池', peso: 4 },
        { texto: '重量', peso: 3 },
        { texto: '屏幕', peso: 2 },
      ],
      opciones: [
        { texto: '便宜的那台', puntajes: [5, 3, 3, 2] },
        { texto: '轻便的那台', puntajes: [3, 4, 5, 3] },
        { texto: '性能强的那台', puntajes: [1, 2, 2, 5] },
      ],
    },
  },

  ishikawa: {
    titulo: '蛋糕没发起来',
    propuesta: {
      raiz: '蛋糕没发起来',
      ramas: [
        n('食材', n('泡打粉过期了'), n('鸡蛋没回温')),
        n('方法', n('面糊搅拌过头'), n('烤箱开早了')),
        n('设备', n('烤箱温度不准'), n('模具太大')),
        n('测量', n('用杯子量而不是用秤')),
      ],
    },
  },
}

export const EJEMPLOS_KO: Record<TipoMapa, ContenidoEjemplo> = {
  mental: {
    titulo: '일본 여행',
    propuesta: {
      raiz: '일본 여행',
      ramas: [
        n('경로', n('도쿄'), n('교토'), n('오사카')),
        n('예산', n('항공권'), n('호텔'), n('하루 식비')),
        n('챙길 것', n('어댑터'), n('JR 패스'), n('편한 신발')),
        n('출발 전', n('여권 확인하기'), n('엔화 환전하기')),
      ],
    },
  },

  arbol: {
    titulo: '에너지원',
    propuesta: {
      raiz: '에너지원',
      ramas: [
        n('재생 에너지', n('태양광'), n('풍력'), n('수력')),
        n('화석 연료', n('석탄'), n('석유'), n('천연가스')),
        n('원자력', n('핵분열'), n('핵융합')),
      ],
    },
  },

  etimologia: {
    titulo: '아이디어',
    propuesta: {
      raiz: '아이디어',
      ramas: [
        n('어원', n('그리스어 idéa「형태, 모습」'), n('ideîn「보다」에서'), n('영어를 거쳐 한국어에 정착')),
        n('뜻', n('머릿속에 떠오르는 생각'), n('계획이나 의도'), n('개념이나 의견')),
        n('쓰임', n('「아이디어가 떠오르다」'), n('「아이디어가 없다」'), n('「아이디어에 익숙해지다」')),
        n('자주 쓰는 표현', n('아이디어맨'), n('좋은 아이디어'), n('아이디어 회의')),
      ],
    },
  },

  llaves: {
    titulo: '자전거의 부품',
    propuesta: {
      raiz: '자전거',
      ramas: [
        n('프레임', n('탑튜브'), n('포크'), n('안장')),
        n('구동계', n('페달'), n('체인'), n('스프로킷')),
        n('바퀴', n('림'), n('스포크'), n('튜브')),
        n('브레이크', n('브레이크 레버'), n('브레이크 패드')),
      ],
    },
  },

  circulo: {
    titulo: '커피',
    propuesta: {
      raiz: '커피',
      ramas: [
        n('카페인이 들어 있어요'),
        n('열대 지방에서 자라요'),
        n('아라비카와 로부스타'),
        n('라이트 로스트와 다크 로스트'),
        n('에스프레소'),
        n('손으로 수확해요'),
        n('디카페인'),
        n('세계에서 두 번째로 많이 마시는 음료'),
      ],
    },
  },

  flujo: {
    titulo: '병원 예약하기',
    propuesta: {
      raiz: '진료가 필요해요',
      formaRaiz: 'inicio',
      ramas: cadena([
        paso('진료가 필요해요', 'inicio'),
        paso('보험 앱 열기'),
        paso('이번 주에 예약 가능?', 'decision'),
        paso('날짜와 시간 고르기'),
        paso('확인하고 저장하기'),
        paso('캘린더에 추가하기', 'fin'),
      ]),
    },
  },

  linea: {
    titulo: '인터넷의 역사',
    propuesta: {
      raiz: '인터넷의 역사',
      ramas: [
        n('1969년 · ARPANET 탄생', n('대학교 네 곳')),
        n('1983년 · TCP/IP 채택'),
        n('1991년 · 최초의 공개 웹사이트', n('팀 버너스리')),
        n('2004년 · 소셜 네트워크 등장'),
        n('2007년 · 휴대폰이 모든 걸 장악'),
      ],
    },
  },

  ciclo: {
    titulo: '물의 순환',
    propuesta: {
      raiz: '물의 순환',
      ramas: [
        n('증발', n('태양이 바다를 데워요')),
        n('응결', n('구름이 만들어져요')),
        n('강수', n('비나 눈이 내려요')),
        n('유출', n('강물이 바다로 돌아가요')),
      ],
    },
  },

  piramide: {
    titulo: '매슬로의 욕구 단계',
    propuesta: {
      raiz: '매슬로의 욕구 단계',
      ramas: [],
      conjuntos: ['자아실현', '존중', '애정과 안정', '기본 욕구'],
      elementos: [
        { texto: '창조하고 의미 찾기', zona: 'p1' },
        { texto: '존중과 성취', zona: 'p2' },
        { texto: '우정과 연인', zona: 'p3' },
        { texto: '집과 일', zona: 'p3' },
        { texto: '먹기와 자기', zona: 'p4' },
        { texto: '건강', zona: 'p4' },
      ],
    },
  },

  venn: {
    titulo: '개와 고양이',
    propuesta: {
      raiz: '개와 고양이',
      ramas: [],
      conjuntos: ['개', '고양이'],
      elementos: [
        { texto: '산책을 나가요', zona: 'a' },
        { texto: '명령을 따라요', zona: 'a' },
        { texto: '스스로 그루밍해요', zona: 'b' },
        { texto: '모래 화장실을 써요', zona: 'b' },
        { texto: '포유류예요', zona: 'ab' },
        { texto: '백신이 필요해요', zona: 'ab' },
        { texto: '집 안에서 살아요', zona: 'ab' },
      ],
    },
  },

  comparacion: {
    titulo: '커피냐 차냐',
    propuesta: {
      raiz: '커피냐 차냐',
      ramas: [],
      conjuntos: ['커피', '차'],
      elementos: [
        { texto: '카페인이 더 많아요', zona: 'izq' },
        { texto: '로스팅 향이 나요', zona: 'izq' },
        { texto: '둘 다 따뜻하게 마셔요', zona: 'centro' },
        { texto: '항산화물질이 풍부해요', zona: 'centro' },
        { texto: '더 부드러워요', zona: 'der' },
        { texto: '종류가 정말 다양해요', zona: 'der' },
      ],
    },
  },

  proscontras: {
    titulo: '재택근무',
    propuesta: {
      raiz: '재택근무',
      ramas: [],
      elementos: [
        { texto: '출퇴근이 없어요', zona: 'izq', peso: 5 },
        { texto: '시간이 자유로워요', zona: 'izq', peso: 4 },
        { texto: '집에서 밥을 먹어요', zona: 'izq', peso: 2 },
        { texto: '팀과의 교류가 줄어요', zona: 'der', peso: 4 },
        { texto: '일을 끝내기 어려워요', zona: 'der', peso: 3 },
        { texto: '전기세가 올라요', zona: 'der', peso: 1 },
      ],
    },
  },

  fuerzas: {
    titulo: '아침 러닝',
    propuesta: {
      raiz: '아침 러닝',
      ramas: [],
      elementos: [
        { texto: '더 잘 자고 싶어요', zona: 'izq', peso: 4 },
        { texto: '근처에 공원이 있어요', zona: 'izq', peso: 3 },
        { texto: '같이 뛰어줄 친구가 있어요', zona: 'izq', peso: 4 },
        { texto: '늦게 자요', zona: 'der', peso: 5 },
        { texto: '새벽엔 추워요', zona: 'der', peso: 3 },
        { texto: '운동화가 다 낡았어요', zona: 'der', peso: 2 },
      ],
    },
  },

  foda: {
    titulo: '카페 열기',
    propuesta: {
      raiz: '카페 열기',
      ramas: [],
      elementos: [
        { texto: '커피를 잘 알아요', zona: 'f' },
        { texto: '나만의 빵 레시피가 있어요', zona: 'f' },
        { texto: '자본이 별로 없어요', zona: 'd' },
        { texto: '사람을 고용해본 적이 없어요', zona: 'd' },
        { texto: '동네에 카페가 없어요', zona: 'o' },
        { texto: '두 블록 거리에 사무실이 많아요', zona: 'o' },
        { texto: '임대료가 계속 오르고 있어요', zona: 'a' },
        { texto: '근처에 프랜차이즈가 생겨요', zona: 'a' },
      ],
    },
  },

  eisenhower: {
    titulo: '이번 주',
    propuesta: {
      raiz: '이번 주',
      ramas: [],
      elementos: [
        { texto: '오늘 보고서 제출하기', zona: 'hacer' },
        { texto: '치과에 전화하기', zona: 'hacer' },
        { texto: '발표 준비하기', zona: 'agendar' },
        { texto: '운동하기', zona: 'agendar' },
        { texto: '자재 주문하기', zona: 'delegar' },
        { texto: '공급업체에 답장하기', zona: 'delegar' },
        { texto: '계속 휴대폰 보기', zona: 'quitar' },
        { texto: '안건 없는 회의', zona: 'quitar' },
      ],
    },
  },

  decision: {
    titulo: '새 일자리를 받아들일까?',
    propuesta: {
      raiz: '새 일자리를 받아들일까?',
      ramas: [
        n('수락', n('더 높은 연봉'), n('이사해야 함'), n('처음부터 다시 시작')),
        n('남기', n('이미 아는 팀'), n('연봉 한계')),
        n('남는 조건으로 협상', n('잘 풀릴 수도 있어요'), n('어색해질 수도 있어요')),
      ],
    },
  },

  tier: {
    titulo: '내 아침 메뉴',
    propuesta: {
      raiz: '내 아침 메뉴',
      ramas: [],
      elementos: [
        { texto: '칠라킬레스', zona: 's' },
        { texto: '우에보스 란체로스', zona: 's' },
        { texto: '요거트와 과일', zona: 'a' },
        { texto: '몰레테스', zona: 'a' },
        { texto: '토스트', zona: 'b' },
        { texto: '박스 시리얼', zona: 'c' },
        { texto: '커피만', zona: 'd' },
        { texto: '타말레스', zona: 'sin' },
      ],
    },
  },

  matriz: {
    titulo: '어떤 노트북을 살까?',
    propuesta: {
      raiz: '어떤 노트북을 살까?',
      ramas: [],
      criterios: [
        { texto: '가격', peso: 5 },
        { texto: '배터리', peso: 4 },
        { texto: '무게', peso: 3 },
        { texto: '화면', peso: 2 },
      ],
      opciones: [
        { texto: '저렴한 것', puntajes: [5, 3, 3, 2] },
        { texto: '가벼운 것', puntajes: [3, 4, 5, 3] },
        { texto: '강력한 것', puntajes: [1, 2, 2, 5] },
      ],
    },
  },

  ishikawa: {
    titulo: '케이크가 부풀지 않았어요',
    propuesta: {
      raiz: '케이크가 부풀지 않았어요',
      ramas: [
        n('재료', n('베이킹파우더 유통기한 지남'), n('달걀이 차가운 채로')),
        n('방법', n('반죽을 너무 많이 섞었어요'), n('오븐을 너무 일찍 열었어요')),
        n('장비', n('오븐 온도가 안 맞아요'), n('틀이 너무 커요')),
        n('계량', n('저울 대신 컵으로 계량했어요')),
      ],
    },
  },
}

export const EJEMPLOS_RU: Record<TipoMapa, ContenidoEjemplo> = {
  mental: {
    titulo: 'Поездка в Японию',
    propuesta: {
      raiz: 'Поездка в Японию',
      ramas: [
        n('Маршрут', n('Токио'), n('Киото'), n('Осака')),
        n('Бюджет', n('Перелёт'), n('Отель'), n('Еда в день')),
        n('Что взять', n('Переходник'), n('JR Pass'), n('Удобная обувь')),
        n('Перед вылетом', n('Проверить паспорт'), n('Поменять йены')),
      ],
    },
  },

  arbol: {
    titulo: 'Источники энергии',
    propuesta: {
      raiz: 'Источники энергии',
      ramas: [
        n('Возобновляемые', n('Солнечная'), n('Ветровая'), n('Гидроэнергия')),
        n('Ископаемые', n('Уголь'), n('Нефть'), n('Природный газ')),
        n('Ядерная', n('Деление'), n('Синтез')),
      ],
    },
  },

  etimologia: {
    titulo: 'Идея',
    propuesta: {
      raiz: 'Идея',
      ramas: [
        n('Происхождение', n('Греч. idéa: «форма, облик»'), n('От ideîn: «видеть»'), n('В русский — через французский и немецкий')),
        n('Значения', n('Мысленный образ'), n('План или замысел'), n('Понятие или мнение')),
        n('Употребление', n('«Прийти в голову идея»'), n('«Понятия не иметь»'), n('«Свыкнуться с идеей»')),
        n('Однокоренные слова', n('Идеал'), n('Идеология'), n('Идейный')),
      ],
    },
  },

  llaves: {
    titulo: 'Части велосипеда',
    propuesta: {
      raiz: 'Велосипед',
      ramas: [
        n('Рама', n('Верхняя труба'), n('Вилка'), n('Седло')),
        n('Трансмиссия', n('Педали'), n('Цепь'), n('Кассета')),
        n('Колёса', n('Обод'), n('Спицы'), n('Камера')),
        n('Тормоза', n('Ручки тормоза'), n('Колодки')),
      ],
    },
  },

  circulo: {
    titulo: 'Кофе',
    propuesta: {
      raiz: 'Кофе',
      ramas: [
        n('Содержит кофеин'),
        n('Растёт в тропиках'),
        n('Арабика и робуста'),
        n('Светлая или тёмная обжарка'),
        n('Эспрессо'),
        n('Собирается вручную'),
        n('Без кофеина'),
        n('Второй по популярности напиток в мире'),
      ],
    },
  },

  flujo: {
    titulo: 'Записаться к врачу',
    propuesta: {
      raiz: 'Нужна консультация',
      formaRaiz: 'inicio',
      ramas: cadena([
        paso('Нужна консультация', 'inicio'),
        paso('Открыть приложение страховой'),
        paso('Есть окно на этой неделе?', 'decision'),
        paso('Выбрать день и время'),
        paso('Подтвердить и сохранить'),
        paso('Добавить в календарь', 'fin'),
      ]),
    },
  },

  linea: {
    titulo: 'История интернета',
    propuesta: {
      raiz: 'История интернета',
      ramas: [
        n('1969 · Рождение ARPANET', n('Четыре университета')),
        n('1983 · Принят протокол TCP/IP'),
        n('1991 · Первый публичный сайт', n('Тим Бернерс-Ли')),
        n('2004 · Приходят соцсети'),
        n('2007 · Смартфон подчиняет себе всё'),
      ],
    },
  },

  ciclo: {
    titulo: 'Круговорот воды',
    propuesta: {
      raiz: 'Круговорот воды',
      ramas: [
        n('Испарение', n('Солнце нагревает море')),
        n('Конденсация', n('Образуются облака')),
        n('Осадки', n('Идёт дождь или снег')),
        n('Сток', n('Реки возвращаются в море')),
      ],
    },
  },

  piramide: {
    titulo: 'Пирамида Маслоу',
    propuesta: {
      raiz: 'Пирамида Маслоу',
      ramas: [],
      conjuntos: ['Самореализация', 'Признание', 'Любовь и безопасность', 'Базовые потребности'],
      elementos: [
        { texto: 'Творить и находить смысл', zona: 'p1' },
        { texto: 'Уважение и достижения', zona: 'p2' },
        { texto: 'Дружба и партнёрство', zona: 'p3' },
        { texto: 'Дом и работа', zona: 'p3' },
        { texto: 'Еда и сон', zona: 'p4' },
        { texto: 'Здоровье', zona: 'p4' },
      ],
    },
  },

  venn: {
    titulo: 'Собаки и кошки',
    propuesta: {
      raiz: 'Собаки и кошки',
      ramas: [],
      conjuntos: ['Собаки', 'Кошки'],
      elementos: [
        { texto: 'Гуляют на улице', zona: 'a' },
        { texto: 'Слушаются команд', zona: 'a' },
        { texto: 'Сами вычищают себя', zona: 'b' },
        { texto: 'Пользуются лотком', zona: 'b' },
        { texto: 'Млекопитающие', zona: 'ab' },
        { texto: 'Нужны прививки', zona: 'ab' },
        { texto: 'Живут дома', zona: 'ab' },
      ],
    },
  },

  comparacion: {
    titulo: 'Кофе или чай',
    propuesta: {
      raiz: 'Кофе или чай',
      ramas: [],
      conjuntos: ['Кофе', 'Чай'],
      elementos: [
        { texto: 'Больше кофеина', zona: 'izq' },
        { texto: 'Обжаренный вкус', zona: 'izq' },
        { texto: 'Оба пьют горячими', zona: 'centro' },
        { texto: 'Богаты антиоксидантами', zona: 'centro' },
        { texto: 'Мягче', zona: 'der' },
        { texto: 'Огромное разнообразие сортов', zona: 'der' },
      ],
    },
  },

  proscontras: {
    titulo: 'Работа из дома',
    propuesta: {
      raiz: 'Работа из дома',
      ramas: [],
      elementos: [
        { texto: 'Экономия на дороге', zona: 'izq', peso: 5 },
        { texto: 'Гибкий график', zona: 'izq', peso: 4 },
        { texto: 'Домашняя еда', zona: 'izq', peso: 2 },
        { texto: 'Меньше контакта с командой', zona: 'der', peso: 4 },
        { texto: 'Трудно отключиться от работы', zona: 'der', peso: 3 },
        { texto: 'Счёт за электричество выше', zona: 'der', peso: 1 },
      ],
    },
  },

  fuerzas: {
    titulo: 'Утренние пробежки',
    propuesta: {
      raiz: 'Утренние пробежки',
      ramas: [],
      elementos: [
        { texto: 'Хочется лучше спать', zona: 'izq', peso: 4 },
        { texto: 'Рядом есть парк', zona: 'izq', peso: 3 },
        { texto: 'Подруга составляет компанию', zona: 'izq', peso: 4 },
        { texto: 'Поздний отбой', zona: 'der', peso: 5 },
        { texto: 'На рассвете холодно', zona: 'der', peso: 3 },
        { texto: 'Кроссовки совсем сносились', zona: 'der', peso: 2 },
      ],
    },
  },

  foda: {
    titulo: 'Открыть кофейню',
    propuesta: {
      raiz: 'Открыть кофейню',
      ramas: [],
      elementos: [
        { texto: 'Хорошо разбираюсь в кофе', zona: 'f' },
        { texto: 'Свой рецепт хлеба', zona: 'f' },
        { texto: 'Мало капитала', zona: 'd' },
        { texto: 'Никогда не нанимал сотрудников', zona: 'd' },
        { texto: 'В районе нет кофеен', zona: 'o' },
        { texto: 'Офисы в двух кварталах', zona: 'o' },
        { texto: 'Аренда постоянно растёт', zona: 'a' },
        { texto: 'Рядом открывается сеть', zona: 'a' },
      ],
    },
  },

  eisenhower: {
    titulo: 'Моя неделя',
    propuesta: {
      raiz: 'Моя неделя',
      ramas: [],
      elementos: [
        { texto: 'Сдать отчёт сегодня', zona: 'hacer' },
        { texto: 'Позвонить стоматологу', zona: 'hacer' },
        { texto: 'Подготовить презентацию', zona: 'agendar' },
        { texto: 'Позаниматься спортом', zona: 'agendar' },
        { texto: 'Заказать материалы', zona: 'delegar' },
        { texto: 'Ответить поставщику', zona: 'delegar' },
        { texto: 'Постоянно смотреть в телефон', zona: 'quitar' },
        { texto: 'Встреча без повестки', zona: 'quitar' },
      ],
    },
  },

  decision: {
    titulo: 'Соглашаться на новую работу?',
    propuesta: {
      raiz: 'Соглашаться на новую работу?',
      ramas: [
        n('Согласиться', n('Зарплата выше'), n('Переезд в другой город'), n('Начинать с нуля')),
        n('Остаться', n('Уже знакомая команда'), n('Потолок зарплаты')),
        n('Договориться остаться', n('Может сложиться удачно'), n('Может стать неловко')),
      ],
    },
  },

  tier: {
    titulo: 'Мои завтраки',
    propuesta: {
      raiz: 'Мои завтраки',
      ramas: [],
      elementos: [
        { texto: 'Чилакилес', zona: 's' },
        { texto: 'Уэвос ранчерос', zona: 's' },
        { texto: 'Фрукты с йогуртом', zona: 'a' },
        { texto: 'Мольетес', zona: 'a' },
        { texto: 'Тост', zona: 'b' },
        { texto: 'Хлопья из коробки', zona: 'c' },
        { texto: 'Только кофе', zona: 'd' },
        { texto: 'Тамале', zona: 'sin' },
      ],
    },
  },

  matriz: {
    titulo: 'Какой ноутбук купить?',
    propuesta: {
      raiz: 'Какой ноутбук купить?',
      ramas: [],
      criterios: [
        { texto: 'Цена', peso: 5 },
        { texto: 'Батарея', peso: 4 },
        { texto: 'Вес', peso: 3 },
        { texto: 'Экран', peso: 2 },
      ],
      opciones: [
        { texto: 'Дешёвый', puntajes: [5, 3, 3, 2] },
        { texto: 'Лёгкий', puntajes: [3, 4, 5, 3] },
        { texto: 'Мощный', puntajes: [1, 2, 2, 5] },
      ],
    },
  },

  ishikawa: {
    titulo: 'Торт не поднялся',
    propuesta: {
      raiz: 'Торт не поднялся',
      ramas: [
        n('Ингредиенты', n('Просроченный разрыхлитель'), n('Холодные яйца')),
        n('Способ', n('Тесто перемешано слишком сильно'), n('Духовка открыта слишком рано')),
        n('Оборудование', n('Духовка плохо откалибрована'), n('Форма слишком большая')),
        n('Измерение', n('Мерили чашкой, а не весами')),
      ],
    },
  },
}

export const EJEMPLOS_HI: Record<TipoMapa, ContenidoEjemplo> = {
  mental: {
    titulo: 'जापान की यात्रा',
    propuesta: {
      raiz: 'जापान की यात्रा',
      ramas: [
        n('रूट', n('टोक्यो'), n('क्योतो'), n('ओसाका')),
        n('बजट', n('फ़्लाइट'), n('होटल'), n('रोज़ का खाना')),
        n('क्या ले जाना है', n('एडॉप्टर'), n('JR पास'), n('आरामदायक जूते')),
        n('निकलने से पहले', n('पासपोर्ट चेक करना'), n('येन बदलवाना')),
      ],
    },
  },

  arbol: {
    titulo: 'ऊर्जा के स्रोत',
    propuesta: {
      raiz: 'ऊर्जा के स्रोत',
      ramas: [
        n('नवीकरणीय', n('सौर'), n('पवन'), n('जल विद्युत')),
        n('जीवाश्म', n('कोयला'), n('पेट्रोलियम'), n('प्राकृतिक गैस')),
        n('परमाणु ऊर्जा', n('विखंडन'), n('संलयन')),
      ],
    },
  },

  etimologia: {
    titulo: 'विचार',
    propuesta: {
      raiz: 'विचार',
      ramas: [
        n('मूल', n('वि: अलग, विशेष रूप से'), n('चर्: चलना, घूमना'), n('मिलकर: मन में घूमना, सोचना')),
        n('अर्थ', n('मन में उठने वाली सोच'), n('योजना या इरादा'), n('धारणा या राय')),
        n('इस्तेमाल', n('‘विचार आना’'), n('‘कोई विचार नहीं’'), n('‘विचार से जुड़ना’')),
        n('इसी मूल के शब्द', n('विचारक'), n('विचारशील'), n('विचार-विमर्श')),
      ],
    },
  },

  llaves: {
    titulo: 'साइकिल के हिस्से',
    propuesta: {
      raiz: 'साइकिल',
      ramas: [
        n('फ़्रेम', n('ऊपरी ट्यूब'), n('फ़ोर्क'), n('सीट')),
        n('ट्रांसमिशन', n('पैडल'), n('चेन'), n('स्प्रॉकेट')),
        n('पहिए', n('रिम'), n('स्पोक'), n('ट्यूब')),
        n('ब्रेक', n('ब्रेक लीवर'), n('ब्रेक पैड')),
      ],
    },
  },

  circulo: {
    titulo: 'कॉफ़ी',
    propuesta: {
      raiz: 'कॉफ़ी',
      ramas: [
        n('इसमें कैफ़ीन होता है'),
        n('उष्णकटिबंधीय इलाक़ों में उगती है'),
        n('अरेबिका और रोबस्टा'),
        n('हल्का या गहरा रोस्ट'),
        n('एस्प्रेसो'),
        n('हाथ से तोड़ी जाती है'),
        n('डीकैफ़ीनेटेड'),
        n('दुनिया में दूसरा सबसे ज़्यादा पिया जाने वाला पेय'),
      ],
    },
  },

  flujo: {
    titulo: 'डॉक्टर की अपॉइंटमेंट लेना',
    propuesta: {
      raiz: 'अपॉइंटमेंट चाहिए',
      formaRaiz: 'inicio',
      ramas: cadena([
        paso('अपॉइंटमेंट चाहिए', 'inicio'),
        paso('इंश्योरेंस ऐप खोलना'),
        paso('क्या इस हफ़्ते स्लॉट है?', 'decision'),
        paso('दिन और समय चुनना'),
        paso('कन्फ़र्म करना और सेव करना'),
        paso('कैलेंडर में डालना', 'fin'),
      ]),
    },
  },

  linea: {
    titulo: 'इंटरनेट का इतिहास',
    propuesta: {
      raiz: 'इंटरनेट का इतिहास',
      ramas: [
        n('1969 · ARPANET का जन्म', n('चार विश्वविद्यालय')),
        n('1983 · TCP/IP अपनाया गया'),
        n('1991 · पहली सार्वजनिक वेबसाइट', n('टिम बर्नर्स-ली')),
        n('2004 · सोशल नेटवर्क आते हैं'),
        n('2007 · मोबाइल सब कुछ अपने हाथ में ले लेता है'),
      ],
    },
  },

  ciclo: {
    titulo: 'जल चक्र',
    propuesta: {
      raiz: 'जल चक्र',
      ramas: [
        n('वाष्पीकरण', n('सूरज समुद्र को गर्म करता है')),
        n('संघनन', n('बादल बनते हैं')),
        n('वर्षा', n('बारिश या बर्फ़ गिरती है')),
        n('अपवाह', n('नदियाँ वापस समुद्र में मिलती हैं')),
      ],
    },
  },

  piramide: {
    titulo: 'मास्लो का आवश्यकता पिरामिड',
    propuesta: {
      raiz: 'मास्लो का आवश्यकता पिरामिड',
      ramas: [],
      conjuntos: ['आत्म-साक्षात्कार', 'सम्मान', 'प्रेम और सुरक्षा', 'बुनियादी ज़रूरतें'],
      elementos: [
        { texto: 'रचना करना और अर्थ देना', zona: 'p1' },
        { texto: 'सम्मान और उपलब्धियाँ', zona: 'p2' },
        { texto: 'दोस्ती और साथी', zona: 'p3' },
        { texto: 'घर और काम', zona: 'p3' },
        { texto: 'खाना और सोना', zona: 'p4' },
        { texto: 'स्वास्थ्य', zona: 'p4' },
      ],
    },
  },

  venn: {
    titulo: 'कुत्ते और बिल्लियाँ',
    propuesta: {
      raiz: 'कुत्ते और बिल्लियाँ',
      ramas: [],
      conjuntos: ['कुत्ते', 'बिल्लियाँ'],
      elementos: [
        { texto: 'टहलने जाते हैं', zona: 'a' },
        { texto: 'कमांड मानते हैं', zona: 'a' },
        { texto: 'खुद को साफ़ करती हैं', zona: 'b' },
        { texto: 'लिटर बॉक्स इस्तेमाल करती हैं', zona: 'b' },
        { texto: 'स्तनधारी हैं', zona: 'ab' },
        { texto: 'वैक्सीन ज़रूरी है', zona: 'ab' },
        { texto: 'घर के अंदर रहते हैं', zona: 'ab' },
      ],
    },
  },

  comparacion: {
    titulo: 'कॉफ़ी या चाय',
    propuesta: {
      raiz: 'कॉफ़ी या चाय',
      ramas: [],
      conjuntos: ['कॉफ़ी', 'चाय'],
      elementos: [
        { texto: 'ज़्यादा कैफ़ीन', zona: 'izq' },
        { texto: 'भुना हुआ स्वाद', zona: 'izq' },
        { texto: 'दोनों गरम पी जाती हैं', zona: 'centro' },
        { texto: 'एंटीऑक्सीडेंट से भरपूर', zona: 'centro' },
        { texto: 'ज़्यादा हल्की', zona: 'der' },
        { texto: 'बेशुमार क़िस्में', zona: 'der' },
      ],
    },
  },

  proscontras: {
    titulo: 'घर से काम',
    propuesta: {
      raiz: 'घर से काम',
      ramas: [],
      elementos: [
        { texto: 'आने-जाने का झंझट नहीं', zona: 'izq', peso: 5 },
        { texto: 'समय लचीला', zona: 'izq', peso: 4 },
        { texto: 'घर का खाना', zona: 'izq', peso: 2 },
        { texto: 'टीम से कम संपर्क', zona: 'der', peso: 4 },
        { texto: 'काम बंद करना मुश्किल', zona: 'der', peso: 3 },
        { texto: 'बिजली का बिल ज़्यादा', zona: 'der', peso: 1 },
      ],
    },
  },

  fuerzas: {
    titulo: 'सुबह की दौड़',
    propuesta: {
      raiz: 'सुबह की दौड़',
      ramas: [],
      elementos: [
        { texto: 'बेहतर नींद चाहिए', zona: 'izq', peso: 4 },
        { texto: 'पास में पार्क है', zona: 'izq', peso: 3 },
        { texto: 'एक दोस्त साथ देती है', zona: 'izq', peso: 4 },
        { texto: 'देर रात सोना', zona: 'der', peso: 5 },
        { texto: 'सुबह-सुबह ठंड होती है', zona: 'der', peso: 3 },
        { texto: 'जूते पूरी तरह घिस चुके हैं', zona: 'der', peso: 2 },
      ],
    },
  },

  foda: {
    titulo: 'कैफ़े खोलना',
    propuesta: {
      raiz: 'कैफ़े खोलना',
      ramas: [],
      elementos: [
        { texto: 'कॉफ़ी की अच्छी समझ', zona: 'f' },
        { texto: 'अपनी ब्रेड रेसिपी', zona: 'f' },
        { texto: 'पूँजी कम', zona: 'd' },
        { texto: 'कभी किसी को नौकरी पर नहीं रखा', zona: 'd' },
        { texto: 'इलाक़े में कोई कैफ़े नहीं', zona: 'o' },
        { texto: 'दो गलियों में दफ़्तर ही दफ़्तर', zona: 'o' },
        { texto: 'किराया लगातार बढ़ रहा है', zona: 'a' },
        { texto: 'पास में एक चेन खुल रही है', zona: 'a' },
      ],
    },
  },

  eisenhower: {
    titulo: 'मेरा हफ़्ता',
    propuesta: {
      raiz: 'मेरा हफ़्ता',
      ramas: [],
      elementos: [
        { texto: 'आज रिपोर्ट देना', zona: 'hacer' },
        { texto: 'डेंटिस्ट को कॉल करना', zona: 'hacer' },
        { texto: 'प्रेज़ेंटेशन तैयार करना', zona: 'agendar' },
        { texto: 'एक्सरसाइज़ करना', zona: 'agendar' },
        { texto: 'सामान ऑर्डर करना', zona: 'delegar' },
        { texto: 'सप्लायर को जवाब देना', zona: 'delegar' },
        { texto: 'बार-बार फ़ोन देखना', zona: 'quitar' },
        { texto: 'बिना एजेंडा वाली मीटिंग', zona: 'quitar' },
      ],
    },
  },

  decision: {
    titulo: 'नई नौकरी लूँ?',
    propuesta: {
      raiz: 'नई नौकरी लूँ?',
      ramas: [
        n('स्वीकार करना', n('ज़्यादा सैलरी'), n('शहर बदलना पड़ेगा'), n('शून्य से शुरुआत')),
        n('रुक जाना', n('पहले से जानी-पहचानी टीम'), n('सैलरी की सीमा')),
        n('रुकने के लिए बातचीत करना', n('अच्छा भी हो सकता है'), n('अजीब भी हो सकता है')),
      ],
    },
  },

  tier: {
    titulo: 'मेरे नाश्ते',
    propuesta: {
      raiz: 'मेरे नाश्ते',
      ramas: [],
      elementos: [
        { texto: 'चिलाकिलेस', zona: 's' },
        { texto: 'ह्वेवोस रांचेरोस', zona: 's' },
        { texto: 'फल और दही', zona: 'a' },
        { texto: 'मोलेटेस', zona: 'a' },
        { texto: 'टोस्ट', zona: 'b' },
        { texto: 'बॉक्स वाला सीरियल', zona: 'c' },
        { texto: 'सिर्फ़ कॉफ़ी', zona: 'd' },
        { texto: 'तमाले', zona: 'sin' },
      ],
    },
  },

  matriz: {
    titulo: 'कौन-सा लैपटॉप खरीदूँ?',
    propuesta: {
      raiz: 'कौन-सा लैपटॉप खरीदूँ?',
      ramas: [],
      criterios: [
        { texto: 'क़ीमत', peso: 5 },
        { texto: 'बैटरी', peso: 4 },
        { texto: 'वज़न', peso: 3 },
        { texto: 'स्क्रीन', peso: 2 },
      ],
      opciones: [
        { texto: 'सस्ता वाला', puntajes: [5, 3, 3, 2] },
        { texto: 'हल्का वाला', puntajes: [3, 4, 5, 3] },
        { texto: 'दमदार वाला', puntajes: [1, 2, 2, 5] },
      ],
    },
  },

  ishikawa: {
    titulo: 'केक फूला नहीं',
    propuesta: {
      raiz: 'केक फूला नहीं',
      ramas: [
        n('सामग्री', n('बेकिंग पाउडर एक्सपायर हो चुका था'), n('अंडे ठंडे थे')),
        n('तरीक़ा', n('घोल को ज़रूरत से ज़्यादा फेंटा गया'), n('ओवन जल्दी खोल दिया गया')),
        n('उपकरण', n('ओवन का तापमान सही नहीं था'), n('साँचा बहुत बड़ा था')),
        n('मापन', n('कप से मापा गया, तराज़ू से नहीं')),
      ],
    },
  },
}

export const EJEMPLOS_TR: Record<TipoMapa, ContenidoEjemplo> = {
  mental: {
    titulo: 'Japonya gezisi',
    propuesta: {
      raiz: 'Japonya gezisi',
      ramas: [
        n('Güzergah', n('Tokyo'), n('Kyoto'), n('Osaka')),
        n('Bütçe', n('Uçak biletleri'), n('Otel'), n('Günlük yemek')),
        n('Ne götürmeli', n('Adaptör'), n('JR Pass'), n('Rahat ayakkabılar')),
        n('Gitmeden önce', n('Pasaportu kontrol etmek'), n('Yen bozdurmak')),
      ],
    },
  },

  arbol: {
    titulo: 'Enerji kaynakları',
    propuesta: {
      raiz: 'Enerji kaynakları',
      ramas: [
        n('Yenilenebilir', n('Güneş'), n('Rüzgar'), n('Hidroelektrik')),
        n('Fosil', n('Kömür'), n('Petrol'), n('Doğal gaz')),
        n('Nükleer', n('Fisyon'), n('Füzyon')),
      ],
    },
  },

  etimologia: {
    titulo: 'Fikir',
    propuesta: {
      raiz: 'Fikir',
      ramas: [
        n('Köken', n('Ar. fikr: “düşünce”'), n('f-k-r kökünden: “düşünmek”'), n('Arapçadan Türkçeye geçti')),
        n('Anlamlar', n('Zihinde beliren düşünce'), n('Plan ya da niyet'), n('Kavram ya da görüş')),
        n('Kullanımlar', n('«Bir fikri olmak»'), n('«Hiç fikri olmamak»'), n('«Fikre alışmak»')),
        n('Kelime ailesi', n('Fikirdaş'), n('Fikri'), n('Mütefekkir'), n('Tefekkür')),
      ],
    },
  },

  llaves: {
    titulo: 'Bir bisikletin parçaları',
    propuesta: {
      raiz: 'Bisiklet',
      ramas: [
        n('Kadro', n('Üst boru'), n('Çatal'), n('Sele')),
        n('Aktarma organları', n('Pedallar'), n('Zincir'), n('Dişliler')),
        n('Tekerlekler', n('Jant'), n('Jant telleri'), n('İç lastik')),
        n('Frenler', n('Fren kolları'), n('Fren balataları')),
      ],
    },
  },

  circulo: {
    titulo: 'Kahve',
    propuesta: {
      raiz: 'Kahve',
      ramas: [
        n('Kafein içerir'),
        n('Tropik bölgelerde yetişir'),
        n('Arabica ve robusta'),
        n('Açık ya da koyu kavrulmuş'),
        n('Espresso'),
        n('Elle toplanır'),
        n('Kafeinsiz'),
        n('Dünyada en çok içilen ikinci içecek'),
      ],
    },
  },

  flujo: {
    titulo: 'Doktor randevusu almak',
    propuesta: {
      raiz: 'Muayeneye ihtiyacım var',
      formaRaiz: 'inicio',
      ramas: cadena([
        paso('Muayeneye ihtiyacım var', 'inicio'),
        paso('Sigorta uygulamasını açmak'),
        paso('Bu hafta boş yer var mı?', 'decision'),
        paso('Gün ve saat seçmek'),
        paso('Onaylamak ve kaydetmek'),
        paso('Takvime eklemek', 'fin'),
      ]),
    },
  },

  linea: {
    titulo: 'İnternetin tarihi',
    propuesta: {
      raiz: 'İnternetin tarihi',
      ramas: [
        n('1969 · ARPANET doğuyor', n('Dört üniversite')),
        n('1983 · TCP/IP benimseniyor'),
        n('1991 · İlk herkese açık web sitesi', n('Tim Berners-Lee')),
        n('2004 · Sosyal ağlar geliyor'),
        n('2007 · Cep telefonu her şeyi ele geçiriyor'),
      ],
    },
  },

  ciclo: {
    titulo: 'Su döngüsü',
    propuesta: {
      raiz: 'Su döngüsü',
      ramas: [
        n('Buharlaşma', n('Güneş denizi ısıtır')),
        n('Yoğuşma', n('Bulutlar oluşur')),
        n('Yağış', n('Yağmur ya da kar yağar')),
        n('Akış', n('Nehirler denize geri döner')),
      ],
    },
  },

  piramide: {
    titulo: 'Maslow’un ihtiyaçlar piramidi',
    propuesta: {
      raiz: 'Maslow’un ihtiyaçlar piramidi',
      ramas: [],
      conjuntos: ['Kendini gerçekleştirme', 'Saygınlık', 'Sevgi ve güvenlik', 'Temel ihtiyaçlar'],
      elementos: [
        { texto: 'Yaratmak ve anlam vermek', zona: 'p1' },
        { texto: 'Saygı ve başarılar', zona: 'p2' },
        { texto: 'Arkadaşlık ve eş', zona: 'p3' },
        { texto: 'Ev ve iş', zona: 'p3' },
        { texto: 'Yemek ve uyku', zona: 'p4' },
        { texto: 'Sağlık', zona: 'p4' },
      ],
    },
  },

  venn: {
    titulo: 'Köpekler ve kediler',
    propuesta: {
      raiz: 'Köpekler ve kediler',
      ramas: [],
      conjuntos: ['Köpekler', 'Kediler'],
      elementos: [
        { texto: 'Yürüyüşe çıkarlar', zona: 'a' },
        { texto: 'Komutlara uyarlar', zona: 'a' },
        { texto: 'Kendilerini temizlerler', zona: 'b' },
        { texto: 'Kum kabı kullanırlar', zona: 'b' },
        { texto: 'Memeliler', zona: 'ab' },
        { texto: 'Aşıya ihtiyaçları var', zona: 'ab' },
        { texto: 'Evde yaşarlar', zona: 'ab' },
      ],
    },
  },

  comparacion: {
    titulo: 'Kahve mi çay mı',
    propuesta: {
      raiz: 'Kahve mi çay mı',
      ramas: [],
      conjuntos: ['Kahve', 'Çay'],
      elementos: [
        { texto: 'Daha fazla kafein', zona: 'izq' },
        { texto: 'Kavrulmuş tat', zona: 'izq' },
        { texto: 'İkisi de sıcak içilir', zona: 'centro' },
        { texto: 'Antioksidan bakımından zengin', zona: 'centro' },
        { texto: 'Daha yumuşak', zona: 'der' },
        { texto: 'Sayısız çeşit', zona: 'der' },
      ],
    },
  },

  proscontras: {
    titulo: 'Evden çalışmak',
    propuesta: {
      raiz: 'Evden çalışmak',
      ramas: [],
      elementos: [
        { texto: 'Yolda vakit kaybetmiyorum', zona: 'izq', peso: 5 },
        { texto: 'Esnek çalışma saatleri', zona: 'izq', peso: 4 },
        { texto: 'Evde yemek yiyorum', zona: 'izq', peso: 2 },
        { texto: 'Ekiple daha az temas', zona: 'der', peso: 4 },
        { texto: 'İşi bırakmak zor', zona: 'der', peso: 3 },
        { texto: 'Elektrik faturası artıyor', zona: 'der', peso: 1 },
      ],
    },
  },

  fuerzas: {
    titulo: 'Sabahları koşuya çıkmak',
    propuesta: {
      raiz: 'Sabahları koşuya çıkmak',
      ramas: [],
      elementos: [
        { texto: 'Daha iyi uyumak istiyorum', zona: 'izq', peso: 4 },
        { texto: 'Yakında bir park var', zona: 'izq', peso: 3 },
        { texto: 'Bir arkadaşım bana eşlik ediyor', zona: 'izq', peso: 4 },
        { texto: 'Geç yatıyorum', zona: 'der', peso: 5 },
        { texto: 'Şafakta hava soğuk oluyor', zona: 'der', peso: 3 },
        { texto: 'Koşu ayakkabılarım eskidi', zona: 'der', peso: 2 },
      ],
    },
  },

  foda: {
    titulo: 'Bir kafe açmak',
    propuesta: {
      raiz: 'Bir kafe açmak',
      ramas: [],
      elementos: [
        { texto: 'Kahveden çok iyi anlıyorum', zona: 'f' },
        { texto: 'Kendi ekmek tarifim var', zona: 'f' },
        { texto: 'Sermaye az', zona: 'd' },
        { texto: 'Hiç kimseyi işe almadım', zona: 'd' },
        { texto: 'Mahallede kafe yok', zona: 'o' },
        { texto: 'İki sokak ötede ofisler var', zona: 'o' },
        { texto: 'Kira sürekli artıyor', zona: 'a' },
        { texto: 'Yakında bir zincir açılıyor', zona: 'a' },
      ],
    },
  },

  eisenhower: {
    titulo: 'Haftam',
    propuesta: {
      raiz: 'Haftam',
      ramas: [],
      elementos: [
        { texto: 'Raporu bugün teslim etmek', zona: 'hacer' },
        { texto: 'Dişçiyi aramak', zona: 'hacer' },
        { texto: 'Sunumu hazırlamak', zona: 'agendar' },
        { texto: 'Spor yapmak', zona: 'agendar' },
        { texto: 'Malzemeyi sipariş etmek', zona: 'delegar' },
        { texto: 'Tedarikçiye cevap vermek', zona: 'delegar' },
        { texto: 'Sürekli telefona bakmak', zona: 'quitar' },
        { texto: 'Gündemsiz toplantı', zona: 'quitar' },
      ],
    },
  },

  decision: {
    titulo: 'Yeni işi kabul etsem mi?',
    propuesta: {
      raiz: 'Yeni işi kabul etsem mi?',
      ramas: [
        n('Kabul ediyorum', n('Daha yüksek maaş'), n('Şehir değiştirmek'), n('Sıfırdan başlamak')),
        n('Kalıyorum', n('Zaten tanıdığım ekip'), n('Maaş tavanı')),
        n('Kalmak için pazarlık ediyorum', n('İyi gidebilir'), n('Tuhaf olabilir')),
      ],
    },
  },

  tier: {
    titulo: 'Kahvaltılarım',
    propuesta: {
      raiz: 'Kahvaltılarım',
      ramas: [],
      elementos: [
        { texto: 'Chilaquiles', zona: 's' },
        { texto: 'Ranchero yumurta', zona: 's' },
        { texto: 'Yoğurtlu meyve', zona: 'a' },
        { texto: 'Molletes', zona: 'a' },
        { texto: 'Kızarmış ekmek', zona: 'b' },
        { texto: 'Kutu mısır gevreği', zona: 'c' },
        { texto: 'Sadece kahve', zona: 'd' },
        { texto: 'Tamales', zona: 'sin' },
      ],
    },
  },

  matriz: {
    titulo: 'Hangi dizüstü bilgisayarı alsam?',
    propuesta: {
      raiz: 'Hangi dizüstü bilgisayarı alsam?',
      ramas: [],
      criterios: [
        { texto: 'Fiyat', peso: 5 },
        { texto: 'Pil ömrü', peso: 4 },
        { texto: 'Ağırlık', peso: 3 },
        { texto: 'Ekran', peso: 2 },
      ],
      opciones: [
        { texto: 'Ucuz olan', puntajes: [5, 3, 3, 2] },
        { texto: 'Hafif olan', puntajes: [3, 4, 5, 3] },
        { texto: 'Güçlü olan', puntajes: [1, 2, 2, 5] },
      ],
    },
  },

  ishikawa: {
    titulo: 'Kek kabarmadı',
    propuesta: {
      raiz: 'Kek kabarmadı',
      ramas: [
        n('Malzemeler', n('Süresi geçmiş kabartma tozu'), n('Soğuk yumurtalar')),
        n('Yöntem', n('Karışımı fazla çırptım'), n('Fırını çok erken açtım')),
        n('Ekipman', n('Fırın kalibre değil'), n('Kalıp çok büyük')),
        n('Ölçüm', n('Terazi yerine bardakla ölçtüm')),
      ],
    },
  },
}

export const EJEMPLOS_ID: Record<TipoMapa, ContenidoEjemplo> = {
  mental: {
    titulo: 'Liburan ke Jepang',
    propuesta: {
      raiz: 'Liburan ke Jepang',
      ramas: [
        n('Rute', n('Tokyo'), n('Kyoto'), n('Osaka')),
        n('Anggaran', n('Tiket pesawat'), n('Hotel'), n('Makan per hari')),
        n('Yang harus dibawa', n('Adaptor'), n('JR Pass'), n('Sepatu yang nyaman')),
        n('Sebelum berangkat', n('Cek paspor'), n('Tukar uang ke yen')),
      ],
    },
  },

  arbol: {
    titulo: 'Sumber energi',
    propuesta: {
      raiz: 'Sumber energi',
      ramas: [
        n('Terbarukan', n('Surya'), n('Angin'), n('Tenaga air')),
        n('Fosil', n('Batu bara'), n('Minyak bumi'), n('Gas alam')),
        n('Nuklir', n('Fisi'), n('Fusi')),
      ],
    },
  },

  etimologia: {
    titulo: 'Ide',
    propuesta: {
      raiz: 'Ide',
      ramas: [
        n('Asal', n('Yun. idéa: “bentuk, wujud”'), n('Dari ideîn: “melihat”'), n('Ke bahasa Indonesia lewat Belanda')),
        n('Arti', n('Gambaran dalam pikiran'), n('Rencana atau niat'), n('Konsep atau pendapat')),
        n('Penggunaan', n('“Punya ide”'), n('“Tidak ada ide”'), n('“Membiasakan diri dengan ide itu”')),
        n('Kata serumpun', n('Ideal'), n('Idealis'), n('Ideologi'), n('Idealisme')),
      ],
    },
  },

  llaves: {
    titulo: 'Bagian-bagian sepeda',
    propuesta: {
      raiz: 'Sepeda',
      ramas: [
        n('Rangka', n('Pipa atas'), n('Garpu'), n('Sadel')),
        n('Transmisi', n('Pedal'), n('Rantai'), n('Gir')),
        n('Roda', n('Pelek'), n('Jari-jari'), n('Ban dalam')),
        n('Rem', n('Tuas rem'), n('Kampas rem')),
      ],
    },
  },

  circulo: {
    titulo: 'Kopi',
    propuesta: {
      raiz: 'Kopi',
      ramas: [
        n('Mengandung kafein'),
        n('Tumbuh di daerah tropis'),
        n('Arabika dan robusta'),
        n('Sangrai terang atau gelap'),
        n('Espresso'),
        n('Dipetik dengan tangan'),
        n('Tanpa kafein'),
        n('Minuman kedua paling banyak diminum di dunia'),
      ],
    },
  },

  flujo: {
    titulo: 'Membuat janji dokter',
    propuesta: {
      raiz: 'Aku butuh periksa',
      formaRaiz: 'inicio',
      ramas: cadena([
        paso('Aku butuh periksa', 'inicio'),
        paso('Buka aplikasi asuransi'),
        paso('Ada slot minggu ini?', 'decision'),
        paso('Pilih hari dan jam'),
        paso('Konfirmasi dan simpan'),
        paso('Masukkan ke kalender', 'fin'),
      ]),
    },
  },

  linea: {
    titulo: 'Sejarah internet',
    propuesta: {
      raiz: 'Sejarah internet',
      ramas: [
        n('1969 · ARPANET lahir', n('Empat universitas')),
        n('1983 · TCP/IP mulai dipakai'),
        n('1991 · Situs web publik pertama', n('Tim Berners-Lee')),
        n('2004 · Media sosial muncul'),
        n('2007 · Ponsel menguasai semuanya'),
      ],
    },
  },

  ciclo: {
    titulo: 'Siklus air',
    propuesta: {
      raiz: 'Siklus air',
      ramas: [
        n('Penguapan', n('Matahari memanaskan laut')),
        n('Kondensasi', n('Awan terbentuk')),
        n('Presipitasi', n('Hujan atau salju turun')),
        n('Aliran permukaan', n('Sungai kembali ke laut')),
      ],
    },
  },

  piramide: {
    titulo: 'Piramida Maslow',
    propuesta: {
      raiz: 'Piramida Maslow',
      ramas: [],
      conjuntos: ['Aktualisasi diri', 'Penghargaan', 'Cinta dan rasa aman', 'Kebutuhan dasar'],
      elementos: [
        { texto: 'Berkarya dan memberi makna', zona: 'p1' },
        { texto: 'Rasa hormat dan pencapaian', zona: 'p2' },
        { texto: 'Persahabatan dan pasangan', zona: 'p3' },
        { texto: 'Rumah dan pekerjaan', zona: 'p3' },
        { texto: 'Makan dan tidur', zona: 'p4' },
        { texto: 'Kesehatan', zona: 'p4' },
      ],
    },
  },

  venn: {
    titulo: 'Anjing dan kucing',
    propuesta: {
      raiz: 'Anjing dan kucing',
      ramas: [],
      conjuntos: ['Anjing', 'Kucing'],
      elementos: [
        { texto: 'Diajak jalan-jalan', zona: 'a' },
        { texto: 'Menuruti perintah', zona: 'a' },
        { texto: 'Membersihkan diri sendiri', zona: 'b' },
        { texto: 'Pakai kotak pasir', zona: 'b' },
        { texto: 'Mamalia', zona: 'ab' },
        { texto: 'Perlu vaksin', zona: 'ab' },
        { texto: 'Hidup di dalam rumah', zona: 'ab' },
      ],
    },
  },

  comparacion: {
    titulo: 'Kopi atau teh',
    propuesta: {
      raiz: 'Kopi atau teh',
      ramas: [],
      conjuntos: ['Kopi', 'Teh'],
      elementos: [
        { texto: 'Kafein lebih banyak', zona: 'izq' },
        { texto: 'Rasa sangrai', zona: 'izq' },
        { texto: 'Sama-sama diminum hangat', zona: 'centro' },
        { texto: 'Kaya antioksidan', zona: 'centro' },
        { texto: 'Lebih lembut', zona: 'der' },
        { texto: 'Variasinya tak terhitung', zona: 'der' },
      ],
    },
  },

  proscontras: {
    titulo: 'Kerja dari rumah',
    propuesta: {
      raiz: 'Kerja dari rumah',
      ramas: [],
      elementos: [
        { texto: 'Hemat waktu perjalanan', zona: 'izq', peso: 5 },
        { texto: 'Jam kerja fleksibel', zona: 'izq', peso: 4 },
        { texto: 'Makan di rumah', zona: 'izq', peso: 2 },
        { texto: 'Kontak dengan tim berkurang', zona: 'der', peso: 4 },
        { texto: 'Susah berhenti kerja', zona: 'der', peso: 3 },
        { texto: 'Tagihan listrik naik', zona: 'der', peso: 1 },
      ],
    },
  },

  fuerzas: {
    titulo: 'Lari pagi',
    propuesta: {
      raiz: 'Lari pagi',
      ramas: [],
      elementos: [
        { texto: 'Ingin tidur lebih nyenyak', zona: 'izq', peso: 4 },
        { texto: 'Ada taman di dekat sini', zona: 'izq', peso: 3 },
        { texto: 'Teman menemani', zona: 'izq', peso: 4 },
        { texto: 'Tidur larut malam', zona: 'der', peso: 5 },
        { texto: 'Dingin saat subuh', zona: 'der', peso: 3 },
        { texto: 'Sepatu lariku sudah rusak', zona: 'der', peso: 2 },
      ],
    },
  },

  foda: {
    titulo: 'Membuka kedai kopi',
    propuesta: {
      raiz: 'Membuka kedai kopi',
      ramas: [],
      elementos: [
        { texto: 'Paham banyak soal kopi', zona: 'f' },
        { texto: 'Punya resep roti sendiri', zona: 'f' },
        { texto: 'Modal sedikit', zona: 'd' },
        { texto: 'Belum pernah mempekerjakan orang', zona: 'd' },
        { texto: 'Belum ada kedai kopi di sekitar sini', zona: 'o' },
        { texto: 'Kantor-kantor dua blok dari sini', zona: 'o' },
        { texto: 'Sewa terus naik', zona: 'a' },
        { texto: 'Ada gerai waralaba buka di dekat sini', zona: 'a' },
      ],
    },
  },

  eisenhower: {
    titulo: 'Mingguku',
    propuesta: {
      raiz: 'Mingguku',
      ramas: [],
      elementos: [
        { texto: 'Serahkan laporan hari ini', zona: 'hacer' },
        { texto: 'Telepon dokter gigi', zona: 'hacer' },
        { texto: 'Siapkan presentasi', zona: 'agendar' },
        { texto: 'Olahraga', zona: 'agendar' },
        { texto: 'Pesan bahan', zona: 'delegar' },
        { texto: 'Balas pemasok', zona: 'delegar' },
        { texto: 'Terus-terusan lihat ponsel', zona: 'quitar' },
        { texto: 'Rapat tanpa agenda', zona: 'quitar' },
      ],
    },
  },

  decision: {
    titulo: 'Terima pekerjaan baru?',
    propuesta: {
      raiz: 'Terima pekerjaan baru?',
      ramas: [
        n('Terima', n('Gaji lebih tinggi'), n('Harus pindah kota'), n('Mulai dari nol')),
        n('Tetap di sini', n('Tim yang sudah dikenal'), n('Batas gaji')),
        n('Negosiasi untuk tetap tinggal', n('Bisa berjalan baik'), n('Bisa jadi canggung')),
      ],
    },
  },

  tier: {
    titulo: 'Sarapanku',
    propuesta: {
      raiz: 'Sarapanku',
      ramas: [],
      elementos: [
        { texto: 'Chilaquiles', zona: 's' },
        { texto: 'Telur rancheros', zona: 's' },
        { texto: 'Buah dengan yoghurt', zona: 'a' },
        { texto: 'Molletes', zona: 'a' },
        { texto: 'Roti panggang', zona: 'b' },
        { texto: 'Sereal kotak', zona: 'c' },
        { texto: 'Kopi saja', zona: 'd' },
        { texto: 'Tamales', zona: 'sin' },
      ],
    },
  },

  matriz: {
    titulo: 'Laptop mana yang harus dibeli?',
    propuesta: {
      raiz: 'Laptop mana yang harus dibeli?',
      ramas: [],
      criterios: [
        { texto: 'Harga', peso: 5 },
        { texto: 'Baterai', peso: 4 },
        { texto: 'Berat', peso: 3 },
        { texto: 'Layar', peso: 2 },
      ],
      opciones: [
        { texto: 'Yang murah', puntajes: [5, 3, 3, 2] },
        { texto: 'Yang ringan', puntajes: [3, 4, 5, 3] },
        { texto: 'Yang bertenaga', puntajes: [1, 2, 2, 5] },
      ],
    },
  },

  ishikawa: {
    titulo: 'Kuenya tidak mengembang',
    propuesta: {
      raiz: 'Kuenya tidak mengembang',
      ramas: [
        n('Bahan', n('Baking powder kedaluwarsa'), n('Telur masih dingin')),
        n('Metode', n('Adonan terlalu banyak diaduk'), n('Oven dibuka terlalu cepat')),
        n('Peralatan', n('Oven tidak terkalibrasi'), n('Loyang terlalu besar')),
        n('Pengukuran', n('Diukur pakai cangkir, bukan timbangan')),
      ],
    },
  },
}

export const EJEMPLOS_PL: Record<TipoMapa, ContenidoEjemplo> = {
  mental: {
    titulo: 'Podróż do Japonii',
    propuesta: {
      raiz: 'Podróż do Japonii',
      ramas: [
        n('Trasa', n('Tokio'), n('Kioto'), n('Osaka')),
        n('Budżet', n('Loty'), n('Hotel'), n('Jedzenie na dzień')),
        n('Co zabrać', n('Przejściówka'), n('JR Pass'), n('Wygodne buty')),
        n('Przed wyjazdem', n('Sprawdzić paszport'), n('Wymienić jeny')),
      ],
    },
  },

  arbol: {
    titulo: 'Źródła energii',
    propuesta: {
      raiz: 'Źródła energii',
      ramas: [
        n('Odnawialne', n('Słoneczna'), n('Wiatrowa'), n('Wodna')),
        n('Kopalne', n('Węgiel'), n('Ropa naftowa'), n('Gaz ziemny')),
        n('Jądrowa', n('Rozszczepienie'), n('Synteza')),
      ],
    },
  },

  etimologia: {
    titulo: 'Pomysł',
    propuesta: {
      raiz: 'Pomysł',
      ramas: [
        n(
          'Pochodzenie',
          n('Rdzeń „myśl”'),
          n('Czasownik „pomyśleć”: ‘wpaść na coś’'),
          n('Rodzime słowo, bez łacińskich korzeni'),
        ),
        n('Znaczenia', n('Obraz w głowie'), n('Plan albo zamiar'), n('Koncepcja albo opinia')),
        n('Użycie', n('„Mieć pomysł”'), n('„Nie mam pomysłu”'), n('„Oswoić się z pomysłem”')),
        n('Rodzina słów', n('Pomysłowy'), n('Wymyślić'), n('Myśl'), n('Zamysł')),
      ],
    },
  },

  llaves: {
    titulo: 'Części roweru',
    propuesta: {
      raiz: 'Rower',
      ramas: [
        n('Rama', n('Górna rura'), n('Widelec'), n('Siodełko')),
        n('Napęd', n('Pedały'), n('Łańcuch'), n('Kasetka')),
        n('Koła', n('Obręcz'), n('Szprychy'), n('Dętka')),
        n('Hamulce', n('Manetki'), n('Klocki')),
      ],
    },
  },

  circulo: {
    titulo: 'Kawa',
    propuesta: {
      raiz: 'Kawa',
      ramas: [
        n('Zawiera kofeinę'),
        n('Rośnie w tropikach'),
        n('Arabica i robusta'),
        n('Jasne albo ciemne palenie'),
        n('Espresso'),
        n('Zbierana ręcznie'),
        n('Bezkofeinowa'),
        n('Drugi najpopularniejszy napój na świecie'),
      ],
    },
  },

  flujo: {
    titulo: 'Umówić wizytę u lekarza',
    propuesta: {
      raiz: 'Potrzebuję wizyty',
      formaRaiz: 'inicio',
      ramas: cadena([
        paso('Potrzebuję wizyty', 'inicio'),
        paso('Otworzyć aplikację ubezpieczyciela'),
        paso('Jest termin w tym tygodniu?', 'decision'),
        paso('Wybrać dzień i godzinę'),
        paso('Potwierdzić i zapisać'),
        paso('Dodać do kalendarza', 'fin'),
      ]),
    },
  },

  linea: {
    titulo: 'Historia internetu',
    propuesta: {
      raiz: 'Historia internetu',
      ramas: [
        n('1969 · Powstaje ARPANET', n('Cztery uniwersytety')),
        n('1983 · Przyjęto protokół TCP/IP'),
        n('1991 · Pierwsza publiczna strona internetowa', n('Tim Berners-Lee')),
        n('2004 · Pojawiają się sieci społecznościowe'),
        n('2007 · Telefon komórkowy przejmuje wszystko'),
      ],
    },
  },

  ciclo: {
    titulo: 'Obieg wody',
    propuesta: {
      raiz: 'Obieg wody',
      ramas: [
        n('Parowanie', n('Słońce ogrzewa morze')),
        n('Kondensacja', n('Tworzą się chmury')),
        n('Opady', n('Pada deszcz albo śnieg')),
        n('Spływ', n('Rzeki wracają do morza')),
      ],
    },
  },

  piramide: {
    titulo: 'Piramida Maslowa',
    propuesta: {
      raiz: 'Piramida Maslowa',
      ramas: [],
      conjuntos: ['Samorealizacja', 'Uznanie', 'Miłość i bezpieczeństwo', 'Potrzeby podstawowe'],
      elementos: [
        { texto: 'Tworzyć i nadawać sens', zona: 'p1' },
        { texto: 'Szacunek i osiągnięcia', zona: 'p2' },
        { texto: 'Przyjaźń i związek', zona: 'p3' },
        { texto: 'Dom i praca', zona: 'p3' },
        { texto: 'Jedzenie i sen', zona: 'p4' },
        { texto: 'Zdrowie', zona: 'p4' },
      ],
    },
  },

  venn: {
    titulo: 'Psy i koty',
    propuesta: {
      raiz: 'Psy i koty',
      ramas: [],
      conjuntos: ['Psy', 'Koty'],
      elementos: [
        { texto: 'Chodzą na spacery', zona: 'a' },
        { texto: 'Słuchają komend', zona: 'a' },
        { texto: 'Same się czyszczą', zona: 'b' },
        { texto: 'Korzystają z kuwety', zona: 'b' },
        { texto: 'Ssaki', zona: 'ab' },
        { texto: 'Potrzebują szczepień', zona: 'ab' },
        { texto: 'Mieszkają w domu', zona: 'ab' },
      ],
    },
  },

  comparacion: {
    titulo: 'Kawa czy herbata',
    propuesta: {
      raiz: 'Kawa czy herbata',
      ramas: [],
      conjuntos: ['Kawa', 'Herbata'],
      elementos: [
        { texto: 'Więcej kofeiny', zona: 'izq' },
        { texto: 'Palony smak', zona: 'izq' },
        { texto: 'Obie pije się na ciepło', zona: 'centro' },
        { texto: 'Pełne antyoksydantów', zona: 'centro' },
        { texto: 'Łagodniejsza', zona: 'der' },
        { texto: 'Niezliczone odmiany', zona: 'der' },
      ],
    },
  },

  proscontras: {
    titulo: 'Praca z domu',
    propuesta: {
      raiz: 'Praca z domu',
      ramas: [],
      elementos: [
        { texto: 'Oszczędzam czas na dojazd', zona: 'izq', peso: 5 },
        { texto: 'Elastyczne godziny', zona: 'izq', peso: 4 },
        { texto: 'Jem w domu', zona: 'izq', peso: 2 },
        { texto: 'Mniej kontaktu z zespołem', zona: 'der', peso: 4 },
        { texto: 'Trudno się odciąć', zona: 'der', peso: 3 },
        { texto: 'Wyższy rachunek za prąd', zona: 'der', peso: 1 },
      ],
    },
  },

  fuerzas: {
    titulo: 'Poranne bieganie',
    propuesta: {
      raiz: 'Poranne bieganie',
      ramas: [],
      elementos: [
        { texto: 'Chcę lepiej spać', zona: 'izq', peso: 4 },
        { texto: 'Mam park w pobliżu', zona: 'izq', peso: 3 },
        { texto: 'Koleżanka mi towarzyszy', zona: 'izq', peso: 4 },
        { texto: 'Kładę się spać późno', zona: 'der', peso: 5 },
        { texto: 'O świcie jest zimno', zona: 'der', peso: 3 },
        { texto: 'Moje buty do biegania są zniszczone', zona: 'der', peso: 2 },
      ],
    },
  },

  foda: {
    titulo: 'Otworzyć kawiarnię',
    propuesta: {
      raiz: 'Otworzyć kawiarnię',
      ramas: [],
      elementos: [
        { texto: 'Znam się na kawie', zona: 'f' },
        { texto: 'Własny przepis na chleb', zona: 'f' },
        { texto: 'Mało kapitału', zona: 'd' },
        { texto: 'Brak doświadczenia w zatrudnianiu', zona: 'd' },
        { texto: 'Dzielnica bez kawiarni', zona: 'o' },
        { texto: 'Biura dwie przecznice dalej', zona: 'o' },
        { texto: 'Czynsz wciąż rośnie', zona: 'a' },
        { texto: 'Blisko otwiera się sieciówka', zona: 'a' },
      ],
    },
  },

  eisenhower: {
    titulo: 'Mój tydzień',
    propuesta: {
      raiz: 'Mój tydzień',
      ramas: [],
      elementos: [
        { texto: 'Oddać raport dzisiaj', zona: 'hacer' },
        { texto: 'Zadzwonić do dentysty', zona: 'hacer' },
        { texto: 'Przygotować prezentację', zona: 'agendar' },
        { texto: 'Poćwiczyć', zona: 'agendar' },
        { texto: 'Zamówić materiały', zona: 'delegar' },
        { texto: 'Odpowiedzieć dostawcy', zona: 'delegar' },
        { texto: 'Ciągle patrzeć w telefon', zona: 'quitar' },
        { texto: 'Spotkanie bez agendy', zona: 'quitar' },
      ],
    },
  },

  decision: {
    titulo: 'Przyjąć nową pracę?',
    propuesta: {
      raiz: 'Przyjąć nową pracę?',
      ramas: [
        n('Przyjmuję', n('Wyższa pensja'), n('Przeprowadzka do innego miasta'), n('Zaczynanie od zera')),
        n('Zostaję', n('Zespół, który już znam'), n('Pułap pensji')),
        n('Negocjuję, żeby zostać', n('Może się udać'), n('Może być niezręcznie')),
      ],
    },
  },

  tier: {
    titulo: 'Moje śniadania',
    propuesta: {
      raiz: 'Moje śniadania',
      ramas: [],
      elementos: [
        { texto: 'Chilaquiles', zona: 's' },
        { texto: 'Jajka rancheros', zona: 's' },
        { texto: 'Owoce z jogurtem', zona: 'a' },
        { texto: 'Molletes', zona: 'a' },
        { texto: 'Tosty', zona: 'b' },
        { texto: 'Płatki z pudełka', zona: 'c' },
        { texto: 'Tylko kawa', zona: 'd' },
        { texto: 'Tamales', zona: 'sin' },
      ],
    },
  },

  matriz: {
    titulo: 'Który laptop kupić?',
    propuesta: {
      raiz: 'Który laptop kupić?',
      ramas: [],
      criterios: [
        { texto: 'Cena', peso: 5 },
        { texto: 'Bateria', peso: 4 },
        { texto: 'Waga', peso: 3 },
        { texto: 'Ekran', peso: 2 },
      ],
      opciones: [
        { texto: 'Tani', puntajes: [5, 3, 3, 2] },
        { texto: 'Lekki', puntajes: [3, 4, 5, 3] },
        { texto: 'Mocny', puntajes: [1, 2, 2, 5] },
      ],
    },
  },

  ishikawa: {
    titulo: 'Ciasto nie wyrosło',
    propuesta: {
      raiz: 'Ciasto nie wyrosło',
      ramas: [
        n('Składniki', n('Przeterminowany proszek do pieczenia'), n('Zimne jajka')),
        n('Metoda', n('Zbyt długo ubijane ciasto'), n('Za wcześnie otwarty piekarnik')),
        n('Sprzęt', n('Rozkalibrowany piekarnik'), n('Zbyt duża forma')),
        n('Pomiar', n('Odmierzono szklanką, a nie na wadze')),
      ],
    },
  },
}

export const EJEMPLOS_AR: Record<TipoMapa, ContenidoEjemplo> = {
  mental: {
    titulo: 'رحلة إلى اليابان',
    propuesta: {
      raiz: 'رحلة إلى اليابان',
      ramas: [
        n('المسار', n('طوكيو'), n('كيوتو'), n('أوساكا')),
        n('الميزانية', n('تذاكر الطيران'), n('الفندق'), n('الطعام يوميًا')),
        n('ماذا آخذ', n('محول كهربائي'), n('JR Pass'), n('أحذية مريحة')),
        n('قبل السفر', n('التحقق من جواز السفر'), n('استبدال العملة إلى ين')),
      ],
    },
  },

  arbol: {
    titulo: 'مصادر الطاقة',
    propuesta: {
      raiz: 'مصادر الطاقة',
      ramas: [
        n('متجددة', n('شمسية'), n('رياحية'), n('مائية')),
        n('أحفورية', n('فحم'), n('نفط'), n('غاز طبيعي')),
        n('نووية', n('انشطار'), n('اندماج')),
      ],
    },
  },

  etimologia: {
    titulo: 'فكرة',
    propuesta: {
      raiz: 'فكرة',
      ramas: [
        n('الأصل', n('من الجذر ف-ك-ر: «التفكير»'), n('الفعل «فكّر»: «أعمل عقله»'), n('كلمة عربية أصيلة')),
        n('المعاني', n('صورة ذهنية'), n('خطة أو نية'), n('مفهوم أو رأي')),
        n('الاستخدام', n('«عندي فكرة»'), n('«ما عندي فكرة»'), n('«التآلف مع الفكرة»')),
        n('عائلة الكلمة', n('مفكر'), n('تفكير'), n('فكري'), n('أفكار')),
      ],
    },
  },

  llaves: {
    titulo: 'أجزاء الدراجة',
    propuesta: {
      raiz: 'دراجة',
      ramas: [
        n('الهيكل', n('الأنبوب العلوي'), n('الشوكة'), n('المقعد')),
        n('نظام النقل', n('الدواسات'), n('السلسلة'), n('التروس')),
        n('العجلات', n('الجنط'), n('الأسلاك'), n('الأنبوب الداخلي')),
        n('الفرامل', n('مقابض الفرامل'), n('وسادات الفرامل')),
      ],
    },
  },

  circulo: {
    titulo: 'القهوة',
    propuesta: {
      raiz: 'القهوة',
      ramas: [
        n('تحتوي على الكافيين'),
        n('تنمو في المناطق الاستوائية'),
        n('أرابيكا وروبوستا'),
        n('تحميص فاتح أو داكن'),
        n('إسبريسو'),
        n('تُقطف يدويًا'),
        n('خالية من الكافيين'),
        n('ثاني أكثر مشروب يُشرب في العالم'),
      ],
    },
  },

  flujo: {
    titulo: 'حجز موعد طبي',
    propuesta: {
      raiz: 'أحتاج إلى موعد',
      formaRaiz: 'inicio',
      ramas: cadena([
        paso('أحتاج إلى موعد', 'inicio'),
        paso('فتح تطبيق التأمين'),
        paso('هل يوجد موعد هذا الأسبوع؟', 'decision'),
        paso('اختيار اليوم والوقت'),
        paso('التأكيد والحفظ'),
        paso('إضافته إلى التقويم', 'fin'),
      ]),
    },
  },

  linea: {
    titulo: 'تاريخ الإنترنت',
    propuesta: {
      raiz: 'تاريخ الإنترنت',
      ramas: [
        n('1969 · وُلدت شبكة ARPANET', n('أربع جامعات')),
        n('1983 · اعتماد بروتوكول TCP/IP'),
        n('1991 · أول موقع عام', n('تيم بيرنرز-لي')),
        n('2004 · ظهور الشبكات الاجتماعية'),
        n('2007 · الهاتف المحمول يسيطر على كل شيء'),
      ],
    },
  },

  ciclo: {
    titulo: 'دورة الماء',
    propuesta: {
      raiz: 'دورة الماء',
      ramas: [
        n('التبخر', n('الشمس تُسخّن البحر')),
        n('التكاثف', n('تتشكل الغيوم')),
        n('الهطول', n('تمطر أو تثلج')),
        n('الجريان', n('الأنهار تعود إلى البحر')),
      ],
    },
  },

  piramide: {
    titulo: 'هرم ماسلو',
    propuesta: {
      raiz: 'هرم ماسلو',
      ramas: [],
      conjuntos: ['تحقيق الذات', 'التقدير', 'الحب والأمان', 'الاحتياجات الأساسية'],
      elementos: [
        { texto: 'الإبداع وإعطاء المعنى', zona: 'p1' },
        { texto: 'الاحترام والإنجازات', zona: 'p2' },
        { texto: 'الصداقة والشريك', zona: 'p3' },
        { texto: 'المنزل والعمل', zona: 'p3' },
        { texto: 'الأكل والنوم', zona: 'p4' },
        { texto: 'الصحة', zona: 'p4' },
      ],
    },
  },

  venn: {
    titulo: 'الكلاب والقطط',
    propuesta: {
      raiz: 'الكلاب والقطط',
      ramas: [],
      conjuntos: ['الكلاب', 'القطط'],
      elementos: [
        { texto: 'تخرج للتنزه', zona: 'a' },
        { texto: 'تطيع الأوامر', zona: 'a' },
        { texto: 'تنظف نفسها بنفسها', zona: 'b' },
        { texto: 'تستخدم صندوق الرمل', zona: 'b' },
        { texto: 'ثدييات', zona: 'ab' },
        { texto: 'تحتاج إلى لقاحات', zona: 'ab' },
        { texto: 'تعيش داخل المنزل', zona: 'ab' },
      ],
    },
  },

  comparacion: {
    titulo: 'قهوة أم شاي',
    propuesta: {
      raiz: 'قهوة أم شاي',
      ramas: [],
      conjuntos: ['القهوة', 'الشاي'],
      elementos: [
        { texto: 'كافيين أكثر', zona: 'izq' },
        { texto: 'نكهة محمصة', zona: 'izq' },
        { texto: 'يُشربان ساخنَين', zona: 'centro' },
        { texto: 'غنيان بمضادات الأكسدة', zona: 'centro' },
        { texto: 'أكثر لطفًا', zona: 'der' },
        { texto: 'أصناف لا تُحصى', zona: 'der' },
      ],
    },
  },

  proscontras: {
    titulo: 'العمل من المنزل',
    propuesta: {
      raiz: 'العمل من المنزل',
      ramas: [],
      elementos: [
        { texto: 'توفير وقت التنقل', zona: 'izq', peso: 5 },
        { texto: 'ساعات عمل مرنة', zona: 'izq', peso: 4 },
        { texto: 'الأكل في المنزل', zona: 'izq', peso: 2 },
        { texto: 'تواصل أقل مع الفريق', zona: 'der', peso: 4 },
        { texto: 'صعوبة فصل العمل عن الحياة', zona: 'der', peso: 3 },
        { texto: 'ارتفاع فاتورة الكهرباء', zona: 'der', peso: 1 },
      ],
    },
  },

  fuerzas: {
    titulo: 'الجري في الصباح',
    propuesta: {
      raiz: 'الجري في الصباح',
      ramas: [],
      elementos: [
        { texto: 'أريد نومًا أفضل', zona: 'izq', peso: 4 },
        { texto: 'يوجد حديقة قريبة', zona: 'izq', peso: 3 },
        { texto: 'صديقة ترافقني', zona: 'izq', peso: 4 },
        { texto: 'أنام متأخرًا', zona: 'der', peso: 5 },
        { texto: 'الجو بارد عند الفجر', zona: 'der', peso: 3 },
        { texto: 'حذائي الرياضي أصبح باليًا', zona: 'der', peso: 2 },
      ],
    },
  },

  foda: {
    titulo: 'فتح مقهى',
    propuesta: {
      raiz: 'فتح مقهى',
      ramas: [],
      elementos: [
        { texto: 'أعرف الكثير عن القهوة', zona: 'f' },
        { texto: 'وصفة خبز خاصة', zona: 'f' },
        { texto: 'رأس مال قليل', zona: 'd' },
        { texto: 'لم أوظّف أحدًا من قبل', zona: 'd' },
        { texto: 'لا يوجد مقهى في الحي', zona: 'o' },
        { texto: 'مكاتب على بعد شارعين', zona: 'o' },
        { texto: 'الإيجار في ارتفاع مستمر', zona: 'a' },
        { texto: 'سلسلة مقاهٍ ستفتح قريبًا', zona: 'a' },
      ],
    },
  },

  eisenhower: {
    titulo: 'أسبوعي',
    propuesta: {
      raiz: 'أسبوعي',
      ramas: [],
      elementos: [
        { texto: 'تسليم التقرير اليوم', zona: 'hacer' },
        { texto: 'الاتصال بطبيب الأسنان', zona: 'hacer' },
        { texto: 'تحضير العرض التقديمي', zona: 'agendar' },
        { texto: 'ممارسة الرياضة', zona: 'agendar' },
        { texto: 'طلب المواد', zona: 'delegar' },
        { texto: 'الرد على المورّد', zona: 'delegar' },
        { texto: 'النظر إلى الهاتف باستمرار', zona: 'quitar' },
        { texto: 'اجتماع بلا جدول أعمال', zona: 'quitar' },
      ],
    },
  },

  decision: {
    titulo: 'هل أقبل الوظيفة الجديدة؟',
    propuesta: {
      raiz: 'هل أقبل الوظيفة الجديدة؟',
      ramas: [
        n('أقبل', n('راتب أعلى'), n('الانتقال إلى مدينة أخرى'), n('البدء من الصفر')),
        n('أبقى', n('فريق أعرفه بالفعل'), n('سقف للراتب')),
        n('أتفاوض للبقاء', n('قد يسير الأمر جيدًا'), n('قد يصبح محرجًا')),
      ],
    },
  },

  tier: {
    titulo: 'فطوري',
    propuesta: {
      raiz: 'فطوري',
      ramas: [],
      elementos: [
        { texto: 'تشيلاكيليس', zona: 's' },
        { texto: 'بيض رانتشيروس', zona: 's' },
        { texto: 'فواكه مع زبادي', zona: 'a' },
        { texto: 'موليتيس', zona: 'a' },
        { texto: 'خبز محمص', zona: 'b' },
        { texto: 'حبوب من علبة', zona: 'c' },
        { texto: 'قهوة فقط', zona: 'd' },
        { texto: 'تامالِس', zona: 'sin' },
      ],
    },
  },

  matriz: {
    titulo: 'أي لابتوب أشتري؟',
    propuesta: {
      raiz: 'أي لابتوب أشتري؟',
      ramas: [],
      criterios: [
        { texto: 'السعر', peso: 5 },
        { texto: 'البطارية', peso: 4 },
        { texto: 'الوزن', peso: 3 },
        { texto: 'الشاشة', peso: 2 },
      ],
      opciones: [
        { texto: 'الرخيص', puntajes: [5, 3, 3, 2] },
        { texto: 'الخفيف', puntajes: [3, 4, 5, 3] },
        { texto: 'القوي', puntajes: [1, 2, 2, 5] },
      ],
    },
  },

  ishikawa: {
    titulo: 'الكعكة لم تنتفخ',
    propuesta: {
      raiz: 'الكعكة لم تنتفخ',
      ramas: [
        n('المكونات', n('باكينج باودر منتهي الصلاحية'), n('بيض بارد')),
        n('الطريقة', n('خفقت الخليط أكثر من اللازم'), n('فتحت الفرن مبكرًا جدًا')),
        n('المعدات', n('الفرن غير معاير'), n('القالب كبير جدًا')),
        n('القياس', n('قِستُ بالكوب لا بالميزان')),
      ],
    },
  },
}

export const EJEMPLOS_NL: Record<TipoMapa, ContenidoEjemplo> = {
  mental: {
    titulo: 'Reis naar Japan',
    propuesta: {
      raiz: 'Reis naar Japan',
      ramas: [
        n('Route', n('Tokio'), n('Kyoto'), n('Osaka')),
        n('Budget', n('Vluchten'), n('Hotel'), n('Eten per dag')),
        n('Wat mee te nemen', n('Adapter'), n('JR Pass'), n('Comfortabele schoenen')),
        n('Voor vertrek', n('Paspoort controleren'), n('Yen wisselen')),
      ],
    },
  },

  arbol: {
    titulo: 'Energiebronnen',
    propuesta: {
      raiz: 'Energiebronnen',
      ramas: [
        n('Hernieuwbaar', n('Zonne-energie'), n('Windenergie'), n('Waterkracht')),
        n('Fossiel', n('Steenkool'), n('Aardolie'), n('Aardgas')),
        n('Kernenergie', n('Kernsplijting'), n('Kernfusie')),
      ],
    },
  },

  etimologia: {
    titulo: 'Idee',
    propuesta: {
      raiz: 'Idee',
      ramas: [
        n('Oorsprong', n('Gr. idéa: ‘vorm, gedaante’'), n('Van ideîn: ‘zien’'), n('Via het Frans in het Nederlands')),
        n('Betekenissen', n('Voorstelling in het hoofd'), n('Plan of bedoeling'), n('Concept of mening')),
        n('Gebruik', n('‘Een idee hebben’'), n('‘Geen idee’'), n('‘Aan het idee wennen’')),
        n('Woordfamilie', n('Ideaal'), n('Idealisme'), n('Idealiseren'), n('Ideologie')),
      ],
    },
  },

  llaves: {
    titulo: 'Onderdelen van een fiets',
    propuesta: {
      raiz: 'Fiets',
      ramas: [
        n('Frame', n('Bovenbuis'), n('Vork'), n('Zadel')),
        n('Aandrijving', n('Pedalen'), n('Ketting'), n('Tandwielen')),
        n('Wielen', n('Velg'), n('Spaken'), n('Binnenband')),
        n('Remmen', n('Remhendels'), n('Remblokjes')),
      ],
    },
  },

  circulo: {
    titulo: 'Koffie',
    propuesta: {
      raiz: 'Koffie',
      ramas: [
        n('Bevat cafeïne'),
        n('Groeit in de tropen'),
        n('Arabica en robusta'),
        n('Lichte of donkere branding'),
        n('Espresso'),
        n('Met de hand geplukt'),
        n('Cafeïnevrij'),
        n('Op één na meest gedronken drank ter wereld'),
      ],
    },
  },

  flujo: {
    titulo: 'Een doktersafspraak maken',
    propuesta: {
      raiz: 'Ik heb een afspraak nodig',
      formaRaiz: 'inicio',
      ramas: cadena([
        paso('Ik heb een afspraak nodig', 'inicio'),
        paso('De app van de verzekeraar openen'),
        paso('Is er deze week plek?', 'decision'),
        paso('Dag en tijd kiezen'),
        paso('Bevestigen en opslaan'),
        paso('Toevoegen aan de agenda', 'fin'),
      ]),
    },
  },

  linea: {
    titulo: 'Geschiedenis van het internet',
    propuesta: {
      raiz: 'Geschiedenis van het internet',
      ramas: [
        n('1969 · ARPANET ontstaat', n('Vier universiteiten')),
        n('1983 · TCP/IP wordt ingevoerd'),
        n('1991 · Eerste publieke website', n('Tim Berners-Lee')),
        n('2004 · Sociale netwerken komen op'),
        n('2007 · De mobiele telefoon neemt alles over'),
      ],
    },
  },

  ciclo: {
    titulo: 'De waterkringloop',
    propuesta: {
      raiz: 'De waterkringloop',
      ramas: [
        n('Verdamping', n('De zon verwarmt de zee')),
        n('Condensatie', n('Wolken vormen zich')),
        n('Neerslag', n('Het regent of sneeuwt')),
        n('Afvoer', n('Rivieren stromen terug naar zee')),
      ],
    },
  },

  piramide: {
    titulo: 'Piramide van Maslow',
    propuesta: {
      raiz: 'Piramide van Maslow',
      ramas: [],
      conjuntos: ['Zelfontplooiing', 'Waardering', 'Liefde en veiligheid', 'Basisbehoeften'],
      elementos: [
        { texto: 'Creëren en betekenis geven', zona: 'p1' },
        { texto: 'Respect en prestaties', zona: 'p2' },
        { texto: 'Vriendschap en partner', zona: 'p3' },
        { texto: 'Huis en werk', zona: 'p3' },
        { texto: 'Eten en slapen', zona: 'p4' },
        { texto: 'Gezondheid', zona: 'p4' },
      ],
    },
  },

  venn: {
    titulo: 'Honden en katten',
    propuesta: {
      raiz: 'Honden en katten',
      ramas: [],
      conjuntos: ['Honden', 'Katten'],
      elementos: [
        { texto: 'Gaan wandelen', zona: 'a' },
        { texto: 'Gehoorzamen aan commando’s', zona: 'a' },
        { texto: 'Wassen zichzelf', zona: 'b' },
        { texto: 'Gebruiken een kattenbak', zona: 'b' },
        { texto: 'Zoogdieren', zona: 'ab' },
        { texto: 'Hebben vaccinaties nodig', zona: 'ab' },
        { texto: 'Wonen binnenshuis', zona: 'ab' },
      ],
    },
  },

  comparacion: {
    titulo: 'Koffie of thee',
    propuesta: {
      raiz: 'Koffie of thee',
      ramas: [],
      conjuntos: ['Koffie', 'Thee'],
      elementos: [
        { texto: 'Meer cafeïne', zona: 'izq' },
        { texto: 'Geroosterde smaak', zona: 'izq' },
        { texto: 'Worden allebei warm gedronken', zona: 'centro' },
        { texto: 'Vol antioxidanten', zona: 'centro' },
        { texto: 'Milder', zona: 'der' },
        { texto: 'Ontelbare variëteiten', zona: 'der' },
      ],
    },
  },

  proscontras: {
    titulo: 'Thuiswerken',
    propuesta: {
      raiz: 'Thuiswerken',
      ramas: [],
      elementos: [
        { texto: 'Geen woon-werkverkeer', zona: 'izq', peso: 5 },
        { texto: 'Flexibele uren', zona: 'izq', peso: 4 },
        { texto: 'Eet thuis', zona: 'izq', peso: 2 },
        { texto: 'Minder contact met het team', zona: 'der', peso: 4 },
        { texto: 'Moeilijk om los te koppelen', zona: 'der', peso: 3 },
        { texto: 'Hogere energierekening', zona: 'der', peso: 1 },
      ],
    },
  },

  fuerzas: {
    titulo: '’s Ochtends gaan hardlopen',
    propuesta: {
      raiz: '’s Ochtends gaan hardlopen',
      ramas: [],
      elementos: [
        { texto: 'Wil beter slapen', zona: 'izq', peso: 4 },
        { texto: 'Heb een park in de buurt', zona: 'izq', peso: 3 },
        { texto: 'Een vriendin doet mee', zona: 'izq', peso: 4 },
        { texto: 'Ga laat naar bed', zona: 'der', peso: 5 },
        { texto: 'Het is koud bij zonsopgang', zona: 'der', peso: 3 },
        { texto: 'Mijn hardloopschoenen zijn op', zona: 'der', peso: 2 },
      ],
    },
  },

  foda: {
    titulo: 'Een koffiezaak openen',
    propuesta: {
      raiz: 'Een koffiezaak openen',
      ramas: [],
      elementos: [
        { texto: 'Weet veel van koffie', zona: 'f' },
        { texto: 'Eigen broodrecept', zona: 'f' },
        { texto: 'Weinig kapitaal', zona: 'd' },
        { texto: 'Nog nooit iemand aangenomen', zona: 'd' },
        { texto: 'Geen koffiezaak in de buurt', zona: 'o' },
        { texto: 'Kantoren twee straten verderop', zona: 'o' },
        { texto: 'De huur blijft stijgen', zona: 'a' },
        { texto: 'Er opent een keten vlakbij', zona: 'a' },
      ],
    },
  },

  eisenhower: {
    titulo: 'Mijn week',
    propuesta: {
      raiz: 'Mijn week',
      ramas: [],
      elementos: [
        { texto: 'Rapport vandaag inleveren', zona: 'hacer' },
        { texto: 'De tandarts bellen', zona: 'hacer' },
        { texto: 'Presentatie voorbereiden', zona: 'agendar' },
        { texto: 'Sporten', zona: 'agendar' },
        { texto: 'Materiaal bestellen', zona: 'delegar' },
        { texto: 'Leverancier antwoorden', zona: 'delegar' },
        { texto: 'Steeds op de telefoon kijken', zona: 'quitar' },
        { texto: 'Vergadering zonder agenda', zona: 'quitar' },
      ],
    },
  },

  decision: {
    titulo: 'Neem ik de nieuwe baan aan?',
    propuesta: {
      raiz: 'Neem ik de nieuwe baan aan?',
      ramas: [
        n('Aannemen', n('Hoger salaris'), n('Verhuizen naar een andere stad'), n('Opnieuw beginnen')),
        n('Blijven', n('Team dat ik al ken'), n('Salarisplafond')),
        n('Onderhandelen om te blijven', n('Kan goed uitpakken'), n('Kan ongemakkelijk worden')),
      ],
    },
  },

  tier: {
    titulo: 'Mijn ontbijtjes',
    propuesta: {
      raiz: 'Mijn ontbijtjes',
      ramas: [],
      elementos: [
        { texto: 'Chilaquiles', zona: 's' },
        { texto: 'Rancheros-eieren', zona: 's' },
        { texto: 'Fruit met yoghurt', zona: 'a' },
        { texto: 'Molletes', zona: 'a' },
        { texto: 'Toast', zona: 'b' },
        { texto: 'Cornflakes uit een pak', zona: 'c' },
        { texto: 'Alleen koffie', zona: 'd' },
        { texto: 'Tamales', zona: 'sin' },
      ],
    },
  },

  matriz: {
    titulo: 'Welke laptop koop ik?',
    propuesta: {
      raiz: 'Welke laptop koop ik?',
      ramas: [],
      criterios: [
        { texto: 'Prijs', peso: 5 },
        { texto: 'Batterij', peso: 4 },
        { texto: 'Gewicht', peso: 3 },
        { texto: 'Scherm', peso: 2 },
      ],
      opciones: [
        { texto: 'De goedkope', puntajes: [5, 3, 3, 2] },
        { texto: 'De lichte', puntajes: [3, 4, 5, 3] },
        { texto: 'De krachtige', puntajes: [1, 2, 2, 5] },
      ],
    },
  },

  ishikawa: {
    titulo: 'De taart is niet gerezen',
    propuesta: {
      raiz: 'De taart is niet gerezen',
      ramas: [
        n('Ingrediënten', n('Verlopen bakpoeder'), n('Koude eieren')),
        n('Methode', n('Beslag te lang geklopt'), n('Oven te vroeg geopend')),
        n('Apparatuur', n('Oven verkeerd gekalibreerd'), n('Bakvorm te groot')),
        n('Meting', n('Gemeten met een kopje, niet met een weegschaal')),
      ],
    },
  },
}

/**
 * El contenido traducido, por idioma. Un idioma que falte aquí se queda con el
 * español, que es el catálogo base (`EJEMPLOS`).
 */
const TRADUCIDOS: Partial<Record<Idioma, Record<TipoMapa, ContenidoEjemplo>>> = {
  en: EJEMPLOS_EN,
  pt: EJEMPLOS_PT,
  fr: EJEMPLOS_FR,
  de: EJEMPLOS_DE,
  it: EJEMPLOS_IT,
  ja: EJEMPLOS_JA,
  zh: EJEMPLOS_ZH,
  ko: EJEMPLOS_KO,
  ru: EJEMPLOS_RU,
  hi: EJEMPLOS_HI,
  tr: EJEMPLOS_TR,
  id: EJEMPLOS_ID,
  pl: EJEMPLOS_PL,
  ar: EJEMPLOS_AR,
  nl: EJEMPLOS_NL,
}

/** El ejemplo en el idioma activo; la guía siempre lleva su respaldo español. */
export function ejemploDe(tipo: TipoMapa): EjemploMapa {
  const es = EJEMPLOS[tipo]
  const traducido = TRADUCIDOS[idiomaActual()]?.[tipo]
  return traducido ? { ...traducido, guiaEs: es.guiaEs } : es
}

export const EJEMPLOS: Record<TipoMapa, EjemploMapa> = {
  mental: {
    titulo: 'Viaje a Japón',
    guiaEs:
      'El mapa mental abre un tema en todas direcciones: la idea al centro, las ramas grandes alrededor y sus detalles colgando de ellas. Es para vaciar la cabeza sin decidir todavía un orden.',
    propuesta: {
      raiz: 'Viaje a Japón',
      ramas: [
        n('Ruta', n('Tokio'), n('Kioto'), n('Osaka')),
        n('Presupuesto', n('Vuelos'), n('Hotel'), n('Comida diaria')),
        n('Qué llevar', n('Adaptador'), n('JR Pass'), n('Zapatos cómodos')),
        n('Antes de salir', n('Revisar el pasaporte'), n('Cambiar yenes')),
      ],
    },
  },

  arbol: {
    titulo: 'Fuentes de energía',
    guiaEs:
      'El árbol baja de lo general a lo concreto, como un organigrama. Úsalo cuando lo que tienes son categorías que se parten en subcategorías, no ideas sueltas.',
    propuesta: {
      raiz: 'Fuentes de energía',
      ramas: [
        n('Renovables', n('Solar'), n('Eólica'), n('Hidráulica')),
        n('Fósiles', n('Carbón'), n('Petróleo'), n('Gas natural')),
        n('Nuclear', n('Fisión'), n('Fusión')),
      ],
    },
  },

  etimologia: {
    titulo: 'Idea',
    guiaEs:
      'El árbol etimológico desarma una palabra: de dónde viene, qué significa, cómo se usa y qué palabras son de su familia. Va bien para entender un concepto a fondo antes de una lluvia o para ponerle nombre a algo.',
    propuesta: {
      raiz: 'Idea',
      ramas: [
        n('Origen', n('Gr. idéa: ‘forma, aspecto’'), n('De ideîn: ‘ver’'), n('Al español por el latín')),
        n('Significados', n('Representación mental'), n('Plan o propósito'), n('Concepto u opinión')),
        n('Usos', n('«Tener una idea»'), n('«Ni idea»'), n('«Hacerse a la idea»')),
        n('Familia léxica', n('Ideal'), n('Idear'), n('Ideología'), n('Ideario')),
      ],
    },
  },

  llaves: {
    titulo: 'Partes de una bicicleta',
    guiaEs:
      'Las llaves parten un todo en sus piezas, de izquierda a derecha: el cuadro sinóptico de toda la vida. Va bien para desarmar algo y ver de qué está hecho.',
    propuesta: {
      raiz: 'Bicicleta',
      ramas: [
        n('Cuadro', n('Tubo superior'), n('Horquilla'), n('Sillín')),
        n('Transmisión', n('Pedales'), n('Cadena'), n('Piñones')),
        n('Ruedas', n('Llanta'), n('Rayos'), n('Cámara')),
        n('Frenos', n('Manetas'), n('Pastillas')),
      ],
    },
  },

  circulo: {
    titulo: 'El café',
    guiaEs:
      'El círculo pone un tema al centro y lo rodea con todo lo que sabes de él, sin jerarquía ni orden. Sirve para explorar un concepto o para repasar antes de un examen.',
    propuesta: {
      raiz: 'El café',
      ramas: [
        n('Tiene cafeína'),
        n('Crece en el trópico'),
        n('Arábica y robusta'),
        n('Tueste claro u oscuro'),
        n('Espresso'),
        n('Se cosecha a mano'),
        n('Descafeinado'),
        n('Segunda bebida del mundo'),
      ],
    },
  },

  flujo: {
    titulo: 'Sacar una cita médica',
    guiaEs:
      'El flujo encadena pasos con flechas. Toca un paso y usa el botón de la figura para volverlo inicio, decisión o fin: los rombos son las preguntas de sí o no.',
    propuesta: {
      raiz: 'Necesito consulta',
      formaRaiz: 'inicio',
      ramas: cadena([
        paso('Necesito consulta', 'inicio'),
        paso('Abrir la app del seguro'),
        paso('¿Hay cita esta semana?', 'decision'),
        paso('Elegir día y hora'),
        paso('Confirmar y guardar'),
        paso('Ponerla en el calendario', 'fin'),
      ]),
    },
  },

  linea: {
    titulo: 'Historia de internet',
    guiaEs:
      'La línea del tiempo ordena por fechas: cada hito cae alternando arriba y abajo de la recta y sus detalles cuelgan hacia afuera. Empieza el hito con el año y se lee solo.',
    propuesta: {
      raiz: 'Historia de internet',
      ramas: [
        n('1969 · Nace ARPANET', n('Cuatro universidades')),
        n('1983 · Se adopta TCP/IP'),
        n('1991 · Primera web pública', n('Tim Berners-Lee')),
        n('2004 · Llegan las redes sociales'),
        n('2007 · El móvil se lleva todo'),
      ],
    },
  },

  ciclo: {
    titulo: 'Ciclo del agua',
    guiaEs:
      'El ciclo encadena etapas que vuelven a empezar. Agrega cada etapa desde la raíz —toca el fondo para no colgarla de la anterior— y se reparten solas en el círculo.',
    propuesta: {
      raiz: 'Ciclo del agua',
      ramas: [
        n('Evaporación', n('El sol calienta el mar')),
        n('Condensación', n('Se forman las nubes')),
        n('Precipitación', n('Llueve o nieva')),
        n('Escorrentía', n('Los ríos vuelven al mar')),
      ],
    },
  },

  piramide: {
    titulo: 'Pirámide de Maslow',
    guiaEs:
      'La pirámide apila niveles: cada uno se sostiene sobre el de abajo, así que la base es lo primero que hay que cubrir. Toca dos veces el nombre de un nivel para cambiarlo.',
    propuesta: {
      raiz: 'Pirámide de Maslow',
      ramas: [],
      conjuntos: ['Autorrealización', 'Reconocimiento', 'Afecto y seguridad', 'Necesidades básicas'],
      elementos: [
        { texto: 'Crear y dar sentido', zona: 'p1' },
        { texto: 'Respeto y logros', zona: 'p2' },
        { texto: 'Amistad y pareja', zona: 'p3' },
        { texto: 'Casa y trabajo', zona: 'p3' },
        { texto: 'Comer y dormir', zona: 'p4' },
        { texto: 'Salud', zona: 'p4' },
      ],
    },
  },

  venn: {
    titulo: 'Perros y gatos',
    guiaEs:
      'El Venn enfrenta dos conjuntos y lo que comparten cae donde se solapan. Elige la región en la barra de abajo antes de agregar, o arrastra un elemento a otra y se cambia solo.',
    propuesta: {
      raiz: 'Perros y gatos',
      ramas: [],
      conjuntos: ['Perros', 'Gatos'],
      elementos: [
        { texto: 'Salen a pasear', zona: 'a' },
        { texto: 'Obedecen órdenes', zona: 'a' },
        { texto: 'Se limpian solos', zona: 'b' },
        { texto: 'Usan arenero', zona: 'b' },
        { texto: 'Mamíferos', zona: 'ab' },
        { texto: 'Necesitan vacunas', zona: 'ab' },
        { texto: 'Viven en casa', zona: 'ab' },
      ],
    },
  },

  comparacion: {
    titulo: 'Café o té',
    guiaEs:
      'La comparación pone dos temas en columnas y lo común en el medio. Es el Venn en forma de tabla: se lee más rápido cuando hay muchos puntos por lado.',
    propuesta: {
      raiz: 'Café o té',
      ramas: [],
      conjuntos: ['Café', 'Té'],
      elementos: [
        { texto: 'Más cafeína', zona: 'izq' },
        { texto: 'Sabor tostado', zona: 'izq' },
        { texto: 'Se toman calientes', zona: 'centro' },
        { texto: 'Tienen antioxidantes', zona: 'centro' },
        { texto: 'Más suave', zona: 'der' },
        { texto: 'Muchísimas variedades', zona: 'der' },
      ],
    },
  },

  proscontras: {
    titulo: 'Trabajar desde casa',
    guiaEs:
      'Cada punto pesa de 1 a 5: selecciónalo y usa − + en la barra de abajo. La suma de cada columna va a su pie, así la decisión deja de ser «cuál lista es más larga».',
    propuesta: {
      raiz: 'Trabajar desde casa',
      ramas: [],
      elementos: [
        { texto: 'Me ahorro el traslado', zona: 'izq', peso: 5 },
        { texto: 'Horario flexible', zona: 'izq', peso: 4 },
        { texto: 'Como en casa', zona: 'izq', peso: 2 },
        { texto: 'Menos roce con el equipo', zona: 'der', peso: 4 },
        { texto: 'Cuesta desconectar', zona: 'der', peso: 3 },
        { texto: 'Sube el recibo de luz', zona: 'der', peso: 1 },
      ],
    },
  },

  fuerzas: {
    titulo: 'Salir a correr por las mañanas',
    guiaEs:
      'El campo de fuerzas mira un cambio: a la izquierda lo que lo empuja, a la derecha lo que lo frena, cada uno con su peso. Si gana la derecha, ataca primero la fuerza más pesada.',
    propuesta: {
      raiz: 'Salir a correr por las mañanas',
      ramas: [],
      elementos: [
        { texto: 'Quiero dormir mejor', zona: 'izq', peso: 4 },
        { texto: 'Tengo un parque cerca', zona: 'izq', peso: 3 },
        { texto: 'Una amiga me acompaña', zona: 'izq', peso: 4 },
        { texto: 'Me acuesto tarde', zona: 'der', peso: 5 },
        { texto: 'Hace frío al amanecer', zona: 'der', peso: 3 },
        { texto: 'Mis tenis están acabados', zona: 'der', peso: 2 },
      ],
    },
  },

  foda: {
    titulo: 'Abrir una cafetería',
    guiaEs:
      'Fortalezas y debilidades son TUYAS; oportunidades y amenazas vienen de fuera. Si dudas dónde va algo, pregúntate si depende de ti o no.',
    propuesta: {
      raiz: 'Abrir una cafetería',
      ramas: [],
      elementos: [
        { texto: 'Sé mucho de café', zona: 'f' },
        { texto: 'Receta propia de pan', zona: 'f' },
        { texto: 'Poco capital', zona: 'd' },
        { texto: 'Nunca he contratado a nadie', zona: 'd' },
        { texto: 'Barrio sin cafeterías', zona: 'o' },
        { texto: 'Oficinas a dos calles', zona: 'o' },
        { texto: 'La renta va subiendo', zona: 'a' },
        { texto: 'Una cadena abre cerca', zona: 'a' },
      ],
    },
  },

  eisenhower: {
    titulo: 'Mi semana',
    guiaEs:
      'Arriba lo importante, a la izquierda lo urgente. El cuadrante de «agéndalo» es el que mueve la aguja: si vive vacío, estás apagando fuegos todo el día.',
    propuesta: {
      raiz: 'Mi semana',
      ramas: [],
      elementos: [
        { texto: 'Entregar el informe hoy', zona: 'hacer' },
        { texto: 'Llamar al dentista', zona: 'hacer' },
        { texto: 'Preparar la presentación', zona: 'agendar' },
        { texto: 'Hacer ejercicio', zona: 'agendar' },
        { texto: 'Pedir el material', zona: 'delegar' },
        { texto: 'Contestar al proveedor', zona: 'delegar' },
        { texto: 'Mirar el móvil cada rato', zona: 'quitar' },
        { texto: 'Junta sin orden del día', zona: 'quitar' },
      ],
    },
  },

  decision: {
    titulo: '¿Acepto el trabajo nuevo?',
    guiaEs:
      'Cada rama es una opción y de ella cuelgan sus consecuencias. Escríbelas aunque parezcan obvias: lo que no está escrito no se compara con nada.',
    propuesta: {
      raiz: '¿Acepto el trabajo nuevo?',
      ramas: [
        n('Acepto', n('Sueldo más alto'), n('Mudarme de ciudad'), n('Empezar de cero')),
        n('Me quedo', n('Equipo que ya conozco'), n('Techo de sueldo')),
        n('Negocio quedarme', n('Puede salir bien'), n('Puede incomodar')),
      ],
    },
  },

  tier: {
    titulo: 'Mis desayunos',
    guiaEs:
      'S es lo mejor y D lo peor. Lo que todavía no clasificas espera abajo en «Sin clasificar»: arrástralo a su fila cuando lo tengas claro.',
    propuesta: {
      raiz: 'Mis desayunos',
      ramas: [],
      elementos: [
        { texto: 'Chilaquiles', zona: 's' },
        { texto: 'Huevos rancheros', zona: 's' },
        { texto: 'Fruta con yogur', zona: 'a' },
        { texto: 'Molletes', zona: 'a' },
        { texto: 'Pan tostado', zona: 'b' },
        { texto: 'Cereal de caja', zona: 'c' },
        { texto: 'Solo café', zona: 'd' },
        { texto: 'Tamales', zona: 'sin' },
      ],
    },
  },

  matriz: {
    titulo: '¿Qué laptop compro?',
    guiaEs:
      'Cada criterio pesa lo que te importe (1-5) y cada opción se puntúa del 1 al 5 en él. El total multiplica puntaje por peso, así nada gana por ser buenísimo en lo que te da igual.',
    propuesta: {
      raiz: '¿Qué laptop compro?',
      ramas: [],
      criterios: [
        { texto: 'Precio', peso: 5 },
        { texto: 'Batería', peso: 4 },
        { texto: 'Peso', peso: 3 },
        { texto: 'Pantalla', peso: 2 },
      ],
      opciones: [
        { texto: 'La barata', puntajes: [5, 3, 3, 2] },
        { texto: 'La ligera', puntajes: [3, 4, 5, 3] },
        { texto: 'La potente', puntajes: [1, 2, 2, 5] },
      ],
    },
  },

  ishikawa: {
    titulo: 'El pastel no esponjó',
    guiaEs:
      'La cabeza es el problema y cada espina, una familia de causas (método, equipo, materiales, medición…). Busca CAUSAS, no soluciones: eso viene después.',
    propuesta: {
      raiz: 'El pastel no esponjó',
      ramas: [
        n('Ingredientes', n('Polvo para hornear vencido'), n('Huevos fríos')),
        n('Método', n('Batí de más la mezcla'), n('Abrí el horno antes de tiempo')),
        n('Equipo', n('Horno descalibrado'), n('Molde demasiado grande')),
        n('Medición', n('Medí con taza, no con báscula')),
      ],
    },
  },
}
