const BROADCAST_TX = '0x88b156c858f38407fc7afad4288e794418a3dfd552ade06259f9154426e68f88'
const VERDICT_REGISTRY = '0x7576b99366a945BB29A087cA9bA467d28397288f'

const steps = [
  {
    num:   '①',
    title: 'On-chain read',
    desc:  'EVMClient reads lastPing + threshold from LifeContract via callContract()',
    tag:   'EVMClient',
  },
  {
    num:   '②',
    title: 'Signal aggregation',
    desc:  'ConsensusAggregationByFields computes elapsed days across CRE nodes',
    tag:   'Consensus',
  },
  {
    num:   '③',
    title: 'Status evaluation',
    desc:  'Workflow evaluates ACTIVE / WARNING / CRITICAL verdict from threshold %',
    tag:   'Logic',
  },
  {
    num:   '④',
    title: 'On-chain write',
    desc:  'Verdict hash written to VerdictRegistry via writeReport()',
    tag:   'writeReport',
  },
]

const CREWorkflowSection = () => (
  <section className="py-20 bg-navy-deep border-y border-border/20">
    <div className="max-w-5xl mx-auto px-6">
      <h2 className="text-2xl md:text-3xl font-serif font-bold text-center mb-2 text-foreground">
        How the CRE Workflow Runs
      </h2>
      <p className="text-center text-muted-foreground text-sm mb-12 font-mono">
        Autonomous execution — no keeper, no backend required
      </p>

      {/* Flow steps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {steps.map((s, i) => (
          <div key={s.num} className="relative">
            <div className="bg-card rounded-xl p-5 gold-border-glow h-full">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-gold text-lg font-mono">{s.num}</span>
                <span className="text-[10px] font-mono bg-gold/10 text-gold px-2 py-0.5 rounded border border-gold/20">
                  {s.tag}
                </span>
              </div>
              <h3 className="text-foreground font-semibold text-sm mb-2">{s.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
            {/* Arrow connector (hidden on last item) */}
            {i < steps.length - 1 && (
              <div className="hidden lg:flex absolute -right-2.5 top-1/2 -translate-y-1/2 z-10 text-gold/40 text-lg select-none">
                →
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Simulate command */}
      <div className="max-w-3xl mx-auto">
        <div className="rounded-lg bg-background border border-border/40 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border/30 bg-card/40">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
            </div>
            <span className="text-muted-foreground text-xs font-mono ml-2">Terminal</span>
          </div>
          <div className="p-4 font-mono text-sm">
            <span className="text-muted-foreground select-none">$ </span>
            <span className="text-gold">
              cre workflow simulate ./cre-workflow --non-interactive --trigger-index 0 -T staging-settings
            </span>
          </div>
        </div>

        {/* Broadcast tx + registry links */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-5 text-xs font-mono">
          <a
            href={`https://sepolia.etherscan.io/tx/${BROADCAST_TX}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold/80 hover:text-gold transition-colors"
          >
            Latest tx: {BROADCAST_TX.slice(0, 10)}...{BROADCAST_TX.slice(-6)} ↗
          </a>
          <span className="text-border hidden sm:inline">·</span>
          <a
            href={`https://sepolia.etherscan.io/address/${VERDICT_REGISTRY}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            VerdictRegistry: {VERDICT_REGISTRY.slice(0, 10)}...{VERDICT_REGISTRY.slice(-6)} ↗
          </a>
        </div>
      </div>
    </div>
  </section>
)

export default CREWorkflowSection
