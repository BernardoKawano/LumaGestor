/* ────────────────────────────────────────────
   CreateSheetForm — Formulário para criar planilha de obra.
   Valor total + funcionários dinâmicos + Marjorie auto-calculada.
   ──────────────────────────────────────────── */

import { useCallback, useMemo, useState } from 'react'
import { CurrencyInput } from '../shared/CurrencyInput'
import { formatCurrency } from '../../utils/currency'
import { createObraSheet, type FuncionarioConfig } from '../../services/google-sheets-obras'
import type { Obra } from '../../types'

interface FuncInput {
  id: string
  nome: string
  valor: number   // centavos
}

interface Props {
  obra: Obra
  onCreated: (spreadsheetId: string) => void
}

export function CreateSheetForm({ obra, onCreated }: Props) {
  const [valorTotal, setValorTotal] = useState(0)
  const [funcionarios, setFuncionarios] = useState<FuncInput[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  // Soma dos funcionários (sem Marjorie)
  const somaFunc = useMemo(
    () => funcionarios.reduce((acc, f) => acc + f.valor, 0),
    [funcionarios],
  )

  // Valor da Marjorie = Total - Soma Funcionários
  const valorMarjorie = Math.max(0, valorTotal - somaFunc)

  // Validação
  const somaExcede = somaFunc > valorTotal && valorTotal > 0

  const handleAddFunc = useCallback(() => {
    setFuncionarios((prev) => [
      ...prev,
      { id: crypto.randomUUID(), nome: '', valor: 0 },
    ])
  }, [])

  const handleRemoveFunc = useCallback((id: string) => {
    setFuncionarios((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const handleUpdateFunc = useCallback(
    (id: string, field: 'nome' | 'valor', value: string | number) => {
      setFuncionarios((prev) =>
        prev.map((f) => (f.id === id ? { ...f, [field]: value } : f)),
      )
    },
    [],
  )

  const handleCriar = useCallback(async () => {
    // Validações
    if (valorTotal <= 0) {
      setErro('Informe o valor total da obra')
      return
    }
    if (funcionarios.length === 0) {
      setErro('Adicione ao menos um funcionário')
      return
    }
    if (funcionarios.some((f) => !f.nome.trim())) {
      setErro('Preencha o nome de todos os funcionários')
      return
    }
    if (funcionarios.some((f) => f.valor <= 0)) {
      setErro('Todos os funcionários devem ter valor > 0')
      return
    }
    if (somaExcede) {
      setErro('A soma dos funcionários excede o valor total da obra')
      return
    }

    setLoading(true)
    setErro('')

    try {
      const allFunc: FuncionarioConfig[] = [
        ...funcionarios.map((f) => ({
          nome: f.nome,
          valorEsperado: f.valor,
        })),
        {
          nome: 'Marjorie',
          valorEsperado: valorMarjorie,
          isMarjorie: true,
        },
      ]

      const sheetId = await createObraSheet(
        obra.id,
        obra.nome,
        valorTotal,
        allFunc,
      )

      onCreated(sheetId)
    } catch (err) {
      console.error('Erro ao criar planilha:', err)
      setErro('Erro ao criar planilha. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [valorTotal, funcionarios, somaExcede, valorMarjorie, obra, onCreated])

  // Progresso de alocação
  const percentAlocado = valorTotal > 0 ? Math.min(100, (somaFunc / valorTotal) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Card principal */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-lg font-semibold text-gray-900">
          Criar Planilha de Acompanhamento
        </h2>

        {/* Valor total da obra */}
        <div className="mb-6">
          <label className="mb-1.5 block text-sm font-medium text-gray-500">
            Valor Total da Obra
          </label>
          <CurrencyInput
            value={valorTotal}
            onChange={setValorTotal}
            placeholder="0,00"
          />
        </div>

        <div className="border-t border-gray-100" />

        {/* Funcionários */}
        <div className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Funcionários</h3>
            <button
              onClick={handleAddFunc}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              + Funcionário
            </button>
          </div>

          {funcionarios.length === 0 ? (
            <p className="text-sm text-gray-300">
              Nenhum funcionário adicionado. Clique em "+ Funcionário".
            </p>
          ) : (
            <div className="space-y-3">
              {funcionarios.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/50 p-3"
                >
                  <input
                    type="text"
                    value={f.nome}
                    onChange={(e) => handleUpdateFunc(f.id, 'nome', e.target.value)}
                    placeholder="Nome do funcionário"
                    className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                  />
                  <CurrencyInput
                    value={f.valor}
                    onChange={(v) => handleUpdateFunc(f.id, 'valor', v)}
                    className="w-40"
                  />
                  <button
                    onClick={() => handleRemoveFunc(f.id)}
                    className="rounded-lg p-1.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-400"
                    title="Remover"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 border-t border-gray-100" />

        {/* Marjorie (auto-calculada) */}
        <div className="mt-6">
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <svg className="h-4 w-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">Marjorie</p>
              <p className="text-xs text-amber-600">
                Valor calculado automaticamente (Total - Funcionários)
              </p>
            </div>
            <span className="font-mono text-sm font-semibold tabular-nums text-amber-900">
              {formatCurrency(valorMarjorie)}
            </span>
          </div>
        </div>

        <div className="mt-6 border-t border-gray-100" />

        {/* Resumo */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Total alocado</span>
            <span className={`font-mono tabular-nums ${somaExcede ? 'font-semibold text-red-500' : 'text-gray-700'}`}>
              {formatCurrency(somaFunc + valorMarjorie)} / {formatCurrency(valorTotal)}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full transition-all ${somaExcede ? 'bg-red-400' : 'bg-gray-900'}`}
              style={{ width: `${Math.min(100, percentAlocado)}%` }}
            />
          </div>
          {somaExcede && (
            <p className="mt-2 text-xs text-red-500">
              A soma dos funcionários excede o valor total da obra
            </p>
          )}
        </div>

        {erro && <p className="mt-4 text-sm text-red-500">{erro}</p>}
      </div>

      {/* CTA */}
      <div className="flex justify-end">
        <button
          onClick={handleCriar}
          disabled={loading || valorTotal <= 0 || funcionarios.length === 0}
          className="rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Criando planilha...' : 'Criar Planilha'}
        </button>
      </div>
    </div>
  )
}
