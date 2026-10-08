# Rubflix

A Netflix-style desktop app for your local video library. Built with Electron, React, Vite, Tailwind CSS, and [mpv](https://github.com/mpv-player/mpv) for playback.

Fork of [Kudflix](https://github.com/NekoIsUnavailable/Kudflix). Upstream repo: [LeRubix/Rubflix](https://github.com/LeRubix/Rubflix).

## UI showcase

Screenshots in [`screenshots/`](screenshots/): profiles, home, detail modal, startup, and avatar picker.

## Features

- **Library layout**: Home, Series, and Movies rows; hero banner; Top 10 and Continue Watching; genre rows from TMDB/local metadata.
- **TV folders**: Episodes grouped by series folder and season; detail modal with season tabs, TMDB episode titles/stills, hide-watched, and resume.
- **Movies & files**: Smart filename parsing (releases, years, sequels); optional sidecar/NFO metadata; manual edit, TMDB ID override, and reset-to-default per title.
- **TMDB**: Posters, synopses, cast, and episode data (with caching and rate-limit-friendly fetching). Optional custom API key in Advanced settings.
- **Playback**: Internal mpv player in a dedicated **Player** window (works well with Discord/OBS window capture). Optional external player (VLC/PotPlayer). Resume position per profile.
- **Profiles**: Who’s watching, default profile, custom accent/wallpaper, avatar grid or upload with in-app square crop.
- **Watched state**: Manual and progress-based; filters on rows and in search; mark show/season watched from the edit panel.
- **Search & filters**: Full-library search with genre, year, watched, and sort options.
- **Personalization**: Custom app name (default **Rubflix**), accent color (default `#E50914`), UI scale, wallpaper, watched-eye display mode.
- **Library sync**: Multiple movie/TV root folders, background enrich (thumbnails/duration), optional folder watch for changes.

## Supported formats

Anything mpv can decode (MKV, MP4, etc.). Bundled mpv is included in release builds via `npm run setup-mpv`.

## Quick start

### Prerequisites

- Node.js 18+
- npm

### Development

```bash
npm install
npm start
```

### Production build (Windows)

```bash
npm run setup-mpv   # once, or after cleaning electron/bin/mpv
npm run package
```

Installer output: `../release_kudflix/` (NSIS, product name **Rubflix**).

## License

Open source - Free to use and modify for your own local setup. 
mpv is [LGPL-2.1](https://github.com/mpv-player/mpv).
