# 01. Gra w skrócie

Ta sekcja mówi, czym jest gra i czego nie wolno zgubić przy przenoszeniu. Liczby i reguły są w sekcjach 03-08, a tu tylko ich streszczenie z odnośnikami.

## 1.1 Karta gry

| Pole | Ustalenie |
|---|---|
| Tytuł roboczy | You are the dungeon |
| Pitch | Zbuduj loch, zwab bohaterów i pozwól im prawie wygrać. |
| Gatunek | roguelite + budowanie lochu (strategia), jedna ręka, pion |
| Platforma | Android (telefon), Unity 6 |
| Widok | 2.5D z modułów 3D: budowa w wysokiej izometrii (obrót 45°, nachylenie 55°), fala w izometrii 2:1 (obrót 45°, nachylenie 30°); gracz nie obraca kamery |
| Oprawa | dark fantasy z komediowym mrokiem: zimny kamień, czarne żelazo, kość, krew, mosiądz, pochodnie; postacie w pixel arcie |
| Grupa | 14-30 lat |
| Sesja | fala z budową 2-4 min, run (10 fal) ok. 25-40 min, zapis po każdej fali |
| Model biznesowy | darmowa: reklamy + waluta premium (szczegóły w sekcji 10, poza prototypem) |
| Marka wydawcy | bacjumGames (roboczo) |
| Język | polski (bazowy), angielski później |

## 1.2 Pętla

```
start runu (loch 3 pokoi, serce z 3 kryształami, 25 Esencji, 2 darmowe pułapki od lochu (1.26); pierwszy run odsłania grę z falami, 1.24)
powtarzaj 10 razy:
  BUDOWA (bez zegara): sklep z darmową kartą (od 1.24 druga kopia łączy się w kartę ★; od 1.26 rząd Dar serca po każdym poziomie serca i Runa rodu) -> stawianie, przenoszenie, ulepszanie (3. poziom: cecha A albo B), kopanie pokoi, Ofiara sercu -> "Wypuść falę"
  FALA: drużyna wchodzi, zwiedza, bierze łup, idzie do serca po kryształ (może się rozłamać, kłócić, opłakiwać,
        bronić niosącego; Nemezis wraca z urazą; po 3 min wyczerpani wychodzą, 1.19-1.24)
        gracz stuka skill checki (ciosy pułapek), może przyspieszać (przytrzymanie palca) i dostawiać pułapki
        rany i strach = Groza; Groza × Chciwość × Combo = Esencja; serce zjada swoją porcję, a syte bierze Daninę w Nasycenie
        (poziomy serca); statusy i reakcje; powalone potwory wstają w następnej budowie; omeny w falach 3, 6, 8 (1.26)
  PODSUMOWANIE FALI: Esencja, serce (od 1.26 niedobór zabiera z sakiewki, kryształ pęka dopiero, gdy sakiewka nie wystarczy), kryształy, następna drużyna
wygrana: przetrwane 10 fal (boss w fali 5, bohater z przepowiedni w fali 10) z co najmniej 1 kryształem
potem opcjonalnie fale bez końca na wynik
przegrana: 0 kryształów (kradzież albo głodne serce przy pustej sakiewce)
```

Co robi palec:

| Faza | Gest | Skutek |
|---|---|---|
| Budowa | stuknięcie kafelka w pasku, potem pola | postawienie elementu (przyciąga się do najbliższego pasującego pola) |
| Budowa | stuknięcie postawionego elementu albo mebla | podniesienie, potem stuknięcie pola = przeniesienie (za darmo) |
| Budowa | dwa szybkie stuknięcia w element | ulepszenie (poziom 2, poziom 3 z cechą) |
| Budowa | przytrzymanie elementu | zdjęcie ze zwrotem Esencji (meble lochu nic nie oddają) |
| Budowa | przytrzymanie kafelka w pasku | opis elementu |
| Budowa | przeciąganie | kamera |
| Fala | stuknięcie w mapę przy skill checku | cios: obwódka = draśnięcie, pełne pole = krytyk, czaszka = ktoś zginie |
| Fala | przytrzymanie palca na mapie | przyspieszenie ×3, checki rozstrzygają się same (zapamiętany wynik albo draśnięcie) |
| Fala | stuknięcie bohatera albo listy | karta bohatera, gra stoi |
| Fala | ▲ Budowa | pauza i widok budowy (dostawianie w trakcie fali) |

