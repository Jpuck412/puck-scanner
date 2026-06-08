export default function Home() {
  const stocks = [
    { ticker: "ABCD", gain: 127, score: 95 },
    { ticker: "XYZ", gain: 88, score: 82 },
    { ticker: "TEST", gain: 42, score: 71 }
  ];

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#05070a",
        color: "#e5fff8",
        padding: "20px",
        fontFamily: "Arial"
      }}
    >
      <h1>🚀 PUCK Scanner</h1>

      <h2>Top Gainers</h2>

      <table
        style={{
          borderCollapse: "collapse",
          width: "100%",
          maxWidth: "600px"
        }}
      >
        <thead>
          <tr>
            <th>Ticker</th>
            <th>% Gain</th>
            <th>PUCK Score</th>
          </tr>
        </thead>

        <tbody>
          {stocks.map((stock) => (
            <tr key={stock.ticker}>
              <td>{stock.ticker}</td>
              <td>{stock.gain}%</td>
              <td>{stock.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
