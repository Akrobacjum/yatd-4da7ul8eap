# 11. Otwarte kwestie, błędy i martwy kod

Lista rzeczy, o które trzeba zapytać autora albo które trzeba świadomie rozstrzygnąć przy przenoszeniu. Błędy znalezione w prototypie są tu po to, żeby ich nie przenieść bezmyślnie, ale też nie "naprawiać" po cichu: część z nich może być zachowaniem, do którego autor się przyzwyczaił. Domyślnie: zachowanie prototypu, a każdą poprawkę uzgodnić z autorem i zapisać w GDD.

## 11.1 Decyzje do podjęcia przed etapem M3

| Temat | Stan | Do decyzji |
|---|---|---|
| Meta i monetyzacja | sekcja 10 | cały projekt metagry, walut i miejsc reklam |
| Nazwy | "Esencja" robocza; "Dusze" zderzają się z duszą zabitego bohatera | nazwy ostateczne |
| Infamia (poziomy trudności po wygranej) | planowana | czy i kiedy |
| Wersja angielska | brak | kiedy (teksty mają znaczniki płci i przypadków, załącznik A.5) |
| Dane testowe w Unity | prototyp wysyła na Dysk Google przez Apps Script | zostać przy tym w testach zamkniętych czy od razu Unity Analytics |
| Grafika | autor robi grafikę sam (Affinity, Spine, Figma na jego komputerze) | styl ostateczny, kolejność assetów; do tego czasu bryły i sprite'y zastępcze |
| Przytrzymanie palca a czaszka | przy przytrzymaniu checków nie ma, więc zabójczy cios pada bez pytania (`p6_loop.js: checkTick`, gałąź `ff`), choć zasada mówi "czaszka pyta zawsze" | zostawić (opis "Jak grać" mówi, że przy przytrzymaniu checków nie ma) czy pytać mimo przyspieszenia |
| Pierwsze runy (1.12) | sprawdzone testami, jeszcze nie na graczach | ocena po testach z ludźmi |
| Balans po 1.12.1 | przychód przywrócony mnożnikiem `S.essK = 1,1`, zegarem combo ×0,25 w ciszy i oknem 3 s (odtworzenia dwóch runów autora: +3% i +5% względem 1.11.1, serce syte mniej więcej tak samo często, najazdy ok. 25-30% dłuższe, więc Esencji na minutę jest mniej); oparte na 2 runach, 8 prób na falę | potwierdzić na testach z ludźmi; jeśli Esencji za dużo, zmniejszyć `essK` |
| Jedno pole na bohatera (1.12.1) | przeciśnięcia (mijanie po czekaniu) zdarzają się ok. 2-3 razy na falę (test `t1121_tiles`); dwóch stojących na jednym polu w ok. 0,2-0,3% klatek (głównie krótkie zatory w korytarzach) | ocenić z autorem, czy wygląda naturalnie; w Unity można dodać rezerwację pól, jeśli zatory będą widoczne |

## 11.2 Błędy i niespójności w prototypie (zgłoszone przy pisaniu sekcji)

Szczegóły i miejsca w kodzie są w podanych sekcjach.

### Przebieg i ekonomia (sekcja 03)

| Problem | Skutek |
|---|---|
| Po fali zakończonej z 0 kryształów nie ma zapisu | zamknięcie aplikacji na ekranie przegranej wraca do budowy przed tą falą |
| "Jeszcze raz" woła `newRun(false)` | zawsze pełna gra, z pominięciem etapów pierwszych runów |
| Karta `u-portrait` nie może wypaść | portret jest w `START_UNLOCKED`, a w etapach 1 jest wyłączony, więc karta nie ma sensu w żadnym etapie |
| Kontynuacja za reklamę po fali 10 z 0 kryształów | run nie może już zostać wygrany |
| Karty rosnące w schowku | przeniesienie do schowka zeruje licznik (opis karty mówi tylko o sprzedaży) |
| Skarbiec | kryształ zjedzony przez głód nie przerywa serii fal bez straty |
| Groza z leczenia | dzielona przez max HP kapłana, nie leczonego |
| `edgePts` | w jednostkach Grozy, reszta `*Pts` w Esencji |
| Łowcy w podsumowaniu fali | UI liczy `huntersN(greedRep)` zamiast `huntersN(greedRaw(...))` i pokazuje łowców w etapach 1-3, gdzie ich nie ma |
| Kradzież przy 0 kryształów | bohaterowie nadal mogą "ukraść" kryształ, a jego odzyskanie daje Grozę |
| Kilka kart Post | chciwość może spaść poniżej 1, nawet do 0 |
| Wyjście z runu w trakcie fali | otwarta seria combo nie jest wypłacana |
| Bezpiecznik po 180 s | wyprowadza też niosącego kryształ, co liczy się jako utrata kryształu |

