import type { Efemeride } from '../../core/data/db'
import type { Idioma } from '../../core/state/ajustesStore'
import { diaDelAnio } from '../../core/fechaLocal'
import { fetchJson } from './fuentes'

/**
 * Catálogo curado local para las efemérides culturales (obra, libro, palabra,
 * frase) cuando no hay IA configurada. Rota por día del año; las imágenes se
 * resuelven en Wikipedia por el título del artículo (si falla, sin imagen).
 */

type PaginaWiki = { thumbnail?: { source?: string }; extract?: string }

export interface ResumenWiki {
  imagen?: string
  /** Primer párrafo del artículo (texto plano). */
  extract?: string
}

/** Miniatura + resumen de un artículo de Wikipedia por título, en un idioma. */
export async function resumenWikipedia(titulo: string, idioma: Idioma = 'es'): Promise<ResumenWiki> {
  try {
    const data = (await fetchJson(
      `https://${idioma}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(titulo.replace(/ /g, '_'))}`,
    )) as PaginaWiki
    return { imagen: data.thumbnail?.source, extract: data.extract }
  } catch {
    return {}
  }
}

/** Solo la miniatura (atajo sobre resumenWikipedia). */
export async function imagenWikipedia(titulo: string, idioma: Idioma = 'es'): Promise<string | undefined> {
  return (await resumenWikipedia(titulo, idioma)).imagen
}

/** Une párrafos no vacíos con un salto de línea doble. */
const unirParrafos = (...partes: (string | undefined)[]) =>
  partes.filter((p) => p && p.trim()).join('\n\n')

interface Obra { titulo: string; artista: string; anio: string; texto: string; wiki: string }
interface Libro { titulo: string; autor: string; anio: string; texto: string; wiki: string }
interface Palabra { palabra: string; clase: string; definicion: string; origen: string; ejemplo: string }
interface Frase { cita: string; autor: string; wiki: string }

const OBRAS: Obra[] = [
  { titulo: 'La noche estrellada', artista: 'Vincent van Gogh', anio: '1889', texto: 'Pintada desde el sanatorio de Saint-Rémy, su cielo en espirales convirtió la angustia del pintor en uno de los paisajes más reconocibles del arte.', wiki: 'La noche estrellada' },
  { titulo: 'Las meninas', artista: 'Diego Velázquez', anio: '1656', texto: 'Un juego de espejos y miradas en la corte de Felipe IV: el cuadro donde el pintor se pinta pintando y el espectador entra en escena.', wiki: 'Las meninas' },
  { titulo: 'La Gioconda', artista: 'Leonardo da Vinci', anio: 'c. 1503', texto: 'La sonrisa más estudiada de la historia; el sfumato de Leonardo hace que el gesto cambie según desde dónde se mire.', wiki: 'La Gioconda' },
  { titulo: 'El grito', artista: 'Edvard Munch', anio: '1893', texto: 'Un atardecer rojo sobre el fiordo de Oslo y una figura que grita: el icono de la ansiedad moderna.', wiki: 'El grito' },
  { titulo: 'Guernica', artista: 'Pablo Picasso', anio: '1937', texto: 'El bombardeo de una población vasca convertido en alegato universal contra la guerra, en blanco, negro y gris.', wiki: 'Guernica (cuadro)' },
  { titulo: 'La persistencia de la memoria', artista: 'Salvador Dalí', anio: '1931', texto: 'Los relojes blandos de Dalí derriten el tiempo sobre la bahía de Portlligat: el surrealismo en su imagen más pura.', wiki: 'La persistencia de la memoria' },
  { titulo: 'El nacimiento de Venus', artista: 'Sandro Botticelli', anio: 'c. 1485', texto: 'Venus llega a la orilla sobre una concha empujada por los vientos: el Renacimiento recupera la belleza clásica.', wiki: 'El nacimiento de Venus' },
  { titulo: 'La joven de la perla', artista: 'Johannes Vermeer', anio: 'c. 1665', texto: 'Llamada la "Mona Lisa del norte": un turbante azul, un arete de perla y una mirada que parece a punto de hablar.', wiki: 'La joven de la perla' },
  { titulo: 'La última cena', artista: 'Leonardo da Vinci', anio: '1498', texto: 'El instante en que Jesús anuncia la traición: doce reacciones humanas capturadas en un muro de Milán.', wiki: 'La última cena (Leonardo da Vinci)' },
  { titulo: 'La creación de Adán', artista: 'Miguel Ángel', anio: 'c. 1511', texto: 'Dos dedos a punto de tocarse en la bóveda de la Capilla Sixtina: la chispa de la vida según Miguel Ángel.', wiki: 'La creación de Adán' },
  { titulo: 'El beso', artista: 'Gustav Klimt', anio: '1908', texto: 'Una pareja envuelta en oro y mosaicos: la obra cumbre del periodo dorado de Klimt y de la Viena modernista.', wiki: 'El beso (Klimt)' },
  { titulo: 'Las dos Fridas', artista: 'Frida Kahlo', anio: '1939', texto: 'Dos versiones de Frida se toman de la mano con los corazones expuestos, pintadas tras su divorcio de Diego Rivera.', wiki: 'Las dos Fridas' },
  { titulo: 'El jardín de las delicias', artista: 'El Bosco', anio: 'c. 1500', texto: 'Un tríptico que va del paraíso al infierno pasando por un jardín imposible, lleno de criaturas que aún desconciertan.', wiki: 'El jardín de las delicias' },
  { titulo: 'La libertad guiando al pueblo', artista: 'Eugène Delacroix', anio: '1830', texto: 'La Libertad avanza sobre las barricadas de París con la bandera en alto: la pintura hecha himno revolucionario.', wiki: 'La Libertad guiando al pueblo' },
  { titulo: 'Impresión, sol naciente', artista: 'Claude Monet', anio: '1872', texto: 'El amanecer brumoso del puerto de El Havre que, por burla de un crítico, dio nombre al impresionismo.', wiki: 'Impresión, sol naciente' },
  { titulo: 'La ronda de noche', artista: 'Rembrandt', anio: '1642', texto: 'Una compañía de milicianos en movimiento, luz teatral y tamaño monumental: el retrato de grupo vuelto acción.', wiki: 'La ronda de noche' },
  { titulo: 'El tres de mayo de 1808 en Madrid', artista: 'Francisco de Goya', anio: '1814', texto: 'Los fusilamientos de la Moncloa: la camisa blanca iluminada que inauguró la pintura moderna de denuncia.', wiki: 'El tres de mayo de 1808 en Madrid' },
  { titulo: 'Saturno devorando a su hijo', artista: 'Francisco de Goya', anio: 'c. 1823', texto: 'La más feroz de las Pinturas negras: el tiempo que devora todo, pintado directamente sobre el muro de su casa.', wiki: 'Saturno devorando a su hijo (Goya)' },
  { titulo: 'La gran ola de Kanagawa', artista: 'Katsushika Hokusai', anio: 'c. 1831', texto: 'Una ola gigante a punto de tragarse tres barcas con el monte Fuji al fondo: la estampa japonesa más famosa del mundo.', wiki: 'La gran ola de Kanagawa' },
  { titulo: 'Nighthawks', artista: 'Edward Hopper', anio: '1942', texto: 'Un diner iluminado en la madrugada neoyorquina: la soledad urbana convertida en escena de cine.', wiki: 'Nighthawks' },
  { titulo: 'American Gothic', artista: 'Grant Wood', anio: '1930', texto: 'Un granjero con su horca y su hija frente a una casa de madera: el retrato más parodiado de Estados Unidos.', wiki: 'American Gothic' },
  { titulo: 'El hijo del hombre', artista: 'René Magritte', anio: '1964', texto: 'Un hombre de bombín con una manzana verde frente al rostro: Magritte y el arte de ocultar lo visible.', wiki: 'El hijo del hombre' },
  { titulo: 'La lechera', artista: 'Johannes Vermeer', anio: 'c. 1660', texto: 'Una sirvienta vierte leche en silencio junto a una ventana: lo cotidiano elevado a ceremonia por la luz de Vermeer.', wiki: 'La lechera (Vermeer)' },
  { titulo: 'El caminante sobre el mar de nubes', artista: 'Caspar David Friedrich', anio: 'c. 1818', texto: 'Un hombre de espaldas contempla un mar de niebla desde la cumbre: el espíritu romántico en una sola imagen.', wiki: 'El caminante sobre el mar de nubes' },
  { titulo: 'La balsa de la Medusa', artista: 'Théodore Géricault', anio: '1819', texto: 'Náufragos reales convertidos en pirámide de desesperación y esperanza: el escándalo que estrenó el romanticismo francés.', wiki: 'La balsa de la Medusa' },
  { titulo: 'Baile en el Moulin de la Galette', artista: 'Pierre-Auguste Renoir', anio: '1876', texto: 'Luz moteada entre los árboles y parejas bailando en Montmartre: la alegría impresionista de un domingo cualquiera.', wiki: 'Baile en el Moulin de la Galette' },
  { titulo: 'Una tarde de domingo en la isla de la Grande Jatte', artista: 'Georges Seurat', anio: '1886', texto: 'Miles de puntos de color puro componen un parque a orillas del Sena: el puntillismo llevado a la perfección.', wiki: 'Tarde de domingo en la isla de la Grande Jatte' },
  { titulo: 'Los jugadores de cartas', artista: 'Paul Cézanne', anio: 'c. 1892', texto: 'Dos campesinos concentrados en la partida: la solidez geométrica de Cézanne que anunció el cubismo.', wiki: 'Los jugadores de cartas' },
  { titulo: 'Autorretrato con oreja vendada', artista: 'Vincent van Gogh', anio: '1889', texto: 'Van Gogh se pinta sereno tras la crisis de Arlés: el rostro del artista mirando de frente a su fragilidad.', wiki: 'Autorretrato con la oreja vendada' },
  { titulo: 'El almuerzo de los remeros', artista: 'Pierre-Auguste Renoir', anio: '1881', texto: 'Amigos, vino y luz de verano en una terraza sobre el Sena: Renoir retrata la dicha de estar juntos.', wiki: 'El almuerzo de los remeros' },
  { titulo: 'Las señoritas de Avignon', artista: 'Pablo Picasso', anio: '1907', texto: 'Cinco figuras de rostros como máscaras rompieron la perspectiva para siempre: aquí empieza el cubismo.', wiki: 'Las señoritas de Avignon' },
  { titulo: 'La danza', artista: 'Henri Matisse', anio: '1910', texto: 'Cinco cuerpos rojos girando sobre fondo azul y verde: el color puro de Matisse convertido en movimiento.', wiki: 'La danza (Matisse)' },
  { titulo: 'Noche estrellada sobre el Ródano', artista: 'Vincent van Gogh', anio: '1888', texto: 'Las luces de Arlés reflejadas en el río bajo la Osa Mayor: la noche que Van Gogh pintó antes de la más famosa.', wiki: 'La noche estrellada sobre el Ródano' },
  { titulo: 'El matrimonio Arnolfini', artista: 'Jan van Eyck', anio: '1434', texto: 'Una pareja flamenca, un espejo convexo y mil detalles simbólicos: el óleo primitivo más enigmático del siglo XV.', wiki: 'El matrimonio Arnolfini' },
  { titulo: 'La escuela de Atenas', artista: 'Rafael Sanzio', anio: '1511', texto: 'Platón y Aristóteles caminan entre sabios de todos los tiempos: el Renacimiento rinde homenaje a la filosofía.', wiki: 'La escuela de Atenas' },
  { titulo: 'Ofelia', artista: 'John Everett Millais', anio: '1852', texto: 'La Ofelia de Shakespeare flota entre flores minuciosamente reales: la joya de los prerrafaelitas.', wiki: 'Ofelia (Millais)' },
  { titulo: 'El columpio', artista: 'Jean-Honoré Fragonard', anio: '1767', texto: 'Encaje, jardín y un zapato volando: la frivolidad elegante del rococó francés en su escena más célebre.', wiki: 'El columpio (Fragonard)' },
  { titulo: 'Judit decapitando a Holofernes', artista: 'Artemisia Gentileschi', anio: 'c. 1620', texto: 'La heroína bíblica pintada con una fuerza inédita por la gran maestra del barroco italiano.', wiki: 'Judit decapitando a Holofernes (Artemisia Gentileschi, Florencia)' },
  { titulo: 'Campo de trigo con cuervos', artista: 'Vincent van Gogh', anio: '1890', texto: 'Un cielo tormentoso, tres caminos y una bandada de cuervos: una de las últimas telas que pintó Van Gogh.', wiki: 'Campo de trigo con cuervos' },
  { titulo: 'La torre de Babel', artista: 'Pieter Brueghel el Viejo', anio: '1563', texto: 'Una torre imposible que asciende en espiral hasta las nubes: la ambición humana según Brueghel.', wiki: 'La torre de Babel (Brueghel)' },
]

