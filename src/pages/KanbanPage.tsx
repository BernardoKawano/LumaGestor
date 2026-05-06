/* ────────────────────────────────────────────
   KanbanPage — Kanban de status das solicitações.
   3 colunas: Gerada | Enviada | Paga
   Ao mover para "Paga", exibe modal para confirmar data
   e registra o recebimento na planilha de acompanhamento.
   Excluir cartão / todos: só remove o manifesto local + JSON no Drive;
   não apaga planilhas nem PDFs.
   ──────────────────────────────────────────── */

import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { SolicitacaoResumo, StatusSolicitacao } from '../types'
import {
  listSolicitacoes,
  loadFromDrive,
  removeAllSolicitacoes,
  removeSolicitacao,
  updateSolicitacaoStatus,
} from '../utils/solicitacoes-store'
import { formatCurrency } from '../utils/currency'
import { ModalPagaKanban } from '../components/modals/ModalPagaKanban'

/* ────────── Definição das colunas ────────── */

interface Column {
  status: StatusSolicitacao
  label: string
  color: string
  dotColor: string
  emptyText: string
}

const COLUMNS: Column[] = [
  {
    status: 'gerada',
    label: 'Gerada',
    color: 'bg-amber-50 text-amber-700',
    dotColor: 'bg-amber-400',
    emptyText: 'Nenhuma solicitação gerada',
  },
  {
    status: 'enviada',
    label: 'Enviada',
    color: 'bg-blue-50 text-blue-700',
    dotColor: 'bg-blue-400',
    emptyText: 'Nenhuma solicitação enviada',
  },
  {
    status: 'paga',
    label: 'Paga',
    color: 'bg-green-50 text-green-700',
    dotColor: 'bg-green-400',
    emptyText: 'Nenhuma solicitação paga',
  },
]

