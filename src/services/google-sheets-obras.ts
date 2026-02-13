/* ────────────────────────────────────────────
   Google Sheets API — Acompanhamento de Obras
   Cria e gerencia planilha de obra com abas por funcionário.

   Estrutura da planilha:
   - Aba "_CONFIG": metadados (valor total, funcionários, adicionais)
   - Aba "RECEBIMENTOS": pagamentos recebidos do cliente
   - Aba por funcionário: Data | Valor Pago | Descrição
   ──────────────────────────────────────────── */

import { formatDateBR } from '../utils/date'
import { formatCurrency } from '../utils/currency'

/* ────────── Tipos ────────── */

export interface FuncionarioConfig {
  nome: string
  valorEsperado: number  // centavos
  isMarjorie?: boolean
}

export interface AdicionalConfig {
  descricao: string
  valor: number    // centavos
  data: string     // "DD/MM/YYYY"
}

export interface ObraSheetConfig {
  spreadsheetId: string
  valorTotalObra: number   // centavos
  funcionarios: FuncionarioConfig[]
  adicionais: AdicionalConfig[]
}

export interface PaymentRecord {
  data: string       // "DD/MM/YYYY"
  valor: string      // "R$ 1.000,00"
  valorCentavos: number
  descricao: string
}

export interface RecebimentoRecord {
  data: string          // "DD/MM/YYYY"
  valor: string         // "R$ 1.000,00"
  valorCentavos: number
  descricao: string
  pdfLink: string
}

export interface FuncionarioSummary {
  nome: string
  valorEsperado: number   // centavos
  totalPago: number        // centavos
  saldoRestante: number    // centavos
  isMarjorie: boolean
}

export interface ObraFinancialSummary {
  valorOriginal: number     // centavos — valor total original da obra
  totalAdicionais: number   // centavos — soma dos adicionais
  totalGeral: number        // centavos — original + adicionais
  totalRecebido: number     // centavos — soma dos recebimentos do cliente
  saldoDevedor: number      // centavos — totalGeral - totalRecebido
}

/* ────────── Helpers ────────── */

function gapi() {
  return window.gapi!.client
}

function getToken() {
  return gapi().getToken()
}

/**
 * Parseia valor monetário BR ("R$ 1.000,00" ou "1.000,00") para centavos.
 */
function parseValorBR(valor: string): number {
  if (!valor) return 0
  const cleaned = valor.replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.')
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : Math.round(num * 100)
}

/* ────────── Criar Planilha ────────── */

/**
 * Cria uma planilha Google Sheets dentro da pasta da obra.
 * - Aba _CONFIG com metadados
 * - Aba RECEBIMENTOS para pagamentos do cliente
 * - Uma aba por funcionário (incluindo Marjorie)
 * Retorna o ID da planilha criada.
 */
export async function createObraSheet(
  folderId: string,
  obraNome: string,
  valorTotalObra: number,
  funcionarios: FuncionarioConfig[],
): Promise<string> {
  const token = getToken()
  if (!token) throw new Error('Sem token de autenticação')

  // 1. Criar planilha com abas
  const sheets = [
    { properties: { title: '_CONFIG' } },
    { properties: { title: 'RECEBIMENTOS' } },
    ...funcionarios.map((f) => ({
      properties: { title: f.nome },
    })),
  ]

  const createResponse = await fetch(
    'https://sheets.googleapis.com/v4/spreadsheets',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title: `Acompanhamento - ${obraNome}`,
        },
        sheets,
      }),
    },
  )

  if (!createResponse.ok) {
    throw new Error(`Erro ao criar planilha: ${createResponse.status}`)
  }

  const created = await createResponse.json()
  const spreadsheetId = created.spreadsheetId as string

  // 2. Mover para a pasta da obra no Drive
  await fetch(
    `https://www.googleapis.com/drive/v3/files/${spreadsheetId}?addParents=${folderId}&removeParents=root`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
      },
    },
  )

  // 3. Preencher aba _CONFIG
  const configValues = [
    ['VALOR_TOTAL_OBRA', String(valorTotalObra)],
    ...funcionarios.map((f) => [
      f.isMarjorie ? 'MARJORIE' : 'FUNCIONARIO',
      f.nome,
      String(f.valorEsperado),
    ]),
  ]

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/_CONFIG!A1?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: configValues }),
    },
  )

  // 4. Preencher cabeçalho da aba RECEBIMENTOS
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/RECEBIMENTOS!A1?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [['Data', 'Valor', 'Descrição', 'Link PDF']],
      }),
    },
  )

  // 5. Preencher cabeçalhos de cada aba de funcionário
  for (const f of funcionarios) {
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(f.nome)}!A1?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [['Data', 'Valor Pago', 'Descrição']],
        }),
      },
    )
  }

  return spreadsheetId
}