const LIBROS: Libro[] = [
  { titulo: 'Don Quijote de la Mancha', autor: 'Miguel de Cervantes', anio: '1605', texto: 'Un hidalgo enloquecido por los libros de caballerías sale a desfacer entuertos: la novela que fundó la novela moderna.', wiki: 'Don Quijote de la Mancha' },
  { titulo: 'Cien años de soledad', autor: 'Gabriel García Márquez', anio: '1967', texto: 'Siete generaciones de los Buendía en Macondo: el realismo mágico que puso a América Latina en el centro de la literatura.', wiki: 'Cien años de soledad' },
  { titulo: 'Pedro Páramo', autor: 'Juan Rulfo', anio: '1955', texto: 'Juan Preciado llega a Comala buscando a su padre y encuentra un pueblo de murmullos: la novela breve más influyente de México.', wiki: 'Pedro Páramo' },
  { titulo: 'Rayuela', autor: 'Julio Cortázar', anio: '1963', texto: 'Una novela que se puede leer en varios órdenes, entre París y Buenos Aires: el gran juego experimental del "boom".', wiki: 'Rayuela' },
  { titulo: '1984', autor: 'George Orwell', anio: '1949', texto: 'El Gran Hermano, la neolengua y la policía del pensamiento: la distopía que dio vocabulario a la vigilancia moderna.', wiki: '1984 (novela)' },
  { titulo: 'El principito', autor: 'Antoine de Saint-Exupéry', anio: '1943', texto: 'Un aviador varado en el desierto y un niño que viene de un asteroide: una fábula sobre lo esencial invisible a los ojos.', wiki: 'El principito' },
  { titulo: 'Crimen y castigo', autor: 'Fiódor Dostoyevski', anio: '1866', texto: 'Raskólnikov mata a una usurera para probarse superior y descubre el peso de la conciencia: la novela psicológica total.', wiki: 'Crimen y castigo' },
  { titulo: 'Orgullo y prejuicio', autor: 'Jane Austen', anio: '1813', texto: 'Elizabeth Bennet y el señor Darcy se detestan con chispa: la comedia de costumbres más querida del idioma inglés.', wiki: 'Orgullo y prejuicio' },
  { titulo: 'La metamorfosis', autor: 'Franz Kafka', anio: '1915', texto: 'Gregor Samsa amanece convertido en un insecto monstruoso y su familia sigue desayunando: lo absurdo hecho literatura.', wiki: 'La metamorfosis' },
  { titulo: 'El amor en los tiempos del cólera', autor: 'Gabriel García Márquez', anio: '1985', texto: 'Florentino Ariza espera a Fermina Daza cincuenta y tres años: una historia sobre el amor que no caduca.', wiki: 'El amor en los tiempos del cólera' },
  { titulo: 'Ficciones', autor: 'Jorge Luis Borges', anio: '1944', texto: 'Bibliotecas infinitas, laberintos y autores apócrifos: los cuentos que cambiaron la manera de pensar la literatura.', wiki: 'Ficciones' },
  { titulo: 'La casa de los espíritus', autor: 'Isabel Allende', anio: '1982', texto: 'La saga de los Trueba entre fantasmas y política chilena: el debut deslumbrante de Isabel Allende.', wiki: 'La casa de los espíritus' },
  { titulo: 'Fahrenheit 451', autor: 'Ray Bradbury', anio: '1953', texto: 'Un bombero que quema libros empieza a leerlos: la advertencia de Bradbury contra un mundo sin lectura.', wiki: 'Fahrenheit 451' },
  { titulo: 'Un mundo feliz', autor: 'Aldous Huxley', anio: '1932', texto: 'Humanos fabricados en serie y felicidad química obligatoria: la otra gran distopía del siglo XX.', wiki: 'Un mundo feliz' },
  { titulo: 'El gran Gatsby', autor: 'F. Scott Fitzgerald', anio: '1925', texto: 'Fiestas deslumbrantes y una luz verde al otro lado de la bahía: el sueño americano y su reverso.', wiki: 'El gran Gatsby' },
  { titulo: 'Moby Dick', autor: 'Herman Melville', anio: '1851', texto: 'El capitán Ahab persigue a la ballena blanca hasta el fin del mundo: la obsesión como epopeya marina.', wiki: 'Moby Dick' },
  { titulo: 'Guerra y paz', autor: 'León Tolstói', anio: '1869', texto: 'Familias rusas atravesadas por las guerras napoleónicas: la novela río por excelencia.', wiki: 'Guerra y paz' },
  { titulo: 'Ana Karenina', autor: 'León Tolstói', anio: '1877', texto: '"Todas las familias felices se parecen": el arranque más famoso de la literatura abre esta tragedia del amor prohibido.', wiki: 'Ana Karenina' },
  { titulo: 'Madame Bovary', autor: 'Gustave Flaubert', anio: '1857', texto: 'Emma Bovary busca en la vida las pasiones de sus novelas: el retrato implacable del deseo insatisfecho.', wiki: 'Madame Bovary' },
  { titulo: 'El extranjero', autor: 'Albert Camus', anio: '1942', texto: 'Meursault no llora en el funeral de su madre y el mundo se lo cobra: el absurdo según Camus.', wiki: 'El extranjero (novela)' },
  { titulo: 'La Odisea', autor: 'Homero', anio: 's. VIII a. C.', texto: 'Diez años de sirenas, cíclopes y tempestades para volver a Ítaca: el viaje que inauguró todos los viajes.', wiki: 'Odisea' },
  { titulo: 'La divina comedia', autor: 'Dante Alighieri', anio: 'c. 1320', texto: 'Dante recorre infierno, purgatorio y paraíso guiado por Virgilio: la catedral poética de la Edad Media.', wiki: 'Divina comedia' },
  { titulo: 'Hamlet', autor: 'William Shakespeare', anio: 'c. 1601', texto: 'Un príncipe, un fantasma y la duda más célebre del teatro: ser o no ser.', wiki: 'Hamlet' },
  { titulo: 'El túnel', autor: 'Ernesto Sabato', anio: '1948', texto: 'El pintor Juan Pablo Castel confiesa un crimen pasional: la obsesión narrada desde dentro.', wiki: 'El túnel' },
  { titulo: 'Ensayo sobre la ceguera', autor: 'José Saramago', anio: '1995', texto: 'Una epidemia de ceguera blanca desnuda la fragilidad de la civilización: Saramago en estado puro.', wiki: 'Ensayo sobre la ceguera' },
  { titulo: 'Crónica de una muerte anunciada', autor: 'Gabriel García Márquez', anio: '1981', texto: 'Todo el pueblo sabe que van a matar a Santiago Nasar y nadie lo evita: la fatalidad contada como crónica.', wiki: 'Crónica de una muerte anunciada' },
  { titulo: 'Los detectives salvajes', autor: 'Roberto Bolaño', anio: '1998', texto: 'Dos poetas persiguen a una escritora perdida durante veinte años y tres continentes: la novela de culto latinoamericana.', wiki: 'Los detectives salvajes' },
  { titulo: 'El Aleph', autor: 'Jorge Luis Borges', anio: '1949', texto: 'Un punto del sótano donde caben todos los lugares del universo: Borges condensa el infinito en un cuento.', wiki: 'El Aleph' },
  { titulo: 'Como agua para chocolate', autor: 'Laura Esquivel', anio: '1989', texto: 'Tita cocina sus emociones y quien prueba sus platillos las siente: recetas, amor y revolución.', wiki: 'Como agua para chocolate' },
  { titulo: 'La sombra del viento', autor: 'Carlos Ruiz Zafón', anio: '2001', texto: 'Un niño elige un libro en el Cementerio de los Libros Olvidados y hereda un misterio: Barcelona gótica y literaria.', wiki: 'La sombra del viento' },
  { titulo: 'Drácula', autor: 'Bram Stoker', anio: '1897', texto: 'Cartas y diarios reconstruyen la llegada del conde a Londres: el vampiro que fundó un género.', wiki: 'Drácula' },
  { titulo: 'Frankenstein', autor: 'Mary Shelley', anio: '1818', texto: 'Un científico da vida a una criatura y la abandona: la primera gran novela de ciencia ficción, escrita a los 20 años.', wiki: 'Frankenstein o el moderno Prometeo' },
  { titulo: 'El señor de los anillos', autor: 'J. R. R. Tolkien', anio: '1954', texto: 'Un anillo para gobernarlos a todos y una comunidad dispuesta a destruirlo: la épica fundacional de la fantasía moderna.', wiki: 'El Señor de los Anillos' },
  { titulo: 'Matar a un ruiseñor', autor: 'Harper Lee', anio: '1960', texto: 'Scout mira a su padre defender a un inocente en el sur segregado: una lección de coraje contada por una niña.', wiki: 'Matar a un ruiseñor' },
  { titulo: 'En busca del tiempo perdido', autor: 'Marcel Proust', anio: '1913', texto: 'Una magdalena mojada en té abre la memoria involuntaria: siete tomos para recuperar el tiempo.', wiki: 'En busca del tiempo perdido' },
  { titulo: 'Ulises', autor: 'James Joyce', anio: '1922', texto: 'Un día entero de Leopold Bloom por Dublín: la odisea cotidiana que revolucionó la narrativa.', wiki: 'Ulises (novela)' },
  { titulo: 'Poeta en Nueva York', autor: 'Federico García Lorca', anio: '1940', texto: 'Lorca frente a la ciudad deshumanizada: surrealismo, denuncia y algunos de sus versos más desgarrados.', wiki: 'Poeta en Nueva York' },
  { titulo: 'Veinte poemas de amor y una canción desesperada', autor: 'Pablo Neruda', anio: '1924', texto: '"Puedo escribir los versos más tristes esta noche": el poemario juvenil más leído del idioma.', wiki: 'Veinte poemas de amor y una canción desesperada' },
  { titulo: 'El llano en llamas', autor: 'Juan Rulfo', anio: '1953', texto: 'Diecisiete cuentos del campo mexicano, secos y perfectos: el otro pilar de la breve obra de Rulfo.', wiki: 'El llano en llamas' },
  { titulo: 'Sapiens: De animales a dioses', autor: 'Yuval Noah Harari', anio: '2011', texto: 'La historia de la humanidad contada como gran relato: de cazadores-recolectores a dioses tecnológicos.', wiki: 'Sapiens: De animales a dioses' },
]

