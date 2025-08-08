import { create } from "zustand";

export const useAuthStore = create<{
  spotifyLoginState: boolean;
  appleMusicLoginState: boolean;
  musicUserToken: string | null;
  musicStorefront: string | null;
  devToken: string | null;
  setSpotifyLoginState: (state: boolean) => void;
  setAppleMusicLoginState: (state: boolean) => void;
  setMusicUserToken: (token: string | null) => void;
  setMusicStorefront: (storefront: string | null) => void;
  setDevToken: (token: string | null) => void;
}>((set) => ({
  spotifyLoginState: false,
  appleMusicLoginState: false,
  musicUserToken: "",
  musicStorefront: "",
  devToken: "",
  setSpotifyLoginState: (state) => set({ spotifyLoginState: state }),
  setAppleMusicLoginState: (state) => set({ appleMusicLoginState: state }),
  setMusicUserToken: (token) => set({ musicUserToken: token }),
  setMusicStorefront: (storefront) => set({ musicStorefront: storefront }),
  setDevToken: (token) => set({ devToken: token }),
}));
