# Kudflix

<p align="center">
  <img src="screenshots/home.png" alt="Kudflix Home Interface" width="90%" style="border-radius: 8px; box-shadow: 0 8px 30px rgba(0,0,0,0.5);" />
</p>

<p align="center">
  <strong>Turn your local video folder into a gorgeous, offline Netflix experience in seconds.</strong><br>
  <em>Zero servers. Zero accounts. Zero telemetry. Powered by <a href="https://mpv.io">MPV</a>.</em>
</p>

<p align="center">
  <a href="https://github.com/NekoIsUnavailable/Kudflix/releases/latest"><img src="https://img.shields.io/github/v/release/NekoIsUnavailable/Kudflix?style=for-the-badge&color=E50914" alt="Latest Release"></a>
  <img src="https://img.shields.io/badge/Platform-Windows-0078D6?style=for-the-badge&logo=windows" alt="Platform">
  <a href="https://github.com/NekoIsUnavailable/Kudflix/releases/download/v1.4.5/Kudflix.Setup.1.4.5.exe"><img src="https://img.shields.io/badge/Download-Installer%20(.exe)-success?style=for-the-badge" alt="Download Installer"></a>
  <a href="https://github.com/NekoIsUnavailable/Kudflix/releases/download/v1.4.5/Kudflix-1.4.5-win.zip"><img src="https://img.shields.io/badge/Download-Portable%20(.zip)-informational?style=for-the-badge" alt="Download Portable"></a>
</p>

---

## ⚡ Why Kudflix?

Most media center apps like Plex or Jellyfin require setting up background server daemons, port forwarding, or creating accounts just to browse your local video collection. VLC plays everything, but lacks a modern streaming UI.

**Kudflix gives you the best of both worlds:**
* **Point & Play:** Select any folder on your PC or external drive—Kudflix automatically scrapes posters, cast, synopsis, and episode lists from TMDB.
* **Universal MPV Engine:** Plays every video and audio format out-of-the-box (AC-3/Dolby Digital, E-AC-3, DTS, TrueHD, 10-bit HEVC, and styled anime `.ass` subtitles) without stuttering or transcoding.
* **100% Offline & Private:** No internet required for playback. Ideal for travel, flights, laptops, and offline setups.
* **Discord Rich Presence:** Automatically shows what movie or episode you're watching on your Discord profile with live progress timers.
* **Portable USB Mode:** Download the `.zip` release, extract it to a USB drive or external hard drive, and take your Netflix experience anywhere without installing anything.

| Feature | Kudflix | VLC | Plex / Jellyfin |
| :--- | :---: | :---: | :---: |
| **Netflix-style UI & Posters** | ✅ Yes | ❌ No | ✅ Yes |
| **Zero Server / Zero Setup** | ✅ Yes | ✅ Yes | ❌ Requires Server |
| **100% Offline (No Account)** | ✅ Yes | ✅ Yes | ⚠️ Complex / Partial |
| **Plays AC-3 / DTS / Anime Subs** | ✅ Native (MPV) | ✅ Yes | ⚠️ Often Transcodes |
| **Discord Rich Presence** | ✅ Built-in | ❌ Via plugin | ❌ Via plugin |
| **Portable USB Mode** | ✅ Yes (.zip) | ✅ Yes | ❌ No |

---

## 📸 Screenshots

<p align="center">
  <img src="screenshots/modal.png" alt="Season & Episode Selector" width="48%" />
  <img src="screenshots/profiles.png" alt="Multi-Profile Screen" width="48%" />
</p>

---

## 🚀 Installation & Downloads

### Option 1: Direct Download
Download the latest version from the [**Releases Page**](https://github.com/NekoIsUnavailable/Kudflix/releases/latest):
* [**Download Kudflix Setup 1.4.5.exe**](https://github.com/NekoIsUnavailable/Kudflix/releases/download/v1.4.5/Kudflix.Setup.1.4.5.exe) — Standard one-click installer with desktop & start menu shortcuts.
* [**Download Kudflix-1.4.5-win.zip**](https://github.com/NekoIsUnavailable/Kudflix/releases/download/v1.4.5/Kudflix-1.4.5-win.zip) — Portable edition: unzip anywhere and run `Kudflix.exe` directly from an external drive or USB.

### Option 2: Windows Package Manager (`winget`)
*(Manifest submitted; available shortly)*
```cmd
winget install NekoIsUnavailable.Kudflix
```

---

## ✨ Features Breakdown

- **Smart Series & TV Folder Grouping**: Folders containing episodes (e.g. `Show Name/Season 1/ep01.mp4`) are automatically bundled into a single Series card with season tabs, episode runtimes, and thumbnails.
- **Top 10 & Continue Watching**: Intelligent rows that remember your playback positions and surface your most-watched titles per profile.
- **Multi-Profile Support**: "Who's Watching?" profile picker with custom names, avatar creator/cropper, and personal watch histories.
- **Custom Playlists & Watch History**: Create custom collections, track your watched status, and filter your library on the fly.
- **Discord Rich Presence**: Share what you're watching with your friends (toggleable in Settings).
- **OBS / Discord Screen Share Friendly**: The dedicated player overlay captures cleanly in Discord and OBS window-capture modes.

---

## 🛠️ Development

### Prerequisites
- Node.js 18+
- npm

```bash
# Clone the repository
git clone https://github.com/NekoIsUnavailable/Kudflix.git
cd Kudflix

# Install dependencies and download MPV binaries
npm install
npm run setup-mpv

# Launch in development mode
npm start

# Compile production installer & portable zip
npm run package
```

---

## 🗺️ Roadmap & Contributing

We welcome community pull requests and feature suggestions!
- [x] Universal MPV audio codec support (AC-3, E-AC-3, DTS)
- [x] Discord Rich Presence integration
- [x] Portable `.zip` distribution
- [ ] Steam Deck / Linux AppImage build
- [ ] macOS build
- [ ] Keyframe thumbnail preview on progress scrub
- [ ] Watch Together / Synced local party mode

Feel free to open an [Issue](https://github.com/NekoIsUnavailable/Kudflix/issues) or submit a Pull Request!

---

## 📜 Credits & License

* Kudflix is open source and free to use for your personal offline library.
* Core playback overhaul, universal codec engine, and player contributions by [**LeRubix**](https://github.com/LeRubix) ([Rubflix](https://github.com/LeRubix/Rubflix)).
* Playback engine powered by [**mpv**](https://github.com/mpv-player/mpv) under [LGPL-2.1](https://github.com/mpv-player/mpv).
