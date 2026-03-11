/* ────────────────────────────────────────────
   Persistência de rascunhos de recebimento e pagamento.
   Armazenados em localStorage, chaveados por spreadsheetId.
   Os rascunhos permanecem como rascunhos até o usuário confirmar ou remover.
   ──────────────────────────────────────────── */

import type { RascunhoRecebimento, RascunhoPagamento } from '../components/acompanhamento/ResumoObra'

const STORAGE_KEY = 'luma-gestor:rascunhos'

export interface RascunhosObra {
  rascunhosRecebimento: RascunhoRecebimento[]
  rascunhosPagamento: Record<string, RascunhoPagamento[]>
}

function getAll(): Record<string, RascunhosObra> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveAll(data: Record<string, RascunhosObra>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (err) {
    console.error('Erro ao salvar rascunhos:', err)
  }
}

/** Carrega rascunhos de uma obra (planilha) */
export function loadRascunhos(spreadsheetId: string): RascunhosObra {
  const all = getAll()
  const stored = all[spreadsheetId]
  if (!stored) {
    return { rascunhosRecebimento: [], rascunhosPagamento: {} }
  }
  return {
    rascunhosRecebimento: stored.rascunhosRecebimento ?? [],
    rascunhosPagamento: stored.rascunhosPagamento ?? {},
  }
}

/** Salva rascunhos de uma obra (planilha) */
export function saveRascunhos(spreadsheetId: string, data: RascunhosObra): void {
  const all = getAll()
  all[spreadsheetId] = data
  saveAll(all)
}
