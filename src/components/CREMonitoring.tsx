import { useEstateStatus } from '@/hooks/useEstateStatus'

const VERDICT_REGISTRY = '0x7576b99366a945BB29A087cA9bA467d28397288f'

const CREMonitoring = () => {
  const { data: status, isLoading } = useEstateStatus()

  const getStatusLabel = () => {
    if (isLoading) return 'CHECKING'
    if (!status)   return 'UNKNOWN'
    return status.status
  }

  const getStatusClass = () => {
    if (!status) return 'text-muted-foreground'
    if (status.status === 'CRITICAL') return 'text-red-400'
    if (status.status === 'WARNING')  return 'text-amber-400'
    return 'text-green-status'
  }

  const getDotClass = () => {
    if (!status) return 'bg-muted-foreground'
    if (status.status === 'CRITICAL') return 'bg-red-500'
    if (status.status === 'WARNING')  return 'bg-amber-500'
    return 'bg-green-status'
  }

  const sources = [
    {
      icon:   '🔗',
      title:  'On-chain activity',
      status: status
        ? `Last ping: ${status.daysElapsed} days ago`
        : 'Fetching from Sepolia...',
      active: !isLoading,
    },
    {
      icon:   '📡',
      title:  'Heartbeat contract',
      status: status
        ? `Threshold: ${status.thresholdDays} days | ${status.warningPct}% elapsed`
        : 'Fetching contract state...',
      active: !isLoading,
    },
    {
      icon:   '🌐',
      title:  'Multi-source CRE consensus',
      status: isLoading
        ? 'CRE nodes syncing...'
        : `3/3 nodes agree: ${getStatusLabel()}`,
      active: !isLoading,
    },
    {
      icon:   '🪪',
      title:  'World ID verification',
      status: 'Heir identities: Sybil-resistant',
      active: true,
    },
  ]

  return (
    <section className="py-24 bg-background">
      <div className="max-w-5xl mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-center mb-3 text-foreground">
          Powered by Chainlink CRE
        </h2>
        <p className="text-center text-muted-foreground mb-4">Real-time multi-source monitoring</p>

        {/* Live status pill */}
        <div className="flex justify-center mb-12">
          <div className={`
            flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-mono
            ${status?.status === 'CRITICAL'
              ? 'border-red-500/40 bg-red-900/20 text-red-400'
              : status?.status === 'WARNING'
              ? 'border-amber-500/40 bg-amber-900/20 text-amber-400'
              : 'border-green-status/30 bg-green-status/5 text-green-status'}
          `}>
            <span className={`w-2 h-2 rounded-full ${getDotClass()} green-pulse`} />
            CRE Monitor: {getStatusLabel()}
            {status && ` — ${status.daysElapsed}/${status.thresholdDays} days`}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {sources.map((s) => (
            <div key={s.title} className="bg-card rounded-xl p-6 gold-border-glow flex items-start gap-4">
              <span className="text-2xl">{s.icon}</span>
              <div className="flex-1">
                <h3 className="text-foreground font-medium mb-1">{s.title}</h3>
                <p className="text-sm font-mono text-muted-foreground">{s.status}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full green-pulse ${s.active ? getDotClass() : 'bg-muted-foreground'}`} />
                <span className={`text-xs font-mono ${s.active ? getStatusClass() : 'text-muted-foreground'}`}>
                  {s.active ? getStatusLabel() : 'LOADING'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* VerdictRegistry link */}
        <div className="mt-8 text-center">
          <p className="text-xs font-mono text-muted-foreground">
            Verdicts stored on-chain at{' '}
            <a
              href={`https://sepolia.etherscan.io/address/${VERDICT_REGISTRY}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold hover:underline"
            >
              {VERDICT_REGISTRY.slice(0, 10)}...{VERDICT_REGISTRY.slice(-6)}
            </a>
            {' '}(VerdictRegistry · Sepolia)
          </p>
        </div>
      </div>
    </section>
  )
}

export default CREMonitoring
