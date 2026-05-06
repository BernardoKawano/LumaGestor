/* ────────────────────────────────────────────
   Google Sheets API — Acompanhamento de Obras
   Cria e gerencia planilha de obra com abas por funcionário.

   Estrutura da planilha:
   - Aba "_CONFIG": metadados (valor total, funcionários, ADICIONAL = extras que somam no total da obra)
   - Aba "RECEBIMENTOS": pagamentos recebidos do cliente
   - Aba por funcionário: Data | Valor Pago | Descrição
   ──────────────────────────────────────────── */

import { format } from 'date-fns'
import { formatDateBR } from '../utils/date'
import { formatCurrency } from '../utils/currency'
import {
  buildAcrescimoHistoricoDescricao,
  novoValorEsperadoComAcrescimo,
  parseIncrementoCentavosAcrescimoHistorico,
} from '../utils/funcionarioAcrescimo'
import { totaisResumoObraCliente } from '../utils/obraFinancialTotals'

/* ────────── Tipos ────────── */

export interface FuncionarioConfig {
  nome: string
  valorEsperado: number  // centavos
  isMarjorie?: boolean
  sheetRow?: number      // linha na planilha (1-based), para update
}

export interface AdicionalConfig {
  descricao: string
  valor: number    // centavos
  data: string     // "DD/MM/YYYY"
  sheetRow?: number // linha na planilha (1-based), preenchido internamente
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
  sheetRow?: number  // linha na planilha (1-based), preenchido internamente
}

export interface RecebimentoRecord {
  data: string          // "DD/MM/YYYY"
  valor: string         // "R$ 1.000,00"
  valorCentavos: number
  descricao: string
  pdfLink: string
  sheetRow: number      // linha na planilha (1-based, para update/delete)
}

export interface FuncionarioSummary {
  nome: string
  valorEsperado: number   // centavos
  totalPago: number        // centavos
  saldoRestante: number    // centavos
  isMarjorie: boolean
  sheetRow?: number        // linha na _CONFIG (1-based), para update
}

export interface ObraFinancialSummary {
  valorOriginal: number     // centavos — VALOR_TOTAL_OBRA (_CONFIG)
  totalAdicionais: number   // centavos — soma das linhas ADICIONAL (extras da obra)
  totalGeral: number        // centavos — valorOriginal + totalAdicionais (total a receber do cliente)
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

type SheetMeta = {
  properties?: {
    sheetId?: number
    title?: string
    gridProperties?: {
      columnCount?: number
    }
  }
}

const styledSpreadsheets = new Set<string>()

function getHeaderStyleByTab(tabName: string) {
  if (tabName === 'RECEBIMENTOS') {
    return { red: 0.11, green: 0.46, blue: 0.30 } // verde Google-like
  }
  if (tabName === '_CONFIG') {
    return { red: 0.36, green: 0.40, blue: 0.47 } // cinza azulado
  }
  if (tabName === 'RESUMO') {
    return { red: 0.26, green: 0.20, blue: 0.48 } // lilás - aba de visualização para cliente
  }
  return { red: 0.10, green: 0.36, blue: 0.64 } // azul para funcionários
}

async function applyObraSheetFormatting(spreadsheetId: string): Promise<void> {
  if (styledSpreadsheets.has(spreadsheetId)) return

  const token = getToken()
  if (!token) throw new Error('Sem token de autenticação')

  const metaResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
    {
      headers: { Authorization: `Bearer ${token.access_token}` },
    },
  )

  if (!metaResponse.ok) {
    throw new Error(`Erro ao ler metadados para formatação: ${metaResponse.status}`)
  }

  const meta = await metaResponse.json()
  const sheets = (meta.sheets ?? []) as SheetMeta[]

  const requests: unknown[] = []

  for (const sheet of sheets) {
    const sheetId = sheet.properties?.sheetId
    const title = sheet.properties?.title ?? ''
    if (sheetId == null || !title) continue

    const isRecebimentos = title === 'RECEBIMENTOS'
    const isConfig = title === '_CONFIG'
    const isResumo = title === 'RESUMO'
    const targetColumns = isRecebimentos || isConfig || isResumo ? 4 : 3
    const maxColumns = Math.max(sheet.properties?.gridProperties?.columnCount ?? targetColumns, targetColumns)
    const headerColor = getHeaderStyleByTab(title)

    requests.push({
      updateSheetProperties: {
        properties: {
          sheetId,
          gridProperties: {
            frozenRowCount: 1,
          },
        },
        fields: 'gridProperties.frozenRowCount',
      },
    })

    // Cabeçalho: cor sólida, texto branco, bold — hierarquia visual forte
    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: maxColumns,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: headerColor,
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
            textFormat: {
              bold: true,
              fontSize: 11,
              foregroundColor: { red: 1, green: 1, blue: 1 },
            },
          },
        },
        fields:
          'userEnteredFormat(backgroundColor,textFormat.bold,textFormat.fontSize,textFormat.foregroundColor,horizontalAlignment,verticalAlignment)',
      },
    })

    // Dados: fundo claro (mais claro que o título) — contraste e legibilidade (princípio UX)
    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: 1000,
          startColumnIndex: 0,
          endColumnIndex: maxColumns,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.98, green: 0.98, blue: 0.99 },
            textFormat: {
              fontSize: 10,
              foregroundColor: { red: 0.2, green: 0.2, blue: 0.2 },
            },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat.fontSize,textFormat.foregroundColor)',
      },
    })

    // Bordas em todas as células — estrutura clara e escaneabilidade
    const borderColor = { red: 0.75, green: 0.78, blue: 0.82 }
    requests.push({
      updateBorders: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1000,
          startColumnIndex: 0,
          endColumnIndex: maxColumns,
        },
        top: { style: 'SOLID', width: 1, color: borderColor },
        bottom: { style: 'SOLID', width: 1, color: borderColor },
        left: { style: 'SOLID', width: 1, color: borderColor },
        right: { style: 'SOLID', width: 1, color: borderColor },
        innerHorizontal: { style: 'SOLID', width: 1, color: borderColor },
        innerVertical: { style: 'SOLID', width: 1, color: borderColor },
      },
    })

    requests.push({
      autoResizeDimensions: {
        dimensions: {
          sheetId,
          dimension: 'COLUMNS',
          startIndex: 0,
          endIndex: maxColumns,
        },
      },
    })
  }

  if (requests.length === 0) return

  const formatResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    },
  )

  if (!formatResponse.ok) {
    throw new Error(`Erro ao aplicar formatação: ${formatResponse.status}`)
  }

  styledSpreadsheets.add(spreadsheetId)
}

