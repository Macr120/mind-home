/**
 * Rama «de» del año demo de garage. Solo se descarga si el usuario
 * está en ese idioma (el índice `demo.data.i18n.ts` la carga con import()).
 *
 * Las frases se traducen en `traducciones/garage.de.json`; este
 * archivo lo montan `partir-demo-i18n.mjs` / `traducir-a-mano.mjs meter` —
 * no lo edites a mano.
 */
export default {
  "vehiculos": {
    "biciNombre": "La Grulla",
    "biciNota": "Gebrauchtes Stahlrad, grau und ein bisschen quietschend, mit dem ich jeden Tag zu Schichten, ins Labor und zum Training fahre. Im ganzen Jahr hat es mich kein einziges Mal im Stich gelassen.",
    "autoNombre": "El Mastodonte",
    "autoNota": "Limousine, die ich von meinem Onkel geerbt habe, älter als ich und mit einem von der Sonne ausgeblichenen Armaturenbrett. Ich starte ihn etwa alle zwei Wochen, und er lässt mich jede Vernachlässigung mit Zinsen bezahlen."
  },
  "servicios": [
    {
      "dia": -350,
      "vehiculo": "bici",
      "tipo": "revision",
      "titulo": "Rettung aus dem Keller",
      "nota": "Ich holte es mit platten Reifen und einer verkrusteten Kette aus dem Keller; ein halber Nachmittag mit Lappen, Luft und Öl, bis es wieder rollte."
    },
    {
      "dia": -336,
      "vehiculo": "auto",
      "tipo": "aceite",
      "titulo": "Längst fälliger Ölwechsel",
      "nota": "Es kam schwarz wie kalter Kaffee heraus, und der Mechaniker hob nur die Augenbrauen — so schimpft er mit mir."
    },
    {
      "dia": -318,
      "vehiculo": "bici",
      "tipo": "llantas",
      "titulo": "Neuer Schlauch, erster Flicken",
      "nota": "Plattfuß auf der Doctor Vértiz auf dem Weg zum Café; ich habe gelernt, auf dem Gehweg einen Schlauch zu wechseln, spät, aber ich hab's gelernt."
    },
    {
      "dia": -300,
      "vehiculo": "auto",
      "tipo": "bateria",
      "titulo": "Neue Batterie",
      "nota": "Weil ich es kaum benutzt habe, ist die Batterie von selbst gestorben; ich bat einen Nachbarn um Starthilfe und fuhr danach direkt eine neue Batterie kaufen."
    },
    {
      "dia": -284,
      "vehiculo": "bici",
      "tipo": "cadena",
      "titulo": "Endlich eine saubere Kette",
      "nota": "An einem Sonntag in Ruhe entfettet und geölt: Sie klingt nicht mehr wie eine alte Türangel, und sogar das Treten geht leichter."
    },
    {
      "dia": -252,
      "vehiculo": "auto",
      "tipo": "frenos",
      "titulo": "Vordere Bremsbeläge",
      "nota": "Sie quietschten bei jeder Ampel, das ließ sich nicht mehr ignorieren; es hat mich den halben Monatslohn gekostet, aber ich habe wieder ruhig geschlafen."
    },
    {
      "dia": -236,
      "vehiculo": "bici",
      "tipo": "frenos",
      "titulo": "Neue Bremsklötze",
      "nota": "Bei Regen bremste ich zwei Meter später als gewollt, also habe ich die Bremsklötze gewechselt und die Züge nachgestellt."
    },
    {
      "dia": -190,
      "vehiculo": "bici",
      "tipo": "llantas",
      "titulo": "Plattfuß auf dem Weg ins Labor",
      "nota": "Eine Glasscherbe auf dem Eje 8, und ich kam schiebend zwanzig Minuten zu spät ins Labor."
    },
    {
      "dia": -178,
      "vehiculo": "auto",
      "tipo": "otro",
      "titulo": "Liegengeblieben auf der Calzada de Tlalpan",
      "nota": "Das Auto ging mitten auf der Straße aus, an einem Dienstagabend, und ich saß anderthalb Stunden auf dem Bordstein und wartete auf den Abschleppwagen, rechnete mit Geld, das ich nicht hatte; in dem Moment brach der ganze Monat über mir zusammen."
    },
    {
      "dia": -150,
      "vehiculo": "bici",
      "tipo": "revision",
      "titulo": "Große Durchsicht",
      "nota": "Mit dem Knie in der Physiotherapie konnte ich nicht laufen, also habe ich die Zeit ins Rad gesteckt: Laufräder zentriert, Züge und alles festgezogen."
    },
    {
      "dia": -140,
      "vehiculo": "auto",
      "tipo": "filtros",
      "titulo": "Filter nach dem Schreck",
      "nota": "Luft- und Benzinfilter aus purer Paranoia gewechselt; das zahle ich lieber, als wieder auf einen Abschleppwagen zu warten."
    },
    {
      "dia": -88,
      "vehiculo": "bici",
      "tipo": "cadena",
      "titulo": "Ausgeleierte Kette gewechselt",
      "nota": "Mit dem Halbmarathon-Plan nutze ich es jeden Tag, und die Kette rutschte schon beim Anfahren durch."
    },
    {
      "dia": -64,
      "vehiculo": "bici",
      "tipo": "transmision",
      "titulo": "Neue Kassette und neue Züge",
      "nota": "Die Gänge sprangen bei jeder Steigung; mit der neuen Kassette kann ich mich endlich auf das kleine Kettenblatt verlassen."
    },
    {
      "dia": -46,
      "vehiculo": "auto",
      "tipo": "aceite",
      "titulo": "Ölwechsel und allgemeine Durchsicht",
      "nota": "Normaler Service ohne Überraschungen, was bei diesem Auto schon als gute Nachricht gilt."
    },
    {
      "dia": -27,
      "vehiculo": "bici",
      "tipo": "frenos",
      "titulo": "Bremsen vor dem Marathon",
      "nota": "Schnelle Justierung, denn in diesen Wochen war das Rad mein einziges Verkehrsmittel, und ich wollte keine Ausrede riskieren."
    },
    {
      "dia": -8,
      "vehiculo": "auto",
      "tipo": "lavado",
      "titulo": "Gewaschen vor dem Familienbesuch",
      "nota": "Ich habe es gewaschen und gesaugt, um meine Familie vom Busbahnhof abzuholen: Mechanisch ändert das nichts, aber es fühlt sich anders an."
    }
  ],
  "talleres": [
    {
      "clave": "taller",
      "nombre": "Taller Mecánico Rivas",
      "direccion": "Av. Cuauhtémoc 812, Col. Narvarte, Benito Juárez",
      "notas": "Don Rivas erklärt mir, was wirklich dringend ist und was warten kann, und er hat mir noch nie eine Rechnung aufgebläht; er ist der Einzige, dem ich bei diesem Auto vertraue."
    },
    {
      "clave": "aseguradora",
      "nombre": "Seguros Meridiano - Agentin Nadia Ortega",
      "direccion": "Av. Insurgentes Sur 1234, 3. Stock, Col. Del Valle",
      "notas": "Nadia antwortet auf WhatsApp, selbst sonntags, und sie hat mir eine monatliche Ratenzahlung eingerichtet, als ich auf Vollkasko umgestiegen bin."
    },
    {
      "clave": "verificentro",
      "nombre": "Verificentro 09-118 Iztaccíhuatl",
      "direccion": "Calz. Iztaccíhuatl 240, Col. Iztaccíhuatl, Benito Juárez",
      "notas": "Termin um sieben Uhr morgens, und ich bin in vierzig Minuten fertig; die Prüfstelle in Coyoacán hat mich einen halben Vormittag Schlangestehen gekostet."
    },
    {
      "clave": "ciclos",
      "nombre": "Ciclos Malinche",
      "direccion": "Zacatecas 145, Col. Roma Sur, Cuauhtémoc",
      "notas": "Dort habe ich das Rad gekauft, und dort lasse ich es auch einstellen; sie leihen mir Werkzeug und bringen es mir bei, statt mir für alles Geld abzuknöpfen."
    },
    {
      "clave": "grua",
      "nombre": "Grúas Tepeyac 24 Stunden",
      "direccion": "Standort: Eje Central Lázaro Cárdenas 1105, Col. Álamos",
      "notas": "Das ist die Nummer, die ich in der Nacht gewählt habe, in der ich liegengeblieben bin; sie kamen in anderthalb Stunden und haben mich beim Preis nicht über den Tisch gezogen."
    }
  ],
  "tramites": [
    {
      "clave": "verificacion",
      "titulo": "Halbjährliche Abgasuntersuchung",
      "nota": "Der Termin richtet sich nach meiner Plakette, und ich buche immer in der ersten Woche: Wenn ich es verpasse, tut das Bußgeld mehr weh als die Untersuchung selbst."
    },
    {
      "clave": "seguro",
      "titulo": "Verlängerung der Versicherungspolice",
      "nota": "Dieses Jahr bin ich nach dem Schreck mit der Panne bei Nadia auf Vollkasko umgestiegen; ich zahle in Monatsraten und plane es fest im Zweiwochenbudget ein."
    },
    {
      "clave": "tenencia",
      "titulo": "Jährliche Kfz-Steuer und Zulassung",
      "nota": "Ich zahle es in den ersten Monaten des Jahres, um den Rabatt mitzunehmen und die Sache vom Tisch zu haben."
    },
    {
      "clave": "circulacion",
      "titulo": "Halterwechsel und neue Fahrzeugpapiere",
      "nota": "Die Fahrzeugpapiere laufen noch auf meinen Onkel, und es wird Zeit, das zu regeln, bevor es mir bei einer Kontrolle Ärger macht."
    },
    {
      "clave": "afinacionBici",
      "titulo": "Fahrrad-Inspektion",
      "nota": "Alle sechs Monate bei Ciclos Malinche: Laufräder zentrieren, Züge und Bremsen prüfen — deutlich billiger, als später eine verzogene Felge zu reparieren."
    }
  ]
}
