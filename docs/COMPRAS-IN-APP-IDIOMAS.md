# Compras dentro de la app: textos en los 16 idiomas

Para pegar a mano en **App Store Connect** (cada producto → Localización de App Store) y en
**Google Play Console** (Monetizar → Productos; el nombre y la descripción de cada producto o
suscripción por idioma). Hoy solo existe la localización en-US (`ios/App/MPHProducts.storekit`),
así que fuera del inglés la tienda enseña los productos en inglés.

- Topes de Apple: nombre visible 30 caracteres, descripción 45. Todos caben (lo comprueba el
  generador). Play admite más, así que sirven tal cual.
- El grupo de suscripción se llama «MindHaOS Pro» en todos los idiomas (es la marca).
- El inglés de «Pro yearly» se acortó: el del `.storekit` («…every month and sync, billed
  yearly») tiene 50 caracteres y Apple lo rechaza.
- Terminología: la misma que la app (`cuenta.uso.tituloLocal`: «créditos de IA», «KI-Credits»,
  «AIクレジット»…).

## Desbloqueo (pago único) · `com.macr120.mindhome.unlock_casa_v4`

| Idioma | Nombre | Descripción |
|---|---|---|
| en | The whole house, forever | Every app and your data, on your device |
| es | La casa entera, para siempre | Todas las apps y tus datos en tu equipo |
| pt | A casa inteira, para sempre | Todos os apps e seus dados no aparelho |
| fr | Toute la maison, pour toujours | Toutes les applis, tes données chez toi |
| de | Das ganze Haus, für immer | Alle Apps und deine Daten auf deinem Gerät |
| it | Tutta la casa, per sempre | Tutte le app e i tuoi dati sul dispositivo |
| ja | 家まるごと、ずっと | すべてのアプリとデータを端末に |
| zh | 整个家，永久拥有 | 所有应用和你的数据，都在你的设备上 |
| ko | 집 전체, 영원히 | 모든 앱과 데이터를 내 기기에 |
| ru | Весь дом навсегда | Все приложения и данные на устройстве |
| hi | पूरा घर, हमेशा के लिए | सारे ऐप और आपका डेटा, आपके डिवाइस पर |
| tr | Evin tamamı, sonsuza dek | Tüm uygulamalar ve verilerin cihazında |
| id | Seluruh rumah, selamanya | Semua aplikasi dan datamu di perangkat |
| pl | Cały dom na zawsze | Wszystkie aplikacje i dane na urządzeniu |
| nl | Het hele huis, voor altijd | Alle apps en je gegevens op je toestel |
| ar | البيت كله، إلى الأبد | كل التطبيقات وبياناتك على جهازك |

## Recarga de créditos (consumible) · `com.macr120.mindhome.creditos_x1`

| Idioma | Nombre | Descripción |
|---|---|---|
| en | 700 AI credits | 700 extra AI credits for this month |
| es | 700 créditos de IA | 700 créditos de IA extra para este mes |
| pt | 700 créditos de IA | 700 créditos de IA extras para este mês |
| fr | 700 crédits IA | 700 crédits IA en plus pour ce mois |
| de | 700 KI-Credits | 700 zusätzliche KI-Credits für diesen Monat |
| it | 700 crediti IA | 700 crediti IA in più per questo mese |
| ja | AIクレジット700 | 今月使えるAIクレジット700を追加 |
| zh | 700 AI点数 | 本月额外的700 AI点数 |
| ko | AI 크레딧 700 | 이번 달 추가 AI 크레딧 700 |
| ru | 700 кредитов ИИ | 700 доп. кредитов ИИ на этот месяц |
| hi | 700 एआई क्रेडिट | इस महीने के लिए 700 अतिरिक्त एआई क्रेडिट |
| tr | 700 yapay zeka kredisi | Bu ay için 700 ek yapay zeka kredisi |
| id | 700 kredit AI | 700 kredit AI tambahan untuk bulan ini |
| pl | 700 kredytów AI | 700 dodatkowych kredytów AI na ten miesiąc |
| nl | 700 AI-credits | 700 extra AI-credits voor deze maand |
| ar | 700 رصيد ذكاء اصطناعي | 700 رصيد ذكاء اصطناعي إضافي لهذا الشهر |

## Pro mensual · `com.macr120.mindhome.pro_x1_v2`

| Idioma | Nombre | Descripción |
|---|---|---|
| en | Pro | 700 AI credits every month and sync |
| es | Pro | 700 créditos de IA al mes y sincronización |
| pt | Pro | 700 créditos de IA por mês e sincronização |
| fr | Pro | 700 crédits IA par mois et la synchro |
| de | Pro | 700 KI-Credits pro Monat und Sync |
| it | Pro | 700 crediti IA al mese e sincronizzazione |
| ja | Pro | 毎月AIクレジット700と同期 |
| zh | Pro | 每月700 AI点数和同步 |
| ko | Pro | 매달 AI 크레딧 700과 동기화 |
| ru | Pro | 700 кредитов ИИ в месяц и синхронизация |
| hi | Pro | हर महीने 700 एआई क्रेडिट और सिंक |
| tr | Pro | Her ay 700 yapay zeka kredisi ve eşitleme |
| id | Pro | 700 kredit AI tiap bulan dan sinkronisasi |
| pl | Pro | 700 kredytów AI miesięcznie i synchronizacja |
| nl | Pro | 700 AI-credits per maand en synchronisatie |
| ar | Pro | 700 رصيد ذكاء اصطناعي شهريًا ومزامنة |

