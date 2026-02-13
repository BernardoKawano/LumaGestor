/* ────────────────────────────────────────────
   Tipos principais — Luma Gestor
   ──────────────────────────────────────────── */

/** Obra = pasta no Google Drive (nome da pasta = nome do cliente/obra) */
export interface Obra {
  id: string               // Google Drive folder ID
  nome: string             // Nome da pasta (cliente/obra)
  endereco?: string        // Endereço do projeto (preenchido manualmente)
  planilhaId?: string      // ID do Google Sheet dentro da pasta
  solicitacoesFolderId?: string // ID da subpasta "solicitacao de pagamento"
}

/** Linha principal de serviço */
export interface ItemServico {
  empresa: string          // Default: "MaMM Gestão e Engenharia"
  valor: number            // Valor do serviço em centavos (inteiro)
}

/** Item adicional (ex: "Consultoria Elétrica R$ 2.000,00") */
export interface ItemAdicional {
  id: string
  nome: string
  valor: number            // Em centavos
}

/** Nota de reembolso (PDF anexado + valor digitado) */
export interface NotaReembolso {
  id: string
  arquivo: File
  nomeOriginal: string
  valor: number            // Em centavos
}

export type StatusSolicitacao = 'rascunho' | 'gerada' | 'enviada' | 'paga'

/** Dados completos de uma Solicitação de Pagamento */
export interface SolicitacaoPagamento {
  obra: Obra | null
  clientes: string
  projeto: string
  data: Date
  servico: ItemServico
  adicionais: ItemAdicional[]
  reembolsos: NotaReembolso[]
  status: StatusSolicitacao
  pdfBlobUrl?: string      // URL local do PDF gerado (blob:)
  driveFileId?: string     // ID do PDF no Drive após upload
  drivePdfUrl?: string     // Link do PDF no Drive
  dataPagamento?: Date
}

/* ────────────────────────────────────────────
   Valores calculados (funções puras)
   ──────────────────────────────────────────── */

export function calcSubtotalServico(s: SolicitacaoPagamento): number {
  return s.servico.valor + s.adicionais.reduce((acc, a) => acc + a.valor, 0)
}

export function calcTotalReembolso(s: SolicitacaoPagamento): number {
  return s.reembolsos.reduce((acc, r) => acc + r.valor, 0)
}

export function calcTotalGeral(s: SolicitacaoPagamento): number {
  return calcSubtotalServico(s) + calcTotalReembolso(s)
}

/* ────────────────────────────────────────────
   Estado do Wizard
   ──────────────────────────────────────────── */

/* ────────────────────────────────────────────
   Resumo de solicitação (para Kanban/histórico)
   ──────────────────────────────────────────── */

export interface SolicitacaoResumo {
  id: string                 // UUID gerado ao criar
  obraId: string
  obraNome: string
  clientes: string
  projeto: string
  data: string               // ISO date string
  subtotalServico: number    // centavos
  totalReembolso: number     // centavos
  totalGeral: number         // centavos
  status: StatusSolicitacao
  pdfBlobUrl?: string
  drivePdfUrl?: string
  dataPagamento?: string     // ISO date string
  criadoEm: string           // ISO datetime
}

export type WizardStep = 1 | 2 | 3 | 'pronto'

export interface WizardState {
  currentStep: WizardStep
  solicitacaoId: string        // UUID único desta solicitação
  solicitacao: SolicitacaoPagamento
  isGeneratingPdf: boolean
  isUploading: boolean
  errors: Record<string, string>
}
