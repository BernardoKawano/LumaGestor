/* ────────────────────────────────────────────
   SolicitacaoPdf — documento PDF gerado com @react-pdf/renderer.
   Reproduz fielmente o modelo de "Solicitação de Pagamento".
   
   Layout:
   - Imagem header (logo MaMM fundo branco)
   - Título centralizado, caixa alta, bold
   - CLIENTES / PROJETO
   - Tabela: EMPRESA/LOJA | VALOR (numeração sequencial)
   - TOTAL com separador visual forte
   - Bloco bancário
   - Rodapé: cidade + data por extenso + assinatura
   - Imagem footer (logo MaMM fundo preto)
   ──────────────────────────────────────────── */

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'
import type { SolicitacaoPagamento } from '../../types'
import { calcTotalReembolso, calcTotalGeral } from '../../types'
import { formatCurrency } from '../../utils/currency'
import { formatDateExtended } from '../../utils/date'
import { TEMPLATE } from '../../config/template'

/* ────────── Fontes ────────── */

Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'Helvetica' },
    { src: 'Helvetica-Bold', fontWeight: 'bold' },
  ],
})

/* ────────── Imagens (servidas pelo Vite em public/) ────────── */

const HEADER_IMAGE = '/images/header.jpg'
const FOOTER_IMAGE = '/images/footer.jpg'

/* ────────── Estilos ────────── */

const s = StyleSheet.create({
  page: {
    paddingHorizontal: 50,
    paddingTop: 0,
    paddingBottom: 0,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1a1a1a',
    lineHeight: 1.5,
    justifyContent: 'space-between',
  },

  /* Imagem cabeçalho */
  headerImage: {
    width: '100%',
    height: 80,
    objectFit: 'contain',
    marginTop: 20,
    marginBottom: 16,
  },

  /* Conteúdo principal */
  content: {
    flex: 1,
  },

  /* Título */
  title: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    textTransform: 'uppercase',
    marginBottom: 20,
    letterSpacing: 0.5,
  },

  /* Campos cabeçalho */
  headerField: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  headerLabel: {
    fontWeight: 'bold',
    fontSize: 10,
  },
  headerValue: {
    fontSize: 10,
  },

  /* Tabela */
  tableContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1.5,
    borderBottomColor: '#333',
    paddingBottom: 4,
    marginBottom: 6,
  },
  tableHeaderCellIndex: {
    width: 30,
  },
  tableHeaderCellDesc: {
    flex: 1,
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tableHeaderCellValue: {
    width: 120,
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'right',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 3,
  },
  tableCellIndex: {
    width: 30,
    fontSize: 10,
    color: '#666',
  },
  tableCellDesc: {
    flex: 1,
    fontSize: 10,
  },
  tableCellDescBold: {
    flex: 1,
    fontSize: 10,
    fontWeight: 'bold',
  },
  tableCellValue: {
    width: 120,
    fontSize: 10,
    textAlign: 'right',
    fontFamily: 'Courier',
  },
  tableCellValueBold: {
    width: 120,
    fontSize: 10,
    textAlign: 'right',
    fontFamily: 'Courier',
    fontWeight: 'bold',
  },

  /* Linha TOTAL */
  totalRow: {
    flexDirection: 'row',
    borderTopWidth: 2,
    borderTopColor: '#1a1a1a',
    paddingTop: 6,
    marginTop: 4,
  },

  /* Bloco bancário */
  bankBlock: {
    marginTop: 24,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
  },
  bankTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  bankLine: {
    fontSize: 9,
    color: '#444',
    lineHeight: 1.6,
  },
  bankSeparator: {
    fontSize: 9,
    color: '#999',
    textAlign: 'center',
    marginVertical: 4,
  },

  /* Rodapé com texto */
  footerText: {
    marginTop: 30,
    textAlign: 'center',
  },
  footerDate: {
    fontSize: 10,
    color: '#444',
  },
  footerName: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 16,
  },
  footerReg: {
    fontSize: 9,
    color: '#666',
    marginTop: 2,
  },

  /* Imagem rodapé */
  footerImage: {
    width: '100%',
    height: 60,
    objectFit: 'contain',
    marginTop: 20,
    marginBottom: 20,
  },
})

/* ────────── Tipos da tabela ────────── */

interface TabelaItem {
  indice: string
  descricao: string
  valor: string
  isBold?: boolean
  isTotal?: boolean
}

/* ────────── Componente ────────── */

