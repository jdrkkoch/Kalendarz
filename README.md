# Kalendarz spotkań

Prosta strona internetowa do umawiania spotkań z kalendarzem i panelem administratora.

## Jak uruchomić lokalnie

Uruchom lokalny serwer z katalogu projektu:

```bash
cd /Users/jedrekkochaniak/Documents/visual/kalendarz
python3 -m http.server 8000
```

Następnie otwórz w przeglądarce:

```text
http://localhost:8000
```

## Publikacja na publicznym hostingu

Ta strona jest statyczna i nie wymaga backendu. Możesz wrzucić cały katalog projektu na dowolny hosting statyczny, np.:

- Netlify
- Vercel
- GitHub Pages
- Cloudflare Pages

Wystarczy dodać pliki HTML, CSS i JS z katalogu projektu bez dodatkowej konfiguracji.

## Panel administratora

Hasło do logowania w panelu to:

```text
admin123
```

Po zalogowaniu możesz dodawać i usuwać spotkania.

## Funkcje

- formularz do dodawania imienia, nazwiska, daty, godziny i statusu pilności,
- kalendarz miesięczny z wyświetlaniem spotkań,
- lista spotkań dla wybranego dnia,
- panel administratora do dodawania i usuwania terminów,
- zapis w localStorage, dzięki czemu dane pozostają po odświeżeniu strony.
