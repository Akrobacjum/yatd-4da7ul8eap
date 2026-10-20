# You are the dungeon: specyfikacja przeniesienia do Unity

Stan: Prototype 1.13.4 (21.10.2026): złodziej nie drepcze przed pułapką ścienną, krótsza scenka przed groźnym pokojem, rozmowy bohaterów, własne kwestie na samotność, narady tylko dla tych, którzy stoją razem, nikt nie stoi w pułapce, skill check u góry mapy, spokój w scenkach. Tabele w `data/` są z 1.13.1. Ta specyfikacja jest dla kolejnego czatu (albo programisty), który zbuduje grę w Unity 6 bez dostępu do rozmów, w których powstawał prototyp. Zawiera wszystko, co trzeba wiedzieć, żeby odtworzyć grę wiernie, plus plan, testy i dane.

## Od czego zacząć

1. **01 Gra w skrócie**: czym jest gra, pętla, liczby w pigułce, decyzje autora, których nie wolno zgubić.
2. **02 Architektura w Unity**: silnik, pakiety, warstwy, model symulacji, dane.
3. **09 Plan wdrożenia i testy**: etapy M0-M7, testy wzorcowe, odtwarzanie fal, sposób pracy z autorem.
4. **11 Otwarte kwestie**: co jest nierozstrzygnięte, znane błędy i martwy kod prototypu.
5. Potem sekcje systemów (03-08) w kolejności etapów z sekcji 09.

## Spis

| Plik | Sekcja | Co zawiera |
|---|---|---|
| `00_README.md` | Spis | ten plik |
| `01_gra_w_skrocie.md` | 01 | karta gry, pętla, gesty, filary, liczby, decyzje autora, zakres, źródła prawdy |
| `02_architektura_unity.md` | 02 | Unity 6 LTS, URP, uGUI, warstwy i zależności, czas i losowość, kolekcje, dane, odpowiedniki plików, katalogi, wydajność, zasady kodu |
| `03_przebieg_i_ekonomia.md` | 03 | run i fala od początku do końca, Groza, seria combo, chciwość, Esencja, głód serca, kryształy, przychód, sklep, talia, schowek, modyfikatory kart, rangi, pierwsze runy |
| `04_fale_i_bohaterowie.md` | 04 | skład fal, poziomy i HP, bossowie, imiona, osobowości, ciała, fobie, ekwipunek, gildia, łowcy, powracający, wyłom, plotki, cierpliwość |
| `05_pulapki_walka_checki.md` | 05 | wyzwalanie i odpalanie każdej pułapki, potwora i budowli, poziomy 2-3, obrażenia, strach, typy pokoi, skill checki |
| `06_ai_bohaterow.md` | 06 | ruch i drogi, decyzje drużyny, wiedza, łup, klasy, ucieczki, kradzież kryształu, rozmowy i dymki |
| `07_mapa_petla_zapis.md` | 07 | model lochu, generator, stawianie i narzędzia, pętla gry i kolejność kroku, zapis, ustawienia, dane testowe |
| `08_interfejs_kamera_grafika_dzwiek.md` | 08 | HUD, pasek budowy, ekrany, gesty, kamera i rzut, rysowanie i animacje, dźwięk i muzyka, przewodnik i karty pierwszego spotkania, lista assetów |
| `09_plan_i_testy.md` | 09 | etapy, testy wzorcowe, scenariusze, odtwarzanie fal, ryzyka |
| `10_monetyzacja_meta_wydanie.md` | 10 | ustalenia o reklamach, walutach i mecie, co prototyp symuluje, wymagania Google Play |
| `11_otwarte_kwestie.md` | 11 | decyzje do podjęcia, niespójności i martwy kod znalezione w prototypie |
| `A_dane.md` | zał. A | opis plików w `data/` |
| `B_karty.md` | zał. B | wszystkie 113 kart z efektem w kodzie |
| `C_mapa_kodu.md` | zał. C | spis funkcji prototypu z komentarzami |
| `data/` | dane | tabele treści z prototypu w JSON (`yatd_content_1.13.1.json` = wszystko w jednym pliku), statystyki poziomów, wartości wzorcowe |
| `parity/` | testy | wzorcowe wyniki odtworzeń dwóch runów autora na 1.13 |
| `shots/` | obrazy | zrzuty ekranu prototypu (sekcja 08) |
| `tools/` | skrypty | `dump.js` (eksport danych), `golden.py` (wartości wzorcowe) |

## Konwencje

- Odnośniki do kodu: `plik.js: funkcja` (pliki w `src/` repo prototypu). Numerów linii nie ma, bo się zmieniają; szukaj po nazwie (załącznik C).
- Liczby są przepisane z kodu Prototype 1.12.1. Gdy coś jest niepewne, sekcja pisze "niepewne: sprawdź ...".
- "tylko prototyp" oznacza rzecz związaną z przeglądarką, testami albo wydajnością prototypu; obok jest odpowiednik w Unity.
- Gdy specyfikacja i kod prototypu się różnią, rację ma kod (i trzeba poprawić specyfikację).

## Gdzie to leży

- Repo prototypu `Akrobacjum/yatd-4da7ul8eap`, katalog `docs/unity/` (cała specyfikacja z danymi, skryptami i zrzutami).
- Projekt Claude "You Are The Dungeon": dokument `claude/unity-spec.md` (sekcje 00-11 i załączniki w jednym pliku, bez danych JSON).
- GDD: https://claude.ai/code/artifact/c213e326-fe7e-4be8-b628-1b869b576d8d
- Grywalny prototyp: https://akrobacjum.github.io/yatd-4da7ul8eap/
