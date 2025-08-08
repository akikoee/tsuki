import { auth } from "@/lib/auth/auth";
import { getUser } from "@/lib/db/database";
import { matchSpotifyTrackToApple } from "@/lib/matching/spotify-to-apple";
import { getAppleDeveloperToken } from "@/lib/utils";
import { PlaylistItem, Track } from "@/models/thirdparty";
import { headers } from "next/headers";
import { NextRequest } from "next/server";

type TransferEvent =
  | { type: "start"; totalPlaylists: number }
  | {
      type: "playlist-start";
      playlistId: string;
      name: string;
      totalTracks: number;
    }
  | {
      type: "track";
      playlistId: string;
      index: number;
      total: number;
      trackName: string;
      status: "matched" | "low-confidence" | "unmatched";
      appleSongId?: string;
      confidence?: number;
    }
  | {
      type: "playlist-complete";
      playlistId: string;
      name: string;
      createdApplePlaylistId?: string;
    }
  | { type: "done" }
  | { type: "error"; message: string };

// App-level Spotify token (client credentials) for public playlist reads
let appAccessToken: { token: string; expiresAt: number } | null = null;
async function getSpotifyAppToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (appAccessToken && appAccessToken.expiresAt > now + 30) {
    return appAccessToken.token;
  }
  const clientId = process.env.SPOTIFY_CLIENT_ID || "";
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || "";
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }).toString(),
  });
  if (!res.ok) throw new Error("Failed to get Spotify app token");
  const body = await res.json();
  appAccessToken = {
    token: body.access_token as string,
    expiresAt: now + (body.expires_in as number),
  };
  return appAccessToken.token;
}

function parseSpotifyPlaylistId(input: string): string | null {
  try {
    // Support open.spotify.com/playlist/{id} or spotify:playlist:{id}
    const colon = input.match(/spotify:playlist:([a-zA-Z0-9]+)/);
    if (colon) return colon[1];
    const url = new URL(input);
    const parts = url.pathname.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => p === "playlist");
    if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
    return null;
  } catch {
    // maybe just an ID was passed
    if (/^[a-zA-Z0-9]+$/.test(input)) return input;
    return null;
  }
}

async function fetchSpotifyPlaylistMeta(token: string, playlistId: string) {
  const res = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) return null;
  const p = await res.json();
  const item: PlaylistItem = {
    id: p.id,
    name: p.name,
    description: p.description || "",
    type: "spotify",
    images: p.images || [],
    tracks: { items: [], total: p.tracks?.total ?? 0 },
  };
  return item;
}
async function fetchSpotifyPlaylists(token: string): Promise<PlaylistItem[]> {
  const response = await fetch(
    "https://api.spotify.com/v1/me/playlists?limit=50",
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) return [];
  const data = await response.json();
  const items: PlaylistItem[] = (
    data.items as Array<{
      id: string;
      name: string;
      description?: string;
      images?: { url: string }[];
      tracks?: { total?: number };
    }>
  ).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description || "",
    type: "spotify",
    images: p.images || [],
    tracks: { items: [], total: p.tracks?.total ?? 0 },
  }));

  let next: string | null = data.next;
  while (next) {
    const res = await fetch(next, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) break;
    const body = await res.json();
    items.push(
      ...(
        body.items as Array<{
          id: string;
          name: string;
          description?: string;
          images?: { url: string }[];
          tracks?: { total?: number };
        }>
      ).map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description || "",
        type: "spotify",
        images: p.images || [],
        tracks: { items: [], total: p.tracks?.total ?? 0 },
      }))
    );
    next = body.next;
  }
  return items;
}

async function fetchSpotifyPlaylistTracks(token: string, playlistId: string) {
  const response = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!response.ok) return { items: [] as Track[], total: 0 };
  const body = await response.json();
  type SpotifyArtistLite = { name: string };
  type SpotifyAlbumLite = {
    name: string;
    artists?: SpotifyArtistLite[];
    total_tracks: number;
  };
  type SpotifyTrackLite = {
    id: string;
    name: string;
    artists?: SpotifyArtistLite[];
    album?: SpotifyAlbumLite;
    external_ids?: { isrc?: string };
    duration_ms: number;
    explicit?: boolean;
  };
  const items: Track[] = (body.items as Array<{ track: SpotifyTrackLite }>).map(
    (item) => {
      const t = item.track;
      return {
        id: t.id,
        name: t.name,
        artists: (t.artists || []).map((a: SpotifyArtistLite) => ({
          name: a.name,
        })),
        album: t.album
          ? {
              name: t.album.name,
              artists: (t.album.artists || []).map((a: SpotifyArtistLite) => ({
                name: a.name,
              })),
              total_tracks: t.album.total_tracks,
            }
          : undefined,
        isrc: t.external_ids?.isrc,
        durationMs: t.duration_ms,
        explicit: t.explicit,
      } satisfies Track;
    }
  );

  const tracks = { items, total: body.total as number } as {
    items: Track[];
    total: number;
  };
  let next: string | null = body.next;
  while (next) {
    const res = await fetch(next, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) break;
    const data = await res.json();
    for (const it of data.items as Array<{ track: SpotifyTrackLite }>) {
      const tt = it.track;
      tracks.items.push({
        id: tt.id,
        name: tt.name,
        artists: (tt.artists || []).map((a: SpotifyArtistLite) => ({
          name: a.name,
        })),
        album: tt.album
          ? {
              name: tt.album.name,
              artists: (tt.album.artists || []).map((a: SpotifyArtistLite) => ({
                name: a.name,
              })),
              total_tracks: tt.album.total_tracks,
            }
          : undefined,
        isrc: tt.external_ids?.isrc,
        durationMs: tt.duration_ms,
        explicit: tt.explicit,
      } as Track);
    }
    next = data.next;
  }
  return tracks;
}

