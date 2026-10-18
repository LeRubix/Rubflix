<div align="center">

<img src="public/icon.png" alt="Kudflix Logo" width="128" style="border-radius: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);" />

# 🍿 Kudflix

### *Your local videos & YouTube streams. Netflix aesthetics. Zero servers.*

A lightweight, high-performance desktop media player that combines local offline streaming with an ad-free **Watch Online** section powered by **MPV** and **yt-dlp**.

[![Latest Release](https://img.shields.io/github/v/release/NekoIsUnavailable/Kudflix?style=for-the-badge&color=E50914&logo=github)](https://github.com/NekoIsUnavailable/Kudflix/releases/latest)
[![Platform](https://img.shields.io/badge/Platform-Windows-0078D6?style=for-the-badge&logo=windows)](https://github.com/NekoIsUnavailable/Kudflix/releases/latest)
[![Player Engine](https://img.shields.io/badge/Player-MPV%20Engine-purple?style=for-the-badge)](https://mpv.io)
[![Online Streaming](https://img.shields.io/badge/Online-yt--dlp-FF0000?style=for-the-badge&logo=youtube)](https://github.com/yt-dlp/yt-dlp)
[![License](https://img.shields.io/badge/License-Open%20Source-brightgreen?style=for-the-badge)](LICENSE)
[![Discord](https://img.shields.io/badge/Discord-Rich%20Presence-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://github.com/NekoIsUnavailable/Kudflix)

<br/>

<a href="https://github.com/NekoIsUnavailable/Kudflix/releases/download/v1.4.9/Kudflix.Setup.1.4.9.exe">
  <img src="https://img.shields.io/badge/⬇%20Download-Installer%20(.exe)-E50914?style=for-the-badge&logo=windows" height="40" />
</a>
&nbsp;&nbsp;
<a href="https://github.com/NekoIsUnavailable/Kudflix/releases/download/v1.4.9/Kudflix-1.4.9-win.zip">
  <img src="https://img.shields.io/badge/⚡%20Portable%20Edition-No%20Install%20(.zip)-gray?style=for-the-badge" height="40" />
</a>

<br/><br/>

<img src="screenshots/home.png" alt="Kudflix Home Showcase" width="95%" style="border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.7);" />

</div>

---

## 💡 The Problem with Media Players Today

| Media Player | What's Missing? |
| :--- | :--- |
| **VLC / MPC-HC** | Plays every file, but looks like software from 2003. No posters, no episode tracking, no online search, and no streaming UI. |
| **Plex / Jellyfin** | Great interface, but requires always-on background server daemons, accounts, port forwarding, and heavy transcode overhead. |
| **YouTube in Browser** | Cluttered with recommendations, algorithm feeds, ads, and high browser CPU/RAM consumption. |
| **Kudflix** | **Zero servers. Zero accounts. Zero ads.** Point it to any folder on your PC or search YouTube online (like `ytfzf`) and get an instant, beautiful Netflix-grade UI with native **MPV** hardware decoding and full **Discord Rich Presence**. |

---

## ⚡ Key Highlights

### 🌐 Watch Online (YouTube Streaming like `ytfzf`)
Stream YouTube videos directly inside Kudflix without ever opening a browser or creating an account:
* **Zero API Keys & Zero Quotas:** Search video titles, channels, anime OSTs, and documentaries without rate limits.
* **Direct Link Streaming:** Paste any `youtube.com` or `youtu.be` link to immediately begin playback.
* **Quick Category Filters:** Instant one-click categories for **🔥 Trending**, **🎬 Movie Trailers**, **⛩️ Anime Openings**, **🎵 Music**, **🎮 Gaming**, and **🍿 Documentaries**.
* **Embedded MPV Stream:** High-resolution video and Opus audio streamed directly into Kudflix's native player with hardware acceleration.

### 🎬 Universal Playback Engine (Powered by MPV)
No transcoding, no silent audio tracks, and no desynced subtitles.
* **Audio Codecs:** Full hardware decoding for **AC-3 (Dolby Digital)**, **E-AC-3 (Dolby Digital Plus)**, **DTS**, **DTS-HD**, **TrueHD**, **FLAC**, and **Opus**.
* **Advanced Subtitles:** Native rendering for complex styled anime subtitles (`.ass`/`.ssa`) with embedded fonts, karaoke effects, and positional styling.
* **10-Bit & HDR:** Smooth playback for 10-bit HEVC, AV1, and high-bitrate Blu-ray rips.

### 📁 Smart Folder & Series Detection
Put your files in folders like `Breaking Bad/Season 1/S01E01.mkv`, and Kudflix automatically:
* Groups them into a single Series card on your Home and TV rows.
* Generates tabbed Season selectors with episode thumbnails, titles, and runtimes.
* Remembers your exact resume position per profile and queues the next episode with functional Prev/Next navigation.

### 🎮 Enhanced Discord Rich Presence
Broadcasting what you're watching straight to your Discord profile:
* Displays current Movie, Series, or YouTube video title and channel/season tag.
* Live elapsed and remaining media timeline scrubber (`▶ 00:03 ━━━━━ 03:29`).
* High-resolution artwork thumbnail preview in Discord.
* *(Easily toggled on/off or customized in Settings).*

### 👥 Multiple Profiles & Personalization
* Create separate profiles for family members or roommates.
* Custom profile avatars with built-in square cropper.
* Individual watch histories, continue-watching carousels, and custom favorites lists.

---

## 📸 Interface Tour

<div align="center">

### 🌐 Watch Online (YouTube Search & Stream)
<img src="screenshots/online.png" width="95%" style="border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);" />

<br/><br/>

| Season & Episode Modal | Multi-Profile Selector |
| :---: | :---: |
| <img src="screenshots/modal.png" width="480" /> | <img src="screenshots/profiles.png" width="480" /> |

| Startup Cinema Animation | Avatar Customizer |
| :---: | :---: |
| <img src="screenshots/startup.png" width="480" /> | <img src="screenshots/choose_avatar.png" width="480" /> |

</div>

---

## 📥 Installation

### Windows Installer (Recommended)
Download and run [**Kudflix Setup 1.4.9.exe**](https://github.com/NekoIsUnavailable/Kudflix/releases/download/v1.4.9/Kudflix.Setup.1.4.9.exe). Desktop and Start Menu shortcuts will be created automatically.

### Portable Mode (Run from USB / External Drive)
Download [**Kudflix-1.4.9-win.zip**](https://github.com/NekoIsUnavailable/Kudflix/releases/download/v1.4.9/Kudflix-1.4.9-win.zip), extract it anywhere, and launch `Kudflix.exe`. No installation, registry entries, or admin privileges needed.

---

## 🗂️ Recommended Folder Structure

Kudflix is built to be flexible and parses almost all release formats, but organizing your collection like this delivers optimal TMDB matching:

```text
📁 My Media/
├── 📁 Movies/
│   ├── Inception (2010).mp4
│   └── Interstellar (2014)/
│       ├── Interstellar.mkv
│       └── poster.jpg            <-- (Optional local artwork)
└── 📁 TV Shows/
    └── Attack on Titan/
        ├── Season 1/
        │   ├── S01E01.mkv
        │   └── S01E02.mkv
        └── Season 2/
            └── S02E01.mkv
```

---

## ⌨️ Player Controls & Shortcuts

| Key | Action |
| :--- | :--- |
| <kbd>Space</kbd> / <kbd>K</kbd> | Play / Pause |
| <kbd>F</kbd> | Toggle Fullscreen |
| <kbd>M</kbd> | Mute / Unmute Audio |
| <kbd>←</kbd> / <kbd>→</kbd> | Seek backward / forward (5 seconds) |
| <kbd>↑</kbd> / <kbd>↓</kbd> | Volume up / down (5%) |
| <kbd>J</kbd> / <kbd>L</kbd> | Jump backward / forward (10 seconds) |
| <kbd>Esc</kbd> | Exit player or close modals |

---

## 🛠️ Building from Source

```bash
# 1. Clone the repository
git clone https://github.com/NekoIsUnavailable/Kudflix.git
cd Kudflix

# 2. Install dependencies & fetch MPV/yt-dlp binaries
npm install
npm run setup-mpv

# 3. Start development server
npm start

# 4. Compile Windows installer & portable zip
npm run package
```

---

## 🗺️ Roadmap

- [x] Universal MPV audio playback (AC-3, E-AC-3, DTS)
- [x] Enhanced Discord Rich Presence with media timeline scrubber & thumbnails
- [x] Watch Online section (YouTube search & stream without API keys)
- [x] Portable `.zip` release target
- [x] Multi-folder library separation (Movie vs TV roots)
- [ ] Steam Deck / Linux AppImage build
- [ ] macOS build
- [ ] Hover scrub keyframe thumbnail preview
- [ ] Synced local network "Watch Party" mode

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📜 Credits & Acknowledgements

* **Kudflix** created and maintained by [**NekoIsUnavailable**](https://github.com/NekoIsUnavailable).
* **Player Overhaul & Core Contributions:** Huge thanks to [**LeRubix**](https://github.com/LeRubix) ([Rubflix](https://github.com/LeRubix/Rubflix)) for contributing the MPV player engine architecture, multi-folder library sync, and UI fixes.
* Playback backend powered by [**mpv**](https://github.com/mpv-player/mpv) under [LGPL-2.1](https://github.com/mpv-player/mpv) and [**yt-dlp**](https://github.com/yt-dlp/yt-dlp) under [Unlicense](https://github.com/yt-dlp/yt-dlp).
* Metadata and cover posters provided by [**The Movie Database (TMDB)**](https://www.themoviedb.org).

---

<div align="center">

### 🔍 Related Keywords & Search Terms
`netflix-clone` · `media-player` · `offline-streaming` · `mpv-player` · `ytfzf` · `yt-dlp` · `youtube-player` · `desktop-app` · `discord-rpc` · `anime-player` · `local-streaming` · `video-player` · `electron-app`

<sub>If you enjoy Kudflix, consider leaving a ⭐ on GitHub! It helps more people discover the project.</sub>

</div>