/**
 * Ação manual para reaplicar estilo visual da planilha,
 * mantendo todos os valores existentes.
 */
export async function formatObraSheetVisual(spreadsheetId: string): Promise<void> {
  styledSpreadsheets.delete(spreadsheetId)
  await applyObraSheetFormatting(spreadsheetId)
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
    { properties: { title: 'RESUMO' } },
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

  // 6. Aplicar identidade visual sem alterar os valores já salvos
  await applyObraSheetFormatting(spreadsheetId)

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

  // Mantém a aba recém-criada no mesmo padrão visual das demais
  await applyObraSheetFormatting(spreadsheetId)
}

/* ────────── Aba RESUMO (visualização para cliente/Marjorie) ────────── */

/** Dados necessários para preencher a aba RESUMO na planilha. */
export interface ResumoSheetData {
  obraNome: string
  financial: ObraFinancialSummary | null
  recebimentos: RecebimentoRecord[]
  rascunhosRecebimento?: unknown[]  // omitido ao escrever na planilha (usado só no ResumoObra/PNG)
  config: ObraSheetConfig | null
  summaries: FuncionarioSummary[]
  pagamentosPorFuncionario: Record<string, PaymentRecord[]>
}

/**
 * Garante que a aba RESUMO existe na planilha.
 * Cria a aba se não existir (para planilhas antigas).
 */
export async function ensureResumoTab(spreadsheetId: string): Promise<void> {
  const token = getToken()
  if (!token) throw new Error('Sem token de autenticação')

  const metaResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
    {
      headers: { Authorization: `Bearer ${token.access_token}` },
    },
  )

  if (!metaResponse.ok) throw new Error(`Erro ao ler metadados: ${metaResponse.status}`)

  const meta = await metaResponse.json()
  const tabs = (meta.sheets ?? []) as Array<{ properties: { title: string } }>
  const hasResumo = tabs.some((t) => t.properties.title === 'RESUMO')

  if (hasResumo) return

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
              properties: {
                title: 'RESUMO',
                index: 1, // logo após _CONFIG, antes de RECEBIMENTOS
              },
            },
          },
        ],
      }),
    },
  )

  styledSpreadsheets.delete(spreadsheetId)
  await applyObraSheetFormatting(spreadsheetId)
}

interface ColaboradorBlock {
  headerRow: number   // nome + Total pago
  subHeaderRow: number // Data, Valor, Descrição
  dataEndRow: number   // fim das linhas de dados
}

interface ResumoLayout {
  titleRow: number
  metricsHeaderRow: number   // -1 se não houver
  metricsDataRow: number     // -1 se não houver
  recebimentosSectionRow: number
  recebimentosHeaderRow: number
  recebimentosDataEndRow: number
  adicionaisSectionRow: number
  adicionaisHeaderRow: number
  adicionaisDataEndRow: number
  funcionariosSectionRow: number
  funcionariosHeaderRow: number
  funcionariosDataEndRow: number
  pagamentosSectionRow: number
  pagamentosPorColaborador: ColaboradorBlock[]
  totalRows: number
}

/**
 * Aplica formatação visual por seção na aba RESUMO.
 * Títulos coloridos por bloco, células de dados mais claras (princípio UX).
 */
