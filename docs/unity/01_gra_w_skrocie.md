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
start runu (loch 3 pokoi, serce z 3 kryształami, 30 Esencji, 2 pułapki od lochu)
powtarzaj 10 razy:
  BUDOWA (bez zegara): sklep z darmową kartą -> stawianie, przenoszenie, ulepszanie, kopanie pokoi -> "Wypuść falę"
  FALA: drużyna wchodzi, zwiedza, bierze łup, idzie do serca po kryształ
        gracz stuka skill checki (ciosy pułapek), może przyspieszać (przytrzymanie palca) i dostawiać pułapki
        rany i strach = Groza; Groza × Chciwość × Combo = Esencja; serce zjada swoją porcję
  PODSUMOWANIE FALI: Esencja, serce, kryształy, następna drużyna
wygrana: przetrwane 10 fal (boss w fali 5, bohater z przepowiedni w fali 10) z co najmniej 1 kryształem
potem opcjonalnie fale bez końca na wynik
przegrana: 0 kryształów (kradzież albo głodne serce)
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
| 2. Każdy run jest inny | losowa oferta kart, losowi bohaterowie (klasa, cechy, ciało, fobie), wyłom, gildia odpowiada na Twój styl |
| 3. Nieustannie poszerzasz arsenał | w runie: talia, ulepszenia, odblokowania; między runami: kolekcja i serce lochu (poza prototypem, decyzja autora 20.10) |
| 4. Bohaterowie żyją | proste sterowanie, ale bohaterowie reagują realistycznie: dymki, narady, strach, fobie, rany, powroty z blizną |

Czym gra NIE jest: bez energii i timerów, nie test refleksu (check to wyczucie rytmu, przytrzymanie palca go pomija), bez zarządzania ludźmi i morale. Lekcja z Dungeon Keepera: żadnych mikropłatności blokujących grę.

Rdzeń to skill check: gracz robi go setki razy w runie, więc ma bawić bez ulepszeń. Wyróżnik wobec konkurencji: ekonomia z cierpienia bohaterów (Groza × Chciwość × Combo), żywe reakcje bohaterów i checki w trakcie fali.

## 1.4 Liczby w pigułce (Prototype 1.12.1)

| Rzecz | Wartość | Gdzie szczegóły |
|---|---|---|
| Fale w runie | 10 (`RUN_WAVES`), boss: czempion w 5, bohater z przepowiedni w 10, potem fale bez końca | 03, 04 |
| Kryształy | 3 (`DEFAULTS.crystals`), nie odrastają, nie da się ich kupić (wyjątek: karta Żarłoczne serce) | 03 |
| Esencja na start | 30, z czego loch od razu stawia kolce i strzały (6), zostaje 24 | 03 |
| Przychód po fali | +8 (`DEFAULTS.waveIncome`) plus karty | 03 |
| Drużyna | 3 bohaterów w falach 1-3 (w pierwszym runie z przewodnikiem fala 1: 2 nowicjuszy), 4 w falach 4-10, czempion i legenda jako piąty, 5 od fali 11, 6 od fali 15 | 04 |
| Głód serca | od fali 2: 37 × 1,25^(fala - 2) (37, 46, 58, 72, 90, 113, 141, 176, 221); serce zjada pierwsze porcje, fala poniżej progu oddaje wszystko i kryształ | 03 |
| Chciwość | √(2 · surowa − 1), rośnie coraz wolniej | 03 |
| Combo | różne pułapki pod rząd, każda w 3 s od poprzedniej (w ciszy zegar płynie 4 razy wolniej); Esencja ×(1 + 0,25 na stopień, max ×2,5); obrażenia i strach +12% na stopień (max combo 7) | 03, 05 |
| Esencja z Grozy | Groza × Chciwość × Combo × 1,1 (`S.essK`, 1.12.1) | 03 |
| HP bohaterów | rosną z poziomem, +10% w fali 3 i +20% od fali 5 (1.12); Groza i strach z ran liczone bez tego dodatku (1.12.1) | 04 |
| Cierpliwość | 120 s, potem odwrót (tylko bohater z przepowiedni szturmuje serce); w naradach i na odpoczynku płynie 2 razy wolniej (1.12.1) | 04, 06 |
| Pole | jeden bohater na polu, jak potwory; dzielą pole tylko przy mijaniu (1.12.1) | 06 |
| Talia | 7 miejsc, schowek 3 | 03 |
| Ceny kart | zwykła 6, rzadka 10, legendarna 16, odblokowanie 8 | 03 |
| Pierwsze runy | 4 etapy odsłaniania gry (1.12) | 03, 08 |

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

## 1.6 Co jest w prototypie, a czego nie ma

| W prototypie (do przeniesienia 1:1) | Planowane, poza prototypem |
|---|---|
| cały run 10 fal + fale bez końca, 6 klas, 16 pułapek, 8 potworów, 5 rodzajów łupu, 8 budowli-kontr, skrzynia, 9 typów pokoi, 113 kart | meta między runami: serce lochu (organy), kolekcja, trofea |
| AI bohaterów z rozmowami, gildia, powracający, wyłom, plotki | Infamia jako poziomy trudności po wygranej (jak stawki w Balatro) |
| sklep, talia, schowek, rangi, rekordy | waluty: monety (miękka) i Dusze (premium), nagrody |
| pierwsze 4 runy z odsłanianiem, przewodnik, karty pierwszego spotkania | reklamy (odświeżenie oferty za reklamę jest tylko symulowane), kontynuacja za reklamę, zakupy |
| zapis runu, ustawienia, dane testowe na Dysk Google | modyfikatory runu (np. Goblinia Grota), codzienne wyzwanie, lokalizacja EN |

## 1.7 Gdzie są źródła prawdy

| Co | Gdzie |
|---|---|
| Zachowanie gry (ostateczne) | kod prototypu: repo `Akrobacjum/yatd-4da7ul8eap`, katalog `src/` (Prototype 1.14, commit z 21.10.2026). Gdy GDD i kod się różnią, rację ma kod. |
| Grywalny prototyp | https://akrobacjum.github.io/yatd-4da7ul8eap/ (najnowsza wersja) oraz `archiwum/` w repo (każda wersja jako jedna strona) |
| Projekt i uzasadnienia | GDD "GDD - You are the dungeon" (dokument w Claude: https://claude.ai/code/artifact/c213e326-fe7e-4be8-b628-1b869b576d8d) |
| Historia decyzji, rynek, harmonogram | dokument projektu `claude/analiza-rynku-i-plan.md` w projekcie Claude "You Are The Dungeon" |
| Dane treści (elementy, karty, klasy...) | `docs/unity/data/` w repo prototypu (eksport z `src/p1_config.js`) |
| Ta specyfikacja | `docs/unity/` w repo prototypu i `claude/unity-spec.md` w projekcie |