/* ────────── Garantir aba RECEBIMENTOS ────────── */

/**
 * Verifica se a aba RECEBIMENTOS existe. Se não, cria.
 * Necessário para planilhas criadas antes desta feature.
 */
export async function ensureRecebimentosTab(spreadsheetId: string): Promise<void> {
  const token = getToken()
  if (!token) throw new Error('Sem token de autenticação')

  // Buscar lista de abas
  const metaResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
    {
      headers: { Authorization: `Bearer ${token.access_token}` },
    },
  )

  if (!metaResponse.ok) throw new Error(`Erro ao ler metadados: ${metaResponse.status}`)

  const meta = await metaResponse.json()
  const tabs = (meta.sheets ?? []) as Array<{ properties: { title: string } }>
  const hasRecebimentos = tabs.some((t) => t.properties.title === 'RECEBIMENTOS')

  if (hasRecebimentos) return

  // Criar aba RECEBIMENTOS
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            addSheet: {
              properties: { title: 'RECEBIMENTOS' },
            },
          },
        ],
      }),
    },
  )

  // Preencher cabeçalho
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/RECEBIMENTOS!A1?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [['Data', 'Valor', 'Descrição', 'Link PDF']],
      }),
    },
  )
}

/* ────────── Ler Configuração ────────── */

/**
 * Lê a aba _CONFIG e retorna metadados da obra (incluindo adicionais).
 */
export async function readSheetConfig(spreadsheetId: string): Promise<ObraSheetConfig> {
  const token = getToken()
  if (!token) throw new Error('Sem token de autenticação')

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/_CONFIG!A1:D100`,
    {
      headers: { Authorization: `Bearer ${token.access_token}` },
    },
  )

  if (!response.ok) {
    throw new Error(`Erro ao ler config: ${response.status}`)
  }

  const data = await response.json()
  const rows = (data.values ?? []) as string[][]

  let valorTotalObra = 0
  const funcionarios: FuncionarioConfig[] = []
  const adicionais: AdicionalConfig[] = []

  for (const row of rows) {
    if (row[0] === 'VALOR_TOTAL_OBRA') {
      valorTotalObra = parseInt(row[1], 10) || 0
    } else if (row[0] === 'FUNCIONARIO') {
      funcionarios.push({
        nome: row[1],
        valorEsperado: parseInt(row[2], 10) || 0,
      })
    } else if (row[0] === 'MARJORIE') {
      funcionarios.push({
        nome: row[1],
        valorEsperado: parseInt(row[2], 10) || 0,
        isMarjorie: true,
      })
    } else if (row[0] === 'ADICIONAL') {
      adicionais.push({
        descricao: row[1] ?? '',
        valor: parseInt(row[2], 10) || 0,
        data: row[3] ?? '',
      })
    }
  }

  return { spreadsheetId, valorTotalObra, funcionarios, adicionais }
}

/* ────────── Adicionar Adicional ────────── */

/**
 * Adiciona um item adicional na aba _CONFIG.
 * Adicionais aumentam o valor total que o cliente deve.
 */
export async function addAdicional(
  spreadsheetId: string,
  descricao: string,
  valorCentavos: number,
  data: Date,
): Promise<void> {
  const token = getToken()
  if (!token) throw new Error('Sem token de autenticação')

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/_CONFIG!A:D:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [['ADICIONAL', descricao, String(valorCentavos), formatDateBR(data)]],
      }),
    },
  )

  if (!response.ok) {
    throw new Error(`Erro ao adicionar adicional: ${response.status}`)
  }
}

/* ────────── Recebimentos (pagamentos do cliente) ────────── */

/**
 * Lê os recebimentos (pagamentos do cliente) da aba RECEBIMENTOS.
 * Garante que a aba exista antes de ler.
 */
export async function readRecebimentos(spreadsheetId: string): Promise<RecebimentoRecord[]> {
  const token = getToken()
  if (!token) throw new Error('Sem token de autenticação')

  await ensureRecebimentosTab(spreadsheetId)

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/RECEBIMENTOS!A2:D500`,
    {
      headers: { Authorization: `Bearer ${token.access_token}` },
    },
  )

  if (!response.ok) return []

  const data = await response.json()
  const rows = (data.values ?? []) as string[][]

  return rows
    .filter((row) => row[0] || row[1])
    .map((row) => ({
      data: row[0] ?? '',
      valor: row[1] ?? '',
      valorCentavos: parseValorBR(row[1] ?? ''),
      descricao: row[2] ?? '',
      pdfLink: row[3] ?? '',
    }))
}

