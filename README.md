# ReadRepeat

A distraction-free shadow reading web application for language learning. Upload foreign text, translation, and audio - the system intelligently splits text into sentences, aligns audio to each sentence, and provides an interactive player for practice.

## Features

- **Intelligent Audio Alignment**: Uses Whisper AI to transcribe audio and align it with your text
- **Sentence-by-Sentence Playback**: Click any sentence to hear its audio clip
- **Two Practice Modes**:
  - **Mode A (Reveal All)**: See both foreign text and translation while practicing
  - **Mode B (Translation First)**: Translation visible, foreign text blurred until you reveal it
- **Keyboard Shortcuts**: Space (play), J/K (navigate), H (reveal/hide)
- **Multiple Language Support**: English, Chinese, Japanese, Korean, Spanish, French, German

## Tech Stack

- **Frontend/Backend**: Next.js 14 (App Router) with TypeScript
- **Database**: SQLite with Drizzle ORM (embedded, no external services)
- **Audio Processing**: Python worker with faster-whisper
- **Styling**: Tailwind CSS

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.12+
- ffmpeg (`brew install ffmpeg` on macOS)

### Local Development

```bash
# Install Node.js dependencies
npm install

# Set up database
npx drizzle-kit generate
npx drizzle-kit migrate

# Start Next.js dev server
npm run dev
```

In a separate terminal:

```bash
# Set up Python worker
cd worker
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Start worker
python main.py
```

Open http://localhost:3000

### Docker (Recommended for Production)

#### With AMD GPU (ROCm)

```bash
# Find your GPU architecture
rocminfo | grep gfx

# Edit docker-compose.yml to set HSA_OVERRIDE_GFX_VERSION:
# - RX 6000 series: 10.3.0
# - RX 5000 series: 10.1.0
# - RX 7000 series: 11.0.0

# Build and run
docker compose up --build
```

#### CPU Only

```bash
docker compose -f docker-compose.cpu.yml up --build
```

## Project Structure

```
readrepeat/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   ├── create-lesson/     # Lesson creation page
│   │   └── lesson/[id]/       # Player page
│   ├── components/            # React components
│   │   ├── Player.tsx         # Main player
│   │   ├── SentenceRow.tsx    # Sentence display
│   │   └── UploadForm.tsx     # Lesson creation form
│   ├── hooks/                 # Custom React hooks
│   └── lib/db/                # Database schema & connection
├── worker/                    # Python audio processor
│   ├── main.py               # Job polling loop
│   ├── pipeline.py           # Processing orchestration
│   ├── transcribe.py         # Whisper transcription
│   ├── align.py              # Text-audio alignment
│   └── slice.py              # Audio slicing
└── data/                      # SQLite DB & uploads (gitignored)
```

## How It Works

1. **Upload**: User provides foreign text, translation, and audio file
2. **Segment**: Text is split into sentences using rule-based segmentation
3. **Transcribe**: Audio is transcribed using faster-whisper with word timestamps
4. **Align**: Dynamic programming aligns transcript words to user's text
5. **Slice**: Audio is cut into per-sentence clips using ffmpeg
6. **Play**: Interactive player shows aligned sentences with audio

## Configuration

### Environment Variables

#### Worker

| Variable | Default | Description |
|----------|---------|-------------|
| `API_BASE_URL` | `http://localhost:3000` | Next.js API URL |
| `POLL_INTERVAL` | `5` | Seconds between job polls |
| `WHISPER_DEVICE` | `cpu` | `cpu`, `cuda`, or `auto` |
| `WHISPER_COMPUTE_TYPE` | `int8` | `int8`, `float16`, `float32` |
| `WHISPER_MODEL` | `base` | `tiny`, `base`, `small`, `medium`, `large-v3` |

### Whisper Model Sizes

| Model | Size | Speed | Accuracy |
|-------|------|-------|----------|
| tiny | 39 MB | Fastest | Lower |
| base | 74 MB | Fast | Good |
| small | 244 MB | Medium | Better |
| medium | 769 MB | Slow | High |
| large-v3 | 3 GB | Slowest | Highest |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/lessons` | Create lesson with texts |
| `GET` | `/api/lessons` | List all lessons |
| `GET` | `/api/lessons/[id]` | Get lesson with sentences |
| `POST` | `/api/lessons/[id]/audio` | Upload audio file |
| `GET` | `/api/media/sentences/[id]/clip` | Stream sentence audio clip |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play/pause current sentence |
| `J` / `ArrowDown` | Next sentence |
| `K` / `ArrowUp` | Previous sentence |
| `H` | Toggle reveal (Mode B) |
| `Enter` | Reveal current sentence (Mode B) |

## License

MIT
