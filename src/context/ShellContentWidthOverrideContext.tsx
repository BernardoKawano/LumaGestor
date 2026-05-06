/* ────────────────────────────────────────────
   Permite que uma página altere temporariamente a largura do AppShell
   (ex.: acompanhamento em seleção de obra → mesma faixa do wizard).
   ──────────────────────────────────────────── */

import { createContext, useContext, type Dispatch, type SetStateAction } from 'react'
import type { ShellContentWidthOverride } from '../utils/shellContentWidth'

export const SetShellContentWidthOverrideContext = createContext<
  Dispatch<SetStateAction<ShellContentWidthOverride>> | null
>(null)

export function useSetShellContentWidthOverride(): Dispatch<SetStateAction<ShellContentWidthOverride>> {
  const ctx = useContext(SetShellContentWidthOverrideContext)
  if (!ctx) {
    throw new Error('useSetShellContentWidthOverride deve ser usado dentro de AppShell')
  }
  return ctx
}
