const LIFE_CONTRACT    = import.meta.env.VITE_LIFE_CONTRACT_ADDRESS as string | undefined
const VERDICT_REGISTRY = '0x7576b99366a945BB29A087cA9bA467d28397288f'

const ContractLink = ({ address, label }: { address?: string; label: string }) => {
  if (!address) return <span className="text-muted-foreground/50">{label}: not deployed</span>
  return (
    <a
      href={`https://sepolia.etherscan.io/address/${address}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-gold/70 hover:text-gold transition-colors font-mono text-xs"
    >
      {label}: {address.slice(0, 10)}...{address.slice(-6)} ↗
    </a>
  )
}

const Footer = () => (
  <footer className="py-12 bg-background text-center border-t border-border/20">
    <p className="font-serif text-lg text-foreground mb-1">Digital Executor</p>
    <p className="text-xs text-muted-foreground font-mono tracking-wide">
      Your crypto. Your legacy. Automated.
    </p>

    {/* Contract addresses */}
    <div className="mt-6 space-y-2">
      <ContractLink address={LIFE_CONTRACT}    label="LifeContract" />
      <br />
      <ContractLink address={VERDICT_REGISTRY} label="VerdictRegistry" />
    </div>

    <div className="mt-6 space-y-1">
      <p className="text-xs text-muted-foreground">Digital Executor · Chainlink Convergence 2026</p>
      <p className="text-xs text-muted-foreground font-mono">Chainlink CRE × World ID × Sepolia</p>
    </div>

    <div className="mt-4">
      <a
        href="https://github.com/MaxWK96/digital-legacy-hub"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
        </svg>
        GitHub
      </a>
    </div>
  </footer>
)

export default Footer
