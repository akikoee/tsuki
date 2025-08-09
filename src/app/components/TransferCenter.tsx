"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth/auth-client";
import { getUser } from "@/lib/db/database";
import { useAuthStore } from "@/lib/store/authStore";
import { usePlaylistStore } from "@/lib/store/playlistStore";
import { useTransferStore } from "@/lib/store/transferStore";
import { Account } from "@prisma/client";
import { useCallback, useEffect, useMemo, useRef } from "react";
import ProgressArea from "./ProgressArea";
import ServiceCard from "./ServiceCard";

export default function TransferCenter() {
  const { data: session, isPending } = authClient.useSession();

  const {
    spotifyLoginState,
    appleMusicLoginState,
    setSpotifyLoginState,
    setAppleMusicLoginState,
    isAuthorizingApple,
    setIsAuthorizingApple,
    musicUserToken,
    setMusicUserToken,
    setMusicStorefront,
    setDevToken,
  } = useAuthStore();

  const {
    spotifyPlaylists,
    appleMusicPlaylists,
    isFetchingPlaylists,
    fetchSpotifyError,
    fetchAppleMusicError,
    setSpotifyPlaylists,
    setAppleMusicPlaylists,
    setIsFetchingPlaylists,
    setFetchSpotifyError,
    setFetchAppleMusicError,
  } = usePlaylistStore();

  const {
    spotifyPlaylistLink,
    isTransferring,
    transferDirection,
    currentPlaylistName,
    currentTotalTracks,
    currentIndex,
    trackEvents,
    fetchError,
    setSpotifyPlaylistLink,
    setIsTransferring,
    setTransferDirection,
    setCurrentPlaylistName,
    setCurrentTotalTracks,
    setCurrentIndex,
    setTrackEvents,
    setFetchError,
    addTrackEvent,
  } = useTransferStore();

  const sseRef = useRef<EventSource | null>(null);

  const progress = useMemo(() => {
    if (!currentTotalTracks) return 0;
    const pct = Math.round(((currentIndex + 1) / currentTotalTracks) * 100);
    return Math.max(0, Math.min(100, isFinite(pct) ? pct : 0));
  }, [currentIndex, currentTotalTracks]);

  const startSseTransfer = useCallback(
    (params: {
      all?: boolean;
      playlistIds?: string[];
      playlistUrl?: string;
      direction?: "right" | "left";
    }) => {
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
      setIsTransferring(true);
      setTransferDirection(params.direction ?? "right");
      setTrackEvents([]);
      setCurrentIndex(0);
      setCurrentTotalTracks(0);
      setCurrentPlaylistName(null);

      const query = new URLSearchParams();
      if (params.all) query.set("all", "1");
      if (params.playlistIds?.length)
        query.set("playlistIds", params.playlistIds.join(","));
      if (params.playlistUrl) query.set("playlistUrl", params.playlistUrl);
      const es = new EventSource(
        params.direction === "left"
          ? `/api/transfer/apple-to-spotify?${query.toString()}`
          : `/api/transfer/spotify-to-apple?${query.toString()}`
      );
      sseRef.current = es;

      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (data.type === "playlist-start") {
            setCurrentPlaylistName(data.name);
            setCurrentTotalTracks(data.totalTracks || 0);
            setCurrentIndex(0);
            setTrackEvents([]);
          } else if (data.type === "track") {
            setCurrentIndex(data.index);
            addTrackEvent({
              index: data.index,
              name: data.trackName,
              status: data.status,
              appleSongId: data.appleSongId,
              confidence: data.confidence,
            });
          } else if (data.type === "playlist-complete") {
          } else if (data.type === "done") {
            setIsTransferring(false);
            es.close();
            sseRef.current = null;
          } else if (data.type === "error") {
            setFetchError(data.message || "Transfer failed");
            setIsTransferring(false);
            es.close();
            sseRef.current = null;
          }
        } catch {
          // ignore
        }
      };

      es.onerror = () => {
        setFetchError("Connection lost");
        setIsTransferring(false);
        es.close();
        sseRef.current = null;
      };
    },
    [
      setIsTransferring,
      setTransferDirection,
      setTrackEvents,
      setCurrentIndex,
      setCurrentTotalTracks,
      setCurrentPlaylistName,
      setFetchError,
      addTrackEvent,
    ]
  );

  const handleTransferRightAll = useCallback(
    () => startSseTransfer({ all: true, direction: "right" }),
    [startSseTransfer]
  );
  const handleTransferRightOne = useCallback(
    (id: string) => startSseTransfer({ playlistIds: [id], direction: "right" }),
    [startSseTransfer]
  );
  const handleTransferLeftAll = useCallback(
    () => startSseTransfer({ all: true, direction: "left" }),
    [startSseTransfer]
  );
  const handleTransferLeftOne = useCallback(
    (id: string) => startSseTransfer({ playlistIds: [id], direction: "left" }),
    [startSseTransfer]
  );
  const handleTransferLink = useCallback(() => {
    if (!spotifyPlaylistLink || spotifyPlaylistLink.length === 0) {
      setFetchSpotifyError("invalid playlist link");
      return;
    }

    if (!spotifyPlaylistLink.includes("open.spotify.com/playlist/")) {
      setFetchSpotifyError("invalid playlist link");
      return;
    }

    const playlistId = spotifyPlaylistLink.split("/playlist/")[1];
    if (!playlistId) {
      setFetchSpotifyError("invalid playlist link");
      return;
    }

    if (!playlistId.match(/^[a-zA-Z0-9]+$/)) {
      setFetchSpotifyError("invalid playlist link");
      return;
    }

    startSseTransfer({
      playlistIds: [playlistId],
      direction: "right",
    });
  }, [spotifyPlaylistLink, setFetchSpotifyError, startSseTransfer]);

  const waitForMusicKit = useCallback((): Promise<unknown> => {
    return new Promise((resolve) => {
      if (typeof window !== "undefined" && "MusicKit" in window) {
        resolve((window as unknown as { MusicKit: unknown }).MusicKit);
        return;
      }
      document.addEventListener(
        "musickitloaded",
        () => resolve((window as unknown as { MusicKit: unknown }).MusicKit),
        { once: true }
      );
    });
  }, []);

  const handleConnectAppleMusic = useCallback(async () => {
    setFetchError(null);
    setIsAuthorizingApple(true);
    try {
      const devTok = await fetch("/api/apple/dev-token").then(async (r) => {
        if (!r.ok) throw new Error(r.statusText);
        const { token } = await r.json();
        return token as string;
      });

      const MusicKit = (await waitForMusicKit()) as {
        configure: (config: {
          developerToken: string;
          app: { name: string; build: string };
        }) => void;
        getInstance: () => {
          authorize: () => Promise<string>;
          storefrontId: string;
        };
      };

      MusicKit.configure({
        developerToken: devTok,
        app: { name: "Tsuki Transfer Service", build: "1.0" },
      });

      const music = MusicKit.getInstance();
      const authorizedToken = await music.authorize();

      setMusicUserToken(authorizedToken);
      setMusicStorefront(music.storefrontId);
      setDevToken(devTok);
      await fetch("/api/apple/user-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: authorizedToken,
          storefrontId: music.storefrontId,
        }),
      });
    } catch (e) {
      setFetchAppleMusicError(
        e instanceof Error ? e.message : "Apple Music authorization failed"
      );
    } finally {
      setIsAuthorizingApple(false);
    }
  }, [
    setFetchError,
    setIsAuthorizingApple,
    setMusicUserToken,
    setMusicStorefront,
    setDevToken,
    waitForMusicKit,
    setFetchAppleMusicError,
  ]);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const user = await getUser(session.user.id);
      if (!user) return;

      const spotifyAccount = user.accounts.find(
        (account: Account) => account.providerId === "spotify"
      );
      console.log("spotifyAccount", spotifyAccount);
      setSpotifyLoginState(spotifyAccount !== undefined);
      const appleAccount = user.accounts.find(
        (account: Account) => account.providerId === "apple"
      );
      setAppleMusicLoginState(appleAccount !== undefined);
      setMusicUserToken(appleAccount?.appleMusicUserToken || null);
      setMusicStorefront(appleAccount?.storefrontId || null);

      const devToken = await fetch("/api/apple/dev-token").then(async (r) => {
        if (!r.ok) throw new Error(r.statusText);
        const { token } = await r.json();
        return token as string;
      });
      setDevToken(devToken);
    })();
  }, [
    session,
    setSpotifyLoginState,
    setAppleMusicLoginState,
    setMusicUserToken,
    setMusicStorefront,
    setDevToken,
  ]);

  useEffect(() => {
    if (!spotifyLoginState) return;

    (async () => {
      setIsFetchingPlaylists(true);
      setFetchSpotifyError(null);
      const playlists = await fetch("/api/spotify/playlists").then((res) => {
        if (!res.ok) {
          setFetchSpotifyError(res.statusText);
          return null;
        }
        return res.json();
      });
      setSpotifyPlaylists(playlists);
      setIsFetchingPlaylists(false);
    })();
  }, [
    spotifyLoginState,
    setIsFetchingPlaylists,
    setFetchSpotifyError,
    setSpotifyPlaylists,
  ]);

  useEffect(() => {
    if (isAuthorizingApple || !appleMusicLoginState) return;
    (async () => {
      const playlists = await fetch("/api/apple/playlists", {
        headers: {
          "Music-User-Token": musicUserToken || "",
        },
      }).then((res) => {
        if (!res.ok) {
          setFetchAppleMusicError(res.statusText);
          return null;
        }
        return res.json();
      });
      setAppleMusicPlaylists(playlists);
    })();
  }, [
    isAuthorizingApple,
    appleMusicLoginState,
    musicUserToken,
    setAppleMusicPlaylists,
    setFetchAppleMusicError,
  ]);

  if (isPending) return <Skeleton className="h-10 w-full" />;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_minmax(280px,420px)_1fr] lg:items-stretch">
        <div className="min-w-0">
          <ServiceCard
            title="Spotify"
            brand="spotify"
            isConnected={!!spotifyLoginState}
            isLoading={isFetchingPlaylists}
            error={fetchSpotifyError}
            playlists={spotifyPlaylists}
            isOtherServiceConnected={!!appleMusicLoginState}
            enableTransferByLink={!!appleMusicLoginState}
            playlistLink={spotifyPlaylistLink}
            onPlaylistLinkChange={setSpotifyPlaylistLink}
            onTransferLink={handleTransferLink}
            onTransferAll={handleTransferRightAll}
            onTransferOne={handleTransferRightOne}
          />
        </div>

        <ProgressArea
          direction={transferDirection}
          isTransferring={isTransferring}
          currentPlaylistName={currentPlaylistName}
          progressPercent={progress}
          fetchError={fetchError}
          events={trackEvents}
        />

        <div className="min-w-0">
          <ServiceCard
            title="Apple Music"
            brand="apple"
            isConnected={!!appleMusicLoginState}
            isLoading={isFetchingPlaylists}
            error={fetchAppleMusicError}
            playlists={appleMusicPlaylists}
            isOtherServiceConnected={!!spotifyLoginState}
            onAuthorizeApple={
              appleMusicLoginState && !musicUserToken
                ? handleConnectAppleMusic
                : undefined
            }
            onTransferAll={handleTransferLeftAll}
            onTransferOne={handleTransferLeftOne}
          />
        </div>
      </div>
    </div>
  );
}
