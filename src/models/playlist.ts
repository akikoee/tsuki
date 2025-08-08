export interface Playlists {
  href?: string;
  items: PlaylistItem[];
  limit?: number;
  next?: string;
  offset?: number;
  previous?: string;
  total?: number;
}

export interface Artist {
  name: string;
}

export interface Album {
  name: string;
  artists: Artist[];
  total_tracks: number;
}

export interface CreateApplePlaylist {
  name: string;
  description: string;
  tracks: { id: string }[];
}

export interface LibraryPlaylistRequest {
  attributes: {
    name: string;
    description: string;
    isPublic: boolean;
  };
  relationships: {
    tracks: {
      data: {
        id: string;
        type: "songs";
      }[];
    };
  };
}

export interface Track {
  id: string;
  name: string;
  artists: Artist[];
  isrc?: string;
  album?: Album;
  durationMs: number;
  explicit?: boolean;
}

export interface PlaylistItem {
  id: string;
  name: string;
  description: string;
  type: string;
  images: { url: string }[];
  tracks: { items: Track[]; total: number };
}

export interface SpotifyTrackResponse {
  items: SpotifyTrack[];
  next: string | null;
  total: number;
}

export interface SpotifyTrack {
  preview_url: string | null;
  available_markets: string[];
  explicit: boolean;
  type: "track";
  episode: boolean;
  track: true;
  album: {
    available_markets: string[];
    type: string;
    album_type: string;
    href: string;
    id: string;
    images: [];
    name: string;
    release_date: string;
    release_date_precision: string;
    uri: string;
    artists: [];
    external_urls: {
      spotify: string;
    };
    total_tracks: number;
  };
  artists: [
    {
      external_urls: {
        spotify: string;
      };
      href: string;
      id: string;
      name: string;
      type: string;
      uri: string;
    }
  ];
  disc_number: number;
  track_number: number;
  duration_ms: number;
  external_ids: { isrc: string };
  external_urls: { spotify: string };
  href: string;
  id: string;
  name: string;
  popularity: number;
  uri: string;
  is_local: boolean;
}
