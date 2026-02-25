const stats = [
  { value: "$300B+", label: "Crypto lost to inaccessible wallets" },
  { value: "0", label: "Human intermediaries required" },
  { value: "100%", label: "Autonomous execution" },
];

const StatsRow = () => (
  <section className="py-16 border-y border-border bg-card">
    <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
      {stats.map((s) => (
        <div key={s.value}>
          <p className="text-4xl md:text-5xl font-serif font-bold text-gold mb-2">{s.value}</p>
          <p className="text-sm text-muted-foreground tracking-wide">{s.label}</p>
        </div>
      ))}
    </div>
  </section>
);

export default StatsRow;
