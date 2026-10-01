export default function Loading() {
  return (
    <div aria-label="Carregando" role="status" className="stack">
      <div className="skeleton" style={{ height: 90 }} />
      <div className="stats-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton" style={{ height: 140 }} />
        ))}
      </div>
      <div className="skeleton" style={{ height: 320 }} />
    </div>
  );
}