async function applyResumoSheetFormatting(
  spreadsheetId: string,
  layout: ResumoLayout,
  maxCols: number,
): Promise<void> {
  const token = getToken()
  if (!token) throw new Error('Sem token de autenticação')

  const metaResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(sheetId,title))`,
    { headers: { Authorization: `Bearer ${token.access_token}` } },
  )
  if (!metaResponse.ok) return

  const meta = await metaResponse.json()
  const resumoSheet = (meta.sheets ?? []).find((s: { properties: { title: string } }) => s.properties?.title === 'RESUMO')
  const sheetId = resumoSheet?.properties?.sheetId
  if (sheetId == null) return

  const r = (row: number) => ({ sheetId, startRowIndex: row, endRowIndex: row + 1, startColumnIndex: 0, endColumnIndex: maxCols })
  const requests: unknown[] = []

  // Título principal — roxo escuro, texto branco
  requests.push({
    repeatCell: {
      range: r(layout.titleRow),
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 0.26, green: 0.20, blue: 0.48 },
          textFormat: { bold: true, fontSize: 14, foregroundColor: { red: 1, green: 1, blue: 1 } },
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat)',
    },
  })

  // Métricas financeiras — azul, texto branco (só se houver dados)
  if (layout.metricsHeaderRow >= 0 && layout.metricsDataRow >= 0) {
    requests.push({
      repeatCell: {
        range: r(layout.metricsHeaderRow),
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.10, green: 0.36, blue: 0.64 },
            textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat)',
      },
    })
    requests.push({
      repeatCell: {
        range: r(layout.metricsDataRow),
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.92, green: 0.95, blue: 1 },
          },
        },
        fields: 'userEnteredFormat.backgroundColor',
      },
    })
  }

  // RECEBIMENTOS — amarelo/âmbar
  requests.push({
    repeatCell: {
      range: r(layout.recebimentosSectionRow),
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 0.98, green: 0.85, blue: 0.45 },
          textFormat: { bold: true, foregroundColor: { red: 0.2, green: 0.15, blue: 0.1 } },
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat)',
    },
  })
  requests.push({
    repeatCell: {
      range: r(layout.recebimentosHeaderRow),
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 1, green: 0.95, blue: 0.70 },
          textFormat: { bold: true, foregroundColor: { red: 0.2, green: 0.15, blue: 0.1 } },
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat)',
    },
  })
  if (layout.recebimentosHeaderRow + 1 < layout.recebimentosDataEndRow) {
    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: layout.recebimentosHeaderRow + 1,
          endRowIndex: layout.recebimentosDataEndRow,
          startColumnIndex: 0,
          endColumnIndex: maxCols,
        },
        cell: { userEnteredFormat: { backgroundColor: { red: 1, green: 1, blue: 1 } } },
        fields: 'userEnteredFormat.backgroundColor',
      },
    })
  }

  // ADICIONAIS — verde claro
  requests.push({
    repeatCell: {
      range: r(layout.adicionaisSectionRow),
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 0.55, green: 0.88, blue: 0.55 },
          textFormat: { bold: true, foregroundColor: { red: 0.1, green: 0.35, blue: 0.1 } },
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat)',
    },
  })
  requests.push({
    repeatCell: {
      range: r(layout.adicionaisHeaderRow),
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 0.85, green: 0.95, blue: 0.85 },
          textFormat: { bold: true, foregroundColor: { red: 0.1, green: 0.35, blue: 0.1 } },
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat)',
    },
  })
  if (layout.adicionaisHeaderRow + 1 < layout.adicionaisDataEndRow) {
    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: layout.adicionaisHeaderRow + 1,
          endRowIndex: layout.adicionaisDataEndRow,
          startColumnIndex: 0,
          endColumnIndex: maxCols,
        },
        cell: { userEnteredFormat: { backgroundColor: { red: 1, green: 1, blue: 1 } } },
        fields: 'userEnteredFormat.backgroundColor',
      },
    })
  }

  // FUNCIONÁRIOS — rosa/salmão
  requests.push({
    repeatCell: {
      range: r(layout.funcionariosSectionRow),
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 0.98, green: 0.75, blue: 0.78 },
          textFormat: { bold: true, foregroundColor: { red: 0.4, green: 0.15, blue: 0.2 } },
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat)',
    },
  })
  requests.push({
    repeatCell: {
      range: r(layout.funcionariosHeaderRow),
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 1, green: 0.90, blue: 0.92 },
          textFormat: { bold: true, foregroundColor: { red: 0.4, green: 0.15, blue: 0.2 } },
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat)',
    },
  })
  if (layout.funcionariosHeaderRow + 1 < layout.funcionariosDataEndRow) {
    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: layout.funcionariosHeaderRow + 1,
          endRowIndex: layout.funcionariosDataEndRow,
          startColumnIndex: 0,
          endColumnIndex: maxCols,
        },
        cell: { userEnteredFormat: { backgroundColor: { red: 1, green: 1, blue: 1 } } },
        fields: 'userEnteredFormat.backgroundColor',
      },
    })
  }

  // PAGAMENTOS POR COLABORADOR — título principal cinza azulado
  requests.push({
    repeatCell: {
      range: r(layout.pagamentosSectionRow),
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 0.45, green: 0.55, blue: 0.65 },
          textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat)',
    },
  })

  // Base: fundo claro para todo o bloco (separadores, "Nenhum funcionário")
  if (layout.pagamentosSectionRow + 1 < layout.totalRows) {
    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: layout.pagamentosSectionRow + 1,
          endRowIndex: layout.totalRows,
          startColumnIndex: 0,
          endColumnIndex: maxCols,
        },
        cell: { userEnteredFormat: { backgroundColor: { red: 0.98, green: 0.98, blue: 0.99 } } },
        fields: 'userEnteredFormat.backgroundColor',
      },
    })
  }

  // Por colaborador — header (nome + total) e subheader (Data, Valor, Descrição) azul claro; dados brancos
  const azulClaro = { red: 0.85, green: 0.92, blue: 1 }
  const azulClaroHeader = { red: 0.75, green: 0.85, blue: 0.98 }
  for (const block of layout.pagamentosPorColaborador) {
    requests.push({
      repeatCell: {
        range: r(block.headerRow),
        cell: {
          userEnteredFormat: {
            backgroundColor: azulClaroHeader,
            textFormat: { bold: true, foregroundColor: { red: 0.1, green: 0.25, blue: 0.5 } },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat)',
      },
    })
    requests.push({
      repeatCell: {
        range: r(block.subHeaderRow),
        cell: {
          userEnteredFormat: {
            backgroundColor: azulClaro,
            textFormat: { bold: true, foregroundColor: { red: 0.1, green: 0.25, blue: 0.5 } },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat)',
      },
    })
    if (block.subHeaderRow + 1 < block.dataEndRow) {
      requests.push({
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: block.subHeaderRow + 1,
            endRowIndex: block.dataEndRow,
            startColumnIndex: 0,
            endColumnIndex: maxCols,
          },
          cell: { userEnteredFormat: { backgroundColor: { red: 1, green: 1, blue: 1 } } },
          fields: 'userEnteredFormat.backgroundColor',
        },
      })
    }
  }

  // Bordas em todas as células
  const borderColor = { red: 0.75, green: 0.78, blue: 0.82 }
  requests.push({
    updateBorders: {
      range: { sheetId, startRowIndex: 0, endRowIndex: layout.totalRows, startColumnIndex: 0, endColumnIndex: maxCols },
      top: { style: 'SOLID', width: 1, color: borderColor },
      bottom: { style: 'SOLID', width: 1, color: borderColor },
      left: { style: 'SOLID', width: 1, color: borderColor },
      right: { style: 'SOLID', width: 1, color: borderColor },
      innerHorizontal: { style: 'SOLID', width: 1, color: borderColor },
      innerVertical: { style: 'SOLID', width: 1, color: borderColor },
    },
  })

  const formatRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  })
  if (!formatRes.ok) {
    console.warn('Erro ao aplicar formatação visual da aba RESUMO:', formatRes.status)
  }
}

/**
 * Escreve os dados do resumo na aba RESUMO da planilha.
 * Aplica formatação visual por seção (cores, bordas) como no design.
 */
export async function writeResumoToSheet(
  spreadsheetId: string,
  data: ResumoSheetData,
): Promise<void> {
  const token = getToken()
  if (!token) throw new Error('Sem token de autenticação')

  await ensureResumoTab(spreadsheetId)

  const adicionais = data.config?.adicionais ?? []
  const rows: string[][] = []
  let row = 0

  // Título e data
  rows.push([`Resumo — ${data.obraNome}`])
  const titleRow = row++
  rows.push([`Atualizado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`])
  row++
  rows.push([])
  row++

  // Métricas
  let metricsHeaderRow = -1
  let metricsDataRow = -1
  if (data.financial) {
    const f = data.financial
    rows.push(['Valor original', 'Adicionais obra', 'Total geral', 'Saldo devedor'])
    metricsHeaderRow = row++
    rows.push([
      formatCurrency(f.valorOriginal),
      formatCurrency(f.totalAdicionais),
      formatCurrency(f.totalGeral),
      formatCurrency(f.saldoDevedor),
    ])
    metricsDataRow = row++
    rows.push([])
    row++
  }

  // Recebimentos
  rows.push(['RECEBIMENTOS'])
  const recebimentosSectionRow = row++
  rows.push(['Data', 'Valor', 'Descrição'])
  const recebimentosHeaderRow = row++
  if (data.recebimentos.length === 0) {
    rows.push(['Nenhum recebimento'])
    row++
  } else {
    for (const r of data.recebimentos) {
      rows.push([r.data, r.valor, r.descricao])
      row++
    }
    const totalRec = data.recebimentos.reduce((a, r) => a + r.valorCentavos, 0)
    rows.push(['Total', formatCurrency(totalRec), ''])
    row++
  }
  const recebimentosDataEndRow = row
  rows.push([])
  row++

  // Adicionais da obra (_CONFIG, tipo ADICIONAL)
  rows.push(['ADICIONAIS DA OBRA'])
  const adicionaisSectionRow = row++
  rows.push(['Descrição', 'Valor', 'Data'])
  const adicionaisHeaderRow = row++
  if (adicionais.length === 0) {
    rows.push(['Nenhum adicional'])
    row++
  } else {
    for (const a of adicionais) {
      rows.push([a.descricao, `+ ${formatCurrency(a.valor)}`, a.data])
      row++
    }
    const totalAdd = adicionais.reduce((s, a) => s + a.valor, 0)
    rows.push(['Total', `+ ${formatCurrency(totalAdd)}`, ''])
    row++
  }
  const adicionaisDataEndRow = row
  rows.push([])
  row++

  // Funcionários
  rows.push(['FUNCIONÁRIOS'])
  const funcionariosSectionRow = row++
  rows.push(['Nome', 'Pago', 'Esperado', 'Status'])
  const funcionariosHeaderRow = row++
  if (data.summaries.length === 0) {
    rows.push(['Nenhum funcionário'])
    row++
  } else {
    for (const s of data.summaries) {
      const status =
        s.saldoRestante < 0
          ? `Excedido ${formatCurrency(Math.abs(s.saldoRestante))}`
          : s.saldoRestante === 0
            ? 'Quitado'
            : `Restante: ${formatCurrency(s.saldoRestante)}`
      rows.push([
        s.nome,
        formatCurrency(s.totalPago),
        formatCurrency(s.valorEsperado),
        status,
      ])
      row++
    }
  }
  const funcionariosDataEndRow = row
  rows.push([])
  row++

  // Pagamentos por colaborador
  rows.push(['PAGAMENTOS POR COLABORADOR'])
  const pagamentosSectionRow = row++
  const pagamentosPorColaborador: ColaboradorBlock[] = []
  if (data.summaries.length === 0) {
    rows.push(['Nenhum funcionário'])
    row++
  } else {
    for (const s of data.summaries) {
      const pagamentos = data.pagamentosPorFuncionario[s.nome] ?? []
      const totalPago = pagamentos.reduce((acc, p) => acc + p.valorCentavos, 0)
      rows.push([s.nome, `Total pago: ${formatCurrency(totalPago)}`, '', ''])
      const headerRow = row++
      rows.push(['Data', 'Valor', 'Descrição', ''])
      const subHeaderRow = row++
      if (pagamentos.length === 0) {
        rows.push(['Nenhum pagamento registrado', '', '', ''])
        row++
      } else {
        for (const p of pagamentos) {
          rows.push([p.data, p.valor, p.descricao || '-', ''])
          row++
        }
      }
      pagamentosPorColaborador.push({ headerRow, subHeaderRow, dataEndRow: row })
      rows.push([])
      row++
    }
  }
  const totalRows = row

  const maxCols = Math.max(...rows.map((r) => r.length), 4)
  const values = rows.map((r) => {
    const rowData: string[] = [...r]
    while (rowData.length < maxCols) rowData.push('')
    return rowData
  })

  const range = `RESUMO!A1`
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: `RESUMO!A1`,
        majorDimension: 'ROWS',
        values,
      }),
    },
  )

  if (!response.ok) {
    throw new Error(`Erro ao escrever resumo: ${response.status}`)
  }

  await applyResumoSheetFormatting(spreadsheetId, {
    titleRow,
    metricsHeaderRow,
    metricsDataRow,
    recebimentosSectionRow,
    recebimentosHeaderRow,
    recebimentosDataEndRow,
    adicionaisSectionRow,
    adicionaisHeaderRow,
    adicionaisDataEndRow,
    funcionariosSectionRow,
    funcionariosHeaderRow,
    funcionariosDataEndRow,
    pagamentosSectionRow,
    pagamentosPorColaborador,
    totalRows,
  }, maxCols)
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

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (row[0] === 'VALOR_TOTAL_OBRA') {
      valorTotalObra = parseInt(row[1], 10) || 0
    } else if (row[0] === 'FUNCIONARIO') {
      funcionarios.push({
        nome: row[1],
        valorEsperado: parseInt(row[2], 10) || 0,
        sheetRow: i + 1,
      })
    } else if (row[0] === 'MARJORIE') {
      funcionarios.push({
        nome: row[1],
        valorEsperado: parseInt(row[2], 10) || 0,
        isMarjorie: true,
        sheetRow: i + 1,
      })
    } else if (row[0] === 'ADICIONAL') {
      adicionais.push({
        descricao: row[1] ?? '',
        valor: parseInt(row[2], 10) || 0,
        data: row[3] ?? '',
        sheetRow: i + 1,
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

/**
 * Atualiza um adicional existente na aba _CONFIG.
 * @param sheetRow Linha na planilha (1-based), obtido de AdicionalConfig.sheetRow
 */
export async function updateAdicional(
  spreadsheetId: string,
  sheetRow: number,
  descricao: string,
  valorCentavos: number,
  data: string,
): Promise<void> {
  const token = getToken()
  if (!token) throw new Error('Sem token de autenticação')

  const range = `_CONFIG!A${sheetRow}:D${sheetRow}`

  const updateResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [['ADICIONAL', descricao, String(valorCentavos), data]],
      }),
    },
  )

  if (!updateResponse.ok) {
    throw new Error(`Erro ao atualizar adicional: ${updateResponse.status}`)
  }
}

/**
 * Atualiza o valor esperado de um funcionário na aba _CONFIG.
 * Útil quando um adicional da obra é destinado a um funcionário específico.
 * @param sheetRow Linha na _CONFIG (1-based), obtido de FuncionarioConfig.sheetRow
 */
export async function updateFuncionarioValorEsperado(
  spreadsheetId: string,
  sheetRow: number,
  valorCentavos: number,
): Promise<void> {
  const token = getToken()
  if (!token) throw new Error('Sem token de autenticação')

  const range = `_CONFIG!C${sheetRow}`

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [[String(valorCentavos)]],
      }),
    },
  )

  if (!response.ok) {
    throw new Error(`Erro ao atualizar valor esperado: ${response.status}`)
  }
}

/**
 * Aumenta o total a receber do colaborador (ex.: serviço extra acordado com o proprietário)
 * e grava uma linha de histórico na aba do funcionário com valor R$ 0 (apenas registro).
 */
export async function registrarAcrescimoValorEsperadoFuncionario(
  spreadsheetId: string,
  tabNameFuncionario: string,
  configSheetRow: number,
  valorEsperadoAtualCentavos: number,
  incrementoCentavos: number,
  motivo: string,
): Promise<void> {
  const novo = novoValorEsperadoComAcrescimo(valorEsperadoAtualCentavos, incrementoCentavos)
  await updateFuncionarioValorEsperado(spreadsheetId, configSheetRow, novo)
  const descricao = buildAcrescimoHistoricoDescricao(incrementoCentavos, motivo)
  await appendPayment(spreadsheetId, tabNameFuncionario, new Date(), 0, descricao)
}

/**
 * Remove a linha de histórico de acréscimo e reduz o valor esperado do colaborador.
 */
export async function deleteAcrescimoHistoricoFuncionario(
  spreadsheetId: string,
  tabNameFuncionario: string,
  paymentSheetRow: number,
  configSheetRow: number,
  valorEsperadoAtualCentavos: number,
  descricaoLinha: string,
): Promise<void> {
  const inc = parseIncrementoCentavosAcrescimoHistorico(descricaoLinha)
  if (inc == null || inc <= 0) {
    throw new Error('Não foi possível interpretar o acréscimo desta linha')
  }
  const novoEsperado = Math.max(0, valorEsperadoAtualCentavos - inc)
  await updateFuncionarioValorEsperado(spreadsheetId, configSheetRow, novoEsperado)
  await deletePayment(spreadsheetId, tabNameFuncionario, paymentSheetRow)
}

/**
 * Atualiza data / valor (incremento) / motivo de uma linha de acréscimo e ajusta o valor esperado.
 */
export async function updateAcrescimoHistoricoFuncionario(
  spreadsheetId: string,
  tabNameFuncionario: string,
  paymentSheetRow: number,
  configSheetRow: number,
  valorEsperadoAtualCentavos: number,
  descricaoAnterior: string,
  data: Date,
  novoIncrementoCentavos: number,
  novoMotivo: string,
): Promise<void> {
  if (novoIncrementoCentavos <= 0) throw new Error('O acréscimo deve ser maior que zero')
  const velho = parseIncrementoCentavosAcrescimoHistorico(descricaoAnterior)
  if (velho == null || velho <= 0) {
    throw new Error('Não foi possível interpretar o acréscimo anterior desta linha')
  }
  const novoEsperado = valorEsperadoAtualCentavos - velho + novoIncrementoCentavos
  if (novoEsperado < 0) throw new Error('Valor esperado ficaria negativo; ajuste o valor do acréscimo')
  await updateFuncionarioValorEsperado(spreadsheetId, configSheetRow, novoEsperado)
  const descricao = buildAcrescimoHistoricoDescricao(novoIncrementoCentavos, novoMotivo)
  await updatePayment(spreadsheetId, tabNameFuncionario, paymentSheetRow, data, 0, descricao)
}

/**
 * Adiciona um funcionário à planilha existente.
 * Cria nova aba com o nome do funcionário e insere linha na _CONFIG.
 * @param nome Nome do funcionário (também será o título da aba)
 * @param valorEsperado Centavos
 */
export async function addFuncionario(
  spreadsheetId: string,
  nome: string,
  valorEsperadoCentavos: number,
): Promise<void> {
  const token = getToken()
  if (!token) throw new Error('Sem token de autenticação')

  const trimmedNome = nome.trim()
  if (!trimmedNome) throw new Error('Nome do funcionário é obrigatório')
  if (valorEsperadoCentavos <= 0) throw new Error('Valor esperado deve ser maior que zero')

  // Verificar se aba com mesmo nome já existe
  const metaResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
    { headers: { Authorization: `Bearer ${token.access_token}` } },
  )
  if (!metaResponse.ok) throw new Error(`Erro ao ler planilha: ${metaResponse.status}`)
  const meta = await metaResponse.json()
  const tabs = (meta.sheets ?? []) as Array<{ properties: { title: string } }>
  if (tabs.some((t) => t.properties.title === trimmedNome)) {
    throw new Error(`Já existe um funcionário ou aba com o nome "${trimmedNome}"`)
  }

  // 1. Criar nova aba
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [{ addSheet: { properties: { title: trimmedNome } } }],
      }),
    },
  )

  // 2. Preencher cabeçalho da aba do funcionário
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(trimmedNome)}!A1?valueInputOption=RAW`,
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

  // 3. Adicionar linha na _CONFIG
  const configResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/_CONFIG!A:D:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [['FUNCIONARIO', trimmedNome, String(valorEsperadoCentavos)]],
      }),
    },
  )
  if (!configResponse.ok) {
    throw new Error(`Erro ao adicionar funcionário na configuração: ${configResponse.status}`)
  }

  await applyObraSheetFormatting(spreadsheetId)
}