const PALABRAS: Palabra[] = [
  { palabra: 'Serendipia', clase: 'sustantivo', definicion: 'Hallazgo valioso que se produce de manera accidental o casual.', origen: 'Del inglés serendipity, que acuñó Horace Walpole en 1754 inspirado en el cuento persa «Los tres príncipes de Serendip», antiguo nombre de Sri Lanka, cuyos protagonistas descubrían por azar lo que no buscaban.', ejemplo: 'Descubrir ese café escondido fue pura serendipia.' },
  { palabra: 'Petricor', clase: 'sustantivo', definicion: 'Olor que produce la lluvia al caer sobre suelos secos.', origen: 'Del griego petra (piedra) e ichor (la sangre que, según los mitos, corría por las venas de los dioses); la acuñaron dos geólogos australianos en 1964.', ejemplo: 'Abrió la ventana para dejar entrar el petricor de la tarde.' },
  { palabra: 'Inefable', clase: 'adjetivo', definicion: 'Que no se puede explicar con palabras.', origen: 'Del latín ineffabilis: el prefijo in- (no) unido a effari (expresar, decir); literalmente, «lo que no puede ser dicho».', ejemplo: 'Sintió una alegría inefable al verlo llegar.' },
  { palabra: 'Efímero', clase: 'adjetivo', definicion: 'Que dura poco tiempo; pasajero, de corta duración.', origen: 'Del griego ephémeros, «que dura un solo día» (epi, sobre, y heméra, día); se decía de las flores e insectos que nacen y mueren en una jornada.', ejemplo: 'La belleza de los cerezos en flor es efímera.' },
  { palabra: 'Resiliencia', clase: 'sustantivo', definicion: 'Capacidad de adaptación y recuperación frente a la adversidad.', origen: 'Del latín resilire, «saltar hacia atrás, rebotar»; nació en la física de materiales y saltó a la psicología para nombrar la fuerza de recomponerse.', ejemplo: 'Su resiliencia la llevó a reconstruirlo todo desde cero.' },
  { palabra: 'Melifluo', clase: 'adjetivo', definicion: 'Dulce, suave y delicado, generalmente referido a la voz o al habla.', origen: 'Del latín mellifluus, «que mana miel», de mel (miel) y fluere (fluir).', ejemplo: 'La narradora tenía un tono melifluo que arrullaba.' },
  { palabra: 'Ataraxia', clase: 'sustantivo', definicion: 'Serenidad y ausencia de inquietud del ánimo.', origen: 'Del griego ataraxía, «ausencia de perturbación»; fue el ideal de calma imperturbable que perseguían estoicos y epicúreos.', ejemplo: 'Meditaba cada mañana buscando la ataraxia de los estoicos.' },
  { palabra: 'Bonhomía', clase: 'sustantivo', definicion: 'Afabilidad, sencillez y honradez en el carácter.', origen: 'Del francés bonhomie, derivado de bonhomme, «buen hombre».', ejemplo: 'Su bonhomía desarmaba hasta al más desconfiado.' },
  { palabra: 'Inmarcesible', clase: 'adjetivo', definicion: 'Que no se puede marchitar.', origen: 'Del latín marcescere (marchitarse) con el prefijo negativo in-; se usa a menudo en sentido figurado para lo que no envejece ni se apaga.', ejemplo: 'Guardaba un recuerdo inmarcesible de aquel verano.' },
  { palabra: 'Alba', clase: 'sustantivo', definicion: 'Primera luz del día antes de salir el sol.', origen: 'Del latín alba, femenino de albus, «blanco»: la claridad blanquecina que precede al amanecer.', ejemplo: 'Salieron a caminar al alba, cuando la ciudad aún dormía.' },
  { palabra: 'Crepúsculo', clase: 'sustantivo', definicion: 'Claridad que hay al amanecer o al anochecer.', origen: 'Del latín crepusculum, diminutivo de creper, «oscuro, incierto»; nombra esa luz ambigua entre el día y la noche.', ejemplo: 'El crepúsculo tiñó de naranja los tejados.' },
  { palabra: 'Duende', clase: 'sustantivo', definicion: 'Encanto misterioso e inefable, especialmente en el arte flamenco.', origen: 'Contracción de «duen de casa» (dueño de la casa): originalmente el espíritu travieso que habitaba los hogares.', ejemplo: 'Esa cantaora tiene duende: eriza la piel.' },
  { palabra: 'Sobremesa', clase: 'sustantivo', definicion: 'Tiempo que se permanece en la mesa conversando después de comer.', origen: 'Palabra compuesta del español, de sobre y mesa; nombra una costumbre tan hispana que otros idiomas no tienen término equivalente.', ejemplo: 'La sobremesa se alargó hasta que anocheció.' },
  { palabra: 'Madrugar', clase: 'verbo', definicion: 'Levantarse muy temprano, al amanecer o antes.', origen: 'Del latín vulgar maturicare, de maturus, «maduro, a su debido tiempo»: hacer algo a tiempo, temprano.', ejemplo: 'Le gusta madrugar para escribir en silencio.' },
  { palabra: 'Apapachar', clase: 'verbo', definicion: 'Dar cariño con abrazos y mimos; consentir.', origen: 'Del náhuatl papatzoa, «ablandar»; en México se interpreta poéticamente como «acariciar el alma».', ejemplo: 'Cuando está triste solo quiere que la apapachen.' },
  { palabra: 'Quimera', clase: 'sustantivo', definicion: 'Aquello que se propone a la imaginación como posible, pero no lo es.', origen: 'Del griego Chímaira, monstruo mitológico con cabeza de león, cuerpo de cabra y cola de serpiente; de lo imposible del ser pasó a nombrar la ilusión imposible.', ejemplo: 'Vivir de la lotería es una quimera.' },
  { palabra: 'Utopía', clase: 'sustantivo', definicion: 'Plan o proyecto ideal, atractivo pero irrealizable en el momento.', origen: 'La acuñó Tomás Moro en 1516 para su isla imaginaria, del griego ou-tópos, «no lugar» o «lugar que no existe».', ejemplo: 'Sirve la utopía: sirve para caminar, decía Galeano.' },
  { palabra: 'Epifanía', clase: 'sustantivo', definicion: 'Manifestación o revelación repentina que hace comprender algo.', origen: 'Del griego epipháneia, «manifestación, aparición súbita»; de uso religioso pasó a nombrar cualquier iluminación inesperada.', ejemplo: 'Tuvo una epifanía y reescribió el final de su novela.' },
  { palabra: 'Perspicaz', clase: 'adjetivo', definicion: 'Que percibe y comprende las cosas con agudeza y rapidez.', origen: 'Del latín perspicax, de perspicere, «mirar a través, ver con claridad».', ejemplo: 'Una lectora perspicaz notó la pista escondida en el primer capítulo.' },
  { palabra: 'Taciturno', clase: 'adjetivo', definicion: 'Callado, silencioso; triste o apesadumbrado.', origen: 'Del latín taciturnus, derivado de tacere, «callar».', ejemplo: 'Volvió taciturno del viaje y nadie supo por qué.' },
  { palabra: 'Vehemente', clase: 'adjetivo', definicion: 'Que actúa o se expresa con ímpetu y pasión.', origen: 'Del latín vehemens, «impetuoso, arrebatado»; se aplica a quien pone toda su fuerza en lo que siente o dice.', ejemplo: 'Defendió su idea con un discurso vehemente.' },
  { palabra: 'Idiosincrasia', clase: 'sustantivo', definicion: 'Rasgos y carácter distintivos de una persona o colectividad.', origen: 'Del griego ídios (propio) y synkrasis (temperamento, mezcla de los humores del cuerpo).', ejemplo: 'La sobremesa larga es parte de nuestra idiosincrasia.' },
  { palabra: 'Parsimonia', clase: 'sustantivo', definicion: 'Lentitud y calma exageradas en el modo de actuar.', origen: 'Del latín parsimonia, «ahorro, moderación», de parcere, «economizar»; de la mesura en el gasto pasó a la del ritmo.', ejemplo: 'Preparó el té con una parsimonia casi ceremonial.' },
  { palabra: 'Altruismo', clase: 'sustantivo', definicion: 'Diligencia en procurar el bien ajeno aun a costa del propio.', origen: 'Del francés altruisme, que acuñó el filósofo Auguste Comte a partir de autrui, «el otro», como opuesto al egoísmo.', ejemplo: 'Donó la recompensa completa: puro altruismo.' },
  { palabra: 'Empatía', clase: 'sustantivo', definicion: 'Capacidad de identificarse con alguien y compartir sus sentimientos.', origen: 'Del griego empátheia (en, dentro, y pathos, sentimiento); es un calco del alemán Einfühlung, «sentir dentro de».', ejemplo: 'Escuchó sin juzgar, con una empatía que la reconfortó.' },
  { palabra: 'Nostalgia', clase: 'sustantivo', definicion: 'Pena de verse ausente de lo querido; tristeza melancólica por el pasado.', origen: 'Del griego nóstos (regreso) y álgos (dolor); la acuñó en 1688 el médico Johannes Hofer para nombrar el mal de los soldados que añoraban su hogar.', ejemplo: 'El olor a pan recién hecho le dio nostalgia de su abuela.' },
  { palabra: 'Etéreo', clase: 'adjetivo', definicion: 'Sutil, vago, sublime; que parece no ser de este mundo.', origen: 'Del griego aithér, la región superior y purísima del aire donde, según los antiguos, moraban los dioses.', ejemplo: 'La niebla le daba al bosque un aire etéreo.' },
  { palabra: 'Arrebol', clase: 'sustantivo', definicion: 'Color rojo de las nubes iluminadas por el sol.', origen: 'Del latín rubor, «rojez, rubor»; nombra el sonrojo del cielo al amanecer o al atardecer.', ejemplo: 'El arrebol del atardecer incendiaba el horizonte.' },
  { palabra: 'Oxímoron', clase: 'sustantivo', definicion: 'Combinación de dos palabras de significado opuesto ("silencio atronador").', origen: 'Del griego oxys (agudo) y morós (necio): la propia palabra es un oxímoron, pues une lo ingenioso y lo tonto.', ejemplo: '"Instante eterno" es su oxímoron favorito.' },
  { palabra: 'Palíndromo', clase: 'sustantivo', definicion: 'Palabra o frase que se lee igual de izquierda a derecha que al revés.', origen: 'Del griego pálin (de nuevo) y drómos (carrera): «que corre de vuelta» hacia el punto de partida.', ejemplo: '"Anita lava la tina" es el palíndromo clásico.' },
  { palabra: 'Onomatopeya', clase: 'sustantivo', definicion: 'Palabra que imita el sonido de aquello que nombra.', origen: 'Del griego ónoma (nombre) y poiein (hacer): «crear un nombre» a partir del sonido de la cosa.', ejemplo: '"Susurro" es casi una onomatopeya: suena a lo que significa.' },
  { palabra: 'Luminiscencia', clase: 'sustantivo', definicion: 'Emisión de luz que no procede del calor.', origen: 'Del latín lumen (luz) con el sufijo -escencia, que indica un proceso en marcha; la luz fría de las luciérnagas o el plancton.', ejemplo: 'La luminiscencia del plancton pintaba de azul la orilla.' },
  { palabra: 'Recoveco', clase: 'sustantivo', definicion: 'Vuelta o rincón escondido; sitio apartado y sinuoso.', origen: 'Voz castellana que evoca una vuelta o comba que oculta un rincón; se usa también en sentido figurado para los pliegues del alma o de un asunto enredado.', ejemplo: 'Conocía cada recoveco del barrio viejo.' },
  { palabra: 'Zaguán', clase: 'sustantivo', definicion: 'Espacio cubierto dentro de una casa que sirve de entrada.', origen: 'Del árabe hispánico istawán, y este del griego stoá, «pórtico»: el umbral techado entre la calle y el hogar.', ejemplo: 'Dejaron las bicis en el zaguán y entraron corriendo.' },
  { palabra: 'Vislumbrar', clase: 'verbo', definicion: 'Ver algo tenue o confusamente; conjeturar por leves indicios.', origen: 'Del latín vix (apenas) y luminare (iluminar): «iluminar apenas», ver algo entre sombras.', ejemplo: 'Entre la bruma vislumbró la silueta del faro.' },
  { palabra: 'Añoranza', clase: 'sustantivo', definicion: 'Nostalgia o recuerdo teñido de tristeza por algo o alguien ausente.', origen: 'Del catalán enyorança, y esta del latín ignorare, «no saber»: el dolor de no tener noticia de quien se quiere.', ejemplo: 'Hablaba de su pueblo con añoranza.' },
  { palabra: 'Pléyade', clase: 'sustantivo', definicion: 'Grupo de personas señaladas, especialmente en letras o artes, de una misma época.', origen: 'De las Pléyades, las siete hijas de Atlas que la mitología convirtió en estrellas; nombró luego a grupos de poetas notables.', ejemplo: 'Perteneció a la pléyade de poetas del 27.' },
  { palabra: 'Alborada', clase: 'sustantivo', definicion: 'Tiempo de amanecer; música o canto al romper el día.', origen: 'Derivada de alba (amanecer); en la poesía tradicional era la canción de los amantes que se despedían al clarear.', ejemplo: 'Los pájaros anunciaron la alborada.' },
  { palabra: 'Cavilar', clase: 'verbo', definicion: 'Pensar en algo con intención o profundidad, dándole vueltas.', origen: 'Del latín cavillari, «razonar con sutileza, bromear»; hoy nombra el pensar insistente que no suelta una idea.', ejemplo: 'Se quedó cavilando la propuesta toda la noche.' },
  { palabra: 'Desasosiego', clase: 'sustantivo', definicion: 'Falta de tranquilidad o de sosiego; inquietud interior.', origen: 'Del prefijo des- (negación) y sosiego (calma), de sosegar; Fernando Pessoa lo hizo célebre con su «Libro del desasosiego».', ejemplo: 'La espera del resultado le producía desasosiego.' },
]

