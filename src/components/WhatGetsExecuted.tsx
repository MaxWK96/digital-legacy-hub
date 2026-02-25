const items = [
  { icon: "💰", title: "Asset Transfer", desc: "ETH, ERC-20, NFTs sent to heirs" },
  { icon: "📜", title: "Final Message", desc: "Encrypted letter delivered on-chain" },
  { icon: "🗳️", title: "DAO Roles", desc: "Governance rights transferred" },
  { icon: "🤖", title: "Agent Shutdown", desc: "Autonomous agents gracefully stopped" },
];

const WhatGetsExecuted = () => (
  <section className="py-24 bg-navy-deep">
    <div className="max-w-5xl mx-auto px-6">
      <h2 className="text-3xl md:text-4xl font-serif font-bold text-center mb-12 text-foreground">
        What Gets Executed
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {items.map((item) => (
          <div key={item.title} className="bg-card rounded-xl p-6 gold-border-glow text-center">
            <span className="text-3xl mb-4 block">{item.icon}</span>
            <h3 className="font-serif font-semibold text-foreground mb-2">{item.title}</h3>
            <p className="text-sm text-muted-foreground">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default WhatGetsExecuted;