/**
 * Registra um recebimento (pagamento do cliente) na aba RECEBIMENTOS.
 * Chamado quando uma solicitação de pagamento é marcada como PAGA.
 * Valor = subtotal serviço (sem reembolso).
 */
export async function appendRecebimento(
  spreadsheetId: string,
  data: Date,
  valorCentavos: number,
  descricao: string,
  pdfLink: string,
): Promise<void> {
  const token = getToken()
  if (!token) throw new Error('Sem token de autenticação')

  await ensureRecebimentosTab(spreadsheetId)

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/RECEBIMENTOS!A:D:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [
          [formatDateBR(data), formatCurrency(valorCentavos), descricao || 'Solicitação de Pagamento', pdfLink],
        ],
      }),
    },
  )

  if (!response.ok) {
    throw new Error(`Erro ao registrar recebimento: ${response.status}`)
  }
}

/* ────────── Resumo Financeiro da Obra ────────── */

/**
 * Calcula o resumo financeiro completo da obra:
 * Valor original + adicionais = total geral - recebimentos = saldo devedor
 */
export async function readObraFinancialSummary(
  spreadsheetId: string,
): Promise<ObraFinancialSummary> {
  const config = await readSheetConfig(spreadsheetId)
  const recebimentos = await readRecebimentos(spreadsheetId)

  const valorOriginal = config.valorTotalObra
  const totalAdicionais = config.adicionais.reduce((acc, a) => acc + a.valor, 0)
  const totalGeral = valorOriginal + totalAdicionais
  const totalRecebido = recebimentos.reduce((acc, r) => acc + r.valorCentavos, 0)
  const saldoDevedor = totalGeral - totalRecebido

  return { valorOriginal, totalAdicionais, totalGeral, totalRecebido, saldoDevedor }
}

/* ────────── Ler Histórico de Pagamentos ────────── */

/**
 * Lê o histórico de pagamentos de uma aba (funcionário).
 * Pula a primeira linha (cabeçalho).
 */
export async function readPaymentHistory(
  spreadsheetId: string,
  tabName: string,
): Promise<PaymentRecord[]> {
  const token = getToken()
  if (!token) throw new Error('Sem token de autenticação')

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabName)}!A2:C500`,
    {
      headers: { Authorization: `Bearer ${token.access_token}` },
    },
  )

  if (!response.ok) return []

  const data = await response.json()
  const rows = (data.values ?? []) as string[][]

  return rows
    .filter((row) => row[0] || row[1])
    .map((row) => ({
      data: row[0] ?? '',
      valor: row[1] ?? '',
      valorCentavos: parseValorBR(row[1] ?? ''),
      descricao: row[2] ?? '',
    }))
}

/* ────────── Registrar Pagamento de Funcionário ────────── */

/**
 * Adiciona uma linha de pagamento na aba do funcionário.
 */
export async function appendPayment(
  spreadsheetId: string,
  tabName: string,
  data: Date,
  valorCentavos: number,
  descricao: string,
): Promise<void> {
  const token = getToken()
  if (!token) throw new Error('Sem token de autenticação')

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabName)}!A:C:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [
          [formatDateBR(data), formatCurrency(valorCentavos), descricao],
        ],
      }),
    },
  )

  if (!response.ok) {
    throw new Error(`Erro ao registrar pagamento: ${response.status}`)
  }
}

/* ────────── Resumo de Todos os Funcionários ────────── */

/**
 * Lê config + totais pagos de todas as abas.
 * Retorna um resumo por funcionário para exibir nos cards.
 */
export async function readAllSummaries(
  spreadsheetId: string,
): Promise<{ config: ObraSheetConfig; summaries: FuncionarioSummary[] }> {
  const config = await readSheetConfig(spreadsheetId)

  const summaries: FuncionarioSummary[] = []

  for (const func of config.funcionarios) {
    const history = await readPaymentHistory(spreadsheetId, func.nome)
    const totalPago = history.reduce((acc, p) => acc + p.valorCentavos, 0)

    summaries.push({
      nome: func.nome,
      valorEsperado: func.valorEsperado,
      totalPago,
      saldoRestante: func.valorEsperado - totalPago,
      isMarjorie: func.isMarjorie ?? false,
    })
  }

  return { config, summaries }
}
