/* ────────────────────────────────────────────
   ResumoObra — Visualização somente leitura para exportar como imagem.
   Resumo compacto: obra, métricas, recebimentos, adicionais, funcionários.
   ──────────────────────────────────────────── */

import { format } from 'date-fns'
import { formatCurrency } from '../../utils/currency'
import type {
  FuncionarioSummary,
  ObraFinancialSummary,
  RecebimentoRecord,
  ObraSheetConfig,
} from '../../services/google-sheets-obras'

export interface ResumoObraData {
  obraNome: string
  financial: ObraFinancialSummary | null
  recebimentos: RecebimentoRecord[]
  config: ObraSheetConfig | null
  summaries: FuncionarioSummary[]
}

interface Props {
  data: ResumoObraData
}

export function ResumoObra({ data }: Props) {
  const { obraNome, financial, recebimentos, config, summaries } = data
  const adicionais = config?.adicionais ?? []

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
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 1,
            marginBottom: 20,
            backgroundColor: '#f3f4f6',
          }}
        >
          <MetricBox label="Valor Original" value={financial.valorOriginal} />
          <MetricBox label="Adicionais" value={financial.totalAdicionais} accent="#b45309" />
          <MetricBox label="Total Geral" value={financial.totalGeral} accent="#1d4ed8" bold />
          <MetricBox
            label="Saldo Devedor"
            value={financial.saldoDevedor}
            accent={financial.saldoDevedor <= 0 ? '#15803d' : '#dc2626'}
            bold
          />
        </div>
      )}

      {/* Recebimentos */}
      <Section title="Recebimentos">
        {recebimentos.length === 0 ? (
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
              {recebimentos.map((r, i) => (
                <tr key={r.sheetRow} style={{ borderBottom: i < recebimentos.length - 1 ? '1px solid #f3f4f6' : undefined }}>
                  <td style={tdStyle}>{r.data}</td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{r.valor}</td>
                  <td style={tdStyle}>{r.descricao}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: '#f9fafb', fontWeight: 600 }}>
                <td style={tdStyle}>Total</td>
                <td style={tdStyle}>
                  {formatCurrency(recebimentos.reduce((a, r) => a + r.valorCentavos, 0))}
                </td>
                <td style={tdStyle} />
              </tr>
            </tfoot>
          </table>
        )}
      </Section>

      {/* Adicionais */}
      <Section title="Adicionais">
        {adicionais.length === 0 ? (
          <p style={{ margin: 0, color: '#9ca3af', fontSize: 12 }}>Nenhum adicional</p>
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
              {summaries.map((s) => (
                <tr key={s.nome} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={tdStyle}>{s.nome}</td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace' }}>
                    {formatCurrency(s.totalPago)}
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
                          s.saldoRestante < 0
                            ? '#fef2f2'
                            : s.saldoRestante === 0
                              ? '#f0fdf4'
                              : '#f9fafb',
                        color:
                          s.saldoRestante < 0
                            ? '#dc2626'
                            : s.saldoRestante === 0
                              ? '#15803d'
                              : '#6b7280',
                      }}
                    >
                      {s.saldoRestante < 0
                        ? `Excedido ${formatCurrency(Math.abs(s.saldoRestante))}`
                        : s.saldoRestante === 0
                          ? 'Quitado'
                          : `Restante: ${formatCurrency(s.saldoRestante)}`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
