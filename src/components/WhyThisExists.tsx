import { useState } from 'react'
import DeployModal from './DeployModal'

const WhyThisExists = () => {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <section className="py-24 bg-card border-y border-border">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-serif font-bold mb-8 text-foreground">
          Why This Exists
        </h2>
        <p className="text-lg text-muted-foreground leading-relaxed mb-10">
          $300 billion in cryptocurrency is permanently inaccessible because owners died without succession plans. Digital Executor is the infrastructure layer that makes crypto inheritance as reliable as a will — but without courts, lawyers, or trusted third parties.
        </p>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-block px-8 py-4 bg-primary text-primary-foreground font-semibold rounded-lg hover:brightness-110 transition-all duration-300 gold-glow"
        >
          Secure Your Legacy
        </button>
      </div>

      <DeployModal open={modalOpen} onOpenChange={setModalOpen} />
    </section>
  )
}

export default WhyThisExists
