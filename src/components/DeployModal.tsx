import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useDemoMode } from '@/context/DemoModeContext'

interface DeployModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DeployModal = ({ open, onOpenChange }: DeployModalProps) => {
  const { toggleDemoMode, demoMode } = useDemoMode()

  const handleDemoMode = () => {
    if (!demoMode) toggleDemoMode()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border border-border/60">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl text-foreground">
            Deploy Your Life Contract
          </DialogTitle>
          <DialogDescription className="sr-only">
            Instructions to deploy a LifeContract to Sepolia
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm text-muted-foreground leading-relaxed">
          To create your Digital Executor, deploy a LifeContract to Sepolia:
        </p>

        <ol className="space-y-3 text-sm text-foreground">
          <li className="flex gap-3">
            <span className="font-mono text-gold shrink-0">01</span>
            <span>
              Clone the repo:{' '}
              <a
                href="https://github.com/MaxWK96/digital-legacy-hub"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold hover:underline font-mono text-xs"
              >
                github.com/MaxWK96/digital-legacy-hub
              </a>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-gold shrink-0">02</span>
            <span>
              Set up your{' '}
              <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">.env</code>{' '}
              with{' '}
              <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">PRIVATE_KEY</code>{' '}
              and{' '}
              <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">NEXT_PUBLIC_RPC_URL</code>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-gold shrink-0">03</span>
            <span>Run the deploy script:</span>
          </li>
        </ol>

        {/* Code block */}
        <div className="rounded-lg bg-navy-deep border border-border/40 p-4 font-mono text-sm">
          <p className="text-muted-foreground text-xs mb-2 uppercase tracking-widest">Terminal</p>
          <p className="text-gold">npm run contracts:deploy</p>
        </div>

        <ol className="text-sm text-foreground" start={4}>
          <li className="flex gap-3">
            <span className="font-mono text-gold shrink-0">04</span>
            <span>
              Add the deployed address to your{' '}
              <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">.env</code>{' '}
              as{' '}
              <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">VITE_LIFE_CONTRACT_ADDRESS</code>
            </span>
          </li>
        </ol>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <a
            href="https://github.com/MaxWK96/digital-legacy-hub"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center px-4 py-2.5 border border-gold/60 text-gold font-semibold rounded-lg hover:bg-gold/10 transition-colors text-sm"
          >
            View on GitHub →
          </a>
          <button
            onClick={handleDemoMode}
            className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:brightness-110 transition-all gold-glow text-sm"
          >
            Try Demo Mode →
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default DeployModal
