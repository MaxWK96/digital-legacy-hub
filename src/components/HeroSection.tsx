import { useState } from 'react'
import HeartbeatLine from './HeartbeatLine'
import DeployModal from './DeployModal'

const HeroSection = () => {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-navy-deep">
      <HeartbeatLine />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <p className="font-mono text-sm tracking-[0.3em] uppercase text-gold mb-6 animate-float-up">
          Digital Executor
        </p>
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-serif font-bold leading-tight mb-6 animate-float-up text-foreground">
          Your crypto doesn't die with you.
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed animate-float-up-delay-1">
          Digital Executor autonomously manages your on-chain estate. Chainlink CRE continuously monitors proof-of-life signals. When consensus confirms inactivity — your designated heirs receive everything. No lawyers. No courts. No lost keys.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-float-up-delay-2">
          <button
            onClick={() => setModalOpen(true)}
            className="px-8 py-4 bg-primary text-primary-foreground font-semibold rounded-lg hover:brightness-110 transition-all duration-300 gold-glow text-center"
          >
            Create Your Executor
          </button>
          <a
            href="#how-it-works"
            className="px-8 py-4 border border-muted text-foreground font-semibold rounded-lg hover:border-gold hover:text-gold transition-all duration-300 text-center"
          >
            See How It Works
          </a>
        </div>
      </div>

      <DeployModal open={modalOpen} onOpenChange={setModalOpen} />
    </section>
  )
}

export default HeroSection