## 1.3 Filary (z GDD)

| Filar | Co to znaczy |
|---|---|
| 1. Widzisz, planujesz, reagujesz | czytasz mapę i drużynę, budujesz między falami, w fali dostawiasz i trafiasz checki |
| 2. Każdy run jest inny | losowa oferta kart, losowi bohaterowie (klasa, cechy, ciało, fobie, od 1.21 więzi), wyłom, gildia odpowiada na Twój styl, od 1.23 Nemezis, od 1.26 omeny fal i wybór cech A/B |
| 3. Nieustannie poszerzasz arsenał | w runie: talia, ulepszenia, odblokowania; między runami: kolekcja i serce lochu (poza prototypem, decyzja autora 20.10) |
| 4. Bohaterowie żyją | proste sterowanie, ale bohaterowie reagują realistycznie: dymki, narady, strach, fobie, rany, powroty z blizną; od 1.19-1.23 rozłamy i bunty, dzielenie się sprzętem, więzi i dramaty, finał z kryształem, Nemezis |

Czym gra NIE jest: bez energii i timerów, nie test refleksu (check to wyczucie rytmu, przytrzymanie palca go pomija), bez zarządzania ludźmi i morale. Lekcja z Dungeon Keepera: żadnych mikropłatności blokujących grę.

Rdzeń to skill check: gracz robi go setki razy w runie, więc ma bawić bez ulepszeń. Wyróżnik wobec konkurencji: ekonomia z cierpienia bohaterów (Groza × Chciwość × Combo), żywe reakcje bohaterów i checki w trakcie fali.

## 1.4 Liczby w pigułce (Prototype 1.26)