const FRASES: Frase[] = [
  { cita: 'La vida no es la que uno vivió, sino la que uno recuerda y cómo la recuerda para contarla.', autor: 'Gabriel García Márquez', wiki: 'Gabriel García Márquez' },
  { cita: 'El que lee mucho y anda mucho, ve mucho y sabe mucho.', autor: 'Miguel de Cervantes', wiki: 'Miguel de Cervantes' },
  { cita: 'Siempre imaginé que el paraíso sería algún tipo de biblioteca.', autor: 'Jorge Luis Borges', wiki: 'Jorge Luis Borges' },
  { cita: 'Pies, ¿para qué los quiero si tengo alas para volar?', autor: 'Frida Kahlo', wiki: 'Frida Kahlo' },
  { cita: 'La imaginación es más importante que el conocimiento.', autor: 'Albert Einstein', wiki: 'Albert Einstein' },
  { cita: 'Nada en la vida debe ser temido, solamente comprendido.', autor: 'Marie Curie', wiki: 'Marie Curie' },
  { cita: 'Solo sé que no sé nada.', autor: 'Sócrates', wiki: 'Sócrates' },
  { cita: 'Somos lo que hacemos repetidamente. La excelencia, entonces, no es un acto, sino un hábito.', autor: 'Aristóteles', wiki: 'Aristóteles' },
  { cita: 'No es que tengamos poco tiempo, sino que perdemos mucho.', autor: 'Séneca', wiki: 'Séneca' },
  { cita: 'La felicidad de tu vida depende de la calidad de tus pensamientos.', autor: 'Marco Aurelio', wiki: 'Marco Aurelio' },
  { cita: 'Elige un trabajo que ames y no tendrás que trabajar ni un día de tu vida.', autor: 'Confucio', wiki: 'Confucio' },
  { cita: 'Sé el cambio que quieres ver en el mundo.', autor: 'Mahatma Gandhi', wiki: 'Mahatma Gandhi' },
  { cita: 'Siempre parece imposible hasta que se hace.', autor: 'Nelson Mandela', wiki: 'Nelson Mandela' },
  { cita: 'Da tu primer paso con fe. No es necesario que veas toda la escalera completa.', autor: 'Martin Luther King', wiki: 'Martin Luther King Jr.' },
  { cita: 'La mejor manera de predecir el futuro es inventarlo.', autor: 'Alan Kay', wiki: 'Alan Kay' },
  { cita: 'Si puedes soñarlo, puedes hacerlo.', autor: 'Walt Disney', wiki: 'Walt Disney' },
  { cita: 'Nadie puede hacerte sentir inferior sin tu consentimiento.', autor: 'Eleanor Roosevelt', wiki: 'Eleanor Roosevelt' },
  { cita: 'No se nace mujer: se llega a serlo.', autor: 'Simone de Beauvoir', wiki: 'Simone de Beauvoir' },
  { cita: 'No hay barrera, cerradura ni cerrojo que puedas imponer a la libertad de mi mente.', autor: 'Virginia Woolf', wiki: 'Virginia Woolf' },
  { cita: 'El secreto para salir adelante es comenzar.', autor: 'Mark Twain', wiki: 'Mark Twain' },
  { cita: 'Sé tú mismo; los demás puestos están ocupados.', autor: 'Oscar Wilde', wiki: 'Oscar Wilde' },
  { cita: 'Solo se ve bien con el corazón; lo esencial es invisible a los ojos.', autor: 'Antoine de Saint-Exupéry', wiki: 'Antoine de Saint-Exupéry' },
  { cita: 'Entre los individuos, como entre las naciones, el respeto al derecho ajeno es la paz.', autor: 'Benito Juárez', wiki: 'Benito Juárez' },
  { cita: 'La patria es ara, no pedestal.', autor: 'José Martí', wiki: 'José Martí' },
  { cita: 'Caminante, no hay camino: se hace camino al andar.', autor: 'Antonio Machado', wiki: 'Antonio Machado' },
  { cita: 'La poesía es el sentimiento que le sobra al corazón y te sale por la mano.', autor: 'Federico García Lorca', wiki: 'Federico García Lorca' },
  { cita: 'Andábamos sin buscarnos, pero sabiendo que andábamos para encontrarnos.', autor: 'Julio Cortázar', wiki: 'Julio Cortázar' },
  { cita: 'Escribe lo que no debe ser olvidado.', autor: 'Isabel Allende', wiki: 'Isabel Allende' },
  { cita: 'No te rindas, por favor no cedas, aunque el frío queme, aunque el miedo muerda.', autor: 'Mario Benedetti', wiki: 'Mario Benedetti' },
  { cita: 'Mucha gente pequeña, en lugares pequeños, haciendo cosas pequeñas, puede cambiar el mundo.', autor: 'Eduardo Galeano', wiki: 'Eduardo Galeano' },
  { cita: 'La simplicidad es la máxima sofisticación.', autor: 'Leonardo da Vinci', wiki: 'Leonardo da Vinci' },
  { cita: 'Yo sueño mi pintura y pinto mi sueño.', autor: 'Vincent van Gogh', wiki: 'Vincent van Gogh' },
  { cita: 'Todo lo que puedes imaginar es real.', autor: 'Pablo Picasso', wiki: 'Pablo Picasso' },
  { cita: 'La música es una revelación mayor que toda la sabiduría y la filosofía.', autor: 'Ludwig van Beethoven', wiki: 'Ludwig van Beethoven' },
  { cita: 'El presente es de ellos; el futuro, por el que realmente he trabajado, es mío.', autor: 'Nikola Tesla', wiki: 'Nikola Tesla' },
  { cita: 'Somos polvo de estrellas que piensa acerca de las estrellas.', autor: 'Carl Sagan', wiki: 'Carl Sagan' },
  { cita: 'Lo que sabemos es una gota de agua; lo que ignoramos es el océano.', autor: 'Isaac Newton', wiki: 'Isaac Newton' },
  { cita: 'Hay una fuerza motriz más poderosa que el vapor, la electricidad y la energía atómica: la voluntad.', autor: 'Albert Einstein', wiki: 'Albert Einstein' },
  { cita: 'Detrás de cada logro hay otro desafío.', autor: 'Teresa de Calcuta', wiki: 'Teresa de Calcuta' },
  { cita: 'Hasta que no estés comprometido, hay vacilación, la posibilidad de retroceder.', autor: 'Johann Wolfgang von Goethe', wiki: 'Johann Wolfgang von Goethe' },
]

