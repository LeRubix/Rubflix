export function isSeasonFolderName(folder?: string): boolean {
  if (!folder) return false;
  const f = folder.trim().toLowerCase();
  return (
    /^(season\s*\d+|s\d+|specials?|extras?|ovas?|part\s*\d+|cour\s*\d+)$/i.test(f) ||
    /^(season|s)\s*\d+/i.test(f) ||
    Boolean(parseSeasonFromText(f))
  );
}

/** Season folder label for grouping episodes in the detail modal. */
export function getSeasonGroupKey(relativePath?: string): string {
  if (!relativePath) return 'Episodes';
  const parts = relativePath.replace(/\\/g, '/').split('/').filter(Boolean);
  if (parts.length <= 1) return 'Episodes';
  if (parts.length === 2) {
    return isSeasonFolderName(parts[0]) ? parts[0] : 'Episodes';
  }
  // Immediate parent folder of the file (Season 5, S05, etc.)
  return parts[parts.length - 2];
}

export function parseSeasonFromText(text: string): number | null {
  const patterns = [
    /\bseason\s*(\d+)\b/i,
    /\bs(\d{1,2})e(\d{1,2})\b/i,
    /(?:^|[/\\])s(\d{1,2})(?:[/\\]|$)/i,
    /(?:^|[/\\])season\s*(\d+)(?:[/\\]|$)/i,
    /\b(\d{1,2})(?:st|nd|rd|th)\s*season\b/i,
  ];
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

export function parseEpisodeFromText(text: string): number | null {
  const withoutExt = text.replace(/\.[^/.]+$/, '');

  const patterns: RegExp[] = [
    /\bpart\s*\d+\s*[-–—]\s*episode\s*(\d+)\b/i,
    /\bseason\s*\d+\s*[-–—]\s*episode\s*(\d+)\b/i,
    /\bepisode\s*(\d+)\b/i,
    /\bep(?:isode)?\.?\s*(\d+)\b/i,
    /\bs\d{1,2}e(\d{1,2})\b/i,
    /\b(\d{1,2})x(\d{1,2})\b/i,
    /(?:^|\s)[-–—]\s*(\d{1,4})(?:v\d+)?(?:\s*\(|\s*\[|\s+\d{3,4}p|\s*$)/i,
    /\b(?:e|ep)\.?\s*(\d{1,4})(?:v\d+)?(?:\b|_|\[|\()/i,
    /(?:^|[ _\-[])(\d{1,4})(?:v\d+)?(?:\s*\(1080p|\s*\(720p|\s*\[1080p|\s*\[720p)/i,
  ];

  for (const pattern of patterns) {
    const m = withoutExt.match(pattern);
    if (!m) continue;
    if (m[2] !== undefined && /\d+x\d+/i.test(m[0])) {
      return parseInt(m[2], 10);
    }
    return parseInt(m[1], 10);
  }
  return null;
}

/** Parse S/E from filename and/or relative path (folder season + file episode). */
export function resolveEpisodeNumbers(
  name: string,
  relativePath?: string,
): { season: number; episode: number } | null {
  const combined = [relativePath, name].filter(Boolean).join('/').replace(/\\/g, '/');

  // S01E02, Season 1 Episode 2, 1x02 anywhere in combined string
  const m1 = combined.match(/\bs(\d{1,2})\s*e(\d{1,2})\b/i);
  if (m1) return { season: parseInt(m1[1], 10), episode: parseInt(m1[2], 10) };

  const m2 = combined.match(/\bseason\s*(\d+)\s*episode\s*(\d+)\b/i);
  if (m2) return { season: parseInt(m2[1], 10), episode: parseInt(m2[2], 10) };

  const m3 = combined.match(/\b(\d{1,2})x(\d{1,2})\b/i);
  if (m3) return { season: parseInt(m3[1], 10), episode: parseInt(m3[2], 10) };

  // Season folder + episode filename, e.g. .../Season 5/Part 6 - Episode 01.mkv
  const m4 = combined.match(/\bseason\s*(\d+)\/[^/]*\bepisode\s*(\d+)\b/i);
  if (m4) return { season: parseInt(m4[1], 10), episode: parseInt(m4[2], 10) };

  const season = parseSeasonFromText(combined);
  const episode = parseEpisodeFromText(name) ?? parseEpisodeFromText(combined);

  if (episode != null) {
    return { season: season ?? 1, episode };
  }

  return null;
}
