import { auth } from "@/lib/auth/auth";
import { getUser } from "@/lib/db/database";
import { matchAppleTrackToSpotify } from "@/lib/matching/apple-to-spotify";
import { getAppleDeveloperToken } from "@/lib/utils";
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
      spotifyTrackId?: string;
      confidence?: number;
    }
  | {
      type: "playlist-complete";
      playlistId: string;
      name: string;
      createdSpotifyPlaylistId?: string;
    }
  | { type: "done" }
  | { type: "error"; message: string };

async function fetchAppleLibraryPlaylists(devToken: string, userToken: string) {
  const url = `https://api.music.apple.com/v1/me/library/playlists`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${devToken}`,
      "Music-User-Token": userToken,
    },
  });
  if (!response.ok) return [];
  const data = await response.json();
  return (
    data.data?.map(
      (p: {
        id: string;
        attributes?: { name?: string };
        relationships?: { tracks?: { data?: unknown[] } };
      }) => ({
        id: p.id,
        name: p.attributes?.name ?? "",
        total:
          (p.relationships?.tracks?.data as unknown[] | undefined)?.length ?? 0,
      })
    ) ?? []
  );
}

async function fetchAppleLibraryPlaylistTracks(
  devToken: string,
  userToken: string,
  playlistId: string
) {
  const url = `https://api.music.apple.com/v1/me/library/playlists/${playlistId}/tracks?limit=100`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${devToken}`,
      "Music-User-Token": userToken,
    },
  });
  if (!response.ok)
    return {
      items: [] as Array<{ id: string; name: string; artistName: string }>,
      total: 0,
    };
  const body = await response.json();
  const items = (
    (body.data as
      | Array<{ id: string; attributes?: Record<string, unknown> }>
      | undefined) || []
  ).map((item) => {
    const a = (item.attributes || {}) as {
      name?: string;
      artistName?: string;
      albumName?: string;
      isrc?: string;
      durationInMillis?: number;
      contentRating?: string;
      playParams?: { isrc?: string };
    };
    const isrc = a.isrc ?? a.playParams?.isrc; // library sometimes lacks direct isrc
    return {
      id: item.id,
      name: a.name,
      artistName: a.artistName,
      albumName: a.albumName,
      isrc,
      durationMs: a.durationInMillis,
      explicit: a.contentRating === "explicit",
    };
  });

  return {
    items,
    total: (body.meta?.total as number | undefined) ?? items.length,
  };
}

async function createSpotifyPlaylist(
  accessToken: string,
  name: string,
  description: string | undefined,
  userId: string
) {
  const res = await fetch(
    `https://api.spotify.com/v1/users/${userId}/playlists`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        description: description ?? "",
        public: false,
      }),
    }
  );
  if (!res.ok) return undefined;
  const data = await res.json();
  return data.id as string | undefined;
}

async function addTracksToSpotifyPlaylist(
  accessToken: string,
  playlistId: string,
  trackIds: string[]
) {
  if (trackIds.length === 0) return;
  // Spotify requires URIs
  const uris = trackIds.map((id) => `spotify:track:${id}`);
  await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ uris }),
  });
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
      const spotifyAccount = user.accounts.find(
        (a) => a.providerId === "spotify"
      );
      const appleAccount = user.accounts.find((a) => a.providerId === "apple");
      if (!spotifyAccount || !spotifyAccount.accessToken) {
        await send({ type: "error", message: "Spotify account not found" });
        await writer.close();
        return;
      }
      if (!appleAccount || !appleAccount.appleMusicUserToken) {
        await send({ type: "error", message: "Apple Music not authorized" });
        await writer.close();
        return;
      }

      const devToken = await getAppleDeveloperToken();
      // current spotify user id
      const me = await fetch(`https://api.spotify.com/v1/me`, {
        headers: { Authorization: `Bearer ${spotifyAccount.accessToken}` },
      }).then((r) => (r.ok ? r.json() : null));
      const spotifyUserId = me?.id as string | undefined;
      if (!spotifyUserId) {
        await send({
          type: "error",
          message: "Failed to resolve Spotify user",
        });
        await writer.close();
        return;
      }

      let selectedPlaylists: { id: string; name: string; total: number }[] = [];
      if (all) {
        const lib = await fetchAppleLibraryPlaylists(
          devToken,
          appleAccount.appleMusicUserToken
        );
        selectedPlaylists = lib;
      } else if (playlistIds.length > 0) {
        const lib = await fetchAppleLibraryPlaylists(
          devToken,
          appleAccount.appleMusicUserToken
        );
        selectedPlaylists = lib.filter((p: { id: string }) =>
          playlistIds.includes(p.id)
        );
      }

      await send({ type: "start", totalPlaylists: selectedPlaylists.length });

      for (const playlist of selectedPlaylists) {
        const tracks = await fetchAppleLibraryPlaylistTracks(
          devToken,
          appleAccount.appleMusicUserToken,
          playlist.id
        );
        await send({
          type: "playlist-start",
          playlistId: playlist.id,
          name: playlist.name,
          totalTracks: tracks.total,
        });

        const matchedTrackIds: string[] = [];
        let index = 0;
        for (const track of tracks.items as Array<{
          id: string;
          name?: string;
          artistName?: string;
          albumName?: string;
          isrc?: string;
          durationMs?: number;
          explicit?: boolean;
        }>) {
          const result = await matchAppleTrackToSpotify(
            {
              id: track.id,
              name: track.name || "",
              artistName: track.artistName || "",
              albumName: track.albumName,
              isrc: track.isrc,
              durationMs: track.durationMs,
              explicit: track.explicit,
            },
            spotifyAccount.accessToken
          );
          if (
            result.status === "matched" ||
            result.status === "low-confidence"
          ) {
            matchedTrackIds.push(result.spotifyTrackId);
          }
          await send({
            type: "track",
            playlistId: playlist.id,
            index,
            total: tracks.items.length,
            trackName: track.name || "",
            status: result.status,
            spotifyTrackId: (result as { spotifyTrackId?: string })
              .spotifyTrackId,
            confidence: (result as { confidence?: number }).confidence,
          });
          index += 1;
        }

        const createdId = await createSpotifyPlaylist(
          spotifyAccount.accessToken,
          playlist.name,
          undefined,
          spotifyUserId
        );
        if (createdId) {
          // add in batches of 100
          for (let i = 0; i < matchedTrackIds.length; i += 100) {
            await addTracksToSpotifyPlaylist(
              spotifyAccount.accessToken,
              createdId,
              matchedTrackIds.slice(i, i + 100)
            );
          }
        }

        await send({
          type: "playlist-complete",
          playlistId: playlist.id,
          name: playlist.name,
          createdSpotifyPlaylistId: createdId,
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
      "Transfer-Encoding": "chunked",
    },
  });
}
