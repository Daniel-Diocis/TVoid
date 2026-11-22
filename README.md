# TVoid

TVoid è una web app locale stile piattaforma streaming per guardare video MP4 presenti nel filesystem. Questa prima versione MVP supporta le categorie `series` e `movies`, con scanner locale, homepage dark, stagioni, episodi, film, player HTML5, salvataggio progresso e sezione “Continua a guardare”.

## Requisiti

- Docker e Docker Compose per l’avvio consigliato
- Python 3.11+ per l’avvio senza Docker
- File video MP4 leggibili dal browser
- FFmpeg, opzionale ma consigliato per convertire o rimuxare i file

## Struttura media

Organizza le serie in questo modo:

```text
media/
└── series/
    └── Nome Serie/
        ├── poster.jpg
        ├── metadata.json
        ├── season1/
        │   ├── S01E01 - Titolo episodio.mp4
        │   └── S01E02 - Titolo episodio.mp4
        ├── season2/
        │   └── S02E01 - Titolo episodio.mp4
        └── thumbnails/
            ├── S01E01.jpg
            └── S02E01.jpg
```

Per ora lo scanner considera solo file `.mp4` con formato:

```text
S01E01 - Titolo episodio.mp4
```

Le stagioni devono essere cartelle chiamate `season1`, `season2`, `season3`.

Organizza i film in questo modo:

```text
media/
└── movies/
    └── Nome Film/
        ├── poster.jpg
        ├── metadata.json
        ├── Nome Film.mp4
        └── thumbnail.jpg
```

Lo scanner considera il primo file `.mp4` direttamente dentro la cartella del film, in ordine alfabetico. Eventuali `.mp4` in sottocartelle vengono ignorati. Se ci sono più file video nella stessa cartella, TVoid usa il primo e scrive un warning nei log.

## metadata.json

Ogni serie può avere un file `metadata.json`:

```json
{
  "title": "From",
  "description": "Una serie mystery/horror ambientata in una città da cui è impossibile uscire.",
  "year": 2022,
  "category": "series",
  "poster": "poster.jpg"
}
```

Se `metadata.json` manca o non è valido, TVoid usa il nome della cartella come titolo. Se `poster.jpg` o una thumbnail mancano, il frontend mostra un placeholder.

Ogni film può avere un file `metadata.json`:

```json
{
  "title": "Interstellar",
  "description": "Un film di fantascienza diretto da Christopher Nolan.",
  "year": 2014,
  "category": "movies",
  "poster": "poster.jpg"
}
```

Se `metadata.json` manca o non è valido, TVoid usa il nome della cartella come titolo, descrizione vuota, anno non impostato e categoria `movies`.

## Aggiornamento della libreria

Home, Film e Serie TV leggono il catalogo salvato in SQLite. Le voci Film e Serie TV aprono la stessa pagina catalogo filtrata per categoria. Al primo accesso, se il catalogo deve ancora essere indicizzato, TVoid avvia la scansione in background. Anche una prima scansione senza titoli viene registrata.

Dopo aver aggiunto o modificato file, usa **Aggiorna libreria** dalla Home o da uno dei due cataloghi. Puoi aprire un titolo e guardarlo durante la scansione. I metadati illeggibili vengono segnalati nei log e il titolo interessato usa il nome della cartella.

## Thumbnail automatiche

Durante lo scan della libreria, TVoid genera automaticamente le thumbnail degli episodi MP4 con FFmpeg e le salva in:

```text
media/series/Nome Serie/thumbnails/
```

Il nome del file segue il codice episodio, per esempio `S01E01.jpg`, `S01E02.jpg` o `S02E01.jpg`. Le thumbnail esistenti non vengono rigenerate, quindi puoi sostituirle manualmente mettendo un file con lo stesso nome nella cartella `thumbnails/`.

Se FFmpeg non è disponibile o fallisce su un video, lo scan continua comunque e il frontend mostra il placeholder per gli episodi senza thumbnail.

Per i film, TVoid usa `media/movies/Nome Film/thumbnail.jpg` se esiste. Se manca, lo scanner prova a generarlo dal file MP4 con FFmpeg, prima a `00:02:00` e poi a `00:00:10`. Le thumbnail film esistenti non vengono sovrascritte.

## Progresso film

