import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useAnimation, useSpring, useTransform } from "framer-motion";

// ─── helpers ──────────────────────────────────────────────────────────────────
function polarToXY(cx, cy, r, angleDeg) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function wedgePath(cx, cy, r, startDeg, endDeg) {
  const s = polarToXY(cx, cy, r, startDeg);
  const e = polarToXY(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M${cx},${cy} L${s.x},${s.y} A${r},${r} 0 ${large} 1 ${e.x},${e.y} Z`;
}

function labelPos(cx, cy, r, startDeg, sweep) {
  return polarToXY(cx, cy, r, startDeg + sweep / 2);
}

// ─── Particles ────────────────────────────────────────────────────────────────
function Particles({ active, color }) {
  const count = 14;
  if (!active) return null;
  return (
    <svg className="absolute inset-0 pointer-events-none" width={380} height={380}>
      {Array.from({ length: count }).map((_, i) => {
        const angle = (360 / count) * i;
        const rad = (angle - 90) * (Math.PI / 180);
        const tx = Math.cos(rad) * 200;
        const ty = Math.sin(rad) * 200;
        const r = 3 + Math.random() * 4;
        return (
          <motion.circle
            key={i}
            cx={190} cy={190} r={r}
            fill={color}
            initial={{ cx: 190, cy: 190, opacity: 1, scale: 1 }}
            animate={{ cx: 190 + tx, cy: 190 + ty, opacity: 0, scale: 0.2 }}
            transition={{ duration: 0.9, delay: i * 0.03, ease: "easeOut" }}
          />
        );
      })}
    </svg>
  );
}

// ─── Needle ───────────────────────────────────────────────────────────────────
function AnimatedNeedle({ settling }) {
  const waggle = useSpring(0, { stiffness: 400, damping: 8 });

  useEffect(() => {
    if (settling) {
      waggle.set(18);
      setTimeout(() => waggle.set(-10), 200);
      setTimeout(() => waggle.set(6), 450);
      setTimeout(() => waggle.set(-3), 650);
      setTimeout(() => waggle.set(0), 850);
    }
  }, [settling, waggle]);

  return (
    <motion.g style={{ originX: "190px", originY: "190px", rotate: waggle }}>
      {/* Shadow */}
      <ellipse cx={192} cy={192} rx={4} ry={95} fill="rgba(0,0,0,0.10)" style={{ filter: "blur(3px)" }} />
      {/* Needle body */}
      <motion.path
        d="M190,105 L186,190 L190,196 L194,190 Z"
        fill="url(#needleGrad)"
        filter="url(#needleShadow)"
      />
      {/* Needle base south */}
      <path d="M190,275 L186,190 L190,185 L194,190 Z" fill="rgba(30,30,30,0.25)" />
      {/* Center jewel */}
      <circle cx={190} cy={190} r={10} fill="url(#jewel)" />
      <circle cx={190} cy={190} r={10} fill="none" stroke="white" strokeWidth={1.5} strokeOpacity={0.6} />
      <defs>
        <linearGradient id="needleGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#e11d48" />
          <stop offset="50%" stopColor="#fb7185" />
          <stop offset="100%" stopColor="#be123c" />
        </linearGradient>
        <radialGradient id="jewel" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#1e293b" />
        </radialGradient>
        <filter id="needleShadow" x="-20%" y="-5%" width="140%" height="110%">
          <feDropShadow dx="1" dy="2" stdDeviation="2" floodOpacity="0.3" />
        </filter>
      </defs>
    </motion.g>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CompassPro({ wedges, onSpinStart, onSpinEnd, targetIndex }) {
  const discControls = useAnimation();
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [settling, setSettling] = useState(false);
  const [landedIndex, setLandedIndex] = useState(null);
  const [burst, setBurst] = useState(false);
  const [announce, setAnnounce] = useState("");
  const containerRef = useRef(null);

  const wedgeAngle = 360 / wedges.length;
  const CX = 190, CY = 190, R = 175;

  const computeDestination = useCallback((currentAngle, targetIdx) => {
    const baseRotations = 5;
    const targetCenter = targetIdx * wedgeAngle + wedgeAngle / 2;
    const normalised = ((currentAngle % 360) + 360) % 360;
    return baseRotations * 360 + normalised + (360 - targetCenter);
  }, [wedgeAngle]);

  const spinTo = useCallback(async (idx) => {
    if (idx == null) return;
    setSpinning(true);
    setSettling(false);
    setBurst(false);
    setLandedIndex(null);
    onSpinStart?.();
    setAnnounce(`Draait naar ${wedges[idx].label}`);

    const dest = computeDestination(angle, idx);

    await discControls.start({
      rotate: dest,
      transition: { duration: 3.6, ease: [0.12, 0.8, 0.35, 1] }
    });

    setAngle(dest);
    setSpinning(false);
    setSettling(true);
    setLandedIndex(idx);
    setBurst(true);
    setAnnounce(`Gekozen: ${wedges[idx].label}`);
    setTimeout(() => { setSettling(false); setBurst(false); }, 1000);
    onSpinEnd?.(idx);
  }, [angle, computeDestination, discControls, onSpinEnd, onSpinStart, wedges]);

  useEffect(() => {
    if (targetIndex != null) spinTo(targetIndex);
  }, [targetIndex]); // eslint-disable-line

  // ── ambient pulse ring ──
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    if (!spinning) return;
    const id = setInterval(() => setPulse(p => p + 1), 600);
    return () => clearInterval(id);
  }, [spinning]);

  const activeColor = landedIndex != null ? wedges[landedIndex]?.color : "#3b82f6";

  return (
    <div className="relative select-none flex items-center justify-center" ref={containerRef}>
      <div className="sr-only" aria-live="assertive">{announce}</div>

      {/* Ambient glow ring */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{ width: 420, height: 420, top: "50%", left: "50%", x: "-50%", y: "-50%" }}
        animate={spinning
          ? { boxShadow: [`0 0 40px 10px ${activeColor}33`, `0 0 80px 30px ${activeColor}55`, `0 0 40px 10px ${activeColor}33`] }
          : landedIndex != null
            ? { boxShadow: `0 0 60px 20px ${activeColor}44` }
            : { boxShadow: "0 0 0px 0px transparent" }
        }
        transition={{ duration: 0.6, repeat: spinning ? Infinity : 0 }}
      />

      {/* Particle burst */}
      <Particles active={burst} color={activeColor} />

      {/* SVG Compass */}
      <svg width={380} height={380} viewBox="0 0 380 380" aria-hidden>
        <defs>
          {/* Outer bezel gradient */}
          <radialGradient id="bezelGrad" cx="40%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#f1f5f9" />
            <stop offset="100%" stopColor="#94a3b8" />
          </radialGradient>
          {/* Disc base */}
          <radialGradient id="discGrad" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#f0f4ff" stopOpacity="0.9" />
          </radialGradient>
          <filter id="discShadow">
            <feDropShadow dx="0" dy="4" stdDeviation="12" floodOpacity="0.18" />
          </filter>
        </defs>

        {/* Outer bezel ring */}
        <circle cx={CX} cy={CY} r={185} fill="url(#bezelGrad)" filter="url(#discShadow)" />

        {/* Tick marks on bezel */}
        {Array.from({ length: 72 }).map((_, i) => {
          const a = i * 5;
          const inner = 168, outer = i % 9 === 0 ? 183 : (i % 3 === 0 ? 178 : 173);
          const p1 = polarToXY(CX, CY, inner, a);
          const p2 = polarToXY(CX, CY, outer, a);
          return (
            <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
              stroke={i % 9 === 0 ? "#64748b" : "#94a3b8"}
              strokeWidth={i % 9 === 0 ? 2 : 1}
            />
          );
        })}

        {/* Cardinal letters on bezel */}
        {["N", "E", "Z", "W"].map((lbl, i) => {
          const pos = polarToXY(CX, CY, 160, i * 90);
          return (
            <text key={lbl} x={pos.x} y={pos.y + 5} textAnchor="middle"
              fill="#475569" fontSize={13} fontWeight="700" fontFamily="Inter,sans-serif">
              {lbl}
            </text>
          );
        })}

        {/* Spinning disc group */}
        <motion.g animate={discControls} style={{ originX: `${CX}px`, originY: `${CY}px` }}>
          {/* Disc background */}
          <circle cx={CX} cy={CY} r={R} fill="url(#discGrad)" />

          {/* Wedges */}
          {wedges.map((w, i) => {
            const startDeg = i * wedgeAngle;
            const endDeg = startDeg + wedgeAngle;
            const path = wedgePath(CX, CY, R - 2, startDeg, endDeg);
            const lp = labelPos(CX, CY, 115, startDeg, wedgeAngle);
            const isLanded = landedIndex === i;
            return (
              <g key={w.key}>
                <defs>
                  <radialGradient id={`wg-${i}`} cx="50%" cy="40%" r="70%">
                    <stop offset="0%" stopColor="white" stopOpacity="0.5" />
                    <stop offset="100%" stopColor={w.color} stopOpacity={isLanded ? 0.95 : 0.7} />
                  </radialGradient>
                </defs>
                {/* Base fill */}
                <path d={path} fill={w.color} opacity={isLanded ? 0.25 : 0.12} />
                {/* Gradient overlay */}
                <path d={path} fill={`url(#wg-${i})`} opacity={isLanded ? 1 : 0.75} />
                {/* Active wedge glow border */}
                {isLanded && (
                  <motion.path
                    d={path} fill="none"
                    stroke={w.color} strokeWidth={3}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0.6] }}
                    transition={{ duration: 0.5 }}
                    style={{ filter: `drop-shadow(0 0 8px ${w.color})` }}
                  />
                )}
                {/* Separator line */}
                {(() => {
                  const sp = polarToXY(CX, CY, R - 2, startDeg);
                  return <line x1={CX} y1={CY} x2={sp.x} y2={sp.y} stroke="white" strokeWidth={1.5} strokeOpacity={0.6} />;
                })()}
                {/* Label */}
                <text x={lp.x} y={lp.y - 12} textAnchor="middle"
                  fill={isLanded ? "#1e293b" : "#374151"}
                  fontSize={isLanded ? 15 : 13}
                  fontWeight={isLanded ? "800" : "700"}
                  fontFamily="Inter,sans-serif"
                  style={{ filter: isLanded ? `drop-shadow(0 0 4px ${w.color})` : "none" }}
                >
                  {w.label}
                </text>
                {/* Emoji icon */}
                <text x={lp.x} y={lp.y + 14} textAnchor="middle" fontSize={22}>
                  {w.icon || ""}
                </text>
              </g>
            );
          })}

          {/* Centre hub */}
          <circle cx={CX} cy={CY} r={32} fill="white" filter="url(#discShadow)" />
          <circle cx={CX} cy={CY} r={32} fill="none" stroke="#e2e8f0" strokeWidth={2} />
        </motion.g>

        {/* Fixed needle (does NOT rotate with disc) */}
        <AnimatedNeedle settling={settling} />
      </svg>
    </div>
  );
}