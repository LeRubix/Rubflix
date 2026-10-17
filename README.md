# Kudflix

A Netflix-style desktop app for your local video library. Built with Electron, React, Vite, Tailwind CSS, and [mpv](https://github.com/mpv-player/mpv) for universal audio/video playback.

> **Credits & Acknowledgements:**  
> Player engine overhaul, audio codec support (AC-3, E-AC-3, DTS), multi-folder libraries, watch history, and UI enhancements contributed by [LeRubix](https://github.com/LeRubix) from their fork [Rubflix](https://github.com/LeRubix/Rubflix).

## UI showcase

Screenshots in [`screenshots/`](screenshots/): profiles, home, detail modal, startup, and avatar picker.

## Features

- **Universal Playback**: Internal [mpv](https://github.com/mpv-player/mpv) player in a dedicated **Player** window. Plays AC-3, E-AC-3, DTS, 10-bit anime, styled ASS subtitles, and works smoothly with Discord/OBS window capture. Optional external player (VLC/PotPlayer). Resume position per profile.
- **Library layout**: Home, Series, and Movies rows; hero banner; Top 10 and Continue Watching; genre rows from TMDB/local metadata.
- **TV folders**: Episodes grouped by series folder and season; detail modal with season tabs, TMDB episode titles/stills, hide-watched, and resume.
- **Movies & files**: Smart filename parsing (releases, years, sequels); optional sidecar/NFO metadata; manual edit, TMDB ID override, and reset-to-default per title.
- **TMDB**: Posters, synopses, cast, and episode data (with caching and rate-limit-friendly fetching). Optional custom API key in Advanced settings.
- **Profiles**: Who’s watching, default profile, custom accent/wallpaper, avatar grid or upload with in-app square crop.
- **Watched state**: Manual and progress-based; filters on rows and in search; mark show/season watched from the edit panel.
- **Search & filters**: Full-library search with genre, year, watched, and sort options.
- **Personalization**: Custom app name (default **Kudflix**), accent color (default `#E50914`), UI scale, wallpaper, watched-eye display mode.
- **Library sync**: Multiple movie/TV root folders, background enrich (thumbnails/duration), optional folder watch for changes.

## Supported formats

Anything mpv can decode (MKV, MP4, AVI, WebM, etc., with AC-3, E-AC-3, DTS, TrueHD, FLAC, Opus). Bundled mpv is included in release builds via `npm run setup-mpv`.

## Quick start

### Prerequisites

- Node.js 18+
- npm

### Development

```bash
npm install
npm run setup-mpv
npm start
```

### Production build (Windows)

```bash
npm run setup-mpv   # once, or after cleaning electron/bin/mpv
npm run package
```

Installer output: `../release_kudflix/` (NSIS, product name **Kudflix**).

## License & Credits

- Open source - Free to use and modify for your own local setup.
- Kudflix by [NekoIsUnavailable](https://github.com/NekoIsUnavailable/Kudflix).
- Core playback overhaul and feature contributions by [LeRubix](https://github.com/LeRubix) ([Rubflix](https://github.com/LeRubix/Rubflix)).
- mpv is licensed under [LGPL-2.1](https://github.com/mpv-player/mpv).
