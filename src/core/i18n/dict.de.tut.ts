import type { Dict } from './dict'

/**
 * Textos de PASO de los tutoriales en de. Capa aparte porque solo hacen
 * falta con un tour corriendo.
 *
 * Lo monta `traducir-a-mano.mjs meter-dict` — no lo edites a mano.
 */

export const DE_TUT: Dict = {
  'tut.app-computo--formulario.1.titulo': 'Es hängt am Rechner',
  'tut.app-computo--formulario.1.texto':
    'Das ganze Formelbuch lebt in diesem Menü, einen Tipp von der Stelle entfernt, an der du rechnest. Mathematik, Physik und Chemie sind schon geladen und nach Themen gruppiert, in Ordnern, die du beliebig verschachteln kannst. Pep hat außerdem Physik II mit seinen Klausuren, die Zahlen fürs Café und die fürs Laufen.',
  'tut.app-computo--formulario.2.titulo': 'Alles gehört dir',
  'tut.app-computo--formulario.2.texto':
    'Es gibt kein „mitgeliefert“ und kein „meins“: Jede Formel öffnet, bearbeitet und löscht sich gleich. Die Suche oben durchsucht alle.',
  'tut.app-computo--formulario.3.titulo': 'Nach deinem Geschmack',
  'tut.app-computo--formulario.3.texto':
    'Beim Bearbeiten einer Formel kannst du ihren Ausdruck ändern, ihre Variablen umbenennen oder einen Wert festlegen, den du sowieso immer nimmst.',
  'tut.app-computo--formulario.4.texto':
    'Die Kurve erscheint zwischen der Formel und den Variablen, und ziehst du an irgendeinem Regler, bewegt sie sich sofort mit. „In voller Größe öffnen“ schickt sie in den Modus Grafik, und der Druck-Button holt den ganzen Ordner als PDF heraus, mit sauber gesetzten Formeln.',
  'tut.app-computo--calculadora.1.titulo': 'Schreib die Rechnung',
  'tut.app-computo--calculadora.1.texto':
    'Das Ergebnis wird berechnet, während du schreibst. Das Tastenfeld unten hält die Handytastatur aus dem Weg, und das Wissenschaftliche wohnt nicht mehr dort: Es steckt in der Notation.',
  'tut.app-computo--calculadora.2.titulo': 'Die Notation',
  'tut.app-computo--calculadora.2.texto':
    'Hier steckt alles Wissenschaftliche und noch einiges mehr: Du wählst die Gruppe – Grundlagen, Analysis, Matrizen, Trigonometrie, Symbole – und die Tasten wechseln. Sie werden dort eingefügt, wo dein Cursor steht, und die Lücke ist gleich bereit zum Tippen.',
  'tut.app-computo--calculadora.3.titulo': 'Besondere Modi',
  'tut.app-computo--calculadora.3.texto':
    'Der Rechner wechselt seine ganze Ansicht: die Grafik, die Basen 2 bis 16, Matrizen, Gleichungssysteme, Einheiten umrechnen, die Rechnung mit Trinkgeld und der Dreisatz. Der Verlauf bleibt überall unten.',
  'tut.app-computo--calculadora.3b.titulo': 'Basen',
  'tut.app-computo--calculadora.3b.texto':
    'Was du tippst, wird in der gewählten Basis gelesen und in allen fünfzehn zugleich angezeigt, von 2 bis 16, live. Bitweise Operationen sind dabei, und mit den Präfixen 0b, 0o und 0x mischst du Basen in ein und derselben Rechnung.',
  'tut.app-computo--calculadora.3c.titulo': 'Matrizen und Systeme',
  'tut.app-computo--calculadora.3c.texto':
    'Matrizen rechnet mit A und B bis 6×6: Summe, Produkt, Determinante, Inverse, Transponierte und Spur. Sein Nachbar Systeme löst lineare Gleichungen und liest die Unbekannten aus dem, was du schreibst – bis zu sechs Gleichungen.',
  'tut.app-computo--calculadora.3d.titulo': 'Einheiten',
  'tut.app-computo--calculadora.3d.texto':
    'Acht Kategorien – von Länge bis Daten –, die umrechnen, während du schreibst; jede merkt sich ihr letztes Paar, und „Tauschen“ dreht die Umrechnung um. Die Temperatur stimmt: 100 °C sind 212 °F.',
  'tut.app-computo--calculadora.3e.titulo': 'Trinkgeld und Dreisatz',
  'tut.app-computo--calculadora.3e.texto':
    'Die zwei fürs schnelle Kopfrechnen: Trinkgeld rechnet auf die Rechnung – nicht auf die Gesamtsumme – und teilt durch so viele, wie ihr seid; der Dreisatz, direkt oder umgekehrt, füllt das x von selbst aus.',
  'tut.app-computo--calculadora.4.titulo': 'Das Formelbuch, griffbereit',
  'tut.app-computo--calculadora.4.texto':
    'Deine Formeln hängen an diesem Menü, mit ihren Variablen bereit zum Ausfüllen: Genau deshalb lohnt es sich, sie zu speichern.',
  'tut.app-computo--calculadora.5.titulo': 'Grafiken zeichnen',
  'tut.app-computo--calculadora.5.texto':
    'Hier läuft alles durch, was gezeichnet wird: die Grafik oben und das Tastenfeld unten, um die Funktionen zu schreiben. Ziehe zum Verschieben, zoome mit zwei Fingern und tippe an, um einen Punkt abzulesen.',
  'tut.app-computo--calculadora.6.titulo': 'Vier Arten zu zeichnen',
  'tut.app-computo--calculadora.6.texto':
    'Funktionen von x, Polarkurven wie diese Rosenkurve (r als Funktion des Winkels), parametrische Kurven, bei denen x und y von demselben Parameter abhängen, und Flächen mit zwei Variablen, die du mit dem Finger drehst.',
  'tut.app-computo--calculadora.7.titulo': 'Gleichungen lösen',
  'tut.app-computo--calculadora.7.texto':
    'Schreib die Gleichung mit ihrem Gleichheitszeichen. Ist sie ein Polynom, bekommst du die exakten Nullstellen; wenn nicht, sucht er sie in dem Intervall, das du gerade siehst, und sagt dir, welches es war.',
  'tut.app-computo--hojas.1.titulo': 'Deine Tabellen',
  'tut.app-computo--hojas.1.texto':
    'Jede Tabelle ist ein eigenes Dokument. Pep hat das Japan-Budget, den Plan für die 18 Wochen des Marathons und die Noten aus Physik II.',
  'tut.app-computo--hojas.2.titulo': 'Nicht bei null anfangen',
  'tut.app-computo--hojas.2.texto':
    'Die App bringt drei fertige Tabellen samt Formeln mit – Budget, gewichteter Durchschnitt und Messprotokoll –, damit du nie vor einem leeren Blatt sitzt. Sie gehören dir: Ändere sie oder lösche sie.',
  'tut.app-computo--hojas.3.titulo': 'Die Formelleiste',
  'tut.app-computo--hojas.3.texto':
    'Die Zelle wird hier oben bearbeitet, nicht im Raster: Auf dem Handy ist das die einzige Art, ohne Kampf zu tippen. Während du eine Formel schreibst, fügt ein Tipp auf eine Zelle ihren Bezug ein.',
  'tut.app-computo--hojas.4.titulo': 'Die Auswahl als Diagramm',
  'tut.app-computo--hojas.4.texto':
    'Markiere einen Bereich und drück den Diagramm-Button: Balken, Linien, Fläche, Kreis oder Punkte. Das Diagramm speichert den BEREICH, also bewegt es sich von selbst, sobald sich eine Zahl ändert.',
  'tut.app-computo--hojas.5.titulo': 'Exportieren',
  'tut.app-computo--hojas.5.texto':
    'Nach Excel kommt eine echte .xlsx heraus, mit lebendigen Formeln und den Diagrammen als richtige Excel-Diagramme. Als PDF geht es über den Drucker des Browsers.',
  'tut.casa.1.texto': 'Das ist dein Haus: Jeder Raum enthält eine App. Ich zeig dir die wichtigsten Bedienelemente.',
  'tut.casa.2.titulo': 'Das Hauptmenü',
  'tut.casa.2.texto':
    'Ich habe es geöffnet, damit du es siehst: Das ist das Hauptmenü, mit deinen Räumen und ihren Apps. Seine anderen Tabs bringen den Katalog der Vorlagen (Apps) und das Inventar der Objekte.',
  'tut.casa.2b.titulo': 'Der Katalog der Apps',
  'tut.casa.2b.texto':
    'Sein zweiter Tab: der Katalog der Vorlagen – alle Apps, die das Haus tragen kann, jede bereit, einem Raum zugewiesen zu werden.',
  'tut.casa.2c.titulo': 'Das Inventar',
  'tut.casa.2c.texto':
    'Und der dritte: das Inventar – die Objekte und Teile, die du aus deinen Räumen aufbewahrst, bereit, wieder aufgestellt zu werden, wo du willst.',
  'tut.casa.3.titulo': 'Sich bewegen',
  'tut.casa.3.texto':
    'Lauf mit dem Joystick, mit WASD oder mit den Pfeiltasten: Das ganze Haus lässt sich zu Fuß erkunden. Spazieren öffnet die Apps nicht – zum Betreten tippst du das Objekt mit der schwebenden Kugel des Raums an.',
  'tut.casa.4.titulo': 'Drei Arten zu schauen',
  'tut.casa.4.texto':
    'Ich habe sie dir gerade live gezeigt: isometrisch, dritte und erste Person (oder die Taste V). Ein Tipp auf Iso zentriert die Kamera außerdem wieder auf deiner Figur: der schnelle Rückweg, wenn du dich beim Erkunden weit entfernt hast.',
  'tut.casa.5.titulo': 'Ein Feld, mehrere Besitzer',
  'tut.casa.5.texto':
    'Diese Ecke ist nicht nur der Navigationswürfel: Kommst du etwas nahe, mit dem sich etwas anfangen lässt – einem Stuhl, einem Fahrzeug, einem Platz –, wechselt sie von selbst zu dem, was gerade in der Nähe ist. Nichts wird aktiv, ohne dass du hingehst.',
  'tut.casa.6.titulo': 'Das Werkzeugrad',
  'tut.casa.6.texto':
    'Hier ist es geöffnet: Bewegungen, Spielzeug, Fahrzeuge und Bauen, bis zu 3 gleichzeitig ausgerüstet. Es kommt aus dem Button neben dem Joystick oder aus dem Eckfeld, wenn du die Hände frei hast.',
  'tut.casa.7.titulo': 'Die Uhr',
  'tut.casa.7.texto':
    'Die Uhrzeit des Hauses: Tipp sie an und der vollständige Kalender öffnet sich, mit seinen Missionen des Tages. Und die Sonne oder der Mond öffnen dieses Panel: den Lauf der Zeit und das Licht der Szene.',
  'tut.casa.8.titulo': 'Die Musik des Hauses',
  'tut.casa.8.texto':
    'Das Haus startet in Stille: Wenn du einen Soundtrack willst, schalte hier die Musik ein. Jeder Raum bringt vorgeladene Themen-Songs mit – oder lass die allgemeine Umgebungsmusik des Hauses laufen.',
  'tut.casa.9.titulo': 'Der Chat',
  'tut.casa.9.texto':
    'Der Chat des Architekten: Erzähl ihm, was du getan hast, und er trägt es in der richtigen App ein; bitte ihn um Änderungen am Haus, um Bilder und sogar 3D-Modelle für deine Räume – oder plaudere einfach ein Weilchen.',
  'tut.casa.asistente.titulo': 'Dein Assistent',
  'tut.casa.asistente.texto':
    'Dieser Button ist dein Assistent: der, der dir im Chat antwortet. Tipp ihn an, um sein Menü zu öffnen und ihn anzupassen – seine Gestalt, seine Stimme und seine Persönlichkeit.',
  'tut.casa.mas.titulo': 'Das Menü +',
  'tut.casa.mas.texto':
    'Ich habe es geöffnet, damit du es siehst: Mit dem + hängst du Dinge an den Chat an – lade ein Bild oder ein PDF hoch, mach ein Foto oder wechsle zur AR-Maske und zum AR-Chat von Angesicht zu Angesicht.',
  'tut.casa.editor.titulo': 'Der Editor',
  'tut.casa.editor.texto':
    'Der Button Editor oben öffnet das hier: die vollständige Anpassung in vier Tabs – Karte, Figuren, Objekte und Einstellungen. Hier wird das ganze Haus gezeichnet und eingekleidet.',
  'tut.casa.10.texto':
    'Das war das Wichtigste. Jedes Menü und jede App haben ihren eigenen ?-Button mit ihrem Tutorial: Frag danach, wenn dir etwas nicht einleuchtet.',
  'tut.primeros.1.texto':
    'Dieses Tutorial beantwortet zwei Fragen: wie du deine Apps BETRITTST und wie du eine neue ERSTELLST. Beides wohnt hier, im Tab Räume.',
  'tut.primeros.entrar.titulo': 'Deine Apps betreten',
  'tut.primeros.entrar.texto':
    'Jeder Raum trägt seine App, und du hast drei Türen: seine Karte hier im Menü, draußen auf der Karte das Objekt mit der schwebenden Kugel und den Schnellzugriff des MPH-Buttons oben.',
  'tut.primeros.entrar.vacio': 'Hier werden deine Räume wohnen, jeder mit seiner App, und du wirst drei Türen haben: seine Karte hier im Menü, draußen auf der Karte das Objekt mit der schwebenden Kugel und den Schnellzugriff des MPH-Buttons oben. Bauen wir den ersten…',
  'tut.primeros.prev.titulo': 'Hier kommt dein Raum hin',
  'tut.primeros.prev.texto':
    'Das ist die Vorschau des Pinsels: Die grüne Silhouette mit ihren Wänden zeigt, wo der Raum entstehen wird. Beim Bauen von Hand siehst du sie genauso unter deinem Finger, bevor du loslässt.',
  'tut.primeros.mat.titulo': 'Gebaut!',
  'tut.primeros.mat.texto':
    'Und da ist er: Der Raum ist genau dort entstanden, wo die Vorschau es zeigte, mit seiner Tür nach vorn. Eine App trägt er noch nicht – die kommt als Nächstes.',
  'tut.primeros.2.titulo': 'Raum erstellen',
  'tut.primeros.2.texto':
    'Mit diesem Button zeichnest du neue Räume auf der Karte, Zelle für Zelle. Schau – ich zeig dir, wo deiner stehen würde…',
  'tut.primeros.3.titulo': 'Dein neuer Raum',
  'tut.primeros.3.texto':
    'Da ist er! Ein frisch erstellter Raum, noch ohne App: Deshalb steht auf seiner Karte + Zuweisen.',
  'tut.primeros.apps.titulo': 'Die verfügbaren Apps',
  'tut.primeros.apps.texto':
    'Das öffnet + Zuweisen: das Panel mit allen verfügbaren Apps. Jede richtet ihren Raum ein, mit ihren Möbeln und ihrer App. Ich gebe deinem eine…',
  'tut.primeros.4.titulo': 'Eine App zuweisen',
  'tut.primeros.4.texto':
    'Mit + Zuweisen habe ich ihm seine App gegeben: Sieh, wie der Raum ihren Namen, ihr Symbol und ihre Möbel übernommen hat. Von jetzt an ist seine ganze Karte der Button zum Betreten.',
  'tut.primeros.5.titulo': 'Betreten',
  'tut.primeros.5.texto':
    'Wir sind drin: Das ist die App des Raums. Um später zurückzukommen: seine Karte im Menü, das Objekt mit der Kugel auf der Karte oder der Schnellzugriff des MPH-Buttons oben.',
  'tut.primeros.press.titulo': 'Halte gedrückt',
  'tut.primeros.press.texto':
    'Schau, wie es zittert: Einen Raum oder ein Objekt gedrückt zu halten weckt es auf, mit seinem Menü. So verschiebst du es, wenn dir nicht gefällt, wo es gelandet ist, oder löschst es.',
  'tut.primeros.6.texto':
    'Das ist alles: den Raum erstellen, ihm seine App geben, ihn betreten und einrichten. Dieser war zum Üben – ich nehme ihn am Ende mit, damit du dein Haus nach deinem Geschmack baust.',
  'tut.menu-cuartos.1.texto': 'Der Tab Räume listet alle Räume deines Hauses auf, nach Kategorie gruppiert.',
  'tut.menu-cuartos.2.titulo': 'Deine Übersicht',
  'tut.menu-cuartos.2.texto':
    'Deine Figur lebt von deiner echten Aktivität: Hier siehst du ihre Laune, ihr Level und ihre Serie. Trag etwas in irgendeiner App ein, und sie freut sich; ein paar Tage ohne alles, und sie wird traurig – bestraft oder zurückgesetzt wird nie etwas.',
  'tut.menu-cuartos.3.titulo': 'Die Karten',
  'tut.menu-cuartos.3.texto':
    'Jede Karte ist ein Raum: ihr Symbol, ihr Name und der Fortschritt ihrer App, gruppiert in Körper, Geist, Extras und Einstellungen. Räume ohne zugewiesene App stehen ganz am Ende.',
  'tut.menu-cuartos.4.titulo': 'Die Optionen des Raums',
  'tut.menu-cuartos.4.texto':
    'Das Zahnrad klappt die Optionen des Raums in einer Reihe aus: ihn in der Liste nach oben oder unten schieben, ihn löschen – und Bearbeiten, das seinen Editor für Form, Farben, Wände und Objekte öffnet.',
  'tut.menu-cuartos.5.titulo': 'Die ganze Karte führt hinein',
  'tut.menu-cuartos.5.texto':
    'Die komplette Karte ist der Button: Tipp sie an einer beliebigen Stelle an und du betrittst die App des Raums. Hat er noch keine App, steht auf derselben Karte + Zuweisen, und sie öffnet den Katalog, um ihm eine auszusuchen.',
  'tut.menu-cuartos.6.titulo': 'Raum erstellen',
  'tut.menu-cuartos.6.texto':
    'Raum erstellen öffnet den Karteneditor mit dem Pinsel bereit für den neuen Raum: Form, Größe und Lage liegen bei dir. Am Handy ist die Abkürzung über das Werkzeugrad › Bauen › Räume bequemer – sie zeichnet direkt auf die Karte, ohne das Panel zu öffnen.',
  'tut.menu-cuartos.7.texto':
    'Kurz gesagt: Bearbeiten zum Anpassen, Betreten zum Benutzen der App. Die anderen Tabs dieses Menüs haben ihr eigenes Tutorial.',
  'tut.menu-plantillas.1.texto':
    'Eine Vorlage ist eine App (Küche, Fitness, Finanzen…). Sie wird einem Objekt in einem Raum zugewiesen und öffnet sich, wenn du hineingehst.',
  'tut.menu-plantillas.2.titulo': 'Zwei Ansichten',
  'tut.menu-plantillas.2.texto':
    'Räume sind die gewohnten Apps, jede in ihrem Objekt. Bei Extras läuft es anders: Strecken, Plätze, Gemüsegarten, Bauernhof oder Paintball baust du direkt aufs Gelände, ohne dass sie einen Raum belegen.',
  'tut.menu-plantillas.3.titulo': 'Der Katalog',
  'tut.menu-plantillas.3.texto':
    'Die mitgelieferten Apps und deine eigenen, nach Gruppen sortiert. Tippe eine an, um sie einem Raum zuzuweisen – oder unter Extras, um sie auf der Karte zu bauen.',
  'tut.menu-plantillas.4.titulo': 'Eigene Vorlagen',
  'tut.menu-plantillas.4.texto':
    'Bau dir eigene Vorlagen aus Bausteinen: Notizen, Checklisten, Zähler, Gewohnheiten, Galerien… Dieser Button öffnet seinen eigenen Editor mit eigenem Tutorial.',
  'tut.menu-plantillas.5.texto':
    'Ein und derselbe Raum kann mehrere Apps beherbergen: Beim Betreten erscheint eine Auswahl, welche du öffnen willst.',
  'tut.plantillas-custom.1.texto':
    'Dieser Editor baut eine eigene App von Grund auf: Du gibst ihr Namen, Emoji und Bausteine, und sie landet im Katalog neben den mitgelieferten.',
  'tut.plantillas-custom.2.titulo': 'Name, Emoji und Farbe',
  'tut.plantillas-custom.2.texto':
    'Wie sie heißen soll und in welcher Farbe sie im Menü, im Katalog und im Kalender erscheint, wenn du etwas von ihr einplanst.',
  'tut.plantillas-custom.3.titulo': 'Die Werkzeuge',
  'tut.plantillas-custom.3.texto':
    'Zwölf Bausteintypen: Notizen, Checkliste, Zähler, Gewohnheit, Sitzungen, Countdown, Galerie, Journal, Bewertung, Fortschritt, Liste und Links. Jeder, den du hinzufügst, wird zu einem Abschnitt deiner App.',
  'tut.plantillas-custom.4.titulo': 'Die Reihenfolge zählt',
  'tut.plantillas-custom.4.texto':
    'Hinzugefügte Blöcke ordnest du mit den Pfeilen um und entfernst sie mit dem ✕ – einen zu entfernen löscht beim Speichern seine Daten, also schau vorher noch mal hin. Mit dem Ausklappmenü „Menü“ wandern sie von einem Tab zum anderen, ohne dass etwas verloren geht.',
  'tut.plantillas-custom.5.titulo': 'Speichern',
  'tut.plantillas-custom.5.texto':
    'Mit einem Namen und mindestens einem Baustein legt Speichern sie fertig in den Katalog. Von dort weist du sie einem Objekt zu wie jede mitgelieferte Vorlage.',
  'tut.plantillas-custom.6.texto':
    'Du kannst sie jederzeit wieder bearbeiten: Ihre Bausteine und ihre Daten bleiben unangetastet, es ändert sich nur, was du änderst.',
  'tut.menu-inventario.1.texto':
    'Das Inventar: alle Objekte, die du in deinem Haus platzieren kannst, bereit zum Ziehen.',
  'tut.menu-inventario.2.titulo': 'Objekte',
  'tut.menu-inventario.2.texto':
    'Deine Objektbibliothek nach Kategorien und Ordnern. Du kannst sie umbenennen und ordnen, damit du sie beim nächsten Mal schnell findest.',
  'tut.menu-inventario.3.titulo': 'Spezialobjekte',
  'tut.menu-inventario.3.texto':
    'Die, die etwas tun und nicht nur schmücken: Fahrzeuge zum Aufsteigen, Spielzeugpistolen, Brunnen, Spielplatzgeräte und Lichter.',
  'tut.menu-inventario.4.titulo': 'Platzieren',
  'tut.menu-inventario.4.texto':
    'Bei geöffnetem Menü ziehst du ein Vorschaubild direkt in die 3D-Szene und setzt es ab, wo du willst.',
  'tut.menu-inventario.5.texto':
    'Zum Bewegen, Umfärben oder Löschen von schon Platziertem nimmst du den Editor (Tab Objekte) – dieses Menü bringt nur neue Dinge in die Szene.',
  'tut.editor-mapa.1.texto':
    'Der Hauseditor hat 4 Tabs: Karte, Figuren, Objekte und Einstellungen. Diese Tour ist die von Karte; die anderen drei haben ihre eigene.',
  'tut.editor-mapa.2.titulo': 'Der Grundriss',
  'tut.editor-mapa.2.texto':
    'Du zeichnest auf einem Raster von oben: Räume, Wände, Türen, Fenster und Böden, mit den Modi und Pinseln aus der oberen Leiste. Was du ziehst, erscheint sofort in 3D, ohne neu zu laden.',
  'tut.editor-mapa.3.texto':
    'Dächer gehen pro Zelle: Jede kann ihre eigene Form oder ihr eigenes Material haben, so mischt ein einziger Raum verschiedene Dachschrägen statt eines einzigen Flachdachs.',
  'tut.editor-mapa.4.texto':
    'Das Haus hat auch Ebenen: stapelbare Stockwerke nach oben und einen Keller nach unten. Jede neue Ebene entsteht mit ihrem eigenen Weg nach oben – einer Treppe oder einer Aussparung in der Platte –, der den Boden darüber durchbricht.',
  'tut.editor-mapa.5.titulo': 'Fertig',
  'tut.editor-mapa.5.texto':
    'Alles speichert sich von selbst, während du bearbeitest. Fertig schließt den Editor und bringt dich zurück ins Spiel, mit dem Haus genau so, wie du es hinterlassen hast.',
  'tut.editor-personajes.1.texto':
    'Deine Hauptfigur und deine Assistenten leben im selben Editor: Wähle oben aus, wen du bearbeitest, und die Werkzeuge richten sich danach, was für wen Sinn ergibt.',
  'tut.editor-personajes.2.titulo': 'Gesicht und Foto',
  'tut.editor-personajes.2.texto':
    'Ausdruck, Frisur und Haarfarbe – oder direkt ein Foto von dir, damit die Figur dir ähnlich sieht. Nicht jeder Körper lässt ein eigenes Gesicht zu.',
  'tut.editor-personajes.3.titulo': 'Kleidung nach Kategorie',
  'tut.editor-personajes.3.texto':
    'Jedes Kleidungsstück wird einzeln angezogen, ausgezogen und umgefärbt: Hemd, Hose, Schuhe, Accessoires. Sie lassen sich frei kombinieren.',
  'tut.editor-personajes.4.titulo': 'Gespeicherte Outfits',
  'tut.editor-personajes.4.texto':
    'Speichere eine komplette Kombination als Outfit und zieh dich mit einem Tipp ganz um, statt jedes Mal Stück für Stück neu zusammenzustellen.',
  'tut.editor-personajes.5.titulo': 'Garderobe pro Raum',
  'tut.editor-personajes.5.texto':
    'Weise jedem Raum ein anderes Outfit zu: Dein Avatar betritt Fitness in Laufsachen und zieht sich von selbst um, sobald er in die Küche geht.',
  'tut.editor-personajes.6.texto':
    'Körper, Farbe und Größe bearbeitest du wie immer; mit aktivierter KI kannst du dir auch ein eigenes 3D-Modell erzeugen lassen, statt eines der fertigen zu wählen.',
  'tut.editor-objetos.1.texto':
    'Tippe ein Objekt in der Szene (oder in der Liste) an, um es zu bearbeiten: Farbe, Größe und Drehung sind die drei Einstellungen, die alle teilen.',
  'tut.editor-objetos.2.texto':
    'Objekte mit zugewiesener App öffnen ihre Vorlage, wenn du den Raum betrittst; der Rest ist reine Deko – bearbeitet werden beide gleich.',
  'tut.editor-objetos.3.texto':
    'Das Zahnrad ⚙️ eines Objekts macht es Stück für Stück bearbeitbar: Bau dir eigene Modelle aus Grundformen zusammen oder beschreib der KI eins, und sie macht es dir.',
  'tut.editor-config.1.texto':
    'Acht ausklappbare Abschnitte, keine lange Liste: Tippe auf einen Titel, um nur den zu öffnen, der dich interessiert.',
  'tut.editor-config.2.titulo': 'Konto und KI',
  'tut.editor-config.2.texto':
    'Anmelden, dein Plan und wie viel KI du diesen Monat verbraucht hast; gleich daneben die Preistabelle für jede Operation. Beide haben ihr eigenes ausführliches Tutorial.',
  'tut.editor-config.3.titulo': 'Visueller Stil',
  'tut.editor-config.3.texto':
    'Das Thema der Karte (Licht, Nebel, Beleuchtung) und die visuellen Effekte, alles erst bei Bedarf geladen, damit nichts unnötig wiegt.',
  'tut.editor-config.4.titulo': 'Oberfläche und Sprache',
  'tut.editor-config.4.texto':
    'Sprache, Oberflächendesign (hell/dunkel/automatisch), Symbolstil und Dichte – alles, was ändert, WIE das Haus aussieht, nicht was darin steckt.',
  'tut.editor-config.5.titulo': 'Benachrichtigungen',
  'tut.editor-config.5.texto':
    'Welche Hinweise ankommen und welche still bleiben: Routinen, Plan-Hinweise und Erinnerungen lassen sich einzeln abschalten.',
  'tut.editor-config.6.texto':
    'Musik und Tutorials haben ihren eigenen Rundgang; die Datensicherung auch, und die schaut man sich am besten vor einem Gerätewechsel an.',
  'tut.respaldo.1.titulo': 'Wo dein Haus wohnt',
  'tut.respaldo.1.texto':
    'Ohne Konto und ohne Synchronisierung liegen deine Daten nur auf diesem Gerät. Der Hinweis oben sagt dir, ob der Browser sie vor einer automatischen Aufräumaktion schützen darf.',
  'tut.respaldo.2.titulo': 'Exportieren',
  'tut.respaldo.2.texto':
    'Lädt eine einzige JSON-Datei mit all deinen Tabellen herunter: Räume, Ziele, Einträge, alles. Das ist deine Sicherung von Hand.',
  'tut.respaldo.3.titulo': 'Wiederherstellen',
  'tut.respaldo.3.texto':
    'Wiederherstellen ERSETZT alle aktuellen Daten durch die aus der Datei – vorher wird nachgefragt und angezeigt, wie viele Datensätze sie mitbringt, es gibt also keine Überraschungen.',
  'tut.respaldo.4.texto':
    'Sichere am besten, bevor du das Gerät oder den Browser wechselst – oder einfach hin und wieder: Ohne Konto ist das die einzige Kopie, die du hast.',
  'tut.editor-cuarto.1.texto':
    'Du bearbeitest einen bestimmten Raum: Grundriss und Kamera richten sich auf ihn aus, nicht auf das ganze Haus.',
  'tut.editor-cuarto.2.titulo': 'Was du bearbeiten kannst',
  'tut.editor-cuarto.2.texto':
    'Form, Boden, Wände, Türen, Farbe und Name des Raums – und seine Objekte. Auch die zugewiesene App änderst du von hier aus: Deswegen kommen die meisten überhaupt in dieses Panel.',
  'tut.editor-cuarto.3.titulo': 'Zurück zur Karte',
  'tut.editor-cuarto.3.texto':
    'Dieser Pfeil führt zurück zur ganzen Karte, ohne den Editor zu schließen – so arbeitest du gleich am nächsten Raum weiter.',
  'tut.editor-cuarto.4.texto':
    'Es gibt auch eine schwebende Schaltfläche „Raum verlassen“ über dem Raum selbst in der 3D-Ansicht, falls du sie lieber dort antippst.',
  'tut.inicio.1.texto':
    'Der Button mit dem Namen deines Hauses öffnet den Startbildschirm: deine Apps in einem Raster, mit der Mechanik eines Handys.',
  'tut.inicio.2.titulo': 'Ein Tipp, eine App',
  'tut.inicio.2.texto':
    'Hier erscheinen nur Räume, die schon eine App haben, mit ihrem Level, ihrer Serie und ihren erfüllten Listen. Der rote Zähler in der Ecke sind ihre heute noch offenen Missionen, und ein Tipp auf die Karte führt direkt hinein.',
  'tut.inicio.3.titulo': 'Halte eine Karte gedrückt',
  'tut.inicio.3.texto':
    'Langes Drücken hebt sie an und alle wackeln, wie auf einem Handy: Zieh sie, um umzusortieren, oder tipp auf den Stift in ihrer Ecke, um ihren Steckbrief zu bearbeiten.',
  'tut.inicio.4.titulo': 'Deine Herausforderung im Blick',
  'tut.inicio.4.texto':
    'Die beiden Ringe sind der Sisyphos-Berg: der Rang des Jahres und die verdienten Abzeichen. Ein Tipp darauf öffnet den ganzen Berg, denselben wie im Seitenmenü.',
  'tut.inicio.5.titulo': 'Hintergrund und 3D-Ansicht',
  'tut.inicio.5.texto':
    'Dieser Button gibt dem Raster ein Hintergrundbild, abgedunkelt, damit die Karten lesbar bleiben. Der daneben wechselt zwischen dem Symbol jedes Raums und seiner möblierten 3D-Miniatur.',
  'tut.inicio.6.texto':
    'Räume erstellen, sie löschen oder Apps zuweisen bleibt Sache des Seitenmenüs: Dieser Bildschirm ist fürs schnelle Betreten da. Ein Tipp außerhalb schließt ihn.',
  'tut.herramientas.1.texto': 'Dieser Button öffnet das Werkzeugrad deiner Figur.',
  'tut.herramientas.2.titulo': 'Zwei Ebenen',
  'tut.herramientas.2.texto':
    'Erst wählst du die Kategorie, dann das konkrete Werkzeug darin. Du kannst bis zu 3 Werkzeuge gleichzeitig ausrüsten – aus verschiedenen Kategorien oder mehrmals aus derselben.',
  'tut.herramientas.3.titulo': 'Die vierte Kategorie',
  'tut.herramientas.3.texto':
    'Bauen rüstet kein Spielzeug aus: Es schaltet den Zeichenmodus der Karte ein (Räume, Wände, Türen, Fenster, Böden, Dächer), ohne den Umweg über den ganzen Editor. Derselbe Grundriss, nur schneller erreicht.',
  'tut.herramientas.4.titulo': 'Die Mitte',
  'tut.herramientas.4.texto':
    'Die Mitte legt alles Ausgerüstete ab und gibt dem Feld in der Ecke seinen normalen Zustand zurück (den Ansichtswürfel oder eine andere kontextabhängige Aktion, je nachdem, was in der Nähe ist).',
  'tut.herramientas.5.texto':
    'Ein Tipp außerhalb des Rads schließt es. Probier es aus, wann du willst: Nichts davon wird dauerhaft gespeichert, es gilt nur, solange du es trägst.',
  'tut.navegacion.1.texto':
    'Drei Kameras: Iso (Puppenhaus-Ansicht), dritte und erste Person. Wechsle hier oder mit der Taste V.',
  'tut.navegacion.2.titulo': 'Sich orientieren',
  'tut.navegacion.2.texto':
    'In Iso steuerst du die Kamera mit dem Würfel: Seine Ecken geben die isometrischen Winkel und seine Flächen die flachen Ansichten. In der 3./1. Person übernimmt seinen Platz ein Pad, an dem du ziehst, um dich umzuschauen.',
  'tut.navegacion.3.titulo': 'Wenn etwas in der Nähe ist',
  'tut.navegacion.3.texto':
    'Dasselbe Feld in der Ecke hört auf, Kamera zu sein, sobald du dich etwas Interaktivem näherst: Ein Platz bietet dir sein Spielen an, ein Fahrzeug sein Aufsteigen, ein Stuhl sein Hinsetzen. Immer nur eine Sache und immer über die Nähe – nie von selbst.',
  'tut.navegacion.4.titulo': 'Drehen und zentrieren',
  'tut.navegacion.4.texto':
    'Jeder Pfeil dreht eine Vierteldrehung: die Karte in Iso, deinen Blick in der 3./1. Person. Der dritte Button erscheint nur, wenn die Karte vor dir liegt, und zentriert sie wieder, falls du dich beim Erkunden verlaufen hast.',
  'tut.navegacion.5.titulo': 'Bewegen',
  'tut.navegacion.5.texto':
    'Lauf mit dem Joystick, WASD oder den Pfeiltasten. Im Wasser schwimmst du; auf einem Fahrzeug fährst du mit derselben Steuerung.',
  'tut.navegacion.6.texto':
    'Der Button Editor oben funktioniert in jeder Ansicht: Öffne ihn in der 3./1. Person und du bearbeitest im Gehen – tippst Objekte, Wände oder Figuren genau dort an, wo sie stehen.',
  'tut.chat.1.texto':
    'Der Chat des Architekten: Er trägt deinen Tag ein, baut am Haus und beantwortet deine Fragen – alles aus ein und demselben Feld.',
  'tut.chat.2.titulo': 'Schreiben',
  'tut.chat.2.texto':
    'Schreib frei heraus: „20 Min gelaufen“, „250 im Supermarkt ausgegeben“… Der Chip daneben zeigt, in welcher App es landet. Mit @Raum gibst du den Zielort selbst vor, wenn er falsch rät.',
  'tut.chat.3.titulo': 'Per Sprache diktieren',
  'tut.chat.3.texto':
    'Das Mikrofon schreibt ins Textfeld, was du sagst – praktisch, um etwas einzutragen, ohne loszulassen, was du gerade in den Händen hast.',
  'tut.chat.4.titulo': 'Anhängen',
  'tut.chat.4.texto':
    'Das + klappt fünf Optionen aus: ein Bild oder ein PDF hochladen und ein Foto aufnehmen – mit eingeschalteter KI lesen sich ein Beleg oder die Waage von selbst aus – dazu zwei, die keine KI brauchen: die AR-Maske und der AR-Chat.',
  'tut.chat.4b.titulo': 'Die AR-Maske',
  'tut.chat.4b.texto':
    'Sie schaltet die Kamera ein und setzt dir die Maske aufs Gesicht, folgt dir live – dieselbe wie im Vorstellungsvideo des Hauses. Funktioniert ohne KI und ohne Konto.',
  'tut.chat.4c.titulo': 'Der AR-Chat',
  'tut.chat.4c.texto':
    'Dasselbe Gespräch wie immer, aber mit deiner Kamera als Hintergrund und dem Assistenten in 3D davor, mit Emotionen, die begleiten, was er antwortet.',
  'tut.chat.5.titulo': 'Assistenten',
  'tut.chat.5.texto':
    'Dein Assistent gibt den Antworten ein Gesicht und eine Stimme. Tipp ihn an, um das Gespräch zu sehen, den Assistenten zu wechseln oder weitere anzulegen.',
  'tut.chat.6.titulo': 'Das Handbuch',
  'tut.chat.6.texto':
    'Das Handbuch listet die Befehle auf: Räume hinzufügen oder entfernen, Objekte erstellen, sich Dinge merken…',
  'tut.chat.7.titulo': 'Das KI-Modell',
  'tut.chat.7.texto':
    'Dieses Symbol wählt aus, welche KI antwortet, und speichert deinen Schlüssel, falls du deinen eigenen nutzt. Ohne konfiguriertes Modell läuft der Chat weiter über Stichwörter, versteht aber keine freie Sprache.',
  'tut.chat.8.texto':
    'Du kannst hier auch fragen „Wie funktioniert die Küche?“ oder „Tutorial zu Fitness“ verlangen; und was dabei gespeichert wurde, schaust du dir in der Tour „Einträge“ an.',
  'tut.chat-registros.1.texto':
    'Chats zeigt, mit wem du geredet hast; Einträge zeigt, was aus diesen Gesprächen gespeichert wurde.',
  'tut.chat-registros.2.titulo': 'Was er sich über dich merkt',
  'tut.chat-registros.2.texto':
    'Dinge, die der Assistent es wert fand, sich zwischen den Sitzungen zu merken – eine Allergie, ein Ziel, eine Vorliebe – damit er dich nicht noch einmal danach fragt. Mit einem Tipp auf das ✕ vergisst er sie wieder.',
  'tut.chat-registros.3.texto':
    'Was du in deinen Apps einträgst (Mahlzeiten, Ausgaben, Einheiten), lebt in der jeweiligen App, nicht hier: Dieser Tab ist nur das Gedächtnis des Gesprächs selbst.',
  'tut.app-generica.1.texto':
    'Der Kopfbereich zeigt den Raum und die geöffnete App. Hat der Raum mehrere Apps, führt der Pfeil ‹ zurück zu den Apps des Raums.',
  'tut.app-generica.2.titulo': 'Missionen',
  'tut.app-generica.2.texto':
    'Der Button Missionen öffnet, was heute in dieser App ansteht: deine Tagesziele, was du eingeplant hast und was deine Ziele einfordern. Jeder Schritt streicht sich von selbst durch, sobald du einträgst – und erst die ganze erfüllte Liste bringt die XP des Tages.',
  'tut.app-generica.3.titulo': 'Die Bausteine',
  'tut.app-generica.3.texto':
    'Diese Vorlage ist aus Bausteinen zusammengesetzt (Notizen, Listen, Zähler, Gewohnheiten…). Ändern kannst du sie unter Menü › Vorlagen › Bearbeiten.',
  'tut.app-generica.4.titulo': 'Verlassen',
  'tut.app-generica.4.texto':
    '„Zurück zum Haus“ schließt die App und setzt dich wieder in der 3D-Ansicht ab. Was du hier eingetragen hast, ist längst gespeichert.',
  'tut.enlaces.1.titulo': 'Vom Ziel zu seiner App',
  'tut.enlaces.1.texto':
    'Jedes Ziel und jeder Planschritt kann einen Chip mit dem Symbol einer App tragen: Er beantwortet die Frage „Und wo trage ich das ein?“.',
  'tut.enlaces.2.titulo': 'Setzen oder ändern',
  'tut.enlaces.2.texto':
    '„App verknüpfen“ öffnet die Auswahl: Zuerst wählst du die App, dann welchen Teil davon (falls sie mehrere Stellen zum Eintragen hat).',
  'tut.enlaces.3.titulo': 'Wenn der Chip sitzt',
  'tut.enlaces.3.texto':
    'Sitzt der Chip, öffnet ein Tipp darauf die App direkt an dieser Stelle. Ihn zu entfernen löscht weder das Ziel noch seine Termine: Es löst nur die Verknüpfung.',
  'tut.enlaces.4.texto':
    'Als Ziel erscheinen nur Apps, die einem Objekt in einem Raum zugewiesen sind: eine ohne Raum zu verknüpfen wäre ein Chip, der nirgendwohin führt.',
  'tut.musica.1.texto': 'Dieser Button öffnet die Musiksteuerung des Hauses.',
  'tut.musica.2.titulo': 'An oder aus',
  'tut.musica.2.texto':
    'Ein Schalter für die gesamte Umgebungsmusik im Haus. Ausgeschaltet bleibt das Haus still – bis auf die Geräusche einzelner Aktionen.',
  'tut.musica.3.titulo': 'Thema pro Raum',
  'tut.musica.3.texto':
    'Jeder Raum kann anders klingen: automatisch nach seiner App, ein selbst gewähltes Thema oder völlige Stille in diesem Raum, ohne den Rest des Hauses anzurühren.',
  'tut.musica.4.titulo': 'Woher der Klang kommt',
  'tut.musica.4.texto':
    'Generiert (komponiert von selbst passend zur Stimmung), Meine Titel (was du hochgeladen hast) oder System (was du außerhalb der App ohnehin schon abspielst, ohne dass sich beides überlagert).',
  'tut.musica.5.titulo': 'Getrennte Lautstärken',
  'tut.musica.5.texto':
    'Musik und Aktionsgeräusche (Schritte, Klicks, Erfolge) stellst du getrennt ein – du kannst die Musik leiser drehen und die Effekte lassen, oder andersherum.',
  'tut.musica.6.texto':
    'Den HUD-Button kannst du vom Hauptbildschirm nehmen; unter Editor › Einstellungen › Musik bleibt er erreichbar.',
  'tut.cuenta-ia.1.texto':
    'Hier schaltest du die KI des Hauses ein: Ohne sie läuft der Chat weiter über Stichwörter, aber Funktionen wie ein Rezept, einen Plan oder ein Bild zu erzeugen bleiben aus.',
  'tut.cuenta-ia.2.titulo': 'Mit oder ohne Konto',
  'tut.cuenta-ia.2.texto':
    'Du kannst die KI mit deinem eigenen Anbieterschlüssel nutzen (ohne Konto, ohne Credits) oder mit einem Konto, das Credits mitbringt und zwischen deinen Geräten synchronisiert.',
  'tut.cuenta-ia.3.titulo': 'KI-Preise',
  'tut.cuenta-ia.3.texto':
    'Diese Tabelle hilft dir auch ohne Konto: Sie ist genau das, was du brauchst, um zu entscheiden, ob es sich lohnt. Raum für Raum, Operation für Operation.',
  'tut.cuenta-ia.4.titulo': 'Der einzige Hebel',
  'tut.cuenta-ia.4.texto':
    'Die Bildqualität ist das Einzige, was die Preise der ganzen Tabelle verändert: Schnell ist gut und günstig (die Voreinstellung); Beste gibt mehr Details und besseren Text im Bild.',
  'tut.cuenta-ia.5.titulo': 'Eine Einheit, viele Operationen',
  'tut.cuenta-ia.5.texto':
    'Eine Antwort kostet 1 Credit, ein langer Plan 3, ein Bild oder ein 3D-Modell 10 – die Regel gilt in allen Räumen gleich, diese Tabelle führt sie nur Punkt für Punkt auf.',
  'tut.ejemplos.1.texto':
    'Diese Leiste erscheint in fast jeder App, solange sie noch keine Daten von dir hat: ein Button, um sie mit einem Beispiel gefüllt zu sehen, statt vor einem leeren Bildschirm anzufangen.',
  'tut.ejemplos.2.texto':
    'Ein Beispiel anzusehen löscht nichts von dir und mischt sich auch nicht darunter: Es sind eigene Zeilen, als Beispiel markiert, die beim Ausschalten ausgeblendet (nicht gelöscht) werden. Schaltest du es wieder ein, kommen sie genau so zurück, wie sie waren.',
  'tut.ejemplos.3.texto':
    'Im Demo-Haus erscheint diese Leiste nicht: Peps ganzes Jahr übernimmt schon diese Rolle, ein eigenes Beispiel braucht es also nicht.',
  'tut.hoy.1.texto':
    'Missionen wohnen nicht an einem eigenen Ort: sie wohnen IN jeder App. In der Kopfzeile jedes Raums sitzt sein Missionen-Knopf mit der Liste dessen, was diese App HEUTE von dir will.',
  'tut.hoy.2.titulo': 'Drei Quellen, eine Liste',
  'tut.hoy.2.texto':
    'Die eigenen Missionen der App — das Wasser, die Kalorien — und was du für heute im Kalender eingeplant hast: alles zusammen in einer Liste, gruppiert nach dem Block, aus dem jeder Schritt stammt.',
  'tut.hoy.3.titulo': 'Erledigt, weil der Eintrag existiert',
  'tut.hoy.3.texto':
    'Der Button in der Zeile trägt den ECHTEN Wert in der App ein – ein Glas Wasser, eine Mahlzeit – und der Schritt hakt sich von selbst ab, einfach weil dieser Eintrag jetzt da ist, nicht weil ihn jemand markiert hätte. Noch einmal darauf zu tippen, wenn der Schritt erledigt ist, verdoppelt nichts: Der Button verschwindet.',
  'tut.hoy.4.titulo': 'Deine Zahl für jeden Tag',
  'tut.hoy.4.texto':
    'Schritte mit einstellbarer Zahl änderst du direkt hier. Auf 0 gesetzt, schaltet das Tagesziel aus, ohne den Verlauf der vorherigen Tage zu löschen.',
  'tut.hoy.5.titulo': 'Vom Ziel zur Routine',
  'tut.hoy.5.texto':
    'Der Kalender plant dasselbe Ziel mit fester Uhrzeit ein: Er öffnet denselben Editor wie die Routinen der Uhr, also steht es an beiden Stellen zugleich.',
  'tut.hoy.6.titulo': 'Erledigtes verschwindet nicht',
  'tut.hoy.6.texto':
    'Es wandert nach unten zu „Erledigt“, eingeklappt: zu sehen, wie der Eintrag wirkt, gehört zur Belohnung – und von dort lässt es sich rückgängig machen, falls einer zu viel hineingerutscht ist.',
  'tut.hoy.6b.titulo': 'Erst die ganze Liste zählt',
  'tut.hoy.6b.texto':
    'Alle Missionen des Tages abzuschließen zündet die Feier und bringt die XP der App: Das Level wächst durch erfüllte Listen, nicht durch einzelne Einträge.',
  'tut.hoy.7.texto':
    'Und wenn dir etwas fehlt: «Mission hinzufügen» bietet an, was diese App üblicherweise vorschlägt, und «Neue Checkliste» legt deine eigene an — eine Liste, die sich jeden Tag wiederholt.',
  'tut.hoy.8.titulo': 'Die roten Kugeln',
  'tut.hoy.8.texto':
    'Schau dir das Haus an: die Kugel, die über dem Möbelstück jedes Raums schwebt, wird rot, wenn dort heute noch etwas offen ist, und grün, wenn nichts mehr bleibt. Die genaue Zahl steht in der roten Blase seiner Karten — Startbildschirm, Menü und Eintreten-Blase — und wird bernsteinfarben, wenn etwas seine Uhrzeit überschritten hat.',
  'tut.hoy.9.titulo': 'Und alle zusammen, im Kalender',
  'tut.hoy.9.texto':
    'Das ist der Missionen-Knopf der Uhr, mit eigener Blase: er sammelt, was heute im GANZEN Haus zu tun ist, eine Karte pro App — links was fehlt, rechts was schon steht. Hier wird nichts eingetragen: jede Zeile bringt dich in ihre App, und dort entsteht der Eintrag.',
  'tut.progreso.1.texto':
    'Der Steckbrief deiner Figur: Pep hat ein ganzes Jahr echter Aktivität hinter sich, also steckt hinter jeder Zahl hier eine echte Geschichte.',
  'tut.progreso.2.titulo': 'Die Figur',
  'tut.progreso.2.texto':
    'Ein Tipp darauf öffnet den Figuren-Editor. Ihre Laune – glücklich, zufrieden, traurig oder schlafend – steigt mit jedem neuen Eintrag und sinkt nur, wenn Tage ohne einen einzigen vergehen; sie fällt nie auf einen Schlag zurück.',
  'tut.progreso.3.titulo': 'Der Sisyphos-Rang',
  'tut.progreso.3.texto':
    'Zwölf Ränge im Aufstieg: Jeder Tag mit Aktivität bringt dich eine Stufe von 365 höher. Pep hat schon mehrere Ränge geschafft; tipp darauf, um den ganzen Berg zu sehen.',
  'tut.progreso.4.titulo': 'Stufen und Gnadentage',
  'tut.progreso.4.texto':
    'Alle 7 Stufen kommt ein Abzeichen, jeder Wochenabschnitt hebt den Rang. Einen Tag auszulassen bricht nichts: Du hast 2 Gnadentage im Monat, bevor es zurück an den Anfang des aktuellen Rangs geht.',
  'tut.progreso.5.titulo': '52 Abzeichen nach Familien',
  'tut.progreso.5.texto':
    'Nach geologischen Familien gruppiert und ein Rätsel, bis du sie verdienst: kein Name, keine Beschreibung, bevor du eines freischaltest.',
  'tut.progreso.6.titulo': 'Dein Rückblick',
  'tut.progreso.6.texto':
    'Wrapped baut den Rückblick auf deine Woche, deinen Monat oder dein Jahr in Folien – es hat sein eigenes Tutorial, und in einem Jahr wie dem von Pep gibt es Daten mehr als genug.',
  'tut.progreso.7.titulo': 'Das Radar pro Raum',
  'tut.progreso.7.texto':
    'Jede Spitze ist ein Raum des Hauses, und ihre Größe ist die Summe der XP aus den Apps, die ihm zugewiesen sind. Ein Raum ohne Aktivität fällt sofort auf: Seine Spitze sackt zur Mitte hin ein.',
  'tut.wrapped.1.texto':
    'Wie Stories: Tipp rechts, um weiterzugehen, links, um zurückzugehen, und halte gedrückt, um auf einer Folie zu pausieren.',
  'tut.wrapped.2.titulo': 'Woche, Monat oder Jahr',
  'tut.wrapped.2.texto':
    'Jede Art baut ihre eigenen Folien mit ihren eigenen Daten – Peps Jahresrückblick ist der längste, mit den höchsten und den tiefsten Momenten des ganzen Jahres.',
  'tut.wrapped.3.titulo': 'Von Zeitraum zu Zeitraum',
  'tut.wrapped.3.texto':
    'Die Pfeile ‹ › führen durch schon abgeschlossene Zeiträume: Über heute hinaus geht es nicht, du vergleichst also immer mit etwas Echtem.',
  'tut.wrapped.4.titulo': 'Eine Folie teilen',
  'tut.wrapped.4.texto':
    'Kopiert den Text der Folie, die du gerade siehst, fertig zum Einfügen, wo du willst – ganz ohne Screenshots.',
  'tut.wrapped.5.texto':
    'Ein Punkt neben dem Button, der ihn öffnet, meldet einen neuen Rückblick, den du noch nicht gesehen hast; öffnest du ihn, geht der Punkt aus.',
  'tut.infra-huerto--ciclo.8.texto':
    'Das hier ist Peps Gnadenhof: auf der einen Seite die Gehege, auf der anderen der Gemüsegarten, der sie ernährt. Auf zu den Beeten.',
  'tut.infra-huerto--ciclo.1.texto':
    'Das ist der Gemüsegarten von Peps Gnadenhof: echte Beete mit einem Jahr Arbeit darin. Nichts davon ist ein Beispiel – es lebt, es wächst in Echtzeit, und du darfst anfassen.',
  'tut.infra-huerto--ciclo.2.texto':
    'Essen und Bauernhof teilen sich einen Editor: Was du hier erntest, füllt die Vorräte der Tiere nebenan. Es ist eine einzige Kette.',
  'tut.infra-huerto--ciclo.3.titulo': 'Gießen entscheidet',
  'tut.infra-huerto--ciclo.3.texto':
    'Schau dir die Beete an: ein frisch gelegtes Korn, halb gewachsene Pflanzen, eine Sonnenblume, die bereit ist … und eine verwelkte Karotte, die Pep mit Absicht nicht gegossen hat. Der blaue Tropfen meldet den Durst; was verwelkt ist, rettet niemand mehr.',
  'tut.infra-huerto--ciclo.4.titulo': 'Automatische Bewässerung',
  'tut.infra-huerto--ciclo.4.texto':
    'Die Tomate hat einen Sprinkler: Er gießt ihre Zelle und die acht Nachbarzellen für immer. So lässt du den Gemüsegarten allein, ohne dass etwas verwelkt.',
  'tut.infra-huerto--ciclo.5.titulo': 'Ernten',
  'tut.infra-huerto--ciclo.5.texto':
    'Die Sonnenblume ist bereit: einmal tippen und ab in den Korb. Du kannst auch ernten, indem du über alles läufst, was bereit ist – ganz ohne diesen Editor.',
  'tut.infra-huerto--ciclo.6.titulo': 'Ein Jahr im Korb',
  'tut.infra-huerto--ciclo.6.texto':
    'Jedes Beet zählt seine Ernten mit, und im Korb sammelt sich das ganze Jahr – über 400 Stück. Davon leben die Tiere des Gnadenhofs.',
  'tut.infra-huerto--ciclo.7.texto':
    'Alles läuft weiter, wenn du gehst. In der Demo darfst du wirklich gießen, ernten und säen: Probier es aus, bevor du weiterziehst.',
  'tut.infra-huerto--parcelas.1.titulo': 'Zuerst die Erde',
  'tut.infra-huerto--parcelas.1.texto':
    'Mit Beet tippst du auf eine Zelle der Karte und dort liegt fertige Erde. Auf dem Gnadenhof warten zwei leere Beete auf dich.',
  'tut.infra-huerto--parcelas.2.titulo': 'Was du säst',
  'tut.infra-huerto--parcelas.2.texto':
    'Sechs Arten, und unter jeder steht, wie lange sie braucht und wie oft sie Wasser will: die Karotte in 3 Minuten, der Kürbis in 2 Stunden.',
  'tut.infra-huerto--parcelas.3.titulo': 'Die Schnelle',
  'tut.infra-huerto--parcelas.3.texto':
    'Wenn du den ganzen Kreislauf heute sehen willst, sä eine Karotte in ein freies Beet: Sie ist bereit, bevor du deinen Rundgang beendet hast.',
  'tut.infra-huerto--parcelas.4.titulo': 'Rückgängig',
  'tut.infra-huerto--parcelas.4.texto':
    'Entfernen geht Schicht für Schicht auf derselben Zelle: erst die Pflanze, dann der Sprinkler und zum Schluss das Beet.',
  'tut.infra-huerto--parcelas.5.texto':
    'Mehr ist es nicht: Erde, Art und Geduld. Was du in der Demo säst, wächst wirklich, während du den Rest erkundest.',
  'tut.infra-granja--cuidar.8.texto':
    'Das ist Peps Gnadenhof: die Gehege der Schützlinge und im Süden der Gemüsegarten, von dem sie leben. Gehen wir mit ihnen hinunter.',
  'tut.infra-granja--cuidar.1.texto':
    'Das sind die Schützlinge von Peps Gnadenhof: jeder mit eigenem Namen, eigenem Hunger und eigener Laune, alles in Echtzeit. Nichts davon ist ein Beispiel – du kannst dich wirklich um sie kümmern.',
  'tut.infra-granja--cuidar.2.titulo': 'Die Vorräte des Jahres',
  'tut.infra-granja--cuidar.2.texto':
    'Füttern nimmt aus dem Korb, und der Korb füllt sich, wenn du den Gemüsegarten nebenan erntest. Pep hat Vorräte für ein Jahr hinterlassen: Nutze sie.',
  'tut.infra-granja--cuidar.3.titulo': 'Füttern',
  'tut.infra-granja--cuidar.3.texto':
    'Ein Tippen auf das Gehege füttert alle, die Hunger haben, den Hungrigsten zuerst. Das Huhn meldet sich alle 4 Stunden; die Kuh hält 12 durch.',
  'tut.infra-granja--cuidar.4.titulo': 'Streicheln',
  'tut.infra-granja--cuidar.4.texto':
    'Sechs Stunden ohne Zuwendung und sie langweilen sich (doppelt so schnell, wenn das Gehege schmutzig ist). Ein Tippen streichelt das ganze Gehege.',
  'tut.infra-granja--cuidar.5.titulo': 'Das schmutzige Gehege',
  'tut.infra-granja--cuidar.5.texto':
    'Das kleine Gehege ist seit acht Tagen nicht gesäubert – man sieht es am Stroh. Tipp es mit Reinigen an und mach es wie neu: In der Demo geht das.',
  'tut.infra-granja--cuidar.6.titulo': 'Der Neuzugang',
  'tut.infra-granja--cuidar.6.texto':
    'Das Schwein kam heute Morgen krank auf dem Gnadenhof an. Ein krankes Tier frisst nicht mehr, und nur Heilen bringt es zurück – es hat eine Woche, bevor es zu spät ist. Heil du es.',
  'tut.infra-granja--cuidar.7.texto':
    'Für den Alltag musst du das hier nicht öffnen: Gehst du an einem Gehege vorbei, erscheint seine Blase mit Füttern und Streicheln – und du kannst mich auch im Chat darum bitten.',
  'tut.infra-granja--corrales.1.titulo': 'Das Gehege',
  'tut.infra-granja--corrales.1.texto':
    'Tipp auf eine freie Zelle und ein Gehege von 1×1 entsteht; tipp auf eine daneben und es wächst mit. Drei Tiere passen pro Zelle: Schau dir die beiden auf dem Gnadenhof an, ein großes zum Weiden und ein kleines für das Geflügel.',
  'tut.infra-granja--corrales.2.titulo': 'Die Arten',
  'tut.infra-granja--corrales.2.texto':
    'Sechs Arten, jede mit ihrem eigenen Hungerfenster. Tipp in ein Gehege mit freier Kapazität und das Tier erscheint – mit Namen.',
  'tut.infra-granja--corrales.3.titulo': 'Spielzeug',
  'tut.infra-granja--corrales.3.texto':
    'Schlammpfütze, Badewanne und Ball, eines pro Zelle: Die Tiere gehen von allein hin, und das Spielen hebt ihre Laune. Auf dem Gnadenhof sind alle drei schon verteilt.',
  'tut.infra-granja--corrales.4.titulo': 'Namen',
  'tut.infra-granja--corrales.4.texto':
    'Mit Benennen tippst du ein Gehege an und siehst seine Liste mit der belegten Kapazität; tipp auf ein Tier, um es umzubenennen.',
  'tut.infra-granja--corrales.5.texto':
    'Das ist das ganze Handwerk: Gehege, Kapazität, Spielzeug und Zuwendung. In der Demo darfst du den Gnadenhof erweitern, wenn du magst.',
  'tut.infra-caminos--carrera.1.texto':
    'Das ist Peps Rennstrecke: ein Asphaltoval mit karierter Ziellinie. Es ist die einzige Ziellinie der Karte – der ganze Rennmodus dreht sich um sie.',
  'tut.infra-caminos--carrera.2.texto':
    'Da ist die Ziellinie. Geh zum Fahrrad oder zum Auto im Hof und steig mit seinem Button auf; sitzt du im Fahrzeug, fahr über diese Linie und die Ampel erscheint.',
  'tut.infra-caminos--carrera.3.texto':
    'Halt dich dicht ans Oval und drifte durch die Kurven, um kein Tempo zu verlieren. Du kannst auch gegen einen Assistenten fahren, mit Items dazwischen: Banane, Turbo und Bombe.',
  'tut.infra-caminos--carrera.4.texto':
    'Neben der Ziellinie stehen die besten Zeiten: Peps Fahrrad hat 38 Siege und eine beste Runde von 41,8 s. Schlag sie – die Rekorde, die du in der Demo aufstellst, bleiben gespeichert.',
  'tut.infra-caminos--carrera.5.texto':
    'Die Zugschiene rund um die Karte und die Achterbahn auf dem Jahrmarkt sind auch Strecken: Stell dich auf das Gleis und „Aufsteigen“ erscheint. Jeder Streckenzug ist sein eigenes Netz.',
  'tut.infra-caminos--trazos.1.texto':
    'Es gibt drei Streckenarten, und von hier oben siehst du alle drei: Rennstrecke (zum Fahren), Zugschiene (der Zug rund um die Karte) und Achterbahn (mit Höhen pro Zelle). Sie mischen sich nie, auch wenn sie sich berühren: Jede sucht nur Nachbarn ihrer eigenen Art.',
  'tut.infra-caminos--trazos.2.texto':
    'Die Achterbahn auf dem Jahrmarkt steigt bis auf sechs Level, und die Rampen zwischen den Zellen ergeben sich von allein. Steig ein: Der Wagen fährt den geschlossenen Rundkurs ab.',
  'tut.infra-caminos--trazos.3.texto':
    'In deinem eigenen Haus zeichnest du sie Zelle für Zelle mit dem Editor von Strecken – oder freihändig mit der Freihandstrecke über ganze Abschnitte. Hier in der Demo ist die Karte schon gezeichnet.',
  'tut.infra-canchas--jugar.1.texto':
    'Das ist Peps Sportanlage: Fußball, Basketball, Tennis und Baseball, einer neben dem anderen. Jeder Platz ist ein Rechteck auf der Karte – gehst du hinein, startet sein Spiel.',
  'tut.infra-canchas--jugar.2.texto':
    'Der Ladebutton erscheint im Feld des Navigationswürfels und schießt dorthin, wohin deine Figur blickt: erst zielen, dann laden.',
  'tut.infra-canchas--jugar.3.texto':
    'Unten das Baseballfeld und der Tennisplatz: Tennis kennt die Wand und den Ballwechsel, Baseball ist reines Schlagen – gegen die Wurfmaschine oder gegen einen Pitcher.',
  'tut.infra-canchas--jugar.5.texto':
    'Oben der Fußball- und der Basketballplatz. Fußball spielst du mit Dribbling und Schuss; Basketball, indem du die Kraft des Wurfs dosierst.',
  'tut.infra-canchas--jugar.4.texto':
    'Der Punktestand wird pro Platz gespeichert: Pep hat ein 21:15 im Basketball hinterlassen und eine Serie von 18 Ballwechseln im Tennis. In der Demo zählen die Spiele – übertriff sie.',
  'tut.infra-paintball--batalla.1.texto':
    'Öffne das Werkzeugrad: Dort wohnt Paintball, in der Kategorie Bauen bei den Spielen, gleich neben den Fahrzeugen.',
  'tut.infra-paintball--batalla.2.texto':
    'Wähl den Modus: 1 gegen 1, 2 gegen 2 oder Jeder gegen jeden. Deine Gegner sind die Assistenten auf der Karte – Laika zählt mit – und gespielt wird im Erdgeschoss.',
  'tut.infra-paintball--batalla.3.texto':
    'Das ganze Haus ist das Spielfeld: Geh hinter den Mauern in Deckung, lehn dich zum Schießen heraus und pass auf deinen Rücken auf. Die Farbspritzer bleiben die ganze Schlacht über an der Wand.',
  'tut.infra-paintball--batalla.4.texto':
    'Peps Bilanz steht bei 47 Siegen zu 23 Niederlagen. In der Demo zählen die Schlachten wirklich: Verbessere sie, bevor du gehst.',
  'tut.app-anecdotario--diario.1.texto':
    'Das ist Peps Tagebuch: ein ganzes Jahr, zwei oder drei Einträge pro Woche. Hier wird der GANZE Bogen erzählt – vom Frust am Anfang bis zum Marathon vor zwei Wochen.',
  'tut.app-anecdotario--diario.2.titulo': 'So schreibst du',
  'tut.app-anecdotario--diario.2.texto':
    'Wähl die Stimmung des Tages, setz einen Titel, wenn du magst, schreib und häng Fotos an. Ein Foto allein reicht: Text muss nicht sein.',
  'tut.app-anecdotario--diario.3.titulo': 'Das Jahr in Farben',
  'tut.app-anecdotario--diario.3.texto':
    'Jeder Tag wird mit seiner Stimmung eingefärbt. Sieh dir das Tief im Monat 7 an (die Verletzung) und wie hell Japan leuchtet. Tipp auf einen Tag, um seine Einträge zu filtern.',
  'tut.app-anecdotario--diario.4.titulo': 'Der Verlauf in Ordnern',
  'tut.app-anecdotario--diario.4.texto':
    'Die Einträge legen sich von selbst in Ordnern nach Jahr, Monat und Woche ab. Öffne die Japan-Wochen und lies die ganze Reise nach.',
  'tut.app-anecdotario--fotos.1.texto':
    'Die Meilensteine in Peps Jahr haben ein Foto: das gebrauchte Keyboard, Laikas Ankunft, zwei Postkarten aus Japan und die Marathon-Medaille.',
  'tut.app-anecdotario--fotos.2.titulo': 'Such sie im Verlauf',
  'tut.app-anecdotario--fotos.2.texto':
    'Öffne Monat 2 (das Keyboard), Monat 9 (Japan) oder vor zwei Wochen (die Medaille). Tipp auf ein beliebiges Foto, und es geht im Vollbild auf.',
  'tut.app-anecdotario--fotos.3.texto':
    'Jeder Eintrag füttert die Serie und weckt deine Figur: Hier zu schreiben heißt auch, das Haus zu pflegen.',
  'tut.app-jardin--practicar.1.titulo': 'Gesammelte Ruhe',
  'tut.app-jardin--practicar.1.texto':
    'Jede geübte Minute gießt diesen Garten. Peps Garten ist ein ganzes Jahr lang gewachsen: vom Samen bis zum stillen Wald.',
  'tut.app-jardin--practicar.2.titulo': 'Mit Klang meditieren',
  'tut.app-jardin--practicar.2.texto':
    'Wähl einen Klang (Wald, Meer, Regen, Klangschalen) und eine Dauer, oder meditiere in Stille mit Glocke. Die Sitzung speichert sich am Ende von selbst.',
  'tut.app-jardin--practicar.3.titulo': 'Ein Jahr voller Sitzungen',
  'tut.app-jardin--practicar.3.texto':
    'Hier ist Peps Jahr: Es fing mit drei Sitzungen pro Woche an, und im Monat 7 – die Verletzung, die Autorechnung – wurde die Übung fast täglich. Sie war es, die das Tief getragen hat.',
  'tut.app-jardin--practicar.4.titulo': 'Atmung',
  'tut.app-jardin--practicar.4.texto':
    'Zwei geführte Muster: die Box-Atmung 4-4-4-4, um dich zu sammeln, und 4-7-8, um den Tag loszulassen. Der Bildschirm atmet mit dir.',
  'tut.app-jardin--gratitud.1.titulo': 'Heute bin ich dankbar für…',
  'tut.app-jardin--gratitud.1.texto':
    'Drei Zeilen am Tag. Eine reicht, drei sind besser. Gespeichert wird ein Eintrag pro Tag, und ändern kannst du ihn jederzeit.',
  'tut.app-jardin--gratitud.2.titulo': 'Peps Einträge',
  'tut.app-jardin--gratitud.2.texto':
    'Neunzig Tage echter Dankbarkeit: das Keyboard, Laika schlafend auf den Notizen, das heilende Knie, die Rückkehr aus Japan. Lies sie in Ruhe.',
  'tut.app-jardin--gratitud.3.texto':
    'Dieser Raum führt keine Serien und bestraft keinen ausgelassenen Tag – mit Absicht. Ruhe ist kein Wettbewerb.',
  'tut.app-hobbies--piano.1.titulo': 'Zwei Hobbys, ein Jahr',
  'tut.app-hobbies--piano.1.texto':
    'Pep hat zwei erfasst: Klavier (das Projekt des Jahres, Wochenziel von 4 Tagen) und Astrofotografie. Jede Karte zeigt die laufende Woche und die Serie.',
  'tut.app-hobbies--piano.2.titulo': 'Klavier im Detail',
  'tut.app-hobbies--piano.2.texto':
    'Serie, beste Serie, Gesamtzeit, aktive Tage und Durchschnitt. Ein Jahr an den Tasten – mit der ehrlichen Pause für Japan.',
  'tut.app-hobbies--piano.3.titulo': 'Die Heatmap',
  'tut.app-hobbies--piano.3.texto':
    'Jedes Kästchen ist ein Tag. Man sieht den Start im Monat 2, wie das Klavier das Tief im Monat 7 GETRAGEN hat und die Lücke der drei Wochen in Japan.',
  'tut.app-hobbies--piano.4.titulo': 'Die Sitzungen',
  'tut.app-hobbies--piano.4.texto':
    'Jede Übung mit ihren Minuten und viele davon mit Notiz: von „mir tun die Hände weh“ bis „Clair de Lune“ ganz durchgespielt.',
  'tut.app-hobbies--piano.5.titulo': 'Projekte',
  'tut.app-hobbies--piano.5.texto':
    'Übung mit Richtung: das erste Stück (im Monat 5 fertig) und „Clair de Lune“, vor einer Woche für die Familie gespielt.',
  'tut.app-hobbies--proyectos.1.titulo': 'Die Klavierprojekte',
  'tut.app-hobbies--proyectos.1.texto':
    'Ein Projekt sammelt die Sitzungen, die du ihm gewidmet hast: Hier siehst du, wie viele es sind und wie viele Minuten in jedem stecken.',
  'tut.app-hobbies--proyectos.2.titulo': 'Fortschritt in Fotos',
  'tut.app-hobbies--proyectos.2.texto':
    '„Clair de Lune“ bewahrt die beschriftete Partitur auf. In der Astrofotografie sammelt das Projekt der zwölf Vollmonde die besten Aufnahmen des Jahres.',
  'tut.app-hobbies--proyectos.3.texto':
    'Sitzungen kannst du auch per Chat eintragen („30 Min Klavier geübt“) und die Ziele des Projekts im Planer planen.',
  'tut.app-hobbies--gestion.1.titulo': 'Ein Hobby anlegen',
  'tut.app-hobbies--gestion.1.texto':
    'Name, Emoji, Farbe und – optional – ein Wochenziel in Tagen. Dieses Formular ist alles, was es braucht, um das Hobby ab jetzt mitzuschreiben.',
  'tut.app-hobbies--gestion.2.titulo': 'Das Wochenziel',
  'tut.app-hobbies--gestion.2.texto':
    'Für Klavier sind 4 Tage pro Woche gesetzt: Die Zeile der Woche färbt sich mit jedem geübten Tag, und oben steht, wie viele du schon hast, gemessen am Ziel.',
  'tut.app-hobbies--gestion.3.titulo': 'Übung eintragen',
  'tut.app-hobbies--gestion.3.texto':
    'Schnelle Minuten mit einem Tipp oder die genaue Zahl; das Projekt ist optional, und die Notiz ist für das, was du von dieser Sitzung behalten willst.',
  'tut.app-hobbies--gestion.4.texto':
    'Die Ziele deiner Hobbys und Projekte leben im Ziele-Raum, jedes mit seinem Plan und seinem Zeitplan. Bitte die KI um einen Plan mit Phasen und Terminen.',
  'tut.app-ideas--diario.1.titulo': 'Das Ideentagebuch',
  'tut.app-ideas--diario.1.texto':
    'Schreib den Einfall hin, fertig. Pep hat hier im Lauf des Jahres rund 90 Ideen abgeladen: aus der Physik, aus dem Café, vom Training. Der Stern markiert die Favoriten.',
  'tut.app-ideas--diario.2.titulo': 'Brainstormings nach Thema',
  'tut.app-ideas--diario.2.texto':
    'Ein Brainstorming fasst alles unter einem Thema zusammen. Such die von Pep: die Namen für die Katze (gewonnen hat Laika), wie Japan zu bezahlen ist und was mit auf die Reise soll.',
  'tut.app-ideas--diario.3.texto':
    'Ist ein Brainstorming reif, macht ein Button eine Mindmap daraus, und du ordnest sie auf der Leinwand weiter.',
  'tut.app-ideas--mapas.1.titulo': 'Zehn Formate',
  'tut.app-ideas--mapas.1.texto':
    'Jedes Format zeichnet anders. Unten liegen die Karten, die Pep im Lauf des Jahres gemacht hat: die Morgenroutine als Flussdiagramm, die Thermodynamik als Baum, Physik und Musik als Venn-Diagramm.',
  'tut.app-ideas--mapas.2.titulo': '„Mein ideales Leben“',
  'tut.app-ideas--mapas.2.texto':
    'Die ERSTE Karte des Jahres, aus Monat 1: das Leben, das Pep wollte. Schau sie dir in Ruhe an – fast alles, was darauf steht, ist am Ende eingetroffen.',
  'tut.app-ideas--mapas.3.texto':
    'Auf der Leinwand: Tipp auf einen Knoten, um ihn auszuwählen, und noch einmal, um zu schreiben; zieh ihn, zoom mit zwei Fingern und füge Ideen über die Leiste unten hinzu.',
  'tut.app-ideas--mapas.4.titulo': 'Eine ganze Karte aus einem Thema',
  'tut.app-ideas--mapas.4.texto':
    'Gib der KI ein Thema, und sie baut die ganze Karte auf, mit fertig geordneten Knoten: der Startpunkt für ein Thema, bei dem du nicht weißt, wo du mit dem Sortieren anfangen sollst.',
  'tut.app-ideas--mapas.5.titulo': 'Einen Knoten mit KI erweitern',
  'tut.app-ideas--mapas.5.texto':
    'Bist du erst in einer Karte, lässt sich jeder Knoten erweitern: Die KI schlägt Unterknoten vor, passend zu dem, was du drumherum schon geschrieben hast, ohne deine Struktur zu zerlegen.',
  'tut.app-ideas--decidir.1.titulo': 'Acht Wege zu entscheiden',
  'tut.app-ideas--decidir.1.texto':
    'Pep hat sie wirklich benutzt: ein Eisenhower in der Klausurenwoche, eine SWOT zur Jahresmitte und eine Matrix für die Wahl der Kamera.',
  'tut.app-ideas--decidir.2.titulo': 'Master oder Job?',
  'tut.app-ideas--decidir.2.texto':
    'DIE offene Entscheidung zum Jahresende: jede Seite mit ihrem Gewicht von 1 bis 5 und der Summe darunter. Entschieden ist sie noch nicht – so sieht es aus, wenn jemand ernsthaft nachdenkt.',
  'tut.app-ideas--decidir.3.texto':
    'In den Formaten mit Feldern gehört jedes Element in eine Zone: Wähl sie unten aus, bevor du etwas hinzufügst, oder zieh das Element in eine andere, und es wechselt von selbst.',
  'tut.app-ideas--decidir.4.titulo': 'Die gewichtete Matrix',
  'tut.app-ideas--decidir.4.texto':
    'Keine Leinwand, eine Tabelle: jede Option gegen jedes Kriterium, mit einem Gewicht von 1 bis 5, je nachdem, wie wichtig dir dieses Kriterium ist. Die Gesamtsumme sortiert die Optionen von selbst.',
  'tut.calendario.1.titulo': 'Die Uhr',
  'tut.calendario.1.texto':
    'Der Kalender ist kein Raum: Er wohnt in der Uhr des Hauses und öffnet sich daher überall, wo du gerade bist.',
  'tut.calendario.2.titulo': 'Eine echte Woche',
  'tut.calendario.2.texto':
    'Schichten im Café, Physikstunden, Laufen im Morgengrauen, Klavier am Abend. Jeder Block ist eine Routine mit ihrer Uhrzeit und ihrer Farbe; zieh sie, um sie zu verschieben, und dehne sie, um ihre Dauer zu ändern.',
  'tut.calendario.3.titulo': 'Vier Arten hinzusehen',
  'tut.calendario.3.texto':
    'Tag und Woche zeigen das Raster nach Stunden; Monat und Jahr geben den Blick aufs ganze Jahr. Der erste Button hat zwei Aufgaben: Er heißt „Heute“ und bringt dich in die Gegenwart – oder „Tag“, wenn du schon auf ein anderes Datum schaust.',
  'tut.calendario.4.titulo': 'Woher jeder Block kommt',
  'tut.calendario.4.texto':
    'Die Apps planen von allein: die Termine aus dem Terminplan, der Schlaf aus Ruhe, die Lernzeiten aus der Bibliothek. Mit dem Filter siehst du nur eine App.',
  'tut.calendario.5.titulo': 'Durchs Jahr wandern',
  'tut.calendario.5.texto':
    'Die Pfeile ‹ › laufen durch den Zeitraum, und Heute bringt dich zurück in die Gegenwart. Peps ganzes Jahr steckt hier drin, Woche für Woche. Mit + Neu legst du einen Termin an, oder du zeichnest ihn direkt aufs Raster.',
  'tut.calendario.6.titulo': 'Gewohnheit für Gewohnheit',
  'tut.calendario.6.texto':
    'Jede Zeile ist eine Routine und jede Spalte ein Tag: Grün heißt erledigt. Hier hakst du direkt ab, und der Prozentsatz oben fasst den Zeitraum zusammen, den du gerade siehst.',
  'tut.calendario.7.titulo': 'Der Bogen des Jahres',
  'tut.calendario.7.texto':
    'In der Ansicht Jahr erzählt die Grafik die ganze Geschichte: Am Anfang hat Pep etwa ein Drittel von dem geschafft, was geplant war, und am Ende über 85 %. Beständigkeit wurde aufgebaut, sie war nicht einfach da.',
  'tut.calendario.8.titulo': 'Die Einbrüche zählen auch',
  'tut.calendario.8.texto':
    'Beide Löcher sind echt: die Knieverletzung in Monat 7 und die drei Wochen in Japan. Aussetzen löscht den Fortschritt nicht – das Panel zeigt das Jahr, wie es war, nicht wie es hätte sein sollen. Und eine Routine zählt erst ab dem Tag, an dem du sie angelegt hast.',
  'tut.metas.0.titulo': 'Das Herz deiner Ziele',
  'tut.metas.0.texto':
    'Dieser Raum speichert nichts Eigenes. Ziele entstehen in den anderen Apps — Laufen im Fitness, das Studium in der Bibliothek, Sparen im Arbeitszimmer — und hier kommen sie ALLE zusammen: der einzige Ort im Haus, an dem man sie auf einmal sieht, aus welchem Raum sie auch stammen.',
  'tut.metas.1.titulo': 'Jedes Ziel mit seiner App',
  'tut.metas.1.texto':
    'Die Ordner sind keine Zierde: jeder ist die App, die diese Ziele trägt, und sie ist es, die weiß, ob sie erfüllt sind, denn dort trägst du ein. «Haus» ist keine App — diese Kategorie hat sich Pep@ für den Küchenumbau ausgedacht.',
  'tut.metas.2.titulo': 'Dasselbe Blatt, von beiden Seiten',
  'tut.metas.2.texto':
    'Ein Ziel anzutippen öffnet sein Blatt und, wenn es einen hat, seinen Plan. Es ist DERSELBE Planer, der aus seiner App aufgeht, mit einem Unterschied: dort ist er auf diese App begrenzt, hier siehst du ihn ganz, mit den Zielen des ganzen Hauses auf einmal.',
  'tut.metas.3.titulo': 'Erfüllt werden sie in ihrer App, nicht hier',
  'tut.metas.3.texto':
    'Was ein Ziel HEUTE verlangt, wird nicht in diesem Raum getan: es taucht in den Missionen der App auf, die es trägt, zwischen dem Rest ihres Tages, und wird dort mit einem echten Eintrag erfüllt. Hier wird geplant; die App führt aus.',
  'tut.metas.4.titulo': 'Und ihre Daten im Kalender',
  'tut.metas.4.texto':
    'Ein Ziel mit Frist landet im Kalender der Uhr wie alles andere Geplante, und die Unterziele seines Plans mit ihm. Du planst an der einen Stelle und das Jahr füllt sich von selbst an der anderen.',
  'tut.metas.5.titulo': 'Darum steht er in der Mitte',
  'tut.metas.5.texto':
    'Jede App trägt ihr eigenes, aber was du dir vorgenommen hast, sieht man nur in diesem Raum beisammen — und von hier geht es hinaus in den Kalender und in die Missionen jeder einzelnen. Das ist seine Aufgabe: der Ort zu sein, an dem sich alles kreuzt.',
  'tut.app-biblioteca--enciclopedia.1.titulo': 'Ein Studienjahr als Baum',
  'tut.app-biblioteca--enciclopedia.1.texto':
    'Pep studiert Physik: Mechanik am Anfang des Jahres, Thermodynamik gegen die Klausur in Monat 6, Relativität und Astrophysik zum Schluss. Jeder Zweig klappt auf und zeigt seine Einträge.',
  'tut.app-biblioteca--enciclopedia.2.titulo': 'Der Baum wächst mit dir',
  'tut.app-biblioteca--enciclopedia.2.texto':
    'Die Themen des Katalogs sind schon da; die, die lose hängen, hat ein Chat eröffnet. Tipp einen Eintrag an, um seine Zusammenfassung, seine Kernpunkte und seine Illustration zu lesen.',
  'tut.app-biblioteca--enciclopedia.3.texto':
    'Einen Eintrag schreibst du von Hand oder destillierst ihn aus einem Chat. Der zum Schwarzen Loch und der zur Physik des Klaviers haben eine Zeichnung: Die App kann sie für dich illustrieren.',
  'tut.app-biblioteca--charlas.1.titulo': 'Die Fragen des Jahres',
  'tut.app-biblioteca--charlas.1.texto':
    'Hier sind die Chats, die Pep beim Lernen geführt hat: Entropie, Zeitdilatation, warum ein Klavier nach Klavier klingt. Jeder einzelne ist erhalten geblieben.',
  'tut.app-biblioteca--charlas.2.titulo': 'Vom Chat in den Baum',
  'tut.app-biblioteca--charlas.3.texto':
    'So füllt sich die Enzyklopädie nicht mit abgeschriebener Theorie, sondern mit dem, was du wirklich gefragt hast.',
  'tut.app-biblioteca--enciclopedia.4.titulo': 'Der Index gehört dir',
  'tut.app-biblioteca--enciclopedia.4.texto':
    'Das + in jeder Zeile schreibt genau dort einen Eintrag, mit Gebiet und Thema schon gesetzt. Und mit dem Stift-Button lässt du den Baum wachsen: Dasselbe + fügt Zweige hinzu, das beim Samen legt neue Gebiete an, und du kannst umbenennen, umsortieren und löschen. Die Zahl mit dem Zweiglein sagt dir, wie viele Unterthemen darunter hängen.',
  'tut.app-biblioteca--estudio.2.titulo': 'Der Lernplan',
  'tut.app-biblioteca--estudio.2.texto':
    'Der Missionen-Button im Kopfbereich holt, was heute ansteht. Die Lernziele leben im Ziele-Raum, gruppiert nach App: „Thermodynamik vor der Prüfung abschließen“ ist bereits erledigt; die Vorbereitung auf den Master läuft noch.',
  'tut.app-biblioteca--estudio.3.texto':
    'Für jedes Ziel kannst du einen Plan anfordern: Die KI fragt nach deinem Zieldatum und deinen freien Stunden und trägt die Lernzeiten in deinen Kalender ein.',
  'tut.app-biblioteca--resumen.1.texto':
    'Wie viele Einträge deine Enzyklopädie hat und wie viele der Gebiete und Themen des Index du schon abdeckst. Themen, die ein Chat eröffnet hat, werden getrennt gezählt.',
  'tut.app-biblioteca--resumen.2.titulo': 'Vier Zahlen',
  'tut.app-biblioteca--resumen.2.texto':
    'Chats mit dem Weisen, Lernminuten insgesamt und in dieser Woche, und deine Serie aus Tagen, an denen du hintereinander gelernt hast.',
  'tut.app-biblioteca--resumen.3.titulo': 'Wo die Schieflage ist',
  'tut.app-biblioteca--resumen.3.texto':
    'Der längste Balken ist das Gebiet, das die meiste Aufmerksamkeit gekostet hat – bei Pep die Thermodynamik in der Klausurwoche.',
  'tut.app-biblioteca--resumen.4.titulo': 'Die Lerntage',
  'tut.app-biblioteca--resumen.4.texto':
    'Ein Kästchen pro Tag: Das Pauken vor der Klausur und die Lücke der drei Wochen in Japan fallen sofort auf, ohne den ganzen Verlauf zu öffnen.',
  'tut.app-biblioteca--resumen.5.titulo': 'Wohin die Stunden gegangen sind',
  'tut.app-biblioteca--resumen.5.texto':
    'Dasselbe wie oben, aber in Minuten: Viele Einträge in einem Gebiet zu haben ist das eine, wirklich Zeit hineingesteckt zu haben das andere.',
  'tut.app-biblioteca--resumen.6.titulo': 'Ein Jahr voller Sitzungen',
  'tut.app-biblioteca--resumen.6.texto':
    'Und wenn du es genau wissen willst: Der Verlauf bewahrt jede Sitzung mit ihren Minuten und ihrem Gebiet auf, abgelegt nach Jahr, Monat und Woche.',
  'tut.app-idiomas--charlas.1.titulo': 'Ein Tutor auf deinem Level',
  'tut.app-idiomas--charlas.1.texto':
    'Dein Tutor ist der Assistent des Raums: Du sprichst mit ihm in der Sprache, die du lernst, und er antwortet auf dem GER-Niveau deines Profils – kurze Sätze mit Übersetzung auf A1, Redewendungen auf C1. Schreibst du ihm in deiner Sprache, ermuntert er dich, es in der zu versuchen, die du lernst.',
  'tut.app-idiomas--charlas.2.titulo': 'Sie speichern und sortieren sich selbst',
  'tut.app-idiomas--charlas.2.texto':
    'Jeder Chat landet in dieser Liste mit seinem Titel, seinem Thema aus dem Lehrplan und seinem Level – gesetzt, ohne dass du etwas tust. Er kann auch aus einem Thema heraus entstehen, über den Chat-Button in seiner Zeile, um genau das zu üben.',
  'tut.app-idiomas--charlas.3.texto':
    'Korrigiert der Tutor, steht die richtige Form in ihrer eigenen Zeile mit einem Häkchen, und das Gespräch geht ohne Tadel weiter. Beim Verlassen bietet er dir an, den aufgetauchten Wortschatz zu extrahieren: Du wählst, welche Karten du behältst, und sie erben das Thema des Chats.',
  'tut.app-idiomas--repaso.1.titulo': 'Was heute dran ist',
  'tut.app-idiomas--repaso.1.texto':
    'Pep ist seit einem Jahr dabei und hat trotzdem noch Wiederholungen offen: Das System fragt nicht den ganzen Wortschatz ab, nur das, was du gerade zu vergessen drohst.',
  'tut.app-idiomas--repaso.3.titulo': 'Ein Jahr Beständigkeit',
  'tut.app-idiomas--repaso.3.texto':
    'Der Verlauf hält fest, wie viele du an jedem Tag wiederholt und wie viele du richtig hattest. Am Anfang lag Pep ziemlich oft daneben und am Ende stimmte fast alles – und in Japan wurde mehr wiederholt als je zuvor.',
  'tut.app-idiomas--vocabulario.2.titulo': 'Zwei Sprachen auf einmal',
  'tut.app-idiomas--vocabulario.2.texto':
    'Oben wechselst du die Sprache: Neben der Hauptsprache hat sich Pep zwischen Monat 4 und der Reise ein Überlebens-Japanisch aufgebaut. Nach der Rückkehr blieb es fast liegen, und an den Boxen sieht man das.',
  'tut.app-idiomas--temario.1.titulo': 'Drei Bereiche, sechs Level',
  'tut.app-idiomas--temario.1.texto':
    'Von A1 bis C2, jedes Level mit seinen Wortschatzthemen, seinen Aussprachepunkten und seiner Grammatik. Du weißt, was dir fehlt, ohne dir woanders einen Kurs zu suchen.',
  'tut.app-idiomas--temario.2.titulo': 'Wo du stehst',
  'tut.app-idiomas--temario.2.texto':
    'Gemeisterte Karteikarten, Wiederholungen des Monats und dein aktuelles Level. Pep ist mit A2 ins Jahr gestartet und liegt heute bei B1.',
  'tut.app-agenda--esencial.1.titulo': 'Dein Terminplan',
  'tut.app-agenda--esencial.1.texto':
    'Der Terminplan verwaltet, was keine Gewohnheit ist: Aufgaben, Termine, Kontakte. Drei Tabs, und alles mit einem Datum trägt sich von selbst in den Hauskalender ein.',
  'tut.app-agenda--esencial.2.titulo': 'Arbeit',
  'tut.app-agenda--esencial.2.texto':
    'Die Liste sammelt die Aufgaben ohne Datum, damit sie nicht verloren gehen, und das Board bewegt deine Aufgaben durch Spalten: zu erledigen, in Arbeit und erledigt.',
  'tut.app-agenda--esencial.3.titulo': 'Gesundheit',
  'tut.app-agenda--esencial.3.texto':
    'Arzttermine, Medikamente und Pflege, in drei Untertabs: Du, Angehörige (die Menschen, um die du dich kümmerst) und Haustiere.',
  'tut.app-agenda--esencial.4.titulo': 'Personen',
  'tut.app-agenda--esencial.4.texto':
    'Dein Kontaktbuch, nach Beziehung geordnet. Geburtstage, die du speicherst, wiederholen sich jedes Jahr von selbst im Kalender.',
  'tut.calendario--esencial.1.titulo': 'Die Hausuhr',
  'tut.calendario--esencial.1.texto':
    'Der Kalender ist kein Raum: Er wohnt in der HUD-Uhr, also öffnet er sich überall, wo du gerade bist, ohne dass du irgendwo hineingehst.',
  'tut.calendario--esencial.2.titulo': 'Alles Geplante, an einem Ort',
  'tut.calendario--esencial.2.texto':
    'Hier landet alles mit Datum und Uhrzeit: was du mit „+ Neu“ anlegst oder direkt aufs Raster zeichnest, und was die anderen Apps von selbst eintragen. Der Filter oben zeigt nur eine App, wenn es zu voll wird.',
  'tut.calendario--esencial.3.titulo': 'Tag',
  'tut.calendario--esencial.3.texto':
    'Das Raster eines 24-Stunden-Tages: Es zeigt, um welche Uhrzeit jede Sache liegt und ob sich etwas überschneidet. Dieser Button hat zwei Aufgaben: Er heißt „Heute“ und bringt dich in die Gegenwart – oder „Tag“, wenn du schon auf ein anderes Datum schaust.',
  'tut.calendario--esencial.4.titulo': 'Woche',
  'tut.calendario--esencial.4.texto':
    'Dasselbe Stundenraster, aber mit allen sieben Tagen nebeneinander. Hier siehst du, wie sich die Woche verteilt, und hier ziehst du Blöcke von einem Tag zum anderen oder dehnst sie, damit sie länger dauern.',
  'tut.calendario--esencial.5.titulo': 'Monat',
  'tut.calendario--esencial.5.texto':
    'Verzichtet auf die Stundenachse und stellt die Tage als Kästchen mit ihrem Inhalt dar. Das ist der Überblick: welche Wochen voll werden und welche Tage frei bleiben.',
  'tut.calendario--esencial.6.titulo': 'Jahr',
  'tut.calendario--esencial.6.texto':
    'Alle zwölf Monate auf einmal. Aus dieser Entfernung lassen sich die Stunden nicht mehr ablesen: Was man sieht, ist die Beständigkeit, wie sehr du das, was du dir vorgenommen hast, das ganze Jahr über durchgehalten hast.',
  'tut.calendario--esencial.7.titulo': 'Und die Missionen, separat',
  'tut.calendario--esencial.7.texto':
    'In Rot, damit es nicht wie eine fünfte Ansicht wirkt: Missionen bündelt auf einem Bildschirm die Tages-Checkliste aller Apps. Ziele und ihre Pläne sind hier nicht dabei — sie leben in ihrem eigenen Raum.',
  'tut.app-anecdotario--esencial.1.titulo': 'Dein persönliches Tagebuch',
  'tut.app-anecdotario--esencial.1.texto':
    'Das Erinnerungsbuch bewahrt, was du erzählen willst, mit Stimmung und Fotos. Es ordnet sich von selbst nach Datum, ohne dass du etwas einsortieren musst.',
  'tut.app-anecdotario--esencial.2.titulo': 'So schreibst du einen Eintrag',
  'tut.app-anecdotario--esencial.2.texto':
    'Wähle die Stimmung des Tages, schreib, was du erzählen willst, und häng Fotos an, wenn du welche hast. Auch nur ein Foto, ohne Text, zählt.',
  'tut.app-anecdotario--esencial.3.titulo': 'Der Stimmungskalender',
  'tut.app-anecdotario--esencial.3.texto':
    'Jeder Tag färbt sich nach der Stimmung seines Eintrags, sodass sich der ganze Monat auf einen Blick lesen lässt. Tippe auf einen Tag, um seine Einträge darunter zu sehen.',
  'tut.app-anecdotario--esencial.4.titulo': 'Der Verlauf',
  'tut.app-anecdotario--esencial.4.texto':
    'Alle Einträge landen hier, von selbst geordnet in Ordnern nach Jahr, Monat und Woche.',
  'tut.app-biblioteca--esencial.1.titulo': 'Deine Bibliothek',
  'tut.app-biblioteca--esencial.1.texto':
    'Die Bibliothek ist deine persönliche Enzyklopädie: Du fragst, was du nicht weißt, bewahrst, was du lernst, und behältst den Überblick über dein Studium. Vier Tabs.',
  'tut.app-biblioteca--esencial.2.titulo': 'Chats',
  'tut.app-biblioteca--esencial.2.texto':
    'Hier fragst du den Weisen zu jedem Thema, und das Gespräch bleibt gespeichert. Jeder Chat ordnet sich selbst seinem Wissensgebiet zu und kommt destilliert als Enzyklopädie-Eintrag heraus.',
  'tut.app-biblioteca--esencial.3.titulo': 'Enzyklopädie',
  'tut.app-biblioteca--esencial.3.texto':
    'Der Baum, in dem das Gelernte lebt, geordnet nach Wissensgebiet. Jeder Eintrag trägt seine Zusammenfassung und seine Kernpunkte, und du kannst sie auch von Hand schreiben; mit dem Stift lässt du den Index nach deinem Maß wachsen.',
  'tut.app-biblioteca--esencial.4.titulo': 'Lernen',
  'tut.app-biblioteca--esencial.4.texto':
    'Der Timer zum Lernen: Du wählst Gebiet und Dauer, am Stück oder in Pomodoros, und jeder Abschnitt wird von selbst erfasst. Er läuft weiter, auch wenn du den Raum verlässt.',
  'tut.app-biblioteca--esencial.5.titulo': 'Übersicht',
  'tut.app-biblioteca--esencial.5.texto':
    'Der Überblick über alles Vorherige: wie viele Einträge deine Enzyklopädie hat und welchen Teil des Index du abgedeckt hast, deine Lernminuten, deine Serie und die Tage, an denen du gelernt hast.',
  'tut.app-cocina--esencial.1.titulo': 'Die Küche',
  'tut.app-cocina--esencial.1.texto':
    'Diese App kümmert sich um zwei Dinge: was du kochen wirst und was du am Ende isst. Jedes hat oben sein eigenes Menü, und jedes Menü öffnet seine eigenen Tabs.',
  'tut.app-cocina--esencial.2.titulo': 'Rezeptbuch',
  'tut.app-cocina--esencial.2.texto':
    'Die Seite des Kochens: Hier leben deine Rezepte, die Diäten, die sie gruppieren, und die Einkaufsliste. Drei Tabs, in dieser Reihenfolge.',
  'tut.app-cocina--esencial.3.titulo': 'Diät',
  'tut.app-cocina--esencial.3.texto':
    'Eine Diät ist ein Ernährungsplan mit ihren Rezepten darin und, wenn du willst, eigenen Kalorien- und Makrozielen. Du speicherst deine eigenen neben denen, die die App schon mitbringt.',
  'tut.app-cocina--esencial.4.titulo': 'Rezepte',
  'tut.app-cocina--esencial.4.texto':
    'Das Rezeptbuch: Jedes Rezept bewahrt Zutaten, Schritte und seine Makros pro Portion und wird in Ordnern sortiert. Von einem Rezept aus kannst du die Mahlzeit erfassen oder seine Zutaten an die Einkaufsliste schicken.',
  'tut.app-cocina--esencial.5.titulo': 'Einkauf',
  'tut.app-cocina--esencial.5.texto':
    'Die Einkaufsliste, mit jedem Artikel im passenden Gang. Du kannst eine Liste erstellen, indem du zusammenträgst, was für mehrere Rezepte fehlt, und abhaken, was schon in der Vorratskammer ist.',
  'tut.app-cocina--esencial.6.titulo': 'Ernährungskontrolle',
  'tut.app-cocina--esencial.6.texto':
    'Das andere Menü führt Buch über das, was du isst, in vier nummerierten Tabs. Der erste ist Ziele: Aus deinem Gewicht, deiner Größe und deiner Aktivität berechnet er deinen Tagesbedarf und verteilt die Makros.',
  'tut.app-cocina--esencial.7.titulo': 'Log',
  'tut.app-cocina--esencial.7.texto':
    'Was schon passiert ist: die Mahlzeiten des Tages mit ihren Kalorien, das Wasser, das du bisher getrunken hast, und dein Gewicht, wenn du dich wiegst. Der Tab daneben, Essensplan, ist das Gegenteil: das Raster dessen, was du in den kommenden Tagen essen willst.',
  'tut.app-cocina--esencial.8.titulo': 'Fortschritt',
  'tut.app-cocina--esencial.8.texto':
    'Die Statistiken von allem Vorherigen im Zeitraum deiner Wahl: Kalorien und Makros, Wasser und deine Gewichtskurve. Unten zeigt ein farbiger Kalender auf einen Blick, an welchen Tagen du im Ziel geblieben bist.',
  'tut.app-computo--esencial.1.titulo': 'Der Rechenraum',
  'tut.app-computo--esencial.1.texto':
    'Hier wird gelöst, was berechnet werden muss, in zwei Tabs: der Rechner, mit seinen Modi und deinem Formelbuch, und die Tabellen für alles, was in Tabellenform gehört.',
  'tut.app-computo--esencial.2.titulo': 'Rechner',
  'tut.app-computo--esencial.2.texto':
    'Ein wissenschaftlicher Rechner, der das Ergebnis zeigt, während du tippst, und jede Berechnung im Verlauf speichert. Die Tastatur unten erspart dir die des Telefons, und die Notationen schreiben das Wissenschaftliche genau dort, wo dein Cursor steht.',
  'tut.app-computo--esencial.3.titulo': 'Die Modi',
  'tut.app-computo--esencial.3.texto':
    'Dieses Menü ändert die gesamte Ansicht des Rechners: Grafik, Zahlensysteme, Matrizen, Gleichungssysteme, Einheitenumrechnung, Trinkgeld und Dreisatz. Der Verlauf bleibt in allen Modi unten stehen.',
  'tut.app-computo--esencial.4.titulo': 'Das Formelbuch',
  'tut.app-computo--esencial.4.texto':
    'Dein Formelbuch, eingeklappt über dem Rechner. Mathematik, Physik und Chemie sind schon eingetragen, in Ordnern, die du verschachteln kannst. Jede Formel öffnet sich, um ihre Variablen auszufüllen, und lässt sich bearbeiten oder löschen.',
  'tut.app-computo--esencial.5.titulo': 'Tabellen',
  'tut.app-computo--esencial.5.texto':
    'Tabellen mit Zellbezügen und Formeln in Klartext (etwa =SUMA), dazu Diagramme über den Bereich, den du markierst. Sie werden als Excel-Datei mit erhaltenen Formeln oder als PDF exportiert.',
  'tut.app-descanso--esencial.1.titulo': 'Schlaf',
  'tut.app-descanso--esencial.1.texto':
    'Diese App behält deinen Schlaf auf einem einzigen Bildschirm im Blick: die Bewertung der letzten Nacht, deinen Zeitplan mit seinen Erinnerungen, das Tagesprotokoll und den vollständigen Verlauf.',
  'tut.app-descanso--esencial.2.titulo': 'Die Bewertung',
  'tut.app-descanso--esencial.2.texto':
    'Jede erfasste Nacht bekommt eine Bewertung, die zusammenfasst, wie lange du geschlafen hast, wann du ins Bett gegangen bist und wie oft du aufgewacht bist. Ohne bisherige Einträge lädt dich dieser Bereich ein, deine erste Nacht einzutragen.',
  'tut.app-descanso--esencial.3.titulo': 'Zeitplan und Erinnerungen',
  'tut.app-descanso--esencial.3.texto':
    'Du stellst deine Schlafenszeit und deine Aufwachzeit ein, indem du die Enden der Tagesleiste ziehst; derselbe Zeitplan erscheint als Block im Hauskalender. Hier schaltest du auch den Wecker mit seinem Ton ein sowie die Erinnerungen, um vor dem Schlafen herunterzufahren.',
  'tut.app-descanso--esencial.4.titulo': 'Die Nacht erfassen',
  'tut.app-descanso--esencial.4.texto':
    'Das Formular, um festzuhalten, wie du geschlafen hast: das Datum, die Uhrzeit, zu der du ins Bett gegangen bist und aufgewacht bist, die Unterbrechungen und eine Qualitätsbewertung, mit Platz für eine Notiz.',
  'tut.app-descanso--esencial.5.titulo': 'Der Verlauf',
  'tut.app-descanso--esencial.5.texto':
    'Alle Nächte, die du erfasst, landen hier, geordnet nach Jahr, Monat und Woche, damit du deinen Schlaf im Lauf der Zeit überprüfen kannst.',
  'tut.app-despacho--esencial.1.titulo': 'Deine Finanzen',
  'tut.app-despacho--esencial.1.texto':
    'Das Arbeitszimmer ordnet dein Geld in vier Tabs: was du hast, was rein- und rausgeht, deine Ziele und die Märkte. Jeder öffnet darunter seine eigenen Bereiche.',
  'tut.app-despacho--esencial.2.titulo': 'Vermögen',
  'tut.app-despacho--esencial.2.texto':
    'Was du besitzt und was du schuldest, in zwei Listen: Aktiva und Passiva. Der dritte Bereich projiziert diese Momentaufnahme in die Zukunft, mit der Rate, die du jeder Zeile gibst.',
  'tut.app-despacho--esencial.3.titulo': 'Cashflow',
  'tut.app-despacho--esencial.3.texto':
    'Das Geld, das rein- und rausgeht, getrennt in Ausgaben, Einnahmen und Saldo. Der Saldo fasst den Zeitraum deiner Wahl zusammen — Tag, Woche, Monat oder Jahr — mit Budget, Kategorien und Trend.',
  'tut.app-despacho--esencial.4.titulo': 'Ziele',
  'tut.app-despacho--esencial.4.texto':
    'Deine Geldziele in drei Bereichen: Sparen und Investieren, Schulden, und Rechner, die anhand deines eigenen Saldos einen Betrag vorschlagen. Jedes Ziel kann in den Zeitplan wandern und ein Datum bekommen.',
  'tut.app-despacho--esencial.5.titulo': 'Märkte',
  'tut.app-despacho--esencial.5.texto':
    'Kurse in Echtzeit für Devisen, Krypto, Aktien und Rohstoffe; braucht eine Verbindung. Es ist ein Kursbrett nur zur Ansicht: Die App empfiehlt weder Kauf noch Verkauf.',
  'tut.app-diario--esencial.1.titulo': 'Die Zeitung von heute',
  'tut.app-diario--esencial.1.texto':
    'Die Tagesnachrichten bringen das Briefing des Tages in zwei Ansichten: Schlagzeilen und An diesem Tag. Sie speichern keine eigenen Daten: Jeder Tag bringt neuen Inhalt, und um Mitternacht wird er komplett ersetzt.',
  'tut.app-diario--esencial.2.titulo': 'Schlagzeilen',
  'tut.app-diario--esencial.2.texto':
    'Die Schlagzeilen des Tages nach Kategorie — Welt, Wirtschaft, Technik, Gesundheit, Sport und Unterhaltung —, filterbar mit den Chips oben. Sie stammen aus echter Presse in deiner Sprache, mit Medien, die jeden Tag wechseln.',
  'tut.app-diario--esencial.3.titulo': 'An diesem Tag',
  'tut.app-diario--esencial.3.texto':
    'Die andere Hälfte der Tagesnachrichten: was an einem Tag wie heute geschah — ein Werk, ein Buch, eine Art, ein Wort. Ein guter Grund, sie zu öffnen, auch wenn die Nachrichten an diesem Tag nicht interessieren.',
  'tut.app-diario--esencial.4.titulo': 'Erneuert sich von selbst',
  'tut.app-diario--esencial.4.texto':
    'Die Ausgabe lädt sich beim Öffnen der App von selbst herunter und wird um Mitternacht komplett ersetzt: Es sammelt sich nichts an. Dieser Button erzwingt eine Aktualisierung vor dieser Uhrzeit.',
  'tut.app-diario--esencial.5.titulo': 'Zustellung',
  'tut.app-diario--esencial.5.texto':
    'Stelle ein, welche Bereiche dir jeder Assistent in seinem eigenen Chat liefert, zu einer festen Uhrzeit oder zu einem Überraschungsmoment des Tages.',
  'tut.app-ejercicio--esencial.1.titulo': 'Dein Training',
  'tut.app-ejercicio--esencial.1.texto':
    'Fitness vereint die drei Trainingsarten für den Körper — Kraft, Ausdauer und Beweglichkeit — plus ein Ziele-Menü, in dem du festlegst, wie viel du jede Woche trainieren willst.',
  'tut.app-ejercicio--esencial.2.titulo': 'Ziele',
  'tut.app-ejercicio--esencial.2.texto':
    'Die Übersicht des Raums: deine Serie, die Tage mit einem Eintrag und ein Balken pro Trainingsart gegen das Wochenziel, das du hier festlegst. Hier wählst du auch das Maßsystem, in Kilo oder in Pfund.',
  'tut.app-ejercicio--esencial.3.titulo': 'Kraft',
  'tut.app-ejercicio--esencial.3.texto':
    'Das Training mit Gewichten: Jede Einheit speichert ihre Übungen mit Sätzen, Wiederholungen und Last. Daraus berechnet die App das Volumen des Tages, zeichnet die Entwicklung jeder Übung und speichert deine Rekorde.',
  'tut.app-ejercicio--esencial.4.titulo': 'Katalog, Routinen und Fortschritt',
  'tut.app-ejercicio--esencial.4.texto':
    'Alle drei Trainingsarten sind gleich aufgebaut. Der Katalog gruppiert die verfügbaren Übungen und stellt Routinen aus ihnen zusammen, Routinen erfasst das Training des oben gewählten Tages, und Fortschritt fasst den Zeitraum mit seiner Heatmap zusammen.',
  'tut.app-ejercicio--esencial.5.titulo': 'Ausdauer',
  'tut.app-ejercicio--esencial.5.texto':
    'Laufen, Rad fahren, Schwimmen oder Gehen, in Abschnitten mit ihren Minuten und ihrer Distanz. Von hier aus öffnet sich das Live-Training, das die Strecke per GPS und den Puls über einen Bluetooth-Sensor erfasst und die Einheit am Ende speichert.',
  'tut.app-ejercicio--esencial.6.titulo': 'Beweglichkeit',
  'tut.app-ejercicio--esencial.6.texto':
    'Dehnen und Mobilität, mit zeitgesteuerten statt gewichtsbasierten Sätzen: Jede Haltung hat ihre Sekunden und ihre Wiederholungen. Der geführte Player läuft die Routine Haltung für Haltung durch, mit einem Timer, der anzeigt, wann gewechselt wird.',
  'tut.app-entretenimiento--esencial.1.titulo': 'Unterhaltung',
  'tut.app-entretenimiento--esencial.1.texto':
    'Speichert die Filme, Serien, Bücher und Videospiele, die du beendest, und bringt einen digitalen Spieltisch mit, um zu spielen, ohne das Haus zu verlassen. Zwei Tabs: Brettspiele und Archiv.',
  'tut.app-entretenimiento--esencial.2.titulo': 'Brettspiele',
  'tut.app-entretenimiento--esencial.2.texto':
    'Der Tisch versammelt digitale Spiele, die direkt am Bildschirm gespielt werden. Ein Filter trennt, was für ein oder zwei Spieler gedacht ist, von dem, was für eine größere Gruppe geeignet ist.',
  'tut.app-entretenimiento--esencial.3.titulo': 'Nach Familien',
  'tut.app-entretenimiento--esencial.3.texto':
    'Der Katalog ist in Familien gruppiert — Brett, Denkspiele, Arcade, Karten & Casino und Für die Gruppe — jede mit ihrer eigenen Farbe. Tippe auf eine Karte, um das Spiel im Vollbild zu öffnen.',
  'tut.app-entretenimiento--esencial.4.titulo': 'Archiv',
  'tut.app-entretenimiento--esencial.4.texto':
    'Das Archiv versammelt, was du siehst, liest und spielst: jeder Titel mit seinem Status, seiner Bewertung und deiner Rezension. Du kannst nach Genre, Kategorie, Autor oder Datum sortieren.',
  'tut.app-garage--esencial.1.titulo': 'Die Garage',
  'tut.app-garage--esencial.1.texto':
    'Die Garage verwaltet deine Fahrzeuge: Fahrräder, Autos, Motorräder und alles, womit du dich fortbewegst. Jedes mit seinem Wartungsverlauf und seinen Behördengängen, und alles mit einem Datum trägt sich von selbst in den Hauskalender ein.',
  'tut.app-garage--esencial.2.titulo': 'Übersicht',
  'tut.app-garage--esencial.2.texto':
    'Der Einstiegstab: Eine Ampel zeigt auf einen Blick, ob etwas fällig ist, ob etwas näher rückt oder ob in der Garage Ruhe herrscht.',
  'tut.app-garage--esencial.3.titulo': 'Auf einen Blick',
  'tut.app-garage--esencial.3.texto':
    'Wie viele Fahrzeuge du hast, wie viele Behördengänge noch aktiv sind und was du dieses Jahr bisher ausgegeben hast.',
  'tut.app-garage--esencial.4.titulo': 'Fahrzeuge',
  'tut.app-garage--esencial.4.texto':
    'Die vollständige Liste, mit Kennzeichen, Kilometerstand und Anzahl der Services auf jeder Karte. Tippst du eines an, öffnet sich seine Akte, mit Wartungsverlauf und Behördengängen.',
  'tut.app-garage--esencial.5.titulo': 'Ein neues Fahrzeug anlegen',
  'tut.app-garage--esencial.5.texto':
    'Name, Typ, Marke, Modell, Baujahr, Kennzeichen und der heutige Kilometerstand. Mit eingetragenem Kennzeichen schaltet die Akte auch die Behördengänge frei, die nur für ein zugelassenes Fahrzeug gelten, wie die Abgasuntersuchung oder die Kfz-Steuer.',
  'tut.app-hobbies--esencial.1.titulo': 'Deine Hobbys',
  'tut.app-hobbies--esencial.1.texto':
    'Hobbys behält im Blick, was du aus Freude tust: Jedes Hobby versammelt seine Sitzungen, seine Serie und, wenn du willst, seine Projekte.',
  'tut.app-hobbies--esencial.2.titulo': 'Deine Hobbys',
  'tut.app-hobbies--esencial.2.texto':
    'Jedes Hobby, das du anlegst, erscheint hier als Karte, mit dem Fortschritt der Woche und der laufenden Serie. Öffnest du eines, siehst du seine Statistiken, seine Heatmap des Jahres, das Sitzungsprotokoll und seine Projekte.',
  'tut.app-hobbies--esencial.3.titulo': 'Ein Hobby anlegen',
  'tut.app-hobbies--esencial.3.texto':
    'Dieser Button öffnet das Formular, um ein neues Hobby hinzuzufügen: Name, Emoji, Farbe und, wenn du willst, ein Wochenziel in Übungstagen.',
  'tut.app-hobbies--esencial.4.titulo': 'Innerhalb jedes Hobbys',
  'tut.app-hobbies--esencial.4.texto':
    'Dort erfasst du Sitzungen mit Minuten und Notiz, siehst deine Heatmap des Jahres und führst Projekte mit ihrem eigenen Fortschritt. Ziele und ihr Zeitplan leben im Raum Ziele.',
  'tut.app-ideas--esencial.1.titulo': 'Ideen',
  'tut.app-ideas--esencial.1.texto':
    'Ideen bewahrt, was dir einfällt, und hilft dabei, es reifen zu lassen: erst wird es notiert, dann in einer Karte geordnet und, falls nötig, zum Entscheiden verglichen. Drei Tabs.',
  'tut.app-ideas--esencial.2.titulo': 'Ideentagebuch',
  'tut.app-ideas--esencial.2.texto':
    'Die Liste, in der jeder Einfall landet, einzeln oder in einem Brainstorming nach Thema gruppiert. Du kannst ihn in Ordnern ablegen, mit einem Stern hervorheben und, sobald er reif ist, in eine Karte verwandeln.',
  'tut.app-ideas--esencial.3.titulo': 'Konzeptkarten',
  'tut.app-ideas--esencial.3.texto':
    'Eine freie Leinwand, um ein Thema in dem Format zu ordnen, das am besten passt: Mindmap, Baum, Flussdiagramm, Zeitstrahl, Kreislauf, Pyramide, Venn-Diagramm und mehr.',
  'tut.app-ideas--esencial.4.titulo': 'Entscheidungsdiagramme',
  'tut.app-ideas--esencial.4.texto':
    'Dieselbe Leinwand, mit Formaten, die zum Entscheiden gedacht sind: gewichtetes Pro und Kontra, SWOT, Eisenhower oder eine gewichtete Matrix, die die Optionen von selbst ordnet.',
  'tut.app-idiomas--esencial.1.titulo': 'Deine Sprachschule',
  'tut.app-idiomas--esencial.1.texto':
    'Hier wählst du eine Sprache, chattest mit einem KI-Tutor, speicherst den Wortschatz, den du lernst, und wiederholst ihn mit einem verteilten System. Vier Tabs: Chats, Lehrplan, Wiederholung und Fortschritt.',
  'tut.app-idiomas--esencial.2.titulo': 'Chats',
  'tut.app-idiomas--esencial.2.texto':
    'Du unterhältst dich mit deinem Tutor in der Sprache, die du lernst: Er antwortet auf deinem Niveau und korrigiert sanft. Jeder Chat bleibt gespeichert und ordnet sich von selbst zu, und beim Verlassen bietet er dir an, den neuen Wortschatz als Karten zu extrahieren.',
  'tut.app-idiomas--esencial.3.titulo': 'Lehrplan',
  'tut.app-idiomas--esencial.3.texto':
    'Ordnet die Sprache in Themen, Aussprache und Grammatik, vom Niveau A1 bis C2. Der Wortschatz lebt innerhalb jedes Themas: Jede Karte wird dort gespeichert, mit ihrer Übersetzung und ihrem Beispiel.',
  'tut.app-idiomas--esencial.4.titulo': 'Wiederholung',
  'tut.app-idiomas--esencial.4.texto':
    'Die verteilte Wiederholung: Jede Karte lebt in einer Box und fragt dich nur die ab, die du bald vergisst, mit Übungen — Multiple Choice, umgekehrt oder Satz vervollständigen — statt sie nur anzusehen.',
  'tut.app-idiomas--esencial.5.titulo': 'Fortschritt',
  'tut.app-idiomas--esencial.5.texto':
    'Die Zusammenfassung deiner Entwicklung: wie viele Karten du beherrschst, wie viel du wiederholt hast und dein aktuelles Niveau, mit dem Verlauf deiner Wiederholungen Tag für Tag.',
  'tut.app-jardin--esencial.1.titulo': 'Dein Ort der Ruhe',
  'tut.app-jardin--esencial.1.texto':
    'Der Garten vereint drei Praktiken: Meditation, geführte Atmung und Dankbarkeit. Er hat absichtlich weder Punkte noch Serien: Hier wird ein ausgelassener Tag nicht bestraft, hier wird nur begleitet, was du übst.',
  'tut.app-jardin--esencial.2.titulo': 'Meditation',
  'tut.app-jardin--esencial.2.texto':
    'Wähle eine Klangspur und eine Dauer, oder meditiere in Stille mit einer Glocke zu Beginn und am Ende. Jede Sitzung bleibt in deinem Verlauf gespeichert.',
  'tut.app-jardin--esencial.3.titulo': 'Atmung',
  'tut.app-jardin--esencial.3.texto':
    'Zwei geführte Atemmuster, eines, um dich zu zentrieren, und eines, um den Tag loszulassen: Der Bildschirm atmet mit dir, während er läuft.',
  'tut.app-jardin--esencial.4.titulo': 'Dankbarkeit',
  'tut.app-jardin--esencial.4.texto':
    'Notiere, wofür du heute dankbar bist, und sei es nur eine Sache, und schau dir frühere Einträge an, wann du willst. Ohne Serien: Einen Tag auszulassen löscht nichts.',
  'tut.app-metas--esencial.1.titulo': 'Der Planer des Hauses',
  'tut.app-metas--esencial.1.texto':
    'Dieser Raum führt keine eigenen Einträge: Er sammelt an einem Ort die Ziele und Pläne, die in den anderen Apps entstehen. Drei Tabs, zu lesen in dieser Reihenfolge: was du dir vorgenommen hast, wie du es aufteilen willst und wann es fällig wird.',
  'tut.app-metas--esencial.2.titulo': 'Ziele',
  'tut.app-metas--esencial.2.texto':
    'Die Liste von allem, was du dir vorgenommen hast, gruppiert nach der App, die jedes Ziel trägt. Ein Ziel kann von einem anderen abhängen, und tippst du es an, öffnet sich seine Tabelle: dort stehen seine Frist, seine Schritte und der Zugang zu seinem eigenen Zeitplan.',
  'tut.app-metas--esencial.3.titulo': 'Pläne',
  'tut.app-metas--esencial.3.texto':
    'Ein Plan ist der Entwurf eines Zeitplans: Er teilt ein Ziel in Phasen mit ihren Terminen auf. Solange er ein Vorschlag ist, lässt er sich beliebig anpassen; überzeugt er, wird er angenommen, und seine Phasen werden zu echten Teilzielen.',
  'tut.app-metas--esencial.4.titulo': 'Zeitplan',
  'tut.app-metas--esencial.4.texto':
    'Die Zeitachse mit allen Zielen auf einmal: Jedes ist ein Balken über den Terminen. Du zoomst nach Tagen, Wochen, Monaten oder Jahren hinein und heraus, und ein Plan kann darübergelegt werden, um ihn mit dem bereits Geplanten zu vergleichen.',
  'tut.app-sala--esencial.1.titulo': 'Dein Reise-Wohnzimmer',
  'tut.app-sala--esencial.1.texto':
    'Hier lebt deine Reisewelt: eine Weltkarte mit Pins, Reisepläne für Orte, die du noch entdecken willst, Routen, die Orte verbinden, und ein Logbuch der Erinnerungen. Vier Tabs.',
  'tut.app-sala--esencial.2.titulo': 'Karte',
  'tut.app-sala--esencial.2.texto':
    'Jeder Ort, den du besucht hast oder besuchen möchtest, ist ein Pin auf der Weltkarte. Der Schalter oben tauscht die Weltkarte gegen einen Globus, den du durch Ziehen drehst.',
  'tut.app-sala--esencial.3.titulo': 'Reiseplan',
  'tut.app-sala--esencial.3.texto':
    'Die Orte, die du kennenlernen möchtest, jeder mit seinem Tag-für-Tag-Plan. Die mit einem Datum tragen sich von selbst in den Kalender ein.',
  'tut.app-sala--esencial.4.titulo': 'Routen',
  'tut.app-sala--esencial.4.texto': 'Eine Route verbindet Orte zu einer Strecke und zeichnet sie auf der Karte.',
  'tut.app-sala--esencial.5.titulo': 'Logbuch',
  'tut.app-sala--esencial.5.texto':
    'Die Erinnerungen an deine besuchten Orte, in Alben nach Land: Fotos und Anekdoten von jedem Ort.',
  'tut.app-agenda--trabajo.1.titulo': 'Der Posteingang',
  'tut.app-agenda--trabajo.1.texto':
    'Was ansteht, aber noch keinen Tag hat, wohnt hier, mit seiner Priorität. Nichts zwingt dich, ein Datum zu setzen, nur um es aufzuschreiben.',
  'tut.app-agenda--trabajo.3.titulo': 'Das Board',
  'tut.app-agenda--trabajo.3.texto':
    'Dieselben Aufgaben, in drei Spalten: offen, in Arbeit und erledigt. Halte eine Karte gedrückt, um sie in eine andere Spalte zu ziehen – lässt du sie auf „Erledigt“ los, wird sie auch im Kalender abgehakt –, oder verschieb sie mit den Pfeilen.',
  'tut.app-agenda--salud.1.titulo': 'Das Jahr des Knies',
  'tut.app-agenda--salud.1.texto':
    'Ernährungsberatung alle paar Monate, Zahnarzt und die sechs Physiotherapie-Sitzungen im 7. Monat: Die Verletzung, die Pep ausgebremst hat, steht hier.',
  'tut.app-agenda--salud.2.titulo': 'Medikamente',
  'tut.app-agenda--salud.2.texto':
    'Jedes Medikament erzeugt für jede Einnahme einen Block im Kalender. Der Entzündungshemmer nach der Verletzung hielt drei Wochen und wurde archiviert; das Vitamin läuft weiter.',
  'tut.app-agenda--salud.3.titulo': 'Laika',
  'tut.app-agenda--salud.3.texto':
    'Die Katze hat ihren eigenen Steckbrief mit Gewicht und Tierarzt, dazu ihre Pflege mit Rhythmus: Impfung jedes Jahr, Entwurmung alle drei Monate, Baden jeden Monat. Hakst du eine ab, rechnet sich der nächste Termin von selbst aus.',
  'tut.app-agenda--salud.4.titulo': 'Was sich wiederholt',
  'tut.app-agenda--salud.4.texto':
    'Der Jahres-Check-up, die Zahnkontrolle, die Blutwerte: Pflege mit eigenem Rhythmus. Hakst du sie ab, springt der nächste Termin von selbst weiter — der Kalender zeigt nie auf etwas, das du schon erledigt hast.',
  'tut.app-agenda--salud.ciclo.titulo': 'Der Zyklus',
  'tut.app-agenda--salud.ciclo.texto':
    'Am Ende von „Du“ wohnt der Zyklus, mit eigenem Schalter: Blutung, Symptome und Stimmung pro Tag, und aus deinen letzten Perioden schätzt er die nächste und die fruchtbaren Tage. Ihn auszuschalten bewahrt alles, was du eingetragen hast.',
  'tut.app-agenda--salud.projimos.titulo': 'Angehörige',
  'tut.app-agenda--salud.projimos.texto':
    'Die Menschen in deiner Obhut: Kontakte aus Personen, markiert mit „In meiner Obhut“, jeder mit seinen Terminen nach Fachrichtung, seiner Pflege und seinen Medikamenten. Pep führt hier die eigene Mutter.',
  'tut.app-agenda--personas.1.titulo': 'Peps Kreis',
  'tut.app-agenda--personas.1.texto':
    'Familie, Freunde, Leute aus der Arbeit und von der Uni, jeder in seinem Ordner. Mit Telefon, Adresse und allem, was du nicht vergessen willst.',
  'tut.app-agenda--personas.2.titulo': 'Geburtstage, die du nicht vergisst',
  'tut.app-agenda--personas.2.texto':
    'Speicherst du ein Geburtsdatum, wiederholt sich der Geburtstag jedes Jahr im Kalender und meldet sich bei dir. Das Alter rechnet die App von selbst aus.',
  'tut.app-agenda--personas.3.texto':
    'Pläne mit Leuten hängen an ihrem Kontakt: So siehst du, wann du jemanden zuletzt gesehen hast.',
  'tut.app-ejercicio--anio.1.titulo': 'Ein Jahr in drei Zahlen',
  'tut.app-ejercicio--anio.1.texto':
    'Die Serie zählt die Tage am Stück mit einem Eintrag, und die Einhaltung vergleicht deine aktiven Tage mit denen, die du dir vorgenommen hast. Pep konnte am Anfang des Jahres keine zwei Straßenblocks joggen.',
  'tut.app-ejercicio--anio.2.titulo': 'Die drei Disziplinen',
  'tut.app-ejercicio--anio.2.texto':
    'Die Balken messen, was du geschafft hast, gegen deine Ziele: Kraft-Einheiten, Laufminuten und Minuten für Beweglichkeit. Das Ziel passt sich dem Zeitraum an, den du oben wählst.',
  'tut.app-ejercicio--anio.3.titulo': 'Die Ziele des Jahres',
  'tut.app-ejercicio--anio.3.texto':
    'Der Ziele-Raum bewahrt ihre vier erreichten Ziele — den 5-km-Lauf, den 10-km-Lauf, den Halbmarathon und den Marathon — sowie das noch offene. Ziele mit Termin erscheinen auch im Hauskalender.',
  'tut.app-ejercicio--carrera.1.titulo': 'Katalog, Routinen und Fortschritt',
  'tut.app-ejercicio--carrera.1.texto':
    'Jede Disziplin ist gleich aufgebaut: der Katalog der Übungen, deine Routinen mit ihrem Verlauf und der Fortschritt. Fangen wir mit dem an, was Pep schon gelaufen ist.',
  'tut.app-ejercicio--carrera.2.titulo': 'Jede Runde wird festgehalten',
  'tut.app-ejercicio--carrera.2.texto':
    'Der Verlauf ist nach Jahr, Monat und Woche gruppiert. Große Läufe speichern zusätzlich die Linie der Strecke und ihre Abschnitte: Da ist der Marathon, mit seinen Zwischenzeiten alle zehn Kilometer.',
  'tut.app-ejercicio--carrera.3.titulo': 'Die Heatmap lügt nicht',
  'tut.app-ejercicio--carrera.3.texto':
    'Auch die Lücken erzählen die Geschichte: Der Monat mit der Knieverletzung ist leer und die drei Wochen in Japan fast. Daneben stehen die Gesamtkilometer, der längste Lauf und das beste Tempo.',
  'tut.app-ejercicio--fuerza.1.titulo': 'Sätze, Wiederholungen und Gewicht',
  'tut.app-ejercicio--fuerza.1.texto':
    'Jede Einheit speichert ihre Übungen mit dem Gewicht, das du gestemmt hast. Die App merkt sich das letzte Mal, damit du nicht danach suchen musst, und zählt das Gesamtvolumen des Tages zusammen.',
  'tut.app-ejercicio--fuerza.2.titulo': 'Die Kurve eines Jahres',
  'tut.app-ejercicio--fuerza.2.texto':
    'Wähl eine Übung und schau ihr beim Steigen zu: Peps Kniebeuge ging von vierzig auf siebzig Kilo. Im Monat der Verletzung wurde nur der Oberkörper trainiert, und diese Kurve hat davon nichts gemerkt.',
  'tut.app-ejercicio--fuerza.3.titulo': 'Deine Rekorde, ungefragt',
  'tut.app-ejercicio--fuerza.3.texto':
    'Von jeder Übung werden das beste Gewicht, die maximalen Wiederholungen und eine Schätzung deines 1RM gespeichert. Übungen mit Körpergewicht, wie Klimmzüge, stehen extra markiert.',
  'tut.app-ejercicio--flexibilidad.1.titulo': 'Dehnung und Mobilität',
  'tut.app-ejercicio--flexibilidad.1.texto':
    'Der Katalog bringt die üblichen Übungen mit —Beinbeuger, Hüfte, Schultern— jede mit ihrer illustrierten Miniatur, beim ersten Bedarf per KI erzeugt.',
  'tut.app-ejercicio--flexibilidad.2.titulo': 'Sätze nach Zeit, nicht nach Gewicht',
  'tut.app-ejercicio--flexibilidad.2.texto':
    'Jede Übung zählt Sekunden und Wiederholungen statt Gewicht. Der geführte Player spielt die Routine Übung für Übung ab, mit einem Timer, der zum Wechseln ruft.',
  'tut.app-ejercicio--flexibilidad.3.titulo': 'Dieselbe Heatmap',
  'tut.app-ejercicio--flexibilidad.3.texto':
    'Minuten und Einheiten des Monats, mit derselben Heatmap wie die anderen beiden Trainingsarten: die Konstanz der Mobilität liest sich so leicht wie die des Laufens.',
  'tut.app-ejercicio--flexibilidad.4.texto':
    'Alle drei Trainingsarten teilen sich das Live-Cardio der Uhr: Läufst oder radelst du mit laufendem Timer, speichert sich das Minutenprotokoll am Ende von selbst.',
  'tut.app-cocina--alimentacion.1.titulo': 'Schritt 1: Wohin du willst',
  'tut.app-cocina--alimentacion.1.texto':
    'Aus deinem Gewicht, deiner Größe und deiner Aktivität rechnet die App aus, wie viel du am Tag brauchst, und verteilt die Makros. Pep hat sich 2.400 Kalorien gesetzt und ein Zielgewicht, bis zu dem weniger als ein Kilo fehlt.',
  'tut.app-cocina--alimentacion.2.titulo': 'Schritt 2: Was du heute gegessen hast',
  'tut.app-cocina--alimentacion.2.texto':
    'Frühstück, Mittagessen, Abendessen und eine Kleinigkeit zwischendurch: Jeder Eintrag füllt die Ringe des Tages. Das Wasser hat sein eigenes Ziel – und genau darauf schaut das Haus, um den Tag als erledigt zu zählen.',
  'tut.app-cocina--alimentacion.3.titulo': 'Schritt 3: 74 Kilo, 67 Kilo',
  'tut.app-cocina--alimentacion.3.texto':
    'Die Kurve des ganzen Jahres, mit ihrem Plateau im Monat der Verletzung und dem Kilo, das in Japan dazukam. Unten steht, in welchem Tempo es vorangeht und wann du ankämst, wenn es so weiterläuft.',
  'tut.app-cocina--alimentacion.4.titulo': 'Ein Jahr in Farben',
  'tut.app-cocina--alimentacion.4.texto':
    'Grün ist ein Tag im Ziel, Bernstein einer, der etwas darüber lag, und Rot einer, der ganz daneben ging. Den Reisemonat siehst du sofort. Tipp auf einen beliebigen Tag, um ihn zu öffnen.',
  'tut.app-cocina--recetario.1.titulo': 'Diäten, keine Zeitschriften-Diäten',
  'tut.app-cocina--recetario.1.texto':
    'Eine Diät ist hier ein Plan mit seinen Rezepten darin. Pep hat zwei eigene gespeichert: die Marathonwoche und die leichte nach Japan, dazu die, die die App mitbringt.',
  'tut.app-cocina--recetario.2.titulo': 'Das Rezeptbuch',
  'tut.app-cocina--recetario.2.texto':
    'Jedes Rezept speichert Zutaten, Schritte und seine Makros pro Portion und liegt in Ordnern. Aus einem Rezept heraus kannst du die Mahlzeit eintragen oder seine Zutaten auf die Einkaufsliste schicken.',
  'tut.app-cocina--recetario.3.titulo': 'Die KI nach dem Rezept fragen',
  'tut.app-cocina--recetario.3.texto':
    'Beschreib, was du kochen willst, und die KI baut das ganze Rezept samt Foto des Gerichts. Das macht die KI: Du schaltest sie in Editor › Einstellungen › Konto ein.',
  'tut.app-cocina--recetario.4.titulo': 'Vom Rezept zur Einkaufsliste',
  'tut.app-cocina--recetario.4.texto':
    '„Liste erstellen“ sammelt, was aus mehreren Rezepten fehlt, in einem einzigen Einkauf: Jede Zutat errät ihre Kategorie (Gemüse, Milchprodukte …) und lässt sich ändern.',
  'tut.app-cocina--recetario.5.titulo': 'Die gespeicherten Listen',
  'tut.app-cocina--recetario.5.texto':
    'Jede Liste hält fest, was noch zu kaufen ist und was schon im Vorrat steht. Trägst du Preise ein, lässt sich die Rechnung an die Ausgaben im Arbeitszimmer schicken.',
  'tut.app-cocina--cronograma.1.titulo': 'Das Gewichtsziel, in Phasen',
  'tut.app-cocina--cronograma.1.texto':
    'Der Missionen-Button im Kopfbereich öffnet die Checkliste des Tages: das Wasser, die Mahlzeiten und die Schritte, die aus deinen Zielen kommen. Die Ziele selbst – mit dem Plan, den die KI ihnen vorschlägt – leben im Ziele-Raum, gruppiert nach der App, die sie führt.',
  'tut.app-cocina--cronograma.2.texto':
    'Das macht die KI: Du schaltest sie in Editor › Einstellungen › Konto ein. Ohne sie legst du die Ziele genauso an und bearbeitest sie, nur eben von Hand.',
  'tut.app-descanso--noche.1.titulo': 'Hundert Punkte, drei Teile',
  'tut.app-descanso--noche.1.texto':
    'Die Dauer zählt fünfzig, die Beständigkeit deiner Schlafenszeit dreißig und die Unterbrechungen zwanzig. An einem Tag viel zu schlafen macht nicht wett, an allen anderen zu unmöglichen Zeiten ins Bett zu gehen.',
  'tut.app-descanso--noche.2.titulo': 'Die letzte Woche',
  'tut.app-descanso--noche.2.texto':
    'Sieben Balken gegen die Linie deines Ziels. Das ist die Ansicht, die dir auf einen Blick sagt, ob du diese Woche so viel schläfst, wie du wolltest.',
  'tut.app-descanso--noche.3.titulo': 'Das ganze Jahr',
  'tut.app-descanso--noche.3.texto':
    'Der Verlauf wird nach Jahr, Monat und Woche abgelegt. Scroll zurück zu Peps ersten Monaten und vergleich sie mit den letzten: Bett nach eins und fünf Stunden Schlaf.',
  'tut.app-descanso--horario.1.titulo': 'Von halb zwölf bis sieben',
  'tut.app-descanso--horario.1.texto':
    'Zieh die Enden des Balkens, um deine Schlafenszeit und dein Aufwachen zu verschieben; der Himmel darüber ändert sich mit. Dieser Block erscheint auch im Kalender – quer über Mitternacht.',
  'tut.app-descanso--horario.2.titulo': 'Wecker und Erinnerungen',
  'tut.app-descanso--horario.2.texto':
    'Du kannst den Weckton wählen, dich erinnern lassen, wenn es Zeit fürs Bett ist, und die Bildschirme eine Stunde vorher weglegen. Die Erinnerungen sind freiwillig: Hier kommen sie ausgeschaltet.',
  'tut.app-descanso--horario.3.titulo': 'Die Nacht eintragen',
  'tut.app-descanso--horario.3.texto':
    'Jeden Morgen trägst du ein, wann du ins Bett gegangen bist, wann du aufgewacht bist, wie oft du wach wurdest und wie es war. Mehr braucht die App für alles andere nicht.',
  'tut.app-despacho--anio.1.titulo': 'Ein Jahr, vier Lupen',
  'tut.app-despacho--anio.1.texto':
    'Wähl Tag, Woche, Monat oder Jahr und blätter mit den Pfeilen. Geh ein paar Monate zurück: Da ist der Monat mit der Autopanne und der Monat des Japan-Flugs, beide in Rot.',
  'tut.app-despacho--anio.2.titulo': 'Die Form des Jahres',
  'tut.app-despacho--anio.2.texto':
    'Sechs Zeiträume zurück, als Balken. Die blauen sind die Monate, in denen etwas übrig blieb; die roten die, die wehtaten. Da siehst du das Loch und den Weg heraus.',
  'tut.app-despacho--anio.3.titulo': 'Wohin fließt es?',
  'tut.app-despacho--anio.3.texto':
    'Die Aufschlüsselung nach Kategorie für den Zeitraum, den du gerade ansiehst. Pep tippt die Kategorien von Hand ein: Die App erkennt die geläufigen und gibt allen anderen eine eigene Farbe.',
  'tut.app-despacho--anio.4.titulo': 'Das Limit des Monats',
  'tut.app-despacho--anio.4.texto':
    'Ein Monatsbudget und ein Balken, der rot wird, sobald du drüber bist. Schaust du nach Woche oder nach Jahr, rechnet die App es von selbst um.',
  'tut.app-despacho--anio.5.titulo': 'Was du heute hast',
  'tut.app-despacho--anio.5.texto':
    'Dein Vermögen kommt direkt aus dem Tab Vermögen: Vermögenswerte minus Verbindlichkeiten. Hier wird der Saldo des Zeitraums dazugerechnet oder abgezogen, damit du siehst, wo du landen würdest.',
  'tut.app-despacho--anio.6.titulo': 'Und in einem Jahr',
  'tut.app-despacho--anio.6.texto':
    'Sie rechnet zwölf Monate voraus: die fixen Posten zu ihrem Fälligkeitstermin, das Variable mit deinem Durchschnitt – in zwei Szenarien, mit Vermögen und ohne.',
  'tut.app-despacho--captura.1.titulo': 'Peps fixe Kosten',
  'tut.app-despacho--captura.1.texto':
    'Miete, Internet, Handy, Streaming und die Autoversicherung: fünf Einträge aus Monat 2, als der Entschluss fiel, Ordnung zu schaffen. Jeder zählt sich seitdem von selbst.',
  'tut.app-despacho--captura.2.titulo': 'So trägst du eine ein',
  'tut.app-despacho--captura.2.texto':
    'Das Formular geht Schritt für Schritt: Betrag, variabel oder fix, Kategorie (du tippst deine eigene, die geläufigen schlägt es dir vor), wie oft sie sich wiederholt und die Notiz.',
  'tut.app-despacho--captura.3.titulo': 'Ein Jahr voller Einträge',
  'tut.app-despacho--captura.3.texto':
    'Hunderte Ausgaben, abgelegt in Ordnern nach Jahr und Monat. Such Monat 7: Da steht die Panne, die auf einen Schlag fast zehntausend Pesos verschlungen hat.',
  'tut.app-despacho--captura.4.titulo': 'Woher das Geld kommt',
  'tut.app-despacho--captura.4.texto':
    'Zwei Halbmonatslöhne aus dem Café, die Physiknachhilfe, die mit dem Entschluss zur Reise dazukam, und das Trinkgeld jede Woche, das nie gleich ausfällt.',
  'tut.app-despacho--captura.5.texto':
    'In deinem eigenen Haus kannst du auch per Chat erfassen: „habe 250 im Supermarkt ausgegeben“ – und es ist notiert.',
  'tut.app-despacho--metas.1.titulo': 'Das Ziel, das erreicht wurde',
  'tut.app-despacho--metas.1.texto':
    'Die Japanreise, bei 100 %: elf Monate Sparen, die Nachhilfestunden, das Weihnachtsgeld und das Geburtstagsgeld. Darunter der Notgroschen, der nach der Rückkehr anfing, und eine kleine Anlage.',
  'tut.app-despacho--metas.2.titulo': 'Das Ziel in der Zeit',
  'tut.app-despacho--metas.2.texto':
    'Diese Ziele werden im Ziele-Raum auf der Zeitachse bewahrt: gibst du einem einen Termin, erscheint es zwischen deinen Kalendertagen. Mit ✨ schlägt die KI den Sparplan vor.',
  'tut.app-despacho--metas.3.titulo': 'Was Pep schuldete',
  'tut.app-despacho--metas.3.texto':
    'Die Autopanne ging auf die Kreditkarte und war erst nach Monaten abbezahlt. Schulden stehen getrennt, weil man sie andersherum liest: Hier heißt runter gewinnen.',
  'tut.app-despacho--metas.4.titulo': 'Märkte',
  'tut.app-despacho--metas.4.texto':
    'Pep behält den Yen im Auge, seit die Reise beschlossen war, und jetzt den Won, wegen der nächsten. Devisen, Krypto, Aktien und Rohstoffe in Echtzeit (braucht Internet).',
  'tut.app-despacho--patrimonio.1.titulo': 'Was es heute wert ist',
  'tut.app-despacho--patrimonio.1.texto':
    'Aktiva minus Passiva. Trägt eine Zeile einen Zinssatz, ist diese Zahl der Wert von HEUTE, nicht der vom Tag des Eintrags — und darunter siehst du die Aufschlüsselung oder kehrst zu deinem Eintrag zurück.',
  'tut.app-despacho--patrimonio.2.titulo': 'Woher es kommt',
  'tut.app-despacho--patrimonio.2.texto':
    'Die letzten zwei Jahre dieser Gruppe. Öffne eine beliebige Zeile und du siehst, wovon sie abhängt: wie viel sie wert ist, seit wann, und wie stark sie pro Jahr steigt oder fällt. Was du schreibst, wird nie von allein umgeschrieben.',
  'tut.app-despacho--patrimonio.3.titulo': 'Und wohin es geht',
  'tut.app-despacho--patrimonio.3.texto':
    'Der dritte Tab führt dieselbe Linie nach vorn: durchgezogen, was passiert ist, gepunktet, was deine Zinssätze ergäben.',
  'tut.app-despacho--patrimonio.4.titulo': 'Drei Linien',
  'tut.app-despacho--patrimonio.4.texto':
    'Was du hast in Grün, was du schuldest in Rot, das Netto in Blau. Der senkrechte Strich ist heute: links davon steht, was wirklich passiert ist.',
  'tut.app-despacho--patrimonio.5.titulo': 'Beweg alles',
  'tut.app-despacho--patrimonio.5.texto':
    'Wie viele Monate, wie viel Inflation du annimmst, und ob dein monatliches Sparen mit eigenem Steigerungstempo dazukommt. Nichts davon rührt deine Daten an: Probier ohne Sorge.',
  'tut.app-despacho--calculadoras.1.texto':
    'Vier Regeln der persönlichen Finanzen, jede in ihrem Tab: Notfallfonds, Finanzielle Freiheit, 50/30/20 und die Anzahlung fürs Auto (20/4/10).',
  'tut.app-despacho--calculadoras.2.titulo': 'Startet mit deinem Saldo',
  'tut.app-despacho--calculadoras.2.texto':
    'Die Felder sind schon mit deinen echten Einnahmen oder Ausgaben des Monats gefüllt – tipp sie an, um eine andere Zahl durchzuspielen, ohne die echte aus den Augen zu verlieren.',
  'tut.app-despacho--calculadoras.3.titulo': 'Von der Rechnung zum Ziel',
  'tut.app-despacho--calculadoras.3.texto':
    'Ein Tipp, und das Ergebnis wird zu einem echten Sparziel, bereit für den Zeitplan und ein Datum. (In der Demo besser nicht drücken: Es würde ein echtes Ziel anlegen.)',
  'tut.app-garage--vehiculos.1.titulo': 'Ist etwas dringend?',
  'tut.app-garage--vehiculos.1.texto':
    'Eine einzige Ampel, damit du nicht zwei Listen lesen musst: Rot, wenn etwas überfällig ist, Gelb, wenn es demnächst ansteht, Grün, wenn in der Garage Ruhe herrscht.',
  'tut.app-garage--vehiculos.2.titulo': 'Was du bisher ausgegeben hast',
  'tut.app-garage--vehiculos.2.texto':
    'Wie viele Fahrzeuge, wie viele offene Behördengänge und was in diesem Jahr zusammengekommen ist. Pep kam das Auto teuer zu stehen.',
  'tut.app-garage--vehiculos.2b.titulo': 'Ein neues anmelden',
  'tut.app-garage--vehiculos.2b.texto':
    'Name, Typ, Marke, Modell, Baujahr, Kennzeichen und der heutige Kilometerstand. Mit hinterlegtem Kennzeichen weiß die Garage später, welche Behördengänge sie dir anbieten soll.',
  'tut.app-garage--vehiculos.3.titulo': 'Das Rad für jeden Tag',
  'tut.app-garage--vehiculos.3.texto':
    'Peps echtes Verkehrsmittel: Kette, Schläuche, Bremsen, jedes in seiner eigenen Zeile – dasselbe Archiv mit Ordnern nach Jahr und Monat wie in den anderen Apps. Schau, wie sich die Wartungen in den letzten Monaten häufen: Das Marathontraining fordert seinen Preis.',
  'tut.app-garage--vehiculos.4.titulo': 'Und das geerbte Auto',
  'tut.app-garage--vehiculos.4.texto':
    'Hier ist die Panne aus Monat 7: liegen geblieben, Abschleppdienst und fast zehntausend Pesos, die nicht da waren. Jede Wartung merkt sich ihre Kosten, den Kilometerstand und die Werkstatt.',
  'tut.app-garage--vehiculos.5.titulo': 'Die Akte',
  'tut.app-garage--vehiculos.5.texto':
    'Marke, Modell, Baujahr, Kennzeichen und der aktuelle Kilometerstand. Mit hinterlegtem Kennzeichen schaltet die Garage die Behördengänge frei, die es nur beim Auto gibt.',
  'tut.app-garage--tramites.tabs.titulo': 'Drei Hefte',
  'tut.app-garage--tramites.tabs.texto':
    'Die Akte jedes Fahrzeugs verteilt ihre Papiere auf drei Hefte: Behördengänge, Dokumente und Kontakte. Die Servicehistorie bleibt immer darunter, egal welches Heft du gerade ansiehst.',
  'tut.app-garage--tramites.1.titulo': 'Was ansteht',
  'tut.app-garage--tramites.1.texto':
    'Jeder Behördengang merkt sich seinen nächsten Termin, in wie vielen Monaten er sich wiederholt und was er kostet. Hakst du ihn ab, springt das Datum von selbst zum nächsten.',
  'tut.app-garage--tramites.2.titulo': 'Das Rad zahlt keine Kfz-Steuer',
  'tut.app-garage--tramites.2.texto':
    'Ohne Kennzeichen blendet die Garage aus, was nicht passt: Dem Rad bietet sie nur seine regelmäßige Wartung an.',
  'tut.app-garage--tramites.2b.titulo': 'Die Papiere, getrennt',
  'tut.app-garage--tramites.2b.texto':
    'Fahrzeugschein, Versicherungspolice und Kfz-Steuer vermischen sich nicht mit dem, was in der Werkstatt passiert: Sie haben ihr eigenes Heft, mit Aktenzeichen, Fälligkeit und Vorwarnung.',
  'tut.app-garage--tramites.3.titulo': 'Das Kontaktbuch',
  'tut.app-garage--tramites.3.texto':
    'Die Vertrauenswerkstatt, die Versicherung, die Prüfstelle, der Fahrradladen um die Ecke und der Abschleppdienst von jener Nacht – mit Telefonnummer und Adresse, einen Tipp entfernt.',
  'tut.app-garage--tramites.4.texto':
    'All diese Behördengänge stehen auch im Kalender des Hauses, mit ihrer Vorwarnung. Und Achtung: Die Fahrzeuge, die du über die Karte fährst, sind etwas anderes – die wohnen im Inventar.',
  'tut.app-sala--mapa.1.titulo': 'Wo du schon warst',
  'tut.app-sala--mapa.1.texto':
    'Vier Länder und ein paar Städte – fast alle aus ein und derselben Reise. Tipp auf eine der drei Zahlen, und die Liste erscheint unter der Karte.',
  'tut.app-sala--mapa.2.titulo': 'Die Nadeln',
  'tut.app-sala--mapa.2.texto':
    'Die sieben Nadeln dicht beieinander in Japan sind die drei Wochen der Reise. Die gelben – Seoul, Patagonien, Island – sind das, was noch aussteht. Ein Tipp auf die Karte setzt eine neue Nadel, wo du willst.',
  'tut.app-sala--mapa.3.titulo': 'Der Globus',
  'tut.app-sala--mapa.3.texto':
    'Der Umschalter oben tauscht die Weltkarte gegen einen Globus, den du durch Ziehen drehst, mit denselben antippbaren Nadeln. Der Globus schaut nur: Neue Nadeln setzt du in der flachen Ansicht.',
  'tut.app-sala--japon.1.titulo': 'Die Alben',
  'tut.app-sala--japon.1.texto':
    'Ein Ordner pro Land, mit seinem Titelfoto. Darin eine Karte pro Ort und in jeder das, was Pep an dem Tag geschrieben hat.',
  'tut.app-sala--japon.2.titulo': 'Was Pep dort schrieb',
  'tut.app-sala--japon.2.texto':
    'Acht Einträge von der Reise, jeder mit seinem Foto: der Fuji im Morgengrauen, der Bambus von Arashiyama, die Hirsche von Nara. Geschrieben im Moment selbst, den Geruch noch in der Nase.',
  'tut.app-sala--japon.3.texto':
    'In jedem Ort öffnet die Schaltfläche „Reiseplan“ das Reiseblatt: Tag für Tag, von wo nach wo, wo Pep geschlafen hat, wie es weiterging und was es gekostet hat.',
  'tut.app-sala--proximo.1.titulo': 'Was noch aussteht',
  'tut.app-sala--proximo.1.texto':
    'Drei notierte Träume. Seoul hat schon Datum und Plan; Patagonien und Island sind noch eine Idee. Was ein Datum hat, taucht in deinem Kalender auf.',
  'tut.app-sala--proximo.2.titulo': 'Vom Reiseblatt zum Ziel',
  'tut.app-sala--proximo.2.texto':
    'Die acht Tage in Korea ergeben zusammen, was die Reise kosten würde, und diese Summe wird im Arbeitszimmer als Sparziel gespeichert: Sie dort wachsen zu sehen heißt, sie hier näher kommen zu sehen.',
  'tut.app-sala--proximo.3.titulo': 'Routen',
  'tut.app-sala--proximo.3.texto':
    'Eine Route reiht Orte der Reihe nach auf und zeichnet sie auf die Karte. Die japanische ist der Weg, der schon zurückgelegt wurde; die koreanische der, der noch kommen soll.',
  'tut.app-entretenimiento--archivo.1.titulo': 'Dreißig Werke, ein Jahr',
  'tut.app-entretenimiento--archivo.1.texto':
    'Filme, Serien, Bücher und Videospiele, sortiert danach, wann sie fertig wurden. In Monat 7 gibt es einen Marathon (mit dem lädierten Knie blieb reichlich Sofa) und eine Lücke von drei Wochen: Japan.',
  'tut.app-entretenimiento--archivo.2.titulo': 'Der Eintrag',
  'tut.app-entretenimiento--archivo.2.texto':
    'Titel, Autor oder Regie, Genre, Status und Sterne. Die Rezension ist, was Pep davon hielt, keine Inhaltsangabe: In einem Jahr hilft nur genau das weiter.',
  'tut.app-entretenimiento--archivo.3.titulo': 'Vier Wege, es zu ordnen',
  'tut.app-entretenimiento--archivo.3.texto':
    'Nach Genre, nach Kategorie (Film, Serie, Buch, Videospiel), nach Autor oder nach Datum. In der Ansicht nach Genre lassen sich die Ordner ziehen: Setz nach oben, was du am meisten schaust.',
  'tut.app-entretenimiento--juegos.1.texto':
    '1–2 Spieler oder 3+: Der Filter blendet aus, was für die Runde vor dir nicht taugt. Spiele mit „2+“ passen in beide Abschnitte.',
  'tut.app-entretenimiento--juegos.2.titulo': 'Nach Familie',
  'tut.app-entretenimiento--juegos.2.texto':
    'Brett, Denkspiele, Arcade, Karten & Casino, Für die Gruppe: jede Familie mit ihrer eigenen Farbe. Schach, Dame, Domino, Blackjack, Tetris, Minesweeper und über ein Dutzend mehr.',
  'tut.app-entretenimiento--juegos.3.titulo': 'Ein Tipp und los geht\'s',
  'tut.app-entretenimiento--juegos.3.texto':
    'Jede Karte öffnet das Spiel im Vollbild; wo es vorgesehen ist, gibt es oben eine eigene Auswahl für die Schwierigkeit. Zurück landest du genau hier wieder, ohne deinen Platz zu verlieren.',
  'tut.app-diario--habito.1.titulo': 'Die Schlagzeilen von heute',
  'tut.app-diario--habito.1.texto':
    'Welt, Wirtschaft, Technik, Gesundheit, Sport und Unterhaltung, aus echten Quellen. Die Chips oben filtern nach Rubrik.',
  'tut.app-diario--habito.2.titulo': 'Sie erneuert sich von selbst',
  'tut.app-diario--habito.2.texto':
    'Die Ausgabe des Tages lädt sich von selbst herunter und wird um Mitternacht komplett ausgetauscht: Hier stapelt sich nichts, wie bei einer echten Zeitung.',
  'tut.app-diario--habito.3.titulo': 'Ein Tag in der Geschichte',
  'tut.app-diario--habito.3.texto':
    'Die andere Hälfte: was an einem Tag wie heute geschah, ein Kunstwerk, ein Buch, eine Art, ein Wort. Ein guter Vorwand, sie zu öffnen, auch wenn dir nicht nach Nachrichten ist.',
  'tut.app-diario--habito.4.texto':
    'Pep hat sie dieses Jahr an rund zweihundert Tagen gelesen: viel am Anfang, fast nie im schlechten Monat und jeden einzelnen Tag der letzten drei Wochen. Davon lebt die Serie.',
  'tut.app-diario--reparto.1.titulo': 'Die Zustellung',
  'tut.app-diario--reparto.1.texto':
    'Hier legst du fest, wer dir was bringt. Es ist nicht noch eine Benachrichtigung: Es kommt als Nachricht des Assistenten, in seiner Stimme.',
  'tut.app-diario--reparto.2.titulo': 'Zwei Zusteller',
  'tut.app-diario--reparto.2.texto':
    'Der Zauberer bringt Welt, Technik und Wirtschaft um 7:30 Uhr. Laika liefert das Leichte, wann immer ihr danach ist. Jeder Assistent wählt seine Rubriken und seinen Modus.',
}
