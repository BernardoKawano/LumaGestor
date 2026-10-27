/* ────────────────────────────────────────────
   RelatorioClientePdf — relatório do que foi pago à MaMM.
   Valor original, adicionais da obra e recebimentos confirmados.
   Não lista colaboradores.
   ──────────────────────────────────────────── */

import { Document, Image, Link, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { TEMPLATE } from '../../config/template'
import { formatCurrency } from '../../utils/currency'
import { formatDateBR, formatDateExtended } from '../../utils/date'
import {
  ROTULO_SITUACAO_PAGAMENTO,
  type RelatorioPagamentosCliente,
} from '../../utils/relatorioPagamentosCliente'

const HEADER_IMAGE = '/images/header.jpg'
const FOOTER_IMAGE = '/images/footer.jpg'

const s = StyleSheet.create({
  page: {
    paddingTop: 96,
    paddingBottom: 78,
    paddingHorizontal: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1a1a1a',
    lineHeight: 1.4,
  },
  headerImage: {
    position: 'absolute',
    top: 16,
    left: 40,
    right: 40,
    height: 64,
    objectFit: 'contain',
  },
  footerImage: {
    position: 'absolute',
    bottom: 16,
    left: 40,
    right: 40,
    height: 46,
    objectFit: 'contain',
  },
  pageNumber: {
    position: 'absolute',
    bottom: 64,
    right: 40,
    fontSize: 8,
    color: '#888',
  },
  title: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 9,
    textAlign: 'center',
    color: '#555',
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  metaLabel: {
    fontWeight: 'bold',
    width: 70,
  },
  sectionTitle: {
    marginTop: 16,
    marginBottom: 6,
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 3,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 3,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    borderBottomWidth: 0.4,
    borderBottomColor: '#e5e5e5',
  },
  totalRow: {
    flexDirection: 'row',
    paddingTop: 6,
    marginTop: 2,
    borderTopWidth: 1.5,
    borderTopColor: '#1a1a1a',
  },
  colDesc: { flex: 1, fontSize: 10 },
  colDate: { width: 78, fontSize: 10 },
  colValue: { width: 110, fontSize: 10, textAlign: 'right', fontFamily: 'Courier' },
  headerCell: {
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#444',
  },
  bold: { fontWeight: 'bold' },
  empty: { fontSize: 10, color: '#777', marginBottom: 4 },
  pagamento: {
    marginBottom: 8,
    padding: 8,
    borderWidth: 0.7,
    borderColor: '#d4d4d4',
    borderRadius: 3,
  },
  pagamentoTitulo: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  detalhe: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  detalheRotulo: {
    width: 168,
    fontSize: 9,
    color: '#444',
  },
  detalheValor: {
    flex: 1,
    fontSize: 9,
  },
  detalheMoeda: {
    width: 110,
    fontSize: 9,
    textAlign: 'right',
    fontFamily: 'Courier',
  },
  comprovante: {
    marginTop: 3,
    fontSize: 8,
    color: '#1d4ed8',
  },
  footerText: { marginTop: 22, textAlign: 'center' },
  footerDate: { fontSize: 10, color: '#444' },
  footerName: { fontSize: 10, fontWeight: 'bold', marginTop: 10 },
})

interface Props {
  relatorio: RelatorioPagamentosCliente
  /** Caminhos das marcas. No app ficam em /images; testes podem apontar para o arquivo local. */
  headerSrc?: string
  footerSrc?: string
}

export function RelatorioClientePdf({
  relatorio,
  headerSrc = HEADER_IMAGE,
  footerSrc = FOOTER_IMAGE,
}: Props) {
  const r = relatorio

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Image src={headerSrc} style={s.headerImage} fixed />
        <Image src={footerSrc} style={s.footerImage} fixed />
        <Text
          style={s.pageNumber}
          fixed
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
        />

        <Text style={s.title}>Relatório de pagamentos à MaMM</Text>
        <Text style={s.subtitle}>
          Valor original, adicionais da obra e pagamentos recebidos. Não inclui colaboradores.
        </Text>

        <View style={s.metaRow}>
          <Text style={s.metaLabel}>OBRA</Text>
          <Text style={{ flex: 1 }}>{r.obraNome}</Text>
        </View>
        <View style={s.metaRow}>
          <Text style={s.metaLabel}>GERADO EM</Text>
          <Text>{formatDateBR(r.geradoEm)}</Text>
        </View>
        <View style={s.metaRow}>
          <Text style={s.metaLabel}>SITUAÇÃO</Text>
          <Text style={s.bold}>{ROTULO_SITUACAO_PAGAMENTO[r.situacao]}</Text>
        </View>

        <Text style={s.sectionTitle}>Contrato</Text>
        <View style={s.tableRow}>
          <Text style={s.colDesc}>Valor original</Text>
          <Text style={s.colValue}>{formatCurrency(r.valorOriginalCentavos)}</Text>
        </View>

        <Text style={[s.sectionTitle, { marginTop: 14 }]}>Adicionais da obra</Text>
        {r.adicionais.length === 0 ? (
          <Text style={s.empty}>Nenhum adicional registrado</Text>
        ) : (
          <View>
            <View style={s.tableHeader}>
              <Text style={[s.headerCell, s.colDesc]}>Descrição</Text>
              <Text style={[s.headerCell, s.colDate]}>Data</Text>
              <Text style={[s.headerCell, s.colValue]}>Valor</Text>
            </View>
            {r.adicionais.map((adicional, index) => (
              <View key={`${adicional.descricao}-${index}`} style={s.tableRow}>
                <Text style={s.colDesc}>{adicional.descricao}</Text>
                <Text style={s.colDate}>{adicional.data}</Text>
                <Text style={s.colValue}>{formatCurrency(adicional.valorCentavos)}</Text>
              </View>
            ))}
          </View>
        )}
        <View style={s.totalRow}>
          <Text style={[s.colDesc, s.bold]}>Total de adicionais</Text>
          <Text style={[s.colValue, s.bold]}>{formatCurrency(r.totalAdicionaisCentavos)}</Text>
        </View>
        <View style={s.tableRow}>
          <Text style={[s.colDesc, s.bold]}>Total da obra (original + adicionais)</Text>
          <Text style={[s.colValue, s.bold]}>{formatCurrency(r.totalGeralCentavos)}</Text>
        </View>

        <Text style={s.sectionTitle}>Pagamentos recebidos pela MaMM, em ordem cronológica</Text>
        {r.pagamentos.length === 0 ? (
          <Text style={s.empty}>Nenhum pagamento recebido</Text>
        ) : (
          r.pagamentos.map((pagamento) => (
            <View key={pagamento.ordem} style={s.pagamento} wrap={false}>
              <Text style={s.pagamentoTitulo}>
                {`Pagamento ${String(pagamento.ordem).padStart(2, '0')}  ·  ${pagamento.data}`}
              </Text>
              <View style={s.detalhe}>
                <Text style={s.detalheRotulo}>Descrição</Text>
                <Text style={s.detalheValor}>{pagamento.descricao}</Text>
              </View>
              <View style={s.detalhe}>
                <Text style={s.detalheRotulo}>Valor deste pagamento</Text>
                <Text style={s.detalheMoeda}>{formatCurrency(pagamento.valorCentavos)}</Text>
              </View>
              <View style={s.detalhe}>
                <Text style={s.detalheRotulo}>Total recebido até aqui</Text>
                <Text style={s.detalheMoeda}>{formatCurrency(pagamento.acumuladoCentavos)}</Text>
              </View>
              <View style={s.detalhe}>
                <Text style={s.detalheRotulo}>Saldo da obra após este pagamento</Text>
                <Text style={s.detalheMoeda}>{formatCurrency(pagamento.saldoAposCentavos)}</Text>
              </View>
              {pagamento.pdfLink ? (
                <Link src={pagamento.pdfLink} style={s.comprovante}>
                  Abrir solicitação no Drive
                </Link>
              ) : null}
            </View>
          ))
        )}
        <View style={s.totalRow}>
          <Text style={[s.colDesc, s.bold]}>Total recebido</Text>
          <Text style={[s.colValue, s.bold]}>{formatCurrency(r.totalRecebidoCentavos)}</Text>
        </View>
        <View style={s.tableRow}>
          <Text style={[s.colDesc, s.bold]}>Saldo devedor</Text>
          <Text style={[s.colValue, s.bold]}>{formatCurrency(r.saldoDevedorCentavos)}</Text>
        </View>

        <View style={s.footerText}>
          <Text style={s.footerDate}>
            {TEMPLATE.assinatura.cidade}, {formatDateExtended(r.geradoEm)}.
          </Text>
          <Text style={s.footerName}>{TEMPLATE.empresaDefault}</Text>
        </View>
      </Page>
    </Document>
  )
}
