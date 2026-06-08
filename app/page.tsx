export default function Home() {
return (
<main
style={{
minHeight: "100vh",
background:
"radial-gradient(circle at top left,#3d2a00,#050505 35%), linear-gradient(135deg,#020202,#0b0b0b)",
color: "#f5f5f5",
fontFamily: "Arial, sans-serif",
padding: "24px"
}}
>
<div
style={{
border: "1px solid rgba(255,182,18,.4)",
borderRadius: "28px",
padding: "30px",
marginBottom: "20px",
boxShadow: "0 0 40px rgba(255,182,18,.2)"
}}
>
<div style={{ color: "#ffb612", letterSpacing: "4px" }}>
PUCK PERMISSION ENGINE
</div>

    <h1
      style={{
        fontSize: "72px",
        margin: "10px 0",
        color: "#ffb612",
        textShadow: "0 0 25px rgba(255,182,18,.8)"
      }}
    >
      MISSION CONTROL
    </h1>

    <p style={{ color: "#bfbfbf" }}>
      Speed. Volume. Spread. Proof.
    </p>
  </div>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(4,1fr)",
      gap: "16px",
      marginBottom: "20px"
    }}
  >
    {[
      ["Market Heat", "HOT"],
      ["Elite Setups", "3"],
      ["Scanner Mode", "LIVE"],
      ["Mission", "READY"]
    ].map((item) => (
      <div
        key={item[0]}
        style={{
          padding: "20px",
          borderRadius: "20px",
          background: "#0a0a0a",
          border: "1px solid rgba(255,182,18,.25)"
        }}
      >
        <div style={{ color: "#999" }}>{item[0]}</div>
        <div
          style={{
            color: "#ffb612",
            fontSize: "34px",
            fontWeight: 700
          }}
        >
          {item[1]}
        </div>
      </div>
    ))}
  </div>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "350px 1fr",
      gap: "20px"
    }}
  >
    <div
      style={{
        borderRadius: "24px",
        padding: "25px",
        background:
          "linear-gradient(145deg, rgba(255,182,18,.15), rgba(0,0,0,.95))",
        border: "1px solid rgba(255,182,18,.4)"
      }}
    >
      <div style={{ color: "#ffb612" }}>ELITE SETUP</div>

      <h2
        style={{
          fontSize: "64px",
          color: "#ffd700",
          margin: "10px 0"
        }}
      >
        ONCY
      </h2>

      <h3>PUCK SCORE 97</h3>

      <div>🟢 Speed</div>
      <div>🟢 Volume</div>
      <div>🟢 Spread</div>
      <div>🟢 Support</div>
      <div>🟢 Risk Defined</div>

      <div
        style={{
          marginTop: "20px",
          padding: "14px",
          borderRadius: "14px",
          background: "#ffb612",
          color: "#000",
          textAlign: "center",
          fontWeight: 900
        }}
      >
        PERMISSION: YES
      </div>
    </div>

    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3,1fr)",
        gap: "16px"
      }}
    >
      {[
        ["ONCY", "+127.4%", "97"],
        ["ABCD", "+88.2%", "84"],
        ["XYZ", "+42.7%", "61"]
      ].map((s) => (
        <div
          key={s[0]}
          style={{
            padding: "22px",
            borderRadius: "22px",
            background: "#090909",
            border: "1px solid rgba(255,182,18,.25)"
          }}
        >
          <h2 style={{ color: "#ffb612" }}>{s[0]}</h2>

          <div
            style={{
              color: "#00ff88",
              fontSize: "24px",
              fontWeight: 700
            }}
          >
            {s[1]}
          </div>

          <div style={{ marginTop: "30px" }}>
            Score
          </div>

          <div
            style={{
              color: "#ffd700",
              fontSize: "48px",
              fontWeight: 800
            }}
          >
            {s[2]}
          </div>
        </div>
      ))}
    </div>
  </div>

  <div
    style={{
      marginTop: "20px",
      borderRadius: "24px",
      padding: "24px",
      background: "#090909",
      border: "1px solid rgba(255,182,18,.25)"
    }}
  >
    <div
      style={{
        color: "#ffb612",
        marginBottom: "15px"
      }}
    >
      SCANNER INTELLIGENCE
    </div>

    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4,1fr)",
        gap: "15px"
      }}
    >
      <div>
        <div style={{ color: "#888" }}>Stocks Scanned</div>
        <div style={{ color: "#ffb612", fontSize: "36px" }}>
          5142
        </div>
      </div>

      <div>
        <div style={{ color: "#888" }}>Passed Filters</div>
        <div style={{ color: "#ffb612", fontSize: "36px" }}>
          72
        </div>
      </div>

      <div>
        <div style={{ color: "#888" }}>Elite</div>
        <div style={{ color: "#ffb612", fontSize: "36px" }}>
          4
        </div>
      </div>

      <div>
        <div style={{ color: "#888" }}>Mood</div>
        <div style={{ color: "#ffb612", fontSize: "36px" }}>
          AGGRESSIVE
        </div>
      </div>
    </div>
  </div>
</main>

);
}
