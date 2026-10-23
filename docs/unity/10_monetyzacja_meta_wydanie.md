# 10. Monetyzacja, meta i wydanie

Prototyp sprawdzał tylko pętlę rozgrywki, więc ta część jest najmniej ustalona. Poniżej: co już postanowiono, co prototyp symuluje i co trzeba zaprojektować z autorem przed etapem M6. Niczego z tej sekcji nie wdrażaj bez potwierdzenia autora.

## 10.1 Ustalenia (dokument projektu, 15.10.2026, i GDD)

| Temat | Ustalenie | Stan |
|---|---|---|
| Model | darmowa gra: reklamy + waluta premium | ustalone |
| Waluty | miękka: monety (punkty za run, reklamy, produkcja serca); premium: Dusze | robocze; nazwa "Dusze" zderza się z duszą zabitego bohatera w runie (otwarte) |
| Reklamy nagradzane | kontynuacja po przegranej (1 kryształ, raz na run); odświeżenie oferty sklepu (raz na sklep); ×2 monet po runie | pierwsze dwie są w prototypie jako symulacja (10.2) |
| Wskrzeszenie bossa | w pierwotnym planie: wskrzeszenie finałowego bossa raz za reklamę, drugi raz za Dusze | z czasów, gdy boss był po stronie gracza; do ponownej decyzji |
| Reklama pełnoekranowa | co run, od 2. runu | ustalone wstępnie |
| Meta | serce lochu jako oprawa (organy: Kuźnia, Legowisko, Skarbiec, Ołtarz; produkcja monet bez blokowania gry), trofea w wyglądzie serca i komnaty mistrza, kolekcja | poza prototypem (decyzja 20.10), do zaprojektowania |
| Poziomy trudności | Infamia po wygranej jak stawki w Balatro | planowane |
| Czego unikać | mikropłatności i timery blokujące grę (lekcja z Dungeon Keepera), energia | ustalone |
| Arkusz ekonomii | "Ekonomia_i_monetyzacja.xlsx" (przekazany w czacie 15.10): kalkulator przychodu, waluty, nagrody, sklep, reklamy | nazwy walut i miejsca reklam do aktualizacji pod obecny koncept |

## 10.2 Co prototyp symuluje

| Miejsce | Zachowanie w prototypie | Kod |
|---|---|---|
| Sklep, przycisk "Za reklamę" | jedno darmowe odświeżenie oferty na sklep (napis "już użyte" po użyciu), bez prawdziwej reklamy | `p8b_ui.js: renderShop` (`shopReroll(true)`, `run.shop.ad`) |
| Koniec runu (0 kryształów) | "Kontynuuj z 1 kryształem", odliczanie "Reklama... 3, 2, 1" (co 0,7 s), raz na run (`run.continueUsed`), potem `proceedToBuild()`; obok "Zakończ run"; od 1.24 wpis w dzienniku kryształów (`crystalEv(+1, 'other', 'continue')`), a status runu wraca z `end` na `active` | `p8b_ui.js: renderOver` |
| Starsze okno wyboru karty | "Losuj ponownie (symulacja reklamy, raz na falę)" | `p8b_ui.js: renderPickSection` (sprawdź, czy ten ekran jest jeszcze używany: od 1.0 karty wybiera się w sklepie, sekcja 03) |

W Unity te miejsca to punkty wpięcia reklam nagradzanych (rewarded). Do czasu M6: ta sama symulacja.

Zmiany 1.18-1.24 bez wpływu na monetyzację, ale ważne dla mety: wszystko, co nowe, żyje w runie (połączone karty ★, więzi, Nemezis z nagrodą za głowę, pamięć poległych `run.fallen`); między runami dalej tylko odkryte elementy (`yatd-found`), etap nauki i rekordy. Od 1.24 nauka mieści się w pierwszym runie, więc pierwsza reklama pełnoekranowa "od 2. runu" (10.1) trafia na gracza, który zna już całą grę. Otwarte pytanie z danych testerów: wygrany run trwa 27-54 min aktywnej gry, w tym 50-70% budowy; czy na telefon potrzebny jest krótszy tryb (sekcja 11). Nagroda za głowę Nemezis i odblokowania mogą być naturalnym miejscem na trofea metagry (do decyzji).

## 10.3 Technika (M6)

- Reklamy: LevelPlay (mediacja Unity) z reklamami nagradzanymi i pełnoekranowymi; skill `unity:levelplay-unity-integration`, jeśli dostępny.
- Zgody: w EOG i Wielkiej Brytanii od 16.01.2024 Google wymaga certyfikowanego CMP (np. Google UMP) przed wyświetleniem reklam.
- Zakupy: Unity IAP (skill `unity:implement-in-app-purchases`); produkty Dusz, ewentualnie "bez reklam".
- Nieletni: grupa docelowa obejmuje 14-17 lat. Przed M6 trzeba sprawdzić zasady Google Play dla treści i reklam kierowanych do nieletnich (Families policy, ustawienia SDK reklam dla nieletnich, zgody). To jest punkt otwarty w dokumencie projektu.
- Dane i chmura (opcjonalnie): Unity Gaming Services (Analytics, Cloud Save, Remote Config do strojenia balansu bez aktualizacji); skill `unity:build-live-game`.

## 10.4 Wydanie w Google Play (dokument projektu, rozdział 4)

| Wymaganie | Szczegóły |
|---|---|
| Konto deweloperskie | opłata jednorazowa 25 USD |
| Test zamknięty | konto osobiste założone po 13.11.2023: 12 testerów przez 14 dni ciągiem przed dostępem do produkcji |
| Adres | konto osobiste z monetyzacją: Google pokazuje publicznie pełny adres (rozważyć konto firmowe) |
| Prowizja | EOG, UK, USA od 30.06.2026: 10% + 5% opłaty rozliczeniowej do 1 mln USD rocznie (sprawdzić aktualne zasady przed wydaniem) |
| Nazwa pakietu | np. `com.bacjumgames.<gra>`, nie da się jej zmienić po publikacji |
| Docelowe API Androida | aktualne wymaganie Google Play na dany rok (sprawdzić w Play Console) |
| Formularze | polityka prywatności (gra wysyła dane testowe: identyfikator urządzenia, od 1.24 identyfikator gracza `playerId` i imię albo pseudonim z pytania w wersji WWW, czas aktywnej gry i posiedzenia), sekcja "Bezpieczeństwo danych", klasyfikacja wiekowa (IARC), grupa docelowa |
| Testerzy | autor planuje testerów spoza znajomych dopiero przy wersji w Unity, tuż przed wydaniem (obawa przed zarzutem "AI slop" i plagiatu bez własnej grafiki) |

Uwaga: sprawy organizacyjne (konto, firma, podatki) autor odłożył na później; najpierw produkt.
