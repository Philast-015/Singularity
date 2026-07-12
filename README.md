# Singularity

Singularity is a music + video client for youtube.It also enables users to use singularity from terminal.
This is an open-source project build after two small project i.e. [flow](https://github.com/philast-015/flow) and [wave](https://github.com/philast-015/wave)

This project includes two things:

1. CLI + Web version
2. web based saavan music player. [see here](https://sing-015.pages.dev/)

## Installation

Install it using pip or pipx

```bash
pip install singularity
```

```bash
pipx install singularity
```

Or clone this repo and then install

```bash
git clone https://github.com/philast-015/singularity.git
cd Singularity
uv sync
uv run main.py
```

## Modes

- Yt + music mode:
  This mode enables user to listen to music and play videos all in just one web page.
- Music mode:
  This mode enables user to listen to music auto-play similar songs feature.
- Video mode:
  This mode allows user to watch a single video useful when getting distracted.

## Features

- ad free playback.
- watch completly without giving data to any big companies.
- has distraction free modes for you.
- can be used using terminal.

## Usage

```bash
singularity [-h] [commands]
```

## File structure

```
.
├── main.py
├── pyproject.toml
├── README.md
├── src
│   ├── api
│   │   ├── info.py
│   │   ├── **init**.py
│   │   ├── routes.py
│   │   ├── search.py
│   │   └── stream.py
│   ├── Music-static
│   │   ├── index.html
│   │   ├── script.js
│   │   └── style.css
│   ├── tags.py
│   ├── ui
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── package-lock.json
│   │   ├── public
│   │   │   └── logo.png
│   │   ├── src
│   │   │   ├── api.js
│   │   │   ├── App.css
│   │   │   ├── App.jsx
│   │   │   ├── components
│   │   │   │   ├── AlbumDetail.jsx
│   │   │   │   ├── AlbumModals.jsx
│   │   │   │   ├── LibraryPage.jsx
│   │   │   │   ├── LikedPage.jsx
│   │   │   │   ├── MusicPlayer.jsx
│   │   │   │   ├── PlaylistPage.jsx
│   │   │   │   ├── SavedItems.jsx
│   │   │   │   ├── SavedPage.jsx
│   │   │   │   ├── SearchHistory.jsx
│   │   │   │   ├── SettingsPanel.jsx
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   ├── VideoCard.jsx
│   │   │   │   └── VideoPlayer.jsx
│   │   │   ├── logo.png
│   │   │   ├── main.jsx
│   │   │   └── modes
│   │   │   └── music
│   │   │   └── MusicLibrary.jsx
│   │   └── vite.config.js
│   ├── Video-static
│   │   ├── index.html
│   │   ├── script.js
│   │   └── style.css
│   └── ytdl.py
└── uv.lock
```

## Dependencies used

- python
- flask
- rich
- request
- yt-dlp
- tree (used for generating tree view)
