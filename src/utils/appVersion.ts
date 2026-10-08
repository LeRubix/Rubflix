declare const __APP_VERSION__: string | undefined;

export function getBundledAppVersion(): string {
  return typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';
}

export async function resolveAppVersion(): Promise<string> {
  if (window.electronAPI?.getAppVersion) {
    try {
      return await window.electronAPI.getAppVersion();
    } catch {
      // fall through
    }
  }
  return getBundledAppVersion();
}
