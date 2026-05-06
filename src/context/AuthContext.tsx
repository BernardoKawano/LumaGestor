/* ────────────────────────────────────────────
   AuthContext — provedor de autenticação Google
   Envolve toda a app; expõe isSignedIn, signIn, signOut.
   ──────────────────────────────────────────── */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  initGapiClient,
  initGsi,
  requestAccessToken,
  revokeToken,
} from '../services/google-auth'
import { isDemoCaptureEnabled } from '../demo/demoCapture'

interface AuthState {
  isReady: boolean       // GAPI + GSI carregados
  isSignedIn: boolean    // Tem token válido
  signIn: () => void
  signOut: () => void
}

const AuthContext = createContext<AuthState>({
  isReady: false,
  isSignedIn: false,
  signIn: () => {},
  signOut: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false)
  const [isSignedIn, setIsSignedIn] = useState(false)

  useEffect(() => {
    /* DEMO remotion — remover com src/demo/demoCapture.ts */
    if (isDemoCaptureEnabled()) {
      setIsSignedIn(true)
      setIsReady(true)
      return
    }
    async function init() {
      try {
        await initGapiClient()
        await initGsi((token) => {
          // Seta token no gapi client
          window.gapi!.client.setToken({ access_token: token })
          setIsSignedIn(true)
        })
        setIsReady(true)
      } catch (err) {
        console.error('Erro ao inicializar Google APIs:', err)
        // Evita loader infinito quando configuração/env do Google estiver inválida.
        // A Home continua acessível e o erro fica visível no console para diagnóstico.
        setIsReady(true)
      }
    }
    init()
  }, [])

  const signIn = useCallback(() => {
    requestAccessToken()
  }, [])

  const signOut = useCallback(() => {
    revokeToken()
    setIsSignedIn(false)
  }, [])

  return (
    <AuthContext.Provider value={{ isReady, isSignedIn, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