Il progresso dei film è salvato separatamente da quello degli episodi nella tabella `movie_progress`, sempre con `user_id = 1`. Il player salva durante la riproduzione, su pausa, fine video e uscita dalla pagina. Quando il rapporto `current_time_seconds / duration_seconds` arriva almeno al 90%, il film viene segnato come completato e non appare più in “Continua a guardare”.

Per film ed episodi, il player ottiene un identificativo da `POST /api/playback-session` e invia `playback_session` e `save_sequence` con ogni salvataggio. La sequenza cresce a ogni azione, anche quando si torna indietro nel video. Il server risponde con `status: "ignored"` e la posizione già registrata se riceve una richiesta superata o duplicata.

Se lo stesso titolo è aperto in due player, la sessione aperta più di recente ha la precedenza dal suo primo salvataggio. Per i client precedenti che inviano soltanto posizione e durata, il server usa l’ordine di ricezione.

## Avvio con Docker Compose

```bash
docker compose up --build
```

Apri:

```text
http://localhost:8080
```

Il backend crea automaticamente `data/tvoid.db` e le cartelle runtime necessarie.

## Avvio senza Docker

Da root progetto:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

Apri:

```text
http://127.0.0.1:8000
```

In questa modalità FastAPI serve anche i file statici del frontend. In Docker, invece, il frontend viene servito da Nginx.

## Formato video consigliato

Per lo streaming web è consigliato MP4 con video H.264 e audio AAC. I file MKV possono non partire direttamente nel browser anche se contengono un video valido.

## Comandi FFmpeg utili

Remux veloce MKV -> MP4:

```bash
ffmpeg -i input.mkv -c copy output.mp4
```

Copia video e converte solo audio in AAC:

```bash
ffmpeg -i input.mkv -c:v copy -c:a aac -b:a 160k output.mp4
```

Conversione completa massima compatibilità:

```bash
ffmpeg -i input.mkv -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 160k output.mp4
```

## Conversione MKV in MP4

TVoid include una utility locale per convertire file `.mkv` in `.mp4` senza passare dal backend:

```text
tools/convert/
├── convert_to_mp4.py
├── mkv/
└── mp4/
```

Metti i file `.mkv` in `tools/convert/mkv/` e lancia:

```bash
python3 tools/convert/convert_to_mp4.py
```

Gli output vengono salvati in `tools/convert/mp4/` mantenendo lo stesso nome base. Per esempio `S01E01 - Titolo episodio.mkv` diventa `S01E01 - Titolo episodio.mp4`.

Comandi utili:

```bash
python3 tools/convert/convert_to_mp4.py --dry-run
python3 tools/convert/convert_to_mp4.py --overwrite
python3 tools/convert/convert_to_mp4.py --mode remux
python3 tools/convert/convert_to_mp4.py --mode audio-aac
python3 tools/convert/convert_to_mp4.py --mode full
```

La modalità default è `auto`: prova prima un remux veloce, poi copia il video convertendo l'audio in AAC, infine fa una conversione completa H.264/AAC. Dopo la conversione puoi spostare gli `.mp4` ottenuti nella libreria TVoid, per esempio:

```text
media/series/From/season1/
```

## API principali

- `GET /api/health`
- `POST /api/scan`
- `GET /api/home`
- `GET /api/media?category=series`
- `GET /api/media?category=movies`
- `GET /api/media/{media_id}`
- `GET /api/movies/{media_id}`
- `GET /api/episodes/{episode_id}`
- `POST /api/playback-session`
- `GET /api/progress/{episode_id}`
- `POST /api/progress/{episode_id}`
- `GET /api/movie-progress/{movie_file_id}`
- `POST /api/movie-progress/{movie_file_id}`
- `GET /api/video/{episode_id}`
- `GET /api/movie-video/{movie_file_id}`
- `GET /api/images/poster/{media_id}`
- `GET /api/images/thumbnail/{episode_id}`
- `GET /api/images/movie-thumbnail/{movie_file_id}`

## Note di robustezza

TVoid non interrompe l’app se la libreria è vuota, se `media/series` o `media/movies` mancano, se un `metadata.json` è malformato, se poster o thumbnail non esistono, se una stagione non contiene episodi, se una cartella film non contiene MP4 o se un file video registrato nel database è stato eliminato. In quest’ultimo caso la pagina resta consultabile, mentre lo streaming risponde `404`.
