import { auth } from "@/lib/auth";
import { getUser } from "@/lib/database";
import { getAppleDeveloperToken } from "@/lib/utils";
import {
  CreateApplePlaylist,
  LibraryPlaylistRequest,
  PlaylistItem,
  Playlists,
} from "@/models/playlist";

import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

async function createApplePlaylist(
  devToken: string,
  userToken: string,
  storefrontId: string,
  playlist: CreateApplePlaylist
) {
  const libraryPlaylistRequest: LibraryPlaylistRequest = {
    attributes: {
      name: playlist.name,
      description: playlist.description,
      isPublic: false,
    },
    relationships: {
      tracks: {
        data: [],
      },
    },
  };

  libraryPlaylistRequest.relationships.tracks.data = playlist.tracks.map(
    (track) => ({
      id: track.id,
      type: "songs",
    })
  );

  const response = await fetch(
    `https://api.music.apple.com/v1/me/library/playlists`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${devToken}`,
        "Music-User-Token": userToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(libraryPlaylistRequest),
    }
  );

  if (!response.ok) {
    console.error(response.statusText);
    return null;
  }

  const data = await response.json();

  console.log(data);

  return data;
}

async function getApplePlaylists(devToken: string, userToken: string) {
  // get library playlists (single call)
  const url = `https://api.music.apple.com/v1/me/library/playlists`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${devToken}`,
      "Music-User-Token": userToken,
    },
  });

  if (!response.ok) return null;

  const data = await response.json();

  // Build minimal playlist items directly from list response
  const basePlaylists: Array<{
    id: string;
    name: string;
    description: string;
    images: { url: string }[];
  }> = (data.data || []).map((p: {
    id: string;
    attributes?: {
      name?: string;
      description?: string;
      artwork?: {
        url?: string;
      };
    };
  }) => {
    const artworkUrl: string | undefined = p?.attributes?.artwork?.url;
    return {
      id: p.id,
      name: p?.attributes?.name ?? "",
      description: p?.attributes?.description ?? "",
      images: artworkUrl
        ? [
            {
              url: artworkUrl.replace("{w}", "32").replace("{h}", "32"),
            },
          ]
        : [],
    };
  });

  // Fetch track totals in parallel (limit=1 just to read meta.total)
  const totals = await Promise.all(
    basePlaylists.map(async (p) => {
      const tracksUrl = `https://api.music.apple.com/v1/me/library/playlists/${p.id}/tracks?limit=1`;
      const r = await fetch(tracksUrl, {
        headers: {
          Authorization: `Bearer ${devToken}`,
          "Music-User-Token": userToken,
        },
      });
      if (!r.ok) return 0;
      const body = await r.json();
      return body?.meta?.total ?? 0;
    })
  );

  const playlistItems: PlaylistItem[] = basePlaylists.map((p, i) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    type: "apple",
    images: p.images,
    tracks: { items: [], total: totals[i] ?? 0 },
  }));

  return {
    total: playlistItems.length,
    items: playlistItems,
  } satisfies Playlists;
}
export async function GET() {
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

  const appleAccount = user.accounts.find(
    (account) => account.providerId === "apple"
  );

  if (!appleAccount) {
    return NextResponse.json(
      { error: "Apple account not found" },
      { status: 404 }
    );
  }

  if (!appleAccount.accessToken || !appleAccount.appleMusicUserToken) {
    return NextResponse.json(
      { error: "Apple access token not found" },
      { status: 404 }
    );
  }

  const devToken = await getAppleDeveloperToken();
  const playlists = await getApplePlaylists(
    devToken,
    appleAccount.appleMusicUserToken
  );
  return NextResponse.json(playlists);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

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

  const appleAccount = user.accounts.find(
    (account) => account.providerId === "apple"
  );

  if (!appleAccount) {
    return NextResponse.json(
      { error: "Apple account not found" },
      { status: 404 }
    );
  }

  const devToken = await getAppleDeveloperToken();

  const newPlaylist = await createApplePlaylist(
    devToken,
    appleAccount.appleMusicUserToken || "",
    appleAccount.storefrontId || "us",
    body
  );

  return NextResponse.json(newPlaylist);
}