/**
 * Versión inglesa del catálogo: MISMO ORDEN e índice que los arrays de arriba.
 * De obras y libros solo hace falta el título del artículo en Wikipedia EN (el
 * párrafo sale de su `extract`, no se traduce la glosa); el artista o el autor
 * se repite únicamente cuando cambia de nombre en inglés.
 */
const OBRAS_EN: { wiki: string; artista?: string }[] = [
  { wiki: 'The Starry Night' },
  { wiki: 'Las Meninas' },
  { wiki: 'Mona Lisa' },
  { wiki: 'The Scream' },
  { wiki: 'Guernica (Picasso)' },
  { wiki: 'The Persistence of Memory' },
  { wiki: 'The Birth of Venus' },
  { wiki: 'Girl with a Pearl Earring' },
  { wiki: 'The Last Supper (Leonardo)' },
  { wiki: 'The Creation of Adam', artista: 'Michelangelo' },
  { wiki: 'The Kiss (Klimt)' },
  { wiki: 'The Two Fridas' },
  { wiki: 'The Garden of Earthly Delights', artista: 'Hieronymus Bosch' },
  { wiki: 'Liberty Leading the People' },
  { wiki: 'Impression, Sunrise' },
  { wiki: 'The Night Watch' },
  { wiki: 'The Third of May 1808', artista: 'Francisco Goya' },
  { wiki: 'Saturn Devouring His Son', artista: 'Francisco Goya' },
  { wiki: 'The Great Wave off Kanagawa' },
  { wiki: 'Nighthawks (Hopper)' },
  { wiki: 'American Gothic' },
  { wiki: 'The Son of Man' },
  { wiki: 'The Milkmaid (Vermeer)' },
  { wiki: 'Wanderer above the Sea of Fog' },
  { wiki: 'The Raft of the Medusa' },
  { wiki: 'Bal du moulin de la Galette' },
  { wiki: 'A Sunday Afternoon on the Island of La Grande Jatte' },
  { wiki: 'The Card Players' },
  { wiki: 'Self-Portrait with Bandaged Ear' },
  { wiki: 'Luncheon of the Boating Party' },
  { wiki: "Les Demoiselles d'Avignon" },
  { wiki: 'Dance (Matisse)' },
  { wiki: 'Starry Night Over the Rhône' },
  { wiki: 'Arnolfini Portrait', artista: 'Jan van Eyck' },
  { wiki: 'The School of Athens', artista: 'Raphael' },
  { wiki: 'Ophelia (Millais)' },
  { wiki: 'The Swing (Fragonard)' },
  { wiki: 'Judith Slaying Holofernes (Artemisia Gentileschi, Florence)' },
  { wiki: 'Wheatfield with Crows' },
  { wiki: 'The Tower of Babel (Bruegel)', artista: 'Pieter Bruegel the Elder' },
]

