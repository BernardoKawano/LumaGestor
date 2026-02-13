# Luma Gestor

Sistema web de gestao financeira para obras de construcao civil, desenvolvido para a **MaMM Gestao e Engenharia**. Aplicacao client-side (SPA) integrada ao Google Drive e Google Sheets, sem necessidade de backend dedicado.

## Funcionalidades

### Solicitacao de Pagamento (Wizard 3 etapas)
- **Identificacao**: selecao de obra (pasta do Google Drive), cliente, projeto e data
- **Itens**: servico principal, adicionais dinamicos e notas de reembolso com drag & drop (valor extraido automaticamente do nome do arquivo)
- **Revisao**: preview completo e geracao de PDF profissional com cabecalho/rodape MaMM, tabela de valores, dados bancarios e assinatura
- Upload automatico do PDF para subpasta organizada no Google Drive (`SOLICITACAO DE PAGAMENTO / DD-MM-YYYY`)
- Pos-geracao: download local, link do Drive, copiar texto do e-mail, marcar como enviada/paga

### Kanban de Status
- Tres colunas: **Gerada** | **Enviada** | **Paga**
- Cards com resumo (obra, cliente, valor, link do PDF)
- Ao marcar como "Paga", exibe modal de confirmacao com data e registra automaticamente o recebimento na planilha de acompanhamento da obra (valor = servico + adicionais, sem reembolso)
- Persistencia entre browsers via arquivo JSON sincronizado no Google Drive

### Acompanhamento de Obras
- Selecao de obra via navegacao de pastas do Drive
- **Criacao de planilha**: valor total da obra, funcionarios com valores individuais, Marjorie com valor calculado automaticamente (total - soma dos funcionarios)
- **Painel financeiro**: valor original, adicionais da obra, total geral, pagamentos recebidos do cliente e saldo devedor
- **Adicionais**: registro de custos extras (serralheria, eletrica, etc.) que aumentam o valor total
- **Recebimentos**: tabela automatica dos pagamentos do cliente (alimentada pelo fluxo de solicitacoes PAGAS)
- **Gestao de funcionarios**: cards com barra de progresso, historico de pagamentos e formulario inline para novos registros
- Leitura/escrita direta via Google Sheets API

## Stack Tecnica

| Camada | Tecnologia |
|--------|------------|
| Framework | React 19 + TypeScript |
| Build | Vite 7 |
| Estilo | Tailwind CSS 4 |
| Roteamento | React Router v7 |
| PDF | @react-pdf/renderer |
| Upload | react-dropzone |
| Datas | date-fns |
| Testes | Vitest |
| Auth | Google Identity Services (OAuth2 client-side) |
| APIs | Google Drive v3, Google Sheets v4 |

## Arquitetura

- **SPA client-side** sem backend -- toda comunicacao via APIs Google
- **AuthProvider** com Google Identity Services (GSI) para autenticacao OAuth2
- **Estado do wizard** gerenciado com `useReducer` + Context API
- **Persistencia hibrida**: `localStorage` para velocidade + arquivos JSON no Google Drive para sincronizacao entre browsers
- **Organizacao no Drive**: pastas de obras na raiz, subpastas para PDFs e notas de reembolso, planilhas de acompanhamento dentro de cada obra

## Configuracao

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=sua-api-key
```

## Estrutura do Projeto

```
src/
├── config/             # Configuracoes Google e templates (banco, assinatura, e-mail)
├── context/            # AuthContext (autenticacao Google)
├── hooks/              # useWizard (estado do wizard com useReducer)
├── pages/              # HomePage, WizardPage, KanbanPage, AcompanhamentoPage
├── components/
│   ├── layout/         # AppShell
│   ├── wizard/         # Steps do wizard (Identificacao, Itens, Revisao, Pronto)
│   ├── acompanhamento/ # CreateSheetForm, ManageSheet, FuncionarioCard
│   ├── shared/         # ObraSelector, CurrencyInput, FileDropzone, PreviewTable
│   ├── modals/         # ModalMarcarPaga, ModalPagaKanban
│   └── pdf/            # SolicitacaoPdf (geracao do documento)
├── services/           # google-auth, google-drive, google-sheets-obras
├── types/              # Interfaces TypeScript
└── utils/              # currency, date, naming, parseFilename, storage, validation
```

## Instalacao

```bash
npm install
npm run dev
```
