import { IDKitWidget, VerificationLevel, type ISuccessResult } from '@worldcoin/idkit'
import { useToast } from '@/hooks/use-toast'

interface WorldIDVerifyProps {
  heirAddress: string
  onVerified?: (nullifierHash: string) => void
}

const WORLD_APP_ID = (import.meta.env.VITE_WORLD_APP_ID ?? 'app_staging_test') as `app_${string}`
const ACTION_ID    = 'digital-executor-heir-verify'

const WorldIDVerify = ({ heirAddress, onVerified }: WorldIDVerifyProps) => {
  const { toast } = useToast()

  const handleSuccess = async (result: ISuccessResult) => {
    const nullifierHash = result.nullifier_hash

    toast({
      title: 'World ID Verified',
      description: `Heir ${heirAddress.slice(0, 8)}... verified. Registering on-chain...`,
    })

    try {
      // Call backend to register heir with nullifier hash
      const res = await fetch('/api/heirs/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          heirAddress,
          nullifierHash,
          proof: result.proof,
          merkle_root: result.merkle_root,
          verification_level: result.verification_level,
        }),
      })

      if (res.ok) {
        toast({
          title: 'Heir Registered',
          description: `Nullifier hash stored on-chain. ${heirAddress.slice(0, 10)}... is World ID verified.`,
        })
        onVerified?.(nullifierHash)
      } else {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error((err as { error: string }).error)
      }
    } catch (err: unknown) {
      toast({
        title: 'Registration Failed',
        description: err instanceof Error ? err.message : 'Could not store nullifier on-chain',
        variant: 'destructive',
      })
    }
  }

  const handleError = (error: Error) => {
    console.error('[WorldIDVerify] error:', error)
    toast({
      title: 'World ID Error',
      description: error?.message ?? 'Verification failed. Try again.',
      variant: 'destructive',
    })
  }

  return (
    <IDKitWidget
      app_id={WORLD_APP_ID}
      action={ACTION_ID}
      signal={heirAddress}
      verification_level={VerificationLevel.Device}
      onSuccess={handleSuccess}
      onError={handleError}
    >
      {({ open }) => (
        <button
          onClick={open}
          className="
            flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-mono
            bg-indigo-900/40 border border-indigo-500/40 text-indigo-300
            hover:bg-indigo-900/60 hover:border-indigo-400/60
            transition-all duration-200
          "
        >
          <span className="text-[10px]">🌐</span>
          Verify with World ID
        </button>
      )}
    </IDKitWidget>
  )
}

export default WorldIDVerify
