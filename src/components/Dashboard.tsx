import { useEstateStatus } from '@/hooks/useEstateStatus'
import { useHeirs } from '@/hooks/useHeirs'
import { useDemoMode } from '@/context/DemoModeContext'
import WorldIDVerify from '@/components/WorldIDVerify'

const statusColor = (status?: string) => {
  if (status === 'CRITICAL') return 'text-red-400'
  if (status === 'WARNING')  return 'text-amber-400'
  return 'text-green-status'
}

const barColor = (status?: string) => {
  if (status === 'CRITICAL') return 'bg-red-500'
  if (status === 'WARNING')  return 'bg-amber-500'
  return 'bg-green-status'
}

const pulseDot = (status?: string) => {
  if (status === 'CRITICAL') return 'bg-red-500'
  if (status === 'WARNING')  return 'bg-amber-500'
  return 'bg-green-status'
}

const Dashboard = () => {
  const { data: status, isLoading: statusLoading, isError: statusError } = useEstateStatus()
  const { data: heirsData, isLoading: heirsLoading }                     = useHeirs()
  const { demoMode } = useDemoMode()

  const lastPingAgo = (() => {
    if (!status) return '—'
    const secs = Math.floor(Date.now() / 1000) - status.lastPing
    if (secs < 3600)  return `${Math.floor(secs / 60)}m ago`
    if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
    return `${Math.floor(secs / 86400)}d ago`
  })()

  const heartbeatLabel = status?.status === 'CRITICAL'
    ? 'HEARTBEAT CRITICAL'
    : status?.status === 'WARNING'
    ? 'HEARTBEAT WARNING'
    : 'HEARTBEAT ACTIVE'

  return (
    <section id="dashboard" className="py-24 bg-navy-deep">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-center mb-4 text-foreground">
          Proof of Life Dashboard
        </h2>
        <p className="text-center text-muted-foreground mb-12">
          {demoMode ? (
            <span className="text-amber-400 font-mono text-xs">⚠ DEMO MODE — simulated 170/180 days elapsed</span>
          ) : (
            'Live estate monitoring interface'
          )}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Estate */}
          <div className="bg-card rounded-xl p-6 gold-border-glow">
            <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">Your Estate</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-foreground">ETH</span>
                <span className="font-mono text-gold">
                  {statusLoading ? '...' : statusError ? '—' : (Number(status?.balance ?? 0).toFixed(4))}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-foreground">Contract</span>
                <a
                  href={`https://sepolia.etherscan.io/address/${status?.contractAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-gold text-xs hover:underline"
                >
                  {status?.contractAddress
                    ? `${status.contractAddress.slice(0, 6)}...${status.contractAddress.slice(-4)}`
                    : '—'}
                </a>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-foreground">Status</span>
                <span className={`font-mono text-sm ${statusColor(status?.status)}`}>
                  {statusLoading ? 'Loading...' : (status?.status ?? '—')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-foreground">Executed</span>
                <span className={`font-mono text-xs ${status?.executed ? 'text-red-400' : 'text-green-status'}`}>
                  {status?.executed ? 'YES' : 'NO'}
                </span>
              </div>
            </div>
          </div>

          {/* Center: Heartbeat */}
          <div className="bg-card rounded-xl p-6 gold-border-glow flex flex-col items-center justify-center text-center">
            <div className={`w-4 h-4 rounded-full ${pulseDot(status?.status)} green-pulse mb-4`} />
            <h3 className={`text-2xl font-serif font-bold mb-1 ${statusColor(status?.status)}`}>
              {statusLoading ? 'LOADING...' : heartbeatLabel}
            </h3>
            <p className="text-xs text-muted-foreground font-mono">
              Last activity: {statusLoading ? '...' : lastPingAgo}
            </p>
            <p className="text-xs text-muted-foreground font-mono mt-1">
              {status?.daysElapsed !== undefined
                ? `${status.daysElapsed} / ${status.thresholdDays} days elapsed`
                : 'Fetching...'}
            </p>
            {status?.status === 'CRITICAL' && (
              <p className="text-xs text-red-400 font-mono mt-2 animate-pulse">
                ⚠ ESTATE ELIGIBLE FOR EXECUTION
              </p>
            )}
          </div>

          {/* Right: Heirs */}
          <div className="bg-card rounded-xl p-6 gold-border-glow">
            <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">Designated Heirs</h3>
            <div className="space-y-4">
              {heirsLoading && <p className="text-xs text-muted-foreground font-mono">Loading heirs...</p>}
              {heirsData?.heirs.map((h) => (
                <div key={h.wallet} className="flex items-center justify-between">
                  <div>
                    <p className="text-foreground text-sm font-medium font-mono">
                      {h.wallet.slice(0, 6)}...{h.wallet.slice(-4)}
                    </p>
                    <p className="text-xs font-mono text-muted-foreground">{h.allocation}</p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <span className="text-gold text-sm font-mono">{h.allocation}</span>
                    {h.isVerified ? (
                      <p className="text-[10px] text-green-status">✓ World ID</p>
                    ) : (
                      <WorldIDVerify heirAddress={h.wallet} />
                    )}
                  </div>
                </div>
              ))}
              {!heirsLoading && (!heirsData?.heirs.length) && (
                <p className="text-xs text-muted-foreground font-mono">No heirs registered yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Bottom: Threshold bar */}
        <div className="mt-6 bg-card rounded-xl p-6 gold-border-glow">
          <div className="flex justify-between items-center mb-2">
            <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Inactivity Threshold</span>
            <span className="font-mono text-sm text-foreground">
              {status ? `${status.daysElapsed} / ${status.thresholdDays} days` : '— / — days'}
            </span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor(status?.status)}`}
              style={{ width: `${Math.min(100, status?.warningPct ?? 0)}%` }}
            />
          </div>
          <p className={`text-xs mt-2 font-mono ${statusColor(status?.status)}`}>
            {status?.status === 'CRITICAL'
              ? '⚠ CRITICAL — owner inactive beyond threshold. Estate eligible for execution.'
              : status?.status === 'WARNING'
              ? `⚠ WARNING — ${status.warningPct}% of inactivity threshold reached.`
              : `Status: All systems nominal — ${status?.warningPct ?? 0}% of threshold`}
          </p>
        </div>
      </div>
    </section>
  )
}

export default Dashboard
