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
  deletePayment,
  appendRascunhoRecebimento,
  updateRascunhoRecebimento,
  confirmarRascunhoRecebimento,
  deleteRecebimento,
  readRecebimentos,
  readRecebimentosComRascunhos,
  readObraFinancialSummary,
  addAdicional,
  addFuncionario,
  updateRecebimento,
  updateAdicional,
  updatePayment,
  updateFuncionarioValorEsperado,
  formatObraSheetVisual,
  writeResumoToSheet,
  type FuncionarioSummary,
  type PaymentRecord,
  type ObraSheetConfig,
  type RecebimentoRecord,
  type ObraFinancialSummary,
  type AdicionalConfig,
} from '../../services/google-sheets-obras'
import { formatDateBR, dateBRToISO } from '../../utils/date'

import type { ResumoObraData, RascunhoPagamento } from './ResumoObra'
import type { RascunhoRecebimentoSheet } from '../../services/google-sheets-obras'
import { loadRascunhos, saveRascunhos } from '../../utils/rascunhos-store'
import { getObraMeta, getObraMetaDrive, saveObraMeta } from '../../utils/storage'
import type { Obra } from '../../types'

interface Props {
  spreadsheetId: string
  obraNome: string
  obra?: Obra
  onSummaryDataChange?: (data: ResumoObraData) => void
  onCriarSolicitacao?: (obra: Obra) => void
}

