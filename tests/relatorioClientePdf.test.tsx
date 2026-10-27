/**
 * Fora de src/ de propósito: o tsconfig do app não inclui tipos do Node,
 * e este teste lê as imagens do disco para gerar o PDF.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { pdf } from '@react-pdf/renderer'
import { describe, expect, it } from 'vitest'
import { RelatorioClientePdf } from '../src/components/pdf/RelatorioClientePdf'
import { buildRelatorioPagamentosCliente } from '../src/utils/relatorioPagamentosCliente'

function imagemDataUrl(arquivo: string) {
  const caminho = fileURLToPath(new URL(`../public/images/${arquivo}`, import.meta.url))
  return `data:image/jpeg;base64,${readFileSync(caminho).toString('base64')}`
}

describe('RelatorioClientePdf', () => {
  it('gera um PDF da obra sem dados de colaboradores', async () => {
    const relatorio = buildRelatorioPagamentosCliente({
      obraNome: 'Residencial Jair Avansi',
      valorOriginalCentavos: 15_000_000,
      adicionais: [{ descricao: 'Serralheria', data: '10/03/2026', valor: 231_000 }],
      recebimentos: [{ data: '01/02/2026', descricao: '1ª parcela', valorCentavos: 5_000_000 }],
      geradoEm: new Date(2026, 9, 27, 10, 30),
    })

    const stream = await pdf(
      <RelatorioClientePdf
        relatorio={relatorio}
        headerSrc={imagemDataUrl('header.jpg')}
        footerSrc={imagemDataUrl('footer.jpg')}
      />,
    ).toBuffer()

    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    const arquivo = Buffer.concat(chunks)

    expect(arquivo.subarray(0, 5).toString('latin1')).toBe('%PDF-')
    expect(arquivo.length).toBeGreaterThan(10_000)
  })
})
