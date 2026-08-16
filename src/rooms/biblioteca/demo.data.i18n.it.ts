/**
 * Rama «it» del año demo de biblioteca. Solo se descarga si el usuario
 * está en ese idioma (el índice `demo.data.i18n.ts` la carga con import()).
 *
 * Las frases se traducen en `traducciones/biblioteca.it.json`; este
 * archivo lo montan `partir-demo-i18n.mjs` / `traducir-a-mano.mjs meter` —
 * no lo edites a mano.
 */
export default {
  "entradas": [
    {
      "dia": -358,
      "tema": "nat-mecanica",
      "titulo": "Le tre leggi di Newton, rilette con calma",
      "resumen": "Le ho studiate al liceo e giuravo di saperle. Invece no: la prima non è affatto ovvia, perché dice che il moto non ha bisogno di una causa, è il cambiamento ad averne bisogno. Mi si è chiarita frenando in bici e sentendo lo zaino continuare per la sua strada.",
      "puntosClave": [
        "Senza forza netta lo stato di moto si mantiene, non solo la quiete",
        "F = ma parla della variazione della quantità di moto, non della velocità che hai",
        "Azione e reazione agiscono su corpi diversi, per questo non si annullano"
      ]
    },
    {
      "dia": -348,
      "tema": "mat-analisis",
      "titulo": "La derivata come velocità istantanea",
      "resumen": "Derivavo per regole, come chi segue una ricetta. Questa settimana ho capito cosa misura davvero: quanto cambia una cosa per unità di tempo in un istante preciso. Ho graficato la posizione della mia bici andando verso il bar e la pendenza raccontava tutta la storia del tragitto.",
      "puntosClave": [
        "È il limite del rapporto incrementale quando l'intervallo tende a zero",
        "La derivata seconda è l'accelerazione: la curvatura del grafico",
        "Continua non implica derivabile: in un picco non c'è un'unica pendenza"
      ]
    },
    {
      "dia": -336,
      "tema": "nat-mecanica",
      "titulo": "Lavoro ed energia: la scorciatoia che salva i problemi",
      "resumen": "Ho scoperto che molti problemi che risolvevo con tre equazioni crollano da soli se uso l'energia. Non mi serve conoscere il dettaglio del percorso, solo l'inizio e la fine. È la prima volta che la fisica mi sembra economica invece che tediosa.",
      "puntosClave": [
        "Lavora solo la componente della forza nella direzione del moto",
        "Teorema lavoro-energia: il lavoro netto è la variazione di energia cinetica",
        "Con forze conservative il percorso non conta e compare l'energia potenziale"
      ]
    },
    {
      "dia": -322,
      "tema": "nat-mecanica",
      "titulo": "Quantità di moto lineare e urti",
      "resumen": "La quantità di moto è ciò che si conserva anche quando l'energia si perde in rumore e calore. Ho lavorato sull'urto tra due carrelli in laboratorio e il numero è uscito quasi perfetto; l'energia cinetica, invece, se n'è andata per un terzo. Mi è piaciuto vedere una legge reggere dove un'altra cede.",
      "puntosClave": [
        "p = mv, e la forza è la rapidità di variazione della quantità di moto",
        "In qualsiasi urto la quantità di moto totale del sistema si conserva",
        "Il centro di massa continua la sua traiettoria come se nulla fosse successo"
      ]
    },
    {
      "dia": -308,
      "tema": "nat-mecanica",
      "titulo": "Moto circolare: chi curva chi",
      "resumen": "Da anni credevo nella forza centrifuga perché la sento quando prendo una curva in bici. In un sistema inerziale non esiste: c'è solo attrito che spinge verso il centro e il mio corpo che vuole andare dritto. Capirlo mi ha cambiato perfino il modo di inclinarmi in curva.",
      "puntosClave": [
        "L'accelerazione centripeta punta verso il centro e vale v²/r",
        "La sensazione di essere spinti verso l'esterno è inerzia, non una forza reale",
        "Se manca l'attrito, la traiettoria diventa rettilinea: per questo si sbanda"
      ]
    },
    {
      "dia": -296,
      "tema": "nat-mecanica",
      "titulo": "Momento angolare e il trucco della pattinatrice",
      "resumen": "Il classico della pattinatrice che gira più veloce chiudendo le braccia, ma finalmente con i numeri. Non spunta energia dal nulla: il lavoro lo fa lei tirando le braccia verso l'interno. Laika fa qualcosa di simile quando cade e si torce in aria.",
      "puntosClave": [
        "L = Iω, e il momento d'inerzia dipende da come distribuisci la massa",
        "Senza momento torcente esterno, il momento angolare totale si conserva",
        "Girare più veloce con meno inerzia costa energia: qualcuno la fornisce"
      ]
    },
    {
      "dia": -284,
      "tema": "nat-mecanica",
      "titulo": "L'oscillatore armonico è ovunque",
      "resumen": "Molla, pendolo, corda, atomo in un reticolo: se ti avvicini abbastanza all'equilibrio, tutto oscilla allo stesso modo. È il problema che ho risolto più volte quest'anno e quello che mi stanca di meno. Qui ho iniziato a sospettare che la fisica ripeta poche idee con tanti travestimenti.",
      "puntosClave": [
        "Una forza di richiamo proporzionale allo spostamento dà una soluzione sinusoidale",
        "Per piccole ampiezze, il periodo non dipende dall'ampiezza",
        "Con l'attrito compare lo smorzamento; con la forzante, la risonanza"
      ]
    },
    {
      "dia": -272,
      "tema": "nat-termodinamica",
      "titulo": "Legge zero: cos'è davvero la temperatura",
      "resumen": "Comincia la termodinamica e la prima legge che incontro è quella che non ha nemmeno un numero tutto suo. Dice una cosa semplice e necessaria: se A è in equilibrio con C e lo è anche B, allora A e B lo sono tra loro. È proprio questo che permette a un termometro di avere un senso.",
      "puntosClave": [
        "L'equilibrio termico è transitivo, ed è questo a definire la temperatura",
        "Temperatura non è calore: una è uno stato, l'altro è energia in transito",
        "La scala assoluta in kelvin evita il non senso delle temperature negative"
      ]
    },
    {
      "dia": -258,
      "tema": "nat-termodinamica",
      "titulo": "Primo principio: la contabilità dell'energia",
      "resumen": "ΔU = Q − W è fondamentalmente un libro contabile dove niente va perso. Quello che mi è costato capire è che U dipende solo dallo stato, mentre Q e W dipendono dal percorso fatto per arrivarci. È come il mio budget: il saldo è il saldo, ma non è indifferente come ci sei arrivato.",
      "puntosClave": [
        "L'energia interna è una funzione di stato; calore e lavoro no",
        "Chiudere un ciclo riporta U al punto di partenza, ma non la spesa",
        "Nessuna macchina restituisce più energia di quanta ne consumi"
      ]
    },
    {
      "dia": -244,
      "tema": "nat-termodinamica",
      "titulo": "Teoria cinetica e la distribuzione delle velocità",
      "resumen": "La pressione smette di essere un numero nel testo del problema e diventa milioni di urti al secondo. La parte migliore è la coda della distribuzione: ci sono sempre molecole molto più veloci della media. Per questo il caffè evapora senza bisogno di bollire.",
      "puntosClave": [
        "La pressione nasce dallo scambio di quantità di moto negli urti con la parete",
        "La temperatura è proporzionale all'energia cinetica media, non a quella di una singola molecola",
        "La coda veloce di Maxwell-Boltzmann spiega l'evaporazione"
      ]
    },
    {
      "dia": -230,
      "tema": "nat-termodinamica",
      "titulo": "Entropia senza misticismo",
      "resumen": "Rifiutai di accontentarmi dello slogan secondo cui l'entropia è disordine. Con la definizione di Boltzmann la vidi come un conteggio: quante configurazioni microscopiche danno lo stesso stato che osservo. Riordinare la mia stanza non viola nulla, esporta solo il disordine sotto forma di calore.",
      "puntosClave": [
        "Definizione termodinamica: dS è il calore reversibile δQ diviso per T",
        "Definizione statistica: S = k ln Ω, un conteggio di microstati",
        "Il secondo principio dà una freccia al tempo, non vieta l'ordine locale"
      ]
    },
    {
      "dia": -216,
      "tema": "nat-termodinamica",
      "titulo": "Carnot e il tetto che nessuno supera",
      "resumen": "Un ciclo impossibile da costruire che serve a capire fin dove può arrivare qualsiasi motore reale. Il rendimento dipende solo dalle due temperature, ed è di una pulizia brutale. Mi è piaciuto scoprire che la fisica ha idee utili proprio perché sono finzioni.",
      "puntosClave": [
        "Rendimento massimo: 1 − Tfredda/Tcalda, con temperature assolute",
        "Nessuna macchina reale supera Carnot tra le stesse due sorgenti",
        "La reversibilità richiede una lentezza infinita: per questo è solo un limite"
      ]
    },
    {
      "dia": -200,
      "tema": "nat-termodinamica",
      "titulo": "Calore latente, ovvero perché il vapore scalda così in fretta",
      "resumen": "Studiai i cambiamenti di fase e all'improvviso il mio lavoro ebbe una teoria dietro. Condensandosi, il vapore cede una quantità enorme di energia senza scendere di temperatura, ed è per questo che il latte passa da freddo a pronto in venti secondi. Adesso controllo il termometro pensando al diagramma di fase.",
      "puntosClave": [
        "Durante il cambiamento di fase si assorbe energia senza che salga la temperatura",
        "Il calore latente di vaporizzazione è molto maggiore di quello di fusione",
        "Il diagramma di fase e il punto triplo mettono ordine in tutto il quadro"
      ]
    },
    {
      "dia": -190,
      "tema": "mat-stats",
      "titulo": "Incertezze: quello che il laboratorio mi ha costretto a imparare",
      "resumen": "Mi abbassarono il voto per aver scritto 9,81734 m/s² quando il mio cronometro era il pollice. L'incertezza non è un ornamento alla fine della relazione, è parte del risultato. Da allora comincio il laboratorio chiedendomi da dove viene l'errore, non lo faccio alla fine.",
      "puntosClave": [
        "L'errore casuale si riduce ripetendo; quello sistematico no",
        "Per variabili indipendenti, gli errori si sommano in quadratura",
        "Le cifre significative non devono promettere più precisione di quella reale"
      ]
    },
    {
      "dia": -168,
      "tema": "mat-stats",
      "titulo": "Minimi quadrati: adattare senza illudersi",
      "resumen": "Tre settimane senza correre per il ginocchio regalarono lunghi pomeriggi alla scrivania. Imparai che un R² alto può accompagnare un adattamento pessimo se il modello è sbagliato. Quello che davvero smaschera tutto è guardare i residui e vedere se disegnano una curva per prendersi gioco di te.",
      "puntosClave": [
        "Si minimizza la somma dei quadrati dei residui",
        "Un chi quadrato ridotto vicino a 1 indica errori stimati correttamente",
        "I residui devono sembrare casuali: qualsiasi schema è un indizio"
      ]
    },
    {
      "dia": -148,
      "tema": "nat-relatividad",
      "titulo": "I due postulati e il pasticcio della simultaneità",
      "resumen": "Comincia la relatività e la cosa strana non sono le formule, è accettare che due eventi simultanei per me non lo siano per qualcuno che passa in treno. I postulati sono brevi, quasi testardi, e da lì esce tutto il resto. Passai un intero pomeriggio a disegnare treni e lanterne.",
      "puntosClave": [
        "Le leggi della fisica sono le stesse in ogni sistema inerziale",
        "La velocità della luce è la stessa per qualsiasi osservatore",
        "La simultaneità non è assoluta: dipende dallo stato di moto"
      ]
    },
    {
      "dia": -132,
      "tema": "nat-relatividad",
      "titulo": "Dilatazione del tempo e i muoni che non dovrebbero arrivare",
      "resumen": "Il caso dei muoni cosmici mi convinse più di qualsiasi dimostrazione. Con la loro vita media dovrebbero decadere prima di toccare il suolo, eppure li rileviamo. A seconda di chi guarda, o il loro orologio va lento o l'atmosfera si accorcia, e le due versioni danno lo stesso numero.",
      "puntosClave": [
        "Il fattore gamma cresce rapidamente solo vicino alla velocità della luce",
        "Dilatazione del tempo e contrazione delle lunghezze sono la stessa storia",
        "Non è un'illusione di misura: sono orologi fisici che segnano ore diverse"
      ]
    },
    {
      "dia": -90,
      "tema": "nat-relatividad",
      "titulo": "Minkowski: quello che tutti misurano allo stesso modo",
      "resumen": "Dopo il viaggio tornai agli appunti e finalmente lo spazio-tempo andò a posto. Se il tempo e lo spazio si allungano a seconda dell'osservatore, qualcosa deve restare invariante, e quel qualcosa è l'intervallo. Con questo, E = mc² smette di essere una frase da maglietta e diventa un caso particolare.",
      "puntosClave": [
        "L'intervallo tra eventi è lo stesso per tutti gli osservatori",
        "Energia e quantità di moto formano un unico quadrivettore",
        "La massa non si converte in energia: è l'energia a riposo del sistema"
      ]
    },
    {
      "dia": -72,
      "tema": "nat-mecanica",
      "titulo": "Perché il pianoforte suona come un pianoforte",
      "resumen": "Sono dieci mesi che suono e questa settimana ho studiato cosa succede dentro la corda. Il timbro non sta nella nota, sta nella mescolanza degli armonici e nei primi millisecondi del colpo del martelletto. La scoperta migliore fu che le corde reali sono rigide, ed è per questo che si accordano allungate.",
      "puntosClave": [
        "Una corda fissata vibra in modi: fondamentale più armonici superiori",
        "Il timbro dipende dalla combinazione delle ampiezze e dall'attacco, non solo dalla frequenza",
        "L'inarmonicità della corda reale costringe l'accordatore ad allungare le ottave"
      ],
      "foto": "ondas"
    },
    {
      "dia": -52,
      "tema": "nat-relatividad",
      "titulo": "Buchi neri: l'orizzonte non è un muro",
      "resumen": "Lavorai con calma sulla metrica di Schwarzschild e calcolai il raggio per il Sole, per la Terra e, per gioco, per Laika. L'orizzonte non è una superficie che si può toccare: è il punto oltre il quale nessuna traiettoria torna indietro. Quello che più mi spiazza è vedere qualcuno cadere e non vederlo arrivare mai.",
      "puntosClave": [
        "Il raggio di Schwarzschild è proporzionale alla massa dell'oggetto",
        "L'orizzonte è un confine causale, non un oggetto materiale",
        "Per un osservatore lontano, la caduta sembra congelarsi e arrossarsi"
      ],
      "foto": "agujero-negro"
    },
    {
      "dia": -40,
      "tema": "nat-relatividad",
      "titulo": "Vite stellari in un unico diagramma",
      "resumen": "Il diagramma di Hertzsprung-Russell sembra un grafico brutto finché non capisci che è un censimento di destini. Una stella è una lotta lunghissima tra la gravità che schiaccia e la pressione che regge. E a decidere il finale è la massa, quasi nient'altro.",
      "puntosClave": [
        "Equilibrio idrostatico: gravità verso l'interno, pressione verso l'esterno",
        "La massa iniziale determina il ritmo di fusione e l'esito finale",
        "La sequenza principale è dove le stelle passano quasi tutta la loro vita"
      ]
    },
    {
      "dia": -26,
      "tema": "nat-cuantica",
      "titulo": "Corpo nero: dove si ruppe la fisica classica",
      "resumen": "Iniziai a leggere meccanica quantistica per conto mio in vista della domanda per il master e finii dritto nel problema del corpo nero. La teoria classica prevedeva energia infinita nell'ultravioletto, un modo elegante per dire che era sbagliata. Planck quantizzò per disperazione e gli andò bene; mi consola pensare che le grandi idee comincino come toppe.",
      "puntosClave": [
        "La previsione classica diverge alle alte frequenze: la catastrofe ultravioletta",
        "Planck ipotizzò l'energia in pacchetti proporzionali alla frequenza",
        "La costante h emerge misurando spettri termici, non filosofando"
      ]
    },
    {
      "dia": -8,
      "tema": "mat-stats",
      "titulo": "Bayes, ovvero come aggiornare ciò che credo",
      "resumen": "Lo lasciai per la fine dell'anno e avrei voluto vederlo prima del primo laboratorio. L'idea è semplice: parto da quello che credevo, lo confronto con i dati e tengo una versione aggiornata. In astrofisica lo usano di continuo per adattare modelli con pochi dati e molto rumore.",
      "puntosClave": [
        "La probabilità a posteriori è proporzionale alla verosimiglianza per la probabilità a priori",
        "Dichiarare la propria probabilità a priori non è barare: nasconderla sì",
        "Con molti dati, la probabilità a priori pesa sempre meno"
      ]
    }
  ],
  "charlas": [
    {
      "dia": -300,
      "titulo": "Perché si conserva la quantità di moto",
      "pregunta": "So a memoria che la quantità di moto si conserva negli urti, ma non capisco perché. È una legge a sé oppure si deduce da quelle di Newton?",
      "respuesta": "Deriva da Newton: se due corpi si spingono solo a vicenda, le forze sono uguali e opposte, quindi quello che uno guadagna in quantità di moto l'altro lo perde. La somma non cambia perché non ci sono forze esterne al sistema. La cosa importante è come scegli il sistema: se lasci fuori il pavimento o la parete, comparirà una quantità di moto che sembra sparire. E c'è una ragione più profonda: la conservazione della quantità di moto equivale al fatto che le leggi della fisica siano le stesse qui e un metro più in là.",
      "ramas": [
        "Simmetrie e teorema di Noether",
        "Urti anelastici"
      ]
    },
    {
      "dia": -226,
      "titulo": "Entropia senza la parola disordine",
      "pregunta": "Tutti i video mi dicono che l'entropia è disordine, ma allora non capisco come faccio a riordinare la mia stanza senza violare il secondo principio. Cos'è davvero?",
      "respuesta": "Pensa al conteggio, non all'estetica: l'entropia misura quante configurazioni microscopiche sono compatibili con ciò che osservi su grande scala. Uno stato che si può realizzare in molti modi possibili è più probabile, ed è per questo che i sistemi evolvono in quella direzione. Quando riordini la tua stanza riduci l'entropia di quella piccola regione, ma il tuo corpo disperde calore nell'aria e il bilancio totale sale. Il secondo principio parla dell'universo intero, non di ogni angolo preso a sé.",
      "ramas": [
        "Microstati e probabilità",
        "Demone di Maxwell"
      ]
    },
    {
      "dia": -170,
      "titulo": "Capire se il mio adattamento funziona",
      "pregunta": "Nella relazione di laboratorio mi viene un R² di 0,99, ma la retta non passa per metà delle mie barre di errore. Di quale dei due numeri mi devo fidare?",
      "respuesta": "Nessuno dei due preso da solo. R² dice solo quanta variazione spieghi, e con un intervallo ampio di dati schizza in alto anche se il modello è sbagliato. Quello che ti interessa è il chi quadrato ridotto, che confronta i residui con le tue incertezze: se è molto maggiore di 1, o il modello non funziona o hai sottostimato gli errori. E prima di tutto, grafica i residui: se disegnano una curva, ti manca un termine.",
      "ramas": [
        "Chi quadrato ridotto",
        "Leggere i residui"
      ]
    },
    {
      "dia": -85,
      "titulo": "Perché il pianoforte suona come un pianoforte",
      "pregunta": "Suono un la sulla mia tastiera e sul verticale della scuola e sembrano due cose diverse anche se è la stessa nota. Cosa cambia fisicamente?",
      "respuesta": "La frequenza fondamentale è la stessa, ma quello che il tuo orecchio chiama suono è il pacchetto completo: la mescolanza di armonici superiori e come evolve nel tempo. In un pianoforte vero la corda è rigida, quindi i suoi armonici non cadono su multipli esatti, e questo dà quella brillantezza caratteristica. Conta molto anche l'attacco, quei primi millisecondi di martelletto e di rumore della meccanica, che una tastiera economica appiattisce. Se registri le due note e guardi lo spettro, la differenza si vede prima ancora di sentirla.",
      "ramas": [
        "Inarmonicità della corda",
        "Temperamento equabile"
      ]
    },
    {
      "dia": -30,
      "titulo": "Cosa ripassare per il master",
      "pregunta": "Voglio fare domanda per un master in astrofisica e ho paura che la mia base di relatività generale sia da dilettante. Da dove comincio a colmare le lacune?",
      "respuesta": "Con quello che hai già puoi cominciare: relatività ristretta solida, meccanica lagrangiana e statistica dei dati sono la base reale del lavoro quotidiano. Prima di buttarti a capofitto sui tensori, dedica qualche settimana a un minimo di geometria differenziale e a una metrica di Schwarzschild lavorata per bene. Per la domanda conta di più un piccolo progetto finito che una lista di argomenti letti in superficie: il tuo fit delle curve di luce vale più di quanto pensi. E scegli il gruppo in base a chi ti farà da relatore, non solo al nome dell'istituto.",
      "ramas": [
        "Calcolo tensoriale minimo",
        "Scegliere relatore e gruppo"
      ]
    }
  ],
  "notasEstudio": [
    {
      "dia": -360,
      "nota": "Due ore di cinematica dopo il turno: mi addormentai sul quaderno, ma i diagrammi di corpo libero erano fatti lo stesso."
    },
    {
      "dia": -330,
      "nota": "Piano inclinato con attrito: la fisica la capisco, sono i segni a fregarmi."
    },
    {
      "dia": -310,
      "nota": "Prima sessione di esercizi con Marta, una compagna di corso: tre su cinque giusti, molto meglio che in solitaria."
    },
    {
      "dia": -286,
      "nota": "Oscillatore armonico in biblioteca finché non hanno chiuso; trovai la soluzione senza aprire il libro."
    },
    {
      "dia": -262,
      "nota": "Comincia la termodinamica: lessi la legge zero e il primo principio due volte, la seconda volta finalmente con senso."
    },
    {
      "dia": -240,
      "nota": "Esercizi sui gas ideali tra un ordine e l'altro; il quaderno finì per sapere di caffè."
    },
    {
      "dia": -212,
      "nota": "Simulazione del parziale: otto problemi su dieci, e quello di Carnot lo sbagliai per l'aritmetica, non per la teoria."
    },
    {
      "dia": -195,
      "nota": "Parziale di termodinamica consegnato; uscii con la strana sensazione di averlo capito sul serio."
    },
    {
      "dia": -172,
      "nota": "Con il ginocchio sotto ghiaccio, pomeriggio intero di minimi quadrati: se non posso correre, almeno qui vado avanti."
    },
    {
      "dia": -150,
      "nota": "Comincia la relatività: mezz'ora di lezione registrata e un'ora a disegnare treni e orologi."
    },
    {
      "dia": -130,
      "nota": "Ripassai le trasformazioni di Lorentz e chiusi la cartella fino al ritorno dal viaggio."
    },
    {
      "dia": -88,
      "nota": "Ritorno allo studio con il jet lag: rilessi gli appunti di prima del viaggio e non capii la mia stessa grafia."
    },
    {
      "dia": -70,
      "nota": "Mezza sessione di fisica del suono e mezza ad accordare la tastiera; la conto come studio."
    },
    {
      "dia": -50,
      "nota": "Metrica di Schwarzschild con calma; calcolai il raggio del Sole e, per gusto, quello di Laika."
    },
    {
      "dia": -30,
      "nota": "Corpo nero e Planck: finalmente vedo dove si rompeva la termodinamica classica."
    },
    {
      "dia": -14,
      "nota": "Ripasso generale per l'esame finale e prima bozza del saggio per la domanda di ammissione."
    },
    {
      "dia": -6,
      "nota": "Sessione breve di statistica bayesiana e lista di articoli da leggere in vacanza."
    }
  ],
  "metas": {
    "termo": "Chiudere la termodinamica prima del parziale",
    "posgrado": "Preparare la domanda per il master in astrofisica"
  }
}
