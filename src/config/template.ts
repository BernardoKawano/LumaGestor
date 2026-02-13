/* ────────────────────────────────────────────
   Dados fixos do template de Solicitação de Pagamento
   Estes valores aparecem em TODA solicitação, sem variação.
   ──────────────────────────────────────────── */

export const TEMPLATE = {
  titulo: 'SOLICITAÇÃO DE PAGAMENTO DE INSUMOS E/OU SERVIÇOS',

  empresaDefault: 'MaMM Gestão e Engenharia',

  banco: {
    label: 'CONTA PARA TRANSFERÊNCIA:',
    nome: 'NU Bank - 260',
    razaoSocial: 'MaMM Gerenciamento de Obras LTDA',
    cnpj: '42.792.815/0001-09',
    agencia: '0001',
    conta: '15094918-7',
    pixTipo: 'CNPJ',
    pixChave: '42.792.815/0001-09',
  },

  assinatura: {
    cidade: 'Curitiba',
    nome: 'Marjorie Dias Machado Motta Eng.',
    registro: '163460-D | Crea PR',
  },

  email: {
    assuntoTemplate: 'Solicitação de Pagamento - {OBRA} - {DATA}',
    corpoTemplate: `Prezado(a),

Segue em anexo a solicitação de pagamento referente à obra {OBRA}.

Valor total: {TOTAL}

Att,
Marjorie Dias Machado Motta
MaMM Gestão e Engenharia`,
  },
} as const