## Pro x2 mensual · `com.macr120.mindhome.pro_x2_v2`

| Idioma | Nombre | Descripción |
|---|---|---|
| en | Pro x2 | 1400 AI credits every month and sync |
| es | Pro x2 | 1400 créditos de IA al mes y sincronización |
| pt | Pro x2 | 1400 créditos de IA por mês e sincronização |
| fr | Pro x2 | 1400 crédits IA par mois et la synchro |
| de | Pro x2 | 1400 KI-Credits pro Monat und Sync |
| it | Pro x2 | 1400 crediti IA al mese e sincronizzazione |
| ja | Pro x2 | 毎月AIクレジット1400と同期 |
| zh | Pro x2 | 每月1400 AI点数和同步 |
| ko | Pro x2 | 매달 AI 크레딧 1400과 동기화 |
| ru | Pro x2 | 1400 кредитов ИИ в месяц и синхронизация |
| hi | Pro x2 | हर महीने 1400 एआई क्रेडिट और सिंक |
| tr | Pro x2 | Her ay 1400 yapay zeka kredisi ve eşitleme |
| id | Pro x2 | 1400 kredit AI tiap bulan dan sinkronisasi |
| pl | Pro x2 | 1400 kredytów AI miesięcznie i synchronizacja |
| nl | Pro x2 | 1400 AI-credits per maand en synchronisatie |
| ar | Pro x2 | 1400 رصيد ذكاء اصطناعي شهريًا ومزامنة |

## Pro x3 mensual · `com.macr120.mindhome.pro_x3_v2`

| Idioma | Nombre | Descripción |
|---|---|---|
| en | Pro x3 | 2100 AI credits every month and sync |
| es | Pro x3 | 2100 créditos de IA al mes y sincronización |
| pt | Pro x3 | 2100 créditos de IA por mês e sincronização |
| fr | Pro x3 | 2100 crédits IA par mois et la synchro |
| de | Pro x3 | 2100 KI-Credits pro Monat und Sync |
| it | Pro x3 | 2100 crediti IA al mese e sincronizzazione |
| ja | Pro x3 | 毎月AIクレジット2100と同期 |
| zh | Pro x3 | 每月2100 AI点数和同步 |
| ko | Pro x3 | 매달 AI 크레딧 2100과 동기화 |
| ru | Pro x3 | 2100 кредитов ИИ в месяц и синхронизация |
| hi | Pro x3 | हर महीने 2100 एआई क्रेडिट और सिंक |
| tr | Pro x3 | Her ay 2100 yapay zeka kredisi ve eşitleme |
| id | Pro x3 | 2100 kredit AI tiap bulan dan sinkronisasi |
| pl | Pro x3 | 2100 kredytów AI miesięcznie i synchronizacja |
| nl | Pro x3 | 2100 AI-credits per maand en synchronisatie |
| ar | Pro x3 | 2100 رصيد ذكاء اصطناعي شهريًا ومزامنة |

## Pro anual · `com.macr120.mindhome.pro_x1_anual`

| Idioma | Nombre | Descripción |
|---|---|---|
| en | Pro yearly | 700 AI credits a month + sync, billed yearly |
| es | Pro anual | 700 créditos de IA/mes y sync, pago anual |
| pt | Pro anual | 700 créditos de IA/mês e sync, cobrança anual |
| fr | Pro annuel | 700 crédits IA/mois et synchro, annuel |
| de | Pro jährlich | 700 KI-Credits/Monat und Sync, jährlich |
| it | Pro annuale | 700 crediti IA/mese e sync, fattura annuale |
| ja | Pro 年額 | 毎月AIクレジット700と同期・年払い |
| zh | Pro 年付 | 每月700 AI点数和同步，按年付费 |
| ko | Pro 연간 | 매달 AI 크레딧 700과 동기화, 연간 결제 |
| ru | Pro на год | 700 кредитов ИИ/мес. и синхр., оплата за год |
| hi | Pro सालाना | हर महीने 700 एआई क्रेडिट और सिंक, सालाना बिल |
| tr | Pro yıllık | Ayda 700 YZ kredisi ve eşitleme, yıllık |
| id | Pro tahunan | 700 kredit AI/bulan + sinkron, bayar tahunan |
| pl | Pro rocznie | 700 kredytów AI/mies. + synchr., rocznie |
| nl | Pro jaarlijks | 700 AI-credits/maand + sync, jaarlijks |
| ar | Pro سنوي | 700 رصيد شهريًا ومزامنة، بدفع سنوي |

