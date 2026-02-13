/* ────────────────────────────────────────────
   Validação por passo do Wizard
   Retorna mapa de erros (vazio = válido).
   ──────────────────────────────────────────── */

import type { SolicitacaoPagamento } from '../types'

export type ValidationErrors = Record<string, string>

/** Passo 1 — Identificação */
export function validateStep1(s: SolicitacaoPagamento): ValidationErrors {
  const errors: ValidationErrors = {}

  if (!s.obra) {
    errors.obra = 'Selecione uma obra'
  }
  if (!s.clientes.trim()) {
    errors.clientes = 'Informe o nome do cliente'
  }

  return errors
}

/** Passo 2 — Itens */
export function validateStep2(s: SolicitacaoPagamento): ValidationErrors {
  const errors: ValidationErrors = {}

  if (s.servico.valor <= 0) {
    errors.servicoValor = 'Informe o valor do serviço'
  }

  s.reembolsos.forEach((r, i) => {
    if (r.valor <= 0) {
      errors[`reembolso_${i}`] = `Informe o valor da nota "${r.nomeOriginal}"`
    }
  })

  return errors
}

/** Verifica se não há erros (objeto vazio) */
export function isValid(errors: ValidationErrors): boolean {
  return Object.keys(errors).length === 0
}
