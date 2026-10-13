function norm(p: string): string {
  return p.replace(/\//g, '\\').toLowerCase();
}

const cancelled = new Set<string>();

export function cancelEnrich(paths: string[]): void {
  for (const p of paths) {
    if (p) cancelled.add(norm(p));
  }
}

export function isEnrichCancelled(path: string): boolean {
  return cancelled.has(norm(path));
}

export function clearEnrichCancel(path: string): void {
  cancelled.delete(norm(path));
}
