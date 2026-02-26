import { useDemoMode } from '@/context/DemoModeContext'
import { useEstateStatus } from '@/hooks/useEstateStatus'
import { useSendHeartbeat } from '@/hooks/useEstateStatus'
import { useToast } from '@/hooks/use-toast'

const DemoModeToggle = () => {
  const { demoMode, toggleDemoMode } = useDemoMode()
  const { data: status } = useEstateStatus()
  const sendHeartbeat = useSendHeartbeat()
  const { toast } = useToast()

  const isCritical = status?.status === 'CRITICAL'

  const handleExecute = () => {
    toast({
      title: 'DEMO: Estate Execution Triggered',
      description: 'In production, this calls executeEstate() on Sepolia. Assets would be distributed to verified heirs.',
    })
  }

  const handleHeartbeat = async () => {
    try {
      const result = await sendHeartbeat.mutateAsync()
      toast({
        title: 'Heartbeat Sent',
        description: demoMode
          ? 'Demo: inactivity timer reset.'
          : `Tx: ${(result as { txHash: string }).txHash}`,
      })
    } catch (err: unknown) {
      toast({
        title: 'Heartbeat Failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col items-end gap-2">
      {/* Demo Mode Toggle */}
      <button
        onClick={toggleDemoMode}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono
          border transition-all duration-200
          ${demoMode
            ? 'bg-amber-900/60 border-amber-500/60 text-amber-300 hover:bg-amber-900/80'
            : 'bg-card/80 border-border/40 text-muted-foreground hover:border-gold/40 hover:text-foreground'
          }
          backdrop-blur-sm
        `}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${demoMode ? 'bg-amber-400 animate-pulse' : 'bg-muted-foreground'}`} />
        {demoMode ? 'DEMO MODE ON' : 'DEMO MODE'}
      </button>

      {/* Demo info banner */}
      {demoMode && status && (
        <div className="bg-amber-900/40 border border-amber-500/40 rounded-lg px-3 py-2 text-xs font-mono text-amber-300 max-w-[220px] text-right backdrop-blur-sm">
          Simulated: {status.daysElapsed}/{status.thresholdDays} days elapsed
        </div>
      )}

      {/* Execute Estate button — only shows when CRITICAL */}
      {isCritical && (
        <button
          onClick={handleExecute}
          className="
            px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-widest
            bg-red-900/80 border border-red-500/70 text-red-200
            hover:bg-red-800/90 hover:border-red-400
            animate-pulse transition-all duration-200 backdrop-blur-sm
          "
        >
          {demoMode ? '⚠ DEMO — Execute Estate' : '🔴 CRITICAL — Execute Estate'}
        </button>
      )}

      {/* Send Heartbeat button */}
      <button
        onClick={handleHeartbeat}
        disabled={sendHeartbeat.isPending}
        className="
          px-3 py-1.5 rounded-lg text-xs font-mono
          bg-card/80 border border-border/40 text-muted-foreground
          hover:border-green-500/50 hover:text-green-400
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-200 backdrop-blur-sm
        "
      >
        {sendHeartbeat.isPending ? '⏳ Sending...' : '💓 Send Heartbeat'}
      </button>
    </div>
  )
}

export default DemoModeToggle
