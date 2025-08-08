import { create } from "zustand";

export type TrackEvent = {
  index: number;
  name: string;
  status: "matched" | "low-confidence" | "unmatched";
  appleSongId?: string;
  confidence?: number;
};

type TransferDirection = "idle" | "right" | "left";

type TransferStore = {
  spotifyPlaylistLink: string;
  isTransferring: boolean;
  transferDirection: TransferDirection;
  currentPlaylistName: string | null;
  currentTotalTracks: number;
  currentIndex: number;
  trackEvents: TrackEvent[];
  fetchError: string | null;
  setSpotifyPlaylistLink: (value: string) => void;
  setIsTransferring: (value: boolean) => void;
  setTransferDirection: (direction: TransferDirection) => void;
  setCurrentPlaylistName: (name: string | null) => void;
  setCurrentTotalTracks: (count: number) => void;
  setCurrentIndex: (index: number) => void;
  resetTransferProgress: () => void;
  addTrackEvent: (event: TrackEvent) => void;
  setTrackEvents: (events: TrackEvent[]) => void;
  setFetchError: (message: string | null) => void;
};

export const useTransferStore = create<TransferStore>((set) => ({
  spotifyPlaylistLink: "",
  isTransferring: false,
  transferDirection: "idle",
  currentPlaylistName: null,
  currentTotalTracks: 0,
  currentIndex: 0,
  trackEvents: [],
  fetchError: null,
  setSpotifyPlaylistLink: (value) => set({ spotifyPlaylistLink: value }),
  setIsTransferring: (value) => set({ isTransferring: value }),
  setTransferDirection: (direction) => set({ transferDirection: direction }),
  setCurrentPlaylistName: (name) => set({ currentPlaylistName: name }),
  setCurrentTotalTracks: (count) => set({ currentTotalTracks: count }),
  setCurrentIndex: (index) => set({ currentIndex: index }),
  resetTransferProgress: () =>
    set({ currentPlaylistName: null, currentTotalTracks: 0, currentIndex: 0, trackEvents: [] }),
  addTrackEvent: (event) =>
    set((state) => ({ trackEvents: [...state.trackEvents, event] })),
  setTrackEvents: (events) => set({ trackEvents: events }),
  setFetchError: (message) => set({ fetchError: message }),
}));


