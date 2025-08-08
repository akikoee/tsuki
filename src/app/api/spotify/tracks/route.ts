import { Account } from "@/generated/prisma";
import { auth } from "@/lib/auth";
import { getUser } from "@/lib/database";
import { Album, Artist, SpotifyTrack, Track } from "@/models/playlist";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

async function getSpotifyPlaylistTracks(token: string, playlistId: string) {
  const response = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    return null;
  }

  const body = await response.json();
  const items = body.items.map((item: { track: SpotifyTrack }) => {
    const track = item.track;
    return {
      id: track.id,
      name: track.name,
      artists: track.artists.map((artist: Artist) => ({
        name: artist.name,
      })),
      album: track.album as Album,
      isrc: track.external_ids?.isrc,
      durationMs: track.duration_ms,
      explicit: track.explicit,
    } as Track;
  });

  const tracks = {
    items,
    total: body.total,
  };

  let next = body.next;

  let hasMore = next !== null;
  while (hasMore) {
    const response = await fetch(next, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      return null;
    }
    const data = await response.json();

    tracks.items.push(
      ...data.items.map((item: { track: Track }) => item.track)
    );
    next = data.next;
    hasMore = next !== null;
  }

  return tracks;
}

export async function GET(request: NextRequest) {
  const { searchParams } = await request.nextUrl;
  const playlistId = searchParams.get("playlistId");

  if (!playlistId) {
    return NextResponse.json(
      { error: "Playlist ID is required" },
      { status: 400 }
    );
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getUser(session.user.id);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const spotifyAccount = user.accounts.find(
    (account: Account) => account.providerId === "spotify"
  );

  if (!spotifyAccount) {
    return NextResponse.json(
      { error: "Spotify account not found" },
      { status: 404 }
    );
  }

  const tracks = await getSpotifyPlaylistTracks(
    spotifyAccount.accessToken || "",
    playlistId
  );

  return NextResponse.json(tracks, { status: 200 });
}
