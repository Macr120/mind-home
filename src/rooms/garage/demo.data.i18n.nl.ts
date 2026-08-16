/**
 * Rama «nl» del año demo de garage. Solo se descarga si el usuario
 * está en ese idioma (el índice `demo.data.i18n.ts` la carga con import()).
 *
 * Las frases se traducen en `traducciones/garage.nl.json`; este
 * archivo lo montan `partir-demo-i18n.mjs` / `traducir-a-mano.mjs meter` —
 * no lo edites a mano.
 */
export default {
  "vehiculos": {
    "biciNombre": "La Grulla",
    "biciNota": "Tweedehands stalen fiets, grijs en een beetje lawaaierig, waarmee ik elke dag naar diensten, het lab en trainingen ga. In een heel jaar heeft hij me nog geen enkele keer in de steek gelaten.",
    "autoNombre": "El Mastodonte",
    "autoNota": "Sedan geërfd van mijn oom, ouder dan ikzelf, met een dashboard dat door de zon is verbleekt. Ik start hem hooguit één keer per twee weken en hij laat me elke verwaarlozing met rente terugbetalen."
  },
  "servicios": [
    {
      "dia": -350,
      "vehiculo": "bici",
      "tipo": "revision",
      "titulo": "Gered uit de kelder",
      "nota": "Ik haalde hem uit de kelder met lekke banden en een verroeste ketting; een halve middag met doek, lucht en olie om hem weer te laten rijden."
    },
    {
      "dia": -336,
      "vehiculo": "auto",
      "tipo": "aceite",
      "titulo": "Olie veel te lang uitgesteld",
      "nota": "Ze kwam er zwart als koude koffie uit en de monteur trok alleen zijn wenkbrauwen op, zijn manier om me de les te lezen."
    },
    {
      "dia": -318,
      "vehiculo": "bici",
      "tipo": "llantas",
      "titulo": "Nieuwe binnenband en een plak",
      "nota": "Lekke band op Doctor Vértiz onderweg naar het café; ik leerde op de stoep een binnenband te vervangen, laat maar toch geleerd."
    },
    {
      "dia": -300,
      "vehiculo": "auto",
      "tipo": "bateria",
      "titulo": "Nieuwe accu",
      "nota": "De accu ging vanzelf leeg door hem zo weinig te gebruiken; ik vroeg een buurman om me te helpen starten en reed meteen door om een nieuwe accu te kopen."
    },
    {
      "dia": -284,
      "vehiculo": "bici",
      "tipo": "cadena",
      "titulo": "Eindelijk een schone ketting",
      "nota": "Ontvette en smeerde de ketting rustig op een zondag: hij klinkt niet meer als een oud scharnier en trapt zelfs lichter."
    },
    {
      "dia": -252,
      "vehiculo": "auto",
      "tipo": "frenos",
      "titulo": "Voorremblokken",
      "nota": "Ze piepten bij elk stoplicht en ik kon het niet langer negeren; het kostte me mijn hele loon van die twee weken, maar ik sliep er rustig door."
    },
    {
      "dia": -236,
      "vehiculo": "bici",
      "tipo": "frenos",
      "titulo": "Nieuwe remblokjes",
      "nota": "Door de regen remde ik steeds twee meter later dan de bedoeling was, dus verving ik de remblokjes en stelde de kabels af."
    },
    {
      "dia": -190,
      "vehiculo": "bici",
      "tipo": "llantas",
      "titulo": "Lekke band onderweg naar het lab",
      "nota": "Een stuk glas op Eje 8 en ik kwam de fiets duwend twintig minuten te laat op het lab aan."
    },
    {
      "dia": -178,
      "vehiculo": "auto",
      "tipo": "otro",
      "titulo": "Gestrand op Calzada de Tlalpan",
      "nota": "De auto viel midden op straat stil op een dinsdagavond en ik zat anderhalf uur op de stoep te wachten op de sleepwagen, rekenend met geld dat er niet was; toen kwam de hele maand in één keer op me af."
    },
    {
      "dia": -150,
      "vehiculo": "bici",
      "tipo": "revision",
      "titulo": "Volledige onderhoudsbeurt",
      "nota": "Met de knie in fysiotherapie kon ik niet hardlopen, dus stak ik de tijd in de fiets: wielen gecentreerd, kabels en alles aangedraaid."
    },
    {
      "dia": -140,
      "vehiculo": "auto",
      "tipo": "filtros",
      "titulo": "Filters na de schrik",
      "nota": "Ik verving het lucht- en benzinefilter uit pure paranoia; ik betaal dit liever dan nog eens op een sleepwagen te wachten."
    },
    {
      "dia": -88,
      "vehiculo": "bici",
      "tipo": "cadena",
      "titulo": "Uitgerekte ketting vervangen",
      "nota": "Met het halvemarathonplan gebruik ik hem elke dag en de ketting sloeg al door bij het wegtrappen."
    },
    {
      "dia": -64,
      "vehiculo": "bici",
      "tipo": "transmision",
      "titulo": "Nieuwe cassette en kabels",
      "nota": "De versnellingen sloegen over bij het klimmen; met een nieuwe cassette kan ik eindelijk op het kleine tandwiel vertrouwen."
    },
    {
      "dia": -46,
      "vehiculo": "auto",
      "tipo": "aceite",
      "titulo": "Olie en algehele controle",
      "nota": "Gewone beurt zonder verrassingen, wat met deze auto al goed nieuws is."
    },
    {
      "dia": -27,
      "vehiculo": "bici",
      "tipo": "frenos",
      "titulo": "Remmen voor de marathon",
      "nota": "Snelle afstelling, want in die weken was de fiets mijn enige vervoer en ik wilde geen enkel excuus."
    },
    {
      "dia": -8,
      "vehiculo": "auto",
      "tipo": "lavado",
      "titulo": "Wasbeurt voor familiebezoek",
      "nota": "Ik waste en stofzuigde hem om mijn familie van het busstation op te halen: het lost mechanisch niets op, maar het voelt anders."
    }
  ],
  "talleres": [
    {
      "clave": "taller",
      "nombre": "Taller Mecánico Rivas",
      "direccion": "Av. Cuauhtémoc 812, Col. Narvarte, Benito Juárez",
      "notas": "Don Rivas legt me altijd uit wat echt dringend is en wat kan wachten, en heeft nooit een rekening opgeblazen; hij is de enige die ik met deze auto vertrouw."
    },
    {
      "clave": "aseguradora",
      "nombre": "Seguros Meridiano - verzekeringsagent Nadia Ortega",
      "direccion": "Av. Insurgentes Sur 1234, 3e verdieping, Col. Del Valle",
      "notas": "Nadia reageert op WhatsApp, ook op zondag, en ze regelde maandelijkse betalingen toen ik overstapte naar volledige dekking."
    },
    {
      "clave": "verificentro",
      "nombre": "Verificentro 09-118 Iztaccíhuatl",
      "direccion": "Calz. Iztaccíhuatl 240, Col. Iztaccíhuatl, Benito Juárez",
      "notas": "Afspraak om zeven uur 's ochtends en binnen veertig minuten ben ik klaar; die van Coyoacán kostte me een halve ochtend in de rij."
    },
    {
      "clave": "ciclos",
      "nombre": "Ciclos Malinche",
      "direccion": "Zacatecas 145, Col. Roma Sur, Cuauhtémoc",
      "notas": "Daar heb ik de fiets gekocht en daar stel ik hem ook af; ze lenen me gereedschap en leren het me zelf te doen in plaats van voor alles te laten betalen."
    },
    {
      "clave": "grua",
      "nombre": "Grúas Tepeyac 24 horas",
      "direccion": "Vestiging: Eje Central Lázaro Cárdenas 1105, Col. Álamos",
      "notas": "Dat is het nummer dat ik belde op de avond dat ik gestrand raakte; ze kwamen binnen anderhalf uur en probeerden me niet op te lichten met de prijs."
    }
  ],
  "tramites": [
    {
      "clave": "verificacion",
      "titulo": "Halfjaarlijkse emissiekeuring",
      "nota": "Het hangt af van mijn vignet en ik maak altijd in de eerste week een afspraak: als ik het mis, doet de boete meer pijn dan de keuring zelf."
    },
    {
      "clave": "seguro",
      "titulo": "Verlenging van de polis",
      "nota": "Dit jaar stapte ik na de schrik van de pech over op volledige dekking bij Nadia; ik betaal in maandelijkse termijnen en zet het in het budget van elke twee weken."
    },
    {
      "clave": "tenencia",
      "titulo": "Jaarlijkse wegenbelasting en registratie",
      "nota": "Ik betaal het in de eerste maanden van het jaar om de korting te krijgen en het van mijn to-dolijst af te hebben."
    },
    {
      "clave": "circulacion",
      "titulo": "Eigenaarswissel en kentekenbewijs",
      "nota": "Het kentekenbewijs staat nog op naam van mijn oom en het wordt tijd om dat recht te zetten voordat het me bij een controle in de problemen brengt."
    },
    {
      "clave": "afinacionBici",
      "titulo": "Afstelbeurt voor de fiets",
      "nota": "Elke zes maanden bij Ciclos Malinche: wielen gecentreerd, kabels en remmen nagekeken, wat veel goedkoper is dan een verbogen wiel te repareren."
    }
  ]
}
