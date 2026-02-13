/* ────────────────────────────────────────────
   KanbanPage — Kanban de status das solicitações.
   3 colunas: Gerada | Enviada | Paga
   Ao mover para "Paga", exibe modal para confirmar data
   e registra o recebimento na planilha de acompanhamento.
   ──────────────────────────────────────────── */

import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { SolicitacaoResumo, StatusSolicitacao } from '../types'
import {
  listSolicitacoes,
  loadFromDrive,
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Status</h1>
          <p className="mt-1 text-sm text-gray-500">
            Acompanhe suas solicitações de pagamento
          </p>
        </div>
        <button
          onClick={() => navigate('/wizard')}
          className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
        >
          Nova Solicitação
        </button>
      </div>

      {/* Kanban board */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {COLUMNS.map((col) => {
            const colItems = items.filter((s) => s.status === col.status)

            return (
              <div
                key={col.status}
                className="flex flex-col rounded-2xl border border-gray-100 bg-gray-50/50"
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
                      <p className="text-xs text-gray-300">{col.emptyText}</p>
                    </div>
                  ) : (
                    colItems.map((item) => {
                      const nextStatus = getNextStatus(item.status)
                      const prevStatus = getPrevStatus(item.status)

                      return (
                        <KanbanCard
                          key={item.id}
                          item={item}
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
  onMoveNext,
  onMovePrev,
  nextLabel,
}: {
  item: SolicitacaoResumo
  onMoveNext?: () => void
  onMovePrev?: () => void
  nextLabel?: string
}) {
  const dataFormatada = new Date(item.data).toLocaleDateString('pt-BR')

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      {/* Obra + data */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-gray-900 leading-tight">
          {item.obraNome}
        </p>
        <span className="shrink-0 text-[10px] text-gray-400">{dataFormatada}</span>
      </div>

      {/* Cliente */}
      <p className="mt-1 text-xs text-gray-500">{item.clientes}</p>

      {/* Valor */}
      <div className="mt-3 flex items-baseline justify-between">
        <span className="font-mono text-sm font-semibold tabular-nums text-gray-900">
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
        <div className="mt-3 flex items-center gap-2 border-t border-gray-50 pt-3">
          {onMovePrev && (
            <button
              onClick={onMovePrev}
              className="rounded-lg border border-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
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
              className="ml-auto rounded-lg bg-gray-900 px-3 py-1 text-[11px] font-medium text-white transition-colors hover:bg-gray-800"
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