### Fale i bohaterowie (sekcja 04)

| Problem | Skutek |
|---|---|
| Opisy niezgodne z kodem | osobowość "ostrożny" obiecuje sprawdzanie podłogi (robią to dopiero poziomy 6+); powracający "pamiętają loch", ale nie mają pamięci mapy; suwak `earlyHp` mówi o falach 2-6, a fala 1 też dostaje +25% HP |
| Powracający | może mieć imię zdublowane w fali; zastępując łowcę albo rekruta tej samej klasy kasuje ich znacznik; blizna po ranach nadpisuje istniejące ciało |
| Amulet z 0 ładunków | dalej daje bierne wykrywanie |
| Mnożnik strachu bossa ×0,85 | działa też na samego bossa |
| `phobiaSight` | martwy pająk dalej straszy |
| Od fali 15 | limit 6 bohaterów pochłania dodatkowe miejsce bossa |

### Pułapki, walka, checki (sekcja 05)

| Problem | Skutek |
|---|---|
| Wabik alarmuje raz na run | pole `alarmed` nie jest kasowane między falami; od następnej fali wabik nic nie robi, a złodziej może do niego wracać |
| Prognoza czaszki | nie uwzględnia combo, `typeMult` ani uniku; dla ducha i nietoperzy mnoży przez `it.power`, więc zawyża |
| Część strachu bez combo | sieć, zapadnia, klatka, krata, Grzmot ogra i kołysanka nie mają `cpow`, choć 1.12 mówi, że combo wzmacnia też strach |
| Bonus "w sieci" | `webbed` patrzy tylko na `slowUntil`, więc +30% dostaje każdy spowolniony (zawiasy, trumna, goblin) |
| Uwięziony nie ucieka ze strachu | gałąź klatki w `startFlee` jest martwa; bez ratunku zawsze umiera (boss wyłamuje kraty) |
| Krata i zawiasy | należą do korytarza, więc typy sąsiednich pokoi ich nie dotyczą |
| Karty i Zębatki | skracają też odnowienie zdolności potworów |
| Głodne ściany | kod obejmuje też oczy i lustro, opis nie |
| Licznik kraty w UI | nie liczy +2 zamknięć z poziomu 3 |
| Mgła "widać na 2 pola" | nie jest zaimplementowana w odkrywaniu mapy |

### Mapa, zapis, dane testowe (sekcja 07)

| Problem | Skutek |
|---|---|
| Przesunięcie mapy przy kopaniu w lewo | plotki o łupie i zapamiętane wyniki checków zostają na starych polach |
| Cofnij po kopaniu | przy zmianie szerokości mapy plotki odtwarzają się na złych polach, plotki o pułapkach wcale |
| Wyburz | zapomina plotki pokoju, zanim sprawdzi, czy wyburzenie jest dozwolone |
| Narzędzia lochu i skrzynia | nie zapisują runu (zamknięcie zaraz potem je gubi) |
| Zapis runu | trzyma też dokumenty fal z danych testowych i może przekroczyć limit `localStorage` bez komunikatu |
| Dane testowe | bohater, który wyniósł kryształ, ma w podsumowaniu fali `'left'`; kod `tr` oznacza i traumę, i spadek w zapadnię; statystyki zaokrąglane do całości; liczniki z budowy trafiają do następnej fali |
| Komentarz o rozbudowie | mówi 3/6/12/24, a przy koszcie 4 jest 4/8/16/32; zwrot za rozbudowę pomija modyfikator kart |

### AI bohaterów i rozmowy (sekcja 06, pełna lista w 6.8)

| Problem | Skutek |
|---|---|
| Kwestie, które nigdy nie padają | `SAY.learn` (`learnTrap` z `'seen'` dostaje `by = null`), `SAY.charm` nieużywane; `SAY.ghostOnly` zawsze blokuje własny dymek tego samego wojownika |
| Intencja `avoid` | od razu nadpisywana, więc kwestia `avoid` może wracać przy każdym planie |
| Furia | przyspiesza także w pokoju z Okowami (prędkość liczona z `h.rageUntil`, a nie z `raging()`) |
| `partyFlee` | oznacza uwięzionych w klatce jako uciekających, więc nikt ich nie uwolni |
| Jeden `rescueId` | druga decyzja o ratunku nadpisuje pierwszą |
| `P.steal` | nie spada, gdy drużyna odejdzie od serca |
| Wyjście z zapadni | nie przechodzi przez `getLost`, więc przywódca nie decyduje o szukaniu |
| Mag i kapłan | rzucają czary także w panice |
| Przywódca | wybierany według rangi, nie poziomu |
| Kwestie otwarcia przy wejściu | wypierają się nawzajem |
| Komentarze niezgodne z kodem | plotka liczy pokój jako 0,3 (komentarz: "połowa"); zasadzka wymaga 3 trafień (komentarz: 2) |
| Do potwierdzenia z autorem | czy rozbite meble mają wracać w następnej fali; `maybeDetour` sprawdza korytarz tylko po stronie `d.b` drzwi (niepewne) |

