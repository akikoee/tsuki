"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { PlaylistItem } from "@/models/thirdparty";
import React from "react";
import LoginButton from "./LoginButton";
import PlaylistCard from "./PlaylistCard";

type Props = {
  title: string;
  brand: "spotify" | "apple";
  isConnected: boolean;
  isOtherServiceConnected: boolean;
  isLoading?: boolean;
  error?: string | null;
  playlists?: { items: PlaylistItem[] } | null;
  onLogin?: () => void;
  onAuthorizeApple?: () => void;
  onTransferAll?: () => void;
  onTransferOne?: (playlistId: string) => void;
  playlistLink?: string;
  onPlaylistLinkChange?: (val: string) => void;
  onTransferLink?: () => void;
  enableTransferByLink?: boolean;
};

export default React.memo(function ServiceCard(props: Props) {
  const accent = props.brand === "spotify" ? "emerald" : "rose";
  const titleColor = `text-${accent}-900`;
  const badgeColor = props.isConnected
    ? `bg-${accent}-600`
    : `bg-${accent}-200 text-${accent}-900`;
  const borderColor = `border-${accent}-100`;
  const bgTint = `bg-${accent}-50/60`;
  const sep = `bg-${accent}-100`;
  const primaryBtn = `w-full bg-${accent}-500 hover:bg-${accent}-600`;

  return (
    <div className={`rounded-xl border ${borderColor} ${bgTint} p-4`}>
      <div className="flex items-center justify-between">
        <p className={`font-medium ${titleColor}`}>{props.title}</p>
        <Badge className={badgeColor}>
          {props.isConnected ? "Connected" : "Not connected"}
        </Badge>
      </div>

      <Separator className={`my-3 ${sep}`} />

      {!props.isConnected && props.brand === "spotify" && (
        <LoginButton provider="spotify" />
      )}
      {!props.isConnected && props.brand === "apple" && (
        <LoginButton provider="apple" />
      )}

      {/* Apple library authorize button */}
      {props.brand === "apple" &&
        props.isConnected &&
        props.onAuthorizeApple && (
          <div className="mt-3">
            <Button className={primaryBtn} onClick={props.onAuthorizeApple}>
              Authorize Apple Music
            </Button>
          </div>
        )}

      {props.isConnected && (
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">
            {props.isLoading ? "Fetching playlists..." : ""}
          </p>
          {props.error && (
            <p className="mt-2 text-sm text-red-500">{props.error}</p>
          )}

          {props.playlists ? (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">
                {props.playlists.items.length} playlists found
              </p>
              <Separator className={`my-3 ${sep}`} />
              <ul className="mt-2 h-[400px] space-y-2 overflow-y-auto overscroll-contain">
                {props.playlists.items.map((playlist) => (
                  <PlaylistCard
                    key={playlist.id}
                    playlist={playlist}
                    onTransfer={
                      props.onTransferOne && props.isOtherServiceConnected
                        ? props.onTransferOne
                        : undefined
                    }
                  />
                ))}
              </ul>
              <Separator className={`my-3 ${sep}`} />
              {props.onTransferAll && props.isOtherServiceConnected && (
                <Button
                  className={`w-full ${primaryBtn}`}
                  onClick={props.onTransferAll}
                >
                  Transfer all playlists
                </Button>
              )}
            </div>
          ) : (
            <Skeleton className="h-[400px] w-full" />
          )}
        </div>
      )}

      {/* Optional login-less playlist link (Spotify) */}
      {props.brand === "spotify" && (
        <div className="mt-4 flex flex-col gap-2">
          <p className="text-sm text-muted-foreground text-center mb-2">
            Or transfer a single playlist by entering the playlist link
            <br />
            (Only available if you have authorized Apple Music)
          </p>
          <Input
            placeholder="Enter Spotify playlist link here..."
            className="w-full"
            value={props.playlistLink}
            disabled={!props.enableTransferByLink}
            onChange={(e) => props.onPlaylistLinkChange?.(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") props.onTransferLink?.();
            }}
          />
          <Button
            className={`w-full ${primaryBtn}`}
            disabled={!props.enableTransferByLink}
            onClick={props.onTransferLink}
          >
            Transfer
          </Button>
        </div>
      )}
    </div>
  );
});
