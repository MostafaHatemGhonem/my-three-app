import React from "react";
import OrbitDashboard from "./OrbitDashboard";

function App() {
  return (
    <div style={{ fontFamily: "Arial, sans-serif", background: "#f5f7fb", minHeight: "100vh" }}>
      <header style={{ padding: 20 }}>
        <h1 style={{ margin: 0 }}>Orbit Dashboard (2D) — React + TypeScript</h1>
      </header>
      <main>
        <OrbitDashboard />
      </main>
    </div>
  );
}

export default App;
