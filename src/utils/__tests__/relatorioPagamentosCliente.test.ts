import { describe, expect, it } from 'vitest'
import {
  buildRelatorioPagamentosCliente,
  nomeArquivoRelatorioPagamentosCliente,
  ROTULO_SITUACAO_PAGAMENTO,
} from '../relatorioPagamentosCliente'

const geradoEm = new Date(2026, 9, 27, 10, 30)

describe('buildRelatorioPagamentosCliente', () => {
  it('soma valor original, adicionais da obra e só os recebimentos confirmados', () => {
    const relatorio = buildRelatorioPagamentosCliente({
      obraNome: 'Residencial Jair Avansi',
      valorOriginalCentavos: 15_000_000,
      adicionais: [
        { descricao: 'Serralheria', data: '10/03/2026', valor: 231_000 },
        { descricao: 'Elétrica extra', data: '22/03/2026', valor: 50_000 },
      ],
      recebimentos: [
        { data: '01/02/2026', descricao: '1ª parcela', valorCentavos: 5_000_000 },
        { data: '15/04/2026', descricao: '2ª parcela', valorCentavos: 3_000_000 },
      ],
      geradoEm,
    })

    expect(relatorio.obraNome).toBe('Residencial Jair Avansi')
    expect(relatorio.valorOriginalCentavos).toBe(15_000_000)
    expect(relatorio.totalAdicionaisCentavos).toBe(281_000)
    expect(relatorio.totalGeralCentavos).toBe(15_281_000)
    expect(relatorio.pagamentos).toEqual([
      {
        ordem: 1,
        data: '01/02/2026',
        descricao: '1ª parcela',
        valorCentavos: 5_000_000,
        pdfLink: '',
        acumuladoCentavos: 5_000_000,
        saldoAposCentavos: 10_281_000,
      },
      {
        ordem: 2,
        data: '15/04/2026',
        descricao: '2ª parcela',
        valorCentavos: 3_000_000,
        pdfLink: '',
        acumuladoCentavos: 8_000_000,
        saldoAposCentavos: 7_281_000,
      },
    ])
    expect(relatorio.totalRecebidoCentavos).toBe(8_000_000)
    expect(relatorio.saldoDevedorCentavos).toBe(7_281_000)
    expect(relatorio.situacao).toBe('em_aberto')
    expect(ROTULO_SITUACAO_PAGAMENTO[relatorio.situacao]).toBe('Em aberto')
    expect(relatorio).not.toHaveProperty('funcionarios')
    expect(relatorio).not.toHaveProperty('pagamentosColaboradores')
  })

  it('sem adicionais, o total da obra permanece o valor original', () => {
    const relatorio = buildRelatorioPagamentosCliente({
      obraNome: 'Loja Centro',
      valorOriginalCentavos: 500_000,
      adicionais: [],
      recebimentos: [{ data: '02/01/2026', descricao: 'Sinal', valorCentavos: 100_000 }],
      geradoEm,
    })

    expect(relatorio.adicionais).toEqual([])
    expect(relatorio.totalAdicionaisCentavos).toBe(0)
    expect(relatorio.totalGeralCentavos).toBe(500_000)
    expect(relatorio.saldoDevedorCentavos).toBe(400_000)
  })

  it('marca quitada quando o recebido cobre original mais adicionais', () => {
    const relatorio = buildRelatorioPagamentosCliente({
      obraNome: 'Casa Silva',
      valorOriginalCentavos: 1_000_000,
      adicionais: [{ descricao: 'Pintura', data: '01/05/2026', valor: 200_000 }],
      recebimentos: [{ data: '10/06/2026', descricao: 'Quitação', valorCentavos: 1_200_000 }],
      geradoEm,
    })

    expect(relatorio.saldoDevedorCentavos).toBe(0)
    expect(relatorio.situacao).toBe('quitada')
  })

  it('marca recebido acima do total quando o cliente pagou a mais', () => {
    const relatorio = buildRelatorioPagamentosCliente({
      obraNome: 'Casa Silva',
      valorOriginalCentavos: 1_000_000,
      adicionais: [],
      recebimentos: [{ data: '10/06/2026', descricao: 'Pagamento', valorCentavos: 1_050_000 }],
      geradoEm,
    })

    expect(relatorio.saldoDevedorCentavos).toBe(-50_000)
    expect(relatorio.situacao).toBe('recebido_acima')
  })

  it('lista cada pagamento do mais antigo ao mais recente, com saldo após cada um', () => {
    const relatorio = buildRelatorioPagamentosCliente({
      obraNome: 'Jurandyr',
      valorOriginalCentavos: 10_000_000,
      adicionais: [
        { descricao: 'Elétrica', data: '20/03/2026', valor: 200_000 },
        { descricao: 'Serralheria', data: '02/02/2026', valor: 150_000 },
      ],
      recebimentos: [
        { data: '15/04/2026', descricao: '3ª medição', valorCentavos: 3_000_000, pdfLink: 'https://drive.example/3' },
        { data: '05/02/2026', descricao: 'Sinal do contrato', valorCentavos: 2_000_000 },
        { data: '10/03/2026', descricao: '1ª medição', valorCentavos: 2_500_000 },
      ],
      geradoEm,
    })

    expect(relatorio.adicionais.map((adicional) => adicional.descricao)).toEqual([
      'Serralheria',
      'Elétrica',
    ])
    expect(relatorio.totalGeralCentavos).toBe(10_350_000)
    expect(relatorio.pagamentos.map((pagamento) => ({
      ordem: pagamento.ordem,
      data: pagamento.data,
      descricao: pagamento.descricao,
      valorCentavos: pagamento.valorCentavos,
      acumuladoCentavos: pagamento.acumuladoCentavos,
      saldoAposCentavos: pagamento.saldoAposCentavos,
      pdfLink: pagamento.pdfLink,
    }))).toEqual([
      {
        ordem: 1,
        data: '05/02/2026',
        descricao: 'Sinal do contrato',
        valorCentavos: 2_000_000,
        acumuladoCentavos: 2_000_000,
        saldoAposCentavos: 8_350_000,
        pdfLink: '',
      },
      {
        ordem: 2,
        data: '10/03/2026',
        descricao: '1ª medição',
        valorCentavos: 2_500_000,
        acumuladoCentavos: 4_500_000,
        saldoAposCentavos: 5_850_000,
        pdfLink: '',
      },
      {
        ordem: 3,
        data: '15/04/2026',
        descricao: '3ª medição',
        valorCentavos: 3_000_000,
        acumuladoCentavos: 7_500_000,
        saldoAposCentavos: 2_850_000,
        pdfLink: 'https://drive.example/3',
      },
    ])
  })

  it('preenche descrição vazia e nome de obra em branco', () => {
    const relatorio = buildRelatorioPagamentosCliente({
      obraNome: '   ',
      valorOriginalCentavos: 0,
      adicionais: [{ descricao: '  ', data: '01/01/2026', valor: 0 }],
      recebimentos: [{ data: '01/01/2026', descricao: '  ', valorCentavos: 0 }],
      geradoEm,
    })

    expect(relatorio.obraNome).toBe('Obra')
    expect(relatorio.adicionais[0].descricao).toBe('Adicional')
    expect(relatorio.pagamentos[0].descricao).toBe('Pagamento')
  })
})

describe('nomeArquivoRelatorioPagamentosCliente', () => {
  it('monta o nome do PDF com a obra e a data', () => {
    expect(nomeArquivoRelatorioPagamentosCliente('JAIR AVANSI', geradoEm)).toBe(
      'Relatorio MaMM - JAIR AVANSI - 2026-10-27.pdf',
    )
  })

  it('remove caracteres inválidos de arquivo', () => {
    expect(nomeArquivoRelatorioPagamentosCliente('Obra: Norte/Sul?', geradoEm)).toBe(
      'Relatorio MaMM - Obra NorteSul - 2026-10-27.pdf',
    )
  })
})