| Rzecz | Wartość | Gdzie szczegóły |
|---|---|---|
| Fale w runie | 10 (`RUN_WAVES`), boss: czempion w 5, bohater z przepowiedni w 10, potem fale bez końca | 03, 04 |
| Kryształy | 3 (`DEFAULTS.crystals`), nie da się ich kupić (wyjątek: karta Żarłoczne serce); od 1.26 utracony może wrócić kartą Odrost z rzędu Dar serca (poziomy serca 3, 5, 7...) | 03 |
| Esencja na start | 25 (1.26), a loch stawia kolce i strzały za darmo; do 1.25.1: 30, z czego 6 na te pułapki | 03 |
| Przychód po fali | +6 (`DEFAULTS.waveIncome`, 1.26; było 8) plus karty | 03 |
| Drużyna | 3 bohaterów w falach 1-3 (w pierwszym runie z przewodnikiem fala 1: 2 nowicjuszy), 4 w falach 4-10, czempion i legenda jako piąty, 5 od fali 11, 6 od fali 15; od 1.26 fale 1-4 grają jak dawne 1,5; 2,25; 3; 4 (1.25.1: 2; 2,75; 3,5; 4,25; 1.24: 3; 3,75; 4,3; 4,6), a pierwszy run z przewodnikiem jak w v58; od 1.26 10 klas (paladyn i tropiciel od fali 4, alchemik od 6, kultysta z omenem Pielgrzymka), charakter u ok. 60% | 04 |
| Więzi (1.21, 1.24) | pierwsza para 75%, druga 45%: przyjaciele, rodzeństwo 15%, mistrz i uczeń 20%, rywale 45% | 04, 06 |
| Nemezis (1.23) | powracający drugi raz albo z kryształem; +2 poziomy, odwaga ×1,4, uraza, zna swoje pokoje; najwyżej 2; nagroda za głowę 10 + 5 × powroty | 04, 06 |
| Głód serca | od 1.26 tabela `HUNGER_T`: fale 2-10: 38, 50, 72, 104, 150, 190, 230, 272, 350 (dalej ×1,2), plus 1 za każdego powalonego potwora i 2 za demona; serce zjada pierwsze porcje (od 1.16.1 na bieżąco); niedobór po fali bierze z sakiewki, kryształ pęka dopiero, gdy sakiewka nie wystarczy (do 1.25.1: 37 × 1,25^(fala - 2), fala poniżej progu oddawała wszystko i kryształ) | 03 |
| Chciwość | √(2 · surowa − 1), rośnie coraz wolniej | 03 |
| Combo | różne pułapki pod rząd, każda w 3 s od poprzedniej (w ciszy zegar płynie 4 razy wolniej); Esencja ×(1 + 0,25 na stopień, max ×2,5); obrażenia i strach +12% na stopień (max combo 7) | 03, 05 |
| Esencja z Grozy | Groza × Chciwość × Combo × 1,1 (`S.essK`, 1.12.1); od 1.26 także mnożniki kart (Koronacja strachu, Krwawa łaźnia, Przeklęta korona...) | 03 |
| Serce (1.26) | syte serce bierze Daninę (30% dalszych wypłat, z Dziesięciną 45%) w Nasycenie; progi poziomów 30, 75, 135, 210, 300, 410, 540 (+150); każdy poziom = darmowa karta grupy Serce (rząd Dar serca), poziomy 2/4/6 +1 miejsce w talii, 3/5/7 możliwy Odrost; Ofiara w budowie 1:1, do 40 na przerwę; Uczta 0,8 × poziom za zabitego przez potwora | 03 |
| HP bohaterów | rosną z poziomem, +10% w fali 3 i +20% od fali 5 (1.12); Groza i strach z ran liczone bez tego dodatku (1.12.1) | 04 |
| Cierpliwość | 120 s, potem narada (1.17): do domu, szturm na serce (tylko gdy przywódca wie, gdzie jest) albo jeszcze chwila (+30 s, raz na falę); bez wyboru od razu odwrót; tylko bohater z przepowiedni zawsze szturmuje serce; w naradach i na odpoczynku płynie 2 razy wolniej (1.12.1); od 1.24 po 180 s wyczerpanie (wychodzą sami), po 270 s utknięci wychodzą z miejsca, kryształ wraca do serca | 03, 04, 06 |
| Pole | jeden bohater na polu, jak potwory; dzielą pole tylko przy mijaniu (1.12.1) | 06 |
| Talia | 7 miejsc, schowek 3; od 1.24 druga kopia karty łączy się w kartę ★ (jedno miejsce, moc 2,5 kopii, cecha grupy), trzecia nie wypada | 03 |
| Karty | od 1.26 202 (163 do talii, 34 odblokowania, 5 jednorazowych); 1.26: +62 (41 kart do talii, w tym 15 z grupy Serce, 20 odblokowań, Odrost); 1.18: +28, w tym 21 kart komnat i efektów wypadających tylko z nimi w lochu | 03, B |
| Ceny kart | od 1.26 zwykła 5, rzadka 9, legendarna 14, odblokowanie 7 (było 6, 10, 16, 8); Runa rodu 5 + poziom; sprzedaż ★ za dwie | 03 |
| Zapadnia (1.24) | koszt 6 (było 4); bohater spada najwyżej 2 razy na falę (elita i poz. 12+: raz) | 05 |
| Skill checki (1.24) | w falach 1-2 i w samouczku przerwa 1,5 s między checkami (w niej pułapki biją jak draśnięcie); okno draśnięcia kręgu ×1,6, wahadła ×1,65 | 05 |
| Pierwsze runy | do 1.23 4 etapy w 4 runach (1.12); od 1.24 jeden run: etapy od fal 1, 3, 5, 7; przewodnik 16 kroków, jedno wymagane stawianie; porady przewodnika w fali zatrzymują grę do zatwierdzenia albo wykonania (1.15.1) | 03, 08 |
| Komnaty | 15 rodzajów (1.26: + Laboratorium, Cmentarz, Wrota otchłani) po 10 Esencji (było 12): elementy rodziny w pokoju swojej komnaty mają cechę A 3. poziomu, a na 3. poziomie +25% mocy (`KIND_POW` 1,25); nakładają się z 9 efektami pokoi | 05 |
| Rodziny (1.26) | 9 rodzin elementów; Runa rodu w każdym sklepie podnosi rodzinę do poziomu 5: +8% mocy i -4% odnowienia na poziom | 03, 05 |
| Statusy i reakcje (1.26) | 11 statusów (spowolnienie, unieruchomienie, podpalenie, krwawienie, trucizna, olej, woda, zaraza, znak, uwiedzenie, oszołomienie) i 5 reakcji (Pożar, Detonacja, Porażenie, Para, Powstanie); piąty typ obrażeń: porażenie | 05 |
| Omeny (1.26) | 10 omenów w falach 3, 6, 8 (bez końca: każda fala bez bossa); utrudniający daje nagrodę, ułatwiający podnosi głód | 04 |
| Rozdzielenie | Groza na sekundę: zwiad 0,04, sam 0,09, zgubiony 0,12 (12 s, zwykle też samotność); strach: 1 / 2,5 / 4 (1.16) | 03, 06 |
| Dzielony ekran | gdy cała drużyna zmieściłaby się na jednym ekranie tylko w skali poniżej 19 px na pole (1.16.1; było 16) | 08 |
| Kwestie | `SAY` 395 kluczy, 4233 kwestie (1.26; 1.24: 376 i 4107; 1.17.1: 272 i 3173); bohater mówi tylko o tym, co widział albo poczuł w tej fali (pamięć i filtr `LINE_NEEDS`), a small talk w towarzystwie z szansą 0,45 dotyczy tylko 2-3 rzeczy z jego pamięci (2 ostatnie i 1 losowa) | 06 (6.7.10), A |
| Klatki (1.24) | fala najwyżej 60/s, budowa 30/s, bez ruchu i dotyku obraz stoi | 07 |

