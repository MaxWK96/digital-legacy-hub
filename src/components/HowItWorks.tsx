const steps = [
  {
    num: "01",
    title: "Deploy",
    desc: "Deploy your Life Smart Contract. Designate heirs, set asset allocations, and configure inactivity thresholds.",
  },
  {
    num: "02",
    title: "Monitor",
    desc: "Chainlink CRE continuously monitors proof-of-life signals: wallet activity, on-chain heartbeats, and multi-source consensus verification.",
  },
  {
    num: "03",
    title: "Verify",
    desc: "When inactivity threshold is crossed, World ID verifies heir identity. Multi-source consensus prevents false triggers.",
  },
  {
    num: "04",
    title: "Execute",
    desc: "Assets transfer automatically. Encrypted final message delivered. Your digital legacy fulfilled exactly as you intended.",
  },
];

const HowItWorks = () => (
  <section className="py-24 bg-background">
    <div className="max-w-5xl mx-auto px-6">
      <h2 className="text-3xl md:text-4xl font-serif font-bold text-center mb-16 text-foreground">
        How It Works
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {steps.map((s) => (
          <div key={s.num} className="p-6 rounded-xl bg-card gold-border-glow">
            <span className="font-mono text-gold text-sm">{s.num}</span>
            <h3 className="text-xl font-serif font-semibold mt-2 mb-3 text-foreground">{s.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorks;
