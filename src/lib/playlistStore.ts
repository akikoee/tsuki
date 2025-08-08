import type { Playlists } from "@/models/thirdparty";
import { create } from "zustand";

type PlaylistStore = {
  spotifyPlaylists: Playlists | null;
  appleMusicPlaylists: Playlists | null;
  isFetchingPlaylists: boolean;
  fetchSpotifyError: string | null;
  fetchAppleMusicError: string | null;
  setSpotifyPlaylists: (playlists: Playlists | null) => void;
  setAppleMusicPlaylists: (playlists: Playlists | null) => void;
  setIsFetchingPlaylists: (isFetching: boolean) => void;
  setFetchSpotifyError: (message: string | null) => void;
  setFetchAppleMusicError: (message: string | null) => void;
};

export const usePlaylistStore = create<PlaylistStore>((set) => ({
  spotifyPlaylists: null,
  appleMusicPlaylists: null,
  isFetchingPlaylists: false,
  fetchSpotifyError: null,
  fetchAppleMusicError: null,
  setSpotifyPlaylists: (playlists) => set({ spotifyPlaylists: playlists }),
  setAppleMusicPlaylists: (playlists) => set({ appleMusicPlaylists: playlists }),
  setIsFetchingPlaylists: (isFetching) => set({ isFetchingPlaylists: isFetching }),
  setFetchSpotifyError: (message) => set({ fetchSpotifyError: message }),
  setFetchAppleMusicError: (message) => set({ fetchAppleMusicError: message }),
}));