export function ManageSheet({ spreadsheetId, obraNome, obra, onSummaryDataChange, onCriarSolicitacao }: Props) {
  const [config, setConfig] = useState<ObraSheetConfig | null>(null)
  const [summaries, setSummaries] = useState<FuncionarioSummary[]>([])
  const [financial, setFinancial] = useState<ObraFinancialSummary | null>(null)
  const [recebimentos, setRecebimentos] = useState<RecebimentoRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Funcionário selecionado
  const [selectedName, setSelectedName] = useState<string | null>(null)
  const [history, setHistory] = useState<PaymentRecord[]>([])
  const [paymentHistoryByFuncionario, setPaymentHistoryByFuncionario] = useState<Record<string, PaymentRecord[]>>({})
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

  // Form de novo funcionário
  const [showAddFuncionario, setShowAddFuncionario] = useState(false)
  const [addFuncNome, setAddFuncNome] = useState('')
  const [addFuncValor, setAddFuncValor] = useState(0)
  const [addingFuncionario, setAddingFuncionario] = useState(false)
  const [addFuncionarioErro, setAddFuncionarioErro] = useState<string | null>(null)

  // Tab do painel financeiro (adicionais em primeiro para facilitar acrescentar valor ao total)
  const [finTab, setFinTab] = useState<'adicionais' | 'recebimentos'>('adicionais')

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
  const [deletingPaymentRow, setDeletingPaymentRow] = useState<number | null>(null)
  const [deletingRecebimentoRow, setDeletingRecebimentoRow] = useState<number | null>(null)
  const [formattingSheet, setFormattingSheet] = useState(false)
  const [emailCliente, setEmailCliente] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [editingValorEsperado, setEditingValorEsperado] = useState(false)
  const [editValorEsperado, setEditValorEsperado] = useState(0)
  const [savingValorEsperado, setSavingValorEsperado] = useState(false)

  // Rascunhos de recebimento (persistidos na planilha com coluna E = "rascunho")
  const [rascunhos, setRascunhos] = useState<RascunhoRecebimentoSheet[]>([])
  const [addingRascunho, setAddingRascunho] = useState(false)
  const [rascunhoForm, setRascunhoForm] = useState({ data: new Date().toISOString().split('T')[0], valorCentavos: 0, descricao: '' })
  const [editingRascunhoId, setEditingRascunhoId] = useState<string | null>(null)
  const [editRascunhoForm, setEditRascunhoForm] = useState<{ data: string; valorCentavos: number; descricao: string } | null>(null)
  const [confirmandoRascunho, setConfirmandoRascunho] = useState<string | null>(null)

  // Rascunhos de pagamento por funcionário (não persistidos até confirmar)
  const [rascunhosPagamento, setRascunhosPagamento] = useState<Record<string, RascunhoPagamento[]>>({})
  const [rascunhoPagForm, setRascunhoPagForm] = useState({ data: new Date().toISOString().split('T')[0], valorCentavos: 0, descricao: '' })
  const [editingRascunhoPagId, setEditingRascunhoPagId] = useState<string | null>(null)
  const [editRascunhoPagForm, setEditRascunhoPagForm] = useState<{ data: string; valorCentavos: number; descricao: string } | null>(null)
  const [confirmandoRascunhoPag, setConfirmandoRascunhoPag] = useState<string | null>(null)

  // Carregar dados iniciais (recebimentos + rascunhos da planilha)
  const loadAll = useCallback(async () => {
    try {
      const [allSums, fin, recebData] = await Promise.all([
        readAllSummaries(spreadsheetId),
        readObraFinancialSummary(spreadsheetId),
        readRecebimentosComRascunhos(spreadsheetId),
      ])
      setConfig(allSums.config)
      setSummaries(allSums.summaries)
      setFinancial(fin)
      setRecebimentos(recebData.recebimentos)
      setRascunhos(recebData.rascunhos)
      setPaymentHistoryByFuncionario(allSums.paymentHistoryByFuncionario)
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

  // Carregar rascunhos de pagamento do localStorage (rascunhos de recebimento vêm da planilha)
  useEffect(() => {
    if (!spreadsheetId) return
    const stored = loadRascunhos(spreadsheetId)
    setRascunhosPagamento(stored.rascunhosPagamento)
  }, [spreadsheetId])

  // Salvar rascunhos de pagamento no localStorage
  useEffect(() => {
    if (!spreadsheetId) return
    saveRascunhos(spreadsheetId, { rascunhosRecebimento: [], rascunhosPagamento })
  }, [spreadsheetId, rascunhosPagamento])

  // Expor dados para exportação de resumo (imagem) + atualizar aba RESUMO na planilha
  useEffect(() => {
    if (!loading && config) {
      const temRascunhosPag = Object.keys(rascunhosPagamento).some((k) => (rascunhosPagamento[k]?.length ?? 0) > 0)
      const summaryData: ResumoObraData = {
        obraNome,
        financial,
        recebimentos,
        rascunhosRecebimento: rascunhos.length > 0 ? rascunhos : undefined,
        config,
        summaries,
        pagamentosPorFuncionario: paymentHistoryByFuncionario,
        rascunhosPagamentoPorFuncionario: temRascunhosPag ? rascunhosPagamento : undefined,
      }
      onSummaryDataChange?.(summaryData)

      // Atualiza a aba RESUMO na planilha (sem rascunhos — só dados reais)
      const { rascunhosRecebimento: _, ...dataForSheet } = summaryData
      writeResumoToSheet(spreadsheetId, dataForSheet).catch((err) => {
        console.error('Erro ao atualizar aba RESUMO na planilha:', err)
      })
    }
  }, [loading, config, obraNome, financial, recebimentos, rascunhos, rascunhosPagamento, summaries, paymentHistoryByFuncionario, onSummaryDataChange, spreadsheetId])

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
      setPaymentHistoryByFuncionario(allSums.paymentHistoryByFuncionario)

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

  // Adicionar funcionário
  const handleAddFuncionario = useCallback(async () => {
    if (!addFuncNome.trim() || addFuncValor <= 0) return

    setAddingFuncionario(true)
    setAddFuncionarioErro(null)
    try {
      await addFuncionario(spreadsheetId, addFuncNome.trim(), addFuncValor)

      const [allSums, fin, receb] = await Promise.all([
        readAllSummaries(spreadsheetId),
        readObraFinancialSummary(spreadsheetId),
        readRecebimentos(spreadsheetId),
      ])
      setConfig(allSums.config)
      setSummaries(allSums.summaries)
      setFinancial(fin)
      setRecebimentos(receb)
      setPaymentHistoryByFuncionario(allSums.paymentHistoryByFuncionario)
      setSelectedName(addFuncNome.trim())

      setShowAddFuncionario(false)
      setAddFuncNome('')
      setAddFuncValor(0)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao adicionar funcionário'
      setAddFuncionarioErro(msg)
      console.error('Erro ao adicionar funcionário:', err)
    } finally {
      setAddingFuncionario(false)
    }
  }, [spreadsheetId, addFuncNome, addFuncValor])

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
      setPaymentHistoryByFuncionario(allSums.paymentHistoryByFuncionario)
      setEditingPayment(null)
      setEditForm({})
    } catch (err) {
      console.error('Erro ao salvar pagamento:', err)
    } finally {
      setSavingEdit(false)
    }
  }, [spreadsheetId, selectedName, editingPayment, editForm])

  const handleDeleteRecebimento = useCallback(async (sheetRow: number) => {
    if (!window.confirm('Deseja excluir este recebimento? A linha será limpa na planilha.')) return

    setDeletingRecebimentoRow(sheetRow)
    try {
      await deleteRecebimento(spreadsheetId, sheetRow)

      const [fin, receb] = await Promise.all([
        readObraFinancialSummary(spreadsheetId),
        readRecebimentos(spreadsheetId),
      ])
      setFinancial(fin)
      setRecebimentos(receb)
    } catch (err) {
      console.error('Erro ao excluir recebimento:', err)
    } finally {
      setDeletingRecebimentoRow(null)
    }
  }, [spreadsheetId])

  const handleDeletePayment = useCallback(async (sheetRow: number) => {
    if (!selectedName) return
    if (!window.confirm('Deseja excluir este pagamento? Esta ação pode ser desfeita editando a planilha.')) return

    setDeletingPaymentRow(sheetRow)
    try {
      await deletePayment(spreadsheetId, selectedName, sheetRow)

      const [newHistory, allSums, fin] = await Promise.all([
        readPaymentHistory(spreadsheetId, selectedName),
        readAllSummaries(spreadsheetId),
        readObraFinancialSummary(spreadsheetId),
      ])
      setHistory(newHistory)
      setSummaries(allSums.summaries)
      setConfig(allSums.config)
      setFinancial(fin)
      setPaymentHistoryByFuncionario(allSums.paymentHistoryByFuncionario)
    } catch (err) {
      console.error('Erro ao excluir pagamento:', err)
    } finally {
      setDeletingPaymentRow(null)
    }
  }, [spreadsheetId, selectedName])

  const selected = summaries.find((s) => s.nome === selectedName)

  const handleFormatVisual = useCallback(async () => {
    setFormattingSheet(true)
    try {
      await formatObraSheetVisual(spreadsheetId)
      await loadAll()
    } catch (err) {
      console.error('Erro ao aplicar estilo visual da planilha:', err)
    } finally {
      setFormattingSheet(false)
    }
  }, [spreadsheetId, loadAll])

  const handleSaveValorEsperado = useCallback(async () => {
    if (!selected || selected.sheetRow == null) return
    if (editValorEsperado < 0) return

    setSavingValorEsperado(true)
    try {
      await updateFuncionarioValorEsperado(spreadsheetId, selected.sheetRow, editValorEsperado)
      const [allSums, fin] = await Promise.all([
        readAllSummaries(spreadsheetId),
        readObraFinancialSummary(spreadsheetId),
      ])
      setConfig(allSums.config)
      setSummaries(allSums.summaries)
      setFinancial(fin)
      setPaymentHistoryByFuncionario(allSums.paymentHistoryByFuncionario)
      setEditingValorEsperado(false)
    } catch (err) {
      console.error('Erro ao atualizar valor esperado:', err)
    } finally {
      setSavingValorEsperado(false)
    }
  }, [spreadsheetId, selected, editValorEsperado])

  const handleStartEditValorEsperado = useCallback(() => {
    if (selected) {
      setEditValorEsperado(selected.valorEsperado)
      setEditingValorEsperado(true)
    }
  }, [selected])

  // Rascunhos de recebimento (persistidos na planilha)
  const handleAddRascunho = useCallback(async () => {
    if (rascunhoForm.valorCentavos <= 0) return
    setAddingRascunho(true)
    try {
      const dataDate = new Date(rascunhoForm.data + 'T12:00:00')
      await appendRascunhoRecebimento(
        spreadsheetId,
        dataDate,
        rascunhoForm.valorCentavos,
        rascunhoForm.descricao.trim() || 'Rascunho',
      )
      setRascunhoForm({ data: new Date().toISOString().split('T')[0], valorCentavos: 0, descricao: '' })
      const { recebimentos: receb, rascunhos: rasc } = await readRecebimentosComRascunhos(spreadsheetId)
      setRecebimentos(receb)
      setRascunhos(rasc)
    } catch (err) {
      console.error('Erro ao adicionar rascunho:', err)
    } finally {
      setAddingRascunho(false)
    }
  }, [spreadsheetId, rascunhoForm])

  const handleRemoveRascunho = useCallback(
    async (rascunho: RascunhoRecebimentoSheet) => {
      if (!window.confirm('Deseja excluir este rascunho? Ele será removido da planilha.')) return
      try {
        await deleteRecebimento(spreadsheetId, rascunho.sheetRow)
        const { recebimentos: receb, rascunhos: rasc } = await readRecebimentosComRascunhos(spreadsheetId)
        setRecebimentos(receb)
        setRascunhos(rasc)
        if (editingRascunhoId === rascunho.id) {
          setEditingRascunhoId(null)
          setEditRascunhoForm(null)
        }
      } catch (err) {
        console.error('Erro ao remover rascunho:', err)
      }
    },
    [spreadsheetId, editingRascunhoId],
  )

  const handleSaveRascunhoEdit = useCallback(
    async (rascunho: RascunhoRecebimentoSheet) => {
      if (!editRascunhoForm || editRascunhoForm.valorCentavos <= 0) return
      try {
        const dataDate = new Date(editRascunhoForm.data + 'T12:00:00')
        await updateRascunhoRecebimento(
          spreadsheetId,
          rascunho.sheetRow,
          dataDate,
          editRascunhoForm.valorCentavos,
          editRascunhoForm.descricao.trim() || rascunho.descricao,
        )
        const { recebimentos: receb, rascunhos: rasc } = await readRecebimentosComRascunhos(spreadsheetId)
        setRecebimentos(receb)
        setRascunhos(rasc)
        setEditingRascunhoId(null)
        setEditRascunhoForm(null)
      } catch (err) {
        console.error('Erro ao salvar rascunho:', err)
      }
    },
    [spreadsheetId, editRascunhoForm],
  )

  const handleConfirmarRascunho = useCallback(
    async (rascunho: RascunhoRecebimentoSheet) => {
      setConfirmandoRascunho(rascunho.id)
      try {
        const dataDate = new Date(rascunho.data + 'T12:00:00')
        await confirmarRascunhoRecebimento(
          spreadsheetId,
          rascunho.sheetRow,
          dataDate,
          rascunho.valorCentavos,
          rascunho.descricao,
          '',
        )
        const [fin, recebData] = await Promise.all([
          readObraFinancialSummary(spreadsheetId),
          readRecebimentosComRascunhos(spreadsheetId),
        ])
        setFinancial(fin)
        setRecebimentos(recebData.recebimentos)
        setRascunhos(recebData.rascunhos)
      } catch (err) {
        console.error('Erro ao confirmar rascunho:', err)
      } finally {
        setConfirmandoRascunho(null)
      }
    },
    [spreadsheetId],
  )

  // Rascunhos de pagamento (por funcionário)
  const rascunhosDoSelected = selectedName ? (rascunhosPagamento[selectedName] ?? []) : []
  const handleAddRascunhoPag = useCallback(() => {
    if (!selectedName || rascunhoPagForm.valorCentavos <= 0) return
    setRascunhosPagamento((prev) => ({
      ...prev,
      [selectedName]: [
        ...(prev[selectedName] ?? []),
        {
          id: crypto.randomUUID(),
          data: rascunhoPagForm.data,
          valorCentavos: rascunhoPagForm.valorCentavos,
          descricao: rascunhoPagForm.descricao.trim() || 'Rascunho',
        },
      ],
    }))
    setRascunhoPagForm({ data: new Date().toISOString().split('T')[0], valorCentavos: 0, descricao: '' })
  }, [selectedName, rascunhoPagForm])

  const handleRemoveRascunhoPag = useCallback((funcNome: string, id: string) => {
    setRascunhosPagamento((prev) => ({
      ...prev,
      [funcNome]: (prev[funcNome] ?? []).filter((r) => r.id !== id),
    }))
    if (editingRascunhoPagId === id) {
      setEditingRascunhoPagId(null)
      setEditRascunhoPagForm(null)
    }
  }, [editingRascunhoPagId])

  const handleSaveRascunhoPagEdit = useCallback((id: string) => {
    if (!selectedName || !editRascunhoPagForm || editRascunhoPagForm.valorCentavos <= 0) return
    setRascunhosPagamento((prev) => ({
      ...prev,
      [selectedName]: (prev[selectedName] ?? []).map((r) =>
        r.id === id
          ? {
              ...r,
              data: editRascunhoPagForm.data,
              valorCentavos: editRascunhoPagForm.valorCentavos,
              descricao: editRascunhoPagForm.descricao.trim() || r.descricao,
            }
          : r
      ),
    }))
    setEditingRascunhoPagId(null)
    setEditRascunhoPagForm(null)
  }, [selectedName, editRascunhoPagForm])

  const handleConfirmarRascunhoPag = useCallback(
    async (rascunho: RascunhoPagamento) => {
      if (!selectedName) return
      setConfirmandoRascunhoPag(rascunho.id)
      try {
        await appendPayment(
          spreadsheetId,
          selectedName,
          new Date(rascunho.data + 'T12:00:00'),
          rascunho.valorCentavos,
          rascunho.descricao,
        )
        setRascunhosPagamento((prev) => ({
          ...prev,
          [selectedName]: (prev[selectedName] ?? []).filter((r) => r.id !== rascunho.id),
        }))
        const [newHistory, allSums, fin] = await Promise.all([
          readPaymentHistory(spreadsheetId, selectedName),
          readAllSummaries(spreadsheetId),
          readObraFinancialSummary(spreadsheetId),
        ])
        setHistory(newHistory)
        setSummaries(allSums.summaries)
        setConfig(allSums.config)
        setFinancial(fin)
        setPaymentHistoryByFuncionario(allSums.paymentHistoryByFuncionario)
      } catch (err) {
        console.error('Erro ao confirmar rascunho de pagamento:', err)
      } finally {
        setConfirmandoRascunhoPag(null)
      }
    },
    [spreadsheetId, selectedName],
  )

  // Cancela edição de rascunho pag e valor esperado ao trocar de funcionário
  useEffect(() => {
    setEditingValorEsperado(false)
    setEditingRascunhoPagId(null)
    setEditRascunhoPagForm(null)
  }, [selectedName])

  // Carregar email do cliente (ObraMeta — local e Drive)
  useEffect(() => {
    if (!obra?.id) {
      setEmailCliente('')
      return
    }
    const metaLocal = getObraMeta(obra.id)
    setEmailCliente(metaLocal?.email ?? '')
    getObraMetaDrive(obra.id).then((meta) => {
      if (meta?.email) setEmailCliente(meta.email)
    })
  }, [obra?.id])

  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEmailCliente(e.target.value)
  }, [])

  const handleBlurEmail = useCallback(() => {
    if (obra?.id && emailCliente.trim()) {
      const meta = getObraMeta(obra.id) ?? { clientes: obra.nome, projeto: '' }
      saveObraMeta(obra.id, { ...meta, email: emailCliente.trim() })
      setEmailCliente(emailCliente.trim())
    }
  }, [obra, emailCliente])

  const handleCopiarEmail = useCallback(async () => {
    if (!emailCliente.trim()) return
    try {
      await navigator.clipboard.writeText(emailCliente.trim())
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1500)
    } catch {
      // fallback: selecionar o input para o usuário copiar manualmente
      ;(document.getElementById('email-cliente-input') as HTMLInputElement | null)?.select()
    }
  }, [emailCliente])

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
            <div className="mt-0.5 text-sm text-gray-500">
              <span>
                Valor total da obra:{' '}
                <strong className="text-gray-900">
                  {formatCurrency(financial?.totalGeral ?? config?.valorTotalObra ?? 0)}
                </strong>
              </span>
              {financial && financial.totalAdicionais > 0 && (
                <span className="ml-2 text-gray-400">
                  (base: {formatCurrency(financial.valorOriginal)} + adicionais)
                </span>
              )}
              <p className="mt-1 text-xs text-gray-400">
                Para acrescentar valores ao total, use a aba <strong>Adicionais</strong> no painel financeiro abaixo.
              </p>
              {obra && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <label className="text-xs font-medium text-gray-500">E-mail do cliente:</label>
                  <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:max-w-md">
                    <input
                      id="email-cliente-input"
                      type="email"
                      value={emailCliente}
                      onChange={handleEmailChange}
                      onBlur={handleBlurEmail}
                      placeholder="cliente@exemplo.com"
                      className="min-w-0 flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                      spellCheck={false}
                      autoComplete="email"
                    />
                    <button
                      type="button"
                      onClick={handleCopiarEmail}
                      disabled={!emailCliente.trim()}
                      className="shrink-0 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {copiado ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleFormatVisual}
              disabled={formattingSheet}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {formattingSheet ? 'Aplicando...' : 'Aplicar Estilo'}
            </button>
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
      </div>

      {/* ═══════ Painel Financeiro ═══════ */}
      {financial && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          {/* Métricas */}
          {(() => {
            const totalRascunhos = rascunhos.reduce((a, r) => a + r.valorCentavos, 0)
            const saldoComRascunhos = financial ? financial.totalGeral - financial.totalRecebido - totalRascunhos : 0
            const mostraRascunhos = rascunhos.length > 0
            return (
              <div className="grid grid-cols-2 gap-px bg-gray-100 sm:grid-cols-4">
                <MetricCard label="Valor Original" value={financial.valorOriginal} />
                <MetricCard label="Adicionais" value={financial.totalAdicionais} accent="amber" />
                <MetricCard label="Total Geral" value={financial.totalGeral} accent="blue" bold />
                <MetricCard
                  label={mostraRascunhos ? 'Saldo (c/ rascunhos)' : 'Saldo Devedor'}
                  value={mostraRascunhos ? saldoComRascunhos : financial.saldoDevedor}
                  accent={(mostraRascunhos ? saldoComRascunhos : financial.saldoDevedor) <= 0 ? 'green' : 'red'}
                  bold
                />
              </div>
            )
          })()}

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
                Recebimentos ({recebimentos.length + rascunhos.length})
                {rascunhos.length > 0 && (
                  <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">
                    {rascunhos.length} rascunho{rascunhos.length > 1 ? 's' : ''}
                  </span>
                )}
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
                <div className="space-y-4">
                  {/* Form: Adicionar rascunho */}
                  <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50/30 p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-amber-700">
                      Adicionar rascunho
                    </p>
                    <p className="mb-3 text-xs text-amber-800/80">
                      Simula um recebimento sem gravar na planilha. Útil para prever saldo ou criar solicitação (ex.: se houver notas de reembolso).
                    </p>
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="w-36">
                        <label className="mb-1 block text-xs text-amber-800">Data</label>
                        <input
                          type="date"
                          value={rascunhoForm.data}
                          onChange={(e) => setRascunhoForm((f) => ({ ...f, data: e.target.value }))}
                          className="w-full rounded border border-amber-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                        />
                      </div>
                      <div className="w-36">
                        <label className="mb-1 block text-xs text-amber-800">Valor</label>
                        <CurrencyInput
                          value={rascunhoForm.valorCentavos}
                          onChange={(v) => setRascunhoForm((f) => ({ ...f, valorCentavos: v }))}
                          className="[&_input]:py-1.5 [&_input]:text-sm"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <label className="mb-1 block text-xs text-amber-800">Descrição</label>
                        <input
                          type="text"
                          value={rascunhoForm.descricao}
                          onChange={(e) => setRascunhoForm((f) => ({ ...f, descricao: e.target.value }))}
                          placeholder="Ex: Solicitação prevista"
                          className="w-full rounded border border-amber-200 px-2 py-1.5 text-sm placeholder:text-amber-400/60 focus:outline-none focus:ring-2 focus:ring-amber-200"
                        />
                      </div>
                      <button
                        onClick={handleAddRascunho}
                        disabled={addingRascunho || rascunhoForm.valorCentavos <= 0}
                        className="rounded-lg bg-amber-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {addingRascunho ? 'Salvando...' : 'Adicionar rascunho'}
                      </button>
                    </div>
                  </div>

                  {recebimentos.length === 0 && rascunhos.length === 0 ? (
                    <p className="py-6 text-center text-sm text-gray-300">
                      Nenhum recebimento registrado
                    </p>
                  ) : (
                  <div className="overflow-hidden rounded-lg border border-gray-100">
                    <div className="grid grid-cols-[90px_1fr_1fr_120px] border-b border-gray-100 bg-gray-50 px-4 py-2">
                      <span className="text-xs font-semibold text-gray-400">Data</span>
                      <span className="text-xs font-semibold text-gray-400">Valor</span>
                      <span className="text-xs font-semibold text-gray-400">Descrição</span>
                      <span />
                    </div>
                    {recebimentos.map((r, i) => (
                      <div
                        key={r.sheetRow}
                        className={`grid grid-cols-[90px_1fr_1fr_120px] items-center gap-2 px-4 py-2.5 ${
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
                            <span className="min-w-0 truncate text-sm text-gray-500">{r.descricao}</span>
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
                              <button
                                onClick={() => handleDeleteRecebimento(r.sheetRow)}
                                disabled={deletingRecebimentoRow === r.sheetRow}
                                className="rounded p-1 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                                title="Excluir recebimento"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    {/* Rascunhos */}
                    {rascunhos.map((r) => {
                      const dataBR = /^\d{4}-\d{2}-\d{2}$/.test(r.data)
                        ? `${r.data.slice(8, 10)}/${r.data.slice(5, 7)}/${r.data.slice(0, 4)}`
                        : r.data
                      const isEditing = editingRascunhoId === r.id
                      const form = isEditing ? editRascunhoForm : null
                      return (
                        <div
                          key={r.id}
                          className={`grid grid-cols-[90px_1fr_1fr_120px] items-center gap-2 px-4 py-2.5 border-b border-amber-100 bg-amber-50/50 ${
                            isEditing ? 'bg-amber-100/50' : ''
                          }`}
                        >
                          {isEditing && form ? (
                            <>
                              <input
                                type="date"
                                value={form.data}
                                onChange={(e) => setEditRascunhoForm((f) => f ? { ...f, data: e.target.value } : null)}
                                className="rounded border border-amber-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                              />
                              <div className="min-w-0">
                                <CurrencyInput
                                  value={form.valorCentavos}
                                  onChange={(v) => setEditRascunhoForm((f) => f ? { ...f, valorCentavos: v } : null)}
                                  className="[&_input]:py-1 [&_input]:text-sm"
                                />
                              </div>
                              <input
                                type="text"
                                value={form.descricao}
                                onChange={(e) => setEditRascunhoForm((f) => f ? { ...f, descricao: e.target.value } : null)}
                                placeholder="Descrição"
                                className="min-w-0 rounded border border-amber-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                              />
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleSaveRascunhoEdit(r)}
                                  disabled={!form || form.valorCentavos <= 0}
                                  className="rounded p-1 text-green-600 transition-colors hover:bg-green-50"
                                  title="Salvar"
                                >
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => { setEditingRascunhoId(null); setEditRascunhoForm(null) }}
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
                              <span className="text-sm text-amber-800">
                                {dataBR} <span className="rounded bg-amber-200/60 px-1 py-0.5 text-[10px] font-medium text-amber-800">rascunho</span>
                              </span>
                              <span className="font-mono text-sm tabular-nums text-gray-900">{formatCurrency(r.valorCentavos)}</span>
                              <span className="min-w-0 truncate text-sm text-gray-600">{r.descricao}</span>
                              <div className="flex items-center gap-0.5">
                                <button
                                  onClick={() => { setEditingRascunhoId(r.id); setEditRascunhoForm({ data: r.data, valorCentavos: r.valorCentavos, descricao: r.descricao }) }}
                                  className="rounded p-1 text-amber-600 transition-colors hover:bg-amber-100"
                                  title="Editar"
                                >
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleConfirmarRascunho(r)}
                                  disabled={confirmandoRascunho === r.id}
                                  className="rounded p-1 text-green-600 transition-colors hover:bg-green-50"
                                  title="Confirmar e gravar na planilha"
                                >
                                  {confirmandoRascunho === r.id ? (
                                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-green-400 border-t-transparent" />
                                  ) : (
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </button>
                                {obra && onCriarSolicitacao && (
                                  <button
                                    onClick={() => onCriarSolicitacao(obra)}
                                    className="rounded p-1 text-blue-600 transition-colors hover:bg-blue-50"
                                    title="Criar solicitação de pagamento (para incluir notas de reembolso)"
                                  >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  </button>
                                )}
                                <button
                                  onClick={() => handleRemoveRascunho(r)}
                                  className="rounded p-1 text-red-400 transition-colors hover:bg-red-50"
                                  title="Remover rascunho"
                                >
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )
                    })}
                    <div className="grid grid-cols-[90px_1fr_1fr_120px] border-t border-gray-200 bg-gray-50 px-4 py-2.5">
                      <span className="text-xs font-semibold text-gray-500">Total</span>
                      <span className="font-mono text-sm font-semibold tabular-nums text-gray-900">
                        {formatCurrency(
                          recebimentos.reduce((a, r) => a + r.valorCentavos, 0) +
                          rascunhos.reduce((a, r) => a + r.valorCentavos, 0)
                        )}
                        {rascunhos.length > 0 && (
                          <span className="ml-1 text-xs font-normal text-amber-700">(incl. rascunhos)</span>
                        )}
                      </span>
                      <span />
                      <span />
                    </div>
                  </div>
                  )}
                </div>
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
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Funcionários
          </p>
          <button
            type="button"
            onClick={() => {
              setShowAddFuncionario((v) => !v)
              setAddFuncionarioErro(null)
            }}
            className="flex items-center gap-1 rounded-lg border border-dashed border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-50"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Adicionar Funcionário
          </button>
        </div>
        {showAddFuncionario && (
          <div className="mb-3 rounded-lg border border-dashed border-blue-200 bg-blue-50/30 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-blue-700">
              Novo funcionário
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[140px]">
                <label className="mb-1 block text-xs text-blue-800">Nome</label>
                <input
                  type="text"
                  value={addFuncNome}
                  onChange={(e) => setAddFuncNome(e.target.value)}
                  placeholder="Nome do funcionário"
                  className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm placeholder:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div className="w-36">
                <label className="mb-1 block text-xs text-blue-800">Valor esperado</label>
                <CurrencyInput value={addFuncValor} onChange={setAddFuncValor} />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddFuncionario}
                  disabled={addingFuncionario || !addFuncNome.trim() || addFuncValor <= 0}
                  className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {addingFuncionario ? 'Adicionando...' : 'Adicionar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddFuncionario(false)
                    setAddFuncNome('')
                    setAddFuncValor(0)
                    setAddFuncionarioErro(null)
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
            {addFuncionarioErro && (
              <p className="mt-2 text-xs text-red-600">{addFuncionarioErro}</p>
            )}
          </div>
        )}
        <div className="flex gap-3 overflow-x-auto pb-2">
          {summaries.map((s) => {
            const rascunhosTotal = (rascunhosPagamento[s.nome] ?? []).reduce((a, r) => a + r.valorCentavos, 0)
            const summaryEfetivo =
              rascunhosTotal > 0
                ? {
                    ...s,
                    totalPago: s.totalPago + rascunhosTotal,
                    saldoRestante: s.valorEsperado - (s.totalPago + rascunhosTotal),
                  }
                : s
            return (
              <FuncionarioCard
                key={s.nome}
                summary={summaryEfetivo}
                isSelected={s.nome === selectedName}
                onClick={() => setSelectedName(s.nome)}
              />
            )
          })}
        </div>
      </div>

      {/* ═══════ Painel do funcionário selecionado ═══════ */}
      {selected && (() => {
        const totalRascunhosPag = rascunhosDoSelected.reduce((a, r) => a + r.valorCentavos, 0)
        const totalPagoComRascunhos = selected.totalPago + totalRascunhosPag
        const saldoComRascunhos = selected.valorEsperado - totalPagoComRascunhos
        return (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          {/* Header do painel */}
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">{selected.nome}</h3>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                {editingValorEsperado ? (
                  <>
                    <span className="text-xs text-gray-400">
                      {formatCurrency(totalPagoComRascunhos)} pago de
                    </span>
                    <div className="flex items-center gap-1">
                      <CurrencyInput
                        value={editValorEsperado}
                        onChange={setEditValorEsperado}
                        className="[&_input]:h-7 [&_input]:py-1 [&_input]:text-xs"
                      />
                      <button
                        onClick={handleSaveValorEsperado}
                        disabled={savingValorEsperado}
                        className="rounded p-1 text-green-600 transition-colors hover:bg-green-50"
                        title="Salvar"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setEditingValorEsperado(false)}
                        disabled={savingValorEsperado}
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
                    <span className="text-xs text-gray-400">
                      {formatCurrency(totalPagoComRascunhos)} pago de {formatCurrency(selected.valorEsperado)}
                      {totalRascunhosPag > 0 && (
                        <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">
                          {rascunhosDoSelected.length} rascunho{rascunhosDoSelected.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </span>
                    {selected.sheetRow != null && (
                      <button
                        onClick={handleStartEditValorEsperado}
                        className="rounded p-0.5 text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-600"
                        title="Editar valor esperado (ex: quando um adicional vai para este funcionário)"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                saldoComRascunhos < 0
                  ? 'bg-red-50 text-red-600'
                  : saldoComRascunhos === 0
                    ? 'bg-green-50 text-green-600'
                    : 'bg-gray-50 text-gray-600'
              }`}
            >
              {saldoComRascunhos < 0
                ? `Excedido ${formatCurrency(Math.abs(saldoComRascunhos))}`
                : saldoComRascunhos === 0
                  ? 'Quitado'
                  : `Restante: ${formatCurrency(saldoComRascunhos)}`}
            </span>
          </div>

          {/* Form: Adicionar rascunho de pagamento */}
          <div className="border-b border-gray-100 bg-amber-50/30 px-6 py-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-amber-700">
              Adicionar rascunho
            </p>
            <p className="mb-3 text-xs text-amber-800/80">
              Simula um pagamento sem gravar na planilha. Útil para prever o saldo restante antes de efetuar o pagamento.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-36">
                <label className="mb-1 block text-xs text-amber-800">Data</label>
                <input
                  type="date"
                  value={rascunhoPagForm.data}
                  onChange={(e) => setRascunhoPagForm((f) => ({ ...f, data: e.target.value }))}
                  className="w-full rounded border border-amber-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>
              <div className="w-36">
                <label className="mb-1 block text-xs text-amber-800">Valor</label>
                <CurrencyInput
                  value={rascunhoPagForm.valorCentavos}
                  onChange={(v) => setRascunhoPagForm((f) => ({ ...f, valorCentavos: v }))}
                  className="[&_input]:py-1.5 [&_input]:text-sm"
                />
              </div>
              <div className="min-w-0 flex-1">
                <label className="mb-1 block text-xs text-amber-800">Descrição</label>
                <input
                  type="text"
                  value={rascunhoPagForm.descricao}
                  onChange={(e) => setRascunhoPagForm((f) => ({ ...f, descricao: e.target.value }))}
                  placeholder="Ex: Pagamento previsto"
                  className="w-full rounded border border-amber-200 px-2 py-1.5 text-sm placeholder:text-amber-400/60 focus:outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>
              <button
                onClick={handleAddRascunhoPag}
                disabled={rascunhoPagForm.valorCentavos <= 0}
                className="rounded-lg bg-amber-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Adicionar rascunho
              </button>
            </div>
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
            ) : history.length === 0 && rascunhosDoSelected.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-300">
                Nenhum pagamento registrado
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-gray-100">
                <div className="grid grid-cols-[100px_1fr_1fr_120px] border-b border-gray-100 bg-gray-50 px-4 py-2">
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
                      className={`grid grid-cols-[100px_1fr_1fr_120px] items-center gap-2 px-4 py-2.5 ${
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
                          <div className="flex items-center justify-end gap-1">
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
                            <button
                              onClick={() => handleDeletePayment(sheetRow)}
                              disabled={deletingPaymentRow === sheetRow}
                              className="rounded p-1 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                              title="Excluir"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 7.5h12m-10.5 0v10.125a1.125 1.125 0 001.125 1.125h6.75a1.125 1.125 0 001.125-1.125V7.5m-7.5 0V6a1.125 1.125 0 011.125-1.125h2.25A1.125 1.125 0 0113.5 6v1.5" />
                              </svg>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
                {/* Rascunhos de pagamento */}
                {rascunhosDoSelected.map((r) => {
                  const dataBR = /^\d{4}-\d{2}-\d{2}$/.test(r.data)
                    ? `${r.data.slice(8, 10)}/${r.data.slice(5, 7)}/${r.data.slice(0, 4)}`
                    : r.data
                  const isEditing = editingRascunhoPagId === r.id
                  const form = isEditing ? editRascunhoPagForm : null
                  return (
                    <div
                      key={r.id}
                      className={`grid grid-cols-[100px_1fr_1fr_120px] items-center gap-2 px-4 py-2.5 border-b border-amber-100 bg-amber-50/50 ${
                        isEditing ? 'bg-amber-100/50' : ''
                      }`}
                    >
                      {isEditing && form ? (
                        <>
                          <input
                            type="date"
                            value={form.data}
                            onChange={(e) => setEditRascunhoPagForm((f) => (f ? { ...f, data: e.target.value } : null))}
                            className="rounded border border-amber-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                          />
                          <div className="min-w-0">
                            <CurrencyInput
                              value={form.valorCentavos}
                              onChange={(v) => setEditRascunhoPagForm((f) => (f ? { ...f, valorCentavos: v } : null))}
                              className="[&_input]:py-1 [&_input]:text-sm"
                            />
                          </div>
                          <input
                            type="text"
                            value={form.descricao}
                            onChange={(e) => setEditRascunhoPagForm((f) => (f ? { ...f, descricao: e.target.value } : null))}
                            placeholder="Descrição"
                            className="min-w-0 rounded border border-amber-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                          />
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleSaveRascunhoPagEdit(r.id)}
                              disabled={!form || form.valorCentavos <= 0}
                              className="rounded p-1 text-green-600 transition-colors hover:bg-green-50"
                              title="Salvar"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => { setEditingRascunhoPagId(null); setEditRascunhoPagForm(null) }}
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
                          <span className="text-sm text-amber-800">
                            {dataBR} <span className="rounded bg-amber-200/60 px-1 py-0.5 text-[10px] font-medium text-amber-800">rascunho</span>
                          </span>
                          <span className="font-mono text-sm tabular-nums text-gray-900">{formatCurrency(r.valorCentavos)}</span>
                          <span className="min-w-0 truncate text-sm text-gray-600">{r.descricao}</span>
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={() => { setEditingRascunhoPagId(r.id); setEditRascunhoPagForm({ data: r.data, valorCentavos: r.valorCentavos, descricao: r.descricao }) }}
                              className="rounded p-1 text-amber-600 transition-colors hover:bg-amber-100"
                              title="Editar"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleConfirmarRascunhoPag(r)}
                              disabled={confirmandoRascunhoPag === r.id}
                              className="rounded p-1 text-green-600 transition-colors hover:bg-green-50"
                              title="Confirmar e gravar na planilha"
                            >
                              {confirmandoRascunhoPag === r.id ? (
                                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-green-400 border-t-transparent" />
                              ) : (
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                            <button
                              onClick={() => handleRemoveRascunhoPag(selectedName!, r.id)}
                              className="rounded p-1 text-red-400 transition-colors hover:bg-red-50"
                              title="Remover rascunho"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}

                <div className="grid grid-cols-[100px_1fr_1fr_120px] border-t border-gray-200 bg-gray-50 px-4 py-2.5">
                  <span className="text-xs font-semibold text-gray-500">Total</span>
                  <span className="font-mono text-sm font-semibold tabular-nums text-gray-900">
                    {formatCurrency(
                      history.reduce((a, p) => a + p.valorCentavos, 0) +
                      rascunhosDoSelected.reduce((a, r) => a + r.valorCentavos, 0)
                    )}
                    {rascunhosDoSelected.length > 0 && (
                      <span className="ml-1 text-xs font-normal text-amber-700">(incl. rascunhos)</span>
                    )}
                  </span>
                  <span />
                </div>
              </div>
            )}
          </div>
        </div>
        )
      })()}
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
