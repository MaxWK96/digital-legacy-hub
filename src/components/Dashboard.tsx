const Dashboard = () => (
  <section className="py-24 bg-navy-deep">
    <div className="max-w-6xl mx-auto px-6">
      <h2 className="text-3xl md:text-4xl font-serif font-bold text-center mb-4 text-foreground">
        Proof of Life Dashboard
      </h2>
      <p className="text-center text-muted-foreground mb-12">Live estate monitoring interface</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Estate */}
        <div className="bg-card rounded-xl p-6 gold-border-glow">
          <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">Your Estate</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-foreground">ETH</span>
              <span className="font-mono text-gold">3.2000</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-foreground">LINK</span>
              <span className="font-mono text-gold">1,250.00</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-foreground">USDC</span>
              <span className="font-mono text-gold">15,000.00</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-foreground">DAO Votes</span>
              <span className="font-mono text-gold">3 Active</span>
            </div>
          </div>
        </div>

        {/* Center: Heartbeat */}
        <div className="bg-card rounded-xl p-6 gold-border-glow flex flex-col items-center justify-center text-center">
          <div className="w-4 h-4 rounded-full bg-green-status green-pulse mb-4" />
          <h3 className="text-2xl font-serif font-bold text-green-status mb-1">HEARTBEAT ACTIVE</h3>
          <p className="text-xs text-muted-foreground font-mono">Last activity: 2 hours ago</p>
          <p className="text-xs text-muted-foreground font-mono mt-1">Block #19,482,331</p>
        </div>

        {/* Right: Heirs */}
        <div className="bg-card rounded-xl p-6 gold-border-glow">
          <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">Designated Heirs</h3>
          <div className="space-y-4">
            {[
              { name: "Alice.eth", share: "50%", addr: "0x1a2b...9f3c" },
              { name: "Bob.eth", share: "30%", addr: "0x4d5e...2a1b" },
              { name: "Carol.eth", share: "20%", addr: "0x7g8h...5d4e" },
            ].map((h) => (
              <div key={h.name} className="flex items-center justify-between">
                <div>
                  <p className="text-foreground text-sm font-medium">{h.name}</p>
                  <p className="text-xs font-mono text-muted-foreground">{h.addr}</p>
                </div>
                <div className="text-right">
                  <span className="text-gold text-sm font-mono">{h.share}</span>
                  <p className="text-[10px] text-green-status">✓ World ID</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom: Threshold bar */}
      <div className="mt-6 bg-card rounded-xl p-6 gold-border-glow">
        <div className="flex justify-between items-center mb-2">
          <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Inactivity Threshold</span>
          <span className="font-mono text-sm text-foreground">0 / 180 days</span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-green-status rounded-full" style={{ width: "0.5%" }} />
        </div>
        <p className="text-xs text-muted-foreground mt-2 font-mono">Status: All systems nominal</p>
      </div>
    </div>
  </section>
);

export default Dashboard;
