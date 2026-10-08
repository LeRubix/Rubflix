const { contextBridge, ipcRenderer } = require('electron');

function subscribe(channel, callback) {
  const handler = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

contextBridge.exposeInMainWorld('electronAPI', {
  scanDirectory: (dirPath) => ipcRenderer.invoke('scan-directory', dirPath),
  setAppIcon: (variant) => ipcRenderer.invoke('set-app-icon', variant),
  getAppIconPath: (variant) => ipcRenderer.invoke('get-app-icon-path', variant),
  updateLibraryWatch: (folders) => ipcRenderer.invoke('update-library-watch', folders),
  onLibraryChanged: (callback) => subscribe('library-changed', callback),
  showInExplorer: (filePath) => ipcRenderer.invoke('show-in-explorer', filePath),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  selectFolders: () => ipcRenderer.invoke('select-folders'),
  selectFile: () => ipcRenderer.invoke('select-file'),
  cacheProfileImage: () => ipcRenderer.invoke('cache-profile-image'),
  pickProfileImage: () => ipcRenderer.invoke('pick-profile-image'),
  saveProfileImage: (dataUrl) => ipcRenderer.invoke('save-profile-image', dataUrl),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  selectWallpaperImage: () => ipcRenderer.invoke('select-wallpaper-image'),
  playInExternalPlayer: (playerPath, videoPath) => ipcRenderer.invoke('play-in-external-player', playerPath, videoPath),
  probeMedia: (videoPath) => ipcRenderer.invoke('probe-media', videoPath),
  probeMediaDuration: (videoPath) => ipcRenderer.invoke('probe-media-duration', videoPath),
  probeTracks: (videoPath) => ipcRenderer.invoke('probe-tracks', videoPath),
  findSubtitleFiles: (videoPath) => ipcRenderer.invoke('find-subtitle-files', videoPath),
  selectSubtitleFile: () => ipcRenderer.invoke('select-subtitle-file'),

  // Library window
  playerStart: (session) => ipcRenderer.invoke('player-start', session),
  onPlayerExited: (callback) => subscribe('player-exited', callback),
  onPlayerRequestNext: (callback) => subscribe('player-request-next', callback),

  // Player controls window
  playerGetSession: () => ipcRenderer.invoke('player-get-session'),
  onPlayerSession: (callback) => subscribe('player-session', callback),
  playerOpen: (filePath, options) => ipcRenderer.invoke('player-open', filePath, options),
  playerCommand: (action, value) => ipcRenderer.invoke('player-command', action, value),
  playerToggleFullscreen: () => ipcRenderer.invoke('player-toggle-fullscreen'),
  playerSetFullscreen: (fullscreen) => ipcRenderer.invoke('player-set-fullscreen', fullscreen),
  playerRequestNext: () => ipcRenderer.invoke('player-request-next'),
  playerExit: (payload) => ipcRenderer.invoke('player-exit', payload),
  onPlayerState: (callback) => subscribe('player-state', callback),
  onPlayerFullscreen: (callback) => subscribe('player-fullscreen', callback),
});