/**
 * Remove um adicional da aba _CONFIG (limpa a linha).
 * @param sheetRow Linha na planilha (1-based), obtido de AdicionalConfig.sheetRow
 */
export async function deleteAdicional(
  spreadsheetId: string,
  sheetRow: number,
): Promise<void> {
  const token = getToken()
  if (!token) throw new Error('Sem token de autenticação')

  const range = `_CONFIG!A${sheetRow}:D${sheetRow}`

  const updateResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [['', '', '', '']] }),
    },
  )

  if (!updateResponse.ok) {
    throw new Error(`Erro ao remover adicional: ${updateResponse.status}`)
  }
}

/* ────────── Recebimentos (pagamentos do cliente) ────────── */

const RASCUNHO_PREFIX = '[RASCUNHO] '

/** Rascunho de recebimento persistido na planilha (prefixo [RASCUNHO] na descrição) */
export interface RascunhoRecebimentoSheet {
  id: string        // sheet-{sheetRow} para compatibilidade
  data: string      // YYYY-MM-DD
  valorCentavos: number
  descricao: string
  sheetRow: number
}

export interface RecebimentosData {
  recebimentos: RecebimentoRecord[]
  rascunhos: RascunhoRecebimentoSheet[]
}

/**
 * Lê recebimentos e rascunhos da aba RECEBIMENTOS.
 * Rascunhos têm prefixo [RASCUNHO] na descrição (mesma estrutura A:D).
 */