async function createAppleLibraryPlaylist(
  devToken: string,
  userToken: string,
  name: string,
  description: string,
  songIds: string[]
): Promise<string | undefined> {
  if (songIds.length === 0) return undefined;
  const payload = {
    attributes: { name, description, isPublic: false },
    relationships: {
      tracks: {
        data: songIds.map((id) => ({ id, type: "songs" as const })),
      },
    },
  };

  const res = await fetch(
    "https://api.music.apple.com/v1/me/library/playlists",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${devToken}`,
        "Music-User-Token": userToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) return undefined;
  const data = await res.json();
  return data?.data?.[0]?.id as string | undefined;
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  const { searchParams } = new URL(request.url);
  const all =
    searchParams.get("all") === "1" || searchParams.get("all") === "true";
  const playlistIdsParam = searchParams.get("playlistIds");
  const playlistIds = playlistIdsParam
    ? playlistIdsParam.split(",").filter(Boolean)
    : [];
  const playlistUrl = searchParams.get("playlistUrl");

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const send = async (event: TransferEvent) => {
    await writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
  };

  (async () => {
    try {
      if (!session) {
        await send({ type: "error", message: "Unauthorized" });
        await writer.close();
        return;
      }
      const user = await getUser(session.user.id);
      if (!user) {
        await send({ type: "error", message: "User not found" });
        await writer.close();
        return;
      }
      const appleAccount = user.accounts.find((a) => a.providerId === "apple");
      const spotifyAccount = user.accounts.find(
        (a) => a.providerId === "spotify"
      );
      // For login-less mode, allow missing Spotify account if a playlist URL is provided
      if (!playlistUrl && (!spotifyAccount || !spotifyAccount.accessToken)) {
        await send({ type: "error", message: "Spotify account not found" });
        await writer.close();
        return;
      }
      if (
        !appleAccount ||
        !appleAccount.appleMusicUserToken ||
        !appleAccount.storefrontId
      ) {
        await send({ type: "error", message: "Apple Music not authorized" });
        await writer.close();
        return;
      }

      const devToken = await getAppleDeveloperToken();

      let selectedPlaylists: PlaylistItem[] = [];
      if (playlistUrl) {
        const publicId = parseSpotifyPlaylistId(playlistUrl);
        if (!publicId) {
          await send({
            type: "error",
            message: "Invalid Spotify playlist URL",
          });
          await writer.close();
          return;
        }
        const appToken = await getSpotifyAppToken();
        const meta = await fetchSpotifyPlaylistMeta(appToken, publicId);
        if (!meta) {
          await send({
            type: "error",
            message: "Playlist not found or not public",
          });
          await writer.close();
          return;
        }
        selectedPlaylists = [meta];
      } else if (all) {
        selectedPlaylists = await fetchSpotifyPlaylists(
          spotifyAccount!.accessToken!
        );
      } else if (playlistIds.length > 0) {
        // Fetch metadata for specific playlists
        const allPlaylists = await fetchSpotifyPlaylists(
          spotifyAccount!.accessToken!
        );
        selectedPlaylists = allPlaylists.filter((p) =>
          playlistIds.includes(p.id)
        );
      }

      await send({ type: "start", totalPlaylists: selectedPlaylists.length });

      for (const playlist of selectedPlaylists) {
        const tokenToUse = playlistUrl
          ? await getSpotifyAppToken()
          : (spotifyAccount!.accessToken as string);
        const tracks = await fetchSpotifyPlaylistTracks(
          tokenToUse,
          playlist.id
        );
        await send({
          type: "playlist-start",
          playlistId: playlist.id,
          name: playlist.name,
          totalTracks: tracks.total,
        });

        const matchedSongIds: string[] = [];
        let index = 0;
        for (const track of tracks.items) {
          const result = await matchSpotifyTrackToApple(
            track,
            appleAccount.storefrontId,
            appleAccount.appleMusicUserToken,
            devToken
          );
          if (
            result.status === "matched" ||
            result.status === "low-confidence"
          ) {
            matchedSongIds.push(result.appleSongId);
          }
          await send({
            type: "track",
            playlistId: playlist.id,
            index,
            total: tracks.items.length,
            trackName: track.name,
            status: result.status,
            appleSongId: (result as { appleSongId?: string }).appleSongId,
            confidence: (result as { confidence?: number }).confidence,
          });
          index += 1;
        }

        const createdId = await createAppleLibraryPlaylist(
          devToken,
          appleAccount.appleMusicUserToken,
          playlist.name,
          playlist.description,
          matchedSongIds
        );

        await send({
          type: "playlist-complete",
          playlistId: playlist.id,
          name: playlist.name,
          createdApplePlaylistId: createdId,
        });
      }

      await send({ type: "done" });
      await writer.close();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      await send({ type: "error", message });
      try {
        await writer.close();
      } catch {}
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Allow Next.js to stream immediately
      "Transfer-Encoding": "chunked",
    },
  });
}
