/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string
  readonly VITE_GOOGLE_API_KEY: string
  /** DEMO remotion — apagar com src/demo/ */
  readonly VITE_DEMO_CAPTURE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
