/* ────────────────────────────────────────────
   AppLogo — cópia servida em /public/images/logo-luma-gestor.png
   (origem no repo: images/Logo Luma Gestor.png)
   Modo escuro: “Luma” + traço em branco (invert), “Gestor” laranja sem filtro (clip).
   ──────────────────────────────────────────── */

import { useCallback, useState } from 'react'
import { useTheme } from '../../context/ThemeContext'

/** Ordem de tentativa; ficheiro principal em public/images/ */
export const APP_LOGO_PATHS = ['/images/logo-luma-gestor.png', '/images/logo.svg', '/images/logo.png'] as const

/** Fim da zona escura da wordmark (% largura) → branco com invert */
const LOGO_DARK_LEFT_END_PCT = 49
/** Início da zona laranja “Gestor”; ligeiramente antes para evitar fenda no traço */
const LOGO_DARK_RIGHT_START_PCT = 46

type AppLogoProps = {
  className?: string
  /** Classes da imagem (altura recomendada: h-10–14 header, hero maior) */
  imgClassName?: string
}

export function AppLogo({ className = '', imgClassName = 'h-5 w-auto' }: AppLogoProps) {
  const { mode } = useTheme()
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
        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-950 text-xs font-bold text-white dark:bg-primary-100 dark:text-primary-950 ${className}`}
        aria-hidden
      >
        LG
      </span>
    )
  }

  const src = APP_LOGO_PATHS[index]

  if (mode === 'dark') {
    const clipLeft = `polygon(0 0, ${LOGO_DARK_LEFT_END_PCT}% 0, ${LOGO_DARK_LEFT_END_PCT}% 100%, 0 100%)`
    const clipRight = `polygon(${LOGO_DARK_RIGHT_START_PCT}% 0, 100% 0, 100% 100%, ${LOGO_DARK_RIGHT_START_PCT}% 100%)`
    const layer =
      'pointer-events-none absolute left-0 top-0 h-full w-auto max-w-none object-contain object-left'

    return (
      <span
        className={`relative inline-block shrink-0 leading-none ${className}`}
        role="img"
        aria-label="Luma Gestor"
      >
        <img
          src={src}
          alt=""
          decoding="async"
          aria-hidden
          className={`block w-auto max-w-none opacity-0 ${imgClassName}`}
          onError={onError}
        />
        <img
          src={src}
          alt=""
          decoding="async"
          aria-hidden
          className={`${layer} brightness-0 invert`}
          style={{ clipPath: clipLeft }}
          onError={onError}
        />
        <img
          src={src}
          alt=""
          decoding="async"
          aria-hidden
          className={layer}
          style={{ clipPath: clipRight }}
          onError={onError}
        />
      </span>
    )
  }

  return (
    <span className={`inline-flex shrink-0 items-center leading-none ${className}`}>
      <img
        src={src}
        alt="Luma Gestor"
        className={`block w-auto object-contain object-left ${imgClassName}`}
        onError={onError}
        decoding="async"
      />
    </span>
  )
}