const LIBROS_EN: { wiki: string; autor?: string }[] = [
  { wiki: 'Don Quixote' },
  { wiki: 'One Hundred Years of Solitude' },
  { wiki: 'Pedro Páramo' },
  { wiki: 'Hopscotch (Cortázar novel)' },
  { wiki: 'Nineteen Eighty-Four' },
  { wiki: 'The Little Prince' },
  { wiki: 'Crime and Punishment', autor: 'Fyodor Dostoevsky' },
  { wiki: 'Pride and Prejudice' },
  { wiki: 'The Metamorphosis' },
  { wiki: 'Love in the Time of Cholera' },
  { wiki: 'Ficciones' },
  { wiki: 'The House of the Spirits' },
  { wiki: 'Fahrenheit 451' },
  { wiki: 'Brave New World' },
  { wiki: 'The Great Gatsby' },
  { wiki: 'Moby-Dick' },
  { wiki: 'War and Peace', autor: 'Leo Tolstoy' },
  { wiki: 'Anna Karenina', autor: 'Leo Tolstoy' },
  { wiki: 'Madame Bovary' },
  { wiki: 'The Stranger (Camus novel)' },
  { wiki: 'Odyssey', autor: 'Homer' },
  { wiki: 'Divine Comedy' },
  { wiki: 'Hamlet' },
  { wiki: 'The Tunnel (Sabato novel)' },
  { wiki: 'Blindness (novel)' },
  { wiki: 'Chronicle of a Death Foretold' },
  { wiki: 'The Savage Detectives' },
  { wiki: 'The Aleph and Other Stories' },
  { wiki: 'Like Water for Chocolate (novel)' },
  { wiki: 'The Shadow of the Wind' },
  { wiki: 'Dracula' },
  { wiki: 'Frankenstein' },
  { wiki: 'The Lord of the Rings' },
  { wiki: 'To Kill a Mockingbird' },
  { wiki: 'In Search of Lost Time' },
  { wiki: 'Ulysses (novel)' },
  { wiki: 'Poet in New York' },
  { wiki: 'Twenty Love Poems and a Song of Despair' },
  { wiki: 'The Burning Plain' },
  { wiki: 'Sapiens: A Brief History of Humankind' },
]

