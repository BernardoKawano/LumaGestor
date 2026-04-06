/**
 * DEMO — gravação Remotion sem login Google real.
 *
 * Para remover tudo depois:
 * 1. Apague a pasta `src/demo/`
 * 2. `AuthContext.tsx`: remova import e o `if (isDemoCaptureEnabled()) { ... return }`
 * 3. `vite-env.d.ts`: remova `VITE_DEMO_CAPTURE`
 * 4. `google-drive.ts`: remova import e todos `if (isDemoCaptureEnabled())`
 * 5. Raiz `package.json`: remova o script `dev:demo-capture`
 * 6. Raiz: apague `.env.demo-capture`
 * 7. `remotion/package.json`: remova `capture:demo`
 * 8. `remotion/scripts/capture.ts`: remova `CAPTURE_DEMO` / `captureDemo`
 */

/** Lógica pura — testável sem `import.meta`. */
export function demoCaptureFromEnv(env: {
  DEV?: boolean
  VITE_DEMO_CAPTURE?: string
}): boolean {
  return Boolean(env.DEV && env.VITE_DEMO_CAPTURE === '1')
}

export function isDemoCaptureEnabled(): boolean {
  return demoCaptureFromEnv(
    import.meta.env as { DEV?: boolean; VITE_DEMO_CAPTURE?: string },
  )
}