export function KanbanPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<SolicitacaoResumo[]>([])
  const [loading, setLoading] = useState(true)

  // Modal para marcar como paga
  const [pagaModalItem, setPagaModalItem] = useState<SolicitacaoResumo | null>(null)

  useEffect(() => {
    setItems(listSolicitacoes())
    setLoading(false)

    loadFromDrive().then((merged) => {
      setItems(merged)
    })
  }, [])

  const moveCard = useCallback((id: string, newStatus: StatusSolicitacao) => {
    updateSolicitacaoStatus(id, newStatus)
    setItems(listSolicitacoes())
  }, [])

  // Ao clicar "Paga" no card: abre modal em vez de mover direto
  const handleMoveToPaga = useCallback((item: SolicitacaoResumo) => {
    setPagaModalItem(item)
  }, [])

  // Confirmação do modal de pagamento
  const handlePagaConfirm = useCallback(
    (dataPagamento: string) => {
      if (!pagaModalItem) return
      updateSolicitacaoStatus(pagaModalItem.id, 'paga', { dataPagamento })
      setItems(listSolicitacoes())
      setPagaModalItem(null)
    },
    [pagaModalItem],
  )

  const handleDeleteCard = useCallback((item: SolicitacaoResumo) => {
    const ok = window.confirm(
      `Remover o cartão "${item.obraNome}" do quadro de Status?\n\n` +
        'As planilhas de obra e os PDFs no Google Drive não serão apagados — apenas este registro na lista.',
    )
    if (!ok) return
    removeSolicitacao(item.id)
    setItems(listSolicitacoes())
    setPagaModalItem((open) => (open?.id === item.id ? null : open))
  }, [])

  const handleDeleteAll = useCallback(() => {
    if (items.length === 0) return
    const ok = window.confirm(
      `Remover todos os ${items.length} cartões do quadro de Status?\n\n` +
        'Isto não apaga planilhas de acompanhamento nem arquivos PDF no Drive — apenas a lista de acompanhamento neste aplicativo.',
    )
    if (!ok) return
    removeAllSolicitacoes()
    setItems([])
    setPagaModalItem(null)
  }, [items.length])

  const getNextStatus = (current: StatusSolicitacao): StatusSolicitacao | null => {
    if (current === 'gerada') return 'enviada'
    if (current === 'enviada') return 'paga'
    return null
  }

  const getPrevStatus = (current: StatusSolicitacao): StatusSolicitacao | null => {
    if (current === 'paga') return 'enviada'
    if (current === 'enviada') return 'gerada'
    return null
  }

  return (
    <div className="space-y-6 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Status</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Acompanhe suas solicitações de pagamento
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDeleteAll}
            disabled={items.length === 0}
            className="rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-900/60 dark:bg-gray-900 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            Excluir todos
          </button>
          <button
            type="button"
            onClick={() => navigate('/wizard')}
            className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
          >
            Nova Solicitação
          </button>
        </div>
      </div>

      {/* Kanban board */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {COLUMNS.map((col) => {
            const colItems = items.filter((s) => s.status === col.status)

            return (
              <div
                key={col.status}
                className="flex flex-col rounded-2xl border border-gray-100 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-900/50"
              >
                {/* Column header */}
                <div className={`flex items-center justify-between rounded-t-2xl px-4 py-3 ${col.color}`}>
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${col.dotColor}`} />
                    <span className="text-sm font-semibold">{col.label}</span>
                  </div>
                  <span className="rounded-full bg-white/60 px-2 py-0.5 text-xs font-medium">
                    {colItems.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex flex-1 flex-col gap-2 p-3">
                  {colItems.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center py-12">
                      <p className="text-xs text-gray-300 dark:text-gray-600">{col.emptyText}</p>
                    </div>
                  ) : (
                    colItems.map((item) => {
                      const nextStatus = getNextStatus(item.status)
                      const prevStatus = getPrevStatus(item.status)

                      return (
                        <KanbanCard
                          key={item.id}
                          item={item}
                          onDelete={() => handleDeleteCard(item)}
                          onMoveNext={
                            nextStatus
                              ? nextStatus === 'paga'
                                ? () => handleMoveToPaga(item)
                                : () => moveCard(item.id, nextStatus)
                              : undefined
                          }
                          onMovePrev={
                            prevStatus
                              ? () => moveCard(item.id, prevStatus)
                              : undefined
                          }
                          nextLabel={
                            item.status === 'gerada'
                              ? 'Enviada'
                              : item.status === 'enviada'
                                ? 'Paga'
                                : undefined
                          }
                        />
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de pagamento */}
      {pagaModalItem && (
        <ModalPagaKanban
          item={pagaModalItem}
          onConfirm={handlePagaConfirm}
          onClose={() => setPagaModalItem(null)}
        />
      )}
    </div>
  )
}

/* ────────── KanbanCard ────────── */

function KanbanCard({
  item,
  onDelete,
  onMoveNext,
  onMovePrev,
  nextLabel,
}: {
  item: SolicitacaoResumo
  onDelete: () => void
  onMoveNext?: () => void
  onMovePrev?: () => void
  nextLabel?: string
}) {
  const dataFormatada = new Date(item.data).toLocaleDateString('pt-BR')

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800/80">
      {/* Obra + data */}
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-sm font-semibold leading-tight text-gray-900 dark:text-gray-100">
          {item.obraNome}
        </p>
        <div className="flex shrink-0 items-start gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="rounded-md p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
            title="Remover cartão do quadro"
            aria-label="Remover cartão do quadro"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
          <span className="text-[10px] text-gray-400 dark:text-gray-500">{dataFormatada}</span>
        </div>
      </div>

      {/* Cliente */}
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{item.clientes}</p>

      {/* Valor */}
      <div className="mt-3 flex items-baseline justify-between">
        <span className="font-mono text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">
          {formatCurrency(item.totalGeral)}
        </span>
        {item.totalReembolso > 0 && (
          <span className="text-[10px] text-gray-400">
            (reemb. {formatCurrency(item.totalReembolso)})
          </span>
        )}
      </div>

      {/* Link PDF */}
      {item.drivePdfUrl && (
        <a
          href={item.drivePdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-[11px] text-gray-400 transition-colors hover:text-gray-600"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
          Ver PDF
        </a>
      )}

      {/* Ações de mover */}
      {(onMoveNext || onMovePrev) && (
        <div className="mt-3 flex items-center gap-2 border-t border-gray-50 pt-3 dark:border-gray-700">
          {onMovePrev && (
            <button
              onClick={onMovePrev}
              className="rounded-lg border border-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600 dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            >
              <svg className="inline h-3 w-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Voltar
            </button>
          )}
          {onMoveNext && nextLabel && (
            <button
              onClick={onMoveNext}
              className="ml-auto rounded-lg bg-gray-900 px-3 py-1 text-[11px] font-medium text-white transition-colors hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
            >
              {nextLabel}
              <svg className="inline h-3 w-3 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
