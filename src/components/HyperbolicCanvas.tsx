import React, { useEffect, useRef } from "react";

export type OrbitalParams = {
  e: number;
  p: number;
  omega: number;
  nu0: number;
  nuf: number;
  samples?: number;
  focusRange?: number;
};

type Props = { params: OrbitalParams };

function deg2rad(d: number) { return (d * Math.PI) / 180; }

export default function HyperbolicCanvas({ params }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // draw function so we can call on resize or params change
    const draw = () => {
      // responsive + DPR
      const DPR = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(300, Math.floor(rect.width * DPR));
      canvas.height = Math.max(300, Math.floor(rect.height * DPR));
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      // clear
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // params
      const e = params.e;
      const p = params.p;
      const omega = deg2rad(params.omega);
      const nu_0 = deg2rad(params.nu0);
      const nu_f = deg2rad(params.nuf);
      const samples = params.samples ?? 1000; // smoother by default
      const FOCUS_RANGE = params.focusRange ?? 15000;
      const EARTH_RADIUS = 6378.1;

      // canvas dims in CSS pixels (we scaled via setTransform)
      const canvasW = canvas.width / DPR;
      const canvasH = canvas.height / DPR;
      const SCALE = Math.min(canvasW, canvasH) / (2 * FOCUS_RANGE);

      const toCanvas = (x: number, y: number): [number, number] => {
        return [canvasW / 2 + x * SCALE, canvasH / 2 - y * SCALE];
      };

      const [cx, cy] = toCanvas(0, 0);

      // reference circle
      ctx.strokeStyle = "#4caf50";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 12000 * SCALE, 0, Math.PI * 2);
      ctx.stroke();

      // Build trajectory points with branch handling, but clip enormous r values
      const ptsAll: [number, number][] = [];
      // clip radius in world units (km). This avoids adding points at "infinity"
      const rClip = Math.max(FOCUS_RANGE * 3, p * 3, 1e6); // adjust thresholds as needed

      for (let i = 0; i < samples; i++) {
        const nu = deg2rad(-179.9 + (359.8 * i) / Math.max(1, samples - 1));
        const denom = 1 + e * Math.cos(nu);
        let r: number;
        let theta: number;
        if (denom > 0) {
          r = p / denom;
          theta = nu + omega;
        } else {
          // map to opposite branch
          r = Math.abs(p / denom);
          theta = nu + omega + Math.PI;
        }
        // skip extremely large radii (outside viewport interest)
        if (!isFinite(r) || r > rClip) continue;

        const x = r * Math.cos(theta);
        const y = r * Math.sin(theta);
        ptsAll.push(toCanvas(x, y));
      }

      // Draw trajectory as subpaths; gap threshold relatively small
      if (ptsAll.length > 0) {
        ctx.strokeStyle = "#2196f3";
        ctx.lineWidth = 2.5;

        // choose a moderate gap threshold: e.g., 6% of min dimension or at least 30px
        const maxGapPx = Math.max(30, Math.min(canvasW, canvasH) * 0.06);
        let started = false;
        let prevX = 0, prevY = 0;
        ctx.beginPath();
        for (let i = 0; i < ptsAll.length; i++) {
          const [x, y] = ptsAll[i];
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
            prevX = x; prevY = y;
            continue;
          }
          const dist = Math.hypot(x - prevX, y - prevY);
          if (dist > maxGapPx) {
            // large jump => start new subpath
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x, y);
            prevX = x; prevY = y;
          } else {
            ctx.lineTo(x, y);
            prevX = x; prevY = y;
          }
        }
        ctx.stroke();
      }

      // Earth
      const [earthX, earthY] = toCanvas(0, 0);
      ctx.fillStyle = "#40e0d0";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(earthX, earthY, EARTH_RADIUS * SCALE, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#000";
      ctx.font = "bold 14px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Earth", earthX, earthY);

      // safe polar for r0 / rf
      const safePolar = (nu: number) => {
        const denom = 1 + e * Math.cos(nu);
        let r = p / denom;
        let theta = nu + omega;
        if (!(denom > 0)) {
          r = Math.abs(r);
          theta += Math.PI;
        }
        return { r, theta };
      };
      const r0s = safePolar(nu_0);
      const rfs = safePolar(nu_f);

      // skip if outside clip
      const validR0 = isFinite(r0s.r) && r0s.r <= rClip;
      const validRf = isFinite(rfs.r) && rfs.r <= rClip;

      const x0 = r0s.r * Math.cos(r0s.theta);
      const y0 = r0s.r * Math.sin(r0s.theta);
      const xf = rfs.r * Math.cos(rfs.theta);
      const yf = rfs.r * Math.sin(rfs.theta);

      const [r0X, r0Y] = toCanvas(x0, y0);
      const [rfX, rfY] = toCanvas(xf, yf);

      // markers (only if valid)
      ctx.fillStyle = "#fff";
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 1.2;
      if (validR0) { ctx.beginPath(); ctx.arc(r0X, r0Y, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      if (validRf) { ctx.beginPath(); ctx.arc(rfX, rfY, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }

      // arrows and velocities (draw only for valid points)
      const drawArrow = (toX: number, toY: number, color: string, label: string) => {
        ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(earthX, earthY); ctx.lineTo(toX, toY); ctx.stroke();
        const ang = Math.atan2(earthY - toY, toX - earthX);
        const head = 12;
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - head * Math.cos(ang - Math.PI / 6), toY - head * Math.sin(ang - Math.PI / 6));
        ctx.lineTo(toX - head * Math.cos(ang + Math.PI / 6), toY - head * Math.sin(ang + Math.PI / 6));
        ctx.closePath(); ctx.fill();
        ctx.font = "bold 13px Arial"; ctx.fillText(label, toX + 15, toY - 10);
      };
      if (validR0) drawArrow(r0X, r0Y, "#ff0000", "r₀");
      if (validRf) drawArrow(rfX, rfY, "#ff0000", "r");

      const drawVel = (fromX: number, fromY: number, angle: number, lenPx: number, label: string) => {
        const toX = fromX + lenPx * Math.cos(angle);
        const toY = fromY - lenPx * Math.sin(angle);
        ctx.strokeStyle = "#2196f3"; ctx.fillStyle = "#2196f3"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(fromX, fromY); ctx.lineTo(toX, toY); ctx.stroke();
        const head = 10;
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - head * Math.cos(angle - Math.PI / 6), toY + head * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(toX - head * Math.cos(angle + Math.PI / 6), toY + head * Math.sin(angle + Math.PI / 6));
        ctx.closePath(); ctx.fill();
        ctx.font = "bold 12px Arial"; ctx.fillText(label, toX + 10, toY + 10);
      };
      const v0_angle = r0s.theta + Math.PI / 2;
      const vf_angle = rfs.theta + Math.PI / 2;
      const velLenPx = 60;
      if (validR0) drawVel(r0X, r0Y, v0_angle, velLenPx, "v₀");
      if (validRf) drawVel(rfX, rfY, vf_angle, velLenPx, "v");

      // perigee (safe)
      const r_perigee = p / (1 + e);
      if (isFinite(r_perigee) && r_perigee > 0 && r_perigee <= rClip) {
        const xp = r_perigee * Math.cos(omega);
        const yp = r_perigee * Math.sin(omega);
        const [perX, perY] = toCanvas(xp, yp);
        ctx.strokeStyle = "#000"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(earthX, earthY); ctx.lineTo(perX, perY); ctx.stroke();
        ctx.beginPath(); ctx.arc(perX, perY, 4, 0, Math.PI * 2); ctx.fillStyle = "#000"; ctx.fill();
        ctx.font = "12px Arial"; ctx.fillStyle = "#000"; ctx.fillText("Perigee", perX + 10, perY);
      }

      // apseline dashed
      const sf = 1.2 * 15000;
      const apx = sf * Math.cos(omega);
      const apy = sf * Math.sin(omega);
      const [apxC, apyC] = toCanvas(apx, apy);
      ctx.strokeStyle = "#808080"; ctx.lineWidth = 1; ctx.setLineDash([5, 3]);
      ctx.beginPath(); ctx.moveTo(earthX, earthY); ctx.lineTo(apxC, apyC); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = "#000"; ctx.fillText("Apse line", apxC - 50, apyC - 20);

      // safeArc helper & arcs
      const safeArc = (cx0: number, cy0: number, radius: number, start: number, end: number, color = "#000", lw = 1.5) => {
        if (!(isFinite(radius) && radius > 1e-6)) return;
        ctx.strokeStyle = color; ctx.lineWidth = lw;
        ctx.beginPath(); ctx.arc(cx0, cy0, radius, start, end, false); ctx.stroke();
      };
      const omegaArcR = 3500 * SCALE;
      safeArc(earthX, earthY, Math.abs(omegaArcR), -omega, 0, "#ff9800", 1.5);
      ctx.fillStyle = "#000";
      ctx.fillText(`${Math.round(params.omega)}°`, earthX + omegaArcR * Math.cos(-omega / 2), earthY - omegaArcR * Math.sin(-omega / 2));

      const arcR_world = Math.max(Math.abs(r0s.r), Math.abs(rfs.r)) * 1.15;
      const arcR = arcR_world * SCALE;
      safeArc(earthX, earthY, arcR, -rfs.theta, -r0s.theta, "#9c27b0", 2);
      const midAng = (r0s.theta + rfs.theta) / 2;
      const [labX, labY] = toCanvas(arcR_world * 1.15 * Math.cos(midAng), arcR_world * 1.15 * Math.sin(midAng));
      ctx.fillStyle = "#000"; ctx.fillText("120°", labX, labY);

      // axes & labels
      ctx.strokeStyle = "#666"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(earthX, earthY); ctx.lineTo(earthX + (FOCUS_RANGE * 0.9) * SCALE, earthY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(earthX, earthY); ctx.lineTo(earthX, earthY - (FOCUS_RANGE * 0.9) * SCALE); ctx.stroke();
      ctx.fillText("x", earthX + (FOCUS_RANGE * 0.9) * SCALE + 10, earthY);
      ctx.fillText("y", earthX, earthY - (FOCUS_RANGE * 0.9) * SCALE - 10);

      // labels r0 / v0
      if (validR0) { ctx.fillStyle = "#ff0000"; ctx.fillText("r₀", r0X - 20, r0Y + 20); ctx.fillStyle = "#2196f3"; ctx.fillText("v₀", r0X + 15, r0Y + 25); }
    }; // end draw

    // initial draw
    draw();

    // resize -> redraw
    const onResize = () => {
      draw();
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, [params]);

  return <canvas ref={canvasRef} style={{ width: "100%", height: 600, borderRadius: 8, background: "#fff" }} />;
}
