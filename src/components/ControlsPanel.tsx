import React from "react";
import type { OrbitalParams } from "./HyperbolicCanvas";

type Props = {
  params: OrbitalParams;
  onChange: (p: Partial<OrbitalParams>) => void;
};

export default function ControlsPanel({ params, onChange }: Props) {
  return (
    <div style={{
      width: 320,
      padding: 16,
      borderRadius: 8,
      background: "#ffffff",
      boxShadow: "0 4px 14px rgba(0,0,0,0.06)"
    }}>
      <h3 style={{ marginTop: 0 }}>Orbit Controls</h3>

      <label> Eccentricity (e): {params.e.toFixed(4)}</label>
      <input
        type="range"
        min={0.1}
        max={3}
        step={0.0001}
        value={params.e}
        onChange={(e) => onChange({ e: parseFloat(e.target.value) })}
        style={{ width: "100%" }}
      />

      <label> Semi-latus rectum p (km): {params.p.toFixed(1)}</label>
      <input
        type="range"
        min={1000}
        max={50000}
        step={1}
        value={params.p}
        onChange={(e) => onChange({ p: parseFloat(e.target.value) })}
        style={{ width: "100%" }}
      />

      <label> Argument of periapsis ω (deg): {params.omega.toFixed(2)}</label>
      <input
        type="range"
        min={-180}
        max={180}
        step={0.01}
        value={params.omega}
        onChange={(e) => onChange({ omega: parseFloat(e.target.value) })}
        style={{ width: "100%" }}
      />

      <label> ν₀ (deg): {params.nu0.toFixed(2)}</label>
      <input
        type="range"
        min={-179.9}
        max={179.9}
        step={0.01}
        value={params.nu0}
        onChange={(e) => onChange({ nu0: parseFloat(e.target.value) })}
        style={{ width: "100%" }}
      />

      <label> νf (deg): {params.nuf.toFixed(2)}</label>
      <input
        type="range"
        min={-179.9}
        max={179.9}
        step={0.01}
        value={params.nuf}
        onChange={(e) => onChange({ nuf: parseFloat(e.target.value) })}
        style={{ width: "100%" }}
      />

      <label> Focus range (km): {params.focusRange}</label>
      <input
        type="range"
        min={5000}
        max={50000}
        step={100}
        value={params.focusRange}
        onChange={(e) => onChange({ focusRange: parseFloat(e.target.value) })}
        style={{ width: "100%" }}
      />

    </div>
  );
}
