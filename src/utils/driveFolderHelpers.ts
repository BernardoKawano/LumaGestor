/**
 * Pasta tipo "CLIENTES 2026" — filhos são pastas de cliente/obra.
 * Nome normalizado: trim, comparação case-insensitive.
 */
const CLIENTES_YEAR_RE = /^CLIENTES\s*\d{4}$/i

export function isClientesYearFolderName(name: string): boolean {
  return CLIENTES_YEAR_RE.test(name.trim())
}
