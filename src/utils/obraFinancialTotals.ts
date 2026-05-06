/* ────────────────────────────────────────────
   Totais do painel «cliente / obra» na planilha de acompanhamento.
   Linhas ADICIONAL em _CONFIG somam ao total geral (valor que o cliente deve pela obra).
   Acréscimos de colaborador (aba do funcionário) não passam por aqui.
   ──────────────────────────────────────────── */

/** Totais alinhados a readObraFinancialSummary (Google Sheets obra). */
export function totaisResumoObraCliente(
  valorTotalObraCentavos: number,
  totalRecebidoCentavos: number,
  somaAdicionaisObraCentavos: number,
) {
  const valorOriginal = valorTotalObraCentavos
  const totalAdicionais = somaAdicionaisObraCentavos
  const totalGeral = valorOriginal + totalAdicionais
  return {
    valorOriginal,
    totalAdicionais,
    totalGeral,
    totalRecebido: totalRecebidoCentavos,
    saldoDevedor: totalGeral - totalRecebidoCentavos,
  }
}
