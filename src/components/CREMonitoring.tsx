const sources = [
  { icon: "🔗", title: "On-chain activity", status: "Last tx: 2 days ago", active: true },
  { icon: "📡", title: "Heartbeat contract", status: "Last ping: 6 hours ago", active: true },
  { icon: "🌐", title: "Multi-source consensus", status: "3/3 nodes agree: ACTIVE", active: true },
  { icon: "🪪", title: "World ID", status: "Heir identity verified", active: true },
];

const CREMonitoring = () => (
  <section className="py-24 bg-background">
    <div className="max-w-5xl mx-auto px-6">
      <h2 className="text-3xl md:text-4xl font-serif font-bold text-center mb-3 text-foreground">
        Powered by Chainlink CRE
      </h2>
      <p className="text-center text-muted-foreground mb-12">Real-time multi-source monitoring</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {sources.map((s) => (
          <div key={s.title} className="bg-card rounded-xl p-6 gold-border-glow flex items-start gap-4">
            <span className="text-2xl">{s.icon}</span>
            <div className="flex-1">
              <h3 className="text-foreground font-medium mb-1">{s.title}</h3>
              <p className="text-sm font-mono text-muted-foreground">{s.status}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-green-status green-pulse" />
              <span className="text-xs font-mono text-green-status">ACTIVE</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default CREMonitoring;
