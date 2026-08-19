import type { Dict } from './dict'

/**
 * Textos de PASO de los tutoriales en it. Capa aparte porque solo hacen
 * falta con un tour corriendo.
 *
 * Lo monta `traducir-a-mano.mjs meter-dict` — no lo edites a mano.
 */

export const IT_TUT: Dict = {
  'tut.app-computo--formulario.1.titulo': 'Sempre accanto alla calcolatrice',
  'tut.app-computo--formulario.1.texto':
    'Tutto il formulario vive in questo menu, a un tocco da dove fai i conti. Matematica, Fisica e Chimica arrivano già cariche e raggruppate per argomento, in cartelle che annidi come vuoi. Pep ha anche Fisica II con i suoi parziali, i conti della caffetteria e quelli della corsa.',
  'tut.app-computo--formulario.2.titulo': 'È tutto tuo',
  'tut.app-computo--formulario.2.texto':
    'Non ci sono formule «di serie» e formule «tue»: ognuna si apre, si modifica e si elimina allo stesso modo. Il campo di ricerca in alto le cerca tutte.',
  'tut.app-computo--formulario.3.titulo': 'Cambiala come vuoi',
  'tut.app-computo--formulario.3.texto':
    'Modificare una formula ti lascia cambiare l\'espressione, rinominare le sue variabili o fissare un valore che usi sempre.',
  'tut.app-computo--formulario.4.texto':
    'La curva compare tra la formula e le variabili, e trascinando la barra di una qualsiasi si muove all\'istante. «Vedi ingrandito» la manda alla modalità Grafico, e il pulsante di stampa porta l\'intera cartella in un PDF con le formule ben composte.',
  'tut.app-computo--calculadora.1.titulo': 'Scrivi l\'operazione',
  'tut.app-computo--calculadora.1.texto':
    'Il risultato si calcola mentre scrivi. Il tastierino qui sotto ti evita quello del telefono, e le funzioni scientifiche non stanno più lì: sono nelle notazioni.',
  'tut.app-computo--calculadora.2.titulo': 'Le notazioni',
  'tut.app-computo--calculadora.2.texto':
    'Qui c\'è tutto lo scientifico e parecchio altro: scegli il gruppo —fondamenti, analisi, matrici, trigonometria, simboli— e i pulsanti cambiano. Si scrivono dove hai il cursore e lo spazio resta pronto da riempire.',
  'tut.app-computo--calculadora.3.titulo': 'Modalità speciali',
  'tut.app-computo--calculadora.3.texto':
    'La calcolatrice cambia vista del tutto: il grafico, le basi dal 2 al 16, matrici, sistemi di equazioni, conversione di unità, il conto con la mancia e la regola del tre. La cronologia resta in basso in tutte.',
  'tut.app-computo--calculadora.3b.titulo': 'Basi',
  'tut.app-computo--calculadora.3b.texto':
    'Quello che scrivi si legge nella base scelta e si mostra in tutte e quindici insieme, dal 2 al 16, dal vivo. Ha le operazioni bit a bit, e con i prefissi 0b, 0o e 0x si mescolano basi nello stesso conto.',
  'tut.app-computo--calculadora.3c.titulo': 'Matrici e sistemi',
  'tut.app-computo--calculadora.3c.texto':
    'Matrici opera con A e B fino a 6×6: somma, prodotto, determinante, inversa, trasposta e traccia. Il suo vicino Sistemi risolve equazioni lineari leggendo le incognite da quello che scrivi, fino a sei equazioni.',
  'tut.app-computo--calculadora.3d.titulo': 'Unità',
  'tut.app-computo--calculadora.3d.texto':
    'Otto categorie —dalla lunghezza ai dati— che convertono mentre scrivi; ognuna ricorda la sua ultima coppia e «Inverti» ribalta la conversione. La temperatura esce giusta: 100 °C sono 212 °F.',
  'tut.app-computo--calculadora.3e.titulo': 'Mancia e regola del tre',
  'tut.app-computo--calculadora.3e.texto':
    'Le due da conto rapido: Mancia calcola sul conto —non sul totale— e divide per quanti siete; Regola del 3, diretta o inversa, riempie la x da sola.',
  'tut.app-computo--calculadora.4.titulo': 'Il formulario, a portata di mano',
  'tut.app-computo--calculadora.4.texto':
    'Le tue formule si aprono da questo menu, con le variabili pronte da riempire: è questo che rende utile salvarle.',
  'tut.app-computo--calculadora.5.titulo': 'Disegnare grafici',
  'tut.app-computo--calculadora.5.texto':
    'Da qui passa tutto quello che si disegna, con il grafico in alto e il tastierino in basso per scrivere le funzioni. Trascina per spostare, pizzica per ingrandire e tocca per leggere un punto.',
  'tut.app-computo--calculadora.6.titulo': 'Quattro modi di disegnare',
  'tut.app-computo--calculadora.6.texto':
    'Funzioni di x, curve polari come questa rosa (r in funzione dell\'angolo), parametriche dove x e y dipendono dallo stesso parametro, e superfici di due variabili che giri con il dito.',
  'tut.app-computo--calculadora.7.titulo': 'Risolvere equazioni',
  'tut.app-computo--calculadora.7.texto':
    'Scrivi l\'equazione con il suo uguale. Se è un polinomio ti dà le radici esatte; se no, le cerca dentro l\'intervallo che stai guardando e ti dice qual era.',
  'tut.app-computo--hojas.1.titulo': 'I tuoi fogli',
  'tut.app-computo--hojas.1.texto':
    'Ogni foglio è un documento a sé. Pep ha il budget del Giappone, il piano delle 18 settimane della maratona e i voti di Fisica II.',
  'tut.app-computo--hojas.2.titulo': 'Partire con qualcosa',
  'tut.app-computo--hojas.2.texto':
    'L\'app porta tre fogli già pronti con le loro formule —budget, media ponderata e registro misurazioni— per non partire mai dal bianco. Sono tuoi: cambiali o eliminali.',
  'tut.app-computo--hojas.3.titulo': 'La barra della formula',
  'tut.app-computo--hojas.3.texto':
    'La cella si modifica qui in alto, non nella griglia: sul telefono è l\'unico modo di scrivere senza litigarci. Mentre scrivi una formula, toccare una cella ne inserisce il riferimento.',
  'tut.app-computo--hojas.4.titulo': 'Un grafico da ciò che selezioni',
  'tut.app-computo--hojas.4.texto':
    'Seleziona un intervallo e premi il pulsante del grafico: barre, linee, area, torta o dispersione. Il grafico salva l\'INTERVALLO, così si muove da solo quando cambi un numero.',
  'tut.app-computo--hojas.5.titulo': 'Esportare',
  'tut.app-computo--hojas.5.texto':
    'In Excel esce un .xlsx vero, con le formule vive e i grafici come grafici di Excel. In PDF esce dalla stampa del browser.',
  'tut.casa.1.texto': 'Questa è la tua casa: ogni stanza contiene un\'app. Ti mostro i comandi di base.',
  'tut.casa.2.titulo': 'Il menu principale',
  'tut.casa.2.texto':
    'Questo pulsante apre il menu: le tue stanze, il catalogo dei modelli (le app) e l\'inventario degli oggetti.',
  'tut.casa.3.titulo': 'Muoversi',
  'tut.casa.3.texto':
    'Cammina con il joystick, con WASD o con le frecce della tastiera. Attraversa la porta di una stanza ed entri: la sua app si apre da sola.',
  'tut.casa.4.titulo': 'Tre modi di guardare',
  'tut.casa.4.texto':
    'Isometrica, terza e prima persona (o il tasto V). Toccare Iso ricentra anche la telecamera sul tuo personaggio: l\'uscita rapida se l\'esplorazione ti ha portato lontano.',
  'tut.casa.5.titulo': 'Un angolo, tanti padroni',
  'tut.casa.5.texto':
    'Quell\'angolo non è solo il cubo delle viste: quando ti avvicini a qualcosa con cui si può interagire —una sedia, un veicolo, un campo— cambia da solo in base a ciò che hai vicino. Niente si attiva se non ti avvicini.',
  'tut.casa.6.titulo': 'La ruota degli strumenti',
  'tut.casa.6.texto':
    'Movimenti, giocattoli, veicoli e costruzione, fino a 3 equipaggiati alla volta. Si apre da qui o dallo stesso angolo quando hai le mani libere.',
  'tut.casa.7.titulo': 'L\'orologio',
  'tut.casa.7.texto':
    'L\'ora della casa: toccala e si apre il calendario completo, con le sue Missioni del giorno. Il sole o la luna lì accanto controllano lo scorrere del tempo e la luce della scena.',
  'tut.casa.8.titulo': 'La musica della casa',
  'tut.casa.8.texto':
    'Ogni stanza può avere il suo tema, oppure lasciar suonare l\'atmosfera generale della casa. Si spegne del tutto se preferisci il silenzio.',
  'tut.casa.9.titulo': 'La chat',
  'tut.casa.9.texto':
    'La chat dell\'architetto: raccontagli cosa hai fatto e lo registra nell\'app giusta, oppure chiedigli modifiche alla casa.',
  'tut.casa.10.texto':
    'Questo è l\'essenziale. Il pulsante Editor in alto apre la personalizzazione completa, e ogni menu e ogni app hanno il loro pulsante ? con il loro tutorial.',
  'tut.primeros.1.texto': 'Prima di tutto: come si costruisce la casa. Tutto parte dalla scheda Stanze.',
  'tut.primeros.2.titulo': 'Crea stanza',
  'tut.primeros.2.texto':
    'Con questo pulsante disegni nuove stanze sulla mappa. Per mostrarti il resto del percorso, ora te ne creo una…',
  'tut.primeros.3.titulo': 'La tua nuova stanza',
  'tut.primeros.3.texto':
    'Eccola! Una stanza appena creata, ancora senza app: per questo la sua scheda dice + Assegna.',
  'tut.primeros.4.titulo': 'Assegnare un\'app',
  'tut.primeros.4.texto':
    'Con + Assegna le ho dato la sua app: guarda come la stanza ha preso il suo nome, la sua icona e i suoi mobili. Da adesso la sua scheda intera è il pulsante per entrare.',
  'tut.primeros.5.titulo': 'Entra',
  'tut.primeros.5.texto':
    'Siamo dentro: questa è l\'app della stanza. Passeggiando entri anche attraversando la sua porta, ed esci con ‹ Torna a casa.',
  'tut.primeros.6.texto':
    'La stanza resta nella tua casa, con la sua app pronta. Il resto si costruisce così: una stanza per ogni cosa che vuoi tenere qui.',
  'tut.menu-cuartos.1.texto': 'La scheda Stanze elenca tutte le stanze della tua casa, raggruppate per categoria.',
  'tut.menu-cuartos.2.titulo': 'Il tuo riepilogo',
  'tut.menu-cuartos.2.texto':
    'Il tuo personaggio vive della tua attività reale: qui vedi il suo umore, il suo livello e la sua serie. Registra qualcosa in una qualsiasi app e lo vedrai contento; qualche giorno senza niente e diventa triste — non riparte mai da zero e non ti punisce.',
  'tut.menu-cuartos.3.titulo': 'Le schede',
  'tut.menu-cuartos.3.texto':
    'Ogni scheda è una stanza: la sua icona, il suo nome e i progressi della sua app, e si raggruppano in Corpo, Mente, Extra e Impostazioni. Le stanze senza app assegnata restano proprio in fondo.',
  'tut.menu-cuartos.4.titulo': 'Opzioni della stanza',
  'tut.menu-cuartos.4.texto':
    'L\'ingranaggio apre le opzioni della stanza in una fila: spostarla su o giù nella lista, eliminarla, e Modifica, che apre il suo editor di forma, colori, muri e oggetti.',
  'tut.menu-cuartos.5.titulo': 'La scheda intera entra',
  'tut.menu-cuartos.5.texto':
    'La scheda completa è il pulsante: toccala in un punto qualsiasi ed entri nell\'app della stanza. Se non ha ancora un\'app, quella stessa scheda dice + Assegna e apre il catalogo per sceglierne una.',
  'tut.menu-cuartos.6.titulo': 'Crea stanza',
  'tut.menu-cuartos.6.texto':
    'Crea stanza apre l\'editor della mappa con il pennello già pronto a disegnare la nuova stanza: forma, dimensione e posizione le decidi tu. Sul telefono è più comoda la scorciatoia della ruota degli strumenti › Costruzione › Stanze, che disegna direttamente sulla mappa senza aprire il pannello.',
  'tut.menu-cuartos.7.texto':
    'In breve: Modifica per personalizzare, Entra per usare l\'app. Le altre schede di questo menu hanno il loro tutorial.',
  'tut.menu-plantillas.1.texto':
    'Un modello è un\'app (Cucina, Palestra, Finanze…). Si assegna a un oggetto di una stanza e si apre quando entri.',
  'tut.menu-plantillas.2.titulo': 'Due viste',
  'tut.menu-plantillas.2.texto':
    'Stanze sono le app di sempre, ognuna nel suo oggetto. Extra è un\'altra cosa: circuiti, campi, orto, fattoria o paintball si costruiscono direttamente sul terreno, senza occupare una stanza.',
  'tut.menu-plantillas.3.titulo': 'Il catalogo',
  'tut.menu-plantillas.3.texto':
    'Le app di serie e le tue, organizzate in gruppi. Tocca una per assegnarla a una stanza oppure, in Extra, per costruirla sulla mappa.',
  'tut.menu-plantillas.4.titulo': 'I tuoi modelli',
  'tut.menu-plantillas.4.texto':
    'Crea modelli tuoi assemblandoli con blocchi: note, checklist, contatori, abitudini, gallerie… Questo pulsante apre il suo editor, con il suo tutorial.',
  'tut.menu-plantillas.5.texto':
    'Una stessa stanza può avere più app: quando entri compare un selettore per scegliere quale aprire.',
  'tut.plantillas-custom.1.texto':
    'Questo editor costruisce un\'app tua da zero: le dai forma con nome, emoji e blocchi, e finisce nel catalogo accanto a quelle di serie.',
  'tut.plantillas-custom.2.titulo': 'Nome, emoji e colore',
  'tut.plantillas-custom.2.texto':
    'Come si chiamerà e di che colore si dipinge nel menu, nel catalogo e nel calendario, se programmi qualcosa di suo.',
  'tut.plantillas-custom.3.titulo': 'Gli strumenti',
  'tut.plantillas-custom.3.texto':
    'Dodici tipi di blocco: note, checklist, contatore, abitudine, sessioni, conto alla rovescia, galleria, diario, valutazione, progresso, elenco e link. Ognuno che aggiungi diventa una sezione della tua app.',
  'tut.plantillas-custom.4.titulo': 'L\'ordine conta',
  'tut.plantillas-custom.4.texto':
    'I blocchi aggiunti si riordinano con le frecce e si tolgono con la ✕ — toglierne uno cancella i suoi dati quando salvi, quindi controlla prima di confermare. Con il menu a tendina «Menu» passano da una scheda all\'altra senza perdere nulla.',
  'tut.plantillas-custom.5.titulo': 'Salva',
  'tut.plantillas-custom.5.texto':
    'Con un nome e almeno un blocco, Salva la lascia pronta nel catalogo. Da lì si assegna a un oggetto come qualsiasi modello di serie.',
  'tut.plantillas-custom.6.texto':
    'Puoi rimetterci mano quando vuoi: i suoi blocchi e i suoi dati restano al loro posto, cambia solo quello che modifichi.',
  'tut.menu-inventario.1.texto': 'L\'inventario: tutti gli oggetti che puoi mettere in casa, pronti da trascinare.',
  'tut.menu-inventario.2.titulo': 'Oggetti',
  'tut.menu-inventario.2.texto':
    'La tua libreria di oggetti, per categorie e cartelle. Puoi rinominarli e organizzarli per ritrovarli in fretta la prossima volta.',
  'tut.menu-inventario.3.titulo': 'Oggetti speciali',
  'tut.menu-inventario.3.texto':
    'Quelli che fanno qualcosa, non solo decorano: veicoli cavalcabili, pistole giocattolo, fontane, giochi da parco e luci.',
  'tut.menu-inventario.4.titulo': 'Posizionare',
  'tut.menu-inventario.4.texto':
    'Con questo menu aperto, trascina una miniatura direttamente nella scena 3D per posizionarla dove vuoi.',
  'tut.menu-inventario.5.texto':
    'Per spostare, dipingere o eliminare quello che hai già messo, usa l\'Editor (scheda Oggetti) — questo menu serve solo a portare cose nuove in scena.',
  'tut.editor-mapa.1.texto':
    'L\'editor della casa ha 4 schede: Mappa, Personaggi, Oggetti e Impostazioni. Questo tour è quello di Mappa; gli altri tre hanno il loro.',
  'tut.editor-mapa.2.titulo': 'Lo schizzo',
  'tut.editor-mapa.2.texto':
    'Disegni su una griglia vista dall\'alto: stanze, muri, porte, finestre e pavimenti, con le modalità e i pennelli della barra in alto. Quello che tracci compare subito nel 3D, senza ricaricare nulla.',
  'tut.editor-mapa.3.texto':
    'I tetti si mettono cella per cella: ognuna può avere la sua forma o il suo materiale, così una stessa stanza può combinare falde diverse invece di un unico tetto piatto.',
  'tut.editor-mapa.4.texto':
    'Anche la casa ha livelli: piani impilabili verso l\'alto e un seminterrato verso il basso. Ogni nuovo livello nasce con il suo modo di salire —una scala o un\'apertura nella soletta— che perfora il piano di sopra.',
  'tut.editor-mapa.5.titulo': 'Fatto',
  'tut.editor-mapa.5.texto':
    'Tutto si salva da solo mentre modifichi. Fatto chiude l\'editor e ti riporta al gioco con la casa esattamente come l\'hai lasciata.',
  'tut.editor-personajes.1.texto':
    'Il tuo personaggio principale e i tuoi assistenti vivono nello stesso editor: scegli in alto chi modificare e gli strumenti cambiano in base a ciò che ha senso per ognuno.',
  'tut.editor-personajes.2.titulo': 'Volto e foto',
  'tut.editor-personajes.2.texto':
    'Espressione, acconciatura e colore dei capelli, oppure direttamente una tua foto perché il personaggio ti somigli. Non tutti i corpi accettano un volto su misura.',
  'tut.editor-personajes.3.titulo': 'Vestiti per categoria',
  'tut.editor-personajes.3.texto':
    'Ogni capo si indossa, si toglie e cambia colore per conto suo: camicia, pantaloni, scarpe, accessori. Si combinano liberamente.',
  'tut.editor-personajes.4.titulo': 'Tenute salvate',
  'tut.editor-personajes.4.texto':
    'Salva una combinazione completa di vestiti come tenuta e cambia look tutto in una volta con un tocco, senza rimettere insieme capo per capo ogni volta.',
  'tut.editor-personajes.5.titulo': 'Guardaroba per stanza',
  'tut.editor-personajes.5.texto':
    'Assegna una tenuta diversa a ogni stanza: il tuo avatar entra in Palestra vestito per correre e si cambia da solo appena passa in cucina.',
  'tut.editor-personajes.6.texto':
    'Corpo, colore e dimensione si modificano come sempre; con l\'IA attiva puoi anche generare un modello 3D tuo invece di sceglierne uno già pronto.',
  'tut.editor-objetos.1.texto':
    'Tocca un oggetto nella scena (o nell\'elenco) per modificarlo: colore, dimensione e rotazione sono i tre parametri che hanno tutti.',
  'tut.editor-objetos.2.texto':
    'Gli oggetti con un\'app assegnata aprono il loro modello quando entri nella stanza; gli altri sono solo decorazione — si modificano allo stesso modo.',
  'tut.editor-objetos.3.texto':
    'L\'ingranaggio ⚙️ di un oggetto lo rende modificabile pezzo per pezzo: costruisci i tuoi oggetti combinando forme di base, oppure chiedine uno all\'IA descrivendolo.',
  'tut.editor-config.1.texto':
    'Otto sezioni pieghevoli, non un unico elenco lungo: tocca il titolo per aprire solo quella che ti interessa.',
  'tut.editor-config.2.titulo': 'Account e IA',
  'tut.editor-config.2.texto':
    'Accedere, il tuo piano e quanta IA hai speso questo mese; proprio accanto, la tabella dei prezzi di ogni operazione. Entrambe hanno il loro tutorial dettagliato.',
  'tut.editor-config.3.titulo': 'Stile visivo',
  'tut.editor-config.3.texto':
    'Il tema della mappa (luce, nebbia, illuminazione) e gli stili degli effetti visivi, tutto caricato su richiesta per non appesantire l\'avvio.',
  'tut.editor-config.4.titulo': 'Interfaccia e lingua',
  'tut.editor-config.4.texto':
    'Lingua, tema dell\'interfaccia (chiaro/scuro/automatico), stile delle icone e densità — tutto ciò che cambia COME si vede la casa, non cosa contiene.',
  'tut.editor-config.5.titulo': 'Notifiche',
  'tut.editor-config.5.texto':
    'Quali avvisi arrivano e quali stanno zitti: routine, avvisi dei piani e promemoria si spengono ognuno per conto suo.',
  'tut.editor-config.6.texto':
    'Musica e Tutorial hanno il loro percorso; anche Backup dei dati, ed è quello che conviene di più guardare prima di cambiare dispositivo.',
  'tut.respaldo.1.titulo': 'Dove vive la tua casa',
  'tut.respaldo.1.texto':
    'Senza account né sincronizzazione, i tuoi dati stanno solo su questo dispositivo. L\'avviso qui sopra dice se il browser ha il permesso di proteggerli da una pulizia automatica.',
  'tut.respaldo.2.titulo': 'Esporta',
  'tut.respaldo.2.texto':
    'Scarica un unico file JSON con tutte le tue tabelle: stanze, obiettivi, registrazioni, tutto. È il tuo backup manuale.',
  'tut.respaldo.3.titulo': 'Ripristina',
  'tut.respaldo.3.texto':
    'Ripristinare SOSTITUISCE tutti i dati attuali con quelli del file: prima chiede conferma e mostra quanti record contiene, quindi niente sorprese.',
  'tut.respaldo.4.texto':
    'Conviene fare un backup prima di cambiare dispositivo o browser, o anche solo ogni tanto: senza account è l\'unica copia che hai.',
  'tut.editor-cuarto.1.texto':
    'Stai modificando una stanza precisa: lo schizzo e la telecamera si concentrano su di essa, non su tutta la casa.',
  'tut.editor-cuarto.2.titulo': 'Cosa puoi modificare',
  'tut.editor-cuarto.2.texto':
    'Forma, pavimento, muri, porte, colore e nome della stanza, e i suoi oggetti. Anche l\'app assegnata si cambia da qui: è ciò che porta più gente in questo pannello.',
  'tut.editor-cuarto.3.titulo': 'Torna alla mappa',
  'tut.editor-cuarto.3.texto':
    'Questa freccia torna alla mappa completa senza chiudere l\'editor, così puoi continuare a lavorare su un\'altra stanza.',
  'tut.editor-cuarto.4.texto':
    'C\'è anche un pulsante flottante «Esci dalla stanza» sopra la stanza stessa nel 3D, se preferisci toccarlo lì.',
  'tut.inicio.1.texto':
    'Il pulsante con il nome della tua casa apre la schermata iniziale: le tue app in una griglia, con la meccanica di un telefono.',
  'tut.inicio.2.titulo': 'Un tocco, un\'app',
  'tut.inicio.2.texto':
    'Qui compaiono solo le stanze che hanno già un\'app, con il loro livello, la loro serie e le loro liste completate. Il contatore rosso nell\'angolo sono le loro missioni ancora in sospeso oggi, e toccare la scheda entra dritto.',
  'tut.inicio.3.titulo': 'Tieni premuta una scheda',
  'tut.inicio.3.texto':
    'La pressione lunga la solleva e tutte tremano, come su un telefono: trascinala per riordinare, o tocca la matita nel suo angolo per modificarne la scheda.',
  'tut.inicio.4.titulo': 'La tua sfida, sott\'occhio',
  'tut.inicio.4.texto':
    'I due anelli sono la Montagna di Sisifo: il grado dell\'anno e i distintivi vinti. Toccarli apre la montagna completa, la stessa del menu laterale.',
  'tut.inicio.5.titulo': 'Sfondo e vista 3D',
  'tut.inicio.5.texto':
    'Questo pulsante mette uno sfondo alla griglia, attenuato perché le schede restino leggibili. Quello accanto alterna tra l\'icona di ogni stanza e la sua miniatura ammobiliata in 3D.',
  'tut.inicio.6.texto':
    'Creare stanze, eliminarle o assegnare app resta compito del menu laterale: questa schermata serve a entrare in fretta. Si chiude toccando fuori.',
  'tut.herramientas.1.texto': 'Questo pulsante apre la ruota degli strumenti del tuo personaggio.',
  'tut.herramientas.2.titulo': 'Due livelli',
  'tut.herramientas.2.texto':
    'Prima scegli la categoria, poi lo strumento preciso al suo interno. Puoi equipaggiare fino a 3 strumenti alla volta, della stessa categoria o di categorie diverse.',
  'tut.herramientas.3.titulo': 'La quarta categoria',
  'tut.herramientas.3.texto':
    'Costruzione non equipaggia un giocattolo: attiva la modalità di disegno della mappa (stanze, muri, porte, finestre, pavimenti, tetti) senza passare dall\'editor completo. È lo stesso schizzo, solo che ci arrivi prima.',
  'tut.herramientas.4.titulo': 'Il centro',
  'tut.herramientas.4.texto':
    'Il centro lascia tutto ciò che hai equipaggiato e riporta l\'angolo al suo stato normale (il cubo delle viste o un altro comando contestuale, secondo quello che hai vicino).',
  'tut.herramientas.5.texto':
    'Si chiude toccando fuori dalla ruota. Provala quando vuoi: niente di tutto questo si salva come permanente, dura solo finché lo porti addosso.',
  'tut.navegacion.1.texto':
    'Tre telecamere: Iso (vista da casa delle bambole), terza e prima persona. Cambia qui o con il tasto V.',
  'tut.navegacion.2.titulo': 'Orientarsi',
  'tut.navegacion.2.texto':
    'In iso comandi la telecamera con il cubo: i suoi angoli danno le angolazioni isometriche e le sue facce, le viste piatte. In 3ª/1ª il suo posto lo occupa un pad che trascini per guardarti intorno.',
  'tut.navegacion.3.titulo': 'Quando hai qualcosa vicino',
  'tut.navegacion.3.texto':
    'Quello stesso angolo smette di essere telecamera appena ti avvicini a qualcosa di interattivo: un campo offre il suo pulsante per giocare, un veicolo quello per salirci, una sedia quello per sederti. Una cosa sola alla volta, e sempre per vicinanza: mai in automatico.',
  'tut.navegacion.4.titulo': 'Ruotare e centrare',
  'tut.navegacion.4.texto':
    'Ogni freccia gira di un quarto di giro: la mappa in iso, il tuo sguardo in 3ª/1ª. Il terzo pulsante compare solo con la mappa davanti, e la ricentra se esplorando hai perso l\'orientamento.',
  'tut.navegacion.5.titulo': 'Muoversi',
  'tut.navegacion.5.texto':
    'Cammina con il joystick, WASD o le frecce. Nell\'acqua nuoti; in sella a un veicolo guidi con gli stessi comandi.',
  'tut.navegacion.6.texto':
    'Il pulsante Editor in alto funziona in qualsiasi vista: aprilo in 3ª/1ª persona e modifichi camminando, toccando oggetti, muri o personaggi lì dove sono.',
  'tut.chat.1.texto':
    'La chat dell\'architetto: registra la tua giornata, modifica la casa e risponde ai tuoi dubbi, tutto dalla stessa casella.',
  'tut.chat.2.titulo': 'Scrivere',
  'tut.chat.2.texto':
    'Scrivi liberamente: «ho corso 20 min», «ho speso 250 al supermercato»… Il chip di fianco mostra a quale app andrà. Usa @stanza per forzare la destinazione se indovina male.',
  'tut.chat.3.titulo': 'Dettare a voce',
  'tut.chat.3.texto':
    'Il microfono trascrive quello che dici nella casella di testo: comodo per registrare senza mollare quello che hai in mano.',
  'tut.chat.4.titulo': 'Allegare',
  'tut.chat.4.texto':
    'Il + apre cinque opzioni: caricare un\'immagine o un PDF e scattare una foto —con l\'IA attiva, uno scontrino o la bilancia si interpretano da soli— più due che non chiedono IA: la maschera AR e la chat AR.',
  'tut.chat.4b.titulo': 'La maschera AR',
  'tut.chat.4b.texto':
    'Accende la fotocamera e ti mette la maschera sul viso, seguendoti dal vivo — la stessa del video di presentazione della casa. Funziona senza IA e senza account.',
  'tut.chat.4c.titulo': 'La chat AR',
  'tut.chat.4c.texto':
    'La stessa conversazione di sempre, ma con la tua fotocamera sullo sfondo e l\'assistente in 3D davanti, con emozioni che accompagnano quello che risponde.',
  'tut.chat.5.titulo': 'Assistenti',
  'tut.chat.5.texto':
    'Il tuo assistente dà un volto e una voce alle risposte. Toccalo per vedere la conversazione, cambiare assistente o crearne altri.',
  'tut.chat.6.titulo': 'Il manuale',
  'tut.chat.6.texto': 'Il manuale elenca i comandi: aggiungere o togliere stanze, creare oggetti, ricordare cose…',
  'tut.chat.7.titulo': 'Il modello di IA',
  'tut.chat.7.texto':
    'Questa icona sceglie quale IA risponde e conserva la tua chiave se usi la tua. Senza nessuna configurata la chat continua a funzionare per parole chiave, senza capire il linguaggio libero.',
  'tut.chat.8.texto':
    'Puoi anche chiedere «come funziona la Cucina?» o «tutorial di Palestra» proprio qui, e quello che è rimasto salvato si rivede nel tour Registri e memorie.',
  'tut.chat-registros.1.texto':
    'Chat mostra con chi hai parlato; Registrazioni, quello che è rimasto salvato di quelle conversazioni.',
  'tut.chat-registros.2.titulo': 'Cosa ricorda di te',
  'tut.chat-registros.2.texto':
    'Dati che l\'assistente ha deciso valesse la pena ricordare tra una sessione e l\'altra —un\'allergia, un obiettivo, una preferenza— per non doverteli chiedere di nuovo. Si dimenticano toccando la loro ✕.',
  'tut.chat-registros.3.texto':
    'Quello che registri nelle tue app (pasti, spese, sessioni) vive in ogni app, non qui: questa scheda è solo la memoria della conversazione stessa.',
  'tut.app-generica.1.texto':
    'L\'intestazione mostra la stanza e l\'app aperta. Se la stanza ha più app, la freccia ‹ torna alla selezione delle app.',
  'tut.app-generica.2.titulo': 'Missioni',
  'tut.app-generica.2.texto':
    'Il pulsante Missioni apre l\'oggi di questa app: i suoi obiettivi, quello che hai in agenda e quello che chiedono i tuoi obiettivi in corso. Ogni passo si spunta da solo appena registri, e completare la lista intera è ciò che dà gli XP del giorno.',
  'tut.app-generica.3.titulo': 'I blocchi',
  'tut.app-generica.3.texto':
    'Questo modello è costruito con blocchi (note, liste, contatori, abitudini…). Puoi cambiarli in Menu › Modelli › modifica.',
  'tut.app-generica.4.titulo': 'Uscire',
  'tut.app-generica.4.texto':
    '«Torna a casa» chiude l\'app e ti lascia di nuovo nel 3D. Quello che hai registrato qui è già salvato.',
  'tut.enlaces.1.titulo': 'Dall\'obiettivo alla sua app',
  'tut.enlaces.1.texto':
    'Qualsiasi obiettivo o passo di un piano può portare un chip con l\'icona di un\'app: è la risposta a «e questo dove si registra?».',
  'tut.enlaces.2.titulo': 'Metterlo o cambiarlo',
  'tut.enlaces.2.texto':
    '«Collega app» apre il selettore: prima scegli l\'app, poi a quale sua parte, se ha più di un posto dove registrare.',
  'tut.enlaces.3.titulo': 'Il chip una volta messo',
  'tut.enlaces.3.texto':
    'Con il chip al suo posto, toccarlo apre quell\'app dritto in quella sezione. Rimuoverlo non cancella l\'obiettivo né le sue date: stacca solo il collegamento.',
  'tut.enlaces.4.texto':
    'Come destinazione compaiono solo le app assegnate a un oggetto di una stanza: collegarne una senza stanza sarebbe un chip che non porta da nessuna parte.',
  'tut.musica.1.texto': 'Questo pulsante apre il controllo della musica della casa.',
  'tut.musica.2.titulo': 'Accesa o spenta',
  'tut.musica.2.texto':
    'Un interruttore per tutta la musica ambientale della casa. Spenta, la casa resta in silenzio, tranne i suoni delle singole azioni.',
  'tut.musica.3.titulo': 'Tema per stanza',
  'tut.musica.3.texto':
    'Ogni stanza può suonare diversa: automatico secondo la sua app, uno scelto a mano, o silenzio totale in quella stanza senza toccare il resto della casa.',
  'tut.musica.4.titulo': 'Da dove arriva il suono',
  'tut.musica.4.texto':
    'Generata (compone da sola in base all\'atmosfera), Le mie tracce (quello che hai caricato) o Sistema (quello che stai già ascoltando fuori dall\'app, senza che venga coperto).',
  'tut.musica.5.titulo': 'Volumi separati',
  'tut.musica.5.texto':
    'La musica e i suoni delle azioni (passi, clic, traguardi) si regolano separatamente — puoi abbassare la musica e lasciare gli effetti, o il contrario.',
  'tut.musica.6.texto':
    'Il pulsante dell\'HUD si può togliere dalla schermata principale; resta comunque disponibile in Editor › Impostazioni › Musica.',
  'tut.cuenta-ia.1.texto':
    'Qui si accende l\'IA della casa: senza, la chat continua a funzionare per parole chiave, e funzioni come generare una ricetta, un piano o un\'immagine restano spente.',
  'tut.cuenta-ia.2.titulo': 'Con o senza account',
  'tut.cuenta-ia.2.texto':
    'Puoi usare l\'IA con la tua chiave del fornitore (senza account, senza crediti) o con un account che porta crediti e sincronizza tra dispositivi.',
  'tut.cuenta-ia.3.titulo': 'Prezzi dell\'IA',
  'tut.cuenta-ia.3.texto':
    'Questa tabella è informativa anche senza account: è esattamente quello che serve per decidere se ne vale la pena. Si vede stanza per stanza, operazione per operazione.',
  'tut.cuenta-ia.4.titulo': 'L\'unica leva',
  'tut.cuenta-ia.4.texto':
    'La qualità delle immagini è l\'unica cosa che cambia i prezzi di tutta la tabella: Veloce è buona ed economica (quella predefinita); Buona dà più dettaglio e testo migliore dentro l\'immagine.',
  'tut.cuenta-ia.5.titulo': 'Un\'unità, tante operazioni',
  'tut.cuenta-ia.5.texto':
    'Una risposta costa 1 credito, un piano lungo 3, un\'immagine o un modello 3D 10 — la regola è la stessa per tutte le stanze, questa tabella la dispiega solo una per una.',
  'tut.ejemplos.1.texto':
    'Questa barra compare in quasi ogni app finché non ha ancora dati tuoi: un pulsante per vederla piena di esempio, invece di iniziare davanti a una schermata vuota.',
  'tut.ejemplos.2.texto':
    'Vedere un esempio non cancella né mescola niente di tuo: sono righe a sé, marcate come esempio, che si nascondono (non si cancellano) quando lo spegni. Riaccenderlo le riporta esattamente com\'erano.',
  'tut.ejemplos.3.texto':
    'Nella casa demo questa barra non compare: l\'anno intero di Pep svolge già quel ruolo, quindi non serve un esempio a parte.',
  'tut.hoy.1.texto':
    'Nell\'intestazione di ogni app vive il suo pulsante Missioni: la checklist di ciò che quell\'app ti chiede OGGI. L\'orologio della casa ha lo stesso pulsante con tutte le app insieme.',
  'tut.hoy.2.titulo': 'Tre fonti, una lista',
  'tut.hoy.2.texto':
    'Gli obiettivi propri dell\'app (l\'acqua, le calorie), quello che hai programmato per oggi nel calendario e i passi dei tuoi obiettivi in corso: tutto insieme, raggruppato sotto il piano o l\'obiettivo da cui viene ogni passo.',
  'tut.hoy.2b.titulo': 'I tuoi propositi, in alto',
  'tut.hoy.2b.texto':
    'Sopra la checklist vivono gli obiettivi di questa app, con il loro avanzamento e la loro scadenza. Toccarne uno apre il suo piano proprio qui, senza uscire dal pannello, e con «+ obiettivo» te ne proponi un altro.',
  'tut.hoy.3.titulo': 'Si spunta perché il dato esiste',
  'tut.hoy.3.texto':
    'Il pulsante della riga registra il dato REALE nell\'app — un bicchiere d\'acqua, un pasto — e il passo si spunta da solo perché quella registrazione ormai c\'è, non perché qualcuno l\'ha segnata. Premerlo di nuovo a passo compiuto non duplica niente: il pulsante sparisce.',
  'tut.hoy.4.titulo': 'La tua cifra di ogni giorno',
  'tut.hoy.4.texto':
    'I passi con una cifra regolabile la cambiano proprio qui. Metterla a 0 spegne quel traguardo del giorno senza cancellare lo storico dei giorni precedenti.',
  'tut.hoy.5.titulo': 'Da un traguardo a una routine',
  'tut.hoy.5.texto':
    'Il calendario programma quello stesso traguardo a un\'ora fissa: apre lo stesso editor delle routine dell\'orologio, così resta registrato in tutti e due i posti insieme.',
  'tut.hoy.6.titulo': 'Quello che è fatto non sparisce',
  'tut.hoy.6.texto':
    'Scende in «Fatti», chiuso: vedere la registrazione fare effetto fa parte della ricompensa, e da lì puoi annullarla se ne è scappata una di troppo.',
  'tut.hoy.6b.titulo': 'È la lista intera a fare punti',
  'tut.hoy.6b.texto':
    'Completare tutte le missioni del giorno accende la celebrazione e somma gli XP dell\'app: il livello cresce per liste completate, non per registrazioni sparse.',
  'tut.hoy.7.texto':
    'E se ti manca qualcosa, «Nuova checklist» crea la tua: una lista propria di quest\'app che si ripete ogni giorno. Gli obiettivi da cui nascono questi passi si pianificano nella stanza Obiettivi.',
  'tut.progreso.1.texto':
    'La scheda del tuo personaggio: Pep ha alle spalle un anno intero di attività reale, quindi ogni numero qui ha una storia vera che lo spiega.',
  'tut.progreso.2.titulo': 'Il personaggio',
  'tut.progreso.2.texto':
    'Toccarlo apre l\'editor dei personaggi. Il suo umore —felice, contento, triste o addormentato— sale a ogni nuova registrazione e scende solo se passano giorni senza nessuna; non si azzera mai di colpo.',
  'tut.progreso.3.titulo': 'Il grado di Sisifo',
  'tut.progreso.3.texto':
    'Dodici gradi di scalata: ogni giorno con attività sale un gradino su 365. Pep ne ha già conquistati diversi; toccalo per vedere la montagna intera.',
  'tut.progreso.4.titulo': 'Gradini e giorni di grazia',
  'tut.progreso.4.texto':
    'Ogni 7 gradini arriva un distintivo, ogni tratto di settimane fa salire di grado. Saltare un giorno non rompe niente: ci sono 2 giorni di grazia al mese prima di tornare all\'inizio del grado attuale.',
  'tut.progreso.5.titulo': '52 distintivi per famiglia',
  'tut.progreso.5.texto':
    'Raggruppati per famiglia geologica, tenuti nel mistero finché non si conquistano: né nome né descrizione si vedono prima dello sblocco.',
  'tut.progreso.6.titulo': 'Il tuo riepilogo',
  'tut.progreso.6.texto':
    'Wrapped costruisce il riepilogo della tua settimana, del mese o dell\'anno in slide — ha un tour tutto suo, con dati in abbondanza in un anno come quello di Pep.',
  'tut.progreso.7.titulo': 'Il radar per stanza',
  'tut.progreso.7.texto':
    'Ogni vertice è una stanza della casa, e la sua dimensione è la somma degli XP delle app che le sono assegnate. Una stanza senza attività si nota al volo: il suo vertice sprofonda verso il centro.',
  'tut.wrapped.1.texto':
    'Stile storie: tocca il lato destro per andare avanti, il sinistro per tornare indietro, e tieni premuto per fermarti su una slide.',
  'tut.wrapped.2.titulo': 'Settimana, mese o anno',
  'tut.wrapped.2.texto':
    'Ogni tipo costruisce le sue slide con i suoi dati — il riepilogo dell\'anno di Pep è il più lungo, con i momenti più alti e più bassi di tutto l\'anno.',
  'tut.wrapped.3.titulo': 'Muoversi tra i periodi',
  'tut.wrapped.3.texto':
    'Le frecce ‹ › percorrono i periodi già chiusi: non si può andare oltre oggi, così il confronto è sempre con qualcosa di reale.',
  'tut.wrapped.4.titulo': 'Condividere una slide',
  'tut.wrapped.4.texto':
    'Copia il testo della slide che stai guardando, pronto da incollare dove vuoi — senza bisogno di screenshot.',
  'tut.wrapped.5.texto':
    'Un puntino accanto al pulsante che lo apre avvisa quando c\'è un riepilogo nuovo da vedere; aprirlo lo spegne.',
  'tut.infra-huerto--ciclo.8.texto':
    'Questo è il santuario di Pep: da un lato i recinti e dall\'altro l\'orto che li nutre. Andiamo alle aiuole.',
  'tut.infra-huerto--ciclo.1.texto':
    'Questo è l\'orto del santuario di Pep: aiuole vere, con un anno di lavoro addosso. Niente di tutto questo è un esempio — è vivo, cresce in tempo reale e puoi toccarlo.',
  'tut.infra-huerto--ciclo.2.texto':
    'Cibo e Fattoria condividono lo stesso editor: quello che raccogli qui riempie la dispensa degli animali qui accanto. È un\'unica catena.',
  'tut.infra-huerto--ciclo.3.titulo': 'L\'acqua comanda',
  'tut.infra-huerto--ciclo.3.texto':
    'Guarda le aiuole: un seme appena messo, piante a metà crescita, un girasole pronto… e una carota appassita che Pep ha lasciato senz\'acqua di proposito. La goccia blu avverte della sete; ciò che è appassito non si salva più.',
  'tut.infra-huerto--ciclo.4.titulo': 'Irrigazione automatica',
  'tut.infra-huerto--ciclo.4.texto':
    'Il pomodoro ha un irrigatore: annaffia la sua cella e le otto vicine, per sempre. Così puoi lasciare l\'orto da solo senza che appassisca nulla.',
  'tut.infra-huerto--ciclo.5.titulo': 'Raccogli',
  'tut.infra-huerto--ciclo.5.texto':
    'Il girasole è pronto: un tocco e finisce nella cesta. Si raccoglie anche camminando sopra ciò che è pronto, senza aprire questo editor.',
  'tut.infra-huerto--ciclo.6.titulo': 'Un anno nella cesta',
  'tut.infra-huerto--ciclo.6.texto':
    'Ogni aiuola tiene il conto dei suoi raccolti e la cesta accumula quelli di tutto l\'anno — più di 400 pezzi. Da qui mangiano gli animali del santuario.',
  'tut.infra-huerto--ciclo.7.texto':
    'Tutto continua a correre anche quando esci. Nella demo puoi annaffiare, raccogliere e seminare davvero: provaci prima di andartene.',
  'tut.infra-huerto--parcelas.1.titulo': 'Prima la terra',
  'tut.infra-huerto--parcelas.1.texto':
    'Con Aiuola tocchi una cella della mappa e resta terra pronta. Nel santuario ci sono due aiuole vuote che ti aspettano.',
  'tut.infra-huerto--parcelas.2.titulo': 'Scegliere cosa seminare',
  'tut.infra-huerto--parcelas.2.texto':
    'Sei specie, e sotto ognuna quanto ci mette e ogni quanto chiede acqua: la carota in 3 minuti, la zucca in 2 ore.',
  'tut.infra-huerto--parcelas.3.titulo': 'La più veloce',
  'tut.infra-huerto--parcelas.3.texto':
    'Per vedere il ciclo completo oggi, semina una carota in un\'aiuola libera: sarà pronta prima che tu finisca il giro.',
  'tut.infra-huerto--parcelas.4.titulo': 'Annulla',
  'tut.infra-huerto--parcelas.4.texto':
    'Rimuovi va uno strato alla volta sulla stessa cella: prima la pianta, poi l\'irrigatore e infine l\'aiuola.',
  'tut.infra-huerto--parcelas.5.texto':
    'È tutto qui: terra, specie e pazienza. Quello che semini nella demo cresce davvero mentre esplori il resto.',
  'tut.infra-granja--cuidar.8.texto':
    'Questo è il santuario di Pep: i recinti dei salvati e, a sud, l\'orto da cui mangiano. Scendiamo da loro.',
  'tut.infra-granja--cuidar.1.texto':
    'Questi sono i salvati del santuario di Pep: ognuno con il suo nome, la sua fame e il suo umore che corrono in tempo reale. Niente è un esempio — puoi prendertene cura davvero.',
  'tut.infra-granja--cuidar.2.titulo': 'La dispensa dell\'anno',
  'tut.infra-granja--cuidar.2.texto':
    'Nutrire consuma dalla cesta, e la cesta si riempie raccogliendo nell\'orto qui accanto. Pep ha lasciato scorte per un anno: usale.',
  'tut.infra-granja--cuidar.3.titulo': 'Nutri',
  'tut.infra-granja--cuidar.3.texto':
    'Un tocco sul recinto dà da mangiare a tutti quelli che hanno fame, a partire dal più affamato. La gallina chiede ogni 4 ore; la mucca regge 12.',
  'tut.infra-granja--cuidar.4.titulo': 'Coccola',
  'tut.infra-granja--cuidar.4.texto':
    'Sei ore senza coccole e si annoiano (il doppio più in fretta se il recinto è sporco). Un tocco accarezza tutto il recinto.',
  'tut.infra-granja--cuidar.5.titulo': 'Il recinto sporco',
  'tut.infra-granja--cuidar.5.texto':
    'Il recinto piccolo è da otto giorni senza pulizia — si vede dalla paglia. Toccalo con Pulisci e rimettilo a nuovo: nella demo si può.',
  'tut.infra-granja--cuidar.6.titulo': 'L\'ultimo arrivato',
  'tut.infra-granja--cuidar.6.texto':
    'Il maiale è arrivato malato al santuario stamattina. Un animale malato smette di mangiare e solo Cura lo rimette in piedi — ha una settimana prima che sia tardi. Curalo tu.',
  'tut.infra-granja--cuidar.7.texto':
    'Per il giorno per giorno non serve aprire questo editor: camminando accanto a un recinto esce la sua bolla con Nutri e Coccola, e puoi anche chiedermelo in chat.',
  'tut.infra-granja--corrales.1.titulo': 'Il recinto',
  'tut.infra-granja--corrales.1.texto':
    'Tocca una cella libera e nasce un recinto 1×1; tocca una cella attaccata e si allunga. Ci stanno tre animali per cella: guarda i due del santuario, uno grande da pascolo e uno piccolo per il pollame.',
  'tut.infra-granja--corrales.2.titulo': 'Le specie',
  'tut.infra-granja--corrales.2.texto':
    'Sei specie, ognuna con la sua finestra di fame. Tocca dentro un recinto con posto libero e l\'animale compare, nome incluso.',
  'tut.infra-granja--corrales.3.titulo': 'Giocattoli',
  'tut.infra-granja--corrales.3.texto':
    'Pozza di fango, vasca e palla, uno per cella: gli animali ci vanno da soli e giocare gli tira su l\'umore. Nel santuario ci sono già tutti e tre.',
  'tut.infra-granja--corrales.4.titulo': 'Nomi',
  'tut.infra-granja--corrales.4.texto':
    'Con Dai un nome tocchi un recinto e vedi la sua lista con la capacità usata; tocca un animale per rinominarlo.',
  'tut.infra-granja--corrales.5.texto':
    'Il mestiere è tutto qui: recinto, capacità, giocattoli e affetto. Nella demo puoi ampliare il santuario, se ti va.',
  'tut.infra-caminos--carrera.1.texto':
    'Questa è la pista di Pep: un ovale d\'asfalto con il traguardo a scacchi. È l\'unico traguardo della mappa — tutta la modalità corsa gli gira intorno.',
  'tut.infra-caminos--carrera.2.texto':
    'Ecco il traguardo. Avvicinati alla bicicletta o all\'auto nel cortile e sali con il suo pulsante; una volta a bordo, passa su questa linea e compare il semaforo.',
  'tut.infra-caminos--carrera.3.texto':
    'Stai attaccato all\'ovale e derapa in curva per non perdere velocità. Puoi anche correre contro un assistente, con gli oggetti di mezzo: banana, turbo e bomba.',
  'tut.infra-caminos--carrera.4.texto':
    'Accanto al traguardo vive la tabella dei tempi: la bicicletta di Pep ha 38 vittorie e un miglior giro di 41,8 s. Battilo — i record che fai nella demo restano salvati.',
  'tut.infra-caminos--carrera.5.texto':
    'Anche il binario che gira intorno alla mappa e le montagne russe del luna park sono circuiti: cammina sui binari e compare «Sali». Ogni tracciato è una rete a sé.',
  'tut.infra-caminos--trazos.1.texto':
    'Ci sono tre tracciati, e da quassù si vedono tutti e tre: pista (per le corse), binario (il treno che gira intorno alla mappa) e coaster (le montagne russe, con altezze per cella). Non si mescolano nemmeno se si toccano: ognuno cerca vicini del proprio tipo.',
  'tut.infra-caminos--trazos.2.texto':
    'Le montagne russe del luna park salgono fino a sei livelli e le rampe tra una cella e l\'altra si interpolano da sole. Sali: il carrello percorre tutto il circuito chiuso.',
  'tut.infra-caminos--trazos.3.texto':
    'Nella tua casa li disegni cella per cella con l\'editor Circuiti, oppure a mano libera con il Tracciato libero per settori. Qui nella demo la mappa arriva già tracciata.',
  'tut.infra-canchas--jugar.1.texto':
    'Questo è il centro sportivo di Pep: calcio, pallacanestro, tennis e baseball, uno accanto all\'altro. Ogni campo è un rettangolo sulla mappa — entrarci camminando fa partire il suo gioco.',
  'tut.infra-canchas--jugar.2.texto':
    'Il pulsante di carica compare nello spazio del cubo di navigazione e tira dove guarda il tuo personaggio: prima mira, poi carica.',
  'tut.infra-canchas--jugar.3.texto':
    'In basso, il campo da baseball e quello da tennis: il tennis ha rimbalzo e palleggio, il baseball è pura battuta, contro la macchina o contro un lanciatore.',
  'tut.infra-canchas--jugar.5.texto':
    'In alto, il campo da calcio e quello da pallacanestro. Il calcio si gioca di dribbling e tiro; la pallacanestro, misurando la potenza del lancio.',
  'tut.infra-canchas--jugar.4.texto':
    'Il punteggio si salva per campo: Pep ha lasciato un 21-15 nella pallacanestro e una serie di 18 palleggi nel tennis. Nella demo le partite contano — migliorali.',
  'tut.infra-paintball--batalla.1.texto':
    'Apri la ruota degli strumenti: lì dentro vive Paintball, nella categoria di costruzione e giochi, accanto ai veicoli.',
  'tut.infra-paintball--batalla.2.texto':
    'Scegli la modalità: 1 contro 1, 2 contro 2 o battaglia reale. I tuoi avversari sono gli assistenti della mappa — Laika compresa — e si gioca al piano terra.',
  'tut.infra-paintball--batalla.3.texto':
    'Tutta la casa è il campo di battaglia: riparati dietro i muri, sporgiti per sparare e guardati le spalle. Gli schizzi di vernice restano dipinti per tutta la battaglia.',
  'tut.infra-paintball--batalla.4.texto':
    'Il punteggio di Pep è di 47 vittorie contro 23 sconfitte. Nella demo le battaglie contano davvero: alzalo prima di andartene.',
  'tut.app-anecdotario--diario.1.texto':
    'Questo è il diario di Pep: un anno intero, due o tre voci a settimana. Qui c\'è TUTTO l\'arco — dalla stanchezza del primo mese alla maratona di due settimane fa.',
  'tut.app-anecdotario--diario.2.titulo': 'Si scrive così',
  'tut.app-anecdotario--diario.2.texto':
    'Scegli l\'umore del giorno, metti un titolo se vuoi, scrivi e allega le foto. Basta anche solo una foto: il testo non è obbligatorio.',
  'tut.app-anecdotario--diario.3.titulo': 'L\'anno a colori',
  'tut.app-anecdotario--diario.3.texto':
    'Ogni giorno si colora con il suo umore. Guarda il calo del mese 7 (l\'infortunio) e quanto brilla il Giappone. Tocca un giorno per filtrare le sue voci.',
  'tut.app-anecdotario--diario.4.titulo': 'L\'archivio',
  'tut.app-anecdotario--diario.4.texto':
    'Le voci si archiviano da sole in cartelle per anno, mese e settimana. Apri le settimane del Giappone e leggi il viaggio per intero.',
  'tut.app-anecdotario--fotos.1.texto':
    'Le tappe dell\'anno di Pep hanno la loro foto: la tastiera usata, l\'arrivo di Laika, due cartoline dal Giappone e la medaglia della maratona.',
  'tut.app-anecdotario--fotos.2.titulo': 'Cercale nella cronologia',
  'tut.app-anecdotario--fotos.2.texto':
    'Apri il mese 2 (la tastiera), il mese 9 (il Giappone) o due settimane fa (la medaglia). Tocca una foto qualsiasi e si apre a schermo intero.',
  'tut.app-anecdotario--fotos.3.texto':
    'Ogni voce alimenta la serie e sveglia il personaggio: scrivere qui è anche prendersi cura della casa.',
  'tut.app-jardin--practicar.1.titulo': 'La calma accumulata',
  'tut.app-jardin--practicar.1.texto':
    'Ogni minuto di pratica innaffia questo giardino. Quello di Pep è cresciuto per un anno intero: da seme a foresta.',
  'tut.app-jardin--practicar.2.titulo': 'Meditare con il suono',
  'tut.app-jardin--practicar.2.texto':
    'Scegli una traccia (foresta, oceano, pioggia, campane tibetane) e una durata, oppure medita in silenzio con la campana. La sessione si salva da sola quando finisce.',
  'tut.app-jardin--practicar.3.titulo': 'Un anno di sessioni',
  'tut.app-jardin--practicar.3.texto':
    'Ecco l\'anno di Pep: è partito da tre volte a settimana e nel mese 7 —l\'infortunio, la spesa dell\'auto— la pratica è diventata quasi quotidiana. È stata lei a reggere il calo.',
  'tut.app-jardin--practicar.4.titulo': 'Respirare',
  'tut.app-jardin--practicar.4.texto':
    'Due schemi guidati: la scatola 4-4-4-4 per centrarti e il 4-7-8 per lasciare andare la giornata. Lo schermo respira con te.',
  'tut.app-jardin--gratitud.1.titulo': 'Oggi ringrazio per…',
  'tut.app-jardin--gratitud.1.texto':
    'Tre righe al giorno. Uno basta; tre, meglio. Si salva una voce al giorno e si può correggere strada facendo.',
  'tut.app-jardin--gratitud.2.titulo': 'Quelli di Pep',
  'tut.app-jardin--gratitud.2.texto':
    'Novanta giorni di ringraziamenti veri: la tastiera, Laika addormentata sugli appunti, il ginocchio che guarisce, tornare dal Giappone. Leggili con calma.',
  'tut.app-jardin--gratitud.3.texto':
    'Questa stanza non tiene serie e non ti punisce se salti un giorno: è voluto. La calma non è una gara.',
  'tut.app-hobbies--piano.1.titulo': 'Due hobby, un anno',
  'tut.app-hobbies--piano.1.texto':
    'Pep ne ha registrati due: il pianoforte (il progetto dell\'anno, obiettivo di 4 giorni a settimana) e l\'astrofotografia. Ogni scheda mostra la settimana in corso e la serie.',
  'tut.app-hobbies--piano.2.titulo': 'Dentro il pianoforte',
  'tut.app-hobbies--piano.2.texto':
    'Serie, miglior serie, totale praticato, giorni attivi e media. Un anno di tasti — con l\'onesta pausa del Giappone.',
  'tut.app-hobbies--piano.3.titulo': 'La mappa di calore',
  'tut.app-hobbies--piano.3.texto':
    'Ogni quadratino è un giorno. Si vede la partenza del mese 2, come il pianoforte ha RETTO il calo del mese 7 e il vuoto delle tre settimane in Giappone.',
  'tut.app-hobbies--piano.4.titulo': 'Le sessioni',
  'tut.app-hobbies--piano.4.texto':
    'Ogni pratica con i suoi minuti e, molte, con una nota: da «mi fanno male le mani» a suonare «Clair de Lune» per intero.',
  'tut.app-hobbies--piano.5.titulo': 'Progetti',
  'tut.app-hobbies--piano.5.texto':
    'La pratica con una direzione: il primo brano (finito nel mese 5) e «Clair de Lune», suonato per la famiglia una settimana fa.',
  'tut.app-hobbies--proyectos.1.titulo': 'I progetti del pianoforte',
  'tut.app-hobbies--proyectos.1.texto':
    'Un progetto raccoglie le sessioni che gli hai dedicato: qui vedi quante sono e quanti minuti ha accumulato ciascuno.',
  'tut.app-hobbies--proyectos.2.titulo': 'I progressi in foto',
  'tut.app-hobbies--proyectos.2.texto':
    '«Clair de Lune» conserva lo spartito annotato. Nell\'astrofotografia, il progetto delle dodici lune piene raccoglie i migliori scatti dell\'anno.',
  'tut.app-hobbies--proyectos.3.texto':
    'Puoi anche registrare le sessioni dalla chat («ho praticato piano 30 min») e pianificare gli obiettivi del progetto con il pianificatore.',
  'tut.app-hobbies--gestion.1.titulo': 'Aggiungere un hobby',
  'tut.app-hobbies--gestion.1.texto':
    'Nome, emoji, colore e —facoltativo— un obiettivo settimanale in giorni. Quel modulo è tutto quello che serve per iniziare a tenerne traccia.',
  'tut.app-hobbies--gestion.2.titulo': 'L\'obiettivo settimanale',
  'tut.app-hobbies--gestion.2.texto':
    'Il pianoforte si è dato 4 giorni a settimana: la riga della settimana si colora a ogni giorno praticato, e in alto vedi a quanti sei rispetto all\'obiettivo.',
  'tut.app-hobbies--gestion.3.titulo': 'Registrare una pratica',
  'tut.app-hobbies--gestion.3.texto':
    'Minuti rapidi con un tocco, o il numero esatto; il progetto è facoltativo e la nota serve per quello che vuoi ricordare di quella sessione.',
  'tut.app-hobbies--gestion.4.texto':
    'Gli obiettivi dei tuoi hobby e progetti vivono nella stanza Obiettivi, ognuno con il suo piano e il suo programma. Chiedi all\'IA un piano con fasi e date.',
  'tut.app-ideas--diario.1.titulo': 'La cassetta delle idee',
  'tut.app-ideas--diario.1.texto':
    'Scrivi quello che ti passa per la testa e basta. Pep ne ha buttate qui ~90 in un anno: di fisica, del bar, dell\'allenamento. La stella segna le preferite.',
  'tut.app-ideas--diario.2.titulo': 'Brainstorming per tema',
  'tut.app-ideas--diario.2.texto':
    'Un brainstorming raccoglie tutto sotto un tema. Cerca quelli di Pep: i nomi per la gatta (ha vinto Laika), come pagarsi il Giappone e cosa mettere in valigia.',
  'tut.app-ideas--diario.3.texto':
    'Quando un brainstorming è maturo, un pulsante lo trasforma in mappa mentale e continui a ordinarlo sulla tela.',
  'tut.app-ideas--mapas.1.titulo': 'Dieci formati',
  'tut.app-ideas--mapas.1.texto':
    'Ogni formato disegna in modo diverso. Sotto ci sono le mappe che Pep ha fatto durante l\'anno: la sua routine del mattino come flusso, la termodinamica ad albero, fisica e musica in Venn.',
  'tut.app-ideas--mapas.2.titulo': '«La mia vita ideale»',
  'tut.app-ideas--mapas.2.texto':
    'La PRIMA mappa dell\'anno, del mese 1: la vita che Pep voleva. Guardala con calma — quasi tutto quello che c\'è qui è poi successo davvero.',
  'tut.app-ideas--mapas.3.texto':
    'Sulla tela: tocca un nodo per selezionarlo e ancora per scrivere; trascinalo, fai zoom con le dita e aggiungi idee con la barra in basso.',
  'tut.app-ideas--mapas.4.titulo': 'Una mappa intera, da un argomento',
  'tut.app-ideas--mapas.4.texto':
    'Dai un argomento all\'IA e ti costruisce la mappa completa, con i nodi già organizzati: il punto di partenza quando un argomento non sai da che parte prenderlo.',
  'tut.app-ideas--mapas.5.titulo': 'Espandere un nodo con l\'IA',
  'tut.app-ideas--mapas.5.texto':
    'Una volta dentro una mappa, qualsiasi nodo si può espandere: l\'IA propone dei sotto-nodi a partire da quello che hai già scritto intorno, senza rompere la tua struttura.',
  'tut.app-ideas--decidir.1.titulo': 'Otto modi di decidere',
  'tut.app-ideas--decidir.1.texto':
    'Pep li ha usati sul serio: un Eisenhower nella settimana degli esami, uno SWOT a metà anno e una matrice per scegliere la fotocamera.',
  'tut.app-ideas--decidir.2.titulo': 'Magistrale o lavoro?',
  'tut.app-ideas--decidir.2.texto':
    'LA decisione aperta di fine anno: ogni lato con il suo peso da 1 a 5 e il totale in fondo. Non è ancora presa — ecco che aspetto ha pensarci sul serio.',
  'tut.app-ideas--decidir.3.texto':
    'Nei formati a zone ogni elemento vive in una zona: scegliela sotto prima di aggiungerlo, oppure trascinalo in un\'altra e si sposta da solo.',
  'tut.app-ideas--decidir.4.titulo': 'La matrice ponderata',
  'tut.app-ideas--decidir.4.texto':
    'Non è una tela, è una tabella: ogni opzione contro ogni criterio, con un peso da 1 a 5 secondo quanto ti importa quel criterio. Il totale ordina le opzioni da solo.',
  'tut.calendario.1.titulo': 'L\'orologio',
  'tut.calendario.1.texto': 'Il calendario non è una stanza: vive nell\'orologio della casa, così si apre da dove sei.',
  'tut.calendario.2.titulo': 'Una settimana vera',
  'tut.calendario.2.texto':
    'Turni al bar, lezioni di fisica, corsa all\'alba, pianoforte la sera. Ogni blocco è una routine con la sua ora e il suo colore; si trascinano per spostarle e si allungano per cambiarne la durata.',
  'tut.calendario.3.titulo': 'Quattro modi di guardare',
  'tut.calendario.3.texto':
    'Giorno e Settimana mostrano la griglia per ore; Mese e Anno danno il panorama dell\'anno intero. Il primo pulsante fa doppio lavoro: dice «Oggi» e ti riporta al presente, oppure «Giorno» se stai già guardando un\'altra data.',
  'tut.calendario.4.titulo': 'Da dove arriva ogni blocco',
  'tut.calendario.4.texto':
    'Le app si mettono in agenda da sole: gli appuntamenti dell\'Agenda, il sonno di Riposo, i momenti di studio della Biblioteca. Con il filtro ne lasci vedere una sola.',
  'tut.calendario.5.titulo': 'Muoversi nell\'anno',
  'tut.calendario.5.texto':
    'Le frecce ‹ › scorrono il periodo e Oggi ti riporta al presente. Tutto l\'anno di Pep è qui, settimana per settimana. Con + Nuova crei un evento, oppure lo tracci direttamente sulla griglia.',
  'tut.calendario.6.titulo': 'Abitudine per abitudine',
  'tut.calendario.6.texto':
    'Ogni riga è una routine e ogni colonna un giorno: verde se l\'hai fatta. Qui si spunta al volo, e la percentuale in alto riassume il periodo che stai guardando.',
  'tut.calendario.7.titulo': 'L\'arco dell\'anno',
  'tut.calendario.7.texto':
    'Nella vista Anno il grafico racconta tutta la storia: Pep ha iniziato rispettando un terzo di quello che si proponeva e ha chiuso sopra l\'85%. La costanza si è costruita, non è arrivata da sola.',
  'tut.calendario.8.titulo': 'Anche le cadute contano',
  'tut.calendario.8.texto':
    'I due buchi sono veri: l\'infortunio al ginocchio del mese 7 e le tre settimane in Giappone. Saltare dei giorni non cancella i progressi — il pannello mostra l\'anno com\'è stato, non come sarebbe dovuto essere. E una routine conta solo dal giorno in cui l\'hai creata.',
  'tut.metas.1.titulo': 'Prima di tutto, gli obiettivi',
  'tut.metas.1.texto':
    'La vista si apre su Obiettivi, raggruppati per l\'app che li segue: la corsa in Palestra, la laurea in fisica in Biblioteca. «Casa» non è un\'app — quella categoria se l\'è inventata Pep per i lavori della cucina.',
  'tut.metas.2.titulo': 'Dall\'obiettivo al suo piano',
  'tut.metas.2.texto':
    'Ogni riga si legge come una bacheca: il suo numero nella cartella, la scadenza, l\'avanzamento e lo stato — da fare, in corso o fatto, a seconda di quanto è già spuntato. Un clic apre l\'obiettivo: il suo piano se ce l\'ha (il ✨ lo annuncia) e, se no, il suo foglio con i sotto-obiettivi, le date e i passi.',
  'tut.metas.3.titulo': 'Tre piani, tre stati',
  'tut.metas.3.texto':
    'La cucina e la prossima maratona sono ancora proposte; la domanda per il post-laurea è già nel programma. Quello della maratona è stato chiesto senza scadenza: l\'IA ha calcolato che servono 24 settimane e lo dice nel suo riassunto.',
  'tut.metas.4.titulo': 'Il foglio del piano',
  'tut.metas.4.texto':
    'Sei fasi con i loro sotto-obiettivi, ognuna con il suo periodo. Finché è una proposta si modifica tutta: rinominare, spostare date, aggiungere o togliere nodi senza scombinare gli altri.',
  'tut.metas.5.titulo': 'Spuntare senza impegnarsi',
  'tut.metas.5.texto':
    'Le spunte di una proposta vivono nel foglio, non nei tuoi obiettivi: puoi segnare quello che hai fatto senza toccare il tuo programma. Le barre si riempiono da sole verso l\'alto — la pianificazione della cucina è già chiusa.',
  'tut.metas.6.titulo': 'Sposta nel programma reale',
  'tut.metas.6.texto':
    'Questo pulsante trasforma ogni fase e ogni sotto-obiettivo in obiettivi veri, con le loro date già messe e appesi all\'obiettivo originale. Quello che l\'obiettivo aveva già si conserva.',
  'tut.metas.7.titulo': 'Accettato: una sola verità',
  'tut.metas.7.texto':
    'Il piano del post-laurea si è già spostato. Ora le sue spunte sono quelle dei sotto-obiettivi reali e la barra è quella del tuo programma: il foglio smette di tenere un conto a parte.',
  'tut.metas.8.titulo': 'Ed eccoli, sull\'asse',
  'tut.metas.8.texto':
    'I sotto-obiettivi nati dal piano occupano il loro periodo nel programma, con il piano sovrapposto in viola: la proposta e il reale, sullo stesso asse.',
  'tut.metas.9.titulo': 'Ogni obiettivo, il suo asse',
  'tut.metas.9.texto':
    'Quest\'asse è quello di UN obiettivo: qui si danno date a ciò che non le ha, si appendono sotto-obiettivi nuovi e «Torna» ti riporta al suo foglio. Il menu Programma in alto mostra quello di tutti insieme.',
  'tut.app-biblioteca--enciclopedia.1.titulo': 'Un anno di studi, in un albero',
  'tut.app-biblioteca--enciclopedia.1.texto':
    'Pep studia Fisica: meccanica all\'inizio dell\'anno, termodinamica verso il parziale del mese 6, relatività e astrofisica alla fine. Ogni ramo si apre per vedere le sue voci.',
  'tut.app-biblioteca--enciclopedia.2.titulo': 'L\'albero cresce con te',
  'tut.app-biblioteca--enciclopedia.2.texto':
    'Gli argomenti del catalogo ci sono già; quelli che pendono sciolti li ha aperti una chat. Tocca una voce per leggere il suo riepilogo, i suoi punti chiave e la sua illustrazione.',
  'tut.app-biblioteca--enciclopedia.3.texto':
    'Una voce si scrive a mano oppure si distilla da una conversazione. Quella del buco nero e quella della fisica del pianoforte hanno un disegno: l\'app può illustrarle per te.',
  'tut.app-biblioteca--charlas.1.titulo': 'I dubbi dell\'anno',
  'tut.app-biblioteca--charlas.1.texto':
    'Qui ci sono le conversazioni che Pep ha avuto mentre studiava: entropia, dilatazione del tempo, perché un pianoforte suona da pianoforte. Ognuna è rimasta salvata.',
  'tut.app-biblioteca--charlas.2.titulo': 'Dalla chat all\'albero',
  'tut.app-biblioteca--charlas.3.texto':
    'Così l\'enciclopedia non si riempie di teoria copiata, ma di quello che hai chiesto davvero.',
  'tut.app-biblioteca--enciclopedia.4.titulo': 'L\'indice è tuo',
  'tut.app-biblioteca--enciclopedia.4.texto':
    'Il + di ogni riga scrive una voce lì stesso, con il campo e l\'argomento già impostati. E con il pulsante della matita fai crescere l\'albero: quello stesso + aggiunge rami, quello del Seme crea campi nuovi, e puoi rinominare, riordinare ed eliminare. Il numero con il rametto dice quanti sottoindici pendono da lì.',
  'tut.app-biblioteca--estudio.2.titulo': 'Il piano di studio',
  'tut.app-biblioteca--estudio.2.texto':
    'Il pulsante Missioni dell\'intestazione porta ciò che tocca oggi. Gli obiettivi di studio vivono nella stanza Obiettivi, raggruppati per app: «finire termodinamica prima del compito» è già raggiunto; prepararsi per la magistrale è ancora in corso.',
  'tut.app-biblioteca--estudio.3.texto':
    'A ogni obiettivo puoi chiedere un piano: l\'IA ti chiede la data obiettivo e le ore che hai, e mette i momenti di studio nel tuo calendario.',
  'tut.app-biblioteca--resumen.1.texto':
    'Quante voci ha la tua enciclopedia e quanti campi e argomenti dell\'indice hai già coperto. Gli argomenti aperti da una chat si contano a parte.',
  'tut.app-biblioteca--resumen.2.titulo': 'Quattro numeri',
  'tut.app-biblioteca--resumen.2.texto':
    'Chat con il Saggio, minuti di studio in totale e nella settimana, e la tua serie di giorni di studio di fila.',
  'tut.app-biblioteca--resumen.3.titulo': 'Dov\'è lo squilibrio',
  'tut.app-biblioteca--resumen.3.texto':
    'La barra più lunga è il campo che ti ha preso più attenzione — per Pep, la termodinamica nella settimana del parziale.',
  'tut.app-biblioteca--resumen.4.titulo': 'I giorni di studio',
  'tut.app-biblioteca--resumen.4.texto':
    'Un quadratino al giorno: si vedono l\'abbuffata di studio prima del parziale e il vuoto delle tre settimane in Giappone, senza aprire lo storico completo.',
  'tut.app-biblioteca--resumen.5.titulo': 'Dove sono finite le ore',
  'tut.app-biblioteca--resumen.5.texto':
    'Lo stesso di sopra ma in minuti: un conto è avere tante voci di un campo, un altro è averci dedicato tempo davvero.',
  'tut.app-biblioteca--resumen.6.titulo': 'Un anno di sessioni',
  'tut.app-biblioteca--resumen.6.texto':
    'E se vuoi il dettaglio, lo storico conserva ogni sessione con i suoi minuti e il suo campo, archiviata per anno, mese e settimana.',
  'tut.app-idiomas--charlas.1.titulo': 'Un tutor al tuo livello',
  'tut.app-idiomas--charlas.1.texto':
    'Il tuo tutor è l\'assistente della stanza: gli parli nella lingua che studi e risponde al livello QCER del tuo profilo — frasi corte con traduzione in A1, espressioni idiomatiche in C1. Se gli scrivi nella tua lingua, ti incoraggia a provarci in quella che studi.',
  'tut.app-idiomas--charlas.2.titulo': 'Si salvano e si classificano da sole',
  'tut.app-idiomas--charlas.2.texto':
    'Ogni chat resta in questa lista con il suo titolo, il suo argomento del programma e il suo livello, messi senza che tu faccia niente. Può anche nascere da un argomento —con il pulsante di chat della sua riga— per esercitare proprio quello.',
  'tut.app-idiomas--charlas.3.texto':
    'Quando il tutor corregge, la forma giusta va su una riga tutta sua con una spunta, e la conversazione continua senza ramanzine. All\'uscita ti propone di estrarre il vocabolario comparso: scegli quali carte salvare ed ereditano l\'argomento della chat.',
  'tut.app-idiomas--repaso.1.titulo': 'Quello che tocca oggi',
  'tut.app-idiomas--repaso.1.texto':
    'Pep va avanti da un anno e ha ancora ripassi in sospeso: il sistema non ti chiede tutto il vocabolario, solo quello che stai per dimenticare.',
  'tut.app-idiomas--repaso.3.titulo': 'Un anno di costanza',
  'tut.app-idiomas--repaso.3.texto':
    'Lo storico conserva quante ne hai ripassate ogni giorno e quante ne hai azzeccate. Pep all\'inizio ne sbagliava parecchie e alla fine le indovinava quasi tutte — e in Giappone ha ripassato più che mai.',
  'tut.app-idiomas--vocabulario.2.titulo': 'Due lingue insieme',
  'tut.app-idiomas--vocabulario.2.texto':
    'In alto si cambia lingua: oltre alla principale, Pep ha messo su un giapponese di sopravvivenza tra il mese 4 e il viaggio. Al ritorno l\'ha quasi mollato, e si vede nelle sue scatole.',
  'tut.app-idiomas--temario.1.titulo': 'Tre aree, sei livelli',
  'tut.app-idiomas--temario.1.texto':
    'Dall\'A1 al C2, ogni livello con i suoi argomenti di vocabolario, i suoi punti di pronuncia e la sua grammatica. Sai cosa ti manca senza cercare un corso fuori.',
  'tut.app-idiomas--temario.2.titulo': 'A che punto sei',
  'tut.app-idiomas--temario.2.texto':
    'Carte padroneggiate, ripassi del mese e il tuo livello attuale. Pep ha iniziato l\'anno in A2 e oggi è intorno al B1.',
  'tut.app-agenda--esencial.1.titulo': 'La tua agenda',
  'tut.app-agenda--esencial.1.texto':
    'L’agenda custodisce quello che non è un’abitudine: cose da fare, appuntamenti, contatti. Sono tre schede, e tutto ciò che ha una data si programma da solo nel calendario della casa.',
  'tut.app-agenda--esencial.2.titulo': 'Lavoro',
  'tut.app-agenda--esencial.2.texto':
    'L’elenco raccoglie le cose da fare senza data perché non si perdano, e la bacheca sposta i tuoi compiti per colonne: da fare, in corso e fatto.',
  'tut.app-agenda--esencial.3.titulo': 'Salute',
  'tut.app-agenda--esencial.3.texto':
    'Appuntamenti medici, farmaci e cure, in tre sottoschede: Tu, Persone care (chi è affidato alle tue cure) e Animali.',
  'tut.app-agenda--esencial.4.titulo': 'Persone',
  'tut.app-agenda--esencial.4.texto':
    'La tua rubrica di contatti per relazione. I compleanni che salvi si ripetono da soli ogni anno nel calendario.',
  'tut.calendario--esencial.1.titulo': 'L’orologio della casa',
  'tut.calendario--esencial.1.texto':
    'Il calendario non è una stanza: vive nell’orologio dell’HUD, quindi si apre da dove sei senza entrare da nessuna parte.',
  'tut.calendario--esencial.2.titulo': 'Tutto ciò che è programmato, insieme',
  'tut.calendario--esencial.2.texto':
    'Qui cade tutto ciò che ha data e ora: quello che crei con «+ Nuovo» o tracciando sulla griglia, e quello che le altre app programmano da sole. Il filtro in alto lascia vedere una sola app quando si accumula troppo.',
  'tut.calendario--esencial.3.titulo': 'Giorno',
  'tut.calendario--esencial.3.texto':
    'La griglia di una giornata di 24 ore: serve per vedere a che ora si trova ogni cosa e se qualcosa si sovrappone. Questo pulsante ha una doppia funzione: dice «Oggi» e ti riporta al presente, oppure «Giorno» se stai già guardando un’altra data.',
  'tut.calendario--esencial.4.titulo': 'Settimana',
  'tut.calendario--esencial.4.texto':
    'La stessa griglia oraria, ma con i sette giorni fianco a fianco. È qui che si vede come si distribuisce la settimana, e dove i blocchi si trascinano da un giorno all’altro o si allungano per durare di più.',
  'tut.calendario--esencial.5.titulo': 'Mese',
  'tut.calendario--esencial.5.texto':
    'Abbandona l’asse delle ore e dipinge i giorni come caselle con quello che capita in ognuno. È la vista d’insieme: quali settimane si preannunciano cariche e quali giorni restano liberi.',
  'tut.calendario--esencial.6.titulo': 'Anno',
  'tut.calendario--esencial.6.texto':
    'I dodici mesi tutti insieme. A questa distanza le ore non si leggono più: quello che si vede è la costanza, quanto hai mantenuto ciò che ti sei proposto lungo tutto l’anno.',
  'tut.calendario--esencial.7.titulo': 'E le missioni, a parte',
  'tut.calendario--esencial.7.texto':
    'In rosso, perché non si legga come una quinta vista: Missioni riunisce in un’unica schermata la checklist di oggi di tutte le app. Gli obiettivi e i loro piani non sono qui — vivono nella loro stanza.',
  'tut.app-anecdotario--esencial.1.titulo': 'Il tuo diario personale',
  'tut.app-anecdotario--esencial.1.texto':
    'Il diario dei ricordi custodisce quello che vuoi raccontare, con il suo umore e le sue foto. Si organizza da solo per data, senza che tu debba classificare nulla.',
  'tut.app-anecdotario--esencial.2.titulo': 'Così si scrive',
  'tut.app-anecdotario--esencial.2.texto':
    'Scegli l’umore del giorno, scrivi quello che vuoi raccontare e allega foto se ne hai. Anche solo una foto, senza testo, va bene.',
  'tut.app-anecdotario--esencial.3.titulo': 'Il calendario dell’umore',
  'tut.app-anecdotario--esencial.3.texto':
    'Ogni giorno si colora con l’umore della sua voce, così l’intero mese si legge con un’occhiata. Tocca un giorno per vedere le sue voci sotto.',
  'tut.app-anecdotario--esencial.4.titulo': 'La cronologia',
  'tut.app-anecdotario--esencial.4.texto':
    'Tutte le voci restano qui, organizzate da sole in cartelle per anno, mese e settimana.',
  'tut.app-biblioteca--esencial.1.titulo': 'La tua biblioteca',
  'tut.app-biblioteca--esencial.1.texto':
    'La biblioteca è la tua enciclopedia personale: chiedi quello che non sai, salvi quello che impari e tieni il conto di quello che studi. Sono quattro schede.',
  'tut.app-biblioteca--esencial.2.titulo': 'Chat',
  'tut.app-biblioteca--esencial.2.texto':
    'Qui chiedi al Saggio su qualsiasi argomento e la conversazione resta salvata. Ogni chat si classifica da sola nel suo campo di conoscenza ed esce distillata come scheda dell’enciclopedia.',
  'tut.app-biblioteca--esencial.3.titulo': 'Enciclopedia',
  'tut.app-biblioteca--esencial.3.texto':
    'L’albero dove vive quello che impari, ordinato per campo di conoscenza. Ogni scheda porta il suo riassunto e i suoi punti chiave, e puoi anche scriverle a mano; con la matita fai crescere l’indice su misura per te.',
  'tut.app-biblioteca--esencial.4.titulo': 'Studio',
  'tut.app-biblioteca--esencial.4.texto':
    'Il timer per studiare: scegli campo e durata, tutto d’un fiato o a pomodori, e ogni tratto si registra da solo. Continua a scorrere anche se esci dalla stanza.',
  'tut.app-biblioteca--esencial.5.titulo': 'Panoramica',
  'tut.app-biblioteca--esencial.5.texto':
    'Il quadro generale di tutto quanto sopra: quante voci ha la tua enciclopedia e quale parte dell’indice hai coperto, i minuti di studio, la tua serie e i giorni in cui hai studiato.',
  'tut.app-cocina--esencial.1.titulo': 'La cucina',
  'tut.app-cocina--esencial.1.texto':
    'Questa app gestisce due cose: quello che stai per cucinare e quello che finisci per mangiare. Ognuna ha il suo menu in alto, e ogni menu apre le sue schede.',
  'tut.app-cocina--esencial.2.titulo': 'Ricettario',
  'tut.app-cocina--esencial.2.texto':
    'Il lato della cucina: qui vivono le tue ricette, le diete che le raggruppano e la lista della spesa. Sono tre schede, in quest’ordine.',
  'tut.app-cocina--esencial.3.titulo': 'Dieta',
  'tut.app-cocina--esencial.3.texto':
    'Una dieta è un piano alimentare con le sue ricette dentro e, se vuoi, i suoi obiettivi di calorie e macro. Salvi le tue accanto a quelle che l’app porta già.',
  'tut.app-cocina--esencial.4.titulo': 'Ricette',
  'tut.app-cocina--esencial.4.texto':
    'Il ricettario: ogni ricetta custodisce ingredienti, passaggi e i suoi macro per porzione, e si ordina in cartelle. Da una ricetta puoi registrare il pasto o mandare i suoi ingredienti alla lista della spesa.',
  'tut.app-cocina--esencial.5.titulo': 'Spesa',
  'tut.app-cocina--esencial.5.texto':
    'La lista della spesa, con ogni articolo nel corridoio che gli spetta. Puoi creare una lista mettendo insieme ciò che manca da diverse ricette e spuntare quello che è già in dispensa.',
  'tut.app-cocina--esencial.6.titulo': 'Controllo alimentare',
  'tut.app-cocina--esencial.6.texto':
    'L’altro menu tiene il conto di quello che mangi, in quattro schede numerate. La prima è Obiettivi: con il tuo peso, la tua altezza e la tua attività calcola quanto ti serve al giorno e distribuisce i macro.',
  'tut.app-cocina--esencial.7.titulo': 'Diario',
  'tut.app-cocina--esencial.7.texto':
    'Quello che è già successo: i pasti del giorno con le loro calorie, l’acqua che hai bevuto finora e il tuo peso quando ti pesi. La scheda accanto, Piano pasti, è il contrario: la griglia di quello che pensi di mangiare nei giorni a venire.',
  'tut.app-cocina--esencial.8.titulo': 'Progressi',
  'tut.app-cocina--esencial.8.texto':
    'Le statistiche di tutto quanto sopra nel periodo che scegli: calorie e macro, acqua e la curva del tuo peso. In basso, un calendario colorato dice con un’occhiata in quali giorni sei rimasto entro l’obiettivo.',
  'tut.app-computo--esencial.1.titulo': 'La sala di calcolo',
  'tut.app-computo--esencial.1.texto':
    'Qui si risolve quello che c’è da calcolare, in due schede: la Calcolatrice, con le sue modalità e il tuo formulario, e i Fogli di calcolo per tutto ciò che va in tabelle.',
  'tut.app-computo--esencial.2.titulo': 'Calcolatrice',
  'tut.app-computo--esencial.2.texto':
    'Una calcolatrice scientifica che dà il risultato mentre scrivi e salva ogni calcolo nella cronologia. La tastiera in basso ti evita quella del telefono, e le notazioni scrivono la parte scientifica dove hai il cursore.',
  'tut.app-computo--esencial.3.titulo': 'Le modalità',
  'tut.app-computo--esencial.3.texto':
    'Questo menu cambia l’intera vista della calcolatrice: grafico, basi numeriche, matrici, sistemi di equazioni, conversione di unità, mancia e regola del tre. La cronologia resta in basso in tutte.',
  'tut.app-computo--esencial.4.titulo': 'Il formulario',
  'tut.app-computo--esencial.4.texto':
    'Il tuo libro di formule, ripiegato sopra la calcolatrice. Ci sono già quelle di Matematica, Fisica e Chimica, in cartelle che puoi annidare. Ognuna si apre per riempire le sue variabili, si modifica o si elimina.',
  'tut.app-computo--esencial.5.titulo': 'Fogli di calcolo',
  'tut.app-computo--esencial.5.texto':
    'Fogli con riferimenti di cella e formule in linguaggio chiaro (come =SUMA), e grafici sull’intervallo che selezioni. Si esportano in Excel mantenendo le formule, o in PDF.',
  'tut.app-descanso--esencial.1.titulo': 'Riposo',
  'tut.app-descanso--esencial.1.texto':
    'Questa app tiene traccia del tuo sonno in un’unica schermata: il punteggio dell’ultima notte, il tuo orario con i suoi avvisi, il diario quotidiano e la cronologia completa.',
  'tut.app-descanso--esencial.2.titulo': 'Il punteggio',
  'tut.app-descanso--esencial.2.texto':
    'Ogni notte registrata riceve un punteggio che combina quanto hai dormito, a che ora sei andato a letto e quante volte ti sei svegliato. Senza ancora registrazioni, questa sezione ti invita ad annotare la tua prima notte.',
  'tut.app-descanso--esencial.3.titulo': 'Orario e avvisi',
  'tut.app-descanso--esencial.3.texto':
    'Regoli l’ora in cui dormi e ti svegli trascinando gli estremi della fascia del giorno; lo stesso orario appare come blocco nel calendario della casa. Qui accendi anche la sveglia con il suo tono e gli avvisi per rallentare il ritmo prima di dormire.',
  'tut.app-descanso--esencial.4.titulo': 'Registrare la notte',
  'tut.app-descanso--esencial.4.texto':
    'Il modulo per annotare come hai dormito: la data, l’ora in cui sei andato a letto e ti sei svegliato, le interruzioni e una valutazione della qualità, con spazio per una nota.',
  'tut.app-descanso--esencial.5.titulo': 'La cronologia',
  'tut.app-descanso--esencial.5.texto':
    'Tutte le notti che registri restano qui, organizzate per anno, mese e settimana, per rivedere il tuo riposo nel tempo.',
  'tut.app-despacho--esencial.1.titulo': 'Le tue finanze',
  'tut.app-despacho--esencial.1.texto':
    'Lo studio ordina i tuoi soldi in quattro schede: quello che hai, quello che entra ed esce, i tuoi obiettivi e i mercati. Ognuna apre sotto le sue sezioni.',
  'tut.app-despacho--esencial.2.titulo': 'Patrimonio netto',
  'tut.app-despacho--esencial.2.texto':
    'Quello che hai e quello che devi, in due elenchi: attività e passività. La terza sezione proietta quella fotografia in avanti con il tasso che assegni a ogni riga.',
  'tut.app-despacho--esencial.3.titulo': 'Flusso di cassa',
  'tut.app-despacho--esencial.3.texto':
    'I soldi che entrano e quelli che escono, separati in spese, entrate e saldo. Il saldo riassume il periodo che scegli — giorno, settimana, mese o anno — con il suo budget, le sue categorie e la sua tendenza.',
  'tut.app-despacho--esencial.4.titulo': 'Obiettivi',
  'tut.app-despacho--esencial.4.texto':
    'I tuoi obiettivi di denaro in tre sezioni: risparmio e investimento, debito, e alcune calcolatrici che propongono un importo a partire dal tuo stesso saldo. Ogni obiettivo può scendere nel programma e avere una data.',
  'tut.app-despacho--esencial.5.titulo': 'Mercati',
  'tut.app-despacho--esencial.5.texto':
    'Quotazioni dal vivo di valute, cripto, azioni e materie prime; serve una connessione. È una bacheca di consultazione: l’app non consiglia cosa comprare né cosa vendere.',
  'tut.app-diario--esencial.1.titulo': 'Il giornale di oggi',
  'tut.app-diario--esencial.1.texto':
    'Il giornale porta il riepilogo del giorno in due viste: titoli e avvenimenti di oggi. Non conserva dati propri: ogni giorno porta contenuti nuovi e a mezzanotte li sostituisce del tutto.',
  'tut.app-diario--esencial.2.titulo': 'Titoli',
  'tut.app-diario--esencial.2.texto':
    'I titoli del giorno per categoria — mondo, economia, tecnologia, salute, sport e intrattenimento —, filtrabili con i chip in alto. Provengono da stampa reale nella tua lingua, con testate che ruotano ogni giorno.',
  'tut.app-diario--esencial.3.titulo': 'Accadde oggi',
  'tut.app-diario--esencial.3.texto':
    'L’altra metà del giornale: cosa è successo in un giorno come oggi — un’opera, un libro, una specie, una parola. Un buon pretesto per aprirlo anche quando le notizie quel giorno non interessano.',
  'tut.app-diario--esencial.4.titulo': 'Si rinnova da solo',
  'tut.app-diario--esencial.4.texto':
    'L’edizione si scarica da sola all’apertura dell’app e si sostituisce del tutto a mezzanotte: non si accumula nulla. Questo pulsante forza un aggiornamento prima di quell’ora.',
  'tut.app-diario--esencial.5.titulo': 'Consegna',
  'tut.app-diario--esencial.5.texto':
    'Configura quali sezioni ti consegna ogni assistente nella sua chat, a un’ora fissa o in un momento a sorpresa della giornata.',
  'tut.app-ejercicio--esencial.1.titulo': 'Il tuo allenamento',
  'tut.app-ejercicio--esencial.1.texto':
    'Palestra riunisce le tre modalità per il corpo — forza, resistenza e flessibilità — più una scheda obiettivi dove decidi quanto vuoi allenarti ogni settimana.',
  'tut.app-ejercicio--esencial.2.titulo': 'Obiettivi',
  'tut.app-ejercicio--esencial.2.texto':
    'Il riepilogo della stanza: la tua serie, i giorni con qualcosa registrato e una barra per modalità rispetto all’obiettivo settimanale che fissi qui. Qui si sceglie anche il sistema di misura, in chili o in libbre.',
  'tut.app-ejercicio--esencial.3.titulo': 'Forza',
  'tut.app-ejercicio--esencial.3.texto':
    'L’allenamento con i pesi: ogni sessione custodisce i suoi esercizi con serie, ripetizioni e carico. Con questo l’app calcola il volume del giorno, disegna la progressione di ogni esercizio e conserva i tuoi record.',
  'tut.app-ejercicio--esencial.4.titulo': 'Catalogo, routine e progresso',
  'tut.app-ejercicio--esencial.4.texto':
    'Le tre modalità si organizzano allo stesso modo. Il Catalogo raggruppa gli esercizi disponibili e costruisce routine con essi, Routine registra l’allenamento del giorno che scegli in alto, e Progresso riassume il periodo con la sua mappa di calore.',
  'tut.app-ejercicio--esencial.5.titulo': 'Resistenza',
  'tut.app-ejercicio--esencial.5.texto':
    'Correre, pedalare, nuotare o camminare, per tratti con i loro minuti e la loro distanza. Da qui si apre l’allenamento dal vivo, che rileva il percorso via GPS e il battito da un sensore Bluetooth e salva la sessione alla fine.',
  'tut.app-ejercicio--esencial.6.titulo': 'Flessibilità',
  'tut.app-ejercicio--esencial.6.texto':
    'Allungamenti e mobilità, con serie a tempo invece che a peso: ogni posizione ha i suoi secondi e le sue ripetizioni. Il player guidato scorre la routine posizione dopo posizione con un timer che avvisa quando cambiare.',
  'tut.app-entretenimiento--esencial.1.titulo': 'Intrattenimento',
  'tut.app-entretenimiento--esencial.1.texto':
    'Conserva i film, le serie, i libri e i videogiochi che finisci, e porta un tavolo da gioco digitale per giocare senza uscire di casa. Sono due schede: Giochi da tavolo e Archivio.',
  'tut.app-entretenimiento--esencial.2.titulo': 'Giochi da tavolo',
  'tut.app-entretenimiento--esencial.2.texto':
    'Il tavolo riunisce giochi digitali che si giocano direttamente sullo schermo. Un filtro separa quello pensato per uno o due giocatori da quello adatto a un gruppo più grande.',
  'tut.app-entretenimiento--esencial.3.titulo': 'Per famiglie',
  'tut.app-entretenimiento--esencial.3.texto':
    'Il catalogo è raggruppato in famiglie — da tavolo, rompicapo, arcade, carte e casinò, e per il gruppo — ognuna con il suo colore. Tocca qualsiasi scheda per aprire il gioco a schermo intero.',
  'tut.app-entretenimiento--esencial.4.titulo': 'Archivio',
  'tut.app-entretenimiento--esencial.4.texto':
    'L’archivio riunisce quello che guardi, leggi e giochi: ogni titolo con il suo stato, la sua valutazione e la tua recensione. Si può ordinare per genere, categoria, autore o data.',
  'tut.app-garage--esencial.1.titulo': 'Il garage',
  'tut.app-garage--esencial.1.texto':
    'Il garage gestisce i tuoi veicoli: biciclette, auto, moto e tutto ciò con cui ti sposti. Ognuno con la sua cronologia di tagliandi e le sue pratiche, e tutto ciò che ha una data si programma da solo nel calendario della casa.',
  'tut.app-garage--esencial.2.titulo': 'Riepilogo',
  'tut.app-garage--esencial.2.texto':
    'La scheda d’ingresso: un semaforo dice con un’occhiata se qualcosa è scaduto, se qualcosa si avvicina o se il garage è tranquillo.',
  'tut.app-garage--esencial.3.titulo': 'In un’occhiata',
  'tut.app-garage--esencial.3.texto':
    'Quanti veicoli hai, quante pratiche restano attive e quanto hai speso finora quest’anno.',
  'tut.app-garage--esencial.4.titulo': 'Veicoli',
  'tut.app-garage--esencial.4.texto':
    'L’elenco completo, con targa, chilometraggio e numero di tagliandi su ogni scheda. Toccandone uno si apre la sua scheda, con la cronologia dei tagliandi e le sue pratiche.',
  'tut.app-garage--esencial.5.titulo': 'Aggiungere un veicolo nuovo',
  'tut.app-garage--esencial.5.texto':
    'Nome, tipo, marca, modello, anno, targa e il chilometraggio di oggi. Con la targa inserita, la scheda abilita anche le pratiche che riguardano solo un veicolo targato, come la revisione o il pagamento del bollo.',
  'tut.app-hobbies--esencial.1.titulo': 'I tuoi passatempi',
  'tut.app-hobbies--esencial.1.texto':
    'Hobby tiene traccia di quello che pratichi per piacere: ogni hobby raccoglie le sue sessioni, la sua serie e, se vuoi, i suoi progetti.',
  'tut.app-hobbies--esencial.2.titulo': 'I tuoi hobby',
  'tut.app-hobbies--esencial.2.texto':
    'Ogni hobby che registri appare qui come una scheda, con i progressi della settimana e la serie attiva. Aprendone uno vedi le sue statistiche, la sua heatmap dell’anno, il registro delle sessioni e i suoi progetti.',
  'tut.app-hobbies--esencial.3.titulo': 'Aggiungere un hobby',
  'tut.app-hobbies--esencial.3.texto':
    'Questo pulsante apre il modulo per aggiungere un nuovo hobby: nome, emoji, colore e, se vuoi, un obiettivo settimanale in giorni di pratica.',
  'tut.app-hobbies--esencial.4.titulo': 'Dentro di ogni hobby',
  'tut.app-hobbies--esencial.4.texto':
    'Lì registri sessioni con minuti e nota, vedi la tua heatmap dell’anno e gestisci progetti con i loro progressi. Gli obiettivi e il loro programma vivono nella stanza Obiettivi.',
  'tut.app-ideas--esencial.1.titulo': 'Idee',
  'tut.app-ideas--esencial.1.texto':
    'Idee custodisce quello che ti viene in mente e lo aiuta a maturare: prima si annota, poi si ordina in una mappa e, se serve, si confronta per decidere. Sono tre schede.',
  'tut.app-ideas--esencial.2.titulo': 'Diario delle idee',
  'tut.app-ideas--esencial.2.texto':
    'L’elenco dove cade qualsiasi spunto, isolato o raggruppato in un brainstorming per argomento. Si può archiviare in cartelle, evidenziare con una stella e, quando matura, trasformare in una mappa.',
  'tut.app-ideas--esencial.3.titulo': 'Mappe concettuali',
  'tut.app-ideas--esencial.3.texto':
    'Una tela libera per ordinare un argomento nel formato che gli sta meglio: mentale, albero, flusso, linea del tempo, ciclo, piramide, Venn e altro.',
  'tut.app-ideas--esencial.4.titulo': 'Diagrammi decisionali',
  'tut.app-ideas--esencial.4.texto':
    'La stessa tela, con formati pensati per decidere: pro e contro ponderati, SWOT, Eisenhower o una matrice ponderata che ordina le opzioni da sola.',
  'tut.app-idiomas--esencial.1.titulo': 'La tua scuola di lingue',
  'tut.app-idiomas--esencial.1.texto':
    'Qui scegli una lingua, chatti con un tutor di intelligenza artificiale, salvi il vocabolario che impari e lo ripassi con la ripetizione dilazionata. Sono quattro schede: Chat, Programma, Ripasso e Progressi.',
  'tut.app-idiomas--esencial.2.titulo': 'Chat',
  'tut.app-idiomas--esencial.2.texto':
    'Conversi con il tuo tutor nella lingua che studi: risponde secondo il tuo livello e corregge con delicatezza. Ogni chat resta salvata e si classifica da sola, e quando esci ti propone di estrarre il nuovo vocabolario come carte.',
  'tut.app-idiomas--esencial.3.titulo': 'Programma',
  'tut.app-idiomas--esencial.3.texto':
    'Ordina la lingua in argomenti, pronuncia e grammatica, dal livello A1 al C2. Il vocabolario vive dentro ogni argomento: ogni carta si salva lì, con la sua traduzione e il suo esempio.',
  'tut.app-idiomas--esencial.4.titulo': 'Ripasso',
  'tut.app-idiomas--esencial.4.texto':
    'Il ripasso a ripetizione dilazionata: ogni carta vive in una scatola e ti chiede solo quelle che stai per dimenticare, con esercizi a scelta multipla, al contrario o completa la frase invece di limitarti a guardarle.',
  'tut.app-idiomas--esencial.5.titulo': 'Progressi',
  'tut.app-idiomas--esencial.5.texto':
    'Il riassunto dei tuoi avanzamenti: quante carte padroneggi, quanto hai ripassato e il tuo livello attuale, con la cronologia dei tuoi ripassi giorno per giorno.',
  'tut.app-jardin--esencial.1.titulo': 'Il tuo spazio di calma',
  'tut.app-jardin--esencial.1.texto':
    'Il giardino riunisce tre pratiche: meditazione, respirazione guidata e gratitudine. Non ha punti né serie di proposito: qui saltare un giorno non viene punito, si accompagna solo quello che pratichi.',
  'tut.app-jardin--esencial.2.titulo': 'Meditazione',
  'tut.app-jardin--esencial.2.texto':
    'Scegli una traccia sonora e una durata, oppure medita in silenzio con una campana all’inizio e alla fine. Ogni sessione resta salvata nella tua cronologia.',
  'tut.app-jardin--esencial.3.titulo': 'Respirazione',
  'tut.app-jardin--esencial.3.texto':
    'Due schemi di respirazione guidata, uno per centrarti e uno per lasciar andare la giornata: lo schermo respira con te mentre avanza.',
  'tut.app-jardin--esencial.4.titulo': 'Gratitudine',
  'tut.app-jardin--esencial.4.texto':
    'Annota per cosa sei grato oggi, anche una sola cosa, e rivedi le tue voci precedenti quando vuoi. Senza serie: saltare un giorno non cancella nulla.',
  'tut.app-metas--esencial.1.titulo': 'Il pianificatore della casa',
  'tut.app-metas--esencial.1.texto':
    'Questa stanza non tiene registrazioni proprie: riunisce in un unico posto gli obiettivi e i piani che nascono nelle altre app. Sono tre schede, da leggere in quest’ordine: quello che ti sei proposto, come pensi di ripartirlo e quando scade.',
  'tut.app-metas--esencial.2.titulo': 'Obiettivi',
  'tut.app-metas--esencial.2.texto':
    'L’elenco di tutto ciò che ti sei proposto, raggruppato per l’app che porta ogni obiettivo. Un obiettivo può dipendere da un altro, e toccandolo si apre il suo foglio: lì ci sono la sua scadenza, i suoi passi e l’accesso al suo programma.',
  'tut.app-metas--esencial.3.titulo': 'Piani',
  'tut.app-metas--esencial.3.texto':
    'Un piano è la bozza di un programma: ripartisce un obiettivo in fasi con le loro date. Finché è una proposta si ritocca a piacere; quando convince, si accetta e le sue fasi diventano sotto-obiettivi reali.',
  'tut.app-metas--esencial.4.titulo': 'Programma',
  'tut.app-metas--esencial.4.texto':
    'L’asse del tempo con tutti gli obiettivi insieme: ognuno è una barra sopra le date. Ci si avvicina e ci si allontana per giorni, settimane, mesi o anni, e un piano può sovrapporsi per confrontarlo con quello già tracciato.',
  'tut.app-sala--esencial.1.titulo': 'Il tuo soggiorno di viaggio',
  'tut.app-sala--esencial.1.texto':
    'Qui vive il tuo mondo viaggiatore: una mappa del mondo con spilli, itinerari di luoghi da scoprire, percorsi che collegano luoghi e un diario di bordo di ricordi. Sono quattro schede.',
  'tut.app-sala--esencial.2.titulo': 'Mappa',
  'tut.app-sala--esencial.2.texto':
    'Ogni luogo che hai visitato o sogni di visitare è uno spillo sulla mappa del mondo. L’interruttore in alto sostituisce la mappa piatta con un globo che giri trascinandolo.',
  'tut.app-sala--esencial.3.titulo': 'Itinerario',
  'tut.app-sala--esencial.3.texto':
    'I luoghi che sogni di conoscere, ognuno con il suo piano giorno per giorno. Quelli con una data si programmano da soli nel calendario.',
  'tut.app-sala--esencial.4.titulo': 'Percorsi',
  'tut.app-sala--esencial.4.texto': 'Un percorso collega luoghi in un tragitto e lo disegna sulla mappa.',
  'tut.app-sala--esencial.5.titulo': 'Diario di bordo',
  'tut.app-sala--esencial.5.texto':
    'I ricordi dei luoghi che hai visitato, in album per paese: foto e aneddoti di ogni posto.',
  'tut.app-agenda--trabajo.1.titulo': 'La lista dei da fare',
  'tut.app-agenda--trabajo.1.texto':
    'Quello che va fatto ma non ha ancora un giorno vive qui, con la sua priorità. Niente ti obbliga a metterci una data solo per annotarlo.',
  'tut.app-agenda--trabajo.3.titulo': 'La bacheca',
  'tut.app-agenda--trabajo.3.texto':
    'Le stesse cose da fare, in tre colonne: da fare, in corso e fatto. Tieni premuta una scheda per trascinarla in un\'altra colonna —lasciarla su «fatto» la spunta anche nel calendario—, oppure spostala con le frecce.',
  'tut.app-agenda--salud.1.titulo': 'L\'anno del ginocchio',
  'tut.app-agenda--salud.1.texto':
    'Nutrizione ogni pochi mesi, il dentista e le sei sedute di fisioterapia del settimo mese: l\'infortunio che ha fermato Pep è registrato qui.',
  'tut.app-agenda--salud.2.titulo': 'Farmaci',
  'tut.app-agenda--salud.2.texto':
    'Ogni farmaco crea un blocco per ogni assunzione nel calendario. L\'antinfiammatorio dell\'infortunio è durato tre settimane ed è finito in archivio; la vitamina continua.',
  'tut.app-agenda--salud.3.titulo': 'Laika',
  'tut.app-agenda--salud.3.texto':
    'La gatta ha la sua scheda con peso e veterinario, e le sue cure ricorrenti: vaccino ogni anno, sverminazione ogni tre mesi, bagno ogni mese. Quando le dai per fatte, la prossima data si ricalcola da sola.',
  'tut.app-agenda--salud.4.titulo': 'Ciò che si ripete',
  'tut.app-agenda--salud.4.texto':
    'Il check-up annuale, la pulizia dei denti, le analisi: cure con un periodo proprio. Segnandole fatte, la prossima data avanza da sola: il calendario non punta mai a qualcosa che hai già fatto.',
  'tut.app-agenda--salud.ciclo.titulo': 'Il ciclo',
  'tut.app-agenda--salud.ciclo.texto':
    'In fondo a Tu vive il ciclo, con il suo interruttore: flusso, sintomi e umore giorno per giorno, e dalle tue ultime mestruazioni stima le prossime e la finestra fertile. Spegnerlo conserva tutto ciò che hai registrato.',
  'tut.app-agenda--salud.projimos.titulo': 'Persone care',
  'tut.app-agenda--salud.projimos.texto':
    'Chi è sotto la tua cura: contatti di Persone segnati «Sotto la mia cura», ognuno con le sue visite per specialità, le sue cure e i suoi farmaci. Pep tiene qui sua madre.',
  'tut.app-agenda--personas.1.titulo': 'La cerchia di Pep',
  'tut.app-agenda--personas.1.texto':
    'Famiglia, amicizie, gente del lavoro e dell\'università, ognuno nella sua cartella. Con il telefono, l\'indirizzo e quello che non vuoi dimenticare.',
  'tut.app-agenda--personas.2.titulo': 'Compleanni che non si dimenticano',
  'tut.app-agenda--personas.2.texto':
    'Quando salvi una data di nascita, il compleanno si ripete ogni anno nel calendario e ti avvisa. L\'età la calcola l\'app da sola.',
  'tut.app-agenda--personas.3.texto':
    'Quello che programmi con qualcuno resta agganciato al suo contatto: così vedi a quando risale l\'ultima volta che vi siete visti.',
  'tut.app-ejercicio--anio.1.titulo': 'Un anno in tre numeri',
  'tut.app-ejercicio--anio.1.texto':
    'La serie conta i giorni di fila con qualcosa di registrato, e l\'aderenza confronta i giorni attivi con quelli che ti eri dato come obiettivo. Pep ha iniziato l\'anno senza riuscire a correre due isolati.',
  'tut.app-ejercicio--anio.2.titulo': 'Le tre discipline',
  'tut.app-ejercicio--anio.2.texto':
    'Le barre misurano quello che hai fatto rispetto ai tuoi obiettivi: sessioni di forza, minuti di corsa e minuti di mobilità. L\'obiettivo si adatta al periodo che scegli qui sopra.',
  'tut.app-ejercicio--anio.3.titulo': 'Gli obiettivi dell\'anno',
  'tut.app-ejercicio--anio.3.texto':
    'La stanza Obiettivi conserva i suoi quattro obiettivi raggiunti — i 5K, i 10K, la mezza maratona e la maratona — e quello ancora aperto. Gli obiettivi con data compaiono anche nel calendario di casa.',
  'tut.app-ejercicio--carrera.1.titulo': 'Catalogo, routine e progresso',
  'tut.app-ejercicio--carrera.1.texto':
    'Ogni disciplina è organizzata allo stesso modo: il catalogo degli esercizi, le tue routine con il loro storico e il progresso. Iniziamo da quello che Pep ha già corso.',
  'tut.app-ejercicio--carrera.2.titulo': 'Ogni uscita resta scritta',
  'tut.app-ejercicio--carrera.2.texto':
    'Lo storico si raggruppa per anno, mese e settimana. Le gare importanti conservano anche il tracciato del percorso e i suoi tratti: lì c\'è la maratona, con i suoi parziali di dieci chilometri.',
  'tut.app-ejercicio--carrera.3.titulo': 'La mappa di calore non mente',
  'tut.app-ejercicio--carrera.3.texto':
    'Anche i vuoti raccontano la storia: il mese dell\'infortunio al ginocchio è vuoto e le tre settimane in Giappone quasi. Di fianco compaiono i chilometri totali, l\'uscita più lunga e il miglior ritmo.',
  'tut.app-ejercicio--fuerza.1.titulo': 'Serie, ripetizioni e peso',
  'tut.app-ejercicio--fuerza.1.texto':
    'Ogni sessione conserva i suoi esercizi con il peso che hai sollevato. L\'app ricorda l\'ultima volta, così non devi cercarla, e somma il volume totale del giorno.',
  'tut.app-ejercicio--fuerza.2.titulo': 'La curva di un anno',
  'tut.app-ejercicio--fuerza.2.texto':
    'Scegli un esercizio e vedrai come è salita: lo squat di Pep è passato da quaranta chili a settanta. Nel mese dell\'infortunio ha allenato solo la parte superiore, e quella curva non se n\'è nemmeno accorta.',
  'tut.app-ejercicio--fuerza.3.titulo': 'I tuoi record, senza chiederli',
  'tut.app-ejercicio--fuerza.3.texto':
    'Di ogni esercizio si conservano il miglior peso, il massimo di ripetizioni e una stima del tuo 1RM. Quelli a peso corporeo, come le trazioni alla sbarra, si segnano a parte.',
  'tut.app-ejercicio--flexibilidad.1.titulo': 'Stretching e mobilità',
  'tut.app-ejercicio--flexibilidad.1.texto':
    'Il catalogo porta gli esercizi di sempre —ischiocrurali, anche, spalle— ognuno con la sua miniatura illustrata, generata dall’IA la prima volta che serve.',
  'tut.app-ejercicio--flexibilidad.2.titulo': 'Serie a tempo, non a peso',
  'tut.app-ejercicio--flexibilidad.2.texto':
    'Ogni esercizio conta secondi e ripetizioni invece del peso. Il Lettore guidato scorre la routine esercizio per esercizio con un timer che avvisa quando cambiare.',
  'tut.app-ejercicio--flexibilidad.3.titulo': 'La stessa mappa di calore',
  'tut.app-ejercicio--flexibilidad.3.texto':
    'Minuti e sessioni del mese, con la stessa heatmap delle altre due modalità: la costanza della mobilità si legge facile come quella della corsa.',
  'tut.app-ejercicio--flexibilidad.4.texto':
    'Le tre modalità condividono il Cardio dal vivo dell’orologio: quando corri o pedali col timer attivo, il minuto per minuto si salva da solo alla fine.',
  'tut.app-cocina--alimentacion.1.titulo': 'Passo 1: dove vuoi arrivare',
  'tut.app-cocina--alimentacion.1.texto':
    'Con il tuo peso, la tua altezza e la tua attività, l\'app calcola quanto ti serve al giorno e ripartisce i macro. Pep ha fissato 2.400 calorie e un peso obiettivo a cui manca meno di un chilo.',
  'tut.app-cocina--alimentacion.2.titulo': 'Passo 2: quello che hai mangiato oggi',
  'tut.app-cocina--alimentacion.2.texto':
    'Colazione, pranzo, cena e qualcosa fuori pasto: ogni registrazione riempie gli anelli del giorno. L\'acqua ha il suo obiettivo, ed è quello che la casa guarda per dare il giorno per fatto.',
  'tut.app-cocina--alimentacion.3.titulo': 'Passo 3: 74 chili, 67 chili',
  'tut.app-cocina--alimentacion.3.texto':
    'La curva di tutto l\'anno, con il suo plateau nel mese dell\'infortunio e il chilo preso in Giappone. Sotto ti dice a che ritmo stai andando e quando arriveresti di questo passo.',
  'tut.app-cocina--alimentacion.4.titulo': 'Un anno a colori',
  'tut.app-cocina--alimentacion.4.texto':
    'Il verde è un giorno in linea con l\'obiettivo, l\'ambra uno andato un po\' oltre e il rosso uno andato del tutto fuori. Il mese del viaggio si vede al primo colpo d\'occhio. Tocca un giorno qualsiasi per aprirlo.',
  'tut.app-cocina--recetario.1.titulo': 'Diete, non diete da rivista',
  'tut.app-cocina--recetario.1.texto':
    'Qui una dieta è un piano con le sue ricette dentro. Pep ne ha salvate due sue: la settimana della maratona e il rientro dal Giappone, oltre a quelle che porta l\'app.',
  'tut.app-cocina--recetario.2.titulo': 'Il ricettario',
  'tut.app-cocina--recetario.2.texto':
    'Ogni ricetta conserva ingredienti, passi e i suoi macro per porzione, e si ordina in cartelle. Da una ricetta puoi registrare il pasto o mandare i suoi ingredienti alla lista della spesa.',
  'tut.app-cocina--recetario.3.titulo': 'Chiedere la ricetta all\'IA',
  'tut.app-cocina--recetario.3.texto':
    'Descrivi cosa vuoi cucinare e l\'IA costruisce la ricetta completa con la foto del piatto. Questo lo fa l\'IA: si accende in Editor › Impostazioni › Account.',
  'tut.app-cocina--recetario.4.titulo': 'Dalla ricetta alla lista della spesa',
  'tut.app-cocina--recetario.4.texto':
    'Crea lista mette insieme quello che manca da più ricette in una sola spesa: ogni ingrediente indovina la sua categoria (verdura, latticini…) e si può correggere.',
  'tut.app-cocina--recetario.5.titulo': 'Le liste salvate',
  'tut.app-cocina--recetario.5.texto':
    'Ogni lista si salva con quello che manca da comprare e quello che è già in dispensa. Se metti i prezzi, il conto si può mandare alle spese dello Studio.',
  'tut.app-cocina--cronograma.1.titulo': 'L\'obiettivo di peso, a fasi',
  'tut.app-cocina--cronograma.1.texto':
    'Il pulsante Missioni dell\'intestazione apre la checklist del giorno: l\'acqua, i pasti e i passi che arrivano dai tuoi obiettivi. Gli obiettivi in sé —con il piano che l\'IA propone loro— vivono nella stanza Obiettivi, raggruppati per l\'app che li segue.',
  'tut.app-cocina--cronograma.2.texto':
    'Questo lo fa l\'IA: si accende in Editor › Impostazioni › Account. Senza, gli obiettivi si creano e si modificano lo stesso, solo a mano.',
  'tut.app-descanso--noche.1.titulo': 'Cento punti, tre parti',
  'tut.app-descanso--noche.1.texto':
    'La durata vale cinquanta, la costanza della tua ora di andare a letto trenta e le interruzioni venti. Dormire tanto un giorno non compensa andare a letto a ore assurde tutti gli altri.',
  'tut.app-descanso--noche.2.titulo': 'L\'ultima settimana',
  'tut.app-descanso--noche.2.texto':
    'Sette barre contro la linea del tuo obiettivo. È la vista che ti dice a colpo d\'occhio se questa settimana stai dormendo quanto volevi.',
  'tut.app-descanso--noche.3.titulo': 'L\'anno intero',
  'tut.app-descanso--noche.3.texto':
    'Lo storico si conserva per anno, mese e settimana. Scendi fino ai primi mesi di Pep e confrontali con gli ultimi: andava a letto dopo l\'una e dormiva cinque ore.',
  'tut.app-descanso--horario.1.titulo': 'Dalle undici e mezza alle sette',
  'tut.app-descanso--horario.1.texto':
    'Trascina le estremità della barra per spostare la tua ora di dormire e quella della sveglia; il cielo qui sopra cambia con loro. Questo blocco compare anche nel calendario, a cavallo della mezzanotte.',
  'tut.app-descanso--horario.2.titulo': 'Sveglia e promemoria',
  'tut.app-descanso--horario.2.texto':
    'Puoi scegliere la suoneria della sveglia, chiedere che ti avvisi quando è ora di andare a letto e lasciare gli schermi un\'ora prima. Gli avvisi sono facoltativi: qui sono spenti.',
  'tut.app-descanso--horario.3.titulo': 'Registrare la notte',
  'tut.app-descanso--horario.3.texto':
    'Ogni mattina annoti l\'ora di andare a letto, l\'ora del risveglio, quante volte hai aperto gli occhi durante la notte e com\'è andata. All\'app non serve altro per tutto il resto.',
  'tut.app-despacho--anio.1.titulo': 'Un anno, quattro lenti',
  'tut.app-despacho--anio.1.texto':
    'Scegli giorno, settimana, mese o anno e muoviti con le frecce. Torna indietro di qualche mese: trovi il mese del guasto all\'auto e quello del volo per il Giappone, tutti e due in rosso.',
  'tut.app-despacho--anio.2.titulo': 'La forma dell\'anno',
  'tut.app-despacho--anio.2.texto':
    'Sei periodi all\'indietro, a barre. Le blu sono i mesi in cui è avanzato qualcosa; le rosse, quelli che sono costati cari. Lì si vedono la caduta e la risalita.',
  'tut.app-despacho--anio.3.titulo': 'Dove se ne vanno?',
  'tut.app-despacho--anio.3.texto':
    'Il dettaglio per categoria del periodo che stai guardando. Pep scrive le sue a mano: l\'app riconosce quelle solite e dà un colore proprio a tutte le altre.',
  'tut.app-despacho--anio.4.titulo': 'Il tetto del mese',
  'tut.app-despacho--anio.4.texto':
    'Un budget mensile e una barra che diventa rossa quando sfori. Se guardi per settimana o per anno, l\'app lo ricalcola da sola.',
  'tut.app-despacho--anio.5.titulo': 'Quello che hai oggi',
  'tut.app-despacho--anio.5.texto':
    'Il tuo patrimonio arriva da solo dalla scheda Patrimonio netto: attività meno passività. Qui ci si somma o sottrae il saldo del periodo, per vedere come finiresti.',
  'tut.app-despacho--anio.6.titulo': 'E fra un anno',
  'tut.app-despacho--anio.6.texto':
    'Proietta dodici mesi mettendo le spese fisse alla loro scadenza e il variabile sulla tua media, in due scenari: con patrimonio e senza.',
  'tut.app-despacho--captura.1.titulo': 'Le spese fisse di Pep',
  'tut.app-despacho--captura.1.texto':
    'L\'affitto, internet, il telefono, lo streaming e l\'assicurazione dell\'auto: cinque voci inserite al mese 2, quando ha deciso di mettere ordine. Da allora ognuna si conta da sola.',
  'tut.app-despacho--captura.2.titulo': 'Come si registra',
  'tut.app-despacho--captura.2.texto':
    'Il modulo va per passi: importo, se è variabile o fissa, categoria (scrivi la tua e ti suggerisce quelle solite), ogni quanto si ripete e la nota.',
  'tut.app-despacho--captura.3.titulo': 'Un anno di movimenti',
  'tut.app-despacho--captura.3.texto':
    'Centinaia di spese archiviate in cartelle di anno e mese. Cerca il mese 7: lì c\'è il guasto che si è portato via quasi diecimila pesos in un colpo solo.',
  'tut.app-despacho--captura.4.titulo': 'Da dove arrivano i soldi',
  'tut.app-despacho--captura.4.texto':
    'Due stipendi quindicinali del bar, le ripetizioni di fisica che ha iniziato a dare quando ha deciso il viaggio, e le mance settimanali, mai uguali.',
  'tut.app-despacho--captura.5.texto':
    'Nella tua casa puoi registrare anche via chat: «ho speso 250 al supermercato» e resta annotato.',
  'tut.app-despacho--metas.1.titulo': 'L\'obiettivo raggiunto',
  'tut.app-despacho--metas.1.texto':
    'Il viaggio in Giappone, al 100%: undici mesi di risparmio, le ripetizioni, la tredicesima e i regali del compleanno. Sotto, il fondo di emergenza aperto al ritorno e un piccolo investimento.',
  'tut.app-despacho--metas.2.titulo': 'L\'obiettivo nel tempo',
  'tut.app-despacho--metas.2.texto':
    'Questi obiettivi si conservano sull\'asse del tempo nella stanza Obiettivi: dai una data a uno di essi e compare tra i tuoi giorni del calendario. Con ✨ l\'IA propone il piano di versamenti.',
  'tut.app-despacho--metas.3.titulo': 'Quello che doveva',
  'tut.app-despacho--metas.3.texto':
    'Il guasto all\'auto è finito sulla carta e ci sono voluti mesi per saldarlo. I debiti stanno a parte perché si leggono al contrario: qui scendere è vincere.',
  'tut.app-despacho--metas.4.titulo': 'Mercati',
  'tut.app-despacho--metas.4.texto':
    'Pep tiene d\'occhio lo yen da quando ha deciso il viaggio, e ora il won, per il prossimo. Forex, crypto, azioni e materie prime in diretta (serve internet).',
  'tut.app-despacho--patrimonio.1.titulo': 'Quanto vale oggi',
  'tut.app-despacho--patrimonio.1.texto':
    'Attività meno passività. Quando una riga ha un tasso, questo numero è quanto vale OGGI, non quanto valeva il giorno in cui l’hai annotato — e sotto puoi vedere il dettaglio, o tornare a ciò che hai scritto tu.',
  'tut.app-despacho--patrimonio.2.titulo': 'Da dove viene',
  'tut.app-despacho--patrimonio.2.texto':
    'Gli ultimi due anni di questo gruppo. Apri una riga qualsiasi e vedrai da cosa dipende: quanto vale, da quando, e quanto sale o scende all’anno. Ciò che scrivi non si riscrive mai da solo.',
  'tut.app-despacho--patrimonio.3.titulo': 'E dove va',
  'tut.app-despacho--patrimonio.3.texto':
    'La terza scheda segue la stessa linea in avanti: piena ciò che è successo, tratteggiata ciò che darebbero i tuoi tassi.',
  'tut.app-despacho--patrimonio.4.titulo': 'Tre linee',
  'tut.app-despacho--patrimonio.4.texto':
    'Ciò che hai in verde, ciò che devi in rosso e il netto in blu. La barra verticale è oggi: alla sua sinistra c’è ciò che è successo davvero.',
  'tut.app-despacho--patrimonio.5.titulo': 'Muovi tutto',
  'tut.app-despacho--patrimonio.5.texto':
    'Quanti mesi, quanta inflazione supponi, e se aggiungere ciò che risparmi ogni mese col suo ritmo di crescita. Niente di tutto questo tocca i tuoi dati: prova senza paura.',
  'tut.app-despacho--calculadoras.1.texto':
    'Quattro regole di finanza personale, ognuna nella sua scheda: fondo di emergenza, indipendenza finanziaria, 50/30/20 e l\'acconto dell\'auto (20/4/10).',
  'tut.app-despacho--calculadoras.2.titulo': 'Partono dal tuo saldo',
  'tut.app-despacho--calculadoras.2.texto':
    'I campi arrivano già compilati con le tue entrate o le tue spese reali del mese — toccali per simulare un\'altra cifra senza perdere di vista quella vera.',
  'tut.app-despacho--calculadoras.3.titulo': 'Dal calcolo all\'obiettivo',
  'tut.app-despacho--calculadoras.3.texto':
    'Con un tocco il risultato diventa un obiettivo di risparmio vero, pronto a scendere nel programma e a ricevere una data. (Non premerlo nella demo: creerebbe un obiettivo reale.)',
  'tut.app-garage--vehiculos.1.titulo': 'C\'è qualcosa che urge?',
  'tut.app-garage--vehiculos.1.texto':
    'Un solo semaforo per non dover leggere due liste: rosso se qualcosa è scaduto, ambra se sta arrivando, verde se il garage è in pace.',
  'tut.app-garage--vehiculos.2.titulo': 'Quanto hai speso',
  'tut.app-garage--vehiculos.2.texto':
    'Quanti veicoli, quante pratiche aperte e quanto hai speso nell\'anno. A Pep l\'auto è costata cara.',
  'tut.app-garage--vehiculos.2b.titulo': 'Registrarne uno nuovo',
  'tut.app-garage--vehiculos.2b.texto':
    'Nome, tipo, marca, modello, anno, targa e il contachilometri di oggi. Con la targa inserita, il garage sa quali pratiche proporti più avanti.',
  'tut.app-garage--vehiculos.3.titulo': 'La bici di tutti i giorni',
  'tut.app-garage--vehiculos.3.texto':
    'Il suo mezzo di tutti i giorni: catena, camere d\'aria, freni, uno per uno nella sua riga — lo stesso archivio a cartelle di anno e mese delle altre app. Guarda come i servizi si affollano negli ultimi mesi: è l\'allenamento per la maratona che presenta il conto.',
  'tut.app-garage--vehiculos.4.titulo': 'E l\'auto ereditata',
  'tut.app-garage--vehiculos.4.texto':
    'Ecco il guasto del mese 7: auto in panne, carro attrezzi e quasi diecimila pesos che non c\'erano. Ogni servizio conserva il costo, il chilometraggio e l\'officina dov\'è stato fatto.',
  'tut.app-garage--vehiculos.5.titulo': 'La scheda',
  'tut.app-garage--vehiculos.5.texto':
    'Marca, modello, anno, targa e il chilometraggio aggiornato. Con la targa inserita, il garage sblocca le pratiche che valgono solo per un\'auto.',
  'tut.app-garage--tramites.tabs.titulo': 'Tre quaderni',
  'tut.app-garage--tramites.tabs.texto':
    'La scheda di ogni veicolo divide le sue carte in tre quaderni: Pratiche, Documenti e Contatti. La cronologia dei servizi resta sempre sotto, qualunque quaderno tu stia guardando.',
  'tut.app-garage--tramites.1.titulo': 'Quello che arriva',
  'tut.app-garage--tramites.1.texto':
    'Ogni pratica conserva la prossima scadenza, ogni quanti mesi si ripete e quanto costa. Quando la completi, la data salta da sola a quella dopo.',
  'tut.app-garage--tramites.2.titulo': 'La bici non paga il bollo',
  'tut.app-garage--tramites.2.texto':
    'Senza targa, il garage nasconde le pratiche che non servono: alla bici propone solo il suo servizio periodico.',
  'tut.app-garage--tramites.2b.titulo': 'I documenti, a parte',
  'tut.app-garage--tramites.2b.texto':
    'Il libretto di circolazione, la polizza e il bollo non si mischiano con quello che si fa in officina: hanno un proprio quaderno, con numero, scadenza e promemoria anticipato.',
  'tut.app-garage--tramites.3.titulo': 'La rubrica',
  'tut.app-garage--tramites.3.texto':
    'L\'officina di fiducia, l\'assicurazione, il centro revisioni, il negozio di bici del quartiere e il carro attrezzi di quella notte — con telefono e indirizzo a un tocco.',
  'tut.app-garage--tramites.4.texto':
    'Tutte queste pratiche stanno anche nel calendario della casa, con il loro avviso in anticipo. E attenzione: i veicoli che si guidano sulla mappa sono un\'altra cosa, vivono nell\'Inventario.',
  'tut.app-sala--mapa.1.titulo': 'Dove hai messo piede',
  'tut.app-sala--mapa.1.texto':
    'Quattro paesi e una manciata di città: quasi tutte dello stesso viaggio. Tocca uno qualsiasi dei tre numeri per vedere la lista sotto la mappa.',
  'tut.app-sala--mapa.2.titulo': 'I pin',
  'tut.app-sala--mapa.2.texto':
    'I sette pin tutti insieme sul Giappone sono le tre settimane del viaggio. Quelli ambra —Seul, la Patagonia, l\'Islanda— sono quello che non è ancora successo. Toccando la mappa metti un pin nuovo dove vuoi.',
  'tut.app-sala--mapa.3.titulo': 'Il globo',
  'tut.app-sala--mapa.3.texto':
    'L\'interruttore in alto scambia il planisfero con un globo che giri trascinando, con gli stessi pin toccabili. Il globo guarda soltanto: i pin nuovi si mettono nella vista Piatta.',
  'tut.app-sala--japon.1.titulo': 'Gli album',
  'tut.app-sala--japon.1.texto':
    'Una cartella per paese, con la sua foto di copertina. Dentro, una scheda per posto e, dentro ognuna, quello che Pep ha scritto quel giorno.',
  'tut.app-sala--japon.2.titulo': 'Quello che ha scritto laggiù',
  'tut.app-sala--japon.2.texto':
    'Otto voci del viaggio, ognuna con la sua foto: il Fuji all\'alba, il bambù di Arashiyama, i cervi di Nara. Si scrivono lì per lì, con l\'odore ancora addosso.',
  'tut.app-sala--japon.3.texto':
    'Dentro ogni posto, il pulsante «Itinerario» apre la scheda del viaggio: giorno per giorno, da dove a dove, dove ha dormito, con che mezzo e quanto è costato.',
  'tut.app-sala--proximo.1.titulo': 'Da scoprire',
  'tut.app-sala--proximo.1.texto':
    'Tre sogni messi per iscritto. Seul ha già data e piano; la Patagonia e l\'Islanda sono ancora un\'idea. Quelli con una data compaiono nel tuo calendario.',
  'tut.app-sala--proximo.2.titulo': 'Dalla scheda all\'obiettivo',
  'tut.app-sala--proximo.2.texto':
    'Gli otto giorni in Corea sommano quanto costerebbe il viaggio, e quella somma si salva come obiettivo di risparmio nello Studio: vederla crescere là è vederla avvicinarsi qui.',
  'tut.app-sala--proximo.3.titulo': 'Percorsi',
  'tut.app-sala--proximo.3.texto':
    'Un percorso incatena i posti in ordine e li disegna sulla mappa. Quello del Giappone è il viaggio già fatto; quello della Corea, quello che vuole fare.',
  'tut.app-entretenimiento--archivo.1.titulo': 'Trenta opere, un anno',
  'tut.app-entretenimiento--archivo.1.texto':
    'Film, serie, libri e videogiochi, ordinati per quando li ha finiti. C\'è un\'abbuffata al mese 7 (con il ginocchio infortunato, di divano ce n\'è stato parecchio) e un buco di tre settimane: il Giappone.',
  'tut.app-entretenimiento--archivo.2.titulo': 'La scheda',
  'tut.app-entretenimiento--archivo.2.texto':
    'Titolo, autore o regista, genere, stato e stelle. La recensione è quello che ne ha pensato Pep, non il riassunto della trama: fra un anno è l\'unica parte che serve ancora.',
  'tut.app-entretenimiento--archivo.3.titulo': 'Quattro modi di ordinarlo',
  'tut.app-entretenimiento--archivo.3.texto':
    'Per genere, per categoria (film, serie, libro, videogioco), per autore o per data. Nella vista per genere le cartelle si trascinano: metti davanti quello che guardi di più.',
  'tut.app-entretenimiento--juegos.1.texto':
    '1–2 giocatori o 3+: il filtro nasconde quello che non va bene per il gruppo che hai davanti. I giochi segnati «2+» valgono in tutte e due le sezioni.',
  'tut.app-entretenimiento--juegos.2.titulo': 'Per famiglia',
  'tut.app-entretenimiento--juegos.2.texto':
    'Da tavolo, Rompicapo, Arcade, Carte e casinò, Per il gruppo: ogni famiglia con il suo colore. Scacchi, dama, domino, blackjack, tetris, campo minato e più di una dozzina di altri.',
  'tut.app-entretenimiento--juegos.3.titulo': 'Un tocco e si gioca',
  'tut.app-entretenimiento--juegos.3.texto':
    'Ogni scheda apre il gioco a schermo intero; quelli che lo prevedono hanno il selettore di difficoltà in alto. Tornare indietro ti riporta esattamente qui, senza perdere il segno.',
  'tut.app-diario--habito.1.titulo': 'I titoli di oggi',
  'tut.app-diario--habito.1.texto':
    'Mondo, economia, tecnologia, salute, sport e intrattenimento, da fonti vere. I chip in alto filtrano per sezione.',
  'tut.app-diario--habito.2.titulo': 'Si rinnova da solo',
  'tut.app-diario--habito.2.texto':
    'L\'edizione del giorno si scarica da sola e a mezzanotte cambia tutta: qui non si accumula niente, come un giornale vero.',
  'tut.app-diario--habito.3.titulo': 'Un giorno nella storia',
  'tut.app-diario--habito.3.texto':
    'L\'altra metà: cos\'è successo in un giorno come oggi, un\'opera, un libro, una specie, una parola. È una scusa per aprirlo anche quando le notizie non vanno giù.',
  'tut.app-diario--habito.4.texto':
    'Pep l\'ha letto circa duecento giorni quest\'anno: tanto all\'inizio, quasi mai nel mese brutto e tutti i giorni delle ultime tre settimane. La sua serie vive di questo.',
  'tut.app-diario--reparto.1.titulo': 'La consegna',
  'tut.app-diario--reparto.1.texto':
    'Qui decidi chi ti porta cosa. Non è l\'ennesima notifica: ti arriva come un messaggio dell\'assistente, con la sua voce.',
  'tut.app-diario--reparto.2.titulo': 'Due fattorini',
  'tut.app-diario--reparto.2.texto':
    'Il Mago porta mondo, tecnologia ed economia alle 7:30. Laika porta le cose leggere quando le va. Ogni assistente sceglie le sue sezioni e il suo modo.',
}
