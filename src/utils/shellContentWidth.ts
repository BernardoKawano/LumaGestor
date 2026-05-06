/* ────────────────────────────────────────────
   Largura do conteúdo principal (AppShell).
   Rotas com formulários largos vs. leitura; override por página.
   ──────────────────────────────────────────── */

export type ShellContentWidthOverride = 'wide' | null

/**
 * Classes Tailwind para header/main/footer: largura máxima + ocupar faixa útil.
 * `override === 'wide'` força o mesmo patamar da Nova solicitação (wizard).
 */
export function resolveShellContentWidthClass(
  pathname: string,
  override: ShellContentWidthOverride,
): string {
  if (override === 'wide') return 'max-w-7xl w-full'
  if (pathname === '/wizard') return 'max-w-7xl w-full'
  if (pathname === '/') return 'max-w-5xl w-full'
  return 'max-w-3xl w-full'
}
