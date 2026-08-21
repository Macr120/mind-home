import type { PorIdioma } from '../../../core/i18n/porIdioma'

/**
 * Banco del Ahorcado por idioma: su ALFABETO (el teclado del juego) y sus 100
 * palabras. Las palabras NO se traducen: se SUSTITUYEN por palabras bonitas y
 * cotidianas de ese idioma (la regla de la «palabra del día» del diario), en
 * MAYÚSCULAS. Pueden llevar diacríticos que se plieguen a una tecla del
 * alfabeto (Á→A en español); una letra que esté en `letras` (la Ñ, las umlauts
 * del alemán…) se juega tal cual.
 *
 * Solo escrituras alfabéticas: latinos + ruso (cirílico). Los idiomas sin rama
 * (ja/zh/ko/ar/hi, donde adivinar letra a letra no funciona) caen al INGLÉS
 * por la cascada de `enIdioma` — decisión registrada en el glosario.
 */

export interface BancoAhorcado {
  letras: string
  palabras: string[]
}

export const BANCOS_AHORCADO: PorIdioma<BancoAhorcado> = {
  es: {
    letras: 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ',
    palabras: [
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
    ],
  },
  en: {
    letras: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    palabras: [
      'TREE', 'MOUNTAIN', 'GUITAR', 'ELEPHANT', 'BUTTERFLY', 'LIBRARY', 'CHOCOLATE', 'WINDOW', 'PYRAMID', 'DINOSAUR',
      'TELEPHONE', 'CASTLE', 'GIRAFFE', 'ICECREAM', 'PLANET', 'VOLCANO', 'COMPASS', 'CRAB', 'MIRROR', 'GHOST',
      'COOKIE', 'ANT', 'WINTER', 'GARDEN', 'LAMP', 'BAT', 'ORANGE', 'ORCHESTRA', 'CLOWN', 'CHEESE',
      'LIGHTNING', 'RAINBOW', 'SHARK', 'UNICORN', 'VIOLIN', 'CARROT', 'AIRPLANE', 'WHALE', 'PLUM', 'DOLPHIN',
      'LADDER', 'FIRE', 'BALLOON', 'HURRICANE', 'CHURCH', 'TOY', 'KOALA', 'LEMONADE', 'MARKET', 'CLOUD',
      'BEAR', 'PENGUIN', 'MOUSE', 'SNAKE', 'TURTLE', 'GRAPE', 'VAMPIRE', 'YOGURT', 'SHOE', 'SPIDER',
      'FOREST', 'SHIRT', 'DRAGON', 'STAR', 'FLUTE', 'SUNFLOWER', 'HOSPITAL', 'ISLAND', 'HAM', 'LION',
      'MAGIC', 'SNOW', 'OCEAN', 'TEDDY', 'FROG', 'HAT', 'TRAIN', 'SAILBOAT', 'FOX', 'RING',
      'SCARF', 'KITE', 'DIAMOND', 'SKELETON', 'STRAWBERRY', 'SEAGULL', 'HAMMOCK', 'MAGNET', 'BRICK', 'MELON',
      'NEST', 'SHEEP', 'PIRATE', 'ROBOT', 'MERMAID', 'DRUM', 'VACCINE', 'STORK', 'DOLL', 'PINATA',
    ],
  },
  pt: {
    letras: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    palabras: [
      'ABACAXI', 'ANDORINHA', 'AZULEJO', 'BORBOLETA', 'BRIGADEIRO', 'CACHOEIRA', 'CADERNO', 'CANELA', 'CARANGUEJO', 'CASTANHA',
      'CEBOLA', 'CEGONHA', 'CHAPÉU', 'CHUVA', 'COELHO', 'COLHER', 'CORAÇÃO', 'CORUJA', 'COZINHA', 'DINHEIRO',
      'DOMINGO', 'ESCADA', 'ESPELHO', 'ESTRELA', 'FAROL', 'FEIJÃO', 'FLORESTA', 'FOGUEIRA', 'FORMIGA', 'GAIVOTA',
      'GIRASSOL', 'GOIABA', 'GOLFINHO', 'GUARDANAPO', 'IGREJA', 'ILHA', 'INVERNO', 'JABUTICABA', 'JANELA', 'JARDIM',
      'JOANINHA', 'LARANJA', 'LEITE', 'LIVRARIA', 'MAÇÃ', 'MADEIRA', 'MANTEIGA', 'MARACUJÁ', 'MELANCIA', 'MERCADO',
      'MOCHILA', 'MORANGO', 'NEVOEIRO', 'NINHO', 'NUVEM', 'OCEANO', 'ORVALHO', 'OVELHA', 'PADARIA', 'PALHAÇO',
      'PANDEIRO', 'PÁSSARO', 'PEIXE', 'PIMENTA', 'PINGUIM', 'PIPOCA', 'PRAIA', 'PRESUNTO', 'QUEIJO', 'RAPOSA',
      'RELÓGIO', 'SANDÁLIA', 'SAUDADE', 'SEREIA', 'SOMBRINHA', 'SORVETE', 'TAMBOR', 'TARTARUGA', 'TESOURA', 'TIJOLO',
      'TOALHA', 'TROVOADA', 'TUCANO', 'URSO', 'VASSOURA', 'VELEIRO', 'VENTO', 'VIOLÃO', 'VIZINHO', 'XÍCARA',
      'ZEBRA', 'ABELHA', 'AREIA', 'BALEIA', 'BONECA', 'CAFÉ', 'CANOA', 'CAVALO', 'CIDADE', 'DESERTO',
    ],
  },
  fr: {
    letras: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    palabras: [
      'ABEILLE', 'ARROSOIR', 'BAGUETTE', 'BALEINE', 'BATEAU', 'BOULANGER', 'BOUSSOLE', 'BROUILLARD', 'CABANE', 'CAILLOU',
      'CANARD', 'CAROTTE', 'CASSEROLE', 'CERISE', 'CHÂTEAU', 'CHEMINÉE', 'CHOCOLAT', 'CIGOGNE', 'CITRON', 'CLOCHER',
      'COQUELICOT', 'COUSSIN', 'CRAYON', 'CUILLÈRE', 'DAUPHIN', 'ÉCHARPE', 'ÉCUREUIL', 'ÉTOILE', 'FALAISE', 'FENÊTRE',
      'FLAMANT', 'FORÊT', 'FOUGÈRE', 'FRAISE', 'FROMAGE', 'GÂTEAU', 'GIRAFE', 'GRENOUILLE', 'GUITARE', 'HIBOU',
      'HIRONDELLE', 'HORLOGE', 'JARDIN', 'JONQUILLE', 'LAVANDE', 'LIBELLULE', 'LUMIÈRE', 'LUNE', 'MARCHÉ', 'MARMITE',
      'MOUETTE', 'MOULIN', 'MONTAGNE', 'MUGUET', 'MYRTILLE', 'NEIGE', 'NUAGE', 'OCÉAN', 'OISEAU', 'ORAGE',
      'PAPILLON', 'PARAPLUIE', 'PÊCHE', 'PEINTURE', 'PHARE', 'PIVOINE', 'PLUME', 'POTIRON', 'POUSSIN', 'PRINTEMPS',
      'RENARD', 'RIVIÈRE', 'ROSÉE', 'RUCHE', 'SABLE', 'SAPIN', 'SIRÈNE', 'SOLEIL', 'SOURIS', 'TAMBOUR',
      'TARTINE', 'THÉIÈRE', 'TISANE', 'TOURNESOL', 'TRAÎNEAU', 'TRÈFLE', 'TULIPE', 'VAGUE', 'VELOURS', 'VENDANGE',
      'VERGER', 'VIOLON', 'VOILIER', 'ÉCLAIR', 'ESCARGOT', 'FANFARE', 'GALET', 'JOURNAL', 'LANTERNE', 'MIEL',
    ],
  },
  de: {
    letras: 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ',
    palabras: [
      'AHORN', 'AMSEL', 'APFEL', 'BAUM', 'BIENE', 'BLUME', 'BRÖTCHEN', 'BRÜCKE', 'BUCHSTABE', 'DACHS',
      'DECKE', 'DRACHEN', 'EICHHÖRNCHEN', 'EIMER', 'EISBÄR', 'ERDBEERE', 'FAHRRAD', 'FEDER', 'FENSTER', 'FEUER',
      'FLÖTE', 'FROSCH', 'GABEL', 'GARTEN', 'GEIGE', 'GEWITTER', 'GITARRE', 'GLOCKE', 'HAFEN', 'HANDSCHUH',
      'HASE', 'HEIMAT', 'HERBST', 'HIMMEL', 'HONIG', 'IGEL', 'INSEL', 'KAFFEE', 'KAMIN', 'KARTOFFEL',
      'KASTANIE', 'KATZE', 'KERZE', 'KIRSCHE', 'KLAVIER', 'KOFFER', 'KÖNIGIN', 'KRANICH', 'KÜCHE', 'KUCHEN',
      'LATERNE', 'LÖFFEL', 'LÖWE', 'MANDEL', 'MÄRCHEN', 'MEER', 'MÖWE', 'MÜHLE', 'MUSCHEL', 'NACHBAR',
      'NEBEL', 'NELKE', 'OBST', 'PFANNE', 'PFERD', 'PILZ', 'REGEN', 'REGENBOGEN', 'SCHNECKE', 'SCHNEE',
      'SEGELBOOT', 'SESSEL', 'SOMMER', 'SONNE', 'SPIEGEL', 'STERN', 'TASSE', 'TAUBE', 'TEPPICH', 'TRAUM',
      'TROMPETE', 'TULPE', 'UHR', 'VOGEL', 'WALD', 'WANDERUNG', 'WOLKE', 'WÜSTE', 'ZEBRA', 'ZITRONE',
      'ZUCKER', 'ZWIEBEL', 'ANANAS', 'BÄCKER', 'BIBLIOTHEK', 'DELFIN', 'FÄHRE', 'GEMÜSE', 'HOLZ', 'KOMPASS',
    ],
  },
  it: {
    letras: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    palabras: [
      'ALBERO', 'ALTALENA', 'ANATRA', 'ARANCIA', 'ARCOBALENO', 'BALENA', 'BARCA', 'BIBLIOTECA', 'BISCOTTO', 'BOSCO',
      'BUSSOLA', 'CAFFÈ', 'CAMINO', 'CAMPANA', 'CANDELA', 'CAPPELLO', 'CARCIOFO', 'CASTAGNA', 'CASTELLO', 'CHITARRA',
      'CIABATTA', 'CIGNO', 'CILIEGIA', 'CIOCCOLATO', 'CIPOLLA', 'COLLINA', 'CONCHIGLIA', 'CORNICE', 'CUCCHIAIO', 'CUCINA',
      'DELFINO', 'DOMENICA', 'FAGIOLO', 'FALEGNAME', 'FARFALLA', 'FARO', 'FINESTRA', 'FIORE', 'FONTANA', 'FORMAGGIO',
      'FORMICA', 'FRAGOLA', 'GABBIANO', 'GATTO', 'GELATO', 'GHIACCIO', 'GIARDINO', 'GIRASOLE', 'GONDOLA', 'GRANCHIO',
      'INVERNO', 'ISOLA', 'LAMPADA', 'LANTERNA', 'LAVANDA', 'LIBRO', 'LIMONE', 'LUCCIOLA', 'LUNA', 'MANDORLA',
      'MARE', 'MELA', 'MERCATO', 'MIELE', 'MONTAGNA', 'NEBBIA', 'NEVE', 'NIDO', 'NUVOLA', 'OCEANO',
      'OLIVA', 'OMBRELLO', 'ORCHESTRA', 'ORSO', 'PANE', 'PAPAVERO', 'PECORA', 'PENNELLO', 'PESCE', 'PIANOFORTE',
      'PIAZZA', 'PINGUINO', 'POMODORO', 'QUADERNO', 'RONDINE', 'SABBIA', 'SCALA', 'SCOIATTOLO', 'SEDIA', 'SIRENA',
      'SOLE', 'SPECCHIO', 'STELLA', 'TAMBURO', 'TARTARUGA', 'TAZZA', 'TEMPORALE', 'TRAMONTO', 'VELIERO', 'VIOLINO',
    ],
  },
  ru: {
    letras: 'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ',
    palabras: [
      'БАБОЧКА', 'БЕРЕЗА', 'БИБЛИОТЕКА', 'БЛИНЫ', 'ВЕСНА', 'ВЕТЕР', 'ВОДОПАД', 'ВОРОБЕЙ', 'ГИТАРА', 'ГОРОД',
      'ГРИБ', 'ГРОЗА', 'ДЕРЕВО', 'ДОЖДЬ', 'ДОРОГА', 'ДРУЖБА', 'ЕЖИК', 'ЖУРАВЛЬ', 'ЗАКАТ', 'ЗВЕЗДА',
      'ЗЕРКАЛО', 'ЗИМА', 'КАЛИНА', 'КАПЛЯ', 'КАРАНДАШ', 'КАРТИНА', 'КАЧЕЛИ', 'КИСТЬ', 'КНИГА', 'КОЛОКОЛ',
      'КОРАБЛЬ', 'КОСТЕР', 'КОШКА', 'КРЕПОСТЬ', 'ЛАНДЫШ', 'ЛАСТОЧКА', 'ЛЕС', 'ЛЕСТНИЦА', 'ЛИСА', 'ЛОДКА',
      'ЛОЖКА', 'ЛУНА', 'МАЛИНА', 'МЕДВЕДЬ', 'МЕЛЬНИЦА', 'МОРЕ', 'МОРКОВЬ', 'МОСТ', 'МУЗЫКА', 'НЕБО',
      'ОБЛАКО', 'ОГОНЬ', 'ОЗЕРО', 'ОКНО', 'ОЛЕНЬ', 'ОРЕХ', 'ОСЕНЬ', 'ОСТРОВ', 'ПАРУС', 'ПЕСНЯ',
      'ПЕЧЕНЬЕ', 'ПИРОГ', 'ПЛАТОК', 'ПОДСОЛНУХ', 'ПОЛЯНА', 'ПТИЦА', 'ПЧЕЛА', 'РАДУГА', 'РЕКА', 'РОДИНА',
      'РОМАШКА', 'РЫБАК', 'САПОГИ', 'САХАР', 'СВЕЧА', 'СИРЕНЬ', 'СКАЗКА', 'СКРИПКА', 'СНЕГ', 'СОБАКА',
      'СОЛНЦЕ', 'СОСНА', 'СТЕКЛО', 'СУНДУК', 'ТЕТРАДЬ', 'ТУМАН', 'ТЫКВА', 'УЛИТКА', 'УТРО', 'ФОНАРЬ',
      'ХЛЕБ', 'ЦВЕТОК', 'ЧАЙНИК', 'ЧЕРЕПАХА', 'ШАПКА', 'ШМЕЛЬ', 'ЩЕНОК', 'ЯБЛОКО', 'ЯГОДА', 'ЯКОРЬ',
    ],
  },
  tr: {
    letras: 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ',
    palabras: [
      'ARMUT', 'ARI', 'AYÇİÇEĞİ', 'AYNA', 'BAHÇE', 'BALIK', 'BARDAK', 'BULUT', 'ÇAYDANLIK', 'ÇİLEK',
      'ÇİÇEK', 'ÇORBA', 'DAĞ', 'DENİZ', 'DEFTER', 'DEĞİRMEN', 'DOLUNAY', 'EKMEK', 'ELMA', 'FENER',
      'FINDIK', 'FIRIN', 'GEMİ', 'GÜNEŞ', 'GÜVERCİN', 'GÖKKUŞAĞI', 'GÖLGE', 'HALI', 'HAVUÇ', 'HÜZÜN',
      'İNCİR', 'İPEK', 'KAHVE', 'KALEM', 'KANAT', 'KAPLUMBAĞA', 'KARANFİL', 'KARPUZ', 'KAŞIK', 'KEDİ',
      'KELEBEK', 'KESTANE', 'KİRAZ', 'KİTAP', 'KÖPEK', 'KÖPRÜ', 'KUŞ', 'LEYLEK', 'LİMON', 'MANDALİNA',
      'MARTI', 'MASAL', 'MENEKŞE', 'MERDİVEN', 'MEYVE', 'MUM', 'ORMAN', 'PAPATYA', 'PATLICAN', 'PENCERE',
      'PEYNİR', 'PORTAKAL', 'RÜZGAR', 'SALINCAK', 'SEPET', 'SİMİT', 'SOKAK', 'SÜMBÜL', 'ŞEKER', 'ŞEMSİYE',
      'ŞARKI', 'TARÇIN', 'TAVŞAN', 'TEKNE', 'TİLKİ', 'TOPRAK', 'TURNA', 'UÇURTMA', 'YAĞMUR', 'YAPRAK',
      'YASTIK', 'YELKEN', 'YILDIZ', 'YOLCU', 'YORGAN', 'YUMURTA', 'YUVA', 'ZEYTİN', 'ZİL', 'ZÜRAFA',
      'AKŞAM', 'ARABA', 'AYAKKABI', 'BAL', 'BULMACA', 'ÇATI', 'DUVAR', 'GÖZLÜK', 'İĞNE', 'KAR',
    ],
  },
  id: {
    letras: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    palabras: [
      'AWAN', 'ANGGREK', 'BAMBU', 'BINTANG', 'BUNGA', 'BULAN', 'BURUNG', 'CANGKIR', 'CEMARA', 'DAPUR',
      'DAUN', 'DELIMA', 'DURIAN', 'EMBUN', 'GAJAH', 'GARAM', 'GELOMBANG', 'GITAR', 'GUNUNG', 'HUJAN',
      'HUTAN', 'IKAN', 'JAGUNG', 'JALAN', 'JAMBU', 'JANGKRIK', 'JEMBATAN', 'JENDELA', 'KACANG', 'KAMBING',
      'KAPAL', 'KELAPA', 'KERANJANG', 'KERTAS', 'KIPAS', 'KOPI', 'KUCING', 'KUDA', 'KUNCI', 'LADANG',
      'LANGIT', 'LAUT', 'LEBAH', 'LEMARI', 'LENTERA', 'LUMBUNG', 'MADU', 'MANGGA', 'MATAHARI', 'MELATI',
      'MERPATI', 'MUSIM', 'NANAS', 'NELAYAN', 'OMBAK', 'PADI', 'PANTAI', 'PAYUNG', 'PELANGI', 'PENYU',
      'PERAHU', 'PIRING', 'POHON', 'RANTING', 'RUMAH', 'RUSA', 'SAWAH', 'SELIMUT', 'SENJA', 'SEPEDA',
      'SERULING', 'SINGA', 'SUNGAI', 'TANAH', 'TARIAN', 'TEMPE', 'TERATAI', 'TIKAR', 'TUPAI', 'UDANG',
      'ULAR', 'UNTA', 'WARUNG', 'ANGIN', 'ASAP', 'BADAI', 'BATIK', 'BEBEK', 'BERAS', 'BUKIT',
      'BUKU', 'CAHAYA', 'DANAU', 'GERIMIS', 'KEMBANG', 'LILIN', 'MAWAR', 'PASIR', 'PELUKIS', 'SEPATU',
    ],
  },
  pl: {
    letras: 'AĄBCĆDEĘFGHIJKLŁMNŃOÓPRSŚTUWYZŹŻ',
    palabras: [
      'BOCIAN', 'BIEDRONKA', 'BRZOZA', 'CHMURA', 'CIASTKO', 'CYTRYNA', 'CZAJNIK', 'CZEREŚNIA', 'DESZCZ', 'DRZEWO',
      'DYNIA', 'DZWONEK', 'FILIŻANKA', 'GITARA', 'GOŁĄB', 'GRUSZKA', 'GWIAZDA', 'HERBATA', 'JABŁKO', 'JAGODA',
      'JASKÓŁKA', 'JEZIORO', 'JEŻ', 'KACZKA', 'KAWA', 'KLUCZ', 'KOMIN', 'KONWALIA', 'KOSZYK', 'KSIĄŻKA',
      'KWIAT', 'LAMPA', 'LATARNIA', 'LATO', 'LIŚĆ', 'ŁÓDKA', 'ŁĄKA', 'MALINA', 'MARCHEWKA', 'MASŁO',
      'MIÓD', 'MGŁA', 'MORZE', 'MOTYL', 'MUSZLA', 'NIEBO', 'OGRÓD', 'OKNO', 'ORZECH', 'PIERNIK',
      'PIÓRO', 'PLECAK', 'POCIĄG', 'PSZCZOŁA', 'PTAK', 'RÓŻA', 'RZEKA', 'SANIE', 'SERCE', 'SKRZYPCE',
      'SŁOŃCE', 'SŁOWIK', 'SOWA', 'ŚNIEG', 'STOKROTKA', 'SZAFA', 'SZALIK', 'SZKLANKA', 'ŚWIECA', 'TĘCZA',
      'TRUSKAWKA', 'WIATR', 'WIERZBA', 'WIOSNA', 'WODA', 'WRZOS', 'ZAJĄC', 'ZAMEK', 'ZEGAR', 'ZIEMIA',
      'ZIMA', 'ŻABA', 'ŻAGIEL', 'ŻÓŁW', 'ŹRÓDŁO', 'JESIEŃ', 'KSIĘŻYC', 'CHLEB', 'CUKIER', 'DOM',
      'DROGA', 'DZBANEK', 'GNIAZDO', 'GÓRA', 'GRZYB', 'JELEŃ', 'KAPELUSZ', 'KOŃ', 'LAS', 'MIASTO',
    ],
  },
  nl: {
    letras: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    palabras: [
      'AARDBEI', 'APPEL', 'BAKKER', 'BEUK', 'BIJENKORF', 'BLOEM', 'BOEKENKAST', 'BOOM', 'BOTERHAM', 'BRUG',
      'DAK', 'DEKEN', 'DOLFIJN', 'DRAAIMOLEN', 'DROOM', 'DUIF', 'EEKHOORN', 'FIETS', 'FLUIT', 'GEVEL',
      'GITAAR', 'GRACHT', 'HAARD', 'HAGEDIS', 'HAVEN', 'HEIDE', 'HERFST', 'HONING', 'HOOIBERG', 'IJSBEER',
      'KAARS', 'KAAS', 'KABOUTER', 'KAMEEL', 'KANO', 'KASTANJE', 'KEUKEN', 'KIEZEL', 'KLAPROOS', 'KLOMPEN',
      'KOEKJE', 'KOFFIE', 'KONIJN', 'KRAANVOGEL', 'KUSSEN', 'LANTAARN', 'LAVENDEL', 'LEPEL', 'LIBEL', 'MEEUW',
      'MOLEN', 'MOSSEL', 'MUZIEK', 'NACHTEGAAL', 'NEVEL', 'OCEAAN', 'OLIFANT', 'PAARD', 'PANNENKOEK', 'PARAPLU',
      'PADDENSTOEL', 'PEER', 'PLEIN', 'POES', 'REGENBOOG', 'RIVIER', 'SCHELP', 'SCHOMMEL', 'SLEUTEL', 'SNEEUW',
      'SPIEGEL', 'STOEL', 'STRAND', 'STROOPWAFEL', 'SUIKER', 'TAFEL', 'THEEPOT', 'TOREN', 'TUIN', 'TULP',
      'UIL', 'VEER', 'VIJVER', 'VIOOL', 'VLINDER', 'VOGEL', 'VOS', 'VUURTOREN', 'WAFEL', 'WANDELING',
      'WATER', 'WEIDE', 'WINDMOLEN', 'WINTER', 'WOLK', 'ZANDLOPER', 'ZEEHOND', 'ZEILBOOT', 'ZOMER', 'ZONNEBLOEM',
    ],
  },
}
