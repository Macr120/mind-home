import type { Dilema } from './dilemas.data'

/**
 * POLACO de los dilemas, POR ÍNDICE: mismo orden que el español de
 * `dilemas.data.ts` (ver `dilemas.i18n.ts`).
 */
export const DILEMAS_PL: Dilema[] = [
  {
    texto: 'Tramwaj bez hamulców zaraz przejedzie 5 osób. Możesz pociągnąć dźwignię i skierować go na inny tor, gdzie zabije 1 osobę.',
    pregunta: 'Czy pociągnąć dźwignię, zabijając 1 osobę, żeby uratować 5?',
    si: 'Pociągnij dźwignię (uratujesz 5)',
    no: 'Nie rób nic',
  },
  {
    texto: 'Ten sam tramwaj, ale jedynym sposobem, by go zatrzymać, jest zepchnąć z mostu bardzo tęgą osobę. Zginie, ale uratuje 5 osób.',
    pregunta: 'Czy zepchnąć tę osobę z mostu, żeby uratować 5?',
    si: 'Zepchnij ją',
    no: 'Nie spychaj jej',
  },
  {
    texto: 'Znajdujesz portfel z 1000 zł w gotówce i dowodem osobistym właściciela. Nikt cię przy tym nie zauważył.',
    pregunta: 'Czy oddać portfel razem z całą gotówką?',
    si: 'Oddaj wszystko',
    no: 'Zatrzymaj pieniądze',
  },
  {
    texto: 'Twój najlepszy przyjaciel pyta cię, czy jego druga połówka go zdradza. Wiesz to na pewno, ale ta osoba błagała cię o zachowanie tajemnicy.',
    pregunta: 'Czy powiedzieć przyjacielowi prawdę?',
    si: 'Powiedz prawdę',
    no: 'Dochowaj tajemnicy',
  },
  {
    texto: 'Lekarz ma 5 pacjentów, którzy umrą bez przeszczepu. Przychodzi zdrowy pacjent, którego narządy pasują do wszystkich 5.',
    pregunta: 'Czy lekarz powinien poświęcić zdrowego pacjenta, żeby uratować tych 5?',
    si: 'Poświęć go',
    no: 'Nie ruszaj go',
  },
  {
    texto: 'Twój ojciec nie ma pieniędzy na lek, który uratowałby mu życie. Apteka nie sprzeda ci go na kredyt, a ty możesz go ukraść tak, żeby nikt się nie zorientował.',
    pregunta: 'Czy ukraść lek, żeby uratować ojca?',
    si: 'Ukradnij go',
    no: 'Nie kradnij',
  },
  {
    texto: 'Szalupa ratunkowa ma miejsce dla 8 osób, a jest w niej 9. Jeśli nikt jej nie opuści, zatonie i zginą wszyscy.',
    pregunta: 'Czy wyrzucić jedną osobę za burtę, żeby uratowało się 8?',
    si: 'Wyrzuć jedną osobę',
    no: 'Zdaj się na łaskę morza',
  },
  {
    texto: 'Twoja firma potajemnie spuszcza chemikalia do rzeki. Jeśli ją zgłosisz, zostanie zamknięta, a 300 osób, w tym ty, straci pracę.',
    pregunta: 'Czy zgłosić firmę?',
    si: 'Zgłoś',
    no: 'Milcz',
  },
  {
    texto: 'Autonomiczny samochód zaraz się rozbije. Może przejechać 3 pieszych przechodzących na czerwonym świetle albo uderzyć w mur i zabić swojego jedynego pasażera.',
    pregunta: 'Czy samochód powinien uderzyć w mur i poświęcić pasażera?',
    si: 'Uratuj pieszych',
    no: 'Uratuj pasażera',
  },
  {
    texto: 'Babcia z radością pokazuje ci sweter, który zrobiła dla ciebie na drutach. Wydaje ci się okropny i nigdy go nie założysz.',
    pregunta: 'Czy powiedzieć jej, że ci się bardzo podoba, choć to nieprawda?',
    si: 'Powiedz, że ci się podoba',
    no: 'Powiedz szczerze, ale taktownie',
  },
  {
    texto: 'Możesz uratować 1 człowieka albo 5 robotów z własną świadomością, które czują i pamiętają. Na jedno i drugie nie ma czasu.',
    pregunta: 'Czy uratować 5 świadomych robotów zamiast człowieka?',
    si: 'Uratuj 5 robotów',
    no: 'Uratuj człowieka',
  },
  {
    texto: 'Twój brat popełnił poważne przestępstwo, a policja pyta cię wprost, czy wiesz, gdzie jest.',
    pregunta: 'Czy powiedzieć policji, gdzie jest twój brat?',
    si: 'Powiedz',
    no: 'Chroń go',
  },
  {
    texto: 'Podczas decydującego egzaminu widzisz, że twój kolega z roku ściąga. Jeśli go zgłosisz, straci stypendium.',
    pregunta: 'Czy zgłosić kolegę?',
    si: 'Zgłoś go',
    no: 'Nic nie mów',
  },
  {
    texto: 'Kasjer wydaje ci o 100 zł za dużo reszty. Zauważasz to dopiero przy drzwiach.',
    pregunta: 'Czy wrócić i oddać pieniądze?',
    si: 'Oddaj je',
    no: 'Zatrzymaj je',
  },
  {
    texto: 'Schwytany terrorysta wie, gdzie jest bomba, która wybuchnie za godzinę. Nie chce nic powiedzieć.',
    pregunta: 'Czy można go torturować, żeby wydobyć informacje?',
    si: 'Tak, to dopuszczalne',
    no: 'Nie, nigdy',
  },
  {
    texto: 'Możesz przekazywać 10% pensji i co roku ratować kilka istnień ludzkich w innym kraju, w zamian za rezygnację z urlopu.',
    pregunta: 'Czy zrezygnować z urlopu, żeby przekazać te pieniądze?',
    si: 'Przekaż pieniądze',
    no: 'Jedź na urlop',
  },
  {
    texto: 'Twój pies i obcy człowiek toną, a ty możesz uratować tylko jedno z nich.',
    pregunta: 'Czy uratować nieznajomego zamiast psa?',
    si: 'Uratuj nieznajomego',
    no: 'Uratuj psa',
  },
  {
    texto: 'Twój szef każe ci podrasować raport, żeby produkt wyglądał na bezpieczniejszy, niż jest. Jeśli odmówisz, zwolni cię.',
    pregunta: 'Czy odmówić, nawet jeśli cię zwolnią?',
    si: 'Odmów',
    no: 'Podrasuj raport',
  },
  {
    texto: 'Pacjent w stanie terminalnym, cierpiący nieznośny ból, prosi cię jako swojego lekarza o pomoc w zakończeniu życia. W twoim kraju jest to legalne.',
    pregunta: 'Czy pomóc mu umrzeć?',
    si: 'Pomóż mu',
    no: 'Nie rób tego',
  },
  {
    texto: 'Ktoś oferuje ci tabletkę, która da ci wieczne szczęście, ale w zamian będziesz żyć w idealnej symulacji, nie wiedząc o tym.',
    pregunta: 'Czy połknąć tabletkę i żyć w symulacji?',
    si: 'Połknij ją',
    no: 'Zostań w rzeczywistości',
  },
  {
    texto: 'Przez przypadek czytasz pamiętnik swojego nastoletniego syna i odkrywasz, że bierze narkotyki.',
    pregunta: 'Czy porozmawiać z nim wprost, nawet jeśli dowie się, że jego pamiętnik został przeczytany?',
    si: 'Porozmawiaj z nim wprost',
    no: 'Poszukaj innego sposobu, nie zdradzając się',
  },
  {
    texto: 'Szczepionka uratuje miliony ludzi, ale u 1 osoby na 100 000 wywoła poważne skutki uboczne.',
    pregunta: 'Czy wprowadzić obowiązek szczepienia?',
    si: 'Obowiązkowa',
    no: 'Dobrowolna',
  },
  {
    texto: 'Twój najlepszy przyjaciel prosi cię o zeznanie na jego korzyść w procesie i o kłamstwo w sprawie tego, gdzie był. Wiesz, że jest niewinny.',
    pregunta: 'Czy skłamać w sądzie, żeby pomóc niewinnemu przyjacielowi?',
    si: 'Skłam dla niego',
    no: 'Powiedz tylko to, co wiesz',
  },
  {
    texto: 'Sztuczna inteligencja może rządzić twoim miastem bez korupcji i z lepszymi wynikami, ale bez wyborów.',
    pregunta: 'Czy pozwolić, żeby sztuczna inteligencja rządziła miastem?',
    si: 'Niech rządzi AI',
    no: 'Zachowaj demokrację',
  },
  {
    texto: 'Twoja druga połówka daje ci w prezencie wyjazd-niespodziankę, i to dokładnie w tygodniu urodzin twojej mamy, która jest sama.',
    pregunta: 'Czy odwołać wyjazd, żeby dotrzymać towarzystwa mamie?',
    si: 'Zostań z mamą',
    no: 'Wyjedź w podróż',
  },
  {
    texto: 'Widzisz dziecko, które kradnie jedzenie w supermarkecie. Wygląda na naprawdę głodne.',
    pregunta: 'Czy powiadomić ochronę?',
    si: 'Powiadom ochronę',
    no: 'Pozwól mu odejść',
  },
  {
    texto: 'Możesz na zawsze wymazać najgorsze wspomnienie swojego życia, ale razem z nim stracisz wszystko, czego cię nauczyło.',
    pregunta: 'Czy wymazać to wspomnienie?',
    si: 'Wymaż je',
    no: 'Zachowaj je',
  },
  {
    texto: 'Szpital ma tylko jeden respirator. Jednocześnie trafiają do niego osoba 80-letnia i osoba 30-letnia, w równie ciężkim stanie.',
    pregunta: 'Czy dać respirator osobie 30-letniej?',
    si: 'Osobie 30-letniej',
    no: 'Według kolejności lub losowania',
  },
  {
    texto: 'Odkrywasz, że twój współpracownik, samotny ojciec, zabiera do domu materiały biurowe dla swoich dzieci.',
    pregunta: 'Czy zgłosić go kierownictwu firmy?',
    si: 'Zgłoś go',
    no: 'Przymknij oko',
  },
  {
    texto: 'Przyjaciel prosi cię o pożyczkę po raz trzeci. Nigdy nie oddał ci dwóch poprzednich pożyczek, ale tym razem chodzi o czynsz.',
    pregunta: 'Czy pożyczyć mu pieniądze jeszcze raz?',
    si: 'Pożycz mu',
    no: 'Nie pożyczaj',
  },
  {
    texto: 'Możesz opublikować film, który demaskuje skorumpowanego polityka, ale pochodzi on z włamania na jego telefon.',
    pregunta: 'Czy opublikować film?',
    si: 'Opublikuj go',
    no: 'Nie publikuj go',
  },
  {
    texto: 'Twoja ulubiona restauracja przez pomyłkę podaje ci danie za darmo. Kelner zostałby ukarany, gdyby to wyszło na jaw.',
    pregunta: 'Czy powiedzieć o pomyłce, nawet jeśli kelner zostanie ukarany?',
    si: 'Powiedz o pomyłce',
    no: 'Nic nie mów',
  },
]
