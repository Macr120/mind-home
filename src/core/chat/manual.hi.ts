import type { ManualTraducido } from './manualI18n'

/**
 * Las frases de ejemplo del manual de comandos en hindi, indexadas por
 * su texto español de origen (ver `manualI18n.ts`).
 *
 * Registro: imperativo cortés de «आप» (करें/खोलें/जोड़ें), no el «तू»/«तुम» del
 * glosario general de la interfaz pero SÍ su misma persona («आप»): es la forma
 * corta que usan los asistentes de voz en hindi para una orden («रोशनी चालू
 * करें»). Los comandos de logging en primera persona (Comí, Dormí, Gasté…) NO
 * se tradujeron con el verbo conjugado del hablante: el hindi marca género en
 * el pasado intransitivo/reflexivo (सोया/सोई, गया/गई) y asumiríamos el del
 * usuario. Se resolvieron con etiquetas nominales («नींद:», «वज़न:», «खर्च:»),
 * igual que ya hace `glosario.mjs` con la arroba de «Pep@». Donde el verbo
 * transitivo con «ने» concuerda con el objeto (खाया con चावल, देखी con फ़िल्म)
 * no hay ambigüedad de género y se dejó el verbo.
 */
export const MANUAL_HI: ManualTraducido = {
  frases: {
    '[Comí] {pollo con arroz} en la {cena}':
      '[भोजन]: {डिनर में} {चावल के साथ चिकन}',
    '[Tomé] {2 vasos} de [agua]':
      '[पिया] {2 गिलास} [पानी]',
    '[Me pesé]: {74 kg}':
      '[वज़न]: {74 किग्रा}',
    '[Abre] el {recetario}':
      '[खोलें] {रेसिपी बुक}',
    '[Abre] la {lista del súper}':
      '[खोलें] {किराने की लिस्ट}',
    '[Abre] el {diario de comidas}':
      '[खोलें] {खाने की डायरी}',
    '[Abre] la {dieta}':
      '[खोलें] {डाइट}',
    '[Abre] las {metas de nutrición}':
      '[खोलें] {पोषण के लक्ष्य}',
    'Inventa una [receta] {ligera con atún}':
      '{टूना वाली हल्की} [रेसिपी] बनाएं',
    'Arma una [dieta] {alta en proteína}':
      '{हाई प्रोटीन} [डाइट] बनाएं',
    'Agrega {plátano y avena} a la [lista del súper]':
      '[किराने की लिस्ट] में {केला और ओट्स} जोड़ें',
    '[Entrené] {pierna} {45 min}':
      '[वर्कआउट]: {पैर} {45 मिनट}',
    '[Corrí] {5 km}':
      '[दौड़]: {5 किमी}',
    '[Abre] el {plan de ejercicio}':
      '[खोलें] {वर्कआउट प्लान}',
    '[Abre] {fuerza}':
      '[खोलें] {स्ट्रेंथ}',
    '[Abre] {cardio}':
      '[खोलें] {कार्डियो}',
    '[Abre] {flexibilidad}':
      '[खोलें] {लचीलापन}',
    '[Abre] las {metas de ejercicio}':
      '[खोलें] {वर्कआउट के लक्ष्य}',
    'Registra mi sesión: {crossfit 40 min, intensidad alta}':
      'सेशन दर्ज करें: {क्रॉसफ़िट 40 मिनट, हाई इंटेंसिटी}',
    '[Dormí] {7 horas}, calidad {4/5}':
      '[नींद]: {7 घंटे}, क्वालिटी {4/5}',
    '[Abre] el {despertador}':
      '[खोलें] {अलार्म}',
    '[Abre] {mi sueño}':
      '[खोलें] {मेरी नींद}',
    '{Me acosté a las 23, desperté a las 7 y me levanté 2 veces}':
      '{सोने का समय 23:00, उठने का समय 7:00, बीच में जागना — 2 बार}',
    '[Recuerdo]: {tarde de juegos con mi hermana}':
      '[याद]: {बहन के साथ गेम्स की शाम}',
    '[Abre] mis {anécdotas}':
      '[खोलें] मेरी {यादें}',
    '[Abre] el {calendario de ánimo}':
      '[खोलें] {मूड कैलेंडर}',
    'Anota esta anécdota: {hoy celebramos el cumple de mamá}':
      'यह याद लिखें: {आज मम्मी के जन्मदिन का जश्न मनाया}',
    '[Gasté] {500} en {el súper}':
      '[खर्च]: {500} {सुपरमार्केट में}',
    '[Cobré] {8000} de {la quincena}':
      '[आमदनी]: {पखवाड़े की तनख्वाह से} {8000}',
    '[Abre] el {balance}':
      '[खोलें] {बैलेंस}',
    '[Abre] los {gastos fijos}':
      '[खोलें] {फिक्स्ड खर्च}',
    '[Abre] los {movimientos}':
      '[खोलें] {लेन-देन}',
    '[Abre] las {metas de ahorro}':
      '[खोलें] {बचत के लक्ष्य}',
    '[Abre] las {divisas}':
      '[खोलें] {विदेशी मुद्रा}',
    '[Abre] las {criptomonedas}':
      '[खोलें] {क्रिप्टोकरेंसी}',
    '[Abre] las {materias primas}':
      '[खोलें] {कमोडिटीज़}',
    '{Pagué 250 de luz y 180 de agua}':
      '{भुगतान: बिजली के लिए 250 और पानी के लिए 180}',
    '[Abre] el {formulario}':
      '[खोलें] {फ़ॉर्मूला बुक}',
    '[Abre] la {calculadora}':
      '[खोलें] {कैलकुलेटर}',
    '[Abre] el {graficador}':
      '[खोलें] {ग्राफ प्लॉटर}',
    '[Abre] las {hojas de cálculo}':
      '[खोलें] {स्प्रेडशीट}',
    '[Resolver ecuación]':
      '[समीकरण हल करें]',
    '[Convertir unidades]':
      '[यूनिट कन्वर्ट करें]',
    '[Abre] las {matrices}':
      '[खोलें] {मैट्रिक्स}',
    '[Sistema de ecuaciones]':
      '[समीकरण सिस्टम]',
    '[Convertir a binario]':
      '[बाइनरी में बदलें]',
    '[Propina]':
      '[टिप]',
    '[Regla de tres]':
      '[त्रैराशिक]',
    '[Estudié] {historia romana} {30 min}':
      '[पढ़ाई]: {रोमन इतिहास} {30 मिनट}',
    '[Abre] las {charlas}':
      '[खोलें] {चैट्स}',
    '[Abre] la {enciclopedia}':
      '[खोलें] {विश्वकोश}',
    '[Abre] la {sesión de estudio}':
      '[खोलें] {स्टडी सेशन}',
    '[Abre] el {resumen de estudio}':
      '[खोलें] {स्टडी समरी}',
    'Apunta que aprendí: {los ríos de Europa}':
      'याद के तौर पर दर्ज करें: {यूरोप की नदियां}',
    '[Vi la película] {Dune}':
      '[देखी फ़िल्म]: {ड्यून}',
    '[Jugué] {ajedrez} con mi hermano':
      '[खेला]: भाई के साथ {शतरंज}',
    '[Abre] el {archivo}':
      '[खोलें] {आर्काइव}',
    '[Abre] la {mesa de juegos}':
      '[खोलें] {गेम टेबल}',
    '[Quiero jugar] la {viborita}':
      '[खेलना है] {स्नेक गेम}',
    '[Juega] {tetris}':
      '[खेलें] {टेट्रिस}',
    '[Juega] una partida de {ajedrez}':
      '[खेलें] {शतरंज} की एक बाज़ी',
    'Apunta {la serie Dark} como pendiente':
      '{डार्क सीरीज़} को देखने की लिस्ट में डालें',
    '[Abre] el {mapamundi}':
      '[खोलें] {विश्व मानचित्र}',
    '[Abre] {por conocer}':
      '[खोलें] {घूमने की इच्छा-सूची}',
    '[Abre] las {rutas}':
      '[खोलें] {रूट्स}',
    '[Abre] la {bitácora de viajes}':
      '[खोलें] {सफ़रनामा}',
    '[Visité] {Oaxaca}':
      '[यात्रा]: {ओआहाका}',
    'Quiero conocer {Japón}':
      '{जापान} घूमने की इच्छा है',
    '[Visité] {Roma}: {la fontana de noche es mágica}':
      '[यात्रा]: {रोम}: {रात में फव्वारा जादुई लगता है}',
    '[Medité] {10 min}':
      '[ध्यान]: {10 मिनट}',
    '[@]{jardin} [agradezco] {mi salud, mi familia y el café}':
      '[@]{jardin} [आभार] {सेहत, परिवार और कॉफ़ी के लिए}',
    '[Abre] la {meditación}':
      '[खोलें] {ध्यान}',
    '[Abre] la {respiración}':
      '[खोलें] {सांस लेने का अभ्यास}',
    '[Abre] los {agradecimientos}':
      '[खोलें] {आभार}',
    'Cambié el [aceite] del {auto}':
      '{कार} का [तेल] बदला',
    '[Abre] el {resumen del garage}':
      '[खोलें] {गैराज समरी}',
    '[Abre] {mis vehículos}':
      '[खोलें] {मेरे वाहन}',
    '[Abre] los {titulares}':
      '[खोलें] {हेडलाइंस}',
    '[Abre] las {efemérides}':
      '[खोलें] {आज का इतिहास}',
    'Avancé en mi [proyecto] de {acuarela} {40 min}':
      '{वॉटरकलर} [प्रोजेक्ट] में प्रोग्रेस: {40 मिनट}',
    'Practiqué {guitarra} {25 min}':
      '{गिटार} प्रैक्टिस: {25 मिनट}',
    '[Abre] {mis hobbies}':
      '[खोलें] {मेरे शौक}',
    '[Abre] mis {mapas mentales}':
      '[खोलें] मेरे {माइंड मैप्स}',
    '[Abre] los {mapas conceptuales}':
      '[खोलें] {कॉन्सेप्ट मैप्स}',
    '[Hazme un mapa mental] de {la fotosíntesis}':
      '{फोटोसिंथेसिस} पर [माइंड मैप बनाएं]',
    '[Dibuja un diagrama de flujo] de {cómo hacer pan}':
      '{ब्रेड बनाने का} [फ़्लोचार्ट बनाएं]',
    '[Compara] {café} y {té} en un mapa':
      'मैप में {कॉफ़ी} और {चाय} की [तुलना करें]',
    '[Haz un esquema] de {lo que me acabas de explicar}':
      '{अभी बताई गई बात} का [डायग्राम बनाएं]',
    '[Agenda] una {junta con el cliente} el {martes a las 10}':
      '{मंगलवार 10 बजे} {क्लाइंट मीटिंग} [शेड्यूल करें]',
    '[Apunta el pendiente] {mandar la cotización}':
      '[टास्क जोड़ें] {कोटेशन भेजना}',
    '[Tengo cita] con el {dentista} el {14 a las 5}':
      '[अपॉइंटमेंट]: {दंत चिकित्सक}, {14 तारीख़, शाम 5 बजे}',
    '[Recuérdame] tomar {ibuprofeno} a las {8 y a las 20}':
      '{8 और 20 बजे} {इबुप्रोफ़ेन} लेने के लिए [याद दिलाएं]',
    '[Guarda el contacto] de {Ana}: {5512345678}, cumple el {3 de mayo}':
      '[कॉन्टैक्ट सेव करें]: {आना}, {5512345678}, जन्मदिन {3 मई}',
    '[Abre] mis {pendientes}':
      '[खोलें] मेरे {टास्क}',
    '[Abre] mis {citas médicas}':
      '[खोलें] मेरी {डॉक्टर अपॉइंटमेंट्स}',
    '[Abre] mis {contactos}':
      '[खोलें] मेरे {कॉन्टैक्ट्स}',
    '[Vocab] {inglés}: {dog} = {perro}':
      '[शब्द] {अंग्रेज़ी}: {dog} = {कुत्ता}',
    '[Repasé] {francés} {15 min}':
      '[रिवीज़न]: {फ़्रेंच} {15 मिनट}',
    '[Abre] el {tutor}':
      '[खोलें] {ट्यूटर}',
    '[Abre] el {repaso}':
      '[खोलें] {रिवीज़न}',
    '[Abre] el {temario}':
      '[खोलें] {सिलेबस}',
    '[Abre] el {progreso de idiomas}':
      '[खोलें] {भाषा प्रगति}',
    'Aprendí en {alemán}: {Hund} = {perro}':
      '{जर्मन} में नई सीख: {Hund} = {कुत्ता}',
    '[Construye] un {huerto}':
      '{सब्ज़ी बगीचा} [बनाएं]',
    '[Quiero sembrar] {zanahorias}':
      '{गाजर} [बोनी है]',
    '[Siembra] {maíz} en el huerto':
      'बगीचे में {मक्का} [बोएं]',
    '[Pon] un {aspersor} en el huerto':
      'बगीचे में {स्प्रिंकलर} [लगाएं]',
    '[Riega] el {huerto}':
      '{बगीचे} में [पानी दें]',
    '[Cosecha] el {huerto}':
      '{बगीचे} की [फ़सल काटें]',
    '[Llévame] al {huerto}':
      'मुझे {बगीचे} तक [ले चलें]',
    '[Haz] un {corral}':
      '{बाड़ा} [बनाएं]',
    '[Pon] {vacas} en la granja':
      'फ़ार्म में {गायें} [रखें]',
    '[Alimenta] a los {animales}':
      '{जानवरों} को [खाना दें]',
    '[Mima] a los {animales}':
      '{जानवरों} को [दुलारें]',
    '[Cura] a los {animales}':
      '{जानवरों} का [इलाज करें]',
    '[Limpia] los {corrales}':
      '{बाड़ों} को [साफ़ करें]',
    '[Llévame] a la {granja}':
      'मुझे {फ़ार्म} तक [ले चलें]',
    '[Pon] una {pista de carreras}':
      '{रेस ट्रैक} [बनाएं]',
    '[Traza] las {vías del tren}':
      '{रेल की पटरियां} [बिछाएं]',
    '[Construye] una {montaña rusa}':
      '{रोलर कोस्टर} [बनाएं]',
    '[Pon] la {meta} de la pista':
      'ट्रैक की {फ़िनिश लाइन} [तय करें]',
    '[Borra] la {pista}':
      '{ट्रैक} [मिटाएं]',
    '[Corre una carrera] de {3 vueltas}':
      '{3 चक्कर} की [रेस लगाएं]',
    '[Hagamos una carrera] {contra} un asistente':
      'सहायक के {ख़िलाफ़} [रेस लगाते हैं]',
    '[Corre una carrera] {fácil} de {5 vueltas}':
      '{5 चक्कर} की {आसान} [रेस लगाएं]',
    '[Quiero montar] el {tren}':
      '{ट्रेन} पर [चढ़ना है]',
    '[Quiero montar] la {montaña rusa}':
      '{रोलर कोस्टर} पर [चढ़ना है]',
    '[Llévame] a la {meta}':
      'मुझे {फ़िनिश लाइन} तक [ले चलें]',
    '[Juguemos] {paintball}':
      '{पेंटबॉल} [खेलते हैं]',
    '[Juguemos paintball] {2v2}':
      '{2 बनाम 2} [पेंटबॉल खेलते हैं]',
    '[Reta] a {Luna} a un paintball {1v1}':
      '{लूना} को {1 बनाम 1} पेंटबॉल के लिए [चुनौती दें]',
    '[Paintball] campal en {difícil}':
      '{मुश्किल} स्तर पर सामूहिक [पेंटबॉल]',
    '[Sal] del {paintball}':
      '{पेंटबॉल} से [बाहर निकलें]',
    '[Pon] una {cancha de fútbol}':
      '{फ़ुटबॉल मैदान} [बनाएं]',
    '[Pon] una {cancha de tenis} {azul}':
      '{नीला} {टेनिस कोर्ट} [बनाएं]',
    '[Crea] una {cancha de básquet}':
      '{बास्केटबॉल कोर्ट} [बनाएं]',
    '[Pon] un {campo de béisbol}':
      '{बेसबॉल मैदान} [बनाएं]',
    '[Llévame] a la {cancha}':
      'मुझे {मैदान} तक [ले चलें]',
    '[Abre] la {agenda de hoy}':
      '[खोलें] {आज का एजेंडा}',
    '[Abre] {mi semana}':
      '[खोलें] {मेरा हफ़्ता}',
    '[Abre] el {cronograma}':
      '[खोलें] {समय-सारणी}',
    '[Crea una rutina] de mañana: {agua, estiramiento y gratitud} a las {7:00}':
      '[रूटीन बनाएं] सुबह की: {पानी, स्ट्रेचिंग और आभार}, {7:00} बजे',
    '[Crea una rutina] de {lunes y miércoles}: {correr 20 min}':
      '{सोमवार और बुधवार} की [रूटीन बनाएं]: {20 मिनट दौड़ना}',
    '[Enséñame] las {rutinas}':
      '{रूटीन} [दिखाएं]',
    '[Crea un cuarto] llamado {Estudio}':
      '{स्टूडियो} नाम से [कमरा बनाएं]',
    '[Renombra] la {cocina} a {Oficina}':
      '{रसोई} का नाम {ऑफ़िस} [करें]',
    '[Cambia el ícono] de la {cocina} a {🍳}':
      '{रसोई} का [आइकन बदलें] {🍳}',
    '[Pon] la {cocina} en categoría {cuerpo}':
      '{रसोई} को {शरीर} कैटेगरी में [रखें]',
    '[Agrega] la {biblioteca} al mapa':
      'मानचित्र में {पुस्तकालय} [जोड़ें]',
    '[Elimina] la {cocina}':
      '{रसोई} [हटाएं]',
    '[Abre] la {cocina}':
      '[खोलें] {रसोई}',
    '[Pinta] la {cocina} de {azul}':
      '{रसोई} को {नीला} [रंगें]',
    '[Piso] de la {cocina} de {madera}':
      '{रसोई} का [फ़र्श] {लकड़ी} का',
    '[Piso] de la {cocina} {rojo}':
      '{रसोई} का [फ़र्श] {लाल}',
    '[Techo] de la {cocina} de {tejas rojas}':
      '{रसोई} की [छत] {लाल टाइलों} की',
    '[Techo a dos aguas] en la {cocina}':
      '{रसोई} में [ढलवां छत]',
    '[Haz] la {cocina} {redonda}':
      '{रसोई} को {गोल} [बनाएं]',
    '[Agranda] la {cocina}':
      '{रसोई} [बड़ी करें]',
    '[Encoge] la {cocina}':
      '{रसोई} [छोटी करें]',
    '[Mueve] la {cocina} a la {derecha}':
      '{रसोई} को {दाईं ओर} [खिसकाएं]',
    '[Abre el muro] {norte} de la {cocina}':
      '{रसोई} की {उत्तर} दीवार [खोलें]',
    '[Pon una puerta] {corredera} en el muro {sur} de la {cocina}':
      '{रसोई} की {दक्षिण} दीवार में {स्लाइडिंग} [दरवाज़ा लगाएं]',
    '[Pon] {ladrillo} en el muro {este} de la {cocina}':
      '{रसोई} की {पूर्व} दीवार पर {ईंट} [लगाएं]',
    '[Haz más grueso] el muro {norte} de la {cocina}':
      '{रसोई} की {उत्तर} दीवार [मोटी करें]',
    '[Apila] la {sala} sobre la {cocina}':
      '{रसोई} के ऊपर {बैठक} [रखें]',
    '[Agranda el mapa] hacia el {este}':
      '{पूर्व} की ओर [मानचित्र बड़ा करें]',
    '[Crea] una {lámpara}':
      '{लैंप} [बनाएं]',
    '[Pinta el último objeto] de {rojo}':
      '[आख़िरी ऑब्जेक्ट रंगें] {लाल}',
    '[Gira el último objeto]':
      '[आख़िरी ऑब्जेक्ट घुमाएं]',
    '[Haz el último objeto] más {grande}':
      '[आख़िरी ऑब्जेक्ट] {बड़ा करें}',
    '[Agrupa los objetos] de la {cocina}':
      '{रसोई} के [ऑब्जेक्ट्स ग्रुप करें]',
    '[Quita el último objeto]':
      '[आख़िरी ऑब्जेक्ट हटाएं]',
    '[Genera en 3D] {un dragón morado}':
      '{बैंगनी ड्रैगन} [3D में बनाएं]',
    '[Genera en 3D] {una fuente de piedra} estilo {minimalista}':
      '{पत्थर का फ़व्वारा}, {मिनिमलिस्ट} स्टाइल में [3D में बनाएं]',
    '[Crea una imagen] de {un atardecer en la playa}':
      '{समुद्र तट पर सूर्यास्त} की [इमेज बनाएं]',
    '[Ponme] {sombrero} {rojo}':
      'मुझे {लाल} {टोपी} [पहनाएं]',
    '[Quítame] los {lentes}':
      'मेरे {चश्मे} [उतारें]',
    '[Pinta el torso] del [avatar] de {verde}':
      '[अवतार] का [धड़ रंगें] {हरा}',
    '[Haz el avatar] más {grande}':
      '[अवतार] {बड़ा करें}',
    '[Móntame] en la {bici}':
      'मुझे {साइकिल} पर [बिठाएं]',
    '[Quiero conducir] el {auto}':
      '{कार} [चलानी है]',
    '[Bájame]':
      '[मुझे उतारें]',
    '[Vista en] {primera persona}':
      '{फ़र्स्ट पर्सन} [व्यू]',
    '[Vista] {isométrica}':
      '{आइसोमेट्रिक} [व्यू]',
    '[Cambia el tema] a {navidad}':
      '[थीम बदलें] {क्रिसमस} में',
    '[Fondo] {nieve}':
      '[बैकग्राउंड] {बर्फ़}',
    '[Quita el tema]':
      '[थीम हटाएं]',
    '[Pon música] {relajante}':
      '{रिलैक्सिंग} [म्यूज़िक चलाएं]',
    '[Música] {chiptune}':
      '[म्यूज़िक] {चिपट्यून}',
    '[Volumen] al {40%}':
      '[वॉल्यूम] {40%}',
    '[Apaga la música]':
      '[म्यूज़िक बंद करें]',
    '[Abre] mi {resumen semanal}':
      '[खोलें] मेरा {साप्ताहिक सारांश}',
    '[Abre] mi {resumen mensual}':
      '[खोलें] मेरा {मासिक सारांश}',
    '[Modo] {oscuro}':
      '{डार्क} [मोड]',
    '[Apariencia] {transparente}':
      '{पारदर्शी} [लुक]',
    '[Cambia el idioma] a {inglés}':
      '[भाषा बदलें] {अंग्रेज़ी} में',
    '[Tema de interfaz] {neón}':
      '[इंटरफ़ेस थीम] {नियॉन}',
    '[Tipografía] {serif}':
      '[फ़ॉन्ट] {सेरिफ़}',
    '[Pon iconos] {profesionales}':
      '{प्रोफ़ेशनल} [आइकन लगाएं]',
    '[Transparencia] al {40%}':
      '[पारदर्शिता] {40%}',
    '[Estilo] {cómic}':
      '[स्टाइल] {कॉमिक}',
    '[Apaga los efectos]':
      '[इफ़ेक्ट्स बंद करें]',
    '[Avísame] de mis {rutinas}':
      'मेरी {रूटीन} के लिए [सूचित करें]',
    '[Avísame de mis metas] a las {21:00}':
      '{21:00} बजे [मेरे लक्ष्यों की याद दिलाएं]',
    '[Apaga los avisos]':
      '[नोटिफ़िकेशन बंद करें]',
    '[Descarga un respaldo] de mis datos':
      'मेरे डेटा का [बैकअप डाउनलोड करें]',
    '[Vuelve a ver la bienvenida]':
      '[स्वागत स्क्रीन फिर से दिखाएं]',
    '[Abre las configuraciones]':
      '[सेटिंग्स खोलें]',
    '[Abre] mi {cuenta}':
      '[खोलें] मेरा {अकाउंट}',
    '[Recuerda que] {soy vegetariano}':
      '[याद रखें कि] {मैं शाकाहारी हूं}',
    '[@]{cocina} {ensalada de la comida}':
      '[@]{cocina} {लंच में सलाद}',
    '[Cómo funciona] la {cocina}':
      '{रसोई} [कैसे काम करती है]',
    '[Cómo funciona] el {editor}':
      '{एडिटर} [कैसे काम करता है]',
    '[Cómo funciona] la {rueda de herramientas}':
      '{टूल व्हील} [कैसे काम करता है]',
    '[Cómo funciona] el {chat}':
      '{चैट} [कैसे काम करता है]',
    '[Qué hace] el {inventario}':
      '{इन्वेंट्री} [क्या करती है]',
    '[Para qué sirve] la {cámara}':
      '{कैमरा} [किस काम आता है]',
    '[Tutorial de] {ejercicio}':
      '{जिम} का [ट्यूटोरियल]',
    '[Tutorial de] la {biblioteca}':
      '{पुस्तकालय} का [ट्यूटोरियल]',
    '[Tutorial] {general}':
      '{सामान्य} [ट्यूटोरियल]',
  },
  atajos: {
    'Caminar (también con las flechas)':
      'चलना (एरो कीज़ से भी)',
    'Correr (se queda puesto hasta volver a pulsar)':
      'दौड़ना (दोबारा दबाने तक चालू रहता है)',
    'Saltar':
      'कूदना',
    'Agacharse (mantener pulsado)':
      'झुकना (दबाए रखें)',
    'Lo que tengas delante: entrar al cuarto, subirte o bajarte del vehículo, cambiar de nivel':
      'आपके सामने जो भी है: कमरे में जाना, वाहन में बैठना या उतरना, मंज़िल बदलना',
    'Levantar la mano derecha / izquierda':
      'दायां / बायां हाथ उठाना',
    'Bailar':
      'नाचना',
    'Mortal':
      'कलाबाज़ी',
    'Abrir la rueda de herramientas':
      'टूल व्हील खोलना',
    'Abrir el chat y escribir':
      'चैट खोलकर लिखना',
    'Cambiar de vista: isométrica, tercera y primera persona':
      'व्यू बदलना: आइसोमेट्रिक, थर्ड पर्सन और फ़र्स्ट पर्सन',
    'Esconder o mostrar el HUD':
      'HUD छिपाना या दिखाना',
    'Cerrar lo que esté abierto':
      'जो भी खुला हो उसे बंद करना',
    'Conduciendo el OVNI: subir y bajar. En los demás vehículos, Espacio derrapa':
      'UFO चलाते समय: ऊपर-नीचे जाना। बाकी वाहनों में स्पेस से स्किड होता है',
  },
  teclas: {
    'Mayús': 'Shift',
    'Espacio': 'स्पेस',
    'Espacio · Mayús': 'स्पेस · Shift',
  },
}
