const layers = [
  {
    label: 'User Layer',
    chips: ['LifeContract.sol', 'World ID', 'ping()', 'addHeir()'],
    desc:  'Owner deploys a LifeContract on Sepolia. Heirs register with World ID nullifier hashes to prove unique human identity.',
    arrow: '↓ CRE reads on-chain state',
  },
  {
    label: 'CRE Workflow',
    chips: ['EVMClient', 'callContract()', 'ConsensusAggregation', 'writeReport()'],
    desc:  'Chainlink CRE autonomously reads lastPing and threshold, aggregates signals across nodes, evaluates verdict, and writes the result on-chain.',
    arrow: '↓ Verdict triggers execution',
  },
  {
    label: 'Trust Layer',
    chips: ['VerdictRegistry', 'Sepolia', 'executeEstate()', 'ETH transfer'],
    desc:  'VerdictRegistry stores the immutable CRITICAL verdict. Anyone can call executeEstate() — assets transfer to heirs proportionally, atomically.',
    arrow: null,
  },
]

const ArchitectureSection = () => (
  <section className="py-20 bg-background">
    <div className="max-w-4xl mx-auto px-6">
      <h2 className="text-2xl md:text-3xl font-serif font-bold text-center mb-2 text-foreground">
        How the pieces connect
      </h2>
      <p className="text-center text-muted-foreground text-sm mb-12">
        End-to-end trustless execution — from proof-of-life to asset transfer
      </p>

      <div className="flex flex-col items-center gap-0">
        {layers.map((layer) => (
          <div key={layer.label} className="w-full flex flex-col items-center">
            {/* Box */}
            <div className="w-full max-w-2xl bg-card rounded-xl p-6 gold-border-glow">
              <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3">
                {layer.label}
              </p>
              {/* Chips */}
              <div className="flex flex-wrap gap-2 mb-4">
                {layer.chips.map((chip) => (
                  <span
                    key={chip}
                    className="text-[11px] font-mono px-2.5 py-1 rounded border border-gold/20 bg-gold/5 text-gold/80"
                  >
                    {chip}
                  </span>
                ))}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{layer.desc}</p>
            </div>

            {/* Arrow between boxes */}
            {layer.arrow && (
              <div className="flex flex-col items-center py-3">
                <div className="w-px h-5 bg-border/40" />
                <span className="text-[11px] font-mono text-muted-foreground/60 py-1">{layer.arrow}</span>
                <div className="w-px h-5 bg-border/40" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  </section>
)

export default ArchitectureSection
