/* ────────────────────────────────────────────
   ManageSheet — Interface de gerenciamento de pagamentos.
   Painel financeiro da obra + cards de funcionários + histórico.
   ──────────────────────────────────────────── */

import { useCallback, useEffect, useState } from 'react'
import { FuncionarioCard } from './FuncionarioCard'
import { CurrencyInput } from '../shared/CurrencyInput'
import { formatCurrency } from '../../utils/currency'
import {
  readAllSummaries,
  readPaymentHistory,
  appendPayment,
  readRecebimentos,
  readObraFinancialSummary,
  addAdicional,
  updateRecebimento,
  updateAdicional,
  updatePayment,
  type FuncionarioSummary,
  type PaymentRecord,
  type ObraSheetConfig,
  type RecebimentoRecord,
  type ObraFinancialSummary,
  type AdicionalConfig,
} from '../../services/google-sheets-obras'
import { formatDateBR, dateBRToISO } from '../../utils/date'

import type { ResumoObraData } from './ResumoObra'

interface Props {
  spreadsheetId: string
  obraNome: string
  onSummaryDataChange?: (data: ResumoObraData) => void
}

export function ManageSheet({ spreadsheetId, obraNome, onSummaryDataChange }: Props) {
  const [config, setConfig] = useState<ObraSheetConfig | null>(null)
  const [summaries, setSummaries] = useState<FuncionarioSummary[]>([])
  const [financial, setFinancial] = useState<ObraFinancialSummary | null>(null)
  const [recebimentos, setRecebimentos] = useState<RecebimentoRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Funcionário selecionado
  const [selectedName, setSelectedName] = useState<string | null>(null)
  const [history, setHistory] = useState<PaymentRecord[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Form de novo pagamento (funcionário)
  const [payDate, setPayDate] = useState(() => new Date().toISOString().split('T')[0])
  const [payValor, setPayValor] = useState(0)
  const [payDesc, setPayDesc] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Form de adicional
  const [addDesc, setAddDesc] = useState('')
  const [addValor, setAddValor] = useState(0)
  const [addingAdicional, setAddingAdicional] = useState(false)

  // Tab do painel financeiro
  const [finTab, setFinTab] = useState<'adicionais' | 'recebimentos'>('recebimentos')

  // Edição inline
  const [editingRecebimento, setEditingRecebimento] = useState<number | null>(null)
  const [editingAdicional, setEditingAdicional] = useState<number | null>(null)
  const [editingPayment, setEditingPayment] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<{
    data?: string
    valor?: number
    descricao?: string
    pdfLink?: string
  }>({})
  const [savingEdit, setSavingEdit] = useState(false)

  // Carregar dados iniciais
  const loadAll = useCallback(async () => {
    try {
      const [allSums, fin, receb] = await Promise.all([
        readAllSummaries(spreadsheetId),
        readObraFinancialSummary(spreadsheetId),
        readRecebimentos(spreadsheetId),
      ])
      setConfig(allSums.config)
      setSummaries(allSums.summaries)
      setFinancial(fin)
      setRecebimentos(receb)
      if (allSums.summaries.length > 0 && !selectedName) {
        setSelectedName(allSums.summaries[0].nome)
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    }
  }, [spreadsheetId, selectedName])

  useEffect(() => {
    setLoading(true)
    loadAll().finally(() => setLoading(false))
  }, [spreadsheetId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Expor dados para exportação de resumo (imagem)
  useEffect(() => {
    if (!loading && config && onSummaryDataChange) {
      onSummaryDataChange({
        obraNome,
        financial,
        recebimentos,
        config,
        summaries,
      })
    }
  }, [loading, config, obraNome, financial, recebimentos, summaries, onSummaryDataChange])

  // Carregar histórico ao selecionar funcionário
  useEffect(() => {
    if (!selectedName) return
    setLoadingHistory(true)
    readPaymentHistory(spreadsheetId, selectedName)
      .then(setHistory)
      .catch(console.error)
      .finally(() => setLoadingHistory(false))
  }, [spreadsheetId, selectedName])

  // Registrar pagamento de funcionário
  const handleRegistrar = useCallback(async () => {
    if (!selectedName || payValor <= 0) return

    setSubmitting(true)
    try {
      await appendPayment(
        spreadsheetId,
        selectedName,
        new Date(payDate + 'T12:00:00'),
        payValor,
        payDesc,
      )

      // Recarregar dados
      const [newHistory, allSums, fin] = await Promise.all([
        readPaymentHistory(spreadsheetId, selectedName),
        readAllSummaries(spreadsheetId),
        readObraFinancialSummary(spreadsheetId),
      ])
      setHistory(newHistory)
      setSummaries(allSums.summaries)
      setConfig(allSums.config)
      setFinancial(fin)

      setPayValor(0)
      setPayDesc('')
    } catch (err) {
      console.error('Erro ao registrar pagamento:', err)
    } finally {
      setSubmitting(false)
    }
  }, [spreadsheetId, selectedName, payDate, payValor, payDesc])

  // Adicionar adicional
  const handleAddAdicional = useCallback(async () => {
    if (!addDesc.trim() || addValor <= 0) return

    setAddingAdicional(true)
    try {
      await addAdicional(spreadsheetId, addDesc.trim(), addValor, new Date())

      // Recarregar
      const [newConfig, fin, receb] = await Promise.all([
        readAllSummaries(spreadsheetId),
        readObraFinancialSummary(spreadsheetId),
        readRecebimentos(spreadsheetId),
      ])
      setConfig(newConfig.config)
      setSummaries(newConfig.summaries)
      setFinancial(fin)
      setRecebimentos(receb)

      setAddDesc('')
      setAddValor(0)
    } catch (err) {
      console.error('Erro ao adicionar adicional:', err)
    } finally {
      setAddingAdicional(false)
    }
  }, [spreadsheetId, addDesc, addValor])

  // Salvar edição de recebimento (editForm.data é YYYY-MM-DD do input date)
  const handleSaveRecebimento = useCallback(async () => {
    if (editingRecebimento == null || !editForm.data || editForm.valor == null) return
    const dataDate = new Date(editForm.data + 'T12:00:00')
    if (isNaN(dataDate.getTime())) return

    setSavingEdit(true)
    try {
      await updateRecebimento(
        spreadsheetId,
        editingRecebimento,
        dataDate,
        editForm.valor,
        editForm.descricao ?? '',
        editForm.pdfLink ?? '', // mantém link original se não editado
      )
      const [fin, receb] = await Promise.all([
        readObraFinancialSummary(spreadsheetId),
        readRecebimentos(spreadsheetId),
      ])
      setFinancial(fin)
      setRecebimentos(receb)
      setEditingRecebimento(null)
      setEditForm({})
    } catch (err) {
      console.error('Erro ao salvar recebimento:', err)
    } finally {
      setSavingEdit(false)
    }
  }, [spreadsheetId, editingRecebimento, editForm])

  // Salvar edição de adicional (editForm.data é YYYY-MM-DD do input date)
  const handleSaveAdicional = useCallback(async () => {
    if (editingAdicional == null || !editForm.descricao || editForm.valor == null || !editForm.data)
      return

    setSavingEdit(true)
    try {
      const dataBR = formatDateBR(new Date(editForm.data + 'T12:00:00'))
      await updateAdicional(
        spreadsheetId,
        editingAdicional,
        editForm.descricao,
        editForm.valor,
        dataBR,
      )
      const [newConfig, fin, receb] = await Promise.all([
        readAllSummaries(spreadsheetId),
        readObraFinancialSummary(spreadsheetId),
        readRecebimentos(spreadsheetId),
      ])
      setConfig(newConfig.config)
      setFinancial(fin)
      setRecebimentos(receb)
      setEditingAdicional(null)
      setEditForm({})
    } catch (err) {
      console.error('Erro ao salvar adicional:', err)
    } finally {
      setSavingEdit(false)
    }
  }, [spreadsheetId, editingAdicional, editForm])

  // Salvar edição de pagamento (editForm.data é YYYY-MM-DD do input date)
  const handleSavePayment = useCallback(async () => {
    if (!selectedName || editingPayment == null || !editForm.data || editForm.valor == null) return
    const dataDate = new Date(editForm.data + 'T12:00:00')
    if (isNaN(dataDate.getTime())) return

    setSavingEdit(true)
    try {
      await updatePayment(
        spreadsheetId,
        selectedName,
        editingPayment,
        dataDate,
        editForm.valor,
        editForm.descricao ?? '',
      )
      const [newHistory, allSums, fin] = await Promise.all([
        readPaymentHistory(spreadsheetId, selectedName),
        readAllSummaries(spreadsheetId),
        readObraFinancialSummary(spreadsheetId),
      ])
      setHistory(newHistory)
      setSummaries(allSums.summaries)
      setConfig(allSums.config)
      setFinancial(fin)
      setEditingPayment(null)
      setEditForm({})
    } catch (err) {
      console.error('Erro ao salvar pagamento:', err)
    } finally {
      setSavingEdit(false)
    }
  }, [spreadsheetId, selectedName, editingPayment, editForm])

  const selected = summaries.find((s) => s.nome === selectedName)

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ═══════ Header ═══════ */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{obraNome}</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              Valor total: {formatCurrency(config?.valorTotalObra ?? 0)}
            </p>
          </div>
          <a
            href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
            Abrir Planilha
          </a>
        </div>
      </div>

      {/* ═══════ Painel Financeiro ═══════ */}
      {financial && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          {/* Métricas */}
          <div className="grid grid-cols-2 gap-px bg-gray-100 sm:grid-cols-4">
            <MetricCard label="Valor Original" value={financial.valorOriginal} />
            <MetricCard label="Adicionais" value={financial.totalAdicionais} accent="amber" />
            <MetricCard label="Total Geral" value={financial.totalGeral} accent="blue" bold />
            <MetricCard
              label="Saldo Devedor"
              value={financial.saldoDevedor}
              accent={financial.saldoDevedor <= 0 ? 'green' : 'red'}
              bold
            />
          </div>

          {/* Tabs: Adicionais | Recebimentos */}
          <div className="border-t border-gray-100">
            <div className="flex border-b border-gray-100">
              <button
                onClick={() => setFinTab('recebimentos')}
                className={`flex-1 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  finTab === 'recebimentos'
                    ? 'border-b-2 border-gray-900 text-gray-900'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                Recebimentos ({recebimentos.length})
              </button>
              <button
                onClick={() => setFinTab('adicionais')}
                className={`flex-1 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  finTab === 'adicionais'
                    ? 'border-b-2 border-gray-900 text-gray-900'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                Adicionais ({config?.adicionais.length ?? 0})
              </button>
            </div>

            <div className="p-5">
              {finTab === 'recebimentos' ? (
                /* ── Recebimentos ── */
                recebimentos.length === 0 ? (
                  <p className="py-6 text-center text-sm text-gray-300">
                    Nenhum recebimento registrado
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-gray-100">
                    <div className="grid grid-cols-[90px_1fr_1fr_80px] border-b border-gray-100 bg-gray-50 px-4 py-2">
                      <span className="text-xs font-semibold text-gray-400">Data</span>
                      <span className="text-xs font-semibold text-gray-400">Valor</span>
                      <span className="text-xs font-semibold text-gray-400">Descrição</span>
                      <span />
                    </div>
                    {recebimentos.map((r, i) => (
                      <div
                        key={r.sheetRow}
                        className={`grid grid-cols-[90px_1fr_1fr_80px] items-center gap-2 px-4 py-2.5 ${
                          i < recebimentos.length - 1 ? 'border-b border-gray-50' : ''
                        } ${editingRecebimento === r.sheetRow ? 'bg-amber-50/50' : ''}`}
                      >
                        {editingRecebimento === r.sheetRow ? (
                          <>
                            <input
                              type="date"
                              value={editForm.data ?? dateBRToISO(r.data)}
                              onChange={(e) => setEditForm((f) => ({ ...f, data: e.target.value }))}
                              className="rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                            />
                            <div className="min-w-0">
                              <CurrencyInput
                                value={editForm.valor ?? r.valorCentavos}
                                onChange={(v) => setEditForm((f) => ({ ...f, valor: v }))}
                                className="[&_input]:py-1 [&_input]:text-sm"
                              />
                            </div>
                            <input
                              type="text"
                              value={editForm.descricao ?? r.descricao}
                              onChange={(e) => setEditForm((f) => ({ ...f, descricao: e.target.value }))}
                              placeholder="Descrição"
                              className="min-w-0 rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                            />
                            <div className="flex items-center gap-1">
                              <button
                                onClick={handleSaveRecebimento}
                                disabled={savingEdit}
                                className="rounded p-1 text-green-600 transition-colors hover:bg-green-50"
                                title="Salvar"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                onClick={() => {
                                  setEditingRecebimento(null)
                                  setEditForm({})
                                }}
                                className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100"
                                title="Cancelar"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="text-sm text-gray-600">{r.data}</span>
                            <span className="font-mono text-sm tabular-nums text-gray-900">{r.valor}</span>
                            <span className="text-sm text-gray-500">{r.descricao}</span>
                            <div className="flex items-center gap-1">
                              {r.pdfLink ? (
                                <a
                                  href={r.pdfLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-gray-300 transition-colors hover:text-gray-600"
                                  title="Ver PDF"
                                >
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                  </svg>
                                </a>
                              ) : null}
                              <button
                                onClick={() => {
                                  setEditingRecebimento(r.sheetRow)
                                  setEditForm({ data: dateBRToISO(r.data), valor: r.valorCentavos, descricao: r.descricao, pdfLink: r.pdfLink })
                                }}
                                className="rounded p-1 text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-600"
                                title="Editar"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    <div className="grid grid-cols-[90px_1fr_1fr_80px] border-t border-gray-200 bg-gray-50 px-4 py-2.5">
                      <span className="text-xs font-semibold text-gray-500">Total</span>
                      <span className="font-mono text-sm font-semibold tabular-nums text-gray-900">
                        {formatCurrency(recebimentos.reduce((a, r) => a + r.valorCentavos, 0))}
                      </span>
                      <span />
                      <span />
                    </div>
                  </div>
                )
              ) : (
                /* ── Adicionais ── */
                <div className="space-y-4">
                  {/* Form adicionar */}
                  <div className="flex items-end gap-3">
                    <div className="min-w-0 flex-1">
                      <label className="mb-1 block text-xs text-gray-500">Descrição</label>
                      <input
                        type="text"
                        value={addDesc}
                        onChange={(e) => setAddDesc(e.target.value)}
                        placeholder="Ex: Serralheria, Elétrica extra..."
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                      />
                    </div>
                    <div className="w-40">
                      <label className="mb-1 block text-xs text-gray-500">Valor</label>
                      <CurrencyInput value={addValor} onChange={setAddValor} />
                    </div>
                    <button
                      onClick={handleAddAdicional}
                      disabled={addingAdicional || !addDesc.trim() || addValor <= 0}
                      className="shrink-0 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {addingAdicional ? 'Salvando...' : 'Adicionar'}
                    </button>
                  </div>

                  {/* Lista */}
                  {(config?.adicionais.length ?? 0) === 0 ? (
                    <p className="py-6 text-center text-sm text-gray-300">
                      Nenhum adicional registrado
                    </p>
                  ) : (
                    <div className="overflow-hidden rounded-lg border border-gray-100">
                      <div className="grid grid-cols-[1fr_120px_90px_80px] border-b border-gray-100 bg-gray-50 px-4 py-2">
                        <span className="text-xs font-semibold text-gray-400">Descrição</span>
                        <span className="text-xs font-semibold text-gray-400">Valor</span>
                        <span className="text-xs font-semibold text-gray-400">Data</span>
                        <span />
                      </div>
                      {config!.adicionais.map((a, i) => {
                        const sheetRow = (a as AdicionalConfig & { sheetRow?: number }).sheetRow ?? 0
                        const isEditing = editingAdicional === sheetRow
                        return (
                          <div
                            key={i}
                            className={`grid grid-cols-[1fr_120px_90px_80px] items-center gap-2 px-4 py-2.5 ${
                              i < config!.adicionais.length - 1 ? 'border-b border-gray-50' : ''
                            } ${isEditing ? 'bg-amber-50/50' : ''}`}
                          >
                            {isEditing ? (
                              <>
                                <input
                                  type="text"
                                  value={editForm.descricao ?? a.descricao}
                                  onChange={(e) => setEditForm((f) => ({ ...f, descricao: e.target.value }))}
                                  placeholder="Descrição"
                                  className="min-w-0 rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                                />
                                <div className="min-w-0">
                                  <CurrencyInput
                                    value={editForm.valor ?? a.valor}
                                    onChange={(v) => setEditForm((f) => ({ ...f, valor: v }))}
                                    className="[&_input]:py-1 [&_input]:text-sm"
                                  />
                                </div>
                                <input
                                  type="date"
                                  value={editForm.data ?? dateBRToISO(a.data)}
                                  onChange={(e) => setEditForm((f) => ({ ...f, data: e.target.value }))}
                                  className="rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                                />
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={handleSaveAdicional}
                                    disabled={savingEdit}
                                    className="rounded p-1 text-green-600 transition-colors hover:bg-green-50"
                                    title="Salvar"
                                  >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingAdicional(null)
                                      setEditForm({})
                                    }}
                                    className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100"
                                    title="Cancelar"
                                  >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                <span className="text-sm text-gray-900">{a.descricao}</span>
                                <span className="font-mono text-sm tabular-nums text-amber-700">
                                  + {formatCurrency(a.valor)}
                                </span>
                                <span className="text-xs text-gray-400">{a.data}</span>
                                <button
                                  onClick={() => {
                                    setEditingAdicional(sheetRow)
                                    setEditForm({
                                      descricao: a.descricao,
                                      valor: a.valor,
                                      data: dateBRToISO(a.data),
                                    })
                                  }}
                                  className="rounded p-1 text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-600"
                                  title="Editar"
                                >
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
                        )
                      })}
                      <div className="grid grid-cols-[1fr_120px_90px_80px] border-t border-gray-200 bg-gray-50 px-4 py-2.5">
                        <span className="text-xs font-semibold text-gray-500">Total</span>
                        <span className="font-mono text-sm font-semibold tabular-nums text-amber-700">
                          + {formatCurrency(config!.adicionais.reduce((a, x) => a + x.valor, 0))}
                        </span>
                        <span />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════ Cards de funcionários ═══════ */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Funcionários
        </p>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {summaries.map((s) => (
            <FuncionarioCard
              key={s.nome}
              summary={s}
              isSelected={s.nome === selectedName}
              onClick={() => setSelectedName(s.nome)}
            />
          ))}
        </div>
      </div>

      {/* ═══════ Painel do funcionário selecionado ═══════ */}
      {selected && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          {/* Header do painel */}
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">{selected.nome}</h3>
              <p className="mt-0.5 text-xs text-gray-400">
                {formatCurrency(selected.totalPago)} pago de {formatCurrency(selected.valorEsperado)}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                selected.saldoRestante < 0
                  ? 'bg-red-50 text-red-600'
                  : selected.saldoRestante === 0
                    ? 'bg-green-50 text-green-600'
                    : 'bg-gray-50 text-gray-600'
              }`}
            >
              {selected.saldoRestante < 0
                ? `Excedido ${formatCurrency(Math.abs(selected.saldoRestante))}`
                : selected.saldoRestante === 0
                  ? 'Quitado'
                  : `Restante: ${formatCurrency(selected.saldoRestante)}`}
            </span>
          </div>

          {/* Form novo pagamento */}
          <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Novo Pagamento
            </p>
            <div className="flex items-end gap-3">
              <div className="w-36">
                <label className="mb-1 block text-xs text-gray-500">Data</label>
                <input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>
              <div className="w-36">
                <label className="mb-1 block text-xs text-gray-500">Valor</label>
                <CurrencyInput
                  value={payValor}
                  onChange={setPayValor}
                />
              </div>
              <div className="min-w-0 flex-1">
                <label className="mb-1 block text-xs text-gray-500">Descrição</label>
                <input
                  type="text"
                  value={payDesc}
                  onChange={(e) => setPayDesc(e.target.value)}
                  placeholder="Ex: Pagamento parcial"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>
              <button
                onClick={handleRegistrar}
                disabled={submitting || payValor <= 0}
                className="shrink-0 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? 'Salvando...' : 'Registrar'}
              </button>
            </div>
          </div>

          {/* Histórico */}
          <div className="px-6 py-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Histórico
            </p>

            {loadingHistory ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-50" />
                ))}
              </div>
            ) : history.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-300">
                Nenhum pagamento registrado
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-gray-100">
                <div className="grid grid-cols-[100px_1fr_1fr_80px] border-b border-gray-100 bg-gray-50 px-4 py-2">
                  <span className="text-xs font-semibold text-gray-400">Data</span>
                  <span className="text-xs font-semibold text-gray-400">Valor</span>
                  <span className="text-xs font-semibold text-gray-400">Descrição</span>
                  <span />
                </div>

                {history.map((p, i) => {
                  const sheetRow = p.sheetRow ?? (2 + i)
                  const isEditing = editingPayment === sheetRow
                  return (
                    <div
                      key={sheetRow}
                      className={`grid grid-cols-[100px_1fr_1fr_80px] items-center gap-2 px-4 py-2.5 ${
                        i < history.length - 1 ? 'border-b border-gray-50' : ''
                      } ${isEditing ? 'bg-amber-50/50' : ''}`}
                    >
                      {isEditing ? (
                        <>
                          <input
                            type="date"
                            value={editForm.data ?? dateBRToISO(p.data)}
                            onChange={(e) => setEditForm((f) => ({ ...f, data: e.target.value }))}
                            className="rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                          />
                          <div className="min-w-0">
                            <CurrencyInput
                              value={editForm.valor ?? p.valorCentavos}
                              onChange={(v) => setEditForm((f) => ({ ...f, valor: v }))}
                              className="[&_input]:py-1 [&_input]:text-sm"
                            />
                          </div>
                          <input
                            type="text"
                            value={editForm.descricao ?? p.descricao}
                            onChange={(e) => setEditForm((f) => ({ ...f, descricao: e.target.value }))}
                            placeholder="Descrição"
                            className="min-w-0 rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                          />
                          <div className="flex items-center gap-1">
                            <button
                              onClick={handleSavePayment}
                              disabled={savingEdit}
                              className="rounded p-1 text-green-600 transition-colors hover:bg-green-50"
                              title="Salvar"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => {
                                setEditingPayment(null)
                                setEditForm({})
                              }}
                              className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100"
                              title="Cancelar"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="text-sm text-gray-600">{p.data}</span>
                          <span className="font-mono text-sm tabular-nums text-gray-900">{p.valor}</span>
                          <span className="text-sm text-gray-500">{p.descricao}</span>
                          <button
                            onClick={() => {
                              setEditingPayment(sheetRow)
                              setEditForm({
                                data: dateBRToISO(p.data),
                                valor: p.valorCentavos,
                                descricao: p.descricao,
                              })
                            }}
                            className="rounded p-1 text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-600"
                            title="Editar"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  )
                })}

                <div className="grid grid-cols-[100px_1fr_1fr_80px] border-t border-gray-200 bg-gray-50 px-4 py-2.5">
                  <span className="text-xs font-semibold text-gray-500">Total</span>
                  <span className="font-mono text-sm font-semibold tabular-nums text-gray-900">
                    {formatCurrency(history.reduce((a, p) => a + p.valorCentavos, 0))}
                  </span>
                  <span />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ────────── MetricCard ────────── */

function MetricCard({
  label,
  value,
  accent,
  bold,
}: {
  label: string
  value: number
  accent?: 'amber' | 'blue' | 'green' | 'red'
  bold?: boolean
}) {
  const colorMap = {
    amber: 'text-amber-700',
    blue: 'text-blue-700',
    green: 'text-green-600',
    red: 'text-red-600',
  }

  return (
    <div className="bg-white px-5 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </p>
      <p
        className={`mt-1 font-mono tabular-nums ${bold ? 'text-lg font-bold' : 'text-sm font-semibold'} ${
          accent ? colorMap[accent] : 'text-gray-900'
        }`}
      >
        {formatCurrency(value)}
      </p>
    </div>
  )
}
