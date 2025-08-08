import { Track } from "@/models/playlist";

export type MatchResult =
  | { status: "matched"; appleSongId: string; confidence: number }
  | { status: "low-confidence"; appleSongId: string; confidence: number }
  | { status: "unmatched"; reason: string };

export const getTracks = async (playlistId: string) => {
  const tracks = await fetch(
    `/api/spotify/tracks?playlistId=${playlistId}`
  ).then((res) => {
    if (!res.ok) {
      return null;
    }
    return res.json();
  });

  if (!tracks) {
    throw new Error("Failed to fetch tracks");
  }

  return tracks;
};

export const getAppleSongs = async (
  tracks: Track[],
  musicStorefront: string,
  musicUserToken: string,
  devToken: string
) => {
  const appleSongs = [];

  for (const track of tracks) {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const matchResult = await matchSpotifyTrackToApple(
      track,
      musicStorefront || "",
      musicUserToken || "",
      devToken || ""
    );

    if (matchResult.status === "matched") {
      console.log(matchResult.appleSongId);
      appleSongs.push(matchResult.appleSongId);
    } else {
      console.log(matchResult.status);
    }
  }

  return appleSongs;
};

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


export async function matchSpotifyTrackToApple(
  track: Track,
  storefront: string,
  userToken: string,
  devToken: string
): Promise<MatchResult> {
  // 1) ISRC
  if (track.isrc) {
    const r = await fetch(
      `https://api.music.apple.com/v1/catalog/${storefront}/songs?filter[isrc]=${encodeURIComponent(
        track.isrc
      )}`,
      { 
        headers: {
          Authorization: `Bearer ${devToken}`,
          "Music-User-Token": userToken,
        },
      }
    ).then((r) => (r.ok ? r.json() : null));
    const song = r?.data?.[0];
    if (song)
      return { status: "matched", appleSongId: song.id, confidence: 1.0 };
  }

  // 2) Search
  const term = [track.name, track.artists?.[0], track.album]
    .filter(Boolean)
    .join(" ");
  const s = await fetch(
    `https://api.music.apple.com/v1/catalog/${storefront}/search?types=songs&limit=5&term=${encodeURIComponent(
      term
    )}`,
    {
      headers: {
        Authorization: `Bearer ${devToken}`,
        "Music-User-Token": userToken,
      },
    }
  ).then((r) => (r.ok ? r.json() : null));

  const candidates = s?.results?.songs?.data ?? [];
  if (!candidates.length)
    return { status: "unmatched", reason: "no candidates" };

  const nTitle = norm(track.name);
  const nArtist = norm(track.artists?.[0].name);
  let best = { id: "", score: -1 };

  for (const c of candidates) {
    const a = c.attributes;
    const cTitle = norm(a.name || "");
    const cArtist = norm(a.artistName || "");
    const durMs = a.durationInMillis || 0;

    let score = 0;
    if (cTitle === nTitle) score += 0.5;
    if (cArtist === nArtist) score += 0.3;

    const delta = Math.abs(durMs - track.durationMs);
    if (delta <= 2000) score += 0.2;
    else if (delta <= 5000) score += 0.1;
    else score -= 0.3;

    if (
      /(live|karaoke|remix|instrumental)/i.test(a.name) &&
      !/(live|karaoke|remix|instrumental)/i.test(track.name)
    )
      score -= 0.3;

    if (track.explicit !== undefined && a.contentRating) {
      const explicit = a.contentRating === "explicit";
      if (explicit !== track.explicit) score -= 0.1;
    }

    if (score > best.score) best = { id: c.id, score };
  }

  if (best.score >= 0.75)
    return { status: "matched", appleSongId: best.id, confidence: best.score };
  if (best.score >= 0.5)
    return {
      status: "low-confidence",
      appleSongId: best.id,
      confidence: best.score,
    };
  return { status: "unmatched", reason: "score too low" };
}