interface Props {
  solicitacao: SolicitacaoPagamento
}

export function SolicitacaoPdf({ solicitacao }: Props) {
  const sol = solicitacao

  // Montar itens da tabela
  const items: TabelaItem[] = []
  let seq = 1

  // Serviço principal
  items.push({
    indice: String(seq).padStart(2, '0'),
    descricao: sol.servico.empresa,
    valor: formatCurrency(sol.servico.valor),
  })
  seq++

  // Adicionais
  for (const ad of sol.adicionais) {
    if (ad.nome && ad.valor > 0) {
      items.push({
        indice: String(seq).padStart(2, '0'),
        descricao: ad.nome,
        valor: formatCurrency(ad.valor),
      })
      seq++
    }
  }

  // Notas de reembolso
  const totalReembolso = calcTotalReembolso(sol)
  if (totalReembolso > 0) {
    items.push({
      indice: String(seq).padStart(2, '0'),
      descricao: 'NOTAS DE REEMBOLSO',
      valor: formatCurrency(totalReembolso),
      isBold: true,
    })
  }

  // Total
  const totalGeral = calcTotalGeral(sol)
  items.push({
    indice: '',
    descricao: 'TOTAL',
    valor: formatCurrency(totalGeral),
    isTotal: true,
  })

  const b = TEMPLATE.banco
  const a = TEMPLATE.assinatura

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* ── Imagem Cabeçalho (logo MaMM fundo branco) ── */}
        <Image src={HEADER_IMAGE} style={s.headerImage} />

        {/* ── Conteúdo principal ── */}
        <View style={s.content}>
          {/* Título */}
          <Text style={s.title}>{TEMPLATE.titulo}</Text>

          {/* Cabeçalho dados */}
          <View style={s.headerField}>
            <Text style={s.headerLabel}>CLIENTES: </Text>
            <Text style={s.headerValue}>{sol.clientes}</Text>
          </View>
          <View style={s.headerField}>
            <Text style={s.headerLabel}>PROJETO: </Text>
            <Text style={s.headerValue}>{sol.projeto}</Text>
          </View>

          {/* Tabela */}
          <View style={s.tableContainer}>
            {/* Header da tabela */}
            <View style={s.tableHeader}>
              <View style={s.tableHeaderCellIndex} />
              <Text style={s.tableHeaderCellDesc}>Empresa / Loja</Text>
              <Text style={s.tableHeaderCellValue}>Valor</Text>
            </View>

            {/* Linhas */}
            {items.map((item, i) =>
              item.isTotal ? (
                <View key={i} style={s.totalRow}>
                  <View style={s.tableCellIndex} />
                  <Text style={s.tableCellDescBold}>{item.descricao}</Text>
                  <Text style={s.tableCellValueBold}>{item.valor}</Text>
                </View>
              ) : (
                <View key={i} style={s.tableRow}>
                  <Text style={s.tableCellIndex}>{item.indice}</Text>
                  <Text style={item.isBold ? s.tableCellDescBold : s.tableCellDesc}>
                    {item.descricao}
                  </Text>
                  <Text style={item.isBold ? s.tableCellValueBold : s.tableCellValue}>
                    {item.valor}
                  </Text>
                </View>
              ),
            )}
          </View>

          {/* Dados Bancários */}
          <View style={s.bankBlock}>
            <Text style={s.bankTitle}>{b.label}</Text>
            <Text style={s.bankLine}>{b.nome}</Text>
            <Text style={s.bankLine}>{b.razaoSocial}</Text>
            <Text style={s.bankLine}>CNPJ – {b.cnpj}</Text>
            <Text style={s.bankLine}>AG. {b.agencia}</Text>
            <Text style={s.bankLine}>C/C {b.conta}</Text>
            <Text style={s.bankSeparator}>ou</Text>
            <Text style={s.bankLine}>PIX chave: {b.pixTipo}</Text>
            <Text style={s.bankLine}>{b.pixChave}</Text>
          </View>

          {/* Rodapé texto */}
          <View style={s.footerText}>
            <Text style={s.footerDate}>
              {a.cidade}, {formatDateExtended(sol.data)}.
            </Text>
            <Text style={s.footerName}>{a.nome}</Text>
            <Text style={s.footerReg}>{a.registro}</Text>
          </View>
        </View>

        {/* ── Imagem Rodapé (logo MaMM fundo preto) ── */}
        <Image src={FOOTER_IMAGE} style={s.footerImage} />
      </Page>
    </Document>
  )
}
