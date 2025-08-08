import { Button } from "@/components/ui/button";
import { PlaylistItem } from "@/models/thirdparty";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import Image from "next/image";
import React from "react";

export default React.memo(function PlaylistCard(props: {
  playlist: PlaylistItem;
  onTransfer?: (playlistId: string) => void;
}) {
  const textColor =
    props.playlist.type === "spotify" ? "text-emerald-900" : "text-rose-900";

  const borderColor =
    props.playlist.type === "spotify"
      ? "border-emerald-100"
      : "border-rose-100";

  //generate placeholder image on the fly
  const placeholderImage = `https://ui-avatars.com/api/?name=${props.playlist.name}&background=000000&color=fff`;
  const playlistImage = props.playlist.images?.[0]?.url;

  return (
    <li key={props.playlist.id}>
      <div
        className={`flex items-center gap-2 rounded-md border ${borderColor} bg-white p-2`}
      >
        {props.playlist.type === "apple" && props.onTransfer && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => props.onTransfer!(props.playlist.id)}
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
        )}
        <Image
          src={playlistImage || placeholderImage}
          alt={props.playlist.name}
          width={32}
          height={32}
          className="rounded-md"
        />

        <p className={`text-sm font-medium ${textColor}`}>
          {props.playlist.name}{" "}
          <span className="text-xs text-muted-foreground">
            ({props.playlist.tracks.total} tracks)
          </span>
        </p>

        {props.playlist.type === "spotify" && props.onTransfer && (
          <div className="ml-auto">
            <Button
              variant="outline"
              size="icon"
              onClick={() => props.onTransfer!(props.playlist.id)}
            >
              <ArrowRightIcon className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </li>
  );
});
