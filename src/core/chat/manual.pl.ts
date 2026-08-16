import type { ManualTraducido } from './manualI18n'

/**
 * Las frases de ejemplo del manual de comandos en polaco, indexadas por
 * su texto español de origen (ver `manualI18n.ts`).
 *
 * Registro: tuteo («ty»), imperativos normales (en polaco el imperativo NO
 * marca género). El problema es el PASADO: como en ruso, la 1ª persona del
 * pasado polaco sí marca género (zjadłem/zjadłam) y asumiríamos el del
 * usuario. Se resolvió igual que `manual.ru.ts`: etiquetas nominales
 * («[Posiłek]:», «[Sen]:») o el pasado impersonal en «-no/-to», que en
 * polaco existe igual que en ruso («Wypito», «Wydano», «Zapłacono» = «se
 * bebió/gastó/pagó», sin sujeto). El resto de comandos son imperativos de
 * «ty», sin este problema.
 */
export const MANUAL_PL: ManualTraducido = {
  frases: {
    '[Comí] {pollo con arroz} en la {cena}':
      '[Posiłek]: {kurczak z ryżem} na {kolację}',
    '[Tomé] {2 vasos} de [agua]':
      '[Wypito] {2 szklanki} [wody]',
    '[Me pesé]: {74 kg}':
      '[Waga]: {74 kg}',
    '[Abre] el {recetario}':
      '[Otwórz] {książkę przepisów}',
    '[Abre] la {lista del súper}':
      '[Otwórz] {listę zakupów}',
    '[Abre] el {diario de comidas}':
      '[Otwórz] {dziennik posiłków}',
    '[Abre] la {dieta}':
      '[Otwórz] {dietę}',
    '[Abre] las {metas de nutrición}':
      '[Otwórz] {cele żywieniowe}',
    'Inventa una [receta] {ligera con atún}':
      'Wymyśl [przepis] {lekki, z tuńczykiem}',
    'Arma una [dieta] {alta en proteína}':
      'Ułóż [dietę] {wysokobiałkową}',
    'Agrega {plátano y avena} a la [lista del súper]':
      'Dodaj {banana i owsiankę} do [listy zakupów]',
    '[Entrené] {pierna} {45 min}':
      '[Trening]: {nogi} {45 min}',
    '[Corrí] {5 km}':
      '[Bieg]: {5 km}',
    '[Abre] el {plan de ejercicio}':
      '[Otwórz] {plan treningowy}',
    '[Abre] {fuerza}':
      '[Otwórz] {siłę}',
    '[Abre] {cardio}':
      '[Otwórz] {wytrzymałość}',
    '[Abre] {flexibilidad}':
      '[Otwórz] {elastyczność}',
    '[Abre] las {metas de ejercicio}':
      '[Otwórz] {cele treningowe}',
    'Registra mi sesión: {crossfit 40 min, intensidad alta}':
      'Zapisz sesję: {crossfit 40 min, wysoka intensywność}',
    '[Dormí] {7 horas}, calidad {4/5}':
      '[Sen]: {7 godzin}, jakość {4/5}',
    '[Abre] el {despertador}':
      '[Otwórz] {budzik}',
    '[Abre] {mi sueño}':
      '[Otwórz] {mój sen}',
    '{Me acosté a las 23, desperté a las 7 y me levanté 2 veces}':
      '{Zasypianie o 23, pobudka o 7, wstawanie w nocy: 2 razy}',
    '[Recuerdo]: {tarde de juegos con mi hermana}':
      '[Wspomnienie]: {wieczór gier z siostrą}',
    '[Abre] mis {anécdotas}':
      '[Otwórz] moje {wspomnienia}',
    '[Abre] el {calendario de ánimo}':
      '[Otwórz] {kalendarz nastroju}',
    'Anota esta anécdota: {hoy celebramos el cumple de mamá}':
      'Zapisz to wspomnienie: {dziś obchodzimy urodziny mamy}',
    '[Gasté] {500} en {el súper}':
      '[Wydano] {500} w {supermarkecie}',
    '[Cobré] {8000} de {la quincena}':
      '[Otrzymano] {8000} z {wypłaty dwutygodniowej}',
    '[Abre] el {balance}':
      '[Otwórz] {przepływy pieniężne}',
    '[Abre] los {gastos fijos}':
      '[Otwórz] {wydatki stałe}',
    '[Abre] los {movimientos}':
      '[Otwórz] {transakcje}',
    '[Abre] las {metas de ahorro}':
      '[Otwórz] {cele oszczędnościowe}',
    '[Abre] las {divisas}':
      '[Otwórz] {waluty}',
    '[Abre] las {criptomonedas}':
      '[Otwórz] {kryptowaluty}',
    '[Abre] las {materias primas}':
      '[Otwórz] {surowce}',
    '{Pagué 250 de luz y 180 de agua}':
      '{Zapłacono 250 za prąd i 180 za wodę}',
    '[Abre] el {formulario}':
      '[Otwórz] {zbiór wzorów}',
    '[Abre] la {calculadora}':
      '[Otwórz] {kalkulator}',
    '[Abre] el {graficador}':
      '[Otwórz] {wykresy}',
    '[Abre] las {hojas de cálculo}':
      '[Otwórz] {arkusze}',
    '[Resolver ecuación]':
      '[Rozwiąż równanie]',
    '[Convertir unidades]':
      '[Przelicz jednostki]',
    '[Abre] las {matrices}':
      '[Otwórz] {macierze}',
    '[Sistema de ecuaciones]':
      '[Układ równań]',
    '[Convertir a binario]':
      '[Zamień na system dwójkowy]',
    '[Propina]':
      '[Napiwek]',
    '[Regla de tres]':
      '[Reguła trzech]',
    '[Estudié] {historia romana} {30 min}':
      '[Nauka]: {historia rzymska} {30 min}',
    '[Abre] las {charlas}':
      '[Otwórz] {rozmowy}',
    '[Abre] la {enciclopedia}':
      '[Otwórz] {encyklopedię}',
    '[Abre] la {sesión de estudio}':
      '[Otwórz] {sesję nauki}',
    '[Abre] el {resumen de estudio}':
      '[Otwórz] {podsumowanie nauki}',
    'Apunta que aprendí: {los ríos de Europa}':
      'Zapisz, czego się nauczono: {rzeki Europy}',
    '[Vi la película] {Dune}':
      '[Obejrzano film] {Diuna}',
    '[Jugué] {ajedrez} con mi hermano':
      '[Zagrano] w {szachy} z bratem',
    '[Abre] el {archivo}':
      '[Otwórz] {archiwum}',
    '[Abre] la {mesa de juegos}':
      '[Otwórz] {stół do gier}',
    '[Quiero jugar] la {viborita}':
      '[Chcę zagrać] w {wężyka}',
    '[Juega] {tetris}':
      '[Zagraj] w {tetrisa}',
    '[Juega] una partida de {ajedrez}':
      '[Zagraj] partię {szachów}',
    'Apunta {la serie Dark} como pendiente':
      'Zapisz {serial Dark} jako do obejrzenia',
    '[Abre] el {mapamundi}':
      '[Otwórz] {mapę świata}',
    '[Abre] {por conocer}':
      '[Otwórz] {plan podróży}',
    '[Abre] las {rutas}':
      '[Otwórz] {trasy}',
    '[Abre] la {bitácora de viajes}':
      '[Otwórz] {dziennik podróży}',
    '[Visité] {Oaxaca}':
      '[Podróż]: {Oaxaca}',
    'Quiero conocer {Japón}':
      'Chcę poznać {Japonię}',
    '[Visité] {Roma}: {la fontana de noche es mágica}':
      '[Podróż]: {Rzym}: {fontanna nocą jest magiczna}',
    '[Medité] {10 min}':
      '[Medytacja]: {10 min}',
    '[@]{jardin} [agradezco] {mi salud, mi familia y el café}':
      '[@]{jardin} [wdzięczność za] {moje zdrowie, moją rodzinę i kawę}',
    '[Abre] la {meditación}':
      '[Otwórz] {medytację}',
    '[Abre] la {respiración}':
      '[Otwórz] {oddech}',
    '[Abre] los {agradecimientos}':
      '[Otwórz] {podziękowania}',
    'Cambié el [aceite] del {auto}':
      'Wymieniono [olej] w {samochodzie}',
    '[Abre] el {resumen del garage}':
      '[Otwórz] {podsumowanie garażu}',
    '[Abre] {mis vehículos}':
      '[Otwórz] {moje pojazdy}',
    '[Abre] los {titulares}':
      '[Otwórz] {nagłówki}',
    '[Abre] las {efemérides}':
      '[Otwórz] {rocznice dnia}',
    'Avancé en mi [proyecto] de {acuarela} {40 min}':
      'Postęp w moim [projekcie] {akwarela}: {40 min}',
    'Practiqué {guitarra} {25 min}':
      'Poćwiczono {gitarę} {25 min}',
    '[Abre] {mis hobbies}':
      '[Otwórz] {moje hobby}',
    '[Abre] mis {mapas mentales}':
      '[Otwórz] moje {mapy myśli}',
    '[Abre] los {mapas conceptuales}':
      '[Otwórz] {mapy pojęciowe}',
    '[Hazme un mapa mental] de {la fotosíntesis}':
      '[Zrób mi mapę myśli] o {fotosyntezie}',
    '[Dibuja un diagrama de flujo] de {cómo hacer pan}':
      '[Narysuj schemat blokowy] {jak upiec chleb}',
    '[Compara] {café} y {té} en un mapa':
      '[Porównaj] {kawę} i {herbatę} na mapie',
    '[Haz un esquema] de {lo que me acabas de explicar}':
      '[Zrób schemat] tego, {co właśnie wyjaśniasz}',
    '[Agenda] una {junta con el cliente} el {martes a las 10}':
      '[Zaplanuj] {spotkanie z klientem} na {wtorek o 10:00}',
    '[Apunta el pendiente] {mandar la cotización}':
      '[Dodaj zadanie] {wysłać wycenę}',
    '[Tengo cita] con el {dentista} el {14 a las 5}':
      '[Wizyta]: {dentysta}, {14., 17:00}',
    '[Recuérdame] tomar {ibuprofeno} a las {8 y a las 20}':
      '[Przypomnij mi] wziąć {ibuprofen} o {8 i 20}',
    '[Guarda el contacto] de {Ana}: {5512345678}, cumple el {3 de mayo}':
      '[Zapisz kontakt]: {Ana}, {5512345678}, urodziny {3 maja}',
    '[Abre] mis {pendientes}':
      '[Otwórz] moje {zadania}',
    '[Abre] mis {citas médicas}':
      '[Otwórz] moje {wizyty lekarskie}',
    '[Abre] mis {contactos}':
      '[Otwórz] moje {kontakty}',
    '[Vocab] {inglés}: {dog} = {perro}':
      '[Słówko] {angielski}: {dog} = {pies}',
    '[Repasé] {francés} {15 min}':
      '[Powtórka]: {francuski} {15 min}',
    '[Abre] el {tutor}':
      '[Otwórz] {tutora}',
    '[Abre] el {repaso}':
      '[Otwórz] {powtórkę}',
    '[Abre] el {temario}':
      '[Otwórz] {program nauki}',
    '[Abre] el {progreso de idiomas}':
      '[Otwórz] {postępy w językach}',
    'Aprendí en {alemán}: {Hund} = {perro}':
      'Nowe słowo po {niemiecku}: {Hund} = {pies}',
    '[Construye] un {huerto}':
      '[Zbuduj] {ogród warzywny}',
    '[Quiero sembrar] {zanahorias}':
      '[Chcę zasiać] {marchewki}',
    '[Siembra] {maíz} en el huerto':
      '[Zasiej] {kukurydzę} w ogrodzie',
    '[Pon] un {aspersor} en el huerto':
      '[Postaw] {zraszacz} w ogrodzie',
    '[Riega] el {huerto}':
      '[Podlej] {ogród}',
    '[Cosecha] el {huerto}':
      '[Zbierz plony] z {ogrodu}',
    '[Llévame] al {huerto}':
      '[Zabierz mnie] do {ogrodu}',
    '[Haz] un {corral}':
      '[Zrób] {zagrodę}',
    '[Pon] {vacas} en la granja':
      '[Postaw] {krowy} na farmie',
    '[Alimenta] a los {animales}':
      '[Nakarm] {zwierzęta}',
    '[Mima] a los {animales}':
      '[Głaskaj] {zwierzęta}',
    '[Cura] a los {animales}':
      '[Lecz] {zwierzęta}',
    '[Limpia] los {corrales}':
      '[Czyść] {zagrody}',
    '[Llévame] a la {granja}':
      '[Zabierz mnie] na {farmę}',
    '[Pon] una {pista de carreras}':
      '[Postaw] {tor wyścigowy}',
    '[Traza] las {vías del tren}':
      '[Wytycz] {tor kolejowy}',
    '[Construye] una {montaña rusa}':
      '[Zbuduj] {kolejkę górską}',
    '[Pon] la {meta} de la pista':
      '[Postaw] {metę} toru',
    '[Borra] la {pista}':
      '[Usuń] {tor}',
    '[Corre una carrera] de {3 vueltas}':
      '[Zorganizuj wyścig] na {3 okrążenia}',
    '[Hagamos una carrera] {contra} un asistente':
      '[Zróbmy wyścig] {przeciwko} asystentowi',
    '[Corre una carrera] {fácil} de {5 vueltas}':
      '[Zorganizuj wyścig]: {łatwy}, {5 okrążeń}',
    '[Quiero montar] el {tren}':
      '[Chcę przejechać się] {pociągiem}',
    '[Quiero montar] la {montaña rusa}':
      '[Chcę przejechać się] {kolejką górską}',
    '[Llévame] a la {meta}':
      '[Zabierz mnie] na {metę}',
    '[Juguemos] {paintball}':
      '[Zagrajmy] w {paintball}',
    '[Juguemos paintball] {2v2}':
      '[Zagrajmy w paintball] {2 na 2}',
    '[Reta] a {Luna} a un paintball {1v1}':
      '[Wyzwij] {Lunę} na paintball {1 na 1}',
    '[Paintball] campal en {difícil}':
      '[Paintball] każdy na każdego, poziom {trudny}',
    '[Sal] del {paintball}':
      '[Wyjdź] z {paintballa}',
    '[Pon] una {cancha de fútbol}':
      '[Postaw] {boisko do piłki nożnej}',
    '[Pon] una {cancha de tenis} {azul}':
      '[Postaw] {niebieski} {kort tenisowy}',
    '[Crea] una {cancha de básquet}':
      '[Stwórz] {boisko do koszykówki}',
    '[Pon] un {campo de béisbol}':
      '[Postaw] {boisko do baseballu}',
    '[Llévame] a la {cancha}':
      '[Zabierz mnie] na {boisko}',
    '[Abre] la {agenda de hoy}':
      '[Otwórz] {plan na dziś}',
    '[Abre] {mi semana}':
      '[Otwórz] {mój tydzień}',
    '[Abre] el {cronograma}':
      '[Otwórz] {harmonogram}',
    '[Crea una rutina] de mañana: {agua, estiramiento y gratitud} a las {7:00}':
      '[Stwórz rutynę] poranną: {woda, rozciąganie i wdzięczność} o {7:00}',
    '[Crea una rutina] de {lunes y miércoles}: {correr 20 min}':
      '[Stwórz rutynę] na {poniedziałek i środę}: {bieganie 20 min}',
    '[Enséñame] las {rutinas}':
      '[Pokaż mi] {rutyny}',
    '[Crea un cuarto] llamado {Estudio}':
      '[Stwórz pokój] o nazwie {Pracownia}',
    '[Renombra] la {cocina} a {Oficina}':
      '[Zmień nazwę] {kuchni} na {Biuro}',
    '[Cambia el ícono] de la {cocina} a {🍳}':
      '[Zmień ikonę] {kuchni} na {🍳}',
    '[Pon] la {cocina} en categoría {cuerpo}':
      '[Umieść] {kuchnię} w kategorii {ciało}',
    '[Agrega] la {biblioteca} al mapa':
      '[Dodaj] {bibliotekę} do mapy',
    '[Elimina] la {cocina}':
      '[Usuń] {kuchnię}',
    '[Abre] la {cocina}':
      '[Otwórz] {kuchnię}',
    '[Pinta] la {cocina} de {azul}':
      '[Pomaluj] {kuchnię} na {niebiesko}',
    '[Piso] de la {cocina} de {madera}':
      '{Drewniana} [podłoga] w {kuchni}',
    '[Piso] de la {cocina} {rojo}':
      '{Czerwona} [podłoga] w {kuchni}',
    '[Techo] de la {cocina} de {tejas rojas}':
      '[Dach] {kuchni} z {czerwonej dachówki}',
    '[Techo a dos aguas] en la {cocina}':
      '[Dach dwuspadowy] w {kuchni}',
    '[Haz] la {cocina} {redonda}':
      '[Zrób] {kuchnię} {okrągłą}',
    '[Agranda] la {cocina}':
      '[Powiększ] {kuchnię}',
    '[Encoge] la {cocina}':
      '[Zmniejsz] {kuchnię}',
    '[Mueve] la {cocina} a la {derecha}':
      '[Przesuń] {kuchnię} w {prawo}',
    '[Abre el muro] {norte} de la {cocina}':
      '[Otwórz ścianę] {północną} {kuchni}',
    '[Pon una puerta] {corredera} en el muro {sur} de la {cocina}':
      '[Postaw drzwi] {przesuwne} w ścianie {południowej} {kuchni}',
    '[Pon] {ladrillo} en el muro {este} de la {cocina}':
      '[Postaw] {cegłę} na ścianie {wschodniej} {kuchni}',
    '[Haz más grueso] el muro {norte} de la {cocina}':
      '[Pogrub] ścianę {północną} {kuchni}',
    '[Apila] la {sala} sobre la {cocina}':
      '[Postaw] {salon} nad {kuchnią}',
    '[Agranda el mapa] hacia el {este}':
      '[Powiększ mapę] w kierunku {wschodnim}',
    '[Crea] una {lámpara}':
      '[Stwórz] {lampę}',
    '[Pinta el último objeto] de {rojo}':
      '[Pomaluj ostatni obiekt] na {czerwono}',
    '[Gira el último objeto]':
      '[Obróć ostatni obiekt]',
    '[Haz el último objeto] más {grande}':
      '[Zrób ostatni obiekt] {większym}',
    '[Agrupa los objetos] de la {cocina}':
      '[Zgrupuj obiekty] {kuchni}',
    '[Quita el último objeto]':
      '[Usuń ostatni obiekt]',
    '[Genera en 3D] {un dragón morado}':
      '[Wygeneruj w 3D] {fioletowego smoka}',
    '[Genera en 3D] {una fuente de piedra} estilo {minimalista}':
      '[Wygeneruj w 3D] {kamienną fontannę} w stylu {minimalistycznym}',
    '[Crea una imagen] de {un atardecer en la playa}':
      '[Stwórz obraz] {zachodu słońca na plaży}',
    '[Ponme] {sombrero} {rojo}':
      '[Załóż mi] {czerwony} {kapelusz}',
    '[Quítame] los {lentes}':
      '[Zdejmij mi] {okulary}',
    '[Pinta el torso] del [avatar] de {verde}':
      '[Pomaluj tułów] [postaci] na {zielono}',
    '[Haz el avatar] más {grande}':
      '[Zrób postać] {większą}',
    '[Móntame] en la {bici}':
      '[Posadź mnie] na {rowerze}',
    '[Quiero conducir] el {auto}':
      '[Chcę prowadzić] {samochód}',
    '[Bájame]':
      '[Zsadź mnie]',
    '[Vista en] {primera persona}':
      '[Widok] {pierwszoosobowy}',
    '[Vista] {isométrica}':
      '{Izometryczny} [widok]',
    '[Cambia el tema] a {navidad}':
      '[Zmień motyw] na {Boże Narodzenie}',
    '[Fondo] {nieve}':
      '[Tło] {śnieg}',
    '[Quita el tema]':
      '[Usuń motyw]',
    '[Pon música] {relajante}':
      '[Włącz muzykę] {relaksacyjną}',
    '[Música] {chiptune}':
      '[Muzyka] {chiptune}',
    '[Volumen] al {40%}':
      '[Głośność] na {40%}',
    '[Apaga la música]':
      '[Wyłącz muzykę]',
    '[Abre] mi {resumen semanal}':
      '[Otwórz] moje {podsumowanie tygodnia}',
    '[Abre] mi {resumen mensual}':
      '[Otwórz] moje {podsumowanie miesiąca}',
    '[Modo] {oscuro}':
      '{Ciemny} [tryb]',
    '[Apariencia] {transparente}':
      '{Przezroczysty} [wygląd]',
    '[Cambia el idioma] a {inglés}':
      '[Zmień język] na {angielski}',
    '[Tema de interfaz] {neón}':
      '[Motyw interfejsu] {neon}',
    '[Tipografía] {serif}':
      '[Typografia] {szeryfowa}',
    '[Pon iconos] {profesionales}':
      '[Ustaw ikony] {profesjonalne}',
    '[Transparencia] al {40%}':
      '[Przezroczystość] na {40%}',
    '[Estilo] {cómic}':
      '[Styl] {komiksowy}',
    '[Apaga los efectos]':
      '[Wyłącz efekty]',
    '[Avísame] de mis {rutinas}':
      '[Powiadamiaj mnie] o moich {rutynach}',
    '[Avísame de mis metas] a las {21:00}':
      '[Powiadamiaj mnie o moich celach] o {21:00}',
    '[Apaga los avisos]':
      '[Wyłącz powiadomienia]',
    '[Descarga un respaldo] de mis datos':
      '[Pobierz kopię zapasową] moich danych',
    '[Vuelve a ver la bienvenida]':
      '[Pokaż powitanie] jeszcze raz',
    '[Abre las configuraciones]':
      '[Otwórz ustawienia]',
    '[Abre] mi {cuenta}':
      '[Otwórz] moje {konto}',
    '[Recuerda que] {soy vegetariano}':
      '[Zapamiętaj, że] {jestem wegetarianinem}',
    '[@]{cocina} {ensalada de la comida}':
      '[@]{cocina} {sałatka na obiad}',
    '[Cómo funciona] la {cocina}':
      '[Jak działa] {kuchnia}',
    '[Cómo funciona] el {editor}':
      '[Jak działa] {edytor}',
    '[Cómo funciona] la {rueda de herramientas}':
      '[Jak działa] {koło narzędzi}',
    '[Cómo funciona] el {chat}':
      '[Jak działa] {czat}',
    '[Qué hace] el {inventario}':
      '[Co robi] {ekwipunek}',
    '[Para qué sirve] la {cámara}':
      '[Do czego służy] {aparat}',
    '[Tutorial de] {ejercicio}':
      '[Samouczek o] {siłowni}',
    '[Tutorial de] la {biblioteca}':
      '[Samouczek o] {bibliotece}',
    '[Tutorial] {general}':
      '{Ogólny} [samouczek]',
  },
  atajos: {
    'Caminar (también con las flechas)':
      'Chodzenie (także strzałkami)',
    'Correr (se queda puesto hasta volver a pulsar)':
      'Bieganie (zostaje włączone do ponownego naciśnięcia)',
    'Saltar':
      'Skok',
    'Agacharse (mantener pulsado)':
      'Kucanie (przytrzymaj)',
    'Lo que tengas delante: entrar al cuarto, subirte o bajarte del vehículo, cambiar de nivel':
      'To, co masz przed sobą: wejście do pokoju, wsiadanie lub wysiadanie z pojazdu, zmiana poziomu',
    'Levantar la mano derecha / izquierda':
      'Podniesienie prawej / lewej ręki',
    'Bailar':
      'Taniec',
    'Mortal':
      'Salto',
    'Abrir la rueda de herramientas':
      'Otwieranie koła narzędzi',
    'Abrir el chat y escribir':
      'Otwieranie czatu i pisanie',
    'Cambiar de vista: isométrica, tercera y primera persona':
      'Zmiana widoku: izometryczny, trzecia i pierwsza osoba',
    'Esconder o mostrar el HUD':
      'Ukrywanie lub pokazywanie HUD-u',
    'Cerrar lo que esté abierto':
      'Zamknięcie tego, co jest otwarte',
    'Conduciendo el OVNI: subir y bajar. En los demás vehículos, Espacio derrapa':
      'Podczas prowadzenia UFO: wznoszenie i opadanie. W pozostałych pojazdach Spacja to poślizg',
  },
  teclas: {
    'Mayús': 'Shift',
    'Espacio': 'Spacja',
    'Espacio · Mayús': 'Spacja · Shift',
  },
}
