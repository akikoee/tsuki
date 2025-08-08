import { auth } from "@/lib/auth";
import { getUser } from "@/lib/database";
import { prisma } from "@/lib/prisma";
import { Playlists } from "@/models/playlist";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

async function getSpotifyPlaylists(token: string) {
  const response = await fetch(`https://api.spotify.com/v1/me/playlists`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) {
      return null;
    }
    const user = await getUser(session.user.id);
    const spotifyAccount = user?.accounts.find(
      (account) => account.providerId === "spotify"
    );
    if (!spotifyAccount) {
      return null;
    }
    const newToken = await auth.api.refreshToken({
      method: "POST",
      body: {
        providerId: "spotify",
        accountId: spotifyAccount.id,
        userId: session.user.id,
      },
    });

    if (!newToken) {
      return null;
    }

    await prisma.account.update({
      where: { id: spotifyAccount.id },
      data: {
        accessToken: newToken.accessToken || "",
        refreshToken: newToken.refreshToken || "",
      },
    });

    return getSpotifyPlaylists(newToken.accessToken || "");
  }

  if (!response.ok) {
    return null;
  }
  const data = await response.json();

  const playlists: Playlists = data;

  playlists.items.forEach((item) => {
    item.type = "spotify";
  });

  return playlists;
}

export async function GET(request: NextRequest) {
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
    (account) => account.providerId === "spotify"
  );

  if (!spotifyAccount) {
    return NextResponse.json(
      { error: "Spotify account not found" },
      { status: 404 }
    );
  }

  if (!spotifyAccount.accessToken) {
    return NextResponse.json(
      { error: "Spotify access token not found" },
      { status: 404 }
    );
  }

  const playlists = await getSpotifyPlaylists(spotifyAccount.accessToken);

  return NextResponse.json(playlists);
}
