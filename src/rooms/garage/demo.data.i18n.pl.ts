/**
 * Rama «pl» del año demo de garage. Solo se descarga si el usuario
 * está en ese idioma (el índice `demo.data.i18n.ts` la carga con import()).
 *
 * Las frases se traducen en `traducciones/garage.pl.json`; este
 * archivo lo montan `partir-demo-i18n.mjs` / `traducir-a-mano.mjs meter` —
 * no lo edites a mano.
 */
export default {
  "vehiculos": {
    "biciNombre": "La Grulla",
    "biciNota": "Używany rower ze stali, szary i trochę hałaśliwy, którym codziennie jeżdżę na zmiany, do laboratorium i na treningi. Przez cały rok ani razu nie zostawił mnie na lodzie.",
    "autoNombre": "El Mastodonte",
    "autoNota": "Sedan odziedziczony po wuju, starszy ode mnie, z deską rozdzielczą wypłowiałą od słońca. Uruchamiam go raz na dwa tygodnie, a on każde zaniedbanie każe mi odpokutować z nawiązką."
  },
  "servicios": [
    {
      "dia": -350,
      "vehiculo": "bici",
      "tipo": "revision",
      "titulo": "Ratunek z piwnicy",
      "nota": "Zniesienie roweru z piwnicy, z przebitymi oponami i łańcuchem w skorupie rdzy: pół popołudnia szmatki, powietrza i oleju, żeby znowu ruszył."
    },
    {
      "dia": -336,
      "vehiculo": "auto",
      "tipo": "aceite",
      "titulo": "Wymiana oleju, mocno spóźniona",
      "nota": "Wypłynął czarny jak zimna kawa, a mechanik tylko uniósł brwi — tak właśnie beszta."
    },
    {
      "dia": -318,
      "vehiculo": "bici",
      "tipo": "llantas",
      "titulo": "Nowa dętka i łatka",
      "nota": "Guma capnięta na Doctor Vértiz w drodze na kawę; nauka wymiany dętki na chodniku — późno, ale się udało."
    },
    {
      "dia": -300,
      "vehiculo": "auto",
      "tipo": "bateria",
      "titulo": "Nowy akumulator",
      "nota": "Od tego, że stał bez ruchu, akumulator padł sam z siebie; prośba do sąsiada o odpalenie z kabli, a potem prosto po nowy akumulator."
    },
    {
      "dia": -284,
      "vehiculo": "bici",
      "tipo": "cadena",
      "titulo": "Łańcuch wreszcie czysty",
      "nota": "Odtłuszczenie i naoliwienie w spokojne niedzielne popołudnie: łańcuch przestał skrzypieć jak stara zawiasa, a pedałowanie zrobiło się lżejsze."
    },
    {
      "dia": -252,
      "vehiculo": "auto",
      "tipo": "frenos",
      "titulo": "Przednie klocki hamulcowe",
      "nota": "Piszczały przy każdym świetle i nie dało się już tego ignorować; kosztowało to całą wypłatę, ale przynajmniej spokojniejszy sen."
    },
    {
      "dia": -236,
      "vehiculo": "bici",
      "tipo": "frenos",
      "titulo": "Nowe szczęki hamulcowe",
      "nota": "W deszczu hamowanie działało dwa metry za późno, więc wymiana szczęk i regulacja linek."
    },
    {
      "dia": -190,
      "vehiculo": "bici",
      "tipo": "llantas",
      "titulo": "Guma w drodze do laboratorium",
      "nota": "Szkło na Eje 8 i dotarcie do laboratorium z prowadzonym rowerem, dwadzieścia minut spóźnienia."
    },
    {
      "dia": -178,
      "vehiculo": "auto",
      "tipo": "otro",
      "titulo": "Awaria na Calzada de Tlalpan",
      "nota": "Samochód zgasł w środku alei we wtorkowy wieczór; półtorej godziny na chodniku w oczekiwaniu na lawetę, z rachunkiem pieniędzy, których po prostu nie było. Właśnie wtedy spadł na mnie cały ten miesiąc."
    },
    {
      "dia": -150,
      "vehiculo": "bici",
      "tipo": "revision",
      "titulo": "Pełny przegląd roweru",
      "nota": "Z kolanem w fizjoterapii bieganie nie wchodziło w grę, więc cały czas dla roweru: koła wyśrodkowane, linki i wszystko dokręcone."
    },
    {
      "dia": -140,
      "vehiculo": "auto",
      "tipo": "filtros",
      "titulo": "Filtry po tym przestrachu",
      "nota": "Wymiana filtra powietrza i paliwa, czysta paranoja; wolę zapłacić za to niż znowu czekać na lawetę."
    },
    {
      "dia": -88,
      "vehiculo": "bici",
      "tipo": "cadena",
      "titulo": "Rozciągnięty łańcuch, wymiana",
      "nota": "Z planem na półmaraton używam go codziennie, a łańcuch już ślizgał się przy starcie."
    },
    {
      "dia": -64,
      "vehiculo": "bici",
      "tipo": "transmision",
      "titulo": "Nowa kaseta i linki",
      "nota": "Biegi ślizgały się pod górę; z nową kasetą wreszcie mogę zaufać małej tarczy."
    },
    {
      "dia": -46,
      "vehiculo": "auto",
      "tipo": "aceite",
      "titulo": "Olej i przegląd ogólny",
      "nota": "Zwykły serwis, bez niespodzianek — a przy tym samochodzie to już samo w sobie dobra wiadomość."
    },
    {
      "dia": -27,
      "vehiculo": "bici",
      "tipo": "frenos",
      "titulo": "Hamulce przed maratonem",
      "nota": "Szybka regulacja, bo w tamtych tygodniach rower był jedynym środkiem transportu i żadne wymówki nie wchodziły w grę."
    },
    {
      "dia": -8,
      "vehiculo": "auto",
      "tipo": "lavado",
      "titulo": "Mycie przed wizytą rodziny",
      "nota": "Mycie i odkurzanie przed odbiorem rodziny z dworca autobusowego: to nic nie naprawia mechanicznie, ale czuje się inaczej."
    }
  ],
  "talleres": [
    {
      "clave": "taller",
      "nombre": "Taller Mecánico Rivas",
      "direccion": "Av. Cuauhtémoc 812, Col. Narvarte, Benito Juárez",
      "notas": "Pan Rivas zawsze tłumaczy, co naprawdę pilne, a co może poczekać, i nigdy nie zawyżył rachunku; to jedyny mechanik, któremu ufam z tym samochodem."
    },
    {
      "clave": "aseguradora",
      "nombre": "Seguros Meridiano - agentka Nadia Ortega",
      "direccion": "Av. Insurgentes Sur 1234, piętro 3, Col. Del Valle",
      "notas": "Nadia odpowiada na WhatsAppie nawet w niedzielę i ustawiła płatności miesięczne przy przejściu na pełne ubezpieczenie."
    },
    {
      "clave": "verificentro",
      "nombre": "Verificentro 09-118 Iztaccíhuatl",
      "direccion": "Calz. Iztaccíhuatl 240, Col. Iztaccíhuatl, Benito Juárez",
      "notas": "Wizyta o siódmej rano i wychodzę po czterdziestu minutach; ten w Coyoacán kosztował mnie pół poranka w kolejce."
    },
    {
      "clave": "ciclos",
      "nombre": "Ciclos Malinche",
      "direccion": "Zacatecas 145, Col. Roma Sur, Cuauhtémoc",
      "notas": "Tam kupno roweru, tam też jego serwis: pożyczają narzędzia i uczą, jak robić to samodzielnie, zamiast liczyć sobie za wszystko."
    },
    {
      "clave": "grua",
      "nombre": "Grúas Tepeyac 24 horas",
      "direccion": "Baza przy Eje Central Lázaro Cárdenas 1105, Col. Álamos",
      "notas": "To numer, pod który zadzwoniło się tamtej nocy, kiedy auto zostawiło mnie na ulicy; przyjechali po półtorej godziny i nie próbowali zedrzeć więcej, niż trzeba."
    }
  ],
  "tramites": [
    {
      "clave": "verificacion",
      "titulo": "Półroczny przegląd techniczny",
      "nota": "Termin zależy od koloru naklejki na szybie i zawsze umawiam się w pierwszym tygodniu: jak przegapię, mandat boli bardziej niż sama procedura."
    },
    {
      "clave": "seguro",
      "titulo": "Odnowienie polisy",
      "nota": "W tym roku przejście na pełne ubezpieczenie u Nadii po tamtym przestrachu z awarią; płacę w ratach miesięcznych i wliczam to w budżet na wypłatę."
    },
    {
      "clave": "tenencia",
      "titulo": "Podatek od pojazdu i doroczne odnowienie",
      "nota": "Płacę w pierwszych miesiącach roku, żeby załapać się na ulgę i mieć to już z głowy."
    },
    {
      "clave": "circulacion",
      "titulo": "Zmiana właściciela i dowodu rejestracyjnego",
      "nota": "Dowód rejestracyjny wciąż jest na nazwisko wuja i czas to uregulować, zanim spowoduje kłopoty na jakiejś kontroli."
    },
    {
      "clave": "afinacionBici",
      "titulo": "Przegląd roweru",
      "nota": "Co pół roku w Ciclos Malinche: centrowanie kół, linki i hamulce — o wiele taniej niż naprawa skrzywionej felgi."
    }
  ]
}
