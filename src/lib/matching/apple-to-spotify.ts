export type MatchResult =
  | { status: "matched"; spotifyTrackId: string; confidence: number }
  | { status: "low-confidence"; spotifyTrackId: string; confidence: number }
  | { status: "unmatched"; reason: string };

export interface AppleTrackLite {
  id: string; // apple library track id or catalog id
  name: string;
  artistName: string;
  albumName?: string;
  isrc?: string;
  durationMs?: number;
  explicit?: boolean;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\(\)\[\]\-–—_:]/g, " ")
    .replace(
      /\b(remaster(ed)?|live|remix|karaoke|instrumental|mono|commentary)\b/gi,
      ""
    )
    .replace(/\b(feat\.?|with)\b.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

export async function matchAppleTrackToSpotify(
  track: AppleTrackLite,
  spotifyToken: string
): Promise<MatchResult> {
  // 1) ISRC search
  if (track.isrc) {
    const byIsrc = await fetch(
      `https://api.spotify.com/v1/search?q=isrc:${encodeURIComponent(
        track.isrc
      )}&type=track&limit=1`,
      { headers: { Authorization: `Bearer ${spotifyToken}` } }
    ).then((r) => (r.ok ? r.json() : null));
    const item = byIsrc?.tracks?.items?.[0];
    if (item) {
      return { status: "matched", spotifyTrackId: item.id, confidence: 1.0 };
    }
  }

  // 2) Fallback query: title + artist + album
  const parts = [track.name, track.artistName, track.albumName].filter(Boolean);
  const q = parts.join(" ");
  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(
      q
    )}&type=track&limit=5`,
    { headers: { Authorization: `Bearer ${spotifyToken}` } }
  ).then((r) => (r.ok ? r.json() : null));

  const candidates = res?.tracks?.items ?? [];
  if (!candidates.length)
    return { status: "unmatched", reason: "no candidates" };

  const nTitle = norm(track.name);
  const nArtist = norm(track.artistName);
  let best: { id: string; score: number } = { id: "", score: -1 };

  for (const c of candidates) {
    const cTitle = norm(c.name || "");
    const cArtist = norm(c.artists?.[0]?.name || "");
    const durMs: number = c.duration_ms || 0;

    let score = 0;
    if (cTitle === nTitle) score += 0.5;
    if (cArtist === nArtist) score += 0.3;

    const delta = Math.abs((track.durationMs || 0) - durMs);
    if (track.durationMs) {
      if (delta <= 2000) score += 0.2;
      else if (delta <= 5000) score += 0.1;
      else score -= 0.3;
    }

    if (/\b(live|karaoke|remix|instrumental)\b/i.test(c.name) && !/\b(live|karaoke|remix|instrumental)\b/i.test(track.name))
      score -= 0.3;

    if (typeof track.explicit === "boolean") {
      if (c.explicit !== track.explicit) score -= 0.1;
    }

    if (score > best.score) best = { id: c.id, score };
  }

  if (best.score >= 0.75)
    return { status: "matched", spotifyTrackId: best.id, confidence: best.score };
  if (best.score >= 0.6)
    return {
      status: "low-confidence",
      spotifyTrackId: best.id,
      confidence: best.score,
    };
  return { status: "unmatched", reason: "score too low" };
}


