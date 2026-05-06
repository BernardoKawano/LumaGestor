/* ────────────────────────────────────────────
   ResumoObra — Visualização somente leitura para exportar como imagem.
   Resumo compacto: obra, métricas, recebimentos, adicionais da obra (ADICIONAL), funcionários.
   ──────────────────────────────────────────── */

import { format } from 'date-fns'
import { formatCurrency } from '../../utils/currency'
import type {
  FuncionarioSummary,
  ObraFinancialSummary,
  RecebimentoRecord,
  ObraSheetConfig,
  PaymentRecord,
} from '../../services/google-sheets-obras'

/** Rascunho de recebimento (não persiste na planilha até confirmar) */
export interface RascunhoRecebimento {
  id: string
  data: string        // YYYY-MM-DD
  valorCentavos: number
  descricao: string
}

/** Rascunho de pagamento de funcionário (não persiste na planilha até confirmar) */
export interface RascunhoPagamento {
  id: string
  data: string        // YYYY-MM-DD
  valorCentavos: number
  descricao: string
}

export interface ResumoObraData {
  obraNome: string
  financial: ObraFinancialSummary | null
  recebimentos: RecebimentoRecord[]
  rascunhosRecebimento?: RascunhoRecebimento[]
  config: ObraSheetConfig | null
  summaries: FuncionarioSummary[]
  pagamentosPorFuncionario: Record<string, PaymentRecord[]>
  rascunhosPagamentoPorFuncionario?: Record<string, RascunhoPagamento[]>
}

interface Props {
  data: ResumoObraData
}

