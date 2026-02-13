/* ────────────────────────────────────────────
   useWizard — estado global do wizard via Context + useReducer.
   Cada passo lê e escreve neste estado centralizado.
   ──────────────────────────────────────────── */

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react'
import type {
  Obra,
  WizardState,
  WizardStep,
  ItemAdicional,
  NotaReembolso,
  StatusSolicitacao,
} from '../types'
import { TEMPLATE } from '../config/template'
import { getObraMeta, getObraMetaDrive, saveObraMeta } from '../utils/storage'
import { parseValorFromFilename } from '../utils/parseFilename'
import {
  calcSubtotalServico,
  calcTotalReembolso,
  calcTotalGeral,
} from '../types'
import { upsertSolicitacao } from '../utils/solicitacoes-store'

/* ────────── Actions ────────── */

type WizardAction =
  | { type: 'SET_OBRA'; obra: Obra }
  | { type: 'SET_FIELD'; field: 'clientes' | 'projeto'; value: string }
  | { type: 'SET_DATA'; data: Date }
  | { type: 'SET_SERVICO_EMPRESA'; empresa: string }
  | { type: 'SET_SERVICO_VALOR'; valor: number }
  | { type: 'ADD_ADICIONAL' }
  | { type: 'UPDATE_ADICIONAL'; id: string; field: 'nome' | 'valor'; value: string | number }
  | { type: 'REMOVE_ADICIONAL'; id: string }
  | { type: 'ADD_REEMBOLSO'; arquivo: File }
  | { type: 'UPDATE_REEMBOLSO_VALOR'; id: string; valor: number }
  | { type: 'REMOVE_REEMBOLSO'; id: string }
  | { type: 'SET_STEP'; step: WizardStep }
  | { type: 'SET_ERRORS'; errors: Record<string, string> }
  | { type: 'SET_STATUS'; status: StatusSolicitacao }
  | { type: 'SET_PDF_BLOB_URL'; url: string }
  | { type: 'SET_DRIVE_INFO'; fileId: string; pdfUrl: string }
  | { type: 'SET_GENERATING_PDF'; value: boolean }
  | { type: 'SET_UPLOADING'; value: boolean }
  | { type: 'SET_DATA_PAGAMENTO'; data: Date }

