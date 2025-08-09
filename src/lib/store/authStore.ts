import { create } from "zustand";

export const useAuthStore = create<{
  spotifyLoginState: boolean;
  appleMusicLoginState: boolean;
  isAuthorizingApple: boolean;
  musicUserToken: string | null;
  musicStorefront: string | null;
  devToken: string | null;
  setSpotifyLoginState: (state: boolean) => void;
  setAppleMusicLoginState: (state: boolean) => void;
  setIsAuthorizingApple: (state: boolean) => void;
  setMusicUserToken: (token: string | null) => void;
  setMusicStorefront: (storefront: string | null) => void;
  setDevToken: (token: string | null) => void;
}>((set) => ({
  spotifyLoginState: false,
  appleMusicLoginState: false,
  isAuthorizingApple: false,
  musicUserToken: null,
  musicStorefront: null,
  devToken: null,
  setSpotifyLoginState: (state) => set({ spotifyLoginState: state }),
  setAppleMusicLoginState: (state) => set({ appleMusicLoginState: state }),
  setIsAuthorizingApple: (state) => set({ isAuthorizingApple: state }),
  setMusicUserToken: (token) => set({ musicUserToken: token }),
  setMusicStorefront: (storefront) => set({ musicStorefront: storefront }),
  setDevToken: (token) => set({ devToken: token }),
}));
