/* ────────────────────────────────────────────
   Extrai valor monetário do nome do arquivo de nota de reembolso.

   Padrão esperado: "NOME VALOR.pdf"
   Exemplos:
     "ALLAN 53,40.pdf"       → 5340 centavos
     "ALLAN 1.210,10.pdf"    → 121010 centavos
     "MARIA 500,00.pdf"      → 50000 centavos
     "sem valor.pdf"         → 0
   ──────────────────────────────────────────── */

/**
 * Extrai o valor em centavos a partir do nome de arquivo.
 * Procura o último trecho que parece um valor monetário BR (ex: "1.210,10").
 * Retorna 0 se não encontrar.
 */
export function parseValorFromFilename(filename: string): number {
  // Remove extensão .pdf
  const name = filename.replace(/\.pdf$/i, '').trim()

  // Regex para valor monetário brasileiro: "1.210,10" ou "53,40" ou "500"
  // Procura o último match (o valor fica no final do nome)
  const regex = /(\d{1,3}(?:\.\d{3})*,\d{2})/g
  const matches = [...name.matchAll(regex)]

  if (matches.length > 0) {
    const valorStr = matches[matches.length - 1][1]
    // Converter: "1.210,10" → 121010
    const semPonto = valorStr.replace(/\./g, '')
    const [inteiro, decimal] = semPonto.split(',')
    return parseInt(inteiro, 10) * 100 + parseInt(decimal, 10)
  }

  // Tentar formato sem centavos: "NOME 500.pdf"
  const intMatch = name.match(/\s(\d+)$/)
  if (intMatch) {
    return parseInt(intMatch[1], 10) * 100
  }

  return 0
}
