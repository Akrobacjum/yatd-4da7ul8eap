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
| Nauka w jednym runie (1.24; do 1.23 cztery runy) | etapy otwierają się w falach 1, 3, 5, 7 pierwszego runu; przewodnik skrócony (jedno wymagane stawianie, przytrzymanie kafelka, kolce zawsze kłują) | ocena po testach z ludźmi; zmierzyć długość samouczka na nowo (`tut.stepTimes`) |
| Balans po 1.12.1 | przychód przywrócony mnożnikiem `S.essK = 1,1`, zegarem combo ×0,25 w ciszy i oknem 3 s (odtworzenia dwóch runów autora: na 1.12.1 +3% i +5%, na 1.13 +3% i +6% względem 1.11.1, serce syte mniej więcej tak samo często, najazdy ok. 25-35% dłuższe, więc Esencji na minutę jest mniej); oparte na 2 runach, 8 prób na falę | potwierdzić na testach z ludźmi; jeśli Esencji za dużo, zmniejszyć `essK` |
| Rozmowy (1.13) | ok. 1,5-2,5 wymiany na falę w teście z gęstymi pułapkami (1.13); w 1.17 ok. 3 razy więcej wymian (liczby w sekcji 06, 6.7.9) i rozmowy startują też od kwestii z kolejki drużyny; w chaosie wymiany często się urywają (spóźniona kwestia przepada) | ocenić z autorem częstość (`CONVO_P`, przerwa 1,5-4 s) i ton; przy tłumaczeniu na angielski formy `{A:...}`, wołacz i dopełniacz `{g}` znikają |
| Szturm jako opcja narady (1.17) | po 120 s drużyna głosuje: dom, szturm na serce albo +30 s (sekcja 06, 6.3.10a). Szturm wraca jako możliwość, choć autor usunął dawną "szarżę" w 1.01 (wtedy: po cierpliwości zawsze do domu); teraz to wynik głosowania i tylko gdy przywódca wie, gdzie jest serce | potwierdzić z autorem, czy szturm z narady ma zostać i jak często (wagi głosów w `councilVote`) |
| Wiedza wspólna mimo percepcji (1.17) | mapa (`fl.known`), wiedza o pułapkach (`detected`, `fl.danger`, `fl.knownTypes`) i o łupach są wspólne dla całej drużyny, także dla zwiadowcy i zgubionego pokoje dalej; zwiadowca działa jak zdalna kamera, a nie ktoś, kto przynosi wieści (abstrakcja, sekcja 06, 6.3.5) | zostawić czy dzielić wiedzę oddzielonych (np. odkrycia zwiadowcy trafiają do wspólnej mapy dopiero, gdy wróci, z kwestią "Na wschodzie są dwa pokoje") |
| `fl.fearless` po szturmie i powrocie (1.17) | wynik narady dotyczy tylko tych, którzy go słyszą (plan bohatera), ale `fl.fearless` (prędkość ×1,3, bez omijania pułapek, wyższy próg strachu) działa od razu na wszystkich w lochu, także na zwiadowcę, który o naradzie nie wie | zostawić jako wspólne zmęczenie cierpliwości czy wiązać z planem bohatera |
| Idący za liderem jak GPS (1.17 bez zmian) | bohater, który nie jest zgubiony, idzie do bieżącego pola przywódcy, także gdy go nie widzi ani nie słyszy; łapie go tylko rzut na zgubienie (`lostChance`, mgła, brak drogi), sekcja 06, 6.2.12 | dodać ostatnie znane miejsce przywódcy (`P.seen` już jest) i szukanie, gdy go nie ma, czy zostawić |
| Celowe rozdzielenie mało daje (1.16) | w wygranym runie autora zwiadowca trzymał się w promieniu ok. 3,2 pola od drużyny, a próg "z dala" to 4,5 pola, więc `splitTime` = 0 i zwiad nie dał Grozy | zmniejszyć próg, wydłużyć zwiad albo wysyłać dalej (do decyzji z autorem) |
| Postój przy wejściu przed groźnym pokojem (1.13) | przygotowanie zaczyna się, gdy groźny pokój jest w 5 polach ścieżki lidera, więc często drużyna stoi na polu wejścia; w runie autora widać postoje 9-12 s (scenka + bieg) | sprawdzić z autorem, czy to nie za długo przy samym wejściu; ewentualnie nie zaczynać przygotowania w pierwszych sekundach fali |
| Esencja po 1.17 | odtworzenia dwóch runów autora: suma Esencji z fal 2-10 +6,5% względem 1.16 (2457 i 2228 zamiast 2301 i 2094), fale ok. 9 s dłuższe, kradzieże kryształu w granicach rozrzutu (sekcja 09); 1.17.1 (pamięć, krwawienie jako rana kłuta) w granicach szumu względem 1.17 (run strachu 2207 wobec 2158, run zabijania 2602 wobec 2642 w tej samej serii) | potwierdzić na testach z ludźmi; jeśli Esencji za dużo, zmniejszyć `S.essK`; policzyć nowy wzorzec odtworzeń dla Unity |
| Pamięć bohatera: co znaczy "widział" (1.17.1) | bohater widzi cały pokój, w którym stoi, i cały korytarz (promień 3,5 pola tylko na polu drzwi), ukryte pułapki dopiero, gdy odpalą, pozytywkę i zawiasy dopiero, gdy grają; pamięć jest osobna dla każdego bohatera, ale wiedza o mapie, pułapkach i łupie dalej wspólna (wiersz wyżej); kwestia, która nie pasuje, jest zamieniana na inną z tej samej puli (ok. 15-24 na run) albo nie pada (sekcja 06, 6.7.10, 6.8 #36) | potwierdzić z autorem zakres wzroku (cały korytarz czy kilka pól), czy pamięć ma się dzielić w rozmowie ("Widziałem tam ogra" przekazuje tag innym) i czy kwestie bez pasującego zamiennika mają przepadać |
| Kwestia komnaty w pokoju z efektem (1.17.1) | w pokoju z efektem i komnatą kwestia wejścia do komnaty prawie zawsze przepada za kwestią efektu (sekcja 06, 6.8 #35) | czy ma padać po kwestii efektu (np. przez kolejkę), czy zostać tylko jedna z nich |
| Wiersze statystyk w `statsTable` (1.16-1.17) | funkcja nie jest wołana; od poprawki wydania 1.17 zwiad, zwiedzanie, narada i wieści są kratkami w zakładce Liczby (sekcja 08), więc zostaje tylko usunąć martwą funkcję | usunąć `statsTable` przy porządkach |
| Narady lokalne i bezpieczne stanie (1.13) | fale dłuższe o ok. 5-15%, bohaterowie rzadziej giną w pułapkach, a w odtworzeniach nieco częściej się gubią (nie stoją wszyscy naraz) | sprawdzić na graczach, czy najazd nie jest za długi; ewentualnie skrócić cierpliwość |
| **Checki znikają w późnej grze** (pytanie 1 z briefu playtestów, sekcja 4) | od ok. fali 6 autoodpalanie z pamięci i przyspieszenie sprawiają, że gracz robi 0-3 checki na falę (tester: 4, 0, 3, 0, 1); od 1.24 także fale 1-2 są spokojniejsze (przerwa 1,5 s, sekcja 05, 5.9.10) | czy checki mają być rdzeniem gry do końca (np. pamięć wyniku tylko na falę, nowe checki przy ulepszeniu, combo z checków) |
| **Długość runu** (pytanie 2) | wygrany run to 27-54 min aktywnej gry (od 1.24 mierzone `activeSec`), 50-70% to budowa | czy potrzebny krótszy tryb na telefon (np. 5 fal, szybsza budowa) |
| **Uzdrowiciele kontra pułapki** (pytanie 3) | kapłani i bardowie leczą 600-700 HP na falę, co neutralizuje loch w późnej grze (tester: 728 obrażeń strzał, 0 zabitych); od 1.24 podgląd fali pokazuje uzdrowicieli ("✚ leczy") | czy gracz ma dość narzędzi "na uzdrowiciela" (Ołtarz działa tylko na kapłana; karta albo pułapka przerywająca leczenie?) |
| **Rozmiar lochu a wynik** (pytanie 4) | najlepsza fala testera przy 8 pokojach; przy 18 pokojach wynik niższy | czy rozbudowa ma się bardziej opłacać, czy to zamierzony sufit (pojemność pokoi, głębokość, droga bohaterów) |
| **Długość samouczka** (pytanie 5) | 16 kroków na v58; 1.24 skraca go (część B), ale nadal 16 kroków (część opcjonalna) | zmierzyć na nowo w playteście (`tut.stepTimes`, `stepIds`) |
| **Leczenie szamana** (z części D 1.24) | działa zgodnie z kodem, ale nie dawało Esencji; od uzupełnienia 2 do 1.24 daje ślad Grozy (0,02 za pełne wyleczenie) i "+N" nad potworem | czy leczenie ma dawać więcej, i czy kafelek ma ostrzegać, że szaman potrzebuje innych potworów |
| **Krata tylko z kimś w drzwiach** (z części D) | od uzupełnienia 2 do 1.24 krata zamyka się, gdy bohater jest w drzwiach, wchodzi albo stoi obok i wchodzi (było: 1-2 pola) | ocenić w grze, czy częściej trafia i czy rzadziej tylko odcina drogę |
| **Pytanie o niewydaną Esencję w przewodniku** (z części D) | w przewodniku nie pada | czy ma padać także w pierwszej fali samouczka |
| **Trudniejszy początek (1.24, w 1.25.1 w połowie cofnięty, w 1.26 jeszcze łagodniejszy)** | 1.26: fale 1-4 jak dawne 1,5; 2,25; 3; 4 (mniejszy loch w falach 2-4, mniej Esencji; głód bierze z sakiewki zamiast kryształu). 1.25.1: fale 1-4 jak dawne 2; 2,75; 3,5; 4,25, przewodnik jak v58 (playtesty 1.24-1.25: straty w falach 2-3 40-75%, 5 runów); sprawdzić w kolejnym playteście. 1.24: fale 1-4 grają jak dawne 3; 3,75; 4,3; 4,6 ("pierwszy run tak trudny jak teraz trzeci" odczytane jako pierwsze fale każdego runu); w odtworzeniach run strachu autora traci kryształ w fali 2 w 4 na 4 próby (1.23: 0-1) | potwierdzić odczytanie z autorem; czy cienka obrona strachem we wczesnych falach ma wystarczać |
| **Częstsze dramaty (1.24)** | bunt w 32% fal, ostatni bastion w 46%, zakład w 34%, drwina w 26% (sekcja 06, 6.15.2) | czy to nie za często; każde ma napis nad bohaterem |
| **Łączenie kart (1.24)** | druga kopia łączy się w ★ (2,5 kopii + cecha grupy); trzecia nie wypada; przypisanie kart do grup to decyzja przy wdrożeniu (dig, mole, cheapwalls w Esencji, loottrap w mocy, depth w chciwości) | potwierdzić grupy i siłę ×2,5 (grupy `power` ×2,75, `hero` ×3,125) |
| **Limit zapadni (1.24)** | najwyżej 2 upadki na falę (elita i poz. 12+: 1), koszt 6 | ocenić, czy zapadnia nie stała się za słaba w lochach strachu |
| **Kalibracja ekonomii 1.26** | liczby planu "Serce zabiera" (tabela głodu `HUNGER_T`, Danina 30%, progi poziomów 30/75/135/210/300/410/540, Ofiara do 40, start 25, dochód 6, ceny 5/9/14, tańsze elementy, `GZ.scare` 4, `MON_FACTOR` 0,8) są wpisane tak, jak zaprojektowano; boty dymne (`e126/bot`) są słabsze od modelu z planu (dominuje kradzież kryształu), więc nie dały podstaw do zmian; odtworzeń `replay_talk.py` na 1.26 nie liczono | kalibrować na danych z testów z ludźmi (`LOG_VERSION` 62): `waves.summary` `satiety`, `satietyGain`, `heartLv`, `heartPick`, `regrow`, `feastPts`, `tithePts`, `ofiara`, `revived`, `stealMax`, `omen`, `hunger` (`tookPurse`, `bankrupt`), `stats` `essTithe`, `essDrained`, `drainBack`, `heartTook`; policzyć nowy wzorzec odtworzeń (sekcja 09) |
| **Omen w pierwszym runie bez przewodnika (1.26)** | `omenOf` wyklucza tylko `run.tutorial`, więc run w etapach nauki bez przewodnika dostaje omen w fali 3 | czy omeny mają czekać do pełnej gry (plan: "pierwszy run z przewodnikiem bez omenów") |
| **Zachowania z planu 1.26, których nie ma w kodzie** | przesądny nie czeka przed pokojem z portretem albo lustrem; ciekawski nie sprawdza usłyszanych pułapek i nie przeszukuje mebli częściej; zapaleniec nie szarżuje i nie ma 30% przejścia przez znaną pułapkę; Wnyki nie wydłużają rozbrajania ×1,5; ogar nie idzie za Krwawiącym do sąsiedniego pokoju; saper nie trzyma się za innymi potworami; flaszka alchemika kończy strefę na dobre (plan: na 6 s); Wyziewy B (oślepienie) blokują wykrywanie, ale nie naukę pułapek; Plama oleju A (`h.oilA`) nic nie robi; Runa rodu nie wydłuża czasów statusów | dopisać w prototypie albo zmienić opisy (sekcje 04, 4.2; 05, 5.14.11; 06, 6.16.11) |
| **Cechy B i plan w szczegółach (1.26)** | Pożar ustawia stałe 6 s podpalenia (plan: 2 razy dłużej), Kościany pancerz zmniejsza każde obrażenie poza magiem (plan: kłute), Wielkie leczenie szamana z checku nie wybiera najsilniejszego, Wspólny mechanizm nie sprawdza rodziny, Mgła wojny losuje zgubienie co krok (zależne od tempa klatek) | do decyzji autora (sekcja 05, 5.11 i 5.14.11; sekcja 03, rozdz. 6) |
| Jedno pole na bohatera (1.12.1) | przeciśnięcia (mijanie po czekaniu) zdarzają się ok. 2-3 razy na falę (test `t1121_tiles`); dwóch stojących na jednym polu w ok. 0,2-0,3% klatek (głównie krótkie zatory w korytarzach) | ocenić z autorem, czy wygląda naturalnie; w Unity można dodać rezerwację pól, jeśli zatory będą widoczne |

## 11.2 Błędy i niespójności w prototypie (zgłoszone przy pisaniu sekcji)

Szczegóły i miejsca w kodzie są w podanych sekcjach.

### Przebieg i ekonomia (sekcja 03)

| Problem | Skutek |
|---|---|
| Po fali zakończonej z 0 kryształów nie ma zapisu | zamknięcie aplikacji na ekranie przegranej wraca do budowy przed tą falą |
| Karta `u-portrait` (usunięta w 1.18) | była nieosiągalna; stare zapisy pomijają jej id |
| Kontynuacja za reklamę po fali 10 z 0 kryształów | run nie może już zostać wygrany |
| Karty rosnące w schowku | przeniesienie do schowka zeruje licznik (opis karty mówi tylko o sprzedaży) |
| Skarbiec | kryształ zjedzony przez głód nie przerywa serii fal bez straty |
| Groza z leczenia | dzielona przez max HP kapłana, nie leczonego |
| `edgePts` | w jednostkach Grozy, reszta `*Pts` w Esencji |
| Łowcy w podsumowaniu fali | UI liczy `huntersN(greedRep)` zamiast `huntersN(greedRaw(...))` i pokazuje łowców w etapach 1-3, gdzie ich nie ma |
| Kradzież przy 0 kryształów | bohaterowie nadal mogą "ukraść" kryształ, a jego odzyskanie daje Grozę |
| Kilka kart Post | chciwość może spaść poniżej 1, nawet do 0 |
| Wyjście z runu w trakcie fali | otwarta seria combo nie jest wypłacana (od 1.16.1 przepada tylko jej reszta ponad to, co serce zjadło na bieżąco) |
| Bezpiecznik po 180 s (zmieniony w 1.24) | do 1.23 wyprowadzał też niosącego kryształ (utrata kryształu); od 1.24 wyczerpanie po 180 s (wychodzą sami) i wyjście z miejsca po 270 s z kryształem z powrotem w sercu |
| Wynik runu (naprawione w 1.24) | `run.total` różnił się od sumy wyników fal o zaokrąglenia (5724 wobec 5722); od 1.24 suma zaokrąglonych wyników |
| Kryształy w danych (naprawione w 1.24) | zjedzony przez głód kryształ nie był nigdzie widoczny; od 1.24 dziennik kryształów, napis i linia w podsumowaniu |
| Status runu (naprawione w 1.24) | dwa runy miały `active` z `won: true`; od 1.24 jedna reguła statusu |
| Tekst połączonej karty (1.24) | zawsze "2,5 kopii", choć grupy `power` i `hero` działają jak 2,75 i 3,125 |
| `applyFrac` (1.24) | ułamek kopii rozpoznaje "mnożenie" po równym stosunku dwóch kopii; pola stałe albo nieliniowe zostają po całych kopiach |
| "Dla Ciebie" w podsumowaniu (1.26) | `renderWave` liczy część serca jako `min(need, fl.fed - tookPurse)`, a `feedHeart` nie dodaje zapłaty z sakiewki do `fl.fed`: w fali z niedoborem rachunek pokazuje "♥" za małe i "dla Ciebie +tookPurse" zamiast +0 (Danina jest już odejmowana); kafelek Esencji dobry (sekcja 03, rozdz. 6, pkt 20) |
| Liczniki potworów 1.26 | `m.raised`, `m.reN`, `m.reAt`, `it.rewound`, `m.rangerHit`, `it.boltN` nie są zerowane w `setupFl` i idą do zapisu: licz podnosi raz na run, szkielet składa się raz na run (premia Kości niezłomnych zostaje), Zwijacz raz na run; `reAt` z poprzedniej fali może ściąć szkieletowi HP do 50% (sekcja 05, 5.14.11) |
| Stary zapis bez omenów (1.26) | run zapisany przed 1.26 nie ma `run.omens`, więc po wczytaniu nie dostaje omenów |
| Uczta ze zdolności (naprawione po przeglądzie 1.26) | zabójstwo zdolnością potwora z checku dawało źródło pułapki: bez Uczty, Łupieżcy, Polowania, Armii, Głodu krwi i Pamiętnika kata; teraz `h.killer = fl.firing` |
| Kody osi czasu (1.26) | `tl('k')` w pierwszej wersji 1.26 w komentarzu (naprawione); `gs`, `cl`, `gh` użyte drugi raz z innym znaczeniem (sekcja 07, 7.13) |

### Fale i bohaterowie (sekcja 04)

| Problem | Skutek |
|---|---|
| Opisy niezgodne z kodem | osobowość "ostrożny" obiecuje sprawdzanie podłogi (robią to dopiero poziomy 6+); powracający "pamiętają loch", ale nie mają pamięci mapy; suwak `earlyHp` mówi o falach 2-6, a fala 1 też dostaje +25% HP |
| Powracający | może mieć imię zdublowane w fali; zastępując łowcę albo rekruta tej samej klasy kasuje ich znacznik; blizna po ranach nadpisuje istniejące ciało |
| Amulet z 0 ładunków | dalej daje bierne wykrywanie |
| Mnożnik strachu bossa ×0,85 | działa też na samego bossa (od 1.17 zapisane wprost; dla innych tylko, gdy są z bossem) |
| `phobiaSight` | martwy pająk dalej straszy |
| Od fali 15 | limit 6 bohaterów pochłania dodatkowe miejsce bossa |
| Więź mistrza bez pary (1.21-1.24) | rzut na mistrza bez pary daje przyjaciół, więc przyjaciół jest więcej niż w tabeli |
| Klasy przy omenach (1.26) | Oblężenie przy braku klas dobiera z `PARTY` i może powtórzyć klasę; wymuszona klasa omenu (po gildii) może zająć miejsce specjalisty gildii w małej drużynie |
| Opis zapaleńca (1.26) | `TRAIT_TEXT` "idzie przez znane pułapki" obiecuje więcej niż `avoid` ×0,7 |
| Komentarze 1.21-1.24 | nad `makeBonds`, `betThink`, `bondHurt`, `handThink` stoją liczby sprzed 1.24 (kod: 75%/45%, zakład 50% HP i 85%, drwina 8%/80%/12 s, przekazanie 50%/2,5 pola); komentarz etapów przy `ONB_FULL` mówi o czterech runach |

### Pułapki, walka, checki (sekcja 05)

| Problem | Skutek |
|---|---|
| Wabik alarmuje raz na run (naprawione w 1.26) | do 1.25.1 pole `alarmed` nie było kasowane między falami; od 1.26 `setupFl` je kasuje |
| Czaszka bez rodziny i omenu (1.26) | `predictedDmg` nie liczy `famK`, `kindPow`, `omenPow` ani reakcji, więc przy rodzinie na wysokim poziomie zabija bez pytania częściej |
| Budowle 1.26 (naprawione po przeglądzie) | w pierwszej wersji 1.26 dodatki Runy, Ołtarza, Kwasu, Zasłony i Kamienia wyjca były tylko w opisach; teraz działają (sekcja 05, 5.5.2) |
| Wyziewy (1.26) | trafieni przy odpaleniu dostają stos drugi raz przy "wejściu" do świeżej chmury w tym samym kroku |
| Prognoza czaszki | nie uwzględnia combo, `typeMult` ani uniku; dla ducha i nietoperzy mnoży przez `it.power`, więc zawyża |
| Część strachu bez combo | sieć, zapadnia, klatka, krata, Grzmot ogra i kołysanka nie mają `cpow`, choć 1.12 mówi, że combo wzmacnia też strach |
| Bonus "w sieci" | `webbed` patrzy tylko na `slowUntil`, więc +30% dostaje każdy spowolniony (zawiasy, trumna, goblin) |
| Uwięziony nie ucieka ze strachu | gałąź klatki w `startFlee` jest martwa; bez ratunku zawsze umiera (boss wyłamuje kraty) |
| Krata i zawiasy | należą do korytarza, więc typy sąsiednich pokoi ich nie dotyczą |
| Karty i Zębatki | skracają też odnowienie zdolności potworów |
| Głodne ściany (naprawione w 1.18) | tekst wymienia teraz oczy i lustra |
| Licznik kraty w UI | nie liczy +2 zamknięć z poziomu 3 |
| Krwawienie od 1.17.1 (naprawione w 1.18-1.24) | teksty Hartowanych ostrzy i Oleju w szczelinach mówią o krwawieniu; karta bohatera pisze "krwawi" |
| Zapadnia po limicie (1.24) | bohater po limicie nie jest celem zapadni, a jej znajomość od niego staje się wiedzą całej drużyny |
| Draśnięcia z przerwy (1.24) | odpalenia bez stuknięcia w falach 1-2 liczą się do `bt(typ).ok` jak trafione checki |
| Mgła "widać na 2 pola" | nie jest zaimplementowana w odkrywaniu mapy |

### Mapa, zapis, dane testowe (sekcja 07)

| Problem | Skutek |
|---|---|
| Przesunięcie mapy przy kopaniu w lewo | plotki o łupie i zapamiętane wyniki checków zostają na starych polach |
| Cofnij po kopaniu | przy zmianie szerokości mapy plotki odtwarzają się na złych polach, plotki o pułapkach wcale |
| Wyburz | zapomina plotki pokoju, zanim sprawdzi, czy wyburzenie jest dozwolone |
| Narzędzia lochu i skrzynia | nie zapisują runu (zamknięcie zaraz potem je gubi) |
| Zapis runu | trzyma też dokumenty fal z danych testowych i może przekroczyć limit `localStorage` bez komunikatu |
| Dane testowe | bohater, który wyniósł kryształ, ma w podsumowaniu fali `'left'`; kod `tr` oznacza i traumę, i spadek w zapadnię; od 1.22-1.23 kod `fm` oznacza i szyk w walce, i pamięć poległych; statystyki zaokrąglane do całości; liczniki z budowy trafiają do następnej fali; nowe pola 1.20-1.24 część A przy `LOG_VERSION` 58 (od części D 59) |
| Komentarz o rozbudowie | mówi 3/6/12/24, a przy koszcie 4 jest 4/8/16/32; zwrot za rozbudowę pomija modyfikator kart |

### AI bohaterów i rozmowy (sekcja 06, pełna lista w 6.8)

| Problem | Skutek |
|---|---|
| Kwestie, które nigdy nie padają | `SAY.charm` nieużywane; `SAY.ghostOnly` zawsze blokuje własny dymek tego samego wojownika; `SAY.learn` pada od 1.17 (naprawione) |
| Intencja `avoid` (naprawione w 1.17) | była od razu nadpisywana, więc kwestia `avoid` mogła wracać przy każdym planie; od 1.17 raz na potwora |
| Furia | przyspiesza także w pokoju z Okowami (prędkość liczona z `h.rageUntil`, a nie z `raging()`) |
| `partyFlee` (naprawione w 1.17) | oznaczał uwięzionych w klatce jako uciekających, więc nikt ich nie uwalniał; od 1.17 nie oznacza uwięzionych ani czempiona, a ucieka tylko ten, kto słyszy krzyk przywódcy |
| Jeden `rescueId` (naprawione w 1.17) | druga decyzja o ratunku nadpisywała pierwszą; od 1.17 drugi czeka w `P.rescueQ` |
| `P.steal` (naprawione w 1.17) | nie spadał, gdy drużyna odeszła od serca; od 1.17 maleje o 0,5/s |
| Wyjście z zapadni | nie przechodzi przez `getLost`; od 1.17 przywódca i tak decyduje o szukaniu, gdy go nie słyszy (`missLost`), chyba że `lostNoticed` zostało z wcześniejszego zgubienia w tej fali |
| Sprzeciw lidera wobec łupu (naprawione w 1.17) | był tylko słowami; od 1.17 zbierający zwykle słucha (`lootObey`) i zostawia łup na 15 s |
| Wiedza przez ściany (naprawione w 1.17) | śmierć, krzyki, ucieczka, kryształ, klatka, wołanie kapłana, serce i zgubiony działały na cały loch; od 1.17 percepcja (sekcja 06, 6.3.13). Zostały ograniczenia: morale spada przy każdej ranie od pułapki w lochu, bard woła zgubionego po imieniu bez usłyszenia go, efekty przygotowania działają na wszystkich, uwięziony wie, czy ktoś po niego idzie, reakcje liczone samą odległością przez ściany (`friendHit`, ostrzeżenie weterana, odwracanie się do rannego, pocieszenie), ratownik, który później się zgubi, nie traci roli |
| Nowy przywódca przynosi swój plan (1.17, zawężone w poprawce wydania) | dzieje się już tylko wtedy, gdy nikt z pozostałych nie zna starego planu, przed końcem cierpliwości i bez kradzieży w fali; wcześniej (pierwsza wersja 1.17) po powrocie do domu z `fl.fearless` drużyna mogła znów zwiedzać albo szturmować do siatki bezpieczeństwa (sekcja 06, 6.8 #32) |
| Krwawienie jako ogień (naprawione w 1.17.1) | krwawienie z kolców 3. poziomu (i z kolców w Zbrojowni) liczyło się jako ogień: trauma i fobia ognia, odporności na ogień, płomień nad figurą, "Gaszę ogień!" kapłana i kwestie o płomieniach w lochu bez ognia; od 1.17.1 to rana kłuta (sekcja 05, 5.3.2) |
| Kwestie o rzeczach, których nie było (naprawione w 1.17.1) | każda kwestia mogła paść niezależnie od tego, co jest w lochu; od 1.17.1 pamięć bohatera i filtr kwestii (sekcja 06, 6.7.10) |
| Filtr kwestii w rozmowach (1.17.1) | sprawdzany przy starcie wymiany w kontekście rzeczy chwili kwestii, która ją zaczęła; wymiana bez roli C (naprawione w 1.21: proponowana tylko, gdy ktoś zna kwestie C) (sekcja 06, 6.8 #34) |
| Kwestia komnaty po kwestii efektu (1.17.1, częściowo naprawione w 1.18) | od 1.18 idzie do kolejki drużyny, gdy w pokoju jest efekt; `stats.rkEnter` dalej rośnie przed powiedzeniem (sekcja 06, 6.8 #35) |
| Wzrok w korytarzu (1.17.1) | kod: cały korytarz; komentarz i opis zmian: 3,5 pola (sekcja 06, 6.8 #36) |
| Statystyki filtra (1.17.1) | `lineSwap`/`lineDrop` i pamięć rzeczy chwili liczone także dla kwestii, które potem nie padają (dymek o wyższym priorytecie; dalej w 1.24, `fitLine` przed sprawdzeniem dymka); `chatTry` od 1.21 liczy tylko ticki z wybranym mówiącym (sekcja 06, 6.8 #37, #38) |
| Rozmowy o buncie i rozłamie (naprawione w 1.19) | stary przywódca komentował własny bunt, dołączający własny rozłam; od 1.19 `P.convoNot` ich wyklucza |
| Kod osi czasu `fm` (1.22, 1.23) | szyk w walce i pamięć poległych mają ten sam kod (sekcja 06, 6.8 #39) |
| Limit niespokojnego rozłamu (1.19-1.24) | liczony po wszystkich rozłamach w fali (także fochach), więc po dwóch fochach niespokojny rozłam już nie przychodzi (6.8 #41) |
| Wyczerpanie czyści kolejkę (1.24) | bohaterowie jeszcze przed drzwiami nie wchodzą (zamierzone) |
| `g2Goal` po końcu grupy (naprawione w 1.24) | wyjątek, gdy `leader()` kończył drugą grupę w trakcie planu jej przywódcy |
| Rozmowy o naradzie (1.17) | zestawy `CONVO` dla `goHomeAlone` i `councilGiveIn` prawie nigdy nie startują, bo mówiący jest w trakcie narady (`talking`) |
| Objazd lidera po czasie (naprawione w 1.16) | do 1.15.1 `P.detour` czyściło tylko `planHero` lidera bez własnej pracy, więc lider zajęty łupem trzymał objazd po jego czasie (w powtórkach autora 3,7 s mgły wisiało do 13 s) i blokował nowe pomyłki i błądzenie we mgle; od 1.16 `partyThink` czyści go po `until` |
| Okienko Esencji w równaniu (naprawione w 1.16.1) | do 1.16 "+E" otwartej serii liczono bez `S.essK`, a wypłatę z nim, więc przy wypłacie liczba podskakiwała o ok. 10% |
| Esencja elementu na jego karcie (naprawione w 1.16.1) | do 1.16 "Ostatnia fala: ... Esencji" liczyło przyrost `fl.score` w czasie odpalenia, a ten rośnie tylko przy wypłacie serii, więc na karcie było prawie zawsze 0; od 1.16.1 liczy się przyrost `fl.prov` (wartość chwilowa Grozy z tego odpalenia, bez dopłaty combo wstecz) |
| Zwiad w bardzo zabójczym lochu (1.16) | zwiad wymaga 3+ w załodze i zdrowego złodzieja; w powtórkach runów autora drużyna bywa przerzedzona po kilkunastu sekundach (złodziej często ginie pierwszy), więc zwiadów jest mało (0-0,75 na falę); w spokojniejszym lochu 12 pokoi ok. 2 na falę. Do decyzji autora, czy to wystarcza |
| Mag i kapłan (naprawione w 1.17) | rzucali czary także w panice i w ucieczce; od 1.17 nie |
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
| Podgląd fali (1.24) | druga linia ucina słowa z wielokropkiem przy długich nazwach |
| Podpowiedzi 1.19-1.24 przez `setHint` | rozłam, "nie zostawię", wyczerpanie, liczba sekund "jeszcze chwila": niewidoczne (martwe `setHint`), zostają napisy nad bohaterami |
| Pasek strachu przy podzielonym ekranie (1.24) | stuknięcie może trafić w niewidoczny pasek z drugiej połówki (sekcja 08, rozdział 10 #18) |
| Podpowiedzi 1.26 przez `setHint` | poziomy rodzin w zakładce Loch i omen na starcie fali niewidoczne (widać tylko napis nad wejściem), choć "Jak grać" odsyła do zakładki Loch |
| Dymek łupu (1.26) | dalej "+25% ceny", a `LOOT_STEP` = 1,15 |
| Karta serca (1.26) | "fala musi dać co najmniej N-P" bez Kamiennego serca (75%) |

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
| `statsTable` (`p8b_ui.js`) | nigdzie niewołana; razem z wierszami dopisanymi w 1.16 i 1.17 (sekcja 08, rozdział 10) |
| Obsługa łączenia w martwym oknie wyboru (`takeCard`, `renderReplace`, 1.24) | okno `upgrade` dalej nieosiągalne |
| `TUT_POP.omen` (1.26) | tekst jest, ale nic nie woła `tutPop('omen')` |
| CSS `.hungerrow.take` (1.26) | klasa `take` nigdzie nie jest dodawana |
| `ART.family` (herby rodzin, 1.26) | gotowe w `p7c_art.js`, nieużywane w UI |
| `omenK` z kluczami `tithe`, `feast`, `heartCry`; `mods.reactGz` (1.26) | żaden omen ani karta ich nie ustawia (zawsze wartość domyślna) |
| mnożnik `(t3B(m) ? 1 : 1)` u szamana (1.26) | nic nie robi |
| `onLootRival`, `P.lootRivals`, `P.gifts`, `P.lootedDead` (1.20) | haki dla 1.21-1.22; `onLootRival` dalej wołane dla dwóch chciwych, ale nic poza statystyką z niego nie korzysta |

## 11.4 Uwagi do przenoszenia

- `Math.round` w JS zaokrągla połówki w górę, a `Math.Round`/`Mathf.Round` w C# do parzystej: użyj `Mathf.Floor(x + 0.5f)` (dotyczy m.in. głodu serca, cen kart, poziomów, HP, odwagi).
- Krok symulacji prototypu zależy od liczby klatek (najwyżej 0,05 s czasu gry), więc prototyp nie jest deterministyczny; w Unity stały krok i losowanie z ziarnem (sekcja 02).
- `Map` w JS zachowuje kolejność wstawiania, a kod na niej polega (kolejność odpalania, mówienia); w C# trzeba to odtworzyć listą.

## 11.5 Pozostałe znane problemy z listy po 1.17.1 (`TODO_FIX.md`) w stanie 1.24

| # | Problem | Stan w 1.24 |
|---|---|---|
| 1 | kwestia `rkEnter` ginie po kwestii efektu; licznik i tak rośnie | częściowo: od 1.18 kolejkowana przy efekcie (+0,2 s); licznik dalej przed powiedzeniem |
| 2 | `seesSpot`: `roomOf` daje id także korytarzom, a komentarz mówi o 3,5 pola w korytarzu | otwarte (korytarz widziany w całości, 3,5 pola tylko na polu drzwi) |
| 3 | `convoStart`: wymiana na trzy głosy bez C | naprawione w 1.21 |
| 4 | `fitLine` przed sprawdzeniem priorytetu i kolejki: statystyki i pamięć także dla kwestii, które nie padają | otwarte |
| 5 | `chatTry` liczy ticki bez mówiącego | częściowo: od 1.21 tylko z wybranym mówiącym |
| 6 | karta bohatera "płonie" przy krwawieniu | naprawione ("krwawi") |
| 7 | teksty Hartowanych ostrzy i Oleju w szczelinach | naprawione w 1.18 |
| 8 | `CONVO.mutinyStart` B nie może być starym przywódcą, `riftStart` B nie dołączającym | naprawione w 1.19 (`P.convoNot`) |
