/* ────────────────────────────────────────────
   AppLogo — ficheiros em /public/images/logo.svg | logo.png
   ──────────────────────────────────────────── */

import { useCallback, useState } from 'react'

/** Ordem de tentativa; coloque o ficheiro real em public/images/ */
export const APP_LOGO_PATHS = ['/images/logo.svg', '/images/logo.png'] as const

type AppLogoProps = {
  className?: string
  /** Classes da imagem (altura recomendada: h-8 header, h-12–14 hero) */
  imgClassName?: string
}

export function AppLogo({ className = '', imgClassName = 'h-8 w-auto' }: AppLogoProps) {
  const [index, setIndex] = useState(0)
  const [failed, setFailed] = useState(false)

  const onError = useCallback(() => {
    setIndex((i) => {
      const next = i + 1
      if (next < APP_LOGO_PATHS.length) return next
      setFailed(true)
      return i
    })
  }, [])

  if (failed) {
    return (
      <span
        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-950 text-xs font-bold text-white ${className}`}
        aria-hidden
      >
        LG
      </span>
    )
  }

  return (
    <span className={`inline-flex shrink-0 items-center ${className}`}>
      <img
        src={APP_LOGO_PATHS[index]}
        alt="Luma Gestor"
        className={`w-auto object-contain object-left ${imgClassName}`}
        onError={onError}
        decoding="async"
      />
    </span>
  )
}
