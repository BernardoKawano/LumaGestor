/* ────────────────────────────────────────────
   Google Sheets API — wrapper
   Registra pagamento na planilha da obra.
   ──────────────────────────────────────────── */

import { formatDateBR } from '../utils/date'
import { formatCurrency } from '../utils/currency'

function gapi() {
  return window.gapi!.client
}

function execute<T>(request: { execute: (cb: (r: T) => void) => void }): Promise<T> {
  return new Promise((resolve) => request.execute(resolve))
}

/**
 * Adiciona uma linha na planilha da obra registrando o pagamento.
 * Valores registrados: Data, Valor (Serviço + Adicionais, SEM reembolso), Descrição, Link PDF.
 *
 * @param spreadsheetId  ID do Google Sheet
 * @param data           Data do pagamento
 * @param valorCentavos  Subtotal serviço (serviço + adicionais) em centavos
 * @param descricao      Descrição opcional
 * @param pdfLink        Link do PDF no Drive
 */
export async function appendPaymentRow(
  spreadsheetId: string,
  data: Date,
  valorCentavos: number,
  descricao: string,
  pdfLink: string,
): Promise<void> {
  // Primeiro, descobre o nome da primeira aba
  const meta = await execute<Record<string, unknown>>(
    gapi().sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets.properties.title',
    }),
  )

  const sheets = (meta.sheets ?? []) as Array<{
    properties: { title: string }
  }>
  const sheetName = sheets[0]?.properties.title ?? 'Sheet1'

  // Append na primeira aba disponível
  await execute(
    gapi().sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:E`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [
          [
            formatDateBR(data),
            formatCurrency(valorCentavos),
            descricao || 'Solicitação de Pagamento',
            pdfLink,
          ],
        ],
      },
    }),
  )
}
