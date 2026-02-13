/* ────────────────────────────────────────────
   Google Identity Services (GSI) + GAPI init
   Autenticação OAuth2 client-side.
   ──────────────────────────────────────────── */

import { GOOGLE_CONFIG } from '../config/google'

/* ---------- Tipos do Google (simplificados) ---------- */

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string
            scope: string
            callback: (response: TokenResponse) => void
          }): TokenClient
        }
      }
    }
    gapi?: {
      load(api: string, callback: () => void): void
      client: {
        init(config: { apiKey: string; discoveryDocs: string[] }): Promise<void>
        getToken(): { access_token: string } | null
        setToken(token: { access_token: string } | null): void
        drive: GapiDrive
        sheets: GapiSheets
      }
    }
  }
}

interface TokenResponse {
  access_token: string
  error?: string
}

interface TokenClient {
  requestAccessToken(opts?: { prompt?: string }): void
}

interface GapiDrive {
  files: {
    list(params: Record<string, unknown>): GapiRequest
    create(params: Record<string, unknown>, body?: unknown): GapiRequest
  }
}

interface GapiSheets {
  spreadsheets: {
    values: {
      append(params: Record<string, unknown>): GapiRequest
    }
    get(params: Record<string, unknown>): GapiRequest
  }
}

interface GapiRequest {
  execute(callback: (response: Record<string, unknown>) => void): void
}

/* ---------- Estado local ---------- */

let tokenClient: TokenClient | null = null
let gapiLoaded = false
let gsiLoaded = false

/* ---------- Carregar scripts ---------- */

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Falha ao carregar ${src}`))
    document.head.appendChild(script)
  })
}

/** Carrega e inicializa o GAPI client (Drive + Sheets) */
export async function initGapiClient(): Promise<void> {
  if (gapiLoaded) return
  await loadScript('https://apis.google.com/js/api.js')
  return new Promise((resolve) => {
    window.gapi!.load('client', async () => {
      await window.gapi!.client.init({
        apiKey: GOOGLE_CONFIG.apiKey,
        discoveryDocs: [...GOOGLE_CONFIG.discoveryDocs],
      })
      gapiLoaded = true
      resolve()
    })
  })
}

/** Carrega o GSI e cria o token client */
export async function initGsi(
  onTokenReceived: (token: string) => void,
): Promise<void> {
  if (gsiLoaded) return
  await loadScript('https://accounts.google.com/gsi/client')
  tokenClient = window.google!.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CONFIG.clientId,
    scope: GOOGLE_CONFIG.scopes,
    callback: (response) => {
      if (response.error) {
        console.error('GSI error:', response.error)
        return
      }
      onTokenReceived(response.access_token)
    },
  })
  gsiLoaded = true
}

/** Solicita acesso (abre popup de consentimento) */
export function requestAccessToken(): void {
  if (!tokenClient) {
    console.error('GSI não inicializado')
    return
  }
  const currentToken = window.gapi?.client.getToken()
  if (currentToken) {
    // Já tem token, pede renovação silenciosa
    tokenClient.requestAccessToken({ prompt: '' })
  } else {
    tokenClient.requestAccessToken({ prompt: 'consent' })
  }
}

/** Remove token e faz "logout" */
export function revokeToken(): void {
  const token = window.gapi?.client.getToken()
  if (token) {
    window.gapi!.client.setToken(null)
  }
}

/** Verifica se há um token válido */
export function hasValidToken(): boolean {
  return !!window.gapi?.client.getToken()
}
