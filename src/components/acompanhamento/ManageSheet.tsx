/* ────────────────────────────────────────────
   ManageSheet — Interface de gerenciamento de pagamentos.
   Painel financeiro da obra + cards de funcionários + histórico.
   ──────────────────────────────────────────── */

import { useCallback, useEffect, useRef, useState } from 'react'
import { FuncionarioCard } from './FuncionarioCard'
import { CurrencyInput } from '../shared/CurrencyInput'
import { formatCurrency } from '../../utils/currency'
import {
  isLinhaHistoricoAcrescimo,
  parseIncrementoCentavosAcrescimoHistorico,
  parseMotivoAcrescimoHistorico,
} from '../../utils/funcionarioAcrescimo'
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
  registrarAcrescimoValorEsperadoFuncionario,
  deleteAcrescimoHistoricoFuncionario,
  updateAcrescimoHistoricoFuncionario,
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
import { errorMessageSuggestsReauth } from '../../utils/apiErrors'
import { useAuth } from '../../context/AuthContext'
import type { Obra } from '../../types'

interface Props {
  spreadsheetId: string
  obraNome: string
  obra?: Obra
  onSummaryDataChange?: (data: ResumoObraData) => void
  onCriarSolicitacao?: (obra: Obra) => void
}

const RESUMO_WRITE_DEBOUNCE_MS = 1200

