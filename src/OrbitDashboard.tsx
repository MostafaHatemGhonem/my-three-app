import React, { useState, useCallback } from "react";
import HyperbolicCanvas, { OrbitalParams } from "./components/HyperbolicCanvas";
import ControlsPanel from "./components/ControlsPanel";

const defaultParams: OrbitalParams = {
  e: 1.0558,
  p: 14247.47,
  omega: 31.62,
  nu0: -71.39,
  nuf: 48.61,
  samples: 500,
  focusRange: 15000,
};

export default function OrbitDashboard() {
  const [params, setParams] = useState<OrbitalParams>(defaultParams);

  const handleChange = useCallback((patch: Partial<OrbitalParams>) => {
    setParams((prev) => ({ ...prev, ...patch }));
  }, []);

  return (
    <div style={{ display: "flex", gap: 20, padding: 20, alignItems: "flex-start" }}>
      <div style={{ flex: 1 }}>
        <HyperbolicCanvas params={params} />
      </div>
      <ControlsPanel params={params} onChange={handleChange} />
    </div>
  );
}
