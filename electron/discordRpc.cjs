const RPC = require('discord-rpc');

const DEFAULT_CLIENT_ID = '737663962677510245';

class DiscordRpcManager {
  constructor() {
    this.client = null;
    this.clientId = DEFAULT_CLIENT_ID;
    this.enabled = true;
    this.connected = false;
    this.connecting = false;
    this.currentActivity = null;
    this.reconnectTimer = null;
    this.lastState = null;
    this.lastSession = null;
  }

  init(clientId) {
    if (clientId) {
      this.clientId = clientId;
    }
    this.connect();
  }

  connect() {
    if (!this.enabled || this.connected || this.connecting) return;
    this.connecting = true;

    try {
      this.client = new RPC.Client({ transport: 'ipc' });

      this.client.on('ready', () => {
        this.connected = true;
        this.connecting = false;
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
        if (this.currentActivity) {
          this.applyActivity(this.currentActivity);
        }
      });

      this.client.on('disconnected', () => {
        this.connected = false;
        this.connecting = false;
        this.scheduleReconnect();
      });

      this.client.login({ clientId: this.clientId }).catch(() => {
        this.connected = false;
        this.connecting = false;
        this.scheduleReconnect();
      });
    } catch {
      this.connected = false;
      this.connecting = false;
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer || !this.enabled) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 20000); // retry every 20s if Discord was closed
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) {
      this.clear();
      if (this.client) {
        try {
          this.client.destroy();
        } catch {
          // ignore
        }
        this.client = null;
        this.connected = false;
      }
    } else {
      this.connect();
    }
  }

  setClientId(clientId) {
    const id = clientId?.trim() || DEFAULT_CLIENT_ID;
    if (id !== this.clientId) {
      this.clientId = id;
      if (this.client) {
        try {
          this.client.destroy();
        } catch {
          // ignore
        }
        this.client = null;
        this.connected = false;
      }
      this.connect();
    }
  }

  updatePlayback(session, state) {
    if (!session) {
      this.clear();
      return;
    }

    this.lastSession = session;
    this.lastState = state;

    if (!this.enabled) return;

    const title = session.title || 'Video';
    const subtitle = session.subtitle || (session.isFolder ? 'TV Series' : 'Movie');
    const isPaused = Boolean(state?.pause);

    const activity = {
      details: title.length > 128 ? title.slice(0, 125) + '...' : title,
      state: isPaused ? `${subtitle} (Paused)` : subtitle,
      largeImageKey: 'mpv',
      largeImageText: 'Kudflix',
      smallImageKey: isPaused ? 'pause' : 'play',
      smallImageText: isPaused ? 'Paused' : 'Playing',
      instance: false,
    };

    if (!isPaused && state?.duration && state.duration > 0 && typeof state?.timePos === 'number') {
      const now = Date.now();
      const currentMs = state.timePos * 1000;
      const durationMs = state.duration * 1000;
      activity.startTimestamp = Math.floor(now - currentMs);
      activity.endTimestamp = Math.floor(now + (durationMs - currentMs));
    }

    this.currentActivity = activity;
    this.applyActivity(activity);
  }

  applyActivity(activity) {
    if (!this.connected || !this.client || !this.enabled) return;
    try {
      this.client.setActivity(activity).catch(() => {});
    } catch {
      // ignore
    }
  }

  clear() {
    this.currentActivity = null;
    this.lastSession = null;
    this.lastState = null;
    if (this.connected && this.client) {
      try {
        this.client.clearActivity().catch(() => {});
      } catch {
        // ignore
      }
    }
  }
}

const discordRpc = new DiscordRpcManager();

module.exports = { discordRpc };