export function ManageSheet({ spreadsheetId, obraNome, obra, onSummaryDataChange, onCriarSolicitacao }: Props) {
  const { signIn } = useAuth()
  const resumoWriteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [resumoSheetError, setResumoSheetError] = useState<string | null>(null)
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

  // Acréscimo no total a receber (serviço extra, acordo com proprietário)
  const [acrValor, setAcrValor] = useState(0)
  const [acrDesc, setAcrDesc] = useState('')
  const [acrSubmitting, setAcrSubmitting] = useState(false)

  // Adicionais da obra (_CONFIG ADICIONAL — somam no total geral da obra)
  const [obraAdicDesc, setObraAdicDesc] = useState('')
  const [obraAdicValor, setObraAdicValor] = useState(0)
  const [obraAdicData, setObraAdicData] = useState(() => new Date().toISOString().slice(0, 10))
  const [addingObraAdicional, setAddingObraAdicional] = useState(false)

  // Acréscimo ao colaborador (aba financeiro — mesmo efeito do bloco violeta; não altera total da obra)
  const [addAcrFuncionarioNome, setAddAcrFuncionarioNome] = useState('')
  const [addDesc, setAddDesc] = useState('')
  const [addValor, setAddValor] = useState(0)
  const [addingColaboradorAcrescimo, setAddingColaboradorAcrescimo] = useState(false)

  // Form de novo funcionário
  const [showAddFuncionario, setShowAddFuncionario] = useState(false)
  const [addFuncNome, setAddFuncNome] = useState('')
  const [addFuncValor, setAddFuncValor] = useState(0)
  const [addingFuncionario, setAddingFuncionario] = useState(false)
  const [addFuncionarioErro, setAddFuncionarioErro] = useState<string | null>(null)

  const [finTab, setFinTab] = useState<'recebimentos' | 'adicionais-obra' | 'acrescimos-colaborador'>(
    'recebimentos',
  )

  // Edição inline
  const [editingRecebimento, setEditingRecebimento] = useState<number | null>(null)
  const [editingAdicional, setEditingAdicional] = useState<number | null>(null)
  const [editingPayment, setEditingPayment] = useState<number | null>(null)
  /** Descrição completa da linha ao abrir edição de acréscimo (para calcular delta no _CONFIG). */
  const [acrescimoEditDescricaoOriginal, setAcrescimoEditDescricaoOriginal] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{
    data?: string
    valor?: number
    descricao?: string
    pdfLink?: string
  }>({})
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingPaymentRow, setDeletingPaymentRow] = useState<number | null>(null)
  const [deletingRecebimentoRow, setDeletingRecebimentoRow] = useState<number | null>(null)

  const applyMinValorEsperado = useCallback(
    (lista: FuncionarioSummary[], nome: string, valorMinimo: number): FuncionarioSummary[] =>
      lista.map((s) =>
        s.nome === nome && s.valorEsperado < valorMinimo
          ? {
              ...s,
              valorEsperado: valorMinimo,
              saldoRestante: valorMinimo - s.totalPago,
            }
          : s,
      ),
    [],
  )
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
      setSelectedName((prev) => {
        const names = allSums.summaries.map((x) => x.nome)
        if (names.length === 0) return null
        if (prev && names.includes(prev)) return prev
        return names[0]
      })
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    }
  }, [spreadsheetId])

  useEffect(() => {
    setLoading(true)
    loadAll().finally(() => setLoading(false))
  }, [spreadsheetId, loadAll])

  useEffect(() => {
    setSelectedName(null)
    setHistory([])
    setEditingRecebimento(null)
    setEditingAdicional(null)
    setEditingPayment(null)
    setAcrescimoEditDescricaoOriginal(null)
    setEditForm({})
    setEditingValorEsperado(false)
    setEditingRascunhoId(null)
    setEditRascunhoForm(null)
    setEditingRascunhoPagId(null)
    setEditRascunhoPagForm(null)
    setResumoSheetError(null)
    if (resumoWriteTimerRef.current) {
      clearTimeout(resumoWriteTimerRef.current)
      resumoWriteTimerRef.current = null
    }
  }, [spreadsheetId])

  useEffect(() => {
    return () => {
      if (resumoWriteTimerRef.current) clearTimeout(resumoWriteTimerRef.current)
    }
  }, [])

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

  // Expor dados para exportação de resumo (imagem); escrita na aba RESUMO com debounce
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

      const { rascunhosRecebimento: _, ...dataForSheet } = summaryData
      if (resumoWriteTimerRef.current) clearTimeout(resumoWriteTimerRef.current)
      resumoWriteTimerRef.current = setTimeout(() => {
        resumoWriteTimerRef.current = null
        void writeResumoToSheet(spreadsheetId, dataForSheet)
          .then(() => setResumoSheetError(null))
          .catch((err: unknown) => {
            console.error('Erro ao atualizar aba RESUMO na planilha:', err)
            const msg = err instanceof Error ? err.message : String(err)
            if (errorMessageSuggestsReauth(msg)) {
              setResumoSheetError(
                'Sessão expirou ou falta permissão. Clique em «Entrar com Google» no topo e tente de novo.',
              )
            }
          })
      }, RESUMO_WRITE_DEBOUNCE_MS)
    }
  }, [
    loading,
    config,
    obraNome,
    financial,
    recebimentos,
    rascunhos,
    rascunhosPagamento,
    summaries,
    paymentHistoryByFuncionario,
    onSummaryDataChange,
    spreadsheetId,
  ])

  // Carregar histórico ao selecionar funcionário
  useEffect(() => {
    if (!selectedName) return
    setLoadingHistory(true)
    readPaymentHistory(spreadsheetId, selectedName)
      .then(setHistory)
      .catch(console.error)
      .finally(() => setLoadingHistory(false))
  }, [spreadsheetId, selectedName])

  useEffect(() => {
    if (summaries.length === 0) {
      setAddAcrFuncionarioNome('')
      return
    }
    setAddAcrFuncionarioNome((prev) =>
      prev && summaries.some((s) => s.nome === prev) ? prev : summaries[0].nome,
    )
  }, [summaries])

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

  const handleRegistrarAcrescimo = useCallback(async () => {
    if (!selectedName) return
    const sel = summaries.find((s) => s.nome === selectedName)
    if (!sel || sel.sheetRow == null) return
    if (acrValor <= 0) return

    setAcrSubmitting(true)
    try {
      const esperadoMinimo = sel.valorEsperado + acrValor
      await registrarAcrescimoValorEsperadoFuncionario(
        spreadsheetId,
        selectedName,
        sel.sheetRow,
        sel.valorEsperado,
        acrValor,
        acrDesc,
      )
      const [newHistory, allSums, fin] = await Promise.all([
        readPaymentHistory(spreadsheetId, selectedName),
        readAllSummaries(spreadsheetId),
        readObraFinancialSummary(spreadsheetId),
      ])
      setHistory(newHistory)
      setSummaries(applyMinValorEsperado(allSums.summaries, selectedName, esperadoMinimo))
      setConfig(allSums.config)
      setFinancial(fin)
      setPaymentHistoryByFuncionario(allSums.paymentHistoryByFuncionario)
      setAcrValor(0)
      setAcrDesc('')
    } catch (err) {
      console.error('Erro ao registrar acréscimo:', err)
    } finally {
      setAcrSubmitting(false)
    }
  }, [spreadsheetId, selectedName, summaries, acrValor, acrDesc, applyMinValorEsperado])

  const handleAddObraAdicional = useCallback(async () => {
    if (!obraAdicDesc.trim() || obraAdicValor <= 0) return

    const parts = obraAdicData.split('-').map(Number)
    const dataRef =
      parts.length === 3 && parts.every((n) => !Number.isNaN(n))
        ? new Date(parts[0], parts[1] - 1, parts[2])
        : new Date()

    setAddingObraAdicional(true)
    try {
      await addAdicional(spreadsheetId, obraAdicDesc.trim(), obraAdicValor, dataRef)

      const [newConfig, fin, receb] = await Promise.all([
        readAllSummaries(spreadsheetId),
        readObraFinancialSummary(spreadsheetId),
        readRecebimentos(spreadsheetId),
      ])
      setConfig(newConfig.config)
      setSummaries(newConfig.summaries)
      setFinancial(fin)
      setRecebimentos(receb)

      setObraAdicDesc('')
      setObraAdicValor(0)
      setObraAdicData(new Date().toISOString().slice(0, 10))
    } catch (err) {
      console.error('Erro ao adicionar adicional da obra:', err)
    } finally {
      setAddingObraAdicional(false)
    }
  }, [spreadsheetId, obraAdicDesc, obraAdicValor, obraAdicData])

  const handleAddColaboradorAcrescimo = useCallback(async () => {
    if (!addDesc.trim() || addValor <= 0 || !addAcrFuncionarioNome) return
    const sel = summaries.find((s) => s.nome === addAcrFuncionarioNome)
    if (!sel || sel.sheetRow == null) return

    setAddingColaboradorAcrescimo(true)
    try {
      const esperadoMinimo = sel.valorEsperado + addValor
      await registrarAcrescimoValorEsperadoFuncionario(
        spreadsheetId,
        addAcrFuncionarioNome,
        sel.sheetRow,
        sel.valorEsperado,
        addValor,
        addDesc.trim(),
      )

      const [newConfig, fin, receb] = await Promise.all([
        readAllSummaries(spreadsheetId),
        readObraFinancialSummary(spreadsheetId),
        readRecebimentos(spreadsheetId),
      ])
      setConfig(newConfig.config)
      setSummaries(applyMinValorEsperado(newConfig.summaries, addAcrFuncionarioNome, esperadoMinimo))
      setFinancial(fin)
      setRecebimentos(receb)
      setPaymentHistoryByFuncionario(newConfig.paymentHistoryByFuncionario)

      setAddDesc('')
      setAddValor(0)
    } catch (err) {
      console.error('Erro ao registrar acréscimo ao colaborador:', err)
    } finally {
      setAddingColaboradorAcrescimo(false)
    }
  }, [spreadsheetId, addDesc, addValor, addAcrFuncionarioNome, summaries, applyMinValorEsperado])

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

    const valorEdit = editForm.valor
    const selAcrescimo =
      acrescimoEditDescricaoOriginal != null
        ? summaries.find((s) => s.nome === selectedName)
        : undefined
    if (acrescimoEditDescricaoOriginal) {
      if (!selAcrescimo?.sheetRow || valorEdit == null || valorEdit <= 0) return
    }

    setSavingEdit(true)
    try {
      if (acrescimoEditDescricaoOriginal && selAcrescimo?.sheetRow != null) {
        await updateAcrescimoHistoricoFuncionario(
          spreadsheetId,
          selectedName,
          editingPayment,
          selAcrescimo.sheetRow,
          selAcrescimo.valorEsperado,
          acrescimoEditDescricaoOriginal,
          dataDate,
          valorEdit,
          editForm.descricao ?? '',
        )
      } else {
        await updatePayment(
          spreadsheetId,
          selectedName,
          editingPayment,
          dataDate,
          valorEdit,
          editForm.descricao ?? '',
        )
      }
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
      setAcrescimoEditDescricaoOriginal(null)
    } catch (err) {
      console.error('Erro ao salvar pagamento:', err)
    } finally {
      setSavingEdit(false)
    }
  }, [spreadsheetId, selectedName, editingPayment, editForm, acrescimoEditDescricaoOriginal, summaries])

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
    const line = history.find((h) => (h.sheetRow ?? 0) === sheetRow)
    const isAcresc = line != null && isLinhaHistoricoAcrescimo(line.valorCentavos, line.descricao)
    const msg = isAcresc
      ? 'Excluir este acréscimo? O total a receber do colaborador será reduzido pelo valor do acréscimo.'
      : 'Deseja excluir este pagamento? Esta ação pode ser desfeita editando a planilha.'
    if (!window.confirm(msg)) return

    setDeletingPaymentRow(sheetRow)
    try {
      if (isAcresc && line) {
        const sel = summaries.find((s) => s.nome === selectedName)
        if (!sel || sel.sheetRow == null) throw new Error('Colaborador inválido')
        await deleteAcrescimoHistoricoFuncionario(
          spreadsheetId,
          selectedName,
          sheetRow,
          sel.sheetRow,
          sel.valorEsperado,
          line.descricao,
        )
      } else {
        await deletePayment(spreadsheetId, selectedName, sheetRow)
      }

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
  }, [spreadsheetId, selectedName, history, summaries])

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
          <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6 text-gray-900 dark:text-gray-100">
      {resumoSheetError && (
        <div
          className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between"
          role="alert"
        >
          <p className="min-w-0 flex-1">{resumoSheetError}</p>
          <button
            type="button"
            onClick={() => signIn()}
            className="shrink-0 rounded-lg bg-amber-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
          >
            Entrar com Google
          </button>
        </div>
      )}
      {/* ═══════ Header ═══════ */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{obraNome}</h2>
            <div className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              <span>
                Total geral com o cliente (contrato + adicionais da obra):{' '}
                <strong className="text-gray-900 dark:text-gray-100">
                  {formatCurrency(financial?.totalGeral ?? config?.valorTotalObra ?? 0)}
                </strong>
              </span>
              {financial && financial.totalAdicionais > 0 && (
                <span className="mt-1 block text-xs text-gray-400">
                  Base contratual: {formatCurrency(financial.valorOriginal)} + adicionais obra:{' '}
                  {formatCurrency(financial.totalAdicionais)}
                </span>
              )}
              <p className="mt-1 text-xs text-gray-400">
                Extras ao cliente: aba <strong>Adicionais obra</strong>. Acréscimos só ao colaborador: aba{' '}
                <strong>Acréscimos colaborador</strong> ou o painel do funcionário — não entram neste total.
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
                      className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:ring-gray-600"
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
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="border-b border-gray-100 px-5 py-3 dark:border-gray-700">
            <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
              <strong>Total geral</strong> (com o cliente) = valor original + <strong>adicionais da obra</strong>.{' '}
              <strong>Acréscimos ao colaborador</strong> aumentam só o que esse colaborador deve receber; não entram neste total.
            </p>
          </div>
          {/* Métricas */}
          {(() => {
            const totalRascunhos = rascunhos.reduce((a, r) => a + r.valorCentavos, 0)
            const saldoComRascunhos = financial ? financial.totalGeral - financial.totalRecebido - totalRascunhos : 0
            const mostraRascunhos = rascunhos.length > 0
            return (
              <div className="grid grid-cols-2 gap-px bg-gray-100 dark:bg-gray-800 sm:grid-cols-4">
                <MetricCard label="Valor original" value={financial.valorOriginal} />
                <MetricCard label="Adicionais obra" value={financial.totalAdicionais} accent="amber" />
                <MetricCard label="Total geral" value={financial.totalGeral} bold />
                <MetricCard
                  label={mostraRascunhos ? 'Saldo (c/ rascunhos)' : 'Saldo devedor'}
                  value={mostraRascunhos ? saldoComRascunhos : financial.saldoDevedor}
                  accent={(mostraRascunhos ? saldoComRascunhos : financial.saldoDevedor) <= 0 ? 'green' : 'red'}
                />
              </div>
            )
          })()}

          <div className="border-t border-gray-100 dark:border-gray-700">
            <div className="flex flex-wrap border-b border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setFinTab('recebimentos')}
                className={`min-w-0 flex-1 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider transition-colors sm:px-4 sm:text-xs ${
                  finTab === 'recebimentos'
                    ? 'border-b-2 border-gray-900 text-gray-900 dark:border-gray-100 dark:text-gray-100'
                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                Recebimentos ({recebimentos.length + rascunhos.length})
                {rascunhos.length > 0 && (
                  <span className="ml-1 inline-block rounded border border-amber-300/80 bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:border-amber-600/60 dark:bg-amber-950/60 dark:text-amber-200">
                    {rascunhos.length} rascunho{rascunhos.length > 1 ? 's' : ''}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setFinTab('adicionais-obra')}
                className={`min-w-0 flex-1 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider transition-colors sm:px-4 sm:text-xs ${
                  finTab === 'adicionais-obra'
                    ? 'border-b-2 border-gray-900 text-gray-900 dark:border-gray-100 dark:text-gray-100'
                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                Adicionais obra
              </button>
              <button
                type="button"
                onClick={() => setFinTab('acrescimos-colaborador')}
                className={`min-w-0 flex-1 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider transition-colors sm:px-4 sm:text-xs ${
                  finTab === 'acrescimos-colaborador'
                    ? 'border-b-2 border-gray-900 text-gray-900 dark:border-gray-100 dark:text-gray-100'
                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                Acréscimos colaborador
              </button>
            </div>

            <div className="p-5">
              {finTab === 'recebimentos' ? (
                /* ── Recebimentos ── */
                <div className="space-y-4">
                  {/* Form: Adicionar rascunho */}
                  <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50/30 p-4 dark:border-amber-800 dark:bg-amber-950/20">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                      Adicionar rascunho
                    </p>
                    <p className="mb-3 text-xs text-amber-900/85 dark:text-amber-100/85">
                      Simula um recebimento sem gravar na planilha. Útil para prever saldo ou criar solicitação (ex.: se houver notas de reembolso).
                    </p>
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="w-36">
                        <label className="mb-1 block text-xs font-medium text-amber-900 dark:text-amber-200">
                          Data
                        </label>
                        <input
                          type="date"
                          value={rascunhoForm.data}
                          onChange={(e) => setRascunhoForm((f) => ({ ...f, data: e.target.value }))}
                          className="w-full rounded border border-amber-200 bg-white px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-amber-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-amber-600"
                        />
                      </div>
                      <div className="w-36">
                        <label className="mb-1 block text-xs font-medium text-amber-900 dark:text-amber-200">
                          Valor
                        </label>
                        <CurrencyInput
                          value={rascunhoForm.valorCentavos}
                          onChange={(v) => setRascunhoForm((f) => ({ ...f, valorCentavos: v }))}
                          className="[&_input]:py-1.5 [&_input]:text-sm"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <label className="mb-1 block text-xs font-medium text-amber-900 dark:text-amber-200">
                          Descrição
                        </label>
                        <input
                          type="text"
                          value={rascunhoForm.descricao}
                          onChange={(e) => setRascunhoForm((f) => ({ ...f, descricao: e.target.value }))}
                          placeholder="Ex: Solicitação prevista"
                          className="w-full rounded border border-amber-200 bg-white px-2 py-1.5 text-sm text-gray-900 placeholder:text-amber-500/70 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-amber-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-amber-400/50 dark:focus:ring-amber-600"
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
                    <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                      Nenhum recebimento registrado
                    </p>
                  ) : (
                  <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-[90px_1fr_1fr_120px] border-b border-gray-200 bg-gray-100 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800/90">
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Data</span>
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Valor</span>
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Descrição</span>
                      <span />
                    </div>
                    {recebimentos.map((r, i) => (
                      <div
                        key={r.sheetRow}
                        className={`grid grid-cols-[90px_1fr_1fr_120px] items-center gap-2 bg-white px-4 py-2.5 dark:bg-gray-900/50 ${
                          i < recebimentos.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''
                        } ${editingRecebimento === r.sheetRow ? 'bg-amber-50/50 dark:bg-amber-950/25' : ''}`}
                      >
                        {editingRecebimento === r.sheetRow ? (
                          <>
                            <input
                              type="date"
                              value={editForm.data ?? dateBRToISO(r.data)}
                              onChange={(e) => setEditForm((f) => ({ ...f, data: e.target.value }))}
                              className="rounded border border-gray-200 bg-white px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-gray-600"
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
                              className="min-w-0 rounded border border-gray-200 bg-white px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-gray-600"
                            />
                            <div className="flex items-center gap-1">
                              <button
                                onClick={handleSaveRecebimento}
                                disabled={savingEdit}
                                className="rounded p-1 text-green-600 transition-colors hover:bg-green-50 dark:hover:bg-green-950/50"
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
                                className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
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
                            <span className="text-sm text-gray-700 dark:text-gray-300">{r.data}</span>
                            <span className="font-mono text-sm font-medium tabular-nums text-gray-900 dark:text-gray-100">
                              {r.valor}
                            </span>
                            <span className="min-w-0 truncate text-sm text-gray-600 dark:text-gray-400">{r.descricao}</span>
                            <div className="flex items-center gap-1">
                              {r.pdfLink ? (
                                <a
                                  href={r.pdfLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-gray-400 transition-colors hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300"
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
                                className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                                title="Editar"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteRecebimento(r.sheetRow)}
                                disabled={deletingRecebimentoRow === r.sheetRow}
                                className="rounded p-1 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-red-950/40 dark:hover:text-red-400"
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
                          className={`grid grid-cols-[90px_1fr_1fr_120px] items-center gap-2 border-b border-amber-100 bg-amber-50/60 px-4 py-2.5 dark:border-gray-700 dark:border-l-2 dark:border-l-amber-500/70 dark:bg-gray-800/50 ${
                            isEditing ? 'bg-amber-100/70 dark:bg-amber-950/35' : ''
                          }`}
                        >
                          {isEditing && form ? (
                            <>
                              <input
                                type="date"
                                value={form.data}
                                onChange={(e) => setEditRascunhoForm((f) => (f ? { ...f, data: e.target.value } : null))}
                                className="rounded border border-amber-300 bg-white px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-amber-600 dark:bg-gray-950 dark:text-gray-100 dark:focus:ring-amber-600"
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
                                className="min-w-0 rounded border border-amber-300 bg-white px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-amber-600 dark:bg-gray-950 dark:text-gray-100 dark:focus:ring-amber-600"
                              />
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleSaveRascunhoEdit(r)}
                                  disabled={!form || form.valorCentavos <= 0}
                                  className="rounded p-1 text-green-500 transition-colors hover:bg-green-950/50 dark:text-green-400"
                                  title="Salvar"
                                >
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingRascunhoId(null)
                                    setEditRascunhoForm(null)
                                  }}
                                  className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-700 dark:hover:bg-gray-800"
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
                              <span className="text-sm text-amber-950 dark:text-gray-200">
                                <span className="text-amber-900 dark:text-gray-300">{dataBR}</span>{' '}
                                <span className="rounded border border-amber-400/70 bg-amber-200/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:border-amber-600/50 dark:bg-amber-950/60 dark:text-amber-200">
                                  rascunho
                                </span>
                              </span>
                              <span className="font-mono text-sm font-semibold tabular-nums text-gray-900 dark:text-emerald-400">
                                {formatCurrency(r.valorCentavos)}
                              </span>
                              <span className="min-w-0 truncate text-sm text-gray-700 dark:text-gray-400">
                                {r.descricao}
                              </span>
                              <div className="flex items-center gap-0.5">
                                <button
                                  onClick={() => {
                                    setEditingRascunhoId(r.id)
                                    setEditRascunhoForm({
                                      data: r.data,
                                      valorCentavos: r.valorCentavos,
                                      descricao: r.descricao,
                                    })
                                  }}
                                  className="rounded p-1 text-amber-400 transition-colors hover:bg-amber-950/60"
                                  title="Editar"
                                >
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleConfirmarRascunho(r)}
                                  disabled={confirmandoRascunho === r.id}
                                  className="rounded p-1 text-green-500 transition-colors hover:bg-green-950/50 dark:text-green-400"
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
                                    className="rounded p-1 text-blue-400 transition-colors hover:bg-blue-950/50"
                                    title="Criar solicitação de pagamento (para incluir notas de reembolso)"
                                  >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  </button>
                                )}
                                <button
                                  onClick={() => handleRemoveRascunho(r)}
                                  className="rounded p-1 text-red-400 transition-colors hover:bg-red-950/40"
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
                    <div className="grid grid-cols-[90px_1fr_1fr_120px] border-t border-gray-200 bg-gray-100 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800/90">
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Total</span>
                      <span className="font-mono text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                        {formatCurrency(
                          recebimentos.reduce((a, r) => a + r.valorCentavos, 0) +
                          rascunhos.reduce((a, r) => a + r.valorCentavos, 0)
                        )}
                        {rascunhos.length > 0 && (
                          <span className="ml-1 text-xs font-normal text-amber-700 dark:text-amber-400">(incl. rascunhos)</span>
                        )}
                      </span>
                      <span />
                      <span />
                    </div>
                  </div>
                  )}
                </div>
              ) : finTab === 'adicionais-obra' ? (
                <div className="space-y-4">
                  <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                    Serviços ou valores <strong>extras cobrados ao cliente</strong>: somam no <strong>total geral</strong> da obra e gravam linhas{' '}
                    <span className="font-mono">ADICIONAL</span> na aba <span className="font-mono">_CONFIG</span>.
                  </p>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="w-36">
                      <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Data</label>
                      <input
                        type="date"
                        value={obraAdicData}
                        onChange={(e) => setObraAdicData(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-gray-600"
                      />
                    </div>
                    <div className="min-w-0 flex-1 basis-[200px]">
                      <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Descrição</label>
                      <input
                        type="text"
                        value={obraAdicDesc}
                        onChange={(e) => setObraAdicDesc(e.target.value)}
                        placeholder="Ex: Serviços adicionais a partir de…"
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:ring-gray-600"
                      />
                    </div>
                    <div className="w-40">
                      <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Valor</label>
                      <CurrencyInput value={obraAdicValor} onChange={setObraAdicValor} />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddObraAdicional}
                      disabled={addingObraAdicional || !obraAdicDesc.trim() || obraAdicValor <= 0}
                      className="shrink-0 rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-amber-600 dark:hover:bg-amber-500"
                    >
                      {addingObraAdicional ? 'Gravando...' : 'Adicionar à obra'}
                    </button>
                  </div>

                  {(config?.adicionais.length ?? 0) === 0 ? (
                    <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                      Nenhum adicional da obra registado
                    </p>
                  ) : (
                    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="grid grid-cols-[1fr_120px_90px_80px] border-b border-gray-200 bg-gray-100 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800/90">
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Descrição</span>
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Valor</span>
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Data</span>
                        <span />
                      </div>
                      {config!.adicionais.map((a, i) => {
                        const sheetRow = (a as AdicionalConfig & { sheetRow?: number }).sheetRow ?? 0
                        const isEditing = editingAdicional === sheetRow
                        return (
                          <div
                            key={i}
                            className={`grid grid-cols-[1fr_120px_90px_80px] items-center gap-2 bg-white px-4 py-2.5 dark:bg-gray-900/50 ${
                              i < config!.adicionais.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''
                            } ${isEditing ? 'bg-amber-50/50 dark:bg-amber-950/25' : ''}`}
                          >
                            {isEditing ? (
                              <>
                                <input
                                  type="text"
                                  value={editForm.descricao ?? a.descricao}
                                  onChange={(e) => setEditForm((f) => ({ ...f, descricao: e.target.value }))}
                                  placeholder="Descrição"
                                  className="min-w-0 rounded border border-gray-200 bg-white px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-gray-600"
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
                                  className="rounded border border-gray-200 bg-white px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-gray-600"
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
                                <span className="text-sm text-gray-900 dark:text-gray-100">{a.descricao}</span>
                                <span className="font-mono text-sm font-medium tabular-nums text-amber-700 dark:text-amber-400">
                                  + {formatCurrency(a.valor)}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">{a.data}</span>
                                <button
                                  onClick={() => {
                                    setEditingAdicional(sheetRow)
                                    setEditForm({
                                      descricao: a.descricao,
                                      valor: a.valor,
                                      data: dateBRToISO(a.data),
                                    })
                                  }}
                                  className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
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
                      <div className="grid grid-cols-[1fr_120px_90px_80px] border-t border-gray-200 bg-gray-100 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800/90">
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Total</span>
                        <span className="font-mono text-sm font-semibold tabular-nums text-amber-700 dark:text-amber-400">
                          + {formatCurrency(config!.adicionais.reduce((a, x) => a + x.valor, 0))}
                        </span>
                        <span />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                    Aumenta o <strong>total a receber</strong> do colaborador escolhido (e regista nota no histórico dele).
                    O valor total da obra com o cliente <strong>não</strong> muda.
                  </p>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="w-full min-w-[12rem] sm:w-56">
                      <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Colaborador</label>
                      <select
                        value={addAcrFuncionarioNome}
                        onChange={(e) => setAddAcrFuncionarioNome(e.target.value)}
                        disabled={summaries.length === 0}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-gray-600"
                      >
                        {summaries.length === 0 ? (
                          <option value="">Nenhum colaborador</option>
                        ) : (
                          summaries.map((s) => (
                            <option key={s.nome} value={s.nome}>
                              {s.nome}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                    <div className="min-w-0 flex-1 basis-[200px]">
                      <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Descrição</label>
                      <input
                        type="text"
                        value={addDesc}
                        onChange={(e) => setAddDesc(e.target.value)}
                        placeholder="Ex: Serviço extra pedido pelo proprietário"
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:ring-gray-600"
                      />
                    </div>
                    <div className="w-40">
                      <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Valor do acréscimo</label>
                      <CurrencyInput value={addValor} onChange={setAddValor} />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddColaboradorAcrescimo}
                      disabled={
                        addingColaboradorAcrescimo ||
                        !addDesc.trim() ||
                        addValor <= 0 ||
                        !addAcrFuncionarioNome ||
                        summaries.find((s) => s.nome === addAcrFuncionarioNome)?.sheetRow == null
                      }
                      className="shrink-0 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
                    >
                      {addingColaboradorAcrescimo ? 'Aplicando...' : 'Aplicar acréscimo'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════ Cards de funcionários ═══════ */}
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Funcionários
          </p>
          <button
            type="button"
            onClick={() => {
              setShowAddFuncionario((v) => !v)
              setAddFuncionarioErro(null)
            }}
            className="flex items-center gap-1 rounded-lg border border-dashed border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:bg-gray-800"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Adicionar Funcionário
          </button>
        </div>
        {showAddFuncionario && (
          <div className="mb-3 rounded-lg border border-dashed border-blue-200 bg-blue-50/30 p-4 dark:border-blue-800 dark:bg-blue-950/30">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
              Novo funcionário
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[140px]">
                <label className="mb-1 block text-xs text-blue-800 dark:text-blue-300">Nome</label>
                <input
                  type="text"
                  value={addFuncNome}
                  onChange={(e) => setAddFuncNome(e.target.value)}
                  placeholder="Nome do funcionário"
                  className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-blue-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-blue-500/60 dark:focus:ring-blue-700"
                />
              </div>
              <div className="w-36">
                <label className="mb-1 block text-xs text-blue-800 dark:text-blue-300">Valor esperado</label>
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
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Cancelar
                </button>
              </div>
            </div>
            {addFuncionarioErro && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">{addFuncionarioErro}</p>
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
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          {/* Header do painel */}
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-700">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{selected.nome}</h3>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                {editingValorEsperado ? (
                  <>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
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
                        className="rounded p-1 text-green-600 transition-colors hover:bg-green-50 dark:hover:bg-green-950/50"
                        title="Salvar"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setEditingValorEsperado(false)}
                        disabled={savingValorEsperado}
                        className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
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
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {formatCurrency(totalPagoComRascunhos)} pago de {formatCurrency(selected.valorEsperado)}
                      {totalRascunhosPag > 0 && (
                        <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                          {rascunhosDoSelected.length} rascunho{rascunhosDoSelected.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </span>
                    {selected.sheetRow != null && (
                      <button
                        onClick={handleStartEditValorEsperado}
                        className="rounded p-0.5 text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
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
                  ? 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400'
                  : saldoComRascunhos === 0
                    ? 'bg-green-50 text-green-600 dark:bg-green-950/50 dark:text-green-400'
                    : 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
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
          <div className="border-b border-gray-100 bg-amber-50/30 px-6 py-4 dark:border-gray-700 dark:bg-amber-950/25">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Adicionar rascunho
            </p>
            <p className="mb-3 text-xs text-amber-800/80 dark:text-amber-200/80">
              Simula um pagamento sem gravar na planilha. Útil para prever o saldo restante antes de efetuar o pagamento.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-36">
                <label className="mb-1 block text-xs text-amber-800 dark:text-amber-300">Data</label>
                <input
                  type="date"
                  value={rascunhoPagForm.data}
                  onChange={(e) => setRascunhoPagForm((f) => ({ ...f, data: e.target.value }))}
                  className="w-full rounded border border-amber-200 bg-white px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-amber-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-amber-600"
                />
              </div>
              <div className="w-36">
                <label className="mb-1 block text-xs text-amber-800 dark:text-amber-300">Valor</label>
                <CurrencyInput
                  value={rascunhoPagForm.valorCentavos}
                  onChange={(v) => setRascunhoPagForm((f) => ({ ...f, valorCentavos: v }))}
                  className="[&_input]:py-1.5 [&_input]:text-sm"
                />
              </div>
              <div className="min-w-0 flex-1">
                <label className="mb-1 block text-xs text-amber-800 dark:text-amber-300">Descrição</label>
                <input
                  type="text"
                  value={rascunhoPagForm.descricao}
                  onChange={(e) => setRascunhoPagForm((f) => ({ ...f, descricao: e.target.value }))}
                  placeholder="Ex: Pagamento previsto"
                  className="w-full rounded border border-amber-200 bg-white px-2 py-1.5 text-sm text-gray-900 placeholder:text-amber-400/60 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-amber-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-amber-500/50 dark:focus:ring-amber-600"
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

          {/* Acréscimo no total a receber (não é pagamento efetivo) */}
          {selected.sheetRow != null && (
            <div className="border-b border-gray-100 bg-violet-50/40 px-6 py-4 dark:border-gray-700 dark:bg-violet-950/25">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-violet-800 dark:text-violet-300">
                Acréscimo no total do colaborador
              </p>
              <p className="mb-3 text-xs leading-relaxed text-violet-900/80 dark:text-violet-200/85">
                Quando o proprietário pede um serviço extra ou outro acordo, aumente aqui o valor total combinado para
                este colaborador. Isto não registra dinheiro pago — use «Novo Pagamento» para transferências efetivas.
                O total da obra com o cliente não é alterado por estes acréscimos — só o combinado com o colaborador.
              </p>
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-40">
                  <label className="mb-1 block text-xs text-violet-800 dark:text-violet-300">Valor do acréscimo</label>
                  <CurrencyInput
                    value={acrValor}
                    onChange={setAcrValor}
                    className="[&_input]:py-1.5 [&_input]:text-sm"
                  />
                </div>
                <div className="min-w-0 flex-1 basis-[200px]">
                  <label className="mb-1 block text-xs text-violet-800 dark:text-violet-300">Motivo (opcional)</label>
                  <input
                    type="text"
                    value={acrDesc}
                    onChange={(e) => setAcrDesc(e.target.value)}
                    placeholder="Ex.: Muro de arrimo extra solicitado pelo proprietário"
                    className="w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-200 dark:border-violet-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-violet-500/50 dark:focus:ring-violet-700"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleRegistrarAcrescimo}
                  disabled={acrSubmitting || acrValor <= 0}
                  className="shrink-0 rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-violet-600 dark:hover:bg-violet-500"
                >
                  {acrSubmitting ? 'Aplicando...' : 'Aplicar acréscimo'}
                </button>
              </div>
            </div>
          )}

          {/* Form novo pagamento */}
          <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4 dark:border-gray-700 dark:bg-gray-800/40">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Novo Pagamento
            </p>
            <div className="flex items-end gap-3">
              <div className="w-36">
                <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Data</label>
                <input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-gray-600"
                />
              </div>
              <div className="w-36">
                <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Valor</label>
                <CurrencyInput
                  value={payValor}
                  onChange={setPayValor}
                />
              </div>
              <div className="min-w-0 flex-1">
                <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Descrição</label>
                <input
                  type="text"
                  value={payDesc}
                  onChange={(e) => setPayDesc(e.target.value)}
                  placeholder="Ex: Pagamento parcial"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:ring-gray-600"
                />
              </div>
              <button
                onClick={handleRegistrar}
                disabled={submitting || payValor <= 0}
                className="shrink-0 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
              >
                {submitting ? 'Salvando...' : 'Registrar'}
              </button>
            </div>
          </div>

          {/* Histórico */}
          <div className="px-6 py-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Histórico
            </p>

            {loadingHistory ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-50 dark:bg-gray-800" />
                ))}
              </div>
            ) : history.length === 0 && rascunhosDoSelected.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                Nenhum pagamento registrado
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-gray-100 dark:border-gray-700">
                <div className="grid grid-cols-[100px_1fr_1fr_120px] border-b border-gray-100 bg-gray-50 px-4 py-2 dark:border-gray-700 dark:bg-gray-800/80">
                  <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">Data</span>
                  <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">Valor</span>
                  <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">Descrição</span>
                  <span />
                </div>

                {history.map((p, i) => {
                  const sheetRow = p.sheetRow ?? (2 + i)
                  const isEditing = editingPayment === sheetRow
                  const isAcrescimoNota = isLinhaHistoricoAcrescimo(p.valorCentavos, p.descricao)
                  return (
                    <div
                      key={sheetRow}
                      className={`grid grid-cols-[100px_1fr_1fr_120px] items-center gap-2 px-4 py-2.5 ${
                        i < history.length - 1 ? 'border-b border-gray-50 dark:border-gray-800' : ''
                      } ${isEditing ? 'bg-amber-50/50 dark:bg-amber-950/30' : ''}`}
                    >
                      {isEditing ? (
                        <>
                          <input
                            type="date"
                            value={editForm.data ?? dateBRToISO(p.data)}
                            onChange={(e) => setEditForm((f) => ({ ...f, data: e.target.value }))}
                            className="rounded border border-gray-200 bg-white px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-gray-600"
                          />
                          <div className="min-w-0">
                            {acrescimoEditDescricaoOriginal ? (
                              <p className="mb-0.5 text-[10px] text-violet-700 dark:text-violet-300">Valor do acréscimo</p>
                            ) : null}
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
                            placeholder={acrescimoEditDescricaoOriginal ? 'Motivo (opcional)' : 'Descrição'}
                            className="min-w-0 rounded border border-gray-200 bg-white px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-gray-600"
                          />
                          <div className="flex items-center gap-1">
                            <button
                              onClick={handleSavePayment}
                              disabled={savingEdit}
                              className="rounded p-1 text-green-600 transition-colors hover:bg-green-50 dark:hover:bg-green-950/50"
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
                                setAcrescimoEditDescricaoOriginal(null)
                              }}
                              className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
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
                          <span className="text-sm text-gray-600 dark:text-gray-400">{p.data}</span>
                          {isAcrescimoNota ? (
                            <span
                              className="text-xs font-medium text-violet-700 dark:text-violet-300"
                              title="Registro de acréscimo no total combinado; valor pago = R$ 0,00"
                            >
                              R$ 0,00 · acréscimo
                            </span>
                          ) : (
                            <span className="font-mono text-sm tabular-nums text-gray-900 dark:text-gray-100">{p.valor}</span>
                          )}
                          <span className="text-sm text-gray-500 dark:text-gray-400">{p.descricao}</span>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPayment(sheetRow)
                                if (isAcrescimoNota) {
                                  setAcrescimoEditDescricaoOriginal(p.descricao)
                                  const inc = parseIncrementoCentavosAcrescimoHistorico(p.descricao) ?? 0
                                  setEditForm({
                                    data: dateBRToISO(p.data),
                                    valor: inc,
                                    descricao: parseMotivoAcrescimoHistorico(p.descricao),
                                  })
                                } else {
                                  setAcrescimoEditDescricaoOriginal(null)
                                  setEditForm({
                                    data: dateBRToISO(p.data),
                                    valor: p.valorCentavos,
                                    descricao: p.descricao,
                                  })
                                }
                              }}
                              className="rounded p-1 text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                              title="Editar"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePayment(sheetRow)}
                              disabled={deletingPaymentRow === sheetRow}
                              className="rounded p-1 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-red-950/40 dark:hover:text-red-400"
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
                      className={`grid grid-cols-[100px_1fr_1fr_120px] items-center gap-2 border-b border-amber-100 bg-amber-50/50 px-4 py-2.5 dark:border-amber-900/50 dark:bg-amber-950/25 ${
                        isEditing ? 'bg-amber-100/50 dark:bg-amber-950/40' : ''
                      }`}
                    >
                      {isEditing && form ? (
                        <>
                          <input
                            type="date"
                            value={form.data}
                            onChange={(e) => setEditRascunhoPagForm((f) => (f ? { ...f, data: e.target.value } : null))}
                            className="rounded border border-amber-300 bg-white px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-amber-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-amber-700"
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
                            className="min-w-0 rounded border border-amber-300 bg-white px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-amber-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-amber-700"
                          />
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleSaveRascunhoPagEdit(r.id)}
                              disabled={!form || form.valorCentavos <= 0}
                              className="rounded p-1 text-green-600 transition-colors hover:bg-green-50 dark:hover:bg-green-950/50"
                              title="Salvar"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => { setEditingRascunhoPagId(null); setEditRascunhoPagForm(null) }}
                              className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
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
                          <span className="text-sm text-amber-800 dark:text-amber-200">
                            {dataBR}{' '}
                            <span className="rounded bg-amber-200/60 px-1 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-800/60 dark:text-amber-100">
                              rascunho
                            </span>
                          </span>
                          <span className="font-mono text-sm tabular-nums text-gray-900 dark:text-gray-100">
                            {formatCurrency(r.valorCentavos)}
                          </span>
                          <span className="min-w-0 truncate text-sm text-gray-600 dark:text-gray-400">{r.descricao}</span>
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={() => {
                                setEditingRascunhoPagId(r.id)
                                setEditRascunhoPagForm({
                                  data: r.data,
                                  valorCentavos: r.valorCentavos,
                                  descricao: r.descricao,
                                })
                              }}
                              className="rounded p-1 text-amber-600 transition-colors hover:bg-amber-100 dark:hover:bg-amber-950/60"
                              title="Editar"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleConfirmarRascunhoPag(r)}
                              disabled={confirmandoRascunhoPag === r.id}
                              className="rounded p-1 text-green-600 transition-colors hover:bg-green-50 dark:hover:bg-green-950/50"
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
                              className="rounded p-1 text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-950/40"
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

                <div className="grid grid-cols-[100px_1fr_1fr_120px] border-t border-gray-200 bg-gray-50 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800/80">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Total</span>
                  <span className="font-mono text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                    {formatCurrency(
                      history.reduce((a, p) => a + p.valorCentavos, 0) +
                      rascunhosDoSelected.reduce((a, r) => a + r.valorCentavos, 0)
                    )}
                    {rascunhosDoSelected.length > 0 && (
                      <span className="ml-1 text-xs font-normal text-amber-700 dark:text-amber-400">(incl. rascunhos)</span>
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
    amber: 'text-amber-700 dark:text-amber-400',
    blue: 'text-blue-700 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    red: 'text-red-600 dark:text-red-400',
  }

  return (
    <div className="bg-white px-5 py-4 dark:bg-gray-900">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        {label}
      </p>
      <p
        className={`mt-1 font-mono tabular-nums ${bold ? 'text-lg font-bold' : 'text-sm font-semibold'} ${
          accent ? colorMap[accent] : 'text-gray-900 dark:text-gray-100'
        }`}
      >
        {formatCurrency(value)}
      </p>
    </div>
  )
}
