/* ────────────────────────────────────────────
   Ilustrações animadas do fluxo (wizard → kanban → planilha).
   Decorativo: aria-hidden; pausa com prefers-reduced-motion (index.css).
   ──────────────────────────────────────────── */

/** Passo 1: indicadores de etapas do assistente */
function WizardStepsDemo() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-primary-100 bg-gradient-to-b from-white to-primary-50/80 px-4 py-8">
      <p className="mb-4 text-[10px] font-medium uppercase tracking-widest text-primary-500">
        Solicitação
      </p>
      <div className="flex items-center gap-2 sm:gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-2 sm:gap-3">
            <div
              className="home-demo-wizard-step flex h-9 w-9 items-center justify-center rounded-full border-2 border-primary-200 bg-white text-xs font-semibold text-primary-800 tabular-nums shadow-sm sm:h-10 sm:w-10"
              style={{ animationDelay: `${i * 0.55}s` }}
            >
              {i + 1}
            </div>
            {i < 2 && (
              <div
                className="home-demo-wizard-connector hidden h-0.5 w-4 rounded-full bg-primary-200 sm:block sm:w-6"
                style={{ animationDelay: `${i * 0.55}s` }}
              />
            )}
          </div>
        ))}
      </div>
      <div
        className="home-demo-pdf-pop mt-5 flex items-center gap-2 rounded-lg border border-primary-100 bg-white px-3 py-2 shadow-sm"
        aria-hidden
      >
        <span className="flex h-8 w-6 shrink-0 flex-col rounded border border-primary-200 bg-primary-50">
          <span className="h-1.5 w-full rounded-t bg-primary-300/80" />
        </span>
        <span className="text-[11px] font-medium text-primary-700">PDF → Drive</span>
      </div>
    </div>
  )
}

/** Passo 2: cartão a deslizar pelas colunas do Kanban */
function KanbanDemo() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary-100 bg-primary-50/60 px-3 py-8">
      <p className="mb-3 text-center text-[10px] font-medium uppercase tracking-widest text-primary-500">
        Status
      </p>
      <div className="relative mx-auto grid max-w-[220px] grid-cols-3 gap-1.5">
        {['Gerada', 'Enviada', 'Paga'].map((label) => (
          <div key={label} className="rounded-lg bg-white/90 py-2 text-center">
            <span className="text-[9px] font-medium text-primary-500">{label}</span>
          </div>
        ))}
        <div
          className="home-demo-kanban-card pointer-events-none absolute bottom-2 left-[6%] flex w-[26%] items-center justify-center rounded-md bg-primary-950 py-2 shadow-md"
          aria-hidden
        >
          <span className="text-[8px] font-medium text-white">PDF</span>
        </div>
      </div>
    </div>
  )
}

/** Passo 3: linha de planilha com valor a atualizar */
function SheetDemo() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-primary-100 bg-white px-4 py-8">
      <p className="mb-4 text-[10px] font-medium uppercase tracking-widest text-primary-500">
        Obra
      </p>
      <div className="w-full max-w-[200px] space-y-1.5 rounded-lg border border-primary-100 bg-primary-50/50 p-2">
        <div className="grid grid-cols-[1fr_auto] gap-2 border-b border-primary-100 pb-1.5 text-[9px] font-medium text-primary-500">
          <span>Recebimento</span>
          <span className="tabular-nums">Valor</span>
        </div>
        <div className="grid grid-cols-[1fr_auto] items-center gap-2 text-[10px] text-primary-800">
          <span className="truncate text-primary-600">Cliente</span>
          <span className="relative inline-block min-w-[4.25rem] text-right align-middle font-semibold tabular-nums">
            <span className="home-demo-sheet-val-a inline-block text-primary-950">0 €</span>
            <span className="home-demo-sheet-val-b absolute right-0 top-0 inline-block whitespace-nowrap text-primary-950">
              12 450 €
            </span>
          </span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-primary-200">
          <div className="home-demo-sheet-bar h-full rounded-full bg-primary-800" />
        </div>
      </div>
    </div>
  )
}

export function ProcessFlowAnimations({ compact }: { compact?: boolean }) {
  return (
    <div
      className={
        compact
          ? 'mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-3'
          : 'mt-10 grid grid-cols-1 gap-6 sm:mt-12 sm:grid-cols-3 sm:gap-6'
      }
      aria-hidden
    >
      <WizardStepsDemo />
      <KanbanDemo />
      <SheetDemo />
    </div>
  )
}