const PALABRAS_EN: Palabra[] = [
  { palabra: 'Serendipity', clase: 'noun', definicion: 'A valuable find that happens by accident, while looking for something else.', origen: 'Coined by Horace Walpole in 1754 after the Persian tale “The Three Princes of Serendip” —the old name of Sri Lanka— whose heroes kept discovering by chance what they were not looking for.', ejemplo: 'Finding that hidden café was pure serendipity.' },
  { palabra: 'Petrichor', clase: 'noun', definicion: 'The earthy scent that rain releases when it falls on dry ground.', origen: 'From the Greek petra (stone) and ichor (the fluid said to run through the veins of the gods); coined by two Australian geologists in 1964.', ejemplo: 'She opened the window to let the afternoon petrichor in.' },
  { palabra: 'Ineffable', clase: 'adjective', definicion: 'Too great or too beautiful to be put into words.', origen: 'From the Latin ineffabilis: in- (not) joined to effari (to utter); literally, what cannot be said.', ejemplo: 'He felt an ineffable joy when she walked in.' },
  { palabra: 'Ephemeral', clase: 'adjective', definicion: 'Lasting a very short time; fleeting.', origen: 'From the Greek ephemeros, “lasting only a day” (epi, upon, and hemera, day); it described flowers and insects born and gone within one turn of the sun.', ejemplo: 'The beauty of cherry blossom is ephemeral.' },
  { palabra: 'Resilience', clase: 'noun', definicion: 'The ability to adapt and bounce back in the face of adversity.', origen: 'From the Latin resilire, “to leap back”; it began in the physics of materials and jumped to psychology to name the strength of putting oneself back together.', ejemplo: 'Her resilience let her rebuild everything from scratch.' },
  { palabra: 'Mellifluous', clase: 'adjective', definicion: 'Sweet and smooth to hear, usually said of a voice.', origen: 'From the Latin mellifluus, “flowing with honey”, from mel (honey) and fluere (to flow).', ejemplo: 'The narrator had a mellifluous tone that lulled you to sleep.' },
  { palabra: 'Ataraxia', clase: 'noun', definicion: 'Serenity; a mind untroubled by worry.', origen: 'From the Greek ataraxia, “absence of disturbance”: the unshakeable calm pursued by Stoics and Epicureans.', ejemplo: 'He meditated each morning seeking the ataraxia of the Stoics.' },
  { palabra: 'Bonhomie', clase: 'noun', definicion: 'Good-natured friendliness and easy warmth of character.', origen: 'From the French bonhomie, derived from bonhomme, “good fellow”.', ejemplo: 'His bonhomie disarmed even the most suspicious.' },
  { palabra: 'Evanescent', clase: 'adjective', definicion: 'Vanishing almost as soon as it appears; barely there.', origen: 'From the Latin evanescere, “to vanish”, from ex- (out) and vanus (empty).', ejemplo: 'An evanescent smile crossed her face.' },
  { palabra: 'Aurora', clase: 'noun', definicion: 'The first light of morning; also the polar lights.', origen: 'From Aurora, the Roman goddess of dawn, who opened the gates of the sky for the sun each day.', ejemplo: 'They set out at the first aurora, when the city was still asleep.' },
  { palabra: 'Gloaming', clase: 'noun', definicion: 'The soft light of dusk, just after sunset.', origen: 'From the Old English glōmung, related to glow: the last glimmer of the day.', ejemplo: 'The gloaming turned the rooftops orange.' },
  { palabra: 'Halcyon', clase: 'adjective', definicion: 'Calm, peaceful and happy; said of a golden stretch of time.', origen: 'From the Greek halkyon (kingfisher): the ancients believed the bird nested at sea and stilled the winter waves for two weeks.', ejemplo: 'She still talks about the halcyon days of that summer.' },
  { palabra: 'Conviviality', clase: 'noun', definicion: 'The warmth of eating, drinking and talking together without hurry.', origen: 'From the Latin convivium (banquet), from con- (with) and vivere (to live): to live alongside others at the table.', ejemplo: 'The conviviality stretched on until it grew dark.' },
  { palabra: 'Matutinal', clase: 'adjective', definicion: 'Belonging to the early morning; happening at daybreak.', origen: 'From the Latin matutinus, from Matuta, the Roman goddess of the morning.', ejemplo: 'He keeps a matutinal habit of writing before anyone wakes.' },
  { palabra: 'Solace', clase: 'noun', definicion: 'Comfort given to someone in sorrow or distress.', origen: 'From the Latin solacium, from solari, “to console”.', ejemplo: 'She found solace in the company of her friends.' },
  { palabra: 'Chimera', clase: 'noun', definicion: 'Something imagined as possible that in truth is not.', origen: 'From the Greek Chimaira, the mythological monster with the head of a lion, the body of a goat and the tail of a serpent; from an impossible beast it came to name an impossible hope.', ejemplo: 'Living off the lottery is a chimera.' },
  { palabra: 'Utopia', clase: 'noun', definicion: 'An ideal plan or place, appealing but out of reach for now.', origen: 'Coined by Thomas More in 1516 for his imaginary island, from the Greek ou-topos, “no place”.', ejemplo: 'Utopia is useful: it keeps us walking, said Galeano.' },
  { palabra: 'Epiphany', clase: 'noun', definicion: 'A sudden realisation that makes everything fall into place.', origen: 'From the Greek epiphaneia, “a sudden appearance”; from religious use it came to name any unexpected flash of understanding.', ejemplo: 'She had an epiphany and rewrote the ending of her novel.' },
  { palabra: 'Perspicacious', clase: 'adjective', definicion: 'Quick to notice and understand what others miss.', origen: 'From the Latin perspicax, from perspicere, “to see through clearly”.', ejemplo: 'A perspicacious reader spotted the clue in the first chapter.' },
  { palabra: 'Taciturn', clase: 'adjective', definicion: 'Saying very little; reserved to the point of silence.', origen: 'From the Latin taciturnus, derived from tacere, “to be silent”.', ejemplo: 'He came back taciturn from the trip and nobody knew why.' },
  { palabra: 'Vehement', clase: 'adjective', definicion: 'Acting or speaking with great force and passion.', origen: 'From the Latin vehemens, “impetuous, carried away”: putting all one’s strength into what one feels or says.', ejemplo: 'He defended his idea in a vehement speech.' },
  { palabra: 'Idiosyncrasy', clase: 'noun', definicion: 'The distinctive traits that make a person or a people themselves.', origen: 'From the Greek idios (one’s own) and synkrasis (temperament, the mixture of the body’s humours).', ejemplo: 'The long lunch is part of our idiosyncrasy.' },
  { palabra: 'Parsimony', clase: 'noun', definicion: 'Extreme restraint in spending — or in the pace of doing anything.', origen: 'From the Latin parsimonia, “thrift”, from parcere, “to spare”.', ejemplo: 'He made the tea with an almost ceremonial parsimony.' },
  { palabra: 'Altruism', clase: 'noun', definicion: 'Care for the good of others, even at one’s own cost.', origen: 'From the French altruisme, coined by the philosopher Auguste Comte from autrui, “other people”, as the opposite of egoism.', ejemplo: 'He gave away the whole reward: pure altruism.' },
  { palabra: 'Empathy', clase: 'noun', definicion: 'The ability to step into someone else’s feelings and share them.', origen: 'From the Greek empatheia (en, in, and pathos, feeling); it is a calque of the German Einfühlung, “feeling into”.', ejemplo: 'She listened without judging, with an empathy that steadied him.' },
  { palabra: 'Nostalgia', clase: 'noun', definicion: 'A wistful ache for a place or a time now gone.', origen: 'From the Greek nostos (return) and algos (pain); coined in 1688 by the physician Johannes Hofer for the homesickness of soldiers far from home.', ejemplo: 'The smell of fresh bread filled him with nostalgia for his grandmother.' },
  { palabra: 'Ethereal', clase: 'adjective', definicion: 'So delicate and light that it seems not of this world.', origen: 'From the Greek aither, the pure upper region of the air where the ancients placed the gods.', ejemplo: 'The mist gave the woods an ethereal air.' },
  { palabra: 'Alpenglow', clase: 'noun', definicion: 'The rosy light that stains clouds and peaks at sunrise or sunset.', origen: 'A calque of the German Alpenglühen, “the glowing of the Alps”.', ejemplo: 'The alpenglow set the horizon on fire.' },
  { palabra: 'Oxymoron', clase: 'noun', definicion: 'Two words of opposite meaning put together ("deafening silence").', origen: 'From the Greek oxys (sharp) and moros (dull): the word is itself an oxymoron, joining the clever and the foolish.', ejemplo: '"Eternal instant" is her favourite oxymoron.' },
  { palabra: 'Palindrome', clase: 'noun', definicion: 'A word or phrase that reads the same backwards as forwards.', origen: 'From the Greek palin (again) and dromos (running): “running back” to where it started.', ejemplo: '"Never odd or even" is a classic palindrome.' },
  { palabra: 'Onomatopoeia', clase: 'noun', definicion: 'A word that imitates the sound of the thing it names.', origen: 'From the Greek onoma (name) and poiein (to make): “to make a name” out of a sound.', ejemplo: '"Whisper" is almost an onomatopoeia: it sounds like what it means.' },
  { palabra: 'Luminescence', clase: 'noun', definicion: 'Light given off without heat.', origen: 'From the Latin lumen (light) with the suffix -escence, marking a process under way: the cold light of fireflies and plankton.', ejemplo: 'The luminescence of the plankton painted the shore blue.' },
  { palabra: 'Nook', clase: 'noun', definicion: 'A small sheltered corner, tucked away from view.', origen: 'From the Middle English nok, “corner”; it survives in the pair “every nook and cranny”.', ejemplo: 'He knew every nook of the old quarter.' },
  { palabra: 'Vestibule', clase: 'noun', definicion: 'The covered entrance space between the street and the house.', origen: 'From the Latin vestibulum, the forecourt of a Roman house: the threshold between outside and home.', ejemplo: 'They left their bikes in the vestibule and ran inside.' },
  { palabra: 'Glimpse', clase: 'verb', definicion: 'To see something faintly or for an instant; to guess it from slight signs.', origen: 'From the Middle English glimsen, related to gleam: to catch a brief shine of something.', ejemplo: 'Through the haze he glimpsed the outline of the lighthouse.' },
  { palabra: 'Yearning', clase: 'noun', definicion: 'A tender, insistent longing for someone or something absent.', origen: 'From the Old English giernan, “to desire”: a wanting that stays even when nothing can be done about it.', ejemplo: 'He spoke of his village with yearning.' },
  { palabra: 'Pleiad', clase: 'noun', definicion: 'A brilliant group of people, especially in the arts, from one same age.', origen: 'From the Pleiades, the seven daughters of Atlas whom myth turned into stars; it later named groups of notable poets.', ejemplo: 'She belonged to the pleiad of poets of that decade.' },
  { palabra: 'Aubade', clase: 'noun', definicion: 'A poem or song about dawn, or about lovers parting at daybreak.', origen: 'From the French aubade, from aube (dawn), and that from the Latin albus, “white”.', ejemplo: 'The birds struck up their aubade.' },
  { palabra: 'Ruminate', clase: 'verb', definicion: 'To turn something over in the mind, again and again.', origen: 'From the Latin ruminari, “to chew the cud”: the thought is worked over like grass by cattle.', ejemplo: 'He ruminated on the offer all night.' },
  { palabra: 'Disquiet', clase: 'noun', definicion: 'A restlessness of the spirit; the loss of inner calm.', origen: 'From dis- (lack of) and quiet, from the Latin quietus; Fernando Pessoa made the word famous with his “Book of Disquiet”.', ejemplo: 'Waiting for the result filled her with disquiet.' },
]

