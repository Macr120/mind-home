import type { Efemeride } from '../../core/data/db'
import type { Idioma } from '../../core/state/ajustesStore'
import { diaDelAnio } from '../../core/fechaLocal'
import { resumenWikipedia } from './catalogo'

/**
 * Catálogo de la especie del día: rota por día del año. La ficha (foto y
 * párrafo) se pide a Wikipedia usando el NOMBRE CIENTÍFICO como título, que
 * existe en ambos idiomas y redirige al artículo local ("Vulpes lagopus" →
 * "Arctic fox"). El dato curado sirve de gancho y de respaldo sin red.
 */
interface Especie {
  /** Nombre científico: también es el título del artículo en Wikipedia. */
  cientifico: string
  es: string
  en: string
  datoEs: string
  datoEn: string
}

const ESPECIES: Especie[] = [
  { cientifico: 'Vulpes lagopus', es: 'Zorro ártico', en: 'Arctic fox', datoEs: 'Cambia su pelaje de blanco invernal a marrón en verano y aguanta hasta 50 grados bajo cero sin temblar.', datoEn: 'It swaps its white winter coat for a brown one in summer and endures −50 °C without shivering.' },
  { cientifico: 'Panthera tigris', es: 'Tigre', en: 'Tiger', datoEs: 'Sus rayas son únicas como una huella dactilar y siguen dibujadas en la piel, no solo en el pelo.', datoEn: 'Its stripes are as unique as a fingerprint, and they are printed on the skin, not just the fur.' },
  { cientifico: 'Ailuropoda melanoleuca', es: 'Panda gigante', en: 'Giant panda', datoEs: 'Es un carnívoro que come bambú catorce horas al día y tiene un "sexto dedo" para sujetar los tallos.', datoEn: 'A carnivore that eats bamboo fourteen hours a day, using a "sixth finger" to grip the stalks.' },
  { cientifico: 'Octopus vulgaris', es: 'Pulpo común', en: 'Common octopus', datoEs: 'Tiene tres corazones, sangre azul y dos tercios de sus neuronas repartidas por los brazos.', datoEn: 'It has three hearts, blue blood, and two thirds of its neurons spread across its arms.' },
  { cientifico: 'Danaus plexippus', es: 'Mariposa monarca', en: 'Monarch butterfly', datoEs: 'Vuela hasta 4.000 km hasta los bosques de Michoacán, un viaje que ningún individuo hace dos veces.', datoEn: 'It flies up to 4,000 km to the forests of Michoacán, a journey no single butterfly makes twice.' },
  { cientifico: 'Physeter macrocephalus', es: 'Cachalote', en: 'Sperm whale', datoEs: 'Tiene el cerebro más grande del planeta y bucea dos kilómetros para cazar calamares en la oscuridad.', datoEn: 'It has the largest brain on the planet and dives two kilometres to hunt squid in the dark.' },
  { cientifico: 'Phoenicopterus roseus', es: 'Flamenco común', en: 'Greater flamingo', datoEs: 'Nace gris: el rosa se lo dan los pigmentos de los crustáceos y las algas que filtra del agua.', datoEn: 'It hatches grey: the pink comes from pigments in the crustaceans and algae it filters from the water.' },
  { cientifico: 'Chrysocyon brachyurus', es: 'Aguará guazú', en: 'Maned wolf', datoEs: 'Ni lobo ni zorro: un cánido de patas larguísimas que camina la pampa comiendo fruta.', datoEn: 'Neither wolf nor fox: a stilt-legged canid that walks the pampas eating fruit.' },
  { cientifico: 'Ara macao', es: 'Guacamayo rojo', en: 'Scarlet macaw', datoEs: 'Forma parejas de por vida y come arcilla de los barrancos para neutralizar las semillas tóxicas.', datoEn: 'It mates for life and eats clay from riverbanks to neutralise the toxic seeds in its diet.' },
  { cientifico: 'Ambystoma mexicanum', es: 'Ajolote', en: 'Axolotl', datoEs: 'Nunca completa la metamorfosis y regenera patas, corazón y hasta partes del cerebro.', datoEn: 'It never completes metamorphosis and can regrow limbs, heart tissue and even parts of its brain.' },
  { cientifico: 'Tursiops truncatus', es: 'Delfín mular', en: 'Bottlenose dolphin', datoEs: 'Cada individuo inventa un silbido propio que funciona como su nombre y otros usan para llamarlo.', datoEn: 'Each one invents a signature whistle that works as its name, and others use it to call them.' },
  { cientifico: 'Aptenodytes forsteri', es: 'Pingüino emperador', en: 'Emperor penguin', datoEs: 'El macho incuba el huevo sobre sus patas durante dos meses de noche polar sin comer nada.', datoEn: 'The male incubates the egg on his feet through two months of polar night without eating.' },
  { cientifico: 'Apis mellifera', es: 'Abeja melífera', en: 'Western honey bee', datoEs: 'Baila en ocho para indicar a sus compañeras la dirección y la distancia exactas de las flores.', datoEn: 'It dances a figure of eight to tell the hive the exact direction and distance of the flowers.' },
  { cientifico: 'Panthera onca', es: 'Jaguar', en: 'Jaguar', datoEs: 'Tiene la mordida más potente de los felinos: mata perforando el cráneo de su presa.', datoEn: 'It has the strongest bite of any big cat, killing by piercing its prey’s skull.' },
  { cientifico: 'Loxodonta africana', es: 'Elefante africano', en: 'African bush elephant', datoEs: 'Se comunica con infrasonidos que viajan kilómetros y detecta con las patas las vibraciones del suelo.', datoEn: 'It talks in infrasound that travels for kilometres and feels ground vibrations through its feet.' },
  { cientifico: 'Ursus maritimus', es: 'Oso polar', en: 'Polar bear', datoEs: 'Su piel es negra y su pelo transparente y hueco: no es blanco, solo lo parece.', datoEn: 'Its skin is black and its fur transparent and hollow: it is not white, it only looks it.' },
  { cientifico: 'Falco peregrinus', es: 'Halcón peregrino', en: 'Peregrine falcon', datoEs: 'Es el animal más rápido del mundo: supera los 350 km/h en picado sobre sus presas.', datoEn: 'The fastest animal alive: it tops 350 km/h when it stoops onto its prey.' },
  { cientifico: 'Chelonia mydas', es: 'Tortuga verde', en: 'Green sea turtle', datoEs: 'Vuelve a desovar a la misma playa donde nació décadas antes, guiándose por el campo magnético.', datoEn: 'It returns to nest on the very beach where it hatched decades earlier, guided by magnetic fields.' },
  { cientifico: 'Myrmecophaga tridactyla', es: 'Oso hormiguero gigante', en: 'Giant anteater', datoEs: 'No tiene dientes: su lengua de 60 cm entra y sale 150 veces por minuto en un hormiguero.', datoEn: 'It has no teeth: its 60 cm tongue flicks in and out 150 times a minute inside an anthill.' },
  { cientifico: 'Vombatus ursinus', es: 'Wómbat', en: 'Common wombat', datoEs: 'Es el único animal que hace excrementos cúbicos, y los usa para marcar el territorio sin que rueden.', datoEn: 'The only animal that produces cube-shaped droppings, which mark territory without rolling away.' },
  { cientifico: 'Lemur catta', es: 'Lémur de cola anillada', en: 'Ring-tailed lemur', datoEs: 'Los machos libran "peleas apestosas": frotan la cola con su perfume y la agitan contra el rival.', datoEn: 'Males hold "stink fights": they rub their tail with scent and waft it at their rival.' },
  { cientifico: 'Bubo scandiacus', es: 'Búho nival', en: 'Snowy owl', datoEs: 'Caza a plena luz del día ártico y oye un roedor moviéndose bajo medio metro de nieve.', datoEn: 'It hunts in full Arctic daylight and hears a rodent moving under half a metre of snow.' },
  { cientifico: 'Giraffa camelopardalis', es: 'Jirafa', en: 'Giraffe', datoEs: 'Su cuello de dos metros tiene solo siete vértebras, las mismas que el de un ratón.', datoEn: 'Its two-metre neck holds just seven vertebrae, the same number as a mouse’s.' },
  { cientifico: 'Hydrochoerus hydrochaeris', es: 'Carpincho', en: 'Capybara', datoEs: 'El roedor más grande del mundo: pasta como un caballo y duerme dentro del agua.', datoEn: 'The world’s largest rodent: it grazes like a horse and naps in the water.' },
  { cientifico: 'Ornithorhynchus anatinus', es: 'Ornitorrinco', en: 'Platypus', datoEs: 'Un mamífero que pone huevos, detecta electricidad con el pico y tiene veneno en los tobillos.', datoEn: 'A mammal that lays eggs, senses electricity with its bill and carries venom in its ankles.' },
  { cientifico: 'Rhincodon typus', es: 'Tiburón ballena', en: 'Whale shark', datoEs: 'El pez más grande del planeta filtra plancton con una boca de metro y medio y no muerde.', datoEn: 'The largest fish alive filters plankton through a metre-and-a-half mouth and never bites.' },
  { cientifico: 'Panthera leo', es: 'León', en: 'Lion', datoEs: 'El único felino que vive en grupo: cazan las hembras y su rugido se oye a ocho kilómetros.', datoEn: 'The only cat that lives in groups: the females hunt, and its roar carries eight kilometres.' },
  { cientifico: 'Canis lupus', es: 'Lobo', en: 'Wolf', datoEs: 'Aúlla para reunir a la manada y reconoce a cada miembro por la voz a kilómetros de distancia.', datoEn: 'It howls to gather the pack and recognises each member by voice from kilometres away.' },
  { cientifico: 'Pan troglodytes', es: 'Chimpancé', en: 'Chimpanzee', datoEs: 'Fabrica herramientas, se cura con plantas y comparte con nosotros casi el 99 % del ADN.', datoEn: 'It makes tools, self-medicates with plants and shares almost 99% of our DNA.' },
  { cientifico: 'Macropus rufus', es: 'Canguro rojo', en: 'Red kangaroo', datoEs: 'Salta nueve metros de un brinco y usa la cola como quinta pata para caminar despacio.', datoEn: 'It leaps nine metres in one bound and uses its tail as a fifth leg when walking slowly.' },
  { cientifico: 'Iguana iguana', es: 'Iguana verde', en: 'Green iguana', datoEs: 'Tiene un "tercer ojo" en la cabeza que no ve formas, pero detecta sombras desde arriba.', datoEn: 'It has a "third eye" on its head that sees no shapes but detects shadows from above.' },
  { cientifico: 'Dendrobates tinctorius', es: 'Rana dardo', en: 'Dyeing poison dart frog', datoEs: 'Su veneno viene de las hormigas que come: criada en cautiverio es completamente inofensiva.', datoEn: 'Its poison comes from the ants it eats: raised in captivity it is completely harmless.' },
  { cientifico: 'Architeuthis', es: 'Calamar gigante', en: 'Giant squid', datoEs: 'Tiene el ojo más grande del reino animal, del tamaño de un plato, y no se fotografió vivo hasta 2004.', datoEn: 'It has the largest eye in the animal kingdom, plate-sized, and was not photographed alive until 2004.' },
  { cientifico: 'Amphiprion ocellaris', es: 'Pez payaso', en: 'Ocellaris clownfish', datoEs: 'Vive inmune entre los tentáculos de una anémona y todos nacen machos: el dominante se vuelve hembra.', datoEn: 'It lives immune among anemone tentacles, and all are born male: the dominant one turns female.' },
  { cientifico: 'Struthio camelus', es: 'Avestruz', en: 'Common ostrich', datoEs: 'El ave más grande no vuela, pero corre a 70 km/h y su ojo es mayor que su cerebro.', datoEn: 'The largest bird cannot fly, but runs at 70 km/h, and its eye is bigger than its brain.' },
  { cientifico: 'Cervus elaphus', es: 'Ciervo rojo', en: 'Red deer', datoEs: 'Renueva su cornamenta cada año: es el tejido de crecimiento más rápido de los mamíferos.', datoEn: 'It regrows its antlers every year, the fastest-growing tissue of any mammal.' },
  { cientifico: 'Erinaceus europaeus', es: 'Erizo europeo', en: 'European hedgehog', datoEs: 'Lleva 6.000 púas y en hibernación baja su corazón de 190 a 20 latidos por minuto.', datoEn: 'It carries 6,000 spines and in hibernation drops its heart from 190 to 20 beats a minute.' },
  { cientifico: 'Lynx pardinus', es: 'Lince ibérico', en: 'Iberian lynx', datoEs: 'Pasó de 94 ejemplares en 2002 a más de 2.000: el mayor rescate de un felino de la historia.', datoEn: 'It went from 94 animals in 2002 to over 2,000: the greatest rescue of a cat in history.' },
  { cientifico: 'Acinonyx jubatus', es: 'Guepardo', en: 'Cheetah', datoEs: 'Acelera de 0 a 100 km/h en tres segundos, pero solo aguanta el sprint medio minuto.', datoEn: 'It goes from 0 to 100 km/h in three seconds, but can only sustain the sprint for half a minute.' },
  { cientifico: 'Balaenoptera musculus', es: 'Ballena azul', en: 'Blue whale', datoEs: 'El animal más grande que ha existido: su corazón pesa como un coche pequeño.', datoEn: 'The largest animal that has ever lived: its heart weighs as much as a small car.' },
  { cientifico: 'Chamaeleo chamaeleon', es: 'Camaleón común', en: 'Common chameleon', datoEs: 'No cambia de color para camuflarse, sino para regular su temperatura y comunicar su humor.', datoEn: 'It changes colour not to hide but to regulate temperature and signal its mood.' },
  { cientifico: 'Aquila chrysaetos', es: 'Águila real', en: 'Golden eagle', datoEs: 'Ve a una liebre a tres kilómetros: su vista tiene el doble de resolución que la humana.', datoEn: 'It spots a hare three kilometres away: its eyesight has twice the resolution of ours.' },
  { cientifico: 'Tyto alba', es: 'Lechuza común', en: 'Barn owl', datoEs: 'Su cara en forma de corazón es una antena: caza en oscuridad total guiándose solo por el oído.', datoEn: 'Its heart-shaped face is an antenna: it hunts in total darkness guided by hearing alone.' },
  { cientifico: 'Hippocampus hippocampus', es: 'Caballito de mar', en: 'Short-snouted seahorse', datoEs: 'Es el macho quien se embaraza: incuba los huevos en una bolsa y pare las crías.', datoEn: 'Here it is the male that gets pregnant: he incubates the eggs in a pouch and gives birth.' },
  { cientifico: 'Equus quagga', es: 'Cebra común', en: 'Plains zebra', datoEs: 'Sus rayas espantan a las moscas: los tábanos no consiguen aterrizar sobre el patrón.', datoEn: 'Its stripes repel flies: horseflies cannot manage to land on the pattern.' },
  { cientifico: 'Suricata suricatta', es: 'Suricata', en: 'Meerkat', datoEs: 'Se turnan de centinela: uno vigila erguido mientras el resto del clan excava y come.', datoEn: 'They take turns on sentry duty: one stands guard while the rest of the clan digs and feeds.' },
  { cientifico: 'Bradypus variegatus', es: 'Perezoso', en: 'Brown-throated sloth', datoEs: 'Se mueve tan despacio que le crecen algas en el pelo, y baja del árbol solo una vez por semana.', datoEn: 'It moves so slowly that algae grow in its fur, and it climbs down only once a week.' },
  { cientifico: 'Carcharodon carcharias', es: 'Tiburón blanco', en: 'Great white shark', datoEs: 'Detecta el campo eléctrico de un corazón latiendo y renueva sus dientes toda la vida.', datoEn: 'It senses the electric field of a beating heart and replaces its teeth for life.' },
  { cientifico: 'Mobula birostris', es: 'Manta gigante', en: 'Giant oceanic manta ray', datoEs: 'Con siete metros de envergadura, tiene el cerebro más grande de todos los peces y se reconoce en un espejo.', datoEn: 'With a seven-metre wingspan, it has the largest brain of any fish and recognises itself in a mirror.' },
  { cientifico: 'Papilio machaon', es: 'Macaón', en: 'Old World swallowtail', datoEs: 'Su oruga saca del cuello una horquilla naranja que apesta para espantar a los depredadores.', datoEn: 'Its caterpillar everts a foul-smelling orange fork from its neck to scare off predators.' },
]

/** La especie del día (rota por día del año), con ficha de Wikipedia. */
export async function especieDelDia(fecha: string, idioma: Idioma): Promise<Efemeride> {
  const e = ESPECIES[diaDelAnio(fecha) % ESPECIES.length]
  const wiki = await resumenWikipedia(e.cientifico, idioma)
  return {
    tipo: 'especie',
    titulo: idioma === 'en' ? e.en : e.es,
    subtitulo: e.cientifico,
    texto: [idioma === 'en' ? e.datoEn : e.datoEs, wiki.extract].filter(Boolean).join('\n\n'),
    imagen: wiki.imagen,
  }
}