/* ────────── Reducer ────────── */

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  const s = state.solicitacao

  switch (action.type) {
    case 'SET_OBRA': {
      // Buscar metadados salvos (clientes + endereço de solicitação anterior)
      const saved = getObraMeta(action.obra.id)
      return {
        ...state,
        solicitacao: {
          ...s,
          obra: action.obra,
          clientes: saved?.clientes ?? action.obra.nome,
          projeto: saved?.projeto ?? action.obra.endereco ?? '',
        },
      }
    }

    case 'SET_FIELD':
      return {
        ...state,
        solicitacao: { ...s, [action.field]: action.value },
      }

    case 'SET_DATA':
      return {
        ...state,
        solicitacao: { ...s, data: action.data },
      }

    case 'SET_SERVICO_EMPRESA':
      return {
        ...state,
        solicitacao: {
          ...s,
          servico: { ...s.servico, empresa: action.empresa },
        },
      }

    case 'SET_SERVICO_VALOR':
      return {
        ...state,
        solicitacao: {
          ...s,
          servico: { ...s.servico, valor: action.valor },
        },
      }

    case 'ADD_ADICIONAL': {
      const novoAdicional: ItemAdicional = {
        id: crypto.randomUUID(),
        nome: '',
        valor: 0,
      }
      return {
        ...state,
        solicitacao: {
          ...s,
          adicionais: [...s.adicionais, novoAdicional],
        },
      }
    }

    case 'UPDATE_ADICIONAL':
      return {
        ...state,
        solicitacao: {
          ...s,
          adicionais: s.adicionais.map((a) =>
            a.id === action.id ? { ...a, [action.field]: action.value } : a,
          ),
        },
      }

    case 'REMOVE_ADICIONAL':
      return {
        ...state,
        solicitacao: {
          ...s,
          adicionais: s.adicionais.filter((a) => a.id !== action.id),
        },
      }

    case 'ADD_REEMBOLSO': {
      // Extrai valor automaticamente do nome do arquivo (ex: "ALLAN 53,40.pdf" → 5340)
      const valorExtraido = parseValorFromFilename(action.arquivo.name)
      const novoReembolso: NotaReembolso = {
        id: crypto.randomUUID(),
        arquivo: action.arquivo,
        nomeOriginal: action.arquivo.name,
        valor: valorExtraido,
      }
      return {
        ...state,
        solicitacao: {
          ...s,
          reembolsos: [...s.reembolsos, novoReembolso],
        },
      }
    }

    case 'UPDATE_REEMBOLSO_VALOR':
      return {
        ...state,
        solicitacao: {
          ...s,
          reembolsos: s.reembolsos.map((r) =>
            r.id === action.id ? { ...r, valor: action.valor } : r,
          ),
        },
      }

    case 'REMOVE_REEMBOLSO':
      return {
        ...state,
        solicitacao: {
          ...s,
          reembolsos: s.reembolsos.filter((r) => r.id !== action.id),
        },
      }

    case 'SET_STEP':
      return { ...state, currentStep: action.step, errors: {} }

    case 'SET_ERRORS':
      return { ...state, errors: action.errors }

    case 'SET_STATUS': {
      // Ao gerar PDF, salvar metadados da obra para auto-preenchimento futuro
      if (action.status === 'gerada' && s.obra) {
        saveObraMeta(s.obra.id, {
          clientes: s.clientes,
          projeto: s.projeto,
        })
      }

      const updatedSol = { ...s, status: action.status }

      // Salvar resumo no store de solicitações (para o Kanban)
      upsertSolicitacao({
        id: state.solicitacaoId,
        obraId: s.obra?.id ?? '',
        obraNome: s.obra?.nome ?? s.clientes,
        clientes: s.clientes,
        projeto: s.projeto,
        data: s.data.toISOString(),
        subtotalServico: calcSubtotalServico(s),
        totalReembolso: calcTotalReembolso(s),
        totalGeral: calcTotalGeral(s),
        status: action.status,
        pdfBlobUrl: s.pdfBlobUrl,
        drivePdfUrl: s.drivePdfUrl,
        dataPagamento: s.dataPagamento?.toISOString(),
        criadoEm: new Date().toISOString(),
      })

      return {
        ...state,
        solicitacao: updatedSol,
      }
    }

    case 'SET_PDF_BLOB_URL':
      return {
        ...state,
        solicitacao: { ...s, pdfBlobUrl: action.url },
      }

    case 'SET_DRIVE_INFO':
      return {
        ...state,
        solicitacao: {
          ...s,
          driveFileId: action.fileId,
          drivePdfUrl: action.pdfUrl,
        },
      }

    case 'SET_GENERATING_PDF':
      return { ...state, isGeneratingPdf: action.value }

    case 'SET_UPLOADING':
      return { ...state, isUploading: action.value }

    case 'SET_DATA_PAGAMENTO':
      return {
        ...state,
        solicitacao: { ...s, dataPagamento: action.data },
      }

    default:
      return state
  }
}

/* ────────── Initial State ────────── */

function createInitialState(obra: Obra | null): WizardState {
  // Buscar metadados salvos para auto-preencher
  const saved = obra ? getObraMeta(obra.id) : null

  return {
    currentStep: 1,
    solicitacaoId: crypto.randomUUID(),
    solicitacao: {
      obra,
      clientes: saved?.clientes ?? obra?.nome ?? '',
      projeto: saved?.projeto ?? obra?.endereco ?? '',
      data: new Date(),
      servico: {
        empresa: TEMPLATE.empresaDefault,
        valor: 0,
      },
      adicionais: [],
      reembolsos: [],
      status: 'rascunho',
    },
    isGeneratingPdf: false,
    isUploading: false,
    errors: {},
  }
}

/* ────────── Context ────────── */

interface WizardContextValue {
  state: WizardState
  dispatch: Dispatch<WizardAction>
}

const WizardContext = createContext<WizardContextValue | null>(null)

export function WizardProvider({
  initialObra,
  children,
}: {
  initialObra: Obra | null
  children: ReactNode
}) {
  const [state, dispatch] = useReducer(
    wizardReducer,
    initialObra,
    (obra) => createInitialState(obra),
  )

  // Ao montar com obra inicial, tentar buscar metadados do Drive
  // se não encontrou no localStorage (outro browser/dispositivo)
  useEffect(() => {
    if (!initialObra) return
    const local = getObraMeta(initialObra.id)
    if (local) return // Já tem no localStorage, reducer já usou

    // Buscar no Drive (assíncrono)
    getObraMetaDrive(initialObra.id).then((meta) => {
      if (meta) {
        dispatch({ type: 'SET_FIELD', field: 'clientes', value: meta.clientes })
        dispatch({ type: 'SET_FIELD', field: 'projeto', value: meta.projeto })
      }
    })
  }, [initialObra])

  return (
    <WizardContext.Provider value={{ state, dispatch }}>
      {children}
    </WizardContext.Provider>
  )
}

export function useWizardContext(): WizardContextValue {
  const ctx = useContext(WizardContext)
  if (!ctx) throw new Error('useWizardContext deve ser usado dentro de WizardProvider')
  return ctx
}