Wartości policzone przez sam prototyp (do testów jednostkowych w Unity): `data/golden_1.13.1.json`.

## 1.5 Decyzje autora, których nie wolno zgubić

Każda z nich zapadła po testach i ma swoje uzasadnienie w historii projektu (dokument projektu `claude/analiza-rynku-i-plan.md` i tabela zmian w GDD).

| Data | Decyzja |
|---|---|
| 16.10 | Bohaterowie mają "prawie wygrać": im dłużej żyją i cierpią w lochu, tym więcej Esencji. Wypędzeni od razu nie nakarmią serca. |
| 16.10 | Skill check zamiast ręcznego odpalania; najpierw faza "Uwaga!", potem koralik; stuknięcie w dowolne miejsce mapy. |
| 17.10 | Jeden loch na run, 10 fal, boss w 5 i 10, potem fale bez końca. |
| 19.10 | Jedna waluta: Esencja. Groza (rany i strach) × Chciwość × Combo. Combo działa wstecz jak w Balatro. Punkty nie dają kart. |
| 19.10 | Między falami stuknięcie = przeniesienie, przytrzymanie = zdjęcie ze zwrotem. |
| 19.10 | Sklep jako osobny ekran po każdej fali (darmowa karta za przetrwaną falę), odświeżanie, sprzedaż, schowek. |
| 20.10 | Kamera: wysoka izometria w budowie, 2:1 w fali, bez przycisku pauzy (rozwinięty pasek budowy = pauza); pasek zwija się tylko po stuknięciu i razem z kamerą. |
| 20.10 | Ściany 2× wyższe; w fali kładą się całe pokoje między kamerą a drużyną. |
| 20.10 | Wynik checku zostaje przy pułapce między falami (pyta znowu po ulepszeniu albo gdy bohaterowie ją wyłączą). Check spowalnia świat do ×0,25, a nie zatrzymuje go. |
| 20.10 | 4 bohaterów zamiast 5-6 (bossowie jako piąty), chciwość rośnie coraz wolniej. |
| 20.10 | Serce zjada swoją porcję (wartość progu), a próg pasuje do krzywej zdobywania Esencji: 37 × 1,25^(fala - 2). 3 kryształy zostają. |
| 20.10 | Bohaterowie mówią po kolei; przekrzykują się tylko w chaosie. |
| 20.10 | 1.12: samouczek rozłożony na 4 pierwsze runy, bez podpowiedzi u góry ekranu; combo wzmacnia obrażenia i strach i naprawdę wymaga grupowania; dłuższe najazdy zamiast krótszego budowania (budowanie własnego lochu to frajda); bez ważenia ofert sklepu (trywializuje grę i odbiera sens odświeżaniu). |
| 20.10 | 1.12.1: bohater zajmuje jedno pole jak potwór (dwóch na jednym polu tylko przy mijaniu); narady i odpoczynek to scenki z dymkami, a nie zatrzymanie drużyny; przychód Esencji nie może spaść przy zmianach balansu (wrócił do poziomu 1.11.1). |
| 20.10 | 1.13: bohaterowie rozmawiają ze sobą (komentują nawzajem swoje kwestie, działania, wpadki i sukcesy); narada tylko dla tych, którzy stoją razem (mogą być dwie naraz), reszta robi swoje; nikt nie stoi ani nie odpoczywa w pułapce. |
| 20.10 | 1.13.1: sam bohater nie mówi do powietrza: myśli na głos, a kwestie dla innych przemilcza. |
| 20.10 | 1.13: skill check u góry mapy, bo na telefonie kciuk zasłaniał go na dole (odpowiedź to nadal stuknięcie w dowolne miejsce mapy); spokój (samo przyspieszenie i wolniejszy zegar combo) trwa też w trakcie odpoczynku i narad, gdy ktoś siedzi w zapadni i gdy wszyscy są w klatkach. |
| 20.10 | Meta (kolekcja, serce lochu) poza prototypem; prototyp miał tylko udowodnić pętlę. Dźwięki zostają, autor je lubi. |
| 20.10 | Wygląd, działanie i dźwięk prototypu autor ocenił jako "fenomenalna robota": wersja w Unity ma go wiernie odtworzyć, a nie wymyślać od nowa. |
| 21.10 | 1.14: podzakładki w pasku budowy (Rany / Strach), odkryte kartą pułapki i potwory zostają na kolejne runy. |
| 21.10 | 1.15: komnaty (rodzaj pokoju dla rodziny pułapek i potworów) nakładają się z efektami mechanicznie i graficznie; drobne wypukłe przedmioty i cząsteczki zamiast malowania podłóg; wszystko poza postaciami ma bryłę. |
| 21.10 | 1.15.1: każda porada przewodnika w fali zatrzymuje grę do zatwierdzenia albo wykonania; podzakładki zawsze widoczne. |
| 21.10 | 1.16: bohaterowie mogą się zgubić (Groza jak dotąd), ale mogą też rozdzielić się celowo, np. na zwiad, co nabija Grozę wolniej. |
| 21.10 | 1.16.1: pasek serca nie czeka na koniec combo; ekran dzieli się trochę wcześniej. Tego dnia autor pierwszy raz od utrudnienia gry przeszedł 10 fal. |
| 21.10 | 1.17: po 2 minutach nie sztywny odwrót ani szarża, tylko narada, na której bohaterowie decydują razem (przegłosowany może wrócić sam). Bohaterowie wiedzą o sobie nawzajem tylko tyle, ile widzą i słyszą (np. czyjaś śmierć w innym pokoju). Zwiedzanie ma być naturalniejsze: ciekawość, rozglądanie się, przeszukiwanie mebli. Kwestie mają mówić prawdę o tym, co bohater robi. |
| 21.10 | 1.17.1: bohaterowie mówią o komnatach, efektach, potworach, łupach i pułapkach, które widzą albo widzieli w tej fali, a nie o rzeczach, których w lochu nie ma ("wojownik powiedział, że płomienie będą mu się śniły, a na planszy nie było nigdzie ognia"). Krwawienie z kolców to rana kłuta, nie ogień. |
| 21.10 | 1.18: 28 nowych kart (karty komnat i efektów wypadają tylko z nimi w lochu); `u-portrait` usunięta; `vaultsnap` i `restock` jedyne, druga kopia innych coś dodaje. |
| 21.10 | 1.19: Rozłam: drużyna może się rozpaść na dwie grupy (rozwidlenie, niespokojny, narada, bunt, foch), które łączą się przy spotkaniu; jedna druga grupa naraz. |
| 21.10 | 1.20: ekwipunek i łup: pochodzenie przedmiotów, rzeczy poległych, przeszukanie ciała, dzielenie się, ciężar, kto bierze łup, latarnia, łom, krytyk wybija przedmiot, brzuch mimika, bomby w ogniu, powracający z trofeami. Własny wybity przedmiot podniesiony z powrotem nie jest łupem (bez tego Esencja +25-30%). Prostsza opcja wszędzie, gdzie plan dawał wybór. |
| 21.10 | 1.21: więzi i dramaty: pary (przyjaciele, rodzeństwo, rywale, mistrz i uczeń), żałoba i zemsta, "Nie zostawię cię", kłótnie o łup, sprzeciw nad ciałem, zakłady (rzadkie z założenia). |
| 21.10 | 1.22: finał fali: eskorta niosącego, przekazanie kryształu, ostatni bastion, poświęcenie, "ty pierwszy", opukiwanie, "nie tędy", szyk w walce (granice: kryształy +25%, Esencja -10%; wyszło +14% i +5%). |
| 21-23.10 | 1.23: Nemezis: tytuł według przeżyć, uraza, zawsze wraca, prowadzi, nie ucieka ze strachu powyżej 15% HP, nagroda za głowę; pamięć poległych tylko w pełnej grze. |
| 23.10 | 1.24: połączone karty ★; zapadnia 6 i limit upadków; trudniejsze pierwsze fale ("pierwszy run tak trudny jak teraz trzeci"); wyczerpani bohaterowie wychodzą zamiast znikać; zdarzenia 1.19-1.23 częstsze (raz na 2-3 fale, z napisami); dane testowe v59 (status, kryształy, czas, gracz); pytanie o niewydaną Esencję; spokojne checki w falach 1-2 i szersze okna kręgu i wahadła; mapa bez ramki; znaczniki niskich ścian; nauka w jednym runie z krótszym przewodnikiem; animacje; podgląd następnej fali; pasek strachu; szaman widać, krata tylko przy drzwiach; telefon się nie grzeje. |
| 25.10 | 1.26 "Serce zabiera": serce nie zjada kryształu od razu, tylko bierze niedobór z sakiewki, a syte rośnie poziomami (Danina, Nasycenie, Ofiara); Dary serca to karty (rząd Dar serca, grupa Serce), Zwoje i Wróżby z planu wycięte; mniej Esencji w grze (start 25, dochód 6, tańsze elementy i karty); 10 nowych pułapek, 10 potworów, 4 klasy, statusy i reakcje, rodziny z Runami, 3 komnaty, cecha A albo B na 3. poziomie, odradzanie potworów i Uczta, omeny; ilustracje kart, scenki na kafelkach i statusy malowane w kodzie (`p7c_art.js`), wszystko w palecie 32 kolorów. |

