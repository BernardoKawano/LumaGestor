/* ────────────────────────────────────────────
   Relatório PDF do que o cliente pagou à MaMM.
   Entra: valor original, adicionais da obra e recebimentos confirmados.
   Fica de fora: pagamentos e acréscimos de colaboradores.
   Para reverter: remova o botão em ManageSheet e apague
   este arquivo, o teste e RelatorioClientePdf.tsx.
   ──────────────────────────────────────────── */

import { formatDateISO, parseDateBR } from './date'
import { totaisResumoObraCliente } from './obraFinancialTotals'

export interface RelatorioAdicionalCliente {
  ordem: number
  descricao: string
  data: string
  valorCentavos: number
}

export interface RelatorioPagamentoRecebido {
  ordem: number
  data: string
  descricao: string
  valorCentavos: number
  pdfLink: string
  /** Soma dos pagamentos até este, inclusive. */
  acumuladoCentavos: number
  /** O que ainda falta da obra depois deste pagamento. */
  saldoAposCentavos: number
}

export type SituacaoPagamentoCliente = 'em_aberto' | 'quitada' | 'recebido_acima'

export const ROTULO_SITUACAO_PAGAMENTO: Record<SituacaoPagamentoCliente, string> = {
  em_aberto: 'Em aberto',
  quitada: 'Quitada',
  recebido_acima: 'Recebido acima do total',
}

export interface RelatorioPagamentosCliente {
  obraNome: string
  geradoEm: Date
  valorOriginalCentavos: number
  adicionais: RelatorioAdicionalCliente[]
  totalAdicionaisCentavos: number
  totalGeralCentavos: number
  pagamentos: RelatorioPagamentoRecebido[]
  totalRecebidoCentavos: number
  saldoDevedorCentavos: number
  situacao: SituacaoPagamentoCliente
}

export interface EntradaRelatorioPagamentosCliente {
  obraNome: string
  valorOriginalCentavos: number
  /** Linhas ADICIONAL da obra (centavos no campo valor). */
  adicionais: Array<{ descricao: string; data: string; valor: number }>
  /** Recebimentos confirmados do cliente. Rascunhos não devem ser passados. */
  recebimentos: Array<{
    data: string
    descricao: string
    valorCentavos: number
    pdfLink?: string
  }>
  geradoEm?: Date
}

function instanteDaData(data: string): number {
  const parsed = parseDateBR(data)
  return parsed ? parsed.getTime() : Number.POSITIVE_INFINITY
}

/** Datas válidas primeiro, da mais antiga à mais recente. Empate mantém a ordem da planilha. */
function ordenarPorData<T extends { data: string }>(itens: T[]): T[] {
  return itens
    .map((item, indice) => ({ item, indice }))
    .sort((a, b) => {
      const diferenca = instanteDaData(a.item.data) - instanteDaData(b.item.data)
      return diferenca !== 0 ? diferenca : a.indice - b.indice
    })
    .map(({ item }) => item)
}

export function situacaoPagamentoCliente(saldoDevedorCentavos: number): SituacaoPagamentoCliente {
  if (saldoDevedorCentavos > 0) return 'em_aberto'
  if (saldoDevedorCentavos < 0) return 'recebido_acima'
  return 'quitada'
}

/**
 * Monta o relatório comercial da obra.
 * Os totais seguem totaisResumoObraCliente: total geral = original + adicionais da obra.
 */
export function buildRelatorioPagamentosCliente(
  entrada: EntradaRelatorioPagamentosCliente,
): RelatorioPagamentosCliente {
  const adicionais = ordenarPorData(entrada.adicionais).map((adicional, indice) => ({
    ordem: indice + 1,
    descricao: adicional.descricao.trim() || 'Adicional',
    data: adicional.data,
    valorCentavos: adicional.valor,
  }))
  const recebidosEmOrdem = ordenarPorData(entrada.recebimentos)
  const somaRecebida = recebidosEmOrdem.reduce((soma, pagamento) => soma + pagamento.valorCentavos, 0)
  const somaAdicionais = adicionais.reduce((soma, adicional) => soma + adicional.valorCentavos, 0)

  const totais = totaisResumoObraCliente(
    entrada.valorOriginalCentavos,
    somaRecebida,
    somaAdicionais,
  )

  let acumuladoCentavos = 0
  const pagamentos = recebidosEmOrdem.map((recebimento, indice) => {
    acumuladoCentavos += recebimento.valorCentavos
    return {
      ordem: indice + 1,
      data: recebimento.data,
      descricao: recebimento.descricao.trim() || 'Pagamento',
      valorCentavos: recebimento.valorCentavos,
      pdfLink: recebimento.pdfLink?.trim() ?? '',
      acumuladoCentavos,
      saldoAposCentavos: totais.totalGeral - acumuladoCentavos,
    }
  })

  return {
    obraNome: entrada.obraNome.trim() || 'Obra',
    geradoEm: entrada.geradoEm ?? new Date(),
    valorOriginalCentavos: totais.valorOriginal,
    adicionais,
    totalAdicionaisCentavos: totais.totalAdicionais,
    totalGeralCentavos: totais.totalGeral,
    pagamentos,
    totalRecebidoCentavos: totais.totalRecebido,
    saldoDevedorCentavos: totais.saldoDevedor,
    situacao: situacaoPagamentoCliente(totais.saldoDevedor),
  }
}

/** Ex.: "Relatorio MaMM - JAIR AVANSI - 2026-10-27.pdf" */
export function nomeArquivoRelatorioPagamentosCliente(obraNome: string, quando: Date): string {
  const seguro = obraNome
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
  return `Relatorio MaMM - ${seguro || 'obra'} - ${formatDateISO(quando)}.pdf`
}