export function ResumoObra({ data }: Props) {
  const { obraNome, financial, recebimentos, rascunhosRecebimento = [], config, summaries, pagamentosPorFuncionario, rascunhosPagamentoPorFuncionario = {} } = data
  const adicionais = config?.adicionais ?? []
  const totalRascunhos = rascunhosRecebimento.reduce((a, r) => a + r.valorCentavos, 0)
  const totalRecebimentosComRascunhos = recebimentos.reduce((a, r) => a + r.valorCentavos, 0) + totalRascunhos

  return (
    <div
      className="resumo-obra"
      style={{
        width: 600,
        padding: 24,
        backgroundColor: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 13,
        color: '#111827',
      }}
    >
      {/* Título */}
      <div style={{ marginBottom: 20, borderBottom: '2px solid #e5e7eb', paddingBottom: 12 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827' }}>
          Resumo — {obraNome}
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>
          Gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm")}
        </p>
      </div>

      {/* Métricas */}
      {financial && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 1,
            marginBottom: 20,
            backgroundColor: '#f3f4f6',
          }}
        >
          <MetricBox label="Valor original" value={financial.valorOriginal} />
          <MetricBox label="Adicionais obra" value={financial.totalAdicionais} accent="#b45309" />
          <MetricBox label="Total geral" value={financial.totalGeral} bold />
          <MetricBox
            label={totalRascunhos > 0 ? 'Saldo (c/ rascunhos)' : 'Saldo devedor'}
            value={financial.totalGeral - totalRecebimentosComRascunhos}
            accent={(financial.totalGeral - totalRecebimentosComRascunhos) <= 0 ? '#15803d' : '#dc2626'}
          />
        </div>
      )}

      {/* Recebimentos */}
      <Section title="Recebimentos">
        {recebimentos.length === 0 && rascunhosRecebimento.length === 0 ? (
          <p style={{ margin: 0, color: '#9ca3af', fontSize: 12 }}>Nenhum recebimento</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th style={thStyle}>Data</th>
                <th style={thStyle}>Valor</th>
                <th style={thStyle}>Descrição</th>
              </tr>
            </thead>
            <tbody>
              {recebimentos.map((r) => (
                <tr key={`rec-${r.sheetRow}`} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={tdStyle}>{r.data}</td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{r.valor}</td>
                  <td style={tdStyle}>{r.descricao}</td>
                </tr>
              ))}
              {rascunhosRecebimento.map((r) => {
                const dataBR = /^\d{4}-\d{2}-\d{2}$/.test(r.data)
                  ? `${r.data.slice(8, 10)}/${r.data.slice(5, 7)}/${r.data.slice(0, 4)}`
                  : r.data
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: '#fffbeb' }}>
                    <td style={tdStyle}>{dataBR} <span style={{ fontSize: 10, color: '#b45309' }}>(rascunho)</span></td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{formatCurrency(r.valorCentavos)}</td>
                    <td style={tdStyle}>{r.descricao || 'Rascunho'}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: '#f9fafb', fontWeight: 600 }}>
                <td style={tdStyle}>Total</td>
                <td style={tdStyle}>
                  {formatCurrency(totalRecebimentosComRascunhos)}
                  {totalRascunhos > 0 && (
                    <span style={{ fontSize: 10, color: '#b45309', marginLeft: 6 }}>
                      (incl. rascunhos)
                    </span>
                  )}
                </td>
                <td style={tdStyle} />
              </tr>
            </tfoot>
          </table>
        )}
      </Section>

      {/* Linhas ADICIONAL em _CONFIG — somam no total geral com o cliente */}
      <Section title="Adicionais da obra">
        {adicionais.length === 0 ? (
          <p style={{ margin: 0, color: '#9ca3af', fontSize: 12 }}>Nenhum adicional registado</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th style={thStyle}>Descrição</th>
                <th style={thStyle}>Valor</th>
                <th style={thStyle}>Data</th>
              </tr>
            </thead>
            <tbody>
              {adicionais.map((a, i) => (
                <tr key={i} style={{ borderBottom: i < adicionais.length - 1 ? '1px solid #f3f4f6' : undefined }}>
                  <td style={tdStyle}>{a.descricao}</td>
                  <td style={{ ...tdStyle, color: '#b45309', fontFamily: 'monospace' }}>
                    + {formatCurrency(a.valor)}
                  </td>
                  <td style={tdStyle}>{a.data}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: '#f9fafb', fontWeight: 600 }}>
                <td style={tdStyle}>Total</td>
                <td style={{ ...tdStyle, color: '#b45309' }}>
                  + {formatCurrency(adicionais.reduce((s, a) => s + a.valor, 0))}
                </td>
                <td style={tdStyle} />
              </tr>
            </tfoot>
          </table>
        )}
      </Section>

      {/* Funcionários */}
      <Section title="Funcionários">
        {summaries.length === 0 ? (
          <p style={{ margin: 0, color: '#9ca3af', fontSize: 12 }}>Nenhum funcionário</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th style={thStyle}>Nome</th>
                <th style={thStyle}>Pago</th>
                <th style={thStyle}>Esperado</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((s) => {
                const rascunhos = rascunhosPagamentoPorFuncionario[s.nome] ?? []
                const totalRascunhos = rascunhos.reduce((a, r) => a + r.valorCentavos, 0)
                const totalPagoComRascunhos = s.totalPago + totalRascunhos
                const saldoComRascunhos = s.valorEsperado - totalPagoComRascunhos
                return (
                  <tr key={s.nome} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={tdStyle}>{s.nome}</td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace' }}>
                      {formatCurrency(totalPagoComRascunhos)}
                      {totalRascunhos > 0 && (
                        <span style={{ fontSize: 10, color: '#b45309', marginLeft: 4 }}>(incl. rascunhos)</span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace' }}>
                      {formatCurrency(s.valorEsperado)}
                    </td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          backgroundColor:
                            saldoComRascunhos < 0
                              ? '#fef2f2'
                              : saldoComRascunhos === 0
                                ? '#f0fdf4'
                                : '#f9fafb',
                          color:
                            saldoComRascunhos < 0
                              ? '#dc2626'
                              : saldoComRascunhos === 0
                                ? '#15803d'
                                : '#6b7280',
                        }}
                      >
                        {saldoComRascunhos < 0
                          ? `Excedido ${formatCurrency(Math.abs(saldoComRascunhos))}`
                          : saldoComRascunhos === 0
                            ? 'Quitado'
                            : `Restante: ${formatCurrency(saldoComRascunhos)}`}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Section>

      {/* Pagamentos por colaborador */}
      <Section title="Pagamentos por colaborador">
        {summaries.length === 0 ? (
          <p style={{ margin: 0, color: '#9ca3af', fontSize: 12 }}>Nenhum funcionário</p>
        ) : (
          <div style={{ padding: 10 }}>
            {summaries.map((summary, index) => {
              const pagamentos = pagamentosPorFuncionario[summary.nome] ?? []
              const rascunhos = rascunhosPagamentoPorFuncionario[summary.nome] ?? []
              const totalPago = pagamentos.reduce((acc, p) => acc + p.valorCentavos, 0)
              const totalRascunhos = rascunhos.reduce((acc, r) => acc + r.valorCentavos, 0)
              const totalGeral = totalPago + totalRascunhos
              const temItens = pagamentos.length > 0 || rascunhos.length > 0

              return (
                <div
                  key={summary.nome}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    marginBottom: index < summaries.length - 1 ? 10 : 0,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 10px',
                      backgroundColor: '#f9fafb',
                    }}
                  >
                    <strong style={{ fontSize: 12 }}>{summary.nome}</strong>
                    <span style={{ fontSize: 11, color: '#6b7280' }}>
                      Total pago: {formatCurrency(totalGeral)}
                      {totalRascunhos > 0 && (
                        <span style={{ color: '#b45309', marginLeft: 4 }}>(incl. {rascunhos.length} rascunho{rascunhos.length > 1 ? 's' : ''})</span>
                      )}
                    </span>
                  </div>

                  {!temItens ? (
                    <p style={{ margin: 0, padding: '10px', color: '#9ca3af', fontSize: 12 }}>
                      Nenhum pagamento registrado
                    </p>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ backgroundColor: '#ffffff' }}>
                          <th style={thStyle}>Data</th>
                          <th style={thStyle}>Valor</th>
                          <th style={thStyle}>Descrição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagamentos.map((p, i) => (
                          <tr
                            key={`${summary.nome}-${p.sheetRow ?? i}`}
                            style={{ borderBottom: '1px solid #f3f4f6' }}
                          >
                            <td style={tdStyle}>{p.data}</td>
                            <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{p.valor}</td>
                            <td style={tdStyle}>{p.descricao || '-'}</td>
                          </tr>
                        ))}
                        {rascunhos.map((r) => {
                          const dataBR = /^\d{4}-\d{2}-\d{2}$/.test(r.data)
                            ? `${r.data.slice(8, 10)}/${r.data.slice(5, 7)}/${r.data.slice(0, 4)}`
                            : r.data
                          return (
                            <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: '#fffbeb' }}>
                              <td style={tdStyle}>{dataBR} <span style={{ fontSize: 10, color: '#b45309' }}>(rascunho)</span></td>
                              <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{formatCurrency(r.valorCentavos)}</td>
                              <td style={tdStyle}>{r.descricao || 'Rascunho'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Section>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h3
        style={{
          margin: '0 0 8px',
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: '#6b7280',
        }}
      >
        {title}
      </h3>
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  )
}

function MetricBox({
  label,
  value,
  accent,
  bold,
}: {
  label: string
  value: number
  accent?: string
  bold?: boolean
}) {
  return (
    <div
      style={{
        padding: 12,
        backgroundColor: '#ffffff',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4 }}>{label}</div>
      <div
        style={{
          fontSize: 14,
          fontWeight: bold ? 700 : 500,
          color: accent ?? '#111827',
          fontFamily: 'monospace',
        }}
      >
        {formatCurrency(value)}
      </div>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '8px 10px',
  textAlign: 'left',
  fontSize: 10,
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase',
}
const tdStyle: React.CSSProperties = {
  padding: '8px 10px',
}
