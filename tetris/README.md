# 🎮 Tetris

A classic Tetris game built with vanilla HTML5 Canvas, CSS, and JavaScript.

## Features

- **7-bag randomizer** — fair piece distribution (no drought)
- **Ghost piece** — see where the piece lands
- **Hold piece** — swap current piece with hold slot
- **SRS rotation** — Super Rotation System with wall kicks
- **DAS** — Delayed Auto Shift for smooth movement
- **Levels** — speed increases every 10 lines
- **Scoring** — standard Tetris scoring (single/double/triple/Tetris)
- **Retro CRT aesthetic** — scanline effect + glow visuals

## Controls

| Key | Action |
|-----|--------|
| `←` `→` | Move left / right |
| `↑` or `X` | Rotate clockwise |
| `Z` | Rotate counter-clockwise |
| `↓` | Soft drop |
| `Space` | Hard drop |
| `C` | Hold piece |
| `P` | Pause / Resume |

## Run Locally

Just open `index.html` in a browser — no build step required.

```bash
git clone https://github.com/<your-username>/tetris.git
cd tetris
open index.html   # macOS
# or: xdg-open index.html (Linux) / start index.html (Windows)
```

## Project Structure

```
tetris/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── tetris.js
└── README.md
```

## Scoring

| Lines Cleared | Points (× Level) |
|---------------|-----------------|
| 1 (Single)    | 100 |
| 2 (Double)    | 300 |
| 3 (Triple)    | 500 |
| 4 (Tetris)    | 800 |

Soft drop: +1 pt/row · Hard drop: +2 pt/row
