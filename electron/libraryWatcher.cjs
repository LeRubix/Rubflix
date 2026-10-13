const chokidar = require('chokidar');
const fs = require('fs');

const DEBOUNCE_MS = 2000;

class LibraryWatcher {
  constructor(onChange, onPathsRemoved) {
    this.onChange = onChange;
    this.onPathsRemoved = onPathsRemoved;
    this.watcher = null;
    this.debounceTimer = null;
  }

  updateFolders(folders = []) {
    this.stop();
    const valid = [...new Set(folders.filter((f) => f && fs.existsSync(f)))];
    if (valid.length === 0) return;

    this.watcher = chokidar.watch(valid, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 1500, pollInterval: 100 },
      ignored: (p) => {
        const base = p.split(/[/\\]/).pop() ?? '';
        return base.startsWith('.');
      },
    });

    const notify = () => {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.debounceTimer = null;
        this.onChange();
      }, DEBOUNCE_MS);
    };

    const notifyRemoved = (removedPath) => {
      if (this.onPathsRemoved && removedPath) {
        this.onPathsRemoved([removedPath]);
      }
      notify();
    };

    this.watcher.on('add', notify);
    this.watcher.on('change', notify);
    this.watcher.on('unlink', notifyRemoved);
    this.watcher.on('addDir', notify);
    this.watcher.on('unlinkDir', notifyRemoved);
  }

  stop() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }
}

module.exports = { LibraryWatcher };
