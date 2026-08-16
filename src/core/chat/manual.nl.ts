import type { ManualTraducido } from './manualI18n'

/**
 * Las frases de ejemplo del manual de comandos en neerlandés, indexadas por
 * su texto español de origen (ver `manualI18n.ts`).
 *
 * Registro: tuteo («je/jij»). El neerlandés no marca género en la
 * conjugación (ni en presente ni en pasado), así que los registros en 1ª
 * persona («Ik at», «Ik sliep»…) no tienen el problema de ruso/polaco y se
 * tradujeron literalmente.
 */
export const MANUAL_NL: ManualTraducido = {
  frases: {
    '[Comí] {pollo con arroz} en la {cena}':
      '[Ik at] {kip met rijst} als {avondeten}',
    '[Tomé] {2 vasos} de [agua]':
      '[Ik dronk] {2 glazen} [water]',
    '[Me pesé]: {74 kg}':
      '[Ik woog mezelf]: {74 kg}',
    '[Abre] el {recetario}':
      '[Open] het {receptenboek}',
    '[Abre] la {lista del súper}':
      '[Open] de {boodschappenlijst}',
    '[Abre] el {diario de comidas}':
      '[Open] het {voedingsdagboek}',
    '[Abre] la {dieta}':
      '[Open] het {dieet}',
    '[Abre] las {metas de nutrición}':
      '[Open] de {voedingsdoelen}',
    'Inventa una [receta] {ligera con atún}':
      'Bedenk een [recept] {licht, met tonijn}',
    'Arma una [dieta] {alta en proteína}':
      'Stel een [dieet] samen {rijk aan eiwitten}',
    'Agrega {plátano y avena} a la [lista del súper]':
      'Voeg {banaan en havermout} toe aan de [boodschappenlijst]',
    '[Entrené] {pierna} {45 min}':
      '[Ik trainde] {benen} {45 min}',
    '[Corrí] {5 km}':
      '[Ik rende] {5 km}',
    '[Abre] el {plan de ejercicio}':
      '[Open] het {trainingsplan}',
    '[Abre] {fuerza}':
      '[Open] {kracht}',
    '[Abre] {cardio}':
      '[Open] {conditie}',
    '[Abre] {flexibilidad}':
      '[Open] {flexibiliteit}',
    '[Abre] las {metas de ejercicio}':
      '[Open] de {trainingsdoelen}',
    'Registra mi sesión: {crossfit 40 min, intensidad alta}':
      'Registreer mijn sessie: {crossfit 40 min, hoge intensiteit}',
    '[Dormí] {7 horas}, calidad {4/5}':
      '[Ik sliep] {7 uur}, kwaliteit {4/5}',
    '[Abre] el {despertador}':
      '[Open] de {wekker}',
    '[Abre] {mi sueño}':
      '[Open] {mijn slaap}',
    '{Me acosté a las 23, desperté a las 7 y me levanté 2 veces}':
      '{Ging om 23:00 naar bed, werd om 7:00 wakker en stond 2 keer op}',
    '[Recuerdo]: {tarde de juegos con mi hermana}':
      '[Herinnering]: {speelavond met mijn zus}',
    '[Abre] mis {anécdotas}':
      '[Open] mijn {herinneringen}',
    '[Abre] el {calendario de ánimo}':
      '[Open] de {stemmingskalender}',
    'Anota esta anécdota: {hoy celebramos el cumple de mamá}':
      "Noteer deze herinnering: {we vierden vandaag mama's verjaardag}",
    '[Gasté] {500} en {el súper}':
      '[Ik gaf] {500} uit {aan boodschappen}',
    '[Cobré] {8000} de {la quincena}':
      '[Ik ontving] {8000} van {mijn tweewekelijkse loon}',
    '[Abre] el {balance}':
      '[Open] de {kasstroom}',
    '[Abre] los {gastos fijos}':
      '[Open] de {vaste lasten}',
    '[Abre] los {movimientos}':
      '[Open] de {transacties}',
    '[Abre] las {metas de ahorro}':
      '[Open] de {spaardoelen}',
    '[Abre] las {divisas}':
      '[Open] {valuta}',
    '[Abre] las {criptomonedas}':
      '[Open] {crypto}',
    '[Abre] las {materias primas}':
      '[Open] {grondstoffen}',
    '{Pagué 250 de luz y 180 de agua}':
      '{Ik betaalde 250 voor stroom en 180 voor water}',
    '[Abre] el {formulario}':
      '[Open] het {formuleboek}',
    '[Abre] la {calculadora}':
      '[Open] de {rekenmachine}',
    '[Abre] el {graficador}':
      '[Open] de {grafieken}',
    '[Abre] las {hojas de cálculo}':
      '[Open] de {spreadsheets}',
    '[Resolver ecuación]':
      '[Vergelijking oplossen]',
    '[Convertir unidades]':
      '[Eenheden omrekenen]',
    '[Abre] las {matrices}':
      '[Open] de {matrices}',
    '[Sistema de ecuaciones]':
      '[Stelsel vergelijkingen]',
    '[Convertir a binario]':
      '[Omzetten naar binair]',
    '[Propina]':
      '[Fooi]',
    '[Regla de tres]':
      '[Regel van drieën]',
    '[Estudié] {historia romana} {30 min}':
      '[Ik studeerde] {Romeinse geschiedenis} {30 min}',
    '[Abre] las {charlas}':
      '[Open] de {chats}',
    '[Abre] la {enciclopedia}':
      '[Open] de {encyclopedie}',
    '[Abre] la {sesión de estudio}':
      '[Open] de {studiesessie}',
    '[Abre] el {resumen de estudio}':
      '[Open] het {studieoverzicht}',
    'Apunta que aprendí: {los ríos de Europa}':
      'Noteer wat ik geleerd heb: {de rivieren van Europa}',
    '[Vi la película] {Dune}':
      '[Ik keek de film] {Dune}',
    '[Jugué] {ajedrez} con mi hermano':
      '[Ik speelde] {schaak} met mijn broer',
    '[Abre] el {archivo}':
      '[Open] het {archief}',
    '[Abre] la {mesa de juegos}':
      '[Open] de {speeltafel}',
    '[Quiero jugar] la {viborita}':
      '[Ik wil] {Snake} spelen',
    '[Juega] {tetris}':
      '[Speel] {Tetris}',
    '[Juega] una partida de {ajedrez}':
      '[Speel] een potje {schaak}',
    'Apunta {la serie Dark} como pendiente':
      'Noteer {de serie Dark} als nog te kijken',
    '[Abre] el {mapamundi}':
      '[Open] de {wereldkaart}',
    '[Abre] {por conocer}':
      '[Open] {reisplan}',
    '[Abre] las {rutas}':
      '[Open] de {routes}',
    '[Abre] la {bitácora de viajes}':
      '[Open] het {reislogboek}',
    '[Visité] {Oaxaca}':
      '[Ik bezocht] {Oaxaca}',
    'Quiero conocer {Japón}':
      'Ik wil {Japan} bezoeken',
    '[Visité] {Roma}: {la fontana de noche es mágica}':
      '[Ik bezocht] {Rome}: {de fontein is magisch in de nacht}',
    '[Medité] {10 min}':
      '[Ik mediteerde] {10 min}',
    '[@]{jardin} [agradezco] {mi salud, mi familia y el café}':
      '[@]{jardin} [ik ben dankbaar voor] {mijn gezondheid, mijn familie en koffie}',
    '[Abre] la {meditación}':
      '[Open] de {meditatie}',
    '[Abre] la {respiración}':
      '[Open] de {ademhaling}',
    '[Abre] los {agradecimientos}':
      '[Open] de {dankbaarheid}',
    'Cambié el [aceite] del {auto}':
      'Ik ververste de [olie] van de {auto}',
    '[Abre] el {resumen del garage}':
      '[Open] het {garage-overzicht}',
    '[Abre] {mis vehículos}':
      '[Open] {mijn voertuigen}',
    '[Abre] los {titulares}':
      '[Open] de {koppen}',
    '[Abre] las {efemérides}':
      '[Open] {op deze dag}',
    'Avancé en mi [proyecto] de {acuarela} {40 min}':
      'Ik werkte aan mijn [project] {aquarel}: {40 min}',
    'Practiqué {guitarra} {25 min}':
      'Ik oefende {gitaar} {25 min}',
    '[Abre] {mis hobbies}':
      "[Open] {mijn hobby's}",
    '[Abre] mis {mapas mentales}':
      '[Open] mijn {mindmaps}',
    '[Abre] los {mapas conceptuales}':
      '[Open] de {conceptmappen}',
    '[Hazme un mapa mental] de {la fotosíntesis}':
      '[Maak een mindmap] over {fotosynthese}',
    '[Dibuja un diagrama de flujo] de {cómo hacer pan}':
      '[Teken een stroomschema] van {hoe je brood bakt}',
    '[Compara] {café} y {té} en un mapa':
      '[Vergelijk] {koffie} en {thee} in een kaart',
    '[Haz un esquema] de {lo que me acabas de explicar}':
      '[Maak een schema] van {wat je net hebt uitgelegd}',
    '[Agenda] una {junta con el cliente} el {martes a las 10}':
      '[Plan] een {meeting met de klant} op {dinsdag om 10:00}',
    '[Apunta el pendiente] {mandar la cotización}':
      '[Noteer de taak] {offerte versturen}',
    '[Tengo cita] con el {dentista} el {14 a las 5}':
      '[Ik heb een afspraak] met de {tandarts} op {14 om 17:00}',
    '[Recuérdame] tomar {ibuprofeno} a las {8 y a las 20}':
      '[Herinner me] om {ibuprofen} te nemen om {8 en 20 uur}',
    '[Guarda el contacto] de {Ana}: {5512345678}, cumple el {3 de mayo}':
      '[Sla het contact op] van {Ana}: {5512345678}, verjaardag op {3 mei}',
    '[Abre] mis {pendientes}':
      '[Open] mijn {taken}',
    '[Abre] mis {citas médicas}':
      '[Open] mijn {medische afspraken}',
    '[Abre] mis {contactos}':
      '[Open] mijn {contacten}',
    '[Vocab] {inglés}: {dog} = {perro}':
      '[Woordje] {Engels}: {dog} = {hond}',
    '[Repasé] {francés} {15 min}':
      '[Ik herhaalde] {Frans} {15 min}',
    '[Abre] el {tutor}':
      '[Open] de {tutor}',
    '[Abre] el {repaso}':
      '[Open] de {herhaling}',
    '[Abre] el {temario}':
      '[Open] het {leerplan}',
    '[Abre] el {progreso de idiomas}':
      '[Open] de {taalvoortgang}',
    'Aprendí en {alemán}: {Hund} = {perro}':
      'Ik leerde in het {Duits}: {Hund} = {hond}',
    '[Construye] un {huerto}':
      '[Bouw] een {moestuin}',
    '[Quiero sembrar] {zanahorias}':
      '[Ik wil] {wortels} planten',
    '[Siembra] {maíz} en el huerto':
      '[Zaai] {mais} in de moestuin',
    '[Pon] un {aspersor} en el huerto':
      '[Zet] een {sproeier} in de moestuin',
    '[Riega] el {huerto}':
      '[Begiet] de {moestuin}',
    '[Cosecha] el {huerto}':
      '[Oogst] de {moestuin}',
    '[Llévame] al {huerto}':
      '[Breng me] naar de {moestuin}',
    '[Haz] un {corral}':
      '[Maak] een {hok}',
    '[Pon] {vacas} en la granja':
      '[Zet] {koeien} op de boerderij',
    '[Alimenta] a los {animales}':
      '[Voer] de {dieren}',
    '[Mima] a los {animales}':
      '[Aai] de {dieren}',
    '[Cura] a los {animales}':
      '[Genees] de {dieren}',
    '[Limpia] los {corrales}':
      '[Maak schoon] de {hokken}',
    '[Llévame] a la {granja}':
      '[Breng me] naar de {boerderij}',
    '[Pon] una {pista de carreras}':
      '[Plaats] een {racebaan}',
    '[Traza] las {vías del tren}':
      '[Teken] de {treinrails}',
    '[Construye] una {montaña rusa}':
      '[Bouw] een {achtbaan}',
    '[Pon] la {meta} de la pista':
      '[Zet] de {finishlijn} van de baan',
    '[Borra] la {pista}':
      '[Verwijder] de {baan}',
    '[Corre una carrera] de {3 vueltas}':
      '[Organiseer een race] van {3 rondes}',
    '[Hagamos una carrera] {contra} un asistente':
      '[Laten we racen] {tegen} een assistent',
    '[Corre una carrera] {fácil} de {5 vueltas}':
      '[Organiseer een race]: {makkelijk}, {5 rondes}',
    '[Quiero montar] el {tren}':
      '[Ik wil] met de {trein} rijden',
    '[Quiero montar] la {montaña rusa}':
      '[Ik wil] in de {achtbaan}',
    '[Llévame] a la {meta}':
      '[Breng me] naar de {finish}',
    '[Juguemos] {paintball}':
      '[Laten we] {paintball} spelen',
    '[Juguemos paintball] {2v2}':
      '[Laten we paintball spelen] {2 tegen 2}',
    '[Reta] a {Luna} a un paintball {1v1}':
      '[Daag] {Luna} uit voor paintball {1 tegen 1}',
    '[Paintball] campal en {difícil}':
      '[Paintball] ieder voor zich op niveau {moeilijk}',
    '[Sal] del {paintball}':
      '[Verlaat] de {paintball}',
    '[Pon] una {cancha de fútbol}':
      '[Plaats] een {voetbalveld}',
    '[Pon] una {cancha de tenis} {azul}':
      '[Plaats] een {blauw} {tennisveld}',
    '[Crea] una {cancha de básquet}':
      '[Maak] een {basketbalveld}',
    '[Pon] un {campo de béisbol}':
      '[Plaats] een {honkbalveld}',
    '[Llévame] a la {cancha}':
      '[Breng me] naar het {veld}',
    '[Abre] la {agenda de hoy}':
      '[Open] de {agenda van vandaag}',
    '[Abre] {mi semana}':
      '[Open] {mijn week}',
    '[Abre] el {cronograma}':
      '[Open] het {tijdschema}',
    '[Crea una rutina] de mañana: {agua, estiramiento y gratitud} a las {7:00}':
      '[Maak een routine] voor de ochtend: {water, stretchen en dankbaarheid} om {7:00}',
    '[Crea una rutina] de {lunes y miércoles}: {correr 20 min}':
      '[Maak een routine] voor {maandag en woensdag}: {20 min hardlopen}',
    '[Enséñame] las {rutinas}':
      '[Laat me] de {routines} zien',
    '[Crea un cuarto] llamado {Estudio}':
      '[Maak een kamer] genaamd {Studio}',
    '[Renombra] la {cocina} a {Oficina}':
      '[Hernoem] de {keuken} naar {Kantoor}',
    '[Cambia el ícono] de la {cocina} a {🍳}':
      '[Verander het icoon] van de {keuken} naar {🍳}',
    '[Pon] la {cocina} en categoría {cuerpo}':
      '[Zet] de {keuken} in categorie {lichaam}',
    '[Agrega] la {biblioteca} al mapa':
      '[Voeg] de {bibliotheek} toe aan de kaart',
    '[Elimina] la {cocina}':
      '[Verwijder] de {keuken}',
    '[Abre] la {cocina}':
      '[Open] de {keuken}',
    '[Pinta] la {cocina} de {azul}':
      '[Verf] de {keuken} {blauw}',
    '[Piso] de la {cocina} de {madera}':
      '[Vloer] van de {keuken} van {hout}',
    '[Piso] de la {cocina} {rojo}':
      '{Rode} [vloer] in de {keuken}',
    '[Techo] de la {cocina} de {tejas rojas}':
      '[Dak] van de {keuken} met {rode dakpannen}',
    '[Techo a dos aguas] en la {cocina}':
      '[Zadeldak] op de {keuken}',
    '[Haz] la {cocina} {redonda}':
      '[Maak] de {keuken} {rond}',
    '[Agranda] la {cocina}':
      '[Vergroot] de {keuken}',
    '[Encoge] la {cocina}':
      '[Verklein] de {keuken}',
    '[Mueve] la {cocina} a la {derecha}':
      '[Verplaats] de {keuken} naar {rechts}',
    '[Abre el muro] {norte} de la {cocina}':
      '[Open de muur] aan de {noordkant} van de {keuken}',
    '[Pon una puerta] {corredera} en el muro {sur} de la {cocina}':
      '[Plaats een] {schuifdeur} in de {zuid}muur van de {keuken}',
    '[Pon] {ladrillo} en el muro {este} de la {cocina}':
      '[Zet] {baksteen} op de {oost}muur van de {keuken}',
    '[Haz más grueso] el muro {norte} de la {cocina}':
      '[Maak dikker] de {noord}muur van de {keuken}',
    '[Apila] la {sala} sobre la {cocina}':
      '[Stapel] de {woonkamer} op de {keuken}',
    '[Agranda el mapa] hacia el {este}':
      '[Vergroot de kaart] naar het {oosten}',
    '[Crea] una {lámpara}':
      '[Maak] een {lamp}',
    '[Pinta el último objeto] de {rojo}':
      '[Verf het laatste object] {rood}',
    '[Gira el último objeto]':
      '[Draai het laatste object]',
    '[Haz el último objeto] más {grande}':
      '[Maak het laatste object] {groter}',
    '[Agrupa los objetos] de la {cocina}':
      '[Groepeer de objecten] van de {keuken}',
    '[Quita el último objeto]':
      '[Verwijder het laatste object]',
    '[Genera en 3D] {un dragón morado}':
      '[Genereer in 3D] {een paarse draak}',
    '[Genera en 3D] {una fuente de piedra} estilo {minimalista}':
      '[Genereer in 3D] {een stenen fontein} in {minimalistische} stijl',
    '[Crea una imagen] de {un atardecer en la playa}':
      '[Maak een afbeelding] van {een zonsondergang op het strand}',
    '[Ponme] {sombrero} {rojo}':
      '[Zet me] een {rode} {hoed} op',
    '[Quítame] los {lentes}':
      '[Haal] mijn {bril} af',
    '[Pinta el torso] del [avatar] de {verde}':
      '[Verf de romp] van de [Avatar] {groen}',
    '[Haz el avatar] más {grande}':
      '[Maak de Avatar] {groter}',
    '[Móntame] en la {bici}':
      '[Zet me] op de {fiets}',
    '[Quiero conducir] el {auto}':
      '[Ik wil] de {auto} besturen',
    '[Bájame]':
      '[Laat me eraf]',
    '[Vista en] {primera persona}':
      '[Weergave in] {eerste persoon}',
    '[Vista] {isométrica}':
      '{Isometrische} [weergave]',
    '[Cambia el tema] a {navidad}':
      '[Verander het thema] naar {kerst}',
    '[Fondo] {nieve}':
      '[Achtergrond] {sneeuw}',
    '[Quita el tema]':
      '[Verwijder het thema]',
    '[Pon música] {relajante}':
      '[Zet muziek op] {ontspannend}',
    '[Música] {chiptune}':
      '[Muziek] {chiptune}',
    '[Volumen] al {40%}':
      '[Volume] op {40%}',
    '[Apaga la música]':
      '[Zet de muziek uit]',
    '[Abre] mi {resumen semanal}':
      '[Open] mijn {weekoverzicht}',
    '[Abre] mi {resumen mensual}':
      '[Open] mijn {maandoverzicht}',
    '[Modo] {oscuro}':
      '[Modus] {donker}',
    '[Apariencia] {transparente}':
      '[Uiterlijk] {transparant}',
    '[Cambia el idioma] a {inglés}':
      '[Verander de taal] naar {Engels}',
    '[Tema de interfaz] {neón}':
      '[Thema van de interface] {neon}',
    '[Tipografía] {serif}':
      '[Lettertype] {serif}',
    '[Pon iconos] {profesionales}':
      '[Gebruik] {professionele} iconen',
    '[Transparencia] al {40%}':
      '[Transparantie] op {40%}',
    '[Estilo] {cómic}':
      '[Stijl] {comic}',
    '[Apaga los efectos]':
      '[Zet de effecten uit]',
    '[Avísame] de mis {rutinas}':
      '[Herinner me] aan mijn {routines}',
    '[Avísame de mis metas] a las {21:00}':
      '[Herinner me aan mijn doelen] om {21:00}',
    '[Apaga los avisos]':
      '[Zet de meldingen uit]',
    '[Descarga un respaldo] de mis datos':
      '[Download een back-up] van mijn gegevens',
    '[Vuelve a ver la bienvenida]':
      '[Bekijk de welkomstintro] opnieuw',
    '[Abre las configuraciones]':
      '[Open de instellingen]',
    '[Abre] mi {cuenta}':
      '[Open] mijn {account}',
    '[Recuerda que] {soy vegetariano}':
      '[Onthoud dat] {ik vegetariër ben}',
    '[@]{cocina} {ensalada de la comida}':
      '[@]{cocina} {salade bij de lunch}',
    '[Cómo funciona] la {cocina}':
      '[Hoe werkt] de {keuken}',
    '[Cómo funciona] el {editor}':
      '[Hoe werkt] de {editor}',
    '[Cómo funciona] la {rueda de herramientas}':
      '[Hoe werkt] het {gereedschapswiel}',
    '[Cómo funciona] el {chat}':
      '[Hoe werkt] de {chat}',
    '[Qué hace] el {inventario}':
      '[Wat doet] de {inventaris}',
    '[Para qué sirve] la {cámara}':
      '[Waar dient] de {camera} voor',
    '[Tutorial de] {ejercicio}':
      '[Uitleg over] {de gym}',
    '[Tutorial de] la {biblioteca}':
      '[Uitleg over] de {bibliotheek}',
    '[Tutorial] {general}':
      '{Algemene} [uitleg]',
  },
  atajos: {
    'Caminar (también con las flechas)':
      'Lopen (ook met de pijltjestoetsen)',
    'Correr (se queda puesto hasta volver a pulsar)':
      'Rennen (blijft aan tot je opnieuw drukt)',
    'Saltar':
      'Springen',
    'Agacharse (mantener pulsado)':
      'Bukken (ingedrukt houden)',
    'Lo que tengas delante: entrar al cuarto, subirte o bajarte del vehículo, cambiar de nivel':
      'Wat er voor je staat: een kamer binnengaan, in of uit een voertuig stappen, van verdieping wisselen',
    'Levantar la mano derecha / izquierda':
      'Rechter- / linkerhand opsteken',
    'Bailar':
      'Dansen',
    'Mortal':
      'Salto',
    'Abrir la rueda de herramientas':
      'Gereedschapswiel openen',
    'Abrir el chat y escribir':
      'Chat openen en typen',
    'Cambiar de vista: isométrica, tercera y primera persona':
      'Van weergave wisselen: isometrisch, derde en eerste persoon',
    'Esconder o mostrar el HUD':
      'HUD verbergen of tonen',
    'Cerrar lo que esté abierto':
      'Sluiten wat open staat',
    'Conduciendo el OVNI: subir y bajar. En los demás vehículos, Espacio derrapa':
      'Bij het besturen van de ufo: stijgen en dalen. Bij de andere voertuigen laat Spatie slippen',
  },
  teclas: {
    'Mayús': 'Shift',
    'Espacio': 'Spatie',
    'Espacio · Mayús': 'Spatie · Shift',
  },
}