export async function readRecebimentos(spreadsheetId: string): Promise<RecebimentoRecord[]> {
  const { recebimentos } = await readRecebimentosComRascunhos(spreadsheetId)
  return recebimentos
}

/**
 * Lê recebimentos e rascunhos da aba RECEBIMENTOS.
 * Rascunhos têm prefixo [RASCUNHO] na descrição — mesma estrutura A:D.
 */
export async function readRecebimentosComRascunhos(spreadsheetId: string): Promise<RecebimentosData> {
  const token = getToken()
  if (!token) throw new Error('Sem token de autenticação')

  await ensureRecebimentosTab(spreadsheetId)

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/RECEBIMENTOS!A2:E500`,
    {
      headers: { Authorization: `Bearer ${token.access_token}` },
    },
  )

  if (!response.ok) return { recebimentos: [], rascunhos: [] }

  const data = await response.json()
  const rows = (data.values ?? []) as string[][]

  const recebimentos: RecebimentoRecord[] = []
  const rascunhos: RascunhoRecebimentoSheet[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row?.[0] && !row?.[1]) continue

    const sheetRow = 2 + i
    const descricao = (row[2] ?? '').trim()
    const colETipo = (row[4] ?? '').toString().toLowerCase().trim()
    const isRascunho =
      descricao.startsWith(RASCUNHO_PREFIX) || colETipo === 'rascunho'

    if (isRascunho) {
      const dataStr = row[0] ?? ''
      const dataISO = /^\d{2}\/\d{2}\/\d{4}$/.test(dataStr)
        ? `${dataStr.slice(6, 10)}-${dataStr.slice(3, 5)}-${dataStr.slice(0, 2)}`
        : dataStr
      const descSemPrefixo = descricao.startsWith(RASCUNHO_PREFIX)
        ? descricao.slice(RASCUNHO_PREFIX.length).trim()
        : descricao
      rascunhos.push({
        id: `sheet-${sheetRow}`,
        data: dataISO,
        valorCentavos: parseValorBR(row[1] ?? ''),
        descricao: descSemPrefixo || 'Rascunho',
        sheetRow,
      })
    } else {
      recebimentos.push({
        data: row[0] ?? '',
        valor: row[1] ?? '',
        valorCentavos: parseValorBR(row[1] ?? ''),
        descricao: row[2] ?? '',
        pdfLink: row[3] ?? '',
        sheetRow,
      })
    }
  }

  return { recebimentos, rascunhos }
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

/**
 * Adiciona um rascunho de recebimento na aba RECEBIMENTOS.
 * Mesma estrutura A:D dos recebimentos; prefixo [RASCUNHO] na descrição.
 */
export async function appendRascunhoRecebimento(
  spreadsheetId: string,
  data: Date,
  valorCentavos: number,
  descricao: string,
): Promise<void> {
  const token = getToken()
  if (!token) throw new Error('Sem token de autenticação')

  await ensureRecebimentosTab(spreadsheetId)

  const descricaoComTag = RASCUNHO_PREFIX + (descricao.trim() || 'Rascunho')

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/RECEBIMENTOS!A:D:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [[formatDateBR(data), formatCurrency(valorCentavos), descricaoComTag, '']],
      }),
    },
  )

  if (!response.ok) {
    throw new Error(`Erro ao registrar rascunho de recebimento: ${response.status}`)
  }
}

/**
 * Atualiza um rascunho de recebimento existente na aba RECEBIMENTOS.
 */
export async function updateRascunhoRecebimento(
  spreadsheetId: string,
  sheetRow: number,
  data: Date,
  valorCentavos: number,
  descricao: string,
): Promise<void> {
  const token = getToken()
  if (!token) throw new Error('Sem token de autenticação')

  await ensureRecebimentosTab(spreadsheetId)

  const descricaoComTag = RASCUNHO_PREFIX + (descricao.trim() || 'Rascunho')
  const range = `RECEBIMENTOS!A${sheetRow}:D${sheetRow}`

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [[formatDateBR(data), formatCurrency(valorCentavos), descricaoComTag, '']],
      }),
    },
  )

  if (!response.ok) {
    throw new Error(`Erro ao atualizar rascunho: ${response.status}`)
  }
}

/**
 * Confirma um rascunho (transforma em recebimento real) — remove tag e limpa coluna E se existir.
 */
export async function confirmarRascunhoRecebimento(
  spreadsheetId: string,
  sheetRow: number,
  data: Date,
  valorCentavos: number,
  descricao: string,
  pdfLink: string,
): Promise<void> {
  const token = getToken()
  if (!token) throw new Error('Sem token de autenticação')

  await ensureRecebimentosTab(spreadsheetId)

  const range = `RECEBIMENTOS!A${sheetRow}:E${sheetRow}`

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [[formatDateBR(data), formatCurrency(valorCentavos), descricao || '', pdfLink || '', '']],
      }),
    },
  )

  if (!response.ok) {
    throw new Error(`Erro ao confirmar rascunho: ${response.status}`)
  }
}

/**
 * Atualiza um recebimento existente na aba RECEBIMENTOS.
 * @param sheetRow Linha na planilha (1-based), obtido de RecebimentoRecord.sheetRow
 */
export async function updateRecebimento(
  spreadsheetId: string,
  sheetRow: number,
  data: Date,
  valorCentavos: number,
  descricao: string,
  pdfLink: string,
): Promise<void> {
  const token = getToken()
  if (!token) throw new Error('Sem token de autenticação')

  await ensureRecebimentosTab(spreadsheetId)

  const range = `RECEBIMENTOS!A${sheetRow}:D${sheetRow}`

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [[formatDateBR(data), formatCurrency(valorCentavos), descricao || '', pdfLink || '']],
      }),
    },
  )

  if (!response.ok) {
    throw new Error(`Erro ao atualizar recebimento: ${response.status}`)
  }
}

/**
 * Remove um recebimento da aba RECEBIMENTOS (limpa a linha).
 * @param sheetRow Linha na planilha (1-based), obtido de RecebimentoRecord.sheetRow
 */
export async function deleteRecebimento(
  spreadsheetId: string,
  sheetRow: number,
): Promise<void> {
  const token = getToken()
  if (!token) throw new Error('Sem token de autenticação')

  await ensureRecebimentosTab(spreadsheetId)

  const range = `RECEBIMENTOS!A${sheetRow}:E${sheetRow}`

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [['', '', '', '', '']] }),
    },
  )

  if (!response.ok) {
    throw new Error(`Erro ao remover recebimento: ${response.status}`)
  }
}

/* ────────── Resumo Financeiro da Obra ────────── */

/**
 * Resumo financeiro «obra vs cliente»: total geral = VALOR_TOTAL_OBRA + soma dos ADICIONAL em _CONFIG.
 * (Acréscimos só do colaborador não usam linhas ADICIONAL — ficam na aba do funcionário.)
 */
export async function readObraFinancialSummary(
  spreadsheetId: string,
): Promise<ObraFinancialSummary> {
  const config = await readSheetConfig(spreadsheetId)
  const recebimentos = await readRecebimentos(spreadsheetId)

  const valorOriginal = config.valorTotalObra
  const somaAdicionaisObra = config.adicionais.reduce((acc, a) => acc + a.valor, 0)
  const totalRecebido = recebimentos.reduce((acc, r) => acc + r.valorCentavos, 0)

  return totaisResumoObraCliente(valorOriginal, totalRecebido, somaAdicionaisObra)
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

  const result: PaymentRecord[] = []
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row?.[0] && !row?.[1]) continue
    result.push({
      data: row[0] ?? '',
      valor: row[1] ?? '',
      valorCentavos: parseValorBR(row[1] ?? ''),
      descricao: row[2] ?? '',
      sheetRow: 2 + i,
    })
  }
  return result
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

/**
 * Atualiza um pagamento existente na aba do funcionário.
 * @param tabName Nome da aba (nome do funcionário)
 * @param sheetRow Linha na planilha (1-based), obtido de PaymentRecord.sheetRow
 */
export async function updatePayment(
  spreadsheetId: string,
  tabName: string,
  sheetRow: number,
  data: Date,
  valorCentavos: number,
  descricao: string,
): Promise<void> {
  const token = getToken()
  if (!token) throw new Error('Sem token de autenticação')

  const range = `${encodeURIComponent(tabName)}!A${sheetRow}:C${sheetRow}`

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [[formatDateBR(data), formatCurrency(valorCentavos), descricao || '']],
      }),
    },
  )

  if (!response.ok) {
    throw new Error(`Erro ao atualizar pagamento: ${response.status}`)
  }
}

/**
 * Remove um pagamento da aba do funcionário (limpa a linha).
 * @param sheetRow Linha na planilha (1-based), obtido de PaymentRecord.sheetRow
 */
export async function deletePayment(
  spreadsheetId: string,
  tabName: string,
  sheetRow: number,
): Promise<void> {
  const token = getToken()
  if (!token) throw new Error('Sem token de autenticação')

  const range = `${encodeURIComponent(tabName)}!A${sheetRow}:C${sheetRow}`

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [['', '', '']] }),
    },
  )

  if (!response.ok) {
    throw new Error(`Erro ao remover pagamento: ${response.status}`)
  }
}

/* ────────── Resumo de Todos os Funcionários ────────── */

/**
 * Lê config + totais pagos de todas as abas.
 * Retorna um resumo por funcionário para exibir nos cards.
 */
export async function readAllSummaries(
  spreadsheetId: string,
): Promise<{
  config: ObraSheetConfig
  summaries: FuncionarioSummary[]
  paymentHistoryByFuncionario: Record<string, PaymentRecord[]>
}> {
  // Formata planilhas antigas quando forem abertas, sem reescrever dados.
  await applyObraSheetFormatting(spreadsheetId)

  const config = await readSheetConfig(spreadsheetId)

  const summaries: FuncionarioSummary[] = []
  const paymentHistoryByFuncionario: Record<string, PaymentRecord[]> = {}

  for (const func of config.funcionarios) {
    const history = await readPaymentHistory(spreadsheetId, func.nome)
    paymentHistoryByFuncionario[func.nome] = history
    const totalPago = history.reduce((acc, p) => acc + p.valorCentavos, 0)

    summaries.push({
      nome: func.nome,
      valorEsperado: func.valorEsperado,
      totalPago,
      saldoRestante: func.valorEsperado - totalPago,
      isMarjorie: func.isMarjorie ?? false,
      sheetRow: func.sheetRow,
    })
  }

  return { config, summaries, paymentHistoryByFuncionario }
}
