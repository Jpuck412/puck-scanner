export default function Sidebar() {
  const items = [
    "Mission Control",
    "Momentum Scanner",
    "News Terminal",
    "Watchlist",
    "Trade Planner",
    "Glossary",
    "Settings"
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <strong>PROOF OF STRUCTURE™</strong>
        <span>Momentum Workstation</span>
      </div>

      <nav>
        {items.map((item) => (
          <button key={item}>{item}</button>
        ))}
      </nav>
    </aside>
  );
}