const FRASES_EN: { cita: string; wiki?: string; autor?: string }[] = [
  { cita: 'Life is not what one lived, but what one remembers and how one remembers it in order to recount it.' },
  { cita: 'He who reads much and walks much, sees much and knows much.' },
  { cita: 'I have always imagined that Paradise will be a kind of library.' },
  { cita: 'Feet, what do I need them for if I have wings to fly?' },
  { cita: 'Imagination is more important than knowledge.' },
  { cita: 'Nothing in life is to be feared, it is only to be understood.' },
  { cita: 'I know that I know nothing.', wiki: 'Socrates', autor: 'Socrates' },
  { cita: 'We are what we repeatedly do. Excellence, then, is not an act but a habit.', wiki: 'Aristotle', autor: 'Aristotle' },
  { cita: 'It is not that we have a short time to live, but that we waste much of it.', wiki: 'Seneca the Younger', autor: 'Seneca' },
  { cita: 'The happiness of your life depends upon the quality of your thoughts.', wiki: 'Marcus Aurelius', autor: 'Marcus Aurelius' },
  { cita: 'Choose a job you love, and you will never have to work a day in your life.', wiki: 'Confucius', autor: 'Confucius' },
  { cita: 'Be the change you wish to see in the world.' },
  { cita: 'It always seems impossible until it is done.' },
  { cita: 'Take the first step in faith. You do not have to see the whole staircase.' },
  { cita: 'The best way to predict the future is to invent it.' },
  { cita: 'If you can dream it, you can do it.' },
  { cita: 'No one can make you feel inferior without your consent.' },
  { cita: 'One is not born, but rather becomes, a woman.' },
  { cita: 'There is no gate, no lock, no bolt that you can set upon the freedom of my mind.' },
  { cita: 'The secret of getting ahead is getting started.' },
  { cita: 'Be yourself; everyone else is already taken.' },
  { cita: 'It is only with the heart that one can see rightly; what is essential is invisible to the eye.' },
  { cita: 'Among individuals, as among nations, respect for the rights of others is peace.' },
  { cita: 'The homeland is an altar, not a pedestal.' },
  { cita: 'Wanderer, there is no road; the road is made by walking.' },
  { cita: 'Poetry is the feeling left over in the heart that comes out through the hand.' },
  { cita: 'We wandered without looking for each other, but knowing that we walked in order to meet.' },
  { cita: 'Write what should not be forgotten.' },
  { cita: 'Do not give up, please do not give way, even if the cold burns, even if fear bites.' },
  { cita: 'Many small people, in small places, doing small things, can change the world.' },
  { cita: 'Simplicity is the ultimate sophistication.' },
  { cita: 'I dream my painting and I paint my dream.' },
  { cita: 'Everything you can imagine is real.' },
  { cita: 'Music is a higher revelation than all wisdom and philosophy.' },
  { cita: 'The present is theirs; the future, for which I really worked, is mine.' },
  { cita: 'We are star stuff contemplating the stars.' },
  { cita: 'What we know is a drop of water; what we do not know is an ocean.' },
  { cita: 'There is a driving force more powerful than steam, electricity and atomic energy: the will.' },
  { cita: 'Behind every achievement there is another challenge.', wiki: 'Mother Teresa', autor: 'Mother Teresa' },
  { cita: 'Until one is committed, there is hesitancy, the chance to draw back.' },
]

/** Quita el desambiguador de un título de Wikipedia: "Guernica (Picasso)" → "Guernica". */
const sinParentesis = (titulo: string) => titulo.replace(/\s*\([^)]*\)$/, '')

/**
 * Efemérides culturales del catálogo local (rotan por día del año). Solo se
 * consulta la Wikipedia del idioma activo: en inglés el párrafo es su `extract`
 * (la glosa curada está solo en español).
 */
export async function catalogoDelDia(fecha: string, idioma: Idioma = 'es'): Promise<Efemeride[]> {
  const n = diaDelAnio(fecha)
  const i = { obra: n % OBRAS.length, libro: n % LIBROS.length, palabra: n % PALABRAS.length, frase: n % FRASES.length }
  const en = idioma === 'en'
  const obra = OBRAS[i.obra]
  const libro = LIBROS[i.libro]
  const palabra = (en ? PALABRAS_EN[i.palabra] : null) ?? PALABRAS[i.palabra]
  const frase = FRASES[i.frase]
  const obraEn = OBRAS_EN[i.obra]
  const libroEn = LIBROS_EN[i.libro]
  const fraseEn = FRASES_EN[i.frase]

  const wikiObra = en ? (obraEn?.wiki ?? obra.wiki) : obra.wiki
  const wikiLibro = en ? (libroEn?.wiki ?? libro.wiki) : libro.wiki
  const autorLibro = (en ? libroEn?.autor : undefined) ?? libro.autor
  const autorFrase = (en ? fraseEn?.autor : undefined) ?? frase.autor
  const wikiFrase = en ? (fraseEn?.wiki ?? frase.wiki) : frase.wiki

  // Wikipedia aporta un párrafo extra (y la imagen). Las portadas de libros casi
  // no existen en Wikipedia (sin fair use): se respaldan con el artículo del autor.
  const [rObra, rLibro, rLibroAutor, rFrase] = await Promise.all([
    resumenWikipedia(wikiObra, idioma),
    resumenWikipedia(wikiLibro, idioma),
    resumenWikipedia(autorLibro, idioma),
    resumenWikipedia(wikiFrase, idioma),
  ])

  return [
    { tipo: 'arte', titulo: en ? sinParentesis(wikiObra) : obra.titulo, subtitulo: (en ? obraEn?.artista : undefined) ?? obra.artista, texto: en ? (rObra.extract ?? '') : unirParrafos(obra.texto, rObra.extract), imagen: rObra.imagen, anio: obra.anio },
    { tipo: 'libro', titulo: en ? sinParentesis(wikiLibro) : libro.titulo, subtitulo: autorLibro, texto: en ? (rLibro.extract ?? rLibroAutor.extract ?? '') : unirParrafos(libro.texto, rLibro.extract ?? rLibroAutor.extract), imagen: rLibro.imagen ?? rLibroAutor.imagen, anio: libro.anio },
    { tipo: 'palabra', titulo: palabra.palabra, subtitulo: palabra.clase, texto: `${palabra.definicion}\n\n${palabra.origen}\n\n«${palabra.ejemplo}»` },
    { tipo: 'frase', titulo: `«${(en ? fraseEn?.cita : undefined) ?? frase.cita}»`, subtitulo: autorFrase, texto: rFrase.extract ?? '', imagen: rFrase.imagen },
  ]
}
