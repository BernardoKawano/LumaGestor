/** Título do separador do browser por rota (SPA). */

const BASE = 'Luma Gestor'

const TITLES: Record<string, string> = {
  '/': `Início — ${BASE}`,
  '/wizard': `Nova solicitação — ${BASE}`,
  '/status': `Status — ${BASE}`,
  '/acompanhamento': `Acompanhamento — ${BASE}`,
}

export function documentTitleForPathname(pathname: string): string {
  return TITLES[pathname] ?? BASE
}

export function applyDocumentTitle(pathname: string): void {
  document.title = documentTitleForPathname(pathname)
}
