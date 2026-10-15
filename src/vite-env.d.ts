/// <reference types="vite/client" />
interface ImportMetaEnv {
  /** Clé Google Maps Platform (Maps JavaScript API + Directions API), à restreindre par domaine HTTP. */
  readonly VITE_GOOGLE_MAPS_API_KEY?: string
}
interface ImportMeta { readonly env: ImportMetaEnv }