### Interfejs, grafika, dźwięk (sekcja 08, pełna lista w rozdziale 10)

| Problem | Skutek |
|---|---|
| `setHint` martwy od 1.12 | znikły m.in. wskazówka "Celuj w pełne pole" po 6 checkach bez krytyka, wskazówki checku, komunikaty o pauzie, wyłomie, budowli, cofnięciu (komunikaty sklepu i wieści o fali wróciły w 1.12.1) |
| Martwy toast | `#toast`, `hideToast`, `placeToast`; "Co nowego 1.0" i "Jak grać" jeszcze o nim mówią |
| Podzielony ekran | znika lista drużyny i strzałki, a jej stary obszar dalej reaguje na stuknięcie |
| Karta TUT_POP o checku | pojawia się tylko w runie z przewodnikiem |
| Sklep | pusta trzecia kolumna w rzędzie akcji |
| Cząsteczki | tarcie zależy od liczby klatek na sekundę |
| Dymki | tekst ucinany po 2 liniach bez wielokropka |

Poprawione już w 1.12.1: brak polskich nazw części źródeł strachu ("heart" na karcie bohatera), podwójne "Poziom N" przy ulepszeniu, "Jeszcze raz" pomijające etapy nauki, wieści o fali i komunikaty sklepu.

## 11.3 Martwy kod i nieużywane dane (nie przenosić)

| Co | Gdzie |
|---|---|
| Kupno kryształu (`buyCrystal`, `crystalCost`) | od 1.05 kryształu nie da się kupić; test `t15_econ` jeszcze to sprawdza |
| Stare okno wyboru karty (`renderUpgrade`, `renderPickSection`, typ `'upgrade'`), gałąź rzadkości r=2 | od 1.0 karty są w sklepie |
| `setHint` | od 1.12 nic nie robi (usunięta podpowiedź u góry), ale wywołania zostały w wielu miejscach |
| Ustawienia `essenceCap`, `fearRate`, `thrBase`, `trayAuto`; preferencje `hintOpen`, `speed` | nieczytane |
| `mods.labyrinth`, `mods.gateDur` | żadna karta ich nie zmienia |
| Statystyki `essSoul`, `wavePts`, `slept`, `silenceTime`, `speedTime` | nigdy nie rosną |
| Mnożniki zawsze 1: `sizeMult`, `cardMultNow`, `infMult`, `loneMult`; `nextThr` | pozostałość po Sławie i progach |
| `HERO_TRAITS.w`, `HEROES.letter`, `ITEMS.ghost.melee`, `it.sleep`, `run.rumor.heart` | nieczytane |
| `tapMove`, `trapNear`, tryby Przenieś i Ulepsz na pasku | zastąpione gestami |
| Ekran suwaków balansu | nic go nie otwiera (tylko prototyp) |
| `rollItem` bez puli, warunek wieku łupu `> 3` w `applyRumors`, gałąź z prorokiem w `becomeImpatient`, `tl('cb')`, gałąź 70% pętli w generatorze startowym | nieosiągalne |
| `regroupAtDoor` | praktycznie nieosiągalne (wszyscy są w środku po 1,5 s, a brama otwiera się po 1,8 s; niepewne) |

## 11.4 Uwagi do przenoszenia

- `Math.round` w JS zaokrągla połówki w górę, a `Math.Round`/`Mathf.Round` w C# do parzystej: użyj `Mathf.Floor(x + 0.5f)` (dotyczy m.in. głodu serca, cen kart, poziomów, HP, odwagi).
- Krok symulacji prototypu zależy od liczby klatek (najwyżej 0,05 s czasu gry), więc prototyp nie jest deterministyczny; w Unity stały krok i losowanie z ziarnem (sekcja 02).
- `Map` w JS zachowuje kolejność wstawiania, a kod na niej polega (kolejność odpalania, mówienia); w C# trzeba to odtworzyć listą.