## 1.6 Co jest w prototypie, a czego nie ma

| W prototypie (do przeniesienia 1:1) | Planowane, poza prototypem |
|---|---|
| cały run 10 fal + fale bez końca, 10 klas (od 1.26), 25 pułapek, 18 potworów, 6 rodzajów łupu (z Przynętą), 8 budowli-kontr, skrzynia, 9 efektów pokoi (dawne typy pokoi), 15 komnat, 202 karty z łączeniem ★, 2 narzędzia bohaterów (latarnia, łom), statusy, reakcje, rodziny, omeny, poziomy serca | meta między runami: serce lochu (organy), kolekcja, trofea |
| AI bohaterów z rozmowami, gildia, powracający, Nemezis, wyłom, plotki, Rozłam, więzi, finał fali, animacje | Infamia jako poziomy trudności po wygranej (jak stawki w Balatro) |
| sklep, talia, schowek, rangi, rekordy | waluty: monety (miękka) i Dusze (premium), nagrody |
| pierwszy run z odsłanianiem gry z falami (1.24), przewodnik, karty pierwszego spotkania, podgląd następnej fali, pasek strachu | reklamy (odświeżenie oferty za reklamę jest tylko symulowane), kontynuacja za reklamę, zakupy |
| zapis runu, ustawienia, dane testowe na Dysk Google | modyfikatory runu (np. Goblinia Grota), codzienne wyzwanie, lokalizacja EN |

## 1.7 Gdzie są źródła prawdy

| Co | Gdzie |
|---|---|
| Zachowanie gry (ostateczne) | kod prototypu: repo `Akrobacjum/yatd-4da7ul8eap`, katalog `src/` (Prototype 1.26, 25.10.2026). Gdy GDD i kod się różnią, rację ma kod. |
| Grywalny prototyp | https://akrobacjum.github.io/yatd-4da7ul8eap/ (najnowsza wersja) oraz `archiwum/` w repo (każda wersja jako jedna strona) |
| Projekt i uzasadnienia | GDD "GDD - You are the dungeon" (dokument w Claude: https://claude.ai/code/artifact/c213e326-fe7e-4be8-b628-1b869b576d8d) |
| Historia decyzji, rynek, harmonogram | dokument projektu `claude/analiza-rynku-i-plan.md` w projekcie Claude "You Are The Dungeon" |
| Dane treści (elementy, karty, klasy...) | `docs/unity/data/` w repo prototypu (eksport z `src/p1_config.js`, od 1.26 stan 1.26; opis zmian 1.18-1.26 w załączniku A) |
| Ta specyfikacja | `docs/unity/` w repo prototypu i `claude/unity-spec.md` w projekcie |
